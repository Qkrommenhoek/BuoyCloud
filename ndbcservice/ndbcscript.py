# Env: TABLE_NAME (required), STATIONS (comma-separated; falls back to DEFAULT_STATION_ID, default 46239).
# Event {"station_id": "..."} ingests just that station.
# Keys: pk = "OBS#<STATION>", sk = ISO time. Lambda: 180s timeout, 256 MB. Enable DynamoDB TTL on the "ttl" attribute.
import logging
import os
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from http.client import HTTPException
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import boto3

BASE_URL = "https://www.ndbc.noaa.gov/data/realtime2/"
MAX_ATTEMPTS = 3
HTTP_TIMEOUT = 8          # worst case ~3*8 + 1 + 2 = 27s
USER_AGENT = "BuoyBuddy/1.0 (lambda; ndbc ingest)"
TTL_GRACE_DAYS = 7       # rows expire this long after the observation time
MAX_SKIP_RATIO = 0.2     # fail the run if more rows than this are unparseable
WRITE_WINDOW_HOURS = 6   # the file holds ~45 days; older rows were written by earlier runs
FETCH_WORKERS = 8

STATION_RE = re.compile(r"[A-Za-z0-9]+")
MISSING = "MM"

logger = logging.getLogger()
logger.setLevel(logging.INFO)
table = boto3.resource("dynamodb").Table(os.environ["TABLE_NAME"])


class ObservationNotFound(Exception):
    pass


def http_get(url):
    """Body text, or None if not published (403/404). Retries transient errors."""
    for attempt in range(MAX_ATTEMPTS):
        try:
            req = Request(url, headers={"User-Agent": USER_AGENT})
            with urlopen(req, timeout=HTTP_TIMEOUT) as resp:
                return resp.read().decode("utf-8")
        except (URLError, OSError, HTTPException) as e:
            if isinstance(e, HTTPError):
                if e.code in (403, 404):
                    return None
                if e.code < 500 and e.code != 429:
                    raise
            if attempt == MAX_ATTEMPTS - 1:
                raise
            time.sleep(2 ** attempt)


def fetch_realtime(station_id):
    if not STATION_RE.fullmatch(station_id):
        raise ValueError(f"Invalid station_id: {station_id!r}")
    url = f"{BASE_URL}{station_id.upper()}.txt"
    body = http_get(url)
    if not body or not body.strip():
        raise ObservationNotFound(f"No NDBC realtime data for {station_id} at {url}")
    return body, url


def parse_value(raw):
    if raw == MISSING:
        return None
    return Decimal(raw)  # InvalidOperation is handled by the caller


def parse_realtime(text, station_id, source_url):
    lines = [ln for ln in text.splitlines() if ln.strip()]
    header = next((ln for ln in lines if ln.startswith("#") and "YY" in ln), None)
    if not header:
        raise ValueError("Unexpected NDBC format: missing column header")

    columns = header.lstrip("#").split()
    if len(columns) < 6:
        raise ValueError("Unexpected NDBC format: too few columns in header")

    rows, skipped = [], 0
    for line in lines:
        if line.startswith("#"):
            continue
        parts = line.split()
        if len(parts) < 5:
            skipped += 1
            continue
        try:
            ts = datetime(int(parts[0]), int(parts[1]), int(parts[2]),
                          int(parts[3]), int(parts[4]), tzinfo=timezone.utc)
            obs = {}
            for col, raw in zip(columns[5:], parts[5:]):
                val = parse_value(raw)
                if val is not None:
                    obs[col.lower()] = val
        except (ValueError, IndexError, InvalidOperation):
            skipped += 1
            continue
        rows.append({"ts": ts, "obs": obs})

    total = len(rows) + skipped
    if not rows or skipped / total > MAX_SKIP_RATIO:
        raise ValueError(f"{skipped}/{total} rows unparseable for {station_id} "
                         f"({source_url}); NDBC format may have changed")
    if skipped:
        logger.warning("Skipped %d/%d unparseable rows for %s", skipped, total, station_id)

    return {"station_id": station_id, "source_url": source_url, "rows": rows}


def to_items(obs):
    now = int(time.time())
    cutoff = now - WRITE_WINDOW_HOURS * 3600
    for r in obs["rows"]:
        if r["ts"].timestamp() < cutoff:  # already stored by an earlier run
            continue
        ttl = int(r["ts"].timestamp()) + TTL_GRACE_DAYS * 86400
        item = {
            "pk": f"OBS#{obs['station_id']}",
            "sk": r["ts"].strftime("%Y-%m-%dT%H:%MZ"),
            "source_url": obs["source_url"],
            "ttl": ttl,
        }
        item.update(r["obs"])
        yield item


def fetch_and_parse(station_id):
    text, url = fetch_realtime(station_id)
    return parse_realtime(text, station_id, url)


def station_list(event):
    one = (event or {}).get("station_id")
    raw = one or os.environ.get("STATIONS") or os.environ.get("DEFAULT_STATION_ID", "46239")
    return [s.strip().upper() for s in raw.split(",") if s.strip()]


def handler(event, context):
    stations = station_list(event)
    results, failed = {}, []

    # boto3 resources aren't thread-safe: fetch in parallel, write on this thread.
    with ThreadPoolExecutor(max_workers=FETCH_WORKERS) as pool:
        futures = {pool.submit(fetch_and_parse, sid): sid for sid in stations}
        for fut in as_completed(futures):
            sid = futures[fut]
            try:
                obs = fut.result()
                written = 0
                with table.batch_writer(overwrite_by_pkeys=["pk", "sk"]) as batch:
                    for item in to_items(obs):
                        batch.put_item(Item=item)
                        written += 1
                logger.info("Wrote %d rows for %s from %s", written, sid, obs["source_url"])
                results[sid] = written
            except Exception:
                logger.exception("Failed station %s", sid)
                failed.append(sid)

    if failed:
        raise RuntimeError(f"{len(failed)}/{len(stations)} stations failed: {sorted(failed)}")
    return {"rows": results}

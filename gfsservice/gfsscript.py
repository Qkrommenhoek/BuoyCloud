# Env: TABLE_NAME (required), STATIONS (comma-separated; falls back to DEFAULT_STATION_ID, default 46239).
# Event {"station_id": "..."} ingests just that station.
# Keys: pk = "FC#<STATION>", sk = ISO time. Lambda: 600s timeout, 256 MB. Enable DynamoDB TTL on the "ttl" attribute.
import logging
import os
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from http.client import HTTPException
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import boto3

BASE_URL = "https://nomads.ncep.noaa.gov/pub/data/nccf/com/gfs/prod/"
CYCLE_HOURS = 6
MAX_CYCLES_BACK = 4
MAX_ATTEMPTS = 2          # per URL, transient errors only
HTTP_TIMEOUT = 8          # worst case 4 cycles * (2*8 + 1) = 68s, under the 90s timeout
USER_AGENT = "BuoyBuddy/1.0 (lambda; gfs ingest)"
MAX_HORIZON_DAYS = 17     # GFS-wave runs ~16 days
TTL_GRACE_DAYS = 7        # rows expire this long after the time they describe
MAX_SKIP_RATIO = 0.2      # fail the run if more rows than this are unparseable
FETCH_WORKERS = 8         # worst case ceil(28/8) * 68s ≈ 272s, under the 600s timeout

STATION_RE = re.compile(r"[A-Za-z0-9]+")
LOCATION_RE = re.compile(r"Location\s*:\s*(\S+)\s*\(([\d.]+)([NS])\s+([\d.]+)([EW])\)")
CYCLE_RE = re.compile(r"Cycle\s*:\s*(\d{8})\s+(\d{1,2})\s+UTC")  # hour may be unpadded
ROW_RE = re.compile(r"^\s*(\d{2})(\d{2})\s+(\d+)\s*(.*)$")  # DDHH HS [SS PP DDD]...

logger = logging.getLogger()
logger.setLevel(logging.INFO)
table = boto3.resource("dynamodb").Table(os.environ["TABLE_NAME"])


class ForecastNotFound(Exception):
    pass


def candidate_cycles(now=None):
    now = now or datetime.now(timezone.utc)
    cursor = now.replace(hour=(now.hour // CYCLE_HOURS) * CYCLE_HOURS,
                         minute=0, second=0, microsecond=0)
    for _ in range(MAX_CYCLES_BACK):
        yield cursor
        cursor -= timedelta(hours=CYCLE_HOURS)


def http_get(url):
    """Body text, or None if not published (403/404). Retries transient errors."""
    for attempt in range(MAX_ATTEMPTS):
        try:
            req = Request(url, headers={"User-Agent": USER_AGENT})
            with urlopen(req, timeout=HTTP_TIMEOUT) as resp:
                return resp.read().decode("utf-8")
        except (URLError, OSError, HTTPException) as e:  # HTTPError is a URLError
            if isinstance(e, HTTPError):
                if e.code in (403, 404):
                    return None
                if e.code < 500 and e.code != 429:
                    raise
            if attempt == MAX_ATTEMPTS - 1:
                raise
            time.sleep(2 ** attempt)


def fetch_cbull(station_id):
    if not STATION_RE.fullmatch(station_id):
        raise ValueError(f"Invalid station_id: {station_id!r}")
    for cycle in candidate_cycles():
        d, c = cycle.strftime("%Y%m%d"), f"{cycle.hour:02d}"
        url = f"{BASE_URL}gfs.{d}/{c}/wave/station/bulls.t{c}z/gfswave.{station_id}.cbull"
        body = http_get(url)
        if body and body.strip():  # missing or empty -> cycle not ready, try older
            return body, url
        logger.info("No usable bulletin at %s", url)
    raise ForecastNotFound(
        f"No GFS wave bulletin for {station_id} in the last {MAX_CYCLES_BACK} cycles")


def resolve_ts(cycle, day, hour):
    """Place (day, hour) relative to the cycle time; None if outside the forecast window.

    Resolved per row, so one corrupt row can't shift the timestamps after it.
    """
    for months_ahead in (0, 1):
        y, m = divmod(cycle.year * 12 + cycle.month - 1 + months_ahead, 12)
        try:
            ts = datetime(y, m + 1, day, hour, tzinfo=timezone.utc)
        except ValueError:
            continue
        if cycle <= ts <= cycle + timedelta(days=MAX_HORIZON_DAYS):
            return ts


def parse_cbull(text, source_url):
    loc, cyc = LOCATION_RE.search(text), CYCLE_RE.search(text)
    if not loc or not cyc:
        raise ValueError("Unexpected cbull format: missing Location or Cycle line")

    station_id, lat, ns, lon, ew = loc.groups()
    lat = Decimal(lat) * (-1 if ns == "S" else 1)
    lon = Decimal(lon) * (-1 if ew == "W" else 1)
    cycle_dt = datetime.strptime(cyc.group(1), "%Y%m%d").replace(
        hour=int(cyc.group(2)), tzinfo=timezone.utc)

    rows, skipped = [], 0
    for line in text.splitlines():
        m = ROW_RE.match(line)
        if not m:
            continue
        try:
            ts = resolve_ts(cycle_dt, int(m[1]), int(m[2]))
            if ts is None:
                raise ValueError("outside forecast window")

            nums = [int(n) for n in m[4].split()]
            if len(nums) % 3:
                raise ValueError("partial swell group")
            partitions = [{"hs_ft": nums[i], "tp_s": nums[i + 1], "dir_deg": nums[i + 2]}
                          for i in range(0, len(nums), 3)]
        except ValueError:
            skipped += 1
            continue
        rows.append({"ts": ts, "hst_ft": int(m[3]), "partitions": partitions})

    total = len(rows) + skipped
    if not rows or skipped / total > MAX_SKIP_RATIO:
        raise ValueError(f"{skipped}/{total} rows unparseable for {station_id} "
                         f"({source_url}); NOAA format may have changed")
    if skipped:
        logger.warning("Skipped %d/%d unparseable rows for %s", skipped, total, station_id)

    return {"station_id": station_id, "lat": lat, "lon": lon,
            "cycle": cycle_dt, "source_url": source_url, "rows": rows}


def to_items(fc):
    cycle_iso = fc["cycle"].strftime("%Y-%m-%dT%H:%MZ")
    for r in fc["rows"]:
        yield {
            "pk": f"FC#{fc['station_id'].upper()}",
            "sk": r["ts"].strftime("%Y-%m-%dT%H:%MZ"),
            "cycle": cycle_iso,
            "lat": fc["lat"],
            "lon": fc["lon"],
            "source_url": fc["source_url"],
            "hst_ft": r["hst_ft"],
            "partitions": r["partitions"],
            # per-row TTL: relative to the forecast time, not "now"
            "ttl": int(r["ts"].timestamp()) + TTL_GRACE_DAYS * 86400,
        }


def fetch_and_parse(station_id):
    text, url = fetch_cbull(station_id)
    return parse_cbull(text, url)


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
                fc = fut.result()
                with table.batch_writer(overwrite_by_pkeys=["pk", "sk"]) as batch:
                    for item in to_items(fc):
                        batch.put_item(Item=item)
                logger.info("Wrote %d rows for %s from %s", len(fc["rows"]), sid, fc["source_url"])
                results[sid] = {"cycle": fc["cycle"].isoformat(), "rows": len(fc["rows"])}
            except Exception:
                logger.exception("Failed station %s", sid)
                failed.append(sid)

    if failed:
        raise RuntimeError(f"{len(failed)}/{len(stations)} stations failed: {sorted(failed)}")
    return {"stations": results}
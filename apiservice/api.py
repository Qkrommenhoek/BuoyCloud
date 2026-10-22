import json
import os
import re
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key

table = boto3.resource("dynamodb").Table(os.environ["TABLE_NAME"])

ROUTE = re.compile(r"^/(?:api/)?stations/([A-Za-z0-9]+)/(observations|forecast)/?$")
PREFIX = {"observations": "OBS#", "forecast": "FC#"}


def _num(o):
    if isinstance(o, Decimal):
        return int(o) if o == o.to_integral_value() else float(o)
    raise TypeError


def _resp(status, body, max_age=0):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Cache-Control": f"public, max-age={max_age}",
        },
        "body": json.dumps(body, default=_num),
    }


def handler(event, context):
    m = ROUTE.match(event.get("rawPath", ""))
    if not m:
        return _resp(404, {"error": "not found"})
    station_id, kind = m.group(1).upper(), m.group(2)

    now = datetime.now(timezone.utc)
    params = event.get("queryStringParameters") or {}
    if kind == "observations":
        since = params.get("since") or (now - timedelta(days=2)).strftime("%Y-%m-%dT%H:%MZ")
    else:
        since = (now - timedelta(hours=3)).strftime("%Y-%m-%dT%H:%MZ")

    items, kwargs = [], {
        "KeyConditionExpression": Key("pk").eq(PREFIX[kind] + station_id) & Key("sk").gte(since)
    }
    while True:
        page = table.query(**kwargs)
        items += page["Items"]
        if "LastEvaluatedKey" not in page:
            break
        kwargs["ExclusiveStartKey"] = page["LastEvaluatedKey"]

    for it in items:
        it.pop("pk", None)
        it.pop("ttl", None)

    return _resp(200, {
        "station_id": station_id,
        "items": items,
        "lastUpdated": (items[0].get("cycle") if kind == "forecast" else items[-1]["sk"]) if items else None,
    }, max_age=60)
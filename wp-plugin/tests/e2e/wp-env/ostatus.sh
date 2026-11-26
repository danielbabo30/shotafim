#!/bin/bash
# usage: ostatus.sh <order_id> <mark_completed|mark_processing|mark_cancelled|mark_on-hold|trash>
cd "$(dirname "$0")"; W=http://127.0.0.1:9400
curl -s -b wj "$W/wp-admin/admin.php?page=wc-orders" -o ol.html
N=$(grep -o 'id="_wpnonce" name="_wpnonce" value="[^"]*"' ol.html | head -1 | sed 's/.*value="//;s/"//')
curl -s -b wj -X POST "$W/wp-admin/admin.php?page=wc-orders" --data-urlencode "_wpnonce=$N" -d "action=$2&id%5B%5D=$1" -o /dev/null -w "bulk $2 #$1 -> %{http_code} %{time_total}s\n"

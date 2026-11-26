#!/bin/bash
# usage: checkout.sh <jar> <email> <gateway cod|cheque> [coupon] [productId]
cd "$(dirname "$0")"; W=http://127.0.0.1:9400; J=$1; EMAIL=$2; GW=${3:-cod}; COUPON=$4; PID=${5:-}
H=$(curl -s -b $J -c $J -D - -o /dev/null $W/wp-json/wc/store/v1/cart)
NONCE=$(echo "$H" | grep -i '^nonce:' | awk '{print $2}' | tr -d '\r'); TOK=$(echo "$H" | grep -i '^cart-token:' | awk '{print $2}' | tr -d '\r')
[ -z "$PID" ] && PID=$(curl -s "$W/wp-json/wc/store/v1/products?search=E2E+Test+Mug" | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['id'])")
curl -s -b $J -c $J -X POST $W/wp-json/wc/store/v1/cart/add-item -H "Nonce: $NONCE" -H "Cart-Token: $TOK" -H 'Content-Type: application/json' -d "{\"id\":$PID,\"quantity\":2}" -o /dev/null -w "add %{http_code}\n"
[ -n "$COUPON" ] && curl -s -b $J -c $J -X POST $W/wp-json/wc/store/v1/cart/apply-coupon -H "Nonce: $NONCE" -H "Cart-Token: $TOK" -H 'Content-Type: application/json' -d "{\"code\":\"$COUPON\"}" -o /dev/null -w "coupon %{http_code}\n"
ADDR="{\"first_name\":\"E2E\",\"last_name\":\"Test\",\"address_1\":\"1 Test St\",\"city\":\"Tel Aviv\",\"postcode\":\"6100000\",\"country\":\"IL\",\"email\":\"$EMAIL\",\"phone\":\"0500000000\"}"
S=$(date +%s.%N)
curl -s -b $J -c $J -X POST $W/wp-json/wc/store/v1/checkout -H "Nonce: $NONCE" -H "Cart-Token: $TOK" -H 'Content-Type: application/json' -d "{\"billing_address\":$ADDR,\"shipping_address\":$ADDR,\"payment_method\":\"$GW\",\"payment_data\":[]}" -o co.json -w "checkout %{http_code} %{time_total}s\n"
python3 -c "import json;d=json.load(open('co.json'));print({k:d.get(k) for k in ('order_id','status','payment_result','code','message')})" | cut -c1-400

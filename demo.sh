#!/usr/bin/env bash
set -euo pipefail

BASE="http://localhost:8080"
SEP="────────────────────────────────────────"

echo "$SEP"
echo " STEP 1 — Register user"
echo "$SEP"
REGISTER=$(curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"demo_user","password":"demo1234"}')
echo "$REGISTER" | python3 -m json.tool 2>/dev/null || echo "$REGISTER"

TOKEN=$(echo "$REGISTER" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
USER_ID="demo_user"

echo ""
echo "$SEP"
echo " STEP 2 — Create order (2x PROD-001 \$50, 1x PROD-002 \$120)"
echo "$SEP"
ORDER=$(curl -s -X POST "$BASE/orders/orders" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USER_ID\",\"items\":[
    {\"productId\":\"PROD-001\",\"quantity\":2,\"unitPrice\":50},
    {\"productId\":\"PROD-002\",\"quantity\":1,\"unitPrice\":120}
  ]}")
echo "$ORDER" | python3 -m json.tool 2>/dev/null || echo "$ORDER"

ORDER_ID=$(echo "$ORDER" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

echo ""
echo "$SEP"
echo " STEP 3 — Pay order #$ORDER_ID  (pending → paid)"
echo "$SEP"
curl -s -X PATCH "$BASE/orders/orders/$ORDER_ID/status" \
  -H "Content-Type: application/json" \
  -d '{"status":"paid"}' | python3 -m json.tool 2>/dev/null

echo ""
echo "$SEP"
echo " STEP 4 — Send email notification about order #$ORDER_ID"
echo "$SEP"
curl -s -X POST "$BASE/notifications/notifications" \
  -H "Content-Type: application/json" \
  -d "{
    \"recipient\": \"demo@example.com\",
    \"channel\": \"email\",
    \"subject\": \"Order #$ORDER_ID confirmed\",
    \"template\": \"Hi {{name}}, your order #{{orderId}} is paid and will be shipped soon!\",
    \"vars\": {\"name\": \"Demo User\", \"orderId\": $ORDER_ID}
  }" | python3 -m json.tool 2>/dev/null

echo ""
echo "$SEP"
echo " DATABASE STATE"
echo "$SEP"
echo ">>> users"
docker exec app-postgres psql -U postgres -d app \
  -c "SELECT id, username, created_at FROM users;"

echo ">>> orders"
docker exec app-postgres psql -U postgres -d app \
  -c "SELECT id, user_id, total, status, created_at FROM orders ORDER BY id;"

echo ">>> notifications"
docker exec app-postgres psql -U postgres -d app \
  -c "SELECT id, recipient, channel, subject, status, attempts, sent_at FROM notifications ORDER BY id;"

echo ""
echo "$SEP"
echo " DEMO COMPLETE"
echo "$SEP"

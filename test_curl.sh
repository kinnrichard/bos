#!/bin/bash

echo "Testing Task Status Update with curl"
echo "===================================="

# Get CSRF token and session cookie from the login page
echo "Getting CSRF token..."
CSRF_TOKEN=$(curl -s -c cookies.txt http://localhost:3000/users/sign_in | grep 'csrf-token' | sed -n 's/.*content="\([^"]*\)".*/\1/p')
echo "CSRF Token: ${CSRF_TOKEN:0:20}..."

# Login
echo -e "\nLogging in..."
curl -s -b cookies.txt -c cookies.txt \
  -X POST http://localhost:3000/users/sign_in \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d "user[email]=test@example.com&user[password]=testpassword&user[remember_me]=0&commit=Log+in" \
  -L > /dev/null

# Test task status update
echo -e "\nUpdating task status..."
echo "URL: http://localhost:3000/clients/5/jobs/21/tasks/86"
echo "Headers:"
echo "  Accept: text/vnd.turbo-stream.html"
echo "  Content-Type: application/json"
echo -e "\nResponse:"
echo "--------"

curl -s -b cookies.txt \
  -X PATCH http://localhost:3000/clients/5/jobs/21/tasks/86 \
  -H "Accept: text/vnd.turbo-stream.html" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d '{"task": {"status": "in_progress"}}' \
  -D - \
  | head -30

echo -e "\n\nTo see full response, run:"
echo "curl -s -b cookies.txt -X PATCH http://localhost:3000/clients/5/jobs/21/tasks/86 -H 'Accept: text/vnd.turbo-stream.html' -H 'Content-Type: application/json' -H 'X-CSRF-Token: $CSRF_TOKEN' -d '{\"task\": {\"status\": \"in_progress\"}}'"
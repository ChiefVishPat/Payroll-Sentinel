#!/bin/bash

# Simple API Test Script for Warp Sentinel
# Make sure the server is running: npm run dev

echo "🚀 Testing Warp Sentinel API..."
echo ""

# Test 1: Basic Health Check
echo "1. Testing basic health check..."
curl -s http://localhost:3001/health | jq '.'
echo ""

# Test 2: Database Health Check  
echo "2. Testing database health check..."
curl -s http://localhost:3001/health/db | jq '.'
echo ""

# Test 3: Create a company
echo "3. Creating a test company..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/companies \
  -H "Content-Type: application/json" \
  -H "x-api-secret: demo_secret_123" \
  -d '{"name": "Test Company from Script"}')

echo $RESPONSE | jq '.'

# Extract company ID for further tests
COMPANY_ID=$(echo $RESPONSE | jq -r '.id')
echo "Created company with ID: $COMPANY_ID"
echo ""

# Test 4: Get all companies
echo "4. Getting all companies..."
curl -s -H "x-api-secret: demo_secret_123" \
  http://localhost:3001/api/companies | jq '.'
echo ""

# Test 5: Get specific company (if we got an ID)
if [ "$COMPANY_ID" != "null" ] && [ "$COMPANY_ID" != "" ]; then
  echo "5. Getting specific company by ID..."
  curl -s -H "x-api-secret: demo_secret_123" \
    http://localhost:3001/api/companies/$COMPANY_ID | jq '.'
  echo ""
  
  # Test 6: Update company
  echo "6. Updating company name..."
  curl -s -X PUT http://localhost:3001/api/companies/$COMPANY_ID \
    -H "Content-Type: application/json" \
    -H "x-api-secret: demo_secret_123" \
    -d '{"name": "Updated Test Company"}' | jq '.'
  echo ""
  
  # Test 7: Delete company (optional - uncomment to test)
  # echo "7. Deleting test company..."
  # curl -s -X DELETE http://localhost:3001/api/companies/$COMPANY_ID \
  #   -H "x-api-secret: demo_secret_123"
  # echo "Company deleted"
  # echo ""
fi

echo "✅ API testing completed!"
echo ""
echo "📖 You can also visit http://localhost:3001/docs for interactive API documentation"

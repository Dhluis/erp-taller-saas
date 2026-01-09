#!/usr/bin/env node
// scripts/test-rate-limiting.js
// Script para probar el rate limiting en desarrollo

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function makeRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  
  return {
    status: response.status,
    headers: {
      limit: response.headers.get('X-RateLimit-Limit'),
      remaining: response.headers.get('X-RateLimit-Remaining'),
      reset: response.headers.get('X-RateLimit-Reset'),
      retryAfter: response.headers.get('Retry-After')
    },
    body: await response.json().catch(() => null)
  };
}

async function testRateLimiting(endpoint, limit, method = 'GET', body = null) {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(`Testing: ${method} ${endpoint}`, colors.cyan);
  log(`Expected limit: ${limit} requests/minute`, colors.cyan);
  log('='.repeat(60), colors.cyan);

  let blockedAt = null;
  const results = [];

  for (let i = 1; i <= limit + 5; i++) {
    const result = await makeRequest(endpoint, method, body);
    results.push(result);

    const emoji = result.status === 200 ? '✅' : result.status === 429 ? '🚫' : '❌';
    const color = result.status === 200 ? colors.green : result.status === 429 ? colors.red : colors.yellow;

    log(
      `${emoji} Request ${i.toString().padStart(2, '0')}: ` +
      `Status ${result.status} | ` +
      `Remaining: ${result.headers.remaining || 'N/A'}/${result.headers.limit || 'N/A'}`,
      color
    );

    if (result.status === 429 && !blockedAt) {
      blockedAt = i;
      log(`\n⚠️  Rate limit kicked in at request #${i}`, colors.yellow);
      
      if (result.headers.retryAfter) {
        log(`   Retry after: ${result.headers.retryAfter} seconds`, colors.yellow);
      }
      if (result.headers.reset) {
        const resetDate = new Date(result.headers.reset);
        log(`   Resets at: ${resetDate.toLocaleTimeString()}`, colors.yellow);
      }
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  log('\n' + '─'.repeat(60), colors.blue);
  log('Summary:', colors.blue);
  log(`  Total requests: ${results.length}`, colors.blue);
  log(`  Successful: ${results.filter(r => r.status === 200).length}`, colors.green);
  log(`  Rate limited: ${results.filter(r => r.status === 429).length}`, colors.red);
  log(`  Blocked at request: ${blockedAt || 'Never (issue!)'}`, blockedAt ? colors.yellow : colors.red);
  log('─'.repeat(60), colors.blue);

  return blockedAt === limit + 1;
}

async function testWebhookEndpoint() {
  return testRateLimiting('/api/webhooks/test', 100, 'POST', {
    event: 'message',
    payload: { test: true }
  });
}

async function testAuthEndpoint() {
  return testRateLimiting('/api/auth/test-login', 5, 'POST', {
    email: 'test@example.com',
    password: 'test123'
  });
}

async function testApiReadEndpoint() {
  return testRateLimiting('/api/test/read', 60, 'GET');
}

async function testApiWriteEndpoint() {
  return testRateLimiting('/api/test/write', 30, 'POST', {
    data: 'test'
  });
}

async function main() {
  log('\n🧪 Eagles ERP - Rate Limiting Test Suite\n', colors.cyan);
  log(`Testing against: ${BASE_URL}\n`, colors.cyan);

  const tests = [
    { name: 'Webhook Endpoint (100 req/min)', fn: testWebhookEndpoint },
    { name: 'Auth Endpoint (5 req/min)', fn: testAuthEndpoint },
    { name: 'API Read Endpoint (60 req/min)', fn: testApiReadEndpoint },
    { name: 'API Write Endpoint (30 req/min)', fn: testApiWriteEndpoint }
  ];

  const results = [];

  for (const test of tests) {
    try {
      log(`\n📋 Running: ${test.name}...`, colors.blue);
      const passed = await test.fn();
      results.push({ name: test.name, passed });
    } catch (error) {
      log(`\n❌ Test failed: ${error.message}`, colors.red);
      results.push({ name: test.name, passed: false, error: error.message });
    }
  }

  // Final summary
  log('\n\n' + '='.repeat(60), colors.cyan);
  log('FINAL RESULTS', colors.cyan);
  log('='.repeat(60), colors.cyan);

  results.forEach(result => {
    const emoji = result.passed ? '✅' : '❌';
    const color = result.passed ? colors.green : colors.red;
    log(`${emoji} ${result.name}`, color);
    if (result.error) {
      log(`   Error: ${result.error}`, colors.yellow);
    }
  });

  const allPassed = results.every(r => r.passed);
  log('\n' + '='.repeat(60), colors.cyan);
  log(
    allPassed 
      ? '🎉 All tests passed!' 
      : '⚠️  Some tests failed. Check configuration.',
    allPassed ? colors.green : colors.red
  );
  log('='.repeat(60), colors.cyan);

  process.exit(allPassed ? 0 : 1);
}

main().catch(error => {
  log(`\n💥 Fatal error: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});


// Simple CORS test script
const testOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

async function testCORS(origin) {
  try {
    console.log(`\n🧪 Testing CORS for origin: ${origin}`);
    
    const response = await fetch('http://127.0.0.1:3001/health', {
      method: 'GET',
      headers: {
        'Origin': origin,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`✅ CORS Headers:`);
    console.log(`   Access-Control-Allow-Origin: ${response.headers.get('access-control-allow-origin')}`);
    console.log(`   Access-Control-Allow-Credentials: ${response.headers.get('access-control-allow-credentials')}`);
    
    const data = await response.json();
    console.log(`✅ Response: ${JSON.stringify(data)}`);
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

async function testPreflightCORS(origin) {
  try {
    console.log(`\n🧪 Testing CORS preflight for origin: ${origin}`);
    
    const response = await fetch('http://127.0.0.1:3001/api/specs', {
      method: 'OPTIONS',
      headers: {
        'Origin': origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    console.log(`✅ Preflight Status: ${response.status}`);
    console.log(`✅ Preflight CORS Headers:`);
    console.log(`   Access-Control-Allow-Origin: ${response.headers.get('access-control-allow-origin')}`);
    console.log(`   Access-Control-Allow-Methods: ${response.headers.get('access-control-allow-methods')}`);
    console.log(`   Access-Control-Allow-Headers: ${response.headers.get('access-control-allow-headers')}`);
    
  } catch (error) {
    console.log(`❌ Preflight Error: ${error.message}`);
  }
}

async function runTests() {
  console.log('🚀 Starting CORS tests...\n');
  
  for (const origin of testOrigins) {
    await testCORS(origin);
    await testPreflightCORS(origin);
  }
  
  console.log('\n✨ CORS tests completed!');
}

runTests().catch(console.error); 
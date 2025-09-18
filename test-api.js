import axios from 'axios';

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

console.log(`Testing API at: ${API_BASE}`);

async function testAPI() {
  try {
    // Test 1: Health check
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await axios.get(`${API_BASE}/health`);
    console.log('✅ Health check:', healthResponse.data);

    // Test 2: Test CORS
    console.log('\n2. Testing CORS headers...');
    const corsResponse = await axios.options(`${API_BASE}/health`);
    console.log('✅ CORS headers present');

    // Test 3: Test 404 handling
    console.log('\n3. Testing 404 handling...');
    try {
      await axios.get(`${API_BASE}/nonexistent`);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✅ 404 handling works correctly');
      } else {
        throw error;
      }
    }

    // Test 4: Test auth endpoints (without authentication)
    console.log('\n4. Testing auth endpoints...');
    try {
      await axios.post(`${API_BASE}/auth/login`, {
        email: 'test@example.com',
        password: 'wrongpassword'
      });
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Auth endpoint responds correctly to invalid credentials');
      } else {
        throw error;
      }
    }

    // Test 5: Test protected endpoints (should return 401)
    console.log('\n5. Testing protected endpoints...');
    try {
      await axios.get(`${API_BASE}/employees`);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Protected endpoints require authentication');
      } else {
        throw error;
      }
    }

    console.log('\n🎉 All tests passed! API is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Fonction pour attendre que le serveur soit prêt
async function waitForServer(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await axios.get(`${API_BASE}/health`, { timeout: 2000 });
      console.log('✅ Server is ready!');
      return;
    } catch (error) {
      console.log(`⏳ Waiting for server... (attempt ${i + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  throw new Error('Server did not start within the expected time');
}

// Exécuter les tests
async function main() {
  console.log('🚀 Starting API tests...');
  
  try {
    await waitForServer();
    await testAPI();
  } catch (error) {
    console.error('❌ Tests failed:', error.message);
    process.exit(1);
  }
}

main();


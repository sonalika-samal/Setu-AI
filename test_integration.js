const http = require('http');

const BACKEND_URL = 'http://localhost:5000/api';

/**
 * Utility to make HTTP requests
 */
function makeRequest(url, method, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('==================================================');
  console.log('STARTING SAHAYAK AI PHASE 1 API INTEGRATION TESTS');
  console.log('==================================================');
  console.log('Ensure you have run the backend server first via:');
  console.log('   npm run dev:backend');
  console.log('--------------------------------------------------\n');

  try {
    // Test 1: Verify Meta Webhook verification GET challenge
    console.log('Test 1: Testing Meta Webhook Verification (GET /api/webhooks/whatsapp)...');
    const challenge = 'test_hub_challenge_value_12345';
    const verifyToken = 'sahayak_verify_token';
    const getUrl = `${BACKEND_URL}/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=${challenge}`;
    
    const getRes = await makeRequest(getUrl, 'GET');
    console.log(`Response Status: ${getRes.statusCode}`);
    console.log(`Response Body: ${getRes.body}`);
    
    if (getRes.statusCode === 200 && getRes.body === challenge) {
      console.log('✓ PASS: Webhook challenge verification successful!');
    } else {
      console.log('✗ FAIL: Webhook challenge verification failed.');
    }
    console.log('--------------------------------------------------\n');

    // Test 2: Ingest a simulated incoming Meta WhatsApp message payload POST
    console.log('Test 2: Ingest Inbound WhatsApp message payload (POST /api/webhooks/whatsapp)...');
    const postUrl = `${BACKEND_URL}/webhooks/whatsapp`;
    const mockPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "1296189799169172",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "15550212345",
                  phone_number_id: "1220196504503672"
                },
                contacts: [
                  {
                    profile: {
                      name: "Test Ingest User"
                    },
                    wa_id: "19999999999"
                  }
                ],
                messages: [
                  {
                    from: "19999999999",
                    id: "wamid.HBgLMTk5OTk5OTk5OTkVAgASGBQzQjE2NTQ4MkE0NkY0Njg4RDk4NUQ3AA==",
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    text: {
                      body: "Hello Sahayak! Let's test Phase 1 webhooks."
                    },
                    type: "text"
                  }
                ]
              },
              field: "messages"
            }
          ]
        }
      ]
    };

    const postRes = await makeRequest(postUrl, 'POST', {}, mockPayload);
    console.log(`Response Status: ${postRes.statusCode}`);
    console.log(`Response Body: ${postRes.body}`);

    if (postRes.statusCode === 200) {
      console.log('✓ PASS: Webhook payload ingestion returned 200 OK immediately!');
    } else {
      console.log('✗ FAIL: Webhook payload ingestion returned non-200 status.');
    }
    console.log('--------------------------------------------------\n');

    // Test 3: Log in as default owner
    console.log('Test 3: Testing Owner Login (POST /api/auth/login)...');
    const loginUrl = `${BACKEND_URL}/auth/login`;
    const loginPayload = {
      username: 'owner',
      password: 'OwnerSecure2026#SetuAI_!$'
    };

    const loginRes = await makeRequest(loginUrl, 'POST', {}, loginPayload);
    console.log(`Response Status: ${loginRes.statusCode}`);
    const loginData = JSON.parse(loginRes.body);
    
    if (loginRes.statusCode === 200 && loginData.token) {
      console.log('✓ PASS: Owner authentication successful! Token obtained.');
      
      // Test 4: Retrieve database status using Bearer token
      console.log('\nTest 4: Retrieve Database Status (GET /api/credentials/db-status)...');
      const dbStatusUrl = `${BACKEND_URL}/credentials/db-status`;
      const dbRes = await makeRequest(dbStatusUrl, 'GET', {
        'Authorization': `Bearer ${loginData.token}`
      });
      console.log(`Response Status: ${dbRes.statusCode}`);
      console.log(`Response Body: ${dbRes.body}`);
      
      if (dbRes.statusCode === 200) {
        console.log('✓ PASS: Connected database status retrieved successfully!');
      } else {
        console.log('✗ FAIL: Failed to query database status.');
      }
    } else {
      console.log('✗ FAIL: Admin authentication failed.');
    }
    console.log('--------------------------------------------------\n');

  } catch (error) {
    console.error('Error conducting tests:', error.message);
  }
}

runTests();

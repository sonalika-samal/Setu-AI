const http = require('http');

const BACKEND_URL = 'http://localhost:5000/api';
const ABHISHEK_PHONE = '918544121551';

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

function simulateWebhook(from, text) {
  const messageId = `wamid.test_sim_${Date.now()}`;
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "1726889611647688",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "919337661780",
                phone_number_id: "1220196504503672"
              },
              contacts: [
                {
                  profile: {
                    name: "Abhi...😇"
                  },
                  wa_id: from
                }
              ],
              messages: [
                {
                  id: messageId,
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  from: from,
                  type: "text",
                  text: {
                    body: text
                  }
                }
              ]
            }
          }
        ]
      }
    ]
  };
}

async function run() {
  try {
    const body = simulateWebhook(ABHISHEK_PHONE, "Okay");
    console.log('Sending simulated "Okay" reply webhook to local backend...');
    const res = await makeRequest(`${BACKEND_URL}/webhooks/whatsapp`, 'POST', {}, body);
    console.log(`Response Status: ${res.statusCode}`);
    console.log(`Response Body: ${res.body}`);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();

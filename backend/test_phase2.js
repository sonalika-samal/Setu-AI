const mongoose = require('mongoose');
const http = require('http');

const MONGO_URI = 'mongodb+srv://sonalikactc29_db_user:by7BWqHiWnDDVDPX@cluster0.dqu8svm.mongodb.net/?appName=Cluster0';
const DB_NAME = 'n8ndb';
const BACKEND_URL = 'http://localhost:5000/api';

const OWNER_PHONE = '+919999999999';

// Define mini mongoose schema helper
const UserSchema = new mongoose.Schema({
  username: String,
  name: String,
  phone: String,
  role: String,
  status: String,
}, { strict: false });

const User = mongoose.model('User', UserSchema, 'users');

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

async function seedTestData() {
  console.log('1. Connecting to MongoDB to seed test users...');
  await mongoose.connect(MONGO_URI, { dbName: DB_NAME });

  // Ensure test Owner exists
  await User.findOneAndUpdate(
    { username: OWNER_PHONE },
    {
      username: OWNER_PHONE,
      name: 'Operations Owner',
      phone: OWNER_PHONE,
      role: 'Owner',
      status: 'Active'
    },
    { upsert: true, new: true }
  );
  console.log(`✓ Owner seeded: ${OWNER_PHONE}`);

  // Ensure worker Ramesh exists
  await User.findOneAndUpdate(
    { name: 'Ramesh' },
    {
      username: 'ramesh_worker',
      name: 'Ramesh',
      phone: '+919876543210',
      role: 'Worker',
      status: 'Active'
    },
    { upsert: true, new: true }
  );
  console.log('✓ Worker seeded: Ramesh (+919876543210)');

  // Ensure worker Suresh exists
  await User.findOneAndUpdate(
    { name: 'Suresh' },
    {
      username: 'suresh_worker',
      name: 'Suresh',
      phone: '+919876543211',
      role: 'Worker',
      status: 'Active'
    },
    { upsert: true, new: true }
  );
  console.log('✓ Worker seeded: Suresh (+919876543211)');

  await mongoose.disconnect();
}

async function verifyExecution() {
  console.log('\n3. Verification: Connecting to database to check task states...');
  await mongoose.connect(MONGO_URI, { dbName: DB_NAME });

  const Task = mongoose.model('Task', new mongoose.Schema({}, { strict: false }), 'tasks');
  const Timeline = mongoose.model('TaskTimeline', new mongoose.Schema({}, { strict: false }), 'tasktimelines');
  const WebhookLog = mongoose.model('WebhookLog', new mongoose.Schema({}, { strict: false }), 'webhooklogs');
  const MessageLog = mongoose.model('MessageLog', new mongoose.Schema({}, { strict: false }), 'messagelogs');

  // A. Check Webhook Log processing state
  const latestWebhook = await WebhookLog.findOne({ sender_phone: OWNER_PHONE }).sort({ createdAt: -1 });
  console.log(`- Webhook processing status: ${latestWebhook?.processing_status}`);
  if (latestWebhook?.processing_status === 'completed') {
    console.log('✓ PASS: Webhook pipeline processed to completed status!');
  } else {
    console.log('✗ FAIL: Webhook processing status is not completed.');
  }

  // B. Check Tasks count
  const newTasks = await Task.find({ from_number: OWNER_PHONE }).sort({ createdAt: -1 }).limit(5);
  console.log(`- Extracted tasks count: ${newTasks.length}`);
  newTasks.forEach(task => {
    console.log(`  * Task: "${task.task_msg}" | Worker: ${task.worker_name} | Location: ${task.location || 'N/A'} | Status: ${task.task_status}`);
  });

  if (newTasks.length >= 2) {
    console.log('✓ PASS: Multiple tasks created successfully in MongoDB!');
  } else {
    console.log('✗ FAIL: Extracted tasks missing.');
  }

  // C. Check Timelines
  const timelines = await Timeline.find({}).sort({ createdAt: -1 }).limit(4);
  console.log(`- Timeline logs found: ${timelines.length}`);
  timelines.forEach(t => {
    console.log(`  * Action: "${t.action}" | Performed By: ${t.performed_by}`);
  });

  // D. Check outgoing message log
  const outgoingMsgs = await MessageLog.find({ direction: 'outgoing' }).sort({ createdAt: -1 }).limit(3);
  console.log(`- Outgoing dispatch message logs: ${outgoingMsgs.length}`);
  outgoingMsgs.forEach(m => {
    console.log(`  * Receiver: ${m.receiver} | Status: ${m.status} | Content Summary: "${m.message.substring(0, 50).replace(/\n/g, ' ')}..."`);
  });

  await mongoose.disconnect();
}

async function run() {
  try {
    await seedTestData();

    console.log('\n2. Dispatching mock Meta webhook POST request containing multi-task message...');
    const messageId = `wamid.test_phase2_${Date.now()}`;
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "0",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "16505551111",
                  phone_number_id: "1220196504503672"
                },
                contacts: [
                  {
                    profile: {
                      name: "Operations Owner"
                    },
                    wa_id: OWNER_PHONE.replace('+', '')
                  }
                ],
                messages: [
                  {
                    id: messageId,
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    from: OWNER_PHONE,
                    type: "text",
                    text: {
                      body: "Ramesh install CCTV at Manyavar Jewellery today at 8 PM and Suresh repair AC tomorrow"
                    }
                  }
                ]
              }
            }
          ]
        }
      ]
    };

    const res = await makeRequest(`${BACKEND_URL}/webhooks/whatsapp`, 'POST', {}, payload);
    console.log(`- HTTP Response Status: ${res.statusCode}`);
    console.log(`- HTTP Response Body: ${res.body}`);

    if (res.statusCode === 200) {
      console.log('✓ Webhook responded 200 OK immediately.');
      console.log('Waiting 10 seconds for AI background loop processing...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      await verifyExecution();
    } else {
      console.error('✗ Webhook failed to respond 200 OK.');
    }

  } catch (error) {
    console.error('Test execution failed:', error.message);
  }
}

run();

const mongoose = require('mongoose');
const http = require('http');

const MONGO_URI = 'mongodb+srv://sonalikactc29_db_user:by7BWqHiWnDDVDPX@cluster0.dqu8svm.mongodb.net/?appName=Cluster0';
const DB_NAME = 'n8ndb';
const BACKEND_URL = 'http://localhost:5000/api';

const OWNER_PHONE = '+919999999999';
const WORKER_PHONE = '+919876543210';

// Schema helpers
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
  console.log('1. Connecting to MongoDB to seed test data for Phase 3...');
  await mongoose.connect(MONGO_URI, { dbName: DB_NAME });

  // 1. Seed test Owner
  const owner = await User.findOneAndUpdate(
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

  // 2. Seed worker Ramesh
  const worker = await User.findOneAndUpdate(
    { name: 'Ramesh' },
    {
      username: WORKER_PHONE,
      name: 'Ramesh',
      phone: WORKER_PHONE,
      role: 'Worker',
      status: 'Active'
    },
    { upsert: true, new: true }
  );
  console.log(`✓ Worker seeded: Ramesh (${WORKER_PHONE})`);

  // Clear previous tasks for testing
  const Task = mongoose.models.Task || mongoose.model('Task', new mongoose.Schema({}, { strict: false }), 'tasks');
  const Timeline = mongoose.models.TaskTimeline || mongoose.model('TaskTimeline', new mongoose.Schema({}, { strict: false }), 'tasktimelines');
  const ActivityLog = mongoose.models.ActivityLog || mongoose.model('ActivityLog', new mongoose.Schema({}, { strict: false }), 'activitylogs');
  const MessageLog = mongoose.models.MessageLog || mongoose.model('MessageLog', new mongoose.Schema({}, { strict: false }), 'messagelogs');
  
  await Task.deleteMany({ worker_phone: WORKER_PHONE });
  await Timeline.deleteMany({});
  await ActivityLog.deleteMany({});
  await MessageLog.deleteMany({});
  console.log('✓ Old tasks, timelines, activity and message logs cleared.');

  // 3. Seed two active tasks for worker Ramesh
  const taskA = await Task.create({
    worker_name: 'Ramesh',
    worker_phone: WORKER_PHONE,
    worker_id: worker._id.toString(),
    task_msg: 'Install CCTV at Manyavar Jewellery',
    location: 'Sector 5 Mall',
    task_status: 'Open',
    timestamp: new Date(Date.now() - 3600 * 1000), // 1 hour ago
    from_number: OWNER_PHONE,
    owner_name: 'Operations Owner',
    owner_phone: OWNER_PHONE,
    priority: 'High'
  });

  const taskB = await Task.create({
    worker_name: 'Ramesh',
    worker_phone: WORKER_PHONE,
    worker_id: worker._id.toString(),
    task_msg: 'Repair the cooling system at office server room',
    location: 'Main HQ First Floor',
    task_status: 'Open',
    timestamp: new Date(),
    from_number: OWNER_PHONE,
    owner_name: 'Operations Owner',
    owner_phone: OWNER_PHONE,
    priority: 'Medium'
  });

  console.log(`✓ Seeded Task A ID: ${taskA._id}`);
  console.log(`✓ Seeded Task B ID: ${taskB._id}`);

  // Seed some message log history
  await MessageLog.create({
    message_id: 'seed_msg_1',
    sender: 'system',
    receiver: WORKER_PHONE,
    direction: 'outgoing',
    type: 'text',
    message: 'Hello Ramesh, you have been assigned task: Install CCTV at Manyavar Jewellery',
    status: 'read',
    timestamp: new Date(Date.now() - 3600 * 1000),
    task_id: taskA._id
  });

  await MessageLog.create({
    message_id: 'seed_msg_2',
    sender: 'system',
    receiver: WORKER_PHONE,
    direction: 'outgoing',
    type: 'text',
    message: 'Hello Ramesh, you have been assigned task: Repair the cooling system at office server room',
    status: 'read',
    timestamp: new Date(Date.now() - 1800 * 1000),
    task_id: taskB._id
  });

  await mongoose.disconnect();
}

function simulateWebhook(from, text) {
  const messageId = `wamid.test_phase3_${Date.now()}_${Math.floor(Math.random()*1000)}`;
  return {
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
                    name: "Test Contact"
                  },
                  wa_id: from.replace('+', '')
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

async function verifyState() {
  console.log('\n--- VERIFYING MONGO DATABASE STATES ---');
  await mongoose.connect(MONGO_URI, { dbName: DB_NAME });

  const Task = mongoose.models.Task || mongoose.model('Task', new mongoose.Schema({}, { strict: false }), 'tasks');
  const Timeline = mongoose.models.TaskTimeline || mongoose.model('TaskTimeline', new mongoose.Schema({}, { strict: false }), 'tasktimelines');
  const ActivityLog = mongoose.models.ActivityLog || mongoose.model('ActivityLog', new mongoose.Schema({}, { strict: false }), 'activitylogs');
  const MessageLog = mongoose.models.MessageLog || mongoose.model('MessageLog', new mongoose.Schema({}, { strict: false }), 'messagelogs');

  // Verify Tasks status
  const tasks = await Task.find({ worker_phone: WORKER_PHONE });
  console.log(`Active Worker Tasks in DB:`);
  tasks.forEach(t => {
    console.log(`  * Task: "${t.task_msg}" | Status: ${t.task_status} | Last Reply: "${t.last_worker_reply}"`);
  });

  // Verify Activity Logs
  const activities = await ActivityLog.find({}).sort({ timestamp: -1 });
  console.log(`Latest System Activity Logs in DB:`);
  activities.slice(0, 8).forEach(a => {
    console.log(`  * Action: "${a.action}" | Desc: "${a.description}"`);
  });

  // Verify Timelines
  const timelines = await Timeline.find({}).sort({ timestamp: -1 });
  console.log(`Latest Task Timeline Milestones in DB:`);
  timelines.slice(0, 8).forEach(tl => {
    console.log(`  * Action: "${tl.action}" | Desc: "${tl.description}" | Performed: ${tl.performed_by}`);
  });

  // Verify Outgoing Messages
  const outgoing = await MessageLog.find({ direction: 'outgoing' }).sort({ timestamp: -1 });
  console.log(`Latest Outgoing Messages sent by System:`);
  outgoing.slice(0, 5).forEach(m => {
    console.log(`  * To: ${m.receiver} | Content: "${m.message}"`);
  });

  await mongoose.disconnect();
}

async function main() {
  try {
    await seedTestData();

    // Test 1: Worker sends Ambiguous message (multiple active tasks)
    console.log('\n--- TEST 1: WORKER SIMULATES AMBIGUOUS REPLY ("Finished the work") ---');
    let payload = simulateWebhook(WORKER_PHONE, "Finished the work");
    let res = await makeRequest(`${BACKEND_URL}/webhooks/whatsapp`, 'POST', {}, payload);
    console.log(`- Webhook response: ${res.statusCode} | ${res.body}`);
    console.log('Waiting 35s for AI background loop...');
    await new Promise(resolve => setTimeout(resolve, 35000));

    // Test 2: Worker sends Unambiguous message (specifies task details)
    console.log('\n--- TEST 2: WORKER SIMULATES CLEAR REPLY ("Done with Manyavar CCTV") ---');
    payload = simulateWebhook(WORKER_PHONE, "Done with Manyavar CCTV");
    res = await makeRequest(`${BACKEND_URL}/webhooks/whatsapp`, 'POST', {}, payload);
    console.log(`- Webhook response: ${res.statusCode} | ${res.body}`);
    console.log('Waiting 35s for AI background loop...');
    await new Promise(resolve => setTimeout(resolve, 35000));

    // Test 3: Owner queries the assistant ("Show completed tasks")
    console.log('\n--- TEST 3: OWNER QUERIES THE SYSTEM ("Show completed tasks") ---');
    payload = simulateWebhook(OWNER_PHONE, "Show completed tasks");
    res = await makeRequest(`${BACKEND_URL}/webhooks/whatsapp`, 'POST', {}, payload);
    console.log(`- Webhook response: ${res.statusCode} | ${res.body}`);
    console.log('Waiting 35s for AI background loop...');
    await new Promise(resolve => setTimeout(resolve, 35000));

    await verifyState();

  } catch (err) {
    console.error('Fatal testing exception:', err.message);
  }
}

main();

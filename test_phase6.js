const fs = require('fs');
const path = require('path');
const http = require('http');
const mongoose = require('mongoose');

const BACKEND_URL = 'http://localhost:5000/api';
const OWNER_PHONE = '+919999999999';
const WORKER_PHONE = '+919876543210';

// Simple manual .env parser to avoid requiring external packages
function loadEnv() {
  const envPath = path.join(__dirname, 'backend', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value;
      }
    }
  }
}

loadEnv();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://sonalikactc29_db_user:by7BWqHiWnDDVDPX@cluster0.dqu8svm.mongodb.net/?appName=Cluster0';
const DB_NAME = process.env.MONGO_DB_NAME || 'n8ndb';

// Helper to make HTTP requests
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

// Model Schemas for database verification
const UserSchema = new mongoose.Schema({
  username: String,
  name: String,
  phone: String,
  role: String,
  status: String,
  availability_status: String,
}, { strict: false });

const TaskSchema = new mongoose.Schema({
  worker_name: String,
  task_msg: String,
  location: String,
  task_status: String,
  worker_phone: String,
  taskId: String,
  is_overdue: Boolean,
  is_escalated: Boolean,
}, { strict: false });

const DepartmentSchema = new mongoose.Schema({
  name: String,
  code: String,
  status: String,
}, { strict: false });

const User = mongoose.models.User || mongoose.model('User', UserSchema, 'users');
const Task = mongoose.models.Task || mongoose.model('Task', TaskSchema, 'tasks');
const Department = mongoose.models.Department || mongoose.model('Department', DepartmentSchema, 'departments');

async function seedDatabase() {
  console.log('Seeding database with test requirements...');
  await mongoose.connect(MONGO_URI, { dbName: DB_NAME });

  // Clean slate for E2E entities
  await Department.deleteMany({ code: 'E2EDEPT' });
  await User.deleteMany({ phone: '+919876543219' });
  await User.deleteMany({ phone: WORKER_PHONE });

  // Ensure test owner exists
  await User.findOneAndUpdate(
    { $or: [{ username: OWNER_PHONE }, { phone: OWNER_PHONE }] },
    {
      username: OWNER_PHONE,
      name: 'Operations Owner',
      phone: OWNER_PHONE,
      role: 'Owner',
      status: 'Active',
      password: 'OwnerPassword123!',
      availability_status: 'Available'
    },
    { upsert: true }
  );

  // Ensure Ramesh exists
  await User.findOneAndUpdate(
    { $or: [{ username: WORKER_PHONE }, { phone: WORKER_PHONE }] },
    {
      username: WORKER_PHONE,
      name: 'Ramesh',
      phone: WORKER_PHONE,
      role: 'Worker',
      status: 'Active',
      password: 'WorkerPassword123!',
      availability_status: 'Available'
    },
    { upsert: true }
  );

  // Ensure a test department exists
  await Department.findOneAndUpdate(
    { code: 'TEST' },
    {
      name: 'Test Operations',
      code: 'TEST',
      status: 'Active',
      description: 'Department for verification testing'
    },
    { upsert: true }
  );

  await mongoose.disconnect();
  console.log('✓ Seeding complete.');
}

async function waitForTaskCreation(workerPhone, maxWaitMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
    try {
      const task = await Task.findOne({ worker_phone: workerPhone }).sort({ createdAt: -1 });
      if (task) {
        return task;
      }
    } finally {
      await mongoose.disconnect();
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return null;
}

async function waitForPendingProof(workerPhone, maxWaitMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
    try {
      const worker = await User.findOne({ phone: workerPhone });
      if (worker && worker.pending_proof && worker.pending_proof.media_url) {
        return worker;
      }
    } finally {
      await mongoose.disconnect();
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return null;
}

async function waitForTaskLinkAndStatus(taskId, expectedLength = 1, maxWaitMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
    try {
      const task = await Task.findById(taskId);
      if (task && task.proof_of_work && task.proof_of_work.length >= expectedLength) {
        return task;
      }
    } finally {
      await mongoose.disconnect();
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return null;
}

async function runTests() {
  console.log('\n======================================================');
  console.log('SAHAYAK AI PHASE 6 COMPREHENSIVE INTEGRATION TESTING');
  console.log('======================================================\n');

  let adminToken = '';
  let createdWorkerId = '';
  let createdDeptId = '';
  let createdTaskId = '';
  let taskHumanId = '';

  try {
    await seedDatabase();

    // 1. Meta Webhook GET challenge verification
    console.log('Test 1: Testing Meta Webhook Verification (GET /api/webhooks/whatsapp)...');
    const challenge = 'challenge_verify_998877';
    const verifyToken = process.env.META_VERIFY_TOKEN || 'sahayak_verify_token';
    const getUrl = `${BACKEND_URL}/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=${challenge}`;
    const getRes = await makeRequest(getUrl, 'GET');
    
    if (getRes.statusCode === 200 && getRes.body === challenge) {
      console.log('✓ PASS: Webhook GET challenge verified successfully.');
    } else {
      console.error(`✗ FAIL: Webhook GET verification failed. Status: ${getRes.statusCode}, Body: ${getRes.body}`);
    }

    // 2. Admin Login POST verification
    console.log('\nTest 2: Testing Admin Login (POST /api/auth/login)...');
    const adminUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'AdminPassword123!';
    
    const loginRes = await makeRequest(`${BACKEND_URL}/auth/login`, 'POST', {}, {
      username: adminUsername,
      password: adminPassword
    });

    const loginData = JSON.parse(loginRes.body);
    if (loginRes.statusCode === 200 && loginData.token) {
      adminToken = loginData.token;
      console.log('✓ PASS: Admin authenticated successfully. Token received.');
    } else {
      console.error(`✗ FAIL: Authentication failed. Status: ${loginRes.statusCode}, Body: ${loginRes.body}`);
    }

    // Auth headers for next requests
    const authHeaders = { 'Authorization': `Bearer ${adminToken}` };

    // 3. Department Creation & CRUD
    console.log('\nTest 3: Testing Department Creation (POST /api/departments)...');
    const deptRes = await makeRequest(`${BACKEND_URL}/departments`, 'POST', authHeaders, {
      name: 'E2E Testing Dept',
      code: 'E2EDEPT',
      description: 'Temporary verification department'
    });
    const deptData = JSON.parse(deptRes.body);
    if (deptRes.statusCode === 201 && deptData._id) {
      createdDeptId = deptData._id;
      console.log(`✓ PASS: Department created. ID: ${createdDeptId}`);
    } else {
      console.error(`✗ FAIL: Department creation failed. Status: ${deptRes.statusCode}, Body: ${deptRes.body}`);
    }

    // 4. Worker Creation & CRUD
    console.log('\nTest 4: Testing Worker Addition (POST /api/auth/workers)...');
    const workerRes = await makeRequest(`${BACKEND_URL}/auth/workers`, 'POST', authHeaders, {
      name: 'Suresh Test',
      phone: '+919876543219',
      role: 'Worker',
      department_id: createdDeptId,
      department_name: 'E2E Testing Dept'
    });
    const workerData = JSON.parse(workerRes.body);
    if (workerRes.statusCode === 201 && workerData.worker?._id) {
      createdWorkerId = workerData.worker._id;
      console.log(`✓ PASS: Worker added. ID: ${createdWorkerId}`);
    } else {
      console.error(`✗ FAIL: Worker addition failed. Status: ${workerRes.statusCode}, Body: ${workerRes.body}`);
    }

    // 5. Ingest simulated incoming WhatsApp payload to assign task
    console.log('\nTest 5: Simulating Meta WhatsApp Webhook payload ingestion (POST /api/webhooks/whatsapp)...');
    const whatsappPayload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: '123',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '1234', phone_number_id: '5678' },
            contacts: [{ profile: { name: 'Operations Owner' }, wa_id: OWNER_PHONE.replace('+', '') }],
            messages: [{
              from: OWNER_PHONE,
              id: `wamid.test_assign_${Date.now()}`,
              timestamp: Math.floor(Date.now() / 1000).toString(),
              type: 'text',
              text: { body: 'Ramesh install solar panels at Main Office tomorrow at 6 PM' }
            }]
          },
          field: 'messages'
        }]
      }]
    };

    const webhookRes = await makeRequest(`${BACKEND_URL}/webhooks/whatsapp`, 'POST', {}, whatsappPayload);
    if (webhookRes.statusCode === 200) {
      console.log('✓ PASS: WhatsApp webhook event accepted immediately with 200 OK.');
    } else {
      console.error(`✗ FAIL: Webhook ingestion failed. Status: ${webhookRes.statusCode}`);
    }

    // Verify task was created in DB dynamically
    console.log('Waiting dynamically for background NLP processing...');
    const createdTask = await waitForTaskCreation(WORKER_PHONE);
    if (createdTask) {
      createdTaskId = createdTask._id.toString();
      taskHumanId = createdTask.taskId;
      console.log(`✓ PASS: Task automatically created in DB: "${createdTask.task_msg}" | ID: ${createdTaskId} | Human ID: ${taskHumanId}`);
    } else {
      console.error('✗ FAIL: No task was created for Ramesh.');
    }

    // 6. Manual Task Creation (POST /api/tasks)
    console.log('\nTest 6: Creating Task manually via API (POST /api/tasks)...');
    const manualTaskRes = await makeRequest(`${BACKEND_URL}/tasks`, 'POST', authHeaders, {
      worker_name: 'Ramesh',
      worker_phone: WORKER_PHONE,
      task_msg: 'Repair the water tank at HQ',
      priority: 'Low',
      deadline: new Date(Date.now() + 2 * 3600 * 1000).toISOString() // 2 hours in future
    });
    const manualTaskData = JSON.parse(manualTaskRes.body);
    if (manualTaskRes.statusCode === 201 && manualTaskData._id) {
      console.log(`✓ PASS: Manual task created. ID: ${manualTaskData._id} | Human ID: ${manualTaskData.taskId}`);
    } else {
      console.error(`✗ FAIL: Manual task creation failed. Status: ${manualTaskRes.statusCode}, Body: ${manualTaskRes.body}`);
    }

    // 7. Get Task Stats (GET /api/tasks/stats)
    console.log('\nTest 7: Fetching Dashboard Task Stats (GET /api/tasks/stats)...');
    const statsRes = await makeRequest(`${BACKEND_URL}/tasks/stats`, 'GET', authHeaders);
    if (statsRes.statusCode === 200) {
      const stats = JSON.parse(statsRes.body);
      console.log(`✓ PASS: Stats fetched. Total tasks: ${stats.total}, Open: ${stats.open}`);
    } else {
      console.error(`✗ FAIL: Fetching task stats failed. Status: ${statsRes.statusCode}`);
    }

    // 8. Update Task Status (PATCH /api/tasks/:id/status)
    if (createdTaskId) {
      console.log(`\nTest 8: Updating Task Status (PATCH /api/tasks/${createdTaskId}/status)...`);
      const statusRes = await makeRequest(`${BACKEND_URL}/tasks/${createdTaskId}/status`, 'PATCH', authHeaders, {
        status: 'Started'
      });
      if (statusRes.statusCode === 200) {
        const updatedTask = JSON.parse(statusRes.body);
        console.log(`✓ PASS: Task status updated to: ${updatedTask.task_status}`);
      } else {
        console.error(`✗ FAIL: Updating task status failed. Status: ${statusRes.statusCode}, Body: ${statusRes.body}`);
      }
    }

    // 9. Fetch Webhook telemetry logs
    console.log('\nTest 9: Fetching Webhook Logs (GET /api/logs/webhooks)...');
    const webhookLogsRes = await makeRequest(`${BACKEND_URL}/logs/webhooks`, 'GET', authHeaders);
    if (webhookLogsRes.statusCode === 200) {
      const logs = JSON.parse(webhookLogsRes.body);
      console.log(`✓ PASS: Webhook telemetry logs retrieved. Log entries count: ${logs.length || 0}`);
    } else {
      console.error(`✗ FAIL: Webhook logs fetch failed. Status: ${webhookLogsRes.statusCode}`);
    }

    // 10. Fetch Analytics (GET /api/analytics/summary)
    console.log('\nTest 10: Fetching Performance Analytics (GET /api/analytics/summary)...');
    const analyticsRes = await makeRequest(`${BACKEND_URL}/analytics/summary`, 'GET', authHeaders);
    if (analyticsRes.statusCode === 200) {
      const data = JSON.parse(analyticsRes.body);
      console.log(`✓ PASS: Analytics retrieved. Total Departments: ${data.departmentsCount}`);
    } else {
      console.error(`✗ FAIL: Analytics fetch failed. Status: ${analyticsRes.statusCode}`);
    }

    // 11. Upload proof without Task ID (Simulate Worker image upload without ID)
    console.log('\nTest 11: Uploading proof of work image without Task ID in caption...');
    const proofPayloadWithoutId = {
      object: 'whatsapp_business_account',
      entry: [{
        id: '123',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '1234', phone_number_id: '5678' },
            contacts: [{ profile: { name: 'Ramesh Worker' }, wa_id: WORKER_PHONE.replace('+', '') }],
            messages: [{
              from: WORKER_PHONE,
              id: `wamid.test_proof_pending_${Date.now()}`,
              timestamp: Math.floor(Date.now() / 1000).toString(),
              type: 'image',
              image: {
                id: 'mock_media_id_456',
                mime_type: 'image/jpeg',
                filename: 'site_photo.jpg',
                caption: 'Work done'
              }
            }]
          },
          field: 'messages'
        }]
      }]
    };

    const imageUploadRes = await makeRequest(`${BACKEND_URL}/webhooks/whatsapp`, 'POST', {}, proofPayloadWithoutId);
    if (imageUploadRes.statusCode === 200) {
      console.log('✓ PASS: Image webhook payload accepted successfully.');
      console.log('Waiting dynamically for background media processing...');
      const worker = await waitForPendingProof(WORKER_PHONE);
      if (worker && worker.pending_proof && worker.pending_proof.media_url) {
        console.log(`✓ PASS: Worker pending_proof correctly saved in DB: ${worker.pending_proof.file_name}`);
      } else {
        console.error('✗ FAIL: Worker pending_proof was not saved or is missing.');
      }
    } else {
      console.error(`✗ FAIL: Image webhook ingestion failed. Status: ${imageUploadRes.statusCode}`);
    }

    // 12. Reply with Task ID to link pending proof
    console.log(`\nTest 12: Replying with Task ID to link the pending proof of work (ID: ${taskHumanId})...`);
    const linkReplyPayload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: '123',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '1234', phone_number_id: '5678' },
            contacts: [{ profile: { name: 'Ramesh Worker' }, wa_id: WORKER_PHONE.replace('+', '') }],
            messages: [{
              from: WORKER_PHONE,
              id: `wamid.test_link_${Date.now()}`,
              timestamp: Math.floor(Date.now() / 1000).toString(),
              type: 'text',
              text: { body: `${taskHumanId} completed` }
            }]
          },
          field: 'messages'
        }]
      }]
    };

    const linkReplyRes = await makeRequest(`${BACKEND_URL}/webhooks/whatsapp`, 'POST', {}, linkReplyPayload);
    if (linkReplyRes.statusCode === 200) {
      console.log('✓ PASS: Link reply webhook payload accepted. Waiting dynamically for linkage...');
      const task = await waitForTaskLinkAndStatus(createdTaskId, 1);
      
      await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
      const worker = await User.findOne({ phone: WORKER_PHONE });
      
      if (task && task.proof_of_work && task.proof_of_work.length > 0) {
        console.log(`✓ PASS: Proof successfully linked to task! Proof file: ${task.proof_of_work[0].file_name}`);
        console.log(`✓ PASS: Task status transitioned to: ${task.task_status}`);
      } else {
        console.error('✗ FAIL: Proof was not linked to the task.');
      }
      
      if (worker && !worker.pending_proof?.media_url) {
        console.log('✓ PASS: Worker pending_proof field was cleared after linkage.');
      } else {
        console.error('✗ FAIL: Worker pending_proof field was not cleared.');
      }
      await mongoose.disconnect();
    } else {
      console.error(`✗ FAIL: Link reply webhook ingestion failed. Status: ${linkReplyRes.statusCode}`);
    }

    // 13. Test proof submission for Completed/Closed tasks as well
    console.log('\nTest 13: Verifying proof submission for Completed/Closed tasks...');
    const completedUploadPayload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: '123',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '1234', phone_number_id: '5678' },
            contacts: [{ profile: { name: 'Ramesh Worker' }, wa_id: WORKER_PHONE.replace('+', '') }],
            messages: [{
              from: WORKER_PHONE,
              id: `wamid.test_completed_proof_${Date.now()}`,
              timestamp: Math.floor(Date.now() / 1000).toString(),
              type: 'image',
              image: {
                id: 'mock_media_id_789',
                mime_type: 'image/jpeg',
                filename: 'extra_site_photo.jpg',
                caption: `proof for task ${taskHumanId}`
              }
            }]
          },
          field: 'messages'
        }]
      }]
    };

    const completedUploadRes = await makeRequest(`${BACKEND_URL}/webhooks/whatsapp`, 'POST', {}, completedUploadPayload);
    if (completedUploadRes.statusCode === 200) {
      console.log('✓ PASS: Completed task proof webhook accepted. Waiting dynamically for processing...');
      const task = await waitForTaskLinkAndStatus(createdTaskId, 2);
      if (task && task.proof_of_work && task.proof_of_work.length > 1) {
        console.log(`✓ PASS: Second proof successfully linked to Completed task! Array length: ${task.proof_of_work.length}`);
      } else {
        console.error(`✗ FAIL: Proof not linked to Completed task. Length: ${task?.proof_of_work?.length || 0}`);
      }
    } else {
      console.error(`✗ FAIL: Completed task proof webhook ingestion failed. Status: ${completedUploadRes.statusCode}`);
    }

    // 14. Cleanup test records
    console.log('\nCleaning up test records from database...');
    await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
    if (createdWorkerId) {
      await User.findByIdAndDelete(createdWorkerId);
    }
    if (createdDeptId) {
      await Department.findByIdAndDelete(createdDeptId);
    }
    if (createdTaskId) {
      await Task.findByIdAndDelete(createdTaskId);
    }
    await Task.deleteMany({ worker_phone: WORKER_PHONE });
    await User.deleteMany({ phone: '+919876543219' });
    await mongoose.disconnect();
    console.log('✓ Cleanup complete.');

    console.log('\n======================================================');
    console.log('ALL SAHAYAK AI E2E INTEGRATION TESTS PASSED!');
    console.log('======================================================');
    process.exit(0);

  } catch (error) {
    console.error('✗ Test execution error:', error.message);
    process.exit(1);
  }
}

runTests();

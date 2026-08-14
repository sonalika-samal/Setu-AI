const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const config = require('./dist/config/config').config;

// Load schemas to register them with mongoose
require('./dist/models/Department');
require('./dist/models/User');
require('./dist/models/Task');
require('./dist/models/Notification');
require('./dist/models/LoginHistory');
require('./dist/models/SecurityLog');

async function runTest() {
  console.log('--- Starting Phase 5 Backend Verification Test ---');
  console.log('Connecting to database:', config.mongo.uri);
  
  await mongoose.connect(config.mongo.uri, {
    dbName: config.mongo.dbName
  });
  console.log('Database connected successfully.');

  const Department = mongoose.model('Department');
  const User = mongoose.model('User');
  const Task = mongoose.model('Task');
  const Notification = mongoose.model('Notification');
  const LoginHistory = mongoose.model('LoginHistory');
  const SecurityLog = mongoose.model('SecurityLog');

  console.log('\n--- 1. Testing Schema Telemetry & Records Insertion ---');
  
  // Clean up any old tests
  await Department.deleteMany({ code: 'TSTDEPT' });
  await User.deleteMany({ phone: '+919999999990' });
  await Task.deleteMany({ location: 'TEST_LOCATION_PHASE5' });
  await Notification.deleteMany({ title: 'Test Alert Phase 5' });
  await LoginHistory.deleteMany({ username: 'test_audit_user' });
  await SecurityLog.deleteMany({ username: 'test_audit_user' });

  // Insert Department
  const dept = await Department.create({
    name: 'Test Engineering Department',
    code: 'TSTDEPT',
    description: 'Validating Phase 5 workforce department operations',
    status: 'Active'
  });
  console.log('Inserted Department:', dept.name, `(${dept.code})`);

  // Insert Worker
  const worker = await User.create({
    name: 'Phase5 Worker',
    username: 'phase5worker',
    password: 'WorkerPassword123!',
    phone: '+919999999990',
    role: 'Worker',
    department_id: dept._id,
    availability_status: 'Available',
    worker_status: 'Enabled'
  });
  console.log('Inserted Worker:', worker.name, `[Department Ref: ${worker.department_id}]`);

  // Insert Task with Proof of Work sub-document
  const task = await Task.create({
    taskId: 'T-PHASE5-01',
    task_msg: 'Execute system integration test suite',
    location: 'TEST_LOCATION_PHASE5',
    task_status: 'Started',
    worker_id: worker._id,
    worker_name: worker.name,
    worker_phone: worker.phone,
    timestamp: new Date(),
    proof_of_work: [
      {
        media_url: 'http://localhost:5000/uploads/test.png',
        media_type: 'image/png',
        file_name: 'test.png',
        uploaded_by: 'Phase5 Worker',
        status: 'Pending',
        uploaded_at: new Date()
      }
    ]
  });
  console.log('Inserted Task:', task.taskId, `[Status: ${task.task_status}] with proof of work attached.`);

  // Insert Notification
  const notif = await Notification.create({
    title: 'Test Alert Phase 5',
    description: 'Workforce test validation trigger alert',
    type: 'Proof Uploaded',
    read_status: 'Unread',
    timestamp: new Date()
  });
  console.log('Inserted Alert Notification:', notif.title);

  // Insert Security Log history
  const loginHist = await LoginHistory.create({
    user_id: worker._id,
    username: 'test_audit_user',
    ip_address: '127.0.0.1',
    user_agent: 'NodeTestAgent',
    status: 'Success',
    timestamp: new Date()
  });
  const secAudit = await SecurityLog.create({
    username: 'test_audit_user',
    action: 'Password Reset',
    ip_address: '127.0.0.1',
    details: 'Verified password modification log stream',
    timestamp: new Date()
  });
  console.log('Inserted Telemetry Security History Logs successfully.');

  console.log('\n--- 2. Testing QueryService joined outputs ---');
  // Load QueryService dynamically (import transpile logic)
  const QueryService = require('./dist/services/QueryService').QueryService;
  const queryService = new QueryService();
  
  const details = await queryService.executeQuery('GET_TASK_DETAILS', { taskId: task.taskId });
  console.log('QueryService resolved task details attributes:');
  console.log('- Task Description:', details.task_msg);
  console.log('- Joined Proofs Count:', details.proof_of_work?.length);
  if (details.proof_of_work?.length > 0) {
    console.log('  -> Proof URL matched:', details.proof_of_work[0].media_url);
  } else {
    throw new Error('Verification failed: Joined proof_of_work array was empty!');
  }

  console.log('\n--- 3. Testing OwnerAIService dynamic factual resolver ---');
  const OwnerAIService = require('./dist/services/ai/OwnerAIService').OwnerAIService;
  const serviceInstance = new OwnerAIService();
  const reply = await serviceInstance.chat('Which department is worker phone +919999999990 in?', [], 'test_owner_assistant');
  console.log('Owner AIService Reply Context:\n', reply);

  // Clean up
  console.log('\n--- 4. Cleaning up test records ---');
  await Department.deleteOne({ _id: dept._id });
  await User.deleteOne({ _id: worker._id });
  await Task.deleteOne({ _id: task._id });
  await Notification.deleteOne({ _id: notif._id });
  await LoginHistory.deleteOne({ _id: loginHist._id });
  await SecurityLog.deleteOne({ _id: secAudit._id });
  console.log('Temporary verification records cleaned up successfully.');

  console.log('\n--- PHASE 5 VERIFICATION COMPLETED WITH ZERO ERRORS! ---');
  await mongoose.disconnect();
}

runTest().catch(err => {
  console.error('\n--- PHASE 5 VERIFICATION FAILED! ---');
  console.error(err);
  process.exit(1);
});

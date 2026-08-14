const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://sonalikactc29_db_user:by7BWqHiWnDDVDPX@cluster0.dqu8svm.mongodb.net/?appName=Cluster0';
const DB_NAME = 'n8ndb';

async function checkDb() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
    console.log('Connected!');

    const WebhookLog = mongoose.model('WebhookLog', new mongoose.Schema({}, { strict: false }), 'webhooklogs');
    const Task = mongoose.model('Task', new mongoose.Schema({}, { strict: false }), 'tasks');
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');

    const latestWebhooks = await WebhookLog.find().sort({ createdAt: -1 }).limit(5);
    console.log('\n--- LATEST WEBHOOK LOGS ---');
    latestWebhooks.forEach(log => {
      console.log(`ID: ${log._id} | Sender: ${log.sender_phone} | Type: ${log.message_type} | Status: ${log.processing_status} | CreatedAt: ${log.createdAt}`);
      if (log.payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body) {
        console.log(`Body: "${log.payload.entry[0].changes[0].value.messages[0].text.body}"`);
      }
    });

    const latestTasks = await Task.find().sort({ createdAt: -1 }).limit(5);
    console.log('\n--- LATEST TASKS ---');
    latestTasks.forEach(task => {
      console.log(`ID: ${task._id} | Worker: ${task.worker_name} | Msg: "${task.task_msg}" | Location: "${task.location}" | Status: ${task.task_status} | CreatedAt: ${task.createdAt}`);
    });

    const allUsers = await User.find();
    console.log('\n--- ALL USERS ---');
    allUsers.forEach(u => {
      console.log(`Name: ${u.name} | Phone: ${u.phone} | Role: ${u.role}`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

checkDb();

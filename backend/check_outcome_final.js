const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://sonalikactc29_db_user:by7BWqHiWnDDVDPX@cluster0.dqu8svm.mongodb.net/n8ndb?appName=Cluster0';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const taskSchema = new mongoose.Schema({}, { strict: false, collection: 'tasks' });
    const Task = mongoose.model('Task', taskSchema);

    const messageLogSchema = new mongoose.Schema({}, { strict: false, collection: 'messagelogs' });
    const MessageLog = mongoose.model('MessageLog', messageLogSchema);

    const activityLogSchema = new mongoose.Schema({}, { strict: false, collection: 'activitylogs' });
    const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

    console.log('--- RECENT TASKS ---');
    const tasks = await Task.find({}).sort({ createdAt: -1 }).limit(3).lean();
    tasks.forEach(t => {
      console.log(`[${t.createdAt}] Task ID: ${t.taskId || t._id}, Worker: ${t.worker_name}, Phone: ${t.worker_phone}, Msg: ${t.task_msg}, Status: ${t.task_status}`);
    });

    console.log('\n--- RECENT OUTGOING MESSAGES ---');
    const msgs = await MessageLog.find({ direction: 'outgoing' }).sort({ timestamp: -1 }).limit(3).lean();
    msgs.forEach(m => {
      console.log(`[${m.timestamp}] Msg ID: ${m.message_id}, Receiver: ${m.receiver}, Msg: ${m.message}`);
    });

    console.log('\n--- RECENT SYSTEM ACTIVITIES ---');
    const acts = await ActivityLog.find({}).sort({ timestamp: -1 }).limit(5).lean();
    acts.forEach(a => {
      console.log(`[${a.timestamp}] User: ${a.username}, Action: ${a.action}, Desc: ${a.description}`);
    });

  } catch (err) {
    console.error('Error running script:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();

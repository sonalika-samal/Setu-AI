const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });
const config = require('./dist/config/config').config;

require('./dist/models/ErrorLog');

async function checkErrors() {
  await mongoose.connect(config.mongo.uri, {
    dbName: config.mongo.dbName
  });

  const ErrorLogModel = mongoose.model('ErrorLog');
  const logs = await ErrorLogModel.find().sort({ createdAt: -1 }).limit(10).lean();
  
  console.log('\n--- LATEST 10 ERROR LOGS ---');
  for (const log of logs) {
    console.log(`[${log.createdAt.toISOString()}] [Status: ${log.status}] [Code: ${log.code}] Message: ${log.message}`);
  }
  
  await mongoose.disconnect();
}

checkErrors().catch(console.error);

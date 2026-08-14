const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const apiKey = process.env.SARVAM_API_KEY;
const model = process.env.SARVAM_TASK_EXTRACTION_MODEL || 'sarvam-105b';

const systemPrompt = `You are a strict data extraction API for Sahayak AI. Skip your thinking/reasoning process entirely and do not write any conversational text or explanations. Your output must contain absolutely nothing except a valid JSON array. Extract task assignments from the incoming user message (which might be in mixed English/Odia prose). If multiple people or tasks are mentioned, split them into separate objects inside a JSON array. CRITICAL: Set the from_number field to the sender number. Output format: [{"from_number":"+919999999999","worker_name":"Name","task_msg":"Task description","location":"Location","deadline":"Deadline string"}]`;

const userMsg = "Abhishek plz aaji college quare ru gote keyboard nei aasibu 9:00 pm aagaru.";

async function run() {
  const startTime = Date.now();
  try {
    const response = await fetch('https://api.sarvam.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userMsg,
          },
        ],
      }),
    });

    console.log('Response status:', response.status);
    const text = await response.text();
    console.log('Response body:', text);
    console.log(`Execution time: ${Date.now() - startTime}ms`);
  } catch (err) {
    console.error('Error calling Sarvam API:', err.message);
  }
}

run();

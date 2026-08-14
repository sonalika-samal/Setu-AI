"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OwnerAIService = void 0;
const QueryService_1 = require("../QueryService");
const AIService_1 = require("./AIService");
const CredentialRepository_1 = require("../../repositories/CredentialRepository");
const LoggingService_1 = require("../LoggingService");
const logger_1 = require("../../utils/logger");
const queryService = new QueryService_1.QueryService();
const aiService = new AIService_1.AIService();
const credentialRepo = new CredentialRepository_1.CredentialRepository();
const loggingService = new LoggingService_1.LoggingService();
class OwnerAIService {
    async chat(message, historyContext, username) {
        logger_1.logger.info(`OwnerAIService: Processing chat request for user: ${username}`);
        try {
            // 1. Get credentials and determine AI model settings
            const creds = await credentialRepo.getCredentials();
            const aiProvider = 'sarvam';
            const aiModel = creds.sarvam.taskExtractionModel || 'sarvam-105b';
            let classificationModel = creds.sarvam.classificationModel || 'sarvam-105b';
            if (classificationModel === 'sarvam-30b') {
                classificationModel = 'sarvam-105b';
            }
            // 2. Format history
            let formattedHistory = '';
            if (typeof historyContext === 'string') {
                formattedHistory = historyContext;
            }
            else if (Array.isArray(historyContext)) {
                formattedHistory = historyContext
                    .slice(-15) // Keep last 15 messages
                    .map(m => {
                    const role = m.role === 'user' || m.direction === 'incoming' ? 'Owner' : 'System';
                    const msgText = m.content || m.message || '';
                    return `${role}: ${msgText}`;
                })
                    .join('\n');
            }
            // 3. Step 1: Predefined operation classification and parameter extraction
            await loggingService.logActivity(username, 'AI Started', 'Classifying Owner assistant query operation.');
            const queryClassifierPrompt = `You are a query classifier and parameter extractor for Sahayak AI Owner Assistant.
An Owner has sent this query: "${message}"
Recent conversation history:
${formattedHistory}

Classify the query into exactly one of the following predefined operations, taking the conversation context into account:

- GET_OPEN_TASKS (Show all open tasks)
- GET_COMPLETED_TASKS (Show all completed tasks)
- GET_STARTED_TASKS (Show all started/in-progress tasks)
- GET_WORKER_STATUS (What a worker is doing, what is their status, check-in/out time, availability status, inactivity status, or last seen. Extracted workerName is required)
- GET_WORKER_TASKS (Show tasks for a specific worker. Extracted workerName is required)
- GET_OVERDUE_TASKS (Show overdue tasks)
- GET_TODAY_TASKS (Show today's tasks)
- GET_PENDING_TASKS (Show pending tasks: Open, Started, or More Details Asked)
- GET_MORE_DETAILS_TASKS (Show tasks where worker asked for details)
- GET_ACTIVITY_LOGS (Show recent logs)
- GET_TASK_DETAILS (Show details for a specific task. taskId or workerName might be extracted)
- GET_WORKER_SUMMARY (Show all workers and their counts, availability status, check-in/out status, or active tasks overview list)
- GET_DASHBOARD_SUMMARY (Show summary count statistics)
- GET_DEPARTMENTS (Show list of all departments)
- GET_NOTIFICATIONS (Show recent notifications alerts)
- GET_PROOF_OF_WORK (Show proof of work gallery details or media uploaded today. Optional taskId)
- GET_SECURITY_LOGS (Show security audits, login logs or system security audit trails)
- GET_REPORTS (Show analytical reports summary counters)
- UNKNOWN (If query doesn't match any operation)

Extract parameters:
- workerName: The name of the worker mentioned in the query or implied by previous conversation. If the current query uses pronouns like "he", "his", "her", "their", or "them", resolve the worker name from the recent conversation history (e.g. if the owner previously asked about "Ramesh" and now asks "what is he doing?", then workerName is "Ramesh").
- taskId: The task ID mentioned in the query or implied by previous conversation. If the current query refers to "that task", "it", or "its timeline", resolve the task ID from the recent conversation history.

Output format must be exactly a valid JSON object:
{"operation": "OPERATION_NAME", "parameters": {"workerName": "Name", "taskId": "ID"}}
Do not include any other text or markdown formatting.`;
            let classificationObj = null;
            try {
                const classificationText = await aiService.generate(queryClassifierPrompt, `Classify: ${message}`, aiProvider, classificationModel);
                // Clean JSON parsing helper
                const cleanAndParseJSON = (text) => {
                    try {
                        const match = text.match(/\{[\s\S]*\}/);
                        if (match) {
                            return JSON.parse(match[0]);
                        }
                        return JSON.parse(text);
                    }
                    catch (e) {
                        logger_1.logger.error(`Failed to parse AI JSON response: ${text}`);
                        return null;
                    }
                };
                classificationObj = cleanAndParseJSON(classificationText);
                await loggingService.logActivity(username, 'AI Completed', `Query classified as operation: ${classificationObj?.operation}`);
            }
            catch (classErr) {
                await loggingService.logActivity(username, 'AI Failure', `Query classification failed: ${classErr.message}.`);
            }
            const operation = classificationObj?.operation || 'UNKNOWN';
            const parameters = classificationObj?.parameters || {};
            // 4. Step 2: Predefined query execution in QueryService
            let queryResults = null;
            if (operation !== 'UNKNOWN') {
                try {
                    queryResults = await queryService.executeQuery(operation, parameters);
                }
                catch (dbErr) {
                    await loggingService.logActivity(username, 'MongoDB Failure', `Query execution failed: ${dbErr.message}`);
                    queryResults = { error: dbErr.message };
                }
            }
            else {
                queryResults = { error: 'Unknown query command. No factual records matched.' };
            }
            // 5. Step 3: Natural language response formatting
            await loggingService.logActivity(username, 'AI Started', 'Formatting query results into natural language response.');
            const formattingPrompt = `You are Sahayak Owner AI Assistant.
The owner asked: "${message}"
Here are the factual records retrieved from the database:
${JSON.stringify(queryResults)}

Formulate a natural language, professional response answering the query based strictly on the retrieved records.
CRITICAL:
- Never guess or make up details. If the records are empty or do not answer the question, politely say you don't know or don't have that information.
- Keep the answer clear and concise.
- If the owner wrote in a specific language (like Odia, Hindi, or English), respond in the same language if possible.`;
            let finalResponse = '';
            try {
                finalResponse = await aiService.generate(formattingPrompt, `Format response for: ${message}`, aiProvider, classificationModel);
                await loggingService.logActivity(username, 'AI Completed', 'Query response formulated successfully.');
            }
            catch (formatErr) {
                await loggingService.logActivity(username, 'AI Failure', `Response formatting failed: ${formatErr.message}`);
                finalResponse = "Sorry, I encountered an issue formulating the response. Please try again.";
            }
            return finalResponse;
        }
        catch (err) {
            logger_1.logger.error(`OwnerAIService Error: ${err.message}`);
            return "An error occurred while compiling your request. Please try again.";
        }
    }
}
exports.OwnerAIService = OwnerAIService;
exports.default = OwnerAIService;

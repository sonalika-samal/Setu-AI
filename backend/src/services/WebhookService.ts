import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { WebhookLogModel } from '../models/WebhookLog';
import { UserModel } from '../models/User';
import { TaskModel } from '../models/Task';
import { TaskTimelineModel } from '../models/TaskTimeline';
import { MessageLogModel } from '../models/MessageLog';
import { ActivityLogModel } from '../models/ActivityLog';
import { CredentialRepository } from '../repositories/CredentialRepository';
import { WhatsAppService } from './whatsapp/WhatsAppService';
import { AIService } from './ai/AIService';
import { SpeechService } from './speech/SpeechService';
import { LoggingService } from './LoggingService';
import { QueryService } from './QueryService';
import { ReminderService } from './ReminderService';
import { logger } from '../utils/logger';

const credentialRepo = new CredentialRepository();
const whatsAppService = new WhatsAppService();
const aiService = new AIService();
const speechService = new SpeechService();
const loggingService = new LoggingService();
const queryService = new QueryService();

/**
 * Parses natural language date strings (e.g., "today at 8 PM", "tomorrow") relative to local Kolkata timezone
 */
function parseNaturalLanguageDate(dateStr: string): Date {
  const now = new Date();
  if (!dateStr) {
    return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default to tomorrow
  }

  let text = dateStr.toLowerCase().trim();
  
  // Extract time parts (e.g. "8 PM", "10:30 AM")
  const timeMatch = text.match(/(\d+)(?::(\d+))?\s*(am|pm)/i) || text.match(/(\d+):(\d+)/);
  let hours = 12;
  let minutes = 0;

  if (timeMatch) {
    hours = parseInt(timeMatch[1], 10);
    minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3]?.toLowerCase();
    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;
  }

  if (text.includes('today') || text.includes('tonight') || text.includes('evening')) {
    const result = new Date(now);
    // If "tonight" or "evening" is specified and no time match was found, default to 8 PM (20:00)
    if ((text.includes('tonight') || text.includes('evening')) && !timeMatch) {
      hours = 20;
    }
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  if (text.includes('tomorrow')) {
    const result = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  // Fallback: try native Date parsing
  const parsedTime = Date.parse(dateStr);
  if (!isNaN(parsedTime)) {
    return new Date(parsedTime);
  }

  // Final fallback: Tomorrow
  return new Date(now.getTime() + 24 * 60 * 60 * 1000);
}

/**
 * Clean markdown JSON code block formatting returned by LLMs
 */
function cleanAndParseJSON(input: string): any {
  let cleaned = input.trim();
  
  if (cleaned.startsWith('```')) {
    cleaned = cleaned
      .replace(/^```json\s*/i, '') // remove ```json
      .replace(/^```\s*/, '')      // remove ```
      .replace(/```$/, '')         // remove ending ```
      .trim();
  }
  
  try {
    return JSON.parse(cleaned);
  } catch (error: any) {
    logger.error(`cleanAndParseJSON: Failed to parse JSON content from LLM: ${error.message}`);
    logger.error(`Original output content was: ${input}`);
    return null;
  }
}

export class WebhookService {
  /**
   * Main entry point called asynchronously to execute the complete task assignment pipeline
   */
  async processWebhook(payload: any, io: any, orgId: string = 'default'): Promise<void> {
    let logDoc: any = null;
    let senderPhone = '';
    let senderName = 'WhatsApp Contact';
    let messageId = '';
    let messageType = 'text';

    try {
      const entry = payload.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const msgObj = value?.messages?.[0];

      if (!msgObj) {
        logger.warn(`processWebhook [${orgId}]: No message payload found.`);
        return;
      }

      messageId = msgObj.id;
      senderPhone = msgObj.from;
      const contactObj = value.contacts?.[0];
      senderName = contactObj?.profile?.name || 'WhatsApp Contact';
      messageType = msgObj.type;

      // Deduplicate: Check if message has already been processed or is currently processing
      const existingLog = await WebhookLogModel.findOne({ orgId, message_id: messageId });
      if (existingLog) {
        logger.info(`processWebhook [${orgId}]: Message ${messageId} already exists in database. Skipping duplicate.`);
        return;
      }

      // 1. Initial State: Log webhook as received
      logDoc = await WebhookLogModel.create({
        orgId,
        sender_name: senderName,
        sender_phone: senderPhone,
        message_id: messageId,
        message_type: messageType,
        direction: 'incoming',
        delivery_status: 'received',
        processing_status: 'received',
        payload,
      });

      this.emitSocketUpdate(io, logDoc);
      await loggingService.logActivity('system', 'Webhook Received', `Inbound webhook message ${messageId} recorded.`, orgId);

      // 2. Identify sender role in database
      const cleanSenderPhone = senderPhone.replace('+', '').trim();
      const sender = await UserModel.findOne({ orgId, username: senderPhone });
      const senderByPhone = sender || await UserModel.findOne({
        orgId,
        $or: [
          { phone: senderPhone },
          { phone: cleanSenderPhone },
          { phone: `+${cleanSenderPhone}` }
        ]
      });

      if (!senderByPhone) {
        logger.warn(`processWebhook [${orgId}]: Sender ${senderPhone} not found in user database.`);
        logDoc.processing_status = 'failed';
        await logDoc.save();
        this.emitSocketUpdate(io, logDoc);
        
        await loggingService.logActivity(
          'system',
          'Unknown Sender',
          `Message from unregistered phone ${senderPhone} ignored by system.`,
          orgId
        );
        
        try {
          await whatsAppService.sendMessage(senderPhone, "Sorry, your number is not registered in Setu AI by DotnLott. Please contact the administrator.", orgId);
        } catch (waErr: any) {
          await loggingService.logActivity('system', 'WhatsApp Failure', `Failed to notify unknown sender: ${waErr.message}`, orgId);
        }
        return;
      }

      const senderRole = senderByPhone.role;
      const senderUsername = senderByPhone.username || senderByPhone.phone || 'system';

      logDoc.processing_status = 'processing';
      await logDoc.save();
      this.emitSocketUpdate(io, logDoc);
      await loggingService.logActivity(senderUsername, 'Sender Verified', `Role ${senderRole} validated for ${senderByPhone.name}.`);

      // 3. Resolve incoming text or voice transcription
      let extractedText = '';
      let isProofUpload = false;
      let mediaId = '';
      let mimeType = '';
      let originalFilename = '';

      if (messageType === 'text') {
        extractedText = msgObj.text?.body || '';
      } else if (messageType === 'audio') {
        await loggingService.logActivity(senderUsername, 'Speech Download Started', 'Downloading voice file from Meta...');
        
        try {
          const audioBuffer = await whatsAppService.downloadMedia(msgObj.audio.id);
          const tempDir = path.join(__dirname, '../../temp');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          
          const tempFilePath = path.join(tempDir, `temp_voice_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.ogg`);
          fs.writeFileSync(tempFilePath, audioBuffer);
          
          try {
            const creds = await credentialRepo.getCredentials();
            const speechProvider = 'sarvam';
            const speechModel = creds.sarvam.speechModel || 'saaras:v3';
            
            extractedText = await speechService.transcribeAudio(audioBuffer, speechProvider, speechModel);
            await loggingService.logActivity(senderUsername, 'Speech Converted', `Transcribed voice successfully: "${extractedText}"`);
          } catch (speechErr: any) {
            await loggingService.logActivity(senderUsername, 'Speech Failure', `Voice transcription failed: ${speechErr.message}`);
            logDoc.processing_status = 'failed';
            await logDoc.save();
            this.emitSocketUpdate(io, logDoc);
            return;
          } finally {
            if (fs.existsSync(tempFilePath)) {
              try {
                fs.unlinkSync(tempFilePath);
              } catch (delErr: any) {
                logger.warn(`Failed to delete temporary audio file: ${delErr.message}`);
              }
            }
          }
        } catch (dlErr: any) {
          await loggingService.logActivity(senderUsername, 'Speech Failure', `Failed to download media: ${dlErr.message}`);
          logDoc.processing_status = 'failed';
          await logDoc.save();
          this.emitSocketUpdate(io, logDoc);
          return;
        }
      } else if (['image', 'video', 'document'].includes(messageType)) {
        isProofUpload = true;
        const mediaObj = msgObj[messageType];
        mediaId = mediaObj.id;
        mimeType = mediaObj.mime_type || '';
        originalFilename = mediaObj.filename || `${messageType}_${Date.now()}`;
        extractedText = mediaObj.caption || '';
      } else {
        logger.warn(`processWebhook: Message type ${messageType} is not supported. Ingestion cancelled.`);
        logDoc.processing_status = 'ignored';
        await logDoc.save();
        this.emitSocketUpdate(io, logDoc);
        return;
      }

      // Log incoming message to message_logs
      const incomingMsgLog = await MessageLogModel.create({
        message_id: messageId,
        sender: senderPhone,
        receiver: value.metadata?.display_phone_number || 'system',
        direction: 'incoming',
        type: messageType,
        message: extractedText,
        status: 'received',
        timestamp: new Date(),
      });

      // Detect ending/courtesy/acknowledgment phrases to not send any reply
      const courtesyPhrases = [
        /^\s*welcome[\s.!]*$/i,
        /^\s*thanks[\s.!]*$/i,
        /^\s*thank\s+you[\s.!]*$/i,
        /^\s*thankyou[\s.!]*$/i,
        /^\s*ok[\s.!]*$/i,
        /^\s*okay[\s.!]*$/i,
        /^\s*bye[\s.!]*$/i,
        /^\s*goodbye[\s.!]*$/i,
        /^\s*tc[\s.!]*$/i,
        /^\s*take\s+care[\s.!]*$/i,
        /^\s*no\s+problem[\s.!]*$/i,
        /^\s*np[\s.!]*$/i,
      ];
      const isCourtesy = courtesyPhrases.some(rx => rx.test(extractedText.trim()));
      if (isCourtesy) {
        await loggingService.logActivity(senderUsername, 'Message Ignored', `Courtesy message "${extractedText}" detected. No reply sent.`);
        logDoc.processing_status = 'completed';
        logDoc.delivery_status = 'processed';
        await logDoc.save();
        this.emitSocketUpdate(io, logDoc);
        return;
      }

      // Emit incoming message socket event
      if (io) {
        io.emit('message:received', {
          message_id: messageId,
          sender: senderPhone,
          receiver: 'system',
          message: extractedText,
          timestamp: new Date().toISOString(),
        });
      }

      const creds = await credentialRepo.getCredentials();
      const aiProvider = 'sarvam';
      const aiModel = creds.sarvam.taskExtractionModel || 'sarvam-105b';
      let classificationModel = creds.sarvam.classificationModel || 'sarvam-105b';
      if (classificationModel === 'sarvam-30b') {
        classificationModel = 'sarvam-105b';
      }

      // 4. Delegate workflow based on verified role
      if (senderRole === 'Worker') {
        const workerDoc = senderByPhone as any;

        // Update activity timestamps
        workerDoc.last_seen = new Date();
        workerDoc.last_activity = extractedText.substring(0, 150);
        await workerDoc.save();

        // Fetch ALL tasks assigned to this worker
        const cleanSenderPhone = senderPhone.replace('+', '').trim();
        const allTasks = await TaskModel.find({
          $or: [
            { worker_phone: senderPhone },
            { worker_phone: cleanSenderPhone },
            { worker_phone: `+${cleanSenderPhone}` }
          ]
        }).sort({ timestamp: -1 });
        const activeTasks = allTasks.filter(t => ['Open', 'Started', 'More Details Asked'].includes(t.task_status));

        // --- WORKER PROOF OF WORK UPLOAD ---
        if (isProofUpload) {
          await loggingService.logActivity(senderUsername, 'Proof Upload Started', `Worker ${workerDoc.name} is uploading proof of work.`);
          
          let matchedTask: any = null;
          
          // Match Task ID from caption
          const taskIdRegex = /\b(\d{8}T\d+)\b/i;
          const captionMatch = extractedText.match(taskIdRegex);
          if (captionMatch) {
            const matchedId = captionMatch[1].toUpperCase();
            matchedTask = activeTasks.find(t => t.taskId === matchedId);
            if (!matchedTask) {
              matchedTask = allTasks.find(t => t.taskId === matchedId);
            }
          }

          // Download media binary from Meta Graph API
          let fileBuffer: Buffer;
          try {
            fileBuffer = await whatsAppService.downloadMedia(mediaId);
          } catch (dlErr: any) {
            logger.error(`Failed to download proof media from Meta: ${dlErr.message}`);
            logDoc.processing_status = 'failed';
            await logDoc.save();
            this.emitSocketUpdate(io, logDoc);
            return;
          }

          // Write to static uploads folder
          const uploadsDir = path.join(process.cwd(), 'uploads');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }

          let ext = 'bin';
          if (mimeType.includes('image/jpeg') || mimeType.includes('image/jpg')) ext = 'jpg';
          else if (mimeType.includes('image/png')) ext = 'png';
          else if (mimeType.includes('video/mp4')) ext = 'mp4';
          else if (mimeType.includes('pdf')) ext = 'pdf';
          else if (mimeType.includes('msword')) ext = 'doc';
          else if (mimeType.includes('officedocument')) ext = 'docx';

          if (matchedTask) {
            const filename = `${matchedTask.taskId || matchedTask._id}_proof_${Date.now()}.${ext}`;
            const savePath = path.join(uploadsDir, filename);
            fs.writeFileSync(savePath, fileBuffer);

            const localMediaUrl = `http://localhost:5000/uploads/${filename}`;

            // Append proof to matched task
            if (!matchedTask.proof_of_work) matchedTask.proof_of_work = [];
            matchedTask.proof_of_work.push({
              media_url: localMediaUrl,
              media_type: messageType,
              file_name: originalFilename || filename,
              uploaded_by: workerDoc.name,
              uploaded_at: new Date(),
              status: 'Pending',
              review_notes: '',
              approval_history: []
            });
            await matchedTask.save();

            // Create Notification
            const { NotificationModel } = require('../models/Notification');
            const notification = await NotificationModel.create({
              title: 'Proof Uploaded',
              description: `${workerDoc.name} uploaded proof of work for task ${matchedTask.taskId || matchedTask._id}.`,
              type: 'Proof Uploaded',
              related_task: matchedTask._id,
              related_worker: workerDoc._id,
              read_status: 'Unread',
              timestamp: new Date()
            });

            // Log Activity
            await loggingService.logActivity(
              senderUsername,
              'Proof Uploaded',
              `Worker ${workerDoc.name} uploaded proof of work file "${originalFilename || filename}" for task ${matchedTask.taskId || matchedTask._id}.`
            );

            // If task is not Completed/Closed, see if we need to update the status from the caption
            if (!['Completed', 'Closed'].includes(matchedTask.task_status)) {
              const classificationPrompt = `You are a reply status classifier for Setu AI.
Classify the worker's reply into exactly one of these task statuses:
1. Started: Acknowledged, started, on the way, okay, ok, working, in progress (e.g. "got it", "repaired started", "working on it").
2. Completed: Done, fixed, completed, finished (e.g. "finished", "completed", "done").
3. More Details Asked: Asking for details or questions.

Worker message: "${extractedText}"

Output exactly one of the words: Started, Completed, or More Details Asked. Do not output anything else.`;

              let classifiedStatus = '';
              try {
                const aiClassified = await aiService.generate(classificationPrompt, `Classify caption: ${extractedText}`, aiProvider, classificationModel);
                if (aiClassified.trim().includes('Completed')) {
                  classifiedStatus = 'Completed';
                } else if (aiClassified.trim().includes('Started')) {
                  classifiedStatus = 'Started';
                } else if (aiClassified.trim().includes('More Details Asked') || aiClassified.trim().includes('Details')) {
                  classifiedStatus = 'More Details Asked';
                }
              } catch (err: any) {
                logger.error(`Failed to classify caption status: ${err.message}`);
              }

              if (classifiedStatus) {
                const previousStatus = matchedTask.task_status;
                matchedTask.task_status = classifiedStatus;
                matchedTask.last_worker_reply = extractedText;
                
                if (classifiedStatus === 'Started' && !matchedTask.started_time) {
                  matchedTask.started_time = new Date();
                }
                if (classifiedStatus === 'Completed' && !matchedTask.completed_time) {
                  matchedTask.completed_time = new Date();
                }
                await matchedTask.save();
                await loggingService.logActivity(senderUsername, 'Task Updated', `Task ${matchedTask.taskId || matchedTask._id} status transitioned from ${previousStatus} to ${classifiedStatus} via caption.`);
                
                if (classifiedStatus === 'Completed') {
                  try {
                    ReminderService.cancelTaskReminders(matchedTask._id.toString());
                  } catch (reminderErr: any) {
                    logger.error(`Failed to cancel reminders on worker completion: ${reminderErr.message}`);
                  }
                }

                // Timeline Entry
                await TaskTimelineModel.create({
                  task_id: matchedTask._id,
                  action: classifiedStatus === 'Completed' ? 'Task Completed' : (classifiedStatus === 'Started' ? 'Task Started' : 'More Details Asked'),
                  description: `Worker marked task status via image caption: "${extractedText}".`,
                  performed_by: workerDoc.name,
                });
              }
            }

            // Emit Socket.IO event
            if (io) {
              io.emit('task:updated', { id: matchedTask._id.toString() });
              io.emit('notification:received', notification);
            }

            await whatsAppService.sendMessage(
              senderPhone,
              `Successfully uploaded proof of work for Task ${matchedTask.taskId || matchedTask._id}. Admin/Owner will review.`
            );

            logDoc.processing_status = 'completed';
            logDoc.delivery_status = 'processed';
            await logDoc.save();
            this.emitSocketUpdate(io, logDoc);
            return;
          } else {
            // Task not matched immediately. Download and save media as pending proof.
            const filename = `pending_${workerDoc._id}_proof_${Date.now()}.${ext}`;
            const savePath = path.join(uploadsDir, filename);
            fs.writeFileSync(savePath, fileBuffer);

            const localMediaUrl = `http://localhost:5000/uploads/${filename}`;

            workerDoc.set('pending_proof', {
              media_url: localMediaUrl,
              media_type: messageType,
              file_name: originalFilename || filename,
              uploaded_at: new Date()
            });
            await workerDoc.save();

            logger.warn(`Proof Upload: Could not resolve target Task ID for worker ${workerDoc.name}. Saved pending proof.`);
            await whatsAppService.sendMessage(
              senderPhone,
              "Thank you for sending the file. However, I could not determine which Task this proof is for. Please reply with the Task ID to link it."
            );
            
            logDoc.processing_status = 'completed';
            logDoc.delivery_status = 'processed';
            await logDoc.save();
            this.emitSocketUpdate(io, logDoc);
            return;
          }
        }

        // Detect Check-In
        const checkInRegexes = [
          /\bgood\s+morning\b/i,
          /\bi\s+am\s+available\s+for\s+work\b/i,
          /\bavailable\b/i,
          /\bstarting\s+work\b/i,
          /\bready\s+for\s+work\b/i
        ];
        const isCheckIn = checkInRegexes.some(rx => rx.test(extractedText));

        // Detect Check-Out
        const checkOutRegexes = [
          /\bgood\s+evening\b/i,
          /\bleaving\s+now\b/i,
          /\bsigning\s+off\b/i,
          /\bgoing\s+home\b/i,
          /\bend\s+of\s+day\b/i,
          /\bwork\s+completed\s+for\s+today\b/i
        ];
        const isCheckOut = checkOutRegexes.some(rx => rx.test(extractedText));

        if (isCheckIn) {
          const prevStatus = workerDoc.availability_status || 'Unavailable';
          workerDoc.availability_status = 'Available';
          workerDoc.check_in_time = new Date();
          workerDoc.availability_reason = 'Worker checked in via WhatsApp message.';
          if (!workerDoc.availability_history) workerDoc.availability_history = [];
          workerDoc.availability_history.push({
            previous_status: prevStatus,
            new_status: 'Available',
            changed_by: 'AI',
            timestamp: new Date(),
            reason: 'Worker checked in via WhatsApp message.'
          });
          await workerDoc.save();

          await loggingService.logActivity(senderUsername, 'Worker Checked In', `Worker ${workerDoc.name} checked in via WhatsApp message.`);

          // Emit live status update
          if (io) {
            io.emit('task:updated', { type: 'worker_check_in', workerId: workerDoc._id.toString() });
            io.emit('message:received', { type: 'workers_refresh' });
          }

          try {
            await whatsAppService.sendMessage(senderPhone, `Hello ${workerDoc.name}, you have successfully checked in for today and are marked as Available.`);
          } catch (waErr: any) {
            logger.error(`Failed to send check-in confirmation to ${senderPhone}: ${waErr.message}`);
          }

          logDoc.processing_status = 'completed';
          logDoc.delivery_status = 'processed';
          await logDoc.save();
          this.emitSocketUpdate(io, logDoc);
          return;
        }

        if (isCheckOut) {
          const prevStatus = workerDoc.availability_status || 'Unavailable';
          workerDoc.availability_status = 'Unavailable';
          workerDoc.check_out_time = new Date();
          workerDoc.availability_reason = 'Worker checked out via WhatsApp message.';
          if (!workerDoc.availability_history) workerDoc.availability_history = [];
          workerDoc.availability_history.push({
            previous_status: prevStatus,
            new_status: 'Unavailable',
            changed_by: 'AI',
            timestamp: new Date(),
            reason: 'Worker checked out via WhatsApp message.'
          });
          await workerDoc.save();

          await loggingService.logActivity(senderUsername, 'Worker Checked Out', `Worker ${workerDoc.name} checked out via WhatsApp message.`);

          // Emit live status update
          if (io) {
            io.emit('task:updated', { type: 'worker_check_out', workerId: workerDoc._id.toString() });
            io.emit('message:received', { type: 'workers_refresh' });
          }

          try {
            await whatsAppService.sendMessage(senderPhone, `Hello ${workerDoc.name}, you have checked out for today. Your status is now Unavailable. Have a great evening!`);
          } catch (waErr: any) {
            logger.error(`Failed to send check-out confirmation to ${senderPhone}: ${waErr.message}`);
          }

          logDoc.processing_status = 'completed';
          logDoc.delivery_status = 'processed';
          await logDoc.save();
          this.emitSocketUpdate(io, logDoc);
          return;
        }

        // --- WORKER REPLY FLOW ---
        const recentMessages = await MessageLogModel.find({
          $or: [{ sender: senderPhone }, { receiver: senderPhone }]
        })
        .sort({ timestamp: -1 })
        .limit(15)
        .lean();
        
        const formattedHistory = recentMessages
          .reverse()
          .map(m => `${m.direction === 'incoming' ? 'Worker' : 'System'}: ${m.message}`)
          .join('\n');

        // Tasks are already loaded and in-scope from the top of the Worker role check block.

        // Parse Task ID
        const taskIdRegex = /\b(\d{8}T\d+)\b/i;
        const match = extractedText.match(taskIdRegex);
        const matchedTaskId = match ? match[1].toUpperCase() : null;

        // Link pending proof of work if exists
        const pendingProof = (workerDoc as any).pending_proof;
        if (pendingProof && pendingProof.media_url && matchedTaskId) {
          const cleanSenderPhone = senderPhone.replace('+', '').trim();
          const targetTask = await TaskModel.findOne({
            taskId: matchedTaskId,
            $or: [
              { worker_phone: senderPhone },
              { worker_phone: cleanSenderPhone },
              { worker_phone: `+${cleanSenderPhone}` }
            ]
          });

          if (targetTask) {
            // Rename file to associate it with task ID
            let localMediaUrl = pendingProof.media_url;
            let filename = pendingProof.file_name;
            try {
              const uploadsDir = path.join(process.cwd(), 'uploads');
              const oldFilename = pendingProof.media_url.split('/').pop();
              if (oldFilename && fs.existsSync(path.join(uploadsDir, oldFilename))) {
                const ext = oldFilename.split('.').pop() || 'bin';
                const newFilename = `${targetTask.taskId || targetTask._id}_proof_${Date.now()}.${ext}`;
                fs.renameSync(path.join(uploadsDir, oldFilename), path.join(uploadsDir, newFilename));
                localMediaUrl = `http://localhost:5000/uploads/${newFilename}`;
                filename = newFilename;
              }
            } catch (renameErr: any) {
              logger.warn(`Failed to rename pending proof file: ${renameErr.message}`);
            }

            // Append proof to matched task
            if (!targetTask.proof_of_work) targetTask.proof_of_work = [] as any;
            targetTask.proof_of_work.push({
              media_url: localMediaUrl,
              media_type: pendingProof.media_type,
              file_name: pendingProof.file_name,
              uploaded_by: workerDoc.name,
              uploaded_at: pendingProof.uploaded_at || new Date(),
              status: 'Pending',
              review_notes: '',
              approval_history: []
            });
            await targetTask.save();

            // Clear pending proof from worker Doc
            workerDoc.set('pending_proof', undefined);
            await workerDoc.save();

            // Create Notification
            const { NotificationModel } = require('../models/Notification');
            const notification = await NotificationModel.create({
              title: 'Proof Uploaded',
              description: `${workerDoc.name} uploaded proof of work for task ${targetTask.taskId || targetTask._id}.`,
              type: 'Proof Uploaded',
              related_task: targetTask._id,
              related_worker: workerDoc._id,
              read_status: 'Unread',
              timestamp: new Date()
            });

            // Log Activity
            await loggingService.logActivity(
              senderUsername,
              'Proof Uploaded',
              `Worker ${workerDoc.name} linked proof of work file "${pendingProof.file_name}" to task ${targetTask.taskId || targetTask._id}.`
            );

            // Emit Socket.IO event
            if (io) {
              io.emit('task:updated', { id: targetTask._id.toString() });
              io.emit('notification:received', notification);
            }

            await whatsAppService.sendMessage(
              senderPhone,
              `Successfully linked proof of work to Task ${targetTask.taskId || targetTask._id}. Admin/Owner will review.`
            );

            // If the task was already Completed or Closed, exit immediately
            if (['Completed', 'Closed'].includes(targetTask.task_status)) {
              logDoc.processing_status = 'completed';
              logDoc.delivery_status = 'processed';
              await logDoc.save();
              this.emitSocketUpdate(io, logDoc);
              return;
            }
          }
        }

        // Check if the current message is JUST the Task ID
        let textToClassify = extractedText;
        const isJustTaskId = /^\d{8}T\d+$/i.test(extractedText.trim());
        if (isJustTaskId) {
          const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
          const lastIncomingMessages = await MessageLogModel.find({
            sender: senderPhone,
            direction: 'incoming',
            type: 'text',
            timestamp: { $gte: fifteenMinsAgo },
            message: { $ne: extractedText }
          })
          .sort({ timestamp: -1 })
          .limit(5);

          const intentMsg = lastIncomingMessages.find(m => {
            const msgText = m.message || '';
            const isTaskID = /^\d{8}T\d+$/i.test(msgText.trim());
            const hasLetters = /[a-zA-Z]+/.test(msgText);
            return hasLetters && !isTaskID;
          });

          if (intentMsg && intentMsg.message) {
            textToClassify = `${intentMsg.message} ${extractedText}`;
            logger.info(`WebhookService: Combined current Task ID message with previous message from last 5: "${textToClassify}"`);
          }
        }

        // 1. Determine if the worker is asking a question or updating status
        logDoc.processing_status = 'ai_processing';
        await logDoc.save();
        this.emitSocketUpdate(io, logDoc);

        const questionCheckPrompt = `You are an AI assistant for Setu AI.
Worker message: "${textToClassify}"

Classify this message into one of these categories:
1. QUESTION: The worker is asking a question, requesting task details, or requesting information (e.g., "I forgot the address", "What is the phone number?", "explain the work", "where is the location?", "what to do?").
2. UPDATE: The worker is reporting status, acknowledging assignment, or giving an update (e.g., "I am starting now", "completed", "done", "got it", "repaired", "ok").

Output exactly one word: QUESTION or UPDATE. Do not include any other text.`;

        let isQuestion = false;
        try {
          const aiClassified = await aiService.generate(questionCheckPrompt, `Classify type: ${textToClassify}`, aiProvider, classificationModel);
          if (aiClassified.trim().toUpperCase().includes('QUESTION')) {
            isQuestion = true;
          }
        } catch (aiErr: any) {
          logger.error(`Failed to classify message type: ${aiErr.message}`);
        }

        // --- RULE 5: FOLLOW-UP QUESTIONS HANDLING ---
        if (isQuestion) {
          let selectedTask = null;
          if (matchedTaskId) {
            selectedTask = allTasks.find(t => t.taskId === matchedTaskId);
          } else if (allTasks.length === 1) {
            selectedTask = allTasks[0];
          }

          if (matchedTaskId && !selectedTask) {
            await whatsAppService.sendMessage(senderPhone, "I could not find the task with the provided ID. Please double check the ID or contact the Owner directly.");
          } else if (!matchedTaskId && allTasks.length > 1) {
            const multipleTasksReply = `I found multiple tasks associated with your account.

Please reply with the Task ID you are referring to.

Example:
${allTasks[0].taskId || '03082026T4'} Completed`;
            await whatsAppService.sendMessage(senderPhone, multipleTasksReply);
          } else if (!selectedTask && allTasks.length === 0) {
            await whatsAppService.sendMessage(senderPhone, "You currently have no active tasks.\n\nPlease contact the Owner if you need assistance regarding any previous task.");
          } else if (selectedTask) {
            if (['Completed', 'Closed'].includes(selectedTask.task_status)) {
              await whatsAppService.sendMessage(senderPhone, "This task has already been completed/closed.\n\nPlease contact the Owner directly for any further information.");
            } else {
              await whatsAppService.sendMessage(senderPhone, "Please contact the Owner directly for additional task details.");
            }
          }

          logDoc.processing_status = 'completed';
          logDoc.delivery_status = 'processed';
          await logDoc.save();
          this.emitSocketUpdate(io, logDoc);
          return;
        }

        // --- STATUS UPDATES HANDLING ---
        let selectedTask: any = null;
        let requiresTaskIdResponse = false;

        if (matchedTaskId) {
          const cleanSenderPhone = senderPhone.replace('+', '').trim();
          selectedTask = await TaskModel.findOne({
            taskId: matchedTaskId,
            $or: [
              { worker_phone: senderPhone },
              { worker_phone: cleanSenderPhone },
              { worker_phone: `+${cleanSenderPhone}` }
            ]
          });
          if (!selectedTask) {
            requiresTaskIdResponse = true;
          } else if (['Completed', 'Closed'].includes(selectedTask.task_status)) {
            // Rule 3: Task is Completed/Closed
            await whatsAppService.sendMessage(senderPhone, "This task has already been completed/closed.\n\nPlease contact the Owner directly if you need further clarification.");
            logDoc.processing_status = 'completed';
            logDoc.delivery_status = 'processed';
            await logDoc.save();
            this.emitSocketUpdate(io, logDoc);
            return;
          }
        } else {
          // No Task ID provided
          if (activeTasks.length === 0) {
            // Rule 4: No active tasks
            await whatsAppService.sendMessage(senderPhone, "You currently have no active tasks.\n\nPlease contact the Owner if you need assistance regarding any previous task.");
            logDoc.processing_status = 'completed';
            logDoc.delivery_status = 'processed';
            await logDoc.save();
            this.emitSocketUpdate(io, logDoc);
            return;
          } else if (allTasks.length > 1) {
            // Rule 2: Multiple tasks exist
            requiresTaskIdResponse = true;
          } else if (allTasks.length === 1) {
            // Exactly one task
            selectedTask = allTasks[0];
            if (selectedTask.task_status !== 'Open') {
              // Rule 1: Single task must be Open to auto-update
              requiresTaskIdResponse = true;
            }
          }
        }

        if (requiresTaskIdResponse) {
          const defaultEx = allTasks.length > 0 ? (allTasks[0].taskId || '03082026T4') : '03082026T4';
          const multipleTasksReply = `I found multiple tasks associated with your account.

Please reply with the Task ID you are referring to.

Example:
${defaultEx} Completed`;

          await whatsAppService.sendMessage(senderPhone, multipleTasksReply);
          logDoc.processing_status = 'completed';
          logDoc.delivery_status = 'processed';
          await logDoc.save();
          this.emitSocketUpdate(io, logDoc);
          return;
        }

        // Link message log to task
        incomingMsgLog.task_id = selectedTask._id;
        await incomingMsgLog.save();

        // Perform classification and status updates
        const classificationPrompt = `You are a reply status classifier for Setu AI.
Classify the worker's reply into exactly one of these task statuses:
1. Started: Acknowledged, started, on the way, okay, ok, working, in progress (e.g. "got it", "repaired started", "working on it").
2. Completed: Done, finished, repaired, fixed, completed (e.g. "finished the work", "repaired successfully", "done").
3. More Details Asked: Asking for address, location, phone, details, or questions (e.g. "which shop?", "send customer number", "address?").

Worker message: "${textToClassify}"

Output exactly one of the words: Started, Completed, or More Details Asked. Do not output anything else.`;

        let classifiedStatus = 'Started';
        try {
          const aiClassified = await aiService.generate(classificationPrompt, `Classify reply: ${textToClassify}`, aiProvider, classificationModel);
          const cleanedClassified = aiClassified.trim();
          
          if (cleanedClassified.includes('Completed')) {
            classifiedStatus = 'Completed';
          } else if (cleanedClassified.includes('More Details Asked') || cleanedClassified.includes('Details')) {
            classifiedStatus = 'More Details Asked';
          } else {
            classifiedStatus = 'Started';
          }
          await loggingService.logActivity(senderUsername, 'AI Completed', `Classified worker reply as "${classifiedStatus}".`);
        } catch (classErr: any) {
          await loggingService.logActivity(senderUsername, 'AI Failure', `Classification AI failed: ${classErr.message}. Defaulting to "Started".`);
          classifiedStatus = 'Started';
        }

        // Update task status
        const previousStatus = selectedTask.task_status;
        selectedTask.task_status = classifiedStatus;
        selectedTask.last_worker_reply = extractedText;
        selectedTask.processing_status = 'success';

        if (classifiedStatus === 'Started' && !selectedTask.started_time) {
          selectedTask.started_time = new Date();
        }
        if (classifiedStatus === 'Completed' && !selectedTask.completed_time) {
          selectedTask.completed_time = new Date();
        }

        await selectedTask.save();
        await loggingService.logActivity(senderUsername, 'Task Updated', `Task ${selectedTask.taskId || selectedTask._id} status transitioned from ${previousStatus} to ${classifiedStatus}.`);

        // Notify worker about the status transition
        try {
          let statusConfirmMsg = '';
          if (classifiedStatus === 'Completed') {
            statusConfirmMsg = `Thank you. Task ${selectedTask.taskId || selectedTask._id} has been marked as Completed. Admin/Owner will review.`;
          } else if (classifiedStatus === 'Started') {
            statusConfirmMsg = `Task ${selectedTask.taskId || selectedTask._id} has been marked as Started.`;
          }
          if (statusConfirmMsg) {
            await whatsAppService.sendMessage(senderPhone, statusConfirmMsg);
          }
        } catch (waErr: any) {
          logger.error(`Failed to send status update confirmation to worker: ${waErr.message}`);
        }

        // Cancel smart reminders if status is Completed
        if (classifiedStatus === 'Completed') {
          try {
            ReminderService.cancelTaskReminders(selectedTask._id.toString());
          } catch (reminderErr: any) {
            logger.error(`Failed to cancel reminders on worker completion: ${reminderErr.message}`);
          }
        }

        // Timeline Entry
        let timelineAction = 'Task Started';
        let timelineDesc = 'Worker reply indicates work has started.';
        if (classifiedStatus === 'Completed') {
          timelineAction = 'Task Completed';
          timelineDesc = 'Worker marked task as Completed.';
        } else if (classifiedStatus === 'More Details Asked') {
          timelineAction = 'More Details Asked';
          timelineDesc = 'Worker requested more details regarding this task.';
        }

        await TaskTimelineModel.create({
          task_id: selectedTask._id,
          action: timelineAction,
          description: timelineDesc,
          performed_by: senderByPhone.name,
        });

        // Broadcast Socket update
        if (io) {
          io.emit('task:updated', {
            id: selectedTask._id.toString(),
            taskId: selectedTask.taskId,
            worker_name: selectedTask.worker_name,
            task_msg: selectedTask.task_msg,
            task_status: selectedTask.task_status,
            timestamp: new Date().toISOString(),
          });
        }

        // Handle specific actions for "More Details Asked"
        if (classifiedStatus === 'More Details Asked') {
          try {
            const workerReplyTxt = "Please contact the Owner directly for more details regarding this task.";
            await whatsAppService.sendMessage(senderPhone, workerReplyTxt);
          } catch (waErr: any) {
            logger.error(`Failed to reply to worker: ${waErr.message}`);
          }

          const ownerPhoneNum = selectedTask.from_number;
          if (ownerPhoneNum) {
            try {
              const ownerNotifyTxt = `Worker ${senderByPhone.name} has requested more details for task: "${selectedTask.task_msg}".`;
              await whatsAppService.sendMessage(ownerPhoneNum, ownerNotifyTxt);
              await TaskTimelineModel.create({
                task_id: selectedTask._id,
                action: 'Owner Notified',
                description: `Notified owner ${ownerPhoneNum} that worker requested clarification.`,
                performed_by: 'System',
              });
            } catch (waErr: any) {
              logger.error(`Failed to notify owner: ${waErr.message}`);
            }
          }
        }

        logDoc.processing_status = 'completed';
        logDoc.delivery_status = 'processed';
        await logDoc.save();
        this.emitSocketUpdate(io, logDoc);

      } else {
        // --- OWNER / ADMIN FLOW ---
        // Classify if request is a Task Creation or a Dashboard Query
        logDoc.processing_status = 'ai_processing';
        await logDoc.save();
        this.emitSocketUpdate(io, logDoc);
        await loggingService.logActivity(senderUsername, 'AI Started', 'Classifying Owner request (TASK_CREATION vs QUERY).');

        const ownerTypePrompt = `You are a message classifier for Setu AI.
An Owner has sent a message. Classify if it is a task creation request or a status inquiry query:
- TASK_CREATION: The message assigns a new task to a worker or has instructions to create a task (e.g., "Assign Ramesh to fix the tap tomorrow", "Tell Suresh to clean the lobby").
- QUERY: The message is a question or request for information about tasks, workers, logs, or general status (e.g., "How many tasks are open?", "What is Suresh doing?", "Which workers are working?").

Output exactly one of the words: TASK_CREATION or QUERY. Do not output anything else.`;

        let ownerReqType = 'TASK_CREATION';
        try {
          const aiClassifiedType = await aiService.generate(ownerTypePrompt, `Classify owner message: ${extractedText}`, aiProvider, classificationModel);
          if (aiClassifiedType.trim().includes('QUERY')) {
            ownerReqType = 'QUERY';
          }
          await loggingService.logActivity(senderUsername, 'AI Completed', `Owner request classified as: ${ownerReqType}`);
        } catch (classErr: any) {
          await loggingService.logActivity(senderUsername, 'AI Failure', `Owner query classification failed: ${classErr.message}. Defaulting to TASK_CREATION.`);
          ownerReqType = 'TASK_CREATION';
        }

        if (ownerReqType === 'TASK_CREATION') {
          // Existing Phase 1 & 2 Task Assignment Extraction Flow
          const systemPrompt = `You are a strict task extraction assistant. 
Analyze the incoming message (which may be in English, Odia, or mixed prose) and extract all task assignments.
For each task, identify:
- worker_name: The name of the person assigned to the task (e.g., "Ramesh", "Suresh").
- task_msg: The description of what needs to be done.
- location: The location mentioned, or empty if not specified.
- deadline: The deadline mentioned, or empty if not specified.

You must output a valid JSON array containing one or more objects with the exact schema below. Do not include any markdown formatting wrappers (like \`\`\`json) or conversational explanations. Output ONLY the raw JSON array.

JSON Schema:
[
  {
    "from_number": "${senderPhone}",
    "worker_name": "Worker Name",
    "task_msg": "Task message",
    "location": "Location",
    "deadline": "Deadline"
  }
]`;

          let aiResultText = '';
          try {
            aiResultText = await aiService.generate(systemPrompt, extractedText, aiProvider, aiModel);
          } catch (aiErr: any) {
            await loggingService.logActivity(senderUsername, 'AI Failure', `Completions task extraction failed: ${aiErr.message}`);
            logDoc.processing_status = 'failed';
            await logDoc.save();
            this.emitSocketUpdate(io, logDoc);
            return;
          }

          const parsedTasks = cleanAndParseJSON(aiResultText);
          const tasks = Array.isArray(parsedTasks) ? parsedTasks : (parsedTasks ? [parsedTasks] : []);
          await loggingService.logActivity(senderUsername, 'AI Completed', `Extracted ${tasks.length} task objects from AI.`);

          if (tasks.length === 0) {
            logger.warn('processWebhook: No tasks extracted. Alerting Owner.');
            await whatsAppService.sendMessage(
              senderPhone,
              `Sorry, I could not confidently extract any tasks from your request. Could you please rephrase it?\n\nReceived: "${extractedText}"`
            );
            logDoc.processing_status = 'failed';
            await logDoc.save();
            this.emitSocketUpdate(io, logDoc);
            return;
          }

          const resultsSummary: string[] = [];
          let successCount = 0;

          for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            try {
              const outcome = await this.processSingleTaskAssignment(task, senderPhone, senderUsername, creds, io);
              resultsSummary.push(outcome.message);
              if (outcome.success) successCount++;
            } catch (taskErr: any) {
              logger.error(`Failed to assign task index ${i}: ${taskErr.message}`);
              resultsSummary.push(`❌ Failed to process assignment for "${task.worker_name || 'unknown'}": ${taskErr.message}`);
            }
          }

          const summaryMsg = `${resultsSummary.join('\n')}\n\nSuccessfully assigned ${successCount} out of ${tasks.length} tasks.`;
          await whatsAppService.sendMessage(senderPhone, summaryMsg);
          logger.info(`Owner confirmation sent to ${senderPhone}.`);

          logDoc.processing_status = 'completed';
          logDoc.delivery_status = 'processed';
          await logDoc.save();
          this.emitSocketUpdate(io, logDoc);

        } else {
          // --- OWNER AI ASSISTANT QUERY FLOW ---
          logDoc.processing_status = 'ai_processing';
          await logDoc.save();
          this.emitSocketUpdate(io, logDoc);

          const recentOwnerMessages = await MessageLogModel.find({
            $or: [{ sender: senderPhone }, { receiver: senderPhone }]
          })
          .sort({ timestamp: -1 })
          .limit(15)
          .lean();

          const { OwnerAIService } = require('./ai/OwnerAIService');
          const ownerAIService = new OwnerAIService();

          const finalResponse = await ownerAIService.chat(
            extractedText,
            recentOwnerMessages.reverse().map(m => ({
              role: m.direction === 'incoming' ? 'user' : 'assistant',
              content: m.message
            })),
            senderUsername
          );

          try {
            await whatsAppService.sendMessage(senderPhone, finalResponse);
            await loggingService.logActivity(senderUsername, 'WhatsApp Sent', `Query answer dispatched to owner.`);
          } catch (waErr: any) {
            await loggingService.logActivity(senderUsername, 'WhatsApp Failure', `Failed to send answer to owner: ${waErr.message}`);
          }

          logDoc.processing_status = 'completed';
          logDoc.delivery_status = 'processed';
          await logDoc.save();
          this.emitSocketUpdate(io, logDoc);
        }
      }

    } catch (err: any) {
      logger.error(`processWebhook: Fatal pipeline execution failure: ${err.message}`);
      if (logDoc) {
        logDoc.processing_status = 'failed';
        await logDoc.save();
        this.emitSocketUpdate(io, logDoc);
      }
      // Create operational bell notification
      try {
        const { NotificationModel } = require('../models/Notification');
        const notification = await NotificationModel.create({
          title: 'System Alert: API Transmission Failure',
          description: `Fatal webhook processing or transmission failure: ${err.message}`,
          type: 'API Alert',
          read_status: 'Unread',
          timestamp: new Date()
        });
        if (io) {
          io.emit('notification:received', notification);
        }
      } catch (notifErr: any) {
        logger.error(`Failed to create failure notification: ${notifErr.message}`);
      }
      // Create Activity Log for failure
      await loggingService.logActivity(
        'system',
        'Webhook Failure',
        `Fatal webhook error: ${err.message}`
      ).catch(e => logger.error(`Failed to log activity: ${e.message}`));
    }
  }

  /**
   * Helper to process a single task assignment safely in isolation
   */
  private async processSingleTaskAssignment(
    task: any,
    ownerPhone: string,
    ownerUsername: string,
    creds: any,
    io: any
  ): Promise<{ success: boolean; message: string }> {
    const workerNameInput = task.worker_name || '';

    // 1. Worker Lookup
    const worker = await UserModel.findOne({
      name: { $regex: new RegExp(`^${workerNameInput}$`, 'i') },
      role: 'Worker',
    });

    if (!worker) {
      await loggingService.logActivity(ownerUsername, 'Worker Not Found', `Lookup failed for worker name: "${workerNameInput}".`);
      return { success: false, message: `❌ Worker "${workerNameInput}" not found.` };
    }

    if ((worker as any).worker_status === 'Disabled') {
      await loggingService.logActivity(ownerUsername, 'Worker Disabled', `Cannot assign task to disabled worker "${workerNameInput}".`);
      return { success: false, message: `❌ Worker "${worker.name}" is currently disabled.` };
    }

    const workerId = worker._id.toString();
    const workerPhone = worker.phone;
    const workerName = worker.name;

    await loggingService.logActivity(ownerUsername, 'Worker Found', `Verified worker "${workerName}" (${workerPhone}).`);

    // 2. Calculations (deadline & reminder offset)
    const deadlineDate = parseNaturalLanguageDate(task.deadline);
    const deadlineExact = !!task.deadline_exact;
    const reminderOffsetMins = creds.settings.reminderOffset || 120;
    const reminderTime = new Date(deadlineDate.getTime() - reminderOffsetMins * 60 * 1000);

    // Generate Task ID
    const { TaskService } = require('./TaskService');
    const taskServiceInstance = new TaskService();
    const taskIdGenerated = await taskServiceInstance.generateNextTaskId();

    // 3. Create Task record in database
    const createdTask = await TaskModel.create({
      worker_name: workerName,
      task_msg: task.task_msg,
      location: task.location || '',
      deadline: deadlineDate,
      deadline_exact: deadlineExact,
      task_status: 'Open',
      timestamp: new Date(),
      from_number: ownerPhone,
      worker_id: workerId,
      worker_phone: workerPhone,
      reminder_time: reminderTime,
      reminder_sent: false,
      message_id: '',
      taskId: taskIdGenerated,
      
      // Phase 3 properties
      owner_name: ownerUsername,
      owner_phone: ownerPhone,
      priority: task.priority || 'Medium',
      processing_status: 'success'
    });

    await loggingService.logActivity(ownerUsername, 'Task Created', `Task created in MongoDB with ID ${createdTask.taskId || createdTask._id}.`);

    // 4. Log timeline audits
    await TaskTimelineModel.create({
      task_id: createdTask._id,
      action: 'Task Created',
      description: 'Task initially extracted and stored.',
      performed_by: ownerUsername,
    });

    await TaskTimelineModel.create({
      task_id: createdTask._id,
      action: 'Task Assigned',
      description: `Task assigned to worker ${workerName}.`,
      performed_by: ownerUsername,
    });

    // 5. Send Templated WhatsApp to Worker
    const isWorkerUnavailable = worker.availability_status === 'Unavailable';

    let defaultTemplate = 'Task ID: *```{{task_id}}```*\n\nHello {{worker_name}},\n\nYou have been assigned a new task.\n\nTask:\n{{task_msg}}\n\nLocation:\n{{location}}\n\nDeadline:\n{{deadline}}\n\nPlease reply using the Task ID.\n\nExamples:\n{{task_id}} Started\n{{task_id}} Completed\n{{task_id}} Need more details';
    let dispatchMsg = creds.settings.taskAssignmentTemplate || defaultTemplate;
    dispatchMsg = dispatchMsg.replace(/{{task_id}}/g, taskIdGenerated);
    dispatchMsg = dispatchMsg.replace(/{{worker_name}}/g, workerName);
    dispatchMsg = dispatchMsg.replace(/{{task_msg}}/g, task.task_msg);
    dispatchMsg = dispatchMsg.replace(/{{location}}/g, task.location || 'N/A');
    dispatchMsg = dispatchMsg.replace(/{{deadline}}/g, deadlineDate.toLocaleString('en-IN', { timeZone: creds.settings.timezone || 'Asia/Kolkata' }));
    dispatchMsg = dispatchMsg.replace(/{{company_name}}/g, creds.settings.businessName || 'Setu AI by DotnLott');
    dispatchMsg = dispatchMsg.replace(/{{instructions}}/g, 'Please reply using the Task ID.');

    // Ensure it begins with Task ID
    if (!dispatchMsg.startsWith('Task ID:')) {
      dispatchMsg = `Task ID: *${'```'}${taskIdGenerated}${'```'}*\n\n${dispatchMsg}`;
    }

    if (isWorkerUnavailable) {
      dispatchMsg += '\n\n⚠️ Our records indicate that you are currently marked as unavailable.\n\nIf you are available to perform this task, simply reply and continue as normal.\n\nIf you are unavailable today, please contact the Owner immediately.';
    }

    let finalMessageId = `out_${Date.now()}`;
    try {
      const metaRes = await whatsAppService.sendMessage(workerPhone, dispatchMsg);
      if (metaRes && metaRes.messages?.[0]?.id) {
        finalMessageId = metaRes.messages[0].id;
      }
      
      // Update task message_id
      createdTask.message_id = finalMessageId;
      await createdTask.save();

      await loggingService.logActivity(ownerUsername, 'WhatsApp Sent', `Task notification dispatched to ${workerPhone}.`);

      // Notify Owner if worker is unavailable
      if (isWorkerUnavailable && ownerPhone) {
        const ownerAlertMsg = `⚠️ Worker Availability Alert\n\nTask ID: ${taskIdGenerated}\n\nWorker: ${workerName}\n\nThe assigned worker is currently marked as unavailable.\n\nThe task has still been assigned, and a notification has been sent to the worker informing them of their unavailable status.\n\nIf required, please contact the worker directly or reassign the task.`;
        try {
          await whatsAppService.sendMessage(ownerPhone, ownerAlertMsg);
          logger.info(`Dispatched worker unavailability alert to Owner ${ownerPhone}`);
        } catch (ownerAlertErr: any) {
          logger.error(`Failed to dispatch availability alert to owner: ${ownerAlertErr.message}`);
        }
      }

      // Start smart reminder scheduling
      try {
        await ReminderService.scheduleTaskReminders(createdTask);
      } catch (remErr: any) {
        logger.error(`Failed to schedule task reminders: ${remErr.message}`);
      }
    } catch (sendErr: any) {
      await loggingService.logActivity(ownerUsername, 'WhatsApp Failure', `Failed to dispatch WhatsApp notify: ${sendErr.message}`);
      throw sendErr;
    }

    // 6. Broadcast live update events
    if (io) {
      io.emit('task:created', {
        id: createdTask._id.toString(),
        taskId: createdTask.taskId,
        worker_name: createdTask.worker_name,
        task_msg: createdTask.task_msg,
        task_status: createdTask.task_status,
        timestamp: createdTask.timestamp.toISOString(),
      });
      
      io.emit('message:sent', {
        message_id: finalMessageId,
        sender: 'system',
        receiver: workerPhone,
        message: dispatchMsg,
        timestamp: new Date().toISOString(),
      });
    }

    return { success: true, message: `✅ Task assigned to ${workerName}.` };
  }

  private emitSocketUpdate(io: any, logDoc: any) {
    if (io && logDoc) {
      io.emit('webhook:received', {
        id: logDoc._id.toString(),
        sender_name: logDoc.sender_name,
        sender_phone: logDoc.sender_phone,
        message_id: logDoc.message_id,
        message_type: logDoc.message_type,
        direction: logDoc.direction,
        delivery_status: logDoc.delivery_status,
        timestamp: logDoc.timestamp.toISOString(),
        processing_status: logDoc.processing_status,
        payload: logDoc.payload,
      });
    }
  }
}

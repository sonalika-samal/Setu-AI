export interface User {
  id?: string;
  name: string;
  phone: string;
  email: string;
  role: 'Admin' | 'Owner';
  createdAt?: string;
  updatedAt?: string;
}

export interface Task {
  id?: string;
  workerId?: string;
  workerName?: string;
  workerPhone?: string;
  assignedBy: string;
  assignedPhone: string;
  taskMessage: string;
  location?: string;
  deadline?: string;
  deadlineExact?: boolean;
  reminderTime?: string;
  reminderSent?: boolean;
  status: 'Pending' | 'In Progress' | 'Completed';
  createdAt?: string;
  updatedAt?: string;
}

export interface WebhookLog {
  id?: string;
  payload: any;
  type: string;
  timestamp: string;
}

export interface AILog {
  id?: string;
  prompt: string;
  response: string;
  model: string;
  executionTime: number;
  timestamp: string;
}

export interface Settings {
  timezone: string;
  language: string;
  reminderOffset: number; // in minutes
  businessName: string;
}

export interface MetaCredentials {
  accessToken: string;
  phoneNumberId: string;
  wabaId: string;
  appId: string;
  appSecret: string;
  verifyToken: string;
}

export interface MongoCredentials {
  connectionUri: string;
  dbName: string;
}

export interface SarvamCredentials {
  apiKey: string;
  speechModel: string;
  taskExtractionModel: string;
  classificationModel: string;
}

export interface AppCredentials {
  meta: MetaCredentials;
  mongo: MongoCredentials;
  sarvam: SarvamCredentials;
  settings: Settings;
}

import mongoose from 'mongoose';
import { CredentialRepository, AppCredentials } from '../repositories/CredentialRepository';
import { logger } from '../utils/logger';

export class CredentialService {
  private credentialRepo = new CredentialRepository();

  async getCredentials(orgId: string = 'default'): Promise<AppCredentials> {
    return this.credentialRepo.getCredentials(orgId);
  }

  async updateCredentials(data: AppCredentials, orgId: string = 'default'): Promise<AppCredentials> {
    logger.info(`Updating application credentials for org: ${orgId}.`);
    return this.credentialRepo.updateCredentials(data, orgId);
  }

  async getDatabaseStatus() {
    const states = ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'];
    const stateVal = mongoose.connection.readyState;
    const status = states[stateVal] || 'Unknown';

    return {
      dbName: mongoose.connection.name || 'n8ndb',
      dbStatus: status,
      connectionStatus: stateVal === 1 ? 'Healthy' : 'Degraded',
    };
  }
}

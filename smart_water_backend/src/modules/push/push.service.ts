import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as fs from 'fs';
import * as nodePath from 'path';
import * as admin from 'firebase-admin';
import { PushToken } from './schemas/push-token.entity';

export type PushSendInput = {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
};

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private firebaseApp?: admin.app.App;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(PushToken) private readonly pushTokenRepo: Repository<PushToken>
  ) {}

  async registerToken(input: {
    userId: string;
    token: string;
    platform: 'android' | 'ios' | 'web';
    deviceId?: string;
  }) {
    const now = new Date();
    await this.pushTokenRepo.upsert(
      {
        token: input.token,
        platform: input.platform,
        userId: input.userId,
        deviceId: input.deviceId ?? null,
        enabled: true,
        lastSeenAt: now
      } as PushToken,
      { conflictPaths: ['token'] }
    );

    return { message: 'Push token registered' };
  }

  async unregisterToken(input: { userId: string; token: string }) {
    await this.pushTokenRepo.delete({ token: input.token, userId: input.userId });
    return { message: 'Push token unregistered' };
  }

  async sendToUsers(input: PushSendInput) {
    const tokens = await this.getEnabledTokens(input.userIds);
    if (tokens.length === 0) return { ok: true, sent: 0, reason: 'no_tokens' };

    const messaging = this.getMessagingOrNull();
    if (!messaging) {
      this.logger.warn(
        'FCM not configured; skipping push send (set FCM_SERVICE_ACCOUNT_JSON or FCM_SERVICE_ACCOUNT_PATH).'
      );
      return { ok: false, sent: 0, reason: 'fcm_not_configured' };
    }

    const res = await messaging.sendEachForMulticast({
      tokens,
      notification: { title: input.title, body: input.body },
      data: input.data ?? {},
      android: { priority: 'high' }
    });

    const invalidTokens: string[] = [];
    res.responses.forEach((r, idx) => {
      if (r.success) return;
      const code = (r.error as any)?.errorInfo?.code as string | undefined;
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        invalidTokens.push(tokens[idx]);
      }
    });
    if (invalidTokens.length) {
      await this.pushTokenRepo.update({ token: In(invalidTokens) }, { enabled: false });
    }

    return { ok: true, sent: res.successCount, failed: res.failureCount };
  }

  private async getEnabledTokens(userIds: string[]) {
    const rows = await this.pushTokenRepo.find({
      where: { userId: In(userIds), enabled: true },
      select: ['token']
    });
    return [...new Set(rows.map((r) => String(r.token)).filter(Boolean))];
  }

  private getMessagingOrNull() {
    const app = this.getFirebaseAppOrNull();
    if (!app) return null;
    return admin.messaging(app);
  }

  private getFirebaseAppOrNull() {
    if (this.firebaseApp) return this.firebaseApp;

    const json = this.config.get<string>('FCM_SERVICE_ACCOUNT_JSON');
    const pathFromEnv = this.config.get<string>('FCM_SERVICE_ACCOUNT_PATH');

    let creds: admin.ServiceAccount | undefined;
    if (json) {
      try {
        creds = JSON.parse(json);
      } catch {
        this.logger.error('FCM_SERVICE_ACCOUNT_JSON is not valid JSON');
        return null;
      }
    } else if (pathFromEnv) {
      try {
        const raw = fs.readFileSync(pathFromEnv, 'utf8');
        creds = JSON.parse(raw);
      } catch (e) {
        this.logger.error(
          `Failed to read FCM service account from path: ${pathFromEnv}`,
          e instanceof Error ? e.message : String(e)
        );
        return null;
      }
    } else {
      const candidates = [
        nodePath.join(process.cwd(), 'firebase-service-account.json'),
        nodePath.join(process.cwd(), 'service-account.json')
      ];

      const found = candidates.find((p) => {
        try {
          return fs.existsSync(p);
        } catch {
          return false;
        }
      });

      if (!found) return null;

      try {
        const raw = fs.readFileSync(found, 'utf8');
        creds = JSON.parse(raw);
        this.logger.log(`Loaded FCM service account from file: ${found}`);
      } catch (e) {
        this.logger.error(
          `Failed to read FCM service account from file: ${found}`,
          e instanceof Error ? e.message : String(e)
        );
        return null;
      }
    }

    try {
      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(creds as admin.ServiceAccount)
      });
      return this.firebaseApp;
    } catch (e) {
      try {
        this.firebaseApp = admin.app();
        return this.firebaseApp;
      } catch {
        this.logger.error('Failed to initialize firebase-admin', e as any);
        return null;
      }
    }
  }
}

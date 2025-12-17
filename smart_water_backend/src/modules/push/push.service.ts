import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs';
import * as nodePath from 'path';
import * as admin from 'firebase-admin';
import { PushToken } from './schemas/push-token.schema';

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
    @InjectModel(PushToken.name) private readonly pushTokenModel: Model<PushToken>
  ) {}

  async registerToken(input: {
    userId: string;
    token: string;
    platform: 'android' | 'ios' | 'web';
    deviceId?: string;
  }) {
    const now = new Date();
    await this.pushTokenModel
      .findOneAndUpdate(
        { token: input.token },
        {
          $set: {
            token: input.token,
            platform: input.platform,
            userId: input.userId,
            deviceId: input.deviceId,
            enabled: true,
            lastSeenAt: now
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
      .lean();

    return { message: 'Push token registered' };
  }

  async unregisterToken(input: { userId: string; token: string }) {
    await this.pushTokenModel.deleteOne({ token: input.token, userId: input.userId });
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

    // Send as a "notification + data" message so Android can deliver even when app is killed.
    const res = await messaging.sendEachForMulticast({
      tokens,
      notification: { title: input.title, body: input.body },
      data: input.data ?? {},
      android: { priority: 'high' }
    });

    // Disable invalid tokens to keep DB clean
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
      await this.pushTokenModel.updateMany(
        { token: { $in: invalidTokens } },
        { $set: { enabled: false } }
      );
    }

    return { ok: true, sent: res.successCount, failed: res.failureCount };
  }

  private async getEnabledTokens(userIds: string[]) {
    const rows = await this.pushTokenModel
      .find({ userId: { $in: userIds }, enabled: true })
      .select({ token: 1 })
      .lean();
    return [...new Set(rows.map((r: any) => String(r.token)).filter(Boolean))];
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
      // No env configuration: try repo-local files (static setup)
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
      // If hot-reload initializes twice, reuse default app
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



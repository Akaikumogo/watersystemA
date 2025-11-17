import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Device } from './schemas/device.schema';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true
  },
  namespace: '/devices'
})
export class DevicesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(DevicesGateway.name);
  private connectedClients = new Map<string, Socket>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Get token from handshake auth or query
      const token = client.handshake.auth?.token || client.handshake.query?.token;

      if (!token || typeof token !== 'string') {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token, {
        secret: this.config.get<string>('JWT_SECRET')
      });

      // Store client with user info
      (client as any).userId = payload.sub;
      (client as any).username = payload.username;
      this.connectedClients.set(client.id, client);

      this.logger.log(`Client ${client.id} connected (user: ${payload.username})`);
      client.emit('connected', { message: 'Connected to WebSocket server' });
    } catch (error) {
      this.logger.warn(`Client ${client.id} authentication failed: ${error}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client ${client.id} disconnected`);
  }

  // Emit device update to all connected clients
  emitDeviceUpdate(device: Device) {
    this.server.emit('device:update', device);
    this.logger.debug(`Device update emitted: ${device._id}`);
  }

  // Emit device status change
  emitDeviceStatus(deviceId: string, status: 'ONLINE' | 'OFFLINE') {
    this.server.emit('device:status', { deviceId, status });
    this.logger.debug(`Device status emitted: ${deviceId} - ${status}`);
  }

  // Emit to specific user's devices
  emitToUser(userId: string, event: string, data: any) {
    for (const [clientId, client] of this.connectedClients.entries()) {
      if ((client as any).userId === userId) {
        client.emit(event, data);
      }
    }
  }

  // Subscribe to device updates
  @SubscribeMessage('subscribe:device')
  handleSubscribeDevice(@ConnectedSocket() client: Socket, deviceId: string) {
    client.join(`device:${deviceId}`);
    this.logger.log(`Client ${client.id} subscribed to device ${deviceId}`);
    return { message: `Subscribed to device ${deviceId}` };
  }

  // Unsubscribe from device updates
  @SubscribeMessage('unsubscribe:device')
  handleUnsubscribeDevice(@ConnectedSocket() client: Socket, deviceId: string) {
    client.leave(`device:${deviceId}`);
    this.logger.log(`Client ${client.id} unsubscribed from device ${deviceId}`);
    return { message: `Unsubscribed from device ${deviceId}` };
  }
}


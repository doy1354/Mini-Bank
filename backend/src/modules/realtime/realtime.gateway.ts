import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class RealtimeGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwt: JwtService) {}

  async handleConnection(client: Socket) {
    const auth = client.handshake.headers.authorization;
    const token = typeof auth === 'string' && auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const payload: any = await this.jwt.verifyAsync(token);
      const userId = payload?.sub;
      if (!userId) {
        client.disconnect(true);
        return;
      }
      client.join(`user:${userId}`);
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('ping')
  ping(@ConnectedSocket() client: Socket, @MessageBody() _body: any) {
    client.emit('pong', { ok: true });
  }

  notifyUser(userId: string, event: string, payload: any) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }
}



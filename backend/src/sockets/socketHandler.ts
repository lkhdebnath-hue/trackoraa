import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'trackora_jwt_secret_key_change_in_production_12345';

// Map to track active online users: userId -> Set of socketIds
export const onlineUsers = new Map<string, Set<string>>();

export const setupSocketHandler = (io: Server) => {
  // Middleware to authenticate socket connections
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
      if (!token) {
        return next(new Error('Authentication error. No token provided.'));
      }

      // Handle bearer prefix if present
      const cleanToken = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
      
      const decoded = jwt.verify(cleanToken, JWT_SECRET) as { id: string };
      const user = await User.findById(decoded.id).select('username role');
      
      if (!user) {
        return next(new Error('User not found.'));
      }

      socket.data.user = user;
      next();
    } catch (err) {
      console.error('Socket authentication failed:', err);
      next(new Error('Authentication error.'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;
    const userId = user._id.toString();

    console.log(`User connected: ${user.username} (${userId})`);

    // Track online user sockets
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    // Broadcast updated online count
    io.emit('online_users_count', { count: onlineUsers.size });

    // Join user personal channel
    socket.join(userId);

    // Join specific chat group room
    socket.on('join_room', (groupId: string) => {
      socket.join(groupId);
      console.log(`${user.username} joined room: ${groupId}`);
    });

    // Leave chat group room
    socket.on('leave_room', (groupId: string) => {
      socket.leave(groupId);
      console.log(`${user.username} left room: ${groupId}`);
    });

    // Handle Typing Indicator
    socket.on('typing', ({ groupId, isTyping }: { groupId: string; isTyping: boolean }) => {
      socket.to(groupId).emit('typing_indicator', {
        groupId,
        userId,
        username: user.username,
        isTyping,
      });
    });

    // Handle Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${user.username} (${socket.id})`);
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
        }
      }
      // Broadcast updated online count
      io.emit('online_users_count', { count: onlineUsers.size });
    });
  });
};
export default setupSocketHandler;

// main.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import https, { Server } from 'https';
import fs from 'fs';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { errorHandler } from './src/middlewares/error-handler.middleware';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from './src/utils/logger';
const swaggerDocument = require('./src/docs/swagger.json');

const port = process.env['API_PORT'] ? Number(process.env['API_PORT']) : 8080;

const app = express();

// ----------------- Load HTTPS Certificates -----------------
const loadHttpsCertificates = () => {
  try {
    return {
      key: fs.readFileSync(path.resolve('./cert/server.key')),
      cert: fs.readFileSync(path.resolve('./cert/server.crt')),
    };
  } catch (error) {
    console.error('❌ SSL certificate load failed:', error);
    process.exit(1);
  }
};

// HTTPS Server
const httpsOptions = loadHttpsCertificates();
const server: Server = https.createServer(httpsOptions, app);

// ----------------- Socket.IO -----------------
const io = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }, // Adjust in production
});

// Track online users and their rooms
const onlineUsers: Record<string, string> = {};
const userRooms: Record<string, Set<string>> = {}; // userId -> Set of conversationIds

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  let currentUserId: string | null = null;

  // ==================== User Registration ====================

  socket.on('register', (userId: string) => {
    currentUserId = userId;
    onlineUsers[userId] = socket.id;
    console.log(`User ${userId} registered with socket ${socket.id}`);

    // Broadcast user online status
    io.emit('user-online', userId);
  });

  // ==================== Chat Messages ====================

  socket.on('sendMessage', (data) => {
    const receiverSocketId = onlineUsers[data.receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('receiveMessage', data);
    }
  });

  // ==================== Typing Indicators ====================

  socket.on(
    'typing',
    (data: { conversationId: string; userId: string; userName: string }) => {
      // Broadcast to all users in the conversation except sender
      socket.broadcast.emit('user-typing', data);
    }
  );

  socket.on(
    'stop-typing',
    (data: { conversationId: string; userId: string }) => {
      socket.broadcast.emit('user-stop-typing', data);
    }
  );

  // ==================== Read Receipts ====================

  socket.on('message-read', (data: { messageId: string; userId: string }) => {
    socket.broadcast.emit('message-read-update', data);
  });

  // ==================== Huddle Signaling ====================

  socket.on(
    'huddle-started',
    (data: { conversationId: string; userId: string }) => {
      socket.broadcast.emit('huddle-started-notification', data);
    }
  );

  socket.on('huddle-join', (data: { huddleId: string; userId: string }) => {
    socket.broadcast.emit('huddle-user-joined', data);
  });

  socket.on(
    'huddle-offer',
    (data: { target: string; offer: RTCSessionDescriptionInit }) => {
      const targetSocketId = onlineUsers[data.target];
      if (targetSocketId) {
        io.to(targetSocketId).emit('huddle-offer', {
          from: currentUserId,
          offer: data.offer,
        });
      }
    }
  );

  socket.on(
    'huddle-answer',
    (data: { target: string; answer: RTCSessionDescriptionInit }) => {
      const targetSocketId = onlineUsers[data.target];
      if (targetSocketId) {
        io.to(targetSocketId).emit('huddle-answer', {
          from: currentUserId,
          answer: data.answer,
        });
      }
    }
  );

  socket.on(
    'huddle-ice-candidate',
    (data: { target: string; candidate: RTCIceCandidateInit }) => {
      const targetSocketId = onlineUsers[data.target];
      if (targetSocketId) {
        io.to(targetSocketId).emit('huddle-ice-candidate', {
          from: data.target,
          candidate: data.candidate,
        });
      }
    }
  );

  socket.on('huddle-leave', (data: { huddleId: string; userId: string }) => {
    socket.broadcast.emit('huddle-user-left', data);
  });

  socket.on('huddle-ended', (data: { huddleId: string }) => {
    socket.broadcast.emit('huddle-ended', data);
  });

  // ==================== Call Signaling (1-1) ====================

  socket.on(
    'call-user',
    (data: {
      target: string;
      callId: string;
      callType: string;
      offer: RTCSessionDescriptionInit;
    }) => {
      const targetSocketId = onlineUsers[data.target];
      if (targetSocketId) {
        io.to(targetSocketId).emit('incoming-call', {
          from: currentUserId,
          callId: data.callId,
          callType: data.callType,
          offer: data.offer,
        });
      }
    }
  );

  socket.on(
    'call-answer',
    (data: { target: string; answer: RTCSessionDescriptionInit }) => {
      const targetSocketId = onlineUsers[data.target];
      if (targetSocketId) {
        io.to(targetSocketId).emit('call-answered', {
          answer: data.answer,
        });
      }
    }
  );

  socket.on(
    'ice-candidate',
    (data: { target: string; candidate: RTCIceCandidateInit }) => {
      const targetSocketId = onlineUsers[data.target];
      if (targetSocketId) {
        io.to(targetSocketId).emit('ice-candidate', {
          candidate: data.candidate,
        });
      }
    }
  );

  socket.on('call-ended', (data: { callId: string }) => {
    socket.broadcast.emit('call-ended', data);
  });

  socket.on('call-rejected', (data: { target: string }) => {
    const targetSocketId = onlineUsers[data.target];
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-rejected');
    }
  });

  // ==================== Notifications ====================

  socket.on('sendNotification', (data) => {
    const { employeeIds, type, message } = data;
    employeeIds.forEach((id: string) => {
      const socketId = onlineUsers[id];
      if (socketId) io.to(socketId).emit('notification', { type, message });
    });
  });

  // ==================== Disconnect ====================

  socket.on('disconnect', () => {
    if (currentUserId) {
      delete onlineUsers[currentUserId];
      // Broadcast user offline status
      io.emit('user-offline', currentUserId);
      console.log(`User ${currentUserId} disconnected`);
    }
    console.log('Client disconnected:', socket.id);
  });
});

export { io, onlineUsers };
// ----------------- Middlewares -----------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: [
      'http://192.168.1.70:4200',
      'http://172.20.192.1:4200',
      'http://localhost:4200',
      'http://localhost:51818',
    ],
    credentials: true,
  })
);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Request Logger Middleware
app.use((req: Request, res: Response, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    body: req.body,
    query: req.query,
    params: req.params,
  });
  next();
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ----------------- Root route -----------------
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to HRMS' });
});

// ----------------- Load routes dynamically -----------------
const MODULES: string[] = [
  'auth',
  'employee',
  'attendence',
  'leave',
  'leave-balance',
  'global',
  'users',
  'payroll',
  'payroll-component',
  'report',
  'performance',
  'notification',
  'department',
  'designation',
  'chat',
  'huddle',
  'call',
  'dashboard',
  'admin',
];

async function startServer() {
  // ----------------- Start server -----------------
  for (const moduleName of MODULES) {
    try {
      const module = await import(`./src/routes/${moduleName}.route`);
      module.default(app);
      logger.info(`✅ Module loaded: ${moduleName}`);
    } catch (err) {
      logger.error(`❌ Failed to load module ${moduleName}:`, err);
    }
  }

  // 404 Middleware
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: {
        statusCode: 404,
        message: 'Resource not found',
        code: 'NOT_FOUND',
      },
    });
  });

  // Error Handling Middleware
  app.use(errorHandler);
  // Start server
  server.listen(port, () => {
    logger.info(`🚀 HTTPS server running on https://localhost:${port}`);
  });
}

// Start everything
startServer();

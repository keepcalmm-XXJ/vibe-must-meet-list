import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';

// Import configuration and middleware
import { appConfig } from './config';
import {
  requestLogger,
  errorLogger,
  requestId,
  securityHeaders,
  sanitizeInput,
  globalErrorHandler,
  notFoundHandler,
} from './middleware';
import { apiRoutes } from './routes';
import { initializeDatabase } from './database/connection';

const app = express();
const server = createServer(app);

// Socket.io setup with configuration
const io = new Server(server, {
  cors: appConfig.socket.cors,
});

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Request ID middleware (first)
app.use(requestId);

// Request logging middleware
app.use(requestLogger);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors(appConfig.cors));

// Additional security headers
app.use(securityHeaders);

// Rate limiting for API routes
const limiter = rateLimit({
  windowMs: appConfig.rateLimit.windowMs,
  max: appConfig.rateLimit.max,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: appConfig.rateLimit.message,
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  type: ['application/json', 'text/plain'],
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
}));

// Input sanitization
app.use(sanitizeInput);

// Serve static files in production
if (appConfig.isProduction) {
  app.use(express.static(path.join(__dirname, '../client')));
}

// API routes
app.use('/api/v1', apiRoutes);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`[${new Date().toISOString()}] Socket connected: ${socket.id}`);

  // Handle user authentication for socket
  socket.on('authenticate', (token) => {
    // TODO: Implement socket authentication
    console.log(`[${new Date().toISOString()}] Socket authentication attempt: ${socket.id}`);
  });

  // Handle joining rooms (events)
  socket.on('join-event', (eventId) => {
    socket.join(`event-${eventId}`);
    console.log(`[${new Date().toISOString()}] Socket ${socket.id} joined event ${eventId}`);
  });

  // Handle leaving rooms
  socket.on('leave-event', (eventId) => {
    socket.leave(`event-${eventId}`);
    console.log(`[${new Date().toISOString()}] Socket ${socket.id} left event ${eventId}`);
  });

  // Handle private messages
  socket.on('private-message', (data) => {
    // TODO: Implement private messaging
    console.log(`[${new Date().toISOString()}] Private message from ${socket.id}:`, data);
  });

  // Handle connection requests
  socket.on('connection-request', (data) => {
    // TODO: Implement connection requests
    console.log(`[${new Date().toISOString()}] Connection request from ${socket.id}:`, data);
  });

  socket.on('disconnect', (reason) => {
    console.log(`[${new Date().toISOString()}] Socket disconnected: ${socket.id}, reason: ${reason}`);
  });

  socket.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] Socket error for ${socket.id}:`, error);
  });
});

// Serve React app in production (catch-all handler)
if (appConfig.isProduction) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
  });
}

// Error handling middleware (must be last)
app.use(errorLogger);
app.use(notFoundHandler);
app.use(globalErrorHandler);

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database connection
    await initializeDatabase();
    
    // Start server
    server.listen(appConfig.port, () => {
      console.log(`[${new Date().toISOString()}] Server started successfully`);
      console.log(`[${new Date().toISOString()}] Port: ${appConfig.port}`);
      console.log(`[${new Date().toISOString()}] Environment: ${appConfig.nodeEnv}`);
      console.log(`[${new Date().toISOString()}] API Base URL: http://localhost:${appConfig.port}/api/v1`);
      
      if (appConfig.isDevelopment) {
        console.log(`[${new Date().toISOString()}] Health check: http://localhost:${appConfig.port}/api/v1/health`);
      }
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to start server:`, error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log(`[${new Date().toISOString()}] SIGTERM received, shutting down gracefully`);
  server.close(() => {
    console.log(`[${new Date().toISOString()}] Server closed`);
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log(`[${new Date().toISOString()}] SIGINT received, shutting down gracefully`);
  server.close(() => {
    console.log(`[${new Date().toISOString()}] Server closed`);
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(`[${new Date().toISOString()}] Uncaught Exception:`, error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`[${new Date().toISOString()}] Unhandled Rejection at:`, promise, 'reason:', reason);
  process.exit(1);
});

export { io, app };

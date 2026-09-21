const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// ── Load environment variables from .env FIRST ──────────────────────────────
require('dotenv').config();

const taskRoutes = require('./routes/tasks');

// ── DB config ────────────────────────────────────────────────────────────────
// When MONGO_URI is absent we fall back to an in-memory MongoDB instance
// (mongodb-memory-server) so the server starts with zero OS-level setup.
const MONGO_URI_ENV = process.env.MONGO_URI || '';
if (!MONGO_URI_ENV) {
  console.warn('⚠️  MONGO_URI not set — will start an in-memory MongoDB for development.');
}

// Holds the MongoMemoryServer instance so we can stop it on shutdown
let memoryServer = null;

const PREFERRED_PORT = parseInt(process.env.PORT, 10) || 5001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// ── Port Finder (built-in net — no extra package needed) ─────────────────────
/**
 * Probes ports starting at `from` until one is free, then resolves with it.
 * Uses a raw TCP probe so we know for certain before calling app.listen().
 */
function findFreePort(from) {
  return new Promise((resolve, reject) => {
    const net = require('net');
    const server = net.createServer();
    server.unref(); // don't keep the event loop alive
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`⚠️  Port ${from} is in use — trying ${from + 1}...`);
        resolve(findFreePort(from + 1)); // try next port
      } else {
        reject(err);
      }
    });
    server.listen(from, '0.0.0.0', () => {
      server.close(() => resolve(from)); // port is free
    });
  });
}

let activePort = PREFERRED_PORT; // updated once the server binds successfully

// ── Express App ──────────────────────────────────────────────────────────────
const app = express();

const allowedOrigins = [
  'https://kanban-roan-mu.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/tasks', taskRoutes);

// Health check — also reports DB connection state
app.get('/health', (req, res) => {
  const dbState = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    status: 'OK',
    db: dbState[mongoose.connection.readyState] || 'unknown',
    timestamp: new Date().toISOString(),
  });
});

// ── MongoDB Connection ───────────────────────────────────────────────────────
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

/**
 * Resolves the MongoDB URI to use:
 *  - Returns MONGO_URI_ENV if it is a non-empty string.
 *  - Otherwise boots a MongoMemoryServer and returns its URI.
 */
async function startInMemoryMongo() {
  if (memoryServer) return memoryServer.getUri();
  console.log('🧪 Starting in-memory MongoDB for development...');
  const { MongoMemoryServer } = require('mongodb-memory-server');
  memoryServer = await MongoMemoryServer.create({
    instance: { dbName: 'kanban' },
  });
  const uri = memoryServer.getUri();
  console.log('\n┌─────────────────────────────────────────────────────┐');
  console.log('│  ⚡ Connected to In-Memory MongoDB for Development   │');
  console.log('│     Data is stored in memory for this session.       │');
  console.log('│     Set MONGO_URI in .env to use an external DB.     │');
  console.log('└─────────────────────────────────────────────────────┘\n');
  return uri;
}

async function connectDB(attempt = 1, forceInMemory = false) {
  try {
    let uri;
    if (forceInMemory || !MONGO_URI_ENV) {
      uri = await startInMemoryMongo();
    } else {
      uri = MONGO_URI_ENV;
    }

    const safeUri = uri.replace(/:\/\/.*@/, '://<credentials>@');
    console.log(`🔌 Connecting to MongoDB... (attempt ${attempt}/${MAX_RETRIES})`);
    console.log(`   URI: ${safeUri}`);

    await mongoose.connect(uri, {
      family: 4,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ MongoDB connected successfully!');
    console.log(`   Host:     ${mongoose.connection.host}:${mongoose.connection.port}`);
    console.log(`   Database: ${mongoose.connection.name}`);

    // ── Find a free port and start Express ────────────────────────────────
    activePort = await findFreePort(PREFERRED_PORT);
    if (activePort !== PREFERRED_PORT) {
      console.warn(`⚠️  Port ${PREFERRED_PORT} was busy — server will use port ${activePort} instead.`);
      console.warn(`   Update PORT=${activePort} in server/.env and vite.config.js proxy to match.`);
    }

    const server = app.listen(activePort, () => {
      console.log(`\n🚀 Server is running at http://localhost:${activePort}`);
      console.log(`   Health check: http://localhost:${activePort}/health`);
      console.log(`   Tasks API:    http://localhost:${activePort}/api/tasks\n`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ EADDRINUSE: Port ${activePort} was taken between probe and bind.`);
      } else {
        console.error('❌ Server listen error:', err.message);
      }
      process.exit(1);
    });

  } catch (err) {
    console.error(`\n❌ MongoDB connection failed (attempt ${attempt}/${MAX_RETRIES})`);
    console.error(`   Error: ${err.message}`);

    if (err.message.includes('ECONNREFUSED') && !forceInMemory) {
      console.warn('⚠️  Could not connect to local MongoDB. Forcefully switching to In-Memory MongoDB fallback...');
      return connectDB(1, true);
    } else if (err.message.includes('Authentication failed')) {
      console.error('\n💡 Fix: Check your MongoDB username/password in MONGO_URI (.env)\n');
    } else if (err.message.includes('ENOTFOUND')) {
      console.error('\n💡 Fix: Check your Atlas cluster hostname in MONGO_URI (.env)\n');
    }

    if (attempt < MAX_RETRIES) {
      console.log(`⏳ Retrying in ${RETRY_DELAY_MS / 1000}s...\n`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return connectDB(attempt + 1);
    }

    console.error('🛑 Max retries reached. Exiting process.');
    process.exit(1);
  }
}

// ── Mongoose Connection Event Listeners ─────────────────────────────────────
mongoose.connection.on('connected', () => {
  console.log('📗 Mongoose: connection established.');
});

mongoose.connection.on('disconnected', () => {
  console.warn('📙 Mongoose: connection lost. Reconnecting...');
});

mongoose.connection.on('error', (err) => {
  console.error('📕 Mongoose runtime error:', err.message);
});

// ── Graceful Shutdown ────────────────────────────────────────────────────────
async function shutdown(signal) {
  console.log(`\n⚠️  ${signal} received. Closing server gracefully...`);
  await mongoose.connection.close();
  if (memoryServer) {
    await memoryServer.stop();
    console.log('🧪 In-memory MongoDB stopped.');
  }
  console.log('✅ MongoDB connection closed. Goodbye!');
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ── Bootstrap ────────────────────────────────────────────────────────────────
connectDB();

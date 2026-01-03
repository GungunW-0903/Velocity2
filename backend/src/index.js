import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import uploadRoutes from './routes/upload.js';
import resumeRoutes from './routes/resume.js';
import enhanceRoutes from './routes/enhance.js';
import authRoutes from './routes/auth.js';
import jobsRoutes from './routes/jobsRoute.js';
import jobTrackerRoutes from './routes/jobTracker.js';
import jobAlertRoutes from './routes/jobAlerts.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';

// Import services
import mongoose from 'mongoose';
import { initJobFetcher } from './services/jobFetcher.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests, please try again later.'
  }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/enhance', enhanceRoutes);
app.use('/api/fetchjobs', jobsRoutes);
app.use('/api/job-tracker', jobTrackerRoutes);
app.use('/api/job-alerts', jobAlertRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/velocity';
    await mongoose.connect(mongoUri);
    console.log('📦 Connected to MongoDB');

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    });

    // Initialize job fetcher after server starts
    // Works with or without Redis (degrades gracefully)
    try {
      await initJobFetcher();
    } catch (fetcherError) {
      console.warn('⚠️ Job fetcher initialization skipped:', fetcherError.message);
    }

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;

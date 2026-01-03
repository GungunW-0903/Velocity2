import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';

const router = express.Router();

// In-memory storage for tracked jobs (replace with Firebase Firestore in production)
const jobTrackerStore = new Map();

// Get all tracked jobs for a user
router.get('/', verifyToken, asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  
  const userJobs = [];
  for (const [id, job] of jobTrackerStore) {
    if (job.userId === userId) {
      userJobs.push({ id, ...job });
    }
  }

  // Sort by creation date (newest first)
  userJobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    success: true,
    trackedJobs: userJobs,
    count: userJobs.length
  });
}));

// Get tracker stats for a user
router.get('/stats', verifyToken, asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  
  const userJobs = [];
  for (const [id, job] of jobTrackerStore) {
    if (job.userId === userId) {
      userJobs.push(job);
    }
  }

  const stats = {
    total: userJobs.length,
    saved: userJobs.filter(j => j.status === 'saved').length,
    applied: userJobs.filter(j => j.status === 'applied').length,
    interviewing: userJobs.filter(j => j.status === 'interviewing').length,
    offered: userJobs.filter(j => j.status === 'offered').length,
    rejected: userJobs.filter(j => j.status === 'rejected').length
  };

  res.json({
    success: true,
    stats
  });
}));

// Track a new job
router.post('/', verifyToken, asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const { 
    jobId,
    title, 
    company, 
    location,
    jobType,
    salary,
    applyLink,
    description,
    status = 'saved'
  } = req.body;

  if (!title || !company) {
    throw new ApiError(400, 'Job title and company are required');
  }

  // Check if job already tracked
  for (const [id, job] of jobTrackerStore) {
    if (job.userId === userId && job.jobId === jobId) {
      throw new ApiError(400, 'Job already tracked');
    }
  }

  const trackerId = uuidv4();
  const now = new Date().toISOString();

  const trackedJob = {
    userId,
    jobId: jobId || trackerId,
    title,
    company,
    location: location || 'Remote',
    jobType: jobType || 'Full-time',
    salary: salary || null,
    applyLink: applyLink || null,
    description: description || null,
    status,
    notes: [],
    createdAt: now,
    updatedAt: now
  };

  jobTrackerStore.set(trackerId, trackedJob);

  res.status(201).json({
    success: true,
    message: 'Job tracked successfully',
    data: {
      id: trackerId,
      ...trackedJob
    }
  });
}));

// Update tracked job status
router.put('/:trackerId', verifyToken, asyncHandler(async (req, res) => {
  const { trackerId } = req.params;
  const userId = req.user.uid;
  const { status, notes } = req.body;

  const job = jobTrackerStore.get(trackerId);

  if (!job) {
    throw new ApiError(404, 'Tracked job not found');
  }

  if (job.userId !== userId) {
    throw new ApiError(403, 'Access denied');
  }

  const validStatuses = ['saved', 'applied', 'interviewing', 'offered', 'rejected'];
  if (status && !validStatuses.includes(status)) {
    throw new ApiError(400, 'Invalid status');
  }

  const now = new Date().toISOString();
  
  if (status) {
    job.status = status;
  }
  
  if (notes) {
    job.notes = job.notes || [];
    job.notes.push({
      text: notes,
      createdAt: now
    });
  }
  
  job.updatedAt = now;

  jobTrackerStore.set(trackerId, job);

  res.json({
    success: true,
    message: 'Job updated successfully',
    data: {
      id: trackerId,
      ...job
    }
  });
}));

// Delete tracked job
router.delete('/:trackerId', verifyToken, asyncHandler(async (req, res) => {
  const { trackerId } = req.params;
  const userId = req.user.uid;

  const job = jobTrackerStore.get(trackerId);

  if (!job) {
    throw new ApiError(404, 'Tracked job not found');
  }

  if (job.userId !== userId) {
    throw new ApiError(403, 'Access denied');
  }

  jobTrackerStore.delete(trackerId);

  res.json({
    success: true,
    message: 'Job removed from tracker'
  });
}));

export default router;

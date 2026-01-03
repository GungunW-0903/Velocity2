import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Track if Redis is available
let redisAvailable = false;
let redisConnection = null;
let jobAlertQueue = null;

// Rate limiter configuration
export const RATE_LIMIT_CONFIG = {
    maxConcurrent: 1,        // Process one job at a time
    delayBetweenJobs: 2000,  // 2 seconds between API calls
    maxRequestsPerMinute: 30,
    maxRequestsPerDay: 500   // Conservative daily limit
};

/**
 * Initialize Redis connection and queue
 * Returns true if successful, false otherwise
 */
export const initializeQueue = async () => {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
        console.log('ℹ️  REDIS_URL not configured - job queue disabled');
        return false;
    }

    try {
        redisConnection = new IORedis(redisUrl, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            retryStrategy: (times) => {
                if (times > 3) {
                    console.log('⚠️  Redis connection failed after 3 attempts');
                    return null; // Stop retrying
                }
                return Math.min(times * 200, 1000);
            }
        });

        // Test connection
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Redis connection timeout'));
            }, 5000);

            redisConnection.once('ready', () => {
                clearTimeout(timeout);
                resolve();
            });

            redisConnection.once('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });

        // Create queue
        jobAlertQueue = new Queue('job-alerts', {
            connection: redisConnection,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000
                },
                removeOnComplete: {
                    age: 24 * 3600,
                    count: 1000
                },
                removeOnFail: {
                    age: 7 * 24 * 3600
                }
            }
        });

        // Queue events for monitoring
        jobAlertQueue.on('error', (error) => {
            console.error('❌ Job Alert Queue Error:', error.message);
        });

        redisAvailable = true;
        console.log('✅ Redis connected - job queue enabled');
        return true;

    } catch (error) {
        console.log('⚠️  Redis not available:', error.message);
        console.log('ℹ️  Job queue disabled - manual alert triggers still work');
        redisAvailable = false;
        return false;
    }
};

// Check if queue is available
export const isQueueAvailable = () => redisAvailable && jobAlertQueue !== null;

// Get queue instance (may be null)
export const getQueue = () => jobAlertQueue;

// Utility to add a job to the queue
export const addAlertToQueue = async (alertData, options = {}) => {
    if (!isQueueAvailable()) {
        console.log('⚠️  Queue not available, skipping queue add');
        return null;
    }

    const jobId = `alert-${alertData.alertId}-${Date.now()}`;

    return await jobAlertQueue.add('fetch-jobs', alertData, {
        jobId,
        delay: options.delay || 0,
        priority: options.priority || 1,
        ...options
    });
};

// Utility to add multiple alerts with staggered delays
export const addBatchAlertsToQueue = async (alerts) => {
    if (!isQueueAvailable()) {
        console.log('⚠️  Queue not available, skipping batch add');
        return [];
    }

    const jobs = alerts.map((alert, index) => ({
        name: 'fetch-jobs',
        data: alert,
        opts: {
            jobId: `alert-${alert.alertId}-${Date.now()}-${index}`,
            delay: index * RATE_LIMIT_CONFIG.delayBetweenJobs,
            priority: 1
        }
    }));

    return await jobAlertQueue.addBulk(jobs);
};

// Get queue statistics
export const getQueueStats = async () => {
    if (!isQueueAvailable()) {
        return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, available: false };
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
        jobAlertQueue.getWaitingCount(),
        jobAlertQueue.getActiveCount(),
        jobAlertQueue.getCompletedCount(),
        jobAlertQueue.getFailedCount(),
        jobAlertQueue.getDelayedCount()
    ]);

    return { waiting, active, completed, failed, delayed, available: true };
};

// Pause/Resume queue
export const pauseQueue = async () => {
    if (!isQueueAvailable()) return;
    await jobAlertQueue.pause();
    console.log('⏸️  Job Alert Queue paused');
};

export const resumeQueue = async () => {
    if (!isQueueAvailable()) return;
    await jobAlertQueue.resume();
    console.log('▶️  Job Alert Queue resumed');
};

// Clean old jobs
export const cleanQueue = async () => {
    if (!isQueueAvailable()) return;
    await jobAlertQueue.clean(24 * 3600 * 1000, 1000, 'completed');
    await jobAlertQueue.clean(7 * 24 * 3600 * 1000, 100, 'failed');
    console.log('🧹 Queue cleaned');
};

// Get Redis connection for worker
export const getRedisConnection = () => redisConnection;

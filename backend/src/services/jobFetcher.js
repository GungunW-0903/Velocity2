import cron from 'node-cron';
import { Worker } from 'bullmq';
import JobAlert from '../models/JobAlert.model.js';
import JobListing from '../models/JobListing.model.js';
import NotificationLog from '../models/NotificationLog.model.js';
import { searchJobs } from './rapidApiService.js';
import { sendJobAlertEmail } from './mailService.js';
import {
    initializeQueue,
    isQueueAvailable,
    getRedisConnection,
    addBatchAlertsToQueue,
    RATE_LIMIT_CONFIG,
    pauseQueue,
    resumeQueue
} from './jobAlertQueue.js';

// Track consecutive failures for circuit breaker
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 5;

/**
 * Map our employment types to RapidAPI format
 * Our model uses: 'full-time', 'part-time', 'contract', 'internship'
 * RapidAPI expects: 'FULLTIME', 'CONTRACTOR', 'PARTTIME', 'INTERN'
 */
const mapEmploymentType = (types) => {
    if (!types || !Array.isArray(types) || types.length === 0) {
        return ''; // Don't send employment_types if empty
    }
    
    const typeMap = {
        'full-time': 'FULLTIME',
        'fulltime': 'FULLTIME',
        'part-time': 'PARTTIME',
        'parttime': 'PARTTIME',
        'contract': 'CONTRACTOR',
        'contractor': 'CONTRACTOR',
        'internship': 'INTERN',
        'intern': 'INTERN'
    };
    
    const mappedTypes = types
        .map(t => typeMap[t?.toLowerCase()] || null)
        .filter(Boolean);
    
    return mappedTypes.join(',');
};

/**
 * Process a single job alert - fetch jobs and send notifications
 */
export const processAlert = async (alertData) => {
    const { alertId, userId, userEmail, userName, title, keywords, location, remoteOnly, employmentType } = alertData;

    console.log(`\n📧 Processing alert: ${title} for user ${userId}`);

    try {
        // Build search query from alert preferences
        const searchQuery = [title, ...(keywords || [])].filter(Boolean).join(' ');
        
        // Map employment types to RapidAPI format
        const mappedEmploymentType = mapEmploymentType(employmentType);
        console.log(`📋 Employment type: ${employmentType} -> ${mappedEmploymentType || '(none)'}`);

        // Fetch jobs from RapidAPI
        const fetchedJobs = await searchJobs({
            query: searchQuery,
            location: location || '',
            remoteOnly: remoteOnly || false,
            employmentType: mappedEmploymentType,
            page: 1,
            numPages: 1
        });

        if (!fetchedJobs.length) {
            console.log('📭 No jobs found for this alert');
            await JobAlert.findByIdAndUpdate(alertId, { lastCheckedAt: new Date() });
            return { success: true, newJobs: 0 };
        }

        // Filter and save new jobs
        const newJobs = [];

        for (const job of fetchedJobs) {
            // Check if job already exists in our cache
            let existingJob = await JobListing.findOne({ externalId: job.externalId });

            if (!existingJob) {
                // Save new job to cache
                existingJob = await JobListing.create(job);
                console.log(`💾 Cached new job: ${job.title} at ${job.company}`);
            }

            // Check if user has already been notified about this job
            const alreadyNotified = await NotificationLog.findOne({
                userId,
                jobListingId: existingJob._id
            });

            if (!alreadyNotified) {
                newJobs.push({
                    ...job,
                    _id: existingJob._id
                });
            }
        }

        console.log(`🆕 ${newJobs.length} new jobs for user (after deduplication)`);

        // Send email if there are new jobs
        if (newJobs.length > 0) {
            try {
                console.log(`📬 Sending email to: ${userEmail} (${userName})`);
                console.log(`   Alert: "${title}", Jobs count: ${newJobs.length}`);
                
                const emailResult = await sendJobAlertEmail({
                    userEmail,
                    userName: userName || 'Job Seeker',
                    alertTitle: title,
                    jobs: newJobs
                });
                
                console.log(`✅ Email sent successfully! Message ID: ${emailResult.messageId}`);
                console.log(`   Recipient: ${userEmail}`);

                // Log all notifications
                const notificationPromises = newJobs.map(job =>
                    NotificationLog.create({
                        userId,
                        alertId,
                        jobListingId: job._id,
                        externalJobId: job.externalId,
                        emailStatus: 'sent',
                        emailMessageId: emailResult.messageId
                    }).catch(err => {
                        // Handle duplicate key error gracefully
                        if (err.code !== 11000) throw err;
                    })
                );

                await Promise.all(notificationPromises);

                // Update alert stats
                await JobAlert.findByIdAndUpdate(alertId, {
                    lastCheckedAt: new Date(),
                    $inc: {
                        totalJobsFound: newJobs.length,
                        totalEmailsSent: 1
                    }
                });

                console.log(`✉️ Email sent with ${newJobs.length} jobs`);
                consecutiveFailures = 0; // Reset on success

            } catch (emailError) {
                console.error('❌ Failed to send email:', emailError.message);

                // Log failed notifications
                await Promise.all(newJobs.map(job =>
                    NotificationLog.create({
                        userId,
                        alertId,
                        jobListingId: job._id,
                        externalJobId: job.externalId,
                        emailStatus: 'failed',
                        errorMessage: emailError.message
                    }).catch(() => { })
                ));
            }
        }

        return { success: true, newJobs: newJobs.length };

    } catch (error) {
        console.error(`❌ Error processing alert ${alertId}:`, error.message);

        // Handle rate limiting
        if (error.message === 'RATE_LIMIT_EXCEEDED') {
            consecutiveFailures++;
            if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                console.log('🛑 Circuit breaker triggered - pausing queue');
                await pauseQueue();
                // Resume after 1 hour
                setTimeout(async () => {
                    consecutiveFailures = 0;
                    await resumeQueue();
                }, 60 * 60 * 1000);
            }
            throw error; // Let BullMQ retry
        }

        throw error;
    }
};

/**
 * Create and start the queue worker (only if Redis available)
 */
export const startWorker = () => {
    const redisConnection = getRedisConnection();

    if (!redisConnection || !isQueueAvailable()) {
        console.log('⚠️  Redis not available - Worker not started');
        return null;
    }

    const worker = new Worker(
        'job-alerts',
        async (job) => {
            console.log(`\n🔄 Worker processing job: ${job.id}`);
            const result = await processAlert(job.data);
            return result;
        },
        {
            connection: redisConnection,
            concurrency: RATE_LIMIT_CONFIG.maxConcurrent,
            limiter: {
                max: RATE_LIMIT_CONFIG.maxRequestsPerMinute,
                duration: 60000 // 1 minute
            }
        }
    );

    worker.on('completed', (job, result) => {
        console.log(`✅ Job ${job.id} completed. New jobs: ${result?.newJobs || 0}`);
    });

    worker.on('failed', (job, error) => {
        console.error(`❌ Job ${job.id} failed:`, error.message);
    });

    worker.on('error', (error) => {
        console.error('❌ Worker error:', error);
    });

    console.log('👷 Job Alert Worker started');
    return worker;
};

/**
 * Scheduled task to enqueue all active alerts
 */
export const scheduleAlertChecks = () => {
    // Check if we should use 10-second interval for testing
    const testingMode = process.env.ALERT_TEST_INTERVAL === '10s';
    
    if (testingMode) {
        console.log('🧪 TESTING MODE: Running job alerts every 10 seconds');
        
        // Use setInterval for 10-second testing
        setInterval(async () => {
            console.log('\n⏰ Scheduled job alert check starting...');
            await runAlertCheck();
        }, 10000);
        
        // Also run immediately
        setTimeout(async () => {
            console.log('\n⏰ Running initial job alert check...');
            await runAlertCheck();
        }, 2000);
        
        return;
    }
    
    // Run every 6 hours: 0 */6 * * *
    // For testing, you can use '*/5 * * * *' (every 5 minutes)
    const schedule = process.env.ALERT_CRON_SCHEDULE || '0 */6 * * *';

    cron.schedule(schedule, async () => {
        console.log('\n⏰ Scheduled job alert check starting...');

        try {
            // Get all active alerts
            const activeAlerts = await JobAlert.find({ isActive: true })
                .select('_id userId userEmail userName title keywords location remoteOnly employmentType frequency')
                .lean();

            if (!activeAlerts.length) {
                console.log('📭 No active alerts to process');
                return;
            }

            console.log(`📋 Found ${activeAlerts.length} active alerts`);

            // Prepare alert data for queue
            const alertsToQueue = activeAlerts.map(alert => ({
                alertId: alert._id.toString(),
                userId: alert.userId,
                userEmail: alert.userEmail,
                userName: alert.userName,
                title: alert.title,
                keywords: alert.keywords || [],
                location: alert.location,
                remoteOnly: alert.remoteOnly,
                employmentType: alert.employmentType
            }));

            // If queue available, add to queue, otherwise process directly
            if (isQueueAvailable()) {
                await addBatchAlertsToQueue(alertsToQueue);
                console.log(`📥 Added ${alertsToQueue.length} alerts to queue`);
            } else {
                console.log('⚠️  Queue not available, processing alerts directly...');
                for (const alertData of alertsToQueue) {
                    try {
                        await processAlert(alertData);
                        // Add delay between requests to respect rate limits
                        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_CONFIG.delayBetweenJobs));
                    } catch (err) {
                        console.error(`Failed to process alert ${alertData.alertId}:`, err.message);
                    }
                }
            }

        } catch (error) {
            console.error('❌ Error scheduling alerts:', error);
        }
    });

    console.log(`📅 Alert check scheduled: ${schedule}`);
};

/**
 * Core alert check logic - extracted for reuse
 */
const runAlertCheck = async () => {
    try {
        // Get all active alerts
        const activeAlerts = await JobAlert.find({ isActive: true })
            .select('_id userId userEmail userName title keywords location remoteOnly employmentType frequency')
            .lean();

        if (!activeAlerts.length) {
            console.log('📭 No active alerts to process');
            return;
        }

        console.log(`📋 Found ${activeAlerts.length} active alerts`);

        // Prepare alert data for queue
        const alertsToQueue = activeAlerts.map(alert => ({
            alertId: alert._id.toString(),
            userId: alert.userId,
            userEmail: alert.userEmail,
            userName: alert.userName,
            title: alert.title,
            keywords: alert.keywords || [],
            location: alert.location,
            remoteOnly: alert.remoteOnly,
            employmentType: alert.employmentType
        }));

        // If queue available, add to queue, otherwise process directly
        if (isQueueAvailable()) {
            await addBatchAlertsToQueue(alertsToQueue);
            console.log(`📥 Added ${alertsToQueue.length} alerts to queue`);
        } else {
            console.log('⚠️  Queue not available, processing alerts directly...');
            for (const alertData of alertsToQueue) {
                try {
                    await processAlert(alertData);
                    // Add delay between requests to respect rate limits
                    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_CONFIG.delayBetweenJobs));
                } catch (err) {
                    console.error(`Failed to process alert ${alertData.alertId}:`, err.message);
                }
            }
        }

    } catch (error) {
        console.error('❌ Error in alert check:', error);
    }
};

/**
 * Manually trigger alert check for a specific alert (for testing)
 */
export const triggerAlertCheck = async (alertId) => {
    const alert = await JobAlert.findById(alertId).lean();

    if (!alert) {
        throw new Error('Alert not found');
    }

    if (!alert.isActive) {
        throw new Error('Alert is not active');
    }

    const result = await processAlert({
        alertId: alert._id.toString(),
        userId: alert.userId,
        userEmail: alert.userEmail,
        userName: alert.userName,
        title: alert.title,
        keywords: alert.keywords || [],
        location: alert.location,
        remoteOnly: alert.remoteOnly,
        employmentType: alert.employmentType
    });

    return result;
};

/**
 * Initialize the fetcher system
 */
export const initJobFetcher = async () => {
    console.log('\n🚀 Initializing Job Fetcher System...');

    // Try to initialize Redis queue
    const queueInitialized = await initializeQueue();

    let worker = null;
    if (queueInitialized) {
        // Start the worker
        worker = startWorker();
    }

    // Schedule periodic checks (works with or without Redis)
    scheduleAlertChecks();

    console.log('✅ Job Fetcher System initialized\n');

    return { worker, queueAvailable: queueInitialized };
};

export default {
    initJobFetcher,
    startWorker,
    scheduleAlertChecks,
    triggerAlertCheck,
    processAlert
};

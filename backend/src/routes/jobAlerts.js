import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import JobAlert from '../models/JobAlert.model.js';
import NotificationLog from '../models/NotificationLog.model.js';
import { triggerAlertCheck } from '../services/jobFetcher.js';
import { getQueueStats } from '../services/jobAlertQueue.js';

const router = express.Router();

/**
 * GET /api/job-alerts
 * Get all job alerts for the authenticated user (1-indexed in response)
 */
router.get('/', verifyToken, asyncHandler(async (req, res) => {
    const userId = req.user.uid;

    const alerts = await JobAlert.find({ userId })
        .sort({ createdAt: -1 })
        .lean();

    // Add 1-indexed position to each alert for display
    const alertsWithIndex = alerts.map((alert, index) => ({
        ...alert,
        position: index + 1 // 1-indexed as per user requirement
    }));

    res.json({
        success: true,
        count: alerts.length,
        alerts: alertsWithIndex
    });
}));

/**
 * GET /api/job-alerts/:id
 * Get a single job alert by ID
 */
router.get('/:id', verifyToken, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.uid;

    const alert = await JobAlert.findOne({ _id: id, userId }).lean();

    if (!alert) {
        throw new ApiError(404, 'Job alert not found');
    }

    // Get notification history for this alert
    const notifications = await NotificationLog.find({ alertId: id })
        .sort({ sentAt: -1 })
        .limit(50)
        .populate('jobListingId', 'title company location applyLink')
        .lean();

    // Add 1-indexed positions to notifications
    const notificationsWithIndex = notifications.map((notif, index) => ({
        ...notif,
        position: index + 1
    }));

    res.json({
        success: true,
        alert,
        notificationHistory: notificationsWithIndex
    });
}));

/**
 * POST /api/job-alerts
 * Create a new job alert
 */
router.post('/', verifyToken, asyncHandler(async (req, res) => {
    const userId = req.user.uid;
    const userEmail = req.user.email;
    const userName = req.user.name || req.user.displayName || 'Job Seeker';

    const {
        title,
        keywords = [],
        location = '',
        remoteOnly = false,
        salaryMin = null,
        salaryMax = null,
        employmentType = ['full-time'],
        frequency = 'daily'
    } = req.body;

    // Validation
    if (!title || title.trim().length === 0) {
        throw new ApiError(400, 'Alert title is required');
    }

    // Check for duplicate alerts
    const existingAlert = await JobAlert.findOne({
        userId,
        title: title.trim(),
        isActive: true
    });

    if (existingAlert) {
        throw new ApiError(400, 'You already have an active alert with this title');
    }

    // Create the alert
    const alert = await JobAlert.create({
        userId,
        userEmail,
        userName,
        title: title.trim(),
        keywords: keywords.filter(k => k && k.trim()),
        location: location.trim(),
        remoteOnly,
        salaryMin,
        salaryMax,
        employmentType,
        frequency,
        isActive: true
    });

    res.status(201).json({
        success: true,
        message: 'Job alert created successfully',
        alert
    });
}));

/**
 * PUT /api/job-alerts/:id
 * Update an existing job alert
 */
router.put('/:id', verifyToken, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.uid;

    const alert = await JobAlert.findOne({ _id: id, userId });

    if (!alert) {
        throw new ApiError(404, 'Job alert not found');
    }

    const {
        title,
        keywords,
        location,
        remoteOnly,
        salaryMin,
        salaryMax,
        employmentType,
        frequency,
        isActive
    } = req.body;

    // Update fields if provided
    if (title !== undefined) alert.title = title.trim();
    if (keywords !== undefined) alert.keywords = keywords.filter(k => k && k.trim());
    if (location !== undefined) alert.location = location.trim();
    if (remoteOnly !== undefined) alert.remoteOnly = remoteOnly;
    if (salaryMin !== undefined) alert.salaryMin = salaryMin;
    if (salaryMax !== undefined) alert.salaryMax = salaryMax;
    if (employmentType !== undefined) alert.employmentType = employmentType;
    if (frequency !== undefined) alert.frequency = frequency;
    if (isActive !== undefined) alert.isActive = isActive;

    await alert.save();

    res.json({
        success: true,
        message: 'Job alert updated successfully',
        alert
    });
}));

/**
 * DELETE /api/job-alerts/:id
 * Delete a job alert
 */
router.delete('/:id', verifyToken, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.uid;

    const alert = await JobAlert.findOneAndDelete({ _id: id, userId });

    if (!alert) {
        throw new ApiError(404, 'Job alert not found');
    }

    // Optionally clean up notification logs
    await NotificationLog.deleteMany({ alertId: id });

    res.json({
        success: true,
        message: 'Job alert deleted successfully'
    });
}));

/**
 * POST /api/job-alerts/:id/toggle
 * Toggle alert active status
 */
router.post('/:id/toggle', verifyToken, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.uid;

    const alert = await JobAlert.findOne({ _id: id, userId });

    if (!alert) {
        throw new ApiError(404, 'Job alert not found');
    }

    alert.isActive = !alert.isActive;
    await alert.save();

    res.json({
        success: true,
        message: `Job alert ${alert.isActive ? 'activated' : 'paused'}`,
        isActive: alert.isActive
    });
}));

/**
 * POST /api/job-alerts/:id/test
 * Trigger an immediate check for this alert (for testing)
 */
router.post('/:id/test', verifyToken, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.uid;

    const alert = await JobAlert.findOne({ _id: id, userId });

    if (!alert) {
        throw new ApiError(404, 'Job alert not found');
    }

    // Trigger immediate check
    try {
        const result = await triggerAlertCheck(id);
        res.json({
            success: true,
            message: 'Alert check completed',
            result
        });
    } catch (error) {
        throw new ApiError(500, `Failed to check alert: ${error.message}`);
    }
}));

/**
 * GET /api/job-alerts/stats/summary
 * Get summary statistics for user's alerts
 */
router.get('/stats/summary', verifyToken, asyncHandler(async (req, res) => {
    const userId = req.user.uid;

    const [alertStats, queueStats] = await Promise.all([
        JobAlert.aggregate([
            { $match: { userId } },
            {
                $group: {
                    _id: null,
                    totalAlerts: { $sum: 1 },
                    activeAlerts: { $sum: { $cond: ['$isActive', 1, 0] } },
                    totalJobsFound: { $sum: '$totalJobsFound' },
                    totalEmailsSent: { $sum: '$totalEmailsSent' }
                }
            }
        ]),
        getQueueStats()
    ]);

    const stats = alertStats[0] || {
        totalAlerts: 0,
        activeAlerts: 0,
        totalJobsFound: 0,
        totalEmailsSent: 0
    };

    res.json({
        success: true,
        stats: {
            ...stats,
            queueStatus: queueStats
        }
    });
}));

export default router;

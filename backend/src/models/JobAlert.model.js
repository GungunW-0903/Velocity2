import mongoose from 'mongoose';

const jobAlertSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    userEmail: {
        type: String,
        required: true
    },
    userName: {
        type: String,
        default: 'Job Seeker'
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    keywords: [{
        type: String,
        trim: true
    }],
    location: {
        type: String,
        trim: true,
        default: ''
    },
    remoteOnly: {
        type: Boolean,
        default: false
    },
    salaryMin: {
        type: Number,
        default: null
    },
    salaryMax: {
        type: Number,
        default: null
    },
    employmentType: [{
        type: String,
        enum: ['full-time', 'part-time', 'contract', 'internship'],
        default: 'full-time'
    }],
    frequency: {
        type: String,
        enum: ['realtime', 'daily', 'weekly'],
        default: 'daily'
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    lastCheckedAt: {
        type: Date,
        default: null
    },
    totalJobsFound: {
        type: Number,
        default: 0
    },
    totalEmailsSent: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Compound indexes for efficient querying
jobAlertSchema.index({ userId: 1, isActive: 1 });
jobAlertSchema.index({ isActive: 1, lastCheckedAt: 1 });
jobAlertSchema.index({ frequency: 1, isActive: 1 });

export default mongoose.model('JobAlert', jobAlertSchema);

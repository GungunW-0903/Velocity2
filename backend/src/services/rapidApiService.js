import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'jsearch.p.rapidapi.com';

// RapidAPI JSearch configuration
const rapidApiClient = axios.create({
    baseURL: `https://${RAPIDAPI_HOST}`,
    headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST
    },
    timeout: 30000 // 30 second timeout
});

/**
 * Search for jobs using RapidAPI JSearch
 * @param {Object} params - Search parameters
 * @param {string} params.query - Job title or keywords (e.g., "React Developer")
 * @param {string} params.location - Location (e.g., "San Francisco, CA")
 * @param {boolean} params.remoteOnly - Filter for remote jobs only
 * @param {string} params.employmentType - Employment type filter
 * @param {number} params.page - Page number (1-indexed)
 * @param {number} params.numPages - Number of pages to fetch
 * @returns {Promise<Array>} Array of job objects
 */
export const searchJobs = async ({
    query,
    location = '',
    remoteOnly = false,
    employmentType = '',
    page = 1,
    numPages = 1
}) => {
    try {
        // Build search query
        let searchQuery = query;
        if (location && !remoteOnly) {
            searchQuery += ` in ${location}`;
        }
        if (remoteOnly) {
            searchQuery += ' remote';
        }

        const params = {
            query: searchQuery,
            page: page.toString(),
            num_pages: numPages.toString(),
            date_posted: 'week' // Only get jobs from the past week
        };

        // Add employment type filter if specified
        if (employmentType) {
            params.employment_types = employmentType.toUpperCase();
        }

        // Add remote filter
        if (remoteOnly) {
            params.remote_jobs_only = 'true';
        }

        console.log(`🔍 Searching RapidAPI: "${searchQuery}"`);

        const response = await rapidApiClient.get('/search', { params });

        if (!response.data || !response.data.data) {
            console.log('📭 No jobs found');
            return [];
        }

        const jobs = response.data.data;
        console.log(`✅ Found ${jobs.length} jobs`);

        // Map API response to our internal format
        return jobs.map(job => mapJobToInternal(job));

    } catch (error) {
        if (error.response) {
            const status = error.response.status;
            if (status === 429) {
                console.error('⚠️ RapidAPI Rate limit exceeded');
                throw new Error('RATE_LIMIT_EXCEEDED');
            }
            if (status === 401 || status === 403) {
                console.error('🔑 RapidAPI authentication error');
                throw new Error('AUTH_ERROR');
            }
        }
        console.error('❌ RapidAPI search error:', error.message);
        throw error;
    }
};

/**
 * Map RapidAPI job response to internal JobListing format
 */
const mapJobToInternal = (job) => {
    // Generate a unique external ID from the job
    const externalId = job.job_id ||
        `${job.employer_name}-${job.job_title}-${Date.now()}`.replace(/\s+/g, '-').toLowerCase();

    // Parse salary information
    let salary = {
        min: null,
        max: null,
        currency: 'USD',
        period: 'yearly'
    };

    if (job.job_min_salary || job.job_max_salary) {
        salary.min = job.job_min_salary || null;
        salary.max = job.job_max_salary || null;
        salary.currency = job.job_salary_currency || 'USD';
        salary.period = job.job_salary_period?.toLowerCase() || 'yearly';
    }

    // Map employment type
    let employmentType = 'unknown';
    if (job.job_employment_type) {
        const type = job.job_employment_type.toLowerCase();
        if (type.includes('full')) employmentType = 'full-time';
        else if (type.includes('part')) employmentType = 'part-time';
        else if (type.includes('contract')) employmentType = 'contract';
        else if (type.includes('intern')) employmentType = 'internship';
    }

    // Build location string
    let location = 'Remote';
    if (job.job_city || job.job_state || job.job_country) {
        const parts = [job.job_city, job.job_state, job.job_country].filter(Boolean);
        location = parts.join(', ') || 'Remote';
    }

    return {
        externalId,
        title: job.job_title || 'Untitled Position',
        company: job.employer_name || 'Unknown Company',
        location,
        description: job.job_description || '',
        descriptionSnippet: job.job_highlights?.Qualifications?.[0] ||
            (job.job_description?.substring(0, 300) + '...') || '',
        employmentType,
        isRemote: job.job_is_remote || false,
        salary,
        applyLink: job.job_apply_link || job.job_google_link || '#',
        companyLogo: job.employer_logo || null,
        postedAt: job.job_posted_at_datetime_utc ? new Date(job.job_posted_at_datetime_utc) : null,
        expiresAt: job.job_offer_expiration_datetime_utc ? new Date(job.job_offer_expiration_datetime_utc) : null,
        source: 'rapidapi-jsearch',
        sourceUrl: job.job_google_link || null,
        skills: job.job_required_skills || []
    };
};

/**
 * Check if API is configured and accessible
 */
export const checkApiHealth = async () => {
    if (!RAPIDAPI_KEY) {
        return { healthy: false, error: 'RAPIDAPI_KEY not configured' };
    }

    try {
        // Make a minimal test request
        await rapidApiClient.get('/search', {
            params: { query: 'test', page: '1', num_pages: '1' }
        });
        return { healthy: true };
    } catch (error) {
        return {
            healthy: false,
            error: error.response?.status === 429 ? 'Rate limited' : error.message
        };
    }
};

export default {
    searchJobs,
    checkApiHealth
};

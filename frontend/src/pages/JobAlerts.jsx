import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Bell,
    Plus,
    Search,
    Briefcase,
    MapPin,
    Mail,
    ExternalLink,
    Loader2,
    AlertCircle,
    Sparkles,
    TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import { jobAlertsApi, jobsApi } from '../services/api';
import { JobAlertModal, JobAlertsList } from '../components';

export default function JobAlerts() {
    const [activeTab, setActiveTab] = useState('alerts'); // 'alerts' | 'search' | 'matches'
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await jobAlertsApi.getStats();
            setStats(response.stats);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setSearchLoading(true);
        try {
            const response = await jobsApi.search(searchQuery);
            setSearchResults(response.jobs || []);
            if (response.jobs?.length === 0) {
                toast('No jobs found for this search', { icon: '📭' });
            }
        } catch (err) {
            toast.error(err.message || 'Search failed');
        } finally {
            setSearchLoading(false);
        }
    };

    const handleCreateAlertFromSearch = () => {
        // Pre-fill modal with search query
        setIsModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero Section */}
            <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white">
                <div className="max-w-6xl mx-auto px-4 py-12">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-3">
                                <Bell className="w-8 h-8" />
                                Job Alerts
                            </h1>
                            <p className="mt-2 text-indigo-100 max-w-xl">
                                Set up personalized job alerts and never miss an opportunity.
                                We'll email you when new jobs match your criteria.
                            </p>
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-all shadow-lg"
                        >
                            <Plus className="w-5 h-5" />
                            Create Alert
                        </button>
                    </div>

                    {/* Quick Stats */}
                    {stats && (
                        <div className="grid grid-cols-4 gap-4 mt-8">
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                <div className="text-3xl font-bold">{stats.totalAlerts || 0}</div>
                                <div className="text-indigo-100 text-sm">Total Alerts</div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                <div className="text-3xl font-bold">{stats.activeAlerts || 0}</div>
                                <div className="text-indigo-100 text-sm">Active Alerts</div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                <div className="text-3xl font-bold">{stats.totalJobsFound || 0}</div>
                                <div className="text-indigo-100 text-sm">Jobs Found</div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                <div className="text-3xl font-bold">{stats.totalEmailsSent || 0}</div>
                                <div className="text-indigo-100 text-sm">Emails Sent</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="max-w-6xl mx-auto px-4">
                <div className="flex gap-2 -mt-5">
                    {[
                        { id: 'alerts', label: 'My Alerts', icon: Bell },
                        { id: 'search', label: 'Search Jobs', icon: Search },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-medium transition-all ${activeTab === tab.id
                                    ? 'bg-white text-indigo-600 shadow-lg'
                                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 py-8">
                {activeTab === 'alerts' && (
                    <JobAlertsList />
                )}

                {activeTab === 'search' && (
                    <div className="space-y-6">
                        {/* Search Form */}
                        <div className="bg-white rounded-2xl shadow-sm border p-6">
                            <form onSubmit={handleSearch} className="flex gap-4">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search jobs by title, skills, or company..."
                                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={searchLoading}
                                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {searchLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Search className="w-5 h-5" />
                                    )}
                                    Search
                                </button>
                            </form>

                            {searchQuery && !searchLoading && (
                                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                                    <p className="text-sm text-gray-500">
                                        Want to get notified about "{searchQuery}" jobs?
                                    </p>
                                    <button
                                        onClick={handleCreateAlertFromSearch}
                                        className="text-sm text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        Create Alert
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Search Results ({searchResults.length} jobs)
                                </h3>
                                {searchResults.map((job, index) => (
                                    <JobCard key={job.id || index} job={job} index={index} />
                                ))}
                            </div>
                        )}

                        {/* Empty State */}
                        {!searchLoading && searchResults.length === 0 && !searchQuery && (
                            <div className="text-center py-16">
                                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-700">Search for Jobs</h3>
                                <p className="text-gray-500 mt-2 max-w-md mx-auto">
                                    Enter a job title, skill, or company name to find matching opportunities.
                                    You can then create an alert to get notified about new matches.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal */}
            <JobAlertModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchStats}
            />
        </div>
    );
}

// Job Card Component
function JobCard({ job, index }) {
    const handleApply = () => {
        if (job.applyLink) {
            window.open(job.applyLink, '_blank');
        }
    };

    const handleEmail = () => {
        if (job.recruiterEmail) {
            window.location.href = `mailto:${job.recruiterEmail}?subject=Application for ${job.title}`;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-xl border-2 border-gray-100 p-5 hover:shadow-md hover:border-indigo-100 transition-all"
        >
            <div className="flex items-start gap-4">
                {/* Company Logo or Initial */}
                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                    {job.company?.charAt(0) || 'J'}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <span className="text-xs text-gray-400 font-medium">#{index + 1}</span>
                            <h3 className="font-semibold text-gray-900 text-lg">{job.title}</h3>
                            <p className="text-indigo-600 font-medium">{job.company}</p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 flex-shrink-0">
                            {job.applyLink && (
                                <button
                                    onClick={handleApply}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors text-sm"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Apply
                                </button>
                            )}
                            {job.recruiterEmail && (
                                <button
                                    onClick={handleEmail}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
                                >
                                    <Mail className="w-4 h-4" />
                                    Email
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {job.location || 'Remote'}
                        </span>
                        <span className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4" />
                            {job.employmentType || 'Full-time'}
                        </span>
                        {job.salary?.min && (
                            <span className="text-green-600 font-medium">
                                ${job.salary.min.toLocaleString()} - ${job.salary.max?.toLocaleString() || '+'} / {job.salary.period || 'year'}
                            </span>
                        )}
                    </div>

                    {job.description && (
                        <p className="mt-3 text-gray-600 text-sm line-clamp-2">
                            {job.description.substring(0, 200)}...
                        </p>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

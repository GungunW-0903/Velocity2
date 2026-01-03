import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Bell,
    BellOff,
    Plus,
    Trash2,
    Edit2,
    Play,
    MapPin,
    Clock,
    Briefcase,
    Loader2,
    AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { jobAlertsApi } from '../services/api';
import JobAlertModal from './JobAlertModal';

export default function JobAlertsList() {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAlert, setEditingAlert] = useState(null);
    const [testingId, setTestingId] = useState(null);

    const fetchAlerts = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await jobAlertsApi.getAll();
            setAlerts(response.alerts || []);
        } catch (err) {
            setError(err.message || 'Failed to load alerts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
    }, []);

    const handleToggle = async (alertId) => {
        try {
            const result = await jobAlertsApi.toggle(alertId);
            setAlerts(prev => prev.map(alert =>
                alert._id === alertId ? { ...alert, isActive: result.isActive } : alert
            ));
            toast.success(result.isActive ? 'Alert activated' : 'Alert paused');
        } catch (err) {
            toast.error(err.message || 'Failed to toggle alert');
        }
    };

    const handleDelete = async (alertId) => {
        if (!confirm('Are you sure you want to delete this alert?')) return;

        try {
            await jobAlertsApi.delete(alertId);
            setAlerts(prev => prev.filter(alert => alert._id !== alertId));
            toast.success('Alert deleted');
        } catch (err) {
            toast.error(err.message || 'Failed to delete alert');
        }
    };

    const handleTest = async (alertId) => {
        setTestingId(alertId);
        try {
            const result = await jobAlertsApi.test(alertId);
            toast.success(`Found ${result.result?.newJobs || 0} new jobs!`);
        } catch (err) {
            toast.error(err.message || 'Failed to test alert');
        } finally {
            setTestingId(null);
        }
    };

    const handleEdit = (alert) => {
        setEditingAlert(alert);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingAlert(null);
    };

    const formatDate = (date) => {
        if (!date) return 'Never';
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getFrequencyBadge = (frequency) => {
        const colors = {
            realtime: 'bg-green-100 text-green-700',
            daily: 'bg-blue-100 text-blue-700',
            weekly: 'bg-purple-100 text-purple-700'
        };
        return colors[frequency] || 'bg-gray-100 text-gray-700';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-gray-600">{error}</p>
                <button
                    onClick={fetchAlerts}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Job Alerts</h2>
                    <p className="text-gray-500 mt-1">
                        Get notified when jobs matching your criteria are posted
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200"
                >
                    <Plus className="w-5 h-5" />
                    Create Alert
                </button>
            </div>

            {/* Alerts List */}
            {alerts.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-700">No job alerts yet</h3>
                    <p className="text-gray-500 mt-2 max-w-sm mx-auto">
                        Create your first alert to get notified about new job opportunities
                    </p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="mt-6 px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                    >
                        Create Your First Alert
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* 1-indexed list display */}
                    {alerts.map((alert, index) => (
                        <motion.div
                            key={alert._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`bg-white rounded-xl border-2 p-5 transition-all hover:shadow-md ${alert.isActive ? 'border-gray-200' : 'border-gray-100 opacity-60'
                                }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    {/* 1-indexed alert number */}
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${alert.isActive
                                            ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white'
                                            : 'bg-gray-200 text-gray-500'
                                        }`}>
                                        {index + 1}
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-semibold text-gray-900 text-lg">{alert.title}</h3>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getFrequencyBadge(alert.frequency)}`}>
                                                {alert.frequency}
                                            </span>
                                            {!alert.isActive && (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                                    Paused
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                                            {alert.location && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-4 h-4" />
                                                    {alert.location}
                                                </span>
                                            )}
                                            {alert.remoteOnly && (
                                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                                                    Remote Only
                                                </span>
                                            )}
                                            {alert.employmentType?.length > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <Briefcase className="w-4 h-4" />
                                                    {alert.employmentType.join(', ')}
                                                </span>
                                            )}
                                        </div>

                                        {alert.keywords?.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-3">
                                                {alert.keywords.map((kw, i) => (
                                                    <span
                                                        key={i}
                                                        className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-xs font-medium"
                                                    >
                                                        {kw}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                Last checked: {formatDate(alert.lastCheckedAt)}
                                            </span>
                                            <span>
                                                {alert.totalJobsFound || 0} jobs found
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleTest(alert._id)}
                                        disabled={testingId === alert._id}
                                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                        title="Test alert now"
                                    >
                                        {testingId === alert._id ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Play className="w-5 h-5" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => handleToggle(alert._id)}
                                        className={`p-2 rounded-lg transition-colors ${alert.isActive
                                                ? 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'
                                                : 'text-orange-600 hover:bg-orange-50'
                                            }`}
                                        title={alert.isActive ? 'Pause alert' : 'Activate alert'}
                                    >
                                        {alert.isActive ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                                    </button>
                                    <button
                                        onClick={() => handleEdit(alert)}
                                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                        title="Edit alert"
                                    >
                                        <Edit2 className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(alert._id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete alert"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Modal */}
            <JobAlertModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                onSuccess={fetchAlerts}
                editAlert={editingAlert}
            />
        </div>
    );
}

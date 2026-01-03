import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, MapPin, DollarSign, Briefcase, Tag, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { jobAlertsApi } from '../services/api';

const EMPLOYMENT_TYPES = [
    { value: 'full-time', label: 'Full-time' },
    { value: 'part-time', label: 'Part-time' },
    { value: 'contract', label: 'Contract' },
    { value: 'internship', label: 'Internship' }
];

const FREQUENCY_OPTIONS = [
    { value: 'realtime', label: 'Real-time', description: 'Instant notifications' },
    { value: 'daily', label: 'Daily', description: 'Once per day digest' },
    { value: 'weekly', label: 'Weekly', description: 'Weekly summary' }
];

export default function JobAlertModal({ isOpen, onClose, onSuccess, editAlert = null }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: editAlert?.title || '',
        keywords: editAlert?.keywords?.join(', ') || '',
        location: editAlert?.location || '',
        remoteOnly: editAlert?.remoteOnly || false,
        salaryMin: editAlert?.salaryMin || '',
        salaryMax: editAlert?.salaryMax || '',
        employmentType: editAlert?.employmentType || ['full-time'],
        frequency: editAlert?.frequency || 'daily'
    });

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleEmploymentTypeChange = (type) => {
        setFormData(prev => {
            const current = prev.employmentType;
            if (current.includes(type)) {
                return { ...prev, employmentType: current.filter(t => t !== type) };
            }
            return { ...prev, employmentType: [...current, type] };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title.trim()) {
            toast.error('Please enter an alert title');
            return;
        }

        setLoading(true);
        try {
            const alertData = {
                title: formData.title.trim(),
                keywords: formData.keywords.split(',').map(k => k.trim()).filter(Boolean),
                location: formData.location.trim(),
                remoteOnly: formData.remoteOnly,
                salaryMin: formData.salaryMin ? Number(formData.salaryMin) : null,
                salaryMax: formData.salaryMax ? Number(formData.salaryMax) : null,
                employmentType: formData.employmentType,
                frequency: formData.frequency
            };

            if (editAlert) {
                await jobAlertsApi.update(editAlert._id, alertData);
                toast.success('Alert updated successfully!');
            } else {
                await jobAlertsApi.create(alertData);
                toast.success('Job alert created! 🎉');
            }

            onSuccess?.();
            onClose();
        } catch (error) {
            toast.error(error.message || 'Failed to save alert');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-lg">
                                    <Bell className="w-5 h-5 text-white" />
                                </div>
                                <h2 className="text-xl font-semibold text-white">
                                    {editAlert ? 'Edit Job Alert' : 'Create Job Alert'}
                                </h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-white" />
                            </button>
                        </div>
                        <p className="mt-2 text-indigo-100 text-sm">
                            Get notified when new jobs match your preferences
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {/* Alert Title */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                <Briefcase className="w-4 h-4 inline mr-1.5" />
                                Job Title *
                            </label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                placeholder="e.g., Frontend Developer"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                required
                            />
                        </div>

                        {/* Keywords */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                <Tag className="w-4 h-4 inline mr-1.5" />
                                Keywords (comma separated)
                            </label>
                            <input
                                type="text"
                                name="keywords"
                                value={formData.keywords}
                                onChange={handleInputChange}
                                placeholder="e.g., React, TypeScript, Remote"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                            />
                        </div>

                        {/* Location + Remote */}
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    <MapPin className="w-4 h-4 inline mr-1.5" />
                                    Location
                                </label>
                                <input
                                    type="text"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleInputChange}
                                    placeholder="e.g., San Francisco, CA"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                    disabled={formData.remoteOnly}
                                />
                            </div>
                            <div className="flex items-end pb-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="remoteOnly"
                                        checked={formData.remoteOnly}
                                        onChange={handleInputChange}
                                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-gray-700">Remote only</span>
                                </label>
                            </div>
                        </div>

                        {/* Salary Range */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                <DollarSign className="w-4 h-4 inline mr-1.5" />
                                Salary Range (USD/year)
                            </label>
                            <div className="flex gap-3 items-center">
                                <input
                                    type="number"
                                    name="salaryMin"
                                    value={formData.salaryMin}
                                    onChange={handleInputChange}
                                    placeholder="Min"
                                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                />
                                <span className="text-gray-400">to</span>
                                <input
                                    type="number"
                                    name="salaryMax"
                                    value={formData.salaryMax}
                                    onChange={handleInputChange}
                                    placeholder="Max"
                                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Employment Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Employment Type
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {EMPLOYMENT_TYPES.map(type => (
                                    <button
                                        key={type.value}
                                        type="button"
                                        onClick={() => handleEmploymentTypeChange(type.value)}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${formData.employmentType.includes(type.value)
                                                ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300'
                                                : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                                            }`}
                                    >
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Frequency */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Zap className="w-4 h-4 inline mr-1.5" />
                                Notification Frequency
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {FREQUENCY_OPTIONS.map(option => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, frequency: option.value }))}
                                        className={`p-3 rounded-lg border-2 text-center transition-all ${formData.frequency === option.value
                                                ? 'border-indigo-500 bg-indigo-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className={`text-sm font-medium ${formData.frequency === option.value ? 'text-indigo-700' : 'text-gray-700'
                                            }`}>
                                            {option.label}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            {option.description}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Saving...' : (editAlert ? 'Update Alert' : 'Create Alert')}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

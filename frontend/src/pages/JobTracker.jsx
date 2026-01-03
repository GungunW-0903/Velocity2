import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Briefcase, 
  MapPin, 
  Calendar, 
  ExternalLink, 
  MoreVertical,
  Trash2,
  Edit3,
  CheckCircle2,
  Clock,
  XCircle,
  Send,
  Star,
  MessageSquare,
  ChevronDown,
  Filter,
  Search,
  Plus,
  Building2,
  TrendingUp,
  Target,
  Loader2
} from 'lucide-react'
import { jobTrackerApi } from '../services/api'
import Navbar from '../components/Navbar'
import Button from '../components/Button'
import Card from '../components/Card'

const STATUS_CONFIG = {
  saved: {
    label: 'Saved',
    color: 'bg-gray-100 text-gray-700',
    icon: Star,
    description: 'Jobs you\'re interested in'
  },
  applied: {
    label: 'Applied',
    color: 'bg-blue-100 text-blue-700',
    icon: Send,
    description: 'Applications submitted'
  },
  interviewing: {
    label: 'Interviewing',
    color: 'bg-purple-100 text-purple-700',
    icon: MessageSquare,
    description: 'In interview process'
  },
  offered: {
    label: 'Offered',
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle2,
    description: 'Received offer'
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-700',
    icon: XCircle,
    description: 'Application declined'
  }
}

const STATUSES = Object.keys(STATUS_CONFIG)

export default function JobTracker() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({})
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingJob, setEditingJob] = useState(null)
  const [showStatusMenu, setShowStatusMenu] = useState(null)
  const [noteInput, setNoteInput] = useState('')

  useEffect(() => {
    fetchJobs()
    fetchStats()
  }, [])

  const fetchJobs = async () => {
    try {
      const response = await jobTrackerApi.getAll()
      setJobs(response.trackedJobs || [])
    } catch (error) {
      console.error('Failed to load tracked jobs:', error)
      // Use mock data for demonstration if API fails
      setJobs([])
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await jobTrackerApi.getStats()
      setStats(response.stats || {})
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const handleUpdateStatus = async (jobId, newStatus) => {
    try {
      await jobTrackerApi.updateStatus(jobId, newStatus)
      setJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, status: newStatus, updatedAt: new Date().toISOString() } : job
      ))
      setShowStatusMenu(null)
      toast.success(`Status updated to ${STATUS_CONFIG[newStatus].label}`)
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  const handleAddNote = async (jobId) => {
    if (!noteInput.trim()) return

    try {
      const job = jobs.find(j => j.id === jobId)
      await jobTrackerApi.updateStatus(jobId, job.status, noteInput)
      setJobs(prev => prev.map(j => 
        j.id === jobId 
          ? { ...j, notes: [...(j.notes || []), { text: noteInput, createdAt: new Date().toISOString() }] }
          : j
      ))
      setNoteInput('')
      setEditingJob(null)
      toast.success('Note added')
    } catch (error) {
      toast.error('Failed to add note')
    }
  }

  const handleDeleteJob = async (jobId) => {
    if (!confirm('Are you sure you want to remove this job from tracker?')) return

    try {
      await jobTrackerApi.delete(jobId)
      setJobs(prev => prev.filter(j => j.id !== jobId))
      toast.success('Job removed from tracker')
    } catch (error) {
      toast.error('Failed to remove job')
    }
  }

  const filteredJobs = jobs.filter(job => {
    const matchesFilter = activeFilter === 'all' || job.status === activeFilter
    const matchesSearch = job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.company?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusCounts = () => {
    const counts = { all: jobs.length }
    STATUSES.forEach(status => {
      counts[status] = jobs.filter(j => j.status === status).length
    })
    return counts
  }

  const statusCounts = getStatusCounts()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Job Tracker</h1>
            <p className="text-gray-600 mt-1">Track and manage your job applications</p>
          </div>
          <Link to="/jobs">
            <Button variant="primary" className="flex items-center gap-2 shadow-lg shadow-indigo-200">
              <Plus className="w-4 h-4" />
              Find More Jobs
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {STATUSES.map(status => {
            const config = STATUS_CONFIG[status]
            const Icon = config.icon
            const count = statusCounts[status]
            
            return (
              <motion.button
                key={status}
                onClick={() => setActiveFilter(status)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`p-4 rounded-xl transition-all text-left ${
                  activeFilter === status 
                    ? 'bg-white shadow-lg ring-2 ring-indigo-500' 
                    : 'bg-white/60 hover:bg-white hover:shadow-md'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${config.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-sm text-gray-600">{config.label}</p>
              </motion.button>
            )
          })}
        </div>

        {/* Filters and Search */}
        <Card className="!p-4 mb-6 border-0 shadow-md">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Status Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeFilter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All ({statusCounts.all})
              </button>
              {STATUSES.map(status => (
                <button
                  key={status}
                  onClick={() => setActiveFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeFilter === status
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {STATUS_CONFIG[status].label} ({statusCounts[status]})
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search jobs..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        </Card>

        {/* Jobs List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            <p className="text-gray-600 mt-4">Loading your applications...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <Card className="text-center py-16 border-0 shadow-md">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {jobs.length === 0 ? 'No tracked jobs yet' : 'No jobs match your filter'}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {jobs.length === 0 
                ? 'Start by searching for jobs and saving the ones you\'re interested in'
                : 'Try adjusting your filters or search query'
              }
            </p>
            <Link to="/jobs">
              <Button variant="primary" className="flex items-center gap-2 mx-auto">
                <Search className="w-4 h-4" />
                Search Jobs
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filteredJobs.map((job, index) => {
                const statusConfig = STATUS_CONFIG[job.status] || STATUS_CONFIG.saved
                const StatusIcon = statusConfig.icon
                
                return (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="!p-0 border-0 shadow-md hover:shadow-lg transition-all overflow-hidden">
                      <div className="p-5">
                        <div className="flex justify-between items-start">
                          <div className="flex gap-4">
                            {/* Company Icon */}
                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-6 h-6 text-indigo-600" />
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {job.title}
                                </h3>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusConfig.color}`}>
                                  <StatusIcon className="w-3 h-3" />
                                  {statusConfig.label}
                                </span>
                              </div>
                              
                              <p className="text-gray-600 font-medium">{job.company}</p>
                              
                              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  {job.location || 'Remote'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Briefcase className="w-4 h-4" />
                                  {job.jobType || 'Full-time'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  Added {formatDate(job.createdAt)}
                                </span>
                              </div>

                              {/* Notes */}
                              {job.notes && job.notes.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  {job.notes.slice(-2).map((note, i) => (
                                    <div key={i} className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                                      <span className="text-gray-400 text-xs">{formatDate(note.createdAt)}:</span> {note.text}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Add Note Input */}
                              {editingJob === job.id && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  className="mt-3 flex gap-2"
                                >
                                  <input
                                    type="text"
                                    value={noteInput}
                                    onChange={(e) => setNoteInput(e.target.value)}
                                    placeholder="Add a note..."
                                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                                    autoFocus
                                  />
                                  <Button
                                    variant="primary"
                                    onClick={() => handleAddNote(job.id)}
                                    className="!py-2"
                                  >
                                    Add
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => { setEditingJob(null); setNoteInput(''); }}
                                    className="!py-2"
                                  >
                                    Cancel
                                  </Button>
                                </motion.div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            {/* Status Dropdown */}
                            <div className="relative">
                              <button
                                onClick={() => setShowStatusMenu(showStatusMenu === job.id ? null : job.id)}
                                className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center gap-2 text-sm"
                              >
                                Update Status
                                <ChevronDown className="w-4 h-4" />
                              </button>
                              
                              {showStatusMenu === job.id && (
                                <motion.div
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border py-2 z-10"
                                >
                                  {STATUSES.map(status => {
                                    const config = STATUS_CONFIG[status]
                                    const Icon = config.icon
                                    return (
                                      <button
                                        key={status}
                                        onClick={() => handleUpdateStatus(job.id, status)}
                                        className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 ${
                                          job.status === status ? 'bg-indigo-50 text-indigo-600' : ''
                                        }`}
                                      >
                                        <Icon className="w-4 h-4" />
                                        {config.label}
                                      </button>
                                    )
                                  })}
                                </motion.div>
                              )}
                            </div>

                            {/* More Actions */}
                            <button
                              onClick={() => setEditingJob(editingJob === job.id ? null : job.id)}
                              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                              title="Add note"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            
                            {job.applyLink && (
                              <a
                                href={job.applyLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                                title="Open application"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            
                            <button
                              onClick={() => handleDeleteJob(job.id)}
                              className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600"
                              title="Remove"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Timeline indicator */}
                      <div className={`h-1 ${
                        job.status === 'offered' ? 'bg-gradient-to-r from-green-400 to-green-500' :
                        job.status === 'interviewing' ? 'bg-gradient-to-r from-purple-400 to-purple-500' :
                        job.status === 'applied' ? 'bg-gradient-to-r from-blue-400 to-blue-500' :
                        job.status === 'rejected' ? 'bg-gradient-to-r from-red-400 to-red-500' :
                        'bg-gradient-to-r from-gray-300 to-gray-400'
                      }`} />
                    </Card>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Quick Tips */}
        {jobs.length > 0 && (
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <Card className="!p-6 border-0 shadow-md bg-gradient-to-br from-indigo-50 to-white">
              <TrendingUp className="w-8 h-8 text-indigo-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Stay Organized</h3>
              <p className="text-sm text-gray-600">
                Update your application statuses regularly to keep track of your progress
              </p>
            </Card>
            <Card className="!p-6 border-0 shadow-md bg-gradient-to-br from-green-50 to-white">
              <Target className="w-8 h-8 text-green-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Add Notes</h3>
              <p className="text-sm text-gray-600">
                Keep notes about interview dates, contacts, and important details
              </p>
            </Card>
            <Card className="!p-6 border-0 shadow-md bg-gradient-to-br from-purple-50 to-white">
              <Star className="w-8 h-8 text-purple-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Follow Up</h3>
              <p className="text-sm text-gray-600">
                Don't forget to follow up on applications after a week of no response
              </p>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

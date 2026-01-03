import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { 
  FileText, 
  Briefcase, 
  Search, 
  Plus,
  ArrowRight,
  CheckCircle2,
  Send,
  Star,
  MessageSquare,
  Zap,
  Target,
  BarChart3,
  Sparkles
} from 'lucide-react'
import { resumeApi, jobTrackerApi } from '../services/api'
import Navbar from '../components/Navbar'
import Button from '../components/Button'
import Card from '../components/Card'

const STATUS_CONFIG = {
  saved: { label: 'Saved', color: 'bg-gray-100 text-gray-700', icon: Star },
  applied: { label: 'Applied', color: 'bg-blue-100 text-blue-700', icon: Send },
  interviewing: { label: 'Interviewing', color: 'bg-purple-100 text-purple-700', icon: MessageSquare },
  offered: { label: 'Offered', color: 'bg-green-100 text-green-700', icon: CheckCircle2 }
}

export default function Dashboard() {
  const [resumes, setResumes] = useState([])
  const [trackedJobs, setTrackedJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [jobStats, setJobStats] = useState({
    total: 0,
    saved: 0,
    applied: 0,
    interviewing: 0,
    offered: 0
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [resumeRes, jobsRes] = await Promise.all([
        resumeApi.getAll().catch(() => ({ resumes: [] })),
        jobTrackerApi.getAll().catch(() => ({ trackedJobs: [] }))
      ])
      
      setResumes(resumeRes.resumes || resumeRes.data?.resumes || [])
      const jobs = jobsRes.trackedJobs || []
      setTrackedJobs(jobs)
      
      const stats = {
        total: jobs.length,
        saved: jobs.filter(j => j.status === 'saved').length,
        applied: jobs.filter(j => j.status === 'applied').length,
        interviewing: jobs.filter(j => j.status === 'interviewing').length,
        offered: jobs.filter(j => j.status === 'offered').length
      }
      setJobStats(stats)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900">Welcome to Velocity</h1>
          <p className="text-gray-600 mt-1">Your all-in-one job search command center</p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            {/* Quick Actions */}
            <motion.div variants={itemVariants} className="grid md:grid-cols-3 gap-4 mb-8">
              <Link to="/jobs">
                <Card className="!p-6 hover:shadow-lg transition-all cursor-pointer group border-0 shadow-md bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                        <Search className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-semibold mb-1">Search Jobs</h3>
                      <p className="text-indigo-100 text-sm">Find your next opportunity</p>
                    </div>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Card>
              </Link>

              <Link to="/job-tracker">
                <Card className="!p-6 hover:shadow-lg transition-all cursor-pointer group border-0 shadow-md bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                        <Briefcase className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-semibold mb-1">Job Tracker</h3>
                      <p className="text-green-100 text-sm">{jobStats.total} applications tracked</p>
                    </div>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Card>
              </Link>

              <Link to="/upload">
                <Card className="!p-6 hover:shadow-lg transition-all cursor-pointer group border-0 shadow-md bg-gradient-to-br from-orange-500 to-pink-600 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-semibold mb-1">Enhance Resume</h3>
                      <p className="text-orange-100 text-sm">AI-powered optimization</p>
                    </div>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Card>
              </Link>
            </motion.div>

            {/* Stats Row */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <Card className="!p-4 border-0 shadow-sm text-center">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Star className="w-5 h-5 text-gray-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{jobStats.saved}</p>
                <p className="text-xs text-gray-500">Saved</p>
              </Card>
              <Card className="!p-4 border-0 shadow-sm text-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Send className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{jobStats.applied}</p>
                <p className="text-xs text-gray-500">Applied</p>
              </Card>
              <Card className="!p-4 border-0 shadow-sm text-center">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{jobStats.interviewing}</p>
                <p className="text-xs text-gray-500">Interviewing</p>
              </Card>
              <Card className="!p-4 border-0 shadow-sm text-center">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{jobStats.offered}</p>
                <p className="text-xs text-gray-500">Offers</p>
              </Card>
              <Card className="!p-4 border-0 shadow-sm text-center">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{resumes.length}</p>
                <p className="text-xs text-gray-500">Resumes</p>
              </Card>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Recent Applications */}
              <motion.div variants={itemVariants}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Recent Applications</h2>
                  <Link to="/job-tracker" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1">
                    View all <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                
                {trackedJobs.length === 0 ? (
                  <Card className="text-center py-12 border-0 shadow-md">
                    <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="font-medium text-gray-900 mb-2">No applications yet</h3>
                    <p className="text-gray-500 text-sm mb-4">Start searching for jobs to track your applications</p>
                    <Link to="/jobs">
                      <Button variant="primary" className="text-sm">Search Jobs</Button>
                    </Link>
                  </Card>
                ) : (
                  <Card className="!p-0 border-0 shadow-md overflow-hidden">
                    <div className="divide-y">
                      {trackedJobs.slice(0, 5).map((job, index) => {
                        const statusConfig = STATUS_CONFIG[job.status] || STATUS_CONFIG.saved
                        const StatusIcon = statusConfig.icon
                        return (
                          <div key={job.id || index} className="p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{job.title}</h4>
                                <p className="text-sm text-gray-500">{job.company}</p>
                              </div>
                              <span className={"px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 " + statusConfig.color}>
                                <StatusIcon className="w-3 h-3" />
                                {statusConfig.label}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                )}
              </motion.div>

              {/* My Resumes */}
              <motion.div variants={itemVariants}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">My Resumes</h2>
                  <Link to="/upload" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1">
                    Upload new <Plus className="w-4 h-4" />
                  </Link>
                </div>
                
                {resumes.length === 0 ? (
                  <Card className="text-center py-12 border-0 shadow-md">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="font-medium text-gray-900 mb-2">No resumes yet</h3>
                    <p className="text-gray-500 text-sm mb-4">Upload your resume to get AI-powered enhancements</p>
                    <Link to="/upload">
                      <Button variant="primary" className="text-sm">Upload Resume</Button>
                    </Link>
                  </Card>
                ) : (
                  <Card className="!p-0 border-0 shadow-md overflow-hidden">
                    <div className="divide-y">
                      {resumes.slice(0, 5).map(resume => (
                        <div key={resume.id} className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-900">{resume.title}</h4>
                                {resume.enhancedText && (
                                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">Enhanced</span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">{resume.jobRole || 'General'} • {formatDate(resume.createdAt)}</p>
                            </div>
                            <div className="flex gap-2">
                              <Link to={`/resume/${resume.id}`}>
                                <Button variant="outline" className="!py-1 !px-3 text-xs">View</Button>
                              </Link>
                              <Link to={`/enhance/${resume.id}`}>
                                <Button variant="primary" className="!py-1 !px-3 text-xs">Enhance</Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </motion.div>
            </div>

            {/* Tips Section */}
            <motion.div variants={itemVariants} className="mt-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Tips</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="!p-5 border-0 shadow-sm hover:shadow-md transition-all">
                  <Zap className="w-8 h-8 text-yellow-500 mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">Optimize Your Resume</h3>
                  <p className="text-sm text-gray-600">Use our AI to tailor your resume for each job application</p>
                </Card>
                <Card className="!p-5 border-0 shadow-sm hover:shadow-md transition-all">
                  <Target className="w-8 h-8 text-green-500 mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">Track Everything</h3>
                  <p className="text-sm text-gray-600">Keep notes and update statuses to stay organized in your job hunt</p>
                </Card>
                <Card className="!p-5 border-0 shadow-sm hover:shadow-md transition-all">
                  <BarChart3 className="w-8 h-8 text-purple-500 mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">Follow Up</h3>
                  <p className="text-sm text-gray-600">Don't forget to follow up on applications after a week</p>
                </Card>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

"use client"

// JobConnect - Job Board Application

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/supabase"
import NextLink from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  Briefcase, Building2, Users, Search, MapPin, DollarSign, Clock,
  ChevronDown, X, Menu, LogOut, User, FileText, Bell, Plus,
  Settings, LayoutDashboard, Building, Trash2, Eye, CheckCircle,
  XCircle, AlertCircle, Upload, Filter, Globe, Mail, Phone,
  Calendar, Award, GraduationCap, Link, TrendingUp, UserCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"

// Types
interface Job {
  id: string
  title: string
  description: string
  requirements: string | null
  responsibilities: string | null
  country: string | null
  city: string | null
  workMode: string
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: string
  salaryPeriod: string
  jobType: string
  experienceLevel: string | null
  skills: string | null
  status: string
  createdAt: string
  company: {
    id: string
    companyName: string
    logo: string | null
    user: {
      name: string
      profilePicture: string | null
    }
  }
  _count?: {
    applications: number
  }
  hasApplied?: boolean
}

interface Application {
  id: string
  status: string
  createdAt: string
  coverLetter: string | null
  resume: string | null
  job: Job
  user: {
    id: string
    name: string
    email: string
    profilePicture: string | null
    phone: string | null
    headline: string | null
    skills: string | null
    experience: string | null
    education: string | null
    resume: string | null
  }
}

interface Company {
  id: string
  companyName: string
  description: string | null
  website: string | null
  logo: string | null
  industry: string | null
  companySize: string | null
  foundedYear: number | null
  country: string | null
  city: string | null
  isVerified: boolean
  user: {
    id: string
    email: string
    name: string
    profilePicture: string | null
  }
  _count?: {
    jobs: number
  }
}

interface Notification {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
  user: {
    id: string
    name: string
    email: string
    profilePicture: string | null
  }
}

export default function JobBoardApp() {
  const { user, session, loading, signUp, signIn, signInWithGoogle, signOut, requireRoleSelection, requireEmailConfirmation, completeOnboarding } = useAuth()
  const router = useRouter()
  
  // Redirect to separate onboarding route if needed
  useEffect(() => {
    if (requireEmailConfirmation || requireRoleSelection) {
      router.push("/onboarding")
    }
  }, [requireEmailConfirmation, requireRoleSelection, router])

  // View state - can manually toggle between views when logged in
  const [showDashboard, setShowDashboard] = useState(false)
  // Active view is derived from session + user preference
  const activeView = session && showDashboard ? "dashboard" : "landing"
  const [jobs, setJobs] = useState<Job[]>([])
  const [myJobs, setMyJobs] = useState<Job[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [notifications, setNotifications] = useState<{ notifications: Notification[]; unreadCount: number }>({ notifications: [], unreadCount: 0 })
  const [userProfile, setUserProfile] = useState<any>(null)
  const [companyProfile, setCompanyProfile] = useState<Company | null>(null)
  const [companyForm, setCompanyForm] = useState<any>({})
  const [expandedApplicant, setExpandedApplicant] = useState<string | null>(null)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProfession, setSelectedProfession] = useState("all_professions")
  const [selectedCountry, setSelectedCountry] = useState("")
  const [selectedCity, setSelectedCity] = useState("")
  const [selectedJobType, setSelectedJobType] = useState("all")
  const [selectedWorkMode, setSelectedWorkMode] = useState("all")
  
  // Modals
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<"login" | "register">("login")
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [showJobModal, setShowJobModal] = useState(false)
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [showPostJobModal, setShowPostJobModal] = useState(false)
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  // Dashboard tab
  const [dashboardTab, setDashboardTab] = useState("overview")
  
  // Admin state
  const [adminData, setAdminData] = useState<any>(null)
  const [adminCompaniesGrouped, setAdminCompaniesGrouped] = useState<any>({})
  const [adminUsersGrouped, setAdminUsersGrouped] = useState<any>({})

  // Form states
  const [loginForm, setLoginForm] = useState({ email: "", password: "" })
  const [registerForm, setRegisterForm] = useState({
    email: "", password: "", confirmPassword: "", name: "", phone: "",
    role: "JOB_SEEKER" as "JOB_SEEKER" | "COMPANY", country: "", city: ""
  })
  const [applyForm, setApplyForm] = useState({ coverLetter: "", resume: "" })
  const [jobForm, setJobForm] = useState({
    title: "", description: "", requirements: "", responsibilities: "",
    country: "", city: "", workMode: "ONSITE", salaryMin: "", salaryMax: "",
    jobType: "FULL_TIME", experienceLevel: "", skills: ""
  })

  // Initial data fetch
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const params: Record<string, string> = {}
        if (searchQuery) params.search = searchQuery
        if (selectedProfession && selectedProfession !== "all_professions") params.profession = selectedProfession
        if (selectedCountry) params.country = selectedCountry
        if (selectedCity) params.city = selectedCity
        if (selectedJobType && selectedJobType !== "all") params.job_type = selectedJobType
        if (selectedWorkMode && selectedWorkMode !== "all") params.work_mode = selectedWorkMode
        
        const [jobsData, companiesData] = await Promise.all([
          api.get("/jobs", params),
          api.get("/companies")
        ])
        setJobs(jobsData)
        setCompanies(companiesData)
      } catch (error) {
        console.error("Error fetching initial data:", error)
      }
    }
    loadInitialData()
  }, [searchQuery, selectedProfession, selectedCountry, selectedCity, selectedJobType, selectedWorkMode])

  // Fetch company-specific jobs
  const fetchMyJobs = useCallback(async () => {
    try {
      const data = await api.get("/jobs/my-jobs")
      setMyJobs(data)
    } catch (error) {
      console.error("Error fetching my jobs:", error)
    }
  }, [])

  // Handle session-based data loading
  useEffect(() => {
    const loadUserData = async () => {
      if (!user?.id) return
      
      // Fetch user profile
      try {
        const data = await api.get(`/users/${user.id}`)
        setUserProfile(data)
      } catch (error) {
        console.error("Error fetching user profile:", error)
      }
      
      // Fetch company profile if company user
      if (user.role === "COMPANY") {
        try {
          const data = await api.get("/companies/me")
          setCompanyProfile(data)
          setCompanyForm({
            companyName: data.companyName || "",
            website: data.website || "",
            industry: data.industry || "",
            companySize: data.companySize || "",
            country: data.country || "",
            city: data.city || "",
            description: data.description || "",
          })
        } catch (error) {
          console.error("Error fetching company profile:", error)
        }
        await fetchMyJobs()
      }
      
      // Fetch applications
      try {
        const data = await api.get("/applications")
        setApplications(data)
      } catch (error) {
        console.error("Error fetching applications:", error)
      }
      
      // Fetch notifications for company
      if (user.role === "COMPANY") {
        try {
          const data = await api.get("/notifications")
          setNotifications(data)
        } catch (error) {
          console.error("Error fetching notifications:", error)
        }
      }
      
      // Fetch admin data
      if (user.role === "SUPER_ADMIN") {
        try {
          const [stats, companiesData, usersData] = await Promise.all([
            api.get("/admin/stats"),
            api.get("/admin/companies"),
            api.get("/admin/users")
          ])
          setAdminData(stats)
          setAdminCompaniesGrouped(companiesData.grouped_by_country || {})
          setAdminUsersGrouped(usersData.grouped_by_country || {})
        } catch (error) {
          console.error("Error fetching admin data:", error)
        }
      }
    }
    
    loadUserData()
  }, [user, fetchMyJobs])

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('handleLogin called with:', loginForm.email)
    try {
      const { error } = await signIn(loginForm.email, loginForm.password)
      console.log('handleLogin result, error:', error)
      if (error) {
        toast.error(error.message || "Invalid email or password")
      } else {
        toast.success("Logged in successfully!")
        setShowAuthModal(false)
        setLoginForm({ email: "", password: "" })
      }
    } catch (error: any) {
      console.error('handleLogin exception:', error)
      toast.error(error.message || "Login failed")
    }
  }

  // Handle Google login
  const handleGoogleLogin = async () => {
    try {
      const { error } = await signInWithGoogle()
      if (error) {
        toast.error(error.message || "Google login failed")
      }
    } catch (error: any) {
      toast.error(error.message || "Google login failed")
    }
  }

  // Handle register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (registerForm.password !== registerForm.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    try {
      const { error } = await signUp(
        registerForm.email,
        registerForm.password,
        registerForm.name,
        registerForm.role
      )
      if (error) {
        toast.error(error.message || "Registration failed")
      } else {
        toast.success("Account created! Please check your email to verify.")
        setAuthMode("login")
        setRegisterForm({
          email: "", password: "", confirmPassword: "", name: "", phone: "",
          role: "JOB_SEEKER", country: "", city: ""
        })
      }
    } catch (error: any) {
      toast.error(error.message || "Registration failed")
    }
  }

  // Handle apply
  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedJob) return
    try {
      await api.post("/applications", {
        job_id: selectedJob.id,
        cover_letter: applyForm.coverLetter,
        resume: applyForm.resume
      })
      toast.success("Application submitted successfully!")
      setShowApplyModal(false)
      setApplyForm({ coverLetter: "", resume: "" })
      // Trigger refetch
      setSelectedCountry(selectedCountry)
    } catch (error: any) {
      toast.error(error.message || "Application failed")
    }
  }

  // Handle post job or edit job
  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      title: jobForm.title,
      description: jobForm.description,
      salary_min: parseInt(jobForm.salaryMin) || null,
      salary_max: parseInt(jobForm.salaryMax) || null,
      requirements: jobForm.requirements.split("\n").filter(Boolean),
      responsibilities: jobForm.responsibilities.split("\n").filter(Boolean),
      skills: jobForm.skills.split(",").map(s => s.trim()).filter(Boolean),
      country: jobForm.country,
      city: jobForm.city,
      work_mode: jobForm.workMode,
      job_type: jobForm.jobType,
      experience_level: jobForm.experienceLevel
    }
    try {
      if (editingJob) {
        await api.put(`/jobs/${editingJob.id}`, payload)
        toast.success("Job updated successfully!")
      } else {
        await api.post("/jobs", payload)
        toast.success("Job posted successfully!")
      }
      setShowPostJobModal(false)
      setEditingJob(null)
      setJobForm({
        title: "", description: "", requirements: "", responsibilities: "",
        country: "", city: "", workMode: "ONSITE", salaryMin: "", salaryMax: "",
        jobType: "FULL_TIME", experienceLevel: "", skills: ""
      })
      await fetchMyJobs()
    } catch (error: any) {
      toast.error(error.message || "Failed to save job")
    }
  }

  // Handle delete job
  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this job? This cannot be undone.")) return
    try {
      await api.delete(`/jobs/${jobId}`)
      toast.success("Job deleted!")
      await fetchMyJobs()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete job")
    }
  }

  // Handle save company profile
  const handleSaveCompanyProfile = async () => {
    if (!companyProfile) return
    try {
      const updated = await api.put(`/companies/${companyProfile.id}`, {
        company_name: companyForm.companyName,
        website: companyForm.website,
        industry: companyForm.industry,
        company_size: companyForm.companySize,
        country: companyForm.country,
        city: companyForm.city,
        description: companyForm.description,
      })
      setCompanyProfile((prev: any) => ({ ...prev, ...updated }))
      toast.success("Company profile saved!")
    } catch (error: any) {
      toast.error(error.message || "Failed to save profile")
    }
  }

  // Open edit job modal
  const handleEditJob = (job: Job) => {
    setEditingJob(job)
    const parseJson = (v: string | null) => {
      if (!v) return ""
      try { return JSON.parse(v).join("\n") } catch { return v }
    }
    const parseSkills = (v: string | null) => {
      if (!v) return ""
      try { return JSON.parse(v).join(", ") } catch { return v }
    }
    setJobForm({
      title: job.title,
      description: job.description,
      requirements: parseJson(job.requirements),
      responsibilities: parseJson(job.responsibilities),
      country: job.country || "",
      city: job.city || "",
      workMode: job.workMode,
      salaryMin: job.salaryMin?.toString() || "",
      salaryMax: job.salaryMax?.toString() || "",
      jobType: job.jobType,
      experienceLevel: job.experienceLevel || "",
      skills: parseSkills(job.skills),
    })
    setShowPostJobModal(true)
  }

  // Handle update application status
  const handleUpdateStatus = async (applicationId: string, status: string) => {
    try {
      await api.put(`/applications/${applicationId}`, { status })
      toast.success("Application status updated!")
      // Refetch applications
      try {
        setApplications(await api.get("/applications"))
      } catch (e) {}
      // Refetch notifications
      try {
        setNotifications(await api.get("/notifications"))
      } catch (e) {}
    } catch (error: any) {
      toast.error(error.message || "Failed to update status")
    }
  }

  // Handle delete (admin)
  const handleDelete = async (type: "user" | "company", id: string) => {
    if (!confirm("Are you sure you want to delete this?")) return
    try {
      await api.delete(`/admin/${type}s/${id}`)
      toast.success(`${type} deleted successfully!`)
      // Refetch admin data
      try {
        const [stats, companiesData, usersData] = await Promise.all([
          api.get("/admin/stats"),
          api.get("/admin/companies"),
          api.get("/admin/users")
        ])
        setAdminData(stats)
        setAdminCompaniesGrouped(companiesData.grouped_by_country || {})
        setAdminUsersGrouped(usersData.grouped_by_country || {})
      } catch (e) {}
    } catch (error: any) {
      toast.error(error.message || `Failed to delete ${type}`)
    }
  }

  // Format salary
  const formatSalary = (min: number | null, max: number | null, currency: string, period: string) => {
    if (!min && !max) return "Salary not disclosed"
    const formatNum = (n: number) => n.toLocaleString()
    const periodText = period === "yearly" ? "/year" : period === "monthly" ? "/month" : "/hour"
    if (min && max) return `${currency} ${formatNum(min)} - ${formatNum(max)}${periodText}`
    if (min) return `${currency} ${formatNum(min)}+${periodText}`
    return `Up to ${currency} ${formatNum(max ?? 0)}${periodText}`
  }

  // Work mode badge color
  const getWorkModeBadge = (mode: string) => {
    switch (mode) {
      case "REMOTE": return "bg-green-100 text-green-700 border-green-200"
      case "HYBRID": return "bg-blue-100 text-blue-700 border-blue-200"
      default: return "bg-purple-100 text-purple-700 border-purple-200"
    }
  }

  // Status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-yellow-100 text-yellow-700"
      case "REVIEWING": return "bg-blue-100 text-blue-700"
      case "INTERVIEWED": return "bg-purple-100 text-purple-700"
      case "ACCEPTED": return "bg-green-100 text-green-700"
      case "REJECTED": return "bg-red-100 text-red-700"
      case "WITHDRAWN": return "bg-gray-100 text-gray-700"
      default: return "bg-gray-100 text-gray-700"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                JobConnect
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <button 
                onClick={() => setShowDashboard(false)}
                className="text-slate-600 hover:text-blue-600 transition-colors font-medium"
              >
                Find Jobs
              </button>
              <button 
                onClick={() => setShowDashboard(false)}
                className="text-slate-600 hover:text-blue-600 transition-colors font-medium"
              >
                Companies
              </button>
              {user?.role === "JOB_SEEKER" && (
                <button 
                  onClick={() => { setShowDashboard(true); setDashboardTab("applied"); }}
                  className="text-slate-600 hover:text-blue-600 transition-colors font-medium"
                >
                  My Applications
                </button>
              )}
              {user?.role === "COMPANY" && (
                <button 
                  onClick={() => setShowPostJobModal(true)}
                  className="flex items-center gap-1 text-slate-600 hover:text-blue-600 transition-colors font-medium"
                >
                  <Plus className="w-4 h-4" /> Post a Job
                </button>
              )}
            </nav>

            <div className="flex items-center gap-3">
              {session && user ? (
                <>
                  {/* Notifications for Company */}
                  {user?.role === "COMPANY" && (
                    <div className="relative">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="relative"
                      >
                        <Bell className="w-5 h-5" />
                        {notifications.unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                            {notifications.unreadCount}
                          </span>
                        )}
                      </Button>
                    </div>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowDashboard(!showDashboard)}
                    className="hidden sm:flex"
                  >
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    {showDashboard ? "View Jobs" : "Dashboard"}
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user?.profile_picture || ""} />
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:block">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-slate-500 capitalize">{user?.role?.replace("_", " ").toLowerCase()}</p>
                    </div>
                  </div>
                  
                  <Button variant="outline" onClick={() => signOut()} className="ml-2 text-slate-600 hover:text-red-600 hover:bg-red-50">
                    <LogOut className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Log Out</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="ghost"
                    onClick={() => { setAuthMode("login"); setShowAuthModal(true); }}
                  >
                    Sign In
                  </Button>
                  <Button 
                    onClick={() => { setAuthMode("register"); setShowAuthModal(true); }}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    Get Started
                  </Button>
                </>
              )}
              
              {/* Mobile menu button */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Notifications Dropdown */}
        <AnimatePresence>
          {showNotifications && user?.role === "COMPANY" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-4 top-16 w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50"
            >
              <div className="p-4 border-b border-slate-100">
                <h3 className="font-semibold">Candidate Applications</h3>
              </div>
              <ScrollArea className="max-h-96">
                {notifications.notifications.length === 0 ? (
                  <div className="p-4 text-center text-slate-500">
                    No notifications yet
                  </div>
                ) : (
                  notifications.notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      className={`p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${!notif.isRead ? "bg-blue-50" : ""}`}
                      onClick={() => {
                        setDashboardTab("applications")
                        setShowNotifications(false)
                        setShowDashboard(true)
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={notif.user.profilePicture || ""} />
                          <AvatarFallback>{notif.user.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{notif.title}</p>
                          <p className="text-xs text-slate-500">{notif.message}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {new Date(notif.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main>
        <AnimatePresence mode="wait">
          {activeView === "landing" ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Hero Section */}
              <section className="relative py-20 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-indigo-600/5" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="text-center mb-12">
                    <motion.h1 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-4xl md:text-6xl font-bold mb-6"
                    >
                      Find Your{" "}
                      <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        Dream Job
                      </span>
                    </motion.h1>
                    <motion.p 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto"
                    >
                      Connect with top companies and discover opportunities that match your skills and ambitions.
                    </motion.p>

                    {/* Search Bar */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="max-w-4xl mx-auto"
                    >
                      <div className="flex flex-col sm:flex-row gap-3 p-3 bg-white rounded-2xl shadow-lg border border-slate-200">
                        <div className="flex-1 relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <Input
                            placeholder="Job title, keywords, or company"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 border-0 focus-visible:ring-0"
                          />
                        </div>
                        <Select value={selectedProfession} onValueChange={setSelectedProfession}>
                          <SelectTrigger className="w-full sm:w-48 border-0 bg-slate-50">
                            <SelectValue placeholder="Select profession" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all_professions">All Professions</SelectItem>
                            <SelectItem value="software">Software Development</SelectItem>
                            <SelectItem value="data">Data Science</SelectItem>
                            <SelectItem value="design">Design & UX</SelectItem>
                            <SelectItem value="marketing">Marketing</SelectItem>
                            <SelectItem value="sales">Sales</SelectItem>
                            <SelectItem value="finance">Finance</SelectItem>
                            <SelectItem value="hr">Human Resources</SelectItem>
                            <SelectItem value="engineering">Engineering</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex-1 relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <Input
                            placeholder="City or country"
                            value={selectedCity}
                            onChange={(e) => setSelectedCity(e.target.value)}
                            className="pl-10 border-0 focus-visible:ring-0"
                          />
                        </div>
                        <Button 
                          type="button"
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        >
                          Search Jobs
                        </Button>
                      </div>
                    </motion.div>
                  </div>

                  {/* Stats */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
                  >
                    {[
                      { label: "Active Jobs", value: jobs.length.toString(), icon: Briefcase },
                      { label: "Companies", value: companies.length.toString(), icon: Building2 },
                      { label: "Job Seekers", value: "10K+", icon: Users },
                      { label: "Hires", value: "5K+", icon: TrendingUp }
                    ].map((stat, i) => (
                      <div key={i} className="bg-white/80 backdrop-blur rounded-xl p-4 border border-slate-200">
                        <stat.icon className="w-6 h-6 text-blue-600 mb-2" />
                        <p className="text-2xl font-bold">{stat.value}</p>
                        <p className="text-sm text-slate-500">{stat.label}</p>
                      </div>
                    ))}
                  </motion.div>
                </div>
              </section>

              {/* Filters and Job Listings */}
              <section className="py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  {/* Filters */}
                  <div className="flex flex-wrap gap-3 mb-8">
                    <Select value={selectedProfession} onValueChange={setSelectedProfession}>
                      <SelectTrigger className="w-44 bg-white">
                        <SelectValue placeholder="Profession" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_professions">All Professions</SelectItem>
                        <SelectItem value="software">Software Development</SelectItem>
                        <SelectItem value="data">Data Science & Analytics</SelectItem>
                        <SelectItem value="design">Design & UX</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="finance">Finance & Accounting</SelectItem>
                        <SelectItem value="hr">Human Resources</SelectItem>
                        <SelectItem value="operations">Operations</SelectItem>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="engineering">Engineering</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={selectedJobType} onValueChange={setSelectedJobType}>
                      <SelectTrigger className="w-40 bg-white">
                        <SelectValue placeholder="Job Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="FULL_TIME">Full Time</SelectItem>
                        <SelectItem value="PART_TIME">Part Time</SelectItem>
                        <SelectItem value="CONTRACT">Contract</SelectItem>
                        <SelectItem value="INTERNSHIP">Internship</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={selectedWorkMode} onValueChange={setSelectedWorkMode}>
                      <SelectTrigger className="w-40 bg-white">
                        <SelectValue placeholder="Work Mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Modes</SelectItem>
                        <SelectItem value="REMOTE">Remote</SelectItem>
                        <SelectItem value="HYBRID">Hybrid</SelectItem>
                        <SelectItem value="ONSITE">On-site</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSearchQuery("")
                        setSelectedProfession("all_professions")
                        setSelectedCountry("")
                        setSelectedCity("")
                        setSelectedJobType("all")
                        setSelectedWorkMode("all")
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>

                  {/* Job Grid */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {jobs.map((job, index) => (
                      <motion.div
                        key={job.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card 
                          className="hover:shadow-lg transition-all duration-300 cursor-pointer border-slate-200 hover:border-blue-300"
                          onClick={() => { setSelectedJob(job); setShowJobModal(true); }}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start gap-3">
                              <Avatar className="w-12 h-12 rounded-lg">
                                <AvatarImage src={job.company.logo || ""} />
                                <AvatarFallback className="bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 rounded-lg">
                                  {job.company.companyName.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-lg line-clamp-1">{job.title}</CardTitle>
                                <CardDescription className="line-clamp-1">
                                  {job.company.companyName}
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-wrap gap-2 mb-3">
                              {job.workMode && (
                                <Badge variant="outline" className={getWorkModeBadge(job.workMode)}>
                                  {job.workMode}
                                </Badge>
                              )}
                              <Badge variant="outline" className="bg-slate-100">
                                {job.jobType.replace("_", "-")}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
                              {(job.city || job.country) && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  {[job.city, job.country].filter(Boolean).join(", ")}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-blue-600">
                                {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency, job.salaryPeriod)}
                              </span>
                              <span className="text-xs text-slate-400">
                                {new Date(job.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            {job.hasApplied && (
                              <div className="mt-3 text-xs text-green-600 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Already Applied
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>

                  {jobs.length === 0 && (
                    <div className="text-center py-12">
                      <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-600">No jobs found</h3>
                      <p className="text-slate-500">Try adjusting your search or filters</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Featured Companies */}
              <section className="py-12 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <h2 className="text-2xl font-bold mb-8">Featured Companies</h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {companies.slice(0, 8).map((company) => (
                      <Card key={company.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-6 text-center">
                          <Avatar className="w-16 h-16 mx-auto mb-4 rounded-lg">
                            <AvatarImage src={company.logo || ""} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 text-xl rounded-lg">
                              {company.companyName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <h3 className="font-semibold">{company.companyName}</h3>
                          <p className="text-sm text-slate-500 mb-2">{company.industry}</p>
                          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                            <Briefcase className="w-4 h-4" />
                            <span>{company._count?.jobs || 0} jobs</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </section>
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Dashboard */}
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Tabs value={dashboardTab} onValueChange={setDashboardTab} className="space-y-6">
                  <TabsList className="bg-white border border-slate-200">
                    {/* Role-based tabs */}
                    {user?.role === "JOB_SEEKER" && (
                      <>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="profile">My Profile</TabsTrigger>
                        <TabsTrigger value="applied">Applied Jobs</TabsTrigger>
                      </>
                    )}
                    {user?.role === "COMPANY" && (
                      <>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="company">Company Profile</TabsTrigger>
                        <TabsTrigger value="jobs">My Jobs</TabsTrigger>
                        <TabsTrigger value="applications">
                          Candidate Applications
                          {notifications.unreadCount > 0 && (
                            <Badge className="ml-2 bg-red-500">{notifications.unreadCount}</Badge>
                          )}
                        </TabsTrigger>
                      </>
                    )}
                    {user?.role === "SUPER_ADMIN" && (
                      <>
                        <TabsTrigger value="overview">Dashboard</TabsTrigger>
                        <TabsTrigger value="companies">Companies</TabsTrigger>
                        <TabsTrigger value="users">Users</TabsTrigger>
                      </>
                    )}
                  </TabsList>

                  {/* Job Seeker Dashboard */}
                  {user?.role === "JOB_SEEKER" && (
                    <>
                      <TabsContent value="overview">
                        <div className="grid md:grid-cols-3 gap-6">
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Applications</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-3xl font-bold">{applications.length}</p>
                              <p className="text-sm text-slate-500">Total applications</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Profile Views</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-3xl font-bold">--</p>
                              <p className="text-sm text-slate-500">This month</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Profile Completion</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <Progress value={userProfile?.skills ? 75 : 25} className="mb-2" />
                              <p className="text-sm text-slate-500">{userProfile?.skills ? "75%" : "25%"} complete</p>
                            </CardContent>
                          </Card>
                        </div>
                      </TabsContent>

                      <TabsContent value="profile">
                        <Card>
                          <CardHeader>
                            <CardTitle>My Profile</CardTitle>
                            <CardDescription>Update your profile information</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="flex items-center gap-4 mb-6">
                                <Avatar className="w-20 h-20">
                                  <AvatarImage src={userProfile?.profilePicture || ""} />
                                  <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl">
                                    {userProfile?.name?.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <h3 className="text-xl font-semibold">{userProfile?.name}</h3>
                                  <p className="text-slate-500">{userProfile?.headline || "Add your headline"}</p>
                                </div>
                              </div>
                              <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                  <Label>Email</Label>
                                  <Input value={userProfile?.email || ""} disabled />
                                </div>
                                <div>
                                  <Label>Phone</Label>
                                  <Input value={userProfile?.phone || ""} placeholder="Add phone number" />
                                </div>
                                <div>
                                  <Label>Country</Label>
                                  <Input value={userProfile?.country || ""} placeholder="Country" />
                                </div>
                                <div>
                                  <Label>City</Label>
                                  <Input value={userProfile?.city || ""} placeholder="City" />
                                </div>
                              </div>
                              <div>
                                <Label>Skills</Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {userProfile?.skills ? JSON.parse(userProfile.skills).map((skill: string, i: number) => (
                                    <Badge key={i} variant="secondary">{skill}</Badge>
                                  )) : (
                                    <p className="text-sm text-slate-500">No skills added yet</p>
                                  )}
                                </div>
                              </div>
                              <div>
                                <Label>Experience</Label>
                                <Input value={userProfile?.experience || ""} placeholder="Years of experience" />
                              </div>
                              <div>
                                <Label>Resume</Label>
                                <div className="flex items-center gap-2 mt-2">
                                  {userProfile?.resume ? (
                                    <Badge variant="secondary" className="flex items-center gap-1">
                                      <FileText className="w-3 h-3" /> Resume uploaded
                                    </Badge>
                                  ) : (
                                    <Button variant="outline" size="sm">
                                      <Upload className="w-4 h-4 mr-2" /> Upload Resume
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600">
                                Save Changes
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="applied">
                        <Card>
                          <CardHeader>
                            <CardTitle>Applied Jobs</CardTitle>
                            <CardDescription>Track your job applications</CardDescription>
                          </CardHeader>
                          <CardContent>
                            {applications.length === 0 ? (
                              <div className="text-center py-8">
                                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-500">No applications yet</p>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {applications.map((app) => (
                                  <div key={app.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-slate-50">
                                    <Avatar className="w-12 h-12 rounded-lg">
                                      <AvatarImage src={app.job.company.logo || ""} />
                                      <AvatarFallback className="bg-blue-100 text-blue-600 rounded-lg">
                                        {app.job.company.companyName.charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                      <h4 className="font-semibold">{app.job.title}</h4>
                                      <p className="text-sm text-slate-500">{app.job.company.companyName}</p>
                                      <div className="flex items-center gap-4 mt-2">
                                        <Badge className={getStatusBadge(app.status)}>{app.status}</Badge>
                                        <span className="text-xs text-slate-400">
                                          Applied {new Date(app.createdAt).toLocaleDateString()}
                                        </span>
                                      </div>
                                    </div>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => { setSelectedJob(app.job); setShowJobModal(true); }}
                                    >
                                      View Job
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </>
                  )}

                  {/* Company Dashboard */}
                  {user?.role === "COMPANY" && (
                    <>
                      <TabsContent value="overview">
                        <div className="grid md:grid-cols-4 gap-6">
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Active Jobs</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-3xl font-bold">{myJobs.filter(j => j.status === "OPEN").length}</p>
                              <p className="text-sm text-slate-500">of {myJobs.length} total</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Applications</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-3xl font-bold">{applications.length}</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Pending Review</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-3xl font-bold">
                                {applications.filter(a => a.status === "PENDING").length}
                              </p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Interviewed</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-3xl font-bold">
                                {applications.filter(a => a.status === "INTERVIEWED").length}
                              </p>
                            </CardContent>
                          </Card>
                        </div>
                        <div className="mt-6 flex gap-3">
                          <Button onClick={() => { setEditingJob(null); setJobForm({ title: "", description: "", requirements: "", responsibilities: "", country: "", city: "", workMode: "ONSITE", salaryMin: "", salaryMax: "", jobType: "FULL_TIME", experienceLevel: "", skills: "" }); setShowPostJobModal(true); }}>
                            <Plus className="w-4 h-4 mr-2" /> Post New Job
                          </Button>
                          <Button variant="outline" onClick={() => setDashboardTab("applications")}>
                            <Users className="w-4 h-4 mr-2" /> View Applications
                          </Button>
                        </div>
                        {myJobs.length > 0 && (
                          <div className="mt-6">
                            <h3 className="font-semibold mb-3 text-slate-700">Recent Job Postings</h3>
                            <div className="space-y-2">
                              {myJobs.slice(0, 3).map(job => (
                                <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                                  <div>
                                    <p className="font-medium">{job.title}</p>
                                    <p className="text-sm text-slate-500">{[job.city, job.country].filter(Boolean).join(", ")}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge className={job.status === "OPEN" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>{job.status}</Badge>
                                    <Button size="sm" variant="ghost" onClick={() => handleEditJob(job)}><Settings className="w-4 h-4" /></Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="company">
                        <Card>
                          <CardHeader>
                            <CardTitle>Company Profile</CardTitle>
                            <CardDescription>Manage your company information</CardDescription>
                          </CardHeader>
                          <CardContent>
                            {companyProfile ? (
                              <div className="space-y-4">
                                <div className="flex items-center gap-4 mb-6">
                                  <Avatar className="w-20 h-20 rounded-lg">
                                    <AvatarImage src={companyProfile.logo || ""} />
                                    <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl rounded-lg">
                                      {companyProfile.companyName.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <h3 className="text-xl font-semibold">{companyProfile.companyName}</h3>
                                    <p className="text-slate-500">{companyProfile.industry || "Add your industry"}</p>
                                    {companyProfile.isVerified && (
                                      <Badge className="bg-green-100 text-green-700">Verified</Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                  <div>
                                    <Label>Company Name</Label>
                                    <Input value={companyForm.companyName || ""} onChange={e => setCompanyForm({...companyForm, companyName: e.target.value})} />
                                  </div>
                                  <div>
                                    <Label>Website</Label>
                                    <Input value={companyForm.website || ""} onChange={e => setCompanyForm({...companyForm, website: e.target.value})} placeholder="https://..." />
                                  </div>
                                  <div>
                                    <Label>Industry</Label>
                                    <Input value={companyForm.industry || ""} onChange={e => setCompanyForm({...companyForm, industry: e.target.value})} placeholder="e.g., Technology" />
                                  </div>
                                  <div>
                                    <Label>Company Size</Label>
                                    <Select value={companyForm.companySize || ""} onValueChange={v => setCompanyForm({...companyForm, companySize: v})}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select size" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="1-10">1-10 employees</SelectItem>
                                        <SelectItem value="11-50">11-50 employees</SelectItem>
                                        <SelectItem value="51-200">51-200 employees</SelectItem>
                                        <SelectItem value="201-500">201-500 employees</SelectItem>
                                        <SelectItem value="500+">500+ employees</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label>Country</Label>
                                    <Input value={companyForm.country || ""} onChange={e => setCompanyForm({...companyForm, country: e.target.value})} placeholder="e.g., United States" />
                                  </div>
                                  <div>
                                    <Label>City</Label>
                                    <Input value={companyForm.city || ""} onChange={e => setCompanyForm({...companyForm, city: e.target.value})} placeholder="e.g., San Francisco" />
                                  </div>
                                </div>
                                <div>
                                  <Label>Description</Label>
                                  <Textarea value={companyForm.description || ""} onChange={e => setCompanyForm({...companyForm, description: e.target.value})} rows={4} placeholder="Tell us about your company, culture, mission..." />
                                </div>
                                <Button onClick={handleSaveCompanyProfile} className="bg-gradient-to-r from-blue-600 to-indigo-600">
                                  Save Changes
                                </Button>
                              </div>
                            ) : (
                              <div className="text-center py-8">
                                <Building className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-500">Company profile not found</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="jobs">
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                              <CardTitle>My Job Postings</CardTitle>
                              <CardDescription>{myJobs.length} job{myJobs.length !== 1 ? "s" : ""} posted</CardDescription>
                            </div>
                            <Button onClick={() => { setEditingJob(null); setJobForm({ title: "", description: "", requirements: "", responsibilities: "", country: "", city: "", workMode: "ONSITE", salaryMin: "", salaryMax: "", jobType: "FULL_TIME", experienceLevel: "", skills: "" }); setShowPostJobModal(true); }}>
                              <Plus className="w-4 h-4 mr-2" /> Post New Job
                            </Button>
                          </CardHeader>
                          <CardContent>
                            {myJobs.length === 0 ? (
                              <div className="text-center py-12">
                                <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-500 mb-4">No jobs posted yet</p>
                                <Button onClick={() => setShowPostJobModal(true)}>
                                  <Plus className="w-4 h-4 mr-2" /> Post Your First Job
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {myJobs.map((job) => (
                                  <div key={job.id} className="p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                          <h4 className="font-semibold text-lg">{job.title}</h4>
                                          <Badge className={job.status === "OPEN" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                                            {job.status}
                                          </Badge>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                                          {(job.city || job.country) && (
                                            <span className="flex items-center gap-1">
                                              <MapPin className="w-3 h-3" />
                                              {[job.city, job.country].filter(Boolean).join(", ")}
                                            </span>
                                          )}
                                          <Badge variant="outline" className={getWorkModeBadge(job.workMode)}>{job.workMode.replace("_", " ")}</Badge>
                                          <Badge variant="outline">{job.jobType.replace("_", " ")}</Badge>
                                          <span className="flex items-center gap-1 font-medium text-blue-600">
                                            <Users className="w-3 h-3" />{job._count?.applications || 0} applicant{(job._count?.applications || 0) !== 1 ? "s" : ""}
                                          </span>
                                          <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />{new Date(job.createdAt).toLocaleDateString()}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <Button size="sm" variant="outline" onClick={() => handleEditJob(job)}>
                                          <Settings className="w-4 h-4 mr-1" /> Edit
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => { setDashboardTab("applications") }} className="text-blue-600">
                                          <Eye className="w-4 h-4 mr-1" /> Applicants
                                        </Button>
                                        <Button size="sm" variant="outline" className="text-red-500 hover:bg-red-50" onClick={() => handleDeleteJob(job.id)}>
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="applications">
                        <Card>
                          <CardHeader>
                            <CardTitle>Candidate Applications</CardTitle>
                            <CardDescription>{applications.length} application{applications.length !== 1 ? "s" : ""} received</CardDescription>
                          </CardHeader>
                          <CardContent>
                            {applications.length === 0 ? (
                              <div className="text-center py-12">
                                <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-500">No applications yet — post a job to get started!</p>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {applications.map((app) => (
                                  <div key={app.id} className="border rounded-xl overflow-hidden">
                                    {/* Applicant Header Row */}
                                    <div
                                      className="flex items-start gap-4 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                                      onClick={() => setExpandedApplicant(expandedApplicant === app.id ? null : app.id)}
                                    >
                                      <Avatar className="w-12 h-12 shrink-0">
                                        <AvatarImage src={app.user.profilePicture || ""} />
                                        <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                                          {app.user.name?.charAt(0)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                          <div>
                                            <h4 className="font-semibold">{app.user.name}</h4>
                                            <p className="text-sm text-slate-500">{app.user.headline || app.user.email}</p>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Badge className={getStatusBadge(app.status)}>{app.status}</Badge>
                                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedApplicant === app.id ? "rotate-180" : ""}`} />
                                          </div>
                                        </div>
                                        <p className="text-sm font-medium text-blue-600 mt-1">Applied for: {app.job.title}</p>
                                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(app.createdAt).toLocaleDateString()}</span>
                                          {app.user.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{app.user.email}</span>}
                                          {app.user.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{app.user.phone}</span>}
                                        </div>
                                        {app.user.skills && (() => { try { const s = JSON.parse(app.user.skills); return (<div className="flex flex-wrap gap-1 mt-2">{s.slice(0, 5).map((skill: string, i: number) => (<Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>))}{s.length > 5 && <Badge variant="outline" className="text-xs">+{s.length - 5} more</Badge>}</div>) } catch { return null } })()}
                                      </div>
                                    </div>

                                    {/* Expanded Detail Panel */}
                                    {expandedApplicant === app.id && (
                                      <div className="border-t bg-slate-50 p-4 space-y-4">
                                        {/* Experience & Summary */}
                                        {app.user.experience && (
                                          <div>
                                            <p className="text-xs font-semibold uppercase text-slate-400 mb-1 flex items-center gap-1"><Award className="w-3 h-3" /> Experience</p>
                                            <p className="text-sm text-slate-700">{app.user.experience}</p>
                                          </div>
                                        )}
                                        {/* Cover Letter */}
                                        {app.coverLetter && (
                                          <div>
                                            <p className="text-xs font-semibold uppercase text-slate-400 mb-1 flex items-center gap-1"><FileText className="w-3 h-3" /> Cover Letter</p>
                                            <div className="bg-white border rounded-lg p-3 text-sm text-slate-700 whitespace-pre-line max-h-40 overflow-y-auto">{app.coverLetter}</div>
                                          </div>
                                        )}
                                        {/* Resume */}
                                        {(app.resume || app.user.resume) && (
                                          <div>
                                            <p className="text-xs font-semibold uppercase text-slate-400 mb-1 flex items-center gap-1"><Link className="w-3 h-3" /> Resume</p>
                                            <a href={app.resume || app.user.resume || ""} target="_blank" rel="noopener noreferrer"
                                              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium underline">
                                              <FileText className="w-4 h-4" /> View Resume
                                            </a>
                                          </div>
                                        )}
                                        {/* Action buttons */}
                                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                                          <span className="text-xs text-slate-500 mr-1">Update status:</span>
                                          <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(app.id, "REVIEWING")} disabled={app.status === "REVIEWING"}>
                                            <Eye className="w-4 h-4 mr-1" /> Mark Reviewing
                                          </Button>
                                          <Button size="sm" variant="outline" className="text-purple-600 hover:bg-purple-50" onClick={() => handleUpdateStatus(app.id, "INTERVIEWED")} disabled={app.status === "INTERVIEWED"}>
                                            <UserCheck className="w-4 h-4 mr-1" /> Mark Interviewed
                                          </Button>
                                          <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleUpdateStatus(app.id, "REJECTED")} disabled={app.status === "REJECTED"}>
                                            <XCircle className="w-4 h-4 mr-1" /> Reject
                                          </Button>
                                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleUpdateStatus(app.id, "ACCEPTED")} disabled={app.status === "ACCEPTED"}>
                                            <CheckCircle className="w-4 h-4 mr-1" /> Accept
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </>
                  )}

                  {/* Super Admin Dashboard */}
                  {user?.role === "SUPER_ADMIN" && (
                    <>
                      <TabsContent value="overview">
                        <div className="grid md:grid-cols-5 gap-6">
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Total Users</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-3xl font-bold">{adminData?.stats?.totalUsers || 0}</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Companies</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-3xl font-bold">{adminData?.stats?.totalCompanies || 0}</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Total Jobs</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-3xl font-bold">{adminData?.stats?.totalJobs || 0}</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Applications</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-3xl font-bold">{adminData?.stats?.totalApplications || 0}</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Open Jobs</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-3xl font-bold">{adminData?.stats?.openJobs || 0}</p>
                            </CardContent>
                          </Card>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6 mt-6">
                          <Card>
                            <CardHeader>
                              <CardTitle>Recent Jobs</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                {adminData?.recentJobs?.map((job: any) => (
                                  <div key={job.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded">
                                    <div>
                                      <p className="font-medium">{job.title}</p>
                                      <p className="text-sm text-slate-500">{job.company?.companyName}</p>
                                    </div>
                                    <Badge variant="outline">{job.status}</Badge>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader>
                              <CardTitle>Recent Applications</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                {adminData?.recentApplications?.map((app: any) => (
                                  <div key={app.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded">
                                    <div>
                                      <p className="font-medium">{app.user?.name}</p>
                                      <p className="text-sm text-slate-500">{app.job?.title}</p>
                                    </div>
                                    <Badge className={getStatusBadge(app.status)}>{app.status}</Badge>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </TabsContent>

                      <TabsContent value="companies">
                        <Card>
                          <CardHeader>
                            <CardTitle>All Companies</CardTitle>
                            <CardDescription>Sorted by Country and City</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <ScrollArea className="h-[600px]">
                              {Object.entries(adminCompaniesGrouped).map(([country, cities]) => (
                                <div key={country} className="mb-6">
                                  <div className="flex items-center gap-2 mb-2 sticky top-0 bg-white py-1">
                                    <Globe className="w-5 h-5 text-blue-600" />
                                    <h3 className="font-semibold text-lg">{country}</h3>
                                  </div>
                                  {Object.entries(cities as Record<string, Company[]>).map(([city, companies]) => (
                                    <div key={city} className="ml-4 mb-4">
                                      <div className="flex items-center gap-2 mb-2">
                                        <MapPin className="w-4 h-4 text-slate-400" />
                                        <h4 className="font-medium">{city}</h4>
                                        <Badge variant="secondary" className="text-xs">
                                          {(companies as Company[]).length}
                                        </Badge>
                                      </div>
                                      <div className="space-y-2 ml-6">
                                        {(companies as Company[]).map((company) => (
                                          <div key={company.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                                            <div className="flex items-center gap-3">
                                              <Avatar className="w-10 h-10 rounded-lg">
                                                <AvatarImage src={company.logo || ""} />
                                                <AvatarFallback className="rounded-lg bg-blue-100 text-blue-600">
                                                  {company.companyName.charAt(0)}
                                                </AvatarFallback>
                                              </Avatar>
                                              <div>
                                                <p className="font-medium">{company.companyName}</p>
                                                <p className="text-sm text-slate-500">{company.industry}</p>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <Badge variant="outline">{company._count?.jobs || 0} jobs</Badge>
                                              {company.isVerified && (
                                                <Badge className="bg-green-100 text-green-700">Verified</Badge>
                                              )}
                                              <Button 
                                                size="icon" 
                                                variant="ghost"
                                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => handleDelete("company", company.id)}
                                              >
                                                <Trash2 className="w-4 h-4" />
                                              </Button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </ScrollArea>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="users">
                        <Card>
                          <CardHeader>
                            <CardTitle>All Users</CardTitle>
                            <CardDescription>Sorted by Country and City</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <ScrollArea className="h-[600px]">
                              {Object.entries(adminUsersGrouped).map(([country, cities]) => (
                                <div key={country} className="mb-6">
                                  <div className="flex items-center gap-2 mb-2 sticky top-0 bg-white py-1">
                                    <Globe className="w-5 h-5 text-blue-600" />
                                    <h3 className="font-semibold text-lg">{country}</h3>
                                  </div>
                                  {Object.entries(cities as Record<string, any[]>).map(([city, users]) => (
                                    <div key={city} className="ml-4 mb-4">
                                      <div className="flex items-center gap-2 mb-2">
                                        <MapPin className="w-4 h-4 text-slate-400" />
                                        <h4 className="font-medium">{city}</h4>
                                        <Badge variant="secondary" className="text-xs">
                                          {users.length}
                                        </Badge>
                                      </div>
                                      <div className="space-y-2 ml-6">
                                        {users.map((user) => (
                                          <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                                            <div className="flex items-center gap-3">
                                              <Avatar>
                                                <AvatarImage src={user.profilePicture || ""} />
                                                <AvatarFallback className="bg-blue-100 text-blue-600">
                                                  {user.name?.charAt(0)}
                                                </AvatarFallback>
                                              </Avatar>
                                              <div>
                                                <p className="font-medium">{user.name}</p>
                                                <p className="text-sm text-slate-500">{user.email}</p>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <Badge variant="outline">
                                                {user.role.replace("_", " ")}
                                              </Badge>
                                              {user.role !== "SUPER_ADMIN" && (
                                                <Button 
                                                  size="icon" 
                                                  variant="ghost"
                                                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                  onClick={() => handleDelete("user", user.id)}
                                                >
                                                  <Trash2 className="w-4 h-4" />
                                                </Button>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </ScrollArea>
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </>
                  )}
                </Tabs>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Auth Modal */}
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{authMode === "login" ? "Welcome Back" : "Create Account"}</DialogTitle>
            <DialogDescription>
              {authMode === "login" 
                ? "Sign in to your account to continue" 
                : "Join JobConnect to find your dream job"}
            </DialogDescription>
          </DialogHeader>
          <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as "login" | "register")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    placeholder="your@email.com"
                    required
                  />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600">
                  Sign In
                </Button>
              </form>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>
              <Button 
                type="button" 
                variant="outline" 
                className="w-full"
                onClick={handleGoogleLogin}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </Button>
            </TabsContent>
            <TabsContent value="register" className="mt-4">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>I am a</Label>
                    <Select 
                      value={registerForm.role} 
                      onValueChange={(v) => setRegisterForm({ ...registerForm, role: v as "JOB_SEEKER" | "COMPANY" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="JOB_SEEKER">Job Seeker</SelectItem>
                        <SelectItem value="COMPANY">Company</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Full Name</Label>
                    <Input
                      value={registerForm.name}
                      onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                    placeholder="your@email.com"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <div>
                    <Label>Confirm</Label>
                    <Input
                      type="password"
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Country</Label>
                    <Input
                      value={registerForm.country}
                      onChange={(e) => setRegisterForm({ ...registerForm, country: e.target.value })}
                      placeholder="USA"
                    />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input
                      value={registerForm.city}
                      onChange={(e) => setRegisterForm({ ...registerForm, city: e.target.value })}
                      placeholder="New York"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600">
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Job Detail Modal */}
      <Dialog open={showJobModal} onOpenChange={setShowJobModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedJob && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedJob.title}</DialogTitle>
                <DialogDescription className="flex items-center gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={selectedJob.company?.logo || ""} />
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                      {selectedJob.company?.companyName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {selectedJob.company?.companyName}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {selectedJob.workMode && (
                    <Badge variant="outline" className={getWorkModeBadge(selectedJob.workMode)}>
                      {selectedJob.workMode}
                    </Badge>
                  )}
                  <Badge variant="outline">{selectedJob.jobType?.replace("_", "-")}</Badge>
                  {selectedJob.experienceLevel && (
                    <Badge variant="outline">{selectedJob.experienceLevel}</Badge>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                  {(selectedJob.city || selectedJob.country) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {[selectedJob.city, selectedJob.country].filter(Boolean).join(", ")}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    {formatSalary(selectedJob.salaryMin, selectedJob.salaryMax, selectedJob.salaryCurrency, selectedJob.salaryPeriod)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Posted {new Date(selectedJob.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-slate-600 whitespace-pre-line">{selectedJob.description}</p>
                </div>

                {selectedJob.requirements && (
                  <div>
                    <h4 className="font-semibold mb-2">Requirements</h4>
                    <ul className="list-disc list-inside text-slate-600 space-y-1">
                      {(typeof selectedJob.requirements === "string" 
                        ? JSON.parse(selectedJob.requirements) 
                        : selectedJob.requirements
                      ).map((req: string, i: number) => (
                        <li key={i}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedJob.skills && (
                  <div>
                    <h4 className="font-semibold mb-2">Skills Required</h4>
                    <div className="flex flex-wrap gap-2">
                      {(typeof selectedJob.skills === "string" 
                        ? JSON.parse(selectedJob.skills) 
                        : selectedJob.skills
                      ).map((skill: string, i: number) => (
                        <Badge key={i} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {user?.role === "JOB_SEEKER" && (
                  <div className="pt-4">
                    {selectedJob.hasApplied ? (
                      <Button disabled className="w-full bg-green-600">
                        <CheckCircle className="w-4 h-4 mr-2" /> Already Applied
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => { setShowJobModal(false); setShowApplyModal(true); }}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600"
                      >
                        Apply Now
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Apply Modal */}
      <Dialog open={showApplyModal} onOpenChange={setShowApplyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply for {selectedJob?.title}</DialogTitle>
            <DialogDescription>at {selectedJob?.company?.companyName}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleApply} className="space-y-4">
            <div>
              <Label>Cover Letter (Optional)</Label>
              <Textarea
                value={applyForm.coverLetter}
                onChange={(e) => setApplyForm({ ...applyForm, coverLetter: e.target.value })}
                placeholder="Tell us why you're a great fit..."
                rows={5}
              />
            </div>
            <div>
              <Label>Resume URL (Optional)</Label>
              <Input
                value={applyForm.resume}
                onChange={(e) => setApplyForm({ ...applyForm, resume: e.target.value })}
                placeholder="Link to your resume"
              />
            </div>
            <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600">
              Submit Application
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Post Job Modal */}
      <Dialog open={showPostJobModal} onOpenChange={(open) => { setShowPostJobModal(open); if (!open) setEditingJob(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingJob ? "Edit Job Posting" : "Post a New Job"}</DialogTitle>
            <DialogDescription>{editingJob ? `Editing: ${editingJob.title}` : "Fill in the details to post a new job opening"}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePostJob} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Job Title *</Label>
                <Input
                  value={jobForm.title}
                  onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                  placeholder="e.g., Senior Software Engineer"
                  required
                />
              </div>
              <div>
                <Label>Job Type</Label>
                <Select value={jobForm.jobType} onValueChange={(v) => setJobForm({ ...jobForm, jobType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FULL_TIME">Full Time</SelectItem>
                    <SelectItem value="PART_TIME">Part Time</SelectItem>
                    <SelectItem value="CONTRACT">Contract</SelectItem>
                    <SelectItem value="INTERNSHIP">Internship</SelectItem>
                    <SelectItem value="FREELANCE">Freelance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea
                value={jobForm.description}
                onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                placeholder="Describe the role and responsibilities..."
                rows={5}
                required
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Country</Label>
                <Input
                  value={jobForm.country}
                  onChange={(e) => setJobForm({ ...jobForm, country: e.target.value })}
                  placeholder="e.g., USA"
                />
              </div>
              <div>
                <Label>City</Label>
                <Input
                  value={jobForm.city}
                  onChange={(e) => setJobForm({ ...jobForm, city: e.target.value })}
                  placeholder="e.g., San Francisco"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Work Mode</Label>
                <Select value={jobForm.workMode} onValueChange={(v) => setJobForm({ ...jobForm, workMode: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ONSITE">On-site</SelectItem>
                    <SelectItem value="REMOTE">Remote</SelectItem>
                    <SelectItem value="HYBRID">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Min Salary</Label>
                <Input
                  type="number"
                  value={jobForm.salaryMin}
                  onChange={(e) => setJobForm({ ...jobForm, salaryMin: e.target.value })}
                  placeholder="e.g., 80000"
                />
              </div>
              <div>
                <Label>Max Salary</Label>
                <Input
                  type="number"
                  value={jobForm.salaryMax}
                  onChange={(e) => setJobForm({ ...jobForm, salaryMax: e.target.value })}
                  placeholder="e.g., 120000"
                />
              </div>
            </div>
            <div>
              <Label>Experience Level</Label>
              <Select value={jobForm.experienceLevel} onValueChange={(v) => setJobForm({ ...jobForm, experienceLevel: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Entry">Entry Level</SelectItem>
                  <SelectItem value="Mid">Mid Level</SelectItem>
                  <SelectItem value="Senior">Senior Level</SelectItem>
                  <SelectItem value="Executive">Executive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Skills (comma-separated)</Label>
              <Input
                value={jobForm.skills}
                onChange={(e) => setJobForm({ ...jobForm, skills: e.target.value })}
                placeholder="e.g., JavaScript, React, Node.js"
              />
            </div>
            <div>
              <Label>Requirements (one per line)</Label>
              <Textarea
                value={jobForm.requirements}
                onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value })}
                placeholder="3+ years experience&#10;Strong communication skills&#10;Bachelor's degree"
                rows={3}
              />
            </div>
            <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600">
              Post Job
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">JobConnect</span>
              </div>
              <p className="text-slate-400 text-sm">
                Connecting talent with opportunities worldwide.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Job Seekers</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><NextLink href="/" className="hover:text-white transition-colors">Browse Jobs</NextLink></li>
                <li><NextLink href="/#resources" className="hover:text-white transition-colors">Career Resources</NextLink></li>
                <li><NextLink href="/#salary" className="hover:text-white transition-colors">Salary Guide</NextLink></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Employers</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><NextLink href="/" className="hover:text-white transition-colors">Post a Job</NextLink></li>
                <li><NextLink href="/" className="hover:text-white transition-colors">Browse Candidates</NextLink></li>
                <li><NextLink href="/#pricing" className="hover:text-white transition-colors">Pricing</NextLink></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><NextLink href="/about" className="hover:text-white transition-colors">About Us</NextLink></li>
                <li><span className="cursor-not-allowed">Contact</span></li>
                <li><span className="cursor-not-allowed">Privacy Policy</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-400">
            © 2024 JobConnect. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

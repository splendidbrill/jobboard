import { create } from "zustand"
import { Session } from "next-auth"

interface AppState {
  session: Session | null
  setSession: (session: Session | null) => void
  activeTab: string
  setActiveTab: (tab: string) => void
  showAuthModal: boolean
  setShowAuthModal: (show: boolean) => void
  authMode: "login" | "register"
  setAuthMode: (mode: "login" | "register") => void
  selectedJob: any | null
  setSelectedJob: (job: any | null) => void
  showJobModal: boolean
  setShowJobModal: (show: boolean) => void
  showApplyModal: boolean
  setShowApplyModal: (show: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  session: null,
  setSession: (session) => set({ session }),
  activeTab: "jobs",
  setActiveTab: (tab) => set({ activeTab: tab }),
  showAuthModal: false,
  setShowAuthModal: (show) => set({ showAuthModal: show }),
  authMode: "login",
  setAuthMode: (mode) => set({ authMode: mode }),
  selectedJob: null,
  setSelectedJob: (job) => set({ selectedJob: job }),
  showJobModal: false,
  setShowJobModal: (show) => set({ showJobModal: show }),
  showApplyModal: false,
  setShowApplyModal: (show) => set({ showApplyModal: show })
}))

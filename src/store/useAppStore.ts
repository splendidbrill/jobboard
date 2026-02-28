import { create } from 'zustand';

export type ViewMode = 'landing' | 'jobs' | 'companies' | 'job-seeker-dashboard' | 'company-dashboard' | 'admin-dashboard';

export type DashboardTab = 
  | 'profile' 
  | 'applications' 
  | 'saved-jobs' 
  | 'company-profile' 
  | 'post-job' 
  | 'manage-jobs' 
  | 'company-applications'
  | 'overview'
  | 'admin-companies'
  | 'admin-users'
  | 'settings';

interface AppState {
  // Navigation
  currentView: ViewMode;
  setCurrentView: (view: ViewMode) => void;
  
  // Dashboard tabs
  dashboardTab: DashboardTab;
  setDashboardTab: (tab: DashboardTab) => void;
  
  // Modals
  showLoginModal: boolean;
  showRegisterModal: boolean;
  showJobDetailModal: boolean;
  showApplyModal: boolean;
  selectedJobId: string | null;
  showCompanyDetailModal: boolean;
  selectedCompanyId: string | null;
  
  setShowLoginModal: (show: boolean) => void;
  setShowRegisterModal: (show: boolean) => void;
  setShowJobDetailModal: (show: boolean) => void;
  setShowApplyModal: (show: boolean) => void;
  setSelectedJobId: (id: string | null) => void;
  setShowCompanyDetailModal: (show: boolean) => void;
  setSelectedCompanyId: (id: string | null) => void;
  
  // Search & Filters
  searchQuery: string;
  locationQuery: string;
  filters: {
    country: string;
    city: string;
    jobType: string;
    workMode: string;
    experienceLevel: string;
    salaryMin: string;
    salaryMax: string;
  };
  
  setSearchQuery: (query: string) => void;
  setLocationQuery: (query: string) => void;
  setFilters: (filters: Partial<AppState['filters']>) => void;
  resetFilters: () => void;
}

const defaultFilters = {
  country: '',
  city: '',
  jobType: '',
  workMode: '',
  experienceLevel: '',
  salaryMin: '',
  salaryMax: '',
};

export const useAppStore = create<AppState>((set) => ({
  // Navigation
  currentView: 'landing',
  setCurrentView: (view) => set({ currentView: view }),
  
  // Dashboard tabs
  dashboardTab: 'profile',
  setDashboardTab: (tab) => set({ dashboardTab: tab }),
  
  // Modals
  showLoginModal: false,
  showRegisterModal: false,
  showJobDetailModal: false,
  showApplyModal: false,
  selectedJobId: null,
  showCompanyDetailModal: false,
  selectedCompanyId: null,
  
  setShowLoginModal: (show) => set({ showLoginModal: show }),
  setShowRegisterModal: (show) => set({ showRegisterModal: show }),
  setShowJobDetailModal: (show) => set({ showJobDetailModal: show }),
  setShowApplyModal: (show) => set({ showApplyModal: show }),
  setSelectedJobId: (id) => set({ selectedJobId: id }),
  setShowCompanyDetailModal: (show) => set({ showCompanyDetailModal: show }),
  setSelectedCompanyId: (id) => set({ selectedCompanyId: id }),
  
  // Search & Filters
  searchQuery: '',
  locationQuery: '',
  filters: defaultFilters,
  
  setSearchQuery: (query) => set({ searchQuery: query }),
  setLocationQuery: (query) => set({ locationQuery: query }),
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  resetFilters: () => set({ filters: defaultFilters }),
}));

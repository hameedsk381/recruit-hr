import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type {
    JobDescription,
    ShortlistCandidate,
    CopilotAction,
    CopilotHistoryItem,
    Interview
} from '../types';

// ==================== STATE ====================

interface CopilotState {
    isOpen: boolean;
    isLoading: boolean;
    history: CopilotHistoryItem[];
}

interface AppState {
    // Job Setup
    job: JobDescription | null;
    jobLoading: boolean;
    jobError: string | null;

    // Candidates
    candidates: ShortlistCandidate[];
    candidatesLoading: boolean;
    candidatesError: string | null;
    dashboardError: string | null;
    selectedCandidateId: string | null;

    // Copilot
    copilot: CopilotState;

    // Interviews
    interviews: Interview[];
    interviewsLoading: boolean;

    // UI
    currentView: 'dashboard' | 'setup' | 'shortlist' | 'detail' | 'interviews' | 'pipeline' | 'settings' | 'profile';
    sidebarOpen: boolean;
    user: { name: string; email: string; role: string; plan: string } | null;
}

interface AppActions {
    // Job
    setJob: (job: JobDescription | null) => void;
    setJobLoading: (loading: boolean) => void;

    // Candidates
    setCandidates: (candidates: ShortlistCandidate[]) => void;
    setCandidatesLoading: (loading: boolean) => void;
    selectCandidate: (id: string | null) => void;
    pinCandidate: (id: string) => void;
    removeCandidate: (id: string, reason: string) => void;
    restoreCandidate: (id: string) => void;
    reorderCandidates: (newOrder: string[]) => void;
    updateCandidateStage: (id: string, stage: ShortlistCandidate['stage']) => void;

    // Copilot
    toggleCopilot: () => void;
    setCopilotLoading: (loading: boolean) => void;
    executeCopilotAction: (action: CopilotAction, response: string) => void;

    // Interviews
    setInterviews: (interviews: Interview[]) => void;
    setInterviewsLoading: (loading: boolean) => void;
    addInterview: (interview: Interview) => void;

    // Errors
    setError: (type: 'job' | 'candidates' | 'dashboard', error: string | null) => void;

    // UI
    setView: (view: AppState['currentView']) => void;
    toggleSidebar: () => void;
    logout: () => void;
}

type AppContextType = AppState & AppActions;

// ==================== CONTEXT ====================

const AppContext = createContext<AppContextType | undefined>(undefined);

// ==================== PROVIDER ====================

export function AppProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AppState>({
        job: null,
        jobLoading: false,
        jobError: null,
        candidates: [],
        candidatesLoading: false,
        candidatesError: null,
        dashboardError: null,
        selectedCandidateId: null,
        copilot: {
            isOpen: false,
            isLoading: false,
            history: [],
        },
        interviews: [],
        interviewsLoading: false,
        currentView: 'dashboard',
        sidebarOpen: true,
        user: JSON.parse(localStorage.getItem('user') || 'null') || {
            name: 'John Recruiter',
            email: 'john@docapture.com',
            role: 'recruiter',
            plan: 'Enterprise Plan'
        }
    });

    // ========== JOB ACTIONS ==========

    const setJob = useCallback((job: JobDescription | null) => {
        setState(prev => ({ ...prev, job }));
    }, []);

    const setJobLoading = useCallback((jobLoading: boolean) => {
        setState(prev => ({ ...prev, jobLoading }));
    }, []);

    // ========== CANDIDATE ACTIONS ==========

    const setCandidates = useCallback((candidates: ShortlistCandidate[]) => {
        setState(prev => ({
            ...prev,
            candidates: candidates.map(c => ({
                ...c,
                stage: c.stage || (c.rank <= 10 ? 'shortlisted' : 'applied')
            }))
        }));
    }, []);

    const setCandidatesLoading = useCallback((candidatesLoading: boolean) => {
        setState(prev => ({ ...prev, candidatesLoading }));
    }, []);

    const selectCandidate = useCallback((id: string | null) => {
        setState(prev => ({
            ...prev,
            selectedCandidateId: id,
            currentView: id ? 'detail' : prev.currentView,
        }));
    }, []);

    const pinCandidate = useCallback((id: string) => {
        setState(prev => ({
            ...prev,
            candidates: prev.candidates.map(c =>
                c.id === id ? { ...c, pinned: !c.pinned } : c
            ),
        }));
    }, []);

    const removeCandidate = useCallback((id: string, reason: string) => {
        setState(prev => ({
            ...prev,
            candidates: prev.candidates.map(c =>
                c.id === id ? { ...c, removed: true, removal_reason: reason } : c
            ),
        }));
    }, []);

    const restoreCandidate = useCallback((id: string) => {
        setState(prev => ({
            ...prev,
            candidates: prev.candidates.map(c =>
                c.id === id ? { ...c, removed: false, removal_reason: undefined } : c
            ),
        }));
    }, []);

    const reorderCandidates = useCallback((newOrder: string[]) => {
        setState(prev => {
            const candidatesMap = new Map(prev.candidates.map(c => [c.id, c]));
            const reordered = newOrder
                .map((id, index) => {
                    const candidate = candidatesMap.get(id);
                    return candidate ? { ...candidate, rank: index + 1 } : null;
                })
                .filter((c): c is ShortlistCandidate => c !== null);
            return { ...prev, candidates: reordered };
        });
    }, []);

    const updateCandidateStage = useCallback((id: string, stage: ShortlistCandidate['stage']) => {
        setState(prev => ({
            ...prev,
            candidates: prev.candidates.map(c =>
                c.id === id ? { ...c, stage } : c
            ),
        }));
    }, []);

    // ========== COPILOT ACTIONS ==========

    const toggleCopilot = useCallback(() => {
        setState(prev => ({
            ...prev,
            copilot: { ...prev.copilot, isOpen: !prev.copilot.isOpen },
        }));
    }, []);

    const setCopilotLoading = useCallback((isLoading: boolean) => {
        setState(prev => ({
            ...prev,
            copilot: { ...prev.copilot, isLoading },
        }));
    }, []);

    const executeCopilotAction = useCallback((action: CopilotAction, response: string) => {
        setState(prev => ({
            ...prev,
            copilot: {
                ...prev.copilot,
                isLoading: false,
                history: [
                    ...prev.copilot.history,
                    { action, response },
                ],
            },
        }));
    }, []);

    // ========== INTERVIEW ACTIONS ==========

    const setInterviews = useCallback((interviews: Interview[]) => {
        setState(prev => ({ ...prev, interviews }));
    }, []);

    const setInterviewsLoading = useCallback((loading: boolean) => {
        setState(prev => ({ ...prev, interviewsLoading: loading }));
    }, []);

    const addInterview = useCallback((interview: Interview) => {
        setState(prev => ({
            ...prev,
            interviews: [...prev.interviews, interview].sort((a, b) =>
                new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            ),
        }));
    }, []);

    // ========== ERROR ACTIONS ==========

    const setError = useCallback((type: 'job' | 'candidates' | 'dashboard', error: string | null) => {
        const keyMap = {
            job: 'jobError',
            candidates: 'candidatesError',
            dashboard: 'dashboardError'
        };
        setState(prev => ({
            ...prev,
            [keyMap[type]]: error,
        }));
    }, []);

    // ========== UI ACTIONS ==========

    const setView = useCallback((currentView: AppState['currentView']) => {
        setState(prev => ({ ...prev, currentView }));
    }, []);

    const toggleSidebar = useCallback(() => {
        setState(prev => ({ ...prev, sidebarOpen: !prev.sidebarOpen }));
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('user');
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
    }, []);

    // ==================== VALUE ====================

    const value: AppContextType = {
        ...state,
        setJob,
        setJobLoading,
        setCandidates,
        setCandidatesLoading,
        selectCandidate,
        pinCandidate,
        removeCandidate,
        restoreCandidate,
        reorderCandidates,
        updateCandidateStage,
        toggleCopilot,
        setCopilotLoading,
        executeCopilotAction,
        setInterviews,
        setInterviewsLoading,
        addInterview,
        setError,
        setView,
        toggleSidebar,
        logout,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ==================== HOOK ====================

export function useApp(): AppContextType {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
}

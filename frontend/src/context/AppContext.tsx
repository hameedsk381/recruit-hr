import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import api from '../api/client';
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
    batchId: string | null;

    // Copilot
    copilot: CopilotState;

    // Interviews
    interviews: Interview[];
    interviewsLoading: boolean;

    // UI
    currentView: 'dashboard' | 'setup' | 'shortlist' | 'detail' | 'interviews' | 'pipeline' | 'settings' | 'profile' | 'history' | 'requisitions' | 'offers' | 'talent-pool' | 'referrals' | 'predictions' | 'knowledge' | 'fairness' | 'marketplace' | 'workflows' | 'reports' | 'onboarding' | 'sourcing';
    setupStep: 'upload-jd' | 'verify-profile' | 'bulk-resumes' | 'review-launch';
    campaignFiles: File[];
    sidebarOpen: boolean;
    user: { name: string; email: string; role: string; plan: string } | null;
    offerDraft: any | null;
}

interface AppActions {
    // Job
    setJob: (job: JobDescription | null) => void;
    setJobLoading: (loading: boolean) => void;
    setBatchId: (id: string | null) => void;
    setSetupStep: (step: AppState['setupStep']) => void;
    setCampaignFiles: (files: File[]) => void;
    loadCampaign: (batchId: string) => Promise<void>;

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
    submitHMDecision: (candidateId: string, decision: 'approved' | 'rejected', notes: string) => Promise<void>;
    setOfferDraft: (draft: any | null) => void;
    login: (user: any) => void;
    logout: () => void;
}

type AppContextType = AppState & AppActions;

// Helper to map backend results to frontend state
const mapBatchToState = (batch: any) => ({
    job: batch.jobData ? {
        id: batch.batchId,
        title: batch.jobData.title || 'Untitled Role',
        company: batch.jobData.company || 'N/A',
        core_skills: (batch.jobData.skills || []).map((skill: string, index: number) => ({
            skill,
            weight: index < 3 ? 'critical' : index < 6 ? 'important' : 'nice_to_have',
            mandatory: index < 3,
        })),
        experience_expectations: {
            min_years: batch.jobData.requiredIndustrialExperienceYears || 2,
            domain_specific: batch.jobData.domainExperience?.[0],
        },
        role_context: batch.jobData.description,
    } : null,
    candidates: (batch.results || [])
        .sort((a: any, b: any) => (b.matchResult?.matchScore || 0) - (a.matchResult?.matchScore || 0))
        .map((c: any, index: number) => ({
            id: c._id ? c._id.toString() : (c.matchResult?.Id || c.resumeName),
            profile: {
                id: c._id ? c._id.toString() : (c.matchResult?.Id || c.resumeName),
                name: c.matchResult?.['Resume Data']?.name || c.resumeName,
                email: c.matchResult?.['Resume Data']?.email || 'N/A',
                phone: c.matchResult?.['Resume Data']?.mobile_number || 'N/A',
                extracted_skills: Array.isArray(c.matchResult?.['Resume Data']?.skills) ? c.matchResult['Resume Data'].skills : [],
                experience_estimate: { total_years: c.matchResult?.['Resume Data']?.experience || 0 },
                recent_role: { title: c.matchResult?.['Resume Data']?.designation || 'Professional' }
            },
            assessment: {
                one_line_summary: c.matchResult?.summary || 'Candidate Assessment',
                fit_assessment: {
                    overall_fit: (c.matchResult?.matchScore || 0) >= 80 ? 'high' : (c.matchResult?.matchScore || 0) >= 60 ? 'medium' : 'low',
                    scorecard: []
                },
                strengths: (Array.isArray(c.matchResult?.Analysis?.['Matched Skills']) ? c.matchResult.Analysis['Matched Skills'] : []).map((s: string) => ({ skill: typeof s === 'string' ? s : 'Unknown', evidence_level: 'claimed', evidence: 'From resume' })),
                weaknesses: (Array.isArray(c.matchResult?.Analysis?.['Unmatched Skills']) ? c.matchResult.Analysis['Unmatched Skills'] : []).map((s: string) => ({ area: typeof s === 'string' ? s : 'Unknown', risk_level: 'medium', explanation: 'Missing' })),
                interview_focus_areas: Array.isArray(c.matchResult?.Analysis?.Recommendations) ? c.matchResult.Analysis.Recommendations : [],
                matchScore: Number(c.matchResult?.matchScore) || 0 // Sanitized for UI
            },
            rank: index + 1,
            pinned: false,
            removed: c.removed || false,
            stage: c.stage || 'applied',
            stageChangedAt: c.stageChangedAt,
            hmDecision: c.hmDecision,
            hmNotes: c.hmNotes
        }))
});

// ==================== CONTEXT ====================

const AppContext = createContext<AppContextType | undefined>(undefined);

// ==================== PROVIDER ====================

export function AppProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AppState>(() => {
        const savedUIState = sessionStorage.getItem('frontend_ui_state');
        let parsedUI = {};
        if (savedUIState) {
            try { parsedUI = JSON.parse(savedUIState); } catch(e) {}
        }
        
        return {
            job: null,
            jobLoading: false,
            jobError: null,
            candidates: [],
            candidatesLoading: false,
            candidatesError: null,
            dashboardError: null,
            selectedCandidateId: null,
            batchId: null,
            copilot: {
                isOpen: false,
                isLoading: false,
                history: [],
            },
            interviews: [],
            interviewsLoading: false,
            currentView: 'dashboard',
            setupStep: 'upload-jd',
            campaignFiles: [],
            sidebarOpen: true,
            user: JSON.parse(localStorage.getItem('user') || 'null'),
            offerDraft: null,
            ...parsedUI // Override with persisted session UI state
        };
    });

    // ========== PERSISTENCE ==========
    useEffect(() => {
        const stateToPersist = {
            currentView: state.currentView,
            setupStep: state.setupStep,
            sidebarOpen: state.sidebarOpen,
            job: state.job, // persist draft job between unlaunches
            batchId: state.batchId,
            selectedCandidateId: state.selectedCandidateId
        };
        sessionStorage.setItem('frontend_ui_state', JSON.stringify(stateToPersist));
    }, [state.currentView, state.setupStep, state.sidebarOpen, state.job, state.batchId, state.selectedCandidateId]);

    // ========== HYDRATION ==========
    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        api.getActiveState().then(res => {
            if (res.success && res.state) {
                const hydrated = mapBatchToState(res.state);
                setState(prev => ({
                    ...prev,
                    batchId: res.state.batchId,
                    job: hydrated.job,
                    candidates: hydrated.candidates
                }));
            }
        }).catch(err => {
            // Only log if it's not a standard auth error (which happens if token expires)
            if (!err.message?.includes('401')) {
                console.error('Failed to load active state', err);
            }
        });
    }, []);

    // ========== ACTIONS ==========

    const setJob = useCallback((job: JobDescription | null) => {
        setState(prev => ({ ...prev, job }));
    }, []);

    const setJobLoading = useCallback((jobLoading: boolean) => {
        setState(prev => ({ ...prev, jobLoading }));
    }, []);

    const setBatchId = useCallback((batchId: string | null) => {
        setState(prev => ({ ...prev, batchId }));
    }, []);

    const setSetupStep = useCallback((setupStep: AppState['setupStep']) => {
        setState(prev => ({ ...prev, setupStep }));
    }, []);

    const setCampaignFiles = useCallback((campaignFiles: File[]) => {
        setState(prev => ({ ...prev, campaignFiles }));
    }, []);

    const loadCampaign = useCallback(async (batchId: string) => {
        setState(prev => ({ ...prev, candidatesLoading: true, currentView: 'shortlist' }));
        try {
            const res = await api.getJobStatus({ batchId });
            if (res.success) {
                const hydrated = mapBatchToState(res);
                setState(prev => ({
                    ...prev,
                    batchId,
                    job: hydrated.job,
                    candidates: hydrated.candidates,
                    candidatesLoading: false
                }));
            }
        } catch (err) {
            setState(prev => ({ ...prev, candidatesLoading: false, candidatesError: 'Failed to load campaign' }));
        }
    }, []);

    const setCandidates = useCallback((candidates: ShortlistCandidate[]) => {
        setState(prev => ({ ...prev, candidates }));
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
        setState(prev => {
            if (prev.batchId) {
                api.updateCandidate(prev.batchId!, id, { removed: true, removalReason: reason });
            }
            return {
                ...prev,
                candidates: prev.candidates.map(c =>
                    c.id === id ? { ...c, removed: true, removal_reason: reason } : c
                ),
            };
        });
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
        setState(prev => {
            if (prev.batchId) {
                api.updateCandidate(prev.batchId!, id, { stage });
            }
            return {
                ...prev,
                candidates: prev.candidates.map(c =>
                    c.id === id ? { ...c, stage } : c
                ),
            };
        });
    }, []);

    const submitHMDecision = useCallback(async (candidateId: string, decision: 'approved' | 'rejected', notes: string) => {
        const stage = decision === 'approved' ? 'hm_approved' : 'hm_rejected';
        setState(prev => {
            if (prev.batchId) {
                api.updateCandidate(prev.batchId!, candidateId, { 
                    hmDecision: decision, 
                    hmNotes: notes,
                    stage
                 });
            }
            return {
                ...prev,
                candidates: prev.candidates.map(c =>
                    c.id === candidateId ? { 
                        ...c, 
                        hmDecision: decision, 
                        hmNotes: notes,
                        stage
                    } : c
                ),
            };
        });
    }, []);

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

    const setView = useCallback((currentView: AppState['currentView']) => {
        setState(prev => ({ ...prev, currentView }));
    }, []);

    const toggleSidebar = useCallback(() => {
        setState(prev => ({ ...prev, sidebarOpen: !prev.sidebarOpen }));
    }, []);

    const setOfferDraft = useCallback((offerDraft: any | null) => {
        setState(prev => ({ ...prev, offerDraft }));
    }, []);

    const login = useCallback((user: any) => {
        localStorage.setItem('user', JSON.stringify(user));
        setState(prev => ({ ...prev, user }));
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('user');
        localStorage.removeItem('auth_token');
        sessionStorage.removeItem('frontend_ui_state');
        setState(prev => ({ ...prev, user: null }));
        window.location.href = '/login';
    }, []);

    const value: AppContextType = {
        ...state,
        setJob,
        setJobLoading,
        setBatchId,
        setSetupStep,
        setCampaignFiles,
        loadCampaign,
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
        submitHMDecision,
        setOfferDraft,
        toggleSidebar,
        login,
        logout,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextType {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
}

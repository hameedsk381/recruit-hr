// Enhanced API client for reckruit.ai with JWT support and Async Workflows

const getApiBaseUrl = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        return `http://${hostname}:3005`;
    }
    return 'http://localhost:3005';
};

const API_BASE_URL = getApiBaseUrl();

interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: unknown;
    headers?: Record<string, string>;
}

// Token management
// Reserved for future use if needed, currently using direct localStorage access in request/uploadFiles

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;
    const token = localStorage.getItem('auth_token');

    const config: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...headers,
        },
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
}

/**
 * Generic request wrapper matching the 'apiClient' signature expected by many pages.
 */
export const apiClient = {
    get: <T>(url: string, headers?: any) => request<T>(url, { method: 'GET', headers }),
    post: <T>(url: string, body: any, headers?: any) => request<T>(url, { method: 'POST', body, headers }),
    patch: <T>(url: string, body: any, headers?: any) => request<T>(url, { method: 'PATCH', body, headers }),
    delete: <T>(url: string, headers?: any) => request<T>(url, { method: 'DELETE', headers }),
};

async function uploadFiles(
    endpoint: string,
    files: { [key: string]: File | File[] },
    additionalData?: Record<string, string>
): Promise<any> {
    const formData = new FormData();
    const token = localStorage.getItem('auth_token');

    for (const [key, value] of Object.entries(files)) {
        if (Array.isArray(value)) {
            value.forEach((file) => formData.append(key, file));
        } else {
            formData.append(key, value);
        }
    }

    if (additionalData) {
        for (const [key, value] of Object.entries(additionalData)) {
            formData.append(key, value);
        }
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
}

export const api = {
    // Auth
    login: async (email: string, password?: string, tenantId?: string) => {
        const res = await request<{
            success: boolean;
            token: string;
            user: { email: string; tenantId: string };
            error?: string
        }>('/auth/login', {
            method: 'POST',
            body: { email, password, tenantId }
        });
        if (res.success && res.token) {
            localStorage.setItem('auth_token', res.token);
            if (res.user?.tenantId) localStorage.setItem('tenantId', res.user.tenantId);
        }
        return res;
    },

    register: async (email: string, password?: string, tenantId?: string, name?: string) => {
        return request<{
            success: boolean;
            userId: string;
            error?: string;
        }>('/auth/register', {
            method: 'POST',
            body: { email, password, tenantId, name }
        });
    },

    // Job Matching (Refactored to Async)
    match: async (resumeFiles: File[], jdData?: any, jdFile?: File) => {
        const payload: any = { resumes: resumeFiles };
        if (jdFile) payload.job_description = jdFile;

        return uploadFiles('/match', payload, jdData ? { jd_data: JSON.stringify(jdData) } : undefined) as Promise<{ success: boolean, batchId: string, jobCount: number }>;
    },

    // Job Status Polling
    listCampaigns: async () => {
        return request<{ success: boolean; batches: any[] }>('/campaigns');
    },
    getJobStatus: async (params: { jobId?: string, batchId?: string }) => {
        const query = new URLSearchParams(params as any).toString();
        return request<any>(`/job-status?${query}`);
    },

    cancelBatch: async (batchId: string) => {
        return request<{ success: boolean; cancelled: boolean }>('/cancel-batch', {
            method: 'POST',
            body: { batchId }
        });
    },

    // Analytics
    async listIntegrations() {
        return apiClient.get('/integrations');
    },

    async getIntegrationStatus(id: string) {
        return apiClient.get(`/integrations/${id}/status`);
    },

    async listATSJobs(integrationId: string) {
        return apiClient.get(`/integrations/${integrationId}/jobs`);
    },

    async pushATSScore(integrationId: string, data: { atsCandidateId: string, score: number, summary: string, jobId?: string }) {
        return apiClient.post(`/integrations/${integrationId}/push-score`, data);
    },

    getAnalytics: async () => {
        return request<any>('/analytics');
    },

    getRoiAnalytics: async () => {
        return request<any>('/analytics/roi');
    },

    // Privacy & GDPR
    deleteCandidateData: async (candidateId: string) => {
        return request<any>(`/privacy/candidate/${candidateId}`, {
            method: 'DELETE'
        });
    },

    getPrivacyNotice: async () => {
        return request<any>('/dpdp/notice');
    },

    // Copilot Chat
    askCopilot: async (query: string, candidateId?: string, context?: any) => {
        return request<{ success: boolean; response: string; data?: any }>('/copilot/chat', {
            method: 'POST',
            body: { query, candidateId, context }
        });
    },

    extractResume: async (file: File) => {
        return uploadFiles('/extract-resume', { resume: file });
    },

    // Interviews
    getInterviews: async () => {
        return request<{ success: boolean; interviews: any[] }>('/interviews');
    },

    scheduleInterview: async (data: any) => {
        return request<{ success: boolean; interview: any }>('/interviews/schedule', {
            method: 'POST',
            body: data
        });
    },

    suggestInterviewTimes: async (candidateId: string) => {
        return request<{ success: boolean; suggestions: any[] }>('/interviews/suggest-times', {
            method: 'POST',
            body: { candidateId }
        });
    },

    cancelInterview: async (id: string) => {
        return request<{ success: boolean }>('/interviews/cancel', {
            method: 'POST',
            body: { id }
        });
    },

    rescheduleInterview: async (id: string, startTime: string) => {
        return request<{ success: boolean }>('/interviews/reschedule', {
            method: 'POST',
            body: { id, startTime }
        });
    },

    // Scorecards
    submitScorecard: async (data: any) => {
        return request<{ success: boolean; scorecard: any }>('/scorecards', {
            method: 'POST',
            body: data
        });
    },

    getScorecard: async (interviewId: string) => {
        return request<{ success: boolean; scorecard: any }>(`/scorecards?interviewId=${interviewId}`);
    },

    getCandidateScorecards: async (candidateId: string) => {
        return request<{ success: boolean; scorecards: any[] }>(`/scorecards/candidate?candidateId=${candidateId}`);
    },

    synthesizeScorecards: async (candidateId: string) => {
        return request<{ success: boolean; synthesis: string }>(`/scorecards/synthesis?candidateId=${candidateId}`);
    },

    getCalendarStatus: async () => {
        return request<{ success: boolean; connected: boolean; provider: string | null; email: string | null }>('/calendar/status');
    },

    connectCalendar: async (email: string) => {
        return request<{ success: boolean }>('/calendar/connect', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    },

    extractJD: async (file: File) => {
        return uploadFiles('/extract-jd', { jobDescription: file }) as Promise<any>;
    },

    extractJDText: async (text: string) => {
        return request<{ success: boolean; data: any }>('/extract-jd-text', {
            method: 'POST',
            body: { text }
        });
    },

    // Recruiter State Persistence
    getActiveState: async () => {
        return request<{ success: boolean; state: any }>('/recruiter/active-state');
    },

    updateCandidate: async (batchId: string, candidateId: string, updates: any) => {
        return request<{ success: boolean }>('/recruiter/update-candidate', {
            method: 'POST',
            body: { batchId, candidateId, ...updates }
        });
    },

    getRecruiterHistory: async () => {
        return request<{ success: boolean; history: any[] }>('/recruiter/history');
    },

    atsSync: async (data: { batchResultId: string, provider: 'ZOHO' | 'DARWINBOX', externalCandidateId: string }) => {
        return request<{ success: boolean }>('/ats/sync', {
            method: 'POST',
            body: data
        });
    },

    // AI Recruiter Copilot Assessments
    assessCandidate: async (candidateData: any, jdData: any) => {
        return request<{ success: boolean; assessment: any }>('/assess-candidate', {
            method: 'POST',
            body: { candidate: candidateData, jobDescription: jdData }
        });
    },

    assessBatch: async (candidates: any[], jdData: any) => {
        return request<{ success: boolean; results: any[] }>('/assess-batch', {
            method: 'POST',
            body: { candidates, jobDescription: jdData }
        });
    },

    // High-Volume Batch Processing Queue
    startBatchProcessing: async (formData: FormData) => {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_BASE_URL}/batch/start`, {
            method: 'POST',
            headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: formData,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    },

    getBatchQueueStatus: async (batchId: string) => {
        return request<{ success: boolean; status: string; queueStatus: any }>(`/batch/status/${batchId}`);
    },

    // Advanced Screenings (Voice / Evaluation / MCQ)
    generateVoiceQuestions: async (jdData: any, context?: string) => {
        return request<{ success: boolean; questions: any[] }>('/generate-voice-questions', {
            method: 'POST',
            body: { jd: typeof jdData === 'string' ? jdData : JSON.stringify(jdData), context }
        });
    },

    evaluateTextAnswer: async (question: string, answer: string, jdContext?: string) => {
        return request<{ success: boolean; evaluation: any }>('/evaluate', {
            method: 'POST',
            body: { question, answer, context: jdContext }
        });
    },

    evaluateAudioAnswer: async (file: File, question: string, context?: string) => {
        return uploadFiles('/evaluate-audio', { audio: file }, { question, ...(context && { context }) });
    },

    generateMcq: async (_jdData: any, resumeData?: any) => {
        return request<{ success: boolean; questions: any[] }>('/generate-mcq', {
            method: 'POST',
            body: {
                resume: resumeData ? (typeof resumeData === 'string' ? resumeData : JSON.stringify(resumeData)) : undefined
            }
        });
    },

    // Phase 4: Public Candidate Portal
    getPublicJobs: async (tenantId: string) => {
        return request<{ success: boolean; jobs: any[] }>(`/public/jobs?tenantId=${tenantId}`);
    },

    getPublicJobBySlug: async (slug: string) => {
        return request<{ success: boolean; job: any }>(`/public/jobs/${slug}`);
    },

    publicApply: async (data: { name: string, email: string, jobId: string, tenantId: string, resume: File }) => {
        return uploadFiles('/public/apply', { resume: data.resume }, {
            name: data.name,
            email: data.email,
            jobId: data.jobId,
            tenantId: data.tenantId
        });
    },

    matchMyResume: async (tenantId: string, resume: File) => {
        const formData = new FormData();
        formData.append('tenantId', tenantId);
        formData.append('resume', resume);

        const response = await fetch(`${API_BASE_URL}/public/match-my-resume`, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    },

    getApplicationStatus: async (token: string) => {
        return request<{ success: boolean; application: any }>(`/public/track?token=${token}`);
    },

    candidateChat: async (message: string, token: string) => {
        return request<{ success: boolean; response: string; isFinished: boolean }>('/public/chat', {
            method: 'POST',
            body: { message, token }
        });
    },

    // ── Phase 1: Requisitions ──────────────────────────────────────────────
    listRequisitions: (params?: { status?: string; department?: string }) =>
        request<{ success: boolean; requisitions: any[] }>(`/v1/requisitions${params ? '?' + new URLSearchParams(params as any) : ''}`),

    createRequisition: (data: any) =>
        request<{ success: boolean; requisition: any }>('/v1/requisitions', { method: 'POST', body: data }),

    getRequisition: (id: string) =>
        request<{ success: boolean; requisition: any }>(`/v1/requisitions/${id}`),

    updateRequisition: (id: string, data: any) =>
        request<{ success: boolean; requisition: any }>(`/v1/requisitions/${id}`, { method: 'PATCH', body: data }),

    approveRequisition: (id: string, data: { decision: string; comment?: string }) =>
        request<{ success: boolean; requisition: any }>(`/v1/requisitions/${id}/approve`, { method: 'POST', body: data }),

    publishRequisition: (id: string) =>
        request<{ success: boolean; requisition: any }>(`/v1/requisitions/${id}/publish`, { method: 'POST', body: {} }),

    // ── Phase 1: Offers ───────────────────────────────────────────────────
    listOffers: (params?: { candidateId?: string; status?: string }) =>
        request<{ success: boolean; offers: any[] }>(`/v1/offers${params ? '?' + new URLSearchParams(params as any) : ''}`),

    createOffer: (data: any) =>
        request<{ success: boolean; offer: any }>('/v1/offers', { method: 'POST', body: data }),

    getOffer: (id: string) =>
        request<{ success: boolean; offer: any }>(`/v1/offers/${id}`),

    sendOffer: (id: string) =>
        request<{ success: boolean; offer: any }>(`/v1/offers/${id}/send`, { method: 'POST', body: {} }),

    withdrawOffer: (id: string, reason: string) =>
        request<{ success: boolean }>(`/v1/offers/${id}/withdraw`, { method: 'POST', body: { reason } }),

    // ── Phase 2: Talent Pool ──────────────────────────────────────────────
    searchTalentPool: (params?: { q?: string; tags?: string; stage?: string; source?: string; limit?: number; offset?: number }) =>
        request<{ success: boolean; profiles: any[]; total: number }>(`/v1/talent-pool${params ? '?' + new URLSearchParams(params as any) : ''}`),

    addToTalentPool: (data: any) =>
        request<{ success: boolean; profile: any }>('/v1/talent-pool', { method: 'POST', body: data }),

    getTalentProfile: (id: string) =>
        request<{ success: boolean; profile: any }>(`/v1/talent-pool/${id}`),

    updateTalentProfile: (id: string, data: any) =>
        request<{ success: boolean; profile: any }>(`/v1/talent-pool/${id}`, { method: 'PATCH', body: data }),

    addTalentNote: (id: string, text: string) =>
        request<{ success: boolean; profile: any }>(`/v1/talent-pool/${id}`, { method: 'PATCH', body: { _addNote: true, text } }),

    enrollNurture: (id: string, sequenceId: string) =>
        request<{ success: boolean; profile: any }>(`/v1/talent-pool/${id}/nurture`, { method: 'POST', body: { sequenceId } }),

    // ── Phase 2: Referrals ────────────────────────────────────────────────
    submitReferral: (data: any) =>
        request<{ success: boolean; referral: any }>('/v1/referrals', { method: 'POST', body: data }),

    listReferrals: (params?: { status?: string; referrerId?: string }) =>
        request<{ success: boolean; referrals: any[] }>(`/v1/referrals${params ? '?' + new URLSearchParams(params as any) : ''}`),

    updateReferralStatus: (id: string, status: string) =>
        request<{ success: boolean; referral: any }>(`/v1/referrals/${id}/status`, { method: 'PATCH', body: { status } }),

    // ── Phase 2: Nurture Sequences ────────────────────────────────────────
    listNurtureSequences: () =>
        request<{ success: boolean; sequences: any[] }>('/v1/nurture/sequences'),

    // ── Phase 2: Job Postings ─────────────────────────────────────────────
    listJobPostings: (params?: { platform?: string; status?: string }) =>
        request<{ success: boolean; postings: any[] }>(`/v1/job-postings${params ? '?' + new URLSearchParams(params as any) : ''}`),

    // ── Phase 3: Predictions ──────────────────────────────────────────────
    predictOfferAcceptance: (data: any) =>
        request<{ success: boolean; prediction: any }>('/v1/predictions/offer-acceptance', { method: 'POST', body: data }),

    predictTimeToFill: (data: any) =>
        request<{ success: boolean; prediction: any }>('/v1/predictions/time-to-fill', { method: 'POST', body: data }),

    predictRetentionRisk: (data: any) =>
        request<{ success: boolean; prediction: any }>('/v1/predictions/retention-risk', { method: 'POST', body: data }),

    getAIWeights: () =>
        request<{ success: boolean; weights: any }>('/v1/predictions/weights'),

    recordOutcome: (data: any) =>
        request<{ success: boolean }>('/v1/predictions/outcomes', { method: 'POST', body: data }),

    // ── Phase 3: Knowledge / RAG ──────────────────────────────────────────
    listKnowledgeDocs: () =>
        request<{ success: boolean; documents: any[] }>('/v1/knowledge'),

    ingestDocument: (data: { text: string; filename: string; type: string; description?: string }) =>
        request<{ success: boolean; docId: string }>('/v1/knowledge/ingest', { method: 'POST', body: data }),

    queryKnowledge: (question: string) =>
        request<{ success: boolean; answer: string; citations: any[]; confidence: string }>('/v1/knowledge/query', { method: 'POST', body: { question } }),

    deleteKnowledgeDoc: (id: string) =>
        request<{ success: boolean }>(`/v1/knowledge/${id}`, { method: 'DELETE' }),

    // ── Phase 3: Fairness / Bias ──────────────────────────────────────────
    scanJDForBias: (jdText: string) =>
        request<{ success: boolean; flags: any[]; clean: boolean }>('/v1/fairness/scan-jd', { method: 'POST', body: { jdText } }),

    generateBiasReport: (data: { requisitionId: string; from: string; to: string }) =>
        request<{ success: boolean; report: any }>('/v1/fairness/report', { method: 'POST', body: data }),

    // ── Phase 3: Video Interviews ─────────────────────────────────────────
    createVideoSession: (data: { interviewId: string; scheduledAt: string }) =>
        request<{ success: boolean; session: any }>('/v1/video-sessions', { method: 'POST', body: data }),

    listVideoSessions: (interviewId?: string) =>
        request<{ success: boolean; sessions: any[] }>(`/v1/video-sessions${interviewId ? '?interviewId=' + interviewId : ''}`),

    getVideoSession: (id: string) =>
        request<{ success: boolean; session: any }>(`/v1/video-sessions/${id}`),

    // ── Phase 5: API Keys ────────────────────────────────────────────────
    listAPIKeys: () =>
        request<{ success: boolean; keys: any[] }>('/v1/auth/api-keys'),

    createAPIKey: (name: string, scopes: string[] = ['all']) =>
        request<{ success: boolean; id: string; key: string }>('/v1/auth/api-keys', { method: 'POST', body: { name, scopes } }),

    revokeAPIKey: (id: string) =>
        request<{ success: boolean }>(`/v1/auth/api-keys/${id}`, { method: 'DELETE' }),

    // ── Phase 4: Enterprise ───────────────────────────────────────────────
    listWorkflows: () =>
        request<{ success: boolean; workflows: any[] }>('/v1/workflows'),

    createWorkflow: (data: any) =>
        request<{ success: boolean; id: string }>('/v1/workflows', { method: 'POST', body: data }),

    generateReport: (config: any) =>
        request<any>('/v1/reports/generate', { method: 'POST', body: config }),

    listOnboarding: () =>
        request<{ success: boolean; records: any[] }>('/v1/onboarding'),

    initiateOnboarding: (data: any) =>
        request<{ success: boolean; id: string }>('/v1/onboarding/initiate', { method: 'POST', body: data }),

    draftOutreach: async (data: { jobContext: any, candidateProfile: any, assessment: any, type: 'invite' | 'reject' | 'nurture' }) => {
        return request<{ success: boolean; draft: { subject: string; body: string } }>('/draft-outreach', {
            method: 'POST',
            body: data
        });
    },

    getSourcingList: async () => {
        return request<{ success: boolean; prospects: any[] }>('/sourcing/list');
    },

    getHiringForecast: async (jobId?: string) => {
        return request<{ success: boolean; forecast: any }>(`/analytics/forecast${jobId ? '?jobId=' + jobId : ''}`);
    },

    getDynamicAssessment: async (batchId: string) => {
        return request<{ success: boolean; problem: any }>(`/assessments/dynamic?batchId=${batchId}`);
    },

    submitAssessment: async (data: { problemId: string, submission: string, candidateId: string, batchId: string }) => {
        return request<{ success: boolean; evaluation: any }>('/assessments/submit', {
            method: 'POST',
            body: data
        });
    },
};

export default api;

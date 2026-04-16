// Enhanced API client for talentacquisation.ai with JWT support and Async Workflows

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
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
        return uploadFiles('/extract-jd', { jobDescription: file });
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

    generateMcq: async (jdData: any, resumeData?: any) => {
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

    publicApply: async (formData: FormData) => {
        const response = await fetch(`${API_BASE_URL}/public/apply`, {
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
    }
};

export default api;

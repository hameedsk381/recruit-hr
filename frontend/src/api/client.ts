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

    // Analytics
    getAnalytics: async () => {
        return request<any>('/analytics');
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
    }
};

export default api;

export interface Interview {
    id: string;
    candidateId: string;
    candidateName: string;
    candidateEmail: string;
    jobId: string;
    jobTitle: string;
    tenantId: string;
    startTime: string; // ISO string
    endTime: string;   // ISO string
    status: 'scheduled' | 'completed' | 'cancelled' | 'pending';
    type: 'technical' | 'hr' | 'culture' | 'coding';
    meetingLink?: string;
    notes?: string;
    recruiterId: string;
    focusAreas?: Array<{ topic: string; why: string; sample_probe_question: string }>;
    calendarEventId?: string;
    calendarLink?: string;
    reminderSent?: boolean;
}

export interface InterviewScheduleRequest {
    candidateId: string;
    candidateName: string;
    candidateEmail: string;
    jobId: string;
    jobTitle: string;
    startTime: string;
    type: Interview['type'];
    notes?: string;
}

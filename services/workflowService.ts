import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { NotificationService } from './notificationService';
import { getMongoDb } from '../utils/mongoClient';
import { WorkflowEngine } from './workflow/workflowEngine';
import { SequenceEngine } from './nurture/sequenceEngine';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export let workflowQueue: Queue;
export let workflowWorker: Worker;

const createRedisConnection = () => {
    return new Redis(REDIS_URL, {
        maxRetriesPerRequest: null,
        enableOfflineQueue: true,
        connectTimeout: 20000, // 20 seconds for remote
        reconnectOnError: (err) => {
            const targetError = 'READONLY';
            if (err.message.includes(targetError)) return true;
            return false;
        },
        retryStrategy: (times) => Math.min(times * 1000, 10000)
    }) as any;
};

export type WorkflowEventType = string;

export interface WorkflowEvent {
    type: WorkflowEventType;
    tenantId: string;
    payload: any;
}

/**
 * Initialize Workflow Infrastructure
 * Ensures DB and Redis are ready before processing background jobs
 */
export function initializeWorkflow() {
    console.log('[Workflow] Initializing Background Workers...');
    
    workflowQueue = new Queue('workflow-triggers', { connection: createRedisConnection() });

    workflowWorker = new Worker(
        'workflow-triggers',
        async (job: Job<WorkflowEvent>) => {
            const { type, tenantId, payload } = job.data;
            console.log(`[WorkflowWorker] Processing event: ${type} for tenant ${tenantId}`);

            try {
                // 1. Core Logic (Legacy)
                switch (type) {
                    case 'CANDIDATE_SHORTLISTED':
                        await handleCandidateShortlisted(tenantId, payload);
                        break;
                    case 'HM_DECISION_FINALIZED':
                        await handleHMDecision(tenantId, payload);
                        break;
                    case 'INTERVIEW_CONFIRMED':
                        await handleInterviewConfirmed(tenantId, payload);
                        break;
                    case 'CANDIDATE_STAGE_CHANGED':
                        await SequenceEngine.triggerAutomatedOutreach(tenantId, type, payload);
                        break;
                }

                // 2. Dynamic Automations (Phase 4)
                await WorkflowEngine.execute(tenantId, type, payload);

            } catch (error) {
                console.error(`[WorkflowWorker] Error processing job ${job.id}:`, error);
                throw error;
            }
        },
        { connection: createRedisConnection(), concurrency: 2 }
    );

    console.log('[Workflow] Background Workers Ready');
}


/**
 * Handle: Recruiter moves candidate to HM Review
 */
async function handleCandidateShortlisted(tenantId: string, payload: any) {
    const { candidateName, jobTitle, hmEmail } = payload;
    
    await NotificationService.dispatch({
        tenantId,
        recipientEmail: hmEmail,
        title: 'Action Required: New Candidate for Review',
        message: `Hello, a new candidate (${candidateName}) has been shortlisted for the position: ${jobTitle}. Please review and provide your feedback.`,
        channels: ['EMAIL', 'SLACK']
    });
}

/**
 * Handle: HM Approves or Rejects a candidate
 */
async function handleHMDecision(tenantId: string, payload: any) {
    const { candidateName, decision, recruiterEmail, notes } = payload;
    
    await NotificationService.dispatch({
        tenantId,
        recipientEmail: recruiterEmail,
        title: `HM Decision: ${candidateName}`,
        message: `The Hiring Manager has ${decision.toUpperCase()} the candidate ${candidateName}.\n\nNotes: ${notes || 'None'}`,
        channels: ['EMAIL', 'SLACK', 'TEAMS'],
        metadata: {
            Candidate: candidateName,
            Decision: decision,
            Notes: notes
        }
    });
}

/**
 * Handle: Interview successfully booked
 */
async function handleInterviewConfirmed(tenantId: string, payload: any) {
    const { candidateName, startTime, recruiterEmail } = payload;
    
    await NotificationService.dispatch({
        tenantId,
        recipientEmail: recruiterEmail,
        title: 'Interview Confirmed',
        message: `An interview with ${candidateName} has been confirmed for ${startTime}.`,
        channels: ['SLACK', 'TEAMS']
    });
}

/**
 * Public method to trigger events from route handlers
 */
export class WorkflowService {
    static async triggerEvent(event: WorkflowEvent) {
        await workflowQueue.add(event.type, event, {
            removeOnComplete: true,
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 }
        });
    }
}

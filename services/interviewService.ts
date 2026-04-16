import { getMongoDb } from '../utils/mongoClient';
import { Interview } from '../types/interview';
import { createLogger } from '../utils/logger';
import { CalendarService } from './calendarService';
import { EmailService } from './emailService';

const COLLECTION_NAME = 'interviews';

export class InterviewService {

    /**
     * Schedule a new interview
     */
    static async scheduleInterview(interview: Omit<Interview, 'id'>): Promise<Interview> {
        const db = getMongoDb();
        if (!db) throw new Error('DB not initialized');

        const newInterview: Interview = {
            ...interview,
            id: crypto.randomUUID(),
            status: 'scheduled'
        };

        await db.collection(COLLECTION_NAME).insertOne(newInterview);

        // Sync to External Calendar
        const calResult = await CalendarService.createEvent({
            title: `Interview: ${newInterview.candidateName} for ${newInterview.jobTitle}`,
            description: `Technical interview scheduled via TalentAcquisition.ai\n\nNotes: ${newInterview.notes || 'None'}\nMeeting Link: ${newInterview.meetingLink}`,
            startTime: newInterview.startTime,
            endTime: newInterview.endTime,
            attendees: [newInterview.recruiterId]
        });

        if (calResult.success) {
            newInterview.calendarEventId = calResult.providerEventId;
            newInterview.calendarLink = (calResult as any).syncUrl;

            // Update the record with calendar info
            await db.collection(COLLECTION_NAME).updateOne(
                { id: newInterview.id, tenantId: newInterview.tenantId },
                {
                    $set: {
                        calendarEventId: newInterview.calendarEventId,
                        calendarLink: newInterview.calendarLink
                    }
                }
            );
        }

        // Send Email Invite
        await EmailService.sendInterviewInvite(newInterview);

        return newInterview;
    }

    /**
     * Get interviews for a tenant
     */
    static async getTenantInterviews(tenantId: string): Promise<Interview[]> {
        const db = getMongoDb();
        if (!db) throw new Error('DB not initialized');

        const interviews = await db.collection(COLLECTION_NAME)
            .find({ tenantId })
            .sort({ startTime: 1 })
            .toArray() as unknown as Interview[];

        return interviews;
    }

    /**
     * Cancel an interview
     */
    static async cancelInterview(id: string, tenantId: string): Promise<boolean> {
        const db = getMongoDb();
        if (!db) throw new Error('DB not initialized');

        const result = await db.collection(COLLECTION_NAME).updateOne(
            { id, tenantId },
            { $set: { status: 'cancelled' } }
        );

        return result.modifiedCount > 0;
    }

    /**
     * Reschedule an interview
     */
    static async rescheduleInterview(id: string, tenantId: string, startTime: string, endTime: string): Promise<boolean> {
        const db = getMongoDb();
        if (!db) throw new Error('DB not initialized');

        const result = await db.collection(COLLECTION_NAME).updateOne(
            { id, tenantId },
            {
                $set: {
                    startTime,
                    endTime,
                    status: 'scheduled'
                }
            }
        );

        return result.modifiedCount > 0;
    }

    /**
     * Suggest optimal interview times using real availability
     */
    static async suggestInterviewTimes(candidateId: string, tenantId: string, recruiterId: string) {
        const now = new Date();
        const endDate = new Date(now);
        endDate.setDate(now.getDate() + 7); // Look ahead 1 week

        const availability = await CalendarService.getRecruiterAvailability(recruiterId, now, endDate);

        return availability.map((slot, i) => {
            const start = new Date(slot.start);
            return {
                startTime: slot.start,
                endTime: slot.end,
                label: `Slot ${i + 1}: ${start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            };
        });
    }

    /**
     * Automated job to process reminders for upcoming interviews
     */
    static async processPendingReminders() {
        const db = getMongoDb();
        if (!db) return;

        const now = new Date();
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

        // Find interviews that:
        // 1. Are scheduled
        // 2. Start within the next hour
        // 3. Haven't had a reminder sent yet
        const upcomingInterviews = await db.collection(COLLECTION_NAME).find({
            status: 'scheduled',
            reminderSent: { $ne: true },
            startTime: {
                $gte: now.toISOString(),
                $lte: oneHourFromNow.toISOString()
            }
        }).toArray() as unknown as Interview[];

        if (upcomingInterviews.length === 0) return;

        console.log(`[InterviewService] Processing ${upcomingInterviews.length} upcoming reminders...`);

        for (const interview of upcomingInterviews) {
            try {
                await EmailService.sendInterviewReminder(interview);
                await db.collection(COLLECTION_NAME).updateOne(
                    { id: interview.id, tenantId: interview.tenantId },
                    { $set: { reminderSent: true } }
                );
            } catch (error) {
                console.error(`[InterviewService] Failed to send reminder for interview ${interview.id}:`, error);
            }
        }
    }
}

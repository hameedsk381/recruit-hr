import { getMongoDb } from '../utils/mongoClient';

const COLLECTION_NAME = 'availability';

export interface TimeSlot {
    start: string; // ISO String
    end: string;   // ISO String
}

export interface RecruiterAvailability {
    recruiterId: string;
    slots: TimeSlot[];
}

export class CalendarService {
    /**
     * Get recruiter's available slots for a given date range
     * In a real app, this would call Google/Outlook API
     */
    static async getRecruiterAvailability(recruiterId: string, startDate: Date, endDate: Date): Promise<TimeSlot[]> {
        const db = getMongoDb();
        if (!db) return this.getMockAvailability(startDate);

        const record = await db.collection(COLLECTION_NAME).findOne({ recruiterId }) as unknown as RecruiterAvailability;

        if (!record) {
            return this.getMockAvailability(startDate);
        }

        // Simple filtering for range
        return record.slots.filter(slot => {
            const start = new Date(slot.start);
            return start >= startDate && start <= endDate;
        });
    }

    /**
     * Internal mock for demo purposes
     */
    private static getMockAvailability(startDate: Date): TimeSlot[] {
        const slots: TimeSlot[] = [];
        const base = new Date(startDate);
        base.setHours(9, 0, 0, 0); // Start at 9 AM

        for (let i = 0; i < 5; i++) {
            const day = new Date(base);
            day.setDate(day.getDate() + i);

            // Add two 1-hour slots per day
            const slot1 = new Date(day);
            slot1.setHours(10, 0, 0, 0);
            slots.push({
                start: slot1.toISOString(),
                end: new Date(slot1.getTime() + 60 * 60 * 1000).toISOString()
            });

            const slot2 = new Date(day);
            slot2.setHours(14, 0, 0, 0);
            slots.push({
                start: slot2.toISOString(),
                end: new Date(slot2.getTime() + 60 * 60 * 1000).toISOString()
            });
        }
        return slots;
    }

    /**
     * Create a calendar event
     */
    static async createEvent(event: {
        title: string,
        description: string,
        startTime: string,
        endTime: string,
        attendees: string[]
    }) {
        // Here we would call the External Calendar API (Google/Outlook)
        console.log(`[CalendarService] Syncing event: ${event.title} at ${event.startTime}`);

        // Generate a real-world Google Calendar Link for convenience
        const gcalUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${event.startTime.replace(/[-:]/g, '').split('.')[0]}Z/${event.endTime.replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(event.description)}&add=${event.attendees.join(',')}`;

        return {
            success: true,
            providerEventId: `cal_${crypto.randomUUID()}`,
            syncUrl: gcalUrl
        };
    }

    /**
     * Check if a recruiter has a calendar connected
     */
    static async getCalendarStatus(recruiterId: string) {
        // For demo, we'll return connected if we have any availability records
        const db = getMongoDb();
        if (!db) return { connected: true, provider: 'google' };

        const record = await db.collection(COLLECTION_NAME).findOne({ recruiterId });
        return {
            connected: !!record,
            provider: record ? 'google' : null,
            email: record ? 'recruiter@talentacquisition.ai' : null
        };
    }

    /**
     * Update/Connect a calendar
     */
    static async connectCalendar(recruiterId: string, email: string) {
        const db = getMongoDb();
        if (!db) return { success: true };

        await db.collection(COLLECTION_NAME).updateOne(
            { recruiterId },
            {
                $set: {
                    recruiterId,
                    email,
                    connectedAt: new Date().toISOString(),
                    slots: this.getMockAvailability(new Date()) // Initialize with slots
                }
            },
            { upsert: true }
        );

        return { success: true };
    }
}

import { getMongoDb } from '../utils/mongoClient';
import { google } from 'googleapis';

const COLLECTION_NAME = 'availability';

// Initialize OAuth2 Client using environment variables
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID || 'mock_client_id',
    process.env.GOOGLE_CLIENT_SECRET || 'mock_client_secret',
    process.env.GOOGLE_REDIRECT_URL || 'http://localhost:3001/auth/google/callback'
);

export interface TimeSlot {
    start: string; // ISO String
    end: string;   // ISO String
}

export interface RecruiterAvailability {
    recruiterId: string;
    email: string;
    refresh_token?: string;
    slots: TimeSlot[];
}

export class CalendarService {
    /**
     * Get recruiter's available slots for a given date range
     */
    static async getRecruiterAvailability(recruiterId: string, startDate: Date, endDate: Date): Promise<TimeSlot[]> {
        const db = getMongoDb();
        if (!db) return this.getMockAvailability(startDate);

        const record = await db.collection(COLLECTION_NAME).findOne({ recruiterId }) as unknown as RecruiterAvailability;

        if (!record || !record.refresh_token) {
            // Fallback to mock if no real integration exists
            return this.getMockAvailability(startDate);
        }

        try {
            oauth2Client.setCredentials({ refresh_token: record.refresh_token });
            const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
            
            const res = await calendar.freebusy.query({
                requestBody: {
                    timeMin: startDate.toISOString(),
                    timeMax: endDate.toISOString(),
                    items: [{ id: 'primary' }]
                }
            });

            const busySlots = res.data.calendars?.primary?.busy || [];
            
            // In a real sophisticated system, we would calculate free slots by subtracting busySlots from working hours.
            // For now, we'll return a mock list of free slots, filtering out if they overlap with busySlots.
            const potentialSlots = this.getMockAvailability(startDate);
            const actualFreeSlots = potentialSlots.filter(freeSlot => {
                const freeStart = new Date(freeSlot.start).getTime();
                const freeEnd = new Date(freeSlot.end).getTime();
                // Check for overlap
                const overlaps = busySlots.some(busy => {
                    const busyStart = new Date(busy.start!).getTime();
                    const busyEnd = new Date(busy.end!).getTime();
                    return freeStart < busyEnd && freeEnd > busyStart;
                });
                return !overlaps;
            });

            return actualFreeSlots;
        } catch (error) {
            console.error('[CalendarService] Failed to fetch real availability from Google', error);
            return this.getMockAvailability(startDate);
        }
    }

    /**
     * Internal mock for fallback and potential slot generation
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
     * Create a calendar event in Google Calendar
     */
    static async createEvent(event: {
        title: string,
        description: string,
        startTime: string,
        endTime: string,
        attendees: string[],
        recruiterId?: string
    }) {
        let realGoogleEventCreated = false;
        let providerEventId = `cal_${crypto.randomUUID()}`;
        const gcalUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${event.startTime.replace(/[-:]/g, '').split('.')[0]}Z/${event.endTime.replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(event.description)}&add=${event.attendees.join(',')}`;

        const db = getMongoDb();
        if (db && event.recruiterId) {
            const record = await db.collection(COLLECTION_NAME).findOne({ recruiterId: event.recruiterId }) as unknown as RecruiterAvailability;
            if (record && record.refresh_token) {
                try {
                    oauth2Client.setCredentials({ refresh_token: record.refresh_token });
                    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
                    
                    const res = await calendar.events.insert({
                        calendarId: 'primary',
                        sendUpdates: 'all',
                        requestBody: {
                            summary: event.title,
                            description: event.description,
                            start: { dateTime: event.startTime, timeZone: 'UTC' },
                            end: { dateTime: event.endTime, timeZone: 'UTC' },
                            attendees: event.attendees.map(email => ({ email }))
                        }
                    });
                    
                    if (res.data.id) {
                        providerEventId = res.data.id;
                        realGoogleEventCreated = true;
                    }
                } catch (error) {
                    console.error('[CalendarService] Failed to create event in Google Calendar', error);
                }
            }
        }

        if (!realGoogleEventCreated) {
            console.log(`[CalendarService] MOCK SYNCHING EVENT: ${event.title} at ${event.startTime}`);
        }

        return {
            success: true,
            providerEventId: providerEventId,
            syncUrl: gcalUrl // we always give the web intent url for backup
        };
    }

    /**
     * Check if a recruiter has a calendar connected
     */
    static async getCalendarStatus(recruiterId: string) {
        const db = getMongoDb();
        if (!db) return { connected: true, provider: 'google', mock: true };

        const record = await db.collection(COLLECTION_NAME).findOne({ recruiterId });
        return {
            connected: !!record,
            provider: record && record.refresh_token ? 'google' : (record ? 'mock' : null),
            email: record ? (record.email || 'recruiter@example.com') : null
        };
    }

    /**
     * Update/Connect a calendar (in real app, this takes the OAuth authorization code)
     */
    static async connectCalendar(recruiterId: string, email: string, authCode?: string) {
        const db = getMongoDb();
        if (!db) return { success: true };

        let refresh_token = null;
        if (authCode) {
            try {
                const { tokens } = await oauth2Client.getToken(authCode);
                refresh_token = tokens.refresh_token; 
            } catch (err) {
                console.error('[CalendarService] OAuth Token Exchange failed', err);
            }
        }

        await db.collection(COLLECTION_NAME).updateOne(
            { recruiterId },
            {
                $set: {
                    recruiterId,
                    email,
                    refresh_token: refresh_token || undefined,
                    connectedAt: new Date().toISOString(),
                    slots: this.getMockAvailability(new Date()) // Initialize with backup slots
                }
            },
            { upsert: true }
        );

        return { success: true };
    }
}

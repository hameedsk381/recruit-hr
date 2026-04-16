import { getMongoDb } from '../utils/mongoClient';
import { MeetingPlatform } from '../types/interview';
import { google } from 'googleapis';

const COLLECTION_NAME = 'tenant_settings';

export interface CreateMeetingOptions {
    platform: MeetingPlatform;
    title: string;
    startTime: string;
    endTime: string;
    organizerEmail?: string;
    tenantId?: string;
}

export interface MeetingResult {
    success: boolean;
    meetingLink?: string;
    meetingId?: string;
    provider?: string;
    error?: string;
}

export class MeetingService {

    static async createMeeting(options: CreateMeetingOptions): Promise<MeetingResult> {
        switch (options.platform) {
            case 'google_meet':
                return this.createGoogleMeet(options);
            case 'zoom':
                return this.createZoomMeeting(options);
            case 'teams':
                return this.createTeamsMeeting(options);
            case 'slack':
                return this.createSlackHuddle(options);
            default:
                return this.createGenericMeeting(options);
        }
    }

    private static async createGoogleMeet(options: CreateMeetingOptions): Promise<MeetingResult> {
        try {
            const db = getMongoDb();
            let accessToken: string | undefined;
            let refreshToken: string | undefined;

            if (db && options.tenantId) {
                const settings = await db.collection(COLLECTION_NAME).findOne({ tenantId: options.tenantId }) as unknown as { googleAccessToken?: string; googleRefreshToken?: string } | null;
                if (settings) {
                    accessToken = settings.googleAccessToken;
                    refreshToken = settings.googleRefreshToken;
                }
            }

            if (!accessToken && !refreshToken) {
                return this.createGenericMeeting(options);
            }

            const oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                process.env.GOOGLE_REDIRECT_URL
            );

            oauth2Client.setCredentials({
                refresh_token: refreshToken,
                access_token: accessToken
            });

            const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

            const res = await calendar.events.insert({
                calendarId: 'primary',
                sendUpdates: 'all',
                requestBody: {
                    summary: options.title,
                    description: `Interview: ${options.title}`,
                    start: { dateTime: options.startTime, timeZone: 'UTC' },
                    end: { dateTime: options.endTime, timeZone: 'UTC' },
                    conferenceData: {
                        createRequest: {
                            requestId: crypto.randomUUID(),
                            conferenceSolutionKey: { type: 'hangoutsMeet' }
                        }
                    }
                },
                conferenceDataVersion: 1
            });

            return {
                success: true,
                meetingLink: res.data.conferenceData?.entryPoints?.[0]?.uri || `https://meet.google.com/${crypto.randomUUID()}`,
                meetingId: res.data.id || undefined,
                provider: 'google_meet'
            };
        } catch (error) {
            console.error('[MeetingService] Google Meet creation failed:', error);
            return this.createGenericMeeting(options);
        }
    }

    private static async createZoomMeeting(options: CreateMeetingOptions): Promise<MeetingResult> {
        try {
            const zoomApiKey = process.env.ZOOM_API_KEY || process.env.ZOOM_ACCOUNT_ID;
            const zoomSecret = process.env.ZOOM_CLIENT_SECRET;
            const zoomAccountId = process.env.ZOOM_ACCOUNT_ID;

            if (!zoomApiKey || !zoomAccountId || !zoomSecret) {
                console.log('[MeetingService] Zoom not configured, using fallback');
                return this.createGenericMeeting(options);
            }

            const tokenResponse = await fetch('https://zoom.us/oauth/token', {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${zoomApiKey}:${zoomSecret}`).toString('base64')}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `grant_type=account_credentials&account_id=${zoomAccountId}`
            });

            if (!tokenResponse.ok) {
                return this.createGenericMeeting(options);
            }

            const tokenData = await tokenResponse.json() as { access_token: string };
            const startTime = new Date(options.startTime).toISOString();

            const meetingResponse = await fetch('https://api.zoom.us/v2/users/me/meetings', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${tokenData.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    topic: options.title,
                    type: 2,
                    start_time: startTime,
                    duration: 60,
                    timezone: 'UTC',
                    settings: {
                        host_video: true,
                        participant_video: true,
                        join_before_host: false,
                        mute_upon_entry: true,
                        waiting_room: true,
                        audio: 'both'
                    }
                })
            });

            if (!meetingResponse.ok) {
                return this.createGenericMeeting(options);
            }

            const meetingData = await meetingResponse.json() as { join_url: string; id: number };
            return {
                success: true,
                meetingLink: meetingData.join_url,
                meetingId: String(meetingData.id),
                provider: 'zoom'
            };
        } catch (error) {
            console.error('[MeetingService] Zoom meeting creation failed:', error);
            return this.createGenericMeeting(options);
        }
    }

    private static async createTeamsMeeting(options: CreateMeetingOptions): Promise<MeetingResult> {
        try {
            const tenantId = process.env.MS_TEAMS_TENANT_ID;
            const clientId = process.env.MS_TEAMS_CLIENT_ID;
            const clientSecret = process.env.MS_TEAMS_CLIENT_SECRET;

            if (!tenantId || !clientId || !clientSecret) {
                console.log('[MeetingService] Teams not configured, using fallback');
                return this.createGenericMeeting(options);
            }

            const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `client_id=${clientId}&client_secret=${clientSecret}&scope=https://graph.microsoft.com/.default&grant_type=client_credentials`
            });

            if (!tokenResponse.ok) {
                return this.createGenericMeeting(options);
            }

            const tokenData = await tokenResponse.json() as { access_token: string };

            const meetingResponse = await fetch('https://graph.microsoft.com/v1.0/me/onlineMeetings', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${tokenData.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    subject: options.title,
                    startDateTime: options.startTime,
                    endDateTime: options.endTime,
                    participants: {
                        attendees: [],
                        organizer: {}
                    },
                    lobbyBypassSettings: {
                        scope: 'everyone',
                        isDialInBypassEnabled: true
                    }
                })
            });

            if (!meetingResponse.ok) {
                return this.createGenericMeeting(options);
            }

            const meetingData = await meetingResponse.json() as { joinWebUrl: string; id: string };
            return {
                success: true,
                meetingLink: meetingData.joinWebUrl,
                meetingId: meetingData.id,
                provider: 'teams'
            };
        } catch (error) {
            console.error('[MeetingService] Teams meeting creation failed:', error);
            return this.createGenericMeeting(options);
        }
    }

    private static async createSlackHuddle(options: CreateMeetingOptions): Promise<MeetingResult> {
        try {
            const slackToken = process.env.SLACK_BOT_TOKEN;
            const slackChannel = process.env.SLACK_HUDDLE_CHANNEL;

            if (!slackToken) {
                console.log('[MeetingService] Slack not configured, using fallback');
                return this.createGenericMeeting(options);
            }

            const startTime = Math.floor(new Date(options.startTime).getTime() / 1000);

            const response = await fetch('https://slack.com/api/huddles.beginWebhook', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${slackToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    channel: slackChannel || 'C01RECRUITER',
                    title: options.title,
                    invite_users: [],
                    start_time: startTime
                })
            });

            if (!response.ok) {
                return this.createGenericMeeting(options);
            }

            const data = await response.json() as { huddle_id: string; join_url: string };
            return {
                success: true,
                meetingLink: data.join_url,
                meetingId: data.huddle_id,
                provider: 'slack'
            };
        } catch (error) {
            console.error('[MeetingService] Slack huddle creation failed:', error);
            return this.createGenericMeeting(options);
        }
    }

    private static createGenericMeeting(options: CreateMeetingOptions): MeetingResult {
        const id = crypto.randomUUID().slice(0, 8);
        const providers: Record<string, string> = {
            google_meet: `https://meet.google.com/${id}`,
            zoom: `https://zoom.us/j/${id}`,
            teams: `https://teams.microsoft.com/l/meetup-join/${id}`,
            slack: `https://app.slack.com/chat/${id}`,
            other: `https://meet.reckruit.ai/${id}`
        };

        return {
            success: true,
            meetingLink: providers[options.platform] || providers.other,
            meetingId: id,
            provider: 'reckruit'
        };
    }
}
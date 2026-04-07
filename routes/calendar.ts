import { CalendarService } from "../services/calendarService";
import { AuthContext } from "../middleware/authMiddleware";

/**
 * Get the calendar connection status for the current user
 */
export async function getCalendarStatusHandler(req: Request, context: AuthContext): Promise<Response> {
    try {
        const status = await CalendarService.getCalendarStatus(context.userId);
        return new Response(JSON.stringify({ success: true, ...status }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Failed to get calendar status', error);
        return new Response(JSON.stringify({ success: false, error: 'Failed to get calendar status' }), { status: 500 });
    }
}

/**
 * Connect a calendar for the current user
 */
export async function connectCalendarHandler(req: Request, context: AuthContext): Promise<Response> {
    try {
        const body = await req.json();
        const { email } = body;

        if (!email) {
            return new Response(JSON.stringify({ success: false, error: 'Email is required' }), { status: 400 });
        }

        const result = await CalendarService.connectCalendar(context.userId, email);
        return new Response(JSON.stringify(result), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Failed to connect calendar', error);
        return new Response(JSON.stringify({ success: false, error: 'Failed to connect calendar' }), { status: 500 });
    }
}

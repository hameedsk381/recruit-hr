import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import api from '../api/client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Calendar,
    Clock,
    Video,
    Plus,
    ExternalLink,
    CalendarDays,
    Sparkles,
    Target,
    HelpCircle,
    XCircle,
    RotateCcw,
    CheckCircle2,
    ClipboardList,
    Mail,
    CalendarCheck
} from 'lucide-react';
import ScorecardDialog from '../components/ScorecardDialog';

export default function Interviews() {
    const {
        interviews,
        setInterviews,
        interviewsLoading,
        setInterviewsLoading,
        setView
    } = useApp();

    const [rescheduleData, setRescheduleData] = useState<{ id: string, candidateId: string } | null>(null);
    const [cancelId, setCancelId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [scorecardInterview, setScorecardInterview] = useState<any | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>('all');
    const [calendarStatus, setCalendarStatus] = useState<{ connected: boolean; email: string | null; provider: string | null } | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);

    const filteredInterviews = interviews.filter(interview => {
        if (statusFilter === 'all') return true;
        return interview.status === statusFilter;
    });

    const fetchInterviews = async () => {
        setInterviewsLoading(true);
        try {
            const res = await api.getInterviews();
            if (res.success) {
                setInterviews(res.interviews);
            }
        } catch (err) {
            console.error('Failed to load interviews', err);
        } finally {
            setInterviewsLoading(false);
        }
    };

    const fetchCalendarStatus = async () => {
        try {
            const res = await api.getCalendarStatus();
            if (res.success) {
                setCalendarStatus({ connected: res.connected, email: res.email, provider: res.provider });
            }
        } catch (err) {
            console.error('Failed to load calendar status', err);
        }
    };

    useEffect(() => {
        fetchInterviews();
        fetchCalendarStatus();
    }, []);

    const handleConnectCalendar = async () => {
        setIsConnecting(true);
        // Simulate OAuth Redirect/Success
        try {
            const res = await api.connectCalendar('recruiter@talentacquisition.ai');
            if (res.success) {
                await fetchCalendarStatus();
            }
        } catch (err) {
            console.error('Failed to connect', err);
        } finally {
            setIsConnecting(false);
        }
    };

    const handleReschedule = async (interviewId: string, candidateId: string) => {
        setRescheduleData({ id: interviewId, candidateId });
        setLoadingSuggestions(true);
        try {
            const res = await api.suggestInterviewTimes(candidateId);
            if (res.success) {
                setSuggestions(res.suggestions);
            }
        } catch (err) {
            console.error('Failed to get suggestions', err);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    const confirmReschedule = async () => {
        if (!rescheduleData || !selectedSlot) return;
        setIsProcessing(true);
        try {
            const res = await api.rescheduleInterview(rescheduleData.id, selectedSlot);
            if (res.success) {
                await fetchInterviews();
                setRescheduleData(null);
                setSelectedSlot(null);
            }
        } catch (err) {
            console.error('Reschedule failed', err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCancel = async () => {
        if (!cancelId) return;
        setIsProcessing(true);
        try {
            const res = await api.cancelInterview(cancelId);
            if (res.success) {
                await fetchInterviews();
                setCancelId(null);
            }
        } catch (err) {
            console.error('Cancel failed', err);
        } finally {
            setIsProcessing(false);
        }
    };

    if (interviewsLoading) {
        return (
            <div className="p-8 flex items-center justify-center h-[calc(100vh-100px)]">
                <div className="animate-pulse size-8 bg-primary rounded-full" />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Interview Schedule</h1>
                    <p className="text-muted-foreground mt-1">Manage and automate your technical evaluations.</p>
                </div>
                <div className="flex items-center gap-3">
                    {calendarStatus?.connected ? (
                        <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full border border-green-100 text-sm font-medium animate-in slide-in-from-right">
                            <CalendarCheck className="size-4" />
                            <span>{calendarStatus.email} synced</span>
                            <div className="size-2 bg-green-500 rounded-full animate-pulse" />
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            className="gap-2 border-primary/20 hover:bg-primary/5 text-primary"
                            onClick={handleConnectCalendar}
                            disabled={isConnecting}
                        >
                            {isConnecting ? (
                                <RotateCcw className="size-4 animate-spin" />
                            ) : (
                                <CalendarDays className="size-4" />
                            )}
                            Connect Google Calendar
                        </Button>
                    )}
                    <Button className="gap-2" onClick={() => setView('shortlist')}>
                        <Plus className="size-4" />
                        Schedule from Shortlist
                    </Button>
                </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex gap-2 border-b pb-4">
                {(['all', 'scheduled', 'completed', 'cancelled'] as const).map(status => {
                    const count = status === 'all'
                        ? interviews.length
                        : interviews.filter(i => i.status === status).length;
                    return (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                                statusFilter === status
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                            )}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                            <span className={cn(
                                "text-xs px-1.5 py-0.5 rounded-full",
                                statusFilter === status ? "bg-primary-foreground/20" : "bg-background"
                            )}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {filteredInterviews.length === 0 ? (
                <Card className="border-2 border-dashed flex flex-col items-center justify-center p-12 text-center space-y-4">
                    <div className="p-4 bg-muted rounded-full">
                        <CalendarDays className="size-10 text-muted-foreground" />
                    </div>
                    <div className="max-w-xs">
                        <h3 className="text-lg font-semibold">
                            {statusFilter === 'all' ? 'No interviews scheduled' : `No ${statusFilter} interviews`}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            {statusFilter === 'all'
                                ? 'Go to your shortlist and select "Schedule Interview" for any candidate to get started.'
                                : `There are no interviews with status "${statusFilter}" at this time.`
                            }
                        </p>
                    </div>
                    {statusFilter === 'all' && (
                        <Button variant="outline" onClick={() => setView('shortlist')}>View Shortlist</Button>
                    )}
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredInterviews.map((interview) => (
                        <Card key={interview.id} className="hover:shadow-md transition-shadow group">
                            <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center gap-6">
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-bold">{interview.candidateName}</h3>
                                        <Badge variant={interview.status === 'scheduled' ? 'default' : 'secondary'}>
                                            {interview.status.charAt(0).toUpperCase() + interview.status.slice(1)}
                                        </Badge>
                                        <Badge variant="outline" className="capitalize">{interview.type}</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground font-medium">
                                        {interview.jobTitle}
                                    </p>
                                    <div className="flex flex-wrap gap-4 mt-4 text-sm">
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                            <Calendar className="size-4" />
                                            {new Date(interview.startTime).toLocaleDateString(undefined, {
                                                weekday: 'short',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                            <Clock className="size-4" />
                                            {new Date(interview.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-blue-600 font-medium">
                                            <Video className="size-4" />
                                            <a href={interview.meetingLink} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                                                Join Meeting <ExternalLink className="size-3" />
                                            </a>
                                        </div>
                                        {/* Sync Status Indicators */}
                                        {interview.status === 'scheduled' && (
                                            <>
                                                {interview.calendarLink && (
                                                    <div className="flex items-center gap-1 text-green-600 text-xs">
                                                        <CalendarCheck className="size-3.5" />
                                                        <a href={interview.calendarLink} target="_blank" rel="noreferrer" className="hover:underline">Open in Calendar</a>
                                                    </div>
                                                )}
                                                {!interview.calendarLink && (
                                                    <div className="flex items-center gap-1 text-green-600 text-xs">
                                                        <CalendarCheck className="size-3.5" />
                                                        <span>Calendar Synced</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1 text-green-600 text-xs">
                                                    <Mail className="size-3.5" />
                                                    <span>Invite Sent</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {interview.status === 'scheduled' && (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleReschedule(interview.id, interview.candidateId)}
                                            >
                                                Reschedule
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-muted-foreground hover:text-destructive"
                                                onClick={() => setCancelId(interview.id)}
                                            >
                                                <XCircle className="size-4" />
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="gap-1"
                                                onClick={() => setScorecardInterview(interview)}
                                            >
                                                <ClipboardList className="size-4" />
                                                Scorecard
                                            </Button>
                                        </>
                                    )}
                                    {interview.status === 'cancelled' && (
                                        <Badge variant="destructive" className="gap-1">
                                            <XCircle className="size-3" />
                                            Cancelled
                                        </Badge>
                                    )}
                                </div>
                            </CardContent>
                            {interview.focusAreas && interview.focusAreas.length > 0 && (
                                <div className="px-6 pb-6 pt-0 border-t">
                                    <div className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mb-3">
                                        <Target className="size-3" />
                                        AI-Suggested Focus Areas
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {interview.focusAreas.map((area, i) => (
                                            <div key={i} className="p-3 rounded-lg bg-muted/50 border border-border/50 space-y-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <span className="font-bold text-sm leading-none">{area.topic}</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground line-clamp-2">{area.why}</p>
                                                <div className="pt-2 flex items-start gap-1.5 text-[11px] text-primary/80 font-medium">
                                                    <HelpCircle className="size-3 shrink-0 mt-0.5" />
                                                    <span className="italic">"{area.sample_probe_question}"</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            )}

            {/* AI Insights Bar */}
            <div className="bg-primary/5 border border-primary/10 rounded-xl p-6 flex flex-col md:flex-row items-center gap-6">
                <div className="p-3 bg-primary/10 rounded-lg">
                    <Sparkles className="size-6 text-primary" />
                </div>
                <div className="flex-1">
                    <h4 className="font-bold text-primary">Interview Copilot enabled</h4>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Our AI has analyzed your candidate shortlist and suggested the best times for technical rounds based on current velocity.
                    </p>
                </div>
                <div className="flex gap-4">
                    <div className="text-center">
                        <div className="text-xl font-bold">84%</div>
                        <div className="text-[10px] uppercase text-muted-foreground font-semibold">Match Confidence</div>
                    </div>
                </div>
            </div>

            {/* Reschedule Dialog */}
            <Dialog open={!!rescheduleData} onOpenChange={(open) => !open && setRescheduleData(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Reschedule Interview</DialogTitle>
                        <DialogDescription>
                            Pick a new AI-suggested slot that works better for the team.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        {loadingSuggestions ? (
                            <div className="flex flex-col items-center justify-center p-8 space-y-4">
                                <RotateCcw className="size-8 text-primary animate-spin" />
                                <p className="text-sm text-muted-foreground">Finding new available slots...</p>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {suggestions.map((slot) => (
                                    <Button
                                        key={slot.startTime}
                                        variant={selectedSlot === slot.startTime ? "default" : "outline"}
                                        className="justify-start h-auto py-3 px-4 text-left font-normal"
                                        onClick={() => setSelectedSlot(slot.startTime)}
                                    >
                                        <div className="flex items-center gap-3 w-full">
                                            <div className={cn(
                                                "size-4 rounded-full border-2 flex items-center justify-center shrink-0",
                                                selectedSlot === slot.startTime ? "border-primary-foreground bg-primary-foreground" : "border-muted-foreground"
                                            )}>
                                                {selectedSlot === slot.startTime && <div className="size-1.5 rounded-full bg-primary" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold">{slot.label.split(': ')[1]}</div>
                                                <div className="text-[10px] opacity-70 uppercase font-semibold">1 Hour Technical Round</div>
                                            </div>
                                            <Sparkles className="size-4 text-primary shrink-0 opacity-50" />
                                        </div>
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRescheduleData(null)}>Cancel</Button>
                        <Button
                            onClick={confirmReschedule}
                            disabled={!selectedSlot || isProcessing}
                            className="gap-2"
                        >
                            {isProcessing ? <RotateCcw className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                            Confirm New Time
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cancel Dialog */}
            <Dialog open={!!cancelId} onOpenChange={(open) => !open && setCancelId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cancel Interview</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to cancel this interview? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setCancelId(null)}>Keep Interview</Button>
                        <Button
                            variant="destructive"
                            onClick={handleCancel}
                            disabled={isProcessing}
                            className="gap-2"
                        >
                            {isProcessing ? <RotateCcw className="size-4 animate-spin" /> : <XCircle className="size-4" />}
                            Yes, Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Scorecard Dialog */}
            {scorecardInterview && (
                <ScorecardDialog
                    interview={scorecardInterview}
                    onClose={() => setScorecardInterview(null)}
                    onSubmit={() => {
                        setScorecardInterview(null);
                        fetchInterviews();
                    }}
                />
            )}
        </div>
    );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}

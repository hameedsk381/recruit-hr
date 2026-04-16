import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import api from '../api/client';
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Calendar,
    Clock,
    Video,
    Plus,
    ExternalLink,
    CalendarDays,
    Sparkles,
    HelpCircle,
    XCircle,
    RotateCcw,
    ClipboardList,
    CalendarCheck,
    Users
} from 'lucide-react';
import ScorecardDialog from '../components/ScorecardDialog';
import { cn } from "@/lib/utils";

export default function Interviews() {
    const {
        interviews,
        setInterviews,
        interviewsLoading,
        setInterviewsLoading,
        candidates,
        setView,
        addInterview,
        selectCandidate
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
    const [scheduleCandidate, setScheduleCandidate] = useState<any | null>(null);
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');
    const [scheduleType, setScheduleType] = useState<'technical' | 'culture'>('technical');
    const [schedulePlatform, setSchedulePlatform] = useState<'google_meet' | 'zoom' | 'teams' | 'slack' | 'other'>('google_meet');

    const filteredInterviews = interviews.filter(interview => {
        if (statusFilter === 'all') return true;
        return interview.status === statusFilter;
    });

    const shortlistedCandidates = candidates.filter(c => 
        !c.removed && 
        (c.stage === 'shortlisted' || c.stage === 'applied') &&
        !interviews.some(i => i.candidateId === c.id && i.status === 'scheduled')
    );

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
            const res = await api.connectCalendar('recruiter@reckruit.ai');
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

    const confirmSchedule = async () => {
        if (!scheduleCandidate || !scheduleDate || !scheduleTime) return;
        setIsProcessing(true);
        try {
            const startTime = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
            const res = await api.scheduleInterview({
                candidateId: scheduleCandidate.id,
                candidateName: scheduleCandidate.profile.name,
                candidateEmail: scheduleCandidate.profile.email || 'candidate@example.com',
                jobId: 'current-job',
                jobTitle: 'Open Position',
                startTime,
                type: scheduleType,
                platform: schedulePlatform,
                notes: ''
            });
            if (res.success) {
                addInterview(res.interview);
                setScheduleCandidate(null);
                setScheduleDate('');
                setScheduleTime('');
                setScheduleType('technical');
                setSchedulePlatform('google_meet');
            }
        } catch (err) {
            console.error('Schedule failed', err);
        } finally {
            setIsProcessing(false);
        }
    };

    if (interviewsLoading) {
        return (
            <div className="p-8 flex items-center justify-center h-[calc(100vh-100px)]">
                <RotateCcw className="size-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-6xl px-4 py-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <CalendarDays className="size-6" />
                        Interviews
                    </h1>
                    <p className="text-sm text-muted-foreground">Manage and automate your technical evaluations.</p>
                </div>
                <div className="flex items-center gap-3">
                    {calendarStatus?.connected ? (
                        <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-700 px-3 py-1.5 rounded-md border border-emerald-500/20 text-xs font-semibold">
                            <CalendarCheck className="size-3.5" />
                            <span>{calendarStatus.email}</span>
                            <div className="size-1.5 bg-emerald-500 rounded-full animate-pulse ml-1" />
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 text-foreground"
                            onClick={handleConnectCalendar}
                            disabled={isConnecting}
                        >
                            {isConnecting ? (
                                <RotateCcw className="size-3.5 animate-spin" />
                            ) : (
                                <CalendarDays className="size-3.5 text-muted-foreground" />
                            )}
                            Sync Calendar
                        </Button>
                    )}
                    <Button size="sm" className="gap-2" onClick={() => setView('shortlist')}>
                        <Plus className="size-3.5" />
                        Schedule
                    </Button>
                </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex gap-2 border-b border-border/50 pb-px">
                {(['all', 'scheduled', 'completed', 'cancelled'] as const).map(status => {
                    const count = status === 'all'
                        ? interviews.length
                        : interviews.filter(i => i.status === status).length;
                    return (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={cn(
                                "px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 border-b-2",
                                statusFilter === status
                                    ? "border-foreground text-foreground"
                                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                            )}
                        >
                            <span className="capitalize">{status}</span>
                            <span className={cn(
                                "text-xs px-1.5 py-0.5 rounded-full inline-flex items-center justify-center font-semibold",
                                statusFilter === status ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                            )}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Shortlisted Candidates Panel */}
            {shortlistedCandidates.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                            <Users className="size-5" />
                            Shortlisted Candidates
                        </h2>
                        <Badge variant="secondary" className="px-2 py-0.5 text-xs font-semibold">
                            {shortlistedCandidates.length} pending
                        </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {shortlistedCandidates.map((candidate) => (
                            <div key={candidate.id} className="vercel-card !p-4 space-y-3 bg-card hover:border-foreground/20 transition-all">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1 min-w-0">
                                        <h3 className="text-base font-semibold text-foreground truncate">{candidate.profile.name}</h3>
                                        <p className="text-xs text-muted-foreground truncate">{candidate.assessment.one_line_summary}</p>
                                    </div>
                                    <Badge variant="outline" className="shrink-0 ml-2 text-[10px] font-semibold uppercase tracking-wider">
                                        {candidate.assessment.fit_assessment.overall_fit} fit
                                    </Badge>
                                </div>
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {candidate.assessment.strengths.slice(0, 2).map((s, i) => (
                                        <span key={i} className="text-[10px] font-medium text-foreground/80 bg-muted px-2 py-0.5 rounded-md border border-border/50">
                                            {s.skill}
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <Button 
                                        variant="default" 
                                        size="sm" 
                                        className="flex-1 h-8 text-xs font-semibold"
                                        onClick={() => setScheduleCandidate(candidate)}
                                    >
                                        <Calendar className="size-3.5 mr-1.5" />
                                        Schedule
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-8 text-xs font-semibold"
                                        onClick={() => selectCandidate(candidate.id)}
                                    >
                                        View
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {filteredInterviews.length === 0 && shortlistedCandidates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 rounded-xl border border-dashed border-border/60 bg-muted/20">
                    <div className="p-4 bg-muted/50 rounded-full">
                        <CalendarDays className="size-10 text-muted-foreground/60" />
                    </div>
                    <div className="max-w-xs">
<h3 className="text-sm font-semibold text-foreground">
                            {statusFilter === 'all' ? 'No interviews scheduled' : `No ${statusFilter} interviews`}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                            {statusFilter === 'all' && shortlistedCandidates.length === 0
                                ? 'Go to your shortlist and select "Schedule" for any candidate to get started.'
                                : statusFilter === 'all'
                                ? `You have ${shortlistedCandidates.length} shortlisted candidates waiting to be scheduled.`
                                : `There are no interviews with status "${statusFilter}" at this time.`
                        }
                        </p>
                    </div>
                    {statusFilter === 'all' && (
                        <Button variant="outline" size="sm" onClick={() => setView('shortlist')} className="mt-2">
                            View Pipeline
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredInterviews.map((interview) => (
                        <div key={interview.id} className="vercel-card !p-0 overflow-hidden hover:border-foreground/20 group bg-card transition-all">
                            <div className="p-5 flex flex-col md:flex-row items-start md:items-center gap-6">
                                <div className="flex-1 space-y-3 min-w-0">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <h3 className="text-base font-semibold text-foreground truncate">{interview.candidateName}</h3>
                                        <Badge variant={interview.status === 'scheduled' ? 'default' : interview.status === 'completed' ? 'secondary' : 'outline'} className="capitalize h-5 px-2 text-[10px] font-semibold tracking-wide">
                                            {interview.status}
                                        </Badge>
                                        <Badge variant="outline" className="capitalize h-5 px-2 text-[10px] font-semibold tracking-wide border-dashed">
                                            {interview.type}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                                        <Users className="size-3.5" />
                                        {interview.jobTitle}
                                    </p>
                                    <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-xs">
                                        <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                                            <Calendar className="size-3.5" />
                                            {new Date(interview.startTime).toLocaleDateString(undefined, {
                                                weekday: 'short',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                                            <Clock className="size-3.5" />
                                            {new Date(interview.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        {interview.status !== 'cancelled' && (
                                            <div className="flex items-center gap-1.5 text-blue-600 font-semibold hover:text-blue-700 transition-colors">
                                                <Video className="size-3.5" />
                                                <a href={interview.meetingLink} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline underline-offset-2">
                                                    Join Meeting <ExternalLink className="size-3" />
                                                </a>
                                            </div>
                                        )}
                                        {/* Sync Status Indicators */}
                                        {interview.status === 'scheduled' && (
                                            <>
                                                {interview.calendarLink ? (
                                                    <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                                                        <CalendarCheck className="size-3.5" />
                                                        <a href={interview.calendarLink} target="_blank" rel="noreferrer" className="hover:underline underline-offset-2">Open Calendar Event</a>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                                                        <CalendarCheck className="size-3.5" />
                                                        <span>Synced</span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 shrink-0">
                                    {interview.status === 'scheduled' && (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 text-xs font-semibold"
                                                onClick={() => handleReschedule(interview.id, interview.candidateId)}
                                            >
                                                Reschedule
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="h-8 text-xs font-semibold gap-1.5"
                                                onClick={() => setScorecardInterview(interview)}
                                            >
                                                <ClipboardList className="size-3.5" />
                                                Scorecard
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => setCancelId(interview.id)}
                                                title="Cancel Interview"
                                            >
                                                <XCircle className="size-4" />
                                            </Button>
                                        </>
                                    )}
                                    {interview.status === 'completed' && (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="h-8 text-xs font-semibold gap-1.5"
                                            onClick={() => setScorecardInterview(interview)}
                                        >
                                            <ClipboardList className="size-3.5" />
                                            View Scorecard
                                        </Button>
                                    )}
                                </div>
                            </div>
                            
                            {/* Focus Areas Section */}
                            {interview.focusAreas && interview.focusAreas.length > 0 && interview.status === 'scheduled' && (
                                <div className="bg-muted/10 px-5 py-4 border-t border-border/50">
                                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                                        <Sparkles className="size-3 text-primary" />
                                        AI Copilot Focus Areas
                                    </div>
                                    <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-thin scrollbar-thumb-muted-foreground/20">
                                        {interview.focusAreas.map((area: any, i: number) => (
                                            <div key={i} className="min-w-[280px] p-3 rounded-lg bg-background border shadow-sm space-y-2 shrink-0">
                                                <div className="font-semibold text-xs text-foreground leading-tight truncate">{area.topic}</div>
                                                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{area.why}</p>
                                                <div className="pt-1.5 flex items-start gap-1.5 text-[10px] text-foreground font-medium">
                                                    <HelpCircle className="size-3 shrink-0 mt-0.5 text-primary opacity-60" />
                                                    <span className="italic">"{area.sample_probe_question}"</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* AI Insights Bar */}
            <div className="bg-muted/30 border rounded-xl p-5 flex flex-col md:flex-row items-center gap-5">
                <div className="p-2.5 bg-background border rounded-md shadow-sm">
                    <Sparkles className="size-5 text-foreground" />
                </div>
                <div className="flex-1 text-center md:text-left">
                    <h4 className="font-semibold text-sm text-foreground">Interview Copilot active</h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                        AI analyzes your candidate shortlist and suggests optimal times for technical rounds based on current team velocity.
                    </p>
                </div>
                <div className="flex gap-4 items-center shrink-0">
                    <div className="text-right">
                        <div className="text-lg font-bold tabular-nums">84%</div>
                        <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Match Confidence</div>
                    </div>
                </div>
            </div>

            {/* Reschedule Dialog */}
            <Dialog open={!!rescheduleData} onOpenChange={(open) => !open && setRescheduleData(null)}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden">
                    <div className="p-6 pb-4">
                        <DialogHeader>
                            <DialogTitle className="text-lg">Reschedule Interview</DialogTitle>
                            <DialogDescription className="text-xs">
                                Pick a new AI-suggested slot based on team availability.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="px-6 py-2 bg-muted/20 border-y">
                        {loadingSuggestions ? (
                            <div className="flex flex-col items-center justify-center py-10 space-y-4">
                                <RotateCcw className="size-6 text-muted-foreground animate-spin" />
                                <p className="text-xs text-muted-foreground font-medium">Scanning calendars...</p>
                            </div>
                        ) : (
                            <div className="grid gap-2 max-h-[40vh] overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 pr-2">
                                {suggestions.map((slot) => (
                                    <Button
                                        key={slot.startTime}
                                        variant={selectedSlot === slot.startTime ? "secondary" : "outline"}
                                        className={cn(
                                            "justify-start h-auto py-3 px-4 text-left font-normal transition-all",
                                            selectedSlot === slot.startTime ? "border-foreground/20 bg-muted/50 ring-1 ring-foreground/10" : "hover:border-foreground/20 hover:bg-muted/10 bg-background"
                                        )}
                                        onClick={() => setSelectedSlot(slot.startTime)}
                                    >
                                        <div className="flex items-center gap-3 w-full">
                                            <div className={cn(
                                                "size-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                                                selectedSlot === slot.startTime ? "border-foreground bg-foreground" : "border-muted-foreground"
                                            )}>
                                                {selectedSlot === slot.startTime && <div className="size-1.5 rounded-full bg-background" />}
                                            </div>
                                            <div className="flex-1 space-y-0.5">
                                                <div className={cn("text-sm font-semibold", selectedSlot === slot.startTime ? "text-foreground" : "")}>
                                                    {slot.label.split(': ')[1]}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">1 Hour Round</div>
                                            </div>
                                            <Sparkles className={cn("size-3.5 shrink-0 transition-opacity", selectedSlot === slot.startTime ? "text-foreground opacity-100" : "text-muted-foreground opacity-50")} />
                                        </div>
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-4 flex justify-end gap-2 bg-muted/10">
                        <Button variant="ghost" size="sm" onClick={() => setRescheduleData(null)}>Cancel</Button>
                        <Button
                            size="sm"
                            onClick={confirmReschedule}
                            disabled={!selectedSlot || isProcessing}
                            className="gap-2 font-semibold"
                        >
                            {isProcessing ? <RotateCcw className="size-3.5 animate-spin" /> : <CalendarCheck className="size-3.5" />}
                            Confirm Time
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Cancel Dialog */}
            <Dialog open={!!cancelId} onOpenChange={(open) => !open && setCancelId(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Cancel Interview?</DialogTitle>
                        <DialogDescription>
                            This will notify the candidate and free up the calendar slot. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setCancelId(null)}>Keep</Button>
                        <Button
                            variant="destructive"
                            onClick={handleCancel}
                            disabled={isProcessing}
                            className="gap-2"
                        >
                            {isProcessing ? <RotateCcw className="size-4 animate-spin" /> : <XCircle className="size-4" />}
                            Cancel Interview
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

            {/* Schedule Candidate Dialog */}
            <Dialog open={!!scheduleCandidate} onOpenChange={(open) => !open && setScheduleCandidate(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Schedule Interview</DialogTitle>
                        <DialogDescription>
                            Schedule an interview for {scheduleCandidate?.profile.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-foreground">Interview Type</label>
                            <Select value={scheduleType} onValueChange={(val: any) => setScheduleType(val)}>
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="technical">Technical Round</SelectItem>
                                    <SelectItem value="culture">Culture Fit</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-foreground">Meeting Platform</label>
                            <Select value={schedulePlatform} onValueChange={(val: any) => setSchedulePlatform(val)}>
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="google_meet">Google Meet</SelectItem>
                                    <SelectItem value="zoom">Zoom</SelectItem>
                                    <SelectItem value="teams">Microsoft Teams</SelectItem>
                                    <SelectItem value="slack">Slack Huddle</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-foreground">Date</label>
                                <input 
                                    type="date" 
                                    value={scheduleDate}
                                    onChange={(e) => setScheduleDate(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-foreground">Time</label>
                                <input 
                                    type="time" 
                                    value={scheduleTime}
                                    onChange={(e) => setScheduleTime(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="mt-4 gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setScheduleCandidate(null)}>Cancel</Button>
                        <Button
                            onClick={confirmSchedule}
                            disabled={!scheduleDate || !scheduleTime || isProcessing}
                            className="gap-2"
                        >
                            {isProcessing ? <RotateCcw className="size-4 animate-spin" /> : <CalendarCheck className="size-4" />}
                            Schedule Interview
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

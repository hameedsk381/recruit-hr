import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import api from '../api/client';
import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    Pin,
    Sparkles,
    Check,
    AlertCircle,
    Mail,
    Phone,
    Linkedin,
    Factory,
    Microscope,
    Clipboard,
    Target,
    Mic,
    Tag,
    ThumbsUp,
    ThumbsDown,
    PauseCircle,
    Briefcase,
    Info,
    ChevronsRight,
    Search,
    Users,
    Clock,
    Pencil,
    Trash2,
    ShieldAlert,
    MoreHorizontal,
    Activity,
    Database
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';

export default function CandidateDetail() {
    const {
        candidates,
        selectedCandidateId,
        selectCandidate,
        pinCandidate,
        toggleCopilot,
        copilot,
        setView,
        job,
        batchId,
        updateCandidateStage,
        removeCandidate
    } = useApp();

    const [notes, setNotes] = useState('');
    const [notesSaved, setNotesSaved] = useState(false);
    const [isScheduling, setIsScheduling] = useState(false);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [schedulingSuccess, setSchedulingSuccess] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [scorecards, setScorecards] = useState<any[]>([]);
    const [scorecardsLoading, setScorecardsLoading] = useState(false);
    const [synthesis, setSynthesis] = useState<string | null>(null);
    const [synthesisLoading, setSynthesisLoading] = useState(false);

    const candidate = candidates.find(c => c.id === selectedCandidateId);
    const currentIndex = candidates.findIndex(c => c.id === selectedCandidateId);
    const totalCandidates = candidates.length;

    useEffect(() => {
        if (selectedCandidateId) {
            setScorecardsLoading(true);
            api.getCandidateScorecards(selectedCandidateId)
                .then(res => {
                    if (res.success) setScorecards(res.scorecards || []);
                })
                .catch(err => console.error('Failed to load scorecards', err))
                .finally(() => setScorecardsLoading(false));
        }
    }, [selectedCandidateId]);

    useEffect(() => {
        if (candidate?.assessment.recruiter_notes?.notes) {
            setNotes(candidate.assessment.recruiter_notes.notes);
        } else {
            setNotes('');
        }
        setNotesSaved(false);
    }, [selectedCandidateId, candidate]);

    const goToPrevious = () => currentIndex > 0 && selectCandidate(candidates[currentIndex - 1].id);
    const goToNext = () => currentIndex < candidates.length - 1 && selectCandidate(candidates[currentIndex + 1].id);
    const handleSaveNotes = () => { setNotesSaved(true); setTimeout(() => setNotesSaved(false), 3000); };

    const handleOpenScheduling = async () => {
        setIsScheduling(true);
        setLoadingSuggestions(true);
        try {
            const res = await api.suggestInterviewTimes(candidate?.id || '');
            if (res.success) setSuggestions(res.suggestions);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    const handleSchedule = async () => {
        if (!selectedSlot || !candidate) return;
        const slot = suggestions.find(s => s.startTime === selectedSlot);
        if (!slot) return;
        try {
            const res = await api.scheduleInterview({
                candidateId: candidate.id,
                candidateName: candidate.profile.name,
                candidateEmail: candidate.profile.email || '',
                jobId: job?.id || 'current-job',
                jobTitle: job?.title || 'Engineer',
                startTime: slot.startTime,
                type: 'technical',
                notes: `AI-suggested slot`,
            });
            if (res.success) {
                setSchedulingSuccess(true);
                setTimeout(() => { setIsScheduling(false); setSchedulingSuccess(false); setView('interviews'); }, 2000);
            }
        } catch (err) { console.error(err); }
    };

    const handleSynthesize = async () => {
        if (!selectedCandidateId) return;
        setSynthesisLoading(true);
        try {
            const res = await api.synthesizeScorecards(selectedCandidateId);
            if (res.success) setSynthesis(res.synthesis);
        } finally { setSynthesisLoading(false); }
    };

    if (!candidate) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-6">
                <div className="size-16 rounded-xl border flex items-center justify-center bg-muted/30">
                    <Users size={32} className="text-muted-foreground/30" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">Select a candidate</h2>
                    <p className="text-muted-foreground max-w-sm mx-auto">Initiate deep analysis and coordination by selecting a profile.</p>
                </div>
                <Button variant="outline" className="h-10 rounded-md" onClick={() => setView('shortlist')}>
                    Return to Shortlist
                </Button>
            </div>
        );
    }

    const { profile, assessment } = candidate;

    return (
        <div className="space-y-12 animate-in fade-in duration-500 pb-24">
            {/* Minimalist Header */}
            <header className="flex flex-col md:flex-row justify-between items-center gap-6 pb-8 border-b">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={() => setView('shortlist')} className="h-9 font-bold px-4">
                        <ArrowLeft size={16} className="mr-2" /> Back
                    </Button>
                    <div className="flex items-center gap-1 border rounded-md p-1 bg-muted/20">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPrevious} disabled={currentIndex === 0}><ChevronLeft size={14} /></Button>
                        <span className="text-[10px] font-bold px-2">{currentIndex + 1} / {totalCandidates}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToNext} disabled={currentIndex === totalCandidates - 1}><ChevronRight size={14} /></Button>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className={cn("h-9 font-bold", candidate.pinned && "bg-black text-white")} onClick={() => pinCandidate(candidate.id)}>
                        <Pin size={16} className={cn("mr-2", candidate.pinned && "fill-current")} />
                        {candidate.pinned ? 'Pinned' : 'Pin Profile'}
                    </Button>
                    <Button variant="secondary" size="sm" className="h-9 font-bold" onClick={toggleCopilot}>
                        <Sparkles size={16} className={cn("mr-2", copilot.isOpen && "animate-pulse")} />
                        Copilot
                    </Button>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-12">
                    {/* Identity & Core Metrics */}
                    <div className="space-y-8">
                        <div className="flex justify-between items-start gap-6">
                            <div className="space-y-2">
                                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">{profile.name}</h1>
                                <p className="text-lg text-muted-foreground font-medium">
                                    {profile.recent_role?.title || 'Candidate Profile'} {profile.recent_role?.company ? `• ${profile.recent_role?.company}` : ''}
                                </p>
                            </div>
                            <div className="flex flex-col items-center justify-center text-center">
                                <div className={cn(
                                    "size-20 rounded-xl flex items-center justify-center border-2 mb-2 shadow-sm",
                                    assessment.fit_assessment.overall_fit === 'high' ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" :
                                    assessment.fit_assessment.overall_fit === 'medium' ? "border-amber-500 bg-amber-500/10 text-amber-600" :
                                    "border-blue-500 bg-blue-500/10 text-blue-600"
                                )}>
                                    <span className="text-4xl font-black">{assessment.fit_assessment.overall_fit === 'high' ? 'A+' : assessment.fit_assessment.overall_fit === 'medium' ? 'B' : 'C'}</span>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Match Rating</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-6 border-t border-border/50">
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Clock size={12} /> Industrial Tenure</p>
                                <p className="text-xl font-bold tabular-nums text-foreground">{profile.experience_estimate?.total_years || '0'} Years</p>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Activity size={12} /> Competency Cloud</p>
                                <p className="text-xl font-bold tabular-nums text-foreground">{profile.extracted_skills.length} Nodes</p>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><ShieldAlert size={12} /> Compliance ID</p>
                                <p className="text-lg font-mono text-muted-foreground">{candidate.id.split('-')[0]}</p>
                            </div>
                        </div>
                    </div>

                    {/* AI Analysis Sections */}
                    <div className="space-y-10">
                        <section className="space-y-4">
                            <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2 text-foreground">
                                <Sparkles size={16} /> Semantic Assessment
                            </h3>
                            <div className="vercel-card bg-muted/40 border-border/50 shadow-sm">
                                <p className="text-lg font-medium leading-relaxed italic text-foreground">"{assessment.one_line_summary}"</p>
                                {assessment.fit_assessment.reasoning && (
                                    <p className="mt-5 text-sm text-muted-foreground leading-relaxed border-t border-border/60 pt-5">{assessment.fit_assessment.reasoning}</p>
                                )}
                            </div>
                        </section>

                        {(candidate as any).screeningSummary && (
                            <section className="space-y-4 animate-in slide-in-from-bottom-2 duration-700">
                                <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-indigo-600">
                                    <Mic size={16} /> AI Technical Evaluator Insights
                                </h3>
                                <div className="vercel-card bg-indigo-500/5 border-indigo-500/10 shadow-lg shadow-indigo-500/10 p-8 space-y-4">
                                    <div className="flex items-start gap-4">
                                        <div className="size-12 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                            <Sparkles size={20} className="text-indigo-600" />
                                        </div>
                                        <div className="space-y-4">
                                            <p className="text-sm text-indigo-900/80 font-medium leading-relaxed">
                                                The candidate completed a technical evaluator interview. Key highlights from the transcript:
                                            </p>
                                            <div className="prose prose-sm prose-indigo max-w-none text-indigo-950 font-serif text-lg leading-relaxed">
                                                {(candidate as any).screeningSummary}
                                            </div>
                                            <div className="flex items-center gap-2 pt-4 border-t border-indigo-200">
                                                <Badge className="bg-indigo-600 text-white border-transparent">Verified Transcript</Badge>
                                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Sovereign Identity Protection Active</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-2 text-emerald-600">
                                    <ThumbsUp size={14} /> Critical Strengths
                                </h4>
                                <div className="space-y-3">
                                    {assessment.strengths.map((s, i) => (
                                        <div key={i} className="vercel-card !p-4 border-emerald-500/10 bg-emerald-500/5 shadow-sm">
                                            <p className="font-semibold text-sm text-foreground">{s.skill}</p>
                                            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{s.evidence}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-2 text-amber-600">
                                    <AlertCircle size={14} /> Strategic Gaps
                                </h4>
                                <div className="space-y-3">
                                    {assessment.gaps_and_risks.map((r, i) => (
                                        <div key={i} className="vercel-card !p-4 border-amber-500/10 bg-amber-500/5 shadow-sm">
                                            <p className="font-semibold text-sm text-foreground">{r.area}</p>
                                            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{r.explanation}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <section className="space-y-4 pb-8">
                            <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2 text-foreground">
                                <Target size={16} /> Requirement Alignment
                            </h3>
                            <div className="vercel-card !p-0 divide-y divide-border/50 shadow-sm overflow-hidden">
                                {assessment.skill_match_breakdown.map((s, i) => (
                                    <div key={i} className="p-4 flex items-center justify-between group hover:bg-muted/30 transition-colors">
                                        <div className="space-y-1 pr-6">
                                            <p className="text-sm font-semibold text-foreground">{s.required_skill}</p>
                                            <p className="text-xs text-muted-foreground line-clamp-2 md:line-clamp-none">{s.notes}</p>
                                        </div>
                                        <Badge variant="outline" className={cn(
                                            "shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5",
                                            s.candidate_coverage === 'strong' ? "border-emerald-500/50 text-emerald-700 bg-emerald-500/10" : "border-border text-muted-foreground bg-muted/50"
                                        )}>
                                            {s.candidate_coverage}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>

                {/* Right Sidebar - Action Context */}
                <div className="space-y-8">
                    {/* ATS Sync Card */}
                    <div className="vercel-card !p-0 overflow-hidden bg-card/60 shadow-sm border-border/70 backdrop-blur-md">
                        <div className="p-4 border-b border-border/50 bg-muted/40">
                            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <Database size={12} /> Ecosystem Sync
                            </h3>
                        </div>
                        <div className="p-5 space-y-4">
                            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                                Deploy this assessment blueprint to your talent operating system.
                            </p>
                            <div className="grid grid-cols-1 gap-2.5">
                                <Button 
                                    variant="outline" 
                                    className="justify-between h-9 rounded-md text-[10px] font-semibold uppercase tracking-wider border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 hover:text-emerald-700 hover:border-emerald-500/50 transition-all group"
                                    onClick={async () => {
                                        try {
                                            const res = await api.atsSync({
                                                batchResultId: batchId || candidate.id,
                                                provider: 'ZOHO',
                                                externalCandidateId: 'ZOHO_CANDIDATE_REF'
                                            });
                                            if (res.success) alert('Synced to Zoho Recruit successfully!');
                                        } catch (e) {
                                            alert('ATS Sync failed. Check connectivity.');
                                        }
                                    }}
                                >
                                    Push to Zoho Recruit
                                    <ChevronRight size={14} className="opacity-40 group-hover:translate-x-0.5 group-hover:opacity-100 transition-all text-emerald-600" />
                                </Button>
                                <Button 
                                    variant="outline" 
                                    className="justify-between h-9 rounded-md text-[10px] font-semibold uppercase tracking-wider border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 hover:text-indigo-700 hover:border-indigo-500/50 transition-all group"
                                    onClick={async () => {
                                        try {
                                            const res = await api.atsSync({
                                                batchResultId: batchId || candidate.id,
                                                provider: 'DARWINBOX',
                                                externalCandidateId: 'DBOX_CANDIDATE_REF'
                                            });
                                            if (res.success) alert('Synced to Darwinbox successfully!');
                                        } catch (e) {
                                            alert('ATS Sync failed. Check connectivity.');
                                        }
                                    }}
                                >
                                    Sync to Darwinbox
                                    <ChevronRight size={14} className="opacity-40 group-hover:translate-x-0.5 group-hover:opacity-100 transition-all text-indigo-600" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="vercel-card !p-5 space-y-5 bg-card shadow-sm border-border/70">
                        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Activity size={14} /> Workflow Stage
                        </h4>
                        <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                            {(['applied', 'shortlisted', 'technical', 'culture', 'pending', 'offer'] as const).map(s => (
                                <button
                                    key={s}
                                    onClick={() => updateCandidateStage(candidate.id, s)}
                                    className={cn(
                                        "text-center px-2 py-2 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-all border",
                                        candidate.stage === s 
                                            ? "bg-foreground text-background border-foreground shadow-sm" 
                                            : "bg-muted/30 text-muted-foreground border-border/50 hover:border-border hover:bg-muted/70 hover:text-foreground"
                                    )}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="vercel-card !p-5 space-y-4 bg-card shadow-sm border-border/70">
                        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <MoreHorizontal size={14} /> Contact Nodes
                        </h4>
                        <div className="space-y-2.5">
                            {profile.email && <div className="text-xs font-medium border border-border/60 rounded-md px-3.5 py-2.5 flex items-center justify-between hover:bg-muted/40 cursor-pointer truncate transition-colors text-foreground"><span className="truncate pr-4">{profile.email}</span><Mail size={14} className="opacity-40 shrink-0" /></div>}
                            {profile.phone && <div className="text-xs font-medium border border-border/60 rounded-md px-3.5 py-2.5 flex items-center justify-between hover:bg-muted/40 cursor-pointer transition-colors text-foreground"><span>{profile.phone}</span><Phone size={14} className="opacity-40 shrink-0" /></div>}
                            {(!profile.email && !profile.phone) && <div className="text-xs text-muted-foreground italic text-center py-2">No contact information available</div>}
                        </div>
                    </div>

                    <div className="pt-2">
                        <Button 
                            variant="outline" 
                            className="w-full justify-start h-10 rounded-md text-xs font-semibold text-destructive border-destructive/20 bg-destructive/5 hover:bg-destructive hover:text-destructive-foreground transition-all group"
                            onClick={async () => {
                                if (confirm("DPDP: Irreversibly erase this profile's PII and interview traces?")) {
                                    await api.deleteCandidateData(candidate.id);
                                    setView('shortlist');
                                }
                            }}
                        >
                            <ShieldAlert size={14} className="mr-2 opacity-70 group-hover:opacity-100" /> 
                            Right to Erasure (DPDP)
                        </Button>
                    </div>
                </div>
            </main>

            {/* Dialogs */}
            <Dialog open={isScheduling} onOpenChange={setIsScheduling}>
                <DialogContent className="rounded-xl border-border/40 shadow-2xl p-0 overflow-hidden max-w-sm bg-card">
                    <div className="p-8 space-y-6">
                        <div className="space-y-2 flex flex-col items-center text-center">
                            <h3 className="text-xl font-bold tracking-tight text-foreground">Technical Loop</h3>
                            <p className="text-xs text-muted-foreground font-medium">Select an AI-calibrated window for evaluation.</p>
                        </div>
                        {loadingSuggestions ? <div className="py-12 flex justify-center"><Loader2 size={24} className="animate-spin text-foreground opacity-50" /></div> : (
                            <div className="space-y-2">
                                {suggestions.map(s => (
                                    <div key={s.startTime} className={cn("p-4 border border-border/60 rounded-md cursor-pointer hover:bg-muted/40 transition-all text-center", selectedSlot === s.startTime && "border-foreground bg-foreground text-background shadow-md")} onClick={() => setSelectedSlot(s.startTime)}>
                                        <p className="text-sm font-semibold">{new Date(s.startTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                                        <p className="text-[10px] opacity-70 font-semibold uppercase tracking-wider mt-0.5">{new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex gap-2.5 pt-2">
                            <Button variant="outline" className="flex-1 font-semibold rounded-md h-9 border-border/60" onClick={() => setIsScheduling(false)}>Cancel</Button>
                            <Button className="flex-1 font-semibold rounded-md h-9 shadow-sm" disabled={!selectedSlot} onClick={handleSchedule}>Launch</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function Loader2(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
}

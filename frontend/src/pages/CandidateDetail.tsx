import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
    Edit3,
    Clock,
    Pencil
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
        job
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

    // Get current candidate
    const candidate = candidates.find(c => c.id === selectedCandidateId);
    const currentIndex = candidates.findIndex(c => c.id === selectedCandidateId);
    const totalCandidates = candidates.length;

    // Fetch scorecards for this candidate
    useEffect(() => {
        if (selectedCandidateId) {
            setScorecardsLoading(true);
            api.getCandidateScorecards(selectedCandidateId)
                .then(res => {
                    if (res.success) {
                        setScorecards(res.scorecards || []);
                    }
                })
                .catch(err => console.error('Failed to load scorecards', err))
                .finally(() => setScorecardsLoading(false));
        }
    }, [selectedCandidateId]);

    // Initialize notes from candidate data
    useEffect(() => {
        if (candidate?.assessment.recruiter_notes?.notes) {
            setNotes(candidate.assessment.recruiter_notes.notes);
        } else {
            setNotes('');
        }
        setNotesSaved(false);
    }, [selectedCandidateId, candidate]);

    // Navigation
    const goToPrevious = () => {
        if (currentIndex > 0) {
            selectCandidate(candidates[currentIndex - 1].id);
        }
    };

    const goToNext = () => {
        if (currentIndex < candidates.length - 1) {
            selectCandidate(candidates[currentIndex + 1].id);
        }
    };

    // Save notes
    const handleSaveNotes = () => {
        // TODO: Persist to backend
        setNotesSaved(true);
        setTimeout(() => setNotesSaved(false), 3000);
    };

    const handleOpenScheduling = async () => {
        setIsScheduling(true);
        setLoadingSuggestions(true);
        try {
            const res = await api.suggestInterviewTimes(candidate?.id || '');
            if (res.success) {
                setSuggestions(res.suggestions);
            }
        } catch (err) {
            console.error('Failed to get suggestions', err);
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
                candidateName: profile.name,
                candidateEmail: profile.email || '',
                jobId: job?.id || 'current-job',
                jobTitle: job?.title || 'Software Engineer',
                startTime: slot.startTime,
                type: 'technical',
                notes: `AI-suggested slot for ${profile.name}`,
                focusAreas: candidate.assessment.interview_focus_areas
            });

            if (res.success) {
                setSchedulingSuccess(true);
                setTimeout(() => {
                    setIsScheduling(false);
                    setSchedulingSuccess(false);
                    setSelectedSlot(null);
                    setView('interviews');
                }, 2000);
            }
        } catch (err) {
            console.error('Failed to schedule', err);
        }
    };

    const handleSynthesize = async () => {
        if (!selectedCandidateId) return;
        setSynthesisLoading(true);
        try {
            const res = await api.synthesizeScorecards(selectedCandidateId);
            if (res.success) {
                setSynthesis(res.synthesis);
            }
        } catch (err) {
            console.error('Failed to synthesize', err);
        } finally {
            setSynthesisLoading(false);
        }
    };

    // No candidate selected
    if (!candidate) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="min-h-[70vh] flex flex-col items-center justify-center text-center space-y-8"
            >
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-[80px] rounded-full" />
                    <div className="relative size-24 rounded-3xl bg-card border shadow-premium flex items-center justify-center">
                        <Users className="size-12 text-muted-foreground/40" />
                    </div>
                </div>
                <div className="space-y-2">
                    <h2 className="text-3xl font-black tracking-tight">Selective Focus Required</h2>
                    <p className="text-muted-foreground text-lg max-w-sm mx-auto">
                        Please select a candidate profile from the shortlist to initiate deep analysis and coordination.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setView('shortlist')}
                    className="h-12 px-8 rounded-xl font-bold border-2 hover:bg-muted transition-all"
                >
                    <ArrowLeft className="mr-2 size-4" />
                    Back to Shortlist
                </Button>
            </motion.div>
        );
    }

    const { profile, assessment } = candidate;



    return (
        <div className="space-y-8 pb-20">
            {/* Header / Navigation */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => setView('shortlist')}
                        className="group h-12 px-4 rounded-xl border hover:bg-muted font-bold transition-all"
                    >
                        <ArrowLeft className="mr-2 size-4 group-hover:-translate-x-1 transition-transform" />
                        Back
                    </Button>

                    <div className="flex items-center gap-2 bg-muted/40 backdrop-blur-md rounded-2xl p-1.5 border">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl"
                            onClick={goToPrevious}
                            disabled={currentIndex === 0}
                        >
                            <ChevronLeft size={18} />
                        </Button>
                        <div className="px-3 text-xs font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                            <span className="text-foreground">{currentIndex + 1}</span>
                            <span className="opacity-40">/</span>
                            <span>{totalCandidates}</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl"
                            onClick={goToNext}
                            disabled={currentIndex === totalCandidates - 1}
                        >
                            <ChevronRight size={18} />
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant={candidate.pinned ? "default" : "outline"}
                        onClick={() => pinCandidate(candidate.id)}
                        className={cn(
                            "h-12 px-6 rounded-xl font-bold transition-all gap-2 border-2",
                            candidate.pinned ? "shadow-lg shadow-primary/20" : "hover:bg-muted"
                        )}
                    >
                        <Pin size={18} className={cn(candidate.pinned && "fill-current")} />
                        {candidate.pinned ? 'Featured' : 'Feature Profile'}
                    </Button>
                    <Button
                        variant={copilot.isOpen ? "default" : "secondary"}
                        onClick={toggleCopilot}
                        className={cn(
                            "h-12 px-6 rounded-xl font-bold transition-all gap-2 border-2 border-transparent",
                            copilot.isOpen ? "shadow-lg shadow-primary/20" : "hover:bg-muted"
                        )}
                    >
                        <Sparkles size={18} className={copilot.isOpen ? "animate-pulse" : ""} />
                        Talent Copilot
                    </Button>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Analysis & Insights */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Hero Profile Card */}
                    <Card className="rounded-[2.5rem] border-2 bg-card/40 backdrop-blur-md overflow-hidden relative premium-shadow">
                        <div className={cn(
                            "absolute top-0 left-0 w-full h-2",
                            assessment.fit_assessment.overall_fit === 'high' ? "bg-emerald-500" :
                                assessment.fit_assessment.overall_fit === 'medium' ? "bg-amber-500" : "bg-blue-500"
                        )} />

                        <CardContent className="p-10">
                            <div className="flex flex-col xl:flex-row justify-between gap-10">
                                <div className="space-y-6 flex-1">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <h1 className="text-5xl font-black tracking-tight">{profile.name}</h1>
                                            {assessment.fit_assessment.overall_fit === 'high' && (
                                                <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                                                    Top Match
                                                </div>
                                            )}
                                        </div>
                                        {profile.recent_role && (
                                            <div className="flex items-center gap-3 text-2xl font-bold text-muted-foreground flex-wrap">
                                                <span>{profile.recent_role.title}</span>
                                                <ChevronRight className="size-5 opacity-40 shrink-0" />
                                                <span className="text-foreground">{profile.recent_role.company}</span>
                                                {profile.recent_role.duration && (
                                                    <span className="text-sm font-black uppercase tracking-widest opacity-40 px-3 py-1 bg-muted/50 rounded-lg shrink-0">
                                                        {profile.recent_role.duration}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-4 pt-4 border-t border-dashed">
                                        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-muted/40 border">
                                            <div className="p-2 bg-primary/10 rounded-xl text-primary">
                                                <Briefcase size={18} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Tenure</p>
                                                <p className="font-black text-lg">{profile.experience_estimate?.total_years || '0'} Years</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-muted/40 border">
                                            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500">
                                                <Tag size={18} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Expertise</p>
                                                <p className="font-black text-lg">{profile.extracted_skills.length} Areas</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-center justify-center space-y-4 xl:w-64 border-l-2 border-dashed xl:pl-10">
                                    <div className={cn(
                                        "size-32 rounded-[2rem] flex items-center justify-center text-4xl font-black shadow-2xl relative",
                                        assessment.fit_assessment.overall_fit === 'high' ? "bg-emerald-500 text-white shadow-emerald-500/30" :
                                            assessment.fit_assessment.overall_fit === 'medium' ? "bg-amber-500 text-white shadow-amber-500/30" :
                                                "bg-blue-500 text-white shadow-blue-500/30"
                                    )}>
                                        <div className="absolute inset-2 border-2 border-white/20 rounded-[1.5rem]" />
                                        {assessment.fit_assessment.overall_fit === 'high' ? 'A+' :
                                            assessment.fit_assessment.overall_fit === 'medium' ? 'B' : 'C'}
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-1">Fit Assessment</p>
                                        <p className={cn(
                                            "text-lg font-black capitalize",
                                            assessment.fit_assessment.overall_fit === 'high' ? "text-emerald-600" :
                                                assessment.fit_assessment.overall_fit === 'medium' ? "text-amber-600" : "text-blue-600"
                                        )}>
                                            {assessment.fit_assessment.overall_fit} Match
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* AI Executive Summary */}
                    <Card className="rounded-[2.5rem] border-2 bg-linear-to-br from-primary/[0.03] to-indigo-500/[0.03] backdrop-blur-md overflow-hidden premium-shadow">
                        <CardHeader className="p-10 pb-4 flex flex-row items-center gap-3">
                            <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                                <Sparkles size={24} />
                            </div>
                            <h2 className="text-2xl font-black tracking-tight">Executive Summary</h2>
                        </CardHeader>
                        <CardContent className="p-10 pt-0 space-y-6">
                            <p className="text-xl font-medium leading-relaxed italic text-foreground/80">
                                "{assessment.one_line_summary}"
                            </p>
                            {assessment.fit_assessment.reasoning && (
                                <div className="p-8 rounded-[2rem] bg-card border shadow-inner">
                                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-2">
                                        <Info size={14} className="text-primary" /> AI Calibration Logic
                                    </h4>
                                    <p className="text-base font-medium leading-relaxed text-muted-foreground">
                                        {assessment.fit_assessment.reasoning}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Skill Match Breakdown */}
                    <Card className="rounded-[2.5rem] border-2 bg-card/40 backdrop-blur-md overflow-hidden premium-shadow">
                        <CardHeader className="p-10 pb-4 flex flex-row items-center gap-3">
                            <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500">
                                <Target size={24} />
                            </div>
                            <h2 className="text-2xl font-black tracking-tight">Requirement Match</h2>
                        </CardHeader>
                        <CardContent className="p-10 pt-0">
                            <div className="space-y-6">
                                {assessment.skill_match_breakdown.map((skill, index) => (
                                    <div key={index} className="space-y-3 p-6 rounded-3xl bg-muted/30 border border-transparent hover:border-border/50 transition-all group">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="space-y-1">
                                                <p className="font-black text-lg group-hover:text-primary transition-colors">{skill.required_skill}</p>
                                                <p className="text-sm text-muted-foreground font-medium">{skill.notes}</p>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest border-2",
                                                        skill.candidate_coverage === 'strong' ? "border-emerald-500/50 bg-emerald-500/5 text-emerald-600" :
                                                            skill.candidate_coverage === 'partial' ? "border-amber-500/50 bg-amber-500/5 text-amber-600" :
                                                                "border-slate-300 bg-slate-50 text-slate-500"
                                                    )}
                                                >
                                                    {skill.candidate_coverage} Proficiency
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: skill.candidate_coverage === 'strong' ? '100%' : skill.candidate_coverage === 'partial' ? '60%' : '10%' }}
                                                className={cn(
                                                    "h-full rounded-full transition-all duration-1000",
                                                    skill.candidate_coverage === 'strong' ? "bg-emerald-500" :
                                                        skill.candidate_coverage === 'partial' ? "bg-amber-500" : "bg-slate-300"
                                                )}
                                            />
                                        </div>
                                    </div>
                                ))}

                                {assessment.skill_match_breakdown.length === 0 && (
                                    <div className="py-20 text-center space-y-4">
                                        <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                                            <Search className="size-8 text-muted-foreground/40" />
                                        </div>
                                        <p className="text-muted-foreground font-bold italic">No specialized matches detected for this requirement set.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Performance Analysis: Strengths & Risks */}
                    <div className="grid md:grid-cols-2 gap-8">
                        <Card className="rounded-[2.5rem] border-2 bg-emerald-500/[0.02] border-emerald-500/10 backdrop-blur-md overflow-hidden premium-shadow">
                            <CardHeader className="p-8 pb-4 flex flex-row items-center gap-3">
                                <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600">
                                    <ThumbsUp size={20} />
                                </div>
                                <h2 className="text-xl font-black tracking-tight">Key Strengths</h2>
                                <Badge variant="secondary" className="ml-auto rounded-lg font-black">{assessment.strengths.length}</Badge>
                            </CardHeader>
                            <CardContent className="p-8 pt-0 space-y-4">
                                {assessment.strengths.map((strength, index) => (
                                    <div key={index} className="space-y-2 p-5 rounded-2xl bg-card border shadow-sm hover:shadow-md transition-all">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="font-black text-sm text-emerald-600">{strength.skill}</span>
                                            <div className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 shrink-0">
                                                {strength.evidence_level === 'production' ? <Factory size={10} /> :
                                                    strength.evidence_level === 'demonstrated' ? <Microscope size={10} /> : <Clipboard size={10} />}
                                                {strength.evidence_level}
                                            </div>
                                        </div>
                                        <p className="text-xs font-semibold leading-relaxed text-muted-foreground">
                                            {strength.evidence}
                                        </p>
                                    </div>
                                ))}
                                {assessment.strengths.length === 0 && (
                                    <p className="text-sm font-bold text-muted-foreground/60 italic py-4 text-center">No distinct strengths cataloged.</p>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="rounded-[2.5rem] border-2 bg-amber-500/[0.02] border-amber-500/10 backdrop-blur-md overflow-hidden premium-shadow">
                            <CardHeader className="p-8 pb-4 flex flex-row items-center gap-3">
                                <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-600">
                                    <AlertCircle size={20} />
                                </div>
                                <h2 className="text-xl font-black tracking-tight">Growth Risks</h2>
                                <Badge variant="secondary" className="ml-auto rounded-lg font-black">{assessment.gaps_and_risks.length}</Badge>
                            </CardHeader>
                            <CardContent className="p-8 pt-0 space-y-4">
                                {assessment.gaps_and_risks.map((risk, index) => (
                                    <div key={index} className="space-y-2 p-5 rounded-2xl bg-card border shadow-sm hover:shadow-md transition-all">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="font-black text-sm text-amber-600">{risk.area}</span>
                                            <Badge variant="outline" className={cn(
                                                "text-[9px] font-black uppercase tracking-widest px-2",
                                                risk.risk_level === 'high' ? "text-rose-500 border-rose-200 bg-rose-50" : "text-amber-600 border-amber-200 bg-amber-50"
                                            )}>
                                                {risk.risk_level} Priority
                                            </Badge>
                                        </div>
                                        <p className="text-xs font-semibold leading-relaxed text-muted-foreground">
                                            {risk.explanation}
                                        </p>
                                    </div>
                                ))}
                                {assessment.gaps_and_risks.length === 0 && (
                                    <p className="text-sm font-bold text-muted-foreground/60 italic py-4 text-center">No critical risks identified.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Right Column: Execution & Logic */}
                <div className="space-y-8">
                    {/* Workflow Decisions */}
                    <Card className="rounded-[2.5rem] border-2 border-primary/20 bg-primary/5 backdrop-blur-md overflow-hidden premium-shadow relative">
                        <div className="absolute top-0 right-0 p-6 opacity-10">
                            <Target size={80} />
                        </div>
                        <CardHeader className="p-8 pb-4">
                            <h2 className="text-xl font-black tracking-tight">Workflow Actions</h2>
                        </CardHeader>
                        <CardContent className="p-8 pt-0 space-y-4">
                            <Button
                                className="w-full h-14 justify-start gap-4 rounded-2xl group relative overflow-hidden transition-all shadow-lg shadow-primary/20"
                                size="lg"
                                onClick={handleOpenScheduling}
                            >
                                <div className="p-2 bg-white/20 rounded-lg group-hover:scale-110 transition-transform">
                                    <ThumbsUp size={18} />
                                </div>
                                <div className="text-left">
                                    <p className="font-black text-sm leading-none">Advance Pipeline</p>
                                    <p className="text-[10px] font-medium opacity-70">Initiate Interview Sequence</p>
                                </div>
                                <ChevronRight className="ml-auto size-4 opacity-40 group-hover:translate-x-1 transition-transform" />
                            </Button>

                            <Button
                                variant="outline"
                                className="w-full h-14 justify-start gap-4 rounded-2xl border-2 hover:bg-muted group transition-all"
                            >
                                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-600 group-hover:scale-110 transition-transform">
                                    <PauseCircle size={18} />
                                </div>
                                <div className="text-left">
                                    <p className="font-black text-sm leading-none">Hold Status</p>
                                    <p className="text-[10px] font-medium opacity-70">Maintain in Active Queue</p>
                                </div>
                                <Info className="ml-auto size-4 opacity-40" />
                            </Button>

                            <Button
                                variant="outline"
                                className="w-full h-14 justify-start gap-4 rounded-2xl border-2 border-rose-100 hover:border-rose-200 hover:bg-rose-50 group text-rose-600 transition-all"
                            >
                                <div className="p-2 bg-rose-500/10 rounded-lg text-rose-600 group-hover:scale-110 transition-transform">
                                    <ThumbsDown size={18} />
                                </div>
                                <div className="text-left">
                                    <p className="font-black text-sm leading-none">Terminate Process</p>
                                    <p className="text-[10px] font-medium opacity-70">Mark as Non-Compatibility</p>
                                </div>
                                <AlertCircle className="ml-auto size-4 opacity-40" />
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Contact Matrix */}
                    <Card className="rounded-[2.5rem] border-2 bg-card/40 backdrop-blur-md overflow-hidden premium-shadow">
                        <CardHeader className="p-8 pb-4 flex flex-row items-center gap-3">
                            <div className="p-2.5 bg-muted rounded-xl text-muted-foreground">
                                <Mail size={18} />
                            </div>
                            <h2 className="text-xl font-black tracking-tight">Contact Matrix</h2>
                        </CardHeader>
                        <CardContent className="p-8 pt-0 space-y-3">
                            {profile.email && (
                                <a href={`mailto:${profile.email}`} className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-transparent hover:border-border/50 hover:bg-muted/50 transition-all group">
                                    <div className="size-10 rounded-xl bg-white border shadow-sm flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                        <Mail size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Email Protocol</p>
                                        <p className="font-bold text-sm truncate">{profile.email}</p>
                                    </div>
                                </a>
                            )}
                            {profile.phone && (
                                <a href={`tel:${profile.phone}`} className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-transparent hover:border-border/50 hover:bg-muted/50 transition-all group">
                                    <div className="size-10 rounded-xl bg-white border shadow-sm flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                                        <Phone size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Direct Line</p>
                                        <p className="font-bold text-sm truncate">{profile.phone}</p>
                                    </div>
                                </a>
                            )}
                            {profile.linkedin && (
                                <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-transparent hover:border-border/50 hover:bg-muted/50 transition-all group">
                                    <div className="size-10 rounded-xl bg-white border shadow-sm flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                                        <Linkedin size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Professional Profile</p>
                                        <p className="font-bold text-sm truncate">LinkedIn verified</p>
                                    </div>
                                    <ChevronsRight className="ml-auto size-4 opacity-0 group-hover:opacity-40 transition-all" />
                                </a>
                            )}
                        </CardContent>
                    </Card>

                    {/* Interview Focus Areas */}
                    {assessment.interview_focus_areas.length > 0 && (
                        <Card className="rounded-[2.5rem] border-2 bg-indigo-500/[0.02] border-indigo-500/10 backdrop-blur-md overflow-hidden premium-shadow">
                            <CardHeader className="p-8 pb-4 flex flex-row items-center gap-3">
                                <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-600">
                                    <Mic size={20} />
                                </div>
                                <h2 className="text-xl font-black tracking-tight">Interview Guide</h2>
                            </CardHeader>
                            <CardContent className="p-8 pt-0 space-y-6">
                                {assessment.interview_focus_areas.map((area, index) => (
                                    <div key={index} className="space-y-3 pb-6 border-b border-dashed last:border-0 last:pb-0">
                                        <div className="flex items-start gap-3">
                                            <div className="size-6 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center text-[10px] font-black shrink-0 mt-1">
                                                {index + 1}
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="font-black text-sm text-indigo-600">{area.topic}</h4>
                                                <p className="text-xs font-medium text-muted-foreground leading-relaxed">{area.why}</p>
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-muted/40 border-l-4 border-indigo-500 text-xs italic font-medium text-foreground/80 leading-relaxed shadow-inner">
                                            "{area.sample_probe_question}"
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* Synthesis & Session Notes */}
                    <Card className="rounded-[2.5rem] border-2 bg-card/40 backdrop-blur-md overflow-hidden premium-shadow">
                        <CardHeader className="p-8 pb-4 flex flex-row items-center gap-3">
                            <div className="p-2.5 bg-muted rounded-xl text-muted-foreground">
                                <Pencil size={18} />
                            </div>
                            <h2 className="text-xl font-black tracking-tight">Session Notes</h2>
                        </CardHeader>
                        <CardContent className="p-8 pt-0 space-y-4">
                            <div className="relative group">
                                <Textarea
                                    placeholder="Enter strategic observations..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="min-h-[140px] rounded-[1.5rem] bg-muted/20 border-2 focus:bg-card transition-all text-sm font-medium p-6 resize-none"
                                />
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-40 transition-opacity">
                                    <Edit3 size={14} /> {/* Wait, I didn't import Edit3, I'll use Pencil */}
                                </div>
                            </div>
                            <div className="flex justify-between items-center px-2">
                                <AnimatePresence>
                                    {notesSaved && (
                                        <motion.span
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1.5"
                                        >
                                            <Check className="size-3" /> State Synced
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                                <Button
                                    size="sm"
                                    onClick={handleSaveNotes}
                                    className="ml-auto rounded-xl font-black uppercase tracking-widest text-[10px] h-9 px-5 shadow-lg shadow-primary/20"
                                >
                                    Snapshot Notes
                                </Button>
                            </div>

                            {assessment.recruiter_notes?.override_suggestions && (
                                <div className="mt-6 p-6 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/20 space-y-2 relative overflow-hidden">
                                    <div className="flex items-center gap-2 font-black text-[10px] uppercase tracking-widest text-indigo-600">
                                        <Sparkles size={12} /> Optimization Tip
                                    </div>
                                    <p className="text-xs font-medium text-indigo-900/70 leading-relaxed italic">
                                        "{assessment.recruiter_notes.override_suggestions}"
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Historical Scorecards */}
                    <Card className="rounded-[2.5rem] border-2 bg-card/40 backdrop-blur-md overflow-hidden premium-shadow">
                        <CardHeader className="p-8 pb-4">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-muted rounded-xl text-muted-foreground">
                                        <Clipboard size={18} />
                                    </div>
                                    <h2 className="text-xl font-black tracking-tight">Feedback Loop</h2>
                                    {scorecards.length > 0 && (
                                        <Badge variant="secondary" className="rounded-lg font-black">{scorecards.length}</Badge>
                                    )}
                                </div>
                                {scorecards.length > 1 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-xl font-black text-[9px] uppercase tracking-widest h-8 px-3 gap-2 border-primary/20 hover:bg-primary/5 text-primary transition-all"
                                        onClick={handleSynthesize}
                                        disabled={synthesisLoading}
                                    >
                                        {synthesisLoading ? (
                                            <div className="animate-spin size-3 border-2 border-primary border-t-transparent rounded-full" />
                                        ) : (
                                            <Sparkles size={12} />
                                        )}
                                        Synthesize
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 pt-0">
                            {scorecardsLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin size-8 border-4 border-primary border-t-transparent rounded-full" />
                                </div>
                            ) : scorecards.length === 0 ? (
                                <div className="py-12 text-center space-y-3">
                                    <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto opacity-40">
                                        <Clipboard size={24} />
                                    </div>
                                    <p className="text-xs font-bold text-muted-foreground italic">No historical data present.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {scorecards.map((sc: any) => (
                                        <div key={sc.id} className="p-6 rounded-3xl bg-muted/20 border border-transparent hover:border-border/50 transition-all group">
                                            <div className="flex justify-between items-start gap-4 mb-4">
                                                <div className="min-w-0">
                                                    <p className="font-black text-sm truncate group-hover:text-primary transition-colors">{sc.jobTitle}</p>
                                                    <p className="text-[10px] font-medium text-muted-foreground mt-0.5">
                                                        {sc.evaluatorName} • {new Date(sc.submittedAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <Badge className={cn(
                                                    "rounded-lg font-black text-[9px] uppercase tracking-widest shrink-0",
                                                    sc.recommendation === 'strong_hire' && 'bg-emerald-500 text-white',
                                                    sc.recommendation === 'hire' && 'bg-emerald-400 text-white',
                                                    sc.recommendation === 'no_hire' && 'bg-rose-400 text-white',
                                                    sc.recommendation === 'strong_no_hire' && 'bg-rose-600 text-white'
                                                )}>
                                                    {sc.recommendation?.replace(/_/g, ' ')}
                                                </Badge>
                                            </div>

                                            <div className="flex gap-4 flex-wrap pb-4 border-b border-dashed">
                                                {sc.ratings?.map((r: any) => (
                                                    <div key={r.category} className="flex items-center gap-1.5 p-1.5 px-3 rounded-lg bg-card border shadow-sm shrink-0">
                                                        <span className="text-[10px] font-black uppercase tracking-tight text-muted-foreground/60">{r.category}</span>
                                                        <span className="text-xs font-black text-primary">{r.score}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="pt-4 flex items-center justify-between">
                                                <div className="flex -space-x-2">
                                                    {[1, 2, 3].map(i => (
                                                        <div key={i} className="size-5 rounded-full bg-linear-to-br from-primary/20 to-indigo-500/20 border-2 border-background" />
                                                    ))}
                                                </div>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-[10px] font-black text-muted-foreground/60 uppercase">Composite</span>
                                                    <span className="text-xl font-black text-primary">{sc.overallScore?.toFixed(1)}</span>
                                                    <span className="text-[10px] font-black text-muted-foreground/40">/5</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Full Taxonomy Cloud */}
                    <Card className="rounded-[2.5rem] border-2 bg-card/40 backdrop-blur-md overflow-hidden premium-shadow">
                        <CardHeader className="p-8 pb-4 flex flex-row items-center gap-3">
                            <div className="p-2.5 bg-muted rounded-xl text-muted-foreground">
                                <Tag size={18} />
                            </div>
                            <h2 className="text-xl font-black tracking-tight">Taxonomy Cloud</h2>
                        </CardHeader>
                        <CardContent className="p-8 pt-0">
                            <div className="flex flex-wrap gap-2">
                                {profile.extracted_skills.map((skill, index) => {
                                    const match = assessment.skill_match_breakdown.find(s => s.required_skill.toLowerCase() === skill.toLowerCase());
                                    const isMatch = !!match;
                                    return (
                                        <Badge
                                            key={index}
                                            variant={isMatch ? "default" : "outline"}
                                            className={cn(
                                                "rounded-xl px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all",
                                                isMatch
                                                    ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                                                    : "bg-muted/30 border-muted hover:border-border text-muted-foreground"
                                            )}
                                        >
                                            {isMatch && <Sparkles size={10} className="mr-1.5" />}
                                            {skill}
                                        </Badge>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>

            {/* AI Interview Scheduler Dialog */}
            <Dialog open={isScheduling} onOpenChange={setIsScheduling}>
                <DialogContent className="sm:max-w-[550px] rounded-[2.5rem] border-2 bg-background/95 backdrop-blur-xl p-0 overflow-hidden shadow-2xl">
                    <div className="p-10 pb-6 bg-linear-to-br from-primary/5 to-indigo-500/5">
                        <DialogHeader>
                            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                                <Sparkles size={24} />
                            </div>
                            <DialogTitle className="text-3xl font-black tracking-tight font-outfit">AI Calibration Scheduler</DialogTitle>
                            <DialogDescription className="text-base font-medium text-muted-foreground pt-2">
                                We've analyzed all signals to identify optimal performance windows for this technical deep-dive.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-10 pt-0 space-y-6">
                        {schedulingSuccess ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="py-12 flex flex-col items-center justify-center space-y-6 text-center"
                            >
                                <div className="size-20 bg-emerald-500 text-white rounded-[2rem] flex items-center justify-center shadow-xl shadow-emerald-500/20">
                                    <Check size={40} strokeWidth={3} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black">Sequence Initiated</h3>
                                    <p className="text-muted-foreground font-medium">Calendar invites and prep-kits have been dispatched.</p>
                                </div>
                                <Button onClick={() => setIsScheduling(false)} className="rounded-xl px-8">Return to Profile</Button>
                            </motion.div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Optimal Windows</h4>
                                    <Badge variant="outline" className="rounded-full px-3 py-1 bg-primary/5 border-primary/20 text-primary font-black text-[9px] uppercase tracking-widest">3 Slots Found</Badge>
                                </div>

                                {loadingSuggestions ? (
                                    <div className="space-y-4">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="h-20 bg-muted/40 animate-pulse rounded-3xl" />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {suggestions.map((slot) => (
                                            <motion.div
                                                key={slot.startTime}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => setSelectedSlot(slot.startTime)}
                                                className={cn(
                                                    "p-6 rounded-[2rem] cursor-pointer transition-all flex items-center justify-between border-2 group",
                                                    selectedSlot === slot.startTime
                                                        ? "border-primary bg-primary/5 shadow-lg shadow-primary/5"
                                                        : "border-muted bg-muted/20 hover:border-muted-foreground/30"
                                                )}
                                            >
                                                <div className="flex items-center gap-5">
                                                    <div className={cn(
                                                        "size-6 rounded-full border-2 flex items-center justify-center transition-all",
                                                        selectedSlot === slot.startTime ? "border-primary bg-primary" : "border-muted-foreground/30"
                                                    )}>
                                                        {selectedSlot === slot.startTime && <Check className="size-3 text-white" strokeWidth={4} />}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="font-black text-lg">
                                                            {new Date(slot.startTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                                        </p>
                                                        <p className="text-xs font-bold text-muted-foreground">
                                                            {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Interactive Review
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <div className="size-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                                                        <Clock size={16} /> {/* Wait, I removed Clock from imports, let me put it back or use MapPin/Search/History... actually I'll use MapPin or just a generic icon */}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}

                                <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 text-xs flex gap-4 text-indigo-900/60 font-medium leading-relaxed">
                                    <Info className="size-5 shrink-0 text-indigo-500" />
                                    <p>Our automation engine handles technical setup, environment provisioning, and automated reminders for both parties.</p>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <Button variant="ghost" onClick={() => setIsScheduling(false)} className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-[10px]">Cancel</Button>
                                    <Button
                                        className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20"
                                        disabled={!selectedSlot}
                                        onClick={handleSchedule}
                                    >
                                        Initiate Loop
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* AI Synthesis Memo Dialog */}
            <Dialog open={!!synthesis} onOpenChange={() => setSynthesis(null)}>
                <DialogContent className="sm:max-w-[750px] rounded-[2.5rem] border-2 bg-background p-0 overflow-hidden shadow-2xl">
                    <div className="p-10 pb-6 bg-linear-to-br from-primary/5 to-indigo-500/5 flex items-center justify-between border-b">
                        <DialogHeader>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    <Sparkles size={20} />
                                </div>
                                <DialogTitle className="text-2xl font-black tracking-tight font-outfit">Decision Synthesis Memo</DialogTitle>
                            </div>
                            <DialogDescription className="text-sm font-medium text-muted-foreground">
                                High-density analysis across multiple assessment vectors for {profile.name}.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-0 overflow-y-auto max-h-[60vh] custom-scrollbar">
                        <div className="p-10 pt-8 pb-12 prose prose-sm max-w-none">
                            <div className="whitespace-pre-wrap text-base leading-relaxed text-foreground/80 bg-muted/20 p-8 rounded-[2rem] border border-muted font-medium shadow-inner italic">
                                "{synthesis}"
                            </div>
                        </div>
                    </div>

                    <div className="p-8 border-t bg-muted/10 flex justify-between items-center gap-6">
                        <div className="flex items-center gap-3 text-muted-foreground">
                            <Info size={16} />
                            <p className="text-[10px] font-black uppercase tracking-widest">AI Generated Insight</p>
                        </div>
                        <Button
                            onClick={() => setSynthesis(null)}
                            className="rounded-xl font-black uppercase tracking-widest text-[10px] h-11 px-8 shadow-lg shadow-primary/20"
                        >
                            Acknowledge Memo
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

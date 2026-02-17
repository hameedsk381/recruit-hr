import { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import api from '../api/client';
import type { ShortlistCandidate } from '../types';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    Upload,
    Filter,
    Pin,
    RotateCcw,
    Users,
    Sparkles,
    AlertCircle,
    Check,
    Search,
    ChevronRight,
    Brain,
    Trophy,
    Trash2,
    Target
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';

export default function Shortlist() {
    const {
        job,
        candidates,
        setCandidates,
        candidatesLoading,
        setCandidatesLoading,
        setError,
        selectCandidate,
        pinCandidate,
        removeCandidate,
        restoreCandidate,
        toggleCopilot,
        copilot
    } = useApp();

    const [removeModalId, setRemoveModalId] = useState<string | null>(null);
    const [removeReason, setRemoveReason] = useState('');
    const [filters, setFilters] = useState({
        fitLevel: [] as string[],
        showRemoved: false,
    });
    const [sortBy, setSortBy] = useState<'rank' | 'name' | 'fit'>('rank');
    const [uploadProgress, setUploadProgress] = useState<{ current: number, total: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Handle resume files upload
    const handleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !job) return;

        setCandidatesLoading(true);
        setError('candidates', null);

        try {
            const jdData = {
                title: job.title,
                company: job.company || '',
                location: job.location || '',
                skills: job.core_skills.map(s => s.skill),
                requirements: job.core_skills.filter(s => s.mandatory).map(s => s.skill),
                requiredIndustrialExperienceYears: job.experience_expectations.min_years,
                description: job.role_context
            };

            const result = await api.match(Array.from(files), jdData);

            if (result.success && result.batchId) {
                let isCompleted = false;
                setUploadProgress({ current: 0, total: result.jobCount });

                while (!isCompleted) {
                    await new Promise(r => setTimeout(r, 2000));
                    const status = await api.getJobStatus({ batchId: result.batchId });

                    if (status.success) {
                        setUploadProgress({
                            current: status.progress.completed + status.progress.failed,
                            total: status.progress.total
                        });

                        if (status.status === 'COMPLETED') {
                            const newCandidates: ShortlistCandidate[] = status.results.map(
                                (item: any, index: number) => ({
                                    id: item.matchResult?.Id || `candidate-${Date.now()}-${index}`,
                                    profile: {
                                        id: item.matchResult?.Id || `profile-${Date.now()}-${index}`,
                                        name: item.matchResult?.['Resume Data']?.name || item.resumeName,
                                        email: item.matchResult?.['Resume Data']?.email,
                                        extracted_skills: item.matchResult?.['Resume Data']?.skills || [],
                                        experience_estimate: {
                                            total_years: item.matchResult?.['Resume Data']?.experience || 0,
                                        },
                                        certifications: item.matchResult?.['Resume Data']?.certifications || [],
                                    },
                                    assessment: {
                                        one_line_summary: item.matchResult?.summary || 'Candidate Assessment',
                                        fit_assessment: {
                                            overall_fit: (item.matchResult?.matchScore || 0) >= 80 ? 'high' :
                                                (item.matchResult?.matchScore || 0) >= 60 ? 'medium' : 'low',
                                            reasoning: `Match score: ${item.matchResult?.matchScore}%`,
                                        },
                                        strengths: (item.matchResult?.Analysis?.['Matched Skills'] || []).slice(0, 3).map((skill: string) => ({
                                            skill,
                                            evidence_level: 'claimed' as const,
                                            evidence: 'Interpreted from resume context',
                                        })),
                                        gaps_and_risks: (item.matchResult?.Analysis?.['Unmatched Skills'] || []).slice(0, 2).map((area: string) => ({
                                            area,
                                            risk_level: 'medium' as const,
                                            explanation: 'Not explicitly mentioned in resume',
                                        })),
                                        skill_match_breakdown: [],
                                        interview_focus_areas: [],
                                        recruiter_notes: {
                                            override_suggestions: '',
                                            confidence_level: 'medium' as const,
                                        },
                                    },
                                    rank: index + 1,
                                    pinned: false,
                                    removed: false,
                                })
                            );
                            setCandidates(newCandidates);
                            isCompleted = true;
                            setUploadProgress(null);
                        }
                    }
                }
            }
        } catch (err) {
            console.error(err);
            setError('candidates', 'An error occurred during assessment.');
            setUploadProgress(null);
        } finally {
            setCandidatesLoading(false);
        }
    };

    // Remove candidate
    const handleRemove = () => {
        if (!removeModalId) return;
        removeCandidate(removeModalId, removeReason);
        setRemoveModalId(null);
        setRemoveReason('');
    };

    // Filter and sort candidates
    let visibleCandidates = candidates.filter(c => {
        if (!filters.showRemoved && c.removed) return false;
        if (filters.fitLevel.length > 0 && !filters.fitLevel.includes(c.assessment.fit_assessment.overall_fit)) return false;
        return true;
    });

    if (sortBy === 'name') {
        visibleCandidates = [...visibleCandidates].sort((a, b) => a.profile.name.localeCompare(b.profile.name));
    } else if (sortBy === 'fit') {
        const fitOrder = { high: 0, medium: 1, low: 2 };
        visibleCandidates = [...visibleCandidates].sort((a, b) =>
            fitOrder[a.assessment.fit_assessment.overall_fit] - fitOrder[b.assessment.fit_assessment.overall_fit]
        );
    }

    // Pinned candidates first
    visibleCandidates = [
        ...visibleCandidates.filter(c => c.pinned),
        ...visibleCandidates.filter(c => !c.pinned),
    ];

    // Stats
    const statsTotal = candidates.filter(c => !c.removed).length;
    const stats = {
        total: statsTotal,
        high: candidates.filter(c => !c.removed && c.assessment.fit_assessment.overall_fit === 'high').length,
        medium: candidates.filter(c => !c.removed && c.assessment.fit_assessment.overall_fit === 'medium').length,
        low: candidates.filter(c => !c.removed && c.assessment.fit_assessment.overall_fit === 'low').length,
    };

    // --- RENDER STATES ---

    if (candidates.length === 0 && !candidatesLoading) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-3xl mx-auto min-h-[70vh] flex flex-col items-center justify-center space-y-8"
            >
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-[80px] rounded-full" />
                    <div className="relative size-32 rounded-[2.5rem] bg-card border shadow-premium flex items-center justify-center">
                        <Users className="size-16 text-primary stroke-[1.5px]" />
                    </div>
                </div>

                <div className="text-center space-y-3">
                    <h1 className="text-4xl font-extrabold tracking-tight">Populate your <span className="text-primary italic">Shortlist</span></h1>
                    <p className="text-muted-foreground text-lg max-w-md mx-auto">
                        Upload resumes to begin the AI-powered ranking and assessment process.
                    </p>
                </div>

                <div className="flex flex-col items-center gap-4 w-full">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        multiple
                        onChange={handleFilesUpload}
                        className="hidden"
                    />
                    <Button
                        size="lg"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-14 px-8 rounded-2xl gap-3 text-base shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all font-bold"
                    >
                        <Upload size={20} />
                        Upload Multiple Resumes
                    </Button>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em]">Supported formats: PDF only</p>
                </div>

                {!job && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-700 flex items-center gap-4 max-w-sm"
                    >
                        <AlertCircle className="shrink-0 size-6" />
                        <div className="text-sm">
                            <span className="font-bold">Recommendation:</span> Complete <b>Job Setup</b> first for precise AI matching performance.
                        </div>
                    </motion.div>
                )}
            </motion.div>
        );
    }

    if (candidatesLoading) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-12">
                <div className="relative size-40">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 rounded-[3rem] border-4 border-primary/20"
                    />
                    <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-4 rounded-[2.5rem] border-4 border-indigo-500/20 shadow-[0_0_40px_rgba(99,102,241,0.1)]"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="size-16 text-primary animate-pulse" />
                    </div>
                </div>

                <div className="text-center space-y-4 max-w-md">
                    <h2 className="text-3xl font-bold tracking-tight">AI Talent Analysis in Progress</h2>
                    <p className="text-muted-foreground font-medium italic">
                        "Extracting deep insights from candidate experience, skill density, and domain alignment..."
                    </p>
                </div>

                {uploadProgress && (
                    <div className="w-full max-w-sm space-y-4">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            <span>Intelligence Harvest</span>
                            <span>{Math.round((uploadProgress.current / uploadProgress.total) * 100)}%</span>
                        </div>
                        <div className="h-2.5 w-full bg-muted rounded-full p-0.5 overflow-hidden border">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                                className="h-full bg-linear-to-r from-primary via-indigo-500 to-primary/80 rounded-full shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                            />
                        </div>
                        <p className="text-center text-xs font-bold text-primary">
                            Processed {uploadProgress.current} / {uploadProgress.total} Profiles
                        </p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-20">
            {/* Header Section */}
            <div className="flex flex-col xl:flex-row gap-8 xl:items-end justify-between">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">
                            <Users size={24} />
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight">Candidate Shortlist</h1>
                    </div>
                    {job && (
                        <p className="text-lg text-muted-foreground flex items-center gap-2">
                            Curating talent for <span className="text-foreground font-bold">{job.title}</span>
                            <ChevronRight size={16} />
                            <span className="font-medium">{job.company}</span>
                        </p>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        multiple
                        onChange={handleFilesUpload}
                        className="hidden"
                    />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="h-12 px-6 rounded-xl border-2 hover:bg-muted font-bold transition-all gap-2">
                        <Upload size={18} />
                        Expand Pipeline
                    </Button>
                    <Button
                        variant={copilot.isOpen ? "default" : "secondary"}
                        onClick={toggleCopilot}
                        className={cn(
                            "h-12 px-6 rounded-xl font-bold transition-all gap-2 border-2 border-transparent",
                            copilot.isOpen ? "shadow-lg shadow-primary/20" : "hover:bg-muted"
                        )}
                    >
                        <Brain size={18} className={copilot.isOpen ? "animate-pulse" : ""} />
                        Talent Copilot
                    </Button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Pipeline Total', val: stats.total, color: 'text-primary', icon: Users },
                    { label: 'High Potential', val: stats.high, color: 'text-emerald-500', icon: Trophy },
                    { label: 'Qualified Fits', val: stats.medium, color: 'text-amber-500', icon: Target },
                    { label: 'Secondary Pool', val: stats.low, color: 'text-blue-500', icon: Filter },
                ].map((s, i) => (
                    <Card key={i} className="rounded-3xl border bg-card/40 backdrop-blur-md hover:border-primary/20 transition-all group overflow-hidden">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className={cn("p-2.5 rounded-2xl bg-muted/50 group-hover:scale-110 transition-transform", s.color)}>
                                <s.icon size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{s.label}</p>
                                <p className="text-2xl font-black">{s.val}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar Filters */}
                <aside className="lg:col-span-1 space-y-6">
                    <div className="sticky top-24 space-y-6">
                        <Card className="rounded-[2.5rem] border bg-card/60 backdrop-blur-md overflow-hidden">
                            <CardHeader className="p-8 pb-4">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                    <Filter size={14} /> Refinement
                                </h3>
                            </CardHeader>
                            <CardContent className="p-8 pt-0 space-y-8">
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-foreground">Sort Logic</h4>
                                    <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
                                        <SelectTrigger className="h-12 rounded-xl bg-muted/40 border-transparent focus:ring-0">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="rank">AI Rank (Recommended)</SelectItem>
                                            <SelectItem value="name">Alphabetical</SelectItem>
                                            <SelectItem value="fit">Matching Score</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-5">
                                    <h4 className="text-sm font-bold text-foreground">Filter by Fit</h4>
                                    <div className="space-y-4">
                                        {[
                                            { id: 'high', color: 'bg-emerald-500' },
                                            { id: 'medium', color: 'bg-amber-500' },
                                            { id: 'low', color: 'bg-blue-500' }
                                        ].map(level => (
                                            <div key={level.id} className="flex items-center gap-3">
                                                <Checkbox
                                                    id={`filter-${level.id}`}
                                                    checked={filters.fitLevel.includes(level.id)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setFilters(f => ({ ...f, fitLevel: [...f.fitLevel, level.id] }));
                                                        } else {
                                                            setFilters(f => ({ ...f, fitLevel: f.fitLevel.filter(l => l !== level.id) }));
                                                        }
                                                    }}
                                                    className="size-5 rounded-md border-2"
                                                />
                                                <label
                                                    htmlFor={`filter-${level.id}`}
                                                    className="flex-1 flex items-center justify-between text-sm font-bold capitalize cursor-pointer pr-2"
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <div className={cn("size-2 rounded-full", level.color)} />
                                                        {level.id}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground font-black px-2 py-0.5 rounded-full bg-muted/60">
                                                        {candidates.filter(c => c.assessment.fit_assessment.overall_fit === level.id).length}
                                                    </span>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-dashed">
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            id="show-removed"
                                            checked={filters.showRemoved}
                                            onCheckedChange={(checked) => setFilters(f => ({ ...f, showRemoved: !!checked }))}
                                            className="size-5 rounded-md border-2"
                                        />
                                        <label htmlFor="show-removed" className="text-sm font-bold text-muted-foreground cursor-pointer">
                                            Archived Profiles
                                        </label>
                                    </div>
                                </div>

                                {(filters.fitLevel.length > 0 || filters.showRemoved) && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full h-10 rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                        onClick={() => setFilters({ fitLevel: [], showRemoved: false })}
                                    >
                                        Drop all filters
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </aside>

                {/* Candidate List */}
                <main className="lg:col-span-3 space-y-6">
                    <LayoutGroup>
                        <AnimatePresence mode="popLayout">
                            {visibleCandidates.map((candidate) => (
                                <motion.div
                                    key={candidate.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.4 }}
                                >
                                    <Card
                                        onClick={() => selectCandidate(candidate.id)}
                                        className={cn(
                                            "group cursor-pointer rounded-[2rem] border-2 transition-all duration-300 relative overflow-hidden premium-shadow",
                                            candidate.pinned ? "border-primary bg-primary/[0.02]" : "border-transparent bg-card/60 hover:bg-card/80 hover:border-border/60",
                                            candidate.removed && "opacity-60 grayscale-[0.8]"
                                        )}
                                    >
                                        {/* Status Accent Line */}
                                        <div className={cn(
                                            "absolute inset-y-0 left-0 w-2",
                                            candidate.assessment.fit_assessment.overall_fit === 'high' ? "bg-emerald-500" :
                                                candidate.assessment.fit_assessment.overall_fit === 'medium' ? "bg-amber-500" : "bg-blue-500"
                                        )} />

                                        <CardContent className="p-8 pl-10">
                                            <div className="flex flex-col md:flex-row gap-8">
                                                {/* Left Profile Summary */}
                                                <div className="flex-1 min-w-0 space-y-5">
                                                    <div className="flex justify-between items-start gap-4">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-3">
                                                                <h3 className="text-2xl font-black tracking-tight group-hover:text-primary transition-colors">{candidate.profile.name}</h3>
                                                                {candidate.pinned && <Badge className="bg-primary/10 text-primary border-primary/20 rounded-lg">Featured</Badge>}
                                                                {candidate.removed && <Badge variant="destructive" className="rounded-lg">Archived</Badge>}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                                                                <Search size={14} className="text-primary" />
                                                                Ranked #{candidate.rank} in pool
                                                                {statsTotal > 0 && <span>• Top {Math.round((candidate.rank / statsTotal) * 100)}%</span>}
                                                            </div>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className={cn("rounded-xl h-10 w-10", candidate.pinned ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted")}
                                                                onClick={(e) => { e.stopPropagation(); pinCandidate(candidate.id); }}
                                                            >
                                                                <Pin size={18} className={candidate.pinned ? "fill-current" : ""} />
                                                            </Button>
                                                            {candidate.removed ? (
                                                                <Button
                                                                    variant="ghost" size="icon"
                                                                    className="rounded-xl h-10 w-10 text-muted-foreground hover:bg-muted"
                                                                    onClick={(e) => { e.stopPropagation(); restoreCandidate(candidate.id); }}
                                                                >
                                                                    <RotateCcw size={18} />
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    variant="ghost" size="icon"
                                                                    className="rounded-xl h-10 w-10 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                                                    onClick={(e) => { e.stopPropagation(); setRemoveModalId(candidate.id); }}
                                                                >
                                                                    <Trash2 size={18} />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <p className="text-sm font-medium text-muted-foreground leading-relaxed line-clamp-2">
                                                        {candidate.assessment.one_line_summary}
                                                    </p>

                                                    <div className="flex flex-wrap gap-2">
                                                        {candidate.assessment.strengths.slice(0, 3).map((s, i) => (
                                                            <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 text-[11px] font-black uppercase tracking-wider border border-emerald-500/20">
                                                                <Check size={12} className="stroke-[3px]" />
                                                                {s.skill}
                                                            </div>
                                                        ))}
                                                        {candidate.assessment.gaps_and_risks.length > 0 && (
                                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-700 text-[11px] font-black uppercase tracking-wider border border-blue-500/20">
                                                                <AlertCircle size={12} className="stroke-[3px]" />
                                                                {candidate.assessment.gaps_and_risks[0].area}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Right Fit Indicator */}
                                                <div className="md:w-48 flex flex-col items-center justify-center border-l border-dashed md:pl-8 space-y-3">
                                                    <div className={cn(
                                                        "size-16 rounded-[1.25rem] flex items-center justify-center text-2xl font-black shadow-xl",
                                                        candidate.assessment.fit_assessment.overall_fit === 'high' ? "bg-emerald-500 text-white shadow-emerald-500/20" :
                                                            candidate.assessment.fit_assessment.overall_fit === 'medium' ? "bg-amber-500 text-white shadow-amber-500/20" :
                                                                "bg-blue-500 text-white shadow-blue-500/20"
                                                    )}>
                                                        {candidate.assessment.fit_assessment.overall_fit === 'high' ? 'A+' :
                                                            candidate.assessment.fit_assessment.overall_fit === 'medium' ? 'B' : 'C'}
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Fit Confidence</p>
                                                        <p className={cn(
                                                            "text-xs font-black capitalize",
                                                            candidate.assessment.fit_assessment.overall_fit === 'high' ? "text-emerald-600" :
                                                                candidate.assessment.fit_assessment.overall_fit === 'medium' ? "text-amber-600" : "text-blue-600"
                                                        )}>
                                                            {candidate.assessment.fit_assessment.overall_fit} FIT
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </LayoutGroup>
                </main>
            </div>

            {/* Remove Modal */}
            <Dialog open={!!removeModalId} onOpenChange={(open) => !open && setRemoveModalId(null)}>
                <DialogContent className="max-w-md rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
                    <DialogHeader className="p-8 pb-0">
                        <DialogTitle className="text-2xl font-black tracking-tight">Archive Profile</DialogTitle>
                        <DialogDescription className="text-base font-medium">
                            Help us calibrate the AI. Why is this candidate being moved to the secondary pool?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-8 space-y-6">
                        <div className="flex flex-wrap gap-2">
                            {['Not enough experience', 'Missing critical skills', 'Salary expectations', 'Cultural fit', 'Other'].map(reason => (
                                <button
                                    key={reason}
                                    onClick={() => setRemoveReason(reason)}
                                    className={cn(
                                        "px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border-2",
                                        removeReason === reason
                                            ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                                            : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted"
                                    )}
                                >
                                    {reason}
                                </button>
                            ))}
                        </div>
                        {removeReason === 'Other' && (
                            <Textarea
                                placeholder="Details regarding the disqualification..."
                                className="rounded-2xl border-2 focus:ring-0 focus:border-primary transition-all p-4 min-h-[100px]"
                                value={removeReason === 'Other' ? '' : removeReason}
                                onChange={(e) => setRemoveReason(e.target.value)}
                            />
                        )}
                    </div>

                    <DialogFooter className="p-8 pt-0 gap-3 sm:gap-0">
                        <Button variant="ghost" className="rounded-xl font-bold h-12" onClick={() => setRemoveModalId(null)}>Wait, Cancel</Button>
                        <Button variant="destructive" className="rounded-xl h-12 px-8 font-black shadow-lg shadow-destructive/20" onClick={handleRemove} disabled={!removeReason}>Archive Candidate</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}


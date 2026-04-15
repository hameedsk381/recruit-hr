import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../api/client';
import type { ShortlistCandidate } from '../types';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    Target,
    Activity,
    Database
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
        copilot,
        batchId,
        setBatchId
    } = useApp();

    const [removeModalId, setRemoveModalId] = useState<string | null>(null);
    const [removeReason, setRemoveReason] = useState('');
    const [filters, setFilters] = useState({
        fitLevel: [] as string[],
        stages: [] as string[],
        showRemoved: false,
    });
    const [sortBy, setSortBy] = useState<'rank' | 'name' | 'fit'>('rank');
    const [uploadProgress, setUploadProgress] = useState<{ current: number, total: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Shared polling logic
    const pollBatchStatus = async (bId: string) => {
        setCandidatesLoading(true);
        try {
            let isCompleted = false;
            while (!isCompleted) {
                const status = await api.getJobStatus({ batchId: bId });
                if (status.success) {
                    setUploadProgress({ current: status.progress.completed + status.progress.failed, total: status.progress.total });
                    if (status.status === 'COMPLETED') {
                        const newCandidates: ShortlistCandidate[] = (status.results || []).map((item: any, index: number) => ({
                            id: item.matchResult?.Id || item.resumeName,
                            profile: {
                                id: item.matchResult?.Id || item.resumeName,
                                name: item.matchResult?.['Resume Data']?.name || item.resumeName,
                                email: item.matchResult?.['Resume Data']?.email || 'N/A',
                                extracted_skills: Array.isArray(item.matchResult?.['Resume Data']?.skills) ? item.matchResult['Resume Data'].skills : [],
                                experience_estimate: { total_years: item.matchResult?.['Resume Data']?.experience || 0 },
                            },
                            assessment: {
                                one_line_summary: item.matchResult?.summary || 'Candidate Assessment',
                                fit_assessment: {
                                    overall_fit: (item.matchResult?.matchScore || 0) >= 80 ? 'high' : (item.matchResult?.matchScore || 0) >= 60 ? 'medium' : 'low',
                                    reasoning: `Match score: ${item.matchResult?.matchScore}%`,
                                },
                                strengths: (Array.isArray(item.matchResult?.Analysis?.['Matched Skills']) ? item.matchResult.Analysis['Matched Skills'] : [])
                                    .slice(0, 3)
                                    .map((skill: string) => ({ skill: typeof skill === 'string' ? skill : 'Unknown', evidence_level: 'claimed' as const, evidence: 'Interpreted from resume' })),
                                gaps_and_risks: (Array.isArray(item.matchResult?.Analysis?.['Unmatched Skills']) ? item.matchResult.Analysis['Unmatched Skills'] : [])
                                    .slice(0, 2)
                                    .map((area: string) => ({ area: typeof area === 'string' ? area : 'Unknown', risk_level: 'medium' as const, explanation: 'Not mentioned' })),
                                skill_match_breakdown: [],
                                interview_focus_areas: Array.isArray(item.matchResult?.Analysis?.Recommendations) ? item.matchResult.Analysis.Recommendations : [],
                                recruiter_notes: { override_suggestions: '', confidence_level: 'medium' as const },
                            },
                            rank: index + 1,
                            pinned: false,
                            removed: item.removed || false,
                            stage: item.stage || 'applied'
                        }));
                        setCandidates(newCandidates);
                        isCompleted = true;
                        setUploadProgress(null);
                        setCandidatesLoading(false);
                    } else if (status.status === 'FAILED') {
                        setError('candidates', 'Batch processing failed on our sovereign cluster.');
                        isCompleted = true;
                        setCandidatesLoading(false);
                    } else if (status.status === 'CANCELLED') {
                        setError('candidates', 'Batch processing was cancelled.');
                        isCompleted = true;
                        setCandidatesLoading(false);
                    } else {
                        await new Promise(r => setTimeout(r, 3000));
                    }
                } else {
                    setError('candidates', status.error || 'Failed to check batch status');
                    break;
                }
            }
        } catch (err) {
            console.error('Polling failed', err);
            setError('candidates', 'Connection lost while polling sovereign cluster.');
        } finally {
            setCandidatesLoading(false);
            setUploadProgress(null);
        }
    };

    // Auto-resume polling on mount if batch is active but results are missing
    useEffect(() => {
        if (batchId && candidates.length === 0 && !candidatesLoading) {
            pollBatchStatus(batchId);
        }
    }, [batchId]);

    const handleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !job) return;
        setCandidatesLoading(true);
        setError('candidates', null);
        try {
            const jdData = {
                title: job.title,
                company: job.company || '',
                skills: job.core_skills.map(s => s.skill),
                requiredIndustrialExperienceYears: job.experience_expectations.min_years,
                description: job.role_context
            };
            const result = await api.match(Array.from(files), jdData);
            if (result.success && result.batchId) {
                setBatchId(result.batchId);
                await pollBatchStatus(result.batchId);
            }
        } catch (err) {
            setError('candidates', 'An error occurred during assessment.');
            setUploadProgress(null);
            setCandidatesLoading(false);
        }
    };

    const handleRemove = () => {
        if (!removeModalId) return;
        removeCandidate(removeModalId, removeReason);
        setRemoveModalId(null);
        setRemoveReason('');
    };

    let visibleCandidates = candidates.filter(c => {
        if (!filters.showRemoved && c.removed) return false;
        if (filters.fitLevel.length > 0 && !filters.fitLevel.includes(c.assessment.fit_assessment.overall_fit)) return false;
        if (filters.stages.length > 0 && !filters.stages.includes(c.stage || 'applied')) return false;
        return true;
    });

    if (sortBy === 'name') {
        visibleCandidates = [...visibleCandidates].sort((a, b) => a.profile.name.localeCompare(b.profile.name));
    } else if (sortBy === 'fit') {
        const fitOrder = { high: 0, medium: 1, low: 2 };
        visibleCandidates = [...visibleCandidates].sort((a, b) => fitOrder[a.assessment.fit_assessment.overall_fit] - fitOrder[b.assessment.fit_assessment.overall_fit]);
    }

    visibleCandidates = [...visibleCandidates.filter(c => c.pinned), ...visibleCandidates.filter(c => !c.pinned)];

    const stats = {
        total: candidates.filter(c => !c.removed).length,
        high: candidates.filter(c => !c.removed && c.assessment.fit_assessment.overall_fit === 'high').length,
        medium: candidates.filter(c => !c.removed && c.assessment.fit_assessment.overall_fit === 'medium').length,
        low: candidates.filter(c => !c.removed && c.assessment.fit_assessment.overall_fit === 'low').length,
    };

    if (candidates.length === 0 && !candidatesLoading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6 text-center py-20 px-4">
                <div className="size-16 rounded-xl border flex items-center justify-center bg-muted/30">
                    <Database size={32} className="text-muted-foreground" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight">Expand the pipeline.</h1>
                    <p className="text-muted-foreground max-w-sm mx-auto">Upload resumes to initiate AI-powered ranking and assessment.</p>
                </div>
                <input ref={fileInputRef} type="file" multiple accept=".pdf" className="hidden" onChange={handleFilesUpload} />
                <Button size="lg" className="h-12 px-8 rounded-md" onClick={() => fileInputRef.current?.click()}>
                    <Upload size={18} className="mr-2" />
                    Upload Candidate Batch
                </Button>
            </div>
        );
    }

    const handleCancelBatch = async () => {
        if (!batchId) return;
        try {
            await api.cancelBatch(batchId);
            setCandidatesLoading(false);
            setUploadProgress(null);
            setError('candidates', 'Batch processing was cancelled.');
        } catch (err) {
            console.error('Failed to cancel batch', err);
        }
    };

    if (candidatesLoading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-12">
                <div className="flex flex-col items-center gap-4">
                    <div className="size-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight">Synthesizing Results...</h2>
                        <p className="text-sm text-muted-foreground animate-pulse leading-relaxed">Decomposing experience vectors and skill density...</p>
                    </div>
                </div>
                {uploadProgress && (
                    <div className="w-full max-w-sm space-y-3">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            <span>Processing Batch</span>
                            <span>{Math.round((uploadProgress.current / uploadProgress.total) * 100)}%</span>
                        </div>
                        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }} className="h-full bg-black transition-all duration-500" />
                        </div>
                    </div>
                )}
                <Button variant="outline" onClick={handleCancelBatch} className="text-red-500 border-red-200 hover:bg-red-50">
                    Cancel Processing
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-12 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Users size={32} />
                        Candidate Pipeline
                    </h1>
                    {job && (
                        <p className="text-sm text-muted-foreground">
                            Processing for <span className="text-foreground font-medium">{job.title}</span> at <span className="font-medium">{job.company}</span>
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <input ref={fileInputRef} type="file" multiple accept=".pdf" className="hidden" onChange={handleFilesUpload} />
                    <Button variant="outline" size="sm" className="h-9 px-4 rounded-md" onClick={() => fileInputRef.current?.click()}>Add to Batch</Button>
                    <Button variant={copilot.isOpen ? "secondary" : "default"} size="sm" className="h-9 px-4 rounded-md" onClick={toggleCopilot}>
                        <Brain size={16} className={cn("mr-2", copilot.isOpen && "animate-pulse")} />
                        Talent Copilot
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <aside className="lg:col-span-1 border-r pr-8 space-y-8">
                    <div className="space-y-6">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Filter size={14} /> Filter & Sort
                        </h4>
                        <div className="space-y-4">
                            <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="rank">AI Recommended</SelectItem>
                                    <SelectItem value="name">Alphabetical</SelectItem>
                                    <SelectItem value="fit">Competency Fit</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-3">
                            {['high', 'medium', 'low'].map(level => (
                                <div key={level} className="flex items-center justify-between group cursor-pointer" onClick={() => {
                                    if (filters.fitLevel.includes(level)) {
                                        setFilters(f => ({ ...f, fitLevel: f.fitLevel.filter(l => l !== level) }));
                                    } else {
                                        setFilters(f => ({ ...f, fitLevel: [...f.fitLevel, level] }));
                                    }
                                }}>
                                    <div className="flex items-center gap-3">
                                        <div className={cn("size-2 rounded-full", level === 'high' ? "bg-emerald-500" : level === 'medium' ? "bg-amber-500" : "bg-blue-500")} />
                                        <span className="text-xs font-medium capitalize">{level} Potential</span>
                                    </div>
                                    <Checkbox checked={filters.fitLevel.includes(level)} className="rounded" />
                                </div>
                            ))}
                        </div>
                        <div className="space-y-6 pt-6 border-t">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Activity size={14} /> Pipeline Stage
                            </h4>
                            <div className="space-y-3">
                                {['applied', 'shortlisted', 'technical', 'culture', 'offer'].map(stage => (
                                    <div key={stage} className="flex items-center justify-between group cursor-pointer" onClick={() => {
                                        if (filters.stages.includes(stage)) {
                                            setFilters(f => ({ ...f, stages: f.stages.filter(s => s !== stage) }));
                                        } else {
                                            setFilters(f => ({ ...f, stages: [...f.stages, stage] }));
                                        }
                                    }}>
                                        <span className="text-xs font-medium capitalize">{stage}</span>
                                        <Checkbox checked={filters.stages.includes(stage)} className="rounded" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t space-y-6">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Activity size={14} /> Pipeline Stats
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="vercel-card !p-3 text-center border-none bg-muted/30">
                                <p className="text-lg font-bold">{stats.total}</p>
                                <p className="text-[9px] font-black uppercase text-muted-foreground">Total</p>
                            </div>
                            <div className="vercel-card !p-3 text-center border-none bg-emerald-500/5">
                                <p className="text-lg font-bold text-emerald-600">{stats.high}</p>
                                <p className="text-[9px] font-black uppercase text-emerald-500">Tier 1</p>
                            </div>
                        </div>
                    </div>
                </aside>

                <main className="lg:col-span-3 space-y-4">
                    <LayoutGroup>
                        <AnimatePresence mode="popLayout">
                            {visibleCandidates.map((candidate) => (
                                <motion.div
                                    key={candidate.id}
                                    layout
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    className="group relative"
                                    onClick={() => selectCandidate(candidate.id)}
                                >
                                    <div className={cn(
                                        "vercel-card !p-0 overflow-hidden flex cursor-pointer",
                                        candidate.pinned && "border-blue-500 border-2"
                                    )}>
                                        <div className={cn(
                                            "w-1 shrink-0",
                                            candidate.assessment.fit_assessment.overall_fit === 'high' ? "bg-emerald-500" :
                                            candidate.assessment.fit_assessment.overall_fit === 'medium' ? "bg-amber-500" : "bg-blue-500"
                                        )} />
                                        <div className="flex-1 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-lg font-bold truncate">{candidate.profile.name}</h3>
                                                    {candidate.pinned && <Badge variant="secondary" className="px-1.5 py-0 rounded font-bold text-[9px] uppercase tracking-tighter">Pinned</Badge>}
                                                    <Badge variant="outline" className="px-1.5 py-0 rounded font-bold text-[9px] uppercase tracking-widest bg-blue-50 text-blue-600 border-blue-100">
                                                        {candidate.stage || 'applied'}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground line-clamp-1">{candidate.assessment.one_line_summary}</p>
                                                <div className="flex items-center gap-4 pt-2">
                                                    <div className="flex gap-2">
                                                        {candidate.assessment.strengths.slice(0, 2).map((s, i) => (
                                                            <span key={i} className="text-[10px] font-bold text-muted-foreground border rounded px-1.5 py-0.5 bg-muted/20">{s.skill}</span>
                                                        ))}
                                                    </div>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">#Rank {candidate.rank}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-8 shrink-0">
                                                <div className="flex flex-col items-center">
                                                    <div className={cn(
                                                        "text-xl font-black",
                                                        candidate.assessment.fit_assessment.overall_fit === 'high' ? "text-emerald-600" :
                                                        candidate.assessment.fit_assessment.overall_fit === 'medium' ? "text-amber-600" : "text-blue-600"
                                                    )}>
                                                        {candidate.assessment.fit_assessment.overall_fit === 'high' ? 'A+' :
                                                         candidate.assessment.fit_assessment.overall_fit === 'medium' ? 'B' : 'C'}
                                                    </div>
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Match</span>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="size-8" onClick={(e) => { e.stopPropagation(); pinCandidate(candidate.id); }}>
                                                        <Pin size={14} className={cn(candidate.pinned && "fill-current")} />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="size-8 hover:text-red-500" onClick={(e) => { e.stopPropagation(); setRemoveModalId(candidate.id); }}>
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </LayoutGroup>
                </main>
            </div>
        </div>
    );
}

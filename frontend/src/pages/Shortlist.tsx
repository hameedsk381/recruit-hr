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
    Users,
    Search,
    ChevronRight,
    Brain,
    Trash2,
    Activity,
    Database,
    Mail,
    Send,
    AlertCircle,
    Zap,
    Sparkles
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { PageGuide } from '@/components/PageGuide';
import { PipelineHealthService } from '../services/pipelineHealthService';
import { NurtureService } from '../services/nurtureService';

const STAGE_LABELS: Record<string, string> = {
    applied: 'Applied',
    shortlisted: 'Shortlisted',
    technical: 'Evaluation',
    culture: 'Stakeholder Review',
    offer: 'Offer'
};

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
    const [outreachModal, setOutreachModal] = useState<{ isOpen: boolean, candidate: ShortlistCandidate | null, type: 'invite' | 'reject' | 'nurture', draft: { subject: string, body: string } | null, isDrafting: boolean }>({
        isOpen: false,
        candidate: null,
        type: 'invite',
        draft: null,
        isDrafting: false
    });
    const [discussionModal, setDiscussionModal] = useState<{ isOpen: boolean, candidate: ShortlistCandidate | null }>({
        isOpen: false,
        candidate: null
    });
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
                                    overall_fit: (item.matchResult?.matchScore || 0) >= 85 ? 'high' : (item.matchResult?.matchScore || 0) >= 70 ? 'medium' : 'low',
                                    reasoning: `Suitability score: ${Math.round(Number(item.matchResult?.matchScore) || 0)}%`,
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
                                matchScore: Number(item.matchResult?.matchScore) || 0
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
                        setError('candidates', 'Candidate processing failed. Please try again.');
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
            setError('candidates', 'Connection lost while processing.');
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
                industry: (job as any).industry || 'General',
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

    const handleRemove = async () => {
        if (!removeModalId) return;
        try {
            await removeCandidate(removeModalId, removeReason);
            setRemoveModalId(null);
            setRemoveReason('');
        } catch (err) {
            console.error('Failed to remove candidate', err);
        }
    };

    const [syncingId, setSyncingId] = useState<string | null>(null);

    const handleSyncToAts = async (candidate: ShortlistCandidate) => {
        if (!job?.integrationId) return;
        setSyncingId(candidate.id);
        try {
            const atsCandidateId = candidate.profile.atsCandidateId || `mock-ats-${candidate.profile.email}`;
            
            const res = await api.pushATSScore(job.integrationId, {
                atsCandidateId,
                score: Math.round((candidates.indexOf(candidate) + 1) * 10),
                summary: candidate.assessment.one_line_summary,
                jobId: job.atsJobId
            }) as any;

            if (res.success) {
                alert(`Successfully synced ${candidate.profile.name} to ${job.integrationId}`);
            } else {
                alert(`Failed to sync: ${res.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error('Sync to ATS failed', err);
            alert('Failed to sync to ATS. Check your integration connection.');
        } finally {
            setSyncingId(null);
        }
    };

    const handleDraftOutreach = async (type: 'invite' | 'reject' | 'nurture', candidate: ShortlistCandidate) => {
        setOutreachModal(prev => ({ ...prev, isOpen: true, candidate, type, isDrafting: true, draft: null }));
        try {
            const res = await api.draftOutreach({
                jobContext: { title: job?.title, company: job?.company },
                candidateProfile: candidate.profile,
                assessment: candidate.assessment,
                type
            });
            if (res.success) {
                setOutreachModal(prev => ({ ...prev, draft: res.draft, isDrafting: false }));
            }
        } catch (err) {
            setError('candidates', 'Failed to draft outreach email.');
            setOutreachModal(prev => ({ ...prev, isDrafting: false }));
        }
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

    const healthStats = PipelineHealthService.analyze(candidates.filter(c => !c.removed));
    const advice = PipelineHealthService.getActionableAdvice(healthStats);

    const [nurtureAlerts, setNurtureAlerts] = useState<string[]>([]);
    
    useEffect(() => {
        if (job && candidates.length > 0) {
            NurtureService.checkAndTriggerNurture(candidates, job).then(setNurtureAlerts);
        }
    }, [candidates, job]);

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

    if (candidates.length === 0 && !candidatesLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 animate-in fade-in duration-500">
                <div className="text-center space-y-6 max-w-md w-full">
                    <div className="size-16 rounded-xl border border-dashed border-border flex items-center justify-center bg-muted/30 text-muted-foreground mx-auto">
                        <Database size={24} />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Expand the pipeline</h1>
                        <p className="text-sm text-muted-foreground max-w-[280px] mx-auto">Upload candidate resumes to initiate AI-powered ranking and assessment.</p>
                    </div>
                    <input ref={fileInputRef} type="file" multiple accept=".pdf" className="hidden" onChange={handleFilesUpload} />
                    <Button className="w-full h-10 font-medium" onClick={() => fileInputRef.current?.click()}>
                        <Upload size={16} className="mr-2" />
                        Upload Candidates
                    </Button>
                </div>
            </div>
        );
    }

    if (candidatesLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 animate-in fade-in duration-500">
                <div className="max-w-md w-full space-y-8">
                    <div className="flex flex-col items-center justify-center text-center space-y-4">
                        <div className="size-10 border-2 border-foreground border-t-transparent rounded-full animate-spin opacity-50" />
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold tracking-tight text-foreground">Analyzing Candidates</h2>
                            <p className="text-sm text-muted-foreground animate-pulse">Scanning experience and technical matches...</p>
                        </div>
                    </div>
                    
                    {uploadProgress && (
                        <div className="p-6 rounded-xl border border-border/50 bg-card space-y-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <Activity size={12} className="text-foreground" />
                                    Processing Batch
                                </span>
                                <span className="text-xs font-semibold tabular-nums text-foreground">{Math.round((uploadProgress.current / uploadProgress.total) * 100)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }} 
                                    animate={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }} 
                                    className="h-full bg-foreground transition-all duration-500" 
                                />
                            </div>
                        </div>
                    )}
                    
                    <div className="flex justify-center pt-4">
                        <Button variant="ghost" className="text-muted-foreground hover:text-destructive text-xs font-semibold uppercase tracking-wider h-8" onClick={handleCancelBatch}>
                            Cancel Processing
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-6xl px-4 py-8 space-y-8 animate-in fade-in duration-500">
            <PageGuide
              pageKey="shortlist"
              title="How AI Shortlisting Works"
              steps={[
                { title: "Set up the job first", description: "Use Job Setup to define the role requirements — skills, experience, and responsibilities. The AI uses this as the benchmark for scoring." },
                { title: "Upload resumes", description: "Drag and drop a batch of resumes (PDF or Word). The AI extracts structured data and scores each candidate against the job requirements." },
                { title: "Review scores and flags", description: "Each candidate gets a match score and flag indicators. Hover over the score to see the reasoning breakdown — skills gap, experience delta, and keyword alignment." },
                { title: "Pin, reject, or advance", description: "Pin strong candidates to keep them visible. Remove weak fits to clean the list. Use the shortlist checkbox to send selected candidates to the interview pipeline." },
              ]}
              tips={[
                "Upload 20–30 resumes at once for the best batch-comparison view.",
                "The AI copilot (chat icon) can answer questions about any candidate's background.",
                "Pinned candidates persist across sessions — use them as your A-list.",
              ]}
            />
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border/50 pb-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Users className="size-6" />
                        Candidate Pipeline
                    </h1>
                    {job && (
                        <p className="text-sm text-muted-foreground">
                            Processing for <span className="font-semibold text-foreground">{job.title}</span> at <span className="font-medium">{job.company}</span>
                        </p>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <input ref={fileInputRef} type="file" multiple accept=".pdf" className="hidden" onChange={handleFilesUpload} />
                    <Button variant="outline" size="sm" className="h-9 px-4 font-medium sm:flex-1 md:flex-none" onClick={() => fileInputRef.current?.click()}>
                        <Upload size={14} className="mr-2" />
                        Add Candidates
                    </Button>
                    <Button variant={copilot.isOpen ? "secondary" : "default"} size="sm" className="h-9 px-4 font-medium sm:flex-1 md:flex-none" onClick={toggleCopilot}>
                        <Brain size={14} className={cn("mr-2", copilot.isOpen && "animate-pulse")} />
                        Talent Copilot
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar Filters */}
                <aside className="lg:col-span-1 space-y-8">
                    <div className="p-5 rounded-xl border border-border/50 bg-card space-y-6 shadow-sm">
                        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Filter size={14} /> Filter & Sort
                        </h4>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-foreground">Sort By</label>
                            <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="rank">AI Recommended</SelectItem>
                                    <SelectItem value="name">Alphabetical</SelectItem>
                                    <SelectItem value="fit">Overall Match</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="space-y-3 pt-2">
                            <label className="text-xs font-medium text-foreground mb-1 block">Match Level</label>
                            {['high', 'medium', 'low'].map((level) => (
                                <div key={level} className="flex items-center justify-between group cursor-pointer hover:bg-muted/50 p-1.5 -mx-1.5 rounded-md transition-colors" onClick={() => {
                                    if (filters.fitLevel.includes(level)) {
                                        setFilters(f => ({ ...f, fitLevel: f.fitLevel.filter(l => l !== level) }));
                                    } else {
                                        setFilters(f => ({ ...f, fitLevel: [...f.fitLevel, level] }));
                                    }
                                }}>
                                    <div className="flex items-center gap-2.5">
                                        <div className={cn("size-2 rounded-full shadow-sm", level === 'high' ? "bg-emerald-500" : level === 'medium' ? "bg-amber-500" : "bg-blue-500")} />
                                        <span className="text-xs font-semibold capitalize text-foreground">{level} Fit</span>
                                    </div>
                                    <Checkbox checked={filters.fitLevel.includes(level)} className="rounded shadow-none border-muted-foreground/30 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground" />
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
                                        <span className="text-xs font-medium">{STAGE_LABELS[stage] || stage}</span>
                                        <Checkbox checked={filters.stages.includes(stage)} className="rounded" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="p-5 rounded-xl border border-border/50 bg-card space-y-6 shadow-sm">
                        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Zap size={14} className="text-amber-500" /> Pipeline Health
                        </h4>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">Velocity</span>
                                <span className="text-xs font-bold text-emerald-600">{healthStats.velocityScore}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">Bottleneck</span>
                                <span className="text-xs font-bold capitalize">{healthStats.bottleneckStage}</span>
                            </div>
                            {healthStats.staleCandidates > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-muted-foreground">Stale Profiles</span>
                                    <span className="text-xs font-bold text-destructive">{healthStats.staleCandidates}</span>
                                </div>
                            )}
                        </div>
                        
                        {advice.length > 0 && (
                            <div className="pt-4 border-t border-border/40 space-y-3">
                                {advice.map((item: string, i: number) => (
                                    <div key={i} className="flex gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                                        <AlertCircle size={12} className="text-amber-600 shrink-0 mt-0.5" />
                                        <p className="text-[10px] leading-tight text-amber-700/80 font-medium">{item}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-5 rounded-xl border border-border/50 bg-card space-y-6 shadow-sm">
                        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Activity size={14} /> Pipeline Stats
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg bg-muted/40 p-3 text-center border border-border/30">
                                <p className="text-xl font-bold text-foreground tracking-tight tabular-nums">{stats.total}</p>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">Total</p>
                            </div>
                            <div className="rounded-lg bg-emerald-500/10 p-3 text-center border border-emerald-500/20">
                                <p className="text-xl font-bold text-emerald-700 tracking-tight tabular-nums">{stats.high}</p>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 mt-0.5">Tier 1</p>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Candidate List */}
                <main className="lg:col-span-3 space-y-4 pb-12">
                    {nurtureAlerts.length > 0 && (
                        <div className="bg-indigo-600/5 border border-indigo-600/20 rounded-2xl p-4 flex gap-4 items-start animate-in slide-in-from-top-4 duration-500">
                            <div className="size-10 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-600 shrink-0">
                                <Sparkles size={20} />
                            </div>
                            <div className="space-y-1 flex-1">
                                <h4 className="text-sm font-bold text-indigo-900">Smart Pipeline Alerts</h4>
                                <div className="space-y-2">
                                    {nurtureAlerts.map((alert, i) => (
                                        <p key={i} className="text-xs text-indigo-700/80 font-medium flex items-center gap-2">
                                            <span className="size-1 bg-indigo-400 rounded-full" />
                                            {alert}
                                        </p>
                                    ))}
                                </div>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 text-[10px] font-bold uppercase tracking-widest text-indigo-600 hover:bg-indigo-600/10"
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    const { count } = await NurtureService.generateDrafts(candidates);
                                    setNurtureAlerts([]); // Clear alerts after action
                                    alert(`Drafted ${count} outreach emails. You can review them in the Nurture tab.`);
                                }}
                            >
                                Auto-Draft All
                            </Button>
                        </div>
                    )}

                    <LayoutGroup>
                        <AnimatePresence mode="popLayout">
                            {visibleCandidates.map((candidate) => (
                                <motion.div
                                    key={candidate.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    className="group relative"
                                    onClick={() => selectCandidate(candidate.id)}
                                >
                                    <div className={cn(
                                        "vercel-card !p-0 flex cursor-pointer transition-all border-l-[3px]",
                                        candidate.pinned ? "border-foreground shadow-md ring-1 ring-border/50" : "hover:border-foreground/30 hover:shadow-sm",
                                        candidate.assessment.fit_assessment.overall_fit === 'high' ? "border-l-emerald-500" :
                                        candidate.assessment.fit_assessment.overall_fit === 'medium' ? "border-l-amber-500" : "border-l-blue-500"
                                    )}>
                                        <div className="flex-1 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 bg-card">
                                            <div className="flex-1 min-w-0 space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-lg font-bold truncate">{candidate.profile.name}</h3>
                                                    {candidate.pinned && <Badge variant="secondary" className="px-1.5 py-0 rounded font-bold text-[9px] uppercase tracking-tighter">Pinned</Badge>}
                                                    <Badge variant="outline" className="px-1.5 py-0 rounded font-bold text-[9px] uppercase tracking-widest bg-blue-50 text-blue-600 border-blue-100">
                                                        {candidate.stage || 'applied'}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground line-clamp-1 pr-4">{candidate.assessment.one_line_summary}</p>
                                                
                                                <div className="flex items-center gap-3 pt-1">
                                                    <Badge variant="outline" className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground border-border/60">
                                                        Rank #{candidate.rank}
                                                    </Badge>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {candidate.assessment.strengths.slice(0, 2).map((s, i) => (
                                                            <span key={i} className="text-[10px] font-medium text-foreground/80 bg-muted px-2 py-0.5 rounded-md border border-border/50">
                                                                {s.skill}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-8 shrink-0">
                                                <div className="flex flex-col items-center w-16">
                                                    <div className={cn(
                                                        "text-lg font-bold tabular-nums",
                                                        candidate.assessment.fit_assessment.overall_fit === 'high' ? "text-emerald-600" :
                                                        candidate.assessment.fit_assessment.overall_fit === 'medium' ? "text-amber-600" : "text-blue-600"
                                                    )}>
                                                        {candidate.assessment.fit_assessment.overall_fit === 'high' ? 'A+' :
                                                         candidate.assessment.fit_assessment.overall_fit === 'medium' ? 'B' : 'C'}
                                                    </div>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                                                        {Math.round(Number(candidate.assessment.matchScore) || 0)}% Match
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="size-8 text-indigo-600 hover:bg-indigo-50" onClick={(e) => { e.stopPropagation(); handleDraftOutreach('invite', candidate); }}>
                                                        <Mail size={14} />
                                                    </Button>
                                                    {job?.integrationId && (
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className={cn("size-8 text-emerald-600 hover:bg-emerald-50", syncingId === candidate.id && "animate-spin")} 
                                                            onClick={(e) => { e.stopPropagation(); handleSyncToAts(candidate); }}
                                                            title={`Sync to ${job.integrationId}`}
                                                        >
                                                            <Database size={14} />
                                                        </Button>
                                                    )}
                                                    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); pinCandidate(candidate.id); }}>
                                                        <Pin size={14} className={cn(candidate.pinned && "fill-foreground")} />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="size-8 text-indigo-600 hover:bg-indigo-50" onClick={(e) => { e.stopPropagation(); setDiscussionModal({ isOpen: true, candidate }); }}>
                                                        <Users size={14} />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); setRemoveModalId(candidate.id); }}>
                                                        <Trash2 size={14} />
                                                    </Button>
                                                    <ChevronRight size={16} className="text-muted-foreground/30 ml-2" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                            {visibleCandidates.length === 0 && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-border bg-card/50">
                                   <Search size={32} className="text-muted-foreground/50 mb-4" />
                                   <h3 className="text-lg font-semibold text-foreground">No matches found</h3>
                                   <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or upload more resumes.</p>
                                   <Button variant="outline" size="sm" className="mt-6 font-medium" onClick={() => { setFilters({ fitLevel: [], stages: [], showRemoved: false }); setSortBy('rank'); }}>
                                       Clear Filters
                                   </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </LayoutGroup>
                </main>
            </div>
            
            {/* Remove Modal */}
            <Dialog open={!!removeModalId} onOpenChange={(open) => !open && setRemoveModalId(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-foreground">Remove Candidate</DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground">
                            This will move the candidate to the archive. They won't appear in the active pipeline.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-foreground">Reason for removal</label>
                            <Textarea 
                                placeholder="E.g., Missing core requirements, outside budget..."
                                value={removeReason}
                                onChange={(e) => setRemoveReason(e.target.value)}
                                className="resize-none h-24"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" className="font-medium" onClick={() => setRemoveModalId(null)}>Cancel</Button>
                        <Button variant="destructive" className="font-medium" onClick={handleRemove}>Confirm Removal</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Outreach Modal */}
            <Dialog open={outreachModal.isOpen} onOpenChange={(open) => !open && setOutreachModal(prev => ({ ...prev, isOpen: false }))}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Mail className="size-5 text-indigo-600" />
                            Personalized Outreach
                        </DialogTitle>
                        <DialogDescription>
                            AI-generated communication for <span className="font-semibold text-foreground">{outreachModal.candidate?.profile.name}</span>
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6 py-4">
                        <div className="flex items-center gap-2">
                            {(['invite', 'reject', 'nurture'] as const).map(t => (
                                <Button 
                                    key={t}
                                    variant={outreachModal.type === t ? 'default' : 'outline'}
                                    size="sm"
                                    className="capitalize rounded-full px-4 h-8"
                                    onClick={() => outreachModal.candidate && handleDraftOutreach(t, outreachModal.candidate)}
                                    disabled={outreachModal.isDrafting}
                                >
                                    {t}
                                </Button>
                            ))}
                        </div>

                        {outreachModal.isDrafting ? (
                            <div className="h-64 flex flex-col items-center justify-center space-y-4 bg-muted/30 rounded-xl border border-dashed">
                                <Activity className="size-8 text-indigo-500 animate-pulse" />
                                <p className="text-sm font-medium text-muted-foreground">Drafting personalized response...</p>
                            </div>
                        ) : outreachModal.draft ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Subject</label>
                                    <div className="p-3 bg-muted/50 rounded-lg text-sm font-semibold border">{outreachModal.draft.subject}</div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Body</label>
                                    <div className="p-4 bg-muted/30 rounded-xl text-sm leading-relaxed border whitespace-pre-wrap min-h-48">{outreachModal.draft.body}</div>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" className="font-medium" onClick={() => setOutreachModal(prev => ({ ...prev, isOpen: false }))}>Cancel</Button>
                        <Button 
                            className="font-medium gap-2 bg-indigo-600 hover:bg-indigo-700" 
                            disabled={!outreachModal.draft || outreachModal.isDrafting}
                            onClick={() => {
                                alert(`Email sent to ${outreachModal.candidate?.profile.email}`);
                                setOutreachModal(prev => ({ ...prev, isOpen: false }));
                            }}
                        >
                            <Send size={14} />
                            Send Outreach
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Discussion Modal */}
            <Dialog open={discussionModal.isOpen} onOpenChange={(open) => !open && setDiscussionModal(prev => ({ ...prev, isOpen: false }))}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Users className="size-5 text-indigo-600" />
                            Team Discussion
                        </DialogTitle>
                        <DialogDescription>
                            Internal notes for <span className="font-semibold text-foreground">{discussionModal.candidate?.profile.name}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Decision</label>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100">APPROVE</Button>
                                    <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100">REJECT</Button>
                                </div>
                            </div>
                            <Textarea 
                                placeholder="Share your feedback with the team..."
                                className="resize-none h-32 text-sm"
                            />
                        </div>
                        <div className="space-y-3 pt-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Recent Activity</label>
                            <div className="space-y-3">
                                <div className="p-3 bg-muted/30 rounded-lg border text-xs leading-relaxed">
                                    <span className="font-bold text-foreground">AI Scout:</span> High confidence in technical skills, but note the 2-year gap in 2021.
                                </div>
                                <div className="p-3 bg-muted/30 rounded-lg border text-xs leading-relaxed">
                                    <span className="font-bold text-foreground">Hiring Manager:</span> Approved for the next evaluation stage.
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold" onClick={() => setDiscussionModal(prev => ({ ...prev, isOpen: false }))}>
                            Save Feedback
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../api/client';
import type { JobDescription } from '../types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from 'framer-motion';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Upload,
    Check,
    Trash2,
    ArrowRight,
    Target,
    Zap,
    FileText,
    Database,
    ChevronRight,
    Loader2,
    ShieldCheck,
    Users
} from 'lucide-react';
import { cn } from "@/lib/utils";

type SetupStep = 'upload-jd' | 'verify-profile' | 'bulk-resumes' | 'review-launch';

export default function JobSetup() {
    const { 
        job, 
        setJob, 
        jobLoading, 
        setJobLoading, 
        jobError,
        setError, 
        setView, 
        setBatchId, 
        setCandidates,
        setupStep: step,
        setSetupStep: setStep,
        campaignFiles: candidateFiles,
        setCampaignFiles: setCandidateFiles
    } = useApp();
    const [dragOver, setDragOver] = useState(false);
    const [isProcessingBatch, setIsProcessingBatch] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const resumeInputRef = useRef<HTMLInputElement>(null);

    // ATS Integration State
    const [showAtsModal, setShowAtsModal] = useState(false);
    const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(false);
    const [connectedAts, setConnectedAts] = useState<any[]>([]);
    const [selectedAts, setSelectedAts] = useState<string | null>(null);
    const [atsJobs, setAtsJobs] = useState<any[]>([]);
    const [isLoadingJobs, setIsLoadingJobs] = useState(false);

    // Load connected ATS integrations when modal opens
    useEffect(() => {
        const loadIntegrations = async () => {
            setIsLoadingIntegrations(true);
            try {
                const res = await api.listIntegrations() as any;
                if (res.success) {
                    const ats = res.integrations.filter((i: any) => i.status === 'connected' && (i.category === 'ATS' || i.category === 'HRIS'));
                    setConnectedAts(ats);
                    if (ats.length > 0 && !selectedAts) {
                        setSelectedAts(ats[0].id);
                        fetchAtsJobs(ats[0].id);
                    }
                }
            } catch (e) {
                console.error('Failed to load integrations', e);
            } finally {
                setIsLoadingIntegrations(false);
            }
        };
        if (showAtsModal && connectedAts.length === 0) {
            loadIntegrations();
        }
    }, [showAtsModal, connectedAts.length]);

    const fetchAtsJobs = async (id: string) => {
        setIsLoadingJobs(true);
        try {
            const res = await api.listATSJobs(id) as any;
            if (res.success) setAtsJobs(res.jobs);
        } catch (e) {
            console.error('Failed to fetch ATS jobs', e);
        } finally {
            setIsLoadingJobs(false);
        }
    };

    const handleAtsJobSelect = async (atsJob: any) => {
        setJobLoading(true);
        setShowAtsModal(false);
        try {
            const result = await api.extractJDText(atsJob.jdText);
            if (result.success && result.data) {
                const extractedJob: JobDescription = {
                    id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
                    title: atsJob.title || result.data.title || 'Untitled Role',
                    company: atsJob.company || result.data.company || 'Imported from ATS',
                    core_skills: (result.data.skills || []).map((skill: string, index: number) => ({
                        skill,
                        weight: index < 3 ? 'critical' : index < 6 ? 'important' : 'nice_to_have',
                        mandatory: index < 3,
                    })),
                    experience_expectations: {
                        min_years: result.data.requiredIndustrialExperienceYears || 3,
                        domain_specific: result.data.domainExperience?.[0] || atsJob.department,
                    },
                    role_context: atsJob.jdText,
                    atsJobId: atsJob.id,
                    integrationId: selectedAts || undefined,
                };
                setJob(extractedJob);
                setStep('verify-profile');
            }
        } catch (err) {
            console.error('ATS Extraction failed', err);
            // Fallback if AI fails
            setJob({
                id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
                title: atsJob.title,
                company: 'Imported from ATS',
                core_skills: [],
                experience_expectations: { min_years: 3, domain_specific: atsJob.department },
                role_context: atsJob.jdText,
                atsJobId: atsJob.id,
                integrationId: selectedAts || undefined,
            });
            setStep('verify-profile');
        } finally {
            setJobLoading(false);
        }
    };

    // Step 1: Process JD
    const processJD = async (file: File) => {
        setJobLoading(true);
        setError('job', null);
        try {
            const result = await api.extractJD(file) as any;
            if (result.success && result.data) {
                const extractedJob: JobDescription = {
                    id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
                    title: result.data.title || 'Untitled Role',
                    company: result.data.company || 'New Partner',
                    core_skills: (result.data.skills || []).map((skill: string, index: number) => ({
                        skill,
                        weight: index < 3 ? 'critical' : index < 6 ? 'important' : 'nice_to_have',
                        mandatory: index < 3,
                    })),
                    experience_expectations: {
                        min_years: result.data.requiredIndustrialExperienceYears || 2,
                        domain_specific: result.data.domainExperience?.[0],
                    },
                    role_context: result.data.responsibilities?.join('. '),
                };
                setJob(extractedJob);
                setStep('verify-profile');
            }
        } catch (err: any) {
            const errorMsg = err.message || '';
            if (errorMsg.includes('DOCUMENT_IS_RESUME')) {
                setError('job', 'We detected that you uploaded a Resume instead of a Job Description. Please provide the Job Description to continue.');
            } else {
                setError('job', `Analysis failed: ${errorMsg || 'Please try a different PDF.'}`);
            }
        } finally {
            setJobLoading(false);
        }
    };

    // Step 3: Launch Batch
    const handleLaunchBatch = async () => {
        if (!job || candidateFiles.length === 0) return;
        setIsProcessingBatch(true);
        try {
            const jdData = {
                title: job.title,
                company: job.company || '',
                skills: job.core_skills.map(s => s.skill),
                requiredIndustrialExperienceYears: job.experience_expectations.min_years,
                industry: job.industry || 'General',
                description: job.role_context
            };
            const res = await api.match(candidateFiles, jdData);
            if (res.success) {
                setBatchId(res.batchId);
                setCandidates([]); // Clear old results while polling starts
                setView('shortlist');
            }
        } catch (err) {
            setError('job', 'Failed to initiate batch processing.');
        } finally {
            setIsProcessingBatch(false);
        }
    };

    const handleStartOver = () => {
        setJob(null);
        setStep('upload-jd');
        setCandidateFiles([]);
        setBatchId(null);
        setCandidates([]);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-10 pb-24 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-500">
            {/* Wizard Progress Header */}
            <div className="flex items-center justify-between border-b border-border/50 pb-6 pt-4">
                <div className="flex-1 flex items-center">
                    {(['upload-jd', 'verify-profile', 'bulk-resumes', 'review-launch'] as SetupStep[]).map((s, i) => {
                    const isCompleted = i < ['upload-jd', 'verify-profile', 'bulk-resumes', 'review-launch'].indexOf(step);
                    const isCurrent = step === s;
                    
                    return (
                        <div key={s} className="flex items-center gap-3 md:gap-4 group">
                            <div className={cn(
                                "size-7 rounded-full border flex items-center justify-center text-xs font-semibold transition-all",
                                isCurrent ? "bg-foreground text-background border-foreground" : 
                                isCompleted ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600" : 
                                "border-border/50 text-muted-foreground bg-muted/30"
                            )}>
                                {isCompleted ? <Check size={12} className="stroke-[3]" /> : i + 1}
                            </div>
                            <span className={cn(
                                "text-sm font-medium hidden md:block",
                                isCurrent ? "text-foreground" : 
                                isCompleted ? "text-foreground" : "text-muted-foreground"
                            )}>
                                {s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                            </span>
                            {i < 3 && <ChevronRight className="text-muted-foreground/30 hidden md:block mx-1" size={14} />}
                        </div>
                    );
                })}
                </div>
                {(job || candidateFiles.length > 0) && (
                    <Button variant="ghost" size="sm" onClick={handleStartOver} className="text-xs font-medium text-muted-foreground hover:text-foreground">
                        <ShieldCheck size={14} className="mr-1.5" />
                        Start Over
                    </Button>
                )}
            </div>

            <AnimatePresence mode="wait">
                {step === 'upload-jd' && (
                    <motion.div
                        key="step1"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-8"
                    >
                        <div className="text-center space-y-3 py-10">
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">Define the Benchmark</h1>
                            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                                Upload your job description or import it directly from your connected ATS. Our AI will decompose it into granular competencies.
                            </p>
                        </div>

                        {jobError && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-4 rounded-xl border-2 border-red-500 bg-red-500/5 text-red-600 flex items-center gap-4 max-w-2xl mx-auto"
                            >
                                <div className="size-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                                    <ShieldCheck size={20} className="text-red-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-black uppercase tracking-widest mb-0.5">Validation Fault</p>
                                    <p className="text-sm font-medium leading-relaxed">{jobError}</p>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setError('job', null)}
                                    className="text-red-600 hover:bg-red-500/10 font-bold text-xs uppercase tracking-widest"
                                >
                                    Dismiss
                                </Button>
                            </motion.div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Upload Card */}
                            <div 
                                className={cn(
                                    "flex flex-col items-center justify-center text-center p-12 rounded-xl border border-dashed transition-all bg-card/50",
                                    dragOver ? "border-foreground bg-muted/50" : "border-border/60 hover:border-foreground/30"
                                )}
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={async (e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) await processJD(f); }}
                            >
                                <input ref={fileInputRef} type="file" className="hidden" accept=".pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) processJD(f); }} />
                                <div className="size-14 rounded-full bg-muted flex items-center justify-center mb-6">
                                    {jobLoading ? <Loader2 size={24} className="animate-spin text-foreground" /> : <Upload size={24} className="text-foreground" />}
                                </div>
                                <div className="space-y-1.5 mb-8">
                                    <h3 className="text-base font-semibold text-foreground">Upload Role PDF</h3>
                                    <p className="text-xs text-muted-foreground font-medium">Standard JD files (Max 10MB)</p>
                                </div>
                                <Button className="h-9 px-6 font-medium" onClick={() => fileInputRef.current?.click()} disabled={jobLoading}>
                                    {jobLoading ? 'Analyzing Blueprint...' : 'Select File'}
                                </Button>
                            </div>

                            {/* ATS Import Card */}
                            <div className="flex flex-col items-center justify-center text-center p-12 rounded-xl border border-dashed border-border/60 hover:border-foreground/30 transition-all bg-card/50 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-3 opacity-10 rotate-12 group-hover:rotate-0 transition-transform">
                                    <Database size={64} />
                                </div>
                                <div className="size-14 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-6">
                                    <Database size={24} />
                                </div>
                                <div className="space-y-1.5 mb-8">
                                    <h3 className="text-base font-semibold text-foreground">Import from ATS</h3>
                                    <p className="text-xs text-muted-foreground font-medium italic">Greenhouse, Workday, Lever...</p>
                                </div>
                                <Button variant="outline" className="h-9 px-6 font-medium border-2" onClick={() => setShowAtsModal(true)} disabled={jobLoading}>
                                    Sync Requisition
                                </Button>
                            </div>
                        </div>

                        {/* ATS Import Modal */}
                        <Dialog open={showAtsModal} onOpenChange={() => setShowAtsModal(false)}>
                            <DialogContent className="max-w-2xl border-2 border-foreground shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-black uppercase tracking-tight">Sync ATS Requisition</DialogTitle>
                                    <DialogDescription className="font-medium">
                                        Fetch live job descriptions from your connected platforms.
                                    </DialogDescription>
                                </DialogHeader>

                                {isLoadingIntegrations ? (
                                    <div className="py-12 flex flex-col items-center justify-center gap-4">
                                        <Loader2 className="size-8 animate-spin text-primary" />
                                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Connecting to Ecosystem...</p>
                                    </div>
                                ) : connectedAts.length === 0 ? (
                                    <div className="py-12 text-center space-y-4">
                                        <div className="size-16 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                                            <ShieldCheck size={32} />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-bold">No ATS Connected</p>
                                            <p className="text-xs text-muted-foreground">Go to the Ecosystem page to connect your ATS.</p>
                                        </div>
                                        <Button size="sm" onClick={() => setView('marketplace')} className="font-black border-2">Go to Marketplace</Button>
                                    </div>
                                ) : (
                                    <div className="space-y-6 py-4">
                                        {/* ATS Selector */}
                                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                            {connectedAts.map(ats => (
                                                <button 
                                                    key={ats.id}
                                                    onClick={() => { setSelectedAts(ats.id); setAtsJobs([]); fetchAtsJobs(ats.id); }}
                                                    className={cn(
                                                        "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border-2 transition-all shrink-0",
                                                        selectedAts === ats.id ? "bg-foreground text-background border-foreground" : "bg-muted/50 text-muted-foreground border-transparent hover:border-muted-foreground/30"
                                                    )}
                                                >
                                                    {ats.name}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Job List */}
                                        <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
                                            {isLoadingJobs ? (
                                                <div className="py-20 text-center animate-pulse">
                                                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Retrieving active vacancies...</p>
                                                </div>
                                            ) : atsJobs.length === 0 ? (
                                                <div className="py-20 text-center border-2 border-dashed rounded-xl">
                                                    <p className="text-xs font-bold text-muted-foreground uppercase">No open requisitions found</p>
                                                </div>
                                            ) : (
                                                atsJobs.map(j => (
                                                    <div 
                                                        key={j.id} 
                                                        className="p-4 border-2 border-border/50 hover:border-foreground transition-all group cursor-pointer flex items-center justify-between"
                                                        onClick={() => handleAtsJobSelect(j)}
                                                    >
                                                        <div>
                                                            <h4 className="font-black text-sm uppercase tracking-tight group-hover:text-primary transition-colors">{j.title}</h4>
                                                            <div className="flex items-center gap-3 mt-1">
                                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{j.department}</span>
                                                                <span className="size-1 bg-border rounded-full" />
                                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{j.location}</span>
                                                            </div>
                                                        </div>
                                                        <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity font-black text-[10px] uppercase tracking-widest">
                                                            Select <ChevronRight size={14} className="ml-1" />
                                                        </Button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </DialogContent>
                        </Dialog>
                    </motion.div>
                )}

                {step === 'verify-profile' && job && (
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h2 className="text-xl font-bold tracking-tight text-foreground">Role Blueprint</h2>
                                <p className="text-sm text-muted-foreground">Verify and adjust the extracted requirements.</p>
                            </div>
                            <Button className="gap-2 shrink-0" onClick={() => setStep('bulk-resumes')} size="sm">
                                Continue to Sourcing <ArrowRight size={14} />
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="vercel-card space-y-6 bg-card">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-foreground">Role Title</Label>
                                            <Input value={job.title} onChange={(e) => setJob({...job, title: e.target.value})} className="h-9" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-foreground">Organization</Label>
                                            <Input value={job.company} onChange={(e) => setJob({...job, company: e.target.value})} className="h-9" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-foreground">Target Industry</Label>
                                            <Select value={job.industry || 'general'} onValueChange={(val) => setJob({...job, industry: val})}>
                                                <SelectTrigger className="h-9 text-xs font-medium">
                                                    <SelectValue placeholder="Select Industry" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="general">General / Diversified</SelectItem>
                                                    <SelectItem value="technology">Technology & Software</SelectItem>
                                                    <SelectItem value="healthcare">Healthcare & Pharma</SelectItem>
                                                    <SelectItem value="finance">Finance & Banking</SelectItem>
                                                    <SelectItem value="manufacturing">Manufacturing & Industrial</SelectItem>
                                                    <SelectItem value="retail">Retail & E-commerce</SelectItem>
                                                    <SelectItem value="energy">Energy & Utilities</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-xs font-semibold text-foreground">Extracted Competency Matrix</Label>
                                        <div className="divide-y border border-border/60 rounded-md overflow-hidden">
                                            {job.core_skills.map((s, i) => (
                                                <div key={i} className="p-3 flex flex-wrap sm:flex-nowrap items-center justify-between hover:bg-muted/30 transition-colors group gap-3">
                                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                        <div className={cn("size-2 rounded-full shrink-0", s.mandatory ? "bg-red-500" : "bg-emerald-500")} />
                                                        <span className="text-sm font-medium text-foreground truncate">{s.skill}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                                                        <Select value={s.weight} onValueChange={(val) => {
                                                            const core_skills = [...job.core_skills];
                                                            core_skills[i].weight = val as any;
                                                            setJob({...job, core_skills});
                                                        }}>
                                                            <SelectTrigger className="h-7 w-28 text-xs font-medium">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="critical">Critical</SelectItem>
                                                                <SelectItem value="important">Important</SelectItem>
                                                                <SelectItem value="nice_to_have">Nice to have</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => {
                                                            setJob({...job, core_skills: job.core_skills.filter((_, idx) => idx !== i)});
                                                        }}>
                                                            <Trash2 size={14} />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="vercel-card bg-primary text-zinc-100 border-none relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <Target className="size-24" />
                                    </div>
                                    <h3 className="text-xs font-semibold text-muted-foreground mb-5 flex items-center gap-2 relative z-10">
                                        <Target className="size-3.5" /> Industrial Intelligence
                                    </h3>
                                    <div className="space-y-6 relative z-10">
                                        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                                            <span className="text-sm font-medium text-zinc-300">Target Experience</span>
                                            <div className="flex items-center gap-3">
                                                <button className="size-6 rounded-md bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-colors text-zinc-300" onClick={() => setJob({...job, experience_expectations: {...job.experience_expectations, min_years: Math.max(0, job.experience_expectations.min_years - 1)}})}>-</button>
                                                <span className="font-semibold text-sm w-4 text-center">{job.experience_expectations.min_years}y</span>
                                                <button className="size-6 rounded-md bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-colors text-zinc-300" onClick={() => setJob({...job, experience_expectations: {...job.experience_expectations, min_years: job.experience_expectations.min_years + 1}})}>+</button>
                                            </div>
                                        </div>
                                        <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800 space-y-1.5">
                                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Zap size={10} className="text-amber-500" /> AI Insights</p>
                                            <p className="text-xs text-muted-foreground leading-relaxed">Detected senior-level autonomy requirements. Pricing benchmarked at Tier-1 INR compensation.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === 'bulk-resumes' && job && (
                    <motion.div
                        key="step3"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-6"
                    >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h2 className="text-xl font-bold tracking-tight text-foreground">Resource Pipeline</h2>
                                <p className="text-sm text-muted-foreground">Upload candidates to process against the role blueprint.</p>
                            </div>
                            <div className="flex gap-3">
                                <Button variant="outline" size="sm" onClick={() => setStep('verify-profile')}>Back</Button>
                                <Button className="gap-2" size="sm" disabled={candidateFiles.length === 0} onClick={() => setStep('review-launch')}>
                                    Final Review <ArrowRight size={14} />
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                            <div 
                                className="md:col-span-3 border border-dashed rounded-xl flex flex-col items-center justify-center p-12 text-center space-y-4 hover:border-foreground/30 transition-all cursor-pointer bg-card/50"
                                onClick={() => resumeInputRef.current?.click()}
                            >
                                <input 
                                    ref={resumeInputRef} 
                                    type="file" 
                                    multiple 
                                    className="hidden" 
                                    accept=".pdf"
                                    onChange={(e) => {
                                        const files = Array.from(e.target.files || []);
                                        setCandidateFiles([...candidateFiles, ...files]);
                                    }}
                                />
                                <div className="size-12 rounded-full bg-muted flex items-center justify-center">
                                    <Database size={20} className="text-muted-foreground" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-semibold text-sm text-foreground">Add Resumes</h3>
                                    <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">Select multiple PDFs to start bulk ingestion.</p>
                                </div>
                            </div>

                            <div className="vercel-card md:col-span-2 h-[350px] flex flex-col p-0 overflow-hidden bg-card">
                                <div className="flex items-center justify-between p-4 border-b bg-card">
                                    <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
                                        Queue <span className="px-1.5 py-0.5 rounded bg-muted text-[10px]">{candidateFiles.length}</span>
                                    </h3>
                                    <button className="text-[10px] font-semibold text-destructive hover:underline" onClick={() => setCandidateFiles([])} disabled={candidateFiles.length === 0}>Clear All</button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2">
                                    {candidateFiles.map((f, i) => (
                                        <div key={i} className="flex items-center justify-between p-2 rounded-md hover:bg-muted text-xs font-medium group transition-colors">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <FileText size={14} className="text-muted-foreground shrink-0" />
                                                <span className="truncate">{f.name}</span>
                                            </div>
                                            <button 
                                                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                                onClick={() => setCandidateFiles(candidateFiles.filter((_, idx) => idx !== i))}
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    {candidateFiles.length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 opacity-60">
                                            <Database size={24} />
                                            <span className="text-xs font-medium">Queue is empty</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === 'review-launch' && job && (
                    <motion.div
                        key="step4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-2xl mx-auto space-y-8 py-8"
                    >
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold tracking-tight text-foreground">Execute Deployment</h2>
                            <p className="text-sm text-muted-foreground">Verify the batch parameters before initiating evaluation.</p>
                        </div>

                        <div className="vercel-card divide-y bg-card !p-0">
                            <div className="p-5 flex justify-between items-center bg-card">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Target Role</p>
                                    <p className="font-semibold text-sm">{job.title}</p>
                                </div>
                                <div className="text-right space-y-1">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Organization</p>
                                    <p className="font-semibold text-sm">{job.company}</p>
                                </div>
                            </div>
                            <div className="p-5 flex justify-between items-center bg-card">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Vertical / Industry</p>
                                    <p className="font-semibold text-sm capitalize">{job.industry || 'General'}</p>
                                </div>
                                <div className="text-right space-y-1">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Target Exp</p>
                                    <p className="font-semibold text-sm">{job.experience_expectations.min_years}+ Years</p>
                                </div>
                            </div>
                            <div className="p-5 flex justify-between items-center bg-card">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Batch Size</p>
                                    <p className="font-semibold text-sm flex items-center gap-1.5"><Users size={14} className="text-muted-foreground" /> {candidateFiles.length} Candidates</p>
                                </div>
                                <div className="text-right space-y-1">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Compliance</p>
                                    <p className="font-semibold text-sm text-emerald-600 flex items-center gap-1.5 justify-end">
                                        <ShieldCheck size={14} /> DPDP-2023 Valid
                                    </p>
                                </div>
                            </div>
                            <div className="p-5 bg-muted/30">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Zap size={12} className="text-amber-500" />
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex-1">Processing Estimation</span>
                                    <span className="text-xs font-semibold text-foreground">~{Math.ceil(candidateFiles.length * 1.5)} mins</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-1.5 mb-2">
                                    <div className="bg-amber-500 h-1.5 rounded-full w-1/3"></div>
                                </div>
                                <p className="text-[10px] text-muted-foreground leading-relaxed">
                                    Data will be processed securely and cached in regional clusters for 30 days.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-4">
                             <Button variant="outline" className="h-10" onClick={() => setStep('bulk-resumes')}>Back to Sourcing</Button>
                            <Button 
                                className="h-10 text-sm font-medium gap-2 sm:flex-1" 
                                onClick={handleLaunchBatch}
                                disabled={isProcessingBatch}
                            >
                                {isProcessingBatch ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Processing Batch...
                                    </>
                                ) : (
                                    <>
                                        Deploy Batch Evaluation
                                        <ArrowRight size={16} />
                                    </>
                                )}
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

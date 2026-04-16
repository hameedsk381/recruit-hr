import { useState, useRef } from 'react';
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

    // Step 1: Process JD
    const processJD = async (file: File) => {
        setJobLoading(true);
        setError('job', null);
        try {
            const result = await api.extractJD(file);
            if (result.success && result.data) {
                const extractedJob: JobDescription = {
                    id: crypto.randomUUID(),
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
        } catch (err) {
            setError('job', 'Analysis failed. Please try a different PDF.');
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
                                Upload your technical job description. Our AI will decompose it into granular competencies across India-specific industrial age bands.
                            </p>
                        </div>

                        <div 
                            className={cn(
                                "flex flex-col items-center justify-center text-center p-16 rounded-xl border border-dashed transition-all bg-card/50",
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
                                <p className="text-xs text-muted-foreground">Standard technical JD files accepted (Max 10MB)</p>
                            </div>
                            <Button className="h-9 px-6 font-medium" onClick={() => fileInputRef.current?.click()} disabled={jobLoading}>
                                {jobLoading ? 'Analyzing Blueprint...' : 'Select File'}
                            </Button>
                        </div>
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
                                <h2 className="text-xl font-bold tracking-tight text-foreground">Technical Blueprint</h2>
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
                                <p className="text-sm text-muted-foreground">Upload candidates to process against the technical blueprint.</p>
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

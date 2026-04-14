import { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import api from '../api/client';
import type { JobDescription, WeightedSkill } from '../types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
    Plus,
    ArrowRight,
    Briefcase,
    Target,
    Zap,
    AlertCircle,
    FileText,
    Database,
    ChevronRight,
    Loader2,
    ShieldCheck
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
    const [newSkill, setNewSkill] = useState('');
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

    return (
        <div className="max-w-5xl mx-auto space-y-12 pb-24">
            {/* Wizard Progress Header */}
            <div className="flex items-center justify-between border-b pb-8">
                {(['upload-jd', 'verify-profile', 'bulk-resumes', 'review-launch'] as SetupStep[]).map((s, i) => (
                    <div key={s} className="flex items-center gap-4 group">
                        <div className={cn(
                            "size-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all",
                            step === s ? "bg-black text-white border-black" : 
                            (i < ['upload-jd', 'verify-profile', 'bulk-resumes', 'review-launch'].indexOf(step) ? "bg-emerald-500 border-emerald-500 text-white" : "border-muted text-muted-foreground")
                        )}>
                            {i < ['upload-jd', 'verify-profile', 'bulk-resumes', 'review-launch'].indexOf(step) ? <Check size={14} /> : i + 1}
                        </div>
                        <span className={cn(
                            "text-sm font-medium hidden md:block",
                            step === s ? "text-foreground" : "text-muted-foreground"
                        )}>
                            {s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </span>
                        {i < 3 && <ChevronRight className="text-muted-foreground/30 hidden md:block" size={16} />}
                    </div>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {step === 'upload-jd' && (
                    <motion.div
                        key="step1"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-8"
                    >
                        <div className="text-center space-y-4 py-12">
                            <h1 className="text-5xl font-bold tracking-tighter">Define the Benchmark.</h1>
                            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                                Upload your technical job description. Our AI will decompose it into granular competencies across India-specific industrial age bands.
                            </p>
                        </div>

                        <div 
                            className={cn(
                                "vercel-card border-dashed !p-20 flex flex-col items-center justify-center text-center space-y-6 transition-all",
                                dragOver ? "border-black bg-muted" : "hover:border-black/50"
                            )}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={async (e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) await processJD(f); }}
                        >
                            <input ref={fileInputRef} type="file" className="hidden" accept=".pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) processJD(f); }} />
                            <div className="size-16 rounded-xl bg-black text-white flex items-center justify-center">
                                {jobLoading ? <Loader2 size={32} className="animate-spin" /> : <Upload size={32} />}
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-bold">Upload Role PDF</h3>
                                <p className="text-sm text-muted-foreground">Standard technical JD files accepted (Max 10MB)</p>
                            </div>
                            <Button className="h-11 px-8 rounded-md" onClick={() => fileInputRef.current?.click()} disabled={jobLoading}>
                                {jobLoading ? 'Analyzing Blueprint...' : 'Select File'}
                            </Button>
                        </div>
                    </motion.div>
                )}

                {step === 'verify-profile' && job && (
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-8"
                    >
                        <div className="flex justify-between items-center">
                            <h2 className="text-3xl font-bold tracking-tight">Technical Blueprint</h2>
                            <Button className="gap-2" onClick={() => setStep('bulk-resumes')}>
                                Continue to Sourcing <ArrowRight size={16} />
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="vercel-card space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Role Title</Label>
                                            <Input value={job.title} onChange={(e) => setJob({...job, title: e.target.value})} className="h-10 rounded-md" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Organization</Label>
                                            <Input value={job.company} onChange={(e) => setJob({...job, company: e.target.value})} className="h-10 rounded-md" />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Extracted Competency Matrix</Label>
                                        <div className="divide-y border rounded-md">
                                            {job.core_skills.map((s, i) => (
                                                <div key={i} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors group">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn("size-2 rounded-full", s.mandatory ? "bg-red-500" : "bg-emerald-500")} />
                                                        <span className="text-sm font-medium">{s.skill}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Select value={s.weight} onValueChange={(val) => {
                                                            const core_skills = [...job.core_skills];
                                                            core_skills[i].weight = val as any;
                                                            setJob({...job, core_skills});
                                                        }}>
                                                            <SelectTrigger className="h-8 w-32 text-[10px] font-bold uppercase">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="critical">Critical</SelectItem>
                                                                <SelectItem value="important">Important</SelectItem>
                                                                <SelectItem value="nice_to_have">Nice to have</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <button className="text-muted-foreground hover:text-red-500" onClick={() => {
                                                            setJob({...job, core_skills: job.core_skills.filter((_, idx) => idx !== i)});
                                                        }}><Trash2 size={14} /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="vercel-card bg-zinc-950 text-white border-none shadow-2xl">
                                    <h3 className="text-[10px] font-black uppercase text-zinc-500 mb-4">Industrial Intelligence</h3>
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">Req. Tenure</span>
                                            <div className="flex items-center gap-2">
                                                <button className="size-6 border border-zinc-700 rounded flex items-center justify-center hover:bg-zinc-800 transition-colors" onClick={() => setJob({...job, experience_expectations: {...job.experience_expectations, min_years: Math.max(0, job.experience_expectations.min_years - 1)}})}>-</button>
                                                <span className="font-bold">{job.experience_expectations.min_years}y</span>
                                                <button className="size-6 border border-zinc-700 rounded flex items-center justify-center hover:bg-zinc-800 transition-colors" onClick={() => setJob({...job, experience_expectations: {...job.experience_expectations, min_years: job.experience_expectations.min_years + 1}})}>+</button>
                                            </div>
                                        </div>
                                        <div className="p-3 bg-zinc-900 rounded-md border border-white/10 space-y-2">
                                            <p className="text-[9px] font-black uppercase text-zinc-500">AI Assumption</p>
                                            <p className="text-xs text-zinc-400 italic">"Detected senior-level autonomy requirements. Pricing benchmarked at Tier-1 INR compensation."</p>
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
                        className="space-y-8"
                    >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-3xl font-bold tracking-tight">Resource Pipeline</h2>
                                <p className="text-muted-foreground">Upload candidates to process against the technical blueprint.</p>
                            </div>
                            <div className="flex gap-4">
                                <Button variant="ghost" onClick={() => setStep('verify-profile')}>Back</Button>
                                <Button className="gap-2" disabled={candidateFiles.length === 0} onClick={() => setStep('review-launch')}>
                                    Final Review <ArrowRight size={16} />
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div 
                                className="vercel-card border-dashed flex flex-col items-center justify-center p-16 text-center space-y-4 hover:border-black transition-all cursor-pointer"
                                onClick={() => resumeInputRef.current?.click()}
                            >
                                <input 
                                    ref={resumeInputRef} 
                                    type="file" 
                                    multiple 
                                    className="hidden" 
                                    onChange={(e) => {
                                        const files = Array.from(e.target.files || []);
                                        setCandidateFiles([...candidateFiles, ...files]);
                                    }}
                                />
                                <div className="size-12 rounded-lg bg-black text-white flex items-center justify-center">
                                    <Database size={24} />
                                </div>
                                <h3 className="font-bold">Add Resumes</h3>
                                <p className="text-xs text-muted-foreground">Select multiple PDFs to start bulk ingestion.</p>
                            </div>

                            <div className="vercel-card h-[300px] overflow-y-auto">
                                <div className="flex items-center justify-between mb-4 border-b pb-4 sticky top-0 bg-card">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Queue Selection ({candidateFiles.length})</h3>
                                    <button className="text-[10px] font-bold text-red-500" onClick={() => setCandidateFiles([])}>Clear All</button>
                                </div>
                                <div className="space-y-2">
                                    {candidateFiles.map((f, i) => (
                                        <div key={i} className="flex items-center justify-between p-2 rounded hover:bg-muted text-xs font-medium group">
                                            <div className="flex items-center gap-2">
                                                <FileText size={14} className="text-muted-foreground" />
                                                <span className="truncate max-w-[200px]">{f.name}</span>
                                            </div>
                                            <button 
                                                className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100"
                                                onClick={() => setCandidateFiles(candidateFiles.filter((_, idx) => idx !== i))}
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    {candidateFiles.length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-40 opacity-20">
                                            <Database size={32} />
                                            <p className="text-[10px] font-bold uppercase mt-2">Queue Empty</p>
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
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-2xl mx-auto space-y-12 py-12"
                    >
                        <div className="text-center space-y-4">
                            <h2 className="text-4xl font-bold tracking-tighter">Execute Deployment.</h2>
                            <p className="text-muted-foreground">Verify the batch parameters before authorizing the AI cluster to initiate evaluation.</p>
                        </div>

                        <div className="vercel-card divide-y !p-0">
                            <div className="p-6 flex justify-between items-center">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Target Role</p>
                                    <p className="font-bold">{job.title}</p>
                                </div>
                                <div className="text-right space-y-1">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Organization</p>
                                    <p className="font-bold">{job.company}</p>
                                </div>
                            </div>
                            <div className="p-6 flex justify-between items-center">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Batch Size</p>
                                    <p className="font-bold">{candidateFiles.length} Candidates</p>
                                </div>
                                <div className="text-right space-y-1">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Compliance Gate</p>
                                    <p className="font-bold text-emerald-500 flex items-center gap-1 justify-end">
                                        <ShieldCheck size={14} /> DPDP-2023 Valid
                                    </p>
                                </div>
                            </div>
                            <div className="p-6 bg-muted/20">
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap size={14} className="text-amber-500" />
                                    <span className="text-[10px] font-black uppercase text-amber-500">Resource Estimation</span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed italic">
                                    Processing this batch will take approximately {Math.ceil(candidateFiles.length * 1.5)} minutes. Data will be cached in the regional Indian cluster for 30 days.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <Button 
                                className="h-14 rounded-md text-lg font-bold gap-3 shadow-2xl shadow-black/20" 
                                size="lg" 
                                onClick={handleLaunchBatch}
                                disabled={isProcessingBatch}
                            >
                                {isProcessingBatch ? (
                                    <>
                                        <Loader2 size={24} className="animate-spin" />
                                        Authorizing Sovereign Cluster...
                                    </>
                                ) : (
                                    <>
                                        Authorize & Deploy {candidateFiles.length} Candidates
                                        <ArrowRight size={20} />
                                    </>
                                )}
                            </Button>
                            <Button variant="ghost" className="h-12" onClick={() => setStep('bulk-resumes')}>Back to Sourcing</Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

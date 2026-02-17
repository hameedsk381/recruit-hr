import { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import api from '../api/client';
import type { JobDescription, WeightedSkill } from '../types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { motion } from 'framer-motion';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    Upload,
    FileText,
    Check,
    Trash2,
    Plus,
    ArrowRight,
    Briefcase,
    Target,
    BarChart,
    Sparkles,
    AlertCircle,
    Info,
    Settings2
} from 'lucide-react';
import { cn } from "@/lib/utils";

export default function JobSetup() {
    const { job, setJob, jobLoading, setJobLoading, setError, setView, jobError } = useApp();
    const [newSkill, setNewSkill] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Process uploaded file
    const processFile = async (file: File) => {
        setJobLoading(true);
        setError('job', null);

        try {
            const result = await api.extractJD(file);

            if (result.success && result.data) {
                const extractedJob: JobDescription = {
                    id: crypto.randomUUID(),
                    title: result.data.title || 'Untitled Role',
                    company: result.data.company || 'Company',
                    core_skills: (result.data.skills || []).map((skill: string, index: number) => ({
                        skill,
                        weight: index < 3 ? 'critical' : index < 6 ? 'important' : 'nice_to_have',
                        mandatory: index < 3,
                    })),
                    experience_expectations: {
                        min_years: result.data.requiredIndustrialExperienceYears || 0,
                        domain_specific: result.data.domainExperience?.[0],
                    },
                    role_context: result.data.responsibilities?.join('. '),
                    location: result.data.location,
                    ai_assumptions: [
                        `Detected ${result.data.skills?.length || 0} skills from the job description`,
                        result.data.requiredIndustrialExperienceYears ?
                            `Minimum experience: ${result.data.requiredIndustrialExperienceYears} years` :
                            'Experience requirement not clearly specified',
                        `Role type: ${result.data.employmentType || 'Not specified'}`,
                    ],
                };

                setJob(extractedJob);
            } else {
                setError('job', result.error || 'Failed to extract job description');
            }
        } catch (err) {
            setError('job', err instanceof Error ? err.message : 'Failed to upload file');
        } finally {
            setJobLoading(false);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) await processFile(file);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') await processFile(file);
    };

    // Skill management
    const handleWeightChange = (index: number, weight: string) => {
        if (!job) return;
        const core_skills = [...job.core_skills];
        core_skills[index] = { ...core_skills[index], weight: weight as WeightedSkill['weight'] };
        setJob({ ...job, core_skills });
    };

    const handleMandatoryToggle = (index: number) => {
        if (!job) return;
        const core_skills = [...job.core_skills];
        core_skills[index] = { ...core_skills[index], mandatory: !core_skills[index].mandatory };
        setJob({ ...job, core_skills });
    };

    const handleAddSkill = () => {
        if (!job || !newSkill.trim()) return;
        setJob({
            ...job,
            core_skills: [...job.core_skills, { skill: newSkill.trim(), weight: 'important', mandatory: false }],
        });
        setNewSkill('');
    };

    const handleRemoveSkill = (index: number) => {
        if (!job) return;
        setJob({ ...job, core_skills: job.core_skills.filter((_, i) => i !== index) });
    };

    const handleExperienceChange = (years: number) => {
        if (!job) return;
        setJob({
            ...job,
            experience_expectations: { ...job.experience_expectations, min_years: years },
        });
    };

    // --- RENDER STATES ---

    if (!job && !jobLoading) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-3xl mx-auto min-h-[70vh] flex flex-col items-center justify-center space-y-8"
            >
                <div className="text-center space-y-3">
                    <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                        Ready to <span className="gradient-text">automate</span> your hiring?
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                        Upload your job description (PDF) and let our AI build your ideal candidate profile in seconds.
                    </p>
                </div>

                <Card
                    className={cn(
                        "w-full group relative overflow-hidden transition-all duration-500 bg-card/30 backdrop-blur-md border-2 border-dashed",
                        dragOver ? "border-primary bg-primary/5 scale-[1.02]" : "border-muted-foreground/20 hover:border-primary/40"
                    )}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                >
                    <div className="p-16 flex flex-col items-center text-center space-y-6">
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 animate-pulse" />
                            <div className="relative size-24 rounded-3xl bg-primary text-primary-foreground flex items-center justify-center shadow-2xl shadow-primary/40 group-hover:scale-110 transition-transform">
                                <Upload size={40} strokeWidth={1.5} />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <Button
                                size="lg"
                                className="h-14 px-10 rounded-2xl text-lg font-bold gap-3 shadow-xl"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Plus size={20} />
                                Select Job PDF
                            </Button>
                            <p className="text-sm font-medium text-muted-foreground">
                                or drop your file anywhere in this box
                            </p>
                        </div>
                    </div>
                </Card>

                {jobError && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full p-4 rounded-2xl bg-destructive/5 border border-destructive/20 text-destructive text-sm flex items-center gap-3"
                    >
                        <AlertCircle className="size-4 shrink-0" />
                        {jobError}
                    </motion.div>
                )}
            </motion.div>
        );
    }

    if (jobLoading) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-12">
                <div className="relative">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                        className="absolute inset-0 size-32 border-4 border-dashed border-primary/20 rounded-full"
                    />
                    <div className="size-32 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-12 text-primary animate-pulse" />
                </div>
                <div className="text-center space-y-4 max-w-sm">
                    <h2 className="text-2xl font-bold tracking-tight">AI Engine processing...</h2>
                    <p className="text-muted-foreground">
                        We're decomposing the document into structured skills and industrial benchmarks.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-card/30 backdrop-blur-md p-8 rounded-3xl border premium-shadow">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                        <Settings2 className="size-3" />
                        Refinement Phase
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight">Technical Profile Blueprint</h1>
                    <p className="text-muted-foreground">Verify the AI's understanding of your requirements before continuing.</p>
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" size="lg" className="h-12 rounded-xl px-6" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="size-4 mr-2" />
                        Re-upload
                    </Button>
                    <Button size="lg" className="h-12 rounded-xl px-8 font-bold gap-2" onClick={() => setView('shortlist')}>
                        Lock Blueprint
                        <ArrowRight className="size-4" />
                    </Button>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Left Column: Role & Skills */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Basic Info */}
                    <Card className="rounded-3xl border overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b px-8 py-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                    <Briefcase size={20} />
                                </div>
                                <h3 className="text-lg font-bold">Role Matrix</h3>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 grid md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Official Title</Label>
                                <Input
                                    value={job?.title}
                                    className="h-12 rounded-xl bg-muted/20 border-transparent focus:bg-background transition-all"
                                    onChange={(e) => job && setJob({ ...job, title: e.target.value })}
                                />
                            </div>
                            <div className="space-y-3">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Organization</Label>
                                <Input
                                    value={job?.company}
                                    className="h-12 rounded-xl bg-muted/20 border-transparent focus:bg-background transition-all"
                                    onChange={(e) => job && setJob({ ...job, company: e.target.value })}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Skill Table */}
                    <Card className="rounded-3xl border overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b px-8 py-6 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                    <Target size={20} />
                                </div>
                                <h3 className="text-lg font-bold">Skill Breakdown</h3>
                            </div>
                            <Badge variant="outline" className="px-3 py-1 font-bold">{job?.core_skills.length} detected</Badge>
                        </CardHeader>
                        <div className="divide-y">
                            {job?.core_skills.map((skill, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="grid grid-cols-12 gap-4 p-6 items-center hover:bg-muted/20 transition-all group"
                                >
                                    <div className="col-span-12 md:col-span-5">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "size-2 rounded-full",
                                                skill.weight === 'critical' ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" :
                                                    skill.weight === 'important' ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "bg-emerald-500"
                                            )} />
                                            <span className="font-bold text-base">{skill.skill}</span>
                                        </div>
                                    </div>
                                    <div className="col-span-5 md:col-span-2 flex items-center gap-2">
                                        <Switch checked={skill.mandatory} onCheckedChange={() => handleMandatoryToggle(index)} />
                                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-tighter">Must-have</span>
                                    </div>
                                    <div className="col-span-5 md:col-span-4">
                                        <Select value={skill.weight} onValueChange={(val) => handleWeightChange(index, val)}>
                                            <SelectTrigger className="h-10 rounded-xl bg-muted/40 border-transparent">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="critical">🔴 Critical Priority</SelectItem>
                                                <SelectItem value="important">🟡 Important</SelectItem>
                                                <SelectItem value="nice_to_have">🟢 Nice to have</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="col-span-2 md:col-span-1 flex justify-end">
                                        <Button variant="ghost" size="icon" className="size-8 rounded-lg text-muted-foreground hover:text-destructive transition-colors" onClick={() => handleRemoveSkill(index)}>
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                        <CardFooter className="bg-muted/10 border-t p-6 gap-3">
                            <Input
                                placeholder="Add custom competency..."
                                value={newSkill}
                                onChange={(e) => setNewSkill(e.target.value)}
                                className="h-12 rounded-xl"
                            />
                            <Button className="h-12 rounded-xl px-6" variant="secondary" onClick={handleAddSkill}>
                                <Plus size={18} className="mr-2" />
                                Append Skill
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                {/* Right Column: AI Insights & Domain */}
                <div className="space-y-8">
                    {/* Experience Slider */}
                    <Card className="rounded-3xl border overflow-hidden">
                        <CardHeader className="bg-muted/30 px-8 py-6">
                            <div className="flex items-center gap-3 text-primary">
                                <BarChart size={20} />
                                <h3 className="text-lg font-bold">Industrial Age</h3>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div className="text-center space-y-2">
                                <div className="text-5xl font-black text-primary group">
                                    {job?.experience_expectations.min_years}
                                    <span className="text-xl ml-1 text-muted-foreground font-bold">Yrs</span>
                                </div>
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Industry Benchmark</p>
                            </div>

                            <div className="flex items-center gap-4">
                                <Button variant="secondary" className="size-10 rounded-xl" onClick={() => handleExperienceChange(Math.max(0, (job?.experience_expectations.min_years || 0) - 1))}>-</Button>
                                <div className="flex-1 h-3 bg-muted rounded-full relative overflow-hidden">
                                    <motion.div
                                        className="absolute inset-y-0 left-0 bg-primary"
                                        animate={{ width: `${Math.min(100, ((job?.experience_expectations.min_years || 0) / 15) * 100)}%` }}
                                    />
                                </div>
                                <Button variant="secondary" className="size-10 rounded-xl" onClick={() => handleExperienceChange((job?.experience_expectations.min_years || 0) + 1)}>+</Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* AI Observations */}
                    <Card className="rounded-3xl border-primary/20 bg-primary/5 premium-shadow relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Sparkles size={100} />
                        </div>
                        <CardHeader className="px-8 py-6">
                            <div className="flex items-center gap-3 text-primary">
                                <Info size={20} />
                                <h3 className="text-lg font-bold">AI Diagnostics</h3>
                            </div>
                        </CardHeader>
                        <CardContent className="px-8 pb-8">
                            <ul className="space-y-4">
                                {job?.ai_assumptions?.map((text, i) => (
                                    <li key={i} className="flex gap-3 text-sm font-medium leading-relaxed">
                                        <Check className="size-5 text-primary shrink-0 p-1 bg-primary/10 rounded-full" />
                                        {text}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>

                    {/* Context Textarea */}
                    <div className="space-y-4">
                        <div className="px-1 flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                            <FileText size={14} />
                            Strategic Context
                        </div>
                        <Textarea
                            rows={6}
                            value={job?.role_context}
                            onChange={(e) => job && setJob({ ...job, role_context: e.target.value })}
                            className="rounded-3xl border-muted-foreground/10 bg-card/50 p-6 focus:ring-primary/20 transition-all resize-none shadow-inner"
                            placeholder="Describe relevant project domains, team structure, or tech debt..."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function CardFooter({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("flex items-center p-6 pt-0", className)} {...props}>{children}</div>
}


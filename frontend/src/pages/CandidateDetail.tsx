import { } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import api from '../api/client';
import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    Pin,
    Sparkles,
    AlertCircle,
    Mail,
    Phone,
    Target,
    Mic,
    ThumbsUp,
    Users,
    Clock,
    ShieldAlert,
    MoreHorizontal,
    Activity,
    Database,
    FileText
} from 'lucide-react';
import { cn } from "@/lib/utils";

export default function CandidateDetail() {
    const {
        candidates,
        selectedCandidateId,
        selectCandidate,
        pinCandidate,
        toggleCopilot,
        copilot,
        setView,
        batchId,
        updateCandidateStage,
        setOfferDraft,
        job
    } = useApp();


    const candidate = candidates.find(c => c.id === selectedCandidateId);
    const currentIndex = candidates.findIndex(c => c.id === selectedCandidateId);
    const totalCandidates = candidates.length;

    const goToPrevious = () => currentIndex > 0 && selectCandidate(candidates[currentIndex - 1].id);
    const goToNext = () => currentIndex < candidates.length - 1 && selectCandidate(candidates[currentIndex + 1].id);

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

    const handleGenerateOffer = () => {
        setOfferDraft({
            candidateId: candidate.id,
            jobId: job?.id || '',
            candidateName: profile.name,
            jobTitle: job?.title || ''
        });
        setView('offers');
    };

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
                    {candidate.stage === 'hm_approved' && (
                        <Button className="h-9 font-bold bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleGenerateOffer}>
                            <FileText size={16} className="mr-2" /> Generate Offer
                        </Button>
                    )}
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
                                <div className="space-y-1 text-center">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Suitability Score</span>
                                    <span className="text-xl font-black text-foreground">{Math.round(Number(assessment.matchScore) || 0)}%</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-6 border-t border-border/50">
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Clock size={12} /> Professional Experience</p>
                                <p className="text-xl font-bold tabular-nums text-foreground">{profile.experience_estimate?.total_years || '0'} Years</p>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Activity size={12} /> Expertise Depth</p>
                                <p className="text-xl font-bold tabular-nums text-foreground">{profile.extracted_skills.length} Skills Identified</p>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><ShieldAlert size={12} /> Reference ID</p>
                                <p className="text-lg font-mono text-muted-foreground">{candidate.id.split('-')[0].toUpperCase()}</p>
                            </div>
                        </div>
                    </div>

                    {/* AI Analysis Sections */}
                    <div className="space-y-10">
                        <section className="space-y-4">
                            <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2 text-foreground">
                                <Sparkles size={16} /> Executive Summary
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
                                    <Mic size={16} /> Structured Evaluation Insights
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
                                                <Badge className="bg-indigo-600 text-white border-transparent">Validated Feedback</Badge>
                                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Verified Recruitment Intelligence</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-2 text-emerald-600">
                                    <ThumbsUp size={14} /> Strategic Strengths
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
                                    <AlertCircle size={14} /> Areas for Exploration
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
                                <Target size={16} /> Job Alignment Analysis
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
                                <Database size={12} /> ATS Integration
                            </h3>
                        </div>
                        <div className="p-5 space-y-4">
                            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                                Sync this candidate profile with your internal applicant tracking system.
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
                            <Activity size={14} /> Hiring Progression
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
                                    {s === 'technical' ? 'Interview' : s === 'culture' ? 'Culture' : s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="vercel-card !p-5 space-y-4 bg-card shadow-sm border-border/70">
                        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <MoreHorizontal size={14} /> Contact Details
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
                                if (confirm("Data Privacy: Permanently erase all candidate data and interview history?")) {
                                    await api.deleteCandidateData(candidate.id);
                                    setView('shortlist');
                                }
                            }}
                        >
                            <ShieldAlert size={14} className="mr-2 opacity-70 group-hover:opacity-100" /> 
                            Request Profile Erasure
                        </Button>
                    </div>
                </div>
            </main>

        </div>
    );
}

import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
    Users, 
    CheckCircle2, 
    XCircle, 
    MessageSquare, 
    ChevronRight,
    Sparkles,
    Target,
    Activity,
    Brain,
    Trophy,
    AlertCircle,
    ThumbsUp
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';

export default function HMDashboard() {
    const { 
        job, 
        candidates, 
        candidatesLoading, 
        submitHMDecision,
        user 
    } = useApp();

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const shortlist = candidates.filter(c => !c.removed);
    const selectedCandidate = shortlist.find(c => c.id === selectedId) || shortlist[0];

    // Initialize selected ID if not set
    if (!selectedId && shortlist.length > 0) {
        setSelectedId(shortlist[0].id);
    }

    const handleDecision = async (decision: 'approved' | 'rejected') => {
        if (!selectedCandidate) return;
        setSubmitting(true);
        try {
            await submitHMDecision(selectedCandidate.id, decision, notes);
            setNotes('');
            // Optional: Move to next candidate in list
            const currentIndex = shortlist.findIndex(c => c.id === selectedCandidate.id);
            if (currentIndex < shortlist.length - 1) {
                setSelectedId(shortlist[currentIndex + 1].id);
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (candidatesLoading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
                <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground animate-pulse">Loading candidates for your review...</p>
            </div>
        );
    }

    if (shortlist.length === 0) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
                <div className="size-16 rounded-full bg-muted flex items-center justify-center">
                    <Users className="text-muted-foreground" size={32} />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">No candidates to review yet.</h2>
                <p className="text-muted-foreground max-w-sm">The recruitment team is still shortlisting the best matches for you.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <header className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary/60">
                    <Target size={14} /> hiring manager dashboard
                </div>
                <h1 className="text-4xl font-bold tracking-tight">
                    Review Shortlist for <span className="text-primary">{job?.title || 'Open Role'}</span>
                </h1>
                <p className="text-muted-foreground">
                    Based on your requirements, AI has surfaced {shortlist.length} high-potential candidates for your decision.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Candidate List */}
                <aside className="lg:col-span-4 space-y-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-4">
                        <Users size={14} /> candidate queue
                    </h3>
                    <div className="space-y-3">
                        {shortlist.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => {
                                    setSelectedId(c.id);
                                    setNotes(c.hmNotes || '');
                                }}
                                className={cn(
                                    "w-full text-left vercel-card relative group transition-all",
                                    selectedId === c.id ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "hover:border-primary/30",
                                    c.hmDecision === 'approved' && "border-emerald-500/50 bg-emerald-500/5",
                                    c.hmDecision === 'rejected' && "border-red-500/50 bg-red-500/5"
                                )}
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold truncate">{c.profile.name}</span>
                                            {c.hmDecision === 'approved' && <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />}
                                            {c.hmDecision === 'rejected' && <XCircle size={14} className="text-red-500 shrink-0" />}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mt-0.5">
                                            {c.profile.recent_role?.title || 'Professional'}
                                        </p>
                                    </div>
                                    <div className={cn(
                                        "text-xs font-black px-2 py-1 rounded border",
                                        c.assessment.fit_assessment.overall_fit === 'high' ? "text-emerald-600 border-emerald-500/20 bg-emerald-500/10" :
                                        c.assessment.fit_assessment.overall_fit === 'medium' ? "text-amber-600 border-amber-500/20 bg-amber-500/10" :
                                        "text-blue-600 border-blue-500/20 bg-blue-500/10"
                                    )}>
                                        {c.assessment.fit_assessment.overall_fit === 'high' ? 'A+' : c.assessment.fit_assessment.overall_fit === 'medium' ? 'B' : 'C'}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </aside>

                {/* Right: Selected Candidate Detail & Action */}
                <main className="lg:col-span-8">
                    <AnimatePresence mode="wait">
                        {selectedCandidate && (
                            <motion.div
                                key={selectedCandidate.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-8"
                            >
                                {/* Candidate Bio Summary */}
                                <div className="vercel-card flex flex-col md:flex-row items-center gap-8 bg-muted/20 border-none">
                                    <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold border-2 border-primary/20 shrink-0">
                                        {selectedCandidate.profile.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 text-center md:text-left space-y-2">
                                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                                            <h2 className="text-3xl font-bold tracking-tight">{selectedCandidate.profile.name}</h2>
                                            <Badge variant="secondary" className="w-fit mx-auto md:mx-0 font-bold uppercase tracking-widest text-[10px]">{selectedCandidate.profile.experience_estimate?.total_years || '0'}y experience</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground leading-relaxed italic">
                                            "{selectedCandidate.assessment.one_line_summary}"
                                        </p>
                                    </div>
                                </div>

                                {/* Deep Insights Card */}
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="vercel-card space-y-4 border-none bg-emerald-500/[0.03]">
                                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                                            <ThumbsUp size={14} /> key match indicators
                                        </h4>
                                        <ul className="space-y-3">
                                            {selectedCandidate.assessment.strengths.slice(0, 3).map((s, i) => (
                                                <li key={i} className="flex gap-3 text-xs leading-relaxed">
                                                    <div className="size-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                                    <span className="font-medium">{s.skill}: <span className="text-muted-foreground font-normal">{s.evidence}</span></span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="vercel-card space-y-4 border-none bg-amber-500/[0.03]">
                                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-amber-600 flex items-center gap-2">
                                            <AlertCircle size={14} /> development areas
                                        </h4>
                                        <ul className="space-y-3">
                                            {selectedCandidate.assessment.gaps_and_risks.slice(0, 3).map((g, i) => (
                                                <li key={i} className="flex gap-3 text-xs leading-relaxed">
                                                    <div className="size-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                                    <span className="font-medium">{g.area}: <span className="text-muted-foreground font-normal">{g.explanation}</span></span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {/* HM Decision Area */}
                                <div className="vercel-card space-y-6 ring-2 ring-primary/10 border-primary/20">
                                    <div className="space-y-2">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <MessageSquare size={18} /> Your Decision
                                        </h3>
                                        <p className="text-xs text-muted-foreground">Leave a note for the recruiter about this candidate.</p>
                                    </div>

                                    <Textarea 
                                        placeholder="Add context for your decision (e.g., 'Strong technical fit, but concerned about domain experience'...)"
                                        className="min-h-[100px] bg-muted/30 border-none resize-none"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    />

                                    <div className="flex gap-4">
                                        <Button 
                                            variant="outline" 
                                            className="flex-1 h-12 rounded-xl text-red-500 border-red-500/20 hover:bg-red-500/5 font-bold uppercase tracking-widest text-[10px]"
                                            onClick={() => handleDecision('rejected')}
                                            disabled={submitting}
                                        >
                                            <XCircle size={16} className="mr-2" />
                                            Reject Candidate
                                        </Button>
                                        <Button 
                                            className="flex-1 h-12 rounded-xl font-bold uppercase tracking-widest text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white"
                                            onClick={() => handleDecision('approved')}
                                            disabled={submitting}
                                        >
                                            <CheckCircle2 size={16} className="mr-2" />
                                            Approve for Interview
                                        </Button>
                                    </div>

                                    {selectedCandidate.hmDecision && (
                                        <div className={cn(
                                            "mt-4 p-4 rounded-xl flex items-center gap-3 text-sm font-medium",
                                            selectedCandidate.hmDecision === 'approved' ? "bg-emerald-500/10 text-emerald-700" : "bg-red-500/10 text-red-700"
                                        )}>
                                            <Activity size={16} /> 
                                            Current Status: {selectedCandidate.hmDecision === 'approved' ? 'Approved for the loop' : 'Rejected'}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}

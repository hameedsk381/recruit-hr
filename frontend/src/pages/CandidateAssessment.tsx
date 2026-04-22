import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    Clock, 
    Lightbulb, 
    Send, 
    AlertCircle,
    CheckCircle2,
    FileText,
    Lock
} from 'lucide-react';
import { cn } from "@/lib/utils";
import api from '../api/client';

export default function CandidateAssessment() {
    const { token } = useParams();
    const [problem, setProblem] = useState<any>(null);
    const [solution, setSolution] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [evaluation, setEvaluation] = useState<any>(null);

    useEffect(() => {
        const loadProblem = async () => {
            try {
                // In a production flow, 'token' would be exchanged for a batchId and candidate context
                // For this implementation, we use a placeholder batchId to trigger the AI generation
                const res = await api.getDynamicAssessment('demo-batch-id');
                if (res.success) {
                    setProblem(res.problem);
                    setSolution(res.problem.starterCode || '');
                }
            } catch (error) {
                console.error("Failed to load assessment", error);
            }
        };

        loadProblem();
    }, [token]);

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const res = await api.submitAssessment({
                problemId: problem.id,
                submission: solution,
                candidateId: 'demo-candidate-id',
                batchId: 'demo-batch-id'
            });

            if (res.success) {
                setEvaluation(res.evaluation);
                setCompleted(true);
            }
        } catch (error) {
            console.error("Submission failed", error);
        } finally {
            setSubmitting(false);
        }
    };

    if (!problem) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-slate-400">
                    <div className="size-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium tracking-widest uppercase">Opening Your Assessment Space...</span>
                </div>
            </div>
        );
    }

    if (completed) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
                <div className="max-w-2xl w-full vercel-card bg-slate-900 border-emerald-500/30 p-8 space-y-6 text-center animate-in zoom-in duration-500">
                    <div className="size-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2">
                        <CheckCircle2 size={32} />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold text-white">Assessment Completed</h1>
                        <p className="text-slate-400">Your answers have been saved and shared with the hiring team.</p>
                    </div>
                    
                    <div className="bg-slate-950/50 rounded-xl p-6 border border-white/5 text-left space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Your Result</span>
                            <span className="text-2xl font-black text-emerald-400">{evaluation.score}%</span>
                        </div>
                        <div className="h-px bg-white/5" />
                        <div className="space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Our Review</span>
                            <p className="text-sm text-slate-300 leading-relaxed italic">"{evaluation.feedback}"</p>
                        </div>
                    </div>

                    <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 font-bold uppercase tracking-widest text-xs" onClick={() => window.close()}>
                        Close Assessment
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 flex flex-col font-mono">
            {/* Header */}
            <header className="h-14 border-b border-white/5 bg-slate-900 px-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="size-6 bg-indigo-600 rounded flex items-center justify-center text-white">
                        <FileText size={14} />
                    </div>
                    <span className="text-sm font-bold text-white tracking-tight uppercase">Assessment Space v1.0</span>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-indigo-400">
                        <Clock size={16} />
                        <span className="text-sm font-bold">45:00</span>
                    </div>
                    <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 bg-indigo-500/5 text-[10px] uppercase font-black px-3 py-1">
                        Professional Review
                    </Badge>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden">
                {/* Problem Pane */}
                <section className="w-1/3 border-r border-white/5 p-8 overflow-y-auto space-y-8 bg-slate-900/50">
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-white tracking-tight">{problem.title}</h2>
                        <div className="flex gap-2">
                            <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[10px] uppercase">{problem.type}</Badge>
                            <Badge className="bg-slate-800 text-slate-400 text-[10px] uppercase">Difficulty: High</Badge>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-white">
                            <Lightbulb size={16} className="text-yellow-500" />
                            <h3 className="text-xs font-bold uppercase tracking-widest">The Challenge</h3>
                        </div>
                        <p className="text-sm leading-relaxed text-slate-400 whitespace-pre-wrap">
                            {problem.description}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-white">
                            <AlertCircle size={16} className="text-rose-500" />
                            <h3 className="text-xs font-bold uppercase tracking-widest">Constraints</h3>
                        </div>
                        <ul className="space-y-2">
                            {problem.constraints?.map((c: string, idx: number) => (
                                <li key={idx} className="flex gap-2 text-xs text-slate-500">
                                    <span className="text-indigo-500">•</span>
                                    {c}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 mt-auto">
                        <div className="flex gap-3">
                            <Lock size={16} className="text-indigo-500 shrink-0" />
                            <p className="text-[10px] leading-relaxed text-indigo-400/80">
                                This is a private space. Your focus and work are shared only with the hiring team.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Editor Pane */}
                <section className="flex-1 flex flex-col relative bg-slate-950">
                    <div className="flex-1 p-4">
                        <textarea 
                            className="w-full h-full bg-transparent resize-none outline-none text-emerald-400 font-mono text-sm leading-relaxed"
                            value={solution}
                            onChange={(e) => setSolution(e.target.value)}
                            spellCheck={false}
                        />
                    </div>
                    
                    {/* Controls */}
                    <div className="h-16 border-t border-white/5 bg-slate-900/80 backdrop-blur px-6 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            <span>Character Count: {solution.length}</span>
                            <span>Auto-saving...</span>
                        </div>
                        <Button 
                            className={cn(
                                "h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-widest text-[10px] px-6 transition-all",
                                submitting && "opacity-50 cursor-wait"
                            )}
                            disabled={submitting}
                            onClick={handleSubmit}
                        >
                            {submitting ? (
                                <>
                                    <div className="size-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Send size={12} className="mr-2" />
                                    Submit Solution
                                </>
                            )}
                        </Button>
                    </div>
                </section>
            </main>
        </div>
    );
}

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { CheckCircle2, Circle, Clock, Sparkles, Building2, Calendar, FileText, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function CandidateStatusTracker() {
    const { token } = useParams<{ token: string }>();
    const [application, setApplication] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await api.getApplicationStatus(token!);
                if (res.success) {
                    setApplication(res.application);
                } else {
                    setError(true);
                }
            } catch (err) {
                setError(true);
            } finally {
                setLoading(false);
            }
        };
        fetchStatus();
    }, [token]);

    const stages = [
        { name: 'Applied', status: 'completed', description: 'Resume received and processed.' },
        { name: 'Technical Screening', status: application?.status === 'screened' || application?.stage === 'Technical Screening' ? 'completed' : 'current', description: 'Initial AI vetting completed.' },
        { name: 'HM Review', status: application?.stage === 'HM Review' ? 'current' : 'upcoming', description: 'Hiring manager is reviewing your profile.' },
        { name: 'Interview', status: application?.stage === 'Interviewing' ? 'current' : 'upcoming', description: 'Schedule technical or cultural rounds.' },
        { name: 'Offer', status: application?.stage === 'Offer' ? 'current' : 'upcoming', description: 'Final decision and onboarding.' }
    ];

    if (loading) return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center text-zinc-500 gap-4">
            <Loader2 className="animate-spin" size={32} />
            <p className="font-medium animate-pulse">Verifying magic link...</p>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center space-y-6">
            <div className="size-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center">
                <Sparkles />
            </div>
            <div className="space-y-2">
                <h1 className="text-2xl font-bold">Magic Link Expired</h1>
                <p className="text-zinc-400 max-w-sm">This link is no longer valid or has expired. Please contact the recruiter for a new link.</p>
            </div>
            <Button onClick={() => navigate('/')} className="bg-white text-black hover:bg-zinc-200 px-8 rounded-xl font-bold">Go Home</Button>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-indigo-500/30">
            <header className="border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="size-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                            <Sparkles size={18} />
                        </div>
                        <span className="font-bold">reckuit.ai</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-zinc-400 font-medium hover:text-white" onClick={() => navigate('/')}>
                        Support
                    </Button>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-12 sm:py-20">
                
                {/* Application Header */}
                <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-8 mb-12 flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[80px] rounded-full" />
                    <div className="space-y-4 relative z-10">
                        <div className="space-y-1">
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{application.jobTitle}</h1>
                            <div className="flex items-center gap-2 text-zinc-500 font-medium">
                                <Building2 size={16} />
                                <span>Enterprise Partner</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-wider text-zinc-400">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-lg border border-white/5">
                                <Calendar size={14} className="text-indigo-400" />
                                {new Date(application.appliedAt).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                                <Clock size={14} />
                                {application.status.toUpperCase()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Progress Timeline */}
                <div className="space-y-12">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <FileText size={20} className="text-zinc-500" />
                        Application Timeline
                    </h2>

                    <div className="relative pl-8 space-y-12 before:absolute before:inset-y-0 before:left-3 before:w-px before:bg-white/10 before:z-0">
                        {stages.map((stage, idx) => {
                            const isCompleted = stage.status === 'completed';
                            const isCurrent = stage.status === 'current';

                            return (
                                <div key={idx} className="relative z-10 animate-in fade-in slide-in-from-left-4" style={{ animationDelay: `${idx * 150}ms` }}>
                                    <div className={`absolute -left-8 top-1.5 p-1 rounded-full border shadow-sm transition-colors ${
                                        isCompleted ? 'bg-indigo-600 border-indigo-500 text-white' : 
                                        isCurrent ? 'bg-black border-indigo-500 text-indigo-400' : 
                                        'bg-zinc-900 border-white/10 text-zinc-700'
                                    }`}>
                                        {isCompleted ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className={`text-lg font-semibold transition-colors ${isCurrent ? 'text-indigo-400' : isCompleted ? 'text-white' : 'text-zinc-500'}`}>
                                            {stage.name}
                                            {isCurrent && <span className="ml-3 text-[10px] font-black uppercase tracking-widest bg-indigo-500 text-white px-2 py-0.5 rounded-full">In Progress</span>}
                                        </h3>
                                        <p className="text-sm text-zinc-500 font-medium max-w-sm">
                                            {stage.description}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-20 p-8 rounded-3xl bg-zinc-900/20 border border-white/5 text-center space-y-4">
                    <p className="text-zinc-400 text-sm font-medium">Keep this tab open or bookmark your magic link to see updates as they happen.</p>
                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest leading-loose">
                        Your data is secured with Enterprise-grade encryption. <br/>
                        Managed by Reckuit.ai Sovereignty Layer
                    </p>
                </div>
            </main>
        </div>
    );
}

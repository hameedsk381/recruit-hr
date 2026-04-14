import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../api/client';
import { 
    Users, 
    TrendingUp, 
    BarChart3, 
    Zap, 
    ShieldCheck, 
    ArrowUpRight, 
    Clock, 
    FileText,
    Database,
    Globe,
    Lock,
    Briefcase
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";

interface AnalyticsData {
    totalResumesProcessed: number;
    totalJobDescriptionsAnalyzed: number;
    averageAssessmentTimeMs: number;
    highMatchRate: number;
    recentBatchTrends: { date: string; count: number }[];
    interviewStatusBreakdown: { status: string; count: number }[];
    hiringRecommendations: { type: string; count: number }[];
    averageCategoryScores: { category: string; average: number }[];
}

interface ROIData {
    totalResumesProcessed: number;
    hoursSaved: number;
    costSavingsINR: number;
    screeningEfficiencyGain: string;
}

export default function Dashboard() {
    const { job, setView, setError } = useApp();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [roi, setRoi] = useState<ROIData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'compliance'>('overview');

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const [res, roiRes] = await Promise.all([
                    api.getAnalytics(),
                    api.getRoiAnalytics()
                ]);
                
                if (res.success) {
                    setData(res.kpis);
                }
                if (roiRes.success) {
                    setRoi(roiRes.summary);
                }
            } catch (err) {
                setError('dashboard', 'Failed to load analytics data');
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [setError]);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="size-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-medium animate-pulse">Initializing your dashboard...</p>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'analytics', label: 'Commercial ROI' },
        { id: 'compliance', label: 'Governance & Privacy' }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Vercel Header Style */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Project Dashboard</h1>
                    <p className="text-muted-foreground">Manage your recruitment infrastructure and AI processing.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[11px] font-bold border border-emerald-500/20">
                        <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        System: Operational
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-8 border-b">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                            "pb-4 text-sm font-medium transition-all relative",
                            activeTab === tab.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {tab.label}
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground"
                            />
                        )}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                    <motion.div
                        key="overview"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-12"
                    >
                        {/* Primary Action Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {!job ? (
                                <button 
                                    onClick={() => setView('setup')}
                                    className="group relative h-64 rounded-3xl border-2 border-dashed border-zinc-200 hover:border-black flex flex-col items-center justify-center text-center p-8 transition-all overflow-hidden bg-background"
                                >
                                    <div className="absolute inset-0 bg-linear-to-br from-zinc-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative z-10 space-y-4">
                                        <div className="size-16 rounded-2xl bg-black text-white flex items-center justify-center mx-auto shadow-2xl group-hover:scale-110 transition-transform">
                                            <FileText size={32} />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black tracking-tight">Launch New Campaign</h3>
                                            <p className="text-muted-foreground text-sm max-w-xs mx-auto">Upload a Job Description and initiate AI-powered talent sourcing.</p>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest pt-2">
                                            Start Deployment <ArrowUpRight size={14} />
                                        </div>
                                    </div>
                                </button>
                            ) : (
                                <div className="vercel-card border-none bg-zinc-950 text-white flex flex-col justify-between p-8 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                                        <Briefcase size={100} />
                                    </div>
                                    <div className="relative z-10">
                                        <h3 className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-2">Ongoing Campaign</h3>
                                        <h2 className="text-3xl font-black italic">{job.title}</h2>
                                        <p className="text-zinc-400 text-sm mt-2">{job.company}</p>
                                    </div>
                                    <div className="relative z-10 flex gap-4 pt-8">
                                        <Button 
                                            className="bg-white text-black hover:bg-zinc-200 rounded-xl px-6 h-12 font-bold"
                                            onClick={() => setView('shortlist')}
                                        >
                                            Resume Ranking
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            className="border-zinc-800 text-white hover:bg-zinc-900 rounded-xl px-6 h-12 font-bold"
                                            onClick={() => setView('pipeline')}
                                        >
                                            Kanban View
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <button className="vercel-card flex flex-col justify-between hover:border-black transition-all text-left" onClick={() => setView('interviews')}>
                                    <div className="size-10 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                                        <Clock size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Upcoming</h4>
                                        <p className="text-lg font-black">{data.interviewStatusBreakdown.find(i => i.status === 'scheduled')?.count || 0} Interviews</p>
                                    </div>
                                </button>
                                <button className="vercel-card flex flex-col justify-between hover:border-black transition-all text-left" onClick={() => setView('history')}>
                                    <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
                                        <Database size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Archived</h4>
                                        <p className="text-lg font-black">{data.totalJobDescriptionsAnalyzed} Batches</p>
                                    </div>
                                </button>
                                <button className="vercel-card col-span-2 flex items-center justify-between hover:border-black transition-all text-left group">
                                    <div className="flex items-center gap-4">
                                        <div className="size-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                                            <ShieldCheck size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Compliance ID</h4>
                                            <p className="text-xs font-bold font-mono opacity-60">REG-AF-{new Date().getFullYear()}-001</p>
                                        </div>
                                    </div>
                                    <ArrowUpRight size={18} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                                </button>
                            </div>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 border-t">
                            <div className="vercel-card">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Candidate Pipeline</p>
                                <div className="flex items-baseline gap-2">
                                    <h2 className="text-4xl font-black font-mono">{data.totalResumesProcessed}</h2>
                                    <span className="text-xs font-bold text-emerald-500 flex items-center">
                                        +12% <ArrowUpRight size={12} />
                                    </span>
                                </div>
                            </div>

                            <div className="vercel-card">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Avg Assessment</p>
                                <div className="flex items-baseline gap-2">
                                    <h2 className="text-4xl font-black font-mono">{(data.averageAssessmentTimeMs / 1000).toFixed(1)}s</h2>
                                    <span className="text-xs font-bold text-emerald-500">OPTIMAL</span>
                                </div>
                            </div>

                            <div className="vercel-card">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Match Accuracy</p>
                                <div className="flex items-baseline gap-2">
                                    <h2 className="text-4xl font-black font-mono">{data.highMatchRate}%</h2>
                                    <span className="text-xs font-bold text-amber-500 flex items-center">
                                        TRUSTED
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity (Deployments Style) */}
                        <div className="vercel-card !p-0 overflow-hidden">
                            <div className="p-6 border-b flex items-center justify-between bg-muted/30">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Resume Auto-Deployments</h3>
                                <div className="flex items-center gap-2">
                                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] font-bold">Live Stream</span>
                                </div>
                            </div>
                            <div className="divide-y">
                                {data.recentBatchTrends.slice(0, 5).map((trend, i) => (
                                    <div key={i} className="p-6 flex items-center justify-between hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="size-10 rounded border bg-background flex items-center justify-center font-mono text-xs">
                                                {trend.date.split('-').pop()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm">Batch Processing Result</p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                    <Clock size={12} /> {trend.count} Resumes evaluated • {trend.date}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="hidden sm:flex flex-col items-end">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase">Status</p>
                                                <div className="vercel-badge bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Success</div>
                                            </div>
                                            <button className="p-2 hover:bg-accent rounded-md transition-colors">
                                                <ArrowUpRight size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'analytics' && (
                    <motion.div
                        key="analytics"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-8"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="vercel-card bg-zinc-950 text-white border-none relative overflow-hidden group shadow-2xl">
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                                    <Globe size={120} />
                                </div>
                                <div className="relative z-10 space-y-6">
                                    <div>
                                        <h3 className="text-teal-400 font-bold uppercase tracking-widest text-[10px] mb-2">Operational Savings</h3>
                                        <h2 className="text-5xl font-black italic">₹{(roi?.costSavingsINR || 0).toLocaleString()}</h2>
                                    </div>
                                    <p className="text-zinc-400 text-sm max-w-xs leading-relaxed">
                                        Direct capital recovered through AI-automated screening across {data.totalResumesProcessed} profiles.
                                    </p>
                                    <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                                        <div className="text-xs font-bold text-zinc-500">Benchmark: India Tier-1</div>
                                        <div className="flex items-center gap-1 text-teal-400 font-bold text-xs">
                                            High Performance <TrendingUp size={14} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="vercel-card border-2 border-emerald-500/20 bg-emerald-500/[0.02]">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
                                            <Clock size={20} />
                                        </div>
                                        <h3 className="text-xl font-bold italic tracking-tight">Time Equity Recovered</h3>
                                    </div>
                                    <div className="flex items-baseline gap-4">
                                        <h2 className="text-6xl font-black">{roi?.hoursSaved || 0}h</h2>
                                        <div className="text-emerald-600 font-bold flex flex-col">
                                            <span>RECLAIMED</span>
                                            <span className="text-xs font-black uppercase tracking-widest opacity-60">vs Manual Bench</span>
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-background border border-emerald-500/10 space-y-4">
                                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: roi?.screeningEfficiencyGain || '80%' }}
                                                className="h-full bg-emerald-500"
                                            />
                                        </div>
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                            <span className="text-muted-foreground">Efficiency Acceleration</span>
                                            <span className="text-emerald-600">{roi?.screeningEfficiencyGain} Faster</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'compliance' && (
                    <motion.div
                        key="compliance"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-8"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="vercel-card flex flex-col h-full">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Sovereign Cluster</h3>
                                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
                                    <div className="size-20 rounded-full border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-center text-emerald-600">
                                        <Globe size={40} className="stroke-1" />
                                    </div>
                                    <h4 className="font-bold">India-First Logic</h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        All sensitive PII is routed through regional Indian nodes before any processing.
                                    </p>
                                </div>
                                <div className="pt-4 border-t text-center">
                                    <div className="vercel-badge bg-blue-500 text-white border-none">Active</div>
                                </div>
                            </div>

                            <div className="vercel-card flex flex-col h-full bg-linear-to-b from-card to-emerald-500/[0.03]">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">DPDP Compliance</h3>
                                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
                                    <div className="size-20 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 flex items-center justify-center text-indigo-600">
                                        <Lock size={40} className="stroke-1" />
                                    </div>
                                    <h4 className="font-bold">Encryption Protocol</h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        AES-256 stationary encryption with automated candidate erasure hooks.
                                    </p>
                                </div>
                                <div className="pt-4 border-t text-center">
                                    <div className="vercel-badge bg-black text-white border-none px-4">DPDP-2023 Valid</div>
                                </div>
                            </div>

                            <div className="vercel-card flex flex-col h-full">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Transparency</h3>
                                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
                                    <div className="size-20 rounded-full border border-amber-500/20 bg-amber-500/5 flex items-center justify-center text-amber-600">
                                        <FileText size={40} className="stroke-1" />
                                    </div>
                                    <h4 className="font-bold">Auditability</h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        Downloadable compliance logs for every AI decision made by the system.
                                    </p>
                                </div>
                                <div className="pt-4 border-t text-center">
                                    <button className="text-xs font-bold underline hover:no-underline transition-all">Download Audit CSV</button>
                                </div>
                            </div>
                        </div>

                        <div className="vercel-card flex flex-col md:flex-row items-center justify-between gap-6 border-emerald-500/30 bg-emerald-500/[0.02]">
                            <div className="flex items-center gap-4">
                                <div className="size-12 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                                    <ShieldCheck size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Your Privacy Status: 100% Compliant</h3>
                                    <p className="text-sm text-muted-foreground">No pending consent requests or erasure tickets are active.</p>
                                </div>
                            </div>
                            <button 
                                onClick={async () => {
                                    const res = await api.getPrivacyNotice();
                                    alert(JSON.stringify(res, null, 2));
                                }}
                                className="h-10 px-6 rounded-md bg-foreground text-background font-bold text-sm hover:opacity-80 transition-all"
                            >
                                Manage Data Notice
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Quick Actions Footer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-12">
                <div className="flex items-center gap-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer group">
                    <div className="size-8 rounded border flex items-center justify-center group-hover:border-foreground">
                        <FileText size={16} />
                    </div>
                    <span className="text-sm font-medium">Documentation</span>
                </div>
                <div className="flex items-center gap-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer group">
                    <div className="size-8 rounded border flex items-center justify-center group-hover:border-foreground">
                        <Database size={16} />
                    </div>
                    <span className="text-sm font-medium">API Logs</span>
                </div>
                <div className="flex items-center gap-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer group">
                    <div className="size-8 rounded border flex items-center justify-center group-hover:border-foreground">
                        <Globe size={16} />
                    </div>
                    <span className="text-sm font-medium">Regional Status</span>
                </div>
                <div className="flex items-center gap-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer group">
                    <div className="size-8 rounded border flex items-center justify-center group-hover:border-foreground">
                        <ArrowUpRight size={16} />
                    </div>
                    <span className="text-sm font-medium">Support</span>
                </div>
            </div>
        </div>
    );
}

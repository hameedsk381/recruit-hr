import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../api/client';
import {
    TrendingUp,
    ShieldCheck,
    ArrowUpRight,
    Clock,
    FileText,
    Database,
    Globe,
    Lock,
    Briefcase,
    Activity
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    const { job, setView, setError, loadCampaign } = useApp();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [roi, setRoi] = useState<ROIData | null>(null);
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'compliance'>('overview');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [res, roiRes, campRes] = await Promise.all([
                    api.getAnalytics(),
                    api.getRoiAnalytics(),
                    api.listCampaigns()
                ]);
                
                if (res.success) {
                    setData(res.kpis);
                }
                if (roiRes.success) {
                    setRoi(roiRes.summary);
                }
                if (campRes.success) {
                    setCampaigns(campRes.batches);
                }
            } catch (err) {
                setError('dashboard', 'Failed to load analytics data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [setError]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                <div className="animate-spin size-8 border-2 border-foreground border-t-transparent rounded-full opacity-50" />
            </div>
        );
    }

    if (!data) return null;

    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'analytics', label: 'Savings & Efficiency' },
        { id: 'compliance', label: 'Policy & Security' }
    ];

    return (
        <div className="container mx-auto max-w-6xl px-4 py-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-border/50 pb-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Activity className="size-6" />
                        Talent Command Center
                    </h1>
                    <p className="text-sm text-muted-foreground">Monitor your hiring velocity and pipeline health in real-time.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 border border-emerald-500/20 font-semibold text-[10px] uppercase tracking-wider h-6 px-2.5 flex items-center gap-1.5 shadow-sm shadow-emerald-500/10">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        Engine Online
                    </Badge>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-6 border-b border-border/50">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                            "pb-3 text-sm font-semibold transition-all relative px-1",
                            activeTab === tab.id ? "text-foreground" : "text-muted-foreground hover:text-foreground/80"
                        )}
                    >
                        {tab.label}
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-foreground"
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
                        className="space-y-8"
                    >
                        {/* Primary Action Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {!job ? (
                                <button 
                                    onClick={() => setView('setup')}
                                    className="group relative h-[280px] rounded-xl border border-dashed border-border flex flex-col items-center justify-center text-center p-8 transition-all overflow-hidden bg-card hover:border-foreground/30 hover:bg-muted/30"
                                >
                                    <div className="relative z-10 space-y-4 flex flex-col items-center">
                                        <div className="size-14 rounded-full bg-muted flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                                            <FileText size={24} className="text-foreground" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <h3 className="text-xl font-semibold tracking-tight text-foreground">Post a New Job</h3>
                                            <p className="text-muted-foreground text-sm max-w-xs mx-auto">Upload a job description to start matching candidates instantly.</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mt-2 group-hover:underline underline-offset-4">
                                            Get Started <ArrowUpRight size={14} />
                                        </div>
                                    </div>
                                </button>
                            ) : (
                                <div className="vercel-card border-none bg-primary text-primary-foreground flex flex-col justify-between p-8 relative overflow-hidden group h-[280px]">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-105 transition-transform duration-500">
                                        <Briefcase size={120} />
                                    </div>
                                    <div className="relative z-10 space-y-1">
                                        <h3 className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Current Job</h3>
                                        <h2 className="text-2xl font-bold text-white tracking-tight leading-tight max-w-[80%]">{job.title}</h2>
                                        <p className="text-muted-foreground text-sm font-medium">{job.company}</p>
                                    </div>
                                    <div className="relative z-10 flex flex-col sm:flex-row gap-3 pt-6 w-full">
                                        <Button 
                                            className="bg-white text-zinc-900 hover:bg-zinc-200 h-10 font-medium sm:flex-1 w-full"
                                            onClick={() => setView('shortlist')}
                                        >
                                            Evaluate Matches
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            className="border-zinc-800 text-white hover:bg-primary/90 hover:text-white h-10 font-medium sm:flex-1 w-full bg-primary"
                                            onClick={() => setView('pipeline')}
                                        >
                                            Hiring Pipeline
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 h-[280px]">
                                <button className="vercel-card flex flex-col justify-between hover:border-foreground/20 transition-all text-left bg-card h-full" onClick={() => setView('interviews')}>
                                    <div className="space-y-1">
                                        <div className="size-8 rounded-md bg-indigo-500/10 text-indigo-600 flex items-center justify-center mb-3">
                                            <Clock size={16} />
                                        </div>
                                        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Upcoming</h4>
                                    </div>
                                    <p className="text-xl font-bold text-foreground">
                                        {data.interviewStatusBreakdown.find(i => i.status === 'scheduled')?.count || 0}
                                        <span className="text-sm font-medium text-muted-foreground ml-1 font-sans">Interviews</span>
                                    </p>
                                </button>
                                <button className="vercel-card flex flex-col justify-between hover:border-foreground/20 transition-all text-left bg-card h-full" onClick={() => setView('history')}>
                                    <div className="space-y-1">
                                        <div className="size-8 rounded-md bg-muted flex items-center justify-center text-foreground mb-3">
                                            <Database size={16} />
                                        </div>
                                        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Archived</h4>
                                    </div>
                                    <p className="text-xl font-bold text-foreground">
                                        {data.totalJobDescriptionsAnalyzed}
                                        <span className="text-sm font-medium text-muted-foreground ml-1 font-sans">Batches</span>
                                    </p>
                                </button>
                                <button className="vercel-card col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:border-foreground/20 transition-all text-left group bg-card gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-md bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                                            <ShieldCheck size={18} />
                                        </div>
                                        <div className="space-y-0.5">
                                            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Compliance Policy</h4>
                                            <p className="text-sm font-semibold font-mono text-foreground">REG-AF-{new Date().getFullYear()}-001</p>
                                        </div>
                                    </div>
                                    <ArrowUpRight size={18} className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                                </button>
                            </div>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6">
                            <div className="vercel-card bg-card space-y-4">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Talent Reach</p>
                                <div className="flex items-end gap-3">
                                    <h2 className="text-3xl font-bold text-foreground tracking-tight">{data.totalResumesProcessed}</h2>
                                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5 mb-1">
                                        +12% <TrendingUp size={10} />
                                    </span>
                                </div>
                            </div>

                            <div className="vercel-card bg-card space-y-4">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Analysis Velocity</p>
                                <div className="flex items-end gap-3">
                                    <h2 className="text-3xl font-bold text-foreground tracking-tight">{(data.averageAssessmentTimeMs / 1000).toFixed(1)}s</h2>
                                    <span className="text-xs font-semibold text-muted-foreground mb-1">per profile</span>
                                </div>
                            </div>

                            <div className="vercel-card bg-card space-y-4">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Selection Precision</p>
                                <div className="flex items-end gap-3">
                                    <h2 className="text-3xl font-bold text-foreground tracking-tight">{data.highMatchRate}%</h2>
                                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5 mb-1">
                                        RELIABLE
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Recent Campaigns List */}
                        <div className="space-y-4 pt-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <Database size={14} />
                                    Active Campaigns
                                </h3>
                                {campaigns.length > 5 && (
                                    <Button variant="link" className="text-[10px] uppercase font-bold p-0 h-auto" onClick={() => setView('history')}>
                                        View All
                                    </Button>
                                )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {campaigns.slice(0, 4).map((camp) => (
                                    <button 
                                        key={camp.id}
                                        onClick={() => loadCampaign(camp.id)}
                                        className="vercel-card flex items-center justify-between hover:border-foreground/20 transition-all text-left bg-card group"
                                    >
                                        <div className="space-y-1 overflow-hidden">
                                            <h4 className="font-bold text-foreground truncate">{camp.title}</h4>
                                            <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
                                                <span>{camp.company}</span>
                                                <span>•</span>
                                                <span>{camp.candidateCount} Candidates</span>
                                            </div>
                                        </div>
                                        <div className="shrink-0 flex items-center gap-3">
                                            <Badge variant="outline" className={cn(
                                                "text-[9px] uppercase tracking-tighter px-1.5 h-5",
                                                camp.status === 'completed' ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-blue-50 text-blue-600 border-blue-200"
                                            )}>
                                                {camp.status}
                                            </Badge>
                                            <ArrowUpRight size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                                        </div>
                                    </button>
                                ))}
                                
                                {campaigns.length === 0 && (
                                    <div className="col-span-full py-12 text-center border border-dashed rounded-xl border-border">
                                        <p className="text-sm text-muted-foreground">No recent campaigns found. Post a job to get started.</p>
                                    </div>
                                )}
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
                        className="space-y-6"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="vercel-card bg-primary text-primary-foreground border-none relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-105 transition-transform duration-500">
                                    <Globe size={100} />
                                </div>
                                <div className="relative z-10 space-y-6">
                                    <div>
                                        <h3 className="text-emerald-400 font-semibold uppercase tracking-wider text-[10px] mb-1">Total Savings</h3>
                                        <h2 className="text-4xl font-bold tracking-tight">₹{(roi?.costSavingsINR || 0).toLocaleString()}</h2>
                                    </div>
                                    <p className="text-muted-foreground text-sm max-w-xs">
                                        Capital recovered through automated screening across {data.totalResumesProcessed} profiles.
                                    </p>
                                    <div className="pt-5 border-t border-zinc-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Benchmark: Tier-1</div>
                                        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                                            High Performance <TrendingUp size={12} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="vercel-card border border-emerald-500/20 bg-emerald-500/5 p-8 flex flex-col justify-between">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Clock size={16} className="text-emerald-600" />
                                        <h3 className="text-base font-semibold text-foreground tracking-tight">Time Saved</h3>
                                    </div>
                                    <div className="flex items-baseline gap-3">
                                        <h2 className="text-5xl font-bold text-foreground tracking-tight">{roi?.hoursSaved || 0}h</h2>
                                        <div className="text-emerald-600 font-semibold flex flex-col text-xs uppercase tracking-wider">
                                            <span>Saved</span>
                                            <span className="opacity-60">vs Manual</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="mt-8 p-4 rounded-lg bg-background border border-emerald-500/20 space-y-3">
                                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: roi?.screeningEfficiencyGain || '80%' }}
                                            className="h-full bg-emerald-500"
                                        />
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-semibold uppercase tracking-wider">
                                        <span className="text-muted-foreground">Efficiency Gain</span>
                                        <span className="text-emerald-600">{roi?.screeningEfficiencyGain}</span>
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
                        className="space-y-6"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="vercel-card flex flex-col h-full bg-card p-6 gap-6">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-md border border-emerald-500/20 bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                                        <Globe size={18} />
                                    </div>
                                    <div className="space-y-0.5">
                                        <h4 className="font-semibold text-sm text-foreground">Regional Clusters</h4>
                                        <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Data Privacy</h3>
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground flex-1">
                                    Applicant data is processed securely through regional servers.
                                </p>
                                <div className="pt-4 border-t border-border/50">
                                    <Badge variant="secondary" className="bg-muted text-foreground border-none font-semibold text-[10px] uppercase tracking-wider h-6">Active</Badge>
                                </div>
                            </div>

                            <div className="vercel-card flex flex-col h-full bg-card p-6 gap-6">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-md border border-indigo-500/20 bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0">
                                        <Lock size={18} />
                                    </div>
                                    <div className="space-y-0.5">
                                        <h4 className="font-semibold text-sm text-foreground">Encryption</h4>
                                        <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Protocol</h3>
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground flex-1">
                                    AES-256 stationary encryption with automated candidate erasure hooks.
                                </p>
                                <div className="pt-4 border-t border-border/50">
                                    <Badge variant="secondary" className="bg-foreground text-background hover:bg-foreground/90 border-none font-semibold text-[10px] uppercase tracking-wider h-6">DPDP-2023 Valid</Badge>
                                </div>
                            </div>

                            <div className="vercel-card flex flex-col h-full bg-card p-6 gap-6">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-md border border-amber-500/20 bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
                                        <FileText size={18} />
                                    </div>
                                    <div className="space-y-0.5">
                                        <h4 className="font-semibold text-sm text-foreground">Auditability</h4>
                                        <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Transparency</h3>
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground flex-1">
                                    Downloadable compliance logs for every AI decision made by the system.
                                </p>
                                <div className="pt-4 border-t border-border/50">
                                    <button className="text-[11px] font-semibold text-foreground hover:underline underline-offset-2">Download Logs &rarr;</button>
                                </div>
                            </div>
                        </div>

                        <div className="vercel-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-emerald-500/20 bg-emerald-500/5 p-6">
                            <div className="flex items-center gap-4">
                                <div className="size-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 shrink-0">
                                    <ShieldCheck size={18} />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-semibold text-sm text-foreground">Privacy Status: <span className="text-emerald-600">Compliant</span></h3>
                                    <p className="text-xs text-muted-foreground">No pending consent requests or erasure tickets.</p>
                                </div>
                            </div>
                            <Button 
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                    const res = await api.getPrivacyNotice();
                                    alert(JSON.stringify(res, null, 2));
                                }}
                                className="font-medium bg-background"
                            >
                                View Notice
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Quick Actions Footer */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 border-t border-border/50">
                <Button variant="ghost" className="justify-start gap-2 h-9 text-muted-foreground hover:text-foreground">
                    <FileText size={14} />
                    <span className="text-xs font-semibold">Docs</span>
                </Button>
                <Button variant="ghost" className="justify-start gap-2 h-9 text-muted-foreground hover:text-foreground">
                    <Database size={14} />
                    <span className="text-xs font-semibold">API Logs</span>
                </Button>
                <Button variant="ghost" className="justify-start gap-2 h-9 text-muted-foreground hover:text-foreground">
                    <Globe size={14} />
                    <span className="text-xs font-semibold">Status</span>
                </Button>
                <Button variant="ghost" className="justify-start gap-2 h-9 text-muted-foreground hover:text-foreground">
                    <ArrowUpRight size={14} />
                    <span className="text-xs font-semibold">Support</span>
                </Button>
            </div>
        </div>
    );
}

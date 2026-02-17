import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../api/client';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
    Users,
    TrendingUp,
    BarChart3,
    Activity,
    Briefcase,
    Zap,
    MousePointerClick,
    Target
} from 'lucide-react';
import { motion } from 'framer-motion';
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

export default function Dashboard() {
    const { setError } = useApp();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await api.getAnalytics();
                if (res.success) {
                    setData(res.kpis);
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
            <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6">
                <div className="relative size-20">
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                    <div className="relative h-full w-full rounded-2xl bg-muted animate-spin border-2 border-primary border-t-transparent" />
                </div>
                <p className="text-muted-foreground font-medium animate-pulse">Synchronizing cluster data...</p>
            </div>
        );
    }

    if (!data) return null;

    const stats = [
        {
            title: "Pipeline Depth",
            value: data.totalResumesProcessed,
            icon: Users,
            description: "Total candidates screened",
            color: "text-blue-500",
            bg: "bg-blue-500/10"
        },
        {
            title: "AI Response",
            value: `${(data.averageAssessmentTimeMs / 1000).toFixed(1)}s`,
            icon: Zap,
            description: "Mean inference latency",
            color: "text-amber-500",
            bg: "bg-amber-500/10"
        },
        {
            title: "Accuracy Yield",
            value: `${data.highMatchRate}%`,
            icon: Target,
            description: "High-confidence fits",
            color: "text-emerald-500",
            bg: "bg-emerald-500/10"
        },
        {
            title: "Active Bench",
            value: data.totalJobDescriptionsAnalyzed,
            icon: Briefcase,
            description: "Roles under evaluation",
            color: "text-indigo-500",
            bg: "bg-indigo-500/10"
        }
    ];

    return (
        <div className="space-y-12 pb-20">
            {/* Hero Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <Card className="border bg-card/40 backdrop-blur-md rounded-3xl overflow-hidden group hover:border-primary/30 transition-all duration-500">
                            <CardContent className="p-8 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className={cn("p-3 rounded-2xl", stat.bg)}>
                                        <stat.icon size={22} className={stat.color} />
                                    </div>
                                    <div className="flex items-center gap-1 text-[11px] font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-full">
                                        +14% <TrendingUp size={12} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-4xl font-extrabold tracking-tight group-hover:text-primary transition-colors">{stat.value}</h2>
                                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{stat.title}</p>
                                </div>
                                <p className="text-xs text-muted-foreground/60">{stat.description}</p>
                            </CardContent>
                            <div className="h-1 w-full bg-linear-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Main Visualizations */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Processing Trends Chart Alternative */}
                <Card className="lg:col-span-2 rounded-[2.5rem] border bg-card/30 backdrop-blur-md overflow-hidden premium-shadow">
                    <CardHeader className="p-8 pb-0">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">
                                    <BarChart3 size={20} />
                                </div>
                                <h3 className="text-xl font-bold">Resourcing Velocity</h3>
                            </div>
                            <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-xl border border-white/5">
                                <button className="px-3 py-1 text-[11px] font-bold uppercase rounded-lg bg-background text-primary shadow-sm hover:cursor-pointer transition-all">Volume</button>
                                <button className="px-3 py-1 text-[11px] font-bold uppercase rounded-lg text-muted-foreground hover:cursor-pointer hover:text-foreground transition-all">Quality</button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[350px] p-10 pt-16 flex items-end justify-between gap-6">
                        {data.recentBatchTrends.map((trend, i) => {
                            const max = Math.max(...data.recentBatchTrends.map(t => t.count), 1);
                            const height = (trend.count / max) * 100;
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-4 group h-full">
                                    <div className="flex-1 w-full flex items-end relative">
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: `${height}%` }}
                                            transition={{ duration: 1, delay: i * 0.05, ease: "circOut" }}
                                            className="w-full bg-linear-to-t from-primary/80 to-primary rounded-2xl shadow-xl shadow-primary/10 relative group-hover:from-indigo-600 group-hover:to-primary group-hover:shadow-primary/30 transition-all cursor-crosshair"
                                        >
                                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] font-bold px-2 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-110 pointer-events-none">
                                                {trend.count} Resumes
                                            </div>
                                        </motion.div>
                                    </div>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest -rotate-45 sm:rotate-0 whitespace-nowrap">
                                        {trend.date.split('-').slice(1).join('/') || trend.date}
                                    </span>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                {/* Right Panel: Funnel Distribution */}
                <Card className="rounded-[2.5rem] border bg-card/30 backdrop-blur-md flex flex-col">
                    <CardHeader className="p-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">
                                <Activity size={20} />
                            </div>
                            <h3 className="text-xl font-bold">Hiring Health</h3>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-8 pt-0 space-y-10">
                        <div className="space-y-6">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">Efficiency Signals</h4>
                            <div className="space-y-6">
                                {[
                                    { label: 'Screening Precision', val: data.highMatchRate, color: 'bg-emerald-500' },
                                    { label: 'Time-to-Hire Index', val: 78, color: 'bg-blue-500' },
                                    { label: 'Interviewer Consistency', val: 92, color: 'bg-indigo-500' }
                                ].map((bar, i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between text-xs font-bold uppercase">
                                            <span>{bar.label}</span>
                                            <span className="text-foreground">{bar.val}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${bar.val}%` }}
                                                transition={{ duration: 1.5, delay: 0.5 }}
                                                className={cn("h-full rounded-full shadow-lg", bar.color)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-8 border-t border-dashed space-y-6">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">System Diagnostics</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-5 rounded-3xl bg-primary/5 border border-primary/10 space-y-1">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Availability</p>
                                    <p className="text-xl font-black text-primary">99.98%</p>
                                </div>
                                <div className="p-5 rounded-3xl bg-muted/30 border border-white/5 space-y-1">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">AI Latency</p>
                                    <p className="text-xl font-black">124ms</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Row: Scorecard Category Intelligence */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="rounded-[2.5rem] border bg-gradient-to-br from-card/40 to-muted/20 backdrop-blur-md">
                    <CardHeader className="p-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">
                                <MousePointerClick size={20} />
                            </div>
                            <h3 className="text-xl font-bold">Category Competency</h3>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 grid sm:grid-cols-2 gap-8">
                        {data.averageCategoryScores.length > 0 ? (
                            data.averageCategoryScores.map((score, i) => (
                                <div key={i} className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-bold text-muted-foreground uppercase tracking-tight">{score.category}</span>
                                        <span className="font-black text-primary">{score.average.toFixed(1)}/5</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden flex gap-1">
                                        {[1, 2, 3, 4, 5].map((step) => (
                                            <div
                                                key={step}
                                                className={cn(
                                                    "h-full flex-1 rounded-full transition-all duration-700",
                                                    step <= score.average ? "bg-primary shadow-[0_0_10px_rgba(99,102,241,0.3)]" : "bg-muted-foreground/10"
                                                )}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-2 text-center py-12 text-muted-foreground/40 italic flex flex-col items-center gap-3">
                                <Activity size={40} className="stroke-1" />
                                <p>Intelligence data will populate after scorecard submission.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="rounded-[2.5rem] border bg-linear-to-br from-primary/10 via-card/50 to-background/50 overflow-hidden relative">
                    <CardHeader className="p-8 pb-4">
                        <h3 className="text-xl font-bold flex items-center gap-3">
                            <Activity size={20} className="text-primary" />
                            Active Stream
                        </h3>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="px-8 pb-8 space-y-4">
                            {[1, 2, 3].map((_, i) => (
                                <div key={i} className="flex gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors group">
                                    <div className="size-3 mt-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold flex items-center gap-2">
                                            AI Assessment Complete
                                            <span className="text-[10px] text-muted-foreground font-normal">{(i + 1) * 2}m ago</span>
                                        </p>
                                        <p className="text-xs text-muted-foreground">Successfully processed a batch of 12 resumes for the Senior Eng round.</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}



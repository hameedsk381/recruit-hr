
import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  Filter, 
  Calendar, 
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function Reports() {
    const [selectedMetric, setSelectedMetric] = useState('time_to_fill');

    const metrics = [
        { id: 'time_to_fill', name: 'Time to Fill', value: '18 Days', trend: -12, desc: 'Average time from requisition to offer acceptance.' },
        { id: 'pass_rate', name: 'Shortlist Pass Rate', value: '42%', trend: 8, desc: 'Percentage of candidates passed by Hiring Managers.' },
        { id: 'cost_per_hire', name: 'Cost per Hire', value: '$2,480', trend: 5, desc: 'Blended cost including sourcing and platform fees.' },
        { id: 'diversity_ratio', name: 'Diversity Ratio', value: '38%', trend: 15, desc: 'Representation in the top-of-funnel pipeline.' }
    ];

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Intelligence & Analytics</h1>
                    <p className="text-muted-foreground mt-1">Cross-tenant performance metrics and AI-driven pipeline insights.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="gap-2">
                        <Filter size={16} />
                        Filter
                    </Button>
                    <Button variant="outline" className="gap-2">
                        <Download size={16} />
                        Export
                    </Button>
                    <Button className="gap-2 shadow-lg shadow-primary/20">
                        <Sparkles size={16} />
                        AI Narrative
                    </Button>
                </div>
            </div>

            {/* Metric Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.map((m) => (
                    <motion.button
                        key={m.id}
                        whileHover={{ y: -4 }}
                        onClick={() => setSelectedMetric(m.id)}
                        className={`vercel-card p-6 text-left transition-all ${selectedMetric === m.id ? 'border-primary ring-1 ring-primary/20 bg-primary/[0.02]' : 'hover:border-primary/30'}`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">{m.name}</p>
                            <div className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${m.trend < 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                {m.trend < 0 ? <ArrowDownRight size={10} /> : <ArrowUpRight size={10} />}
                                {Math.abs(m.trend)}%
                            </div>
                        </div>
                        <p className="text-3xl font-bold">{m.value}</p>
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-1">{m.desc}</p>
                    </motion.button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main chart area */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="vercel-card p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-lg font-bold">Trend Analysis</h3>
                                <p className="text-xs text-muted-foreground">Historical performance vs last quarter</p>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-medium bg-muted/50 p-1 rounded-lg border">
                                <button className="px-3 py-1.5 rounded-md bg-background shadow-sm border">7D</button>
                                <button className="px-3 py-1.5 rounded-md hover:bg-background/50">30D</button>
                                <button className="px-3 py-1.5 rounded-md hover:bg-background/50">90D</button>
                            </div>
                        </div>
                        
                        {/* Chart Placeholder */}
                        <div className="w-full aspect-video bg-muted/20 border-dashed rounded-xl flex items-end justify-between px-8 py-4 overflow-hidden relative group">
                            <div className="absolute inset-0 subtle-grid opacity-10" />
                            {[30, 45, 25, 60, 40, 80, 55, 90, 70, 85, 45, 60].map((h, i) => (
                                <motion.div 
                                    key={i}
                                    initial={{ height: 0 }}
                                    animate={{ height: `${h}%` }}
                                    className="w-full max-w-[12px] bg-primary/20 rounded-t-sm group-hover:bg-primary/40 transition-colors"
                                />
                            ))}
                            <div className="absolute top-1/2 left-0 right-0 h-px border-t border-dashed opacity-20" />
                        </div>

                        <div className="flex items-center justify-between mt-8">
                            <div className="flex items-center gap-8">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Peak Performance</p>
                                    <p className="text-sm font-bold">Jan 12 — Jan 18</p>
                                </div>
                                <div className="h-8 w-px bg-border" />
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Bottleneck Stage</p>
                                    <p className="text-sm font-bold text-amber-500">Technical Interview</p>
                                </div>
                            </div>
                            <Button variant="ghost" className="gap-2 text-xs">
                                View Full Table
                                <ChevronRight size={14} />
                            </Button>
                        </div>
                    </div>

                    {/* Breakdown by Dimension */}
                    <div className="vercel-card p-8">
                        <h3 className="text-sm font-bold uppercase tracking-widest mb-6 border-b pb-4">Efficiency by Department</h3>
                        <div className="space-y-4">
                            {[
                                { name: 'Engineering', value: 85, color: 'bg-emerald-500' },
                                { name: 'Product', value: 64, color: 'bg-blue-500' },
                                { name: 'Design', value: 92, color: 'bg-purple-500' },
                                { name: 'Marketing', value: 48, color: 'bg-amber-500' }
                            ].map((d, i) => (
                                <div key={i} className="space-y-1.5">
                                    <div className="flex justify-between text-xs font-medium">
                                        <span className="text-foreground">{d.name}</span>
                                        <span className="text-muted-foreground">{d.value}%</span>
                                    </div>
                                    <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${d.value}%` }}
                                            className={`h-full ${d.color}`}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar Analytics */}
                <div className="space-y-8">
                    {/* AI Insights Card */}
                    <div className="vercel-card p-6 bg-primary/[0.03] border-primary/20 border-dashed relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12 group-hover:rotate-45 transition-transform">
                            <Sparkles size={100} className="text-primary" />
                        </div>
                        
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="size-6 rounded-md bg-primary/20 flex items-center justify-center">
                                    <Sparkles size={12} className="text-primary" />
                                </div>
                                <h3 className="text-xs font-bold uppercase tracking-widest">AI Narrator Insight</h3>
                            </div>
                            
                            <div className="space-y-4 text-sm">
                                <p className="leading-relaxed">
                                    Your <span className="font-bold text-foreground">Time to Fill</span> for technical roles has decreased by 4 days this month. 
                                </p>
                                <div className="p-3 rounded-lg bg-background/50 border shadow-sm space-y-2">
                                    <p className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                                        <ArrowUpRight size={12} />
                                        KEY DRIVER
                                    </p>
                                    <p className="text-[12px] text-muted-foreground italic">
                                        "Automated LinkedIn screening is filtering out 40% of unqualified applicants before manual review."
                                    </p>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Recommendation: Increase "Mandatory Skill" weight for Product Designer role.
                                </p>
                            </div>
                            
                            <Button variant="link" className="p-0 h-auto text-xs mt-6 text-primary group-hover:underline">
                                Request Deep-Dive Analysis
                            </Button>
                        </div>
                    </div>

                    {/* Recent Reports / Downloads */}
                    <div className="vercel-card p-6">
                        <h3 className="text-xs font-bold uppercase tracking-widest mb-4">Scheduled Reports</h3>
                        <div className="space-y-3">
                            {[
                                { name: 'Weekly Pipeline Summary', date: 'Next: Monday', icon: <Calendar /> },
                                { name: 'Diversity Compliance Q2', date: 'Next: July 1st', icon: <TrendingUp /> },
                                { name: 'Recruiter Performance', date: 'Manual Run only', icon: <BarChart3 /> }
                            ].map((r, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="size-8 rounded bg-muted flex items-center justify-center text-muted-foreground">
                                            {React.cloneElement(r.icon as React.ReactElement<any>, { size: 14 })}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold">{r.name}</p>
                                            <p className="text-[10px] text-muted-foreground">{r.date}</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100">
                                        <Download size={12} />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <Button variant="outline" className="w-full mt-4 text-xs">Manage Schedules</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

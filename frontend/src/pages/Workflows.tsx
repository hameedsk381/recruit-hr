
import React, { useState, useEffect } from 'react';
import { 
  GitBranch, 
  Plus, 
  Settings2, 
  Bell, 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  Play, 
  Trash2,
  Clock,
  MoreVertical,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient } from '../api/client';

export default function Workflows() {
    const [workflows, setWorkflows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadWorkflows();
    }, []);

    const loadWorkflows = async () => {
        try {
            const data = await apiClient.get<{ workflows: any[] }>('/v1/workflows');
            setWorkflows(data.workflows || []);
        } catch (error) {
            console.error('Failed to load workflows:', error);
        } finally {
            setLoading(false);
        }
    };


    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="size-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
    );

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Workflow Automation</h1>
                    <p className="text-muted-foreground mt-1">Design and automate your recruitment operations with visual workflows.</p>
                </div>
                <Button className="gap-2 shadow-lg shadow-primary/20">
                    <Plus size={16} />
                    Create Workflow
                </Button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Active Automations', value: workflows.filter(w => w.isActive).length, icon: <Activity className="text-emerald-500" /> },
                    { label: 'Total Executions (24h)', value: '1,284', icon: <Zap className="text-amber-500" /> },
                    { label: 'Success Rate', value: '99.8%', icon: <CheckCircle2 className="text-blue-500" /> }
                ].map((stat, i) => (
                    <div key={i} className="vercel-card p-6 flex items-center justify-between group">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">{stat.label}</p>
                            <p className="text-2xl font-bold mt-1">{stat.value}</p>
                        </div>
                        <div className="size-10 rounded-full bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                            {React.cloneElement(stat.icon as React.ReactElement<any>, { size: 20 })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Workflow List */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <GitBranch size={16} className="text-primary" />
                    <h2 className="text-sm font-bold uppercase tracking-widest">Your Workflows</h2>
                </div>

                {workflows.length === 0 ? (
                    <div className="vercel-card p-12 text-center border-dashed">
                        <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                            <Zap className="text-muted-foreground" size={24} />
                        </div>
                        <h3 className="text-lg font-bold">No workflows defined yet</h3>
                        <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-2">
                            Automate approvals, notifications, and candidate handoffs with a no-code visual builder.
                        </p>
                        <Button variant="outline" className="mt-6 gap-2">
                            <Plus size={16} />
                            Create your first automation
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {workflows.map((w) => (
                            <div key={w._id} className="vercel-card p-6 group hover:border-primary/30 transition-all cursor-pointer">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`size-10 rounded-lg flex items-center justify-center ${w.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                                            <Play size={18} fill={w.isActive ? "currentColor" : "none"} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold flex items-center gap-2">
                                                {w.name}
                                                {!w.isActive && <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">PAUSED</span>}
                                            </h3>
                                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Zap size={12} className="text-primary" />
                                                    Trigger: <span className="text-foreground font-medium">{w.trigger.replace('_', ' ')}</span>
                                                </span>
                                                <span className="h-1 w-1 rounded-full bg-border" />
                                                <span className="flex items-center gap-1">
                                                    <ArrowRight size={12} />
                                                    {w.nodes.length} Steps
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="size-8">
                                            <Settings2 size={14} />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="size-8 text-destructive hover:bg-destructive/10">
                                            <Trash2 size={14} />
                                        </Button>
                                        <div className="h-6 w-px bg-border mx-1" />
                                        <Button variant="ghost" size="icon" className="size-8">
                                            <MoreVertical size={14} />
                                        </Button>
                                    </div>
                                </div>

                                {/* Summary of Steps */}
                                <div className="mt-6 pt-6 border-t flex items-center gap-3 overflow-x-auto no-scrollbar">
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 text-xs font-medium border whitespace-nowrap">
                                        <Bell size={12} className="text-blue-500" />
                                        Notification: HM
                                    </div>
                                    <ArrowRight size={12} className="text-muted-foreground" />
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 text-xs font-medium border whitespace-nowrap">
                                        <Clock size={12} className="text-amber-500" />
                                        Delay: 48h
                                    </div>
                                    <ArrowRight size={12} className="text-muted-foreground" />
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 text-xs font-medium border whitespace-nowrap">
                                        <Zap size={12} className="text-emerald-500" />
                                        Action: Escalate
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Visual Builder Placeholder */}
            {workflows.length > 0 && (
                <div className="vercel-card p-1 text-center bg-muted/20 border-dashed">
                    <div className="p-8">
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/40 mb-4 font-mono">Workflow DAG Visualization Canvas</p>
                        <div className="w-full aspect-[21/9] bg-background/50 rounded-xl relative overflow-hidden flex items-center justify-center">
                            <div className="absolute inset-0 subtle-grid opacity-20" />
                            <div className="relative z-10 flex flex-col items-center gap-4">
                                <Button variant="secondary" className="rounded-full shadow-lg">Open Canvas Editor</Button>
                                <p className="text-xs text-muted-foreground">Select a workflow above to edit its logical structure</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

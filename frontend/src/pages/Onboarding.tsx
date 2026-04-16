
import React, { useState } from 'react';
import { 
  Calendar, 
  CheckCircle2, 
  ArrowRight,
  Monitor,
  FileText,
  Users2,
  ShieldCheck,
  ChevronRight,
  MoreVertical,
  Mail,
  Slack
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function Onboarding() {
    const [view, setView] = useState<'active' | 'pending' | 'completed'>('active');

    const hires = [
        {
            id: '1',
            name: 'Sarah Chen',
            role: 'Sr. Product Designer',
            startDate: 'May 1, 2026',
            status: 'preboarding',
            progress: 65,
            manager: 'Alex Rivera',
            tasks: [
                { id: '1', title: 'IT Setup: Laptop Allocation', status: 'completed', icon: <Monitor /> },
                { id: '2', title: 'Sign NDAs & Policy Docs', status: 'completed', icon: <ShieldCheck /> },
                { id: '3', title: 'Intro to Design Team', status: 'pending', icon: <Users2 /> },
                { id: '4', title: 'Initial Sprint Planning', status: 'pending', icon: <FileText /> }
            ]
        },
        {
            id: '2',
            name: 'David Miller',
            role: 'DevOps Engineer',
            startDate: 'May 15, 2026',
            status: 'offer_accepted',
            progress: 25,
            manager: 'Jordan Smith',
            tasks: [
                { id: '1', title: 'VBGV Status Check', status: 'completed', icon: <ShieldCheck /> },
                { id: '2', title: 'Background Verification', status: 'pending', icon: <ShieldCheck /> }
            ]
        }
    ];

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Onboarding & Handoff</h1>
                    <p className="text-muted-foreground mt-1">Seamless transition from candidate to productive employee.</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold bg-muted/50 p-1 rounded-xl border">
                    <button 
                        onClick={() => setView('active')}
                        className={`px-4 py-2 rounded-lg transition-all ${view === 'active' ? 'bg-background shadow-sm border' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        ACTIVE (8)
                    </button>
                    <button 
                        onClick={() => setView('pending')}
                        className={`px-4 py-2 rounded-lg transition-all ${view === 'pending' ? 'bg-background shadow-sm border' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        PENDING (12)
                    </button>
                    <button 
                        onClick={() => setView('completed')}
                        className={`px-4 py-2 rounded-lg transition-all ${view === 'completed' ? 'bg-background shadow-sm border' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        COMPLETED
                    </button>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-6">
                {hires.map((hire) => (
                    <motion.div 
                        key={hire.id}
                        layout
                        className="vercel-card overflow-hidden group hover:border-primary/20 transition-all border-dashed"
                    >
                        <div className="p-8">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                                {/* Profile Summary */}
                                <div className="flex items-center gap-6">
                                    <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl border border-primary/20">
                                        {hire.name[0]}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold flex items-center gap-2">
                                            {hire.name}
                                            <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase tracking-tighter">New Hire</span>
                                        </h3>
                                        <p className="text-sm font-medium text-muted-foreground">{hire.role}</p>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground/60">
                                            <span className="flex items-center gap-1.5 font-bold text-foreground/80">
                                                <Calendar size={12} className="text-primary" />
                                                Starts {hire.startDate}
                                            </span>
                                            <span className="h-1 w-1 rounded-full bg-border" />
                                            <span className="flex items-center gap-1.5 uppercase tracking-widest">
                                                Manager: {hire.manager}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Progress & Actions */}
                                <div className="flex flex-col md:flex-row items-center gap-8 md:min-w-[400px]">
                                    <div className="flex-1 w-full space-y-2">
                                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                            <span>Onboarding Progress</span>
                                            <span className="text-primary">{hire.progress}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${hire.progress}%` }}
                                                className="h-full bg-primary relative"
                                            >
                                                <div className="absolute top-0 right-0 h-full w-2 bg-white/20 blur-[1px]" />
                                            </motion.div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" className="gap-2 h-9 px-4">
                                            <Mail size={14} />
                                            Ping
                                        </Button>
                                        <Button size="sm" className="gap-2 h-9 px-4 shadow-lg shadow-primary/10">
                                            <ArrowRight size={14} />
                                            Details
                                        </Button>
                                        <Button variant="ghost" size="icon" className="size-9 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <MoreVertical size={16} />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Task Breakdown Preview */}
                            <div className="mt-8 pt-8 border-t grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {hire.tasks.map((task, i) => (
                                    <div key={i} className={`p-4 rounded-xl border flex items-center gap-4 transition-all ${task.status === 'completed' ? 'bg-muted/30 border-muted opacity-60' : 'bg-background hover:border-primary/30 shadow-sm'}`}>
                                        <div className={`size-10 rounded-lg flex items-center justify-center ${task.status === 'completed' ? 'text-emerald-500' : 'text-primary bg-primary/10'}`}>
                                            {task.status === 'completed' ? <CheckCircle2 size={18} /> : React.cloneElement(task.icon as React.ReactElement<any>, { size: 18 })}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold truncate">{task.title}</p>
                                            <p className={`text-[10px] uppercase tracking-widest mt-0.5 ${task.status === 'completed' ? 'text-emerald-500 font-bold' : 'text-muted-foreground'}`}>
                                                {task.status}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <button className="p-4 rounded-xl border border-dashed border-muted flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary hover:border-primary/30 transition-all hover:bg-primary/[0.02]">
                                    <Users2 size={14} />
                                    +{hire.tasks.length > 4 ? hire.tasks.length - 4 : 5} More Tasks
                                </button>
                            </div>
                        </div>

                        {/* Banner Footer */}
                        <div className="bg-muted/30 px-8 py-3 flex items-center justify-between border-t border-dashed">
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                    <Slack size={12} className="text-[#4A154B]" />
                                    Slack Channel Created
                                </span>
                                <span className="h-3 w-px bg-border" />
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                    <Monitor size={12} />
                                    Laptop Shipped (Track: 1Z204X...)
                                </span>
                            </div>
                            <Button variant="ghost" className="h-6 text-[10px] font-bold uppercase tracking-widest p-0 flex items-center gap-2">
                                Go to Onboarding Hub
                                <ChevronRight size={12} />
                            </Button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Automation Banner */}
            <div className="vercel-card p-6 bg-emerald-500/5 border-emerald-500/20 border-dashed flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="size-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold">Smart Onboarding Active</h4>
                        <p className="text-xs text-muted-foreground">AI is automatically monitoring task deadlines and triggering nudges for pending manager approvals.</p>
                    </div>
                </div>
                <Button variant="outline" size="sm" className="text-xs border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/10 font-bold uppercase tracking-widest">
                    Configure Rules
                </Button>
            </div>
        </div>
    );
}

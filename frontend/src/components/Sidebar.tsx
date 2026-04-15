import { useApp } from '../context/AppContext';
import { ClipboardList, Users, Cpu, LayoutDashboard, Calendar, Columns, Settings, LogOut, Clock, Sparkles } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';

export default function Sidebar() {
    const { currentView, sidebarOpen, setView, job, user, logout } = useApp();

    const isHM = user?.role === 'hiring_manager';

    const menuItems = [
        { id: 'dashboard', label: isHM ? 'My Candidates' : 'Dashboard', icon: LayoutDashboard, category: 'Main' },
        { id: 'history', label: 'Search History', icon: Clock, category: 'Main' },
        { id: 'setup', label: 'Job Setup', icon: ClipboardList, category: 'Pipeline', check: !!job, hidden: isHM },
        { id: 'shortlist', label: 'Shortlist', icon: Users, category: 'Pipeline', disabled: !job, hidden: isHM },
        { id: 'pipeline', label: 'Kanban Board', icon: Columns, category: 'Pipeline', disabled: !job, hidden: isHM },
        { id: 'interviews', label: 'Interviews', icon: Calendar, category: 'Pipeline', disabled: !job, hidden: isHM },
    ];

    const visibleCategories = isHM ? ['Main'] : ['Main', 'Pipeline'];

    return (
        <aside className={cn(
            "fixed inset-y-0 left-0 z-40 w-64 border-r bg-background transition-all duration-300 lg:static lg:block",
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}>
            <div className="flex h-full flex-col">
                {/* Branding */}
                <div className="flex h-16 items-center px-6 border-b">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-zinc-950 text-white shadow-lg">
                            <Sparkles size={18} />
                        </div>
                        <span className="text-lg font-black tracking-tighter uppercase whitespace-nowrap">Recrkuit Pro</span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
                    {visibleCategories.map((category) => (
                        <div key={category} className="space-y-1">
                            <h3 className="px-3 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                                {category}
                            </h3>
                            <div className="space-y-1">
                                {menuItems.filter(item => item.category === category && !item.hidden).map((item) => {
                                    const isActive = currentView === item.id || (item.id === 'shortlist' && currentView === 'detail');
                                    const Icon = item.icon;

                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => !item.disabled && setView(item.id as any)}
                                            className={cn(
                                                "group relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-bold transition-all",
                                                isActive
                                                    ? "bg-muted text-foreground"
                                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                                                item.disabled && "opacity-30 cursor-not-allowed"
                                            )}
                                            disabled={item.disabled}
                                        >
                                            <Icon size={16} className={cn("relative z-10 transition-colors", isActive ? "text-zinc-950" : "group-hover:text-zinc-950")} />
                                            <span className="relative z-10">{item.label}</span>
                                            {item.check && (
                                                <div className="ml-auto relative z-10 size-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* User Context */}
                <div className="p-4 border-t">
                    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors cursor-pointer group" onClick={() => setView('profile')}>
                        <div className="size-8 rounded-full bg-zinc-950 text-white flex items-center justify-center font-bold text-xs">
                            {user?.name?.charAt(0) || 'R'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate">{user?.name || 'Recruiter'}</p>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-tight">Enterprise</p>
                        </div>
                        <Settings size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </div>

                <div className="px-4 pb-4">
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 h-10 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md"
                        onClick={logout}
                    >
                        <LogOut size={14} />
                        <span className="text-xs font-bold uppercase tracking-widest">Sign Out</span>
                    </Button>
                </div>
            </div>
        </aside>
    );
}

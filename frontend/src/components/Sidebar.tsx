import { useApp } from '../context/AppContext';
import { ClipboardList, Users, Cpu, LayoutDashboard, Calendar, Columns, Settings, LogOut, User } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';

export default function Sidebar() {
    const { currentView, sidebarOpen, setView, job, user, logout } = useApp();

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'Main' },
        { id: 'setup', label: 'Job Setup', icon: ClipboardList, category: 'Pipeline', check: !!job },
        { id: 'shortlist', label: 'Shortlist', icon: Users, category: 'Pipeline', disabled: !job },
        { id: 'pipeline', label: 'Kanban Board', icon: Columns, category: 'Pipeline', disabled: !job },
        { id: 'interviews', label: 'Interviews', icon: Calendar, category: 'Pipeline', disabled: !job },
    ];

    return (
        <aside className={cn(
            "fixed inset-y-0 left-0 z-40 w-72 border-r bg-background/80 backdrop-blur-xl transition-all duration-300 lg:static lg:block",
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}>
            <div className="flex h-full flex-col">
                {/* Branding */}
                <div className="flex h-20 items-center px-8 border-b">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                            <Cpu size={22} strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-black tracking-tight text-foreground uppercase">Recruiter Intelligence</span>
                            <span className="text-[10px] font-bold text-primary tracking-widest leading-none uppercase">AI Copilot Core</span>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-8 px-4 space-y-8">
                    {['Main', 'Pipeline'].map((category) => (
                        <div key={category} className="space-y-2">
                            <h3 className="px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                                {category}
                            </h3>
                            <div className="space-y-1">
                                {menuItems.filter(item => item.category === category).map((item) => {
                                    const isActive = currentView === item.id || (item.id === 'shortlist' && currentView === 'detail');
                                    const Icon = item.icon;

                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => !item.disabled && setView(item.id as any)}
                                            className={cn(
                                                "group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                                                isActive
                                                    ? "text-primary"
                                                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                                item.disabled && "opacity-40 cursor-not-allowed"
                                            )}
                                            disabled={item.disabled}
                                        >
                                            {isActive && (
                                                <motion.div
                                                    layoutId="active-pill"
                                                    className="absolute inset-0 rounded-xl bg-primary/10 border border-primary/20"
                                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                />
                                            )}
                                            <Icon size={18} className={cn("relative z-10 transition-colors", isActive ? "text-primary" : "group-hover:text-foreground")} />
                                            <span className="relative z-10">{item.label}</span>

                                            {item.check && (
                                                <div className="ml-auto relative z-10 size-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Footer / Profile */}
                <div className="p-4 border-t bg-muted/30">
                    <div className="flex items-center gap-3 p-3 rounded-2xl border bg-background/50 premium-shadow">
                        <button
                            onClick={() => setView('profile')}
                            className="size-10 rounded-xl bg-linear-to-br from-indigo-500 to-purple-500 p-[1px] cursor-pointer hover:scale-105 transition-transform"
                        >
                            <div className="h-full w-full rounded-[11px] bg-background flex items-center justify-center font-bold text-xs text-indigo-500">
                                {user?.name.charAt(0).toUpperCase() || 'R'}
                            </div>
                        </button>
                        <div className="flex-1 min-w-0 pointer-events-none">
                            <p className="text-xs font-bold truncate">{user?.name || 'Recruiter'}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{user?.plan || 'Free Plan'}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-primary rounded-lg"
                                onClick={() => setView('settings')}
                            >
                                <Settings size={14} />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-lg"
                                onClick={logout}
                            >
                                <LogOut size={14} />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}

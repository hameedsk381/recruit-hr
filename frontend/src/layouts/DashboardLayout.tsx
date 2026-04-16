import { useApp } from '../context/AppContext';
import { Navigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import CopilotPanel from '../components/CopilotPanel';
import JobSetup from '../pages/JobSetup';
import Shortlist from '../pages/Shortlist';
import CandidateDetail from '../pages/CandidateDetail';
import Dashboard from '../pages/Dashboard';
import Interviews from '../pages/Interviews';
import Pipeline from '../pages/Pipeline';
import Settings from '../pages/Settings';
import Profile from '../pages/Profile';
import History from '../pages/History';
import HMDashboard from '../pages/HMDashboard';
import Requisitions from '../pages/Requisitions';
import Offers from '../pages/Offers';
import TalentPool from '../pages/TalentPool';
import Referrals from '../pages/Referrals';
import Predictions from '../pages/Predictions';
import Knowledge from '../pages/Knowledge';
import Fairness from '../pages/Fairness';
import { Search, Bell, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardLayout() {
    const { currentView, setView, job, logout, user } = useApp();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const isHM = user.role === 'hiring_manager';

    const renderView = () => {
        // Force HM to their specific dashboard if they are not in valid sub-views
        if (isHM) {
            switch (currentView) {
                case 'history': return <History />;
                case 'profile': return <Profile />;
                case 'settings': return <Settings />;
                default: return <HMDashboard />;
            }
        }

        switch (currentView) {
            case 'dashboard': return <Dashboard />;
            case 'setup': return <JobSetup />;
            case 'shortlist': return <Shortlist />;
            case 'detail': return <CandidateDetail />;
            case 'interviews': return <Interviews />;
            case 'pipeline': return <Pipeline />;
            case 'settings': return <Settings />;
            case 'profile': return <Profile />;
            case 'history': return <History />;
            case 'requisitions': return <Requisitions />;
            case 'offers': return <Offers />;
            case 'talent-pool': return <TalentPool />;
            case 'referrals': return <Referrals />;
            case 'predictions': return <Predictions />;
            case 'knowledge': return <Knowledge />;
            case 'fairness': return <Fairness />;
            default: return <Dashboard />;
        }
    };

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
            {/* Skip to content — MUST per Agents.md */}
            <a href="#dashboard-main" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-black text-white px-4 py-2 rounded-md">Skip to content</a>

            {/* Background grid */}
            <div className="fixed inset-0 z-0 subtle-grid opacity-[0.4] pointer-events-none" aria-hidden="true" />

            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0 relative z-10">
                <header className="h-16 border-b bg-background/80 backdrop-blur-xl px-8 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative max-w-sm w-full hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" aria-hidden="true" />
                            <input
                                id="global-search"
                                type="search"
                                placeholder="Search tasks, candidates…"
                                className="w-full h-9 pl-9 pr-4 bg-muted/50 border-none rounded-md text-sm focus-visible:ring-2 focus-visible:ring-ring outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-9 rounded-md text-muted-foreground hover:text-foreground"
                            aria-label="Notifications"
                        >
                            <Bell size={16} />
                        </Button>
                        <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-9 rounded-md text-muted-foreground hover:text-destructive"
                            onClick={logout}
                            aria-label="Sign out"
                        >
                            <LogOut size={16} />
                        </Button>
                    </div>
                </header>

                {/* Main Content Area */}
                <main id="dashboard-main" className="flex-1 overflow-y-auto">
                    <div className="container mx-auto px-6 lg:px-12 py-8 max-w-7xl">
                        {/* Breadcrumbs & Context */}
                        <div className="flex items-center justify-between mb-8">
                            <nav className="flex items-center gap-2 text-xs font-medium text-muted-foreground/60">
                                <button onClick={() => setView('dashboard')} className="hover:text-foreground transition-colors uppercase tracking-widest">home</button>
                                <span>/</span>
                                <span className="text-foreground uppercase tracking-widest">{currentView === 'setup' ? 'campaign setup' : currentView}</span>
                                {currentView === 'detail' && (
                                    <>
                                        <span>/</span>
                                        <span className="text-foreground uppercase tracking-widest">profile</span>
                                    </>
                                )}
                            </nav>

                            {job && (
                                <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border bg-muted/30">
                                    <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">{job.title}</span>
                                </div>
                            )}
                        </div>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentView}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ duration: 0.2, ease: "easeInOut" }}
                            >
                                {renderView()}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>
            </div>

            <CopilotPanel />
        </div>
    );
}

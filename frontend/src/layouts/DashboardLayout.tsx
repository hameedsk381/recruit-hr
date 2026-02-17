import { useApp } from '../context/AppContext';
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
import { Search, Bell, HelpCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardLayout() {
    const { currentView, job, logout } = useApp();

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background text-foreground selection:bg-primary/20 selection:text-primary">
            {/* Background Decorative Gradients */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
                <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-indigo-500/5 rounded-full blur-[100px]" />
                <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] bg-purple-500/5 rounded-full blur-[150px]" />
            </div>

            {/* Navigation Sidebar */}
            <Sidebar />

            {/* Content Wrapper */}
            <div className="flex-1 flex flex-col min-w-0 relative z-10">
                {/* Header */}
                <header className="h-20 border-b bg-background/50 backdrop-blur-md px-8 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative max-w-md w-full hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search candidates, jobs, or feedback..."
                                className="w-full h-10 pl-10 pr-4 bg-muted/50 border-transparent rounded-xl text-sm focus:bg-background focus:border-primary/20 focus:ring-0 transition-all outline-hidden"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {job && (
                            <div className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-bold text-primary uppercase mr-4">
                                Active Job: {job.title}
                            </div>
                        )}
                        <Button variant="ghost" size="icon" className="rounded-xl text-muted-foreground">
                            <HelpCircle size={18} />
                        </Button>
                        <Button variant="ghost" size="icon" className="rounded-xl text-muted-foreground relative">
                            <Bell size={18} />
                            <span className="absolute top-2 right-2 size-2 bg-destructive rounded-full border-2 border-background" />
                        </Button>
                        <div className="h-8 w-px bg-border mx-2" />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={logout}
                        >
                            <LogOut size={18} />
                        </Button>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto p-8 scroll-smooth">
                    <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {currentView === 'dashboard' && <Dashboard />}
                        {currentView === 'setup' && <JobSetup />}
                        {currentView === 'shortlist' && <Shortlist />}
                        {currentView === 'detail' && <CandidateDetail />}
                        {currentView === 'interviews' && <Interviews />}
                        {currentView === 'pipeline' && <Pipeline />}
                        {currentView === 'settings' && <Settings />}
                        {currentView === 'profile' && <Profile />}
                    </div>
                </main>
            </div>

            {/* Copilot Panel (Right Sidebar) */}
            <CopilotPanel />
        </div>
    );
}

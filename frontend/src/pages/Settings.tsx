import { useApp } from '../context/AppContext';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon, Bell, Shield, Globe, Cpu, Sparkles, User, KeyRound } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function Settings() {
    useApp();

    return (
        <div className="container mx-auto max-w-5xl px-4 py-8 space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col gap-1.5 border-b border-border/50 pb-6">
                <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <SettingsIcon className="size-6" />
                    Settings
                </h1>
                <p className="text-sm text-muted-foreground">Manage your account settings and workspace preferences.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Navigation Sidebar */}
                <div className="space-y-1 md:col-span-1">
                    {[
                        { icon: User, label: 'General', active: true },
                        { icon: Globe, label: 'Workspace', active: false },
                        { icon: Bell, label: 'Notifications', active: false },
                        { icon: Shield, label: 'Security', active: false },
                        { icon: KeyRound, label: 'Integrations', active: false },
                        { icon: Cpu, label: 'AI Configuration', active: false },
                    ].map((item, idx) => (
                        <Button
                            key={idx}
                            variant={item.active ? "secondary" : "ghost"}
                            className={cn(
                                "w-full justify-start gap-3 h-9 px-3 font-medium transition-colors",
                                item.active ? "text-foreground bg-muted hover:bg-muted/80" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                        >
                            <item.icon className="size-4" />
                            <span className="text-sm">{item.label}</span>
                        </Button>
                    ))}
                </div>

                {/* Main Settings Content */}
                <div className="md:col-span-3 space-y-8">
                    <div className="vercel-card space-y-6 bg-card">
                        <div className="space-y-1">
                            <h2 className="text-lg font-semibold text-foreground tracking-tight">Workspace Preferences</h2>
                            <p className="text-sm text-muted-foreground">Manage settings for your overall workspace.</p>
                        </div>
                        
                        <div className="h-px bg-border/50 w-full" />

                        <div className="space-y-6">
                            <div className="flex items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <Label className="text-sm font-medium text-foreground">Public Workspace Profile</Label>
                                    <p className="text-xs text-muted-foreground">Allow candidates to see your company brand during assessments.</p>
                                </div>
                                <Switch defaultChecked className="data-[state=checked]:bg-foreground" />
                            </div>

                            <div className="flex items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <Label className="text-sm font-medium text-foreground">Automatic Skill Mapping</Label>
                                    <p className="text-xs text-muted-foreground">Use AI to automatically map candidate resumes to your JD taxonomy.</p>
                                </div>
                                <Switch defaultChecked className="data-[state=checked]:bg-foreground" />
                            </div>

                            <div className="flex items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <Label className="text-sm font-medium text-foreground">Email Notifications</Label>
                                    <p className="text-xs text-muted-foreground">Get real-time alerts for high-confidence candidate matches.</p>
                                </div>
                                <Switch className="data-[state=checked]:bg-foreground" />
                            </div>
                        </div>
                    </div>

                    <div className="vercel-card space-y-6 bg-card border-emerald-500/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Sparkles className="size-24" />
                        </div>
                        <div className="relative z-10 space-y-1">
                            <h2 className="text-lg font-semibold text-foreground tracking-tight flex items-center gap-2">
                                <Sparkles className="size-4 text-emerald-500" />
                                Talent Intelligence
                            </h2>
                            <p className="text-sm text-muted-foreground">Manage your AI tier and usage limits.</p>
                        </div>
                        
                        <div className="relative z-10 h-px bg-border/50 w-full" />

                        <div className="relative z-10 space-y-5">
                            <div className="bg-muted/30 p-4 rounded-lg border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-foreground">Current Plan</span>
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider">Enterprise</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">AI calibration models operating at peak inference performance.</p>
                                </div>
                                <Button variant="outline" size="sm" className="font-medium shrink-0 h-8">
                                    View Usage
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

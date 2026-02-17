import { useApp } from '../context/AppContext';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon, Bell, Shield, Globe, Cpu, Sparkles } from 'lucide-react';

export default function Settings() {
    const { user } = useApp();

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col gap-2">
                <h1 className="text-3xl font-black tracking-tight font-outfit uppercase">System Settings</h1>
                <p className="text-muted-foreground font-medium">Configure your recruitment environment and AI preferences.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Navigation Sidebar (Local) */}
                <div className="space-y-2">
                    {[
                        { icon: Globe, label: 'Workspace', active: true },
                        { icon: Bell, label: 'Notifications', active: false },
                        { icon: Shield, label: 'Security', active: false },
                        { icon: Cpu, label: 'AI Configuration', active: false },
                    ].map((item, idx) => (
                        <Button
                            key={idx}
                            variant={item.active ? "secondary" : "ghost"}
                            className="w-full justify-start gap-3 rounded-xl font-bold h-12"
                        >
                            <item.icon size={18} className={item.active ? "text-primary" : "text-muted-foreground"} />
                            {item.label}
                        </Button>
                    ))}
                </div>

                {/* Main Settings Content */}
                <div className="md:col-span-2 space-y-8">
                    <Card className="rounded-[2rem] border-2 bg-card/40 backdrop-blur-md overflow-hidden premium-shadow">
                        <CardHeader className="p-8 pb-4">
                            <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                                <Globe className="text-primary" size={20} />
                                Workspace Environment
                            </h2>
                        </CardHeader>
                        <CardContent className="p-8 pt-0 space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border">
                                    <div className="space-y-0.5">
                                        <Label className="text-base font-bold">Public Workspace Profile</Label>
                                        <p className="text-xs text-muted-foreground font-medium">Allow candidates to see your company brand during assessments.</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border">
                                    <div className="space-y-0.5">
                                        <Label className="text-base font-bold">Automatic Skill Mapping</Label>
                                        <p className="text-xs text-muted-foreground font-medium">Use AI to automatically map candidate resumes to your JD taxonomy.</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border">
                                    <div className="space-y-0.5">
                                        <Label className="text-base font-bold">Email Notifications</Label>
                                        <p className="text-xs text-muted-foreground font-medium">Get real-time alerts for high-confidence candidate matches.</p>
                                    </div>
                                    <Switch />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-[2rem] border-2 bg-linear-to-br from-primary/5 to-indigo-500/5 backdrop-blur-md overflow-hidden premium-shadow border-primary/20">
                        <CardHeader className="p-8 pb-4">
                            <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                                <Sparkles className="text-primary" size={20} />
                                Pro Talent Intelligence
                            </h2>
                        </CardHeader>
                        <CardContent className="p-8 pt-0 space-y-6">
                            <p className="text-sm font-medium text-muted-foreground italic">
                                Your workspace is currently utilizing the <span className="text-primary font-bold">{user?.plan || 'Enterprise Plan'}</span>.
                                AI calibration models are operating at peak inference performance.
                            </p>
                            <Button className="rounded-xl font-black uppercase tracking-widest text-[10px] h-10 px-6">
                                View Usage Metrics
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

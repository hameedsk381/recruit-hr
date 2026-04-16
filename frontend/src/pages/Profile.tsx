import { useApp } from '../context/AppContext';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Mail, Shield, Award, Calendar, ExternalLink, MapPin, User, LogOut } from 'lucide-react';

export default function Profile() {
    const { user } = useApp();

    return (
        <div className="container mx-auto max-w-5xl px-4 py-8 space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border/50 pb-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <User className="size-6" />
                        Account Profile
                    </h1>
                    <p className="text-sm text-muted-foreground">Manage your personal recruiter identity and credentials.</p>
                </div>
                <Button variant="outline" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                    <LogOut className="size-3.5" />
                    Sign Out
                </Button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Overview */}
                <div className="lg:col-span-1 border rounded-xl overflow-hidden bg-card text-card-foreground shadow-sm flex flex-col">
                    <div className="h-28 bg-muted relative border-b">
                        <div className="absolute -bottom-10 left-6">
                            <Avatar className="size-20 border-4 border-background shadow-sm">
                                <AvatarFallback className="bg-primary/5 text-primary font-bold text-2xl">
                                    {user?.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </div>

                    <div className="p-6 pt-14 space-y-6 flex-1 flex flex-col">
                        <div className="space-y-1">
                            <h2 className="text-xl font-semibold tracking-tight text-foreground">{user?.name || 'Recruiter'}</h2>
                            <p className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
                                <Award size={14} className="opacity-70" />
                                Senior Talent Strategist
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary" className="px-2.5 py-0.5 bg-muted text-muted-foreground hover:bg-muted font-semibold text-[10px] uppercase tracking-wider">Enterprise</Badge>
                            <Badge variant="secondary" className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-none font-semibold text-[10px] uppercase tracking-wider">Verified</Badge>
                        </div>

                        <div className="space-y-3 pt-6 border-t border-border/50 mt-auto">
                            <div className="flex items-center gap-3 text-sm text-foreground">
                                <Mail size={16} className="text-muted-foreground" />
                                {user?.email}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-foreground">
                                <MapPin size={16} className="text-muted-foreground" />
                                Global Remote
                            </div>
                            <div className="flex items-center gap-3 text-sm text-foreground">
                                <Calendar size={16} className="text-muted-foreground" />
                                Joined Oct 2023
                            </div>
                        </div>

                        <Button variant="secondary" className="w-full mt-4 h-9">
                            Edit Profile
                        </Button>
                    </div>
                </div>

                {/* Extended Details */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="vercel-card space-y-6 bg-card">
                        <div className="space-y-1">
                            <h3 className="text-lg font-semibold tracking-tight text-foreground">Certifications & Trust</h3>
                            <p className="text-sm text-muted-foreground">Verified credentials associated with your account.</p>
                        </div>
                        
                        <div className="h-px bg-border/50 w-full" />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { title: 'Talent Evaluation Pro', issuer: 'Naipunya AI Labs', status: 'Active' },
                                { title: 'Technical Sourcing Strategist', issuer: 'Recruiter Intelligence', status: 'Active' }
                            ].map((cert, idx) => (
                                <div key={idx} className="p-4 rounded-xl bg-background border hover:border-foreground/20 space-y-3 group transition-all cursor-pointer">
                                    <div className="flex items-start justify-between">
                                        <div className="p-2 bg-muted rounded-md shrink-0">
                                            <Shield className="text-muted-foreground group-hover:text-foreground transition-colors" size={16} />
                                        </div>
                                        <ExternalLink size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <div className="space-y-1 mt-2">
                                        <p className="font-semibold text-sm text-foreground leading-tight">{cert.title}</p>
                                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{cert.issuer}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="vercel-card space-y-6 bg-card">
                        <div className="space-y-1">
                            <h3 className="text-lg font-semibold tracking-tight text-foreground">Security Protocol</h3>
                            <p className="text-sm text-muted-foreground">Manage your account security and authentication methods.</p>
                        </div>
                        
                        <div className="h-px bg-border/50 w-full" />
                        
                        <div className="p-4 rounded-xl bg-muted/30 border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm text-foreground">Two-Factor Authentication</p>
                                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 border-none font-semibold text-[10px] uppercase tracking-wider h-5 px-1.5">Active</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">Standard protocol for enterprise workspaces.</p>
                            </div>
                            <Button variant="outline" size="sm" className="shrink-0 h-8 font-medium">
                                Configure
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

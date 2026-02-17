import { useApp } from '../context/AppContext';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Mail, Shield, Award, Calendar, ExternalLink, MapPin } from 'lucide-react';

export default function Profile() {
    const { user } = useApp();

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col gap-2">
                <h1 className="text-3xl font-black tracking-tight font-outfit uppercase">User Profile</h1>
                <p className="text-muted-foreground font-medium">Manage your personal recruiter identity and credentials.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Overview */}
                <Card className="rounded-[2.5rem] border-2 bg-card/40 backdrop-blur-md overflow-hidden premium-shadow lg:col-span-1">
                    <div className="h-32 bg-linear-to-br from-primary to-indigo-600 relative">
                        <div className="absolute -bottom-12 left-8 p-1 rounded-[2rem] bg-background">
                            <Avatar className="size-24 rounded-[1.8rem] border-4 border-background shadow-xl">
                                <AvatarFallback className="bg-primary/10 text-primary font-black text-3xl">
                                    {user?.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </div>

                    <CardContent className="p-8 pt-16 space-y-6">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black tracking-tight">{user?.name || 'Recruiter'}</h2>
                            <p className="text-muted-foreground font-bold flex items-center gap-2">
                                <Award size={14} className="text-primary" />
                                Senior Talent Strategist
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2">
                            <Badge variant="secondary" className="rounded-full px-3 py-1 bg-primary/5 text-primary border-primary/20 font-bold uppercase text-[9px] tracking-widest">Enterprise</Badge>
                            <Badge variant="secondary" className="rounded-full px-3 py-1 bg-emerald-500/5 text-emerald-600 border-emerald-500/20 font-bold uppercase text-[9px] tracking-widest">Verified</Badge>
                        </div>

                        <div className="space-y-3 pt-4 border-t">
                            <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                                <Mail size={16} className="text-primary/60" />
                                {user?.email}
                            </div>
                            <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                                <MapPin size={16} className="text-primary/60" />
                                Global Remote
                            </div>
                            <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                                <Calendar size={16} className="text-primary/60" />
                                Joined Oct 2023
                            </div>
                        </div>

                        <Button className="w-full h-11 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20">
                            Edit Identity
                        </Button>
                    </CardContent>
                </Card>

                {/* Extended Details */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="rounded-[2.5rem] border-2 bg-card/40 backdrop-blur-md overflow-hidden premium-shadow">
                        <CardHeader className="p-8 pb-4">
                            <h3 className="text-xl font-black tracking-tight">Certification & Trust</h3>
                        </CardHeader>
                        <CardContent className="p-8 pt-0 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { title: 'Talent Evaluation Pro', issuer: 'Naipunya AI Labs', status: 'Active' },
                                    { title: 'Technical Sourcing Strategist', issuer: 'Recruiter Intelligence', status: 'Active' }
                                ].map((cert, idx) => (
                                    <div key={idx} className="p-5 rounded-3xl bg-muted/30 border space-y-2 group hover:border-primary/30 transition-all cursor-pointer">
                                        <div className="flex items-center justify-between">
                                            <Shield className="text-primary/40 group-hover:text-primary transition-colors" size={24} />
                                            <ExternalLink size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">{cert.title}</p>
                                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{cert.issuer}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-[2.5rem] border-2 bg-card/40 backdrop-blur-md overflow-hidden premium-shadow">
                        <CardHeader className="p-8 pb-4">
                            <h3 className="text-xl font-black tracking-tight">Security Protocol</h3>
                        </CardHeader>
                        <CardContent className="p-8 pt-0 space-y-4">
                            <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <p className="font-bold text-sm">Two-Factor Authentication</p>
                                        <p className="text-xs text-muted-foreground font-medium">Standard protocol for enterprise workspaces.</p>
                                    </div>
                                    <Badge className="bg-emerald-500 text-white border-0 font-black text-[9px] uppercase tracking-widest">Active</Badge>
                                </div>
                                <Button variant="outline" className="h-9 rounded-lg text-[10px] font-black uppercase tracking-widest">Rotate Security Keys</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}


import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
    LayoutGrid, Search, Zap, ExternalLink, Plus,
    ArrowRight, Star, Key, Copy, Trash2, RefreshCw,
    Code, Book, Rocket
} from 'lucide-react';
import { cn } from "@/lib/utils";
import api from '../api/client';

// Simple toast mock since sonner is not installed
const toast = {
    success: (msg: string) => alert(`Success: ${msg}`),
    error: (msg: string) => alert(`Error: ${msg}`)
};

interface Integration {
    id: string;
    name: string;
    description: string;
    category: 'ATS' | 'HRIS' | 'Communication' | 'BGV' | 'E-Sign' | 'Calendar' | 'Other';
    logo: string;
    status: 'connected' | 'not_connected' | 'coming_soon';
    features: string[];
    rating: number;
    popular?: boolean;
}

const INTEGRATIONS: Integration[] = [
    {
        id: 'linkedin',
        name: 'LinkedIn Jobs',
        description: 'Post jobs directly and sync applicants in real-time.',
        category: 'ATS',
        logo: 'https://cdn-icons-png.flaticon.com/512/174/174857.png',
        status: 'connected',
        features: ['One-click post', 'Applicant sync', 'Company page integration'],
        rating: 4.8,
        popular: true
    },
    {
        id: 'docusign',
        name: 'DocuSign',
        description: 'Send offer letters for legally binding electronic signatures.',
        category: 'E-Sign',
        logo: 'https://cdn-icons-png.flaticon.com/512/5968/5968846.png',
        status: 'connected',
        features: ['Template binding', 'Real-time status', 'Automated reminders'],
        rating: 4.9,
        popular: true
    },
    {
        id: 'authbridge',
        name: 'AuthBridge',
        description: 'India\'s leading background verification and identity service.',
        category: 'BGV',
        logo: 'https://authbridge.com/wp-content/uploads/2021/04/Authbridge-logo.png',
        status: 'not_connected',
        features: ['Identity check', 'Criminal records', 'Education verification'],
        rating: 4.7
    },
    {
        id: 'slack',
        name: 'Slack',
        description: 'Get notified of new matches and interview approvals.',
        category: 'Communication',
        logo: 'https://cdn-icons-png.flaticon.com/512/3800/3800024.png',
        status: 'not_connected',
        features: ['Team notifications', 'Slash commands', 'Approval flow'],
        rating: 4.8,
        popular: true
    },
    {
        id: 'google-calendar',
        name: 'Google Calendar',
        description: 'Sync interview schedules and check interviewer availability.',
        category: 'Calendar',
        logo: 'https://cdn-icons-png.flaticon.com/512/2991/2991147.png',
        status: 'connected',
        features: ['Availability sync', 'Room booking', 'Invite automation'],
        rating: 4.9
    },
    {
        id: 'workday',
        name: 'Workday',
        description: 'Sync hire data and employee profiles with your primary HRIS.',
        category: 'HRIS',
        logo: 'https://cdn-icons-png.flaticon.com/512/5969/5969248.png',
        status: 'not_connected',
        features: ['Employee import', 'Hire export', 'Department sync'],
        rating: 4.6
    },
    {
        id: 'hackerrank',
        name: 'HackerRank',
        description: 'Send automated coding assessments to engineering candidates.',
        category: 'Other',
        logo: 'https://cdn-icons-png.flaticon.com/512/919/919830.png',
        status: 'coming_soon',
        features: ['Coding tests', 'Auto-scoring', 'Anti-plagiarism'],
        rating: 4.8
    }
];

const CATEGORIES = ['All', 'ATS', 'HRIS', 'Communication', 'BGV', 'E-Sign', 'Calendar', 'Other'];

export default function Marketplace() {
    const [viewMode, setViewMode] = useState<'explore' | 'developers'>('explore');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    const filteredIntegrations = INTEGRATIONS.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             item.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Header with Toggle */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black tracking-tighter uppercase flex items-center gap-3">
                        <LayoutGrid className="size-10 text-primary" />
                        Ecosystem
                    </h1>
                    <p className="text-lg text-muted-foreground font-medium max-w-2xl">
                        Power up your recruitment stack with native integrations and developer tools.
                    </p>
                </div>
                
                <div className="flex bg-muted p-1 rounded-xl border border-border/50">
                    <button 
                        onClick={() => setViewMode('explore')}
                        className={cn(
                            "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                            viewMode === 'explore' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Marketplace
                    </button>
                    <button 
                        onClick={() => setViewMode('developers')}
                        className={cn(
                            "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                            viewMode === 'developers' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Developers
                    </button>
                </div>
            </div>

            {viewMode === 'explore' ? (
                <div className="space-y-10">
                    {/* Search & Filter */}
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative flex-1 min-w-[300px] max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search integrations..." 
                                className="pl-10 h-11 bg-card border-border/50 focus-visible:ring-primary shadow-sm font-medium"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex bg-muted p-1 rounded-lg border border-border/50 overflow-x-auto no-scrollbar max-w-full">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest transition-all",
                                        selectedCategory === cat 
                                            ? "bg-primary text-primary-foreground shadow-sm" 
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Featured Section */}
                    {selectedCategory === 'All' && !searchQuery && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Featured Ecosystem</h2>
                                <Button variant="link" className="text-xs font-bold uppercase tracking-widest gap-2">
                                    Browse All <ArrowRight className="size-3" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {INTEGRATIONS.filter(i => i.popular).map(item => (
                                    <div key={item.id} className="group vercel-card bg-card border-border/50 hover:border-primary/50 transition-all cursor-pointer overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                            <Zap className="size-20" />
                                        </div>
                                        <div className="flex items-start gap-4 mb-4 relative z-10">
                                            <div className="size-12 rounded-lg bg-muted flex items-center justify-center p-2 group-hover:scale-110 transition-transform">
                                                <img src={item.logo} alt="" className="size-full object-contain grayscale group-hover:grayscale-0 transition-all" />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-foreground leading-none">{item.name}</h3>
                                                    {item.status === 'connected' && <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-none text-[8px] font-black uppercase px-2 h-4">Connected</Badge>}
                                                </div>
                                                <p className="text-xs text-muted-foreground font-medium">{item.category}</p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground font-medium mb-6 line-clamp-2 relative z-10 leading-relaxed">
                                            {item.description}
                                        </p>
                                        <div className="flex items-center justify-between mt-auto relative z-10">
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-500">
                                                <Star className="size-3 fill-current" />
                                                {item.rating}
                                            </div>
                                            <Button size="sm" variant={item.status === 'connected' ? 'outline' : 'default'} className="h-8 text-[10px] font-black uppercase tracking-widest px-4">
                                                {item.status === 'connected' ? 'Manage' : 'Connect'}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* List Section */}
                    <div className="space-y-6">
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                            {searchQuery ? `Search Results (${filteredIntegrations.length})` : 'All Integrations'}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredIntegrations.map(item => (
                                <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card hover:bg-muted/30 transition-colors group">
                                    <div className="size-14 rounded-xl bg-muted flex items-center justify-center p-3 shrink-0">
                                        <img src={item.logo} alt="" className="size-full object-contain grayscale group-hover:grayscale-0 transition-all opacity-80 group-hover:opacity-100" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <h3 className="font-bold text-sm text-foreground truncate">{item.name}</h3>
                                            <Badge variant="outline" className="text-[8px] font-black uppercase px-2 h-4 border-muted-foreground/30 text-muted-foreground">{item.category}</Badge>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground font-medium line-clamp-1">{item.description}</p>
                                    </div>
                                    <div className="shrink-0 flex items-center gap-2">
                                        {item.status === 'coming_soon' ? (
                                            <span className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest px-2">Soon</span>
                                        ) : (
                                            <Button size="icon" variant="ghost" className="size-8 rounded-full hover:bg-primary hover:text-primary-foreground">
                                                <Plus className="size-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <DevelopersSection />
            )}
        </div>
    );
}

function DevelopersSection() {
    const [apiKeys, setApiKeys] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [generatedKey, setGeneratedKey] = useState<string | null>(null);

    useEffect(() => {
        loadKeys();
    }, []);

    const loadKeys = async () => {
        setIsLoading(true);
        try {
            const res = await api.listAPIKeys();
            if (res.success) setApiKeys(res.keys);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateKey = async () => {
        if (!newKeyName) return;
        setIsCreating(true);
        try {
            const res = await api.createAPIKey(newKeyName);
            if (res.success) {
                setGeneratedKey(res.key);
                setNewKeyName('');
                loadKeys();
                toast.success("API Key generated successfully");
            }
        } catch (e: any) {
            toast.error(e.message || "Failed to generate key");
        } finally {
            setIsCreating(false);
        }
    };

    const handleRevokeKey = async (id: string) => {
        if (!confirm("Are you sure you want to revoke this API key? This action cannot be undone.")) return;
        try {
            const res = await api.revokeAPIKey(id);
            if (res.success) {
                toast.success("API Key revoked");
                loadKeys();
            }
        } catch (e: any) {
            toast.error(e.message || "Failed to revoke key");
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            {/* Developer Hero */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="vercel-card bg-card border-border/50 p-8">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                <Code className="size-6" />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-xl font-bold tracking-tight">API Management</h2>
                                <p className="text-sm text-muted-foreground font-medium">Create and manage access keys for your custom integrations.</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex gap-3">
                                <Input 
                                    placeholder="Key description (e.g. My Website Bot)" 
                                    className="h-10 bg-muted/50 border-border/50 font-medium"
                                    value={newKeyName}
                                    onChange={(e) => setNewKeyName(e.target.value)}
                                />
                                <Button 
                                    className="h-10 px-6 font-black uppercase tracking-widest shrink-0"
                                    onClick={handleCreateKey}
                                    disabled={isCreating || !newKeyName}
                                >
                                    {isCreating ? <RefreshCw className="size-4 animate-spin mr-2" /> : <Plus className="size-4 mr-2" />}
                                    Create Key
                                </Button>
                            </div>

                            {generatedKey && (
                                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-3 animate-in zoom-in-95 duration-300">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">New Secret Key Generated</p>
                                        <Button variant="ghost" size="sm" className="h-6 text-[10px] font-bold" onClick={() => setGeneratedKey(null)}>Dismiss</Button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 p-2 bg-emerald-500/10 rounded border border-emerald-500/10 text-xs font-mono break-all text-emerald-700">
                                            {generatedKey}
                                        </code>
                                        <Button size="icon" variant="ghost" className="shrink-0 text-emerald-700 hover:bg-emerald-500/10" onClick={() => copyToClipboard(generatedKey)}>
                                            <Copy className="size-4" />
                                        </Button>
                                    </div>
                                    <p className="text-[10px] font-medium text-emerald-600/80 italic">
                                        Make sure to copy your new personal access token now. You won't be able to see it again!
                                    </p>
                                </div>
                            )}

                            <div className="space-y-3">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active Keys</h3>
                                {isLoading ? (
                                    <div className="py-10 text-center text-muted-foreground animate-pulse font-medium underline decoration-primary decoration-2 underline-offset-4">Loading credentials...</div>
                                ) : apiKeys.length === 0 ? (
                                    <div className="py-12 text-center border-2 border-dashed border-border/50 rounded-xl bg-muted/20">
                                        <Key className="size-8 text-muted-foreground/30 mx-auto mb-3" />
                                        <p className="text-sm text-muted-foreground font-medium">No API keys found. Create one to get started.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border/30 rounded-xl border border-border/30 overflow-hidden">
                                        {apiKeys.map(key => (
                                            <div key={key._id} className="p-4 flex items-center justify-between bg-card hover:bg-muted/10 transition-colors">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-sm font-bold">
                                                        {key.name}
                                                        <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest px-2 h-4 border-muted-foreground/30 text-muted-foreground">Production</Badge>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
                                                        <span>Prefix: {key.prefix}...</span>
                                                        <span className="text-border">|</span>
                                                        <span>Created: {new Date(key.createdAt).toLocaleDateString()}</span>
                                                        {key.lastUsedAt && (
                                                            <>
                                                                <span className="text-border">|</span>
                                                                <span className="text-emerald-500/70">Last used: {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <Button 
                                                    size="icon" 
                                                    variant="ghost" 
                                                    className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleRevokeKey(key._id)}
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="vercel-card bg-primary text-primary-foreground border-none p-6 space-y-4">
                        <div className="size-10 rounded-lg bg-primary-foreground/10 flex items-center justify-center">
                            <Book className="size-5" />
                        </div>
                        <h3 className="font-bold text-lg leading-tight">API Documentation</h3>
                        <p className="text-xs text-primary-foreground/80 leading-relaxed font-medium">
                            Read our comprehensive guides on how to integrate Reckruit.ai into your own platform.
                        </p>
                        <Button variant="secondary" className="w-full text-[10px] font-black uppercase tracking-widest gap-2">
                            View Docs <ExternalLink className="size-3" />
                        </Button>
                    </div>

                    <div className="vercel-card bg-card border-border/50 p-6 space-y-4">
                        <div className="size-10 rounded-lg bg-muted flex items-center justify-center text-primary">
                            <Rocket className="size-5" />
                        </div>
                        <h3 className="font-bold text-lg leading-tight">Quick Start</h3>
                        <div className="space-y-3">
                            <div className="p-3 bg-muted/50 rounded-lg font-mono text-[10px] relative group border border-border/30">
                                <code className="text-muted-foreground">curl -X POST https://api.reckruit.ai/v1/requisitions</code>
                                <Button variant="ghost" size="icon" className="absolute right-1 top-1 size-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard('curl -X POST https://api.reckruit.ai/v1/requisitions')}>
                                    <Copy className="size-3 text-muted-foreground" />
                                </Button>
                            </div>
                            <Button variant="outline" className="w-full text-[10px] font-black uppercase tracking-widest gap-2">
                                SDK Repositories <ArrowRight className="size-3" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Implementation Status Section */}
            <div className="space-y-6 pt-10 border-t border-border/50">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">System Webhooks</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { title: 'Candidate Applied', event: 'candidate.created', status: 'Active' },
                        { title: 'Interview Scheduled', event: 'interview.scheduled', status: 'Active' },
                        { title: 'Offer Finalized', event: 'offer.accepted', status: 'Paused' },
                    ].map(hook => (
                        <div key={hook.event} className="p-4 rounded-xl border border-border/50 bg-card/50 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold">{hook.title}</h4>
                                <Badge variant={hook.status === 'Active' ? 'secondary' : 'outline'} className={cn(
                                    "text-[8px] font-black uppercase tracking-widest border-none",
                                    hook.status === 'Active' ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"
                                )}>
                                    {hook.status}
                                </Badge>
                            </div>
                            <code className="text-[10px] font-mono p-2 bg-muted/50 rounded font-medium text-muted-foreground">{hook.event}</code>
                            <Button variant="ghost" className="mt-auto h-8 text-[10px] font-bold uppercase tracking-widest justify-start px-0 hover:bg-transparent hover:text-primary">Configure Endpoint</Button>
                        </div>
                    ))}
                    <div className="flex items-center justify-center p-4 rounded-xl border-2 border-dashed border-border/50 hover:bg-muted/10 transition-colors cursor-pointer group">
                        <div className="text-center space-y-1">
                            <Plus className="size-5 text-muted-foreground mx-auto group-hover:text-primary transition-colors" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Add Webhook</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

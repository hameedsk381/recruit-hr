import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Cpu, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const emailRef = useRef<HTMLInputElement>(null);

    // SHOULD: Autofocus on desktop with single primary input
    useEffect(() => {
        if (window.innerWidth > 768) emailRef.current?.focus();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await api.login(email.trim(), password, 'tenant-default-001');
            if (res.success && res.token) {
                localStorage.setItem('user', JSON.stringify({
                    email: res.user.email,
                    name: res.user.email.split('@')[0],
                    role: 'recruiter'
                }));
                navigate('/app');
            } else {
                setError(res.error || 'Invalid credentials. Please try again.');
            }
        } catch {
            setError('Connection failed. Please check your network.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 text-foreground px-6 py-12">
            <div className="w-full max-w-sm space-y-8">
                {/* Brand */}
                <div className="text-center space-y-6">
                    <Link to="/" className="inline-flex items-center gap-2" aria-label="reckuit.ai home">
                        <div className="size-9 rounded-lg bg-black text-white flex items-center justify-center">
                            <Cpu size={18} strokeWidth={2.5} />
                        </div>
                        <span className="text-lg font-bold tracking-tight" translate="no">reckuit.ai</span>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
                        <p className="text-sm text-muted-foreground mt-1">Sign in to your account to continue.</p>
                    </div>
                </div>

                {/* Form card */}
                <div className="rounded-xl border border-border bg-white p-8 space-y-6 shadow-sm">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2" role="alert">
                            <AlertCircle size={16} aria-hidden="true" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4" noValidate>
                        <div className="space-y-2">
                            <Label htmlFor="login-email" className="text-xs font-medium text-muted-foreground">Email</Label>
                            <Input
                                ref={emailRef}
                                id="login-email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                inputMode="email"
                                spellCheck={false}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-11 bg-white border-muted text-foreground placeholder:text-muted-foreground/50"
                                style={{ fontSize: '16px', transition: 'border-color 150ms ease, background-color 150ms ease' }}
                                placeholder="you@company.com…"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="login-password" className="text-xs font-medium text-muted-foreground">Password</Label>
                                <button
                                    type="button"
                                    className="text-xs text-muted-foreground hover:text-foreground py-0.5"
                                    style={{ transition: 'color 150ms ease' }}
                                >
                                    Forgot password?
                                </button>
                            </div>
                            <Input
                                id="login-password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-11 bg-white border-muted text-foreground placeholder:text-muted-foreground/50"
                                style={{ fontSize: '16px', transition: 'border-color 150ms ease, background-color 150ms ease' }}
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        {/* MUST: Loading buttons show spinner and keep original label */}
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-11 bg-black text-white hover:bg-zinc-800 font-semibold rounded-lg gap-2"
                            style={{ transition: 'background-color 150ms ease, opacity 150ms ease' }}
                        >
                            {loading && <Loader2 size={16} className="animate-spin" />}
                            Sign in
                            {!loading && <ArrowRight size={14} />}
                        </Button>
                    </form>

                    <div className="pt-4 border-t border-border text-center">
                        <p className="text-sm text-muted-foreground">
                            Don't have an account?{' '}
                            <Link to="/signup" className="text-foreground font-medium hover:underline">Sign up</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Cpu, ArrowRight, Loader2, AlertCircle, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Signup() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [consent, setConsent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const nameRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (window.innerWidth > 768) nameRef.current?.focus();
    }, []);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!consent) {
            setError('Please accept the data processing terms to continue.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            // First we register the user
            await api.register(email.trim(), password, 'tenant-default-001', name.trim());
            
            // Then we log them in to get the token
            const res = await api.login(email.trim(), password, 'tenant-default-001');
            if (res.success && res.token) {
                localStorage.setItem('auth_token', res.token);
                localStorage.setItem('tenantId', res.user.tenantId);
                localStorage.setItem('user', JSON.stringify({ email: res.user.email, name: name.trim(), role: 'recruiter' }));
                navigate('/app');
            } else {
                setError(res.error || 'Account creation succeeded but login failed.');
            }
        } catch (err: any) {
            setError(err.message || 'Connection failed. Please check your network.');
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
                        <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
                        <p className="text-sm text-muted-foreground mt-1">Start screening candidates in minutes.</p>
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

                    <form onSubmit={handleSignup} className="space-y-4" noValidate>
                        <div className="space-y-2">
                            <Label htmlFor="signup-name" className="text-xs font-medium text-muted-foreground">Full name</Label>
                            <Input
                                ref={nameRef}
                                id="signup-name"
                                name="name"
                                type="text"
                                autoComplete="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="h-11 bg-white border-muted text-foreground placeholder:text-muted-foreground/50"
                                style={{ fontSize: '16px', transition: 'border-color 150ms ease, background-color 150ms ease' }}
                                placeholder="Jane Doe…"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="signup-email" className="text-xs font-medium text-muted-foreground">Work email</Label>
                            <Input
                                id="signup-email"
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
                            <Label htmlFor="signup-password" className="text-xs font-medium text-muted-foreground">Password</Label>
                            <Input
                                id="signup-password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-11 bg-white border-muted text-foreground placeholder:text-muted-foreground/50"
                                style={{ fontSize: '16px', transition: 'border-color 150ms ease, background-color 150ms ease' }}
                                placeholder="Min 8 characters…"
                                minLength={8}
                                required
                            />
                        </div>

                        {/* Consent — uses proper label+checkbox pattern */}
                        <label htmlFor="signup-consent" className="flex items-start gap-3 p-3 rounded-lg bg-zinc-50 border border-border cursor-pointer select-none">
                            <div className="pt-0.5">
                                <input
                                    type="checkbox"
                                    id="signup-consent"
                                    name="consent"
                                    checked={consent}
                                    onChange={(e) => setConsent(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div
                                    className="size-5 rounded border-2 border-muted flex items-center justify-center peer-checked:bg-black peer-checked:border-black peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-400"
                                    style={{ transition: 'background-color 150ms ease, border-color 150ms ease' }}
                                    aria-hidden="true"
                                >
                                    {consent && <Check size={12} className="text-white" />}
                                </div>
                            </div>
                            <span className="text-xs text-muted-foreground leading-relaxed">
                                I consent to automated processing of professional data under the{' '}
                                <span className="text-foreground font-medium">India DPDP Act&nbsp;2023</span> and GDPR.
                            </span>
                        </label>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-11 bg-black text-white hover:bg-zinc-800 font-semibold rounded-lg gap-2"
                            style={{ transition: 'background-color 150ms ease, opacity 150ms ease' }}
                        >
                            {loading && <Loader2 size={16} className="animate-spin" />}
                            Create account
                            {!loading && <ArrowRight size={14} />}
                        </Button>
                    </form>

                    <div className="pt-4 border-t border-border text-center">
                        <p className="text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <Link to="/login" className="text-foreground font-medium hover:underline">Sign in</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Cpu, Github, Linkedin, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function Login() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await api.login(email, password, 'tenant-default-001');

            if (res.success && res.token) {
                // api.login already sets auth_token and tenantId
                localStorage.setItem('user', JSON.stringify({
                    email: res.user.email,
                    name: res.user.email.split('@')[0],
                    role: 'recruiter'
                }));
                navigate('/app');
            } else {
                setError(res.error || 'Login failed. Check your credentials.');
            }
        } catch (err) {
            setError('Connection failed. Please check if the backend is running.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                <Cpu size={18} />
                            </div>
                            talentacquisition.ai
                        </Link>
                    </div>
                    <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
                    <CardDescription>
                        Enter your credentials to access your workspace
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg flex items-center gap-2">
                            <AlertCircle className="size-4" />
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                                <Link to="#" className="text-sm font-medium text-primary hover:underline">
                                    Forgot password?
                                </Link>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                Or continue with
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Button variant="outline" className="w-full" type="button">
                            <Github className="mr-2 h-4 w-4" />
                            GitHub
                        </Button>
                        <Button variant="outline" className="w-full" type="button">
                            <Linkedin className="mr-2 h-4 w-4" />
                            LinkedIn
                        </Button>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-center border-t py-6">
                    <div className="text-sm text-muted-foreground">
                        Don't have an account?{' '}
                        <Link to="/signup" className="font-semibold text-primary hover:underline">
                            Sign up
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}

import { useState, useEffect } from 'react';
import api from '../api/client';
import { Button } from '@/components/ui/button';
import { TrendingUp, Clock, AlertTriangle, Brain, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageGuide } from '@/components/PageGuide';

type Tab = 'offer' | 'ttf' | 'retention' | 'weights';

export default function Predictions() {
    const [tab, setTab] = useState<Tab>('offer');
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [weights, setWeights] = useState<any>(null);

    // Offer acceptance form state
    const [offerForm, setOfferForm] = useState({
        basesal: '', currency: 'USD', bonus: '', signing: '',
        currentRole: '', expYears: '', skills: '',
        medianBase: '', p75Base: '', daysInProcess: '0',
    });

    // Time-to-fill form
    const [ttfForm, setTtfForm] = useState({ title: '', department: '', location: '', expYears: '', skills: '', remote: false });

    // Retention form
    const [retForm, setRetForm] = useState({
        tenure: '', role: '', department: '', perf: '', compVsMarket: 'at',
        recentPromotion: false, managerChanges: '0', teamChanges: '0',
    });

    const loadWeights = async () => {
        const res = await api.getAIWeights();
        if (res.success) setWeights(res.weights);
    };

    useEffect(() => { if (tab === 'weights') loadWeights(); }, [tab]);

    const predictOffer = async () => {
        setLoading(true); setResult(null);
        try {
            const res = await api.predictOfferAcceptance({
                candidate: {
                    currentRole: offerForm.currentRole || undefined,
                    experienceYears: offerForm.expYears ? Number(offerForm.expYears) : undefined,
                    skills: offerForm.skills ? offerForm.skills.split(',').map(s => s.trim()) : undefined,
                },
                offer: {
                    compensation: {
                        base: Number(offerForm.basesal),
                        currency: offerForm.currency,
                        bonus: offerForm.bonus ? Number(offerForm.bonus) : undefined,
                        signingBonus: offerForm.signing ? Number(offerForm.signing) : undefined,
                    },
                },
                marketData: {
                    medianBase: Number(offerForm.medianBase),
                    p75Base: Number(offerForm.p75Base),
                    currency: offerForm.currency,
                },
                daysInProcess: Number(offerForm.daysInProcess),
            });
            if (res.success) setResult(res.prediction);
        } finally { setLoading(false); }
    };

    const predictTTF = async () => {
        setLoading(true); setResult(null);
        try {
            const res = await api.predictTimeToFill({
                title: ttfForm.title,
                department: ttfForm.department || undefined,
                location: ttfForm.location || undefined,
                skills: ttfForm.skills ? ttfForm.skills.split(',').map(s => s.trim()) : undefined,
                experienceYears: ttfForm.expYears ? Number(ttfForm.expYears) : undefined,
                remote: ttfForm.remote,
            });
            if (res.success) setResult(res.prediction);
        } finally { setLoading(false); }
    };

    const predictRetention = async () => {
        setLoading(true); setResult(null);
        try {
            const res = await api.predictRetentionRisk({
                tenure_months: Number(retForm.tenure),
                role: retForm.role,
                department: retForm.department || undefined,
                performanceScore: retForm.perf ? Number(retForm.perf) : undefined,
                compensationVsMarket: retForm.compVsMarket as any,
                recentPromotion: retForm.recentPromotion,
                managerChanges: Number(retForm.managerChanges),
                teamChanges: Number(retForm.teamChanges),
            });
            if (res.success) setResult(res.prediction);
        } finally { setLoading(false); }
    };

    const TABS = [
        { id: 'offer' as Tab, label: 'Offer Acceptance', icon: TrendingUp },
        { id: 'ttf' as Tab, label: 'Time to Fill', icon: Clock },
        { id: 'retention' as Tab, label: 'Retention Risk', icon: AlertTriangle },
        { id: 'weights' as Tab, label: 'AI Weights', icon: Brain },
    ];

    const inputCls = "w-full h-8 px-3 bg-background border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
    const labelCls = "text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1";

    return (
        <div className="space-y-6 max-w-3xl">
            <PageGuide
              pageKey="predictions"
              title="How AI Predictions Work"
              steps={[
                { title: "Offer Acceptance", description: "Enter the candidate's offer details and market benchmarks. The model predicts the probability they'll accept, based on compensation gap, days-in-process, and historical patterns." },
                { title: "Time to Fill", description: "Provide the role title, department, location, and required experience. The model estimates how many days this requisition will take to fill based on similar past roles." },
                { title: "Retention Risk", description: "Enter an employee's tenure, performance, recent promotions, and team changes. The model flags high-risk employees before they resign." },
                { title: "AI Weights", description: "View the current model feature weights to understand which factors have the most influence on each prediction. Weights update automatically as outcomes are recorded." },
              ]}
              tips={[
                "Predictions improve over time — the more outcomes you record, the more accurate the model becomes.",
                "Use Retention Risk in quarterly reviews to proactively address flight risks.",
                "Time-to-Fill predictions help you set realistic expectations with hiring managers.",
              ]}
            />
            <div>
                <h1 className="text-2xl font-black tracking-tight">AI Predictions</h1>
                <p className="text-sm text-muted-foreground mt-1">LLM-powered predictive intelligence for hiring decisions</p>
            </div>

            {/* Tab Bar */}
            <div className="flex gap-1 border-b pb-0">
                {TABS.map(t => (
                    <button key={t.id} onClick={() => { setTab(t.id); setResult(null); }}
                        className={cn('flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-colors',
                            tab === t.id ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
                        <t.icon size={13} />{t.label}
                    </button>
                ))}
            </div>

            {/* Offer Acceptance */}
            {tab === 'offer' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className={labelCls}>Base Salary *</label><input type="number" value={offerForm.basesal} onChange={e => setOfferForm(p => ({ ...p, basesal: e.target.value }))} className={inputCls} /></div>
                        <div><label className={labelCls}>Currency</label>
                            <select value={offerForm.currency} onChange={e => setOfferForm(p => ({ ...p, currency: e.target.value }))} className={inputCls}>
                                {['USD', 'INR', 'EUR', 'GBP', 'SGD'].map(c => <option key={c}>{c}</option>)}
                            </select>
                        </div>
                        <div><label className={labelCls}>Bonus</label><input type="number" value={offerForm.bonus} onChange={e => setOfferForm(p => ({ ...p, bonus: e.target.value }))} className={inputCls} /></div>
                        <div><label className={labelCls}>Signing Bonus</label><input type="number" value={offerForm.signing} onChange={e => setOfferForm(p => ({ ...p, signing: e.target.value }))} className={inputCls} /></div>
                        <div><label className={labelCls}>Market Median Base *</label><input type="number" value={offerForm.medianBase} onChange={e => setOfferForm(p => ({ ...p, medianBase: e.target.value }))} className={inputCls} /></div>
                        <div><label className={labelCls}>Market P75 Base *</label><input type="number" value={offerForm.p75Base} onChange={e => setOfferForm(p => ({ ...p, p75Base: e.target.value }))} className={inputCls} /></div>
                        <div><label className={labelCls}>Candidate Current Role</label><input value={offerForm.currentRole} onChange={e => setOfferForm(p => ({ ...p, currentRole: e.target.value }))} className={inputCls} /></div>
                        <div><label className={labelCls}>Experience Years</label><input type="number" value={offerForm.expYears} onChange={e => setOfferForm(p => ({ ...p, expYears: e.target.value }))} className={inputCls} /></div>
                        <div className="col-span-2"><label className={labelCls}>Skills (comma-sep)</label><input value={offerForm.skills} onChange={e => setOfferForm(p => ({ ...p, skills: e.target.value }))} className={inputCls} /></div>
                        <div><label className={labelCls}>Days in Process</label><input type="number" value={offerForm.daysInProcess} onChange={e => setOfferForm(p => ({ ...p, daysInProcess: e.target.value }))} className={inputCls} /></div>
                    </div>
                    <Button size="sm" onClick={predictOffer} disabled={loading || !offerForm.basesal || !offerForm.medianBase}>
                        {loading ? 'Predicting…' : 'Predict Acceptance'}
                    </Button>
                    {result && <OfferResult r={result} />}
                </div>
            )}

            {/* Time to Fill */}
            {tab === 'ttf' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2"><label className={labelCls}>Job Title *</label><input value={ttfForm.title} onChange={e => setTtfForm(p => ({ ...p, title: e.target.value }))} className={inputCls} /></div>
                        <div><label className={labelCls}>Department</label><input value={ttfForm.department} onChange={e => setTtfForm(p => ({ ...p, department: e.target.value }))} className={inputCls} /></div>
                        <div><label className={labelCls}>Location</label><input value={ttfForm.location} onChange={e => setTtfForm(p => ({ ...p, location: e.target.value }))} className={inputCls} /></div>
                        <div><label className={labelCls}>Experience Years</label><input type="number" value={ttfForm.expYears} onChange={e => setTtfForm(p => ({ ...p, expYears: e.target.value }))} className={inputCls} /></div>
                        <div className="flex items-center gap-2 self-end pb-1">
                            <input type="checkbox" id="remote" checked={ttfForm.remote} onChange={e => setTtfForm(p => ({ ...p, remote: e.target.checked }))} />
                            <label htmlFor="remote" className="text-sm font-medium">Remote role</label>
                        </div>
                        <div className="col-span-2"><label className={labelCls}>Required Skills (comma-sep)</label><input value={ttfForm.skills} onChange={e => setTtfForm(p => ({ ...p, skills: e.target.value }))} className={inputCls} /></div>
                    </div>
                    <Button size="sm" onClick={predictTTF} disabled={loading || !ttfForm.title}>{loading ? 'Predicting…' : 'Predict Time to Fill'}</Button>
                    {result && <TTFResult r={result} />}
                </div>
            )}

            {/* Retention Risk */}
            {tab === 'retention' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className={labelCls}>Tenure (months) *</label><input type="number" value={retForm.tenure} onChange={e => setRetForm(p => ({ ...p, tenure: e.target.value }))} className={inputCls} /></div>
                        <div><label className={labelCls}>Role *</label><input value={retForm.role} onChange={e => setRetForm(p => ({ ...p, role: e.target.value }))} className={inputCls} /></div>
                        <div><label className={labelCls}>Department</label><input value={retForm.department} onChange={e => setRetForm(p => ({ ...p, department: e.target.value }))} className={inputCls} /></div>
                        <div><label className={labelCls}>Performance Score (0–5)</label><input type="number" min="0" max="5" step="0.5" value={retForm.perf} onChange={e => setRetForm(p => ({ ...p, perf: e.target.value }))} className={inputCls} /></div>
                        <div><label className={labelCls}>Comp vs Market</label>
                            <select value={retForm.compVsMarket} onChange={e => setRetForm(p => ({ ...p, compVsMarket: e.target.value }))} className={inputCls}>
                                {['below', 'at', 'above'].map(v => <option key={v}>{v}</option>)}
                            </select>
                        </div>
                        <div><label className={labelCls}>Manager Changes (12m)</label><input type="number" min="0" value={retForm.managerChanges} onChange={e => setRetForm(p => ({ ...p, managerChanges: e.target.value }))} className={inputCls} /></div>
                        <div><label className={labelCls}>Team Changes (12m)</label><input type="number" min="0" value={retForm.teamChanges} onChange={e => setRetForm(p => ({ ...p, teamChanges: e.target.value }))} className={inputCls} /></div>
                        <div className="flex items-center gap-2 self-end pb-1">
                            <input type="checkbox" id="promo" checked={retForm.recentPromotion} onChange={e => setRetForm(p => ({ ...p, recentPromotion: e.target.checked }))} />
                            <label htmlFor="promo" className="text-sm font-medium">Recent promotion</label>
                        </div>
                    </div>
                    <Button size="sm" onClick={predictRetention} disabled={loading || !retForm.tenure || !retForm.role}>{loading ? 'Predicting…' : 'Predict Retention Risk'}</Button>
                    {result && <RetentionResult r={result} />}
                </div>
            )}

            {/* AI Weights */}
            {tab === 'weights' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Per-tenant calibrated scoring weights, updated automatically every 50 decisions.</p>
                        <Button variant="outline" size="sm" onClick={loadWeights}><RefreshCw size={14} /></Button>
                    </div>
                    {weights ? (
                        <div className="border rounded-xl p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Version {weights.version}</span>
                                <span className="text-xs text-muted-foreground">Trained on {weights.trainedOn} decisions</span>
                            </div>
                            {[
                                ['Skill Match', weights.skillMatch],
                                ['Experience Depth', weights.experienceDepth],
                                ['Evidence Level', weights.evidenceLevel],
                                ['Culture Signals', weights.cultureSignals],
                            ].map(([label, val]) => (
                                <div key={label as string}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="font-medium">{label}</span>
                                        <span className="font-bold">{Math.round((val as number) * 100)}%</span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-primary rounded-full" style={{ width: `${(val as number) * 100}%` }} />
                                    </div>
                                </div>
                            ))}
                            <p className="text-[10px] text-muted-foreground">Last calibrated: {weights.calibratedAt ? new Date(weights.calibratedAt).toLocaleDateString() : 'Never'}</p>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm">Loading weights…</div>
                    )}
                </div>
            )}
        </div>
    );
}

function OfferResult({ r }: { r: any }) {
    const pct = Math.round(r.probability * 100);
    const color = pct >= 70 ? 'text-green-600' : pct >= 40 ? 'text-yellow-600' : 'text-red-600';
    return (
        <div className="border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-4">
                <div className={cn('text-4xl font-black', color)}>{pct}%</div>
                <div>
                    <p className="font-bold text-sm">Acceptance Probability</p>
                    <p className="text-xs text-muted-foreground capitalize">Confidence: {r.confidence}</p>
                </div>
            </div>
            {r.drivers?.length > 0 && (
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Key Drivers</p>
                    <div className="space-y-1.5">
                        {r.drivers.map((d: any, i: number) => (
                            <div key={i} className="flex gap-2 items-start">
                                <span className={cn('text-xs mt-0.5', d.impact === 'positive' ? 'text-green-500' : 'text-red-500')}>{d.impact === 'positive' ? '▲' : '▼'}</span>
                                <div><p className="text-xs font-medium">{d.factor}</p><p className="text-[11px] text-muted-foreground">{d.reasoning}</p></div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {r.recommendations?.length > 0 && (
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Recommendations</p>
                    <ul className="space-y-1">{r.recommendations.map((rec: string, i: number) => <li key={i} className="text-xs text-muted-foreground">• {rec}</li>)}</ul>
                </div>
            )}
        </div>
    );
}

function TTFResult({ r }: { r: any }) {
    return (
        <div className="border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-4">
                <div className="text-4xl font-black">{r.estimatedDays}</div>
                <div>
                    <p className="font-bold text-sm">Estimated Days to Fill</p>
                    <p className="text-xs text-muted-foreground">Range: {r.confidenceInterval?.[0]}–{r.confidenceInterval?.[1]} days (P25–P75)</p>
                </div>
            </div>
            {r.riskFactors?.length > 0 && (
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Risk Factors</p>
                    <ul className="space-y-1">{r.riskFactors.map((f: string, i: number) => <li key={i} className="text-xs text-muted-foreground">⚠ {f}</li>)}</ul>
                </div>
            )}
            {r.recommendations?.length > 0 && (
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Recommendations</p>
                    <ul className="space-y-1">{r.recommendations.map((rec: string, i: number) => <li key={i} className="text-xs text-muted-foreground">• {rec}</li>)}</ul>
                </div>
            )}
        </div>
    );
}

function RetentionResult({ r }: { r: any }) {
    const color = r.riskLevel === 'low' ? 'text-green-600' : r.riskLevel === 'medium' ? 'text-yellow-600' : 'text-red-600';
    return (
        <div className="border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-4">
                <div className={cn('text-4xl font-black capitalize', color)}>{r.riskLevel}</div>
                <div>
                    <p className="font-bold text-sm">Retention Risk</p>
                    <p className="text-xs text-muted-foreground">Risk score: {Math.round(r.riskScore * 100)}%</p>
                </div>
            </div>
            {r.drivers?.length > 0 && (
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Drivers</p>
                    <ul className="space-y-1">{r.drivers.map((d: any, i: number) => <li key={i} className="text-xs text-muted-foreground">• <span className="font-medium">{d.factor}:</span> {d.impact}</li>)}</ul>
                </div>
            )}
            {r.recommendations?.length > 0 && (
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Recommendations</p>
                    <ul className="space-y-1">{r.recommendations.map((rec: string, i: number) => <li key={i} className="text-xs text-muted-foreground">• {rec}</li>)}</ul>
                </div>
            )}
        </div>
    );
}

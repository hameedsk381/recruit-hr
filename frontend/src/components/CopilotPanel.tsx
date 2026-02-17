import { useState } from 'react';
import { useApp } from '../context/AppContext';
import api from '../api/client';
import type { CopilotAction } from '../types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
    X,
    Sparkles,
    Send,
    FileText,
    ArrowRightLeft,
    Mic,
    HelpCircle,
    Info
} from 'lucide-react';
import { cn } from "@/lib/utils";

export default function CopilotPanel() {
    const {
        copilot,
        toggleCopilot,
        setCopilotLoading,
        executeCopilotAction,
        candidates,
        job,
        selectedCandidateId,
    } = useApp();

    const [customQuery, setCustomQuery] = useState('');
    const [compareMode, setCompareMode] = useState(false);
    const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

    const selectedCandidate = candidates.find(c => c.id === selectedCandidateId);

    const handleAction = async (type: CopilotAction['type']) => {
        if (type === 'compare') {
            setCompareMode(true);
            return;
        }

        const queryMap: Record<string, string> = {
            summarize: "Please provide a detailed summary of this candidate's fit.",
            interview_probes: "Generate focused interview questions for this candidate.",
            clarify: "Explain the main risks associated with this candidate."
        };

        const query = queryMap[type] || type;
        setCopilotLoading(true);

        try {
            const res = await api.askCopilot(query, selectedCandidateId || undefined, {
                candidate: selectedCandidate,
                job: job
            });

            if (res.success) {
                const action: CopilotAction = {
                    type,
                    context: selectedCandidateId || undefined,
                    timestamp: new Date().toISOString(),
                };
                executeCopilotAction(action, res.response);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setCopilotLoading(false);
        }
    };

    const handleCompare = async () => {
        if (selectedForCompare.length < 2) return;

        const selectedCandidates = selectedForCompare.map(id =>
            candidates.find(c => c.id === id)
        ).filter(Boolean);

        const names = selectedCandidates.map(c => c?.profile.name);
        const query = `Compare these candidates: ${names.join(', ')}. Highlight technical differences and fit levels.`;

        setCopilotLoading(true);
        try {
            const res = await api.askCopilot(query, undefined, {
                candidates: selectedCandidates,
                job: job
            });

            if (res.success) {
                const action: CopilotAction = {
                    type: 'compare',
                    context: names[0] || 'Candidates',
                    compare_with: selectedForCompare.slice(1),
                    timestamp: new Date().toISOString(),
                };
                executeCopilotAction(action, res.response);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setCopilotLoading(false);
            setCompareMode(false);
            setSelectedForCompare([]);
        }
    };

    const handleCustomQuery = async () => {
        if (!customQuery.trim()) return;

        const queryText = customQuery;
        setCustomQuery('');
        setCopilotLoading(true);

        try {
            const res = await api.askCopilot(queryText, selectedCandidateId || undefined, {
                candidate: selectedCandidate,
                job: job
            });

            if (res.success) {
                const action: CopilotAction = {
                    type: 'clarify',
                    context: queryText,
                    timestamp: new Date().toISOString(),
                };
                executeCopilotAction(action, res.response);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setCopilotLoading(false);
        }
    };

    const toggleCompareSelection = (id: string) => {
        if (selectedForCompare.includes(id)) {
            setSelectedForCompare(selectedForCompare.filter(x => x !== id));
        } else if (selectedForCompare.length < 3) {
            setSelectedForCompare([...selectedForCompare, id]);
        }
    };

    if (!copilot.isOpen) return null;

    const actions = [
        {
            type: 'summarize' as const,
            icon: <FileText className="size-4" />,
            label: 'Summarize',
            description: 'Executive summary',
            disabled: !selectedCandidateId,
        },
        {
            type: 'compare' as const,
            icon: <ArrowRightLeft className="size-4" />,
            label: 'Compare',
            description: 'Compare candidates',
            disabled: candidates.filter(c => !c.removed).length < 2,
        },
        {
            type: 'interview_probes' as const,
            icon: <Mic className="size-4" />,
            label: 'Interview',
            description: 'Generate questions',
            disabled: !selectedCandidateId,
        },
        {
            type: 'clarify' as const,
            icon: <HelpCircle className="size-4" />,
            label: 'Clarify',
            description: 'Explain risks',
            disabled: !selectedCandidateId,
        },
    ];

    return (
        <aside className="fixed inset-y-0 right-0 z-40 w-96 bg-background border-l shadow-2xl flex flex-col transition-transform duration-300 transform translate-x-0">
            {/* Header */}
            <header className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2 font-semibold">
                    <Sparkles className="size-5 text-primary" />
                    Copilot
                </div>
                <Button variant="ghost" size="icon" onClick={toggleCopilot} aria-label="Close Copilot">
                    <X className="size-4" />
                </Button>
            </header>

            {/* Context */}
            {selectedCandidate && (
                <div className="px-4 py-2 bg-muted/50 text-xs flex items-center justify-between border-b">
                    <span className="text-muted-foreground">Viewing:</span>
                    <span className="font-medium text-foreground">{selectedCandidate.profile.name}</span>
                </div>
            )}

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Actions or Compare Mode */}
                {compareMode ? (
                    <Card className="border-primary/20 bg-primary/5">
                        <CardContent className="p-4 space-y-4">
                            <h4 className="font-medium text-sm flex items-center gap-2">
                                <ArrowRightLeft className="size-4" /> Select 2-3 to compare
                            </h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {candidates.filter(c => !c.removed).map(candidate => (
                                    <div
                                        key={candidate.id}
                                        className={cn(
                                            "flex items-center space-x-2 p-2 rounded-md border text-sm cursor-pointer hover:bg-muted",
                                            selectedForCompare.includes(candidate.id) ? "border-primary bg-primary/10" : "border-transparent bg-background"
                                        )}
                                        onClick={() => toggleCompareSelection(candidate.id)}
                                    >
                                        <Checkbox
                                            checked={selectedForCompare.includes(candidate.id)}
                                            onCheckedChange={() => toggleCompareSelection(candidate.id)}
                                            disabled={!selectedForCompare.includes(candidate.id) && selectedForCompare.length >= 3}
                                            id={`compare-${candidate.id}`}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="truncate font-medium">{candidate.profile.name}</div>
                                        </div>
                                        <Badge variant={
                                            candidate.assessment.fit_assessment.overall_fit === 'high' ? 'default' :
                                                candidate.assessment.fit_assessment.overall_fit === 'medium' ? 'secondary' : 'destructive'
                                        } className="text-[10px] h-5 px-1.5">
                                            {candidate.assessment.fit_assessment.overall_fit}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2 justify-end pt-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setCompareMode(false);
                                        setSelectedForCompare([]);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleCompare}
                                    disabled={selectedForCompare.length < 2}
                                >
                                    Compare ({selectedForCompare.length})
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {actions.map((action) => (
                            <Button
                                key={action.type}
                                variant="outline"
                                className="h-auto flex flex-col items-start p-3 gap-2 text-left hover:border-primary hover:bg-primary/5 transition-colors"
                                onClick={() => handleAction(action.type)}
                                disabled={action.disabled}
                            >
                                <div className="p-1.5 bg-muted rounded-md text-foreground">
                                    {action.icon}
                                </div>
                                <div>
                                    <div className="font-semibold text-sm">{action.label}</div>
                                    <div className="text-xs text-muted-foreground line-clamp-1">{action.description}</div>
                                </div>
                            </Button>
                        ))}
                    </div>
                )}

                {/* History */}
                <div className="space-y-4">
                    {copilot.isLoading && (
                        <div className="flex items-center justify-center p-4 text-muted-foreground text-sm gap-2 animate-pulse">
                            <Sparkles className="size-4" />
                            <span>Generating response...</span>
                        </div>
                    )}

                    {copilot.history.length > 0 ? (
                        copilot.history.slice().reverse().map((item, index) => (
                            <div key={index} className="space-y-2 animate-in slide-in-from-bottom-5 fade-in duration-300">
                                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                                    <span className="flex items-center gap-1 font-medium text-primary uppercase">
                                        {item.action.type === 'summarize' && <><FileText className="size-3" /> Summary</>}
                                        {item.action.type === 'compare' && <><ArrowRightLeft className="size-3" /> Comparison</>}
                                        {item.action.type === 'interview_probes' && <><Mic className="size-3" /> Interview Prep</>}
                                        {item.action.type === 'clarify' && <><HelpCircle className="size-3" /> Clarification</>}
                                    </span>
                                    <span>
                                        {new Date(item.action.timestamp).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                </div>
                                <Card className="bg-muted/30">
                                    <CardContent className="p-4 text-sm prose prose-sm max-w-none dark:prose-invert">
                                        <div
                                            dangerouslySetInnerHTML={{
                                                __html: item.response
                                                    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>')
                                                    .replace(/\n/g, '<br/>')
                                                    .replace(/• /g, '&bull; ')
                                            }}
                                        />
                                    </CardContent>
                                </Card>
                            </div>
                        ))
                    ) : !copilot.isLoading && (
                        <div className="py-12 flex flex-col items-center justify-center text-center text-muted-foreground opacity-50 space-y-2">
                            <Sparkles className="size-12" />
                            <h4 className="font-medium">Ready to assist</h4>
                            <p className="text-sm max-w-[200px]">
                                Select an action above to get AI-powered insights.
                                {!selectedCandidateId && ' Select a candidate first for personalized assistance.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Input Footer */}
            <div className="p-4 border-t bg-background space-y-2">
                <div className="relative">
                    <Input
                        value={customQuery}
                        onChange={(e) => setCustomQuery(e.target.value)}
                        placeholder="Ask a question about this candidate..."
                        onKeyDown={(e) => e.key === 'Enter' && handleCustomQuery()}
                        className="pr-10"
                    />
                    <Button
                        size="icon"
                        className="absolute right-0 top-0 h-full w-10 rounded-l-none"
                        onClick={handleCustomQuery}
                        disabled={!customQuery.trim()}
                    >
                        <Send className="size-4" />
                    </Button>
                </div>
                <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground bg-muted/30 p-2 rounded">
                    <Info className="size-3 mt-0.5 shrink-0" />
                    <p>Copilot uses only the data shown in this interface. All responses are traceable.</p>
                </div>
            </div>
        </aside>
    );
}

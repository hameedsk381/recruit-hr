import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Star,
    Plus,
    X,
    ThumbsUp,
    ThumbsDown,
    Sparkles,
    Send
} from 'lucide-react';
import api from '../api/client';

interface ScorecardProps {
    interview: {
        id: string;
        candidateId: string;
        candidateName: string;
        jobId: string;
        jobTitle: string;
        focusAreas?: Array<{ topic: string; why: string; sample_probe_question: string }>;
    };
    onClose: () => void;
    onSubmit: () => void;
}

const RATING_CATEGORIES = [
    'Technical Skills',
    'Problem Solving',
    'Communication',
    'Culture Fit',
    'Leadership Potential'
];

const RECOMMENDATIONS = [
    { value: 'strong_hire', label: 'Strong Hire', color: 'bg-green-500', icon: ThumbsUp },
    { value: 'hire', label: 'Hire', color: 'bg-emerald-400', icon: ThumbsUp },
    { value: 'no_hire', label: 'No Hire', color: 'bg-orange-400', icon: ThumbsDown },
    { value: 'strong_no_hire', label: 'Strong No Hire', color: 'bg-red-500', icon: ThumbsDown },
];

export default function ScorecardDialog({ interview, onClose, onSubmit }: ScorecardProps) {
    const [ratings, setRatings] = useState<Record<string, number>>(
        Object.fromEntries(RATING_CATEGORIES.map(c => [c, 0]))
    );
    const [ratingNotes, setRatingNotes] = useState<Record<string, string>>({});
    const [strengths, setStrengths] = useState<string[]>([]);
    const [newStrength, setNewStrength] = useState('');
    const [improvements, setImprovements] = useState<string[]>([]);
    const [newImprovement, setNewImprovement] = useState('');
    const [recommendation, setRecommendation] = useState<string>('');
    const [additionalNotes, setAdditionalNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const averageScore = Object.values(ratings).filter(r => r > 0).length > 0
        ? (Object.values(ratings).reduce((a, b) => a + b, 0) / Object.values(ratings).filter(r => r > 0).length).toFixed(1)
        : '0.0';

    const handleSubmit = async () => {
        if (!recommendation) {
            alert('Please select a recommendation');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.submitScorecard({
                interviewId: interview.id,
                candidateId: interview.candidateId,
                candidateName: interview.candidateName,
                jobId: interview.jobId,
                jobTitle: interview.jobTitle,
                ratings: RATING_CATEGORIES.map(category => ({
                    category,
                    score: ratings[category],
                    notes: ratingNotes[category] || ''
                })),
                overallScore: parseFloat(averageScore),
                recommendation,
                strengths,
                areasForImprovement: improvements,
                additionalNotes
            });
            onSubmit();
        } catch (err) {
            console.error('Failed to submit scorecard', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const addStrength = () => {
        if (newStrength.trim()) {
            setStrengths([...strengths, newStrength.trim()]);
            setNewStrength('');
        }
    };

    const addImprovement = () => {
        if (newImprovement.trim()) {
            setImprovements([...improvements, newImprovement.trim()]);
            setNewImprovement('');
        }
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="size-5 text-primary" />
                        Interview Scorecard
                    </DialogTitle>
                    <DialogDescription>
                        <span className="font-semibold">{interview.candidateName}</span> for <span className="font-semibold">{interview.jobTitle}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* AI Focus Areas Reminder */}
                    {interview.focusAreas && interview.focusAreas.length > 0 && (
                        <Card className="bg-primary/5 border-primary/10">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Sparkles className="size-4" />
                                    AI Suggested Focus Areas
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <ul className="text-sm space-y-1">
                                    {interview.focusAreas.map((fa, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <Badge variant="outline" className="shrink-0">{i + 1}</Badge>
                                            <span>{fa.topic}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}

                    {/* Ratings Grid */}
                    <div>
                        <h4 className="font-semibold mb-3">Skill Ratings</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {RATING_CATEGORIES.map(category => (
                                <Card key={category} className="p-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-medium text-sm">{category}</span>
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <button
                                                    key={star}
                                                    onClick={() => setRatings({ ...ratings, [category]: star })}
                                                    className="p-0.5 hover:scale-110 transition-transform"
                                                >
                                                    <Star
                                                        className={`size-5 ${ratings[category] >= star ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <Textarea
                                        placeholder={`Notes for ${category}...`}
                                        value={ratingNotes[category] || ''}
                                        onChange={(e) => setRatingNotes({ ...ratingNotes, [category]: e.target.value })}
                                        className="text-xs h-16 resize-none"
                                    />
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Strengths */}
                    <div>
                        <h4 className="font-semibold mb-2">Key Strengths</h4>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {strengths.map((s, i) => (
                                <Badge key={i} variant="secondary" className="gap-1 pr-1">
                                    {s}
                                    <button onClick={() => setStrengths(strengths.filter((_, idx) => idx !== i))}>
                                        <X className="size-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newStrength}
                                onChange={(e) => setNewStrength(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addStrength()}
                                placeholder="Add a strength..."
                                className="flex-1 px-3 py-1.5 rounded-md border text-sm"
                            />
                            <Button size="sm" variant="outline" onClick={addStrength}>
                                <Plus className="size-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Areas for Improvement */}
                    <div>
                        <h4 className="font-semibold mb-2">Areas for Improvement</h4>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {improvements.map((s, i) => (
                                <Badge key={i} variant="outline" className="gap-1 pr-1 border-orange-300 text-orange-600">
                                    {s}
                                    <button onClick={() => setImprovements(improvements.filter((_, idx) => idx !== i))}>
                                        <X className="size-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newImprovement}
                                onChange={(e) => setNewImprovement(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addImprovement()}
                                placeholder="Add an area for improvement..."
                                className="flex-1 px-3 py-1.5 rounded-md border text-sm"
                            />
                            <Button size="sm" variant="outline" onClick={addImprovement}>
                                <Plus className="size-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Recommendation */}
                    <div>
                        <h4 className="font-semibold mb-3">Final Recommendation</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {RECOMMENDATIONS.map(rec => (
                                <button
                                    key={rec.value}
                                    onClick={() => setRecommendation(rec.value)}
                                    className={`p-3 rounded-lg border-2 transition-all ${recommendation === rec.value
                                        ? 'border-primary bg-primary/10'
                                        : 'border-transparent bg-muted hover:bg-muted/80'
                                        }`}
                                >
                                    <rec.icon className={`size-5 mx-auto mb-1 ${rec.color.replace('bg-', 'text-')}`} />
                                    <div className="text-xs font-medium">{rec.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Additional Notes */}
                    <div>
                        <h4 className="font-semibold mb-2">Additional Notes</h4>
                        <Textarea
                            placeholder="Any other observations, concerns, or highlights..."
                            value={additionalNotes}
                            onChange={(e) => setAdditionalNotes(e.target.value)}
                            className="h-24"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center pt-4 border-t">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Average Score:</span>
                        <Badge variant="default" className="text-lg px-3 py-1">
                            {averageScore} / 5
                        </Badge>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
                            {isSubmitting ? (
                                <span className="animate-spin">⏳</span>
                            ) : (
                                <Send className="size-4" />
                            )}
                            Submit Scorecard
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

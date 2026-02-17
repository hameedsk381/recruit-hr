import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Users,
    MoreVertical,
    Sparkles,
    MessageSquare,
    Briefcase,
    Activity
} from 'lucide-react';
import type { PipelineStage, ShortlistCandidate } from '../types';

const STAGES: { id: PipelineStage; label: string; color: string }[] = [
    { id: 'applied', label: 'Applied', color: 'bg-slate-500' },
    { id: 'shortlisted', label: 'Shortlisted', color: 'bg-blue-500' },
    { id: 'technical', label: 'Technical Interview', color: 'bg-purple-500' },
    { id: 'culture', label: 'Culture Fit', color: 'bg-indigo-500' },
    { id: 'pending', label: 'Decision Pending', color: 'bg-orange-500' },
    { id: 'offer', label: 'Offer', color: 'bg-green-500' },
];

export default function Pipeline() {
    const { candidates, updateCandidateStage, selectCandidate, interviews, setView } = useApp();

    const candidatesByStage = useMemo(() => {
        const acc: Record<PipelineStage, ShortlistCandidate[]> = {
            applied: [],
            shortlisted: [],
            technical: [],
            culture: [],
            pending: [],
            offer: []
        };
        candidates.filter(c => !c.removed).forEach(c => {
            const stage = c.stage || 'applied';
            if (acc[stage]) {
                acc[stage].push(c);
            }
        });
        return acc;
    }, [candidates]);

    const getInterviewForCandidate = (candidateId: string, stage: PipelineStage) => {
        return interviews.find(i =>
            i.candidateId === candidateId &&
            (stage === 'technical' ? i.type === 'technical' : i.type === 'culture')
        );
    };

    const onDragEnd = (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        updateCandidateStage(draggableId, destination.droppableId as PipelineStage);
    };

    return (
        <div className="h-full flex flex-col space-y-6 p-8 overflow-hidden bg-slate-50/50">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Recruitment Pipeline</h1>
                    <p className="text-muted-foreground mt-1 text-lg">Manage candidates via drag-and-drop workflow.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="px-4 py-1.5 gap-2 bg-white/50 backdrop-blur-sm border-slate-200 shadow-sm">
                        <Users className="size-4 text-primary" />
                        <span className="font-bold">{candidates.filter(c => !c.removed).length} Candidates</span>
                    </Badge>
                </div>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex gap-6 overflow-x-auto pb-6 h-full items-start scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                    {STAGES.map(stage => (
                        <div key={stage.id} className="flex-shrink-0 w-80 flex flex-col max-h-full">
                            <div className="flex items-center justify-between mb-4 px-2">
                                <div className="flex items-center gap-2">
                                    <div className={`size-3 rounded-full ${stage.color} shadow-sm ring-4 ring-white`} />
                                    <h3 className="font-bold text-xs uppercase tracking-widest text-slate-500">
                                        {stage.label}
                                    </h3>
                                    <span className="bg-slate-200/50 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-black">
                                        {candidatesByStage[stage.id].length}
                                    </span>
                                </div>
                            </div>

                            <Droppable droppableId={stage.id}>
                                {(provided, snapshot) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={`flex-1 rounded-3xl p-3 transition-all min-h-[500px] flex flex-col gap-3 ${snapshot.isDraggingOver ? 'bg-primary/10 border-2 border-dashed border-primary/30 ring-4 ring-primary/5' : 'bg-slate-200/40'
                                            }`}
                                    >
                                        {candidatesByStage[stage.id].length > 0 ? (
                                            candidatesByStage[stage.id].map((candidate, index) => {
                                                const interview = (stage.id === 'technical' || stage.id === 'culture')
                                                    ? getInterviewForCandidate(candidate.id, stage.id)
                                                    : null;

                                                return (
                                                    <Draggable key={candidate.id} draggableId={candidate.id} index={index}>
                                                        {(provided, snapshot) => (
                                                            <Card
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                className={`border-none shadow-sm hover:shadow-xl transition-all group cursor-pointer overflow-hidden ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-primary scale-[1.05] z-50' : 'hover:-translate-y-1'
                                                                    } bg-white`}
                                                                onClick={() => selectCandidate(candidate.id)}
                                                            >
                                                                <div className={`h-1 w-full ${stage.color} opacity-60`} />
                                                                <CardContent className="p-4 space-y-4">
                                                                    <div className="flex justify-between items-start">
                                                                        <div className="space-y-1">
                                                                            <h4 className="font-extrabold text-[15px] text-slate-800 leading-tight">
                                                                                {candidate.profile.name}
                                                                            </h4>
                                                                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                                                                                <Briefcase className="size-3 opacity-60" />
                                                                                {candidate.profile.recent_role?.title || 'Unknown Role'}
                                                                            </p>
                                                                        </div>
                                                                        <div className="size-8 rounded-lg bg-slate-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-slate-100">
                                                                            <MoreVertical className="size-4 text-slate-400" />
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400">
                                                                            <Activity className="size-3" />
                                                                            RANK #{candidate.rank}
                                                                        </div>
                                                                        <Badge className={`${candidate.assessment.fit_assessment.overall_fit === 'high' ? 'bg-green-500/10 text-green-600' :
                                                                                candidate.assessment.fit_assessment.overall_fit === 'medium' ? 'bg-blue-500/10 text-blue-600' :
                                                                                    'bg-orange-500/10 text-orange-600'
                                                                            } border-none text-[9px] font-black px-2 py-0.5 rounded-md`}>
                                                                            {candidate.assessment.fit_assessment.overall_fit.toUpperCase()} FIT
                                                                        </Badge>
                                                                    </div>

                                                                    {(stage.id === 'technical' || stage.id === 'culture') && (
                                                                        <div className={`p-2 rounded-xl text-[10px] flex items-center justify-between font-bold ${interview ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-orange-50 text-orange-700 border border-orange-100'
                                                                            }`}>
                                                                            <div className="flex items-center gap-2">
                                                                                <div className={`size-1.5 rounded-full animate-pulse ${interview ? 'bg-green-500' : 'bg-orange-500'}`} />
                                                                                {interview ? 'Interview Scheduled' : 'Awaiting Schedule'}
                                                                            </div>
                                                                            {!interview && (
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setView('interviews');
                                                                                    }}
                                                                                    className="bg-orange-600 text-white px-2 py-1 rounded-md hover:bg-orange-700 transition-colors"
                                                                                >
                                                                                    Fix Now
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                                                                        <div className="flex gap-2.5">
                                                                            <div className="flex items-center gap-1">
                                                                                <Sparkles className="size-3 text-yellow-500 fill-yellow-500/20" />
                                                                                <span className="text-[10px] font-bold text-slate-400">{candidate.assessment.strengths.length}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-1">
                                                                                <MessageSquare className="size-3 text-blue-400" />
                                                                                <span className="text-[10px] font-bold text-slate-400">{candidate.assessment.interview_focus_areas.length}</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-[10px] font-bold text-primary group-hover:underline underline-offset-2">
                                                                            Profile →
                                                                        </div>
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        )}
                                                    </Draggable>
                                                );
                                            })
                                        ) : (
                                            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-2 opacity-50 select-none px-6 text-center">
                                                <div className="size-12 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center mb-2">
                                                    <Users className="size-6" />
                                                </div>
                                                <span className="text-[10px] font-bold uppercase tracking-widest">No candidates in {stage.label}</span>
                                            </div>
                                        )}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    ))}
                </div>
            </DragDropContext>
        </div>
    );
}



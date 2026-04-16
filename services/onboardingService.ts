
import { ObjectId } from "mongodb";
import { getMongoDb } from "../utils/mongoClient";

export interface OnboardingTask {
    id: string;
    title: string;
    category: 'document' | 'it_access' | 'training' | 'meeting' | 'compliance';
    assignedTo: 'candidate' | 'hr' | 'manager' | 'it';
    status: 'pending' | 'completed' | 'overdue';
    dueDate: Date;
}

export interface OnboardingRecord {
    _id?: ObjectId;
    tenantId: string;
    candidateId: ObjectId;
    offerId: ObjectId;
    employeeId: string;
    status: 'preboarding' | 'day_one' | 'first_week' | 'first_month' | 'completed';
    tasks: OnboardingTask[];
    startDate: Date;
    createdAt: Date;
}

export class OnboardingService {
    static async initiate(tenantId: string, candidateId: string, offerId: string, startDate: Date, templateId?: string) {
        const db = getMongoDb();
        
        let tasks: OnboardingTask[] = [];

        if (templateId) {
            const template = await db.collection('onboarding_templates').findOne({ _id: new ObjectId(templateId), tenantId });
            if (template) {
                tasks = template.tasks.map((t: any) => ({
                    ...t,
                    status: 'pending',
                    dueDate: new Date(startDate.getTime() + (t.dayOffset || 0) * 86400000)
                }));
            }
        }

        // Fallback to defaults if no template or template not found
        if (tasks.length === 0) {
            tasks = [
                { id: '1', title: 'Sign Employment Agreement', category: 'document', assignedTo: 'candidate', status: 'pending', dueDate: startDate },
                { id: '2', title: 'IT Asset Provisioning', category: 'it_access', assignedTo: 'it', status: 'pending', dueDate: startDate },
                { id: '3', title: 'Welcome Meeting', category: 'meeting', assignedTo: 'manager', status: 'pending', dueDate: startDate }
            ];
        }

        const record: OnboardingRecord = {
            tenantId,
            candidateId: new ObjectId(candidateId),
            offerId: new ObjectId(offerId),
            employeeId: `EMP_${Math.random().toString(36).substring(7).toUpperCase()}`,
            status: 'preboarding',
            tasks,
            startDate,
            createdAt: new Date()
        };

        const result = await db.collection('onboarding').insertOne(record);
        return { success: true, id: result.insertedId, employeeId: record.employeeId };
    }

    static async getRecord(tenantId: string, id: string) {
        const db = getMongoDb();
        return await db.collection('onboarding').findOne({ _id: new ObjectId(id), tenantId });
    }

    static async updateTaskStatus(tenantId: string, recordId: string, taskId: string, status: OnboardingTask['status']) {
        const db = getMongoDb();
        await db.collection('onboarding').updateOne(
            { _id: new ObjectId(recordId), tenantId, "tasks.id": taskId },
            { $set: { "tasks.$.status": status, "tasks.$.completedAt": status === 'completed' ? new Date() : null } }
        );
    }
}

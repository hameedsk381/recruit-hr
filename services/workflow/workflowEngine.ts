
import { getMongoDb } from '../../utils/mongoClient';
import { NotificationService } from '../notificationService';
import { ObjectId } from 'mongodb';
import { JobBoardService } from '../jobBoardService';

export interface WorkflowNode {
    id: string;
    type: 'action' | 'condition' | 'delay' | 'approval' | 'notification' | 'integration';
    config: any;
}

export interface WorkflowEdge {
    source: string;
    target: string;
    condition?: string;
}

export interface WorkflowDefinition {
    _id?: ObjectId;
    tenantId: string;
    name: string;
    trigger: string;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    isActive: boolean;
}

export class WorkflowEngine {
    static async execute(tenantId: string, trigger: string, payload: any) {
        const db = getMongoDb();
        const workflows = await db.collection('workflows').find({ 
            tenantId, 
            trigger, 
            isActive: true 
        }).toArray() as unknown as WorkflowDefinition[];

        for (const workflow of workflows) {
            await this.runWorkflowInstance(workflow, payload);
        }
    }

    private static async runWorkflowInstance(workflow: WorkflowDefinition, initialPayload: any) {
        // Find start nodes (nodes with no incoming edges)
        const startNodes = workflow.nodes.filter(node => 
            !workflow.edges.some(edge => edge.target === node.id)
        );

        for (const node of startNodes) {
            await this.executeNode(node, workflow, initialPayload);
        }
    }

    private static async executeNode(node: WorkflowNode, workflow: WorkflowDefinition, payload: any) {
        console.log(`[WorkflowEngine] Executing node ${node.id} (${node.type})`);
        
        let shouldContinue = true;
        let nextPayload = { ...payload };

        try {
            switch (node.type) {
                case 'notification':
                    await this.handleNotification(node.config, workflow.tenantId, payload);
                    break;
                case 'condition':
                    shouldContinue = this.evaluateCondition(node.config, payload);
                    break;
                case 'integration':
                    nextPayload = await this.handleIntegration(node.config, workflow.tenantId, payload);
                    break;
                // Other types like 'delay' or 'approval' would involve state persistence and timers
                default:
                    console.warn(`[WorkflowEngine] Node type ${node.type} not yet implemented`);
            }
        } catch (error) {
            console.error(`[WorkflowEngine] Node ${node.id} failed:`, error);
            shouldContinue = false;
        }

        if (shouldContinue) {
            const nextEdges = workflow.edges.filter(edge => edge.source === node.id);
            for (const edge of nextEdges) {
                const nextNode = workflow.nodes.find(n => n.id === edge.target);
                if (nextNode) {
                    await this.executeNode(nextNode, workflow, nextPayload);
                }
            }
        }
    }

    private static async handleNotification(config: any, tenantId: string, payload: any) {
        await NotificationService.dispatch({
            tenantId,
            recipientEmail: config.recipientEmail || payload.email,
            title: this.interpolate(config.title, payload),
            message: this.interpolate(config.message, payload),
            channels: config.channels || ['EMAIL']
        });
    }

    private static evaluateCondition(config: any, payload: any): boolean {
        // Simple evaluator: config.field, config.operator, config.value
        const { field, operator, value } = config;
        const fieldValue = payload[field];

        switch (operator) {
            case '===': return fieldValue === value;
            case '!==': return fieldValue !== value;
            case '>': return Number(fieldValue) > Number(value);
            case '<': return Number(fieldValue) < Number(value);
            case 'includes': return String(fieldValue).includes(String(value));
            default: return true;
        }
    }

    private static async handleIntegration(config: any, tenantId: string, payload: any) {
        // Example: Push to Job Board when a requisition is approved
        if (config.integrationType === 'job_board_publish') {
            // Implementation would call JobBoardService
            console.log(`[WorkflowEngine] Integration: Publishing to ${config.platform}`);
        }
        return payload;
    }

    private static interpolate(str: string, payload: any): string {
        return str.replace(/\{\{(.*?)\}\}/g, (_, key) => payload[key.trim()] || '');
    }
}

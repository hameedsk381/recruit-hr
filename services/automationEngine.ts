import { getMongoDb } from '../utils/mongoClient';
import { NotificationService } from './notificationService';
import { SequenceEngine } from './nurture/sequenceEngine';
import { ObjectId } from 'mongodb';

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'delay';
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
  trigger: string; // e.g., 'CANDIDATE_APPLIED', 'ASSESSMENT_COMPLETED'
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  isActive: boolean;
}

export class AutomationEngine {
  
  static async executeWorkflow(tenantId: string, trigger: string, payload: any) {
    const db = getMongoDb();
    const workflows = await db.collection('workflows').find({ 
      tenantId, 
      trigger, 
      isActive: true 
    }).toArray() as WorkflowDefinition[];

    for (const workflow of workflows) {
      await this.runWorkflow(workflow, payload);
    }
  }

  private static async runWorkflow(workflow: WorkflowDefinition, payload: any) {
    console.log(`[AutomationEngine] Starting workflow: ${workflow.name}`);
    
    // Start with the trigger node
    const triggerNode = workflow.nodes.find(n => n.type === 'trigger');
    if (!triggerNode) return;

    let currentNodes = this.getNeighbors(workflow, triggerNode.id);

    while (currentNodes.length > 0) {
      const nextBatch: string[] = [];
      
      for (const nodeId of currentNodes) {
        const node = workflow.nodes.find(n => n.id === nodeId);
        if (!node) continue;

        const shouldContinue = await this.executeNode(workflow.tenantId, node, payload);
        
        if (shouldContinue) {
          const neighbors = this.getNeighbors(workflow, node.id);
          nextBatch.push(...neighbors);
        }
      }
      
      currentNodes = nextBatch;
    }
  }

  private static getNeighbors(workflow: WorkflowDefinition, nodeId: string): string[] {
    return workflow.edges
      .filter(e => e.source === nodeId)
      .map(e => e.target);
  }

  private static async executeNode(tenantId: string, node: WorkflowNode, payload: any): Promise<boolean> {
    console.log(`[AutomationEngine] Executing node: ${node.id} (${node.type})`);

    switch (node.type) {
      case 'action':
        return await this.handleAction(tenantId, node.config, payload);
      case 'condition':
        return this.handleCondition(node.config, payload);
      case 'delay':
        // For delays, we would typically enqueue a future job
        console.log(`[AutomationEngine] Delay node encountered. Not implemented in sync runner.`);
        return false;
      default:
        return true;
    }
  }

  private static async handleAction(tenantId: string, config: any, payload: any): Promise<boolean> {
    const { actionType } = config;

    try {
      if (actionType === 'SEND_EMAIL') {
        await NotificationService.dispatch({
          tenantId,
          recipientEmail: config.recipient || payload.email,
          title: config.subject,
          message: config.body,
          channels: ['EMAIL']
        });
      } else if (actionType === 'ENROLL_NURTURE') {
        await SequenceEngine.enroll(tenantId, payload.profileId, config.sequenceId);
      }
      return true;
    } catch (e) {
      console.error(`[AutomationEngine] Action failed:`, e);
      return false;
    }
  }

  private static handleCondition(config: any, payload: any): boolean {
    const { field, operator, value } = config;
    const actualValue = payload[field];

    switch (operator) {
      case 'gt': return actualValue > value;
      case 'lt': return actualValue < value;
      case 'eq': return actualValue === value;
      case 'contains': return Array.isArray(actualValue) && actualValue.includes(value);
      default: return false;
    }
  }
}

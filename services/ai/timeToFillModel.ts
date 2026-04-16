import { hybridChatCompletion } from '../llmRouter';
import { getMongoDb } from '../../utils/mongoClient';

export interface TimeToFillPrediction {
  estimatedDays: number;
  confidenceInterval: [number, number];
  riskFactors: string[];
  recommendations: string[];
}

interface RequisitionInput {
  title: string;
  department?: string;
  location?: string;
  skills?: string[];
  experienceYears?: number;
  remote?: boolean;
}

export class TimeToFillModel {
  static async predict(
    tenantId: string,
    requisition: RequisitionInput
  ): Promise<TimeToFillPrediction> {
    // Pull historical fill times for this tenant
    const db = getMongoDb();
    let historicalAvg = 45;
    if (db) {
      const agg = await db.collection('requisitions').aggregate([
        { $match: { tenantId, status: 'closed' } },
        {
          $project: {
            days: {
              $dateDiff: { startDate: '$createdAt', endDate: '$updatedAt', unit: 'day' },
            },
          },
        },
        { $group: { _id: null, avg: { $avg: '$days' } } },
      ]).toArray();
      if (agg.length > 0 && agg[0].avg) historicalAvg = Math.round(agg[0].avg);
    }

    const prompt = `You are a recruitment analytics model. Predict time-to-fill for a role.

Role: ${requisition.title}
Department: ${requisition.department || 'unknown'}
Location: ${requisition.location || 'unknown'}
Remote: ${requisition.remote ? 'yes' : 'no'}
Required skills: ${requisition.skills?.join(', ') || 'unknown'}
Experience required: ${requisition.experienceYears ?? 'unknown'} years
Tenant historical avg fill time: ${historicalAvg} days

Return JSON only:
{
  "estimatedDays": number,
  "confidenceInterval": [p25_days, p75_days],
  "riskFactors": ["string"],
  "recommendations": ["string"]
}`;

    try {
      const raw = await hybridChatCompletion(
        'You are a recruitment analytics model. Return valid JSON only.',
        prompt,
        { targetProvider: 'groq', max_tokens: 512, temperature: 0.2 }
      );
      const json = raw.substring(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
      return JSON.parse(json) as TimeToFillPrediction;
    } catch {
      return {
        estimatedDays: historicalAvg,
        confidenceInterval: [Math.round(historicalAvg * 0.7), Math.round(historicalAvg * 1.4)],
        riskFactors: ['Prediction unavailable — using historical average'],
        recommendations: [],
      };
    }
  }
}

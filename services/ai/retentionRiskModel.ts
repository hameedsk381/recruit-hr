import { hybridChatCompletion } from '../llmRouter';

export interface RetentionRiskPrediction {
  riskScore: number; // 0–1, higher = more likely to leave
  riskLevel: 'low' | 'medium' | 'high';
  drivers: { factor: string; impact: string }[];
  recommendations: string[];
}

interface EmployeeInput {
  tenure_months: number;
  role: string;
  department?: string;
  recentPromotion?: boolean;
  performanceScore?: number; // 0–5
  compensationVsMarket?: 'below' | 'at' | 'above';
  managerChanges?: number;
  teamChanges?: number;
}

export class RetentionRiskModel {
  static async predict(
    _tenantId: string,
    employee: EmployeeInput
  ): Promise<RetentionRiskPrediction> {
    const prompt = `You are a retention analytics model. Predict retention risk.

Employee:
- Tenure: ${employee.tenure_months} months
- Role: ${employee.role}
- Department: ${employee.department || 'unknown'}
- Recent promotion: ${employee.recentPromotion ? 'yes' : 'no'}
- Performance score: ${employee.performanceScore ?? 'unknown'}/5
- Compensation vs market: ${employee.compensationVsMarket || 'unknown'}
- Manager changes in last 12 months: ${employee.managerChanges ?? 0}
- Team reorganizations in last 12 months: ${employee.teamChanges ?? 0}

Return JSON only:
{
  "riskScore": 0.0-1.0,
  "riskLevel": "low|medium|high",
  "drivers": [{"factor": "string", "impact": "string"}],
  "recommendations": ["string"]
}`;

    try {
      const raw = await hybridChatCompletion(
        'You are an HR analytics model. Return valid JSON only.',
        prompt,
        { targetProvider: 'groq', max_tokens: 512, temperature: 0.2 }
      );
      const json = raw.substring(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
      return JSON.parse(json) as RetentionRiskPrediction;
    } catch {
      return {
        riskScore: 0.5,
        riskLevel: 'medium',
        drivers: [],
        recommendations: ['Prediction unavailable'],
      };
    }
  }
}

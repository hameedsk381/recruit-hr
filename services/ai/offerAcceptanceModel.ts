import { hybridChatCompletion } from '../llmRouter';

export interface OfferAcceptancePrediction {
  probability: number;
  confidence: 'high' | 'medium' | 'low';
  drivers: {
    factor: string;
    impact: 'positive' | 'negative';
    reasoning: string;
  }[];
  recommendations: string[];
}

interface OfferInput {
  compensation: { base: number; currency: string; bonus?: number; signingBonus?: number };
  startDate?: Date;
}

interface CandidateInput {
  currentRole?: string;
  currentCompany?: string;
  experienceYears?: number;
  skills?: string[];
}

interface MarketData {
  medianBase: number;
  p75Base: number;
  currency: string;
}

export class OfferAcceptanceModel {
  static async predict(
    tenantId: string,
    candidate: CandidateInput,
    offer: OfferInput,
    marketData: MarketData,
    daysInProcess: number
  ): Promise<OfferAcceptancePrediction> {
    const prompt = `You are a recruitment analytics model. Predict offer acceptance probability.

Candidate:
- Current role: ${candidate.currentRole || 'unknown'}
- Experience: ${candidate.experienceYears ?? 'unknown'} years
- Skills: ${candidate.skills?.join(', ') || 'unknown'}

Offer:
- Base salary: ${offer.compensation.currency} ${offer.compensation.base}
- Bonus: ${offer.compensation.bonus ?? 0}
- Signing bonus: ${offer.compensation.signingBonus ?? 0}

Market data:
- Median base: ${marketData.currency} ${marketData.medianBase}
- P75 base: ${marketData.currency} ${marketData.p75Base}

Days in hiring process: ${daysInProcess}

Return JSON only:
{
  "probability": 0.0-1.0,
  "confidence": "high|medium|low",
  "drivers": [{"factor": "string", "impact": "positive|negative", "reasoning": "string"}],
  "recommendations": ["string"]
}`;

    try {
      const raw = await hybridChatCompletion(
        'You are a recruitment analytics model. Return valid JSON only.',
        prompt,
        { targetProvider: 'groq', max_tokens: 1024, temperature: 0.2 }
      );
      const json = raw.substring(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
      return JSON.parse(json) as OfferAcceptancePrediction;
    } catch {
      return {
        probability: 0.5,
        confidence: 'low',
        drivers: [],
        recommendations: ['Unable to generate prediction — insufficient data'],
      };
    }
  }

  static async recordOutcome(
    tenantId: string,
    offerId: string,
    accepted: boolean
  ): Promise<void> {
    const { FeedbackLoop } = await import('./feedbackLoop');
    await FeedbackLoop.recordDecision(tenantId, 'offer_outcome', offerId, accepted ? 'accepted' : 'rejected', {});
  }
}

import { getMongoDb } from '../../utils/mongoClient';
import { autoRoutedChatCompletion } from '../llmRouter';
import { getPrompt, hydratePrompt } from '../promptRegistry';
import { ObjectId } from 'mongodb';

export interface OfferAcceptancePrediction {
  probability: number;
  confidence: 'high' | 'medium' | 'low';
  drivers: {
    factor: string;
    impact: 'positive' | 'negative';
    reasoning: string;
  }[];
  recommendations: string[];
  analysis: string;
}

export class PredictiveAnalyticsService {

  static async predictOfferAcceptance(
    tenantId: string,
    offerId: string
  ): Promise<OfferAcceptancePrediction> {
    const db = getMongoDb();
    
    // 1. Fetch relevant data
    const offer = await db.collection('offers').findOne({ _id: new ObjectId(offerId), tenantId });
    if (!offer) throw new Error('Offer not found');

    const candidate = await db.collection('talent_profiles').findOne({ _id: offer.candidateId, tenantId });
    const scorecards = await db.collection('scorecards').find({ candidateId: offer.candidateId, tenantId }).toArray();
    
    // 2. Prepare context for LLM
    const inputData = JSON.stringify({
      offer: {
        compensation: offer.compensation,
        startDate: offer.startDate,
        expiryDate: offer.expiryDate,
      },
      candidate: {
        skills: candidate?.candidate.skills,
        experience: candidate?.candidate.experienceYears,
        currentRole: candidate?.candidate.currentRole,
        currentCompany: candidate?.candidate.currentCompany,
      },
      interviewSentiment: scorecards.map(s => ({
        overallScore: s.overallScore,
        strengths: s.strengths,
        weaknesses: s.weaknesses,
      })),
      marketContext: {
        // Mocked market data - in production this comes from a market data provider
        medianSalaryForRole: (offer.compensation.base * (0.95 + Math.random() * 0.15)),
        talentDemand: 'high',
      }
    });

    // 3. Get prediction from AI
    const promptDef = getPrompt('OFFER_ACCEPTANCE_PREDICTION_V1');
    const fullPrompt = hydratePrompt(promptDef.template, { input_data: inputData });

    const response = await autoRoutedChatCompletion(
      "You are a predictive recruitment analyst.",
      fullPrompt,
      {
        targetModel: promptDef.modelConfig.recommendedModel,
        temperature: promptDef.modelConfig.temperature,
        max_tokens: promptDef.modelConfig.maxTokens,
      }
    );

    try {
      const prediction = JSON.parse(response) as OfferAcceptancePrediction;
      
      // 4. Save prediction to DB
      await db.collection('predictions').updateOne(
        { resourceId: new ObjectId(offerId), type: 'offer_acceptance' },
        { 
          $set: { 
            tenantId, 
            result: prediction, 
            calculatedAt: new Date() 
          } 
        },
        { upsert: true }
      );

      return prediction;
    } catch (e) {
      console.error('[PredictiveAnalytics] Failed to parse AI response:', response);
      throw new Error('Failed to generate offer acceptance prediction');
    }
  }

  static async getTimeToFillPrediction(tenantId: string, requisitionId: string): Promise<any> {
    // Phase 3 implementation
    return { estimatedDays: 25, confidence: 'medium' };
  }
}

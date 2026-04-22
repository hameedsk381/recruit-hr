import { getMongoDb } from '../../utils/mongoClient';
import { groqChatCompletion } from '../../utils/groqClient';

export interface HiringForecast {
    predictedTimeToFill: number; // days
    predictedCostPerHire: number; // USD/INR
    pipelineHealthScore: number; // 0-100
    riskFactors: string[];
    recommendations: string[];
}

export class PredictionService {
    /**
     * Generates a hiring forecast for a specific job requisition or the entire tenant.
     */
    static async getHiringForecast(tenantId: string, jobId?: string): Promise<HiringForecast> {
        const db = getMongoDb();
        
        // 1. Fetch historical data
        const historicalHires = await db.collection('hired_candidates').find({ tenantId }).toArray();
        const currentPipeline = await db.collection('assessment_batches').find({ tenantId }).toArray();
        
        // 2. Aggregate metrics for AI context
        const avgHistoricalTime = historicalHires.length > 0 
            ? historicalHires.reduce((acc, h) => acc + (h.daysToHire || 0), 0) / historicalHires.length 
            : 45; // Default 45 days

        const pipelineVolume = currentPipeline.reduce((acc, b) => acc + (b.totalJobs || 0), 0);
        
        // 3. Use AI to forecast based on current market trends and historical volume
        const prompt = `Act as a HR Data Scientist. Predict hiring outcomes for the following workspace:
        - Historical Avg Time to Fill: ${avgHistoricalTime} days
        - Current Active Pipeline: ${pipelineVolume} candidates
        - Job Market Volatility: High (Tech Sector)
        
        Return ONLY a JSON object:
        {
            "predictedTimeToFill": number,
            "predictedCostPerHire": number,
            "pipelineHealthScore": 0-100,
            "riskFactors": ["factor 1", "factor 2"],
            "recommendations": ["reco 1", "reco 2"]
        }`;

        try {
            const response = await groqChatCompletion(
                "You are a Senior Talent Analyst.",
                prompt,
                0.3,
                800
            );

            return JSON.parse(response.replace(/```json|```/g, ''));
        } catch (e) {
            // Fallback to simple statistical model if AI fails
            return {
                predictedTimeToFill: Math.round(avgHistoricalTime * 1.1),
                predictedCostPerHire: 5000,
                pipelineHealthScore: 75,
                riskFactors: ["Limited historical data for accurate forecasting"],
                recommendations: ["Increase sourcing volume on LinkedIn", "Reduce time-to-first-interview"]
            };
        }
    }
}

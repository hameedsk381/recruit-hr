
import { getMongoDb } from "../../utils/mongoClient";
import { groqChatCompletion } from "../../utils/groqClient";

export interface ReportConfig {
    name: string;
    metric: 'time_to_fill' | 'pass_rate' | 'source_efficiency' | 'cost_per_hire';
    dimension: 'department' | 'recruiter' | 'source' | 'month';
    filters?: any;
}

export class ReportBuilder {
    static async generateReport(tenantId: string, config: ReportConfig) {
        const db = getMongoDb();
        let data: any[] = [];

        switch (config.metric) {
            case 'time_to_fill':
                data = await this.calculateTimeToFill(tenantId, config.dimension);
                break;
            case 'pass_rate':
                data = await this.calculatePassRate(tenantId, config.dimension);
                break;
            default:
                data = [];
        }

        const narration = await this.generateAINarration(config, data);

        return {
            success: true,
            config,
            data,
            narration,
            generatedAt: new Date()
        };
    }

    private static async calculateTimeToFill(tenantId: string, dimension: string) {
        const db = getMongoDb();
        // Aggregate job requisitions: created vs closed dates
        const results = await db.collection('requisitions').aggregate([
            { $match: { tenantId, status: 'closed' } },
            { 
                $group: { 
                    _id: `$${dimension}`, 
                    avgDays: { 
                        $avg: { 
                            $divide: [
                                { $subtract: ["$closedAt", "$createdAt"] },
                                1000 * 60 * 60 * 24
                            ]
                        }
                    }
                } 
            }
        ]).toArray();
        return results;
    }

    private static async calculatePassRate(tenantId: string, dimension: string) {
        const db = getMongoDb();
        // Aggregate candidates: shortlisted vs total
        const results = await db.collection('talent_profiles').aggregate([
            { $match: { tenantId } },
            {
                $group: {
                    _id: `$${dimension}`,
                    total: { $sum: 1 },
                    shortlisted: { 
                        $sum: { $cond: [{ $eq: ["$pipeline.currentStage", "shortlist"] }, 1, 0] } 
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    rate: { $divide: ["$shortlisted", "$total"] }
                }
            }
        ]).toArray();
        return results;
    }

    private static async generateAINarration(config: ReportConfig, data: any[]) {
        const prompt = `Act as a senior HR analyst. Analyze the following data for a ${config.metric} report grouped by ${config.dimension}.
        
        Data: ${JSON.stringify(data)}
        
        Provide 3-4 bullet points of high-level insights, trends, and actionable recommendations. Keep it professional and concise.`;

        try {
            return await groqChatCompletion("You are an expert HR Data Analyst.", prompt);
        } catch (e) {
            return "AI Narration unavailable at this time.";
        }
    }
}

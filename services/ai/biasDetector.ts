import { hybridChatCompletion } from '../llmRouter';
import { getMongoDb } from '../../utils/mongoClient';
import { ObjectId } from 'mongodb';

export interface JDLanguageFlag {
  phrase: string;
  type: 'gender_coded' | 'age_coded' | 'credential_inflation' | 'cultural_exclusion';
  suggestion: string;
}

export interface BiasReport {
  requisitionId: string;
  period: { from: Date; to: Date };
  funnelAnalysis: {
    stage: string;
    totalCandidates: number;
    passRate: number;
  }[];
  adverseImpact: {
    detected: boolean;
    analysis: string;
    aiConfidence: 'high' | 'medium' | 'low';
  };
  jdLanguageFlags: JDLanguageFlag[];
  recommendations: string[];
  generatedAt: Date;
}

export class BiasDetector {
  static async scanJD(jdText: string): Promise<JDLanguageFlag[]> {
    const prompt = `Scan this job description for biased or exclusionary language.

JD:
"""
${jdText.slice(0, 3000)}
"""

Detect:
- Gender-coded words (e.g., "rockstar", "ninja", "aggressive", "nurturing")
- Age-coded words (e.g., "digital native", "recent graduate", "seasoned")
- Unnecessary credential inflation (e.g., "MBA required" for non-strategic roles)
- Cultural exclusion signals

Return JSON array only:
[{"phrase": "string", "type": "gender_coded|age_coded|credential_inflation|cultural_exclusion", "suggestion": "string"}]

Return [] if no issues found.`;

    try {
      const raw = await hybridChatCompletion(
        'You are a bias detection model. Return valid JSON array only.',
        prompt,
        { targetProvider: 'groq', max_tokens: 1024, temperature: 0.1 }
      );
      const start = raw.indexOf('[');
      const end = raw.lastIndexOf(']') + 1;
      if (start === -1) return [];
      return JSON.parse(raw.substring(start, end)) as JDLanguageFlag[];
    } catch {
      return [];
    }
  }

  static async generateFunnelReport(
    tenantId: string,
    requisitionId: string,
    from: Date,
    to: Date
  ): Promise<BiasReport> {
    const db = getMongoDb();
    const funnelAnalysis: BiasReport['funnelAnalysis'] = [];

    if (db) {
      const stages = ['applied', 'screened', 'shortlisted', 'interviewing', 'offered', 'hired'];
      for (const stage of stages) {
        const count = await db.collection('assessment_batches').countDocuments({
          tenantId,
          requisitionId,
          currentStage: stage,
          createdAt: { $gte: from, $lte: to },
        });
        funnelAnalysis.push({ stage, totalCandidates: count, passRate: 0 });
      }
      // Compute pass rates
      for (let i = 0; i < funnelAnalysis.length - 1; i++) {
        const curr = funnelAnalysis[i].totalCandidates;
        const next = funnelAnalysis[i + 1].totalCandidates;
        funnelAnalysis[i].passRate = curr > 0 ? Math.round((next / curr) * 100) / 100 : 0;
      }
    }

    // Get JD for this requisition and scan it
    let jdFlags: JDLanguageFlag[] = [];
    if (db) {
      const req = await db.collection('requisitions').findOne({
        tenantId,
        _id: new ObjectId(requisitionId),
      });
      if (req?.jdText) {
        jdFlags = await BiasDetector.scanJD(req.jdText);
      }
    }

    const funnelSummary = funnelAnalysis
      .map(f => `${f.stage}: ${f.totalCandidates} candidates, ${f.passRate * 100}% pass rate`)
      .join('\n');

    const analysisPrompt = `Analyze this hiring funnel for adverse impact or bias patterns.

Funnel:
${funnelSummary}

Identify any statistically significant drop-offs that may indicate bias. Be conservative — flag only clear anomalies.

Return JSON only:
{"detected": true|false, "analysis": "string", "aiConfidence": "high|medium|low", "recommendations": ["string"]}`;

    let adverseImpact: BiasReport['adverseImpact'] = {
      detected: false,
      analysis: 'Insufficient data for analysis',
      aiConfidence: 'low',
    };
    let recommendations: string[] = [];

    try {
      const raw = await hybridChatCompletion(
        'You are a bias detection model. Return valid JSON only.',
        analysisPrompt,
        { targetProvider: 'groq', max_tokens: 512, temperature: 0.1 }
      );
      const json = raw.substring(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
      const parsed = JSON.parse(json);
      adverseImpact = {
        detected: parsed.detected,
        analysis: parsed.analysis,
        aiConfidence: parsed.aiConfidence,
      };
      recommendations = parsed.recommendations || [];
    } catch { /* use defaults */ }

    return {
      requisitionId,
      period: { from, to },
      funnelAnalysis,
      adverseImpact,
      jdLanguageFlags: jdFlags,
      recommendations,
      generatedAt: new Date(),
    };
  }
}

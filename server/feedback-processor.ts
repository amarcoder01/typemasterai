import OpenAI from "openai";
import type { Feedback, FeedbackCategory } from "@shared/schema";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

export interface FeedbackAnalysis {
  sentimentScore: number;
  sentimentLabel: string;
  aiCategoryId?: number;
  aiSummary?: string;
  aiPriorityScore?: number;
  aiTags?: string[];
}

export interface FeedbackInput {
  id: number;
  subject: string;
  message: string;
  priority: string;
  categoryId: number | null;
}

export interface StorageInterface {
  getFeedbackCategories(): Promise<FeedbackCategory[]>;
  updateFeedbackAiAnalysis(id: number, analysis: FeedbackAnalysis): Promise<unknown>;
}

let cachedCategories: FeedbackCategory[] | null = null;
let categoryCacheTime = 0;
const CATEGORY_CACHE_TTL = 5 * 60 * 1000;

async function getCachedCategories(storage: StorageInterface): Promise<FeedbackCategory[]> {
  const now = Date.now();
  if (cachedCategories && now - categoryCacheTime < CATEGORY_CACHE_TTL) {
    return cachedCategories;
  }
  
  try {
    cachedCategories = await storage.getFeedbackCategories();
    categoryCacheTime = now;
    return cachedCategories;
  } catch (error) {
    console.error("[FeedbackProcessor] Failed to fetch categories:", error);
    return cachedCategories || [];
  }
}

async function analyzeFeedbackContent(
  feedback: FeedbackInput,
  categories: FeedbackCategory[]
): Promise<FeedbackAnalysis> {
  const categoryList = categories
    .map(c => `${c.id}: ${c.name} (${c.description || c.slug})`)
    .join("\n");

  const systemPrompt = `You are an AI feedback analyst for TypeMasterAI, a typing practice application. Your job is to analyze user feedback and provide structured insights.

Available feedback categories:
${categoryList}

Analyze the feedback and respond with a JSON object containing:
1. sentimentScore: A number from -1 (very negative) to 1 (very positive). 0 is neutral.
2. sentimentLabel: One of "negative" (score < -0.2), "neutral" (-0.2 to 0.2), or "positive" (> 0.2)
3. suggestedCategoryId: The ID of the most appropriate category from the list above (integer or null if uncertain)
4. summary: A 1-2 sentence summary of the feedback (max 150 chars)
5. priorityScore: A number from 0 to 1 indicating urgency. Consider:
   - 0.0-0.3: Low priority (general suggestions, minor improvements)
   - 0.3-0.5: Medium priority (feature requests, usability issues)
   - 0.5-0.7: High priority (significant bugs, important features)
   - 0.7-1.0: Critical (security issues, data loss, broken core features)
6. tags: An array of 2-5 relevant tags (lowercase, hyphenated, e.g., "ui-bug", "performance", "feature-request")

Consider the user-selected priority when calculating priorityScore:
- User priority "critical" should push score towards 0.7+
- User priority "high" should push score towards 0.5+
- User priority "low" should cap score at 0.5 unless content suggests critical issue

Respond ONLY with valid JSON, no markdown or explanation.`;

  const userPrompt = `Analyze this feedback:

Subject: ${feedback.subject}
Message: ${feedback.message}
User-Selected Priority: ${feedback.priority}
User-Selected Category ID: ${feedback.categoryId || "None"}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error("[FeedbackProcessor] Empty response from OpenAI");
      return getDefaultAnalysis(feedback.priority);
    }

    const parsed = JSON.parse(content);
    
    const sentimentScore = Math.max(-1, Math.min(1, Number(parsed.sentimentScore) || 0));
    let sentimentLabel: string;
    if (sentimentScore < -0.2) {
      sentimentLabel = "negative";
    } else if (sentimentScore > 0.2) {
      sentimentLabel = "positive";
    } else {
      sentimentLabel = "neutral";
    }

    const aiCategoryId = parsed.suggestedCategoryId && 
      categories.some(c => c.id === parsed.suggestedCategoryId)
      ? parsed.suggestedCategoryId
      : undefined;

    const aiPriorityScore = Math.max(0, Math.min(1, Number(parsed.priorityScore) || 0.3));

    const aiTags = Array.isArray(parsed.tags)
      ? parsed.tags
          .slice(0, 5)
          .map((t: unknown) => String(t).toLowerCase().replace(/\s+/g, "-").slice(0, 30))
          .filter((t: string) => t.length > 0)
      : [];

    const aiSummary = typeof parsed.summary === "string"
      ? parsed.summary.slice(0, 200)
      : "Feedback submitted.";

    return {
      sentimentScore,
      sentimentLabel,
      aiCategoryId,
      aiSummary,
      aiPriorityScore,
      aiTags
    };
  } catch (error) {
    console.error("[FeedbackProcessor] Error analyzing feedback:", error);
    return getDefaultAnalysis(feedback.priority);
  }
}

function getDefaultAnalysis(priority: string): FeedbackAnalysis {
  const priorityScores: Record<string, number> = {
    critical: 0.8,
    high: 0.6,
    medium: 0.4,
    low: 0.2
  };

  return {
    sentimentScore: 0,
    sentimentLabel: "neutral",
    aiCategoryId: undefined,
    aiSummary: "Unable to analyze feedback automatically.",
    aiPriorityScore: priorityScores[priority] || 0.4,
    aiTags: []
  };
}

export function processFeedbackInBackground(
  feedbackId: number,
  feedback: FeedbackInput,
  storage: StorageInterface
): void {
  setImmediate(async () => {
    try {
      console.log(`[FeedbackProcessor] Starting analysis for feedback #${feedbackId}`);
      const startTime = Date.now();

      const categories = await getCachedCategories(storage);
      const analysis = await analyzeFeedbackContent(feedback, categories);
      
      await storage.updateFeedbackAiAnalysis(feedbackId, analysis);

      const duration = Date.now() - startTime;
      console.log(`[FeedbackProcessor] Completed analysis for feedback #${feedbackId} in ${duration}ms`);
      console.log(`[FeedbackProcessor] Results: sentiment=${analysis.sentimentLabel} (${analysis.sentimentScore.toFixed(2)}), priority=${(analysis.aiPriorityScore || 0).toFixed(2)}, tags=${(analysis.aiTags || []).join(", ")}`);
    } catch (error) {
      console.error(`[FeedbackProcessor] Failed to process feedback #${feedbackId}:`, error);
    }
  });
}

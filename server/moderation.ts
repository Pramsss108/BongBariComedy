// Simple moderation service for BongBariComedy
export interface ModerationResult {
  decision: 'approved' | 'rejected' | 'pending';
  reason: string;
  flags: string[];
  usedAI: boolean;
  severity: number;
}

export async function analyzeStory(content: string): Promise<ModerationResult> {
  // Simple fallback moderation - just approve for now
  // This keeps the site working while we can add proper moderation later
  return {
    decision: 'approved',
    reason: 'auto-approved',
    flags: [],
    usedAI: false,
    severity: 0
  };
}

// Simple content moderation module
export interface ModerationResult {
  decision: 'approved' | 'rejected' | 'pending';
  reason: string;
  flags: string[];
  usedAI: boolean;
  severity: number;
}

export async function analyzeStory(content: string): Promise<ModerationResult> {
  // Simple content analysis - can be enhanced with AI later
  const flags: string[] = [];
  let severity = 0;

  // Basic profanity check
  const profanityWords = ['spam', 'hate', 'offensive'];
  const lowerContent = content.toLowerCase();
  
  for (const word of profanityWords) {
    if (lowerContent.includes(word)) {
      flags.push(`Contains: ${word}`);
      severity += 1;
    }
  }

  // Length check
  if (content.length < 10) {
    flags.push('Too short');
    severity += 1;
  }

  if (content.length > 5000) {
    flags.push('Too long');
    severity += 1;
  }

  // Decision logic
  let decision: 'approved' | 'rejected' | 'pending' = 'approved';
  let reason = 'Content appears appropriate';

  if (severity >= 3) {
    decision = 'rejected';
    reason = 'Multiple policy violations detected';
  } else if (severity >= 1) {
    decision = 'pending';
    reason = 'Content requires manual review';
  }

  return {
    decision,
    reason,
    flags,
    usedAI: false,
    severity
  };
}
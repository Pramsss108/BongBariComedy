// Enhanced moderation service for BongBariComedy - Google Gemini Policy Compliant
export interface ModerationResult {
  decision: 'approved' | 'rejected' | 'pending';
  reason: string;
  flags: string[];
  usedAI: boolean;
  severity: number;
}

// Prohibited content patterns for Gemini API compliance
const PROHIBITED_PATTERNS = [
  // Adult/Sexual content
  /\b(sex|sexual|porn|adult|nude|naked|xxx|erotic)\b/i,
  
  // Harmful activities
  /\b(suicide|self.?harm|kill|murder|violence|weapon|bomb|drug|illegal)\b/i,
  
  // Hate speech indicators
  /\b(hate|racist|nazi|terrorist|extremist)\b/i,
  
  // Personal information requests
  /\b(phone|address|email|password|credit.?card|ssn|social.?security)\b/i,
  
  // Medical/legal advice
  /\b(medical.?advice|legal.?advice|diagnose|prescription|lawsuit)\b/i
];

// Family-friendly Bengali comedy topics (ALLOWED)
const FAMILY_FRIENDLY_PATTERNS = [
  /\b(maa|baba|dada|didi|family|hasi|joke|comedy|funny|adda)\b/i,
  /\b(bengali|bong|bari|youtube|instagram|collab|brand)\b/i,
  /[\u0980-\u09ff]/ // Bengali script
];

export async function analyzeStory(content: string): Promise<ModerationResult> {
  if (!content || content.trim().length === 0) {
    return {
      decision: 'rejected',
      reason: 'Empty content',
      flags: ['empty'],
      usedAI: false,
      severity: 1
    };
  }

  const flags: string[] = [];
  let severity = 0;

  // Check for prohibited content
  for (const pattern of PROHIBITED_PATTERNS) {
    if (pattern.test(content)) {
      flags.push('prohibited_content');
      severity = Math.max(severity, 3);
    }
  }

  // Check content length (prevent spam)
  if (content.length > 5000) {
    flags.push('too_long');
    severity = Math.max(severity, 2);
  }

  // Check for excessive caps (spam indicator)
  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (capsRatio > 0.7 && content.length > 20) {
    flags.push('excessive_caps');
    severity = Math.max(severity, 1);
  }

  // Check for repetitive content (spam)
  const words = content.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words);
  if (words.length > 10 && uniqueWords.size / words.length < 0.3) {
    flags.push('repetitive');
    severity = Math.max(severity, 1);
  }

  // Positive signals (family-friendly content)
  let familyFriendlyScore = 0;
  for (const pattern of FAMILY_FRIENDLY_PATTERNS) {
    if (pattern.test(content)) {
      familyFriendlyScore++;
    }
  }

  // Decision logic
  if (severity >= 3) {
    return {
      decision: 'rejected',
      reason: 'Contains prohibited content that violates Gemini API policies',
      flags,
      usedAI: false,
      severity
    };
  }

  if (severity >= 2) {
    return {
      decision: 'pending',
      reason: 'Requires manual review for policy compliance',
      flags,
      usedAI: false,
      severity
    };
  }

  if (familyFriendlyScore > 0 || severity === 0) {
    return {
      decision: 'approved',
      reason: 'Content meets family-friendly comedy guidelines',
      flags,
      usedAI: false,
      severity
    };
  }

  // Default to pending for unclear content
  return {
    decision: 'pending',
    reason: 'Content needs review for brand alignment',
    flags: flags.length > 0 ? flags : ['needs_review'],
    usedAI: false,
    severity: Math.max(severity, 1)
  };
}

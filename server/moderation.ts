import { chatbotService } from './chatbotService';

export interface ModerationResult {
  decision: 'approve' | 'pending' | 'reject';
  reason: string;
  flags: string[];
  severity: number; // 0 benign, higher means more sensitive
  usedAI: boolean;
  latencyMs: number;
}

// Bengali cultural nuance keyword sets
const mildSlang = [
  'khisti', 'gadha', 'pagol', 'paga', 'boka', 'jelous', 'goru'
];
// Terms that might be acceptable if playful but require intent analysis
const contextual = [
  'haraam', 'haraami', 'harami', 'bastard', 'bokachoda', 'chagol'
];
// Explicit sexual / abusive / spam heavy terms (strip vowels naive detection) -> auto pending or reject
const disallowedCore = [
  'porn', 'nudity', 'sex', 'incest', 'rape', 'pedo', 'pedof', 'child sex', 'molest', 'gore'
];

// Simple Bengali script detection
const bengaliRegex = /[\u0980-\u09FF]/;

function normalize(text: string) {
  return text.toLowerCase();
}

function heuristicScan(text: string): Pick<ModerationResult,'flags'|'severity'|'reason'|'decision'> {
  const n = normalize(text);
  const flags: string[] = [];
  let severity = 0;

  disallowedCore.forEach(term => { if (n.includes(term)) { flags.push(`hard:${term}`); severity += 4; } });
  mildSlang.forEach(term => { if (n.includes(term)) { flags.push(`mild:${term}`); severity += 1; } });
  contextual.forEach(term => { if (n.includes(term)) { flags.push(`ctx:${term}`); severity += 2; } });

  // Very naive spam detection (repeats / length / links)
  const linkCount = (n.match(/https?:\/\//g)||[]).length;
  if (linkCount > 2) { flags.push('spam:links'); severity += 2; }
  if (/(.)\1{6,}/.test(n)) { flags.push('spam:repeat'); severity += 2; }
  if (n.length > 1000) { flags.push('spam:length'); severity += 1; }

  let decision: 'approve'|'pending'|'reject' = 'approve';
  let reason = 'Clean';
  if (severity >= 5) { decision = 'reject'; reason = 'High severity content'; }
  else if (severity >= 2) { decision = 'pending'; reason = 'Needs human review'; }
  else if (severity > 0) { decision = 'pending'; reason = 'Contains mild cultural slang'; }

  // Bengali encouragement: allow mild slang if clearly playful and short
  if (decision === 'pending' && severity === 1 && n.split(' ').length < 25) {
    reason = 'Likely playful mild slang';
  }

  return { flags, severity, reason, decision };
}

export async function analyzeStory(text: string): Promise<ModerationResult> {
  const start = Date.now();
  const base = heuristicScan(text);
  // If no AI key or already reject/high severity just return
  if (!process.env.GEMINI_API_KEY || base.decision === 'reject') {
    return { ...base, usedAI: false, latencyMs: Date.now() - start };
  }

  // Use Gemini for nuance: decide if mild/contextual slang is hateful or playful
  if (base.decision === 'approve') {
    // Already ok, but we can trust heuristics and skip AI to save quota
    return { ...base, usedAI: false, latencyMs: Date.now() - start };
  }

  // Only escalate to AI when pending and contains flags
  try {
    const prompt = `You are an assistant moderating short Bengali or Benglish user-submitted humorous stories for a community comedy feed. Assess the following text for:
- Hate or targeted harassment (reject)
- Explicit sexual obscenity or exploitation (reject)
- Severe abusive profanity with malicious intent (reject)
- Mild cultural slang / light swear used playfully (can auto-approve)
- Potentially risky or ambiguous intent (keep pending)

Return JSON ONLY with keys: decision (approve|pending|reject), reason (short), intent ('playful'|'neutral'|'hateful'|'sexual'|'spam'), mildTerms (array), severeTerms (array).
Text: <<<${text}>>>`;

    const raw = await chatbotService.generateFreeform(prompt, { temperature: 0.2, maxOutputTokens: 180 });
    let parsed: any = null;
    try { parsed = JSON.parse(raw || '{}'); } catch {}
    if (parsed && typeof parsed === 'object' && parsed.decision) {
      let decision: 'approve'|'pending'|'reject' = parsed.decision;
      // Safety adjustments: never auto approve if disallowedCore matched
      if (base.flags.some(f=>f.startsWith('hard:'))) decision = 'reject';
      // If hateful intent ensure reject
      if (parsed.intent === 'hateful') decision = 'reject';
      // If sexual but not explicit keep pending
      if (parsed.intent === 'sexual' && decision === 'approve') decision = 'pending';
      const flags = [...new Set([...base.flags, ...(parsed.mildTerms||[]).map((t:string)=>'ai_mild:'+t), ...(parsed.severeTerms||[]).map((t:string)=>'ai_severe:'+t)])];
      let severity = base.severity;
      if (parsed.severeTerms?.length) severity = Math.max(severity, 5);
      return { decision, reason: parsed.reason || base.reason, flags, severity, usedAI: true, latencyMs: Date.now() - start };
    }
  } catch (e) {
    // swallow AI errors
  }
  return { ...base, usedAI: false, latencyMs: Date.now() - start };
}

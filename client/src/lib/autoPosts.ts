// Auto post generator for Bong Kahini feed (seed + periodic)
// Generates casual Benglish / Kolkata vibe micro posts with safety filtering.

export interface AutoPost {
  id: string;
  text: string;
  topic: string; // transport|food|season|pujo|engagement|sports|weather|neighbour|misc
  lang: 'bn' | 'en' | 'mix';
  seed: boolean;
  createdAt: string;
  flagged?: boolean;
  flag_reason?: string;
  blocked?: boolean;
  tags?: string[];
}

export interface GenerateOptions {
  liveTrend?: string; // {LIVE_TREND}
  now?: Date;
  seed?: boolean;
}

const everydayTopics = [
  'metro delays','ticket chaos','crowded local','bus horn','rickshaw uncle','auto meter','bridge traffic',
  'neighbour gossip','kaku chai','puchka','jhal muri','cha biscuit','momo fight','mishti doi','phuchka stall',
  'tuition tension','exam stress','hostel food','college fest','teacher drama','AC problem','rain stuck',
  'adda vibe','generator story','umbrella lost','mosquito attack','mango heat','water logging','pujo shopping'
];

const engagementPrompts = [
  'kothay best puchka?','tomar funniest childhood memory?','favourite cha spot bole dao','rainy day snack?','exam hack bolo','metro seat hack ache?'
];

const seasonalMap: Record<string,string[]> = {
  winter: ['fog morning adda','blanket comfort','mishti binge','puchka dry day','hot water wait'],
  spring: ['holi colour stain','school break chaos','tution rush'],
  summer: ['aam mango line','AC thanda nei','digha plan fail','heat headache'],
  monsoon: ['heavy rain waterlogging','umbrella drama','metro delay rain','chai pakora vibe','mosquito rage'],
  pujo: ['pandal hopping','bhog line','pujo shopping','dhunuchi dance','immersion day'],
  autumn: ['pujo hangover','light setup fail']
};

function currentSeason(d: Date): keyof typeof seasonalMap | 'summer' {
  const m = d.getMonth(); // 0 Jan
  if (m>=10 || m<=1) return 'winter';
  if (m===2 || m===3) return 'spring';
  if (m>=3 && m<=4) return 'summer';
  if (m>=5 && m<=8) return 'monsoon';
  if (m===8 || m===9) return 'pujo';
  return 'autumn';
}

const random = <T,>(arr: T[]) => arr[Math.floor(Math.random()*arr.length)];
const chance = (p: number) => Math.random() < p;

// Very lightweight sensitive filter (placeholder)
const bannedPatterns = [ /\bkill\b/i, /\bsex(?:ual)?\b/i, /\bnazi\b/i, /\brape\b/i ];

function safetyCheck(text: string): { flagged: boolean; blocked: boolean; reason?: string } {
  for (const re of bannedPatterns) {
    if (re.test(text)) return { flagged: true, blocked: true, reason: 'blocked_keyword' };
  }
  return { flagged: false, blocked: false };
}

function buildSentence(base: string, liveTrend?: string): string {
  let t = base;
  if (liveTrend) t = liveTrend + ' ' + t;
  // Add slang / flavour fragments
  const tails = [' bhai',' lol',' re',' ekdom',' abar',' ajke',' pls',' savage',' hahaha',' 😂',' 🤣'];
  if (chance(.6)) t += random(tails);
  if (chance(.25)) t += random(tails);
  // random repetition
  if (chance(.2)) t += ' ' + base.split(' ')[0] + ' ' + base.split(' ')[0];
  return t.trim();
}

function injectBenglish(text: string, mode: 'mix'|'bn'|'en'): string {
  const replacements: [RegExp,string][] = [
    [/metro/gi,'metro'],[/train/gi,'train'],[/rain/gi,'bristi'],[/water/gi,'pani'],[/food/gi,'khawa'],[/eat/gi,'khaoa'],[/friend/gi,'bondhu'],[/mother/gi,'ma'],[/mom/gi,'ma'],[/tea/gi,'cha']
  ];
  if (mode==='mix') {
    for (const [re,rep] of replacements) if (chance(.4)) text = text.replace(re, rep);
    if (chance(.3)) text = 'ajke ' + text;
  }
  return text;
}

export function generateAutoPost(opts: GenerateOptions = {}): AutoPost {
  const now = opts.now || new Date();
  const season = currentSeason(now);
  const modeRand = Math.random();
  const lang: 'bn'|'en'|'mix' = modeRand < .6 ? 'mix' : modeRand < .8 ? 'bn' : 'en';
  const liveTrendPick = opts.liveTrend && chance(.95) ? opts.liveTrend : '';

  let topicType = 'everyday';
  if (liveTrendPick) topicType = 'live';
  else if (chance(.2)) topicType = 'seasonal';
  else if (chance(.1)) topicType = 'engagement';

  let base = '';
  if (topicType==='live' && liveTrendPick) base = liveTrendPick + ' niye sob noise';
  else if (topicType==='seasonal') base = random(seasonalMap[season]);
  else if (topicType==='engagement') base = random(engagementPrompts);
  else base = random(everydayTopics);

  base = buildSentence(base, liveTrendPick || undefined);
  base = injectBenglish(base, lang);

  // Add small typos
  if (chance(.3)) base = base.replace(/a/gi,'aa');
  if (chance(.2)) base = base.replace(/e/gi,'ee');

  // Trim length
  if (base.length > 160) base = base.slice(0,150) + '...';

  const safety = safetyCheck(base);

  return {
    id: 'AUTO-' + Math.random().toString(36).slice(2,9),
    text: base,
    topic: topicType,
    lang,
    seed: !!opts.seed,
    createdAt: now.toISOString(),
    flagged: safety.flagged,
    flag_reason: safety.reason,
    blocked: safety.blocked,
    tags: liveTrendPick ? [season, 'live'] : [season]
  };
}

export function generateSeedPosts(liveTrend?: string): AutoPost[] {
  const now = new Date();
  const out: AutoPost[] = [];
  for (let i=0;i<20;i++) {
    const daysBack = Math.floor(Math.random()*7);
    const ts = new Date(now.getTime() - daysBack*86400_000 - Math.random()*86400_000/2);
    out.push(generateAutoPost({ now: ts, seed: true, liveTrend }));
  }
  return out.sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

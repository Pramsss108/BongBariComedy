const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const CORE_PATH = path.join(ROOT, 'client', 'public', 'bb-cosmic-core.js');
const code = fs.readFileSync(CORE_PATH, 'utf8');

function extractAssignedLiteral(variableName) {
  const marker = `var ${variableName} =`;
  const markerIndex = code.indexOf(marker);
  if (markerIndex < 0) throw new Error(`Missing ${variableName} in bb-cosmic-core.js`);

  const objectStart = code.indexOf('{', markerIndex);
  const arrayStart = code.indexOf('[', markerIndex);
  const start = arrayStart >= 0 && (objectStart < 0 || arrayStart < objectStart) ? arrayStart : objectStart;
  if (start < 0) throw new Error(`Missing opening brace for ${variableName}`);

  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = start; i < code.length; i++) {
    const ch = code[i];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{' || ch === '[') depth++;
    if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) return code.slice(start, i + 1);
    }
  }
  throw new Error(`Could not parse ${variableName}`);
}

function evalObjectLiteral(variableName) {
  const literal = extractAssignedLiteral(variableName);
  return vm.runInNewContext(`(${literal})`, Object.create(null), { timeout: 1000 });
}

const obstacleMeta = evalObjectLiteral('OBSTACLE_META');
const bonusPickupMeta = evalObjectLiteral('BONUS_PICKUP_META');
const bossDefs = evalObjectLiteral('BOSS_DEFS');
const patterns = evalObjectLiteral('PATTERNS');

const failures = [];
const notes = [];
const MIN_GAP_PX = 120;
const SINGLE_JUMP_COMFORT_GAP_PX = 170;
const MAX_DOUBLE_BURSTS_PER_PATTERN = 3;

function fail(message) {
  failures.push(message);
}

function allPatterns() {
  const rows = [];
  for (const [poolName, poolPatterns] of Object.entries(patterns)) {
    if (!Array.isArray(poolPatterns)) fail(`${poolName} is not an array`);
    for (let patternIndex = 0; patternIndex < poolPatterns.length; patternIndex++) {
      rows.push({ poolName, patternIndex, pattern: poolPatterns[patternIndex] });
    }
  }
  return rows;
}

function hasType(poolName, type) {
  return (patterns[poolName] || []).some((pattern) => pattern.some((step) => step.type === type));
}

function patternHasAnyForbiddenFoodEnemy() {
  return allPatterns().some(({ pattern }) => pattern.some((step) => step.type === 'singara' || step.type === 'biscuit'));
}

function hasDoubleJumpPattern(poolName) {
  return (patterns[poolName] || []).some((pattern) => {
    let closeAirAfterObstacle = false;
    for (let i = 1; i < pattern.length; i++) {
      const step = pattern[i];
      const meta = obstacleMeta[step.type];
      if (meta && meta.input === 'hold_or_double' && step.dx >= MIN_GAP_PX && step.dx < SINGLE_JUMP_COMFORT_GAP_PX) {
        closeAirAfterObstacle = true;
      }
    }
    return closeAirAfterObstacle;
  });
}

for (const { poolName, patternIndex, pattern } of allPatterns()) {
  const label = `${poolName}[${patternIndex}]`;
  if (!Array.isArray(pattern) || pattern.length === 0) {
    fail(`${label} must be a non-empty pattern array`);
    continue;
  }
  if (pattern[0].dx !== 0) fail(`${label} first obstacle dx must be 0`);

  let doubleBursts = 0;
  for (let stepIndex = 0; stepIndex < pattern.length; stepIndex++) {
    const step = pattern[stepIndex];
    const meta = obstacleMeta[step.type];
    if (!meta) {
      fail(`${label}.${stepIndex} uses unknown obstacle type "${step.type}"`);
      continue;
    }
    if (!Number.isFinite(step.dx)) fail(`${label}.${stepIndex} has non-numeric dx`);
    if (stepIndex > 0 && step.dx < MIN_GAP_PX) {
      fail(`${label}.${stepIndex} dx ${step.dx}px is below the fair minimum ${MIN_GAP_PX}px`);
    }
    if (step.type === 'dark_spike') {
      if (stepIndex === 0) fail(`${label}.${stepIndex} dark_spike cannot be first; it needs an audio pre-cue`);
      if (stepIndex > 0 && step.dx < SINGLE_JUMP_COMFORT_GAP_PX) {
        fail(`${label}.${stepIndex} dark_spike dx ${step.dx}px is too short for its audio pre-cue`);
      }
    }
    if (stepIndex > 0 && step.dx < SINGLE_JUMP_COMFORT_GAP_PX) doubleBursts++;
  }
  if (doubleBursts > MAX_DOUBLE_BURSTS_PER_PATTERN) {
    fail(`${label} asks for ${doubleBursts} close reactions; max fair stamina burst is ${MAX_DOUBLE_BURSTS_PER_PATTERN}`);
  }
}

function validateWave(label, wave) {
  if (!Array.isArray(wave) || wave.length === 0) {
    fail(`${label} must be a non-empty wave array`);
    return;
  }
  if (wave[0].dx !== 0) fail(`${label} first obstacle dx must be 0`);
  let closeBursts = 0;
  for (let i = 0; i < wave.length; i++) {
    const step = wave[i];
    if (!obstacleMeta[step.type]) fail(`${label}.${i} uses unknown obstacle type "${step.type}"`);
    if (!Number.isFinite(step.dx)) fail(`${label}.${i} has non-numeric dx`);
    if (i > 0 && step.dx < MIN_GAP_PX) fail(`${label}.${i} dx ${step.dx}px is below ${MIN_GAP_PX}px`);
    if (i > 0 && step.dx < SINGLE_JUMP_COMFORT_GAP_PX) closeBursts++;
  }
  if (closeBursts > MAX_DOUBLE_BURSTS_PER_PATTERN) fail(`${label} asks for ${closeBursts} close reactions`);
}

const bossIds = bossDefs.map((boss) => boss.id);
for (const boss of bossDefs) {
  if (!boss.id || !Number.isFinite(boss.distance)) fail(`Boss ${boss.id || '(missing id)'} needs id + numeric distance`);
  if (!boss.draw || !code.includes(boss.draw)) fail(`Boss ${boss.id} references missing draw hook ${boss.draw}`);
  if (!Array.isArray(boss.waves) || boss.waves.length < 3) fail(`Boss ${boss.id} needs at least 3 waves`);
  (boss.waves || []).forEach((wave, index) => validateWave(`boss ${boss.id}.wave[${index}]`, wave));
}

const batchChecks = [
  ['bazar pool exists', Array.isArray(patterns.bazar) && patterns.bazar.length >= 3],
  ['food reward pickups are not enemies', !patternHasAnyForbiddenFoodEnemy()],
  ['bonus pickups include Marie', !!bonusPickupMeta.marie && bonusPickupMeta.marie.value === 20],
  ['bonus pickups include Singara reward', !!bonusPickupMeta.singara && bonusPickupMeta.singara.value === 30],
  ['bonus pickups include Bread Slice reward', !!bonusPickupMeta.slice && bonusPickupMeta.slice.value === 50],
  ['bazar includes a double-jump-friendly pattern', hasDoubleJumpPattern('bazar')],
  ['raat pool exists', Array.isArray(patterns.raat) && patterns.raat.length >= 3],
  ['raat includes Ghost Chili', hasType('raat', 'ghost_404')],
  ['raat includes Dark Potty', hasType('raat', 'dark_spike')],
  ['raat includes high Fly', hasType('raat', 'sad_high')],
  ['raat includes a double-jump-friendly pattern', hasDoubleJumpPattern('raat')],
  ['cosmic pool exists', Array.isArray(patterns.cosmic) && patterns.cosmic.length >= 3],
  ['cosmic includes Cosmic Rock', hasType('cosmic', 'cosmic_rock')],
  ['four story bosses exist', bossIds.join(',') === 'bhoot_mama,bazar_raja,bhoot_jolokia,mashala_deb'],
  ['final boss unlocks endless', bossDefs.some((boss) => boss.id === 'mashala_deb' && boss.final === true)]
];

for (const [name, ok] of batchChecks) {
  if (!ok) fail(`Batch check failed: ${name}`);
}

const totalPatterns = allPatterns().length;
const totalSteps = allPatterns().reduce((sum, row) => sum + row.pattern.length, 0);
notes.push(`Parsed ${totalPatterns} patterns / ${totalSteps} obstacle steps from bb-cosmic-core.js`);
notes.push(`Known obstacle types: ${Object.keys(obstacleMeta).join(', ')}`);
notes.push(`Reward pickups: ${Object.keys(bonusPickupMeta).join(', ')}`);
notes.push(`Bosses: ${bossIds.join(' -> ')}`);
notes.push('Fairness rules: first dx=0, later dx>=120px, no pattern needs more than 3 close stamina bursts');

if (failures.length) {
  console.error('Chai Runner solvability audit FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Chai Runner solvability audit PASSED');
for (const note of notes) console.log(`- ${note}`);
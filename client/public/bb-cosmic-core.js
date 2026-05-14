/* Bong Bari — চা Runner v4 (Batches A + B + C + D, Phases 1–40b)
   Pure Canvas 2D, zero deps. Capped Mario-physics + sprite cache + fixed-timestep loop.
   Quality auto-detect, weather, parallax mountains, combo, vignette, ambient pad, iOS unlock.
*/
(function () {
  'use strict';

  // ==================== CONSTANTS ====================
  var CFG = {
    // Physics — A
    GRAVITY_RISE: 0.85, GRAVITY_FALL: 1.35, GRAVITY_APEX: 0.5,
    APEX_VY_THRESHOLD: 1.5, FASTFALL_MULT: 1.6,
    JUMP_VEL: -16, JUMP_HOLD_BOOST: -0.55, MAX_JUMP_HOLD_FRAMES: 14,
    DOUBLE_JUMP_VEL: -12, STAMINA_MAX: 3, STAMINA_REGEN_SEC: 4,
    COYOTE_FRAMES: 5.4, JUMP_BUFFER_FRAMES: 7.2,
    HITBOX_W: 0.60, HITBOX_H: 0.80,

    // Speed — Phase 5 polish (top ~9.5, 90% of plateau by ~330m, exponential)
    SPEED_BASE: 5.0, SPEED_GAIN: 4.5, SPEED_TAU_M: 180,
    METERS_PER_PX: 0.1,

    // Biomes — 30-minute arc (Para→Bazar→Raat→Mahakash)
    BIOMES: [
      { id: 'para',   name: 'Para',     bn: 'পাড়া',     start: 0,     end: 1500 },
      { id: 'bazar',  name: 'Bazar',    bn: 'বাজার',    start: 1500,  end: 4000 },
      { id: 'raat',   name: 'Raat',     bn: 'রাত',      start: 4000,  end: 7000 },
      { id: 'cosmic', name: 'Mahakash', bn: 'মহাকাশ',   start: 7000,  end: Infinity }
    ],
    BIOME_CROSSFADE_M: 300,

    // Spawn
    POST_HIT_SAFE_FRAMES: 72, I_FRAMES_SEC: 1.5,
    PATTERN_GAP_BASE_FRAMES: 90, PATTERN_GAP_MIN_FRAMES: 42,

    // DDA
    DDA_DEATHS_WINDOW_SEC: 60, DDA_EASE_DEATHS: 3, DDA_EASE_FACTOR: 0.85,
    DDA_TIGHTEN_SEC: 60, DDA_TIGHTEN_FACTOR: 1.15,

    // Storm
    STORM_EVERY_SCORE: 800, STORM_PRE_WARN_FRAMES: 60,
    STORM_DURATION_FRAMES: 300, STORM_CHAI_COUNT: 6,

    // Shake / near-miss
    SHAKE_SOFT: 3, SHAKE_MED: 5, SHAKE_HARD: 8,
    NEARMISS_PX: 28, NEARMISS_BONUS: 5,

    // Phase 28 — Combo (Phase 9: tier ladder — 3=×2, 7=×3, 12=×4, 20=×5)
    COMBO_THRESHOLD: 3,        // 3 consecutive chais without hit
    COMBO_DURATION_FRAMES: 300, // 5s
    COMBO_MULT: 2,             // legacy default — dynamic tier multiplier lives in S.comboMult
    COMBO_TIERS: [             // Phase 9 — silent tier ladder; tier resets on hit
      { chain: 3,  mult: 2 },
      { chain: 7,  mult: 3 },
      { chain: 12, mult: 4 },
      { chain: 20, mult: 5 }
    ],

    // Phase 24 — Weather
    PETAL_COUNT_HIGH: 14, PETAL_COUNT_LOW: 6,
    FIREFLY_COUNT_HIGH: 10, FIREFLY_COUNT_LOW: 4,

    // Phase 31/32 — Quality
    PROBE_FRAMES: 60,           // ~1s
    PROBE_LOW_FPS: 45,

    // Phase 40b — Fixed timestep
    FIXED_DT_MS: 1000 / 60,     // 16.67ms logic step
    MAX_STEPS_PER_FRAME: 5,     // prevents spiral-of-death on tab-hide spike

    // Phase 47 — Heart pickups
    HEART_EVERY_SCORE: 600,     // chance window every 600 score
    HEART_SPAWN_CHANCE: 0.6,    // 60% chance once eligible

    // Phase 48/12 — Bishesh chai (special). Phase 12 polish: 6s active + 0.5 spawn + gold vignette.
    BISHESH_EVERY_DIST_M: 250,  // eligibility window every 250m
    BISHESH_SPAWN_CHANCE: 0.5,
    BISHESH_DURATION_FRAMES: 360, // 6s @ 60Hz
    BISHESH_MULT: 3,

    // Batch 3 — Jhal Chanachur pickup (Bazar+): +x2 score for 4s.
    CHANACHUR_START_M: 3000,
    CHANACHUR_EVERY_DIST_M: 1000,
    CHANACHUR_SPAWN_CHANCE: 0.4,
    CHANACHUR_DURATION_FRAMES: 240,
    CHANACHUR_MULT: 2,

    // Bonus pickups — fast-read green reward language (not enemies).
    BONUS_PICKUP_START_M: 1500,
    BONUS_PICKUP_EVERY_DIST_M: 420,
    BONUS_PICKUP_SPAWN_CHANCE: 0.78,

    // Mahakash set-piece — free corridor before the final boss.
    AKASHGANGA_START_M: 7500,
    AKASHGANGA_END_M: 7800,
    AKASHGANGA_CHAI_EVERY_M: 80,

    // Boss engine — scripted, fair attacks. No random boss deaths.
    BOSS_INTRO_FRAMES: 90,

    // Phase 50 — Win at 8,000m (final boss: Mashala Deb)
    WIN_DISTANCE_M: 8000, // Tea Master — reach the final boss at 8,000m
    ENDLESS_MULT: 2,

    // Phase 53 — First-run onboarding
    ONBOARD_SPEED_CAP: 8,
    ONBOARD_GAP_MULT: 1.6,      // wider gaps

    // Phase 54 — Profile schema version
    PROFILE_VERSION: 1,
    PROFILE_KEY: 'bb_chai_profile_v1',
  };

  // ==================== BOOT ====================
  function boot() {
    var oldUI = document.querySelector('#bb-down-overlay .bb-ui-layer');
    if (oldUI) oldUI.remove();
    var oldCanvas = document.getElementById('bb-canvas');
    if (oldCanvas) oldCanvas.remove();
    var oldGame = document.getElementById('bb-game-canvas');
    if (oldGame) oldGame.remove();
    var oldHud = document.getElementById('bb-hud');
    if (oldHud) oldHud.remove();

    var overlay = document.getElementById('bb-down-overlay');
    if (!overlay) return;

    // Phase 39 — reduced motion
    var REDUCED_MOTION = false;
    try { REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    var DEV_MAP = false;
    try {
      var qs = new URLSearchParams(window.location.search);
      DEV_MAP = qs.has('__bb_devmap') || qs.get('__bb_devmap') === '1';
    } catch (e) {}

    // ==================== CANVAS ====================
    var canvas = document.createElement('canvas');
    canvas.id = 'bb-game-canvas';
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;z-index:2;touch-action:none;';
    overlay.appendChild(canvas);
    var ctx = canvas.getContext('2d', { alpha: false });

    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var W, H, GROUND_Y;
    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * DPR; canvas.height = H * DPR;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      // Phase 21 — pixel-crisp mode applies image-rendering
      canvas.style.imageRendering = QUALITY.pixelCrisp ? 'pixelated' : 'auto';
      GROUND_Y = Math.min(H * 0.78, H - 110);
      if (player) {
        player.x = Math.max(80, W * 0.18);
        player.baseY = GROUND_Y - player.height / 2;
        if (player.onGround) player.y = player.baseY;
      }
      // Re-init weather counts for new size
      initWeather();
      if (DEV_MAP && devMapReady) setDevMapDistance(S.distanceM, false);
    }

    // ==================== QUALITY (Phase 31, 32) ====================
    var QUALITY = {
      mode: 'auto',           // 'auto' | 'low' | 'high'
      level: 'high',          // resolved
      probing: true,
      probeFrames: 0, probeStart: 0,
      pixelCrisp: false,      // Phase 21
    };
    try {
      var savedQ = localStorage.getItem('bb_chai_quality');
      if (savedQ === 'low' || savedQ === 'high' || savedQ === 'auto') QUALITY.mode = savedQ;
      if (QUALITY.mode !== 'auto') { QUALITY.level = QUALITY.mode === 'low' ? 'low' : 'high'; QUALITY.probing = false; }
      QUALITY.pixelCrisp = localStorage.getItem('bb_chai_pixel') === '1';
    } catch (e) {}

    // ==================== Phase 54 — PERSISTENT PROFILE ====================
    var DEFAULT_PROFILE = {
      version: CFG.PROFILE_VERSION,
      best: 0,
      totalRuns: 0,
      totalDistanceM: 0,
      totalChai: 0,
      totalHearts: 0,
      totalBishesh: 0,
      teaMaster: false,           // Phase 50
      teaMasterCount: 0,
      achievements: [],            // Phase 42 — list of unlocked ids
      // Phase 14 — cosmetic cup skins. Brown is the default; others unlock silently via SKINS[].test.
      unlockedSkins: ['brown'],
      activeSkin: 'brown',
      settings: { lang: null, muted: null, debug: false },
      dailyStreak: 0,
      lastPlayedISO: null,
      firstRunDone: false,         // Phase 53
      // Phase 55 — telemetry (local only)
      telemetry: {
        runsByEnding: { fall: 0, hit404: 0, hitSad: 0, hitSpike: 0, hitSingara: 0, hitBiscuit: 0, hitGhost: 0, hitDark: 0, hitRock: 0, win: 0 },
        biomeReached: [0, 0, 0, 0],
        avgRunDistance: 0,
      }
    };
    var PROFILE = (function () {
      try {
        var raw = localStorage.getItem(CFG.PROFILE_KEY);
        if (!raw) {
          // Migrate legacy keys
          var legacyBest = parseInt(localStorage.getItem('bb_chai_runner_best') || '0', 10);
          DEFAULT_PROFILE.best = legacyBest;
          return JSON.parse(JSON.stringify(DEFAULT_PROFILE));
        }
        var p = JSON.parse(raw);
        // Schema migration
        if (!p.version || p.version < CFG.PROFILE_VERSION) {
          p = Object.assign({}, DEFAULT_PROFILE, p, { version: CFG.PROFILE_VERSION });
          if (!p.telemetry) p.telemetry = DEFAULT_PROFILE.telemetry;
          if (!p.settings) p.settings = DEFAULT_PROFILE.settings;
        }
        return p;
      } catch (e) {
        return JSON.parse(JSON.stringify(DEFAULT_PROFILE));
      }
    })();
    function saveProfile() {
      try { localStorage.setItem(CFG.PROFILE_KEY, JSON.stringify(PROFILE)); } catch (e) {}
    }
    // Daily streak update
    (function () {
      var today = new Date().toISOString().slice(0, 10);
      if (PROFILE.lastPlayedISO !== today) {
        var prev = PROFILE.lastPlayedISO;
        if (prev) {
          var d1 = new Date(prev), d2 = new Date(today);
          var diffDays = Math.round((d2 - d1) / 86400000);
          PROFILE.dailyStreak = diffDays === 1 ? (PROFILE.dailyStreak + 1) : 1;
        } else {
          PROFILE.dailyStreak = 1;
        }
        PROFILE.lastPlayedISO = today;
        saveProfile();
      }
    })();

    // ==================== Phase 43 — BILINGUAL (bn / en) ====================
    var STRINGS = {
      en: {
        title: 'চা Runner',
        startBtn: 'Start Running',
        startDesc: 'Tap to jump.',
        startTip: '',
        gameOver: 'চা শেষ!',
        tryAgain: 'Try Again',
        share: 'Share',
        win: 'Tea Master! 🏆',
        winDesc: 'You reached 8,000m. Cash out the badge or continue endless ×2?',
        cashOut: 'Cash Out',
        continueEndless: 'Continue Endless',
        pauseTitle: 'Paused',
        resume: 'Resume',
        settings: 'Settings',
        sound: 'Sound', quality: 'Quality', language: 'Language', motion: 'Motion',
        skin: 'Skin', daily: 'Daily',
        close: 'Close',
        score: 'Score', best: 'Best', distance: 'Distance', chai: 'Chai',
        achievements: 'Achievements',
        levelWelcome: 'Welcome to', biomeIntroJoin: ' · ',
        // Phase 16 — rotating death-screen hook lines (4 framings)
        hookBest:        'Best {best}m',
        hookCloseToBest: '{gap}m from new best',
        hookCloseToMs:   '{gap}m to {ms}',
        hookChaiStreak:  'Chai streak {n} — try for {goal}?'
      },
      bn: {
        title: 'চা Runner',
        startBtn: 'শুরু করো',
        startDesc: 'ট্যাপ করো লাফাতে।',
        startTip: '',
        gameOver: 'চা শেষ!',
        tryAgain: 'আবার',
        share: 'শেয়ার',
        win: 'চা মাস্টার! 🏆',
        winDesc: '৮০০০ মিটার পেরিয়েছ! ব্যাজ নাও নাকি অন্তহীন ×২ চালাও?',
        cashOut: 'ব্যাজ নাও',
        continueEndless: 'চালিয়ে যাও',
        pauseTitle: 'বিরতি',
        resume: 'চালু করো',
        settings: 'সেটিংস',
        sound: 'সাউন্ড', quality: 'কোয়ালিটি', language: 'ভাষা', motion: 'মোশন',
        skin: 'কাপ', daily: 'আজকের',
        close: 'বন্ধ',
        score: 'স্কোর', best: 'সেরা', distance: 'দূরত্ব', chai: 'চা',
        achievements: 'অর্জন',
        levelWelcome: 'স্বাগতম', biomeIntroJoin: ' · ',
        hookBest:        'সেরা {best}ম',
        hookCloseToBest: 'নতুন সেরা থেকে {gap}ম',
        hookCloseToMs:   '{ms} পৌঁছাতে {gap}ম',
        hookChaiStreak:  'চা চেইন {n} — {goal} চালাও?'
      }
    };
    var LANG = (function () {
      if (PROFILE.settings.lang === 'en' || PROFILE.settings.lang === 'bn') return PROFILE.settings.lang;
      var navLang = (navigator.language || 'en').toLowerCase();
      return navLang.indexOf('bn') === 0 ? 'bn' : 'en';
    })();
    function T(key) { return (STRINGS[LANG] && STRINGS[LANG][key]) || STRINGS.en[key] || key; }
    function setLang(l) {
      LANG = l; PROFILE.settings.lang = l; saveProfile();
    }

    // ==================== Phase 42 — ACHIEVEMENTS ====================
    var ACHIEVEMENTS = [
      { id: 'first_chai',  name: 'First Sip',       desc: 'Catch your first chai',           test: function(){ return PROFILE.totalChai >= 1; } },
      { id: 'chai_50',     name: 'Chai Lover',      desc: 'Catch 50 chai total',             test: function(){ return PROFILE.totalChai >= 50; } },
      { id: 'dist_500',    name: 'Para Hero',       desc: 'Reach 500m in one run',            test: function(){ return S.distanceM >= 500; } },
      { id: 'tea_master',  name: 'Tea Master',      desc: 'Reach 8,000m and defeat Mashala Deb', test: function(){ return PROFILE.teaMaster; } },
      { id: 'bishesh_1',   name: 'Special Brew',    desc: 'Catch a Bishesh chai',             test: function(){ return PROFILE.totalBishesh >= 1; } },
      { id: 'no_hit_300',  name: 'Untouchable',     desc: 'Reach 900m without taking a hit',  test: function(){ return S.distanceM >= 900 && S.lives === 3; } },
      { id: 'streak_3',    name: 'Daily Habit',     desc: 'Play 3 days in a row',            test: function(){ return PROFILE.dailyStreak >= 3; } },
      { id: 'runs_10',     name: 'Persistent',      desc: 'Play 10 runs total',              test: function(){ return PROFILE.totalRuns >= 10; } },
    ];
    function checkAchievements() {
      for (var i = 0; i < ACHIEVEMENTS.length; i++) {
        var a = ACHIEVEMENTS[i];
        if (PROFILE.achievements.indexOf(a.id) >= 0) continue;
        try {
          if (a.test()) {
            PROFILE.achievements.push(a.id);
            saveProfile();
            achievementToast(a.name);
          }
        } catch (e) {}
      }
    }
    function achievementToast(name) {
      var el = document.createElement('div');
      el.className = 'bb-achv';
      el.innerHTML = '<span style="font-size:18px;">🏅</span><div><div style="font-size:10px;color:#888;letter-spacing:0.06em;">ACHIEVEMENT</div><div style="font-weight:800;">' + name + '</div></div>';
      hud && hud.appendChild(el);
      requestAnimationFrame(function () { el.classList.add('in'); });
      setTimeout(function () { el.classList.remove('in'); setTimeout(function () { el.remove(); }, 350); }, 2800);
    }

    // ==================== Phase 51 — INPUT RECORDING (debug mode) ====================
    var DEBUG_MODE = (function () {
      try { return /[?&]debug=1/.test(window.location.search) || PROFILE.settings.debug === true; }
      catch (e) { return false; }
    })();
    var inputRecord = []; // [{t, type}]
    function recordInput(type) {
      if (!DEBUG_MODE) return;
      if (inputRecord.length > 5000) return; // cap
      inputRecord.push({ t: performance.now(), type: type });
    }

    // ==================== Phase 52 — ANTI-CHEAT (soft client-side flags) ====================
    var ANTICHEAT = {
      flags: [],
      lastNow: performance.now(),
      rafTampered: false,
      timeWarp: false,
    };
    // Detect rAF tampering
    (function () {
      try {
        var rafSrc = String(window.requestAnimationFrame);
        if (rafSrc.indexOf('[native code]') < 0) {
          ANTICHEAT.rafTampered = true;
          ANTICHEAT.flags.push('raf_tampered');
        }
      } catch (e) {}
    })();
    function anticheatTick() {
      // Time-warp detection
      var now = performance.now();
      var dt = now - ANTICHEAT.lastNow;
      ANTICHEAT.lastNow = now;
      if (dt < 0 || dt > 5000) {
        if (!ANTICHEAT.timeWarp) {
          ANTICHEAT.timeWarp = true;
          ANTICHEAT.flags.push('time_warp');
        }
      }
    }
    function anticheatValidateScore() {
      // Score should not exceed (distance/8 + bonus from chai*25*3)
      // Soft check only — used for future leaderboard
      var maxPlausible = (S.distancePx / 8) + (PROFILE.totalChai * 75) + 5000;
      if (S.score > maxPlausible) ANTICHEAT.flags.push('score_too_high:' + S.score);
    }

    // ==================== Phase 55 — TELEMETRY (local only) ====================
    function telemetryRecordRun(reason) {
      if (PROFILE.telemetry.runsByEnding[reason] === undefined) reason = 'fall';
      PROFILE.telemetry.runsByEnding[reason]++;
      PROFILE.telemetry.biomeReached[S.biomeIdx] = (PROFILE.telemetry.biomeReached[S.biomeIdx] || 0) + 1;
      var prevAvg = PROFILE.telemetry.avgRunDistance || 0;
      var totalRuns = PROFILE.totalRuns + 1;
      PROFILE.telemetry.avgRunDistance = Math.round((prevAvg * PROFILE.totalRuns + S.distanceM) / totalRuns);
    }

    // ==================== DAILY SEED ====================
    function todaySeed() {
      var d = new Date();
      return (d.getUTCFullYear()*10000 + (d.getUTCMonth()+1)*100 + d.getUTCDate()) | 0;
    }
    function makeRng(seed) {
      var state = (seed | 0) || 1;
      return function () {
        state = (state * 1664525 + 1013904223) | 0;
        return ((state >>> 0) % 1000000) / 1000000;
      };
    }
    var dailyRng = makeRng(todaySeed());
    var freeRng = Math.random;

    // ==================== STATE ====================
    var S = {
      started: false, gameOver: false, paused: false, siteBack: false,
      score: 0, bonusScore: 0, scoreDisplay: 0, scorePopT: 0,        // Phase 27 score pop
      best: PROFILE.best || 0,
      lives: 3, distancePx: 0,
      get distanceM() { return Math.floor(this.distancePx * CFG.METERS_PER_PX); },
      speed: CFG.SPEED_BASE,
      muted: false,
      retrySecs: 20,
      obstacles: [], chais: [], particles: [], floaters: [],
      hearts: [], bishesh: [], chanachur: [], bonusPickups: [],   // Phase 47, 48 + Batch 3/7
      petals: [], fireflies: [],   // Phase 24
      cameraShake: 0, hitFlash: 0, nearMissTint: 0,
      perfFrames: [], perfLastCheck: 0,

      patternQueue: [], nextPatternFrame: 0,
      framesSinceHit: 9999, postHitSafeUntil: 0,
      milestonesHit: [],          // Phase 1 — silent milestone toasts (1km, 2.5km, 5km, ...)

      deathTimes: [], cleanRunSinceSec: 0, densityMult: 1.0,

      lastStormScore: 0, stormState: 'idle', stormTimer: 0,
      stormSpawnInterval: 0, stormSpawned: 0,

      biomeIdx: 0, lastBiomeIdx: 0,

      tipsShown: JSON.parse(localStorage.getItem('bb_chai_runner_tips_v1') || '[]'),

      // Phase 28/9 — combo (tier ladder, silent)
      comboChain: 0, comboActive: false, comboTimer: 0,
      comboMult: 1, comboTier: 0,

      // Phase 22 — afterimage trail (only during rise)
      trail: [],

      // Phase 38 — landscape toast (one-time)
      landscapeToastShown: localStorage.getItem('bb_chai_landscape_v1') === '1',

      // Phase 47/48 — pickup eligibility tracking
      lastHeartScore: 0,
      lastBisheshDistM: 0,
      specialActive: false, specialTimer: 0,   // Phase 48 invincibility window
      lastChanachurDistM: 0,
      chanachurActive: false, chanachurTimer: 0,
      lastBonusPickupDistM: 0,
      lastAkashChaiM: 0,
      akashShown: false,

      // Boss state — active boss owns the spawn queue until defeated.
      boss: null,
      bossesDone: {},

      // Phase 49 — per-run stats
      runStats: { chai: 0, hearts: 0, bishesh: 0, nearMiss: 0, hits: 0, startTs: 0, endReason: 'fall', finalized: false },

      // Phase 50 — Win state
      won: false, endlessMode: false, endlessMult: 1,

      // Phase 53 — first-run onboarding
      onboarding: !PROFILE.firstRunDone,
      onboardJumped: false,
      onboardPauseFrames: 0,

      // Phase 23 — hit slowdown (0.15s visual offset on hit)
      hitSlowSec: 0,

      // Phase 27 — 100m distance signs
      distMarkers: [], lastMarkerM: 0,

      // Phase 28 — death camera zoom
      deathZoom: 1.0,

      // Q2 — double jump ring flash
      djRing: null, // { x, y, r, alpha }
    };

    // ==================== PLAYER ====================
    var player = {
      x: 0, y: 0, baseY: 0, vy: 0,
      jumpHeld: false, fastFall: false,
      onGround: true,
      width: 56, height: 64,
      squash: 1, rotation: 0,
      runFrame: 0, bobPhase: 0,
      blink: 0, blinkTimer: 0,
      hitImmuneSec: 0,
      coyoteFrames: 0, bufferedJumpFrames: 0, jumpHoldFrames: 0,
      stamina: CFG.STAMINA_MAX, staminaRegenSec: 0, jumpsUsed: 0,
    };
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);

    // Phase 24 — Tilt parallax via DeviceOrientation (±5° → far layer ±3px)
    var _tiltOffset = 0;
    (function () {
      if (typeof window.DeviceOrientationEvent === 'undefined') return;
      window.addEventListener('deviceorientation', function (e) {
        if (e.gamma == null) return;
        var g = Math.max(-5, Math.min(5, e.gamma));
        _tiltOffset = g * 0.6; // ±3px at ±5°
      }, { passive: true });
    })();

    // Phase 34 — visibility pause
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && S.started && !S.gameOver) S.paused = true;
    });

    // ==================== INPUT ====================
    function tryJump() {
      if (!S.started || S.paused || S.gameOver) return;
      if (player.onGround || player.coyoteFrames > 0) {
        player.vy = CFG.JUMP_VEL;
        player.onGround = false;
        player.coyoteFrames = 0;
        player.jumpHoldFrames = 0;
        player.jumpsUsed = 1;
        sfxJump();
        haptic(8); // Q5
        recordInput('jump');
        for (var i = 0; i < 6; i++) puff(player.x - 12, GROUND_Y, true);
        player.bufferedJumpFrames = 0;
        // Phase 53 — onboarding: micro-pause on the very first jump to teach apex
        if (S.onboarding && !S.onboardJumped) {
          S.onboardJumped = true;
          S.onboardPauseFrames = 30; // 0.5s
          // Phase 1b — instructional tip removed; player learns by playing.
        }
        return true;
      }
      if (!player.onGround && player.jumpsUsed < 2) {
        player.vy = CFG.DOUBLE_JUMP_VEL;
        player.jumpHoldFrames = 0;
        player.jumpsUsed = 2;
        if (player.stamina > 0) player.stamina--;
        player.staminaRegenSec = 0;
        sfxDouble();
        haptic(18); // Q5
        // Q2 — double jump ring flash at cup position
        S.djRing = { x: player.x, y: player.y, r: 4, alpha: 1.0 };
        for (var j = 0; j < 8; j++) {
          S.particles.push({
            x: player.x + (freeRng()-0.5)*30, y: player.y + 8,
            vx: (freeRng()-0.5)*3, vy: freeRng()*1.5,
            life: 1, size: 4 + freeRng()*3, color: [180, 220, 255]
          });
        }
        renderStamina();
        player.bufferedJumpFrames = 0;
        return true;
      }
      player.bufferedJumpFrames = CFG.JUMP_BUFFER_FRAMES;
      return false;
    }
    function jumpPress() { tryJump(); player.jumpHeld = true; }
    function jumpRelease() { player.jumpHeld = false; }
    // Q5 — haptic helper (silent on iOS / unsupported browsers)
    function haptic(pattern) {
      try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
    }

    // Pointer tracking + Phase 36 (two-finger pause)
    var pointerDownY = null;
    var activePointers = {};
    // E-1 — flush stale pointer IDs older than 600ms to prevent jump lock after OS interrupts
    function _flushStalePointers() {
      var now = Date.now();
      var keys = Object.keys(activePointers);
      for (var _pi = 0; _pi < keys.length; _pi++) {
        if (now - activePointers[keys[_pi]].ts > 600) delete activePointers[keys[_pi]];
      }
    }
    canvas.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      try { canvas.setPointerCapture(e.pointerId); } catch (captureErr) {}
      if (DEV_MAP) return;
      _flushStalePointers();
      activePointers[e.pointerId] = { x: e.clientX, y: e.clientY, ts: Date.now() };
      // Phase 36: two-finger tap toggles pause
      if (Object.keys(activePointers).length >= 2 && S.started && !S.gameOver) {
        if (S.paused) {
          // resume via countdown
          var existing = hud.querySelector('.bb-card');
          if (existing) { existing.classList.remove('in'); setTimeout(function(){ existing.remove(); }, 250); }
          showResumeCountdown();
        } else {
          showPauseMenu();
        }
        return;
      }
      pointerDownY = e.clientY;
      jumpPress();
    });
    canvas.addEventListener('pointermove', function (e) {
      if (activePointers[e.pointerId]) activePointers[e.pointerId].x = e.clientX, activePointers[e.pointerId].y = e.clientY;
      if (pointerDownY !== null && e.clientY - pointerDownY > 36 && Object.keys(activePointers).length === 1) {
        if (!player.onGround) player.fastFall = true;
      }
    });
    function clearPointer(e) {
      try { canvas.releasePointerCapture(e.pointerId); } catch (releaseErr) {}
      delete activePointers[e.pointerId];
      // E-1 — also flush any remaining stale IDs
      _flushStalePointers();
      if (Object.keys(activePointers).length === 0) {
        pointerDownY = null;
        jumpRelease();
        player.fastFall = false;
      }
    }
    canvas.addEventListener('pointerup', clearPointer);
    canvas.addEventListener('pointercancel', clearPointer);
    // E-1 — catch lostpointercapture (fires when OS interrupts touch)
    canvas.addEventListener('lostpointercapture', clearPointer);
    canvas.addEventListener('pointerleave', clearPointer);
    canvas.addEventListener('wheel', function (e) {
      if (!DEV_MAP) return;
      e.preventDefault();
      setDevMapPlaying(false);
      var step = e.shiftKey ? 400 : 80;
      setDevMapDistance(S.distanceM + (e.deltaY > 0 ? step : -step), true);
    }, { passive: false });
    window.addEventListener('keydown', function (e) {
      if (DEV_MAP) {
        if (e.code === 'Space') { if (!e.repeat) setDevMapPlaying(!devMapPlaying); e.preventDefault(); return; }
        if (e.code === 'ArrowRight') { e.preventDefault(); setDevMapPlaying(false); setDevMapDistance(S.distanceM + 100, true); return; }
        if (e.code === 'ArrowLeft') { e.preventDefault(); setDevMapPlaying(false); setDevMapDistance(S.distanceM - 100, true); return; }
        if (e.code === 'PageDown') { e.preventDefault(); setDevMapPlaying(false); devMapNextStop(); return; }
        if (e.code === 'PageUp') { e.preventDefault(); setDevMapPlaying(false); devMapPrevStop(); return; }
        if (e.code === 'Home') { e.preventDefault(); setDevMapPlaying(false); setDevMapDistance(0, true); return; }
        if (e.code === 'End') { e.preventDefault(); setDevMapPlaying(false); setDevMapDistance(DEV_MAP_MAX_M, true); return; }
        if (e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.key === 'w' || e.key === 'W' || e.key === 's' || e.key === 'S') { e.preventDefault(); return; }
      }
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        if (e.repeat) return;
        e.preventDefault(); jumpPress();
      } else if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault(); player.fastFall = true;
      } else if (e.key === 'p' || e.key === 'P') {
        if (S.started && !S.gameOver) {
          if (S.paused) {
            var existing2 = hud.querySelector('.bb-card');
            if (existing2) { existing2.classList.remove('in'); setTimeout(function(){ existing2.remove(); }, 250); }
            showResumeCountdown();
          } else {
            showPauseMenu();
          }
        }
      }
    });
    window.addEventListener('keyup', function (e) {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') jumpRelease();
      else if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') player.fastFall = false;
    });

    // ==================== AUDIO + Phase 35 (iOS unlock) + Phase 26 (ambient pad) ====================
    var audioCtx = null;
    var ambientPad = null; // { osc, gain, filter }
    function ensureAudio() {
      if (audioCtx) return audioCtx;
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
      return audioCtx;
    }
    function unlockAudio() {
      var c = ensureAudio(); if (!c) return;
      try { c.resume && c.resume(); } catch (e) {}
      // Tiny silent buffer to "unlock" iOS audio system
      try {
        var buf = c.createBuffer(1, 1, 22050);
        var src = c.createBufferSource();
        src.buffer = buf;
        src.connect(c.destination);
        src.start(0);
      } catch (e) {}
    }
    // Phase 35: one-shot global unlock listener
    function oneShotUnlock() {
      unlockAudio();
      window.removeEventListener('pointerdown', oneShotUnlock, true);
      window.removeEventListener('keydown', oneShotUnlock, true);
      window.removeEventListener('touchstart', oneShotUnlock, true);
    }
    window.addEventListener('pointerdown', oneShotUnlock, true);
    window.addEventListener('keydown', oneShotUnlock, true);
    window.addEventListener('touchstart', oneShotUnlock, true);

    function startAmbientPad() {
      // Phase 26: single filtered sine, off by default on mobile
      if (S.muted || ambientPad) return;
      var c = ensureAudio(); if (!c) return;
      try {
        var osc = c.createOscillator();
        var gain = c.createGain();
        var filter = c.createBiquadFilter();
        osc.type = 'sine';
        osc.frequency.value = 110; // A2
        filter.type = 'lowpass';
        filter.frequency.value = 600;
        filter.Q.value = 1.2;
        gain.gain.value = 0.0001;
        osc.connect(filter).connect(gain).connect(c.destination);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.018, c.currentTime + 1.5);
        ambientPad = { osc: osc, gain: gain, filter: filter };
      } catch (e) {}
    }
    function stopAmbientPad() {
      if (!ambientPad || !audioCtx) return;
      try {
        ambientPad.gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.4);
        var ref = ambientPad;
        setTimeout(function () { try { ref.osc.stop(); } catch (e) {} }, 600);
      } catch (e) {}
      ambientPad = null;
    }
    function updateAmbientPadForBiome(idx) {
      if (!ambientPad || !audioCtx) return;
      // Para 220Hz, Bazar 165Hz, Raat 110Hz, Cosmic 82Hz
      var freq = [220, 165, 110, 82][idx] || 110;
      var cutoff = [900, 700, 500, 350][idx] || 600;
      try {
        ambientPad.osc.frequency.linearRampToValueAtTime(freq, audioCtx.currentTime + 1.2);
        ambientPad.filter.frequency.linearRampToValueAtTime(cutoff, audioCtx.currentTime + 1.2);
      } catch (e) {}
    }
    function sfx(freq, freq2, dur, type, vol) {
      if (S.muted) return;
      var c = ensureAudio(); if (!c) return;
      var o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, c.currentTime);
      if (freq2) o.frequency.exponentialRampToValueAtTime(freq2, c.currentTime + dur);
      g.gain.setValueAtTime(vol || 0.12, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      o.connect(g).connect(c.destination);
      o.start(); o.stop(c.currentTime + dur + 0.02);
    }
    function sfxJump()    { sfx(520, 880, 0.12, 'square', 0.08); }
    function sfxDouble()  { sfx(700, 1100, 0.10, 'triangle', 0.09); }
    function sfxCollect() { sfx(880, 1320, 0.14, 'triangle', 0.1); }
    function sfxNear()    { sfx(1200, 900, 0.08, 'sine', 0.06); }
    function sfxHit()     { sfx(180, 60, 0.25, 'sawtooth', 0.18); }
    function sfxOver()    { sfx(440, 110, 0.5, 'square', 0.14); }
    function sfxLevelUp() { sfx(660, 990, 0.20, 'triangle', 0.1); }
    function sfxStorm()   { sfx(440, 1100, 0.30, 'sine', 0.09); }
    function sfxCombo()   { sfx(523, 1568, 0.18, 'triangle', 0.11); }
    function sfxCue()     { sfx(320, 520, 0.12, 'sine', 0.05); }

    // ==================== BIOMES ====================
    var BIOME_PALETTES = {
      para:   { skyTop:[135,206,235], skyBot:[255,220,180], ground1:'#8b6f47', ground2:'#5a4530', stars:false },
      bazar:  { skyTop:[255,140,80],  skyBot:[200,100,140], ground1:'#7a5430', ground2:'#3d2817', stars:false },
      raat:   { skyTop:[20,18,55],    skyBot:[60,40,90],    ground1:'#3d2f1f', ground2:'#1a1410', stars:true  },
      cosmic: { skyTop:[10,5,40],     skyBot:[60,20,100],   ground1:'#2a1a4a', ground2:'#0a0420', stars:true  }
    };
    function getActiveBiomeIdx(m) {
      for (var i = 0; i < CFG.BIOMES.length; i++) if (m < CFG.BIOMES[i].end) return i;
      return CFG.BIOMES.length - 1;
    }
    function getBiomeBlend(m, idx) {
      var b = CFG.BIOMES[idx]; if (b.end === Infinity) return 0;
      var dist = b.end - m;
      if (dist <= 0) return 0;
      if (dist >= CFG.BIOME_CROSSFADE_M) return 0;
      return 1 - dist / CFG.BIOME_CROSSFADE_M;
    }
    function lerpColor(a, b, t) {
      t = Math.max(0, Math.min(1, t));
      return [Math.round(a[0]+(b[0]-a[0])*t), Math.round(a[1]+(b[1]-a[1])*t), Math.round(a[2]+(b[2]-a[2])*t)];
    }
    function lerpHex(a, b, t) {
      function h(s){ return [parseInt(s.slice(1,3),16), parseInt(s.slice(3,5),16), parseInt(s.slice(5,7),16)]; }
      var c = lerpColor(h(a), h(b), t);
      return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
    }
    // Phase 6 — palette memoization. currentPalette() is called from drawBg + drawPlayer + tint;
    // recompute only when biomeIdx or distanceM (the only inputs) change.
    // Phase 18c — ANTI-FATIGUE post-cosmic: after 1000m, every 2000m we hue-shift the palette
    // by a tiny amount so scenery never feels truly repeated across a 3-hour session.
    function _hueShift(rgb, deg) {
      // cheap HSL rotate — deg is small (~12°) so no perceptual jolt.
      var r = rgb[0]/255, g = rgb[1]/255, b = rgb[2]/255;
      var mx = Math.max(r,g,b), mn = Math.min(r,g,b), d = mx - mn;
      var h = 0, s = 0, l = (mx + mn) / 2;
      if (d !== 0) {
        s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
        if (mx === r) h = ((g - b) / d) % 6;
        else if (mx === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h *= 60; if (h < 0) h += 360;
      }
      h = (h + deg + 360) % 360;
      // back to RGB
      var c = (1 - Math.abs(2*l - 1)) * s;
      var hp = h / 60, x2 = c * (1 - Math.abs(hp % 2 - 1));
      var r2=0,g2=0,b2=0;
      if (hp < 1) { r2=c; g2=x2; }
      else if (hp < 2) { r2=x2; g2=c; }
      else if (hp < 3) { g2=c; b2=x2; }
      else if (hp < 4) { g2=x2; b2=c; }
      else if (hp < 5) { r2=x2; b2=c; }
      else { r2=c; b2=x2; }
      var m = l - c/2;
      return [Math.round((r2+m)*255), Math.round((g2+m)*255), Math.round((b2+m)*255)];
    }
    var _palCache = { key: -1, val: null };
    function currentPalette() {
      var key = S.biomeIdx * 1000000 + (S.distanceM | 0);
      if (_palCache.key === key && _palCache.val) return _palCache.val;
      var b = CFG.BIOMES[S.biomeIdx];
      var p1 = BIOME_PALETTES[b.id];
      var blend = getBiomeBlend(S.distanceM, S.biomeIdx);
      var out;
      if (blend === 0) {
        out = p1;
      } else {
        var nextB = CFG.BIOMES[Math.min(S.biomeIdx + 1, CFG.BIOMES.length - 1)];
        var p2 = BIOME_PALETTES[nextB.id];
        out = {
          skyTop: lerpColor(p1.skyTop, p2.skyTop, blend),
          skyBot: lerpColor(p1.skyBot, p2.skyBot, blend),
          ground1: lerpHex(p1.ground1, p2.ground1, blend),
          ground2: lerpHex(p1.ground2, p2.ground2, blend),
          stars: blend > 0.5 ? p2.stars : p1.stars
        };
      }
      // Phase 18c — anti-fatigue hue rotation. Tiny shift (max ±15°)
      // every 2000m so long Mahakash runs never feel visually identical.
      if (S.distanceM >= 7000) {
        var hueDeg = Math.sin(S.distanceM / 2000 * Math.PI * 2) * 15;
        if (Math.abs(hueDeg) > 0.5) {
          out = {
            skyTop:  _hueShift(out.skyTop, hueDeg),
            skyBot:  _hueShift(out.skyBot, hueDeg),
            ground1: out.ground1,
            ground2: out.ground2,
            stars:   out.stars
          };
        }
      }
      _palCache.val = out; _palCache.key = key;
      return out;
    }

    // ==================== PATTERN LIBRARY ====================
    var OBSTACLE_META = {
      '404':        { size: 42, y: 'ground', draw: 'drawChili',      hit: 'hit404',    input: 'tap' },
      'cosmic_rock':{ size: 42, y: 'ground', draw: 'drawCosmicRock', hit: 'hitRock',   input: 'tap' },
      'sad':        { size: 50, y: 'air',    yOffset: 95,  draw: 'drawFly',        hit: 'hitSad',    input: 'tap_or_hold' },
      'sad_high':   { size: 50, y: 'air',    yOffset: 130, draw: 'drawFly',        hit: 'hitSad',    input: 'hold_or_double' },
      'spike':      { size: 38, y: 'ground', draw: 'drawPotty',      hit: 'hitSpike',  input: 'hold' },
      'ghost_404':  { size: 42, y: 'ground', draw: 'drawChiliGhost', hit: 'hitGhost',  input: 'tap' },
      'dark_spike': { size: 38, y: 'ground', draw: 'drawPottyDark',  hit: 'hitDark',   input: 'hold', cue: true }
    };

    var BONUS_PICKUP_META = {
      marie:   { draw: 'drawBiscuit',    value: 20, label: '+20', color: [34,197,94],  yOffset: 112 },
      singara: { draw: 'drawSingara',    value: 30, label: '+30', color: [16,185,129], yOffset: 142 },
      slice:   { draw: 'drawBreadSlice', value: 50, label: '+50', color: [20,184,166], yOffset: 172 }
    };
    var BONUS_PICKUP_ORDER = ['marie', 'singara', 'slice'];

    var BOSS_DEFS = [
      {
        id: 'bhoot_mama', distance: 1000, name: 'Bhoot Mama', bn: 'ভূত মামা', draw: 'drawBhootMama', reward: 500,
        defeated: 'Bhoot Mama fled! +500', gapFrames: 92, recoveryFrames: 120,
        waves: [
          [{type:'ghost_404', dx:0}],
          [{type:'ghost_404', dx:0}],
          [{type:'ghost_404', dx:0}, {type:'404', dx:220}]
        ]
      },
      {
        id: 'bazar_raja', distance: 2500, name: 'Bazar Raja', bn: 'বাজার রাজা', draw: 'drawBazarRaja', reward: 800,
        defeated: 'Bazar Raja down! +800', gapFrames: 96, recoveryFrames: 150,
        waves: [
          [{type:'404', dx:0}, {type:'spike', dx:230}],
          [{type:'sad_high', dx:0}, {type:'404', dx:190}],
          [{type:'404', dx:0}, {type:'sad_high', dx:160}, {type:'spike', dx:330}]
        ]
      },
      {
        id: 'bhoot_jolokia', distance: 5000, name: 'Bhoot Jolokia', bn: 'ভূত জলোকিয়া', draw: 'drawBhootJolokia', reward: 1200,
        defeated: 'Jolokia defeated! +1200', gapFrames: 104, recoveryFrames: 180,
        waves: [
          [{type:'ghost_404', dx:0}, {type:'dark_spike', dx:220}],
          [{type:'sad_high', dx:0}, {type:'ghost_404', dx:180}],
          [{type:'ghost_404', dx:0}, {type:'sad_high', dx:150}, {type:'dark_spike', dx:330}],
          [{type:'sad_high', dx:0}, {type:'ghost_404', dx:170}, {type:'sad_high', dx:340}]
        ]
      },
      {
        id: 'mashala_deb', distance: 8000, name: 'Mashala Deb', bn: 'মশলা দেব', draw: 'drawMashalaDeb', reward: 3000,
        defeated: 'Tea Master! Endless x2 unlocked', gapFrames: 112, recoveryFrames: 240, final: true,
        waves: [
          [{type:'404', dx:0}, {type:'cosmic_rock', dx:220}],
          [{type:'sad_high', dx:0}, {type:'404', dx:180}],
          [{type:'dark_spike', dx:0}, {type:'sad_high', dx:220}],
          [{type:'ghost_404', dx:0}, {type:'sad_high', dx:150}, {type:'dark_spike', dx:340}],
          [{type:'cosmic_rock', dx:0}, {type:'sad_high', dx:170}, {type:'ghost_404', dx:360}]
        ]
      }
    ];

    function obstacleMeta(type) {
      return OBSTACLE_META[type] || OBSTACLE_META['404'];
    }

    var PATTERNS = {
      easy: [
        [{type:'404', dx:0}],
        [{type:'sad', dx:0}],
        [{type:'spike', dx:0}],
        [{type:'404', dx:0}, {type:'404', dx:200}],
      ],
      medium: [
        [{type:'404', dx:0}, {type:'sad', dx:240}],
        [{type:'spike', dx:0}, {type:'404', dx:200}],
        [{type:'sad', dx:0}, {type:'spike', dx:220}],
        [{type:'404', dx:0}, {type:'404', dx:140}, {type:'404', dx:280}],
        [{type:'spike', dx:0}, {type:'spike', dx:170}],
      ],
      bazar: [
        [{type:'404', dx:0}, {type:'sad_high', dx:150}],
        [{type:'spike', dx:0}, {type:'404', dx:220}],
        [{type:'404', dx:0}, {type:'sad', dx:190}, {type:'spike', dx:250}],
        [{type:'sad_high', dx:0}, {type:'404', dx:190}],
        [{type:'404', dx:0}, {type:'spike', dx:170}, {type:'sad_high', dx:300}]
      ],
      hard: [
        [{type:'spike', dx:0}, {type:'spike', dx:140}, {type:'spike', dx:280}],
        [{type:'sad', dx:0}, {type:'spike', dx:130}, {type:'404', dx:260}],
        [{type:'404', dx:0}, {type:'spike', dx:120}, {type:'sad', dx:240}],
      ],
      raat: [
        [{type:'ghost_404', dx:0}],
        [{type:'ghost_404', dx:0}, {type:'dark_spike', dx:220}],
        [{type:'ghost_404', dx:0}, {type:'sad_high', dx:150}],
        [{type:'ghost_404', dx:0}, {type:'dark_spike', dx:190}, {type:'sad', dx:240}],
        [{type:'sad_high', dx:0}, {type:'dark_spike', dx:220}],
        [{type:'ghost_404', dx:0}, {type:'dark_spike', dx:170}, {type:'sad_high', dx:240}]
      ],
      cosmic: [
        [{type:'cosmic_rock', dx:0}],
        [{type:'cosmic_rock', dx:0}, {type:'sad_high', dx:170}],
        [{type:'ghost_404', dx:0}, {type:'cosmic_rock', dx:220}],
        [{type:'cosmic_rock', dx:0}, {type:'dark_spike', dx:220}, {type:'sad_high', dx:390}],
        [{type:'sad_high', dx:0}, {type:'cosmic_rock', dx:180}, {type:'ghost_404', dx:360}]
      ],
      // Phase 11 — 5 hand-authored set-pieces, gated by score thresholds (300/600/1000/2000/5000).
      // Each unlocks silently. They progressively shorten gaps and stack triple-jumps.
      expert: [
        // 300m — "Picket Fence": tight spike row demanding rhythm timing
        [{type:'spike', dx:0}, {type:'spike', dx:120}, {type:'spike', dx:240}, {type:'spike', dx:360}],
        // 600m — "Cloud Trap": low-high alt swap (sad cloud forces fast-fall, then spike)
        [{type:'sad', dx:0}, {type:'spike', dx:150}, {type:'sad', dx:300}, {type:'spike', dx:420}],
        // 1000m — "404 Wall": three 404s in a stairstep — needs apex hold
        [{type:'404', dx:0}, {type:'404', dx:130}, {type:'404', dx:260}, {type:'spike', dx:380}],
        // 2000m — "Glass Floor": alternating spike-sad-spike-sad rapid fire
        [{type:'spike', dx:0}, {type:'sad', dx:140}, {type:'spike', dx:260}, {type:'sad', dx:380}, {type:'spike', dx:500}],
        // 5000m — "Endgame": brutal mixed wall — only viable post-plateau
        [{type:'404', dx:0}, {type:'spike', dx:120}, {type:'sad', dx:230}, {type:'spike', dx:340}, {type:'404', dx:450}, {type:'spike', dx:560}]
      ]
    };
    function pickPattern() {
      var bId = CFG.BIOMES[S.biomeIdx].id;
      var pool;
      if (bId === 'para')   pool = PATTERNS.easy.concat(PATTERNS.easy, PATTERNS.medium);
      else if (bId === 'bazar') pool = PATTERNS.easy.concat(PATTERNS.medium, PATTERNS.bazar, PATTERNS.bazar);
      else if (bId === 'raat')  pool = PATTERNS.medium.concat(PATTERNS.hard, PATTERNS.raat, PATTERNS.raat);
      else                       pool = PATTERNS.medium.concat(PATTERNS.hard, PATTERNS.raat, PATTERNS.cosmic, PATTERNS.cosmic);
      // Phase 11 — splice in expert set-pieces as distance milestones unlock them.
      // Scaled to the 30-minute arc — patterns unlock at Para-mid, Bazar-early, Bazar-mid, Raat-early, Mahakash.
      var sc = S.distanceM | 0;
      var unlockedExpert = 0;
      if (sc >= 900)   unlockedExpert = 1;  // Para mid — Picket Fence
      if (sc >= 1500)  unlockedExpert = 2;  // Bazar start — Cloud Trap
      if (sc >= 3000)  unlockedExpert = 3;  // Bazar mid — 404 Wall
      if (sc >= 5000)  unlockedExpert = 4;  // Raat start — Glass Floor
      if (sc >= 7000)  unlockedExpert = 5;  // Mahakash — Endgame
      if (unlockedExpert > 0) {
        for (var ei = 0; ei < unlockedExpert; ei++) pool.push(PATTERNS.expert[ei]);
      }
      return pool[Math.floor(dailyRng() * pool.length)];
    }
    function queuePattern() {
      var p = pickPattern();
      queuePatternSteps(p);
    }
    function queuePatternSteps(p) {
      for (var i = 0; i < p.length; i++) {
        S.patternQueue.push({ type: p[i].type, dxRemaining: p[i].dx });
      }
    }

    function obstacleSize(type) {
      return obstacleMeta(type).size;
    }
    function spawnObstacle(type) {
      var size = obstacleSize(type);
      var meta = obstacleMeta(type);
      var y = meta.y === 'air' ? GROUND_Y - (meta.yOffset || 95) : GROUND_Y - size/2 - 2;
      S.obstacles.push({
        x: W + 60, y: y, size: size, type: type,
        rot: 0, bob: dailyRng() * Math.PI * 2, nearMissed: false
      });
    }
    function spawnChai(yOverride) {
      var y = yOverride !== undefined ? yOverride : (GROUND_Y - 80 - dailyRng() * 100);
      S.chais.push({ x: W + 40, y: y, bob: freeRng()*Math.PI*2 });
    }
    // Phase 47 — Heart pickup (only spawns if lives < 3)
    function spawnHeart() {
      var y = GROUND_Y - 100 - freeRng() * 70;
      S.hearts.push({ x: W + 40, y: y, bob: freeRng()*Math.PI*2 });
    }
    // Phase 48 — Bishesh chai (special golden, +×3 + invincibility)
    function spawnBishesh() {
      var y = GROUND_Y - 130 - freeRng() * 80;
      S.bishesh.push({ x: W + 40, y: y, bob: freeRng()*Math.PI*2, glow: 0 });
    }
    function spawnChanachur() {
      var y = GROUND_Y - 120 - freeRng() * 80;
      S.chanachur.push({ x: W + 40, y: y, bob: freeRng()*Math.PI*2, glow: 0 });
    }
    function bonusPickupMeta(type) {
      return BONUS_PICKUP_META[type] || BONUS_PICKUP_META.marie;
    }
    function chooseBonusPickupType() {
      if (S.distanceM >= 3500 && freeRng() < 0.24) return 'slice';
      if (S.distanceM >= 2000 && freeRng() < 0.45) return 'singara';
      return 'marie';
    }
    function spawnBonusPickup(type) {
      var meta = bonusPickupMeta(type);
      S.bonusPickups.push({ x: W + 44, y: GROUND_Y - meta.yOffset, type: type, bob: freeRng()*Math.PI*2, glow: 0 });
    }
    function isAkashganga() {
      return S.distanceM >= CFG.AKASHGANGA_START_M && S.distanceM < CFG.AKASHGANGA_END_M;
    }
    function nextDueBoss() {
      for (var i = 0; i < BOSS_DEFS.length; i++) {
        var def = BOSS_DEFS[i];
        if (!S.bossesDone[def.id] && S.distanceM >= def.distance) return def;
      }
      return null;
    }
    function startBoss(def) {
      S.boss = { def: def, waveIndex: 0, introFrames: CFG.BOSS_INTRO_FRAMES, nextWaveFrame: 0 };
      S.patternQueue = [];
      S.obstacles = [];
      S.postHitSafeUntil = frameCounter + 45;
      showLevelBanner(def.name + ' · ' + def.bn);
      sfxStorm();
      haptic([10, 8, 24]);
    }
    function finishBoss(frameNow) {
      if (!S.boss) return;
      var def = S.boss.def;
      S.bossesDone[def.id] = true;
      S.boss = null;
      S.patternQueue = [];
      S.bonusScore += def.reward;
      S.postHitSafeUntil = frameNow + (def.recoveryFrames || 120);
      sparkleBurst(player.x + 70, player.y - 30, def.final ? [244,196,48] : [34,197,94], 26);
      floater('+' + def.reward, player.x + 74, player.y - 52, def.final ? '#f4c430' : '#22c55e');
      showTip(def.defeated);
      sfxLevelUp();
      if (def.final) {
        PROFILE.teaMaster = true;
        PROFILE.teaMasterCount++;
        S.endlessMode = true;
        S.endlessMult = CFG.ENDLESS_MULT;
        saveProfile();
      }
      maybeUnlockSkin();
    }
    function updateBossQueue(frameNow) {
      if (!S.boss) {
        var due = nextDueBoss();
        if (due) startBoss(due);
      }
      if (!S.boss) return false;
      if (S.boss.introFrames > 0) {
        S.boss.introFrames--;
        return true;
      }
      if (S.patternQueue.length === 0) {
        var def = S.boss.def;
        if (S.boss.waveIndex >= def.waves.length) {
          if (frameNow >= S.boss.nextWaveFrame) finishBoss(frameNow);
          return true;
        }
        if (frameNow >= S.boss.nextWaveFrame) {
          queuePatternSteps(def.waves[S.boss.waveIndex]);
          S.boss.waveIndex++;
          S.boss.nextWaveFrame = frameNow + (def.gapFrames || 90);
          if (S.patternQueue.length > 0) S.patternQueue[0].dxRemaining = 0;
          sfxCue();
        }
      }
      return true;
    }
    function updateSpawnScheduler(frameNow) {
      if (frameNow < S.postHitSafeUntil) return;
      if (isAkashganga()) return;
      if (S.stormState !== 'idle') return;
      var bossMode = updateBossQueue(frameNow);
      if (!bossMode && S.patternQueue.length === 0 && frameNow >= S.nextPatternFrame) {
        queuePattern();
        if (S.patternQueue.length > 0) S.patternQueue[0].dxRemaining = 0;
      }
      if (S.patternQueue.length === 0) return;
      var head = S.patternQueue[0];
      if (head.type === 'dark_spike' && !head.cueFired && head.dxRemaining <= Math.max(S.speed * 18, 1)) {
        head.cueFired = true;
        sfxCue();
      }
      if (head.dxRemaining <= 0) {
        // Phase 53 — onboarding: only spawn 404 obstacles
        var spawnType = (S.onboarding && head.type !== '404') ? '404' : head.type;
        spawnObstacle(spawnType);
        S.patternQueue.shift();
        if (!bossMode && S.patternQueue.length === 0) {
          // Phase 18a — TRUE INFINITE DIFFICULTY. Density climbs logarithmically forever after speed plateau.
          // At 5000m gaps are ~60% of base; at 20000m gaps cap at ~45%. Pure pattern density, not speed.
          var infMult = 1 + Math.log10(Math.max(1, S.distanceM / 500)) * 0.55;
          if (infMult > 2.2) infMult = 2.2; // hard cap so it stays playable
          var gap = CFG.PATTERN_GAP_BASE_FRAMES / (S.densityMult * infMult);
          if (S.biomeIdx === 1) gap *= 0.85;
          else if (S.biomeIdx === 2) gap *= 0.72;
          else if (S.biomeIdx === 3) gap *= 0.65;
          if (S.onboarding) gap *= CFG.ONBOARD_GAP_MULT;
          gap = Math.max(CFG.PATTERN_GAP_MIN_FRAMES, gap);
          S.nextPatternFrame = frameNow + gap;
        }
      }
    }

    // ==================== HUD ====================
    var hud = document.createElement('div');
    hud.id = 'bb-hud';
    hud.innerHTML = [
      '<style>',
      "#bb-hud { position:absolute; inset:0; z-index:100001; pointer-events:none; font-family:-apple-system,BlinkMacSystemFont,'Inter','Hind Siliguri',sans-serif; color:#fff;",
      // Phase 37 — safe-area insets
      "  padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); padding-left: env(safe-area-inset-left, 0px); padding-right: env(safe-area-inset-right, 0px); }",
      ".bb-ui-container { position:absolute; inset:0; z-index:100001; pointer-events:none; font-family:-apple-system,BlinkMacSystemFont,'Inter','Hind Siliguri',sans-serif; }",
      ".bb-hud-minimal { position:absolute; top:12px; left:16px; right:16px; display:flex; justify-content:space-between; align-items:center; }",
      ".bb-score-minimal { color:#fff; font-size:18px; font-weight:700; letter-spacing:1px; text-shadow:0 1px 3px rgba(0,0,0,0.6); pointer-events:auto; cursor:pointer; transition:transform 0.18s, color 0.18s; }",
      ".bb-score-minimal.pop { transform:scale(1.2); color:#f97316; transition:transform 0.15s; }",
      ".bb-score-minimal.tier-up { color:#f4c430; transform:scale(1.35); }",
      ".bb-daily-badge { display:inline-block; font-size:9px; font-weight:700; letter-spacing:1px; padding:2px 7px; border-radius:100px; background:rgba(244,196,48,0.14); border:1px solid rgba(244,196,48,0.35); color:#f4c430; vertical-align:middle; }",
      ".bb-skin-swatch { width:18px; height:18px; border-radius:50%; display:inline-block; vertical-align:middle; border:2px solid rgba(255,255,255,0.15); }",
      ".bb-lives-minimal { display:flex; gap:6px; align-items:center; pointer-events:auto; }",
      ".bb-dot { width:7px; height:7px; border-radius:50%; background:#fff; transition:background 0.3s; }",
      ".bb-dot.empty { background:rgba(255,255,255,0.2); }",
      ".bb-pause-btn { background:transparent; border:none; color:rgba(255,255,255,0.8); font-size:14px; cursor:pointer; padding:4px 8px; margin-left:8px; line-height:1; }",

      // Phase 30 — instant card with 0.4s ease-in
      ".bb-card { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%) scale(0.92); opacity:0; background:rgba(15,15,15,0.94); -webkit-backdrop-filter:blur(28px); backdrop-filter:blur(28px); border:1px solid rgba(255,255,255,0.1); border-radius:22px; padding:28px 30px; text-align:center; max-width:88vw; width:340px; pointer-events:auto; box-shadow:0 22px 70px rgba(0,0,0,0.75); transition:opacity 0.4s ease-out, transform 0.4s cubic-bezier(0.34,1.56,0.64,1); }",
      ".bb-card.in { transform:translate(-50%,-50%) scale(1); opacity:1; }",
      ".bb-card h2 { font-size:16px; font-weight:600; margin:0 0 12px; color:rgba(255,255,255,0.5); letter-spacing:2px; text-transform:uppercase; }",
      ".bb-card p { font-size:44px; font-weight:300; color:#fff; margin:0 0 24px; letter-spacing:1px; line-height:1; }",
      ".bb-card.bb-start p { font-size:18px; font-weight:400; letter-spacing:0.5px; margin:0 0 22px; line-height:1.4; color:rgba(255,255,255,0.85); }",
      ".bb-best-line { font-size:11px; color:rgba(255,255,255,0.4); letter-spacing:1.5px; text-transform:uppercase; margin:-14px 0 20px; font-weight:600; }",
      ".bb-btn { background:#fff; color:#000; border:none; border-radius:100px; padding:12px 32px; font-size:15px; font-weight:600; cursor:pointer; transition:transform 0.15s; letter-spacing:0.02em; font-family:inherit; width:100%; max-width:200px; }",
      ".bb-btn:hover { transform:scale(1.04); }",
      ".bb-btn:active { transform:scale(0.96); }",
      ".bb-level-banner { position:absolute; top:80px; left:50%; transform:translateX(-50%) translateY(-20px); background:linear-gradient(135deg,rgba(255,255,255,0.95),rgba(230,230,230,0.95)); color:#000; padding:10px 20px; border-radius:100px; font-size:13px; font-weight:600; opacity:0; transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1); pointer-events:none; box-shadow:0 10px 30px rgba(0,0,0,0.2); white-space:nowrap; }",
      ".bb-level-banner.show { opacity:1; transform:translateX(-50%) translateY(0); }",
      ".bb-poptip { position:absolute; bottom:20px; left:50%; transform:translateX(-50%); color:rgba(255,255,255,0.4); font-size:11px; letter-spacing:1px; opacity:0; transition:opacity 0.4s; pointer-events:none; }",
      ".bb-poptip.show { opacity:1; }",
      ".bb-pause { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:20px; font-weight:500; letter-spacing:1px; color:#fff; pointer-events:none; }",
      "@keyframes bbP { 0%,80%,100%{transform:scale(0.55);opacity:0.5} 40%{transform:scale(1);opacity:1} }",
      "@keyframes bbCombo { 0%{transform:scale(0.7);opacity:0} 100%{transform:scale(1);opacity:1} }",
      ".bb-bottom { display:none; }",
      // Phase 17/41 — SLIM PREMIUM Settings panel (user demand: "very slim very small premium").
      // Width 280, padding 18, tight rows. Stats + achievements moved OFF this sheet (per Phase 17 spec).
      ".bb-sheet { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%) scale(0.94); opacity:0; background:rgba(12,12,14,0.94); -webkit-backdrop-filter:blur(24px); backdrop-filter:blur(24px); border:1px solid rgba(255,255,255,0.08); border-radius:18px; padding:16px 18px 14px; width:260px; max-width:88vw; pointer-events:auto; box-shadow:0 18px 50px rgba(0,0,0,0.7); transition:opacity 0.25s ease-out, transform 0.25s cubic-bezier(0.34,1.56,0.64,1); z-index:2; }",
      ".bb-sheet.in { transform:translate(-50%,-50%) scale(1); opacity:1; }",
      ".bb-sheet h3 { font-size:13px; margin:0 0 10px; font-weight:600; color:rgba(255,255,255,0.9); letter-spacing:1.5px; text-transform:uppercase; display:flex; align-items:center; justify-content:space-between; }",
      ".bb-row { display:flex; justify-content:space-between; align-items:center; padding:7px 0; border-bottom:1px solid rgba(255,255,255,0.04); }",
      ".bb-row:last-of-type { border-bottom:0; }",
      ".bb-row label { color:rgba(255,255,255,0.65); font-size:11px; font-weight:600; letter-spacing:0.5px; }",
      ".bb-row .bb-seg { display:flex; gap:2px; background:rgba(255,255,255,0.05); padding:2px; border-radius:100px; }",
      ".bb-row .bb-seg button { background:transparent; color:rgba(255,255,255,0.55); border:0; padding:4px 9px; border-radius:100px; font-size:10px; font-weight:700; cursor:pointer; transition:all 0.15s; font-family:inherit; max-width:72px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }",
      ".bb-row .bb-seg button.on { background:#f4c430; color:#1a0f00; }",
      ".bb-skin-row { display:flex; justify-content:space-between; align-items:center; gap:10px; padding:7px 0; border-bottom:1px solid rgba(255,255,255,0.04); }",
      ".bb-skin-row label { color:rgba(255,255,255,0.65); font-size:11px; font-weight:600; letter-spacing:0.5px; }",
      ".bb-skin-select { min-width:0; width:142px; border:0; border-radius:999px; padding:6px 30px 6px 10px; background:#f4c430; color:#1a0f00; font:800 10px -apple-system,BlinkMacSystemFont,'Inter','Hind Siliguri',sans-serif; outline:0; cursor:pointer; }",
      ".bb-stats-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:14px 0; }",
      ".bb-stat-cell { background:rgba(255,255,255,0.04); padding:10px; border-radius:12px; }",
      ".bb-stat-cell .bb-k { font-size:10px; color:#888; letter-spacing:0.06em; text-transform:uppercase; }",
      ".bb-stat-cell .bb-v { font-size:18px; font-weight:800; color:#fff; margin-top:2px; }",
      ".bb-bar { background:rgba(255,255,255,0.08); height:6px; border-radius:3px; overflow:hidden; margin-top:6px; }",
      ".bb-bar-fill { background:linear-gradient(90deg,#f4c430,#f97316); height:100%; transition:width 0.6s cubic-bezier(0.34,1.56,0.64,1); }",
      ".bb-achv-list { display:flex; flex-wrap:wrap; gap:6px; margin-top:12px; }",
      ".bb-achv-pill { font-size:10px; padding:4px 8px; border-radius:100px; background:rgba(244,196,48,0.15); border:1px solid rgba(244,196,48,0.4); color:#f4c430; font-weight:700; }",
      ".bb-achv-pill.locked { background:rgba(255,255,255,0.04); border-color:rgba(255,255,255,0.08); color:#555; }",
      // Phase 42 — Achievement toast
      ".bb-achv { position:absolute; bottom:80px; left:50%; transform:translateX(-50%) translateY(20px); opacity:0; background:linear-gradient(135deg,rgba(244,196,48,0.95),rgba(249,115,22,0.95)); color:#1a0f00; padding:10px 16px; border-radius:14px; display:flex; gap:10px; align-items:center; font-family:inherit; box-shadow:0 12px 32px rgba(244,196,48,0.4); transition:all 0.35s cubic-bezier(0.34,1.56,0.64,1); pointer-events:none; }",
      ".bb-achv.in { opacity:1; transform:translateX(-50%) translateY(0); }",
      // Phase 44 — Pause countdown
      ".bb-countdown { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); font-size:96px; font-weight:900; color:#fff; text-shadow:0 6px 30px rgba(0,0,0,0.6); pointer-events:none; opacity:0.95; font-family:inherit; }",
      // Phase 50 — Win banner
      ".bb-win { background:linear-gradient(135deg,#fff 0%,#f1f1f1 100%); color:#000; }",
      ".bb-win h2 { color:#000; }",
      ".bb-win p { color:rgba(0,0,0,0.8); }",
      ".bb-devmap { position:absolute; left:50%; bottom:calc(18px + env(safe-area-inset-bottom,0px)); transform:translateX(-50%); width:min(680px,calc(100vw - 28px)); padding:12px 14px; border-radius:16px; background:rgba(8,12,18,0.84); border:1px solid rgba(255,255,255,0.14); box-shadow:0 16px 50px rgba(0,0,0,0.38); pointer-events:auto; color:#fff; font-family:inherit; }",
      ".bb-devmap-top { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:9px; }",
      ".bb-devmap-title { min-width:0; }",
      ".bb-devmap-kicker { font-size:9px; font-weight:900; letter-spacing:1.6px; text-transform:uppercase; color:#5eead4; }",
      ".bb-devmap-name { font-size:15px; font-weight:900; line-height:1.15; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }",
      ".bb-devmap-meter { font-size:22px; font-weight:900; color:#fff; font-variant-numeric:tabular-nums; }",
      ".bb-devmap input[type=range] { width:100%; accent-color:#10b981; cursor:pointer; }",
      ".bb-devmap-actions { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:8px; }",
      ".bb-devmap-actions button { border:1px solid rgba(255,255,255,0.16); background:rgba(255,255,255,0.08); color:#fff; border-radius:999px; padding:6px 10px; font:800 11px -apple-system,BlinkMacSystemFont,'Inter','Hind Siliguri',sans-serif; cursor:pointer; }",
      ".bb-devmap-actions button:hover { background:rgba(255,255,255,0.16); }",
      ".bb-devmap-hint { font-size:10px; color:rgba(255,255,255,0.58); text-align:right; white-space:nowrap; }",
      "@media (max-width:520px){ .bb-devmap { bottom:10px; padding:10px; } .bb-devmap-name { font-size:13px; } .bb-devmap-meter { font-size:18px; } .bb-devmap-hint { display:none; } }",
      '</style>',
      '<div class="bb-ui-container">',
      '  <div class="bb-hud-minimal">',
      '    <div class="bb-score-minimal" id="bb-score" title="Click for secrets">0</div>',
      '    <div class="bb-lives-minimal">',
      '      <div id="bb-hearts" style="display:flex;gap:6px;"></div>',
      '      <button class="bb-pause-btn" id="bb-gear">❚❚</button>',
      '    </div>',
      '  </div>',
      '  <div class="bb-level-banner" id="bb-level"></div>',
      '  <div class="bb-poptip" id="bb-tip"></div>',
      '  <div class="bb-bottom" id="bb-bottom"><a id="bb-now">Refresh</a></div>',
      '</div>'
    ].join('');
    overlay.appendChild(hud);

    function renderHearts() {
      var html = '';
      for (var i = 0; i < 3; i++) {
        var f = i < S.lives;
        html += '<div class="bb-dot' + (f ? '' : ' empty') + '"></div>';
      }
      var el = document.getElementById('bb-hearts'); if (el) el.innerHTML = html;
    }
    function renderStamina() {
      var html = '';
      for (var i = 0; i < CFG.STAMINA_MAX; i++) {
        html += '<div class="bb-st' + (i < player.stamina ? '' : ' empty') + '"></div>';
      }
      var el = document.getElementById('bb-stamina'); if (el) el.innerHTML = html;
    }
    // Phase 7 — DOM thrash kill: only touch textContent on actual change.
    // Phase 26 — score number ease-in: tween displayed value toward S.score over ~180ms instead of
    // step-jumping. Feels rich on combo bursts. Pure DOM textContent — no layout cost since width is fixed.
    var lastDisplayedScore = -1;
    var displayedScore = 0;
    var lastPopScore = 0;
    var scoreEl = document.getElementById('bb-score');
    function updateHUD() {
      if (!scoreEl) return;
      // E-2: REDUCED_MOTION = snap instantly, no tween
      if (REDUCED_MOTION) {
        displayedScore = S.score;
      } else if (displayedScore !== S.score) {
        var diff = S.score - displayedScore;
        if (Math.abs(diff) <= 1) displayedScore = S.score;
        else displayedScore += Math.sign(diff) * Math.max(1, Math.ceil(Math.abs(diff) * 0.12));
      }
      if (displayedScore !== lastDisplayedScore) {
        scoreEl.textContent = displayedScore;
        lastDisplayedScore = displayedScore;
        // Phase 27 — pop animation when score crosses 10s digit
        if (S.score - lastPopScore >= 10) {
          scoreEl.classList.add('pop');
          setTimeout(function () { scoreEl.classList.remove('pop'); }, 200);
          lastPopScore = S.score;
        }
      }
    }
    renderHearts(); updateHUD();

    // Phase 3 — mute/quality buttons live in pause sheet only. Stub `muteBtn` so legacy refs are no-ops.
    var muteBtn = { textContent: '' };
    var IS_MOBILE = window.matchMedia('(max-width:640px)').matches;
    if (PROFILE.settings.muted !== null && PROFILE.settings.muted !== undefined) {
      S.muted = !!PROFILE.settings.muted;
    } else if (IS_MOBILE) {
      // Phase 26: ambient pad off by default on mobile (mute on)
      S.muted = true;
    }
    // Phase 32 — Quality auto-detect persists. Toggle UI lives in pause sheet (Phase 17).
    function refreshQualityBtn() { /* phantom button removed in Phase 3 */ }
    var nowBtn = document.getElementById('bb-now');
    if (nowBtn) nowBtn.addEventListener('click', function () {
      window.location.replace(window.location.pathname);
    });

    // Phase 41 — Settings gear button
    document.getElementById('bb-gear').addEventListener('click', function (e) {
      e.stopPropagation();
      showSettings();
    });

    // Phase 46 — 7-tap easter egg on score badge
    var scoreTapCount = 0, scoreTapTimer = null;
    var scoreBadge = document.getElementById('bb-score');
    if (scoreBadge && scoreBadge.parentElement) {
      scoreBadge.parentElement.style.pointerEvents = 'auto';
      scoreBadge.parentElement.style.cursor = 'pointer';
      scoreBadge.parentElement.addEventListener('click', function () {
        scoreTapCount++;
        if (scoreTapTimer) clearTimeout(scoreTapTimer);
        scoreTapTimer = setTimeout(function () { scoreTapCount = 0; }, 1500);
        if (scoreTapCount >= 7) {
          scoreTapCount = 0;
          showTip('Secret found');
          sfxLevelUp();
        }
      });
    }

    // ==================== Phase 41 — SETTINGS PANEL ====================
    function showSettings() {
      // Pause game while settings open if mid-run
      var wasPaused = S.paused;
      if (S.started && !S.gameOver) { S.paused = true; S.pauseStartedAt = performance.now(); }
      var sheet = document.createElement('div');
      sheet.className = 'bb-sheet';
      function seg(label, options, current, onPick) {
        var btns = options.map(function (o) {
          return '<button data-v="' + o.v + '" class="' + (o.v === current ? 'on' : '') + '">' + o.l + '</button>';
        }).join('');
        return '<div class="bb-row"><label>' + label + '</label><div class="bb-seg" data-group="' + label + '">' + btns + '</div></div>';
      }
      function skinSelect(label, options, current) {
        var opts = options.map(function (o) {
          return '<option value="' + o.v + '"' + (o.v === current ? ' selected' : '') + '>' + o.l + '</option>';
        }).join('');
        return '<div class="bb-skin-row"><label>' + label + '</label><select id="bb-skin-select" class="bb-skin-select" aria-label="' + label + '">' + opts + '</select></div>';
      }
      var unlockedAchv = PROFILE.achievements.length;
      var achvHtml = ACHIEVEMENTS.map(function (a) {
        var unlocked = PROFILE.achievements.indexOf(a.id) >= 0;
        return '<span class="bb-achv-pill ' + (unlocked ? '' : 'locked') + '" title="' + a.desc + '">' + (unlocked ? '✓ ' : '🔒 ') + a.name + '</span>';
      }).join('');
      // Phase 14 — skin row (only show unlocked skins). Phase 15 — daily badge in header.
      var unlockedSkins = (PROFILE.unlockedSkins || ['brown']);
      var skinOptions = SKINS.filter(function (s) { return unlockedSkins.indexOf(s.id) >= 0; }).map(function (s) {
        return { v: s.id, l: s.name };
      });
      var dailyBadge = '<span class="bb-daily-badge">' + T('daily') + ' ✓</span>';
      // Phase 17 — settings sheet is SLIM. Only: Sound, Quality, Motion, Lang, Skin (when unlocked) + Close.
      // Stats + achievements live on the death screen / silent toasts — NOT here.
      sheet.innerHTML = [
        '<h3><span>' + T('settings') + '</span>' + dailyBadge + '</h3>',
        seg(T('sound'),    [{v:'on',l:'ON'},{v:'off',l:'OFF'}], S.muted ? 'off' : 'on', null),
        seg(T('quality'),  [{v:'auto',l:'Auto'},{v:'high',l:'High'},{v:'low',l:'Low'}], QUALITY.mode, null),
        seg(T('motion'),   [{v:'on',l:'ON'},{v:'off',l:'OFF'}], REDUCED_MOTION ? 'off' : 'on', null),
        seg(T('language'), [{v:'en',l:'EN'},{v:'bn',l:'বাংলা'}], LANG, null),
        skinOptions.length > 1 ? skinSelect(T('skin'), skinOptions, PROFILE.activeSkin || 'brown') : '',
        skinOptions.length > 1 ? '<div style="display:flex;justify-content:center;padding:6px 0 2px;"><canvas id="bb-skin-preview" width="56" height="64" style="border-radius:10px;background:rgba(255,255,255,0.06);"></canvas></div>' : '',
        seg('Dev Mode', [{v:'on',l:'ON'},{v:'off',l:'OFF'}], DEV_MAP ? 'on' : 'off', null),
        '<button class="bb-btn" id="bb-close" style="margin-top:14px;width:100%;padding:9px 0;font-size:12px;">' + T('close') + '</button>'
      ].join('');
      hud.appendChild(sheet);
      requestAnimationFrame(function () { sheet.classList.add('in'); });
      // Q3 — draw skin preview mini canvas
      function drawSkinPreview(skinId) {
        var pc = sheet.querySelector('#bb-skin-preview');
        if (!pc || !sprites.player) return;
        var px = pc.getContext('2d');
        px.clearRect(0, 0, 56, 64);
        var sp = sprites.player;
        // Draw sprite scaled to fit 56x64
        var scale = Math.min(56 / sp.w, 64 / sp.h) * 0.82;
        var dx = (56 - sp.w * scale) / 2, dy = (64 - sp.h * scale) / 2;
        px.drawImage(sp.canvas, dx, dy, sp.w * scale, sp.h * scale);
        // Apply tint if skin has one
        var skinObj = null;
        for (var si = 0; si < SKINS.length; si++) if (SKINS[si].id === skinId) { skinObj = SKINS[si]; break; }
        if (skinObj && skinObj.tint) {
          px.globalCompositeOperation = 'source-atop';
          px.fillStyle = skinObj.tint;
          px.fillRect(dx, dy, sp.w * scale, sp.h * scale);
          px.globalCompositeOperation = 'source-over';
        }
      }
      requestAnimationFrame(function () { drawSkinPreview(PROFILE.activeSkin || 'brown'); });
      var skinSelectEl = sheet.querySelector('#bb-skin-select');
      if (skinSelectEl) {
        skinSelectEl.addEventListener('change', function () {
          PROFILE.activeSkin = skinSelectEl.value;
          saveProfile();
          drawSkinPreview(PROFILE.activeSkin || 'brown');
        });
      }
      // Wire seg buttons
      sheet.querySelectorAll('.bb-seg').forEach(function (grp) {
        grp.addEventListener('click', function (e) {
          var btn = e.target.closest('button'); if (!btn) return;
          var v = btn.getAttribute('data-v');
          var label = grp.getAttribute('data-group');
          grp.querySelectorAll('button').forEach(function (b) { b.classList.remove('on'); });
          btn.classList.add('on');
          if (label === T('language')) {
            setLang(v);
            sheet.classList.remove('in');
            setTimeout(function () { sheet.remove(); showSettings(); }, 250);
          } else if (label === T('sound')) {
            S.muted = v === 'off';
            muteBtn.textContent = S.muted ? '🔇' : '🔊';
            PROFILE.settings.muted = S.muted; saveProfile();
            if (!S.muted) { ensureAudio(); startAmbientPad(); } else stopAmbientPad();
          } else if (label === T('quality')) {
            QUALITY.mode = v;
            if (v !== 'auto') { QUALITY.level = v; QUALITY.probing = false; }
            else { QUALITY.probing = true; QUALITY.probeFrames = 0; QUALITY.probeStart = performance.now(); }
            try { localStorage.setItem('bb_chai_quality', v); } catch (er) {}
            refreshQualityBtn();
            initWeather();
          } else if (label === T('motion')) {
            REDUCED_MOTION = v === 'off';
          } else if (label === T('skin')) {
            // Phase 14 — swap active cup skin (cosmetic only; takes effect next frame)
            PROFILE.activeSkin = v; saveProfile();
            drawSkinPreview(v); // Q3 — update preview canvas immediately
          } else if (label === 'Dev Mode') {
            var u = new URL(window.location.href);
            if (v === 'on') { u.searchParams.set('__bb_devmap', '1'); }
            else { u.searchParams.delete('__bb_devmap'); }
            window.location.replace(u.toString());
          }
        });
      });
      sheet.querySelector('#bb-close').addEventListener('click', function () {
        sheet.classList.remove('in');
        setTimeout(function () { sheet.remove(); }, 250);
        if (!wasPaused && S.started && !S.gameOver) {
          // Phase 18 — only show resume countdown after long idle (>60s real). Else instant resume.
          var idleSec = (performance.now() - (S.pauseStartedAt || performance.now())) / 1000;
          if (idleSec > 60) showResumeCountdown();
          else S.paused = false;
        } else if (wasPaused) {
          S.paused = wasPaused;
        } else {
          S.paused = false;
        }
      });
    }

    // ==================== Phase 2 — PAUSE / RESUME ====================
    // User-initiated resume is instant. The 96px takeover countdown is gone.
    // Long-idle resume (>60s real time) is reserved for Phase 18.
    function showResumeCountdown() {
      S.paused = false;
    }
    function showPauseMenu() {
      if (!S.started || S.gameOver) return;
      S.paused = true;
      var card = document.createElement('div');
      card.className = 'bb-card';
      card.innerHTML = [
        '<h2>' + T('pauseTitle') + ' ⏸</h2>',
        '<p>Score: <b style="color:#f4c430">' + S.score + '</b> · ' + S.distanceM + 'm</p>',
        '<button class="bb-btn" id="bb-resume">' + T('resume') + '</button>',
        '<button class="bb-btn" id="bb-pause-set" style="background:transparent;color:#bbb;border:1px solid rgba(255,255,255,0.2);box-shadow:none;margin-left:8px;">' + T('settings') + '</button>'
      ].join('');
      hud.appendChild(card);
      requestAnimationFrame(function () { card.classList.add('in'); });
      card.querySelector('#bb-resume').addEventListener('click', function () {
        card.classList.remove('in');
        setTimeout(function () { card.remove(); showResumeCountdown(); }, 250);
      });
      card.querySelector('#bb-pause-set').addEventListener('click', function () {
        card.classList.remove('in');
        setTimeout(function () { card.remove(); showSettings(); }, 250);
      });
    }

    // ==================== Phase 45 — SHARE PNG ====================
    function shareScorePNG() {
      try {
        var size = 1080;
        var c = document.createElement('canvas');
        c.width = size; c.height = size;
        var x = c.getContext('2d');
        // BG gradient
        var g = x.createLinearGradient(0, 0, 0, size);
        g.addColorStop(0, '#1a0f2e'); g.addColorStop(1, '#3d1f5c');
        x.fillStyle = g; x.fillRect(0, 0, size, size);
        // Card
        x.fillStyle = 'rgba(255,255,255,0.08)';
        x.fillRect(60, 200, size-120, size-400);
        x.fillStyle = '#f4c430';
        x.font = 'bold 64px -apple-system, sans-serif';
        x.textAlign = 'center';
        x.fillText('চা Runner ☕', size/2, 340);
        x.fillStyle = '#fff';
        x.font = 'bold 220px -apple-system, sans-serif';
        x.fillText(String(S.score), size/2, 600);
        x.font = 'bold 36px -apple-system, sans-serif';
        x.fillStyle = '#bbb';
        x.fillText(T('score'), size/2, 670);
        x.font = '32px -apple-system, sans-serif';
        x.fillStyle = '#ddd';
        x.fillText(S.distanceM + 'm · ' + S.runStats.chai + ' chai · ' + CFG.BIOMES[S.biomeIdx].name, size/2, 760);
        x.font = 'bold 28px -apple-system, sans-serif';
        x.fillStyle = '#f97316';
        x.fillText('bongbari.com', size/2, 980);
        c.toBlob(function (blob) {
          if (!blob) return;
          var file = new File([blob], 'bongbari-chai-runner.png', { type: 'image/png' });
          if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            navigator.share({ files: [file], title: 'My চা Runner score', text: 'Score: ' + S.score + ' · bongbari.com' }).catch(function(){});
          } else {
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url; a.download = 'bongbari-chai-runner.png';
            a.click();
            setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
          }
        }, 'image/png');
      } catch (e) {}
    }

    // ==================== Phase 50 — WIN CARD (Tea Master) ====================
    function showWinCard() {
      S.won = true;
      S.paused = true;
      PROFILE.teaMaster = true;
      PROFILE.teaMasterCount++;
      saveProfile();
      checkAchievements();
      sfxLevelUp();
      var card = document.createElement('div');
      card.className = 'bb-card bb-win';
      card.innerHTML = [
        '<h2>' + T('win') + '</h2>',
        '<p>' + S.score + '</p>',
        '<div style="display:flex; gap:8px;">',
        '  <button class="bb-btn" id="bb-cashout">' + T('cashOut') + '</button>',
        '  <button class="bb-btn" id="bb-endless" style="background:transparent;border:1px solid #111;color:#111;box-shadow:none;">' + T('continueEndless') + '</button>',
        '</div>'
      ].join('');
      hud.appendChild(card);
      requestAnimationFrame(function () { card.classList.add('in'); });
      card.querySelector('#bb-cashout').addEventListener('click', function () {
        card.classList.remove('in');
        setTimeout(function () { card.remove(); }, 300);
        S.gameOver = true;
        finalizeRunStats('win');
        showGameOver();
      });
      card.querySelector('#bb-endless').addEventListener('click', function () {
        card.classList.remove('in');
        setTimeout(function () { card.remove(); }, 300);
        S.endlessMode = true;
        S.endlessMult = CFG.ENDLESS_MULT;
        S.paused = false;
        showTip('🌌 Endless Mode · Score ×2 forever!');
      });
    }
    function finalizeRunStats(reason) {
      if (S.runStats.finalized) return;
      S.runStats.finalized = true;
      S.runStats.endReason = reason || 'fall';
      PROFILE.totalRuns++;
      PROFILE.totalDistanceM += S.distanceM;
      PROFILE.totalChai += S.runStats.chai;
      PROFILE.totalHearts += S.runStats.hearts;
      PROFILE.totalBishesh += S.runStats.bishesh;
      if (S.score > PROFILE.best) PROFILE.best = S.score;
      telemetryRecordRun(reason);
      anticheatValidateScore();
      saveProfile();
      checkAchievements();
      // Phase 53 — mark first run done
      if (!PROFILE.firstRunDone) {
        PROFILE.firstRunDone = true;
        S.onboarding = false;
        saveProfile();
      }
    }

    // ==================== LEVEL BANNER + TIPS ====================
    function showLevelBanner(text) {
      var el = document.getElementById('bb-level');
      if (!el) return;
      el.textContent = text;
      el.classList.add('show');
      sfxLevelUp();
      setTimeout(function(){ el.classList.remove('show'); }, 2000);
    }
    function showTip(text) {
      var el = document.getElementById('bb-tip');
      if (!el) return;
      el.textContent = text;
      el.classList.add('show');
      setTimeout(function(){ el.classList.remove('show'); }, 3500);
    }
    // Phase 1b — in-play tutorial banners deleted. Player teaches themself.
    function maybeShowTipForScore(_score) { /* removed */ }

    // ==================== Phase 38 — landscape suggestion (one-time, mobile portrait) ====================
    function maybeLandscapeToast() { /* Phase 1b — instructional toast removed. */ }

    // ==================== Phase 33 — SPRITE CACHE ====================
    // Pre-render player + obstacles + chai to off-screen canvases. Massive perf win on mobile.
    var sprites = {};
    function makeSpriteCanvas(w, h) {
      var c = document.createElement('canvas');
      c.width = Math.ceil(w * DPR); c.height = Math.ceil(h * DPR);
      var x = c.getContext('2d');
      x.scale(DPR, DPR);
      return { canvas: c, ctx: x, w: w, h: h };
    }
    function buildPlayerSprite() {
      var BBM = (typeof window !== 'undefined') ? window.BBModels : null;
      if (BBM && typeof BBM.drawChai === 'function') {
        var heroW = 118, heroH = 132;
        var hero = makeSpriteCanvas(heroW, heroH);
        try {
          BBM.drawChai(hero.ctx, 0.7, heroW, heroH);
          sprites.player = hero;
          sprites.playerFullModel = true;
          return;
        } catch (e) { sprites.playerFullModel = false; }
      }
      sprites.playerFullModel = false;
      var pad = 22, w = player.width + pad*2, h = player.height + pad*2;
      var s = makeSpriteCanvas(w, h);
      var x = s.ctx;
      var cx = w/2, cy = h/2;
      x.translate(cx, cy);
      var pw = player.width, ph = player.height;
      // Cup body
      var bodyGrad = x.createLinearGradient(0, -ph/2, 0, ph/2);
      bodyGrad.addColorStop(0, '#fffaf0'); bodyGrad.addColorStop(1, '#e8d5b7');
      x.fillStyle = bodyGrad;
      x.strokeStyle = '#3d2817'; x.lineWidth = 3;
      x.beginPath();
      x.moveTo(-pw*0.42, -ph*0.35);
      x.lineTo(pw*0.42, -ph*0.35);
      x.lineTo(pw*0.34, ph*0.42);
      x.quadraticCurveTo(0, ph*0.5, -pw*0.34, ph*0.42);
      x.closePath();
      x.fill(); x.stroke();
      x.beginPath(); x.arc(pw*0.48, 0, ph*0.18, -Math.PI*0.5, Math.PI*0.5);
      x.lineWidth = 5; x.stroke();
      // Tea
      var teaGrad = x.createLinearGradient(0, -ph*0.35, 0, -ph*0.15);
      teaGrad.addColorStop(0, '#8b4513'); teaGrad.addColorStop(1, '#a0522d');
      x.fillStyle = teaGrad;
      x.beginPath(); x.ellipse(0, -ph*0.32, pw*0.36, ph*0.08, 0, 0, Math.PI*2); x.fill();
      x.strokeStyle = '#3d2817'; x.lineWidth = 2; x.stroke();
      // Cheeks
      x.fillStyle = 'rgba(255,150,160,0.55)';
      x.beginPath();
      x.arc(-pw*0.28, ph*0.08, pw*0.06, 0, Math.PI*2);
      x.arc(pw*0.28, ph*0.08, pw*0.06, 0, Math.PI*2);
      x.fill();
      // Smile
      x.strokeStyle = '#3d2817'; x.lineWidth = 2.5; x.lineCap = 'round';
      x.beginPath();
      x.arc(0, ph*0.12, pw*0.13, 0.15*Math.PI, 0.85*Math.PI);
      x.stroke();
      sprites.player = s;
    }
    function buildObstacleSprite(type) {
      var size = obstacleSize(type);
      // Approved DevModels designs (chili/fly/potty) are drawn for ~280px viewports
      // and self-scale via Math.min(w,h)/280. We give them a generously sized
      // canvas (~3.5x hitbox) so the silhouette breathes without clipping. The
      // game logic still uses size/obstacleSize for hitbox — only the visual is bigger.
      var BBM = (typeof window !== 'undefined') ? window.BBModels : null;
      var modelKey = null;
      if (BBM) {
        modelKey = obstacleMeta(type).draw;
      }
      if (BBM && modelKey && typeof BBM[modelKey] === 'function') {
        var spriteW = Math.round(size * 2.6);
        var spriteH = Math.round(size * 3.2);
        var s = makeSpriteCanvas(spriteW, spriteH);
        try { BBM[modelKey](s.ctx, 0.7, spriteW, spriteH); } catch (e) {
          // Fall through to legacy renderer below
          modelKey = null;
        }
        if (modelKey) { sprites['obs_' + type] = s; return; }
      }

      // ---- Legacy fallback art (used if BBModels script failed to load) ----
      var w = size + 16, h = size * 1.4 + 16;
      var s = makeSpriteCanvas(w, h);
      var x = s.ctx;
      x.translate(w/2, h/2);
      if (type === '404') {
        var grad = x.createLinearGradient(-size/2, -size/2, size/2, size/2);
        grad.addColorStop(0, '#ef4444'); grad.addColorStop(1, '#b91c1c');
        x.fillStyle = grad; x.strokeStyle = '#7a1010'; x.lineWidth = 3;
        x.fillRect(-size/2, -size/2, size, size);
        x.strokeRect(-size/2, -size/2, size, size);
        x.fillStyle = '#fff';
        x.font = 'bold ' + Math.floor(size*0.35) + 'px -apple-system, sans-serif';
        x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText('404', 0, 2);
      } else if (type === 'sad') {
        var w2 = size * 1.6, h2 = size * 0.9;
        x.fillStyle = '#6b7280'; x.strokeStyle = '#374151'; x.lineWidth = 3;
        x.beginPath();
        x.arc(-w2*0.3, 0, h2*0.55, Math.PI*0.5, Math.PI*1.5);
        x.arc(-w2*0.05, -h2*0.3, h2*0.5, Math.PI, Math.PI*2);
        x.arc(w2*0.25, -h2*0.15, h2*0.55, Math.PI*1.2, Math.PI*0.2);
        x.arc(w2*0.3, h2*0.1, h2*0.4, Math.PI*1.8, Math.PI*0.5);
        x.closePath();
        x.fill(); x.stroke();
        x.strokeStyle = '#1a1a1a'; x.lineWidth = 2.5; x.lineCap = 'round';
        var ex = w2*0.05;
        x.beginPath();
        x.moveTo(-ex-3, -3); x.lineTo(-ex+3, 3);
        x.moveTo(-ex+3, -3); x.lineTo(-ex-3, 3);
        x.moveTo(ex-3, -3); x.lineTo(ex+3, 3);
        x.moveTo(ex+3, -3); x.lineTo(ex-3, 3);
        x.stroke();
        x.beginPath(); x.arc(0, h2*0.25, w2*0.12, Math.PI*1.2, Math.PI*1.8); x.stroke();
      } else {
        var sw = size, sh = size * 1.1;
        var grad2 = x.createLinearGradient(0, -sh/2, 0, sh/2);
        grad2.addColorStop(0, '#a855f7'); grad2.addColorStop(1, '#581c87');
        x.fillStyle = grad2; x.strokeStyle = '#3b0764'; x.lineWidth = 3;
        x.beginPath();
        x.moveTo(0, -sh/2); x.lineTo(sw/2, sh/2); x.lineTo(-sw/2, sh/2);
        x.closePath(); x.fill(); x.stroke();
        x.fillStyle = 'rgba(255,255,255,0.25)';
        x.beginPath();
        x.moveTo(-2, -sh/2 + 4); x.lineTo(sw/4, sh/2 - 4); x.lineTo(-4, sh/2 - 4);
        x.closePath(); x.fill();
      }
      sprites['obs_' + type] = s;
    }
    function buildChanachurSprite() {
      var BBM = (typeof window !== 'undefined') ? window.BBModels : null;
      var spriteW = 74, spriteH = 74;
      var s = makeSpriteCanvas(spriteW, spriteH);
      if (BBM && typeof BBM.drawChanachur === 'function') {
        try {
          BBM.drawChanachur(s.ctx, 0.7, spriteW, spriteH);
          sprites.chanachur = s;
          return;
        } catch (e) {}
      }
      var x = s.ctx;
      x.translate(spriteW / 2, spriteH / 2);
      x.fillStyle = '#f97316';
      x.strokeStyle = '#7c2d12';
      x.lineWidth = 3;
      x.beginPath(); x.ellipse(0, 8, 24, 14, 0, 0, Math.PI * 2); x.fill(); x.stroke();
      x.fillStyle = '#fde68a';
      for (var i = 0; i < 14; i++) {
        var a = i * 2.39996;
        var r = 5 + (i % 4) * 4;
        x.beginPath(); x.arc(Math.cos(a) * r, 2 + Math.sin(a) * r * 0.5, 2.3, 0, Math.PI * 2); x.fill();
      }
      sprites.chanachur = s;
    }
    function buildBonusPickupSprite(type) {
      var meta = bonusPickupMeta(type);
      var BBM = (typeof window !== 'undefined') ? window.BBModels : null;
      var spriteW = 76, spriteH = 76;
      var s = makeSpriteCanvas(spriteW, spriteH);
      if (BBM && meta.draw && typeof BBM[meta.draw] === 'function') {
        try {
          BBM[meta.draw](s.ctx, 0.7, spriteW, spriteH);
          sprites['bonus_' + type] = s;
          return;
        } catch (e) {}
      }
      var x = s.ctx;
      x.translate(spriteW / 2, spriteH / 2);
      x.fillStyle = 'rgb(' + meta.color.join(',') + ')';
      x.strokeStyle = 'rgba(5,40,30,0.8)';
      x.lineWidth = 3;
      x.beginPath(); x.arc(0, 0, 24, 0, Math.PI * 2); x.fill(); x.stroke();
      x.fillStyle = '#fff';
      x.font = 'bold 16px -apple-system, sans-serif';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(meta.label, 0, 1);
      sprites['bonus_' + type] = s;
    }
    function buildChaiSprite() {
      // Bhar Cha is the hero. Chai pickups use a simple point-token cup language.
      var BBM = (typeof window !== 'undefined') ? window.BBModels : null;
      if (BBM && typeof BBM.drawChaiToken === 'function') {
        var spriteW = 74, spriteH = 74;
        var s2 = makeSpriteCanvas(spriteW, spriteH);
        try {
          BBM.drawChaiToken(s2.ctx, 0.7, spriteW, spriteH);
          sprites.chai = s2;
          return;
        } catch (e) { /* fall through to legacy below */ }
      }

      // ---- Legacy fallback (simple cup sprite) ----
      var w = 60, h = 64;
      var s = makeSpriteCanvas(w, h);
      var x = s.ctx;
      x.translate(w/2, h/2);
      x.scale(0.55, 0.55);
      var glow = x.createRadialGradient(0, 0, 0, 0, 0, 60);
      glow.addColorStop(0, 'rgba(255,200,100,0.6)');
      glow.addColorStop(1, 'rgba(255,200,100,0)');
      x.fillStyle = glow; x.fillRect(-60, -60, 120, 120);
      var pw = 50, ph = 56;
      x.fillStyle = '#fffaf0'; x.strokeStyle = '#3d2817'; x.lineWidth = 3;
      x.beginPath();
      x.moveTo(-pw*0.42, -ph*0.35);
      x.lineTo(pw*0.42, -ph*0.35);
      x.lineTo(pw*0.34, ph*0.42);
      x.quadraticCurveTo(0, ph*0.5, -pw*0.34, ph*0.42);
      x.closePath(); x.fill(); x.stroke();
      x.beginPath();
      x.arc(pw*0.48, 0, ph*0.18, -Math.PI*0.5, Math.PI*0.5);
      x.lineWidth = 4; x.stroke();
      x.fillStyle = '#a0522d';
      x.beginPath(); x.ellipse(0, -ph*0.32, pw*0.36, ph*0.08, 0, 0, Math.PI*2); x.fill();
      x.lineWidth = 2; x.stroke();
      sprites.chai = s;
    }
    function buildAllSprites() {
      buildPlayerSprite();
      buildObstacleSprite('404');
      buildObstacleSprite('sad');
      buildObstacleSprite('sad_high');
      buildObstacleSprite('spike');
      buildObstacleSprite('ghost_404');
      buildObstacleSprite('dark_spike');
      buildObstacleSprite('cosmic_rock');
      buildChaiSprite();
      buildChanachurSprite();
      for (var bp = 0; bp < BONUS_PICKUP_ORDER.length; bp++) buildBonusPickupSprite(BONUS_PICKUP_ORDER[bp]);
    }

    // ==================== DRAW FROM SPRITES ====================
    function drawPlayer(x, y) {
      // Phase 4 — pixel-snap at draw site only. Physics positions stay float.
      x = Math.round(x); y = Math.round(y);
      var w = player.width, h = player.height;
      var sx = player.squash, sy = 2 - sx;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(player.rotation);
      ctx.scale(sx, sy);
      if (player.hitImmuneSec > 0 && Math.floor(player.hitImmuneSec * 10) % 2 === 0) {
        ctx.globalAlpha = 0.4;
      }
      // Phase 6 — palette lookup memoized via _palCache; safe to call freely.
      // Blit cached sprite. Skin tint is pre-baked into offscreen canvas (getTintedPlayerSprite)
      // to AVOID the source-atop box artifact that appears when compositing on the main canvas.
      var sp = sprites.player;
      var BBM = (typeof window !== 'undefined') ? window.BBModels : null;
      if (DEV_MAP && devMapReady && sprites.playerFullModel && sp && BBM) {
        var liveT = player.runFrame / 4;
        ctx.save();
        ctx.translate(-sp.w / 2, -sp.h / 2);
        try {
          if (typeof BBM.drawCharacterCup === 'function') {
            BBM.drawCharacterCup(ctx, liveT, sp.w, sp.h, { label: 'Bhar Cha', tint: getActiveSkinTint() || 'rgba(210,105,40,0.55)', stripes: true });
          } else if (typeof BBM.drawChai === 'function') {
            BBM.drawChai(ctx, liveT, sp.w, sp.h);
          }
        } catch (e) {
          ctx.drawImage(sp.canvas, 0, 0, sp.w, sp.h);
        }
        ctx.restore();
        ctx.restore();
        return;
      }
      if (sp) {
        var _tsp = getTintedPlayerSprite();
        var _drawSp = _tsp || sp;
        ctx.drawImage(_drawSp.canvas, -_drawSp.w/2, -_drawSp.h/2, _drawSp.w, _drawSp.h);
        // Phase 25 sky tint removed — was creating a visible rectangle artifact at all alpha levels
      }
      // Eyes (drawn live so they can blink)
      var eyeY = -h*0.05;
      var blinkH = player.blink > 0 ? 1 : h*0.16;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(-w*0.15, eyeY, w*0.1, blinkH, 0, 0, Math.PI*2);
      ctx.ellipse(w*0.15, eyeY, w*0.1, blinkH, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = '#3d2817'; ctx.lineWidth = 2; ctx.stroke();
      if (player.blink === 0) {
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(-w*0.13, eyeY+1, w*0.05, 0, Math.PI*2);
        ctx.arc(w*0.17, eyeY+1, w*0.05, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-w*0.11, eyeY-1, w*0.018, 0, Math.PI*2);
        ctx.arc(w*0.19, eyeY-1, w*0.018, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
      // Legs (live, animated)
      ctx.save();
      ctx.translate(x, y);
      var legSwing = player.onGround ? Math.sin(player.runFrame) * 8 : -4;
      var legSwingB = player.onGround ? Math.sin(player.runFrame + Math.PI) * 8 : -4;
      ctx.strokeStyle = '#3d2817'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-w*0.18, h*0.35); ctx.lineTo(-w*0.22, h*0.5 + legSwing);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w*0.18, h*0.35); ctx.lineTo(w*0.22, h*0.5 + legSwingB);
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.ellipse(-w*0.24, h*0.5 + legSwing + 2, w*0.08, h*0.04, 0, 0, Math.PI*2);
      ctx.ellipse(w*0.24, h*0.5 + legSwingB + 2, w*0.08, h*0.04, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
      drawSteam(x, y - h*0.45);
    }
    var steamPhase = 0;
    function drawSteam(x, y) {
      if (QUALITY.level === 'low') return;
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = '#e8e8f0'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      for (var i = 0; i < 3; i++) {
        var off = i * 7 - 7;
        ctx.beginPath();
        ctx.moveTo(x + off, y);
        for (var j = 1; j <= 6; j++) {
          var sy = y - j * 5;
          var sxOff = Math.sin((steamPhase + i*0.7) + j * 0.5) * 4;
          ctx.lineTo(x + off + sxOff, sy);
        }
        ctx.globalAlpha = 0.55 - i*0.15;
        ctx.stroke();
      }
      ctx.restore();
    }
    function rgba(color, alpha) {
      return 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',' + alpha + ')';
    }
    function drawCollectibleCue(x, y, color, label, strong) {
      var pulse = 0.55 + 0.45 * Math.sin(frameCounter * 0.18);
      ctx.save();
      ctx.translate(Math.round(x), Math.round(y));
      ctx.strokeStyle = rgba(color, (strong ? 0.72 : 0.45) * pulse);
      ctx.lineWidth = strong ? 3 : 2;
      ctx.beginPath();
      ctx.arc(0, 0, strong ? 34 : 27, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = rgba(color, strong ? 0.18 : 0.10);
      ctx.beginPath();
      ctx.arc(0, 0, strong ? 28 : 21, 0, Math.PI * 2);
      ctx.fill();
      if (label) {
        ctx.font = 'bold ' + (strong ? 15 : 12) + 'px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'rgba(0,0,0,0.62)';
        ctx.lineWidth = 4;
        ctx.strokeText(label, 0, strong ? -34 : -27);
        ctx.fillStyle = '#fff';
        ctx.fillText(label, 0, strong ? -34 : -27);
      }
      ctx.restore();
    }
    function drawDangerCue(o) {
      var dist = o.x - player.x;
      var alpha = dist < 420 ? Math.max(0.15, Math.min(0.78, 1 - dist / 460)) : 0.13;
      var meta = obstacleMeta(o.type);
      ctx.save();
      ctx.translate(Math.round(o.x), Math.round(GROUND_Y + 4));
      ctx.fillStyle = 'rgba(239,68,68,' + alpha + ')';
      ctx.beginPath();
      ctx.ellipse(0, 0, o.size * 0.78, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,' + (alpha * 0.6) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-o.size * 0.46, -8);
      ctx.lineTo(0, -20);
      ctx.lineTo(o.size * 0.46, -8);
      ctx.stroke();
      if (dist < 280 || meta.cue) {
        ctx.font = 'bold 18px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, alpha + 0.22) + ')';
        ctx.fillText('!', 0, -32);
      }
      ctx.restore();
    }
    function drawBossPresence(t) {
      if (!S.boss) return;
      var def = S.boss.def;
      var animT = devMapFrozen() ? frameCounter * CFG.FIXED_DT_MS : t;
      var size = Math.min(210, Math.max(138, W * 0.18));
      var x = W * 0.77;
      var y = Math.max(110, GROUND_Y - 210);
      var pulse = 0.5 + 0.5 * Math.sin(frameCounter * 0.11);
      ctx.save();
      var aura = ctx.createRadialGradient(x, y, 10, x, y, size * 0.72);
      aura.addColorStop(0, def.final ? 'rgba(244,196,48,0.22)' : 'rgba(239,68,68,0.20)');
      aura.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = aura;
      ctx.fillRect(x - size, y - size, size * 2, size * 2);
      ctx.globalAlpha = 0.42 + pulse * 0.12;
      var BBM = (typeof window !== 'undefined') ? window.BBModels : null;
      if (BBM && def.draw && typeof BBM[def.draw] === 'function') {
        ctx.save();
        ctx.translate(x - size / 2, y - size / 2);
        try { BBM[def.draw](ctx, animT * 0.001, size, size); } catch (e) {}
        ctx.restore();
      } else {
        ctx.fillStyle = def.final ? 'rgba(244,196,48,0.85)' : 'rgba(239,68,68,0.75)';
        ctx.beginPath();
        ctx.arc(x, y, size * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 0.75;
      ctx.font = 'bold 13px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = 'rgba(0,0,0,0.65)';
      ctx.lineWidth = 4;
      ctx.strokeText(def.name, x, y + size * 0.58);
      ctx.fillText(def.name, x, y + size * 0.58);
      ctx.restore();
    }
    function drawObstacle(o) {
      var sp = sprites['obs_' + o.type];
      if (!sp) return;
      drawDangerCue(o);
      ctx.save();
      // Phase 4 — pixel-snap draw position (kills 1px shimmer)
      ctx.translate(Math.round(o.x), Math.round(o.y + Math.sin(o.bob) * 3));
      // Legacy 404 cube was designed to tumble. The new chili character (BBModels)
      // has its own bob/sway built in and must stay upright — only spin the
      // fallback cube art when BBModels failed to load.
      if (o.type === '404' && !(typeof window !== 'undefined' && window.BBModels && window.BBModels.drawChili)) {
        ctx.rotate(o.rot);
      }
      ctx.drawImage(sp.canvas, -sp.w/2, -sp.h/2, sp.w, sp.h);
      ctx.restore();
    }
    function drawChai(c) {
      var sp = sprites.chai;
      if (!sp) return;
      ctx.save();
      ctx.translate(Math.round(c.x), Math.round(c.y + Math.sin(c.bob) * 5));
      drawCollectibleCue(0, 0, [34,197,94], '+25', false);
      ctx.drawImage(sp.canvas, -sp.w/2, -sp.h/2, sp.w, sp.h);
      ctx.restore();
    }
    // Phase 47 — Heart pickup
    function drawHeart(h) {
      var bob = Math.sin(h.bob) * 4;
      ctx.save();
      ctx.translate(Math.round(h.x), Math.round(h.y + bob));
      var BBM = (typeof window !== 'undefined') ? window.BBModels : null;
      if (BBM && typeof BBM.drawHeartPickup === 'function') {
        drawCollectibleCue(0, 0, [244,63,94], '+1', true);
        ctx.save();
        ctx.translate(-38, -38);
        try { BBM.drawHeartPickup(ctx, frameCounter / 60, 76, 76); } catch (e) {}
        ctx.restore();
        ctx.restore();
        return;
      }
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = 'rgba(239,68,68,0.6)';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      var s = 14;
      ctx.moveTo(0, s*0.4);
      ctx.bezierCurveTo(s, -s*0.4, s*1.2, s*0.6, 0, s*1.2);
      ctx.bezierCurveTo(-s*1.2, s*0.6, -s, -s*0.4, 0, s*0.4);
      ctx.fill();
      ctx.shadowBlur = 0;
      // sparkle
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath(); ctx.arc(-4, -2, 2, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
    // Phase 48 — Bishesh chai (golden, glowing, rotating sparkle)
    function drawBishesh(b) {
      var bob = Math.sin(b.bob) * 6;
      var pulse = 0.7 + 0.3 * Math.sin(b.glow);
      ctx.save();
      ctx.translate(Math.round(b.x), Math.round(b.y + bob));
      var BBM = (typeof window !== 'undefined') ? window.BBModels : null;
      if (BBM && typeof BBM.drawBisheshChai === 'function') {
        drawCollectibleCue(0, 0, [250,204,21], 'x3', true);
        ctx.save();
        ctx.translate(-40, -40);
        try { BBM.drawBisheshChai(ctx, frameCounter / 60, 80, 80); } catch (e) {}
        ctx.restore();
        ctx.restore();
        return;
      }
      // Glow halo
      var grad = ctx.createRadialGradient(0, 0, 5, 0, 0, 30);
      grad.addColorStop(0, 'rgba(244,196,48,' + (0.6 * pulse) + ')');
      grad.addColorStop(1, 'rgba(244,196,48,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(-30, -30, 60, 60);
      // Cup
      ctx.fillStyle = '#f4c430';
      ctx.strokeStyle = '#a86d00'; ctx.lineWidth = 2;
      ctx.fillRect(-12, -8, 24, 18);
      ctx.strokeRect(-12, -8, 24, 18);
      ctx.fillStyle = '#fff5d6';
      ctx.fillRect(-10, -6, 20, 4);
      // Steam swirl
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 * pulse) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -16, 4, 0, Math.PI*2);
      ctx.stroke();
      // Sparkle ring (rotating)
      ctx.rotate(b.glow);
      ctx.fillStyle = '#fff';
      for (var sp = 0; sp < 4; sp++) {
        var sa = sp * Math.PI / 2;
        ctx.beginPath();
        ctx.arc(Math.cos(sa) * 22, Math.sin(sa) * 22, 2.5, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
    }
    function drawChanachur(c) {
      var sp = sprites.chanachur;
      if (!sp) return;
      var bob = Math.sin(c.bob) * 6;
      var pulse = 0.75 + 0.25 * Math.sin(c.glow || 0);
      ctx.save();
      ctx.translate(Math.round(c.x), Math.round(c.y + bob));
      var grad = ctx.createRadialGradient(0, 0, 5, 0, 0, 28);
      grad.addColorStop(0, 'rgba(249,115,22,' + (0.42 * pulse) + ')');
      grad.addColorStop(1, 'rgba(249,115,22,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(-30, -30, 60, 60);
      ctx.drawImage(sp.canvas, -sp.w/2, -sp.h/2, sp.w, sp.h);
      ctx.restore();
    }
    function drawBonusPickup(pickup) {
      var meta = bonusPickupMeta(pickup.type);
      var sp = sprites['bonus_' + pickup.type];
      if (!sp) return;
      var bob = Math.sin(pickup.bob) * 7;
      ctx.save();
      ctx.translate(Math.round(pickup.x), Math.round(pickup.y + bob));
      drawCollectibleCue(0, 0, meta.color, meta.label, true);
      ctx.drawImage(sp.canvas, -sp.w/2, -sp.h/2, sp.w, sp.h);
      ctx.restore();
    }

    // ==================== Phase 22 — AFTERIMAGE TRAIL (during jump rise only) ====================
    function pushTrail() {
      if (REDUCED_MOTION || QUALITY.level === 'low') return;
      if (player.onGround || player.vy >= 0) return; // only during rise
      S.trail.push({ x: player.x, y: player.y, life: 1, rot: player.rotation, sq: player.squash });
      if (S.trail.length > 5) S.trail.shift();
    }
    function drawTrail() {
      if (REDUCED_MOTION || QUALITY.level === 'low') return;
      // USER FIX — don't render stale trail while paused/dead. Was leaving a ghost square behind the cup.
      if (S.paused || S.gameOver) { S.trail.length = 0; return; }
      var sp = sprites.player; if (!sp) return;
      for (var i = 0; i < S.trail.length; i++) {
        var t = S.trail[i];
        ctx.save();
        ctx.globalAlpha = t.life * 0.28;
        ctx.translate(t.x, t.y);
        ctx.rotate(t.rot);
        ctx.scale(t.sq, 2 - t.sq);
        ctx.drawImage(sp.canvas, -sp.w/2, -sp.h/2, sp.w, sp.h);
        ctx.restore();
        t.life -= 0.18;
      }
      // Cull dead
      while (S.trail.length > 0 && S.trail[0].life <= 0) S.trail.shift();
    }

    // ==================== BACKGROUND ====================
    var clouds = [];
    var buildings = [];
    var stars = [];
    var mountains = []; // Phase 23 — back parallax layer
    var foregroundTufts = []; // Phase 23 — front layer

    function initBg() {
      clouds = [];
      for (var i = 0; i < 5; i++) {
        clouds.push({ x: freeRng()*W, y: 50 + freeRng()*120, w: 70 + freeRng()*60, speed: 0.3 + freeRng()*0.4 });
      }
      buildings = [];
      // Fixed 110px spacing so strip total is exactly 14*110=1540 — wrap lands perfectly.
      // Size/type still randomised per building so they look varied.
      for (var b = 0; b < 14; b++) {
        buildings.push({ x: b * 110, w: 55 + freeRng()*55, h: 80 + freeRng()*120, type: Math.floor(freeRng()*3) });
      }
      stars = [];
      for (var sIdx = 0; sIdx < 60; sIdx++) {
        stars.push({ x: freeRng()*W, y: freeRng() * (H*0.5), size: freeRng()*1.5 + 0.5, twinkle: freeRng()*Math.PI*2 });
      }
      // Phase 23 — mountains (slow parallax)
      mountains = [];
      for (var m = 0; m < 6; m++) {
        mountains.push({ x: m * 220, w: 240 + freeRng()*120, h: 130 + freeRng()*70 });
      }
      // Phase 23 — foreground tufts (fast parallax, in front of obstacles? no — between cup and ground)
      foregroundTufts = [];
      for (var f = 0; f < 18; f++) {
        foregroundTufts.push({ x: f * 90 + freeRng()*30, kind: Math.floor(freeRng()*2) });
      }
    }
    initBg();

    // Phase 24 — WEATHER
    function initWeather() {
      var pCount = QUALITY.level === 'low' ? CFG.PETAL_COUNT_LOW : CFG.PETAL_COUNT_HIGH;
      var fCount = QUALITY.level === 'low' ? CFG.FIREFLY_COUNT_LOW : CFG.FIREFLY_COUNT_HIGH;
      S.petals = [];
      for (var i = 0; i < pCount; i++) {
        S.petals.push({
          x: freeRng()*W, y: freeRng()*H*0.7,
          vx: -0.4 - freeRng()*0.6, vy: 0.4 + freeRng()*0.5,
          rot: freeRng()*Math.PI*2, vr: (freeRng()-0.5)*0.05,
          size: 5 + freeRng()*4
        });
      }
      S.fireflies = [];
      for (var j = 0; j < fCount; j++) {
        S.fireflies.push({
          x: freeRng()*W, y: H*0.3 + freeRng()*H*0.4,
          phase: freeRng()*Math.PI*2,
          driftX: (freeRng()-0.5)*0.4, driftY: (freeRng()-0.5)*0.3
        });
      }
    }
    initWeather();

    function drawBg(t) {
      if (devMapFrozen()) t = frameCounter * CFG.FIXED_DT_MS;
      var p = currentPalette();
      var grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
      grad.addColorStop(0, 'rgb(' + p.skyTop.join(',') + ')');
      grad.addColorStop(1, 'rgb(' + p.skyBot.join(',') + ')');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, GROUND_Y);

      if (isAkashganga()) {
        var akMid = (CFG.AKASHGANGA_START_M + CFG.AKASHGANGA_END_M) / 2;
        var akSpan = (CFG.AKASHGANGA_END_M - CFG.AKASHGANGA_START_M) / 2;
        var akPulse = 1 - Math.min(1, Math.abs(S.distanceM - akMid) / akSpan);
        var akGrad = ctx.createRadialGradient(W * 0.5, GROUND_Y * 0.36, 10, W * 0.5, GROUND_Y * 0.36, Math.max(W, H) * 0.72);
        akGrad.addColorStop(0, 'rgba(255,255,255,' + (0.62 + akPulse * 0.18) + ')');
        akGrad.addColorStop(0.36, 'rgba(180,245,255,0.34)');
        akGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = akGrad;
        ctx.fillRect(0, 0, W, GROUND_Y);
      }

      if (p.stars) {
        ctx.fillStyle = '#fff';
        for (var i = 0; i < stars.length; i++) {
          var st = stars[i];
          var alpha = 0.4 + Math.sin(t*0.002 + st.twinkle) * 0.4;
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(st.x, st.y, st.size, 0, Math.PI*2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // Sun / Moon
      var sunY = 90; var sunX = W * 0.78;
      ctx.save();
      if (!p.stars) {
        var sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 50);
        sunGrad.addColorStop(0, 'rgba(255,240,150,1)');
        sunGrad.addColorStop(0.5, 'rgba(255,200,80,0.5)');
        sunGrad.addColorStop(1, 'rgba(255,200,80,0)');
        ctx.fillStyle = sunGrad;
        ctx.fillRect(sunX-50, sunY-50, 100, 100);
        ctx.fillStyle = '#ffe066';
        ctx.beginPath(); ctx.arc(sunX, sunY, 28, 0, Math.PI*2); ctx.fill();
      } else {
        ctx.fillStyle = '#f0e8d0';
        ctx.beginPath(); ctx.arc(sunX, sunY, 26, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'rgba(180,160,140,0.4)';
        ctx.beginPath();
        ctx.arc(sunX-8, sunY-4, 6, 0, Math.PI*2);
        ctx.arc(sunX+10, sunY+6, 4, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();

      // Phase 23 — mountains (slowest)
      var mScroll = (S.distancePx * 0.12) % 220;
      ctx.save();
      ctx.translate(-mScroll + _tiltOffset, 0); // Phase 24 tilt offset on far layer
      var mountainColor = p.stars ? 'rgba(35,28,55,0.85)' : 'rgba(95,80,110,0.55)';
      ctx.fillStyle = mountainColor;
      for (var mi = 0; mi < mountains.length; mi++) {
        var mn = mountains[mi];
        var bx = mn.x;
        if (bx + mn.w + mScroll < 0) mn.x += mountains.length * 220;
        var by = GROUND_Y - mn.h;
        ctx.beginPath();
        ctx.moveTo(bx, GROUND_Y);
        ctx.lineTo(bx + mn.w*0.35, by + 15);
        ctx.lineTo(bx + mn.w*0.55, by);
        ctx.lineTo(bx + mn.w*0.75, by + 25);
        ctx.lineTo(bx + mn.w, GROUND_Y);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Clouds (mid)
      ctx.fillStyle = 'rgba(255,255,255,' + (p.stars ? 0.4 : 0.85) + ')';
      for (var ci = 0; ci < clouds.length; ci++) {
        var cl = clouds[ci];
        if (!devMapFrozen()) {
          cl.x -= cl.speed;
          if (cl.x + cl.w < -50) cl.x = W + 50;
        }
        drawCloud(cl.x, cl.y, cl.w);
      }

      // Buildings — seamless infinite scroll.
      // When a building exits left, place it immediately after the rightmost building
      // so the chain is always gapless regardless of varying widths.
      var _bSpeed = devMapFrozen() ? 0 : S.speed * 0.4;
      ctx.save();
      for (var bi = 0; bi < buildings.length; bi++) {
        var bl = buildings[bi];
        bl.x -= _bSpeed;
        if (bl.x + bl.w < 0) {
          // Find rightmost x + w among all buildings
          var _maxRight = 0;
          for (var _bj = 0; _bj < buildings.length; _bj++) {
            var _r = buildings[_bj].x + buildings[_bj].w;
            if (_r > _maxRight) _maxRight = _r;
          }
          bl.x = _maxRight + 18 + freeRng() * 20; // small random gap keeps it organic
        }
        drawBuilding(Math.round(bl.x), GROUND_Y - bl.h, bl.w, bl.h, bl.type, !p.stars);
      }
      ctx.restore();

      // Phase 24 — Weather per biome
      drawWeather(t, p);

      // Ground
      var groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, H);
      groundGrad.addColorStop(0, p.ground1); groundGrad.addColorStop(1, p.ground2);
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
      ctx.strokeStyle = p.stars ? '#0a0805' : '#3d2817'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(W, GROUND_Y); ctx.stroke();
      var stripeOff = (S.distancePx * 1.0) % 60;
      ctx.fillStyle = p.stars ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)';
      for (var st2 = 0; st2 < Math.ceil(W/60) + 2; st2++) {
        var sx2 = st2 * 60 - stripeOff;
        ctx.fillRect(sx2, GROUND_Y + 8, 30, 4);
      }

      // Phase 23 — foreground tufts (fastest parallax, on ground line)
      if (QUALITY.level !== 'low') {
        var tuftScroll = (S.distancePx * 1.4) % 90;
        ctx.save();
        ctx.translate(-tuftScroll, 0);
        ctx.fillStyle = p.stars ? 'rgba(20,30,15,0.7)' : 'rgba(60,90,40,0.55)';
        for (var ti = 0; ti < foregroundTufts.length; ti++) {
          var tu = foregroundTufts[ti];
          var tx = tu.x;
          if (tx + 30 + tuftScroll < 0) tu.x += foregroundTufts.length * 90;
          // little grass tuft
          ctx.beginPath();
          ctx.moveTo(tx, GROUND_Y + 2);
          ctx.lineTo(tx + 4, GROUND_Y - 8);
          ctx.lineTo(tx + 8, GROUND_Y + 2);
          ctx.lineTo(tx + 12, GROUND_Y - 6);
          ctx.lineTo(tx + 16, GROUND_Y + 2);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
    }

    function drawWeather(t, palette) {
      var bId = CFG.BIOMES[S.biomeIdx].id;
      var weatherMoving = !devMapFrozen();
      // Petals — Para
      if (bId === 'para') {
        ctx.fillStyle = 'rgba(255,182,193,0.7)';
        for (var i = 0; i < S.petals.length; i++) {
          var pe = S.petals[i];
          if (weatherMoving) {
            pe.x += pe.vx; pe.y += pe.vy; pe.rot += pe.vr;
            if (pe.y > GROUND_Y) { pe.y = -10; pe.x = W + freeRng()*100; }
            if (pe.x < -20) { pe.x = W + 20; pe.y = freeRng()*H*0.5; }
          }
          ctx.save();
          ctx.translate(pe.x, pe.y);
          ctx.rotate(pe.rot);
          ctx.beginPath();
          ctx.ellipse(0, 0, pe.size, pe.size*0.45, 0, 0, Math.PI*2);
          ctx.fill();
          ctx.restore();
        }
      }
      // Fog — Bazar (light horizontal band)
      else if (bId === 'bazar') {
        var fogGrad = ctx.createLinearGradient(0, GROUND_Y - 80, 0, GROUND_Y);
        fogGrad.addColorStop(0, 'rgba(220,180,150,0)');
        fogGrad.addColorStop(1, 'rgba(220,180,150,0.28)');
        ctx.fillStyle = fogGrad;
        ctx.fillRect(0, GROUND_Y - 80, W, 80);
      }
      // Fireflies — Raat / Cosmic
      else {
        for (var f = 0; f < S.fireflies.length; f++) {
          var fl = S.fireflies[f];
          if (weatherMoving) {
            fl.phase += 0.05;
            fl.x += fl.driftX; fl.y += fl.driftY + Math.sin(fl.phase)*0.3;
            if (fl.x < 0) fl.x = W; if (fl.x > W) fl.x = 0;
            if (fl.y < H*0.2) fl.y = H*0.2; if (fl.y > GROUND_Y - 30) fl.y = GROUND_Y - 30;
          }
          var glow = 0.5 + Math.sin(fl.phase)*0.5;
          ctx.fillStyle = 'rgba(255,240,140,' + (0.4 + glow*0.5) + ')';
          ctx.beginPath();
          ctx.arc(fl.x, fl.y, 2 + glow, 0, Math.PI*2);
          ctx.fill();
          // soft halo
          if (QUALITY.level !== 'low') {
            ctx.fillStyle = 'rgba(255,240,140,' + (glow*0.15) + ')';
            ctx.beginPath();
            ctx.arc(fl.x, fl.y, 8, 0, Math.PI*2);
            ctx.fill();
          }
        }
      }
    }

    function drawCloud(x, y, w) {
      var h = w * 0.5;
      ctx.beginPath();
      ctx.arc(x, y, h*0.55, 0, Math.PI*2);
      ctx.arc(x + w*0.3, y - h*0.2, h*0.5, 0, Math.PI*2);
      ctx.arc(x + w*0.55, y, h*0.55, 0, Math.PI*2);
      ctx.arc(x + w*0.25, y + h*0.15, h*0.45, 0, Math.PI*2);
      ctx.fill();
    }
    function drawBuilding(x, y, w, h, type, day) {
      ctx.fillStyle = day ? '#4a5568' : '#1a202c';
      ctx.strokeStyle = day ? '#2d3748' : '#0a0e14';
      ctx.lineWidth = 2;
      if (type === 0) {
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
      } else if (type === 1) {
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = day ? '#2d3748' : '#000';
        ctx.fillRect(x + w/2 - 2, y - 18, 4, 18);
        ctx.beginPath(); ctx.arc(x + w/2, y - 20, 4, 0, Math.PI*2); ctx.fill();
      } else {
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        ctx.beginPath();
        ctx.arc(x + w/2, y, w*0.45, Math.PI, 0);
        ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = day ? 'rgba(180,200,220,0.5)' : 'rgba(255,220,140,0.85)';
      var winRows = Math.floor(h / 18);
      var winCols = Math.max(1, Math.floor(w / 14));
      for (var wr = 1; wr < winRows; wr++) {
        for (var wc = 0; wc < winCols; wc++) {
          if (!day && freeRng() < 0.3) continue;
          ctx.fillRect(x + 4 + wc*14, y + 6 + wr*18, 6, 8);
        }
      }
    }

    // ==================== PARTICLES & FLOATERS ====================
    function puff(x, y, dust) {
      S.particles.push({
        x: x, y: y, vx: (freeRng()-0.5)*1.5, vy: -freeRng()*1.5 - 0.5,
        life: 1, size: 4 + freeRng()*3,
        color: dust ? [180,160,130] : [255,200,80]
      });
    }
    function sparkleBurst(x, y, color, n) {
      n = n || 8;
      if (QUALITY.level === 'low') n = Math.max(3, Math.floor(n * 0.5));
      for (var i = 0; i < n; i++) {
        S.particles.push({
          x: x, y: y,
          vx: (freeRng()-0.5)*6, vy: (freeRng()-0.5)*6 - 1,
          life: 1, size: 3 + freeRng()*3, color: color
        });
      }
    }
    function drawParticles() {
      for (var i = S.particles.length - 1; i >= 0; i--) {
        var p = S.particles[i];
        p.x += p.vx; p.y += p.vy;
        p.vy += 0.15;
        p.life -= 0.04;
        if (p.life <= 0) { S.particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life;
        ctx.fillStyle = 'rgb(' + p.color.join(',') + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    function floater(text, x, y, color) {
      S.floaters.push({ text: text, x: x, y: y, life: 1, color: color || '#f4c430' });
    }
    function drawFloaters() {
      for (var i = S.floaters.length - 1; i >= 0; i--) {
        var f = S.floaters[i];
        f.y -= 1.2; f.life -= 0.025;
        if (f.life <= 0) { S.floaters.splice(i, 1); continue; }
        ctx.globalAlpha = f.life;
        ctx.fillStyle = f.color;
        ctx.font = 'bold 22px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 4;
        ctx.strokeText(f.text, f.x, f.y);
        ctx.fillText(f.text, f.x, f.y);
      }
      ctx.globalAlpha = 1;
    }

    // ==================== CARDS ====================
    function showStart() {
      // Phase 1a — minimal start: heading + one-line subtitle + one button. Fits 320×480.
      var card = document.createElement('div');
      card.className = 'bb-card bb-start';
      card.innerHTML = [
        '<h2>' + T('title') + ' ☕</h2>',
        '<p>' + T('startDesc') + '</p>',
        '<button class="bb-btn" id="bb-start">' + T('startBtn') + '</button>'
      ].join('');
      hud.appendChild(card);
      requestAnimationFrame(function () { card.classList.add('in'); });
      document.getElementById('bb-start').addEventListener('click', function () {
        unlockAudio();
        if (!S.muted) startAmbientPad();
        card.classList.remove('in');
        setTimeout(function(){ card.remove(); }, 350);
        S.started = true;
        S.runStats.startTs = performance.now();
        QUALITY.probeStart = performance.now();
        QUALITY.probeFrames = 0;
        showLevelBanner(T('levelWelcome') + ' ' + CFG.BIOMES[0].name + T('biomeIntroJoin') + CFG.BIOMES[0].bn + ' 🏘️');
        maybeLandscapeToast();
        // Initial pad freq for Para
        if (!S.muted) updateAmbientPadForBiome(0);
      });
    }
    function showGameOver() {
      sfxOver();
      stopAmbientPad();
      S.deathTimes.push(performance.now()/1000);
      S.cleanRunSinceSec = 0;
      // Phase 49 — finalize stats once (win path already did it)
      if (!S.runStats.finalized) {
        finalizeRunStats(S.runStats.endReason || 'fall');
      }
      if (S.score > S.best) {
        S.best = S.score;
        try { localStorage.setItem('bb_chai_runner_best', String(S.best)); } catch (e) {}
        updateHUD();
      }
      // Phase 1c — death card LOCKED to 4 elements: heading, score, one small line, button.
      // Phase 10/16 — the small line rotates between 4 hook framings (best, close-to-best, close-to-milestone, chai-streak).
      // Phase 14 — also re-check skin unlocks based on this run's totals.
      maybeUnlockSkin();
      var card = document.createElement('div');
      card.className = 'bb-card';
      card.innerHTML = [
        '<h2>' + T('gameOver') + '</h2>',
        '<p>' + S.score + '</p>',
        '<div class="bb-best-line">' + buildHookLine() + '</div>',
        '<button class="bb-btn" id="bb-again">' + T('tryAgain') + '</button>'
      ].join('');
      hud.appendChild(card);
      requestAnimationFrame(function () { card.classList.add('in'); });
      card.querySelector('#bb-again').addEventListener('click', function () {
        resetRunState();
        card.classList.remove('in');
        setTimeout(function(){ card.remove(); }, 350);
      });
    }

    // ==================== Phase 14 — SKINS (silent cosmetic unlock loop) ====================
    // Map-locked hero forms only. Old drink/robot variants are intentionally not part of Chai Runner.
    var SKINS = [
      { id: 'brown',      name: 'Brown Tea',      tint: null,                        test: function () { return true; } },
      { id: 'claypot',    name: 'Clay Pot',        tint: 'rgba(210,105,40,0.42)',     test: function () { return (PROFILE.best | 0) >= 500 || S.distanceM >= 500; } },
      { id: 'marketpot',  name: 'Market Pot',      tint: 'rgba(245,158,11,0.48)',     test: function () { return (PROFILE.best | 0) >= 3500 || S.distanceM >= 3500; } },
      { id: 'moonpot',    name: 'Moonlight Pot',   tint: 'rgba(190,220,255,0.48)',    test: function () { return (PROFILE.best | 0) >= 6000 || S.distanceM >= 6000; } },
      { id: 'mashalaform',name: 'Mashala Form',    tint: 'rgba(255,210,80,0.58)',     test: function () { return !!PROFILE.teaMaster; } }
    ];
    function normalizeProfileSkins() {
      var allowed = {};
      for (var ai = 0; ai < SKINS.length; ai++) allowed[SKINS[ai].id] = true;
      var existing = PROFILE.unlockedSkins || ['brown'];
      var clean = ['brown'];
      for (var ui = 0; ui < existing.length; ui++) {
        var id = existing[ui];
        if (id !== 'brown' && allowed[id] && clean.indexOf(id) < 0) clean.push(id);
      }
      var activeValid = allowed[PROFILE.activeSkin] && clean.indexOf(PROFILE.activeSkin) >= 0;
      var changed = clean.join('|') !== existing.join('|') || !activeValid;
      PROFILE.unlockedSkins = clean;
      if (!activeValid) PROFILE.activeSkin = 'brown';
      if (changed) saveProfile();
    }
    normalizeProfileSkins();
    function getActiveSkin() {
      var id = PROFILE.activeSkin || 'brown';
      for (var i = 0; i < SKINS.length; i++) if (SKINS[i].id === id) return SKINS[i];
      return SKINS[0];
    }
    function getActiveSkinTint() { return getActiveSkin().tint; }
    // E-box-fix: offscreen tinted sprite cache — keyed by skin id, rebuilt only on skin change.
    // Applying source-atop on the main canvas (which has a painted BG) colors the entire rect.
    // Solution: composite the tint onto a separate offscreen canvas where only sprite pixels exist.
    var _tintedSpriteCache = {};
    function getTintedPlayerSprite() {
      var skin = getActiveSkin();
      if (!skin.tint) return null; // brown = no tint, use base sprite directly
      if (_tintedSpriteCache[skin.id]) return _tintedSpriteCache[skin.id];
      var sp = sprites.player;
      if (!sp) return null;
      var c = document.createElement('canvas');
      c.width = sp.canvas.width; c.height = sp.canvas.height;
      var x = c.getContext('2d');
      x.drawImage(sp.canvas, 0, 0);
      x.globalCompositeOperation = 'source-atop';
      x.fillStyle = skin.tint;
      x.fillRect(0, 0, c.width, c.height);
      var result = { canvas: c, w: sp.w, h: sp.h };
      _tintedSpriteCache[skin.id] = result;
      return result;
    }
    function maybeUnlockSkin() {
      if (!PROFILE.unlockedSkins) PROFILE.unlockedSkins = ['brown'];
      var changed = false;
      for (var i = 0; i < SKINS.length; i++) {
        var sk = SKINS[i];
        if (PROFILE.unlockedSkins.indexOf(sk.id) >= 0) continue;
        try {
          if (sk.test()) {
            PROFILE.unlockedSkins.push(sk.id);
            achievementToast('Skin: ' + sk.name);
            changed = true;
          }
        } catch (e) {}
      }
      if (changed) saveProfile();
    }

    // ==================== Phase 10/16 — DEATH-SCREEN HOOK LINE (rotating, contextual) ====================
    function buildHookLine() {
      // Phase 16/18d — rotating death-screen hook line.
      // 18d — Wrist-rest detection: a single run > 30 min real time hijacks the line ONCE for player health.
      if (S.runStats && S.runStats.startTs) {
        var minsThisRun = (performance.now() - S.runStats.startTs) / 60000;
        if (minsThisRun >= 30 && !PROFILE._wristShownThisSession) {
          PROFILE._wristShownThisSession = true;
          return Math.round(minsThisRun) + ' min straight 👀 stretch?';
        }
      }
      var bestM = PROFILE.best | 0;
      var sc = S.score | 0;
      var distM = S.distanceM | 0;
      // Pick the most contextually meaningful framing first:
      // 1. Within 15% of new best (and not already broke it) — "close to best"
      if (bestM > 100 && sc < bestM && sc >= bestM * 0.85) {
        return T('hookCloseToBest').replace('{gap}', String(bestM - sc));
      }
      // 2. Closing on next km milestone — "close to 5km"
      var milestones = [1000, 2500, 5000, 10000, 25000, 50000, 100000];
      for (var mi = 0; mi < milestones.length; mi++) {
        var ms = milestones[mi];
        if (distM < ms && (ms - distM) <= 250) {
          var label = ms >= 1000 ? (ms / 1000) + 'km' : ms + 'm';
          return T('hookCloseToMs').replace('{ms}', label).replace('{gap}', String(ms - distM));
        }
      }
      // 3. Solid chai streak — "streak X, try for Y"
      if (S.runStats && S.runStats.chai >= 5) {
        var n = S.runStats.chai | 0;
        var goal = n + Math.max(3, Math.round(n * 0.4));
        return T('hookChaiStreak').replace('{n}', String(n)).replace('{goal}', String(goal));
      }
      // 4. Default — "Best Xm"
      return T('hookBest').replace('{best}', String(bestM));
    }

    // ==================== Phase 8 — RESET RUN STATE (single source of truth) ====================
    function resetRunState() {
      S.score = 0; S.bonusScore = 0; S.lives = 3; S.distancePx = 0;
      S.speed = CFG.SPEED_BASE;
      S.obstacles = []; S.chais = []; S.particles = []; S.floaters = []; S.trail = [];
      S.hearts = []; S.bishesh = []; S.chanachur = []; S.bonusPickups = [];
      S.gameOver = false; S.paused = false; S.won = false;
      S.patternQueue = []; S.nextPatternFrame = 0;
      S.stormState = 'idle'; S.stormTimer = 0; S.stormSpawnInterval = 0; S.stormSpawned = 0;
      S.lastStormScore = 0;
      S.biomeIdx = 0; S.lastBiomeIdx = 0;
      S.framesSinceHit = 9999; S.postHitSafeUntil = 0;
      S.comboChain = 0; S.comboActive = false; S.comboTimer = 0;
      S.comboMult = 1; S.comboTier = 0;
      S.lastHeartScore = 0; S.lastBisheshDistM = 0;
      S.specialActive = false; S.specialTimer = 0;
      S.lastChanachurDistM = 0; S.chanachurActive = false; S.chanachurTimer = 0;
      S.lastBonusPickupDistM = 0; S.lastAkashChaiM = 0; S.akashShown = false;
      S.boss = null; S.bossesDone = {};
      S.cameraShake = 0; S.hitFlash = 0; S.nearMissTint = 0;
      S.hitSlowSec = 0;
      S.distMarkers = []; S.lastMarkerM = 0;
      S.deathZoom = 1.0;
      S.milestonesHit = [];
      S.runStats = { chai: 0, hearts: 0, bishesh: 0, nearMiss: 0, hits: 0, startTs: performance.now(), endReason: 'fall', finalized: false };
      // endlessMode + Profile (best, totalRuns, etc.) persist across retries — by design.
      lastDisplayedScore = -1; displayedScore = 0; lastPopScore = 0;
      // Clear lingering banners / toasts from previous run
      var lb = document.getElementById('bb-level'); if (lb) lb.classList.remove('show');
      var tip = document.getElementById('bb-tip'); if (tip) tip.classList.remove('show');
      if (hud) hud.querySelectorAll('.bb-achv').forEach(function (el) { el.remove(); });
      // Player reset
      player.y = player.baseY; player.vy = 0; player.onGround = true;
      player.hitImmuneSec = 0; player.stamina = CFG.STAMINA_MAX;
      player.jumpsUsed = 0; player.coyoteFrames = 0; player.bufferedJumpFrames = 0;
      player.fastFall = false; player.jumpHeld = false; player.jumpHoldFrames = 0;
      renderHearts(); updateHUD();
      if (!S.muted) { startAmbientPad(); updateAmbientPadForBiome(0); }
    }

    // ==================== DEV MAP WALKTHROUGH (query: __bb_devmap=1) ====================
    var DEV_MAP_MAX_M = 8500;
    var devMapReady = false;
    var devMapPlaying = true;
    var devMapLastPopulateM = -9999;
    var devMapEls = null;
    var devMapFiredBeats = {};
    var DEV_MAP_BEATS = [
      { m: 200,  text: '⚡ Storm event — collect free chai (per map @200m)' },
      { m: 300,  text: '🪰 Fly introduced — short jump' },
      { m: 500,  text: '🏆 Para Hero · Skin #2 (Clay Pot) unlocked' },
      { m: 550,  text: '✨ Bishesh Chai eligible (×3 score · 6s shield)' },
      { m: 600,  text: '🪣 Potty introduced — hold-jump' },
      { m: 700,  text: '❤️ Heart pickup eligible (restore life)' },
      { m: 750,  text: '🔥 Combo intro · 3 chais → ×2 multiplier' },
      { m: 900,  text: '⭐ Expert pattern unlocked · Picket Fence' },
      { m: 1500, text: '🏪 Bazar begins · gaps tighten 15%' },
      { m: 2000, text: '🥟 Singara reward pickup live (+30)' },
      { m: 2750, text: '🍪 Marie biscuit reward (+20)' },
      { m: 3000, text: '🌶 Jhal Chanachur · score ×2 for 4s' },
      { m: 3500, text: '🏆 Bazar Conquered · Skin #3 (Gold Market)' },
      { m: 3700, text: '⭐⭐⭐⭐⭐ Endgame expert pattern unlocked' },
      { m: 4000, text: '🌙 Raat begins · gaps tighten 28%' },
      { m: 4500, text: '👻🌶 Ghost Chili — trust timing not eyes' },
      { m: 5000, text: '🖤🪣 Dark Potty — listen for cue' },
      { m: 6000, text: '🏆 Night Warrior · Skin #4 (Moonlight Silver)' },
      { m: 7000, text: '🌌 Mahakash begins · cosmic hue rotation' },
      { m: 7200, text: '☄️ Cosmic Rock live' },
      { m: 7500, text: '🌌 Akashganga · safe corridor for 300m' },
      { m: 7800, text: '⚠️ Final Wall · max density before boss' }
    ];
    function devMapFireMilestones(m) {
      for (var i = 0; i < DEV_MAP_BEATS.length; i++) {
        var beat = DEV_MAP_BEATS[i];
        if (m >= beat.m && !devMapFiredBeats[beat.m]) {
          devMapFiredBeats[beat.m] = true;
          if (typeof showTip === 'function') showTip(beat.text);
        }
      }
    }
    function devMapResetBeats(m) {
      devMapFiredBeats = {};
      // Pre-mark beats strictly before m as already fired so we don't spam-fire on scrub.
      // Beats AT m or AFTER m will fire as the player walks past them.
      for (var i = 0; i < DEV_MAP_BEATS.length; i++) {
        if (DEV_MAP_BEATS[i].m < m) devMapFiredBeats[DEV_MAP_BEATS[i].m] = true;
      }
    }
    function devMapFrozen() {
      return DEV_MAP && devMapReady && !devMapPlaying;
    }
    var DEV_MAP_STOPS = [
      { m: 0, name: 'Start · Para warm-up', kicker: 'Para' },
      { m: 500, name: 'Para Hero · clay skin unlock', kicker: 'Milestone' },
      { m: 1000, name: 'Boss 1 · Bhoot Mama', kicker: 'Boss test' },
      { m: 1500, name: 'Bazar begins · reward pickups', kicker: 'Bazar' },
      { m: 2500, name: 'Boss 2 · Bazar Raja', kicker: 'Boss test' },
      { m: 3000, name: 'Jhal Chanachur x2 zone', kicker: 'Pickup test' },
      { m: 4000, name: 'Raat begins · ghost/dark reads', kicker: 'Raat' },
      { m: 5000, name: 'Boss 3 · Bhoot Jolokia', kicker: 'Boss test' },
      { m: 7000, name: 'Mahakash begins · cosmic rock', kicker: 'Mahakash' },
      { m: 7500, name: 'Akashganga · free chai corridor', kicker: 'Set-piece' },
      { m: 8000, name: 'Final Boss · Mashala Deb', kicker: 'Final test' },
      { m: 8500, name: 'Endless Mahakash preview', kicker: 'Endless' }
    ];
    function devMapClamp(m) {
      m = Number(m) || 0;
      return Math.max(0, Math.min(DEV_MAP_MAX_M, Math.round(m)));
    }
    function devMapStopFor(m) {
      var stop = DEV_MAP_STOPS[0];
      for (var i = 0; i < DEV_MAP_STOPS.length; i++) {
        if (m >= DEV_MAP_STOPS[i].m) stop = DEV_MAP_STOPS[i];
      }
      return stop;
    }
    function devMapBossFor(m) {
      for (var i = 0; i < BOSS_DEFS.length; i++) {
        var def = BOSS_DEFS[i];
        var before = def.final ? 170 : 130;
        var after = def.final ? 430 : 280;
        if (m >= def.distance - before && m <= def.distance + after) return def;
      }
      return null;
    }
    function devMapObstacle(type, x) {
      var meta = obstacleMeta(type);
      var size = obstacleSize(type);
      var y = meta.y === 'air' ? GROUND_Y - (meta.yOffset || 95) : GROUND_Y - size / 2 - 2;
      return { x: x, y: y, size: size, type: type, rot: 0, bob: (frameCounter || 0) * 0.04, nearMissed: false };
    }
    function devMapBonus(type, x, y) {
      return { x: x, y: y, type: type, bob: (frameCounter || 0) * 0.05, glow: (frameCounter || 0) * 0.08 };
    }
    function devMapActorCount() {
      return S.obstacles.length + S.chais.length + S.hearts.length + S.bishesh.length + S.chanachur.length + S.bonusPickups.length;
    }
    function updateDevMapUi(syncRange) {
      if (!devMapEls) return;
      var m = S.distanceM;
      var stop = devMapStopFor(m);
      devMapEls.meter.textContent = m + 'm';
      devMapEls.name.textContent = stop.name;
      devMapEls.kicker.textContent = (devMapPlaying ? 'DEV MAP · WALKING' : 'DEV MAP · PAUSED') + ' · ' + CFG.BIOMES[S.biomeIdx].name;
      if (devMapEls.play) devMapEls.play.textContent = devMapPlaying ? 'Pause' : 'Play';
      if (syncRange !== false) devMapEls.range.value = String(m);
    }
    function setDevMapPlaying(playing) {
      if (!DEV_MAP) return;
      devMapPlaying = !!playing;
      S.paused = !devMapPlaying;
      if (!devMapPlaying) S.speed = 0;
      updateDevMapUi(true);
    }
    function devMapMoveActors(speed) {
      var i, item;
      for (i = S.obstacles.length - 1; i >= 0; i--) {
        item = S.obstacles[i];
        item.x -= speed;
        item.bob += 0.06;
        item.rot += 0.025;
        if (item.x < -100) S.obstacles.splice(i, 1);
      }
      for (i = S.chais.length - 1; i >= 0; i--) {
        item = S.chais[i];
        item.x -= speed;
        item.bob += 0.05;
        if (item.x < -50) S.chais.splice(i, 1);
      }
      for (i = S.hearts.length - 1; i >= 0; i--) {
        item = S.hearts[i];
        item.x -= speed;
        item.bob += 0.06;
        if (item.x < -50) S.hearts.splice(i, 1);
      }
      for (i = S.bishesh.length - 1; i >= 0; i--) {
        item = S.bishesh[i];
        item.x -= speed;
        item.bob += 0.07;
        item.glow = (item.glow || 0) + 0.15;
        if (item.x < -50) S.bishesh.splice(i, 1);
      }
      for (i = S.chanachur.length - 1; i >= 0; i--) {
        item = S.chanachur[i];
        item.x -= speed;
        item.bob += 0.08;
        item.glow = (item.glow || 0) + 0.16;
        if (item.x < -50) S.chanachur.splice(i, 1);
      }
      for (i = S.bonusPickups.length - 1; i >= 0; i--) {
        item = S.bonusPickups[i];
        item.x -= speed;
        item.bob += 0.08;
        item.glow = (item.glow || 0) + 0.16;
        if (item.x < -60) S.bonusPickups.splice(i, 1);
      }
    }
    function devMapTick(dt) {
      if (!devMapPlaying) {
        frameCounter -= 1;
        return;
      }
      player.blinkTimer -= dt;
      if (player.blinkTimer <= 0) {
        player.blink = player.blink > 0 ? 0 : 1;
        player.blinkTimer = player.blink ? 6 : 80 + freeRng()*120;
      }

      var targetSpeed = CFG.SPEED_BASE + CFG.SPEED_GAIN * (1 - Math.exp(-S.distanceM / CFG.SPEED_TAU_M));
      S.speed += (targetSpeed - S.speed) * 0.05;
      if (S.speed < CFG.SPEED_BASE) S.speed = CFG.SPEED_BASE;
      if (S.speed > 7.2) S.speed = 7.2;

      S.distancePx += S.speed;
      if (S.distanceM >= DEV_MAP_MAX_M) {
        S.distancePx = DEV_MAP_MAX_M / CFG.METERS_PER_PX;
        setDevMapPlaying(false);
      }
      S.bonusScore = 0;
      S.score = Math.floor(S.distancePx / 10);
      updateHUD();

      var newBiome = getActiveBiomeIdx(S.distanceM);
      if (newBiome !== S.lastBiomeIdx) {
        var bm = CFG.BIOMES[newBiome];
        showLevelBanner('Level ' + (newBiome + 1) + ' · ' + bm.name + ' · ' + bm.bn + ' ✨');
        if (typeof updateAmbientPadForBiome === 'function') updateAmbientPadForBiome(newBiome);
      }
      S.biomeIdx = newBiome;
      S.lastBiomeIdx = newBiome;
      S.lastMarkerM = S.distanceM;
      S.gameOver = false;
      S.won = false;
      devMapFireMilestones(S.distanceM);

      player.runFrame += 0.32;
      player.bobPhase += 0.18;
      player.y = player.baseY + Math.sin(player.bobPhase) * 1.2;
      player.vy = 0;
      player.onGround = true;
      player.rotation = 0;

      devMapMoveActors(S.speed);
      // Real-game pacing: only queue the next pattern when the furthest existing obstacle
      // has scrolled back close to the right edge — exactly how the live pattern queue works.
      // Hard cap at 5 obstacles so the screen never looks cluttered.
      var furthest = devMapFurthestX();
      if (furthest < W + 120 && S.obstacles.length < 5) {
        devMapAppendAhead(S.distanceM, W + 120);
        devMapLastPopulateM = S.distanceM;
      }
      updateDevMapUi(true);
    }
    function devMapPopulateActors(m) {
      devMapLastPopulateM = m;
      S.obstacles = [];
      S.chais = [];
      S.hearts = [];
      S.bishesh = [];
      S.chanachur = [];
      S.bonusPickups = [];
      S.particles = [];
      S.floaters = [];
      S.trail = [];
      S.distMarkers = [];
      S.patternQueue = [];
      S.boss = null;
      S.bossesDone = {};
      S.stormState = 'idle';
      S.cameraShake = 0;
      S.hitFlash = 0;
      S.nearMissTint = 0;
      S.specialActive = false;
      S.chanachurActive = false;

      var boss = devMapBossFor(m);
      if (boss) {
        S.boss = { def: boss, waveIndex: 0, introFrames: 0, nextWaveFrame: 0 };
        var wave = boss.waves[Math.min(boss.waves.length - 1, Math.max(0, Math.floor((m - boss.distance + 120) / 110)))] || boss.waves[0];
        for (var wi = 0; wi < wave.length; wi++) {
          S.obstacles.push(devMapObstacle(wave[wi].type, W * 0.48 + wave[wi].dx));
        }
        S.bishesh.push({ x: W * 0.36, y: GROUND_Y - 155, bob: 0, glow: (frameCounter || 0) * 0.08 });
        return;
      }

      if (isAkashganga()) {
        for (var ak = 0; ak < 5; ak++) {
          S.chais.push({ x: W * (0.34 + ak * 0.12), y: GROUND_Y - 118 - Math.sin(ak * 0.9) * 46, bob: ak });
        }
        return;
      }

      if (m < 1500) {
        devMapSpawnFromPatterns(m, ['easy', 'easy', 'medium']);
        // Always have at least one chai visible.
        S.chais.push({ x: W * 0.42, y: GROUND_Y - 120, bob: 0 });
      } else if (m < 4000) {
        devMapSpawnFromPatterns(m, ['easy', 'medium', 'bazar', 'bazar']);
        S.chais.push({ x: W * 0.36, y: GROUND_Y - 110, bob: 0 });
      } else if (m < 7000) {
        devMapSpawnFromPatterns(m, ['medium', 'hard', 'raat', 'raat']);
      } else {
        devMapSpawnFromPatterns(m, ['hard', 'raat', 'cosmic', 'cosmic']);
      }
    }
    function devMapSeededRng(seed) {
      var s = (seed | 0) || 1;
      return function () {
        s = (s * 1664525 + 1013904223) | 0;
        return ((s >>> 0) % 100000) / 100000;
      };
    }
    // Per CHAI_RUNNER_CONTENT_MAP.md: which obstacle/pickup types are allowed at meter m.
    function devMapTypeUnlocked(type, m) {
      // Obstacles
      if (type === 'fly')         return m >= 300;
      if (type === 'potty')       return m >= 600;
      if (type === 'ghost_chili' || type === 'ghostChili') return m >= 4500;
      if (type === 'dark_potty'  || type === 'darkPotty')  return m >= 5000;
      if (type === 'cosmic_rock' || type === 'cosmicRock' || type === 'rock') return m >= 7200;
      // Pickups
      if (type === 'bishesh')     return m >= 550;
      if (type === 'heart')       return m >= 700;
      if (type === 'singara')     return m >= 2000;
      if (type === 'marie')       return m >= 2750;
      if (type === 'slice')       return m >= 2000; // bazar fruit
      if (type === 'chanachur')   return m >= 3000;
      return true; // chai, plain steps, etc. always allowed
    }
    function devMapSpawnFromPatterns(m, bucketNames) {
      devMapAppendFromPatterns(m, bucketNames, W * 0.46);
    }
    function devMapAppendFromPatterns(m, bucketNames, startX) {
      var rng = devMapSeededRng((m | 0) + 1);
      // Build pool from named buckets in real PATTERNS table, filtered by unlock map.
      var pool = [];
      for (var bi = 0; bi < bucketNames.length; bi++) {
        var bucket = PATTERNS[bucketNames[bi]];
        if (!bucket) continue;
        for (var pi = 0; pi < bucket.length; pi++) {
          var pat = bucket[pi];
          var ok = true;
          for (var ti = 0; ti < pat.length; ti++) {
            if (!devMapTypeUnlocked(pat[ti].type, m)) { ok = false; break; }
          }
          if (ok) pool.push(pat);
        }
      }
      // Splice in expert set-pieces unlocked by distance, just like pickPattern().
      var unlockedExpert = 0;
      if (m >= 900)  unlockedExpert = 1;
      if (m >= 1500) unlockedExpert = 2;
      if (m >= 3000) unlockedExpert = 3;
      if (m >= 5000) unlockedExpert = 4;
      if (m >= 7000) unlockedExpert = 5;
      if (unlockedExpert > 0 && (rng() < 0.18)) {
        var ex = PATTERNS.expert[Math.floor(rng() * unlockedExpert)];
        var exOk = true;
        for (var ei = 0; ei < ex.length; ei++) {
          if (!devMapTypeUnlocked(ex[ei].type, m)) { exOk = false; break; }
        }
        if (exOk) pool.push(ex);
      }
      if (pool.length === 0) return;
      // ONE pattern per call — keeps density true to the content map.
      var chosen = pool[Math.floor(rng() * pool.length)];
      for (var pj = 0; pj < chosen.length; pj++) {
        S.obstacles.push(devMapObstacle(chosen[pj].type, startX + chosen[pj].dx));
      }
    }
    function devMapBucketsFor(m) {
      if (m < 1500) return ['easy', 'easy', 'medium'];
      if (m < 4000) return ['easy', 'medium', 'bazar', 'bazar'];
      if (m < 7000) return ['medium', 'hard', 'raat', 'raat'];
      return ['hard', 'raat', 'cosmic', 'cosmic'];
    }
    function devMapFurthestX() {
      var max = -Infinity;
      for (var i = 0; i < S.obstacles.length; i++) if (S.obstacles[i].x > max) max = S.obstacles[i].x;
      return max === -Infinity ? -1 : max;
    }
    function devMapAppendAhead(m, baseX) {
      // Skip during boss / akashganga, those are handled by full populate.
      if (devMapBossFor(m) || isAkashganga()) return;
      var startX = Math.max(baseX, W + 60);
      var rng = devMapSeededRng((m | 0) + 7);
      devMapAppendFromPatterns(m, devMapBucketsFor(m), startX);
      // One chai per corridor — only if we don't already have too many on screen.
      var pickX = startX + 60 + rng() * 80;
      if (S.chais.length < 2) {
        S.chais.push({ x: pickX, y: GROUND_Y - 120, bob: 0 });
      }
      // Sparse bonus pickup — at most ONE of each type on screen at once.
      if (devMapTypeUnlocked('bishesh', m) && S.bishesh.length < 1 && rng() < 0.20) {
        S.bishesh.push({ x: pickX + 200, y: GROUND_Y - 175, bob: 1, glow: (frameCounter || 0) * 0.08 });
      }
      if (devMapTypeUnlocked('heart', m) && S.hearts.length < 1 && rng() < 0.14) {
        S.hearts.push({ x: pickX + 340, y: GROUND_Y - 165, bob: 0 });
      }
      if (S.bonusPickups.length < 1 && rng() < 0.20) {
        if (devMapTypeUnlocked('singara', m)) S.bonusPickups.push(devMapBonus('singara', pickX + 140, GROUND_Y - 142));
        else if (devMapTypeUnlocked('marie', m)) S.bonusPickups.push(devMapBonus('marie', pickX + 140, GROUND_Y - 112));
        else if (devMapTypeUnlocked('slice', m)) S.bonusPickups.push(devMapBonus('slice', pickX + 140, GROUND_Y - 168));
      }
      if (devMapTypeUnlocked('chanachur', m) && S.chanachur.length < 1 && rng() < 0.12) {
        S.chanachur.push({ x: pickX + 280, y: GROUND_Y - 155, bob: 2, glow: (frameCounter || 0) * 0.08 });
      }
    }
    function setDevMapDistance(m, syncRange) {
      if (!DEV_MAP) return;
      m = devMapClamp(m);
      S.distancePx = m / CFG.METERS_PER_PX;
      S.bonusScore = 0;
      S.score = Math.floor(S.distancePx / 10);
      S.lives = 3;
      S.started = false;
      S.paused = true;
      S.gameOver = false;
      S.won = false;
      S.onboarding = false;
      S.paused = !devMapPlaying;
      S.biomeIdx = getActiveBiomeIdx(S.distanceM);
      S.lastBiomeIdx = S.biomeIdx;
      S.lastMarkerM = m;
      S.deathZoom = 1;
      player.y = player.baseY;
      player.vy = 0;
      player.onGround = true;
      player.rotation = 0;
      player.fastFall = false;
      player.jumpHeld = false;
      player.jumpsUsed = 0;
      player.stamina = CFG.STAMINA_MAX;
      displayedScore = S.score;
      lastDisplayedScore = -1;
      renderHearts();
      updateHUD();
      devMapResetBeats(m);
      devMapPopulateActors(m);
      updateDevMapUi(syncRange);
    }
    function devMapNextStop() {
      var cur = S.distanceM;
      for (var i = 0; i < DEV_MAP_STOPS.length; i++) {
        if (DEV_MAP_STOPS[i].m > cur + 5) { setDevMapDistance(DEV_MAP_STOPS[i].m, true); return; }
      }
      setDevMapDistance(DEV_MAP_MAX_M, true);
    }
    function devMapPrevStop() {
      var cur = S.distanceM;
      for (var i = DEV_MAP_STOPS.length - 1; i >= 0; i--) {
        if (DEV_MAP_STOPS[i].m < cur - 5) { setDevMapDistance(DEV_MAP_STOPS[i].m, true); return; }
      }
      setDevMapDistance(0, true);
    }
    function setupDevMap() {
      devMapReady = true;
      S.started = false;
      S.paused = true;
      stopAmbientPad();
      var card = hud.querySelector('.bb-card');
      if (card) card.remove();
      var panel = document.createElement('div');
      panel.className = 'bb-devmap';
      panel.innerHTML = [
        '<div class="bb-devmap-top">',
        '  <div class="bb-devmap-title"><div class="bb-devmap-kicker" id="bb-devmap-kicker">DEV MAP</div><div class="bb-devmap-name" id="bb-devmap-name">Start</div></div>',
        '  <div class="bb-devmap-meter" id="bb-devmap-meter">0m</div>',
        '</div>',
        '<input id="bb-devmap-range" type="range" min="0" max="' + DEV_MAP_MAX_M + '" step="10" value="0" aria-label="Chai Runner map distance">',
        '<div class="bb-devmap-actions">',
        '  <div><button id="bb-devmap-play" type="button">Pause</button> <button id="bb-devmap-prev" type="button">Prev Stop</button> <button id="bb-devmap-next" type="button">Next Stop</button></div>',
        '  <div class="bb-devmap-hint">Space play/pause · wheel/drag scrub · ←/→ ±100m · PgUp/PgDn stops</div>',
        '</div>'
      ].join('');
      hud.appendChild(panel);
      devMapEls = {
        range: document.getElementById('bb-devmap-range'),
        meter: document.getElementById('bb-devmap-meter'),
        name: document.getElementById('bb-devmap-name'),
        kicker: document.getElementById('bb-devmap-kicker'),
        play: document.getElementById('bb-devmap-play')
      };
      devMapEls.range.addEventListener('pointerdown', function () { setDevMapPlaying(false); });
      devMapEls.range.addEventListener('input', function () { setDevMapDistance(devMapEls.range.value, false); });
      document.getElementById('bb-devmap-play').addEventListener('click', function () { setDevMapPlaying(!devMapPlaying); });
      document.getElementById('bb-devmap-prev').addEventListener('click', function () { setDevMapPlaying(false); devMapPrevStop(); });
      document.getElementById('bb-devmap-next').addEventListener('click', function () { setDevMapPlaying(false); devMapNextStop(); });
      window.BBDevMap = { set: function (m) { setDevMapDistance(m, true); }, play: function () { setDevMapPlaying(true); }, pause: function () { setDevMapPlaying(false); }, next: devMapNextStop, prev: devMapPrevStop, stops: DEV_MAP_STOPS };
      setDevMapDistance(0, true);
    }

    // ==================== HEALTHCHECK ====================
    if (!window.__bbIsPreview) {
      setInterval(function () {
        S.retrySecs--;
        var el = document.getElementById('bb-secs');
        if (el) el.textContent = S.retrySecs;
        if (S.retrySecs <= 0) {
          S.retrySecs = 20;
          fetch('/api/version', { method: 'GET', cache: 'no-store' })
            .then(function (r) { if (r.ok) onSiteBack(); })
            .catch(function () {});
        }
      }, 1000);
    } else {
      var bot = document.getElementById('bb-bottom');
      if (bot) bot.innerHTML = 'Preview mode · auto-reload disabled · <a id="bb-now2">Refresh</a>';
      var n2 = document.getElementById('bb-now2');
      if (n2) n2.addEventListener('click', function () { window.location.replace(window.location.pathname); });
    }
    function onSiteBack() {
      if (S.siteBack) return;
      S.siteBack = true; S.paused = true;
      var card = document.createElement('div');
      card.className = 'bb-card';
      card.innerHTML = [
        '<h2>Bong Bari is back! 🎉</h2>',
        '<p>Site is ready. Continue running or go home?</p>',
        '<button class="bb-btn" id="bb-home">Go Home</button>',
        '<button class="bb-btn" id="bb-keep" style="background:transparent;color:#bbb;border:1px solid rgba(255,255,255,0.2);box-shadow:none;margin-left:8px;">Keep Playing</button>'
      ].join('');
      hud.appendChild(card);
      requestAnimationFrame(function () { card.classList.add('in'); });
      document.getElementById('bb-home').onclick = function () { window.location.replace(window.location.pathname); };
      document.getElementById('bb-keep').onclick = function () { card.classList.remove('in'); setTimeout(function(){ card.remove(); }, 350); S.paused = false; };
    }

    // Build sprite cache, then start
    buildAllSprites();
    if (DEV_MAP) setupDevMap();
    else showStart();

    // ==================== Phase 28/9 — COMBO TIER LADDER (silent) ====================
    // 3 chai = ×2, 7 = ×3, 12 = ×4, 20 = ×5. Tier resets on hit.
    // No UI badge. Score ticks faster + brief gold flash on score number = the feedback.
    function computeComboTier(chain) {
      var tiers = CFG.COMBO_TIERS;
      var idx = 0, mult = 1;
      for (var i = 0; i < tiers.length; i++) {
        if (chain >= tiers[i].chain) { idx = i + 1; mult = tiers[i].mult; }
      }
      return { tierIdx: idx, mult: mult };
    }
    function bumpCombo() {
      S.comboChain++;
      var t = computeComboTier(S.comboChain);
      var prevTier = S.comboTier;
      S.comboTier = t.tierIdx;
      S.comboMult = t.mult;
      if (S.comboChain >= CFG.COMBO_THRESHOLD && !S.comboActive) {
        S.comboActive = true;
        S.comboTimer = CFG.COMBO_DURATION_FRAMES;
        sfxCombo();
      } else if (S.comboActive) {
        S.comboTimer = CFG.COMBO_DURATION_FRAMES; // refresh on additional chai
      }
      // Phase 9 — silent tier-up signal: brief gold flash on score + soft chime.
      if (S.comboTier > prevTier && scoreEl) {
        scoreEl.classList.add('tier-up');
        setTimeout(function () { scoreEl.classList.remove('tier-up'); }, 220);
        sfxCombo();
      }
    }
    function breakCombo() {
      S.comboChain = 0;
      S.comboTier = 0;
      S.comboMult = 1;
      if (S.comboActive) S.comboActive = false;
    }

    // ==================== Phase 40b — FIXED-TIMESTEP LOOP ====================
    // logic runs at fixed 60Hz steps (frameCounter += 1 per step).
    // Render runs every rAF tick; physics state interpolates.
    var last = performance.now();
    var accumMs = 0;
    var frameCounter = 0;

    function logicStep() {
      // Each call advances ONE 60Hz frame of logic.
      var dt = 1; // unit: "frames" (since CFG values are tuned for 60Hz frames)
      frameCounter += 1;

      if (DEV_MAP && devMapReady) {
        devMapTick(dt);
        return;
      }

      if (!S.started || S.paused || S.gameOver) {
        // Still tick blink so cup blinks idle
        player.blinkTimer -= dt;
        if (player.blinkTimer <= 0) {
          player.blink = player.blink > 0 ? 0 : 1;
          player.blinkTimer = player.blink ? 6 : 80 + freeRng()*120;
        }
        return;
      }

      // Phase 53 — Onboarding pause-before-first-jump
      if (S.onboardPauseFrames > 0) { S.onboardPauseFrames--; return; }

      // Phase 52 — Anti-cheat per-tick (rAF tamper / time-warp)
      anticheatTick();

      // Speed (capped, smooth approach)
      var targetSpeed = CFG.SPEED_BASE + CFG.SPEED_GAIN * (1 - Math.exp(-S.distanceM / CFG.SPEED_TAU_M));
      S.speed += (targetSpeed - S.speed) * 0.05;
      // Phase 53 — onboarding speed cap on first run
      if (S.onboarding) S.speed = Math.min(S.speed, CFG.ONBOARD_SPEED_CAP);

      // Phase 48 — Bishesh special timer countdown
      if (S.specialActive) {
        S.specialTimer--;
        if (S.specialTimer <= 0) {
          S.specialActive = false;
          // Phase 1b — "Bishesh ended" tip removed; gold halo simply stops.
        }
      }
      if (S.chanachurActive) {
        S.chanachurTimer--;
        if (S.chanachurTimer <= 0) S.chanachurActive = false;
      }

      S.distancePx += S.speed;
      S.score = Math.floor(S.distancePx / 10) + S.bonusScore;
      updateHUD();

      if (isAkashganga()) {
        if (!S.akashShown) {
          S.akashShown = true;
          S.patternQueue = [];
          S.obstacles = [];
          S.postHitSafeUntil = frameCounter + 30;
          showLevelBanner('Akashganga · Free Chai');
        }
        if ((S.distanceM - S.lastAkashChaiM) >= CFG.AKASHGANGA_CHAI_EVERY_M) {
          spawnChai(GROUND_Y - 115 - Math.sin(S.distanceM * 0.02) * 70);
          S.lastAkashChaiM = S.distanceM;
        }
      }

      // Biomes
      var newBiome = getActiveBiomeIdx(S.distanceM);
      if (newBiome !== S.lastBiomeIdx) {
        S.biomeIdx = newBiome;
        S.lastBiomeIdx = newBiome;
        var bm = CFG.BIOMES[newBiome];
        showLevelBanner('Level ' + (newBiome+1) + ' · ' + bm.name + ' · ' + bm.bn + ' ✨');
        updateAmbientPadForBiome(newBiome);
      }

      maybeShowTipForScore(S.score);

      // DDA
      S.cleanRunSinceSec += 1/60;
      var nowSec = performance.now()/1000;
      while (S.deathTimes.length > 0 && nowSec - S.deathTimes[0] > CFG.DDA_DEATHS_WINDOW_SEC) S.deathTimes.shift();
      if (S.deathTimes.length >= CFG.DDA_EASE_DEATHS) S.densityMult = CFG.DDA_EASE_FACTOR;
      else if (S.cleanRunSinceSec >= CFG.DDA_TIGHTEN_SEC) S.densityMult = CFG.DDA_TIGHTEN_FACTOR;
      else S.densityMult = 1.0;

      // Storm
      if (S.stormState === 'idle' && !S.boss && !isAkashganga() && S.score - S.lastStormScore >= CFG.STORM_EVERY_SCORE) {
        S.stormState = 'warn';
        S.stormTimer = CFG.STORM_PRE_WARN_FRAMES;
        sfxStorm();
        // Phase 1b — instructional tip removed. The gold flash (storm warn) + sfx is the cue.
      } else if (S.stormState === 'warn') {
        S.stormTimer -= 1;
        if (S.stormTimer <= 0) {
          S.stormState = 'active';
          S.stormTimer = CFG.STORM_DURATION_FRAMES;
          S.stormSpawnInterval = CFG.STORM_DURATION_FRAMES / CFG.STORM_CHAI_COUNT;
          S.stormSpawned = 0;
        }
      } else if (S.stormState === 'active') {
        S.stormTimer -= 1;
        var dueCount = Math.floor((CFG.STORM_DURATION_FRAMES - S.stormTimer) / S.stormSpawnInterval);
        while (S.stormSpawned < dueCount && S.stormSpawned < CFG.STORM_CHAI_COUNT) {
          var arcY = GROUND_Y - 60 - Math.sin(S.stormSpawned / CFG.STORM_CHAI_COUNT * Math.PI) * 120;
          spawnChai(arcY);
          S.stormSpawned++;
        }
        if (S.stormTimer <= 0) {
          S.stormState = 'idle';
          S.lastStormScore = S.score;
        }
      }

      // Combo timer
      if (S.comboActive) {
        S.comboTimer -= 1;
        if (S.comboTimer <= 0) {
          S.comboActive = false;
          S.comboChain = 0;
          var combo = document.getElementById('bb-combo');
          if (combo) combo.classList.remove('show');
        }
      }

      // Coyote / buffer
      if (player.coyoteFrames > 0) player.coyoteFrames -= 1;
      if (player.bufferedJumpFrames > 0) {
        player.bufferedJumpFrames -= 1;
        if (player.onGround) tryJump();
      }

      if (!player.onGround) {
        var grav = player.vy < 0 ? CFG.GRAVITY_RISE : CFG.GRAVITY_FALL;
        if (Math.abs(player.vy) < CFG.APEX_VY_THRESHOLD) grav = CFG.GRAVITY_APEX;
        if (player.fastFall && player.vy > -2) grav *= CFG.FASTFALL_MULT;
        player.vy += grav;
        if (player.jumpHeld && player.jumpHoldFrames < CFG.MAX_JUMP_HOLD_FRAMES && player.vy < 0) {
          player.vy += CFG.JUMP_HOLD_BOOST;
          player.jumpHoldFrames += 1;
        }
        player.y += player.vy;
        player.rotation = Math.max(-0.3, Math.min(0.3, player.vy * 0.02));
        // Phase 22 — push trail during rise only
        if (player.vy < 0) pushTrail();
        if (player.y >= player.baseY) {
          player.y = player.baseY;
          player.vy = 0;
          if (!player.onGround) {
            player.onGround = true;
            player.squash = 1.25;
            player.rotation = 0;
            player.jumpsUsed = 0;
            player.fastFall = false;
            for (var dp = 0; dp < 5; dp++) puff(player.x - 8 + freeRng()*16, GROUND_Y - 2, true);
            if (player.bufferedJumpFrames > 0) tryJump();
          }
        }
      } else {
        player.runFrame += 0.32;
        player.bobPhase += 0.18;
        player.y = player.baseY + Math.sin(player.bobPhase) * 1.2;
      }
      if (player.stamina < CFG.STAMINA_MAX) {
        player.staminaRegenSec += 1/60;
        if (player.staminaRegenSec >= CFG.STAMINA_REGEN_SEC) {
          player.stamina++;
          player.staminaRegenSec = 0;
          renderStamina();
        }
      }
      if (player.squash !== 1) {
        player.squash += (1 - player.squash) * 0.18;
        if (Math.abs(player.squash - 1) < 0.02) player.squash = 1;
      }
      player.blinkTimer -= 1;
      if (player.blinkTimer <= 0) {
        player.blink = player.blink > 0 ? 0 : 1;
        player.blinkTimer = player.blink ? 6 : 60 + freeRng()*120;
      }
      if (player.hitImmuneSec > 0) player.hitImmuneSec -= 1/60;
      if (S.hitSlowSec > 0) S.hitSlowSec -= 1/60;

      // Spawn
      updateSpawnScheduler(frameCounter);

      // Obstacles
      for (var oi = S.obstacles.length - 1; oi >= 0; oi--) {
        var o = S.obstacles[oi];
        o.x -= S.speed;
        o.bob += 0.06;
        o.rot += 0.025;
        var pw = player.width * CFG.HITBOX_W;
        var ph = player.height * CFG.HITBOX_H;
        var ow = o.size * 0.7, oh = o.size * 0.7;
        var dx = Math.abs(player.x - o.x);
        var dy = Math.abs(player.y - o.y);
        if (player.hitImmuneSec <= 0) {
          if (dx < (pw + ow)/2 && dy < (ph + oh)/2) {
            // Phase 48 — Bishesh: invincible, smash obstacle
            if (S.specialActive) {
              sparkleBurst(o.x, o.y, [244,196,48], 16);
              floater('SMASH! ✨', o.x, o.y - 25, '#f4c430');
              S.bonusScore += 10;
              S.obstacles.splice(oi, 1);
              continue;
            }
            S.lives--;
            S.runStats.hits++;
            S.runStats.endReason = obstacleMeta(o.type).hit;
            sfxHit();
            haptic([12, 6, 18]); // Q5
            S.cameraShake = REDUCED_MOTION ? 0 : CFG.SHAKE_HARD;
            S.hitFlash = REDUCED_MOTION ? 0 : 1;
            player.hitImmuneSec = CFG.I_FRAMES_SEC;
            S.postHitSafeUntil = frameCounter + CFG.POST_HIT_SAFE_FRAMES;
            S.framesSinceHit = 0;
            S.hitSlowSec = 0.15; // Phase 23 — visual hit recoil
            S.cleanRunSinceSec = 0;
            breakCombo();
            sparkleBurst(player.x, player.y, [239,68,68], 14);
            floater('-1 ❤️', player.x, player.y - 30, '#ef4444');
            renderHearts();
            if (S.lives <= 0) { S.gameOver = true; showGameOver(); }
            S.obstacles.splice(oi, 1);
            continue;
          }
          if (!o.nearMissed && dx < (pw + ow)/2 + CFG.NEARMISS_PX && dy < (ph + oh)/2 + CFG.NEARMISS_PX && o.x < player.x + 10) {
            o.nearMissed = true;
            S.runStats.nearMiss++;
            var nmMult = (S.comboActive ? CFG.COMBO_MULT : 1) * (S.specialActive ? CFG.BISHESH_MULT : 1) * (S.chanachurActive ? CFG.CHANACHUR_MULT : 1) * (S.endlessMode ? S.endlessMult : 1);
            S.bonusScore += CFG.NEARMISS_BONUS * nmMult;
            S.cameraShake = Math.max(S.cameraShake, REDUCED_MOTION ? 0 : CFG.SHAKE_SOFT);
            S.nearMissTint = REDUCED_MOTION ? 0 : 1;
            sfxNear();
            floater('+' + (CFG.NEARMISS_BONUS * nmMult) + ' STYLE', o.x, o.y - 25, '#22d3ee');
          }
        }
        if (o.x < -100) S.obstacles.splice(oi, 1);
      }
      if (S.patternQueue.length > 0) S.patternQueue[0].dxRemaining -= S.speed;

      // Chais
      for (var ci = S.chais.length - 1; ci >= 0; ci--) {
        var ch = S.chais[ci];
        ch.x -= S.speed;
        ch.bob += 0.05;
        if (Math.abs(player.x - ch.x) < 40 && Math.abs(player.y - ch.y) < 40) {
          // Phase 9 — dynamic combo multiplier from tier ladder (S.comboMult). Default 1.
          var gainMult = (S.comboActive ? S.comboMult : 1) * (S.specialActive ? CFG.BISHESH_MULT : 1) * (S.chanachurActive ? CFG.CHANACHUR_MULT : 1) * (S.endlessMode ? S.endlessMult : 1);
          var gain = 25 * gainMult;
          S.bonusScore += gain;
          S.runStats.chai++;
          sfxCollect();
          S.cameraShake = Math.max(S.cameraShake, REDUCED_MOTION ? 0 : CFG.SHAKE_SOFT);
          sparkleBurst(ch.x, ch.y, [255,200,80], 12);
          floater('+' + gain + ' 🍵', ch.x, ch.y - 20);
          bumpCombo();
          S.chais.splice(ci, 1);
          continue;
        }
        if (ch.x < -50) S.chais.splice(ci, 1);
      }

      // Phase 47 — Hearts (health pickup)
      if (S.lives < 3 && !S.boss && (S.score - S.lastHeartScore) >= CFG.HEART_EVERY_SCORE && S.stormState === 'idle' && S.patternQueue.length === 0) {
        if (freeRng() < CFG.HEART_SPAWN_CHANCE) spawnHeart();
        S.lastHeartScore = S.score;
      }
      for (var hi = S.hearts.length - 1; hi >= 0; hi--) {
        var hh = S.hearts[hi];
        hh.x -= S.speed;
        hh.bob += 0.06;
        if (Math.abs(player.x - hh.x) < 38 && Math.abs(player.y - hh.y) < 38) {
          if (S.lives < 3) S.lives++;
          S.runStats.hearts++;
          renderHearts();
          sfxLevelUp();
          sparkleBurst(hh.x, hh.y, [239,68,68], 14);
          floater('+❤️ Health!', hh.x, hh.y - 20, '#ef4444');
          S.hearts.splice(hi, 1);
          continue;
        }
        if (hh.x < -50) S.hearts.splice(hi, 1);
      }

      // Phase 48 — Bishesh chai (power-up)
      if (!S.specialActive && !S.boss && (S.distanceM - S.lastBisheshDistM) >= CFG.BISHESH_EVERY_DIST_M && S.stormState === 'idle' && S.patternQueue.length === 0) {
        if (freeRng() < CFG.BISHESH_SPAWN_CHANCE) spawnBishesh();
        S.lastBisheshDistM = S.distanceM;
      }
      for (var bi = S.bishesh.length - 1; bi >= 0; bi--) {
        var bb = S.bishesh[bi];
        bb.x -= S.speed;
        bb.bob += 0.07;
        bb.glow = (bb.glow || 0) + 0.15;
        if (Math.abs(player.x - bb.x) < 42 && Math.abs(player.y - bb.y) < 42) {
          S.specialActive = true;
          S.specialTimer = CFG.BISHESH_DURATION_FRAMES;
          S.runStats.bishesh++;
          sfxLevelUp();
          sparkleBurst(bb.x, bb.y, [244,196,48], 22);
          floater('+×3 BISHESH! ✨', bb.x, bb.y - 25, '#f4c430');
          // Phase 1b — instructional tip removed; gold halo + score×3 is the feedback.
          S.bishesh.splice(bi, 1);
          continue;
        }
        if (bb.x < -50) S.bishesh.splice(bi, 1);
      }

      // Batch 3 — Jhal Chanachur: Bazar+ x2 score burst, spawned between patterns only.
      if (!S.chanachurActive && !S.boss && S.distanceM >= CFG.CHANACHUR_START_M && (S.distanceM - S.lastChanachurDistM) >= CFG.CHANACHUR_EVERY_DIST_M && S.stormState === 'idle' && S.patternQueue.length === 0) {
        if (freeRng() < CFG.CHANACHUR_SPAWN_CHANCE) spawnChanachur();
        S.lastChanachurDistM = S.distanceM;
      }
      for (var cpi = S.chanachur.length - 1; cpi >= 0; cpi--) {
        var cp = S.chanachur[cpi];
        cp.x -= S.speed;
        cp.bob += 0.08;
        cp.glow = (cp.glow || 0) + 0.16;
        if (Math.abs(player.x - cp.x) < 42 && Math.abs(player.y - cp.y) < 42) {
          S.chanachurActive = true;
          S.chanachurTimer = CFG.CHANACHUR_DURATION_FRAMES;
          S.bonusScore += 40;
          sfxCombo();
          sparkleBurst(cp.x, cp.y, [249,115,22], 18);
          floater('×2 JHAL!', cp.x, cp.y - 22, '#f97316');
          S.chanachur.splice(cpi, 1);
          continue;
        }
        if (cp.x < -50) S.chanachur.splice(cpi, 1);
      }

      // Batch 7 — Bonus point pickups: Marie, Singara, Bread Slice. Green ring = reward, not danger.
      if (S.distanceM >= CFG.BONUS_PICKUP_START_M && (S.distanceM - S.lastBonusPickupDistM) >= CFG.BONUS_PICKUP_EVERY_DIST_M && S.stormState === 'idle' && S.patternQueue.length === 0 && !S.boss) {
        if (freeRng() < CFG.BONUS_PICKUP_SPAWN_CHANCE) spawnBonusPickup(chooseBonusPickupType());
        S.lastBonusPickupDistM = S.distanceM;
      }
      for (var bpi = S.bonusPickups.length - 1; bpi >= 0; bpi--) {
        var bpick = S.bonusPickups[bpi];
        var bpMeta = bonusPickupMeta(bpick.type);
        bpick.x -= S.speed;
        bpick.bob += 0.08;
        bpick.glow = (bpick.glow || 0) + 0.16;
        if (Math.abs(player.x - bpick.x) < 42 && Math.abs(player.y - bpick.y) < 42) {
          var bonusMult = (S.specialActive ? CFG.BISHESH_MULT : 1) * (S.chanachurActive ? CFG.CHANACHUR_MULT : 1) * (S.endlessMode ? S.endlessMult : 1);
          var bonusGain = bpMeta.value * bonusMult;
          S.bonusScore += bonusGain;
          sfxCollect();
          sparkleBurst(bpick.x, bpick.y, bpMeta.color, 16);
          floater('+' + bonusGain, bpick.x, bpick.y - 26, '#22c55e');
          S.bonusPickups.splice(bpi, 1);
          continue;
        }
        if (bpick.x < -60) S.bonusPickups.splice(bpi, 1);
      }

      // Phase 1 — silent milestone toasts. NO forced win-stop. Game is endless from second one.
      // Phase 14 — each milestone also re-checks skin unlocks silently. (30-minute arc)
      var MS = [500, 1500, 3500, 7000, 8000, 15000, 25000];
      for (var msi = 0; msi < MS.length; msi++) {
        var ms = MS[msi];
        if (S.distanceM >= ms && S.milestonesHit.indexOf(ms) < 0) {
          S.milestonesHit.push(ms);
          var label = ms >= 1000 ? (ms / 1000).toFixed(0) + 'km ✓' : ms + 'm ✓';
          showTip(label);
          maybeUnlockSkin();
          break; // only one milestone per logic step
        }
      }

      // Phase 53 — Mark first-run done after 200m on onboarding (silent)
      if (S.onboarding && S.distanceM >= 200) {
        S.onboarding = false;
      }

      // Phase 42 — Periodic achievement check (every 30 frames)
      if ((frameCounter % 30) === 0) checkAchievements();
    }

    function loop(now) {
      requestAnimationFrame(loop);
      var elapsed = now - last;
      last = now;
      // Cap to avoid spiral after tab-hide
      if (elapsed > 250) elapsed = CFG.FIXED_DT_MS;

      // Phase 31 — perf probe (auto quality)
      if (QUALITY.probing && S.started) {
        QUALITY.probeFrames++;
        if (QUALITY.probeFrames >= CFG.PROBE_FRAMES) {
          var probeMs = now - QUALITY.probeStart;
          var avgFps = (QUALITY.probeFrames / probeMs) * 1000;
          QUALITY.level = avgFps < CFG.PROBE_LOW_FPS ? 'low' : 'high';
          QUALITY.probing = false;
          refreshQualityBtn();
          initWeather(); // re-init with new counts
        }
      }

      accumMs += elapsed;
      var steps = 0;
      while (accumMs >= CFG.FIXED_DT_MS && steps < CFG.MAX_STEPS_PER_FRAME) {
        logicStep();
        accumMs -= CFG.FIXED_DT_MS;
        steps++;
      }
      // Drain extra accumulated time if we hit step cap (avoid spiral)
      if (steps >= CFG.MAX_STEPS_PER_FRAME) accumMs = 0;

      if (!devMapFrozen()) steamPhase += 0.1;

      // ========== RENDER ==========
      drawBg(now);
      drawBossPresence(now);

      // Camera shake
      var shakeX = 0, shakeY = 0;
      if (S.cameraShake > 0) {
        shakeX = (freeRng()-0.5) * S.cameraShake;
        shakeY = (freeRng()-0.5) * S.cameraShake;
        S.cameraShake -= 0.6;
        if (S.cameraShake < 0) S.cameraShake = 0;
      }
      ctx.save();
      ctx.translate(shakeX, shakeY);
      drawTrail(); // Phase 22

      // Phase 27 — 100m distance signs: spawn + draw ground-level markers
      var _curM = S.distanceM;
      if (S.started && !S.gameOver) {
        var _nextMark = (Math.floor(S.lastMarkerM / 100) + 1) * 100;
        while (_curM >= _nextMark) {
          S.distMarkers.push({ x: W + 30, m: _nextMark, alpha: 0 });
          S.lastMarkerM = _nextMark;
          _nextMark += 100;
        }
      }
      for (var _mi = S.distMarkers.length - 1; _mi >= 0; _mi--) {
        var _mk = S.distMarkers[_mi];
        _mk.x -= S.speed;
        if (_mk.alpha < 1) _mk.alpha = Math.min(1, _mk.alpha + 0.08);
        if (_mk.x < W * 0.7 && _mk.alpha >= 0.95) _mk.alpha = Math.max(0, _mk.alpha - 0.025); // E-2: was === 1 (float never hit)
        if (_mk.x < -60 || _mk.alpha <= 0) { S.distMarkers.splice(_mi, 1); continue; }
        ctx.save();
        ctx.globalAlpha = _mk.alpha * 0.85;
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        var _mLabel = _mk.m + 'm';
        ctx.font = 'bold 12px -apple-system, sans-serif';
        var _mW = ctx.measureText(_mLabel).width + 12;
        var _mX = Math.round(_mk.x), _mY = GROUND_Y - 20;
        // E-2: roundRect fallback for older browsers
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(_mX - _mW/2, _mY - 10, _mW, 20, 5);
        } else {
          ctx.rect(_mX - _mW/2, _mY - 10, _mW, 20);
        }
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(_mLabel, _mX, _mY + 4);
        ctx.restore();
      }

      for (var di = 0; di < S.obstacles.length; di++) drawObstacle(S.obstacles[di]);
      for (var dc = 0; dc < S.chais.length; dc++) drawChai(S.chais[dc]);
      for (var dh = 0; dh < S.hearts.length; dh++) drawHeart(S.hearts[dh]);
      for (var db = 0; db < S.bishesh.length; db++) drawBishesh(S.bishesh[db]);
      for (var dcp = 0; dcp < S.chanachur.length; dcp++) drawChanachur(S.chanachur[dcp]);
      for (var dbp = 0; dbp < S.bonusPickups.length; dbp++) drawBonusPickup(S.bonusPickups[dbp]);
      // Phase 48 — Golden trail + invincibility shimmer when special active
      if (S.specialActive) {
        var pulse = 0.6 + 0.4 * Math.sin(frameCounter * 0.3);
        ctx.save();
        ctx.fillStyle = 'rgba(244,196,48,' + (0.18 * pulse) + ')';
        ctx.beginPath();
        ctx.arc(player.x, player.y, 38, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
        if ((frameCounter % 2) === 0) {
          S.particles.push({
            x: player.x + (freeRng()-0.5)*20, y: player.y + (freeRng()-0.5)*20,
            vx: -2 - freeRng()*2, vy: (freeRng()-0.5)*1.5,
            life: 1, size: 3 + freeRng()*2, color: [244,196,48]
          });
        }
      }
      if (S.chanachurActive) {
        var jhalPulse = 0.55 + 0.45 * Math.sin(frameCounter * 0.35);
        ctx.save();
        ctx.fillStyle = 'rgba(249,115,22,' + (0.10 * jhalPulse) + ')';
        ctx.beginPath();
        ctx.arc(player.x, player.y, 34, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
      }
      // Phase 23 — hit slowdown: nudge draw x left for 0.15s after hit
      var _hitSlowOff = 0;
      if (S.hitSlowSec > 0) {
        _hitSlowOff = (S.hitSlowSec / 0.15) * -8;
      }
      // Phase 28 — death camera zoom centred on cup
      if (S.gameOver && S.deathZoom < 1.15) {
        S.deathZoom += (1.15 - S.deathZoom) * 0.06;
      }
      if (S.gameOver && S.deathZoom > 1.001) {
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.scale(S.deathZoom, S.deathZoom);
        ctx.translate(-player.x, -player.y);
        drawPlayer(player.x + _hitSlowOff, player.y);
        ctx.restore();
      } else {
        drawPlayer(player.x + _hitSlowOff, player.y);
      }
      drawParticles();
      drawFloaters();
      // Q2 — double jump ring flash (expands + fades)
      if (S.djRing && !REDUCED_MOTION) {
        ctx.save();
        ctx.strokeStyle = 'rgba(180,240,255,' + S.djRing.alpha.toFixed(2) + ')';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(Math.round(S.djRing.x), Math.round(S.djRing.y), S.djRing.r, 0, Math.PI * 2);
        ctx.stroke();
        S.djRing.r += 4;
        S.djRing.alpha -= 0.07;
        if (S.djRing.alpha <= 0) S.djRing = null;
        ctx.restore();
      }
      ctx.restore();

      // Hit flash
      if (S.hitFlash > 0) {
        ctx.fillStyle = 'rgba(239,68,68,' + (S.hitFlash * 0.32) + ')';
        ctx.fillRect(0, 0, W, H);
        S.hitFlash -= 0.06;
        if (S.hitFlash < 0) S.hitFlash = 0;
      }
      // Near-miss cyan tint
      if (S.nearMissTint > 0) {
        ctx.fillStyle = 'rgba(34,211,238,' + (S.nearMissTint * 0.18) + ')';
        ctx.fillRect(0, 0, W, H);
        S.nearMissTint -= 0.05;
        if (S.nearMissTint < 0) S.nearMissTint = 0;
      }
      // Storm warning gold flash
      if (S.stormState === 'warn') {
        var pulse = 0.15 + Math.sin(frameCounter * 0.4) * 0.1;
        ctx.fillStyle = 'rgba(244,196,48,' + pulse + ')';
        ctx.fillRect(0, 0, W, H);
      }
      // Phase 12 — GOLD BISHESH VIGNETTE while special is active (transform-friendly canvas radial)
      if (S.specialActive) {
        var bvPulse = 0.18 + Math.sin(now * 0.006) * 0.08;
        var bvGrad = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.30, W/2, H/2, Math.max(W,H)*0.75);
        bvGrad.addColorStop(0, 'rgba(244,196,48,0)');
        bvGrad.addColorStop(1, 'rgba(244,196,48,' + bvPulse + ')');
        ctx.fillStyle = bvGrad;
        ctx.fillRect(0, 0, W, H);
      }
      // Phase 29 — DAMAGE VIGNETTE when lives <= 1
      if (S.started && !S.gameOver && S.lives <= 1) {
        var vPulse = 0.35 + Math.sin(now * 0.005) * 0.15;
        var vGrad = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.25, W/2, H/2, Math.max(W,H)*0.7);
        vGrad.addColorStop(0, 'rgba(239,68,68,0)');
        vGrad.addColorStop(1, 'rgba(239,68,68,' + vPulse + ')');
        ctx.fillStyle = vGrad;
        ctx.fillRect(0, 0, W, H);
      }
    }
    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

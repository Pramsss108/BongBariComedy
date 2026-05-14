/* ============================================================================
 * bb-cr-models.js — Chai Runner shared character renderers
 * ----------------------------------------------------------------------------
 * Vanilla JS ports of approved DevModels designs (client/src/pages/DevModels.tsx).
 * Loaded BEFORE bb-cosmic-core.js so the game's sprite bakers can use them.
 *
 * Exposes window.BBModels = {
 *   TAU, softShadow,
 *   drawChai, drawChili, drawFly, drawPotty,
 *   drawSingara, drawBiscuit, drawChanachur, drawChiliGhost, drawPottyDark,
 *   drawCharacterCup
 * }
 *
 * All draw functions share the same signature:
 *   draw(ctx, t, w, h)
 *     ctx — 2D context (already DPR-scaled by the caller)
 *     t   — animation time in seconds (use 0 for a baked sprite)
 *     w,h — canvas viewport in CSS px (the function self-scales to fit)
 * ========================================================================= */
(function () {
  var TAU = Math.PI * 2;

  function radialShade(ctx, x, y, r, c1, c2) {
    var g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    return g;
  }

  function softShadow(ctx, cx, gy, w, alpha) {
    if (alpha == null) alpha = 0.25;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,' + alpha + ')';
    ctx.beginPath();
    ctx.ellipse(cx, gy, w, w * 0.22, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // ============== CHARACTER CUP (used for the Bhar Cha hero) ==============
  function drawCharacterCup(ctx, t, w, h, opts) {
    opts = opts || {};
    var label = opts.label || '';
    var bodyGradColors = opts.bodyGrad || ['#f0f0f0', '#c8c8c8', '#888888'];
    var c0 = bodyGradColors[0], c1 = bodyGradColors[1], c2 = bodyGradColors[2];
    var stripes = !!opts.stripes;
    var tint = opts.tint || null;

    var cx = w / 2;
    var sc = Math.min(w, h) / 240;
    var walk = Math.sin(t * 4);

    softShadow(ctx, cx, h - 8, 46 * sc, 0.26);

    ctx.save();
    var bob = Math.sin(t * 2) * 1.8;
    ctx.translate(cx, h * 0.48 + bob);
    ctx.scale(sc, sc);

    // Ground shadow
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(0, 86, 30, 6, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Hot puffy steam (3 trails, deterministic)
    for (var trail = 0; trail < 3; trail++) {
      var baseX = -14 + trail * 14;
      var phase = (t * 0.8 + trail * 0.37) % 1;
      for (var p = 0; p < 5; p++) {
        var lifeP = (phase + p * 0.18) % 1;
        var fade = 1 - lifeP;
        var rise = lifeP * 72;
        var sway = Math.sin(t * 2 + trail + p) * 6 * lifeP;
        var px = baseX + sway;
        var py = -52 - rise;
        var rr = 7 + lifeP * 10;
        ctx.fillStyle = 'rgba(255,' + (200 + Math.floor(40 * fade)) + ',' + (130 + Math.floor(80 * fade)) + ',' + (fade * 0.48) + ')';
        ctx.beginPath(); ctx.arc(px, py, rr * 0.52, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,' + (fade * 0.72) + ')';
        ctx.beginPath(); ctx.arc(px, py, rr, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,' + (fade * 0.42) + ')';
        ctx.beginPath();
        ctx.arc(px - rr * 0.58, py + 1, rr * 0.68, 0, TAU);
        ctx.arc(px + rr * 0.58, py - 1, rr * 0.68, 0, TAU);
        ctx.fill();
      }
    }

    // Cup body — bezier silhouette
    var TW = 40, BW = 28, TY = -42, BY = 58;
    function bodyPath() {
      ctx.beginPath();
      ctx.moveTo(-TW, TY + 3);
      ctx.bezierCurveTo(-TW - 3, TY + 24, -BW - 5, 22, -BW, BY - 8);
      ctx.quadraticCurveTo(0, BY + 9, BW, BY - 8);
      ctx.bezierCurveTo(BW + 5, 22, TW + 3, TY + 24, TW, TY + 3);
      ctx.closePath();
    }

    var vertGrad = ctx.createLinearGradient(0, TY, 0, BY);
    vertGrad.addColorStop(0, c0);
    vertGrad.addColorStop(0.4, c1);
    vertGrad.addColorStop(0.82, c2);
    vertGrad.addColorStop(1, c2);
    ctx.fillStyle = vertGrad;
    bodyPath(); ctx.fill();

    // Premium gloss
    ctx.save();
    bodyPath(); ctx.clip();
    var leftGloss = ctx.createLinearGradient(-TW - 3, 0, -TW + 18, 0);
    leftGloss.addColorStop(0, 'rgba(255,255,255,0.62)');
    leftGloss.addColorStop(0.6, 'rgba(255,255,255,0.15)');
    leftGloss.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = leftGloss;
    ctx.fillRect(-TW - 5, TY - 2, 28, BY - TY + 14);
    var rightGloss = ctx.createLinearGradient(TW - 8, 0, TW + 5, 0);
    rightGloss.addColorStop(0, 'rgba(255,255,255,0)');
    rightGloss.addColorStop(1, 'rgba(255,255,255,0.28)');
    ctx.fillStyle = rightGloss;
    ctx.fillRect(TW - 10, TY - 2, 18, BY - TY + 14);
    var centerGloss = ctx.createLinearGradient(0, TY, 0, TY + 40);
    centerGloss.addColorStop(0, 'rgba(255,255,255,0.18)');
    centerGloss.addColorStop(0.5, 'rgba(255,255,255,0.04)');
    centerGloss.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = centerGloss;
    ctx.beginPath();
    ctx.ellipse(0, TY + 16, 10, 28, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    // Body outline
    ctx.strokeStyle = 'rgba(20,10,2,0.52)';
    ctx.lineWidth = 2;
    bodyPath(); ctx.stroke();

    // Stripes (Bhar Cha clay grooves)
    if (stripes) {
      ctx.save();
      bodyPath(); ctx.clip();
      ctx.strokeStyle = 'rgba(40,18,4,0.32)';
      ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      for (var gi = -3; gi <= 3; gi++) {
        var gx = gi * 9;
        ctx.beginPath();
        ctx.moveTo(gx, TY + 6);
        ctx.quadraticCurveTo(gx * 1.05, 10, gx * 0.78, BY - 4);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,235,200,0.18)';
      ctx.lineWidth = 1.2;
      for (var gi2 = -3; gi2 <= 3; gi2++) {
        var gx2 = gi2 * 9 + 1.6;
        ctx.beginPath();
        ctx.moveTo(gx2, TY + 6);
        ctx.quadraticCurveTo(gx2 * 1.05, 10, gx2 * 0.78, BY - 4);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Rim
    var rimGrad = ctx.createLinearGradient(0, TY - 8, 0, TY + 8);
    rimGrad.addColorStop(0, c0);
    rimGrad.addColorStop(1, c2);
    ctx.fillStyle = rimGrad;
    ctx.beginPath();
    ctx.ellipse(0, TY + 2, TW + 3, 11, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,10,2,0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, TY + 2, TW + 3, 11, 0, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = c2;
    ctx.beginPath();
    ctx.ellipse(0, TY + 2, TW - 4, 7, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath();
    ctx.ellipse(-TW * 0.3, TY - 4, TW * 0.4, 3.5, 0, 0, TAU);
    ctx.fill();

    // Tea surface
    var teaGrad = ctx.createRadialGradient(-3, TY, 2, 0, TY + 1, TW - 4);
    teaGrad.addColorStop(0, '#f7d28a');
    teaGrad.addColorStop(0.55, '#d49a55');
    teaGrad.addColorStop(1, '#a8682c');
    ctx.fillStyle = teaGrad;
    ctx.beginPath();
    ctx.ellipse(0, TY + 2, TW - 5, 5.5, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,245,215,0.82)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, TY + 2, TW - 10, 3.8, 0, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,250,230,0.88)';
    for (var i = 0; i < 8; i++) {
      var a = i * 2.39996;
      var rr2 = (i / 8) * 18;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * rr2, TY + 2 + Math.sin(a) * 2.2, 1 + (i % 3) * 0.35, 0, TAU);
      ctx.fill();
    }

    // Tint overlay (clipped to body, before face)
    if (tint) {
      ctx.save();
      bodyPath(); ctx.clip();
      ctx.fillStyle = tint;
      ctx.fillRect(-80, TY - 5, 160, BY - TY + 25);
      ctx.restore();
    }

    // Face — two-eye 3/4 profile
    var blink = Math.sin(t * 2.6) > 0.95;
    var RX = 13, RY = -13;
    var LX = -10, LY = -12;
    var eyeOutline = 'rgba(15,5,0,0.95)';

    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(RX + 0.5, RY + 1.5, 10, blink ? 2 : 12, 0, 0, TAU);
    ctx.ellipse(LX + 0.5, LY + 1.5, 7, blink ? 1.6 : 9, -0.08, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = eyeOutline;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(RX, RY, 10, blink ? 1.6 : 12, 0, 0, TAU);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(LX, LY, 7, blink ? 1.2 : 9, -0.08, 0, TAU);
    ctx.fill(); ctx.stroke();

    if (!blink) {
      ctx.fillStyle = '#5a3210';
      ctx.beginPath(); ctx.arc(RX + 2.5, RY + 0.5, 5.2, 0, TAU); ctx.fill();
      ctx.fillStyle = '#0d0603';
      ctx.beginPath(); ctx.arc(RX + 2.5, RY + 0.5, 3.4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(RX + 4, RY - 2, 2.2, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath(); ctx.arc(RX + 0.8, RY + 3, 1.1, 0, TAU); ctx.fill();

      ctx.fillStyle = '#5a3210';
      ctx.beginPath(); ctx.arc(LX + 1.8, LY + 0.4, 3.4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#0d0603';
      ctx.beginPath(); ctx.arc(LX + 1.8, LY + 0.4, 2.2, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(LX + 2.7, LY - 1.4, 1.3, 0, TAU); ctx.fill();
    }

    // Cheeks
    ctx.fillStyle = 'rgba(255,120,120,0.32)';
    ctx.beginPath();
    ctx.ellipse(RX + 8, RY + 14, 5.5, 3, 0, 0, TAU);
    ctx.ellipse(LX - 6, LY + 13, 4.5, 2.6, 0, 0, TAU);
    ctx.fill();

    // Brows (shadow + ink)
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(RX - 9, RY - 13); ctx.quadraticCurveTo(RX, RY - 17, RX + 9, RY - 12);
    ctx.moveTo(LX - 6, LY - 11); ctx.quadraticCurveTo(LX, LY - 14.5, LX + 6, LY - 10);
    ctx.stroke();
    ctx.strokeStyle = '#1a0a02';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(RX - 9, RY - 14); ctx.quadraticCurveTo(RX, RY - 18, RX + 9, RY - 13);
    ctx.moveTo(LX - 6, LY - 12); ctx.quadraticCurveTo(LX, LY - 15.5, LX + 6, LY - 11);
    ctx.stroke();

    // Mouth
    var MX = 3, MY = 9;
    ctx.fillStyle = '#150802';
    ctx.beginPath(); ctx.ellipse(MX, MY, 11, 6.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#d8463a';
    ctx.beginPath(); ctx.ellipse(MX, MY + 2.5, 7.5, 2.8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,180,170,0.6)';
    ctx.beginPath(); ctx.ellipse(MX - 1, MY + 1.8, 3.5, 1.2, 0, 0, TAU); ctx.fill();
    // Teeth strip — fall back if roundRect not supported
    ctx.fillStyle = '#ffffff';
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath(); ctx.roundRect(MX - 6.5, MY - 5, 13, 2.5, 1.2); ctx.fill();
    } else {
      ctx.fillRect(MX - 6.5, MY - 5, 13, 2.5);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(MX, MY - 5); ctx.lineTo(MX, MY - 2.5);
    ctx.stroke();
    ctx.strokeStyle = '#0d0502'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(MX, MY, 11, 6.5, 0, 0, TAU); ctx.stroke();

    // Arms
    var armColor = '#3b2516';
    ctx.strokeStyle = armColor;
    ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-BW - 1, -2);
    ctx.quadraticCurveTo(-BW - 22, 12 + walk * 5, -BW - 10, 30);
    ctx.stroke();
    ctx.fillStyle = armColor;
    ctx.beginPath(); ctx.arc(-BW - 10, 30, 5.5, 0, TAU); ctx.fill();

    ctx.strokeStyle = armColor;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(BW + 1, -2);
    ctx.quadraticCurveTo(BW + 22, 12 - walk * 5, BW + 10, 30);
    ctx.stroke();
    ctx.fillStyle = armColor;
    ctx.beginPath(); ctx.arc(BW + 10, 30, 5.5, 0, TAU); ctx.fill();

    // Legs
    var legStartY = BY + 2;
    var legEndY = 84;
    var lEndX = -9 - walk * 7;
    var rEndX = 9 + walk * 7;
    ctx.strokeStyle = '#3b2a1a';
    ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-9, legStartY); ctx.lineTo(lEndX, legEndY);
    ctx.moveTo(9, legStartY); ctx.lineTo(rEndX, legEndY);
    ctx.stroke();
    ctx.fillStyle = '#2a1a08';
    ctx.beginPath();
    ctx.ellipse(lEndX, legEndY + 2, 7.5, 3.4, 0, 0, TAU);
    ctx.ellipse(rEndX, legEndY + 2, 7.5, 3.4, 0, 0, TAU);
    ctx.fill();

    // Label badge
    if (label) {
      ctx.save();
      bodyPath(); ctx.clip();
      var lblY = 35;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(0, lblY, 30, 8.5, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.lineWidth = 2.5;
      ctx.font = 'bold 9.5px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var lbl = label.length > 11 ? label.slice(0, 11) : label;
      ctx.strokeText(lbl, 0, lblY);
      ctx.fillText(lbl, 0, lblY);
      ctx.restore();
    }

    ctx.restore();
  }

  // ============== HERO — Bhar Cha character cup ==============
  function drawChai(ctx, t, w, h) {
    drawCharacterCup(ctx, t, w, h, {
      label: 'Bhar Cha',
      tint: 'rgba(210,105,40,0.55)',
      stripes: true
    });
  }

  // ============== PICKUP — Chai score token (not Bhar Cha hero) ==============
  function drawChaiToken(ctx, t, w, h) {
    var cx = w / 2;
    var cy = h / 2 + Math.sin(t * 2.6) * 2;
    var sc = Math.min(w, h) / 100;
    softShadow(ctx, cx, h - 10, 22 * sc, 0.22);
    ctx.save();
    ctx.translate(cx, cy + 4);
    ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(34,197,94,0.18)';
    ctx.beginPath(); ctx.arc(0, 0, 39, 0, TAU); ctx.fill();
    var cupGrad = ctx.createLinearGradient(-28, -22, 26, 30);
    cupGrad.addColorStop(0, '#fff7ed');
    cupGrad.addColorStop(0.45, '#f9c784');
    cupGrad.addColorStop(1, '#b45309');
    ctx.fillStyle = cupGrad;
    ctx.strokeStyle = 'rgba(90,45,10,0.72)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-28, -22);
    ctx.quadraticCurveTo(-23, 28, 0, 34);
    ctx.quadraticCurveTo(23, 28, 28, -22);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#9a5a18';
    ctx.beginPath(); ctx.ellipse(0, -22, 31, 9, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f7d28a';
    ctx.beginPath(); ctx.ellipse(0, -23, 24, 5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (var steam = 0; steam < 3; steam++) {
      var sx = -12 + steam * 12;
      ctx.beginPath();
      ctx.moveTo(sx, -35);
      ctx.quadraticCurveTo(sx + Math.sin(t * 3 + steam) * 6, -47, sx + 2, -58);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBisheshChai(ctx, t, w, h) {
    var cx = w / 2;
    var cy = h / 2 + Math.sin(t * 2.8) * 2;
    var sc = Math.min(w, h) / 100;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(sc, sc);
    var pulse = 1 + Math.sin(t * 5) * 0.08;
    ctx.scale(pulse, pulse);
    var glow = ctx.createRadialGradient(0, 0, 8, 0, 0, 54);
    glow.addColorStop(0, 'rgba(250,204,21,0.58)');
    glow.addColorStop(0.5, 'rgba(251,146,60,0.28)');
    glow.addColorStop(1, 'rgba(250,204,21,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-58, -58, 116, 116);
    ctx.strokeStyle = 'rgba(250,204,21,0.82)';
    ctx.lineWidth = 3;
    ctx.setLineDash([7, 7]);
    ctx.beginPath(); ctx.arc(0, 2, 43, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    var cupGrad = ctx.createLinearGradient(-28, -24, 28, 32);
    cupGrad.addColorStop(0, '#fff7ad');
    cupGrad.addColorStop(0.48, '#facc15');
    cupGrad.addColorStop(1, '#b45309');
    ctx.fillStyle = cupGrad;
    ctx.strokeStyle = '#854d0e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-28, -22);
    ctx.quadraticCurveTo(-23, 28, 0, 34);
    ctx.quadraticCurveTo(23, 28, 28, -22);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#7c2d12';
    ctx.beginPath(); ctx.ellipse(0, -22, 31, 9, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fde68a';
    ctx.beginPath(); ctx.ellipse(0, -23, 24, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1f1300';
    ctx.font = '900 14px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('x3', 0, 7);
    for (var i = 0; i < 5; i++) {
      var a = t * 1.7 + i * TAU / 5;
      ctx.fillStyle = i % 2 ? '#fef3c7' : '#facc15';
      ctx.beginPath(); ctx.arc(Math.cos(a) * 47, Math.sin(a) * 34, 3.2, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function drawHeartPickup(ctx, t, w, h) {
    var cx = w / 2;
    var cy = h / 2 + Math.sin(t * 2.4) * 2;
    var sc = Math.min(w, h) / 110;
    softShadow(ctx, cx, h - 12, 24 * sc, 0.22);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(sc, sc);
    var glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 54);
    glow.addColorStop(0, 'rgba(244,63,94,0.42)');
    glow.addColorStop(1, 'rgba(244,63,94,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-58, -58, 116, 116);
    ctx.fillStyle = '#f43f5e';
    ctx.strokeStyle = '#9f1239';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 34);
    ctx.bezierCurveTo(-48, 4, -42, -34, -14, -28);
    ctx.bezierCurveTo(-6, -26, -2, -18, 0, -12);
    ctx.bezierCurveTo(2, -18, 6, -26, 14, -28);
    ctx.bezierCurveTo(42, -34, 48, 4, 0, 34);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.beginPath(); ctx.ellipse(-13, -8, 9, 5, -0.65, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ============== ENEMY — Green Chili (curvy chili pepper) ==============
  function drawChili(ctx, t, w, h) {
    var cx = w / 2;
    var sc = Math.min(w, h) / 280;
    var bob = Math.sin(t * 2.2) * 3;

    softShadow(ctx, cx, h - 8, 36 * sc, 0.32);

    ctx.save();
    ctx.translate(cx, h * 0.52 + bob);
    ctx.scale(sc, sc);

    function bodyPath() {
      ctx.beginPath();
      ctx.moveTo(-2, -88);
      ctx.bezierCurveTo(34, -78, 44, -20, 30, 40);
      ctx.bezierCurveTo(22, 72, 14, 92, 6, 102);
      ctx.quadraticCurveTo(-2, 108, -10, 100);
      ctx.bezierCurveTo(-12, 82, -22, 44, -30, -10);
      ctx.bezierCurveTo(-34, -52, -28, -84, -2, -88);
      ctx.closePath();
    }

    var grad = ctx.createLinearGradient(-30, -88, 40, 100);
    grad.addColorStop(0, '#9ce86a');
    grad.addColorStop(0.3, '#5fc340');
    grad.addColorStop(0.7, '#2c8a1c');
    grad.addColorStop(1, '#0f5208');
    ctx.fillStyle = grad;
    bodyPath(); ctx.fill();

    ctx.strokeStyle = 'rgba(8,40,8,0.5)'; ctx.lineWidth = 2.4;
    bodyPath(); ctx.stroke();

    // Highlights
    ctx.save(); bodyPath(); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.beginPath();
    ctx.ellipse(-14, -10, 7, 50, -0.18, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.ellipse(20, 0, 4, 30, 0.15, 0, TAU);
    ctx.fill();
    ctx.restore();

    // Wrinkle
    ctx.save(); bodyPath(); ctx.clip();
    ctx.strokeStyle = 'rgba(8,40,8,0.18)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(8, -70); ctx.bezierCurveTo(18, -20, 12, 40, 0, 90);
    ctx.stroke();
    ctx.restore();

    // Stem cap
    ctx.fillStyle = '#3e8a26';
    ctx.beginPath();
    ctx.ellipse(-2, -88, 16, 9, -0.05, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(10,50,10,0.5)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(-2, -88, 16, 9, -0.05, 0, TAU);
    ctx.stroke();
    // Stalk
    ctx.strokeStyle = '#2e6a18'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-2, -90);
    ctx.quadraticCurveTo(8, -108, 4, -126);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(160,230,120,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -94); ctx.quadraticCurveTo(8, -110, 5, -124);
    ctx.stroke();

    // Face
    var fy = -32;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(-9, fy, 9, 8, 0.08, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(9, fy, 9, 8, -0.08, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#080808';
    ctx.beginPath(); ctx.arc(-9, fy + 1, 4.5, 0, TAU); ctx.arc(9, fy + 1, 4.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-11, fy - 1, 1.6, 0, TAU); ctx.arc(7, fy - 1, 1.6, 0, TAU); ctx.fill();

    // Brows
    ctx.strokeStyle = '#0a1a04'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-22, fy - 18); ctx.lineTo(-2, fy - 8);
    ctx.moveTo(22, fy - 18); ctx.lineTo(2, fy - 8);
    ctx.stroke();

    // Frown
    ctx.strokeStyle = '#0a1a04'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-9, fy + 22); ctx.quadraticCurveTo(0, fy + 14, 9, fy + 22);
    ctx.stroke();

    // Akimbo arms
    var armSway = Math.sin(t * 2.2) * 0.12;
    ctx.strokeStyle = '#2c8a1c'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.save(); ctx.translate(-26, 8); ctx.rotate(0.3 + armSway);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-12, 8, -8, 22); ctx.stroke();
    ctx.fillStyle = '#2c8a1c'; ctx.beginPath(); ctx.arc(-8, 22, 5, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.translate(26, 8); ctx.rotate(-0.3 - armSway);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(12, 8, 8, 22); ctx.stroke();
    ctx.fillStyle = '#2c8a1c'; ctx.beginPath(); ctx.arc(8, 22, 5, 0, TAU); ctx.fill();
    ctx.restore();

    // Legs + feet
    var legBob = Math.sin(t * 2.2) * 2;
    ctx.strokeStyle = '#1c6e14'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, 100); ctx.lineTo(-12, 124 + legBob);
    ctx.moveTo(8, 100); ctx.lineTo(12, 124 - legBob);
    ctx.stroke();
    ctx.fillStyle = '#1c6e14';
    ctx.beginPath();
    ctx.ellipse(-12, 126 + legBob, 7, 4, 0, 0, TAU);
    ctx.ellipse(12, 126 - legBob, 7, 4, 0, 0, TAU);
    ctx.fill();

    ctx.restore();
  }

  // ============== ENEMY — Housefly ==============
  function drawFly(ctx, t, w, h) {
    var cx = w / 2 + Math.sin(t * 2) * 6;
    var cy = h / 2 + Math.cos(t * 3) * 4;
    var s = Math.min(w, h) * 0.18;
    softShadow(ctx, w / 2, h - 14, 18, 0.22);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(t * 1.5) * 0.2);

    var flap = Math.abs(Math.sin(t * 30));
    ctx.fillStyle = 'rgba(220,230,255,' + (0.45 + flap * 0.3) + ')';
    ctx.strokeStyle = 'rgba(80,80,120,0.6)';
    ctx.lineWidth = 0.8;
    for (var di = 0; di < 2; di++) {
      var dir = di === 0 ? -1 : 1;
      ctx.beginPath();
      ctx.ellipse(dir * s * 0.5, -s * 0.2, s * (0.7 + flap * 0.15), s * 0.4, dir * 0.5, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = radialShade(ctx, 0, 0, s, '#5a5240', '#1a1810');
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.55, s * 0.85, 0, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1.2;
    for (var i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-s * 0.4, -s * 0.3 + i * s * 0.25);
      ctx.lineTo(s * 0.4, -s * 0.3 + i * s * 0.25);
      ctx.stroke();
    }

    ctx.fillStyle = '#2a2618';
    ctx.beginPath();
    ctx.arc(0, -s * 0.85, s * 0.4, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#c92020';
    ctx.beginPath();
    ctx.arc(-s * 0.18, -s * 0.85, s * 0.22, 0, TAU);
    ctx.arc(s * 0.18, -s * 0.85, s * 0.22, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,200,200,0.7)';
    ctx.beginPath();
    ctx.arc(-s * 0.22, -s * 0.92, s * 0.06, 0, TAU);
    ctx.arc(s * 0.14, -s * 0.92, s * 0.06, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = 'rgba(20,15,5,0.85)';
    ctx.lineWidth = 1.2;
    for (var li = 0; li < 3; li++) {
      for (var dj = 0; dj < 2; dj++) {
        var dr = dj === 0 ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.1 + li * s * 0.3);
        ctx.quadraticCurveTo(dr * s * 0.6, li * s * 0.4, dr * s * 0.8, s * 0.6 + li * s * 0.2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // ============== ENEMY — Potty ==============
  function drawPotty(ctx, t, w, h) {
    var cx = w / 2;
    var cy = h / 2 + Math.sin(t * 2) * 2;
    var s = Math.min(w, h) * 0.35;
    softShadow(ctx, cx, h - 14, s * 1.1, 0.35);

    ctx.save();
    ctx.translate(cx, cy + 6);

    var grad = ctx.createLinearGradient(0, -s, 0, s);
    grad.addColorStop(0, '#a06028');
    grad.addColorStop(0.5, '#6b3e15');
    grad.addColorStop(1, '#3a210a');

    var tiers = [
      { y: s * 0.55, w: s * 0.95, h: s * 0.4 },
      { y: s * 0.0, w: s * 0.7, h: s * 0.35 },
      { y: -s * 0.4, w: s * 0.45, h: s * 0.28 }
    ];
    ctx.fillStyle = grad;
    for (var i = 0; i < tiers.length; i++) {
      var tr = tiers[i];
      ctx.beginPath();
      ctx.ellipse(0, tr.y, tr.w, tr.h, 0, 0, TAU);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(255,200,140,0.25)';
    for (var i2 = 0; i2 < tiers.length; i2++) {
      var tr2 = tiers[i2];
      ctx.beginPath();
      ctx.ellipse(-tr2.w * 0.3, tr2.y - tr2.h * 0.4, tr2.w * 0.4, tr2.h * 0.18, -0.4, 0, TAU);
      ctx.fill();
    }

    ctx.fillStyle = '#3a210a';
    ctx.beginPath();
    ctx.arc(0, -s * 0.55, s * 0.07, 0, TAU);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(-s * 0.18, s * 0.0, s * 0.1, 0, TAU);
    ctx.arc(s * 0.18, s * 0.0, s * 0.1, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'black';
    var blink = Math.sin(t * 0.5) > 0.95 ? 0.02 : 0.05;
    ctx.beginPath();
    ctx.arc(-s * 0.18, s * 0.0, s * blink, 0, TAU);
    ctx.arc(s * 0.18, s * 0.0, s * blink, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, s * 0.12, s * 0.12, 0.2, Math.PI - 0.2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(140,200,80,' + (0.4 + Math.sin(t * 4) * 0.2) + ')';
    ctx.lineWidth = 1.5;
    for (var k = 0; k < 2; k++) {
      var sx = -10 + k * 20;
      ctx.beginPath();
      ctx.moveTo(sx, -s * 0.85 - k * 4);
      ctx.quadraticCurveTo(sx + 4, -s * 0.95 - k * 4, sx, -s - 6 - k * 4);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ============== REWARD — Singara bonus pickup ==============
  function drawSingara(ctx, t, w, h) {
    var cx = w / 2;
    var sc = Math.min(w, h) / 180;
    var bob = Math.sin(t * 2.4) * 2;
    softShadow(ctx, cx, h - 12, 28 * sc, 0.28);
    ctx.save();
    ctx.translate(cx, h * 0.55 + bob);
    ctx.scale(sc, sc);

    var grad = ctx.createLinearGradient(-45, -50, 42, 48);
    grad.addColorStop(0, '#ffe08a');
    grad.addColorStop(0.45, '#f59e0b');
    grad.addColorStop(1, '#a14707');
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, -64);
    ctx.quadraticCurveTo(48, -14, 36, 52);
    ctx.quadraticCurveTo(0, 70, -38, 52);
    ctx.quadraticCurveTo(-48, -14, 0, -64);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,244,180,0.42)';
    ctx.lineWidth = 3;
    for (var i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 12, -42);
      ctx.quadraticCurveTo(i * 6, 8, i * 18, 46);
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = '#17120a';
    ctx.beginPath(); ctx.arc(-12, -8, 5, 0, TAU); ctx.arc(12, -8, 5, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#17120a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-14, 18); ctx.quadraticCurveTo(0, 29, 14, 18); ctx.stroke();
    ctx.restore();
  }

  // ============== REWARD — Marie Biscuit bonus pickup ==============
  function drawBiscuit(ctx, t, w, h) {
    var cx = w / 2;
    var sc = Math.min(w, h) / 120;
    var bob = Math.sin(t * 2.1) * 1.5;
    softShadow(ctx, cx, h - 12, 23 * sc, 0.24);
    ctx.save();
    ctx.translate(cx, h * 0.55 + bob);
    ctx.scale(sc, sc);
    var grad = ctx.createRadialGradient(-12, -16, 8, 0, 0, 48);
    grad.addColorStop(0, '#ffe6a8');
    grad.addColorStop(0.55, '#d99a3a');
    grad.addColorStop(1, '#9a5a18');
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#6f3f12';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, 0, 46, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(111,63,18,0.38)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 32, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(255,245,210,0.65)';
    for (var i = 0; i < 12; i++) {
      var a = i * TAU / 12;
      ctx.beginPath(); ctx.arc(Math.cos(a) * 22, Math.sin(a) * 22, 2.4, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#4a280b';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BB', 0, 3);
    ctx.restore();
  }

  // ============== PICKUP — Bread Slice / Slice bonus ==============
  function drawBreadSlice(ctx, t, w, h) {
    var cx = w / 2;
    var sc = Math.min(w, h) / 150;
    var bob = Math.sin(t * 2.2) * 2;
    softShadow(ctx, cx, h - 12, 25 * sc, 0.22);
    ctx.save();
    ctx.translate(cx, h * 0.55 + bob);
    ctx.scale(sc, sc);
    var crust = ctx.createLinearGradient(-42, -54, 44, 54);
    crust.addColorStop(0, '#b45309');
    crust.addColorStop(1, '#78350f');
    ctx.fillStyle = crust;
    ctx.strokeStyle = '#5b2b08';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-45, 48);
    ctx.lineTo(-45, -12);
    ctx.bezierCurveTo(-45, -58, 45, -58, 45, -12);
    ctx.lineTo(45, 48);
    ctx.quadraticCurveTo(0, 62, -45, 48);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    var bread = ctx.createLinearGradient(-28, -38, 28, 48);
    bread.addColorStop(0, '#fff1c2');
    bread.addColorStop(1, '#f6c96b');
    ctx.fillStyle = bread;
    ctx.beginPath();
    ctx.moveTo(-31, 38);
    ctx.lineTo(-31, -9);
    ctx.bezierCurveTo(-31, -42, 31, -42, 31, -9);
    ctx.lineTo(31, 38);
    ctx.quadraticCurveTo(0, 48, -31, 38);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.ellipse(-13, -8, 8, 22, -0.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#4a280b';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+50', 0, 12);
    ctx.restore();
  }

  // ============== PICKUP — Jhal Chanachur ==============
  function drawChanachur(ctx, t, w, h) {
    var cx = w / 2;
    var cy = h / 2 + Math.sin(t * 3) * 2;
    var sc = Math.min(w, h) / 120;
    softShadow(ctx, cx, h - 10, 23 * sc, 0.22);
    ctx.save();
    ctx.translate(cx, cy + 8);
    ctx.scale(sc, sc);
    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 16, 42, 18, 0, 0, TAU);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.ellipse(0, 5, 38, 15, 0, 0, TAU);
    ctx.fill();
    var bits = ['#fde68a', '#facc15', '#fb923c', '#dc2626'];
    for (var i = 0; i < 28; i++) {
      var a = i * 2.39996;
      var r = 4 + (i % 7) * 5;
      ctx.fillStyle = bits[i % bits.length];
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r, 2 + Math.sin(a) * r * 0.35, 2 + (i % 3) * 0.5, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#fff7ed';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('×2', 0, -26);
    ctx.restore();
  }

  // ============== ENEMY VARIANT — Ghost Chili (Raat flicker) ==============
  function drawChiliGhost(ctx, t, w, h) {
    ctx.save();
    ctx.globalAlpha = 0.58 + Math.sin(t * 6) * 0.18;
    drawChili(ctx, t, w, h);
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(190,230,255,0.28)';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // ============== ENEMY VARIANT — Dark Potty (Raat audio-cued trap) ==============
  function drawPottyDark(ctx, t, w, h) {
    ctx.save();
    drawPotty(ctx, t, w, h);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(5,8,18,0.72)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(70,120,255,' + (0.08 + Math.sin(t * 5) * 0.035) + ')';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // ============== ENEMY — Mahakash cosmic rock ==============
  function drawCosmicRock(ctx, t, w, h) {
    var cx = w / 2;
    var cy = h / 2 + Math.sin(t * 1.8) * 3;
    var sc = Math.min(w, h) / 150;
    softShadow(ctx, cx, h - 12, 30 * sc, 0.18);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.6);
    ctx.scale(sc, sc);
    var grad = ctx.createRadialGradient(-18, -20, 8, 0, 0, 58);
    grad.addColorStop(0, '#e0f2fe');
    grad.addColorStop(0.34, '#818cf8');
    grad.addColorStop(1, '#312e81');
    ctx.fillStyle = grad;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-48, -12);
    ctx.lineTo(-22, -50);
    ctx.lineTo(28, -42);
    ctx.lineTo(52, -4);
    ctx.lineTo(34, 44);
    ctx.lineTo(-16, 52);
    ctx.lineTo(-52, 24);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath(); ctx.arc(-12, -16, 8, 0, TAU); ctx.arc(20, 16, 5, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(125,211,252,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-30, 12); ctx.lineTo(8, 2); ctx.lineTo(35, 24); ctx.stroke();
    ctx.restore();
  }

  function drawGhostBossBase(ctx, t, w, h, opts) {
    opts = opts || {};
    var cx = w / 2;
    var cy = h / 2 + Math.sin(t * 2) * 6;
    var sc = Math.min(w, h) / 190;
    ctx.save();
    ctx.globalAlpha = opts.alpha || 0.9;
    ctx.translate(cx, cy);
    ctx.scale(sc, sc);
    var grad = ctx.createRadialGradient(-22, -46, 10, 0, -10, 86);
    grad.addColorStop(0, opts.top || '#ffffff');
    grad.addColorStop(0.48, opts.mid || '#bae6fd');
    grad.addColorStop(1, opts.bot || '#4f46e5');
    ctx.fillStyle = grad;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-54, 70);
    ctx.lineTo(-54, -18);
    ctx.bezierCurveTo(-54, -82, 54, -82, 54, -18);
    ctx.lineTo(54, 70);
    ctx.quadraticCurveTo(35, 54, 18, 70);
    ctx.quadraticCurveTo(0, 54, -18, 70);
    ctx.quadraticCurveTo(-35, 54, -54, 70);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = opts.eye || '#111827';
    ctx.beginPath(); ctx.ellipse(-18, -20, 9, 15, 0, 0, TAU); ctx.ellipse(18, -20, 9, 15, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = opts.mouth || '#111827';
    ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-18, 18); ctx.quadraticCurveTo(0, 31, 18, 18); ctx.stroke();
    ctx.restore();
  }

  function drawBhootMama(ctx, t, w, h) {
    drawGhostBossBase(ctx, t, w, h, { alpha: 0.82, top: '#ffffff', mid: '#bfdbfe', bot: '#60a5fa' });
  }

  function drawBazarRaja(ctx, t, w, h) {
    ctx.save();
    drawSingara(ctx, t, w, h);
    ctx.translate(w / 2, h * 0.18);
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.02);
    ctx.beginPath();
    ctx.moveTo(-34, 18); ctx.lineTo(-18, -10); ctx.lineTo(0, 16); ctx.lineTo(18, -10); ctx.lineTo(34, 18); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function drawBhootJolokia(ctx, t, w, h) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    drawChiliGhost(ctx, t, w, h);
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(255,60,60,' + (0.16 + Math.sin(t * 6) * 0.04) + ')';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  function drawMashalaDeb(ctx, t, w, h) {
    ctx.save();
    drawGhostBossBase(ctx, t, w, h, { alpha: 0.92, top: '#fff7ed', mid: '#fb923c', bot: '#7f1d1d', eye: '#fff7ed', mouth: '#fff7ed' });
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(250,204,21,' + (0.16 + Math.sin(t * 7) * 0.05) + ')';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  window.BBModels = {
    TAU: TAU,
    softShadow: softShadow,
    drawCharacterCup: drawCharacterCup,
    drawChai: drawChai,
    drawChaiToken: drawChaiToken,
    drawBisheshChai: drawBisheshChai,
    drawHeartPickup: drawHeartPickup,
    drawChili: drawChili,
    drawFly: drawFly,
    drawPotty: drawPotty,
    drawSingara: drawSingara,
    drawBiscuit: drawBiscuit,
    drawBreadSlice: drawBreadSlice,
    drawChanachur: drawChanachur,
    drawChiliGhost: drawChiliGhost,
    drawPottyDark: drawPottyDark,
    drawCosmicRock: drawCosmicRock,
    drawBhootMama: drawBhootMama,
    drawBazarRaja: drawBazarRaja,
    drawBhootJolokia: drawBhootJolokia,
    drawMashalaDeb: drawMashalaDeb
  };
})();

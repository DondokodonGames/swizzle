// 543-eclipse-align.js
// エクリプスアライン — 地球と月の公転速度をタップで切り替え、太陽と一直線に並べて日食を起こす
// 操作: 地球をタップで地球の速度切替、月をタップで月の速度切替（3天体が整列すると成功）
// 成功: 整列 3回  失敗: 25秒経過

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、天文台） ──
  var C = { bg:'#000008', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ECLIPSE ALIGN';
  var HOW_TO_PLAY = 'TAP EARTH / MOON TO CHANGE THEIR ORBIT SPEED · LINE THEM UP';
  var MAX_TIME = 25;
  var NEEDED   = 3;          // 修正2: 8 → 3
  var CX = W / 2, CY = snap(H * 0.46), SUN_R = 130, EARTH_R = 50, MOON_R = 28, EARTH_ORBIT = 330, MOON_ORBIT = 150;
  var EARTH_SPEEDS = [0.3, 0.5, 0.8, 1.2], MOON_SPEEDS = [1.0, 1.8, 2.8, 4.0];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var earthAngle, moonAngle, earthIdx, moonIdx, alignCount, timeLeft, done, alignAnim, alignCd, particles, stars;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.c : '#0a0a1a');
  }

  function earthPos() { return { x: CX + Math.cos(earthAngle) * EARTH_ORBIT, y: CY + Math.sin(earthAngle) * EARTH_ORBIT }; }
  function moonPos() { var ep = earthPos(); return { x: ep.x + Math.cos(moonAngle) * MOON_ORBIT, y: ep.y + Math.sin(moonAngle) * MOON_ORBIT }; }

  function checkAlign() {
    if (alignCd > 0) return false;
    var ep = earthPos(), mp = moonPos(), sex = ep.x - CX, sey = ep.y - CY, smx = mp.x - CX, smy = mp.y - CY;
    var lSE = Math.hypot(sex, sey), lSM = Math.hypot(smx, smy); if (lSE === 0 || lSM === 0) return false;
    var dot = (sex * smx + sey * smy) / (lSE * lSM), cross = Math.abs(sex * smy - sey * smx) / (lSE * lSM);
    return dot > 0.97 && cross < 0.12;
  }

  function background() {
    game.draw.clear(C.bg);
    for (var s = 0; s < stars.length; s++) { var st = stars[s]; game.draw.rect(snap(st.x), snap(st.y), st.r, st.r, C.g, 0.4 + Math.sin(game.time.elapsed * 1.5 + st.tw) * 0.3); }
  }

  function initGame() { earthAngle = Math.random() * Math.PI * 2; moonAngle = Math.random() * Math.PI * 2; earthIdx = 1; moonIdx = 1; alignCount = 0; timeLeft = MAX_TIME; done = false; alignAnim = 0; alignCd = 0; particles = []; stars = []; for (var s = 0; s < 80; s++) stars.push({ x: Math.random() * W, y: Math.random() * H, r: 8, tw: Math.random() * Math.PI * 2 }); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (alignCount * 1000 + Math.ceil(timeLeft) * 100) : alignCount * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var oi = 0; oi < 60; oi++) { var oa = oi / 60 * Math.PI * 2; game.draw.rect(snap(CX + Math.cos(oa) * EARTH_ORBIT), snap(CY + Math.sin(oa) * EARTH_ORBIT), 4, 4, C.d, 0.25); }
    var ep = earthPos(), mp = moonPos();
    for (var oi2 = 0; oi2 < 40; oi2++) { var oa2 = oi2 / 40 * Math.PI * 2; game.draw.rect(snap(ep.x + Math.cos(oa2) * MOON_ORBIT), snap(ep.y + Math.sin(oa2) * MOON_ORBIT), 3, 3, C.e, 0.2); }
    pc(CX, CY, SUN_R + 30, C.f, 0.08); pc(CX, CY, SUN_R, C.c, 0.95); pc(CX - 30, CY - 30, SUN_R * 0.25, C.g, 0.3);
    if (alignAnim > 0) pc(CX, CY, SUN_R + 80 * alignAnim, C.f, alignAnim * 0.4);
    pc(ep.x, ep.y, EARTH_R + 8, C.d, 0.15); pc(ep.x, ep.y, EARTH_R, C.d, 0.95); pc(ep.x - 12, ep.y - 12, EARTH_R * 0.35, C.e, 0.5);
    txt('v' + EARTH_SPEEDS[earthIdx].toFixed(1), ep.x, ep.y + EARTH_R + 36, 26, C.e);
    pc(mp.x, mp.y, MOON_R + 4, C.g, 0.15); pc(mp.x, mp.y, MOON_R, '#aabbcc', 0.9); pc(mp.x - 6, mp.y - 6, MOON_R * 0.4, C.g, 0.4);
    txt('v' + MOON_SPEEDS[moonIdx].toFixed(1), mp.x, mp.y - MOON_R - 26, 24, C.g);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var ep = earthPos(); if (Math.hypot(tx - ep.x, ty - ep.y) < EARTH_R + 60) { earthIdx = (earthIdx + 1) % EARTH_SPEEDS.length; game.audio.play('se_tap', 0.3); return; }
    var mp = moonPos(); if (Math.hypot(tx - mp.x, ty - mp.y) < MOON_R + 60) { moonIdx = (moonIdx + 1) % MOON_SPEEDS.length; game.audio.play('se_tap', 0.2); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stars) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.14, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'TOTAL ECLIPSE!' : 'MISALIGNED', W / 2, H * 0.35, 60, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      earthAngle += EARTH_SPEEDS[earthIdx] * dt; moonAngle += MOON_SPEEDS[moonIdx] * dt;
      if (alignCd > 0) alignCd -= dt; if (alignAnim > 0) alignAnim -= dt * 2;
      if (checkAlign()) {
        alignCount++; alignAnim = 1.0; alignCd = 1.5; game.audio.play('se_success', 0.8);
        var mp = moonPos(); for (var pi = 0; pi < 16; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: mp.x, y: mp.y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, life: 0.6, col: C.f }); }
        if (alignCount >= NEEDED) { finish(true); return; }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 1.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 8, snap(particles[pp2].y) - 8, 16, 16, particles[pp2].col, particles[pp2].life);
    if (alignAnim > 0) { game.draw.rect(0, 0, W, H, C.g, alignAnim * 0.08); txt('ECLIPSE!', W / 2, CY + EARTH_ORBIT + 120, 60, C.c); }

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(alignCount + ' / ' + NEEDED, W / 2, 168, 48, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);

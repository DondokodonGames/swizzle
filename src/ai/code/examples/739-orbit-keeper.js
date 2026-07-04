// 739-orbit-keeper.js
// オービットキーパー — 衰えていく衛星軌道をタップで押し上げ、安全帯を保ち続ける
// 操作: 軌道は自然に落ちていく。タップでブーストして高度を上げる。落ちすぎるとクラッシュ
// 成功: 18秒 軌道維持  失敗: 3回 クラッシュ

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、軌道） ──
  var C = { bg:'#010510', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var PLANET = '#3355ff', PLANET_HI = '#93c5fd', SAT = '#ff6600', SAT_HI = '#ffffff';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ORBIT KEEPER';
  var HOW_TO_PLAY = 'THE ORBIT DECAYS · TAP TO BOOST · KEEP THE SATELLITE IN THE GREEN BAND';
  var MAX_TIME = 18;
  var TARGET_TIME = 18;      // 修正2: 90 → 18
  var MAX_CRASH = 3;
  var CX = W / 2, CY = snap(H * 0.45), PLANET_R = 70, MIN_R = 160, MAX_R = 370, SAFE_LO = 205, SAFE_HI = 305, ORBIT_SPEED = 1.8, BOOST = 65;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var orbitR, orbitAngle, decayRate, thrustParts, survived, crashes, done, elapsed, flash, flashCol, resultText, resultTimer, bgStars;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil((TARGET_TIME - survived) / TARGET_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#020816');
  }

  function background() { game.draw.clear(C.bg); for (var bsi2 = 0; bsi2 < bgStars.length; bsi2++) game.draw.rect(snap(bgStars[bsi2].x), snap(bgStars[bsi2].y), bgStars[bsi2].r, bgStars[bsi2].r, C.c, 0.3); }

  function initGame() { orbitR = 255; orbitAngle = 0; decayRate = 22; thrustParts = []; survived = 0; crashes = 0; done = false; elapsed = 0; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; bgStars = []; for (var bsi = 0; bsi < 50; bsi++) bgStars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() < 0.7 ? 8 : 16 }); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.ceil(survived) * 200 + (MAX_CRASH - crashes) * 2000) : Math.floor(survived) * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var satX = CX + Math.cos(orbitAngle) * orbitR, satY = CY + Math.sin(orbitAngle) * orbitR, inSafe = orbitR >= SAFE_LO && orbitR <= SAFE_HI;
    for (var ri = 0; ri < 24; ri++) { var ra = ri * Math.PI * 2 / 24; pc(CX + Math.cos(ra) * MIN_R, CY + Math.sin(ra) * MIN_R, 3, C.a, 0.5); pc(CX + Math.cos(ra) * MAX_R, CY + Math.sin(ra) * MAX_R, 3, C.f, 0.4); }
    for (var ri2 = 0; ri2 < 36; ri2++) { var ra2 = ri2 * Math.PI * 2 / 36; pc(CX + Math.cos(ra2) * SAFE_LO, CY + Math.sin(ra2) * SAFE_LO, 3, C.b, 0.28); pc(CX + Math.cos(ra2) * SAFE_HI, CY + Math.sin(ra2) * SAFE_HI, 3, C.b, 0.28); }
    var orbitCol = inSafe ? C.b : C.a;
    for (var ri3 = 0; ri3 < 48; ri3++) { var ra3 = ri3 * Math.PI * 2 / 48; pc(CX + Math.cos(ra3) * orbitR, CY + Math.sin(ra3) * orbitR, 2, orbitCol, 0.55); }
    pc(CX, CY, PLANET_R, PLANET, 0.9); pc(CX - PLANET_R * 0.3, CY - PLANET_R * 0.3, PLANET_R * 0.25, PLANET_HI, 0.3);
    for (var tp2 = 0; tp2 < thrustParts.length; tp2++) { var tp3 = thrustParts[tp2]; pc(tp3.x, tp3.y, 7 * tp3.life, SAT_HI, tp3.life * 0.8); }
    pc(satX, satY, 20, SAT, 0.9); pc(satX - 6, satY - 6, 6, SAT_HI, 0.5);
    var rFrac = Math.max(0, Math.min(1, (orbitR - MIN_R) / (MAX_R - MIN_R))), safeFrac0 = (SAFE_LO - MIN_R) / (MAX_R - MIN_R), safeFrac1 = (SAFE_HI - MIN_R) / (MAX_R - MIN_R);
    var barX = W / 2 - 220, barY = snap(H * 0.78), barW = 440, barH = 22;
    game.draw.rect(barX, barY, barW, barH, '#1a1a2a', 0.9);
    game.draw.rect(barX + safeFrac0 * barW, barY, (safeFrac1 - safeFrac0) * barW, barH, C.b, 0.3);
    game.draw.rect(barX, barY, rFrac * barW, barH, orbitCol, 0.85);
    txt('ALTITUDE', W / 2, barY - 24, 28, '#ffffff77');
    if (orbitR < SAFE_LO + 28) txt('BOOST NOW!', W / 2, snap(H * 0.87), 48, C.a);
    else if (!inSafe) txt('TOO HIGH - WAIT', W / 2, snap(H * 0.87), 42, C.f);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    orbitR = Math.min(orbitR + BOOST, MAX_R); game.audio.play('se_tap', 0.08);
    var satX = CX + Math.cos(orbitAngle) * orbitR, satY = CY + Math.sin(orbitAngle) * orbitR;
    for (var p = 0; p < 4; p++) { var pa = orbitAngle + Math.PI + (Math.random() - 0.5) * 0.9; thrustParts.push({ x: satX, y: satY, vx: Math.cos(pa) * 130, vy: Math.sin(pa) * 130, life: 0.4 }); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (orbitR === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.93, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'STABLE ORBIT!' : 'DEORBITED', W / 2, H * 0.35, 58, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      elapsed += dt; survived += dt;
      decayRate = Math.min(48, 22 + Math.floor(survived / 4) * 5); orbitR -= decayRate * dt;
      if (survived >= TARGET_TIME) { finish(true); return; }
      if (orbitR <= MIN_R) {
        crashes++; flash = 0.5; flashCol = C.a; resultText = 'NEAR CRASH!'; resultTimer = 0.7; game.audio.play('se_failure', 0.5);
        if (crashes >= MAX_CRASH) { finish(false); return; }
        orbitR = SAFE_LO + 30;
      }
      orbitAngle += ORBIT_SPEED * dt;
      for (var tp = thrustParts.length - 1; tp >= 0; tp--) { thrustParts[tp].x += thrustParts[tp].vx * dt; thrustParts[tp].y += thrustParts[tp].vy * dt; thrustParts[tp].life -= dt * 2.5; if (thrustParts[tp].life <= 0) thrustParts.splice(tp, 1); }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
    }

    // ---- 描画 ----
    background(); drawScene();
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.93), 44, flashCol);

    timeBar();
    txt(Math.ceil(TARGET_TIME - survived) + '', W / 2, 96, 44, C.g);
    txt(Math.floor(survived) + ' / ' + TARGET_TIME + 's', W / 2, 168, 48, C.b);
    for (var ci = 0; ci < MAX_CRASH; ci++) game.draw.rect(snap(W / 2 + (ci - (MAX_CRASH - 1) / 2) * 56) - 10, 224, 20, 20, ci < crashes ? C.a : '#020816');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.03);
    state = S.ATTRACT;
    initGame();
  });
})(game);

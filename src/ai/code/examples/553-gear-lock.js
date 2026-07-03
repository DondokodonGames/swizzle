// 553-gear-lock.js
// ギアロック — 回り続けるギアをタップで停止し、全ギアの歯を噛み合わせた状態でロックを解く
// 操作: 各ギアをタップして停止（もう一度で解除）。全ギア停止＆噛み合いが揃えばロック解除
// 成功: ロック解除 3回  失敗: 20秒経過

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、機械式錠） ──
  var C = { bg:'#0c0c14', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var CX = W / 2, CY = snap(H * 0.44);
  var POS = [
    { x: CX, y: CY - 230, r: 130, teeth: 12, speed: 0.8 },
    { x: CX - 250, y: CY, r: 100, teeth: 8, speed: -1.1 },
    { x: CX + 250, y: CY, r: 100, teeth: 8, speed: 1.1 },
    { x: CX, y: CY + 230, r: 130, teeth: 12, speed: -0.8 }
  ];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'GEAR LOCK';
  var HOW_TO_PLAY = 'TAP GEARS TO FREEZE THEM · MESH ALL FOUR TO RELEASE THE LOCK';
  var MAX_TIME = 20;
  var NEEDED   = 3;          // 修正2: 10 → 3

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var gears, locked, timeLeft, done, particles, flash, lockedAnim, badAnim;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#1c1c28');
  }

  function background() {
    game.draw.clear(C.bg);
    var pairs = [[0, 1], [0, 2], [1, 3], [2, 3]];
    for (var p = 0; p < pairs.length; p++) { var a = gears[pairs[p][0]], b = gears[pairs[p][1]]; game.draw.line(a.x, a.y, b.x, b.y, C.d, 3); }
  }

  function drawGear(g, color, alpha) {
    pc(g.x, g.y, g.r - 12, color, alpha * 0.9);
    for (var ti = 0; ti < g.teeth; ti++) { var ang = g.angle + ti / g.teeth * Math.PI * 2; pc(g.x + Math.cos(ang) * (g.r - 4), g.y + Math.sin(ang) * (g.r - 4), 18, color, alpha * 0.9); }
    pc(g.x, g.y, 26, C.c, alpha * 0.9); pc(g.x, g.y, 14, C.g, alpha * 0.5);
  }

  function checkMesh() {
    var pairs = [[0, 1], [0, 2], [1, 3], [2, 3]];
    for (var pi = 0; pi < pairs.length; pi++) {
      var a = gears[pairs[pi][0]], b = gears[pairs[pi][1]], cang = Math.atan2(b.y - a.y, b.x - a.x);
      var phase = ((a.angle - cang) % (Math.PI * 2 / a.teeth) + Math.PI * 2 / a.teeth) % (Math.PI * 2 / a.teeth), half = Math.PI / a.teeth;
      if (phase > half * 0.3 && phase < half * 1.7) return false;
    }
    return true;
  }

  function initGears() { gears = POS.map(function(g) { return { x: g.x, y: g.y, r: g.r, teeth: g.teeth, speed: g.speed * (1 + locked * 0.05), angle: Math.random() * Math.PI * 2, frozen: false, frozenTime: 0 }; }); }

  function initGame() { locked = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; lockedAnim = 0; badAnim = 0; initGears(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (locked * 1200 + Math.ceil(timeLeft) * 100) : locked * 400;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var i = 0; i < gears.length; i++) {
      var g = gears[i], col = g.frozen ? (lockedAnim > 0 ? C.b : C.e) : '#445566';
      if (g.frozen) pc(g.x, g.y, g.r + 14, col, 0.1 + Math.sin(game.time.elapsed * 4) * 0.05);
      drawGear(g, col, 0.9);
      if (g.frozen) {
        game.draw.rect(g.x - 14, g.y - 14, 28, 28, C.b, 0.9);
        var frac = 1 - g.frozenTime / 2.0;
        for (var ri = 0; ri < 8; ri++) { if (ri / 8 > frac) continue; var rang = ri / 8 * Math.PI * 2 - Math.PI / 2; pc(g.x + Math.cos(rang) * (g.r + 18), g.y + Math.sin(rang) * (g.r + 18), 6, C.b, 0.7); }
      }
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = 0; i < gears.length; i++) {
      var g = gears[i];
      if (Math.hypot(tx - g.x, ty - g.y) < g.r + 20) {
        if (!g.frozen) {
          g.frozen = true; g.frozenTime = 0; game.audio.play('se_tap', 0.4);
          if (gears.every(function(gg) { return gg.frozen; })) {
            if (checkMesh()) {
              locked++; lockedAnim = 0.8; flash = 0.4; game.audio.play('se_success', 0.9);
              for (var pi = 0; pi < 16; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: CX, y: CY, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, life: 0.6, col: C.b }); }
              if (locked >= NEEDED) { finish(true); return; }
              setTimeout(function() { if (!done) initGears(); }, 800);
            } else { gears.forEach(function(gg) { gg.frozen = false; }); game.audio.play('se_failure', 0.4); badAnim = 0.3; }
          }
        } else { g.frozen = false; game.audio.play('se_tap', 0.2); }
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!gears) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.08, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.115, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'UNLOCKED!' : 'JAMMED', W / 2, H * 0.35, 72, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (lockedAnim > 0) lockedAnim -= dt * 2; if (badAnim > 0) badAnim -= dt * 3;
      for (var i = 0; i < gears.length; i++) { var g = gears[i]; if (!g.frozen) { g.angle += g.speed * dt; g.frozenTime = 0; } else { g.frozenTime += dt; if (g.frozenTime > 2.0) g.frozen = false; } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 7, snap(particles[pp2].y) - 7, 14, 14, particles[pp2].col, particles[pp2].life * 1.5);
    if (lockedAnim > 0) { game.draw.rect(0, 0, W, H, C.b, lockedAnim * 0.1); txt('LOCKED!', W / 2, CY + 340, 72, C.b); }
    if (badAnim > 0) game.draw.rect(0, 0, W, H, C.a, badAnim * 0.1);
    if (flash > 0 && lockedAnim <= 0) game.draw.rect(0, 0, W, H, C.b, flash * 0.06);

    txt('TAP TO FREEZE / RELEASE', W / 2, snap(H * 0.80), 34, C.e);
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(locked + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);

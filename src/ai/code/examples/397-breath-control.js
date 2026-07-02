// 397-breath-control.js
// 呼吸制御 — ゆっくり膨らんで縮む円が、満ちきった瞬間（緑リング点灯）にタップして深呼吸を合わせる
// 操作: 円が最大（緑リング）になった瞬間にタップ。小さいときに押すと失敗
// 成功: 4回 合わせる  失敗: 3回 外す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、瞑想） ──
  var C = { bg:'#02101e', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BREATH CONTROL';
  var HOW_TO_PLAY = 'TAP WHEN THE CIRCLE IS FULL (GREEN RING) · MATCH YOUR BREATH';
  var MAX_TIME = 15;
  var NEEDED   = 4;          // 修正2: 10 → 4
  var MAX_WRONG = 3;         // 修正2: 5 → 3
  var CYCLE = 2.4, MIN_R = 90, MAX_R = 300, PEAK = 0.5, WINDOW = 0.14;
  var CX = snap(W / 2), CY = snap(H * 0.5);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var phase, matched, wrong, timeLeft, done, particles, flash, flashCol, cooldown, breathT;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.1) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1828');
  }

  function background() { game.draw.clear(C.bg); }

  function radius() { return MIN_R + (MAX_R - MIN_R) * (0.5 - 0.5 * Math.cos(phase * Math.PI * 2)); }

  function inWindow() { return Math.abs(phase - PEAK) < WINDOW; }

  function initGame() { phase = 0; matched = 0; wrong = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; cooldown = 0; breathT = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (matched * 600 + Math.ceil(timeLeft) * 100) : matched * 250;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawCircle() {
    var r = radius(), full = inWindow();
    pc(CX, CY, r + 40, C.d, 0.08); pc(CX, CY, r, full ? C.b : C.e, 0.35); pc(CX, CY, r * 0.5, C.g, 0.1);
    ring(CX, CY, r + 24, full ? C.b : '#1a3a5a', full ? 0.7 : 0.4);
    txt(full ? 'NOW!' : 'BREATHE', CX, CY + 16, full ? 64 : 44, full ? C.b : C.e);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || cooldown > 0) return;
    cooldown = 0.5;
    if (inWindow()) { matched++; flash = 0.4; flashCol = C.b; game.audio.play('se_success', 0.5); for (var k = 0; k < 10; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: CX, y: CY, vx: Math.cos(a) * (radius() + 40) * 3, vy: Math.sin(a) * (radius() + 40) * 3, life: 0.6, col: C.b }); } if (matched >= NEEDED) { finish(true); return; } }
    else { wrong++; flash = 0.4; flashCol = C.a; game.audio.play('se_failure', 0.3); if (wrong >= MAX_WRONG) { finish(false); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      phase = (game.time.elapsed % CYCLE) / CYCLE; background(); drawCircle();
      txt(GAME_TITLE, W / 2, H * 0.14, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CENTERED!' : 'OUT OF SYNC', W / 2, H * 0.35, 72, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      breathT += dt; phase = (breathT % CYCLE) / CYCLE;
      if (flash > 0) flash -= dt * 2.5; if (cooldown > 0) cooldown -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawCircle();
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(matched + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var wi = 0; wi < MAX_WRONG; wi++) game.draw.rect(snap(W / 2 + (wi - (MAX_WRONG - 1) / 2) * 56) - 10, 224, 20, 20, wi < wrong ? C.a : '#0a1828');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);

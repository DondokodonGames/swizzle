// 331-crystal-grow.js
// クリスタルグロウ — タップで結晶に栄養を注ぎ、緑のターゲット帯で手を止めて完璧に育てる
// 操作: タップで育てる、ターゲット帯で止めれば成功（過剰で崩壊）
// 成功: 3個 完璧に育てる  失敗: 3個 崩壊 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、結晶ラボ） ──
  var C = { bg:'#020c1a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CRYSTAL GROW';
  var HOW_TO_PLAY = 'TAP TO GROW · STOP IN THE GREEN ZONE';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 5 → 3
  var MAX_COLLAPSE = 3;
  var ZMIN = 0.70, ZMAX = 0.90, OVER = 1.0, MAXR = 260, CY = snap(H * 0.48);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var size, growing, phase, grown, collapsed, timeLeft, done, particles, fbText, fbCol, fbTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.16) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1a28');
  }

  function background() { game.draw.clear(C.bg); }

  function newCrystal() { size = 0.05; growing = false; phase = 'grow'; }

  function initGame() { grown = 0; collapsed = 0; timeLeft = MAX_TIME; done = false; particles = []; fbText = ''; fbCol = C.g; fbTimer = 0; newCrystal(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (grown * 700 + Math.ceil(timeLeft) * 100) : grown * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawCrystal() {
    var r = size * MAXR, inZone = size >= ZMIN && size <= ZMAX, over = size >= ZMAX;
    var col = over ? C.a : inZone ? C.b : C.d;
    ring(W / 2, CY, ZMIN * MAXR, C.b, 0.5); ring(W / 2, CY, ZMAX * MAXR, C.b, 0.4);
    // 六角形風の結晶（中央+6ブロック）
    pc(W / 2, CY, r, col, 0.75);
    for (var ci = 0; ci < 6; ci++) { var ca = ci * Math.PI / 3 + game.time.elapsed * 0.3; pc(W / 2 + Math.cos(ca) * r * 0.7, CY + Math.sin(ca) * r * 0.55, r * 0.4, col, 0.5); }
    pc(W / 2, CY, r * 0.3, C.g, 0.3);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || phase !== 'grow') return;
    growing = true; setTimeout(function() { growing = false; }, 200);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (size === undefined) initGame(); size = 0.5 + 0.3 * Math.sin(game.time.elapsed * 2); background(); drawCrystal();
      txt(GAME_TITLE, W / 2, H * 0.14, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'FLAWLESS!' : 'SHATTERED', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (fbTimer > 0) fbTimer -= dt;
      if (phase === 'grow') {
        size += (growing ? 0.55 : 0.02) * dt;
        if (size >= OVER) { phase = 'done'; collapsed++; fbText = 'COLLAPSE!'; fbCol = C.a; fbTimer = 0.9; game.audio.play('se_failure', 0.6); for (var k = 0; k < 14; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: CY, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, life: 0.8, col: C.a }); } if (collapsed >= MAX_COLLAPSE) { finish(false); return; } setTimeout(function() { if (!done) newCrystal(); }, 700); }
        else if (size >= ZMIN && size <= ZMAX && !growing && size > ZMIN + 0.04) { phase = 'done'; grown++; fbText = 'PERFECT!'; fbCol = C.b; fbTimer = 0.9; game.audio.play('se_success', 0.7); for (var k2 = 0; k2 < 12; k2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: CY, vx: Math.cos(a2) * 250, vy: Math.sin(a2) * 250, life: 0.7, col: C.b }); } if (grown >= NEEDED) { finish(true); return; } setTimeout(function() { if (!done) newCrystal(); }, 700); }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawCrystal();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.4);
    var inZone = size >= ZMIN && size <= ZMAX;
    if (fbTimer > 0) txt(fbText, W / 2, snap(H * 0.80), 60, fbCol);
    else txt(inZone ? 'STOP NOW!' : size >= ZMAX ? 'TOO BIG!' : 'TAP TO GROW', W / 2, snap(H * 0.80), 46, inZone ? C.b : size >= ZMAX ? C.a : C.c);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(grown + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ci2 = 0; ci2 < MAX_COLLAPSE; ci2++) game.draw.rect(snap(W / 2 + (ci2 - (MAX_COLLAPSE - 1) / 2) * 56) - 10, 224, 20, 20, ci2 < collapsed ? C.a : '#0a1a28');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);

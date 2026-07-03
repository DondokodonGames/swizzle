// 582-crystal-grow.js
// クリスタルグロウ — 自動で膨らむ結晶を、緑のターゲットリング内サイズに達した瞬間タップで止める
// 操作: タップで成長を停止（ターゲットの内輪〜外輪の間で止めれば成功、行き過ぎ・早すぎはミス）
// 成功: 4個 ぴったり  失敗: 3回 外し or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、結晶炉） ──
  var C = { bg:'#020210', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var CRYSTAL = [[C.d, '#aa88ff'], [C.a, '#ff88aa'], [C.e, '#88ddff'], [C.c, '#ffd088'], [C.b, '#88ffcc']];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CRYSTAL GROW';
  var HOW_TO_PLAY = 'TAP TO STOP THE GROWING CRYSTAL INSIDE THE TARGET RING';
  var MAX_TIME = 18;
  var NEEDED   = 4;          // 修正2: 10 → 4
  var MAX_FAIL = 3;          // 修正2: 8 → 3

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var crystal, score, fails, timeLeft, done, particles, flash, flashCol, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha, w) { w = w || 6; var n = Math.max(8, Math.ceil(r / 6)); for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2; game.draw.rect(snap(cx + Math.cos(a) * r) - w / 2, snap(cy + Math.sin(a) * r) - w / 2, w, w, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#0a0a20');
  }

  function background() { game.draw.clear(C.bg); }

  function nextCrystal() { var size = 90 + Math.floor(Math.random() * 5) * 34; crystal = { r: 20, tMin: size - 24, tMax: size + 24, maxR: size + 90, colorIdx: Math.floor(Math.random() * CRYSTAL.length), growRate: 90 + score * 12, growing: true }; }

  function initGame() { score = 0; fails = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; nextCrystal(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 700 + Math.ceil(timeLeft) * 100) : score * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function stopGrowth() {
    if (!crystal.growing) return; crystal.growing = false;
    var r = crystal.r, ok = r >= crystal.tMin && r <= crystal.tMax;
    if (ok) {
      score++; flash = 0.4; flashCol = C.b; resultText = 'PERFECT!'; resultTimer = 0.8; game.audio.play('se_success', 0.8);
      for (var pi = 0; pi < 12; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H / 2, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, life: 0.5, col: CRYSTAL[crystal.colorIdx][1] }); }
      if (score >= NEEDED) { finish(true); return; }
      setTimeout(function() { if (!done) nextCrystal(); }, 900);
    } else { fails++; flash = 0.35; flashCol = C.a; resultText = r > crystal.tMax ? 'TOO BIG' : 'TOO SMALL'; resultTimer = 0.8; game.audio.play('se_failure', 0.4); if (fails >= MAX_FAIL) { finish(false); return; } setTimeout(function() { if (!done) nextCrystal(); }, 900); }
  }

  function drawScene() {
    var cc = CRYSTAL[crystal.colorIdx];
    ring(W / 2, H / 2, crystal.tMax, C.b, 0.5, 6); ring(W / 2, H / 2, crystal.tMin, C.b, 0.5, 6);
    var r = crystal.r; pc(W / 2, H / 2, r, cc[0], 0.85); pc(W / 2, H / 2, r * 0.6, cc[1], 0.7); pc(W / 2 - r * 0.2, H / 2 - r * 0.2, r * 0.2, C.g, 0.4);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (crystal.growing) { stopGrowth(); game.audio.play('se_tap', 0.25); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!crystal) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.16, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.205, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.88, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CRYSTALLIZED!' : 'SHATTERED', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      if (crystal.growing) { crystal.r += crystal.growRate * dt; if (crystal.r >= crystal.maxR) { crystal.r = crystal.maxR; stopGrowth(); } if (Math.random() < 0.3) { var a = Math.random() * Math.PI * 2, r2 = crystal.r * (0.7 + Math.random() * 0.4); particles.push({ x: W / 2 + Math.cos(a) * r2, y: H / 2 + Math.sin(a) * r2, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40, life: 0.5, col: CRYSTAL[crystal.colorIdx][0] }); } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.4);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.80), 60, resultText === 'PERFECT!' ? C.b : C.a);
    else if (crystal.growing) txt('TAP TO STOP', W / 2, snap(H * 0.80), 44, C.c);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var fi = 0; fi < MAX_FAIL; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FAIL - 1) / 2) * 56) - 10, 224, 20, 20, fi < fails ? C.a : '#0a0a20');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);

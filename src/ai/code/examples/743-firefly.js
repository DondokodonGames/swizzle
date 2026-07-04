// 743-firefly.js
// ホタルハント — 明滅するホタルが光っている一瞬にタップして捕まえる
// 操作: 光っているホタルをタップ。消えている間にタップするとミス
// 成功: 10匹 捕獲  失敗: 3回 ミス or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、夜の森／ホタル色は保持） ──
  var C = { bg:'#010a03', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var FIREFLY = '#d4f73a', GLOW = '#8fc020';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'FIREFLY HUNT';
  var HOW_TO_PLAY = 'TAP THE FIREFLIES WHILE THEY GLOW · TAP A DARK ONE AND YOU MISS';
  var MAX_TIME = 22;
  var NEEDED   = 10;         // 修正2: 30 → 10
  var MAX_ERR  = 3;          // 修正2: 10 → 3
  var MAX_FF = 10;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var fireflies, score, errors, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#040f06');
  }

  function background() { game.draw.clear(C.bg); for (var gl = 0; gl < 5; gl++) game.draw.rect(0, H * 0.85 + gl * 20, W, 6, '#0a1f0c', 0.6); }

  function spawnFirefly() {
    var margin = 120, litDur = 0.5 + Math.random() * 0.7, darkDur = 0.8 + Math.random() * 1.2;
    fireflies.push({ x: margin + Math.random() * (W - margin * 2), y: H * 0.20 + Math.random() * (H * 0.62), vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 80, lit: false, litTimer: darkDur * 0.5 + Math.random() * darkDur, litDur: litDur, darkDur: darkDur, phase: Math.random() * Math.PI * 2 });
  }

  function initGame() { fireflies = []; score = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; for (var i = 0; i < 6; i++) spawnFirefly(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var fi2 = 0; fi2 < fireflies.length; fi2++) {
      var ff3 = fireflies[fi2];
      if (ff3.lit) { var glow = 0.5 + 0.3 * Math.sin(ff3.phase * 4); pc(ff3.x, ff3.y, 30, GLOW, glow * 0.35); pc(ff3.x, ff3.y, 14, FIREFLY, 0.9); pc(ff3.x - 4, ff3.y - 4, 5, C.g, 0.6); }
      else pc(ff3.x, ff3.y, 8, '#2a3a05', 0.5);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = fireflies.length - 1; i >= 0; i--) {
      var ff = fireflies[i]; if (!ff.lit) continue;
      var dx = tx - ff.x, dy = ty - ff.y;
      if (dx * dx + dy * dy < 70 * 70) {
        fireflies.splice(i, 1); score++; flash = 0.22; flashCol = C.b; resultText = 'CAUGHT!'; resultTimer = 0.38; game.audio.play('se_tap', 0.1);
        for (var p = 0; p < 6; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: tx, y: ty, vx: Math.cos(pa) * 160, vy: Math.sin(pa) * 160, life: 0.4, col: FIREFLY }); }
        if (score >= NEEDED) { finish(true); return; }
        return;
      }
    }
    for (var j = 0; j < fireflies.length; j++) { var ff2 = fireflies[j], dx2 = tx - ff2.x, dy2 = ty - ff2.y; if (dx2 * dx2 + dy2 * dy2 < 60 * 60) { errors++; flash = 0.25; flashCol = C.a; resultText = 'TOO DARK!'; resultTimer = 0.38; game.audio.play('se_failure', 0.22); if (errors >= MAX_ERR) { finish(false); return; } return; } }
    errors++; flash = 0.18; flashCol = C.a; resultText = 'MISS!'; resultTimer = 0.32; game.audio.play('se_failure', 0.15);
    if (errors >= MAX_ERR) { finish(false); return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!fireflies) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'JAR FULL!' : 'THEY VANISHED', W / 2, H * 0.35, 56, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      while (fireflies.length < MAX_FF) spawnFirefly();
      for (var fi = 0; fi < fireflies.length; fi++) {
        var ff = fireflies[fi]; ff.phase += dt * 2.5; ff.x += ff.vx * dt; ff.y += ff.vy * dt;
        if (ff.x < 80 || ff.x > W - 80) { ff.vx = -ff.vx; ff.x = Math.max(80, Math.min(W - 80, ff.x)); }
        if (ff.y < H * 0.15 || ff.y > H * 0.88) { ff.vy = -ff.vy; ff.y = Math.max(H * 0.15, Math.min(H * 0.88, ff.y)); }
        ff.litTimer -= dt;
        if (ff.litTimer <= 0) { ff.lit = !ff.lit; ff.litTimer = ff.lit ? ff.litDur : ff.darkDur; if (ff.lit) ff.litDur = Math.max(0.3, 0.5 + Math.random() * 0.6 - score * 0.02); }
      }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.87), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#040f06');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.03);
    state = S.ATTRACT;
    initGame();
  });
})(game);

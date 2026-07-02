// 206-firefly-catch.js
// 蛍キャッチ — 夜の森で光っている一瞬だけがチャンス、消える前にタップして蛍を捕まえる
// 操作: 光っている蛍をタップ
// 成功: 3匹捕まえる  失敗: 12秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、真夜中の森） ──
  var C = { bg:'#010205', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#123a12', e:'#00cfff', f:'#ffaa00', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'FIREFLY CATCH';
  var HOW_TO_PLAY = 'TAP A FIREFLY WHILE IT GLOWS';
  var MAX_TIME = 12;
  var NEEDED   = 3;             // 修正2: 20 → 3
  var TOP = 220, GROUND = snap(H * 0.82), CATCH_R = 90;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var flies, particles, score, timeLeft, done;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1a0a');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var si = 0; si < 30; si++) { var sx = snap((si * 137 + 30) % W), sy = snap((si * 89 + 20) % (GROUND - TOP) + TOP); game.draw.rect(sx, sy, 4, 4, C.g, 0.15 + 0.15 * (Math.floor(game.time.elapsed * 2 + si) % 2)); }
    game.draw.rect(0, GROUND, W, H - GROUND, C.d, 0.9);
    for (var gx = 0; gx < W; gx += 40) game.draw.rect(gx + 8, GROUND - 24, 8, 24, C.d);
  }

  function drawFly(f) {
    if (f.glowing) {
      var ga = Math.sin(f.phase / f.glowDur * Math.PI) * 0.8 + 0.15;
      pc(f.x, f.y, f.size * 2.4, C.f, ga * 0.3);
      pc(f.x, f.y, f.size, C.c, ga);
      game.draw.rect(snap(f.x) - 4, snap(f.y) - 4, 8, 8, C.g, ga);
    } else {
      game.draw.rect(snap(f.x) - 4, snap(f.y) - 4, 8, 8, '#2a2a10', 0.4);
    }
  }

  function spawnFly() {
    flies.push({ x: snap(game.random(80, W - 80)), y: snap(game.random(TOP + 40, GROUND - 80)), vx: game.random(-50, 50), vy: game.random(-35, 35),
      phase: 0, glowDur: 0.9 + Math.random() * 1.2, darkDur: 1.2 + Math.random() * 1.5, glowing: Math.random() > 0.4, size: 16 });
  }

  function initGame() { flies = []; particles = []; score = 0; timeLeft = MAX_TIME; done = false; for (var i = 0; i < 8; i++) spawnFly(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 400 + Math.ceil(timeLeft) * 60) : score * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var fi = flies.length - 1; fi >= 0; fi--) {
      var f = flies[fi];
      if (!f.glowing) continue;
      if (Math.hypot(x - f.x, y - f.y) < CATCH_R) {
        score++; flies.splice(fi, 1); game.audio.play('se_tap', 0.6);
        for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: x, y: y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.6 }); }
        if (score >= NEEDED) { finish(true); return; }
        return;
      }
    }
    game.audio.play('se_failure', 0.12);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      for (var i = 0; i < 6; i++) drawFly({ x: W * (0.2 + (i % 3) * 0.3), y: H * (0.4 + Math.floor(i / 3) * 0.12), glowing: (Math.floor(game.time.elapsed * 2) + i) % 2 === 0, phase: 0.5, glowDur: 1, size: 16 });
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.97, 40, '#556655');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CAUGHT!' : 'TIME OUT', W / 2, H * 0.35, 82, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flies.length < 12 && Math.random() < dt * 2) spawnFly();
      for (var fi = 0; fi < flies.length; fi++) {
        var f = flies[fi]; f.phase += dt; f.x += f.vx * dt; f.y += f.vy * dt;
        f.vx += game.random(-30, 30) * dt; f.vy += game.random(-20, 20) * dt;
        f.vx = Math.max(-80, Math.min(80, f.vx)); f.vy = Math.max(-50, Math.min(50, f.vy));
        if (f.x < 40) { f.x = 40; f.vx = Math.abs(f.vx); } if (f.x > W - 40) { f.x = W - 40; f.vx = -Math.abs(f.vx); }
        if (f.y < TOP + 20) { f.y = TOP + 20; f.vy = Math.abs(f.vy); } if (f.y > GROUND - 40) { f.y = GROUND - 40; f.vy = -Math.abs(f.vy); }
        if (f.phase >= (f.glowing ? f.glowDur : f.darkDur)) { f.phase = 0; f.glowing = !f.glowing; }
      }
      for (var pi = particles.length - 1; pi >= 0; pi--) { var p = particles[pi]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 60 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pi, 1); }
    }

    // ---- 描画 ----
    background();
    for (var fi2 = 0; fi2 < flies.length; fi2++) drawFly(flies[fi2]);
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 5, snap(particles[pp].y) - 5, 10, 10, C.c, particles[pp].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 52, C.c);
    txt('TAP THE GLOWING ONES', W / 2, H - 100, 38, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);

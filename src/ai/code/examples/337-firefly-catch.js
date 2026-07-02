// 337-firefly-catch.js
// ホタルキャッチ — 夜の森でふわりと明滅するホタルを、光っている瞬間にタップして捕まえる
// 操作: 明るく光っているホタルをタップして捕まえる
// 成功: 5匹つかまえる  失敗: 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、夜の森） ──
  var C = { bg:'#010508', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#66ff88', f:'#ff6600', g:'#eaffea', tree:'#0a2010' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'FIREFLY CATCH';
  var HOW_TO_PLAY = 'TAP THE FIREFLIES WHILE THEY GLOW BRIGHT';
  var MAX_TIME = 15;
  var NEEDED   = 5;          // 修正2: 25 → 5

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var flies, caught, timeLeft, done, particles, marks;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a2010');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var ti = 0; ti < 5; ti++) { var tx = ti * W * 0.25 - 20, th = 220 + (ti % 3) * 80; game.draw.rect(snap(tx + 40), snap(H * 0.80 - th), 40, th, C.tree, 0.9); pc(tx + 60, H * 0.80 - th, 60, C.tree, 0.85); }
    game.draw.rect(0, snap(H * 0.86), W, H, C.tree, 0.9); game.draw.rect(0, snap(H * 0.86), W, 8, C.d, 0.5);
  }

  function glow(f) { return (Math.sin(game.time.elapsed / f.cycle * Math.PI * 2 + f.phase) + 1) / 2; }

  function spawnFirefly() { flies.push({ x: snap(100 + Math.random() * (W - 200)), y: snap(H * 0.20 + Math.random() * H * 0.6), vx: (Math.random() - 0.5) * 70, vy: (Math.random() - 0.5) * 50, cycle: 1.5 + Math.random() * 2.5, phase: Math.random() * Math.PI * 2, r: 16, dirT: 1 + Math.random() * 2 }); }

  function initGame() { flies = []; caught = 0; timeLeft = MAX_TIME; done = false; particles = []; marks = []; for (var i = 0; i < 7; i++) spawnFirefly(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 500 + Math.ceil(timeLeft) * 100) : caught * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawFirefly(f) {
    var gl = glow(f);
    if (gl > 0.1) { pc(f.x, f.y, f.r * 2.5, C.d, gl * 0.25); pc(f.x, f.y, f.r, C.e, gl * 0.9 + 0.1); pc(f.x, f.y, f.r * 0.4, C.g, gl * 0.8); }
    else pc(f.x, f.y, f.r * 0.5, '#123', 0.6);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var best = -1, bg = 0.3;
    for (var fi = 0; fi < flies.length; fi++) { var f = flies[fi], gl = glow(f); if (Math.hypot(x - f.x, y - f.y) < f.r + 44 && gl > bg) { bg = gl; best = fi; } }
    if (best >= 0) {
      var f2 = flies[best]; caught++; marks.push({ x: f2.x, y: f2.y, ok: true, life: 0.7 });
      for (var k = 0; k < 8; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: f2.x, y: f2.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.5, col: C.e }); }
      game.audio.play('se_success', 0.4); flies.splice(best, 1); spawnFirefly();
      if (caught >= NEEDED) { finish(true); return; }
    } else { marks.push({ x: x, y: y, ok: false, life: 0.4 }); for (var fi2 = 0; fi2 < flies.length; fi2++) if (Math.hypot(x - flies[fi2].x, y - flies[fi2].y) < 120) { var a2 = Math.atan2(flies[fi2].y - y, flies[fi2].x - x); flies[fi2].vx += Math.cos(a2) * 90; flies[fi2].vy += Math.sin(a2) * 90; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!flies) initGame(); background(); for (var i = 0; i < flies.length; i++) drawFirefly(flies[i]);
      txt(GAME_TITLE, W / 2, H * 0.14, 72, C.b);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.e);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CAUGHT THEM!' : 'THEY FLEW', W / 2, H * 0.35, 68, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      for (var fi = 0; fi < flies.length; fi++) {
        var f = flies[fi]; f.dirT -= dt; if (f.dirT <= 0) { f.vx = (Math.random() - 0.5) * 80; f.vy = (Math.random() - 0.5) * 60; f.dirT = 1 + Math.random() * 2; }
        f.x += f.vx * dt; f.y += f.vy * dt;
        if (f.x < 60) { f.x = 60; f.vx = Math.abs(f.vx); } if (f.x > W - 60) { f.x = W - 60; f.vx = -Math.abs(f.vx); }
        if (f.y < H * 0.16) { f.y = H * 0.16; f.vy = Math.abs(f.vy); } if (f.y > H * 0.82) { f.y = H * 0.82; f.vy = -Math.abs(f.vy); }
      }
      for (var mi = marks.length - 1; mi >= 0; mi--) { marks[mi].y -= 40 * dt; marks[mi].life -= dt * 2; if (marks[mi].life <= 0) marks.splice(mi, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var fi3 = 0; fi3 < flies.length; fi3++) drawFirefly(flies[fi3]);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    for (var mi2 = 0; mi2 < marks.length; mi2++) txt(marks[mi2].ok ? '+1' : 'MISS', marks[mi2].x, marks[mi2].y, 40, marks[mi2].ok ? C.c : C.a);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);

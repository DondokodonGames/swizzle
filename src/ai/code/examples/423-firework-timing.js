// 423-firework-timing.js
// 花火打ち上げ — 打ち上がる花火玉が最高点に達した瞬間にタップして、大輪の花火を咲かせる
// 操作: 花火が頂点（光る輪）に来たらタップ（早すぎ・遅すぎはミス）
// 成功: 4発 咲かせる  失敗: 3回 タイミングミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、夏の夜空） ──
  var C = { bg:'#010108', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BURST = [C.a, C.f, C.c, C.b, C.e, C.d, C.g];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'FIREWORK TIMING';
  var HOW_TO_PLAY = 'TAP WHEN THE SHELL REACHES ITS PEAK · BLOOM THE FIREWORK';
  var MAX_TIME = 15;
  var NEEDED   = 4;          // 修正2: 8 → 4
  var MAX_MISS = 3;
  var LX = snap(W / 2), LY = snap(H * 0.86), PEAK_MARGIN = 80;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var rockets, particles, stars, successes, misses, timeLeft, done, flash, flashCol, nextLaunch;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a0a1a');
  }

  function background() { game.draw.clear(C.bg); for (var si = 0; si < stars.length; si++) { var s = stars[si]; game.draw.rect(s.x, s.y, s.r, s.r, C.g, 0.3 + Math.sin(game.time.elapsed * 2 + s.tw) * 0.2); } game.draw.rect(0, LY + 30, W, H, '#080410', 0.9); }

  function initStars() { stars = []; for (var i = 0; i < 50; i++) stars.push({ x: snap(Math.random() * W), y: snap(Math.random() * H * 0.7), r: Math.random() < 0.5 ? 4 : 8, tw: Math.random() * Math.PI * 2 }); }

  function burst(rx, ry, col) { var cnt = 30; for (var i = 0; i < cnt; i++) { var ang = i / cnt * Math.PI * 2 + Math.random() * 0.3, sp = 200 + Math.random() * 260; particles.push({ x: rx, y: ry, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 1.0, maxLife: 1.0, col: col, r: 6 }); } for (var j = 0; j < 10; j++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: rx, y: ry, vx: Math.cos(a2) * 120, vy: Math.sin(a2) * 120, life: 0.8, maxLife: 0.8, col: C.g, r: 4 }); } }

  function launch() { rockets.push({ x: snap(LX + (Math.random() - 0.5) * 300), y: LY, vy: -(800 + Math.random() * 300), peakY: snap(H * (0.14 + Math.random() * 0.26)), col: BURST[Math.floor(Math.random() * BURST.length)], burst: false, smoke: [] }); }

  function initGame() { rockets = []; particles = []; successes = 0; misses = 0; timeLeft = MAX_TIME; done = false; flash = 0; flashCol = C.b; nextLaunch = 0.4; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (successes * 700 + Math.ceil(timeLeft) * 100) : successes * 250;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var hit = false;
    for (var ri = rockets.length - 1; ri >= 0; ri--) { var r = rockets[ri]; if (r.burst || r.vy > 0) continue; if (Math.abs(r.y - r.peakY) < PEAK_MARGIN) { burst(r.x, r.y, r.col); r.burst = true; successes++; flash = 0.7; flashCol = C.b; game.audio.play('se_success', 0.7); hit = true; if (successes >= NEEDED) { finish(true); return; } break; } }
    if (!hit) { var active = false; for (var i = 0; i < rockets.length; i++) if (!rockets[i].burst) active = true; if (active) { misses++; flash = 0.5; flashCol = C.a; game.audio.play('se_failure', 0.4); if (misses >= MAX_MISS) { finish(false); return; } } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      txt(GAME_TITLE, W / 2, H * 0.20, 72, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.26, 22, C.b);
      pc(W / 2, H * 0.5, 40, C.a, 0.6); ring(W / 2, H * 0.5, 55, C.a, 0.4);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.72, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.78, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'GRAND FINALE!' : 'FIZZLED', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2;
      nextLaunch -= dt; if (nextLaunch <= 0) { launch(); nextLaunch = Math.max(1.2, 2.0 - successes * 0.1); }
      for (var ri = rockets.length - 1; ri >= 0; ri--) { var r = rockets[ri]; if (r.burst) { rockets.splice(ri, 1); continue; } r.vy += 400 * dt; r.y += r.vy * dt; r.smoke.push({ x: r.x, y: r.y }); if (r.smoke.length > 8) r.smoke.shift(); if (r.y > LY + 100) { r.burst = true; misses++; flash = 0.5; flashCol = C.a; game.audio.play('se_failure', 0.3); if (misses >= MAX_MISS) { finish(false); return; } } }
      for (var pi = particles.length - 1; pi >= 0; pi--) { var p = particles[pi]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.vx *= (1 - dt * 1.5); p.life -= dt; if (p.life <= 0) particles.splice(pi, 1); }
    }

    // ---- 描画 ----
    background();
    for (var pi2 = 0; pi2 < particles.length; pi2++) { var p2 = particles[pi2], lr = p2.life / p2.maxLife; pc(p2.x, p2.y, p2.r * lr, p2.col, lr * 0.9); }
    for (var ri2 = 0; ri2 < rockets.length; ri2++) { var r2 = rockets[ri2]; for (var sk = 0; sk < r2.smoke.length; sk++) pc(r2.smoke[sk].x, r2.smoke[sk].y, 8 * (1 - sk / r2.smoke.length), '#445', (1 - sk / r2.smoke.length) * 0.3); pc(r2.x, r2.y, 12, C.c, 0.9); pc(r2.x, r2.y + 16, 8, C.f, 0.7); if (Math.abs(r2.y - r2.peakY) < PEAK_MARGIN && r2.vy < 0) ring(r2.x, r2.y, 44, r2.col, 0.4); }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(successes + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#0a0a1a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initStars();
    initGame();
  });
})(game);

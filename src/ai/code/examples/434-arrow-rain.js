// 434-arrow-rain.js
// 矢の雨 — 降ってきて止まった矢が指す向きを見て、同じ方向へ素早くスワイプして払う
// 操作: 矢が指す方向にスワイプ（上下左右）
// 成功: 5回 正解  失敗: 3回 間違い or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、弓術場） ──
  var C = { bg:'#0f0800', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var DIRS = ['up', 'down', 'left', 'right'];
  var DA = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ARROW RAIN';
  var HOW_TO_PLAY = 'SWIPE THE WAY EACH ARROW POINTS';
  var MAX_TIME = 15;
  var NEEDED   = 5;          // 修正2: 50 → 5
  var MAX_MISS = 3;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var arrow, nextSpawn, correct, misses, combo, timeLeft, done, particles, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1000');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnArrow() { var dir = DIRS[Math.floor(Math.random() * 4)]; arrow = { x: snap(W / 2 + (Math.random() - 0.5) * 300), y: -200, dir: dir, angle: DA[dir], vy: 500, arrived: false, answered: false, ft: 0, result: null }; }

  function initGame() { arrow = null; nextSpawn = 0.4; correct = 0; misses = 0; combo = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (correct * 500 + Math.ceil(timeLeft) * 100) : correct * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawArrow(ar) {
    var col = ar.result === 'correct' ? C.b : ar.result === 'wrong' ? C.a : C.c;
    var sx = ar.x - Math.cos(ar.angle) * 130, sy = ar.y - Math.sin(ar.angle) * 130;
    pline(ar.x, ar.y, sx, sy, C.f, 0.9, 10); pline(ar.x, ar.y, sx, sy, col, 0.9, 5);
    var perp = ar.angle + Math.PI / 2, tx = ar.x + Math.cos(ar.angle) * 40, ty = ar.y + Math.sin(ar.angle) * 40;
    pc(ar.x, ar.y, 22, col, 0.95); pline(tx, ty, ar.x + Math.cos(perp) * 22, ar.y + Math.sin(perp) * 22, col, 0.9, 8); pline(tx, ty, ar.x - Math.cos(perp) * 22, ar.y - Math.sin(perp) * 22, col, 0.9, 8);
    pc(sx + Math.cos(perp) * 14, sy + Math.sin(perp) * 14, 10, C.a, 0.7); pc(sx - Math.cos(perp) * 14, sy - Math.sin(perp) * 14, 10, C.a, 0.7);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || !arrow || !arrow.arrived || arrow.answered) return;
    arrow.answered = true;
    if (dir === arrow.dir) { correct++; combo++; arrow.result = 'correct'; arrow.ft = 0.5; flash = 0.4; flashCol = C.b; game.audio.play('se_success', 0.5); for (var k = 0; k < 6; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: arrow.x, y: arrow.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.4, col: C.c }); } if (correct >= NEEDED) { finish(true); return; } }
    else { misses++; combo = 0; arrow.result = 'wrong'; arrow.ft = 0.5; flash = 0.5; flashCol = C.a; game.audio.play('se_failure', 0.5); if (misses >= MAX_MISS) { finish(false); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawArrow({ x: W / 2, y: H * 0.44, dir: 'right', angle: 0, result: null });
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.91, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'BULLSEYE!' : 'MISFIRE', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3;
      nextSpawn -= dt; if (nextSpawn <= 0 && !arrow) spawnArrow();
      if (arrow) {
        if (!arrow.arrived) { arrow.y += arrow.vy * dt; if (arrow.y >= H * 0.44) { arrow.y = H * 0.44; arrow.arrived = true; game.audio.play('se_tap', 0.15); } }
        else if (arrow.answered) { if (arrow.ft > 0) arrow.ft -= dt; if (arrow.ft <= 0) { arrow.y += (arrow.result === 'correct' ? -1 : 1) * 300 * dt; if (arrow.y < -200 || arrow.y > H + 200) { arrow = null; nextSpawn = Math.max(0.6, 1.4 - correct * 0.1); } } }
        else { arrow.vy += 150 * dt; arrow.y += arrow.vy * dt; if (arrow.y > H + 100) { misses++; combo = 0; flash = 0.4; flashCol = C.a; game.audio.play('se_failure', 0.3); arrow = null; nextSpawn = 0.6; if (misses >= MAX_MISS) { finish(false); return; } } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    pc(W / 2, 80, 30, C.d, 0.15); pc(W / 2, H - 80, 30, C.d, 0.15); pc(80, H / 2, 30, C.d, 0.15); pc(W - 80, H / 2, 30, C.d, 0.15);
    if (arrow) drawArrow(arrow);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (combo >= 3) txt(combo + ' COMBO!', W / 2, snap(H * 0.72), 48, C.c);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(correct + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#1a1000');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    state = S.ATTRACT;
    initGame();
  });
})(game);

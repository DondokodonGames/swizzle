// 512-shape-sort.js
// シェイプソート — 落ちてくる図形を、同じ形の穴の上に左右スワイプで動かして落とし込む
// 操作: 左右スワイプ（またはタップ）で落下中の図形を同じ形の穴へ寄せる
// 成功: 8個 正しく仕分け  失敗: 3個 ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、仕分け工場） ──
  var C = { bg:'#030510', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var SHAPE_COLS = [C.a, C.e, C.b, C.c];
  var TYPES = ['circle', 'rect', 'triangle', 'diamond'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SHAPE SORT';
  var HOW_TO_PLAY = 'SWIPE THE FALLING SHAPE OVER THE MATCHING HOLE';
  var MAX_TIME = 15;
  var NEEDED   = 8;          // 修正2: 25 → 8
  var MAX_MISS = 3;          // 修正2: 8 → 3
  var HOLE_R = 80, HOLE_Y = snap(H * 0.80), SHAPE_SIZE = 64;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var holes, falling, correct, misses, timeLeft, done, particles, flash, flashCol;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a0a18');
  }

  function background() { game.draw.clear(C.bg); }

  function drawShape(type, col, cx, cy, size, alpha) {
    cx = snap(cx); cy = snap(cy);
    if (type === 'circle') pc(cx, cy, size, col, alpha);
    else if (type === 'rect') game.draw.rect(cx - size, cy - size, size * 2, size * 2, col, alpha);
    else if (type === 'triangle') { for (var y = -size; y <= size; y += 8) { var w = (y + size) / (size * 2) * size; game.draw.rect(cx - w, cy + y, w * 2 + 8, 8, col, alpha); } }
    else { for (var y2 = -size; y2 <= size; y2 += 8) { var w2 = size - Math.abs(y2); game.draw.rect(cx - w2, cy + y2, w2 * 2 + 8, 8, col, alpha); } }
  }

  function spawnShape() { var t = Math.floor(Math.random() * TYPES.length); falling = { x: W / 2, y: 320, vy: 0, type: TYPES[t], col: SHAPE_COLS[t] }; }

  function initGame() {
    holes = []; for (var hi = 0; hi < 4; hi++) holes.push({ x: snap(W / 5 * (hi + 1)), y: HOLE_Y, type: TYPES[hi], col: SHAPE_COLS[hi] });
    correct = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; spawnShape();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (correct * 500 + Math.ceil(timeLeft) * 100) : correct * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var hi = 0; hi < holes.length; hi++) { var h = holes[hi]; pc(h.x, h.y, HOLE_R, '#0a0a0a', 0.95); drawShape(h.type, h.col, h.x, h.y, 32, 0.7); }
    if (falling) drawShape(falling.type, falling.col, falling.x, falling.y, SHAPE_SIZE, 0.9);
  }

  // ── 入力 ──
  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || !falling) return;
    falling.x = tx < W / 2 ? Math.max(HOLE_R, falling.x - W * 0.22) : Math.min(W - HOLE_R, falling.x + W * 0.22); game.audio.play('se_tap', 0.2);
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || !falling) return;
    if (dir === 'left') falling.x = Math.max(HOLE_R, falling.x - W * 0.25); else if (dir === 'right') falling.x = Math.min(W - HOLE_R, falling.x + W * 0.25);
    game.audio.play('se_tap', 0.3);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!holes) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.20, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.26, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.50, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.56, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL SORTED!' : 'JAMMED UP', W / 2, H * 0.35, 68, resultSuccess ? C.b : C.a);
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
      if (falling) {
        falling.vy = Math.min(800, falling.vy + 400 * dt); falling.y += falling.vy * dt;
        if (falling.y >= HOLE_Y - 20) {
          var best = null, bd = Infinity; for (var hi = 0; hi < holes.length; hi++) { var d = Math.abs(falling.x - holes[hi].x); if (d < bd) { bd = d; best = holes[hi]; } }
          if (bd <= HOLE_R + 20) {
            if (best.type === falling.type) { correct++; flash = 0.35; flashCol = C.b; game.audio.play('se_success', 0.7); for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: best.x, y: HOLE_Y, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140 - 80, life: 0.4, col: falling.col }); } if (correct >= NEEDED) { finish(true); return; } }
            else { misses++; flash = 0.5; flashCol = C.a; game.audio.play('se_failure', 0.4); if (misses >= MAX_MISS) { finish(false); return; } }
          } else { misses++; flash = 0.4; flashCol = C.a; game.audio.play('se_failure', 0.3); if (misses >= MAX_MISS) { finish(false); return; } }
          falling = null; setTimeout(function() { if (!done) spawnShape(); }, 300);
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(correct + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#0a0a18');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);

// 449-color-wave.js
// カラーウェーブ — 流れ落ちる色の波の色（＝方向）に合わせてスワイプする
// 操作: 波が示す矢印の向きへスワイプ（シアン=上/赤=下/緑=左/橙=右）
// 成功: 8回 的中  失敗: 3ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、リズム筐体） ──
  var C = { bg:'#0a0020', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var DIR_COL = { up: C.e, down: C.a, left: C.b, right: C.f };
  var DIRS = ['up', 'down', 'left', 'right'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'COLOR WAVE';
  var HOW_TO_PLAY = 'SWIPE THE WAY THE WAVE POINTS';
  var MAX_TIME = 15;
  var NEEDED   = 8;          // 修正2: 30 → 8
  var MAX_MISS = 3;          // 修正2: 5 → 3
  var WAVE_SPEED = 300, SPAWN_INTERVAL = 1.6;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var waves, currentDir, nextSpawn, particles, correct, misses, timeLeft, done, hitText, hitTimer, hitCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function arrow(cx, cy, dir, sz, color, alpha) {
    cx = snap(cx); cy = snap(cy); var s = sz;
    for (var i = -s; i <= s; i += 8) {
      var w = s - Math.abs(i);
      if (dir === 'up') game.draw.rect(cx - w, cy + i, w * 2 + 8, 8, color, alpha);
      else if (dir === 'down') game.draw.rect(cx - w, cy - i, w * 2 + 8, 8, color, alpha);
      else if (dir === 'left') game.draw.rect(cx + i, cy - w, 8, w * 2 + 8, color, alpha);
      else game.draw.rect(cx - i, cy - w, 8, w * 2 + 8, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#140028');
  }

  function background() { game.draw.clear(C.bg); for (var gl = 320; gl < H; gl += 80) game.draw.rect(0, gl, W, 2, C.d, 0.15); }

  function spawnWave() { var dir = DIRS[Math.floor(Math.random() * DIRS.length)]; waves.push({ dir: dir, col: DIR_COL[dir], y: 300 }); currentDir = dir; }

  function initGame() { waves = []; currentDir = null; nextSpawn = 0.6; particles = []; correct = 0; misses = 0; timeLeft = MAX_TIME; done = false; hitText = ''; hitTimer = 0; hitCol = C.c; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (correct * 500 + Math.ceil(timeLeft) * 100) : correct * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawLegend() {
    var ly = snap(H * 0.86);
    for (var di = 0; di < DIRS.length; di++) { var lx = snap(W * 0.16 + di * (W * 0.68 / 3)); pc(lx, ly, 40, DIR_COL[DIRS[di]], 0.25); arrow(lx, ly, DIRS[di], 24, DIR_COL[DIRS[di]], 0.9); }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || !currentDir) return;
    if (dir === currentDir) {
      correct++; hitText = 'HIT'; hitCol = C.b; hitTimer = 0.5; game.audio.play('se_tap', 0.5);
      for (var pi = 0; pi < 10; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H / 2, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, col: DIR_COL[dir] }); }
      for (var wi = waves.length - 1; wi >= 0; wi--) if (waves[wi].dir === currentDir) { waves.splice(wi, 1); break; }
      currentDir = waves.length > 0 ? waves[waves.length - 1].dir : null;
      if (correct >= NEEDED) { finish(true); return; }
    } else {
      misses++; hitText = 'MISS'; hitCol = C.a; hitTimer = 0.5; game.audio.play('se_failure', 0.4);
      if (misses >= MAX_MISS) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawLegend();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.60, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.66, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'IN THE FLOW!' : 'WIPED OUT', W / 2, H * 0.35, 68, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (hitTimer > 0) hitTimer -= dt;
      nextSpawn -= dt; if (nextSpawn <= 0) { spawnWave(); nextSpawn = SPAWN_INTERVAL * (0.7 + Math.random() * 0.6); }
      for (var wi = waves.length - 1; wi >= 0; wi--) {
        waves[wi].y += WAVE_SPEED * dt;
        if (waves[wi].y > H * 0.82) {
          misses++; hitText = 'MISS'; hitCol = C.a; hitTimer = 0.5; waves.splice(wi, 1);
          currentDir = waves.length > 0 ? waves[waves.length - 1].dir : null; game.audio.play('se_failure', 0.3);
          if (misses >= MAX_MISS) { finish(false); return; }
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var wi2 = 0; wi2 < waves.length; wi2++) { var w = waves[wi2]; game.draw.rect(0, snap(w.y) - 56, W, 112, w.col, 0.12); game.draw.rect(0, snap(w.y) - 4, W, 8, w.col, 0.8); arrow(W / 2, w.y, w.dir, 40, w.col, 0.95); }
    drawLegend();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (hitTimer > 0) txt(hitText, W / 2, snap(H * 0.76), 56, hitCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(correct + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#140028');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);

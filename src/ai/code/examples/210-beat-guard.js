// 210-beat-guard.js
// ビートガード — 4方向から迫る音符を、同じ方向へスワイプして弾き返すリズム防衛
// 操作: 音符と同じ方向にスワイプして弾く
// 成功: 3回弾き返す  失敗: 3回ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、リズム道場） ──
  var C = { bg:'#060408', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BEAT GUARD';
  var HOW_TO_PLAY = 'SWIPE TOWARD THE INCOMING NOTE';
  var MAX_TIME = 15;
  var NEEDED   = 3;            // 修正2: 30 → 3
  var MAX_MISS = 3;           // 修正2: 8 → 3
  var CX = snap(W / 2), CY = snap(H * 0.48), GUARD_R = 110, NOTE_R = 44, HIT_ZONE = 80;
  var BEAT = 0.7;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var notes, beatTimer, beatIdx, score, misses, timeLeft, done, feedback, feedbackOk, particles;
  var pattern = ['up', 'right', 'down', 'left', 'up', 'left', 'right', 'down'];

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function arrow(dir, x, y, sz, color) {
    var m = { up: [[0,-1],[-1,0],[1,0]], down: [[0,1],[-1,0],[1,0]], left: [[-1,0],[0,-1],[0,1]], right: [[1,0],[0,-1],[0,1]] }[dir];
    for (var i = 0; i < m.length; i++) game.draw.rect(snap(x + m[i][0] * sz) - 6, snap(y + m[i][1] * sz) - 6, 12, 12, color);
    game.draw.rect(snap(x) - 6, snap(y) - 6, 12, 12, color);
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1030');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(CX - 20, 220, 40, CY - GUARD_R - 220, C.d, 0.25);
    game.draw.rect(CX - 20, CY + GUARD_R, 40, H - 180 - CY - GUARD_R, C.d, 0.25);
    game.draw.rect(0, CY - 20, CX - GUARD_R, 40, C.d, 0.25);
    game.draw.rect(CX + GUARD_R, CY - 20, W - CX - GUARD_R, 40, C.d, 0.25);
  }

  function drawGuard() {
    pc(CX, CY, GUARD_R, '#1e1040', 0.9);
    arrow('up', CX, CY - GUARD_R * 0.55, 14, C.d); arrow('down', CX, CY + GUARD_R * 0.55, 14, C.d);
    arrow('left', CX - GUARD_R * 0.55, CY, 14, C.d); arrow('right', CX + GUARD_R * 0.55, CY, 14, C.d);
  }

  function drawNote(n) {
    var col = n.hit ? C.b : C.a, alpha = n.hit ? Math.max(0, n.life * 3) : 0.9;
    pc(n.x, n.y, NOTE_R, col, alpha);
    if (!n.hit) arrow(n.dir, n.x, n.y, 12, C.g);
  }

  function spawnNote() {
    var dir = pattern[beatIdx % pattern.length]; beatIdx++;
    var dist = W * 0.6, sx = CX, sy = CY;
    if (dir === 'up') sy = CY - dist; else if (dir === 'down') sy = CY + dist; else if (dir === 'left') sx = CX - dist; else sx = CX + dist;
    notes.push({ x: sx, y: sy, dir: dir, life: 0.7, totalLife: 0.7, hit: false });
  }

  function initGame() { notes = []; beatTimer = 0.5; beatIdx = 0; score = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = 0; feedbackOk = false; particles = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 400 + Math.ceil(timeLeft) * 50) : score * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function addMiss() { misses++; feedbackOk = false; feedback = 0.3; game.audio.play('se_failure', 0.4); if (misses >= MAX_MISS) finish(false); }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    var best = null, bestD = 99999;
    for (var ni = 0; ni < notes.length; ni++) {
      var n = notes[ni]; if (n.hit) continue;
      var d = Math.hypot(n.x - CX, n.y - CY);
      if (d < GUARD_R + HIT_ZONE && n.dir === dir && d < bestD) { best = n; bestD = d; }
    }
    if (best) {
      best.hit = true; score++; feedbackOk = true; feedback = 0.3; game.audio.play('se_success', 0.7);
      for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: best.x, y: best.y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, life: 0.4 }); }
      if (score >= NEEDED) { finish(true); return; }
    } else addMiss();
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawGuard();
      drawNote({ x: CX, y: CY - GUARD_R - 120 - Math.floor(game.time.elapsed * 4) % 2 * 12, dir: 'up', hit: false, life: 1, totalLife: 1 });
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 28, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.97, 40, '#554466');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PERFECT!' : 'BROKEN', W / 2, H * 0.35, 82, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (feedback > 0) feedback -= dt;
      beatTimer -= dt; if (beatTimer <= 0) { beatTimer = BEAT * (Math.random() < 0.3 ? 2 : 1); spawnNote(); }
      for (var ni = notes.length - 1; ni >= 0; ni--) {
        var n = notes[ni]; n.life -= dt; var prog = 1 - n.life / n.totalLife;
        var dx = CX - n.x, dy = CY - n.y, d = Math.hypot(dx, dy);
        if (d > 0 && n.life > 0) { var sp = d / n.life; n.x += dx / d * sp * dt; n.y += dy / d * sp * dt; }
        if (n.hit && prog > 0.9) { notes.splice(ni, 1); continue; }
        if (n.life <= 0) { if (!n.hit) { addMiss(); if (done) return; } notes.splice(ni, 1); }
      }
      for (var pi2 = particles.length - 1; pi2 >= 0; pi2--) { var p = particles[pi2]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pi2, 1); }
    }

    // ---- 描画 ----
    background(); drawGuard();
    for (var ni2 = 0; ni2 < notes.length; ni2++) drawNote(notes[ni2]);
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 5, snap(particles[pp].y) - 5, 10, 10, C.b, particles[pp].life * 2.5);
    if (feedback > 0) game.draw.rect(0, 0, W, H, feedbackOk ? C.b : C.a, feedback * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) game.draw.rect(snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56) - 10, 208, 20, 20, mm < misses ? C.a : '#1a0a20');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);

// 150-whack-rhythm.js
// リズムモグラ — 音楽のビートに合わせてタイミングよくモグラを叩く快感
// 操作: タップで叩く
// 成功: 4ヒット  失敗: 5回外す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、縁日） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BEAT MOLE';
  var HOW_TO_PLAY = 'TAP MOLES ON THE BEAT';
  var MAX_TIME = 15;             // 修正2: 30 → 15
  var NEEDED   = 4;              // 修正2: 40 → 4
  var MAX_MISS = 5;
  var TOP    = 220;
  var BPM = 100, BEAT = 60 / 100, HOLE_R = 72;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var holes, beatTimer, beatCount, beatFlash, score, misses, timeLeft, done, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var py = -r; py <= r; py += step) for (var px = -r; px <= r; px += step) {
      if (px * px + py * py <= r * r) game.draw.rect(cx + px, cy + py, step, step, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }

  function timeBar() {
    var lit = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
  }

  function background() {
    game.draw.clear(C.bg);
    if (beatFlash > 0) for (var a = 0; a < Math.PI * 2; a += 0.2) game.draw.rect(snap(W / 2 + Math.cos(a) * (300 + beatFlash * 200)) - 6, snap(H / 2 + Math.sin(a) * (300 + beatFlash * 200)) - 6, 12, 12, C.d, beatFlash);
  }

  // ── モグラスプライト（多矩形でキャラクター性） ──
  function drawHole(h) {
    pc(h.x, h.y, HOLE_R, '#0a0018', 0.9);
    pc(h.x, h.y, HOLE_R - 12, C.d, 0.5);
    if (h.hitTimer > 0) { txt('★', h.x, h.y - 20, 64, C.c); return; }
    if (!h.mole) return;
    var rise = Math.min(h.riseT / 0.15, 1), my = h.y - rise * 56;
    pc(h.x, my, 52, C.f, 1);                        // 体
    pc(h.x, my - 8, 40, C.c, 1);                    // 顔
    game.draw.rect(h.x - 18, my - 20, 12, 12, C.bg); // 目
    game.draw.rect(h.x + 6, my - 20, 12, 12, C.bg);
    game.draw.rect(h.x - 8, my - 4, 16, 12, C.a);   // 鼻
    game.draw.rect(h.x - 24, my - 44, 12, 16, C.f); // 耳
    game.draw.rect(h.x + 12, my - 44, 12, 16, C.f);
    var urgency = h.riseT / h.maxT;
    if (urgency > 0.65 && Math.floor(game.time.elapsed * 8) % 2 === 0) pc(h.x, my, 56, C.e, 0.3);
  }

  function popMole() {
    var empty = holes.filter(function(h) { return !h.mole && h.hitTimer <= 0; });
    if (empty.length === 0) return;
    var num = Math.min(1 + Math.floor(score / 2), 2);
    for (var i = 0; i < num && empty.length > 0; i++) {
      var idx = Math.floor(Math.random() * empty.length);
      var h = empty[idx]; empty.splice(idx, 1);
      h.mole = true; h.riseT = 0; h.maxT = BEAT * (2.0 + Math.random() * 1.5);
    }
  }

  function initGame() {
    holes = [];
    for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) holes.push({ x: snap(W * (0.22 + c * 0.28)), y: snap(TOP + 160 + r * 300), mole: false, riseT: 0, maxT: 0, hitTimer: 0 });
    beatTimer = 0; beatCount = 0; beatFlash = 0;
    score = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = [];
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 25) : score * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var hi = 0; hi < holes.length; hi++) {
      var h = holes[hi];
      if (!h.mole || h.hitTimer > 0) continue;
      var my = h.y - Math.min(h.riseT / 0.15, 1) * 56;
      if (Math.hypot(x - h.x, y - my) < 80) {
        h.hit = true; h.hitTimer = 0.4; h.mole = false; score++;
        game.audio.play('se_success', 0.7);
        for (var pi = 0; pi < 8; pi++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: h.x, y: my, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180 - 100, life: 0.4 }); }
        if (score >= NEEDED) { finish(true); return; }
        return;
      }
    }
    misses++;
    game.audio.play('se_failure', 0.5);
    if (misses >= MAX_MISS) { finish(false); return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      drawHole({ x: W / 2, y: H * 0.45, mole: true, riseT: 0.2, maxT: 2, hitTimer: 0 });
      txt(GAME_TITLE, W / 2, H * 0.16, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 32, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.80, 64, C.a);
        txt('TAP TO START', W / 2, H * 0.86, 50, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.92, 40, '#886699');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ON BEAT!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      beatTimer += dt;
      if (beatTimer >= BEAT) { beatTimer -= BEAT; beatCount++; beatFlash = 0.2; if (beatCount % 2 === 0) popMole(); }
      for (var hi = 0; hi < holes.length; hi++) {
        var h = holes[hi];
        if (h.mole) {
          h.riseT += dt;
          if (h.riseT >= h.maxT) {
            h.mole = false; misses++;
            game.audio.play('se_failure', 0.3);
            if (misses >= MAX_MISS) { finish(false); return; }
          }
        }
        if (h.hitTimer > 0) h.hitTimer -= dt;
      }
    }
    if (beatFlash > 0) beatFlash -= dt;
    for (var p = 0; p < particles.length; p++) { particles[p].x += particles[p].vx * dt; particles[p].y += particles[p].vy * dt; particles[p].vy += 500 * dt; particles[p].life -= dt; }
    particles = particles.filter(function(pt) { return pt.life > 0; });

    // ---- 描画 ----
    background();
    for (var hi2 = 0; hi2 < holes.length; hi2++) drawHole(holes[hi2]);
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 4, snap(particles[pp].y) - 4, 8, 8, C.c, particles[pp].life * 2.5);
    // ビートドット
    for (var bd = 0; bd < 4; bd++) game.draw.rect(snap(W / 2 + (bd - 1.5) * 64) - 12, H - 100, 24, 24, beatCount % 4 === bd ? C.b : '#2a0a3a');

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) {
      var mx = snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56);
      game.draw.rect(mx - 12, 208, 24, 24, mm < misses ? C.a : '#2a0a3a');
    }
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    state = S.ATTRACT;
    initGame();
  });
})(game);

// 389-meteor-shower.js
// 流星雨 — 流れ星が飛んだ向きを覚え、消えた後に同じ方向へスワイプして願いを叶える
// 操作: 流星の進行方向と同じ向きにスワイプ
// 成功: 4個 正解  失敗: 3回 間違える or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、夜空） ──
  var C = { bg:'#02030e', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'METEOR SHOWER';
  var HOW_TO_PLAY = 'SWIPE THE WAY THE METEOR FLEW · MAKE YOUR WISH';
  var MAX_TIME = 15;
  var NEEDED   = 4;          // 修正2: 10 → 4
  var MAX_WRONG = 3;         // 修正2: 5 → 3
  var DIRS = ['up', 'down', 'left', 'right'];
  var VEC = { up: { dx: 0, dy: -1 }, down: { dx: 0, dy: 1 }, left: { dx: -1, dy: 0 }, right: { dx: 1, dy: 0 } };
  var ARROW = { up: '^', down: 'v', left: '<', right: '>' };

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var stars, meteor, showMeteor, waiting, mdir, correct, wrong, timeLeft, done, particles, fbText, fbCol, fbTimer, nextTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a0a20');
  }

  function background() { game.draw.clear(C.bg); for (var si = 0; si < stars.length; si++) { var s = stars[si]; game.draw.rect(s.x, s.y, s.r, s.r, C.g, 0.4 + Math.sin(game.time.elapsed * 2 + s.tw) * 0.3); } }

  function initStars() { stars = []; for (var i = 0; i < 70; i++) stars.push({ x: snap(Math.random() * W), y: snap(Math.random() * H), r: Math.random() < 0.5 ? 4 : 8, tw: Math.random() * Math.PI * 2 }); }

  function spawnMeteor() {
    var dir = DIRS[Math.floor(Math.random() * DIRS.length)]; mdir = dir; var v = VEC[dir], sx, sy;
    if (dir === 'right') { sx = 0; sy = snap(H * 0.3 + Math.random() * H * 0.4); }
    else if (dir === 'left') { sx = W; sy = snap(H * 0.3 + Math.random() * H * 0.4); }
    else if (dir === 'down') { sx = snap(W * 0.2 + Math.random() * W * 0.6); sy = 0; }
    else { sx = snap(W * 0.2 + Math.random() * W * 0.6); sy = H; }
    meteor = { x: sx, y: sy, vx: v.dx * 900, vy: v.dy * 900, trail: [] }; showMeteor = true; waiting = false;
  }

  function initGame() { meteor = null; showMeteor = false; waiting = false; correct = 0; wrong = 0; timeLeft = MAX_TIME; done = false; particles = []; fbText = ''; fbCol = C.b; fbTimer = 0; nextTimer = 0.8; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (correct * 600 + Math.ceil(timeLeft) * 100) : correct * 250;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || !waiting) return;
    waiting = false;
    if (dir === mdir) { correct++; fbText = 'WISH GRANTED!'; fbCol = C.b; fbTimer = 0.7; game.audio.play('se_success', 0.5); for (var pi = 0; pi < 10; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.45, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.7, col: C.c }); } if (correct >= NEEDED) { finish(true); return; } }
    else { wrong++; fbText = 'WRONG WAY'; fbCol = C.a; fbTimer = 0.6; game.audio.play('se_failure', 0.4); if (wrong >= MAX_WRONG) { finish(false); return; } }
    nextTimer = 1.0;
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      pc(W * 0.4, H * 0.4, 18, C.c, 0.9); pc(W * 0.42, H * 0.42, 10, C.g, 0.9);
      txt(GAME_TITLE, W / 2, H * 0.16, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.91, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'WISHES GRANTED!' : 'MISSED THE SKY', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (fbTimer > 0) fbTimer -= dt;
      if (!showMeteor && !waiting) { nextTimer -= dt; if (nextTimer <= 0) spawnMeteor(); }
      if (showMeteor && meteor) {
        meteor.trail.push({ x: meteor.x, y: meteor.y, life: 0.5 }); if (meteor.trail.length > 22) meteor.trail.shift();
        meteor.x += meteor.vx * dt; meteor.y += meteor.vy * dt;
        for (var ti = meteor.trail.length - 1; ti >= 0; ti--) meteor.trail[ti].life -= dt * 2.5;
        if (meteor.x < -80 || meteor.x > W + 80 || meteor.y < -80 || meteor.y > H + 80) { showMeteor = false; waiting = true; }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    if (showMeteor && meteor) { for (var ti2 = 0; ti2 < meteor.trail.length; ti2++) { var t = meteor.trail[ti2]; if (t.life > 0) pc(t.x, t.y, 8 * t.life, C.d, t.life * 0.6); } pc(meteor.x, meteor.y, 16, C.c, 0.9); pc(meteor.x, meteor.y, 8, C.g, 0.9); }
    if (waiting) {
      txt('SWIPE THE WAY?', W / 2, H * 0.44, 56, C.e);
      var blink = Math.floor(game.time.elapsed * 4) % 2 === 0;
      txt('^', W / 2, H * 0.32, 60, blink ? C.d : '#334'); txt('v', W / 2, H * 0.56, 60, blink ? C.d : '#334');
      txt('<', W / 2 - 180, H * 0.44, 60, blink ? C.d : '#334'); txt('>', W / 2 + 180, H * 0.44, 60, blink ? C.d : '#334');
    }
    if (fbTimer > 0) txt(fbText, W / 2, snap(H * 0.66), 54, fbCol);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(correct + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var wi = 0; wi < MAX_WRONG; wi++) game.draw.rect(snap(W / 2 + (wi - (MAX_WRONG - 1) / 2) * 56) - 10, 224, 20, 20, wi < wrong ? C.a : '#0a0a20');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initStars();
    initGame();
  });
})(game);

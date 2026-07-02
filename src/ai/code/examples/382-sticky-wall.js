// 382-sticky-wall.js
// スティッキーウォール — 左右の壁に交互に張り付きながら跳ね上がり、上へ上へ登っていく
// 操作: 壁に張り付いた状態でタップして反対の壁へジャンプ
// 成功: 600px 登る  失敗: 3回 落下 or 12秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、縦穴） ──
  var C = { bg:'#080618', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', wallL:'#1a2a5a', wallR:'#1a4a2a' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'STICKY WALL';
  var HOW_TO_PLAY = 'STICK TO A WALL · TAP TO JUMP TO THE OTHER SIDE · CLIMB';
  var MAX_TIME = 12;
  var GOAL = 600;            // 修正2: 2000px → 600px
  var MAX_FALLS = 3;
  var WALL_W = snap(W * 0.12), GRAVITY = 1300, JUMP_V = -1100, PLAYER_R = 26;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var px, py, pvx, pvy, stuck, climb, camY, falls, timeLeft, done, particles, trail;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function climbBar() {
    var t = Math.ceil(Math.min(1, climb / GOAL) * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#181030');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, 0, WALL_W, H, C.wallL, 0.9); game.draw.rect(W - WALL_W, 0, WALL_W, H, C.wallR, 0.9);
    for (var wi = 0; wi < H / 60 + 1; wi++) { var wy = snap((wi * 60 + camY * 0.3) % H); game.draw.rect(8, wy, WALL_W - 16, 8, C.e, 0.3); game.draw.rect(W - WALL_W + 8, wy, WALL_W - 16, 8, C.b, 0.3); }
  }

  function initGame() { px = W / 2; py = H - 80; pvx = 0; pvy = 0; stuck = 0; climb = 0; camY = 0; falls = 0; timeLeft = MAX_TIME; done = false; particles = []; trail = []; }

  function respawn() { falls++; game.audio.play('se_failure', 0.5); for (var k = 0; k < 8; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: px, y: py - camY, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.5, col: C.c }); } px = W / 2; py = H - 80 + camY; pvx = 0; pvy = 0; stuck = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(climb) * 4 + (MAX_FALLS - falls) * 500 + Math.ceil(timeLeft) * 100) : Math.round(climb) * 2;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawPlayer() {
    var sy = py - camY;
    pc(px, sy, PLAYER_R, C.c, 0.9); pc(px - 8, sy - 8, 8, C.g, 0.85);
    if (stuck !== 0) { var sx = stuck < 0 ? px - PLAYER_R - 12 : px + PLAYER_R + 12; pc(sx, sy, 10, C.f, 0.5 + Math.sin(game.time.elapsed * 6) * 0.2); }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (stuck !== 0) { var dir = stuck > 0 ? -1 : 1; pvx = dir * 620; pvy = JUMP_V; stuck = 0; game.audio.play('se_tap', 0.4); for (var k = 0; k < 4; k++) { var a = Math.random() * Math.PI; particles.push({ x: px, y: py - camY, vx: dir * 80 + Math.cos(a) * 50, vy: -Math.abs(Math.sin(a)) * 80, life: 0.4, col: C.e }); } }
    else if (py > H - 100 + camY) { pvx = (Math.random() < 0.5 ? -1 : 1) * 520; pvy = JUMP_V; game.audio.play('se_tap', 0.3); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (px === undefined) initGame(); background(); drawPlayer();
      txt(GAME_TITLE, W / 2, H * 0.30, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.36, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.60, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.66, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'TOP REACHED!' : 'FELL', W / 2, H * 0.35, 76, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (stuck !== 0) { pvy = Math.min(pvy + 80 * dt, 60); py += pvy * dt; }
      else {
        pvy += GRAVITY * dt; px += pvx * dt; py += pvy * dt;
        if (px - PLAYER_R <= WALL_W && pvx < 0) { px = WALL_W + PLAYER_R; stuck = -1; pvx = 0; pvy = 0; game.audio.play('se_tap', 0.2); }
        else if (px + PLAYER_R >= W - WALL_W && pvx > 0) { px = W - WALL_W - PLAYER_R; stuck = 1; pvx = 0; pvy = 0; game.audio.play('se_tap', 0.2); }
        if (px < -PLAYER_R || px > W + PLAYER_R) { respawn(); if (falls >= MAX_FALLS) { finish(false); return; } }
      }
      var sy = py - camY;
      if (sy < H * 0.45) { var delta = H * 0.45 - sy; camY -= delta; climb = Math.max(climb, -camY); }
      if (py - camY > H + 60) { respawn(); if (falls >= MAX_FALLS) { finish(false); return; } }
      if (climb >= GOAL) { for (var k = 0; k < 18; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: px, y: py - camY, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.8, col: C.c }); } finish(true); return; }
      trail.push({ x: px, y: py - camY, life: 0.4 }); if (trail.length > 16) trail.shift();
      for (var ti = trail.length - 1; ti >= 0; ti--) { trail[ti].life -= dt * 2.5; if (trail[ti].life <= 0) trail.splice(ti, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var ti2 = 0; ti2 < trail.length; ti2++) pc(trail[ti2].x, trail[ti2].y, 8 * trail[ti2].life, C.e, trail[ti2].life * 0.5);
    drawPlayer();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    climbBar();
    txt(Math.round(climb) + 'px', W / 2, 96, 44, C.c);
    txt(Math.round(climb) + ' / ' + GOAL + 'px', W / 2, 168, 44, C.b);
    for (var fi = 0; fi < MAX_FALLS; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FALLS - 1) / 2) * 56) - 10, 224, 20, 20, fi < falls ? C.a : '#181030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);

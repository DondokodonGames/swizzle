// 378-grappling-hook.js
// グラップリングフック — 足場にフックを打ち込んで振り子で飛び移り、ゴールの星まで登る
// 操作: タップした方向へフックを射出、もう一度タップでロープを離す
// 成功: ゴールに 到達  失敗: 3回 落下 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、夜の摩天楼） ──
  var C = { bg:'#050810', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'GRAPPLE UP';
  var HOW_TO_PLAY = 'TAP TO FIRE HOOK · TAP AGAIN TO RELEASE · REACH THE STAR';
  var MAX_TIME = 15;
  var MAX_FALLS = 3;
  var GRAVITY = 900, PLAYER_R = 24, HOOK_SPEED = 1400;

  // 足場（修正2: 段数を減らしゴールを近く） ──
  var platforms = [
    { x: 0, y: snap(H * 0.88), w: 360, h: 26 },
    { x: snap(W * 0.5), y: snap(H * 0.70), w: 280, h: 24 },
    { x: snap(W * 0.08), y: snap(H * 0.52), w: 260, h: 24 },
    { x: snap(W * 0.5), y: snap(H * 0.34), w: 300, h: 26 }
  ];
  var goalX = snap(platforms[3].x + platforms[3].w / 2), goalY = snap(platforms[3].y - 44);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var px, py, pvx, pvy, hookX, hookY, hookVX, hookVY, hookFired, attached, swinging, ancX, ancY, ropeLen, falls, timeLeft, done, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.2) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1020');
  }

  function background() { game.draw.clear(C.bg); for (var gy = 0; gy < H; gy += 96) game.draw.rect(0, gy, W, 2, C.d, 0.1); }

  function respawn() { px = snap(W * 0.13); py = platforms[0].y - PLAYER_R; pvx = 0; pvy = 0; hookFired = false; attached = false; swinging = false; game.audio.play('se_failure', 0.4); }

  function initGame() { respawn(); falls = 0; timeLeft = MAX_TIME; done = false; particles = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (4000 + (MAX_FALLS - falls) * 800 + Math.ceil(timeLeft) * 100) : 0;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var i = 0; i < platforms.length; i++) { var pl = platforms[i]; game.draw.rect(pl.x, pl.y, pl.w, pl.h, C.d, 0.9); game.draw.rect(pl.x, pl.y, pl.w, 6, C.e, 0.7); }
    // ゴール
    var gp = 24 + 4 * (Math.floor(game.time.elapsed * 4) % 2); ring(goalX, goalY, gp, C.c, 0.6); pc(goalX, goalY, 20, C.c, 0.9); txt('G', goalX, goalY + 10, 28, '#000');
    // ロープ
    if (attached && swinging) { pline(px, py, ancX, ancY, C.b, 0.7, 4); pc(ancX, ancY, 10, C.f, 0.9); }
    if (hookFired) { pline(px, py, hookX, hookY, C.b, 0.7, 4); pc(hookX, hookY, 8, C.c, 0.9); }
    // プレイヤー
    pc(px, py, PLAYER_R, C.a, 0.9); pc(px, py - 8, 12, C.g, 0.9);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (!hookFired && !attached) { hookX = px; hookY = py; var dx = x - px, dy = y - py, len = Math.max(1, Math.hypot(dx, dy)); hookVX = dx / len * HOOK_SPEED; hookVY = dy / len * HOOK_SPEED; hookFired = true; swinging = false; game.audio.play('se_tap', 0.3); }
    else if (attached || swinging) { hookFired = false; attached = false; swinging = false; game.audio.play('se_tap', 0.2); }
    else if (hookFired) hookFired = false;
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (px === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.98, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background(); drawScene();
      txt(resultSuccess ? 'SUMMIT!' : 'FELL DOWN', W / 2, H * 0.14, 72, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.20, 52, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.26, 44, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      // フック飛行
      if (hookFired && !attached) {
        hookX += hookVX * dt; hookY += hookVY * dt;
        for (var i = 0; i < platforms.length; i++) { var pl = platforms[i]; if (hookX >= pl.x && hookX <= pl.x + pl.w && hookY >= pl.y && hookY <= pl.y + pl.h) { ancX = hookX; ancY = pl.y; attached = true; hookFired = false; swinging = true; ropeLen = Math.hypot(ancX - px, ancY - py); game.audio.play('se_success', 0.3); break; } }
        if (hookX < 0 || hookX > W || hookY < 0 || hookY > H) hookFired = false;
      }
      // プレイヤー物理
      if (swinging && attached) {
        pvy += GRAVITY * dt; pvx *= (1 - 0.01 * dt); px += pvx * dt; py += pvy * dt;
        var dx2 = px - ancX, dy2 = py - ancY, d2 = Math.max(1, Math.hypot(dx2, dy2));
        if (d2 > ropeLen) { var nx = dx2 / d2, ny = dy2 / d2; px = ancX + nx * ropeLen; py = ancY + ny * ropeLen; var vr = pvx * nx + pvy * ny; pvx -= vr * nx; pvy -= vr * ny; }
      } else { pvy += GRAVITY * dt; px += pvx * dt; py += pvy * dt; pvx *= (1 - 0.3 * dt); }
      if (px < PLAYER_R) { px = PLAYER_R; pvx = Math.abs(pvx) * 0.5; }
      if (px > W - PLAYER_R) { px = W - PLAYER_R; pvx = -Math.abs(pvx) * 0.5; }
      // 着地
      for (var j = 0; j < platforms.length; j++) { var pl2 = platforms[j]; if (px > pl2.x - PLAYER_R && px < pl2.x + pl2.w + PLAYER_R && py + PLAYER_R > pl2.y && py + PLAYER_R < pl2.y + pl2.h + 30 && pvy > 0 && !swinging) { py = pl2.y - PLAYER_R; pvy = 0; pvx *= 0.8; } }
      // 落下
      if (py > H + 60) { falls++; respawn(); if (falls >= MAX_FALLS) { finish(false); return; } }
      // ゴール
      if (Math.hypot(px - goalX, py - goalY) < 52) { for (var k = 0; k < 16; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: goalX, y: goalY, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 0.7, col: C.c }); } finish(true); return; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    for (var fi = 0; fi < MAX_FALLS; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FALLS - 1) / 2) * 56) - 10, 164, 20, 20, fi < falls ? C.a : '#0a1020');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);

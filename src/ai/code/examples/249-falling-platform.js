// 249-falling-platform.js
// フォールプラットフォーム — 崩れ落ちる足場を左右に飛び移り、迫り上がる奈落から高く登り続ける
// 操作: 左右タップで上の足場へ飛ぶ
// 成功: 高度10m到達  失敗: 落下 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、崩落タワー） ──
  var C = { bg:'#06080f', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'FALLING PLATFORM';
  var HOW_TO_PLAY = 'TAP LEFT / RIGHT TO LEAP UPWARD';
  var MAX_TIME = 15;
  var TOP = 220, PLAT_W = 300, PLAT_H = 22, GOAL_H = 10 * 80;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var platforms, player, scrollSpeed, scrollTotal, timeLeft, done, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1424');
  }

  function background() { game.draw.clear(C.bg); }

  function genPlatform(y) { var x = Math.random() < 0.5 ? W * 0.25 - PLAT_W / 2 : W * 0.75 - PLAT_W / 2; platforms.push({ x: snap(x), y: y, w: PLAT_W, h: PLAT_H, vy: 0, falling: Math.random() < 0.3, fallTimer: 0, active: true }); }

  function initPlatforms() { platforms = []; platforms.push({ x: snap(W / 2 - PLAT_W / 2), y: snap(H * 0.7), w: PLAT_W, h: PLAT_H, vy: 0, falling: false, fallTimer: 0, active: true }); for (var i = 1; i <= 10; i++) genPlatform(snap(H * 0.7 - i * 150)); }

  function initGame() { initPlatforms(); player = { x: W / 2, y: H * 0.7 - 30, onPlatform: 0, jumping: false, jumpTimer: 0 }; scrollSpeed = 60; scrollTotal = 0; timeLeft = MAX_TIME; done = false; particles = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (600 + Math.ceil(timeLeft) * 100) : Math.floor(scrollTotal / 80) * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawPlatform(p) { var fall = p.vy > 0; game.draw.rect(p.x, snap(p.y), p.w, p.h, fall ? C.a : C.e, 0.85); game.draw.rect(p.x, snap(p.y), p.w, 6, C.g, 0.4); if (p.falling && p.fallTimer > 0) game.draw.rect(p.x, snap(p.y), snap(p.w * p.fallTimer / 0.5), 4, C.f, 0.8); }

  function drawPlayer() { pc(player.x, player.y, 28, C.c, 0.95); game.draw.rect(snap(player.x) - 10, snap(player.y) - 8, 8, 8, '#000'); game.draw.rect(snap(player.x) + 2, snap(player.y) - 8, 8, 8, '#000'); }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || player.jumping || player.onPlatform < 0) return;
    var side = x < W / 2 ? 'left' : 'right', best = -1, bestY = Infinity;
    for (var pi = 0; pi < platforms.length; pi++) { var pl = platforms[pi]; if (!pl.active) continue; var s = pl.x + pl.w / 2 < W / 2 ? 'left' : 'right'; if (s !== side) continue; var dy = player.y - pl.y; if (dy > 30 && dy < bestY) { bestY = dy; best = pi; } }
    if (best >= 0) { var t = platforms[best]; player.jumping = true; player.onPlatform = -1; player.jumpTimer = 0; player.sx = player.x; player.sy = player.y; player.tx = t.x + t.w / 2; player.ty = t.y - 30; player.land = best; game.audio.play('se_tap', 0.4); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!platforms) initGame(); background(); for (var i = 0; i < platforms.length; i++) drawPlatform(platforms[i]); drawPlayer();
      txt(GAME_TITLE, W / 2, H * 0.14, 72, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.97, 40, '#445566');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SUMMIT!' : 'FELL', W / 2, H * 0.35, 82, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      var scroll = scrollSpeed * dt; scrollTotal += scroll;
      for (var pi2 = 0; pi2 < platforms.length; pi2++) platforms[pi2].y += scroll;
      player.y += scroll; if (player.jumping) { player.sy += scroll; player.ty += scroll; }
      if (scrollTotal >= GOAL_H) { finish(true); return; }
      scrollSpeed = 60 + scrollTotal / GOAL_H * 60;
      if (player.jumping) {
        player.jumpTimer += dt; var t = Math.min(1, player.jumpTimer / 0.35), arc = Math.sin(t * Math.PI) * -120;
        player.x = player.sx + (player.tx - player.sx) * t; player.y = player.sy + (player.ty - player.sy) * t + arc;
        if (t >= 1) { player.jumping = false; player.onPlatform = player.land; var lp = platforms[player.land]; if (lp && lp.falling) lp.fallTimer = 0.5; game.audio.play('se_tap', 0.3); }
      }
      for (var pi3 = 0; pi3 < platforms.length; pi3++) { var pl2 = platforms[pi3]; if (!pl2.active) continue; if (pl2.falling && pl2.fallTimer > 0) { pl2.fallTimer -= dt; if (pl2.fallTimer <= 0) pl2.vy = 320; } if (pl2.vy > 0) pl2.y += pl2.vy * dt; }
      if (!player.jumping && player.onPlatform >= 0) { var onp = platforms[player.onPlatform]; if (!onp || !onp.active || onp.y > H + 100) player.onPlatform = -1; else player.y = onp.y - 30; }
      if (player.y > H + 100) { finish(false); return; }
      for (var pi5 = platforms.length - 1; pi5 >= 0; pi5--) if (platforms[pi5].y > H + 60) platforms.splice(pi5, 1);
      var hi = Infinity; for (var pi6 = 0; pi6 < platforms.length; pi6++) if (platforms[pi6].y < hi) hi = platforms[pi6].y;
      while (hi > TOP - 150) { hi -= 150; genPlatform(hi); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var pi7 = 0; pi7 < platforms.length; pi7++) drawPlatform(platforms[pi7]);
    drawPlayer();

    var meters = Math.floor(scrollTotal / 80);
    game.draw.rect(W - 20, TOP, 12, H - TOP - 180, C.d, 0.3);
    game.draw.rect(W - 20, TOP + (H - TOP - 180) * (1 - Math.min(1, scrollTotal / GOAL_H)), 12, (H - TOP - 180) * Math.min(1, scrollTotal / GOAL_H), C.b, 0.8);
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(meters + ' / 10m', W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);

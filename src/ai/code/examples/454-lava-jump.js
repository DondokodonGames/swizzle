// 454-lava-jump.js
// 溶岩ジャンプ — 上昇する溶岩から逃げ、自動で跳ねる主人公を左右に操ってプラットフォームを登る
// 操作: 画面の左半分/右半分をタップで着地時に左右へ移動（接地すると自動ジャンプ）
// 成功: 高さ600m 到達  失敗: 溶岩に飲まれる or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、火山洞窟） ──
  var C = { bg:'#12060a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'LAVA JUMP';
  var HOW_TO_PLAY = 'TAP LEFT / RIGHT TO STEER · AUTO-JUMP · CLIMB AWAY FROM THE LAVA';
  var MAX_TIME = 20;
  var GOAL = 600;            // 修正2: 2000m → 600m
  var GRAVITY = 1800, JUMP_VEL = -880, PLAT_W = 200, PLAT_H = 24;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var player, platforms, lavaY, lavaSpeed, scrollY, maxHeight, moveDir, timeLeft, done, lavaAnim, particles, flash, flashCol;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#2a1008');
  }

  function altBar() {
    var t = Math.ceil(Math.min(1, maxHeight / GOAL) * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(W - 60, H - 120 - i * 72, 40, 60, i < t ? C.f : '#2a1008');
  }

  function background() { game.draw.clear(C.bg); for (var cw = 0; cw < 6; cw++) { var ry = (cw * 340 + scrollY) % (H + 200) - 100; pc(48, ry, 30, '#3a1810', 0.5); pc(W - 60, ry + 130, 26, '#3a1810', 0.4); } }

  function addPlatform(y) { platforms.push({ x: snap(120 + Math.random() * (W - 360)), y: y, w: Math.max(120, PLAT_W - Math.floor(maxHeight / 120) * 12) }); }

  function initGame() {
    platforms = []; maxHeight = 0; scrollY = 0; var y = H * 0.72;
    for (var i = 0; i < 14; i++) { addPlatform(y); y -= 150 + Math.random() * 70; }
    player = { x: platforms[0].x + platforms[0].w / 2, y: platforms[0].y - 40, vx: 0, vy: 0, onGround: false };
    lavaY = H + 80; lavaSpeed = 90; moveDir = 0; timeLeft = MAX_TIME; done = false; lavaAnim = 0; particles = []; flash = 0; flashCol = C.b;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (maxHeight * 30 + Math.ceil(timeLeft) * 100) : maxHeight * 20;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    moveDir = x < W / 2 ? -1 : 1; player.vx = moveDir * 360; game.audio.play('se_tap', 0.2);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!player) initGame(); background();
      for (var ai = 0; ai < platforms.length; ai++) { var pa = platforms[ai], pya = pa.y + scrollY; if (pya < -40 || pya > H + 40) continue; game.draw.rect(pa.x, snap(pya), pa.w, PLAT_H, C.f, 0.8); game.draw.rect(pa.x, snap(pya), pa.w, 6, C.c, 0.7); }
      pc(player.x, player.y, 24, C.g, 0.9); pc(player.x, player.y - 8, 14, C.e, 0.6);
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.60, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.66, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SUMMIT!' : 'BURNED UP', W / 2, H * 0.35, 72, resultSuccess ? C.b : C.a);
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
      lavaAnim += dt * 3;
      // 横移動（惰性）
      player.vx *= (1 - dt * 2.5); player.x += player.vx * dt;
      if (player.x < 40) { player.x = 40; player.vx = Math.abs(player.vx) * 0.4; } if (player.x > W - 40) { player.x = W - 40; player.vx = -Math.abs(player.vx) * 0.4; }
      // 縦（重力）
      player.vy += GRAVITY * dt; player.y += player.vy * dt; player.onGround = false;
      for (var pi2 = 0; pi2 < platforms.length; pi2++) {
        var p = platforms[pi2], py = p.y + scrollY;
        if (player.vy > 0 && player.y + 22 >= py && player.y + 22 <= py + PLAT_H + 22 && player.x > p.x && player.x < p.x + p.w) {
          player.y = py - 22; player.vy = JUMP_VEL; player.onGround = true; game.audio.play('se_tap', 0.25);
          for (var k = 0; k < 4; k++) { var a = Math.PI + (Math.random() - 0.5) * 1.4; particles.push({ x: player.x, y: player.y + 20, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, life: 0.4, col: C.c }); }
          break;
        }
      }
      // スクロール
      if (player.y < H * 0.4) { var sc = H * 0.4 - player.y; scrollY += sc; player.y += sc; lavaY += sc; }
      var h = Math.floor(scrollY / 10); if (h > maxHeight) { maxHeight = h; lavaSpeed = 90 + maxHeight * 0.05; }
      // 溶岩上昇
      lavaY -= lavaSpeed * dt;
      // プラットフォーム補充/除去
      var topY = 99999; for (var ti = 0; ti < platforms.length; ti++) topY = Math.min(topY, platforms[ti].y + scrollY);
      while (topY > -200) { var ny = topY - (150 + Math.random() * 70); addPlatform(ny - scrollY); topY = ny; }
      platforms = platforms.filter(function(pp) { return pp.y + scrollY < H + 100; });
      // 判定
      if (player.y + 24 > lavaY) { finish(false); return; }
      if (maxHeight >= GOAL) { finish(true); return; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var pt = particles[pp]; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt; if (pt.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var pi3 = 0; pi3 < platforms.length; pi3++) { var pl = platforms[pi3], ply = pl.y + scrollY; if (ply < -40 || ply > H + 40) continue; game.draw.rect(pl.x, snap(ply), pl.w, PLAT_H, C.f, 0.9); game.draw.rect(pl.x, snap(ply), pl.w, 6, C.c, 0.7); }
    pc(player.x, player.y, 24, C.g, 0.9); pc(player.x, player.y - 8, 14, C.e, 0.6);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    // 溶岩
    var lt = snap(lavaY); game.draw.rect(0, lt, W, H - lt + 100, C.a, 0.9);
    for (var lw = 0; lw < 9; lw++) pc(lw * (W / 8), lt, 20 + Math.sin(lavaAnim + lw) * 12, C.f, 0.8);
    game.draw.rect(0, lt - 8, W, 12, C.c, 0.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    altBar();
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(maxHeight + ' / ' + GOAL + 'm', W / 2, 168, 44, C.f);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);

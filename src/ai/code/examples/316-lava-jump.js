// 316-lava-jump.js
// 溶岩ジャンプ — 崩れる足場を飛び移り、下から迫る溶岩に飲まれる前に目標の高さへ登る
// 操作: タップでジャンプ（足場に乗ると崩れ始める）
// 成功: 500mまで登る  失敗: 溶岩に飲まれる

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、火山） ──
  var C = { bg:'#0a0200', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', lava:'#ff3300', plat:'#5c2e10' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'LAVA JUMP';
  var HOW_TO_PLAY = 'TAP TO JUMP · CLIMB BEFORE THE LAVA CATCHES YOU';
  var NEEDED_H = 500;        // 修正2: 2000m → 500m
  var GRAVITY = 1200, JUMP = -760, LAVA_RISE = 70;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var px, pWorldY, pVY, onGround, cameraY, maxH, platforms, lavaWorldY, done, particles, lavaP;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function heightBar() {
    var t = Math.ceil(Math.min(1, maxH / NEEDED_H) * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.c : '#2a1000');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, 0, W, H, '#1a0500', 0.4); }

  function addPlatform(worldY, x, w) { platforms.push({ x: x, worldY: worldY, w: w, crumble: 0 }); }

  function initGame() {
    platforms = []; px = W / 2; pVY = 0; onGround = false; cameraY = 0; maxH = 0; done = false; particles = []; lavaP = [];
    for (var i = 0; i < 18; i++) addPlatform(-i * 150, snap(Math.random() * (W - 200)), snap(120 + Math.random() * 160));
    addPlatform(snap(H * 0.55), snap(W / 2 - 110), 220);
    pWorldY = snap(H * 0.45); lavaWorldY = snap(H * 0.92);
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (maxH * 20 + 3000) : maxH * 20;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (onGround) { pVY = JUMP; onGround = false; game.audio.play('se_tap', 0.25); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      for (var i = 0; i < 6; i++) game.draw.rect(snap((i * 197) % (W - 160)), snap(H * 0.3 + i * 90), 160, 16, C.plat, 0.9);
      pc(W / 2, H * 0.36, 22, C.c, 0.95);
      game.draw.rect(0, snap(H * 0.88), W, H, C.lava, 0.9); game.draw.rect(0, snap(H * 0.88), W, 8, C.f, 0.6);
      txt(GAME_TITLE, W / 2, H * 0.14, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.f);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.52, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.58, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SUMMIT!' : 'MELTED', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('HEIGHT ' + maxH + 'm', W / 2, H * 0.45, 52, C.c);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.54, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.66, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      pVY += GRAVITY * dt; pWorldY += pVY * dt;
      var screenY = pWorldY - cameraY;
      if (screenY < H * 0.4) cameraY -= (H * 0.4 - screenY) * 0.15;
      var hM = Math.round(-pWorldY / 20 + H * 0.45 / 20); if (hM > maxH) maxH = hM;
      onGround = false;
      for (var pi = platforms.length - 1; pi >= 0; pi--) {
        var pl = platforms[pi];
        if (pVY > 0 && pWorldY + 22 >= pl.worldY && pWorldY + 22 <= pl.worldY + 34 && px + 18 >= pl.x && px - 18 <= pl.x + pl.w) {
          pWorldY = pl.worldY - 22; pVY = 0; onGround = true; pl.crumble += dt * 0.9; if (pl.crumble >= 1) platforms.splice(pi, 1);
        }
      }
      var highest = 0; for (var p3 = 0; p3 < platforms.length; p3++) if (platforms[p3].worldY < highest) highest = platforms[p3].worldY;
      while (highest > cameraY - H) { var ny = highest - 140 - Math.random() * 50; addPlatform(ny, snap(Math.random() * (W - 180)), snap(90 + Math.random() * 150)); highest = ny; }
      lavaWorldY -= LAVA_RISE * dt;
      if (Math.random() < 0.3) lavaP.push({ x: snap(Math.random() * W), y: lavaWorldY - cameraY - 10, vy: -80 - Math.random() * 60, life: 0.6 });
      for (var lp = lavaP.length - 1; lp >= 0; lp--) { lavaP[lp].y += lavaP[lp].vy * dt; lavaP[lp].vy += 300 * dt; lavaP[lp].life -= dt; if (lavaP[lp].life <= 0) lavaP.splice(lp, 1); }
      if (pWorldY > lavaWorldY - 10) { finish(false); return; }
      if (maxH >= NEEDED_H) { finish(true); return; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var p4 = 0; p4 < platforms.length; p4++) {
      var pl2 = platforms[p4], y = pl2.worldY - cameraY; if (y < -30 || y > H + 30) continue;
      var al = 1 - pl2.crumble;
      game.draw.rect(pl2.x, snap(y), pl2.w, 16, pl2.crumble > 0.5 ? '#3a1a08' : C.plat, al * 0.95);
      game.draw.rect(pl2.x, snap(y), pl2.w, 6, C.f, al * 0.4);
    }
    var pScreenY = pWorldY - cameraY;
    var gap = lavaWorldY - pWorldY;
    if (gap < 300) pc(px, pScreenY, 30, C.f, (1 - gap / 300) * 0.4);
    pc(px, pScreenY, 22, C.c, 0.95); pc(px - 6, pScreenY - 6, 6, C.g, 0.8);
    var lavaY = lavaWorldY - cameraY;
    game.draw.rect(0, snap(lavaY), W, H - lavaY, C.lava, 0.95);
    for (var lw = 0; lw < W; lw += 64) pc(lw + 32, lavaY, 28, C.f, 0.8);
    game.draw.rect(0, snap(lavaY) - 8, W, 16, C.c, 0.3);
    for (var lp2 = 0; lp2 < lavaP.length; lp2++) game.draw.rect(snap(lavaP[lp2].x) - 6, snap(lavaP[lp2].y) - 6, 12, 12, C.f, lavaP[lp2].life * 1.4);

    heightBar();
    txt(maxH + 'm', W / 2, 96, 44, C.c);
    txt(maxH + ' / ' + NEEDED_H + 'm', W / 2, 168, 46, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);

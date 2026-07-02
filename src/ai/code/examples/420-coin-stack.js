// 420-coin-stack.js
// 硬貨積み上げ — コインをタップで真下に落とし、中心を合わせてバランスよくタワーを積む
// 操作: スワイプ左右で落下位置を調整、タップで落とす（ずれると傾いて崩れる）
// 成功: 4枚 積む  失敗: タワーが崩れる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、両替所） ──
  var C = { bg:'#0f0a04', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', gold:'#ffb020' };
  var COIN = [{ col: C.gold, r: 46 }, { col: C.e, r: 40 }, { col: C.f, r: 50 }];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'COIN STACK';
  var HOW_TO_PLAY = 'SLIDE TO AIM · TAP TO DROP · KEEP THE TOWER BALANCED';
  var MAX_TIME = 15;
  var NEEDED   = 4;          // 修正2: 20 → 4
  var FLOOR_Y = snap(H * 0.80);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var coins, dropping, dropX, stacked, sway, timeLeft, done, particles, flash, collapsed;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1209');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, FLOOR_Y + 10, W, H, '#1a1209', 0.9); game.draw.rect(0, FLOOR_Y + 10, W, 4, C.f, 0.5); }

  function topCoin() { return coins.length > 0 ? coins[coins.length - 1] : null; }
  function topY() { var t = topCoin(); return t ? t.y - t.type.r : FLOOR_Y; }

  function spawnDrop() { dropping = { x: dropX, y: 220, type: COIN[Math.floor(Math.random() * COIN.length)], falling: false, wob: 0 }; }

  function initGame() { coins = []; dropX = W / 2; stacked = 0; sway = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; collapsed = false; spawnDrop(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (stacked * 600 + Math.ceil(timeLeft) * 100) : stacked * 250;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawCoins() {
    for (var ci = 0; ci < coins.length; ci++) { var c = coins[ci], lean = sway * (coins.length - ci) * 8, cx = c.x + lean; pc(cx, c.y, c.type.r, c.type.col, 0.9); pc(cx, c.y, c.type.r * 0.7, c.type.col, 0.5); pc(cx - c.type.r * 0.3, c.y - c.type.r * 0.3, c.type.r * 0.25, C.g, 0.3); }
    if (dropping) { var a = dropping.falling ? 0.95 : 0.65; pc(dropping.x, dropping.y, dropping.type.r, dropping.type.col, a); pc(dropping.x - dropping.type.r * 0.3, dropping.y - dropping.type.r * 0.3, dropping.type.r * 0.25, C.g, 0.3); if (!dropping.falling) game.draw.rect(snap(dropping.x) - 2, snap(dropping.y + dropping.type.r), 4, snap(topY() - dropping.y - dropping.type.r), C.g, 0.3); }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || collapsed || !dropping || dropping.falling) return;
    dropping.x = dropX; dropping.falling = true; game.audio.play('se_tap', 0.3);
  });

  game.onSwipe(function(d) {
    if (state !== S.PLAYING || done || !dropping || dropping.falling) return;
    if (d === 'left') dropX = Math.max(60, dropX - 80); else if (d === 'right') dropX = Math.min(W - 60, dropX + 80);
    dropping.x = dropX;
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!coins) initGame(); background(); drawCoins();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'STEADY STACK!' : 'TOPPLED', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
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
      if (coins.length > 2) { sway += Math.sin(game.time.elapsed * 1.5) * dt * (coins.length - 2) * 0.01; sway *= (1 - dt * 0.5); }
      if (Math.abs(sway) > 0.7 && !collapsed) { collapsed = true; game.audio.play('se_failure', 0.8); for (var k = 0; k < 20; k++) { var a = Math.random() * Math.PI * 2, ci = coins[Math.floor(Math.random() * Math.max(1, coins.length))]; if (ci) particles.push({ x: ci.x, y: ci.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300 - 200, life: 0.8, col: ci.type.col }); } setTimeout(function() { finish(false); }, 700); }
      if (dropping && dropping.falling) {
        dropping.y += 700 * dt; var ly = topY() - dropping.type.r;
        if (dropping.y >= ly) { dropping.y = ly; var top = topCoin(), tx = top ? top.x : W / 2, off = dropping.x - tx; sway += off * 0.006; coins.push({ x: dropping.x, y: dropping.y, type: dropping.type }); stacked++; dropping = null; game.audio.play('se_tap', 0.5); if (stacked >= NEEDED) { finish(true); return; } spawnDrop(); }
      } else if (dropping && !dropping.falling) dropping.x = dropX + Math.sin(game.time.elapsed * 4) * 8;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawCoins();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    var dg = Math.abs(sway) / 0.7; if (dg > 0.4) game.draw.rect(0, 0, W, H, C.a, dg * 0.06);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.b, flash * 0.06);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(stacked + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);

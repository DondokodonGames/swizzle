// 575-icicle-drop.js
// アイシクルドロップ — 天井から落ちてくる氷柱を、タップ/スワイプで左右に動いて避け続ける
// 操作: タップした位置へ移動（スワイプでも移動）。落下前に警告が光る氷柱を見て回避
// 成功: 12秒 生き残る  失敗: 氷柱に 3回 直撃

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、氷穴） ──
  var C = { bg:'#04080f', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ICICLE DROP';
  var HOW_TO_PLAY = 'TAP / SWIPE TO DODGE · WATCH THE WARNING GLOW BEFORE THEY FALL';
  var MAX_TIME = 12;
  var MAX_HITS = 3;
  var PLAYER_R = 36, FLOOR_Y = snap(H * 0.86);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var player, icicles, hits, timeLeft, done, particles, flash, nextIcicle, invincible;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a1420');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, 0, W, 20, C.e, 0.7); game.draw.rect(0, FLOOR_Y, W, H - FLOOR_Y, '#1a3a5a', 0.95); game.draw.rect(0, FLOOR_Y, W, 12, C.d, 0.6); }

  function spawnIcicle() { var h = 60 + Math.random() * 110; icicles.push({ x: snap(80 + Math.random() * (W - 160)), y: -h, w: 24 + Math.random() * 18, h: h, vy: 0, dropping: false, warning: 1.0 + Math.random() * 1.0, warnTimer: 0 }); }

  function initGame() { player = { x: W / 2, y: snap(H * 0.78), targetX: W / 2 }; icicles = []; hits = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; nextIcicle = 0.8; invincible = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(MAX_TIME) * 400 + (MAX_HITS - hits) * 800) : (MAX_TIME - Math.ceil(timeLeft)) * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var i = 0; i < icicles.length; i++) {
      var ic = icicles[i], al = ic.dropping ? 0.9 : 0.7;
      if (!ic.dropping) game.draw.rect(ic.x - ic.w / 2 - 10, 0, ic.w + 20, H, C.d, (Math.sin(ic.warnTimer * 12) * 0.3 + 0.4) * 0.06);
      game.draw.rect(ic.x - ic.w / 2, ic.y, ic.w, ic.h * 0.7, '#446688', al); game.draw.rect(ic.x - ic.w / 2 + 4, ic.y, 6, ic.h * 0.7, C.g, 0.4);
      var tw = ic.w * 0.4; game.draw.rect(ic.x - tw / 2, ic.y + ic.h * 0.7, tw, ic.h * 0.3, C.e, al);
    }
    var pblink = invincible > 0 ? (Math.floor(game.time.elapsed * 12) % 2 ? 0.5 : 0.9) : 0.9;
    pc(player.x, player.y, PLAYER_R, invincible > 0 ? C.a : C.f, pblink); pc(player.x - 10, player.y - 10, PLAYER_R * 0.35, C.c, pblink * 0.5);
  }

  // ── 入力 ──
  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    player.targetX = tx; game.audio.play('se_tap', 0.2);
  });

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done) return;
    player.targetX = (x1 + x2) / 2; game.audio.play('se_tap', 0.15);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!player) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.30, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.345, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.55, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.59, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SURVIVED!' : 'SHATTERED', W / 2, H * 0.35, 70, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(true); return; }
      if (flash > 0) flash -= dt * 3; if (invincible > 0) invincible -= dt;
      player.x += (player.targetX - player.x) * Math.min(1, dt * 8); player.x = Math.max(PLAYER_R, Math.min(W - PLAYER_R, player.x));
      nextIcicle -= dt; if (nextIcicle <= 0) { spawnIcicle(); nextIcicle = Math.max(0.4, 0.9 - (MAX_TIME - timeLeft) * 0.03); }
      var mult = 1 + (MAX_TIME - timeLeft) / 12;
      for (var ii = icicles.length - 1; ii >= 0; ii--) {
        var ic = icicles[ii];
        if (!ic.dropping) { ic.warnTimer += dt; ic.y = -ic.h + Math.sin(ic.warnTimer * 10) * 4; if (ic.warnTimer >= ic.warning) { ic.dropping = true; ic.vy = 20; game.audio.play('se_tap', 0.2); } continue; }
        ic.vy += 900 * dt * mult; ic.y += ic.vy * dt;
        if (invincible <= 0) { var cy = ic.y + ic.h; if (Math.abs(player.x - ic.x) < ic.w / 2 + PLAYER_R * 0.7 && Math.abs(player.y - cy) < PLAYER_R * 1.2) { hits++; invincible = 1.2; flash = 0.4; game.audio.play('se_failure', 0.5); for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: player.x, y: player.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200 - 100, life: 0.4, col: C.e }); } icicles.splice(ii, 1); if (hits >= MAX_HITS) { finish(false); return; } continue; } }
        if (ic.y + ic.h > FLOOR_Y) { for (var pi2 = 0; pi2 < 6; pi2++) { var a2 = Math.random() * Math.PI - Math.PI; particles.push({ x: ic.x, y: FLOOR_Y, vx: Math.cos(a2) * 150, vy: Math.sin(a2) * 150 - 100, life: 0.35, col: C.g }); } game.audio.play('se_tap', 0.15); icicles.splice(ii, 1); }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.12);

    timeBar();
    txt(Math.ceil(timeLeft) + 's', W / 2, 96, 44, C.g);
    for (var hi = 0; hi < MAX_HITS; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HITS - 1) / 2) * 56) - 10, 168, 20, 20, hi < hits ? C.a : C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);

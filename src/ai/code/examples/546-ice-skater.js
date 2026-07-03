// 546-ice-skater.js
// アイススケーター — 摩擦の少ない氷上をスワイプで滑らせ、旗を集める。壁への激突は厳禁
// 操作: スワイプで加速（氷なので滑り続ける）/ タップした方向へも軽く押せる
// 成功: 旗 6本 収集  失敗: 壁に 3回 激突 or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、スケートリンク） ──
  var C = { bg:'#02121e', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ICE SKATER';
  var HOW_TO_PLAY = 'SWIPE TO GLIDE ON THE ICE · GRAB FLAGS · DODGE THE WALLS';
  var MAX_TIME = 18;
  var NEEDED   = 6;          // 修正2: 12 → 6
  var MAX_HITS = 3;          // 修正2: 5 → 3
  var RINK_X = 60, RINK_Y = snap(H * 0.20), RINK_W = W - 120, RINK_H = snap(H * 0.56), PLAYER_R = 36;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var player, flags, collected, wallHits, timeLeft, done, particles, flash, trail, invincible, scarfAnim;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a1a2a');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(RINK_X, RINK_Y, RINK_W, RINK_H, '#0a2438', 0.9);
    for (var li = 1; li < 4; li++) game.draw.rect(RINK_X, RINK_Y + RINK_H * li / 4, RINK_W, 2, C.d, 0.3);
    game.draw.rect(RINK_X - 16, RINK_Y - 16, RINK_W + 32, 16, C.d, 0.7);
    game.draw.rect(RINK_X - 16, RINK_Y + RINK_H, RINK_W + 32, 16, C.d, 0.7);
    game.draw.rect(RINK_X - 16, RINK_Y, 16, RINK_H, C.d, 0.7);
    game.draw.rect(RINK_X + RINK_W, RINK_Y, 16, RINK_H, C.d, 0.7);
  }

  function spawnFlags() { flags = []; for (var i = 0; i < NEEDED; i++) flags.push({ x: RINK_X + 80 + Math.random() * (RINK_W - 160), y: RINK_Y + 80 + Math.random() * (RINK_H - 160), r: 30, pulse: Math.random() * Math.PI * 2 }); }

  function initGame() { player = { x: W / 2, y: RINK_Y + RINK_H / 2, vx: 0, vy: 0 }; collected = 0; wallHits = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; trail = []; invincible = 0; scarfAnim = 0; spawnFlags(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (collected * 700 + Math.ceil(timeLeft) * 100) : collected * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var fi = 0; fi < flags.length; fi++) { var f = flags[fi], pu = 1 + Math.sin(f.pulse) * 0.1; game.draw.rect(snap(f.x) - 2, f.y - 40, 4, 72, '#888888', 0.9); game.draw.rect(snap(f.x), f.y - 40, 44 * pu, 30 * pu, C.b, 0.9); pc(f.x, f.y - 40, 8, C.g, 0.8); }
    for (var ti = 0; ti < trail.length; ti++) game.draw.rect(snap(trail[ti].x) - 4, snap(trail[ti].y) - 4, 8, 8, C.e, trail[ti].t * 0.5);
    var blink = invincible > 0 ? (Math.floor(game.time.elapsed * 20) % 2 ? 0.5 : 0.95) : 0.95;
    pc(player.x, player.y, PLAYER_R, C.e, blink); pc(player.x - 8, player.y - 10, 12, C.g, blink * 0.5);
    var sx = player.x + Math.sin(scarfAnim) * 20, sy = player.y - 8 + Math.cos(scarfAnim) * 8;
    game.draw.line(player.x, player.y - 8, sx, sy, C.a, 8);
  }

  // ── 入力 ──
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    var P = 500;
    if (dir === 'up') player.vy -= P; if (dir === 'down') player.vy += P; if (dir === 'left') player.vx -= P; if (dir === 'right') player.vx += P;
    game.audio.play('se_tap', 0.2);
  });

  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var dx = tx - player.x, dy = ty - player.y, len = Math.hypot(dx, dy);
    if (len > 0) { player.vx += (dx / len) * 300; player.vy += (dy / len) * 300; }
    game.audio.play('se_tap', 0.15);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!player) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.115, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.155, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.90, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL FLAGS!' : 'WIPEOUT', W / 2, H * 0.35, 72, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (invincible > 0) invincible -= dt; scarfAnim += dt * 3;
      player.x += player.vx * dt; player.y += player.vy * dt; player.vx *= Math.pow(0.94, dt * 60); player.vy *= Math.pow(0.94, dt * 60);
      var sp = Math.hypot(player.vx, player.vy); if (sp > 900) { player.vx = player.vx / sp * 900; player.vy = player.vy / sp * 900; }
      var hit = false;
      if (player.x - PLAYER_R < RINK_X) { player.x = RINK_X + PLAYER_R; if (Math.abs(player.vx) > 300 && invincible <= 0) hit = true; player.vx = Math.abs(player.vx) * 0.6; }
      if (player.x + PLAYER_R > RINK_X + RINK_W) { player.x = RINK_X + RINK_W - PLAYER_R; if (Math.abs(player.vx) > 300 && invincible <= 0) hit = true; player.vx = -Math.abs(player.vx) * 0.6; }
      if (player.y - PLAYER_R < RINK_Y) { player.y = RINK_Y + PLAYER_R; if (Math.abs(player.vy) > 300 && invincible <= 0) hit = true; player.vy = Math.abs(player.vy) * 0.6; }
      if (player.y + PLAYER_R > RINK_Y + RINK_H) { player.y = RINK_Y + RINK_H - PLAYER_R; if (Math.abs(player.vy) > 300 && invincible <= 0) hit = true; player.vy = -Math.abs(player.vy) * 0.6; }
      if (hit) { wallHits++; invincible = 1.0; flash = 0.5; game.audio.play('se_failure', 0.5); if (wallHits >= MAX_HITS) { finish(false); return; } }
      trail.push({ x: player.x, y: player.y, t: 0.3 });
      for (var ti = trail.length - 1; ti >= 0; ti--) { trail[ti].t -= dt * 2; if (trail[ti].t <= 0) trail.splice(ti, 1); }
      for (var fi = flags.length - 1; fi >= 0; fi--) {
        var f = flags[fi]; f.pulse += dt * 3;
        if (Math.hypot(player.x - f.x, player.y - f.y) < PLAYER_R + f.r) { collected++; flags.splice(fi, 1); game.audio.play('se_success', 0.7); for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: f.x, y: f.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.4, col: C.b }); } if (collected >= NEEDED) { finish(true); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.12);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(collected + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var hi = 0; hi < MAX_HITS; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HITS - 1) / 2) * 56) - 10, 224, 20, 20, hi < wallHits ? C.a : '#0a1a2a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);

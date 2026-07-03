// 536-sandstorm.js
// サンドストーム — 渦巻く砂粒を避けながら砂漠を横断し、右端のゴールへ走り抜ける
// 操作: スワイプで移動 / タップでダッシュ（ダッシュ中は砂に当たらない・クールダウンあり）
// 成功: ゴール 2回 到達  失敗: 3回 砂に巻き込まれる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、砂嵐） ──
  var C = { bg:'#180e04', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SANDSTORM';
  var HOW_TO_PLAY = 'SWIPE TO MOVE · TAP TO DASH THROUGH THE SAND · REACH THE GOAL';
  var MAX_TIME = 15;
  var NEEDED   = 2;          // 修正2: 3 → 2
  var MAX_HITS = 3;          // 修正2: 5 → 3
  var PLAYER_X = snap(W * 0.15), GOAL_X = snap(W * 0.88);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var player, goalY, sand, goals, hits, timeLeft, done, flash, invincible, particles, dashCd, dashActive, reachedGoal, goalAnim;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#2a1808');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, 0, W, H * 0.4, '#2a1808', 0.5); }

  function spawnSand() {
    for (var i = 0; i < 3; i++) { var side = Math.random() < 0.5 ? 1 : -1; sand.push({ x: side > 0 ? W + 30 : -30, y: Math.random() * H, vx: side > 0 ? -(200 + Math.random() * 300) : (200 + Math.random() * 300), vy: (Math.random() - 0.5) * 200, r: 14 + Math.random() * 24, spin: Math.random() * Math.PI * 2, spinSpeed: (Math.random() - 0.5) * 4, col: Math.random() < 0.5 ? C.f : '#b45309', life: 1.0 }); }
  }

  function initGame() { player = { x: PLAYER_X, y: H / 2, vy: 0, vx: 0 }; goalY = H / 2; sand = []; goals = 0; hits = 0; timeLeft = MAX_TIME; done = false; flash = 0; invincible = 0; particles = []; dashCd = 0; dashActive = 0; reachedGoal = false; goalAnim = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (goals * 1000 + Math.ceil(timeLeft) * 100) : goals * 400;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var si = 0; si < sand.length; si++) { var sp = sand[si], al = sp.life * 0.7; pc(sp.x, sp.y, sp.r, sp.col, al); pc(sp.x + Math.cos(sp.spin) * sp.r * 0.4, sp.y + Math.sin(sp.spin) * sp.r * 0.4, sp.r * 0.3, C.c, al * 0.6); }
    game.draw.rect(GOAL_X - 4, goalY - 80, 8, 160, C.b, 0.8);
    game.draw.rect(GOAL_X, goalY - 80, 56, 48, C.b, 0.8);
    txt('GO', GOAL_X + 28, goalY - 52, 30, C.bg);
    if (goalAnim > 0) pc(GOAL_X, goalY, 80 * (1 - goalAnim + 0.5) * 2, C.b, goalAnim * 0.3);
    var blink = invincible > 0 ? (Math.floor(game.time.elapsed * 20) % 2 ? 0.4 : 0.9) : 0.9;
    if (dashActive > 0) pc(player.x, player.y, 56, C.e, 0.5);
    pc(player.x, player.y, 30, C.e, blink); pc(player.x - 8, player.y - 8, 10, C.g, blink * 0.6);
    if (dashCd <= 0) txt('DASH', player.x, player.y + 60, 28, C.e);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || dashCd > 0) return;
    dashActive = 0.2; dashCd = 1.0; player.vx = 600; player.vy = 0; game.audio.play('se_tap', 0.4);
    for (var pi = 0; pi < 6; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: player.x, y: player.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.3, col: C.e }); }
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    var sp = 400;
    if (dir === 'up') { player.vy = -sp; player.vx = sp * 0.3; }
    if (dir === 'down') { player.vy = sp; player.vx = sp * 0.3; }
    if (dir === 'right') { player.vx = sp; player.vy *= 0.5; }
    if (dir === 'left') { player.vx = -sp; player.vy *= 0.5; }
    game.audio.play('se_tap', 0.2);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!player) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.185, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.72, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.76, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CROSSED!' : 'BURIED', W / 2, H * 0.35, 72, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (invincible > 0) invincible -= dt; if (dashCd > 0) dashCd -= dt; if (dashActive > 0) dashActive -= dt; if (goalAnim > 0) goalAnim -= dt * 2;
      player.x += player.vx * dt; player.y += player.vy * dt; player.vx *= Math.pow(0.05, dt); player.vy *= Math.pow(0.05, dt);
      player.x = Math.max(40, Math.min(W - 40, player.x)); player.y = Math.max(80, Math.min(H - 80, player.y));
      if (!reachedGoal && player.x > GOAL_X - 40) {
        goals++; reachedGoal = true; goalAnim = 1.0; game.audio.play('se_success', 0.8);
        for (var pi = 0; pi < 12; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: player.x, y: player.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, col: C.b }); }
        player.x = PLAYER_X; player.y = H * 0.3 + Math.random() * H * 0.4; player.vx = 0; player.vy = 0; goalY = H * 0.2 + Math.random() * H * 0.6;
        if (goals >= NEEDED) { finish(true); return; }
        setTimeout(function() { reachedGoal = false; }, 200);
      }
      spawnSand();
      for (var si = sand.length - 1; si >= 0; si--) {
        var sp = sand[si]; sp.x += sp.vx * dt; sp.y += sp.vy * dt; sp.spin += sp.spinSpeed * dt; sp.vy += (Math.random() - 0.5) * 60 * dt; sp.life -= dt * 0.5;
        if (sp.x < -80 || sp.x > W + 80 || sp.life <= 0) { sand.splice(si, 1); continue; }
        if (invincible <= 0 && dashActive <= 0 && Math.hypot(player.x - sp.x, player.y - sp.y) < sp.r + 24) { hits++; invincible = 1.2; flash = 0.5; game.audio.play('se_failure', 0.4); sand.splice(si, 1); if (hits >= MAX_HITS) { finish(false); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.15);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(goals + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var hi = 0; hi < MAX_HITS; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HITS - 1) / 2) * 56) - 10, 224, 20, 20, hi < hits ? C.a : '#2a1808');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);

// 584-spike-dodge.js
// スパイクドッジ — 上下から降ってくるスパイクを、レーンを左右に移動して隙間で回避し続ける
// 操作: 左右スワイプ（またはタップした列へ）でレーン移動。スパイクの当たらない列へ逃げる
// 成功: 12秒 生き残る  失敗: 3回 被弾

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、トラップ回廊） ──
  var C = { bg:'#08030a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SPIKE DODGE';
  var HOW_TO_PLAY = 'SWIPE / TAP TO CHANGE LANE · SLIP THROUGH THE SPIKE GAPS';
  var MAX_TIME = 12;
  var MAX_HITS = 3;
  var LANES = 5, LANE_W = W / 5, PLAYER_R = 36, PLAYER_Y = snap(H * 0.5);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var lane, playerX, spikes, hits, timeLeft, done, particles, trail, nextSpike, flash, invincible;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#1a0a20');
  }

  function laneX(l) { return (l + 0.5) * LANE_W; }

  function background() { game.draw.clear(C.bg); for (var li = 0; li <= LANES; li++) game.draw.rect(li * LANE_W - 1, 0, 2, H, '#1a0a20', 0.9); game.draw.rect(lane * LANE_W + 2, 0, LANE_W - 4, H, C.e, 0.04); }

  function spawnSpikes() { var l = Math.floor(Math.random() * LANES), diff = 1 + (MAX_TIME - timeLeft) / 6; spikes.push({ lane: l, y: -80, vy: 300 + diff * 40, r: 28 }); if (Math.random() < 0.5) { var l2 = (l + 1 + Math.floor(Math.random() * (LANES - 1))) % LANES; spikes.push({ lane: l2, y: H + 80, vy: -(300 + diff * 40), r: 28 }); } }

  function initGame() { lane = 2; playerX = W / 2; spikes = []; hits = 0; timeLeft = MAX_TIME; done = false; particles = []; trail = []; nextSpike = 0.8; flash = 0; invincible = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(MAX_TIME) * 400 + (MAX_HITS - hits) * 800) : (MAX_TIME - Math.ceil(timeLeft)) * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var si = 0; si < spikes.length; si++) { var sp = spikes[si], sx = laneX(sp.lane); pc(sx, sp.y, sp.r, C.a, 0.9); pc(sx, sp.y, sp.r * 0.55, C.g, 0.4); }
    for (var ti = 0; ti < trail.length; ti++) pc(trail[ti].x, PLAYER_Y, PLAYER_R * 0.5 * (trail[ti].life / 0.2), C.e, trail[ti].life * 0.4);
    var blink = invincible > 0 ? (Math.floor(game.time.elapsed * 12) % 2 ? 0.5 : 0.9) : 0.9;
    pc(playerX, PLAYER_Y, PLAYER_R, flash > 0 ? C.a : C.e, blink); pc(playerX - 10, PLAYER_Y - 10, PLAYER_R * 0.35, C.g, blink * 0.5);
  }

  // ── 入力 ──
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'left') lane = Math.max(0, lane - 1); else if (dir === 'right') lane = Math.min(LANES - 1, lane + 1);
    game.audio.play('se_tap', 0.2);
  });

  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    lane = Math.max(0, Math.min(LANES - 1, Math.floor(tx / LANE_W))); game.audio.play('se_tap', 0.15);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!spikes) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.30, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.345, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.62, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.66, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SURVIVED!' : 'IMPALED', W / 2, H * 0.35, 72, resultSuccess ? C.b : C.a);
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
      playerX += (laneX(lane) - playerX) * Math.min(1, dt * 12);
      nextSpike -= dt; if (nextSpike <= 0) { spawnSpikes(); nextSpike = Math.max(0.35, 0.9 - (MAX_TIME - timeLeft) * 0.03); }
      trail.push({ x: playerX, life: 0.2 }); for (var ti = trail.length - 1; ti >= 0; ti--) { trail[ti].life -= dt * 4; if (trail[ti].life <= 0) trail.splice(ti, 1); }
      for (var si = spikes.length - 1; si >= 0; si--) {
        var sp = spikes[si]; sp.y += sp.vy * dt;
        if (invincible <= 0 && Math.abs(playerX - laneX(sp.lane)) < sp.r + PLAYER_R * 0.7 && Math.abs(PLAYER_Y - sp.y) < sp.r + PLAYER_R * 0.7) { hits++; invincible = 1.2; flash = 0.5; game.audio.play('se_failure', 0.5); for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: playerX, y: PLAYER_Y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.4, col: C.a }); } spikes.splice(si, 1); if (hits >= MAX_HITS) { finish(false); return; } continue; }
        if (sp.y > H + 100 || sp.y < -100) spikes.splice(si, 1);
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
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
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);

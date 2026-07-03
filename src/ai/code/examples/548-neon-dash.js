// 548-neon-dash.js
// ネオンダッシュ — 3レーンを走るネオンランナー。スワイプでレーン変更、タップ/上スワイプでジャンプ
// 操作: 左右スワイプでレーン移動 / タップ・上スワイプでジャンプ（低い障害物は跳び越せる）
// 成功: 150m 走破  失敗: 3回 激突 or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ランナウェイ） ──
  var C = { bg:'#000014', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var OBS_COLS = [C.a, C.f, C.d];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'NEON DASH';
  var HOW_TO_PLAY = 'SWIPE TO CHANGE LANE · TAP / SWIPE UP TO JUMP OVER LOW WALLS';
  var MAX_TIME = 18;
  var NEEDED_DIST = 150;     // 修正2: 400 → 150
  var MAX_HITS = 3;
  var LANES = 3, LANE_W = W / 3, ROAD_Y = snap(H * 0.80), PLAYER_R = 40, PLAYER_Y = snap(H * 0.80) - 48;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var targetLane, playerX, playerY, jumpVY, onGround, obstacles, distance, hits, timeLeft, done, speed, nextObs, particles, flash, invincible, gridOff;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a0a20');
  }

  function distBar() {
    var t = Math.ceil(Math.min(1, distance / NEEDED_DIST) * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, H - 60, 72, 40, i < t ? C.b : '#0a0a20');
  }

  function laneX(l) { return l * LANE_W + LANE_W / 2; }

  function background() {
    game.draw.clear(C.bg);
    for (var li = 0; li < LANES; li++) game.draw.rect(li * LANE_W, 0, LANE_W, H, OBS_COLS[li], 0.06);
    game.draw.rect(0, ROAD_Y, W, H - ROAD_Y, '#0a0a1e', 0.9);
    for (var gj = 0; gj <= LANES; gj++) game.draw.rect(gj * LANE_W - 1, 0, 3, H, C.g, 0.12);
    for (var di = 0; di < 12; di++) { var dy = (di * 180 + gridOff) % (H + 100) - 100; for (var dj = 0; dj < LANES - 1; dj++) game.draw.rect((dj + 1) * LANE_W - 1, dy, 3, 80, C.g, 0.2); }
  }

  function initGame() { targetLane = 1; playerX = W / 2; playerY = PLAYER_Y; jumpVY = 0; onGround = true; obstacles = []; distance = 0; hits = 0; timeLeft = MAX_TIME; done = false; speed = 600; nextObs = 0.8; particles = []; flash = 0; invincible = 0; gridOff = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(distance) * 100 + Math.ceil(timeLeft) * 200) : Math.round(distance) * 60;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var oi = 0; oi < obstacles.length; oi++) { var o = obstacles[oi]; game.draw.rect(o.x - o.w / 2 - 8, ROAD_Y - o.h - 8, o.w + 16, o.h + 16, o.col, 0.3); game.draw.rect(o.x - o.w / 2, ROAD_Y - o.h, o.w, o.h, o.col, 0.9); if (o.jumpable) txt('J', o.x, ROAD_Y - o.h / 2 + 10, 30, C.g); }
    pc(playerX, PLAYER_Y + 10, PLAYER_R * 0.7, '#000000', 0.3);
    var blink = invincible > 0 ? (Math.floor(game.time.elapsed * 20) % 2 ? 0.5 : 1) : 1;
    pc(playerX, playerY, PLAYER_R + 10, C.e, blink * 0.4); pc(playerX, playerY, PLAYER_R, C.e, blink * 0.9); pc(playerX - 10, playerY - 10, 12, C.g, blink * 0.5);
  }

  // ── 入力 ──
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'left' && targetLane > 0) { targetLane--; game.audio.play('se_tap', 0.3); }
    if (dir === 'right' && targetLane < LANES - 1) { targetLane++; game.audio.play('se_tap', 0.3); }
    if (dir === 'up' && onGround) { jumpVY = -900; onGround = false; game.audio.play('se_tap', 0.4); }
  });

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (onGround) { jumpVY = -900; onGround = false; game.audio.play('se_tap', 0.4); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!obstacles) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.24, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.285, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.5, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.54, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'GOAL!' : 'CRASHED', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (invincible > 0) invincible -= dt;
      distance += speed * dt / 100; speed = Math.min(speed + 20 * dt, 1100); gridOff += speed * dt; if (gridOff > 180) gridOff -= 180;
      playerX += (laneX(targetLane) - playerX) * Math.min(1, dt * 8);
      if (!onGround) { jumpVY += 2000 * dt; playerY += jumpVY * dt; if (playerY >= PLAYER_Y) { playerY = PLAYER_Y; jumpVY = 0; onGround = true; } }
      nextObs -= dt;
      if (nextObs <= 0) { var ol = Math.floor(Math.random() * LANES), jmp = Math.random() < 0.3; obstacles.push({ x: laneX(ol), y: -80, w: 80, h: jmp ? 60 : 120, col: OBS_COLS[ol], jumpable: jmp, speed: speed }); nextObs = Math.max(0.4, 0.8 - distance * 0.002); }
      for (var oi = obstacles.length - 1; oi >= 0; oi--) {
        var o = obstacles[oi]; o.y += o.speed * dt; if (o.y > H + 100) { obstacles.splice(oi, 1); continue; }
        if (invincible <= 0 && Math.abs(playerX - o.x) < PLAYER_R + o.w / 2) {
          var top = ROAD_Y - o.h; if (o.jumpable && playerY < top - 20) continue;
          if (playerY > top - PLAYER_R && Math.abs(o.y - (ROAD_Y - o.h)) < 100) {
            hits++; invincible = 1.0; flash = 0.5; game.audio.play('se_failure', 0.5); obstacles.splice(oi, 1);
            for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: playerX, y: playerY, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.4, col: C.a }); }
            if (hits >= MAX_HITS) { finish(false); return; }
          }
        }
      }
      if (distance >= NEEDED_DIST) { finish(true); return; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.12);

    distBar();
    txt(Math.floor(distance) + ' / ' + NEEDED_DIST + 'm', W / 2, H - 76, 36, C.b);
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    for (var hi = 0; hi < MAX_HITS; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HITS - 1) / 2) * 56) - 10, 168, 20, 20, hi < hits ? C.a : '#0a0a20');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);

// 676-rockslide.js
// ロックスライド — 3レーンを左右移動し、山から降ってくる落石をかわして生き延びる
// 操作: 画面左半分タップで左レーン、右半分で右レーンへ。落ちてくる岩を避ける
// 成功: 15秒 生存  失敗: 3回 被弾 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、山道） ──
  var C = { bg:'#0a0603', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ROCKSLIDE';
  var HOW_TO_PLAY = 'TAP LEFT / RIGHT TO CHANGE LANE · DODGE THE FALLING ROCKS';
  var MAX_TIME = 15;         // 修正2: 60 → 15
  var MAX_HIT = 3;           // 修正2: 5 → 3
  var PLAYER_Y = snap(H * 0.80), PLAYER_R = 48, LANES = [W * 0.2, W * 0.5, W * 0.8], SPAWN_RATE = 1.0;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var playerX, targetX, currentLane, rocks, spawnTimer, hits, timeLeft, done, particles, flash, iframes, gameElapsed;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0c0703');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, 0, W, H * 0.5, '#1c1008', 0.6); }

  function spawnRock() { var lane = Math.floor(Math.random() * 3), size = 36 + Math.random() * 40; rocks.push({ x: LANES[lane] + (Math.random() - 0.5) * 80, y: -size, r: size, speed: 500 + Math.random() * 300 + (MAX_TIME - timeLeft) * 12 }); }

  function initGame() { playerX = W / 2; targetX = W / 2; currentLane = 1; rocks = []; spawnTimer = 0; hits = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; iframes = 0; gameElapsed = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (MAX_TIME * 200 + (MAX_HIT - hits) * 500) : Math.round((MAX_TIME - timeLeft) * 200);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene(shake) {
    game.draw.rect(0, PLAYER_Y + PLAYER_R + shake, W, H - (PLAYER_Y + PLAYER_R), '#2d1a09', 0.9); game.draw.rect(0, PLAYER_Y + PLAYER_R + shake, W, 12, '#4a2e0f', 0.7);
    for (var li = 0; li < 3; li++) for (var lj = 0; lj < 8; lj++) { var ly = (gameElapsed * 300 + lj * 120) % H; game.draw.rect(snap(LANES[li]) - 2, snap(ly + shake), 4, 50, C.g, 0.08); }
    for (var ri = 0; ri < rocks.length; ri++) { var rock = rocks[ri]; pc(rock.x, rock.y + shake, rock.r, '#78350f', 0.9); pc(rock.x - rock.r * 0.3, rock.y - rock.r * 0.3 + shake, rock.r * 0.25, C.f, 0.5); }
    var pa = iframes > 0 ? (Math.sin(gameElapsed * 20) * 0.5 + 0.5) : 0.9;
    pc(playerX, PLAYER_Y + shake, PLAYER_R, C.b, pa); pc(playerX - PLAYER_R * 0.3, PLAYER_Y - PLAYER_R * 0.3 + shake, PLAYER_R * 0.25, C.g, pa * 0.5);
  }

  // ── 入力 ──
  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var dir = tx < W / 2 ? -1 : 1; currentLane = Math.max(0, Math.min(2, currentLane + dir)); targetX = LANES[currentLane]; game.audio.play('se_tap', 0.1);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!rocks) initGame(); gameElapsed += dt; background(); drawScene(0);
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.40, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SURVIVED!' : 'CRUSHED', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    var shake = 0;
    if (!done) {
      timeLeft -= dt; gameElapsed += dt;
      if (timeLeft <= 0) { finish(true); return; }
      if (flash > 0) { flash -= dt * 4; shake = (Math.random() - 0.5) * 20 * flash * 2; } if (iframes > 0) iframes -= dt;
      playerX += (targetX - playerX) * Math.min(1, dt * 12);
      spawnTimer += dt; var rate = Math.max(0.4, SPAWN_RATE - (MAX_TIME - timeLeft) * 0.03);
      if (spawnTimer >= rate) { spawnTimer = 0; spawnRock(); if (timeLeft < MAX_TIME - 6 && Math.random() < 0.3) spawnRock(); }
      for (var i = rocks.length - 1; i >= 0; i--) {
        var r = rocks[i]; r.y += r.speed * dt;
        if (iframes <= 0) { var dx = playerX - r.x, dy = PLAYER_Y - r.y; if (dx * dx + dy * dy < (PLAYER_R + r.r - 10) * (PLAYER_R + r.r - 10)) {
          hits++; iframes = 1.5; flash = 0.5; game.audio.play('se_failure', 0.5);
          for (var p = 0; p < 8; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: playerX, y: PLAYER_Y, vx: Math.cos(pa) * 220, vy: Math.sin(pa) * 220, life: 0.5, col: C.f }); }
          rocks.splice(i, 1); if (hits >= MAX_HIT) { finish(false); return; } continue;
        } }
        if (r.y > H + r.r) rocks.splice(i, 1);
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.life -= dt * 2; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene(shake);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + 's', W / 2, 96, 44, C.g);
    for (var hi = 0; hi < MAX_HIT; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HIT - 1) / 2) * 56) - 10, 168, 20, 20, hi < hits ? C.a : '#0c0703');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);

// 581-rocket-fuel.js
// ロケットフュール — 燃料を管理しながら噴射を切り替え、ロケットを目標高度ゾーンに留める
// 操作: タップで噴射のON/OFFを切替（噴射で上昇・燃料消費、放置で落下）目標ゾーンに一定時間留める
// 成功: 目標到達 2回  失敗: 3回 墜落 or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、打上げ管制） ──
  var C = { bg:'#000008', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ROCKET FUEL';
  var HOW_TO_PLAY = 'TAP TO TOGGLE THRUST · MANAGE FUEL · HOLD IN THE TARGET ZONE';
  var MAX_TIME = 18;
  var NEEDED   = 2;          // 修正2: 3 → 2
  var MAX_CRASH = 3;
  var ROCKET_W = 60, ROCKET_H = 110, GRAVITY = 600, THRUST = -1200, TARGET_Y = snap(H * 0.26), TARGET_ZONE = 90, HOLD = 1.2, GROUND_Y = snap(H * 0.82);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var rocket, fuel, completions, crashes, timeLeft, done, particles, flash, flashCol, inTargetTimer, stars;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a0a18');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var s = 0; s < stars.length; s++) { var st = stars[s]; game.draw.rect(snap(st.x), snap(st.y), 8, 8, C.g, 0.3 + Math.sin(game.time.elapsed * 2 + st.t) * 0.3); }
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, '#1a1a2a', 0.9); game.draw.rect(0, GROUND_Y, W, 12, C.d, 0.9);
    game.draw.rect(0, TARGET_Y - TARGET_ZONE, W, TARGET_ZONE * 2, C.b, 0.06 + Math.sin(game.time.elapsed * 3) * 0.02);
    game.draw.rect(0, TARGET_Y - TARGET_ZONE, W, 3, C.b, 0.7); game.draw.rect(0, TARGET_Y + TARGET_ZONE, W, 3, C.b, 0.7);
    txt('TARGET', W - 150, TARGET_Y + 12, 30, C.b);
  }

  function resetRocket() { rocket = { x: W / 2, y: snap(H * 0.72), vy: 0, thrusting: false }; fuel = 1.0; inTargetTimer = 0; }

  function initGame() { completions = 0; crashes = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; stars = []; for (var s = 0; s < 60; s++) stars.push({ x: Math.random() * W, y: Math.random() * H, t: Math.random() * Math.PI * 2 }); resetRocket(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (completions * 1200 + Math.ceil(timeLeft) * 100) : completions * 400;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    if (inTargetTimer > 0) game.draw.rect(rocket.x - 60, rocket.y - ROCKET_H / 2 - 60, 120 * (inTargetTimer / HOLD), 12, C.b, 0.9);
    game.draw.rect(rocket.x - ROCKET_W / 2, rocket.y - ROCKET_H / 2, ROCKET_W, ROCKET_H, C.e, 0.9); game.draw.rect(rocket.x - ROCKET_W / 2, rocket.y - ROCKET_H / 2, ROCKET_W, 20, C.g, 0.5);
    pc(rocket.x, rocket.y - ROCKET_H / 2 - 16, 26, C.g, 0.7);
    game.draw.rect(rocket.x - ROCKET_W / 2 - 20, rocket.y + ROCKET_H / 2 - 40, 20, 40, C.d, 0.8); game.draw.rect(rocket.x + ROCKET_W / 2, rocket.y + ROCKET_H / 2 - 40, 20, 40, C.d, 0.8);
    if (rocket.thrusting && fuel > 0) { var fh = 40 + Math.sin(game.time.elapsed * 20) * 20; game.draw.rect(rocket.x - 16, rocket.y + ROCKET_H / 2 + 6, 32, fh, C.f, 0.9); game.draw.rect(rocket.x - 8, rocket.y + ROCKET_H / 2 + 6, 16, fh * 0.6, C.c, 0.7); }
    // 燃料ゲージ
    var fx = W - 80, fy = snap(H * 0.36), fh2 = snap(H * 0.28); game.draw.rect(fx, fy, 40, fh2, '#334455', 0.5); game.draw.rect(fx, fy + fh2 * (1 - fuel), 40, fh2 * fuel, fuel < 0.2 ? C.a : C.e, 0.9); txt('FUEL', fx + 20, fy - 20, 24, C.e);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    rocket.thrusting = !rocket.thrusting; game.audio.play('se_tap', 0.25);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stars) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.45, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.495, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.58, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.62, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ORBIT REACHED!' : 'CRASHED', W / 2, H * 0.60, 64, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.68, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.74, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2.5;
      if (rocket.thrusting && fuel > 0) { rocket.vy += THRUST * dt; fuel = Math.max(0, fuel - 0.25 * dt); if (fuel <= 0) { rocket.thrusting = false; game.audio.play('se_failure', 0.3); } if (Math.random() < 0.5) particles.push({ x: rocket.x + (Math.random() - 0.5) * 20, y: rocket.y + ROCKET_H / 2 + 10, vx: (Math.random() - 0.5) * 100, vy: 200 + Math.random() * 150, life: 0.25, col: Math.random() < 0.5 ? C.f : C.c }); }
      rocket.vy += GRAVITY * dt; rocket.y += rocket.vy * dt; rocket.vy = Math.max(-1200, Math.min(800, rocket.vy));
      if (rocket.y > GROUND_Y - ROCKET_H / 2) {
        if (Math.abs(rocket.vy) > 300 || fuel <= 0.02) { crashes++; flash = 0.4; flashCol = C.a; game.audio.play('se_failure', 0.5); for (var pi = 0; pi < 10; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: rocket.x, y: GROUND_Y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200 - 100, life: 0.4, col: C.f }); } if (crashes >= MAX_CRASH) { finish(false); return; } setTimeout(function() { if (!done) resetRocket(); }, 800); }
        else { rocket.y = GROUND_Y - ROCKET_H / 2; rocket.vy = 0; fuel = Math.min(1, fuel + dt * 0.3); }
      }
      if (Math.abs(rocket.y - TARGET_Y) < TARGET_ZONE) { inTargetTimer += dt; if (inTargetTimer >= HOLD) { completions++; inTargetTimer = 0; flash = 0.5; flashCol = C.b; game.audio.play('se_success', 0.8); for (var pi2 = 0; pi2 < 12; pi2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: rocket.x, y: rocket.y, vx: Math.cos(a2) * 220, vy: Math.sin(a2) * 220, life: 0.5, col: C.b }); } if (completions >= NEEDED) { finish(true); return; } setTimeout(function() { if (!done) resetRocket(); }, 800); } }
      else inTargetTimer = Math.max(0, inTargetTimer - dt);
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(completions + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ci = 0; ci < MAX_CRASH; ci++) game.draw.rect(snap(W / 2 + (ci - (MAX_CRASH - 1) / 2) * 56) - 10, 224, 20, 20, ci < crashes ? C.a : '#0a0a18');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);

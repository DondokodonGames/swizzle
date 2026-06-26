// 546-ice-skater.js
// アイススケーター — 氷上を滑るスケーターをスワイプで操作、旗を集める
// 操作: スワイプで加速方向を変える（氷なのでスルスル滑る）
// 成功: 12本の旗を集める  失敗: 壁に5回激突 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#e8f4f8',
    ice:     '#c8e8f4',
    iceHi:   '#e8f8ff',
    iceLine: '#a0d0e8',
    skater:  '#1a3a5c',
    skaterHi:'#4488cc',
    scarf:   '#ef4444',
    flag:    '#22c55e',
    flagHi:  '#86efac',
    pole:    '#888888',
    wall:    '#334466',
    wallHi:  '#5577aa',
    hit:     '#ef4444',
    snow:    '#ffffff',
    text:    '#1a3a5c',
    ui:      '#7090b0'
  };

  var RINK_X = 60, RINK_Y = H * 0.15;
  var RINK_W = W - 120, RINK_H = H * 0.6;
  var player = { x: W / 2, y: RINK_Y + RINK_H / 2, vx: 0, vy: 0 };
  var PLAYER_R = 36;
  var flags = [];
  var FLAG_COUNT = 12;
  var collected = 0;
  var NEEDED = 12;
  var wallHits = 0;
  var MAX_HITS = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var trailPoints = [];
  var invincible = 0;
  var scarfAnim = 0;

  function spawnFlags() {
    flags = [];
    for (var i = 0; i < FLAG_COUNT - collected; i++) {
      flags.push({
        x: RINK_X + 80 + Math.random() * (RINK_W - 160),
        y: RINK_Y + 80 + Math.random() * (RINK_H - 160),
        r: 32,
        pulse: Math.random() * Math.PI * 2
      });
    }
  }

  game.onSwipe(function(dir) {
    if (done) return;
    var PUSH = 500;
    if (dir === 'up')    player.vy -= PUSH;
    if (dir === 'down')  player.vy += PUSH;
    if (dir === 'left')  player.vx -= PUSH;
    if (dir === 'right') player.vx += PUSH;
    game.audio.play('se_tap', 0.2);
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    // Tap to push toward tap position (gentler)
    var dx = tx - player.x, dy = ty - player.y;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      player.vx += (dx / len) * 300;
      player.vy += (dy / len) * 300;
    }
    game.audio.play('se_tap', 0.15);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (invincible > 0) invincible -= dt;
    scarfAnim += dt * 3;

    // Physics — ice = very low friction
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    player.vx *= Math.pow(0.94, dt * 60); // very slippery
    player.vy *= Math.pow(0.94, dt * 60);

    // Speed cap
    var speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
    var MAX_SPEED = 900;
    if (speed > MAX_SPEED) {
      player.vx = (player.vx / speed) * MAX_SPEED;
      player.vy = (player.vy / speed) * MAX_SPEED;
    }

    // Wall bounce with damage
    var hit = false;
    if (player.x - PLAYER_R < RINK_X) {
      player.x = RINK_X + PLAYER_R;
      if (Math.abs(player.vx) > 300 && invincible <= 0) hit = true;
      player.vx = Math.abs(player.vx) * 0.6;
    }
    if (player.x + PLAYER_R > RINK_X + RINK_W) {
      player.x = RINK_X + RINK_W - PLAYER_R;
      if (Math.abs(player.vx) > 300 && invincible <= 0) hit = true;
      player.vx = -Math.abs(player.vx) * 0.6;
    }
    if (player.y - PLAYER_R < RINK_Y) {
      player.y = RINK_Y + PLAYER_R;
      if (Math.abs(player.vy) > 300 && invincible <= 0) hit = true;
      player.vy = Math.abs(player.vy) * 0.6;
    }
    if (player.y + PLAYER_R > RINK_Y + RINK_H) {
      player.y = RINK_Y + RINK_H - PLAYER_R;
      if (Math.abs(player.vy) > 300 && invincible <= 0) hit = true;
      player.vy = -Math.abs(player.vy) * 0.6;
    }
    if (hit) {
      wallHits++;
      invincible = 1.0;
      flashAnim = 0.5;
      game.audio.play('se_failure', 0.5);
      if (wallHits >= MAX_HITS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
    }

    // Trail
    trailPoints.push({ x: player.x, y: player.y, t: 0.3 });
    for (var ti = trailPoints.length - 1; ti >= 0; ti--) {
      trailPoints[ti].t -= dt * 2;
      if (trailPoints[ti].t <= 0) trailPoints.splice(ti, 1);
    }

    // Collect flags
    for (var fi = flags.length - 1; fi >= 0; fi--) {
      var f = flags[fi];
      f.pulse += dt * 3;
      var dx = player.x - f.x, dy2 = player.y - f.y;
      if (Math.sqrt(dx * dx + dy2 * dy2) < PLAYER_R + f.r) {
        collected++;
        flags.splice(fi, 1);
        game.audio.play('se_success', 0.7);
        for (var pi = 0; pi < 8; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: f.x, y: f.y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.4, col: C.flagHi });
        }
        if (collected >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(collected * 400 + Math.ceil(timeLeft) * 100); }, 700);
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Rink
    game.draw.rect(RINK_X, RINK_Y, RINK_W, RINK_H, C.ice, 0.9);
    // Ice lines
    for (var li = 1; li < 4; li++) {
      game.draw.line(RINK_X, RINK_Y + RINK_H * li / 4, RINK_X + RINK_W, RINK_Y + RINK_H * li / 4, C.iceLine, 2);
    }
    game.draw.circle(W / 2, RINK_Y + RINK_H / 2, RINK_H * 0.2, C.iceLine, 0.4);
    // Rink walls
    game.draw.rect(RINK_X - 16, RINK_Y - 16, RINK_W + 32, 16, C.wall, 0.9);
    game.draw.rect(RINK_X - 16, RINK_Y + RINK_H, RINK_W + 32, 16, C.wall, 0.9);
    game.draw.rect(RINK_X - 16, RINK_Y, 16, RINK_H, C.wall, 0.9);
    game.draw.rect(RINK_X + RINK_W, RINK_Y, 16, RINK_H, C.wall, 0.9);

    // Flags
    for (var fi2 = 0; fi2 < flags.length; fi2++) {
      var f2 = flags[fi2];
      var pulse2 = 1 + Math.sin(f2.pulse) * 0.1;
      game.draw.line(f2.x, f2.y - 40, f2.x, f2.y + 32, C.pole, 4);
      game.draw.rect(f2.x, f2.y - 40, 48 * pulse2, 32 * pulse2, C.flag, 0.9);
      game.draw.circle(f2.x, f2.y - 40, 8, C.flagHi, 0.8);
    }

    // Ice trail
    for (var ti2 = 0; ti2 < trailPoints.length; ti2++) {
      var tp = trailPoints[ti2];
      game.draw.circle(tp.x, tp.y, 6 * tp.t, C.iceHi, tp.t * 0.5);
    }

    // Skater
    var invBlink = invincible > 0 ? (Math.sin(elapsed * 20) > 0 ? 0.5 : 0.95) : 0.95;
    game.draw.circle(player.x, player.y, PLAYER_R + 4, C.skaterHi, invBlink * 0.15);
    game.draw.circle(player.x, player.y, PLAYER_R, C.skater, invBlink * 0.95);
    game.draw.circle(player.x - 8, player.y - 10, 14, C.skaterHi, invBlink * 0.5);
    // Scarf
    var sx = player.x + Math.sin(scarfAnim) * 20;
    var sy = player.y - 8 + Math.cos(scarfAnim) * 8;
    game.draw.line(player.x, player.y - 8, sx, sy, C.scarf, 8);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.hit, flashAnim * 0.12);

    // Hit dots
    for (var hi = 0; hi < MAX_HITS; hi++) {
      game.draw.circle(W / 2 - (MAX_HITS - 1) * 52 + hi * 104, H * 0.955, 20, hi < wallHits ? C.hit : C.ui, 0.9);
    }

    game.draw.text(collected + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, '#1a3a5c');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.skaterHi : C.hit);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    spawnFlags();
  });
})(game);

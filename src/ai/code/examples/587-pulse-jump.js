// 587-pulse-jump.js
// パルスジャンプ — 音楽のリズムに合わせてジャンプしてビートを刻む
// 操作: タップでジャンプ、リズムの瞬間にジャンプすると高得点
// 成功: 20ビート成功  失敗: 10回ミス or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#05020a',
    floor:   '#1a0a2e',
    beat:    '#cc44ff',
    beatHi:  '#ee88ff',
    player:  '#44aaff',
    playerHi:'#88ccff',
    perfect: '#ffdd00',
    good:    '#22c55e',
    miss:    '#ef4444',
    text:    '#f1f5f9',
    ui:      '#334466',
    trail:   '#44aaff44'
  };

  var BPM = 120;
  var BEAT_INTERVAL = 60 / BPM; // 0.5s per beat
  var beatTimer = 0;
  var beatCount = 0;
  var elapsed = 0;
  var timeLeft = 60;
  var done = false;
  var score = 0;
  var NEEDED = 20;
  var misses = 0;
  var MAX_MISS = 10;

  var FLOOR_Y = H * 0.75;
  var playerX = W / 2;
  var playerY = FLOOR_Y;
  var playerVY = 0;
  var onGround = true;
  var JUMP_VY = -1200;
  var GRAVITY = 3000;
  var PLAYER_R = 44;

  var beatPulse = 0;
  var beatBars = []; // visual beat bars
  var resultText = '';
  var resultTimer = 0;
  var resultCol = C.good;
  var particles = [];
  var trail = [];
  var totalBeats = 0;

  var BEAT_WINDOW = 0.12; // seconds around beat to register

  function spawnBeatBar() {
    beatBars.push({ y: FLOOR_Y - 20, alpha: 1.0 });
  }

  function tryJump() {
    if (!onGround) return;
    // Check how close to beat
    var dist = Math.abs(beatTimer - BEAT_INTERVAL / 2);
    if (dist > BEAT_INTERVAL / 2) dist = BEAT_INTERVAL - dist;
    // dist = 0 means perfect timing
    var perfect = dist < BEAT_WINDOW * 0.5;
    var good = dist < BEAT_WINDOW;

    if (perfect) {
      score++;
      resultText = 'PERFECT!';
      resultCol = C.perfect;
      resultTimer = 0.6;
      game.audio.play('se_success', 0.7);
      for (var pi = 0; pi < 10; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: playerX, y: playerY, vx: Math.cos(ang) * 300, vy: Math.sin(ang) * 300 - 200, life: 0.5, col: C.perfect });
      }
      if (score >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(score * 300 + Math.ceil(timeLeft) * 100); }, 700);
      }
    } else if (good) {
      score++;
      resultText = 'GOOD';
      resultCol = C.good;
      resultTimer = 0.5;
      game.audio.play('se_tap', 0.5);
      for (var pi2 = 0; pi2 < 5; pi2++) {
        var ang2 = Math.random() * Math.PI * 2;
        particles.push({ x: playerX, y: playerY, vx: Math.cos(ang2) * 200, vy: Math.sin(ang2) * 200 - 100, life: 0.4, col: C.good });
      }
      if (score >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(score * 200 + Math.ceil(timeLeft) * 80); }, 700);
      }
    } else {
      misses++;
      resultText = 'MISS';
      resultCol = C.miss;
      resultTimer = 0.5;
      game.audio.play('se_failure', 0.3);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
    }

    // Always jump
    playerVY = JUMP_VY;
    onGround = false;
    game.audio.play('se_tap', 0.15);
    totalBeats++;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    tryJump();
  });

  game.onSwipe(function(dir) {
    if (done) return;
    tryJump();
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

    // Beat timer
    beatTimer += dt;
    if (beatTimer >= BEAT_INTERVAL) {
      beatTimer -= BEAT_INTERVAL;
      beatCount++;
      beatPulse = 1.0;
      spawnBeatBar();
    }
    if (beatPulse > 0) beatPulse -= dt * 6;
    if (resultTimer > 0) resultTimer -= dt;

    // Beat bars
    for (var bi = beatBars.length - 1; bi >= 0; bi--) {
      beatBars[bi].alpha -= dt * 3;
      if (beatBars[bi].alpha <= 0) beatBars.splice(bi, 1);
    }

    // Physics
    if (!onGround) {
      playerVY += GRAVITY * dt;
      playerY += playerVY * dt;
      if (playerY >= FLOOR_Y) {
        playerY = FLOOR_Y;
        playerVY = 0;
        onGround = true;
      }
    }

    // Trail
    trail.push({ x: playerX, y: playerY, life: 0.25 });
    for (var ti = trail.length - 1; ti >= 0; ti--) {
      trail[ti].life -= dt * 4;
      if (trail[ti].life <= 0) trail.splice(ti, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 800 * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Floor with pulse
    var pulseA = 0.3 + beatPulse * 0.5;
    game.draw.rect(0, FLOOR_Y + PLAYER_R, W, H - FLOOR_Y - PLAYER_R, C.floor, 0.9);
    game.draw.rect(0, FLOOR_Y + PLAYER_R - 6, W, 6, C.beat, pulseA);

    // Beat bars (horizontal flashes)
    for (var bi2 = 0; bi2 < beatBars.length; bi2++) {
      game.draw.rect(0, beatBars[bi2].y, W, 4, C.beatHi, beatBars[bi2].alpha * 0.6);
    }

    // Beat timing indicator (bottom zone)
    var beatProgress = beatTimer / BEAT_INTERVAL;
    var indicatorX = W * beatProgress;
    game.draw.rect(0, FLOOR_Y + PLAYER_R + 20, W, 12, C.ui, 0.4);
    game.draw.rect(indicatorX - 4, FLOOR_Y + PLAYER_R + 16, 8, 20, C.beatHi, 0.9);

    // Perfect window indicator
    var perfectCenterX = W * 0.5;
    game.draw.rect(perfectCenterX - W * BEAT_WINDOW / BEAT_INTERVAL, FLOOR_Y + PLAYER_R + 16,
      W * BEAT_WINDOW * 2 / BEAT_INTERVAL, 20, C.perfect, 0.2);

    // Trail
    for (var ti2 = 0; ti2 < trail.length; ti2++) {
      var tp = trail[ti2];
      game.draw.circle(tp.x, tp.y, PLAYER_R * 0.5 * (tp.life / 0.25), C.trail, tp.life * 0.4);
    }

    // Player
    var squish = onGround ? 1.2 : 0.85;
    game.draw.circle(playerX + 4, playerY + 4, PLAYER_R, '#000', 0.25);
    game.draw.circle(playerX, playerY, PLAYER_R * squish, C.player, 0.9);
    game.draw.circle(playerX - 12, playerY - 12, PLAYER_R * 0.3, C.playerHi, 0.5);

    // Glow on beat
    if (beatPulse > 0) {
      game.draw.circle(playerX, playerY, PLAYER_R * 2.5, C.beat, beatPulse * 0.2);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    // Result text
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.55, { size: 72, color: resultCol, bold: true });
    }

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 44 + mi * 88, H * 0.955, 18, mi < misses ? C.miss : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.beat : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
  });
})(game);

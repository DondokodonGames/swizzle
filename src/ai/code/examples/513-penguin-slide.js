// 513-penguin-slide.js
// ペンギンスライド — 氷の坂を滑るペンギンを上下スワイプで障害物を避けさせる
// 操作: 上スワイプでジャンプ、下スワイプでしゃがむ
// 成功: 500m走破  失敗: 3回衝突 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#010a14',
    sky:    '#0c1e30',
    snow:   '#cce8f4',
    snowHi: '#f0f9ff',
    ice:    '#7dd3fc',
    penguin:'#1e293b',
    penguinBelly:'#f1f5f9',
    penguinBeak:'#f59e0b',
    obLow:  '#3b82f6',  // low obstacle (jump over)
    obHigh: '#a855f7',  // high obstacle (duck under)
    hit:    '#ef4444',
    safe:   '#22c55e',
    text:   '#f1f5f9',
    ui:     '#374151'
  };

  var GROUND_Y = H * 0.72;
  var PENGUIN_X = W * 0.25;
  var PENGUIN_R = 52;
  var penguin = { y: GROUND_Y - PENGUIN_R, vy: 0, crouching: false, jumpTimer: 0 };
  var obstacles = [];
  var score = 0;
  var GOAL = 500;
  var hits = 0;
  var MAX_HITS = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var nextObstacle = 1.5;
  var speed = 400;
  var flashAnim = 0;
  var invincible = 0;
  var snowflakes = [];

  // Background snowflakes
  for (var si = 0; si < 30; si++) {
    snowflakes.push({ x: Math.random() * W, y: Math.random() * H, r: 2 + Math.random() * 4, vy: 40 + Math.random() * 60 });
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'up' && !penguin.jumpTimer && penguin.y >= GROUND_Y - PENGUIN_R - 5) {
      penguin.vy = -900;
      penguin.jumpTimer = 0.6;
      penguin.crouching = false;
      game.audio.play('se_tap', 0.4);
    } else if (dir === 'down') {
      penguin.crouching = true;
      game.audio.play('se_tap', 0.2);
    }
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    if (ty < H * 0.5) {
      // Top half = jump
      if (!penguin.jumpTimer && penguin.y >= GROUND_Y - PENGUIN_R - 5) {
        penguin.vy = -900;
        penguin.jumpTimer = 0.6;
        penguin.crouching = false;
        game.audio.play('se_tap', 0.4);
      }
    } else {
      // Bottom half = crouch
      penguin.crouching = true;
      game.audio.play('se_tap', 0.2);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      score += speed * dt / 10;
      if (score >= GOAL) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(Math.floor(score) * 10 + (MAX_HITS - hits) * 500 + Math.ceil(timeLeft) * 100); }, 700);
        return;
      }
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (invincible > 0) invincible -= dt;

    // Penguin physics
    if (penguin.jumpTimer > 0) penguin.jumpTimer -= dt;
    if (!penguin.crouching) {
      penguin.vy += 2200 * dt;
    }
    penguin.y += penguin.vy * dt;
    if (penguin.y >= GROUND_Y - PENGUIN_R) {
      penguin.y = GROUND_Y - PENGUIN_R;
      penguin.vy = 0;
      penguin.jumpTimer = 0;
    }
    // Auto-stand after crouch
    if (penguin.crouching && penguin.y >= GROUND_Y - PENGUIN_R - 2) {
      setTimeout(function() { if (!done) penguin.crouching = false; }, 300);
    }

    // Increase speed
    speed = 400 + score * 0.8;

    // Spawn obstacles
    nextObstacle -= dt;
    if (nextObstacle <= 0 && !done) {
      var isHigh = Math.random() < 0.5; // high (duck) or low (jump)
      obstacles.push({
        x: W + 60,
        y: isHigh ? GROUND_Y - PENGUIN_R * 2.5 : GROUND_Y,
        w: 40,
        h: isHigh ? 120 : 80,
        high: isHigh
      });
      nextObstacle = 0.8 + Math.random() * 0.8;
    }

    // Update obstacles
    for (var oi = obstacles.length - 1; oi >= 0; oi--) {
      obstacles[oi].x -= speed * dt;
      if (obstacles[oi].x < -80) { obstacles.splice(oi, 1); continue; }

      // Collision
      if (invincible <= 0) {
        var ob = obstacles[oi];
        var penR = penguin.crouching ? PENGUIN_R * 0.55 : PENGUIN_R;
        var penY = penguin.crouching ? GROUND_Y - penR : penguin.y;
        var dx2 = Math.abs(PENGUIN_X - (ob.x + ob.w / 2));
        var dy2 = Math.abs(penY - (ob.y - ob.h / 2));
        if (dx2 < penR + ob.w / 2 - 10 && dy2 < penR + ob.h / 2 - 10) {
          hits++;
          flashAnim = 0.7;
          invincible = 1.2;
          game.audio.play('se_failure', 0.6);
          for (var pi = 0; pi < 8; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: PENGUIN_X, y: penguin.y, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.4, col: C.hit });
          }
          if (hits >= MAX_HITS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
          }
        }
      }
    }

    // Snowflakes
    for (var sfi = 0; sfi < snowflakes.length; sfi++) {
      snowflakes[sfi].x -= speed * 0.1 * dt;
      snowflakes[sfi].y += snowflakes[sfi].vy * dt;
      if (snowflakes[sfi].x < 0) snowflakes[sfi].x = W;
      if (snowflakes[sfi].y > H) snowflakes[sfi].y = 0;
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H * 0.65, C.sky, 0.5);

    // Snowflakes
    for (var sfi2 = 0; sfi2 < snowflakes.length; sfi2++) {
      game.draw.circle(snowflakes[sfi2].x, snowflakes[sfi2].y, snowflakes[sfi2].r, C.snowHi, 0.5);
    }

    // Ground
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, C.snow, 0.9);
    game.draw.rect(0, GROUND_Y, W, 12, C.snowHi, 0.7);
    // Ice sparkles
    for (var isi = 0; isi < 8; isi++) {
      var sparkX = (isi * 140 + elapsed * 60) % W;
      game.draw.circle(sparkX, GROUND_Y + 6, 3, C.ice, 0.6);
    }

    // Obstacles
    for (var oi2 = 0; oi2 < obstacles.length; oi2++) {
      var ob2 = obstacles[oi2];
      var obCol = ob2.high ? C.obHigh : C.obLow;
      game.draw.rect(ob2.x, ob2.y - ob2.h, ob2.w, ob2.h, obCol, 0.9);
      game.draw.rect(ob2.x, ob2.y - ob2.h, ob2.w, 8, '#fff', 0.3);
    }

    // Penguin
    var penR2 = penguin.crouching ? PENGUIN_R * 0.55 : PENGUIN_R;
    var penY2 = penguin.crouching ? GROUND_Y - penR2 : penguin.y;
    var invBlink = invincible > 0 ? (Math.sin(elapsed * 20) > 0 ? 0.5 : 0.9) : 0.9;
    game.draw.circle(PENGUIN_X, penY2, penR2, C.penguin, invBlink);
    game.draw.circle(PENGUIN_X, penY2 + penR2 * 0.1, penR2 * 0.6, C.penguinBelly, 0.8);
    game.draw.circle(PENGUIN_X + penR2 * 0.35, penY2 - penR2 * 0.15, penR2 * 0.1, C.penguinBeak, 0.9);
    game.draw.circle(PENGUIN_X - penR2 * 0.2, penY2 - penR2 * 0.25, penR2 * 0.1, '#fff', 0.9);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.hit, flashAnim * 0.15);

    // Score
    game.draw.text(Math.floor(score) + 'm', W * 0.75, H * 0.14, { size: 56, color: C.text, bold: true });
    game.draw.text('Goal ' + GOAL + 'm', W * 0.75, H * 0.20, { size: 36, color: C.ui });

    // Hit dots
    for (var hiti = 0; hiti < MAX_HITS; hiti++) {
      game.draw.circle(W / 2 - (MAX_HITS - 1) * 60 + hiti * 120, H * 0.955, 22, hiti < hits ? C.hit : C.ui, 0.9);
    }

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.ice : C.hit);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
  });
})(game);

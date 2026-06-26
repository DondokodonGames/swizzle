// 356-hot-potato.js
// ホットポテト — 熱いジャガイモを持ちすぎずに次へ渡す
// 操作: タップで左右に渡す（持ちすぎると爆発）
// 成功: 25回渡す  失敗: 爆発3回 or 35秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#1a0500',
    potato: '#d97706',
    potatoHi:'#fbbf24',
    potatoHot:'#ef4444',
    smoke:  '#78716c',
    playerL:'#3b82f6',
    playerR:'#22c55e',
    playerHi:'#fff',
    danger: '#ef4444',
    ui:     '#92400e',
    text:   '#fef3c7'
  };

  var holder = 0; // 0=left player, 1=right player
  var holdTime = 0;
  var MAX_HOLD = 1.8;
  var DANGER_TIME = 1.2;

  var passed = 0;
  var NEEDED = 25;
  var explosions = 0;
  var MAX_EXPLOSIONS = 3;
  var done = false;
  var timeLeft = 35;
  var elapsed = 0;
  var particles = [];
  var smokeTrails = [];
  var passAnim = 0;
  var passX = 0;
  var passDirRight = true;
  var potatoX = W * 0.25;
  var potatoTargetX = W * 0.25;
  var PASS_SPEED = 1400;
  var passing = false;
  var resultText = '';
  var resultAnim = 0;

  var playerLX = W * 0.22;
  var playerRX = W * 0.78;
  var playerY = H * 0.55;

  function explode() {
    explosions++;
    resultText = '爆発！';
    resultAnim = 0.9;
    game.audio.play('se_failure', 0.7);
    for (var pi = 0; pi < 15; pi++) {
      var ang = Math.random() * Math.PI * 2;
      particles.push({ x: potatoX, y: playerY - 20, vx: Math.cos(ang)*280, vy: Math.sin(ang)*280-100, life:0.7, col: C.potatoHot });
    }
    if (explosions >= MAX_EXPLOSIONS && !done) {
      done = true;
      setTimeout(function() { game.end.failure(); }, 500);
      return;
    }
    // Reset
    holdTime = 0;
    holder = Math.random() < 0.5 ? 0 : 1;
    potatoX = holder === 0 ? playerLX : playerRX;
    potatoTargetX = potatoX;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (passing) return;

    if (tx < W / 2 && holder === 0) {
      // Left player passes right
      passing = true;
      holder = 1;
      potatoTargetX = playerRX;
      passed++;
      holdTime = 0;
      game.audio.play('se_tap', 0.4);
      resultText = 'パス！';
      resultAnim = 0.4;
      if (passed >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(passed * 200 + Math.ceil(timeLeft) * 100); }, 400);
        return;
      }
    } else if (tx >= W / 2 && holder === 1) {
      // Right player passes left
      passing = true;
      holder = 0;
      potatoTargetX = playerLX;
      passed++;
      holdTime = 0;
      game.audio.play('se_tap', 0.4);
      resultText = 'パス！';
      resultAnim = 0.4;
      if (passed >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(passed * 200 + Math.ceil(timeLeft) * 100); }, 400);
        return;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (resultAnim > 0) resultAnim -= dt * 2;

    if (passing) {
      var diff = potatoTargetX - potatoX;
      var move = PASS_SPEED * dt;
      if (Math.abs(diff) < move) {
        potatoX = potatoTargetX;
        passing = false;
      } else {
        potatoX += Math.sign(diff) * move;
      }
    } else {
      holdTime += dt;
      // Smoke when getting hot
      if (holdTime > DANGER_TIME * 0.5 && Math.random() < dt * 8) {
        smokeTrails.push({ x: potatoX + (Math.random()-0.5)*30, y: playerY - 40, vy: -40, life: 0.8 });
      }
      if (holdTime >= MAX_HOLD) {
        explode();
        return;
      }
    }

    for (var st = smokeTrails.length - 1; st >= 0; st--) {
      smokeTrails[st].y += smokeTrails[st].vy * dt;
      smokeTrails[st].life -= dt;
      if (smokeTrails[st].life <= 0) smokeTrails.splice(st, 1);
    }
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 300 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Players
    var lArm = holder === 0 ? -20 : 0;
    var rArm = holder === 1 ? 20 : 0;

    // Left player
    game.draw.circle(playerLX, playerY - 90, 50, C.playerL, 0.9);
    game.draw.circle(playerLX, playerY - 90, 34, C.playerHi, 0.8);
    game.draw.rect(playerLX - 30, playerY - 40, 60, 100, C.playerL, 0.8);
    // Arms
    game.draw.line(playerLX + 30, playerY - 30, playerLX + 90 + lArm, playerY + 10, C.playerL, 14);
    game.draw.line(playerLX - 30, playerY - 30, playerLX - 60, playerY + 20, C.playerL, 14);

    // Right player
    game.draw.circle(playerRX, playerY - 90, 50, C.playerR, 0.9);
    game.draw.circle(playerRX, playerY - 90, 34, C.playerHi, 0.8);
    game.draw.rect(playerRX - 30, playerY - 40, 60, 100, C.playerR, 0.8);
    game.draw.line(playerRX - 30, playerY - 30, playerRX - 90 + rArm, playerY + 10, C.playerR, 14);
    game.draw.line(playerRX + 30, playerY - 30, playerRX + 60, playerY + 20, C.playerR, 14);

    // Smoke
    for (var st2 = 0; st2 < smokeTrails.length; st2++) {
      var s = smokeTrails[st2];
      game.draw.circle(s.x, s.y, 16 * (1 - s.life * 0.5), C.smoke, s.life * 0.4);
    }

    // Potato
    var heatRatio = holdTime / MAX_HOLD;
    var hotColor = heatRatio > 0.67 ? C.potatoHot : C.potato;
    game.draw.circle(potatoX, playerY - 20, 44 + Math.sin(elapsed * 8) * 4, hotColor, 0.9);
    game.draw.circle(potatoX - 14, playerY - 34, 14, C.potatoHi, 0.5);
    game.draw.text('🥔', potatoX, playerY - 8, { size: 48 });

    // Heat gauge
    var gaugeW = 300;
    var gaugeX = W / 2 - gaugeW / 2;
    var gaugeY = playerY + 100;
    game.draw.rect(gaugeX, gaugeY, gaugeW, 24, '#1a0500', 0.9);
    var gaugeColor = heatRatio > 0.67 ? C.danger : (heatRatio > 0.33 ? '#f59e0b' : C.potato);
    game.draw.rect(gaugeX, gaugeY, gaugeW * heatRatio, 24, gaugeColor, 0.9);
    if (heatRatio > 0.8) {
      game.draw.text('危険！早く渡せ！', W / 2, gaugeY + 60, { size: 40, color: C.danger, bold: true });
    }

    // Tap hints
    if (!passing) {
      if (holder === 0) {
        game.draw.text('左タップで渡す ▶', W * 0.25, H * 0.76, { size: 34, color: C.playerL });
      } else {
        game.draw.text('◀ 右タップで渡す', W * 0.75, H * 0.76, { size: 34, color: C.playerR });
      }
    }

    if (resultAnim > 0) {
      game.draw.text(resultText, W / 2, H * 0.82, { size: 56, color: resultText === 'パス！' ? C.potatoHi : C.danger, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life * 2, p.col, p.life * 0.8);
    }

    // Explosion dots
    for (var ei = 0; ei < MAX_EXPLOSIONS; ei++) {
      game.draw.circle(W / 2 - (MAX_EXPLOSIONS - 1) * 28 + ei * 56, H * 0.91, 16, ei < explosions ? C.danger : '#1a0500');
    }

    game.draw.text(passed + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 35);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.potato : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    holder = 0;
    potatoX = playerLX;
    potatoTargetX = playerLX;
  });
})(game);

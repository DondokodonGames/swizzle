// 784-pressure-valve.js
// プレッシャーバルブ — 上昇する圧力を連続タップで抑制せよ
// 操作: 連続タップで圧力を下げる（タップ毎に-0.04）
// 成功: 60秒間レッドゾーン（>0.85）に入らずに耐え切る  失敗: 3回レッドゾーン超過 or 70秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#080508',
    gauge:   '#0f0a0f',
    safe:    '#22c55e',
    warn:    '#f59e0b',
    danger:  '#ef4444',
    needle:  '#f1f5f9',
    pipe:    '#1e293b',
    steam:   '#94a3b8',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#080508'
  };

  var pressure = 0.2; // 0 to 1
  var RISE_SPEED = 0.12; // per second base
  var TAP_REDUCE = 0.04;
  var RED_ZONE = 0.85;
  var WARN_ZONE = 0.65;

  var overloads = 0;
  var MAX_OVERLOADS = 3;
  var overloadTimer = 0;
  var inRedZone = false;
  var redZoneTimer = 0;
  var RED_ZONE_GRACE = 1.2; // seconds before counting as overload

  var done = false;
  var gameTimer = 0; // counts up to WIN_TIME
  var WIN_TIME = 60;
  var timeLeft = 70;
  var elapsed = 0;

  var steamParticles = [];
  var tapFlash = 0;
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  game.onTap(function(tx, ty) {
    if (done) return;
    pressure -= TAP_REDUCE;
    if (pressure < 0) pressure = 0;
    tapFlash = 0.12;
    game.audio.play('se_tap', 0.05);
    // Steam burst from valve
    for (var i = 0; i < 3; i++) {
      var pa = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
      steamParticles.push({
        x: W / 2 + (Math.random() - 0.5) * 60,
        y: H * 0.32,
        vx: Math.cos(pa) * (60 + Math.random() * 80),
        vy: Math.sin(pa) * (80 + Math.random() * 100),
        life: 0.5 + Math.random() * 0.3,
        size: 16 + Math.random() * 20
      });
    }
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

    // Pressure rises
    var riseMulti = 1 + score_approx() * 0.03;
    pressure += RISE_SPEED * riseMulti * dt;
    if (pressure > 1) pressure = 1;

    // Check red zone
    if (pressure >= RED_ZONE) {
      if (!inRedZone) {
        inRedZone = true;
        redZoneTimer = 0;
      }
      redZoneTimer += dt;
      if (redZoneTimer >= RED_ZONE_GRACE) {
        // Overload!
        overloads++;
        inRedZone = false;
        redZoneTimer = 0;
        pressure = 0.5; // release valve
        flashCol = C.wrong;
        flashAnim = 0.5;
        resultText = '過圧！！';
        resultTimer = 0.5;
        game.audio.play('se_failure', 0.5);
        // Big steam burst
        for (var b = 0; b < 12; b++) {
          var ba = Math.random() * Math.PI * 2;
          steamParticles.push({
            x: W / 2, y: H * 0.32,
            vx: Math.cos(ba) * (150 + Math.random() * 200),
            vy: Math.sin(ba) * (150 + Math.random() * 200) - 100,
            life: 0.7,
            size: 28
          });
        }
        if (overloads >= MAX_OVERLOADS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
          return;
        }
      }
    } else {
      inRedZone = false;
      redZoneTimer = 0;
    }

    // Game timer (separate from timeLeft)
    if (!done) {
      gameTimer += dt;
      if (gameTimer >= WIN_TIME && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        var bonus = Math.max(0, timeLeft - (70 - WIN_TIME));
        setTimeout(function() { game.end.success(Math.ceil(bonus) * 200 + overloads === 0 ? 5000 : 3000); }, 700);
        return;
      }
    }

    if (tapFlash > 0) tapFlash -= dt * 4;
    if (flashAnim > 0) flashAnim -= dt * 2.5;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = steamParticles.length - 1; pp >= 0; pp--) {
      steamParticles[pp].x += steamParticles[pp].vx * dt;
      steamParticles[pp].y += steamParticles[pp].vy * dt;
      steamParticles[pp].vy -= 40 * dt;
      steamParticles[pp].life -= dt * 1.8;
      if (steamParticles[pp].life <= 0) steamParticles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Pipes
    game.draw.rect(W * 0.1, H * 0.38, W * 0.8, 60, C.pipe, 0.9);
    game.draw.rect(W * 0.1, H * 0.38, W * 0.8, 8, '#334155', 0.6);
    // Pipe bolts
    for (var bi = 0; bi < 6; bi++) {
      var bx = W * 0.1 + bi * W * 0.8 / 5;
      game.draw.circle(bx, H * 0.38 + 30, 12, '#1e293b', 0.9);
      game.draw.circle(bx, H * 0.38 + 30, 6, '#0a0f1a', 0.9);
    }

    // Gauge background
    var gx = W / 2 - 160;
    var gy = H * 0.18;
    var gw = 320;
    var gh = 190;
    game.draw.rect(gx, gy, gw, gh, C.gauge, 0.95);
    game.draw.rect(gx, gy, gw, 6, '#2d3748', 0.7);

    // Gauge colored zones (horizontal bar)
    var barX = gx + 20;
    var barY = gy + 50;
    var barW = gw - 40;
    var barH = 40;
    game.draw.rect(barX, barY, barW * WARN_ZONE, barH, C.safe, 0.7);
    game.draw.rect(barX + barW * WARN_ZONE, barY, barW * (RED_ZONE - WARN_ZONE), barH, C.warn, 0.7);
    game.draw.rect(barX + barW * RED_ZONE, barY, barW * (1 - RED_ZONE), barH, C.danger, 0.7);

    // Pressure indicator
    var col = pressure >= RED_ZONE ? C.danger : (pressure >= WARN_ZONE ? C.warn : C.safe);
    var pulse = pressure >= RED_ZONE ? 1 + 0.1 * Math.sin(elapsed * 12) : 1;
    game.draw.rect(barX, barY, barW * pressure * pulse, barH, col, 0.9);

    // Needle marker
    var nx = barX + barW * pressure;
    game.draw.rect(nx - 4, barY - 10, 8, barH + 20, C.needle, 0.95);

    // Label
    game.draw.text('圧力', W / 2, gy + 30, { size: 34, color: C.text });
    var pct = Math.round(pressure * 100);
    game.draw.text(pct + '%', W / 2, gy + 130, { size: 54, color: col, bold: true });
    game.draw.text('危険ライン: ' + Math.round(RED_ZONE * 100) + '%', W / 2, gy + 175, { size: 28, color: C.danger + 'aa' });

    // Steam particles
    for (var pp2 = 0; pp2 < steamParticles.length; pp2++) {
      var sp = steamParticles[pp2];
      game.draw.circle(sp.x, sp.y, sp.size * sp.life, C.steam, sp.life * 0.4);
    }

    // Valve visual (tappable area)
    var valveY = H * 0.32;
    game.draw.rect(W / 2 - 50, valveY - 20, 100, 40, '#334155', 0.9);
    game.draw.circle(W / 2, valveY, 28 + tapFlash * 20, tapFlash > 0 ? C.safe : '#4a5568', 0.9);
    game.draw.circle(W / 2, valveY, 16, tapFlash > 0 ? '#fff' : '#64748b', 0.9);
    game.draw.text('バルブ', W / 2, valveY + 55, { size: 30, color: C.steam + 'aa' });

    // Red zone warning flash
    if (pressure >= RED_ZONE) {
      game.draw.rect(0, 0, W, H, C.danger, 0.04 + 0.04 * Math.sin(elapsed * 15));
      game.draw.text('危険！タップ連打！', W / 2, H * 0.88, { size: 48, color: C.danger, bold: true });
    } else {
      game.draw.text('タップで圧力DOWN', W / 2, H * 0.88, { size: 38, color: C.text + '44' });
    }

    // Game timer bar (60s)
    var gameRatio = Math.min(1, gameTimer / WIN_TIME);
    game.draw.rect(0, H * 0.92, W * gameRatio, 16, C.safe, 0.5);
    game.draw.text(Math.ceil(WIN_TIME - gameTimer) + 's耐えろ', W / 2, H * 0.907, { size: 30, color: C.safe + 'aa' });

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.82, { size: 52, color: flashCol, bold: true });
    }

    // Overload indicators
    for (var oi = 0; oi < MAX_OVERLOADS; oi++) {
      game.draw.circle(W / 2 - (MAX_OVERLOADS - 1) * 80 + oi * 160, H * 0.955, 28, oi < overloads ? C.wrong : C.ui, 0.9);
    }

    var ratio = Math.max(0, timeLeft / 70);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  function score_approx() { return Math.floor(gameTimer / 10); }

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
  });
})(game);

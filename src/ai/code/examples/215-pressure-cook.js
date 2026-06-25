// 215-pressure-cook.js
// プレッシャークック — 圧力計が赤ゾーンに入ったら即タップして圧を逃す緊張ゲーム
// 操作: タップで圧力解放  長押しで火力調整
// 成功: 60秒煮る  失敗: 圧力爆発 or 火が消える

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0d0d0d',
    pot:    '#374151',
    potHi:  '#6b7280',
    steam:  '#e0f2fe',
    gauge:  '#1e3a5f',
    safe:   '#22c55e',
    warn:   '#f59e0b',
    danger: '#ef4444',
    fire:   '#f97316',
    fireHi: '#fed7aa',
    ui:     '#64748b'
  };

  var pressure = 0.3;    // 0–1
  var SAFE_MAX = 0.65;
  var DANGER_MIN = 0.75;
  var EXPLODE_MAX = 1.0;
  var DEAD_MIN = 0.0;    // fire goes out

  var fireLevel = 0.6;   // 0–1, controls pressure rise speed
  var FIRE_DECAY = 0.04; // fire naturally decreases
  var FIRE_TAP = 0.25;   // holding boosts fire
  var PRESSURE_RISE = 0.12; // per second at full fire
  var RELEASE_AMOUNT = 0.18; // tap releases pressure

  var survived = 0;
  var NEEDED = 60;
  var done = false;
  var elapsed = 0;
  var holding = false;
  var holdTimer = 0;
  var steam = [];
  var feedback = 0;
  var feedbackOk = false;

  game.onTap(function(tx, ty) {
    if (done) return;
    // Lower half: release pressure
    if (ty > H * 0.5) {
      pressure = Math.max(0, pressure - RELEASE_AMOUNT);
      feedbackOk = true; feedback = 0.2;
      game.audio.play('se_tap', 0.5);
      for (var i = 0; i < 5; i++) {
        steam.push({
          x: W / 2 + (Math.random() - 0.5) * 100,
          y: H * 0.35,
          vx: (Math.random() - 0.5) * 80,
          vy: -(100 + Math.random() * 150),
          life: 0.8 + Math.random() * 0.4,
          size: 20 + Math.random() * 20
        });
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      survived += dt;
      elapsed += dt;
      if (survived >= NEEDED) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(Math.ceil(survived) * 50 + 800); }, 400);
        return;
      }
    }
    if (feedback > 0) feedback -= dt;

    // Fire decays naturally, needs manual boost via long-press (simulate with random events)
    fireLevel -= FIRE_DECAY * dt;
    fireLevel = Math.max(0, Math.min(1, fireLevel));

    // Random fire fluctuation
    fireLevel += (Math.random() - 0.45) * 0.03;
    fireLevel = Math.max(0.05, Math.min(0.9, fireLevel));

    // Pressure rises with fire
    pressure += PRESSURE_RISE * fireLevel * dt;

    // Natural leak
    pressure -= 0.008 * dt;
    pressure = Math.max(0, Math.min(1, pressure));

    // Check conditions
    if (pressure >= EXPLODE_MAX && !done) {
      done = true;
      game.audio.play('se_failure');
      setTimeout(function() { game.end.failure(); }, 500);
    }
    if (fireLevel < 0.08 && survived > 3 && !done) {
      done = true;
      feedbackOk = false; feedback = 0.5;
      game.audio.play('se_failure');
      setTimeout(function() { game.end.failure(); }, 400);
    }

    // Steam particles
    if (pressure > 0.5 && Math.random() < dt * (pressure * 5)) {
      steam.push({
        x: W / 2 + (Math.random() - 0.5) * 60,
        y: H * 0.33,
        vx: (Math.random() - 0.5) * 50,
        vy: -(40 + Math.random() * 80),
        life: 0.6 + Math.random() * 0.4,
        size: 12 + Math.random() * 16
      });
    }
    for (var si = steam.length - 1; si >= 0; si--) {
      steam[si].x += steam[si].vx * dt;
      steam[si].y += steam[si].vy * dt;
      steam[si].life -= dt;
      if (steam[si].life <= 0) steam.splice(si, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Pot body
    var potX = W / 2 - 200;
    var potY = H * 0.38;
    var potW = 400;
    var potH = 280;
    game.draw.rect(potX, potY, potW, potH, C.pot, 0.9);
    game.draw.rect(potX, potY, potW, 20, C.potHi, 0.4);
    // Lid
    game.draw.rect(potX - 20, potY - 30, potW + 40, 36, C.potHi, 0.8);
    // Handle
    game.draw.rect(potX - 60, potY + 50, 50, 20, C.potHi, 0.7);
    game.draw.rect(potX + potW + 10, potY + 50, 50, 20, C.potHi, 0.7);

    // Steam valve
    var valveShake = pressure > DANGER_MIN ? (Math.random() - 0.5) * 8 : 0;
    game.draw.rect(W / 2 - 15 + valveShake, potY - 60, 30, 30, pressure > DANGER_MIN ? C.danger : C.potHi, 0.9);

    // Steam particles
    for (var si2 = 0; si2 < steam.length; si2++) {
      var s = steam[si2];
      game.draw.circle(s.x, s.y, s.size * s.life, C.steam, s.life * 0.4);
    }

    // Pressure gauge (circular)
    var gCX = W / 2;
    var gCY = H * 0.72;
    var gR = 110;
    game.draw.circle(gCX, gCY, gR + 10, C.gauge, 0.9);
    game.draw.circle(gCX, gCY, gR, '#0f172a', 0.95);

    // Colored zones
    var startAngle = Math.PI * 0.75;
    var totalAngle = Math.PI * 1.5;
    // Safe zone (green)
    for (var a = startAngle; a < startAngle + totalAngle * SAFE_MAX; a += 0.02) {
      game.draw.line(
        gCX + Math.cos(a) * (gR - 20), gCY + Math.sin(a) * (gR - 20),
        gCX + Math.cos(a) * gR, gCY + Math.sin(a) * gR,
        C.safe, 3
      );
    }
    // Warn zone
    for (var a2 = startAngle + totalAngle * SAFE_MAX; a2 < startAngle + totalAngle * DANGER_MIN; a2 += 0.02) {
      game.draw.line(
        gCX + Math.cos(a2) * (gR - 20), gCY + Math.sin(a2) * (gR - 20),
        gCX + Math.cos(a2) * gR, gCY + Math.sin(a2) * gR,
        C.warn, 3
      );
    }
    // Danger zone
    for (var a3 = startAngle + totalAngle * DANGER_MIN; a3 < startAngle + totalAngle; a3 += 0.02) {
      game.draw.line(
        gCX + Math.cos(a3) * (gR - 20), gCY + Math.sin(a3) * (gR - 20),
        gCX + Math.cos(a3) * gR, gCY + Math.sin(a3) * gR,
        C.danger, 3
      );
    }

    // Needle
    var needleAngle = startAngle + totalAngle * pressure;
    game.draw.line(gCX, gCY, gCX + Math.cos(needleAngle) * (gR - 10), gCY + Math.sin(needleAngle) * (gR - 10), '#fff', 5);
    game.draw.circle(gCX, gCY, 12, '#fff', 0.9);

    // Pressure text
    var pCol = pressure > DANGER_MIN ? C.danger : pressure > SAFE_MAX ? C.warn : C.safe;
    game.draw.text(Math.round(pressure * 100) + '%', gCX, gCY + 40, { size: 44, color: pCol, bold: true });

    // Fire indicator
    var fY = H * 0.88;
    for (var fi = 0; fi < 5; fi++) {
      var fx = W / 2 - 100 + fi * 50;
      var fOn = fi < Math.ceil(fireLevel * 5);
      game.draw.circle(fx, fY, 18, fOn ? C.fire : C.ui, fOn ? 0.9 : 0.3);
    }
    game.draw.text('火力', W / 2, H * 0.91, { size: 34, color: C.ui });

    // Instruction
    game.draw.text('下タップで圧力解放！', W / 2, H * 0.95, { size: 38, color: '#64748b' });

    if (feedback > 0 && feedbackOk) {
      game.draw.rect(0, 0, W, H, '#22c55e', feedback * 0.08);
    }

    var ratio = Math.min(1, survived / NEEDED);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, '#22c55e');
    game.draw.text(survived.toFixed(1) + 's', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
  });
})(game);

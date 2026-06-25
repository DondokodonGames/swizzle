// 024-voltage-surge.js
// ボルテージサージ — 電力過負荷寸前の綱渡り、上げすぎたら終わり
// 操作: タップでパワーを追加、過負荷になる前に止める
// 成功: 許容範囲内で5秒キープ  失敗: 過負荷 or 電力不足 or 20秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040810',
    panel:   '#0a1020',
    ok:      '#22c55e',
    warn:    '#f59e0b',
    danger:  '#ef4444',
    elec:    '#38bdf8',
    elecHi:  '#bae6fd',
    ui:      '#475569'
  };

  // Power level: 0.0 to 1.0
  // Safe zone: 0.45 - 0.85
  var power = 0.2;
  var DRAIN_RATE = 0.06;  // power drops over time (per second)
  var TAP_BOOST = 0.14;   // each tap adds this much

  var MIN_SAFE = 0.45;
  var MAX_SAFE = 0.85;
  var MAX_POWER = 1.0;

  var safeTimer = 0;   // time spent in safe zone
  var NEEDED_SAFE = 5; // seconds in safe zone to win
  var timeLeft = 20;
  var done = false;

  var sparkParticles = [];
  var tapFlash = 0;

  function addSpark(x, y) {
    for (var i = 0; i < 5; i++) {
      var angle = Math.random() * Math.PI * 2;
      var spd = 200 + Math.random() * 300;
      sparkParticles.push({
        x: x, y: y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0.3 + Math.random() * 0.2
      });
    }
  }

  game.onTap(function(x, y) {
    if (done) return;
    power += TAP_BOOST;
    tapFlash = 0.12;
    addSpark(x, y);
    game.audio.play('se_tap', 0.6);

    if (power > MAX_POWER) {
      power = MAX_POWER;
      done = true;
      game.audio.play('se_failure');
      setTimeout(function() { game.end.failure(); }, 500);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }

      // Drain
      power -= DRAIN_RATE * dt;
      if (power < 0) power = 0;

      // Check safe zone
      if (power >= MIN_SAFE && power <= MAX_SAFE) {
        safeTimer += dt;
        if (safeTimer >= NEEDED_SAFE) {
          done = true;
          game.audio.play('se_success');
          setTimeout(function() {
            game.end.success(Math.ceil(safeTimer * 20) + Math.ceil(timeLeft) * 8);
          }, 400);
          return;
        }
      } else {
        safeTimer = Math.max(0, safeTimer - dt * 0.5); // slowly drain safe timer if out of range
        if (power < 0.1 && safeTimer <= 0) {
          // power failure
          done = true;
          game.audio.play('se_failure');
          setTimeout(function() { game.end.failure(); }, 400);
          return;
        }
      }
    }

    if (tapFlash > 0) tapFlash -= dt;

    // Update sparks
    for (var i = sparkParticles.length - 1; i >= 0; i--) {
      var s = sparkParticles[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= 0.9;
      s.vy *= 0.9;
      s.life -= dt;
      if (s.life <= 0) sparkParticles.splice(i, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Background grid (circuit board feel)
    for (var gx = 0; gx < W; gx += 80) {
      game.draw.rect(gx, 0, 1, H, '#0a1830', 0.4);
    }
    for (var gy = 0; gy < H; gy += 80) {
      game.draw.rect(0, gy, W, 1, '#0a1830', 0.4);
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#04080e');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.elec : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Safe timer progress ring
    var safePct = Math.min(1, safeTimer / NEEDED_SAFE);
    var ringR = 160;
    var ringX = W / 2, ringY = H * 0.25;
    game.draw.circle(ringX, ringY, ringR, '#0f1a2a');
    // Draw arc approximation as sectors
    var arcSegs = Math.floor(safePct * 32);
    for (var seg = 0; seg < arcSegs; seg++) {
      var ang1 = (seg / 32) * Math.PI * 2 - Math.PI / 2;
      var ang2 = ((seg + 1) / 32) * Math.PI * 2 - Math.PI / 2;
      var mx1 = ringX + Math.cos(ang1) * ringR;
      var my1 = ringY + Math.sin(ang1) * ringR;
      var mx2 = ringX + Math.cos(ang2) * ringR;
      var my2 = ringY + Math.sin(ang2) * ringR;
      game.draw.line(mx1, my1, mx2, my2, C.ok, 20);
    }
    game.draw.circle(ringX, ringY, ringR - 18, C.bg);
    game.draw.text(Math.ceil(NEEDED_SAFE - safeTimer) + 's', ringX, ringY, {
      size: 100, color: safePct > 0.5 ? C.ok : C.ui, bold: true
    });

    // Main power gauge (vertical bar)
    var GAUGE_X = W * 0.35;
    var GAUGE_Y = H * 0.42;
    var GAUGE_W = W * 0.3;
    var GAUGE_H = H * 0.35;

    game.draw.rect(GAUGE_X - 12, GAUGE_Y - 12, GAUGE_W + 24, GAUGE_H + 24, '#1e293b');
    game.draw.rect(GAUGE_X, GAUGE_Y, GAUGE_W, GAUGE_H, C.panel);

    // Safe zone marker
    var szY1 = GAUGE_Y + GAUGE_H * (1 - MAX_SAFE);
    var szY2 = GAUGE_Y + GAUGE_H * (1 - MIN_SAFE);
    game.draw.rect(GAUGE_X, szY1, GAUGE_W, szY2 - szY1, C.ok, 0.15);
    game.draw.rect(GAUGE_X - 20, szY1, 20, 4, C.ok);
    game.draw.rect(GAUGE_X - 20, szY2 - 4, 20, 4, C.ok);
    game.draw.text('OK', GAUGE_X - 54, (szY1 + szY2) / 2, { size: 32, color: C.ok, bold: true });

    // Power fill
    var fillH = GAUGE_H * power;
    var fillY = GAUGE_Y + GAUGE_H - fillH;
    var fillColor = power > MAX_SAFE ? C.danger : (power >= MIN_SAFE ? C.ok : (power >= MIN_SAFE * 0.5 ? C.warn : C.danger));
    game.draw.rect(GAUGE_X, fillY, GAUGE_W, fillH, fillColor);
    // Shine
    game.draw.rect(GAUGE_X + 8, fillY + 4, 20, fillH - 8, '#fff', 0.2);

    // Danger zone flash
    if (power >= MAX_SAFE) {
      var flashA = 0.15 + 0.1 * Math.sin(game.time.elapsed * 20);
      game.draw.rect(0, 0, W, H, C.danger, flashA);
    }

    // Electric bolt display
    if (tapFlash > 0) {
      game.draw.rect(0, 0, W, H, C.elec, tapFlash / 0.12 * 0.15);
    }

    // Sparks
    for (var sp = 0; sp < sparkParticles.length; sp++) {
      var spark = sparkParticles[sp];
      var sa = spark.life / 0.5;
      game.draw.circle(spark.x, spark.y, 6, C.elecHi, sa);
    }

    // Power number
    game.draw.text(Math.floor(power * 100) + '%', W / 2, GAUGE_Y + GAUGE_H + 80, {
      size: 64, color: fillColor, bold: true
    });

    // Guide
    game.draw.text('タップで電力チャージ！', W / 2, H - 220, { size: 52, color: C.ui });
    game.draw.text('OKゾーンを5秒キープ', W / 2, H - 155, { size: 40, color: '#334155' });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
  });
})(game);

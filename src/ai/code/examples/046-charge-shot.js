// 046-charge-shot.js
// チャージショット — 溜めて放つ一撃の快感、過充電に注意
// 操作: 長押し（または連打）でチャージ、離すorスワイプで発射
// 成功: 5回ベストゾーン(60-90%)でヒット  失敗: 過充電3回 or 15秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#050510',
    charge0:  '#1e293b',
    charge1:  '#0ea5e9',
    charge2:  '#22d3ee',
    chargeMax:'#ef4444',
    best:     '#22c55e',
    bestHi:   '#86efac',
    shot:     '#fbbf24',
    target:   '#f97316',
    ui:       '#475569'
  };

  var charge = 0.0;     // 0.0..1.0
  var CHARGE_RATE = 0.7; // per second while held
  var DRAIN_RATE = 0.2;  // per second when not held
  var isCharging = false;

  var BEST_MIN = 0.60;
  var BEST_MAX = 0.90;

  // Target moves horizontally
  var targetX = W / 2;
  var targetVx = 280;
  var TARGET_Y = H * 0.32;
  var TARGET_R = 70;

  var score = 0;
  var needed = 5;
  var overcharges = 0;
  var maxOvercharges = 3;
  var timeLeft = 15;
  var done = false;
  var shotAnim = 0; // shot animation timer
  var shotX = 0;
  var feedbackOk = false;
  var chargeFlash = 0;

  game.onHold(function(x, y, duration) {
    isCharging = true;
  });

  game.onTap(function(x, y) {
    if (!isCharging) isCharging = true;
    else isCharging = false; // toggle
  });

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'up') {
      // Fire!
      isCharging = false;
      var chargeLevel = charge;

      if (chargeLevel >= 1.0) {
        // Overcharge!
        overcharges++;
        feedbackOk = false;
        chargeFlash = 0.5;
        game.audio.play('se_failure', 0.7);
        charge = 0;
        if (overcharges >= maxOvercharges && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
        return;
      }

      shotAnim = 0.4;
      shotX = W / 2;
      charge = 0;

      var inBest = chargeLevel >= BEST_MIN && chargeLevel <= BEST_MAX;
      feedbackOk = inBest;

      // Check if target is in shot path (simplified: target near center X)
      var hitTarget = Math.abs(targetX - W / 2) < TARGET_R + 40;

      if (inBest && hitTarget) {
        score++;
        game.audio.play('se_tap', 1.0);
        if (score >= needed) {
          done = true;
          game.audio.play('se_success');
          setTimeout(function() {
            game.end.success(score * 25 + Math.ceil(timeLeft) * 6);
          }, 500);
        }
      } else {
        feedbackOk = false;
        game.audio.play('se_failure', 0.4);
      }
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
    }

    // Move target
    targetX += targetVx * dt;
    if (targetX + TARGET_R > W - 40) { targetX = W - 40 - TARGET_R; targetVx = -Math.abs(targetVx); }
    if (targetX - TARGET_R < 40) { targetX = 40 + TARGET_R; targetVx = Math.abs(targetVx); }

    // Charge
    if (isCharging && !done) {
      charge += CHARGE_RATE * dt;
      if (charge > 1.0) charge = 1.0;
    } else {
      charge -= DRAIN_RATE * dt;
      if (charge < 0) charge = 0;
    }

    if (shotAnim > 0) shotAnim -= dt;
    if (chargeFlash > 0) chargeFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Target
    var targetAlpha = Math.abs(targetX - W / 2) < TARGET_R + 40 ? 1.0 : 0.6;
    game.draw.circle(targetX, TARGET_Y, TARGET_R + 16, C.target, 0.2);
    game.draw.circle(targetX, TARGET_Y, TARGET_R, C.target, targetAlpha);
    game.draw.circle(targetX, TARGET_Y, TARGET_R * 0.5, '#fff', 0.3);
    game.draw.circle(targetX, TARGET_Y, TARGET_R * 0.25, C.shot, 0.6);
    // Target crosshair
    game.draw.line(targetX - TARGET_R, TARGET_Y, targetX + TARGET_R, TARGET_Y, '#fff', 2);
    game.draw.line(targetX, TARGET_Y - TARGET_R, targetX, TARGET_Y + TARGET_R, '#fff', 2);

    // Shot laser (while charging, faint beam)
    if (isCharging) {
      var beamAlpha = charge * 0.5;
      game.draw.line(W / 2, H * 0.85, W / 2, TARGET_Y, C.charge1, 4 + charge * 12);
      game.draw.rect(W / 2 - 4, TARGET_Y, 8, H * 0.85 - TARGET_Y, C.charge2, beamAlpha);
    }

    // Shot animation
    if (shotAnim > 0) {
      var sa = shotAnim / 0.4;
      var shotY = H * 0.85 - (H * 0.85 - TARGET_Y) * (1 - sa);
      game.draw.circle(W / 2, shotY, 24 + sa * 20, C.shot, sa);
      game.draw.rect(W / 2 - 6, shotY, 12, H * 0.85 - shotY, C.shot, sa * 0.8);
    }

    // Overcharge flash
    if (chargeFlash > 0) {
      game.draw.rect(0, 0, W, H, C.chargeMax, chargeFlash * 0.3);
    }

    // Charge gauge (big vertical bar)
    var GAUGE_X = W * 0.08;
    var GAUGE_Y = H * 0.25;
    var GAUGE_W = 48;
    var GAUGE_H = H * 0.45;

    game.draw.rect(GAUGE_X - 4, GAUGE_Y - 4, GAUGE_W + 8, GAUGE_H + 8, '#1e293b');
    game.draw.rect(GAUGE_X, GAUGE_Y, GAUGE_W, GAUGE_H, '#080818');

    // Best zone marker
    var bestY1 = GAUGE_Y + GAUGE_H * (1 - BEST_MAX);
    var bestY2 = GAUGE_Y + GAUGE_H * (1 - BEST_MIN);
    game.draw.rect(GAUGE_X, bestY1, GAUGE_W, bestY2 - bestY1, C.best, 0.3);
    game.draw.rect(GAUGE_X - 20, bestY1, 20, 4, C.best);
    game.draw.rect(GAUGE_X - 20, bestY2 - 4, 20, 4, C.best);
    game.draw.text('OK', GAUGE_X - 44, (bestY1 + bestY2) / 2, { size: 30, color: C.best, bold: true });

    // Charge fill
    var fillH = GAUGE_H * charge;
    var fillY = GAUGE_Y + GAUGE_H - fillH;
    var fillColor = charge >= 1.0 ? C.chargeMax : (charge >= BEST_MIN ? C.charge2 : C.charge1);
    if (fillH > 0) {
      game.draw.rect(GAUGE_X, fillY, GAUGE_W, fillH, fillColor);
      game.draw.rect(GAUGE_X + 6, fillY + 4, GAUGE_W - 12, 12, '#fff', 0.25);
    }

    // Pulse at top if overcharge
    if (charge >= 0.95) {
      var oFlash = 0.5 + 0.5 * Math.sin(game.time.elapsed * 20);
      game.draw.rect(GAUGE_X, GAUGE_Y, GAUGE_W, GAUGE_H * 0.1, C.chargeMax, oFlash * 0.6);
    }

    // Charge %
    game.draw.text(Math.floor(charge * 100) + '%', GAUGE_X + GAUGE_W / 2, GAUGE_Y + GAUGE_H + 52, {
      size: 40, color: fillColor, bold: true
    });

    // Timer bar
    var ratio = Math.max(0, timeLeft / 15);
    game.draw.rect(0, 0, W, 72, '#050510');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.charge1 : C.chargeMax);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score & overcharges
    game.draw.text(score + ' / ' + needed, W / 2, 128, { size: 56, color: C.bestHi, bold: true });
    for (var oc = 0; oc < maxOvercharges; oc++) {
      var ocx = W / 2 + (oc - (maxOvercharges-1)/2) * 64;
      game.draw.circle(ocx, 200, 18, oc < overcharges ? C.chargeMax : '#1e293b');
    }

    // Guide
    var guideText = isCharging ? '↑スワイプで発射！' : '長押し/タップでチャージ';
    game.draw.text(guideText, W / 2, H - 200, { size: 52, color: C.ui });
    game.draw.text('60〜90%で的を狙え', W / 2, H - 135, { size: 40, color: '#334155' });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
  });
})(game);

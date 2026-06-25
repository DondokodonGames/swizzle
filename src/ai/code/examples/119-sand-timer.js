// 119-sand-timer.js
// 砂時計 — 砂が落ちきる前にタップしてひっくり返し続ける反応速度ゲーム
// 操作: タップで砂時計をひっくり返す
// 成功: 10回反転に成功  失敗: 砂が落ちきる or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0604',
    glass:   '#2a3040',
    glassHi: '#4a5060',
    sand:    '#f59e0b',
    sandHi:  '#fcd34d',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#475569'
  };

  var CX = W / 2;
  var TIMER_H = 400;
  var TIMER_W = 200;
  var TOP_Y = H * 0.28;
  var BOT_Y = TOP_Y + TIMER_H;

  var sand = 1.0; // 0-1 how much sand is in top chamber (1=all top, 0=all bottom)
  var FALL_RATE = 0.14; // per second
  var flipped = false; // which way gravity pulls sand (false=top→bot, true=bot→top)

  var flips = 0;
  var needed = 10;
  var timeLeft = 45;
  var done = false;
  var flipFlash = 0;
  var urgency = 0; // 0-1, increases as sand nears depletion
  var particles = [];

  game.onTap(function() {
    if (done) return;
    flipped = !flipped;
    flips++;
    flipFlash = 0.3;
    game.audio.play('se_tap', 0.7);
    // Sand particle burst
    var sx = CX;
    var sy = H * 0.5;
    for (var pi = 0; pi < 12; pi++) {
      var ang = Math.random() * Math.PI * 2;
      particles.push({ x: sx, y: sy, vx: Math.cos(ang)*120, vy: Math.sin(ang)*120, life: 0.4 });
    }
    if (flips >= needed && !done) {
      done = true;
      game.audio.play('se_success');
      setTimeout(function() { game.end.success(flips * 40 + Math.ceil(timeLeft) * 10); }, 400);
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

    // Sand physics
    if (!flipped) {
      // Sand falls from top to bottom
      sand -= FALL_RATE * dt;
      urgency = 1 - sand;
    } else {
      // Sand falls from bottom to top (reversed)
      sand += FALL_RATE * dt;
      urgency = sand;
    }
    sand = Math.max(0, Math.min(1, sand));

    // Sand ran out!
    if ((sand <= 0 && !flipped) || (sand >= 1 && flipped)) {
      if (!done) {
        done = true;
        game.audio.play('se_failure');
        setTimeout(function() { game.end.failure(); }, 400);
      }
    }

    if (flipFlash > 0) flipFlash -= dt;

    // Sand fall particles
    if (Math.random() < 0.4 && !done) {
      var neckX = CX;
      var neckY = H * 0.5;
      particles.push({ x: neckX + (Math.random()-0.5)*8, y: neckY, vx: (Math.random()-0.5)*30, vy: flipped ? -80 : 80, life: 0.25 });
    }

    for (var pi2 = 0; pi2 < particles.length; pi2++) {
      var p = particles[pi2];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Background urgency glow
    if (urgency > 0.7) {
      game.draw.rect(0, 0, W, H, C.wrong, (urgency - 0.7) * 0.15);
    }

    // Hourglass shape
    // Top chamber
    var topSandH = !flipped ? sand : (1 - sand);
    var botSandH = !flipped ? (1 - sand) : sand;

    // Draw glass outline (trapezoid approximation with rects)
    var glassColor = flipFlash > 0 ? C.glassHi : C.glass;
    // Top half outer
    game.draw.rect(CX - TIMER_W/2, TOP_Y, TIMER_W, TIMER_H/2, glassColor);
    // Bottom half outer
    game.draw.rect(CX - TIMER_W/2, H*0.5, TIMER_W, TIMER_H/2, glassColor);

    // Sand in top chamber
    var topFillH = (TIMER_H/2 - 20) * topSandH;
    if (topFillH > 0) {
      game.draw.rect(CX - TIMER_W/2 + 12, TOP_Y + (TIMER_H/2 - 20) - topFillH + 10, TIMER_W - 24, topFillH, C.sand, 0.9);
    }
    // Sand in bottom chamber
    var botFillH = (TIMER_H/2 - 20) * botSandH;
    if (botFillH > 0) {
      game.draw.rect(CX - TIMER_W/2 + 12, H*0.5 + 10, TIMER_W - 24, botFillH, C.sand, 0.9);
    }

    // Glass inner (carve out)
    game.draw.rect(CX - TIMER_W/2 + 12, TOP_Y + 10, TIMER_W - 24, TIMER_H/2 - 20, C.bg, 0.2);
    game.draw.rect(CX - TIMER_W/2 + 12, H*0.5 + 10, TIMER_W - 24, TIMER_H/2 - 20, C.bg, 0.2);

    // Neck (narrow connection point)
    game.draw.rect(CX - 20, H*0.5 - 24, 40, 48, glassColor);
    game.draw.rect(CX - 8, H*0.5 - 20, 16, 40, C.bg, 0.5);

    // Sand top highlight
    game.draw.rect(CX - TIMER_W/2 + 12, TOP_Y + 10, TIMER_W - 24, 4, C.sandHi, topSandH * 0.5);

    // Sand particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 5 * part.life * 4, C.sand, part.life);
    }

    // Frame top/bottom bars
    game.draw.rect(CX - TIMER_W/2 - 12, TOP_Y - 16, TIMER_W + 24, 16, glassColor);
    game.draw.rect(CX - TIMER_W/2 - 12, BOT_Y, TIMER_W + 24, 16, glassColor);

    // Flip counter
    game.draw.text(flips + ' / ' + needed, W / 2, 148, { size: 64, color: '#f1f5f9', bold: true });

    // Urgency warning
    if (urgency > 0.75) {
      var wPulse = 0.6 + 0.4 * Math.abs(Math.sin(timeLeft * 8));
      game.draw.text('急いで！', W / 2, H * 0.87, { size: 72, color: C.wrong, bold: true });
    } else {
      game.draw.text('タップでひっくり返す', W / 2, H * 0.88, { size: 44, color: C.ui });
    }

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.sand : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
  });
})(game);

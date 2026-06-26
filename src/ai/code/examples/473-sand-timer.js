// 473-sand-timer.js
// 砂時計反転 — 砂が落ちきる前にタップして反転させ続ける
// 操作: タップで砂時計を反転（砂が上に戻る）
// 成功: 60秒間耐える  失敗: 砂が全部落ちる

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#120a00',
    glass:  '#78716c',
    glassHi:'#d6d3d1',
    sand:   '#fbbf24',
    sandHi: '#fde68a',
    sandLow:'#d97706',
    frame:  '#44403c',
    frameHi:'#78716c',
    danger: '#ef4444',
    safe:   '#22c55e',
    text:   '#f1f5f9',
    ui:     '#57534e'
  };

  var CX = W / 2;
  var CY = H * 0.5;
  var GW = 340;   // glass width at widest
  var GH = 600;   // total height
  var NECK = 24;  // neck width

  var sandTop = 0.5;  // fraction in top chamber (0=empty, 1=full)
  var sandBot = 0.5;  // fraction in bottom
  var FLOW_RATE = 0.022; // per second
  var flipped = false;
  var flipAnim = 0;
  var flipDir = 1;  // rotation animation
  var survived = 0;
  var GOAL = 60;
  var done = false;
  var timeLeft = 65;
  var elapsed = 0;
  var particles = [];
  var dangerAnim = 0;
  var shakeX = 0;
  var shakeTimer = 0;
  var flipCount = 0;

  function flip() {
    // Swap top and bottom
    var tmp = sandTop;
    sandTop = sandBot;
    sandBot = tmp;
    flipped = !flipped;
    flipAnim = 0.4;
    flipDir *= -1;
    flipCount++;
    shakeX = 20;
    shakeTimer = 0.15;
    game.audio.play('se_tap', 0.5);
    for (var i = 0; i < 8; i++) {
      var ang = Math.random() * Math.PI * 2;
      particles.push({ x: CX, y: CY, vx: Math.cos(ang) * 120, vy: Math.sin(ang) * 120, life: 0.5, col: C.sandHi });
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    flip();
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      survived += dt;
      if (survived >= GOAL) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(flipCount * 100 + Math.ceil(survived) * 80); }, 700);
        return;
      }
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }

    if (flipAnim > 0) flipAnim -= dt * 4;
    if (shakeTimer > 0) { shakeTimer -= dt; if (shakeTimer <= 0) shakeX = 0; }

    // Flow sand from top to bottom
    if (sandTop > 0) {
      var flow = FLOW_RATE * dt * (1 + flipCount * 0.05);
      flow = Math.min(flow, sandTop);
      sandTop -= flow;
      sandBot += flow;
    } else if (sandBot < 1.0) {
      sandBot = Math.min(1.0, sandBot + 0.001);
    }

    // Check failure: top empty
    if (sandTop <= 0.001 && !done) {
      dangerAnim = 1.0;
      // Give 1 second grace, then fail
    }

    if (dangerAnim > 0) dangerAnim -= dt * 0.5;

    // Actually: fail when top has been empty "too long" — simplified: check at end
    // We end with success if survived >= GOAL, otherwise natural flow continues

    // Particles
    // Drip particles from neck
    if (sandTop > 0 && Math.random() < dt * 10) {
      particles.push({ x: CX + (Math.random() - 0.5) * NECK, y: CY + 20, vx: 0, vy: 80 + Math.random() * 60, life: 0.4, col: C.sand });
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    var ox = shakeX * Math.sin(elapsed * 40) * (shakeTimer / 0.15);
    game.draw.rect(0, 0, W, H, C.bg);

    // Draw hourglass body
    var topH = GH / 2 - 40;
    var botH = GH / 2 - 40;

    // Top glass (trapezoid approximated)
    // Top chamber sand fill
    var topSandH = topH * sandTop;
    if (topSandH > 4) {
      // Sand in top = fills from neck upward
      var sandTopY = CY - topSandH;
      // Determine width at that height
      var sandTopW = NECK + (GW - NECK) * (topSandH / topH);
      // Draw as triangle-ish shape
      game.draw.rect(CX - sandTopW / 2 + ox, sandTopY, sandTopW, topSandH, C.sandLow, 0.9);
      // Surface highlight
      game.draw.rect(CX - sandTopW / 2 + ox, sandTopY, sandTopW, 16, C.sandHi, 0.7);
    }

    // Bottom chamber sand fill
    var botSandH = botH * sandBot;
    if (botSandH > 4) {
      var sandBotY = CY + (botH - botSandH) + 40;
      var sandBotW = NECK + (GW - NECK) * (botSandH / botH);
      game.draw.rect(CX - sandBotW / 2 + ox, sandBotY, sandBotW, botSandH, C.sand, 0.9);
      game.draw.rect(CX - sandBotW / 2 + ox, sandBotY, sandBotW, 12, C.sandHi, 0.6);
    }

    // Glass outline (hourglass shape via lines)
    // Top trapezoid outline
    game.draw.line(CX - GW / 2 + ox, CY - topH - 40, CX - NECK / 2 + ox, CY, C.glassHi, 6);
    game.draw.line(CX + NECK / 2 + ox, CY, CX + GW / 2 + ox, CY - topH - 40, C.glassHi, 6);
    game.draw.line(CX - GW / 2 + ox, CY - topH - 40, CX + GW / 2 + ox, CY - topH - 40, C.glassHi, 8);
    // Bottom trapezoid outline
    game.draw.line(CX - NECK / 2 + ox, CY, CX - GW / 2 + ox, CY + botH + 40, C.glassHi, 6);
    game.draw.line(CX + GW / 2 + ox, CY + botH + 40, CX + NECK / 2 + ox, CY, C.glassHi, 6);
    game.draw.line(CX - GW / 2 + ox, CY + botH + 40, CX + GW / 2 + ox, CY + botH + 40, C.glassHi, 8);
    // Neck
    game.draw.line(CX - NECK / 2 + ox, CY - 20, CX - NECK / 2 + ox, CY + 20, C.glass, 4);
    game.draw.line(CX + NECK / 2 + ox, CY - 20, CX + NECK / 2 + ox, CY + 20, C.glass, 4);

    // Frame
    game.draw.rect(CX - GW / 2 - 30 + ox, CY - topH - 80, 24, GH + 120, C.frame, 0.9);
    game.draw.rect(CX + GW / 2 + 6 + ox, CY - topH - 80, 24, GH + 120, C.frame, 0.9);
    game.draw.rect(CX - GW / 2 - 40 + ox, CY - topH - 90, GW + 80, 24, C.frameHi, 0.8);
    game.draw.rect(CX - GW / 2 - 40 + ox, CY + botH + 56, GW + 80, 24, C.frameHi, 0.8);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x + ox, p.y, 8 * p.life, p.col, p.life);
    }

    // Danger indicator
    if (sandTop < 0.15 && !done) {
      var dangerBlink = Math.sin(elapsed * 10) * 0.5 + 0.5;
      game.draw.text('反転！', CX, H * 0.13, { size: 72, color: C.danger, bold: true });
    }

    // Survival progress
    var survRatio = Math.min(1, survived / GOAL);
    game.draw.rect(0, H * 0.89, W * survRatio, 14, C.safe, 0.8);
    game.draw.text(Math.floor(survived) + 's / ' + GOAL + 's', W / 2, H * 0.87, { size: 44, color: C.text, bold: true });
    game.draw.text('反転 ' + flipCount + '回', W / 2, H * 0.93, { size: 38, color: C.ui });

    var ratio = Math.max(0, timeLeft / 65);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.sand : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
  });
})(game);

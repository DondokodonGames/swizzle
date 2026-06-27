// 712-color-wave.js
// カラーウェーブ — 流れる色の波がターゲット色になった瞬間タップせよ
// 操作: タップで色を確定
// 成功: 20回正確に合わせる  失敗: 10回ズレ or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030508',
    text:    '#f1f5f9',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#05080e'
  };

  // HSL color cycling
  var hue = 0;      // current wave hue (0-360)
  var hueSpeed = 80; // degrees per second
  var targetHue = 0;
  var HUE_TOLERANCE = 20; // degrees

  var score = 0;
  var NEEDED = 20;
  var misses = 0;
  var MAX_MISS = 10;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var hitAnim = 0;

  function hslToHex(h, s, l) {
    h = h % 360;
    s /= 100; l /= 100;
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs((h / 60) % 2 - 1));
    var m = l - c / 2;
    var r, g, b;
    if (h < 60)       { r=c; g=x; b=0; }
    else if (h < 120) { r=x; g=c; b=0; }
    else if (h < 180) { r=0; g=c; b=x; }
    else if (h < 240) { r=0; g=x; b=c; }
    else if (h < 300) { r=x; g=0; b=c; }
    else              { r=c; g=0; b=x; }
    var toHex = function(v) { var h2 = Math.round((v+m)*255).toString(16); return h2.length===1?'0'+h2:h2; };
    return '#' + toHex(r) + toHex(g) + toHex(b);
  }

  function hueDiff(a, b) {
    var d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  }

  function pickTarget() {
    targetHue = Math.floor(Math.random() * 360);
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var diff = hueDiff(hue, targetHue);
    if (diff <= HUE_TOLERANCE) {
      score++;
      var accuracy = 1 - diff / HUE_TOLERANCE;
      hitAnim = 0.4;
      flashCol = C.correct;
      flashAnim = 0.3;
      resultText = diff < 5 ? 'ぴったり！' : 'グッド！';
      resultTimer = 0.5;
      game.audio.play('se_success', 0.4 + accuracy * 0.3);
      for (var p = 0; p < 6; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: H * 0.55, vx: Math.cos(pa) * 220, vy: Math.sin(pa) * 220, life: 0.5, col: hslToHex(hue, 85, 60) });
      }
      pickTarget();
      hueSpeed = Math.min(200, 80 + score * 4);
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 300 + Math.ceil(timeLeft) * 80); }, 700);
      }
    } else {
      misses++;
      flashCol = C.wrong;
      flashAnim = 0.35;
      resultText = '違う！';
      resultTimer = 0.5;
      game.audio.play('se_failure', 0.3);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
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
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;
    if (hitAnim > 0) hitAnim -= dt * 3;

    hue = (hue + hueSpeed * dt) % 360;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    var currentCol = hslToHex(hue, 85, 55);
    var targetCol = hslToHex(targetHue, 85, 55);
    var diff2 = hueDiff(hue, targetHue);
    var closeRatio = Math.max(0, 1 - diff2 / 60);

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Background glow of current color
    game.draw.circle(W / 2, H * 0.42, 500, currentCol, 0.08 + closeRatio * 0.15);

    // Main color swatch (current)
    game.draw.circle(W / 2 + 4, H * 0.42 + 4, 240, '#000', 0.3);
    game.draw.circle(W / 2, H * 0.42, 240, currentCol, 0.9);
    if (hitAnim > 0) {
      game.draw.circle(W / 2, H * 0.42, 240 + hitAnim * 60, currentCol, hitAnim * 0.25);
    }
    // Highlight
    game.draw.circle(W / 2 - 80, H * 0.42 - 90, 60, '#ffffff', 0.18);

    // Match zone indicator (arc around current circle)
    if (closeRatio > 0.01) {
      for (var seg = 0; seg < 20; seg++) {
        if (seg / 20 > closeRatio) break;
        var a = -Math.PI / 2 + seg * Math.PI * 2 / 20;
        var ax = W / 2 + Math.cos(a) * 260;
        var ay = H * 0.42 + Math.sin(a) * 260;
        game.draw.circle(ax, ay, 10, C.correct, closeRatio * 0.8);
      }
    }

    // Target color swatch (smaller, below)
    var targetY = H * 0.72;
    game.draw.text('目標', W / 2, targetY - 90, { size: 38, color: '#ffffff55' });
    game.draw.circle(W / 2 + 3, targetY + 3, 110, '#000', 0.3);
    game.draw.circle(W / 2, targetY, 110, targetCol, 0.9);
    // Pulse if close
    if (closeRatio > 0.5) {
      var pulse = 0.5 + 0.5 * Math.sin(elapsed * 10);
      game.draw.circle(W / 2, targetY, 110 + 20, targetCol, closeRatio * pulse * 0.25);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.9, { size: 60, color: flashCol, bold: true });
    }

    // Miss indicators
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 40 + mi * 80, H * 0.955, 16, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    pickTarget();
  });
})(game);

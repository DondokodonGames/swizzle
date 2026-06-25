// 315-color-wave.js
// カラーウェーブ — うねる色の波が特定の色になった瞬間をタップでキャッチ
// 操作: 波の色が「目標色」になった瞬間にタップ
// 成功: 20回キャッチ  失敗: 8回ミス or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#030208',
    target: '#ef4444',
    correct:'#22c55e',
    correctHi:'#86efac',
    wrong:  '#ef4444',
    wrongHi:'#fca5a5',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  // Color cycle through hues
  var hue = 0;
  var HUE_SPEED = 80; // degrees per second
  var TARGET_HUE = 0; // current target hue
  var TARGET_TOLERANCE = 20; // degrees

  var caught = 0;
  var NEEDED = 20;
  var misses = 0;
  var MAX_MISS = 8;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var particles = [];
  var resultAnim = []; // {text, col, life, y}
  var waveOffset = 0;
  var targetChangeTimer = 3;
  var correctFlash = 0;
  var wrongFlash = 0;

  function hueToRgb(h) {
    h = ((h % 360) + 360) % 360;
    var r, g, b;
    var c = 1, x = 1 - Math.abs((h / 60) % 2 - 1), m = 0;
    if (h < 60) { r=c;g=x;b=0; }
    else if (h < 120) { r=x;g=c;b=0; }
    else if (h < 180) { r=0;g=c;b=x; }
    else if (h < 240) { r=0;g=x;b=c; }
    else if (h < 300) { r=x;g=0;b=c; }
    else { r=c;g=0;b=x; }
    return 'rgb(' + Math.round((r+m)*220) + ',' + Math.round((g+m)*220) + ',' + Math.round((b+m)*220) + ')';
  }

  function hueDiff(a, b) {
    var d = Math.abs((a - b + 360) % 360);
    return Math.min(d, 360 - d);
  }

  function newTarget() {
    // Pick a target hue away from current
    TARGET_HUE = (hue + 90 + Math.random() * 180) % 360;
    targetChangeTimer = 3 + Math.random() * 2;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var diff = hueDiff(hue, TARGET_HUE);
    if (diff <= TARGET_TOLERANCE) {
      caught++;
      correctFlash = 0.4;
      game.audio.play('se_success', 0.5);
      resultAnim.push({ text: 'HIT!', col: C.correctHi, life: 0.7, y: H * 0.5, x: tx });
      for (var pi = 0; pi < 10; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: H * 0.55, vx: Math.cos(ang) * 250, vy: Math.sin(ang) * 250, life: 0.6, col: hueToRgb(hue) });
      }
      newTarget(); // new target on success
      if (caught >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(caught * 150 + Math.ceil(timeLeft) * 80); }, 400);
      }
    } else {
      misses++;
      wrongFlash = 0.3;
      game.audio.play('se_failure', 0.35);
      resultAnim.push({ text: 'MISS', col: C.wrongHi, life: 0.6, y: H * 0.5, x: tx });
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // Advance hue
    hue = (hue + HUE_SPEED * dt) % 360;
    waveOffset += dt * 2;
    if (correctFlash > 0) correctFlash -= dt * 2;
    if (wrongFlash > 0) wrongFlash -= dt * 2;

    // Target change
    targetChangeTimer -= dt;
    if (targetChangeTimer <= 0 && !done) newTarget();

    for (var ra = resultAnim.length - 1; ra >= 0; ra--) {
      resultAnim[ra].y -= 80 * dt;
      resultAnim[ra].life -= dt * 1.5;
      if (resultAnim[ra].life <= 0) resultAnim.splice(ra, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    var currentColor = hueToRgb(hue);
    var targetColor = hueToRgb(TARGET_HUE);
    var diff2 = hueDiff(hue, TARGET_HUE);
    var isNear = diff2 <= TARGET_TOLERANCE;

    // Main wave display
    for (var wave = 0; wave < 8; wave++) {
      var wY = H * 0.25 + wave * 60;
      var wH = 50;
      var wCol = hueToRgb((hue + wave * 15) % 360);
      game.draw.rect(0, wY, W, wH, wCol, 0.7 - wave * 0.05);
    }

    // Central circle: current color
    var bigR = 160;
    var pulse = isNear ? 20 * Math.sin(elapsed * 10) : 0;
    game.draw.circle(W / 2, H * 0.52, bigR + pulse + 20, currentColor, 0.15);
    game.draw.circle(W / 2, H * 0.52, bigR + pulse, currentColor, 0.95);
    game.draw.circle(W / 2, H * 0.52, bigR * 0.5, '#fff', 0.15);

    if (isNear) {
      game.draw.circle(W / 2, H * 0.52, bigR + 40 + pulse, currentColor, 0.25);
      game.draw.text('NOW!', W / 2, H * 0.52 + 12, { size: 48, color: '#fff', bold: true });
    }

    // Flash overlays
    if (correctFlash > 0) game.draw.rect(0, 0, W, H, C.correct, correctFlash * 0.3);
    if (wrongFlash > 0) game.draw.rect(0, 0, W, H, C.wrong, wrongFlash * 0.3);

    // Target color display
    game.draw.rect(W * 0.1, H * 0.74, W * 0.35, 80, targetColor, 0.9);
    game.draw.text('目標色', W * 0.275, H * 0.77, { size: 28, color: '#fff', bold: true });

    // Tolerance arc
    var arcX = W * 0.65, arcY = H * 0.77;
    var arcR = 35;
    game.draw.circle(arcX, arcY, arcR, currentColor, 0.7);
    game.draw.circle(arcX, arcY, arcR, isNear ? C.correct : '#333', 0.3);
    game.draw.text(Math.round(diff2) + '°', arcX, arcY + 10, { size: 28, color: '#fff', bold: true });
    game.draw.text('差', arcX, arcY + 36, { size: 22, color: C.ui });

    // Tolerance indicator
    game.draw.text('±' + TARGET_TOLERANCE + '°以内でタップ！', W / 2, H * 0.84, { size: 36, color: isNear ? C.correctHi : C.ui });

    // Result animations
    for (var ra2 = 0; ra2 < resultAnim.length; ra2++) {
      var r = resultAnim[ra2];
      game.draw.text(r.text, r.x || W / 2, r.y, { size: 48, color: r.col, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life * 2, p.col, p.life * 0.8);
    }

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 18 + mi * 36, H * 0.93, 12, mi < misses ? C.wrong : '#030208');
    }

    game.draw.text(caught + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, hueToRgb(hue));
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    newTarget();
  });
})(game);

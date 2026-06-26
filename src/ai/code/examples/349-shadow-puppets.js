// 349-shadow-puppets.js
// シャドーパペット — 光の角度を合わせて壁の影を目標の形にする
// 操作: タップで光源を移動（上下左右の4方向）
// 成功: 5つの形を完成  失敗: 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0805',
    wall:    '#1c1510',
    wallHi:  '#2a2018',
    shadow:  '#0f0b08',
    shadowHi:'#1a1410',
    light:   '#fef08a',
    lightHi: '#fefce8',
    object:  '#44403c',
    objectHi:'#57534e',
    target:  '#22c55e',
    targetHi:'#86efac',
    ui:      '#78716c',
    text:    '#fef3c7'
  };

  // Shapes to recreate as shadow outlines
  var SHAPES = [
    { name: 'ウサギ', points: [{x:0,y:-60},{x:-30,y:-100},{x:-20,y:-120},{x:0,y:-100},{x:20,y:-120},{x:30,y:-100},{x:0,y:-60},{x:40,y:-40},{x:40,y:20},{x:-40,y:20},{x:-40,y:-40}] },
    { name: '魚', points: [{x:-60,y:0},{x:-80,y:-30},{x:-80,y:30},{x:-60,y:0},{x:60,y:0},{x:80,y:-20},{x:60,y:0},{x:80,y:20},{x:60,y:0}] },
    { name: '鳥', points: [{x:0,y:-20},{x:-80,y:-60},{x:-60,y:-20},{x:0,y:-20},{x:60,y:-20},{x:80,y:-60},{x:0,y:-20},{x:0,y:40},{x:-30,y:80},{x:30,y:80},{x:0,y:40}] },
    { name: 'イヌ', points: [{x:-40,y:-60},{x:-50,y:-90},{x:-30,y:-80},{x:0,y:-60},{x:30,y:-80},{x:50,y:-90},{x:40,y:-60},{x:60,y:-30},{x:60,y:20},{x:-60,y:20},{x:-60,y:-30}] },
    { name: 'カニ', points: [{x:0,y:0},{x:-60,y:-20},{x:-90,y:-50},{x:-60,y:-20},{x:-60,y:20},{x:-90,y:50},{x:-60,y:20},{x:60,y:20},{x:90,y:50},{x:60,y:20},{x:60,y:-20},{x:90,y:-50},{x:60,y:-20},{x:0,y:0}] }
  ];

  var currentShape = 0;
  var lightX = W * 0.3;
  var lightY = H * 0.35;
  var objectX = W * 0.35;
  var objectY = H * 0.55;
  var targetAngle = 0; // Target light angle for matching
  var currentAngle = 0;
  var ANGLE_TOLERANCE = 0.3;

  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var completed = 0;
  var NEEDED = 5;
  var particles = [];
  var successAnim = 0;
  var matchAnim = 0;
  var STEP = 40;

  function nextPuzzle() {
    currentShape = (currentShape + 1) % SHAPES.length;
    targetAngle = (Math.random() - 0.5) * Math.PI * 0.8;
    // Set light position based on target angle
    lightX = objectX + Math.cos(targetAngle + Math.PI) * 300;
    lightY = objectY + Math.sin(targetAngle + Math.PI) * 300;
  }

  function getCurrentAngle() {
    return Math.atan2(objectY - lightY, objectX - lightX);
  }

  function getMatch() {
    var ca = getCurrentAngle();
    var diff = Math.abs(ca - targetAngle);
    while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
    return 1 - Math.min(1, diff / ANGLE_TOLERANCE);
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var dx = tx - W / 2, dy = ty - H / 2;
    if (Math.abs(dx) > Math.abs(dy)) {
      lightX += dx > 0 ? STEP : -STEP;
    } else {
      lightY += dy > 0 ? STEP : -STEP;
    }
    // Clamp light position
    lightX = Math.max(80, Math.min(W - 80, lightX));
    lightY = Math.max(200, Math.min(H * 0.48, lightY));

    game.audio.play('se_tap', 0.2);

    // Check match
    if (getMatch() > 0.85) {
      completed++;
      successAnim = 1.0;
      game.audio.play('se_success', 0.7);
      for (var pi = 0; pi < 12; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W * 0.7, y: H * 0.5, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.7, col: C.targetHi });
      }
      if (completed >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(completed * 500 + Math.ceil(timeLeft) * 80); }, 600);
        return;
      }
      setTimeout(function() { if (!done) nextPuzzle(); }, 1000);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (successAnim > 0) successAnim -= dt * 1.5;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    var match = getMatch();

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Wall (right half)
    game.draw.rect(W * 0.55, 0, W * 0.45, H, C.wall, 0.9);
    game.draw.line(W * 0.55, 0, W * 0.55, H, C.wallHi, 3);

    // Light cone
    var ang = getCurrentAngle();
    var spread = 0.5;
    for (var li = 0; li < 6; li++) {
      var la = ang + (li - 2.5) * spread / 5;
      game.draw.line(lightX, lightY, lightX + Math.cos(la) * 600, lightY + Math.sin(la) * 600, C.light, 2 * (0.3 - li * 0.06 + 0.03));
    }

    // Object (simple block casting shadow)
    game.draw.rect(objectX - 40, objectY - 60, 80, 120, C.object, 0.9);
    game.draw.rect(objectX - 40, objectY - 60, 80, 120, C.objectHi, 0.2);

    // Target shadow on wall (what they need to match)
    var shape = SHAPES[currentShape];
    var wallX = W * 0.7;
    var wallY = H * 0.52;
    var scale = 1.0;

    // Draw target shape as dots
    game.draw.text('目標:', wallX, wallY - 130, { size: 32, color: C.ui });
    game.draw.text(shape.name, wallX, wallY - 90, { size: 44, color: match > 0.85 ? C.targetHi : C.light, bold: true });
    for (var si = 0; si < shape.points.length - 1; si++) {
      var p1 = shape.points[si], p2 = shape.points[si + 1];
      game.draw.line(
        wallX + p1.x * scale, wallY + p1.y * scale,
        wallX + p2.x * scale, wallY + p2.y * scale,
        match > 0.85 ? C.targetHi : C.target, 4
      );
    }

    // Light source
    game.draw.circle(lightX, lightY, 30, C.light, 0.9);
    game.draw.circle(lightX, lightY, 50, C.light, 0.2);
    game.draw.text('☀', lightX, lightY + 14, { size: 36, color: C.lightHi });

    // Match indicator
    var matchPct = Math.round(match * 100);
    var matchCol = match > 0.7 ? C.targetHi : (match > 0.4 ? C.light : C.ui);
    game.draw.text('一致度: ' + matchPct + '%', W / 2, H * 0.85, { size: 40, color: matchCol });
    game.draw.rect(W * 0.15, H * 0.88, W * 0.7, 16, '#1a1a1a', 0.8);
    game.draw.rect(W * 0.15, H * 0.88, W * 0.7 * match, 16, matchCol, 0.8);

    if (successAnim > 0) {
      game.draw.text('ピッタリ！', W / 2, H * 0.82, { size: 64, color: C.targetHi, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life * 2, p.col, p.life * 0.8);
    }

    game.draw.text(completed + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.light : C.target);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#1a0a00', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    nextPuzzle();
  });
})(game);

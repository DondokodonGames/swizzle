// 564-shadow-chase.js
// シャドウチェイス — 影と同じ形にキャラを動かして重ねる瞬間の快感
// 操作: スワイプでキャラを移動、影のシルエットに重ねる
// 成功: 12回一致  失敗: 10回ミス or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0a1a',
    shadow:  '#1a1a3a',
    shadowHi:'#2a2a5a',
    player:  '#f59e0b',
    playerHi:'#fcd34d',
    match:   '#22c55e',
    miss:    '#ef4444',
    text:    '#f1f5f9',
    ui:      '#374151',
    glow:    '#f59e0b44'
  };

  var SHAPES = ['square', 'triangle', 'diamond', 'cross', 'star'];
  var AREA_X = W * 0.1;
  var AREA_Y = H * 0.25;
  var AREA_W = W * 0.8;
  var AREA_H = H * 0.55;
  var CHAR_SIZE = 80;

  var player = { x: W / 2, y: H * 0.65 };
  var shadow = { x: W / 2, y: H * 0.4, shape: 0 };
  var completions = 0;
  var NEEDED = 12;
  var failures = 0;
  var MAX_FAIL = 10;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.match;
  var matchTimer = 0;
  var resultText = '';

  function newShadow() {
    shadow.x = AREA_X + CHAR_SIZE + Math.random() * (AREA_W - CHAR_SIZE * 2);
    shadow.y = AREA_Y + CHAR_SIZE + Math.random() * (AREA_H * 0.4 - CHAR_SIZE);
    shadow.shape = Math.floor(Math.random() * SHAPES.length);
    player.shape = Math.floor(Math.random() * SHAPES.length);
    // Reset player position away from shadow
    player.x = W / 2;
    player.y = H * 0.7;
  }

  function checkMatch() {
    var dx = Math.abs(player.x - shadow.x);
    var dy = Math.abs(player.y - shadow.y);
    return dx < 60 && dy < 60 && player.shape === shadow.shape;
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done || matchTimer > 0) return;
    var speed = 200;
    if (dir === 'up')    player.y -= speed;
    if (dir === 'down')  player.y += speed;
    if (dir === 'left')  player.x -= speed;
    if (dir === 'right') player.x += speed;

    // Clamp
    player.x = Math.max(AREA_X + CHAR_SIZE, Math.min(AREA_X + AREA_W - CHAR_SIZE, player.x));
    player.y = Math.max(AREA_Y + CHAR_SIZE, Math.min(AREA_Y + AREA_H - CHAR_SIZE, player.y));

    game.audio.play('se_tap', 0.2);

    if (checkMatch()) {
      completions++;
      flashCol = C.match;
      flashAnim = 0.4;
      matchTimer = 0.8;
      resultText = '一致!';
      game.audio.play('se_success', 0.8);
      for (var pi = 0; pi < 12; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: player.x, y: player.y, vx: Math.cos(ang) * 240, vy: Math.sin(ang) * 240, life: 0.5, col: C.match });
      }
      if (completions >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(completions * 500 + Math.ceil(timeLeft) * 80); }, 700);
      } else {
        setTimeout(function() { if (!done) newShadow(); matchTimer = 0; }, 900);
      }
    }
  });

  game.onTap(function(tx, ty) {
    if (done || matchTimer > 0) return;
    // Tap cycles player shape
    player.shape = (player.shape + 1) % SHAPES.length;
    game.audio.play('se_tap', 0.15);
    if (checkMatch()) {
      completions++;
      flashCol = C.match;
      flashAnim = 0.4;
      matchTimer = 0.8;
      resultText = '一致!';
      game.audio.play('se_success', 0.8);
      for (var pi2 = 0; pi2 < 12; pi2++) {
        var ang2 = Math.random() * Math.PI * 2;
        particles.push({ x: player.x, y: player.y, vx: Math.cos(ang2) * 240, vy: Math.sin(ang2) * 240, life: 0.5, col: C.match });
      }
      if (completions >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(completions * 500 + Math.ceil(timeLeft) * 80); }, 700);
      } else {
        setTimeout(function() { if (!done) newShadow(); matchTimer = 0; }, 900);
      }
    }
  });

  function drawShape(cx, cy, size, shape, color, alpha) {
    if (shape === 0) { // square
      game.draw.rect(cx - size, cy - size, size * 2, size * 2, color, alpha);
    } else if (shape === 1) { // triangle (approximate with circles)
      game.draw.circle(cx, cy - size, size * 0.8, color, alpha);
      game.draw.circle(cx - size * 0.8, cy + size * 0.6, size * 0.8, color, alpha);
      game.draw.circle(cx + size * 0.8, cy + size * 0.6, size * 0.8, color, alpha);
    } else if (shape === 2) { // diamond
      game.draw.rect(cx - size, cy - size * 0.5, size * 2, size, color, alpha);
      game.draw.rect(cx - size * 0.5, cy - size, size, size * 2, color, alpha);
    } else if (shape === 3) { // cross
      game.draw.rect(cx - size, cy - size * 0.3, size * 2, size * 0.6, color, alpha);
      game.draw.rect(cx - size * 0.3, cy - size, size * 0.6, size * 2, color, alpha);
    } else { // star (5 circles)
      game.draw.circle(cx, cy, size * 0.5, color, alpha);
      for (var si = 0; si < 5; si++) {
        var sa = si / 5 * Math.PI * 2 - Math.PI / 2;
        game.draw.circle(cx + Math.cos(sa) * size * 0.9, cy + Math.sin(sa) * size * 0.9, size * 0.4, color, alpha);
      }
    }
  }

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
    if (matchTimer > 0) matchTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Play area
    game.draw.rect(AREA_X, AREA_Y, AREA_W, AREA_H, '#0f0f2a', 0.8);

    // Divider
    game.draw.line(AREA_X, AREA_Y + AREA_H * 0.5, AREA_X + AREA_W, AREA_Y + AREA_H * 0.5, C.ui, 2);
    game.draw.text('目標', AREA_X + 60, AREA_Y + 36, { size: 30, color: C.ui });
    game.draw.text('自分', AREA_X + 60, AREA_Y + AREA_H * 0.5 + 36, { size: 30, color: C.ui });

    // Shadow (target)
    var glowR = 60 + Math.sin(elapsed * 4) * 10;
    game.draw.circle(shadow.x, shadow.y, glowR, C.shadowHi, 0.15);
    drawShape(shadow.x, shadow.y, CHAR_SIZE * 0.6, shadow.shape, C.shadowHi, 0.6);

    // Player
    var dist = Math.sqrt((player.x - shadow.x) * (player.x - shadow.x) + (player.y - shadow.y) * (player.y - shadow.y));
    var proximity = Math.max(0, 1 - dist / 400);
    var sameShape = player.shape === shadow.shape;
    var pColor = (sameShape && proximity > 0.3) ? C.match : C.player;
    game.draw.circle(player.x, player.y, CHAR_SIZE * 0.6 + 8, pColor, 0.15 + proximity * 0.1);
    drawShape(player.x, player.y, CHAR_SIZE * 0.6, player.shape, pColor, 0.9);

    // Shape label
    var shapeNames = ['□', '△', '◇', '+', '★'];
    game.draw.text('形: ' + shapeNames[player.shape], W / 2, AREA_Y + AREA_H + 60, { size: 44, color: C.playerHi, bold: true });
    game.draw.text('目標: ' + shapeNames[shadow.shape], W / 2, AREA_Y + AREA_H + 120, { size: 36, color: C.shadowHi });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);
    if (matchTimer > 0) game.draw.text(resultText, W / 2, H * 0.5, { size: 90, color: C.match, bold: true });

    // Fail dots
    for (var fi = 0; fi < MAX_FAIL; fi++) {
      game.draw.circle(W / 2 - (MAX_FAIL - 1) * 40 + fi * 80, H * 0.955, 16, fi < failures ? C.miss : C.ui, 0.9);
    }

    game.draw.text(completions + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.player : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    player.shape = 0;
    newShadow();
  });
})(game);

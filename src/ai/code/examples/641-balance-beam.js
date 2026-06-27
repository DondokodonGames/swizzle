// 641-balance-beam.js
// バランスビーム — シーソーに荷物を乗せてバランスを保て
// 操作: タップで左右どちらかに荷物を置く
// 成功: 30秒バランス維持  失敗: 傾き過ぎ3回 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#050810',
    beam:    '#8b5cf6',
    beamHi:  '#c4b5fd',
    pivot:   '#6d28d9',
    weight:  '#f59e0b',
    weightHi:'#fde68a',
    danger:  '#ef4444',
    safe:    '#22c55e',
    text:    '#f1f5f9',
    ui:      '#0a0d1a',
    sky:     '#0f172a'
  };

  var CX = W / 2;
  var PIVOT_Y = H * 0.55;
  var BEAM_HALF = 360;
  var BEAM_H = 28;
  var MAX_ANGLE = Math.PI / 5;
  var SAFE_ANGLE = Math.PI / 9;

  var angle = 0;      // current tilt of beam
  var angVel = 0;
  var leftMass = 0;   // total mass on left side
  var rightMass = 0;

  var items = [];     // placed weights: {side: 'left'|'right', mass, x, y}
  var incomingItem = null;
  var incomingTimer = 0;
  var INCOMING_INTERVAL = 1.8;

  var safeTime = 0;
  var NEEDED_SAFE = 30;
  var tiltCount = 0;
  var MAX_TILT = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var flashAnim = 0, flashCol = C.danger;

  function spawnIncoming() {
    var mass = 1 + Math.floor(Math.random() * 4); // 1-4
    incomingItem = { mass: mass, y: H * 0.1, vy: 0, falling: false };
    incomingTimer = INCOMING_INTERVAL;
  }

  function placeWeight(side) {
    if (!incomingItem || incomingItem.falling) return;
    var m = incomingItem.mass;
    if (side === 'left') leftMass += m;
    else rightMass += m;

    // Limit total items to prevent crowding
    items.push({ side: side, mass: m, added: true });
    if (items.length > 16) items.shift();

    game.audio.play('se_tap', 0.2);
    incomingItem = null;
    spawnIncoming();
  }

  game.onTap(function(tx, ty) {
    if (done || !incomingItem || incomingItem.falling) return;
    placeWeight(tx < W / 2 ? 'left' : 'right');
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

    incomingTimer -= dt;
    if (incomingTimer <= 0 && !incomingItem) {
      spawnIncoming();
    }

    // Beam physics
    var torque = (leftMass - rightMass) * 0.12;
    angVel += torque * dt;
    angVel *= (1 - dt * 2.5); // damping
    angle += angVel * dt;
    angle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, angle));

    // Check safe/dangerous
    var isSafe = Math.abs(angle) < SAFE_ANGLE;
    if (isSafe && !done) {
      safeTime += dt;
      if (safeTime >= NEEDED_SAFE) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(Math.floor(safeTime) * 200 + Math.ceil(timeLeft) * 100); }, 700);
      }
    }

    if (Math.abs(angle) >= MAX_ANGLE * 0.85 && !done) {
      tiltCount++;
      flashCol = C.danger;
      flashAnim = 0.4;
      game.audio.play('se_failure', 0.3);
      // Reset balance
      leftMass = rightMass = 0;
      items = [];
      angVel = 0;
      angle *= 0.3;
      if (tiltCount >= MAX_TILT) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
    }

    // Incoming item animation
    if (incomingItem) {
      incomingItem.y += 200 * dt;
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Sky gradient effect
    for (var si = 0; si < 5; si++) {
      game.draw.rect(0, si * H / 5, W, H / 5, C.sky, 0.06 + si * 0.03);
    }

    // Stars
    for (var st = 0; st < 25; st++) {
      var sx = (st * 67 + 11) % W;
      var sy = (st * 43 + 7) % (H * 0.45);
      game.draw.circle(sx, sy, 2, '#8888aa', 0.3 + Math.sin(elapsed + st) * 0.15);
    }

    // Pivot
    game.draw.circle(CX + 6, PIVOT_Y + 6, 24, '#000', 0.4);
    game.draw.circle(CX, PIVOT_Y, 24, C.pivot, 0.9);
    // Pedestal
    game.draw.rect(CX - 20, PIVOT_Y + 20, 40, 80, C.pivot, 0.8);
    game.draw.rect(CX - 60, PIVOT_Y + 100, 120, 20, C.pivot, 0.7);

    // Beam (rotated around pivot)
    var cos = Math.cos(angle), sin = Math.sin(angle);
    // Draw beam as series of segments
    for (var seg = -1; seg <= 1; seg += 2) {
      var bx = CX + cos * BEAM_HALF * seg;
      var by = PIVOT_Y + sin * BEAM_HALF * seg;
      game.draw.line(CX, PIVOT_Y, bx, by, C.beam, BEAM_H);
    }
    // Beam highlight
    for (var seg2 = -1; seg2 <= 1; seg2 += 2) {
      var bx2 = CX + cos * BEAM_HALF * seg2;
      var by2 = PIVOT_Y + sin * BEAM_HALF * seg2 - 6;
      game.draw.line(CX, PIVOT_Y - 6, bx2, by2, C.beamHi, 6);
    }

    // Left/right ends
    var leftEnd = { x: CX - cos * BEAM_HALF, y: PIVOT_Y - sin * BEAM_HALF };
    var rightEnd = { x: CX + cos * BEAM_HALF, y: PIVOT_Y + sin * BEAM_HALF };
    game.draw.circle(leftEnd.x, leftEnd.y, 28, C.pivot, 0.8);
    game.draw.circle(rightEnd.x, rightEnd.y, 28, C.pivot, 0.8);

    // Mass display on beam
    game.draw.text(leftMass + '', leftEnd.x, leftEnd.y + 6, { size: 36, color: leftMass > rightMass ? C.danger : C.safe, bold: true });
    game.draw.text(rightMass + '', rightEnd.x, rightEnd.y + 6, { size: 36, color: rightMass > leftMass ? C.danger : C.safe, bold: true });

    // Angle indicator
    var angRatio = Math.abs(angle) / MAX_ANGLE;
    var angCol = angRatio > 0.6 ? C.danger : C.safe;
    game.draw.rect(CX - 200, H * 0.8, 400, 20, C.ui, 0.7);
    game.draw.rect(CX, H * 0.8, -200 + 200 * (angle / MAX_ANGLE + 1) / 2 * 2 - 200, 20, angCol, 0.8);
    game.draw.rect(CX - 2, H * 0.8, 4, 20, '#fff', 0.8);

    // Incoming item
    if (incomingItem) {
      var iy = incomingItem.y;
      game.draw.circle(CX, iy, 44, C.weight, 0.9);
      game.draw.text(incomingItem.mass + '', CX, iy + 12, { size: 52, color: '#000', bold: true });
      // Arrows
      game.draw.text('←', W * 0.2, iy, { size: 60, color: C.beamHi });
      game.draw.text('→', W * 0.8, iy, { size: 60, color: C.beamHi });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Safe time progress
    var ratio2 = Math.min(1, safeTime / NEEDED_SAFE);
    game.draw.rect(W / 2 - 200, H * 0.87, 400, 20, C.ui, 0.7);
    game.draw.rect(W / 2 - 200, H * 0.87, 400 * ratio2, 20, C.safe, 0.9);
    game.draw.text(Math.floor(safeTime) + 's / ' + NEEDED_SAFE + 's', W / 2, H * 0.87 + 40, { size: 32, color: C.safe });

    // Tilt dots
    for (var ti = 0; ti < MAX_TILT; ti++) {
      game.draw.circle(W / 2 - (MAX_TILT - 1) * 52 + ti * 104, H * 0.955, 22, ti < tiltCount ? C.danger : C.ui, 0.9);
    }

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.safe : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    spawnIncoming();
  });
})(game);

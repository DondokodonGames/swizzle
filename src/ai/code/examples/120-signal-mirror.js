// 120-signal-mirror.js
// 信号ミラー — 反射する光線を鏡の角度で操作してターゲットに照準を合わせる
// 操作: スワイプ左右で鏡の角度を調整
// 成功: 5つのターゲットを照射  失敗: 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020508',
    mirror: '#94a3b8',
    mirrorHi:'#e2e8f0',
    beam:   '#facc15',
    beamHi: '#fef08a',
    target: '#ef4444',
    targetHit:'#22c55e',
    ui:     '#334155'
  };

  // Mirror at bottom center
  var MIRROR_X = W / 2;
  var MIRROR_Y = H * 0.75;
  var MIRROR_L = 180; // half-length
  var mirrorAngle = Math.PI / 4; // 45 degrees initially
  var MIRROR_SPEED = Math.PI / 3; // rad/s

  // Light source (fixed, top-left)
  var SOURCE_X = 120;
  var SOURCE_Y = H * 0.18;

  // Targets
  var targets = [
    { x: W * 0.82, y: H * 0.2,  r: 48, hit: false },
    { x: W * 0.15, y: H * 0.4,  r: 48, hit: false },
    { x: W * 0.85, y: H * 0.52, r: 48, hit: false },
    { x: W * 0.18, y: H * 0.65, r: 48, hit: false },
    { x: W * 0.78, y: H * 0.3,  r: 48, hit: false }
  ];

  var score = 0;
  var needed = 5;
  var timeLeft = 30;
  var done = false;
  var hitFlash = 0;

  // Compute reflected beam direction
  function computeBeam() {
    // Incident ray from source to mirror center
    var idx = MIRROR_X - SOURCE_X;
    var idy = MIRROR_Y - SOURCE_Y;
    var iLen = Math.sqrt(idx*idx + idy*idy);
    var inx = idx/iLen, iny = idy/iLen; // normalized incident

    // Mirror normal (perpendicular to mirror angle)
    var nx = -Math.sin(mirrorAngle);
    var ny = Math.cos(mirrorAngle);

    // Reflection: r = i - 2(i·n)n
    var dot = inx*nx + iny*ny;
    var rx = inx - 2*dot*nx;
    var ry = iny - 2*dot*ny;
    return { rx: rx, ry: ry };
  }

  function checkTargetHit() {
    var ref = computeBeam();
    // Ray from mirror center in reflection direction
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      if (t.hit) continue;
      // Distance from target to ray
      var dx = t.x - MIRROR_X;
      var dy = t.y - MIRROR_Y;
      var tParam = dx * ref.rx + dy * ref.ry; // projection
      if (tParam < 0) continue; // behind mirror
      var perpX = dx - tParam * ref.rx;
      var perpY = dy - tParam * ref.ry;
      var dist = Math.sqrt(perpX*perpX + perpY*perpY);
      if (dist < t.r) {
        return i;
      }
    }
    return -1;
  }

  var hitTimer = 0; // must hold beam on target for 0.5s
  var hitTargetIdx = -1;
  var HIT_HOLD = 0.5;

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'left') mirrorAngle -= Math.PI / 12;
    if (dir === 'right') mirrorAngle += Math.PI / 12;
    mirrorAngle = Math.max(-Math.PI * 0.8, Math.min(Math.PI * 0.8, mirrorAngle));
    game.audio.play('se_tap', 0.3);
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

    // Check if beam hits a target
    var hitIdx = checkTargetHit();
    if (hitIdx >= 0) {
      if (hitIdx === hitTargetIdx) {
        hitTimer += dt;
        if (hitTimer >= HIT_HOLD) {
          targets[hitIdx].hit = true;
          score++;
          hitFlash = 0.5;
          hitTargetIdx = -1;
          hitTimer = 0;
          game.audio.play('se_success');
          if (score >= needed && !done) {
            done = true;
            setTimeout(function() { game.end.success(score * 100 + Math.ceil(timeLeft) * 15); }, 500);
          }
        }
      } else {
        hitTargetIdx = hitIdx;
        hitTimer = 0;
      }
    } else {
      hitTargetIdx = -1;
      hitTimer = 0;
    }

    if (hitFlash > 0) hitFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Source glow
    var sPulse = 0.6 + 0.4 * Math.abs(Math.sin(timeLeft * 3));
    game.draw.circle(SOURCE_X, SOURCE_Y, 40, C.beam, sPulse * 0.4);
    game.draw.circle(SOURCE_X, SOURCE_Y, 24, C.beamHi, 0.9);
    game.draw.circle(SOURCE_X, SOURCE_Y, 12, '#fff');

    // Draw incident beam (source to mirror)
    game.draw.line(SOURCE_X, SOURCE_Y, MIRROR_X, MIRROR_Y, C.beam, 3);
    // Beam glow
    game.draw.line(SOURCE_X, SOURCE_Y, MIRROR_X, MIRROR_Y, C.beamHi, 1);

    // Draw reflected beam
    var ref = computeBeam();
    var beamEndX = MIRROR_X + ref.rx * 1600;
    var beamEndY = MIRROR_Y + ref.ry * 1600;
    game.draw.line(MIRROR_X, MIRROR_Y, beamEndX, beamEndY, C.beam, 3);
    game.draw.line(MIRROR_X, MIRROR_Y, beamEndX, beamEndY, C.beamHi, 1);

    // Targets
    for (var ti = 0; ti < targets.length; ti++) {
      var t = targets[ti];
      var isBeingHit = ti === hitTargetIdx;
      var tColor = t.hit ? '#22c55e' : (isBeingHit ? '#fbbf24' : C.target);
      var tPulse = isBeingHit ? (0.5 + 0.5 * Math.abs(Math.sin(timeLeft * 8))) : 0.6;
      game.draw.circle(t.x, t.y, t.r + 12, tColor, tPulse * 0.3);
      game.draw.circle(t.x, t.y, t.r, tColor, t.hit ? 0.9 : 0.6);
      game.draw.circle(t.x, t.y, t.r * 0.5, tColor, 0.8);
      if (t.hit) {
        game.draw.circle(t.x, t.y, t.r * 0.2, '#fff', 0.9);
      }
      // Hold progress
      if (isBeingHit) {
        var prog = hitTimer / HIT_HOLD;
        game.draw.circle(t.x, t.y, t.r + 18, '#fbbf24', 0.2);
        game.draw.text(Math.round(prog * 100) + '%', t.x, t.y, { size: 28, color: '#fff', bold: true });
      }
    }

    // Mirror
    var mx1 = MIRROR_X + Math.cos(mirrorAngle) * MIRROR_L;
    var my1 = MIRROR_Y + Math.sin(mirrorAngle) * MIRROR_L;
    var mx2 = MIRROR_X - Math.cos(mirrorAngle) * MIRROR_L;
    var my2 = MIRROR_Y - Math.sin(mirrorAngle) * MIRROR_L;
    game.draw.line(mx1, my1, mx2, my2, C.mirror, 10);
    game.draw.line(mx1, my1, mx2, my2, C.mirrorHi, 3);
    game.draw.circle(MIRROR_X, MIRROR_Y, 16, C.mirrorHi);

    // Hit flash
    if (hitFlash > 0) {
      game.draw.rect(0, 0, W, H, '#22c55e', hitFlash * 0.2);
    }

    // Score dots
    for (var si = 0; si < needed; si++) {
      game.draw.circle(W/2 + (si - 2) * 60, 148, 20, si < score ? '#22c55e' : '#0f1520');
    }

    game.draw.text('←→スワイプで鏡を動かす', W / 2, H * 0.89, { size: 40, color: C.ui });

    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.beam : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
  });
})(game);

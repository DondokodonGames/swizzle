// 254-freeze-frame.js
// フリーズフレーム — 動くアニメが止まった瞬間だけが「正解の瞬間」、完璧なタイミングを狙う
// 操作: アニメが目標ポーズになった瞬間にタップ
// 成功: 8回パーフェクト  失敗: 5回ミス or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#060209',
    stage:  '#0f0a1e',
    target: '#22c55e',
    tgtHi:  '#86efac',
    wrong:  '#ef4444',
    wrnHi:  '#fca5a5',
    figure: '#3b82f6',
    figHi:  '#93c5fd',
    light:  '#fde68a',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  // Pose angles for stick figure
  var POSES = [
    { name: 'T字', lArm: -Math.PI / 2, rArm: Math.PI / 2, lLeg: -Math.PI / 4, rLeg: Math.PI / 4 },
    { name: 'Y字', lArm: -Math.PI * 0.6, rArm: Math.PI * 0.6, lLeg: -Math.PI / 6, rLeg: Math.PI / 6 },
    { name: 'X字', lArm: -Math.PI * 0.7, rArm: Math.PI * 0.7, lLeg: -Math.PI * 0.4, rLeg: Math.PI * 0.4 },
    { name: '敬礼', lArm: -Math.PI / 6, rArm: -Math.PI / 2, lLeg: Math.PI / 8, rLeg: -Math.PI / 8 }
  ];

  var targetPoseIdx = 0;
  var anim = 0; // 0→1 cycles through all poses
  var animSpeed = 0.6;
  var hits = 0;
  var NEEDED = 8;
  var misses = 0;
  var MAX_MISS = 5;
  var done = false;
  var timeLeft = 50;
  var elapsed = 0;
  var feedback = '';
  var feedbackCol = '#fff';
  var feedbackTimer = 0;
  var particles = [];
  var spotlightAngle = 0;

  function currentPoseAngles() {
    // Lerp between poses
    var totalPoses = POSES.length;
    var t = anim * totalPoses;
    var fromIdx = Math.floor(t) % totalPoses;
    var toIdx = (fromIdx + 1) % totalPoses;
    var frac = t - Math.floor(t);
    var from = POSES[fromIdx];
    var to = POSES[toIdx];
    return {
      lArm: from.lArm + (to.lArm - from.lArm) * frac,
      rArm: from.rArm + (to.rArm - from.rArm) * frac,
      lLeg: from.lLeg + (to.lLeg - from.lLeg) * frac,
      rLeg: from.rLeg + (to.rLeg - from.rLeg) * frac
    };
  }

  function isNearTarget() {
    var current = currentPoseAngles();
    var target = POSES[targetPoseIdx];
    var diff = Math.abs(current.lArm - target.lArm) + Math.abs(current.rArm - target.rArm) +
               Math.abs(current.lLeg - target.lLeg) + Math.abs(current.rLeg - target.rLeg);
    return diff < 0.3;
  }

  function selectNewTarget() {
    var prev = targetPoseIdx;
    do { targetPoseIdx = Math.floor(Math.random() * POSES.length); } while (targetPoseIdx === prev);
  }

  function drawFigure(cx, cy, angles, col, scale) {
    var s = scale || 1;
    var headR = 28 * s;
    var torsoH = 80 * s;
    var limbL = 70 * s;

    // Head
    game.draw.circle(cx, cy - headR - torsoH / 2 - 8, headR, col, 0.9);
    // Torso
    game.draw.line(cx, cy - torsoH / 2, cx, cy + torsoH / 2, col, 8 * s);
    // Arms
    var armStartY = cy - torsoH * 0.3;
    game.draw.line(cx, armStartY, cx + Math.cos(angles.lArm) * limbL, armStartY + Math.sin(angles.lArm) * limbL, col, 7 * s);
    game.draw.line(cx, armStartY, cx + Math.cos(Math.PI - angles.rArm) * limbL, armStartY + Math.sin(angles.rArm) * limbL, col, 7 * s);
    // Legs
    game.draw.line(cx, cy + torsoH / 2, cx + Math.cos(Math.PI / 2 + angles.lLeg) * limbL, cy + torsoH / 2 + Math.cos(angles.lLeg) * limbL, col, 7 * s);
    game.draw.line(cx, cy + torsoH / 2, cx + Math.cos(Math.PI / 2 - angles.rLeg) * limbL, cy + torsoH / 2 + Math.cos(angles.rLeg) * limbL, col, 7 * s);
  }

  game.onTap(function(tx, ty) {
    if (done || feedbackTimer > 0.1) return;

    if (isNearTarget()) {
      hits++;
      feedback = 'パーフェクト！';
      feedbackCol = C.target;
      feedbackTimer = 0.6;
      game.audio.play('se_success', 0.7);
      for (var pi = 0; pi < 10; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: H * 0.45, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180, life: 0.6 });
      }
      if (hits >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(hits * 200 + Math.ceil(timeLeft) * 80); }, 500);
        return;
      }
      selectNewTarget();
      animSpeed = 0.6 + hits * 0.06;
    } else {
      misses++;
      feedback = 'タイミングが違う！';
      feedbackCol = C.wrong;
      feedbackTimer = 0.6;
      game.audio.play('se_failure', 0.5);
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
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    anim += animSpeed * dt;
    if (anim >= 1) anim -= 1;
    spotlightAngle += dt * 0.8;

    if (feedbackTimer > 0) feedbackTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 200 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    // Stage
    game.draw.rect(0, H * 0.7, W, H * 0.3, C.stage, 0.8);
    game.draw.rect(0, H * 0.7, W, 6, C.ui, 0.5);
    // Spotlight
    var spotX = W / 2 + Math.cos(spotlightAngle) * 100;
    game.draw.circle(spotX, H * 0.45, 160, C.light, 0.07);

    // Target pose (small, top-right guide)
    var tgt = POSES[targetPoseIdx];
    game.draw.rect(W * 0.75, H * 0.08, W * 0.22, H * 0.2, '#0a0614', 0.8);
    game.draw.text('目標', W * 0.86, H * 0.1, { size: 30, color: C.tgtHi });
    drawFigure(W * 0.86, H * 0.2, tgt, C.target, 0.45);

    // Current figure
    var cur = currentPoseAngles();
    var near = isNearTarget();
    var figCol = near ? C.figHi : C.figure;
    if (near) {
      var glow = 0.3 + 0.3 * Math.abs(Math.sin(elapsed * 10));
      game.draw.circle(W / 2, H * 0.45, 120, C.tgtHi, glow);
    }
    drawFigure(W / 2, H * 0.45, cur, figCol, 1.2);

    // Pose name guide
    game.draw.text(POSES[targetPoseIdx].name + 'ポーズ！', W / 2, H * 0.25, { size: 50, color: near ? C.tgtHi : C.ui, bold: near });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * (p.life / 0.6), C.tgtHi, p.life * 0.8);
    }

    // Feedback
    if (feedbackTimer > 0) {
      game.draw.text(feedback, W / 2, H * 0.82, { size: 52, color: feedbackCol, bold: true });
    }

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 28 + mi * 56, H * 0.87, 16, mi < misses ? C.wrong : '#0a0614');
    }

    game.draw.text(hits + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.target : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    targetPoseIdx = 0;
  });
})(game);

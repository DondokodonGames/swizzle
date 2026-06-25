// 257-cargo-sort.js
// カーゴソート — 流れてくるコンテナを色別のレーンに振り分ける仕分けゲーム
// 操作: スワイプ左右でコンテナをレーンへ
// 成功: 30個正しく仕分け  失敗: 5個誤送 or 35秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#06080a',
    belt:   '#1e293b',
    beltHi: '#334155',
    red:    '#ef4444',
    redHi:  '#fca5a5',
    blue:   '#3b82f6',
    blueHi: '#93c5fd',
    green:  '#22c55e',
    grnHi:  '#86efac',
    yellow: '#f59e0b',
    yelHi:  '#fde68a',
    correct:'#86efac',
    wrong:  '#ef4444',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var LANES = [
    { col: C.red, hi: C.redHi, x: W * 0.125, label: '赤' },
    { col: C.blue, hi: C.blueHi, x: W * 0.375, label: '青' },
    { col: C.green, hi: C.grnHi, x: W * 0.625, label: '緑' },
    { col: C.yellow, hi: C.yelHi, x: W * 0.875, label: '黄' }
  ];

  var cargo = null;
  var spawnTimer = 0;
  var SPAWN_INTERVAL = 1.4;
  var sorted = 0;
  var NEEDED = 30;
  var errors = 0;
  var MAX_ERROR = 5;
  var done = false;
  var timeLeft = 35;
  var elapsed = 0;
  var feedback = '';
  var feedbackCol = '#fff';
  var feedbackTimer = 0;
  var particles = [];
  var cargoAnimX = W / 2;
  var cargoAnimY = H * 0.45;
  var cargoTargetX = W / 2;
  var cargoSpeed = 0;

  function spawnCargo() {
    var laneIdx = Math.floor(Math.random() * LANES.length);
    cargo = {
      lane: laneIdx,
      x: W / 2,
      y: H * 0.45,
      vx: 0,
      thrown: false,
      landed: false
    };
    cargoAnimX = W / 2;
    cargoAnimY = H * 0.45;
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done || !cargo || cargo.thrown) return;

    // Determine target lane from swipe direction
    var dx = x2 - x1;
    var targetLaneIdx = -1;

    if (Math.abs(dx) > 40) {
      // Map horizontal position to lane
      var targetX = x2;
      var bestDist = Infinity;
      for (var li = 0; li < LANES.length; li++) {
        var d = Math.abs(targetX - LANES[li].x);
        if (d < bestDist) { bestDist = d; targetLaneIdx = li; }
      }
    }

    if (targetLaneIdx < 0) return;

    cargo.thrown = true;
    cargo.targetLane = targetLaneIdx;
    cargo.throwStartX = cargo.x;
    cargo.throwTimer = 0;
    cargo.throwDur = 0.3;

    if (targetLaneIdx === cargo.lane) {
      sorted++;
      feedback = '正解！';
      feedbackCol = C.correct;
      feedbackTimer = 0.5;
      game.audio.play('se_success', 0.6);
      for (var pi = 0; pi < 6; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: LANES[targetLaneIdx].x, y: H * 0.75, vx: Math.cos(ang) * 120, vy: Math.sin(ang) * 120 - 50, life: 0.5, col: LANES[targetLaneIdx].hi });
      }
      if (sorted >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(sorted * 60 + Math.ceil(timeLeft) * 80); }, 500);
        return;
      }
    } else {
      errors++;
      feedback = '違うレーン！';
      feedbackCol = C.wrong;
      feedbackTimer = 0.5;
      game.audio.play('se_failure', 0.5);
      if (errors >= MAX_ERROR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
        return;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (feedbackTimer > 0) feedbackTimer -= dt;

    // Cargo animation
    if (cargo && cargo.thrown) {
      cargo.throwTimer += dt;
      var t = Math.min(1, cargo.throwTimer / cargo.throwDur);
      cargo.x = cargo.throwStartX + (LANES[cargo.targetLane].x - cargo.throwStartX) * t;
      if (t >= 1) {
        cargo = null;
        spawnTimer = 0.3;
      }
    } else if (!cargo) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnCargo();
      }
    }

    // Belt animation (conveyor movement)
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 200 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Belt
    game.draw.rect(0, H * 0.38, W, H * 0.16, C.belt, 0.8);
    game.draw.rect(0, H * 0.38, W, 8, C.beltHi, 0.5);
    game.draw.rect(0, H * 0.54, W, 8, C.beltHi, 0.5);
    // Belt lines (moving)
    for (var bi = 0; bi < 10; bi++) {
      var bx = ((elapsed * 200 + bi * 120) % (W + 100)) - 100;
      game.draw.rect(bx, H * 0.38 + 6, 60, H * 0.16 - 12, C.beltHi, 0.1);
    }

    // Lane slots at bottom
    for (var li = 0; li < LANES.length; li++) {
      var lane = LANES[li];
      var lx = lane.x - W * 0.11;
      var ly = H * 0.68;
      game.draw.rect(lx, ly, W * 0.22, H * 0.22, lane.col, 0.15);
      game.draw.rect(lx, ly, W * 0.22, 6, lane.col, 0.6);
      game.draw.text(lane.label, lane.x, ly + H * 0.11 + 14, { size: 52, color: lane.hi, bold: true });
    }

    // Arrow guide
    game.draw.text('← スワイプで仕分け →', W / 2, H * 0.6, { size: 36, color: C.ui });

    // Cargo
    if (cargo) {
      var lane2 = LANES[cargo.lane];
      var cx = cargo.x;
      var cy = H * 0.46;
      var pulse = 0.8 + 0.2 * Math.abs(Math.sin(elapsed * 4));
      game.draw.rect(cx - 60, cy - 50, 120, 100, lane2.col, pulse * 0.9);
      game.draw.rect(cx - 60, cy - 50, 120, 10, lane2.hi, 0.7);
      game.draw.text(lane2.label, cx, cy + 14, { size: 60, color: '#fff', bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 7 * (p.life / 0.5), p.col, p.life * 0.9);
    }

    // Feedback
    if (feedbackTimer > 0) {
      game.draw.text(feedback, W / 2, H * 0.9, { size: 52, color: feedbackCol, bold: true });
    }

    // Error dots
    for (var ei = 0; ei < MAX_ERROR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERROR - 1) * 28 + ei * 56, H * 0.94, 16, ei < errors ? C.wrong : '#111');
    }

    game.draw.text(sorted + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 35);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.green : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    spawnTimer = 0.5;
  });
})(game);

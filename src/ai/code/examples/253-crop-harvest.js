// 253-crop-harvest.js
// クロップハーベスト — 畑の野菜が収穫適期になった瞬間タップする農業テンポゲーム
// 操作: タップで野菜を収穫（熟した瞬間がベスト）
// 成功: 100ポイント獲得  失敗: 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0e04',
    soil:   '#2d1b0a',
    soilHi: '#4a2e14',
    unripe: '#4ade80',
    ripe:   '#22c55e',
    ripHi:  '#86efac',
    over:   '#78350f',
    plant:  '#16a34a',
    ui:     '#475569',
    text:   '#f1f5f9',
    sun:    '#fde68a',
    sky:    '#0c1a06'
  };

  var GRID_COLS = 3;
  var GRID_ROWS = 5;
  var CELL_W = (W - 60) / GRID_COLS;
  var CELL_H = (H * 0.65) / GRID_ROWS;
  var GRID_X = 20;
  var GRID_Y = H * 0.22;

  var crops = [];
  var score = 0;
  var NEEDED = 100;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var sunAngle = 0;

  var CROP_TYPES = ['🥕', '🥬', '🍅', '🌽', '🥦'];

  function initCrops() {
    crops = [];
    for (var row = 0; row < GRID_ROWS; row++) {
      for (var col = 0; col < GRID_COLS; col++) {
        var delay = Math.random() * 4;
        crops.push({
          col: col, row: row,
          cx: GRID_X + col * CELL_W + CELL_W / 2,
          cy: GRID_Y + row * CELL_H + CELL_H / 2,
          growTimer: delay,
          growDur: 2.5 + Math.random() * 2,
          ripeTimer: 0,
          ripeDur: 1.2 + Math.random() * 0.8,
          overTimer: 0,
          overDur: 1.5 + Math.random() * 1,
          state: 'SEED', // SEED, GROWING, RIPE, OVER, HARVESTED
          type: Math.floor(Math.random() * CROP_TYPES.length),
          harvestFlash: 0,
          replanTimer: 0
        });
      }
    }
  }

  function scoreForCrop(c) {
    // Peak score when ripeTimer is at 50%
    var ripeFrac = c.ripeTimer / c.ripeDur;
    if (ripeFrac < 0.5) return Math.round(8 + ripeFrac * 8);
    return Math.round(16 - (ripeFrac - 0.5) * 12);
  }

  game.onTap(function(tx, ty) {
    if (done) return;

    for (var ci = 0; ci < crops.length; ci++) {
      var c = crops[ci];
      if (c.state !== 'GROWING' && c.state !== 'RIPE') continue;
      var dx = tx - c.cx, dy = ty - c.cy;
      if (dx * dx + dy * dy < (CELL_W * 0.4) * (CELL_W * 0.4)) {
        var pts = c.state === 'RIPE' ? scoreForCrop(c) : 3;
        score += pts;
        c.state = 'HARVESTED';
        c.harvestFlash = 0.5;
        c.replanTimer = 2 + Math.random() * 2;
        game.audio.play('se_success', 0.5);
        for (var pi = 0; pi < 5; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: c.cx, y: c.cy, vx: Math.cos(ang) * 100, vy: Math.sin(ang) * 100, life: 0.5, pts: pts });
        }
        if (score >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(score * 20 + Math.ceil(timeLeft) * 50); }, 400);
        }
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

    sunAngle += dt * 0.3;

    for (var ci = 0; ci < crops.length; ci++) {
      var c = crops[ci];

      if (c.harvestFlash > 0) c.harvestFlash -= dt;

      if (c.state === 'SEED') {
        c.growTimer -= dt;
        if (c.growTimer <= 0) {
          c.state = 'GROWING';
          c.growProgress = 0;
        }
      } else if (c.state === 'GROWING') {
        c.growProgress = Math.min(1, (c.growProgress || 0) + dt / c.growDur);
        if (c.growProgress >= 1) {
          c.state = 'RIPE';
          c.ripeTimer = 0;
          game.audio.play('se_tap', 0.15);
        }
      } else if (c.state === 'RIPE') {
        c.ripeTimer += dt;
        if (c.ripeTimer >= c.ripeDur) {
          c.state = 'OVER';
          c.overTimer = 0;
        }
      } else if (c.state === 'OVER') {
        c.overTimer += dt;
        if (c.overTimer >= c.overDur) {
          c.state = 'HARVESTED';
          c.replanTimer = 1.5 + Math.random() * 2;
        }
      } else if (c.state === 'HARVESTED') {
        if (c.replanTimer > 0) {
          c.replanTimer -= dt;
          if (c.replanTimer <= 0) {
            c.state = 'SEED';
            c.growTimer = 0.5 + Math.random() * 2;
            c.growDur = 2 + Math.random() * 2;
            c.ripeDur = 1 + Math.random() * 1;
            c.overDur = 1.5 + Math.random() * 1;
            c.type = Math.floor(Math.random() * CROP_TYPES.length);
            c.harvestFlash = 0;
          }
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 200 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.sky);
    // Sun
    var sunX = W * 0.8 + Math.cos(sunAngle) * 60;
    var sunY = H * 0.1 + Math.sin(sunAngle) * 20;
    game.draw.circle(sunX, sunY, 50, C.sun, 0.9);
    game.draw.circle(sunX, sunY, 70, C.sun, 0.2);

    // Ground
    game.draw.rect(0, H * 0.18, W, H * 0.82, C.soil, 1);

    // Crop cells
    for (var ci2 = 0; ci2 < crops.length; ci2++) {
      var c2 = crops[ci2];
      var cx2 = c2.cx, cy2 = c2.cy;
      var cellX = GRID_X + c2.col * CELL_W + 4;
      var cellY = GRID_Y + c2.row * CELL_H + 4;
      var cellW2 = CELL_W - 8, cellH2 = CELL_H - 8;

      // Soil patch
      game.draw.rect(cellX, cellY, cellW2, cellH2, C.soilHi, 0.5);

      if (c2.state === 'GROWING') {
        var gp = c2.growProgress || 0;
        var size = 24 + gp * 40;
        game.draw.circle(cx2, cy2, size, C.unripe, 0.7 * gp);
        game.draw.text(CROP_TYPES[c2.type], cx2, cy2 + 12, { size: Math.round(size * 1.2) });
      } else if (c2.state === 'RIPE') {
        var ripeFrac = c2.ripeTimer / c2.ripeDur;
        var pulse = 0.8 + 0.2 * Math.abs(Math.sin(elapsed * 6 + ci2));
        game.draw.circle(cx2, cy2, 48 * pulse, C.ripHi, 0.3);
        game.draw.circle(cx2, cy2, 40 * pulse, C.ripe, 0.7);
        game.draw.text(CROP_TYPES[c2.type], cx2, cy2 + 14, { size: 56 });
        // Score preview
        game.draw.text('+' + scoreForCrop(c2), cx2, cy2 - 42, { size: 30, color: C.ripHi, bold: true });
      } else if (c2.state === 'OVER') {
        game.draw.circle(cx2, cy2, 36, C.over, 0.6);
        game.draw.text(CROP_TYPES[c2.type], cx2, cy2 + 14, { size: 40 });
      } else if (c2.state === 'HARVESTED' && c2.harvestFlash > 0) {
        game.draw.circle(cx2, cy2, 44 * c2.harvestFlash / 0.5, C.ripHi, c2.harvestFlash);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * (p.life / 0.5), C.ripHi, p.life);
    }

    // Score bar
    var scoreRatio = Math.min(1, score / NEEDED);
    game.draw.rect(40, H * 0.9, W - 80, 20, C.ui, 0.3);
    game.draw.rect(40, H * 0.9, (W - 80) * scoreRatio, 20, C.ripe, 0.9);
    game.draw.text(score + ' / ' + NEEDED + ' pt', W / 2, H * 0.95, { size: 46, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.ripe : C.over);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    initCrops();
  });
})(game);

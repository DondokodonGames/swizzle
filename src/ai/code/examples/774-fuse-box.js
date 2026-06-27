// 774-fuse-box.js
// ヒューズボックス — 燃え広がるヒューズを全部タップして消せ。連鎖を止めろ
// 操作: タップでヒューズを消火（燃えているヒューズ上をタップ）
// 成功: 30本消火  失敗: 10本爆発 or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#090603',
    panel:    '#1c1008',
    panelHi:  '#292010',
    fuseBase: '#44322a',
    fuseWire: '#d97706',
    burning:  '#f97316',
    burningHi:'#fde68a',
    exploded: '#ef4444',
    safe:     '#22c55e',
    correct:  '#22c55e',
    wrong:    '#ef4444',
    text:     '#f1f5f9',
    ui:       '#0c0804'
  };

  var FUSE_COLS = 4;
  var FUSE_ROWS = 5;
  var FUSE_COUNT = FUSE_COLS * FUSE_ROWS;
  var MARGIN = 70;
  var FUSE_GAP_X = 12;
  var FUSE_GAP_Y = 16;
  var FUSE_W = (W - MARGIN * 2 - FUSE_GAP_X * (FUSE_COLS - 1)) / FUSE_COLS;
  var FUSE_H = 80;
  var GRID_Y = H * 0.22;

  var fuses = [];
  var spawnTimer = 0;
  var spawnRate = 1.2;

  var extinguished = 0;
  var NEEDED = 30;
  var exploded = 0;
  var MAX_EXPLODE = 10;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function getFuseRect(idx) {
    var col = idx % FUSE_COLS;
    var row = Math.floor(idx / FUSE_COLS);
    var fx = MARGIN + col * (FUSE_W + FUSE_GAP_X);
    var fy = GRID_Y + row * (FUSE_H + FUSE_GAP_Y);
    return { x: fx, y: fy, w: FUSE_W, h: FUSE_H };
  }

  function initFuses() {
    fuses = [];
    for (var i = 0; i < FUSE_COUNT; i++) {
      fuses.push({ idx: i, burning: false, progress: 0, exploded: false, extinguished: false });
    }
  }

  function lightFuse(idx) {
    if (fuses[idx].burning || fuses[idx].exploded || fuses[idx].extinguished) return;
    fuses[idx].burning = true;
    fuses[idx].progress = 0;
    game.audio.play('se_tap', 0.05);
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var hitIdx = -1;
    for (var i = 0; i < FUSE_COUNT; i++) {
      if (!fuses[i].burning) continue;
      var r = getFuseRect(i);
      if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) {
        hitIdx = i;
        break;
      }
    }
    if (hitIdx < 0) return;

    var f = fuses[hitIdx];
    f.burning = false;
    f.extinguished = true;
    extinguished++;
    flashCol = C.correct;
    flashAnim = 0.14;
    resultText = '消火！';
    resultTimer = 0.25;
    game.audio.play('se_tap', 0.1);
    for (var p = 0; p < 5; p++) {
      var r2 = getFuseRect(hitIdx);
      var pa = Math.random() * Math.PI * 2;
      particles.push({ x: r2.x + r2.w / 2, y: r2.y + r2.h / 2, vx: Math.cos(pa) * 120, vy: Math.sin(pa) * 120, life: 0.3, col: C.safe });
    }
    if (extinguished >= NEEDED && !done) {
      done = true;
      game.audio.play('se_success', 0.9);
      setTimeout(function() { game.end.success(extinguished * 280 + Math.ceil(timeLeft) * 120); }, 700);
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

    // Spawn new burning fuses
    spawnTimer -= dt;
    spawnRate = Math.max(0.5, 1.2 - extinguished * 0.015);
    if (spawnTimer <= 0 && !done) {
      spawnTimer = spawnRate;
      var available = [];
      for (var i = 0; i < FUSE_COUNT; i++) {
        if (!fuses[i].burning && !fuses[i].exploded && !fuses[i].extinguished) available.push(i);
      }
      if (available.length > 0) {
        lightFuse(available[Math.floor(Math.random() * available.length)]);
        // Higher scores: occasionally light multiple
        if (extinguished > 15 && Math.random() < 0.3 && available.length > 1) {
          var av2 = available.filter(function(a) { return !fuses[a].burning; });
          if (av2.length > 0) lightFuse(av2[Math.floor(Math.random() * av2.length)]);
        }
      }
    }

    // Update fuses
    var burnSpeed = Math.min(0.8, 0.25 + extinguished * 0.01);
    for (var i = 0; i < FUSE_COUNT; i++) {
      var f = fuses[i];
      if (!f.burning) continue;
      f.progress += burnSpeed * dt;
      if (f.progress >= 1.0) {
        f.burning = false;
        f.exploded = true;
        exploded++;
        flashCol = C.wrong;
        flashAnim = 0.35;
        resultText = '爆発！！';
        resultTimer = 0.42;
        game.audio.play('se_failure', 0.4);
        var re = getFuseRect(i);
        for (var pe = 0; pe < 8; pe++) {
          var pea = Math.random() * Math.PI * 2;
          particles.push({ x: re.x + re.w / 2, y: re.y + re.h / 2, vx: Math.cos(pea) * 200, vy: Math.sin(pea) * 200, life: 0.4, col: C.wrong });
        }
        if (exploded >= MAX_EXPLODE && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        }
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 350 * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(MARGIN - 20, GRID_Y - 20, W - (MARGIN - 20) * 2, FUSE_ROWS * (FUSE_H + FUSE_GAP_Y) + 20, C.panel, 0.9);

    // Fuses
    for (var i2 = 0; i2 < FUSE_COUNT; i2++) {
      var f2 = fuses[i2];
      var r3 = getFuseRect(i2);
      var cx = r3.x + r3.w / 2;
      var cy = r3.y + r3.h / 2;

      // Base
      game.draw.rect(r3.x + 4, r3.y + 4, r3.w, r3.h, '#000', 0.2);
      game.draw.rect(r3.x, r3.y, r3.w, r3.h,
        f2.exploded ? '#3d0c0c' : (f2.extinguished ? '#0c1a0c' : C.fuseBase), 0.85);

      if (f2.burning) {
        // Burning progress bar (left to right)
        game.draw.rect(r3.x, r3.y + r3.h - 12, r3.w * f2.progress, 12, C.burning, 0.9);
        // Flame at tip
        var tipX = r3.x + r3.w * f2.progress;
        var flicker = 0.7 + 0.3 * Math.sin(elapsed * 20 + i2);
        game.draw.circle(tipX, cy, 22 * flicker, C.burningHi, 0.8);
        game.draw.circle(tipX - 4, cy - 8, 12 * flicker, '#fff', 0.4);
        // Wire
        game.draw.line(r3.x, cy, tipX, cy, C.fuseWire, 8);
      } else if (f2.exploded) {
        game.draw.text('💥', cx, cy + 8, { size: 48, color: C.wrong });
      } else if (f2.extinguished) {
        game.draw.text('✓', cx, cy + 8, { size: 48, color: C.safe });
      } else {
        // Unlit wire
        game.draw.line(r3.x + 8, cy, r3.x + r3.w - 8, cy, C.fuseWire, 6);
      }
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (!done) {
      game.draw.text('燃えてるヒューズをタップ！', W / 2, H * 0.87, { size: 36, color: C.text + '44' });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.18, { size: 52, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_EXPLODE; ei++) {
      game.draw.circle(W / 2 - (MAX_EXPLODE - 1) * 44 + ei * 88, H * 0.955, 18, ei < exploded ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(extinguished + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    initFuses();
    lightFuse(Math.floor(Math.random() * FUSE_COUNT));
  });
})(game);

// 583-echo-sonar.js
// エコーソナー — 音波を発して海底に隠れた宝を探し当てる
// 操作: タップで音波を発射、反射時間から距離を判断してドリルする
// 成功: 5個の宝を発見  失敗: 8回外れ or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#000a10',
    water:   '#003344',
    waterHi: '#004466',
    seafloor:'#1a1000',
    sonar:   '#00ff88',
    sonarHi: '#88ffcc',
    echo:    '#00ffcc44',
    treasure:'#f59e0b',
    treasureHi:'#fcd34d',
    drill:   '#ef4444',
    drillHi: '#fca5a5',
    found:   '#22c55e',
    text:    '#f1f5f9',
    ui:      '#334455'
  };

  var COLS = 6;
  var SEAFLOOR_Y = H * 0.6;
  var COL_W = W / COLS;
  var DRILL_R = 50;
  var TREASURE_DEPTHS = []; // 0-1 within seafloor
  var FOUND_COLS = [];
  var sonarWaves = []; // expanding circles
  var echoes = []; // return echoes per column
  var selectedCol = -1;
  var drilling = false;
  var drillTimer = 0;
  var drillCol = -1;
  var found = 0;
  var NEEDED = 5;
  var fails = 0;
  var MAX_FAIL = 8;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.found;
  var lastPing = -99;
  var pingInterval = 2.5;

  function init() {
    TREASURE_DEPTHS = [];
    FOUND_COLS = [];
    echoes = [];
    for (var i = 0; i < COLS; i++) {
      TREASURE_DEPTHS.push(0.2 + Math.random() * 0.6);
      FOUND_COLS.push(false);
      echoes.push({ visible: false, depth: 0, timer: 0 });
    }
  }

  function pingColumn(col) {
    // Send sonar wave
    sonarWaves.push({ x: (col + 0.5) * COL_W, y: SEAFLOOR_Y, r: 0, maxR: 300, alpha: 0.7, col: col });
    game.audio.play('se_tap', 0.2);
    lastPing = elapsed;

    // Schedule echo return based on distance
    var depth = TREASURE_DEPTHS[col];
    var delay = depth * 1.5 + 0.3;
    var echoCol = col;
    setTimeout(function() {
      if (!FOUND_COLS[echoCol]) {
        echoes[echoCol].visible = true;
        echoes[echoCol].depth = TREASURE_DEPTHS[echoCol];
        echoes[echoCol].timer = 2.0;
      }
    }, delay * 1000);
  }

  function drillAt(col) {
    if (FOUND_COLS[col]) return;
    drillCol = col;
    drilling = true;
    drillTimer = 0.8;
    game.audio.play('se_tap', 0.4);
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var col = Math.floor(tx / COL_W);
    col = Math.max(0, Math.min(COLS - 1, col));

    if (ty < SEAFLOOR_Y) {
      // Above seafloor = ping sonar
      selectedCol = col;
      pingColumn(col);
    } else {
      // Below seafloor = drill
      if (selectedCol >= 0) drillAt(selectedCol);
      else drillAt(col);
    }
  });

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    var col = Math.floor(x1 / COL_W);
    col = Math.max(0, Math.min(COLS - 1, col));
    selectedCol = col;
    pingColumn(col);
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
    if (flashAnim > 0) flashAnim -= dt * 2.5;

    // Auto ping (ambient)
    if (elapsed - lastPing > pingInterval) {
      for (var ci = 0; ci < COLS; ci++) {
        if (!FOUND_COLS[ci]) {
          sonarWaves.push({ x: (ci + 0.5) * COL_W, y: SEAFLOOR_Y, r: 0, maxR: 250, alpha: 0.3, col: ci });
        }
      }
      lastPing = elapsed;
    }

    // Drilling
    if (drilling) {
      drillTimer -= dt;
      if (drillTimer <= 0) {
        drilling = false;
        var dc = drillCol;
        // Check if treasure is here (based on echo depth match)
        var echoDepth = echoes[dc].depth;
        var treasure = TREASURE_DEPTHS[dc];
        // "Drilling" always hits or misses based on echo reading
        if (echoes[dc].visible && Math.abs(echoDepth - treasure) < 0.01) {
          // Found!
          FOUND_COLS[dc] = true;
          found++;
          flashCol = C.found;
          flashAnim = 0.5;
          game.audio.play('se_success', 0.9);
          var tx2 = (dc + 0.5) * COL_W;
          var ty2 = SEAFLOOR_Y + treasure * (H - SEAFLOOR_Y) * 0.7;
          for (var pi = 0; pi < 14; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: tx2, y: ty2, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.6, col: C.treasureHi });
          }
          if (found >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(found * 800 + Math.ceil(timeLeft) * 80); }, 800);
          }
        } else if (!echoes[dc].visible) {
          // No echo = no treasure here
          fails++;
          flashCol = C.drill;
          flashAnim = 0.3;
          game.audio.play('se_failure', 0.3);
          if (fails >= MAX_FAIL && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
        }
      }
    }

    // Update sonar waves
    for (var wi = sonarWaves.length - 1; wi >= 0; wi--) {
      sonarWaves[wi].r += 200 * dt;
      sonarWaves[wi].alpha -= dt * 1.2;
      if (sonarWaves[wi].alpha <= 0 || sonarWaves[wi].r > sonarWaves[wi].maxR) {
        sonarWaves.splice(wi, 1);
      }
    }

    // Update echoes
    for (var ei = 0; ei < COLS; ei++) {
      if (echoes[ei].timer > 0) echoes[ei].timer -= dt;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Water area
    game.draw.rect(0, 0, W, SEAFLOOR_Y, C.water, 0.6);
    // Water caustics
    for (var li = 0; li < 8; li++) {
      var lx = (li * 137 + Math.sin(elapsed + li) * 30) % W;
      game.draw.line(lx, 0, lx + 40, SEAFLOOR_Y, C.waterHi, 1);
    }

    // Ship at top
    var shipX = W / 2;
    game.draw.rect(shipX - 80, 30, 160, 50, '#334455', 0.9);
    game.draw.rect(shipX - 40, 10, 80, 30, '#445566', 0.9);
    game.draw.circle(shipX, 80, 8, C.sonar, 0.9);
    // Sonar tower
    game.draw.line(shipX, 80, shipX, SEAFLOOR_Y * 0.3, C.sonar, 3);

    // Sonar waves (vertical pulses going down)
    for (var wi2 = 0; wi2 < sonarWaves.length; wi2++) {
      var sw = sonarWaves[wi2];
      var swX = sw.x;
      // Draw as horizontal ring expanding in water
      game.draw.circle(swX, sw.y - sw.r, sw.r * 0.3, C.sonar, sw.alpha * 0.4);
      game.draw.line(swX - sw.r * 0.3, sw.y - sw.r, swX + sw.r * 0.3, sw.y - sw.r, C.sonarHi, 3);
    }

    // Seafloor
    game.draw.rect(0, SEAFLOOR_Y, W, H - SEAFLOOR_Y, C.seafloor, 0.9);
    // Seafloor texture
    for (var ti = 0; ti < 10; ti++) {
      var tsx = (ti * 113) % W;
      game.draw.circle(tsx, SEAFLOOR_Y + 15, 8 + (ti % 3) * 6, '#2a1800', 0.5);
    }

    // Column dividers
    for (var ci2 = 1; ci2 < COLS; ci2++) {
      game.draw.line(ci2 * COL_W, 0, ci2 * COL_W, H, C.ui, 1);
    }

    // Echoes (depth indicators)
    for (var ei2 = 0; ei2 < COLS; ei2++) {
      var echo = echoes[ei2];
      var ecx = (ei2 + 0.5) * COL_W;
      if (!FOUND_COLS[ei2] && echo.visible && echo.timer > 0) {
        var ecy = SEAFLOOR_Y + echo.depth * (H - SEAFLOOR_Y) * 0.7;
        var eAlpha = Math.min(1, echo.timer) * 0.7;
        game.draw.line(ecx, SEAFLOOR_Y, ecx, ecy, C.sonarHi, 4);
        game.draw.circle(ecx, ecy, 20, C.sonarHi, eAlpha + Math.sin(elapsed * 6) * 0.1);
        game.draw.text('▼', ecx, ecy + 14, { size: 28, color: C.sonar });
      }
    }

    // Found treasures
    for (var fi2 = 0; fi2 < COLS; fi2++) {
      if (FOUND_COLS[fi2]) {
        var fx = (fi2 + 0.5) * COL_W;
        var fy = SEAFLOOR_Y + TREASURE_DEPTHS[fi2] * (H - SEAFLOOR_Y) * 0.7;
        game.draw.circle(fx, fy, 30, C.treasure, 0.9);
        game.draw.circle(fx - 8, fy - 8, 10, C.treasureHi, 0.5);
        game.draw.text('★', fx, fy + 12, { size: 32, color: C.treasureHi });
      }
    }

    // Drill animation
    if (drilling) {
      var dx2 = (drillCol + 0.5) * COL_W;
      var drillY = SEAFLOOR_Y + drillTimer * 80;
      var dp = 1 - drillTimer / 0.8;
      game.draw.rect(dx2 - 12, SEAFLOOR_Y, 24, (H - SEAFLOOR_Y) * dp * 0.7, C.drill, 0.5);
      game.draw.circle(dx2, drillY, 20, C.drillHi, 0.9);
    }

    // Selected column highlight
    if (selectedCol >= 0) {
      game.draw.rect(selectedCol * COL_W, 0, COL_W, SEAFLOOR_Y, C.sonarHi, 0.04);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Fail dots
    for (var fi3 = 0; fi3 < MAX_FAIL; fi3++) {
      game.draw.circle(W / 2 - (MAX_FAIL - 1) * 44 + fi3 * 88, H * 0.955, 18, fi3 < fails ? C.drill : C.ui, 0.9);
    }

    game.draw.text(found + ' / ' + NEEDED + ' 発見', W / 2, 148, { size: 52, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.sonar : C.drill);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    init();
  });
})(game);

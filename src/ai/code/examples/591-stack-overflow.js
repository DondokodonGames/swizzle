// 591-stack-overflow.js
// スタックオーバーフロー — 積み上がるブロックが天井に届く前に消す爽快感
// 操作: タップで同じ色のブロック列を消す、3列同色で連鎖ボーナス
// 成功: 50列クリア  失敗: 天井到達 or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#08050f',
    ceiling: '#cc2233',
    ceilHi:  '#ff4455',
    text:    '#f1f5f9',
    ui:      '#1a1a2e',
    combo:   '#ffdd00',
    cleared: '#22c55e'
  };

  var COLS = 5;
  var COL_W = W / COLS;
  var BLOCK_H = 80;
  var CEILING_Y = 220;
  var FLOOR_Y = H - 180;
  var MAX_BLOCKS = Math.floor((FLOOR_Y - CEILING_Y) / BLOCK_H);

  var COLORS = ['#ff4466', '#44aaff', '#44ffaa', '#ffaa00', '#cc44ff'];
  var COLOR_NAMES = ['red', 'blue', 'green', 'orange', 'purple'];

  var columns = []; // each column: array of color indices (bottom to top)
  var cleared = 0;
  var NEEDED = 50;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.cleared;
  var comboCount = 0;
  var comboTimer = 0;
  var comboText = '';
  var popAnimations = []; // { col, blockY, col_color, timer }
  var addTimer = 0;
  var addRate = 3.0; // seconds between new rows
  var dangerPulse = 0;

  function initColumns() {
    columns = [];
    for (var i = 0; i < COLS; i++) {
      columns.push([]);
    }
    // Add initial blocks
    for (var row = 0; row < 4; row++) {
      for (var c = 0; c < COLS; c++) {
        columns[c].push(Math.floor(Math.random() * COLORS.length));
      }
    }
  }

  function addRow() {
    // Check if any column would overflow
    for (var c = 0; c < COLS; c++) {
      if (columns[c].length >= MAX_BLOCKS) {
        // Game over
        if (!done) {
          done = true;
          game.audio.play('se_failure', 0.8);
          setTimeout(function() { game.end.failure(); }, 500);
        }
        return;
      }
    }
    var newColor = Math.floor(Math.random() * COLORS.length);
    for (var c2 = 0; c2 < COLS; c2++) {
      // Each column gets same or random color for variety
      columns[c2].push(Math.floor(Math.random() * COLORS.length));
    }
  }

  function clearColumn(col) {
    if (columns[col].length === 0) return false;
    var topColor = columns[col][columns[col].length - 1];
    // Find all blocks of this color in the column
    var matching = 0;
    for (var bi = columns[col].length - 1; bi >= 0; bi--) {
      if (columns[col][bi] === topColor) matching++;
      else break;
    }
    // Remove them
    var blockY = FLOOR_Y - columns[col].length * BLOCK_H;
    columns[col].splice(columns[col].length - matching);
    var colsCleared = matching;

    // Particle burst
    for (var pi = 0; pi < matching * 4; pi++) {
      var ang = Math.random() * Math.PI * 2;
      var cx = (col + 0.5) * COL_W;
      var cy = blockY + BLOCK_H / 2;
      particles.push({ x: cx, y: cy, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200 - 100, life: 0.5, col: COLORS[topColor] });
    }

    cleared += colsCleared;
    return colsCleared;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var col = Math.floor(tx / COL_W);
    col = Math.max(0, Math.min(COLS - 1, col));

    if (columns[col].length === 0) {
      game.audio.play('se_tap', 0.1);
      comboCount = 0;
      return;
    }

    var result = clearColumn(col);
    if (result > 0) {
      comboCount++;
      comboTimer = 1.0;
      game.audio.play('se_success', Math.min(0.9, 0.4 + comboCount * 0.1));
      if (comboCount >= 3) {
        comboText = comboCount + 'x COMBO!';
        flashCol = C.combo;
        flashAnim = 0.3;
        game.audio.play('se_success', 0.8);
      }
      if (cleared >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(cleared * 100 + comboCount * 200 + Math.ceil(timeLeft) * 80); }, 700);
      }
    } else {
      comboCount = 0;
      game.audio.play('se_tap', 0.15);
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
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) comboCount = 0;
    }

    // Add rows
    addTimer += dt;
    if (addTimer >= addRate && !done) {
      addTimer = 0;
      addRow();
      addRate = Math.max(1.5, 3.0 - elapsed * 0.02);
    }

    // Danger pulse
    var maxHeight = 0;
    for (var c = 0; c < COLS; c++) {
      if (columns[c].length > maxHeight) maxHeight = columns[c].length;
    }
    var dangerRatio = maxHeight / MAX_BLOCKS;
    if (dangerRatio > 0.7) dangerPulse = (dangerPulse + dt * 6) % (Math.PI * 2);
    else dangerPulse = 0;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 400 * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Column backgrounds
    for (var c2 = 0; c2 < COLS; c2++) {
      if (c2 % 2 === 0) game.draw.rect(c2 * COL_W, CEILING_Y, COL_W, FLOOR_Y - CEILING_Y, C.ui, 0.15);
    }
    // Column dividers
    for (var c3 = 1; c3 < COLS; c3++) {
      game.draw.line(c3 * COL_W, CEILING_Y, c3 * COL_W, FLOOR_Y, C.ui, 2);
    }

    // Blocks
    for (var c4 = 0; c4 < COLS; c4++) {
      for (var bi2 = 0; bi2 < columns[c4].length; bi2++) {
        var blockY2 = FLOOR_Y - (bi2 + 1) * BLOCK_H;
        var col2 = columns[c4][bi2];
        var isTop = (bi2 === columns[c4].length - 1);
        game.draw.rect(c4 * COL_W + 4, blockY2 + 4, COL_W - 8, BLOCK_H - 8, COLORS[col2], 0.9);
        if (isTop) {
          game.draw.rect(c4 * COL_W + 4, blockY2 + 4, COL_W - 8, 8, '#ffffff', 0.2);
        }
      }
    }

    // Ceiling
    var ceilAlpha = 0.9 + (dangerPulse > 0 ? Math.sin(dangerPulse) * 0.1 : 0);
    game.draw.rect(0, CEILING_Y - 20, W, 20, C.ceiling, ceilAlpha);
    game.draw.rect(0, CEILING_Y - 20, W, 6, C.ceilHi, 0.8);

    // Floor
    game.draw.rect(0, FLOOR_Y, W, 8, C.ui, 0.6);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Combo display
    if (comboTimer > 0 && comboCount >= 3) {
      game.draw.text(comboText, W / 2, H * 0.82, { size: 56, color: C.combo, bold: true });
    }

    game.draw.text(cleared + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.cleared : C.ceiling);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    initColumns();
  });
})(game);

// 214-stack-balance.js
// スタックバランス — 傾くタワーを左右タップで立て直しながら積み上げる綱渡り感覚
// 操作: 左タップで左傾き修正、右タップで右傾き修正
// 成功: 10個積む  失敗: 傾きが限界を超える or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:    '#0a0a14',
    block: '#3b82f6',
    blkHi: '#93c5fd',
    warn:  '#f59e0b',
    danger:'#ef4444',
    ground:'#1e293b',
    ui:    '#64748b'
  };

  var BLOCK_W = 180;
  var BLOCK_H = 60;
  var GX = W / 2;
  var GY = H * 0.85;

  var blocks = [];
  var tilt = 0;       // current tilt angle (radians)
  var tiltVel = 0;    // angular velocity
  var TILT_MAX = 0.45;
  var TAP_CORRECT = 0.18;
  var SWAY_ACCEL = 0.008; // natural sway increases per block
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var stackCount = 0;
  var NEEDED = 10;
  var dropTimer = 2.0; // time until next block drops
  var dropping = null; // block falling from top
  var feedback = 0;
  var feedbackOk = false;

  function addBlock() {
    blocks.push({ x: GX, y: GY - blocks.length * BLOCK_H, tilt: 0 });
    stackCount = blocks.length;
  }

  // Start with one block
  function spawnDrop() {
    dropping = { x: W / 2 + (Math.random() - 0.5) * 200, y: -40, vy: 500 };
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (tx < W / 2) {
      // Left tap — push right (correct leftward tilt)
      tiltVel += TAP_CORRECT;
      game.audio.play('se_tap', 0.3);
    } else {
      // Right tap — push left (correct rightward tilt)
      tiltVel -= TAP_CORRECT;
      game.audio.play('se_tap', 0.3);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedback > 0) feedback -= dt;

    var sway = SWAY_ACCEL * (1 + blocks.length * 0.15);
    tiltVel += sway * (Math.random() - 0.5) * dt * 60;
    tilt += tiltVel * dt;
    tiltVel *= 0.96;

    if (Math.abs(tilt) > TILT_MAX && !done) {
      done = true;
      game.audio.play('se_failure');
      setTimeout(function() { game.end.failure(); }, 400);
    }

    // Dropping block
    if (dropping) {
      dropping.y += dropping.vy * dt;
      var landY = GY - blocks.length * BLOCK_H - BLOCK_H / 2;
      if (dropping.y >= landY) {
        dropping = null;
        addBlock();
        feedbackOk = true; feedback = 0.4;
        game.audio.play('se_success', 0.5);
        if (blocks.length >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(blocks.length * 100 + Math.ceil(timeLeft) * 40); }, 400);
        }
        dropTimer = 2.0 + Math.random() * 1.0;
      }
    } else {
      dropTimer -= dt;
      if (dropTimer <= 0) {
        spawnDrop();
      }
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Ground
    game.draw.rect(0, GY, W, H - GY, C.ground, 0.8);

    // Tower (tilted)
    var tiltDeg = tilt;
    for (var bi = 0; bi < blocks.length; bi++) {
      var bx = GX + Math.sin(tiltDeg) * bi * BLOCK_H;
      var by = GY - bi * BLOCK_H - BLOCK_H / 2;
      var wobble = Math.sin(elapsed * 3 + bi * 0.5) * Math.abs(tilt) * 20;
      bx += wobble;

      var danger = Math.abs(tilt) / TILT_MAX;
      var col = danger > 0.7 ? C.danger : danger > 0.4 ? C.warn : C.block;
      var hi = C.blkHi;

      game.draw.rect(bx - BLOCK_W / 2, by - BLOCK_H / 2, BLOCK_W, BLOCK_H, col, 0.85);
      game.draw.rect(bx - BLOCK_W / 2, by - BLOCK_H / 2, BLOCK_W, 10, hi, 0.3);

      // Block number
      if (bi === blocks.length - 1) {
        game.draw.circle(bx, by, 22, hi, 0.5);
      }
    }

    // Dropping block
    if (dropping) {
      game.draw.rect(dropping.x - BLOCK_W / 2, dropping.y - BLOCK_H / 2, BLOCK_W, BLOCK_H, C.blkHi, 0.5);
    }

    // Tilt meter
    var meterX = W / 2;
    var meterY = H * 0.92;
    game.draw.rect(meterX - 200, meterY - 16, 400, 32, C.ui, 0.3);
    var danger2 = Math.abs(tilt) / TILT_MAX;
    var mCol = danger2 > 0.7 ? C.danger : danger2 > 0.4 ? C.warn : '#22c55e';
    game.draw.rect(meterX - 200, meterY - 16, 400 * danger2, 32, mCol, 0.7);
    var needleX = meterX + (tilt / TILT_MAX) * 200;
    game.draw.line(needleX, meterY - 20, needleX, meterY + 20, '#fff', 4);
    game.draw.text('バランス', W / 2, H * 0.95, { size: 32, color: C.ui });

    // Left / Right hints
    game.draw.text('← タップ', W * 0.18, H * 0.75, { size: 36, color: '#3b82f6', bold: true });
    game.draw.text('タップ →', W * 0.82, H * 0.75, { size: 36, color: '#3b82f6', bold: true });

    game.draw.text(blocks.length + ' / ' + NEEDED, W / 2, 148, { size: 64, color: '#f1f5f9', bold: true });

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#22c55e' : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    addBlock();
    dropTimer = 1.5;
  });
})(game);

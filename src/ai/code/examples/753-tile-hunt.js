// 753-tile-hunt.js
// タイルハント — 光るタイルを素早くタップせよ。消える前に当てろ
// 操作: タップで光っているタイルを選択
// 成功: 40回成功  失敗: 10回ミス or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#07060f',
    tile:    '#1a1730',
    tileHi:  '#6d28d9',
    lit:     '#a78bfa',
    litHi:   '#ede9fe',
    glow:    '#7c3aed',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#0e0c1c'
  };

  var COLS = 4;
  var ROWS = 4;
  var MARGIN = 80;
  var TILE_GAP = 12;
  var TILE_W = (W - MARGIN * 2 - TILE_GAP * (COLS - 1)) / COLS;
  var TILE_H = TILE_W;
  var GRID_Y = H * 0.28;

  var litIdx = -1;
  var litTimer = 0;
  var LIT_DUR = 0.75;
  var waitTimer = 0;
  var WAIT_DUR = 0.2;
  var answered = false;

  var score = 0;
  var NEEDED = 40;
  var errors = 0;
  var MAX_ERR = 10;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function getTileRect(idx) {
    var col = idx % COLS;
    var row = Math.floor(idx / COLS);
    var tx = MARGIN + col * (TILE_W + TILE_GAP);
    var ty = GRID_Y + row * (TILE_H + TILE_GAP);
    return { x: tx, y: ty, w: TILE_W, h: TILE_H };
  }

  function showNext() {
    litIdx = Math.floor(Math.random() * COLS * ROWS);
    LIT_DUR = Math.max(0.38, 0.75 - score * 0.008);
    litTimer = LIT_DUR;
    answered = false;
  }

  game.onTap(function(tx, ty) {
    if (done || litIdx < 0 || answered || waitTimer > 0) return;
    var tapped = -1;
    for (var i = 0; i < COLS * ROWS; i++) {
      var r = getTileRect(i);
      if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) {
        tapped = i;
        break;
      }
    }
    if (tapped < 0) return;
    answered = true;
    if (tapped === litIdx) {
      score++;
      flashCol = C.correct;
      flashAnim = 0.2;
      resultText = '発見！';
      resultTimer = 0.32;
      game.audio.play('se_tap', 0.1);
      var r2 = getTileRect(litIdx);
      for (var p = 0; p < 5; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: r2.x + r2.w / 2, y: r2.y + r2.h / 2, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.35, col: C.litHi });
      }
      litIdx = -1;
      waitTimer = WAIT_DUR;
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 200 + Math.ceil(timeLeft) * 120); }, 700);
      }
    } else {
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.25;
      resultText = 'ちがう！';
      resultTimer = 0.38;
      game.audio.play('se_failure', 0.25);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
      }
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

    if (waitTimer > 0) {
      waitTimer -= dt;
      if (waitTimer <= 0) showNext();
      return;
    }

    if (litIdx >= 0 && !answered) {
      litTimer -= dt;
      if (litTimer <= 0) {
        // Timeout — count as error
        errors++;
        flashCol = C.wrong;
        flashAnim = 0.22;
        resultText = '遅い！';
        resultTimer = 0.35;
        game.audio.play('se_failure', 0.2);
        litIdx = -1;
        if (errors >= MAX_ERR && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        } else {
          waitTimer = WAIT_DUR;
        }
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.8;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid
    for (var i = 0; i < COLS * ROWS; i++) {
      var r = getTileRect(i);
      var isLit = i === litIdx;
      var litFrac = isLit ? (litTimer / LIT_DUR) : 0;
      game.draw.rect(r.x + 3, r.y + 3, r.w, r.h, '#000', 0.3);
      game.draw.rect(r.x, r.y, r.w, r.h, isLit ? C.tileHi : C.tile, 0.9);
      if (isLit) {
        game.draw.rect(r.x, r.y, r.w, r.h, C.lit, litFrac * 0.35);
        game.draw.circle(r.x + r.w / 2, r.y + r.h / 2, r.w * 0.4, C.glow, litFrac * 0.4 + 0.1 * Math.sin(elapsed * 10));
        game.draw.rect(r.x, r.y, r.w, 6, C.litHi, litFrac * 0.5);
        // Timer bar at bottom of tile
        game.draw.rect(r.x, r.y + r.h - 6, r.w * litFrac, 6, C.litHi, 0.85);
      }
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life);
    }

    if (litIdx >= 0) {
      game.draw.text('光るタイルをタップ！', W / 2, H * 0.87, { size: 42, color: C.lit + 'cc', bold: true });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.91, { size: 50, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 48 + ei * 96, H * 0.955, 20, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    showNext();
  });
})(game);

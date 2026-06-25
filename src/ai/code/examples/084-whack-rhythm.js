// 084-whack-rhythm.js
// リズムモグラ — BPM120のビートに乗せてモグラが出る瞬間をタップする音楽ゲーム感
// 操作: タップでモグラを叩く（ビートのタイミングで）
// 成功: 15匹叩く  失敗: 5回外す or 25秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0c0810',
    hole:    '#1a1020',
    holeRim: '#2d1f3d',
    mole:    '#a16207',
    moleHi:  '#d97706',
    nose:    '#dc2626',
    correct: '#22c55e',
    wrong:   '#ef4444',
    beat:    '#7c3aed',
    ui:      '#475569'
  };

  var COLS = 3;
  var ROWS = 3;
  var CELL_W = 260;
  var CELL_H = 200;
  var GRID_X = (W - COLS * CELL_W) / 2;
  var GRID_Y = H * 0.28;

  var BPM = 120;
  var BEAT_INTERVAL = 60 / BPM; // 0.5s
  var beatTimer = 0;
  var beatCount = 0;
  var beatFlash = 0;

  // Moles: index 0-8 (3x3 grid)
  var moles = [];
  for (var i = 0; i < 9; i++) {
    moles.push({ up: false, timer: 0, hit: false, hitTimer: 0 });
  }

  var score = 0;
  var needed = 15;
  var misses = 0;
  var maxMisses = 5;
  var timeLeft = 25;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;

  function moleCenterX(idx) { return GRID_X + (idx % COLS) * CELL_W + CELL_W / 2; }
  function moleCenterY(idx) { return GRID_Y + Math.floor(idx / COLS) * CELL_H + CELL_H * 0.6; }

  function raiseMole() {
    // Pick a random mole that's not already up
    var down = [];
    for (var i = 0; i < 9; i++) {
      if (!moles[i].up) down.push(i);
    }
    if (down.length === 0) return;
    var idx = down[Math.floor(Math.random() * down.length)];
    // How many simultaneously? Ramp up with score
    var count = Math.min(1 + Math.floor(score / 5), 3);
    for (var c = 0; c < count && down.length > c; c++) {
      var pick = down[Math.floor(Math.random() * (down.length - c)) + c];
      // Swap
      var tmp = down[c]; down[c] = pick; down[pick] = tmp;
      moles[down[c]].up = true;
      moles[down[c]].timer = BEAT_INTERVAL * 2; // stays up for 2 beats
      moles[down[c]].hit = false;
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var hitAny = false;
    for (var i = 0; i < 9; i++) {
      if (!moles[i].up || moles[i].hit) continue;
      var cx = moleCenterX(i);
      var cy = moleCenterY(i);
      var dx = tx - cx;
      var dy = ty - cy;
      if (Math.sqrt(dx * dx + dy * dy) < 80) {
        moles[i].hit = true;
        moles[i].hitTimer = 0.2;
        moles[i].up = false;
        moles[i].timer = 0;
        score++;
        feedbackOk = true;
        feedback = 0.3;
        game.audio.play('se_tap', 0.9);
        if (score >= needed && !done) {
          done = true;
          game.audio.play('se_success');
          setTimeout(function() { game.end.success(score * 20 + Math.ceil(timeLeft) * 8); }, 400);
        }
        hitAny = true;
        break;
      }
    }
    if (!hitAny) {
      // Missed — penalty only if no mole up
      var anyUp = moles.some(function(m) { return m.up && !m.hit; });
      if (!anyUp) {
        misses++;
        feedbackOk = false;
        feedback = 0.35;
        game.audio.play('se_failure', 0.5);
        if (misses >= maxMisses && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 300);
        }
      }
    }
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

    // Beat system
    beatTimer -= dt;
    if (beatTimer <= 0) {
      beatTimer = BEAT_INTERVAL;
      beatCount++;
      beatFlash = 0.12;
      if (beatCount % 2 === 0) raiseMole();
    }
    if (beatFlash > 0) beatFlash -= dt;

    // Mole timers
    for (var i = 0; i < 9; i++) {
      var m = moles[i];
      if (m.up) {
        m.timer -= dt;
        if (m.timer <= 0) {
          // Mole escaped without being hit
          m.up = false;
          misses++;
          feedbackOk = false;
          feedback = 0.3;
          game.audio.play('se_failure', 0.4);
          if (misses >= maxMisses && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 300);
          }
        }
      }
      if (m.hitTimer > 0) m.hitTimer -= dt;
    }

    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Beat flash background
    if (beatFlash > 0) {
      game.draw.rect(0, 0, W, H, C.beat, beatFlash / 0.12 * 0.08);
    }

    // Holes + moles
    for (var j = 0; j < 9; j++) {
      var cx = moleCenterX(j);
      var cy = moleCenterY(j);
      var mol = moles[j];

      // Hole
      game.draw.circle(cx, cy + 20, 90, C.hole);
      game.draw.circle(cx, cy + 20, 80, C.holeRim, 0.4);

      // Mole
      if (mol.up && !mol.hit) {
        var upFrac = Math.min(1, (BEAT_INTERVAL * 2 - mol.timer) / (BEAT_INTERVAL * 0.3));
        var moleY = cy + 20 - upFrac * 80;
        // Body
        game.draw.circle(cx, moleY, 60, C.mole);
        game.draw.circle(cx, moleY - 20, 44, C.moleHi);
        // Eyes
        game.draw.circle(cx - 16, moleY - 28, 10, '#1c1008');
        game.draw.circle(cx + 16, moleY - 28, 10, '#1c1008');
        game.draw.circle(cx - 13, moleY - 31, 4, '#fff', 0.8);
        game.draw.circle(cx + 19, moleY - 31, 4, '#fff', 0.8);
        // Nose
        game.draw.circle(cx, moleY - 14, 8, C.nose);
        // Urgent blink when timer low
        if (mol.timer < BEAT_INTERVAL * 0.5) {
          var urgPulse = Math.sin(game.time.elapsed * 20) > 0;
          if (urgPulse) game.draw.circle(cx, moleY, 64, '#fff', 0.15);
        }
      } else if (mol.hitTimer > 0) {
        // Hit sparkle
        var spark = mol.hitTimer / 0.2;
        game.draw.circle(cx, cy - 20, 40 + (1 - spark) * 60, C.correct, spark * 0.6);
        game.draw.text('★', cx, cy - 20, { size: 48, color: '#fff', bold: true });
      }
    }

    // Feedback
    if (feedback > 0) {
      game.draw.text(feedbackOk ? '叩いた！' : '逃げた！', W / 2, H * 0.88, {
        size: 68, color: feedbackOk ? C.correct : C.wrong, bold: true
      });
    }

    // Beat indicator
    var beatPhase = 1 - (beatTimer / BEAT_INTERVAL);
    var beatR = 20 + beatPhase * 8;
    game.draw.circle(W / 2, H * 0.22, beatR, C.beat, 0.6 + beatPhase * 0.4);

    // Timer bar
    var ratio = Math.max(0, timeLeft / 25);
    game.draw.rect(0, 0, W, 72, '#0c0810');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.beat : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score row
    for (var s = 0; s < needed; s++) {
      var sx = W / 2 + (s - (needed - 1) / 2) * 60;
      game.draw.circle(sx, 128, 20, s < score ? C.correct : '#0a1428');
    }
    for (var mi = 0; mi < maxMisses; mi++) {
      var mx = W / 2 + (mi - (maxMisses - 1) / 2) * 56;
      game.draw.circle(mx, 192, 18, mi < misses ? C.wrong : '#0a1428');
    }
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    beatTimer = BEAT_INTERVAL * 0.5;
  });
})(game);

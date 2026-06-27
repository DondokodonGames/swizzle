// 728-number-climb.js
// 数字クライム — 画面に散らばる数字を1から順に素早くタップして駆け上がれ
// 操作: タップで最小番号から順にタップ（数字は常に見える）
// 成功: 25セットクリア  失敗: 10回ミス or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020812',
    numBox:  '#1e3a5f',
    numHi:   '#0ea5e9',
    numNext: '#22c55e',
    numDone: '#0f2b47',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#030c18'
  };

  var NUM_COUNT = 6;
  var BOX_R = 64;
  var PLAY_X0 = 80, PLAY_Y0 = 240;
  var PLAY_W = W - 160, PLAY_H = H * 0.60;

  var nums = [];
  var nextNum = 1;
  var round = 0;
  var NEEDED = 25;

  var errors = 0;
  var MAX_ERR = 10;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var waitTimer = 0;

  function newRound() {
    round++;
    var count = Math.min(8, 4 + Math.floor(round / 5));
    nums = [];
    nextNum = 1;

    var placed = [];
    for (var i = 0; i < count; i++) {
      var ok = false, nx, ny, tries = 0;
      while (!ok && tries < 200) {
        tries++;
        nx = PLAY_X0 + BOX_R + Math.random() * (PLAY_W - BOX_R * 2);
        ny = PLAY_Y0 + BOX_R + Math.random() * (PLAY_H - BOX_R * 2);
        ok = true;
        for (var j = 0; j < placed.length; j++) {
          var dx = nx - placed[j].x, dy = ny - placed[j].y;
          if (dx * dx + dy * dy < (BOX_R * 2 + 16) * (BOX_R * 2 + 16)) { ok = false; break; }
        }
      }
      placed.push({ x: nx, y: ny, num: i + 1, tapped: false, phase: Math.random() * Math.PI * 2 });
    }
    nums = placed;
    waitTimer = 0;
  }

  game.onTap(function(tx, ty) {
    if (done || waitTimer > 0) return;
    var hit = -1;
    for (var i = 0; i < nums.length; i++) {
      if (nums[i].tapped) continue;
      var dx = tx - nums[i].x, dy = ty - nums[i].y;
      if (dx * dx + dy * dy < (BOX_R + 16) * (BOX_R + 16)) { hit = i; break; }
    }
    if (hit < 0) return;

    if (nums[hit].num === nextNum) {
      nums[hit].tapped = true;
      nextNum++;
      game.audio.play('se_tap', 0.12);
      for (var p = 0; p < 4; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: nums[hit].x, y: nums[hit].y, vx: Math.cos(pa)*160, vy: Math.sin(pa)*160, life: 0.4, col: C.numHi });
      }
      if (nextNum > nums.length) {
        // Round clear
        flashCol = C.correct;
        flashAnim = 0.35;
        resultText = 'クリア！';
        resultTimer = 0.6;
        game.audio.play('se_success', 0.6);
        if (round >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(round * 400 + Math.ceil(timeLeft) * 80); }, 700);
        } else {
          waitTimer = 0.7;
        }
      }
    } else {
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.3;
      resultText = '順番ちがう！';
      resultTimer = 0.5;
      game.audio.play('se_failure', 0.3);
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
      if (waitTimer <= 0) newRound();
    }

    for (var ni = 0; ni < nums.length; ni++) {
      if (!nums[ni].tapped) nums[ni].phase += dt * 1.5;
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    game.draw.text('次: ' + nextNum, W / 2, PLAY_Y0 - 60, { size: 52, color: C.numNext, bold: true });

    // Number boxes
    for (var ni2 = 0; ni2 < nums.length; ni2++) {
      var n = nums[ni2];
      if (n.tapped) {
        game.draw.circle(n.x, n.y, BOX_R, C.numDone, 0.4);
        game.draw.text('✓', n.x, n.y + 16, { size: 52, color: C.numDone + 'cc', bold: true });
        continue;
      }
      var isNext = n.num === nextNum;
      var pulse = isNext ? (0.85 + 0.15 * Math.sin(elapsed * 6)) : (0.92 + 0.08 * Math.sin(n.phase * 2));
      var bCol = isNext ? C.numNext : C.numBox;

      if (isNext) {
        game.draw.circle(n.x, n.y, BOX_R + 20, C.numNext, 0.12);
      }
      game.draw.circle(n.x + 5, n.y + 5, BOX_R, '#000', 0.25);
      game.draw.circle(n.x, n.y, BOX_R * pulse, bCol, 0.9);
      game.draw.circle(n.x - BOX_R * 0.28, n.y - BOX_R * 0.32, BOX_R * 0.2, '#fff', 0.25);
      game.draw.text(n.num + '', n.x, n.y + 18, { size: 64, color: isNext ? '#fff' : C.numHi, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.88, { size: 56, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 48 + ei * 96, H * 0.955, 20, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(round + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    newRound();
  });
})(game);

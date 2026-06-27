// 695-bubble-order.js
// バブル順 — 大きさの順番通りにバブルをタップせよ
// 操作: タップで小さい順（または大きい順）にバブルを選ぶ
// 成功: 15問クリア  失敗: 5回ミス or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020e18',
    bubble:  '#0ea5e9',
    bubHi:   '#e0f2fe',
    bubDim:  '#0c4a6e',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#030d18',
    gold:    '#fbbf24'
  };

  var PLAY_Y0 = 220;
  var PLAY_Y1 = H * 0.88;
  var MIN_R = 48;
  var MAX_R = 170;

  var bubbles = [];
  var order = 'asc'; // 'asc' = small to large
  var nextIdx = 0;
  var round = 0;
  var NEEDED = 15;
  var errors = 0;
  var MAX_ERR = 5;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var tapFlash = -1, tapFlashTimer = 0;
  var roundWait = 0;
  var roundDone = false;

  function newRound() {
    round++;
    order = round % 2 === 0 ? 'desc' : 'asc';
    var count = 4 + Math.min(3, Math.floor(round / 4));
    bubbles = [];
    var radii = [];
    for (var i = 0; i < count; i++) {
      radii.push(MIN_R + Math.floor(Math.random() * (MAX_R - MIN_R)));
    }
    // Sort to make sure they're all different enough
    radii.sort(function(a, b) { return a - b; });
    for (var j = 1; j < radii.length; j++) {
      if (radii[j] - radii[j-1] < 20) radii[j] = radii[j-1] + 20;
    }

    // Place bubbles without overlap
    var placed = [];
    var attempts = 0;
    for (var k = 0; k < count; k++) {
      var r = radii[k];
      var ok = false;
      var bx, by;
      while (!ok && attempts < 300) {
        attempts++;
        bx = r + 30 + Math.random() * (W - r * 2 - 60);
        by = PLAY_Y0 + r + 30 + Math.random() * (PLAY_Y1 - PLAY_Y0 - r * 2 - 60);
        ok = true;
        for (var m = 0; m < placed.length; m++) {
          var dx = bx - placed[m].x;
          var dy = by - placed[m].y;
          var minDist = r + placed[m].r + 20;
          if (dx * dx + dy * dy < minDist * minDist) { ok = false; break; }
        }
      }
      placed.push({ x: bx, y: by, r: r, rank: k, tapped: false, pop: 0, phase: Math.random() * Math.PI * 2 });
    }
    bubbles = placed;

    // Sort ranks so asc: rank 0 = smallest
    if (order === 'asc') {
      nextIdx = 0; // tap in rank order 0,1,2,...
    } else {
      nextIdx = count - 1; // tap in rank order N-1, N-2, ...
    }
    roundDone = false;
    roundWait = 0;
    tapFlash = -1;
  }

  function getNextRank() {
    if (order === 'asc') return nextIdx;
    return nextIdx;
  }

  game.onTap(function(tx, ty) {
    if (done || roundDone) return;
    for (var i = 0; i < bubbles.length; i++) {
      var b = bubbles[i];
      if (b.tapped) continue;
      var dx = tx - b.x, dy = ty - b.y;
      if (dx * dx + dy * dy < (b.r + 20) * (b.r + 20)) {
        // Check if correct rank
        var expectedRank = (order === 'asc') ? nextIdx : (bubbles.length - 1 - nextIdx);
        if (b.rank === expectedRank) {
          b.tapped = true;
          tapFlash = i;
          tapFlashTimer = 0.25;
          game.audio.play('se_tap', 0.15);
          for (var p = 0; p < 5; p++) {
            var pa = Math.random() * Math.PI * 2;
            particles.push({ x: b.x, y: b.y, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.45, col: C.bubHi });
          }
          nextIdx++;

          // Check round complete
          var allTapped = true;
          for (var j = 0; j < bubbles.length; j++) { if (!bubbles[j].tapped) { allTapped = false; break; } }
          if (allTapped) {
            roundDone = true;
            flashCol = C.correct;
            flashAnim = 0.35;
            resultText = 'パーフェクト！';
            resultTimer = 0.7;
            game.audio.play('se_success', 0.7);
            if (round >= NEEDED && !done) {
              done = true;
              game.audio.play('se_success', 0.9);
              setTimeout(function() { game.end.success(round * 500 + Math.ceil(timeLeft) * 70); }, 700);
            } else {
              roundWait = 0.9;
            }
          }
        } else {
          // Wrong bubble
          errors++;
          flashCol = C.wrong;
          flashAnim = 0.4;
          resultText = '順番が違う！';
          resultTimer = 0.7;
          game.audio.play('se_failure', 0.35);
          if (errors >= MAX_ERR && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
          } else {
            roundDone = true;
            roundWait = 0.9;
            setTimeout(newRound, 900);
          }
        }
        break;
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
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;
    if (tapFlashTimer > 0) tapFlashTimer -= dt * 4;

    if (roundWait > 0 && roundDone) {
      roundWait -= dt;
      if (roundWait <= 0) newRound();
    }

    for (var i = 0; i < bubbles.length; i++) {
      if (!bubbles[i].tapped) bubbles[i].phase += dt;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Order instruction
    var instText = order === 'asc' ? '小さい順にタップ →' : '大きい順にタップ →';
    var instCol = order === 'asc' ? '#38bdf8' : C.gold;
    game.draw.text(instText, W / 2, PLAY_Y0 - 50, { size: 40, color: instCol, bold: true });

    // Bubbles
    for (var bi = 0; bi < bubbles.length; bi++) {
      var b = bubbles[bi];
      if (b.tapped) {
        // Popped: just a faint ring
        game.draw.circle(b.x, b.y, b.r + 20, C.correct, 0.08);
        continue;
      }
      var pulse = 0.85 + 0.15 * Math.sin(b.phase * 2.5);
      var isFlash = (bi === tapFlash && tapFlashTimer > 0);
      var alpha = isFlash ? 0.95 : 0.7;
      game.draw.circle(b.x + 5, b.y + 5, b.r, '#000', 0.25);
      game.draw.circle(b.x, b.y, b.r * pulse, isFlash ? C.bubHi : C.bubble, alpha);
      // Highlight
      game.draw.circle(b.x - b.r * 0.3, b.y - b.r * 0.35, b.r * 0.22, C.bubHi, 0.4);
      // Inner ring
      game.draw.circle(b.x, b.y, b.r * 0.7 * pulse, C.bubDim, 0.25);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.9, { size: 60, color: flashCol, bold: true });
    }

    // Error dots
    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 56 + ei * 112, H * 0.955, 22, ei < errors ? C.wrong : C.ui, 0.9);
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

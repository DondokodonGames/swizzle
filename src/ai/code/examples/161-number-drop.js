// 161-number-drop.js
// 数字落下 — 落ちてくる数字を昇順にタップする、頭が追いつかない瞬間の焦り
// 操作: タップで数字を選ぶ
// 成功: 1〜15を順番に全タップ  失敗: 順番を間違える or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#040a10',
    num:    '#3b82f6',
    numHi:  '#93c5fd',
    next:   '#22c55e',
    nextHi: '#86efac',
    wrong:  '#ef4444',
    done2:  '#374151',
    ui:     '#334155'
  };

  var TOTAL = 15;
  var NUM_R = 60;
  var DROP_SPEED_BASE = 100;

  var numbers = [];
  var nextTarget = 1;
  var score = 0;
  var timeLeft = 40;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var particles = [];

  function spawnNumber(n) {
    var x = NUM_R + 40 + Math.random() * (W - (NUM_R + 40) * 2);
    numbers.push({
      n: n,
      x: x,
      y: -NUM_R,
      vy: DROP_SPEED_BASE + Math.random() * 80,
      tapped: false,
      tapTimer: 0
    });
  }

  function initNumbers() {
    // Spawn all numbers with varied delays
    for (var i = 1; i <= TOTAL; i++) {
      spawnNumber(i);
    }
    // Randomize initial positions
    for (var j = 0; j < numbers.length; j++) {
      numbers[j].y = -NUM_R - Math.random() * H * 0.8;
      numbers[j].vy = DROP_SPEED_BASE + Math.random() * 120 + j * 5;
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    for (var ni = 0; ni < numbers.length; ni++) {
      var n = numbers[ni];
      if (n.tapped) continue;
      var dx = tx - n.x, dy = ty - n.y;
      if (Math.sqrt(dx * dx + dy * dy) < NUM_R + 16) {
        if (n.n === nextTarget) {
          n.tapped = true;
          n.tapTimer = 0.4;
          nextTarget++;
          score++;
          feedbackOk = true; feedback = 0.2;
          game.audio.play('se_success', 0.6);
          for (var pi = 0; pi < 8; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: n.x, y: n.y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.4 });
          }
          if (score >= TOTAL && !done) {
            done = true;
            setTimeout(function() { game.end.success(TOTAL * 40 + Math.ceil(timeLeft) * 30); }, 400);
          }
        } else {
          feedbackOk = false; feedback = 0.4;
          game.audio.play('se_failure', 0.5);
          // Penalty: reset to nearest past number if tapped wrong
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
        return;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedback > 0) feedback -= dt;

    for (var ni = 0; ni < numbers.length; ni++) {
      var n = numbers[ni];
      if (n.tapTimer > 0) {
        n.tapTimer -= dt;
        continue;
      }
      if (!n.tapped) {
        n.y += n.vy * dt;
        // Bounce off bottom
        if (n.y > H + NUM_R) {
          n.y = -NUM_R;
          n.x = NUM_R + 40 + Math.random() * (W - (NUM_R + 40) * 2);
        }
      }
    }

    for (var pi2 = 0; pi2 < particles.length; pi2++) {
      particles[pi2].x += particles[pi2].vx * dt; particles[pi2].y += particles[pi2].vy * dt;
      particles[pi2].vy += 300 * dt; particles[pi2].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Numbers
    for (var ni2 = 0; ni2 < numbers.length; ni2++) {
      var n2 = numbers[ni2];
      if (n2.tapTimer > 0) {
        // Flash on tap
        game.draw.circle(n2.x, n2.y, NUM_R + 20, C.nextHi, n2.tapTimer * 1.5);
        continue;
      }
      if (n2.tapped) continue;

      var isNext = (n2.n === nextTarget);
      var col = isNext ? C.next : C.num;
      var hiCol = isNext ? C.nextHi : C.numHi;

      // Glow for next target
      if (isNext) {
        game.draw.circle(n2.x, n2.y, NUM_R + 24, C.next, 0.2);
        game.draw.circle(n2.x, n2.y, NUM_R + 12, C.next, 0.15);
      }

      game.draw.circle(n2.x, n2.y, NUM_R + 6, hiCol, 0.2);
      game.draw.circle(n2.x, n2.y, NUM_R, col, 0.85);
      game.draw.text(n2.n + '', n2.x, n2.y, { size: 60, color: '#fff', bold: true });
    }

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 10 * part.life * 2, C.next, part.life);
    }

    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? C.next : C.wrong, feedback * 0.15);
    }

    // Next target indicator
    game.draw.text('次: ' + nextTarget, W / 2, H * 0.9, { size: 52, color: C.nextHi, bold: true });

    game.draw.text(score + ' / ' + TOTAL, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.num : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    initNumbers();
  });
})(game);

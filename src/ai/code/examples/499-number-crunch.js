// 499-number-crunch.js
// ナンバークランチ — 流れてくる数字を素早く大→小の順にタップ
// 操作: 画面の数字を大きい順にタップ（間違えると失敗カウント）
// 成功: 15セット完成  失敗: 5ミス or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#030a03',
    panel:  '#061206',
    num0:   '#22c55e',
    num1:   '#3b82f6',
    num2:   '#f59e0b',
    num3:   '#a855f7',
    num4:   '#ef4444',
    correct:'#86efac',
    wrong:  '#fca5a5',
    text:   '#f1f5f9',
    ui:     '#374151'
  };

  var NUM_COUNT = 5;
  var numCols = [C.num0, C.num1, C.num2, C.num3, C.num4];

  var numbers = [];   // {x, y, val, tapped, scale}
  var order = [];     // sorted desc for validation
  var tapIdx = 0;     // next expected index in order
  var sets = 0;
  var NEEDED = 15;
  var misses = 0;
  var MAX_MISS = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var resultText = '';
  var resultCol = C.correct;
  var resultLife = 0;
  var flashAnim = 0;

  function genNumbers() {
    numbers = [];
    var vals = [];
    // Generate NUM_COUNT distinct values 1-20
    while (vals.length < NUM_COUNT) {
      var v = 1 + Math.floor(Math.random() * 20);
      if (vals.indexOf(v) < 0) vals.push(v);
    }
    // Place randomly on screen (avoid overlaps)
    var positions = [];
    for (var i = 0; i < NUM_COUNT; i++) {
      var attempts = 0, px, py, ok;
      do {
        px = 140 + Math.random() * (W - 280);
        py = H * 0.22 + Math.random() * H * 0.55;
        ok = true;
        for (var j = 0; j < positions.length; j++) {
          var dx = px - positions[j].x, dy = py - positions[j].y;
          if (Math.sqrt(dx*dx+dy*dy) < 200) { ok = false; break; }
        }
        attempts++;
      } while (!ok && attempts < 30);
      positions.push({ x: px, y: py });
      numbers.push({ x: px, y: py, val: vals[i], tapped: false, scale: 1.0, col: numCols[i] });
    }
    // Build descending order
    var sorted = numbers.slice().sort(function(a, b) { return b.val - a.val; });
    order = sorted;
    tapIdx = 0;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Find tapped number
    var hit = -1;
    for (var i = 0; i < numbers.length; i++) {
      if (numbers[i].tapped) continue;
      var dx = tx - numbers[i].x, dy = ty - numbers[i].y;
      if (dx * dx + dy * dy <= 80 * 80) { hit = i; break; }
    }
    if (hit < 0) return;

    if (numbers[hit].val === order[tapIdx].val) {
      // Correct
      numbers[hit].tapped = true;
      numbers[hit].scale = 2.0;
      tapIdx++;
      game.audio.play('se_tap', 0.4);
      for (var pi = 0; pi < 6; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: numbers[hit].x, y: numbers[hit].y, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.4, col: numbers[hit].col });
      }
      if (tapIdx >= NUM_COUNT) {
        sets++;
        resultText = 'セット！';
        resultCol = C.correct;
        resultLife = 0.7;
        flashAnim = 0.4;
        game.audio.play('se_success', 0.8);
        if (sets >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(sets * 300 + Math.ceil(timeLeft) * 100); }, 700);
        } else {
          setTimeout(function() { if (!done) genNumbers(); }, 500);
        }
      }
    } else {
      misses++;
      resultText = 'ミス！';
      resultCol = C.wrong;
      resultLife = 0.7;
      flashAnim = 0.5;
      game.audio.play('se_failure', 0.5);
      numbers[hit].scale = 0.5;
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      } else {
        setTimeout(function() { if (!done) genNumbers(); }, 600);
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
    if (resultLife > 0) resultLife -= dt * 2;

    // Animate scales
    for (var i = 0; i < numbers.length; i++) {
      if (numbers[i].tapped) {
        numbers[i].scale = Math.max(0, numbers[i].scale - dt * 6);
      } else if (numbers[i].scale < 1.0) {
        numbers[i].scale = Math.min(1.0, numbers[i].scale + dt * 5);
      }
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Numbers
    for (var ni = 0; ni < numbers.length; ni++) {
      var n = numbers[ni];
      if (n.scale <= 0) continue;
      var isNext = (!n.tapped && tapIdx < order.length && n.val === order[tapIdx].val);
      var r = 72 * n.scale;
      game.draw.circle(n.x, n.y, r + (isNext ? 16 + Math.sin(elapsed * 6) * 8 : 0), n.col, isNext ? 0.3 : 0.15);
      game.draw.circle(n.x, n.y, r, n.col, n.tapped ? 0.3 : 0.85);
      if (!n.tapped) {
        game.draw.text(n.val + '', n.x, n.y + 24, { size: Math.floor(72 * n.scale), color: '#fff', bold: true });
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 14 * p.life, p.col, p.life * 0.8);
    }

    // Hint arrow: show next highest
    if (tapIdx < order.length && tapIdx > 0) {
      var nx2 = order[tapIdx].x;
      var ny2 = order[tapIdx].y;
      game.draw.circle(nx2, ny2, 80, C.correct, 0.08 + Math.sin(elapsed * 5) * 0.04);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, resultCol, flashAnim * 0.1);

    if (resultLife > 0) {
      game.draw.text(resultText, W / 2, H * 0.85, { size: 72, color: resultCol, bold: true });
    }

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 60 + mi * 120, H * 0.955, 22, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(sets + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.num0 : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    genNumbers();
  });
})(game);

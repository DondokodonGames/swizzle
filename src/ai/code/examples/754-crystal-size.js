// 754-crystal-size.js
// クリスタルサイズ — 成長するクリスタルが目標サイズに達した瞬間タップせよ
// 操作: タップ — クリスタルが目標リングに重なったとき成功
// 成功: 25回成功  失敗: 10回ミス or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#050210',
    crystal: '#a78bfa',
    crystHi: '#ede9fe',
    crystDk: '#4c1d95',
    ring:    '#f97316',
    ringHi:  '#fde68a',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#0a0518'
  };

  var CX = W / 2;
  var CY = H * 0.44;

  var crystR = 0;
  var GROW_SPEED = 120;
  var growing = true;
  var targetR = 0;
  var TOL = 18;

  var waitTimer = 0;
  var WAIT_DUR = 0.6;

  var score = 0;
  var NEEDED = 25;
  var errors = 0;
  var MAX_ERR = 10;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function nextCrystal() {
    crystR = 10;
    targetR = 70 + Math.random() * 120;
    GROW_SPEED = Math.min(260, 120 + score * 6);
    growing = true;
    waitTimer = 0;
  }

  game.onTap(function(tx, ty) {
    if (done || !growing || waitTimer > 0) return;
    var diff = Math.abs(crystR - targetR);
    if (diff < TOL) {
      score++;
      growing = false;
      flashCol = C.correct;
      flashAnim = 0.25;
      resultText = '±' + Math.round(diff) + 'px！ピッタリ！';
      resultTimer = 0.45;
      game.audio.play('se_success', 0.6);
      for (var p = 0; p < 8; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: CX, y: CY, vx: Math.cos(pa) * (crystR * 0.8 + 60), vy: Math.sin(pa) * (crystR * 0.8 + 60), life: 0.4, col: C.crystHi });
      }
      waitTimer = WAIT_DUR;
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 400 + Math.ceil(timeLeft) * 100); }, 700);
      }
    } else {
      errors++;
      growing = false;
      flashCol = C.wrong;
      flashAnim = 0.3;
      var over = crystR > targetR;
      resultText = over ? (Math.round(crystR - targetR) + 'px 大きすぎ') : (Math.round(targetR - crystR) + 'px 小さすぎ');
      resultTimer = 0.45;
      game.audio.play('se_failure', 0.28);
      waitTimer = WAIT_DUR;
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
      if (waitTimer <= 0) nextCrystal();
      return;
    }

    if (growing) {
      crystR += GROW_SPEED * dt;
      if (crystR > 220) {
        // Overshot — penalize
        growing = false;
        errors++;
        flashCol = C.wrong;
        flashAnim = 0.35;
        resultText = '大きすぎ！！';
        resultTimer = 0.5;
        game.audio.play('se_failure', 0.3);
        waitTimer = WAIT_DUR;
        if (errors >= MAX_ERR && !done) {
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
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    var inZone = Math.abs(crystR - targetR) < TOL;

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Target ring
    for (var ri = 0; ri < 36; ri++) {
      var ra = ri * Math.PI * 2 / 36;
      var rx = CX + Math.cos(ra) * targetR;
      var ry = CY + Math.sin(ra) * targetR;
      game.draw.circle(rx, ry, inZone ? 7 : 5, inZone ? C.ringHi : C.ring, inZone ? 0.9 : 0.6);
    }
    game.draw.text('目標', CX + targetR + 28, CY, { size: 28, color: C.ring, bold: true });

    // Tolerance band
    for (var ri2 = 0; ri2 < 24; ri2++) {
      var ra2 = ri2 * Math.PI * 2 / 24;
      game.draw.circle(CX + Math.cos(ra2) * (targetR - TOL), CY + Math.sin(ra2) * (targetR - TOL), 3, C.ring, 0.2);
      game.draw.circle(CX + Math.cos(ra2) * (targetR + TOL), CY + Math.sin(ra2) * (targetR + TOL), 3, C.ring, 0.2);
    }

    // Crystal (hexagonal shape via multiple rotated rects)
    if (crystR > 0) {
      var cr = crystR;
      game.draw.circle(CX + 4, CY + 4, cr, '#000', 0.25);
      game.draw.circle(CX, CY, cr, inZone ? C.ring : C.crystal, 0.75);
      game.draw.circle(CX, CY, cr * 0.7, inZone ? '#fde68a' : C.crystHi, 0.35);
      game.draw.circle(CX, CY, cr * 0.35, inZone ? '#fff' : C.crystHi, 0.55);
      // Crystal facets
      for (var fi = 0; fi < 6; fi++) {
        var fa = fi * Math.PI / 3 + elapsed * 0.3;
        var fx = CX + Math.cos(fa) * cr * 0.85;
        var fy = CY + Math.sin(fa) * cr * 0.85;
        game.draw.line(CX, CY, fx, fy, inZone ? C.ringHi : C.crystHi, inZone ? 3 : 1);
      }
    }

    // Size readout
    game.draw.text(Math.round(crystR) + ' / ' + Math.round(targetR), W / 2, H * 0.80, { size: 52, color: inZone ? C.ring : C.text, bold: inZone });

    if (inZone && growing) {
      game.draw.text('今タップ！', W / 2, H * 0.86, { size: 56, color: C.ringHi, bold: true });
    } else if (growing) {
      game.draw.text('目標リングに合わせろ', W / 2, H * 0.86, { size: 36, color: C.text + '44' });
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.91, { size: 44, color: flashCol, bold: true });
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
    nextCrystal();
  });
})(game);

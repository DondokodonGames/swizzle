// 544-domino-push.js
// ドミノプッシュ — タップで最初のドミノを倒し、連鎖が全部倒れるか見届ける
// 操作: タップで最初のドミノを押す（タイミングで連鎖数変化）
// 成功: 5ラウンド全完全連鎖  失敗: 3ラウンド失敗 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#1a0a02',
    floor:   '#2d1a08',
    domino:  '#e8d5a3',
    dominoS: '#c4b07a',
    dot:     '#1a1008',
    fallen:  '#8b6914',
    fallenS: '#6b4f0e',
    pushed:  '#ef4444',
    gap:     '#a855f7',
    hit:     '#22c55e',
    miss:    '#ef4444',
    text:    '#f1f5f9',
    ui:      '#374151'
  };

  var DOMINO_W = 36;
  var DOMINO_H = 90;
  var FLOOR_Y = H * 0.72;
  var DOMINO_COUNT = 16;
  var SPACING = 72;
  var START_X = W * 0.08;

  var dominos = [];
  var gaps = []; // gap indices (domino before a gap)
  var round = 0;
  var roundsWon = 0;
  var NEEDED = 5;
  var roundsFailed = 0;
  var MAX_FAIL = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var state = 'ready'; // 'ready' | 'falling' | 'done'
  var fallTimer = 0;
  var fallProgress = 0; // which domino is currently tipping
  var chainBroken = false;
  var particles = [];
  var roundResult = '';
  var roundResultTimer = 0;
  var tapReady = true;

  function initRound() {
    dominos = [];
    gaps = [];
    // Fewer gaps in early rounds
    var gapCount = Math.min(round, 3);
    var gapPositions = [];
    for (var gi = 0; gi < gapCount; gi++) {
      var pos;
      do { pos = 2 + Math.floor(Math.random() * (DOMINO_COUNT - 4)); }
      while (gapPositions.indexOf(pos) !== -1 || gapPositions.indexOf(pos - 1) !== -1);
      gapPositions.push(pos);
    }
    // Random gaps that can be "fixed" by tapping
    var fixable = [];
    for (var gi2 = 0; gi2 < gapPositions.length; gi2++) {
      fixable.push(Math.random() < 0.5); // 50% chance gap is actually fatal
    }

    for (var i = 0; i < DOMINO_COUNT; i++) {
      var isGap = gapPositions.indexOf(i) !== -1;
      dominos.push({
        x: START_X + i * SPACING,
        fallen: false,
        tipping: 0, // 0=upright, 1=fully fallen
        hasGap: isGap,
        gapBridged: false
      });
    }
    gaps = gapPositions;
    state = 'ready';
    fallProgress = 0;
    chainBroken = false;
    tapReady = true;
  }

  game.onTap(function(tx, ty) {
    if (done) return;

    if (state === 'ready' && tapReady) {
      // Start chain
      state = 'falling';
      fallTimer = 0;
      fallProgress = 0;
      game.audio.play('se_tap', 0.5);
      tapReady = false;
      return;
    }

    if (state === 'falling') {
      // Check if tapping on a gap domino to bridge it
      for (var i = 0; i < dominos.length; i++) {
        var d = dominos[i];
        if (!d.hasGap || d.gapBridged) continue;
        if (Math.abs(tx - d.x) < 60 && ty > FLOOR_Y - 200 && ty < FLOOR_Y + 80) {
          d.gapBridged = true;
          game.audio.play('se_tap', 0.4);
          break;
        }
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
    if (roundResultTimer > 0) roundResultTimer -= dt;

    if (state === 'falling') {
      fallTimer += dt;
      // Each domino takes ~0.2s to fall
      var targetProgress = Math.floor(fallTimer / 0.18);

      // Update domino tipping
      for (var i = 0; i < dominos.length; i++) {
        var d = dominos[i];
        if (i <= targetProgress && !chainBroken) {
          // Check if this domino has an unbridged gap BEFORE it
          var blocked = false;
          for (var gi = 0; gi < i; gi++) {
            if (dominos[gi].hasGap && !dominos[gi].gapBridged) {
              blocked = true;
              break;
            }
          }
          if (!blocked) {
            d.tipping = Math.min(1, (fallTimer - i * 0.18) / 0.18);
            if (d.tipping > 0.5 && !d.fallen && d.hasGap && !d.gapBridged) {
              // Gap breaks chain
              chainBroken = true;
            }
            if (d.tipping >= 1) { d.fallen = true; d.tipping = 1; }
          }
        }
      }

      // Check if done
      if (chainBroken || targetProgress >= DOMINO_COUNT) {
        var allFallen = dominos.every(function(d2) { return d2.fallen; });
        state = 'done';
        if (allFallen && !chainBroken) {
          roundsWon++;
          roundResult = 'PERFECT!';
          game.audio.play('se_success', 0.9);
          for (var pi = 0; pi < 20; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: W / 2, y: FLOOR_Y - 60, vx: Math.cos(ang) * 280, vy: Math.sin(ang) * 280 - 100, life: 0.5, col: C.hit });
          }
        } else {
          roundsFailed++;
          roundResult = 'CHAIN BREAK!';
          game.audio.play('se_failure', 0.5);
        }
        roundResultTimer = 1.5;

        if (roundsWon >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(roundsWon * 800 + Math.ceil(timeLeft) * 100); }, 800);
        } else if (roundsFailed >= MAX_FAIL && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        } else {
          setTimeout(function() { if (!done) { round++; initRound(); } }, 1600);
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 300 * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, FLOOR_Y, W, H - FLOOR_Y, C.floor, 0.9);
    game.draw.line(0, FLOOR_Y, W, FLOOR_Y, '#4a3010', 4);

    // Dominos
    for (var i2 = 0; i2 < dominos.length; i2++) {
      var d2 = dominos[i2];
      var angle = d2.tipping * Math.PI / 2;
      var dx = d2.x;
      var baseY = FLOOR_Y;

      // Draw gap marker
      if (d2.hasGap && !d2.gapBridged) {
        game.draw.rect(dx - 12, FLOOR_Y - 20, 24, 20, d2.gapBridged ? C.hit : C.gap, 0.6);
      }

      if (d2.fallen) {
        // Flat on ground
        game.draw.rect(dx - DOMINO_H / 2, baseY - DOMINO_W, DOMINO_H, DOMINO_W, d2.hasGap ? C.fallenS : C.fallen, 0.9);
      } else if (d2.tipping > 0) {
        // Tipping: draw rotated (approximate with line)
        var tipX = dx + Math.sin(angle) * DOMINO_H;
        var tipY = baseY - Math.cos(angle) * DOMINO_H;
        game.draw.line(dx, baseY, tipX, tipY, C.dominoS, DOMINO_W + 4);
        game.draw.line(dx, baseY, tipX, tipY, C.domino, DOMINO_W);
      } else {
        // Upright
        var col2 = d2.hasGap ? (d2.gapBridged ? C.hit : C.gap) : C.domino;
        var sh2 = d2.hasGap ? (d2.gapBridged ? '#118844' : C.fallenS) : C.dominoS;
        game.draw.rect(dx - DOMINO_W / 2 + 4, baseY - DOMINO_H + 4, DOMINO_W, DOMINO_H, sh2, 0.7);
        game.draw.rect(dx - DOMINO_W / 2, baseY - DOMINO_H, DOMINO_W, DOMINO_H, col2, 0.95);
        // Dots
        game.draw.circle(dx, baseY - DOMINO_H + 24, 6, C.dot, 0.7);
        game.draw.circle(dx, baseY - 24, 6, C.dot, 0.7);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    // Result
    if (roundResultTimer > 0) {
      var rc = chainBroken ? C.miss : C.hit;
      game.draw.text(roundResult, W / 2, FLOOR_Y - 200, { size: 64, color: rc, bold: true });
    }

    if (state === 'ready' && tapReady) {
      game.draw.text('タップで倒す！', W / 2, FLOOR_Y - 200, { size: 48, color: C.domino });
    }

    // Fail dots
    for (var fi = 0; fi < MAX_FAIL; fi++) {
      game.draw.circle(W / 2 - (MAX_FAIL - 1) * 52 + fi * 104, H * 0.955, 20, fi < roundsFailed ? C.miss : C.ui, 0.9);
    }

    game.draw.text(roundsWon + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.dominoS : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    initRound();
  });
})(game);

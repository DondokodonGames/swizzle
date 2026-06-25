// 291-disco-lights.js
// ディスコライツ — 点滅するライトのパターンを記憶してタップで再現する
// 操作: 光ったライトの順番を記憶してタップで再入力
// 成功: 10ラウンドクリア  失敗: 3回間違える or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#040106',
    floor:  '#0f0d1a',
    l1:     '#ef4444',
    l1Hi:   '#fca5a5',
    l2:     '#3b82f6',
    l2Hi:   '#93c5fd',
    l3:     '#22c55e',
    l3Hi:   '#86efac',
    l4:     '#f59e0b',
    l4Hi:   '#fde68a',
    off:    '#1e1b4b',
    offHi:  '#2d2966',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var LIGHTS = [
    { col: C.l1, hi: C.l1Hi },
    { col: C.l2, hi: C.l2Hi },
    { col: C.l3, hi: C.l3Hi },
    { col: C.l4, hi: C.l4Hi }
  ];

  var COLS = 2, ROWS = 2;
  var LW = 220, LH = 220;
  var GAP = 30;
  var OX = W / 2 - COLS * (LW + GAP) / 2 + GAP / 2;
  var OY = H * 0.3;

  var sequence = [];
  var playerSequence = [];
  var round = 0;
  var state = 'SHOW'; // SHOW, INPUT, RESULT
  var showIdx = 0;
  var showTimer = 0;
  var SHOW_INTERVAL = 0.6;
  var SHOW_ON = 0.4;
  var litIdx = -1;
  var completed = 0;
  var NEEDED = 10;
  var errors = 0;
  var MAX_ERR = 3;
  var done = false;
  var timeLeft = 50;
  var elapsed = 0;
  var feedback = '';
  var feedbackCol = '#fff';
  var feedbackTimer = 0;
  var particles = [];

  function lightPos(idx) {
    var c = idx % COLS, r = Math.floor(idx / COLS);
    return { x: OX + c * (LW + GAP) + LW / 2, y: OY + r * (LH + GAP) + LH / 2 };
  }

  function nextRound() {
    round++;
    sequence.push(Math.floor(Math.random() * 4));
    playerSequence = [];
    state = 'SHOW';
    showIdx = 0;
    showTimer = SHOW_INTERVAL * 0.5;
    litIdx = -1;
    feedback = 'ラウンド ' + round + ' を覚えよ！';
    feedbackCol = C.l2Hi;
    feedbackTimer = 0.7;
  }

  game.onTap(function(tx, ty) {
    if (done || state !== 'INPUT') return;

    for (var li = 0; li < 4; li++) {
      var pos = lightPos(li);
      var dx = tx - pos.x, dy = ty - pos.y;
      if (dx > -LW / 2 && dx < LW / 2 && dy > -LH / 2 && dy < LH / 2) {
        litIdx = li;
        showTimer = 0.25; // flash on tap
        playerSequence.push(li);
        game.audio.play('se_tap', 0.3);

        var expected = sequence[playerSequence.length - 1];
        if (li !== expected) {
          // Wrong
          errors++;
          playerSequence = [];
          feedback = '違う！ (' + errors + '/' + MAX_ERR + ')';
          feedbackCol = C.l1Hi;
          feedbackTimer = 0.8;
          game.audio.play('se_failure', 0.5);
          // Show correct sequence again
          setTimeout(function() {
            if (!done) { litIdx = -1; state = 'SHOW'; showIdx = 0; showTimer = 0.3; playerSequence = []; }
          }, 600);
          if (errors >= MAX_ERR && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
          }
          return;
        }

        if (playerSequence.length === sequence.length) {
          // Correct!
          completed++;
          feedback = '正解！ ' + completed + '/' + NEEDED;
          feedbackCol = C.l3Hi;
          feedbackTimer = 0.7;
          game.audio.play('se_success', 0.6);
          var pos2 = lightPos(li);
          for (var pi = 0; pi < 6; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: pos2.x, y: pos2.y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.5, col: LIGHTS[li].hi });
          }
          state = 'RESULT';
          litIdx = -1;
          if (completed >= NEEDED && !done) {
            done = true;
            setTimeout(function() { game.end.success(completed * 200 + Math.ceil(timeLeft) * 80); }, 600);
            return;
          }
          setTimeout(function() { if (!done) nextRound(); }, 900);
        }
        return;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (feedbackTimer > 0) feedbackTimer -= dt;
    if (showTimer > 0) showTimer -= dt;

    if (state === 'SHOW') {
      if (showTimer <= 0) {
        if (litIdx === -1 && showIdx < sequence.length) {
          // Light up
          litIdx = sequence[showIdx];
          showTimer = SHOW_ON;
          game.audio.play('se_tap', 0.15);
        } else if (litIdx !== -1) {
          // Turn off
          litIdx = -1;
          showIdx++;
          showTimer = SHOW_INTERVAL - SHOW_ON;
          if (showIdx >= sequence.length) {
            state = 'INPUT';
            feedback = 'タップで入力！';
            feedbackCol = C.l4Hi;
            feedbackTimer = 0.8;
          }
        }
      }
    } else if (state === 'INPUT' && showTimer > 0 && litIdx !== -1) {
      // Flash on tap
      if (showTimer <= 0) litIdx = -1;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, H * 0.75, W, H * 0.25, C.floor, 0.6);

    // Lights
    for (var li2 = 0; li2 < 4; li2++) {
      var pos3 = lightPos(li2);
      var lx = pos3.x - LW / 2, ly = pos3.y - LH / 2;
      var isLit = litIdx === li2;
      var linfo = LIGHTS[li2];
      game.draw.rect(lx, ly, LW, LH, isLit ? linfo.col : C.off, isLit ? 0.95 : 0.8);
      game.draw.rect(lx, ly, LW, 12, isLit ? linfo.hi : C.offHi, 0.4);
      if (isLit) {
        game.draw.rect(lx, ly, LW, LH, linfo.hi, 0.2);
        game.draw.circle(pos3.x, pos3.y, LW * 0.4, linfo.hi, 0.15);
      }
      // Player input indicators
      var pCount = 0;
      for (var pi2 = 0; pi2 < playerSequence.length; pi2++) {
        if (playerSequence[pi2] === li2) pCount++;
      }
      if (pCount > 0) {
        game.draw.text(pCount + '', pos3.x, pos3.y + 12, { size: 56, color: isLit ? '#fff' : C.offHi, bold: true });
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life * 2, p.col, p.life * 0.8);
    }

    var stateMsg = state === 'SHOW' ? '覚えてね...' : (state === 'INPUT' ? 'タップ！' : '');
    if (stateMsg) game.draw.text(stateMsg, W / 2, H * 0.22, { size: 44, color: state === 'INPUT' ? C.l4Hi : C.ui, bold: state === 'INPUT' });

    if (feedbackTimer > 0) {
      game.draw.text(feedback, W / 2, H * 0.87, { size: 46, color: feedbackCol, bold: true });
    }

    // Error dots
    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 28 + ei * 56, H * 0.93, 16, ei < errors ? C.l1 : '#0a0810');
    }

    game.draw.text(completed + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.l2 : C.l1);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    nextRound();
  });
})(game);

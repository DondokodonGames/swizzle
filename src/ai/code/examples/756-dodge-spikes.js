// 756-dodge-spikes.js
// スパイク回避 — 上下から飛び出すスパイクの隙間をタップで乗り越えろ
// 操作: タップでジャンプ（スパイクのない隙間を通れ）
// 成功: 30回通過  失敗: 8回刺さる or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#080410',
    rail:    '#1e1b4b',
    railHi:  '#3730a3',
    spike:   '#7c3aed',
    spikeHi: '#a78bfa',
    player:  '#f97316',
    playerHi:'#fde68a',
    gap:     '#22c55e',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#0c0818'
  };

  var RAIL_Y = H / 2;
  var RAIL_H = 16;
  var GAP_H  = 200; // height of safe gap between top/bottom spikes

  var playerX = W * 0.22;
  var playerY = RAIL_Y;
  var playerVy = 0;
  var onRail = true;
  var GRAVITY = 1600;
  var JUMP_V = -820;

  var gates = [];
  var gateSpeedBase = 420;
  var gateTimer = 1.0;

  var score = 0;
  var NEEDED = 30;
  var hits = 0;
  var MAX_HITS = 8;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var legPhase = 0;

  function spawnGate() {
    // Random gap position
    var gapY = H * 0.22 + Math.random() * (H * 0.55);
    gates.push({ x: W + 80, gapY: gapY, scored: false, hit: false });
  }

  game.onTap(function(tx, ty) {
    if (done || !onRail) return;
    playerVy = JUMP_V;
    onRail = false;
    game.audio.play('se_tap', 0.1);
    for (var p = 0; p < 3; p++) {
      var pa = Math.PI + (Math.random() - 0.5) * Math.PI * 0.5;
      particles.push({ x: playerX, y: playerY, vx: Math.cos(pa) * 100, vy: Math.sin(pa) * 140, life: 0.28, col: C.player });
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

    // Player physics
    playerVy += GRAVITY * dt;
    playerY += playerVy * dt;
    if (playerY >= RAIL_Y) {
      playerY = RAIL_Y;
      playerVy = 0;
      onRail = true;
    }
    if (playerY < 0) { playerY = 0; playerVy = 0; }

    if (onRail) legPhase += dt * 7;

    // Gate spawning
    gateTimer -= dt;
    var rate = Math.max(0.6, 1.0 - score * 0.01);
    if (gateTimer <= 0 && !done) {
      gateTimer = rate;
      spawnGate();
    }

    var gspd = Math.min(800, gateSpeedBase + score * 8);

    for (var gi = gates.length - 1; gi >= 0; gi--) {
      var g = gates[gi];
      g.x -= gspd * dt;

      // Check pass
      if (!g.scored && !g.hit && g.x + 30 < playerX - 28) {
        g.scored = true;
        score++;
        flashCol = C.correct;
        flashAnim = 0.18;
        resultText = '通過！';
        resultTimer = 0.3;
        game.audio.play('se_tap', 0.07);
        if (score >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(score * 280 + Math.ceil(timeLeft) * 100); }, 700);
        }
      }

      // Collision check
      if (!g.hit && !g.scored && g.x - 28 < playerX + 28 && g.x + 28 > playerX - 28) {
        var inGap = playerY > g.gapY - GAP_H / 2 - 24 && playerY < g.gapY + GAP_H / 2 + 24;
        if (!inGap) {
          g.hit = true;
          g.scored = true;
          hits++;
          flashCol = C.wrong;
          flashAnim = 0.45;
          resultText = 'スパイク！！';
          resultTimer = 0.5;
          playerVy = JUMP_V * 0.6;
          onRail = false;
          game.audio.play('se_failure', 0.4);
          for (var pe = 0; pe < 6; pe++) {
            var pea = Math.random() * Math.PI * 2;
            particles.push({ x: playerX, y: playerY, vx: Math.cos(pea) * 200, vy: Math.sin(pea) * 200, life: 0.4, col: C.wrong });
          }
          if (hits >= MAX_HITS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
          }
        }
      }

      if (g.x < -120) gates.splice(gi, 1);
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.6;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Rail
    game.draw.rect(0, RAIL_Y, W, RAIL_H, C.rail, 0.9);
    game.draw.rect(0, RAIL_Y, W, 4, C.railHi, 0.4);

    // Gates
    for (var gi2 = 0; gi2 < gates.length; gi2++) {
      var g2 = gates[gi2];
      var gapTop = g2.gapY - GAP_H / 2;
      var gapBot = g2.gapY + GAP_H / 2;
      // Top spike wall
      if (gapTop > 0) {
        game.draw.rect(g2.x - 28, 0, 56, gapTop, C.spike, 0.9);
        // Spike teeth on bottom edge
        for (var si = 0; si < 3; si++) {
          var sx = g2.x - 20 + si * 20;
          game.draw.rect(sx, gapTop - 24, 12, 26, C.spikeHi, 0.7);
        }
      }
      // Bottom spike wall
      if (gapBot < H) {
        game.draw.rect(g2.x - 28, gapBot, 56, H - gapBot, C.spike, 0.9);
        for (var si2 = 0; si2 < 3; si2++) {
          var sx2 = g2.x - 20 + si2 * 20;
          game.draw.rect(sx2, gapBot, 12, 26, C.spikeHi, 0.7);
        }
      }
      // Gap highlight
      game.draw.rect(g2.x - 28, gapTop, 56, GAP_H, C.gap, 0.06);
    }

    // Player
    var shake = flashAnim > 0.3 ? Math.sin(elapsed * 30) * 8 : 0;
    var px = playerX + shake;
    game.draw.circle(px + 3, playerY + 3, 28, '#000', 0.3);
    game.draw.circle(px, playerY, 28, C.player, 0.9);
    game.draw.circle(px - 8, playerY - 8, 10, C.playerHi, 0.45);
    if (onRail) {
      game.draw.line(px - 12, playerY + 28, px - 12 + Math.sin(legPhase) * 14, playerY + 52, C.player, 8);
      game.draw.line(px + 12, playerY + 28, px + 12 - Math.sin(legPhase) * 14, playerY + 52, C.player, 8);
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life);
    }

    if (onRail && !done) {
      game.draw.text('タップでジャンプ', W / 2, H * 0.88, { size: 38, color: C.text + '44' });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.18, { size: 52, color: flashCol, bold: true });
    }

    for (var hi = 0; hi < MAX_HITS; hi++) {
      game.draw.circle(W / 2 - (MAX_HITS - 1) * 56 + hi * 112, H * 0.955, 22, hi < hits ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    spawnGate();
  });
})(game);

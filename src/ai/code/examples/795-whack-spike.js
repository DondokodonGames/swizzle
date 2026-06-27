// 795-whack-spike.js
// ワックスパイク — 地面から飛び出すスパイクを叩き落とせ
// 操作: タップ — 飛び出したスパイクを素早く叩く
// 成功: 50本叩く  失敗: 12本逃す or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#040608',
    ground:   '#0f172a',
    groundHi: '#1e293b',
    spike:    '#f97316',
    spikeHi:  '#fed7aa',
    spikeGlow:'#7c2d12',
    crater:   '#0f172a',
    correct:  '#22c55e',
    wrong:    '#ef4444',
    text:     '#f1f5f9',
    ui:       '#04060a'
  };

  var GROUND_Y = H * 0.78;
  var HOLE_COUNT = 6;
  var holes = [];
  var spikes = []; // { holeIdx, phase: 'rising'|'peak'|'falling', t, alive }

  var spawnTimer = 0;
  var SPAWN_RATE = 0.8;
  var MAX_ACTIVE = 3;

  var score = 0;
  var NEEDED = 50;
  var escaped = 0;
  var MAX_ESCAPE = 12;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  // Hole positions
  var cols = 3;
  var rows = 2;
  for (var hi2 = 0; hi2 < HOLE_COUNT; hi2++) {
    var col = hi2 % cols;
    var row = Math.floor(hi2 / cols);
    holes.push({
      x: W * 0.18 + col * W * 0.32,
      y: GROUND_Y - 20 + row * 80,
      active: false
    });
  }

  function spawnSpike() {
    // Find idle holes
    var idle = [];
    for (var i = 0; i < HOLE_COUNT; i++) {
      if (!holes[i].active) idle.push(i);
    }
    if (idle.length === 0) return;
    var idx = idle[Math.floor(Math.random() * idle.length)];
    holes[idx].active = true;
    var RISE_TIME = Math.max(0.25, 0.45 - score * 0.004);
    var PEAK_TIME = Math.max(0.3, 0.8 - score * 0.008);
    spikes.push({ holeIdx: idx, phase: 'rising', t: 0, alive: true, RISE_TIME: RISE_TIME, PEAK_TIME: PEAK_TIME, height: 0 });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Find tapped spike
    var hit = false;
    for (var i = spikes.length - 1; i >= 0; i--) {
      var sp = spikes[i];
      if (!sp.alive) continue;
      var h = holes[sp.holeIdx];
      var tipY = h.y - sp.height;
      var dx = tx - h.x;
      var dy = ty - tipY;
      if (Math.sqrt(dx * dx + dy * dy) < 60 || (Math.abs(dx) < 50 && ty > tipY - 10 && ty < h.y + 20)) {
        // Hit!
        sp.alive = false;
        holes[sp.holeIdx].active = false;
        score++;
        flashCol = C.correct;
        flashAnim = 0.15;
        resultText = 'ヒット！';
        resultTimer = 0.3;
        game.audio.play('se_tap', 0.09);
        for (var p = 0; p < 5; p++) {
          var pa = Math.random() * Math.PI * 2;
          particles.push({ x: h.x, y: tipY, vx: Math.cos(pa) * 140, vy: Math.sin(pa) * 140 - 60, life: 0.38, col: C.spikeHi });
        }
        if (score >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(score * 280 + Math.ceil(timeLeft) * 120); }, 700);
          return;
        }
        hit = true;
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

    // Spawn
    spawnTimer -= dt;
    SPAWN_RATE = Math.max(0.4, 0.8 - score * 0.006);
    var activeCount = 0;
    for (var i = 0; i < spikes.length; i++) if (spikes[i].alive) activeCount++;
    if (spawnTimer <= 0 && activeCount < MAX_ACTIVE && !done) {
      spawnTimer = SPAWN_RATE;
      spawnSpike();
    }

    // Update spikes
    for (var si = spikes.length - 1; si >= 0; si--) {
      var sp = spikes[si];
      if (!sp.alive) {
        if (sp.height > 0) sp.height = Math.max(0, sp.height - 400 * dt);
        else { spikes.splice(si, 1); continue; }
      }

      sp.t += dt;
      if (sp.phase === 'rising') {
        sp.height = (sp.t / sp.RISE_TIME) * 140;
        if (sp.t >= sp.RISE_TIME) {
          sp.phase = 'peak';
          sp.t = 0;
          sp.height = 140;
        }
      } else if (sp.phase === 'peak') {
        if (sp.t >= sp.PEAK_TIME) {
          sp.phase = 'falling';
          sp.t = 0;
        }
      } else if (sp.phase === 'falling') {
        sp.height = 140 * (1 - sp.t / sp.RISE_TIME);
        if (sp.t >= sp.RISE_TIME) {
          // Escaped
          sp.alive = false;
          holes[sp.holeIdx].active = false;
          escaped++;
          flashCol = C.wrong;
          flashAnim = 0.28;
          resultText = '逃げた！';
          resultTimer = 0.38;
          game.audio.play('se_failure', 0.28);
          if (escaped >= MAX_ESCAPE && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
          }
        }
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 300 * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Ground
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, C.ground, 1.0);
    game.draw.rect(0, GROUND_Y, W, 10, C.groundHi, 0.6);

    // Holes
    for (var hi = 0; hi < HOLE_COUNT; hi++) {
      var hole = holes[hi];
      game.draw.circle(hole.x, hole.y, 32, '#050c18', 0.95);
      game.draw.circle(hole.x, hole.y, 22, '#020409', 0.95);
    }

    // Spikes
    for (var si2 = 0; si2 < spikes.length; si2++) {
      var sp2 = spikes[si2];
      if (sp2.height <= 0) continue;
      var h2 = holes[sp2.holeIdx];
      var tipY2 = h2.y - sp2.height;
      var spikeH = sp2.height;
      var spikeW = 24;
      var col2 = sp2.alive ? C.spike : '#555';
      var alpha = sp2.alive ? 0.9 : 0.4;

      // Glow behind
      if (sp2.alive) {
        game.draw.circle(h2.x, tipY2 + spikeH * 0.3, spikeW + 20, C.spikeGlow, 0.2);
      }
      // Spike body (taper: wide at base, tip at top)
      var steps = 8;
      for (var st = 0; st < steps; st++) {
        var fy = tipY2 + (st / steps) * spikeH;
        var fw = spikeW * (st / steps) * (0.5 + (steps - st) / steps * 0.5);
        game.draw.circle(h2.x, fy, fw * 0.8, col2, alpha);
      }
      // Tip glow
      if (sp2.alive) {
        game.draw.circle(h2.x, tipY2, 12, C.spikeHi, 0.8);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (!done) {
      game.draw.text('スパイクをタップ！', W / 2, H * 0.88, { size: 38, color: C.text + '44' });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.19, { size: 52, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ESCAPE; ei++) {
      game.draw.circle(W / 2 - (MAX_ESCAPE - 1) * 40 + ei * 80, H * 0.955, 16, ei < escaped ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    spawnSpike();
  });
})(game);

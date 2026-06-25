// 210-beat-guard.js
// ビートガード — ビートに合わせて4方向からくる音符を矢印でさばく音楽格ゲー感覚
// 操作: スワイプで音符を弾き返す
// 成功: 30回正確に弾く  失敗: 8回ミス or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#060408',
    note:    '#a855f7',
    noteHi:  '#d8b4fe',
    hit:     '#22c55e',
    hitHi:   '#86efac',
    miss:    '#ef4444',
    center:  '#1e1040',
    ui:      '#334155'
  };

  var CX = W / 2;
  var CY = H * 0.48;
  var GUARD_R = 100;
  var NOTE_R = 36;
  var HIT_ZONE = 70;

  var BPM = 100;
  var BEAT = 60 / BPM;

  var notes = [];
  var beatTimer = 0;
  var beatIdx = 0;
  // Pattern: direction notes come FROM (so player swipes that direction to block)
  var pattern = ['up', 'right', 'down', 'left', 'up', 'left', 'right', 'down'];

  var score = 0;
  var needed = 30;
  var misses = 0;
  var maxMisses = 8;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var feedback = 0;
  var feedbackOk = false;
  var particles = [];

  function spawnNote() {
    var dir = pattern[beatIdx % pattern.length];
    beatIdx++;
    var dist = W * 0.65;
    var startX, startY, targetX, targetY;
    if (dir === 'up') { startX = CX; startY = CY - dist; }
    else if (dir === 'down') { startX = CX; startY = CY + dist; }
    else if (dir === 'left') { startX = CX - dist; startY = CY; }
    else { startX = CX + dist; startY = CY; }
    var travelTime = 0.7;
    notes.push({ x: startX, y: startY, dir: dir, life: travelTime, totalLife: travelTime, hit: false });
  }

  game.onSwipe(function(dir) {
    if (done) return;
    // Find closest note in the matching direction
    var bestNote = null;
    var bestDist = 9999;
    for (var ni = 0; ni < notes.length; ni++) {
      var n = notes[ni];
      if (n.hit) continue;
      var dx = n.x - CX, dy = n.y - CY;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < GUARD_R + HIT_ZONE && n.dir === dir && d < bestDist) {
        bestNote = n; bestDist = d;
      }
    }
    if (bestNote) {
      bestNote.hit = true;
      score++;
      feedbackOk = true; feedback = 0.3;
      game.audio.play('se_success', 0.7);
      for (var pi = 0; pi < 8; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: bestNote.x, y: bestNote.y, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.4 });
      }
      if (score >= needed && !done) {
        done = true;
        setTimeout(function() { game.end.success(score * 60 + Math.ceil(timeLeft) * 30); }, 400);
      }
    } else {
      misses++;
      feedbackOk = false; feedback = 0.3;
      game.audio.play('se_failure', 0.4);
      if (misses >= maxMisses && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedback > 0) feedback -= dt;

    // Spawn notes
    beatTimer -= dt;
    if (beatTimer <= 0) {
      beatTimer = BEAT * (Math.random() < 0.3 ? 2 : 1);
      spawnNote();
    }

    // Move notes toward center
    for (var ni2 = notes.length - 1; ni2 >= 0; ni2--) {
      var n2 = notes[ni2];
      n2.life -= dt;
      var prog = 1 - n2.life / n2.totalLife;
      var dx = CX - n2.x, dy = CY - n2.y;
      var d2 = Math.sqrt(dx * dx + dy * dy);
      if (d2 > 0) {
        var speed = d2 / n2.life;
        n2.x += (dx / d2) * speed * dt;
        n2.y += (dy / d2) * speed * dt;
      }
      if (n2.hit && prog > 0.9) { notes.splice(ni2, 1); continue; }
      if (n2.life <= 0) {
        if (!n2.hit) {
          misses++;
          game.audio.play('se_failure', 0.3);
          if (misses >= maxMisses && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 400);
          }
        }
        notes.splice(ni2, 1);
      }
    }

    for (var pi2 = particles.length - 1; pi2 >= 0; pi2--) {
      particles[pi2].x += particles[pi2].vx * dt;
      particles[pi2].y += particles[pi2].vy * dt;
      particles[pi2].vy += 200 * dt;
      particles[pi2].life -= dt;
      if (particles[pi2].life <= 0) particles.splice(pi2, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Direction lanes
    game.draw.line(CX, 0, CX, CY - GUARD_R, C.center, 40);
    game.draw.line(CX, H, CX, CY + GUARD_R, C.center, 40);
    game.draw.line(0, CY, CX - GUARD_R, CY, C.center, 40);
    game.draw.line(W, CY, CX + GUARD_R, CY, C.center, 40);

    // Center guard
    game.draw.circle(CX, CY, GUARD_R + 20, C.noteHi, 0.1);
    game.draw.circle(CX, CY, GUARD_R, C.center, 0.9);
    // Arrow indicators
    game.draw.text('↑', CX, CY - GUARD_R * 0.55, { size: 52, color: '#d8b4fe', bold: true });
    game.draw.text('↓', CX, CY + GUARD_R * 0.7, { size: 52, color: '#d8b4fe', bold: true });
    game.draw.text('←', CX - GUARD_R * 0.6, CY, { size: 52, color: '#d8b4fe', bold: true });
    game.draw.text('→', CX + GUARD_R * 0.4, CY, { size: 52, color: '#d8b4fe', bold: true });

    // Notes
    for (var ni3 = 0; ni3 < notes.length; ni3++) {
      var n3 = notes[ni3];
      var prog2 = 1 - n3.life / n3.totalLife;
      var col2 = n3.hit ? C.hit : C.note;
      var hi2 = n3.hit ? C.hitHi : C.noteHi;
      var alpha = n3.hit ? Math.max(0, n3.life * 3) : 0.9;
      game.draw.circle(n3.x, n3.y, NOTE_R + 10, hi2, alpha * 0.2);
      game.draw.circle(n3.x, n3.y, NOTE_R, col2, alpha);
      var arrowMap = { up: '↑', down: '↓', left: '←', right: '→' };
      if (!n3.hit) game.draw.text(arrowMap[n3.dir], n3.x, n3.y, { size: 44, color: '#fff', bold: true });
    }

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 10 * part.life * 2, C.hit, part.life);
    }

    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? C.hit : C.miss, feedback * 0.1);
    }

    game.draw.text(score + ' / ' + needed, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });
    for (var mi = 0; mi < maxMisses; mi++) {
      game.draw.circle(W / 2 - (maxMisses - 1) * 28 + mi * 56, 218, 18, mi < misses ? C.miss : '#0a0a14');
    }

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.note : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    beatTimer = 0.8;
  });
})(game);

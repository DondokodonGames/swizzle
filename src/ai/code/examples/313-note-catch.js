// 313-note-catch.js
// 音符キャッチ — 流れてくる音符を正確なタイミングでタップして曲を奏でる
// 操作: 音符が判定ラインに来たらタップ
// 成功: 20音符キャッチ  失敗: 8音符ミス or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020810',
    staff:  '#0d1929',
    line:   '#1e3a5f',
    note:   '#f59e0b',
    noteHi: '#fde68a',
    noteSh: '#d97706',
    judgeOk:'#22c55e',
    judgeGt:'#86efac',
    judgeMs:'#ef4444',
    judgeLn:'#3b82f6',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var JUDGE_Y = H * 0.72;
  var NOTE_LANES = 4;
  var LANE_W = W / NOTE_LANES;
  var LANE_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'];

  var notes = []; // {lane, y, vy, hit}
  var caught = 0;
  var NEEDED = 20;
  var missed = 0;
  var MAX_MISS = 8;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var spawnTimer = 0;
  var judgments = []; // {x, y, text, col, life}
  var particles = [];
  var combo = 0;
  var beatFlash = 0;
  var bgPulse = 0;

  function spawnNote() {
    var lane = Math.floor(Math.random() * NOTE_LANES);
    notes.push({ lane: lane, y: -40, vy: 400 + caught * 3, hit: false, r: 30 });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var lane = Math.floor(tx / LANE_W);
    if (lane < 0 || lane >= NOTE_LANES) return;

    // Find closest note in this lane near judge line
    var bestDist = 999;
    var bestIdx = -1;
    for (var ni = 0; ni < notes.length; ni++) {
      var n = notes[ni];
      if (n.hit) continue;
      if (n.lane !== lane) continue;
      var dist = Math.abs(n.y - JUDGE_Y);
      if (dist < bestDist) { bestDist = dist; bestIdx = ni; }
    }

    var lx = LANE_W * (lane + 0.5);
    if (bestIdx !== -1 && bestDist < 100) {
      notes[bestIdx].hit = true;
      caught++;
      combo++;
      var judgeTxt = bestDist < 25 ? 'PERFECT!' : (bestDist < 55 ? 'GREAT!' : 'GOOD');
      var judgeCol = bestDist < 25 ? C.judgeGt : (bestDist < 55 ? C.judgeOk : C.judgeLn);
      judgments.push({ x: lx, y: JUDGE_Y - 60, text: judgeTxt, col: judgeCol, life: 0.7 });
      beatFlash = 0.15;
      game.audio.play('se_tap', 0.35 + combo * 0.01);
      for (var pi = 0; pi < 5; pi++) {
        var ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
        particles.push({ x: lx, y: JUDGE_Y, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 200, life: 0.5, col: LANE_COLORS[lane] });
      }
      if (caught >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(caught * 100 + combo * 50 + Math.ceil(timeLeft) * 80); }, 400);
      }
    } else {
      // Miss tap
      judgments.push({ x: lx, y: JUDGE_Y - 40, text: 'MISS', col: C.judgeMs, life: 0.5 });
      combo = 0;
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    bgPulse += dt * 2;
    if (beatFlash > 0) beatFlash -= dt;

    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      var count = Math.random() < 0.25 ? 2 : 1;
      for (var c = 0; c < count; c++) spawnNote();
      spawnTimer = 0.55 - Math.min(0.3, caught * 0.008);
    }

    for (var ni = notes.length - 1; ni >= 0; ni--) {
      var n = notes[ni];
      n.y += n.vy * dt;
      if (n.y > JUDGE_Y + 80 && !n.hit) {
        missed++;
        combo = 0;
        game.audio.play('se_failure', 0.3);
        notes.splice(ni, 1);
        if (missed >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
        continue;
      }
      if (n.y > H + 60) notes.splice(ni, 1);
    }

    for (var ji = judgments.length - 1; ji >= 0; ji--) {
      judgments[ji].y -= 80 * dt;
      judgments[ji].life -= dt * 1.5;
      if (judgments[ji].life <= 0) judgments.splice(ji, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Staff background
    game.draw.rect(0, H * 0.1, W, H * 0.8, C.staff, 0.5);

    // Lane backgrounds
    for (var l = 0; l < NOTE_LANES; l++) {
      var lx2 = LANE_W * l;
      game.draw.rect(lx2 + 4, 0, LANE_W - 8, H, LANE_COLORS[l], 0.05);
      // Lane dividers
      if (l > 0) game.draw.line(lx2, H * 0.1, lx2, H * 0.9, C.line, 2);
    }

    // Judge line
    var jPulse = beatFlash > 0 ? 0.8 : 0.3;
    game.draw.rect(0, JUDGE_Y - 8, W, 16, C.judgeLn, jPulse);
    if (beatFlash > 0) game.draw.rect(0, JUDGE_Y - 30, W, 60, '#fff', beatFlash * 0.2);
    // Lane hit zones
    for (var l2 = 0; l2 < NOTE_LANES; l2++) {
      game.draw.circle(LANE_W * (l2 + 0.5), JUDGE_Y, 44, LANE_COLORS[l2], 0.3);
      game.draw.circle(LANE_W * (l2 + 0.5), JUDGE_Y, 36, LANE_COLORS[l2], 0.15);
    }

    // Notes
    for (var ni2 = 0; ni2 < notes.length; ni2++) {
      var n2 = notes[ni2];
      if (n2.hit) continue;
      var lx3 = LANE_W * (n2.lane + 0.5);
      var noteCol = LANE_COLORS[n2.lane];
      game.draw.circle(lx3, n2.y, n2.r + 8, noteCol, 0.2);
      game.draw.circle(lx3, n2.y, n2.r, noteCol, 0.9);
      game.draw.circle(lx3 - n2.r * 0.3, n2.y - n2.r * 0.3, n2.r * 0.2, '#fff', 0.5);
      // Note stem
      game.draw.line(lx3 + n2.r, n2.y, lx3 + n2.r, n2.y - 60, noteCol, 5);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    // Judgments
    for (var ji2 = 0; ji2 < judgments.length; ji2++) {
      var j = judgments[ji2];
      game.draw.text(j.text, j.x, j.y, { size: 40, color: j.col, bold: true });
    }

    // Combo
    if (combo > 1) {
      game.draw.text(combo + ' COMBO', W / 2, H * 0.87, { size: 44, color: C.noteHi, bold: true });
    }

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 18 + mi * 36, H * 0.94, 12, mi < missed ? C.judgeMs : '#020810');
    }

    game.draw.text(caught + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.note : C.judgeMs);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    spawnTimer = 0.5;
  });
})(game);

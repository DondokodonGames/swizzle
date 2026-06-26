// 537-rhythm-fall.js
// リズムフォール — 4レーンを落ちてくるノートをタップのみで撃退
// 操作: 画面の左1/4, 左中, 右中, 右1/4をタップして対応レーンのノートを叩く
// 成功: 40ヒット  失敗: 15ミス or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#03000a',
    lane0:    '#ef4444',
    lane1:    '#3b82f6',
    lane2:    '#22c55e',
    lane3:    '#f59e0b',
    note:     '#f1f5f9',
    hit:      '#ffffff',
    perfect:  '#fde68a',
    good:     '#22c55e',
    miss:     '#ef4444',
    text:     '#f1f5f9',
    ui:       '#374151',
    judge:    '#1a1a2e'
  };

  var LANE_COLORS = [C.lane0, C.lane1, C.lane2, C.lane3];
  var LANE_COUNT = 4;
  var LANE_W = W / LANE_COUNT;
  var HIT_Y = H * 0.82;
  var NOTE_R = 52;
  var NOTE_SPEED = 550;
  var JUDGE_RANGE = 100;

  var notes = [];
  var hits = 0;
  var NEEDED = 40;
  var misses = 0;
  var MAX_MISS = 15;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var hitAnims = [0, 0, 0, 0]; // per lane
  var lastResult = '';
  var lastResultTimer = 0;
  var lastResultCol = C.good;
  var nextNote = 0.4;
  var laneFlash = [0, 0, 0, 0];

  function spawnNote() {
    var lane = Math.floor(Math.random() * LANE_COUNT);
    notes.push({ lane: lane, y: -NOTE_R, hit: false });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var lane = Math.floor(tx / LANE_W);
    if (lane < 0 || lane >= LANE_COUNT) return;

    laneFlash[lane] = 0.3;

    // Find nearest note in this lane within hit zone
    var bestNote = null, bestDist = Infinity;
    for (var ni = 0; ni < notes.length; ni++) {
      if (notes[ni].lane !== lane || notes[ni].hit) continue;
      var dist = Math.abs(notes[ni].y - HIT_Y);
      if (dist < JUDGE_RANGE && dist < bestDist) {
        bestDist = dist;
        bestNote = notes[ni];
      }
    }

    if (bestNote) {
      bestNote.hit = true;
      hits++;
      hitAnims[lane] = 0.4;

      if (bestDist < JUDGE_RANGE * 0.3) {
        lastResult = 'PERFECT!';
        lastResultCol = C.perfect;
        game.audio.play('se_success', 0.8);
      } else {
        lastResult = 'GOOD';
        lastResultCol = C.good;
        game.audio.play('se_tap', 0.5);
      }
      lastResultTimer = 0.6;

      for (var pi = 0; pi < 8; pi++) {
        var ang = Math.random() * Math.PI * 2;
        var cx = lane * LANE_W + LANE_W / 2;
        particles.push({ x: cx, y: HIT_Y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.35, col: LANE_COLORS[lane] });
      }

      if (hits >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(hits * 150 + Math.ceil(timeLeft) * 100); }, 700);
      }
    } else {
      // Empty tap (miss)
      misses++;
      lastResult = 'MISS';
      lastResultCol = C.miss;
      lastResultTimer = 0.5;
      game.audio.play('se_failure', 0.3);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
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

    if (lastResultTimer > 0) lastResultTimer -= dt;
    for (var li = 0; li < LANE_COUNT; li++) {
      if (hitAnims[li] > 0) hitAnims[li] -= dt * 3;
      if (laneFlash[li] > 0) laneFlash[li] -= dt * 4;
    }

    // Spawn notes
    nextNote -= dt;
    if (nextNote <= 0 && !done) {
      spawnNote();
      if (elapsed > 10 && Math.random() < 0.3) spawnNote(); // double notes
      nextNote = 0.3 + Math.random() * 0.4;
    }

    // Update notes
    for (var ni2 = notes.length - 1; ni2 >= 0; ni2--) {
      var note = notes[ni2];
      note.y += NOTE_SPEED * dt;
      if (note.y > HIT_Y + JUDGE_RANGE && !note.hit) {
        // Missed note
        misses++;
        notes.splice(ni2, 1);
        game.audio.play('se_failure', 0.2);
        if (misses >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      } else if (note.hit && note.y > HIT_Y + 100) {
        notes.splice(ni2, 1);
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Lanes
    for (var li2 = 0; li2 < LANE_COUNT; li2++) {
      var lx = li2 * LANE_W;
      game.draw.rect(lx + 4, 0, LANE_W - 8, H, LANE_COLORS[li2], 0.04);
      // Lane separator
      if (li2 > 0) game.draw.line(lx, 0, lx, H, '#111', 2);
      // Hit zone
      if (laneFlash[li2] > 0) {
        game.draw.rect(lx, HIT_Y - NOTE_R, LANE_W, NOTE_R * 2, LANE_COLORS[li2], laneFlash[li2] * 0.3);
      }
    }

    // Judge line
    game.draw.rect(0, HIT_Y - 4, W, 8, '#444', 0.6);
    game.draw.rect(0, HIT_Y - NOTE_R - 8, W, 4, '#222', 0.5);
    game.draw.rect(0, HIT_Y + NOTE_R + 4, W, 4, '#222', 0.5);

    // Hit buttons at bottom
    for (var li3 = 0; li3 < LANE_COUNT; li3++) {
      var lx3 = li3 * LANE_W + LANE_W / 2;
      var btnAlpha = hitAnims[li3] > 0 ? 0.9 : 0.5;
      game.draw.circle(lx3, HIT_Y, NOTE_R + 8, LANE_COLORS[li3], 0.15);
      game.draw.circle(lx3, HIT_Y, NOTE_R, LANE_COLORS[li3], btnAlpha);
    }

    // Notes
    for (var ni3 = 0; ni3 < notes.length; ni3++) {
      var note3 = notes[ni3];
      if (note3.hit) continue;
      var nx = note3.lane * LANE_W + LANE_W / 2;
      var distToHit = HIT_Y - note3.y;
      var approachAlpha = Math.min(1, Math.max(0.3, 1 - distToHit / H));
      game.draw.circle(nx, note3.y, NOTE_R + 4, LANE_COLORS[note3.lane], approachAlpha * 0.2);
      game.draw.circle(nx, note3.y, NOTE_R, LANE_COLORS[note3.lane], approachAlpha * 0.9);
      game.draw.circle(nx, note3.y, NOTE_R * 0.4, '#fff', approachAlpha * 0.4);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 14 * p.life, p.col, p.life * 0.8);
    }

    // Result text
    if (lastResultTimer > 0) {
      game.draw.text(lastResult, W / 2, HIT_Y - 150, { size: 64, color: lastResultCol, bold: true });
    }

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 34 + mi * 68, H * 0.955, 14, mi < misses ? C.miss : C.ui, 0.9);
    }

    game.draw.text(hits + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.lane1 : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.09);
  });
})(game);

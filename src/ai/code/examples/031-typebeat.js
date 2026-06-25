// 031-typebeat.js
// タイプビート — 流れてくる音符を方向スワイプで叩く音楽の快感
// 操作: 音符の矢印方向にスワイプ（画面右端に来た瞬間に）
// 成功: 12個ヒット  失敗: 4回ミス or 20秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#080412',
    track:   '#100820',
    note:    '#c084fc',
    noteHi:  '#e9d5ff',
    hit:     '#22c55e',
    miss:    '#ef4444',
    zone:    '#1e1030',
    zoneHi:  '#7c3aed',
    ui:      '#475569'
  };

  var DIRS = ['up', 'down', 'left', 'right'];
  var ARROWS = { up: '↑', down: '↓', left: '←', right: '→' };
  var NOTE_COLORS = { up: '#818cf8', down: '#fb923c', left: '#34d399', right: '#f472b6' };

  // Lane configuration (4 horizontal tracks)
  var LANE_COUNT = 4;
  var LANE_H = 160;
  var TRACK_Y = H * 0.28;
  var TOTAL_TRACK_H = LANE_COUNT * LANE_H;
  var NOTE_SPEED = 480; // px/sec
  var NOTE_R = 64;
  var HIT_ZONE_X = W * 0.12; // where player must swipe
  var SPAWN_X = W + NOTE_R;

  var notes = [];
  var spawnTimer = 0.7;
  var score = 0;
  var needed = 12;
  var misses = 0;
  var maxMisses = 4;
  var timeLeft = 20;
  var done = false;

  var feedback = [];  // { x, y, ok, life }
  var pendingSwipe = null;

  function getLaneY(lane) {
    return TRACK_Y + lane * LANE_H + LANE_H / 2;
  }

  function spawnNote() {
    var lane = Math.floor(Math.random() * LANE_COUNT);
    var dir = DIRS[lane]; // lane 0=up, 1=down, 2=left, 3=right
    notes.push({ x: SPAWN_X, lane: lane, dir: dir, alive: true, hit: false });
  }

  game.onSwipe(function(dir) {
    if (done) return;
    pendingSwipe = dir;
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    // Spawn notes
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnNote();
      spawnTimer = 0.55 - (20 - timeLeft) * 0.008;
    }

    // Move notes
    for (var i = notes.length - 1; i >= 0; i--) {
      var note = notes[i];
      note.x -= NOTE_SPEED * dt;

      // Miss if passed hit zone
      if (!note.hit && note.x < HIT_ZONE_X - NOTE_R * 1.5) {
        notes.splice(i, 1);
        misses++;
        game.audio.play('se_failure', 0.4);
        feedback.push({ x: HIT_ZONE_X, y: getLaneY(note.lane), ok: false, life: 0.4 });
        if (misses >= maxMisses && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
      } else if (note.x < -NOTE_R * 2) {
        notes.splice(i, 1);
      }
    }

    // Process swipe
    if (pendingSwipe) {
      var swipeDir = pendingSwipe;
      pendingSwipe = null;

      // Find closest note near hit zone in matching lane
      var bestNote = -1;
      var bestDist = NOTE_R * 2.5;
      for (var j = 0; j < notes.length; j++) {
        if (!notes[j].alive || notes[j].hit) continue;
        if (notes[j].dir !== swipeDir) continue;
        var dist = Math.abs(notes[j].x - HIT_ZONE_X);
        if (dist < bestDist) {
          bestDist = dist;
          bestNote = j;
        }
      }

      if (bestNote >= 0) {
        notes[bestNote].hit = true;
        score++;
        var hitLane = notes[bestNote].lane;
        feedback.push({ x: HIT_ZONE_X, y: getLaneY(hitLane), ok: true, life: 0.4 });
        notes.splice(bestNote, 1);
        game.audio.play('se_tap', 0.8);
        if (score >= needed) {
          done = true;
          game.audio.play('se_success');
          setTimeout(function() {
            game.end.success(score * 15 + Math.ceil(timeLeft) * 6);
          }, 400);
        }
      } else {
        // Wrong swipe
        misses++;
        feedback.push({ x: HIT_ZONE_X, y: TRACK_Y + TOTAL_TRACK_H / 2, ok: false, life: 0.4 });
        game.audio.play('se_failure', 0.3);
        if (misses >= maxMisses && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
      }
    }

    // Update feedback
    for (var f = feedback.length - 1; f >= 0; f--) {
      feedback[f].life -= dt;
      if (feedback[f].life <= 0) feedback.splice(f, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Track lanes
    for (var l = 0; l < LANE_COUNT; l++) {
      var ly = TRACK_Y + l * LANE_H;
      var trackColor = l % 2 === 0 ? C.track : '#0c0618';
      game.draw.rect(0, ly, W, LANE_H, trackColor);
      // Lane separator
      game.draw.rect(0, ly + LANE_H - 2, W, 2, '#1a0f28', 0.8);
      // Direction label on hit zone
      var dir2 = DIRS[l];
      game.draw.text(ARROWS[dir2], HIT_ZONE_X - 20, ly + LANE_H / 2, { size: 72, color: NOTE_COLORS[dir2], bold: true });
    }

    // Hit zone line
    game.draw.rect(HIT_ZONE_X - 4, TRACK_Y, 8, TOTAL_TRACK_H, C.zoneHi, 0.7);

    // Notes
    for (var n = 0; n < notes.length; n++) {
      var note2 = notes[n];
      var ny = getLaneY(note2.lane);
      var nc = NOTE_COLORS[note2.dir];
      var pulse = 0.8 + 0.2 * Math.sin(game.time.elapsed * 8 + note2.lane);
      game.draw.circle(note2.x, ny, NOTE_R + 8, nc, 0.2 * pulse);
      game.draw.circle(note2.x, ny, NOTE_R, nc, pulse);
      game.draw.text(ARROWS[note2.dir], note2.x, ny, { size: 80, color: '#fff', bold: true });
    }

    // Feedback effects
    for (var fb = 0; fb < feedback.length; fb++) {
      var f2 = feedback[fb];
      var fa = f2.life / 0.4;
      var prog = 1 - fa;
      if (f2.ok) {
        game.draw.text('HIT', f2.x, f2.y - 40 - prog * 50, { size: 60, color: C.hit, bold: true });
        game.draw.circle(f2.x, f2.y, 80 + prog * 60, C.hit, fa * 0.4);
      } else {
        game.draw.text('×', f2.x, f2.y, { size: 80, color: C.miss, bold: true });
      }
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#050210');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.zoneHi : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score & misses
    game.draw.text(score + ' / ' + needed, W * 0.5, TRACK_Y + TOTAL_TRACK_H + 70, {
      size: 56, color: C.noteHi, bold: true
    });
    for (var m = 0; m < maxMisses; m++) {
      var mmx = W / 2 + (m - (maxMisses - 1) / 2) * 60;
      game.draw.circle(mmx, TRACK_Y + TOTAL_TRACK_H + 150, 18, m < misses ? C.miss : '#1a0f28');
    }

    // Guide
    game.draw.text('矢印の向きにスワイプ！', W / 2, H - 180, { size: 52, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.45);
    spawnNote();
  });
})(game);

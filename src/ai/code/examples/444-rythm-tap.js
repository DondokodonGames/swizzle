// 444-rythm-tap.js
// リズムタップ — 流れてくる音符のタイミングにタップ
// 操作: 音符がラインに重なった瞬間にタップ
// 成功: 30音符キャッチ  失敗: 10ミス or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#060010',
    lane:   '#1a0a30',
    laneHi: '#2d1550',
    line:   '#7c3aed',
    lineHi: '#a855f7',
    note:   '#e879f9',
    noteHi: '#fae8ff',
    perfect:'#fbbf24',
    good:   '#22c55e',
    miss:   '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var LANES = 4;
  var LANE_W = W / LANES;
  var HIT_Y = H * 0.82;
  var HIT_RANGE = 80;
  var NOTE_SPEED = 500;

  var notes = [];
  var particles = [];
  var nextSpawn = 0.5;
  var SPAWN_INTERVAL = 0.55;
  var caught = 0;
  var NEEDED = 30;
  var misses = 0;
  var MAX_MISS = 10;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var lastHitLane = -1;
  var lastHitType = '';
  var hitTimer = 0;
  var combo = 0;

  function spawnNote() {
    var lane = Math.floor(Math.random() * LANES);
    notes.push({ lane: lane, y: -30, hit: false });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var lane = Math.floor(tx / LANE_W);
    if (lane < 0 || lane >= LANES) return;

    // Find closest note in that lane near hit line
    var best = -1;
    var bestDist = 999;
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.lane !== lane || n.hit) continue;
      var dist = Math.abs(n.y - HIT_Y);
      if (dist < HIT_RANGE + 40 && dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }

    if (best >= 0) {
      notes[best].hit = true;
      var dist2 = Math.abs(notes[best].y - HIT_Y);
      var isPerfect = dist2 < HIT_RANGE * 0.4;
      caught++;
      combo++;
      lastHitLane = lane;
      lastHitType = isPerfect ? 'PERFECT!' : 'GOOD';
      hitTimer = 0.6;

      var nx = lane * LANE_W + LANE_W / 2;
      for (var pi = 0; pi < 8; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: nx, y: HIT_Y, vx: Math.cos(ang)*150, vy: Math.sin(ang)*150, life: 0.4, col: isPerfect ? C.perfect : C.good });
      }
      game.audio.play('se_tap', 0.5);

      if (caught >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.8);
        setTimeout(function() { game.end.success(caught * 200 + combo * 20 + Math.ceil(timeLeft) * 80); }, 600);
      }
    } else {
      // Miss tap
      misses++;
      combo = 0;
      lastHitLane = lane;
      lastHitType = 'MISS';
      hitTimer = 0.5;
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

    if (hitTimer > 0) hitTimer -= dt;

    // Spawn notes
    nextSpawn -= dt;
    if (nextSpawn <= 0 && !done) {
      spawnNote();
      nextSpawn = SPAWN_INTERVAL * (0.8 + Math.random() * 0.4);
    }

    // Update notes
    for (var ni = notes.length - 1; ni >= 0; ni--) {
      notes[ni].y += NOTE_SPEED * dt;
      if (notes[ni].y > H + 40) {
        if (!notes[ni].hit) {
          misses++;
          combo = 0;
          if (misses >= MAX_MISS && !done) {
            done = true;
            game.audio.play('se_failure', 0.6);
            setTimeout(function() { game.end.failure(); }, 500);
          }
        }
        notes.splice(ni, 1);
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

    // Lanes
    for (var li = 0; li < LANES; li++) {
      var lx = li * LANE_W;
      game.draw.rect(lx + 4, 80, LANE_W - 8, H - 80, C.lane, 0.6);
      game.draw.line(lx, 80, lx, H, C.laneHi, 2);
    }

    // Hit line
    game.draw.rect(0, HIT_Y - 4, W, 8, C.line, 0.9);
    game.draw.rect(0, HIT_Y - 2, W, 4, C.lineHi, 0.6);
    // Hit circles
    for (var li2 = 0; li2 < LANES; li2++) {
      var hx = li2 * LANE_W + LANE_W / 2;
      game.draw.circle(hx, HIT_Y, 44, C.lane, 0.8);
      game.draw.circle(hx, HIT_Y, 40, C.laneHi, 0.5);
    }

    // Notes
    for (var ni2 = 0; ni2 < notes.length; ni2++) {
      var n2 = notes[ni2];
      if (n2.hit) continue;
      var nx2 = n2.lane * LANE_W + LANE_W / 2;
      var dist3 = Math.abs(n2.y - HIT_Y);
      var glowAlpha = dist3 < HIT_RANGE ? (1 - dist3/HIT_RANGE) * 0.5 : 0;
      game.draw.circle(nx2, n2.y, 52, C.noteHi, glowAlpha * 0.4);
      game.draw.circle(nx2, n2.y, 44, C.note, 0.9);
      game.draw.circle(nx2, n2.y, 28, C.noteHi, 0.4);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    // Hit feedback
    if (hitTimer > 0 && lastHitLane >= 0) {
      var fx = lastHitLane * LANE_W + LANE_W / 2;
      var fCol = lastHitType === 'PERFECT!' ? C.perfect : lastHitType === 'GOOD' ? C.good : C.miss;
      game.draw.text(lastHitType, fx, HIT_Y - 100, { size: 44, color: fCol, bold: true });
    }

    // Combo
    if (combo >= 5) {
      game.draw.text(combo + ' COMBO', W/2, H * 0.9, { size: 44, color: C.perfect, bold: true });
    }

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W*0.05 + mi * (W*0.9/(MAX_MISS-1)), H*0.955, 14, mi < misses ? C.miss : C.ui, 0.9);
    }

    game.draw.text(caught + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.line : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
  });
})(game);

// 742-note-landing.js
// ノートランディング — 降ってくる音符が五線のラインに着地した瞬間タップせよ
// 操作: タップ — 音符がライン上にあるとき成功
// 成功: 30回成功  失敗: 10回ミス or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0c0a1e',
    staff:   '#4c4a70',
    note:    '#fbbf24',
    noteHi:  '#fef3c7',
    zone:    '#22c55e',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#120f28'
  };

  var STAFF_Y = H * 0.62;
  var ZONE_H  = 56;
  var NOTE_R  = 28;

  var notes = [];
  var spawnTimer = 0.7;
  var FALL_SPEED = 340;

  var score = 0;
  var NEEDED = 30;
  var errors = 0;
  var MAX_ERR = 10;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function spawnNote() {
    var cols = [W * 0.2, W * 0.4, W * 0.6, W * 0.8];
    var cx = cols[Math.floor(Math.random() * cols.length)] + (Math.random() - 0.5) * 60;
    notes.push({ x: cx, y: -NOTE_R - 20, landed: false, scored: false });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var nearStaff = Math.abs(ty - STAFF_Y) < 200;
    var inZone = false;
    var anyNote = false;
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.scored) continue;
      if (Math.abs(n.y - STAFF_Y) < ZONE_H) {
        inZone = true;
        anyNote = true;
        break;
      }
    }
    // Also check if near any note horizontally
    var hitNote = -1;
    for (var j = 0; j < notes.length; j++) {
      if (notes[j].scored) continue;
      var dx = tx - notes[j].x;
      if (Math.abs(dx) < 100 && Math.abs(notes[j].y - STAFF_Y) < ZONE_H) {
        hitNote = j;
        break;
      }
    }

    if (hitNote >= 0) {
      notes[hitNote].scored = true;
      score++;
      flashCol = C.correct;
      flashAnim = 0.22;
      resultText = 'ランディング！';
      resultTimer = 0.38;
      game.audio.play('se_tap', 0.12);
      for (var p = 0; p < 6; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: notes[hitNote].x, y: STAFF_Y, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.38, col: C.note });
      }
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 250 + Math.ceil(timeLeft) * 100); }, 700);
      }
    } else {
      // Check if there was a note far from staff (early/late tap)
      var hasFar = false;
      for (var k = 0; k < notes.length; k++) {
        if (!notes[k].scored && Math.abs(tx - notes[k].x) < 120) { hasFar = true; break; }
      }
      if (hasFar) {
        errors++;
        flashCol = C.wrong;
        flashAnim = 0.28;
        resultText = 'タイミングがズレた！';
        resultTimer = 0.4;
        game.audio.play('se_failure', 0.25);
        if (errors >= MAX_ERR && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
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

    spawnTimer -= dt;
    var rate = Math.max(0.45, 0.72 - score * 0.007);
    if (spawnTimer <= 0 && !done) {
      spawnTimer = rate;
      if (notes.length < 5) spawnNote();
    }

    var spd = Math.min(620, FALL_SPEED + score * 9);

    for (var ni = notes.length - 1; ni >= 0; ni--) {
      var n = notes[ni];
      if (!n.scored) n.y += spd * dt;
      if (n.y > STAFF_Y + ZONE_H * 2 && !n.scored) {
        // Missed — don't penalize if no tap was expected
        notes.splice(ni, 1);
      } else if (n.y > H + 80) {
        notes.splice(ni, 1);
      }
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

    // Staff lines (5 lines)
    for (var sl = -2; sl <= 2; sl++) {
      var ly = STAFF_Y + sl * 28;
      game.draw.line(0, ly, W, ly, C.staff, sl === 0 ? 3 : 2);
    }

    // Target zone highlight
    game.draw.rect(0, STAFF_Y - ZONE_H, W, ZONE_H * 2, C.zone, 0.08 + 0.03 * Math.sin(elapsed * 5));
    game.draw.line(0, STAFF_Y - ZONE_H, W, STAFF_Y - ZONE_H, C.zone, 2);
    game.draw.line(0, STAFF_Y + ZONE_H, W, STAFF_Y + ZONE_H, C.zone, 2);

    // Notes
    for (var ni2 = 0; ni2 < notes.length; ni2++) {
      var n2 = notes[ni2];
      if (n2.scored) continue;
      var isClose = Math.abs(n2.y - STAFF_Y) < ZONE_H;
      var nc = isClose ? C.zone : C.note;
      game.draw.circle(n2.x + 3, n2.y + 3, NOTE_R, '#000', 0.25);
      game.draw.circle(n2.x, n2.y, NOTE_R, nc, 0.9);
      game.draw.circle(n2.x - NOTE_R * 0.3, n2.y - NOTE_R * 0.3, NOTE_R * 0.22, C.noteHi, 0.45);
      game.draw.line(n2.x + NOTE_R - 4, n2.y, n2.x + NOTE_R - 4, n2.y - 90, nc, 5);
      if (isClose) {
        game.draw.circle(n2.x, n2.y, NOTE_R + 12, C.zone, 0.18 + 0.08 * Math.sin(elapsed * 10));
      }
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 9 * p.life, p.col, p.life);
    }

    game.draw.text('ラインでタップ', W / 2, H * 0.78, { size: 40, color: C.text + '44' });

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.87, { size: 50, color: flashCol, bold: true });
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
    spawnNote();
  });
})(game);

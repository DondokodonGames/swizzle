// 390-conductor.js
// 指揮者 — オーケストラのテンポに合わせて指揮棒を振る
// 操作: 上下スワイプでテンポを合わせる
// 成功: 30小節完奏  失敗: テンポが大きくズレて演奏停止 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0c0a18',
    hall:   '#1a1025',
    hallHi: '#2d1a40',
    stage:  '#150f20',
    baton:  '#fef3c7',
    batonHi:'#fff',
    musician:'#4f46e5',
    musicianHi:'#818cf8',
    note:   '#f0abfc',
    noteHi: '#fae8ff',
    beat:   '#22c55e',
    offbeat:'#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var TEMPO = 1.2;   // seconds per beat
  var beatTimer = 0;
  var measureCount = 0;
  var BEATS_PER_MEASURE = 4;
  var beatInMeasure = 0;
  var NEEDED_MEASURES = 30;

  var batonY = H * 0.4;
  var batonVY = 0;
  var BATON_X = W / 2;
  var accuracy = 1.0;  // 0-1
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var notes = [];
  var beatFlash = 0;
  var conductorSwung = false;
  var lastSwingTime = -99;

  // Musicians - rows of dots
  var musicians = [];
  for (var mi = 0; mi < 20; mi++) {
    var row = Math.floor(mi / 5);
    var col = mi % 5;
    musicians.push({
      x: W * 0.1 + col * (W * 0.8 / 4),
      y: H * 0.55 + row * 80,
      phase: Math.random() * Math.PI * 2,
      active: true
    });
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir !== 'up' && dir !== 'down') return;
    // Check timing against beat
    var beatPhase = (elapsed % TEMPO) / TEMPO;
    var distFromBeat = Math.min(beatPhase, 1 - beatPhase);
    var hitAccuracy = 1 - distFromBeat * 4;  // 1 at perfect, 0 at off
    hitAccuracy = Math.max(-0.2, hitAccuracy);

    lastSwingTime = elapsed;
    conductorSwung = true;

    if (hitAccuracy > 0.5) {
      // Good timing
      accuracy = Math.min(1, accuracy + 0.05);
      beatFlash = 0.5;
      game.audio.play('se_tap', 0.4);
      // Spawn notes from musicians
      for (var pi = 0; pi < 6; pi++) {
        var m = musicians[Math.floor(Math.random() * musicians.length)];
        notes.push({ x: m.x, y: m.y, vx: (Math.random()-0.5)*60, vy: -80-Math.random()*80, life: 0.8, col: C.note });
      }
    } else {
      // Bad timing
      accuracy = Math.max(0, accuracy - 0.12);
      game.audio.play('se_failure', 0.3);
    }

    // Baton animation
    batonVY = dir === 'down' ? 400 : -400;
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (beatFlash > 0) beatFlash -= dt * 2;

    // Beat counter
    beatTimer += dt;
    if (beatTimer >= TEMPO) {
      beatTimer -= TEMPO;
      beatInMeasure++;
      if (beatInMeasure >= BEATS_PER_MEASURE) {
        beatInMeasure = 0;
        measureCount++;
        if (measureCount >= NEEDED_MEASURES && !done) {
          done = true;
          game.audio.play('se_success', 0.8);
          game.end.success(Math.round(accuracy * 2000) + Math.ceil(timeLeft) * 80);
        }
      }
    }

    // Accuracy drain if not conducting
    if (elapsed - lastSwingTime > TEMPO * 1.5) {
      accuracy = Math.max(0, accuracy - dt * 0.15);
    }

    if (accuracy <= 0 && !done) {
      done = true;
      game.audio.play('se_failure', 0.7);
      setTimeout(function() { game.end.failure(); }, 500);
    }

    // Baton physics
    batonY += batonVY * dt;
    batonVY *= (1 - 5 * dt);
    batonY = Math.max(H * 0.28, Math.min(H * 0.52, batonY));

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Notes
    for (var ni = notes.length - 1; ni >= 0; ni--) {
      notes[ni].x += notes[ni].vx * dt;
      notes[ni].y += notes[ni].vy * dt;
      notes[ni].life -= dt;
      if (notes[ni].life <= 0) notes.splice(ni, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H, C.hall, 0.8);

    if (beatFlash > 0) game.draw.rect(0, 0, W, H, C.beat, beatFlash * 0.06);

    // Stage
    game.draw.rect(60, H * 0.5, W - 120, H * 0.45, C.stage, 0.9);
    game.draw.rect(60, H * 0.5, W - 120, 10, C.hallHi, 0.7);

    // Musicians
    for (var mi2 = 0; mi2 < musicians.length; mi2++) {
      var m = musicians[mi2];
      var wave = Math.sin(elapsed * 4 / TEMPO + m.phase) * 0.5 + 0.5;
      game.draw.circle(m.x, m.y, 22, C.musician, 0.85);
      game.draw.circle(m.x, m.y - 10, 14, C.musicianHi, 0.8);
      // Instrument glow based on beat
      if (wave > 0.7) {
        game.draw.circle(m.x, m.y, 30, C.musicianHi, wave * 0.2 * accuracy);
      }
    }

    // Notes
    for (var ni2 = 0; ni2 < notes.length; ni2++) {
      var n = notes[ni2];
      game.draw.circle(n.x, n.y, 10 * n.life, n.col, n.life * 0.8);
      game.draw.text('♪', n.x, n.y, { size: Math.round(20 * n.life), color: C.noteHi });
    }

    // Conductor (baton)
    var beatPhase2 = beatTimer / TEMPO;
    var batonX2 = BATON_X + Math.sin(beatPhase2 * Math.PI * 2) * 80;
    game.draw.circle(batonX2 - 20, H * 0.36, 44, C.musicianHi, 0.85);  // head
    game.draw.circle(batonX2 - 20, H * 0.36, 30, '#fde68a', 0.9);       // face
    game.draw.line(batonX2, H * 0.4, batonX2 + 80, batonY, C.baton, 8); // baton
    game.draw.circle(batonX2 + 80, batonY, 14, C.batonHi, 0.9);

    // Beat markers
    for (var bi = 0; bi < BEATS_PER_MEASURE; bi++) {
      var bx = W / 2 - (BEATS_PER_MEASURE-1)*44 + bi*88;
      var isCurrent = bi === beatInMeasure;
      game.draw.circle(bx, H * 0.18, isCurrent ? 24 : 16, isCurrent ? C.beat : C.ui, 0.9);
    }

    // Accuracy bar
    var accW = 500;
    var accX = W / 2 - accW / 2;
    var accY = H * 0.24;
    game.draw.rect(accX, accY, accW, 20, '#1a1025', 0.8);
    game.draw.rect(accX, accY, accW * accuracy, 20, accuracy > 0.4 ? C.beat : C.offbeat, 0.9);

    // Measure progress
    game.draw.text(measureCount + ' / ' + NEEDED_MEASURES, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.musician : C.offbeat);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    lastSwingTime = 0;
  });
})(game);

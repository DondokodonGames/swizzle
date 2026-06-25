// 284-beat-boxer.js
// ビートボクサー — リズムに合わせてパンチとキックを繰り出す格闘リズムゲーム
// 操作: 左タップでパンチ、右タップでキック
// 成功: 30コンボ  失敗: 10回外す or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#040208',
    ring:   '#1a1025',
    ringHi: '#2d1b4e',
    fighter:'#f59e0b',
    fgtHi:  '#fde68a',
    enemy:  '#ef4444',
    enHi:   '#fca5a5',
    punch:  '#3b82f6',
    punchHi:'#93c5fd',
    kick:   '#22c55e',
    kickHi: '#86efac',
    hit:    '#fde68a',
    miss:   '#ef4444',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var BEAT_INTERVAL = 0.5; // seconds per beat
  var beatTimer = 0;
  var beat = 0;
  var combo = 0;
  var NEEDED = 30;
  var misses = 0;
  var MAX_MISS = 10;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;

  // Cues: objects that appear on beat and must be tapped before they expire
  var cues = [];
  var CUE_LIFE = 0.8;
  var particles = [];
  var feedback = '';
  var feedbackCol = '#fff';
  var feedbackTimer = 0;
  var beatFlash = 0;
  var lastAction = null;
  var actionTimer = 0;

  function spawnCue() {
    var type = Math.random() < 0.5 ? 'punch' : 'kick';
    var x = type === 'punch' ? W * 0.3 : W * 0.7;
    var y = H * 0.55 + (Math.random() - 0.5) * 200;
    cues.push({ type: type, x: x, y: y, life: CUE_LIFE, maxLife: CUE_LIFE });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var side = tx < W / 2 ? 'punch' : 'kick';

    // Find matching cue
    var found = false;
    for (var i = cues.length - 1; i >= 0; i--) {
      var cue = cues[i];
      if (cue.type === side && cue.life > 0.1) {
        combo++;
        found = true;
        feedback = side === 'punch' ? 'パンチ！' : 'キック！';
        feedbackCol = side === 'punch' ? C.punchHi : C.kickHi;
        feedbackTimer = 0.4;
        game.audio.play('se_success', 0.5);
        lastAction = side;
        actionTimer = 0.3;
        for (var pi = 0; pi < 6; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: cue.x, y: cue.y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.4, col: feedbackCol });
        }
        cues.splice(i, 1);
        if (combo >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(combo * 80 + Math.ceil(timeLeft) * 100); }, 400);
        }
        return;
      }
    }
    if (!found) {
      misses++;
      combo = 0;
      feedback = 'ミス！';
      feedbackCol = C.miss;
      feedbackTimer = 0.4;
      game.audio.play('se_failure', 0.4);
      if (misses >= MAX_MISS && !done) {
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

    if (feedbackTimer > 0) feedbackTimer -= dt;
    if (beatFlash > 0) beatFlash -= dt;
    if (actionTimer > 0) actionTimer -= dt;

    beatTimer += dt;
    if (beatTimer >= BEAT_INTERVAL) {
      beatTimer -= BEAT_INTERVAL;
      beat++;
      beatFlash = 0.15;
      // Spawn 1-2 cues per beat
      var numCues = beat % 4 === 0 ? 2 : 1;
      for (var n = 0; n < numCues; n++) spawnCue();
    }

    // Expire cues
    for (var i = cues.length - 1; i >= 0; i--) {
      cues[i].life -= dt;
      if (cues[i].life <= 0) {
        misses++;
        feedback = '遅い！';
        feedbackCol = C.miss;
        feedbackTimer = 0.4;
        game.audio.play('se_failure', 0.35);
        cues.splice(i, 1);
        if (misses >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    if (beatFlash > 0) game.draw.rect(0, 0, W, H, '#ffffff', beatFlash * 0.08);

    // Ring
    game.draw.rect(0, H * 0.45, W, H * 0.45, C.ring, 0.9);
    game.draw.rect(0, H * 0.45, W, 8, C.ringHi, 0.7);
    game.draw.rect(0, H * 0.88, W, 8, C.ringHi, 0.5);

    // Side zones
    game.draw.rect(0, H * 0.45, W / 2, H * 0.43, C.punch, 0.06);
    game.draw.rect(W / 2, H * 0.45, W / 2, H * 0.43, C.kick, 0.06);
    game.draw.text('パンチ', W * 0.25, H * 0.9, { size: 42, color: lastAction === 'punch' && actionTimer > 0 ? C.punchHi : C.ui });
    game.draw.text('キック', W * 0.75, H * 0.9, { size: 42, color: lastAction === 'kick' && actionTimer > 0 ? C.kickHi : C.ui });

    // Fighter (center)
    var fx = W / 2 + (lastAction === 'punch' && actionTimer > 0 ? -30 : lastAction === 'kick' && actionTimer > 0 ? 30 : 0);
    var fy = H * 0.6;
    game.draw.rect(fx - 24, fy - 60, 48, 90, C.fighter, 0.9);
    game.draw.circle(fx, fy - 86, 34, C.fgtHi, 0.9);
    if (lastAction === 'punch' && actionTimer > 0) {
      game.draw.line(fx - 24, fy - 30, fx - 80, fy - 50, C.punch, 20);
      game.draw.circle(fx - 80, fy - 50, 18, C.punchHi, 0.9);
    }
    if (lastAction === 'kick' && actionTimer > 0) {
      game.draw.line(fx + 24, fy + 20, fx + 80, fy + 50, C.kick, 18);
      game.draw.circle(fx + 80, fy + 50, 18, C.kickHi, 0.9);
    }

    // Cues
    for (var i2 = 0; i2 < cues.length; i2++) {
      var cue2 = cues[i2];
      var lifeRatio = cue2.life / cue2.maxLife;
      var cueCol = cue2.type === 'punch' ? C.punch : C.kick;
      var cueHi = cue2.type === 'punch' ? C.punchHi : C.kickHi;
      var r2 = 60 * (0.5 + 0.5 * lifeRatio);
      game.draw.circle(cue2.x, cue2.y, r2 + 8, cueCol, 0.2);
      game.draw.circle(cue2.x, cue2.y, r2, cueCol, 0.8 * lifeRatio);
      game.draw.text(cue2.type === 'punch' ? '👊' : '🦵', cue2.x, cue2.y + 14, { size: 48 });
      // Countdown ring
      var segs = 12;
      for (var sg = 0; sg < segs * lifeRatio; sg++) {
        var a1 = -Math.PI / 2 + (sg / segs) * Math.PI * 2;
        var a2 = -Math.PI / 2 + ((sg + 1) / segs) * Math.PI * 2;
        game.draw.line(cue2.x + Math.cos(a1) * (r2 + 14), cue2.y + Math.sin(a1) * (r2 + 14),
                       cue2.x + Math.cos(a2) * (r2 + 14), cue2.y + Math.sin(a2) * (r2 + 14), cueHi, 5);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life * 2.5, p.col, p.life * 0.7);
    }

    if (feedbackTimer > 0) {
      game.draw.text(feedback, W / 2, H * 0.36, { size: 56, color: feedbackCol, bold: true });
    }

    // Miss dots
    for (var mi = 0; mi < 5; mi++) {
      game.draw.circle(W / 2 - 4 * 28 + mi * 56, H * 0.94, 14, mi < Math.min(5, misses) ? C.miss : '#08040e');
    }

    game.draw.text(combo + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.fighter : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    beatTimer = BEAT_INTERVAL * 0.8; // Start first beat soon
  });
})(game);

// 150-whack-rhythm.js
// リズムモグラ — 音楽のビートに合わせてタイミングよくモグラを叩く快感
// 操作: タップで叩く
// 成功: 40ヒット  失敗: 5回外す or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#060410',
    hole:    '#1a0a2e',
    holeHi:  '#2d1550',
    mole:    '#92400e',
    moleHi:  '#d97706',
    moleFace:'#fbbf24',
    beat:    '#7c3aed',
    beatHi:  '#a78bfa',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#334155'
  };

  var HOLES = [];
  var ROWS = 3, COLS = 3;
  var HW = W / 4;
  var HH = H * 0.18;
  for (var r = 0; r < ROWS; r++) {
    for (var c = 0; c < COLS; c++) {
      HOLES.push({
        x: W * (0.2 + c * 0.3),
        y: H * (0.3 + r * 0.22),
        mole: false,
        riseT: 0,
        maxT: 0,
        hit: false,
        hitTimer: 0
      });
    }
  }

  var BPM = 100;
  var BEAT = 60 / BPM; // seconds per beat
  var beatTimer = 0;
  var beatFlash = 0;
  var beatCount = 0;

  var score = 0;
  var needed = 40;
  var misses = 0;
  var maxMisses = 5;
  var timeLeft = 30;
  var done = false;
  var particles = [];

  function popMole() {
    // Find a random empty hole
    var empty = HOLES.filter(function(h) { return !h.mole && !h.hit; });
    if (empty.length === 0) return;
    var num = Math.min(Math.floor(1 + score/10), 3);
    for (var i = 0; i < num && i < empty.length; i++) {
      var h = empty[Math.floor(Math.random() * empty.length)];
      empty.splice(empty.indexOf(h), 1);
      h.mole = true;
      h.hit = false;
      h.riseT = 0;
      h.maxT = BEAT * (1.5 + Math.random() * 1.5);
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var hitAny = false;
    for (var hi = 0; hi < HOLES.length; hi++) {
      var h = HOLES[hi];
      if (!h.mole || h.hit) continue;
      var rise = Math.min(h.riseT / 0.15, 1);
      var moleY = h.y - rise * 60;
      var dx = tx - h.x, dy = ty - moleY;
      if (Math.sqrt(dx*dx+dy*dy) < 64) {
        h.hit = true;
        h.hitTimer = 0.4;
        h.mole = false;
        score++;
        hitAny = true;
        game.audio.play('se_success', 0.7);
        for (var pi = 0; pi < 8; pi++) {
          var ang = Math.random()*Math.PI*2;
          particles.push({ x: h.x, y: moleY, vx: Math.cos(ang)*180, vy: Math.sin(ang)*180-100, life: 0.4 });
        }
        if (score >= needed && !done) {
          done = true;
          game.audio.play('se_success');
          setTimeout(function() { game.end.success(score*30+Math.ceil(timeLeft)*20); }, 400);
        }
        break;
      }
    }
    if (!hitAny) {
      misses++;
      game.audio.play('se_failure', 0.5);
      if (misses >= maxMisses && !done) { done = true; setTimeout(function() { game.end.failure(); }, 400); }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    beatTimer += dt;
    if (beatTimer >= BEAT) {
      beatTimer -= BEAT;
      beatCount++;
      beatFlash = 0.2;
      if (beatCount % 2 === 0) popMole();
    }
    if (beatFlash > 0) beatFlash -= dt;

    for (var hi = 0; hi < HOLES.length; hi++) {
      var h = HOLES[hi];
      if (h.mole) {
        h.riseT += dt;
        if (h.riseT >= h.maxT) {
          h.mole = false;
          misses++;
          game.audio.play('se_failure', 0.3);
          if (misses >= maxMisses && !done) { done = true; setTimeout(function() { game.end.failure(); }, 400); }
        }
      }
      if (h.hitTimer > 0) h.hitTimer -= dt;
    }

    for (var pi2 = 0; pi2 < particles.length; pi2++) {
      particles[pi2].x += particles[pi2].vx*dt; particles[pi2].y += particles[pi2].vy*dt;
      particles[pi2].vy += 500*dt; particles[pi2].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Beat pulse ring
    if (beatFlash > 0) {
      game.draw.circle(W/2, H/2, 300+beatFlash*200, C.beatHi, beatFlash*0.15);
    }

    // Holes
    for (var hi2 = 0; hi2 < HOLES.length; hi2++) {
      var h2 = HOLES[hi2];
      // Hole
      game.draw.circle(h2.x, h2.y, 64, C.hole, 0.9);
      game.draw.circle(h2.x, h2.y, 56, C.holeHi, 0.5);

      if (h2.hitTimer > 0) {
        // Hit star flash
        game.draw.text('★', h2.x, h2.y - 40, { size: 64, color: C.correct, bold: true });
      } else if (h2.mole) {
        var rise = Math.min(h2.riseT / 0.15, 1);
        var my = h2.y - rise * 60;
        // Mole body
        game.draw.circle(h2.x, my, 52, C.mole, 0.9);
        game.draw.circle(h2.x, my - 8, 40, C.moleHi, 0.85);
        // Face
        game.draw.circle(h2.x-14, my - 16, 10, '#000', 0.8);
        game.draw.circle(h2.x+14, my - 16, 10, '#000', 0.8);
        game.draw.circle(h2.x, my - 4, 12, C.moleFace, 0.8);
        // Urgent indicator when about to leave
        var urgency = h2.riseT / h2.maxT;
        if (urgency > 0.65) {
          game.draw.circle(h2.x, my, 58, C.wrong, (urgency-0.65)*2*0.4);
        }
      }
    }

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 8*part.life*3, C.moleFace, part.life);
    }

    // Beat indicator dots
    for (var bi = 0; bi < 4; bi++) {
      var pulse = beatCount % 4 === bi ? 1.0 : 0.3;
      game.draw.circle(W/2+(bi-1.5)*60, H*0.9, 16, C.beatHi, pulse);
    }

    game.draw.text(score + ' / ' + needed, W/2, 148, { size: 60, color: '#f1f5f9', bold: true });
    for (var mi = 0; mi < maxMisses; mi++) game.draw.circle(W/2+(mi-2)*52, 218, 18, mi < misses ? C.wrong : '#0a1020');

    var ratio = Math.max(0, timeLeft/30);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.beat : C.wrong);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() { game.audio.bgm('bgm_main', 0.35); });
})(game);

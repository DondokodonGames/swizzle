// 634-rhythm-tap.js
// リズムタップ — 流れてくるビートに合わせてタップせよ
// 操作: タップでビートを叩く
// 成功: 25ヒット (PERFECT/GOOD)  失敗: 10ミス or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0010',
    lane:    '#120020',
    beat:    '#a855f7',
    beatHi:  '#d946ef',
    perfect: '#f0f',
    good:    '#22c55e',
    miss:    '#ef4444',
    hitLine: '#ffffff',
    text:    '#f1f5f9',
    ui:      '#1a0030',
    glow:    '#a855f744'
  };

  var HIT_Y = H * 0.78;      // where beats need to be tapped
  var PERFECT_RANGE = 60;    // px from hit line for PERFECT
  var GOOD_RANGE = 120;       // px for GOOD
  var BEAT_SPEED = 460;

  var beats = [];
  var score = 0;
  var hits = 0;
  var NEEDED = 25;
  var misses = 0;
  var MAX_MISSES = 10;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var beatTimer = 0;
  var beatInterval = 0.55;  // seconds between beats
  var particles = [];
  var resultText = '';
  var resultTimer = 0;
  var resultCol = C.perfect;
  var combo = 0;
  var lanes = [W * 0.2, W * 0.4, W * 0.6, W * 0.8]; // 4 lanes

  function spawnBeat() {
    var lane = Math.floor(Math.random() * lanes.length);
    beats.push({
      x: lanes[lane],
      y: -40,
      lane: lane,
      hit: false
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Find closest beat near hit line and x zone
    var bestDist = GOOD_RANGE;
    var bestIdx = -1;
    for (var i = 0; i < beats.length; i++) {
      var b = beats[i];
      if (b.hit) continue;
      var dy = Math.abs(b.y - HIT_Y);
      var dx = Math.abs(b.x - tx);
      if (dx < 100 && dy < bestDist) {
        bestDist = dy;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0) {
      var b2 = beats[bestIdx];
      b2.hit = true;
      hits++;
      combo++;
      var isPerfect = bestDist < PERFECT_RANGE;
      var pts = isPerfect ? 100 : 50;
      pts = Math.floor(pts * (1 + combo * 0.1));
      score += pts;
      resultText = isPerfect ? 'PERFECT!' : 'GOOD!';
      resultCol = isPerfect ? C.perfect : C.good;
      resultTimer = 0.5;
      game.audio.play('se_success', isPerfect ? 0.6 : 0.4);
      for (var p = 0; p < 5; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: b2.x, y: HIT_Y, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.5, col: isPerfect ? C.perfect : C.good });
      }
      if (hits >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score + Math.ceil(timeLeft) * 50); }, 700);
      }
    } else {
      // Tap but no beat nearby
      combo = 0;
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
    if (resultTimer > 0) resultTimer -= dt;

    beatTimer += dt;
    beatInterval = Math.max(0.3, 0.55 - elapsed * 0.003);
    if (beatTimer >= beatInterval) {
      beatTimer = 0;
      spawnBeat();
      if (Math.random() < 0.3) spawnBeat(); // double beat occasionally
    }

    for (var bi = beats.length - 1; bi >= 0; bi--) {
      var b = beats[bi];
      b.y += BEAT_SPEED * dt;

      if (!b.hit && b.y > HIT_Y + GOOD_RANGE) {
        // Missed
        misses++;
        combo = 0;
        beats.splice(bi, 1);
        game.audio.play('se_failure', 0.2);
        if (misses >= MAX_MISSES && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
        continue;
      }
      if (b.y > H + 60) beats.splice(bi, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Lane lines
    for (var li = 0; li < lanes.length; li++) {
      game.draw.rect(lanes[li] - 60, 0, 120, H, C.lane, 0.5);
      game.draw.rect(lanes[li] - 1, 0, 2, H, C.ui, 0.8);
    }

    // Hit line
    game.draw.rect(0, HIT_Y - 4, W, 8, C.hitLine, 0.5);
    for (var li2 = 0; li2 < lanes.length; li2++) {
      game.draw.circle(lanes[li2], HIT_Y, 44, C.ui, 0.9);
      game.draw.circle(lanes[li2], HIT_Y, 40, '#1a0030', 0.8);
    }

    // Beats
    for (var bi2 = 0; bi2 < beats.length; bi2++) {
      var b3 = beats[bi2];
      if (b3.hit) continue;
      var proximity = 1 - Math.min(1, Math.abs(b3.y - HIT_Y) / GOOD_RANGE);
      var glow = 0.15 + proximity * 0.5;
      game.draw.circle(b3.x, b3.y, 52, C.glow, glow);
      game.draw.circle(b3.x, b3.y, 40, C.beat, 0.9);
      game.draw.circle(b3.x, b3.y, 24, C.beatHi, 0.7);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 12 * p2.life, p2.col, p2.life);
    }

    // Result text
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.6, { size: 80, color: resultCol, bold: true });
      if (combo > 1) game.draw.text(combo + 'x COMBO!', W / 2, H * 0.67, { size: 44, color: C.beatHi });
    }

    // Score and miss dots
    game.draw.text(score + '', W / 2, 148, { size: 60, color: C.text, bold: true });
    game.draw.text('HIT ' + hits + '/' + NEEDED, W / 2, 200, { size: 36, color: C.beatHi });

    for (var mi = 0; mi < MAX_MISSES; mi++) {
      game.draw.circle(W / 2 - (MAX_MISSES - 1) * 44 + mi * 88, H * 0.955, 18, mi < misses ? C.miss : C.ui, 0.9);
    }

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 100, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.beat : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    spawnBeat();
  });
})(game);

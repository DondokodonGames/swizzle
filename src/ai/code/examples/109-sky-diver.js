// 109-sky-diver.js
// スカイダイバー — 落下する体の位置をスワイプで微調整してリングを通り抜ける
// 操作: スワイプ左右で落下位置を調整
// 成功: 10個のリングを通る  失敗: 3個外す or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030816',
    sky:     '#0a1628',
    cloud:   '#0f2040',
    ring:    '#22d3ee',
    ringHi:  '#67e8f9',
    diver:   '#f97316',
    diverHi: '#fed7aa',
    trail:   '#8b5cf6',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#334155'
  };

  var DIVER_X = W / 2;
  var TARGET_DIVER_X = W / 2;
  var DIVER_Y = H * 0.15;
  var DIVER_R = 28;
  var LANE_SPEED = 8; // pixels/frame for x transition

  var rings = []; // { y, x, r, passed, missFlash }
  var ringSpawnY = H * 0.6;
  var RING_SCROLL_SPEED = 220;
  var RING_R = 100;

  var score = 0;
  var needed = 10;
  var misses = 0;
  var maxMisses = 3;
  var timeLeft = 30;
  var done = false;
  var passFlash = 0;
  var missFlash = 0;
  var trail = [];
  var clouds = [];

  function initClouds() {
    for (var i = 0; i < 8; i++) {
      clouds.push({ x: Math.random() * W, y: Math.random() * H * 0.8, w: 80 + Math.random() * 120, h: 20 + Math.random() * 20, speed: 20 + Math.random() * 30 });
    }
  }

  function spawnRing() {
    var x = 120 + Math.random() * (W - 240);
    rings.push({ y: ringSpawnY, x: x, r: RING_R, passed: false, missFlash: 0 });
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'left') TARGET_DIVER_X = Math.max(60, TARGET_DIVER_X - 180);
    if (dir === 'right') TARGET_DIVER_X = Math.min(W - 60, TARGET_DIVER_X + 180);
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

    // Move diver toward target
    var diff = TARGET_DIVER_X - DIVER_X;
    DIVER_X += diff * Math.min(1, dt * 8);

    // Trail
    trail.push({ x: DIVER_X, y: DIVER_Y, age: 0 });
    for (var ti = 0; ti < trail.length; ti++) trail[ti].age += dt;
    trail = trail.filter(function(t) { return t.age < 0.4; });

    // Scroll rings up
    var toRemove = [];
    for (var i = 0; i < rings.length; i++) {
      var ring = rings[i];
      ring.y -= RING_SCROLL_SPEED * dt;
      if (ring.missFlash > 0) ring.missFlash -= dt;

      // Ring passes diver level?
      if (!ring.passed && ring.y < DIVER_Y) {
        ring.passed = true;
        var dx = DIVER_X - ring.x;
        if (Math.abs(dx) < ring.r - DIVER_R) {
          // Through ring!
          score++;
          passFlash = 0.3;
          game.audio.play('se_tap', 1.0);
          if (score >= needed && !done) {
            done = true;
            game.audio.play('se_success');
            setTimeout(function() { game.end.success(score * 40 + Math.ceil(timeLeft) * 12); }, 400);
          }
        } else {
          // Missed ring
          misses++;
          ring.missFlash = 0.4;
          missFlash = 0.3;
          game.audio.play('se_failure', 0.7);
          if (misses >= maxMisses && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 400);
          }
        }
      }
      if (ring.y < -100) toRemove.push(i);
    }
    for (var j = toRemove.length - 1; j >= 0; j--) rings.splice(toRemove[j], 1);

    // Spawn rings
    if (rings.length < 3) spawnRing();

    // Clouds
    for (var ci = 0; ci < clouds.length; ci++) {
      clouds[ci].x -= clouds[ci].speed * dt;
      if (clouds[ci].x + clouds[ci].w < 0) clouds[ci].x = W + 20;
    }

    if (passFlash > 0) passFlash -= dt;
    if (missFlash > 0) missFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Sky gradient layers
    game.draw.rect(0, 0, W, H * 0.7, C.sky, 0.5);

    // Clouds
    for (var cid = 0; cid < clouds.length; cid++) {
      var cl = clouds[cid];
      game.draw.rect(cl.x, cl.y, cl.w, cl.h, C.cloud, 0.6);
      game.draw.rect(cl.x + 16, cl.y - cl.h * 0.5, cl.w * 0.6, cl.h, C.cloud, 0.4);
    }

    // Flash overlays
    if (passFlash > 0) {
      game.draw.rect(0, 0, W, H, C.correct, passFlash * 0.2);
    }
    if (missFlash > 0) {
      game.draw.rect(0, 0, W, H, C.wrong, missFlash * 0.3);
    }

    // Trail
    for (var tri = 0; tri < trail.length; tri++) {
      var tr = trail[tri];
      var tf = 1 - tr.age / 0.4;
      game.draw.circle(tr.x, tr.y, DIVER_R * tf * 0.7, C.trail, tf * 0.3);
    }

    // Rings
    for (var ri = 0; ri < rings.length; ri++) {
      var ring2 = rings[ri];
      var isPassed = ring2.passed;
      var rColor = isPassed ? (ring2.missFlash > 0 ? C.wrong : C.correct) : C.ring;
      var rPulse = 0.6 + 0.4 * Math.abs(Math.sin(game.time.elapsed * 3 + ri));

      if (!isPassed) {
        // Outer glow
        game.draw.circle(ring2.x, ring2.y, ring2.r + 12, C.ringHi, rPulse * 0.2);
        // Ring (hollow — large circle minus smaller circle effect)
        game.draw.circle(ring2.x, ring2.y, ring2.r, C.ring, 0.6);
        game.draw.circle(ring2.x, ring2.y, ring2.r - 16, '#030816', 0.9);
        // Direction indicator
        var nextRingX = ring2.x;
        var arrowDir = nextRingX < DIVER_X ? '←' : (nextRingX > DIVER_X + 20 ? '→' : '↓');
        game.draw.text(arrowDir, ring2.x, ring2.y - ring2.r - 40, { size: 48, color: C.ringHi });
      } else if (ring2.missFlash > 0) {
        game.draw.circle(ring2.x, ring2.y, ring2.r + ring2.missFlash * 40, C.wrong, ring2.missFlash * 0.3);
      }
    }

    // Diver
    var divPulse = 0.7 + 0.3 * Math.abs(Math.sin(game.time.elapsed * 6));
    game.draw.circle(DIVER_X, DIVER_Y, DIVER_R + 8, C.diverHi, divPulse * 0.3);
    game.draw.circle(DIVER_X, DIVER_Y, DIVER_R, C.diver);
    game.draw.circle(DIVER_X - 8, DIVER_Y - 8, 8, '#fff', 0.4);
    // Parachute suggestion
    game.draw.circle(DIVER_X, DIVER_Y - 56, 36, C.diverHi, 0.2);

    // Score + misses
    for (var s = 0; s < needed; s++) {
      var sx = W / 2 + (s - (needed - 1) / 2) * 72;
      game.draw.circle(sx, 136, 22, s < score ? C.correct : '#060a18');
    }
    for (var mi = 0; mi < maxMisses; mi++) {
      var mx = W / 2 + (mi - (maxMisses - 1) / 2) * 60;
      game.draw.circle(mx, 200, 20, mi < misses ? C.wrong : '#060a18');
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, '#030816');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.ring : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Guide
    game.draw.text('←→スワイプでリングをくぐれ！', W / 2, H * 0.88, { size: 44, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    initClouds();
    spawnRing();
    setTimeout(spawnRing, 600);
  });
})(game);

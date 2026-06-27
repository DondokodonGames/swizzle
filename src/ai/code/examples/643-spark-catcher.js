// 643-spark-catcher.js
// スパークキャッチャー — 飛び散る火花を導線でキャッチしろ
// 操作: タップで導線の位置を変える
// 成功: 40個キャッチ  失敗: 20個逃す or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020105',
    spark:   '#fbbf24',
    sparkHi: '#fef3c7',
    wire:    '#3b82f6',
    wireHi:  '#93c5fd',
    source:  '#f97316',
    sourceHi:'#fed7aa',
    caught:  '#22c55e',
    miss:    '#ef4444',
    text:    '#f1f5f9',
    ui:      '#08050f'
  };

  var SOURCE_X = W / 2;
  var SOURCE_Y = H * 0.42;
  var WIRE_Y = H * 0.78;
  var WIRE_W = 400;
  var wireX = W / 2;
  var targetWireX = W / 2;

  var sparks = [];
  var caught = 0;
  var NEEDED = 40;
  var missed = 0;
  var MAX_MISS = 20;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var spawnTimer = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.caught;

  function spawnSpark() {
    var angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.2;
    var speed = 400 + Math.random() * 200 + elapsed * 4;
    sparks.push({
      x: SOURCE_X,
      y: SOURCE_Y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 12 + Math.random() * 8,
      life: 1,
      trail: []
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    targetWireX = Math.max(WIRE_W / 2 + 20, Math.min(W - WIRE_W / 2 - 20, tx));
    game.audio.play('se_tap', 0.08);
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
    if (flashAnim > 0) flashAnim -= dt * 4;

    wireX += (targetWireX - wireX) * Math.min(1, dt * 11);

    spawnTimer += dt;
    var rate = Math.max(0.06, 0.18 - elapsed * 0.001);
    if (spawnTimer >= rate) {
      spawnTimer = 0;
      spawnSpark();
    }

    // Update sparks
    for (var si = sparks.length - 1; si >= 0; si--) {
      var s = sparks[si];
      s.trail.push({ x: s.x, y: s.y });
      if (s.trail.length > 6) s.trail.shift();

      s.vy += 700 * dt; // gravity
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt * 1.2;

      // Check wire catch
      if (s.y + s.r >= WIRE_Y - 10 && s.y - s.r <= WIRE_Y + 20) {
        if (s.x >= wireX - WIRE_W / 2 && s.x <= wireX + WIRE_W / 2) {
          caught++;
          flashCol = C.caught;
          flashAnim = 0.1;
          game.audio.play('se_success', 0.35);
          for (var p = 0; p < 4; p++) {
            var pa = Math.random() * Math.PI;
            particles.push({ x: s.x, y: WIRE_Y, vx: Math.cos(pa) * 120, vy: -Math.abs(Math.sin(pa)) * 150, life: 0.35, col: C.sparkHi });
          }
          sparks.splice(si, 1);
          if (caught >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(caught * 150 + Math.ceil(timeLeft) * 100); }, 700);
          }
          continue;
        }
      }

      if (s.y > H + 60 || s.x < -100 || s.x > W + 100 || s.life <= 0) {
        if (!done) missed++;
        sparks.splice(si, 1);
        if (missed >= MAX_MISS && !done) {
          done = true;
          flashCol = C.miss;
          flashAnim = 0.4;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 3;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Background glow from source
    var glow = 0.08 + Math.sin(elapsed * 4) * 0.03;
    game.draw.circle(SOURCE_X, SOURCE_Y, 200, C.source, glow);

    // Source
    game.draw.circle(SOURCE_X + 6, SOURCE_Y + 6, 48, '#000', 0.4);
    game.draw.circle(SOURCE_X, SOURCE_Y, 48, C.source, 0.9);
    game.draw.circle(SOURCE_X, SOURCE_Y, 36, C.sourceHi, 0.7);
    game.draw.circle(SOURCE_X - 14, SOURCE_Y - 14, 18, '#fff', 0.4);

    // Sparks
    for (var si2 = 0; si2 < sparks.length; si2++) {
      var s2 = sparks[si2];
      for (var ti = 0; ti < s2.trail.length; ti++) {
        var t = s2.trail[ti];
        game.draw.circle(t.x, t.y, s2.r * (ti / s2.trail.length) * 0.6, C.spark, (ti / s2.trail.length) * 0.4 * s2.life);
      }
      game.draw.circle(s2.x, s2.y, s2.r, C.spark, s2.life * 0.9);
      game.draw.circle(s2.x, s2.y, s2.r * 0.5, C.sparkHi, s2.life * 0.7);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 8 * p2.life, p2.col, p2.life);
    }

    // Wire
    var wx = wireX - WIRE_W / 2;
    // Wire glow
    game.draw.rect(wx - 8, WIRE_Y - 8, WIRE_W + 16, 32, C.wireHi, 0.08);
    game.draw.rect(wx, WIRE_Y, WIRE_W, 14, C.wire, 0.9);
    game.draw.rect(wx, WIRE_Y, WIRE_W, 6, C.wireHi, 0.5);
    game.draw.circle(wx, WIRE_Y + 7, 16, C.wireHi, 0.7);
    game.draw.circle(wx + WIRE_W, WIRE_Y + 7, 16, C.wireHi, 0.7);

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    // Count display
    var missRatio = missed / MAX_MISS;
    game.draw.rect(0, H * 0.93, W * missRatio, 16, C.miss, 0.5);
    game.draw.text(caught + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    game.draw.text('逃: ' + missed + '/' + MAX_MISS, W / 2, H * 0.96, { size: 36, color: missRatio > 0.6 ? C.miss : '#ffffff55' });

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.wireHi : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    for (var i = 0; i < 3; i++) spawnSpark();
  });
})(game);

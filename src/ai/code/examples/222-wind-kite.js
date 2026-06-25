// 222-wind-kite.js
// ウィンドカイト — 風に揺れる凧糸をさばいて凧を安定させる繊細な操作ゲーム
// 操作: タップで凧の左右をコントロール
// 成功: 30秒安定飛行  失敗: 凧が地面か端に当たる

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#06091a',
    sky:    '#0c1a3a',
    cloud:  '#1e3a5f',
    kite:   '#ef4444',
    kiteHi: '#fca5a5',
    kiteTr: '#3b82f6',
    string: '#94a3b8',
    wind:   '#22c55e',
    ui:     '#475569'
  };

  // Kite physics
  var kiteX = W / 2;
  var kiteY = H * 0.22;
  var kiteVX = 0;
  var kiteVY = 0;
  var KITE_R = 48;
  var STRING_LENGTH = 400;

  // Anchor (held by player at bottom)
  var anchorX = W / 2;
  var anchorY = H * 0.82;

  var windX = 0; // current wind X force
  var windTimer = 0;
  var survived = 0;
  var NEEDED = 30;
  var done = false;
  var elapsed = 0;
  var trail = [];
  var clouds = [];

  // Generate clouds
  for (var ci = 0; ci < 5; ci++) {
    clouds.push({ x: Math.random() * W, y: H * 0.1 + Math.random() * H * 0.35, w: 100 + Math.random() * 150, vx: 20 + Math.random() * 40 });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Tap left side pulls kite left, right side pulls right
    var pull = (tx - W / 2) / (W / 2);
    kiteVX += pull * 200;
    game.audio.play('se_tap', 0.2);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      survived += dt;
      elapsed += dt;
      if (survived >= NEEDED) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(Math.ceil(survived) * 80 + 500); }, 400);
        return;
      }
    }

    // Wind changes
    windTimer -= dt;
    if (windTimer <= 0) {
      windX = (Math.random() - 0.5) * 500;
      windTimer = 1.5 + Math.random() * 2.5;
    }

    // Kite physics
    kiteVX += windX * dt * 0.3;
    kiteVY += -50 * dt; // slight upward lift
    kiteVY += 80 * dt;  // gravity pull down

    kiteX += kiteVX * dt;
    kiteY += kiteVY * dt;
    kiteVX *= 0.97;
    kiteVY *= 0.97;

    // String constraint — kite can't go farther than string length from anchor
    var dx = kiteX - anchorX;
    var dy = kiteY - anchorY;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > STRING_LENGTH) {
      kiteX = anchorX + (dx / dist) * STRING_LENGTH;
      kiteY = anchorY + (dy / dist) * STRING_LENGTH;
      // Reflect velocity along string
      var nx = dx / dist, ny = dy / dist;
      var dot = kiteVX * nx + kiteVY * ny;
      if (dot > 0) {
        kiteVX -= dot * nx * 1.5;
        kiteVY -= dot * ny * 1.5;
      }
    }

    // Boundary check
    if (kiteX < KITE_R || kiteX > W - KITE_R || kiteY > H * 0.78 || kiteY < 20) {
      if (!done) {
        done = true;
        game.audio.play('se_failure');
        setTimeout(function() { game.end.failure(); }, 400);
      }
    }

    // Trail
    trail.push({ x: kiteX, y: kiteY, life: 0.4 });
    for (var ti = trail.length - 1; ti >= 0; ti--) {
      trail[ti].life -= dt;
      if (trail[ti].life <= 0) trail.splice(ti, 1);
    }

    // Move clouds
    for (var ci2 = 0; ci2 < clouds.length; ci2++) {
      clouds[ci2].x += clouds[ci2].vx * dt;
      if (clouds[ci2].x > W + 200) clouds[ci2].x = -200;
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H * 0.85, C.sky, 0.5);

    // Clouds
    for (var ci3 = 0; ci3 < clouds.length; ci3++) {
      var cl = clouds[ci3];
      game.draw.rect(cl.x - cl.w / 2, cl.y - 20, cl.w, 40, C.cloud, 0.4);
      game.draw.circle(cl.x - cl.w * 0.25, cl.y - 20, 30, C.cloud, 0.4);
      game.draw.circle(cl.x + cl.w * 0.1, cl.y - 30, 40, C.cloud, 0.4);
      game.draw.circle(cl.x + cl.w * 0.35, cl.y - 15, 25, C.cloud, 0.4);
    }

    // Wind indicator
    var windStrength = Math.abs(windX) / 500;
    var windDir = windX > 0 ? '→' : '←';
    var windCol = windStrength > 0.6 ? '#ef4444' : windStrength > 0.3 ? '#f59e0b' : C.wind;
    game.draw.text('風 ' + windDir, W / 2, H * 0.89, { size: 42, color: windCol, bold: true });

    // String
    game.draw.line(anchorX, anchorY, kiteX, kiteY, C.string, 2);

    // Trail
    for (var ti2 = 0; ti2 < trail.length; ti2++) {
      var t = trail[ti2];
      game.draw.circle(t.x, t.y, 8 * t.life, C.kiteHi, t.life * 0.2);
    }

    // Kite (diamond shape)
    game.draw.line(kiteX, kiteY - KITE_R, kiteX + KITE_R, kiteY, C.kite, 3);
    game.draw.line(kiteX + KITE_R, kiteY, kiteX, kiteY + KITE_R, C.kite, 3);
    game.draw.line(kiteX, kiteY + KITE_R, kiteX - KITE_R, kiteY, C.kite, 3);
    game.draw.line(kiteX - KITE_R, kiteY, kiteX, kiteY - KITE_R, C.kite, 3);
    // Fill diagonal
    game.draw.line(kiteX, kiteY - KITE_R, kiteX, kiteY + KITE_R, C.kiteTr, 3);
    game.draw.line(kiteX - KITE_R, kiteY, kiteX + KITE_R, kiteY, C.kiteHi, 3);
    game.draw.circle(kiteX, kiteY, 12, '#fff', 0.7);

    // Tail
    for (var ta = 0; ta < 4; ta++) {
      var tailX = kiteX + Math.sin(elapsed * 3 + ta * 0.8) * 15;
      var tailY = kiteY + KITE_R + ta * 24;
      game.draw.circle(tailX, tailY, 8, C.kiteTr, 0.6 - ta * 0.1);
    }

    // Anchor person
    game.draw.circle(anchorX, anchorY, 28, C.kiteHi, 0.7);
    game.draw.text('✋', anchorX, anchorY, { size: 36 });

    // Controls hint
    game.draw.text('左右タップで操作', W / 2, H * 0.92, { size: 36, color: C.ui });

    var ratio = Math.min(1, survived / NEEDED);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, '#22c55e');
    game.draw.text(survived.toFixed(1) + 's', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
  });
})(game);

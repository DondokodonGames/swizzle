// 230-crowd-surf.js
// クラウドサーフ — ライブ会場でクラウドサーフ！群衆が手を伸ばすタイミングで乗り継ぐ
// 操作: タップで次の手に飛び移る
// 成功: 30メートル進む  失敗: 手がない所に落ちる or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#080412',
    crowd:  '#312e81',
    crowdHi:'#6d28d9',
    hand:   '#a855f7',
    handHi: '#d8b4fe',
    player: '#f59e0b',
    plrHi:  '#fde68a',
    light:  '#1e3a5f',
    ok:     '#22c55e',
    fail:   '#ef4444',
    ui:     '#475569'
  };

  var PLAYER_R = 30;
  var HAND_R = 40;
  var CATCH_R = 80;

  var px = W / 2;
  var py = H * 0.35;
  var pvx = 0;
  var pvy = 0;
  var onHand = -1; // index of hand player is on, -1 if airborne

  var hands = [];
  var spawnX = W + 100;
  var spawnTimer = 0;
  var SPAWN_INTERVAL = 0.9;
  var scrollSpeed = 180; // hands scroll left
  var distance = 0;
  var NEEDED = 30;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var lights = [];

  // Crowd lights in background
  for (var li = 0; li < 30; li++) {
    lights.push({ x: Math.random() * W, y: H * 0.5 + Math.random() * H * 0.5, phase: Math.random() * Math.PI * 2 });
  }

  function spawnHand() {
    var upTimer = 0.6 + Math.random() * 1.2; // how long it stays up
    hands.push({
      x: spawnX,
      y: H * 0.38 + (Math.random() - 0.5) * 100,
      upTimer: upTimer,
      totalUp: upTimer,
      phase: 'rising', // 'rising' | 'up' | 'falling'
      yBase: H * 0.38 + (Math.random() - 0.5) * 100,
      riseAmt: 80 + Math.random() * 60,
      vy: 0
    });
  }

  function getHandY(h) {
    var prog = 1 - h.upTimer / h.totalUp;
    if (h.phase === 'rising') return h.yBase + h.riseAmt * (1 - prog * 3);
    if (h.phase === 'up') return h.yBase;
    return h.yBase + h.riseAmt * prog;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Jump toward tapped direction
    if (onHand >= 0) {
      pvx = (tx - px) * 2.5;
      pvy = -600;
      onHand = -1;
      game.audio.play('se_tap', 0.4);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // Update distance
    if (onHand >= 0) {
      distance += scrollSpeed * dt;
      if (distance >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(Math.ceil(distance) * 50 + Math.ceil(timeLeft) * 40); }, 400);
      }
    }

    // Spawn hands
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnHand();
      spawnTimer = SPAWN_INTERVAL * (0.7 + Math.random() * 0.6);
    }

    // Scroll and update hands
    for (var hi = hands.length - 1; hi >= 0; hi--) {
      var h = hands[hi];
      h.x -= scrollSpeed * dt;

      h.upTimer -= dt;
      if (h.upTimer < 0) {
        if (h.phase === 'up') h.phase = 'falling';
        else if (h.phase === 'rising') h.phase = 'up';
        h.upTimer = h.totalUp * 0.3;
      }

      if (h.x < -100) {
        if (onHand === hi) {
          onHand = -1;
          pvy = 400;
        }
        hands.splice(hi, 1);
        continue;
      }

      // Update player if on this hand
      if (onHand === hi) {
        px = h.x;
        py = getHandY(h) - PLAYER_R;
        pvx = -scrollSpeed;
        pvy = 0;
      }
    }

    // Airborne player physics
    if (onHand < 0) {
      pvx *= 0.95;
      pvy += 800 * dt;
      px += pvx * dt;
      py += pvy * dt;

      // Wall bounds
      px = Math.max(PLAYER_R, Math.min(W - PLAYER_R, px));

      // Check if caught by a hand
      for (var hi2 = 0; hi2 < hands.length; hi2++) {
        if (hands[hi2].phase === 'falling') continue;
        var handY = getHandY(hands[hi2]);
        var dx = px - hands[hi2].x;
        var dy = py - handY;
        if (Math.sqrt(dx * dx + dy * dy) < CATCH_R && pvy > 0) {
          onHand = hi2;
          py = handY - PLAYER_R;
          pvy = 0;
          game.audio.play('se_success', 0.4);
          break;
        }
      }

      // Fell to crowd level
      if (py > H * 0.55 && onHand < 0 && !done) {
        done = true;
        game.audio.play('se_failure');
        setTimeout(function() { game.end.failure(); }, 400);
      }
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Crowd background
    game.draw.rect(0, H * 0.45, W, H * 0.55, C.crowd, 0.5);

    // Lights
    for (var li2 = 0; li2 < lights.length; li2++) {
      var l = lights[li2];
      var lPulse = 0.3 + 0.7 * Math.abs(Math.sin(elapsed * 2 + l.phase));
      game.draw.circle(l.x, l.y, 20, C.light, lPulse * 0.6);
      game.draw.circle(l.x, l.y, 8, '#fff', lPulse * 0.4);
    }

    // Crowd silhouettes
    for (var si = 0; si < 15; si++) {
      var cx = si * (W / 14);
      game.draw.rect(cx - 18, H * 0.5 + Math.sin(si * 1.3 + elapsed) * 10, 36, H * 0.5, C.crowdHi, 0.6);
      game.draw.circle(cx, H * 0.5 + Math.sin(si * 1.3 + elapsed) * 10, 22, C.crowdHi, 0.7);
    }

    // Hands
    for (var hi3 = 0; hi3 < hands.length; hi3++) {
      var h2 = hands[hi3];
      var handY2 = getHandY(h2);
      var isActive = h2.phase !== 'falling';
      var col = isActive ? C.hand : C.crowdHi;
      var hi4 = isActive ? C.handHi : C.hand;

      // Arm
      game.draw.line(h2.x, H * 0.55, h2.x, handY2 + HAND_R, col, 30);
      // Hand
      game.draw.circle(h2.x, handY2, HAND_R + (isActive ? 6 : 0), hi4, isActive ? 0.3 : 0.1);
      game.draw.circle(h2.x, handY2, HAND_R, col, isActive ? 0.85 : 0.4);
    }

    // Player
    game.draw.circle(px, py, PLAYER_R + 8, C.plrHi, 0.3);
    game.draw.circle(px, py, PLAYER_R, C.player, 0.9);
    game.draw.circle(px - 8, py - 8, 10, '#fff', 0.4);
    // Motion trail when airborne
    if (onHand < 0) {
      for (var ti = 0; ti < 4; ti++) {
        game.draw.circle(px - pvx * dt * (ti + 1), py - pvy * dt * (ti + 1), PLAYER_R * (1 - ti * 0.2), C.plrHi, 0.1);
      }
    }

    // Distance bar
    var distRatio = Math.min(1, distance / NEEDED);
    game.draw.rect(0, H * 0.9, W, 20, C.ui, 0.3);
    game.draw.rect(0, H * 0.9, W * distRatio, 20, C.ok, 0.8);
    game.draw.text(Math.floor(distance) + 'm / ' + NEEDED + 'm', W / 2, H * 0.93, { size: 44, color: '#f1f5f9', bold: true });
    game.draw.text('タップで飛び移る！', W / 2, H * 0.96, { size: 36, color: C.ui });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.hand : C.fail);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    // Start on a hand
    spawnHand();
    hands[0].x = W / 2;
    onHand = 0;
    px = hands[0].x;
    py = H * 0.35;
    spawnTimer = SPAWN_INTERVAL;
  });
})(game);

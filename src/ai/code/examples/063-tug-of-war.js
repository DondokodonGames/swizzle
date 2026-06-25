// 063-tug-of-war.js
// 綱引き — 素早くタップして綱を引き、中心を自陣に引き込む筋力勝負
// 操作: 連打でロープを引く
// 成功: ロープを自陣まで引ける  失敗: 15秒で中心を引き込まれる

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#060410',
    ropeMid:  '#92400e',
    ropeHi:   '#d97706',
    playerSide:'#3b82f6',
    enemySide: '#ef4444',
    midMarker: '#fff',
    ui:        '#475569'
  };

  var position = 0.5; // 0=player wins (left), 1=enemy wins (right)
  var PLAYER_WIN = 0.18;
  var ENEMY_WIN = 0.82;
  var PULL_STRENGTH = 0.018; // per tap
  var ENEMY_STRENGTH = 0.0055; // per second (constant enemy pull)

  var timeLeft = 15;
  var done = false;
  var ropeShake = 0;
  var tapFlash = 0;

  // Notch animations when tapping
  var notches = [];

  game.onTap(function(x, y) {
    if (done) return;
    position -= PULL_STRENGTH * (1 + (0.5 - timeLeft / 15) * 0.5);
    if (position < 0) position = 0;
    ropeShake = 0.1;
    tapFlash = 0.08;
    notches.push({ x: W * position, y: H * 0.5, life: 0.3, dir: -1 });
    game.audio.play('se_tap', 0.5);

    if (position <= PLAYER_WIN && !done) {
      done = true;
      game.audio.play('se_success');
      setTimeout(function() { game.end.success(200 + Math.ceil(timeLeft) * 15); }, 400);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        // If position is in player's favor at time's up
        if (position < 0.5) {
          game.audio.play('se_success');
          game.end.success(100);
        } else {
          game.audio.play('se_failure');
          game.end.failure();
        }
        return;
      }
    }

    // Enemy constantly pulls
    position += ENEMY_STRENGTH * dt * (1 + (15 - timeLeft) * 0.04);
    if (position > 1) position = 1;

    if (position >= ENEMY_WIN && !done) {
      done = true;
      game.audio.play('se_failure');
      setTimeout(function() { game.end.failure(); }, 400);
    }

    if (ropeShake > 0) ropeShake -= dt;
    if (tapFlash > 0) tapFlash -= dt;

    for (var n = notches.length - 1; n >= 0; n--) {
      notches[n].life -= dt;
      notches[n].x += notches[n].dir * 120 * dt;
      if (notches[n].life <= 0) notches.splice(n, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    var ROPE_Y = H * 0.5;
    var ROPE_H = 48;
    var shakeOffset = ropeShake > 0 ? Math.sin(game.time.elapsed * 40) * 12 : 0;

    // Ground
    game.draw.rect(0, ROPE_Y + 60, W, H - ROPE_Y - 60, '#0a0820', 1.0);

    // Sides (colored zones)
    game.draw.rect(0, ROPE_Y - 200, W * position, 400, C.playerSide, 0.06);
    game.draw.rect(W * position, ROPE_Y - 200, W * (1 - position), 400, C.enemySide, 0.06);

    // Rope segments
    var ropeX = W * position;
    var segCount = 20;
    for (var s = 0; s < segCount; s++) {
      var sx = (s / segCount) * W;
      var ex = ((s + 1) / segCount) * W;
      var sag = Math.sin(s / segCount * Math.PI) * 30;
      var sy = ROPE_Y + sag + shakeOffset;
      game.draw.line(sx, sy, ex, sy, s % 2 === 0 ? C.ropeMid : C.ropeHi, ROPE_H);
    }

    // Rope texture stripes
    for (var rs = 0; rs < 8; rs++) {
      var rsx = (rs / 8) * W;
      game.draw.line(rsx, ROPE_Y - ROPE_H / 2 + shakeOffset, rsx + 40, ROPE_Y + ROPE_H / 2 + shakeOffset, C.ropeHi, 4);
    }

    // Win/lose zone markers
    game.draw.line(W * PLAYER_WIN, ROPE_Y - 140, W * PLAYER_WIN, ROPE_Y + 140, C.playerSide, 6);
    game.draw.circle(W * PLAYER_WIN, ROPE_Y - 140, 20, C.playerSide, 0.8);
    game.draw.text('← WIN', W * PLAYER_WIN - 20, ROPE_Y - 180, { size: 36, color: C.playerSide, bold: true });

    game.draw.line(W * ENEMY_WIN, ROPE_Y - 140, W * ENEMY_WIN, ROPE_Y + 140, C.enemySide, 6);
    game.draw.circle(W * ENEMY_WIN, ROPE_Y - 140, 20, C.enemySide, 0.8);
    game.draw.text('LOSE →', W * ENEMY_WIN + 20, ROPE_Y - 180, { size: 36, color: C.enemySide, bold: true });

    // Center marker (the knot on the rope)
    game.draw.circle(W * position, ROPE_Y + shakeOffset, 36, C.midMarker);
    game.draw.circle(W * position, ROPE_Y + shakeOffset, 22, '#1a1028');
    game.draw.circle(W * position, ROPE_Y + shakeOffset, 12, C.midMarker, 0.6);

    // Notch animations
    for (var nc = 0; nc < notches.length; nc++) {
      var n2 = notches[nc];
      var na = n2.life / 0.3;
      game.draw.circle(n2.x, ROPE_Y, 28 * na, C.playerSide, na * 0.7);
    }

    // Tap flash
    if (tapFlash > 0) {
      game.draw.rect(0, 0, W, H, C.playerSide, tapFlash / 0.08 * 0.08);
    }

    // Player indicator (crowd on left)
    game.draw.text('あなた', W * 0.1, ROPE_Y + 120, { size: 44, color: C.playerSide, bold: true });
    game.draw.text('敵', W * 0.9, ROPE_Y + 120, { size: 44, color: C.enemySide, bold: true });

    // Position bar
    game.draw.rect(0, H - 80, W, 40, '#0a0820');
    game.draw.rect(0, H - 80, W * (1 - position), 40, C.playerSide);
    game.draw.rect(W * (1 - position), H - 80, W * position, 40, C.enemySide);
    game.draw.circle(W * (1 - position), H - 60, 24, '#fff');

    // Timer bar
    var ratio = Math.max(0, timeLeft / 15);
    game.draw.rect(0, 0, W, 72, '#060410');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.playerSide : C.enemySide);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Guide
    game.draw.text('連打で綱を引け！', W / 2, H - 200, { size: 60, color: C.ui, bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
  });
})(game);

// 653-quake-run.js
// クエイクラン — 地震で崩れる足場から走り続けろ
// 操作: タップで走る速度を加速/スワイプで障害物を飛び越える
// 成功: 500m走破  失敗: 穴に落ちる5回 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#080400',
    ground:  '#78350f',
    groundHi:'#a16207',
    crack:   '#1c0a00',
    player:  '#22c55e',
    playerHi:'#86efac',
    sky:     '#0c0a00',
    dust:    '#d97706',
    hit:     '#ef4444',
    safe:    '#22c55e',
    text:    '#f1f5f9',
    ui:      '#150800'
  };

  var PLAYER_X = W * 0.25;
  var PLAYER_Y = H * 0.72;
  var PLAYER_R = 36;
  var GROUND_Y = H * 0.78;

  var playerVY = 0;
  var onGround = true;
  var JUMP_POWER = -900;
  var GRAVITY = 1800;

  var segments = [];
  var scrollX = 0;
  var scrollSpeed = 300;
  var distance = 0;
  var NEEDED_DIST = 500;

  var fell = 0;
  var MAX_FELL = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var quakeAmt = 0;
  var quakeTimer = 0;

  function genSegment(x) {
    var isGap = Math.random() < 0.25 + elapsed * 0.005;
    var width = isGap ? (80 + Math.random() * 80) : (180 + Math.random() * 200);
    segments.push({ x: x, w: width, isGap: isGap });
    return x + width;
  }

  function initTrack() {
    segments = [];
    var x = 0;
    // First solid chunk
    x = x + 600;
    segments.push({ x: 0, w: 600, isGap: false });
    for (var i = 0; i < 20; i++) {
      x = genSegment(x);
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (onGround) {
      // Tap on upper half = jump
      if (ty < H * 0.65) {
        playerVY = JUMP_POWER;
        onGround = false;
        game.audio.play('se_tap', 0.15);
      } else {
        // Tap on lower half = boost speed temporarily
        scrollSpeed = Math.min(700, scrollSpeed + 80);
      }
    }
  });

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'up' && onGround) {
      playerVY = JUMP_POWER * 1.2;
      onGround = false;
      game.audio.play('se_tap', 0.2);
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
    if (flashAnim > 0) flashAnim -= dt * 4;

    // Quake effect
    quakeTimer -= dt;
    if (quakeTimer <= 0) {
      quakeTimer = 2 + Math.random() * 3;
      quakeAmt = 8 + Math.random() * 12;
      game.audio.play('se_failure', 0.1);
    }
    quakeAmt *= (1 - dt * 4);
    var shake = (Math.random() - 0.5) * quakeAmt;

    // Scroll speed decay
    scrollSpeed = Math.max(300, scrollSpeed - dt * 60);
    scrollX += scrollSpeed * dt;
    distance += scrollSpeed * dt / 100;

    // Extend track
    var lastSeg = segments[segments.length - 1];
    while (lastSeg && lastSeg.x + lastSeg.w - scrollX < W + 200) {
      var newX = lastSeg.x + lastSeg.w;
      newX = genSegment(newX);
      lastSeg = segments[segments.length - 1];
    }

    // Remove off-screen segments
    while (segments.length > 0 && segments[0].x + segments[0].w < scrollX - 100) {
      segments.shift();
    }

    // Player physics
    if (!onGround) {
      playerVY += GRAVITY * dt;
      PLAYER_Y += playerVY * dt;
    }

    // Find ground under player
    var playerAbsX = scrollX + PLAYER_X;
    var groundFound = false;
    for (var si = 0; si < segments.length; si++) {
      var seg = segments[si];
      if (seg.isGap) continue;
      if (playerAbsX + PLAYER_R > seg.x && playerAbsX - PLAYER_R < seg.x + seg.w) {
        if (PLAYER_Y + PLAYER_R >= GROUND_Y && playerVY >= 0) {
          PLAYER_Y = GROUND_Y - PLAYER_R;
          playerVY = 0;
          onGround = true;
          groundFound = true;
        }
        break;
      }
    }
    if (!groundFound && PLAYER_Y > GROUND_Y - PLAYER_R) {
      onGround = false;
    }

    // Fall into gap
    if (PLAYER_Y > H) {
      fell++;
      flashAnim = 0.5;
      game.audio.play('se_failure', 0.4);
      for (var p = 0; p < 6; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: PLAYER_X, y: GROUND_Y, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.5, col: C.dust });
      }
      if (fell >= MAX_FELL && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
        return;
      }
      // Respawn
      PLAYER_Y = GROUND_Y - PLAYER_R - 10;
      playerVY = 0;
      onGround = true;
      scrollX -= 200;
    }

    if (distance >= NEEDED_DIST && !done) {
      done = true;
      game.audio.play('se_success', 0.9);
      setTimeout(function() { game.end.success(Math.floor(distance) * 10 + Math.ceil(timeLeft) * 100); }, 700);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    var sy2 = shake;
    game.draw.rect(0, 0, W, H, C.bg);

    // Sky gradient
    game.draw.rect(0, 0, W, H * 0.75, C.sky, 0.7);

    // Ground segments
    for (var si2 = 0; si2 < segments.length; si2++) {
      var seg2 = segments[si2];
      if (seg2.isGap) continue;
      var sx = seg2.x - scrollX;
      var sy3 = GROUND_Y + sy2;
      // Ground block
      game.draw.rect(sx, sy3, seg2.w, H - sy3, C.groundHi, 0.3);
      game.draw.rect(sx, sy3, seg2.w, H - sy3, C.ground, 0.8);
      game.draw.rect(sx, sy3, seg2.w, 16, C.groundHi, 0.5);
      // Cracks from quake
      if (quakeAmt > 4) {
        for (var ci = 0; ci < 3; ci++) {
          var cx = sx + (ci + 1) * seg2.w / 4;
          game.draw.line(cx, sy3 + 16, cx + (Math.random() - 0.5) * 20, sy3 + 60, C.crack, 3);
        }
      }
    }

    // Dust particles from quake
    if (quakeAmt > 3) {
      for (var di = 0; di < 3; di++) {
        var dpr = Math.random();
        particles.push({
          x: Math.random() * W,
          y: GROUND_Y - 20,
          vx: (Math.random() - 0.5) * 100,
          vy: -50 - Math.random() * 100,
          life: 0.3 + Math.random() * 0.3,
          col: C.dust
        });
      }
    }

    // Player
    game.draw.circle(PLAYER_X + 4, PLAYER_Y + sy2 + 4, PLAYER_R, '#000', 0.3);
    game.draw.circle(PLAYER_X, PLAYER_Y + sy2, PLAYER_R, C.player, 0.9);
    game.draw.circle(PLAYER_X - 10, PLAYER_Y + sy2 - 10, PLAYER_R * 0.3, C.playerHi, 0.5);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 8 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.hit, flashAnim * 0.1);

    // Distance bar
    var distRatio = Math.min(1, distance / NEEDED_DIST);
    game.draw.rect(40, H * 0.9, W - 80, 20, C.ui, 0.8);
    game.draw.rect(40, H * 0.9, (W - 80) * distRatio, 20, C.safe, 0.8);
    game.draw.text(Math.floor(distance) + 'm', W / 2, H * 0.9 + 40, { size: 32, color: C.text });

    // Fall dots
    for (var fi = 0; fi < MAX_FELL; fi++) {
      game.draw.circle(W / 2 - (MAX_FELL - 1) * 52 + fi * 104, H * 0.955, 22, fi < fell ? C.hit : C.ui, 0.9);
    }

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.safe : C.hit);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    initTrack();
    quakeTimer = 3;
  });
})(game);

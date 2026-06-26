// 454-lava-jump.js
// 溶岩ジャンプ — 上昇する溶岩から逃げながらプラットフォームを跳び越える
// 操作: タップでジャンプ（長押しで高くジャンプ）
// 成功: 高さ2000m到達  失敗: 溶岩に飲まれる or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0300',
    lava:   '#dc2626',
    lavaHi: '#f97316',
    lavaGlo:'#fbbf24',
    platform:'#78350f',
    platformHi:'#d97706',
    player: '#e2e8f0',
    playerHi:'#fff',
    cave:   '#1c0a00',
    caveHi: '#2d1000',
    rock:   '#374151',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var GRAVITY = 1800;
  var JUMP_VEL = -800;
  var PLATFORM_W = 180;
  var PLATFORM_H = 24;

  var player = { x: W/2, y: H*0.5, vy: 0, onGround: false };
  var platforms = [];
  var lavaY = H + 100;
  var lavaSpeed = 60;
  var scrollY = 0;
  var maxHeight = 0;
  var targetHeight = 2000;
  var holding = false;
  var holdTime = 0;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var lavaAnim = 0;
  var particles = [];

  function addPlatform(y) {
    var x = 100 + Math.random() * (W - 300);
    platforms.push({ x: x, y: y, w: PLATFORM_W - Math.floor(maxHeight/200) * 10 });
  }

  function initPlatforms() {
    platforms = [];
    var y = H * 0.7;
    for (var i = 0; i < 15; i++) {
      addPlatform(y);
      y -= 160 + Math.random() * 80;
    }
    player.x = platforms[0].x + platforms[0].w/2;
    player.y = platforms[0].y - 40;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (player.onGround && !holding) {
      holding = true;
      holdTime = 0;
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

    lavaAnim += dt * 3;

    // Hold detection (simplified: tap releases on next frame)
    if (holding) {
      holdTime += dt;
      if (holdTime > 0.3) {
        // Perform jump
        var jumpPower = 1 + Math.min(holdTime - 0.3, 0.3) * 2;
        player.vy = JUMP_VEL * jumpPower;
        player.onGround = false;
        holding = false;
        game.audio.play('se_tap', 0.4);
        for (var pi = 0; pi < 5; pi++) {
          var ang = Math.PI + (Math.random() - 0.5) * 1.5;
          particles.push({ x: player.x, y: player.y + 20, vx: Math.cos(ang)*80, vy: Math.sin(ang)*80, life: 0.4, col: C.lavaGlo });
        }
      }
    }

    // Physics
    player.vy += GRAVITY * dt;
    player.y += player.vy * dt;
    player.onGround = false;

    // Platform collision
    for (var pi2 = 0; pi2 < platforms.length; pi2++) {
      var p = platforms[pi2];
      var py = p.y + scrollY;
      if (player.vy > 0 && player.y + 20 >= py && player.y + 20 <= py + PLATFORM_H + 20 &&
          player.x > p.x + scrollY*0 && player.x < p.x + p.w) {
        player.y = py - 20;
        player.vy = 0;
        player.onGround = true;
        // Auto-jump if not holding
        if (!holding) {
          holding = true;
          holdTime = 0.2;
        }
        break;
      }
    }

    // Auto jump release after short time
    if (holding && holdTime > 0.5) {
      player.vy = JUMP_VEL * (1 + (holdTime - 0.3));
      player.onGround = false;
      holding = false;
    }

    // Scroll
    var screenPlayerY = player.y;
    if (screenPlayerY < H * 0.4) {
      var scroll = H * 0.4 - screenPlayerY;
      scrollY += scroll;
      player.y += scroll;
      lavaY += scroll;
    }

    // Height
    var height = Math.floor(scrollY / 10);
    if (height > maxHeight) {
      maxHeight = height;
      lavaSpeed = 60 + maxHeight * 0.03;
    }

    // Lava rises
    lavaY -= lavaSpeed * dt;

    // Spawn more platforms
    var topPlatY = platforms.length > 0 ? Math.min.apply(null, platforms.map(function(p) { return p.y + scrollY; })) : 0;
    while (topPlatY > -200) {
      var newY = topPlatY - (160 + Math.random() * 80);
      addPlatform(newY - scrollY);
      topPlatY = newY;
    }
    // Remove offscreen platforms
    platforms = platforms.filter(function(p) { return p.y + scrollY < H + 100; });

    // Check lava death
    if (player.y + 25 > lavaY && !done) {
      done = true;
      game.audio.play('se_failure', 0.7);
      setTimeout(function() { game.end.failure(); }, 600);
      return;
    }

    // Check win
    if (maxHeight >= targetHeight && !done) {
      done = true;
      game.audio.play('se_success', 0.8);
      setTimeout(function() { game.end.success(maxHeight * 20 + Math.ceil(timeLeft) * 80); }, 700);
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.cave);
    // Cave walls
    for (var cw = 0; cw < 5; cw++) {
      var rockY = (cw * 380 + scrollY) % H;
      game.draw.circle(40, rockY, 30 + Math.sin(cw)*10, C.rock, 0.5);
      game.draw.circle(W-50, rockY + 120, 25 + Math.cos(cw)*8, C.rock, 0.4);
    }

    // Platforms
    for (var pi3 = 0; pi3 < platforms.length; pi3++) {
      var pl = platforms[pi3];
      var plY = pl.y + scrollY;
      if (plY < -40 || plY > H + 40) continue;
      game.draw.rect(pl.x, plY, pl.w, PLATFORM_H, C.platform, 0.9);
      game.draw.rect(pl.x, plY, pl.w, 6, C.platformHi, 0.7);
    }

    // Player
    game.draw.circle(player.x, player.y, 24, C.player, 0.9);
    game.draw.circle(player.x, player.y - 8, 18, C.playerHi, 0.6);
    // Jump animation
    if (!player.onGround) {
      game.draw.circle(player.x, player.y + 20, 10, C.lavaGlo, 0.3);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 8 * p2.life, p2.col, p2.life * 0.8);
    }

    // Lava
    var lavaTop = lavaY;
    game.draw.rect(0, lavaTop, W, H - lavaTop + 100, C.lava, 0.9);
    // Lava surface waves
    for (var lw = 0; lw < 8; lw++) {
      var lwX = lw * (W/7);
      var lwH = 20 + Math.sin(lavaAnim + lw) * 15;
      game.draw.circle(lwX, lavaTop, lwH, C.lavaHi, 0.8);
    }
    game.draw.rect(0, lavaTop - 8, W, 16, C.lavaGlo, 0.6);

    // Height indicator
    game.draw.text(maxHeight + 'm', W/2, H * 0.88, { size: 44, color: C.lavaGlo, bold: true });
    game.draw.text('目標: ' + targetHeight + 'm', W/2, H * 0.92, { size: 32, color: C.ui });

    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.cave);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.lavaHi : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });

    // Progress bar (height)
    var hRatio = Math.min(1, maxHeight / targetHeight);
    game.draw.rect(W - 24, 80, 18, H - 160, C.cave, 0.7);
    game.draw.rect(W - 24, 80 + (H - 160) * (1 - hRatio), 18, (H - 160) * hRatio, C.lavaHi, 0.9);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    initPlatforms();
  });
})(game);

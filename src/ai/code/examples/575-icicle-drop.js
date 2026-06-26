// 575-icicle-drop.js
// アイシクルドロップ — 天井から落ちる氷柱をタイミングよく避ける
// 操作: タップで左右に移動
// 成功: 45秒生存  失敗: 氷柱に3回当たる

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#04080f',
    ice:     '#88ccff',
    iceHi:   '#ddeeff',
    iceDk:   '#446688',
    player:  '#f59e0b',
    playerHi:'#fcd34d',
    floor:   '#1a3a5a',
    floorHi: '#2a4a7a',
    snow:    '#ddeeff',
    text:    '#f1f5f9',
    ui:      '#334455',
    hit:     '#ef4444',
    safe:    '#22c55e'
  };

  var PLAYER_R = 36;
  var player = { x: W / 2, y: H * 0.82, vx: 0, targetX: W / 2 };
  var icicles = [];
  var hits = 0;
  var MAX_HITS = 3;
  var done = false;
  var surviveTime = 45;
  var timeLeft = 45;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var nextIcicle = 1.2;
  var hitFlash = 0;
  var invincible = 0;

  function spawnIcicle() {
    var x = 80 + Math.random() * (W - 160);
    var h = 60 + Math.random() * 120;
    icicles.push({
      x: x,
      y: -h,
      w: 20 + Math.random() * 20,
      h: h,
      vy: 0,
      dropping: false,
      warning: 1.5 + Math.random() * 1.5,
      warningTimer: 0
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    player.targetX = tx;
    game.audio.play('se_tap', 0.2);
  });

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    player.targetX = (x1 + x2) / 2;
    game.audio.play('se_tap', 0.15);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(Math.ceil(elapsed) * 100 + (MAX_HITS - hits) * 500); }, 700);
        return;
      }
    }
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (hitFlash > 0) hitFlash -= dt * 3;
    if (invincible > 0) invincible -= dt;

    // Move player toward target
    var dx = player.targetX - player.x;
    player.x += dx * Math.min(1, dt * 8);
    player.x = Math.max(PLAYER_R, Math.min(W - PLAYER_R, player.x));

    // Spawn icicles
    nextIcicle -= dt;
    if (nextIcicle <= 0 && !done) {
      spawnIcicle();
      nextIcicle = Math.max(0.4, 1.2 - elapsed * 0.01);
    }

    var speedMult = 1 + elapsed / 20;

    for (var ii = icicles.length - 1; ii >= 0; ii--) {
      var ic = icicles[ii];

      if (!ic.dropping) {
        // Hang from ceiling, flash warning
        ic.warningTimer += dt;
        ic.y = -ic.h + Math.sin(ic.warningTimer * 10) * 4;
        if (ic.warningTimer >= ic.warning) {
          ic.dropping = true;
          ic.vy = 20;
          game.audio.play('se_tap', 0.2);
        }
        continue;
      }

      // Drop
      ic.vy += 900 * dt * speedMult;
      ic.y += ic.vy * dt;

      // Hit player
      if (invincible <= 0) {
        var cx = ic.x, cy = ic.y + ic.h;
        var pdx = Math.abs(player.x - cx), pdy = Math.abs(player.y - cy);
        if (pdx < ic.w / 2 + PLAYER_R * 0.7 && pdy < PLAYER_R * 1.2) {
          hits++;
          invincible = 1.5;
          hitFlash = 0.4;
          game.audio.play('se_failure', 0.5);
          for (var pi = 0; pi < 8; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: player.x, y: player.y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200 - 100, life: 0.4, col: C.ice });
          }
          icicles.splice(ii, 1);
          if (hits >= MAX_HITS && !done) {
            done = true;
            game.audio.play('se_failure', 0.7);
            setTimeout(function() { game.end.failure(); }, 600);
          }
          continue;
        }
      }

      // Hit floor
      if (ic.y + ic.h > H * 0.88) {
        // Shatter
        for (var pi2 = 0; pi2 < 6; pi2++) {
          var ang2 = Math.random() * Math.PI - Math.PI;
          particles.push({ x: ic.x, y: H * 0.88, vx: Math.cos(ang2) * 150, vy: Math.sin(ang2) * 150 - 100, life: 0.35, col: C.iceHi });
        }
        game.audio.play('se_tap', 0.15);
        icicles.splice(ii, 1);
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 400 * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Ceiling
    game.draw.rect(0, 0, W, 20, C.ice, 0.7);

    // Icicles
    for (var ii2 = 0; ii2 < icicles.length; ii2++) {
      var ic2 = icicles[ii2];
      var warnAlpha = ic2.dropping ? 0 : (Math.sin(ic2.warningTimer * 12) * 0.3 + 0.5);
      var alpha = ic2.dropping ? 0.9 : 0.7;

      // Warning glow
      if (!ic2.dropping) {
        game.draw.rect(ic2.x - ic2.w / 2 - 10, 0, ic2.w + 20, H, '#88aaff', warnAlpha * 0.05);
      }

      // Icicle body (tapers to point)
      game.draw.rect(ic2.x - ic2.w / 2, ic2.y, ic2.w, ic2.h * 0.7, C.iceDk, alpha);
      game.draw.rect(ic2.x - ic2.w / 2 + 4, ic2.y, 6, ic2.h * 0.7, C.iceHi, 0.4);
      // Tip
      var tipW = ic2.w * 0.4;
      game.draw.rect(ic2.x - tipW / 2, ic2.y + ic2.h * 0.7, tipW, ic2.h * 0.3, C.ice, alpha);
      game.draw.rect(ic2.x - 2, ic2.y + ic2.h * 0.85, 4, ic2.h * 0.15, C.iceHi, 0.6);
    }

    // Floor
    game.draw.rect(0, H * 0.88, W, H * 0.12, C.floor, 0.95);
    game.draw.rect(0, H * 0.88, W, 12, C.floorHi, 0.6);
    // Snow on floor
    for (var si = 0; si < 12; si++) {
      var sx = (si * 89 + 33) % W;
      game.draw.circle(sx, H * 0.88 + 10, 8 + (si % 3) * 6, C.snow, 0.3);
    }

    // Player
    var pCol = invincible > 0 ? (Math.floor(elapsed * 10) % 2 === 0 ? C.player : C.hit) : C.player;
    game.draw.circle(player.x + 4, player.y + 4, PLAYER_R, '#000', 0.2);
    game.draw.circle(player.x, player.y, PLAYER_R, pCol, 0.9);
    game.draw.circle(player.x - 10, player.y - 10, PLAYER_R * 0.35, C.playerHi, 0.5);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (hitFlash > 0) game.draw.rect(0, 0, W, H, C.hit, hitFlash * 0.12);
    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.safe, flashAnim * 0.1);

    // Lives
    for (var hi = 0; hi < MAX_HITS; hi++) {
      game.draw.circle(W / 2 - (MAX_HITS - 1) * 50 + hi * 100, H * 0.955, 22, hi < hits ? C.hit : C.safe, 0.9);
    }

    var ratio = Math.max(0, timeLeft / surviveTime);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.safe : C.hit);
    game.draw.text(Math.ceil(timeLeft) + '秒', W / 2, 36, { size: 44, color: '#fff', bold: true });
    game.draw.text('生存中...', W / 2, 80, { size: 36, color: ratio > 0.3 ? C.safe : C.hit });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
  });
})(game);

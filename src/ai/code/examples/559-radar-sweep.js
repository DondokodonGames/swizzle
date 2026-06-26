// 559-radar-sweep.js
// レーダースイープ — 回転レーダーに映るターゲットをタップで識別する
// 操作: レーダーにターゲットが映ったらすぐタップ
// 成功: 20ターゲット識別  失敗: 10見逃し or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#000a04',
    radarBg:  '#001a06',
    grid:     '#003310',
    sweep:    '#00ff4466',
    sweepLine:'#00ff44',
    blip:     '#00ff44',
    blipFade: '#00ff4466',
    ghost:    '#00ff4422',
    hostile:  '#ff4422',
    hostileHi:'#ff8866',
    friendHi: '#44ffaa',
    miss:     '#ff4422',
    hit:      '#00ff88',
    text:     '#00ff44',
    ui:       '#004422'
  };

  var CX = W / 2;
  var CY = H * 0.42;
  var RADAR_R = 340;
  var sweepAngle = 0;
  var SWEEP_SPEED = 1.8; // radians per second

  var blips = []; // {angle, dist, detected, life, isHostile}
  var identified = 0;
  var NEEDED = 20;
  var missed = 0;
  var MAX_MISS = 10;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.hit;
  var lastResult = '', lastResultTimer = 0;
  var nextBlip = 1.5;
  var blipTrails = []; // fading trail of the sweep

  function spawnBlip() {
    var ang = Math.random() * Math.PI * 2;
    var dist = RADAR_R * (0.2 + Math.random() * 0.7);
    blips.push({
      angle: ang,
      dist: dist,
      detected: false,
      life: 1.5,
      maxLife: 1.5,
      isHostile: Math.random() < 0.6,
      sweepHit: false // has the sweep passed over it
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var dx = tx - CX, dy = ty - CY;
    var tapDist = Math.sqrt(dx * dx + dy * dy);
    var tapAng = Math.atan2(dy, dx);

    var best = null, bestDist = Infinity;
    for (var bi = 0; bi < blips.length; bi++) {
      var b = blips[bi];
      if (b.detected || !b.sweepHit) continue;
      var bx = CX + Math.cos(b.angle) * b.dist;
      var by = CY + Math.sin(b.angle) * b.dist;
      var d = Math.sqrt((tx - bx) * (tx - bx) + (ty - by) * (ty - by));
      if (d < 80 && d < bestDist) {
        bestDist = d;
        best = b;
      }
    }

    if (best) {
      best.detected = true;
      identified++;
      flashCol = C.hit;
      flashAnim = 0.25;
      lastResult = best.isHostile ? '敵識別!' : '味方確認';
      lastResultTimer = 0.7;
      game.audio.play('se_success', 0.7);
      var bx2 = CX + Math.cos(best.angle) * best.dist;
      var by2 = CY + Math.sin(best.angle) * best.dist;
      for (var pi = 0; pi < 8; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: bx2, y: by2, vx: Math.cos(ang) * 160, vy: Math.sin(ang) * 160, life: 0.4, col: best.isHostile ? C.hostile : C.friendHi });
      }
      if (identified >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(identified * 300 + Math.ceil(timeLeft) * 100); }, 700);
      }
    } else {
      missed++;
      flashCol = C.miss;
      flashAnim = 0.2;
      lastResult = 'ミス';
      lastResultTimer = 0.5;
      game.audio.play('se_failure', 0.3);
      if (missed >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
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
    if (lastResultTimer > 0) lastResultTimer -= dt;

    sweepAngle += SWEEP_SPEED * dt;

    // Spawn
    nextBlip -= dt;
    if (nextBlip <= 0 && !done) {
      spawnBlip();
      nextBlip = Math.max(0.8, 1.5 - identified * 0.03);
    }

    // Update blips
    for (var bi = blips.length - 1; bi >= 0; bi--) {
      var b = blips[bi];
      b.life -= dt;

      // Check if sweep just crossed this blip
      var normalizedSweep = ((sweepAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      var normalizedBlip = ((b.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      var angleDiff = Math.abs(normalizedSweep - normalizedBlip);
      if (angleDiff < 0.15 || angleDiff > Math.PI * 2 - 0.15) {
        b.sweepHit = true;
        b.life = b.maxLife; // reset life when sweep hits
      }

      if (b.life <= 0) {
        if (!b.detected && b.sweepHit) {
          missed++;
          flashCol = C.miss;
          flashAnim = 0.2;
          game.audio.play('se_failure', 0.2);
          if (missed >= MAX_MISS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
        }
        blips.splice(bi, 1);
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Radar background
    game.draw.circle(CX, CY, RADAR_R + 8, '#002208', 0.9);
    game.draw.circle(CX, CY, RADAR_R, C.radarBg, 0.95);

    // Radar rings
    for (var ri = 1; ri <= 4; ri++) {
      game.draw.circle(CX, CY, RADAR_R * ri / 4, C.grid, 0.6);
    }
    // Crosshairs
    game.draw.line(CX - RADAR_R, CY, CX + RADAR_R, CY, C.grid, 2);
    game.draw.line(CX, CY - RADAR_R, CX, CY + RADAR_R, C.grid, 2);
    // Diagonal lines
    game.draw.line(CX - RADAR_R * 0.7, CY - RADAR_R * 0.7, CX + RADAR_R * 0.7, CY + RADAR_R * 0.7, C.grid, 1);
    game.draw.line(CX - RADAR_R * 0.7, CY + RADAR_R * 0.7, CX + RADAR_R * 0.7, CY - RADAR_R * 0.7, C.grid, 1);

    // Sweep trail
    for (var tri = 0; tri < 16; tri++) {
      var trailAng = sweepAngle - tri * 0.06;
      var trailAlpha = (1 - tri / 16) * 0.3;
      game.draw.line(CX, CY,
        CX + Math.cos(trailAng) * RADAR_R,
        CY + Math.sin(trailAng) * RADAR_R,
        C.sweepLine, 2);
    }

    // Sweep line
    game.draw.line(CX, CY, CX + Math.cos(sweepAngle) * RADAR_R, CY + Math.sin(sweepAngle) * RADAR_R, C.sweepLine, 4);
    game.draw.circle(CX, CY, 12, C.sweepLine, 0.9);

    // Blips
    for (var bi2 = 0; bi2 < blips.length; bi2++) {
      var b2 = blips[bi2];
      if (!b2.sweepHit) continue;
      var bx3 = CX + Math.cos(b2.angle) * b2.dist;
      var by3 = CY + Math.sin(b2.angle) * b2.dist;
      var lifeRatio = b2.life / b2.maxLife;
      var col = b2.detected ? (b2.isHostile ? C.hostile : C.friendHi) : C.blip;
      var blipAlpha = b2.detected ? 0.5 : lifeRatio * 0.9;
      game.draw.circle(bx3, by3, 24 + (1 - lifeRatio) * 16, col, blipAlpha * 0.3);
      game.draw.circle(bx3, by3, 20, col, blipAlpha * 0.9);
      if (!b2.detected) {
        game.draw.circle(bx3, by3, 20 + Math.sin(elapsed * 8) * 6, col, lifeRatio * 0.3);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    if (lastResultTimer > 0) {
      game.draw.text(lastResult, CX, CY + RADAR_R + 80, { size: 52, color: flashAnim > 0 ? flashCol : C.text, bold: true });
    }

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 44 + mi * 88, H * 0.955, 18, mi < missed ? C.miss : C.ui, 0.9);
    }

    game.draw.text(identified + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.sweepLine : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
  });
})(game);

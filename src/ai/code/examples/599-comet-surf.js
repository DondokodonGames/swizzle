// 599-comet-surf.js
// コメットサーフ — 彗星の尾をサーフィンして宇宙の破片を避ける
// 操作: 左右スワイプで彗星の軌道上を前後移動
// 成功: 30秒サバイバル  失敗: 破片に3回衝突 or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#000005',
    space:   '#020010',
    comet:   '#88ccff',
    cometHi: '#ddeeff',
    tail:    '#4488ff',
    tailHi:  '#88aaff',
    surfer:  '#ffaa22',
    surferHi:'#ffdd88',
    debris:  '#cc4422',
    debrisHi:'#ff8866',
    safe:    '#22c55e',
    danger:  '#ef4444',
    star:    '#ffffff',
    text:    '#f1f5f9',
    ui:      '#0a0a2a'
  };

  var SURVIVE_TIME = 30;
  var COMET_SPEED = 400;
  var COMET_CURVE = 0.3; // oscillation in y

  var cometX = -100;
  var cometY = H / 2;
  var cometVX = COMET_SPEED;
  var elapsed = 0;

  // Player rides a position along the tail (0 = comet head, 1 = far back)
  var tailPos = 0.3; // normalized 0-1 along tail
  var TAIL_LEN = 400;
  var TAIL_SEGMENTS = 20;

  var surferX = 0, surferY = 0;
  var surferHit = false;
  var invincible = 0;
  var hits = 0;
  var MAX_HITS = 3;
  var done = false;
  var timeLeft = SURVIVE_TIME;
  var particles = [];
  var debris = [];
  var stars = [];
  var hitFlash = 0;
  var nextDebris = 1.5;
  var difficulty = 1;

  // Comet path: stores recent positions
  var pathHistory = [];

  function getPathPoint(t) {
    // t = 0 means current comet pos, t = 1 means TAIL_LEN behind
    var idx = Math.min(pathHistory.length - 1, Math.floor(t * (pathHistory.length - 1)));
    if (idx < 0) return { x: cometX, y: cometY };
    return pathHistory[idx];
  }

  // Star field
  for (var si = 0; si < 60; si++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2 + 0.5, blink: Math.random() * Math.PI * 2 });
  }

  game.onSwipe(function(dir) {
    if (done) return;
    // Move position along tail
    if (dir === 'left') tailPos = Math.max(0.05, tailPos - 0.12);
    else if (dir === 'right') tailPos = Math.min(0.95, tailPos + 0.12);
    game.audio.play('se_tap', 0.15);
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    if (tx < W / 2) tailPos = Math.max(0.05, tailPos - 0.08);
    else tailPos = Math.min(0.95, tailPos + 0.08);
    game.audio.play('se_tap', 0.1);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      difficulty = 1 + elapsed / 8;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success((MAX_HITS - hits) * 500 + 1500); }, 700);
        return;
      }
    }
    if (hitFlash > 0) hitFlash -= dt * 3;
    if (invincible > 0) invincible -= dt;

    // Move comet (loops across screen)
    cometX += cometVX * dt;
    cometY = H / 2 + Math.sin(elapsed * COMET_CURVE) * H * 0.28;

    // Wrap comet
    if (cometX > W + 200) {
      cometX = -100;
      pathHistory = [];
    }

    // Record path
    pathHistory.unshift({ x: cometX, y: cometY });
    if (pathHistory.length > 80) pathHistory.pop();

    // Surfer position on tail
    var pathIdx = Math.floor(tailPos * (pathHistory.length - 1));
    var pathPt = pathHistory[Math.min(pathIdx, pathHistory.length - 1)];
    if (pathPt) { surferX = pathPt.x; surferY = pathPt.y; }

    // Spawn debris
    nextDebris -= dt;
    if (nextDebris <= 0 && !done) {
      debris.push({
        x: W + 60,
        y: H * 0.1 + Math.random() * H * 0.8,
        r: 18 + Math.random() * 14,
        vx: -(200 + Math.random() * 200 * difficulty),
        vy: (Math.random() - 0.5) * 80,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 4
      });
      nextDebris = Math.max(0.25, 1.2 - elapsed * 0.03);
    }

    // Update debris
    for (var di = debris.length - 1; di >= 0; di--) {
      var d = debris[di];
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.rot += d.rotSpeed * dt;
      if (d.x < -100) { debris.splice(di, 1); continue; }

      // Collision with surfer
      if (invincible <= 0) {
        var dx = surferX - d.x, dy = surferY - d.y;
        if (dx * dx + dy * dy < (d.r + 22) * (d.r + 22)) {
          hits++;
          invincible = 1.2;
          hitFlash = 0.5;
          game.audio.play('se_failure', 0.5);
          for (var pi = 0; pi < 8; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: surferX, y: surferY, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.4, col: C.debrisHi });
          }
          debris.splice(di, 1);
          if (hits >= MAX_HITS && !done) {
            done = true;
            game.audio.play('se_failure', 0.7);
            setTimeout(function() { game.end.failure(); }, 600);
          }
          break;
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Stars twinkle + parallax
    for (var sti = 0; sti < stars.length; sti++) {
      stars[sti].blink += dt * 2;
      stars[sti].x -= 20 * dt; // slow parallax
      if (stars[sti].x < 0) stars[sti].x += W;
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Stars
    for (var sti2 = 0; sti2 < stars.length; sti2++) {
      var st = stars[sti2];
      var sa = 0.4 + Math.sin(st.blink) * 0.3;
      game.draw.circle(st.x, st.y, st.r, C.star, sa);
    }

    // Comet tail
    for (var ti = 1; ti < Math.min(pathHistory.length, 30); ti++) {
      var pt1 = pathHistory[ti - 1];
      var pt2 = pathHistory[ti];
      var tailAlpha = (1 - ti / 30) * 0.5;
      var tailW = (1 - ti / 30) * 12 + 3;
      game.draw.line(pt1.x, pt1.y, pt2.x, pt2.y, C.tail, tailW);
    }

    // Comet head
    game.draw.circle(cometX, cometY, 28, C.cometHi, 0.9);
    game.draw.circle(cometX, cometY, 40, C.comet, 0.3);

    // Debris
    for (var di2 = 0; di2 < debris.length; di2++) {
      var d2 = debris[di2];
      game.draw.circle(d2.x + 4, d2.y + 4, d2.r, '#000', 0.3);
      game.draw.circle(d2.x, d2.y, d2.r, C.debris, 0.9);
      game.draw.circle(d2.x - d2.r * 0.3, d2.y - d2.r * 0.3, d2.r * 0.3, C.debrisHi, 0.5);
    }

    // Surfer
    var surferAlpha = (invincible > 0 && Math.floor(elapsed * 8) % 2 === 0) ? 0.3 : 0.9;
    var surferCol = hitFlash > 0 ? C.danger : C.surfer;
    game.draw.circle(surferX + 4, surferY + 4, 24, '#000', 0.3);
    game.draw.circle(surferX, surferY, 24, surferCol, surferAlpha);
    game.draw.circle(surferX - 8, surferY - 8, 8, C.surferHi, 0.5 * surferAlpha);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (hitFlash > 0) game.draw.rect(0, 0, W, H, C.danger, hitFlash * 0.12);

    // Hit dots
    for (var hi = 0; hi < MAX_HITS; hi++) {
      game.draw.circle(W / 2 - (MAX_HITS - 1) * 80 + hi * 160, H * 0.955, 28, hi < hits ? C.danger : C.safe, 0.9);
    }

    var ratio = Math.max(0, timeLeft / SURVIVE_TIME);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.safe : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '秒', W / 2, 36, { size: 44, color: '#fff', bold: true });
    game.draw.text('サバイバル中...', W / 2, 80, { size: 36, color: ratio > 0.3 ? C.safe : C.danger });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
  });
})(game);

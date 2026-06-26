// 510-domino-fall.js
// ドミノ倒し — ドミノを並べてから最初の1枚を倒し、すべて倒れたら成功
// 操作: スワイプで追加ドミノを配置、タップで最初のドミノを倒す
// 成功: ドミノ20枚を連鎖で全倒し  失敗: 鎖が途切れる or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#060310',
    domino: '#4338ca',
    dominoHi:'#818cf8',
    fallen: '#22c55e',
    fallenHi:'#86efac',
    gap:    '#ef4444',
    floor:  '#0f0c1e',
    text:   '#f1f5f9',
    ui:     '#374151',
    placing:'#f59e0b'
  };

  var FLOOR_Y = H * 0.75;
  var DOM_W = 24;
  var DOM_H = 80;
  var DOM_SPACING = 65; // space between dominoes

  var dominos = [];
  var placed = false;
  var toppling = false;
  var toppledIdx = 0;
  var toppleTimer = 0;
  var TOPPLE_SPEED = 0.12; // time per domino fall
  var round = 0;
  var NEEDED = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var placingX = W / 2;
  var previewX = W * 0.3;
  var placing = true;
  var rounds = 0;
  var flashAnim = 0;

  function initDominos() {
    dominos = [];
    var count = 14 + rounds * 2;
    // Spread dominoes, some with gaps
    var x = 100;
    for (var i = 0; i < count; i++) {
      var gap = (Math.random() < 0.25 && i > 0 && i < count - 1) ? DOM_SPACING * 2.5 : DOM_SPACING;
      dominos.push({ x: x, fallen: false, angle: 0 });
      x += gap;
    }
    // Cap width
    if (x > W - 100) {
      var scale = (W - 200) / (x - 100);
      for (var di = 0; di < dominos.length; di++) {
        dominos[di].x = 100 + (dominos[di].x - 100) * scale;
      }
    }
    placed = true;
    toppling = false;
    toppledIdx = -1;
    toppleTimer = 0;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (!placed) return;
    if (!toppling) {
      // Start toppling
      toppling = true;
      toppledIdx = 0;
      toppleTimer = 0;
      game.audio.play('se_tap', 0.5);
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

    if (flashAnim > 0) flashAnim -= dt * 3;

    if (toppling && toppledIdx < dominos.length) {
      toppleTimer += dt;
      if (toppleTimer >= TOPPLE_SPEED) {
        toppleTimer -= TOPPLE_SPEED;
        // Check if this domino can reach the next
        var cur = dominos[toppledIdx];
        cur.fallen = true;
        game.audio.play('se_tap', 0.1 + toppledIdx * 0.005);

        for (var pi = 0; pi < 3; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: cur.x, y: FLOOR_Y - DOM_H / 2, vx: Math.cos(ang) * 80, vy: Math.sin(ang) * 80 - 60, life: 0.3, col: C.fallenHi });
        }

        var nextIdx = toppledIdx + 1;
        if (nextIdx < dominos.length) {
          var next = dominos[nextIdx];
          var dist = next.x - cur.x;
          if (dist <= DOM_H + DOM_W / 2) {
            // Can reach
            toppledIdx++;
          } else {
            // GAP — chain breaks
            toppling = false;
            var fallen = dominos.filter(function(d) { return d.fallen; }).length;
            if (fallen === dominos.length) {
              // All fell
              rounds++;
              flashAnim = 0.5;
              game.audio.play('se_success', 0.9);
              for (var pi2 = 0; pi2 < 16; pi2++) {
                var ang2 = Math.random() * Math.PI * 2;
                particles.push({ x: W / 2, y: FLOOR_Y - 100, vx: Math.cos(ang2) * 250, vy: Math.sin(ang2) * 250, life: 0.6, col: C.fallenHi });
              }
              if (rounds >= NEEDED && !done) {
                done = true;
                setTimeout(function() { game.end.success(rounds * 1000 + Math.ceil(timeLeft) * 100); }, 700);
              } else {
                setTimeout(function() { if (!done) initDominos(); }, 800);
              }
            } else {
              // Partial fail
              game.audio.play('se_failure', 0.5);
              setTimeout(function() { if (!done) initDominos(); }, 700);
            }
          }
        } else {
          // Last domino fell
          rounds++;
          flashAnim = 0.5;
          toppling = false;
          game.audio.play('se_success', 0.9);
          for (var pi3 = 0; pi3 < 16; pi3++) {
            var ang3 = Math.random() * Math.PI * 2;
            particles.push({ x: W / 2, y: FLOOR_Y - 100, vx: Math.cos(ang3) * 250, vy: Math.sin(ang3) * 250, life: 0.6, col: C.fallenHi });
          }
          if (rounds >= NEEDED && !done) {
            done = true;
            setTimeout(function() { game.end.success(rounds * 1000 + Math.ceil(timeLeft) * 100); }, 700);
          } else {
            setTimeout(function() { if (!done) initDominos(); }, 800);
          }
        }
      }

      // Animate topple angle
      dominos[toppledIdx].angle = Math.min(Math.PI / 2, dominos[toppledIdx].angle + dt * 6);
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, FLOOR_Y, W, H - FLOOR_Y, C.floor, 0.9);

    // Dominos
    for (var di2 = 0; di2 < dominos.length; di2++) {
      var d = dominos[di2];
      if (d.fallen) {
        // Draw lying flat
        game.draw.rect(d.x - DOM_H / 2, FLOOR_Y - DOM_W, DOM_H, DOM_W, C.fallen, 0.85);
        game.draw.rect(d.x - DOM_H / 2, FLOOR_Y - DOM_W, DOM_H, 4, C.fallenHi, 0.5);
      } else if (di2 === toppledIdx && toppling) {
        // Animating fall
        var progress = dominos[di2].angle / (Math.PI / 2);
        var px2 = d.x + Math.sin(dominos[di2].angle) * DOM_H * 0.5;
        var py2 = FLOOR_Y - DOM_H / 2 + (1 - Math.cos(dominos[di2].angle)) * DOM_H * 0.5;
        game.draw.rect(px2 - DOM_W / 2, py2 - DOM_H / 2, DOM_W, DOM_H, C.domino, 0.85);
      } else {
        // Standing
        game.draw.rect(d.x - DOM_W / 2, FLOOR_Y - DOM_H, DOM_W, DOM_H, C.domino, 0.85);
        game.draw.rect(d.x - DOM_W / 2, FLOOR_Y - DOM_H, DOM_W, 6, C.dominoHi, 0.5);
        // Dots
        var numDots = (di2 % 6) + 1;
        game.draw.circle(d.x, FLOOR_Y - DOM_H / 2, 5, '#fff', 0.7);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.fallen, flashAnim * 0.15);

    if (!toppling) {
      game.draw.text('タップで倒す！', W / 2, H * 0.88, { size: 48, color: C.text, bold: true });
    }

    // Round dots
    for (var ri = 0; ri < NEEDED; ri++) {
      game.draw.circle(W / 2 - (NEEDED - 1) * 60 + ri * 120, H * 0.955, 22, ri < rounds ? C.fallen : C.ui, 0.9);
    }

    game.draw.text(rounds + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.domino : C.gap);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    initDominos();
  });
})(game);

// 579-web-spin.js
// ウェブスピン — クモの巣に引っかかった虫をスワイプで巣の外に弾き飛ばす
// 操作: スワイプで虫を弾く（引っ張って放す感覚）
// 成功: 15匹脱出  失敗: 8匹逃げる or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#08040c',
    web:     '#886688',
    webHi:   '#ccaacc',
    spider:  '#221122',
    spiderHi:'#443344',
    bug:     '#44aa22',
    bugHi:   '#88ff44',
    bug2:    '#eeaa00',
    bug2Hi:  '#ffdd44',
    freed:   '#22c55e',
    escape:  '#ef4444',
    text:    '#f1f5f9',
    ui:      '#374151'
  };

  var CX = W / 2;
  var CY = H * 0.4;
  var WEB_R = 340;
  var RINGS = 5;
  var SPOKES = 8;

  var bugs = [];
  var freed = 0;
  var NEEDED = 15;
  var escaped = 0;
  var MAX_ESCAPE = 8;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var nextBug = 1.5;
  var flashAnim = 0, flashCol = C.freed;
  var swipeStart = null;

  function spawnBug() {
    var ringIdx = 1 + Math.floor(Math.random() * (RINGS - 1));
    var spoke = Math.floor(Math.random() * SPOKES);
    var r = WEB_R * ringIdx / RINGS;
    var ang = spoke / SPOKES * Math.PI * 2;
    bugs.push({
      x: CX + Math.cos(ang) * r,
      y: CY + Math.sin(ang) * r,
      r: 22 + Math.random() * 12,
      type: Math.random() < 0.6 ? 0 : 1, // 0=green bug, 1=yellow bug
      life: 4 + Math.random() * 3,
      maxLife: 4 + Math.random() * 3,
      vx: 0, vy: 0,
      flying: false,
      angle: ang
    });
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    // Find nearest bug to swipe start
    var best = null, bestDist = 100;
    for (var bi = 0; bi < bugs.length; bi++) {
      if (bugs[bi].flying) continue;
      var dx = x1 - bugs[bi].x, dy = y1 - bugs[bi].y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) { bestDist = d; best = bugs[bi]; }
    }
    if (!best) return;

    // Fling in swipe direction
    var sdx = x2 - x1, sdy = y2 - y1;
    var slen = Math.sqrt(sdx * sdx + sdy * sdy);
    if (slen < 30) return;
    var speed = Math.min(slen * 4, 1600);
    best.vx = (sdx / slen) * speed;
    best.vy = (sdy / slen) * speed;
    best.flying = true;
    game.audio.play('se_tap', 0.3);
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    // Tap on bug to wiggle it (minor effect)
    for (var bi = 0; bi < bugs.length; bi++) {
      if (bugs[bi].flying) continue;
      var dx = tx - bugs[bi].x, dy = ty - bugs[bi].y;
      if (Math.sqrt(dx * dx + dy * dy) < bugs[bi].r + 20) {
        bugs[bi].vx += (Math.random() - 0.5) * 100;
        bugs[bi].vy += (Math.random() - 0.5) * 100;
        game.audio.play('se_tap', 0.15);
        return;
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
    if (flashAnim > 0) flashAnim -= dt * 3;

    nextBug -= dt;
    if (nextBug <= 0 && !done) {
      spawnBug();
      nextBug = Math.max(0.6, 1.5 - freed * 0.03);
    }

    for (var bi = bugs.length - 1; bi >= 0; bi--) {
      var b = bugs[bi];
      if (b.flying) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.vx *= Math.pow(0.4, dt);
        b.vy *= Math.pow(0.4, dt);

        var dx = b.x - CX, dy = b.y - CY;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > WEB_R + b.r) {
          // Freed!
          freed++;
          flashCol = C.freed;
          flashAnim = 0.3;
          game.audio.play('se_success', 0.6);
          for (var pi = 0; pi < 6; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: b.x, y: b.y, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.4, col: b.type === 0 ? C.bugHi : C.bug2Hi });
          }
          bugs.splice(bi, 1);
          if (freed >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(freed * 300 + Math.ceil(timeLeft) * 100); }, 700);
          }
          continue;
        }

        // Stick back if too slow
        if (Math.abs(b.vx) < 20 && Math.abs(b.vy) < 20) {
          b.flying = false;
          b.vx = 0; b.vy = 0;
        }
      } else {
        b.life -= dt;
        if (b.life <= 0) {
          // Bug escaped into web deeper
          escaped++;
          flashCol = C.escape;
          flashAnim = 0.25;
          game.audio.play('se_failure', 0.3);
          bugs.splice(bi, 1);
          if (escaped >= MAX_ESCAPE && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
        }
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

    // Web rings
    for (var ri = 1; ri <= RINGS; ri++) {
      var r = WEB_R * ri / RINGS;
      game.draw.circle(CX, CY, r, C.web, 0.3 + (ri / RINGS) * 0.2);
    }

    // Web spokes
    for (var si = 0; si < SPOKES; si++) {
      var sa = si / SPOKES * Math.PI * 2;
      game.draw.line(CX, CY, CX + Math.cos(sa) * WEB_R, CY + Math.sin(sa) * WEB_R, C.webHi, 2);
    }

    // Web cross threads
    for (var ri2 = 1; ri2 <= RINGS; ri2++) {
      var r2 = WEB_R * ri2 / RINGS;
      for (var si2 = 0; si2 < SPOKES; si2++) {
        var a1 = si2 / SPOKES * Math.PI * 2;
        var a2 = (si2 + 1) / SPOKES * Math.PI * 2;
        game.draw.line(CX + Math.cos(a1) * r2, CY + Math.sin(a1) * r2, CX + Math.cos(a2) * r2, CY + Math.sin(a2) * r2, C.web, 2);
      }
    }

    // Spider at center
    game.draw.circle(CX, CY, 34, C.spiderHi, 0.9);
    game.draw.circle(CX, CY, 22, C.spider, 0.95);
    // Spider legs
    for (var li = 0; li < 8; li++) {
      var la = li / 8 * Math.PI * 2 + elapsed * 0.5;
      game.draw.line(CX + Math.cos(la) * 22, CY + Math.sin(la) * 22, CX + Math.cos(la) * 50, CY + Math.sin(la) * 50, C.spiderHi, 4);
    }

    // Bugs
    for (var bi2 = 0; bi2 < bugs.length; bi2++) {
      var b2 = bugs[bi2];
      var bc = b2.type === 0 ? C.bug : C.bug2;
      var bhi = b2.type === 0 ? C.bugHi : C.bug2Hi;
      var lifeRatio = b2.life / b2.maxLife;
      var pulse = 1 + Math.sin(elapsed * 6 + bi2) * 0.1;

      // Web stuck animation
      if (!b2.flying) {
        var stuckAmt = (1 - lifeRatio) * 6;
        game.draw.circle(b2.x, b2.y, b2.r + stuckAmt, C.web, 0.15);
      }

      game.draw.circle(b2.x, b2.y, b2.r * pulse, bc, b2.flying ? 0.95 : lifeRatio * 0.85 + 0.1);
      game.draw.circle(b2.x - b2.r * 0.3, b2.y - b2.r * 0.3, b2.r * 0.3, bhi, 0.5);
      // Antennae
      game.draw.line(b2.x - 8, b2.y - b2.r, b2.x - 18, b2.y - b2.r - 20, bhi, 2);
      game.draw.line(b2.x + 8, b2.y - b2.r, b2.x + 18, b2.y - b2.r - 20, bhi, 2);

      if (!b2.flying && lifeRatio < 0.4) {
        game.draw.circle(b2.x, b2.y, b2.r + 20, C.escape, (0.4 - lifeRatio) * 0.5 + Math.sin(elapsed * 10) * 0.1);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Escape dots
    for (var ei = 0; ei < MAX_ESCAPE; ei++) {
      game.draw.circle(W / 2 - (MAX_ESCAPE - 1) * 44 + ei * 88, H * 0.955, 18, ei < escaped ? C.escape : C.ui, 0.9);
    }

    game.draw.text(freed + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.webHi : C.escape);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
  });
})(game);

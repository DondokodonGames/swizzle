// 010-crack-seal.js
// ひびわれ封じ — じわじわ広がるひびを塞ぐ焦燥感
// 操作: ひびの中心をタップして封じる
// 成功: 15秒耐える  失敗: ひびが端まで広がる

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#1c1108',
    wall:     '#292010',
    crack:    '#ff6b35',
    crackGlow:'#ff9966',
    sealed:   '#4ade80',
    sealFx:   '#a7f3d0',
    ui:       '#78716c',
    danger:   '#ef4444'
  };

  var timeLeft = 15;
  var done = false;

  // Cracks: each has a center, radius (grows), sealed status
  var cracks = [];
  var sealFx = []; // { x, y, t }
  var CRACK_LIMIT = 420; // if radius reaches this, fail

  function spawnCrack() {
    // Don't overlap with existing cracks
    var tries = 0;
    while (tries < 20) {
      var cx = game.random(100, W - 100);
      var cy = game.random(260, H - 260);
      var tooClose = false;
      for (var i = 0; i < cracks.length; i++) {
        var dx = cx - cracks[i].x;
        var dy = cy - cracks[i].y;
        if (dx*dx + dy*dy < 300*300) { tooClose = true; break; }
      }
      if (!tooClose) {
        cracks.push({
          x: cx, y: cy,
          r: 20,
          speed: game.random(30, 55),
          branches: generateBranches(cx, cy),
          sealed: false,
          sealTimer: 0
        });
        return;
      }
      tries++;
    }
  }

  function generateBranches(cx, cy) {
    var count = Math.floor(game.random(4, 7));
    var branches = [];
    for (var i = 0; i < count; i++) {
      var angle = (i / count) * Math.PI * 2 + game.random(-0.3, 0.3);
      branches.push({ angle: angle, jag: [] });
      // jagged line segments
      var segments = 5;
      for (var s = 0; s < segments; s++) {
        branches[i].jag.push((Math.random() - 0.5) * 0.4);
      }
    }
    return branches;
  }

  game.onTap(function(x, y) {
    if (done) return;
    for (var i = cracks.length - 1; i >= 0; i--) {
      var c = cracks[i];
      if (c.sealed) continue;
      var dx = x - c.x;
      var dy = y - c.y;
      // tap anywhere within crack radius
      if (dx*dx + dy*dy <= (c.r + 40) * (c.r + 40)) {
        c.sealed = true;
        c.r = Math.max(c.r - 80, 0); // shrink back
        sealFx.push({ x: c.x, y: c.y, t: 0 });
        game.audio.play('se_tap', 0.8);
        return;
      }
    }
  });

  var spawnTimer = 1.0;
  var spawnCount = 0;

  game.onUpdate(function(dt) {
    if (done) {
      drawScene();
      return;
    }

    timeLeft -= dt;
    if (timeLeft <= 0) {
      done = true;
      game.audio.play('se_success');
      setTimeout(function() { game.end.success(200); }, 400);
      return;
    }

    // spawn new cracks periodically
    spawnTimer -= dt;
    if (spawnTimer <= 0 && cracks.length < 4) {
      spawnCrack();
      spawnCount++;
      spawnTimer = Math.max(2.5, 4.0 - spawnCount * 0.3);
    }

    // grow cracks / unseal old ones
    for (var i = 0; i < cracks.length; i++) {
      var c = cracks[i];
      if (c.sealed) {
        c.sealTimer += dt;
        // reopen after 5 seconds
        if (c.sealTimer > 5.0) {
          c.sealed = false;
          c.sealTimer = 0;
          c.speed *= 1.1;
        }
      } else {
        c.r += c.speed * dt;
        if (c.r >= CRACK_LIMIT) {
          done = true;
          game.audio.play('se_failure');
          setTimeout(function() { game.end.failure(); }, 400);
          return;
        }
      }
    }

    // seal effects
    for (var j = sealFx.length - 1; j >= 0; j--) {
      sealFx[j].t += dt;
      if (sealFx[j].t > 0.5) sealFx.splice(j, 1);
    }

    drawScene();
  });

  function drawCrack(c) {
    var baseAlpha = c.sealed ? 0.3 : 1;
    var col = c.sealed ? C.sealed : C.crack;

    for (var b = 0; b < c.branches.length; b++) {
      var branch = c.branches[b];
      var baseAngle = branch.angle;
      var px = c.x, py = c.y;
      var segLen = c.r / branch.jag.length;

      for (var s = 0; s < branch.jag.length; s++) {
        var ang = baseAngle + branch.jag[s];
        var nx = px + Math.cos(ang) * segLen;
        var ny = py + Math.sin(ang) * segLen;
        // glow
        game.draw.line(px, py, nx, ny, c.sealed ? C.sealFx : C.crackGlow, 8);
        // crack line
        game.draw.line(px, py, nx, ny, col, 4);
        px = nx; py = ny;
        baseAngle = ang;
      }
    }

    // center dot
    game.draw.circle(c.x, c.y, 20, c.sealed ? C.sealFx : C.crackGlow, baseAlpha * 0.6);
    game.draw.circle(c.x, c.y, 12, col, baseAlpha);

    // danger pulse if getting big
    if (!c.sealed) {
      var danger = c.r / CRACK_LIMIT;
      if (danger > 0.5) {
        var pulse = Math.sin(game.time.elapsed * (8 + danger * 6)) * 0.5 + 0.5;
        game.draw.circle(c.x, c.y, c.r * 0.7, C.danger, danger * 0.15 * pulse);
      }
    }
  }

  function drawScene() {
    // stone wall
    game.draw.rect(0, 0, W, H, C.bg);
    // grid pattern for stone look
    var GRID = 160;
    for (var gx = 0; gx < W; gx += GRID) {
      for (var gy = 0; gy < H; gy += GRID) {
        var offset = (gy / GRID % 2 === 0) ? GRID / 2 : 0;
        game.draw.rect(gx + offset, gy, GRID - 4, GRID - 4, C.wall);
      }
    }

    // timer bar
    var ratio = Math.max(0, timeLeft / 15);
    game.draw.rect(0, 0, W, 72, '#0d0a05');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#92400e' : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fcd34d', bold: true });

    // cracks
    for (var i = 0; i < cracks.length; i++) {
      drawCrack(cracks[i]);
    }

    // seal effects
    for (var j = 0; j < sealFx.length; j++) {
      var fx = sealFx[j];
      var p = fx.t / 0.5;
      game.draw.circle(fx.x, fx.y, 60 + p * 120, C.sealFx, (1 - p) * 0.8);
      game.draw.circle(fx.x, fx.y, 20 + p * 60, '#ffffff', (1 - p) * 0.6);
    }

    // guide
    game.draw.text('ひびをタップして封じろ！', W / 2, H - 180, { size: 48, color: C.ui });
  }

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.4);
    spawnCrack();
  });
})(game);

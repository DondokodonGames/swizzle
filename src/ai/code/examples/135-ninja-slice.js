// 135-ninja-slice.js
// 忍者斬り — 飛んでくる物を素早くスワイプで斬り、爆弾は避ける反射神経ゲーム
// 操作: スワイプで物を斬る（爆弾はNG）
// 成功: 30個斬る  失敗: 爆弾3回 or 5個見逃す or 35秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020408',
    fruit:   '#22c55e',
    fruitB:  '#f97316',
    fruitC:  '#ef4444',
    bomb:    '#1a1a2e',
    bombHi:  '#6366f1',
    slash:   '#f1f5f9',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#334155'
  };

  var ITEMS = [
    { type: 'fruit', colors: [C.fruit, C.fruitB, C.fruitC] },
    { type: 'bomb', colors: [C.bomb] }
  ];

  var objects = []; // { x, y, vx, vy, r, type, colorIdx, sliced, exploding }
  var SPAWN_INTERVAL = 0.55;
  var spawnTimer = 0;
  var OBJ_R = 44;
  var BOMB_CHANCE = 0.22;

  var slashes = []; // { x1,y1, x2,y2, life }
  var lastSwipe = null;

  var score = 0;
  var needed = 30;
  var bombHits = 0;
  var maxBombs = 3;
  var missed = 0;
  var maxMissed = 5;
  var timeLeft = 35;
  var done = false;
  var particles = [];
  var feedback = 0;
  var feedbackOk = false;

  function spawnObject() {
    var isBomb = Math.random() < BOMB_CHANCE + score * 0.003;
    var side = Math.random() > 0.5 ? 'left' : 'right';
    var x = side === 'left' ? -OBJ_R : W + OBJ_R;
    var y = H * 0.3 + Math.random() * H * 0.4;
    var speed = 400 + Math.random() * 200;
    var vx = side === 'left' ? speed : -speed;
    var vy = -200 - Math.random() * 200;
    var type = isBomb ? 'bomb' : 'fruit';
    var colorIdx = isBomb ? 0 : Math.floor(Math.random() * ITEMS[0].colors.length);
    objects.push({ x: x, y: y, vx: vx, vy: vy, r: OBJ_R, type: type, colorIdx: colorIdx, sliced: false, exploding: false, explodeR: 0 });
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    // Use start/end of swipe as slash line
    // Since we only get direction, simulate a slash across the middle
    var sw = W * 0.8;
    var sx1, sy1, sx2, sy2;
    if (dir === 'right') { sx1 = W*0.1; sy1 = H*0.5; sx2 = W*0.9; sy2 = H*0.5; }
    else if (dir === 'left') { sx1 = W*0.9; sy1 = H*0.5; sx2 = W*0.1; sy2 = H*0.5; }
    else if (dir === 'up') { sx1 = W*0.5; sy1 = H*0.7; sx2 = W*0.5; sy2 = H*0.2; }
    else { sx1 = W*0.5; sy1 = H*0.2; sx2 = W*0.5; sy2 = H*0.7; }

    slashes.push({ x1: sx1, y1: sy1, x2: sx2, y2: sy2, life: 0.25 });
    game.audio.play('se_tap', 0.6);

    // Check intersections with objects
    for (var i = 0; i < objects.length; i++) {
      var o = objects[i];
      if (o.sliced || o.exploding) continue;
      // Distance from center to line segment
      var dx = sx2 - sx1, dy = sy2 - sy1;
      var len = Math.sqrt(dx*dx + dy*dy);
      if (len < 1) continue;
      var t = ((o.x - sx1) * dx + (o.y - sy1) * dy) / (len * len);
      t = Math.max(0, Math.min(1, t));
      var cx = sx1 + t * dx, cy = sy1 + t * dy;
      var dist = Math.sqrt((o.x-cx)*(o.x-cx) + (o.y-cy)*(o.y-cy));
      if (dist < o.r + 16) {
        o.sliced = true;
        if (o.type === 'fruit') {
          score++;
          feedbackOk = true;
          feedback = 0.2;
          // Particles
          var col = ITEMS[0].colors[o.colorIdx];
          for (var pi = 0; pi < 8; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: o.x, y: o.y, vx: Math.cos(ang)*180, vy: Math.sin(ang)*180, life: 0.4, color: col });
          }
          if (score >= needed && !done) {
            done = true;
            game.audio.play('se_success');
            setTimeout(function() { game.end.success(score*20 + Math.ceil(timeLeft)*12); }, 400);
          }
        } else {
          // Bomb!
          o.exploding = true;
          o.explodeR = o.r;
          bombHits++;
          feedbackOk = false;
          feedback = 0.5;
          game.audio.play('se_failure');
          for (var pi2 = 0; pi2 < 14; pi2++) {
            var ang2 = Math.random() * Math.PI * 2;
            particles.push({ x: o.x, y: o.y, vx: Math.cos(ang2)*240, vy: Math.sin(ang2)*240, life: 0.5, color: C.bombHi });
          }
          if (bombHits >= maxBombs && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
          }
        }
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = SPAWN_INTERVAL - score * 0.005;
      if (spawnTimer < 0.3) spawnTimer = 0.3;
      spawnObject();
    }

    for (var i = 0; i < objects.length; i++) {
      var o = objects[i];
      if (o.sliced && !o.exploding) continue;
      o.vy += 500 * dt;
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      if (o.exploding) o.explodeR += 200 * dt;
    }

    // Miss detection (fruit went off screen without being sliced)
    for (var j = objects.length - 1; j >= 0; j--) {
      var o2 = objects[j];
      if (o2.y > H + 80 || o2.x < -200 || o2.x > W + 200) {
        if (!o2.sliced && o2.type === 'fruit') {
          missed++;
          if (missed >= maxMissed && !done) {
            done = true;
            game.audio.play('se_failure');
            setTimeout(function() { game.end.failure(); }, 400);
          }
        }
        objects.splice(j, 1);
      }
    }

    for (var pi3 = 0; pi3 < particles.length; pi3++) {
      var p = particles[pi3];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 400 * dt; p.life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });
    for (var si = 0; si < slashes.length; si++) slashes[si].life -= dt;
    slashes = slashes.filter(function(s) { return s.life > 0; });
    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Slashes
    for (var sli = 0; sli < slashes.length; sli++) {
      var sl = slashes[sli];
      game.draw.line(sl.x1, sl.y1, sl.x2, sl.y2, C.slash, 6 * sl.life / 0.25);
      game.draw.line(sl.x1, sl.y1, sl.x2, sl.y2, '#fff', 2 * sl.life / 0.25);
    }

    // Objects
    for (var oi = 0; oi < objects.length; oi++) {
      var o3 = objects[oi];
      if (o3.sliced && !o3.exploding) continue;
      if (o3.exploding) {
        game.draw.circle(o3.x, o3.y, o3.explodeR, C.bombHi, 0.5);
        game.draw.circle(o3.x, o3.y, o3.explodeR * 0.5, '#fff', 0.3);
      } else if (o3.type === 'fruit') {
        var fCol = ITEMS[0].colors[o3.colorIdx];
        game.draw.circle(o3.x, o3.y, o3.r + 8, fCol, 0.2);
        game.draw.circle(o3.x, o3.y, o3.r, fCol);
        game.draw.circle(o3.x - o3.r*0.3, o3.y - o3.r*0.3, o3.r*0.25, '#fff', 0.5);
      } else {
        // Bomb
        game.draw.circle(o3.x, o3.y, o3.r + 6, C.bombHi, 0.2);
        game.draw.circle(o3.x, o3.y, o3.r, C.bomb);
        game.draw.circle(o3.x, o3.y - o3.r + 6, 14, C.bombHi, 0.9);
        game.draw.text('×', o3.x, o3.y, { size: 44, color: C.bombHi, bold: true });
      }
    }

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 8*part.life*2.5, part.color, part.life);
    }

    if (feedback > 0 && !feedbackOk) {
      game.draw.rect(0, 0, W, H, C.wrong, feedback * 0.25);
    }

    // Score + bomb/miss counters
    game.draw.text(score + ' / ' + needed, W/2, 148, { size: 60, color: '#f1f5f9', bold: true });
    for (var bi = 0; bi < maxBombs; bi++) {
      game.draw.circle(W/2+(bi-1)*52, 220, 18, bi < bombHits ? C.wrong : '#1a0a2a');
    }
    game.draw.text('💣', W/2 + 120, 220, { size: 32, color: C.ui });

    game.draw.text('スワイプで斬れ！', W/2, H*0.88, { size: 52, color: C.ui });

    var ratio = Math.max(0, timeLeft/35);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.fruit : C.wrong);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
  });
})(game);

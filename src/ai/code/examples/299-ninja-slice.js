// 299-ninja-slice.js
// 忍者スライス — 空中に浮かぶ的をスワイプで斬る、爆弾は絶対に避けよ
// 操作: スワイプで的を斬る（爆弾をスワイプするとダメージ）
// 成功: 40個斬る  失敗: 爆弾3回 or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0208',
    target1:'#ef4444',
    tgt1Hi: '#fca5a5',
    target2:'#f59e0b',
    tgt2Hi: '#fde68a',
    target3:'#22c55e',
    tgt3Hi: '#86efac',
    bomb:   '#1e1b4b',
    bombHi: '#312e81',
    fuse:   '#f59e0b',
    slash:  '#e2e8f0',
    slashHi:'#f8fafc',
    danger: '#ef4444',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var objects = []; // {x,y,vx,vy,r,type:'target'|'bomb',col,hiCol,sliced,sliceAnim}
  var sliced = 0;
  var NEEDED = 40;
  var bombHits = 0;
  var MAX_BOMB = 3;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var spawnTimer = 0;
  var particles = [];
  var slashTrail = []; // {x,y,alpha}
  var lastSwipe = null;
  var lastSwipeTimer = 0;
  var bgSlashes = [];

  function spawnObject() {
    var isBomb = Math.random() < 0.22;
    var fromLeft = Math.random() < 0.5;
    var x = fromLeft ? -80 : W + 80;
    var y = H * (0.3 + Math.random() * 0.5);
    var speed = 600 + Math.random() * 400;
    var vx = fromLeft ? speed * (0.4 + Math.random() * 0.4) : -speed * (0.4 + Math.random() * 0.4);
    var vy = -400 - Math.random() * 400;
    var r = isBomb ? 55 : 45 + Math.random() * 25;
    var cols = [[C.target1, C.tgt1Hi], [C.target2, C.tgt2Hi], [C.target3, C.tgt3Hi]];
    var col = cols[Math.floor(Math.random() * cols.length)];
    objects.push({ x: x, y: y, vx: vx, vy: vy, r: r, type: isBomb ? 'bomb' : 'target', col: isBomb ? C.bomb : col[0], hiCol: isBomb ? C.bombHi : col[1], sliced: false, sliceAnim: 0, fuseAnim: 0 });
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;

    // Trail
    slashTrail = [];
    var steps = 10;
    for (var si = 0; si <= steps; si++) {
      slashTrail.push({ x: x1 + (x2 - x1) * si / steps, y: y1 + (y2 - y1) * si / steps, alpha: 1 - si / steps });
    }
    lastSwipeTimer = 0.15;
    lastSwipe = { x1: x1, y1: y1, x2: x2, y2: y2 };

    // Check hits
    for (var oi = objects.length - 1; oi >= 0; oi--) {
      var obj = objects[oi];
      if (obj.sliced) continue;
      // Check if swipe line passes near obj center
      var dx = x2 - x1, dy = y2 - y1;
      var len = Math.hypot(dx, dy);
      if (len < 1) continue;
      var t = ((obj.x - x1) * dx + (obj.y - y1) * dy) / (len * len);
      t = Math.max(0, Math.min(1, t));
      var cx2 = x1 + t * dx, cy2 = y1 + t * dy;
      var dist = Math.hypot(obj.x - cx2, obj.y - cy2);

      if (dist < obj.r + 20) {
        obj.sliced = true;
        obj.sliceAnim = 1;
        if (obj.type === 'target') {
          sliced++;
          game.audio.play('se_success', 0.35);
          // Slice particles
          for (var pi = 0; pi < 8; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: obj.x, y: obj.y, vx: Math.cos(ang) * 250, vy: Math.sin(ang) * 250 - 50, life: 0.5, col: obj.hiCol, r: 10 });
          }
          if (sliced >= NEEDED && !done) {
            done = true;
            setTimeout(function() { game.end.success(sliced * 80 + Math.ceil(timeLeft) * 120); }, 400);
          }
        } else {
          bombHits++;
          game.audio.play('se_failure', 0.7);
          for (var pi2 = 0; pi2 < 12; pi2++) {
            var ang2 = Math.random() * Math.PI * 2;
            particles.push({ x: obj.x, y: obj.y, vx: Math.cos(ang2) * 300, vy: Math.sin(ang2) * 300 - 100, life: 0.7, col: '#f97316', r: 14 });
          }
          if (bombHits >= MAX_BOMB && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
        }
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (lastSwipeTimer > 0) lastSwipeTimer -= dt;

    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      var spawnCount = Math.random() < 0.3 ? 2 : 1;
      for (var si2 = 0; si2 < spawnCount; si2++) spawnObject();
      spawnTimer = 0.6 + Math.random() * 0.5;
    }

    for (var oi2 = objects.length - 1; oi2 >= 0; oi2--) {
      var obj2 = objects[oi2];
      if (!obj2.sliced) {
        obj2.x += obj2.vx * dt;
        obj2.y += obj2.vy * dt;
        obj2.vy += 700 * dt; // gravity
        obj2.fuseAnim += dt * 5;
      } else {
        obj2.sliceAnim -= dt * 2;
      }
      if (obj2.y > H + 100 || obj2.x < -200 || obj2.x > W + 200 || obj2.sliceAnim < 0) {
        objects.splice(oi2, 1);
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 400 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Background atmosphere
    for (var bi = 0; bi < bgSlashes.length; bi++) {
      bgSlashes[bi].alpha -= dt * 0.5;
    }
    bgSlashes = bgSlashes.filter(function(b) { return b.alpha > 0; });

    // Objects
    for (var oi3 = 0; oi3 < objects.length; oi3++) {
      var o = objects[oi3];
      if (o.sliced) {
        // Slice effect: two halves flying apart
        var sa = o.sliceAnim;
        game.draw.circle(o.x - 20 * (1 - sa), o.y, o.r * sa, o.col, sa * 0.8);
        game.draw.circle(o.x + 20 * (1 - sa), o.y, o.r * sa, o.col, sa * 0.8);
        continue;
      }
      if (o.type === 'target') {
        game.draw.circle(o.x, o.y, o.r + 8, o.col, 0.2);
        game.draw.circle(o.x, o.y, o.r, o.col, 0.9);
        game.draw.circle(o.x, o.y, o.r * 0.6, o.hiCol, 0.4);
        game.draw.circle(o.x, o.y, o.r * 0.25, '#fff', 0.6);
      } else {
        // Bomb: dark circle with fuse
        game.draw.circle(o.x, o.y, o.r + 10, C.bombHi, 0.15);
        game.draw.circle(o.x, o.y, o.r, C.bomb, 0.95);
        game.draw.circle(o.x, o.y, o.r * 0.5, C.bombHi, 0.2);
        // Fuse sparks
        var fuseX = o.x + o.r * 0.5;
        var fuseY = o.y - o.r;
        game.draw.line(fuseX, fuseY, fuseX + 10, fuseY - 30 + Math.sin(o.fuseAnim) * 10, C.fuse, 4);
        game.draw.circle(fuseX + 10 + Math.sin(o.fuseAnim) * 8, fuseY - 40, 8, C.fuse, 0.9);
        game.draw.text('💣', o.x, o.y + 12, { size: 48, color: '#fff' });
      }
    }

    // Slash trail
    if (lastSwipeTimer > 0 && slashTrail.length > 1) {
      for (var st = 0; st < slashTrail.length - 1; st++) {
        var alpha2 = slashTrail[st].alpha * lastSwipeTimer / 0.15;
        game.draw.line(slashTrail[st].x, slashTrail[st].y, slashTrail[st + 1].x, slashTrail[st + 1].y, C.slash, 8 * alpha2);
        game.draw.line(slashTrail[st].x, slashTrail[st].y, slashTrail[st + 1].x, slashTrail[st + 1].y, C.slashHi, 3 * alpha2);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, p.r * p.life * 2, p.col, p.life * 0.8);
    }

    game.draw.text('スワイプで斬れ！', W / 2, H * 0.89, { size: 40, color: C.ui });
    game.draw.text(sliced + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    // Bomb dots
    for (var bi2 = 0; bi2 < MAX_BOMB; bi2++) {
      game.draw.circle(W / 2 - (MAX_BOMB - 1) * 28 + bi2 * 56, H * 0.93, 16, bi2 < bombHits ? C.danger : '#08020a');
    }

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.target1 : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    spawnTimer = 0.3;
  });
})(game);

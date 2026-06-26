// 468-typing-rain.js
// タイピング雨 — 降ってくる文字をスワイプ方向で打ち返す
// 操作: 文字に対応した方向にスワイプ（↑=あ行 ↓=か行 ←=さ行 →=た行）
// 成功: 40文字処理  失敗: 10個逃す or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020812',
    dropUp:   '#22d3ee',
    dropDown: '#f43f5e',
    dropLeft: '#22c55e',
    dropRight:'#f97316',
    hitUp:    '#cffafe',
    hitDown:  '#fca5a5',
    hitLeft:  '#bbf7d0',
    hitRight: '#fed7aa',
    miss:   '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var KANA_MAP = {
    up:    ['あ','い','う','え','お'],
    down:  ['か','き','く','け','こ'],
    left:  ['さ','し','す','せ','そ'],
    right: ['た','ち','つ','て','と']
  };
  var DIRS = ['up','down','left','right'];
  var DIR_COLORS = { up: C.dropUp, down: C.dropDown, left: C.dropLeft, right: C.dropRight };
  var HIT_COLORS = { up: C.hitUp, down: C.hitDown, left: C.hitLeft, right: C.hitRight };
  var DIR_ARROWS = { up: '↑', down: '↓', left: '←', right: '→' };

  var drops = [];
  var particles = [];
  var hitFeedbacks = [];
  var processed = 0;
  var NEEDED = 40;
  var misses = 0;
  var MAX_MISS = 10;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var nextSpawn = 0.8;

  function spawnDrop() {
    var dir = DIRS[Math.floor(Math.random() * DIRS.length)];
    var kanas = KANA_MAP[dir];
    var kana = kanas[Math.floor(Math.random() * kanas.length)];
    var x = 80 + Math.random() * (W - 160);
    drops.push({ x: x, y: -50, kana: kana, dir: dir, speed: 180 + Math.random() * 80 + processed * 1.5, r: 50 });
  }

  game.onSwipe(function(dir) {
    if (done) return;
    // Hit all drops with matching direction
    var hitAny = false;
    for (var di = drops.length - 1; di >= 0; di--) {
      var d = drops[di];
      if (d.dir === dir) {
        for (var pi = 0; pi < 8; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: d.x, y: d.y, vx: Math.cos(ang)*180, vy: Math.sin(ang)*180, life: 0.5, col: DIR_COLORS[dir] });
        }
        hitFeedbacks.push({ text: DIR_ARROWS[dir] + ' ' + d.kana, x: d.x, y: d.y, col: HIT_COLORS[dir], life: 0.6 });
        drops.splice(di, 1);
        processed++;
        hitAny = true;
        game.audio.play('se_tap', 0.4);
        if (processed >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.8);
          setTimeout(function() { game.end.success(processed * 100 + Math.ceil(timeLeft) * 80); }, 700);
          return;
        }
      }
    }
    if (!hitAny) {
      // Wrong direction, no drops hit
      misses++;
      game.audio.play('se_failure', 0.3);
      if (misses >= MAX_MISS && !done) {
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

    // Spawn
    nextSpawn -= dt;
    if (nextSpawn <= 0 && !done) {
      spawnDrop();
      nextSpawn = 0.4 + Math.random() * 0.5;
    }

    // Move drops
    for (var di = drops.length - 1; di >= 0; di--) {
      drops[di].y += drops[di].speed * dt;
      if (drops[di].y > H + 60) {
        drops.splice(di, 1);
        misses++;
        game.audio.play('se_failure', 0.2);
        if (misses >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
    }

    // Hit feedbacks
    for (var hi = hitFeedbacks.length - 1; hi >= 0; hi--) {
      hitFeedbacks[hi].y -= 80 * dt;
      hitFeedbacks[hi].life -= dt * 2;
      if (hitFeedbacks[hi].life <= 0) hitFeedbacks.splice(hi, 1);
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

    // Legend at bottom
    var legendY = H * 0.86;
    var lDirs = ['up','down','left','right'];
    for (var li = 0; li < lDirs.length; li++) {
      var ld = lDirs[li];
      var lx = W * 0.13 + li * (W * 0.25);
      game.draw.circle(lx, legendY, 38, DIR_COLORS[ld], 0.2);
      game.draw.text(DIR_ARROWS[ld], lx, legendY + 14, { size: 52, color: DIR_COLORS[ld], bold: true });
      var kLabel = KANA_MAP[ld][0] + '行';
      game.draw.text(kLabel, lx, legendY + 58, { size: 28, color: C.ui });
    }

    // Drops
    for (var di2 = 0; di2 < drops.length; di2++) {
      var d2 = drops[di2];
      var dCol = DIR_COLORS[d2.dir];
      game.draw.circle(d2.x, d2.y, d2.r * 1.2, dCol, 0.1);
      game.draw.circle(d2.x, d2.y, d2.r, dCol, 0.85);
      game.draw.text(d2.kana, d2.x, d2.y + 22, { size: 60, color: '#fff', bold: true });
    }

    // Hit feedbacks
    for (var hi2 = 0; hi2 < hitFeedbacks.length; hi2++) {
      var hf = hitFeedbacks[hi2];
      game.draw.text(hf.text, hf.x, hf.y, { size: 44, color: hf.col, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.8);
    }

    // Miss dots
    var missPerRow = 5;
    for (var mi = 0; mi < MAX_MISS; mi++) {
      var mx = W*0.1 + (mi % missPerRow) * (W*0.8/(missPerRow-1));
      var my2 = mi < missPerRow ? H*0.948 : H*0.963;
      game.draw.circle(mx, my2, 14, mi < misses ? C.miss : C.ui, 0.9);
    }

    game.draw.text(processed + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.dropUp : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    spawnDrop();
    spawnDrop();
    spawnDrop();
  });
})(game);

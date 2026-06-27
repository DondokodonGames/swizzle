// 608-bubble-pop.js
// バブルポップ — 大きくなりすぎる前に泡を弾いてストレス発散
// 操作: タップで泡を割る、連続タップでコンボ
// 成功: 50個割破  失敗: 5個逃げる or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0018',
    b1:     '#ff69b4',
    b2:     '#7b68ee',
    b3:     '#00ced1',
    b4:     '#ffd700',
    b5:     '#ff6347',
    shine:  '#ffffff',
    pop:    '#ffeecc',
    text:   '#f1f5f9',
    ui:     '#1a0030',
    miss:   '#ef4444',
    hit:    '#22c55e'
  };

  var COLS = [C.b1, C.b2, C.b3, C.b4, C.b5];

  var bubbles = [];
  var popped = 0;
  var NEEDED = 50;
  var escaped = 0;
  var MAX_ESCAPE = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var combo = 0;
  var comboTimer = 0;
  var comboText = '';
  var comboTextTimer = 0;
  var flashAnim = 0, flashCol = C.hit;
  var spawnTimer = 0;
  var spawnInterval = 1.2;

  function spawnBubble() {
    var r = 40 + Math.random() * 50;
    bubbles.push({
      x: r + Math.random() * (W - r * 2),
      y: H + r,
      r: r,
      targetR: r,
      vx: (Math.random() - 0.5) * 60,
      vy: -80 - Math.random() * 60,
      col: COLS[Math.floor(Math.random() * COLS.length)],
      phase: Math.random() * Math.PI * 2,
      wobble: 0
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var hit = false;
    for (var i = bubbles.length - 1; i >= 0; i--) {
      var b = bubbles[i];
      var dx = tx - b.x, dy = ty - b.y;
      if (dx * dx + dy * dy < b.r * b.r) {
        // Pop!
        popped++;
        combo++;
        comboTimer = 1.2;
        hit = true;
        var col = b.col;
        for (var p = 0; p < 10; p++) {
          var ang = Math.random() * Math.PI * 2;
          var spd = 150 + Math.random() * 200;
          particles.push({ x: b.x, y: b.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 0.5, r: 8 + Math.random() * 8, col: col });
        }
        bubbles.splice(i, 1);
        game.audio.play('se_tap', 0.3 + Math.min(combo * 0.05, 0.4));
        if (combo >= 5) {
          comboText = combo + 'コンボ!';
          comboTextTimer = 0.8;
        }
        if (popped >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(popped * 200 + combo * 50 + Math.ceil(timeLeft) * 100); }, 700);
        }
        break;
      }
    }
    if (!hit) {
      combo = 0;
      flashCol = C.miss;
      flashAnim = 0.1;
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

    if (comboTimer > 0) comboTimer -= dt;
    else combo = 0;
    if (comboTextTimer > 0) comboTextTimer -= dt;
    if (flashAnim > 0) flashAnim -= dt * 4;

    spawnTimer += dt;
    var rate = Math.max(0.5, spawnInterval - elapsed * 0.01);
    if (spawnTimer > rate) {
      spawnTimer = 0;
      spawnBubble();
      if (Math.random() < 0.3) spawnBubble();
    }

    for (var i = bubbles.length - 1; i >= 0; i--) {
      var b = bubbles[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.phase += dt * 2;
      b.wobble = Math.sin(b.phase) * 0.08;
      // Wall bounce
      if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); }
      if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
      // Escaped off top
      if (b.y + b.r < 0) {
        escaped++;
        bubbles.splice(i, 1);
        flashCol = C.miss;
        flashAnim = 0.2;
        game.audio.play('se_failure', 0.2);
        if (escaped >= MAX_ESCAPE && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 200 * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Bubbles
    for (var bi = 0; bi < bubbles.length; bi++) {
      var b2 = bubbles[bi];
      var rx = b2.r * (1 + b2.wobble);
      var ry = b2.r * (1 - b2.wobble);
      game.draw.circle(b2.x, b2.y, rx + 6, b2.col, 0.08);
      game.draw.circle(b2.x, b2.y, rx, b2.col, 0.25);
      game.draw.circle(b2.x, b2.y, rx - 4, b2.col, 0.1);
      // Shine
      game.draw.circle(b2.x - rx * 0.3, b2.y - ry * 0.3, rx * 0.25, C.shine, 0.7);
      game.draw.circle(b2.x - rx * 0.15, b2.y - ry * 0.15, rx * 0.1, C.shine, 0.9);
      // Outline ring
      game.draw.circle(b2.x, b2.y, rx, b2.col, 0.5);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, p.r * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.12);

    if (comboTextTimer > 0) {
      game.draw.text(comboText, W / 2, H * 0.5, { size: 72, color: C.b4, bold: true });
    }

    // Escape dots
    for (var ei = 0; ei < MAX_ESCAPE; ei++) {
      game.draw.circle(W / 2 - (MAX_ESCAPE - 1) * 50 + ei * 100, H * 0.955, 20, ei < escaped ? C.miss : C.ui, 0.9);
    }

    game.draw.text(popped + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.b2 : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    spawnBubble();
    spawnBubble();
    spawnBubble();
  });
})(game);

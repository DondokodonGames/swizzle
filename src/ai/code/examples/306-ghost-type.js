// 306-ghost-type.js
// ゴーストタイプ — 画面に浮かぶ幽霊をタップする前にその「弱点属性」を当てる
// 操作: 上スワイプ=火、下スワイプ=水、左=草、右=雷 → 正しい属性でタップ
// 成功: 20体倒す  失敗: 3回間違い or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#060210',
    ghost:  '#a78bfa',
    ghostHi:'#c4b5fd',
    ghostLo:'#7c3aed',
    fire:   '#ef4444',
    water:  '#3b82f6',
    grass:  '#22c55e',
    thunder:'#f59e0b',
    correct:'#86efac',
    wrong:  '#fca5a5',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var TYPES = ['fire', 'water', 'grass', 'thunder'];
  var TYPE_COLORS = {
    fire: C.fire, water: C.water, grass: C.grass, thunder: C.thunder
  };
  var TYPE_SYMBOLS = {
    fire: '🔥', water: '💧', grass: '🌿', thunder: '⚡'
  };
  var TYPE_SWIPE = {
    up: 'fire', down: 'water', left: 'grass', right: 'thunder'
  };

  var ghosts = []; // {x,y,vy,wobble,weakness,revealed,hitAnim,life}
  var selectedType = null;
  var selectedTimer = 0;
  var defeated = 0;
  var NEEDED = 20;
  var errors = 0;
  var MAX_ERR = 3;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var spawnTimer = 0;
  var particles = [];

  function spawnGhost() {
    if (ghosts.length >= 4) return;
    var x = 120 + Math.random() * (W - 240);
    var weakness = TYPES[Math.floor(Math.random() * TYPES.length)];
    ghosts.push({
      x: x,
      y: H + 100,
      vy: -120 - Math.random() * 80,
      wobble: Math.random() * Math.PI * 2,
      weakness: weakness,
      revealed: false,
      hitAnim: 0,
      life: 8 + Math.random() * 4
    });
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    var type = TYPE_SWIPE[dir];
    if (type) {
      selectedType = type;
      selectedTimer = 1.5;
      game.audio.play('se_tap', 0.2);
    }
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    if (!selectedType) {
      // No type selected — show hint
      return;
    }
    // Check hit
    for (var gi = ghosts.length - 1; gi >= 0; gi--) {
      var g = ghosts[gi];
      var dx = tx - g.x, dy = ty - g.y;
      if (dx * dx + dy * dy < 80 * 80) {
        if (selectedType === g.weakness) {
          // Correct!
          defeated++;
          game.audio.play('se_success', 0.5);
          for (var pi = 0; pi < 8; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: g.x, y: g.y, vx: Math.cos(ang) * 220, vy: Math.sin(ang) * 220, life: 0.6, col: TYPE_COLORS[selectedType] });
          }
          ghosts.splice(gi, 1);
          selectedType = null;
          if (defeated >= NEEDED && !done) {
            done = true;
            setTimeout(function() { game.end.success(defeated * 200 + Math.ceil(timeLeft) * 100); }, 400);
          }
        } else {
          // Wrong type!
          errors++;
          game.audio.play('se_failure', 0.4);
          for (var pi2 = 0; pi2 < 5; pi2++) {
            var ang2 = Math.random() * Math.PI * 2;
            particles.push({ x: g.x, y: g.y, vx: Math.cos(ang2) * 150, vy: Math.sin(ang2) * 150, life: 0.4, col: C.wrong });
          }
          g.hitAnim = 0.4;
          selectedType = null;
          if (errors >= MAX_ERR && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 400);
          }
        }
        return;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (selectedTimer > 0) selectedTimer -= dt;
    if (selectedTimer <= 0) selectedType = null;

    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnGhost();
      spawnTimer = 1.5 + Math.random() * 1.0;
    }

    for (var gi = ghosts.length - 1; gi >= 0; gi--) {
      var g = ghosts[gi];
      g.y += g.vy * dt;
      g.wobble += dt * 2;
      g.life -= dt;
      if (g.hitAnim > 0) g.hitAnim -= dt;
      // Reveal weakness when getting close to player zone
      if (g.y < H * 0.7) g.revealed = true;
      // Bounce off ceiling
      if (g.y < H * 0.15) { g.vy = Math.abs(g.vy); }
      // Remove if drifted off screen or expired
      if (g.life <= 0 || g.y > H + 120) {
        ghosts.splice(gi, 1);
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Background ghost wisps
    for (var wi = 0; wi < 5; wi++) {
      var wx2 = (wi * 220 + elapsed * 30) % W;
      var wy = H * (0.3 + 0.4 * Math.sin(elapsed * 0.5 + wi));
      game.draw.circle(wx2, wy, 30, C.ghostLo, 0.08);
    }

    // Ghosts
    for (var gi2 = 0; gi2 < ghosts.length; gi2++) {
      var g2 = ghosts[gi2];
      var wob = Math.sin(g2.wobble) * 15;
      var gR = 70;
      var blink = g2.hitAnim > 0 && Math.sin(g2.hitAnim * 20) > 0;
      var col = blink ? C.wrong : C.ghost;

      game.draw.circle(g2.x + wob, g2.y, gR + 8, col, 0.1);
      game.draw.circle(g2.x + wob, g2.y, gR, col, 0.85);
      game.draw.circle(g2.x + wob - gR * 0.3, g2.y - gR * 0.2, gR * 0.15, '#fff', 0.6); // eye
      game.draw.circle(g2.x + wob + gR * 0.2, g2.y - gR * 0.2, gR * 0.12, '#fff', 0.5);
      // Wavy bottom
      for (var wb = 0; wb < 3; wb++) {
        var wbx = g2.x + wob - gR + wb * (gR * 2 / 3);
        game.draw.circle(wbx, g2.y + gR - 10, gR / 3 + 5, C.bg, 1.0);
      }

      // Weakness badge (revealed when close)
      if (g2.revealed) {
        var wType = g2.weakness;
        game.draw.circle(g2.x + wob + gR * 0.5, g2.y - gR * 0.5, 30, TYPE_COLORS[wType], 0.9);
        game.draw.text(TYPE_SYMBOLS[wType], g2.x + wob + gR * 0.5, g2.y - gR * 0.5 + 12, { size: 32 });
      } else {
        game.draw.circle(g2.x + wob + gR * 0.5, g2.y - gR * 0.5, 30, '#1e1b4b', 0.8);
        game.draw.text('?', g2.x + wob + gR * 0.5, g2.y - gR * 0.5 + 12, { size: 32, color: C.ghostHi, bold: true });
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life * 2, p.col, p.life * 0.8);
    }

    // Type selection display
    var btnY = H * 0.84;
    var btnTypes = [['up', 'fire', '↑'], ['down', 'water', '↓'], ['left', 'grass', '←'], ['right', 'thunder', '→']];
    for (var bt = 0; bt < btnTypes.length; bt++) {
      var bt2 = btnTypes[bt];
      var bx = W * 0.1 + bt * W * 0.22;
      var isSelected = selectedType === bt2[1];
      game.draw.rect(bx - 40, btnY, 80, 80, isSelected ? TYPE_COLORS[bt2[1]] : '#1e1b4b', 0.9);
      game.draw.text(TYPE_SYMBOLS[bt2[1]], bx, btnY + 40, { size: 36 });
      game.draw.text(bt2[2], bx, btnY + 76, { size: 24, color: isSelected ? '#fff' : C.ui });
    }

    if (selectedType) {
      game.draw.text(TYPE_SYMBOLS[selectedType] + ' 選択中！タップで攻撃', W / 2, H * 0.78, { size: 36, color: TYPE_COLORS[selectedType], bold: true });
    } else {
      game.draw.text('スワイプで属性選択', W / 2, H * 0.78, { size: 36, color: C.ui });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 28 + ei * 56, H * 0.96, 16, ei < errors ? C.wrong : '#060210');
    }

    game.draw.text(defeated + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.ghostLo : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    spawnTimer = 0.3;
  });
})(game);

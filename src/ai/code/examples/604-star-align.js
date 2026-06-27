// 604-star-align.js
// スターアライン — 星座を完成させるために星を正しい位置に配置する
// 操作: タップで星を選択、もう一度タップで配置先を指定
// 成功: 8星座完成  失敗: 10回配置ミス or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#000008',
    space:   '#000010',
    star:    '#ffeeaa',
    starHi:  '#ffffff',
    selected:'#44aaff',
    selectedHi:'#88ccff',
    slot:    '#112233',
    slotHi:  '#224466',
    line:    '#224466',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#0a0a2a'
  };

  // Constellation patterns (relative positions of stars)
  var PATTERNS = [
    [[0,0],[1,0],[2,0],[1,-1]], // T shape
    [[0,0],[1,1],[2,0],[0,1]], // Diamond
    [[0,0],[0,1],[1,1],[2,1],[2,0]], // L
    [[0,0],[1,0],[2,0],[1,1],[1,-1]], // Plus
    [[0,0],[1,1],[2,2],[0,2]], // Z
    [[0,0],[0,1],[0,2],[1,0],[2,0]], // Corner
    [[0,0],[1,0],[2,0],[0,1],[2,1]], // U
    [[0,1],[1,0],[1,2],[2,1]] // X
  ];

  var STAR_R = 22;
  var SLOT_R = 26;
  var PLAY_W = W - 80;
  var PLAY_H = H * 0.5;
  var PLAY_OX = 40;
  var PLAY_OY = H * 0.22;

  var stars = []; // draggable stars at bottom
  var slots = []; // target positions for current constellation
  var selectedStar = -1;
  var constellationsDone = 0;
  var NEEDED = 8;
  var mistakes = 0;
  var MAX_MISTAKES = 10;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var twinkling = [];
  var resultText = '';
  var resultTimer = 0;

  // Background stars
  for (var bsi = 0; bsi < 80; bsi++) {
    twinkling.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2 + 0.5, phase: Math.random() * Math.PI * 2 });
  }

  function loadConstellation() {
    var patIdx = constellationsDone % PATTERNS.length;
    var pat = PATTERNS[patIdx];

    // Scale pattern to fit play area
    var maxC = 0, maxR = 0;
    for (var i = 0; i < pat.length; i++) {
      if (pat[i][0] > maxC) maxC = pat[i][0];
      if (Math.abs(pat[i][1]) > maxR) maxR = Math.abs(pat[i][1]);
    }
    var scale = Math.min(PLAY_W * 0.6 / (maxC + 1), PLAY_H * 0.5 / (maxR * 2 + 1), 120);
    var centerX = PLAY_OX + PLAY_W / 2;
    var centerY = PLAY_OY + PLAY_H / 2;

    slots = [];
    for (var si = 0; si < pat.length; si++) {
      slots.push({
        x: centerX + pat[si][0] * scale - maxC * scale / 2,
        y: centerY + pat[si][1] * scale,
        filled: false,
        starIdx: -1,
        phase: Math.random() * Math.PI * 2
      });
    }

    // Create stars to place (same count as slots)
    var starY = H * 0.83;
    var starSpacing = Math.min(120, (W - 80) / pat.length);
    var startX = W / 2 - (pat.length - 1) * starSpacing / 2;
    stars = [];
    for (var i2 = 0; i2 < pat.length; i2++) {
      stars.push({
        x: startX + i2 * starSpacing,
        y: starY,
        phase: Math.random() * Math.PI * 2,
        placed: false
      });
    }
    selectedStar = -1;
  }

  function checkComplete() {
    return slots.every(function(s) { return s.filled; });
  }

  game.onTap(function(tx, ty) {
    if (done) return;

    if (selectedStar < 0) {
      // Try to select a star from the bottom
      for (var si = 0; si < stars.length; si++) {
        var s = stars[si];
        if (s.placed) continue;
        var dx = tx - s.x, dy = ty - s.y;
        if (dx * dx + dy * dy < (STAR_R + 30) * (STAR_R + 30)) {
          selectedStar = si;
          game.audio.play('se_tap', 0.2);
          return;
        }
      }
    } else {
      // Try to place selected star in a slot
      var hitSlot = -1;
      for (var sli = 0; sli < slots.length; sli++) {
        var sl = slots[sli];
        if (sl.filled) continue;
        var dx2 = tx - sl.x, dy2 = ty - sl.y;
        if (dx2 * dx2 + dy2 * dy2 < (SLOT_R + 40) * (SLOT_R + 40)) {
          hitSlot = sli;
          break;
        }
      }

      if (hitSlot >= 0) {
        // Place star
        slots[hitSlot].filled = true;
        slots[hitSlot].starIdx = selectedStar;
        stars[selectedStar].placed = true;
        stars[selectedStar].x = slots[hitSlot].x;
        stars[selectedStar].y = slots[hitSlot].y;
        selectedStar = -1;
        game.audio.play('se_tap', 0.3);

        if (checkComplete()) {
          constellationsDone++;
          flashCol = C.correct;
          flashAnim = 0.4;
          resultText = '完成!';
          resultTimer = 0.7;
          game.audio.play('se_success', 0.8);
          for (var pi = 0; pi < 12; pi++) {
            var ang = Math.random() * Math.PI * 2;
            var cx = PLAY_OX + PLAY_W / 2, cy = PLAY_OY + PLAY_H / 2;
            particles.push({ x: cx + (Math.random() - 0.5) * 200, y: cy + (Math.random() - 0.5) * 200, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.6, col: C.starHi });
          }
          if (constellationsDone >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(constellationsDone * 600 + Math.ceil(timeLeft) * 100); }, 800);
          } else {
            setTimeout(function() { if (!done) loadConstellation(); }, 1200);
          }
        }
      } else {
        // Clicked wrong area
        if (tx < W / 2 - 20 || tx > W / 2 + 20 || ty < PLAY_OY || ty > PLAY_OY + PLAY_H) {
          // Deselect
          selectedStar = -1;
        }
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
    if (resultTimer > 0) resultTimer -= dt;

    for (var ti = 0; ti < twinkling.length; ti++) {
      twinkling[ti].phase += dt * (1 + Math.random());
    }
    for (var si = 0; si < stars.length; si++) {
      stars[si].phase += dt * 2;
    }
    for (var sli = 0; sli < slots.length; sli++) {
      slots[sli].phase += dt * 1.5;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 1.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Background stars
    for (var bsi2 = 0; bsi2 < twinkling.length; bsi2++) {
      var ts = twinkling[bsi2];
      var ta = 0.3 + Math.sin(ts.phase) * 0.25;
      game.draw.circle(ts.x, ts.y, ts.r, C.starHi, ta);
    }

    // Constellation area
    game.draw.rect(PLAY_OX, PLAY_OY, PLAY_W, PLAY_H, C.space, 0.5);

    // Slot connections (lines between filled slots)
    for (var sli2 = 0; sli2 < slots.length - 1; sli2++) {
      if (slots[sli2].filled && slots[sli2 + 1].filled) {
        game.draw.line(slots[sli2].x, slots[sli2].y, slots[sli2 + 1].x, slots[sli2 + 1].y, C.line, 3);
      }
    }

    // Slots
    for (var sli3 = 0; sli3 < slots.length; sli3++) {
      var sl2 = slots[sli3];
      var pulse = 1 + Math.sin(sl2.phase) * 0.15;
      if (!sl2.filled) {
        game.draw.circle(sl2.x, sl2.y, SLOT_R * pulse, C.slotHi, 0.3);
        game.draw.circle(sl2.x, sl2.y, SLOT_R * 0.4, C.slot, 0.8);
      } else {
        // Filled slot — star placed
        game.draw.circle(sl2.x, sl2.y, STAR_R * 1.5, C.correct, 0.2);
        game.draw.circle(sl2.x, sl2.y, STAR_R * pulse, C.star, 0.9);
        game.draw.circle(sl2.x - 6, sl2.y - 6, STAR_R * 0.3, C.starHi, 0.6);
      }
    }

    // Stars at bottom
    for (var si2 = 0; si2 < stars.length; si2++) {
      var s2 = stars[si2];
      if (s2.placed) continue;
      var isSelected = (si2 === selectedStar);
      var pulse2 = 1 + Math.sin(s2.phase) * 0.1;
      if (isSelected) {
        game.draw.circle(s2.x, s2.y, STAR_R * 1.8, C.selected, 0.25);
        game.draw.circle(s2.x, s2.y, STAR_R * pulse2, C.selectedHi, 0.9);
      } else {
        game.draw.circle(s2.x, s2.y, STAR_R * 1.3, C.star, 0.15);
        game.draw.circle(s2.x, s2.y, STAR_R * pulse2, C.star, 0.85);
      }
      game.draw.circle(s2.x - 6, s2.y - 6, STAR_R * 0.28, C.starHi, 0.5);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, PLAY_OY + PLAY_H + 40, { size: 60, color: flashCol, bold: true });
    }

    // Mistake dots
    for (var mi = 0; mi < MAX_MISTAKES; mi++) {
      game.draw.circle(W / 2 - (MAX_MISTAKES - 1) * 38 + mi * 76, H * 0.955, 16, mi < mistakes ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(constellationsDone + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.selected : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    loadConstellation();
  });
})(game);

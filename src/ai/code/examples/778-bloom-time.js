// 778-bloom-time.js
// ブルームタイム — 花が満開になった瞬間にタップせよ。枯れる前に
// 操作: タップ — 花が「満開（FULL_BLOOM）」状態の瞬間
// 成功: 30回成功  失敗: 10回ミス or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#030a04',
    stem:     '#15803d',
    stemHi:   '#4ade80',
    petal1:   '#f472b6',
    petal2:   '#fb7185',
    petal3:   '#fbbf24',
    petalHi:  '#fef3c7',
    center:   '#fde047',
    leaf:     '#16a34a',
    wilt:     '#92400e',
    wiltDk:   '#451a03',
    correct:  '#22c55e',
    wrong:    '#ef4444',
    text:     '#f1f5f9',
    ui:       '#060e06'
  };

  var CX = W / 2;
  var CY = H * 0.44;
  var STEM_LEN = H * 0.28;

  var bloom = 0;          // 0 = bud, 1 = full, >1 = wilting
  var GROW_SPEED = 0.6;
  var WILT_SPEED = 0.9;
  var FULL_BLOOM_ZONE = [0.88, 1.12]; // full bloom window
  var growing = true;
  var waitTimer = 0;
  var WAIT_DUR = 0.5;

  var score = 0;
  var NEEDED = 30;
  var errors = 0;
  var MAX_ERR = 10;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var petalColors = [C.petal1, C.petal2, C.petal3];

  function nextFlower() {
    bloom = 0;
    GROW_SPEED = Math.min(1.2, 0.6 + score * 0.02);
    WILT_SPEED = Math.min(1.8, 0.9 + score * 0.025);
    growing = true;
    waitTimer = 0;
  }

  function drawPetal(cx, cy, angle, size, col, alpha) {
    var px = cx + Math.cos(angle) * size * 0.7;
    var py = cy + Math.sin(angle) * size * 0.7;
    game.draw.circle(px, py, size * 0.55, col, alpha);
  }

  function drawFlower(cx, cy, bloomAmount) {
    var r = Math.min(1.0, bloomAmount);
    var wiltR = Math.max(0, bloomAmount - 1.0);
    var petalR = 60 * r;
    var petalCount = 6;
    var fade = wiltR > 0 ? (1 - wiltR * 0.8) : 1.0;
    var col = wiltR > 0.3 ? C.wilt : petalColors[Math.floor(elapsed) % petalColors.length];
    var petalSz = petalR * (1 - wiltR * 0.5);

    // Petals
    for (var pi = 0; pi < petalCount; pi++) {
      var pa = pi * Math.PI * 2 / petalCount + elapsed * 0.3;
      drawPetal(cx, cy, pa, petalSz, col, 0.85 * fade);
    }
    // Inner petals
    for (var pi2 = 0; pi2 < petalCount; pi2++) {
      var pa2 = pi2 * Math.PI * 2 / petalCount + Math.PI / petalCount + elapsed * 0.3;
      drawPetal(cx, cy, pa2, petalSz * 0.7, C.petalHi, 0.5 * fade);
    }
    // Center
    game.draw.circle(cx, cy, petalSz * 0.35, C.center, 0.9 * fade);
    game.draw.circle(cx, cy, petalSz * 0.15, '#fff', 0.7 * fade);
  }

  game.onTap(function(tx, ty) {
    if (done || waitTimer > 0 || !growing) return;
    var inBloom = bloom >= FULL_BLOOM_ZONE[0] && bloom <= FULL_BLOOM_ZONE[1];
    if (inBloom) {
      score++;
      growing = false;
      flashCol = C.correct;
      flashAnim = 0.24;
      resultText = '満開！';
      resultTimer = 0.42;
      game.audio.play('se_success', 0.65);
      for (var p = 0; p < 10; p++) {
        var pa = Math.random() * Math.PI * 2;
        var sp = 80 + Math.random() * 160;
        particles.push({ x: CX + Math.cos(pa) * 60, y: CY + Math.sin(pa) * 60, vx: Math.cos(pa) * sp, vy: Math.sin(pa) * sp - 40, life: 0.45, col: petalColors[p % petalColors.length] });
      }
      waitTimer = WAIT_DUR;
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 370 + Math.ceil(timeLeft) * 100); }, 700);
      }
    } else if (bloom < FULL_BLOOM_ZONE[0]) {
      errors++;
      growing = false;
      flashCol = C.wrong;
      flashAnim = 0.3;
      resultText = 'まだ蕾！';
      resultTimer = 0.42;
      game.audio.play('se_failure', 0.28);
      waitTimer = WAIT_DUR;
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
      }
    } else {
      errors++;
      growing = false;
      flashCol = C.wrong;
      flashAnim = 0.3;
      resultText = '枯れかけ！';
      resultTimer = 0.42;
      game.audio.play('se_failure', 0.28);
      waitTimer = WAIT_DUR;
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
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

    if (waitTimer > 0) {
      waitTimer -= dt;
      if (waitTimer <= 0 && !done) nextFlower();
    } else if (growing) {
      if (bloom < FULL_BLOOM_ZONE[1]) {
        bloom += GROW_SPEED * dt;
      } else {
        // Wilting
        bloom += WILT_SPEED * dt;
        if (bloom > 2.5) {
          // Fully wilted
          errors++;
          growing = false;
          flashCol = C.wrong;
          flashAnim = 0.3;
          resultText = '枯れた！';
          resultTimer = 0.45;
          game.audio.play('se_failure', 0.24);
          waitTimer = WAIT_DUR;
          if (errors >= MAX_ERR && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
          }
        }
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 350 * dt;
      particles[pp].life -= dt * 2.4;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    var inBloom = bloom >= FULL_BLOOM_ZONE[0] && bloom <= FULL_BLOOM_ZONE[1];

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Ground
    game.draw.rect(0, CY + STEM_LEN, W, H - (CY + STEM_LEN), '#0a1a0a', 0.9);
    game.draw.rect(0, CY + STEM_LEN, W, 12, C.leaf, 0.4);

    // Stem
    game.draw.line(CX, CY, CX, CY + STEM_LEN, C.stem, 16);
    game.draw.line(CX, CY, CX, CY + STEM_LEN, C.stemHi, 4);
    // Leaf
    if (bloom > 0.2) {
      var leafR = Math.min(1, bloom) * 60;
      game.draw.circle(CX - leafR, CY + STEM_LEN * 0.55, leafR * 0.7, C.leaf, 0.8);
    }

    // Growth meter
    var bloomPct = Math.min(1, bloom / FULL_BLOOM_ZONE[1]);
    game.draw.rect(W * 0.08, H * 0.75, W * 0.84, 18, '#0a1a0a', 0.8);
    game.draw.rect(W * 0.08, H * 0.75, W * 0.84 * bloomPct, 18, inBloom ? C.correct : (bloom > 1 ? C.wilt : C.stemHi), 0.85);
    // Zone markers
    game.draw.rect(W * 0.08 + W * 0.84 * (FULL_BLOOM_ZONE[0] / FULL_BLOOM_ZONE[1]) - 3, H * 0.75 - 4, 6, 26, C.correct, 0.8);
    game.draw.rect(W * 0.08 + W * 0.84 - 3, H * 0.75 - 4, 6, 26, C.wrong, 0.7);
    game.draw.text('蕾', W * 0.08 - 30, H * 0.76 + 8, { size: 28, color: C.stem });
    game.draw.text('満開', W / 2 - 24, H * 0.81, { size: 28, color: C.correct });
    game.draw.text('枯れ', W * 0.92 + 8, H * 0.76 + 8, { size: 28, color: C.wilt });

    // Flower
    drawFlower(CX, CY, bloom);

    // Bloom indicator
    if (inBloom && growing) {
      var pulse = 1.0 + 0.06 * Math.sin(elapsed * 15);
      game.draw.text('今タップ！', W / 2, H * 0.22, { size: Math.floor(64 * pulse), color: C.petalHi, bold: true });
    } else if (growing && bloom < FULL_BLOOM_ZONE[0]) {
      game.draw.text('もうすぐ満開...', W / 2, H * 0.22, { size: 40, color: C.text + '44' });
    } else if (growing) {
      game.draw.text('枯れる前に！', W / 2, H * 0.22, { size: 44, color: C.wilt + 'cc', bold: true });
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.86, { size: 52, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 48 + ei * 96, H * 0.955, 20, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    nextFlower();
  });
})(game);

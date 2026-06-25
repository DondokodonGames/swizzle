// 102-jewel-match.js
// 宝石マッチ — 光る宝石が次々と飛んでくる、同じ色を3連続でキャッチする連鎖の喜び
// 操作: タップで宝石をキャッチ（現在保持中の色と同じなら加点）
// 成功: 20個収集  失敗: 5回ミスマッチ or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#050810',
    ui:      '#334155'
  };

  var GEMS = [
    { color: '#ef4444', glow: '#fca5a5', name: 'ルビー' },
    { color: '#3b82f6', glow: '#93c5fd', name: 'サファイア' },
    { color: '#22c55e', glow: '#86efac', name: 'エメラルド' },
    { color: '#fbbf24', glow: '#fef3c7', name: 'トパーズ' },
    { color: '#8b5cf6', glow: '#c4b5fd', name: 'アメジスト' }
  ];

  var fallingGems = []; // { x, y, vy, gemType, caught, catchTimer }
  var heldColor = -1; // index into GEMS, -1 = empty
  var combo = 0;
  var score = 0;
  var needed = 20;
  var misses = 0;
  var maxMisses = 5;
  var timeLeft = 30;
  var done = false;
  var spawnTimer = 0;
  var SPAWN_INTERVAL = 0.9;
  var feedback = 0;
  var feedbackOk = false;
  var comboFlash = 0;

  function spawnGem() {
    var x = 80 + Math.random() * (W - 160);
    var gemType = Math.floor(Math.random() * GEMS.length);
    fallingGems.push({
      x: x, y: -60,
      vy: 300 + score * 8,
      gemType: gemType,
      caught: false,
      catchTimer: 0
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Find the lowest gem within tap radius
    var best = -1, bestY = -9999;
    for (var i = 0; i < fallingGems.length; i++) {
      var g = fallingGems[i];
      if (g.caught) continue;
      var dx = tx - g.x, dy = ty - g.y;
      if (Math.sqrt(dx * dx + dy * dy) < 80) {
        if (g.y > bestY) { bestY = g.y; best = i; }
      }
    }
    if (best < 0) return; // missed empty space

    var gem = fallingGems[best];

    if (heldColor === -1) {
      // First catch — set held color
      heldColor = gem.gemType;
      gem.caught = true;
      gem.catchTimer = 0.3;
      score++;
      combo = 1;
      game.audio.play('se_tap', 0.7);
    } else if (gem.gemType === heldColor) {
      // Same color — combo!
      gem.caught = true;
      gem.catchTimer = 0.3;
      combo++;
      score++;
      feedbackOk = true;
      feedback = 0.3;
      game.audio.play('se_tap', 0.8 + Math.min(combo * 0.05, 0.2));
      if (combo >= 3) {
        comboFlash = 0.4;
        score++; // bonus
        game.audio.play('se_success');
      }
    } else {
      // Wrong color!
      misses++;
      feedbackOk = false;
      feedback = 0.35;
      heldColor = gem.gemType; // reset to new color
      combo = 1;
      gem.caught = true;
      gem.catchTimer = 0.3;
      game.audio.play('se_failure', 0.6);
      if (misses >= maxMisses && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
        return;
      }
    }

    if (score >= needed && !done) {
      done = true;
      game.audio.play('se_success');
      setTimeout(function() { game.end.success(score * 20 + combo * 10 + Math.ceil(timeLeft) * 8); }, 400);
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
      spawnTimer = SPAWN_INTERVAL - score * 0.02;
      if (spawnTimer < 0.5) spawnTimer = 0.5;
      spawnGem();
    }

    var toRemove = [];
    for (var i = 0; i < fallingGems.length; i++) {
      var g = fallingGems[i];
      if (!g.caught) {
        g.y += g.vy * dt;
        if (g.y > H + 80) {
          toRemove.push(i);
          // Missed gem: lose combo
          combo = 0;
          heldColor = -1;
        }
      } else {
        g.catchTimer -= dt;
        if (g.catchTimer <= 0) toRemove.push(i);
      }
    }
    for (var j = toRemove.length - 1; j >= 0; j--) fallingGems.splice(toRemove[j], 1);

    if (feedback > 0) feedback -= dt;
    if (comboFlash > 0) comboFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Combo flash
    if (comboFlash > 0) {
      game.draw.rect(0, 0, W, H, '#fbbf24', comboFlash / 0.4 * 0.15);
    }

    // Gems
    for (var gi = 0; gi < fallingGems.length; gi++) {
      var gem2 = fallingGems[gi];
      var g2 = GEMS[gem2.gemType];
      var pulse = 0.6 + 0.4 * Math.abs(Math.sin(game.time.elapsed * 5 + gi));

      if (!gem2.caught) {
        // Outer glow
        game.draw.circle(gem2.x, gem2.y, 48 + pulse * 8, g2.glow, pulse * 0.25);
        // Gem body (diamond shape approximation with 2 circles)
        game.draw.circle(gem2.x, gem2.y, 36, g2.color);
        game.draw.circle(gem2.x, gem2.y, 28, g2.glow, 0.4);
        game.draw.circle(gem2.x - 10, gem2.y - 10, 10, '#fff', 0.5);
        // Highlight current held color
        if (gem2.gemType === heldColor) {
          game.draw.circle(gem2.x, gem2.y, 52, g2.color, pulse * 0.3);
        }
      } else {
        // Catch effect
        var cf = gem2.catchTimer / 0.3;
        game.draw.circle(gem2.x, gem2.y, 36 + (1 - cf) * 60, g2.color, cf * 0.6);
        game.draw.text('★', gem2.x, gem2.y, { size: 44, color: '#fff', bold: true });
      }
    }

    // Held color indicator
    if (heldColor >= 0) {
      var hg = GEMS[heldColor];
      game.draw.circle(W / 2, H * 0.82, 52, hg.color);
      game.draw.circle(W / 2, H * 0.82, 44, hg.glow, 0.4);
      game.draw.text('保持中', W / 2, H * 0.87, { size: 36, color: hg.glow });
      // Combo indicator
      if (combo > 1) {
        game.draw.text('×' + combo, W / 2 + 80, H * 0.82, { size: 48, color: '#fbbf24', bold: true });
      }
    } else {
      game.draw.text('タップして始める', W / 2, H * 0.82, { size: 44, color: '#334155' });
    }

    // Feedback
    if (feedback > 0) {
      game.draw.text(feedbackOk ? 'コンボ！' : '色ミスマッチ！', W / 2, H * 0.38, {
        size: 64, color: feedbackOk ? '#22c55e' : '#ef4444', bold: true
      });
    }
    if (comboFlash > 0) {
      game.draw.text('コンボ ' + combo + '！', W / 2, H * 0.28, { size: 80, color: '#fbbf24', bold: true });
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, '#050810');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#8b5cf6' : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score + misses
    game.draw.text(score + ' / ' + needed, W / 2, 140, { size: 56, color: '#f1f5f9', bold: true });
    for (var m = 0; m < maxMisses; m++) {
      var mx = W / 2 + (m - (maxMisses - 1) / 2) * 56;
      game.draw.circle(mx, 200, 18, m < misses ? '#ef4444' : '#0a1428');
    }
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
  });
})(game);

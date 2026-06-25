// 076-freeze-tag.js
// フリーズタグ — 動き回る敵を全員タップして凍らせる時間内に完遂
// 操作: タップで敵を凍結、凍った敵は徐々に解凍する
// 成功: 全員同時に凍結状態にする  失敗: 20秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030c18',
    enemy:   '#ef4444',
    enemyHi: '#fca5a5',
    frozen:  '#93c5fd',
    frozenHi:'#dbeafe',
    ice:     '#bfdbfe',
    ui:      '#475569'
  };

  var NUM_ENEMIES = 5;
  var ENEMY_R = 48;
  var FREEZE_TIME = 3.5; // seconds before thawing
  var enemies = [];
  var timeLeft = 20;
  var done = false;
  var flashTimer = 0;
  var MARGIN = 100;

  function initEnemies() {
    enemies = [];
    for (var i = 0; i < NUM_ENEMIES; i++) {
      var speed = 160 + Math.random() * 120;
      var ang = Math.random() * Math.PI * 2;
      enemies.push({
        x: MARGIN + Math.random() * (W - MARGIN * 2),
        y: H * 0.2 + Math.random() * (H * 0.65),
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        frozen: 0, // countdown; 0=not frozen, >0=frozen for this many seconds
        frozenMax: 0,
        jitter: Math.random() * Math.PI * 2
      });
    }
  }

  game.onTap(function(x, y) {
    if (done) return;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      var dx = x - e.x, dy = y - e.y;
      if (Math.sqrt(dx * dx + dy * dy) < ENEMY_R + 20) {
        e.frozen = FREEZE_TIME;
        e.frozenMax = FREEZE_TIME;
        game.audio.play('se_tap', 0.7);
        // Check if all frozen
        var allFrozen = enemies.every(function(en) { return en.frozen > 0; });
        if (allFrozen) {
          done = true;
          game.audio.play('se_success');
          setTimeout(function() { game.end.success(300 + Math.ceil(timeLeft) * 15); }, 400);
        }
        break;
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

    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.frozen > 0) {
        e.frozen -= dt;
        if (e.frozen < 0) e.frozen = 0;
      } else {
        // Move
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        // Bounce off walls
        if (e.x - ENEMY_R < MARGIN) { e.x = MARGIN + ENEMY_R; e.vx = Math.abs(e.vx); }
        if (e.x + ENEMY_R > W - MARGIN) { e.x = W - MARGIN - ENEMY_R; e.vx = -Math.abs(e.vx); }
        if (e.y - ENEMY_R < H * 0.18) { e.y = H * 0.18 + ENEMY_R; e.vy = Math.abs(e.vy); }
        if (e.y + ENEMY_R > H * 0.85) { e.y = H * 0.85 - ENEMY_R; e.vy = -Math.abs(e.vy); }
        // Occasional direction change
        e.jitter += dt * 1.5;
        if (Math.sin(e.jitter) > 0.98) {
          var spd = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
          var ang2 = Math.atan2(e.vy, e.vx) + (Math.random() - 0.5) * Math.PI;
          e.vx = Math.cos(ang2) * spd;
          e.vy = Math.sin(ang2) * spd;
        }
      }
    }

    if (flashTimer > 0) flashTimer -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Enemies
    for (var j = 0; j < enemies.length; j++) {
      var en = enemies[j];
      var isFrozen = en.frozen > 0;
      var freezeRatio = isFrozen ? en.frozen / en.frozenMax : 0;

      if (isFrozen) {
        // Ice crystals around frozen enemy
        var iceR = ENEMY_R + 20 + (1 - freezeRatio) * 10;
        game.draw.circle(en.x, en.y, iceR, C.frozenHi, freezeRatio * 0.3);
        game.draw.circle(en.x, en.y, ENEMY_R + 8, C.frozen, freezeRatio * 0.8);
        game.draw.circle(en.x, en.y, ENEMY_R, C.frozen);
        game.draw.circle(en.x - 12, en.y - 14, ENEMY_R * 0.3, '#fff', freezeRatio * 0.5);
        // Cracking effect when low
        if (freezeRatio < 0.3) {
          game.draw.line(en.x - 20, en.y, en.x + 20, en.y, C.enemy, 3);
          game.draw.line(en.x, en.y - 20, en.x, en.y + 20, C.enemy, 3);
        }
        // Freeze timer arc
        game.draw.text(Math.ceil(en.frozen) + '', en.x, en.y + ENEMY_R + 40, {
          size: 36, color: C.ice, bold: true
        });
      } else {
        // Moving enemy
        var pulse = 0.2 + 0.15 * Math.sin(game.time.elapsed * 6 + j);
        game.draw.circle(en.x, en.y, ENEMY_R + 12, C.enemyHi, pulse);
        game.draw.circle(en.x, en.y, ENEMY_R, C.enemy);
        game.draw.circle(en.x - 12, en.y - 14, ENEMY_R * 0.3, '#fff', 0.4);
        // Eyes
        game.draw.circle(en.x - 12, en.y - 8, 8, '#fff', 0.8);
        game.draw.circle(en.x + 12, en.y - 8, 8, '#fff', 0.8);
        game.draw.circle(en.x - 12, en.y - 8, 4, '#1a0808');
        game.draw.circle(en.x + 12, en.y - 8, 4, '#1a0808');
      }
    }

    // Frozen count indicator
    var frozenCount = enemies.filter(function(e) { return e.frozen > 0; }).length;
    for (var f = 0; f < NUM_ENEMIES; f++) {
      var fx = W / 2 + (f - (NUM_ENEMIES - 1) / 2) * 80;
      game.draw.circle(fx, 140, 28, f < frozenCount ? C.frozen : C.enemy);
      if (f < frozenCount) {
        game.draw.circle(fx, 140, 16, '#fff', 0.3);
      }
    }
    game.draw.text(frozenCount + ' / ' + NUM_ENEMIES + ' 凍結！', W / 2, 212, {
      size: 48, color: frozenCount === NUM_ENEMIES ? C.frozenHi : '#64748b', bold: true
    });

    // Timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#030c18');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#1d4ed8' : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Guide
    game.draw.text('全員同時に凍らせろ！', W / 2, H - 200, { size: 56, color: C.ui, bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    initEnemies();
  });
})(game);

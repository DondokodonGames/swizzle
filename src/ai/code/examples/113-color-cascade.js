// 113-color-cascade.js
// カラーカスケード — 流れてくる色の滝を正しい色の容器に振り分ける分類の快感
// 操作: スワイプ左右で容器を選択してタップで受け取る
// 成功: 25個正確に振り分ける  失敗: 8回ミス or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:    '#030a14',
    ui:    '#334155'
  };

  var COLORS = [
    { name: 'R', fill: '#ef4444', dark: '#7f1d1d' },
    { name: 'G', fill: '#22c55e', dark: '#14532d' },
    { name: 'B', fill: '#3b82f6', dark: '#1e3a8a' }
  ];

  var NUM_BUCKETS = 3;
  var BUCKET_W = 200;
  var BUCKET_H = 200;
  var BUCKET_Y = H * 0.78;
  var bucketXs = [];
  for (var b = 0; b < NUM_BUCKETS; b++) {
    bucketXs.push(W / 2 + (b - 1) * (BUCKET_W + 32));
  }

  var selectedBucket = 1; // middle
  var drops = []; // { x, y, vy, colorIdx }
  var DROP_R = 44;
  var SPAWN_INTERVAL = 0.9;
  var spawnTimer = 0;
  var FALL_SPEED = 340;

  var score = 0;
  var needed = 25;
  var misses = 0;
  var maxMisses = 8;
  var timeLeft = 45;
  var done = false;
  var catchFlash = 0;
  var catchOk = false;

  function spawnDrop() {
    var ci = Math.floor(Math.random() * COLORS.length);
    var x = 160 + Math.random() * (W - 320);
    drops.push({ x: x, y: -DROP_R, vy: FALL_SPEED, colorIdx: ci });
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'left') selectedBucket = Math.max(0, selectedBucket - 1);
    if (dir === 'right') selectedBucket = Math.min(NUM_BUCKETS - 1, selectedBucket + 1);
    game.audio.play('se_tap', 0.3);
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    // Catch drops near bottom
    for (var i = drops.length - 1; i >= 0; i--) {
      var d = drops[i];
      if (d.y > H * 0.6) {
        var bci = d.colorIdx;
        if (bci === selectedBucket) {
          score++;
          catchOk = true;
          catchFlash = 0.35;
          game.audio.play('se_tap', 0.9);
          if (score >= needed && !done) {
            done = true;
            game.audio.play('se_success');
            setTimeout(function() { game.end.success(score * 30 + Math.ceil(timeLeft) * 10); }, 400);
          }
        } else {
          misses++;
          catchOk = false;
          catchFlash = 0.3;
          game.audio.play('se_failure', 0.6);
          if (misses >= maxMisses && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 400);
          }
        }
        drops.splice(i, 1);
        return;
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

    // Spawn
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = SPAWN_INTERVAL - score * 0.015;
      if (spawnTimer < 0.5) spawnTimer = 0.5;
      spawnDrop();
    }

    // Move drops
    for (var i = 0; i < drops.length; i++) {
      drops[i].y += drops[i].vy * dt;
    }
    // Remove drops that fell off screen (miss by falling)
    for (var j = drops.length - 1; j >= 0; j--) {
      if (drops[j].y > H + DROP_R) {
        drops.splice(j, 1);
        misses++;
        catchOk = false;
        catchFlash = 0.3;
        game.audio.play('se_failure', 0.4);
        if (misses >= maxMisses && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
      }
    }

    if (catchFlash > 0) catchFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Drops
    for (var di = 0; di < drops.length; di++) {
      var drop = drops[di];
      var col = COLORS[drop.colorIdx];
      game.draw.circle(drop.x, drop.y, DROP_R + 6, col.fill, 0.2);
      game.draw.circle(drop.x, drop.y, DROP_R, col.fill);
      game.draw.circle(drop.x - DROP_R * 0.3, drop.y - DROP_R * 0.3, DROP_R * 0.3, '#fff', 0.4);
      // Teardrop tail
      game.draw.circle(drop.x, drop.y - DROP_R, DROP_R * 0.5, col.fill, 0.5);
    }

    // Buckets
    for (var bi = 0; bi < NUM_BUCKETS; bi++) {
      var bx = bucketXs[bi];
      var col2 = COLORS[bi];
      var isSelected = bi === selectedBucket;
      // Selection highlight
      if (isSelected) {
        game.draw.rect(bx - BUCKET_W / 2 - 8, BUCKET_Y - 8, BUCKET_W + 16, BUCKET_H + 16, col2.fill, 0.2);
      }
      // Bucket body
      game.draw.rect(bx - BUCKET_W / 2, BUCKET_Y, BUCKET_W, BUCKET_H, col2.dark);
      game.draw.rect(bx - BUCKET_W / 2, BUCKET_Y, BUCKET_W, 12, col2.fill);
      // Color label
      game.draw.circle(bx, BUCKET_Y + BUCKET_H / 2 + 20, 48, col2.fill);
    }

    // Catch feedback
    if (catchFlash > 0) {
      game.draw.text(catchOk ? '✓' : '✗', bucketXs[selectedBucket], BUCKET_Y - 60, {
        size: 80, color: catchOk ? '#22c55e' : '#ef4444', bold: true
      });
      game.draw.rect(0, 0, W, H, catchOk ? '#22c55e' : '#ef4444', catchFlash * 0.15);
    }

    // Score + misses
    game.draw.text(score + ' / ' + needed, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });
    for (var mi = 0; mi < maxMisses; mi++) {
      var mxi = W / 2 + (mi - (maxMisses - 1) / 2) * 56;
      game.draw.circle(mxi, 212, 18, mi < misses ? '#ef4444' : '#0f1a2a');
    }

    game.draw.text('←→で容器を選んでタップ', W / 2, H * 0.9, { size: 40, color: C.ui });

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#8b5cf6' : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    spawnDrop();
  });
})(game);

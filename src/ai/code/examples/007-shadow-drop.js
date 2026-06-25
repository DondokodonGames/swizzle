// 007-shadow-drop.js
// シャドウドロップ — 影にぴったり重なったらタップ！精度の達成感
// 操作: 落ちてくるブロックが影と重なったらタップ
// 成功: 3回連続でぴったり合わせる  失敗: 3ミス or 20秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0f1117',
    floor:  '#1e293b',
    shadow: '#334155',
    block:  '#6366f1',
    exact:  '#22c55e',
    miss:   '#ef4444',
    ui:     '#64748b'
  };

  var score = 0;
  var needed = 3;
  var misses = 0;
  var maxMisses = 3;
  var timeLeft = 20;
  var done = false;

  // Target shadow position (fixed on floor)
  var FLOOR_Y = H - 320;
  var SHADOW_W = 220;
  var SHADOW_H = 220;
  var shadowX = W / 2 - SHADOW_W / 2;

  // Falling block
  var block = null;
  var resultFx = null; // { ok: bool, t: 0 }

  function spawnBlock() {
    block = {
      x:     W / 2 - SHADOW_W / 2,
      y:     160,
      w:     SHADOW_W,
      h:     SHADOW_H,
      vy:    game.random(280, 420 + score * 40),
      tapped: false
    };
  }

  function checkOverlap() {
    if (!block) return 0;
    // perfect if block y within ±60 of shadow top
    var diff = Math.abs(block.y - FLOOR_Y);
    return diff; // smaller = better
  }

  game.onTap(function(x, y) {
    if (done || !block || block.tapped) return;
    var diff = checkOverlap();
    block.tapped = true;

    if (diff <= 60) {
      score++;
      resultFx = { ok: true, t: 0, diff: diff };
      game.audio.play('se_tap', 0.9);
      if (score >= needed) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() {
          game.end.success(score * 40 + Math.ceil(timeLeft) * 5);
        }, 500);
      }
    } else {
      misses++;
      resultFx = { ok: false, t: 0, diff: diff };
      game.audio.play('se_failure', 0.5);
      if (misses >= maxMisses) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
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

    // block logic
    if (block) {
      if (block.tapped) {
        // fade out
        block.vy = 0;
      } else {
        block.y += block.vy * dt;
        // if block passes floor too far, it's a miss
        if (block.y > FLOOR_Y + SHADOW_H + 100 && !block.tapped) {
          block.tapped = true;
          misses++;
          resultFx = { ok: false, t: 0, diff: 999 };
          game.audio.play('se_failure', 0.5);
          if (misses >= maxMisses && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
        }
      }
    }

    if (resultFx) {
      resultFx.t += dt;
      if (resultFx.t > 0.55) {
        resultFx = null;
        if (!done) spawnBlock();
      }
    } else if (!block && !done) {
      spawnBlock();
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // floor
    game.draw.rect(0, FLOOR_Y + SHADOW_H + 8, W, H, C.floor);
    game.draw.rect(0, FLOOR_Y + SHADOW_H, W, 12, '#2d3a4a');

    // timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#111827');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#818cf8' : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // score & misses
    game.draw.text('★ ' + score + ' / ' + needed, W / 2, 130, { size: 52, color: '#818cf8', bold: true });
    for (var m = 0; m < maxMisses; m++) {
      var hx = W / 2 + (m - (maxMisses - 1) / 2) * 64;
      game.draw.circle(hx, 200, 20, m < misses ? C.miss : '#334155');
    }

    // shadow (with pulse glow near arrival)
    var glowAlpha = 0.15 + 0.1 * Math.sin(game.time.elapsed * 5);
    if (block && !block.tapped) {
      var proximity = Math.max(0, 1 - Math.abs(block.y - FLOOR_Y) / 400);
      glowAlpha += proximity * 0.5;
    }
    game.draw.rect(shadowX - 8, FLOOR_Y - 8, SHADOW_W + 16, SHADOW_H + 16, C.exact, glowAlpha);
    game.draw.rect(shadowX, FLOOR_Y, SHADOW_W, SHADOW_H, C.shadow);
    game.draw.text('↓', W / 2, FLOOR_Y + SHADOW_H / 2, { size: 80, color: '#4b5563', bold: true });

    // falling block
    if (block) {
      var blockAlpha = block.tapped ? Math.max(0, 1 - (resultFx ? resultFx.t * 2 : 0)) : 1;
      game.draw.rect(block.x - 8, block.y - 8, block.w + 16, block.h + 16, '#312e81', blockAlpha * 0.8);
      game.draw.rect(block.x, block.y, block.w, block.h, C.block, blockAlpha);
      game.draw.rect(block.x + 16, block.y + 16, 48, 48, '#a5b4fc', blockAlpha * 0.6);
    }

    // result feedback
    if (resultFx) {
      var progress = resultFx.t / 0.55;
      if (resultFx.ok) {
        var py = FLOOR_Y - 80 - progress * 120;
        game.draw.text('PERFECT!', W / 2, py, { size: 80, color: C.exact, bold: true });
        game.draw.rect(shadowX, FLOOR_Y, SHADOW_W, SHADOW_H, C.exact, (1 - progress) * 0.6);
      } else {
        game.draw.text('MISS', W / 2, FLOOR_Y - 80 - progress * 80, { size: 80, color: C.miss, bold: true });
        game.draw.rect(0, 0, W, H, C.miss, (1 - progress) * 0.1);
      }
    }

    // guide
    game.draw.text('影と重なったらタップ！', W / 2, H - 180, { size: 48, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.4);
    spawnBlock();
  });
})(game);

// 028-chain-burst.js
// チェーンバースト — 連鎖爆発の気持ちよさ、最大コンボを狙え
// 操作: タップで爆弾を起動、爆発が他の爆弾を誘爆する
// 成功: 1回のタップで10個以上の爆弾を連鎖爆発させる  失敗: 3回チャレンジ全敗

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0500',
    bomb:    '#292524',
    bombHi:  '#44403c',
    fuse:    '#f59e0b',
    explode: '#f97316',
    explodeHi:'#fef3c7',
    smoke:   '#57534e',
    good:    '#22c55e',
    ui:      '#475569'
  };

  var BOMB_R = 52;
  var EXPLODE_R = 180;
  var CHAIN_DELAY = 0.06; // seconds between chain triggers

  var bombs = [];
  var explosions = [];
  var pendingExplode = []; // { idx, delay }
  var bestChain = 0;
  var currentChain = 0;
  var attempts = 0;
  var maxAttempts = 3;
  var needed = 10;
  var done = false;
  var phase = 'place'; // 'place' | 'exploding' | 'result'
  var resultTimer = 0;
  var resultOk = false;

  function placeBombs() {
    bombs = [];
    explosions = [];
    pendingExplode = [];
    currentChain = 0;
    var count = 18 + Math.floor(Math.random() * 6);
    var tries = 0;
    while (bombs.length < count && tries < 1000) {
      tries++;
      var bx = game.random(BOMB_R + 40, W - BOMB_R - 40);
      var by = game.random(BOMB_R + 80, H - BOMB_R - 200);
      // Check spacing
      var ok = true;
      for (var i = 0; i < bombs.length; i++) {
        var dx = bombs[i].x - bx, dy = bombs[i].y - by;
        if (Math.sqrt(dx*dx+dy*dy) < BOMB_R * 2.2) { ok = false; break; }
      }
      if (ok) bombs.push({ x: bx, y: by, alive: true, exploding: false });
    }
    phase = 'place';
  }

  function triggerBomb(idx, delay) {
    if (idx < 0 || idx >= bombs.length || !bombs[idx].alive || bombs[idx].exploding) return;
    bombs[idx].exploding = true;
    pendingExplode.push({ idx: idx, delay: delay });
  }

  game.onTap(function(x, y) {
    if (done || phase !== 'place') return;

    // Find which bomb was tapped
    var hit = -1;
    for (var i = 0; i < bombs.length; i++) {
      if (!bombs[i].alive) continue;
      var dx = bombs[i].x - x, dy = bombs[i].y - y;
      if (Math.sqrt(dx*dx+dy*dy) < BOMB_R + 20) { hit = i; break; }
    }
    if (hit === -1) return;

    attempts++;
    phase = 'exploding';
    triggerBomb(hit, 0);
    game.audio.play('se_tap', 0.8);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      // no global timer — just attempts
    }

    if (phase === 'exploding') {
      // Process pending explosions
      for (var i = pendingExplode.length - 1; i >= 0; i--) {
        pendingExplode[i].delay -= dt;
        if (pendingExplode[i].delay <= 0) {
          var bIdx = pendingExplode[i].idx;
          pendingExplode.splice(i, 1);

          if (bombs[bIdx].alive) {
            bombs[bIdx].alive = false;
            currentChain++;
            if (currentChain > bestChain) bestChain = currentChain;

            // Create explosion visual
            explosions.push({ x: bombs[bIdx].x, y: bombs[bIdx].y, r: 0, maxR: EXPLODE_R, life: 0.5 });
            game.audio.play('se_tap', Math.min(1, 0.5 + currentChain * 0.02));

            // Trigger nearby bombs
            for (var j = 0; j < bombs.length; j++) {
              if (!bombs[j].alive || bombs[j].exploding) continue;
              var dx = bombs[j].x - bombs[bIdx].x;
              var dy = bombs[j].y - bombs[bIdx].y;
              if (Math.sqrt(dx*dx+dy*dy) < EXPLODE_R + BOMB_R) {
                triggerBomb(j, CHAIN_DELAY + Math.random() * 0.04);
              }
            }
          }
        }
      }

      // Check if all explosions settled
      if (pendingExplode.length === 0) {
        // Round over
        resultOk = currentChain >= needed;
        resultTimer = 1.2;
        phase = 'result';

        if (resultOk) {
          done = true;
          game.audio.play('se_success');
          setTimeout(function() {
            game.end.success(currentChain * 10 + Math.max(0, (maxAttempts - attempts) * 30));
          }, 1300);
        } else if (attempts >= maxAttempts) {
          done = true;
          game.audio.play('se_failure');
          setTimeout(function() { game.end.failure(); }, 1300);
        } else {
          game.audio.play('se_failure', 0.5);
        }
      }
    } else if (phase === 'result') {
      resultTimer -= dt;
      if (resultTimer <= 0 && !done) {
        placeBombs();
      }
    }

    // Update explosions
    for (var e = explosions.length - 1; e >= 0; e--) {
      var exp = explosions[e];
      exp.r = exp.maxR * (1 - exp.life / 0.5);
      exp.life -= dt;
      if (exp.life <= 0) explosions.splice(e, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Explosions (draw first, behind bombs)
    for (var ex = 0; ex < explosions.length; ex++) {
      var exp2 = explosions[ex];
      var ea = exp2.life / 0.5;
      game.draw.circle(exp2.x, exp2.y, exp2.r, C.explode, ea * 0.7);
      game.draw.circle(exp2.x, exp2.y, exp2.r * 0.5, C.explodeHi, ea * 0.5);
    }

    // Bombs
    for (var b = 0; b < bombs.length; b++) {
      var bomb = bombs[b];
      if (!bomb.alive) continue;

      game.draw.circle(bomb.x, bomb.y, BOMB_R, C.bombHi, 0.3);
      game.draw.circle(bomb.x, bomb.y, BOMB_R, C.bomb);
      game.draw.circle(bomb.x - BOMB_R * 0.3, bomb.y - BOMB_R * 0.3, BOMB_R * 0.25, '#fff', 0.15);

      // Fuse
      var fuseFlicker = bomb.exploding ? (0.5 + 0.5 * Math.sin(game.time.elapsed * 30)) : 1;
      game.draw.rect(bomb.x - 4, bomb.y - BOMB_R - 24, 8, 28, C.fuse, fuseFlicker);
      if (bomb.exploding) {
        game.draw.circle(bomb.x, bomb.y - BOMB_R - 24, 10, '#fff', fuseFlicker);
      }
    }

    // UI
    game.draw.rect(0, 0, W, 72, '#0a0500');
    game.draw.text('最大連鎖: ' + bestChain + ' / ' + needed, W / 2, 36, { size: 44, color: C.fuse, bold: true });

    // Attempts
    game.draw.text('チャンス: ' + (maxAttempts - attempts) + '回', W * 0.5, 128, { size: 52, color: '#a8a29e', bold: true });

    // Chain counter during explosion
    if (phase === 'exploding' && currentChain > 0) {
      game.draw.text('連鎖 ' + currentChain + '!', W / 2, H * 0.5, {
        size: 80 + Math.min(40, currentChain * 3), color: C.explode, bold: true
      });
    }

    // Result
    if (phase === 'result') {
      if (resultOk) {
        game.draw.text('クリア！ ' + currentChain + '連鎖！', W / 2, H * 0.5, { size: 80, color: C.good, bold: true });
      } else {
        game.draw.text(currentChain + '連鎖…', W / 2, H * 0.5, { size: 72, color: C.ui, bold: true });
        if (!done) game.draw.text('もう一度！', W / 2, H * 0.5 + 100, { size: 56, color: '#78716c' });
      }
    }

    // Guide
    if (phase === 'place') {
      game.draw.text('爆弾をタップして10連鎖！', W / 2, H - 200, { size: 48, color: C.ui });
    }
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    placeBombs();
  });
})(game);

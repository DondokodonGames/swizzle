// 733-chain-reaction.js
// チェーン反応 — 爆発する弾をタップして連鎖反応を最大化しろ
// 操作: タップで起爆（爆発範囲内の他の弾を連鎖）
// 成功: 100個以上の連鎖を15回  失敗: 6回失敗 or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040208',
    bomb:    '#dc2626',
    bombHi:  '#fca5a5',
    bombLit: '#fbbf24',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#080312'
  };

  var BOMB_COUNT = 22;
  var BOMB_R = 28;
  var EXPLODE_R = 90;
  var NEEDED_CHAIN = 10;  // need ≥ NEEDED_CHAIN bombs to explode
  var ROUNDS_NEEDED = 15;

  var bombs = [];
  var explosions = [];
  var round = 0;
  var lastChainCount = 0;

  var score = 0;
  var errors = 0;
  var MAX_ERR = 6;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;

  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var waitTimer = 0;
  var chainCount = 0;

  function placeBombs() {
    round++;
    var count = Math.min(28, BOMB_COUNT + Math.floor(round / 3));
    bombs = [];
    var placed = [];
    for (var i = 0; i < count; i++) {
      var ok = false, bx, by, tries = 0;
      while (!ok && tries < 200) {
        tries++;
        bx = BOMB_R + Math.random() * (W - BOMB_R * 2);
        by = 300 + Math.random() * (H * 0.65);
        ok = true;
        for (var j = 0; j < placed.length; j++) {
          var dx = bx - placed[j].x, dy = by - placed[j].y;
          if (dx * dx + dy * dy < (BOMB_R * 2 + 4) * (BOMB_R * 2 + 4)) { ok = false; break; }
        }
      }
      placed.push({ x: bx, y: by, exploded: false, phase: Math.random() * Math.PI * 2, delay: 0 });
    }
    bombs = placed;
    explosions = [];
    waitTimer = 0;
    chainCount = 0;
  }

  function triggerExplosion(idx, delay) {
    if (idx < 0 || idx >= bombs.length || bombs[idx].exploded) return;
    bombs[idx].exploded = true;
    bombs[idx].delay = delay;
    var b = bombs[idx];
    // Add explosion visual
    explosions.push({ x: b.x, y: b.y, r: 0, maxR: EXPLODE_R, life: 0.4 });
    chainCount++;
    // Check for chain
    for (var i = 0; i < bombs.length; i++) {
      if (!bombs[i].exploded) {
        var dx = bombs[i].x - b.x, dy = bombs[i].y - b.y;
        if (dx * dx + dy * dy < EXPLODE_R * EXPLODE_R) {
          triggerExplosion(i, delay + 0.06);
        }
      }
    }
  }

  game.onTap(function(tx, ty) {
    if (done || waitTimer > 0) return;
    // Find closest bomb
    var hit = -1, hitDist = 9999;
    for (var i = 0; i < bombs.length; i++) {
      if (bombs[i].exploded) continue;
      var dx = tx - bombs[i].x, dy = ty - bombs[i].y;
      var d = dx * dx + dy * dy;
      if (d < (BOMB_R + 30) * (BOMB_R + 30) && d < hitDist) {
        hit = i;
        hitDist = d;
      }
    }
    if (hit < 0) return;

    chainCount = 0;
    triggerExplosion(hit, 0);
    lastChainCount = chainCount;

    setTimeout(function() {
      // Evaluate chain
      if (lastChainCount >= NEEDED_CHAIN) {
        score++;
        flashCol = C.correct;
        flashAnim = 0.4;
        resultText = lastChainCount + '連鎖！';
        resultTimer = 0.8;
        game.audio.play('se_success', 0.65);
        if (score >= ROUNDS_NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(score * 600 + lastChainCount * 20 + Math.ceil(timeLeft) * 60); }, 700);
          return;
        }
      } else {
        errors++;
        flashCol = C.wrong;
        flashAnim = 0.35;
        resultText = lastChainCount + '連鎖（' + NEEDED_CHAIN + '必要）';
        resultTimer = 0.8;
        game.audio.play('se_failure', 0.35);
        if (errors >= MAX_ERR && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 700);
          return;
        }
      }
      waitTimer = 1.0;
    }, 500);
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
      if (waitTimer <= 0) placeBombs();
    }

    for (var bi = 0; bi < bombs.length; bi++) {
      if (!bombs[bi].exploded) bombs[bi].phase += dt * 1.5;
    }

    for (var ei = explosions.length - 1; ei >= 0; ei--) {
      explosions[ei].r += explosions[ei].maxR * dt * 4;
      explosions[ei].life -= dt * 2.5;
      if (explosions[ei].life <= 0) explosions.splice(ei, 1);
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Bomb density hint
    game.draw.text(NEEDED_CHAIN + '個以上を連鎖させろ！', W / 2, 195, { size: 36, color: '#ffffff55' });

    // Explosions
    for (var ei2 = 0; ei2 < explosions.length; ei2++) {
      var ex = explosions[ei2];
      game.draw.circle(ex.x, ex.y, ex.r, C.bombLit, ex.life * 0.6);
      game.draw.circle(ex.x, ex.y, ex.r * 0.5, '#fff', ex.life * 0.4);
    }

    // Bombs
    for (var bi2 = 0; bi2 < bombs.length; bi2++) {
      var b = bombs[bi2];
      if (b.exploded) continue;
      var pulse = 0.88 + 0.12 * Math.sin(b.phase * 3);
      game.draw.circle(b.x + 3, b.y + 3, BOMB_R, '#000', 0.25);
      game.draw.circle(b.x, b.y, BOMB_R * pulse, C.bomb, 0.9);
      game.draw.circle(b.x - BOMB_R * 0.28, b.y - BOMB_R * 0.3, BOMB_R * 0.2, '#fff', 0.3);
      // Fuse
      game.draw.line(b.x + BOMB_R * 0.5, b.y - BOMB_R * 0.6, b.x + BOMB_R * 0.8, b.y - BOMB_R * 1.1, C.bombHi, 3);
      game.draw.circle(b.x + BOMB_R * 0.8, b.y - BOMB_R * 1.1, 5, C.bombLit, 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.87, { size: 52, color: flashCol, bold: true });
    }

    for (var ei3 = 0; ei3 < MAX_ERR; ei3++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 56 + ei3 * 112, H * 0.955, 22, ei3 < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + ROUNDS_NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    placeBombs();
  });
})(game);

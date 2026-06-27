// 686-chain-bomb.js
// 連鎖爆発 — 起爆する爆弾を選び最大の連鎖を引き起こせ
// 操作: タップで最初の爆弾を起爆
// 成功: 10ラウンドで合計スコア8000点  失敗: 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0603',
    bomb:    '#1c1c1c',
    bombHi:  '#374151',
    fuse:    '#f97316',
    explode: '#ef4444',
    explodeHi:'#fde68a',
    blast:   '#f59e0b',
    correct: '#22c55e',
    text:    '#f1f5f9',
    ui:      '#100800'
  };

  var BOMB_ZONE_X0 = 80;
  var BOMB_ZONE_X1 = W - 80;
  var BOMB_ZONE_Y0 = H * 0.22;
  var BOMB_ZONE_Y1 = H * 0.75;
  var BOMB_R = 44;

  var bombs = [];
  var explosions = [];
  var chainActive = false;
  var chainTimer = 0;
  var chainQueue = [];
  var explodedIdx = [];
  var chainCount = 0;

  var totalScore = 0;
  var NEEDED_SCORE = 8000;
  var round = 0;
  var MAX_ROUNDS = 10;
  var roundDone = false;
  var waitTimer = 0;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var flashAnim = 0;
  var resultTimer = 0, resultText = '', resultCol = C.correct;

  function newRound() {
    round++;
    var count = 8 + Math.floor(Math.random() * 5);
    bombs = [];
    explodedIdx = [];
    chainActive = false;
    chainQueue = [];
    chainCount = 0;
    explosions = [];
    roundDone = false;

    for (var i = 0; i < count; i++) {
      var safe = false;
      var nx, ny, nr;
      var tries = 0;
      while (!safe && tries < 30) {
        nx = BOMB_ZONE_X0 + Math.random() * (BOMB_ZONE_X1 - BOMB_ZONE_X0);
        ny = BOMB_ZONE_Y0 + Math.random() * (BOMB_ZONE_Y1 - BOMB_ZONE_Y0);
        nr = 100 + Math.random() * 120;
        safe = true;
        for (var j = 0; j < bombs.length; j++) {
          var dx = bombs[j].x - nx, dy = bombs[j].y - ny;
          if (dx * dx + dy * dy < (BOMB_R * 2 + 30) * (BOMB_R * 2 + 30)) { safe = false; break; }
        }
        tries++;
      }
      bombs.push({ x: nx, y: ny, r: BOMB_R, blastR: nr, exploded: false });
    }
  }

  function triggerChain(idx) {
    if (bombs[idx].exploded) return;
    bombs[idx].exploded = true;
    explodedIdx.push(idx);
    explosions.push({ x: bombs[idx].x, y: bombs[idx].y, r: 0, maxR: bombs[idx].blastR, life: 0.6 });
    // Queue all bombs in blast range
    for (var j = 0; j < bombs.length; j++) {
      if (bombs[j].exploded) continue;
      var dx = bombs[j].x - bombs[idx].x, dy = bombs[j].y - bombs[idx].y;
      if (dx * dx + dy * dy < bombs[idx].blastR * bombs[idx].blastR) {
        chainQueue.push(j);
      }
    }
  }

  game.onTap(function(tx, ty) {
    if (done || chainActive || roundDone) return;
    // Find tapped bomb
    var hit = -1;
    for (var i = 0; i < bombs.length; i++) {
      var dx = tx - bombs[i].x, dy = ty - bombs[i].y;
      if (dx * dx + dy * dy < (BOMB_R + 20) * (BOMB_R + 20)) {
        hit = i;
        break;
      }
    }
    if (hit < 0) return;
    chainActive = true;
    chainTimer = 0;
    chainCount = 0;
    triggerChain(hit);
    game.audio.play('se_tap', 0.2);
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

    if (waitTimer > 0) {
      waitTimer -= dt;
      if (waitTimer <= 0) {
        if (round < MAX_ROUNDS) {
          newRound();
        } else {
          done = true;
          if (totalScore >= NEEDED_SCORE) {
            game.audio.play('se_success', 0.9);
            game.end.success(totalScore);
          } else {
            game.audio.play('se_failure', 0.6);
            game.end.failure();
          }
        }
      }
    }

    // Chain reaction propagation
    if (chainActive && chainQueue.length > 0) {
      chainTimer -= dt;
      if (chainTimer <= 0) {
        var nextIdx = chainQueue.shift();
        if (!bombs[nextIdx].exploded) {
          triggerChain(nextIdx);
          chainCount++;
          game.audio.play('se_failure', 0.18);
          chainTimer = 0.08;
        } else {
          chainTimer = 0;
        }
      }
    } else if (chainActive && chainQueue.length === 0 && !roundDone) {
      // Chain finished
      chainActive = false;
      roundDone = true;
      var count = explodedIdx.length;
      var roundScore = count * count * 20;
      totalScore += roundScore;
      resultText = count + '個連鎖！ +' + roundScore;
      resultCol = C.correct;
      resultTimer = 1.0;
      flashAnim = 0.4;
      game.audio.play('se_success', 0.65);
      waitTimer = 1.2;
    }

    // Update explosions
    for (var ei = explosions.length - 1; ei >= 0; ei--) {
      var exp = explosions[ei];
      exp.r += (exp.maxR - exp.r) * dt * 5;
      exp.life -= dt * 1.8;
      if (exp.life <= 0) explosions.splice(ei, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Blast radius previews (faint)
    if (!chainActive && !roundDone) {
      for (var bi = 0; bi < bombs.length; bi++) {
        var b = bombs[bi];
        if (!b.exploded) {
          game.draw.circle(b.x, b.y, b.blastR, C.fuse, 0.06);
        }
      }
    }

    // Explosions
    for (var ei2 = 0; ei2 < explosions.length; ei2++) {
      var ex = explosions[ei2];
      game.draw.circle(ex.x, ex.y, ex.r, C.blast, ex.life * 0.35);
      game.draw.circle(ex.x, ex.y, ex.r * 0.5, C.explodeHi, ex.life * 0.5);
    }

    // Bombs
    for (var bi2 = 0; bi2 < bombs.length; bi2++) {
      var bomb = bombs[bi2];
      if (bomb.exploded) continue;
      game.draw.circle(bomb.x + 4, bomb.y + 4, BOMB_R, '#000', 0.3);
      game.draw.circle(bomb.x, bomb.y, BOMB_R, C.bomb, 0.9);
      game.draw.circle(bomb.x, bomb.y, BOMB_R * 0.55, C.bombHi, 0.6);
      // Fuse
      game.draw.line(bomb.x + BOMB_R * 0.6, bomb.y - BOMB_R * 0.6, bomb.x + BOMB_R + 20, bomb.y - BOMB_R - 20, C.fuse, 5);
      game.draw.circle(bomb.x + BOMB_R + 20, bomb.y - BOMB_R - 20, 10, '#fde68a', 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.explode, flashAnim * 0.09);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.82, { size: 52, color: resultCol, bold: true });
    }

    // Score display
    var scoreRatio = Math.min(1, totalScore / NEEDED_SCORE);
    game.draw.rect(60, H * 0.87, W - 120, 28, C.ui, 0.8);
    game.draw.rect(60, H * 0.87, (W - 120) * scoreRatio, 28, C.blast, 0.85);
    game.draw.text(totalScore + ' / ' + NEEDED_SCORE, W / 2, H * 0.93, { size: 42, color: C.text });
    game.draw.text('ROUND ' + round + ' / ' + MAX_ROUNDS, W / 2, 148, { size: 44, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.explode);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    newRound();
  });
})(game);

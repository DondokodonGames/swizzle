// 686-chain-bomb.js
// チェインボム — 起爆する爆弾を選び、最大の連鎖爆発を引き起こす
// 操作: タップで最初の爆弾を起爆。爆風が届いた爆弾が次々と連鎖する
// 成功: 5ラウンドで合計2000点  失敗: 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、爆弾原） ──
  var C = { bg:'#0a0603', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CHAIN BOMB';
  var HOW_TO_PLAY = 'TAP A BOMB TO IGNITE · BLAST TRIGGERS NEARBY BOMBS IN A CHAIN';
  var MAX_TIME = 24;
  var NEEDED_SCORE = 2000;   // 修正2: 8000 → 2000
  var MAX_ROUNDS = 5;        // 修正2: 10 → 5
  var BOMB_ZONE_X0 = 96, BOMB_ZONE_X1 = W - 96, BOMB_ZONE_Y0 = snap(H * 0.24), BOMB_ZONE_Y1 = snap(H * 0.70), BOMB_R = 44;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bombs, explosions, chainActive, chainTimer, chainQueue, explodedIdx, chainCount, totalScore, round, roundDone, waitTimer, timeLeft, done, elapsed, flash, resultText, resultTimer, resultCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) { var d = qx * qx + qy * qy; if (d <= r * r && d >= (r - 14) * (r - 14)) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#100800');
  }

  function background() { game.draw.clear(C.bg); }

  function newRound() {
    round++;
    var count = 5 + Math.floor(Math.random() * 3);
    bombs = []; explodedIdx = []; chainActive = false; chainQueue = []; chainCount = 0; explosions = []; roundDone = false;
    for (var i = 0; i < count; i++) {
      var safe = false, nx, ny, nr, tries = 0;
      while (!safe && tries < 30) {
        nx = BOMB_ZONE_X0 + Math.random() * (BOMB_ZONE_X1 - BOMB_ZONE_X0);
        ny = BOMB_ZONE_Y0 + Math.random() * (BOMB_ZONE_Y1 - BOMB_ZONE_Y0);
        nr = 120 + Math.random() * 130; safe = true;
        for (var j = 0; j < bombs.length; j++) { var dx = bombs[j].x - nx, dy = bombs[j].y - ny; if (dx * dx + dy * dy < (BOMB_R * 2 + 30) * (BOMB_R * 2 + 30)) { safe = false; break; } }
        tries++;
      }
      bombs.push({ x: nx, y: ny, r: BOMB_R, blastR: nr, exploded: false });
    }
  }

  function initGame() { totalScore = 0; round = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; flash = 0; resultText = ''; resultTimer = 0; resultCol = C.b; waitTimer = 0; newRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? totalScore : totalScore;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function triggerChain(idx) {
    if (bombs[idx].exploded) return;
    bombs[idx].exploded = true; explodedIdx.push(idx);
    explosions.push({ x: bombs[idx].x, y: bombs[idx].y, r: 0, maxR: bombs[idx].blastR, life: 0.6 });
    for (var j = 0; j < bombs.length; j++) { if (bombs[j].exploded) continue; var dx = bombs[j].x - bombs[idx].x, dy = bombs[j].y - bombs[idx].y; if (dx * dx + dy * dy < bombs[idx].blastR * bombs[idx].blastR) chainQueue.push(j); }
  }

  function drawScene() {
    if (!chainActive && !roundDone) { for (var bi = 0; bi < bombs.length; bi++) { var b = bombs[bi]; if (!b.exploded) ring(b.x, b.y, b.blastR, C.f, 0.08); } }
    for (var ei2 = 0; ei2 < explosions.length; ei2++) { var ex = explosions[ei2]; pc(ex.x, ex.y, ex.r, C.f, ex.life * 0.4); pc(ex.x, ex.y, ex.r * 0.5, C.c, ex.life * 0.55); }
    for (var bi2 = 0; bi2 < bombs.length; bi2++) {
      var bomb = bombs[bi2]; if (bomb.exploded) continue;
      pc(bomb.x, bomb.y, BOMB_R, '#1c1c24', 0.95); pc(bomb.x - BOMB_R * 0.25, bomb.y - BOMB_R * 0.25, BOMB_R * 0.5, '#374151', 0.6);
      game.draw.line(bomb.x + BOMB_R * 0.6, bomb.y - BOMB_R * 0.6, bomb.x + BOMB_R + 18, bomb.y - BOMB_R - 18, C.f, 5);
      pc(bomb.x + BOMB_R + 18, bomb.y - BOMB_R - 18, 9, C.c, 0.9);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || chainActive || roundDone) return;
    var hit = -1;
    for (var i = 0; i < bombs.length; i++) { var dx = tx - bombs[i].x, dy = ty - bombs[i].y; if (dx * dx + dy * dy < (BOMB_R + 20) * (BOMB_R + 20)) { hit = i; break; } }
    if (hit < 0) return;
    chainActive = true; chainTimer = 0; chainCount = 0; triggerChain(hit); game.audio.play('se_tap', 0.2);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!bombs) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'BOOM MASTER!' : 'FIZZLED OUT', W / 2, H * 0.35, 60, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(totalScore >= NEEDED_SCORE); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) { if (round < MAX_ROUNDS) newRound(); else finish(totalScore >= NEEDED_SCORE); } }
      if (chainActive && chainQueue.length > 0) {
        chainTimer -= dt;
        if (chainTimer <= 0) { var nextIdx = chainQueue.shift(); if (!bombs[nextIdx].exploded) { triggerChain(nextIdx); chainCount++; game.audio.play('se_failure', 0.18); chainTimer = 0.08; } else chainTimer = 0; }
      } else if (chainActive && chainQueue.length === 0 && !roundDone) {
        chainActive = false; roundDone = true;
        var cnt = explodedIdx.length, roundScore = cnt * cnt * 20; totalScore += roundScore;
        resultText = cnt + ' CHAIN!  +' + roundScore; resultCol = C.b; resultTimer = 1.0; flash = 0.4; game.audio.play('se_success', 0.65); waitTimer = 1.2;
      }
      for (var ei = explosions.length - 1; ei >= 0; ei--) { var exp = explosions[ei]; exp.r += (exp.maxR - exp.r) * dt * 5; exp.life -= dt * 1.8; if (exp.life <= 0) explosions.splice(ei, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    if (flash > 0) game.draw.rect(0, 0, W, H, C.f, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.80), 52, resultCol);

    var scoreRatio = Math.min(1, totalScore / NEEDED_SCORE);
    game.draw.rect(60, snap(H * 0.86), W - 120, 28, '#100800', 0.8);
    game.draw.rect(60, snap(H * 0.86), (W - 120) * scoreRatio, 28, C.f, 0.85);
    txt(totalScore + ' / ' + NEEDED_SCORE, W / 2, snap(H * 0.92), 42, C.g);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('ROUND ' + round + ' / ' + MAX_ROUNDS, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);

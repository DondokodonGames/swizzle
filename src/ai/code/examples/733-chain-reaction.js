// 733-chain-reaction.js
// チェーンリアクション — 起爆点を選び、爆風で次々と爆弾を連鎖させる
// 操作: 爆弾をタップして起爆。爆風範囲内の爆弾が連鎖する。規定数以上の連鎖で成功
// 成功: 5ラウンドで8連鎖以上  失敗: 3回 不足 or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、爆弾原） ──
  var C = { bg:'#040208', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CHAIN REACTION';
  var HOW_TO_PLAY = 'TAP A BOMB TO IGNITE · BLAST TRIGGERS NEARBY BOMBS · CHAIN 8 OR MORE';
  var MAX_TIME = 24;
  var NEEDED_CHAIN = 8;      // 修正2: 10 → 8
  var ROUNDS_NEEDED = 5;     // 修正2: 15 → 5
  var MAX_ERR = 3;           // 修正2: 6 → 3
  var BOMB_COUNT = 18, BOMB_R = 28, EXPLODE_R = 100;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bombs, explosions, round, lastChainCount, score, errors, timeLeft, done, elapsed, flash, flashCol, resultText, resultTimer, waitTimer, chainCount;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#080312');
  }

  function background() { game.draw.clear(C.bg); }

  function placeBombs() {
    round++; var count = Math.min(24, BOMB_COUNT + Math.floor(round / 2)); var placed = [];
    for (var i = 0; i < count; i++) {
      var ok = false, bx, by, tries = 0;
      while (!ok && tries < 200) { tries++; bx = BOMB_R + Math.random() * (W - BOMB_R * 2); by = 320 + Math.random() * (H * 0.62); ok = true; for (var j = 0; j < placed.length; j++) { var dx = bx - placed[j].x, dy = by - placed[j].y; if (dx * dx + dy * dy < (BOMB_R * 2 + 4) * (BOMB_R * 2 + 4)) { ok = false; break; } } }
      placed.push({ x: bx, y: by, exploded: false, phase: Math.random() * Math.PI * 2 });
    }
    bombs = placed; explosions = []; waitTimer = 0; chainCount = 0;
  }

  function initGame() { round = 0; lastChainCount = 0; score = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; waitTimer = 0; chainCount = 0; placeBombs(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 800 + Math.ceil(timeLeft) * 100) : score * 250;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function triggerExplosion(idx) {
    if (idx < 0 || idx >= bombs.length || bombs[idx].exploded) return;
    bombs[idx].exploded = true; var b = bombs[idx]; explosions.push({ x: b.x, y: b.y, r: 0, maxR: EXPLODE_R, life: 0.4 }); chainCount++;
    for (var i = 0; i < bombs.length; i++) { if (!bombs[i].exploded) { var dx = bombs[i].x - b.x, dy = bombs[i].y - b.y; if (dx * dx + dy * dy < EXPLODE_R * EXPLODE_R) triggerExplosion(i); } }
  }

  function drawScene() {
    txt('CHAIN ' + NEEDED_CHAIN + '+ BOMBS!', W / 2, 280, 36, '#ffffff55');
    for (var ei2 = 0; ei2 < explosions.length; ei2++) { var ex = explosions[ei2]; pc(ex.x, ex.y, ex.r, C.c, ex.life * 0.6); pc(ex.x, ex.y, ex.r * 0.5, C.g, ex.life * 0.4); }
    for (var bi2 = 0; bi2 < bombs.length; bi2++) {
      var b = bombs[bi2]; if (b.exploded) continue;
      var pulse = 0.88 + 0.12 * Math.sin(b.phase * 3);
      pc(b.x, b.y, BOMB_R * pulse, C.a, 0.9); pc(b.x - BOMB_R * 0.28, b.y - BOMB_R * 0.3, BOMB_R * 0.2, C.g, 0.3);
      game.draw.line(b.x + BOMB_R * 0.5, b.y - BOMB_R * 0.6, b.x + BOMB_R * 0.8, b.y - BOMB_R * 1.1, C.c, 3); pc(b.x + BOMB_R * 0.8, b.y - BOMB_R * 1.1, 5, C.c, 0.8);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || waitTimer > 0) return;
    var hit = -1, hitDist = 9999;
    for (var i = 0; i < bombs.length; i++) { if (bombs[i].exploded) continue; var dx = tx - bombs[i].x, dy = ty - bombs[i].y, d = dx * dx + dy * dy; if (d < (BOMB_R + 30) * (BOMB_R + 30) && d < hitDist) { hit = i; hitDist = d; } }
    if (hit < 0) return;
    chainCount = 0; triggerExplosion(hit); lastChainCount = chainCount; game.audio.play('se_failure', 0.2);
    setTimeout(function() {
      if (done) return;
      if (lastChainCount >= NEEDED_CHAIN) {
        score++; flash = 0.4; flashCol = C.b; resultText = lastChainCount + ' CHAIN!'; resultTimer = 0.8; game.audio.play('se_success', 0.65);
        if (score >= ROUNDS_NEEDED) { finish(true); return; }
      } else {
        errors++; flash = 0.35; flashCol = C.a; resultText = lastChainCount + ' CHAIN  (NEED ' + NEEDED_CHAIN + ')'; resultTimer = 0.8; game.audio.play('se_failure', 0.35);
        if (errors >= MAX_ERR) { finish(false); return; }
      }
      waitTimer = 1.0;
    }, 500);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!bombs) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.92, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CHAIN MASTER!' : 'FIZZLED', W / 2, H * 0.35, 60, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) placeBombs(); }
      for (var bi = 0; bi < bombs.length; bi++) if (!bombs[bi].exploded) bombs[bi].phase += dt * 1.5;
      for (var ei = explosions.length - 1; ei >= 0; ei--) { explosions[ei].r += explosions[ei].maxR * dt * 4; explosions[ei].life -= dt * 2.5; if (explosions[ei].life <= 0) explosions.splice(ei, 1); }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
    }

    // ---- 描画 ----
    background(); drawScene();
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.87), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + ROUNDS_NEEDED, W / 2, 168, 48, C.b);
    for (var ei3 = 0; ei3 < MAX_ERR; ei3++) game.draw.rect(snap(W / 2 + (ei3 - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei3 < errors ? C.a : '#080312');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);

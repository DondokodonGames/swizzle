// 771-rope-cut.js
// ロープカット — OKマークのアイテムのロープだけを切れ。NGを切るとミス
// 操作: タップでロープを切る（アイテムの上部を狙え）
// 成功: 8セット 全正解  失敗: 3回 ミスカット or 26秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#030a0a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var ROPE = '#a1560e', ROPE_HI = '#ff8800', ITEM_GOOD = '#00ff41', ITEM_BAD = '#ff3355';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ROPE CUT';
  var HOW_TO_PLAY = 'CUT ONLY THE ROPES HOLDING OK ITEMS · CUTTING AN NG ITEM IS A MISS';
  var MAX_TIME = 26;
  var NEEDED   = 8;          // 修正2: 25 → 8
  var MAX_ERR  = 3;          // 修正2: 8 → 3
  var ITEM_COUNT = 5;
  var ITEM_W = 128, ITEM_H = 108, TOP_Y = snap(H * 0.14), ITEM_Y = snap(H * 0.34), WAIT_DUR = 0.5;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var items, cutPhase, waitTimer, wrongCut, score, errors, done, timeLeft, elapsed, fallingItems, flash, flashCol, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#060e0e');
  }

  function background() { game.draw.clear(C.bg); }

  function getItemX(i) { return snap(W * 0.1 + i * ((W * 0.8) / (ITEM_COUNT - 1))); }

  function newRound() {
    items = []; wrongCut = false;
    var goodCount = 1 + Math.floor(Math.random() * 3), goodSet = [];
    while (goodSet.length < goodCount) { var gi = Math.floor(Math.random() * ITEM_COUNT); if (goodSet.indexOf(gi) < 0) goodSet.push(gi); }
    for (var i = 0; i < ITEM_COUNT; i++) items.push({ x: getItemX(i), y: ITEM_Y, isGood: goodSet.indexOf(i) >= 0, cut: false, wiggle: Math.random() * Math.PI * 2, wiggleSpd: 0.8 + Math.random() * 0.5 });
    cutPhase = 'play';
  }

  function initGame() { score = 0; errors = 0; done = false; timeLeft = MAX_TIME; elapsed = 0; fallingItems = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; waitTimer = 0; newRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 550 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function checkRoundComplete() {
    if (wrongCut) return;
    var allGoodCut = true;
    for (var i = 0; i < items.length; i++) if (items[i].isGood && !items[i].cut) { allGoodCut = false; break; }
    if (allGoodCut) {
      score++; flash = 0.2; flashCol = C.b; resultText = 'CLEAR!'; resultTimer = 0.35; game.audio.play('se_success', 0.6); cutPhase = 'wait'; waitTimer = WAIT_DUR;
      if (score >= NEEDED) { finish(true); return; }
    }
  }

  function drawScene() {
    game.draw.rect(snap(W * 0.06), TOP_Y - 20, snap(W * 0.88), 20, ROPE, 0.8); game.draw.rect(snap(W * 0.06), TOP_Y - 20, snap(W * 0.88), 6, ROPE_HI, 0.4);
    for (var i = 0; i < items.length; i++) {
      var it = items[i]; if (it.cut) continue;
      var sway = Math.sin(it.wiggle) * 8, ix = it.x + sway, iy = it.y;
      game.draw.line(it.x, TOP_Y, ix, iy - ITEM_H / 2, ROPE, 6);
      game.draw.rect(snap(ix - ITEM_W / 2), snap(iy - ITEM_H / 2), ITEM_W, ITEM_H, it.isGood ? ITEM_GOOD : ITEM_BAD, 0.85);
      game.draw.rect(snap(ix - ITEM_W / 2), snap(iy - ITEM_H / 2), ITEM_W, 12, C.g, 0.18);
      txt(it.isGood ? 'OK' : 'NG', ix, iy + 14, 48, C.g);
    }
    for (var fi2 = 0; fi2 < fallingItems.length; fi2++) { var fi3 = fallingItems[fi2]; game.draw.rect(snap(fi3.x - ITEM_W / 2), snap(fi3.y - ITEM_H / 2), ITEM_W, ITEM_H, fi3.isGood ? ITEM_GOOD : ITEM_BAD, fi3.life * 0.7); }
    if (cutPhase === 'play' && state === S.PLAYING) txt('CUT THE OK ROPES', W / 2, snap(H * 0.55), 38, C.c);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || cutPhase !== 'play') return;
    var hitIdx = -1;
    for (var i = 0; i < items.length; i++) { if (items[i].cut) continue; if (Math.abs(tx - items[i].x) < 60 && ty > TOP_Y - 20 && ty < items[i].y + ITEM_H / 2) { hitIdx = i; break; } }
    if (hitIdx < 0) return;
    var item = items[hitIdx]; item.cut = true; fallingItems.push({ x: item.x, y: item.y, vy: 80, isGood: item.isGood, life: 0.8 });
    if (!item.isGood) {
      wrongCut = true; errors++; flash = 0.35; flashCol = C.a; resultText = 'NG CUT!'; resultTimer = 0.45; game.audio.play('se_failure', 0.35);
      if (errors >= MAX_ERR) { finish(false); return; }
      cutPhase = 'wait'; waitTimer = WAIT_DUR;
    } else { game.audio.play('se_tap', 0.09); checkRoundComplete(); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!items) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.68, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.725, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.82, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SHARP CUTTER!' : 'SNIPPED WRONG', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (cutPhase === 'wait') { waitTimer -= dt; if (waitTimer <= 0) newRound(); }
      for (var i = 0; i < items.length; i++) items[i].wiggle += items[i].wiggleSpd * dt;
      for (var fi = fallingItems.length - 1; fi >= 0; fi--) { fallingItems[fi].vy += 800 * dt; fallingItems[fi].y += fallingItems[fi].vy * dt; fallingItems[fi].life -= dt * 1.5; if (fallingItems[fi].y > H + 100 || fallingItems[fi].life <= 0) fallingItems.splice(fi, 1); }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
    }

    // ---- 描画 ----
    background(); drawScene();
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.63), 56, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#060e0e');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);

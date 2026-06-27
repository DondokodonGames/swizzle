// 771-rope-cut.js
// ロープカット — ✓マークのついたアイテムのロープだけを切れ。間違えるな
// 操作: タップでロープを切る（アイテムの上部を狙え）
// 成功: 25セット全正解  失敗: 8回ミスカット or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030a0a',
    rope:    '#92400e',
    ropeHi:  '#d97706',
    itemGood:'#22c55e',
    itemBad: '#ef4444',
    checkMk: '#f0fdf4',
    xMark:   '#fff1f2',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#060e0e'
  };

  var ITEM_COUNT = 5;
  var ITEM_W = 120;
  var ITEM_H = 100;
  var TOP_Y = H * 0.08;
  var ITEM_Y = H * 0.3;
  var ROPE_LEN = ITEM_Y - TOP_Y;

  var items = [];
  var phase = 'play'; // 'play' | 'wait'
  var waitTimer = 0;
  var WAIT_DUR = 0.5;
  var roundTargets = 0; // how many good items in this round
  var cutCount = 0; // correct cuts this round
  var wrongCut = false;

  var score = 0;
  var NEEDED = 25;
  var errors = 0;
  var MAX_ERR = 8;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;

  var fallingItems = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function getItemX(i) {
    return W * 0.1 + i * ((W * 0.8) / (ITEM_COUNT - 1));
  }

  function newRound() {
    items = [];
    roundTargets = 0;
    cutCount = 0;
    wrongCut = false;
    var goodCount = 1 + Math.floor(Math.random() * 3); // 1-3 good items
    var goodSet = [];
    while (goodSet.length < goodCount) {
      var gi = Math.floor(Math.random() * ITEM_COUNT);
      if (goodSet.indexOf(gi) < 0) goodSet.push(gi);
    }
    roundTargets = goodCount;
    for (var i = 0; i < ITEM_COUNT; i++) {
      var isGood = goodSet.indexOf(i) >= 0;
      items.push({ x: getItemX(i), y: ITEM_Y, isGood: isGood, cut: false, wiggle: Math.random() * Math.PI * 2, wiggleSpd: 0.8 + Math.random() * 0.5 });
    }
    phase = 'play';
  }

  function checkRoundComplete() {
    if (wrongCut) return;
    var allGoodCut = true;
    for (var i = 0; i < items.length; i++) {
      if (items[i].isGood && !items[i].cut) { allGoodCut = false; break; }
    }
    if (allGoodCut) {
      score++;
      flashCol = C.correct;
      flashAnim = 0.2;
      resultText = '正解！';
      resultTimer = 0.35;
      game.audio.play('se_success', 0.6);
      phase = 'wait';
      waitTimer = WAIT_DUR;
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 450 + Math.ceil(timeLeft) * 100); }, 700);
      }
    }
  }

  game.onTap(function(tx, ty) {
    if (done || phase !== 'play') return;
    // Find which rope was tapped (rope area: item x ± 30, top region)
    var hitIdx = -1;
    for (var i = 0; i < items.length; i++) {
      if (items[i].cut) continue;
      var ix = items[i].x;
      var iy = items[i].y;
      // Hit zone: rope area (above item or on item top)
      if (Math.abs(tx - ix) < 50 && ty > TOP_Y - 20 && ty < iy + ITEM_H / 2) {
        hitIdx = i;
        break;
      }
    }
    if (hitIdx < 0) return;

    var item = items[hitIdx];
    item.cut = true;
    // Drop animation
    fallingItems.push({ x: item.x, y: item.y, vy: 80, isGood: item.isGood, life: 0.8 });

    if (!item.isGood) {
      // Wrong cut!
      wrongCut = true;
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.35;
      resultText = '×マークだ！';
      resultTimer = 0.45;
      game.audio.play('se_failure', 0.35);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
        return;
      }
      phase = 'wait';
      waitTimer = WAIT_DUR;
    } else {
      game.audio.play('se_tap', 0.09);
      checkRoundComplete();
    }
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

    if (phase === 'wait') {
      waitTimer -= dt;
      if (waitTimer <= 0 && !done) newRound();
    }

    for (var i = 0; i < items.length; i++) {
      items[i].wiggle += items[i].wiggleSpd * dt;
    }

    for (var fi = fallingItems.length - 1; fi >= 0; fi--) {
      fallingItems[fi].vy += 800 * dt;
      fallingItems[fi].y += fallingItems[fi].vy * dt;
      fallingItems[fi].life -= dt * 1.5;
      if (fallingItems[fi].y > H + 100 || fallingItems[fi].life <= 0) fallingItems.splice(fi, 1);
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Ceiling bar
    game.draw.rect(W * 0.06, TOP_Y - 20, W * 0.88, 20, C.rope, 0.8);
    game.draw.rect(W * 0.06, TOP_Y - 20, W * 0.88, 6, C.ropeHi, 0.4);

    // Items with ropes
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.cut) continue;
      var sway = Math.sin(it.wiggle) * 8;
      var ix = it.x + sway;
      var iy = it.y;

      // Rope
      game.draw.line(it.x, TOP_Y, ix, iy - ITEM_H / 2, C.rope, 6);

      // Item box
      game.draw.rect(ix - ITEM_W / 2 + 4, iy - ITEM_H / 2 + 4, ITEM_W, ITEM_H, '#000', 0.25);
      game.draw.rect(ix - ITEM_W / 2, iy - ITEM_H / 2, ITEM_W, ITEM_H, it.isGood ? C.itemGood : C.itemBad, 0.85);
      game.draw.rect(ix - ITEM_W / 2, iy - ITEM_H / 2, ITEM_W, 12, '#fff', 0.18);
      // Mark
      var mark = it.isGood ? '✓' : '✗';
      var markCol = it.isGood ? C.checkMk : C.xMark;
      game.draw.text(mark, ix, iy + 10, { size: 64, color: markCol, bold: true });
    }

    // Falling items
    for (var fi2 = 0; fi2 < fallingItems.length; fi2++) {
      var fi3 = fallingItems[fi2];
      game.draw.rect(fi3.x - ITEM_W / 2, fi3.y - ITEM_H / 2, ITEM_W, ITEM_H, fi3.isGood ? C.itemGood : C.itemBad, fi3.life * 0.7);
    }

    // Guide text
    if (phase === 'play' && !done) {
      game.draw.text('✓のロープだけ切れ！', W / 2, H * 0.55, { size: 38, color: C.text + '55' });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.63, { size: 56, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 56 + ei * 112, H * 0.955, 22, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    newRound();
  });
})(game);

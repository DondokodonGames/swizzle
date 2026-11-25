// D-20092012-0040-archive-card-sorter.js
// アーカイブカード整理 — バラバラな順のカードをドラッグで正しい順に並べ替える
// 操作: カードを指でつかんで左右のスロットへドラッグし、番号の小さい順に並べる
// 終わり: 全カードを正しい順に並べ切れば成功。制限時間切れなら失敗
// @mechanic: drag_sort
// @theme: archive_card_sorter
// 世界観: 地下書庫の整理係が、崩れて順番の狂った記録カードの束を指で引き抜き、正しい番号順のスロットへ並べ直す
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく並べたカード数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目・革のテクスチャ、gradientで厚みを出す
  var C = {
    desk: '#4a3320', deskLit: '#6b4a2c', card: '#f5ead0', cardEdge: '#c9b088',
    ink: '#3a2818', white: '#fff8ec', gold: '#e0a336',
    good: '#4fae6a', bad: '#c1453f',
  };
  var N = 5;

  var GAME_TITLE = 'CARD SORTER';
  var SLOT_Y = H * 0.62, SLOT_DX = (W * 0.8) / N, SLOT_X0 = W * 0.1 + SLOT_DX / 2;
  var CARD_W = SLOT_DX * 0.8, CARD_H = CARD_W * 1.35;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var order, correctCount, timeLeft, halfShown, dragIdx, dragX, dragY;
  var done, endWait, finished, ready, hitStop, shake;
  var TIME_LIMIT = 16;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000040', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CLERK = ['.####.', '#.##.#', '######', '.#..#.', '.#..#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.deskLit], [1, C.desk]]);
    for (var i = 0; i < 10; i++) game.draw.rect(0, i * (H / 10), W, 2, '#00000010');
  }

  function slotX(i) { return SLOT_X0 + i * SLOT_DX; }

  function isSorted() {
    for (var i = 0; i < N - 1; i++) if (order[i] > order[i + 1]) return false;
    return true;
  }

  function countCorrect() {
    var c = 0;
    for (var i = 0; i < N; i++) if (order[i] === i + 1) c++;
    return c;
  }

  function drawCard(x, y, num, lift) {
    var w = CARD_W, h = CARD_H;
    game.draw.rect(x - w / 2 + 4, y - h / 2 + 6, w, h, '#00000030');
    game.draw.rect(x - w / 2, y - h / 2 - lift, w, h, C.cardEdge);
    game.draw.rect(x - w / 2 + 6, y - h / 2 - lift + 6, w - 12, h - 12, C.card);
    txt(String(num), x, y - lift + 14, 40, C.ink);
  }

  function drawSlots() {
    for (var i = 0; i < N; i++) {
      game.draw.rect(slotX(i) - CARD_W / 2 - 6, SLOT_Y - CARD_H / 2 - 6, CARD_W + 12, CARD_H + 12, '#00000020');
    }
    for (var i2 = 0; i2 < N; i2++) {
      if (dragIdx === i2) continue;
      drawCard(slotX(i2), SLOT_Y, order[i2], 0);
    }
    if (dragIdx >= 0) drawCard(dragX, dragY, order[dragIdx], 40);
  }

  function shuffledOrder() {
    var arr = [];
    for (var i = 1; i <= N; i++) arr.push(i);
    for (var i2 = arr.length - 1; i2 > 0; i2--) {
      var j = Math.floor(game.random(0, i2 + 1));
      var t = arr[i2]; arr[i2] = arr[j]; arr[j] = t;
    }
    // 最初から揃っていたら1組だけ入れ替える
    var sorted = true;
    for (var k = 0; k < N - 1; k++) if (arr[k] > arr[k + 1]) sorted = false;
    if (sorted) { var tmp = arr[0]; arr[0] = arr[1]; arr[1] = tmp; }
    return arr;
  }

  function initGame() {
    order = shuffledOrder();
    correctCount = countCorrect(); halfShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    dragIdx = -1; dragX = 0; dragY = 0;
    timeLeft = TIME_LIMIT;
  }

  function slotAt(x, y) {
    for (var i = 0; i < N; i++) {
      if (Math.abs(x - slotX(i)) < SLOT_DX * 0.5 && Math.abs(y - SLOT_Y) < CARD_H * 0.8) return i;
    }
    return -1;
  }

  function evaluateSwap(targetIdx) {
    if (dragIdx < 0 || targetIdx < 0 || targetIdx === dragIdx) return;
    var t = order[dragIdx]; order[dragIdx] = order[targetIdx]; order[targetIdx] = t;
    var newCorrect = countCorrect();
    if (newCorrect > correctCount) {
      game.feedback.good(slotX(targetIdx), SLOT_Y, { text: 'NICE', color: C.good, sound: 'se_coin' });
      game.fx.burst(slotX(targetIdx), SLOT_Y, { color: C.gold, count: 14, speed: 280 });
    } else {
      game.audio.play('se_tap', 0.3);
    }
    correctCount = newCorrect;
    if (!halfShown && correctCount >= Math.ceil(N / 2)) {
      halfShown = true;
      game.fx.popup('HALFWAY!', W * 0.5, H * 0.42, { color: C.gold, size: 38 });
      game.audio.play('se_milestone', 0.5);
    }
    if (isSorted()) { ok = true; finished = true; hitStop = 0.1; finish(); }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    var i = slotAt(x, y);
    if (i >= 0) { dragIdx = i; dragX = x; dragY = y; game.audio.play('se_tap', 0.2); }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || dragIdx < 0) return;
    dragX = x; dragY = y;
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || dragIdx < 0) return;
    var target = slotAt(x, y);
    evaluateSwap(target);
    dragIdx = -1;
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: slotX(0), gy: SLOT_Y, press: false };
  function stepDemo(dt) {
    if (order === undefined) initGame();
    demo.t += dt;
    var cyc = demo.t % 1.4;
    if (cyc < dt || demo.t <= dt) {
      order = [1, 3, 2, 4, 5]; correctCount = countCorrect(); halfShown = false; dragIdx = -1;
      demo.phase = 0;
    }
    if (cyc > 0.25 && cyc < 0.5) {
      demo.gx = slotX(1); demo.gy = SLOT_Y; demo.press = true; dragIdx = -1;
    } else if (cyc >= 0.5 && cyc < 0.85) {
      var p = (cyc - 0.5) / 0.35;
      demo.gx = slotX(1) + (slotX(2) - slotX(1)) * p;
      demo.gy = SLOT_Y;
      demo.press = true;
      dragIdx = 1; dragX = demo.gx; dragY = demo.gy;
    } else if (cyc >= 0.85 && cyc < 0.95) {
      if (demo.phase === 0) { demo.phase = 1; dragIdx = 1; evaluateSwap(2); }
      demo.press = false; dragIdx = -1;
    } else {
      demo.press = false; dragIdx = -1;
      if (cyc < 0.25) demo.phase = 0;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawSlots();
      game.draw.sprite(CLERK, { '#': C.white, '.': null }, W * 0.5, H * 0.86, 18, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawSlots();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(correctCount + ' / ' + N, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + Math.max(1, N - correctCount) + '枚!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { correct: correctCount, total: N };
        if (ok) game.end.success(correctCount, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        ok = false; finished = true; hitStop = 0.3;
        game.feedback.bad(W * 0.5, SLOT_Y, { text: 'TIME UP' });
        shake = 0.25;
        game.audio.play('se_failure', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawSlots();
    game.draw.sprite(CLERK, { '#': C.white, '.': null }, W * 0.5, H * 0.86, 18, { anchor: 'center' });

    txt(correctCount + ' / ' + N, W / 2, H * 0.06, 30, C.white);
    var warn = timeLeft < 3;
    game.draw.rect(60, 150, W - 120, 16, '#00000040');
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 16, warn ? C.bad : C.good);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.35], ['F4', 0.35], ['A4', 0.35], ['D5', 0.7]], { tempo: 112, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

// D-20132016-0084-market-blade-budget.js
// マーケットブレード・バジェット — 限られた懐具合(資金の枠)にぴったり収まる札を選んで斬り結ぶ
// 操作: 台に空いた資金の枠の幅を見て、同じ幅の札を3枚の中からタップして切る
// 終わり: 先に相手の体力を0にすれば勝利。自分の体力が0になれば敗北
// @mechanic: gap_fit
// @theme: market_blade_budget
// 世界観: 市場の路地で鍔迫り合う商人剣士の一度きりの果たし合い。手持ちの資金の枠にぴったり収まる札だけが斬れる
// 残るもの: 正誤(CLEAR/GAME OVER) + 残った自分の体力
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目・フェルト・光沢ボタン、gradientで厚みを作る
  var C = {
    bg: '#3a2414', bg2: '#5a3a1e', felt: '#1e4028', wood: '#6a4222', woodDark: '#40260e',
    card: '#e8d8b0', cardEdge: '#a88450', slot: '#20140a',
    ally: '#d8b060', enemy: '#7a3a4a', good: '#4dff8a', bad: '#ff4d5e',
    gold: '#ffd400', white: '#fff2d8', ink: '#140a04',
  };

  var GAME_TITLE = 'BLADE BUDGET';
  var CX = W * 0.5, CY = H * 0.4;
  var HP_MAX = 3;
  var WIDTHS = [120, 190, 260];
  var ROUND_TIME = 2.8;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ALLY_FRAMES = [
    ['..##..', '.####.', '#.##.#', '.####.', '##..##'],
    ['..##..', '.####.', '#.##.#', '.####.', '.#..#.'],
  ];
  var ENEMY_FRAMES = [
    ['.####.', '##..##', '.####.', '#.##.#', '##..##'],
    ['.####.', '##..##', '.####.', '#.##.#', '.#..#.'],
  ];

  var pHp, eHp, slotW, cards, roundT, resolved, finished, done, endWait, hitStop, shake, ready;

  function shuffled(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(game.random(0, i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function newRound() {
    slotW = WIDTHS[Math.floor(game.random(0, WIDTHS.length))];
    cards = shuffled(WIDTHS);
    roundT = 0; resolved = false;
  }

  function initGame() {
    pHp = HP_MAX; eHp = HP_MAX; finished = false; done = false;
    endWait = 0; hitStop = 0; shake = 0; ready = 0.8;
    newRound();
  }

  function bg() {
    var elapsed = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, H * 0.58, W, H * 0.42, C.felt, 0.5);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(elapsed * 1.3));
  }

  function drawFighters() {
    var bobY = Math.sin(game.time.elapsed * 2.2) * 5;
    var swayX = Math.cos(game.time.elapsed * 1.6) * 3;
    game.draw.sprite(ALLY_FRAMES[Math.floor(game.time.elapsed * 3) % 2], { '#': C.ally }, W * 0.28 + swayX, CY + bobY, 15, { anchor: 'center' });
    var flash = roundT > (ROUND_TIME - 0.7) && Math.floor(game.time.elapsed * 12) % 2 === 0;
    game.draw.sprite(ENEMY_FRAMES[Math.floor(game.time.elapsed * 3) % 2], { '#': flash ? C.gold : C.enemy }, W * 0.72 - swayX, CY + bobY, 15, { anchor: 'center' });
  }

  function drawHp() {
    var bw = W * 0.36, bh = 24;
    game.draw.rect(W * 0.06, H * 0.1, bw, bh, C.ink, 0.6);
    game.draw.rect(W * 0.06, H * 0.1, bw * (pHp / HP_MAX), bh, C.ally);
    game.draw.rect(W * 0.58, H * 0.1, bw, bh, C.ink, 0.6);
    game.draw.rect(W * 0.58 + bw * (1 - eHp / HP_MAX), H * 0.1, bw * (eHp / HP_MAX), bh, C.enemy);
  }

  function drawSlot() {
    var sy = H * 0.6, sh = 40;
    game.draw.rect(CX - 150, sy - sh / 2, 300, sh, C.wood);
    game.draw.rect(CX - slotW / 2, sy - sh / 2 - 4, slotW, sh + 8, C.slot);
    game.draw.rect(CX - slotW / 2, sy - sh / 2 - 4, slotW, 6, C.gold, 0.5);
  }

  function cardX(i) { return W * (0.2 + i * 0.3); }

  function drawCards(interactive) {
    var cy = H * 0.82, ch = 130;
    for (var i = 0; i < cards.length; i++) {
      var w = cards[i], x = cardX(i);
      game.draw.rect(x - w / 2, cy - ch / 2, w, ch, C.cardEdge);
      game.draw.rect(x - w / 2 + 6, cy - ch / 2 + 6, w - 12, ch - 12, C.card);
      game.draw.rect(x - w / 2 + 6, cy - ch / 2 + 6, w - 12, 10, '#ffffff', 0.35);
    }
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function resolvePick(i) {
    if (resolved || finished || ready > 0) return;
    resolved = true;
    var correct = cards[i] === slotW;
    hitStop = correct ? 0.14 : 0.3;
    if (correct) {
      eHp--;
      game.feedback.good(cardX(i), H * 0.82, { text: 'GOOD', color: C.good });
      game.fx.burst(W * 0.72, CY, { color: C.gold, count: 16, speed: 360 });
      game.audio.play('se_good', 0.4);
      if (eHp === 1) { game.fx.popup('あと1!', CX, H * 0.24, { color: C.gold, size: 32 }); game.audio.play('se_milestone', 0.3); }
    } else {
      pHp--;
      game.feedback.bad(cardX(i), H * 0.82, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
    }
    if (eHp <= 0) { ok = true; finished = true; finish(); return; }
    if (pHp <= 0) { ok = false; finished = true; finish(); return; }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || ready > 0 || finished || resolved) return;
    game.audio.play('se_tap', 0.1);
    var best = -1, bestD = 1e9;
    for (var i = 0; i < cards.length; i++) {
      var d = Math.hypot(x - cardX(i), y - H * 0.82);
      if (d < bestD) { bestD = d; best = i; }
    }
    if (bestD < 160) resolvePick(best);
  });

  var demo = { t: 0, gx: CX, gy: H * 0.82, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { newRound(); }
    roundT += dt;
    if (cyc > 2.2 && !resolved) {
      var correctI = cards.indexOf(slotW);
      demo.gx = cardX(correctI); demo.gy = H * 0.82; demo.press = true;
      resolvePick(correctI);
    } else if (cyc < 2.2) {
      demo.press = false; demo.gx = CX; demo.gy = H * 0.82;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (pHp === undefined) initGame();
      bg();
      stepDemo(dt);
      drawFighters();
      drawHp();
      drawSlot();
      drawCards(false);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 34, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.22, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.96, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawFighters();
      drawHp();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.24, 44, ok ? C.good : C.bad);
      txt(pHp + ' / ' + HP_MAX, W / 2, H * 0.29, 28, C.gold);
      if (!ok && pHp >= 1) txt('あと少し!', W / 2, H * 0.33, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { pHp: pHp, eHp: eHp };
        if (ok) game.end.success(pHp, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundT += dt;
      if (roundT >= ROUND_TIME && !resolved) {
        var correctI = cards.indexOf(slotW);
        var wrongI = correctI === 0 ? 1 : 0;
        resolvePick(wrongI);
      }
      if (resolved && hitStop <= 0 && !finished) { newRound(); }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawFighters();
    drawHp();
    if (!finished) { drawSlot(); drawCards(true); }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['F3', 0.35], ['A3', 0.35], ['C4', 0.35], ['F4', 0.7]], { tempo: 108, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

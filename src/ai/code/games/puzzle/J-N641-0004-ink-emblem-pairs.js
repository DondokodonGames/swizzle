// J-N641-0004-ink-emblem-pairs.js
// 墨紋ペアめくり — 裏返った紋章札をめくり、同じ紋章を少ない手数でそろえる
// 操作: 裏向きの札を2枚タップしてめくる。同じ紋章なら揃ったまま残り、違えば伏せ直る
// 終わり: 制限時間内に全ての紋章を揃えれば成功。時間切れなら失敗
// @mechanic: pair_match
// @theme: ink_emblem_pair_match
// 世界観: 記憶術見習いの墨絵師が、机に伏せられた紋章札をめくり、同じ紋章の対を少ない手数で見つけ出す
// 残るもの: 正誤(CLEAR/GAME OVER) + 揃えた組数とめくった手数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白黒2値、線の太さで語る
  var C = {
    bg: '#f4f0e6', bg2: '#e4ddc8', card: '#f4f0e6', cardBack: '#1a1a14',
    cardEdge: '#1a1a14', good: '#1a1a14', badc: '#8a1a1a', gold: '#1a1a14', ink: '#1a1a14',
    tableTop: '#e4ddc8',
  };

  var GAME_TITLE = 'EMBLEM PAIRS';
  var TIME_LIMIT = 16;
  var COLS = 3, ROWS = 4;
  var PAIRS = (COLS * ROWS) / 2;
  var CARD_W = 220, CARD_H = 250, GAP_X = 40, GAP_Y = 26;
  var GRID_X0 = W / 2 - (COLS * (CARD_W + GAP_X) - GAP_X) / 2 + CARD_W / 2;
  var GRID_Y0 = H * 0.225;

  var EMBLEMS = [
    ['.#.', '###', '.#.'],
    ['#..', '.#.', '..#'],
    ['###', '#.#', '###'],
    ['.#.', '#.#', '.#.'],
    ['#.#', '.#.', '#.#'],
    ['##.', '.##', '##.'],
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
  }

  function cardPos(i) {
    var col = i % COLS, row = Math.floor(i / COLS);
    return { x: GRID_X0 + col * (CARD_W + GAP_X), y: GRID_Y0 + row * (CARD_H + GAP_Y) };
  }

  function drawCard(i, card) {
    var p = cardPos(i);
    if (card.matched || card.faceUp) {
      game.draw.rect(p.x - CARD_W / 2, p.y - CARD_H / 2, CARD_W, CARD_H, C.card);
      game.draw.rect(p.x - CARD_W / 2, p.y - CARD_H / 2, CARD_W, 6, C.cardEdge);
      game.draw.rect(p.x - CARD_W / 2, p.y + CARD_H / 2 - 6, CARD_W, 6, C.cardEdge);
      game.draw.rect(p.x - CARD_W / 2, p.y - CARD_H / 2, 6, CARD_H, C.cardEdge);
      game.draw.rect(p.x + CARD_W / 2 - 6, p.y - CARD_H / 2, 6, CARD_H, C.cardEdge);
      game.draw.sprite(EMBLEMS[card.sym], { '#': card.matched ? '#8a8a70' : C.ink }, p.x, p.y, 40, { anchor: 'center' });
    } else {
      game.draw.rect(p.x - CARD_W / 2, p.y - CARD_H / 2, CARD_W, CARD_H, C.cardBack);
      for (var k = 0; k < 4; k++) {
        game.draw.rect(p.x - CARD_W / 2 + 16, p.y - CARD_H / 2 + 20 + k * 60, CARD_W - 32, 4, '#3a3a2c', 0.6);
      }
    }
  }

  var cards, revealedIdx, matchedCount, flips, timeLeft, lockT, milestoneCalled;
  var done, endWait, finished, ready, hitStop, shake;

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function initGame() {
    var syms = [];
    for (var s = 0; s < PAIRS; s++) { syms.push(s); syms.push(s); }
    shuffle(syms);
    cards = [];
    for (var i = 0; i < syms.length; i++) cards.push({ sym: syms[i], faceUp: false, matched: false });
    revealedIdx = []; matchedCount = 0; flips = 0; timeLeft = TIME_LIMIT; lockT = 0; milestoneCalled = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function flipAt(i) {
    if (finished || ready > 0 || lockT > 0) return;
    var c = cards[i];
    if (!c || c.matched || c.faceUp) return;
    c.faceUp = true;
    flips++;
    var p = cardPos(i);
    game.audio.play('se_tap', 0.25);
    revealedIdx.push(i);
    if (revealedIdx.length === 2) {
      var a = cards[revealedIdx[0]], b = cards[revealedIdx[1]];
      if (a.sym === b.sym) {
        a.matched = true; b.matched = true; matchedCount++;
        var pa = cardPos(revealedIdx[0]);
        game.feedback.good(pa.x, pa.y, { text: matchedCount >= PAIRS ? 'CLEAR' : 'NICE', color: C.good });
        game.audio.play('se_coin', 0.35);
        revealedIdx = [];
        if (!milestoneCalled && matchedCount >= Math.ceil(PAIRS / 2)) {
          milestoneCalled = true;
          game.fx.popup('NICE', W * 0.5, H * 0.2, { color: C.gold, size: 32 });
          game.audio.play('se_milestone', 0.3);
        }
        if (matchedCount >= PAIRS) winRun();
      } else {
        game.feedback.bad(p.x, p.y, { text: 'MISS' });
        game.audio.play('se_bad', 0.3);
        lockT = 0.5;
      }
    } else {
      game.feedback.good(p.x, p.y, { text: '', color: C.ink, count: 3 });
    }
  }

  function winRun() {
    if (finished) return;
    finished = true; ok = true; hitStop = 0.15;
    game.fx.burst(W * 0.5, H * 0.5, { color: C.gold, count: 24, speed: 420 });
    game.audio.play('se_success', 0.5);
    finish();
  }
  function loseRun() {
    if (finished) return;
    finished = true; ok = false; shake = 0.2; hitStop = 0.3;
    game.feedback.bad(W * 0.5, H * 0.5, { text: 'MISS' });
    game.audio.play('se_failure', 0.5);
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function hitIndexAt(x, y) {
    for (var i = 0; i < cards.length; i++) {
      var p = cardPos(i);
      if (Math.abs(x - p.x) < CARD_W / 2 && Math.abs(y - p.y) < CARD_H / 2) return i;
    }
    return -1;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) {
      var i = hitIndexAt(x, y);
      if (i < 0) { game.feedback.bad(x, y, { text: 'MISS' }); return; }
      flipAt(i);
    }
  });

  var demo = { t: 0, gx: 0, gy: 0, press: false, memo: [] };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) { initGame(); demo.memo = []; demo.postFinish = 0; }
    // ATTRACT死角対策: 決着後は長く静止させず素早く次サイクルへ
    if (matchedCount >= PAIRS) {
      demo.postFinish = (demo.postFinish || 0) + dt;
      if (demo.postFinish > 0.7) { demo.t = 0; initGame(); demo.memo = []; demo.postFinish = 0; }
      return;
    } else {
      demo.postFinish = 0;
    }
    if (lockT > 0) { lockT -= dt; if (lockT <= 0) { cards[revealedIdx[0]].faceUp = false; cards[revealedIdx[1]].faceUp = false; revealedIdx = []; } return; }
    // AI picks a known pair if memorized, else explores
    var target = -1;
    for (var s = 0; s < PAIRS; s++) {
      var idxs = [];
      for (var i = 0; i < cards.length; i++) if (cards[i].sym === s && !cards[i].matched) idxs.push(i);
      if (idxs.length === 2 && demo.memo.indexOf(idxs[0]) >= 0 && demo.memo.indexOf(idxs[1]) >= 0) { target = idxs[revealedIdx.length]; break; }
    }
    if (target < 0) {
      for (var k = 0; k < cards.length; k++) if (!cards[k].matched && !cards[k].faceUp && demo.memo.indexOf(k) < 0) { target = k; break; }
      if (target < 0) for (var k2 = 0; k2 < cards.length; k2++) if (!cards[k2].matched && !cards[k2].faceUp) { target = k2; break; }
    }
    if (target >= 0 && Math.floor(cyc * 2) % 2 === 0) {
      var p = cardPos(target);
      demo.gx = p.x; demo.gy = p.y; demo.press = true;
      if (demo.memo.indexOf(target) < 0) demo.memo.push(target);
      flipAt(target);
    } else demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (cards === undefined) initGame();
      stepDemo(dt);
      bg();
      for (var i = 0; i < cards.length; i++) drawCard(i, cards[i]);
      game.draw.hand(demo.gx || W / 2, demo.gy || H / 2, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.ink);
      else txt('TAP TO START', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg();
      for (var j = 0; j < cards.length; j++) drawCard(j, cards[j]);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.badc);
      txt(matchedCount + ' / ' + PAIRS, W / 2, H * 0.14, 28, C.ink);
      if (!ok) txt('あと' + Math.max(0, PAIRS - matchedCount) + '組!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(Math.max(0, 100 - flips * 4), { matched: matchedCount, flips: flips });
        else game.end.failure({ matched: matchedCount, flips: flips });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (lockT > 0) {
        lockT -= dt;
        if (lockT <= 0) { cards[revealedIdx[0]].faceUp = false; cards[revealedIdx[1]].faceUp = false; revealedIdx = []; }
      }
      if (timeLeft <= 0) { timeLeft = 0; loseRun(); }
    }
    if (shake > 0) shake -= dt;

    bg();
    for (var m = 0; m < cards.length; m++) drawCard(m, cards[m]);

    txt(matchedCount + ' / ' + PAIRS + '  (' + flips + ')', W / 2, H * 0.06, 28, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 140, tbW, 14, '#c8c0a8', 1);
    game.draw.rect(60, 140, tbW * Math.max(0, timeLeft / TIME_LIMIT), 14, lowTime ? C.badc : '#3a3a2c');
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 54, C.ink);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.3], ['E4', 0.3], ['G4', 0.3], ['C5', 0.6]], { tempo: 110, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

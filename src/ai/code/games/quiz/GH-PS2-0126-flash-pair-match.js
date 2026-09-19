// GH-PS2-0126-flash-pair-match.js
// フラッシュペア — 一瞬だけ見えた6枚の絵を覚えて、同じ絵の対を当てていく
// 操作: 開始直後に全部の絵が一瞬光って伏せられる。覚えた場所を2枚ずつタップして対を揃える
// 終わり: 3対すべて揃えれば成功。外すたびに残り時間が減り、時間切れで失敗
// @mechanic: pair_match
// @theme: conjurer_card_table
// 世界観: 奇術師の卓上。6枚の札が一瞬だけ絵を見せて伏せる。同じ絵の2枚を記憶だけで当て続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 揃えた対の数
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 8bit HOME: 3〜4色+黒。8x8の粗いドット、輪郭線なし。背景はタイル反復
  var C = {
    bg: '#1a1030', tile: '#241848', card: '#4a3a7a', cardBack: '#2e2258',
    a: '#ff5a5a', b: '#5ad4ff', c: '#ffd45a', good: '#5affa0', bad: '#ff5a5a', gold: '#ffd45a', white: '#f0e8ff', ink: '#0c0818',
  };
  var SYM_COL = [C.a, C.b, C.c];
  var SYM_SHAPES = [
    ['.#.', '###', '.#.'],
    ['###', '#.#', '###'],
    ['#.#', '.#.', '#.#'],
  ];

  var GAME_TITLE = 'FLASH PAIR';
  var PAIRS = 3, MAX_TIME = 16, MISS_PENALTY = 2.0;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, matchedN = 0, missN = 0, elapsedRound = 0, timeLeft = MAX_TIME;

  var CARD_W = 260, CARD_H = 300;
  var POS = [
    { x: W * 0.5 - CARD_W - 40, y: H * 0.34 }, { x: W * 0.5, y: H * 0.34 }, { x: W * 0.5 + CARD_W + 40, y: H * 0.34 },
    { x: W * 0.5 - CARD_W - 40, y: H * 0.34 + CARD_H + 40 }, { x: W * 0.5, y: H * 0.34 + CARD_H + 40 }, { x: W * 0.5 + CARD_W + 40, y: H * 0.34 + CARD_H + 40 },
  ];

  var cards, phase, phaseT, selA, selB, resolveT, done, endWait, finished, ready, hitStop, shake, streak;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function tableBg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, '#120a24']]);
    for (var ty = 0; ty < H; ty += 48) for (var tx = 0; tx < W; tx += 48) {
      if (((tx / 48 + ty / 48) % 2) === 0) game.draw.rect(tx, ty, 48, 48, C.tile, 0.35);
    }
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function initGame() {
    var symIdx = [0, 0, 1, 1, 2, 2];
    shuffle(symIdx);
    cards = [];
    for (var i = 0; i < 6; i++) cards.push({ sym: symIdx[i], pos: POS[i], revealed: true, matched: false });
    phase = 'flash'; phaseT = 0.9;
    selA = -1; selB = -1; resolveT = 0;
    matchedN = 0; missN = 0; elapsedRound = 0; timeLeft = MAX_TIME; streak = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function cardAt(x, y) {
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      if (x > c.pos.x - CARD_W / 2 && x < c.pos.x + CARD_W / 2 && y > c.pos.y - CARD_H / 2 && y < c.pos.y + CARD_H / 2) return i;
    }
    return -1;
  }

  function flipTap(x, y) {
    if (done || ready > 0 || finished || phase !== 'pick' || resolveT > 0) return;
    var idx = cardAt(x, y);
    if (idx < 0 || cards[idx].matched || cards[idx].revealed) return;
    cards[idx].revealed = true;
    game.audio.play('se_tap', 0.2);
    if (selA < 0) { selA = idx; return; }
    selB = idx;
    if (cards[selA].sym === cards[selB].sym) {
      cards[selA].matched = true; cards[selB].matched = true;
      matchedN++; streak++;
      hitStop = 0.1;
      game.feedback.good(cards[selB].pos.x, cards[selB].pos.y, { text: 'MATCH', color: C.good });
      game.fx.burst(cards[selB].pos.x, cards[selB].pos.y, { color: C.gold, count: 14, speed: 320 });
      game.audio.play('se_coin', 0.4);
      if (streak >= 2) game.fx.popup('COMBO x' + streak, W / 2, H * 0.20, { color: C.gold, size: 36 });
      if (matchedN >= PAIRS) { ok = true; finished = true; finish(); return; }
      game.fx.popup(matchedN + ' / ' + PAIRS, W / 2, H * 0.16, { color: C.gold, size: 40 });
      selA = -1; selB = -1;
    } else {
      streak = 0; missN++;
      hitStop = 0.08;
      timeLeft = Math.max(0, timeLeft - MISS_PENALTY);
      game.feedback.bad(cards[selB].pos.x, cards[selB].pos.y, { text: 'MISS' });
      shake = 0.1;
      game.audio.play('se_bad', 0.3);
      resolveT = 0.55;
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
    flipTap(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.4);
    endWait = 1.3;
  }

  function drawCard(c) {
    var revealed = c.revealed || c.matched;
    if (c.matched) {
      game.draw.rect(c.pos.x - CARD_W / 2, c.pos.y - CARD_H / 2, CARD_W, CARD_H, C.card, 0.25);
    } else {
      game.draw.rect(c.pos.x - CARD_W / 2, c.pos.y - CARD_H / 2, CARD_W, CARD_H, revealed ? C.card : C.cardBack);
    }
    if (revealed && !c.matched) {
      game.draw.sprite(SYM_SHAPES[c.sym], { '#': SYM_COL[c.sym] }, c.pos.x, c.pos.y, 42, { anchor: 'center' });
    } else if (!revealed) {
      game.draw.rect(c.pos.x - CARD_W / 2 + 14, c.pos.y - CARD_H / 2 + 14, CARD_W - 28, CARD_H - 28, C.tile, 0.5);
    }
  }

  var demo = { t: 0, gx: POS[0].x, gy: POS[0].y, press: false, step: 0, sA: 0, sB: 1 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) {
      var symIdx = [0, 0, 1, 1, 2, 2]; shuffle(symIdx);
      cards = [];
      for (var i = 0; i < 6; i++) cards.push({ sym: symIdx[i], pos: POS[i], revealed: cyc < 0.7, matched: false });
      demo.step = 0;
    }
    if (cyc < 0.7) { phase = 'flash'; for (var k = 0; k < cards.length; k++) cards[k].revealed = true; return; }
    phase = 'pick';
    for (var m = 0; m < cards.length; m++) if (!cards[m].matched) cards[m].revealed = (m === demo.sA || m === demo.sB) && cyc > 1.3;
    var targetIdx = cyc < 1.3 ? demo.sA : demo.sB;
    var p = POS[targetIdx];
    demo.gx += (p.x - demo.gx) * Math.min(1, dt * 6);
    demo.gy += (p.y - demo.gy) * Math.min(1, dt * 6);
    demo.press = (cyc > 0.9 && cyc < 1.05) || (cyc > 1.55 && cyc < 1.7);
    if (cyc > 1.7 && demo.step === 0) {
      demo.step = 1;
      cards[demo.sA].matched = true; cards[demo.sB].matched = true;
      game.feedback.good(POS[demo.sB].x, POS[demo.sB].y, { text: 'MATCH', color: C.good });
      game.fx.burst(POS[demo.sB].x, POS[demo.sB].y, { color: C.gold, count: 10, speed: 280 });
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (cards === undefined) initGame();
      tableBg();
      stepDemo(dt);
      for (var i = 0; i < cards.length; i++) drawCard(cards[i]);
      game.draw.hand(demo.gx + Math.sin(game.time.elapsed * 2.3) * 12, demo.gy + Math.cos(game.time.elapsed * 1.7) * 12, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.10, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + ' / ' + PAIRS : '-'), W / 2, H * 0.14, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 36, C.gold);
        txt('TAP TO START', W / 2, H * 0.94, 28, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      tableBg();
      for (var i2 = 0; i2 < cards.length; i2++) drawCard(cards[i2]);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 48, ok ? C.good : C.bad);
      txt(matchedN + ' / ' + PAIRS, W / 2, H * 0.145, 30, C.gold);
      if (!ok && matchedN === PAIRS - 1) txt('あと1対!', W / 2, H * 0.19, 26, C.bad);
      var best = Math.max(game.best, matchedN);
      txt('BEST ' + best, W / 2, H * 0.92, 26, C.gold);
      if (matchedN > game.best) txt('NEW RECORD', W / 2, H * 0.96, 24, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.99, 22, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(matchedN, { matchedN: matchedN, missN: missN });
        else game.end.failure({ matchedN: matchedN, missN: missN });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (phase === 'flash') {
      phaseT -= dt;
      if (phaseT <= 0) {
        phase = 'pick';
        for (var k = 0; k < cards.length; k++) cards[k].revealed = false;
      }
    } else if (!finished) {
      elapsedRound += dt;
      timeLeft -= dt;
      if (resolveT > 0) {
        resolveT -= dt;
        if (resolveT <= 0) {
          cards[selA].revealed = false; cards[selB].revealed = false;
          selA = -1; selB = -1;
        }
      }
      if (timeLeft <= 0) { ok = false; finished = true; finish(); }
    }
    if (shake > 0) shake -= dt;

    tableBg();
    for (var i3 = 0; i3 < cards.length; i3++) drawCard(cards[i3]);

    txt(matchedN + ' / ' + PAIRS, W * 0.30, 90, 32, C.white);
    game.draw.rect(60, H - 90, W - 120, 20, C.tile);
    game.draw.rect(60, H - 90, (W - 120) * Math.max(0, timeLeft / MAX_TIME), 20, timeLeft < MAX_TIME * 0.3 ? C.bad : C.good);
    if (phase === 'flash') txt('!', W / 2, H * 0.5, 90, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.22, 50, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.18], ['E5', 0.18], ['G5', 0.18]], { tempo: 160, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

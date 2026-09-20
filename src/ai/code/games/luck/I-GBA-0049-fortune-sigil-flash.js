// I-GBA-0049-fortune-sigil-flash.js
// フォーチュンシジルフラッシュ — 占い玉に一瞬浮かぶ紋章を覚え、同じ紋章の札を選ぶ
// 操作: 占い玉に一瞬浮かぶ紋章を覚え、下に並ぶ4枚の札から同じものをタップする
// 終わり: 規定数(5問)を正しく選べば成功。誤答か時間切れで失敗
// @mechanic: pair_match
// @theme: carnival_fortune_sigils
// 世界観: 場末のカーニバルの占い小屋。占い玉に一瞬浮かぶ紋章を弟子の占い師が覚え、同じ紋章の札を選んで的中させる
// 残るもの: 正誤(CLEAR/GAME OVER) + 的中させた問題数
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 濃紺〜黒グラデ + 発光4色、外周に薄いグロー
  var C = {
    bg: '#0a0018', bg2: '#1a0030', orb: '#2a1050', orbEdge: '#7a3dff',
    sig: '#00e5ff', card: '#1a0f35', cardEdge: '#7a3dff',
    accent: '#ff2e88', good: '#39ff6a', bad: '#ff3355', gold: '#ffe600', white: '#ffffff', ink: '#050008',
  };

  var GAME_TITLE = 'SIGIL FLASH';
  var TOTAL = 5;
  var FLASH_T = 0.6, HIDE_T = 0.4, PICK_T = 2.0;
  var ROUND_T = FLASH_T + HIDE_T + PICK_T;
  var MAX_TIME = TOTAL * ROUND_T; // pair_match: F override 10-20s
  var NEEDED = TOTAL;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var ORB_X = W * 0.5, ORB_Y = H * 0.40;
  function cardPos(i) {
    var xs = [W * 0.24, W * 0.5, W * 0.76];
    var col = i % 3, row = Math.floor(i / 3);
    return { x: xs[col], y: H * 0.78 + row * (H * 0.14) };
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SIGILS = [
    ['..#..', '.###.', '#####', '.###.', '..#..'],
    ['..##.', '.#..#', '#...#', '.#..#', '..##.'],
    ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
    ['.###.', '#...#', '#.#.#', '#...#', '.###.'],
    ['#####', '#....', '###..', '#....', '#####'],
    ['#.#.#', '.###.', '#####', '.###.', '#.#.#'],
  ];
  var FORTUNE_TELLER = ['.###.', '#####', '.#.#.', '##.##'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.circle(ORB_X, ORB_Y, 240, C.orbEdge, 0.10);
    game.draw.sprite(FORTUNE_TELLER, { '#': C.accent }, W * 0.5, H * 0.12, 9, { anchor: 'center' });
  }

  var round, target, cardSigs, revealed, answered, roundT, placed, milestoneShown, wrongIdx;
  var done, endWait, finished;
  var ready, hitStop, shake, celebrate;

  function pickN(n) {
    var pool = [0, 1, 2, 3, 4, 5];
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(game.random(0, i + 1));
      var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    return pool.slice(0, n);
  }

  function newRound(demoMode) {
    var four = demoMode ? [2, 0, 4, 1] : pickN(4);
    target = four[demoMode ? 0 : Math.floor(game.random(0, 4))];
    cardSigs = four;
    revealed = true; answered = false; roundT = 0; wrongIdx = -1;
  }

  function initGame() {
    round = 0; placed = 0; timeLeft = MAX_TIME; milestoneShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; celebrate = false;
    newRound(false);
  }
  var timeLeft;

  function nextRound() {
    round++;
    if (round >= TOTAL) { ok = true; finished = true; hitStop = 0.2; celebrate = true; finish(); return; }
    newRound(false);
  }

  function tryPick(x, y) {
    if (state !== S.PLAYING || ready > 0 || hitStop > 0 || finished || roundT < FLASH_T + HIDE_T) return;
    var best = -1, bestD = 1e9;
    for (var i = 0; i < cardSigs.length; i++) {
      var p = cardPos(i);
      var d = Math.hypot(p.x - x, p.y - y);
      if (d < 100 && d < bestD) { bestD = d; best = i; }
    }
    if (best < 0 || answered) return;
    answered = true;
    game.audio.play('se_tap', 0.2);
    var p = cardPos(best);
    if (cardSigs[best] === target) {
      placed++;
      game.feedback.good(p.x, p.y, { text: placed >= TOTAL ? 'CLEAR' : 'NICE', color: C.good });
      if (!milestoneShown && placed >= Math.ceil(TOTAL / 2)) {
        milestoneShown = true;
        game.fx.popup('HALFWAY!', W / 2, H * 0.26, { color: C.gold, size: 36 });
        game.audio.play('se_milestone', 0.4);
      }
      if (placed >= TOTAL) { ok = true; finished = true; hitStop = 0.2; celebrate = true; finish(); }
      else hitStop = 0.12;
    } else {
      wrongIdx = best;
      game.feedback.bad(p.x, p.y, { text: 'MISS' });
      shake = 0.3;
      ok = false; finished = true; hitStop = 0.35;
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) tryPick(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawOrb() {
    var showing = roundT < FLASH_T;
    game.draw.circle(ORB_X, ORB_Y, 130, C.orb);
    game.draw.circle(ORB_X, ORB_Y, 130, C.orbEdge, 0.6);
    if (showing || celebrate) game.draw.sprite(SIGILS[target], { '#': C.sig }, ORB_X, ORB_Y, 16, { anchor: 'center' });
    else game.draw.circle(ORB_X, ORB_Y, 20, C.orbEdge, 0.5);
  }

  function drawCards() {
    for (var i = 0; i < cardSigs.length; i++) {
      var p = cardPos(i);
      var wrong = wrongIdx === i && hitStop > 0;
      var col = wrong ? C.bad : C.card;
      game.draw.rect(p.x - 80, p.y - 80, 160, 160, wrong ? C.bad : C.cardEdge);
      game.draw.rect(p.x - 72, p.y - 72, 144, 144, col, 0.95);
      if (roundT >= FLASH_T + HIDE_T || wrong || celebrate) {
        game.draw.sprite(SIGILS[cardSigs[i]], { '#': wrong ? C.white : C.sig }, p.x, p.y, 13, { anchor: 'center' });
      }
    }
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.94, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { newRound(true); demo.gx = W * 0.5; demo.gy = H * 0.94; demo.press = false; }
    roundT = cyc;
    if (cyc > FLASH_T + HIDE_T + 0.3 && cyc < FLASH_T + HIDE_T + 1.0 && !answered) {
      var t = Math.min(1, (cyc - (FLASH_T + HIDE_T + 0.3)) / 0.5);
      var idx = cardSigs.indexOf(target);
      var p = cardPos(idx);
      demo.gx = W * 0.5 + (p.x - W * 0.5) * t;
      demo.gy = H * 0.94 + (p.y - H * 0.94) * t;
      demo.press = t >= 1;
      if (t >= 1) {
        answered = true;
        game.feedback.good(p.x, p.y, { text: 'NICE', color: C.good });
        game.audio.play('se_tap', 0.15);
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (roundT === undefined) initGame();
      bg();
      stepDemo(dt);
      drawOrb();
      drawCards();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.095, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.97, 34, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.97, 24, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg(); drawOrb(); drawCards();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 46, ok ? C.good : C.bad);
      txt(placed + ' / ' + TOTAL, W / 2, H * 0.11, 28, C.gold);
      if (!ok) txt('あと' + (TOTAL - placed) + '問!', W / 2, H * 0.15, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.97, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(placed, { placed: placed, total: TOTAL });
        else game.end.failure({ placed: placed, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0 && answered && !finished) nextRound();
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundT += dt;
      if (roundT >= ROUND_T && !answered) {
        answered = true;
        game.feedback.bad(ORB_X, H * 0.78, { text: 'MISS' });
        shake = 0.3; ok = false; finished = true; hitStop = 0.35; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawOrb();
    drawCards();

    txt(placed + ' / ' + TOTAL, W / 2, H * 0.06, 28, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, 1 - roundT / ROUND_T), 16, C.accent);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.62, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['F3', 0.4], ['A3', 0.4], ['C4', 0.4], ['F4', 0.6]], { tempo: 110, wave: 'sawtooth', volume: 0.045, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

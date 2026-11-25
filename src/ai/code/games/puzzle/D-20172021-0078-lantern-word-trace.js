// D-20172021-0078-lantern-word-trace.js
// ランタン・ワードトレース — 4つの文字灯籠が単語の順に一度だけ光る。消えたら同じ順にタップして再現する
// 操作: 光る順番をよく見て覚え、消灯後に同じ順番で文字灯籠をタップする
// 終わり: 制限時間内に正しい順番で全てタップできれば成功。順番違い/時間切れで失敗
// @mechanic: memory_sequence
// @theme: lantern_word_trace
// 世界観: 夜祭りの灯籠職人が、宙に浮かぶ4つの文字灯籠が単語の順に光るのを見届け、消えた後に同じ順でタップして単語の灯りを呼び戻す
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく再現した灯籠数
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 多色+光、細かいパララックス、光の滲み
  var C = {
    bg: '#0e1630', bg2: '#060a1c', lanternOff: '#241c40', lanternShow: '#ffb64a',
    lanternDone: '#5cff9e', lanternRing: '#ffe1a6',
    good: '#5cff9e', bad: '#ff4d5e', gold: '#ffb64a', white: '#fff3da', ink: '#120a24',
  };

  var GAME_TITLE = 'LANTERN TRACE';
  var WORDS = ['あかり', 'ほしぞ', 'みずう', 'おおぞ'];
  var TIME_LIMIT = 12;
  var SHOW_GAP = 0.55;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var POS = [
    { x: W * 0.24, y: H * 0.36 },
    { x: W * 0.62, y: H * 0.28 },
    { x: W * 0.30, y: H * 0.56 },
    { x: W * 0.70, y: H * 0.58 },
  ];

  var word, letters, order;

  function buildWord() {
    word = WORDS[Math.floor(game.random(0, WORDS.length))];
    letters = word.split('');
    order = [0, 1, 2, 3];
    for (var i = order.length - 1; i > 0; i--) {
      var j = Math.floor(game.random(0, i + 1));
      var t = order[i]; order[i] = order[j]; order[j] = t;
    }
  }
  buildWord();

  var phase, showIdx, showT, hit, timeLeft, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var MAKER = ['.##.', '####', '.##.', '.##.'];

  function bg() {
    var pulse = 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.2);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, C.gold, pulse * 0.25);
    for (var i = 0; i < 12; i++) {
      var sx = (i * 233) % W, sy = (i * 157) % (H * 0.7);
      game.draw.rect(sx, sy, 3, 3, C.white, 0.15 + 0.1 * Math.sin(game.time.elapsed * 1.5 + i));
    }
    var bob = Math.sin(game.time.elapsed * 2.4) * 6;
    game.draw.sprite(MAKER, { '#': C.gold }, W * 0.86, H * 0.86 + bob, 10, { anchor: 'center' });
  }

  function initGame() {
    buildWord();
    phase = 'show'; showIdx = 0; showT = 0; hit = 0; timeLeft = TIME_LIMIT;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function lanternAt(x, y) {
    for (var i = 0; i < 4; i++) {
      if (game.hit.circle(x, y, 1, POS[i].x, POS[i].y, 44)) return i;
    }
    return -1;
  }

  function drawLanterns() {
    for (var i = 0; i < 4; i++) {
      var col = C.lanternOff;
      var alpha = 0.5;
      if (phase === 'show' && order[showIdx] === i) { col = C.lanternShow; alpha = 0.6 + 0.3 * Math.sin(game.time.elapsed * 10); }
      else if (phase === 'input' && i < 4 && order.indexOf(i) < hit) { col = C.lanternDone; alpha = 0.55; }
      game.draw.circle(POS[i].x, POS[i].y, 40, col, alpha);
      game.draw.circle(POS[i].x, POS[i].y, 40, C.lanternRing, 0.3);
      txt(letters[i], POS[i].x, POS[i].y + 11, 30, C.white);
    }
  }

  function resolveTap(i) {
    if (phase !== 'input' || finished || ready > 0) return;
    if (order[hit] === i) {
      hit++;
      hitStop = 0.06;
      game.feedback.good(POS[i].x, POS[i].y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.3);
      if (hit === 2) game.fx.popup('あと' + (4 - hit) + '!', W * 0.5, H * 0.18, { color: C.gold, size: 32 });
      if (hit >= 4) {
        finished = true; ok = true; hitStop = 0.3;
        game.feedback.good(POS[i].x, POS[i].y, { text: 'CLEAR', color: C.good });
        game.fx.burst(POS[i].x, POS[i].y, { color: C.gold, count: 20, speed: 400 });
        game.audio.play('se_success', 0.5);
        finish();
      }
    } else {
      finished = true; ok = false; hitStop = 0.3; shake = 0.25;
      game.feedback.bad(POS[i].x, POS[i].y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) {
      var i = lanternAt(x, y);
      if (i >= 0) resolveTap(i);
      else game.audio.play('se_tap', 0.05);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) { buildWord(); phase = 'show'; showIdx = 0; showT = 0; hit = 0; }
    if (phase === 'show') {
      showT += dt;
      if (showT >= SHOW_GAP) {
        showT = 0; showIdx++;
        game.audio.play('se_tap', 0.15);
        if (showIdx >= 4) { phase = 'input'; }
      }
    } else if (phase === 'input') {
      var p = cyc - 4 * SHOW_GAP;
      var step = Math.floor(p / 0.5);
      if (step > hit && step <= 4) {
        var idx = order[hit];
        hit++;
        game.feedback.good(POS[idx].x, POS[idx].y, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.2);
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      bg();
      stepDemo(dt);
      drawLanterns();
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawLanterns();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(hit + ' / 4', W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + (4 - hit) + '灯!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hit, { hit: hit, total: 4 });
        else game.end.failure({ hit: hit, total: 4 });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { game.audio.play('se_tap'); phase = 'show'; showIdx = 0; showT = 0; }
    } else if (phase === 'show') {
      showT += dt;
      if (showT >= SHOW_GAP) {
        showT = 0; showIdx++;
        game.audio.play('se_tap', 0.15);
        if (showIdx >= 4) phase = 'input';
      }
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(W * 0.5, H * 0.4, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawLanterns();

    if (phase === 'input') {
      txt(hit + ' / 4', W / 2, H * 0.08, 28, C.white);
      var tbW = W - 120;
      var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
      game.draw.rect(60, 150, tbW, 16, C.lanternOff, 1);
      game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.75, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['F4', 0.3], ['A4', 0.3], ['C5', 0.3], ['F5', 0.5]], { tempo: 128, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

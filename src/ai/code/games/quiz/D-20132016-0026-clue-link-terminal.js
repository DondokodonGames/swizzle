// D-20132016-0026-clue-link-terminal.js
// クルーリンク・ターミナル — 手がかりアイコンと同じ形の映像アイコンをつないで事件をつなげる
// 操作: 左のキーワード印を1つタップして選び、右にある同じ形の映像印をタップしてつなぐ
// 終わり: 4組すべてつなげば成功。時間切れでGAME OVER
// @mechanic: pair_match
// @theme: night_surveillance_clue_link
// 世界観: 深夜の監視端末室。壁面モニターに残る手がかり印と、録画アーカイブの映像印。同じ形どうしを結び、事件の輪郭をつなげる捜査官
// 残るもの: 正誤(CLEAR/GAME OVER) + つなげた組数
// スタイル: 90s PRE-RENDER

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 90s PRE-RENDER: 暗め・金属質、粒状ノイズと擬似奥行き
  var C = {
    bg: '#141618', bg2: '#0a0b0c', panel: '#20242a', panelEdge: '#3a4048',
    icon: '#8ea0ac', iconSel: '#ffd400', good: '#4dffb0', bad: '#ff4d5e',
    gold: '#ffd400', white: '#e8edf0', ink: '#040506', noise: '#ffffff',
  };

  var GAME_TITLE = 'CLUE LINK';
  var PAIRS = 4, MAX_TIME = 13.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var ICONS = [
    ['.#.#.', '#####', '.#.#.'],
    ['.###.', '#.#.#', '#.#.#', '.###.'],
    ['##...', '#.##.', '##...'],
    ['.###.', '##.##', '.###.'],
  ];

  var leftOrder, rightOrder, matched, selLeft, timeLeft, mood, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var MONITOR = ['######', '#.oo.#', '#....#', '######'];

  var SLOT_Y = [H * 0.34, H * 0.46, H * 0.58, H * 0.70];
  var LEFT_X = W * 0.26, RIGHT_X = W * 0.74;

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    return arr;
  }

  function roomBg(elapsed) {
    game.draw.gradient(0, H, [[0, C.bg2], [0.5, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 26; i++) {
      var gx = (i * 173 + Math.floor(elapsed * 40)) % W, gy = (i * 251 + 31) % H;
      game.draw.rect(gx, gy, 2, 2, C.noise, 0.035);
    }
    for (var s = 0; s < 4; s++) game.draw.rect(0, H * 0.20 + s * (H * 0.16), W, 1, '#ffffff08');
  }

  function initGame() {
    leftOrder = shuffle([0, 1, 2, 3]);
    rightOrder = shuffle([0, 1, 2, 3]);
    matched = [false, false, false, false, false, false, false, false];
    selLeft = -1; timeLeft = MAX_TIME; mood = 0;
    finished = false; done = false; endWait = 0;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function matchedCount() {
    var n = 0; for (var i = 0; i < 4; i++) if (matched[i]) n++; return n;
  }

  function drawCard(x, y, code, isLeft, idx, selected, isDone) {
    var col = isDone ? C.good : (selected ? C.iconSel : C.icon);
    game.draw.rect(x - 84, y - 68, 168, 136, C.panelEdge);
    game.draw.rect(x - 76, y - 60, 152, 120, isDone ? '#123024' : C.panel);
    game.draw.sprite(ICONS[code], { '#': col }, x, y, 16, { anchor: 'center' });
    if (selected) game.draw.circle(x, y, 100, C.iconSel, 0.15);
  }

  function pickSlot(px, py, xCol) {
    for (var i = 0; i < 4; i++) {
      if (Math.abs(px - xCol) < 90 && Math.abs(py - SLOT_Y[i]) < 72) return i;
    }
    return -1;
  }

  function tapPlay(x, y) {
    if (done || ready > 0 || hitStop > 0 || finished) return;
    var li = pickSlot(x, y, LEFT_X);
    if (li >= 0 && !matched[li]) {
      selLeft = li;
      game.audio.play('se_tap', 0.08);
      return;
    }
    var ri = pickSlot(x, y, RIGHT_X);
    if (ri >= 0 && !matched[4 + ri] && selLeft >= 0) {
      game.audio.play('se_tap', 0.05);
      hitStop = 0.14;
      var lCode = leftOrder[selLeft], rCode = rightOrder[ri];
      if (lCode === rCode) {
        matched[selLeft] = true; matched[4 + ri] = true;
        mood = 1;
        game.feedback.good(RIGHT_X, SLOT_Y[ri], { text: 'LINK', color: C.good });
        game.fx.burst((LEFT_X + RIGHT_X) / 2, (SLOT_Y[selLeft] + SLOT_Y[ri]) / 2, { color: C.gold, count: 16, speed: 340 });
        game.audio.play('se_success', 0.35);
        var mc = matchedCount();
        if (mc === Math.ceil(PAIRS / 2)) { game.fx.popup(mc + ' / ' + PAIRS, W / 2, H * 0.16, { color: C.gold, size: 38 }); game.audio.play('se_milestone', 0.4); }
        selLeft = -1;
        if (mc >= PAIRS) { ok = true; finished = true; finish(); }
      } else {
        mood = -1;
        timeLeft = Math.max(0, timeLeft - 1.8);
        shake = 0.2;
        game.feedback.bad(RIGHT_X, SLOT_Y[ri], { text: 'MISS' });
        game.audio.play('se_bad', 0.35);
        selLeft = -1;
      }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    tapPlay(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepPlay(dt) {
    timeLeft -= dt;
    if (mood !== 0) mood *= (1 - Math.min(1, dt * 3));
    if (timeLeft <= 0) { ok = false; finished = true; finish(); }
  }

  // ── ATTRACT ゴースト実演: 実ロジックで正解ペアを1組つなぐ→誤ペアを1組試す ──
  var demo = { t: 0, gx: LEFT_X, gy: H * 0.86, press: false, phase: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.4;
    if (cyc < dt || demo.t <= dt) { initGame(); demo.phase = 0; }
    var goodLeft = 0, goodRightIdx = -1;
    for (var i = 0; i < 4; i++) if (rightOrder[i] === leftOrder[goodLeft]) goodRightIdx = i;
    var wrongRightIdx = (goodRightIdx + 1) % 4;

    if (cyc < 1.0) {
      var t1 = { x: LEFT_X, y: SLOT_Y[goodLeft] };
      demo.gx += (t1.x - demo.gx) * Math.min(1, dt * 4.5);
      demo.gy += (t1.y - demo.gy) * Math.min(1, dt * 4.5);
      if (cyc > 0.7 && selLeft < 0) { selLeft = goodLeft; demo.press = true; } else if (cyc < 0.7) demo.press = false;
    } else if (cyc < 2.2) {
      var t2 = { x: RIGHT_X, y: SLOT_Y[goodRightIdx] };
      demo.gx += (t2.x - demo.gx) * Math.min(1, dt * 4.5);
      demo.gy += (t2.y - demo.gy) * Math.min(1, dt * 4.5);
      demo.press = cyc > 1.95 && cyc < 2.1;
      if (cyc - dt <= 1.95 && !matched[goodLeft]) {
        matched[goodLeft] = true; matched[4 + goodRightIdx] = true; mood = 1;
        game.feedback.good(RIGHT_X, SLOT_Y[goodRightIdx], { text: 'LINK', color: C.good });
        game.fx.burst((LEFT_X + RIGHT_X) / 2, SLOT_Y[goodRightIdx], { color: C.gold, count: 10, speed: 300 });
        selLeft = -1;
      }
    } else if (cyc < 3.0) {
      demo.press = false;
    } else if (cyc < 3.9) {
      var nextLeft = 1;
      var t3 = { x: LEFT_X, y: SLOT_Y[nextLeft] };
      demo.gx += (t3.x - demo.gx) * Math.min(1, dt * 4.5);
      demo.gy += (t3.y - demo.gy) * Math.min(1, dt * 4.5);
      if (cyc > 3.6 && selLeft < 0) { selLeft = nextLeft; demo.press = true; } else if (cyc < 3.6) demo.press = false;
    } else if (cyc < 5.0) {
      var t4 = { x: RIGHT_X, y: SLOT_Y[wrongRightIdx] };
      demo.gx += (t4.x - demo.gx) * Math.min(1, dt * 4.5);
      demo.gy += (t4.y - demo.gy) * Math.min(1, dt * 4.5);
      demo.press = cyc > 4.75 && cyc < 4.9;
      if (cyc - dt <= 4.75) { mood = -1; game.feedback.bad(RIGHT_X, SLOT_Y[wrongRightIdx], { text: 'MISS' }); selLeft = -1; }
    } else {
      demo.press = false;
    }
    if (mood !== 0) mood *= (1 - Math.min(1, dt * 2.5));
  }

  game.onUpdate(function(dt) {
    var elapsed = game.time.elapsed;
    var bob = Math.sin(elapsed * 1.9) * 5;

    if (state === S.ATTRACT) {
      if (leftOrder === undefined) initGame();
      roomBg(elapsed);
      game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(elapsed * 1.3));
      stepDemo(dt);
      game.draw.sprite(MONITOR, { '#': C.panelEdge, o: mood > 0.3 ? C.good : (mood < -0.3 ? C.bad : C.icon) }, W * 0.5, H * 0.16 + bob * 0.4, 16, { anchor: 'center' });
      for (var i = 0; i < 4; i++) { drawCard(LEFT_X, SLOT_Y[i], leftOrder[i], true, i, selLeft === i, matched[i]); drawCard(RIGHT_X, SLOT_Y[i], rightOrder[i], false, i, false, matched[4 + i]); }
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + ' / ' + PAIRS : '-'), W / 2, H * 0.79, 24, C.gold);
      if (Math.floor(elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      roomBg(elapsed);
      game.draw.sprite(MONITOR, { '#': C.panelEdge, o: ok ? C.good : C.bad }, W * 0.5, H * 0.16, 16, { anchor: 'center' });
      for (var j = 0; j < 4; j++) { drawCard(LEFT_X, SLOT_Y[j], leftOrder[j], true, j, false, matched[j]); drawCard(RIGHT_X, SLOT_Y[j], rightOrder[j], false, j, false, matched[4 + j]); }
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 48, ok ? C.good : C.bad);
      txt(matchedCount() + ' / ' + PAIRS, W / 2, H * 0.79, 30, C.white);
      if (!ok && matchedCount() === PAIRS - 1) txt('あと1組!', W / 2, H * 0.84, 24, C.gold);
      if (ok && (game.best === 0 || matchedCount() >= game.best)) txt('NEW RECORD', W / 2, H * 0.84, 24, C.gold);
      if (Math.floor(elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var mc = matchedCount();
        if (ok) game.end.success(mc, { matched: mc, total: PAIRS }); else game.end.failure({ matched: mc, total: PAIRS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepPlay(dt);
    }
    if (shake > 0) shake -= dt;

    roomBg(elapsed);
    game.draw.sprite(MONITOR, { '#': C.panelEdge, o: mood > 0.3 ? C.good : (mood < -0.3 ? C.bad : C.icon) }, W * 0.5, H * 0.16 + bob * 0.4, 16, { anchor: 'center' });
    for (var k = 0; k < 4; k++) { drawCard(LEFT_X, SLOT_Y[k], leftOrder[k], true, k, selLeft === k, matched[k]); drawCard(RIGHT_X, SLOT_Y[k], rightOrder[k], false, k, false, matched[4 + k]); }

    txt(matchedCount() + ' / ' + PAIRS, W / 2, H * 0.79, 30, C.white);
    game.draw.rect(60, H * 0.85, W - 120, 16, C.panelEdge, 0.5);
    game.draw.rect(60, H * 0.85, (W - 120) * Math.max(0, timeLeft / MAX_TIME), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.2], ['D4', 0.2], ['F4', 0.2], ['G4', 0.4]], { tempo: 128, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

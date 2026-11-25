// I-GBA-0009-tile-inspector.js
// タイルインスペクター — ずらりと並んだ検品タイルの中から、模様が1つだけ違うタイルを見つけて押す
// 操作: 盤面に並ぶ同じ模様のタイルの中から、1つだけ違う模様のタイルを見つけてタップする
// 終わり: 規定回数(3回)続けて正しいタイルを見つければ成功。外すたびに持ち時間が減り、0になれば失敗
// @mechanic: spot
// @theme: tile_inspection_counter
// 世界観: タイル工房の検品台。検品員が並んだ量産タイルの中から模様のズレた1枚を見抜き続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 見抜いた枚数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 背景2〜3層で奥行き、大きめキャラ、暗色輪郭+ハイライト。もっとも汎用
  var C = {
    bg: '#2c3e6b', bg2: '#405088', far: '#5a6ba8', tile: '#e8dcc4', tileEdge: '#b8a888',
    odd: '#ff8a4a', good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#f4f0e6', ink: '#14182c',
  };

  var GAME_TITLE = 'TILE INSPECTOR';
  var ROUNDS = 3, MAX_TIME = 12;
  var COLS = 4, ROWS = 3;
  var GX0 = W * 0.14, GY0 = H * 0.30, CELL = W * 0.18;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var found, timeLeft, oddIdx, done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var INSPECTOR = ['.##.', '####', '.##.', '#..#'];
  var PATTERN_A = ['##.#', '.##.', '#.##'];
  var PATTERN_B = ['#.##', '.##.', '##.#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [0.6, C.bg2], [1, C.far]]);
    for (var i = 0; i < 4; i++) game.draw.rect(0, H * (0.14 + i * 0.02), W, 4, '#ffffff10');
    game.draw.sprite(INSPECTOR, { '#': C.white }, W * 0.5, H * 0.14, 22, { anchor: 'center' });
  }

  function slotPos(i) {
    var c = i % COLS, r = Math.floor(i / COLS);
    return { x: GX0 + c * CELL + CELL / 2, y: GY0 + r * CELL + CELL / 2 };
  }

  function newRound() {
    oddIdx = Math.floor(game.random(0, COLS * ROWS));
  }

  function initGame() {
    found = 0; timeLeft = MAX_TIME; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newRound();
  }

  function drawGrid(hi) {
    for (var i = 0; i < COLS * ROWS; i++) {
      var p = slotPos(i);
      var isOdd = i === oddIdx;
      game.draw.rect(p.x - CELL * 0.42, p.y - CELL * 0.42, CELL * 0.84, CELL * 0.84, C.tileEdge);
      game.draw.rect(p.x - CELL * 0.38, p.y - CELL * 0.38, CELL * 0.76, CELL * 0.76, C.tile);
      game.draw.sprite(isOdd ? PATTERN_B : PATTERN_A, { '#': isOdd ? C.odd : C.tileEdge }, p.x, p.y, 12, { anchor: 'center' });
      if (hi && isOdd) {
        var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
        if (blink) game.draw.rect(p.x - CELL * 0.44, p.y - CELL * 0.44, CELL * 0.88, CELL * 0.88, C.gold, 0.5);
      }
    }
  }

  function pickSlot(px, py) {
    var best = -1, bd = 1e9;
    for (var i = 0; i < COLS * ROWS; i++) {
      var p = slotPos(i);
      var d = Math.hypot(px - p.x, py - p.y);
      if (d < bd) { bd = d; best = i; }
    }
    return bd < CELL * 0.5 ? best : -1;
  }

  function resolveTap(x, y) {
    if (done || ready > 0 || finished) return;
    var idx = pickSlot(x, y);
    if (idx < 0) return;
    game.audio.play('se_tap', 0.05);
    var p = slotPos(idx);
    hitStop = 0.15;
    if (idx === oddIdx) {
      found++;
      game.feedback.good(p.x, p.y, { text: 'HIT', color: C.good });
      game.fx.burst(p.x, p.y, { color: C.gold, count: 14, speed: 320 });
      game.audio.play('se_success', 0.35);
      if (found === Math.ceil(ROUNDS / 2)) { game.fx.popup(found + ' / ' + ROUNDS, W / 2, H * 0.2, { color: C.gold, size: 36 }); game.audio.play('se_milestone', 0.3); }
      if (found >= ROUNDS) { ok = true; finished = true; finish(); } else newRound();
    } else {
      timeLeft = Math.max(0, timeLeft - 3);
      shake = 0.2;
      game.feedback.bad(p.x, p.y, { text: 'MISS' });
      game.audio.play('se_bad', 0.3);
      if (timeLeft <= 0) { ok = false; finished = true; finish(); }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) resolveTap(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.9, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { oddIdx = 5; }
    var p = slotPos(oddIdx);
    if (cyc < 2.2) {
      demo.gx += (p.x - demo.gx) * Math.min(1, dt * 3.2);
      demo.gy += (p.y - demo.gy) * Math.min(1, dt * 3.2);
      demo.press = false;
    } else if (cyc < 2.35 && !demo.picked) {
      demo.picked = true; demo.press = true;
      game.feedback.good(p.x, p.y, { text: 'HIT', color: C.good });
      game.audio.play('se_good', 0.25);
    } else if (cyc > 2.6) {
      demo.press = false;
    }
    if (cyc < 0.05) demo.picked = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawGrid(true);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.06, 38, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + ' / ' + ROUNDS : '-'), W / 2, H * 0.83, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawGrid(true);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 46, ok ? C.good : C.bad);
      txt(found + ' / ' + ROUNDS, W / 2, H * 0.83, 28, C.gold);
      if (!ok && found === ROUNDS - 1) txt('あと1枚!', W / 2, H * 0.87, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(found, { found: found, total: ROUNDS });
        else game.end.failure({ found: found, total: ROUNDS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) { ok = false; finished = true; hitStop = 0.25; game.feedback.bad(W * 0.5, GY0, { text: 'TIME UP' }); shake = 0.2; game.audio.play('se_bad', 0.4); finish(); }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawGrid(false);

    txt(found + ' / ' + ROUNDS, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, H * 0.84, W - 120, 16, C.ink, 0.3);
    game.draw.rect(60, H * 0.84, (W - 120) * Math.max(0, timeLeft / MAX_TIME), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.20, 50, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['B4', 0.2], ['D5', 0.2], ['F5', 0.2], ['B5', 0.4]], { tempo: 145, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

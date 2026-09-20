// I-GBA-0046-rune-stone-recall.js
// ルーンストーンリコール — 一瞬だけ光る石版の順番を覚え、同じ順になぞって封印を解く
// 操作: 光った順を覚え、5つの石版を記憶した順番でタップしていく
// 終わり: 全て正しい順でタップできれば成功。順番を間違えるか制限時間切れで失敗
// @mechanic: memory_sequence
// @theme: sealed_shrine_runestones
// 世界観: 森の奥の封印された祠。台座に並ぶ5つの石版が一瞬だけ光り、見習い巫女がその順を記憶してなぞり封印を解く
// 残るもの: 正誤(CLEAR/GAME OVER) + なぞれた個数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 多色高彩度、背景2〜3層で奥行き、暗色輪郭+ハイライト
  var C = {
    sky1: '#1a2b4a', sky2: '#0d1730', hill: '#152040', stone: '#5a6b8a', stoneEdge: '#2c3550',
    rune: '#ffe066', accent: '#66d9ff', good: '#5cff9a', bad: '#ff5c5c', gold: '#ffd23f',
    white: '#f4f7ff', ink: '#0a0e1a',
  };

  var GAME_TITLE = 'RUNE RECALL';
  var N = 5;
  var SHOW_GAP = 0.6;
  var INPUT_TIME = 8;
  var MAX_TIME = N * SHOW_GAP + INPUT_TIME; // memory_sequence override 10-20s
  var NEEDED = N;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var CY = H * 0.44;
  function tileX(i) { return W * (0.18 + 0.16 * i); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RUNES = [
    ['..#..', '.###.', '#####', '..#..', '..#..'],
    ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
    ['#####', '#....', '###..', '#....', '#####'],
    ['.#.#.', '.#.#.', '#####', '..#..', '.###.'],
    ['##.##', '#.#.#', '#...#', '#...#', '#...#'],
  ];
  var MIKO = ['.###.', '##.##', '.###.', '#.#.#', '.#.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.sky1], [1, C.sky2]]);
    game.draw.rect(0, H * 0.55, W, H * 0.10, C.hill, 0.5);
    game.draw.sprite(MIKO, { '#': C.accent }, W * 0.5, H * 0.14, 10, { anchor: 'center' });
  }

  var seq, phase, showIdx, showT, inputIdx, timeLeft, milestoneShown;
  var done, endWait, finished;
  var ready, hitStop, shake, litTile, wrongTile;

  function shuffledSeq(demoMode) {
    var arr = [0, 1, 2, 3, 4];
    if (demoMode) return [1, 3, 0, 4, 2];
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(game.random(0, i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function initGame() {
    seq = shuffledSeq(false);
    phase = 'show'; showIdx = -1; showT = 0; inputIdx = 0; timeLeft = MAX_TIME; milestoneShown = false;
    litTile = -1; wrongTile = -1;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function tryTap(x, y) {
    if (state !== S.PLAYING || ready > 0 || hitStop > 0 || finished || phase !== 'input') return;
    var best = -1, bestD = 1e9;
    for (var i = 0; i < N; i++) {
      var d = Math.hypot(tileX(i) - x, CY - y);
      if (d < 80 && d < bestD) { bestD = d; best = i; }
    }
    if (best < 0) return;
    game.audio.play('se_tap', 0.2);
    if (best === seq[inputIdx]) {
      litTile = best;
      game.feedback.good(tileX(best), CY, { text: inputIdx + 1 >= N ? 'CLEAR' : 'GOOD', color: C.good });
      inputIdx++;
      if (!milestoneShown && inputIdx >= Math.ceil(N / 2)) {
        milestoneShown = true;
        game.fx.popup('HALFWAY!', W / 2, H * 0.28, { color: C.gold, size: 36 });
        game.audio.play('se_milestone', 0.4);
      }
      if (inputIdx >= N) { ok = true; finished = true; hitStop = 0.25; finish(); }
      else hitStop = 0.1;
    } else {
      wrongTile = best; litTile = seq[inputIdx];
      game.feedback.bad(tileX(best), CY, { text: 'MISS' });
      shake = 0.3;
      ok = false; finished = true; hitStop = 0.4;
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) tryTap(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawTiles() {
    for (var i = 0; i < N; i++) {
      var lit = (litTile === i && hitStop > 0) || (phase === 'show' && showIdx === i);
      var wrong = wrongTile === i && hitStop > 0;
      var col = wrong ? C.bad : (lit ? C.rune : C.stone);
      game.draw.rect(tileX(i) - 60, CY - 60, 120, 120, C.stoneEdge);
      game.draw.rect(tileX(i) - 52, CY - 52, 104, 104, col, lit || wrong ? 1 : 0.85);
      game.draw.sprite(RUNES[i], { '#': lit || wrong ? C.ink : C.rune }, tileX(i), CY, 12, { anchor: 'center' });
    }
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.9, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.5;
    if (cyc < dt || demo.t <= dt) {
      seq = shuffledSeq(true); phase = 'show'; showIdx = -1; showT = 0; inputIdx = 0; litTile = -1; wrongTile = -1;
      demo.gx = W * 0.5; demo.gy = H * 0.9; demo.press = false;
    }
    if (phase === 'show') {
      showT += dt;
      var idx = Math.floor(showT / SHOW_GAP);
      showIdx = idx < N ? seq[idx] : -1;
      if (idx >= N) { phase = 'input'; showIdx = -1; }
    } else if (phase === 'input' && inputIdx < N) {
      var stepDur = 0.55;
      var into = (cyc - N * SHOW_GAP) % stepDur;
      var stepIdx = Math.floor((cyc - N * SHOW_GAP) / stepDur);
      if (stepIdx === inputIdx && stepIdx < N) {
        var tx = tileX(seq[inputIdx]);
        var t = Math.min(1, into / (stepDur * 0.8));
        demo.gx = W * 0.5 + (tx - W * 0.5) * t;
        demo.gy = H * 0.9 + (CY - H * 0.9) * t;
        demo.press = t >= 1;
        if (t >= 1) {
          litTile = seq[inputIdx];
          game.feedback.good(tx, CY, { text: 'GOOD', color: C.good });
          game.audio.play('se_tap', 0.15);
          inputIdx++;
        }
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!seq) initGame();
      bg();
      stepDemo(dt);
      drawTiles();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.095, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 36, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.96, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg(); drawTiles();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 46, ok ? C.good : C.bad);
      txt(inputIdx + ' / ' + N, W / 2, H * 0.11, 28, C.gold);
      if (!ok) txt('あと' + (N - inputIdx) + '個!', W / 2, H * 0.155, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(inputIdx, { correct: inputIdx, total: N });
        else game.end.failure({ correct: inputIdx, total: N });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (phase === 'show') {
        showT += dt;
        var idx = Math.floor(showT / SHOW_GAP);
        if (idx !== showIdx && idx < N) { showIdx = idx; game.audio.play('se_tap', 0.3); }
        if (idx >= N) { phase = 'input'; showIdx = -1; }
      } else {
        timeLeft -= dt;
        if (timeLeft <= 0) {
          timeLeft = 0; wrongTile = -1; litTile = seq[inputIdx];
          game.feedback.bad(tileX(seq[inputIdx]), CY, { text: 'MISS' });
          shake = 0.3; ok = false; finished = true; hitStop = 0.4; finish();
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawTiles();

    txt(inputIdx + ' / ' + N, W / 2, H * 0.06, 28, C.white);
    if (phase === 'input') {
      game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
      game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / INPUT_TIME), 16, C.accent);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.66, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.4], ['C4', 0.4], ['E4', 0.4], ['A4', 0.6]], { tempo: 96, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

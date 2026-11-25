// K-GBA-0024-festival-routine-copy.js
// 祭り振り写し — 舞台で光る4つの型を見た順に、消灯後に同じ順でタップしてなぞる
// 操作: 光った型の順番を覚え、光が消えたら同じ順に型をタップする。ラウンドごとに型数が増え速くなる
// 終わり: 3ラウンド連続で正しく再現できれば成功。1回でも順番を外せば失敗
// @mechanic: memory_sequence
// @theme: festival_routine_copy
// 世界観: 夜祭りの舞台に立つ踊り手見習いが、師の振り付けの光る型を目で覚え、消灯後に同じ順でなぞり返す稽古
// 残るもの: 正誤(CLEAR/GAME OVER) + クリアしたラウンド数
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: 単色フラット、太い角丸長方形、影なし
  var C = {
    bg: '#1b1f3a', bg2: '#262c52', panel: '#323a68', panelLit: '#ffb84d',
    dancer: '#ff6f91', good: '#4de0a0', bad: '#ff5468', gold: '#ffd54d', white: '#f4f2ff', ink: '#0c0e1e',
  };

  var GAME_TITLE = 'ROUTINE COPY';
  var TOTAL_ROUNDS = 3;
  var BASE_LEN = 3;
  var POS = [
    { x: W * 0.28, y: H * 0.36 }, { x: W * 0.72, y: H * 0.36 },
    { x: W * 0.28, y: H * 0.56 }, { x: W * 0.72, y: H * 0.56 },
  ];
  var CELL_R = 110;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var round, seq, showIdx, showT, inputIdx, lit, phase; // phase: 'show'|'gap'|'input'
  var done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DANCER = ['..##..', '.####.', '..##..', '#.##.#', '.#..#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) game.draw.rect(0, i * (H / 6), W, 2, '#ffffff05');
    game.draw.sprite(DANCER, { '#': C.dancer }, W * 0.5, H * 0.78, 20, { anchor: 'center' });
  }

  function makeSeq(len) {
    var s = [];
    for (var i = 0; i < len; i++) s.push(Math.floor(game.random(0, 4)));
    return s;
  }

  function startRound() {
    var len = BASE_LEN + round;
    seq = makeSeq(len);
    showIdx = 0; showT = 0.55; inputIdx = 0; lit = -1; phase = 'show';
  }

  function initGame() {
    round = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    startRound();
  }

  function cellAt(x, y) {
    for (var i = 0; i < POS.length; i++) {
      if (Math.hypot(x - POS[i].x, y - POS[i].y) <= CELL_R) return i;
    }
    return -1;
  }

  function onTapCell(x, y) {
    if (phase !== 'input' || ready > 0 || done || finished) return;
    var c = cellAt(x, y);
    if (c < 0) return;
    lit = c; showT = 0.18;
    if (c === seq[inputIdx]) {
      game.feedback.good(POS[c].x, POS[c].y, { text: '', sound: 'se_tap', color: C.good });
      game.audio.play('se_tap', 0.25);
      inputIdx++;
      if (inputIdx >= seq.length) {
        game.fx.popup('ROUND ' + (round + 1) + ' CLEAR!', W * 0.5, H * 0.24, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.4);
        round++;
        if (round >= TOTAL_ROUNDS) { ok = true; finished = true; finish(); return; }
        phase = 'gap'; showT = 0.6;
      }
    } else {
      hitStop = 0.35;
      game.feedback.bad(POS[c].x, POS[c].y, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) onTapCell(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepPlay(dt) {
    if (phase === 'show') {
      showT -= dt;
      if (showT <= 0) {
        lit = seq[showIdx];
        game.audio.play('se_tap', 0.3);
        showIdx++;
        showT = Math.max(0.28, 0.5 - round * 0.05);
        if (showIdx >= seq.length) { phase = 'input'; inputIdx = 0; lit = -1; showT = 0; }
      }
    } else if (phase === 'gap') {
      showT -= dt;
      if (showT <= 0) startRound();
    }
  }

  function drawCells() {
    for (var i = 0; i < POS.length; i++) {
      var isLit = lit === i;
      game.draw.rect(POS[i].x - CELL_R, POS[i].y - CELL_R, CELL_R * 2, CELL_R * 2, isLit ? C.panelLit : C.panel);
    }
  }

  var demo = { t: 0, gx: POS[0].x, gy: POS[0].y, press: false, dRound: 0, dSeq: null, dShow: 0, dIdx: 0, dPhase: 'show' };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.4;
    if (cyc < dt || demo.t <= dt) {
      demo.dSeq = [0, 1, 3]; demo.dIdx = 0; demo.dShow = 0.5; demo.dPhase = 'show'; lit = -1; demo.press = false;
    }
    demo.dShow -= dt;
    if (demo.dPhase === 'show') {
      if (demo.dShow <= 0) {
        if (demo.dIdx < demo.dSeq.length) {
          lit = demo.dSeq[demo.dIdx];
          game.audio.play('se_tap', 0.15);
          demo.dIdx++; demo.dShow = 0.48;
        } else {
          demo.dPhase = 'gap'; demo.dShow = 0.5; lit = -1; demo.dIdx = 0;
        }
      }
    } else if (demo.dPhase === 'gap') {
      if (demo.dShow <= 0) { demo.dPhase = 'input'; demo.dShow = 0.55; }
    } else if (demo.dPhase === 'input') {
      if (demo.dShow <= 0) {
        var c = demo.dSeq[demo.dIdx];
        demo.gx = POS[c].x; demo.gy = POS[c].y; demo.press = true;
        lit = c;
        game.audio.play('se_tap', 0.15);
        demo.dIdx++; demo.dShow = 0.5;
        if (demo.dIdx >= demo.dSeq.length) { demo.dPhase = 'done'; demo.dShow = 0.6; }
      } else if (demo.dShow < 0.25) demo.press = false;
    } else if (demo.dPhase === 'done') {
      if (demo.dShow <= 0) demo.dPhase = 'show';
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawCells();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawCells();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(round + ' / ' + TOTAL_ROUNDS, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL_ROUNDS - round) + '!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(round, { round: round, total: TOTAL_ROUNDS }); else game.end.failure({ round: round, total: TOTAL_ROUNDS });
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

    bg();
    drawCells();

    txt(round + ' / ' + TOTAL_ROUNDS, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (round / TOTAL_ROUNDS), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.83, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.4], ['B4', 0.4], ['D5', 0.4], ['G5', 0.8]], { tempo: 125, wave: 'sine', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

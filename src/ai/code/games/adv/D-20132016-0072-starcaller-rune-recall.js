// D-20132016-0072-starcaller-rune-recall.js
// スターコーラー・ルーンリコール — 儀式で授かった勝ち呪文の詠唱順を記憶し、同じ順にルーンへ触れて放つ
// 操作: 光る順にルーンが点灯するのを見て覚え、同じ順番でルーンパッドをタップする
// 終わり: 全ルーンを正しい順で唱えきれば成功。1つでも順番を外せば失敗
// @mechanic: memory_sequence
// @theme: starcaller_rune_recall
// 世界観: 星読みの塔に上がった見習いが、師から授かった一度きりの儀式で、勝利をもたらす呪文の詠唱順を記憶し唱えて敵を退ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく唱えたルーン数
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 多色+光、パララックス、細かいアニメ
  var C = {
    bg: '#1a1030', bg2: '#3a1c5a', star: '#ffe9b0',
    fire: '#ff6a3a', water: '#3a9aff', wind: '#4affa0', arcane: '#d060ff',
    ally: '#e8d8ff', gold: '#ffd400', good: '#4dff8a', bad: '#ff4d5e',
    white: '#f5eaff', ink: '#0a0616',
  };
  var RUNES = ['fire', 'water', 'wind', 'arcane'];
  var RUNE_COLOR = { fire: C.fire, water: C.water, wind: C.wind, arcane: C.arcane };
  var SEQ_LEN = 4;

  var GAME_TITLE = 'RUNE RECALL';
  var CX = W * 0.5;
  var SHOW_ON = 0.42, SHOW_GAP = 0.18;
  var RECALL_TIMEOUT = 2.6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CASTER_FRAMES = [
    ['..##..', '.####.', '#.##.#', '.####.', '.#..#.'],
    ['..##..', '.####.', '#.##.#', '.####.', '##..##'],
  ];

  var seq, phase, showIdx, showT, recallIdx, flashPad, flashT, flashGood, tapT;
  var finished, done, endWait, hitStop, shake, ready;

  function padX(i) { return W * (0.18 + i * 0.22); }

  function newSeq() {
    seq = [];
    for (var i = 0; i < SEQ_LEN; i++) seq.push(RUNES[Math.floor(game.random(0, 4))]);
    phase = 'show'; showIdx = -1; showT = 0; recallIdx = 0; flashPad = -1; flashT = 0; tapT = 0;
  }

  function initGame() {
    finished = false; done = false; endWait = 0; hitStop = 0; shake = 0; ready = 0.8;
    newSeq();
  }

  function bg() {
    var elapsed = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 20; i++) {
      var sx = (i * 137) % W, sy = (i * 97) % (H * 0.5);
      game.draw.circle(sx, sy, 2 + (i % 3), C.star, 0.4 + 0.2 * Math.sin(elapsed * 2 + i));
    }
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(elapsed * 1.3));
  }

  function drawCaster() {
    var bobY = Math.sin(game.time.elapsed * 2.3) * 5;
    var swayX = Math.cos(game.time.elapsed * 1.6) * 4;
    game.draw.sprite(CASTER_FRAMES[Math.floor(game.time.elapsed * 3) % 2], { '#': C.ally }, CX + swayX, H * 0.38 + bobY, 17, { anchor: 'center' });
  }

  function drawPads(lit) {
    var py = H * 0.78, r = 78;
    for (var i = 0; i < RUNES.length; i++) {
      var x = padX(i), on = (lit === i);
      var flashed = (flashPad === i);
      var col = RUNE_COLOR[RUNES[i]];
      game.draw.circle(x, py, r, C.ink, 0.5);
      game.draw.circle(x, py, r * (on ? 0.9 : 0.7), col, on ? 1 : (flashed ? (flashGood ? 0.9 : 0.5) : 0.55));
      if (flashed) game.draw.circle(x, py, r * 1.05, flashGood ? C.good : C.bad, 0.5);
    }
  }

  function drawProgress() {
    var gx = W * 0.22, gy = H * 0.62, gap = (W * 0.56) / (SEQ_LEN - 1);
    for (var i = 0; i < SEQ_LEN; i++) {
      var filled = i < recallIdx;
      game.draw.circle(gx + gap * i, gy, 14, filled ? C.gold : C.ink, filled ? 1 : 0.5);
    }
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function tapPad(idx) {
    if (phase !== 'recall' || finished) return;
    flashPad = idx; flashT = 0.3; tapT = 0;
    var correct = RUNES[idx] === seq[recallIdx];
    flashGood = correct;
    hitStop = correct ? 0.1 : 0.35;
    if (correct) {
      recallIdx++;
      game.feedback.good(padX(idx), H * 0.78, { text: 'GOOD', color: C.good });
      game.audio.play('se_correct', 0.4);
      if (recallIdx === Math.ceil(SEQ_LEN / 2)) { game.fx.popup('あと' + (SEQ_LEN - recallIdx) + '!', CX, H * 0.5, { color: C.gold, size: 30 }); game.audio.play('se_milestone', 0.3); }
      if (recallIdx >= SEQ_LEN) { ok = true; finished = true; game.fx.burst(CX, H * 0.62, { color: C.gold, count: 22, speed: 420 }); finish(); }
    } else {
      ok = false; finished = true;
      game.feedback.bad(padX(idx), H * 0.78, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_wrong', 0.4);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || ready > 0 || finished || phase !== 'recall') return;
    game.audio.play('se_tap', 0.1);
    var best = -1, bestD = 1e9;
    for (var i = 0; i < RUNES.length; i++) {
      var d = Math.hypot(x - padX(i), y - H * 0.78);
      if (d < bestD) { bestD = d; best = i; }
    }
    if (bestD < 100) tapPad(best);
  });

  var demo = { t: 0, gx: CX, gy: H * 0.78, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.4;
    if (cyc < dt || demo.t <= dt) { newSeq(); }
    var showDur = SEQ_LEN * (SHOW_ON + SHOW_GAP);
    if (cyc < showDur) {
      phase = 'show';
      var idxF = cyc / (SHOW_ON + SHOW_GAP);
      showIdx = (idxF - Math.floor(idxF)) < (SHOW_ON / (SHOW_ON + SHOW_GAP)) ? Math.floor(idxF) : -1;
      demo.press = false;
    } else if (cyc < showDur + 5.2) {
      phase = 'recall';
      showIdx = -1;
      var t2 = cyc - showDur;
      var step = Math.floor(t2 / 1.15);
      if (step < SEQ_LEN && step === recallIdx && (t2 % 1.15) > 0.8 && flashPad !== step) {
        demo.gx = padX(seq[recallIdx]); demo.gy = H * 0.78; demo.press = true;
        tapPad(RUNES.indexOf(seq[recallIdx]));
      } else if ((t2 % 1.15) < 0.8) {
        demo.press = false;
      }
    }
    if (flashT > 0) flashT -= dt; else flashPad = -1;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (seq === undefined) initGame();
      bg();
      stepDemo(dt);
      drawCaster();
      drawPads(showIdx);
      drawProgress();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawCaster();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(recallIdx + ' / ' + SEQ_LEN, W / 2, H * 0.14, 32, C.gold);
      if (!ok && recallIdx >= SEQ_LEN - 1) txt('あと1つ!', W / 2, H * 0.19, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { recalled: recallIdx, total: SEQ_LEN };
        if (ok) game.end.success(recallIdx, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (phase === 'show') {
        showT += dt;
        var cycT = SHOW_ON + SHOW_GAP;
        var idxF = showT / cycT;
        var i = Math.floor(idxF);
        if (i >= SEQ_LEN) { phase = 'recall'; showIdx = -1; tapT = 0; }
        else {
          showIdx = ((idxF - i) < (SHOW_ON / cycT)) ? i : -1;
          if (showIdx >= 0 && showIdx !== flashPad) { flashPad = -1; }
        }
      } else if (phase === 'recall') {
        tapT += dt;
        if (tapT >= RECALL_TIMEOUT) {
          ok = false; finished = true;
          game.feedback.bad(padX(recallIdx < RUNES.length ? recallIdx : 0), H * 0.78, { text: 'MISS' });
          shake = 0.3;
          game.audio.play('se_wrong', 0.4);
          finish();
        }
      }
    }
    if (shake > 0) shake -= dt;
    if (flashT > 0) flashT -= dt; else flashPad = -1;

    bg();
    drawCaster();
    if (!finished) drawPads(showIdx); else drawPads(-1);
    drawProgress();
    txt(recallIdx + ' / ' + SEQ_LEN, W / 2, H * 0.06, 32, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.4], ['G4', 0.4], ['B4', 0.4], ['E5', 0.8]], { tempo: 96, wave: 'sine', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

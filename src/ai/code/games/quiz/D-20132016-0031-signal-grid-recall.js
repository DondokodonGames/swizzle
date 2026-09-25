// D-20132016-0031-signal-grid-recall.js
// シグナルグリッド・リコール — 光った黒信号灯の順番を覚え、同じ順にタップして打ち返す
// 操作: 並んだ信号灯のうち黒だけが順に光る。覚えて、光った順どおりにタップして打ち返す
// 終わり: 4灯すべて正しい順で打ち返せば成功。白信号に触れる/順番を外す/反応が遅れると失敗
// @mechanic: memory_sequence
// @theme: night_signal_grid_recall
// 世界観: 山あいの夜間通信基地。固定された信号灯のうち黒だけが順に光る暗号を、寸分違わず打ち返す通信士
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく打ち返せた灯数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 多色・高彩度、背景2〜3層で奥行き
  var C = {
    sky: '#1a2450', sky2: '#0e1230', hillFar: '#232f66', hillNear: '#151c40',
    cellOff: '#2a3560', cellEdge: '#4a5890', cellWhite: '#e8ecff',
    good: '#4dffb0', bad: '#ff4d5e', gold: '#ffd400', white: '#f0f2ff', ink: '#060814',
    lit: '#ffcf4d',
  };

  var GAME_TITLE = 'SIGNAL RECALL';
  var SEQ_LEN = 4, INPUT_TIMEOUT = 2.4;
  var COLS = [W * 0.26, W * 0.5, W * 0.74];
  var ROWS = [H * 0.40, H * 0.56];
  var CELLS = []; // {x,y,color:'B'|'W'}

  function buildGrid() {
    CELLS = [];
    for (var r = 0; r < 2; r++) for (var c = 0; c < 3; c++) CELLS.push({ x: COLS[c], y: ROWS[r], color: 'B' });
    var wIdx = Math.floor(Math.random() * CELLS.length);
    CELLS[wIdx].color = 'W';
  }

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var seq, phase, phaseT, showIdx, inputIdx, correct, litCell, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var TOWER = ['..#..', '.###.', '#####', '..#..'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.sky2], [0.5, C.sky], [1, C.sky2]]);
    game.draw.rect(0, H * 0.30, W, H * 0.10, C.hillFar, 0.5);
    game.draw.rect(0, H * 0.34, W, H * 0.08, C.hillNear, 0.5);
    for (var i = 0; i < 20; i++) { var sx = (i * 233 + 41) % W, sy = (i * 97 + 20) % (H * 0.28); game.draw.rect(sx, sy, 3, 3, '#ffffff', 0.3); }
  }

  function buildSeq() {
    var blackIdx = [];
    for (var i = 0; i < CELLS.length; i++) if (CELLS[i].color === 'B') blackIdx.push(i);
    for (var j = blackIdx.length - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var t = blackIdx[j]; blackIdx[j] = blackIdx[k]; blackIdx[k] = t; }
    return blackIdx.slice(0, SEQ_LEN);
  }

  function initGame() {
    buildGrid(); seq = buildSeq();
    phase = 'show'; showIdx = -1; phaseT = 0.5; inputIdx = 0; correct = 0; litCell = -1;
    finished = false; done = false; endWait = 0;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function drawCell(i) {
    var cell = CELLS[i];
    var isLit = litCell === i;
    var baseCol = cell.color === 'W' ? C.cellWhite : C.cellOff;
    var col = isLit ? C.lit : baseCol;
    game.draw.rect(cell.x - 84, cell.y - 64, 168, 128, C.cellEdge);
    game.draw.rect(cell.x - 76, cell.y - 56, 152, 112, col);
    if (isLit) game.draw.circle(cell.x, cell.y, 100, C.lit, 0.25);
  }

  function pickCell(px, py) {
    for (var i = 0; i < CELLS.length; i++) {
      if (Math.abs(px - CELLS[i].x) < 84 && Math.abs(py - CELLS[i].y) < 64) return i;
    }
    return -1;
  }

  function failNow(cx, cy) {
    hitStop = 0.3;
    game.feedback.bad(cx, cy, { text: 'MISS' });
    shake = 0.3;
    game.audio.play('se_bad', 0.4);
    ok = false; finished = true; finish();
  }

  function tapPlay(x, y) {
    if (done || ready > 0 || hitStop > 0 || finished || phase !== 'input') return;
    var idx = pickCell(x, y);
    if (idx < 0) return;
    game.audio.play('se_tap', 0.06);
    litCell = idx;
    if (CELLS[idx].color === 'W') { failNow(CELLS[idx].x, CELLS[idx].y); return; }
    if (idx === seq[inputIdx]) {
      correct++; inputIdx++; phaseT = INPUT_TIMEOUT; hitStop = 0.1;
      game.feedback.good(CELLS[idx].x, CELLS[idx].y, { text: 'GOOD', color: C.good });
      game.fx.burst(CELLS[idx].x, CELLS[idx].y, { color: C.gold, count: 14, speed: 320 });
      game.audio.play('se_good', 0.35);
      if (correct === Math.ceil(SEQ_LEN / 2)) { game.fx.popup('HALFWAY!', W / 2, H * 0.16, { color: C.gold, size: 36 }); game.audio.play('se_milestone', 0.4); }
      if (correct >= SEQ_LEN) { ok = true; finished = true; finish(); }
    } else {
      failNow(CELLS[idx].x, CELLS[idx].y);
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
    phaseT -= dt;
    if (phase === 'show') {
      if (phaseT <= 0) {
        showIdx++;
        if (showIdx >= SEQ_LEN) { phase = 'input'; litCell = -1; phaseT = INPUT_TIMEOUT; }
        else { litCell = seq[showIdx]; phaseT = 0.55; game.audio.tone(320 + showIdx * 60, 0.14, { wave: 'triangle', volume: 0.15 }); }
      }
    } else if (phase === 'input') {
      if (phaseT <= 0) { failNow(CELLS[seq[inputIdx]].x, CELLS[seq[inputIdx]].y); }
    }
  }

  // ── ATTRACT ゴースト実演: 実ロジックで一巡見せてから正しくタップ→次周で誤タップ例 ──
  var demo = { t: 0, gx: W * 0.5, gy: H * 0.90, press: false, step: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.2;
    if (cyc < dt || demo.t <= dt) { initGame(); demo.step = 0; }
    stepPlay(dt);
    if (phase === 'input' && !finished) {
      var wantWrong = Math.floor(demo.t / 6.2) % 3 === 2 && demo.step === inputIdx;
      var targetIdx = wantWrong ? (seq[inputIdx] + 1) % CELLS.length : seq[inputIdx];
      var c = CELLS[targetIdx];
      demo.gx += (c.x - demo.gx) * Math.min(1, dt * 5);
      demo.gy += (c.y - demo.gy) * Math.min(1, dt * 5);
      if (Math.abs(demo.gx - c.x) < 8 && demo.step === inputIdx) {
        demo.press = true; demo.step++;
        litCell = targetIdx;
        if (targetIdx === seq[inputIdx] && CELLS[targetIdx].color === 'B') {
          correct++; inputIdx++; phaseT = INPUT_TIMEOUT;
          game.feedback.good(c.x, c.y, { text: 'GOOD', color: C.good });
          game.fx.burst(c.x, c.y, { color: C.gold, count: 10, speed: 300 });
        } else {
          game.feedback.bad(c.x, c.y, { text: 'MISS' });
          finished = true;
        }
      } else demo.press = false;
    } else if (phase === 'show') {
      demo.gx += ((W * 0.5) - demo.gx) * Math.min(1, dt * 3);
      demo.gy += ((H * 0.90) - demo.gy) * Math.min(1, dt * 3);
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    var elapsed = game.time.elapsed;
    var bob = Math.sin(elapsed * 1.9) * 5;

    if (state === S.ATTRACT) {
      if (seq === undefined) initGame();
      bg();
      game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(elapsed * 1.3));
      stepDemo(dt);
      game.draw.sprite(TOWER, { '#': C.cellEdge }, W * 0.5, H * 0.20 + bob * 0.3, 20, { anchor: 'center' });
      for (var i = 0; i < CELLS.length; i++) drawCell(i);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 38, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + ' / ' + SEQ_LEN : '-'), W / 2, H * 0.68, 22, C.gold);
      if (Math.floor(elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 32, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 24, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      game.draw.sprite(TOWER, { '#': C.cellEdge }, W * 0.5, H * 0.20, 20, { anchor: 'center' });
      for (var j = 0; j < CELLS.length; j++) drawCell(j);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 44, ok ? C.good : C.bad);
      txt(correct + ' / ' + SEQ_LEN, W / 2, H * 0.68, 26, C.white);
      if (!ok && correct === SEQ_LEN - 1) txt('あと1灯!', W / 2, H * 0.72, 22, C.gold);
      if (ok && (game.best === 0 || correct >= game.best)) txt('NEW RECORD', W / 2, H * 0.72, 22, C.gold);
      if (Math.floor(elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(correct, { correct: correct, total: SEQ_LEN }); else game.end.failure({ correct: correct, total: SEQ_LEN });
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
    game.draw.sprite(TOWER, { '#': C.cellEdge }, W * 0.5, H * 0.20 + bob * 0.3, 20, { anchor: 'center' });
    for (var k = 0; k < CELLS.length; k++) drawCell(k);

    txt(correct + ' / ' + SEQ_LEN, W / 2, H * 0.06, 28, C.white);
    if (phase === 'show' && !finished) {
      for (var p = 0; p <= showIdx && p < SEQ_LEN; p++) game.draw.circle(W * 0.5 - 60 + p * 40, H * 0.72, 10, C.gold);
    } else if (phase === 'input' && !finished) {
      txt('GO!', W / 2, H * 0.72, 36, C.gold);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.28, 48, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.2], ['C4', 0.2], ['E4', 0.4]], { tempo: 118, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

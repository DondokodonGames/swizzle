// J-N6424-0038-workshop-cue-recital.js
// 工房キュー・リサイタル — からくり人形が示す道具を取る順番を目に焼き付け、合図の後に正確に再現する
// 操作: 人形が順に光らせる道具を目で追い、合図が出たら同じ順番でパネルをタップする。人形が動いている最中に押すと脱落
// 終わり: 手本どおりに全パネルを再現できれば成功。順番を間違える/合図前に押すと失敗
// @mechanic: memory_sequence
// @theme: workshop_puppet_cue_recital
// 世界観: 木工房の見習いが、師匠のからくり人形が示す道具を取る順番をじっと見て記憶し、合図が出た瞬間だけ同じ順番でパネルを叩いて再現する
// 残るもの: 正誤(CLEAR/GAME OVER) + 再現できたパネル数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白背景に太い黒線、塗りは最小限のモノトーン線画
  var C = {
    bg: '#f4f0e6', bg2: '#e4ddc8', line: '#181410', panel: '#ffffff',
    panelLit: '#181410', good: '#2a8a4a', bad: '#c02a2a', gold: '#b8860a',
    ink: '#181410', white: '#ffffff',
  };

  var GAME_TITLE = 'CUE RECITAL';
  var SEQ_LEN = 4;
  var PANEL_R = 90;
  var SHOW_TIME = 0.7;
  var GAP_TIME = 0.32;
  var RECALL_WINDOW = 2.4;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PUPPET = ['.##.', '####', '.#.#'];

  var PANELS = [
    { x: W * 0.28, y: H * 0.4 }, { x: W * 0.72, y: H * 0.4 },
    { x: W * 0.28, y: H * 0.58 }, { x: W * 0.72, y: H * 0.58 },
  ];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, C.ink, pulse * 0.2);
  }

  var seq, phase, showIdx, showT, recallIdx, recallT, litPanel, movedEarly;
  var done, endWait, finished, ready, hitStop, shake;
  // phase: 'watch' | 'cue' | 'recall'

  function newSeq() {
    var s = [];
    for (var i = 0; i < SEQ_LEN; i++) s.push(Math.floor(Math.random() * PANELS.length));
    return s;
  }

  function initGame() {
    seq = newSeq(); phase = 'watch'; showIdx = 0; showT = SHOW_TIME; recallIdx = 0;
    recallT = RECALL_WINDOW; litPanel = -1; movedEarly = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function drawScene() {
    for (var i = 0; i < PANELS.length; i++) {
      var p = PANELS[i];
      var lit = litPanel === i;
      game.draw.circle(p.x, p.y, PANEL_R, C.line);
      game.draw.circle(p.x, p.y, PANEL_R - 12, lit ? C.panelLit : C.panel);
    }
    game.draw.sprite(PUPPET, { '#': C.line }, W * 0.5, H * 0.2, 26, { anchor: 'center' });
  }

  function failNow(reason) {
    finished = true; ok = false; hitStop = 0.4; shake = 0.3;
    game.feedback.bad(W * 0.5, H * 0.49, { text: 'MISS' });
    game.audio.play('se_bad', 0.5);
    finish();
  }

  function tapPanel(idx) {
    if (finished || ready > 0) return;
    if (phase === 'watch' || phase === 'cue') {
      // moving before the cue disqualifies the apprentice
      movedEarly = true;
      failNow('early');
      return;
    }
    if (phase !== 'recall') return;
    var p = PANELS[idx];
    game.audio.play('se_tap', 0.2);
    if (idx === seq[recallIdx]) {
      game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.3);
      recallIdx++;
      recallT = RECALL_WINDOW;
      if (recallIdx >= seq.length) {
        finished = true; ok = true; hitStop = 0.3;
        game.feedback.good(W * 0.5, H * 0.49, { text: 'CLEAR', color: C.good });
        game.fx.burst(W * 0.5, H * 0.49, { color: C.gold, count: 20, speed: 380 });
        game.audio.play('se_success', 0.5);
        finish();
      } else if (recallIdx === Math.ceil(seq.length / 2)) {
        game.fx.popup('NICE', W * 0.5, H * 0.3, { color: C.gold, size: 30 });
      }
    } else {
      game.feedback.bad(p.x, p.y, { text: 'MISS' });
      failNow('wrong');
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING) return;
    for (var i = 0; i < PANELS.length; i++) {
      if (Math.hypot(x - PANELS[i].x, y - PANELS[i].y) < PANEL_R) { tapPanel(i); return; }
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function stepPlay(dt) {
    if (phase === 'watch') {
      showT -= dt;
      litPanel = seq[showIdx];
      if (showT <= 0.2 && litPanel !== -1) game.audio.play('se_tap', 0.1);
      if (showT <= 0) {
        showIdx++;
        litPanel = -1;
        if (showIdx >= seq.length) { phase = 'cue'; showT = 0.5; }
        else showT = GAP_TIME;
      }
    } else if (phase === 'cue') {
      showT -= dt;
      if (showT <= 0) {
        phase = 'recall'; recallIdx = 0; recallT = RECALL_WINDOW;
        game.fx.flash(C.gold, 0.15);
        game.audio.play('se_tap', 0.3);
      }
    } else if (phase === 'recall') {
      recallT -= dt;
      if (recallT <= 0) {
        // stuck-safety: recall window elapsed without completing the sequence
        failNow('timeout');
      }
    }
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.7, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.0;
    if (cyc < dt || demo.t <= dt) resetDemo();
    stepPlay(dt);
    if (phase === 'recall' && recallIdx < seq.length) {
      var p = PANELS[seq[recallIdx]];
      demo.gx = p.x; demo.gy = p.y; demo.press = true;
      if (Math.floor(cyc * 5) % 5 === 0) tapPanel(seq[recallIdx]);
    } else {
      demo.gx = W * 0.5; demo.gy = H * 0.72; demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (seq === undefined) initGame();
      stepDemo(dt);
      bg();
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.1, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.15, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.1, 46, ok ? C.good : C.bad);
      txt(recallIdx + ' / ' + seq.length, W / 2, H * 0.15, 28, C.gold);
      if (!ok) txt('あと' + Math.max(0, seq.length - recallIdx) + '手!', W / 2, H * 0.19, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(recallIdx, { recalled: recallIdx, total: seq.length });
        else game.end.failure({ recalled: recallIdx, total: seq.length });
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
    drawScene();

    txt((phase === 'recall' ? recallIdx : 0) + ' / ' + seq.length, W / 2, H * 0.08, 30, C.ink);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.3], ['F4', 0.3], ['A4', 0.3], ['D5', 0.6]], { tempo: 108, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

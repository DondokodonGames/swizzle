// K-GBA-0012-echo-totem-relay.js
// エコートーテム・リレー — 光って鳴った石トーテムの並びを、直後に同じ順番とリズムでタップし返す
// 操作: トーテムが光った順番を見て覚え、光り終わったら同じ順にタップして返す
// 終わり: 規定ラウンド(4回)を全て正しく返せれば成功。順番間違い/制限時間切れで失敗
// @mechanic: memory_sequence
// @theme: echo_totem_canyon
// 世界観: 霧の谷に並ぶ3体の石トーテム。谷の精霊が鳴らした音の並びを、そのまま石に触れて木霊のように返す儀式
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達ラウンド数
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 黄緑寄りの低コントラスト4階調、画面枠、残像感
  var C = {
    bg: '#1f2b12', bg2: '#141d0c', frame: '#0c1006',
    totem: '#3c5820', totemEdge: '#2a3f14', totemLit: '#9bd63a',
    accent: '#e8ff8a', good: '#9bd63a', bad: '#ff5a3c', gold: '#ffe86a',
    white: '#f4ffd8', ink: '#0a0f04',
  };

  var GAME_TITLE = 'ECHO TOTEM';
  var ROUNDS = [2, 3, 3, 4];
  var STEP_T = 0.42;
  var GAP_T = 0.35;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var TOTEMS = [
    { x: W * 0.26, y: H * 0.42, note: 'C4' },
    { x: W * 0.50, y: H * 0.36, note: 'E4' },
    { x: W * 0.74, y: H * 0.42, note: 'G4' },
  ];
  var TOTEM_SPRITE = ['.##.', '####', '.##.', '####', '.##.', '####'];

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var round, seq, phase, playIdx, playT, inputIdx, litTotem, glow, inputBudget, inputT;
  var done, endWait, finished;
  var ready, hitStop, shake, badTotem;

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) game.draw.rect(0, H * 0.55 + i * 40, W, 2, '#ffffff05');
    game.draw.rect(0, 0, W, 18, C.frame);
    game.draw.rect(0, H - 18, W, 18, C.frame);
  }

  function drawTotems() {
    for (var i = 0; i < TOTEMS.length; i++) {
      var t = TOTEMS[i];
      var lit = (i === litTotem);
      var g = glow[i];
      if (g > 0.02) game.draw.circle(t.x, t.y + 40, 120, C.totemLit, g * 0.35);
      game.draw.sprite(TOTEM_SPRITE, { '#': lit ? C.totemLit : C.totem }, t.x, t.y, 20, { anchor: 'center' });
      if (badTotem === i) game.draw.circle(t.x, t.y + 40, 130, C.bad, 0.3);
    }
  }

  function newRound(r) {
    var len = ROUNDS[r];
    seq = [];
    var last = -1;
    for (var i = 0; i < len; i++) {
      var idx;
      do { idx = Math.floor(game.random(0, 3)); } while (idx === last && len > 1);
      last = idx;
      seq.push(idx);
    }
    phase = 'play'; playIdx = -1; playT = 0; inputIdx = 0; litTotem = -1;
  }

  function initGame() {
    round = 0; glow = [0, 0, 0]; badTotem = -1;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newRound(0);
  }

  function failRound(idx) {
    finished = true; ok = false; hitStop = 0.35; badTotem = idx;
    game.feedback.bad(TOTEMS[idx >= 0 ? idx : 1].x, TOTEMS[idx >= 0 ? idx : 1].y, { text: 'MISS' });
    shake = 0.3;
    game.audio.play('se_bad', 0.4);
    finish();
  }

  function tapTotem(i) {
    if (state !== S.PLAYING || finished || done || ready > 0 || hitStop > 0 || phase !== 'input') return;
    game.audio.play('se_tap', 0.15);
    if (seq[inputIdx] === i) {
      glow[i] = 1;
      game.audio.tone(TOTEMS[i].note, 0.18, { wave: 'square', volume: 0.12 });
      game.fx.burst(TOTEMS[i].x, TOTEMS[i].y, { color: C.good, count: 8, speed: 220 });
      inputIdx++;
      if (inputIdx >= seq.length) {
        game.feedback.good(TOTEMS[i].x, TOTEMS[i].y, { text: 'NICE', color: C.good });
        round++;
        if (round >= ROUNDS.length) { finished = true; ok = true; hitStop = 0.1; finish(); return; }
        game.fx.popup(round + ' / ' + ROUNDS.length, W / 2, H * 0.28, { color: C.gold, size: 40 });
        game.audio.play('se_milestone', 0.4);
        newRound(round);
      }
    } else {
      failRound(i);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING) return;
    var best = -1, bd = 1e9;
    for (var i = 0; i < TOTEMS.length; i++) {
      var d = Math.hypot(x - TOTEMS[i].x, y - TOTEMS[i].y);
      if (d < bd) { bd = d; best = i; }
    }
    if (bd < 170) tapTotem(best);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepGame(dt) {
    for (var i = 0; i < glow.length; i++) if (glow[i] > 0) glow[i] -= dt * 2.5;
    if (finished) return;
    if (phase === 'play') {
      playT += dt;
      if (playIdx < 0 || playT >= STEP_T) {
        playT = 0; playIdx++;
        if (playIdx < seq.length) {
          litTotem = seq[playIdx]; glow[litTotem] = 1;
          game.audio.tone(TOTEMS[litTotem].note, 0.22, { wave: 'square', volume: 0.14 });
        } else {
          litTotem = -1; phase = 'gap'; playT = 0;
        }
      }
    } else if (phase === 'gap') {
      playT += dt;
      if (playT >= GAP_T) {
        phase = 'input'; inputBudget = seq.length * 0.95 + 1.0; inputT = inputBudget;
      }
    } else if (phase === 'input') {
      inputT -= dt;
      if (inputT <= 0) failRound(-1);
    }
  }

  var demo = { t: 0, gx: TOTEMS[0].x, gy: H * 0.86, press: false };
  var demoSeq = [0, 1, 2];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.7;
    if (cyc < dt || demo.t <= dt) { litTotem = -1; glow = [0, 0, 0]; }
    for (var i = 0; i < glow.length; i++) if (glow[i] > 0) glow[i] -= dt * 2.5;
    // 0.0-1.3s: 再生フェーズ(3体点灯) / 1.5-2.9s: 入力フェーズ(手が同じ順でタップ)
    if (cyc < 1.3) {
      var step = Math.floor(cyc / 0.42);
      var within = cyc - step * 0.42;
      if (step < demoSeq.length) {
        litTotem = demoSeq[step];
        if (within < dt) { glow[litTotem] = 1; game.audio.tone(TOTEMS[litTotem].note, 0.2, { wave: 'square', volume: 0.08 }); }
        demo.gx = TOTEMS[litTotem].x; demo.gy = H * 0.86; demo.press = false;
      }
    } else if (cyc < 1.65) {
      litTotem = -1; demo.press = false;
    } else if (cyc < 3.3) {
      var t2 = cyc - 1.65;
      var step2 = Math.floor(t2 / 0.44);
      var within2 = t2 - step2 * 0.44;
      if (step2 < demoSeq.length) {
        var idx = demoSeq[step2];
        demo.gx = TOTEMS[idx].x; demo.gy = TOTEMS[idx].y;
        demo.press = within2 < 0.2;
        if (within2 < dt) { glow[idx] = 1; game.audio.tone(TOTEMS[idx].note, 0.18, { wave: 'square', volume: 0.08 }); }
      }
    } else {
      litTotem = -1; demo.gx = TOTEMS[0].x; demo.gy = H * 0.86; demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (glow === undefined) initGame();
      bg();
      stepDemo(dt);
      drawTotems();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.12, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + '/' + ROUNDS.length : '-'), W / 2, H * 0.16, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTotems();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.12, 50, ok ? C.good : C.bad);
      txt(round + ' / ' + ROUNDS.length, W / 2, H * 0.18, 32, C.gold);
      if (!ok) txt('あと1ラウンド!', W / 2, H * 0.23, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(round, { round: round, total: ROUNDS.length });
        else game.end.failure({ round: round, total: ROUNDS.length });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      stepGame(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawTotems();

    txt('ROUND ' + Math.min(round + 1, ROUNDS.length) + ' / ' + ROUNDS.length, W / 2, H * 0.08, 30, C.white);
    game.draw.rect(60, 150, W - 120, 14, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (round / ROUNDS.length), 14, C.gold);
    if (phase === 'input' && !finished && ready <= 0) {
      var pct = Math.max(0, inputT / inputBudget);
      game.draw.rect(W * 0.5 - 200, H * 0.62, 400, 20, C.ink, 0.5);
      game.draw.rect(W * 0.5 - 200, H * 0.62, 400 * pct, 20, pct > 0.3 ? C.accent : C.bad);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);

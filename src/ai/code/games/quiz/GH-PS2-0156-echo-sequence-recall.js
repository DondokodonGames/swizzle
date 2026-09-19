// GH-PS2-0156-echo-sequence-recall.js
// エコーシーケンス — 祠の4つの燭台が光った順を覚え、同じ順になぞって再現する。波を追うごとに列が伸びる
// 操作: 光った順番を覚えて、同じ順に燭台をタップする。1ヶ所でも順を外すと終わり
// 終わり: 3波(3個→4個→5個)すべて正しく再現できれば成功。どこかで外せば失敗
// @mechanic: memory_sequence
// @theme: shrine_candle_echo
// 世界観: 石造りの祠に並ぶ4つの燭台。灯る順が波ごとに長くなっていく。灯った順そのままになぞり返す
// 残るもの: 正誤(CLEAR/GAME OVER) + 何個目まで再現できたか(通算)
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 2000s ARCADE POP: 原色+白縁。明るい背景、光の柱と祝祭演出
  var C = {
    bg1: '#3a1a5a', bg2: '#1a0a30', shrine: '#241040',
    p0: '#ff4d6a', p1: '#4dd0ff', p2: '#ffd44d', p3: '#4dff9a',
    good: '#4dff9a', bad: '#ff4d5e', gold: '#ffd44d', white: '#ffffff', ink: '#150a28',
  };
  var PAD_COL = [C.p0, C.p1, C.p2, C.p3];

  var GAME_TITLE = 'ECHO SEQUENCE';
  var WAVE_LENS = [3, 4, 5];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, totalCorrect = 0, waveIdx = 0;

  var PAD_POS = [
    { x: W * 0.30, y: H * 0.38 }, { x: W * 0.70, y: H * 0.38 },
    { x: W * 0.30, y: H * 0.56 }, { x: W * 0.70, y: H * 0.56 },
  ];
  var PAD_R = 92;

  var seq, showIdx, showT, inputIdx, phase, fever, done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FLAME_SPRITE = ['.#.', '###', '###'];

  function shrineBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    for (var i = 0; i < 5; i++) {
      var x = W * (0.1 + i * 0.2);
      game.draw.rect(x - 26, 0, 52, H, '#ffffff', 0.03 + 0.02 * Math.sin(game.time.elapsed * 2 + i));
    }
    game.draw.rect(W * 0.5 - 320, H * 0.28, 640, H * 0.42, C.shrine);
    if (fever > 0) game.draw.rect(0, 0, W, H, C.gold, Math.min(0.14, fever * 0.03));
  }

  function drawPads(lit) {
    for (var i = 0; i < 4; i++) {
      var p = PAD_POS[i];
      var on = lit === i;
      game.draw.circle(p.x, p.y + 8, PAD_R + 10, '#000000', 0.25);
      game.draw.circle(p.x, p.y, PAD_R + 10, C.white, on ? 1 : 0.5);
      game.draw.circle(p.x, p.y, PAD_R, on ? PAD_COL[i] : '#3a2a52');
      game.draw.sprite(FLAME_SPRITE, { '#': on ? '#ffffff' : PAD_COL[i] }, p.x, p.y, on ? 22 : 16, { anchor: 'center' });
    }
  }

  function initGame() {
    waveIdx = 0; totalCorrect = 0; fever = 0;
    startWave();
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function startWave() {
    seq = [];
    for (var i = 0; i < WAVE_LENS[waveIdx]; i++) seq.push(Math.floor(Math.random() * 4));
    showIdx = 0; showT = 0.55; inputIdx = 0; phase = 'show';
  }

  function pressPad(i) {
    if (done || ready > 0 || finished || phase !== 'input') return;
    hitStop = 0.05;
    game.audio.play('se_tap', 0.2);
    if (i === seq[inputIdx]) {
      inputIdx++; totalCorrect++;
      game.feedback.good(PAD_POS[i].x, PAD_POS[i].y, { text: null, color: C.good });
      game.audio.play('se_good', 0.25);
      fever = Math.min(6, fever + 1);
      if (inputIdx >= seq.length) {
        waveIdx++;
        if (waveIdx >= WAVE_LENS.length) {
          ok = true; finished = true;
          game.fx.burst(W / 2, H * 0.46, { color: C.gold, count: 20, speed: 400 });
          game.audio.play('se_success', 0.5);
          finish();
        } else {
          game.fx.popup('WAVE ' + (waveIdx + 1), W / 2, H * 0.20, { color: C.gold, size: 42 });
          game.audio.play('se_milestone', 0.35);
          startWave();
        }
      }
    } else {
      ok = false; finished = true; fever = 0;
      game.feedback.bad(PAD_POS[i].x, PAD_POS[i].y, { text: 'MISS' });
      shake = 0.16;
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  function padAt(x, y) {
    var best = -1, bd = 999;
    for (var i = 0; i < 4; i++) { var d = Math.hypot(x - PAD_POS[i].x, y - PAD_POS[i].y); if (d < bd) { bd = d; best = i; } }
    return bd < PAD_R + 20 ? best : -1;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
    var idx = padAt(x, y);
    if (idx >= 0) pressPad(idx);
    else game.feedback.bad(x, y, { text: null });
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.3);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W / 2, gy: H * 0.80, press: false, seq: [0, 2, 1, 3, 0], phase: 'show', idx: 0, t2: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    demo.t2 += dt;
    if (demo.phase === 'show') {
      if (demo.t2 > 0.45) { demo.t2 = 0; demo.idx++; if (demo.idx >= demo.seq.length) { demo.phase = 'input'; demo.idx = 0; } }
    } else {
      if (demo.t2 > 0.55) {
        demo.t2 = 0;
        var p = PAD_POS[demo.seq[demo.idx]];
        game.feedback.good(p.x, p.y, { text: null, color: C.good });
        demo.idx++;
        if (demo.idx >= demo.seq.length) { demo.phase = 'show'; demo.idx = 0; }
      }
    }
    var target = demo.phase === 'input' ? PAD_POS[demo.seq[demo.idx] || 0] : { x: W / 2, y: H * 0.80 };
    demo.gx += (target.x - demo.gx) * Math.min(1, dt * 5);
    demo.gy += (target.y - demo.gy) * Math.min(1, dt * 5);
    demo.press = demo.phase === 'input' && demo.t2 < 0.15;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      shrineBg();
      stepDemo(dt);
      drawPads(demo.phase === 'show' ? demo.seq[demo.idx] : -1);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.10, 42, C.white);
      txt('BEST ' + (game.best > 0 ? String(game.best) : '-'), W / 2, H * 0.14, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 40, C.gold);
        txt('TAP TO START', W / 2, H * 0.93, 30, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.93, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      shrineBg();
      drawPads(-1);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 52, ok ? C.good : C.bad);
      txt(String(totalCorrect), W / 2, H * 0.16, 36, C.gold);
      if (!ok && waveIdx === WAVE_LENS.length - 1 && inputIdx === seq.length - 1) txt('あと1手!', W / 2, H * 0.21, 28, C.bad);
      var best = Math.max(game.best, totalCorrect);
      txt('BEST ' + best, W / 2, H * 0.90, 28, C.gold);
      if (totalCorrect > game.best) txt('NEW RECORD', W / 2, H * 0.95, 26, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.98, 22, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(totalCorrect, { totalCorrect: totalCorrect, wave: waveIdx + 1 });
        else game.end.failure({ totalCorrect: totalCorrect, wave: waveIdx + 1 });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (phase === 'show') {
      showT -= dt;
      if (showT <= 0) {
        showIdx++; showT = 0.5;
        if (showIdx < seq.length) game.audio.tone(440 + seq[showIdx] * 70, 0.1, { wave: 'triangle', volume: 0.14 });
        if (showIdx >= seq.length) phase = 'input';
      }
    }
    if (shake > 0) shake -= dt;

    shrineBg();
    drawPads(phase === 'show' && showIdx < seq.length ? seq[showIdx] : -1);

    var waveTotal = WAVE_LENS[0] + WAVE_LENS[1] + WAVE_LENS[2];
    txt(totalCorrect + ' / ' + waveTotal, W / 2, H * 0.10, 32, C.white);
    game.draw.rect(70, 120, W - 140, 16, C.shrine);
    game.draw.rect(70, 120, (W - 140) * (totalCorrect / waveTotal), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.24, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.2], ['E5', 0.2], ['G5', 0.2], ['C6', 0.2]], { tempo: 150, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

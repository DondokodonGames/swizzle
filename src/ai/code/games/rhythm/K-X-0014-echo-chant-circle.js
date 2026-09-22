// K-X-0014-echo-chant-circle.js
// こだま太鼓の輪 — 輪の中心が打った掛け声の順番を聞き終えた直後、同じ順に太鼓を打ち返す
// 操作: 4つの太鼓が光って鳴る順番を最後まで聞き、鳴り終わったら同じ順にタップして打ち返す
// 終わり: 3ラウンド(2→3→4打)すべて正しい順で打ち返せれば成功。1回でも順を外す/早打ちすれば失敗
// @mechanic: memory_sequence
// @theme: drum_circle_call_response
// 世界観: 夜の広場に集う太鼓の輪。中心の音頭取りが打つ掛け声の順番を耳だけで覚え、鳴り終わった直後に同じ順で打ち返す新入りの試練
// 残るもの: 正誤(CLEAR/GAME OVER) + 通過できたラウンド数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い黒アウトライン+平坦な塗り、彩度高めの3色+アクセント2色
  var C = {
    bg: '#2a1a0e', bg2: '#180e06', ground: '#4a3018', groundLine: '#2a1a0e',
    drumOff: '#8a5a2e', drumEdge: '#3a2410',
    good: '#3dff8a', bad: '#ff3d5a', gold: '#ffd400', white: '#fff2e0', ink: '#100a04',
  };
  var DRUM_COL = ['#ff5a4a', '#4dcfff', '#ffd400', '#7aff5a'];
  var ROUND_LEN = [2, 3, 4];

  var GAME_TITLE = 'CHANT CIRCLE';

  var DRUM_POS = [
    { x: W * 0.28, y: H * 0.42 }, { x: W * 0.72, y: H * 0.42 },
    { x: W * 0.28, y: H * 0.60 }, { x: W * 0.72, y: H * 0.60 },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var LEADER = ['.##.', '####', '.##.', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.circle(W * 0.5, H * 0.52, 360, C.ground, 0.5);
    game.draw.sprite(LEADER, { '#': C.white }, W * 0.5, H * 0.28, 18, { anchor: 'center' });
  }

  function drawDrums(litIdx) {
    for (var i = 0; i < 4; i++) {
      var p = DRUM_POS[i];
      var on = litIdx === i;
      game.draw.circle(p.x, p.y + 8, 76, C.drumEdge, 0.6);
      game.draw.circle(p.x, p.y, 74, on ? DRUM_COL[i] : C.drumOff);
      game.draw.circle(p.x, p.y - 16, 26, '#ffffff', on ? 0.45 : 0.15);
    }
  }

  var roundIdx, seq, showIdx, showT, gapT, inputIdx, phase, done, endWait, finished, ready, hitStop, shake;

  function newSeq(len) {
    var s = [];
    for (var i = 0; i < len; i++) s.push(Math.floor(game.random(0, 4)));
    return s;
  }

  function initGame() {
    roundIdx = 0; seq = newSeq(ROUND_LEN[0]); showIdx = -1; showT = 0; gapT = 0.5; inputIdx = 0; phase = 'show';
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function failNow() {
    ok = false; finished = true;
    hitStop = 0.3; shake = 0.2;
    game.audio.play('se_bad', 0.4);
    finish();
  }

  function pressDrum(i) {
    if (done || ready > 0 || finished || phase !== 'input') {
      if (phase === 'show' && !done && ready <= 0 && !finished) {
        game.feedback.bad(DRUM_POS[i].x, DRUM_POS[i].y, { text: 'HAYAI!' });
        failNow();
      }
      return;
    }
    hitStop = 0.05;
    game.audio.play('se_tap', 0.2);
    if (i === seq[inputIdx]) {
      inputIdx++;
      game.feedback.good(DRUM_POS[i].x, DRUM_POS[i].y, { text: null, color: DRUM_COL[i] });
      game.audio.play('se_good', 0.22);
      if (inputIdx >= seq.length) {
        roundIdx++;
        if (roundIdx >= ROUND_LEN.length) {
          ok = true; finished = true;
          game.fx.burst(W * 0.5, H * 0.5, { color: C.gold, count: 20, speed: 380 });
          game.audio.play('se_success', 0.5);
          finish();
          return;
        }
        game.fx.popup(roundIdx + ' / ' + ROUND_LEN.length, W * 0.5, H * 0.20, { color: C.gold, size: 36 });
        game.audio.play('se_milestone', 0.3);
        seq = newSeq(ROUND_LEN[roundIdx]); showIdx = -1; showT = 0; gapT = 0.6; inputIdx = 0; phase = 'show';
      }
    } else {
      game.feedback.bad(DRUM_POS[i].x, DRUM_POS[i].y, { text: 'MISS' });
      failNow();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); return; }
    var idx = -1, best = 999;
    for (var i = 0; i < 4; i++) { var d = Math.hypot(x - DRUM_POS[i].x, y - DRUM_POS[i].y); if (d < best) { best = d; idx = i; } }
    if (best < 92 && state === S.PLAYING) pressDrum(idx);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (ok) game.audio.play('se_success', 0.3);
    endWait = 1.3;
  }

  function stepShow(dt) {
    if (gapT > 0) { gapT -= dt; return; }
    showT -= dt;
    if (showT <= 0) {
      showIdx++;
      if (showIdx >= seq.length) { phase = 'input'; return; }
      showT = 0.5;
      game.audio.tone(320 + seq[showIdx] * 90, 0.14, { wave: 'triangle', volume: 0.14 });
    }
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.86, press: false, seq: [1, 3, 0], phase: 'show', idx: 0, t2: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    demo.t2 += dt;
    if (demo.phase === 'show') {
      if (demo.t2 > 0.5) { demo.t2 = 0; demo.idx++; if (demo.idx >= demo.seq.length) { demo.phase = 'input'; demo.idx = 0; } }
    } else {
      if (demo.t2 > 0.55) {
        demo.t2 = 0;
        var p = DRUM_POS[demo.seq[demo.idx]];
        game.feedback.good(p.x, p.y, { text: null, color: DRUM_COL[demo.seq[demo.idx]] });
        game.audio.play('se_good', 0.15);
        demo.idx++;
        if (demo.idx >= demo.seq.length) { demo.phase = 'show'; demo.idx = 0; }
      }
    }
    var target = demo.phase === 'input' ? DRUM_POS[demo.seq[demo.idx] || 0] : { x: W * 0.5, y: H * 0.86 };
    demo.gx += (target.x - demo.gx) * Math.min(1, dt * 5);
    demo.gy += (target.y - demo.gy) * Math.min(1, dt * 5);
    demo.press = demo.phase === 'input' && demo.t2 < 0.15;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawDrums(demo.phase === 'show' ? demo.seq[demo.idx] : -1);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 22 });
      txt(GAME_TITLE, W / 2, H * 0.10, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.14, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawDrums(-1);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 48, ok ? C.good : C.bad);
      txt(roundIdx + ' / ' + ROUND_LEN.length, W / 2, H * 0.15, 30, C.gold);
      if (!ok) txt('あと1ラウンド!', W / 2, H * 0.19, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(roundIdx, { rounds: roundIdx, total: ROUND_LEN.length });
        else game.end.failure({ rounds: roundIdx, total: ROUND_LEN.length });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished && phase === 'show') {
      stepShow(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawDrums(phase === 'show' && showIdx >= 0 && showIdx < seq.length ? seq[showIdx] : -1);

    txt('R' + (roundIdx + 1) + '  ' + (phase === 'show' ? '聴く' : (inputIdx + '/' + seq.length)), W / 2, H * 0.10, 32, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.24, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_dark', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);

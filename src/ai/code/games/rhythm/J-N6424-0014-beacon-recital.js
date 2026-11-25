// J-N6424-0014-beacon-recital.js
// ビーコン・リサイタル — 4基の灯台ビーコンが灯る順番を覚え、拍に合わせて同じ順にタップして再現する
// 操作: 点灯順を見て記憶し、同じ拍のテンポで4基のビーコンを同じ順番にタップする
// 終わり: 規定の長さまで順番を間違えず再現し切れば成功。1つでも順番を間違えると即失格
// @mechanic: memory_sequence
// @theme: beacon_light_recital
// 世界観: 夜の岬に立つ灯台守見習いが、師匠の打つ点灯パターンを目で覚え、同じ拍で自分のビーコンを鳴らして返す指導会に挑む
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した順列の長さ
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 原色+白縁、明るい背景、光の柱と祝祭演出
  var C = {
    bg: '#1a1440', bg2: '#0c0824', ring: '#ffffff',
    t0: '#ff4d6a', t1: '#3fd0ff', t2: '#ffd93f', t3: '#4dff9e',
    dim: '#3a3560', good: '#4dff9e', bad: '#ff4d6a', gold: '#ffd93f', ink: '#f0eeff',
  };
  var TCOL = [C.t0, C.t1, C.t2, C.t3];
  var TNOTE = ['C4', 'E4', 'G4', 'B4'];

  var GAME_TITLE = 'BEACON RECITAL';
  var MAX_TIME = 18;
  var BEAT = 0.46;
  var SEQ_TOTAL = 5;
  var POS = [
    { x: W * 0.5, y: H * 0.32 },
    { x: W * 0.72, y: H * 0.5 },
    { x: W * 0.5, y: H * 0.68 },
    { x: W * 0.28, y: H * 0.5 },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#040214', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var TOWER = ['.##.', '####', '.##.', '####'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.03 + 0.025 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.25);
  }

  var seq, curLen, phase, phaseT, showIdx, inputPtr, lit, done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    seq = [Math.floor(game.random(0, 4))];
    curLen = 1; phase = 'pause'; phaseT = 0.5; showIdx = 0; inputPtr = 0; lit = -1;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function fail(x, y) {
    ok = false; finished = true; hitStop = 0.35; shake = 0.25;
    game.feedback.bad(x, y, { text: 'MISS' });
    game.audio.play('se_bad', 0.45);
    finish();
  }

  function beginShow() {
    phase = 'show'; showIdx = 0; phaseT = 0.25; lit = -1;
  }

  function tapTotem(i, x, y) {
    if (phase !== 'input' || finished) return;
    if (seq[inputPtr] === i) {
      lit = i;
      game.audio.tone(TNOTE[i], 0.18, { wave: 'square', volume: 0.12 });
      game.feedback.good(x, y, { color: TCOL[i], size: 16 });
      inputPtr++;
      if (inputPtr >= curLen) {
        if (curLen >= SEQ_TOTAL) {
          ok = true; finished = true; hitStop = 0.2;
          game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
          game.fx.burst(x, y, { color: C.gold, count: 24, speed: 420 });
          game.audio.play('se_success', 0.5);
          finish();
        } else {
          game.fx.popup('NICE', W * 0.5, H * 0.5, { color: C.gold, size: 32 });
          game.audio.play('se_milestone', 0.3);
          seq.push(Math.floor(game.random(0, 4)));
          curLen++; inputPtr = 0;
          phase = 'pause'; phaseT = 0.5;
        }
      }
    } else {
      lit = i;
      fail(x, y);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || ready > 0 || finished) return;
    var hitAny = false;
    for (var i = 0; i < POS.length; i++) {
      if (game.hit.circle(x, y, 34, POS[i].x, POS[i].y, 90)) { hitAny = true; tapTotem(i, x, y); break; }
    }
    if (!hitAny) { game.feedback.bad(x, y, { text: 'MISS' }); game.audio.play('se_tap', 0.15); }
  });

  function stepSeq(dt) {
    phaseT -= dt;
    if (phase === 'pause' && phaseT <= 0) beginShow();
    else if (phase === 'show') {
      if (phaseT <= 0) {
        if (showIdx < curLen) {
          lit = seq[showIdx];
          game.audio.tone(TNOTE[lit], 0.2, { wave: 'triangle', volume: 0.14 });
          showIdx++; phaseT = BEAT;
        } else {
          lit = -1; phase = 'input'; phaseT = 999; inputPtr = 0;
        }
      }
    }
  }

  function drawTowers() {
    for (var i = 0; i < POS.length; i++) {
      var p = POS[i];
      var on = lit === i;
      var bob = Math.sin(game.time.elapsed * 2 + i) * 4;
      if (on) game.draw.circle(p.x, p.y, 92, TCOL[i], 0.35);
      game.draw.circle(p.x, p.y, 78, on ? TCOL[i] : C.dim, 1);
      game.draw.circle(p.x, p.y, 78, C.ring, on ? 0.9 : 0.3);
      game.draw.sprite(TOWER, { '#': on ? '#ffffff' : TCOL[i] }, p.x, p.y + bob, 12, { anchor: 'center' });
    }
  }

  var demo = { t: 0, gx: POS[0].x, gy: POS[0].y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7.5;
    if (cyc < dt || demo.t <= dt) initGame();
    stepSeq(dt);
    if (phase === 'input' && inputPtr < curLen) {
      var target = seq[inputPtr];
      demo.gx = POS[target].x; demo.gy = POS[target].y; demo.press = true;
      tapTotem(target, POS[target].x, POS[target].y);
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!seq) initGame();
      bg();
      stepDemo(dt);
      drawTowers();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 36, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTowers();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt(curLen + ' / ' + SEQ_TOTAL, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(1, SEQ_TOTAL - curLen + 1) + '手!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(curLen, { reachedLen: curLen, target: SEQ_TOTAL });
        else game.end.failure({ reachedLen: curLen, target: SEQ_TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepSeq(dt);
      if (!finished && game.time.elapsed >= MAX_TIME) fail(W * 0.5, H * 0.5);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawTowers();
    txt((phase === 'input' ? inputPtr : curLen - 1) + ' / ' + curLen, W / 2, H * 0.06, 26, C.ink);
    var barW = W - 120;
    game.draw.rect(60, 150, barW, 16, C.dim, 1);
    game.draw.rect(60, 150, barW * Math.max(0, 1 - game.time.elapsed / MAX_TIME), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.25], ['E4', 0.25], ['G4', 0.25], ['C5', 0.4]], { tempo: 130, wave: 'triangle', volume: 0.045, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

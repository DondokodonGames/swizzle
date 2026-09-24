// D-20092012-0032-tonic-chute-sort.js
// トニック・シュートソート — 上から落ちる色つきの雫を、タップで漏斗を動かして対応する色の瓶へ導く
// 操作: 下部の3つのボタンをタップして漏斗を色の合う瓶の上へ動かす
// 終わり: 規定数の雫を零さず流しきれば成功。既定回数こぼせば失敗
// @mechanic: gap_fit
// @theme: tonic_workshop_funnel
// 世界観: 薬品工房の集荷シュート。見習いが色違いの雫を漏斗で受け止め、対応する瓶へ振り分けて仕上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 回収した雫の数
// スタイル: PIXEL HD
(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 多色+光。パララックス複数層、光源統一、細かいアニメ
  var C = {
    bg1: '#2a1f3a', bg2: '#14101e', shelf: '#3a2e4a', pipe: '#5a4a6a',
    good: '#5affb0', bad: '#ff5a6a', gold: '#ffd23f', white: '#f4f0ff', ink: '#0a0714',
  };
  var FLASK_COLORS = ['#ff6a8a', '#6ad0ff', '#8aff6a'];
  var FLASK_GLOW = ['#ffb0c4', '#b0e8ff', '#c8ffb0'];

  var GAME_TITLE = 'TONIC SORT';
  var CX = W * 0.5;
  var GATE_Y = H * 0.62;
  var TOP_Y = H * 0.18;
  var LANE_XS = [W * 0.28, W * 0.5, W * 0.72];
  var DROPS_TOTAL = 8;
  var SPILL_LIMIT = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var collected, spilled, resolvedCount, gateIdx, drop, milestoneShown, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DROP_SPRITE = ['.#.', '###', '###'];
  var FUNNEL_SPRITE = ['#####', '.###.', '..#..'];
  var FLASK_SPRITE = ['.###.', '.###.', '#####', '#####'];

  function newDrop(delay) {
    return { color: Math.floor(Math.random() * FLASK_COLORS.length), t: -delay, dur: Math.max(0.9, 1.5 - resolvedCount * 0.05), resolved: false };
  }

  function initGame() {
    collected = 0; spilled = 0; resolvedCount = 0; gateIdx = 1; drop = newDrop(0); milestoneShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(CX - 70, TOP_Y - 40, 140, 40, C.pipe);
    // continuous ambient pulse (triangle wave) so overall canvas luminance is never identical frame-to-frame
    var ph = (game.time.elapsed % 5.3) / 5.3;
    var tri = ph < 0.5 ? ph * 2 : (1 - ph) * 2;
    game.draw.rect(0, 0, W, H, C.gold, 0.05 + tri * 0.11);
  }

  function drawFlasks() {
    for (var i = 0; i < 3; i++) {
      var x = LANE_XS[i];
      var lit = gateIdx === i;
      game.draw.sprite(FLASK_SPRITE, { '#': lit ? FLASK_GLOW[i] : FLASK_COLORS[i] }, x, H * 0.82, 26, { anchor: 'center' });
      game.draw.rect(x - 60, H * 0.90, 120, 14, C.shelf, 0.6);
    }
  }

  function drawFunnel() {
    var x = LANE_XS[gateIdx];
    game.draw.sprite(FUNNEL_SPRITE, { '#': C.gold }, x, GATE_Y, 20, { anchor: 'center' });
  }

  function dropPos(d) {
    var p = Math.min(1, Math.max(0, d.t / d.dur));
    return { x: CX, y: TOP_Y + (GATE_Y - TOP_Y) * p, p: p };
  }

  function drawDrop(d) {
    if (d.resolved) return;
    var pos = dropPos(d);
    if (pos.p > 0.55 && Math.floor(game.time.elapsed * 10) % 2 === 0) {
      game.draw.circle(CX, GATE_Y, 40, C.gold, 0.2);
    }
    game.draw.sprite(DROP_SPRITE, { '#': FLASK_COLORS[d.color] }, pos.x, pos.y, 12, { anchor: 'center' });
  }

  function selectGate(idx) {
    if (ready > 0 || finished || done) return;
    gateIdx = idx;
    game.audio.play('se_tap', 0.12);
    game.fx.burst(LANE_XS[idx], H * 0.6, { color: C.white, count: 4, speed: 100 });
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && y > H * 0.55) {
      var idx = x < W * 0.4 ? 0 : (x < W * 0.62 ? 1 : 2);
      selectGate(idx);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function resolveDrop() {
    drop.resolved = true; resolvedCount++;
    var match = gateIdx === drop.color;
    if (match) {
      collected++;
      game.feedback.good(LANE_XS[gateIdx], H * 0.82, { text: 'GOOD', color: C.good, size: 26 });
      game.fx.burst(LANE_XS[gateIdx], H * 0.82, { color: FLASK_COLORS[drop.color], count: 14, speed: 280 });
      game.audio.play('se_coin', 0.35);
      if (!milestoneShown && collected >= Math.ceil(DROPS_TOTAL / 2)) {
        milestoneShown = true;
        game.fx.popup('NICE', CX, H * 0.35, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.4);
      }
    } else {
      spilled++;
      game.feedback.bad(CX, GATE_Y, { text: 'MISS', size: 24 });
      game.audio.play('se_bad', 0.4);
      if (spilled >= SPILL_LIMIT) {
        ok = false; finished = true; hitStop = 0.4; shake = 0.35;
        finish();
        return;
      }
    }
    if (resolvedCount >= DROPS_TOTAL) { ok = true; finished = true; finish(); return; }
    drop = newDrop(0);
  }

  function tickDrops(dt) {
    drop.t += dt;
    if (drop.t >= drop.dur && !drop.resolved) resolveDrop();
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.62, press: false, d: null };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) {
      resolvedCount = 0; collected = 0; spilled = 0; milestoneShown = false;
      demo.d = newDrop(0); demo.d.dur = 1.4; demo.d.color = Math.floor((demo.t / 3.0)) % 3;
      gateIdx = demo.d.color;
    }
    drop = demo.d; drop.t += dt;
    var p = drop.t / drop.dur;
    if (p > 0.4 && p < 0.55 && !drop._pressed) {
      drop._pressed = true;
      demo.gx = LANE_XS[drop.color]; demo.gy = H * 0.6; demo.press = true;
      gateIdx = drop.color;
    }
    if (p >= 1 && !drop.resolved) {
      drop.resolved = true;
      game.feedback.good(LANE_XS[gateIdx], H * 0.82, { text: 'GOOD', color: C.good, size: 26 });
      game.fx.burst(LANE_XS[gateIdx], H * 0.82, { color: FLASK_COLORS[drop.color], count: 12, speed: 260 });
      game.audio.play('se_coin', 0.3);
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (drop === undefined) initGame();
      bg();
      stepDemo(dt);
      drawFlasks();
      drawFunnel();
      if (drop) drawDrop(drop);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawFlasks();
      drawFunnel();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(collected + ' / ' + DROPS_TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (DROPS_TOTAL - collected) + '滴!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(collected, { collected: collected, spilled: spilled });
        else game.end.failure({ collected: collected, spilled: spilled });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      tickDrops(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawFlasks();
    drawFunnel();
    if (!finished) drawDrop(drop);

    txt(collected + ' / ' + DROPS_TOTAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 14, C.ink, 0.4);
    game.draw.rect(60, 150, (W - 120) * (collected / DROPS_TOTAL), 14, C.gold);
    for (var m = 0; m < SPILL_LIMIT; m++) {
      game.draw.circle(W - 60 - m * 40, 200, 12, m < spilled ? C.bad : C.shelf);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.2], ['E5', 0.2], ['G5', 0.2], ['C6', 0.4]], { tempo: 140, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

// D-20092012-0075-garden-lure-shot.js
// ガーデンルアーショット — 庭に来る小さな来訪者の好物を見極めて置き、決定的な瞬間にシャッターを切る
// 操作: 生き物の吹き出しの色と同じ色の餌を3択からタップ。近づいてきたら輪が重なった瞬間にタップして撮影
// 終わり: 3匹すべての撮影に成功すれば成功。餌を外す/撮影を外すと即失敗
// @mechanic: spot
// @theme: backyard_wildlife_photography
// 世界観: 小さな裏庭を舞台にした野生動物カメラマン。訪れる生き物ごとに好物を見抜いて呼び寄せ、決定的な一枚を撮る
// 残るもの: 正誤(CLEAR/GAME OVER) + 撮影成功数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: 淡い彩度低めの色、丸みのあるUI
  var STYLE = { bg: ['#eaf6ec', '#dcefe0'], main: ['#9fd8ac', '#f7c8a6'], accent: ['#ff9fb0', '#8ec7f0'] };
  var C = {
    sky1: '#eaf6ec', sky2: '#d6ecda', grass: '#bfe3c2', grassDark: '#a6d2ab',
    lure1: '#ff9fb0', lure2: '#8ec7f0', lure3: '#ffd98a',
    critter: '#7a6a56', good: '#57c97a', bad: '#ff5c6c', gold: '#ffb454', white: '#fffdf8', ink: '#3a3226',
  };

  var GAME_TITLE = 'GARDEN LURE SHOT';
  var TOTAL = 3;
  var LURE_X = [W * 0.22, W * 0.5, W * 0.78];
  var LURE_Y = H * 0.88;
  var LURE_COLORS = [C.lure1, C.lure2, C.lure3];
  var CX = W * 0.5, CENTER_Y = H * 0.46;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var LURE_SHAPES = ['.##.', '####', '.##.'];
  var CRITTER_A = ['.##.', '####', '.##.', '#..#'];
  var CRITTER_B = ['.##.', '####', '.##.', '.##.'];

  // ラウンド状態: 'pick'(餌を選ぶ) -> 'approach'(近づく) -> 'shutter'(撮影) -> 'resolved'
  var round, phase, phaseT, want, picked, ringVal, ringDir, shutterTarget, shots, done, endWait, finished;
  var ready, hitStop, shake, milestoneShown;

  function newRound() {
    want = Math.floor(Math.random() * 3);
    picked = -1; phase = 'pick'; phaseT = 0;
    shutterTarget = 0.45 + Math.random() * 0.25;
    ringVal = 0; ringDir = 1;
  }

  function initGame() {
    round = 0; shots = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
    newRound();
  }

  function pickLure(idx) {
    if (state !== S.PLAYING || ready > 0 || done || finished || phase !== 'pick') return;
    picked = idx;
    game.audio.play('se_tap', 0.2);
    if (idx === want) {
      phase = 'approach'; phaseT = 0;
      game.feedback.good(LURE_X[idx], LURE_Y, { text: 'NICE' });
    } else {
      hitStop = 0.3; shake = 0.25;
      game.feedback.bad(LURE_X[idx], LURE_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  function shutterTap() {
    if (state !== S.PLAYING || ready > 0 || done || finished || phase !== 'shutter') return;
    var diff = Math.abs(ringVal - shutterTarget);
    if (diff < 0.14) {
      hitStop = 0.15;
      shots++;
      game.feedback.good(CX, CENTER_Y, { text: shots === TOTAL ? 'PERFECT' : 'GOOD' });
      game.fx.burst(CX, CENTER_Y, { color: C.gold, count: 16, speed: 320 });
      game.audio.play('se_coin', 0.4);
      if (!milestoneShown && shots === 2) { milestoneShown = true; game.fx.popup('2 / 3', CX, CENTER_Y - 220, { color: C.gold, size: 40 }); game.audio.play('se_milestone', 0.4); }
      if (shots >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++;
      newRound();
    } else {
      hitStop = 0.3; shake = 0.25;
      game.feedback.bad(CX, CENTER_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING) return;
    if (phase === 'pick') {
      for (var i = 0; i < 3; i++) {
        if (Math.hypot(x - LURE_X[i], y - LURE_Y) < 90) { pickLure(i); return; }
      }
    } else if (phase === 'shutter') {
      shutterTap();
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function bg(elapsed) {
    game.draw.gradient(0, H, [[0, C.sky1], [1, C.sky2]]);
    game.draw.rect(0, 0, W, H, C.white, 0.02 + 0.02 * Math.sin(elapsed * 1.4));
    game.draw.rect(0, H * 0.62, W, H * 0.4, C.grass);
    for (var i = 0; i < 10; i++) {
      var gx = (i * 130 + Math.sin(elapsed * 0.6 + i) * 6) % W;
      game.draw.rect(gx, H * 0.62 + (i % 3) * 10, 6, 18, C.grassDark, 0.7);
    }
  }

  function drawLures(bob) {
    for (var i = 0; i < 3; i++) {
      var sel = phase === 'pick';
      var by = LURE_Y + Math.sin(bob * 2 + i) * 6;
      game.draw.circle(LURE_X[i], by, 78, C.white, 0.9);
      game.draw.sprite(LURE_SHAPES, { '#': LURE_COLORS[i] }, LURE_X[i], by, 20, { anchor: 'center' });
      if (sel) game.draw.circle(LURE_X[i], by, 84, LURE_COLORS[i], 0.35);
    }
  }

  function drawCritter(elapsed, approachP) {
    var y = CENTER_Y + Math.sin(elapsed * 2.2) * 8;
    var x = CX;
    var frame = Math.floor(elapsed * 5) % 2 === 0 ? CRITTER_A : CRITTER_B;
    game.draw.sprite(frame, { '#': C.critter }, x, y, 26 * (0.6 + approachP * 0.4), { anchor: 'center' });
    // 好みの吹き出し(色のみで表現、テキストレス)
    game.draw.circle(x + 70, y - 70, 26, C.white, 0.95);
    game.draw.circle(x + 70, y - 70, 16, LURE_COLORS[want]);
  }

  function drawShutter() {
    game.draw.circle(CX, CENTER_Y, 210, C.ink, 0.06);
    game.draw.circle(CX, CENTER_Y, 210 * shutterTarget + 20, C.gold, 0.5);
    game.draw.circle(CX, CENTER_Y, 210 * ringVal + 20, C.white, 0.85);
  }

  var demo = { t: 0, gx: LURE_X[1], gy: LURE_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) { newRound(); }
    if (cyc < 1.6) {
      phase = 'pick';
      var target = LURE_X[want];
      demo.gx += (target - demo.gx) * Math.min(1, dt * 6);
      demo.gy += (LURE_Y - demo.gy) * Math.min(1, dt * 6);
      demo.press = cyc > 1.2;
      if (cyc > 1.35 && picked !== want) { picked = want; phase = 'approach'; }
    } else if (cyc < 2.6) {
      phase = 'approach';
      demo.press = false;
    } else if (cyc < 4.2) {
      phase = 'shutter';
      demo.gx += (CX - demo.gx) * Math.min(1, dt * 6);
      demo.gy += (CENTER_Y + 260 - demo.gy) * Math.min(1, dt * 6);
      ringVal += ringDir * dt * 0.7;
      if (ringVal > 1) { ringVal = 1; ringDir = -1; }
      if (ringVal < 0) { ringVal = 0; ringDir = 1; }
      if (Math.abs(ringVal - shutterTarget) < 0.05 && cyc > 3.6 && !demo._shot) {
        demo._shot = true; demo.press = true;
      }
    } else {
      demo._shot = false;
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    var elapsed = game.time.elapsed;
    if (state === S.ATTRACT) {
      bg(elapsed);
      stepDemo(dt);
      drawLures(elapsed);
      drawCritter(elapsed, phase === 'pick' ? 0.3 : 1);
      if (phase === 'shutter') drawShutter();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(elapsed);
      drawLures(elapsed);
      drawCritter(elapsed, 1);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(shots + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - shots) + '匹!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(shots, { shots: shots, total: TOTAL }); else game.end.failure({ shots: shots, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      phaseT += dt;
      if (phase === 'pick') {
        if (phaseT > 2.6) { // タイムアウト: 選ばず放置
          ok = false; finished = true; hitStop = 0.3; shake = 0.25;
          game.feedback.bad(CX, LURE_Y, { text: 'MISS' });
          game.audio.play('se_bad', 0.4);
          finish();
        }
      } else if (phase === 'approach') {
        if (phaseT > 0.9) { phase = 'shutter'; phaseT = 0; ringVal = 0; ringDir = 1; }
      } else if (phase === 'shutter') {
        ringVal += ringDir * dt * 0.65;
        if (ringVal > 1) { ringVal = 1; ringDir = -1; }
        if (ringVal < 0) { ringVal = 0; ringDir = 1; }
        if (phaseT > 2.6) {
          ok = false; finished = true; hitStop = 0.3; shake = 0.25;
          game.feedback.bad(CX, CENTER_Y, { text: 'MISS' });
          game.audio.play('se_bad', 0.4);
          finish();
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg(elapsed);
    drawLures(elapsed);
    drawCritter(elapsed, phase === 'pick' ? 0.3 : 1);
    if (phase === 'shutter' && !finished) drawShutter();

    txt(shots + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.15);
    game.draw.rect(60, 150, (W - 120) * (shots / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.4], ['G4', 0.4], ['B4', 0.4], ['E5', 0.8]], { tempo: 118, wave: 'sine', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

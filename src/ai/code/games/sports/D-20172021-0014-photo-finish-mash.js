// D-20172021-0014-photo-finish-mash.js
// フォトフィニッシュ・マッシュ — ライバルの影と並走する直線コースを連打で駆け抜け、ラスト数秒の
// カウントダウン演出の中でゴールテープを切る
// 操作: 画面を連打して疾走の勢いをつなぎ、残り時間が尽きる前にゴールテープまで走り切る
// 終わり: 制限時間内にゴール距離へ到達すれば成功。時間切れで届かなければ失敗
// @mechanic: mash
// @theme: photo_finish_sprint
// 世界観: トラック競技の短距離走者が、演出付きのライバルと並走する直線コースを連打で駆け抜け、写真判定になるほどの僅差でゴールテープを狙う
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した距離
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 原色+白縁、明るい背景、光の柱と祝祭演出
  var C = {
    bg1: '#ffe14d', bg2: '#ff9a3c', track: '#e85d3c', trackLine: '#ffffff',
    runner: '#2a6bff', runnerDark: '#0a3ab0', rival: '#ffffff',
    good: '#2be07a', bad: '#ff2a4a', gold: '#ffffff', ink: '#2a1000', white: '#ffffff',
  };

  var GAME_TITLE = 'PHOTO FINISH';
  var RACE_DIST = 900;
  var TAP_IMPULSE = 92;
  var RETAIN = 0.42;
  var ROUND_LIMIT = 11;
  var PRESSURE_AT = ROUND_LIMIT - 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#2a1000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RUN_FRAMES = [
    ['.##.', '####', '.##.', '#..#'],
    ['.##.', '####', '.##.', '.##.'],
  ];

  function bg(dist) {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    game.draw.rect(0, H * 0.30, W, H * 0.5, C.track);
    for (var i = 0; i < 10; i++) {
      var lx = ((i * 130 - dist * 0.7) % (W + 130)) - 65;
      game.draw.rect(lx, H * 0.55, 60, 10, C.trackLine, 0.7);
    }
  }

  var dist, speed, rivalDist, roundClock, milestoneCalled, taps;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    dist = 0; speed = 0; rivalDist = 0; roundClock = 0; milestoneCalled = false; taps = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function drawScene() {
    var runFrame = Math.floor(game.time.elapsed * (8 + speed * 0.01)) % 2;
    var runnerX = W * 0.5;
    var rivalX = Math.max(W * 0.1, Math.min(W * 0.9, runnerX + (rivalDist - dist) * 0.6));
    game.draw.circle(rivalX, H * 0.36, 24, C.rival, 0.55);
    txt('RIVAL', rivalX, H * 0.30, 16, C.rival, 'center');
    game.draw.sprite(RUN_FRAMES[runFrame], { '#': C.runner }, runnerX, H * 0.62, 30, { anchor: 'center' });
    // finish tape progress
    var pct = Math.min(1, dist / RACE_DIST);
    game.draw.rect(60, H * 0.72, W - 120, 24, '#ffffff', 0.5);
    game.draw.rect(60, H * 0.72, (W - 120) * pct, 24, C.good);
    game.draw.line(60 + (W - 120) * 0.94, H * 0.68, 60 + (W - 120) * 0.94, H * 0.72 + 24, '#ffffff', 6);
  }

  function tapMash(x, y) {
    if (finished || ready > 0) return;
    speed += TAP_IMPULSE;
    taps++;
    dist += 4;
    game.audio.play('se_tap', 0.12);
    game.fx.burst(x, y, { color: C.runner, count: 5, speed: 160 });
    if (!milestoneCalled && dist >= RACE_DIST * 0.5) {
      milestoneCalled = true;
      game.fx.popup('HALFWAY!', W * 0.5, H * 0.5, { color: C.gold, size: 32 });
      game.audio.play('se_milestone', 0.3);
    }
    if (dist >= RACE_DIST) {
      dist = RACE_DIST;
      ok = true; finished = true; hitStop = 0.3;
      game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
      game.fx.burst(W * 0.5, H * 0.62, { color: C.good, count: 24, speed: 420 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) tapMash(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.62, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (ROUND_LIMIT + 1.2);
    if (cyc < dt || demo.t <= dt) resetDemo();
    ready = 0;
    roundClock = cyc;
    rivalDist = (roundClock / (ROUND_LIMIT - 1.5)) * RACE_DIST;
    var wantTaps = Math.floor((cyc / (ROUND_LIMIT - 1)) * 26);
    while (taps < wantTaps && !finished) tapMash(W * 0.5, H * 0.62);
    speed *= Math.pow(RETAIN, dt);
    demo.press = Math.floor(cyc * 6) % 2 === 0;
    demo.gx = W * 0.5; demo.gy = H * 0.9;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (dist === undefined) initGame();
      bg(dist);
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.ink);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(dist);
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 44, ok ? C.good : C.bad);
      txt(Math.round((dist / RACE_DIST) * 100) + '%', W / 2, H * 0.13, 28, C.ink);
      if (!ok) txt('あと' + Math.max(1, Math.round((RACE_DIST - dist) / 10)) + '!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(Math.round(dist), { dist: Math.round(dist), taps: taps });
        else game.end.failure({ dist: Math.round(dist), taps: taps });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      rivalDist = (roundClock / (ROUND_LIMIT - 1.5)) * RACE_DIST;
      speed *= Math.pow(RETAIN, dt);
      dist += speed * dt;
      if (roundClock >= PRESSURE_AT && Math.floor(roundClock * 4) !== Math.floor((roundClock - dt) * 4)) {
        game.audio.play('se_milestone', 0.15);
      }
      if (roundClock >= ROUND_LIMIT) {
        ok = false; finished = true; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(W * 0.5, H * 0.62, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg(dist);
    drawScene();

    txt(Math.round((dist / RACE_DIST) * 100) + '%', W / 2, H * 0.06, 30, C.ink);
    var pct = Math.max(0, 1 - roundClock / ROUND_LIMIT);
    var pressure = roundClock >= PRESSURE_AT;
    var lowTime = pressure && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, W - 120, 16, '#ffffff', 0.4);
    game.draw.rect(60, 150, (W - 120) * pct, 16, lowTime ? C.bad : C.ink);
    if (pressure && !finished) txt('' + Math.max(0, Math.ceil(ROUND_LIMIT - roundClock)), W / 2, H * 0.24, 46, C.bad);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 56, C.ink);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.12], ['D4', 0.12], ['E4', 0.12], ['G4', 0.2]], { tempo: 168, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

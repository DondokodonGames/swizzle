// I-Wii-0008-tidepool-hook-reflex.js
// タイドプール・フック・リフレックス — 潮だまりの竿を構え、貝の影が水面を割った瞬間だけ跳ね上げて掛ける
// 操作: 水面下の影が膨らみ、水しぶきが上がった瞬間に画面を上方向へスワイプして掛ける。早すぎても遅すぎても逃げる
// 終わり: 規定回数(3回)全て掛けられれば成功。フライング/掛け損ないが1回でもあれば失敗
// @mechanic: reaction_duel
// @theme: tidepool_shellfish_angling
// 世界観: 磯のカニの釣り人。竿を構えて潮だまりに潜む光る貝を待ち、水しぶきが弾けた瞬間だけ竿を跳ね上げて掛ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 掛けた匹数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 多色・高彩度、2〜3層背景で奥行き
  var C = {
    skyTop: '#1a5c8a', skyBot: '#3d9fc9', seaFar: '#0e4a6e', seaNear: '#1c7aa8',
    rock: '#5a4a3a', rockDark: '#3a2e22', crab: '#e8622a', crabDark: '#a83c14',
    shell: '#ffe066', splash: '#ffffff', bad: '#ff5544', good: '#4dffb0',
    gold: '#ffe066', white: '#ffffff', ink: '#0a1420',
  };

  var GAME_TITLE = 'HOOK REFLEX';
  var TOTAL = 3;
  var CX = W * 0.5, WATER_Y = H * 0.48;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var hooked, done, endWait, finished;
  var ready, hitStop, shake, rodTilt;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CRAB_SPRITE = [
    '.#....#.',
    '##.##.##',
    '.######.',
    '..####..',
  ];

  function bg() {
    game.draw.gradient(0, WATER_Y, [[0, C.skyTop], [1, C.skyBot]]);
    game.draw.gradient(WATER_Y, H - WATER_Y, [[0, C.seaNear], [1, C.seaFar]]);
    game.draw.rect(0, WATER_Y - 6, W, 10, C.splash, 0.15);
    game.draw.circle(W * 0.15, H * 0.9, 130, C.rockDark, 0.9);
    game.draw.circle(W * 0.85, H * 0.88, 160, C.rockDark, 0.9);
    game.draw.circle(W * 0.15, H * 0.86, 110, C.rock, 0.8);
    game.draw.circle(W * 0.85, H * 0.84, 140, C.rock, 0.8);
  }

  function drawCrab(tilt) {
    game.draw.sprite(CRAB_SPRITE, { '#': C.crab }, CX + tilt * 0.2, H * 0.84, 20, { anchor: 'center' });
    game.draw.line(CX + tilt * 0.2, H * 0.8, CX + tilt, H * 0.55, C.rockDark, 5);
  }

  // フェーズ: wait(待機)→telegraph(前兆0.5〜0.8秒)→window(反応窓)→resolved
  function newBite() {
    return {
      t: 0,
      waitDur: game.random(0.9, 1.7),
      telegraphDur: 0.6,
      windowDur: Math.max(0.32, 0.5 - round * 0.05),
      phase: 'wait',
      resolved: false,
    };
  }

  var round, bite;

  function initGame() {
    hooked = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; rodTilt = 0;
    round = 0; bite = newBite();
  }

  function updateBite(dt) {
    bite.t += dt;
    if (bite.phase === 'wait' && bite.t >= bite.waitDur) { bite.phase = 'telegraph'; bite.t2 = 0; }
    else if (bite.phase === 'telegraph') {
      bite.t2 = (bite.t2 || 0) + dt;
      if (bite.t2 >= bite.telegraphDur) { bite.phase = 'window'; bite.t3 = 0; game.audio.play('se_tap', 0.15); }
    } else if (bite.phase === 'window') {
      bite.t3 = (bite.t3 || 0) + dt;
      if (bite.t3 >= bite.windowDur && !bite.resolved) {
        bite.resolved = true;
        hitStop = 0.32; shake = 0.28;
        game.feedback.bad(CX, WATER_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
  }

  function resolveSwipe() {
    if (!bite || bite.resolved || ready > 0 || done || finished) return;
    if (bite.phase === 'wait' || bite.phase === 'telegraph') {
      // フライング
      bite.resolved = true;
      hitStop = 0.3; shake = 0.25;
      game.feedback.bad(CX, WATER_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
      return;
    }
    if (bite.phase === 'window') {
      bite.resolved = true;
      hooked++;
      rodTilt = -30;
      hitStop = 0.12;
      game.feedback.good(CX, WATER_Y, { text: 'GOOD', color: C.good });
      game.fx.burst(CX, WATER_Y, { color: C.gold, count: 16, speed: 320 });
      game.audio.play('se_good', 0.4);
      if (hooked === Math.ceil(TOTAL / 2)) {
        game.fx.popup('NICE!', CX, H * 0.28, { color: C.gold, size: 40 });
        game.audio.play('se_milestone', 0.5);
      }
      if (hooked >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++;
      bite = newBite();
    }
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING) return;
    if (dir === 'up') { game.audio.play('se_tap', 0.06); resolveSwipe(); }
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawBite(b) {
    if (!b) return;
    if (b.phase === 'telegraph') {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      var r = 20 + (b.t2 || 0) * 60;
      if (blink) game.draw.circle(CX, WATER_Y, r, C.shell, 0.35);
    } else if (b.phase === 'window') {
      game.draw.circle(CX, WATER_Y - 10, 34, C.splash, 0.8);
      game.draw.circle(CX, WATER_Y, 20, C.shell);
    }
  }

  var demo = { t: 0, gx: CX, gy: H * 0.6, press: false, b: null };
  function stepDemo(dt) {
    demo.t += dt;
    if (round === undefined || round === null) initGame();
    if (!demo.b) { demo.b = newBite(); demo.b.waitDur = 1.0; demo.b.windowDur = 0.5; round = 0; }
    var b = demo.b;
    b.t += dt;
    if (b.phase === 'wait' && b.t >= b.waitDur) { b.phase = 'telegraph'; b.t2 = 0; }
    else if (b.phase === 'telegraph') {
      b.t2 = (b.t2 || 0) + dt;
      if (b.t2 >= b.telegraphDur) { b.phase = 'window'; b.t3 = 0; }
    } else if (b.phase === 'window') {
      b.t3 = (b.t3 || 0) + dt;
      if (!b.acted && b.t3 > 0.12) {
        b.acted = true;
        demo.press = true; demo.gy = H * 0.38;
        game.feedback.good(CX, WATER_Y, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.25);
      }
      if (b.t3 >= b.windowDur) { demo.b = null; demo.press = false; demo.gy = H * 0.6; }
    }
    bite = b;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawBite(bite);
      drawCrab(0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawCrab(0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(hooked + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - hooked) + '匹!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hooked, { hooked: hooked, total: TOTAL });
        else game.end.failure({ hooked: hooked, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      updateBite(dt);
    }
    if (rodTilt !== 0) { rodTilt *= 0.88; if (Math.abs(rodTilt) < 1) rodTilt = 0; }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawBite(bite);
    drawCrab(rodTilt);

    txt(hooked + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (hooked / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 56, C.white);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.3], ['G4', 0.3], ['B4', 0.3], ['E5', 0.6]], { tempo: 120, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

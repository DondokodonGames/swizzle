// D-20172021-0067-stall-bell-deal-tap.js
// スタール・ベル・ディールタップ — 交渉の鈴が鳴った瞬間だけ握手して契約を成立させる
// 操作: 鈴が金色に光った瞬間だけタップする。灰色の間に押すと空振りになる
// 終わり: 規定件数の契約をまとめれば成功。ミスを3回重ねるか閉店(時間切れ)までに届かなければ失敗
// @mechanic: cooldown_tap
// @theme: stall_bell_deal
// 世界観: 目抜き通りの屋台商人が、値切り交渉の鈴が鳴った瞬間にだけ握手を交わして契約を成立させ、閉店までに規定件数をまとめる
// 残るもの: 正誤(CLEAR/GAME OVER) + まとめた契約数
// スタイル: MODERN AD-GAME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度・高コントラスト、太い縁取り、飛ぶ数字
  var STYLE = { bg: ['#1a2a3a', '#0a141e'], main: ['#ff8c00', '#3dd6c8'], accent: ['#ffe000', '#ff2d55'] };
  var C = {
    bg: STYLE.bg[0], bg2: STYLE.bg[1], bell: '#3a4a5a', bellReady: '#ffe000', bellPre: '#8a7a2a',
    good: '#2bd67b', bad: '#ff4d5e', gold: '#ffe000', ink: '#ffffff', white: '#ffffff',
  };

  var GAME_TITLE = 'DEAL BELL';
  var CX = W * 0.5, CY = H * 0.42;
  var TARGET = 6;
  var MAX_MISS = 3;
  var TIME_LIMIT = 12;
  var READY_WIN = 0.38;
  var PRE_WARN = 0.18;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var VENDOR = ['.##.', '####', '.##.', '#..#'];
  var BELL = ['..#..', '.###.', '.###.', '#####'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.6);
    game.draw.rect(0, 0, W, H, '#ff8c00', pulse * 0.3);
    game.draw.sprite(VENDOR, { '#': C.gold }, W * 0.18, H * 0.88, 10, { anchor: 'center' });
  }

  var deals, misses, timeLeft, done, endWait, finished, ready, hitStop, shake;
  var cyc, cycLen, bellState;

  function scheduleCycle() {
    cycLen = 0.9 + game.random(0, 0.5);
  }

  function initGame() {
    deals = 0; misses = 0; timeLeft = TIME_LIMIT;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    cyc = 0; bellState = 'cool';
    scheduleCycle();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function drawBell(preScale) {
    var color = bellState === 'ready' ? C.bellReady : (bellState === 'pre' ? C.bellPre : C.bell);
    var scale = bellState === 'ready' ? 1.15 : 1.0;
    game.draw.circle(CX, CY, 150 * scale, color, 0.9);
    game.draw.sprite(BELL, { '#': '#2a2016' }, CX, CY, 30 * scale, { anchor: 'center' });
  }

  function tickBell(dt) {
    cyc += dt;
    var readyStart = cycLen;
    var preStart = cycLen - PRE_WARN;
    if (cyc < preStart) bellState = 'cool';
    else if (cyc < readyStart) bellState = 'pre';
    else if (cyc < readyStart + READY_WIN) {
      if (bellState !== 'ready') { bellState = 'ready'; game.audio.play('se_milestone', 0.3); }
    } else {
      bellState = 'cool';
      cyc = 0; scheduleCycle();
    }
  }

  function handleTap(x, y) {
    if (bellState === 'ready') {
      deals++;
      game.feedback.good(x, y, { text: 'GOOD', color: C.good });
      game.fx.burst(x, y, { color: C.gold, count: 18, speed: 380 });
      game.audio.play('se_coin', 0.4);
      if (deals === Math.ceil(TARGET / 2)) game.fx.popup('NICE', CX, CY - 220, { color: C.gold, size: 34 });
      cyc = 0; bellState = 'cool'; scheduleCycle();
      if (deals >= TARGET) {
        ok = true; finished = true; hitStop = 0.3;
        game.audio.play('se_success', 0.5);
        finish();
      }
    } else {
      misses++;
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
      if (misses >= MAX_MISS) { ok = false; finished = true; hitStop = 0.3; shake = 0.25; finish(); }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && hitStop <= 0 && !finished) handleTap(x, y);
  });

  var demo = { t: 0, gx: CX, gy: H * 0.95, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var loopCyc = demo.t % 3.4;
    if (loopCyc < dt || demo.t <= dt) initGame();
    tickBell(dt);
    demo.gx = CX; demo.gy = H * 0.95;
    demo.press = false;
    if (bellState === 'ready' && deals < TARGET) {
      demo.press = true;
      handleTap(CX, CY);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (deals === undefined) initGame();
      stepDemo(dt);
      bg();
      drawBell();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBell();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(deals + ' / ' + TARGET, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(0, TARGET - deals) + '件!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(deals, { deals: deals, target: TARGET, misses: misses });
        else game.end.failure({ deals: deals, target: TARGET, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      tickBell(dt);
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; ok = false; finished = true; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(CX, CY, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBell();

    txt(deals + ' / ' + TARGET, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, '#0a141e', 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    for (var m = 0; m < MAX_MISS; m++) {
      game.draw.circle(80 + m * 40, 190, 12, m < misses ? C.bad : '#0a141e');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G3', 0.2], ['B3', 0.2], ['D4', 0.2], ['G4', 0.4]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

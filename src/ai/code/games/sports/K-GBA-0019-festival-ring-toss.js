// K-GBA-0019-festival-ring-toss.js
// 夜市の玉入れ — 合図の灯りに合わせて玉を弾き上げ、ちょうど良い勢いで輪の的に入れる
// 操作: 灯りがついた合図の直後に、玉から上へ指を弾く(フリックの速さが弱すぎ/強すぎだと外れる)
// 終わり: 規定回数(5回)全て的に入れれば成功。合図なしの早弾き/勢い違い/出遅れで失敗
// @mechanic: flick_launch
// @theme: night_market_ring_toss
// 世界観: 夜市の的当て屋台。灯りが灯った合図の直後だけ、ちょうど良い勢いで玉を弾き上げて輪に通す出し物
// 残るもの: 正誤(CLEAR/GAME OVER) + 的に入れた回数
// スタイル: 90s HANDHELD COLOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 低彩度・少色、小画面前提の太い形、密度を抑える
  var C = {
    sky1: '#4a5a78', sky2: '#2e3a52', stall: '#7a5a3a', stallDark: '#4a3520',
    ball: '#e8c04a', hoop: '#b04a3a', hoopLit: '#ffd85a',
    good: '#6ac47a', bad: '#c4524a', gold: '#e8c04a', white: '#eef0e6', ink: '#181a16',
  };

  var GAME_TITLE = 'RING TOSS';
  var TOTAL = 5;
  var CX = W * 0.5, BALL_Y = H * 0.68, HOOP_Y = H * 0.32;
  var WAIT_MIN = 0.6, WAIT_MAX = 1.2;
  var INPUT_WIN = 1.0;
  var GOOD_MIN = 900, GOOD_MAX = 2600;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var STALL_SPRITE = ['#....#', '######', '.####.', '.####.', '.####.'];

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.sky1], [1, C.sky2]]);
    game.draw.sprite(STALL_SPRITE, { '#': C.stall }, CX, H * 0.5, 34, { anchor: 'center' });
    game.draw.circle(CX, HOOP_Y, 100, C.stallDark, 0.4);
    game.draw.rect(0, H * 0.84, W, H * 0.16, C.stallDark);
  }

  var round, cued, roundT, cueTime, resolved, ballY, flightT, flying;
  var pressX, pressY, pressT, pressing;
  var passed, done, endWait, finished;
  var ready, hitStop, shake, flashState, missReason;

  function newRound() {
    roundT = 0; cueTime = game.random(WAIT_MIN, WAIT_MAX); cued = false;
    resolved = false; ballY = BALL_Y; flying = false; flightT = 0;
  }

  function initGame() {
    round = 0; passed = 0; pressing = false; missReason = '';
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; flashState = 0;
    newRound();
  }

  function evalFlick(dx, dy, dt) {
    if (state !== S.PLAYING || finished || done || ready > 0 || hitStop > 0 || resolved) return;
    if (!cued) return; // 合図前は無視(暴発防止だが失格にはしない)
    if (dy > -60) return; // 上方向の弾きでなければ無視
    var speed = Math.hypot(dx, dy) / Math.max(0.03, dt);
    resolved = true;
    if (speed >= GOOD_MIN && speed <= GOOD_MAX) {
      passed++; hitStop = 0.1; flashState = 1; flying = true; flightT = 0;
      game.feedback.good(CX, HOOP_Y, { text: 'IN!', color: C.good });
      game.fx.burst(CX, HOOP_Y, { color: C.hoopLit, count: 18, speed: 320 });
      game.audio.play('se_good', 0.4);
      if (passed === Math.ceil(TOTAL / 2)) game.fx.popup(passed + ' / ' + TOTAL, CX, HOOP_Y - 150, { color: C.gold, size: 40 });
      if (passed >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++; newRound();
    } else {
      missReason = speed < GOOD_MIN ? '弱い!' : '強い!';
      flashState = -1; hitStop = 0.3;
      game.feedback.bad(CX, BALL_Y, { text: missReason });
      shake = 0.25;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    game.audio.play('se_tap', 0.04);
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    pressX = x; pressY = y; pressT = game.time.elapsed; pressing = true;
    game.audio.play('se_tap', 0.06);
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !pressing) return;
    pressing = false;
    game.audio.play('se_tap', 0.05);
    evalFlick(x - pressX, y - pressY, game.time.elapsed - pressT);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepGame(dt) {
    if (flying) {
      flightT += dt;
      ballY = BALL_Y + (HOOP_Y - BALL_Y) * Math.min(1, flightT / 0.35);
      return;
    }
    if (finished) return;
    roundT += dt;
    if (!cued && roundT >= cueTime) { cued = true; game.audio.play('se_milestone', 0.3); }
    if (!resolved && cued && roundT >= cueTime + INPUT_WIN) {
      resolved = true; missReason = '出遅れ!';
      flashState = -1; hitStop = 0.3;
      game.feedback.bad(CX, BALL_Y, { text: 'MISS' });
      shake = 0.25;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  function drawScene() {
    var lit = cued && !resolved;
    if (lit) {
      var blink = Math.floor(game.time.elapsed * 9) % 2 === 0;
      game.draw.circle(CX, HOOP_Y, 130, blink ? C.hoopLit : C.hoop, 0.6);
    } else {
      game.draw.circle(CX, HOOP_Y, 130, C.hoop, 0.45);
    }
    game.draw.circle(CX, HOOP_Y, 95, C.sky2);
    if (flashState !== 0) game.draw.circle(CX, ballY, 90, flashState > 0 ? C.good : C.bad, 0.3);
    game.draw.circle(CX, ballY, 34, C.ball);
  }

  var demo = { t: 0, gx: CX, gy: BALL_Y, press: false, drt: 0, dCue: 0.7, dDone: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.2;
    if (cyc < dt || demo.t <= dt) { demo.drt = 0; demo.dDone = false; flying = false; ballY = BALL_Y; }
    demo.drt += dt;
    roundT = demo.drt; cueTime = demo.dCue; cued = demo.drt >= demo.dCue; resolved = demo.dDone;
    if (!demo.dDone && cued && demo.drt < demo.dCue + 0.3) {
      if (demo.drt < demo.dCue + 0.05) { demo.gx = CX; demo.gy = BALL_Y; demo.press = true; }
      else if (demo.drt < demo.dCue + 0.2) { demo.gy = BALL_Y - (demo.drt - demo.dCue - 0.05) / 0.15 * 220; demo.press = true; }
      else { demo.dDone = true; demo.press = false; flying = true; flightT = 0; }
    }
    if (flying) { flightT += dt; ballY = BALL_Y + (HOOP_Y - BALL_Y) * Math.min(1, flightT / 0.35); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (roundT === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.1, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + '/' + TOTAL : '-'), W / 2, H * 0.14, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.1, 48, ok ? C.good : C.bad);
      txt(passed + ' / ' + TOTAL, W / 2, H * 0.16, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - passed) + '回!', W / 2, H * 0.21, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(passed, { passed: passed, total: TOTAL });
        else game.end.failure({ passed: passed, total: TOTAL });
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
    if (flashState !== 0) flashState *= 0.9;

    bg();
    drawScene();

    txt(passed + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 14, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (passed / TOTAL), 14, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);

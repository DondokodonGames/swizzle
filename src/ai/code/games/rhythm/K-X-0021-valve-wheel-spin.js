// K-X-0021-valve-wheel-spin.js
// バルブホイールスピン — 巨大な水門の弁を、時間内にできるだけ何周も指でなぞって回す
// 操作: 中央の弁の周りを指でなぞるように円を描き続けて回す。速く回すほど周回が伸びる
// 終わり: 時間切れ時点の周回数が規定(5周)以上なら成功。未満なら失敗
// @mechanic: rotate_gesture
// @theme: valve_wheel_spin
// 世界観: 水路の奥にある巨大な手動水門。仕組み師が弁の縁を指でなぞって回し続け、時間内に水路を開ききる
// 残るもの: 正誤(CLEAR/GAME OVER) + 回した周回数とSCORE
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 彩度高めの中間色+濃い縁取り、金属質のハイライト
  var C = {
    bg: '#16324a', bg2: '#0c2033', main: '#3fb8c4', rim: '#1c6070',
    accent: '#ffcf3f', good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400',
    white: '#f2f8fb', ink: '#081420',
  };

  var GAME_TITLE = 'VALVE SPIN';
  var CX = W * 0.5, CY = H * 0.42;
  var RW = 260;
  var TIME_LIMIT = 10;
  var TARGET_LAPS = 5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var pressing, lastAngle, totalAngle, laps, comboMul, lastLapT, score, playT;
  var done, endWait, finished, ready, hitStop, shake, flashWheel;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var WHEEL_A = ['...#...', '...#...', '...#...', '#######', '...#...', '...#...', '...#...'];
  var WHEEL_B = ['#.....#', '.#...#.', '..#.#..', '...#...', '..#.#..', '.#...#.', '#.....#'];
  var OPERATOR = ['.##.', '####', '.##.', '####', '#..#'];

  function angleAt(x, y) { return Math.atan2(y - CY, x - CX); }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 4; i++) game.draw.rect(0, H * 0.7 + i * 40, W, 10, '#ffffff08');
  }

  function drawWheel(bob, hot) {
    game.draw.circle(CX, CY, RW + 24, C.rim, 0.5);
    game.draw.circle(CX, CY, RW, hot ? C.white : C.rim, 1);
    game.draw.circle(CX, CY, RW - 26, C.bg, 1);
    var frame = Math.floor((totalAngle || 0) / (Math.PI / 2)) % 2 === 0 ? WHEEL_A : WHEEL_B;
    game.draw.sprite(frame, { '#': hot ? C.accent : C.main }, CX, CY + bob, 18, { anchor: 'center' });
  }

  function drawOperator() {
    game.draw.sprite(OPERATOR, { '#': C.accent }, W * 0.5, H * 0.86 + Math.sin(game.time.elapsed * 3) * 6, 20, { anchor: 'center' });
  }

  function initGame() {
    pressing = false; lastAngle = 0; totalAngle = 0; laps = 0; comboMul = 1; lastLapT = -10;
    score = 0; playT = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; flashWheel = 0;
  }

  function checkLap() {
    var newLaps = Math.floor(totalAngle / (Math.PI * 2));
    if (newLaps > laps) {
      laps = newLaps;
      var gap = playT - lastLapT;
      comboMul = gap < 1.4 ? Math.min(4, comboMul + 1) : 1;
      lastLapT = playT;
      score += 100 * comboMul;
      flashWheel = 0.15;
      game.feedback.good(CX, CY, { text: 'NICE', color: C.gold, count: comboMul >= 3 ? 20 : 10 });
      game.fx.popup('x' + comboMul, CX, CY - 320, { color: C.gold, size: 34 });
      game.audio.play('se_milestone', 0.35);
      if (laps === TARGET_LAPS) game.fx.popup('CLEAR!', CX, CY - 380, { color: C.good, size: 40 });
    }
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    pressing = true; lastAngle = angleAt(x, y);
    game.audio.play('se_tap', 0.04);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !pressing || ready > 0 || finished) return;
    if (Math.random() < 0.08) game.audio.play('se_tap', 0.02);
    var a = angleAt(x, y);
    var d = a - lastAngle;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    totalAngle += Math.abs(d);
    lastAngle = a;
    checkLap();
  });
  game.onRelease(function() {
    if (state === S.PLAYING && pressing) game.audio.play('se_tap', 0.02);
    pressing = false;
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

  var demo = { t: 0, gx: CX + RW, gy: CY, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.4;
    if (cyc < dt || demo.t <= dt) { totalAngle = 0; laps = 0; }
    var ang = (cyc / 2.4) * Math.PI * 2 - Math.PI / 2;
    demo.gx = CX + Math.cos(ang) * (RW - 10);
    demo.gy = CY + Math.sin(ang) * (RW - 10);
    demo.press = true;
    totalAngle = (cyc / 2.4) * Math.PI * 2;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (laps === undefined) initGame();
      bg();
      stepDemo(dt);
      drawWheel(0, true);
      drawOperator();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawWheel(0, false);
      drawOperator();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(laps + ' / ' + TARGET_LAPS, W / 2, H * 0.13, 32, C.gold);
      txt('SCORE ' + score, W / 2, H * 0.18, 24, C.white);
      if (!ok && TARGET_LAPS - laps <= 1) txt('あと1周!', W / 2, H * 0.23, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(score, { laps: laps, target: TARGET_LAPS });
        else game.end.failure({ laps: laps, target: TARGET_LAPS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      playT += dt;
      if (playT >= TIME_LIMIT) {
        finished = true;
        ok = laps >= TARGET_LAPS;
        hitStop = ok ? 0.15 : 0.3; shake = ok ? 0 : 0.25; flashWheel = 0.2;
        if (ok) game.feedback.good(CX, CY, { text: 'CLEAR' });
        else game.feedback.bad(CX, CY, { text: 'TIME UP' });
        finish();
      }
    }
    if (flashWheel > 0) flashWheel -= dt;
    if (shake > 0) shake -= dt;

    bg();
    drawWheel(0, flashWheel > 0);
    drawOperator();

    txt(laps + ' / ' + TARGET_LAPS, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, (TIME_LIMIT - playT) / TIME_LIMIT), 16, C.accent);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.62, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.25], ['C4', 0.25], ['E4', 0.25], ['A4', 0.5]], { tempo: 150, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

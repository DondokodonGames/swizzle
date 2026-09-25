// J-N641-0008-stool-stack-hold.js
// スツールタワー・ホールド — 積み上げた木製スツールの頂点でバランス芸を披露し、崩れず耐えた秒数を競う
// 操作: 台が左右どちらかに傾いたら、傾いた側と逆のボタンをタップして重心を戻す
// 終わり: 規定時間バランスを保てば成功。傾きが限界を超えて崩れれば失敗
// @mechanic: balance
// @theme: stool_tower_balance
// 世界観: サーカス見習いの曲芸師が積み上げた木製スツールの頂点に立ち、風にあおられても崩れずバランス芸を見せ切る
// 残るもの: 正誤(CLEAR/GAME OVER) + 耐えた秒数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 原色+白縁、光の柱、祝祭演出
  var C = {
    bg: '#fff3d6', bg2: '#ffd76b', pole: '#8a5a2b', poleDark: '#5e3a18',
    stool: '#e8592a', stoolDark: '#a8391a', performer: '#2a6be8', performerDark: '#173f8f',
    good: '#2bd67b', bad: '#ff4d5e', gold: '#ffd400', ink: '#3a2410', white: '#ffffff',
  };

  var GAME_TITLE = 'STOOL BALANCE';
  var HOLD_TARGET = 12;
  var TILT_MAX = 42;
  var TILT_FAIL = 60;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#7a4a12', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PERF_A = ['.####.', '##..##', '.####.', '###.##', '.####.', '##..##'];
  var PERF_B = ['.####.', '##..##', '.####.', '##.###', '.####.', '###.##'];

  var STOOL_TOP_Y = H * 0.42;
  var STOOL_W = 170, STOOL_H = 46, STOOL_GAP = 12;
  var N_STOOLS = 5;

  var tilt, tiltVel, timeHeld, gustTimer, gustDir, gustWarn;
  var done, endWait, finished, ready, hitStop, shake;

  function bg() {
    var pulse = 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.4);
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.4);
    for (var i = 0; i < 3; i++) {
      var lx = W * (0.2 + i * 0.3);
      var flick = 0.06 + 0.06 * Math.abs(Math.sin(game.time.elapsed * 2 + i));
      game.draw.rect(lx - 40, 0, 80, H * 0.5, C.gold, flick);
    }
  }

  function stackX(t) {
    // t in [-1,1] tilt amount -> horizontal offset of top stool relative to base
    return W / 2 + t * 130;
  }

  function drawTower(tiltVal, performerFrame, cx, cyOffset) {
    var baseX = W / 2, baseY = H * 0.82;
    game.draw.rect(baseX - STOOL_W * 0.6, baseY, STOOL_W * 1.2, 30, C.poleDark);
    var offsetPerLevel = (tiltVal / TILT_FAIL) * 22;
    for (var i = 0; i < N_STOOLS; i++) {
      var lvl = N_STOOLS - 1 - i;
      var y = baseY - (i + 1) * (STOOL_H + STOOL_GAP);
      var x = baseX + offsetPerLevel * (i + 1) * 0.6;
      var col = i % 2 === 0 ? C.stool : C.stoolDark;
      game.draw.rect(x - STOOL_W / 2, y, STOOL_W, STOOL_H, col);
      game.draw.rect(x - STOOL_W / 2, y, STOOL_W, 6, '#ffffff', 0.3);
    }
    var topY = baseY - N_STOOLS * (STOOL_H + STOOL_GAP) - 10;
    var topX = baseX + offsetPerLevel * N_STOOLS * 0.6;
    var bob = Math.sin(game.time.elapsed * 3) * 6;
    var frame = performerFrame ? PERF_B : PERF_A;
    game.draw.sprite(frame, { '#': C.performer }, topX, topY - 40 + bob, 18, { anchor: 'center' });
    return { topX: topX, topY: topY };
  }

  function initGame() {
    tilt = 0; tiltVel = 0; timeHeld = 0;
    gustTimer = 1.2; gustDir = 0; gustWarn = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function counterPush(side) {
    if (finished || ready > 0) return;
    tiltVel += side * -220;
    game.audio.play('se_tap', 0.15);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) {
      var side = x < W / 2 ? -1 : 1;
      counterPush(side);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function stepPhysics(dt) {
    // gust logic
    gustTimer -= dt;
    if (gustWarn > 0) {
      gustWarn -= dt;
      if (gustWarn <= 0) {
        tiltVel += gustDir * 130;
        game.audio.play('se_tap', 0.08);
      }
    } else if (gustTimer <= 0) {
      gustDir = Math.random() < 0.5 ? -1 : 1;
      gustWarn = 0.7;
      gustTimer = 1.6 + Math.random() * 0.8;
    }
    tiltVel *= Math.pow(0.5, dt);
    tilt += tiltVel * dt;
    tilt = Math.max(-90, Math.min(90, tilt));
    if (Math.abs(tilt) >= TILT_FAIL) {
      finished = true; ok = false; hitStop = 0.4; shake = 0.35;
      game.feedback.bad(W / 2, STOOL_TOP_Y, { text: 'MISS' });
      game.audio.play('se_break', 0.5);
      finish();
      return;
    }
    timeHeld += dt;
    if (Math.floor(timeHeld) > Math.floor(timeHeld - dt) && Math.floor(timeHeld) === Math.floor(HOLD_TARGET / 2)) {
      game.fx.popup('NICE', W / 2, STOOL_TOP_Y - 100, { color: C.gold, size: 34 });
      game.audio.play('se_milestone', 0.3);
    }
    if (timeHeld >= HOLD_TARGET) {
      finished = true; ok = true; hitStop = 0.3;
      game.feedback.good(W / 2, STOOL_TOP_Y, { text: 'CLEAR', color: C.good });
      game.fx.burst(W / 2, STOOL_TOP_Y, { color: C.gold, count: 22, speed: 420 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  var demo = { t: 0, gx: W * 0.2, gy: H * 0.86, press: false };
  var demoTilt = 0, demoVel = 0;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.0;
    if (cyc < dt || demo.t <= dt) { demoTilt = 0; demoVel = 30; }
    demoVel *= Math.pow(0.6, dt);
    demoTilt += demoVel * dt;
    if (Math.abs(demoTilt) > 24) { demoVel = -demoVel * 0.9; demo.press = true; }
    else demo.press = false;
    tilt = demoTilt;
    demo.gx = demoTilt > 0 ? W * 0.22 : W * 0.78;
    demo.gy = H * 0.88;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (tilt === undefined) initGame();
      stepDemo(dt);
      bg();
      drawTower(tilt, Math.sin(demo.t * 6) > 0, W / 2, 0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? Math.floor(game.best) + 's' : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTower(tilt, false, W / 2, 0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(timeHeld.toFixed(1) + 's' + ' / ' + HOLD_TARGET + 's', W / 2, H * 0.14, 26, C.gold);
      if (!ok) txt('あと' + Math.max(0, (HOLD_TARGET - timeHeld)).toFixed(1) + 's!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(Math.round(timeHeld * 10), { heldSec: Number(timeHeld.toFixed(1)) });
        else game.end.failure({ heldSec: Number(timeHeld.toFixed(1)) });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepPhysics(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    var warnAlpha = gustWarn > 0 ? 0.3 + 0.3 * Math.sin(game.time.elapsed * 20) : 0;
    if (gustWarn > 0) {
      game.draw.rect(gustDir > 0 ? W * 0.62 : 0, H * 0.2, W * 0.38, H * 0.5, '#ffffff', warnAlpha);
    }
    drawTower(tilt, false, W / 2, 0);

    txt(timeHeld.toFixed(1) + 's' + ' / ' + HOLD_TARGET + 's', W / 2, H * 0.06, 28, C.ink);
    var barW = W - 120;
    var pct = Math.min(1, Math.abs(tilt) / TILT_FAIL);
    game.draw.rect(60, 150, barW, 16, '#e8c98a', 1);
    game.draw.rect(60, 150, barW * (1 - pct), 16, pct > 0.65 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.25], ['E4', 0.25], ['G4', 0.25], ['C5', 0.5]], { tempo: 132, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

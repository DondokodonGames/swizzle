// I-GBA-0055-lantern-doll-upright.js
// ランタンドール立て直し — 夜店の棚で転んだ紙提灯人形を、左右交互に押して立たせる
// 操作: 倒れた人形の下部を、左右交互にタップして揺すり起こす(片側連打では起きない)
// 終わり: 起き上がって静止すれば成功。時間内に立てられなければ失敗
// @mechanic: alternate_tap
// @theme: lantern_doll_upright
// 世界観: 夜店の景品棚。紙張りのランタン人形が横倒しになっている。閉店前に交互の揺すりだけで立て直す
// 残るもの: 正誤(CLEAR/GAME OVER) + 立て直しにかかった揺すり回数
// スタイル: 90s HANDHELD COLOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 低彩度・少色、小画面前提の太い形
  var C = {
    bg: '#2c2440', bg2: '#1a1430', shelf: '#4a3860', shelfEdge: '#241c34',
    doll: '#ffb84d', dollDark: '#c47a20', paper: '#ff6b6b', paperDark: '#a83c3c',
    good: '#7de37d', bad: '#ff5c6a', gold: '#ffe14d', white: '#f5eef8', ink: '#0e0a16',
  };

  var GAME_TITLE = 'LANTERN UPRIGHT';
  var CX = W * 0.5, BASE_Y = H * 0.58;
  var NEEDED_SWINGS = 6;
  var LIMIT = 12.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var angle, vel, lastSide, swings, timeLeft, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DOLL_UP = ['..##..', '.####.', '##..##', '.####.', '.#..#.', '##..##'];
  var DOLL_LEAN = ['.##...', '####..', '##.##.', '####..', '##..#.', '###..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 4; i++) game.draw.line(0, H * (0.3 + i * 0.06), W, H * (0.3 + i * 0.06), '#ffffff08', 3);
    game.draw.rect(W * 0.12, BASE_Y + 90, W * 0.76, 26, C.shelfEdge);
    game.draw.rect(W * 0.12, BASE_Y + 76, W * 0.76, 16, C.shelf);
    for (var j = 0; j < 5; j++) game.draw.circle(W * (0.2 + j * 0.16), H * 0.2, 30, C.paper, 0.25);
  }

  function drawDoll(a, wobbleAmt) {
    var frame = Math.abs(a) > 25 ? DOLL_LEAN : DOLL_UP;
    var flip = a < 0;
    game.draw.circle(CX + a * 0.5, BASE_Y + 55, 46, C.dollDark, 0.4);
    game.draw.sprite(flip ? DOLL_LEAN : DOLL_UP, { '#': a < -25 ? C.dollDark : C.doll }, CX + a * 1.6, BASE_Y - Math.abs(a) * 0.3, 20, { anchor: 'center', flipX: flip });
    game.draw.circle(CX + a * 1.6, BASE_Y - 95 - Math.abs(a) * 0.3, 26, C.paper);
    game.draw.line(CX + a * 1.6, BASE_Y - 115 - Math.abs(a) * 0.3, CX + a * 1.6, BASE_Y - 140 - Math.abs(a) * 0.3, C.paperDark, 4);
  }

  function initGame() {
    angle = 62; vel = 0; lastSide = 0; swings = 0; timeLeft = LIMIT;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function pushSide(side) {
    if (finished || done || ready > 0) return;
    game.audio.play('se_tap', 0.15);
    if (side === lastSide) {
      // 同じ側の連打は勢いを殺す(揺すりにならない)
      vel *= 0.3;
      game.feedback.bad(CX + angle * 1.6, BASE_Y, { text: 'MISS', shake: 4 });
      return;
    }
    lastSide = side;
    swings++;
    var power = 16 + swings * 1.4;
    vel += side === 'right' ? power : -power;
    game.feedback.good(CX + angle * 1.6, BASE_Y - 80, { color: C.gold, count: 6 });
    if (swings === Math.ceil(NEEDED_SWINGS / 2)) {
      game.fx.popup('あと半分!', CX, BASE_Y - 220, { color: C.gold, size: 36 });
      game.audio.play('se_milestone', 0.35);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) pushSide(x < CX ? 'left' : 'right');
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function stepPhysics(dt) {
    // 減衰振動: 揺すりで振幅を増やし、直立に近づけばクリア
    angle += vel * dt;
    vel += (0 - angle) * dt * 2.2;
    vel *= 0.985;
    if (Math.abs(angle) > 78) { angle = angle > 0 ? 78 : -78; vel *= -0.4; }
  }

  var demo = { t: 0, gx: CX - 120, gy: H * 0.85, press: false, side: 'left' };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) { angle = 62; vel = 0; lastSide = 0; swings = 0; }
    var pushEvery = 0.55;
    var idx = Math.floor(cyc / pushEvery);
    var within = cyc - idx * pushEvery;
    var doPush = within < dt && idx < NEEDED_SWINGS && idx >= 0;
    demo.side = idx % 2 === 0 ? 'left' : 'right';
    demo.gx = CX + (demo.side === 'left' ? -160 : 160);
    demo.press = within < 0.18;
    if (doPush) pushSide(demo.side);
    if (cyc > 4.0) { angle *= 0.9; vel *= 0.9; }
    stepPhysics(dt);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (angle === undefined) initGame();
      bg();
      stepDemo(dt);
      drawDoll(angle);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawDoll(ok ? 0 : angle);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(swings + ' 回', W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(swings, { swings: swings });
        else game.end.failure({ swings: swings });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      stepPhysics(dt);
      if (Math.abs(angle) < 4 && Math.abs(vel) < 6 && swings >= 3) {
        ok = true; finished = true; hitStop = 0.3;
        game.feedback.good(CX, BASE_Y, { text: 'CLEAR', color: C.good });
        game.fx.burst(CX, BASE_Y - 80, { color: C.gold, count: 20, speed: 380 });
        game.audio.play('se_success', 0.5);
        finish();
      } else if (timeLeft <= 0) {
        ok = false; finished = true; hitStop = 0.35;
        shake = 0.3;
        game.feedback.bad(CX, BASE_Y, { text: 'MISS' });
        game.audio.play('se_failure', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawDoll(angle);

    txt(swings + ' / ' + NEEDED_SWINGS, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / LIMIT), 16, timeLeft < 3 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.4], ['C4', 0.4], ['E4', 0.4], ['A4', 0.8]], { tempo: 118, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

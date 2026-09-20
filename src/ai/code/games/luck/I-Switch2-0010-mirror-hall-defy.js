// I-Switch2-0010-mirror-hall-defy.js
// ミラーホールディファイ — 鏡張りの遊戯場で、鏡の中の相方と同じ動きにならないよう、あえて逆方向へ払う
// 操作: 鏡の中の影が払った方向を見て、それとは違う方向へスワイプする
// 終わり: 規定回数(5回)全て鏡と違う方向へ払えれば成功。同じ方向に払ってしまえば失敗
// @mechanic: swipe_direction
// @theme: carnival_mirror_hall_defiance
// 世界観: 夜の縁日にある鏡張りの遊戯場。鏡の中の影がふざけて同じ動きを迫ってくるので、あえて逆へ払って鏡を出し抜く遊び
// 残るもの: 正誤(CLEAR/GAME OVER) + 出し抜けた回数
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 遠近感を帯の間隔と縮尺で疑似表現、鏡面のような反射グラデーション
  var C = {
    bg: '#101828', bg2: '#1a2438', floor: '#243450', floorEdge: '#0c1420',
    mirror: '#8ad0ff', mirrorDark: '#2a4a6a', good: '#4dff8a', bad: '#ff4d5e',
    gold: '#ffd400', white: '#eef6ff', ink: '#04080c',
  };

  var GAME_TITLE = 'MIRROR DEFY';
  var TOTAL = 5;
  var CX = W * 0.5, CY = H * 0.42;
  var DIRS = ['up', 'down', 'left', 'right'];
  var VEC = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var wins, done, endWait, finished;
  var ready, hitStop, shake;
  var chal; // {dir, t, dur, resolved}

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SHADE = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) {
      var yy = H * (0.55 + i * 0.06);
      game.draw.line(0, yy, W, yy, C.floorEdge, 3);
    }
    game.draw.rect(CX - 240, CY - 260, 480, 520, C.mirrorDark);
    game.draw.rect(CX - 220, CY - 240, 440, 480, C.floor);
  }

  function newChal(round) {
    return { dir: DIRS[Math.floor(Math.random() * DIRS.length)], t: 0, dur: Math.max(1.0, 1.6 - round * 0.1), resolved: false };
  }

  function initGame() {
    wins = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    chal = newChal(0);
  }

  function resolveSwipe(dir) {
    if (!chal || chal.resolved || ready > 0 || done || finished) return;
    chal.resolved = true;
    var correct = dir !== chal.dir;
    hitStop = correct ? 0.1 : 0.3;
    if (correct) {
      wins++;
      game.feedback.good(CX, CY, { text: 'GOOD', color: C.good });
      game.fx.burst(CX, CY, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_good', 0.4);
      if (wins === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, CY - 300, { color: C.gold, size: 40 });
    } else {
      game.feedback.bad(CX, CY, { text: 'MISS' });
      shake = 0.25;
      game.audio.play('se_bad', 0.4);
    }
    if (!correct) { ok = false; finished = true; finish(); return; }
    if (wins >= TOTAL) { ok = true; finished = true; finish(); return; }
    chal = newChal(wins);
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING) return;
    game.audio.play('se_tap', 0.05);
    resolveSwipe(dir);
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

  function drawScene(c) {
    game.draw.sprite(SHADE, { '#': C.white }, CX, CY + 120, 24, { anchor: 'center' });
    game.draw.sprite(SHADE, { '#': C.mirror }, CX, CY - 60, 24, { anchor: 'center', flipY: true });
    if (!c) return;
    var p = c.t / c.dur;
    var v = VEC[c.dir];
    // telegraph: 0.5-0.8s前から矢印が伸びて点滅
    var arrowLen = 40 + p * 140;
    var blink = p > 0.35 && Math.floor(game.time.elapsed * 10) % 2 === 0;
    var ax = CX - 60 + v.x * arrowLen, ay = CY - 60 + v.y * arrowLen;
    game.draw.line(CX - 60, CY - 60, ax, ay, blink ? C.bad : C.mirror, 10);
    game.draw.circle(ax, ay, 18, blink ? C.bad : C.mirror);
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false, c: null };
  function stepDemo(dt) {
    demo.t += dt;
    if (!demo.c) demo.c = newChal(0);
    demo.c.t += dt;
    chal = demo.c;
    var p = demo.c.t / demo.c.dur;
    if (p > 0.7 && !demo.pressed) {
      demo.pressed = true; demo.press = true;
      var opp = { up: 'down', down: 'up', left: 'right', right: 'left' }[demo.c.dir];
      var v = VEC[opp];
      demo.gx = CX + v.x * 200; demo.gy = H * 0.86 + v.y * 100;
      game.feedback.good(CX, CY, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.25);
    }
    if (p >= 1) { demo.c = null; demo.press = false; demo.pressed = false; demo.gx = CX; demo.gy = H * 0.86; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene(chal);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
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
      drawScene(null);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(wins + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - wins) + '回!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(wins, { wins: wins, total: TOTAL });
        else game.end.failure({ wins: wins, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      chal.t += dt;
      if (chal.t / chal.dur >= 1 && !chal.resolved) {
        chal.resolved = true;
        hitStop = 0.3;
        game.feedback.bad(CX, CY, { text: 'MISS' });
        shake = 0.25;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawScene(chal);

    txt(wins + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (wins / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.62, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['F4', 0.4], ['A4', 0.4], ['C5', 0.8]], { tempo: 108, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

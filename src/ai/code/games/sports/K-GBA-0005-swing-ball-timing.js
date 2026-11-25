// K-GBA-0005-swing-ball-timing.js
// スイングタイミング — 振り子のように迫る球を、ストライクラインでバットを合わせて打ち返す
// 操作: 弧を描いて迫る球がストライクラインに重なった瞬間タップしてバットを振る
// 終わり: 6球すべてジャストタイミングで打ち返せば成功。早すぎ/遅すぎ/空振りは失敗
// @mechanic: timing_one_shot
// @theme: pendulum_batting_cage
// 世界観: 振り子式投球マシンのバッティングケージ。弧を描いて迫る球をジャストミートで打ち返す一発勝負
// 残るもの: 正誤(CLEAR/GAME OVER) + 打ち返した球数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 中彩度の3〜4色、細やかなグラデーション、視認性の高いHUD
  var C = {
    bg: '#204028', bg2: '#123018', dirt: '#8a6a3a', dirtDark: '#5a4020',
    ball: '#f4f0d8', ballDark: '#c8c090', bat: '#c89050', batDark: '#7a5828',
    line: '#ffd400', good: '#5cff7a', bad: '#ff5050', gold: '#ffe600', white: '#f0fff0', ink: '#0a1a0e',
  };

  var GAME_TITLE = 'SWING TIMING';
  var TOTAL = 6;
  var CX = W * 0.5, STRIKE_Y = H * 0.56, PIVOT_X = W * 0.5, PIVOT_Y = H * 0.10, ARM = H * 0.5;
  var WIN = 0.075;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var hit, done, endWait, finished, ready, hitStop, shake, round, ball, swingFlash;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, H * 0.70, W, H * 0.3, C.dirtDark);
    game.draw.rect(0, H * 0.70, W, 10, C.dirt);
    game.draw.line(0, STRIKE_Y, W, STRIKE_Y, C.line, 6);
  }

  function newBall(rnd) {
    var dur = Math.max(0.95, 1.55 - rnd * 0.10);
    var dir = Math.random() < 0.5 ? -1 : 1;
    return { t: 0, dur: dur, dir: dir, resolved: false, telegraphed: false };
  }

  function ballAngle(b, p) {
    return dir_angle(b, p);
  }
  function dir_angle(b, p) {
    var a0 = b.dir < 0 ? Math.PI * 0.18 : Math.PI - Math.PI * 0.18;
    var a1 = Math.PI * 0.5;
    return a0 + (a1 - a0) * p;
  }
  function ballPos(b) {
    var p = Math.min(1, b.t / b.dur);
    var a = dir_angle(b, p);
    var x = PIVOT_X + Math.cos(a) * ARM * 0.9;
    var y = PIVOT_Y + Math.sin(a) * ARM * 0.9;
    return { x: x, y: y, p: p };
  }

  function initGame() {
    hit = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; round = 0; swingFlash = 0;
    ball = newBall(0);
  }

  function failBall(x, y) {
    hitStop = 0.32;
    game.feedback.bad(x, y, { text: 'MISS' });
    shake = 0.3;
    game.audio.play('se_bad', 0.4);
    ok = false; finished = true; finish();
  }

  function successBall(x, y) {
    hit++;
    hitStop = 0.1;
    swingFlash = 0.2;
    game.feedback.good(x, y, { text: 'MEET', color: C.good });
    game.fx.burst(x, y, { color: C.gold, count: 16, speed: 360 });
    game.audio.play('se_good', 0.4);
    if (hit === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, STRIKE_Y - 200, { color: C.gold, size: 40 });
    if (hit >= TOTAL) { ok = true; finished = true; finish(); return; }
    round++;
    ball = newBall(round);
  }

  function resolveSwing() {
    if (!ball || ball.resolved || ready > 0 || done || finished) return;
    ball.resolved = true;
    var pos = ballPos(ball);
    if (Math.abs(pos.p - 0.5) <= WIN) successBall(pos.x, pos.y);
    else failBall(pos.x, pos.y);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) resolveSwing();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawBall(b) {
    if (!b) return;
    var pos = ballPos(b);
    if (Math.abs(pos.p - 0.5) < 0.22) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.circle(pos.x, pos.y, 46, C.line, 0.3);
    }
    game.draw.line(PIVOT_X, PIVOT_Y, pos.x, pos.y, C.dirtDark, 4);
    game.draw.circle(pos.x, pos.y, 26, C.ballDark);
    game.draw.circle(pos.x, pos.y, 19, C.ball);
    return pos;
  }

  var BATTER = ['.##.', '####', '.##.', '####', '#.##'];
  function drawBat() {
    var w = swingFlash > 0 ? 140 : 90;
    var a = swingFlash > 0 ? -0.5 : 0.15;
    game.draw.sprite(BATTER, { '#': C.dirt }, CX, H * 0.88, 16, { anchor: 'center' });
    game.draw.line(CX, H * 0.82, CX + Math.sin(a) * w, H * 0.82 - Math.cos(a) * w, C.batDark, 22);
    game.draw.line(CX, H * 0.82, CX + Math.sin(a) * w, H * 0.82 - Math.cos(a) * w, C.bat, 14);
  }

  var demo = { t: 0, gx: CX, gy: H * 0.82, press: false, b: null };
  function stepDemo(dt) {
    demo.t += dt;
    if (round === undefined || round === null) initGame();
    if (!demo.b) { demo.b = newBall(0); demo.b.dur = 1.3; round = 0; }
    demo.b.t += dt;
    ball = demo.b;
    var pos = ballPos(demo.b);
    demo.press = false;
    if (pos.p >= 0.46 && pos.p <= 0.54 && !demo.b.telegraphed) {
      demo.b.telegraphed = true;
      demo.gx = CX; demo.gy = H * 0.82; demo.press = true;
      swingFlash = 0.2;
      game.feedback.good(pos.x, pos.y, { text: 'MEET', color: C.good });
      game.audio.play('se_good', 0.25);
    }
    if (swingFlash > 0) swingFlash -= dt;
    if (pos.p >= 1) { demo.b = null; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawBall(ball);
      drawBat();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
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
      drawBat();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(hit + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - hit) + '球!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hit, { hit: hit, total: TOTAL });
        else game.end.failure({ hit: hit, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      ball.t += dt;
      var pos = ballPos(ball);
      if (pos.p >= 1 && !ball.resolved) { ball.resolved = true; failBall(pos.x, pos.y); }
    }
    if (shake > 0) shake -= dt;
    if (swingFlash > 0) swingFlash -= dt;

    bg();
    if (!finished) drawBall(ball);
    drawBat();

    txt(hit + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 160, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 160, (W - 120) * (hit / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.40, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.3], ['E4', 0.3], ['G4', 0.6]], { tempo: 130, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

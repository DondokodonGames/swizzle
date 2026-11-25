// K-DS-0047-drop-strike-kick.js
// ドロップストライクキック — 落ちてくる的球に合わせ、蹴り位置に来た瞬間タップして蹴り返す
// 操作: 上から落ちてくる球が蹴りライン付近に来た瞬間にタップして蹴る
// 終わり: 規定球数(6球)全てタイミングよく蹴り返せば成功。3球外せば失敗
// @mechanic: timing_one_shot
// @theme: courtyard_drop_kick
// 世界観: 練習用の中庭。的当て器が落とす球を、着地の瞬間に見切って蹴り返す反復練習
// 残るもの: 正誤(CLEAR/GAME OVER) + PERFECTで蹴り返せた球数
// スタイル: HYPERCASUAL 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 白〜淡色背景、単色の丸い塊、真下に柔らかい影
  var C = {
    bg1: '#fdfdff', bg2: '#eef2ff', ball: '#ff6b4a', ballGlow: '#ffd7c8',
    kicker: '#3d5cff', kickerDark: '#26399e', shadow: '#00000022',
    good: '#31c76a', bad: '#ff4f6d', gold: '#ffb020', ink: '#20263a',
  };

  var GAME_TITLE = 'DROP STRIKE';
  var TOTAL = 6;
  var MISS_LIMIT = 3;
  var KICK_Y = H * 0.66;
  var KICKER_X = W * 0.5;
  var WINDOW_PERFECT = 40;
  var WINDOW_GOOD = 85;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var KICKER_S = ['.##.', '####', '.##.', '##..'];
  var KICKER_S2 = ['.##.', '####', '.##.', '.#.#', '#...'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    for (var i = 0; i < 4; i++) game.draw.circle(W * (0.2 + i * 0.22), H * 0.15, 50, '#dfe6ff', 0.5);
    game.draw.rect(0, KICK_Y + 60, W, 8, '#c9d2ee');
  }

  var round, ball, kicked, missed, done, endWait, finished;
  var ready, hitStop, shake, kickFlash;

  function fallDur(n) { return Math.max(0.68, 1.15 - n * 0.07); }
  function spawnX(n) { return W * (0.3 + ((n * 37) % 40) / 100); }

  function newBall(n) {
    return { x: spawnX(n), y: -80, dur: fallDur(n), t: 0, resolved: false };
  }

  function initGame() {
    round = 0; ball = newBall(0); kicked = 0; missed = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; kickFlash = 0;
  }

  function resolveTap() {
    if (state !== S.PLAYING || ready > 0 || done || finished || !ball || ball.resolved) return;
    var dist = Math.abs(ball.y - KICK_Y);
    if (dist <= WINDOW_GOOD) {
      ball.resolved = true;
      kicked++;
      var perfect = dist <= WINDOW_PERFECT;
      hitStop = perfect ? 0.1 : 0.07;
      kickFlash = 0.2;
      game.feedback.good(ball.x, KICK_Y, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.gold : C.good });
      game.fx.burst(ball.x, KICK_Y, { color: perfect ? C.gold : C.good, count: perfect ? 18 : 12, speed: 340 });
      game.audio.play('se_good', 0.4);
      if (kicked === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', KICKER_X, KICK_Y - 300, { color: C.gold, size: 40 });
      advance();
    } else {
      game.audio.play('se_tap', 0.15);
    }
  }

  function resolveMiss() {
    ball.resolved = true;
    missed++;
    hitStop = 0.3;
    game.feedback.bad(ball.x, KICK_Y, { text: 'MISS' });
    shake = 0.22;
    game.audio.play('se_bad', 0.4);
    if (missed >= MISS_LIMIT) { ok = false; finished = true; finish(); return; }
    advance();
  }

  function advance() {
    if (kicked >= TOTAL) { ok = true; finished = true; finish(); return; }
    round++;
    if (round < TOTAL) ball = newBall(round); else ball = null;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    resolveTap();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawKicker(flash) {
    game.draw.circle(KICKER_X, KICK_Y + 130, 60, C.shadow);
    game.draw.sprite(flash > 0 ? KICKER_S2 : KICKER_S, { '#': flash > 0 ? C.gold : C.kicker }, KICKER_X, KICK_Y + 20, 26, { anchor: 'center' });
  }

  function drawBall(b) {
    if (!b) return;
    game.draw.circle(b.x, KICK_Y + 100, 18 + (b.y / H) * 10, C.shadow);
    var near = Math.abs(b.y - KICK_Y) < WINDOW_GOOD * 1.6;
    if (near) game.draw.circle(b.x, b.y, 42, C.ballGlow, 0.6);
    game.draw.circle(b.x, b.y, 26, C.ball);
  }

  var demo = { t: 0, gx: KICKER_X, gy: KICK_Y + 460, press: false, ball: null };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) { demo.ball = { x: KICKER_X, y: -80, dur: 1.0, t: 0, resolved: false }; kicked = 0; missed = 0; }
    demo.ball.t += dt;
    var p = Math.min(1, demo.ball.t / demo.ball.dur);
    demo.ball.y = -80 + (KICK_Y + 130 - -80) * p;
    demo.press = false;
    if (!demo.ball.resolved && Math.abs(demo.ball.y - KICK_Y) < 22) {
      demo.ball.resolved = true;
      demo.press = true;
      kickFlash = 0.2;
      kicked++;
      game.feedback.good(demo.ball.x, KICK_Y, { text: 'PERFECT', color: C.gold, sound: 'se_good', volume: 0.25 });
      game.fx.burst(demo.ball.x, KICK_Y, { color: C.gold, count: 12, speed: 260 });
    }
    ball = demo.ball.t / demo.ball.dur < 1 ? demo.ball : null;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      if (kickFlash > 0) kickFlash -= dt;
      drawBall(ball);
      drawKicker(kickFlash);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 22 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawKicker(0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(kicked + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - kicked) + '球!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(kicked, { kicked: kicked, total: TOTAL, missed: missed });
        else game.end.failure({ kicked: kicked, total: TOTAL, missed: missed });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished && ball) {
      ball.t += dt;
      var p = Math.min(1.25, ball.t / ball.dur);
      ball.y = -80 + (KICK_Y + 130 - -80) * p;
      if (p >= 1.15 && !ball.resolved) resolveMiss();
    }
    if (kickFlash > 0) kickFlash -= dt;
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawBall(ball);
    drawKicker(kickFlash);

    txt(kicked + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.ink);
    game.draw.rect(60, 140, W - 120, 16, C.ink, 0.12);
    game.draw.rect(60, 140, (W - 120) * (kicked / TOTAL), 16, C.gold);
    for (var m = 0; m < MISS_LIMIT; m++) {
      game.draw.circle(W - 80 - m * 40, 108, 12, m < missed ? C.bad : '#00000022');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A4', 0.3], ['C5', 0.3], ['E5', 0.6]], { tempo: 128, wave: 'sine', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

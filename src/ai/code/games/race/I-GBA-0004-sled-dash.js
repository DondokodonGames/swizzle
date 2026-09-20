// I-GBA-0004-sled-dash.js
// スレッドダッシュ — 雪山の坂道を、左右の足で交互に雪面を蹴って滑走し、制限時間内にゴールへ
// 操作: 左右の親指ゾーンを交互にタップして加速する。片側連打だけでは伸びない
// 終わり: 制限時間内にゴールラインへ到達すれば成功。時間切れで失敗
// @mechanic: alternate_tap
// @theme: snow_slope_sled
// 世界観: 雪深い山の斜面。橇乗りが左右の雪面を交互に蹴って加速し、麓のゴール旗を目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 走破した距離%
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 画面の1/3を占める巨大キャラ、床に楕円影、背景は横1層
  var C = {
    bg: '#7fc7ff', bg2: '#e8f6ff', snow: '#ffffff', snowShade: '#d4ecff',
    sled: '#c94b3a', sledDark: '#8a2f22', skin: '#f2c29a',
    good: '#2fd15a', bad: '#ff4d5e', gold: '#ffd400', white: '#ffffff', ink: '#0c2a3a',
  };

  var GAME_TITLE = 'SLED DASH';
  var MAX_TIME = 12;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var dist, speed, timeLeft, lastSide, done, endWait, finished, ready, hitStop, shake, kickL, kickR;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SLED_A = ['..####..', '.######.', '########', '##....##'];
  var SLED_B = ['..####..', '.######.', '########', '#.####.#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [0.55, C.bg2], [1, C.snow]]);
    for (var i = 0; i < 5; i++) game.draw.rect(0, H * (0.55 + i * 0.09), W, 4, C.snowShade, 0.6);
  }

  function initGame() {
    dist = 0; speed = 0; timeLeft = MAX_TIME; lastSide = 0;
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
    kickL = 0; kickR = 0;
  }

  function drawSled() {
    var bob = (kickL > 0 ? -10 : 0) + (kickR > 0 ? -10 : 0) + Math.sin(game.time.elapsed * 10) * 3;
    game.draw.circle(W * 0.5, H * 0.62, 140, '#000000', 0.12);
    game.draw.sprite(kickL > kickR ? SLED_A : SLED_B, { '#': C.sled }, W * 0.5, H * 0.55 + bob, 42, { anchor: 'center' });
  }

  function kick(side) {
    if (finished || ready > 0 || done) return;
    game.audio.play('se_tap', 0.06);
    if (side !== lastSide) {
      speed = Math.min(320, speed + 42);
      lastSide = side;
      kick2(side);
      game.feedback.good(side < 0 ? W * 0.2 : W * 0.8, H * 0.8, { color: C.good, count: 1 });
      game.audio.play('se_jump', 0.2);
    } else {
      speed = Math.max(0, speed - 30);
      game.feedback.bad(side < 0 ? W * 0.2 : W * 0.8, H * 0.8, { count: 1 });
    }
  }

  function kick2(side) {
    if (side < 0) kickL = 0.15; else kickR = 0.15;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) {
      if (y < H * 0.75) return;
      kick(x < W * 0.5 ? -1 : 1);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.28, gy: H * 0.86, press: false, side: -1 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { dist = 0; speed = 0; lastSide = 0; }
    var beat = cyc % 0.42;
    demo.press = beat < 0.12;
    if (beat < dt || cyc <= dt) {
      demo.side *= -1;
      demo.gx = demo.side < 0 ? W * 0.28 : W * 0.72;
      speed = Math.min(320, speed + (demo.side !== lastSide ? 42 : 20));
      lastSide = demo.side;
      if (demo.side < 0) kickL = 0.15; else kickR = 0.15;
    }
    dist = Math.min(1, dist + speed * dt / 4200);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawSled();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.ink);
      txt('BEST ' + (game.best > 0 ? Math.round(game.best) + '%' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawSled();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(Math.round(dist * 100) + '%', W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + Math.max(1, Math.round((1 - dist) * 100)) + '%!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.round(dist * 100);
        if (ok) game.end.success(pct, { pct: pct }); else game.end.failure({ pct: pct });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      speed = Math.max(0, speed - 60 * dt);
      dist += speed * dt / 4200;
      timeLeft -= dt;
      if (dist >= 0.5 && dist - speed * dt / 4200 < 0.5) { game.fx.popup('50%!', W / 2, H * 0.3, { color: C.gold, size: 38 }); game.audio.play('se_milestone', 0.3); }
      if (dist >= 1) { ok = true; finished = true; finish(); }
      else if (timeLeft <= 0) { ok = false; finished = true; hitStop = 0.3; game.feedback.bad(W * 0.5, H * 0.55, { text: 'TIME UP' }); shake = 0.25; game.audio.play('se_bad', 0.4); finish(); }
    }
    if (kickL > 0) kickL -= dt;
    if (kickR > 0) kickR -= dt;
    if (shake > 0) shake -= dt;

    bg();
    drawSled();

    txt(Math.round(dist * 100) + '%', W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.2);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / MAX_TIME), 16, C.gold);
    game.draw.rect(60, 180, (W - 120) * dist, 10, C.good);
    game.draw.rect(W * 0.06, H * 0.76, W * 0.38, H * 0.14, kickL > 0 ? '#ffffff55' : '#ffffff22');
    game.draw.rect(W * 0.56, H * 0.76, W * 0.38, H * 0.14, kickR > 0 ? '#ffffff55' : '#ffffff22');
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.2], ['B4', 0.2], ['D5', 0.2], ['G5', 0.4]], { tempo: 160, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

// J-N641-0007-well-peekaboo-tap.js
// 井戸のひょっこり妖精タップ — 井戸から次々顔を出す妖精を光る合図の間にタップして数を競う
// 操作: 井戸の穴から顔を出す妖精が光っている間だけタップして当てる。光る前や消えた後のタップは外れ
// 終わり: 制限時間内に規定数を当てれば成功。時間切れなら失敗
// @mechanic: timing_window
// @theme: well_peekaboo_light_window
// 世界観: 古井戸を守る庭師が、穴から次々顔を出す小さな妖精たちを、光って見える窓の間だけタップして数える
// 残るもの: 正誤(CLEAR/GAME OVER) + 当てた妖精数
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 4階調(黄緑寄り)、残像・低コントラスト・画面枠
  var C = {
    bg: '#c8d8a0', bg2: '#a8c078', well: '#688048', wellDark: '#486030',
    fairy: '#304018', fairyLit: '#182808', window: '#e8f0c0',
    good: '#304018', badc: '#405818', gold: '#182808', ink: '#182808',
  };

  var GAME_TITLE = 'WELL TAP';
  var TIME_LIMIT = 10;
  var GOAL = 9;
  var HOLE_N = 4;
  var HOLE_X = [];
  for (var i = 0; i < HOLE_N; i++) HOLE_X.push(W * (0.22 + i * 0.19));
  var HOLE_Y = H * 0.5;
  var WARN_TIME = 0.28, WIN_TIME = 0.42, MISS_TIME = 0.16;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FAIRY_SPR = ['.#.', '###', '.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, 8, C.wellDark, 0.5);
    game.draw.rect(0, H - 8, W, 8, C.wellDark, 0.5);
  }

  function drawHoles(holes) {
    for (var i = 0; i < HOLE_N; i++) {
      var x = HOLE_X[i];
      game.draw.circle(x, HOLE_Y + 40, 70, C.wellDark);
      game.draw.circle(x, HOLE_Y + 40, 58, C.well);
      var h = holes[i];
      if (h.state === 'warn') {
        var flick = Math.floor(game.time.elapsed * 16) % 2 === 0;
        if (flick) game.draw.rect(x - 20, HOLE_Y - 4, 40, 6, C.window, 0.7);
      } else if (h.state === 'up') {
        game.draw.circle(x, HOLE_Y, 44, C.window, 0.5);
        game.draw.sprite(FAIRY_SPR, { '#': C.fairyLit }, x, HOLE_Y, 24, { anchor: 'center' });
      } else if (h.state === 'down') {
        var a = h.t / MISS_TIME;
        game.draw.sprite(FAIRY_SPR, { '#': C.fairy }, x, HOLE_Y + 30 * a, 24, { anchor: 'center', alpha: 1 - a });
      }
    }
  }

  var holes, hit, timeLeft, milestoneCalled, spawnClock;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    holes = [];
    for (var i = 0; i < HOLE_N; i++) holes.push({ state: 'idle', t: 0 });
    hit = 0; timeLeft = TIME_LIMIT; milestoneCalled = false; spawnClock = 0.35;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function spawnFairy() {
    var idle = [];
    for (var i = 0; i < HOLE_N; i++) if (holes[i].state === 'idle') idle.push(i);
    if (!idle.length) return;
    var pick = idle[Math.floor(Math.random() * idle.length)];
    holes[pick].state = 'warn'; holes[pick].t = 0;
  }

  function tickHoles(dt) {
    for (var i = 0; i < HOLE_N; i++) {
      var h = holes[i];
      if (h.state === 'idle') continue;
      h.t += dt;
      if (h.state === 'warn' && h.t >= WARN_TIME) { h.state = 'up'; h.t = 0; }
      else if (h.state === 'up' && h.t >= WIN_TIME) { h.state = 'down'; h.t = 0; }
      else if (h.state === 'down' && h.t >= MISS_TIME) { h.state = 'idle'; h.t = 0; }
    }
  }

  function attemptTap(x, y) {
    if (finished || ready > 0) return;
    var best = -1, bd = 1e9;
    for (var i = 0; i < HOLE_N; i++) {
      var d = Math.hypot(HOLE_X[i] - x, HOLE_Y - y);
      if (d < bd) { bd = d; best = i; }
    }
    if (bd > 90 || holes[best].state !== 'up') {
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.2);
      return;
    }
    holes[best].state = 'idle'; holes[best].t = 0;
    hit++;
    game.feedback.good(HOLE_X[best], HOLE_Y, { text: hit >= GOAL ? 'PERFECT' : 'GOOD', color: C.good });
    game.audio.play('se_coin', 0.35);
    if (!milestoneCalled && hit >= Math.ceil(GOAL / 2)) {
      milestoneCalled = true;
      game.fx.popup('NICE', W * 0.5, H * 0.3, { color: C.gold, size: 30 });
      game.audio.play('se_milestone', 0.3);
    }
    if (hit >= GOAL) winRun();
  }

  function winRun() {
    if (finished) return;
    finished = true; ok = true; hitStop = 0.12;
    game.fx.burst(W * 0.5, HOLE_Y, { color: C.gold, count: 20, speed: 380 });
    game.audio.play('se_success', 0.5);
    finish();
  }
  function loseRun() {
    if (finished) return;
    finished = true; ok = false; shake = 0.2; hitStop = 0.25;
    game.feedback.bad(W * 0.5, HOLE_Y, { text: 'MISS' });
    game.audio.play('se_failure', 0.5);
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) attemptTap(x, y);
  });

  var demo = { t: 0, gx: HOLE_X[0], gy: HOLE_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) initGame();
    spawnClock -= dt;
    if (spawnClock <= 0) { spawnFairy(); spawnClock = 0.32 + Math.random() * 0.12; }
    tickHoles(dt);
    var target = -1;
    for (var i = 0; i < HOLE_N; i++) if (holes[i].state === 'up') { target = i; break; }
    if (target >= 0) {
      demo.gx = HOLE_X[target]; demo.gy = HOLE_Y; demo.press = true;
      attemptTap(demo.gx, demo.gy);
    } else demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (holes === undefined) initGame();
      stepDemo(dt);
      bg();
      drawHoles(holes);
      game.draw.hand(demo.gx, demo.gy - 40, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 36, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 36, C.gold);
      else txt('TAP TO START', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawHoles(holes);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 42, ok ? C.good : C.badc);
      txt(hit + ' / ' + GOAL, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(0, GOAL - hit) + '匹!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hit, { hit: hit, goal: GOAL });
        else game.end.failure({ hit: hit, goal: GOAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      spawnClock -= dt;
      if (spawnClock <= 0) { spawnFairy(); spawnClock = 0.3 + Math.random() * 0.18; }
      tickHoles(dt);
      if (timeLeft <= 0) { timeLeft = 0; loseRun(); }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawHoles(holes);

    txt(hit + ' / ' + GOAL, W / 2, H * 0.06, 28, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 2.5 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 14, C.wellDark, 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 14, lowTime ? C.badc : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 50, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.12], ['A4', 0.12], ['B4', 0.12], ['D5', 0.24]], { tempo: 168, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

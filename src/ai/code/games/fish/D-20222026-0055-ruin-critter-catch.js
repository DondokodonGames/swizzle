// D-20222026-0055-ruin-critter-catch.js
// 廃墟クリッターキャッチ — 逃げ回る小さな生き物を連続タップで追い詰めて捕獲する
// 操作: 跳ね回る生き物を連続タップで追いかけ、規定回数命中させて弱らせ最後に捕獲する
// 終わり: 規定回数タップに成功すれば捕獲成功。空振りが続く/時間切れで失敗
// @mechanic: chase
// @theme: ruin_critter_catch
// 世界観: 蔦に覆われた遺跡を進む探検見習いが、跳ね回る小さな生き物を連続タップで追い詰め、最後に手を伸ばして捕らえる
// 残るもの: 正誤(CLEAR/GAME OVER) + 命中回数
// スタイル: 90s PRE-RENDER

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: くすんだ質感、強めの陰影グラデ
  var C = {
    bg: '#2a3a24', bg2: '#141d10', ink: '#e8f0dc',
    good: '#8fd66a', bad: '#ff5a5a', gold: '#ffd23f', critter: '#c98f3f',
  };

  var GAME_TITLE = 'CRITTER CATCH';
  var TIME_LIMIT = 18;
  var NEED = 6;
  var MISS_LIMIT = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CRITTER_SPRITE = ['#.#.#', '#####', '.###.'];
  var SCOUT_SPRITE = ['.##.', '####', '.##.', '.#.#'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.2);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#8fd66a', pulse * 0.12);
    game.draw.sprite(SCOUT_SPRITE, { '#': C.gold }, W * 0.86, H * 0.86, 10, { anchor: 'center' });
  }

  var cx, cy, vx, vy, hopT, hits, misses, timeLeft;
  var done, endWait, finished, ready, hitStop, shake, halfCalled;

  function newHop() {
    var a = game.random(0, Math.PI * 2);
    var speed = 420 + hits * 30;
    vx = Math.cos(a) * speed; vy = Math.sin(a) * speed;
    hopT = 0.5;
  }

  function initGame() {
    cx = W * 0.5; cy = H * 0.42;
    newHop();
    hits = 0; misses = 0; timeLeft = TIME_LIMIT;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; halfCalled = false;
  }

  function drawScene(caught) {
    var bob = Math.sin(game.time.elapsed * 6) * 6;
    game.draw.sprite(CRITTER_SPRITE, { '#': C.critter }, cx, cy + bob, caught ? 40 : 26, { anchor: 'center' });
  }

  function onStrike(x, y) {
    if (finished || ready > 0) return;
    var d = Math.hypot(x - cx, y - cy);
    if (d < 90) {
      hits++;
      game.feedback.good(cx, cy, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.35);
      if (hits === Math.ceil(NEED / 2)) game.fx.popup('HALFWAY!', cx, cy - 90, { color: C.gold, size: 32 });
      if (hits >= NEED) {
        finished = true; ok = true; hitStop = 0.35;
        game.fx.burst(cx, cy, { color: C.gold, count: 26, speed: 440 });
        game.audio.play('se_success', 0.5);
        finish();
        return;
      }
      newHop();
    } else {
      misses++;
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_tap', 0.2);
      if (misses >= MISS_LIMIT) {
        finished = true; ok = false; hitStop = 0.3; shake = 0.25;
        game.feedback.bad(x, y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) onStrike(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.42, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var per = 1.5;
    var cyc = demo.t % (per * NEED + 0.6);
    if (cyc < dt || demo.t <= dt) initGame();
    var local = cyc % per;
    demo.gx = cx; demo.gy = cy;
    demo.press = local > per * 0.6 && local < per * 0.6 + dt * 2;
    if (demo.press && hits < NEED) {
      hits++;
      game.feedback.good(cx, cy, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.2);
      newHop();
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (cx === undefined) initGame();
      stepDemo(dt);
      cx += vx * dt; cy += vy * dt;
      if (cx < W * 0.15 || cx > W * 0.85) vx *= -1;
      if (cy < H * 0.24 || cy > H * 0.58) vy *= -1;
      bg();
      drawScene(false);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene(ok);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(hits + ' / ' + NEED, W / 2, H * 0.14, 30, C.gold);
      if (!ok) txt('あと' + (NEED - hits) + '匹!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, need: NEED });
        else game.end.failure({ hits: hits, need: NEED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      cx += vx * dt; cy += vy * dt;
      if (cx < W * 0.15 || cx > W * 0.85) vx *= -1;
      if (cy < H * 0.24 || cy > H * 0.58) vy *= -1;
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(cx, cy, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene(false);

    txt(hits + ' / ' + NEED, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, '#1e2a18', 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['B3', 0.25], ['D4', 0.25], ['F4', 0.25], ['B4', 0.4]], { tempo: 130, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

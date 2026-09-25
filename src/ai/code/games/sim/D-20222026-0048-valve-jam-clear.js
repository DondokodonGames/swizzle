// D-20222026-0048-valve-jam-clear.js
// バルブジャムクリア — 詰まった荷物を色付き出口の方向へスワイプして渋滞を解消する
// 操作: 中央に詰まった荷物を、同じ色の出口がある方向へ指で払う(左/右/上)
// 終わり: 規定個数を正しい方向へ払えば成功。違う方向へ払う/時間切れで失敗
// @mechanic: swipe_direction
// @theme: valve_jam_clear
// 世界観: 詰まった仕分けラインの管理人が、色分けされた荷物を対応する出口方向へ次々払い、渋滞を解消する
// 残るもの: 正誤(CLEAR/GAME OVER) + 払った個数
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 黒背景に発光ライン、原色ネオン
  var C = {
    bg: '#0d0d1a', bg2: '#050510', line: '#2a2a4a',
    good: '#39ffb0', bad: '#ff2f6a', gold: '#ffe23f', ink: '#e8e8ff',
    kinds: ['#ff2fb0', '#39c4ff', '#ffe23f'],
  };

  var GAME_TITLE = 'JAM CLEAR';
  var TIME_LIMIT = 12;
  var NEED = 5;
  var DIRS = ['left', 'right', 'up'];
  var EXITS = { left: { x: W * 0.12, y: H * 0.42 }, right: { x: W * 0.88, y: H * 0.42 }, up: { x: W * 0.5, y: H * 0.16 } };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CRATE_SPRITE = ['####', '#..#', '####'];
  var OP_SPRITE = ['.##.', '####', '.##.', '.##.'];

  function bg() {
    var pulse = 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ff2fb0', pulse * 0.15);
    for (var i = 0; i < 5; i++) {
      var yy = H * 0.55 + i * 60;
      game.draw.line(0, yy, W, yy, C.line, 2);
    }
    game.draw.sprite(OP_SPRITE, { '#': C.gold }, W * 0.86, H * 0.86, 10, { anchor: 'center' });
  }

  var kindOfDir = {};
  for (var di = 0; di < DIRS.length; di++) kindOfDir[DIRS[di]] = di;

  var current, hits, timeLeft, done, endWait, finished, ready, hitStop, shake, halfCalled;

  function nextCrate() { return Math.floor(Math.random() * DIRS.length); }

  function initGame() {
    current = nextCrate();
    hits = 0; timeLeft = TIME_LIMIT;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; halfCalled = false;
  }

  function drawScene() {
    for (var i = 0; i < DIRS.length; i++) {
      var e = EXITS[DIRS[i]];
      game.draw.circle(e.x, e.y, 70, C.kinds[i], 0.85);
      game.draw.circle(e.x, e.y, 70, '#ffffff', 0.15);
    }
    game.draw.circle(W * 0.5, H * 0.42, 74, C.kinds[current]);
    game.draw.sprite(CRATE_SPRITE, { '#': '#0d0d1a' }, W * 0.5, H * 0.42, 20, { anchor: 'center' });
  }

  function attempt(dir) {
    if (finished || ready > 0) return;
    var p = W * 0.5, py = H * 0.42;
    if (kindOfDir[dir] === current) {
      hits++;
      var e = EXITS[dir];
      game.feedback.good(e.x, e.y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.4);
      if (hits === Math.ceil(NEED / 2)) game.fx.popup('HALFWAY!', p, py - 100, { color: C.gold, size: 32 });
      if (hits >= NEED) {
        finished = true; ok = true; hitStop = 0.3;
        game.fx.burst(e.x, e.y, { color: C.gold, count: 24, speed: 420 });
        game.audio.play('se_success', 0.5);
        finish();
        return;
      }
      current = nextCrate();
    } else {
      finished = true; ok = false; hitStop = 0.3; shake = 0.25;
      game.feedback.bad(p, py, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) game.audio.play('se_tap', 0.06);
  });
  game.onSwipe(function(dir) {
    if (state === S.PLAYING && DIRS.indexOf(dir) >= 0) attempt(dir);
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
    var per = 1.7;
    var cyc = demo.t % (per * NEED + 0.6);
    if (cyc < dt || demo.t <= dt) initGame();
    var local = cyc % per;
    var e = EXITS[DIRS[current]];
    if (local < per * 0.6) {
      var t2 = local / (per * 0.6);
      demo.gx = W * 0.5 + (e.x - W * 0.5) * t2;
      demo.gy = H * 0.42 + (e.y - H * 0.42) * t2;
      demo.press = true;
    } else {
      demo.press = false;
      if (local >= per * 0.6 && local < per * 0.6 + dt * 2) {
        hits = Math.min(NEED, hits + 1);
        game.feedback.good(e.x, e.y, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.2);
        current = nextCrate();
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (current === undefined) initGame();
      stepDemo(dt);
      bg();
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 42, C.ink);
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
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 48, ok ? C.good : C.bad);
      txt(hits + ' / ' + NEED, W / 2, H * 0.14, 30, C.gold);
      if (!ok) txt('あと' + (NEED - hits) + '個!', W / 2, H * 0.18, 24, C.ink);
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
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(W / 2, H * 0.42, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(hits + ' / ' + NEED, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, '#2a2a4a', 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.2], ['G4', 0.2], ['B4', 0.2], ['E5', 0.4]], { tempo: 150, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

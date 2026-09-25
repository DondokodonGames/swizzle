// D-20222026-0054-armor-count-strike.js
// アーマーカウントストライク — 表示された敵装甲値とちょうど同じ回数だけ、攻撃の合図に合わせてタップする
// 操作: 攻撃ウィンドウが光った瞬間だけタップし、装甲値ちょうどの回数で止める。撃ちすぎ厳禁
// 終わり: 合図に合わせて装甲値ちょうどの回数を命中させれば成功。ちょうど以外/時間切れで失敗
// @mechanic: count_exact
// @theme: armor_count_strike
// 世界観: 前線に展開した機甲小隊の砲手が、敵機の残り装甲値を読み、光る発砲合図に合わせてちょうどの回数だけ主砲を撃ち抜く
// 残るもの: 正誤(CLEAR/GAME OVER) + 命中回数
// スタイル: HD POST 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 金属質グラデ、輪郭に淡いブルームリム
  var C = {
    bg: '#131826', bg2: '#080a12', hud: '#1c2334', bar: '#2a3550',
    good: '#3fe0a0', bad: '#ff4d5e', gold: '#ffd23f', ink: '#e8ecff', rim: '#5f9dff',
  };

  var GAME_TITLE = 'ARMOR STRIKE';
  var TIME_LIMIT = 18;
  var PULSE_PERIOD = 2.0;
  var WINDOW = 0.4;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var MECH_SPRITE = ['.##.', '####', '.##.', '.#.#'];
  var ENEMY_SPRITE = ['#.#.#', '#####', '.###.'];

  function bg() {
    var pulse = 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, C.rim, pulse * 0.12);
  }

  var target, pulseT, hits, timeLeft, done, endWait, finished, ready, hitStop, shake, halfCalled;

  function initGame() {
    target = 4 + Math.floor(Math.random() * 2);
    pulseT = 0; hits = 0; timeLeft = TIME_LIMIT;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; halfCalled = false;
  }

  function inWindow() { var m = pulseT % PULSE_PERIOD; return m < WINDOW; }

  function drawScene() {
    var hot = inWindow();
    var scale = hot ? 1.08 : 1.0;
    game.draw.circle(W * 0.5, H * 0.34, 130 * scale, hot ? C.rim : C.hud);
    game.draw.sprite(ENEMY_SPRITE, { '#': '#ff5a6a' }, W * 0.5, H * 0.34, 26, { anchor: 'center' });
    txt(String(Math.max(0, target - hits)), W * 0.5, H * 0.34 + 16, 46, C.ink);
    game.draw.sprite(MECH_SPRITE, { '#': C.gold }, W * 0.5, H * 0.68, 42, { anchor: 'center' });
  }

  function onStrike(x, y) {
    if (finished || ready > 0) return;
    if (!inWindow()) {
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_tap', 0.2);
      return;
    }
    hits++;
    game.feedback.good(x, y, { text: 'GOOD', color: C.good });
    game.audio.play('se_tap', 0.3);
    if (hits === Math.ceil(target / 2)) game.fx.popup('HALFWAY!', x, y - 100, { color: C.gold, size: 32 });
    if (hits === target) {
      finished = true; ok = true; hitStop = 0.3;
      game.fx.burst(W * 0.5, H * 0.34, { color: C.gold, count: 26, speed: 440 });
      game.audio.play('se_success', 0.5);
      finish();
    } else if (hits > target) {
      finished = true; ok = false; hitStop = 0.3; shake = 0.25;
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
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

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.34, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (PULSE_PERIOD * target + 0.8);
    if (cyc < dt || demo.t <= dt) initGame();
    pulseT = cyc;
    demo.press = inWindow() && (cyc % PULSE_PERIOD) < dt * 3;
    if (demo.press && hits < target) {
      hits++;
      game.feedback.good(demo.gx, demo.gy, { text: 'GOOD', color: C.good });
      game.audio.play('se_tap', 0.15);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (target === undefined) initGame();
      stepDemo(dt);
      bg();
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 38, C.ink);
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
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(hits + ' / ' + target, W / 2, H * 0.14, 30, C.gold);
      if (!ok) txt('あと' + Math.max(0, target - hits) + '発!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, target: target });
        else game.end.failure({ hits: hits, target: target });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      pulseT += dt;
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(W / 2, H * 0.34, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(hits + ' / ' + target, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, C.bar, 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E3', 0.25], ['B3', 0.25], ['E4', 0.25], ['B4', 0.45]], { tempo: 120, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

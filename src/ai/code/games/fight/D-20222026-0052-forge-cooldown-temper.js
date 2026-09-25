// D-20222026-0052-forge-cooldown-temper.js
// フォージクールダウンテンパー — 熱ゲージが白く光った瞬間だけ叩いて装備を鍛え上げる
// 操作: 熱ゲージが冷めて再び白く光るまで待ち、光った瞬間だけタップして打つ。連打は無効
// 終わり: 規定回数を正しいタイミングで打てば成功。冷めている間に叩く/時間切れで失敗
// @mechanic: cooldown_tap
// @theme: forge_cooldown_temper
// 世界観: 遠征前の野営鍛冶場を任された鍛冶見習いが、焼き戻しの白熱が戻る一瞬だけを狙って装備を打ち鍛える
// 残るもの: 正誤(CLEAR/GAME OVER) + 打ち込めた回数
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 濃いめの原色4色、粗いピクセル陰影
  var C = {
    bg: '#241414', bg2: '#140a0a', gauge: '#3a2020', gaugeCold: '#7a3a2a', gaugeHot: '#ffe23f',
    good: '#3fd67a', bad: '#ff4d5e', gold: '#ffd23f', ink: '#f5e8de',
  };

  var GAME_TITLE = 'FORGE TEMPER';
  var TIME_LIMIT = 13;
  var NEED = 6;
  var COOLDOWN = 1.3;
  var HOT_WINDOW = 0.35;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SMITH_SPRITE = ['.##.', '####', '.##.', '.#.#'];
  var GEAR_SPRITE = ['####', '#..#', '####'];

  function bg() {
    var pulse = 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffe23f', pulse * 0.12);
  }

  var hits, timeLeft, done, endWait, finished, ready, hitStop, shake, cd;

  function initGame() {
    hits = 0; timeLeft = TIME_LIMIT; cd = COOLDOWN;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function isHot() { return cd <= HOT_WINDOW; }

  function drawScene(flash) {
    var hot = isHot();
    var r = 130 + (hot ? 14 * Math.sin(game.time.elapsed * 20) : 0);
    game.draw.circle(W * 0.5, H * 0.42, r, hot ? C.gaugeHot : C.gaugeCold);
    game.draw.sprite(GEAR_SPRITE, { '#': '#241414' }, W * 0.5, H * 0.42, 26, { anchor: 'center' });
    game.draw.sprite(SMITH_SPRITE, { '#': C.gold }, W * 0.5, H * 0.66 + (flash ? -8 : 0), 42, { anchor: 'center' });
  }

  function onStrike(x, y) {
    if (finished || ready > 0) return;
    if (isHot()) {
      hits++;
      cd = COOLDOWN;
      game.feedback.good(x, y, { text: 'GOOD', color: C.good });
      game.audio.play('se_powerup', 0.4);
      if (hits === Math.ceil(NEED / 2)) game.fx.popup('HALFWAY!', x, y - 100, { color: C.gold, size: 32 });
      if (hits >= NEED) {
        finished = true; ok = true; hitStop = 0.3;
        game.fx.burst(W * 0.5, H * 0.42, { color: C.gold, count: 26, speed: 440 });
        game.audio.play('se_success', 0.5);
        finish();
      }
    } else {
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

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.42, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (COOLDOWN * NEED + 0.6);
    if (cyc < dt || demo.t <= dt) initGame();
    var local = cyc % COOLDOWN;
    cd = COOLDOWN - local;
    demo.press = isHot() && local > (COOLDOWN - HOT_WINDOW) && local < (COOLDOWN - HOT_WINDOW) + dt * 2;
    if (demo.press && hits < NEED) {
      hits++;
      game.feedback.good(demo.gx, demo.gy, { text: 'GOOD', color: C.good });
      game.audio.play('se_powerup', 0.2);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (hits === undefined) initGame();
      stepDemo(dt);
      bg();
      drawScene(demo.press);
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
      drawScene(false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(hits + ' / ' + NEED, W / 2, H * 0.14, 30, C.gold);
      if (!ok) txt('あと' + (NEED - hits) + '回!', W / 2, H * 0.18, 24, C.ink);
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
      cd -= dt;
      if (cd <= -0.4) cd = COOLDOWN; // missed hot window untouched: cycle re-heats
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(W / 2, H * 0.42, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene(false);

    txt(hits + ' / ' + NEED, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, C.gauge, 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D3', 0.3], ['A3', 0.3], ['D4', 0.3], ['A4', 0.5]], { tempo: 116, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

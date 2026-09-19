// GH-PS2-0057-jitte-throw.js
// ジッテスロー — 逃げる下手人に十手を投げる。届く距離で投げる
// 操作: 相手が投げても届く距離の帯に入った瞬間にタップ
// 終わり: 3回の機会。捕まえられた数が残る
// @mechanic: timing_one_shot
// @theme: night_chase
// 世界観: 夜の路地、逃げる影を追う。届く間合いの帯に入った瞬間だけ投げが届く。早すぎ・遠すぎれば外れる
// 残るもの: 捕まえた数(SCORE) + 挑戦回数
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 90s BIG SPRITE: 多色。巨大キャラ、床影、間合いで見せる
  var C = {
    bg1: '#2a2438', bg2: '#181420', runner: '#3a3a4a', chaser: '#5a4a3a',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#f0f0f4', ink: '#0a0a10',
  };

  var GAME_TITLE = 'JITTE THROW';
  var TRIES = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var finalScore = 0, caught = 0;

  var tryIdx, dist, resolved, done, endWait;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function alleyBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    for (var i = 0; i < 6; i++) game.draw.rect(i * 190, H * 0.16, 8, H * 0.55, '#00000030');
  }

  var RUNNER_SPRITE = ['.##.', '####', '.#.#', '#.#.'];
  var CHASER_SPRITE = ['.##.', '####', '.##.', '#.#.'];

  function drawScene() {
    var runnerY = H * 0.34, chaserY = H * 0.62;
    var runnerScale = 0.6 + (1 - dist) * 0.5;
    var runnerX = W * 0.5 + (dist - 0.5) * 260;
    game.draw.circle(runnerX, runnerY + 60 * runnerScale, 40 * runnerScale, '#000000', 0.3);
    game.draw.sprite(RUNNER_SPRITE, { '#': C.runner }, runnerX, runnerY, 26 * runnerScale, { anchor: 'center' });
    game.draw.circle(W / 2, chaserY + 70, 60, '#000000', 0.3);
    game.draw.sprite(CHASER_SPRITE, { '#': C.chaser }, W / 2, chaserY, 34, { anchor: 'center' });
  }

  function newTry() {
    dist = 0.95; resolved = false;
  }

  function initGame() {
    tryIdx = 0; caught = 0; done = false; endWait = 0;
    ready = 0.8; hitStop = 0; shake = 0;
    newTry();
  }

  function throwJitte() {
    if (done || ready > 0 || hitStop > 0 || resolved) return;
    resolved = true;
    hitStop = 0.08;
    if (dist > 0.32 && dist < 0.55) {
      caught++;
      game.feedback.good(W / 2, H * 0.45, { text: 'HIT', color: C.good });
      game.fx.burst(W / 2, H * 0.45, { color: C.gold, count: 14, speed: 340 });
      game.audio.play('se_success', 0.4);
    } else {
      game.feedback.bad(W / 2, H * 0.45, { text: 'MISS' });
      shake = 0.1;
      game.audio.play('se_bad', 0.3);
    }
  }

  function finish() {
    if (done) return;
    done = true;
    finalScore = caught * 100;
    game.audio.stopBgm();
    game.audio.play(caught > 0 ? 'se_success' : 'se_failure');
    endWait = 1.4;
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    throwJitte();
  });

  // ── ATTRACT ゴースト実演: 届く帯に入った瞬間だけタップ ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.86, press: false, dist: 0.95 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.0;
    demo.dist = Math.max(0.1, 0.95 - cyc * 0.5);
    dist = demo.dist;
    demo.press = dist > 0.32 && dist < 0.45;
    if (demo.press && dist > 0.32 && dist < 0.35) { game.feedback.good(W / 2, H * 0.45, { text: 'HIT', color: C.good }); game.fx.burst(W / 2, H * 0.45, { color: C.gold, count: 10, speed: 300 }); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (tryIdx === undefined) initGame();
      alleyBg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 50, C.white);
      txt('BEST ' + game.best, W / 2, H * 0.13, 26, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 44, C.gold);
        txt('TAP TO START', W / 2, H * 0.97, 32, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.97, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      alleyBg();
      drawScene();
      txt(caught >= 2 ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 52, caught >= 2 ? C.white : C.bad);
      txt('CAUGHT ' + caught + ' / ' + TRIES, W / 2, H * 0.86, 34, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.97, 26, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) { state = S.RESULT; game.end.record(finalScore, { label: caught + '/' + TRIES }); }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      dist -= dt * 0.32;
      if (dist <= 0) {
        if (!resolved) { game.feedback.bad(W / 2, H * 0.45, { text: 'MISS' }); shake = 0.08; }
        tryIdx++;
        if (tryIdx >= TRIES) finish();
        else { newTry(); game.fx.popup(tryIdx + ' / ' + TRIES, W / 2, H * 0.16, { color: C.gold, size: 42 }); }
      }
    }
    if (shake > 0) shake -= dt;

    alleyBg();
    drawScene();

    game.draw.rect(60, 40, W - 120, 22, C.ink);
    game.draw.rect(60, 40, (W - 120) * (tryIdx / TRIES), 22, C.gold);
    txt(tryIdx + ' / ' + TRIES, W / 2, 100, 38, C.white);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.30, 64, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.10);
    state = S.ATTRACT;
    initGame();
  });
})(game);

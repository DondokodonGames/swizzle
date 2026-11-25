// I-3DS-0002-paddle-mash-sprint.js
// パドル・マッシュ・スプリント — 川下りの小舟をできるだけ速く連打で漕ぎ、制限時間内にゴールへ
// 操作: 制限時間内にできるだけ多くタップして舟を漕ぎ進める
// 終わり: ゲージが満タンでゴールに届けば成功。時間切れで届かなければ失敗
// @mechanic: mash
// @theme: river_paddle_race
// 世界観: 渓流の川下りレースで、漕ぎ手が制限時間内にできるだけ多く櫂を漕ぎ、ライバル舟より先にゴールへ滑り込む
// 残るもの: 正誤(CLEAR/GAME OVER) + 漕いだ回数
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 限られた彩度、緑〜青系の小画面パレット
  var C = {
    bg: '#183048', bg2: '#0c1c30', river: '#2a6a8a', riverDark: '#184a64',
    boat: '#d8a860', boatDark: '#7a5424', rival: '#c85050', good: '#5ee06a', bad: '#ff5a4d',
    gold: '#ffd23f', white: '#e8f4ff', ink: '#060a10',
  };

  var GAME_TITLE = 'PADDLE SPRINT';
  var TIME_LIMIT = 9.5;
  var GOAL = 34;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PADDLER = ['.##.', '####', '.##.', '####'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 12; i++) game.draw.line(0, i * H / 12, W, i * H / 12, '#ffffff08');
  }

  var mashes, timeLeft, rivalProg, milestoneShown, done, endWait, finished, paddleFlip;
  var ready, hitStop, shake;

  function initGame() {
    mashes = 0; timeLeft = TIME_LIMIT; rivalProg = 0; milestoneShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; paddleFlip = false;
  }

  function paddle(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished || hitStop > 0) return;
    mashes++;
    paddleFlip = !paddleFlip;
    game.feedback.good(x, y, { text: '', color: C.river, count: 3 });
    game.audio.play('se_tap', 0.12);
    if (!milestoneShown && mashes >= Math.floor(GOAL * 0.6)) {
      milestoneShown = true;
      game.fx.popup('あと' + (GOAL - mashes) + '回!', W * 0.5, H * 0.35, { color: C.gold, size: 34 });
      game.audio.play('se_milestone', 0.4);
    }
    if (mashes >= GOAL) {
      ok = true; finished = true; hitStop = 0.15;
      game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
      game.fx.burst(x, y, { color: C.gold, count: 18, speed: 340 });
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    paddle(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawScene() {
    var t = Math.min(1, mashes / GOAL);
    var boatX = W * 0.2 + t * W * 0.6;
    var rivalX = W * 0.2 + Math.min(1, rivalProg) * W * 0.6;
    game.draw.rect(0, H * 0.55, W, H * 0.16, C.riverDark, 0.6);
    game.draw.circle(rivalX, H * 0.6, 30, C.rival);
    game.draw.rect(0, H * 0.36, W, H * 0.16, C.river, 0.6);
    var bob = Math.sin(game.time.elapsed * 10) * (paddleFlip ? 6 : -6);
    game.draw.sprite(PADDLER, { '#': C.boat }, boatX, H * 0.42 + bob, 11, { anchor: 'center' });
    game.draw.line(W * 0.85, H * 0.2, W * 0.85, H * 0.95, C.gold, 8);
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.42, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) { mashes = 0; rivalProg = 0; }
    var target = Math.min(GOAL, Math.floor((cyc / 2.0) * GOAL));
    while (mashes < target) {
      mashes++; paddleFlip = !paddleFlip;
      demo.press = true;
      game.audio.play('se_tap', 0.04);
    }
    rivalProg = Math.min(1, (cyc / 2.2));
    demo.gy = H * 0.42 + Math.sin(game.time.elapsed * 14) * 8;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(); drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(mashes + ' / ' + GOAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + Math.max(1, GOAL - mashes) + '回!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(mashes, { mashes: mashes });
        else game.end.failure({ mashes: mashes });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      rivalProg = 1 - (timeLeft / TIME_LIMIT);
      if (timeLeft <= 0) {
        ok = false; finished = true; hitStop = 0.3;
        game.feedback.bad(W * 0.5, H * 0.42, { text: 'TIME UP' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(mashes + ' / ' + GOAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.min(1, timeLeft / TIME_LIMIT), 16, timeLeft < TIME_LIMIT * 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);

// GH-PS-0079-dart-throw.js
// ダートスロー — 的の中心を狙う。3投の合計
// 操作: 押している間だけ力をためる。力のゲージが的の帯(中心ゾーン)に来た時に離す
// 終わり: 3投の合計点が残る
// @mechanic: hold_charge
// @theme: dart_board
// 世界観: 揺れる力のゲージ。帯の中で離せば中心に刺さる。ずれるほど点は落ちる
// 残るもの: 3投の合計(SCORE) + BEST
// スタイル: 2000s BILLBOARD 3D

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 2000s BILLBOARD 3D: 多色 + 影。奥行きはspriteのpxスケール、接地影で位置を示す
  var C = {
    bg1: '#2a3a5a', bg2: '#1a2440', board: '#e0d8c0', ring1: '#ff5a6a', ring2: '#ffd400', ring3: '#4dcf8a', bull: '#241a10',
    good: '#4dcf8a', bad: '#ff5a6a', gold: '#ffd400', white: '#f0f0f4', ink: '#0a0a12',
  };

  var GAME_TITLE = 'DART THROW';
  var THROWS = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var finalScore = 0, throwIdx = 0;

  var charging, power, results, done, endWait;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BX = W / 2, BY = H * 0.34;
  function boardBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    // スポットライトの帯(横に流れる、ATTRACT差分検出のためにも使う)
    var beamX = (game.time.elapsed * 280) % (W + 400) - 200;
    game.draw.rect(beamX, 0, 220, H, '#ffffff', 0.10);
    game.draw.circle(BX, BY + 60, 220, '#000000', 0.3);
    game.draw.circle(BX, BY, 220, C.board);
    game.draw.circle(BX, BY, 220, C.ring1, 0.5);
    game.draw.circle(BX, BY, 150, C.ring2, 0.5);
    game.draw.circle(BX, BY, 80, C.ring3, 0.5);
    game.draw.circle(BX, BY, 26, C.bull);
  }

  var DART_SPRITE = ['..#', '.##', '###'];

  function drawDarts() {
    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      game.draw.sprite(DART_SPRITE, { '#': C.ink }, BX + r.dx, BY + r.dy, 10, { anchor: 'center' });
    }
  }

  function initGame() {
    throwIdx = 0; results = []; charging = false; power = 0; done = false; endWait = 0;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function releaseThrow() {
    charging = false;
    var target = 0.78;
    var diff = Math.abs(power - target);
    var pts = diff < 0.06 ? 50 : diff < 0.14 ? 30 : diff < 0.26 ? 10 : 0;
    var ang = Math.random() * Math.PI * 2;
    var rad = diff < 0.06 ? 10 : diff < 0.14 ? 60 : diff < 0.26 ? 130 : 190;
    results.push({ dx: Math.cos(ang) * rad, dy: Math.sin(ang) * rad, pts: pts });
    finalScore += pts;
    hitStop = 0.1;
    if (pts >= 30) { game.feedback.good(BX, BY, { text: '+' + pts, color: C.gold }); game.fx.burst(BX, BY, { color: C.gold, count: 14, speed: 340 }); game.audio.play('se_success', 0.4); }
    else { game.feedback.bad(BX, BY, { text: '+' + pts }); game.audio.play('se_bad', 0.3); }
    throwIdx++;
    if (throwIdx >= THROWS) finish();
    else game.fx.popup(throwIdx + ' / ' + THROWS, W / 2, H * 0.16, { color: C.gold, size: 42 });
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(finalScore > 0 ? 'se_success' : 'se_failure');
    endWait = 1.4;
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });
  game.onPress(function() {
    if (state !== S.PLAYING || done || charging || throwIdx >= THROWS) return;
    charging = true; power = 0;
    game.audio.play('se_tap', 0.1);
  });
  game.onRelease(function() {
    if (!charging) return;
    game.audio.play('se_tap', 0.15);
    releaseThrow();
  });

  // ── ATTRACT ゴースト実演: 帯の中で離す ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.72, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.4;
    if (cyc < 1.6) { power = (Math.sin(cyc * 3.2 - Math.PI / 2) + 1) / 2; demo.press = true; }
    else { demo.press = false; }
    if (cyc > 1.55 && cyc < 1.62) { game.feedback.good(BX, BY, { text: '+50', color: C.gold }); game.fx.burst(BX, BY, { color: C.gold, count: 10, speed: 300 }); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (results === undefined) initGame();
      boardBg();
      stepDemo(dt);
      drawDarts();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 54, C.white);
      txt('BEST ' + game.best, W / 2, H * 0.13, 28, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 46, C.gold);
        txt('TAP TO START', W / 2, H * 0.95, 36, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 32, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      boardBg();
      drawDarts();
      txt(finalScore >= 50 ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 54, finalScore >= 50 ? C.white : C.bad);
      txt('SCORE ' + finalScore, W / 2, H * 0.62, 50, C.gold);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + best, W / 2, H * 0.68, 34, C.gold);
      if (finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.74, 36, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.90, 34, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) { state = S.RESULT; game.end.record(finalScore, { label: 'SCORE ' + finalScore }); }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (charging) {
      power = (Math.sin(game.time.elapsed * 3.2 - Math.PI / 2) + 1) / 2;
    }
    if (shake > 0) shake -= dt;

    boardBg();
    drawDarts();

    game.draw.rect(60, H * 0.66, W - 120, 26, C.ink, 0.5);
    game.draw.rect(60 + (W - 120) * 0.70, H * 0.66, (W - 120) * 0.16, 26, C.good, 0.5);
    game.draw.rect(60 + (W - 120) * power - 6, H * 0.66, 12, 26, C.gold);
    txt(throwIdx + ' / ' + THROWS, W / 2, H * 0.62, 34, C.white);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 60, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);

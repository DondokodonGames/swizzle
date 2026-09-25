// J-N644-0011-crumble-tower-climb.js
// クランブルタワークライム — 崩れていく足場を蹴って塔を登り、カメラが追う中で最後まで落ちずに登り切る
// 操作: ひび割れていく足場が消える前にタップして蹴り、次の足場へ登る。左右交互に現れる
// 終わり: 規定階(10階)まで落ちずに登り切れば成功。足場が崩れる前にタップできなければ失敗
// @mechanic: camera_climb
// @theme: crumbling_tower_ascent
// 世界観: 崩れかけた塔の登攀者が、ひび割れて消えていく足場だけを頼りに、カメラが見上げ続ける塔のてっぺんを目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 登れた階数
// スタイル: HYPERCASUAL 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 白背景 + 単色、柔らかい影の丸い塊
  var C = {
    bg: '#f5f5fa', bg2: '#e8e8f2', shadow: '#00000022',
    foot: '#6a5cff', footCrack: '#ff5c6a', climber: '#ffb84d', climberDark: '#e0902a',
    good: '#4de08a', bad: '#ff5c4d', gold: '#6a5cff', ink: '#2a2a3a', white: '#ffffff',
  };

  var GAME_TITLE = 'TOWER CLIMB';
  var TIME_LIMIT = 20;
  var NEEDED = 10;
  var FOOT_START = 1.3, FOOT_STEP = 0.045, FOOT_MIN = 0.85;
  var FOOT_Y = H * 0.60, FOOT_R = 110;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CLIMBER_SPRITE = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
  }

  var floor, footSide, footT, footMax, camBump, timeLeft;
  var done, endWait, finished, ready, hitStop, shake, halfCalled;

  function footX() { return footSide > 0 ? W * 0.72 : W * 0.28; }

  function newFoot() {
    footSide = footSide > 0 ? -1 : 1;
    footT = 0;
    footMax = Math.max(FOOT_MIN, FOOT_START - floor * FOOT_STEP);
  }

  function initGame() {
    floor = 0; footSide = -1; newFoot();
    timeLeft = TIME_LIMIT; camBump = 0;
    done = false; endWait = 0; finished = false; halfCalled = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function attemptTap(x, y) {
    if (finished) return;
    if (game.hit.circle(x, y, 4, footX(), FOOT_Y, FOOT_R)) {
      floor++;
      camBump = 0.2;
      game.feedback.good(x, y, { text: 'GOOD', color: C.good });
      game.fx.burst(x, y, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_jump', 0.4);
      if (floor === Math.ceil(NEEDED / 2) && !halfCalled) {
        halfCalled = true;
        game.fx.popup('NICE', x, y - 130, { color: C.gold, size: 32 });
        game.audio.play('se_milestone', 0.3);
      }
      if (floor >= NEEDED) {
        ok = true; finished = true; hitStop = 0.2;
        game.audio.play('se_success', 0.5);
        finish();
      } else {
        newFoot();
      }
    } else {
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_tap', 0.15);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0) attemptTap(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function stepPlay(dt) {
    footT += dt;
    if (footT >= footMax) {
      ok = false; finished = true; hitStop = 0.3; shake = 0.3;
      game.feedback.bad(footX(), FOOT_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.45);
      finish();
      return;
    }
    timeLeft -= dt;
    if (timeLeft <= 0) {
      ok = false; finished = true; hitStop = 0.3; shake = 0.2;
      game.feedback.bad(footX(), FOOT_Y, { text: 'TIME UP' });
      game.audio.play('se_failure', 0.4);
      finish();
    }
  }

  function drawScene() {
    for (var i = 0; i < 5; i++) {
      var py = (H * 0.2 + i * 160 + game.time.elapsed * 20) % (H + 100) - 50;
      game.draw.circle(W * (i % 2 === 0 ? 0.15 : 0.85), py, 30, C.bg2);
    }
    var pct = footT / footMax;
    var crackAlpha = Math.min(0.85, pct);
    game.draw.circle(footX(), FOOT_Y + 30, 70, C.shadow, 0.3);
    game.draw.circle(footX(), FOOT_Y, FOOT_R, C.foot);
    game.draw.circle(footX(), FOOT_Y, FOOT_R * (0.4 + pct * 0.5), C.footCrack, crackAlpha * 0.7);
    var cy = FOOT_Y - 130 - camBump * 60;
    game.draw.sprite(CLIMBER_SPRITE, { '#': C.climberDark }, footX(), cy, 28, { anchor: 'center' });
    for (var k = 0; k < 3; k++) {
      game.draw.rect(W * 0.5 - 40, H * 0.14 - k * 46, 80, 10, k < Math.min(3, Math.ceil(floor / Math.ceil(NEEDED / 3))) ? C.gold : C.bg2);
    }
  }

  var demo = { t: 0, gx: W * 0.28, gy: FOOT_Y, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.4;
    if (cyc < dt || demo.t <= dt) resetDemo();
    footT = Math.min(footMax, cyc);
    demo.gx = footX(); demo.gy = FOOT_Y;
    demo.press = cyc > 1.9 && cyc < 2.1;
    if (demo.press && footT < footMax - 0.05) {
      floor++;
      camBump = 0.2;
      game.feedback.good(demo.gx, demo.gy, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.2);
      newFoot();
    }
  }

  game.onUpdate(function(dt) {
    if (camBump > 0) camBump -= dt * 2;

    if (state === S.ATTRACT) {
      if (floor === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.09, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(floor + ' / ' + NEEDED, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(1, NEEDED - floor) + '階!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(floor, { floor: floor, needed: NEEDED });
        else game.end.failure({ floor: floor, needed: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepPlay(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(floor + ' / ' + NEEDED, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, C.ink, 0.12);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.2], ['E4', 0.2], ['G4', 0.2], ['C5', 0.4]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

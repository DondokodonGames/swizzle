// J-N644-0001-compass-dig-relay.js
// コンパスディグリレー — 回る矢印が示す砂山だけを見極めて掘り、規定数の宝を時間内に掘り当てる
// 操作: 画面中央のコンパス針が指す方向の砂山をタップして掘る。外れると針が次の山を指し直す
// 終わり: 規定数(6個)を時間内に掘り当てれば成功。時間切れなら失敗
// @mechanic: spot
// @theme: desert_compass_excavation
// 世界観: 荒野調査ロボットが、腕に取り付けた指向コンパスの針だけを頼りに、似た形の砂山群から正しい1つを次々に掘り当てていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 掘り当てた数
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 低コントラストの4階調グリーン、画面枠、残像気味の配色
  var C = {
    bg: '#9bbc0f', bg2: '#8bac0f', frame: '#0f380f',
    mound: '#306230', moundLit: '#0f380f', sand: '#9bbc0f',
    needle: '#0f380f', hub: '#8bac0f',
    good: '#0f380f', bad: '#0f380f', gold: '#0f380f', ink: '#0f380f', white: '#9bbc0f',
  };

  var GAME_TITLE = 'COMPASS DIG';
  var TIME_LIMIT = 12;
  var NEEDED = 6;
  var MOUND_COUNT = 5;
  var MOUND_R = 90;
  var PENALTY = 0.8;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.frame, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BOT_SPRITE = [
    '.####.',
    '######',
    '.#..#.',
    '##..##',
  ];
  var GEM_SPRITE = ['.#.', '###', '.#.'];

  var COMPASS_X = W * 0.5, COMPASS_Y = H * 0.30;
  var MOUNDS = [];
  for (var m = 0; m < MOUND_COUNT; m++) {
    var t = m / (MOUND_COUNT - 1);
    MOUNDS.push({ x: W * (0.18 + 0.64 * t), y: H * 0.52 });
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.05 + 0.05 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, C.frame, pulse * 0.4);
    var sweepY = (game.time.elapsed * 240) % (H + 200) - 100;
    game.draw.rect(0, sweepY, W, 70, C.frame, 0.22);
    game.draw.rect(20, 20, W - 40, H - 40, C.frame, 0); // screen frame outline (alpha0 = stroke-ish via rect edges below)
    game.draw.rect(20, 20, W - 40, 6, C.frame, 0.5);
    game.draw.rect(20, H - 26, W - 40, 6, C.frame, 0.5);
    game.draw.rect(20, 20, 6, H - 40, C.frame, 0.5);
    game.draw.rect(W - 26, 20, 6, H - 40, C.frame, 0.5);
    var bob = Math.sin(game.time.elapsed * 2) * 6;
    game.draw.sprite(BOT_SPRITE, { '#': C.frame }, W * 0.5, H * 0.86 + bob, 26, { anchor: 'center' });
  }

  function drawMounds(targetIdx, hitFlash) {
    for (var i = 0; i < MOUNDS.length; i++) {
      var mo = MOUNDS[i];
      var lit = hitFlash === i;
      game.draw.circle(mo.x, mo.y, MOUND_R, lit ? C.moundLit : C.mound, lit ? 1 : 0.85);
      game.draw.circle(mo.x, mo.y - 10, MOUND_R * 0.55, C.bg2, 0.5);
    }
  }

  function drawCompass(angle) {
    game.draw.circle(COMPASS_X, COMPASS_Y, 64, C.hub);
    game.draw.circle(COMPASS_X, COMPASS_Y, 64, C.needle, 0.15);
    var nx = COMPASS_X + Math.cos(angle) * 70;
    var ny = COMPASS_Y + Math.sin(angle) * 70;
    game.draw.line(COMPASS_X, COMPASS_Y, nx, ny, C.needle, 12);
    game.draw.circle(COMPASS_X, COMPASS_Y, 14, C.needle);
  }

  var dug, timeLeft, targetIdx, done, endWait, finished, ready, hitStop, shake, halfCalled, flashIdx, flashT;

  function pickTarget(exclude) {
    var idx;
    do { idx = Math.floor(game.random(0, MOUND_COUNT)); } while (idx === exclude && MOUND_COUNT > 1);
    return idx;
  }

  function initGame() {
    dug = 0; timeLeft = TIME_LIMIT; targetIdx = pickTarget(-1);
    done = false; endWait = 0; finished = false; halfCalled = false;
    ready = 0.8; hitStop = 0; shake = 0; flashIdx = -1; flashT = 0;
  }

  function angleTo(mo) {
    return Math.atan2(mo.y - COMPASS_Y, mo.x - COMPASS_X);
  }

  function attemptDig(x, y) {
    for (var i = 0; i < MOUNDS.length; i++) {
      var mo = MOUNDS[i];
      if (game.hit.circle(x, y, 4, mo.x, mo.y, MOUND_R)) {
        if (i === targetIdx) {
          dug++;
          flashIdx = i; flashT = 0.2;
          game.feedback.good(mo.x, mo.y, { text: '+1', color: C.gold });
          game.fx.burst(mo.x, mo.y - 20, { color: C.gold, count: 14, speed: 320 });
          game.audio.play('se_coin', 0.5);
          if (dug === Math.ceil(NEEDED / 2) && !halfCalled) {
            halfCalled = true;
            game.fx.popup('NICE', mo.x, mo.y - 130, { color: C.gold, size: 34 });
            game.audio.play('se_milestone', 0.3);
          }
          if (dug >= NEEDED) {
            ok = true; finished = true; hitStop = 0.25;
            game.audio.play('se_success', 0.5);
            finish();
          } else {
            targetIdx = pickTarget(targetIdx);
          }
        } else {
          timeLeft = Math.max(0, timeLeft - PENALTY);
          game.feedback.bad(mo.x, mo.y, { text: 'MISS' });
          game.audio.play('se_bad', 0.35);
        }
        return;
      }
    }
    game.audio.play('se_tap', 0.1);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) attemptDig(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: COMPASS_X, gy: COMPASS_Y, press: false };
  function resetDemo() {
    initGame();
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) resetDemo();
    var mo = MOUNDS[targetIdx];
    if (cyc < 2.0) {
      var t2 = cyc / 2.0;
      demo.gx = COMPASS_X + (mo.x - COMPASS_X) * t2;
      demo.gy = COMPASS_Y + (mo.y - COMPASS_Y) * t2;
      demo.press = false;
    } else if (cyc < 2.2) {
      demo.press = true;
      if (flashIdx !== targetIdx) {
        dug++;
        flashIdx = targetIdx; flashT = 0.2;
        game.feedback.good(mo.x, mo.y, { text: '+1', color: C.gold });
        game.audio.play('se_good', 0.25);
        targetIdx = pickTarget(targetIdx);
      }
    } else {
      demo.gx = mo.x; demo.gy = mo.y; demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    var angle = angleTo(MOUNDS[targetIdx] || MOUNDS[0]);
    if (flashT > 0) { flashT -= dt; if (flashT <= 0) flashIdx = -1; }

    if (state === S.ATTRACT) {
      if (dug === undefined) initGame();
      bg();
      stepDemo(dt);
      drawMounds(flashIdx, flashIdx);
      drawCompass(angle);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.09, 42, C.ink);
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
      drawMounds(-1, -1);
      drawCompass(angle);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, C.ink);
      txt(dug + ' / ' + NEEDED, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + (NEEDED - dug) + '個!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(dug, { dug: dug, needed: NEEDED });
        else game.end.failure({ dug: dug, needed: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.25; shake = 0.2;
        game.feedback.bad(W / 2, H * 0.6, { text: 'TIME UP' });
        game.audio.play('se_failure', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawMounds(flashIdx, flashIdx);
    if (!finished) drawCompass(angle);

    txt(dug + ' / ' + NEEDED, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 160, tbW, 16, C.frame, 0.2);
    game.draw.rect(60, 160, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 54, C.gold);
    if (flashIdx >= 0) game.draw.sprite(GEM_SPRITE, { '#': C.gold }, MOUNDS[flashIdx].x, MOUNDS[flashIdx].y - 100, 16, { anchor: 'center' });
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.25], ['E4', 0.25], ['G4', 0.25], ['C5', 0.5]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

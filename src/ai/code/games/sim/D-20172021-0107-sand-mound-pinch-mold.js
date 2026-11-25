// D-20172021-0107-sand-mound-pinch-mold.js
// サンドマウンド・ピンチモールド — 山盛りの砂を両手の指で同時に挟み、少しずつ形を締めて仕上げる
// 操作: 砂山の左右を2本指で同時にタップして挟み込み、形を締める
// 終わり: 制限時間内に規定回数挟み込めば成功。届かなければ失敗
// @mechanic: pinch_zone
// @theme: sand_mound_pinch_mold
// 世界観: 砂浜の造形師が盛った砂山の左右を両手の指で同時に挟み込み、崩さず少しずつ締めて綺麗な山型に仕上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 挟み込めた回数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: 淡いパステル3色+白、丸みのある形
  var C = {
    bg: '#fff0e0', bg2: '#ffe0d0', sea: '#bfe6ea', sand: '#f2d49a', sandDark: '#d9b56a',
    zoneOk: '#ffd6a0', zoneWarn: '#ff9f7a',
    good: '#3fbf8f', bad: '#ff4d5e', gold: '#ffb400', ink: '#402410', white: '#ffffff',
  };

  var GAME_TITLE = 'SAND MOLD';
  var MOUND_X = W * 0.5, MOUND_Y = H * 0.56, MOUND_R = 210;
  var NEED_PINCH = 5;
  var TIME_LIMIT = 12;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#301a08', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SCULPTOR_F = [
    ['#.#.#', '#####', '.###.'],
    ['#.#.#', '#####', '.#.#.'],
  ];

  function leftZone() { return { x: MOUND_X - MOUND_R - 20, y: MOUND_Y }; }
  function rightZone() { return { x: MOUND_X + MOUND_R + 20, y: MOUND_Y }; }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, H * 0.7, W, H * 0.3, C.sea, 0.4);
  }

  var pinches, roundClock, squeeze, pinchFlash;
  var done, endWait, finished, ready, hitStop, shake, milestoneShown;

  function initGame() {
    pinches = 0; roundClock = 0; squeeze = 0; pinchFlash = 0; milestoneShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function evalTouches() {
    if (finished || ready > 0) return;
    var t = game.touches;
    if (!t || t.length < 2) return;
    var a = t[0], b = t[1];
    var lz = leftZone(), rz = rightZone();
    var leftHit = (Math.hypot(a.x - lz.x, a.y - lz.y) < 90) || (Math.hypot(b.x - lz.x, b.y - lz.y) < 90);
    var rightHit = (Math.hypot(a.x - rz.x, a.y - rz.y) < 90) || (Math.hypot(b.x - rz.x, b.y - rz.y) < 90);
    if (leftHit && rightHit) {
      pinches++;
      squeeze = 0.25; pinchFlash = 0.2;
      game.feedback.good(MOUND_X, MOUND_Y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.4);
      if (pinches === Math.floor(NEED_PINCH / 2) && !milestoneShown) {
        milestoneShown = true;
        game.fx.popup('NICE', W / 2, MOUND_Y - 260, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.3);
      }
      if (pinches >= NEED_PINCH) succeedNow();
    } else {
      game.feedback.bad((a.x + b.x) / 2, (a.y + b.y) / 2, { text: 'MISS' });
      game.audio.play('se_bad', 0.25);
    }
  }

  function succeedNow() {
    if (finished) return;
    ok = true; finished = true; hitStop = 0.22;
    game.fx.burst(MOUND_X, MOUND_Y, { color: C.gold, count: 24, speed: 400 });
    game.audio.play('se_success', 0.5);
    finish();
  }
  function failNow() {
    if (finished) return;
    ok = false; finished = true; hitStop = 0.3; shake = 0.2;
    game.feedback.bad(MOUND_X, MOUND_Y, { text: 'MISS' });
    game.audio.play('se_failure', 0.4);
    finish();
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    game.audio.play('se_tap', 0.06);
    evalTouches();
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function drawScene(p, sq) {
    var r = MOUND_R - p * 8;
    var squeezeScale = 1 - sq * 0.12;
    game.draw.circle(MOUND_X, MOUND_Y + 60, r * squeezeScale, C.sand);
    game.draw.circle(MOUND_X, MOUND_Y + 20, r * 0.7 * squeezeScale, C.sand);
    game.draw.rect(MOUND_X - r * squeezeScale, MOUND_Y + 60, r * 2 * squeezeScale, 14, C.sandDark, 0.4);
    var lz = leftZone(), rz = rightZone();
    game.draw.circle(lz.x, lz.y, 88, C.zoneOk, 0.6);
    game.draw.circle(rz.x, rz.y, 88, C.zoneOk, 0.6);
    var sf = Math.floor(game.time.elapsed * 4) % 2;
    game.draw.sprite(SCULPTOR_F[sf], { '#': C.ink }, W * 0.5, H * 0.2, 12, { anchor: 'center' });
  }

  var demo = { t: 0, lx: 0, ly: 0, rx: 0, ry: 0, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (ready > 0) { ready -= dt; if (ready < 0) ready = 0; return; }
    if (finished) return;
    roundClock += dt;
    var seg = cyc % 1.5;
    var lz = leftZone(), rz = rightZone();
    if (seg < 0.6) {
      var t2 = seg / 0.6;
      demo.lx = MOUND_X - 300 + (lz.x - (MOUND_X - 300)) * t2;
      demo.ly = MOUND_Y - 200 + (lz.y - (MOUND_Y - 200)) * t2;
      demo.rx = MOUND_X + 300 + (rz.x - (MOUND_X + 300)) * t2;
      demo.ry = MOUND_Y - 200 + (rz.y - (MOUND_Y - 200)) * t2;
      demo.press = false;
    } else if (seg < 0.75) {
      demo.press = true;
      if (!demo.resolved) {
        demo.resolved = true;
        pinches++;
        squeeze = 0.25;
        game.feedback.good(MOUND_X, MOUND_Y, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.3);
        if (pinches >= NEED_PINCH) succeedNow();
      }
    } else {
      demo.resolved = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (pinches === undefined) initGame();
      stepDemo(dt);
      if (squeeze > 0) squeeze -= dt;
      bg();
      drawScene(pinches, Math.max(0, squeeze));
      game.draw.hand(demo.lx, demo.ly, { press: demo.press, scale: 14 });
      game.draw.hand(demo.rx, demo.ry, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.1, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.14, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.96, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene(pinches, 0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.1, 46, ok ? C.good : C.bad);
      txt(pinches + ' / ' + NEED_PINCH, W / 2, H * 0.15, 28, C.gold);
      if (!ok) txt('あと1個!', W / 2, H * 0.19, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(pinches, { pinches: pinches });
        else game.end.failure({ pinches: pinches });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      if (roundClock >= TIME_LIMIT) failNow();
    }
    if (shake > 0) shake -= dt;
    if (squeeze > 0) squeeze -= dt;

    bg();
    drawScene(pinches, Math.max(0, squeeze));

    txt(pinches + ' / ' + NEED_PINCH, W / 2, H * 0.06, 28, C.ink);
    var barPct = Math.max(0, 1 - roundClock / TIME_LIMIT);
    game.draw.rect(60, 150, W - 120, 16, '#00000022', 1);
    game.draw.rect(60, 150, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['F4', 0.25], ['A4', 0.25], ['C5', 0.5]], { tempo: 126, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

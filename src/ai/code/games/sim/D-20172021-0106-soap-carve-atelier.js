// D-20172021-0106-soap-carve-atelier.js
// ソープカーヴ・アトリエ — 石鹸の塊を小刀で高速に往復させて削り、時間内に滑らかな形に仕上げる
// 操作: 石鹸の上で指を素早く左右に往復させてこすり、削り具合ゲージを満たす
// 終わり: 制限時間内に削り具合ゲージを満タンにすれば成功。満たせなければ失敗
// @mechanic: rub
// @theme: soap_carve_atelier
// 世界観: 工房の彫刻家が四角い石鹸の塊を小刀で素早く往復させて削り、制限時間内になめらかな形に仕上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 削れた度合い(%)
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 高解像ドット風、淡いパステル+柔らかい陰影
  var C = {
    bg: '#eaf6ff', bg2: '#cfe8fb', bench: '#a8c8da', benchDark: '#84a8ba',
    soap: '#f0e6c0', soapCarved: '#fff8e0', shave: '#ffffff',
    good: '#3fbf8f', bad: '#ff4d5e', gold: '#ffb400', ink: '#183040', white: '#ffffff',
  };

  var GAME_TITLE = 'SOAP CARVE';
  var SOAP_X = W * 0.5, SOAP_Y = H * 0.5, SOAP_W = 420, SOAP_H = 300;
  var TIME_LIMIT = 10;
  var NEED = 100;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#0a1a28', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SCULPTOR_F = [
    ['.##.', '####', '.##.', '#..#'],
    ['.##.', '####', '.##.', '.##.'],
  ];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, H * 0.38, W, H * 0.28, C.bench);
    game.draw.rect(0, H * 0.38, W, 8, C.benchDark, 0.5);
  }

  var progress, dragging, lastX, lastDir, roundClock, shaveFx;
  var done, endWait, finished, ready, hitStop, shake, milestoneShown;

  function initGame() {
    progress = 0; dragging = false; lastX = 0; lastDir = 0; roundClock = 0; shaveFx = 0; milestoneShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function inSoap(x, y) {
    return Math.abs(x - SOAP_X) < SOAP_W / 2 + 40 && Math.abs(y - SOAP_Y) < SOAP_H / 2 + 40;
  }

  function rubMove(x, y) {
    if (!inSoap(x, y)) return;
    var dx = x - lastX;
    var dir = dx > 2 ? 1 : dx < -2 ? -1 : 0;
    if (dir !== 0 && dir !== lastDir && lastDir !== 0) {
      progress += 3.2;
      shaveFx = 0.15;
      game.fx.burst(x, SOAP_Y - SOAP_H / 2 + Math.random() * SOAP_H, { color: C.shave, count: 6, speed: 200 });
      if (Math.random() < 0.5) game.audio.tone(900 + Math.random() * 300, 0.03, { wave: 'square', volume: 0.03 });
    } else if (dir !== 0) {
      progress += 0.6;
    }
    if (dir !== 0) lastDir = dir;
    lastX = x;
    if (progress > NEED) progress = NEED;
    if (progress >= NEED * 0.5 && !milestoneShown) {
      milestoneShown = true;
      game.fx.popup('NICE', W / 2, SOAP_Y - 200, { color: C.gold, size: 34 });
      game.audio.play('se_milestone', 0.3);
    }
    if (progress >= NEED) succeedNow();
  }

  function succeedNow() {
    if (finished) return;
    ok = true; finished = true; hitStop = 0.2;
    game.feedback.good(SOAP_X, SOAP_Y, { text: 'GOOD', color: C.good });
    game.fx.burst(SOAP_X, SOAP_Y, { color: C.gold, count: 24, speed: 400 });
    game.audio.play('se_success', 0.5);
    finish();
  }
  function failNow() {
    if (finished) return;
    ok = false; finished = true; hitStop = 0.3; shake = 0.2;
    game.feedback.bad(SOAP_X, SOAP_Y, { text: 'MISS' });
    game.audio.play('se_failure', 0.4);
    finish();
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    dragging = true; lastX = x; lastDir = 0;
    game.audio.play('se_tap', 0.08);
  });
  game.onMove(function(x, y) { if (dragging && state === S.PLAYING && !finished) rubMove(x, y); });
  game.onRelease(function() { dragging = false; lastDir = 0; if (!finished) game.audio.play('se_tap', 0.04); });

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

  function drawScene(p, drX, drY) {
    var shrink = (p / NEED) * 70;
    game.draw.rect(SOAP_X - SOAP_W / 2 + shrink * 0.5, SOAP_Y - SOAP_H / 2 + shrink * 0.5, SOAP_W - shrink, SOAP_H - shrink, C.soap);
    game.draw.rect(SOAP_X - SOAP_W / 2 + shrink * 0.5, SOAP_Y - SOAP_H / 2 + shrink * 0.5, SOAP_W - shrink, 14, C.soapCarved, 0.6);
    if (drX !== undefined) game.draw.circle(drX, drY, 16, '#c0c8d0');
    var sf = Math.floor(game.time.elapsed * 4) % 2;
    game.draw.sprite(SCULPTOR_F[sf], { '#': C.ink }, W * 0.16, H * 0.2, 12, { anchor: 'center' });
  }

  var demo = { t: 0, gx: SOAP_X - 140, gy: SOAP_Y, press: false, dir: 1 };
  function resetDemo() { initGame(); demo.dir = 1; }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.5;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (ready > 0) { ready -= dt; if (ready < 0) ready = 0; return; }
    if (finished) return;
    roundClock += dt;
    demo.gx += demo.dir * 900 * dt;
    if (demo.gx > SOAP_X + 140) { demo.gx = SOAP_X + 140; demo.dir = -1; }
    if (demo.gx < SOAP_X - 140) { demo.gx = SOAP_X - 140; demo.dir = 1; }
    demo.gy = SOAP_Y;
    demo.press = true;
    if (!dragging) { dragging = true; lastX = demo.gx; lastDir = 0; }
    rubMove(demo.gx, demo.gy);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      stepDemo(dt);
      bg();
      drawScene(progress, demo.gx, demo.gy);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.14, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best + '%' : '-'), W / 2, H * 0.18, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.96, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene(progress, undefined, undefined);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.14, 46, ok ? C.good : C.bad);
      txt(Math.round(progress) + '%', W / 2, H * 0.19, 28, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.23, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var p2 = Math.round(progress);
        if (ok) game.end.success(p2, { percent: p2 });
        else game.end.failure({ percent: p2 });
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
    if (shaveFx > 0) shaveFx -= dt;

    bg();
    drawScene(progress, dragging ? lastX : undefined, SOAP_Y);

    txt(Math.round(progress) + ' / ' + NEED, W / 2, H * 0.08, 28, C.ink);
    var barPct = Math.max(0, 1 - roundClock / TIME_LIMIT);
    game.draw.rect(60, 200, W - 120, 16, '#00000022', 1);
    game.draw.rect(60, 200, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.2], ['G4', 0.2], ['B4', 0.4]], { tempo: 150, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

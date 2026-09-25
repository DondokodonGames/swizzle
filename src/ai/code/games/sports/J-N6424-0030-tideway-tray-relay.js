// J-N6424-0030-tideway-tray-relay.js
// タイドウェイ・トレイリレー — 生きた魚を乗せた盆を落とさぬよう均衡を保ちながら岸壁を走り抜ける
// 操作: 突風で盆が傾いた側と反対のゾーン(画面左右)をタップして踏ん張り、水平に戻す
// 終わり: 規定回数(6回)の突風を耐えきれば成功。傾きが限界を超えて魚が落ちれば失敗
// @mechanic: balance
// @theme: fish_tray_balance_relay
// 世界観: 港町の見習い配達人が、生きた魚を乗せた盆を落とさぬよう均衡を保ちながら岸壁を走り抜け、突風に耐えて魚市場まで届け切る
// 残るもの: 正誤(CLEAR/GAME OVER) + 耐えた突風の数
// スタイル: 90s HANDHELD COLOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 彩度の高い原色、太い輪郭、単純な陰影
  var C = {
    bg: '#6fc7e6', bg2: '#2f8fc2', dock: '#c99a55', dockDark: '#93672f',
    tray: '#e8e4d0', trayEdge: '#8a6a3a', fish: '#4fa8e0', fishDark: '#276fa0',
    man: '#e0a06a', manCloth: '#3a6ea0', good: '#39d67a', bad: '#ff4d5e',
    gold: '#ffd400', ink: '#123048', white: '#ffffff',
  };

  var GAME_TITLE = 'TRAY RELAY';
  var GUSTS_TOTAL = 6;
  var TRAY_Y = H * 0.52;
  var TRAY_W = 520;
  var MAX_OFFSET = TRAY_W * 0.42;
  var CORRECT_STEP = 0.34;
  var TIME_LIMIT = 22;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var MAN = ['.##.', '####', '.##.', '#..#'];
  var FISH = ['..##', '####', '..##'];
  var BYSTANDER = ['.##.', '####', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    game.draw.rect(0, H * 0.62, W, H * 0.38, C.dock);
    game.draw.rect(0, H * 0.62, W, 10, C.dockDark);
    for (var i = 0; i < 3; i++) {
      var bx = 130 + i * 400 + Math.sin(game.time.elapsed * 0.8 + i) * 20;
      var by = H * 0.7 + Math.sin(game.time.elapsed * 1.6 + i * 2) * 6;
      game.draw.sprite(BYSTANDER, { '#': '#ffffff' }, bx, by, 16, { anchor: 'center', alpha: 0.35 });
    }
  }

  var tilt, gustsSurvived, gustTimer, gustDir, warnPhase, dropped;
  var done, endWait, finished, ready, hitStop, shake, elapsed;

  function scheduleGust() {
    gustTimer = 1.8 + Math.random() * 0.8;
    gustDir = Math.random() < 0.5 ? -1 : 1;
    warnPhase = false;
  }

  function initGame() {
    tilt = 0; gustsSurvived = 0; dropped = false; elapsed = 0;
    scheduleGust();
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function drawScene() {
    var cx = W * 0.5;
    game.draw.rect(cx - TRAY_W / 2, TRAY_Y, TRAY_W, 20, C.trayEdge);
    game.draw.rect(cx - TRAY_W / 2 + 6, TRAY_Y - 10, TRAY_W - 12, 12, C.tray);
    var fishX = cx + tilt * MAX_OFFSET;
    var wob = Math.sin(game.time.elapsed * 6) * 4;
    game.draw.sprite(FISH, { '#': C.fish }, fishX, TRAY_Y - 30 + wob, 22, { anchor: 'center', flipX: tilt < 0 });
    game.draw.sprite(MAN, { '#': C.manCloth }, cx, TRAY_Y + 120, 34, { anchor: 'center' });
    // tilt gauge
    var gx = W * 0.5, gy = H * 0.30, gw = 480;
    game.draw.rect(gx - gw / 2, gy - 10, gw, 20, '#ffffff', 0.5);
    var markerX = gx + tilt * (gw / 2 - 14);
    game.draw.circle(markerX, gy, 16, Math.abs(tilt) > 0.75 ? C.bad : C.gold);
    game.draw.rect(gx - 4, gy - 20, 8, 40, '#ffffff', 0.6);
    // gust telegraph arrow
    if (warnPhase && !finished) {
      var ax = gustDir > 0 ? cx - TRAY_W / 2 - 60 : cx + TRAY_W / 2 + 60;
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) txt(gustDir > 0 ? '>>' : '<<', ax, TRAY_Y, 40, C.bad);
    }
  }

  function applyTap(side) {
    if (finished || ready > 0) return;
    game.audio.play('se_tap', 0.2);
    var corrective = (side < 0 && tilt > 0.03) || (side > 0 && tilt < -0.03) || Math.abs(tilt) < 0.06;
    if (corrective) {
      tilt += side < 0 ? -CORRECT_STEP : CORRECT_STEP;
      // overcorrecting past center settles the tray instead of flinging it the other way
      if ((side < 0 && tilt < -0.2) || (side > 0 && tilt > 0.2)) tilt *= 0.5;
      game.feedback.good(side < 0 ? W * 0.22 : W * 0.78, H * 0.75, { text: 'GOOD', color: C.good, size: 22 });
    } else {
      tilt += side < 0 ? -CORRECT_STEP * 0.7 : CORRECT_STEP * 0.7;
      game.feedback.bad(side < 0 ? W * 0.22 : W * 0.78, H * 0.75, { text: 'MISS', size: 22 });
    }
    tilt = Math.max(-1.3, Math.min(1.3, tilt));
    checkDrop();
  }

  function checkDrop() {
    if (Math.abs(tilt) >= 1.0 && !finished) {
      dropped = true; finished = true; ok = false; hitStop = 0.45; shake = 0.3;
      game.feedback.bad(W * 0.5 + tilt * MAX_OFFSET, TRAY_Y - 30, { text: 'MISS' });
      game.audio.play('se_bad', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) applyTap(x < W / 2 ? -1 : 1);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function stepGust(dt) {
    gustTimer -= dt;
    if (!warnPhase && gustTimer <= 0.7) {
      warnPhase = true;
      game.audio.tone('A4', 0.12, { wave: 'square', volume: 0.15 });
    }
    if (gustTimer <= 0) {
      tilt += gustDir * (0.42 + Math.random() * 0.18);
      tilt = Math.max(-1.3, Math.min(1.3, tilt));
      checkDrop();
      if (!finished) {
        gustsSurvived++;
        game.audio.play('se_milestone', 0.3);
        if (gustsSurvived === Math.ceil(GUSTS_TOTAL / 2)) {
          game.fx.popup('NICE', W * 0.5, H * 0.24, { color: C.gold, size: 34 });
        }
        if (gustsSurvived >= GUSTS_TOTAL) {
          finished = true; ok = true; hitStop = 0.3;
          game.feedback.good(W * 0.5, TRAY_Y - 30, { text: 'CLEAR', color: C.good });
          game.fx.burst(W * 0.5, TRAY_Y - 30, { color: C.gold, count: 20, speed: 380 });
          game.audio.play('se_success', 0.5);
          finish();
        } else {
          scheduleGust();
        }
      }
    }
  }

  var demo = { t: 0, gx: W * 0.22, gy: H * 0.75, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (cyc < 3.0) stepGust(dt);
    var wantLeft = tilt > 0;
    demo.gx = wantLeft ? W * 0.22 : W * 0.78;
    demo.gy = H * 0.75;
    demo.press = warnPhase && gustTimer < 0.5;
    if (demo.press && Math.random() < 0.3) applyTap(wantLeft ? -1 : 1);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (tilt === undefined) initGame();
      stepDemo(dt);
      bg();
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 48, ok ? C.good : C.bad);
      txt(gustsSurvived + ' / ' + GUSTS_TOTAL, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(0, GUSTS_TOTAL - gustsSurvived) + '本!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(gustsSurvived, { gusts: gustsSurvived, total: GUSTS_TOTAL });
        else game.end.failure({ gusts: gustsSurvived, total: GUSTS_TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      elapsed += dt;
      stepGust(dt);
      if (elapsed >= TIME_LIMIT && !finished) {
        finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(W * 0.5, TRAY_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(gustsSurvived + ' / ' + GUSTS_TOTAL, W / 2, H * 0.06, 30, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.25], ['E4', 0.25], ['G4', 0.25], ['C5', 0.5]], { tempo: 132, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

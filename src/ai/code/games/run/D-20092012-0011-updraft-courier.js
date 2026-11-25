// D-20092012-0011-updraft-courier.js
// アップドラフト・クーリエ — 背中の送風ユニットで浮かぶ配達員が、指の高さに合わせて上下し迫る障害物をかわす
// 操作: 画面を指で押さえたまま上下にドラッグすると、配達員がその高さへついてくる
// 終わり: 規定数(6個)の障害物帯を抜ければ成功。障害物に触れれば失敗
// @mechanic: drag_follow
// @theme: updraft_courier
// 世界観: 高層ビルの谷間を行き来する送風ユニット配達員。指先の高さに合わせて上下しながら、迫る看板や配管をかわして荷物を届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 抜けた障害物帯の数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 先に一回り大きい黒で輪郭、内側は明・暗2色だけ
  var C = {
    bg1: '#4a90d8', bg2: '#1a4a8a', bldgLight: '#e8e0d0', bldgDark: '#a89878',
    outline: '#0a0a12', body: '#ffb020', bodyDark: '#c87810',
    ob: '#ff5a4a', obDark: '#c8203f', good: '#4dff8a', bad: '#ff4d5e',
    gold: '#ffe14a', white: '#ffffff', ink: '#0a0a12',
  };

  var GAME_TITLE = 'UPDRAFT COURIER';
  var TOTAL = 6;
  var CX = W * 0.32;
  var MIN_Y = H * 0.20, MAX_Y = H * 0.78;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var COURIER = ['.##.', '####', '.##.', '#..#'];

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg(scroll) {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg1]]);
    for (var i = 0; i < 4; i++) {
      var xx = ((i * 320 - scroll * 0.3) % (W + 320) + (W + 320)) % (W + 320) - 160;
      game.draw.rect(xx, 0, 160, H, C.bldgDark, 0.3);
      game.draw.rect(xx + 20, 0, 120, H, C.bldgLight, 0.12);
    }
  }

  var lane, obstacles, dodged, scroll, done, endWait, finished, courierY, targetY;
  var ready, hitStop, shake, milestoneDone;

  function newObstacle(idx) {
    var gapY = H * (0.28 + Math.random() * 0.44);
    return { x: W + 150, gapY: gapY, gapH: 320, speed: 620 + idx * 40, telegraphed: false, resolved: false };
  }

  function initGame() {
    dodged = 0; scroll = 0; courierY = H * 0.5; targetY = courierY;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneDone = false;
    obstacles = [newObstacle(0)];
  }

  game.onPress(function(x, y) { if (state === S.PLAYING) { targetY = y; game.audio.play('se_tap', 0.05); } });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || finished || ready > 0) return;
    targetY = y;
    if (Math.random() < 0.06) game.audio.play('se_tap', 0.02);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.1); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function updateGame(dt) {
    targetY = Math.max(MIN_Y, Math.min(MAX_Y, targetY));
    courierY += (targetY - courierY) * Math.min(1, dt * 10);
    scroll += 620 * dt;
    for (var i = obstacles.length - 1; i >= 0; i--) {
      var o = obstacles[i];
      o.x -= o.speed * dt;
      if (o.x < CX + 700 && !o.telegraphed) o.telegraphed = true;
      if (!o.resolved && o.x <= CX + 70 && o.x > CX - 70) {
        o.resolved = true;
        var hit = courierY < o.gapY - o.gapH / 2 + 40 || courierY > o.gapY + o.gapH / 2 - 40;
        if (hit) {
          hitStop = 0.35; shake = 0.3;
          game.feedback.bad(CX, courierY, { text: 'HIT' });
          game.audio.play('se_bad', 0.4);
          ok = false; finished = true; finish();
        } else {
          dodged++;
          hitStop = 0.08;
          game.feedback.good(CX, courierY, { text: 'GOOD', color: C.good });
          game.audio.play('se_good', 0.3);
          if (dodged === Math.ceil(TOTAL / 2) && !milestoneDone) {
            milestoneDone = true;
            game.fx.popup('HALFWAY!', W / 2, H * 0.3, { color: C.gold, size: 40 });
            game.audio.play('se_milestone', 0.35);
          }
          if (dodged >= TOTAL) { ok = true; finished = true; finish(); }
        }
      }
      if (o.x < -200) obstacles.splice(i, 1);
    }
    if (!finished && dodged < TOTAL && obstacles.length < 2) {
      var last = obstacles[obstacles.length - 1];
      if (!last || last.x < W * 0.55) obstacles.push(newObstacle(dodged));
    }
  }

  var demo = { t: 0, gx: CX, gy: H * 0.5, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; }
    if (!finished) updateGame(dt);
    var o = obstacles[0];
    if (o) {
      targetY = o.gapY;
      demo.gx = CX + Math.cos(game.time.elapsed * 1.4) * 10;
      demo.gy = courierY;
    }
    demo.press = true;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (dodged === undefined) initGame();
      bg(scroll);
      stepDemo(dt);
      drawObstacles();
      drawCourier();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(scroll); drawObstacles(); drawCourier();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(dodged + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - dodged) + '個!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(dodged, { dodged: dodged, total: TOTAL });
        else game.end.failure({ dodged: dodged, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      updateGame(dt);
    }
    if (shake > 0) shake -= dt;

    bg(scroll); drawObstacles(); drawCourier();

    txt(dodged + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.3);
    game.draw.rect(60, 150, (W - 120) * (dodged / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  function drawObstacles() {
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      if (!o.telegraphed) continue;
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      var topH = o.gapY - o.gapH / 2;
      var botY = o.gapY + o.gapH / 2;
      game.draw.rect(o.x - 90, 0, 180, topH, C.outline);
      game.draw.rect(o.x - 78, 0, 156, topH - 10, C.ob);
      game.draw.rect(o.x - 90, botY, 180, H - botY, C.outline);
      game.draw.rect(o.x - 78, botY + 10, 156, H - botY - 10, C.ob);
      if (o.x < CX + 400) {
        game.draw.rect(o.x - 90, topH - 12, 180, 8, C.gold, blink ? 0.9 : 0.4);
        game.draw.rect(o.x - 90, botY + 4, 180, 8, C.gold, blink ? 0.9 : 0.4);
      }
    }
  }

  function drawCourier() {
    var tilt = (targetY - courierY) * 0.04;
    game.draw.circle(CX, courierY + 60, 30, C.outline, 0.3);
    game.draw.sprite(COURIER, { '#': C.body }, CX + tilt, courierY, 16, { anchor: 'center' });
  }

  game.onStart(function() {
    game.audio.melody([['D4', 0.3], ['F4', 0.3], ['A4', 0.3], ['D5', 0.5]], { tempo: 150, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

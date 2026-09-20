// GH-PS-0057-bullet-gap.js
// バレットギャップ — 弾幕の隙間を抜けながら進む。自機の当たり判定は小さい
// 操作: 指で左右にドラッグして、迫る弾幕列の隙間へ機体を入れる
// 終わり: 規定の列数を抜ければ成功。1列でも当たれば失敗
// @mechanic: dodge
// @theme: bullet_curtain
// 世界観: 見下ろしの戦場。上から弾幕の列が繰り返し迫る。列ごとに隙間の位置が変わる。自機の当たり判定は小さく、隙間の端でもすり抜けられる
// 残るもの: 正誤(CLEAR/GAME OVER) + 抜けた列数
// スタイル: MODERN AD-GAME

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // MODERN AD-GAME: 高彩度・高コントラスト。太い縁取り、飛ぶ数字、3秒で伝わる画面
  var C = {
    bg1: '#101820', bg2: '#0a0e14', ship: '#3ad4ff', bullet: '#ff3d5e', bulletEdge: '#ffffff',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#f4f8ff', ink: '#050810',
  };

  var GAME_TITLE = 'BULLET GAP';
  var ROWS_TO_CLEAR = 8;
  var SHIP_Y = H * 0.80;
  var SHIP_R = 18;
  var GAP_W = 220;
  var ROW_INTERVAL = 1.5;
  var ROW_SPEED = 620;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, passed = 0;

  var shipX, rows, spawnT, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function battleBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    for (var i = 0; i < 10; i++) game.draw.rect(0, i * (H / 10), W, 2, '#ffffff08');
    // 縦の警戒ライン(奥行き+接近ラインの視認性)
    for (var j = 0; j < 3; j++) {
      var lx = W * (0.2 + j * 0.3);
      game.draw.rect(lx - 2, 0, 4, H, C.ship, 0.06);
    }
    // 侵入警戒スキャン(上→下へ流れる帯。奥行きと動きを常時演出)
    var scanY = (game.time.elapsed * 260) % (H + 200) - 100;
    game.draw.rect(0, scanY, W, 90, C.ship, 0.05);
  }

  var SHIP_SPRITE = ['..#..', '.###.', '#####', '.#.#.'];

  function drawShip() {
    game.draw.circle(shipX, SHIP_Y + 10, SHIP_R + 8, '#00000040');
    game.draw.sprite(SHIP_SPRITE, { '#': C.ship }, shipX, SHIP_Y, 8, { anchor: 'center' });
    game.draw.circle(shipX, SHIP_Y, SHIP_R, C.ship, 0.0);
  }

  function drawRows() {
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var bw = (r.gapX - GAP_W / 2);
      game.draw.rect(0, r.y - 12, bw, 24, C.bullet);
      game.draw.rect(0, r.y - 12, bw, 6, C.bulletEdge);
      var rightX = r.gapX + GAP_W / 2;
      game.draw.rect(rightX, r.y - 12, W - rightX, 24, C.bullet);
      game.draw.rect(rightX, r.y - 12, W - rightX, 6, C.bulletEdge);
    }
  }

  function newRow() {
    rows.push({ y: -20, gapX: 120 + Math.random() * (W - 240), passed: false });
  }

  function initGame() {
    shipX = W / 2; rows = []; spawnT = 0.6; passed = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function onDrag(x) {
    if (done || ready > 0 || finished) return;
    shipX = Math.max(60, Math.min(W - 60, x));
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); return; }
  });
  game.onPress(function(x) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.04); onDrag(x); } });
  game.onMove(function(x) {
    if (state !== S.PLAYING) return;
    if (Math.random() < 0.04) game.audio.play('se_tap', 0.02);
    onDrag(x);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (ok) game.audio.play('se_success', 0.5); else game.audio.play('se_failure', 0.4);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W / 2, gy: SHIP_Y, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    if (shipX === undefined) initGame();
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) { rows = []; spawnT = 0.4; }
    spawnT -= dt;
    if (spawnT <= 0) { newRow(); spawnT = ROW_INTERVAL * 0.7; }
    for (var i = rows.length - 1; i >= 0; i--) {
      rows[i].y += ROW_SPEED * dt;
      shipX += (rows[i].gapX - shipX) * Math.min(1, dt * 2.4);
      if (rows[i].y > H + 40) rows.splice(i, 1);
    }
    demo.gx = shipX; demo.gy = SHIP_Y;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      battleBg();
      stepDemo(dt);
      drawRows();
      drawShip();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 48, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 42, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      battleBg();
      drawRows();
      drawShip();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(passed + ' / ' + ROWS_TO_CLEAR, W / 2, H * 0.12, 30, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success({ passed: passed }); else game.end.failure({ passed: passed });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      spawnT -= dt;
      if (spawnT <= 0) { newRow(); spawnT = Math.max(0.8, ROW_INTERVAL - passed * 0.05); }
      for (var i = rows.length - 1; i >= 0; i--) {
        var r = rows[i];
        r.y += (ROW_SPEED + passed * 12) * dt;
        if (!r.passed && r.y > SHIP_Y - 12 && r.y - 12 < SHIP_Y + SHIP_R) {
          if (Math.abs(shipX - r.gapX) > GAP_W / 2 - SHIP_R) {
            finished = true; ok = false; hitStop = 0.15;
            game.feedback.bad(shipX, SHIP_Y, { text: 'HIT' });
            shake = 0.3;
            game.fx.burst(shipX, SHIP_Y, { color: C.bad, count: 20, speed: 420 });
            finish();
            break;
          }
        }
        if (!r.passed && r.y > SHIP_Y + 20) {
          r.passed = true; passed++;
          game.feedback.good(shipX, SHIP_Y - 40, { text: null, color: C.good });
          game.audio.play('se_good', 0.2);
          if (passed >= ROWS_TO_CLEAR) { finished = true; ok = true; hitStop = 0.1; game.fx.burst(shipX, SHIP_Y, { color: C.gold, count: 18, speed: 360 }); finish(); }
          else if (passed % 4 === 0) game.fx.popup(passed + ' / ' + ROWS_TO_CLEAR, W / 2, H * 0.20, { color: C.gold, size: 40 });
        }
        if (r.y > H + 40) rows.splice(i, 1);
      }
    }
    if (shake > 0) shake -= dt;

    battleBg();
    drawRows();
    if (!finished || ok) drawShip();

    txt(passed + ' / ' + ROWS_TO_CLEAR, W / 2, H * 0.06, 32, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);

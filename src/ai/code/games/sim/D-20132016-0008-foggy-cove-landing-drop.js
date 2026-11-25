// D-20132016-0008-foggy-cove-landing-drop.js
// 濃霧入江ランディング・ドロップ — 交差するサーチライトの隙を突き、上陸ボートを狙い落として拠点を崩す
// 操作: 浜辺の狙った位置をタップして上陸ボートを投下。着水の瞬間に安全な帯へ重なるよう狙う
// 終わり: 3隻を安全に上陸させれば成功。サーチライトに照らされた瞬間に着水すれば失敗
// @mechanic: drop_timing
// @theme: foggy_cove_landing_drop
// 世界観: 濃霧の入江への上陸作戦。交差するサーチライトの死角に合わせ、輸送艇から兵員ボートを落として防衛拠点の物見台を制圧する上陸指揮官
// 残るもの: 正誤(CLEAR/GAME OVER) + 上陸させた隻数
// スタイル: HD POST 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 深いコントラスト、柔らかいリムライト、霧のグラデーション
  var C = {
    bg1: '#1a2430', bg2: '#060a10', sea: '#0e1a26', beach: '#3a3428',
    safe: '#4dff9a', unsafe: '#2a3846', light: '#ffe9a8', boat: '#c8cfd6',
    good: '#4dff9a', bad: '#ff4d5e', gold: '#ffd400', white: '#eef4fa', ink: '#02060a',
  };

  var GAME_TITLE = 'COVE LANDING';
  var WIN = 3;
  var MAX_ATTEMPTS = 6;
  var MAX_TIME = 18;
  var FALL_TIME = 0.65;
  var BEACH_Y = H * 0.5;
  var BEACH_X0 = W * 0.16, BEACH_X1 = W * 0.84;
  var SAFE_W = 170;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, landed = 0, attempts = 0;

  var falling, done, endWait, finished, playElapsed, milestoneShown;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var TROOP = ['.##.', '####', '.##.'];

  function bg() {
    var el = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(el * 1.3));
    game.draw.rect(0, BEACH_Y + 30, W, H - BEACH_Y - 30, C.beach, 0.55);
    game.draw.rect(0, 0, W, BEACH_Y + 30, C.sea, 0.4);
  }

  function safeCenterX(t) { return (BEACH_X0 + BEACH_X1) / 2 + Math.sin(t * 0.9) * ((BEACH_X1 - BEACH_X0) / 2 - SAFE_W / 2); }
  function spotCenterX(t) { return (BEACH_X0 + BEACH_X1) / 2 + Math.sin(t * 1.45 + 2.1) * ((BEACH_X1 - BEACH_X0) / 2 - 60); }

  function initGame() {
    falling = null; landed = 0; attempts = 0;
    done = false; endWait = 0; finished = false; playElapsed = 0; milestoneShown = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function spotlightActiveAt(x, t) {
    return Math.abs(x - spotCenterX(t)) < 70;
  }

  function dropAt(x) {
    if (state !== S.PLAYING || ready > 0 || finished || done || falling) return;
    if (x < BEACH_X0 || x > BEACH_X1) return;
    falling = { x: x, t: 0 };
    game.audio.play('se_tap', 0.1);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    dropAt(x);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function resolveLanding() {
    var x = falling.x;
    var t = game.time.elapsed;
    attempts++;
    if (spotlightActiveAt(x, t)) {
      hitStop = 0.35; ok = false; finished = true;
      game.feedback.bad(x, BEACH_Y, { text: 'MISS' });
      shake = 0.32;
      game.audio.play('se_bad', 0.45);
      falling = null;
      finish();
      return;
    }
    var safe = Math.abs(x - safeCenterX(t)) < SAFE_W / 2;
    if (safe) {
      landed++;
      hitStop = 0.1;
      game.feedback.good(x, BEACH_Y, { text: 'GOOD', color: C.good });
      game.fx.burst(x, BEACH_Y, { color: C.gold, count: 16, speed: 340 });
      game.audio.play('se_success', 0.4);
      if (!milestoneShown && landed === Math.ceil(WIN / 2)) {
        milestoneShown = true;
        game.fx.popup('HALFWAY!', W / 2, H * 0.16, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.4);
      }
      if (landed >= WIN) { ok = true; finished = true; falling = null; finish(); return; }
    } else {
      game.feedback.bad(x, BEACH_Y, { text: 'あと少し!' });
      game.audio.play('se_bad', 0.25);
      if (attempts >= MAX_ATTEMPTS) {
        ok = false; finished = true; hitStop = 0.2;
        shake = 0.2;
        finish();
      }
    }
    falling = null;
  }

  function drawScene(curT, curFalling, bobT) {
    // サーチライト予告 + 実体
    var sx = spotCenterX(curT);
    var telSx = spotCenterX(curT + 0.6);
    game.draw.rect(telSx - 70, 0, 140, BEACH_Y + 40, C.light, 0.12 + 0.06 * Math.sin(bobT * 10));
    game.draw.rect(sx - 70, 0, 140, BEACH_Y + 40, C.light, 0.32);
    // 安全帯
    var scx = safeCenterX(curT);
    game.draw.rect(scx - SAFE_W / 2, BEACH_Y - 18, SAFE_W, 36, C.safe, 0.45);
    // 上陸済みの部隊
    for (var i = 0; i < landed; i++) {
      game.draw.sprite(TROOP, { '#': C.boat }, BEACH_X0 + 60 + i * 80, BEACH_Y + 70 + Math.sin(bobT * 2 + i) * 4, 16, { anchor: 'center' });
    }
    // 指揮官(常時ボブ)
    game.draw.sprite(TROOP, { '#': C.gold }, W * 0.5 + Math.cos(bobT * 1.6) * 4, H * 0.86, 22, { anchor: 'center' });
    if (curFalling) {
      var p = Math.min(1, curFalling.t / FALL_TIME);
      var fy = H * 0.14 + (BEACH_Y - H * 0.14) * p;
      game.draw.circle(curFalling.x, fy, 24, C.boat);
      game.draw.sprite(TROOP, { '#': C.ink }, curFalling.x, fy, 12, { anchor: 'center' });
    }
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.86, press: false };
  var DEMO_CYC = 3.2;
  var demoFalling = null, demoLanded = 0, demoT = 0;
  function stepDemo(dt) {
    demo.t += dt;
    demoT += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { demoLanded = 0; demoFalling = null; }
    if (cyc < 0.4) { demo.press = false; }
    else if (cyc < 0.6 && !demoFalling) {
      var tx = safeCenterX(demoT + FALL_TIME);
      demo.gx = tx; demo.press = true;
      demoFalling = { x: tx, t: 0 };
      game.audio.play('se_tap', 0.05);
    } else if (demoFalling) {
      demoFalling.t += dt;
      demo.press = false;
      if (demoFalling.t >= FALL_TIME) { demoLanded = Math.min(WIN, demoLanded + 1); demoFalling = null; }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      landed = demoLanded;
      drawScene(demoT, demoFalling, game.time.elapsed);
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
      bg();
      drawScene(game.time.elapsed, null, game.time.elapsed);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(landed + ' / ' + WIN, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + Math.max(0, WIN - landed) + '隻!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(landed, { landed: landed, total: WIN });
        else game.end.failure({ landed: landed, total: WIN });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      playElapsed += dt;
      if (playElapsed > MAX_TIME) {
        ok = false; finished = true; hitStop = 0.2;
        game.feedback.bad(W / 2, BEACH_Y, { text: 'TIME UP' });
        shake = 0.2;
        game.audio.play('se_bad', 0.4);
        finish();
      } else if (falling) {
        falling.t += dt;
        if (falling.t >= FALL_TIME) resolveLanding();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene(game.time.elapsed, falling, game.time.elapsed);

    txt(landed + ' / ' + WIN, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (landed / WIN), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.68, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.5], ['C4', 0.5], ['E4', 0.5], ['A4', 1]], { tempo: 100, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

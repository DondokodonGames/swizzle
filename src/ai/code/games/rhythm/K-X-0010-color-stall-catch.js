// K-X-0010-color-stall-catch.js
// 屋台トレー捌き — 落ちてくる団子の色を見て、5つのトレーの正しい位置へタップで受け止める
// 操作: 落下してくる団子の色を見て、対応する色のトレー(5つ)を判定ラインでタップする
// 終わり: 7個のうちミスなしで受け止めれば成功。1回でも外せば失敗
// @mechanic: judge
// @theme: street_stall_tray_sorter
// 世界観: 縁日の屋台の職人。次々に降ってくる色団子を、色ごとに割り当てられた5つのトレーへ瞬時に振り分けて受け止める
// 残るもの: 正誤(CLEAR/GAME OVER) + 受け止められた個数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: 淡いパステル、丸っこいUI
  var C = {
    bg: '#fff3e8', bg2: '#ffe6cf', stall: '#ffd9a8', stallDark: '#e8b478',
    good: '#5bd68c', bad: '#ff7a86', gold: '#ffb347', white: '#ffffff', ink: '#5a4230',
  };
  var TRAY_COL = ['#ff8fa3', '#8fd6ff', '#ffe066', '#a8e6a1', '#c9a8f0'];

  var GAME_TITLE = 'STALL CATCH';
  var TOTAL = 7;
  var N_TRAY = 5;
  var HIT_Y = H * 0.80;
  var TOP_Y = H * 0.24;
  var FALL_T = 1.3;
  var WIN = 110;
  var trayW = (W - 100) / N_TRAY;

  function trayX(i) { return 50 + trayW * (i + 0.5); }

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DANGO = ['.##.', '####', '.##.'];
  var TRAY_SPR = ['#....#', '######'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, HIT_Y + 60, W, H - (HIT_Y + 60), C.stallDark, 0.6);
    game.draw.rect(0, HIT_Y + 50, W, 12, C.stall);
    for (var i = 0; i < N_TRAY; i++) {
      var x = trayX(i);
      game.draw.sprite(TRAY_SPR, { '#': TRAY_COL[i] }, x, HIT_Y + 90, 12, { anchor: 'center' });
    }
  }

  var order, spawnQueue, spawnedN, caught, done, endWait, finished, ready, hitStop, shake, nextMilestone;

  function scheduleOrder() {
    var q = [];
    var t = 0, gap = 1.15;
    for (var i = 0; i < TOTAL; i++) {
      q.push({ color: Math.floor(game.random(0, N_TRAY)), spawnAt: t });
      t += gap;
      gap = Math.max(0.75, gap - 0.03);
    }
    return q;
  }

  var readyStartT = 0;
  function initGame() {
    order = []; spawnQueue = scheduleOrder(); spawnedN = 0; caught = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; nextMilestone = 4;
    readyStartT = 0;
  }

  function trayAt(x) {
    var idx = Math.floor((x - 50) / trayW);
    return Math.max(0, Math.min(N_TRAY - 1, idx));
  }

  function currentFalling() {
    for (var i = 0; i < order.length; i++) if (!order[i].resolved) return order[i];
    return null;
  }

  function tryCatch(x, y) {
    if (ready > 0 || done || finished) return;
    var n = currentFalling();
    var tray = trayAt(x);
    if (!n) { game.audio.play('se_tap', 0.1); return; }
    var dist = Math.abs(n.y - HIT_Y);
    if (tray === n.color && dist <= WIN) {
      n.resolved = true; caught++;
      hitStop = 0.06;
      game.feedback.good(trayX(tray), HIT_Y, { text: 'GOOD', color: TRAY_COL[tray] });
      game.audio.play('se_coin', 0.4);
      if (caught >= nextMilestone && nextMilestone < TOTAL) {
        game.fx.popup(caught + ' / ' + TOTAL, W / 2, HIT_Y - 260, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.35);
        nextMilestone += 3;
      }
      if (caught >= TOTAL) { ok = true; finished = true; finish(); }
    } else {
      n.resolved = true; hitStop = 0.3; shake = 0.25;
      game.feedback.bad(trayX(tray), HIT_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onPress(function(x, y) { if (state === S.PLAYING) tryCatch(x, y); });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepFall(dt) {
    if (spawnedN < spawnQueue.length && game.time.elapsed - readyStartT >= spawnQueue[spawnedN].spawnAt) {
      var q = spawnQueue[spawnedN];
      order.push({ color: q.color, y: TOP_Y, resolved: false });
      spawnedN++;
    }
    for (var i = 0; i < order.length; i++) {
      var n = order[i];
      if (n.resolved) continue;
      n.y += ((HIT_Y - TOP_Y) / FALL_T) * dt;
      if (n.y - HIT_Y > WIN + 30) {
        n.resolved = true; hitStop = 0.3; shake = 0.25;
        game.feedback.bad(W / 2, HIT_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
        break;
      }
    }
  }

  function drawOrder() {
    for (var i = 0; i < order.length; i++) {
      var n = order[i];
      if (n.resolved) continue;
      var x = W * 0.5;
      game.draw.circle(x, n.y, 34, TRAY_COL[n.color]);
      game.draw.sprite(DANGO, { '#': C.white }, x, n.y, 8, { anchor: 'center' });
    }
  }

  var demo = { t: 0, gx: trayX(2), gy: HIT_Y + 90, press: false };
  var demoElapsed = 0;
  var demoQueue = [
    { color: 1, spawnAt: 0.2 }, { color: 3, spawnAt: 1.2 }, { color: 0, spawnAt: 2.2 },
  ];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) { order = []; spawnedN = 0; caught = 0; demoElapsed = 0; }
    demoElapsed += dt;
    while (spawnedN < demoQueue.length && demoElapsed >= demoQueue[spawnedN].spawnAt) {
      var q = demoQueue[spawnedN];
      order.push({ color: q.color, y: TOP_Y, resolved: false });
      spawnedN++;
    }
    demo.press = false;
    for (var i = 0; i < order.length; i++) {
      var n = order[i];
      if (n.resolved) continue;
      n.y += ((HIT_Y - TOP_Y) / FALL_T) * dt;
      if (Math.abs(n.y - HIT_Y) < 50) {
        demo.gx = trayX(n.color); demo.press = true;
        n.resolved = true;
        game.feedback.good(trayX(n.color), HIT_Y, { text: 'GOOD', color: TRAY_COL[n.color] });
        game.audio.play('se_coin', 0.2);
      } else if (n.y - HIT_Y > WIN + 30) {
        n.resolved = true;
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (order === undefined) initGame();
      bg();
      stepDemo(dt);
      drawOrder();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 22 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawOrder();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(caught + ' / ' + TOTAL, W / 2, H * 0.13, 28, C.ink);
      if (!ok) txt('あと' + (TOTAL - caught) + '個!', W / 2, H * 0.17, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(caught, { caught: caught, total: TOTAL });
        else game.end.failure({ caught: caught, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { readyStartT = game.time.elapsed; game.audio.play('se_tap'); }
    } else if (!finished) {
      stepFall(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawOrder();

    txt(caught + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.ink);
    var barW = W - 120;
    game.draw.rect(60, 150, barW, 14, '#00000020');
    game.draw.rect(60, 150, barW * (caught / TOTAL), 14, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.3], ['G4', 0.3], ['B4', 0.3], ['E5', 0.4]], { tempo: 128, wave: 'triangle', volume: 0.07, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

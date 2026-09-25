// D-20172021-0026-cargo-bin-relay.js
// カーゴビン・リレー — 流れてくる荷物を色別のコンテナへ指でドラッグして正しく仕分ける
// 操作: 上から出てくる荷物を指でつまみ、同じ色のコンテナまでドラッグして離す。5個すべて正しく仕分ける
// 終わり: 5個を正しいコンテナに入れれば成功。違う色のコンテナに入れると即座に失敗
// @mechanic: drag_sort
// @theme: cargo_bin_relay
// 世界観: 港湾倉庫の仕分け係が、流れてくる荷札付きの荷物を色別のコンテナへドラッグで手早く振り分けていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 仕分けた荷物数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目・フェルト・光沢ボタン。gradient で厚みを作る
  var C = {
    bg: '#8a6a44', bg2: '#5c4228', belt: '#3a2c1c', beltLite: '#4a3826',
    binWood: '#6a4a2a', binWoodDark: '#4a3018',
    good: '#4ad18f', bad: '#ff5d5d', gold: '#ffcf6a', ink: '#f4ead4',
  };
  var ITEM_COLORS = ['#e0483c', '#3f8de0', '#3fae4a'];

  var GAME_TITLE = 'CARGO RELAY';
  var TIME_LIMIT = 15;
  var NEEDED = 5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#241a0c', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BOX_SPRITE = ['####', '#..#', '####'];
  var BIN_X = [W * 0.22, W * 0.5, W * 0.78];
  var BIN_Y = H * 0.82, BIN_W = 230, BIN_H = 200;
  var SPAWN_X = W * 0.5, SPAWN_Y = H * 0.32;

  var round, itemColor, itemX, itemY, dragging, dragOffX, dragOffY, wrongBin;
  var done, endWait, finished, ready, hitStop, shake, timeLeft, halfCalled;

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.5);
    game.draw.rect(W * 0.12, H * 0.44, W * 0.76, 90, C.belt, 1);
    for (var d = 0; d < 8; d++) {
      var dx = W * 0.12 + ((game.time.elapsed * 80 + d * 90) % (W * 0.76));
      game.draw.rect(dx, H * 0.44 + 10, 30, 70, C.beltLite, 0.5);
    }
  }

  function drawBins(hi) {
    for (var i = 0; i < 3; i++) {
      var x = BIN_X[i];
      game.draw.rect(x - BIN_W / 2, BIN_Y - BIN_H / 2, BIN_W, BIN_H, C.binWoodDark);
      game.draw.rect(x - BIN_W / 2 + 10, BIN_Y - BIN_H / 2 + 10, BIN_W - 20, BIN_H - 20, C.binWood);
      game.draw.rect(x - BIN_W / 2 + 24, BIN_Y - BIN_H / 2 + 24, BIN_W - 48, 36, ITEM_COLORS[i]);
      if (hi === i) game.draw.rect(x - BIN_W / 2 - 6, BIN_Y - BIN_H / 2 - 6, BIN_W + 12, BIN_H + 12, '#ffffff', 0.2);
    }
  }

  function newItem() {
    itemColor = Math.floor(Math.random() * 3);
    itemX = SPAWN_X; itemY = SPAWN_Y; dragging = false;
  }

  function initGame() {
    round = 0; wrongBin = -1; halfCalled = false;
    newItem();
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
    timeLeft = TIME_LIMIT;
  }

  function binAt(x, y) {
    for (var i = 0; i < 3; i++) {
      if (Math.abs(x - BIN_X[i]) < BIN_W / 2 && Math.abs(y - BIN_Y) < BIN_H / 2) return i;
    }
    return -1;
  }

  function onGrabStart(x, y) {
    if (finished || ready > 0) return;
    if (Math.hypot(x - itemX, y - itemY) < 90) {
      dragging = true; dragOffX = itemX - x; dragOffY = itemY - y;
      game.audio.play('se_tap', 0.1);
    }
  }
  function onGrabMove(x, y) {
    if (!dragging) return;
    itemX = x + dragOffX; itemY = y + dragOffY;
  }
  function onGrabEnd(x, y) {
    if (!dragging) return;
    dragging = false;
    var bin = binAt(itemX, itemY);
    if (bin < 0) { itemX = SPAWN_X; itemY = SPAWN_Y; return; }
    if (bin === itemColor) {
      round++;
      game.feedback.good(itemX, itemY, { text: 'GOOD', color: C.good });
      game.audio.play('se_coin', 0.35);
      if (round === Math.ceil(NEEDED / 2) && !halfCalled) {
        halfCalled = true;
        game.fx.popup('NICE', W / 2, H * 0.2, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.3);
      }
      if (round >= NEEDED) {
        finished = true; ok = true; hitStop = 0.3;
        game.feedback.good(itemX, itemY, { text: 'CLEAR', color: C.good });
        game.fx.burst(itemX, itemY, { color: C.gold, count: 20, speed: 380 });
        game.audio.play('se_success', 0.5);
        finish();
      } else {
        newItem();
      }
    } else {
      wrongBin = bin;
      finished = true; ok = false; hitStop = 0.3; shake = 0.3;
      game.feedback.bad(itemX, itemY, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) onGrabStart(x, y); });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING) return;
    if (dragging && Math.random() < 0.08) game.audio.play('se_tap', 0.02);
    onGrabMove(x, y);
  });
  game.onRelease(function(x, y) { if (state === S.PLAYING) onGrabEnd(x, y); });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: SPAWN_X, gy: SPAWN_Y, press: false, resolved: false };
  function resetDemo() { initGame(); demo.resolved = false; }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.5;
    if (cyc < dt || demo.t <= dt) resetDemo();
    var seg = 4.5 / NEEDED;
    var localCyc = cyc % seg;
    if (localCyc < dt * 2) demo.resolved = false;
    var target = BIN_X[itemColor];
    if (localCyc < seg * 0.6) {
      var t2 = localCyc / (seg * 0.6);
      itemX = SPAWN_X + (target - SPAWN_X) * t2;
      itemY = SPAWN_Y + (BIN_Y - SPAWN_Y) * t2;
      demo.gx = itemX; demo.gy = itemY; demo.press = true;
    } else {
      itemX = target; itemY = BIN_Y;
      demo.gx = itemX; demo.gy = itemY; demo.press = false;
      if (!demo.resolved) {
        demo.resolved = true;
        round++;
        game.feedback.good(itemX, itemY, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.2);
        if (round < NEEDED) newItem(); else round = 0;
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (itemColor === undefined) initGame();
      stepDemo(dt);
      bg();
      drawBins(-1);
      game.draw.sprite(BOX_SPRITE, { '#': ITEM_COLORS[itemColor] }, itemX, itemY, 18, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.96, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 24, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBins(wrongBin);
      game.draw.sprite(BOX_SPRITE, { '#': ITEM_COLORS[itemColor] }, itemX, itemY, 18, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 44, ok ? C.good : C.bad);
      txt(round + ' / ' + NEEDED, W / 2, H * 0.13, 26, C.gold);
      if (!ok) txt('あと' + (NEEDED - round) + '個!', W / 2, H * 0.17, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(round, { sorted: round, total: NEEDED });
        else game.end.failure({ sorted: round, total: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(itemX, itemY, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBins(-1);
    if (!finished) game.draw.sprite(BOX_SPRITE, { '#': ITEM_COLORS[itemColor] }, itemX, itemY, 18, { anchor: 'center' });

    txt(round + ' / ' + NEEDED, W / 2, H * 0.06, 28, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, C.binWoodDark, 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.2], ['E4', 0.2], ['G4', 0.2], ['C5', 0.4]], { tempo: 120, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

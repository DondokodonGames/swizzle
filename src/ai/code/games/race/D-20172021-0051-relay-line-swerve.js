// D-20172021-0051-relay-line-swerve.js
// リレーラインスワーブ — 自動巡航するレーサーが、迫るカーブでハンドルを正しい方向へ払い、道中のブーストを拾って順位を競う
// 操作: 迫るカーブの矢印を見て、正しい方向へ画面をスワイプする。ブーストの光が来たらタップして拾う
// 終わり: 規定数のカーブを曲がり切れれば成功。曲がり切れなければ失敗
// @mechanic: swipe_direction
// @theme: relay_line_swerve
// 世界観: 自動巡航するレースカーの操縦士が、迫るカーブでハンドルを正しい方向へ払い続け、道中のブーストを拾いながら対抗車との順位を競う
// 残るもの: 正誤(CLEAR/GAME OVER) + 曲がり切った数
// スタイル: HYPERCASUAL 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 白背景 + 単色、柔らかい影の丸い塊。当たり判定が見た目どおり
  var C = {
    bg1: '#f4f8ff', bg2: '#dfe8ff', road: '#3a4258', roadEdge: '#ffd54a',
    car: '#ff5a4a', carDark: '#b0342a', rival: '#4a90ff',
    good: '#39c96a', bad: '#ff4d5e', gold: '#ffd54a', ink: '#1a2038', white: '#ffffff',
    boost: '#4ae0c0',
  };

  var GAME_TITLE = 'LINE SWERVE';
  var SLOT_COUNT = 7;
  var SLOT_INTERVAL = 1.2;
  var WINDOW = 1.0;
  var TIME_LIMIT = SLOT_COUNT * SLOT_INTERVAL + 1.4;
  var CURVE_NEEDED = 3;
  var NEEDED = CURVE_NEEDED;
  var CAR = { x: W * 0.5, y: H * 0.80 };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CAR_SPR = ['.#.', '###', '#.#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    var roadW = W * 0.62;
    game.draw.rect(W * 0.5 - roadW / 2 + carOffset * 60, H * 0.20, roadW, H * 0.62, C.road, 1);
    for (var i = 0; i < 10; i++) {
      var y = H * 0.22 + ((i * 60 + game.time.elapsed * 240) % (H * 0.58));
      game.draw.rect(W * 0.5 - 6 + carOffset * 60, y, 12, 30, C.roadEdge, 0.7);
    }
  }

  function drawCar() {
    game.draw.circle(CAR.x + carOffset * 60, CAR.y + 30, 50, '#000', 0.15);
    game.draw.sprite(CAR_SPR, { '#': C.car }, CAR.x + carOffset * 60, CAR.y, 32, { anchor: 'center' });
    game.draw.sprite(CAR_SPR, { '#': C.rival }, W * 0.30, H * 0.30, 18, { anchor: 'center', alpha: 0.85 });
    game.draw.sprite(CAR_SPR, { '#': C.rival }, W * 0.70, H * 0.34, 18, { anchor: 'center', alpha: 0.85 });
  }

  function drawSlot() {
    var s = slots[slotIdx];
    if (!s || s.resolved) return;
    var t = Math.max(0, Math.min(1, slotTimer / WINDOW));
    if (s.type === 'curve') {
      var arrowX = s.dir === 'left' ? W * 0.30 : W * 0.70;
      var y = H * 0.30 + t * (H * 0.32);
      var blink = Math.floor(game.time.elapsed * 6) % 2 === 0;
      game.draw.circle(arrowX, y, 46, blink ? C.gold : C.roadEdge, 0.9);
      var ax = s.dir === 'left' ? arrowX + 18 : arrowX - 18;
      game.draw.line(ax, y, s.dir === 'left' ? arrowX - 24 : arrowX + 24, y, C.ink, 10);
    } else {
      var y2 = H * 0.30 + t * (H * 0.32);
      var pulse2 = 1 + 0.15 * Math.sin(game.time.elapsed * 10);
      game.draw.circle(W * 0.5, y2, 40 * pulse2, C.boost, 0.85);
    }
  }

  var slots, slotIdx, slotTimer, hits, boosts, carOffset, halfCalled, roundClock;
  var done, endWait, finished, ready, hitStop, shake;

  function buildSlots() {
    slots = [];
    for (var i = 0; i < SLOT_COUNT; i++) {
      var isItem = i % 3 === 2;
      slots.push({ resolved: false, type: isItem ? 'item' : 'curve', dir: Math.random() < 0.5 ? 'left' : 'right' });
    }
  }

  function initGame() {
    buildSlots(); slotIdx = 0; slotTimer = 0; hits = 0; boosts = 0; carOffset = 0; halfCalled = false; roundClock = 0;
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
  }

  function nextSlot() { slotIdx++; slotTimer = 0; }

  function resolveCurve(success) {
    var s = slots[slotIdx];
    s.resolved = true;
    if (success) {
      hits++;
      carOffset = s.dir === 'left' ? -1 : 1;
      game.feedback.good(CAR.x + carOffset * 60, CAR.y, { text: 'GOOD', color: C.good });
      game.fx.burst(CAR.x + carOffset * 60, CAR.y, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_good', 0.3);
      hitStop = 0.08;
      if (!halfCalled && hits >= Math.ceil(CURVE_NEEDED / 2)) { halfCalled = true; game.fx.popup('NICE', CAR.x, CAR.y - 260, { color: C.gold, size: 32 }); game.audio.play('se_milestone', 0.3); }
      if (hits >= CURVE_NEEDED && !finished) { ok = true; finished = true; finish(); }
    } else {
      game.feedback.bad(CAR.x, CAR.y, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
      hitStop = 0.18; shake = 0.2;
    }
    nextSlot();
  }

  function resolveItem(gotIt) {
    var s = slots[slotIdx];
    s.resolved = true;
    if (gotIt) {
      boosts++;
      game.feedback.good(W * 0.5, H * 0.4, { text: 'GOOD', color: C.boost });
      game.fx.burst(W * 0.5, H * 0.4, { color: C.boost, count: 10, speed: 260 });
      game.audio.play('se_coin', 0.35);
    }
    nextSlot();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) {
      var s = slots[slotIdx];
      game.audio.play('se_tap', 0.06);
      if (s && !s.resolved && s.type === 'item') resolveItem(true);
    }
  });
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    var s = slots[slotIdx];
    if (!s || s.resolved || s.type !== 'curve') return;
    game.audio.play('se_tap', 0.08);
    resolveCurve(dir === s.dir);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CAR.x, gy: CAR.y - 200, press: false, swipeShow: 0, resolvedCount: 0, pauseT: 0 };
  function resetDemo() { initGame(); demo.resolvedCount = 0; demo.pauseT = 0; }
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.pauseT > 0) {
      demo.pauseT -= dt;
      demo.press = false;
      if (demo.pauseT <= 0) resetDemo();
      return;
    }
    if (slotIdx < slots.length) {
      slotTimer += dt;
      var s = slots[slotIdx];
      var resolveAt = WINDOW * 0.58;
      if (slotTimer >= resolveAt && !s.resolved) {
        if (s.type === 'curve') { resolveCurve(true); demo.swipeShow = 0.3; }
        else resolveItem(true);
        demo.resolvedCount++;
        if (demo.resolvedCount >= 3) demo.pauseT = 0.7;
      }
    }
    demo.gx = CAR.x; demo.gy = CAR.y - 200;
    demo.press = demo.swipeShow > 0;
    if (demo.swipeShow > 0) demo.swipeShow -= dt;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (slots === undefined) initGame();
      stepDemo(dt);
      bg();
      drawSlot();
      drawCar();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.10, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.145, 22, C.carDark);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.carDark);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawSlot();
      drawCar();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 44, ok ? C.good : C.bad);
      txt(hits + ' / ' + CURVE_NEEDED, W / 2, H * 0.155, 28, C.carDark);
      if (!ok) txt('あと' + Math.max(0, CURVE_NEEDED - hits) + '!', W / 2, H * 0.20, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, boosts: boosts });
        else game.end.failure({ hits: hits, boosts: boosts });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      var s = slots[slotIdx];
      if (s) {
        slotTimer += dt;
        if (slotTimer >= WINDOW && !s.resolved) {
          if (s.type === 'curve') resolveCurve(false); else resolveItem(false);
        }
      }
      if (roundClock >= TIME_LIMIT && !finished) {
        ok = hits >= CURVE_NEEDED;
        finished = true;
        if (!ok) game.audio.play('se_failure', 0.3);
        finish();
      }
    }

    bg();
    drawSlot();
    drawCar();
    txt(hits + ' / ' + CURVE_NEEDED, W * 0.5, H * 0.065, 30, C.ink);
    var barW = W - 140;
    var pct = Math.max(0, 1 - roundClock / TIME_LIMIT);
    game.draw.rect(70, 150, barW, 16, '#dfe8ff', 1);
    game.draw.rect(70, 150, barW * pct, 16, pct < 0.25 ? C.bad : C.carDark);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.carDark);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.2], ['B4', 0.2], ['D5', 0.2], ['G5', 0.4]], { tempo: 145, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

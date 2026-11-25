// D-20132016-0079-forge-hammer-round.js
// フォージハンマーラウンド — 鍛冶台に浮かぶ光に合わせて短く叩く/長く押さえて鍛える
// 操作: 通常の光は短くタップ。長く光る火床は表示された長さぴったり指を離さず押さえ続ける
// 終わり: 規定数の工程のうち一定数以上を成功させれば成功。失敗が続くと途中で終わる
// @mechanic: hold_duration
// @theme: forge_hammer_cadence
// 世界観: 一夜限りの鍛冶場を任された見習い鍛冶師が、火床の輝きに合わせて槌を短く打ち、長く押し込む工程を交互にこなす
// 残るもの: 正誤(CLEAR/GAME OVER) + 成功させた工程の数
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体を上面/左面/右面の3明度で。等角に積む
  var C = {
    bg: '#1a1210', bg2: '#2a1c16', anvilTop: '#8a7060', anvilL: '#6a5448', anvilR: '#4a3a30',
    emberHot: '#ff7a30', emberCore: '#ffd25a', emberCold: '#5a3a2a',
    good: '#5affa0', bad: '#ff4d5e', gold: '#ffd400', white: '#fff4e0', ink: '#140c08',
  };

  var GAME_TITLE = 'FORGE HAMMER';
  var ANVIL_X = W * 0.5, ANVIL_Y = H * 0.5;
  var TOTAL = 6;
  var NEED_HIT = 4;
  var MAX_TIME = 13;
  var MISS_LIMIT = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SMITH_SPRITE = ['..##..', '.####.', '..##..', '.####.', '#.##.#'];
  var HAMMER_SPRITE = ['##...', '##...', '#####', '.###.', '..#..'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 3; i++) {
      game.draw.rect(60 + i * 30, H * 0.15, 18, H * 0.5, '#00000030');
    }
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    // voxel anvil block: top/left/right の3明度
    game.draw.rect(ANVIL_X - 170, ANVIL_Y - 40, 340, 40, C.anvilTop);
    game.draw.rect(ANVIL_X - 170, ANVIL_Y, 170, 90, C.anvilL);
    game.draw.rect(ANVIL_X, ANVIL_Y, 170, 90, C.anvilR);
  }

  function newNote(idx) {
    var isHold = idx % 2 === 1;
    return { kind: isHold ? 'hold' : 'tap', need: isHold ? (0.55 + (idx % 3) * 0.12) : 0, telegraph: 0.55, wait: 0.55, resolved: false, judged: '', pressT: 0, pressing: false };
  }

  var notes, spawnIdx, spawnTimer, hits, misses, comboJudged, current;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    notes = []; spawnIdx = 0; spawnTimer = 0.5; current = null;
    hits = 0; misses = 0; comboJudged = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function judgeGood() {
    hits++; comboJudged++;
    game.feedback.good(ANVIL_X, ANVIL_Y - 30, { text: comboJudged >= 3 ? 'PERFECT' : 'GOOD', color: C.good });
    game.audio.play('se_good', 0.4);
    game.fx.burst(ANVIL_X, ANVIL_Y - 30, { color: C.emberHot, count: 14, speed: 300 });
    hitStop = 0.05;
    if (hits === Math.ceil(TOTAL / 2)) { game.fx.popup('COMBO', ANVIL_X, ANVIL_Y - 260, { color: C.gold, size: 40 }); game.audio.play('se_milestone', 0.35); }
  }
  function judgeBad() {
    misses++; comboJudged = 0;
    game.feedback.bad(ANVIL_X, ANVIL_Y - 30, { text: 'MISS' });
    game.audio.play('se_bad', 0.35);
    shake = 0.15; hitStop = 0.08;
    if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); }
  }
  function checkRoundEnd() {
    if (finished) return;
    if (hits + misses >= TOTAL && spawnIdx >= TOTAL) { ok = hits >= NEED_HIT; finished = true; finish(); }
  }

  function onPressAt() {
    if (state !== S.PLAYING || ready > 0 || finished || !current || current.resolved) return;
    current.pressing = true; current.pressT = 0;
    game.audio.play('se_tap', 0.15);
    if (current.kind === 'tap') {
      current.resolved = true; current.judged = 'good'; judgeGood(); checkRoundEnd();
    }
  }
  function onReleaseAt() {
    if (state !== S.PLAYING || !current || current.resolved || !current.pressing) return;
    current.pressing = false;
    if (current.kind === 'hold') {
      var diff = Math.abs(current.pressT - current.need);
      current.resolved = true;
      if (diff < 0.18) { current.judged = 'good'; judgeGood(); } else { current.judged = 'bad'; judgeBad(); }
      checkRoundEnd();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state === S.PLAYING) game.audio.play('se_tap', 0.06);
    onPressAt();
  });
  game.onRelease(function(x, y) {
    onReleaseAt();
  });
  game.onHold(function(x, y, duration) {
    if (state !== S.PLAYING || !current || current.resolved || current.kind !== 'hold') return;
    if (duration >= current.need + 0.4) {
      current.resolved = true; current.judged = 'bad'; current.pressing = false;
      judgeBad(); checkRoundEnd();
    }
  });

  function drawGauge(n) {
    if (n.kind !== 'hold') return;
    var bw = 320, bh = 26, bx = ANVIL_X - bw / 2, by = ANVIL_Y + 130;
    game.draw.rect(bx, by, bw, bh, C.ink, 0.5);
    game.draw.rect(bx, by, bw * Math.min(1, n.need / 1.1), bh, C.emberCold, 0.6);
    var markX = bx + bw * Math.min(1, n.need / 1.1);
    game.draw.line(markX, by - 8, markX, by + bh + 8, C.gold, 6);
    if (n.pressing) game.draw.rect(bx, by, bw * Math.min(1, n.pressT / 1.1), bh, C.emberHot);
  }

  function drawScene(n) {
    bg();
    game.draw.sprite(SMITH_SPRITE, { '#': C.white }, W * 0.28, H * 0.62 + Math.sin(game.time.elapsed * 1.5) * 5, 22, { anchor: 'center' });
    if (n) {
      var col = n.judged === 'good' ? C.good : n.judged === 'bad' ? C.bad : (n.pressing ? C.emberHot : C.emberCore);
      var glow = n.kind === 'hold' ? (0.5 + 0.5 * Math.sin(game.time.elapsed * 6)) : 1;
      game.draw.circle(ANVIL_X, ANVIL_Y - 30, 46 + (n.pressing ? 10 : 0), col, n.resolved ? 1 : glow);
      game.draw.sprite(HAMMER_SPRITE, { '#': C.white }, ANVIL_X - 130, ANVIL_Y - 90 - (n.pressing ? 20 : 0), 18, { anchor: 'center' });
      drawGauge(n);
    }
  }

  var demo = { t: 0, gx: ANVIL_X, gy: ANVIL_Y - 30, press: false, n: null };
  function resetDemo() { demo.n = newNote(1); demo.n.need = 0.7; }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 1.7;
    if (cyc < dt || demo.t <= dt) resetDemo();
    var n = demo.n;
    if (n.kind === 'tap') {
      if (!n.resolved && cyc > 0.5 && cyc < 0.65) {
        demo.press = true; n.resolved = true; n.judged = 'good';
        game.feedback.good(ANVIL_X, ANVIL_Y - 30, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.2);
      } else if (cyc >= 0.65) demo.press = false;
    } else {
      if (cyc > 0.4 && cyc < 0.4 + n.need) {
        demo.press = true; n.pressing = true; n.pressT = cyc - 0.4;
      } else if (!n.resolved && cyc >= 0.4 + n.need) {
        demo.press = false; n.pressing = false; n.resolved = true; n.judged = 'good';
        game.feedback.good(ANVIL_X, ANVIL_Y - 30, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.2);
      }
    }
    demo.gx = ANVIL_X; demo.gy = ANVIL_Y - 30;
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.2;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(demo.n);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
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
      game.draw.sprite(SMITH_SPRITE, { '#': C.white }, W * 0.5, H * 0.62, 24, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(hits + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + Math.max(0, NEED_HIT - hits) + '回!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, total: TOTAL });
        else game.end.failure({ hits: hits, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (!current || current.resolved) {
        spawnTimer -= dt;
        if (spawnTimer <= 0 && spawnIdx < TOTAL) {
          current = newNote(spawnIdx);
          spawnIdx++;
          spawnTimer = 1.15;
        }
      } else {
        if (current.pressing) current.pressT += dt;
        current.wait -= dt;
        if (!current.pressing && current.wait <= 0) {
          current.resolved = true; current.judged = 'bad'; judgeBad();
        } else if (current.pressing && current.pressT > current.need + 0.6) {
          current.resolved = true; current.judged = 'bad'; current.pressing = false; judgeBad();
        }
      }
      checkRoundEnd();
    }
    if (shake > 0) shake -= dt;

    drawScene(current);

    txt(hits + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 200, W - 120, 16, C.ink, 0.4);
    game.draw.rect(60, 200, (W - 120) * (spawnIdx / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D3', 0.4], ['A3', 0.4], ['D4', 0.4], ['F4', 0.8]], { tempo: 96, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

// D-20222026-0044-capsule-color-release.js
// カプセルカラーリリース — 満員の昇降カプセルから、呼ばれた色の乗員だけを見つけてタップで降ろす
// 操作: 画面上部に示された色を覚え、カプセル内に詰まった乗員から同じ色をタップして降車させる
// 終わり: 規定人数を正しく降ろせば成功。違う色を押す/時間切れで失敗
// @mechanic: spot
// @theme: capsule_color_release
// 世界観: 定刻発車の縦型昇降カプセルを任される操作係が、詰め込まれた乗員の中から呼び出し色だけを瞬時に見極めて送り出す
// 残るもの: 正誤(CLEAR/GAME OVER) + 降ろした人数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 彩度高めの原色、太い白フチ、丸みのあるUI
  var C = {
    bg: '#2a1a4a', bg2: '#1a0f30', capsule: '#3a2a5f', capsuleEdge: '#ffffff',
    good: '#39ff8a', bad: '#ff3f5e', gold: '#ffe23f', ink: '#ffffff',
    kinds: ['#ff5470', '#39c4ff', '#ffe23f', '#39ff8a', '#ff8f3f'],
  };

  var GAME_TITLE = 'COLOR RELEASE';
  var TIME_LIMIT = 12;
  var NEED = 5;
  var COLS = 4, ROWS = 3;
  var CELL = 170;
  var BOARD_X = W * 0.5, BOARD_Y = H * 0.44;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RIDER_SPRITE = ['.##.', '####', '.##.', '#..#'];
  var OP_SPRITE = ['.##.', '####', '.##.', '.##.'];

  function bg() {
    var pulse = 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ff5470', pulse * 0.3);
    game.draw.sprite(OP_SPRITE, { '#': C.gold }, W * 0.86, H * 0.86, 10, { anchor: 'center' });
  }

  function cellPos(i) {
    var cx = i % COLS, cy = Math.floor(i / COLS);
    return { x: BOARD_X + (cx - (COLS - 1) / 2) * CELL, y: BOARD_Y + (cy - (ROWS - 1) / 2) * CELL };
  }

  var riders, target, hits, timeLeft, done, endWait, finished, ready, hitStop, shake, halfCalled;

  function fillRiders() {
    riders = [];
    for (var i = 0; i < COLS * ROWS; i++) riders.push(Math.floor(Math.random() * C.kinds.length));
  }
  function pickTarget() {
    // ensure target color exists among remaining riders
    var present = [];
    for (var i = 0; i < riders.length; i++) if (riders[i] >= 0) present.push(riders[i]);
    if (present.length === 0) return -1;
    return present[Math.floor(Math.random() * present.length)];
  }

  function initGame() {
    fillRiders();
    hits = 0;
    target = pickTarget();
    timeLeft = TIME_LIMIT;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; halfCalled = false;
  }

  function drawBoard() {
    game.draw.rect(BOARD_X - COLS * CELL / 2 - 20, BOARD_Y - ROWS * CELL / 2 - 20, COLS * CELL + 40, ROWS * CELL + 40, C.capsule);
    game.draw.rect(BOARD_X - COLS * CELL / 2 - 20, BOARD_Y - ROWS * CELL / 2 - 20, COLS * CELL + 40, 8, C.capsuleEdge, 0.5);
    for (var i = 0; i < riders.length; i++) {
      if (riders[i] < 0) continue;
      var p = cellPos(i);
      var bob = Math.sin(game.time.elapsed * 2.4 + i) * 5;
      game.draw.circle(p.x, p.y + bob, 60, C.kinds[riders[i]]);
      game.draw.sprite(RIDER_SPRITE, { '#': '#1a0f30' }, p.x, p.y + bob, 18, { anchor: 'center' });
    }
    game.draw.circle(W * 0.5, H * 0.20, 46, C.kinds[target] !== undefined && target >= 0 ? C.kinds[target] : C.capsule);
    txt('CALL', W * 0.5, H * 0.10, 26, C.ink);
  }

  function attempt(i) {
    if (riders[i] < 0) { game.feedback.bad(cellPos(i).x, cellPos(i).y, { text: 'MISS' }); game.audio.play('se_bad', 0.3); return; }
    var p = cellPos(i);
    if (riders[i] === target) {
      riders[i] = -1;
      hits++;
      game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.4);
      if (hits === Math.ceil(NEED / 2)) { halfCalled = true; game.fx.popup('NICE!', p.x, p.y - 90, { color: C.gold, size: 32 }); game.audio.play('se_milestone', 0.3); }
      if (hits >= NEED) {
        finished = true; ok = true; hitStop = 0.3;
        game.fx.burst(p.x, p.y, { color: C.gold, count: 24, speed: 420 });
        game.audio.play('se_success', 0.5);
        finish();
        return;
      }
      target = pickTarget();
      if (target < 0) fillRiders(); // safety: refill if empty (shouldn't hit under normal density)
    } else {
      finished = true; ok = false; hitStop = 0.3; shake = 0.25;
      game.feedback.bad(p.x, p.y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) {
      for (var i = 0; i < riders.length; i++) {
        var p = cellPos(i);
        if (riders[i] >= 0 && game.hit.circle(x, y, 1, p.x, p.y, 62)) {
          game.audio.play('se_tap', 0.15);
          attempt(i);
          return;
        }
      }
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.5, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var per = 1.8;
    var cyc = demo.t % (per * NEED + 0.6);
    if (cyc < dt || demo.t <= dt) initGame();
    var idx = Math.min(NEED - 1, Math.floor(cyc / per));
    var local = cyc - idx * per;
    // find nearest matching rider each cycle start
    var pickIdx = -1;
    for (var i = 0; i < riders.length; i++) { if (riders[i] === target) { pickIdx = i; break; } }
    if (pickIdx < 0) { demo.press = false; return; }
    var p = cellPos(pickIdx);
    if (local < per * 0.6) {
      demo.gx = p.x; demo.gy = p.y; demo.press = local > per * 0.4;
      if (local > per * 0.4 && riders[pickIdx] >= 0) {
        riders[pickIdx] = -1; hits = Math.min(NEED, hits + 1);
        game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.2);
        target = pickTarget();
        if (target < 0) fillRiders();
      }
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (riders === undefined) initGame();
      stepDemo(dt);
      bg();
      drawBoard();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.30, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.34, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBoard();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.30, 48, ok ? C.good : C.bad);
      txt(hits + ' / ' + NEED, W / 2, H * 0.35, 30, C.gold);
      if (!ok) txt('あと' + (NEED - hits) + '人!', W / 2, H * 0.39, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, need: NEED });
        else game.end.failure({ hits: hits, need: NEED });
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
        game.feedback.bad(W / 2, H / 2, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBoard();

    txt(hits + ' / ' + NEED, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, '#3a2a5f', 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A4', 0.25], ['C5', 0.25], ['E5', 0.25], ['A5', 0.45]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

// D-20222026-0049-cargo-stack-line.js
// カーゴスタックライン — 落ちてくる荷物ブロックを積んで、横一列を隙間なく揃える
// 操作: 落下する荷物ブロックをタップして狙いの列(左/中/右)へ積む
// 終わり: 指定ラインを隙間なく揃えれば成功。積み違い/荷崩れ/時間切れで失敗
// @mechanic: stack
// @theme: cargo_stack_line
// 世界観: 深夜の積み込み場を任された荷役係が、落ちてくる荷物を列ごとに積み上げ、規定の一列を隙間なく揃える
// 残るもの: 正誤(CLEAR/GAME OVER) + 揃えたマス数
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 低彩度4色、太いピクセル輪郭
  var C = {
    bg: '#233a2a', bg2: '#12241a', slot: '#2f5a3d', slotFill: '#8fd66a',
    good: '#8fd66a', bad: '#e05a5a', gold: '#ffd23f', ink: '#eaf5e5',
  };

  var GAME_TITLE = 'CARGO LINE';
  var TIME_LIMIT = 20;
  var COLS = 5;
  var NEED = COLS;
  var ROW_Y = H * 0.62;
  var COL_W = 150;
  var COL_X0 = W * 0.5 - (COLS - 1) * COL_W / 2;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CRATE_SPRITE = ['####', '#..#', '####'];
  var WORKER_SPRITE = ['.##.', '####', '.##.', '.##.'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.2);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#8fd66a', pulse * 0.12);
    game.draw.sprite(WORKER_SPRITE, { '#': C.gold }, W * 0.86, H * 0.86, 10, { anchor: 'center' });
  }

  var filled, fallY, fallCol, speed, hits, timeLeft, done, endWait, finished, ready, hitStop, shake, halfCalled;

  function colX(i) { return COL_X0 + i * COL_W; }

  function newFall() {
    fallCol = Math.floor(Math.random() * COLS);
    fallY = H * 0.16;
  }

  function initGame() {
    filled = new Array(COLS).fill(false);
    hits = 0; timeLeft = TIME_LIMIT; speed = 320;
    newFall();
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; halfCalled = false;
  }

  function drawSlots() {
    for (var i = 0; i < COLS; i++) {
      game.draw.rect(colX(i) - 60, ROW_Y - 60, 120, 120, filled[i] ? C.slotFill : C.slot);
    }
  }
  function drawFalling() {
    if (fallCol < 0) return;
    game.draw.rect(colX(fallCol) - 60, fallY - 60, 120, 120, C.gold);
    game.draw.sprite(CRATE_SPRITE, { '#': '#233a2a' }, colX(fallCol), fallY, 20, { anchor: 'center' });
  }

  function land(col) {
    if (filled[col]) {
      finished = true; ok = false; hitStop = 0.3; shake = 0.25;
      game.feedback.bad(colX(col), ROW_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    filled[col] = true;
    hits++;
    game.feedback.good(colX(col), ROW_Y, { text: 'GOOD', color: C.good });
    game.audio.play('se_good', 0.4);
    if (hits === Math.ceil(NEED / 2)) game.fx.popup('HALFWAY!', colX(col), ROW_Y - 100, { color: C.gold, size: 32 });
    if (hits >= NEED) {
      finished = true; ok = true; hitStop = 0.3;
      game.fx.burst(W * 0.5, ROW_Y, { color: C.gold, count: 26, speed: 440 });
      game.audio.play('se_success', 0.5);
      finish();
      return;
    }
    speed += 18;
    newFall();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished && fallCol >= 0) {
      var targetCol = Math.round((x - COL_X0) / COL_W);
      targetCol = Math.max(0, Math.min(COLS - 1, targetCol));
      if (targetCol === fallCol) {
        game.audio.play('se_tap', 0.15);
        land(fallCol);
      } else {
        game.feedback.bad(x, y, { text: 'MISS' });
        game.audio.play('se_tap', 0.2);
      }
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var per = 1.5;
    var cyc = demo.t % (per * NEED + 0.6);
    if (cyc < dt || demo.t <= dt) initGame();
    var idx = Math.min(NEED - 1, Math.floor(cyc / per));
    var local = cyc - idx * per;
    demo.gx = colX(fallCol); demo.gy = ROW_Y;
    demo.press = local > per * 0.5 && local < per * 0.7;
    if (local > per * 0.5 && local < per * 0.5 + dt * 2 && !filled[fallCol]) {
      filled[fallCol] = true; hits = Math.min(NEED, hits + 1);
      game.feedback.good(colX(fallCol), ROW_Y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.2);
      newFall();
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (filled === undefined) initGame();
      stepDemo(dt);
      bg();
      drawSlots();
      drawFalling();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawSlots();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(hits + ' / ' + NEED, W / 2, H * 0.14, 30, C.gold);
      if (!ok) txt('あと' + (NEED - hits) + '個!', W / 2, H * 0.18, 24, C.ink);
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
      fallY += speed * dt;
      if (fallY > ROW_Y + 30) {
        // missed the drop window entirely -> telegraph already shown by proximity; treat as bad landing miss
        finished = true; ok = false; hitStop = 0.3; shake = 0.25;
        game.feedback.bad(colX(fallCol), ROW_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(W / 2, ROW_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawSlots();
    if (!finished) drawFalling();

    txt(hits + ' / ' + NEED, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, '#2f5a3d', 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G3', 0.3], ['C4', 0.3], ['E4', 0.3], ['G4', 0.5]], { tempo: 110, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

// D-20222026-0050-rotor-drop-row.js
// ローターDROPロウ — 回転する落下ブロックを狙いの角度でタップし、行の隙間へ落として揃える
// 操作: 落下しながら回るブロックが正しい向きになった瞬間にタップして落とす
// 終わり: 規定回数を狙いの向きで落とせば成功。違う向きで落とす/時間切れで失敗
// @mechanic: drop_timing
// @theme: rotor_drop_row
// 世界観: 稼働中の資材シューターを操作する管制員が、回転する落下ブロックを狙いの向きで受け止め、行を一気に揃える
// 残るもの: 正誤(CLEAR/GAME OVER) + 揃えた回数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 中彩度カラー、ディザ風の細かい濃淡帯
  var C = {
    bg: '#1c2b4a', bg2: '#101a30', row: '#2c3f66', rowFill: '#5fd0ff',
    block: '#ffb84d', blockEdge: '#ffffff',
    good: '#5fd0ff', bad: '#ff5a6a', gold: '#ffe23f', ink: '#eaf1ff',
  };

  var GAME_TITLE = 'ROTOR DROP';
  var TIME_LIMIT = 15;
  var NEED = 5;
  var ROW_Y = H * 0.60;
  var SLOT_W = 150;
  var SLOTS_X0 = W * 0.5 - (NEED - 1) * SLOT_W / 2;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var OP_SPRITE = ['.##.', '####', '.##.', '.##.'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.2);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#5fd0ff', pulse * 0.12);
    game.draw.sprite(OP_SPRITE, { '#': C.gold }, W * 0.86, H * 0.86, 10, { anchor: 'center' });
  }

  var filled, hits, timeLeft, done, endWait, finished, ready, hitStop, shake, halfCalled;
  var fallY, ang, angSpeed, fallSpeed, activeSlot;

  function slotX(i) { return SLOTS_X0 + i * SLOT_W; }

  function nextDrop() {
    fallY = H * 0.18; ang = game.random(0, Math.PI * 2);
    var free = [];
    for (var i = 0; i < NEED; i++) if (!filled[i]) free.push(i);
    activeSlot = free[Math.floor(Math.random() * free.length)];
  }

  function initGame() {
    filled = new Array(NEED).fill(false);
    hits = 0; timeLeft = TIME_LIMIT; angSpeed = 3.2; fallSpeed = 300;
    nextDrop();
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; halfCalled = false;
  }

  function drawRow() {
    for (var i = 0; i < NEED; i++) {
      game.draw.rect(slotX(i) - 60, ROW_Y - 40, 120, 80, filled[i] ? C.rowFill : C.row);
    }
  }
  function drawFalling() {
    var x = slotX(activeSlot);
    game.draw.circle(x, fallY, 56, C.block);
    var dx = Math.cos(ang) * 40, dy = Math.sin(ang) * 40;
    game.draw.line(x, fallY, x + dx, fallY + dy, C.blockEdge, 8);
  }

  function isAligned() {
    // aligned window near angle 0 (right-pointing), within tolerance
    var a = ((ang % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    var d = Math.min(a, Math.PI * 2 - a);
    return d < 0.5;
  }

  function attemptDrop() {
    if (finished || ready > 0) return;
    var x = slotX(activeSlot);
    if (isAligned() && fallY > ROW_Y - 260) {
      filled[activeSlot] = true;
      hits++;
      game.feedback.good(x, ROW_Y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.4);
      if (hits === Math.ceil(NEED / 2)) game.fx.popup('HALFWAY!', x, ROW_Y - 100, { color: C.gold, size: 32 });
      if (hits >= NEED) {
        finished = true; ok = true; hitStop = 0.3;
        game.fx.burst(W * 0.5, ROW_Y, { color: C.gold, count: 26, speed: 440 });
        game.audio.play('se_success', 0.5);
        finish();
        return;
      }
      angSpeed += 0.4;
      nextDrop();
    } else {
      finished = true; ok = false; hitStop = 0.3; shake = 0.25;
      game.feedback.bad(x, fallY, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) { game.audio.play('se_tap', 0.08); attemptDrop(); }
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
    var per = 1.9;
    var cyc = demo.t % (per * NEED + 0.6);
    if (cyc < dt || demo.t <= dt) initGame();
    var idx = Math.min(NEED - 1, Math.floor(cyc / per));
    var local = cyc - idx * per;
    fallY = H * 0.18 + Math.min(1, local / (per * 0.85)) * (ROW_Y - H * 0.18 - 60);
    // synthetic angle race to land exactly aligned at trigger moment
    ang = (local * 6.0) % (Math.PI * 2);
    demo.gx = slotX(activeSlot); demo.gy = fallY;
    var trigger = local > per * 0.8 && local < per * 0.8 + dt * 2;
    demo.press = trigger;
    if (trigger && !filled[activeSlot]) {
      ang = 0;
      filled[activeSlot] = true; hits = Math.min(NEED, hits + 1);
      game.feedback.good(slotX(activeSlot), ROW_Y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.2);
      nextDrop();
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (filled === undefined) initGame();
      stepDemo(dt);
      bg();
      drawRow();
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
      drawRow();
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
      ang += angSpeed * dt;
      fallY += fallSpeed * dt;
      if (fallY > ROW_Y + 40) {
        finished = true; ok = false; hitStop = 0.3; shake = 0.25;
        game.feedback.bad(slotX(activeSlot), ROW_Y, { text: 'MISS' });
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
    drawRow();
    if (!finished) drawFalling();

    txt(hits + ' / ' + NEED, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, '#2c3f66', 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.25], ['C4', 0.25], ['E4', 0.25], ['A4', 0.4]], { tempo: 136, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

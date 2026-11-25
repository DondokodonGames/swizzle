// D-20092012-0038-fluffbloom-garden.js
// フラフブルーム庭園 — 並んだ毛玉を同色方向へスワイプで滑らせ、3つ揃えて消す
// 操作: 毛玉を1匹選んでスワイプすると、隣の同色の列へ滑って合流する。3匹揃うと消える
// 終わり: 制限時間内に規定回数そろえれば成功。時間切れなら失敗
// @mechanic: swipe_direction
// @theme: fluff_garden_grooming
// 世界観: 小さな庭で丸まって暮らす毛玉たちの世話係が、指で毛玉をなでて同色の仲間へ寄せ集め、3匹揃えて空へ見送る
// 残るもの: 正誤(CLEAR/GAME OVER) + そろえた回数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: パステル基調、白縁の丸い形、上下で情報と遊びを分ける
  var C = {
    bg: '#fff3e0', bg2: '#ffe0ec', frame: '#ffffff',
    ink: '#5a4436', white: '#ffffff', gold: '#ffb703',
    good: '#3fd17a', bad: '#ff6b6b',
  };
  var FLUFF_COL = ['#ffb4c6', '#b8e0ff', '#fff0a0'];

  var GAME_TITLE = 'FLUFF GARDEN';
  var COLS = 5;
  var CELL_X0 = W * 0.14, CELL_DX = (W * 0.72) / (COLS - 1);
  var ROW_Y = H * 0.46;
  var TARGET = 3; // クリアに必要な「3匹そろえ」回数
  var TIME_LIMIT = 13;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var slots, cleared, timeLeft, halfShown;
  var done, endWait, finished, ready, hitStop, shake;
  var dragFrom, popFx;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000030', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FLUFF = ['.####.', '######', '#o##o#', '######', '.####.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, H * 0.30, W, H * 0.34, C.frame, 0.4);
    for (var i = 0; i < COLS; i++) {
      var x = CELL_X0 + i * CELL_DX;
      game.draw.circle(x, ROW_Y, 92, C.frame, 0.6);
    }
  }

  function slotX(i) { return CELL_X0 + i * CELL_DX; }

  function drawFluffs() {
    for (var i = 0; i < COLS; i++) {
      if (slots[i] < 0) continue;
      var wob = Math.sin(game.time.elapsed * 2.4 + i) * 5;
      var pal = { '#': FLUFF_COL[slots[i]], 'o': C.ink };
      game.draw.sprite(FLUFF, pal, slotX(i), ROW_Y + wob, 15, { anchor: 'center' });
    }
  }

  function refillEmpty() {
    for (var i = 0; i < COLS; i++) {
      if (slots[i] < 0) slots[i] = Math.floor(game.random(0, 3));
    }
    // 隣接3連の事故防止(緩く崩す)
    for (var j = 2; j < COLS; j++) {
      if (slots[j] === slots[j - 1] && slots[j] === slots[j - 2]) slots[j] = (slots[j] + 1) % 3;
    }
  }

  function initGame() {
    slots = [];
    for (var i = 0; i < COLS; i++) slots.push(-1);
    refillEmpty();
    cleared = 0; timeLeft = TIME_LIMIT; halfShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    dragFrom = -1; popFx = [];
  }

  function slotAt(x, y) {
    for (var i = 0; i < COLS; i++) {
      if (Math.abs(x - slotX(i)) < CELL_DX * 0.5 && Math.abs(y - ROW_Y) < 130) return i;
    }
    return -1;
  }

  function tryMove(from, dir) {
    var to = from + dir;
    if (to < 0 || to >= COLS) { return false; }
    if (slots[from] < 0 || slots[to] < 0) return false;
    if (slots[from] !== slots[to]) {
      game.audio.play('se_tap', 0.25);
      return false;
    }
    // 同色: 合流し、隣り合う同色が3つ以上ならまとめて消える
    var color = slots[from];
    var runStart = to, runEnd = to;
    while (runStart - 1 >= 0 && slots[runStart - 1] === color) runStart--;
    while (runEnd + 1 < COLS && slots[runEnd + 1] === color) runEnd++;
    // from の毛玉も加味(合流方向を含める)
    if (dir > 0) runStart = Math.min(runStart, from); else runEnd = Math.max(runEnd, from);
    var run = runEnd - runStart + 1;
    if (run >= TARGET) {
      var cx = (slotX(runStart) + slotX(runEnd)) / 2;
      popFx.push({ x: cx, y: ROW_Y, t: 0.3 });
      for (var i = runStart; i <= runEnd; i++) slots[i] = -1;
      cleared++;
      game.feedback.good(cx, ROW_Y, { text: 'NICE', color: C.good, sound: 'se_coin' });
      game.fx.burst(cx, ROW_Y, { color: FLUFF_COL[color], count: 16, speed: 300 });
      if (!halfShown && cleared >= Math.ceil(TARGET_CLEARS() / 2)) {
        halfShown = true;
        game.fx.popup('HALFWAY!', W * 0.5, H * 0.36, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.5);
      }
      refillEmpty();
      if (cleared >= TARGET_CLEARS()) {
        ok = true; finished = true; hitStop = 0.1; finish();
      }
      return true;
    } else {
      slots[from] = -1;
      game.audio.play('se_tap', 0.3);
      refillEmpty();
      return true;
    }
  }

  function TARGET_CLEARS() { return 4; }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    dragFrom = slotAt(x, y);
    if (dragFrom >= 0) game.audio.play('se_tap', 0.15);
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || ready > 0 || done || finished || dragFrom < 0) return;
    var d = dir === 'right' ? 1 : (dir === 'left' ? -1 : 0);
    if (d === 0) { dragFrom = -1; return; }
    tryMove(dragFrom, d);
    dragFrom = -1;
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: slotX(0), gy: ROW_Y, press: false };
  function stepDemo(dt) {
    if (slots === undefined) initGame();
    demo.t += dt;
    var cyc = demo.t % 1.4;
    if (cyc < dt || demo.t <= dt) {
      slots = [0, 0, 1, 0, 2]; cleared = 0; halfShown = false; popFx = [];
    }
    if (cyc > 0.4 && cyc < 0.65) {
      demo.gx = slotX(3); demo.gy = ROW_Y; demo.press = true;
    } else if (cyc >= 0.65 && cyc < 0.9 && slots[3] >= 0) {
      demo.gx = slotX(2); demo.gy = ROW_Y;
      if (!demo.fired) { demo.fired = true; tryMove(3, -1); }
    } else {
      demo.press = false;
      if (cyc < 0.4) demo.fired = false;
    }
    for (var i = popFx.length - 1; i >= 0; i--) { popFx[i].t -= dt; if (popFx[i].t <= 0) popFx.splice(i, 1); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawFluffs();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawFluffs();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(cleared + ' / ' + TARGET_CLEARS(), W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + Math.max(1, TARGET_CLEARS() - cleared) + '回!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { cleared: cleared, target: TARGET_CLEARS() };
        if (ok) game.end.success(cleared, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        ok = false; finished = true; hitStop = 0.3;
        game.feedback.bad(W * 0.5, ROW_Y, { text: 'TIME UP' });
        shake = 0.25;
        game.audio.play('se_failure', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;
    for (var i = popFx.length - 1; i >= 0; i--) { popFx[i].t -= dt; if (popFx[i].t <= 0) popFx.splice(i, 1); }

    bg();
    drawFluffs();

    txt(cleared + ' / ' + TARGET_CLEARS(), W / 2, H * 0.06, 32, C.ink);
    var warn = timeLeft < 3;
    game.draw.rect(60, 150, W - 120, 16, '#ffffff', 0.6);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 16, warn ? C.bad : C.good);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.3], ['G4', 0.3], ['B4', 0.3], ['E5', 0.6]], { tempo: 132, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

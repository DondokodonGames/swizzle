// D-20132016-0050-reel-order-escape.js
// リール順並べ — バラバラになったフィルムコマを正しい順番にドラッグで並び替え、脱出劇を完成させる
// 操作: シャッフルされた4コマを指でドラッグして入れ替え、正しい時系列順に並べる
// 終わり: 制限時間内に正しい順番へ並べ切れば成功。時間切れなら失敗
// @mechanic: drag_sort
// @theme: silent_film_escape_reel
// 世界観: 古びた無声映画のフィルム。捕らわれた主人公が脱出するまでの4コマがバラけてしまい、編集技師が正しい順に並べ直す
// 残るもの: 正誤(CLEAR/GAME OVER) + 揃った正解数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 一回り大きい黒縁+明暗2色のみで塗る
  var C = {
    bg: '#2a2038', bg2: '#181022', frame: '#0c0810', frameLit: '#3a2c50',
    panelLo: '#241a34', panelHi: '#4a3868', ink: '#080510', white: '#f4ecff',
    good: '#4dffa0', bad: '#ff4d5e', gold: '#ffd400', slot: '#150f20',
  };

  var GAME_TITLE = 'REEL ORDER';
  var N = 4;
  var SLOT_Y = H * 0.46;
  var SLOT_W = 210, SLOT_H = 260, GAP = 26;
  var TIME_LIMIT = 20;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  // panel[k] = 現在スロットkに置かれているコマの正解インデックス(0=最初のコマ...)
  var panel, timeLeft, dragIdx, dragX, dragY, solvedCount;
  var done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ICONS = [
    ['.##.', '####', '#..#', '.##.'], // 捕らわれ(檻の中)
    ['.##.', '###.', '#.#.', '.##.'], // もがく
    ['#.#.', '.##.', '..#.', '.##.'], // 走る
    ['.##.', '####', '.##.', '##.#'], // 自由(両手上げ)
  ];

  function slotX(k) { return W * 0.5 + (k - (N - 1) / 2) * (SLOT_W + GAP); }

  function bg(elapsed) {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(elapsed * 1.3));
    for (var i = 0; i < 10; i++) game.draw.rect(0, i * (H / 10), W, 3, '#00000018');
  }

  function drawPanel(k, cx, cy, dim) {
    var val = panel[k];
    // 一回り大きい黒縁(TOON SHADE)
    game.draw.rect(cx - SLOT_W / 2 - 6, cy - SLOT_H / 2 - 6, SLOT_W + 12, SLOT_H + 12, C.frame);
    game.draw.rect(cx - SLOT_W / 2, cy - SLOT_H / 2, SLOT_W, SLOT_H, val === k ? C.panelHi : C.panelLo, dim ? 0.5 : 1);
    game.draw.sprite(ICONS[val], { '#': C.white }, cx, cy - 20, 26, { anchor: 'center' });
    txt(String(val + 1), cx, cy + SLOT_H / 2 - 30, 30, val === k ? C.good : C.gold);
  }

  function initGame() {
    var order = [0, 1, 2, 3];
    do {
      for (var i = order.length - 1; i > 0; i--) {
        var j = Math.floor(game.random(0, i + 1));
        var tmp = order[i]; order[i] = order[j]; order[j] = tmp;
      }
    } while (isSolved(order) || derangementScore(order) < 2);
    panel = order.slice();
    timeLeft = TIME_LIMIT;
    dragIdx = -1; dragX = 0; dragY = 0; solvedCount = countSolved();
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }
  function isSolved(arr) { for (var i = 0; i < N; i++) if (arr[i] !== i) return false; return true; }
  function derangementScore(arr) { var c = 0; for (var i = 0; i < N; i++) if (arr[i] !== i) c++; return c; }
  function countSolved() { var c = 0; for (var i = 0; i < N; i++) if (panel[i] === i) c++; return c; }

  function slotAt(x, y) {
    for (var k = 0; k < N; k++) {
      var cx = slotX(k);
      if (Math.abs(x - cx) < SLOT_W / 2 + 10 && Math.abs(y - SLOT_Y) < SLOT_H / 2 + 10) return k;
    }
    return -1;
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || finished) return;
    var k = slotAt(x, y);
    if (k >= 0) { dragIdx = k; dragX = x; dragY = y; game.audio.play('se_tap', 0.12); }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || dragIdx < 0) return;
    dragX = x; dragY = y;
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || dragIdx < 0) return;
    var k = slotAt(x, y);
    if (k >= 0 && k !== dragIdx) {
      var tmp = panel[k]; panel[k] = panel[dragIdx]; panel[dragIdx] = tmp;
      game.feedback.good(x, y, { text: '', count: 8, sound: 'se_tap', volume: 0.2 });
      var newSolved = countSolved();
      if (newSolved > solvedCount) game.fx.popup(newSolved + ' / ' + N, x, y - 80, { color: C.gold, size: 30 });
      solvedCount = newSolved;
      if (isSolved(panel)) {
        ok = true; finished = true;
        game.feedback.good(W * 0.5, SLOT_Y, { text: 'CLEAR' });
        finish();
      }
    } else {
      game.audio.play('se_tap', 0.05);
    }
    dragIdx = -1;
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepPlay(dt) {
    timeLeft -= dt;
    if (timeLeft <= 0) {
      ok = false; finished = true; hitStop = 0.3; shake = 0.2;
      game.feedback.bad(W * 0.5, SLOT_Y, { text: 'TIME UP' });
      finish();
    }
  }

  var demo = { t: 0, gx: 0, gy: SLOT_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.0;
    if (cyc < dt || demo.t <= dt) { panel = [1, 0, 3, 2]; }
    var swapAt = 1.2, swapAt2 = 3.0;
    if (cyc < swapAt) {
      demo.gx = slotX(0); demo.press = false;
    } else if (cyc < swapAt + 0.8) {
      var p = (cyc - swapAt) / 0.8;
      demo.gx = slotX(0) + (slotX(1) - slotX(0)) * p;
      demo.press = true;
      if (cyc + dt >= swapAt + 0.8) { var t0 = panel[0]; panel[0] = panel[1]; panel[1] = t0; }
    } else if (cyc < swapAt2) {
      demo.gx = slotX(2); demo.press = false;
    } else if (cyc < swapAt2 + 0.8) {
      var p2 = (cyc - swapAt2) / 0.8;
      demo.gx = slotX(2) + (slotX(3) - slotX(2)) * p2;
      demo.press = true;
      if (cyc + dt >= swapAt2 + 0.8) { var t1 = panel[2]; panel[2] = panel[3]; panel[3] = t1; }
    } else {
      demo.gx = slotX(3); demo.press = false;
    }
    demo.gy = SLOT_Y + 160;
  }

  game.onUpdate(function(dt) {
    var el = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (panel === undefined) initGame();
      stepDemo(dt);
      bg(el);
      for (var k = 0; k < N; k++) drawPanel(k, slotX(k), SLOT_Y, false);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.10, 44, C.white);
      txt('BEST ' + (game.best > 0 ? Math.round(game.best) : '-'), W / 2, H * 0.135, 22, C.gold);
      if (Math.floor(el * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg(el);
      for (var r = 0; r < N; r++) drawPanel(r, slotX(r), SLOT_Y, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 48, ok ? C.good : C.bad);
      txt(countSolved() + ' / ' + N, W / 2, H * 0.135, 28, C.gold);
      if (!ok) txt('あと' + (N - countSolved()) + '!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(el * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(countSolved(), { solved: countSolved(), total: N });
        else game.end.failure({ solved: countSolved(), total: N });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepPlay(dt);
    }
    if (shake > 0) shake -= dt;

    bg(el);
    for (var j = 0; j < N; j++) {
      if (j === dragIdx) continue;
      drawPanel(j, slotX(j), SLOT_Y, false);
    }
    if (dragIdx >= 0) drawPanel(dragIdx, dragX, dragY, true);

    txt(countSolved() + ' / ' + N, W / 2, H * 0.06, 28, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (timeLeft / TIME_LIMIT), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.72, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.25], ['D4', 0.25], ['E4', 0.25], ['G4', 0.4]], { tempo: 140, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

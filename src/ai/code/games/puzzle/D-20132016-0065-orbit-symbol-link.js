// D-20132016-0065-orbit-symbol-link.js
// オービットシンボルリンク — 円盤上をゆっくり回り続ける同じ絵柄を2つ選んでつなぎ消すと、味方が攻撃する
// 操作: 同じ絵柄のパネルを1つ押さえてから、もう1つの同じ絵柄までドラッグして指を離す
// 終わり: 制限時間内に全3組(6枚)を消せば成功。時間切れなら失敗
// @mechanic: trace
// @theme: orbit_symbol_match_ally
// 世界観: 円盤状の祭壇がゆっくり回転し続ける中、巫女見習いが同じ紋様のパネルを2枚選んでつなぎ、消すたびに傍らの守り手が敵へ攻撃を放つ
// 残るもの: 正誤(CLEAR/GAME OVER) + 消した組数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: 淡いパステル、丸みのある枠、光沢の薄いハイライト
  var C = {
    bg: '#fdeef5', bg2: '#f6dcec', disc: '#ffffff', discEdge: '#e7c6db',
    tileA: '#ff9ecf', tileB: '#8fd7ff', tileC: '#ffe08a',
    good: '#4ddc9a', bad: '#ff6b7a', gold: '#ff9f43', ink: '#3a2436', white: '#3a2436',
    ally: '#7ad0ff',
  };

  var GAME_TITLE = 'ORBIT LINK';
  var CX = W * 0.5, CY = H * 0.42;
  var RC = 300;
  var TILE_R = 80;
  var ROT_SPEED = 0.34;
  var TIME_LIMIT = 12;
  var SYMBOLS = [0, 1, 2, 0, 1, 2];
  var SYM_COL = [C.tileA, C.tileB, C.tileC];
  var ALLY_POS = { x: W * 0.5, y: H * 0.86 };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var alive, cleared, timeLeft, selecting, selIdx, dragX, dragY, done, endWait, finished;
  var ready, hitStop, shake, allyAttackT;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ALLY_S = ['.##.', '####', '.##.', '.##.'];
  var SYM_SHAPE = [
    ['..#..', '.###.', '#####', '.###.', '..#..'], // star-ish
    ['.###.', '#####', '#####', '#####', '.###.'], // ring/diamond
    ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'], // cross
  ];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    game.draw.circle(CX, CY, RC + 90, C.discEdge, 0.6);
    game.draw.circle(CX, CY, RC + 70, C.disc, 0.9);
  }

  function angleOf(i, t) { return (Math.PI * 2 / SYMBOLS.length) * i + t * ROT_SPEED; }
  function slotPos(i, t) {
    var a = angleOf(i, t);
    return { x: CX + Math.cos(a) * RC, y: CY + Math.sin(a) * RC };
  }
  function tileAt(x, y, t) {
    for (var i = 0; i < SYMBOLS.length; i++) {
      if (!alive[i]) continue;
      var p = slotPos(i, t);
      if (Math.hypot(x - p.x, y - p.y) < TILE_R) return i;
    }
    return -1;
  }

  function drawAlly(t) {
    var lunge = allyAttackT > 0 ? Math.sin((0.4 - allyAttackT) / 0.4 * Math.PI) * 60 : 0;
    var flash = allyAttackT > 0 ? 0.6 : 0;
    game.draw.circle(ALLY_POS.x, ALLY_POS.y - lunge, 60, C.ally, 0.25 + flash);
    game.draw.sprite(ALLY_S, { '#': C.ally }, ALLY_POS.x, ALLY_POS.y - lunge, 14, { anchor: 'center' });
  }

  function drawTiles(t, bob) {
    for (var i = 0; i < SYMBOLS.length; i++) {
      if (!alive[i]) continue;
      var p = slotPos(i, t);
      var sel = selecting && selIdx === i;
      game.draw.circle(p.x, p.y, TILE_R, sel ? C.gold : '#ffffff', 1);
      game.draw.circle(p.x, p.y, TILE_R - 8, SYM_COL[SYMBOLS[i]], sel ? 1 : 0.85);
      game.draw.sprite(SYM_SHAPE[SYMBOLS[i]], { '#': C.ink }, p.x, p.y + bob * 0.3, 8, { anchor: 'center' });
    }
    if (selecting && selIdx >= 0) {
      var sp = slotPos(selIdx, t);
      game.draw.line(sp.x, sp.y, dragX, dragY, C.gold, 8);
    }
  }

  function initGame() {
    alive = SYMBOLS.map(function() { return true; });
    cleared = 0; timeLeft = TIME_LIMIT;
    selecting = false; selIdx = -1; dragX = CX; dragY = CY;
    done = false; endWait = 0; finished = false; allyAttackT = 0;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function resolvePair(i, j, x, y) {
    if (j < 0 || j === i || !alive[j]) {
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_tap', 0.2);
      timeLeft = Math.max(0, timeLeft - 0.8);
      return;
    }
    if (SYMBOLS[i] === SYMBOLS[j]) {
      alive[i] = false; alive[j] = false; cleared++;
      hitStop = 0.1;
      game.feedback.good(x, y, { text: 'GOOD', color: C.good });
      game.audio.play('se_milestone', 0.4);
      allyAttackT = 0.4;
      game.fx.burst(ALLY_POS.x, ALLY_POS.y, { color: C.gold, count: 14, speed: 320 });
      if (cleared === SYMBOLS.length / 2 - 1) game.fx.popup('LAST PAIR!', CX, CY - RC - 40, { color: C.gold, size: 34 });
      if (cleared >= SYMBOLS.length / 2) {
        ok = true; finished = true; hitStop = 0.3;
        game.audio.play('se_success', 0.5);
        finish();
      }
    } else {
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.3);
      timeLeft = Math.max(0, timeLeft - 1.0);
    }
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    game.audio.play('se_tap', 0.05);
    var idx = tileAt(x, y, game.time.elapsed);
    if (idx >= 0) { selecting = true; selIdx = idx; dragX = x; dragY = y; }
  });
  game.onMove(function(x, y) { if (state === S.PLAYING && selecting) { dragX = x; dragY = y; } });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !selecting) return;
    selecting = false;
    var idx2 = tileAt(x, y, game.time.elapsed);
    resolvePair(selIdx, idx2, x, y);
    selIdx = -1;
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: CY, press: false, phase: 0, phaseT: 0.5 };
  function findMatchPair() {
    for (var i = 0; i < SYMBOLS.length; i++) {
      if (!alive[i]) continue;
      for (var j = i + 1; j < SYMBOLS.length; j++) {
        if (alive[j] && SYMBOLS[j] === SYMBOLS[i]) return [i, j];
      }
    }
    return null;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) {
      alive = SYMBOLS.map(function() { return true; });
      cleared = 0; demo.phase = 0; demo.phaseT = 0.45;
    }
    demo.phaseT -= dt;
    if (demo.phaseT <= 0) {
      var pair = findMatchPair();
      if (pair) {
        var p1 = slotPos(pair[0], demo.t), p2 = slotPos(pair[1], demo.t);
        if (demo.phase === 0) { demo.gx = p1.x; demo.gy = p1.y; demo.press = true; demo.phase = 1; demo.phaseT = 0.5; }
        else {
          demo.gx = p2.x; demo.gy = p2.y; demo.press = true;
          alive[pair[0]] = false; alive[pair[1]] = false; cleared++;
          allyAttackT = 0.4;
          game.feedback.good(p2.x, p2.y, { text: 'GOOD', color: C.good });
          game.audio.play('se_milestone', 0.25);
          demo.phase = 0; demo.phaseT = 0.55;
        }
      } else { demo.press = false; }
    }
  }

  game.onUpdate(function(dt) {
    var bob = Math.sin(game.time.elapsed * 2.4) * 6;
    if (allyAttackT > 0) allyAttackT -= dt;

    if (state === S.ATTRACT) {
      if (alive === undefined) initGame();
      bg();
      stepDemo(dt);
      drawTiles(demo.t, bob);
      drawAlly(demo.t);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.115, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTiles(game.time.elapsed, bob);
      drawAlly(game.time.elapsed);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(cleared + ' / ' + (SYMBOLS.length / 2), W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.17, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: SYMBOLS.length / 2 });
        else game.end.failure({ cleared: cleared, total: SYMBOLS.length / 2 });
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
        game.feedback.bad(CX, CY, { text: 'MISS' });
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawTiles(game.time.elapsed, bob);
    drawAlly(game.time.elapsed);

    txt(cleared + ' / ' + (SYMBOLS.length / 2), W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, '#f0d0e0', 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['F4', 0.25], ['A4', 0.25], ['C5', 0.25], ['F5', 0.4]], { tempo: 150, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

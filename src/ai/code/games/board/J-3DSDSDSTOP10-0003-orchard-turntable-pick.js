// J-3DSDSDSTOP10-0003-orchard-turntable-pick.js
// 果樹園の回転台もぎ — 回る台の縁の実が手元の窓を通る瞬間だけタップして、注文札の実だけを取る
// 操作: 画面のどこでもタップ。手元の窓(台の下端)に注文札と同じ実が入っている時だけ取れる。違う実や空振りはMISS
// 終わり: 14秒で注文の実を8個取ればCLEAR。届かなければGAME OVER(台は時々逆回転する)
// @mechanic: timing_window
// @theme: orchard_turntable_pick
// 世界観: 山あいの収穫祭で、ぐるぐる回る果物棚から問屋の注文札どおりの実だけを籠に移す売り子が、昼の荷車が出る前に注文をそろえる
// 残るもの: 正誤(CLEAR/GAME OVER) + 取った数・最大連続・空振り数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 原色+白縁、明るい背景、光の柱と祝祭演出
  var STYLE = { bg: ['#4fc3ff', '#b8f0ff', '#fff6b0'], main: ['#ffffff', '#ff3d7f', '#2ecc40'], accent: ['#ffdc00', '#7a3dff'] };
  var C = { white: '#ffffff', ink: '#1a1a40', pink: '#ff3d7f', green: '#2ecc40', yel: '#ffdc00', purple: '#7a3dff', table: '#c9803a', table2: '#a4622a', bad: '#ff2a2a', win: '#ffffff' };

  var GAME_TITLE = 'FRUIT SPIN';
  var TIME_LIMIT = 14;
  var NEEDED = 8;
  var CX = W / 2, CY = H * 0.46, R = 330;
  var WIN_ANG = Math.PI / 2;       // 手元の窓(下端)
  var WIN_HALF = 0.2;              // 窓の半幅(ラジアン)
  var SLOTS = 10;

  // 実の種類: 0 桃 / 1 梨 / 2 すもも / 3 虫食い
  var FRUIT = [
    ['...#....', '..##....', '.######.', '########', '########', '########', '.######.', '..####..'],
    ['....#...', '...##...', '..####..', '..####..', '.######.', '########', '########', '.######.'],
    ['....#...', '...#....', '.######.', '########', '##o#####', '########', '.######.', '..####..'],
    ['...#....', '..##....', '.######.', '##oo####', '#o##o###', '########', '.##o###.', '..####..']
  ];
  var FCOL = ['#ff8fa3', '#c8e84a', '#9a4dff', '#8a7a4a'];
  var PICKER = ['..####..', '.######.', '.#o##o#.', '.######.', '..#rr#..', '########', '#.####.#', '..#..#..'];
  var BASKET = ['#.#.#.#.#', '#########', '.#######.', '..#####..'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var rim, rot, spd, dir, want, picked, combo, bestCombo, misses, timeLeft, ready, ended, ok, hitStop, endWait, score;
  var flipWarn, flipCd, wantFlash, milestone, arm, hiSlot;

  function randKind(bias) {
    if (Math.random() < bias) return want;
    var k = Math.floor(game.random(0, 4));
    return k;
  }

  function initGame() {
    want = Math.floor(game.random(0, 3));
    rim = [];
    for (var i = 0; i < SLOTS; i++) rim.push({ kind: randKind(0.35), gold: false, gone: 0, empty: false });
    rot = 0; spd = 1.5; dir = 1; picked = 0; combo = 0; bestCombo = 0; misses = 0;
    timeLeft = TIME_LIMIT; ready = 0.8; ended = false; ok = false; hitStop = 0; endWait = 0; score = 0;
    flipWarn = 0; flipCd = 4.5; wantFlash = 0; milestone = false; arm = 0; hiSlot = -1;
  }

  function slotAngle(i) { return rot + (i / SLOTS) * Math.PI * 2; }
  function angDiff(a, b) {
    var d = (a - b) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  }
  function slotInWindow() {
    var best = -1, bd = 99;
    for (var i = 0; i < SLOTS; i++) {
      if (rim[i].empty) continue;
      var d = Math.abs(angDiff(slotAngle(i), WIN_ANG));
      if (d < bd) { bd = d; best = i; }
    }
    return bd <= WIN_HALF ? best : -1;
  }

  // 実ロジック: 1回のタップで窓の中の実を取る(デモも同じ関数)
  function tryPick(demoMode) {
    arm = 0.25;
    var i = slotInWindow();
    var wx = CX, wy = CY + R;
    if (i >= 0 && rim[i].kind === want) {
      var f = rim[i];
      f.empty = true; f.gone = 0.3;
      var pts = f.gold ? 2 : 1;
      if (!demoMode) {
        picked += pts; combo++; bestCombo = Math.max(bestCombo, combo);
        var centered = Math.abs(angDiff(slotAngle(i), WIN_ANG)) < WIN_HALF * 0.4;
        score += (centered ? 150 : 100) * pts + combo * 10;
        game.feedback.good(wx, wy - 60, { text: f.gold ? 'BONUS' : (centered ? 'PERFECT' : 'GOOD'), color: C.green });
        if (!milestone && picked >= NEEDED / 2) {
          milestone = true; game.audio.play('se_milestone', 0.6);
          game.fx.popup(picked + ' / ' + NEEDED, W / 2, H * 0.2, { color: C.pink, size: 70 });
        }
        if (picked > 0 && picked % 4 === 0 && picked < NEEDED) { changeWant(); }
      } else {
        game.fx.burst(wx, wy - 60, { color: C.green, count: 10 });
      }
      return true;
    }
    combo = 0;
    if (!demoMode) {
      misses++;
      game.feedback.bad(wx, wy - 60, { text: 'MISS' });
    } else {
      game.fx.burst(wx, wy - 60, { color: C.bad, count: 8 });
    }
    hiSlot = i;
    return false;
  }

  function changeWant() {
    var nw = (want + 1 + Math.floor(game.random(0, 2))) % 3;
    want = nw; wantFlash = 0.8;
    game.audio.play('se_powerup', 0.4);
  }

  function stepTable(dt, demoMode) {
    rot += spd * dir * dt;
    for (var i = 0; i < SLOTS; i++) {
      var f = rim[i];
      if (f.gone > 0) f.gone -= dt;
      // 奥(上端)を通るときに空き枠へ新しい実を補充
      if (f.empty && f.gone <= 0 && Math.abs(angDiff(slotAngle(i), -Math.PI / 2)) < 0.3) {
        f.empty = false; f.kind = randKind(0.4); f.gold = !demoMode && Math.random() < 0.1 && f.kind === want;
      }
    }
    if (arm > 0) arm -= dt;
    if (wantFlash > 0) wantFlash -= dt;
    if (demoMode) return;
    spd = 1.5 + (TIME_LIMIT - timeLeft) * 0.07;
    if (flipWarn > 0) {
      flipWarn -= dt;
      if (flipWarn <= 0) { dir = -dir; game.audio.play('se_jump', 0.3); flipCd = game.random(3, 4.5); }
    } else {
      flipCd -= dt;
      if (flipCd <= 0) { flipWarn = 0.7; game.audio.tone('G4', 0.4, { wave: 'square', volume: 0.05, slide: -200 }); }
    }
  }

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x, y + 5, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function drawStage(t) {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.55, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    // 光の柱
    for (var p = 0; p < 5; p++) {
      var px = W * (0.1 + p * 0.2) + Math.sin(t * 0.8 + p) * 40;
      game.draw.rect(px - 40, 0, 80, H * 0.78, C.white, 0.08 + 0.05 * Math.sin(t * 2 + p));
    }
    game.draw.rect(0, 0, W, H, C.yel, 0.03 + 0.03 * Math.sin(t * 1.7));
    // 手前の売り台(親指ゾーン)
    game.draw.rect(0, H * 0.76, W, H * 0.24, C.pink, 1);
    for (var s = 0; s < 12; s++) game.draw.rect(s * 90, H * 0.76, 45, H * 0.24, C.white, 0.18);
  }

  function drawTable(t) {
    game.draw.circle(CX, CY + 24, R + 70, C.ink, 0.25);
    game.draw.circle(CX, CY, R + 70, C.white, 1);
    game.draw.circle(CX, CY, R + 58, C.table, 1);
    game.draw.circle(CX, CY, R - 70, C.table2, 1);
    // 回転が見える放射線
    for (var k = 0; k < 6; k++) {
      var a = rot + k * Math.PI / 3;
      game.draw.line(CX, CY, CX + Math.cos(a) * (R - 80), CY + Math.sin(a) * (R - 80), C.table, 10);
    }
    game.draw.circle(CX, CY, 70, C.yel, 1);
    // 逆回転の予告: 中央の矢印マーク点滅
    if (flipWarn > 0 && Math.floor(t * 12) % 2 === 0) {
      game.draw.circle(CX, CY, 90, C.bad, 0.8);
      game.draw.line(CX - 40, CY, CX + 40, CY, C.white, 14);
      game.draw.line(CX + 40 * -dir, CY, CX + 10 * -dir, CY - 30, C.white, 14);
      game.draw.line(CX + 40 * -dir, CY, CX + 10 * -dir, CY + 30, C.white, 14);
    }
    // 手元の窓
    var wx = CX, wy = CY + R;
    var pulse = 0.5 + 0.3 * Math.sin(t * 6);
    game.draw.circle(wx, wy, 88, C.white, pulse);
    game.draw.circle(wx, wy, 74, C.yel, 0.35);
    // 縁の実
    for (var i = 0; i < SLOTS; i++) {
      var f = rim[i];
      if (f.empty && f.gone <= 0) continue;
      var an = slotAngle(i);
      var fx = CX + Math.cos(an) * R, fy = CY + Math.sin(an) * R;
      if (f.gone > 0) { fy += (0.3 - f.gone) * 500; }
      var bob = Math.sin(t * 3 + i) * 4;
      var sc = (hiSlot === i && ended) ? 13 : 9;
      if (f.gold) game.draw.circle(fx, fy, 56, C.yel, 0.6 + 0.3 * Math.sin(t * 10));
      game.draw.sprite(FRUIT[f.kind], { '#': FCOL[f.kind], 'o': '#3a2a10' }, fx, fy + bob, sc, { anchor: 'center', alpha: f.gone > 0 ? f.gone / 0.3 : 1 });
    }
  }

  function drawPicker(t) {
    var ay = H * 0.83 - (arm > 0 ? arm * 300 : 0);
    game.draw.line(CX, H * 0.86, CX, ay, '#ffd0a0', 30);
    game.draw.sprite(PICKER, { '#': C.purple, 'o': C.white, 'r': C.pink }, W * 0.2, H * 0.86 + Math.sin(t * 3) * 6, 12, { anchor: 'center' });
    game.draw.sprite(BASKET, { '#': '#c9803a' }, W * 0.8 + Math.cos(t * 2) * 5, H * 0.87, 16, { anchor: 'center' });
  }

  function drawOrder(t) {
    // 注文札(左上)。切り替わりは白く点滅して予告
    var fl = wantFlash > 0 && Math.floor(t * 12) % 2 === 0;
    game.draw.rect(40, H * 0.1, 170, 170, fl ? C.yel : C.white, 1);
    game.draw.rect(52, H * 0.1 + 12, 146, 146, C.ink, 0.08);
    game.draw.sprite(FRUIT[want], { '#': FCOL[want], 'o': '#3a2a10' }, 125, H * 0.1 + 85 + Math.sin(t * 3) * 5, 13, { anchor: 'center' });
  }

  function drawHud(t) {
    txt(picked + ' / ' + NEEDED, W * 0.58, H * 0.05, 64, C.white);
    txt('SCORE ' + score, W * 0.58, H * 0.1, 32, C.white);
    if (combo >= 2) txt('COMBO ' + combo, W * 0.58, H * 0.14, 36, C.yel);
    game.draw.rect(260, 40, W - 300, 18, C.ink, 0.6);
    var low = timeLeft < 3 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(260, 40, (W - 300) * Math.max(0, timeLeft / TIME_LIMIT), 18, low ? C.bad : C.yel);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (ready > 0 || ended) return;
    game.audio.play('se_tap', 0.2);
    tryPick(false);
  });

  // ── ATTRACT ゴースト実演(3.2秒周期: 注文の実が窓に入った瞬間に取る。周期末に1回わざと空振り) ──
  var demo = { t: 0, gx: CX, gy: H * 0.85, press: 0, lastPick: 0, missDone: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) {
      want = 0; rot = 0; dir = 1; spd = 1.6; demo.missDone = false; demo.lastPick = 0;
      for (var i = 0; i < SLOTS; i++) rim[i] = { kind: i % 3 === 0 ? 0 : (i % 3 === 1 ? 3 : 1), gold: false, gone: 0, empty: false };
    }
    stepTable(dt, true);
    var s = slotInWindow();
    if (s >= 0 && rim[s].kind === want && Math.abs(angDiff(slotAngle(s), WIN_ANG)) < 0.08 && cyc < 2.4) {
      tryPick(true); demo.press = 0.2; demo.lastPick = cyc;
    }
    if (cyc > 2.6 && !demo.missDone) {
      var s2 = slotInWindow();
      if (s2 >= 0 && rim[s2].kind !== want) { demo.missDone = true; tryPick(true); demo.press = 0.2; }
    }
    if (demo.press > 0) demo.press -= dt;
    demo.gx = CX + Math.sin(demo.t * 1.3) * 60; demo.gy = H * 0.84;
  }

  function finish(success) {
    ended = true; ok = success; hitStop = 0.45; endWait = 1.1;
    if (!success) hiSlot = slotInWindow();
    game.fx.flash('#ffffff', 0.2);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (rim === undefined) initGame();
      stepDemo(dt);
      drawStage(t); drawTable(t); drawPicker(t); drawOrder(t);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 14 });
      txt(GAME_TITLE, W * 0.6, H * 0.08 + Math.sin(t * 2) * 6, 84, C.white);
      txt('HI-SCORE ' + (game.best || 0), W * 0.6, H * 0.135, 36, C.purple);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 48, C.yel);
      else txt('INSERT COIN', W / 2, H * 0.95, 42, C.white);
      return;
    }
    if (state === S.RESULT) { drawStage(t); drawTable(t); drawResult(t); return; }

    if (ended) {
      if (hitStop > 0) {
        hitStop -= dt;
        if (hitStop <= 0) {
          if (ok) { game.audio.play('se_success', 0.7); game.fx.burst(CX, CY, { color: C.yel, count: 50, speed: 700 }); }
          else { game.feedback.bad(CX, CY + R, { text: 'TIME UP' }); game.audio.play('se_failure', 0.6); }
        }
      } else {
        endWait -= dt;
        if (endWait <= 0) {
          state = S.RESULT;
          var stats = { picked: picked, bestCombo: bestCombo, misses: misses, needed: NEEDED };
          drawStage(t); drawTable(t); drawResult(t);
          if (ok) game.end.success(score, stats); else game.end.failure(stats);
          return;
        }
      }
    } else if (ready > 0) {
      ready -= dt;
      stepTable(dt * 0.3, false);
      if (ready <= 0) game.audio.play('se_tap', 0.5);
    } else {
      timeLeft -= dt;
      stepTable(dt, false);
      if (picked >= NEEDED) finish(true);
      else if (timeLeft <= 0) { timeLeft = 0; finish(false); }
    }

    drawStage(t); drawTable(t); drawPicker(t); drawOrder(t); drawHud(t);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', CX, CY, 110, C.pink);
  });

  function drawResult(t) {
    game.draw.rect(60, H * 0.3, W - 120, H * 0.4, C.white, 0.9);
    if (ok) {
      txt('CLEAR', W / 2, H * 0.37, 130, C.green);
      for (var f = 0; f < 3; f++) game.draw.sprite(FRUIT[f], { '#': FCOL[f], 'o': '#3a2a10' }, W * (0.35 + f * 0.15), H * 0.46 + Math.sin(t * 4 + f) * 12, 10, { anchor: 'center' });
    } else {
      txt('GAME OVER', W / 2, H * 0.37, 104, C.bad);
      txt('あと' + Math.max(0, NEEDED - picked) + '個!', W / 2, H * 0.46, 64, C.pink);
    }
    txt(picked + ' / ' + NEEDED, W / 2, H * 0.53, 58, C.ink);
    txt('SCORE ' + score, W / 2, H * 0.59, 46, C.purple);
    var isNew = ok && score > (game.best || 0);
    txt(isNew ? 'NEW RECORD' : 'BEST ' + (game.best || 0), W / 2, H * 0.65, 44, isNew ? C.pink : C.purple);
    if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.93, 44, C.white);
  }

  game.onStart(function() {
    game.audio.melody([
      ['C5', 0.5], ['C5', 0.5], ['G5', 0.5], ['E5', 0.5], ['F5', 0.5], ['A5', 0.5], ['G5', 1],
      ['E5', 0.5], ['G5', 0.5], ['C6', 0.5], ['B5', 0.5], ['A5', 0.5], ['G5', 0.5], ['C6', 1]
    ], { tempo: 176, wave: 'square', volume: 0.045, loop: true, bass: [['C3', 1], ['G2', 1], ['F2', 1], ['G2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

// GH-PS-0044-gate-course-guide.js
// ゲートコースガイド — 玉を指で運び、番号順にゲートを通す。最後のゲートは開閉する
// 操作: 玉を指でつまみ、1→5の番号順にゲートへ通す。順番違いや罠に触れると失格
// 終わり: 制限時間内に5ゲートを順番通り通せればクリア。罠接触/順番違反/時間切れで失敗
// @mechanic: guide_path
// @theme: signal_relay_field
// 世界観: 信号中継フィールドの制御室。散らばる中継ゲートへ、信号玉を正しい順番で送り込む
// 残るもの: 正誤(CLEAR/GAME OVER) + 通過ゲート数
// スタイル: 8bit PC MONITOR

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 8bit PC MONITOR: 高解像度・低色数、細線とテキスト枠のUI
  var STYLE = {
    bg: ['#04140c', '#010804'],
    main: ['#39ff6a', '#0aa83a', '#ffffff'],
    accent: ['#ffd400', '#ff3b3b'],
  };
  var C = {
    bgTop: STYLE.bg[0], bgBot: STYLE.bg[1], grid: '#0f3a1e',
    gate: STYLE.main[0], gateDone: '#0aa83a', gateShut: '#245a2f',
    trap: STYLE.accent[1], orb: STYLE.main[2], gold: STYLE.accent[0],
    good: STYLE.main[0], bad: STYLE.accent[1], white: '#ffffff', ink: '#021a08',
  };

  var GAME_TITLE = 'GATE COURSE GUIDE';
  var MAX_TIME = 18;
  var CX = W * 0.5;
  var GATE_R = 66, TRAP_R = 54;
  var SHUTTER_CYCLE = 2.4, SHUTTER_OPEN = 1.2, SHUTTER_WARN = 1.8;

  var START = { x: CX, y: H * 0.84 };
  var GATES = [
    { x: CX - 260, y: H * 0.62 },
    { x: CX + 240, y: H * 0.52 },
    { x: CX - 200, y: H * 0.38 },
    { x: CX + 180, y: H * 0.27 },
    { x: CX, y: H * 0.17, shutter: true },
  ];
  var TRAPS = [
    { x: CX + 40, y: H * 0.57 },
    { x: CX - 40, y: H * 0.325 },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var nextIdx, orbX, orbY, dragging, timeLeft, milestoneShown, failReason;
  var done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ORB_SPRITE = ['.#.', '###', '.#.'];

  function shutterInfo(elapsed) {
    var t = elapsed % SHUTTER_CYCLE;
    return { open: t < SHUTTER_OPEN, warn: t >= SHUTTER_OPEN && t < SHUTTER_WARN, closed: t >= SHUTTER_WARN };
  }

  function initGame() {
    nextIdx = 0; orbX = START.x; orbY = START.y; dragging = false;
    timeLeft = MAX_TIME; milestoneShown = false; failReason = '';
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  var runClock = 0;
  // ── 共有ロジック(実演でも本編でもこの関数群を使う) ──────────────────
  function moveOrb(x, y) {
    orbX = x; orbY = y;
    checkGates();
    checkTraps();
  }
  function checkTraps() {
    if (finished) return;
    for (var i = 0; i < TRAPS.length; i++) {
      var d = Math.hypot(orbX - TRAPS[i].x, orbY - TRAPS[i].y);
      if (d <= TRAP_R) { fail('TRAP'); return; }
    }
  }
  function checkGates() {
    if (finished) return;
    for (var i = 0; i < GATES.length; i++) {
      var g = GATES[i];
      var d = Math.hypot(orbX - g.x, orbY - g.y);
      if (d > GATE_R) continue;
      if (i < nextIdx) continue; // 既に通過済み
      if (i > nextIdx) { fail('MISS'); return; }
      // i === nextIdx: 次に通るべきゲート
      if (g.shutter) {
        var sh = shutterInfo(runClock);
        if (sh.closed) { fail('MISS'); return; }
      }
      passGate(i);
      return;
    }
  }
  function passGate(i) {
    nextIdx++;
    game.feedback.good(GATES[i].x, GATES[i].y, { text: String(nextIdx) });
    game.fx.burst(GATES[i].x, GATES[i].y, { color: C.good, count: 14, speed: 320 });
    if (nextIdx === 3 && !milestoneShown) {
      milestoneShown = true;
      game.fx.popup(nextIdx + ' / ' + GATES.length, CX, H * 0.14, { color: C.white, size: 40 });
      game.audio.play('se_milestone', 0.5);
    }
    if (nextIdx >= GATES.length) { ok = true; win(); }
  }
  function fail(reason) {
    if (finished) return;
    failReason = reason;
    game.feedback.bad(orbX, orbY, { text: reason });
    shake = 0.2; hitStop = 0.16;
    ok = false; win();
  }
  function win() {
    finished = true;
  }

  function tapInput() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; runClock = 0; initGame(); demo.t = 0; demo.press = false; return; }
  }
  game.onTap(function(x, y) { game.audio.play('se_tap', 0.1); tapInput(); });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || done || ready > 0 || hitStop > 0 || finished) return;
    game.audio.play('se_tap', 0.12);
    dragging = true;
    moveOrb(x, y);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !dragging) return;
    if (Math.random() < 0.08) game.audio.play('se_tap', 0.02);
    moveOrb(x, y);
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    game.audio.play('se_tap', 0.06);
    dragging = false;
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.2;
  }

  // ── ATTRACT ゴースト実演: moveOrb/checkGates/checkTraps を本編と共有 ──
  var demo = { t: 0, gx: START.x, gy: START.y, press: false, cycle: 0, resetT: -1 };
  function stepDemo(dt) {
    demo.t += dt;
    runClock += dt;
    if (nextIdx === undefined) initGame();
    if (finished) {
      demo.press = false;
      if (demo.resetT < 0) demo.resetT = 0.9;
      demo.resetT -= dt;
      if (demo.resetT <= 0) {
        initGame(); demo.gx = START.x; demo.gy = START.y; demo.cycle++; demo.resetT = -1;
      }
      return;
    }
    var goodRun = demo.cycle % 2 === 0;
    var targetPt = (nextIdx < GATES.length) ? GATES[nextIdx] : START;
    if (!goodRun && nextIdx === 1) targetPt = TRAPS[0]; // 危険デモ: 罠に触れる例
    demo.press = true;
    demo.gx += (targetPt.x - demo.gx) * Math.min(1, dt * 5);
    demo.gy += (targetPt.y - demo.gy) * Math.min(1, dt * 5);
    dragging = true;
    moveOrb(demo.gx, demo.gy);
  }

  function fieldBg() {
    game.draw.gradient(0, H, [[0, C.bgTop], [1, C.bgBot]]);
    for (var i = 0; i < 10; i++) game.draw.rect(0, H * 0.10 + i * 70, W, 1, C.grid);
    for (var j = 0; j < 8; j++) game.draw.rect(j * 154, H * 0.10, 1, H * 0.66, C.grid);
  }

  function drawTraps() {
    var flash = Math.floor(game.time.elapsed * 5) % 2 === 0;
    for (var i = 0; i < TRAPS.length; i++) {
      game.draw.circle(TRAPS[i].x, TRAPS[i].y, TRAP_R, C.trap, flash ? 0.55 : 0.35);
      game.draw.circle(TRAPS[i].x, TRAPS[i].y, TRAP_R * 0.5, C.trap, 0.8);
    }
  }

  function drawGates() {
    for (var i = 0; i < GATES.length; i++) {
      var g = GATES[i];
      var passed = i < nextIdx;
      var col = passed ? C.gateDone : C.gate;
      if (g.shutter) {
        var sh = shutterInfo(runClock);
        if (!passed) {
          col = sh.closed ? C.gateShut : (sh.warn ? (Math.floor(game.time.elapsed * 10) % 2 === 0 ? C.trap : C.gate) : C.gate);
        }
      }
      game.draw.circle(g.x, g.y, GATE_R, col, passed ? 0.35 : 0.85);
      game.draw.circle(g.x, g.y, GATE_R - 14, C.bgTop, 0.4);
      txt(String(i + 1), g.x, g.y + 12, 30, passed ? '#0a2a12' : C.white);
    }
  }

  function drawOrb() {
    game.draw.circle(orbX, orbY + 6, 16, '#00000040');
    game.draw.sprite(ORB_SPRITE, { '#': C.orb }, orbX, orbY, 12, { anchor: 'center' });
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      fieldBg();
      stepDemo(dt);
      drawTraps();
      drawGates();
      drawOrb();
      game.draw.hand(demo.gx + Math.cos(game.time.elapsed * 2.5) * 14, demo.gy + Math.sin(game.time.elapsed * 2.5) * 14, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + game.best, W / 2, H * 0.115, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 38, C.gold);
      } else {
        txt('TAP TO START', W / 2, H * 0.95, 30, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      fieldBg(); drawTraps(); drawGates(); drawOrb();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(nextIdx + ' / ' + GATES.length, W / 2, H * 0.13, 32, C.white);
      txt('BEST ' + Math.max(game.best, nextIdx), W / 2, H * 0.17, 26, C.gold);
      if (!ok && nextIdx >= GATES.length - 1) txt('あと1ゲート!', W / 2, H * 0.21, 26, C.white);
      if (nextIdx > game.best && game.best > 0) txt('NEW RECORD', W / 2, H * 0.24, 30, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { gates: nextIdx, total: GATES.length };
        if (ok) game.end.success(nextIdx, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (finished) {
      finish();
    } else {
      runClock += dt;
      timeLeft -= dt;
      if (timeLeft <= 0) { timeLeft = 0; fail('TIME UP'); }
    }
    if (shake > 0) shake -= dt;

    fieldBg();
    drawTraps();
    drawGates();
    drawOrb();

    txt(nextIdx + ' / ' + GATES.length, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 60, W - 120, 14, '#00000055');
    game.draw.rect(60, 60, (W - 120) * Math.max(0, timeLeft / MAX_TIME), 14, timeLeft < 4 ? C.trap : C.good);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['A4', 0.2], ['C5', 0.2], ['E5', 0.2], ['C5', 0.2],
      ['A4', 0.2], ['G4', 0.2],
    ], { tempo: 168, wave: 'square', volume: 0.06, loop: true, bass: [['A2', 1], ['E2', 1]] });
    state = S.ATTRACT;
    runClock = 0;
    initGame();
  });
})(game);

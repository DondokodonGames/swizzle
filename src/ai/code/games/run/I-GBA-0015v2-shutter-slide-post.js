// I-GBA-0015v2-shutter-slide-post.js
// 閉店シャッター滑り込み便 — 走り続ける配達人が、下りかけのシャッターを見定めて滑り込みで次々くぐる
// 操作: 配達人は自動で走る。タップするとスライディング(低い姿勢+少し加速)。下りてくるシャッターの隙間が背丈より低くなる所で滑り込む
// 終わり: 10枚のシャッターをくぐって届け先に着けば成功。シャッターにぶつかる/時間切れで失敗
// @mechanic: camera_run
// @theme: closing_arcade_shutter_courier
// 世界観: 閉店時刻の下町商店街で、忘れ物の小包を届ける郵便配達人が、区画ごとに下りていくアーケードのシャッターを滑り込みでくぐり抜けて通りの奥の家を目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + くぐった枚数とギリギリ通過のコンボ
// スタイル: 90s HANDHELD COLOR

(function(game) {
  var STYLE = { bg: ['#d8c8a0', '#b8a47c', '#6f6452'], main: ['#3e5a6e', '#f0e6c8'], accent: ['#e0663a', '#e8c040'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  var GAME_TITLE = 'SHUTTER RUN';
  var TIME_LIMIT = 20;
  var NEEDED = 10;
  var GY = H * 0.64;
  var PX = W * 0.28;
  var TOP_OPEN = 300;
  var STAND = 190;
  var CROUCH = 82;
  var SLIDE_T = 0.65;
  var COOL_T = 0.15;
  var TRIG = 900;
  var PATTERN = [1, 0, 1, 1, 2, 0, 1, 2, 1, 2];
  var HIT_H = [205, 120, 70];

  var PHASE = { ATTRACT: 1, PLAYING: 2, RESULT: 3 };
  var phase = PHASE.ATTRACT;

  var runner = { dist: 0, v: 520, slide: 0, cool: 0, legs: 0 };
  var gates = [];
  var passed = 0, combo = 0, bestCombo = 0, clock = TIME_LIMIT, intro = 0, freezeT = 0, wrapT = 0;
  var active = false, success = false, crashGate = null;

  var POST_A = [
    '..bbbb..',
    '.bbbbbb.',
    '..ssss..',
    '..s.s...',
    '..ssss..',
    '.nnnnnL.',
    'n.nnnLLL',
    '..nnnLLL',
    '..n..n..',
    '.n....n.',
  ];
  var POST_B = [
    '..bbbb..',
    '.bbbbbb.',
    '..ssss..',
    '..s.s...',
    '..ssss..',
    '.nnnnnL.',
    '.nnnnLLL',
    'n.nnnLLL',
    '...nn...',
    '...n.n..',
  ];
  var POST_SLIDE = [
    '........bbbb',
    '.......bbbbb',
    '..LLL...ssss',
    '.LLLLnnnnss.',
    'nnnnnnnnnn..',
    'n........nn.',
  ];
  var POST_PAL = { 'b': '#3e5a6e', 's': '#f0c8a0', 'n': '#3e5a6e', 'L': '#e0663a' };
  var HOUSE = ['...##...', '..####..', '.######.', '########', '.#wwww#.', '.#w##w#.', '.#w##w#.', '.######.'];
  var LANTERN = ['.rr.', 'rrrr', 'rrrr', '.rr.'];

  function label(str, x, y, size, color) {
    game.draw.text(str, x + 3, y + 3, { size: size, color: '#2c2820', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function buildStreet() {
    gates = [];
    var x = 1100;
    for (var i = 0; i < NEEDED; i++) {
      gates.push({ x: x, h: TOP_OPEN, st: 'idle', t: 0, vs: 0, kind: PATTERN[i], done: false });
      x += PATTERN[i + 1] === 2 ? game.random(760, 860) : game.random(680, 800);
    }
  }

  function resetRunner() {
    runner.dist = 0; runner.v = 520; runner.slide = 0; runner.cool = 0; runner.legs = 0;
    passed = 0; combo = 0; bestCombo = 0; crashGate = null;
    buildStreet();
  }

  function newGame() {
    resetRunner();
    clock = TIME_LIMIT; intro = 0.8; freezeT = 0; wrapT = 0;
    active = false; success = false;
  }

  function curSpeed() { return runner.v * (runner.slide > 0 ? 1.3 : 1); }
  function postureH() { return runner.slide > 0 ? CROUCH : STAND; }

  function startSlide(live) {
    if (runner.slide > 0 || runner.cool > 0) return false;
    runner.slide = SLIDE_T;
    if (live) {
      game.audio.play('se_jump', 0.35);
      game.fx.burst(PX - 40, GY - 10, { color: STYLE.bg[1], count: 8, speed: 180 });
    }
    return true;
  }

  function nextGate() {
    for (var i = 0; i < gates.length; i++) if (!gates[i].done) return gates[i];
    return null;
  }

  // 実ロジック: 走る→シャッターを起動→くぐれたか判定。戻り値 'crash' | 'pass' | 'goal' | null
  function advance(dt, live) {
    if (runner.slide > 0) { runner.slide -= dt; if (runner.slide <= 0) runner.cool = COOL_T; }
    else if (runner.cool > 0) runner.cool -= dt;
    var prev = runner.dist;
    runner.dist += curSpeed() * dt;
    runner.legs += dt * (runner.slide > 0 ? 0 : 9);
    var out = null;
    for (var i = 0; i < gates.length; i++) {
      var g = gates[i];
      if (g.done) continue;
      var ahead = g.x - runner.dist;
      if (g.st === 'idle' && ahead <= TRIG) {
        g.st = 'warn'; g.t = 0.6;
        if (live) game.audio.tone('E5', 0.12, { wave: 'square', volume: 0.07 });
      } else if (g.st === 'warn') {
        g.t -= dt;
        if (g.t <= 0) {
          g.st = 'down';
          var tArr = Math.max(0.3, (g.x - runner.dist) / runner.v);
          g.vs = (TOP_OPEN - HIT_H[g.kind]) / tArr;
          if (live) game.audio.tone('C3', 0.35, { wave: 'sawtooth', volume: 0.05, slide: -60 });
        }
      } else if (g.st === 'down') {
        g.h = Math.max(0, g.h - g.vs * dt);
      }
      if (prev < g.x && runner.dist >= g.x) {
        g.done = true;
        if (g.h < postureH()) { crashGate = g; runner.dist = g.x - 40; return 'crash'; }
        passed++;
        var tight = g.h - postureH() < 60;
        combo = tight ? combo + 1 : 0;
        if (combo > bestCombo) bestCombo = combo;
        runner.v += 14;
        out = passed >= NEEDED ? 'goal' : 'pass';
        if (live) {
          game.feedback.good(PX + 40, GY - 260, { text: tight ? 'NICE' : 'GOOD', color: tight ? STYLE.accent[1] : STYLE.main[1], count: tight ? 14 : 8, size: tight ? 44 : 34 });
          if (combo >= 2) game.fx.popup('x' + combo, PX + 40, GY - 330, { color: STYLE.accent[0], size: 40 });
          if (passed === 5) { game.fx.popup('5 / ' + NEEDED, W / 2, H * 0.28, { color: STYLE.accent[0], size: 50 }); game.audio.play('se_milestone', 0.45); }
        }
      }
    }
    return out;
  }

  function endRun(win) {
    active = false; success = win; freezeT = win ? 0.4 : 0.55;
    game.audio.stopBgm();
    if (win) {
      game.feedback.good(W * 0.7, GY - 200, { text: 'CLEAR', color: STYLE.accent[1], count: 28 });
      game.audio.play('se_success', 0.5);
    } else {
      game.feedback.bad(PX, GY - 120, { text: crashGate ? 'MISS' : 'TIME UP', shake: 16 });
      game.audio.play('se_failure', 0.45);
    }
  }

  game.onTap(function(x, y) {
    if (phase === PHASE.ATTRACT) { game.audio.play('se_coin', 0.5); phase = PHASE.PLAYING; newGame(); return; }
    if (phase === PHASE.RESULT) { phase = PHASE.ATTRACT; newGame(); demo.t = 0; return; }
    if (!active) return;
    if (!startSlide(true)) {
      game.audio.play('se_tap', 0.12);
      game.fx.popup('·', PX, GY - 220, { color: STYLE.main[0], size: 26 });
    }
  });

  // ── ATTRACT ゴースト実演: advance() を実際に回し、到着時の隙間が背丈より低くなる直前でタップ。偶数周の3枚目は滑り遅れて激突 ──
  var demo = { t: 0, gx: W * 0.5, gy: H * 0.84, press: 0, sloppy: false, crashShow: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7;
    if (cyc < dt || demo.t <= dt) {
      resetRunner();
      demo.sloppy = Math.floor(demo.t / 7) % 2 === 1;
      demo.crashShow = 0;
    }
    if (demo.press > 0) demo.press -= dt;
    if (demo.crashShow > 0) {
      demo.crashShow -= dt;
      if (demo.crashShow <= 0) resetRunner();
      return;
    }
    var g = nextGate();
    if (g && g.st === 'down') {
      var tArr = (g.x - runner.dist) / curSpeed();
      var hArr = g.h - g.vs * tArr;
      var skip = demo.sloppy && passed === 2;
      if (!skip && hArr < STAND && tArr < 0.42 && startSlide(false)) demo.press = 0.25;
    }
    var r = advance(dt, false);
    if (r === 'crash') demo.crashShow = 0.9;
    if (r === 'goal') resetRunner();
  }

  // ── 描画 ──
  function drawStreet() {
    var t = game.time.elapsed;
    var cam = runner.dist;
    game.draw.gradient(0, H, [[0, '#f0b070'], [0.28, '#e8c890'], [0.66, STYLE.bg[0]], [1, STYLE.bg[2]]]);
    // 遠景の屋根並み(パララックス 0.3)
    for (var i = 0; i < 8; i++) {
      var rx = ((i * 190 - cam * 0.3) % 1520 + 1520) % 1520 - 220;
      game.draw.rect(rx, H * 0.24, 160, 90, '#b8a47c', 1);
      game.draw.rect(rx - 10, H * 0.24 - 20, 180, 24, '#6f6452', 1);
    }
    // アーケードの天井
    game.draw.rect(0, GY - 470, W, 44, STYLE.main[0], 1);
    for (var k = 0; k < 12; k++) {
      var ax = ((k * 120 - cam) % 1440 + 1440) % 1440 - 180;
      game.draw.rect(ax, GY - 470, 10, 44, '#2c3e4c', 1);
      var sway = Math.sin(t * 2 + k) * 4;
      game.draw.sprite(LANTERN, { 'r': k % 2 ? STYLE.accent[0] : STYLE.accent[1] }, ax + 60 + sway, GY - 400, 10, { anchor: 'center' });
    }
    // 店先(近景)
    for (var s = 0; s < 6; s++) {
      var fx = ((s * 300 - cam) % 1800 + 1800) % 1800 - 300;
      game.draw.rect(fx, GY - 420, 280, 420, s % 2 ? '#c8b48c' : '#bca880', 1);
      game.draw.rect(fx + 20, GY - 400, 240, 60, s % 3 === 0 ? STYLE.accent[0] : STYLE.main[0], 0.85);
      game.draw.rect(fx + 30, GY - 300, 220, 250, '#8c7c60', 0.55);
      for (var ln = 0; ln < 8; ln++) game.draw.rect(fx + 30, GY - 290 + ln * 30, 220, 4, '#6f6452', 0.5);
    }
    // 路面
    game.draw.rect(0, GY, W, H * 0.10, '#9c8c6c', 1);
    for (var tl = 0; tl < 10; tl++) {
      var tx = ((tl * 140 - cam) % 1400 + 1400) % 1400 - 140;
      game.draw.rect(tx, GY + 4, 6, H * 0.10, '#7c6c50', 1);
    }
    // 届け先の家(最後のシャッターの先)
    var last = gates.length ? gates[gates.length - 1].x : 0;
    var hx = PX + (last + 420 - cam);
    if (hx < W + 200) game.draw.sprite(HOUSE, { '#': '#a05a3a', 'w': '#f0e6c8' }, hx, GY - 120, 30, { anchor: 'center' });
  }

  function drawGates(highlight) {
    var cam = runner.dist;
    for (var i = 0; i < gates.length; i++) {
      var g = gates[i];
      var sx = PX + (g.x - cam);
      if (sx < -120 || sx > W + 120) continue;
      var top = GY - 426, bottom = GY - g.h;
      var hot = highlight && g === crashGate;
      game.draw.rect(sx - 70, top, 140, bottom - top, hot ? '#ffffff' : '#8a9aa6', 1);
      for (var y = top + 14; y < bottom; y += 18) game.draw.rect(sx - 70, y, 140, 5, hot ? '#e0e0e0' : '#5f6f7a', 1);
      game.draw.rect(sx - 76, bottom - 12, 152, 14, '#3e4a54', 1);
      game.draw.rect(sx - 80, top - 10, 12, 436, '#3e4a54', 1);
      game.draw.rect(sx + 68, top - 10, 12, 436, '#3e4a54', 1);
      // 回転灯(予告)
      var lit = g.st === 'warn' ? Math.floor(game.time.elapsed * 14) % 2 === 0 : g.st === 'down' && !g.done;
      game.draw.circle(sx, top - 26, 22, lit ? STYLE.accent[1] : '#6f6452', 1);
      if (lit) game.draw.circle(sx, top - 26, 48, STYLE.accent[1], 0.35);
      // 背丈の目安(しゃがみ高さの線)
      if (!g.done && g.st !== 'idle') game.draw.rect(sx - 70, GY - STAND, 140, 4, STYLE.accent[0], 0.5);
    }
  }

  function drawRunner(highlight) {
    game.draw.rect(PX - 50, GY - 8, 100, 12, '#000000', 0.2);
    if (highlight) game.draw.circle(PX, GY - 90, 120, '#ffffff', 0.5);
    if (runner.slide > 0) {
      game.draw.sprite(POST_SLIDE, POST_PAL, PX, GY - 38, 14, { anchor: 'center' });
      game.draw.rect(PX - 110, GY - 14, 60, 8, STYLE.bg[1], 0.8);
    } else {
      var fr = Math.floor(runner.legs) % 2 === 0 ? POST_A : POST_B;
      var bob = Math.abs(Math.sin(runner.legs * 1.6)) * 8;
      game.draw.sprite(fr, POST_PAL, PX, GY - 96 - bob, 19, { anchor: 'center' });
    }
  }

  function drawPad(pressing) {
    var y = H * 0.84;
    game.draw.rect(120, y - 90, W - 240, 180, STYLE.main[0], pressing ? 0.95 : 0.7);
    game.draw.rect(130, y - 80, W - 260, 160, pressing ? '#5a7a90' : '#4a687c', 1);
    game.draw.sprite(POST_SLIDE, { 'b': STYLE.main[1], 's': STYLE.main[1], 'n': STYLE.main[1], 'L': STYLE.accent[0] }, W / 2, y + (pressing ? 8 : 0), 13, { anchor: 'center' });
    for (var a = 0; a < 3; a++) game.draw.rect(W / 2 - 200 - a * 40, y + 30, 26, 6, STYLE.main[1], 0.5 - a * 0.12);
  }

  function drawHud() {
    label(passed + ' / ' + NEEDED, W / 2, 96, 48, STYLE.main[0]);
    var bw = W - 160;
    game.draw.rect(80, 140, bw, 16, '#6f6452', 1);
    game.draw.rect(80, 140, bw * Math.min(1, passed / NEEDED), 16, STYLE.accent[0], 1);
    var low = clock < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 176, bw, 10, '#6f6452', 1);
    game.draw.rect(80, 176, bw * Math.max(0, clock / TIME_LIMIT), 10, low ? '#c03030' : STYLE.main[0], 1);
    if (combo >= 2) label('COMBO ' + combo, W - 170, 96, 30, STYLE.accent[0]);
  }

  game.onUpdate(function(dt) {
    if (phase === PHASE.ATTRACT) {
      stepDemo(dt);
      drawStreet();
      drawGates(demo.crashShow > 0);
      drawRunner(demo.crashShow > 0);
      drawPad(demo.press > 0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 15 });
      var sway = Math.sin(game.time.elapsed * 1.7) * 8;
      label(GAME_TITLE, W / 2 + sway, H * 0.08, 62, STYLE.accent[0]);
      label('HI-SCORE ' + Math.round(game.best || 0), W / 2, H * 0.13, 30, STYLE.main[0]);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.955, 38, STYLE.accent[0]);
      else label('INSERT COIN', W / 2, H * 0.955, 30, STYLE.main[0]);
      return;
    }

    if (phase === PHASE.RESULT) {
      drawStreet();
      drawGates(!success);
      drawRunner(false);
      label(success ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 66, success ? STYLE.accent[0] : '#c03030');
      label(passed + ' / ' + NEEDED, W / 2, H * 0.14, 40, STYLE.main[0]);
      label('COMBO ' + bestCombo, W / 2, H * 0.18, 30, STYLE.accent[0]);
      if (!success) label('あと' + (NEEDED - passed) + '枚!', W / 2, H * 0.215, 32, STYLE.main[0]);
      else label('SCORE ' + (passed * 100 + bestCombo * 50 + Math.round(clock * 10)), W / 2, H * 0.215, 32, STYLE.main[0]);
      label('BEST ' + Math.round(game.best || 0), W / 2, H * 0.25, 26, STYLE.main[0]);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.955, 30, STYLE.main[0]);
      return;
    }

    // ── PLAYING ──
    if (wrapT > 0) {
      wrapT -= dt;
      if (wrapT <= 0) {
        phase = PHASE.RESULT;
        var stats = { passed: passed, combo: bestCombo };
        if (success) game.end.success(passed * 100 + bestCombo * 50 + Math.round(clock * 10), stats);
        else game.end.failure(stats);
      }
    } else if (freezeT > 0) {
      freezeT -= dt;
      if (freezeT <= 0) wrapT = 1.0;
    } else if (intro > 0) {
      intro -= dt;
      if (intro <= 0) { active = true; game.audio.play('se_tap', 0.35); }
    } else if (active) {
      clock -= dt;
      var r = advance(dt, true);
      if (r === 'crash') endRun(false);
      else if (r === 'goal') endRun(true);
      else if (clock <= 0) { clock = 0; endRun(false); }
    }

    drawStreet();
    drawGates(freezeT > 0 && !success);
    drawRunner(freezeT > 0 && !success);
    drawPad(runner.slide > 0);
    drawHud();
    if (intro > 0) label(intro > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.40, 84, STYLE.accent[0]);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.25], ['G4', 0.25], ['A4', 0.25], ['B4', 0.25], ['D5', 0.5], ['B4', 0.5], ['A4', 0.25], ['G4', 0.25], ['E4', 0.5], ['D4', 1]], { tempo: 150, wave: 'square', volume: 0.045, loop: true, bass: true });
    phase = PHASE.ATTRACT;
    newGame();
  });
})(game);

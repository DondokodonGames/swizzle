// I-GBA-0040v2-station-timetable-drop.js
// 時刻札ぴったり — 左右に行き来する掲示枠の光る空き枠が真下に来る瞬間を読んで札を落とし、ぴったり貼り付ける
// 操作: 画面のどこかをタップすると上に構えた時刻札が真下へ落ちる。落ちるまでの間も枠は動くので少し早めに落とす。光っている空き枠に合わせる
// 終わり: 3枚の掲示枠(札2→2→3枚)を16秒以内に埋めればCLEAR。枠を外して札を3回落とす/時間切れでGAME OVER
// @mechanic: drop_timing
// @theme: old_station_ticket_gate_timetable
// 世界観: 古い駅舎の改札前で、駅員がレールの上を行き来する掲示枠に合わせて時刻表の札を落とし、発車前の掲示をぴったり貼り揃える
// 残るもの: 正誤(CLEAR/GAME OVER) + 貼れた札の数・PERFECT数・最小ずれpxのスコア
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 画面を横ストリップに分け、奥ほど横方向を圧縮した床の市松。地平線から上は空(壁)のグラデ
  var STYLE = { bg: ['#2a3a4a', '#5a6a6a'], main: ['#c8b890', '#7a5a3a', '#f0e8d0'], accent: ['#e8b030', '#d84a3a'] };
  var R = {
    wall: STYLE.bg[0], wall2: STYLE.bg[1], tileA: '#a89870', tileB: '#706248', board: STYLE.main[1], boardHi: '#9a7a52', plate: STYLE.main[2],
    cream: STYLE.main[0], gold: STYLE.accent[0], red: STYLE.accent[1], ink: '#141a20', rail: '#3a3a3a', ok: '#6ad07a',
  };

  var GAME_TITLE = 'JIKOKU DROP';
  var TIME_LIMIT = 16;
  var BOARDS = [
    { slots: [-130, 130], move: 'tri', freq: 0.42, pause: false },
    { slots: [-130, 130], move: 'sin', freq: 0.5, pause: false },
    { slots: [-200, 0, 200], move: 'tri', freq: 0.5, pause: true },
  ];
  var NEEDED = 7;
  var MISS_MAX = 3;
  var CX = 540, AMP = 240;
  var HOLD_Y = Math.round(H * 0.27), BOARD_Y = Math.round(H * 0.5), HORIZON = Math.round(H * 0.64);
  var GRAV = 6200;
  var PERFECT_PX = 14, GOOD_PX = 46;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var bi, cfg, board, plate, filled, stuck, perfects, misses, combo, maxCombo, bestPx, score;
  var timeLeft, readyT, boardT, stopT, stopObj, fin, cleared, postT, warnT, armT, sadT, cheerT, playT, finalScore, refill, fallers;

  // 駅員(制帽・詰襟)
  var CLERK_A = ['..nnnnnn..', '.nnnggnnn.', '..kkkkkk..', '..ffffff..', '..fkffkf..', '...ffff...', '.nnnnnnnn.', 'nnnngnnnnn', 'nn.ngnn.nn', '..nn..nn..'];
  var CLERK_B = ['..nnnnnn..', '.nnnggnnn.', '..kkkkkk..', '..ffffff..', '..fkffkf..', '...ffff...', '.nnnnnnnn.', 'nnnngnnnnn', 'nn.ngnn.nn', '.nn....nn.'];
  var CLERK_UP = ['..nnnnnn.f', '.nnnggnnnf', '..kkkkkkn.', '..ffffffn.', '..fkffkf..', '...ffff...', '.nnnnnnnn.', 'nnnngnnnn.', 'nn.ngnn.n.', '..nn..nn..'];
  var CLERK_SAD = ['..nnnnnn..', '.nnnggnnn.', '..kkkkkk..', '..ffffff..', '..fkffkf..', '...fkkf...', '.nnnnnnnn.', 'fnnngnnnnf', '.n.ngnn.n.', '..nn..nn..'];
  var CLERK_JOY = ['f.nnnnnn.f', 'fnnnggnnnf', '.nkkkkkkn.', '..ffffff..', '..fkffkf..', '...fkkf...', '.nnnnnnnn.', '.nnngnnnn.', '..nngnnn..', '..nn..nn..'];
  var CLERK_PAL = { n: '#2a3a5a', g: '#e8b030', k: '#141a20', f: '#ecc8a0' };
  var GLOVE = ['.ww.ww.', 'wwwwwww', 'wwwwwww', '.wwwww.'];

  function out(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: R.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function tri(p) { var f = p - Math.floor(p); return 1 - 4 * Math.abs(f - 0.5); }

  function boardXAt(ph) { return cfg.move === 'sin' ? CX + AMP * Math.sin(ph * Math.PI * 2) : CX + AMP * tri(ph); }

  function setupBoard(i) {
    cfg = BOARDS[i];
    board = { ph: game.random(0, 1), x: CX, slots: [], pauseCD: 1.2, pauseT: 0, slideIn: 0.4 };
    for (var k = 0; k < cfg.slots.length; k++) board.slots.push({ off: cfg.slots[k], plate: null });
    board.x = boardXAt(board.ph);
    plate = { y: HOLD_Y, vy: 0, falling: false };
    refill = 0;
  }

  function initGame() {
    bi = 0; filled = 0; stuck = 0; perfects = 0; misses = 0; combo = 0; maxCombo = 0; bestPx = 999; score = 0;
    timeLeft = TIME_LIMIT; readyT = 0.8; boardT = 0; stopT = 0; stopObj = null; fin = false; cleared = false;
    postT = 0; warnT = 0; armT = 0; sadT = 0; cheerT = 0; playT = 0; finalScore = 0; fallers = [];
    setupBoard(0);
  }

  function nextSlot() { for (var i = 0; i < board.slots.length; i++) if (!board.slots[i].plate) return board.slots[i]; return null; }

  function stepBoard(dt) {
    if (board.slideIn > 0) board.slideIn -= dt;
    if (cfg.pause) {
      if (board.pauseT > 0) board.pauseT -= dt;
      else {
        board.ph += cfg.freq * dt;
        board.pauseCD -= dt;
        if (board.pauseCD <= 0) { board.pauseCD = game.random(1.1, 1.8); board.pauseT = 0.35; game.audio.tone('C5', 0.04, { wave: 'square', volume: 0.04 }); }
      }
    } else board.ph += cfg.freq * dt;
    board.x = boardXAt(board.ph);
    for (var f = fallers.length - 1; f >= 0; f--) {
      var q = fallers[f];
      q.vy += GRAV * 0.5 * dt; q.y += q.vy * dt; q.x += q.vx * dt; q.rot += q.vr * dt;
      if (q.y > H + 200) fallers.splice(f, 1);
    }
    if (armT > 0) armT -= dt;
    if (sadT > 0) sadT -= dt;
    if (cheerT > 0) cheerT -= dt;
  }

  // 札を落とす(本番・デモ共通)
  function drop() {
    if (plate.falling || refill > 0) { game.audio.tone('E4', 0.04, { wave: 'triangle', volume: 0.04 }); return; }
    plate.falling = true; plate.vy = 0; armT = 0.25;
    game.audio.play('se_jump', 0.25);
  }

  function stepPlate(dt) {
    if (refill > 0) { refill -= dt; return; }
    if (!plate.falling) return;
    plate.vy += GRAV * dt; plate.y += plate.vy * dt;
    if (plate.y >= BOARD_Y) land();
  }

  function land() {
    var s = nextSlot();
    plate.falling = false; plate.y = HOLD_Y; refill = 0.28;
    if (!s) return;
    var sx = board.x + s.off, dx = CX - sx, ad = Math.abs(dx);
    if (ad <= GOOD_PX) {
      s.plate = { dx: dx, flash: 0.3 };
      filled++;
      var perfect = ad <= PERFECT_PX;
      if (perfect) perfects++;
      if (ad < bestPx) bestPx = Math.round(ad);
      combo++;
      if (combo > maxCombo) maxCombo = combo;
      var pts = (perfect ? 300 : 150) * Math.min(3, combo);
      score += pts;
      game.feedback.good(CX, BOARD_Y - 40, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? R.gold : R.ok, size: 60 });
      game.fx.popup(Math.round(ad) + 'px', CX + 160, BOARD_Y - 150, { color: R.plate, size: 40 });
      if (!nextSlot()) {
        boardT = 0.85; cheerT = 0.85;
        game.audio.play('se_milestone', 0.45);
        game.fx.popup('NICE', W / 2, H * 0.36, { color: R.gold, size: 92 });
      }
      return;
    }
    misses++; combo = 0; sadT = 0.8;
    fallers.push({ x: CX, y: BOARD_Y, vx: dx > 0 ? 260 : -260, vy: -300, rot: 0, vr: dx > 0 ? 5 : -5 });
    game.audio.play('se_break', 0.3);
    if (mode === S.PLAYING && misses >= MISS_MAX) {
      stopT = 0.45; stopObj = { kind: 'miss', x: CX, y: BOARD_Y, dx: dx };
      game.fx.flash('#ffffff', 0.12);
      return;
    }
    game.feedback.bad(CX, BOARD_Y - 40, { text: 'MISS', color: R.red, size: 58 });
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = score + (win ? Math.ceil(timeLeft) * 40 : 0);
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 6; i++) game.fx.burst(160 + i * 150, H * 0.4 + (i % 2) * 200, { color: i % 2 ? R.gold : R.plate, count: 18, speed: 520 });
      game.fx.flash(R.gold, 0.2);
    }
  }

  function resolveStop() {
    if (!stopObj) return;
    var o = stopObj;
    stopObj = null;
    if (o.kind === 'win') { ending(true); return; }
    game.feedback.bad(o.x, o.y - 40, { text: o.kind === 'time' ? 'TIME UP' : 'MISS', color: R.red, size: 60 });
    ending(false);
  }

  // ---- 入力 ----
  function canPlay() { return mode === S.PLAYING && !fin && stopT <= 0 && readyT <= 0 && boardT <= 0; }

  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { mode = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (!canPlay()) { game.audio.play('se_tap', 0.05); return; }
    drop();
  });

  // ---- 描画 ----
  function concourse(t) {
    game.draw.gradient(0, HORIZON, [[0, '#1a2632'], [0.5, R.wall], [1, R.wall2]]);
    // 壁のタイルと大時計
    for (var ty = 240; ty < HORIZON - 40; ty += 60) game.draw.rect(0, ty, W, 3, R.ink, 0.25);
    game.draw.circle(860, 330, 80, R.ink);
    game.draw.circle(860, 330, 70, R.plate);
    var ha = t * 0.5, ma = t * 3;
    game.draw.line(860, 330, 860 + Math.cos(ha) * 36, 330 + Math.sin(ha) * 36, R.ink, 8);
    game.draw.line(860, 330, 860 + Math.cos(ma) * 56, 330 + Math.sin(ma) * 56, R.ink, 4);
    // 窓口のアーチ
    for (var a = 0; a < 3; a++) { game.draw.rect(60 + a * 210, 260, 150, 200, '#3a4a5a'); game.draw.rect(70 + a * 210, 270, 130, 120, '#c8b890', 0.25 + Math.sin(t * 2 + a) * 0.05); }
    // レール
    game.draw.rect(40, BOARD_Y - 100, W - 80, 14, R.rail);
    game.draw.rect(40, BOARD_Y + 114, W - 80, 14, R.rail);
    // 床(奥ほど横に圧縮した市松)
    var D = 260, TILE = 120;
    for (var y = HORIZON; y < H; y += 8) {
      var sc = (y - HORIZON + 30) / D;
      var tw = TILE * sc;
      var zrow = Math.floor((D * 6) / (y - HORIZON + 30));
      if (tw < 24) { game.draw.rect(0, y, W, 8, R.tileB); continue; }
      var start = CX - Math.ceil(CX / tw + 1) * tw;
      for (var x = start, k = 0; x < W; x += tw, k++) game.draw.rect(x, y, tw + 1, 8, (k + zrow) % 2 ? R.tileA : R.tileB);
    }
    game.draw.gradient(HORIZON, HORIZON + 120, [[0, '#00000088'], [1, '#00000000']]);
    // 改札(遠景の影)
    for (var g = 0; g < 5; g++) { game.draw.rect(130 + g * 200, HORIZON + 30, 60, 90, '#4a4a4a'); game.draw.rect(130 + g * 200, HORIZON + 30, 60, 12, R.gold, 0.6); }
  }

  function drawBoard(t) {
    var off = board.slideIn > 0 ? board.slideIn * 1800 : 0;
    var bx = board.x + off, bw = 660, top = BOARD_Y - 90, h = 200;
    game.draw.rect(bx - bw / 2 + 14, top + 16, bw, h, R.ink, 0.4);
    game.draw.rect(bx - bw / 2, top, bw, h, R.board);
    game.draw.rect(bx - bw / 2 + 12, top + 12, bw - 24, h - 24, '#5a4028');
    game.draw.rect(bx - bw / 2, top, bw, 10, R.boardHi);
    game.draw.circle(bx - bw / 2 + 30, top - 10, 14, R.rail);
    game.draw.circle(bx + bw / 2 - 30, top - 10, 14, R.rail);
    var nx = nextSlot();
    for (var i = 0; i < board.slots.length; i++) {
      var s = board.slots[i], sx = bx + s.off;
      if (s.plate) {
        var wf = s.plate.flash > 0 && Math.floor(s.plate.flash * 20) % 2 === 0;
        if (s.plate.flash > 0) s.plate.flash -= 1 / 60;
        drawPlate(sx + s.plate.dx, BOARD_Y, wf, 1);
      } else {
        var glow = s === nx;
        var a = glow ? 0.5 + Math.sin(t * 9) * 0.35 : 0.25;
        game.draw.rect(sx - 70, BOARD_Y - 50, 140, 120, glow ? '#ffffff' : R.cream, a * 0.4);
        for (var d = 0; d < 6; d++) {
          game.draw.rect(sx - 70 + d * 24, BOARD_Y - 54, 14, 6, glow ? '#ffffff' : R.cream, glow ? 0.9 : 0.4);
          game.draw.rect(sx - 70 + d * 24, BOARD_Y + 68, 14, 6, glow ? '#ffffff' : R.cream, glow ? 0.9 : 0.4);
        }
        if (glow) { game.draw.rect(sx - 3, BOARD_Y + 80, 6, 30, R.gold); game.draw.rect(sx - 3, BOARD_Y - 90, 6, 30, R.gold); }
      }
    }
  }

  function drawPlate(x, y, white, sc) {
    var w = 120 * sc, h = 104 * sc;
    game.draw.rect(x - w / 2 + 6, y - h / 2 + 8, w, h, R.ink, 0.4);
    game.draw.rect(x - w / 2, y - h / 2, w, h, white ? '#ffffff' : R.plate);
    game.draw.rect(x - w / 2, y - h / 2, w, 16 * sc, white ? '#ffffff' : R.red);
    for (var r = 0; r < 4; r++) {
      game.draw.rect(x - w / 2 + 12 * sc, y - h / 2 + (28 + r * 18) * sc, 26 * sc, 8 * sc, R.ink);
      game.draw.rect(x - w / 2 + 48 * sc, y - h / 2 + (28 + r * 18) * sc, 58 * sc, 8 * sc, R.ink, 0.5);
    }
  }

  function drawHeld(t) {
    // 落下位置の目印(レール上の影)
    game.draw.rect(CX - 60, BOARD_Y + 132, 120, 10, R.ink, 0.6);
    game.draw.line(CX, HOLD_Y + 60, CX, BOARD_Y - 60, '#ffffff', 2);
    if (refill <= 0) {
      drawPlate(CX, plate.y, false, 1);
      if (!plate.falling) game.draw.sprite(GLOVE, { w: '#f4f4f4' }, CX, HOLD_Y - 64 + Math.sin(t * 4) * 3, 10, { anchor: 'center' });
    }
    for (var f = 0; f < fallers.length; f++) drawPlate(fallers[f].x + Math.sin(fallers[f].rot) * 20, fallers[f].y, false, 0.9);
    if (stopObj && stopObj.kind === 'miss' && stopT > 0) {
      var k = 1.3 + (0.45 - stopT);
      game.draw.circle(CX, BOARD_Y, 150, '#ffffff', 0.35);
      drawPlate(CX, BOARD_Y, Math.floor(t * 16) % 2 === 0, k);
    }
  }

  function drawClerk(t) {
    var fr;
    if (sadT > 0) fr = CLERK_SAD;
    else if (cheerT > 0 || (fin && cleared)) fr = CLERK_JOY;
    else if (armT > 0) fr = CLERK_UP;
    else fr = Math.floor(t * 2.5) % 2 ? CLERK_A : CLERK_B;
    var hop = cheerT > 0 ? -Math.abs(Math.sin(t * 14)) * 24 : Math.sin(t * 3) * 3;
    game.draw.rect(140, H * 0.905, 170, 18, R.ink, 0.4);
    game.draw.sprite(fr, CLERK_PAL, 225, H * 0.85 + hop, 18, { anchor: 'center' });
  }

  function drawHud(t) {
    var lowT = timeLeft < 4 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(70, 34, W - 140, 30, R.ink);
    game.draw.rect(76, 40, (W - 152) * Math.max(0, timeLeft / TIME_LIMIT), 18, lowT ? R.red : R.gold);
    out(filled + ' / ' + NEEDED, W / 2, 116, 50, R.plate);
    for (var b = 0; b < BOARDS.length; b++) {
      var done = b < bi || (b === bi && boardT > 0) || (fin && cleared);
      game.draw.rect(90 + b * 70, 154, 50, 40, R.ink);
      game.draw.rect(96 + b * 70, 160, 38, 28, done ? R.plate : (b === bi ? R.boardHi : '#3a3a3a'));
    }
    for (var m = 0; m < MISS_MAX; m++) game.draw.rect(W - 130 - m * 64, 156, 40, 40, m < misses ? R.red : '#3a3a3a');
    out('' + score, W - 240, 116, 34, R.gold);
    for (var p = 0; p < perfects && p < 10; p++) game.draw.circle(W / 2 + 120 + p * 44, H * 0.86, 16, R.gold);
  }

  function drawScene(t) {
    concourse(t);
    drawBoard(t);
    drawHeld(t);
    drawClerk(t);
  }

  function scan() { for (var y = 0; y < H; y += 8) game.draw.rect(0, y, W, 2, R.ink, 0.1); }

  // ---- ATTRACT: 本物の drop()/land() で 落下時間を読んで2枚ぴったり → 3枚目は遅れて枠を外す ----
  var demo = { t: 0, gx: CX, gy: H * 0.72, press: false, k: 0, wait: 0 };
  function fallTime() { return Math.sqrt(2 * (BOARD_Y - HOLD_Y) / GRAV); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.0;
    if (cyc < dt || demo.t <= dt) {
      initGame(); readyT = 0;
      cfg = { slots: [-200, 0, 200], move: 'tri', freq: 0.42, pause: false };
      board = { ph: 0.1, x: CX, slots: [{ off: -200, plate: null }, { off: 200, plate: null }, { off: 0, plate: null }], pauseCD: 9, pauseT: 0, slideIn: 0 };
      board.x = boardXAt(board.ph);
      demo.k = 0; demo.wait = 0.4;
    }
    stepBoard(dt);
    stepPlate(dt);
    demo.press = false;
    if (demo.wait > 0) { demo.wait -= dt; return; }
    var s = nextSlot();
    if (!s || plate.falling || refill > 0 || demo.k >= 3) return;
    // 落ちるまでの移動を先読みして、狙いの枠が真下に来る瞬間に落とす(3枚目はわざと遅れる)
    var lag = demo.k === 2 ? 0.24 : 0;
    var future = boardXAt(board.ph + cfg.freq * (fallTime() - lag)) + s.off;
    var prev = boardXAt(board.ph + cfg.freq * (fallTime() - lag - dt)) + s.off;
    demo.press = Math.abs(future - CX) < 80;
    if ((prev - CX) * (future - CX) <= 0) { drop(); demo.k++; demo.wait = 0.5; }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.gx + Math.sin(t * 2) * 10, demo.gy, { press: demo.press || plate.falling, scale: 14 });
      out(GAME_TITLE, W / 2, H * 0.055 + Math.sin(t * 2) * 5, 88, R.gold);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.098, 38, R.plate);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.955, 48, R.gold);
      else out('TAP TO START', W / 2, H * 0.955, 40, R.plate);
      scan();
      return;
    }

    if (mode === S.RESULT) {
      drawScene(t);
      game.draw.rect(90, H * 0.30, W - 180, 500, R.ink, 0.85);
      out(cleared ? 'CLEAR' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.34, 96, cleared ? R.ok : R.red);
      out('SCORE ' + finalScore, W / 2, H * 0.40, 60, R.plate);
      out(filled + ' / ' + NEEDED + '   ' + (bestPx < 999 ? bestPx + 'px' : '-'), W / 2, H * 0.45, 44, R.gold);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.50, 56, R.gold);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.50, 42, R.plate);
      if (!cleared) out('あと' + (NEEDED - filled) + '枚!', W / 2, H * 0.27, 60, R.gold);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.955, 40, R.plate);
      scan();
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { filled: filled, perfects: perfects, misses: misses, bestPx: bestPx, maxCombo: maxCombo };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) resolveStop();
    } else if (readyT > 0) {
      readyT -= dt;
      stepBoard(dt);
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else if (boardT > 0) {
      boardT -= dt;
      stepBoard(dt);
      if (boardT <= 0) {
        if (bi >= BOARDS.length - 1) {
          stopT = 0.4; stopObj = { kind: 'win' };
          game.audio.play('se_powerup', 0.4);
        } else {
          bi++;
          setupBoard(bi);
          game.audio.play('se_coin', 0.25);
        }
      }
    } else {
      timeLeft -= dt; playT += dt;
      stepBoard(dt);
      stepPlate(dt);
      if (timeLeft < 4) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.06, { wave: 'square', volume: 0.07 }); }
      }
      if (timeLeft <= 0 && stopT <= 0 && !fin) {
        timeLeft = 0;
        stopT = 0.45; stopObj = { kind: 'time', x: CX, y: HOLD_Y };
        game.audio.tone('C4', 0.3, { wave: 'square', volume: 0.1, slide: -120 });
      }
    }

    drawScene(t);
    if (stopObj && stopObj.kind === 'win' && stopT > 0) game.draw.rect(0, BOARD_Y - 100, W, 220, '#ffffff', 0.5 * stopT / 0.4);
    if (!fin && readyT <= 0 && bi === 0 && filled === 0 && playT < 1.5 && !plate.falling) {
      var s0 = nextSlot();
      if (s0 && Math.abs(boardXAt(board.ph + cfg.freq * fallTime()) + s0.off - CX) < 90) game.draw.hand(CX, H * 0.72, { press: true, scale: 12, alpha: 0.5 });
    }
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.37, 120, R.gold);
    scan();
  });

  game.onStart(function() {
    game.audio.melody([
      ['G4', 0.5], ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['F5', 0.5], ['D5', 0.5], ['B4', 1],
      ['C5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['A4', 0.5], ['B4', 0.5], ['C5', 1],
    ], { tempo: 138, wave: 'square', volume: 0.05, loop: true, bass: [['C3', 1], ['G2', 1], ['C3', 1], ['G2', 1], ['F2', 1], ['G2', 1], ['C3', 2]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);

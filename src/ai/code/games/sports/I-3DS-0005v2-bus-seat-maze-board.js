// I-3DS-0005v2-bus-seat-maze-board.js
// 山道バスの迷路板 — カーブのたびに傾く手作りの木の迷路板を左右タップで戻し、細い道を転がる球を奥の受け皿まで運ぶ
// 操作: 画面左半分をタップすると板が左へ一段傾き、右半分で右へ一段傾く(傾きはタップするまで残る)。球は傾いた側へ流れながら奥へ転がる。吊り革が揺れたらバスがカーブに入って板が勝手に傾くので逆へ戻す
// 終わり: 3枚の迷路板を受け皿まで通せばCLEAR。球を3個道から落とす/24秒の時間切れでGAME OVER
// @mechanic: balance
// @theme: mountain_bus_maze_board
// 世界観: 山道を走る路線バスの一番後ろの席で、少年が膝に載せた手作りの木の迷路板を、カーブのたびに傾くのを左右の手で戻しながら、細い道を転がる球を奥の受け皿まで運ぶ
// 残るもの: 正誤(CLEAR/GAME OVER) + 通した枚数・残った球・得点
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体を上面/前面/側面の3明度で。影は落とさず明度差だけで立体を出す
  var STYLE = { bg: ['#6a8ab8', '#c8d8e8', '#3a3040'], main: ['#e8c890', '#b8905a', '#7a5a3a'], accent: ['#e84a5a', '#f8e060'] };
  var C = {
    sky: STYLE.bg[0], haze: STYLE.bg[1], cabin: STYLE.bg[2], top: STYLE.main[0], front: STYLE.main[1], side: STYLE.main[2],
    ball: STYLE.accent[0], gold: STYLE.accent[1], ink: '#1a1620', ok: '#7ad890', seat: '#4a6a9a',
  };

  var GAME_TITLE = 'BUS MAZE';
  var LIVES = 3;
  var TIME_LIMIT = 24;
  var BALL_Y = Math.round(H * 0.64);
  var ROW_H = 74;
  var BALL_R = 28;
  var TAP_TILT = 0.2, LAT = 360;

  // 板ごとの道(行: 横位置px)・道幅・転がる速さ・カーブ(吊り革の揺れで予告)
  var BOARDS = [
    { pts: [[0, 0], [3, 0], [6, -150], [9, -150], [12, 60], [14, 60]], w: 230, v: 2.3, sway: [{ r: 4, d: 1 }, { r: 10, d: -1 }] },
    { pts: [[0, 0], [2, 0], [5, 170], [7, 170], [11, -80], [14, -80], [17, 40]], w: 190, v: 2.7, sway: [{ r: 3, d: -1 }, { r: 8, d: 1 }, { r: 14, d: -1 }] },
    { pts: [[0, 0], [2, 0], [5, -150], [7, -150], [11, 100], [13, 100], [16, -80], [18, -80], [20, 0]], w: 165, v: 3.1, sway: [{ r: 3, d: 1 }, { r: 8, d: -1 }, { r: 12, d: 1 }, { r: 17, d: -1 }] },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var bi, bd, bx, by, tilt, lives, cleared, score, readyT, over, won, outroT, stopT, focus, playT, sways, fallT, clearT, handL, handR, mood, sceneT;

  function initGame() {
    lives = LIVES; cleared = 0; score = 0; readyT = 0.8; over = false; won = false; outroT = 0; stopT = 0; focus = null; playT = 0;
    handL = 0; handR = 0; mood = 0; sceneT = 0;
    startBoard(0);
  }

  function startBoard(i) {
    bi = i; bd = BOARDS[i];
    sways = []; for (var k = 0; k < bd.sway.length; k++) sways.push({ r: bd.sway[k].r, d: bd.sway[k].d, t: -1 });
    by = 0; respawn();
  }
  // 落ちた所の2行手前から再開(板の頭からはやり直さない)
  function respawn() { by = Math.max(0, Math.floor(by) - 2); bx = pathC(by); tilt = 0; fallT = -1; clearT = -1; }
  function boardLen() { return bd.pts[bd.pts.length - 1][0]; }

  function pathC(r) {
    var p = bd.pts;
    if (r <= p[0][0]) return p[0][1];
    for (var i = 1; i < p.length; i++) {
      if (r <= p[i][0]) {
        var k = (r - p[i - 1][0]) / (p[i][0] - p[i - 1][0]);
        k = k * k * (3 - 2 * k);
        return p[i - 1][1] + (p[i][1] - p[i - 1][1]) * k;
      }
    }
    return p[p.length - 1][1];
  }

  function tap(side, demo) {
    tilt += side * TAP_TILT;
    tilt = Math.max(-1, Math.min(1, tilt));
    if (side < 0) handL = 0.2; else handR = 0.2;
    game.audio.tone(side < 0 ? 520 : 620, 0.05, { wave: 'square', volume: 0.06 });
    game.fx.burst(side < 0 ? W * 0.2 : W * 0.8, H * 0.86, { color: C.top, count: 4, speed: 120 });
  }

  // カーブの揺れ: 0.6秒前に吊り革が振れて予告 → 0.8秒間 板が勝手に傾く
  function swayForce(dt) {
    var f = 0;
    for (var i = 0; i < sways.length; i++) {
      var s = sways[i];
      if (s.t < 0 && by >= s.r - 1.4) { s.t = 0; game.audio.tone(300, 0.25, { wave: 'sawtooth', volume: 0.04, slide: -120 }); }
      if (s.t >= 0 && s.t < 1.4) { s.t += dt; if (s.t > 0.6) f += s.d * 0.75; }
    }
    return f;
  }
  function strapLean() {
    var l = 0;
    for (var i = 0; i < sways.length; i++) { var s = sways[i]; if (s.t >= 0 && s.t < 1.4) l += s.d * Math.min(1, s.t / 0.3) * (s.t < 0.6 ? 1 : 0.7); }
    return l;
  }

  // 球の転がり(本番もデモも同じ)。戻り値: 'fall' / 'goal' / null
  function stepBall(dt) {
    if (fallT >= 0 || clearT >= 0) return null;
    tilt += swayForce(dt) * dt;
    tilt = Math.max(-1, Math.min(1, tilt));
    bx += tilt * LAT * dt;
    by += bd.v * dt;
    if (by >= boardLen()) { by = boardLen(); return 'goal'; }
    if (Math.abs(bx - pathC(by)) > bd.w / 2 + 4) return 'fall';
    return null;
  }

  function onFall(demo) {
    fallT = 0;
    focus = { x: 540 + bx, y: BALL_Y };
    stopT = 0.45;
    mood = -1;
    game.feedback.bad(540 + bx, BALL_Y - 60, { text: 'MISS', shake: demo ? 6 : 12 });
    game.audio.play('se_break', 0.35);
    if (!demo) {
      lives--;
      if (lives <= 0) { over = true; won = false; outroT = 1.4; game.audio.stopBgm(); game.audio.play('se_failure', 0.5); }
    }
  }

  function onGoal(demo) {
    clearT = 0;
    mood = 1;
    if (!demo) { cleared++; score += 300 + Math.max(0, Math.round((TIME_LIMIT - playT) * 10)); }
    game.feedback.good(540 + bx, BALL_Y - 120, { text: 'NICE', color: C.ok, size: 60 });
    game.audio.play('se_milestone', 0.45);
  }

  function finish(ok) {
    over = true; won = ok; outroT = 1.5;
    game.audio.stopBgm();
    if (ok) {
      score += lives * 100;
      mood = 2;
      game.audio.play('se_success', 0.55);
      game.fx.burst(540, BALL_Y - 200, { color: C.gold, count: 30, speed: 440 });
      game.fx.burst(540, BALL_Y - 200, { color: C.ball, count: 20, speed: 360 });
      game.fx.flash('#ffffff', 0.2);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || over || readyT > 0 || stopT > 0 || fallT >= 0 || clearT >= 0) return;
    if (y < 230) { game.audio.tone(200, 0.03, { wave: 'triangle', volume: 0.03 }); return; }
    tap(x < W / 2 ? -1 : 1, false);
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  var BOY_A = ['..hhhh..', '.hhhhhh.', '.hssssh.', '.sesses.', '..smms..', '...ss...'];
  var BOY_B = ['..hhhh..', '.hhhhhh.', '.hssssh.', '.sesses.', '..soos..', '...ss...'];
  var BOY_SAD = ['..hhhh..', '.hhhhhh.', '.hssssh.', '.s-ss-s.', '..mssm..', '...ss...'];
  var STRAP = ['.ww.', 'w..w', 'w..w', '.ww.'];

  function drawCabin() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.cabin], [1, '#241e2a']]);
    // 後ろの窓: 山道の景色(3層パララックス)
    var wy = 240, wh = 300;
    game.draw.gradient(wy, wy + wh, [[0, C.sky], [1, C.haze]]);
    for (var i = 0; i < 8; i++) {
      var mx = ((i * 190 - t * 30) % (W + 380)) - 190;
      game.draw.rect(mx, wy + wh - 150 - (i % 3) * 30, 190, 150 + (i % 3) * 30, '#7a90a8');
    }
    for (var j = 0; j < 10; j++) {
      var tx = ((j * 140 - t * 120) % (W + 280)) - 140;
      game.draw.rect(tx + 50, wy + wh - 120, 30, 120, '#3a5a4a');
      game.draw.rect(tx + 20, wy + wh - 190, 90, 90, '#4a7a5a');
      game.draw.rect(tx + 34, wy + wh - 220, 62, 40, '#5a8a6a');
    }
    for (var k = 0; k < 5; k++) game.draw.rect(k * 240 - 10, wy - 10, 24, wh + 20, '#2a2430');
    game.draw.rect(0, wy - 16, W, 16, '#2a2430');
    game.draw.rect(0, wy + wh, W, 20, '#2a2430');
    // 吊り革(カーブの予告で振れる)
    var lean = strapLean();
    for (var s = 0; s < 4; s++) {
      var sx = 170 + s * 250;
      var sw = lean * 60 + Math.sin(t * 2 + s) * 6;
      game.draw.line(sx, 230, sx + sw, 330, '#d8d8e0', 6);
      game.draw.sprite(STRAP, { w: Math.abs(lean) > 0.3 ? C.ball : '#f0f0f0' }, sx + sw, 352, 12, { anchor: 'center' });
    }
  }

  function drawBoard() {
    var t = game.time.elapsed;
    // 板の土台(落ちると見える暗い下段)
    var ox = 540;
    game.draw.rect(60, 600, W - 120, 860, '#2a1e18');
    game.draw.rect(60, 600, W - 120, 16, C.side);
    // 道: 奥の行から手前へ。上面→前面→側面の3明度
    var r0 = Math.floor(by) - 4, r1 = Math.min(boardLen() + 1, Math.floor(by) + 10);
    var tiltH = tilt * 10;
    for (var r = r1; r >= r0; r--) {
      if (r < -1) continue;
      var y = BALL_Y - (r - by) * ROW_H;
      if (y < 610 || y > 1470) continue;
      var c = pathC(r), w = bd.w;
      if (r >= boardLen()) {
        // 奥の受け皿
        game.draw.rect(ox + c - 110, y - 70, 220, 60, '#5a5a6a');
        game.draw.rect(ox + c - 96, y - 60, 192, 36, C.gold);
        game.draw.circle(ox + c, y - 42, 30, '#fff3a0', 0.6 + Math.sin(t * 6) * 0.2);
        continue;
      }
      var lx = ox + c - w / 2;
      game.draw.rect(lx, y - ROW_H / 2, w, ROW_H, r % 2 === 0 ? C.top : '#dcbc84');
      game.draw.rect(lx, y + ROW_H / 2, w, 18 + tiltH, C.front);
      game.draw.rect(lx - 10, y - ROW_H / 2, 10, ROW_H + 18 - tiltH, C.side);
      game.draw.rect(lx + w, y - ROW_H / 2, 10, ROW_H + 18 + tiltH, C.side);
    }
  }

  function drawBall() {
    var t = game.time.elapsed;
    var x = 540 + bx, y = BALL_Y, r = BALL_R;
    if (fallT >= 0) { r = BALL_R * Math.max(0.2, 1 - fallT * 1.6); y += fallT * 80; }
    if (clearT >= 0) { y -= Math.min(1, clearT * 2) * 50; }
    var hl = focus && stopT > 0;
    if (hl) game.draw.circle(x, y, r * 2.4, '#ffffff', 0.5);
    game.draw.circle(x, y, r + 4, C.ink);
    game.draw.circle(x, y, r * (hl ? 1.3 : 1), hl ? '#ffffff' : C.ball);
    var spin = (by * 3) % 1;
    game.draw.circle(x - 8, y - 10 + spin * 6, r * 0.3, '#ffffff', 0.7);
    // 道の端が近いと赤く点滅(落ちる予告)
    var edge = bd.w / 2 - Math.abs(bx - pathC(by));
    if (edge < 26 && fallT < 0 && Math.floor(t * 12) % 2 === 0) game.draw.circle(x, y, r + 14, C.ball, 0.35);
  }

  function drawHands() {
    var t = game.time.elapsed;
    // 板を持つ両手(押した側が下がる)と少年の顔
    var lY = H * 0.78 + (handL > 0 ? 20 : 0) - tilt * 16;
    var rY = H * 0.78 + (handR > 0 ? 20 : 0) + tilt * 16;
    game.draw.rect(60, lY, 120, 70, '#e8b888');
    game.draw.rect(W - 180, rY, 120, 70, '#e8b888');
    game.draw.rect(0, H * 0.8, W, H * 0.2, C.seat);
    var fr = mood < 0 ? BOY_SAD : (Math.floor(t * 3) % 2 === 0 ? BOY_A : BOY_B);
    game.draw.sprite(fr, { h: '#3a2a2a', s: '#e8b888', e: C.ink, '-': C.ink, m: '#c05050', o: '#c05050' }, 540, H * 0.83 - (mood > 0 ? Math.abs(Math.sin(t * 10)) * 16 : 0), 24, { anchor: 'center' });
    // 左右のタップ板(押せる側を明るく)
    var pads = [-1, 1];
    for (var i = 0; i < 2; i++) {
      var px = pads[i] < 0 ? W * 0.2 : W * 0.8, py = H * 0.9;
      var lit = pads[i] < 0 ? handL > 0 : handR > 0;
      game.draw.rect(px - 130, py - 70, 260, 140, C.ink);
      game.draw.rect(px - 122, py - 62, 244, 124, lit ? C.gold : C.front);
      game.draw.rect(px - 122, py - 62, 244, 20, C.top);
      // 矢印(ブロック積み)
      for (var a = 0; a < 4; a++) {
        var ax = px + pads[i] * (a * 26 - 40);
        game.draw.rect(ax - 12, py - 10 - (3 - a) * 10, 24, 20 + (3 - a) * 20, C.ink, 0.7);
      }
    }
  }

  function drawLevel() {
    // 水準器(板の傾き)
    var x = 540, y = 585;
    game.draw.rect(x - 200, y - 22, 400, 44, C.ink);
    game.draw.rect(x - 192, y - 14, 384, 28, '#b8e8a8');
    game.draw.rect(x - 30, y - 14, 4, 28, C.ink);
    game.draw.rect(x + 26, y - 14, 4, 28, C.ink);
    game.draw.circle(x - tilt * 170, y, 14, Math.abs(tilt) > 0.5 ? C.ball : '#ffffff');
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink, 0.75);
    label('SCORE ' + score, 260, 80, 46, '#ffffff');
    for (var i = 0; i < BOARDS.length; i++) {
      var st = i < cleared ? C.ok : (i === bi ? C.top : '#4a4050');
      game.draw.rect(100 + i * 110, 140, 80, 50, C.side);
      game.draw.rect(100 + i * 110, 130, 80, 40, st);
    }
    label(cleared + ' / ' + BOARDS.length, 520, 178, 40, C.ok);
    for (var l = 0; l < LIVES; l++) game.draw.circle(800 + l * 80, 70, 26, l < lives ? C.ball : '#4a4050');
    var tk = Math.max(0, 1 - playT / TIME_LIMIT);
    game.draw.rect(700, 150, 320 * tk, 16, tk < 0.25 ? C.ball : C.gold);
    var prog = Math.min(1, by / boardLen());
    game.draw.rect(700, 190, 320, 10, '#4a4050');
    game.draw.rect(700, 190, 320 * prog, 10, C.top);
  }

  function drawScene() {
    drawCabin();
    drawBoard();
    drawBall();
    drawLevel();
    drawHands();
  }

  // ---- ATTRACT: 本物の板を自動で傾けて通す。途中で手を止めてカーブで球を落として見せる ----
  var demo = { t: 0, cool: 0, l: 0, r: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt || readyT > 0) { initGame(); readyT = 0; lives = 99; }
    var cyc = demo.t % 9;
    if (cyc < dt) { startBoard(0); }
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) focus = null; return; }
    if (fallT >= 0) { fallT += dt; if (fallT > 0.5) respawn(); return; }
    if (clearT >= 0) { clearT += dt; if (clearT > 0.6) startBoard((bi + 1) % 2); return; }
    demo.cool -= dt;
    var lazy = cyc > 5.5;
    if (!lazy && demo.cool <= 0) {
      var want = Math.max(-0.6, Math.min(0.6, (pathC(by + 1.2) - bx) / 260));
      for (var i = 0; i < sways.length; i++) if (sways[i].t >= 0 && sways[i].t < 1.4) want -= sways[i].d * 0.25;
      if (tilt < want - 0.12) { tap(1, true); demo.r = 0.18; demo.cool = 0.16; }
      else if (tilt > want + 0.12) { tap(-1, true); demo.l = 0.18; demo.cool = 0.16; }
    }
    if (lazy && cyc < 5.5 + dt * 2) tilt += 0.25;
    var res = stepBall(dt);
    if (res === 'fall') onFall(true);
    else if (res === 'goal') onGoal(true);
    demo.l -= dt; demo.r -= dt;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (handL > 0) handL -= dt;
    if (handR > 0) handR -= dt;
    mood += (0 - mood) * Math.min(1, dt * 1.5);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(W * 0.2, H * 0.9 - (demo.l > 0 ? 0 : 50), { press: demo.l > 0, scale: 14 });
      game.draw.hand(W * 0.8, H * 0.9 - (demo.r > 0 ? 0 : 50), { press: demo.r > 0, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.75);
      label(GAME_TITLE, W / 2, 105, 90 + Math.sin(t * 3) * 3, C.gold);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 36, '#ffffff');
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.75, 50, C.gold);
      else label('TAP TO START', W / 2, H * 0.75, 44, '#ffffff');
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.33, W, H * 0.22, C.ink, 0.8);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.39, 96, won ? C.ok : C.ball);
      label('SCORE ' + score, W / 2, H * 0.45, 52, '#ffffff');
      label(cleared + ' / ' + BOARDS.length, W / 2, H * 0.495, 40, C.ok);
      if (score > game.best && score > 0) label('NEW RECORD', W / 2, H * 0.535, 46, C.gold);
      else label('BEST ' + Math.max(game.best, score), W / 2, H * 0.535, 36, '#ffffff');
      if (!won) label('あと' + Math.max(1, BOARDS.length - cleared) + '枚!', W / 2, H * 0.31, 48, C.gold);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.6, 36, '#ffffff');
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (stopT > 0) stopT -= dt;
      if (fallT >= 0) fallT += dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { boards: cleared, ballsLeft: lives };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else if (stopT > 0) {
      stopT -= dt;
      if (fallT >= 0) fallT += dt;
      if (stopT <= 0) focus = null;
    } else {
      playT += dt;
      if (fallT >= 0) { fallT += dt; if (fallT > 0.5) respawn(); }
      else if (clearT >= 0) {
        clearT += dt;
        if (clearT > 0.7) { if (bi + 1 >= BOARDS.length) finish(true); else startBoard(bi + 1); }
      } else {
        var res = stepBall(dt);
        if (res === 'fall') onFall(false);
        else if (res === 'goal') onGoal(false);
      }
      if (!over && playT >= TIME_LIMIT) finish(false);
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 100, C.gold);
    if (over && !won && playT >= TIME_LIMIT) label('TIME UP', W / 2, H * 0.45, 90, C.ball);
  });

  game.onStart(function() {
    game.audio.melody([
      ['G4', 0.5], ['A4', 0.5], ['B4', 0.5], ['D5', 0.5], ['B4', 1], ['G4', 1],
      ['A4', 0.5], ['B4', 0.5], ['A4', 0.5], ['E4', 0.5], ['G4', 2],
    ], { tempo: 116, wave: 'triangle', volume: 0.05, loop: true, bass: [['G2', 2], ['E2', 2], ['C3', 2], ['D3', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

// I-DS-0029v3-thatch-roof-snow-climb.js
// 茅葺き屋根のぼり — 上へのスワイプで茅の束を一段ずつ蹴り上がり、横のスワイプで滑り落ちてくる雪の塊の筋から身をかわして棟まで登る
// 操作: 上へスワイプすると真上の茅の束へ一段登る(束が抜けて黒く湿った所へは登れない)。左右へスワイプすると同じ段の横木を伝って隣の列へ移る。列の上端が赤く瞬いて粉雪が舞ったら、その列を雪の塊が滑り落ちてくる(社内メモ。画面には出さない)
// 終わり: 16段登って棟に着けばCLEAR。雪の塊に3回当たる、または22秒以内に棟へ着けなければGAME OVER
// @mechanic: camera_climb
// @theme: thatched_roof_spring_thaw_climb
// 世界観: 雪解けの山里で、屋根葺き職人が茅葺き屋根の傷みを見に、ゆるんで滑り落ちてくる雪の塊の筋をよけながら茅の束を蹴って棟まで登る
// 残るもの: 正誤(CLEAR/GAME OVER) + 登った段数(高さ)・よけた雪の塊の数・スコア
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体を上面/前面/側面の3明度で描く。影は落とさず明度差だけで立体を出す
  var STYLE = { bg: ['#bfe0f4', '#eef6f0'], main: ['#e8c878', '#c89a50', '#8a6430'], accent: ['#ff4a4a', '#ffffff'] };
  var C = {
    strawT: STYLE.main[0], strawF: STYLE.main[1], strawS: STYLE.main[2], red: STYLE.accent[0], white: STYLE.accent[1],
    snowT: '#ffffff', snowF: '#d8e8f4', snowS: '#a8c0d8', wetT: '#5a4a3a', wetF: '#3a2e24', ink: '#2a2420',
    hillT: '#9ad0a0', hillF: '#6aa874', hillS: '#4a8458', sky: STYLE.bg[0],
  };

  var GAME_TITLE = 'KAYA CLIMB';
  var TIME_LIMIT = 22;
  var TOP_ROW = 16;
  var LIVES = 3;
  var ROW_H = 200;
  var COLS = [W / 2 - 270, W / 2, W / 2 + 270];
  var CLIMBER_SY = H * 0.62;
  var SLIDE_V = 1500;
  var WARN_T = 0.7;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var holes, me, cam, clumps, spawnT, hits, dodged, score, finalScore, timeLeft, readyT, stopT, stopKind, culprit, fin, cleared, postT, warnT, invT, joyT, milestone, bestRow, bumpT, elapsedP;

  // 屋根葺き職人(鉢巻・藁色の上着)。登りの2コマ
  var MAN_A = ['h........h', '.hhhhhhh..', '..ssssss..', '..skssks..', '..ssssss..', 's.jjjjjj..', 'sjjjjjjjj.', '..jjjjjjjs', '..pppppp.s', '..pp..pp..', '..bb..bb..'];
  var MAN_B = ['..........', 'h.hhhhhh.h', '..ssssss..', '..skssks..', '..ssssss..', '..jjjjjj.s', '.jjjjjjjjs', 'sjjjjjjj..', 's.pppppp..', '..pp..pp..', '..bb..bb..'];
  var MAN_OUCH = ['..........', '.hhhhhhh..', '..ssssss..', '..sxssxs..', '..skkkks..', 's.jjjjjj.s', 'sjjjjjjjjs', '..jjjjjj..', '..pppppp..', '.pp....pp.', 'bb......bb'];
  var MAN_JOY = ['s........s', 'shhhhhhhhs', '.jssssssj.', '..s.ss.s..', '..ssssss..', '..smmmms..', '..jjjjjj..', '..jjjjjj..', '..pppppp..', '..pp..pp..', '..bb..bb..'];
  var MAN_PAL = { h: '#ff4a4a', s: '#f0c098', k: '#2a2420', x: '#2a2420', j: '#6a8ab8', p: '#3a4a6a', b: '#2a2420', m: '#c84a3a' };

  function out(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#2a242088', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }
  function cube(x, y, s, t, f, sd) {
    game.draw.rect(x - s / 2, y - s / 2, s, s, f);
    game.draw.rect(x - s / 2, y - s / 2 - s * 0.28, s, s * 0.28, t);
    game.draw.rect(x + s / 2, y - s / 2 - s * 0.14, s * 0.22, s, sd);
  }

  function makeRoof() {
    holes = [];
    for (var r = 0; r <= TOP_ROW + 2; r++) {
      var h = -1;
      if (r >= 3 && r < TOP_ROW && Math.random() < 0.3 + r * 0.02) h = Math.floor(game.random(0, 3));
      if (r > 0 && holes[r - 1] === h) h = -1;
      holes.push(h);
    }
  }

  function initGame() {
    makeRoof();
    me = { col: 1, row: 0, x: COLS[1], wy: 0, tx: COLS[1], twy: 0, frame: 0 };
    cam = 0; clumps = []; spawnT = 1.0; hits = 0; dodged = 0; score = 0; finalScore = 0;
    timeLeft = TIME_LIMIT; readyT = 0.8; stopT = 0; stopKind = ''; culprit = null; fin = false; cleared = false;
    postT = 0; warnT = 0; invT = 0; joyT = 0; milestone = false; bestRow = 0; bumpT = 0; elapsedP = 0;
  }

  function sy(wy) { return CLIMBER_SY + (wy - cam); }
  function rowY(r) { return -r * ROW_H; }

  function climb(dir) {
    if (dir === 'up') {
      var nr = me.row + 1;
      if (holes[nr] === me.col) {
        bumpT = 0.25;
        game.audio.tone('D3', 0.08, { wave: 'square', volume: 0.08 });
        game.fx.burst(me.tx, sy(rowY(nr)), { color: C.wetT, count: 6, speed: 160 });
        return false;
      }
      me.row = nr; me.twy = rowY(nr); me.frame++;
      game.audio.play('se_jump', 0.25);
      game.fx.burst(me.tx, sy(rowY(nr - 1)) + 40, { color: C.strawT, count: 5, speed: 150 });
      if (me.row > bestRow) {
        bestRow = me.row; score += 50;
        if (mode === S.PLAYING && !milestone && me.row >= TOP_ROW / 2) {
          milestone = true;
          game.audio.play('se_milestone', 0.5);
          game.fx.popup('NICE', W / 2, H * 0.2, { color: C.white, size: 84 });
        }
        if (mode === S.PLAYING && me.row >= TOP_ROW && stopT <= 0) {
          stopT = 0.45; stopKind = 'win'; joyT = 2;
          game.audio.play('se_powerup', 0.45);
        }
      }
      return true;
    }
    var nc = me.col + (dir === 'left' ? -1 : 1);
    if (nc < 0 || nc > 2) { bumpT = 0.2; game.audio.tone('E3', 0.06, { wave: 'square', volume: 0.07 }); return false; }
    me.col = nc; me.tx = COLS[nc];
    game.audio.play('se_tap', 0.25);
    game.audio.tone('A5', 0.04, { wave: 'triangle', volume: 0.05 });
    return true;
  }

  function spawnClump(col) {
    clumps.push({ col: col, wy: cam - CLIMBER_SY - 140, warn: WARN_T, passed: false, hit: false });
    game.audio.tone('F5', 0.08, { wave: 'square', volume: 0.06 });
  }

  function stepWorld(dt, spawnOn) {
    if (invT > 0) invT -= dt;
    if (joyT > 0) joyT -= dt;
    if (bumpT > 0) bumpT -= dt;
    me.x += (me.tx - me.x) * Math.min(1, dt * 18);
    me.wy += (me.twy - me.wy) * Math.min(1, dt * 16);
    cam += (me.wy - cam) * Math.min(1, dt * 6);
    if (spawnOn) {
      spawnT -= dt;
      if (spawnT <= 0) {
        var k = Math.min(1, bestRow / TOP_ROW);
        spawnT = 1.25 - 0.5 * k;
        var col = Math.random() < 0.55 ? me.col : Math.floor(game.random(0, 3));
        spawnClump(col);
        if (k > 0.4 && Math.random() < 0.4) spawnClump((col + (Math.random() < 0.5 ? 1 : 2)) % 3);
      }
    }
    for (var i = clumps.length - 1; i >= 0; i--) {
      var c = clumps[i];
      if (c.warn > 0) { c.warn -= dt; c.wy = cam - CLIMBER_SY - 140; continue; }
      c.wy += SLIDE_V * dt;
      var myY = me.wy;
      if (!c.hit && c.col === me.col && Math.abs(c.wy - myY) < 95 && invT <= 0 && Math.abs(me.x - me.tx) < 90) {
        c.hit = true; hits++;
        game.audio.play('se_break', 0.35);
        if (mode === S.PLAYING && hits >= LIVES) {
          stopT = 0.5; stopKind = 'hit'; culprit = c;
          game.fx.flash('#ffffff', 0.22);
        } else {
          invT = 1.0;
          if (me.row > 0) { me.row--; me.twy = rowY(me.row); }
          game.feedback.bad(me.x, sy(me.wy) - 80, { text: 'MISS', color: C.red, size: 56 });
        }
      }
      if (!c.passed && !c.hit && c.wy > myY + 100) {
        c.passed = true;
        if (Math.abs(COLS[c.col] - me.x) < 300) {
          dodged++; score += 80;
          game.feedback.good(COLS[c.col], sy(myY) - 40, { text: 'NICE', color: C.white, size: 44 });
        }
      }
      if (c.wy > cam + H) clumps.splice(i, 1);
    }
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = score + (win ? Math.ceil(timeLeft) * 60 + (LIVES - hits) * 150 : 0);
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 6; i++) game.fx.burst(150 + i * 155, H * 0.35 + (i % 2) * 150, { color: i % 2 ? C.strawT : C.white, count: 18, speed: 520 });
      game.fx.flash(C.white, 0.25);
    }
  }

  function canPlay() { return mode === S.PLAYING && !fin && stopT <= 0 && readyT <= 0; }

  game.onSwipe(function(dir) {
    if (!canPlay()) return;
    if (dir === 'down') { game.audio.play('se_tap', 0.1); bumpT = 0.15; return; }
    climb(dir);
  });
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (canPlay()) { game.audio.play('se_tap', 0.12); bumpT = 0.12; game.fx.burst(x, y, { color: C.white, count: 4, speed: 120 }); }
  });

  // ---- 描画 ----
  function scenery(t) {
    var lift = Math.min(1, -cam / (TOP_ROW * ROW_H));
    game.draw.gradient(0, H, [[0, '#9ccff0'], [0.5, STYLE.bg[0]], [1, STYLE.bg[1]]]);
    // 遠景の山(ボクセルの段)— 登るほど沈む
    for (var m = 0; m < 9; m++) {
      var mh = 3 + (m * 5) % 4, bx = m * 130;
      for (var k = 0; k < mh; k++) cube(bx + 60, 760 + lift * 300 - k * 70, 120 - k * 10, k === mh - 1 ? C.snowT : C.hillT, C.hillF, C.hillS);
    }
    game.draw.circle(W * 0.82, 300, 70, '#fff8d0', 0.9);
  }

  function roof(t) {
    var top = sy(rowY(TOP_ROW)) - 120;
    game.draw.rect(COLS[0] - 190, Math.max(-10, top), COLS[2] - COLS[0] + 380, H + 10, C.strawS);
    game.draw.rect(COLS[0] - 170, Math.max(-10, top), COLS[2] - COLS[0] + 340, H + 10, C.strawF);
    // 棟(ゴール)
    var ry = sy(rowY(TOP_ROW)) - 70;
    if (ry > -100 && ry < H) {
      game.draw.rect(COLS[0] - 220, ry - 70, COLS[2] - COLS[0] + 440, 70, C.ink);
      game.draw.rect(COLS[0] - 220, ry - 90, COLS[2] - COLS[0] + 440, 22, '#5a5048');
      game.draw.line(W / 2, ry - 90, W / 2, ry - 260, C.ink, 8);
      game.draw.rect(W / 2, ry - 260 + Math.sin(t * 6) * 6, 120, 70, C.red);
      game.draw.circle(W / 2, ry - 260, 14, C.white);
    }
    for (var r = Math.max(0, me.row - 6); r <= Math.min(TOP_ROW, me.row + 9); r++) {
      var y = sy(rowY(r));
      if (y < -120 || y > H + 120) continue;
      // 横木(伝って横へ移れる)
      game.draw.rect(COLS[0] - 150, y + 52, COLS[2] - COLS[0] + 300, 16, '#6a5030');
      game.draw.rect(COLS[0] - 150, y + 52, COLS[2] - COLS[0] + 300, 5, '#a88a5a');
      for (var c = 0; c < 3; c++) {
        if (r === TOP_ROW && c !== 1) continue;
        if (holes[r] === c) {
          game.draw.rect(COLS[c] - 70, y - 70, 140, 120, C.wetF);
          game.draw.rect(COLS[c] - 70, y - 70, 140, 26, C.wetT);
          continue;
        }
        var snowy = (r * 3 + c) % 4 === 0;
        cube(COLS[c], y, 120, snowy ? C.snowT : C.strawT, C.strawF, C.strawS);
        for (var s = 0; s < 4; s++) game.draw.line(COLS[c] - 45 + s * 30, y - 50, COLS[c] - 50 + s * 30, y + 52, C.strawS, 3);
      }
    }
    // 軒(手前)
    var ey = sy(rowY(0)) + 160;
    if (ey < H + 40) { cube(W / 2, ey + 60, 900, C.strawT, C.strawF, C.strawS); }
  }

  function drawClumps(t) {
    for (var i = 0; i < clumps.length; i++) {
      var c = clumps[i], x = COLS[c.col];
      if (c.warn > 0) {
        // telegraph: 列の上端が赤く瞬き、粉雪が舞う
        var on = Math.floor(t * 14) % 2 === 0;
        game.draw.rect(x - 80, 230, 160, 520, C.red, on ? 0.22 : 0.08);
        game.draw.rect(x - 80, 230, 160, 12, C.red, 0.9);
        for (var p = 0; p < 5; p++) game.draw.circle(x - 60 + ((p * 37 + Math.floor(t * 20) * 13) % 120), 250 + ((p * 53 + t * 300) % 200), 6, C.white, 0.8);
        continue;
      }
      var y = sy(c.wy);
      var big = culprit === c && stopT > 0;
      var hl = big && Math.floor(t * 16) % 2 === 0;
      var s = big ? 220 : 140;
      game.draw.rect(x - 70, y - 360, 140, 300, C.white, 0.25);
      cube(x, y, s, hl ? '#ffffff' : C.snowT, hl ? '#ffffff' : C.snowF, hl ? '#ffe0e0' : C.snowS);
      // つらら状のトゲ(赤い縁)
      for (var k = -2; k <= 2; k++) game.draw.line(x + k * s * 0.18, y + s / 2, x + k * s * 0.18, y + s / 2 + 30, C.red, 6);
    }
  }

  function drawMan(t) {
    var over = fin && !cleared;
    var fr = (invT > 0 || over || (stopT > 0 && stopKind === 'hit')) ? MAN_OUCH : (joyT > 0 || (fin && cleared)) ? MAN_JOY : (me.frame % 2 ? MAN_A : MAN_B);
    var y = sy(me.wy) - 40 + (bumpT > 0 ? Math.sin(bumpT * 60) * 8 : Math.sin(t * 3) * 3);
    if (fin && cleared) y -= Math.abs(Math.sin(t * 10)) * 30;
    if (over) y += Math.min(400, (1.4 - postT) * 600);
    var vis = invT > 0 ? Math.floor(t * 14) % 2 === 0 : true;
    if (vis) game.draw.sprite(fr, MAN_PAL, me.x, y, 13, { anchor: 'center', flipX: Math.floor(t * 1.5) % 2 === 0 && joyT <= 0 });
  }

  function drawHud(t) {
    var low = timeLeft < 4 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(0, 0, W, 230, '#2a2420', 0.35);
    game.draw.rect(70, 40, W - 140, 28, '#00000066');
    game.draw.rect(76, 46, (W - 152) * Math.max(0, timeLeft / TIME_LIMIT), 16, low ? C.red : C.white);
    out(bestRow + ' / ' + TOP_ROW, W / 2, 160, 60, C.white);
    out((bestRow * 0.5).toFixed(1) + 'm', 140, 160, 40, C.strawT);
    for (var h = 0; h < LIVES; h++) cube(W - 120 - h * 70, 150, 40, h < hits ? C.red : C.snowT, h < hits ? '#a82a2a' : C.snowF, C.snowS);
    // 高度メーター(左端)
    game.draw.rect(24, 300, 22, 1100, '#00000040');
    game.draw.rect(24, 300 + 1100 * (1 - bestRow / TOP_ROW), 22, 1100 * bestRow / TOP_ROW, C.strawT);
    game.draw.rect(14, 286, 42, 20, C.red);
  }

  function drawScene(t) {
    scenery(t);
    roof(t);
    drawClumps(t);
    drawMan(t);
    for (var sl = 0; sl < H; sl += 8) game.draw.rect(0, sl, W, 2, '#000000', 0.04);
  }

  // ---- ATTRACT: 本物の climb()/stepWorld() をゴーストのスワイプで動かす。雪の筋をよけて登り、3回に1回は見落として当たる ----
  var demo = { t: 0, x: W / 2, y: H * 0.85, dx: 0, dy: 0, swT: 0, cd: 0, seen: 0 };
  function ghostSwipe(dir) {
    demo.dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    demo.dy = dir === 'up' ? -1 : 0;
    demo.swT = 0.3; demo.cd = 0.42;
    climb(dir);
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; demo.seen = 0; demo.cd = 0.6; }
    stepWorld(dt, true);
    if (me.row >= TOP_ROW - 1) { me.row = 0; me.twy = 0; me.wy = 0; cam = 0; bestRow = 0; makeRoof(); }
    if (demo.swT > 0) demo.swT -= dt;
    if (demo.cd > 0) { demo.cd -= dt; return; }
    var danger = -1;
    for (var i = 0; i < clumps.length; i++) {
      var c = clumps[i];
      if (c.col === me.col && !c.passed && c.wy < me.wy + 50) {
        if (!c.seen) { c.seen = true; demo.seen++; c.lazy = demo.seen % 3 === 0; }
        if (!c.lazy) danger = c.col;
      }
    }
    if (danger >= 0) {
      var safe = -1;
      for (var k = 0; k < 3; k++) {
        if (k === me.col) continue;
        var bad = false;
        for (var j = 0; j < clumps.length; j++) if (clumps[j].col === k && !clumps[j].passed) bad = true;
        if (!bad && (safe < 0 || Math.abs(k - me.col) < Math.abs(safe - me.col))) safe = k;
      }
      if (safe >= 0) ghostSwipe(safe < me.col ? 'left' : 'right');
      return;
    }
    if (holes[me.row + 1] === me.col) ghostSwipe(me.col === 0 ? 'right' : 'left');
    else ghostSwipe('up');
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      var u = demo.swT > 0 ? 1 - demo.swT / 0.3 : 0;
      game.draw.hand(demo.x + demo.dx * u * 220, demo.y + demo.dy * u * 260, { press: demo.swT > 0, scale: 13 });
      if (demo.swT > 0) game.draw.line(demo.x, demo.y, demo.x + demo.dx * u * 220, demo.y + demo.dy * u * 260, C.white, 10);
      game.draw.rect(0, 0, W, 240, '#2a2420', 0.35);
      out(GAME_TITLE, W / 2, 120 + Math.sin(t * 2) * 5, 100, C.strawT);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 200, 40, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.965, 46, C.white);
      else out('TAP TO START', W / 2, H * 0.965, 42, C.strawT);
      return;
    }

    if (mode === S.RESULT) {
      stepWorld(dt, false);
      drawScene(t);
      game.draw.rect(90, H * 0.3, W - 180, 480, '#2a2420', 0.88);
      out(cleared ? 'CLEAR' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.36, 96, cleared ? C.strawT : C.red);
      out('SCORE ' + finalScore, W / 2, H * 0.42, 60, C.white);
      out(bestRow + ' / ' + TOP_ROW + '   NICE ' + dodged, W / 2, H * 0.47, 42, C.strawT);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.52, 56, C.red);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.52, 42, C.white);
      if (!cleared) out('あと' + (TOP_ROW - bestRow) + '段!', W / 2, H * 0.27, 64, C.red);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.white);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { rows: bestRow, dodged: dodged, hits: hits };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopKind === 'win') stepWorld(dt, false);
      if (stopT <= 0) {
        if (stopKind === 'win') ending(true);
        else { game.feedback.bad(me.x, sy(me.wy) - 80, { text: stopKind === 'time' ? 'TIME UP' : 'MISS', color: C.red, size: 62 }); ending(false); }
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      timeLeft -= dt; elapsedP += dt;
      stepWorld(dt, true);
      if (timeLeft < 4) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.06, { wave: 'square', volume: 0.07 }); }
      }
      if (timeLeft <= 0 && stopT <= 0) { timeLeft = 0; stopT = 0.45; stopKind = 'time'; game.audio.tone('C4', 0.3, { wave: 'square', volume: 0.1, slide: -120 }); }
    }

    drawScene(t);
    if (stopT > 0 && stopKind === 'win') game.draw.circle(me.x, sy(me.wy), 100 + (0.45 - stopT) * 1500, C.white, 0.3);
    // 開始直後のお手本: 上へ払う手
    if (!fin && readyT <= 0 && elapsedP < 1.5 && bestRow === 0) {
      var g = (elapsedP * 1.6) % 1;
      game.draw.hand(W / 2 + 200, H * 0.86 - g * 260, { press: true, scale: 11, alpha: 0.5 });
    }
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 120, C.strawT);
  });

  game.onStart(function() {
    game.audio.melody([
      ['D5', 0.5], ['F5', 0.5], ['G5', 0.5], ['A5', 0.5], ['C6', 1], ['A5', 1],
      ['G5', 0.5], ['A5', 0.5], ['G5', 0.5], ['F5', 0.5], ['D5', 2],
      ['F5', 0.5], ['G5', 0.5], ['A5', 1], ['G5', 0.5], ['F5', 0.5], ['D5', 1], ['C5', 1],
    ], { tempo: 138, wave: 'square', volume: 0.05, loop: true, bass: [['D3', 1], ['A2', 1], ['C3', 1], ['G2', 1]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);

// I-DS-0016v2-bathhouse-board-scrub.js
// 伝言黒板ごしごし — 指を往復させて黒板の落書きをこすり消す。貼り紙のお知らせだけは消さないよう避けて磨く
// 操作: 黒板の上で指を左右(上下)に往復させてこする。往復で折り返すほどよく消える。画鋲で留めた貼り紙に触れると汚してしまう(社内メモ)
// 終わり: 3枚の黒板の落書きを時間内に消し切れば成功。時間切れ、または貼り紙を3回汚すと失敗
// @mechanic: rub
// @theme: bathhouse_message_board
// 世界観: 月曜朝の銭湯で、番台の主人が番台脇の伝言黒板に週末書き込まれた落書きを、湯の案内の貼り紙だけ残してこすって消していく
// 残るもの: 正誤(CLEAR/GAME OVER) + 消した割合%・汚した回数
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 黄緑寄りの4階調のみ、残像と低コントラスト、画面枠を描く
  var STYLE = { bg: ['#0f380f', '#306230', '#8bac0f'], main: ['#9bbc0f', '#8bac0f', '#306230'], accent: ['#0f380f', '#9bbc0f'] };
  var G = { k0: '#0f380f', k1: '#306230', k2: '#8bac0f', k3: '#9bbc0f', bezel: '#4a4a52', bezelLit: '#6a6a74' };

  var GAME_TITLE = 'BOARD SCRUB';
  var TIME_LIMIT = 14;
  var CELL = 30, GC = 30, GR = 24;
  var BX = (W - GC * CELL) / 2, BY = H * 0.2;
  var R = 78;
  var GOAL = 0.93;
  var STAINS = 3;
  var BOARDS = [
    { note: [1, 1, 8, 6], doodles: ['spiral', 'zig', 'face'] },
    { note: [20, 9, 8, 7], doodles: ['zig', 'face', 'arrow', 'spiral'] },
    { note: [11, 9, 8, 6], doodles: ['face', 'spiral', 'zig', 'arrow', 'zig'] },
  ];
  var SPOTS = [[7, 16], [21, 5], [12, 4], [5, 9], [24, 18], [16, 19]];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var chalk, startSum, boardIx, last, lastDir, scrub, stains, erasedTot, totalChalk, warnT, hitCool, ghost;
  var timeLeft, score, primed, finished, cleared, lag, resultT, told, swap, mood, midShown, tickT, smear;

  var BOSS_A = ['.tttttt.', 'tttttttt', '.ffffff.', '.fefeff.', '.ffffff.', '..fmmf..', '.yyyyyy.', 'yyyyyyyy', 'y.yyyy.y', '..y..y..', '.dd..dd.'];
  var BOSS_B = ['.tttttt.', 'tttttttt', '.ffffff.', '.ffffff.', '.ffffff.', '..fmmf..', '.yyyyyy.', 'yyyyyyyy', 'y.yyyy.y', '.y....y.', 'dd....dd'];
  var BOSS_YAY = ['ytttttty', 'ytttttty', 'yffffffy', '.fefeff.', '.ffffff.', '..fmmf..', '..yyyy..', '.yyyyyy.', '..yyyy..', '.y....y.', 'dd....dd'];
  var BOSS_PAL = { t: '#9bbc0f', f: '#8bac0f', e: '#0f380f', m: '#306230', y: '#9bbc0f', d: '#0f380f' };
  var ERASER = ['bbbbbbbb', 'bbbbbbbb', 'ffffffff', 'ffffffff'];
  var PIN = ['.p.', 'ppp', '.p.'];
  var STEAM = ['.s.', 's.s', '.s.'];

  function chip(str, x, y, sz, col) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: G.k0, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  // ---- 落書きを描き込む ----
  function stamp(cx, cy, v) {
    var c = Math.round(cx), r = Math.round(cy);
    if (c < 0 || r < 0 || c >= GC || r >= GR) return;
    if (inNote(c, r, 1)) return;
    chalk[r][c] = Math.min(1, chalk[r][c] + v);
  }

  function doodle(kind, ox, oy) {
    var i, t;
    if (kind === 'spiral') {
      for (t = 0; t < 14; t += 0.12) stamp(ox + Math.cos(t) * t * 0.32, oy + Math.sin(t) * t * 0.32, 1);
    } else if (kind === 'zig') {
      for (i = 0; i <= 40; i++) stamp(ox - 5 + i * 0.25, oy + ((i % 10) < 5 ? (i % 5) : 5 - (i % 5)) * 0.8 - 2, 1);
    } else if (kind === 'face') {
      for (t = 0; t < 6.3; t += 0.1) stamp(ox + Math.cos(t) * 3.4, oy + Math.sin(t) * 3.4, 1);
      stamp(ox - 1.2, oy - 1, 1); stamp(ox + 1.2, oy - 1, 1);
      for (t = 0.4; t < 2.8; t += 0.25) stamp(ox + Math.cos(t) * 1.8, oy + 0.6 + Math.sin(t) * 1.4, 1);
    } else {
      for (i = 0; i < 9; i++) stamp(ox - 4 + i, oy, 1);
      for (i = 0; i < 4; i++) { stamp(ox + 4 - i, oy - i, 1); stamp(ox + 4 - i, oy + i, 1); }
    }
  }

  function inNote(c, r, pad) {
    var n = BOARDS[boardIx].note;
    return c >= n[0] - pad && c < n[0] + n[2] + pad && r >= n[1] - pad && r < n[1] + n[3] + pad;
  }

  function noteRect() {
    var n = BOARDS[boardIx].note;
    return { x: BX + n[0] * CELL, y: BY + n[1] * CELL, w: n[2] * CELL, h: n[3] * CELL };
  }

  function loadBoard(ix) {
    boardIx = ix;
    chalk = [];
    for (var r = 0; r < GR; r++) { var row = []; for (var c = 0; c < GC; c++) row.push(0); chalk.push(row); }
    var list = BOARDS[ix].doodles, used = 0;
    for (var k = 0; k < SPOTS.length && used < list.length; k++) {
      var sp = SPOTS[(k + ix * 2) % SPOTS.length];
      if (inNote(sp[0], sp[1], 4)) continue;
      doodle(list[used], sp[0], sp[1]);
      used++;
    }
    startSum = sumChalk();
    last = null; lastDir = 0; scrub = 0; swap = 0;
  }

  function sumChalk() {
    var s = 0;
    for (var r = 0; r < GR; r++) for (var c = 0; c < GC; c++) s += chalk[r][c];
    return s;
  }

  function erasedFrac() { return startSum > 0 ? 1 - sumChalk() / startSum : 1; }

  function initGame() {
    stains = 0; erasedTot = 0; totalChalk = 0; warnT = 0; hitCool = 0; ghost = [];
    timeLeft = TIME_LIMIT; score = 0; primed = 0.8; finished = false; cleared = false; lag = 0; resultT = 0; told = false;
    mood = null; midShown = false; tickT = 0; smear = null;
    loadBoard(0);
  }

  // ---- こする(本番もデモも同じ) ----
  function rubAt(x, y, live) {
    if (swap > 0) return 'busy';
    ghost.push({ x: x, y: y, t: 0.3 });
    if (ghost.length > 8) ghost.shift();
    var nr = noteRect();
    var nx = Math.max(nr.x, Math.min(x, nr.x + nr.w)), ny = Math.max(nr.y, Math.min(y, nr.y + nr.h));
    var dNote = Math.hypot(x - nx, y - ny);
    if (dNote < R + 60) warnT = 0.2;
    if (dNote < R * 0.55) {
      last = null;
      if (hitCool <= 0) {
        hitCool = 0.9;
        smear = { x: nx, y: ny, t: 0.5 };
        game.feedback.bad(nr.x + nr.w / 2, nr.y - 20, { text: 'MISS' });
        game.audio.play('se_break', 0.35);
        mood = { k: 'oops', t: 0.7 };
        if (live) {
          stains++;
          lag = 0.4;
          if (stains >= STAINS) end(false);
        }
        return 'stain';
      }
      return 'stain';
    }
    if (!last) { last = { x: x, y: y }; return 'start'; }
    var dx = x - last.x, dy = y - last.y, dist = Math.hypot(dx, dy);
    if (dist < 3) return 'still';
    var dir = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 1 : -1) : (dy > 0 ? 2 : -2);
    var turned = lastDir !== 0 && dir === -lastDir;
    if (turned) {
      scrub = 0.35;
      game.audio.tone(turned && dir > 0 ? 'E4' : 'C4', 0.03, { wave: 'square', volume: 0.06 });
    }
    lastDir = dir;
    var power = Math.min(dist, 120) * (scrub > 0 ? 0.0045 : 0.0014);
    var before = sumChalk();
    var steps = Math.max(1, Math.ceil(dist / 24));
    for (var s = 0; s <= steps; s++) {
      var px = last.x + dx * s / steps, py = last.y + dy * s / steps;
      var c0 = Math.floor((px - R - BX) / CELL), c1 = Math.floor((px + R - BX) / CELL);
      var r0 = Math.floor((py - R - BY) / CELL), r1 = Math.floor((py + R - BY) / CELL);
      for (var r = Math.max(0, r0); r <= Math.min(GR - 1, r1); r++) for (var c = Math.max(0, c0); c <= Math.min(GC - 1, c1); c++) {
        if (chalk[r][c] <= 0) continue;
        var cx = BX + c * CELL + CELL / 2, cy = BY + r * CELL + CELL / 2;
        if (Math.hypot(cx - px, cy - py) < R) chalk[r][c] = Math.max(0, chalk[r][c] - power / steps * 1.6);
      }
    }
    last = { x: x, y: y };
    var gone = before - sumChalk();
    if (gone > 0.05 && Math.floor(game.time.elapsed * 10) % 2 === 0) game.fx.burst(x, y + 30, { color: G.k3, count: 2, speed: 120 });
    if (live) score += Math.round(gone * 4);
    if (erasedFrac() >= GOAL && swap <= 0) boardDone(live);
    return 'rub';
  }

  function boardDone(live) {
    var nr = noteRect();
    for (var r = 0; r < GR; r++) for (var c = 0; c < GC; c++) chalk[r][c] = 0;
    game.feedback.good(nr.x + nr.w / 2, nr.y + nr.h / 2, { text: 'CLEAR', color: G.k3, size: 66 });
    game.audio.play('se_powerup', 0.45);
    mood = { k: 'yay', t: 0.9 };
    swap = 0.9;
    last = null;
    if (live) {
      erasedTot++;
      score += 300;
      if (!midShown) { midShown = true; game.fx.popup('NICE', W / 2, H * 0.17, { color: G.k3, size: 84 }); game.audio.play('se_milestone', 0.5); }
      if (boardIx >= BOARDS.length - 1) end(true);
    }
  }

  function stepBoard(dt, live) {
    if (scrub > 0) scrub -= dt;
    if (warnT > 0) warnT -= dt;
    if (hitCool > 0) hitCool -= dt;
    if (smear) { smear.t -= dt; if (smear.t <= 0) smear = null; }
    if (mood) { mood.t -= dt; if (mood.t <= 0) mood = null; }
    for (var i = ghost.length - 1; i >= 0; i--) { ghost[i].t -= dt; if (ghost[i].t <= 0) ghost.splice(i, 1); }
    if (swap > 0) {
      swap -= dt;
      if (swap <= 0 && !finished) loadBoard(live ? boardIx + 1 : 0);
    }
  }

  function end(ok) {
    if (finished) return;
    finished = true; cleared = ok;
    if (!lag) lag = 0.4;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
    if (ok) score += Math.round(timeLeft * 50) + (STAINS - stains) * 150;
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) {
      if (!told) return;
      state = S.ATTRACT; initGame(); demo.t = 0; return;
    }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || finished || primed > 0 || lag > 0) return;
    last = null; lastDir = 0;
    var r = rubAt(x, y, true);
    if (r === 'start') game.audio.play('se_tap', 0.25);
    else if (r === 'busy') game.audio.tone('C3', 0.03, { wave: 'square', volume: 0.04 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || finished || primed > 0 || lag > 0) return;
    var r = rubAt(x, y, true);
    if (r === 'rub' && scrub > 0.3) game.fx.burst(x, y, { color: G.k2, count: 1, speed: 90 });
  });
  game.onRelease(function() {
    if (state !== S.PLAYING) return;
    if (last) game.audio.tone('G3', 0.03, { wave: 'square', volume: 0.04 });
    last = null; lastDir = 0;
  });

  // ---- 描画 ----
  function bathhouse() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, G.k1], [0.5, G.k1], [0.52, G.k0], [1, G.k0]]);
    // 壁のタイル(市松)
    for (var ty = 0; ty < H * 0.18; ty += 40) for (var tx = ((ty / 40) % 2) * 40; tx < W; tx += 80) game.draw.rect(tx, ty, 40, 40, G.k2, 0.18);
    // 湯気
    for (var s = 0; s < 4; s++) {
      var sy = H * 0.7 - ((t * 60 + s * 90) % 240);
      game.draw.sprite(STEAM, { s: G.k3 }, W * 0.62 + s * 90 + Math.sin(t * 2 + s) * 14, sy, 14, { anchor: 'center', alpha: 0.4 });
    }
    // 番台
    game.draw.rect(0, H * 0.72, W, 26, G.k2);
    game.draw.rect(40, H * 0.74, W * 0.42, H * 0.12, G.k1);
    game.draw.rect(40, H * 0.74, W * 0.42, 10, G.k3);
  }

  function board() {
    var wd = GC * CELL, ht = GR * CELL;
    game.draw.rect(BX - 26, BY - 26, wd + 52, ht + 52, G.k2);
    game.draw.rect(BX - 14, BY - 14, wd + 28, ht + 28, G.k1);
    game.draw.rect(BX, BY, wd, ht, G.k0);
    for (var r = 0; r < GR; r++) for (var c = 0; c < GC; c++) {
      var v = chalk[r][c];
      if (v <= 0.02) continue;
      game.draw.rect(BX + c * CELL + 2, BY + r * CELL + 2, CELL - 4, CELL - 4, v > 0.5 ? G.k3 : G.k2, Math.min(1, 0.35 + v));
    }
    // 貼り紙(消してはいけない)
    var nr = noteRect();
    var near = warnT > 0;
    if (near) {
      var blink = Math.floor(game.time.elapsed * 12) % 2 === 0;
      for (var k = 0; k < 8; k++) {
        game.draw.rect(nr.x + k * nr.w / 8, nr.y - 24, 16, 16, blink ? G.k3 : G.k0);
        game.draw.rect(nr.x + k * nr.w / 8, nr.y + nr.h + 8, 16, 16, blink ? G.k3 : G.k0);
      }
      game.draw.rect(nr.x - 12, nr.y - 12, nr.w + 24, nr.h + 24, G.k3, blink ? 0.5 : 0.2);
    }
    game.draw.rect(nr.x, nr.y, nr.w, nr.h, G.k3);
    game.draw.rect(nr.x + 16, nr.y + 20, nr.w - 32, 22, G.k1);
    for (var l = 0; l < 3; l++) game.draw.rect(nr.x + 24, nr.y + 66 + l * 34, (nr.w - 48) * (l === 2 ? 0.6 : 1), 10, G.k1);
    game.draw.circle(nr.x + nr.w - 46, nr.y + nr.h - 40, 22, G.k1);
    game.draw.sprite(PIN, { p: G.k0 }, nr.x + 14, nr.y + 12, 8, { anchor: 'center' });
    game.draw.sprite(PIN, { p: G.k0 }, nr.x + nr.w - 14, nr.y + 12, 8, { anchor: 'center' });
    if (smear) {
      var g = 1 + (0.5 - smear.t) * 0.8;
      game.draw.circle(smear.x, smear.y, 50 * g, G.k3, 0.8);
      game.draw.circle(smear.x, smear.y, 30 * g, G.k1, 0.9);
    }
    // 残像(携帯機の液晶の尾)
    for (var i = 0; i < ghost.length; i++) {
      var gh = ghost[i];
      game.draw.sprite(ERASER, { b: G.k1, f: G.k2 }, gh.x, gh.y, 16, { anchor: 'center', alpha: gh.t * 1.5 });
    }
  }

  function owner() {
    var t = game.time.elapsed;
    var fr = Math.floor(t * 3) % 2 === 0 ? BOSS_A : BOSS_B;
    var dy = 0;
    if (mood && mood.k === 'yay') { fr = BOSS_YAY; dy = -Math.abs(Math.sin(t * 12)) * 20; }
    if (mood && mood.k === 'oops') dy = 14;
    if (finished && state !== S.ATTRACT) { fr = cleared ? BOSS_YAY : BOSS_A; dy = cleared ? -Math.abs(Math.sin(t * 12)) * 20 : 22; }
    game.draw.sprite(fr, BOSS_PAL, W * 0.2, H * 0.78 + dy, 15, { anchor: 'center' });
    // 進み: 3枚の黒板アイコン + 汚し回数
    for (var b = 0; b < BOARDS.length; b++) {
      var done = b < erasedTot;
      game.draw.rect(W * 0.52 + b * 140, H * 0.77, 110, 76, G.k3);
      game.draw.rect(W * 0.52 + b * 140 + 8, H * 0.77 + 8, 94, 60, done ? G.k2 : G.k0);
      if (b === boardIx && !done) game.draw.rect(W * 0.52 + b * 140 + 8, H * 0.77 + 60, 94 * Math.min(1, erasedFrac() / GOAL), 8, G.k3);
    }
    for (var s = 0; s < STAINS; s++) game.draw.sprite(PIN, { p: s < STAINS - stains ? G.k3 : G.k1 }, W * 0.55 + s * 70, H * 0.86, 14, { anchor: 'center' });
  }

  function bezel() {
    game.draw.rect(0, 0, W, 14, G.bezel);
    game.draw.rect(0, H - 14, W, 14, G.bezel);
    game.draw.rect(0, 0, 14, H, G.bezel);
    game.draw.rect(W - 14, 0, 14, H, G.bezel);
    game.draw.rect(14, 14, W - 28, 4, G.bezelLit, 0.6);
  }

  function drawHud() {
    chip(Math.round(Math.min(1, erasedFrac()) * 100) + '%', W / 2, 66, 60, G.k3);
    game.draw.text('SCORE ' + score, W - 44, 50, { size: 30, color: G.k3, bold: true, align: 'right' });
    game.draw.rect(60, 124, W - 120, 22, G.k0);
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 8) % 2;
    game.draw.rect(64, 128, (W - 128) * Math.max(0, timeLeft / TIME_LIMIT), 14, low ? G.k1 : G.k3);
  }

  function drawResult() {
    game.draw.rect(40, H * 0.2, W - 80, H * 0.4, G.k0, 0.9);
    game.draw.rect(52, H * 0.2 + 12, W - 104, 6, G.k2);
    chip(cleared ? 'CLEAR' : (stains >= STAINS ? 'GAME OVER' : 'TIME UP'), W / 2, H * 0.27, 104, G.k3);
    chip('SCORE ' + score, W / 2, H * 0.36, 60, G.k3);
    chip(erasedTot + ' / 3   MISS ' + stains, W / 2, H * 0.42, 44, G.k2);
    if (cleared && score > game.best) {
      if (Math.floor(resultT * 4) % 2 === 0) chip('NEW RECORD', W / 2, H * 0.49, 64, G.k3);
    } else {
      chip('BEST ' + Math.max(game.best, cleared ? score : 0), W / 2, H * 0.49, 42, G.k2);
    }
    if (!cleared) chip('あと' + Math.max(1, Math.round((1 - Math.min(1, erasedFrac())) * 100)) + '%!', W / 2, H * 0.55, 62, G.k3);
    if (told && Math.floor(game.time.elapsed * 2) % 2 === 0) chip('TAP TO CONTINUE', W / 2, H * 0.965, 34, G.k3);
  }

  // ---- ATTRACT: rubAt() で落書きの上を往復してこすり消す → 貼り紙に寄って汚す(失敗例) → 戻ってこする ----
  var demo = { t: 0, gx: W / 2, gy: H * 0.5, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.6;
    if (cyc < dt || demo.t <= dt) { initGame(); primed = 0; }
    stepBoard(dt, false);
    var sp1 = SPOTS[0], sp2 = SPOTS[1];
    var cx, cy;
    if (cyc < 2.6) { cx = BX + sp1[0] * CELL; cy = BY + sp1[1] * CELL; }
    else if (cyc < 3.7) {
      var nr = noteRect();
      var k = (cyc - 2.6) / 1.1;
      cx = BX + sp1[0] * CELL + (nr.x + nr.w / 2 - BX - sp1[0] * CELL) * k;
      cy = BY + sp1[1] * CELL + (nr.y + nr.h / 2 - BY - sp1[1] * CELL) * k;
    } else { cx = BX + sp2[0] * CELL; cy = BY + sp2[1] * CELL; }
    var wig = Math.sin(demo.t * 22) * 110;
    var tx = cx + wig, ty = cy + Math.sin(demo.t * 3) * 60;
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 18);
    demo.gy += (ty - demo.gy) * Math.min(1, dt * 18);
    demo.press = cyc > 0.3 && !(cyc > 3.7 && cyc < 4.0);
    if (demo.press) rubAt(demo.gx, demo.gy, false);
    else last = null;
  }

  // ---- メインループ ----
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      bathhouse();
      board();
      owner();
      game.draw.sprite(ERASER, { b: G.k1, f: G.k3 }, demo.gx, demo.gy, 16, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy + 20, { press: demo.press, scale: 14 });
      chip(GAME_TITLE, W / 2, H * 0.07 + Math.sin(game.time.elapsed * 2) * 4, 90, G.k3);
      chip('HI-SCORE ' + game.best, W / 2, H * 0.125, 38, G.k2);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) chip('► 100円 投入 ◄', W / 2, H * 0.955, 44, G.k3);
      else chip('INSERT COIN', W / 2, H * 0.955, 40, G.k2);
      bezel();
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
      bathhouse(); board(); owner(); drawHud();
      if (cleared && Math.floor(resultT * 6) !== Math.floor((resultT - dt) * 6)) {
        game.fx.burst(game.random(140, W - 140), game.random(H * 0.22, H * 0.58), { color: [G.k3, G.k2][Math.floor(game.random(0, 2)) % 2], count: 16, speed: 420 });
      }
      drawResult();
      bezel();
      if (!told && resultT >= 1.3) {
        told = true;
        var st = { boards: erasedTot, stains: stains, erasedPct: Math.round(Math.min(1, erasedFrac()) * 100) };
        if (cleared) game.end.success(score, st); else game.end.failure(st);
      }
      return;
    }

    if (lag > 0) {
      lag -= dt;
      if (smear) smear.t = Math.max(0.1, smear.t - dt * 0.3);
      if (lag <= 0 && finished) { state = S.RESULT; resultT = 0; }
    } else if (finished) {
      state = S.RESULT; resultT = 0;
    } else if (primed > 0) {
      primed -= dt;
      if (primed <= 0) game.audio.play('se_tap', 0.4);
    } else {
      timeLeft -= dt;
      stepBoard(dt, true);
      if (timeLeft < 3) {
        tickT -= dt;
        if (tickT <= 0) { tickT = 0.4; game.audio.tone('A5', 0.04, { wave: 'square', volume: 0.07 }); }
      }
      if (timeLeft <= 0 && !finished) {
        timeLeft = 0;
        var nr = noteRect();
        smear = { x: nr.x + nr.w / 2, y: nr.y + nr.h + 80, t: 0.5 };
        game.feedback.bad(W / 2, BY + GR * CELL / 2, { text: 'TIME UP', size: 66 });
        lag = 0.5;
        end(false);
      }
    }

    bathhouse();
    board();
    owner();
    if (game.input.pressing && state === S.PLAYING && !finished) game.draw.sprite(ERASER, { b: G.k1, f: G.k3 }, game.input.x, game.input.y, 16, { anchor: 'center' });
    drawHud();
    if (primed > 0) chip(primed > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 110, G.k3);
    bezel();
  });

  game.onStart(function() {
    game.audio.melody([
      ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['F5', 0.5], ['D5', 0.5], ['C5', 1],
      ['A4', 0.5], ['C5', 0.5], ['D5', 0.5], ['G4', 0.5], ['C5', 2],
    ], { tempo: 132, wave: 'square', volume: 0.045, loop: true, bass: [['C3', 2], ['F2', 2], ['G2', 2], ['C3', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

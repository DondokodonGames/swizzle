// I-GBA-0041v2-classroom-window-peel.js
// 窓かざり剥がし — 窓ガラスの紙飾りの剥がれかけた端を見極め、その向きへ一気に払ってぺりっと剥がす
// 操作: 紙飾りの上から、白くめくれている端の方向(上下左右)へ素早くスワイプする。逆へ払うと紙が破れる。透明なテープの端はめくれではない。扇風機の風でめくれがぱたぱた入れ替わる飾りは今めくれている側へ
// 終わり: 3枚の窓(飾り3→3→4枚)を14秒以内に剥がし切ればCLEAR。3回破る/時間切れでGAME OVER
// @mechanic: swipe_direction
// @theme: after_summer_classroom_window_cutouts
// 世界観: 夏休み明けの教室で、日直が窓ガラスに貼られたままの紙飾りを、剥がれかけの向きへ一気に払ってきれいに剥がしていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 剥がした枚数・破った回数・残り秒のスコア
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: 影・グラデを使わないベタ塗り数色、丸角、大きい余白、アイコン的な形。判定は色の変化で示す
  var STYLE = { bg: ['#eaf4f8', '#d6eaf2'], main: ['#ff7a59', '#ffc93c', '#3dc7a0'], accent: ['#4a6cf7', '#ffffff'] };
  var F = {
    bg: STYLE.bg[0], glass: STYLE.bg[1], red: STYLE.main[0], yellow: STYLE.main[1], green: STYLE.main[2], blue: STYLE.accent[0], white: STYLE.accent[1],
    frame: '#8a9bb0', ink: '#2b3445', board: '#2f5d50', tape: '#cfe3ff', ng: '#f2475a', wall: '#f6efe2', floor: '#d9b98c',
  };
  var PAPER = [F.red, F.yellow, F.green, F.blue, '#b07cf0'];
  var DIRS = ['up', 'right', 'down', 'left'];
  var DV = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };

  var GAME_TITLE = 'PEEL PEEL';
  var TIME_LIMIT = 14;
  var WINDOWS = [
    { n: 3, curl: 1.0, tape: 0, flip: 0 },
    { n: 3, curl: 0.65, tape: 2, flip: 0 },
    { n: 4, curl: 0.6, tape: 1, flip: 2 },
  ];
  var NEEDED = 10;
  var MISS_MAX = 3;
  var SPOTS = [[300, 0.30], [780, 0.30], [300, 0.52], [780, 0.52]];
  var SIZE = 200;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var win, cfg, decos, pressAt, peeled, tears, combo, maxCombo, lastPeel, score;
  var timeLeft, readyT, winT, stopT, stopObj, fin, cleared, postT, warnT, swingT, oopsT, cheerT, playT, finalScore, flyers;

  // 日直(腕章の生徒)
  var KID_A = ['..kkkkkk..', '.kkkkkkkk.', '.kffffffk.', '..fkffkf..', '..ffffff..', '...fkkf...', '.wwwwwwww.', 'wwwwyywwww', 'w.bbbbbb.w', '..bb..bb..'];
  var KID_B = ['..kkkkkk..', '.kkkkkkkk.', '.kffffffk.', '..fkffkf..', '..ffffff..', '...fkkf...', '.wwwwwwww.', 'wwwwyywwww', '..bbbbbb..', '.bb....bb.'];
  var KID_SW = ['..kkkkkk..', '.kkkkkkkk.', '.kffffffk.', '..fkffkf..', '..ffffff..', '...ffff..f', '.wwwwwwwf.', 'wwwwyywww.', '..bbbbbb..', '..bb..bb..'];
  var KID_OOPS = ['.k.kkkk.k.', '.kkkkkkkk.', '.kffffffk.', '..fkffkf..', '..ffffff..', '...fkkf...', 'fwwwwwwwwf', '.wwwyywww.', '..bbbbbb..', '..bb..bb..'];
  var KID_JOY = ['f.kkkkkk.f', 'fkkkkkkkkf', '.kffffffk.', '..fkffkf..', '..ffffff..', '..fkkkkf..', '.wwwwwwww.', '.wwwyywww.', '..bbbbbb..', '..bb..bb..'];
  var KID_PAL = { k: '#2b3445', f: '#f6cfa8', w: '#ffffff', y: '#ffc93c', b: '#4a6cf7' };

  function out(str, x, y, sz, color) {
    game.draw.text(str, x, y + 4, { size: sz, color: '#2b344533', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function setupWindow(i) {
    cfg = WINDOWS[i];
    decos = [];
    var order = [0, 1, 2, 3];
    for (var a = 3; a > 0; a--) { var b = Math.min(a, Math.floor(game.random(0, a + 1))); var tmp = order[a]; order[a] = order[b]; order[b] = tmp; }
    for (var k = 0; k < cfg.n; k++) {
      var sp = SPOTS[order[k]];
      var d = DIRS[Math.floor(game.random(0, 4)) % 4];
      var tapeDir = null;
      if (k < cfg.tape) { var td = (DIRS.indexOf(d) + 1 + Math.floor(game.random(0, 3))) % 4; tapeDir = DIRS[td]; }
      var flipTo = k >= cfg.n - cfg.flip ? DIRS[(DIRS.indexOf(d) + 2) % 4] : null;
      decos.push({
        x: sp[0] + game.random(-24, 24), y: Math.round(H * sp[1]) + game.random(-20, 20), dir: d, alt: flipTo, flipT: 0.9, warn: 0,
        tape: tapeDir, kind: Math.floor(game.random(0, 4)) % 4, col: PAPER[(k + i * 2) % PAPER.length], gone: false, shake: 0, ph: game.random(0, 6), torn: 0,
      });
    }
    pressAt = null;
  }

  function initGame() {
    win = 0; peeled = 0; tears = 0; combo = 0; maxCombo = 0; lastPeel = -9; score = 0;
    timeLeft = TIME_LIMIT; readyT = 0.8; winT = 0; stopT = 0; stopObj = null; fin = false; cleared = false;
    postT = 0; warnT = 0; swingT = 0; oopsT = 0; cheerT = 0; playT = 0; finalScore = 0; flyers = [];
    setupWindow(0);
  }

  function left() { var n = 0; for (var i = 0; i < decos.length; i++) if (!decos[i].gone) n++; return n; }

  function pickDeco(x, y) {
    var best = null, bd = 1e9;
    for (var i = 0; i < decos.length; i++) {
      var d = decos[i];
      if (d.gone) continue;
      var dist = x === null ? i : Math.hypot(d.x - x, d.y - y);
      if (dist < bd) { bd = dist; best = d; }
    }
    return best;
  }

  // 払い1回の判定(本番・デモ共通)
  function peel(dirName, x, y) {
    var d = pickDeco(x, y);
    swingT = 0.3;
    if (!d) { game.audio.play('se_tap', 0.08); return; }
    if (dirName === d.dir) {
      d.gone = true;
      flyers.push({ x: d.x, y: d.y, vx: DV[dirName][0] * 1500, vy: DV[dirName][1] * 1500 - 200, rot: 0, life: 0.6, d: d });
      peeled++;
      var now = game.time.elapsed;
      combo = now - lastPeel < 1.2 ? combo + 1 : 1;
      lastPeel = now;
      if (combo > maxCombo) maxCombo = combo;
      var tricky = d.alt !== null || d.tape !== null;
      var pts = (tricky ? 150 : 100) * Math.min(4, combo);
      score += pts;
      game.feedback.good(d.x, d.y, { text: combo >= 3 ? 'x' + combo : (tricky ? 'NICE' : 'GOOD'), color: F.green, size: 60 });
      game.audio.tone('C6', 0.08, { wave: 'sawtooth', volume: 0.05, slide: -1200 });
      game.fx.popup('+' + pts, d.x, d.y - 150, { color: F.blue, size: 42 });
      if (left() === 0) {
        winT = 0.85; cheerT = 0.85;
        game.audio.play('se_milestone', 0.45);
        game.fx.popup('NICE', W / 2, H * 0.41, { color: F.yellow, size: 92 });
      }
      return;
    }
    tears++; combo = 0; oopsT = 0.7; d.shake = 0.35; d.torn++;
    game.audio.tone('G2', 0.14, { wave: 'sawtooth', volume: 0.08, slide: -40 });
    if (mode === S.PLAYING && tears >= MISS_MAX) {
      stopT = 0.45; stopObj = { kind: 'tear', d: d, x: d.x, y: d.y };
      game.fx.flash('#ffffff', 0.12);
      return;
    }
    game.feedback.bad(d.x, d.y, { text: 'MISS', color: F.ng, size: 58 });
  }

  // 扇風機の風でめくれが入れ替わる(0.3秒前に予告)
  function stepDecos(dt) {
    for (var i = 0; i < decos.length; i++) {
      var d = decos[i];
      if (d.shake > 0) d.shake -= dt;
      if (d.gone || !d.alt) continue;
      d.flipT -= dt;
      if (d.flipT <= 0.3 && d.warn <= 0) { d.warn = 0.3; game.audio.tone('E6', 0.04, { wave: 'triangle', volume: 0.05 }); }
      if (d.warn > 0) d.warn -= dt;
      if (d.flipT <= 0) { var tmp = d.dir; d.dir = d.alt; d.alt = tmp; d.flipT = game.random(0.8, 1.1); d.warn = 0; }
    }
    for (var f = flyers.length - 1; f >= 0; f--) {
      var q = flyers[f];
      q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 1800 * dt; q.rot += dt * 8;
      if (q.life <= 0) flyers.splice(f, 1);
    }
    if (swingT > 0) swingT -= dt;
    if (oopsT > 0) oopsT -= dt;
    if (cheerT > 0) cheerT -= dt;
  }

  function ending(won) {
    if (fin) return;
    fin = true; cleared = won; postT = 1.4;
    finalScore = score + (won ? Math.ceil(timeLeft) * 40 : 0);
    game.audio.stopBgm();
    game.audio.play(won ? 'se_success' : 'se_failure', 0.55);
    if (won) {
      for (var i = 0; i < 6; i++) game.fx.burst(160 + i * 150, H * 0.4 + (i % 2) * 220, { color: PAPER[i % 5], count: 18, speed: 520 });
      game.fx.flash(F.white, 0.25);
    }
  }

  function resolveStop() {
    if (!stopObj) return;
    var o = stopObj;
    stopObj = null;
    if (o.kind === 'win') { ending(true); return; }
    game.feedback.bad(o.x, o.y, { text: o.kind === 'time' ? 'TIME UP' : 'MISS', color: F.ng, size: 60 });
    ending(false);
  }

  // ---- 入力 ----
  function canPlay() { return mode === S.PLAYING && !fin && stopT <= 0 && readyT <= 0 && winT <= 0; }

  game.onPress(function(x, y) {
    if (!canPlay()) return;
    pressAt = { x: x, y: y };
    game.audio.tone('A5', 0.03, { wave: 'triangle', volume: 0.04 });
  });
  game.onSwipe(function(dir) {
    if (!canPlay()) return;
    var p = pressAt;
    pressAt = null;
    peel(dir, p ? p.x : null, p ? p.y : null);
    if (Math.random() < 0.5) game.fx.burst(W / 2, H * 0.4, { color: F.white, count: 2, speed: 80 });
  });
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { mode = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (!canPlay()) return;
    var d = pickDeco(x, y);
    if (d) { d.shake = 0.15; game.audio.play('se_tap', 0.1); }
  });

  // ---- 描画 ----
  function classroom(t) {
    game.draw.gradient(0, H, [[0, F.wall], [1, F.wall]]);
    // 窓枠とガラス(空と雲が見える)
    var top = Math.round(H * 0.17), bot = Math.round(H * 0.66);
    game.draw.rect(60, top - 20, W - 120, bot - top + 40, F.frame);
    game.draw.rect(80, top, W - 160, bot - top, '#bfe3f5');
    for (var c = 0; c < 3; c++) { var cx = 160 + ((c * 340 + t * 20) % 900); game.draw.circle(cx, top + 120 + c * 90, 50, F.white); game.draw.circle(cx + 60, top + 120 + c * 90, 40, F.white); }
    game.draw.rect(80, Math.round((top + bot) / 2) - 10, W - 160, 20, F.frame);
    game.draw.rect(530, top, 20, bot - top, F.frame);
    // 窓の下: 黒板の端と扇風機
    game.draw.rect(0, bot + 40, W, 30, '#c9a97a');
    game.draw.rect(0, bot + 70, W, H, F.floor);
    for (var r = 0; r < 6; r++) game.draw.rect(0, bot + 140 + r * 90, W, 6, '#c9a97a');
    var fx = 920, fy = bot + 120;
    game.draw.rect(fx - 8, fy, 16, 160, F.frame);
    game.draw.circle(fx, fy, 70, F.frame);
    game.draw.circle(fx, fy, 60, F.white);
    for (var b = 0; b < 3; b++) { var ba = t * 14 + b * 2.09; game.draw.circle(fx + Math.cos(ba) * 30, fy + Math.sin(ba) * 30, 24, F.blue); }
    game.draw.circle(fx, fy, 12, F.ink);
  }

  function shape(d, x, y, s, col) {
    var r = SIZE / 2 * s;
    if (d.kind === 0) { // 花
      for (var k = 0; k < 5; k++) { var a = k / 5 * Math.PI * 2; game.draw.circle(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * 0.45, col); }
      game.draw.circle(x, y, r * 0.3, F.white);
    } else if (d.kind === 1) { // 太陽
      for (var j = 0; j < 8; j++) { var b = j / 8 * Math.PI * 2; game.draw.line(x, y, x + Math.cos(b) * r, y + Math.sin(b) * r, col, 22 * s); }
      game.draw.circle(x, y, r * 0.6, col);
      game.draw.circle(x - r * 0.2, y - r * 0.1, r * 0.08, F.ink);
      game.draw.circle(x + r * 0.2, y - r * 0.1, r * 0.08, F.ink);
    } else if (d.kind === 2) { // 魚
      game.draw.circle(x - r * 0.1, y, r * 0.55, col);
      game.draw.circle(x + r * 0.3, y, r * 0.42, col);
      game.draw.line(x - r * 0.6, y, x - r, y - r * 0.4, col, 30 * s);
      game.draw.line(x - r * 0.6, y, x - r, y + r * 0.4, col, 30 * s);
      game.draw.circle(x + r * 0.45, y - r * 0.1, r * 0.08, F.ink);
    } else { // 風船
      game.draw.circle(x, y - r * 0.15, r * 0.7, col);
      game.draw.line(x, y + r * 0.55, x + r * 0.15, y + r, F.ink, 4);
      game.draw.circle(x - r * 0.25, y - r * 0.4, r * 0.14, F.white);
    }
  }

  function drawDeco(d, t) {
    if (d.gone) return;
    var big = stopObj && stopT > 0 && stopObj.d === d;
    var s = big ? 1.3 : 1;
    var sx = d.shake > 0 ? Math.sin(d.shake * 60) * 10 : 0;
    var x = d.x + sx, y = d.y, r = SIZE / 2 * s;
    // 狙える物: 白い縁がゆっくり脈打つ
    game.draw.circle(x, y, r + 22 + Math.sin(t * 6 + d.ph) * 5, F.white, 0.7);
    shape(d, x, y, s, big && Math.floor(t * 16) % 2 === 0 ? F.white : d.col);
    for (var k = 0; k < d.torn; k++) game.draw.line(x - r * 0.3 + k * 20, y - r * 0.5, x + r * 0.1 + k * 20, y + r * 0.4, F.ink, 4);
    // テープ(透明な帯 = めくれではない)
    if (d.tape) {
      var tv = DV[d.tape];
      var tx = x + tv[0] * r * 0.9, ty = y + tv[1] * r * 0.9;
      if (tv[0] !== 0) game.draw.rect(tx - 20, ty - 50, 40, 100, F.tape, 0.75);
      else game.draw.rect(tx - 50, ty - 20, 100, 40, F.tape, 0.75);
      game.draw.rect(tx - 6, ty - 6, 12, 12, F.white, 0.8);
    }
    // めくれた端(白い裏面がのぞく)
    var v = DV[d.dir];
    var wob = d.warn > 0 ? Math.sin(t * 50) * 10 : Math.sin(t * 5 + d.ph) * 3;
    var lift = (34 + wob) * cfg.curl * s;
    var ex = x + v[0] * r * 0.95, ey = y + v[1] * r * 0.95;
    var px = -v[1], py = v[0];
    game.draw.line(ex + px * r * 0.45, ey + py * r * 0.45, ex - px * r * 0.45, ey - py * r * 0.45, d.col, 30 * s);
    game.draw.line(ex + px * r * 0.4 + v[0] * lift, ey + py * r * 0.4 + v[1] * lift, ex - px * r * 0.4 + v[0] * lift, ey - py * r * 0.4 + v[1] * lift, F.white, 34 * cfg.curl * s + 8);
    game.draw.line(ex + px * r * 0.4, ey + py * r * 0.4, ex + px * r * 0.4 + v[0] * lift, ey + py * r * 0.4 + v[1] * lift, F.frame, 4);
    game.draw.line(ex - px * r * 0.4, ey - py * r * 0.4, ex - px * r * 0.4 + v[0] * lift, ey - py * r * 0.4 + v[1] * lift, F.frame, 4);
    if (d.alt && d.warn > 0) {
      for (var w = 0; w < 3; w++) game.draw.line(x + r + 30, y - 40 + w * 40, x + r + 90, y - 40 + w * 40, F.blue, 6);
    }
  }

  function drawFlyers() {
    for (var i = 0; i < flyers.length; i++) {
      var q = flyers[i];
      shape(q.d, q.x, q.y, 0.7 + Math.sin(q.rot) * 0.2, q.d.col);
    }
  }

  function drawKid(t) {
    var fr;
    if (oopsT > 0) fr = KID_OOPS;
    else if (cheerT > 0 || (fin && cleared)) fr = KID_JOY;
    else if (swingT > 0) fr = KID_SW;
    else fr = Math.floor(t * 2.5) % 2 ? KID_A : KID_B;
    var hop = cheerT > 0 ? -Math.abs(Math.sin(t * 14)) * 24 : Math.sin(t * 3) * 4;
    game.draw.sprite(fr, KID_PAL, 230, H * 0.84 + hop, 18, { anchor: 'center' });
  }

  function drawHud(t) {
    var lowT = timeLeft < 4 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(70, 36, W - 140, 26, '#dfe5ec');
    game.draw.rect(70, 36, (W - 140) * Math.max(0, timeLeft / TIME_LIMIT), 26, lowT ? F.ng : F.blue);
    out(peeled + ' / ' + NEEDED, W / 2, 116, 50, F.ink);
    for (var w = 0; w < WINDOWS.length; w++) {
      var done = w < win || (w === win && winT > 0) || (fin && cleared);
      game.draw.rect(90 + w * 70, 156, 46, 40, done ? F.green : (w === win ? F.yellow : '#dfe5ec'));
    }
    for (var m = 0; m < MISS_MAX; m++) game.draw.circle(W - 110 - m * 64, 176, 20, m < tears ? F.ng : '#dfe5ec');
    out('' + score, W - 240, 116, 34, F.blue);
    var n = cfg.n, l = left();
    for (var i = 0; i < n; i++) game.draw.rect(W / 2 + 80 + i * 70, H * 0.86, 50, 50, i < n - l ? F.green : d0col(i));
  }
  function d0col(i) { return decos[i] ? decos[i].col : F.frame; }

  function drawScene(t) {
    classroom(t);
    for (var i = 0; i < decos.length; i++) drawDeco(decos[i], t);
    drawFlyers();
    drawKid(t);
    for (var sl = 0; sl < H; sl += 8) game.draw.rect(0, sl, W, 2, '#000000', 0.035);
  }

  // ---- ATTRACT: 本物の peel() で めくれの向きへ2枚払う → 逆へ払って破る → 正しい向きで剥がす ----
  var demo = { t: 0, gx: W / 2, gy: H * 0.75, press: false, k: 0, sw: null };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.2;
    if (cyc < dt || demo.t <= dt) {
      initGame(); readyT = 0; setupWindow(1);
      demo.k = 0; demo.sw = null;
    }
    stepDecos(dt);
    var plan = [0.4, 1.3, 2.3, 3.2];
    demo.press = false;
    var target = null;
    for (var i = 0; i < decos.length; i++) if (!decos[i].gone) { target = decos[i]; break; }
    if (!demo.sw && target && demo.k < plan.length && cyc > plan[demo.k]) {
      var dn = demo.k === 2 ? DIRS[(DIRS.indexOf(target.dir) + 2) % 4] : target.dir;
      var v = DV[dn];
      demo.sw = { x0: target.x - v[0] * 60, y0: target.y - v[1] * 60, x1: target.x + v[0] * 220, y1: target.y + v[1] * 220, t: 0, dir: dn, d: target };
    }
    if (demo.sw) {
      var w = demo.sw;
      w.t += dt;
      var k = Math.min(1, w.t / 0.22);
      demo.gx = w.x0 + (w.x1 - w.x0) * k; demo.gy = w.y0 + (w.y1 - w.y0) * k;
      demo.press = true;
      if (k >= 1) { peel(w.dir, w.d.x, w.d.y); demo.sw = null; demo.k++; }
    } else if (target) {
      demo.gx += (target.x - demo.gx) * Math.min(1, dt * 6);
      demo.gy += (target.y - demo.gy) * Math.min(1, dt * 6);
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      out(GAME_TITLE, W / 2, H * 0.055 + Math.sin(t * 2) * 5, 96, F.red);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.098, 38, F.ink);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.955, 48, F.red);
      else out('TAP TO START', W / 2, H * 0.955, 40, F.ink);
      return;
    }

    if (mode === S.RESULT) {
      stepDecos(dt);
      drawScene(t);
      game.draw.rect(90, H * 0.30, W - 180, 500, F.white);
      out(cleared ? 'CLEAR' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.34, 96, cleared ? F.green : F.ng);
      out('SCORE ' + finalScore, W / 2, H * 0.40, 60, F.ink);
      out(peeled + ' / ' + NEEDED + '   x' + maxCombo, W / 2, H * 0.45, 44, F.blue);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.50, 56, F.red);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.50, 42, F.ink);
      if (!cleared) out('あと' + (NEEDED - peeled) + '枚!', W / 2, H * 0.27, 60, F.red);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.955, 40, F.ink);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      stepDecos(dt);
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { peeled: peeled, tears: tears, maxCombo: maxCombo, windows: win + (cleared ? 1 : 0) };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) resolveStop();
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else if (winT > 0) {
      winT -= dt;
      stepDecos(dt);
      if (winT <= 0) {
        if (win >= WINDOWS.length - 1) {
          stopT = 0.4; stopObj = { kind: 'win' };
          game.audio.play('se_powerup', 0.4);
        } else {
          win++;
          setupWindow(win);
          game.audio.play('se_jump', 0.3);
        }
      }
    } else {
      timeLeft -= dt; playT += dt;
      stepDecos(dt);
      if (timeLeft < 4) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.06, { wave: 'square', volume: 0.07 }); }
      }
      if (timeLeft <= 0 && stopT <= 0 && !fin) {
        timeLeft = 0;
        var rem = pickDeco(null, null);
        stopT = 0.45; stopObj = { kind: 'time', d: rem, x: rem ? rem.x : W / 2, y: rem ? rem.y : H * 0.4 };
        game.audio.tone('C4', 0.3, { wave: 'square', volume: 0.1, slide: -120 });
      }
    }

    drawScene(t);
    if (stopObj && stopObj.kind === 'win' && stopT > 0) game.draw.rect(80, H * 0.17, W - 160, H * 0.49, F.white, 0.6 * stopT / 0.4);
    if (!fin && readyT <= 0 && win === 0 && peeled === 0 && playT < 1.6) {
      var d0 = pickDeco(null, null);
      if (d0) { var v0 = DV[d0.dir], u = (playT * 1.8) % 1; game.draw.hand(d0.x + v0[0] * u * 220, d0.y + v0[1] * u * 220, { press: true, scale: 12, alpha: 0.5 }); }
    }
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.41, 120, F.red);
  });

  game.onStart(function() {
    game.audio.melody([
      ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 1], ['C5', 1],
      ['D5', 0.5], ['E5', 0.5], ['F5', 0.5], ['A5', 0.5], ['G5', 2],
      ['E5', 0.5], ['G5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 1],
    ], { tempo: 144, wave: 'square', volume: 0.05, loop: true, bass: [['C3', 2], ['G2', 2], ['F2', 2], ['G2', 2], ['A2', 2], ['G2', 1], ['C3', 1]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);

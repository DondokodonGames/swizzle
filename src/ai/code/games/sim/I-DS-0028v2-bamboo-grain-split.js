// I-DS-0028v2-bamboo-grain-split.js
// 青竹の筋割り — 立てた青竹の光る筋に沿って、上の割れ口から下まで素早い一筆を引き、まっすぐ縦に割っていく
// 操作: 竹の上端の割れ口(光る切れ目)から指を下へ素早くなぞる。筋の両脇の線からはみ出すと割れがそれて失敗。節(横の輪)はゆっくりだと刃が止まるので、止まったら割れ目の先から引き直す
// 終わり: 1本の青竹を半割り→四つ割り(計7回)まで割り終えればCLEAR(それは1回まで)。割れを2回それさせる、または15秒を超えるとGAME OVER
// @mechanic: slice
// @theme: bamboo_grove_basket_splitting
// 世界観: 竹林の中の籠工房で、籠職人の爺さんが切り出したばかりの青竹を割り台に立て、繊維の筋に沿って一気に刃を走らせ、半分、また半分と籠ひご用の細い割り竹にしていく(割るほど細く、筋もうねる)
// 残るもの: 正誤(CLEAR/GAME OVER) + 割れた回数・一筆割りの数・スコア
// スタイル: 2000s BILLBOARD 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s BILLBOARD 3D: 板(sprite)を距離でスケール、真下に楕円の接地影、奥ほど彩度を落とす
  var STYLE = { bg: ['#cfe8c8', '#6a9a5a'], main: ['#3aa04a', '#f2eac8', '#8a6a3a'], accent: ['#ffd23a', '#e84a3a'] };
  var V = {
    green: STYLE.main[0], greenDk: '#1e6a2a', greenHi: '#8ad87a', flesh: STYLE.main[1], wood: STYLE.main[2], gold: STYLE.accent[0], red: STYLE.accent[1],
    ink: '#1a2a1a', shadow: '#000000', far: '#9ab89a', mid: '#6aa06a', white: '#ffffff',
  };

  var GAME_TITLE = 'TAKE WARI';
  var TIME_LIMIT = 15;
  var MISS_MAX = 2;
  var NODE_SPEED = 1000;
  var CX = W / 2, TOP = Math.round(H * 0.27), BOT = Math.round(H * 0.75), PW = 250;
  // 割る順: 丸竹→半割り×2→四つ割り×4。筋のうねり幅と許容帯が段々きつくなる
  var TASKS = [
    { look: 'pole', band: 62, amp: 0, waves: 1, nodes: [0.36, 0.7] },
    { look: 'half', band: 54, amp: 30, waves: 1, nodes: [0.3, 0.62] },
    { look: 'half', band: 50, amp: 42, waves: 1.5, nodes: [0.36, 0.7] },
    { look: 'quarter', band: 46, amp: 48, waves: 1.5, nodes: [0.25, 0.52, 0.78] },
    { look: 'quarter', band: 44, amp: 54, waves: 2, nodes: [0.3, 0.6, 0.84] },
    { look: 'quarter', band: 42, amp: 58, waves: 2, nodes: [0.22, 0.5, 0.76] },
    { look: 'quarter', band: 40, amp: 62, waves: 2.5, nodes: [0.3, 0.58, 0.82] },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var task, cfg, phase0, crack, pen, trail, phase, phaseT, ruinX, splits, oneStroke, runs, score, finalScore, strips;
  var timeLeft, readyT, stopT, stopKind, fin, cleared, postT, joyT, sadT, warnT, playT, nodeFlash;

  // 籠職人の爺さん(鉢巻・竹割り包丁)
  var OLD_A = ['..wwwwww..', '.whhhhhhw.', '..ssssss..', '..skssks..', '..ssssss..', '..sbbbbs..', '.cccccccc.', 'scccccccct', '.cccccccct', '..pppppp.t', '..pp..pp..'];
  var OLD_B = ['..wwwwww..', '.whhhhhhw.', '..ssssss..', '..skssks..', '..ssssss..', '..sbbbbs..', '.cccccccc.', '.ccccccccs', 'scccccccct', '..pppppp.t', '..pp..pp..'];
  var OLD_JOY = ['s.wwwwww.s', 'swhhhhhhws', '..ssssss..', '..s.ss.s..', '..ssssss..', '..sbrrbs..', '.cccccccc.', '.cccccccc.', '.cccccccc.', '..pppppp..', '..pp..pp..'];
  var OLD_SAD = ['..........', '..wwwwww..', '.whhhhhhw.', '..ssssss..', '..skssks..', '..skkkks..', '.cccccccc.', 'scccccccct', '.cccccccc.', '..pppppp..', '..pp..pp..'];
  var OLD_PAL = { w: '#ffffff', h: '#e84a3a', s: '#e8b890', k: '#1a2a1a', b: '#c8c8c8', r: '#c84a3a', c: '#3a5a8a', p: '#2a3a5a', t: '#c8ccd4' };
  var LEAF = ['..g.', '.gg.', 'gg..'];

  function out(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#00000055', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function grainX(y) {
    var u = (y - TOP) / (BOT - TOP);
    return CX + cfg.amp * Math.sin(u * Math.PI * cfg.waves + phase0);
  }
  function nodeY(k) { return TOP + (BOT - TOP) * cfg.nodes[k]; }

  function setupTask(k) {
    task = k; cfg = TASKS[k]; phase0 = game.random(0, Math.PI * 2);
    crack = TOP; pen = null; trail = []; phase = 'split'; phaseT = 0; ruinX = 0; oneStroke = true; nodeFlash = -1;
  }

  function initGame() {
    splits = 0; runs = 0; score = 0; finalScore = 0; strips = 0;
    timeLeft = TIME_LIMIT; readyT = 0.8; stopT = 0; stopKind = ''; fin = false; cleared = false; postT = 0;
    joyT = 0; sadT = 0; warnT = 0; playT = 0;
    setupTask(0);
  }

  // 刃を当てる: 割れ目の先(最初は上端の割れ口)の近くからだけ始められる
  function penDown(x, y) {
    if (phase !== 'split') return false;
    var tipY = crack;
    if (Math.abs(y - tipY) > 110 || Math.abs(x - grainX(Math.max(TOP, tipY))) > 110) return false;
    if (crack > TOP + 4) oneStroke = false;
    pen = { x: x, y: y, dead: false };
    trail = [{ x: x, y: y, t: game.time.elapsed }];
    return true;
  }

  function penSpeed(x, y) {
    var now = game.time.elapsed, old = trail[0];
    for (var i = trail.length - 1; i >= 0; i--) { old = trail[i]; if (now - trail[i].t > 0.06) break; }
    return Math.max(0, y - old.y) / Math.max(1 / 60, now - old.t);
  }

  // なぞりの1区間(本番もデモも同じ処理)
  function penTo(x, y) {
    if (!pen || pen.dead || phase !== 'split') return;
    trail.push({ x: x, y: y, t: game.time.elapsed });
    if (y <= crack) { pen.x = x; pen.y = y; return; }
    var spd = penSpeed(x, y);
    // 節: 遅いと刃が止まる
    for (var k = 0; k < cfg.nodes.length; k++) {
      var ny = nodeY(k);
      if (crack < ny && y >= ny) {
        if (spd < NODE_SPEED) {
          crack = ny - 6; pen.dead = true; oneStroke = false;
          nodeFlash = k;
          game.audio.tone('C3', 0.08, { wave: 'square', volume: 0.08 });
          game.fx.burst(grainX(ny), ny, { color: V.wood, count: 6, speed: 160 });
          return;
        }
        game.audio.tone(660 + k * 180, 0.05, { wave: 'square', volume: 0.06 });
        game.fx.burst(grainX(ny), ny, { color: V.flesh, count: 8, speed: 260 });
      }
    }
    // 筋からのはみ出し
    var dev = x - grainX(y);
    if (Math.abs(dev) > cfg.band) { runOut(x, y, dev); return; }
    if (Math.abs(dev) > cfg.band * 0.7 && Math.random() < 0.3) game.audio.tone('A5', 0.03, { wave: 'square', volume: 0.05 });
    crack = Math.min(BOT, y);
    pen.x = x; pen.y = y;
    if (crack >= BOT - 24) splitDone();
  }

  function splitDone() {
    phase = 'done'; phaseT = 0; pen = null;
    splits++; strips = Math.min(8, strips + 1); joyT = 0.6;
    var pts = oneStroke ? 300 : 150;
    score += pts;
    game.feedback.good(CX, (TOP + BOT) / 2, { text: oneStroke ? 'PERFECT' : 'GOOD', color: V.gold, size: 64 });
    game.audio.play('se_break', 0.35);
    game.fx.popup('+' + pts, CX + 200, TOP + 120, { color: V.gold, size: 44 });
    if (mode === S.PLAYING && splits === 3) { game.audio.play('se_milestone', 0.45); game.fx.popup('NICE', W / 2, H * 0.21, { color: V.white, size: 84 }); }
  }

  function runOut(x, y, dev) {
    phase = 'ruin'; phaseT = 0; ruinX = dev > 0 ? 1 : -1; crack = y; pen = null;
    runs++; sadT = 0.9;
    game.audio.play('se_bad', 0.3);
    if (mode === S.PLAYING && runs >= MISS_MAX) {
      stopT = 0.5; stopKind = 'miss';
      game.fx.flash('#ffffff', 0.15);
      game.audio.tone('C3', 0.3, { wave: 'sawtooth', volume: 0.1, slide: -60 });
      return;
    }
    game.feedback.bad(x, y, { text: 'MISS', color: V.red, size: 58 });
  }

  function penUp() {
    if (!pen) return;
    pen = null;
  }

  function stepTask(dt) {
    phaseT += dt;
    for (var i = trail.length - 1; i >= 0; i--) if (game.time.elapsed - trail[i].t > 0.25) trail.splice(i, 1);
    if (joyT > 0) joyT -= dt;
    if (sadT > 0) sadT -= dt;
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = score + (win ? Math.ceil(timeLeft) * 40 + (runs === 0 ? 300 : 0) : 0);
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 6; i++) game.fx.burst(140 + i * 160, H * 0.45 + (i % 2) * 160, { color: i % 2 ? V.greenHi : V.gold, count: 18, speed: 520 });
      game.fx.flash(V.white, 0.22);
    }
  }

  function canPlay() { return mode === S.PLAYING && !fin && stopT <= 0 && readyT <= 0; }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (!canPlay()) return;
    if (penDown(x, y)) game.audio.tone('E5', 0.04, { wave: 'triangle', volume: 0.07 });
    else game.audio.play('se_tap', 0.06);
  });
  game.onMove(function(x, y) {
    if (!canPlay() || !pen) return;
    penTo(x, y);
    if (pen && penSpeed(x, y) > NODE_SPEED && Math.random() < 0.3) game.audio.tone(1200 + Math.random() * 300, 0.02, { wave: 'triangle', volume: 0.03 });
  });
  game.onRelease(function(x, y) {
    if (!pen) return;
    if (phase === 'split' && crack > TOP + 4) game.audio.tone('G3', 0.04, { wave: 'triangle', volume: 0.05 });
    penUp();
  });
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function stalk(x, baseY, sc, col, t) {
    var w = 26 * sc, h = 900 * sc, sw = Math.sin(t * 0.8 + x) * 6 * sc;
    game.draw.circle(x, baseY, w * 1.4, V.shadow, 0.15);
    game.draw.rect(x - w / 2 + sw, baseY - h, w, h, col);
    for (var n = 1; n < 6; n++) game.draw.rect(x - w / 2 - 2 + sw, baseY - n * h / 6, w + 4, 4 * sc + 1, V.greenDk, 0.5);
    game.draw.sprite(LEAF, { g: col }, x + w + sw, baseY - h * 0.8, 10 * sc, { anchor: 'center' });
  }

  function grove(t) {
    game.draw.gradient(0, H, [[0, '#e8f4e0'], [0.3, STYLE.bg[0]], [0.62, '#a8c89a'], [0.78, STYLE.bg[1]], [1, '#4a6a3a']]);
    // 奥(小さく・彩度低)→手前(大きく)の竹の板
    for (var i = 0; i < 9; i++) stalk(60 + i * 125, H * 0.52, 0.45, V.far, t);
    for (var j = 0; j < 6; j++) stalk(30 + j * 210, H * 0.6, 0.7, V.mid, t);
    stalk(40, H * 0.86, 1.2, V.green, t);
    stalk(W - 40, H * 0.86, 1.2, V.green, t);
    // 割り台
    game.draw.circle(CX, BOT + 60, 150, V.shadow, 0.2);
    game.draw.rect(CX - 210, BOT, 420, 70, V.wood);
    game.draw.rect(CX - 210, BOT, 420, 14, '#b89a5a');
  }

  function drawPiece(t) {
    var big = stopT > 0 && stopKind === 'miss';
    var flash = big && Math.floor(t * 16) % 2 === 0;
    var hw = PW / 2;
    var body = cfg.look === 'pole' ? V.green : V.green;
    var sep = 0;
    if (phase === 'done') sep = Math.min(1, phaseT / 0.35) * 160;
    // 本体(割れた後は左右に開いて倒れる)
    for (var side = -1; side <= 1; side += 2) {
      var ox = side * sep;
      var lx = side < 0 ? CX - hw : CX;
      var w = hw;
      if (sep <= 0) { lx = CX - hw; w = PW; if (side > 0) break; }
      game.draw.rect(lx + ox - 6, TOP - 6, w + 12, BOT - TOP + 12, flash ? V.white : V.greenDk);
      game.draw.rect(lx + ox, TOP, w, BOT - TOP, flash ? V.white : body);
      if (cfg.look === 'pole') game.draw.rect(lx + ox + 18, TOP, 26, BOT - TOP, V.greenHi, 0.6);
      else game.draw.rect(lx + ox + (side < 0 && sep > 0 ? w - 36 : 0), TOP, 36, BOT - TOP, V.flesh, 0.9);
      // 繊維の細線
      for (var f = 1; f < 6; f++) game.draw.line(lx + ox + f * w / 6, TOP, lx + ox + f * w / 6, BOT, V.greenDk, 2);
    }
    // 節
    for (var k = 0; k < cfg.nodes.length; k++) {
      var ny = nodeY(k), hot = nodeFlash === k && phase === 'split' && Math.floor(t * 10) % 2 === 0;
      game.draw.rect(CX - hw - 10 - sep, ny - 9, PW + 20 + sep * 2, 18, hot ? V.red : V.greenDk);
      game.draw.rect(CX - hw - 10 - sep, ny - 9, PW + 20 + sep * 2, 5, V.greenHi, 0.6);
    }
    if (phase === 'done') return;
    // 筋(割る線)と許容帯
    var step = 24;
    for (var y = TOP; y < BOT; y += step) {
      var y2 = Math.min(BOT, y + step), gx1 = grainX(y), gx2 = grainX(y2);
      game.draw.line(gx1 - cfg.band, y, gx2 - cfg.band, y2, '#fff6c8', 5);
      game.draw.line(gx1 + cfg.band, y, gx2 + cfg.band, y2, '#fff6c8', 5);
      if (y > crack) game.draw.line(gx1, y, gx2, y2, V.gold, (Math.floor(y / step) % 2 === 0) ? 6 : 2);
    }
    // 割れ目(済んだ所)
    for (var c = TOP; c < crack; c += step) {
      var c2 = Math.min(crack, c + step);
      game.draw.line(grainX(c), c, grainX(c2), c2, V.ink, 10);
    }
    if (phase === 'ruin') {
      // それた割れ
      var rx = grainX(crack);
      game.draw.line(rx, crack, rx + ruinX * (cfg.band + 120), crack + 160, big ? V.red : V.ink, big ? 16 : 10);
    }
    // 割れ口(刃を当てる所)
    if (phase === 'split') {
      var tx = grainX(Math.max(TOP, crack)), pulse = 30 + Math.sin(t * 8) * 6;
      game.draw.circle(tx, crack, pulse, V.white, 0.55);
      game.draw.circle(tx, crack, 12, V.gold);
    }
  }

  function drawTrail() {
    for (var i = 1; i < trail.length; i++) {
      var a = trail[i - 1], b = trail[i];
      game.draw.line(a.x, a.y, b.x, b.y, '#ffffff', 14);
      game.draw.line(a.x, a.y, b.x, b.y, V.gold, 6);
    }
  }

  function drawOld(t) {
    var fr = sadT > 0 || (fin && !cleared) ? OLD_SAD : (joyT > 0 || (fin && cleared)) ? OLD_JOY : (Math.floor(t * 2) % 2 ? OLD_A : OLD_B);
    var hop = fin && cleared ? -Math.abs(Math.sin(t * 12)) * 26 : Math.sin(t * 2.4) * 4;
    game.draw.circle(170, H * 0.935, 100, V.shadow, 0.25);
    game.draw.sprite(fr, OLD_PAL, 170, H * 0.87 + hop, 17, { anchor: 'center' });
    // 割り竹の束(進捗)
    game.draw.circle(W - 250, H * 0.94, 120, V.shadow, 0.2);
    for (var i = 0; i < 8; i++) {
      var x = W - 420 + i * 46, done = i < strips;
      game.draw.rect(x, H * 0.82, 26, 190, done ? V.flesh : '#00000030');
      if (done) game.draw.rect(x, H * 0.82, 8, 190, V.green);
    }
  }

  function drawHud(t) {
    var low = timeLeft < 4 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(70, 34, W - 140, 30, V.greenDk);
    game.draw.rect(76, 40, (W - 152) * Math.max(0, timeLeft / TIME_LIMIT), 18, low ? V.red : V.gold);
    out(splits + ' / ' + TASKS.length, W / 2, 124, 54, V.ink);
    for (var m = 0; m < MISS_MAX; m++) game.draw.circle(W - 110 - m * 64, 180, 22, m < runs ? V.red : '#ffffff90');
    out('' + score, 170, 132, 38, V.greenDk);
  }

  function drawScene(t) {
    grove(t);
    drawPiece(t);
    drawTrail();
    drawOld(t);
    for (var sl = 0; sl < H; sl += 8) game.draw.rect(0, sl, W, 2, '#000000', 0.04);
  }

  // ---- ATTRACT: 本物の penDown()/penTo() で 1本目は一気に割る → 2本目はゆっくりで節に止まる → 引き直しで横へそれて失敗 ----
  var demo = { t: 0, x: CX, y: TOP - 60, press: false, step: 0, by: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.0;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; demo.step = 0; cfg = TASKS[0]; phase0 = 0; }
    stepTask(dt);
    demo.press = false;
    var tx = demo.x, ty = demo.y;
    if (cyc < 0.5) { tx = grainX(TOP); ty = TOP; }
    else if (cyc < 0.9) {
      if (demo.step === 0) { demo.step = 1; demo.x = grainX(TOP); demo.y = TOP; penDown(demo.x, demo.y); }
      var u = (cyc - 0.5) / 0.4;
      demo.y = TOP + (BOT - TOP + 20) * u; demo.x = grainX(Math.min(BOT, demo.y));
      penTo(demo.x, demo.y); demo.press = true; tx = demo.x; ty = demo.y;
    } else if (cyc < 1.5) { tx = CX; ty = TOP - 40; }
    else if (cyc < 3.0) {
      if (demo.step === 1) { demo.step = 2; setupTask(1); phase0 = 0; demo.x = grainX(TOP); demo.y = TOP; penDown(demo.x, demo.y); }
      var v = (cyc - 1.5) / 1.5;
      if (pen && !pen.dead) { demo.y = TOP + (BOT - TOP) * 0.5 * v; demo.x = grainX(demo.y); penTo(demo.x, demo.y); demo.press = true; }
      tx = demo.x; ty = demo.y;
    } else if (cyc < 3.4) {
      if (demo.step === 2) { demo.step = 3; penUp(); }
      tx = grainX(crack); ty = crack;
    } else if (cyc < 3.8) {
      if (demo.step === 3) { demo.step = 4; demo.by = crack; demo.x = grainX(crack); demo.y = crack; penDown(demo.x, demo.y); }
      var w = (cyc - 3.4) / 0.4;
      demo.y = demo.by + 8 + 420 * w; demo.x = grainX(demo.y) + w * 170;
      penTo(demo.x, demo.y); demo.press = true; tx = demo.x; ty = demo.y;
    } else { tx = CX + 260; ty = BOT - 100; }
    demo.x += (tx - demo.x) * Math.min(1, dt * 10);
    demo.y += (ty - demo.y) * Math.min(1, dt * 10);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 14 });
      out(GAME_TITLE, W / 2, H * 0.07 + Math.sin(t * 2) * 5, 100, V.greenDk);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.11, 40, V.ink);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.975, 46, V.white);
      else out('TAP TO START', W / 2, H * 0.975, 40, V.gold);
      return;
    }

    if (mode === S.RESULT) {
      stepTask(dt);
      drawScene(t);
      game.draw.rect(90, H * 0.3, W - 180, 480, '#f4f8ec', 0.93);
      out(cleared ? 'CLEAR' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.35, 96, cleared ? V.green : V.red);
      out('SCORE ' + finalScore, W / 2, H * 0.41, 60, V.ink);
      out(splits + ' / ' + TASKS.length + '   MISS ' + runs, W / 2, H * 0.46, 42, V.greenDk);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.51, 56, V.wood);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.51, 42, V.ink);
      if (!cleared) out('あと' + (TASKS.length - splits) + '回!', W / 2, H * 0.27, 64, V.red);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.975, 40, V.greenDk);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      stepTask(dt);
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { splits: splits, runOuts: runs, strips: strips };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) {
        if (stopKind === 'win') ending(true);
        else { game.feedback.bad(CX, crack, { text: stopKind === 'time' ? 'TIME UP' : 'MISS', color: V.red, size: 62 }); ending(false); }
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      timeLeft -= dt; playT += dt;
      stepTask(dt);
      if ((phase === 'done' && phaseT > 0.45) || (phase === 'ruin' && phaseT > 0.6)) {
        if (task >= TASKS.length - 1) {
          if (splits + runs >= TASKS.length && runs < MISS_MAX) { stopT = 0.45; stopKind = 'win'; game.audio.play('se_powerup', 0.4); }
        } else { setupTask(task + 1); game.audio.play('se_jump', 0.3); }
      }
      if (timeLeft < 4) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.06, { wave: 'square', volume: 0.07 }); }
      }
      if (timeLeft <= 0 && stopT <= 0) { timeLeft = 0; pen = null; stopT = 0.45; stopKind = 'time'; game.audio.tone('C4', 0.3, { wave: 'square', volume: 0.1, slide: -120 }); }
    }

    drawScene(t);
    if (stopT > 0 && stopKind === 'win') game.draw.circle(CX, (TOP + BOT) / 2, 120 + (0.45 - stopT) * 1500, V.white, 0.3);
    // 開始直後のお手本: 割れ口から下へ滑る手
    if (!fin && readyT <= 0 && task === 0 && crack <= TOP + 4 && playT < 1.6 && !pen) {
      var gy = TOP + ((playT * 1.4) % 1) * (BOT - TOP);
      game.draw.hand(grainX(gy), gy, { press: true, scale: 11, alpha: 0.5 });
    }
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.2, 120, V.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['D5', 0.5], ['E5', 0.5], ['G5', 1], ['A5', 0.5], ['G5', 0.5], ['E5', 1],
      ['D5', 0.5], ['B4', 0.5], ['D5', 1], ['E5', 0.5], ['D5', 0.5], ['B4', 1],
      ['A4', 0.5], ['B4', 0.5], ['D5', 0.5], ['E5', 0.5], ['G5', 1], ['E5', 0.5], ['D5', 1.5],
    ], { tempo: 116, wave: 'triangle', volume: 0.06, loop: true, bass: [['G2', 2], ['E2', 2], ['D2', 2], ['G2', 2], ['C3', 2], ['D3', 2]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);

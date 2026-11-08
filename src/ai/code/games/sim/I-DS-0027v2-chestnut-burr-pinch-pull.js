// I-DS-0027v2-chestnut-burr-pinch-pull.js
// いがの二本指抜き — 手袋に刺さった栗のいがを、両脇の光る点を2本の指で同時に挟み、刺さった向きのとおりまっすぐ引き抜く
// 操作: いがの両脇に光る2つの点へ2本の指を同時に置くと挟める。そのまま2本そろえて、いがから伸びる帯(抜く向き)に沿って引く。帯から横にはみ出すと赤く点滅し、さらにずれるとトゲが折れて残る
// 終わり: 15秒以内に(6個のうち)5個抜けばCLEAR。トゲを2回折る、または時間切れでGAME OVER
// @mechanic: pinch_zone
// @theme: autumn_chestnut_grove_glove
// 世界観: 秋の栗林で、栗拾いの男の子が軍手にびっしり刺さった栗のいがを、トゲを折らないよう二本指で挟んで刺さった向きのまま抜き取っていく(後半は手がふるえて揺れ、帯も細くなる)
// 残るもの: 正誤(CLEAR/GAME OVER) + 抜いた数・折った数・ぶれの少なさのスコア
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 画面の1/3を占める巨大な手袋と子ども、床に楕円影、背景は横1層
  var STYLE = { bg: ['#f4c870', '#c8784a'], main: ['#f2ead8', '#7a4a2a', '#5a8a3a'], accent: ['#ff4a3a', '#ffffff'] };
  var V = {
    glove: STYLE.main[0], gloveDk: '#c8bca0', burr: STYLE.main[2], burrDk: '#3a5a22', nut: STYLE.main[1], red: STYLE.accent[0], white: STYLE.accent[1],
    ink: '#2a1a10', leaf: '#d86a2a', skin: '#f0c090', ok: '#2a9a4a',
  };

  var GAME_TITLE = 'IGA PINCH';
  var TIME_LIMIT = 15;
  var NEEDED = 5;
  var MISS_MAX = 2;
  var GX = W / 2, GY = Math.round(H * 0.47);
  var PAD_OFF = 88, PAD_R = 70, PULL = 170;
  var ROUNDS = [
    { lane: 72, sway: 0, burrs: [[-130, -170, -115], [165, -40, -15], [-40, 160, 160]] },
    { lane: 56, sway: 36, burrs: [[125, -185, -60], [-175, -10, 195], [95, 150, 28]] },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var round, burrs, grip, pulled, snaps, devSum, score, finalScore, swayX, bag;
  var timeLeft, readyT, stopT, stopObj, fin, cleared, postT, joyT, ouchT, roundT, warnT, playT;

  // 巨大な軍手(左手)
  var GLOVE = [
    '..ww.ww.ww.ww.',
    '..ww.ww.ww.ww.',
    '..ww.ww.ww.ww.',
    '..wwgwwgwwgww.',
    'ww.wwwwwwwwww.',
    'www.wwwwwwwww.',
    '.wwwwwwwwwwww.',
    '..wwwwwwwwwww.',
    '..wwwwgwwwwww.',
    '...wwwwwwwww..',
    '...ggggggggg..',
    '...ddddddddd..',
    '...ddddddddd..',
  ];
  // 栗拾いの男の子(大きな顔)
  var KID = ['...bbbbbb...', '..bbbbbbbb..', '.bbbbbbbbbb.', '.ssssssssss.', '.sskkssksss.', '.ssssssssss.', '.sssrrrssss.', '..ssssssss..', '...cccccc...'];
  var KID_OUCH = ['...bbbbbb...', '..bbbbbbbb..', '.bbbbbbbbbb.', '.ssssssssss.', '.skkksskkks.', '.ssssssssss.', '.sssrrrrsss.', '..ssrrrrss..', '...cccccc...'];
  var KID_JOY = ['...bbbbbb...', '..bbbbbbbb..', '.bbbbbbbbbb.', '.ssssssssss.', '.sk.kssk.ks.', '.ssssssssss.', '.srrrrrrrrs.', '..ssrrrrss..', '...cccccc...'];
  var KID_PAL = { b: '#5a3a2a', s: '#f0c090', k: '#2a1a10', r: '#c84a3a', c: '#3a6ac8' };

  function out(str, x, y, sz, color) {
    game.draw.text(str, x + 4, y + 5, { size: sz, color: '#00000055', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function setupRound(k) {
    round = k; burrs = [];
    var cfg = ROUNDS[k];
    for (var i = 0; i < cfg.burrs.length; i++) {
      var b = cfg.burrs[i], a = b[2] * Math.PI / 180;
      burrs.push({ dx: b[0], dy: b[1], ax: Math.cos(a), ay: Math.sin(a), prog: 0, dev: 0, st: 'stuck', t: 0, flash: 0, warn: false, ph: game.random(0, 6) });
    }
    grip = null;
  }

  function initGame() {
    pulled = 0; snaps = 0; devSum = 0; score = 0; finalScore = 0; swayX = 0; bag = 0;
    timeLeft = TIME_LIMIT; readyT = 0.8; stopT = 0; stopObj = null; fin = false; cleared = false; postT = 0;
    joyT = 0; ouchT = 0; roundT = 0; warnT = 0; playT = 0;
    setupRound(0);
  }

  function base(b) { return { x: GX + swayX + b.dx, y: GY + b.dy }; }
  function pads(b) {
    var p = base(b);
    return [{ x: p.x - b.ay * PAD_OFF, y: p.y + b.ax * PAD_OFF }, { x: p.x + b.ay * PAD_OFF, y: p.y - b.ax * PAD_OFF }];
  }
  function burrPos(b) {
    var p = base(b);
    return { x: p.x + b.ax * b.prog - b.ay * b.dev, y: p.y + b.ay * b.prog + b.ax * b.dev };
  }
  function find(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }

  // 2本指の挟みと引き(本番は game.touches、デモは偽の指で同じ処理)
  function stepGrip(list) {
    if (grip) {
      var b = grip.b, f1 = find(list, grip.i1), f2 = find(list, grip.i2);
      if (!f1 || !f2) {
        b.prog = 0; b.dev = 0; b.warn = false; grip = null;
        game.audio.tone('D4', 0.06, { wave: 'triangle', volume: 0.06 });
        return;
      }
      var mx = (f1.x + f2.x) / 2 - grip.mx, my = (f1.y + f2.y) / 2 - grip.my;
      b.prog = Math.max(0, mx * b.ax + my * b.ay);
      b.dev = -mx * b.ay + my * b.ax;
      var lane = ROUNDS[round].lane;
      var warnNow = Math.abs(b.dev) > lane * 0.6;
      if (warnNow && !b.warn) game.audio.tone('A5', 0.06, { wave: 'square', volume: 0.08 });
      b.warn = warnNow;
      if (Math.floor(b.prog / 34) > grip.tick) { grip.tick = Math.floor(b.prog / 34); game.audio.tone(300 + grip.tick * 80, 0.04, { wave: 'square', volume: 0.05 }); }
      if (Math.abs(b.dev) > lane) snap(b);
      else if (b.prog >= PULL) pullOut(b);
      return;
    }
    for (var k = 0; k < burrs.length; k++) {
      var q = burrs[k];
      if (q.st !== 'stuck') continue;
      var pp = pads(q), on0 = null, on1 = null;
      for (var t = 0; t < list.length; t++) {
        var f = list[t];
        if (!on0 && Math.hypot(f.x - pp[0].x, f.y - pp[0].y) < PAD_R) on0 = f;
        else if (!on1 && Math.hypot(f.x - pp[1].x, f.y - pp[1].y) < PAD_R) on1 = f;
      }
      if (on0 && on1 && on0.id !== on1.id) {
        grip = { b: q, i1: on0.id, i2: on1.id, mx: (on0.x + on1.x) / 2, my: (on0.y + on1.y) / 2, tick: 0 };
        game.audio.play('se_tap', 0.3);
        game.fx.burst(pp[0].x, pp[0].y, { color: V.white, count: 5, speed: 150 });
        game.fx.burst(pp[1].x, pp[1].y, { color: V.white, count: 5, speed: 150 });
        return;
      }
    }
  }

  function pullOut(b) {
    var p = burrPos(b);
    grip = null; b.st = 'out'; b.t = 0; b.flash = 0.3;
    pulled++; bag++; joyT = 0.6;
    var clean = Math.abs(b.dev) < ROUNDS[round].lane * 0.3;
    devSum += Math.abs(b.dev);
    var pts = clean ? 200 : 120;
    score += pts;
    game.feedback.good(p.x, p.y - 90, { text: clean ? 'PERFECT' : 'GOOD', color: V.ok, size: 60 });
    game.audio.play('se_coin', 0.35);
    game.fx.popup('+' + pts, p.x, p.y - 180, { color: V.nut, size: 44 });
    if (mode !== S.PLAYING) return;
    if (pulled >= NEEDED) { stopT = 0.45; stopObj = { kind: 'win', b: b }; return; }
    checkRound();
  }

  function snap(b) {
    grip = null; b.st = 'snap'; b.t = 0; b.flash = 0.5;
    snaps++; ouchT = 0.9;
    game.audio.play('se_break', 0.4);
    if (mode === S.PLAYING && snaps >= MISS_MAX) {
      stopT = 0.5; stopObj = { kind: 'miss', b: b };
      game.fx.flash('#ffffff', 0.15);
      game.audio.tone('C3', 0.3, { wave: 'sawtooth', volume: 0.1, slide: -60 });
      return;
    }
    var p = burrPos(b);
    game.feedback.bad(p.x, p.y - 90, { text: 'MISS', color: V.red, size: 58 });
    if (mode === S.PLAYING) checkRound();
  }

  function checkRound() {
    for (var i = 0; i < burrs.length; i++) if (burrs[i].st === 'stuck') return;
    if (round < ROUNDS.length - 1) {
      roundT = 0.7;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup('NICE', W / 2, H * 0.24, { color: V.white, size: 88 });
    } else if (stopT <= 0) {
      stopT = 0.45; stopObj = { kind: 'over' };
    }
  }

  function stepWorld(dt) {
    var t = game.time.elapsed;
    if (!grip) swayX = Math.sin(t * 1.7) * ROUNDS[round].sway;
    for (var i = 0; i < burrs.length; i++) {
      var b = burrs[i];
      if (b.flash > 0) b.flash -= dt;
      if (b.st === 'out' || b.st === 'snap') b.t += dt;
      if (b.st === 'stuck' && (!grip || grip.b !== b)) { b.prog *= Math.exp(-10 * dt); b.dev *= Math.exp(-10 * dt); }
    }
    if (joyT > 0) joyT -= dt;
    if (ouchT > 0) ouchT -= dt;
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = score + (win ? Math.ceil(timeLeft) * 40 : 0);
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 6; i++) game.fx.burst(140 + i * 160, H * 0.45 + (i % 2) * 160, { color: i % 2 ? V.nut : V.leaf, count: 18, speed: 520 });
      game.fx.flash(V.white, 0.22);
    }
  }

  function canPlay() { return mode === S.PLAYING && !fin && stopT <= 0 && readyT <= 0 && roundT <= 0; }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (!canPlay()) return;
    var near = false;
    for (var i = 0; i < burrs.length; i++) {
      if (burrs[i].st !== 'stuck') continue;
      var pp = pads(burrs[i]);
      if (Math.hypot(pp[0].x - x, pp[0].y - y) < PAD_R || Math.hypot(pp[1].x - x, pp[1].y - y) < PAD_R) near = true;
    }
    if (near) { game.audio.tone('A5', 0.04, { wave: 'triangle', volume: 0.06 }); game.fx.burst(x, y, { color: V.white, count: 3, speed: 90 }); }
    else game.audio.play('se_tap', 0.05);
  });
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function grove(t) {
    game.draw.gradient(0, H, [[0, '#ffe2a0'], [0.35, STYLE.bg[0]], [0.75, STYLE.bg[1]], [1, '#8a4a2a']]);
    // 栗の木の並び(横1層)
    for (var i = 0; i < 6; i++) {
      var tx = i * 200 + 20;
      game.draw.rect(tx + 70, H * 0.12, 40, 260, '#6a3a1a');
      game.draw.circle(tx + 90, H * 0.11, 120, '#7a8a2a');
      game.draw.circle(tx + 40, H * 0.14, 80, '#8a9a3a');
    }
    // 落ち葉
    for (var l = 0; l < 10; l++) {
      var lx = (l * 137 + t * 30) % W, ly = (l * 211 + t * 60) % (H * 0.6) + H * 0.2;
      game.draw.rect(lx, ly, 18, 10, V.leaf, 0.6);
    }
  }

  function drawBurr(b, t) {
    if (b.st === 'out' && b.t > 0.6) return;
    var p = burrPos(b);
    var big = stopObj && stopT > 0 && stopObj.b === b;
    var r = big ? 74 : 54;
    if (b.st === 'out') { p.x += b.ax * b.t * 700; p.y += b.ay * b.t * 700 - b.t * 200; }
    var wf = (b.flash > 0 && Math.floor(b.flash * 30) % 2 === 0) || (big && Math.floor(t * 16) % 2 === 0);
    var hot = b.warn && Math.floor(t * 14) % 2 === 0;
    var col = wf ? V.white : hot ? V.red : V.burr;
    // トゲ
    for (var s = 0; s < 14; s++) {
      var a = s / 14 * Math.PI * 2 + b.ph;
      var len = b.st === 'snap' && s % 3 === 0 ? 0.6 : 1.45;
      game.draw.line(p.x, p.y, p.x + Math.cos(a) * r * len, p.y + Math.sin(a) * r * len, hot ? V.red : V.burrDk, 7);
    }
    game.draw.circle(p.x, p.y, r, col);
    game.draw.circle(p.x - r * 0.3, p.y - r * 0.3, r * 0.3, V.white, 0.35);
    // 中の栗の顔
    game.draw.circle(p.x, p.y + 6, r * 0.45, V.nut);
    game.draw.circle(p.x - 9, p.y + 2, 4, V.ink); game.draw.circle(p.x + 9, p.y + 2, 4, V.ink);
    if (b.st === 'snap') {
      // 折れて残ったトゲ
      var q = base(b);
      for (var k = 0; k < 3; k++) game.draw.line(q.x - 20 + k * 20, q.y, q.x - 20 + k * 20 + 6, q.y - 26, V.burrDk, 6);
    }
  }

  function drawLanes(t) {
    for (var i = 0; i < burrs.length; i++) {
      var b = burrs[i];
      if (b.st !== 'stuck') continue;
      var p = base(b), lane = ROUNDS[round].lane, L = PULL + 70;
      var held = grip && grip.b === b;
      // 抜く向きの帯(はみ出し限界の2本線)
      for (var s = -1; s <= 1; s += 2) {
        var ox = -b.ay * lane * s, oy = b.ax * lane * s;
        for (var d = 30; d < L; d += 36) game.draw.line(p.x + ox + b.ax * d, p.y + oy + b.ay * d, p.x + ox + b.ax * (d + 18), p.y + oy + b.ay * (d + 18), held && b.warn ? V.red : V.white, 6);
      }
      // 抜けきる位置の目印
      game.draw.circle(p.x + b.ax * (PULL + 40), p.y + b.ay * (PULL + 40), 16, V.white, held ? 0.9 : 0.5);
      // 挟む点(白縁の明滅)
      var pp = pads(b);
      for (var k = 0; k < 2; k++) {
        game.draw.circle(pp[k].x, pp[k].y, (held ? 44 : 36) + Math.sin(t * 8 + k) * 4, held ? V.nut : V.white, held ? 0.8 : 0.45 + Math.sin(t * 8 + i) * 0.25);
        game.draw.circle(pp[k].x, pp[k].y, 14, V.ink, 0.6);
      }
    }
  }

  function drawGloveKid(t) {
    var gx = GX + swayX;
    // 腕
    game.draw.rect(gx - 110, GY + 230, 220, H * 0.36, '#3a6ac8');
    game.draw.circle(gx, H * 0.97, 260, '#00000030');
    // 手袋(巨大スプライト)
    game.draw.sprite(GLOVE, { g: V.gloveDk, w: V.glove, d: '#3a6ac8' }, gx, GY, 46, { anchor: 'center' });
    // 子どもの顔(手の下からのぞく)
    var fr = ouchT > 0 || (fin && !cleared) ? KID_OUCH : (joyT > 0 || (fin && cleared)) ? KID_JOY : KID;
    var bob = fin && cleared ? -Math.abs(Math.sin(t * 12)) * 30 : Math.sin(t * 2.4) * 5;
    game.draw.sprite(fr, KID_PAL, W * 0.2, H * 0.86 + bob, 20, { anchor: 'center' });
    // 栗かご(進捗)
    game.draw.rect(W * 0.62, H * 0.84, 330, 150, '#8a5a2a');
    game.draw.rect(W * 0.62, H * 0.84, 330, 22, '#5a3a1a');
    for (var i = 0; i < NEEDED; i++) {
      var bx = W * 0.62 + 50 + (i % 3) * 110, by = H * 0.84 + 62 + Math.floor(i / 3) * 52;
      if (i < bag) { game.draw.circle(bx, by, 24, V.nut); game.draw.circle(bx - 6, by - 6, 7, V.white, 0.4); }
      else game.draw.circle(bx, by, 18, '#5a3a1a');
    }
  }

  function drawHud(t) {
    var low = timeLeft < 4 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(70, 34, W - 140, 30, '#5a3a1a');
    game.draw.rect(76, 40, (W - 152) * Math.max(0, timeLeft / TIME_LIMIT), 18, low ? V.red : V.white);
    out(pulled + ' / ' + NEEDED, W / 2, 124, 56, V.white);
    for (var m = 0; m < MISS_MAX; m++) game.draw.circle(W - 110 - m * 64, 180, 22, m < snaps ? V.red : '#ffffff80');
    for (var r = 0; r < ROUNDS.length; r++) game.draw.circle(110 + r * 60, 180, 18, r < round ? V.ok : r === round ? V.nut : '#ffffff80');
    out('' + score, W - 200, 124, 36, V.nut);
  }

  function drawScene(t) {
    grove(t);
    drawGloveKid(t);
    drawLanes(t);
    for (var i = 0; i < burrs.length; i++) drawBurr(burrs[i], t);
    for (var sl = 0; sl < H; sl += 8) game.draw.rect(0, sl, W, 2, '#000000', 0.04);
  }

  // ---- ATTRACT: 偽の2本指で本物の stepGrip() を回す。1個目はまっすぐ抜く → 2個目は横へずれてトゲを折る ----
  var demo = { t: 0, a: { id: 'd1', x: W * 0.3, y: H * 0.8 }, b: { id: 'd2', x: W * 0.7, y: H * 0.8 }, press: false, base: null };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; demo.base = null; }
    stepWorld(dt);
    var seg = cyc < 2.0 ? 0 : cyc < 4.0 ? 1 : 2, u = seg === 0 ? cyc : cyc - 2.0;
    var list = [];
    demo.press = false;
    if (seg < 2) {
      var b = burrs[seg];
      if (b.st === 'stuck') {
        var pp = pads(b);
        if (u < 0.6) {
          demo.a.x += (pp[0].x - demo.a.x) * Math.min(1, dt * 9); demo.a.y += (pp[0].y - demo.a.y) * Math.min(1, dt * 9);
          demo.b.x += (pp[1].x - demo.b.x) * Math.min(1, dt * 9); demo.b.y += (pp[1].y - demo.b.y) * Math.min(1, dt * 9);
          demo.base = null;
        } else {
          if (!demo.base) demo.base = { ax: pp[0].x, ay: pp[0].y, bx: pp[1].x, by: pp[1].y };
          var k = Math.min(1, (u - 0.6) / 0.8), pull = k * (PULL + 20), side = seg === 1 ? k * 110 : 0;
          var ox = b.ax * pull - b.ay * side, oy = b.ay * pull + b.ax * side;
          demo.a.x = demo.base.ax + ox; demo.a.y = demo.base.ay + oy;
          demo.b.x = demo.base.bx + ox; demo.b.y = demo.base.by + oy;
          demo.press = true;
          list = [demo.a, demo.b];
        }
      }
    } else {
      demo.a.x += (W * 0.3 - demo.a.x) * dt * 3; demo.a.y += (H * 0.8 - demo.a.y) * dt * 3;
      demo.b.x += (W * 0.7 - demo.b.x) * dt * 3; demo.b.y += (H * 0.8 - demo.b.y) * dt * 3;
    }
    stepGrip(list);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.a.x, demo.a.y, { press: demo.press, scale: 13 });
      game.draw.hand(demo.b.x, demo.b.y, { press: demo.press, scale: 13 });
      out(GAME_TITLE, W / 2, H * 0.065 + Math.sin(t * 2) * 5, 100, V.white);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.11, 40, V.ink);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.975, 46, V.white);
      else out('TAP TO START', W / 2, H * 0.975, 40, V.ink);
      return;
    }

    if (mode === S.RESULT) {
      stepWorld(dt);
      drawScene(t);
      game.draw.rect(90, H * 0.3, W - 180, 480, '#fff6e4', 0.93);
      out(cleared ? 'CLEAR' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.35, 96, cleared ? V.ok : V.red);
      out('SCORE ' + finalScore, W / 2, H * 0.41, 60, V.ink);
      out(pulled + ' / ' + NEEDED + '   MISS ' + snaps, W / 2, H * 0.46, 42, V.nut);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.51, 56, V.leaf);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.51, 42, V.ink);
      if (!cleared) out('あと' + (NEEDED - pulled) + '個!', W / 2, H * 0.27, 64, V.red);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.975, 40, V.ink);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      stepWorld(dt);
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { pulled: pulled, snapped: snaps, avgDev: pulled ? Math.round(devSum / pulled) : 0 };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) {
        var o = stopObj; stopObj = null;
        if (o.kind === 'win') ending(true);
        else {
          var bp = o.b ? burrPos(o.b) : { x: W / 2, y: H * 0.45 };
          game.feedback.bad(bp.x, bp.y - 90, { text: o.kind === 'time' ? 'TIME UP' : 'MISS', color: V.red, size: 62 });
          ending(false);
        }
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else if (roundT > 0) {
      roundT -= dt;
      stepWorld(dt);
      if (roundT <= 0) { setupRound(round + 1); game.audio.play('se_jump', 0.3); }
    } else {
      timeLeft -= dt; playT += dt;
      stepWorld(dt);
      stepGrip(game.touches || []);
      if (timeLeft < 4) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.06, { wave: 'square', volume: 0.07 }); }
      }
      if (timeLeft <= 0 && stopT <= 0) {
        timeLeft = 0; grip = null;
        var rem = null;
        for (var i = 0; i < burrs.length; i++) if (burrs[i].st === 'stuck') { rem = burrs[i]; break; }
        stopT = 0.45; stopObj = { kind: 'time', b: rem };
        game.audio.tone('C4', 0.3, { wave: 'square', volume: 0.1, slide: -120 });
      }
    }

    drawScene(t);
    if (stopObj && stopObj.kind === 'win' && stopT > 0) game.draw.circle(W / 2, GY, 120 + (0.45 - stopT) * 1500, V.white, 0.3);
    // 開始直後のお手本: 最初のいがの2点に半透明の手
    if (!fin && readyT <= 0 && pulled === 0 && round === 0 && playT < 1.5 && !grip) {
      var p0 = pads(burrs[0]);
      game.draw.hand(p0[0].x, p0[0].y, { press: true, scale: 11, alpha: 0.5 });
      game.draw.hand(p0[1].x, p0[1].y, { press: true, scale: 11, alpha: 0.5 });
    }
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.24, 120, V.white);
  });

  game.onStart(function() {
    game.audio.melody([
      ['A4', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['G5', 1], ['E5', 1],
      ['D5', 0.5], ['C5', 0.5], ['A4', 0.5], ['C5', 0.5], ['D5', 2],
      ['E5', 0.5], ['G5', 0.5], ['A5', 1], ['G5', 0.5], ['E5', 0.5], ['D5', 1], ['C5', 0.5], ['A4', 1.5],
    ], { tempo: 128, wave: 'sawtooth', volume: 0.045, loop: true, bass: [['A2', 2], ['D3', 2], ['E3', 2], ['A2', 2], ['C3', 2], ['E3', 2]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);

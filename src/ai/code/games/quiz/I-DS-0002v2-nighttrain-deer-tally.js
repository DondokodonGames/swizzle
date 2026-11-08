// I-DS-0002v2-nighttrain-deer-tally.js
// 夜汽車の鹿かぞえ — 曇りが晴れていく車窓の向こう、雪原を横切る鹿だけを数え、曇り直したガラスに指で点を打って答える
// 操作: 鹿が横切る間は見て数えるだけ。群れが去って窓が曇り直したら、数えた頭数だけガラスをタップして指の点を打つ。手を止めると答えが決まる
// 終わり: 3駅ぶん(鹿が増え・速くなり・曇りの晴れが遅くなる)を数え切ればCLEAR。数え違い/答えそびれは1回まで、2回目か15秒切れでGAME OVER
// @mechanic: counting
// @theme: night_train_window_deer_count
// 世界観: 雪国を走る夜行列車の曇った車窓越しに、乗客の子どもが雪原を横切る鹿だけを数え(狐は数えない)、曇り直したガラスに指で頭数ぶんの点を打って家族に知らせる
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく数えた駅の数・スコア
// スタイル: 8bit HANDHELD

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 黄緑寄り4階調。低コントラスト、残像、画面枠
  var STYLE = { bg: ['#0f380f', '#1c4a1c'], main: ['#306230', '#8bac0f', '#9bbc0f'], accent: ['#0f380f', '#c6d690'] };
  var INK = STYLE.bg[0], DEEP = STYLE.main[0], MID = STYLE.main[1], PALE = STYLE.main[2], GLOW = STYLE.accent[1];

  var TITLE = 'DEER TALLY';
  var TIME_LIMIT = 15;
  var STATIONS = 3;
  var LIVES = 2;
  var LOCK_WAIT = 0.8;
  var ANSWER_MAX = 3.0;
  var WX0 = 70, WX1 = W - 70, WY0 = H * 0.15, WY1 = H * 0.70;
  var SNOW_Y = H * 0.43;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // ── スプライト ──
  var DEER = [
    ['.........k.k', '.........kk.', '........kkk.', '........kkkk', '.kkkkkkkkk..', 'kkkkkkkkkk..', '.kkkkkkkkk..', '.k.k...k.k..', '.k..k..k..k.', 'k...k.k....k'],
    ['.........k.k', '.........kk.', '........kkk.', '........kkkk', '.kkkkkkkkk..', 'kkkkkkkkkk..', '.kkkkkkkkk..', '..k.k.k.k...', '..k.k.k.k...', '..k.k.k.k...'],
  ];
  var FOX = [
    ['.........k.k', '.........kkk', 'kk......kkkk', 'kkk.kkkkkkk.', '.kkkkkkkkk..', '....k.k.k.k.', '...k..k.k..k'],
    ['.........k.k', '.........kkk', '.kk.....kkkk', 'kkkkkkkkkkk.', '.kkkkkkkkk..', '.....kk.kk..', '.....kk.kk..'],
  ];
  var KID = [
    ['...hhhh...', '..hhhhhh..', '.hhffffhh.', '.hfeffefh.', '.hffffffh.', '..ffmmff..', '...ffff...', '..cccccc..', '.cccccccc.', 'cccccccccc', 'cccccccccc', 'cccccccccc'],
    ['...hhhh...', '..hhhhhh..', '.hhffffhh.', '.hfmffmfh.', '.hffffffh.', '..ffmmff..', '...ffff...', '..cccccc..', '.cccccccc.', 'cccccccccc', 'cccccccccc', 'cccccccccc'],
    ['h..hhhh..h', 'f.hhhhhh.f', 'fhhffffhhf', 'chfeffefhc', 'chffffffhc', '.cffmmffc.', '..cffffc..', '..cccccc..', '.cccccccc.', 'cccccccccc', 'cccccccccc', 'cccccccccc'],
    ['..........', '...hhhh...', '..hhhhhh..', '.hhffffhh.', '.hfmffmfh.', '.hffffffh.', '..ffmmff..', '..cccccc..', '.cccccccc.', 'cccccccccc', 'cccccccccc', 'cccccccccc'],
  ];
  var PINE = ['..k..', '.kkk.', '..k..', '.kkk.', 'kkkkk', '.kkk.', 'kkkkk', '..k..', '..k..'];
  var POST = ['kk', 'kk', 'kk', 'kk', 'kk', 'kk'];
  var LAMP = ['.pp.', 'pppp', '.pp.', '.kk.'];

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(game.random(0, i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  // ── 群れの生成(プレイ・デモ共通) ──
  function makeHerd(r, fixed) {
    var nDeer = fixed ? fixed.deer : 3 + r + Math.floor(game.random(0, 2 + (r >= 2 ? 1 : 0)));
    var nFox = fixed ? fixed.fox : 1 + (r >= 1 ? 1 : 0);
    var span = fixed ? fixed.span : 0.8 + r * 0.25;
    var spd = fixed ? fixed.speed : 900 + r * 140;
    var kinds = [];
    for (var i = 0; i < nDeer; i++) kinds.push('deer');
    for (var j = 0; j < nFox; j++) kinds.push('fox');
    shuffle(kinds);
    var list = [], end = 0, total = kinds.length;
    for (var k = 0; k < total; k++) {
      var dir = r >= 1 && k % 3 === 2 ? -1 : 1;
      var a = {
        kind: kinds[k], dir: dir,
        t0: Math.max(0, (k / total) * span + game.random(-0.05, 0.05)),
        lane: H * (0.48 + ((k * 0.37) % 1) * 0.13),
        speed: spd * game.random(0.92, 1.1) * (kinds[k] === 'fox' ? 1.12 : 1),
        ph: k * 1.3,
      };
      list.push(a);
      end = Math.max(end, a.t0 + (W + 240) / a.speed);
    }
    return { list: list, deer: nDeer, end: end + 0.08 };
  }

  function animalPos(a, t) {
    var k = t - a.t0;
    var x = a.dir > 0 ? -110 + k * a.speed : W + 110 - k * a.speed;
    var y = a.lane - Math.abs(Math.sin(k * 9 + a.ph)) * (a.kind === 'deer' ? 22 : 10);
    return { x: x, y: y, on: k >= 0 && x > -120 && x < W + 120, k: k };
  }

  function crossedMid(a, t) {
    var p = animalPos(a, t);
    if (p.k < 0) return false;
    return a.dir > 0 ? p.x > W / 2 : p.x < W / 2;
  }

  // ── 曇り(窓ガラスの結露)。下のヒーターから晴れていく ──
  function buildFog(r) {
    var cols = 10, rows = 11, cells = [];
    var cw = (WX1 - WX0) / cols, ch = (WY1 - WY0) / rows;
    var span = 0.55 + r * 0.32;
    var maxD = Math.hypot(W / 2, WY1 - WY0);
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        var cx = WX0 + (i + 0.5) * cw, cy = WY0 + (j + 0.5) * ch;
        var d = Math.hypot(cx - W / 2, cy - WY1) / maxD;
        var keep = r >= 1 && game.random(0, 1) < 0.1 + r * 0.07 ? 0.22 + r * 0.08 : 0;
        cells.push({ x: WX0 + i * cw, y: WY0 + j * ch, w: cw, h: ch, at: d * span + game.random(0, 0.12), keep: keep, tone: (i + j) % 2 });
      }
    }
    return cells;
  }

  function drawFog(cells, t, refog) {
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i];
      var a = Math.max(0, Math.min(1, 1 - (t - c.at) / 0.35)) * 0.8;
      a = Math.max(a, c.keep);
      if (refog > 0) a = Math.max(a, refog * 0.9);
      if (a > 0.01) game.draw.rect(c.x, c.y, c.w + 1, c.h + 1, c.tone ? PALE : GLOW, a);
    }
  }

  function dotSlot(i) {
    return { x: WX0 + 120 + (i % 7) * 122, y: WY0 + 130 + Math.floor(i / 7) * 140 };
  }

  function label(s, x, y, sz, col) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: INK, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  // ── 描画 ──
  var scroll = 0;
  function drawCabin() {
    game.draw.gradient(0, H, [[0, DEEP], [0.5, INK], [1, '#173f17']]);
    // 窓の外: 夜空と雪原
    game.draw.gradient(WY0, SNOW_Y, [INK, DEEP]);
    game.draw.circle(W * 0.78, WY0 + 150, 56, PALE);
    game.draw.circle(W * 0.78 - 18, WY0 + 140, 50, DEEP, 0.5);
    for (var s = 0; s < 14; s++) {
      var sx = ((s * 173 - scroll * 0.05) % (W + 40) + W + 40) % (W + 40);
      if (Math.floor(game.time.elapsed * 2 + s) % 3) game.draw.rect(sx, WY0 + 40 + (s * 61) % 320, 6, 6, GLOW);
    }
    for (var m = 0; m < 6; m++) {
      var mx = ((m * 260 - scroll * 0.15) % 1560 + 1560) % 1560 - 240;
      game.draw.circle(mx, SNOW_Y + 40, 170, DEEP);
    }
    game.draw.gradient(SNOW_Y, WY1, [MID, PALE]);
    for (var t = 0; t < 5; t++) {
      var tx = ((t * 300 - scroll * 0.4) % 1500 + 1500) % 1500 - 210;
      game.draw.sprite(PINE, { k: DEEP }, tx, SNOW_Y + 4, 11, { anchor: 'center' });
    }
  }

  function drawHerd(h, t) {
    if (!h) return;
    for (var i = 0; i < h.list.length; i++) {
      var a = h.list[i], p = animalPos(a, t);
      if (!p.on) continue;
      var fr = Math.floor(p.k * 10) % 2;
      var art = a.kind === 'deer' ? DEER[fr] : FOX[fr];
      var px = a.kind === 'deer' ? 9 : 8;
      // 残像(携帯液晶の尾を引く表示)
      game.draw.sprite(art, { k: DEEP }, p.x - a.dir * 34, p.y, px, { anchor: 'center', flipX: a.dir < 0, alpha: 0.35 });
      game.draw.sprite(art, { k: INK }, p.x, p.y, px, { anchor: 'center', flipX: a.dir < 0 });
      game.draw.rect(p.x - 40, a.lane + 46, 80, 8, DEEP, 0.4);
    }
  }

  function drawPosts() {
    for (var i = 0; i < 4; i++) {
      var x = ((i * 330 - scroll * 1.6) % 1320 + 1320) % 1320 - 120;
      game.draw.sprite(POST, { k: DEEP }, x, WY1 - 70, 12, { anchor: 'center' });
    }
  }

  function drawFrame() {
    game.draw.rect(0, WY0, WX0, WY1 - WY0, '#1c4a1c');
    game.draw.rect(WX1, WY0, W - WX1, WY1 - WY0, '#1c4a1c');
    game.draw.rect(WX0 - 14, WY0 - 14, WX1 - WX0 + 28, 14, MID);
    game.draw.rect(WX0 - 14, WY1, WX1 - WX0 + 28, 20, MID);
    game.draw.rect(WX0 - 14, WY0, 14, WY1 - WY0, MID);
    game.draw.rect(WX1, WY0, 14, WY1 - WY0, MID);
    game.draw.rect(W / 2 - 6, WY0, 12, H * 0.08, MID);
    // 車内の灯り
    game.draw.sprite(LAMP, { p: GLOW, k: INK }, 36, WY0 + 60, 9, { anchor: 'center' });
    game.draw.sprite(LAMP, { p: GLOW, k: INK }, W - 36, WY0 + 60, 9, { anchor: 'center' });
    // 窓枠下の小卓と座席
    game.draw.rect(0, WY1 + 20, W, 40, DEEP);
    game.draw.rect(0, H * 0.90, W, H * 0.10, '#173f17');
    for (var i = 0; i < 6; i++) game.draw.rect(i * 190 + 20, H * 0.90 + 30, 150, 12, INK, 0.5);
    // 携帯機の画面枠
    game.draw.rect(0, 0, W, 10, INK); game.draw.rect(0, H - 10, W, 10, INK);
    game.draw.rect(0, 0, 10, H, INK); game.draw.rect(W - 10, 0, 10, H, INK);
  }

  function drawDots(list, flash) {
    for (var i = 0; i < list.length; i++) {
      var d = list[i];
      var r = 40 + (flash || 0) * 14;
      game.draw.circle(d.x, d.y, r + 6, PALE, 0.7);
      game.draw.circle(d.x, d.y, r, INK);
      game.draw.rect(d.x - 3, d.y + r - 4, 6, 26, INK, 0.7);
      if (flash) game.draw.circle(d.x, d.y, r, '#ffffff', 0.5 * flash);
    }
  }

  function drawKid(mood) {
    var fr = mood === 'cheer' ? 2 : mood === 'sad' ? 3 : Math.floor(game.time.elapsed * 1.3) % 4 === 3 ? 1 : 0;
    var bob = Math.sin(game.time.elapsed * 3) * 5 + (mood === 'cheer' ? -Math.abs(Math.sin(game.time.elapsed * 10)) * 30 : 0);
    game.draw.sprite(KID[fr], { h: INK, f: PALE, e: INK, m: DEEP, c: MID }, W * 0.28, H * 0.81 + bob, 18, { anchor: 'center' });
  }

  function drawReveal(h, k, bad) {
    var n = Math.min(h.deer, Math.floor(k / 0.08));
    for (var i = 0; i < h.deer; i++) {
      var x = W / 2 + (i - (h.deer - 1) / 2) * 112;
      game.draw.sprite(DEER[0], { k: i < n ? INK : DEEP }, x, H * 0.56, 8, { anchor: 'center', alpha: i < n ? 1 : 0.35 });
    }
    label(String(n), W / 2, H * 0.46, 110, bad ? GLOW : PALE);
  }

  // ── 状態 ──
  var station, herd, herdT, fog, phase, phaseT, dots, lockT, lives, score, correctN, timeLeft;
  var ready, halt, over, won, endT, prevBest, lastDiff, milestoneDone, sparkT;

  function initGame() {
    station = 0; lives = LIVES; score = 0; correctN = 0; timeLeft = TIME_LIMIT;
    ready = 0.8; halt = null; over = false; won = false; endT = 0; lastDiff = 0; milestoneDone = false; sparkT = 0;
    prevBest = game.best || 0;
    beginStation();
  }

  function beginStation() {
    herd = makeHerd(station);
    fog = buildFog(station);
    herdT = 0; phase = 'watch'; phaseT = 0; dots = []; lockT = 0;
  }

  function judge() {
    lastDiff = herd.deer - dots.length;
    phase = 'reveal'; phaseT = 0;
    if (lastDiff === 0) {
      correctN++;
      score += 100 + Math.round(timeLeft * 12);
      game.feedback.good(W / 2, WY0 + 300, { text: correctN === STATIONS ? 'PERFECT' : 'GOOD', color: PALE, count: 18 });
      if (correctN >= 2 && !milestoneDone) {
        milestoneDone = true;
        game.fx.popup(correctN + ' / ' + STATIONS, W / 2, H * 0.12, { color: GLOW, size: 60 });
        game.audio.play('se_milestone', 0.4);
      }
    } else {
      halt = { t: 0.45, max: 0.45 };
    }
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.7;
    if (ok) score += Math.round(timeLeft * 20) + lives * 50;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
    if (ok) game.fx.flash(PALE, 0.3);
  }

  function inWindow(x, y) { return x > WX0 && x < WX1 && y > WY0 && y < WY1; }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || halt || ready > 0 || phase !== 'answer' || !inWindow(x, y)) {
      // 窓に息を吹きかけるだけ(数には入らない)
      game.audio.play('se_tap', 0.06);
      game.fx.burst(x, y, { color: GLOW, count: 4, speed: 80, gravity: -120 });
      return;
    }
    if (dots.length >= 14) { game.audio.play('se_tap', 0.08); return; }
    var slot = dotSlot(dots.length);
    dots.push(slot);
    lockT = LOCK_WAIT;
    game.audio.tone(392 + dots.length * 36, 0.07, { wave: 'square', volume: 0.09 });
    game.fx.burst(slot.x, slot.y, { color: PALE, count: 8, speed: 160 });
  });

  // ── ATTRACT: 手が鹿だけを目で追って数え、曇ったガラスに3つ点を打つ ──
  var DEMO_CYCLE = 5.0;
  var demo = { t: 0, herd: null, fog: null, dots: [], gx: W / 2, gy: H * 0.6, press: false, judged: false, counted: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt || !demo.herd) {
      demo.herd = makeHerd(0, { deer: 3, fox: 1, span: 0.7, speed: 1000 });
      demo.fog = buildFog(0);
      demo.dots = []; demo.judged = false; demo.counted = 0;
    }
    var watchEnd = demo.herd.end;
    var tx = W * 0.5, ty = H * 0.62;
    demo.press = false;
    if (cyc < watchEnd) {
      for (var i = 0; i < demo.herd.list.length; i++) {
        var a = demo.herd.list[i];
        if (a.kind !== 'deer' || crossedMid(a, cyc)) continue;
        var p = animalPos(a, cyc);
        if (p.on) { tx = p.x; ty = p.y + 110; break; }
      }
      var passed = 0;
      for (var j = 0; j < demo.herd.list.length; j++) if (demo.herd.list[j].kind === 'deer' && crossedMid(demo.herd.list[j], cyc)) passed++;
      if (passed > demo.counted) { demo.counted = passed; game.audio.tone(523 + passed * 60, 0.05, { wave: 'square', volume: 0.05 }); }
    } else {
      var k = cyc - watchEnd;
      var marks = [0.45, 0.75, 1.05];
      for (var m = 0; m < marks.length; m++) {
        if (k >= marks[m] && demo.dots.length === m) { demo.dots.push(dotSlot(m)); game.audio.tone(392 + (m + 1) * 36, 0.07, { wave: 'square', volume: 0.06 }); }
        if (k > marks[m] - 0.12 && k < marks[m] + 0.06) demo.press = true;
      }
      var nx = dotSlot(Math.min(2, demo.dots.length));
      tx = nx.x; ty = nx.y;
      if (k > 1.9 && !demo.judged) { demo.judged = true; game.feedback.good(W / 2, WY0 + 300, { text: 'GOOD', color: PALE, count: 10, volume: 0.3 }); }
    }
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 10);
    demo.gy += (ty - demo.gy) * Math.min(1, dt * 10);
    return cyc;
  }

  function drawHud() {
    for (var i = 0; i < STATIONS; i++) {
      var c = i < station || (i === station && phase === 'reveal' && lastDiff === 0) ? PALE : i === station ? MID : DEEP;
      game.draw.rect(40 + i * 120, 50, 100, 64, INK);
      game.draw.rect(46 + i * 120, 56, 88, 52, c);
      game.draw.rect(56 + i * 120, 72, 68, 8, INK, 0.6);
    }
    for (var l = 0; l < LIVES; l++) game.draw.circle(W - 80 - l * 70, 82, 24, l < lives ? PALE : DEEP);
    label(correctN + ' / ' + STATIONS, W * 0.56, 84, 46, PALE);
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(40, 156, W - 80, 24, INK);
    game.draw.rect(46, 162, (W - 92) * fr, 12, timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0 ? GLOW : MID);
  }

  function drawAnswerUi(n, lockK, waitK) {
    label(String(n), W * 0.72, H * 0.80, 120, PALE);
    game.draw.rect(W * 0.56, H * 0.86, W * 0.32, 18, INK);
    if (lockK > 0) game.draw.rect(W * 0.56 + 4, H * 0.86 + 4, (W * 0.32 - 8) * lockK, 10, PALE);
    else game.draw.rect(W * 0.56 + 4, H * 0.86 + 4, (W * 0.32 - 8) * waitK, 10, MID);
  }

  function drawResult() {
    game.draw.rect(WX0 + 40, H * 0.27, WX1 - WX0 - 80, H * 0.32, INK, 0.85);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.32, 104, won ? PALE : GLOW);
    label(correctN + ' / ' + STATIONS, W / 2, H * 0.39, 60, PALE);
    label('SCORE ' + score, W / 2, H * 0.45, 50, PALE);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.51, 54, GLOW);
    else label('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.51, 42, MID);
    if (!won && lastDiff > 0) label('あと' + lastDiff + '頭!', W / 2, H * 0.56, 48, GLOW);
  }

  game.onUpdate(function (dt) {
    scroll += dt * 420;

    if (state === S.ATTRACT) {
      var cyc = stepDemo(dt);
      var watchEnd = demo.herd.end;
      drawCabin();
      drawHerd(demo.herd, Math.min(cyc, watchEnd));
      drawPosts();
      drawFog(demo.fog, cyc, cyc > watchEnd ? Math.min(1, (cyc - watchEnd) / 0.3) : 0);
      drawDots(demo.dots, 0);
      drawFrame();
      drawKid(demo.judged ? 'cheer' : 'idle');
      if (cyc < watchEnd) label(String(demo.counted), W * 0.72, H * 0.80, 120, PALE);
      else drawAnswerUi(demo.dots.length, 0, 1 - Math.min(1, (cyc - watchEnd) / 2));
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      label(TITLE, W / 2, H * 0.055, 84, PALE);
      label('HI-SCORE ' + (game.best || 0), W / 2, H * 0.11, 38, GLOW);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.955, 44, PALE);
      else label('TAP TO START', W / 2, H * 0.955, 40, GLOW);
      return;
    }

    if (state === S.PLAYING) {
      if (over) {
        endT -= dt;
        if (won) {
          sparkT -= dt;
          if (sparkT <= 0) { sparkT = 0.22; game.fx.burst(game.random(WX0 + 80, WX1 - 80), game.random(WY0 + 80, SNOW_Y), { color: game.random(0, 1) < 0.5 ? PALE : GLOW, count: 14, speed: 320 }); }
        }
        if (endT <= 0) state = S.RESULT;
      } else if (halt) {
        halt.t -= dt;
        if (halt.t <= 0) {
          halt = null;
          lives--;
          game.feedback.bad(W / 2, WY0 + 300, { text: 'MISS' });
          game.fx.popup(lastDiff > 0 ? 'あと' + lastDiff + '頭' : '+' + (-lastDiff), W / 2, H * 0.40, { color: GLOW, size: 64 });
        }
      } else if (ready > 0) {
        ready -= dt;
        if (ready <= 0) game.audio.play('se_jump', 0.3);
      } else {
        if (phase === 'watch' || phase === 'answer') timeLeft -= dt;
        if (phase === 'watch') {
          var prev = herdT;
          herdT += dt;
          for (var i = 0; i < herd.list.length; i++) {
            var a = herd.list[i];
            if (a.t0 > prev && a.t0 <= herdT) game.audio.tone(a.kind === 'deer' ? 'E4' : 'B3', 0.04, { wave: 'triangle', volume: 0.04 });
          }
          if (herdT >= herd.end) { phase = 'answer'; phaseT = 0; game.audio.play('se_tap', 0.25); }
        } else if (phase === 'answer') {
          phaseT += dt;
          if (dots.length > 0) {
            lockT -= dt;
            if (lockT <= 0) judge();
          } else if (phaseT >= ANSWER_MAX) {
            judge();
          }
        } else if (phase === 'reveal') {
          phaseT += dt;
          if (phaseT > 0.55 + herd.deer * 0.08) {
            if (lives <= 0) finish(false);
            else if (station + 1 >= STATIONS) finish(true);
            else { station++; beginStation(); }
          }
        }
        if (timeLeft <= 0 && !over) {
          timeLeft = 0;
          game.feedback.bad(W / 2, H * 0.40, { text: 'TIME UP' });
          finish(false);
        }
      }
    }

    // ── PLAYING / RESULT の描画 ──
    drawCabin();
    if (phase === 'watch' && ready <= 0) drawHerd(herd, herdT);
    drawPosts();
    var refog = phase === 'watch' ? 0 : Math.min(1, (phase === 'answer' ? phaseT : 1) / 0.3);
    if (phase === 'reveal' && !halt) refog = Math.max(0, 1 - phaseT / 0.25);
    drawFog(fog, ready > 0 ? -1 : herdT, refog);
    drawDots(dots, halt ? 1 - halt.t / halt.max : 0);
    if (phase === 'reveal' && !halt) drawReveal(herd, phaseT, lastDiff !== 0);
    drawFrame();
    drawKid(over ? (won ? 'cheer' : 'sad') : 'idle');
    if (phase === 'answer') drawAnswerUi(dots.length, dots.length ? Math.max(0, lockT / LOCK_WAIT) : 0, 1 - Math.min(1, phaseT / ANSWER_MAX));
    drawHud();
    if (ready > 0) label(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 120, PALE);
    if (over || state === S.RESULT) drawResult();

    if (state === S.RESULT) {
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.955, 40, PALE);
      var stats = { stations: correctN, total: STATIONS, lives: lives };
      if (won) game.end.success(score, stats);
      else game.end.failure(stats);
    }
  });

  game.onStart(function () {
    game.audio.melody([
      ['A4', 0.5], ['C5', 0.5], ['E5', 1], ['D5', 0.5], ['C5', 0.5], ['B4', 1],
      ['A4', 0.5], ['B4', 0.5], ['C5', 0.5], ['E5', 0.5], ['D5', 2],
      ['C5', 0.5], ['B4', 0.5], ['A4', 1], ['G4', 0.5], ['B4', 0.5], ['A4', 1],
    ], {
      tempo: 132, wave: 'triangle', volume: 0.05, loop: true,
      bass: [['A2', 0.5], ['R', 0.5], ['A2', 0.5], ['E2', 0.5], ['F2', 0.5], ['R', 0.5], ['G2', 0.5], ['E2', 0.5],
        ['A2', 0.5], ['R', 0.5], ['A2', 0.5], ['E2', 0.5], ['F2', 0.5], ['R', 0.5], ['G2', 0.5], ['E2', 0.5],
        ['A2', 0.5], ['R', 0.5], ['A2', 0.5], ['E2', 0.5], ['F2', 0.5], ['R', 0.5], ['E2', 0.5], ['A2', 0.5]],
    });
    state = S.ATTRACT;
    initGame();
  });
})(game);

// I-GBA-0043v2-button-tin-twins.js
// ボタン缶ツインズ — 回る缶のふたに伏せたボタンを、糸でつなぐように2つずつめくって同じ形の対を縫い留める
// 操作: 伏せたボタンに指を置くとめくれる。指を離さず別の伏せボタンまで糸を引いて離すと2つ目もめくれる。同じ形なら台紙へ縫い留め、違えば伏せ直る
// 終わり: 3回の缶(2対→3対→4対)をすべて揃えれば成功。糸巻き(全体の持ち時間)が尽きたら失敗。違う対を引くと糸が減る
// @mechanic: pair_match
// @theme: button_tin_turntable
// 世界観: 手芸店の作業台で、ボタン職人が回転台に載せた缶のふたに伏せたボタンを2つずつめくり、同じ形の対を見つけて台紙に縫い留めていく
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア(揃えた対の数・連続一致・残り糸)
// スタイル: HYPERCASUAL 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 白〜淡色の背景に単色の丸い塊。真下に柔らかい影。見た目どおりの当たり判定
  var STYLE = { bg: ['#fbf7f2', '#efe6dc', '#e2d4c6'], main: ['#ff7a6b', '#ffd2c8', '#f2b25c'], accent: ['#3a9dff', '#2c2440'] };
  var C = {
    bg1: STYLE.bg[0], bg2: STYLE.bg[1], bg3: STYLE.bg[2], coral: STYLE.main[0], coralLo: '#d95a4c', back: STYLE.main[1],
    tin: STYLE.main[2], tinLo: '#c98a3c', blue: STYLE.accent[0], ink: STYLE.accent[1], white: '#ffffff',
    good: '#2fc98a', bad: '#ff4060', gold: '#ffb21e', shadow: '#5a4030',
  };

  var GAME_TITLE = 'BUTTON TWINS';
  var TIME_LIMIT = 18;          // pair_match 10〜20s。3つの缶で共有する糸巻き
  var ROUNDS = [
    { pairs: 2, ring: 230, spin: 0.22 },
    { pairs: 3, ring: 270, spin: 0.38 },
    { pairs: 4, ring: 300, spin: -0.52 },
  ];
  var NEEDED = 9;               // 2+3+4 対
  var MISS_COST = 1.2, LONE_COST = 0.4;
  var BTN_R = 72;
  var TIN_X = W / 2, TIN_Y = Math.round(H * 0.455);

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var buttons, rot, round, pairsDone, timeLeft, held, fingerX, fingerY, lockT, lockA, lockB;
  var combo, bestCombo, misses, score, countIn, gapT, over, won, endT, freeze, sewn, milestoneDone, warnT, prevBest, happyT, sadT;

  function label(str, x, y, sz, color) {
    game.draw.text(str, x, y + 4, { size: sz, color: '#00000022', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  // 形のアイコン(白抜き)
  var STAR = ['...#...', '...#...', '#######', '.#####.', '..###..', '.##.##.', '##...##'];
  var HEART = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
  var DIAMOND = ['...#...', '..###..', '.#####.', '#######', '.#####.', '..###..', '...#...'];
  var TRI = ['...#...', '..###..', '..###..', '.#####.', '.#####.', '#######'];
  // ボタン職人(老眼鏡の職人)4フレーム
  var MAKER = [
    ['...gggg...', '..gggggg..', '..ssssss..', '.sooxxoos.', '..ssssss..', '...smms...', '..bbbbbb..', '.bbbbbbbb.', 'sbbbwwbbbs', '..bbbbbb..', '..bb..bb..'],
    ['...gggg...', '..gggggg..', '..ssssss..', '.sooxxoos.', '..ssssss..', '...smms...', '..bbbbbb..', 'sbbbbbbbbs', '.bbbwwbbb.', '..bbbbbb..', '..bb..bb..'],
    ['s..gggg..s', 's.gggggg.s', 'b.ssssss.b', 'bsooxxoosb', '.bssssssb.', '..smmmms..', '..bbbbbb..', '..bbbbbb..', '..bbwwbb..', '..bbbbbb..', '..bb..bb..'],
    ['...gggg...', '..gggggg..', '..ssssss..', '.sooxxoos.', '..ssssss..', '...sMMs...', '..bbbbbb..', '.bbbbbbbb.', '.sbbwwbbs.', '..bbbbbb..', '.bb....bb.'],
  ];
  var MAKER_PAL = { g: '#b9b2ab', s: '#f0c9a4', o: '#3a9dff', x: '#2c2440', m: '#c05a48', M: '#2c2440', b: '#6c5bd4', w: '#ffffff' };

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(game.random(0, i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  function buildRound(idx, fixedShapes) {
    var R = ROUNDS[idx];
    var shapes = fixedShapes ? fixedShapes.slice() : shuffle([0, 1, 2, 3, 4, 5, 6]).slice(0, R.pairs);
    var faces = [];
    for (var i = 0; i < shapes.length; i++) { faces.push(shapes[i]); faces.push(shapes[i]); }
    if (!fixedShapes) shuffle(faces);
    var n = faces.length;
    buttons = [];
    for (var k = 0; k < n; k++) {
      buttons.push({ shape: faces[k], ang: (k / n) * Math.PI * 2 - Math.PI / 2, ring: R.ring, open: false, matched: false, red: 0, glow: 0, flip: 0 });
    }
    rot = 0; held = -1; lockT = 0; lockA = -1; lockB = -1;
  }

  function initGame() {
    round = 0; pairsDone = 0; timeLeft = TIME_LIMIT; combo = 0; bestCombo = 0; misses = 0; score = 0;
    countIn = 0.8; gapT = 0; over = false; won = false; endT = 0; freeze = 0; sewn = []; milestoneDone = false; warnT = 0;
    happyT = 0; sadT = 0; prevBest = game.best;
    buildRound(0, null);
  }

  function posOf(b) {
    var a = b.ang + rot;
    return { x: TIN_X + Math.cos(a) * b.ring, y: TIN_Y + Math.sin(a) * b.ring * 0.9 };
  }

  function buttonAt(x, y, skip) {
    var best = -1, bestD = 1e9;
    for (var i = 0; i < buttons.length; i++) {
      if (i === skip || buttons[i].matched) continue;
      var p = posOf(buttons[i]);
      var d = Math.hypot(p.x - x, p.y - y);
      if (d < BTN_R + 22 && d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  function canAct() { return held < 0 && lockT <= 0 && gapT <= 0 && countIn <= 0 && !over && freeze <= 0; }

  // 1つ目をめくってつまむ
  function grab(i) {
    var b = buttons[i];
    if (!b || b.open || b.matched) return false;
    b.open = true; b.flip = 1; held = i;
    game.audio.tone(520, 0.06, { wave: 'triangle', volume: 0.14, slide: 160 });
    return true;
  }

  // 糸を引いた先で離す
  function letGo(x, y) {
    if (held < 0) return 'none';
    var a = held;
    held = -1;
    var j = buttonAt(x, y, a);
    if (j < 0 || buttons[j].open) {
      buttons[a].open = false; buttons[a].flip = 1;
      if (state === S.PLAYING) timeLeft -= LONE_COST;
      game.audio.play('se_tap', 0.15);
      return 'lone';
    }
    var A = buttons[a], B = buttons[j];
    B.open = true; B.flip = 1;
    var pa = posOf(A), pb = posOf(B);
    var mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2;
    if (A.shape === B.shape) {
      A.matched = true; B.matched = true;
      sewn.push({ shape: A.shape, t: 0, x0: mx, y0: my });
      if (state === S.PLAYING) {
        combo++; bestCombo = Math.max(bestCombo, combo); pairsDone++;
        var gain = 100 * Math.min(4, combo);
        score += gain;
        game.feedback.good(mx, my, { text: combo >= 2 ? 'x' + Math.min(4, combo) : 'GOOD', color: C.good, size: 60 });
        happyT = 0.7;
        if (!milestoneDone && pairsDone >= 5) {
          milestoneDone = true;
          game.audio.play('se_milestone', 0.5);
          game.fx.popup(pairsDone + ' / ' + NEEDED, W / 2, H * 0.2, { color: C.blue, size: 60 });
        }
      } else {
        game.feedback.good(mx, my, { text: 'GOOD', color: C.good, size: 56 });
      }
      checkRoundDone();
      return 'match';
    }
    lockT = 0.6; lockA = a; lockB = j; A.red = 1; B.red = 1;
    game.feedback.bad(mx, my, { text: 'MISS', color: C.bad });
    if (state === S.PLAYING) { combo = 0; misses++; timeLeft -= MISS_COST; sadT = 0.7; }
    return 'miss';
  }

  function checkRoundDone() {
    for (var i = 0; i < buttons.length; i++) if (!buttons[i].matched) return;
    if (state !== S.PLAYING) return;
    game.audio.play('se_coin', 0.45);
    game.fx.burst(TIN_X, TIN_Y, { color: C.gold, count: 26, speed: 460 });
    if (round >= ROUNDS.length - 1) {
      won = true; over = true; freeze = 0.4;
      score += Math.round(Math.max(0, timeLeft) * 40);
      return;
    }
    gapT = 0.7;
  }

  function finish() {
    if (endT > 0) return;
    endT = 1.4;
    game.audio.stopBgm();
    game.audio.play(won ? 'se_success' : 'se_failure', 0.55);
    if (won) for (var i = 0; i < 6; i++) game.fx.burst(game.random(120, 960), game.random(500, 1300), { color: i % 2 ? C.coral : C.blue, count: 20, speed: 440 });
  }

  // ── 時間の進み(本番・デモ共通)──
  function stepTin(dt) {
    var R = ROUNDS[round];
    rot += R.spin * dt;
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      if (b.flip > 0) b.flip = Math.max(0, b.flip - dt * 6);
      if (b.red > 0) b.red = Math.max(0, b.red - dt * 1.6);
    }
    if (lockT > 0) {
      lockT -= dt;
      if (lockT <= 0) {
        if (buttons[lockA]) { buttons[lockA].open = false; buttons[lockA].flip = 1; }
        if (buttons[lockB]) { buttons[lockB].open = false; buttons[lockB].flip = 1; }
        lockA = -1; lockB = -1;
        game.audio.play('se_tap', 0.1);
      }
    }
    for (var s = 0; s < sewn.length; s++) sewn[s].t = Math.min(1, sewn[s].t + dt * 2.5);
    if (happyT > 0) happyT -= dt;
    if (sadT > 0) sadT -= dt;
  }

  // ── 描画 ──
  function drawRoom() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg1], [0.6, C.bg2], [1, C.bg3]]);
    // 遠景の糸巻き(ふわふわ浮く柔らかい塊)
    for (var i = 0; i < 5; i++) {
      var sx = 120 + i * 210, sy = 300 + Math.sin(t * 1.2 + i * 1.7) * 14;
      game.draw.circle(sx, sy + 40, 46, C.shadow, 0.06);
      game.draw.circle(sx, sy, 40, i % 2 ? C.back : '#cfe6ff');
    }
  }

  function softShadow(x, y, r) {
    game.draw.circle(x, y + r * 0.34, r * 0.98, C.shadow, 0.08);
    game.draw.circle(x, y + r * 0.22, r * 0.9, C.shadow, 0.1);
  }

  function drawShape(shape, x, y, r, col) {
    if (shape === 0) { game.draw.circle(x, y, r * 0.5, col); game.draw.circle(x - r * 0.18, y, r * 0.1, C.coral); game.draw.circle(x + r * 0.18, y, r * 0.1, C.coral); }
    else if (shape === 1) { game.draw.rect(x - r * 0.44, y - r * 0.44, r * 0.88, r * 0.88, col); game.draw.circle(x, y, r * 0.1, C.coral); }
    else if (shape === 2) game.draw.sprite(STAR, { '#': col }, x, y, r * 0.15, { anchor: 'center' });
    else if (shape === 3) game.draw.sprite(HEART, { '#': col }, x, y + 2, r * 0.15, { anchor: 'center' });
    else if (shape === 4) { for (var k = 0; k < 5; k++) { var a = k * 1.2566 - 1.5708; game.draw.circle(x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3, r * 0.2, col); } game.draw.circle(x, y, r * 0.16, C.gold); }
    else if (shape === 5) game.draw.sprite(DIAMOND, { '#': col }, x, y, r * 0.15, { anchor: 'center' });
    else game.draw.sprite(TRI, { '#': col }, x, y, r * 0.15, { anchor: 'center' });
  }

  function drawButton(b, active) {
    var p = posOf(b);
    var squash = 1 - b.flip * 0.85;   // めくり: 横に潰れて開く
    var r = BTN_R;
    if (b.matched) return;
    softShadow(p.x, p.y, r);
    var lift = b.open ? 10 : 0;
    var showFace = b.open && b.flip < 0.5;
    var face = b.red > 0 ? C.bad : C.coral;
    game.draw.circle(p.x, p.y - lift, r * Math.max(0.2, squash), showFace ? C.coralLo : '#e8b8ac');
    game.draw.circle(p.x, p.y - lift - 6, r * Math.max(0.18, squash) * 0.94, showFace ? face : C.back);
    if (showFace) {
      drawShape(b.shape, p.x, p.y - lift - 6, r, C.white);
      if (b.red > 0) game.draw.circle(p.x, p.y - lift - 6, r * 1.06, '#ffffff', b.red * 0.5);
    } else if (b.flip <= 0) {
      // 裏面: ステッチの点線
      for (var k = 0; k < 10; k++) { var a = k * 0.628 + rot; game.draw.circle(p.x + Math.cos(a) * r * 0.66, p.y - 6 + Math.sin(a) * r * 0.66, 4, '#e09a8c'); }
      if (active) game.draw.circle(p.x, p.y - 6, r * (1.04 + 0.05 * Math.sin(game.time.elapsed * 7)), C.white, 0.35);
    }
  }

  function drawTin() {
    game.draw.circle(TIN_X, TIN_Y + 44, 404, C.shadow, 0.1);
    game.draw.circle(TIN_X, TIN_Y + 22, 400, C.tinLo);
    game.draw.circle(TIN_X, TIN_Y, 400, C.tin);
    game.draw.circle(TIN_X, TIN_Y, 366, '#f8c97a');
    // 回転が見える目印
    for (var k = 0; k < 12; k++) { var a = k * 0.5236 + rot; game.draw.circle(TIN_X + Math.cos(a) * 384, TIN_Y + Math.sin(a) * 384, 7, C.tinLo); }
    game.draw.circle(TIN_X, TIN_Y, 40, C.tinLo);
    game.draw.circle(TIN_X, TIN_Y - 4, 34, '#ffe0a8');
  }

  function drawThread() {
    if (held < 0) return;
    var p = posOf(buttons[held]);
    game.draw.line(p.x, p.y - 16, fingerX, fingerY, C.blue, 8);
    game.draw.circle(fingerX, fingerY, 14, C.blue);
  }

  function slotPos(k) {
    var col = k % 5, row = Math.floor(k / 5);
    return { x: 190 + col * 175, y: Math.round(H * 0.82) + row * 130 };
  }

  function drawCard() {
    var top = Math.round(H * 0.78);
    game.draw.rect(96, top + 18, W - 160, 300, C.shadow, 0.1);
    game.draw.rect(80, top, W - 160, 300, C.white);
    game.draw.rect(80, top, W - 160, 12, '#eadfd2');
    for (var k = 0; k < NEEDED; k++) {
      var q = slotPos(k);
      game.draw.circle(q.x - 34, q.y + 10, 26, '#f1e8de');
      game.draw.circle(q.x + 34, q.y + 10, 26, '#f1e8de');
    }
    for (var s = 0; s < sewn.length; s++) {
      var sw = sewn[s], q2 = slotPos(s), t = sw.t;
      var x = sw.x0 + (q2.x - sw.x0) * t, y = sw.y0 + (q2.y + 10 - sw.y0) * t - Math.sin(t * Math.PI) * 120;
      var sc = 0.4 + 0.6 * (1 - t) * 0.5 + 0.2;
      for (var side = -1; side <= 1; side += 2) {
        game.draw.circle(x + side * 34, y, 30 * (sc + 0.3), C.coral);
        drawShape(sw.shape, x + side * 34, y, 30 * (sc + 0.3) * 1.3, C.white);
      }
      if (t >= 1) game.draw.line(q2.x - 34, q2.y + 10, q2.x + 34, q2.y + 10, C.blue, 3);
    }
  }

  function drawMaker() {
    var t = game.time.elapsed;
    var f = sadT > 0 ? MAKER[3] : (happyT > 0 || (state === S.RESULT && won)) ? MAKER[2] : MAKER[Math.floor(t * 2) % 2];
    var hop = happyT > 0 ? Math.abs(Math.sin(t * 14)) * 22 : 0;
    var x = W - 130, y = Math.round(H * 0.69) + Math.sin(t * 2.4) * 4 - hop;
    softShadow(x, Math.round(H * 0.69) + 70, 60);
    game.draw.sprite(f, MAKER_PAL, x, y, 13, { anchor: 'center' });
  }

  function hud() {
    label(String(score), 150, 74, 54, C.ink);
    label(pairsDone + ' / ' + NEEDED, W - 160, 74, 46, C.ink);
    for (var i = 0; i < ROUNDS.length; i++) game.draw.circle(W / 2 - 60 + i * 60, 74, 16, i < round || won ? C.coral : (i === round ? C.blue : '#00000018'));
    // 糸巻き(残り時間)
    var frac = Math.max(0, timeLeft / TIME_LIMIT);
    var warn = timeLeft < 3.5 && Math.floor(game.time.elapsed * 8) % 2 === 0;
    game.draw.rect(90, 160, W - 180, 26, '#00000014');
    game.draw.rect(90, 160, (W - 180) * frac, 26, warn ? C.bad : C.blue);
    game.draw.circle(90 + (W - 180) * frac, 173, 24, warn ? C.bad : C.blue);
    game.draw.circle(90 + (W - 180) * frac, 173, 10, C.white);
    if (combo >= 2 && !over) label('COMBO x' + Math.min(4, combo), W / 2, 240, 42, C.coral);
  }

  function drawWorld(activeHint) {
    drawRoom(); drawTin();
    for (var i = 0; i < buttons.length; i++) drawButton(buttons[i], activeHint);
    drawThread(); drawCard(); drawMaker();
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.k = -1; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    fingerX = x; fingerY = y;
    if (!canAct()) { game.audio.play('se_tap', 0.06); return; }
    var i = buttonAt(x, y, -1);
    if (i >= 0) grab(i);
    else { game.audio.play('se_tap', 0.1); game.fx.burst(x, y, { color: C.back, count: 4, speed: 120 }); }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || held < 0) return;
    fingerX = x; fingerY = y;
    if (buttonAt(x, y, held) >= 0 && Math.random() < 0.2) game.audio.tone(880, 0.02, { wave: 'sine', volume: 0.05 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || held < 0) return;
    var r = letGo(x, y);
    if (r === 'lone') game.fx.popup('-0.4', x, y - 60, { color: C.coralLo, size: 34 });
  });

  // ── ATTRACT: 実ロジックで缶を1つ回し、外れ1回→当たり2回 を糸で引いて見せる ──
  var demo = { t: 0, k: -1, gx: W / 2, gy: H * 0.9, press: false, plan: [] };
  function demoStep(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.2;
    if (cyc < dt || demo.t <= dt) {
      round = 0; buildRound(0, [3, 5]);
      sewn = [];
      // 並び: [3,3,5,5] を時計回り → 0と2で外れ、0と1・2と3で当たり
      demo.plan = [[0.5, 0, 2], [2.0, 0, 1], [3.3, 2, 3]];
      demo.k = 0;
    }
    stepTin(dt);
    demo.press = false;
    if (demo.k >= 0 && demo.k < demo.plan.length) {
      var step = demo.plan[demo.k];
      var from = buttons[step[1]], to = buttons[step[2]];
      var pf = posOf(from), pt = posOf(to);
      var into = cyc - step[0];
      if (into < 0) {
        demo.gx += (pf.x - demo.gx) * Math.min(1, dt * 6); demo.gy += (pf.y - demo.gy) * Math.min(1, dt * 6);
      } else if (into < 0.75) {
        if (held < 0 && lockT <= 0) grab(step[1]);
        var t = Math.min(1, into / 0.65);
        demo.gx = pf.x + (pt.x - pf.x) * t; demo.gy = pf.y + (pt.y - pf.y) * t;
        fingerX = demo.gx; fingerY = demo.gy; demo.press = true;
      } else {
        if (held >= 0) letGo(pt.x, pt.y);
        demo.k++;
      }
    } else {
      demo.gx += (W / 2 - demo.gx) * Math.min(1, dt * 2); demo.gy += (H * 0.9 - demo.gy) * Math.min(1, dt * 2);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!buttons) initGame();
      demoStep(dt);
      drawWorld(false);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      label(GAME_TITLE, W / 2, H * 0.06, 84, C.coral);
      label('HI-SCORE ' + game.best, W / 2, H * 0.105, 36, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.975, 42, C.coral);
      else label('TAP TO START', W / 2, H * 0.975, 40, C.ink);
      return;
    }

    if (state === S.RESULT) {
      stepTin(dt * 0.3);
      drawWorld(false);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.2, 96, won ? C.coral : C.bad);
      label('SCORE ' + score, W / 2, H * 0.26, 56, C.ink);
      if (score > prevBest && prevBest > 0) label('NEW RECORD', W / 2, H * 0.3, 50, C.gold);
      else label('BEST ' + Math.max(prevBest, score), W / 2, H * 0.3, 40, C.ink);
      if (!won) label('あと' + (NEEDED - pairsDone) + '対!', W / 2, H * 0.34, 48, C.blue);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.975, 40, C.ink);
      return;
    }

    // ── PLAYING ──
    if (endT > 0) {
      endT -= dt;
      stepTin(dt * 0.3);
      if (endT <= 0) {
        state = S.RESULT;
        var stats = { pairs: pairsDone, misses: misses, maxCombo: bestCombo };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (freeze > 0) {
      freeze -= dt;
      for (var f = 0; f < buttons.length; f++) if (!buttons[f].matched) buttons[f].red = Math.max(buttons[f].red, freeze > 0 ? 0.6 : 0);
      if (freeze <= 0) finish();
    } else if (countIn > 0) {
      countIn -= dt;
      stepTin(dt);
      if (countIn <= 0) game.audio.play('se_tap', 0.3);
    } else {
      stepTin(dt);
      timeLeft -= dt;
      if (timeLeft < 3.5) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.45; game.audio.tone(1180, 0.04, { wave: 'square', volume: 0.07 }); }
      }
      if (gapT > 0) {
        gapT -= dt;
        if (gapT <= 0) { round++; buildRound(round, null); game.audio.play('se_jump', 0.3); }
      }
      if (timeLeft <= 0 && !over) {
        timeLeft = 0; over = true; won = false; freeze = 0.5;
        if (held >= 0) { buttons[held].open = false; held = -1; }
        for (var u = 0; u < buttons.length; u++) if (!buttons[u].matched) { buttons[u].open = true; buttons[u].flip = 0; }
        game.feedback.bad(TIN_X, TIN_Y, { text: 'TIME UP', color: C.bad });
        sadT = 1.5;
      }
    }

    drawWorld(canAct() && round === 0 && pairsDone === 0 && timeLeft > TIME_LIMIT - 1.5);
    hud();
    if (countIn > 0) label(countIn > 0.35 ? 'READY?' : 'GO!', W / 2, TIN_Y, 110, C.blue);
  });

  game.onStart(function() {
    game.audio.melody([
      ['E5', 0.5], ['C5', 0.5], ['D5', 0.5], ['G4', 0.5], ['A4', 1], ['C5', 1],
      ['F5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['D5', 2],
    ], { tempo: 118, wave: 'triangle', volume: 0.05, loop: true, bass: [['C3', 2], ['A2', 2], ['F2', 2], ['G2', 2]] });
    fingerX = W / 2; fingerY = H / 2;
    state = S.ATTRACT;
    initGame();
  });
})(game);

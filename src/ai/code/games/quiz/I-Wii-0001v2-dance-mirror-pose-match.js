// I-Wii-0001v2-dance-mirror-pose-match.js
// 稽古場の型見分け — 掛け軸のお手本の型と、姿見に映る2人の弟子の型を見比べ、同じ型を取っている側を瞬時にタップする
// 操作: 三味線の「チョン」で上の掛け軸の型が変わり、下の姿見の左右の弟子もそれぞれ型を取る。お手本とまったく同じ型の弟子がいる側(画面下半分の左/右)をタップする。違いは腕の高さ→足→扇を持つ手→扇の開き・首の傾げと細かくなり、答えの時間も短くなる(社内メモ。画面には出さない)
// 終わり: 8つの型を見分け、外し(時間切れ含む)が2回までならCLEAR。3回外すとGAME OVER
// @mechanic: judge
// @theme: nihon_buyo_mirror_practice
// 世界観: 日本舞踊の稽古場で、弟子頭の娘が、師匠の掛けた型の絵と姿見に映る二人の妹弟子の型を見比べ、正しく型を取れている方を即座に扇で指し示していく
// 残るもの: 正誤(CLEAR/GAME OVER) + 見分けた型の数・最速の判断・スコア
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: パステル・白縁の丸い形。画面を上下に分け、上に情報(お手本)、下に遊び(姿見)
  var STYLE = { bg: ['#fde8ef', '#e8e4fa'], main: ['#f7a8c4', '#a8d8f0', '#c8b4f0'], accent: ['#ff5a7a', '#ffffff'] };
  var C = {
    pink: STYLE.main[0], sky: STYLE.main[1], lilac: STYLE.main[2], red: STYLE.accent[0], white: STYLE.accent[1],
    ink: '#5a4a6a', wood: '#d8b898', gold: '#f8d070', mint: '#9ae0c0', skin: '#ffe0cc', hair: '#3a2e44',
  };

  var GAME_TITLE = 'KATA MIRROR';
  var POSES = 8;
  var MISS_MAX = 3;
  var TOPY = 540;            // お手本の型の足元
  var MIRY = 1350;           // 姿見の弟子の足元
  var LX = W * 0.29, RX = W * 0.71;
  var FEATURES = [['armL', 'armR'], ['armL', 'armR', 'leg', 'fanHand'], ['fanHand', 'fanOpen', 'head', 'leg']];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var model, poseL, poseR, goodSide, diffKey, idx, phase, phaseT, win, answeredSide, right, misses, combo, score, finalScore, fastest, readyT, stopT, stopKind, fin, cleared, postT, joyT, sadT, milestone;

  var HEAD = ['..hhhh..', '.hhhhhhg', 'hhhhhhhh', 'hssssssh', '.skssks.', '.ssssss.', '..smms..', '...ss...'];
  var HEAD_PAL = { h: '#3a2e44', s: '#ffe0cc', k: '#3a2e44', m: '#ff7a9a', g: '#f8d070' };
  var FAN_OPEN = ['.rrrrrrr.', 'rrwrrrwrr', 'rrrrrrrrr', '.rrrrrrr.', '...rrr...', '....b....'];
  var MASTER_A = ['..hhhh..', '.hhhhhh.', '.hsssshh', '..skks..', '..ssss..', '.pppppp.', 'pppppppp', 'p.pppp.p', '..pppp..', '..pppp..', '..p..p..'];
  var MASTER_B = ['..hhhh..', '.hhhhhh.', '.hsssshh', '..skks..', '..ssss..', '.pppppp.', 'pppppppp', '..pppp.p', '..pppp.r', '..pppp..', '..p..p..'];
  var MASTER_PAL = { h: '#b8b0c8', s: '#ffe0cc', k: '#5a4a6a', p: '#8a74b0', r: '#ff5a7a' };

  function out(str, x, y, sz, color) {
    game.draw.text(str, x, y + 4, { size: sz, color: '#ffffff', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }
  function pill(x, y, w, h, col, a) {
    var r = Math.min(h, w) / 2;
    game.draw.rect(x + r, y, w - r * 2, h, col, a);
    game.draw.circle(x + r, y + r, r, col, a); game.draw.circle(x + w - r, y + h - r, r, col, a);
    if (h > w) { game.draw.rect(x, y + r, w, h - r * 2, col, a); game.draw.circle(x + r, y + h - r, r, col, a); }
    else game.draw.circle(x + r, y + h - r, r, col, a), game.draw.circle(x + w - r, y + r, r, col, a);
  }

  function randPose() {
    return { armL: Math.floor(game.random(0, 3)), armR: Math.floor(game.random(0, 3)), leg: Math.floor(game.random(0, 3)), fanHand: Math.random() < 0.5 ? 0 : 1, fanOpen: Math.random() < 0.6 ? 1 : 0, head: Math.floor(game.random(-1, 1.999)) };
  }
  function copy(p) { return { armL: p.armL, armR: p.armR, leg: p.leg, fanHand: p.fanHand, fanOpen: p.fanOpen, head: p.head }; }
  function alter(p, key) {
    var q = copy(p);
    if (key === 'armL' || key === 'armR' || key === 'leg') q[key] = (p[key] + 1 + Math.floor(game.random(0, 1.999))) % 3;
    else if (key === 'head') q.head = p.head === 0 ? (Math.random() < 0.5 ? -1 : 1) : 0;
    else q[key] = 1 - p[key];
    return q;
  }

  function nextPose() {
    var tier = idx < 3 ? 0 : idx < 6 ? 1 : 2;
    var keys = FEATURES[tier];
    model = randPose();
    diffKey = keys[Math.floor(game.random(0, keys.length - 0.001))];
    goodSide = Math.random() < 0.5 ? -1 : 1;
    var bad = alter(model, diffKey);
    poseL = goodSide < 0 ? copy(model) : bad;
    poseR = goodSide > 0 ? copy(model) : bad;
    win = 2.0 - idx * 0.14;
    phase = 'strike'; phaseT = 0; answeredSide = 0;
    game.audio.tone('E5', 0.05, { wave: 'square', volume: 0.07 });
    game.audio.tone('B5', 0.12, { wave: 'triangle', volume: 0.06, slide: -200 });
  }

  function initGame() {
    idx = 0; right = 0; misses = 0; combo = 0; score = 0; finalScore = 0; fastest = 0;
    readyT = 0.8; stopT = 0; stopKind = ''; fin = false; cleared = false; postT = 0; joyT = 0; sadT = 0; milestone = false;
    nextPose();
  }

  function answer(side) {
    if (phase !== 'strike' || answeredSide) return false;
    answeredSide = side || 2;
    phase = 'judged'; var rt = phaseT; phaseT = 0;
    var x = side < 0 ? LX : RX;
    if (side === goodSide) {
      right++; combo++; joyT = 0.6;
      var quick = rt < win * 0.45;
      var pts = (quick ? 300 : 180) * Math.min(3, 1 + Math.floor(combo / 3));
      score += pts;
      if (!fastest || rt < fastest) fastest = rt;
      game.feedback.good(x, MIRY - 300, { text: quick ? 'PERFECT' : 'GOOD', color: C.red, size: 62 });
      game.fx.popup('+' + pts, x, MIRY - 420, { color: C.ink, size: 44 });
      if (combo >= 3) game.fx.popup('x' + Math.min(3, 1 + Math.floor(combo / 3)), x + 160, MIRY - 360, { color: C.gold, size: 50 });
      if (mode === S.PLAYING && !milestone && right >= 4) { milestone = true; game.audio.play('se_milestone', 0.5); game.fx.popup('NICE', W / 2, H * 0.47, { color: C.red, size: 84 }); }
    } else {
      misses++; combo = 0; sadT = 0.9;
      if (mode === S.PLAYING && misses >= MISS_MAX) {
        stopT = 0.55; stopKind = 'miss';
        game.fx.flash('#ffffff', 0.2);
        game.audio.play('se_break', 0.3);
      } else game.feedback.bad(side ? x : W / 2, MIRY - 300, { text: 'MISS', color: C.red, size: 60 });
    }
    return true;
  }

  function stepPose(dt) {
    phaseT += dt;
    if (joyT > 0) joyT -= dt;
    if (sadT > 0) sadT -= dt;
    if (phase === 'strike') {
      var left = win - phaseT;
      if (left < 0.5 && Math.floor(left * 8) !== Math.floor((left + dt) * 8)) game.audio.tone('A5', 0.03, { wave: 'square', volume: 0.04 });
      if (phaseT >= win) answer(0);
    }
  }

  function ending(winGame) {
    if (fin) return;
    fin = true; cleared = winGame; postT = 1.4;
    finalScore = score + (winGame ? (MISS_MAX - 1 - misses) * 200 + (misses === 0 ? 300 : 0) : 0);
    game.audio.stopBgm();
    game.audio.play(winGame ? 'se_success' : 'se_failure', 0.55);
    if (winGame) {
      for (var i = 0; i < 7; i++) game.fx.burst(120 + i * 140, H * 0.45 + (i % 2) * 200, { color: [C.pink, C.sky, C.lilac, C.gold][i % 4], count: 18, speed: 520 });
      game.fx.flash(C.white, 0.25);
    }
  }

  function canPlay() { return mode === S.PLAYING && !fin && stopT <= 0 && readyT <= 0; }

  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (!canPlay()) return;
    if (y < 900) { game.audio.play('se_tap', 0.1); game.fx.burst(x, y, { color: C.lilac, count: 4, speed: 120 }); return; }
    game.audio.play('se_tap', 0.25);
    answer(x < W / 2 ? -1 : 1);
  });

  // ---- 描画 ----
  // 型の人形: 頭(スプライト)+着物+腕(線)+扇+足
  function figure(x, y, s, p, kimono, hiKey, t) {
    var hot = function(k) { return hiKey === k && Math.floor(t * 14) % 2 === 0; };
    var bodyTop = y - 150 * s;
    // 足
    var lift = [0, -1, 1][p.leg];
    for (var side = -1; side <= 1; side += 2) {
      var up = lift === side;
      var col = hot('leg') ? C.white : C.skin;
      game.draw.rect(x + side * 16 * s - 8 * s, y - (up ? 70 : 30) * s, 16 * s, (up ? 34 : 30) * s, col);
      game.draw.rect(x + side * 16 * s - 12 * s + (up ? side * 14 * s : 0), y - (up ? 46 : 6) * s, 24 * s, 8 * s, '#ffffff');
    }
    // 着物
    game.draw.rect(x - 34 * s, bodyTop + 30 * s, 68 * s, 100 * s, kimono);
    game.draw.rect(x - 36 * s, bodyTop + 66 * s, 72 * s, 18 * s, C.gold);
    game.draw.rect(x - 6 * s, bodyTop + 30 * s, 12 * s, 36 * s, '#ffffff', 0.7);
    // 腕: 0=下 1=横 2=上
    var ang = [-1.0, 0, 1.0];
    var hands = [];
    for (var a = -1; a <= 1; a += 2) {
      var k = a < 0 ? 'armL' : 'armR', th = ang[p[k]];
      var sx = x + a * 30 * s, sy = bodyTop + 40 * s;
      var hx = sx + a * Math.cos(th) * 78 * s, hy = sy - Math.sin(th) * 78 * s;
      game.draw.line(sx, sy, hx, hy, hot(k) ? C.white : kimono, 22 * s);
      game.draw.circle(hx, hy, 10 * s, hot(k) ? C.white : C.skin);
      hands.push({ x: hx, y: hy, a: a });
    }
    // 扇
    var fh = hands[p.fanHand];
    var fanHot = hot('fanHand') || hot('fanOpen');
    if (p.fanOpen) game.draw.sprite(FAN_OPEN, { r: fanHot ? C.white : C.red, w: C.gold, b: C.ink }, fh.x + fh.a * 10 * s, fh.y - 26 * s, 6 * s, { anchor: 'center' });
    else game.draw.line(fh.x, fh.y, fh.x + fh.a * 10 * s, fh.y - 46 * s, fanHot ? C.white : C.red, 10 * s);
    // 頭(首の傾げ)
    game.draw.sprite(HEAD, hot('head') ? { h: '#ffffff', s: '#ffffff', k: '#ffffff', m: '#ffffff', g: '#ffffff' } : HEAD_PAL, x + p.head * 12 * s, bodyTop + 2 * s + Math.abs(p.head) * 3 * s, 7 * s, { anchor: 'center', flipX: p.head < 0 });
  }

  function topPanel(t) {
    // 上画面: 稽古場の床の間と掛け軸(お手本)
    pill(30, 240, W - 60, 620, '#ffffff', 0.85);
    pill(50, 260, W - 100, 580, STYLE.bg[0]);
    game.draw.rect(W / 2 - 200, 270, 400, 26, C.wood);
    game.draw.rect(W / 2 - 180, 296, 360, 520, '#fffaf0');
    game.draw.rect(W / 2 - 180, 296, 360, 12, C.lilac);
    game.draw.rect(W / 2 - 180, 804, 360, 12, C.lilac);
    game.draw.rect(W / 2 - 200, 816, 400, 22, C.wood);
    var big = stopT > 0 && stopKind === 'miss';
    figure(W / 2, TOPY + 220, 1.25, model, C.lilac, big ? diffKey : '', t);
    // 師匠(脇で扇を構える)
    var fr = Math.floor(t * 2) % 2 ? MASTER_A : MASTER_B;
    game.draw.sprite(fr, MASTER_PAL, 150, 700 + Math.sin(t * 2) * 4, 12, { anchor: 'center' });
    // 残り時間(縮む帯)
    if (phase === 'strike') {
      var u = Math.max(0, 1 - phaseT / win);
      pill(W / 2 - 300, 852, 600, 26, '#00000014');
      pill(W / 2 - 300, 852, Math.max(26, 600 * u), 26, u < 0.3 ? C.red : C.mint);
    }
  }

  function mirror(t) {
    // 下画面: 姿見(左右2枚)
    game.draw.rect(0, 890, W, 20, C.lilac);
    for (var side = -1; side <= 1; side += 2) {
      var x = side < 0 ? LX : RX;
      var chosen = answeredSide === side;
      var good = side === goodSide;
      var frame = phase === 'judged' && chosen ? (good ? C.mint : C.red) : '#ffffff';
      pill(x - 230, 930, 460, 620, frame);
      pill(x - 210, 950, 420, 580, '#eaf6fc');
      game.draw.rect(x - 150, 990, 30, 480, '#ffffff', 0.5);
      var p = side < 0 ? poseL : poseR;
      var big = stopT > 0 && stopKind === 'miss' && side !== goodSide;
      var settle = phase === 'strike' ? Math.min(1, phaseT / 0.2) : 1;
      var hop = (phase === 'judged' && good && joyT > 0) ? -Math.abs(Math.sin(t * 12)) * 16 : (1 - settle) * 30;
      figure(x, MIRY + hop, big ? 1.25 : 1.05, p, side < 0 ? C.pink : C.sky, big ? diffKey : (phase === 'judged' && side !== goodSide && phaseT < 0.6 ? diffKey : ''), t);
      if (big) game.draw.circle(x, MIRY - 160, 220 + (0.55 - stopT) * 160, C.red, 0.15);
    }
    // 親指ゾーン: 左右の押し所
    for (var s2 = -1; s2 <= 1; s2 += 2) {
      var px = s2 < 0 ? LX : RX, glow = phase === 'strike' && Math.sin(t * 7) > 0;
      pill(px - 206, 1594, 412, 162, s2 < 0 ? C.pink : C.sky);
      pill(px - 200, 1600, 400, 150, glow ? '#ffffff' : '#f6f0fa');
      game.draw.sprite(FAN_OPEN, { r: s2 < 0 ? C.pink : C.sky, w: C.gold, b: C.ink }, px, 1672 + Math.sin(t * 4 + s2) * 5, 11, { anchor: 'center' });
    }
  }

  function drawHud(t) {
    pill(40, 30, W - 80, 180, '#ffffff', 0.8);
    for (var i = 0; i < POSES; i++) {
      var done = i < idx || (i === idx && phase === 'judged');
      game.draw.circle(W / 2 - 280 + i * 80, 80, 22, i === idx ? C.red : done ? C.lilac : '#00000018');
    }
    out(right + ' / ' + POSES, W / 2, 180, 48, C.ink);
    out('' + score, 160, 180, 40, C.red);
    for (var m = 0; m < MISS_MAX; m++) game.draw.sprite(FAN_OPEN, m < misses ? { r: '#c8c0d0', w: '#c8c0d0', b: '#c8c0d0' } : { r: C.red, w: C.gold, b: C.ink }, W - 110 - m * 80, 160, 6, { anchor: 'center' });
  }

  function drawScene(t) {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.5, '#f4e8f4'], [1, STYLE.bg[1]]]);
    for (var k = 0; k < 12; k++) game.draw.circle((k * 211) % W, 300 + (k * 157) % 1500, 40 + (k % 3) * 20, '#ffffff', 0.25 + Math.sin(t + k) * 0.08);
    topPanel(t);
    mirror(t);
    for (var sl = 0; sl < H; sl += 8) game.draw.rect(0, sl, W, 2, '#000000', 0.025);
  }

  // ---- ATTRACT: 本物の answer() をゴーストが押す。1つ目は正しい側、2つ目はわざと違う側を押して MISS ----
  var demo = { t: 0, x: W / 2, y: 1680, press: false, pt: 0, n: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; demo.n = 0; }
    stepPose(dt);
    if (phase === 'judged' && phaseT > 0.8) { idx = (idx + 1) % 3; nextPose(); }
    if (demo.pt > 0) demo.pt -= dt;
    var tx = W / 2, ty = 1700;
    if (phase === 'strike') {
      var side = demo.n % 2 === 0 ? goodSide : -goodSide;
      tx = side < 0 ? LX : RX; ty = 1660;
      if (phaseT > 1.0 && Math.abs(demo.x - tx) < 20) { answer(side); demo.n++; demo.pt = 0.25; }
    }
    demo.press = demo.pt > 0;
    demo.x += (tx - demo.x) * Math.min(1, dt * 7);
    demo.y += (ty - demo.y) * Math.min(1, dt * 7);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 13 });
      pill(W / 2 - 360, 40, 720, 170, '#ffffff', 0.92);
      out(GAME_TITLE, W / 2, 125 + Math.sin(t * 2) * 5, 96, C.red);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 190, 38, C.ink);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.965, 46, C.red);
      else out('TAP TO START', W / 2, H * 0.965, 42, C.ink);
      return;
    }

    if (mode === S.RESULT) {
      drawScene(t);
      pill(90, H * 0.3, W - 180, 480, '#ffffff', 0.95);
      out(cleared ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.36, 96, cleared ? C.mint : C.red);
      out('SCORE ' + finalScore, W / 2, H * 0.42, 60, C.ink);
      out(right + ' / ' + POSES + (fastest ? '   ' + fastest.toFixed(2) + '秒' : ''), W / 2, H * 0.47, 42, C.lilac);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.52, 56, C.red);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.52, 42, C.ink);
      if (!cleared) out('あと' + (POSES - idx) + '型!', W / 2, H * 0.27, 64, C.red);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.ink);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { correct: right, misses: misses, fastest: fastest };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) {
        if (stopKind === 'win') ending(true);
        else { game.feedback.bad(goodSide < 0 ? RX : LX, MIRY - 300, { text: 'MISS', color: C.red, size: 62 }); ending(false); }
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      stepPose(dt);
      if (phase === 'judged' && phaseT > 0.4 && stopT <= 0) {
        idx++;
        if (idx >= POSES) { idx = POSES; stopT = 0.4; stopKind = 'win'; phase = 'over'; game.audio.play('se_powerup', 0.45); }
        else { nextPose(); game.audio.play('se_jump', 0.2); }
      }
    }

    drawScene(t);
    if (stopT > 0 && stopKind === 'win') game.draw.circle(W / 2, H * 0.5, 120 + (0.4 - stopT) * 1600, C.white, 0.35);
    // 最初の型だけ: 正しい側を指す手のお手本
    if (!fin && readyT <= 0 && idx === 0 && phase === 'strike' && phaseT < 1.2) {
      var gx = goodSide < 0 ? LX : RX;
      game.draw.hand(gx, 1680 - Math.abs(Math.sin(phaseT * 6)) * 30, { press: Math.sin(phaseT * 6) > 0.6, scale: 11, alpha: 0.45 });
    }
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, 905, 110, C.red);
  });

  game.onStart(function() {
    game.audio.melody([
      ['A4', 1], ['C5', 0.5], ['D5', 0.5], ['E5', 1], ['R', 0.5], ['E5', 0.5],
      ['G5', 1], ['E5', 0.5], ['D5', 0.5], ['C5', 1], ['A4', 1],
      ['D5', 0.5], ['E5', 0.5], ['G5', 0.5], ['A5', 0.5], ['G5', 1], ['E5', 1], ['A4', 2],
    ], { tempo: 108, wave: 'triangle', volume: 0.06, loop: true, bass: [['A2', 2], ['E2', 2], ['D2', 2], ['A2', 2]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);

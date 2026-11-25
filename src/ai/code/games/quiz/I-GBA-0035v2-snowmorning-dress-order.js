// I-GBA-0035v2-snowmorning-dress-order.js
// 雪の朝の着せ順 — 玄関の札に一瞬ずつ映る着る順番を覚え、下の画面の衣服を同じ順にタップして子どもに上から着せていく
// 操作: 上の画面の札に衣服が1つずつ光って順番が示される(この間は下の衣服は鍵がかかって押せない)。札が白に戻ったら、下の衣服ボタンを同じ順にタップ。合っていれば子どもがその服を着る。間違えると子どもがくしゃみをして札がもう一度光る
// 終わり: 3人(3枚→4枚→5枚)を20秒以内に着せ終えればCLEAR。3回間違える/時間切れでGAME OVER。重ね着は肌着→セーター→コートの順だが、帽子・マフラー・手袋・長靴が札ごとに違う位置に入る
// @mechanic: memory_sequence
// @theme: snow_country_morning_dressing
// 世界観: 雪国の朝の玄関先で、母親が玄関の札に一瞬映った支度の手順を覚え、登園前の3人の子どもに肌着・セーター・コートと小物を同じ順で手早く着せていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 着せ終えた人数・着せた枚数・間違い回数・スコア
// スタイル: 2000s HANDHELD PASTEL

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: パステル、白縁の丸い形。上の画面=情報(札と子ども)/下の画面=遊び(衣服ボタン)
  var STYLE = { bg: ['#f6eefc', '#e8f4fa'], main: ['#ffb8cc', '#b8dcff', '#c8f0c0'], accent: ['#ff7aa0', '#ffffff'] };
  var PINK = STYLE.main[0], BLUE = STYLE.main[1], MINT = STYLE.main[2];
  var ROSE = STYLE.accent[0], WHITE = STYLE.accent[1];
  var INK = '#6a5a7a';

  var LOGO = 'DRESS ORDER';
  var LENGTHS = [3, 4, 5];
  var NEEDED = 12;
  var STRIKES = 3;
  var TIME_LIMIT = 20;
  var TOP_Y0 = 236, TOP_Y1 = H * 0.47;
  var CARD_X = W * 0.7, CARD_Y = H * 0.3;
  var CHILD_X = W * 0.28, CHILD_Y = H * 0.33;

  var MODE = { ATTRACT: 'attract', PLAYING: 'playing', RESULT: 'result' };
  var mode = MODE.ATTRACT;

  // ── スプライト: 子ども(素体)と、同じ格子に重ねる衣服 ──
  var CHILD = [
    '....HHHHHH....', '...HHHHHHHH...', '...HSSSSSSH...', '...SKSSSSKS...', '...SSSSSSSS...', '....SSMMSS....', '.....SSSS.....',
    '...PPPPPPPP...', '..PPPPPPPPPP..', '.SPPPPPPPPPPS.', '.SPPPPPPPPPPS.', '...PPPPPPPP...', '...PPPPPPPP...',
    '...PPP..PPP...', '...PPP..PPP...', '...PPP..PPP...', '...SSS..SSS...',
  ];
  var CHILD_SNEEZE = [
    '....HHHHHH....', '...HHHHHHHH...', '...HSSSSSSH...', '...SKKSSKKS...', '...SSSSSSSS...', '....SMMMMS....', '.....SSSS.....',
    '...PPPPPPPP...', '..PPPPPPPPPP..', '.SPPPPPPPPPPS.', '.SPPPPPPPPPPS.', '...PPPPPPPP...', '...PPPPPPPP...',
    '...PPP..PPP...', '...PPP..PPP...', '...PPP..PPP...', '...SSS..SSS...',
  ];
  var WEAR = [
    ['', '', '', '', '', '', '', '...WWWWWWWW...', '...WWWWWWWW...', '...WWWWWWWW...', '...WWWWWWWW...', '...WWWWWWWW...'],
    ['', '', '', '', '', '', '', '..XXXXXXXXXX..', '..XXWXXWXXXX..', '.XXXXXXXXXXXX.', '.XXXXXXXXXXXX.', '...XXXXXXXX...', '...XXXXXXXX...'],
    ['', '', '', '', '', '', '', '..CCCCCCCCCC..', '.CCCCCYCCCCCC.', '.CCCCCCCCCCCC.', '.CCCCCYCCCCCC.', '..CCCCCCCCCC..', '..CCCCCYCCCC..', '..CCCCCCCCCC..', '..CCC....CCC..'],
    ['', '', '', '', '', '', '...FFFFFFFF...', '...FFFFFFFF...', '.........FF...', '.........FF...'],
    ['......ZZ......', '...ZZZZZZZZ...', '..ZQQQQQQQQZ..'],
    ['', '', '', '', '', '', '', '', '', 'MM..........MM', 'MM..........MM'],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '..BBBB.BBBB...', '..BBBB.BBBB...'],
  ];
  var WEAR_PAL = { W: '#ffffff', X: '#ff9ab8', C: '#7ab0ff', Y: '#fff0a0', F: '#ff7a7a', Z: '#b89aff', Q: '#ffffff', M: '#7ad0a0', B: '#ffcc66' };
  var CHILD_COLS = ['#ffd6a8', '#f0c090', '#e8b888'];
  // ボタン用アイコン(衣服ID順: 肌着/セーター/コート/マフラー/帽子/手袋/長靴)
  var ICONS = [
    ['.WW....WW.', '.WW....WW.', 'WWWWWWWWWW', 'WWWWWWWWWW', 'WWWWWWWWWW', 'WWWWWWWWWW', 'WWWWWWWWWW', 'WWWWWWWWWW'],
    ['..XX..XX..', 'XXXXXXXXXX', 'XXWXXWXXWX', 'XXXXXXXXXX', 'XXXXXXXXXX', 'XXWXXWXXWX', '.XXXXXXXX.', '.XXXXXXXX.'],
    ['..CC..CC..', '.CCCCCCCC.', 'CCCCYCCCCC', 'CCCCCCCCCC', 'CCCCYCCCCC', 'CCCCCCCCCC', 'CCCCYCCCCC', 'CCC....CCC'],
    ['FFFFFFFFFF', 'FFWFFWFFWF', 'FFFFFFFFFF', '......FFF.', '......FWF.', '......FFF.', '......F.F.', '..........'],
    ['....ZZ....', '...ZZZZ...', '.ZZZZZZZZ.', 'ZZZZZZZZZZ', 'ZZZZZZZZZZ', 'QQQQQQQQQQ', 'QQQQQQQQQQ', '..........'],
    ['.MM....MM.', 'MMMM..MMMM', 'MMMM..MMMM', 'MMMMMMMMMM', 'MMMMMMMMMM', '.MMM..MMM.', '.MMM..MMM.', '..........'],
    ['.BBB..BBB.', '.BBB..BBB.', '.BBB..BBB.', '.BBB..BBB.', '.BBBB.BBBB', 'BBBBB.BBBB', 'BBBBB.BBBB', '..........'],
  ];
  var ICON_PAL = { W: '#ffffff', X: '#ff9ab8', C: '#7ab0ff', Y: '#fff0a0', F: '#ff7a7a', Z: '#b89aff', Q: '#ffffff', M: '#7ad0a0', B: '#ffcc66' };
  var NOTES = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6'];
  var LOCK = ['.KKKK.', 'K....K', 'K....K', 'KKKKKK', 'KK..KK', 'KKKKKK'];
  var BTN = [
    { x: W * 0.14, y: H * 0.6 }, { x: W * 0.38, y: H * 0.6 }, { x: W * 0.62, y: H * 0.6 }, { x: W * 0.86, y: H * 0.6 },
    { x: W * 0.26, y: H * 0.77 }, { x: W * 0.5, y: H * 0.77 }, { x: W * 0.74, y: H * 0.77 },
  ];
  var BTN_R = 104;

  // ── 手順モデル(本番・デモ共通) ──
  function makeOrder(n) {
    var layers = n <= 3 ? (Math.random() < 0.5 ? [0, 1] : [1, 2]) : (n === 4 ? (Math.random() < 0.5 ? [0, 2] : [0, 1, 2]) : [0, 1, 2]);
    var acc = [3, 4, 5, 6];
    for (var i = acc.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = acc[i]; acc[i] = acc[j]; acc[j] = t; }
    var seq = layers.slice();
    for (var a = 0; seq.length < n; a++) seq.splice(Math.floor(Math.random() * (seq.length + 1)), 0, acc[a]);
    return seq;
  }
  function makeRound(n, kid) { return { seq: makeOrder(n), kid: kid, worn: [], pos: 0, show: 0.35, showIdx: -1, per: 0.48, phase: 'show', sneeze: 0, joy: 0 }; }
  function replay(R, per) { R.phase = 'show'; R.show = 0.3; R.showIdx = -1; R.per = per; R.pos = 0; R.worn = []; }
  // 戻り値: '' / 'flash' / 'input'
  function tickRound(R, dt) {
    if (R.sneeze > 0) R.sneeze -= dt;
    if (R.joy > 0) R.joy -= dt;
    if (R.phase !== 'show') return '';
    R.show -= dt;
    if (R.show > 0) return '';
    R.showIdx++;
    if (R.showIdx >= R.seq.length) { R.phase = 'input'; R.showIdx = -1; return 'input'; }
    R.show = R.per;
    return 'flash';
  }
  // 衣服ボタンを押した: 'good' / 'done' / 'bad' / 'locked'
  function pick(R, item) {
    if (R.phase !== 'input') return 'locked';
    if (R.seq[R.pos] === item) {
      R.worn.push(item); R.pos++;
      if (R.pos >= R.seq.length) { R.phase = 'done'; R.joy = 1; return 'done'; }
      return 'good';
    }
    R.sneeze = 0.7;
    return 'bad';
  }
  function btnAt(x, y) {
    for (var i = 0; i < BTN.length; i++) {
      var dx = x - BTN[i].x, dy = y - BTN[i].y;
      if (dx * dx + dy * dy < BTN_R * BTN_R) return i;
    }
    return -1;
  }

  // ── 描画 ──
  function rounded(x, y, w, h, r, col, a) {
    game.draw.rect(x + r, y, w - r * 2, h, col, a);
    game.draw.rect(x, y + r, w, h - r * 2, col, a);
    game.draw.circle(x + r, y + r, r, col, a);
    game.draw.circle(x + w - r, y + r, r, col, a);
    game.draw.circle(x + r, y + h - r, r, col, a);
    game.draw.circle(x + w - r, y + h - r, r, col, a);
  }

  function drawShell() {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.5, '#f0e8f8'], [1, STYLE.bg[1]]]);
    // 上の画面(枠 + 玄関)
    rounded(30, TOP_Y0 - 10, W - 60, TOP_Y1 - TOP_Y0 + 20, 40, WHITE);
    rounded(50, TOP_Y0 + 10, W - 100, TOP_Y1 - TOP_Y0 - 20, 30, '#dff0ff');
    // 玄関の窓と雪
    rounded(90, TOP_Y0 + 40, 300, 200, 20, WHITE);
    rounded(104, TOP_Y0 + 54, 272, 172, 14, '#a8d0f0');
    for (var s = 0; s < 14; s++) {
      var sx = 110 + ((s * 67 + game.time.elapsed * 20) % 260);
      var sy = TOP_Y0 + 60 + ((s * 41 + game.time.elapsed * (50 + s * 4)) % 160);
      game.draw.circle(sx, sy, 5 + (s % 3) * 2, WHITE);
    }
    game.draw.rect(104, TOP_Y0 + 196, 272, 30, WHITE);
    // 床
    game.draw.rect(50, TOP_Y1 - 150, W - 100, 130, '#f6dcc0');
    for (var f = 0; f < 6; f++) game.draw.rect(50, TOP_Y1 - 150 + f * 22, W - 100, 2, '#e8c8a8');
    // ちょうつがい(2画面の名残)
    rounded(W * 0.2, TOP_Y1 + 18, W * 0.6, 26, 13, '#e0d0ec');
    // 下の画面
    rounded(30, TOP_Y1 + 60, W - 60, H - TOP_Y1 - 90, 40, WHITE);
    rounded(50, TOP_Y1 + 80, W - 100, H - TOP_Y1 - 130, 30, '#fbf4ff');
  }

  function drawChild(R, mood) {
    if (!R) return;
    var skin = CHILD_COLS[R.kid % 3];
    var px = 15 - R.kid;
    var hop = mood === 'joy' || R.joy > 0 ? -Math.abs(Math.sin(game.time.elapsed * 10)) * 30 : 0;
    var shiver = R.sneeze > 0 ? Math.sin(game.time.elapsed * 60) * 8 : Math.sin(game.time.elapsed * 3) * 2;
    var x = CHILD_X + shiver, y = CHILD_Y + 40 + hop;
    game.draw.circle(CHILD_X, TOP_Y1 - 50, 90, '#c8a8b8', 0.3);
    var pal = { H: '#5a3a2a', S: skin, K: '#3a2a3a', M: '#ff7a9a', P: '#e8e0ff' };
    game.draw.sprite(R.sneeze > 0 || mood === 'sad' ? CHILD_SNEEZE : CHILD, pal, x, y, px, { anchor: 'center' });
    var order = [0, 1, 2, 3, 4, 5, 6];
    for (var i = 0; i < order.length; i++) {
      if (R.worn.indexOf(order[i]) < 0) continue;
      var art = WEAR[order[i]];
      var full = [];
      for (var r = 0; r < CHILD.length; r++) full.push(art[r] || '');
      game.draw.sprite(full, WEAR_PAL, x, y, px, { anchor: 'center' });
    }
    if (R.sneeze > 0.4) {
      for (var d = 0; d < 5; d++) game.draw.circle(x + 70 + d * 18, y - 80 - d * 6, 8, WHITE, 0.9);
    }
  }

  function drawCard(R, hl) {
    // 玄関の札(手順が1つずつ光る)
    var showing = R && R.phase === 'show' && R.showIdx >= 0;
    var y = CARD_Y + Math.sin(game.time.elapsed * 2) * 4;
    game.draw.line(CARD_X, TOP_Y0 + 20, CARD_X, y - 150, INK, 4);
    rounded(CARD_X - 170, y - 150, 340, 300, 30, WHITE);
    rounded(CARD_X - 152, y - 132, 304, 264, 22, showing ? '#fff6c0' : '#f4f0f8');
    if (showing) {
      var it = R.seq[R.showIdx];
      var k = 1 - Math.max(0, R.show) / R.per;
      game.draw.circle(CARD_X, y - 10, 110 + k * 10, PINK, 0.35);
      game.draw.sprite(ICONS[it], ICON_PAL, CARD_X, y - 10, 18, { anchor: 'center' });
    } else if (R && R.phase === 'input') {
      game.draw.circle(CARD_X, y - 10, 60, '#e8e0f0');
    }
    // 何枚目か(点)
    if (R) {
      for (var i = 0; i < R.seq.length; i++) {
        var dx = CARD_X + (i - (R.seq.length - 1) / 2) * 52;
        var lit = (R.phase === 'show' && i <= R.showIdx) || (R.phase !== 'show' && i < R.pos) || R.phase === 'done';
        game.draw.circle(dx, y + 110, 16, WHITE);
        game.draw.circle(dx, y + 110, 12, lit ? ROSE : '#e0d8e8');
      }
    }
    if (hl) game.draw.circle(CARD_X, y - 10, 80 + hl * 80, WHITE, 0.5 * (1 - hl));
  }

  function drawButtons(R, pressedIdx, wrongIdx, hk) {
    var locked = !R || R.phase !== 'input';
    for (var i = 0; i < BTN.length; i++) {
      var b = BTN[i];
      var on = pressedIdx === i;
      var bob = locked ? 0 : Math.sin(game.time.elapsed * 4 + i) * 5;
      var y = b.y + bob + (on ? 8 : 0);
      var big = wrongIdx === i ? 1 + hk * 0.25 : 1;
      game.draw.circle(b.x, y + 12, BTN_R * big, '#d8c8e0', 0.6);
      game.draw.circle(b.x, y, BTN_R * big, WHITE);
      game.draw.circle(b.x, y, (BTN_R - 14) * big, wrongIdx === i ? '#ffd0dc' : (locked ? '#ece6f0' : [PINK, BLUE, MINT][i % 3]));
      game.draw.sprite(ICONS[i], ICON_PAL, b.x, y, 11 * big, { anchor: 'center', alpha: locked ? 0.45 : 1 });
      if (!locked) {
        var g = 0.5 + 0.5 * Math.sin(game.time.elapsed * 6 + i);
        game.draw.circle(b.x, y - BTN_R + 16, 6, WHITE, 0.5 + g * 0.5);
      }
      if (wrongIdx === i) game.draw.circle(b.x, y, BTN_R * (1.1 + hk * 0.5), WHITE, 0.5 * (1 - hk) + 0.15);
    }
    if (locked && R && R.phase === 'show') {
      game.draw.rect(50, TOP_Y1 + 80, W - 100, H - TOP_Y1 - 130, '#ffffff', 0.25);
      game.draw.sprite(LOCK, { K: INK }, W / 2, H * 0.685, 14, { anchor: 'center', alpha: 0.7 });
    }
  }

  function ink(s, x, y, sz, col) {
    game.draw.text(s, x, y + 4, { size: sz, color: WHITE, bold: true, align: 'center' });
    game.draw.text(s, x + 3, y + 3, { size: sz, color: '#e0d0ec', bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col || INK, bold: true, align: 'center' });
  }

  // ── 状態 ──
  var rnd, kidIdx, dressed, worn, strikes, flawless, timeLeft, countIn, stop, over, won, endT, score, prevBest, pressed, pressT, nextT, celebT;

  function initGame() {
    kidIdx = 0; rnd = makeRound(LENGTHS[0], 0); dressed = 0; worn = 0; strikes = 0; flawless = true;
    timeLeft = TIME_LIMIT; countIn = 0.8; stop = null; over = false; won = false; endT = 0;
    score = 0; prevBest = game.best || 0; pressed = -1; pressT = 0; nextT = 0; celebT = 0;
  }

  function haltThen(i, after) { stop = { t: 0.42, max: 0.42, i: i, after: after }; }

  // ── 入力 ──
  game.onPress(function (x, y) {
    if (mode === MODE.ATTRACT) { game.audio.play('se_coin', 0.45); mode = MODE.PLAYING; initGame(); return; }
    if (mode === MODE.RESULT) { game.audio.play('se_tap', 0.2); mode = MODE.ATTRACT; initGame(); demo.t = 0; return; }
    var i = btnAt(x, y);
    if (i < 0 || countIn > 0 || stop || over || nextT > 0) { game.audio.tone('C4', 0.04, { wave: 'triangle', volume: 0.04 }); return; }
    pressed = i; pressT = 0.12;
    var r = pick(rnd, i);
    if (r === 'locked') { game.audio.tone('G3', 0.06, { wave: 'square', volume: 0.05 }); game.fx.burst(x, y, { color: INK, count: 3, speed: 60 }); return; }
    if (r === 'good' || r === 'done') {
      worn++;
      score += 50 + rnd.pos * 10;
      game.audio.tone(NOTES[i], 0.12, { wave: 'triangle', volume: 0.12 });
      game.feedback.good(BTN[i].x, BTN[i].y - 60, { text: 'GOOD', color: ROSE, count: 10, size: 44 });
      if (r === 'done') {
        dressed++;
        score += flawless ? 200 : 120;
        game.fx.popup(flawless ? 'PERFECT' : 'NICE', CHILD_X, CHILD_Y - 160, { color: ROSE, size: 60 });
        game.audio.play('se_milestone', 0.4);
        if (dressed >= LENGTHS.length) { won = true; wrapUp(); return; }
        nextT = 0.8;
      }
      return;
    }
    // 間違い: くしゃみ → hit-stop → 札がもう一度光る
    game.audio.play('se_tap', 0.3);
    haltThen(i, function () {
      strikes++; flawless = false;
      game.feedback.bad(BTN[i].x, BTN[i].y - 60, { text: 'MISS', shake: 10 });
      if (strikes >= STRIKES) { won = false; wrapUp(); return; }
      worn -= rnd.pos;
      replay(rnd, 0.36);
    });
  });

  function wrapUp() {
    if (over) return;
    over = true; endT = 1.4;
    if (won) score += Math.floor(timeLeft * 25) + (STRIKES - strikes) * 60;
    game.audio.stopBgm();
    game.audio.play(won ? 'se_success' : 'se_failure', 0.55);
    if (won) game.fx.flash(PINK, 0.3);
  }

  function enterResult() {
    mode = MODE.RESULT;
    var stats = { dressed: dressed, worn: worn, strikes: strikes, timeLeft: Math.round(timeLeft * 10) / 10 };
    if (won) game.end.success(score, stats);
    else game.end.failure(stats);
  }

  // ── ATTRACT: 札の3つを覚えて同じ順に押して着せ、次の子では2つ目を押し間違えてくしゃみ ──
  var demo = { t: 0, R: null, kid: 0, hx: W / 2, hy: H * 0.9, press: -1, pressT: 0, step: 0, waitT: 0, wrong: -1, k: 0 };
  var DEMO_CYCLE = 5.6;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt || !demo.R) { demo.R = makeRound(3, 0); demo.R.per = 0.38; demo.kid = 0; demo.step = 0; demo.waitT = 0.25; demo.wrong = -1; demo.k = 0; }
    var R = demo.R;
    var ev = tickRound(R, dt);
    if (ev === 'flash') game.audio.tone(NOTES[R.seq[R.showIdx]], 0.1, { wave: 'triangle', volume: 0.05 });
    if (demo.pressT > 0) { demo.pressT -= dt; if (demo.pressT <= 0) demo.press = -1; }
    if (demo.wrong >= 0) demo.k = Math.min(1, demo.k + dt * 2.2);
    if (R.phase === 'input' && demo.wrong < 0) {
      var target = R.seq[R.pos];
      if (demo.kid === 1 && R.pos === 1) target = (R.seq[1] + 3) % 7 === R.seq[2] ? (R.seq[1] + 4) % 7 : (R.seq[1] + 3) % 7;
      var b = BTN[target];
      demo.hx += (b.x - demo.hx) * Math.min(1, dt * 12);
      demo.hy += (b.y + 20 - demo.hy) * Math.min(1, dt * 12);
      demo.waitT -= dt;
      if (demo.waitT <= 0) {
        demo.waitT = 0.36; demo.press = target; demo.pressT = 0.14;
        var r = pick(R, target);
        if (r === 'bad') { demo.wrong = target; demo.k = 0; game.feedback.bad(b.x, b.y - 60, { text: 'MISS', volume: 0.15, shake: 3 }); }
        else game.feedback.good(b.x, b.y - 60, { text: 'GOOD', color: ROSE, count: 6, size: 40, volume: 0.15 });
      }
    }
    if (R.phase === 'done' && demo.kid === 0 && cyc > 2.4) { demo.R = makeRound(3, 1); demo.R.per = 0.38; demo.kid = 1; demo.waitT = 0.25; }
  }

  function drawHud() {
    ink(worn + ' / ' + NEEDED, W * 0.18, 92, 52, ROSE);
    ink(String(score), W * 0.5, 92, 44);
    for (var i = 0; i < STRIKES; i++) {
      game.draw.circle(W * 0.76 + i * 66, 92, 24, WHITE);
      game.draw.circle(W * 0.76 + i * 66, 92, 18, i < strikes ? '#c8b8d8' : BLUE);
    }
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    var low = timeLeft < 5 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    rounded(70, 160, W - 140, 30, 15, WHITE);
    if (fr > 0.02) rounded(76, 165, (W - 152) * fr, 20, 10, low ? ROSE : MINT);
    for (var k = 0; k < LENGTHS.length; k++) game.draw.circle(W * 0.5 + (k - 1) * 46, 140, 12, k < dressed ? ROSE : '#e0d8e8');
  }

  game.onUpdate(function (dt) {
    if (mode === MODE.ATTRACT) {
      stepDemo(dt);
      drawShell();
      drawChild(demo.R, '');
      drawCard(demo.R, 0);
      drawButtons(demo.R, demo.press, demo.wrong, demo.k);
      if (demo.R.phase === 'input' || demo.wrong >= 0) game.draw.hand(demo.hx, demo.hy, { press: demo.press >= 0, scale: 14 });
      ink(LOGO, W / 2, 96, 76, ROSE);
      ink('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 176, 34);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) ink('► 100円 投入 ◄', W / 2, H * 0.92, 44, ROSE);
      else ink('TAP TO START', W / 2, H * 0.92, 40);
      return;
    }

    if (mode === MODE.RESULT) {
      drawShell();
      drawChild(rnd, won ? 'joy' : 'sad');
      drawCard(null, 0);
      ink(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.58, 100, won ? ROSE : INK);
      ink(worn + ' / ' + NEEDED, W / 2, H * 0.65, 60);
      ink('SCORE ' + score, W / 2, H * 0.71, 50);
      if (won && score > prevBest) ink('NEW RECORD', W / 2, H * 0.77, 52, ROSE);
      else ink('BEST ' + Math.max(prevBest, score), W / 2, H * 0.77, 40);
      if (!won) ink('あと' + (LENGTHS.length - dressed) + '人!', W / 2, H * 0.83, 56, ROSE);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) ink('TAP TO CONTINUE', W / 2, H * 0.92, 40);
      return;
    }

    // ── PLAYING ──
    if (pressT > 0) { pressT -= dt; if (pressT <= 0) pressed = -1; }
    var hk = 0;
    if (over) {
      endT -= dt;
      tickRound(rnd, dt);
      if (won) {
        celebT -= dt;
        if (celebT <= 0) { celebT = 0.15; game.fx.burst(game.random(W * 0.1, W * 0.9), game.random(H * 0.25, H * 0.6), { color: [PINK, BLUE, MINT][Math.floor(game.random(0, 3))], count: 14, speed: 420 }); }
      }
      if (endT <= 0) { enterResult(); return; }
    } else if (stop) {
      stop.t -= dt;
      hk = 1 - stop.t / stop.max;
      if (stop.t <= 0) { var fn = stop.after; stop = null; fn(); }
    } else if (countIn > 0) {
      countIn -= dt;
      if (countIn <= 0) game.audio.tone('E6', 0.12, { wave: 'triangle', volume: 0.1 });
    } else {
      timeLeft -= dt;
      if (nextT > 0) {
        tickRound(rnd, dt);
        nextT -= dt;
        if (nextT <= 0) { kidIdx++; flawless = true; rnd = makeRound(LENGTHS[kidIdx], kidIdx); game.audio.play('se_jump', 0.25); }
      } else {
        var ev = tickRound(rnd, dt);
        if (ev === 'flash') game.audio.tone(NOTES[rnd.seq[rnd.showIdx]], 0.14, { wave: 'triangle', volume: 0.1 });
        else if (ev === 'input') game.audio.tone('C6', 0.06, { wave: 'square', volume: 0.06 });
      }
      if (!over && !stop && timeLeft <= 0) {
        timeLeft = 0;
        var want = rnd.phase === 'input' ? rnd.seq[rnd.pos] : -1;
        haltThen(want, function () { game.feedback.bad(W / 2, H * 0.6, { text: 'TIME UP' }); won = false; wrapUp(); });
      }
    }

    drawShell();
    drawChild(rnd, over ? (won ? 'joy' : 'sad') : '');
    drawCard(rnd, 0);
    drawButtons(rnd, pressed, stop ? stop.i : -1, hk);
    drawHud();
    if (countIn > 0) ink(countIn > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.685, 110, ROSE);
  });

  game.onStart(function () {
    game.audio.melody([['E5', 0.5], ['G5', 0.5], ['C6', 1], ['B5', 0.5], ['G5', 0.5], ['A5', 1], ['F5', 0.5], ['A5', 0.5], ['G5', 1], ['E5', 1],
      ['F5', 0.5], ['E5', 0.5], ['D5', 0.5], ['E5', 0.5], ['G5', 1], ['C5', 1], ['D5', 0.5], ['E5', 0.5], ['C5', 2]],
      { tempo: 118, wave: 'triangle', volume: 0.05, loop: true, bass: [['C3', 2], ['F3', 2], ['D3', 2], ['G3', 2], ['F3', 2], ['C3', 2], ['G2', 2], ['C3', 2]] });
    mode = MODE.ATTRACT;
    initGame();
  });
})(game);

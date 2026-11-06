// I-GBA-0030v3-kaki-ribbon-peel.js
// 柿の一本むき — 柿のまわりで指をぐるぐる回し続け、速すぎず止めずに皮を1本につなげたままむき切る
// 操作: 柿のまわりの点線の輪に沿って指で円を描き続ける。回した角度ぶん皮がらせんにむけ、垂れた皮が長くなる。止まると皮の重みで、速すぎると刃が滑って皮が張り、赤く点滅したあと切れる
// 終わり: 15秒以内に3個を皮1本のままむき切ればCLEAR(軒に吊るす)。皮を2回切る/時間切れでGAME OVER。後の柿ほど大きく、ちょうどいい速さの帯が狭い
// @mechanic: rotate_gesture
// @theme: autumn_veranda_hoshigaki_peel
// 世界観: 秋の農家の縁側で、祖母が渋柿を手の中で回しながら皮を1本につなげてむき、軒先に吊るす干し柿を一つずつ仕込んでいく
// 残るもの: 正誤(CLEAR/GAME OVER) + むき切った柿の数・切れた回数・最長の皮の長さ・スコア
// スタイル: 8bit HOME

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 家庭用8bit機の少色ベタ塗り。障子と板張りのタイル反復背景、輪郭線なし
  var STYLE = { bg: ['#503000', '#000000'], main: ['#ac7c00', '#fcd8a8', '#f87800'], accent: ['#00a800', '#fcfcfc'] };
  var BROWN = STYLE.main[0], PAPER = STYLE.main[1], KAKI = STYLE.main[2];
  var LEAF = STYLE.accent[0], WHITE = STYLE.accent[1];
  var FLESH = '#fcb848', RIND = '#d82800', DARK = STYLE.bg[0];

  var LOGO = 'KAKI RIBBON';
  var NEEDED = 3;
  var TEAR_MAX = 2;
  var TIME_LIMIT = 15;
  var WARN_AT = 0.4;

  var FX = W * 0.5, FY = H * 0.46;
  var RING_R = 330;
  var LEVELS = [
    { turns: 1.5, r: 150, lo: 2.6, hi: 11.5 },
    { turns: 2.0, r: 175, lo: 3.2, hi: 10.5 },
    { turns: 2.5, r: 200, lo: 3.8, hi: 9.5 },
  ];

  var ST = { ATTRACT: 'A', PLAYING: 'P', RESULT: 'R' };
  var st = ST.ATTRACT;

  // ── スプライト ──
  var BAACHAN = [
    ['.....GGGG.....', '....GGGGGG....', '...GGGGGGGG...', '...GSSSSSSG...', '...SKSSSSKS...', '...SSSSSSSS...', '....SSMMSS....', '..BBBBBBBBBB..', '.BBBBBBBBBBBB.', 'BBBBWBBBBWBBBB', 'BBBBBBBBBBBBBB', 'SSBBBBBBBBBBSS', '.BBBBBBBBBBBB.', 'BBBBBBBBBBBBBB'],
    ['.....GGGG.....', '....GGGGGG....', '...GGGGGGGG...', '...GSSSSSSG...', '...SKSSSSKS...', '...SSSSSSSS...', '....SSMMSS....', '..BBBBBBBBBB..', '.BBBBBBBBBBBB.', 'SBBBWBBBBWBBBS', 'SBBBBBBBBBBBBS', '.BBBBBBBBBBBB.', '.BBBBBBBBBBBB.', 'BBBBBBBBBBBBBB'],
    ['.....GGGG.....', '....GGGGGG....', '...GGGGGGGG...', '...GSSSSSSG...', '...SKKSSKKS...', '...SSSSSSSS...', '....SMMMMS....', '..BBBBBBBBBB..', '.BBBBBBBBBBBB.', 'BBBBWBBBBWBBBB', 'BBBBBBBBBBBBBB', 'SSBBBBBBBBBBSS', '.BBBBBBBBBBBB.', 'BBBBBBBBBBBBBB'],
  ];
  var BAA_PAL = { G: '#bcbcbc', S: '#fcb8a8', K: '#000000', M: '#a80020', B: '#0058f8', W: WHITE };
  var CALYX = ['..L.L..', '.LLLLL.', 'LLLDLLL', '.LLLLL.', '..L.L..'];
  var CALYX_PAL = { L: LEAF, D: '#503000' };
  var HOSHI = ['..D..', '.LLL.', 'OOOOO', 'OOOOO', 'OOOOO', '.OOO.'];
  var HOSHI_PAL = { D: '#503000', L: LEAF, O: '#c84c0c' };

  // ── 柿モデル(本番・デモ共通) ──
  function makeFruit(lv) {
    var L = LEVELS[lv];
    return { lv: lv, need: L.turns * Math.PI * 2, r: L.r, lo: L.lo, hi: L.hi, done: 0, dir: 0, acc: 0, omega: 0,
      tension: 0, started: false, warned: false, state: 'peel', t: 0, tearY: 0 };
  }
  function feedAngle(f, da) {
    if (f.state !== 'peel' || Math.abs(da) < 0.0005) return;
    if (!f.dir && Math.abs(da) > 0.02) f.dir = da > 0 ? 1 : -1;
    if (!f.dir) return;
    if ((da > 0 ? 1 : -1) === f.dir) f.acc += Math.abs(da);
    else if (Math.abs(da) > 0.08) f.tension += 0.18;
  }
  // 戻り値: '' / 'warn' / 'tear' / 'done' / 'click'
  function tickFruit(f, dt) {
    f.t += dt;
    var inst = f.acc / Math.max(0.001, dt);
    f.omega += (inst - f.omega) * Math.min(1, dt * 9);
    if (f.state !== 'peel') { f.acc = 0; return ''; }
    var before = Math.floor(f.done / 0.9);
    f.done = Math.min(f.need, f.done + f.acc);
    f.acc = 0;
    if (f.done > 0.4) f.started = true;
    if (f.started) {
      if (f.omega < f.lo) f.tension += 0.55 * dt;
      else if (f.omega > f.hi) f.tension += 1.0 * dt;
      else f.tension = Math.max(0, f.tension - 0.7 * dt);
    }
    if (f.tension >= 1) { f.tension = 1; f.state = 'torn'; f.t = 0; f.tearY = peelY(f); return 'tear'; }
    if (f.done >= f.need) { f.state = 'done'; f.t = 0; return 'done'; }
    if (f.tension > WARN_AT && !f.warned) { f.warned = true; return 'warn'; }
    if (f.tension < WARN_AT * 0.5) f.warned = false;
    return Math.floor(f.done / 0.9) !== before ? 'click' : '';
  }
  function peelY(f) { return FY - f.r + 2 * f.r * (f.done / f.need); }
  function ribbonLen(f) { return 40 + f.done * 70; }

  // ── 状態 ──
  var fruit, hung, tears, longest, timeLeft, countIn, stop, over, won, endT, score, prevBest, lastAng, celebT, creakT, swapT;

  function initGame() {
    fruit = makeFruit(0); hung = 0; tears = 0; longest = 0;
    timeLeft = TIME_LIMIT; countIn = 0.8; stop = null; over = false; won = false; endT = 0;
    score = 0; prevBest = game.best || 0; lastAng = null; celebT = 0; creakT = 0; swapT = 0;
  }

  function ink(s, x, y, sz, col) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: '#000000', bold: true, align: 'center', font: 'monospace' });
    game.draw.text(s, x, y, { size: sz, color: col || WHITE, bold: true, align: 'center', font: 'monospace' });
  }

  // ── 描画 ──
  function drawHouse() {
    game.draw.gradient(0, H, [[0, '#7c3800'], [0.5, DARK], [1, '#000000']]);
    // 軒(HUD帯)と吊るし縄
    game.draw.rect(0, 0, W, 230, '#000000');
    game.draw.rect(0, 222, W, 16, BROWN);
    // 障子(タイル反復)
    for (var ty = 250; ty < H * 0.62; ty += 96) {
      for (var tx = 0; tx < W; tx += 120) {
        game.draw.rect(tx + 6, ty + 6, 108, 84, PAPER);
        game.draw.rect(tx + 58, ty + 6, 4, 84, BROWN);
        game.draw.rect(tx + 6, ty + 46, 108, 4, BROWN);
      }
    }
    // 縁側の板張り
    game.draw.rect(0, H * 0.62, W, 16, '#000000');
    for (var py = H * 0.63; py < H; py += 48) {
      game.draw.rect(0, py, W, 44, (Math.floor(py / 48) % 2) ? BROWN : '#7c5000');
      for (var k = 0; k < 4; k++) game.draw.rect(((py * 7 + k * 290) % W), py + 18, 40, 6, DARK, 0.6);
    }
  }

  function drawHung(n, flash) {
    game.draw.line(60, 250, W - 60, 250, PAPER, 4);
    for (var i = 0; i < NEEDED; i++) {
      var x = W * 0.3 + i * W * 0.2;
      game.draw.line(x, 250, x, 300, PAPER, 3);
      if (i < n) game.draw.sprite(HOSHI, HOSHI_PAL, x, 330 + Math.sin(game.time.elapsed * 2 + i) * 4, 12, { anchor: 'center' });
      else game.draw.circle(x, 330, 26, PAPER, 0.25 + (flash && i === n ? 0.3 * Math.sin(game.time.elapsed * 10) : 0));
    }
  }

  function drawRing(f, active) {
    var n = 72;
    var lit = f.started && f.state === 'peel';
    var ok = lit && f.omega >= f.lo && f.omega <= f.hi;
    var col = !lit ? WHITE : (ok ? LEAF : RIND);
    var spin = game.time.elapsed * (f.dir || 1) * 1.5;
    for (var i = 0; i < n; i++) {
      var a = spin + (i / n) * Math.PI * 2;
      if (i % 2) continue;
      game.draw.rect(FX + Math.cos(a) * RING_R - 7, FY + Math.sin(a) * RING_R - 7, 14, 14, col, active ? 0.9 : 0.5);
    }
  }

  function drawFruit(f, hl) {
    var r = f.r;
    var cy = FY;
    var shake = f.tension > WARN_AT && f.state === 'peel' ? Math.sin(game.time.elapsed * 50) * 4 * f.tension : 0;
    var cx = FX + shake;
    var py = f.state === 'done' ? cy + r : peelY(f);
    // 柿本体(8pxストリップの円)
    for (var y = -r; y < r; y += 8) {
      var t = (y + 4) / r;
      var hw = r * Math.sqrt(Math.max(0, 1 - t * t)) * (1 - 0.06 * t);
      var sy = cy + y;
      var col = sy < py ? FLESH : KAKI;
      game.draw.rect(cx - hw, sy, hw * 2, 8, col);
      if (sy >= py && y < -r * 0.3) game.draw.rect(cx - hw * 0.5, sy, hw * 0.3, 8, '#fca044');
    }
    // らせんの刃の当たり(境目)
    if (f.state === 'peel' || f.state === 'torn') {
      var bt = (py - cy) / r;
      var bw = r * Math.sqrt(Math.max(0, 1 - bt * bt));
      game.draw.rect(cx - bw, py - 4, bw * 2, 8, RIND);
      // 包丁
      game.draw.rect(cx + bw - 6, py - 10, 70, 14, '#bcbcbc');
      game.draw.rect(cx + bw + 60, py - 12, 50, 18, BROWN);
    }
    game.draw.sprite(CALYX, CALYX_PAL, cx, cy - r + 4, 12, { anchor: 'center' });
    // 垂れた皮(1本のリボン)
    if (f.done > 0.05 || f.state === 'torn') {
      var bt2 = ((f.state === 'torn' ? f.tearY : py) - cy) / r;
      var sx = cx + r * Math.sqrt(Math.max(0, 1 - bt2 * bt2));
      var sy0 = f.state === 'torn' ? f.tearY : py;
      var len = ribbonLen(f);
      var warn = f.tension > WARN_AT && f.state === 'peel' && Math.floor(game.time.elapsed * 10) % 2 === 0;
      var seg = 18, prevx = sx, prevy = sy0;
      var gap = f.state === 'torn' ? Math.min(160, f.t * 600) : 0;
      for (var d = seg; d < len; d += seg) {
        var nx = sx + 40 + Math.sin(d * 0.03 + game.time.elapsed * 2) * (20 + d * 0.05);
        var ny = sy0 + d * 0.9 + (d > 30 ? gap : 0);
        var thin = d < 60 && f.tension > WARN_AT ? 8 : 16;
        var rc = d < 60 && warn ? WHITE : (d < 60 && f.tension > WARN_AT ? RIND : KAKI);
        if (!(f.state === 'torn' && d <= 36 && d > 18)) game.draw.line(prevx, prevy + (d - seg > 30 ? gap : 0), nx, ny, rc, thin);
        prevx = nx; prevy = sy0 + d * 0.9;
      }
      if (hl) game.draw.circle(sx + 30, sy0 + 26, 40 + hl * 90, WHITE, 0.6 * (1 - hl) + 0.2);
    }
  }

  function drawGauge(f) {
    var x0 = W * 0.18, w = W * 0.64, y = H * 0.705;
    var MAXW = 14;
    game.draw.rect(x0 - 8, y - 8, w + 16, 46, '#000000');
    game.draw.rect(x0, y, w, 30, '#7c3800');
    game.draw.rect(x0 + w * (f.lo / MAXW), y, w * ((f.hi - f.lo) / MAXW), 30, LEAF);
    var nx = x0 + w * Math.min(1, f.omega / MAXW);
    game.draw.rect(nx - 6, y - 14, 12, 58, WHITE);
  }

  function drawGranny(mood) {
    var fr = mood === 'shock' ? 2 : (Math.floor(game.time.elapsed * 3) % 2);
    var hop = mood === 'joy' ? -Math.abs(Math.sin(game.time.elapsed * 8)) * 40 : 0;
    var slump = mood === 'sad' ? 20 : 0;
    game.draw.sprite(BAACHAN[fr], BAA_PAL, W * 0.26, H * 0.84 + hop + slump, 16, { anchor: 'center' });
    // ざる
    game.draw.rect(W * 0.6, H * 0.86, 280, 40, BROWN);
    game.draw.rect(W * 0.62, H * 0.9, 240, 24, '#7c5000');
    for (var i = 0; i < Math.min(8, hung * 3 + (fruit && fruit.started ? 1 : 0)); i++) game.draw.rect(W * 0.62 + i * 28, H * 0.85 - (i % 2) * 10, 24, 12, KAKI);
  }

  function drawHud() {
    ink(hung + ' / ' + NEEDED, W * 0.18, 80, 52, KAKI);
    ink(String(score), W * 0.5, 80, 44, PAPER);
    for (var i = 0; i < TEAR_MAX; i++) {
      var x = W * 0.78 + i * 70;
      game.draw.rect(x - 22, 64, 44, 30, i < tears ? RIND : KAKI, i < tears ? 0.5 : 1);
      if (i < tears) game.draw.rect(x - 4, 58, 8, 42, '#000000');
    }
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 160, W - 120, 24, '#503000');
    game.draw.rect(60, 160, (W - 120) * fr, 24, low ? RIND : PAPER);
  }

  // ── 入力: 柿の中心まわりの角度差を積む ──
  function angleAt(x, y) { return Math.atan2(y - FY, x - FX); }
  function wrap(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }

  game.onPress(function (x, y) {
    if (st === ST.ATTRACT) { game.audio.play('se_coin', 0.45); st = ST.PLAYING; initGame(); return; }
    if (st === ST.RESULT) { game.audio.play('se_tap', 0.2); st = ST.ATTRACT; initGame(); demo.t = 0; return; }
    lastAng = angleAt(x, y);
    if (countIn > 0 || stop || over) { game.audio.tone('C4', 0.04, { wave: 'square', volume: 0.04 }); return; }
    game.audio.play('se_tap', 0.12);
    game.fx.burst(x, y, { color: PAPER, count: 4, speed: 90 });
  });
  game.onMove(function (x, y) {
    if (st !== ST.PLAYING) return;
    var a = angleAt(x, y);
    var dist = Math.sqrt((x - FX) * (x - FX) + (y - FY) * (y - FY));
    if (lastAng === null || dist < 60) { lastAng = a; return; }
    var da = wrap(a - lastAng);
    lastAng = a;
    if (countIn > 0 || stop || over) return;
    feedAngle(fruit, da);
    if (fruit.state === 'peel' && Math.abs(da) > 0.03) game.fx.burst(x, y, { color: fruit.tension > WARN_AT ? RIND : PAPER, count: 1, speed: 70, life: 0.3, size: 10 });
  });
  game.onRelease(function (x, y) {
    lastAng = null;
    if (st === ST.PLAYING && fruit && fruit.started && fruit.state === 'peel') game.audio.tone('A3', 0.05, { wave: 'triangle', volume: 0.05 });
  });

  function haltThen(after) { stop = { t: 0.45, max: 0.45, after: after }; }

  function onFruitEvent(ev) {
    if (ev === 'click') game.audio.tone(392 + fruit.done * 18, 0.025, { wave: 'square', volume: 0.05 });
    else if (ev === 'warn') { game.audio.play('se_bad', 0.18); creakT = 0; }
    else if (ev === 'tear') {
      game.audio.play('se_break', 0.5);
      haltThen(function () {
        tears++;
        game.feedback.bad(FX + fruit.r, fruit.tearY, { text: 'MISS', shake: 12 });
        if (tears >= TEAR_MAX) { won = false; wrapUp(); return; }
        swapT = 0.35;
      });
    } else if (ev === 'done') {
      hung++;
      var len = Math.round(ribbonLen(fruit) / 10);
      longest = Math.max(longest, len);
      var clean = fruit.tension < 0.15;
      score += 120 + fruit.lv * 60 + (clean ? 80 : 0);
      game.feedback.good(FX, FY - fruit.r - 40, { text: clean ? 'PERFECT' : 'NICE', color: KAKI, count: 18 });
      game.audio.play('se_coin', 0.35);
      if (hung === 2) { game.fx.popup('2 / ' + NEEDED, W / 2, H * 0.2, { color: PAPER, size: 60 }); game.audio.play('se_milestone', 0.4); }
      if (hung >= NEEDED) { won = true; wrapUp(); return; }
      swapT = 0.35;
    }
  }

  function wrapUp() {
    if (over) return;
    over = true; endT = 1.4;
    if (won) score += Math.floor(timeLeft * 15);
    game.audio.stopBgm();
    game.audio.play(won ? 'se_success' : 'se_failure', 0.55);
    if (won) game.fx.flash(KAKI, 0.3);
  }

  function enterResult() {
    st = ST.RESULT;
    var stats = { hung: hung, tears: tears, longest: longest, timeLeft: Math.round(timeLeft * 10) / 10 };
    if (won) game.end.success(score, stats);
    else game.end.failure(stats);
  }

  // ── ATTRACT: 手が輪を回して1個むき切り、2個目は速く回しすぎて皮が切れる ──
  var demo = { t: 0, f: null, ang: 0, hx: FX + RING_R, hy: FY, press: false, hl: 0 };
  var DEMO_CYCLE = 4.6;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt || !demo.f) { demo.f = makeFruit(0); demo.ang = 0; demo.hl = 0; }
    var f = demo.f, speed = 0;
    if (cyc > 0.3 && cyc < 2.2 && f.state === 'peel') speed = 6.2;
    if (cyc >= 2.2 && f.state === 'done' && f.t > 0.35) { demo.f = makeFruit(1); f = demo.f; }
    if (cyc > 2.5 && f.state === 'peel' && f.lv === 1) speed = 15;
    demo.press = speed > 0;
    if (speed > 0) { var da = speed * dt; demo.ang += da; feedAngle(f, da); }
    var ev = tickFruit(f, dt);
    if (ev === 'done') game.feedback.good(FX, FY - f.r - 40, { text: 'NICE', color: KAKI, count: 10, volume: 0.2 });
    if (ev === 'tear') { game.audio.play('se_break', 0.2); demo.hl = 0.01; }
    if (ev === 'warn') game.audio.tone('E3', 0.12, { wave: 'sawtooth', volume: 0.04 });
    if (demo.hl > 0) demo.hl = Math.min(1, demo.hl + dt * 2.2);
    var tx = FX + Math.cos(demo.ang) * RING_R, ty = FY + Math.sin(demo.ang) * RING_R;
    demo.hx += (tx - demo.hx) * Math.min(1, dt * 20);
    demo.hy += (ty - demo.hy) * Math.min(1, dt * 20);
  }

  game.onUpdate(function (dt) {
    if (st === ST.ATTRACT) {
      stepDemo(dt);
      drawHouse();
      drawHung(1, false);
      drawRing(demo.f, demo.press);
      drawFruit(demo.f, demo.hl);
      drawGauge(demo.f);
      drawGranny(demo.f.state === 'torn' ? 'shock' : '');
      game.draw.hand(demo.hx, demo.hy, { press: demo.press, scale: 15 });
      ink(LOGO, W / 2, 80, 68, KAKI);
      ink('HI-SCORE ' + (game.best > 0 ? game.best : '-'), W / 2, 160, 34, PAPER);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) ink('► 100円 投入 ◄', W / 2, H * 0.96, 44, WHITE);
      else ink('TAP TO START', W / 2, H * 0.96, 40, PAPER);
      return;
    }

    if (st === ST.RESULT) {
      drawHouse();
      drawHung(hung, false);
      drawGranny(won ? 'joy' : 'sad');
      ink(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.36, 100, won ? KAKI : RIND);
      ink(hung + ' / ' + NEEDED, W / 2, H * 0.43, 60, WHITE);
      ink('SCORE ' + score, W / 2, H * 0.5, 50, PAPER);
      if (won && score > prevBest) ink('NEW RECORD', W / 2, H * 0.56, 52, KAKI);
      else ink('BEST ' + Math.max(prevBest, score), W / 2, H * 0.56, 40, PAPER);
      if (!won) ink('あと' + (NEEDED - hung) + '個!', W / 2, H * 0.62, 56, WHITE);
      ink(longest + 'cm', W / 2, H * 0.68, 40, PAPER);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) ink('TAP TO CONTINUE', W / 2, H * 0.96, 40, WHITE);
      return;
    }

    // ── PLAYING ──
    var hlK = 0;
    if (over) {
      endT -= dt;
      if (won) {
        celebT -= dt;
        if (celebT <= 0) { celebT = 0.15; game.fx.burst(game.random(W * 0.1, W * 0.9), game.random(260, H * 0.6), { color: game.random(0, 1) < 0.5 ? KAKI : LEAF, count: 14, speed: 420 }); }
      }
      if (endT <= 0) { enterResult(); return; }
    } else if (stop) {
      stop.t -= dt;
      hlK = 1 - stop.t / stop.max;
      if (stop.t <= 0) { var fn = stop.after; stop = null; fn(); }
    } else if (countIn > 0) {
      countIn -= dt;
      if (countIn <= 0) game.audio.tone('C5', 0.12, { wave: 'square', volume: 0.1 });
    } else {
      timeLeft -= dt;
      if (swapT > 0) {
        swapT -= dt;
        if (swapT <= 0) {
          fruit = makeFruit(Math.min(LEVELS.length - 1, hung));
          game.audio.play('se_jump', 0.25);
        }
      } else {
        onFruitEvent(tickFruit(fruit, dt));
        if (fruit.state === 'peel' && fruit.tension > WARN_AT) {
          creakT -= dt;
          if (creakT <= 0) { creakT = 0.2; game.audio.tone(140 + fruit.tension * 80, 0.08, { wave: 'sawtooth', volume: 0.05 }); }
        }
      }
      if (!over && !stop && timeLeft <= 0) {
        timeLeft = 0;
        haltThen(function () { game.feedback.bad(FX, FY, { text: 'TIME UP' }); won = false; wrapUp(); });
      }
    }

    drawHouse();
    drawHung(hung, true);
    drawRing(fruit, game.input.pressing);
    drawFruit(fruit, stop ? hlK : 0);
    drawGauge(fruit);
    drawGranny(stop ? 'shock' : (over ? (won ? 'joy' : 'sad') : ''));
    drawHud();
    if (countIn > 0) ink(countIn > 0.35 ? 'READY?' : 'GO!', W / 2, FY, 110, WHITE);
  });

  game.onStart(function () {
    game.audio.melody([['E4', 0.5], ['G4', 0.5], ['A4', 1], ['C5', 0.5], ['A4', 0.5], ['G4', 1], ['E4', 0.5], ['D4', 0.5], ['E4', 2],
      ['A4', 0.5], ['C5', 0.5], ['D5', 1], ['C5', 0.5], ['A4', 0.5], ['G4', 1], ['A4', 0.5], ['G4', 0.5], ['E4', 2]],
      { tempo: 112, wave: 'square', volume: 0.05, loop: true, bass: [['A2', 2], ['E3', 2], ['D3', 2], ['A2', 2], ['A2', 2], ['G2', 2], ['D3', 2], ['A2', 2]] });
    st = ST.ATTRACT;
    initGame();
  });
})(game);

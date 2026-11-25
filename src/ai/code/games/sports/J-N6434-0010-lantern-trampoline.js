// J-N6434-0010-lantern-trampoline.js
// 跳ね板の提灯つき — 跳ね板を押し込む深さで跳ぶ高さを決め、吊るされた提灯へ頭の灯し棒をぴたりと届かせる
// 操作: 押している間だけ跳ね板が沈み込んで溜まり、離すと溜めた分だけ跳ぶ(社内メモ。画面には出さない)
// 終わり: 提灯を5つ灯せば成功。高さを3回外す/時間切れで失敗
// @mechanic: hold_charge
// @theme: festival_lantern_trampoline
// 世界観: 夜祭りの裏手で、豆だぬきの軽業師見習いが跳ね板の沈み具合だけで跳ぶ高さを合わせ、高さの違う提灯へ灯し棒を届けて参道を明るくする
// 残るもの: 正誤(CLEAR/GAME OVER) + 灯した提灯の数と金提灯の数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: パステル、白縁の丸い形
  var STYLE = {
    bg: ['#3b3a6e', '#7a6fb0', '#f3c6de'],
    main: ['#fff4fa', '#bfe9df', '#f7a8c4'],
    accent: ['#ffe08a', '#ff7b8f'],
  };
  var C = {
    top: STYLE.bg[0], mid: STYLE.bg[1], low: STYLE.bg[2],
    white: STYLE.main[0], mint: STYLE.main[1], pink: STYLE.main[2],
    gold: STYLE.accent[0], red: STYLE.accent[1], ink: '#2a2448', dim: '#5a5290',
  };

  var GAME_TITLE = 'LANTERN HOP';
  var TIME_LIMIT = 14;
  var NEEDED = 5;
  var MAX_MISS = 3;
  var TRAMP_Y = H * 0.74;
  var RANGE = H * 0.5;       // 溜め1.0で届く高さ(px)
  var GRAV = 5200;
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var TANUKI = [
    ['...y....', '...y....', '.bb..bb.', '.bbbbbb.', 'bwwbbwwb', 'bkwbbkwb', '.bbnnbb.', '..bbbb..', '.pbbbbp.', '.bbbbbb.', '..b..b..'],
    ['...y....', '...y....', '.bb..bb.', '.bbbbbb.', 'bwwbbwwb', 'bwkbbwkb', '.bbnnbb.', 'p.bbbb.p', '.bbbbbb.', '.bbbbbb.', '.b....b.'],
    ['...y....', '...y....', '.bb..bb.', '.bbbbbb.', 'bkkbbkkb', 'bwwbbwwb', '.bbnnbb.', '..bbbb..', 'pbbbbbbp', '.bbbbbb.', '..bbbb..'],
  ];
  var TANUKI_PAL = { b: '#c08a5a', w: '#fff4fa', k: '#2a2448', n: '#5a3a2a', p: '#f7a8c4', y: '#ffe08a' };
  var LANTERN = ['..kk..', '.rrrr.', 'rryyrr', 'rryyrr', 'rryyrr', '.rrrr.', '..kk..'];
  var LANTERN_OFF_PAL = { k: '#2a2448', r: '#8a7fb8', y: '#b8b0dc' };
  var LANTERN_ON_PAL = { k: '#2a2448', r: '#ff7b8f', y: '#ffe08a' };
  var LANTERN_GOLD_PAL = { k: '#2a2448', r: '#ffc94a', y: '#fff4fa' };
  var ROOF = ['....pp....', '..pppppp..', 'pppppppppp', '.w......w.', '.w......w.'];
  var ROOF_PAL = { p: '#5a5290', w: '#7a6fb0' };

  var phase, ready, charge, pressing, idleT, jumpY, jumpV, peakY, lanternY, lanternGold, band;
  var lit, golds, misses, timeLeft, stopT, ok, ended, resultT, flashT, judged, landT, lastNear, pops;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function newLantern() {
    var tries = lit + golds;
    lanternGold = (lit > 0 && lit % 3 === 2);
    band = Math.max(38, 78 - lit * 8) * (lanternGold ? 0.7 : 1);
    var frac = 0.35 + Math.random() * 0.58;
    if (tries === 0) frac = 0.6;
    lanternY = TRAMP_Y - 150 - frac * RANGE;
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; charge = 0; pressing = false; idleT = 0;
    jumpY = 0; jumpV = 0; peakY = 0; lit = 0; golds = 0; misses = 0; timeLeft = TIME_LIMIT;
    stopT = 0; ok = false; ended = false; resultT = 0; flashT = 0; judged = false; landT = 0; lastNear = 0; pops = [];
    newLantern();
  }

  // 頭の灯し棒が届く最高点(溜め量から計算・ゴースト目盛にも使う)
  function peakFor(c) { return TRAMP_Y - 150 - c * RANGE; }

  function startCharge(live) {
    if (phase !== 'land') return;
    phase = 'charge'; charge = 0; pressing = true;
    if (live) game.audio.play('se_tap', 0.3);
  }

  function launch(live) {
    if (phase !== 'charge') return;
    pressing = false;
    phase = 'fly'; judged = false;
    peakY = peakFor(charge);
    var h = charge * RANGE + 20;
    jumpV = -Math.sqrt(2 * GRAV * h); jumpY = 0;
    if (live) {
      game.audio.play('se_jump', 0.45);
      game.fx.burst(W / 2, TRAMP_Y, { color: C.mint, count: 10, speed: 300 });
    }
  }

  function judgeAtPeak(live) {
    judged = true;
    var d = peakY - lanternY;  // 正: 届かない / 負: 行き過ぎ
    lastNear = d;
    if (Math.abs(d) <= band) {
      lit++; if (lanternGold) golds++;
      pops.push({ y: lanternY, gold: lanternGold, t: 0 });
      if (live) {
        var perfect = Math.abs(d) < band * 0.35;
        game.feedback.good(W / 2, lanternY, { text: perfect ? 'PERFECT' : 'GOOD', color: lanternGold ? C.gold : C.pink, size: 60, count: 16, sound: 'se_coin' });
        if (lit === 3) { game.audio.play('se_milestone', 0.45); game.fx.popup('3/5', W / 2, lanternY - 110, { color: C.gold, size: 60 }); }
      }
      if (lit >= NEEDED) { finish(true, live); return; }
      newLantern();
    } else {
      misses++;
      flashT = 0.4;
      if (live) game.feedback.bad(W / 2, lanternY, { text: 'MISS', color: C.red, shake: 8 });
      if (misses >= MAX_MISS) finish(false, live);
    }
  }

  function autoBounceMiss(live) {
    // 溜めずに待ちすぎ: 小さく跳ねて外す
    phase = 'charge'; charge = 0.05; launch(live);
    idleT = 0;
  }

  function finish(win, live) {
    phase = 'stop'; ok = win; stopT = win ? 0.6 : 0.5; flashT = 0.5;
    if (live) {
      game.audio.stopBgm();
      game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
      if (win) game.fx.flash(C.gold, 0.25);
    }
  }

  function stepWorld(dt, live) {
    for (var i = pops.length - 1; i >= 0; i--) { pops[i].t += dt; if (pops[i].t > 1.2) pops.splice(i, 1); }
    if (flashT > 0) flashT -= dt;
    if (phase === 'land') {
      idleT += dt;
      landT += dt;
      if (idleT > 2.5) autoBounceMiss(live);
    } else if (phase === 'charge') {
      charge = Math.min(1, charge + dt * (0.85 + lit * 0.06));
      if (live && charge >= 1 && Math.floor(game.time.elapsed * 10) % 3 === 0) game.audio.tone('C6', 0.03, { wave: 'square', volume: 0.03 });
    } else if (phase === 'fly') {
      jumpV += GRAV * dt;
      jumpY += jumpV * dt;
      if (!judged && jumpV >= 0) judgeAtPeak(live);
      if (jumpY >= 0 && jumpV > 0) {
        jumpY = 0; jumpV = 0;
        if (phase === 'fly') { phase = 'land'; idleT = 0; landT = 0; charge = 0; }
      }
    }
  }

  function drawBack() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.top], [0.55, C.mid], [1, C.low]]);
    for (var s = 0; s < 26; s++) {
      var sx = (s * 197) % W, sy = (s * 331) % (H * 0.45) + 40;
      game.draw.circle(sx, sy, 3 + (s % 3), C.white, 0.3 + 0.3 * Math.sin(t * 2 + s));
    }
    // 屋台の屋根と電飾
    for (var r = 0; r < 4; r++) {
      game.draw.sprite(ROOF, ROOF_PAL, 130 + r * 270, H * 0.66 + Math.sin(t + r) * 2, 18, { anchor: 'center' });
    }
    for (var b = 0; b < 12; b++) {
      var bx = 40 + b * 92, by = H * 0.26 + Math.sin(b * 0.7) * 30;
      game.draw.circle(bx, by, 9, b % 2 ? C.pink : C.mint, 0.55 + 0.35 * Math.sin(t * 3 + b));
    }
    game.draw.rect(0, 0, W, H, C.white, 0.03 + 0.03 * Math.sin(t * 1.4));
  }

  function drawLanternColumn() {
    // 提灯を吊る紐
    var sway = Math.sin(game.time.elapsed * 1.7) * 14;
    game.draw.line(W / 2 + sway * 0.3, H * 0.13, W / 2 + sway, lanternY - 40, C.white, 4);
    // 当たり帯(淡い帯)
    game.draw.rect(W / 2 - 170, lanternY - band, 340, band * 2, lanternGold ? C.gold : C.mint, 0.18);
    var pal = lanternGold ? LANTERN_GOLD_PAL : LANTERN_OFF_PAL;
    game.draw.sprite(LANTERN, pal, W / 2 + sway, lanternY, 16, { anchor: 'center' });
    if (lanternGold) game.draw.circle(W / 2 + sway, lanternY, 90, C.gold, 0.15 + 0.1 * Math.sin(game.time.elapsed * 6));
    // 灯した提灯が上へ昇っていく
    for (var i = 0; i < pops.length; i++) {
      var p = pops[i];
      game.draw.sprite(LANTERN, p.gold ? LANTERN_GOLD_PAL : LANTERN_ON_PAL, W / 2 + Math.sin(p.t * 5) * 20, p.y - p.t * 260, 16, { anchor: 'center', alpha: Math.max(0, 1 - p.t / 1.2) });
    }
    // 灯した数を上部に並べる
    for (var k = 0; k < NEEDED; k++) {
      game.draw.sprite(LANTERN, k < lit ? LANTERN_ON_PAL : LANTERN_OFF_PAL, W / 2 - 240 + k * 120, H * 0.1, 9, { anchor: 'center' });
    }
  }

  function drawChargeGhost() {
    if (phase !== 'charge' && phase !== 'land') return;
    var gy = peakFor(phase === 'charge' ? charge : 0);
    var inBand = Math.abs(gy - lanternY) <= band;
    game.draw.line(W / 2 - 150, gy, W / 2 + 150, gy, inBand ? C.gold : C.white, 6);
    game.draw.circle(W / 2 - 160, gy, 12, inBand ? C.gold : C.white);
    game.draw.circle(W / 2 + 160, gy, 12, inBand ? C.gold : C.white);
  }

  function drawTrampoline() {
    var sag = phase === 'charge' ? charge * 90 : (phase === 'land' ? Math.max(0, 20 - landT * 80) : 0);
    game.draw.rect(W / 2 - 250, TRAMP_Y + 20, 20, 150, C.dim);
    game.draw.rect(W / 2 + 230, TRAMP_Y + 20, 20, 150, C.dim);
    // 布(横ストリップで沈み込みを表現)
    for (var i = 0; i < 25; i++) {
      var fx = W / 2 - 240 + i * 20;
      var u = (i - 12) / 12;
      var dip = sag * (1 - u * u);
      game.draw.rect(fx, TRAMP_Y + 10 + dip, 20, 16, i % 2 ? C.pink : C.white);
    }
    game.draw.rect(W / 2 - 260, TRAMP_Y, 520, 14, C.mint);
  }

  function drawTanuki() {
    var sag = phase === 'charge' ? charge * 90 : 0;
    var y = TRAMP_Y - 90 + sag + jumpY;
    var f = phase === 'fly' ? 1 : (phase === 'charge' ? 2 : Math.floor(game.time.elapsed * 3) % 2 ? 0 : 1);
    var shake = (phase === 'charge' && charge >= 1) ? Math.sin(game.time.elapsed * 60) * 5 : 0;
    var sc = 14 + (flashT > 0 && phase === 'stop' ? 6 : 0);
    game.draw.circle(W / 2, TRAMP_Y + 12, 60 - Math.min(40, -jumpY * 0.05), C.ink, 0.25);
    game.draw.sprite(TANUKI[f], TANUKI_PAL, W / 2 + shake, y, sc, { anchor: 'center' });
    if (flashT > 0 && Math.floor(flashT * 20) % 2 === 0) game.draw.circle(W / 2, y, 100, C.white, 0.5);
  }

  function drawHud() {
    var bw = W - 160;
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 180, bw, 20, C.dim, 0.8);
    game.draw.rect(80, 180, bw * Math.max(0, timeLeft / TIME_LIMIT), 20, low ? C.red : C.gold);
    txt(lit + ' / ' + NEEDED, 70, H * 0.05, 44, C.white, 'left');
    for (var m = 0; m < MAX_MISS; m++) game.draw.circle(W - 80 - m * 56, H * 0.05, 18, m < MAX_MISS - misses ? C.pink : C.dim);
  }

  function drawThumb(press) {
    var py = H * 0.88;
    game.draw.circle(W / 2, py, 110, press ? C.pink : C.dim, 0.55);
    game.draw.circle(W / 2, py, 70, C.white, press ? 0.9 : 0.35);
  }

  var demo = { t: 0, gx: W / 2, gy: H * 0.88, press: false, goal: 0.5, n: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { initGame(); phase = 'land'; ready = 0; demo.n = 0; }
    if (phase === 'land' && landT > 0.25) {
      startCharge(false);
      var target = (TRAMP_Y - 150 - lanternY) / RANGE;
      // 2回目は失敗例(溜めすぎ)
      demo.goal = demo.n === 0 ? target : Math.min(1, target + 0.3);
    }
    if (phase === 'charge' && charge >= demo.goal) { launch(false); demo.n++; }
    demo.press = phase === 'charge';
    demo.gx = W / 2 + 40; demo.gy = H * 0.88;
    stepWorld(dt, false);
    if (phase === 'stop') { phase = 'land'; }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING; initGame(); demo.t = 0;
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    if (phase === 'land') startCharge(true);
    else game.audio.play('se_tap', 0.08);
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    if (phase === 'charge') launch(true);
    else if (phase === 'fly') game.fx.burst(x, y, { color: C.white, count: 3, speed: 120 });
  });

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawBack(); drawLanternColumn(); drawChargeGhost(); drawTrampoline(); drawTanuki(); drawThumb(demo.press);
      txt(GAME_TITLE, W / 2, H * 0.18, 90, C.gold);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.23, 38, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 46, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.96, 40, C.white);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
      stepWorld(dt, false);
      drawBack(); drawLanternColumn(); drawTrampoline(); drawTanuki();
      game.draw.rect(0, H * 0.28, W, H * 0.3, C.ink, 0.65);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.34, 104, ok ? C.gold : C.red);
      txt(lit + ' / ' + NEEDED, W / 2, H * 0.42, 60, C.white);
      var score = lit * 100 + golds * 100 + Math.round(timeLeft * 10);
      txt('SCORE ' + score, W / 2, H * 0.48, 44, C.gold);
      if (ok && score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.54, 50, C.mint);
      else if (!ok) txt('あと' + (NEEDED - lit) + '個!', W / 2, H * 0.54, 50, C.gold);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.54, 40, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.93, 42, C.white);
      if (!ended && resultT > 1.3) {
        ended = true;
        if (ok) game.end.success(score, { lanterns: lit, gold: golds, misses: misses });
        else game.end.failure({ lanterns: lit, gold: golds, misses: misses });
      }
      return;
    }

    // PLAYING
    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'land'; idleT = 0; landT = 0; game.audio.play('se_tap', 0.3); }
    } else if (phase === 'stop') {
      stopT -= dt;
      if (flashT > 0) flashT -= dt;
      if (stopT <= 0) { state = S.RESULT; resultT = 0; }
    } else {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        game.fx.popup('TIME UP', W / 2, H * 0.4, { color: C.red, size: 80 });
        game.feedback.bad(W / 2, lanternY, { text: null, shake: 10 });
        finish(false, true);
      } else stepWorld(dt, true);
    }
    drawBack(); drawLanternColumn(); drawChargeGhost(); drawTrampoline(); drawTanuki();
    drawThumb(pressing);
    drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 110, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['E5', 0.5], ['G5', 0.5], ['A5', 1], ['G5', 0.5], ['E5', 0.5], ['D5', 1],
      ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 2],
    ], { tempo: 132, wave: 'triangle', volume: 0.06, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

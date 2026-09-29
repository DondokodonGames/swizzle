// J-3DSDSDSTOP10-0032-starplate-halves.js
// 星図盤の半分合わせ — 回り続ける星図盤の右半分を止めて、左半分の星座とぴたりつなげる。ぴたり止めが続くほど倍率が伸びる
// 操作: 画面のどこでもタップで回る盤を止める。盤の縁の目印が上の切り欠きに来た瞬間ほど高得点(社内メモ。画面には出さない)
// 終わり: 6枚の星図を仕上げればCLEAR。大きくずれて3枚割る/時間切れでGAME OVER
// @mechanic: jackpot_combo
// @theme: observatory_star_chart_halves
// 世界観: 山頂天文台の見習い製図係が、からくり仕掛けで回り続ける星図盤の半分を止め、固定された残り半分の星座線と一本につなげて今夜の星図帳を6枚仕上げる。ぴたり止めを続けるほど星座が明るく灯る
// 残るもの: 正誤(CLEAR/GAME OVER) + 倍率込みのスコア・最大倍率・ぴたり止め数
// スタイル: 70s VECTOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 深い紺の地に発光する線画。面はほぼ塗らず、線を太い暗色+細い明色の2度引きで光らせる
  var STYLE = { bg: ['#02040e', '#07102a', '#0c1a3a'], main: ['#6cf2ff', '#b9ffec', '#3a7dff'], accent: ['#ffe46b', '#ff5b8a'] };
  var C = {
    sky1: '#02040e', sky2: '#0b1638', glow: '#6cf2ff', glowD: '#123a52', pale: '#b9ffec', blue: '#3a7dff',
    gold: '#ffe46b', goldD: '#4a3a10', bad: '#ff5b8a', badD: '#4a1022', ink: '#02040e', white: '#ffffff'
  };

  var GAME_TITLE = 'STAR HALVES';
  var TIME_LIMIT = 15;
  var NEEDED = 6;
  var LIVES = 3;
  var CX = W / 2, CY = H * 0.46, R = 330;
  var PERFECT_DEG = 7, GOOD_DEG = 20;

  // 星座(-1..1)。x<0 の線は固定側、x>=0 の線は回る側、またがる線は止めた時だけつながる
  var FIGS = [
    { s: [[-0.78, 0.12], [-0.45, -0.2], [-0.12, -0.34], [0.22, -0.3], [0.52, -0.08], [0.78, 0.2], [0.4, 0.36], [-0.05, 0.4], [-0.5, 0.3], [0.86, -0.34]],
      l: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 0], [4, 9]] },
    { s: [[-0.7, -0.5], [-0.35, -0.1], [-0.1, 0.1], [0.3, 0.05], [0.72, -0.45], [0.55, 0.3], [0.2, 0.6], [-0.3, 0.55], [-0.62, 0.2]],
      l: [[0, 1], [1, 2], [2, 3], [3, 4], [3, 5], [5, 6], [6, 7], [7, 8], [8, 1]] },
    { s: [[-0.15, -0.75], [0.15, -0.75], [0.35, -0.4], [0.5, 0.1], [0.3, 0.55], [-0.3, 0.55], [-0.5, 0.1], [-0.35, -0.4], [0, 0.05]],
      l: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0], [7, 8], [8, 2]] },
    { s: [[-0.8, 0], [-0.4, -0.25], [0, -0.1], [0.35, -0.35], [0.7, -0.1], [0.45, 0.25], [0.05, 0.3], [-0.35, 0.2], [0.85, 0.35]],
      l: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0], [5, 8]] }
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var phase, ready, timeLeft, plate, done, lives, streak, mult, maxMult, perfects, score, hitStop, outro, ok, lockAnim, nextT, halfShown, focusCol, press;

  // ── sprites ───────────────────────────────────────────────────────
  var ASTRO = [
    ['...hh...', '..hhhh..', '..fkfk..', '..ffff..', '.cccccc.', 'cc.cc.cc', '..cccc..', '..c..c..'],
    ['...hh...', '..hhhh..', '..ffff..', '..fkfk..', '.cccccc.', '.cccccc.', '..cccc..', '.c....c.']
  ];
  var ASTRO_PAL = { h: C.blue, f: C.pale, k: C.ink, c: C.glow };
  var SCOPE = ['......gg', '....ggg.', '..ggg...', '.gg.....', '...g....', '..g.g...', '.g...g..'];
  var LAMP = ['..y..', '.yyy.', '..y..', '.ggg.', 'g...g', 'ggggg'];
  var STAR = ['.w.', 'www', '.w.'];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function glowLine(x1, y1, x2, y2, col, dark, w) {
    game.draw.line(x1, y1, x2, y2, dark, w * 3);
    game.draw.line(x1, y1, x2, y2, col, w);
  }
  function wrap(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a <= -Math.PI) a += Math.PI * 2;
    return a;
  }

  function newPlate(k) {
    var fig = FIGS[k % FIGS.length];
    var dir = Math.random() < 0.5 ? 1 : -1;
    var w = Math.min(5.2, 2.6 + k * 0.42);
    var start = (Math.random() < 0.5 ? 1 : -1) * game.random(1.4, 2.6);
    plate = { fig: fig, th: start, w: w, dir: dir, age: 0, rev: k >= 2 ? game.random(0.7, 1.5) : -1, warn: 0, locked: false, crack: 0 };
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; done = 0; lives = LIVES;
    streak = 0; mult = 1; maxMult = 1; perfects = 0; score = 0; hitStop = 0; outro = 0; ok = false;
    lockAnim = 0; nextT = 0; halfShown = false; focusCol = C.gold; press = 0;
    newPlate(0);
  }

  // 盤の回転(実プレイ・デモ共用)
  function stepPlate(dt, isDemo) {
    if (!plate) return;
    if (plate.locked) {
      lockAnim -= dt;
      plate.th *= Math.max(0, 1 - dt * 14);
      nextT -= dt;
      if (nextT <= 0) newPlate(done);
      return;
    }
    plate.age += dt;
    if (plate.rev > 0) {
      var until = plate.rev - plate.age;
      if (until < 0.6 && until > 0) {
        if (plate.warn <= 0 && !isDemo) game.audio.tone('E6', 0.05, { wave: 'square', volume: 0.04 });
        plate.warn = until;
      }
      if (until <= 0) { plate.dir = -plate.dir; plate.rev = -1; plate.warn = 0; if (!isDemo) game.audio.tone('B5', 0.08, { wave: 'triangle', volume: 0.05 }); }
    }
    var feint = done >= 3 ? 1 + 0.35 * Math.sin(plate.age * 4.2) : 1;
    plate.th = wrap(plate.th + plate.w * plate.dir * feint * dt);
    if (plate.crack > 0) plate.crack -= dt;
  }

  // 止める判定(実プレイ・デモ共用)
  function lockPlate(isDemo) {
    if (!plate || plate.locked) return null;
    var err = Math.abs(wrap(plate.th)) * 180 / Math.PI;
    var mx = CX, my = CY - R - 40;
    if (err <= GOOD_DEG) {
      var perfect = err <= PERFECT_DEG;
      plate.locked = true; lockAnim = 0.5; nextT = 0.5;
      done++;
      if (perfect) { streak++; perfects++; } else streak = 0;
      var prevMult = mult;
      mult = Math.min(5, 1 + streak);
      if (mult > maxMult) maxMult = mult;
      if (isDemo) { game.fx.burst(mx, my, { color: perfect ? C.gold : C.glow, count: 10, speed: 260 }); return true; }
      var gain = (perfect ? 100 : 50) * (perfect ? mult : 1);
      score += gain;
      game.feedback.good(mx, my - 40, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.gold : C.glow, count: perfect ? 16 : 8 });
      if (perfect && mult >= 2) {
        game.audio.play('se_powerup', 0.4);
        game.fx.popup('x' + mult, W * 0.82, 250, { color: C.gold, size: 60 + mult * 8 });
      } else if (!perfect && prevMult >= 2) {
        game.audio.tone('C4', 0.18, { wave: 'sawtooth', volume: 0.05, slide: -120 });
        game.fx.popup('x1', W * 0.82, 250, { color: C.bad, size: 56 });
      }
      if (!halfShown && done >= NEEDED / 2) {
        halfShown = true;
        game.audio.play('se_milestone', 0.5);
        game.fx.popup(done + ' / ' + NEEDED, W / 2, H * 0.2, { color: C.pale, size: 64 });
      }
      if (done >= NEEDED) finish(true);
      return true;
    }
    // 大きくずれた: 盤にひびが入る
    streak = 0; mult = 1;
    plate.crack = 0.5;
    if (isDemo) { game.fx.burst(mx, my, { color: C.bad, count: 8, speed: 200 }); return false; }
    lives--;
    focusCol = C.bad;
    if (lives <= 0) { finish(false); return false; }
    hitStop = 0.35;
    game.feedback.bad(mx, my - 40, { text: 'MISS', color: C.bad });
    return false;
  }

  function finish(win) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.55;
    game.audio.stopBgm();
    if (win) { game.fx.flash(C.gold, 0.25); game.audio.play('se_success', 0.6); }
    else {
      game.feedback.bad(CX, CY - R - 80, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS', color: C.bad });
      game.audio.play('se_failure', 0.6);
    }
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase !== 'play' || hitStop > 0) return;
    press = 0.18;
    if (plate && plate.locked) { game.audio.play('se_tap', 0.15); return; }
    game.audio.play('se_tap', 0.3);
    lockPlate(false);
  });

  // ── demo(実際の盤を見て止める。3枚に1枚は早押ししてひびを見せる)──────
  var demo = { t: 0, gx: W / 2, gy: H * 0.86, press: false, n: 0, cool: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7;
    if (cyc < dt || demo.t <= dt) { done = 0; lives = LIVES; streak = 0; mult = 1; demo.n = 0; newPlate(0); }
    stepPlate(dt, true);
    demo.cool -= dt;
    demo.press = demo.cool > 0.25;
    if (press > 0) press -= dt;
    if (demo.cool <= 0 && plate && !plate.locked) {
      var err = Math.abs(wrap(plate.th)) * 180 / Math.PI;
      var early = demo.n % 3 === 2;
      if ((early && err < 60 && err > 35) || (!early && err < 6)) {
        demo.gx = W / 2 + 60; demo.gy = H * 0.86;
        lockPlate(true); demo.n++; demo.cool = 0.45; press = 0.18;
        if (done >= NEEDED) done = 0;
      }
    }
  }

  // ── drawing ───────────────────────────────────────────────────────
  function drawSky() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky1], [0.6, C.sky2], [1, C.sky1]]);
    for (var i = 0; i < 26; i++) {
      var sx = (i * 211) % W, sy = (i * 137) % (H * 0.8) + 40;
      game.draw.rect(sx, sy, 4, 4, C.pale, 0.25 + 0.3 * Math.sin(t * 2 + i));
    }
    // 遠景の山稜(線だけ)
    for (var x = 0; x < W; x += 60) {
      var y1 = H * 0.72 - 40 - Math.abs(Math.sin(x * 0.006)) * 90;
      var y2 = H * 0.72 - 40 - Math.abs(Math.sin((x + 60) * 0.006)) * 90;
      game.draw.line(x, y1, x + 60, y2, C.glowD, 4);
    }
    game.draw.rect(0, 0, W, H, C.glow, 0.02 + 0.02 * Math.sin(t * 1.3));
  }

  function toScreen(p, rot) {
    var x = p[0], y = p[1];
    if (rot !== null) {
      var c = Math.cos(rot), s = Math.sin(rot);
      var nx = x * c - y * s, ny = x * s + y * c; x = nx; y = ny;
    }
    return [CX + x * R * 0.82, CY + y * R * 0.82];
  }

  function drawPlate() {
    var t = game.time.elapsed;
    if (!plate) return;
    var th = plate.th;
    var sh = plate.crack > 0 ? Math.sin(t * 70) * 8 : 0;
    // 盤の外枠(固定)と回る縁の目盛り
    game.draw.circle(CX, CY, R + 24, C.glowD, 0.6);
    game.draw.circle(CX, CY, R + 10, C.sky1, 0.9);
    for (var k = 0; k < 24; k++) {
      var a = th + k * Math.PI / 12 - Math.PI / 2;
      var r1 = R - 6, r2 = R + (k % 6 === 0 ? 18 : 6);
      glowLine(CX + sh + Math.cos(a) * r1, CY + Math.sin(a) * r1, CX + sh + Math.cos(a) * r2, CY + Math.sin(a) * r2, C.blue, C.glowD, 3);
    }
    // 中央の仕切り(固定)
    glowLine(CX, CY - R, CX, CY + R, C.glowD, C.sky1, 2);
    // 上の切り欠き(固定の目印)
    var ny = CY - R - 30;
    glowLine(CX - 30, ny - 40, CX, ny, C.gold, C.goldD, 5);
    glowLine(CX + 30, ny - 40, CX, ny, C.gold, C.goldD, 5);
    // 回る側の目印(角度0で真上)
    var warnOn = plate.warn > 0 && Math.floor(t * 16) % 2 === 0;
    var ma = th - Math.PI / 2;
    var mcol = warnOn ? C.bad : C.pale;
    glowLine(CX + sh + Math.cos(ma) * (R - 50), CY + Math.sin(ma) * (R - 50), CX + sh + Math.cos(ma) * (R + 4), CY + Math.sin(ma) * (R + 4), mcol, C.glowD, 8);
    game.draw.circle(CX + sh + Math.cos(ma) * (R - 60), CY + Math.sin(ma) * (R - 60), 12, mcol);
    // 星座線
    var fig = plate.fig;
    var lit = plate.locked;
    for (var i = 0; i < fig.l.length; i++) {
      var A = fig.s[fig.l[i][0]], B = fig.s[fig.l[i][1]];
      var aFix = A[0] < 0, bFix = B[0] < 0;
      var pa = toScreen(A, aFix ? null : th), pb = toScreen(B, bFix ? null : th);
      if (!aFix) pa[0] += sh;
      if (!bFix) pb[0] += sh;
      if (aFix && bFix) glowLine(pa[0], pa[1], pb[0], pb[1], lit ? C.gold : C.glow, lit ? C.goldD : C.glowD, 4);
      else if (!aFix && !bFix) glowLine(pa[0], pa[1], pb[0], pb[1], lit ? C.gold : C.pale, lit ? C.goldD : C.glowD, 4);
      else if (lit) glowLine(pa[0], pa[1], pb[0], pb[1], C.gold, C.goldD, 5);
    }
    for (var j = 0; j < fig.s.length; j++) {
      var P = fig.s[j];
      var ps = toScreen(P, P[0] < 0 ? null : th);
      if (P[0] >= 0) ps[0] += sh;
      game.draw.sprite(STAR, { w: lit ? C.gold : C.white }, ps[0], ps[1], 7 + (lit ? 2 : 0) + Math.sin(t * 5 + j) * 1.2, { anchor: 'center' });
    }
    if (lockAnim > 0) game.draw.circle(CX, CY, R * (1.1 - lockAnim * 0.2), C.gold, lockAnim * 0.25);
    if (plate.crack > 0) {
      glowLine(CX + 40, CY - 120, CX + 120, CY + 20, C.bad, C.badD, 5);
      glowLine(CX + 120, CY + 20, CX + 60, CY + 160, C.bad, C.badD, 5);
    }
  }

  function drawBottom() {
    var t = game.time.elapsed;
    // 製図台(親指ゾーン)
    glowLine(40, H * 0.77, W - 40, H * 0.77, C.glow, C.glowD, 4);
    // 仕上げた星図の控え
    for (var i = 0; i < NEEDED; i++) {
      var bx = W * 0.2 + i * 118, by = H * 0.8;
      game.draw.circle(bx, by, 40, i < done ? C.goldD : C.glowD, 0.8);
      if (i < done) game.draw.sprite(STAR, { w: C.gold }, bx, by + Math.sin(t * 3 + i) * 4, 10, { anchor: 'center' });
    }
    // 止めレバー
    var down = press > 0 ? 24 : 0;
    game.draw.rect(W / 2 - 150, H * 0.87 + down, 300, 70, C.glowD, 0.8);
    glowLine(W / 2 - 150, H * 0.87 + down, W / 2 + 150, H * 0.87 + down, C.gold, C.goldD, 5);
    glowLine(W / 2, H * 0.87 + down, W / 2, H * 0.84 + down, C.gold, C.goldD, 5);
    game.draw.circle(W / 2, H * 0.835 + down, 22, C.gold);
    // 灯り(残機)
    for (var j = 0; j < LIVES; j++) game.draw.sprite(LAMP, { g: j < lives ? C.glow : C.glowD, y: j < lives ? C.gold : C.glowD }, W * 0.8 + j * 64, H * 0.95, 9, { anchor: 'center' });
    game.draw.sprite(ASTRO[Math.floor(t * 2) % 2], ASTRO_PAL, W * 0.12, H * 0.92 + Math.sin(t * 2.4) * 6, 14, { anchor: 'center' });
    game.draw.sprite(SCOPE, { g: C.glow }, W * 0.24 + Math.sin(t * 1.6) * 4, H * 0.93, 12, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, C.sky1, 0.7);
    txt(done + ' / ' + NEEDED, W / 2, 80, 64, C.pale);
    txt(String(Math.ceil(timeLeft)), 70, 80, 52, C.white, 'left');
    txt('x' + mult, W - 70, 80, 56 + (mult - 1) * 6, mult >= 3 ? C.gold : C.glow, 'right');
    txt(String(score), W / 2, 150, 36, C.gold);
    game.draw.rect(60, 190, W - 120, 18, C.glowD);
    game.draw.rect(60, 190, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 18, timeLeft < 4 ? C.bad : C.glow);
  }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawSky(); drawPlate(); drawBottom();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.sky1, 0.7);
      txt(GAME_TITLE, W / 2, 90 + Math.sin(t * 2) * 6, 76, C.glow);
      txt('HI-SCORE ' + game.best, W / 2, 180, 36, C.gold);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.985, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.985, 34, C.pale);
      return;
    }

    if (state === S.RESULT) {
      drawSky(); drawBottom();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 90, ok ? C.gold : C.bad);
      txt('SCORE ' + score, W / 2, H * 0.37, 48, C.pale);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.985, 38, C.white);
      return;
    }

    if (press > 0) press -= dt;
    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'play') {
      if (hitStop > 0) hitStop -= dt;
      else {
        timeLeft -= dt;
        stepPlate(dt, false);
        if (timeLeft <= 0) { timeLeft = 0; finish(false); }
      }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (plate && plate.locked) plate.th *= 0.8;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      if (outro <= 0) {
        state = S.RESULT;
        var stats = { plates: done, perfect: perfects, maxMult: maxMult, lives: lives };
        if (ok) game.end.success(score, stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawSky(); drawPlate(); drawBottom(); drawHud();
    if (phase === 'stop' || (phase === 'play' && hitStop > 0)) {
      if (Math.floor(t * 14) % 2 === 0) game.draw.circle(CX, CY - R - 30, 70, focusCol === C.bad && !ok ? C.bad : C.white, 0.35);
    }
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.22, 96, C.gold);
    if (phase === 'outro') {
      game.draw.rect(0, H * 0.24, W, H * 0.16, C.sky1, 0.85);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.28, 96, ok ? C.gold : C.bad);
      txt('SCORE ' + score, W / 2, H * 0.33, 44, C.white);
      if (ok && score > game.best) txt('NEW RECORD', W / 2, H * 0.37, 40, C.gold);
      else if (!ok) txt('あと' + Math.max(1, NEEDED - done) + '枚!', W / 2, H * 0.37, 44, C.white);
      else txt('BEST ' + game.best, W / 2, H * 0.37, 36, C.white);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['E5', 0.5], ['B4', 0.5], ['G5', 1], ['F#5', 0.5], ['E5', 0.5], ['B4', 1],
      ['C5', 0.5], ['E5', 0.5], ['A5', 1], ['G5', 0.5], ['F#5', 0.5], ['E5', 1]
    ], { tempo: 116, wave: 'triangle', volume: 0.05, loop: true, bass: [['E2', 2], ['B2', 2], ['A2', 2], ['B2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

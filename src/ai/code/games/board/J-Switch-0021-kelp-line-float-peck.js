// J-Switch-0021-kelp-line-float-peck.js
// 干し綱の浮き玉つつき — 干し綱に並んで流れてくる浮き玉を順につつく。砂の詰まった外れ玉は重くて低く垂れる。高く軽やかに揺れる玉だけを見抜いて割る
// 操作: 2〜3個ずつ運ばれてくる浮き玉のうち、いちばん高く浮いている玉をタップ(社内メモ。画面には出さない)
// 終わり: 6個割ればCLEAR。外れ玉(砂)を割る/見送り(1組2.6秒)が2回/全体の時間切れでGAME OVER
// @mechanic: size_judge
// @theme: seaside_float_ball_peck
// 世界観: 浜の昆布干し場の夏の余興で、見習いのカモメが干し綱に吊られて順に流れてくる浮き玉をくちばしでつつき、中の小魚を受け取る。砂を詰めた外れ玉は重くて糸が伸び、低く鈍く揺れるので、それを見抜いて軽い玉だけを割り続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 割った数・外れ数・最速の見極め秒
// スタイル: 2000s BILLBOARD 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s BILLBOARD 3D: 奥行きは sprite の px スケール、位置は接地影で示す
  var STYLE = { bg: ['#8fd3f4', '#c9ecff', '#f2dfb0'], main: ['#2f7fb8', '#e8c27a', '#ffffff'], accent: ['#ff6f59', '#ffd23f'] };
  var C = {
    sky1: '#6ec3ee', sky2: '#d4f0ff', sea: '#2f7fb8', seaL: '#5aa6d6', sand: '#ecd49a', sandD: '#c9aa6a',
    rope: '#6b4a2b', pole: '#7a5534', kelp: '#3f6b3a', ink: '#1d2a36', white: '#ffffff',
    good: '#ffd23f', bad: '#ff5a4a', shadow: '#5a4a2a'
  };
  var BALL_COLS = [
    { b: '#ff6f59', l: '#ffb3a6' }, { b: '#4fb0e8', l: '#b4e3ff' }, { b: '#8bd35a', l: '#d0f5b0' },
    { b: '#c77dff', l: '#ebd1ff' }, { b: '#ffb02e', l: '#ffe3a3' }
  ];

  var GAME_TITLE = 'FLOAT PECK';
  var TIME_LIMIT = 15;
  var NEEDED = 6;
  var MAX_MISS = 2;
  var ASK_T = 2.6;
  var ROPE_Y = H * 0.24;
  var BASE_LEN = 250;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var phase, ready, timeLeft, pops, misses, roundNo, balls, sub, subT, slide, hitStop, outro, ok, fastest, combo, halfShown, lastPick, fishes;

  var BALL = [
    '...bbbb...',
    '..bllbbb..',
    '.bllbbbbb.',
    '.blbbbbbb.',
    '.bbbbbbbb.',
    '.bbbbbbbb.',
    '..bbbbbb..',
    '...bbbb...',
    '....kk....'
  ];
  var GULL = [
    ['....ww......', '...wwww.....', '..wwkwwoo...', 'gg.wwwww....', '.ggwwwwwww..', '..gwwwwwwww.', '....wwwww...', '.....y.y....'],
    ['gg..ww......', '.gggwwww....', '...wwkwwoo..', '...wwwww....', '..wwwwwwww..', '..wwwwwwwww.', '....wwwww...', '.....y.y....']
  ];
  var FISH = ['.ss.s', 'sssss', '.ss.s'];
  var SANDBAG = ['.dd.', 'dddd', '.dd.'];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  // 1組をつくる: 軽い玉1つ + 砂玉(1〜2)。組が進むほど垂れ差が縮み、揺れが大きくなる
  function newPair() {
    var r = roundNo;
    var n = r >= 4 ? 3 : 2;
    var diff = Math.max(34, 112 - r * 13);
    var goodIdx = Math.floor(game.random(0, n)) % n;
    var col = BALL_COLS[Math.floor(game.random(0, BALL_COLS.length)) % BALL_COLS.length];
    balls = [];
    for (var i = 0; i < n; i++) {
      var heavy = i !== goodIdx;
      var x = n === 2 ? W * (0.3 + i * 0.4) : W * (0.2 + i * 0.3);
      balls.push({
        x: x, heavy: heavy, col: col,
        len: BASE_LEN + (heavy ? diff + game.random(0, diff * 0.35) : 0),
        amp: heavy ? 7 + r * 0.8 : 14 + r * 2.2,
        spd: heavy ? 1.6 : 3.4 + game.random(0, 0.8),
        ph: game.random(0, 6.28), popped: 0, burst: 0
      });
    }
    sub = 'slide'; subT = 0.35; slide = W;
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; pops = 0; misses = 0; roundNo = 0;
    hitStop = 0; outro = 0; ok = false; fastest = 99; combo = 0; halfShown = false; lastPick = null; fishes = [];
    newPair();
  }

  function ballY(b) {
    return ROPE_Y + b.len + Math.sin(game.time.elapsed * b.spd + b.ph) * b.amp;
  }

  function stepPair(dt, isDemo) {
    subT -= dt;
    if (sub === 'slide') {
      slide = Math.max(0, slide - dt * W / 0.35);
      if (subT <= 0) { sub = 'ask'; subT = ASK_T; slide = 0; }
    } else if (sub === 'ask') {
      if (subT <= 0) pick(null, isDemo);
    } else if (sub === 'leave') {
      slide -= dt * W / 0.4;
      if (subT <= 0) { roundNo++; newPair(); }
    }
    for (var i = 0; i < fishes.length; i++) {
      var f = fishes[i];
      f.vy += 1800 * dt; f.x += (W * 0.5 - f.x) * Math.min(1, dt * 4); f.y += f.vy * dt; f.t -= dt;
    }
    fishes = fishes.filter(function(f) { return f.t > 0 && f.y < H * 0.84; });
  }

  // 選ぶ(実プレイ・デモ共用)。b=null は見送り(時間切れ)
  function pick(b, isDemo) {
    if (sub !== 'ask') return;
    var took = ASK_T - subT;
    sub = 'leave'; subT = 0.55;
    var good = null;
    for (var i = 0; i < balls.length; i++) if (!balls[i].heavy) good = balls[i];
    lastPick = { t: 0.55, good: good, wrong: b && b.heavy ? b : null };
    if (b) { b.popped = 1; b.burst = 0.4; }
    if (isDemo) {
      if (b) game.fx.burst(b.x, ballY(b), { color: b.heavy ? C.sandD : C.good, count: 12, speed: 260 });
      if (b && !b.heavy) fishes.push({ x: b.x, y: ballY(b), vy: -300, t: 1.2 });
      return;
    }
    if (b && !b.heavy) {
      pops++;
      combo = took < 0.9 ? combo + 1 : 0;
      if (took < fastest) fastest = took;
      fishes.push({ x: b.x, y: ballY(b), vy: -320, t: 1.2 });
      game.feedback.good(b.x, ballY(b) - 90, { text: took < 0.9 ? 'PERFECT' : 'GOOD', color: C.good, count: 18 });
      game.audio.play('se_coin', 0.35);
      if (combo >= 2) game.fx.popup('x' + combo, b.x, ballY(b) - 170, { color: C.white, size: 44 });
      if (!halfShown && pops >= NEEDED / 2) {
        halfShown = true;
        game.audio.play('se_milestone', 0.5);
        game.fx.popup(pops + ' / ' + NEEDED, W / 2, H * 0.52, { color: C.good, size: 72 });
      }
      if (pops >= NEEDED) finish(true);
      return;
    }
    misses++; combo = 0;
    var hx = b ? b.x : W / 2, hy = b ? ballY(b) : H * 0.45;
    if (b) game.fx.burst(hx, hy, { color: C.sandD, count: 26, speed: 380 });
    if (misses >= MAX_MISS) { finish(false); return; }
    hitStop = 0.45;
    game.feedback.bad(hx, hy - 90, { text: 'MISS', color: C.bad });
  }

  function finish(win) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.6;
    game.audio.stopBgm();
    if (win) { game.fx.flash(C.good, 0.25); game.audio.play('se_success', 0.6); }
    else {
      game.feedback.bad(W / 2, H * 0.45, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS', color: C.bad });
      game.audio.play('se_failure', 0.6);
    }
  }

  function ballAt(x, y) {
    var best = null, bd = 120;
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      var d = Math.hypot(x - (b.x + slide), y - ballY(b));
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase !== 'play' || hitStop > 0) return;
    var b = sub === 'ask' ? ballAt(x, y) : null;
    if (b) { game.audio.play('se_tap', 0.3); pick(b, false); }
    else { game.audio.tone('C3', 0.05, { wave: 'triangle', volume: 0.04 }); game.fx.burst(x, y, { color: C.white, count: 3, speed: 90 }); }
  });

  // ── demo(軽い玉を2回当て、3組目で重い玉を割って砂をかぶる)──────────
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: false, n: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 9;
    if (cyc < dt || demo.t <= dt) { roundNo = 0; demo.n = 0; fishes = []; newPair(); }
    stepPair(dt, true);
    demo.press = false;
    if (sub === 'ask') {
      var wrong = demo.n % 3 === 2;
      var aim = null;
      for (var i = 0; i < balls.length; i++) if ((!wrong && !balls[i].heavy) || (wrong && balls[i].heavy && !aim)) aim = balls[i];
      var k = Math.min(1, dt * 6);
      demo.gx += (aim.x - demo.gx) * k; demo.gy += (ballY(aim) + 40 - demo.gy) * k;
      if (ASK_T - subT > 0.85) { demo.press = true; pick(aim, true); demo.n++; }
    } else {
      demo.gx += (W / 2 - demo.gx) * Math.min(1, dt * 3); demo.gy += (H * 0.62 - demo.gy) * Math.min(1, dt * 3);
    }
  }

  // ── drawing ───────────────────────────────────────────────────────
  function drawWorld() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H * 0.52, [[0, C.sky1], [1, C.sky2]]);
    game.draw.gradient(H * 0.52, H * 0.62, [[0, C.sea], [1, C.seaL]]);
    game.draw.gradient(H * 0.62, H, [[0, C.sand], [1, C.sandD]]);
    for (var w = 0; w < 6; w++) {
      var wx = ((w * 230 + t * 40) % (W + 200)) - 100;
      game.draw.rect(wx, H * 0.55 + (w % 3) * 22, 120, 5, C.white, 0.5);
    }
    // 奥の干し綱(小さく=遠い)に干した昆布
    game.draw.line(0, H * 0.16, W, H * 0.17, C.rope, 3);
    for (var k = 0; k < 9; k++) {
      var kx = 60 + k * 120, sw = Math.sin(t * 1.5 + k) * 6;
      game.draw.rect(kx + sw, H * 0.165, 16, 70 + (k % 3) * 20, C.kelp, 0.7);
    }
    // 手前の支柱と綱
    game.draw.rect(30, ROPE_Y - 20, 26, H * 0.62 - ROPE_Y + 60, C.pole);
    game.draw.rect(W - 56, ROPE_Y - 20, 26, H * 0.62 - ROPE_Y + 60, C.pole);
    game.draw.line(40, ROPE_Y, W - 40, ROPE_Y, C.rope, 8);
    game.draw.rect(0, 0, W, H, C.white, 0.02 + 0.02 * Math.sin(t * 1.3));
  }

  function shadow(x, y, w, a) {
    for (var i = -3; i <= 3; i++) {
      var ww = w * Math.sqrt(1 - (i * i) / 16);
      game.draw.rect(x - ww, y + i * 5, ww * 2, 5, C.shadow, a);
    }
  }

  function drawBalls() {
    var t = game.time.elapsed;
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      var bx = b.x + slide, by = ballY(b);
      // 接地影: 高く浮く玉ほど影が小さく薄い
      var hgt = (H * 0.8 - by) / H;
      shadow(bx, H * 0.8, 50 + (1 - hgt) * 50, 0.18 + (1 - hgt) * 0.2);
      if (b.popped) {
        if (b.burst > 0) b.burst -= 1 / 60;
        if (b.heavy) game.draw.sprite(SANDBAG, { d: C.sandD }, bx, by + 60, 18, { anchor: 'center' });
        continue;
      }
      var sway = Math.sin(t * b.spd * 0.5 + b.ph) * 6;
      game.draw.line(bx, ROPE_Y, bx + sway, by + 50, C.ink, 3);
      var hl = lastPick && lastPick.good === b && Math.floor(t * 12) % 2 === 0;
      if (hl) game.draw.circle(bx + sway, by, 110, C.good, 0.45);
      game.draw.sprite(BALL, { b: b.col.b, l: b.col.l, k: C.ink }, bx + sway, by, 18, { anchor: 'center' });
    }
    if (sub === 'ask') {
      var p = Math.max(0, subT / ASK_T);
      game.draw.rect(W * 0.2, H * 0.66, W * 0.6, 16, C.sandD);
      game.draw.rect(W * 0.2, H * 0.66, W * 0.6 * p, 16, p < 0.3 ? C.bad : C.good);
    }
    for (var f = 0; f < fishes.length; f++) game.draw.sprite(FISH, { s: '#9fb8c8' }, fishes[f].x, fishes[f].y, 14, { anchor: 'center' });
  }

  function drawBottom() {
    var t = game.time.elapsed;
    game.draw.rect(0, H * 0.84, W, H * 0.16, C.sandD, 0.6);
    var fr = Math.floor(t * 3) % 2;
    shadow(W / 2, H * 0.905, 80, 0.3);
    game.draw.sprite(GULL[fr], { w: C.white, k: C.ink, o: '#ff9f1c', g: '#9aa8b4', y: '#ff9f1c' }, W / 2 + Math.sin(t * 1.7) * 14, H * 0.87 + Math.sin(t * 2.6) * 6, 16, { anchor: 'center' });
    for (var i = 0; i < NEEDED; i++) game.draw.sprite(FISH, { s: i < pops ? C.good : '#b7a47a' }, W * 0.08 + i * 62, H * 0.955, 9, { anchor: 'center' });
    for (var m = 0; m < MAX_MISS; m++) game.draw.sprite(SANDBAG, { d: m < misses ? C.bad : '#b7a47a' }, W * 0.82 + m * 80, H * 0.955, 13, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, C.ink, 0.7);
    txt(pops + ' / ' + NEEDED, W / 2, 90, 66, C.good);
    txt(String(Math.ceil(timeLeft)), 70, 90, 52, C.white, 'left');
    game.draw.rect(60, 170, W - 120, 20, '#34495a');
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 20, timeLeft < 4 ? C.bad : C.good);
  }

  function score() { return pops * 250 + Math.max(0, MAX_MISS - misses) * 80 + Math.round(timeLeft * 12); }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (lastPick) { lastPick.t -= dt; if (lastPick.t <= 0) lastPick = null; }

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawWorld(); drawBalls(); drawBottom();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.7);
      txt(GAME_TITLE, W / 2, 90 + Math.sin(t * 2) * 6, 80, C.good);
      txt('HI-SCORE ' + game.best, W / 2, 180, 36, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.78, 42, C.good);
      else txt('INSERT COIN', W / 2, H * 0.78, 36, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawWorld(); drawBottom();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 90, ok ? C.good : C.bad);
      txt('BEST ' + game.best, W / 2, H * 0.46, 40, C.white);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.78, 38, C.white);
      return;
    }

    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'play') {
      if (hitStop > 0) hitStop -= dt;
      else {
        timeLeft -= dt;
        stepPair(dt, false);
        if (phase === 'play' && timeLeft <= 0) { timeLeft = 0; finish(false); }
      }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      if (outro <= 0) {
        state = S.RESULT;
        var stats = { pops: pops, misses: misses, fastest: fastest < 99 ? Math.round(fastest * 10) / 10 : 0 };
        if (ok) game.end.success(score(), stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawWorld(); drawBalls(); drawBottom(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 96, C.good);
    if (phase === 'outro') {
      var sc = score();
      game.draw.rect(0, H * 0.36, W, H * 0.16, C.ink, 0.85);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 96, ok ? C.good : C.bad);
      txt('SCORE ' + sc, W / 2, H * 0.45, 44, C.white);
      if (ok && sc > game.best) txt('NEW RECORD', W / 2, H * 0.49, 40, C.good);
      else if (!ok) txt('あと' + Math.max(1, NEEDED - pops) + '個!', W / 2, H * 0.49, 44, C.white);
      else txt('BEST ' + game.best, W / 2, H * 0.49, 36, C.white);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['G4', 0.5], ['C5', 0.5], ['E5', 1], ['D5', 0.5], ['C5', 0.5], ['A4', 1],
      ['G4', 0.5], ['A4', 0.5], ['C5', 0.5], ['D5', 0.5], ['C5', 2]
    ], { tempo: 132, wave: 'triangle', volume: 0.05, loop: true, bass: [['C3', 2], ['F2', 2], ['G2', 2], ['C3', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

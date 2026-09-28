// J-GC4-0026-confetti-ball-kickback.js
// くす玉キックバック — 導火線がぱちぱち燃える紙吹雪のくす玉が足元の輪に入った瞬間だけ蹴り返し、自分の側ではじけさせない
// 操作: 転がってくる玉の接地影が足元の光る輪(窓)に入っている間にタップで蹴り返す。早すぎ/遅すぎは空振り
// 終わり: 7回蹴り返すと玉が向こう側ではじけてCLEAR。3回取りこぼす/導火線が燃え尽きるとGAME OVER
// @mechanic: timing_window
// @theme: festival_confetti_kickball
// 世界観: 夏祭りの石畳の広場で、提灯職人の子が導火線つきの紙吹雪くす玉を向こうの影法師たちと蹴り合い、はじける瞬間に自分の足元に残らないよう輪の中で蹴り返し続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 蹴り返した回数・PERFECT数・スコア
// スタイル: MODE7 PSEUDO

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 奥ほど圧縮された床の横ストリップ、地平グラデ
  var STYLE = {
    bg: ['#1a1440', '#4b2b6b', '#d86a5a'],
    main: ['#c9a27a', '#8a6a52', '#f2d6a2'],
    accent: ['#5cf2c8', '#ff4f6d'],
  };
  var CONFETTI = ['#ff4f6d', '#ffd23f', '#5cf2c8', '#7aa8ff', '#ffffff'];

  var GAME_TITLE = 'KICKBACK';
  var TIME_LIMIT = 15;
  var NEEDED = 7;
  var STRIKES = 3;
  var HOR = H * 0.3;
  var FEET = H * 0.8;
  var WIN_C = 0.92;

  var KID = [
    '..yyyy..',
    '.yyyyyy.',
    '..ssss..',
    '..s.s...',
    '.bbbbbb.',
    'sbbbbbbs',
    '.bb..bb.',
    '.ss..ss.',
  ];
  var KID_KICK = [
    '..yyyy..',
    '.yyyyyy.',
    '..ssss..',
    '..s.s...',
    '.bbbbbb.',
    'sbbbbbbs',
    '.bb..bbss',
    '.ss.....',
  ];
  var KID_PAL = { y: '#ffd23f', s: '#f3c9a0', b: '#3d6bff' };
  var SHADOW_KID = ['.##.', '####', '.##.', '####', '#..#'];
  var BALL = [
    '..rrrr..',
    '.rwwwwr.',
    'rrrrrrrr',
    'ywwyywwy',
    'yyyyyyyy',
    'bwwbbwwb',
    '.bbbbbb.',
    '..bbbb..',
  ];
  var BALL_PAL = { r: '#ff4f6d', w: '#ffffff', y: '#ffd23f', b: '#7aa8ff' };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var g = null;

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#120c2b', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function initGame() {
    g = {
      d: 0, dir: 0, phase: 'wait', phaseT: 0, travel: 1.3, kind: 0, lane: 0, laneV: 0, kicker: 1,
      kicks: 0, perfect: 0, strikes: 0, score: 0, combo: 0, timeLeft: TIME_LIMIT,
      ready: 0.8, hitStop: 0, finished: false, done: false, ok: false, endWait: 0,
      kickAnim: 0, cool: 0, spark: 0, popAt: null, half: false,
    };
  }

  function winHalf() { return Math.max(0.045, 0.075 - g.kicks * 0.004); }
  function depthY(d) { return HOR + (FEET - HOR) * Math.pow(Math.max(0, d), 1.7); }
  function depthS(d) { return 0.25 + 0.9 * Math.max(0, d); }
  function ballX() { return W / 2 + g.lane * depthS(g.d) * 240; }
  function hop() {
    if (g.kind !== 2 || g.phase !== 'come') return 0;
    return Math.abs(Math.sin(g.d * Math.PI * 3)) * 140 * depthS(g.d);
  }

  function serve() {
    g.phase = 'wait'; g.phaseT = 0; g.d = 0;
    g.kicker = Math.floor(game.random(0, 3)) % 3;
    var n = g.kicks;
    g.kind = n < 2 ? 0 : Math.floor(game.random(0, 3)) % 3; // 0=まっすぐ 1=ゆっくり→急加速 2=弾む
    g.travel = Math.max(0.75, 1.1 - n * 0.05);
    g.lane = (g.kicker - 1) * 0.5;
    g.laneV = -g.lane / g.travel;
  }

  function kick() {
    if (g.phase !== 'come') {
      game.audio.play('se_tap', 0.2);
      g.kickAnim = 0.2;
      return;
    }
    if (g.cool > 0) { game.audio.play('se_tap', 0.1); return; }
    g.kickAnim = 0.2;
    var off = Math.abs(g.d - WIN_C);
    var bx = ballX(), by = depthY(g.d);
    if (off <= winHalf()) {
      var perfect = off <= winHalf() * 0.35;
      g.kicks++; g.combo++;
      if (perfect) g.perfect++;
      g.score += perfect ? 150 : 100;
      g.score += Math.min(5, g.combo) * 10;
      g.phase = 'back'; g.phaseT = 0;
      game.feedback.good(bx, by - 80, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? '#ffd23f' : STYLE.accent[0], count: 16, sound: 'se_jump' });
      if (g.kicks === 4 && !g.half) {
        g.half = true;
        game.fx.popup('4 / ' + NEEDED, W / 2, H * 0.45, { color: '#ffd23f', size: 70 });
        game.audio.play('se_milestone', 0.5);
      }
    } else {
      g.cool = 0.3;
      g.combo = 0;
      game.feedback.bad(bx, by - 80, { text: 'MISS', shake: 6, size: 46 });
    }
  }

  function strike() {
    g.strikes++;
    g.combo = 0;
    if (g.strikes >= STRIKES) { endRound(false); return; }
    game.feedback.bad(ballX(), FEET, { text: 'MISS', shake: 12 });
    g.phase = 'lost'; g.phaseT = 0;
  }

  function endRound(ok) {
    if (g.finished) return;
    g.finished = true; g.ok = ok; g.hitStop = 0.5;
    g.popAt = ok ? [W / 2, depthY(0.02) - 60] : [ballX(), depthY(Math.min(1.05, g.d)) - 40];
    game.fx.flash('#ffffff', 0.15);
    game.audio.play('se_tap', 0.5);
    if (ok) g.score += Math.round(g.timeLeft * 50);
  }

  function step(dt, isDemo) {
    g.phaseT += dt;
    if (g.kickAnim > 0) g.kickAnim -= dt;
    if (g.cool > 0) g.cool -= dt;
    g.spark += dt * (6 + (TIME_LIMIT - g.timeLeft) * 0.8);
    if (g.phase === 'wait') {
      if (g.phaseT >= 0.3) { g.phase = 'come'; g.phaseT = 0; game.audio.tone('C5', 0.06, { wave: 'triangle', volume: 0.08 }); }
    } else if (g.phase === 'come') {
      var rate = 1 / g.travel;
      if (g.kind === 1) rate *= g.d < 0.5 ? 0.55 : 1.7;
      g.d += rate * dt;
      g.lane += g.laneV * dt;
      if (g.d > WIN_C + winHalf() + 0.1) strike();
    } else if (g.phase === 'back') {
      g.d -= dt / 0.3;
      if (g.d <= 0) {
        g.d = 0;
        if (g.kicks >= NEEDED) { if (!isDemo) endRound(true); else serve(); }
        else serve();
      }
    } else if (g.phase === 'lost') {
      g.d += dt * 0.3;
      if (g.phaseT >= 0.6) serve();
    }
    if (!isDemo) {
      g.timeLeft -= dt;
      if (g.timeLeft <= 0 && !g.finished) { g.timeLeft = 0; endRound(false); }
    }
  }

  // ── 描画 ─────────────────────────────────────────────
  function drawBg() {
    var t = game.time.elapsed;
    game.draw.gradient(0, HOR, [[0, STYLE.bg[0]], [0.6, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    // 遠景の提灯
    for (var l = 0; l < 9; l++) {
      var lx = 60 + l * 120, ly = HOR - 150 + Math.sin(t * 1.5 + l) * 8;
      game.draw.line(lx, HOR - 230, lx, ly, '#120c2b', 3);
      game.draw.circle(lx, ly + 22, 26, l % 2 ? '#ff8a5c' : '#ffd23f', 0.85);
    }
    // MODE7 床
    var scroll = (t * 0.6) % 1;
    for (var i = 0; i < 64; i++) {
      var k0 = i / 64, k1 = (i + 1) / 64;
      var y0 = HOR + (H - HOR) * Math.pow(k0, 1.7), y1 = HOR + (H - HOR) * Math.pow(k1, 1.7);
      var band = Math.floor(k0 * 12 + scroll) % 2;
      game.draw.rect(0, y0, W, y1 - y0 + 1, band ? STYLE.main[0] : STYLE.main[1]);
    }
    // 中央の目地(奥へ収束)
    for (var s = -3; s <= 3; s++) game.draw.line(W / 2 + s * 30, HOR, W / 2 + s * 330, H, '#6b4f3d', 3);
    game.draw.rect(0, 0, W, H, '#ffcf8a', 0.03 + 0.03 * Math.sin(t * 1.4));
  }

  function drawRivals() {
    var t = game.time.elapsed;
    for (var i = 0; i < 3; i++) {
      var x = W / 2 + (i - 1) * 180, y = HOR - 20 + Math.sin(t * 3 + i) * 6;
      var active = g.phase === 'wait' && g.kicker === i;
      game.draw.sprite(SHADOW_KID, { '#': '#120c2b' }, x, y - (active ? 14 : 0), 12, { anchor: 'center', alpha: active ? 0.75 : 0.4 });
    }
  }

  function drawWindow() {
    var t = game.time.elapsed;
    var y0 = depthY(WIN_C - winHalf()), y1 = depthY(WIN_C + winHalf());
    var inWin = g.phase === 'come' && Math.abs(g.d - WIN_C) <= winHalf();
    var a = inWin ? 0.75 : 0.3 + 0.12 * Math.sin(t * 5);
    game.draw.rect(W * 0.14, y0, W * 0.72, y1 - y0, inWin ? STYLE.accent[0] : '#ffffff', a);
    game.draw.rect(W * 0.14, depthY(WIN_C) - 3, W * 0.72, 6, '#ffd23f', 0.8);
  }

  function drawBall() {
    if (g.finished && g.hitStop <= 0 && g.popAt) return;
    var d = g.d, s = depthS(d);
    var x = ballX(), y = depthY(d);
    // 接地影
    game.draw.rect(x - 60 * s, y - 8 * s, 120 * s, 16 * s, '#120c2b', 0.45);
    var by = y - 56 * s - hop();
    var px = Math.max(3, 14 * s);
    var hl = g.finished && g.hitStop > 0;
    if (hl) game.draw.circle(x, by, 90 * s + 40, '#ffffff', 0.5);
    game.draw.sprite(BALL, BALL_PAL, x, by, hl ? px * 1.3 : px, { anchor: 'center' });
    // 導火線の火花
    var sp = Math.floor(g.spark) % 2;
    game.draw.line(x, by - 4 * px, x + 10 * s, by - 6 * px, '#3b2a20', Math.max(2, 4 * s));
    game.draw.circle(x + 10 * s, by - 6 * px, (sp ? 14 : 9) * s + 3, sp ? '#ffd23f' : '#ff8a3d');
  }

  function drawKid() {
    var t = game.time.elapsed;
    var k = g.kickAnim > 0;
    game.draw.sprite(k ? KID_KICK : KID, KID_PAL, W / 2, FEET + 60 + Math.sin(t * 4) * 5, 20, { anchor: 'center' });
  }

  function drawHud() {
    txt(g.kicks + ' / ' + NEEDED, W * 0.25, 80, 60, '#ffffff');
    txt('SCORE ' + g.score, W * 0.72, 80, 40, '#ffd23f');
    for (var i = 0; i < STRIKES; i++) {
      game.draw.circle(W * 0.08 + i * 56, 190, 20, i < STRIKES - g.strikes ? STYLE.accent[0] : '#120c2b', 0.9);
    }
    // 導火線(残り時間)
    var bw = W * 0.64, frac = Math.max(0, g.timeLeft / TIME_LIMIT);
    var low = g.timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(W * 0.28, 184, bw, 12, '#3b2a20');
    game.draw.rect(W * 0.28, 184, bw * frac, 12, low ? STYLE.accent[1] : '#c9a27a');
    game.draw.circle(W * 0.28 + bw * frac, 190, 14 + (Math.floor(g.spark) % 2) * 5, '#ffd23f');
  }

  function drawPop() {
    if (!g.popAt || g.hitStop > 0) return;
    var t = game.time.elapsed;
    for (var i = 0; i < 24; i++) {
      var a = i * 0.9 + t * 0.4;
      var r = 80 + (i % 5) * 50;
      game.draw.rect(g.popAt[0] + Math.cos(a) * r, g.popAt[1] + Math.sin(a) * r * 0.6 + ((t * 120 + i * 30) % 200), 18, 10, CONFETTI[i % 5]);
    }
  }

  // ── デモ ─────────────────────────────────────────────
  var demo = { t: 0, gx: W / 2, gy: FEET, press: false, balls: 0, lastPhase: '', cyc: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8;
    if (cyc < dt || demo.t <= dt) { initGame(); g.ready = 0; serve(); demo.balls = 0; demo.cyc++; }
    step(dt, true);
    if (g.phase === 'come' && demo.lastPhase !== 'come') demo.balls++;
    demo.lastPhase = g.phase;
    var skip = demo.cyc % 2 === 0 && demo.balls === 3;
    demo.press = false;
    if (g.phase === 'come' && !skip && g.d >= WIN_C - 0.01) { demo.press = true; kick(); }
    demo.gx = W / 2 + 160; demo.gy = FEET + 150;
    if (g.phase === 'come' && g.d > 0.75) demo.press = !skip;
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING; initGame(); serve();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  game.onPress(function (x, y) {
    if (state !== S.PLAYING) return;
    if (g.finished || g.ready > 0 || g.hitStop > 0) { game.audio.play('se_tap', 0.1); return; }
    kick();
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (!g) { initGame(); serve(); }
      stepDemo(dt);
      drawBg(); drawRivals(); drawWindow(); drawBall(); drawKid();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 100, '#ffd23f');
      txt('BEST ' + (game.best || 0), W / 2, H * 0.14, 44, '#ffffff');
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.955, 50, '#ffd23f');
      else txt('INSERT COIN', W / 2, H * 0.955, 42, '#ffffff');
      return;
    }

    if (state === S.RESULT) {
      drawBg(); drawRivals(); drawKid(); drawPop();
      game.draw.rect(0, H * 0.34, W, H * 0.3, '#120c2b', 0.72);
      txt(g.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 116, g.ok ? STYLE.accent[0] : STYLE.accent[1]);
      txt(g.kicks + ' / ' + NEEDED, W / 2, H * 0.47, 64, '#ffffff');
      txt('SCORE ' + g.score, W / 2, H * 0.52, 50, '#ffd23f');
      if (!g.ok && NEEDED - g.kicks <= 3) txt('あと' + (NEEDED - g.kicks) + '回!', W / 2, H * 0.58, 54, '#ff9f7a');
      else if (g.ok && g.score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.58, 58, '#ffd23f');
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.58, 46, '#ffffff');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.955, 46, '#ffffff');
      return;
    }

    if (g.done) {
      g.endWait -= dt;
      if (g.endWait <= 0) {
        state = S.RESULT;
        var stats = { kicks: g.kicks, perfect: g.perfect, misses: g.strikes };
        if (g.ok) game.end.success(g.score, stats); else game.end.failure(stats);
      }
    } else if (g.hitStop > 0) {
      g.hitStop -= dt;
      if (g.hitStop <= 0) {
        g.done = true; g.endWait = 1.2;
        game.audio.stopBgm();
        for (var c = 0; c < 5; c++) game.fx.burst(g.popAt[0], g.popAt[1], { color: CONFETTI[c], count: 12, speed: 520 });
        if (g.ok) {
          game.feedback.good(g.popAt[0], g.popAt[1], { text: 'CLEAR', color: '#ffd23f', count: 30 });
          game.audio.play('se_success', 0.6);
        } else {
          game.feedback.bad(g.popAt[0], g.popAt[1], { text: g.timeLeft <= 0 ? 'TIME UP' : 'GAME OVER', shake: 14 });
          game.audio.play('se_failure', 0.6);
        }
      }
    } else if (g.ready > 0) {
      g.ready -= dt;
      if (g.ready <= 0) game.audio.play('se_tap', 0.4);
    } else if (!g.finished) {
      step(dt, false);
    }

    drawBg(); drawRivals(); drawWindow(); drawBall(); drawKid(); drawPop(); drawHud();
    if (g.ready > 0) txt(g.ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 120, '#ffd23f');
  });

  game.onStart(function () {
    game.audio.melody([
      ['D5', 0.5], ['B4', 0.5], ['A4', 0.5], ['B4', 0.5], ['D5', 0.5], ['E5', 0.5], ['D5', 1],
      ['B4', 0.5], ['A4', 0.5], ['G4', 0.5], ['A4', 0.5], ['B4', 1], ['G4', 1],
    ], { tempo: 150, wave: 'triangle', volume: 0.05, loop: true, bass: true });
    state = S.ATTRACT;
    initGame(); serve();
    demo.t = 0;
  });
})(game);

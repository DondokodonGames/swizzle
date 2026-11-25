// J-GC4-0033-tidepool-volley-read.js
// 潮だまりバレー — ネット越しに飛んでくるボールの放物線から落下点を読み、一度のタップで走り込んで打ち返す
// 操作: 相手が打った瞬間から弧を見て、落ちてくると思う砂の位置をタップ(1球につき1回だけ)。真下なら強打、近ければつなぐ
// 終わり: 6点取ればCLEAR(つなぎ=1点、真下の強打=2点)。3球落とす/時間切れでGAME OVER
// @mechanic: trajectory
// @theme: tidepool_beach_volley
// 世界観: 夕凪の浜辺で、麦わら帽の少年が向こうのコートの影法師たちが打ち込むボールの弧を目で追い、潮風で流れる落下点を先読みして一歩目を決め、真下に入れた時だけ強打を相手の砂に叩き込む
// 残るもの: 正誤(CLEAR/GAME OVER) + 得点・強打数・落とした球数
// スタイル: 90s HANDHELD COLOR

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 低彩度・少色、小画面前提の太い形
  var STYLE = {
    bg: ['#9cc4c8', '#e8d8a8', '#5a8a9a'],
    main: ['#d8b878', '#b8985a', '#40505a'],
    accent: ['#f0e060', '#d85848'],
  };

  var GAME_TITLE = 'TIDE VOLLEY';
  var TIME_LIMIT = 20;
  var NEEDED = 6;
  var DROPS = 3;
  var FLOOR = H * 0.74;
  var CONTACT_Y = FLOOR - 190;
  var NET_X = W * 0.5, NET_TOP = FLOOR - 330;
  var GRAV = 1500;
  var RUN = 720;
  var MY_L = W * 0.05, MY_R = W * 0.46;
  var PERFECT_R = 45, GOOD_R = 100;

  var KID = [
    '.yyyyyy.',
    'yyyyyyyy',
    '..ssss..',
    '..s.s...',
    '.rrrrrr.',
    's.rrrr.s',
    '..bbbb..',
    '..s..s..',
  ];
  var KID_HIT = [
    's.yyyy.s',
    'syyyyyys',
    '..ssss..',
    '..s.s...',
    '..rrrr..',
    '..rrrr..',
    '..bbbb..',
    '.s....s.',
  ];
  var KID_PAL = { y: '#f0e060', s: '#e8b890', r: '#d85848', b: '#40505a' };
  var SHADE = ['.##.', '####', '.##.', '####', '#..#'];
  var BALL = ['.ww.', 'wbbw', 'wwbw', '.ww.'];
  var FLAG = ['###.', '####', '###.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var g = null;

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#2a3238', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function initGame() {
    g = {
      bx: W * 0.8, by: FLOOR - 300, vx: 0, vy: 0, ax: 0, phase: 'windup', phaseT: 0,
      px: W * 0.26, ptx: W * 0.26, committed: false, points: 0, spikes: 0, drops: 0, rally: 0,
      score: 0, timeLeft: TIME_LIMIT, ready: 0.8, hitStop: 0, finished: false, done: false,
      ok: false, endWait: 0, hitAnim: 0, wind: 0, server: 0, hl: null, mark: null, splash: null,
    };
  }

  function launch() {
    var n = g.rally;
    g.wind = n >= 3 ? (game.random(0, 1) < 0.5 ? -1 : 1) * game.random(200, 360) : 0;
    g.server = Math.floor(game.random(0, 2)) % 2;
    g.bx = g.server ? W * 0.84 : W * 0.66;
    g.by = FLOOR - 260;
    // 自分の立ち位置から必ず離れた所へ落とす(待っているだけでは取れない)
    var off = game.random(140, 280), lo = MY_L + 20, hi = MY_R - 20;
    var sgn = game.random(0, 1) < 0.5 ? -1 : 1;
    if (g.px + sgn * off < lo || g.px + sgn * off > hi) sgn = -sgn;
    var L = Math.max(lo, Math.min(hi, g.px + sgn * off));
    var T = Math.max(1.05, 1.55 - n * 0.05);
    g.ax = g.wind;
    g.vx = (L - g.bx - 0.5 * g.ax * T * T) / T;
    g.vy = (CONTACT_Y - g.by - 0.5 * GRAV * T * T) / T;
    g.phase = 'incoming'; g.phaseT = 0; g.committed = false; g.mark = null;
    game.audio.play('se_jump', 0.35);
  }

  function commit(x) {
    if (g.phase !== 'incoming' || g.committed) {
      game.audio.play('se_tap', 0.12);
      game.fx.burst(x, FLOOR, { color: STYLE.main[0], count: 3, speed: 80 });
      return;
    }
    g.committed = true;
    g.ptx = Math.max(MY_L, Math.min(MY_R, x));
    g.mark = g.ptx;
    game.audio.play('se_tap', 0.3);
    game.fx.burst(g.ptx, FLOOR, { color: STYLE.main[0], count: 6, speed: 160 });
  }

  function contact(isDemo) {
    var off = Math.abs(g.bx - g.px);
    if (off <= GOOD_R) {
      g.hitAnim = 0.25;
      g.rally++;
      if (off <= PERFECT_R) {
        g.points += 2; g.spikes++; g.score += 250;
        g.phase = 'spike'; g.phaseT = 0;
        g.by = CONTACT_Y - 200; g.vx = (W * 0.8 - g.bx) / 0.66; g.vy = 100; g.ax = 0;
        game.feedback.good(g.bx, g.by - 60, { text: 'PERFECT', color: STYLE.accent[0], count: 18, sound: 'se_powerup' });
      } else {
        g.points += 1; g.score += 100;
        g.phase = 'lob'; g.phaseT = 0;
        g.vx = (W * 0.76 - g.bx) / 1.2; g.vy = -1100; g.ax = 0;
        game.feedback.good(g.bx, g.by - 60, { text: 'GOOD', color: '#ffffff', count: 10 });
      }
      if (!isDemo && g.points >= 3 && g.points - (off <= PERFECT_R ? 2 : 1) < 3) {
        game.fx.popup(g.points + ' / ' + NEEDED, W / 2, H * 0.3, { color: STYLE.accent[0], size: 72 });
        game.audio.play('se_milestone', 0.5);
      }
      return true;
    }
    return false;
  }

  function endRound(ok, hl) {
    if (g.finished) return;
    g.finished = true; g.ok = ok; g.hitStop = 0.5; g.hl = hl;
    game.fx.flash('#ffffff', 0.15);
    if (ok) g.score += Math.round(g.timeLeft * 50);
    game.audio.play(ok ? 'se_coin' : 'se_bad', 0.5);
  }

  function step(dt, isDemo) {
    g.phaseT += dt;
    if (g.hitAnim > 0) g.hitAnim -= dt;
    if (g.splash) { g.splash.t -= dt; if (g.splash.t <= 0) g.splash = null; }
    var d = g.ptx - g.px, mv = RUN * dt;
    g.px += Math.max(-mv, Math.min(mv, d));
    if (g.phase === 'windup') {
      if (g.phaseT >= 0.55) launch();
    } else if (g.phase === 'incoming') {
      var prevY = g.by;
      g.vx += g.ax * dt; g.vy += GRAV * dt;
      g.bx += g.vx * dt; g.by += g.vy * dt;
      if (prevY < CONTACT_Y && g.by >= CONTACT_Y && g.vy > 0) {
        if (contact(isDemo)) return;
      }
      if (g.by >= FLOOR - 24) {
        g.by = FLOOR - 24;
        g.splash = { x: g.bx, t: 0.5 };
        if (!isDemo) g.drops++;
        if (g.drops >= DROPS) { endRound(false, [g.bx, g.by]); return; }
        game.feedback.bad(g.bx, g.by - 40, { text: 'MISS', shake: 10, sound: 'se_break' });
        g.phase = 'windup'; g.phaseT = -0.4;
      }
    } else if (g.phase === 'lob' || g.phase === 'spike') {
      g.vy += GRAV * dt;
      g.bx += g.vx * dt; g.by += g.vy * dt;
      if (g.by >= FLOOR - 24 || g.bx > W + 40) {
        if (g.phase === 'spike') { g.splash = { x: Math.min(W - 40, g.bx), t: 0.5 }; game.audio.play('se_break', 0.3); }
        if (!isDemo && g.points >= NEEDED) { endRound(true, [Math.min(W - 60, g.bx), FLOOR - 40]); return; }
        var wasSpike = g.phase === 'spike';
        g.phase = 'windup'; g.phaseT = wasSpike ? -0.3 : 0;
      }
    }
    if (!isDemo) {
      g.timeLeft -= dt;
      if (g.timeLeft <= 0 && !g.finished) { g.timeLeft = 0; endRound(false, [g.bx, g.by]); }
    }
  }

  // ── 描画 ─────────────────────────────────────────────
  function drawBg() {
    var t = game.time.elapsed;
    game.draw.gradient(0, FLOOR, [[0, STYLE.bg[0]], [0.7, '#c8dcd0'], [1, STYLE.bg[2]]]);
    // 海と波
    game.draw.rect(0, FLOOR - 120, W, 120, STYLE.bg[2]);
    for (var w = 0; w < 7; w++) game.draw.rect((w * 180 + t * 50) % (W + 160) - 80, FLOOR - 100 + (w % 3) * 26, 100, 10, '#c8dcd0', 0.8);
    game.draw.circle(W * 0.82, H * 0.2, 80 + Math.sin(t) * 4, STYLE.accent[0], 0.8);
    // 砂浜
    game.draw.rect(0, FLOOR, W, H - FLOOR, STYLE.main[0]);
    for (var s = 0; s < 30; s++) game.draw.rect((s * 173) % W, FLOOR + 30 + (s * 97) % (H - FLOOR - 60), 12, 6, STYLE.main[1]);
    // 自陣ライン(親指ゾーン)
    game.draw.rect(MY_L, FLOOR + 14, MY_R - MY_L, 8, '#ffffff', 0.7);
    game.draw.rect(0, 0, W, H, '#fff8d8', 0.03 + 0.03 * Math.sin(t * 1.3));
  }

  function drawCourt() {
    var t = game.time.elapsed;
    // ネット
    game.draw.rect(NET_X - 6, NET_TOP, 12, FLOOR - NET_TOP, STYLE.main[2]);
    for (var n = 0; n < 6; n++) game.draw.line(NET_X - 50, NET_TOP + 20 + n * 22, NET_X + 50, NET_TOP + 20 + n * 22, '#ffffff', 3);
    game.draw.rect(NET_X - 54, NET_TOP, 108, 12, '#ffffff');
    // 風の旗
    if (g.wind !== 0) {
      var fl = Math.sin(t * 12) * 3;
      game.draw.sprite(FLAG, { '#': STYLE.accent[1] }, NET_X + (g.wind < 0 ? -40 : 40), NET_TOP - 30 + fl, 14, { anchor: 'center', flipX: g.wind < 0 });
    }
    game.draw.rect(NET_X - 4, NET_TOP - 60, 8, 60, STYLE.main[2]);
    // 相手(影法師2人)
    for (var i = 0; i < 2; i++) {
      var sx = i ? W * 0.84 : W * 0.66;
      var jump = g.phase === 'windup' && g.server === i && g.phaseT > 0.2 ? 50 : 0;
      game.draw.sprite(SHADE, { '#': '#2a3238' }, sx, FLOOR - 70 - jump + Math.sin(t * 3 + i) * 5, 22, { anchor: 'center', alpha: 0.45 });
    }
    // 予約マーク
    if (g.mark !== null) {
      game.draw.rect(g.mark - 50, FLOOR + 4, 100, 10, STYLE.accent[0]);
      game.draw.rect(g.mark - 4, FLOOR - 20, 8, 30, STYLE.accent[0]);
    }
    // 自分
    var hit = g.hitAnim > 0;
    game.draw.rect(g.px - 60, FLOOR - 6, 120, 12, '#2a3238', 0.35);
    game.draw.sprite(hit ? KID_HIT : KID, KID_PAL, g.px, FLOOR - 90 + Math.sin(t * 5) * 3, 20, { anchor: 'center' });
    // ボールと影
    if (!(g.phase === 'windup' && g.phaseT < 0)) {
      game.draw.rect(g.bx - 34, FLOOR - 6, 68, 10, '#2a3238', 0.3);
      var hl = g.finished && g.hitStop > 0;
      if (hl) game.draw.circle(g.bx, g.by, 80 + (0.5 - g.hitStop) * 120, '#ffffff', 0.5);
      game.draw.sprite(BALL, { w: '#ffffff', b: STYLE.accent[1] }, g.bx, g.by, hl ? 18 : 13, { anchor: 'center' });
    }
    if (g.splash) for (var p = 0; p < 5; p++) game.draw.rect(g.splash.x - 60 + p * 26, FLOOR - 20 - (0.5 - g.splash.t) * 120 * (p % 2 + 1), 14, 14, STYLE.main[1]);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, STYLE.main[2], 0.85);
    txt(g.points + ' / ' + NEEDED, W * 0.25, 80, 62, STYLE.accent[0]);
    txt('SCORE ' + g.score, W * 0.72, 80, 40, '#ffffff');
    for (var i = 0; i < DROPS; i++) game.draw.circle(W * 0.08 + i * 56, 186, 18, i < DROPS - g.drops ? '#ffffff' : '#2a3238');
    var bw = W * 0.64, low = g.timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(W * 0.3, 176, bw, 20, '#2a3238');
    game.draw.rect(W * 0.3, 176, bw * Math.max(0, g.timeLeft / TIME_LIMIT), 20, low ? STYLE.accent[1] : STYLE.accent[0]);
  }

  // ── デモ ─────────────────────────────────────────────
  var demo = { t: 0, gx: W * 0.3, gy: H * 0.85, press: false, cyc: 0, balls: 0 };
  function predictLanding() {
    // 実際の物理で落下点を先読み
    var x = g.bx, y = g.by, vx = g.vx, vy = g.vy, st = 1 / 60;
    for (var k = 0; k < 240; k++) {
      vx += g.ax * st; vy += GRAV * st; x += vx * st; y += vy * st;
      if (y >= CONTACT_Y && vy > 0) return x;
    }
    return x;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 9;
    if (cyc < dt || demo.t <= dt) { initGame(); g.ready = 0; demo.cyc++; demo.balls = 0; }
    step(dt, true);
    demo.press = false;
    if (g.phase === 'incoming' && !g.committed && g.phaseT > 0.3) {
      demo.balls++;
      var L = predictLanding();
      if (demo.cyc % 2 === 0 && demo.balls === 2) L = L < W * 0.26 ? L + 230 : L - 230;
      demo.gx = Math.max(MY_L, Math.min(MY_R, L));
      commit(demo.gx);
      demo.press = true;
    }
    if (g.committed && g.phase === 'incoming' && g.phaseT < 0.6) demo.press = true;
    demo.gy = FLOOR + 160;
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING; initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (g.finished || g.ready > 0 || g.hitStop > 0) { game.audio.play('se_tap', 0.1); return; }
    commit(x);
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (!g) initGame();
      stepDemo(dt);
      drawBg(); drawCourt();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 92, STYLE.accent[0]);
      txt('BEST ' + (game.best || 0), W / 2, H * 0.14, 44, '#ffffff');
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.955, 50, STYLE.accent[1]);
      else txt('INSERT COIN', W / 2, H * 0.955, 42, STYLE.main[2]);
      return;
    }

    if (state === S.RESULT) {
      drawBg(); drawCourt();
      game.draw.rect(0, H * 0.2, W, H * 0.3, STYLE.main[2], 0.85);
      txt(g.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.26, 110, g.ok ? STYLE.accent[0] : STYLE.accent[1]);
      txt(g.points + ' / ' + NEEDED, W / 2, H * 0.33, 64, '#ffffff');
      txt('SCORE ' + g.score, W / 2, H * 0.39, 48, STYLE.accent[0]);
      if (!g.ok) txt('あと' + Math.max(1, NEEDED - g.points) + '点!', W / 2, H * 0.45, 54, '#f8b8a8');
      else if (g.score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.45, 56, STYLE.accent[0]);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.45, 46, '#ffffff');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.955, 46, STYLE.main[2]);
      return;
    }

    if (g.done) {
      g.endWait -= dt;
      if (g.endWait <= 0) {
        state = S.RESULT;
        var stats = { points: g.points, spikes: g.spikes, drops: g.drops };
        if (g.ok) game.end.success(g.score, stats); else game.end.failure(stats);
      }
    } else if (g.hitStop > 0) {
      g.hitStop -= dt;
      if (g.hitStop <= 0) {
        g.done = true; g.endWait = 1.1;
        game.audio.stopBgm();
        if (g.ok) {
          game.feedback.good(g.hl[0], g.hl[1] - 60, { text: 'CLEAR', color: STYLE.accent[0], count: 40 });
          game.audio.play('se_success', 0.6);
        } else {
          game.feedback.bad(g.hl[0], g.hl[1] - 60, { text: g.timeLeft <= 0 ? 'TIME UP' : 'GAME OVER', shake: 14 });
          game.audio.play('se_failure', 0.6);
        }
      }
    } else if (g.ready > 0) {
      g.ready -= dt;
      if (g.ready <= 0) game.audio.play('se_tap', 0.4);
    } else if (!g.finished) {
      step(dt, false);
    }

    drawBg(); drawCourt(); drawHud();
    if (g.ready > 0) txt(g.ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 120, STYLE.accent[0]);
  });

  game.onStart(function () {
    game.audio.melody([
      ['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['B4', 0.5], ['C5', 0.5], ['A4', 0.5], ['G4', 1],
      ['E4', 0.5], ['G4', 0.5], ['A4', 0.5], ['B4', 0.5], ['G4', 1.5],
    ], { tempo: 132, wave: 'square', volume: 0.045, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);

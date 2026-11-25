// J-GC4-0011-stilt-festival-sprint.js
// スティルトスプリント — 竹馬を左右交互に踏み込んでゴール前の直線を駆け抜け、写真判定で鼻先ひとつ前に出る
// 操作: 画面の左半分と右半分を交互にタップして竹馬を踏み込む。同じ側を続けて踏むとよろけて失速する
// 終わり: 並走する影より先にゴール線を越えればCLEAR(写真判定)。先を越される/時間切れでGAME OVER
// @mechanic: alternate_tap
// @theme: stilt_festival_sprint
// 世界観: 山村の竹馬祭りの最終直線、見習いの竹馬乗りが左右の竹馬を交互に踏み込んで加速し、同着寸前の写真判定で並走の影に鼻先ひとつ勝つ
// 残るもの: 正誤(CLEAR/GAME OVER) + 写真判定の差(秒)・最高速・よろけ回数のスコア
// スタイル: 90s BIG SPRITE

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 巨大キャラ、床影、間合いで見せる
  var STYLE = {
    bg: ['#1e2a5a', '#e0724a', '#f7c35f'],
    main: ['#f25f3a', '#fff3d6', '#1b1b2f'],
    accent: ['#3ec1d3', '#ffd400'],
  };

  var GAME_TITLE = 'STILT SPRINT';
  var TIME_LIMIT = 14;
  var GOAL = 100;
  var DEMO_GOAL = 32;
  var PX_PER_M = 44;
  var RUN_X = W * 0.42;
  var GROUND_Y = H * 0.66;
  var MAX_V = 13;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var RIDER = [
    '...hhhh...',
    '..hhhhhh..',
    '..ffffff..',
    '..fkffkf..',
    '..ffffff..',
    '...fmmf...',
    '.jjjjjjjj.',
    'jjjjjjjjjj',
    'f.jjjjjj.f',
    'f.jjjjjj.f',
    '..pppppp..',
    '..pp..pp..',
  ];
  var RIDER_PAL = { h: '#1b1b2f', f: '#f4c79a', k: '#1b1b2f', m: '#c0392b', j: '#f25f3a', p: '#2d3a8c' };
  var FLAGS = ['r.y.b.', 'rryybb', '.r.y.b'];
  var CAMERA = ['.kkk....', 'kkkkkkkk', 'kwwkkbbk', 'kwwkkbbk', 'kkkkkkkk'];

  var d, v, lastFoot, streak, fever, stumble, stumbles, topV, rd, rv, t, goal, timeLeft, ready, freeze, ended, endWait, won, score, margin, photo, stepAnim, lastMile, taps;

  function initGame(g) {
    goal = g || GOAL;
    d = 0;
    v = 0;
    lastFoot = 0;
    streak = 0;
    fever = false;
    stumble = 0;
    stumbles = 0;
    topV = 0;
    rd = 0;
    rv = 0;
    t = 0;
    timeLeft = TIME_LIMIT;
    ready = 0.8;
    freeze = null;
    ended = false;
    endWait = 0;
    won = false;
    score = 0;
    margin = 0;
    photo = null;
    stepAnim = 0;
    lastMile = 0;
    taps = 0;
  }

  function txt(s, x, y, size, color) {
    game.draw.text(s, x + 4, y + 5, { size: size, color: STYLE.main[2], bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function endGame(ok) {
    if (ended) return;
    ended = true;
    won = ok;
    endWait = 1.6;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.6);
  }

  // 踏み込み(プレイヤー/デモ共用)。foot: -1=左, 1=右
  function stepFoot(foot, demo) {
    if (ended || freeze || photo) return;
    taps++;
    if (stumble > 0) { if (!demo) game.audio.play('se_tap', 0.1); return; }
    if (foot === lastFoot) {
      stumble = 0.35;
      stumbles++;
      streak = 0;
      fever = false;
      v *= 0.45;
      game.feedback.bad(RUN_X, GROUND_Y - 420, { text: 'MISS', shake: 6, volume: demo ? 0 : 0.35 });
      lastFoot = 0;
      return;
    }
    lastFoot = foot;
    streak++;
    stepAnim = foot;
    v = Math.min(MAX_V, v + (fever ? 1.25 : 1.0));
    topV = Math.max(topV, v);
    if (!demo) game.audio.tone(foot < 0 ? 'C5' : 'G5', 0.05, { wave: 'square', volume: 0.06 });
    game.fx.burst(RUN_X + foot * 90, GROUND_Y, { color: '#e8c89a', count: 3, speed: 150 });
    if (streak === 12 && !fever) {
      fever = true;
      if (!demo) {
        game.fx.popup('FEVER', RUN_X, GROUND_Y - 500, { color: STYLE.accent[1], size: 70 });
        game.audio.play('se_powerup', 0.45);
      }
    }
  }

  function rivalTarget(time) {
    // 並走の影:序盤に加速し、70m付近で一段ギアを上げる
    var base = Math.min(8.9, 3.2 + time * 2.6);
    return rd > goal * 0.7 ? base + 0.6 : base;
  }

  function stepWorld(dt, demo) {
    if (freeze) {
      freeze.t -= dt;
      if (freeze.t <= 0) { var fd = freeze.done; freeze = null; fd(); }
      return;
    }
    if (photo) {
      photo.t -= dt;
      if (photo.t <= 0) { var pd = photo.done; photo = null; pd(); }
      return;
    }
    if (ended) return;
    t += dt;
    if (stumble > 0) stumble -= dt;
    v *= Math.pow(0.55, dt);
    rv += (rivalTarget(t) - rv) * Math.min(1, dt * 3);
    var pd0 = d, rd0 = rd;
    d += v * dt;
    rd += rv * dt;
    if (!demo && d >= goal * 0.5 && lastMile === 0) {
      lastMile = 1;
      game.fx.popup(Math.round(goal * 0.5) + 'm', RUN_X, GROUND_Y - 520, { color: STYLE.accent[0], size: 70 });
      game.audio.play('se_milestone', 0.5);
    }
    var pCross = d >= goal, rCross = rd >= goal;
    if (pCross || rCross) {
      var tp = pCross ? (goal - pd0) / Math.max(0.001, d - pd0) : 2;
      var tr = rCross ? (goal - rd0) / Math.max(0.001, rd - rd0) : 2;
      var win = tp <= tr;
      if (win) margin = rCross ? (tr - tp) * dt : (goal - rd) / Math.max(1, rv);
      else margin = pCross ? (tp - tr) * dt : (goal - d) / Math.max(1, v);
      margin = Math.max(0.01, margin);
      // 写真判定:ゴールの瞬間を切り取って見せる
      photo = { t: 0.9, win: win, pd: pCross ? goal : d, rd: rCross ? goal : rd, done: function () {
        if (win) {
          score += Math.round(margin * 1000) + Math.round(topV * 30) + Math.round(timeLeft * 30);
          game.feedback.good(RUN_X, GROUND_Y - 420, { text: margin < 0.1 ? 'NICE' : 'PERFECT', color: STYLE.accent[1], count: 30, volume: demo ? 0 : undefined });
          if (!demo) endGame(true);
        } else {
          game.feedback.bad(RUN_X, GROUND_Y - 420, { text: 'MISS' });
          if (!demo) endGame(false);
        }
        if (demo) demoOver = true;
      } };
      if (!demo) { game.fx.flash('#ffffff', 0.25); game.audio.play('se_break', 0.4); }
      d = photo.pd;
      rd = photo.rd;
    }
  }

  var demoOver = false;

  // ── 描画 ────────────────────────────────────────────────
  function drawBg() {
    var tt = game.time.elapsed;
    game.draw.gradient(0, GROUND_Y, [[0, STYLE.bg[0]], [0.6, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    // 遠くの山並みと祭りの櫓(ゆっくり流れる)
    for (var m = 0; m < 5; m++) {
      var mx = ((m * 300 - d * 4) % 1500 + 1500) % 1500 - 200;
      game.draw.circle(mx, GROUND_Y + 40, 260, '#3b2c5a', 0.8);
    }
    // 旗の列(速く流れる)
    game.draw.line(0, H * 0.3, W, H * 0.34, STYLE.main[2], 4);
    for (var f = 0; f < 9; f++) {
      var fx = ((f * 140 - d * 22) % 1260 + 1260) % 1260 - 90;
      game.draw.sprite(FLAGS, { r: STYLE.main[0], y: STYLE.accent[1], b: STYLE.accent[0] }, fx, H * 0.32 + Math.sin(tt * 4 + f) * 6, 10, { anchor: 'center' });
    }
    // 観客の影
    for (var c = 0; c < 12; c++) {
      var cx = ((c * 100 - d * 30) % 1200 + 1200) % 1200 - 60;
      var bob = Math.abs(Math.sin(tt * 6 + c)) * 14;
      game.draw.circle(cx, GROUND_Y - 150 - bob, 30, '#2a2140', 0.9);
      game.draw.rect(cx - 36, GROUND_Y - 124 - bob, 72, 90, '#2a2140', 0.9);
    }
    // 地面(スピード線)
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, '#c9a26b');
    for (var s = 0; s < 10; s++) {
      var sx = ((s * 160 - d * PX_PER_M) % 1600 + 1600) % 1600 - 160;
      game.draw.rect(sx, GROUND_Y + 40 + (s % 3) * 60, 90, 8, '#a8844f');
    }
    game.draw.rect(0, 0, W, H, STYLE.accent[1], 0.03 + 0.02 * Math.sin(tt * 2.4));
  }

  function drawRider(x, dist, alpha, lead) {
    var tt = game.time.elapsed;
    var ph = stepAnim;
    var legA = lead ? ph * 0.35 : Math.sin(tt * 10) * 0.35;
    if (stumble > 0 && lead) legA = Math.sin(tt * 50) * 0.5;
    var hipY = GROUND_Y - 300;
    // 床影
    game.draw.circle(x, GROUND_Y + 10, 110, '#000000', 0.22 * alpha);
    // 竹馬(2本の竿)
    var f1x = x + Math.sin(legA) * 180, f2x = x - Math.sin(legA) * 180;
    game.draw.line(x - 30, hipY - 120, f1x, GROUND_Y, lead ? '#7a4a1e' : '#2a2140', 20);
    game.draw.line(x + 30, hipY - 120, f2x, GROUND_Y, lead ? '#9b6a33' : '#2a2140', 20);
    var bob = lead ? Math.abs(Math.sin(d * 1.6)) * -24 : 0;
    if (lead) game.draw.sprite(RIDER, RIDER_PAL, x, hipY - 260 + bob, 22, { anchor: 'center', alpha: alpha });
    else game.draw.sprite(RIDER, { h: '#2a2140', f: '#2a2140', k: '#2a2140', m: '#2a2140', j: '#2a2140', p: '#2a2140' }, x, hipY - 240 + Math.sin(tt * 10) * 10, 18, { anchor: 'center', alpha: alpha });
  }

  function drawTrack() {
    // ゴール線(近づくと画面に入る)
    var gx = RUN_X + (goal - d) * PX_PER_M;
    if (gx < W + 60) {
      for (var k = 0; k < 12; k++) game.draw.rect(gx - 12, GROUND_Y - 700 + k * 60, 24, 30, k % 2 ? STYLE.main[1] : STYLE.main[2]);
      game.draw.rect(gx - 12, GROUND_Y, 24, H - GROUND_Y, STYLE.main[1]);
      game.draw.sprite(CAMERA, { k: STYLE.main[2], w: STYLE.main[1], b: STYLE.accent[0] }, gx + 80, GROUND_Y - 760, 12, { anchor: 'center' });
    }
    // 影の走者(演出だけの相手)
    var rx = RUN_X + (rd - d) * PX_PER_M;
    if (rx > -200 && rx < W + 200) drawRider(rx, rd, 0.5, false);
    drawRider(RUN_X, d, 1, true);
    if (photo) {
      // 写真の枠
      var a = Math.min(1, (0.9 - photo.t) * 4);
      game.draw.rect(40, H * 0.2, W - 80, 10, STYLE.main[1], a);
      game.draw.rect(40, GROUND_Y + 90, W - 80, 10, STYLE.main[1], a);
      game.draw.rect(40, H * 0.2, 10, GROUND_Y + 100 - H * 0.2, STYLE.main[1], a);
      game.draw.rect(W - 50, H * 0.2, 10, GROUND_Y + 100 - H * 0.2, STYLE.main[1], a);
      game.draw.circle(photo.win ? RUN_X : rx, GROUND_Y - 560, 90, photo.win ? STYLE.accent[1] : '#ff3b3b', 0.35 * a);
      txt(margin.toFixed(2), W * 0.5, H * 0.24, 60, photo.win ? STYLE.accent[1] : '#ff6b6b');
    }
    if (freeze) {
      var fa = 0.5 + 0.5 * Math.sin(freeze.t * 40);
      game.draw.circle(RUN_X, GROUND_Y - 400, 200 + (0.4 - freeze.t) * 260, '#ffffff', 0.3 * fa);
    }
  }

  function drawPads(active) {
    for (var s = 0; s < 2; s++) {
      var foot = s === 0 ? -1 : 1;
      var bx = s === 0 ? W * 0.25 : W * 0.75;
      var hot = lastFoot !== foot && active;
      game.draw.circle(bx, H * 0.87, 150, STYLE.main[2], 0.45);
      game.draw.circle(bx, H * 0.87, stepAnim === foot && lastFoot === foot ? 118 : 132, hot ? STYLE.accent[0] : STYLE.main[1], hot ? 0.95 : 0.4);
      // 足あとの印
      game.draw.rect(bx - 26, H * 0.87 - 50, 52, 80, STYLE.main[2], 0.7);
      game.draw.circle(bx, H * 0.87 - 60, 26, STYLE.main[2], 0.7);
    }
  }

  function drawHud() {
    var pr = Math.min(1, d / goal), rp = Math.min(1, rd / goal);
    var bw = W - 160;
    game.draw.rect(80, H * 0.05, bw, 24, STYLE.main[2], 0.6);
    game.draw.rect(80, H * 0.05, bw * pr, 24, STYLE.main[0]);
    game.draw.rect(80 + bw * rp - 5, H * 0.05 - 10, 10, 44, '#2a2140');
    txt(Math.max(0, Math.ceil(goal - d)) + 'm', W * 0.2, H * 0.1, 56, STYLE.main[1]);
    txt(Math.round(v * 3.6) + '', W * 0.5, H * 0.1, 56, fever ? STYLE.accent[1] : STYLE.main[1]);
    txt('SCORE ' + score, W * 0.8, H * 0.1, 34, STYLE.main[1]);
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, H * 0.128, bw * Math.max(0, timeLeft / TIME_LIMIT), 10, low ? '#ff3b3b' : STYLE.accent[0]);
  }

  function drawOutcome() {
    game.draw.rect(0, H * 0.34, W, H * 0.24, STYLE.main[2], 0.78);
    txt(won ? 'CLEAR' : 'GAME OVER', W * 0.5, H * 0.4, 96, won ? STYLE.accent[1] : STYLE.main[0]);
    txt('SCORE ' + score, W * 0.5, H * 0.47, 50, STYLE.main[1]);
    if (!won && margin > 0) txt('あと' + margin.toFixed(2) + '秒!', W * 0.5, H * 0.53, 48, STYLE.accent[1]);
    else if (!won) txt('あと' + Math.ceil(goal - d) + 'm!', W * 0.5, H * 0.53, 48, STYLE.accent[1]);
    else if (score > game.best) txt('NEW RECORD', W * 0.5, H * 0.53, 48, STYLE.accent[1]);
    else txt('BEST ' + game.best, W * 0.5, H * 0.53, 44, STYLE.main[1]);
  }

  // ── ATTRACT ゴースト実演(同じstepFootで走る) ─────────────
  var demo = { t: 0, next: 0, foot: -1, press: 0, cycle: 0, stumbled: false };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt || demoOver || d === undefined) {
      if (demoOver) demo.cycle++;
      demoOver = false;
      initGame(DEMO_GOAL);
      ready = 0;
      demo.stumbled = false;
      demo.foot = -1;
    }
    demo.press = Math.max(0, demo.press - dt);
    demo.next -= dt;
    if (demo.next <= 0 && !photo) {
      // 1周おきに、走り出して少ししたら同じ足を続けて踏み、よろけて競り負ける失敗例を見せる
      var f = demo.foot;
      if (!demo.stumbled && d > 9 && demo.cycle % 2 === 1) { demo.stumbled = true; f = -demo.foot; }
      stepFoot(f, true);
      demo.foot = -f;
      demo.press = 0.08;
      demo.next = demo.cycle % 2 === 0 ? 0.13 : 0.19;
    }
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING;
      initGame(GOAL);
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(DEMO_GOAL); demo.t = 0; return; }
    if (ready > 0 || ended) return;
    if (photo || freeze) { game.audio.play('se_tap', 0.08); return; }
    stepFoot(x < W / 2 ? -1 : 1, false);
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      stepWorld(dt, true);
      drawBg();
      drawTrack();
      drawPads(true);
      var hx = (-demo.foot) < 0 ? W * 0.25 : W * 0.75;
      game.draw.hand(hx, H * 0.87, { press: demo.press > 0, scale: 14 });
      txt(GAME_TITLE, W * 0.5, H * 0.07, 90, STYLE.accent[1]);
      txt('HI-SCORE ' + game.best, W * 0.5, H * 0.125, 40, STYLE.main[1]);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W * 0.5, H * 0.76, 50, STYLE.accent[1]);
      else txt('INSERT COIN', W * 0.5, H * 0.76, 42, STYLE.main[1]);
      return;
    }
    if (state === S.RESULT) {
      drawBg();
      drawTrack();
      drawOutcome();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W * 0.5, H * 0.76, 40, STYLE.main[1]);
      return;
    }
    if (ended) {
      endWait -= dt;
      drawBg();
      drawTrack();
      drawPads(false);
      drawHud();
      drawOutcome();
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { margin: Math.round(margin * 100), topSpeed: Math.round(topV * 3.6), stumbles: stumbles, taps: taps };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
      return;
    }
    if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.35);
    } else {
      if (!freeze && !photo) {
        timeLeft -= dt;
        if (timeLeft <= 0) {
          timeLeft = 0;
          freeze = { t: 0.4, done: function () {
            game.feedback.bad(RUN_X, GROUND_Y - 420, { text: 'TIME UP' });
            endGame(false);
          } };
        }
      }
      stepWorld(dt, false);
    }
    drawBg();
    drawTrack();
    drawPads(true);
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W * 0.5, H * 0.45, 120, STYLE.accent[1]);
  });

  game.onStart(function () {
    game.audio.melody(
      [['E5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 1]],
      { tempo: 184, wave: 'square', volume: 0.045, loop: true, bass: [['C3', 1], ['G2', 1], ['C3', 1], ['G2', 1], ['A2', 1], ['E2', 1], ['G2', 2]] }
    );
    state = S.ATTRACT;
    initGame(DEMO_GOAL);
  });
})(game);

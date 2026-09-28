// J-GC4-0018-alley-popper-count.js
// 路地裏くす玉まわし — 回ってきた紙吹雪玉の導火線の刻みを数え、はじける直前の刻みで隣の隠れ場所へ放る
// 操作: 玉が届くと最初に刻みの数だけ灯りが点いて消える。刻み音を数え、最後の1つ手前でタップして放る
// 終わり: 4個さばけばCLEAR。手元ではじける/早すぎて3回投げ返される/時間切れでGAME OVER
// @mechanic: counting
// @theme: festival_alley_popper_pass
// 世界観: 夏祭りの夜の路地裏かくれんぼで、樽の陰に隠れた子が、回ってくる紙吹雪入りのくす玉の刻みを数え、はじける寸前で次の隠れ場所へ放って紙吹雪まみれを逃れる
// 残るもの: 正誤(CLEAR/GAME OVER) + さばいた数・ぎりぎりPERFECT数のスコア
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 濃紺グラデ+発光4色、点滅が命
  var STYLE = { bg: ['#07061a', '#1a0f3d', '#2d1560'], main: ['#ff3fb4', '#3ff0ff'], accent: ['#fff23f', '#7dff5a'] };
  var C = {
    bg0: '#07061a', bg1: '#1a0f3d', bg2: '#2d1560', pink: '#ff3fb4', cyan: '#3ff0ff', yellow: '#fff23f',
    green: '#7dff5a', red: '#ff4a4a', ink: '#f4f0ff', barrel: '#5a2d80', barrelHi: '#8a4ac0'
  };

  var GAME_TITLE = 'POPPER PASS';
  var TIME_LIMIT = 15;
  var NEEDED = 4;
  var LIVES = 3;
  var BALL_X = W / 2;
  var BALL_Y = Math.round(H * 0.5);
  var ME_Y = Math.round(H * 0.64);
  var THROW_Y = Math.round(H * 0.86);
  var HUD_Y = Math.round(H * 0.06);

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var KID = [
    ['...hhhh...', '..hhhhhh..', '..hsksks..', '..ssssss..', '...smms...', '..cccccc..', '.cccccccc.', 'ss.cccc.ss'],
    ['...hhhh...', '..hhhhhh..', '..hskssk..', '..ssssss..', '...s..s...', '..cccccc..', '.cccccccc.', 's..cccc..s']
  ];
  var KID_PAL = { h: '#3ff0ff', s: '#ffd0b0', k: '#07061a', m: '#ff3fb4', c: '#7dff5a' };
  var MESSY_PAL = { h: '#ff3fb4', s: '#fff23f', k: '#07061a', m: '#3ff0ff', c: '#ff3fb4' };
  var BALL = ['..ffff..', '.pppppp.', 'ppyppypp', 'pppppppp', 'ppyppypp', 'pppppppp', '.pppppp.', '..pppp..'];
  var BALL_PAL = { f: '#fff23f', p: '#ff3fb4', y: '#fff23f' };
  var PEEK = ['.hh.', 'hhhh', 'kkkk', 'kkkk'];

  var round, passed, perfects, timeLeft, ball, confetti, flashT, early;
  var ready, hitStop, finished, done, endWait, ok, milestone, messy;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: color, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: C.ink, bold: true, align: align || 'center' });
  }

  function newBall() {
    var n = 3 + Math.min(3, round) + (Math.random() < 0.3 ? 1 : 0);
    ball = {
      n: n, ticks: 0, phase: 'enter', t: 0.35, next: 0, x: -80, y: BALL_Y,
      fromX: -80, toX: BALL_X, hot: 0, gap: Math.max(0.34, 0.46 - round * 0.03)
    };
  }

  function initGame() {
    round = 0; passed = 0; perfects = 0; timeLeft = TIME_LIMIT; confetti = []; flashT = 0; early = 0;
    ready = 0.8; hitStop = 0; finished = false; done = false; endWait = 0; ok = false; milestone = false; messy = false;
    newBall();
  }

  function nextGap() {
    // 変拍子: 刻みの間隔が毎回少し揺れる
    return ball.gap * game.random(0.75, 1.3);
  }

  function popConfetti(x, y, n) {
    var cols = [C.pink, C.cyan, C.yellow, C.green];
    for (var i = 0; i < n; i++) {
      confetti.push({ x: x, y: y, vx: game.random(-520, 520), vy: game.random(-900, -200), c: cols[i % 4], t: 1.4, s: game.random(10, 22) });
    }
  }

  // 実ロジック: 放る
  function throwBall(isDemo) {
    if (!ball || ball.phase !== 'tick') return false;
    var left = ball.n - ball.ticks; // 残りの刻み(0で破裂)
    if (left === 1 || left === 2) {
      var perfect = left === 1;
      if (perfect) perfects++;
      passed++;
      ball.phase = 'thrown'; ball.t = 0.4; ball.fromX = ball.x; ball.toX = Math.random() < 0.5 ? -120 : W + 120;
      game.audio.play('se_jump', 0.4);
      game.feedback.good(BALL_X, BALL_Y - 160, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.yellow : C.green, count: 14 });
      if (!isDemo && passed === 2 && !milestone) {
        milestone = true;
        game.audio.play('se_milestone', 0.45);
        game.fx.popup(passed + ' / ' + NEEDED, W / 2, H * 0.3, { color: C.cyan, size: 64 });
      }
    } else {
      // 早すぎ: 隣から投げ返される(導火線は進んだまま)
      ball.phase = 'bounce'; ball.t = 0.35; ball.fromX = ball.x; ball.toX = BALL_X;
      early++;
      game.feedback.bad(BALL_X, BALL_Y - 160, { text: 'MISS', color: C.red, shake: 4 });
      if (!isDemo && early >= LIVES) loseGame();
    }
    return true;
  }

  function stepWorld(dt, isDemo) {
    if (flashT > 0) flashT -= dt;
    for (var i = confetti.length - 1; i >= 0; i--) {
      var c = confetti[i];
      c.vy += 1200 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.vx *= Math.pow(0.5, dt); c.t -= dt;
      if (c.t <= 0) confetti.splice(i, 1);
    }
    if (!ball) return;
    var b = ball;
    b.t -= dt;
    if (b.phase === 'enter') {
      b.x = b.fromX + (b.toX - b.fromX) * (1 - Math.max(0, b.t) / 0.35);
      if (b.t <= 0) { b.phase = 'preview'; b.t = 0.6; b.x = BALL_X; game.audio.play('se_tap', 0.3); }
    } else if (b.phase === 'preview') {
      if (b.t <= 0) { b.phase = 'tick'; b.next = nextGap(); }
    } else if (b.phase === 'tick' || b.phase === 'bounce') {
      if (b.phase === 'bounce') {
        b.x = b.fromX + (W * 0.1 - b.fromX) * Math.sin(Math.PI * (1 - Math.max(0, b.t) / 0.35));
        if (b.t <= 0) { b.phase = 'tick'; b.x = BALL_X; }
      }
      b.next -= dt;
      if (b.next <= 0) {
        b.ticks++;
        b.hot = 0.14;
        b.next = nextGap();
        if (b.ticks >= b.n) {
          // はじける: 紙吹雪まみれ
          popConfetti(b.x, b.y, 40);
          game.audio.play('se_break', 0.5);
          flashT = 0.3;
          if (!isDemo) { messy = true; b.phase = 'burst'; loseGame(); }
          else { messy = true; b.phase = 'gone'; b.t = 0.9; }
        } else {
          game.audio.tone(b.ticks % 2 ? 'E6' : 'B5', 0.05, { wave: 'square', volume: 0.07 });
        }
      }
    } else if (b.phase === 'thrown') {
      var p = 1 - Math.max(0, b.t) / 0.4;
      b.x = b.fromX + (b.toX - b.fromX) * p;
      b.y = BALL_Y - Math.sin(Math.PI * p) * 260;
      if (b.t <= 0) {
        b.phase = 'gone'; b.t = 0.25;
        popConfetti(b.toX < 0 ? 60 : W - 60, BALL_Y - 200, 14);
      }
    } else if (b.phase === 'gone') {
      if (b.t <= 0) {
        if (!isDemo && passed >= NEEDED && !finished) { winGame(); return; }
        if (finished) return;
        round++; messy = false; newBall();
      }
    }
    if (b.hot > 0) b.hot -= dt;
  }

  function winGame() {
    finished = true; ok = true; hitStop = 0.4;
    game.feedback.good(W / 2, ME_Y - 100, { text: 'CLEAR', color: C.cyan, count: 30, flashColor: '#f4f0ff' });
    popConfetti(W / 2, ME_Y - 200, 30);
    game.audio.play('se_success', 0.55);
    finish();
  }

  function loseGame() {
    if (finished) return;
    finished = true; ok = false; hitStop = 0.5;
    game.feedback.bad(W / 2, ME_Y - 100, { text: 'GAME OVER', color: C.red, shake: 12 });
    game.audio.play('se_failure', 0.5);
    finish();
  }

  function finish() {
    if (done) return;
    done = true; endWait = 1.3;
    game.audio.stopBgm();
  }

  function scoreNow() { return passed * 200 + perfects * 150 + (ok ? Math.round(timeLeft * 20) : 0); }

  function drawScene() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg0], [0.5, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, C.pink, 0.03 + 0.03 * Math.sin(t * 1.7));
    // 路地の壁とネオン提灯
    for (var i = 0; i < 6; i++) {
      var lx = 90 + i * 180, ly = H * 0.25 + Math.sin(t * 2 + i) * 10;
      game.draw.line(lx, H * 0.2, lx, ly - 30, '#3a2a60', 4);
      var on = Math.floor(t * 3 + i) % 4 !== 0;
      game.draw.circle(lx, ly, 34, i % 2 ? C.pink : C.cyan, on ? 0.9 : 0.3);
      game.draw.circle(lx, ly, 60, i % 2 ? C.pink : C.cyan, on ? 0.15 : 0.05);
    }
    for (var gy = Math.round(H * 0.72); gy < H; gy += 60) game.draw.line(0, gy, W, gy, C.cyan, 2);
    game.draw.line(0, H * 0.72, W, H * 0.72, C.pink, 6);
    // 左右の隠れ場所(他の子は目だけ見える)
    for (var s = 0; s < 2; s++) {
      var bx = s === 0 ? 110 : W - 110;
      game.draw.rect(bx - 90, ME_Y - 120, 180, 240, C.barrel);
      game.draw.rect(bx - 90, ME_Y - 80, 180, 14, C.barrelHi);
      game.draw.sprite(PEEK, { h: s ? C.yellow : C.green, k: C.bg0 }, bx + Math.sin(t * 1.5 + s * 2) * 20, ME_Y - 150, 12, { anchor: 'center' });
    }
    // 自分(樽の陰)
    game.draw.rect(W / 2 - 150, ME_Y + 20, 300, 200, C.barrel);
    game.draw.rect(W / 2 - 150, ME_Y + 60, 300, 16, C.barrelHi);
    game.draw.sprite(KID[Math.floor(t * 3) % 2], messy ? MESSY_PAL : KID_PAL, W / 2, ME_Y - 30 + Math.sin(t * 2.4) * 8, 16, { anchor: 'center' });
    // 玉
    if (ball && ball.phase !== 'gone' && ball.phase !== 'burst') {
      var b = ball;
      var bs = b.hot > 0 ? 17 : 15;
      game.draw.circle(b.x, b.y, 90, b.hot > 0 ? C.yellow : C.pink, b.hot > 0 ? 0.35 : 0.12);
      game.draw.sprite(BALL, BALL_PAL, b.x, b.y, bs, { anchor: 'center' });
      // 導火線の火花(刻みのたびに跳ねる)
      game.draw.circle(b.x + 10, b.y - 80 - (b.hot > 0 ? 24 : 0), 12 + (b.hot > 0 ? 10 : 0), C.yellow);
      // 最初だけ刻みの数を灯りで見せる(予告)
      if (b.phase === 'preview') {
        var blink = Math.floor(t * 10) % 2 === 0 || b.t > 0.35;
        for (var k = 0; k < b.n; k++) {
          var px = b.x - (b.n - 1) * 40 + k * 80;
          game.draw.circle(px, b.y - 170, 24, blink ? C.yellow : C.bg1);
          game.draw.circle(px, b.y - 170, 36, C.yellow, blink ? 0.2 : 0.05);
        }
      }
    }
    for (var c = 0; c < confetti.length; c++) {
      var cf = confetti[c];
      game.draw.rect(cf.x, cf.y, cf.s, cf.s * 0.6, cf.c, Math.min(1, cf.t));
    }
    if (flashT > 0) game.draw.rect(0, 0, W, H, '#ffffff', flashT * 1.5);
    // 親指ゾーン: 放る手
    var armed = ball && ball.phase === 'tick';
    game.draw.circle(W / 2, THROW_Y, 120, armed ? C.cyan : '#3a2a60', armed ? 0.35 + 0.15 * Math.sin(t * 8) : 0.4);
    game.draw.circle(W / 2, THROW_Y, 120, C.cyan, 0.08);
    game.draw.line(W / 2 - 60, THROW_Y + 40, W / 2 + 40, THROW_Y - 50, C.ink, 14);
    game.draw.line(W / 2 + 40, THROW_Y - 50, W / 2 - 10, THROW_Y - 50, C.ink, 14);
    game.draw.line(W / 2 + 40, THROW_Y - 50, W / 2 + 40, THROW_Y, C.ink, 14);
  }

  function drawHud() {
    txt(passed + ' / ' + NEEDED, 60, HUD_Y + 20, 60, C.cyan, 'left');
    txt('SCORE ' + scoreNow(), W - 60, HUD_Y + 20, 40, C.pink, 'right');
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    for (var l = 0; l < LIVES; l++) game.draw.circle(W - 90 - l * 60, HUD_Y + 90, 20, l < LIVES - early ? C.green : '#3a2a60');
    game.draw.rect(60, 172, W - 120, 20, '#3a2a60');
    game.draw.rect(60, 172, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 20, low ? C.red : C.green);
  }

  // ---- ATTRACT デモ: 実際に刻みを数えて放る(1周おきに数え損ねてはじけさせる) ----
  var demo = { t: 0, gx: W / 2, gy: THROW_Y, press: 0, n: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt) { initGame(); demo.n = 0; }
    var prevRound = round;
    stepWorld(dt, true);
    if (round !== prevRound) demo.n++;
    // 偶数巡は最後の1つ手前で放る成功例、奇数巡は数え損ねて手元ではじける失敗例
    if (ball && ball.phase === 'tick' && demo.n % 2 === 0 && ball.ticks === ball.n - 1 && ball.next < ball.gap * 0.6) {
      throwBall(true); demo.press = 0.2;
    }
    if (round > 3) initGame();
    if (demo.press > 0) demo.press -= dt;
    demo.gx = W / 2 + 20; demo.gy = THROW_Y;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (finished || ready > 0) { game.audio.play('se_tap', 0.15); return; }
    if (!throwBall(false)) {
      game.audio.play('se_tap', 0.2);
      game.fx.burst(x, y, { color: C.cyan, count: 4, speed: 100 });
    }
  });

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (ball === undefined) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.1, 92, C.pink);
      txt('BEST ' + (game.best || 0), W / 2, H * 0.145, 40, C.cyan);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.97, 44, C.yellow);
      else txt('INSERT COIN', W / 2, H * 0.97, 34, C.cyan);
      return;
    }

    if (state === S.RESULT) {
      stepWorld(dt, true);
      drawScene();
      game.draw.rect(0, H * 0.12, W, H * 0.18, C.bg0, 0.7);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.17, 100, ok ? C.cyan : C.red);
      txt('SCORE ' + scoreNow() + '   PERFECT ' + perfects, W / 2, H * 0.225, 44, C.yellow);
      if (!ok && passed < NEEDED) txt('あと' + (NEEDED - passed) + '個!', W / 2, H * 0.27, 46, C.red);
      else if (scoreNow() > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.27, 50, C.yellow);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.27, 40, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.97, 40, C.cyan);
      return;
    }

    if (done) {
      endWait -= dt;
      if (hitStop > 0) hitStop -= dt;
      else stepWorld(dt, true);
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { passed: passed, perfects: perfects };
        if (ok) game.end.success(scoreNow(), stats);
        else game.end.failure(stats);
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else if (!finished) {
      timeLeft -= dt;
      stepWorld(dt, false);
      if (timeLeft <= 0 && !finished) {
        timeLeft = 0;
        game.feedback.bad(W / 2, BALL_Y, { text: 'TIME UP', color: C.red });
        loseGame();
      }
    }

    drawScene();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 110, C.pink);
  });

  game.onStart(function() {
    game.audio.melody([
      ['A4', 0.5], ['A4', 0.5], ['C5', 0.5], ['A4', 0.5], ['D5', 0.5], ['C5', 0.5], ['A4', 1],
      ['G4', 0.5], ['G4', 0.5], ['A4', 0.5], ['C5', 0.5], ['E5', 1], ['D5', 1]
    ], { tempo: 138, wave: 'sawtooth', volume: 0.04, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

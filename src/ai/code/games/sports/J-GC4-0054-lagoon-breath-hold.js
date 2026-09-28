// J-GC4-0054-lagoon-breath-hold.js
// 潟湖の息こらえ — 浮き上がる体を足ひれのキックで沈めつつ、きらめく誘惑の泡が流れてくる間だけは指を離して一切触らずに耐える
// 操作: 画面タップで足ひれキック(少し沈む)。何もしないと体は浮いていく。海底の噴き出し口が震えたら泡の列が来る合図で、泡が流れている間に触ると息を吸ってしまう
// 終わり: 14秒こらえ切ればCLEAR。泡の間に触る・水面まで浮いてしまうとGAME OVER
// @mechanic: freeze
// @theme: lagoon_breath_hold
// 世界観: 珊瑚の潟湖で、素潜り漁の見習いが一人前の証の息こらえに挑む。海底の噴き出し口から湧く甘い空気の泡に誘われても手を伸ばさず、浮き上がる体をひれで沈めて耐え抜く
// 残るもの: 正誤(CLEAR/GAME OVER) + こらえた秒数と平均深度
// スタイル: PIXEL HD

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 多色+光、パララックス、ライティング、細かいアニメ
  var STYLE = {
    bg: ['#0a2a4a', '#0d4a6e', '#1d7a8c'],
    main: ['#e8c07a', '#f2a65a', '#ffe0b0'],
    accent: ['#7af0ff', '#ff5c8a'],
  };
  var GLOW = STYLE.accent[0];
  var PINK = STYLE.accent[1];
  var GOLD = '#ffd66b';
  var GOOD_C = '#8cffb8';
  var BAD_C = '#ff5c5c';

  var GAME_TITLE = 'BREATH HOLD';
  var TIME_LIMIT = 14;
  var SURFACE_Y = 380;
  var FLOOR_Y = 1360;
  var START_Y = 1000;
  var RISE_ACC = 170;
  var RISE_MAX = 250;
  var KICK_V = 270;
  var WARN_T = 0.7;
  var VENT_X = W * 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var DIVER = [
    [
      '....hh....',
      '...hhhh...',
      '...hmmh...',
      '....ss....',
      '..wwwwww..',
      '.s.wwww.s.',
      '...wwww...',
      '...b..b...',
      '..ff..ff..',
      '.fff..fff.',
    ],
    [
      '....hh....',
      '...hhhh...',
      '...hmmh...',
      '....ss....',
      '..wwwwww..',
      's..wwww..s',
      '...wwww...',
      '....bb....',
      '...ffff...',
      '..ffffff..',
    ],
  ];
  var DIVER_PAL = { h: '#2a1a14', m: '#9ff', s: '#e8b48a', w: '#ff5c8a', b: '#e8b48a', f: '#2a8aff' };
  var FISH = [['..oo.', 'ooooo', 'o.ooo', '..oo.'], ['.oo..', 'ooooo', 'oooo.', '.oo..']];
  var CORAL = ['.p..p.', 'pp.pp.', '.ppp..', '..pp.p', '..pppp', '...pp.'];
  var WEED = ['.g', 'g.', '.g', 'g.', '.g', 'g.'];

  var diverY, vy, t, waves, wave, nextWave, timeLeft, ready, hitStop, hitKind, ended, endWait, won, score;
  var depthSum, kicks, kickAnim, bubbles, calmStreak;

  function txt(s, x, y, size, color, align) {
    game.draw.text(s, x + 3, y + 3, { size: size, color: '#051525', bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: align || 'center' });
  }

  function initGame() {
    diverY = START_Y;
    vy = 0;
    t = 0;
    wave = null;
    nextWave = 2.2;
    waves = 0;
    timeLeft = TIME_LIMIT;
    ready = 0.8;
    hitStop = 0;
    hitKind = '';
    ended = false;
    endWait = 0;
    won = false;
    score = 0;
    depthSum = 0;
    kicks = 0;
    kickAnim = 0;
    bubbles = [];
    calmStreak = 0;
  }

  function tempting() {
    return wave && wave.warn <= 0 && wave.left > 0;
  }

  function endGame(ok, demo) {
    if (ended) return;
    ended = true;
    won = ok;
    endWait = 1.5;
    if (!demo) {
      game.audio.stopBgm();
      game.audio.play(ok ? 'se_success' : 'se_failure', 0.6);
    }
  }

  function touch(demo) {
    if (ended || hitStop > 0) return;
    if (tempting()) {
      // 泡に手を伸ばしてしまった
      hitStop = 0.5;
      hitKind = 'grab';
      return;
    }
    vy = KICK_V;
    kicks++;
    kickAnim = 0.25;
    game.fx.burst(W / 2, diverY + 90, { color: GLOW, count: 5, speed: 140 });
    if (!demo) game.audio.tone('D4', 0.06, { wave: 'triangle', volume: 0.06, slide: -80 });
  }

  function resolveHit(demo) {
    if (hitKind === 'grab') {
      game.feedback.bad(W / 2, diverY - 160, { text: 'MISS', volume: demo ? 0 : undefined });
    } else if (hitKind === 'surface') {
      game.feedback.bad(W / 2, SURFACE_Y + 80, { text: 'MISS', volume: demo ? 0 : undefined });
    }
    hitKind = '';
    if (!demo) endGame(false, demo);
    else { diverY = START_Y; vy = 0; wave = null; nextWave = 1.2; }
  }

  function stepWorld(dt, demo) {
    t += dt;
    if (kickAnim > 0) kickAnim -= dt;
    // 浮力
    vy -= RISE_ACC * dt;
    if (vy < -RISE_MAX) vy = -RISE_MAX;
    diverY += vy * dt;
    if (diverY > FLOOR_Y) { diverY = FLOOR_Y; vy = 0; }
    depthSum += (diverY - SURFACE_Y) * dt;
    score = Math.round(t * 50 + depthSum / 40);

    // 誘惑の泡の波
    if (!wave) {
      nextWave -= dt;
      calmStreak += dt;
      if (nextWave <= 0) {
        var len = game.random(1.0, 1.4 + Math.min(0.5, waves * 0.12));
        wave = { warn: WARN_T, left: len, total: len };
        if (!demo) game.audio.tone('A2', 0.5, { wave: 'sawtooth', volume: 0.06 });
      }
    } else if (wave.warn > 0) {
      wave.warn -= dt;
      if (wave.warn <= 0 && !demo) game.audio.play('se_powerup', 0.2);
    } else {
      wave.left -= dt;
      if (Math.random() < dt * 30) bubbles.push({ x: VENT_X + game.random(-260, 260), y: FLOOR_Y + 80, r: game.random(14, 34), v: game.random(420, 620) });
      if (wave.left <= 0) {
        waves++;
        wave = null;
        nextWave = game.random(0.9, 1.7);
        calmStreak = 0;
        game.feedback.good(W / 2, diverY - 170, { text: 'NICE', color: GOOD_C, count: 10, volume: demo ? 0 : undefined });
        if (!demo && waves === 2) {
          game.fx.popup(Math.floor(t) + '秒', W / 2, SURFACE_Y + 160, { color: GOLD, size: 64 });
          game.audio.play('se_milestone', 0.5);
        }
      }
    }
    for (var i = bubbles.length - 1; i >= 0; i--) {
      bubbles[i].y -= bubbles[i].v * dt;
      bubbles[i].x += Math.sin(bubbles[i].y * 0.02) * 60 * dt;
      if (bubbles[i].y < SURFACE_Y - 40) bubbles.splice(i, 1);
    }

    if (diverY <= SURFACE_Y + 40) {
      hitStop = 0.5;
      hitKind = 'surface';
    }
  }

  // ── 描画 ──
  function drawBackground() {
    var tt = game.time.elapsed;
    game.draw.gradient(0, H, [[0, '#8ad8f0'], [0.19, '#3aa0c8'], [0.21, STYLE.bg[2]], [0.55, STYLE.bg[1]], [1, STYLE.bg[0]]]);
    // 水面のきらめき
    for (var i = 0; i < 14; i++) {
      var sx = (i * 83 + tt * 30) % W;
      game.draw.rect(sx, SURFACE_Y - 4 + Math.sin(tt * 3 + i) * 4, 50, 6, '#ffffff', 0.5);
    }
    // 光の筋(ライティング)
    for (var r = 0; r < 5; r++) {
      var lx = 120 + r * 220 + Math.sin(tt * 0.6 + r) * 30;
      for (var s = 0; s < 10; s++) game.draw.rect(lx + s * 12, SURFACE_Y + s * 90, 40, 90, '#ffffff', 0.035);
    }
    // 遠景の魚(パララックス)
    for (var f = 0; f < 5; f++) {
      var fx = ((f * 260 + tt * (40 + f * 12)) % (W + 200)) - 100;
      game.draw.sprite(FISH[Math.floor(tt * 4 + f) % 2], { o: f % 2 ? '#ffb347' : '#9fe8ff' }, fx, 560 + f * 110, 7, { anchor: 'center', alpha: 0.55 });
    }
    // 海底
    game.draw.rect(0, FLOOR_Y + 90, W, H - FLOOR_Y - 90, '#1a3a4a');
    for (var c = 0; c < 6; c++) {
      game.draw.sprite(CORAL, { p: c % 2 ? PINK : '#ff9a5c' }, 80 + c * 190, FLOOR_Y + 60, 14, { anchor: 'center' });
      game.draw.sprite(WEED, { g: '#3ac48a' }, 170 + c * 190 + Math.sin(tt * 2 + c) * 8, FLOOR_Y + 40, 12, { anchor: 'center' });
    }
    game.draw.rect(0, 0, W, H, GLOW, 0.02 + 0.02 * Math.sin(tt * 1.2));
  }

  function drawVent() {
    var tt = game.time.elapsed;
    var shake = wave && wave.warn > 0 ? Math.sin(tt * 60) * 8 : 0;
    game.draw.rect(VENT_X - 90 + shake, FLOOR_Y + 70, 180, 50, '#3a2a2a');
    game.draw.rect(VENT_X - 60 + shake, FLOOR_Y + 56, 120, 20, '#5a3a3a');
    if (wave && wave.warn > 0 && Math.floor(tt * 12) % 2 === 0) {
      game.draw.circle(VENT_X, FLOOR_Y + 40, 70, GOLD, 0.5);
      for (var i = 0; i < 5; i++) game.draw.circle(VENT_X + (i - 2) * 30, FLOOR_Y + 20 - i * 12, 8, '#ffffff', 0.8);
    }
    // 泡の列(きらめく誘惑)
    if (tempting()) game.draw.rect(0, SURFACE_Y, W, FLOOR_Y - SURFACE_Y + 100, GOLD, 0.06 + 0.04 * Math.sin(tt * 10));
    for (var b = 0; b < bubbles.length; b++) {
      var bb = bubbles[b];
      game.draw.circle(bb.x, bb.y, bb.r, '#fff6c0', 0.55);
      game.draw.circle(bb.x - bb.r * 0.35, bb.y - bb.r * 0.35, bb.r * 0.3, '#ffffff', 0.9);
    }
  }

  function drawDiver() {
    var tt = game.time.elapsed;
    var sway = Math.sin(tt * 1.6) * 10;
    var frame = kickAnim > 0 ? 1 : Math.floor(tt * 2) % 2;
    game.draw.sprite(DIVER[frame], DIVER_PAL, W / 2 + sway, diverY, 16, { anchor: 'center', flipY: false });
    // 口元の小さな泡(息をこらえている)
    if (Math.floor(tt * 2) % 3 === 0) game.draw.circle(W / 2 + sway + 30, diverY - 70 - (tt * 60) % 40, 6, '#ffffff', 0.6);
    if (hitStop > 0) {
      var g = (0.5 - hitStop) * 120;
      game.draw.circle(W / 2 + sway, diverY, 110 + g, '#ffffff', 0.4);
    }
  }

  function drawDepthGauge() {
    // 右端: 深さゲージ(水面に近いほど赤)
    var x = W - 70;
    game.draw.rect(x, SURFACE_Y, 22, FLOOR_Y - SURFACE_Y, '#051525', 0.6);
    game.draw.rect(x, SURFACE_Y, 22, 90, BAD_C, 0.7);
    var dy = Math.max(SURFACE_Y, Math.min(FLOOR_Y, diverY));
    game.draw.circle(x + 11, dy, 20, dy < SURFACE_Y + 200 ? BAD_C : GLOW);
  }

  function drawThumb() {
    var tt = game.time.elapsed;
    var y = H * 0.86;
    var danger = tempting();
    game.draw.circle(W / 2, y, 150, danger ? BAD_C : GLOW, danger ? 0.25 + 0.15 * Math.sin(tt * 14) : 0.15 + 0.05 * Math.sin(tt * 2));
    game.draw.sprite(['.ff.', 'ffff', 'ffff', 'f..f', 'f..f'], { f: danger ? BAD_C : '#2a8aff' }, W / 2, y, 24, { anchor: 'center' });
    if (danger) {
      // 触ってはいけない合図: 手の形に大きなバツ
      for (var i = -3; i <= 3; i++) {
        game.draw.rect(W / 2 + i * 30 - 12, y + i * 30 - 12, 24, 24, BAD_C, 0.85);
        game.draw.rect(W / 2 + i * 30 - 12, y - i * 30 - 12, 24, 24, BAD_C, 0.85);
      }
    }
  }

  function drawScene() {
    drawBackground();
    drawVent();
    drawDiver();
    drawDepthGauge();
    drawThumb();
  }

  function drawHud() {
    txt(Math.max(0, timeLeft).toFixed(1), W / 2, 120, 76, GOLD);
    txt('SCORE ' + score, 60, 110, 36, '#ffffff', 'left');
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 170, W - 120, 18, '#051525');
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 18, low ? GOOD_C : GLOW);
  }

  // ── ATTRACT ゴースト実演: 凪ではキック、泡の間は手を離す ──
  var demo = { t: 0, press: false, loop: 0, cool: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; nextWave = 1.0; demo.loop++; }
    demo.cool -= dt;
    demo.press = demo.cool > 0.12;
    if (hitStop <= 0 && demo.cool <= 0) {
      var danger = tempting();
      var warn = wave && wave.warn > 0;
      // 失敗例: 偶数周は2つ目の泡で手を出す
      if (danger && demo.loop % 2 === 0 && waves >= 1) { touch(true); demo.cool = 0.25; }
      else if (!danger && (diverY < 900 || (warn && diverY < 1150))) { touch(true); demo.cool = 0.25; }
    }
    if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) resolveHit(true);
    } else {
      stepWorld(dt, true);
    }
  }

  game.onPress(function (x, y) {
    if (state !== S.PLAYING || ready > 0 || ended) return;
    game.audio.play('se_tap', 0.15);
    touch(false);
  });

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING;
      initGame();
      return;
    }
    if (state === S.RESULT) {
      state = S.ATTRACT;
      initGame();
      demo.t = 0;
      return;
    }
  });

  game.onUpdate(function (dt) {
    if (diverY === undefined) initGame();

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(W / 2 + 60, H * 0.87 + (demo.press ? 0 : 40), { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.085, 72, GOLD);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.125, 34, '#ffffff');
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.975, 42, GOLD);
      else txt('INSERT COIN', W / 2, H * 0.975, 32, '#ffffff');
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, 230, W, 420, '#051525', 0.75);
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, 350, 88, won ? GOOD_C : BAD_C);
      txt('SCORE ' + score, W / 2, 430, 46, '#ffffff');
      txt(t.toFixed(1) + '秒', W / 2, 500, 44, GOLD);
      if (won && score >= (game.best || 0)) txt('NEW RECORD', W / 2, 570, 42, GOLD);
      else txt('BEST ' + (game.best || 0), W / 2, 570, 34, GLOW);
      if (!won) txt('あと' + Math.max(0.1, TIME_LIMIT - t).toFixed(1) + '秒!', W / 2, 625, 36, PINK);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.975, 34, '#ffffff');
      return;
    }

    // PLAYING
    if (ended) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { seconds: +t.toFixed(1), avgDepth: t > 0 ? Math.round(depthSum / t) : 0, kicks: kicks };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.25);
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) resolveHit(false);
    } else {
      timeLeft -= dt;
      stepWorld(dt, false);
      if (timeLeft <= 0 && hitStop <= 0) {
        timeLeft = 0;
        score += 500;
        game.feedback.good(W / 2, diverY - 170, { text: 'CLEAR', color: GOOD_C, count: 30 });
        endGame(true, false);
      }
    }

    drawScene();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 96, GOLD);
  });

  game.onStart(function () {
    game.audio.melody(
      [['F4', 1], ['A4', 0.5], ['C5', 0.5], ['B4', 1], ['G4', 1], ['E4', 0.5], ['G4', 0.5], ['F4', 1]],
      { tempo: 84, wave: 'sine', volume: 0.05, loop: true, bass: true }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);

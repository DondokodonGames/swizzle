// J-GC4-0046-draft-light-doors.js
// すきま灯りの扉 — 並んだ扉の下から漏れる外の光を見比べ、いちばん広く光が漏れる扉だけを選んで館を抜ける
// 操作: 扉(または扉の前のマット)をタップして開ける。扉下の光の帯と床への光のこぼれが一番長い扉が外へ通じる本物
// 終わり: 5つの広間を抜ければCLEAR。はずれの扉(びっくり箱)を2回開ける・広間で迷い続ける・時間切れでGAME OVER
// @mechanic: size_judge
// @theme: draft_light_door_choice
// 世界観: からくり館に迷い込んだランプ持ちの見習いが、外気と一緒に光が差し込む本物の出口側の扉だけを光の幅で見抜き、びっくり箱の仕掛け扉を避けて広間を5つ抜ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 抜けた広間の数と平均の見極め時間
// スタイル: 90s PRE-RENDER

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: 暗め・金属質、粒状ノイズと擬似奥行きの一枚絵
  var STYLE = {
    bg: ['#0d0b10', '#1d1822', '#2e2632'],
    main: ['#6b5a48', '#8e7a60', '#b39b77'],
    accent: ['#ffe9a8', '#ff5a4e'],
  };
  var GOLD = '#ffd66b';
  var GOOD_C = '#8cffb0';
  var BAD_C = STYLE.accent[1];

  var GAME_TITLE = 'DRAFT LIGHT DOORS';
  var TIME_LIMIT = 15;
  var NEEDED = 5;
  var LIVES = 2;
  var HALL_T = [2.9, 2.8, 2.6, 2.5, 2.4];
  var DELTA = [17, 13, 10, 7, 5];
  var DOORS_N = [3, 3, 3, 4, 4];
  var DOOR_TOP = H * 0.28;
  var DOOR_BOT = H * 0.64;
  var FLOOR_Y = DOOR_BOT;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var WALKER = [
    [
      '...hhh....',
      '..hhhhh...',
      '..hsssh...',
      '...sss..l.',
      '..ccccc.l.',
      '.cccccc.L.',
      '.c.ccc.cL.',
      '...ccc....',
      '...b.b....',
      '..bb.bb...',
    ],
    [
      '...hhh....',
      '..hhhhh...',
      '..hsssh...',
      '...sss.l..',
      '..ccccc.l.',
      '.cccccc.L.',
      '.c.ccc..L.',
      '...ccc....',
      '..b...b...',
      '.bb...bb..',
    ],
  ];
  var WALKER_PAL = { h: '#5b3b2a', s: '#f2c9a0', c: '#3e6fa8', b: '#2a2230', l: '#9c8a70', L: STYLE.accent[0] };
  var JACK = [
    [
      '..rrrr..',
      '.rwwwwr.',
      '.w.ww.w.',
      '.wwwwww.',
      '..wkkw..',
      '...zz...',
      '..zz....',
      '...zz...',
    ],
    [
      '.rrrrrr.',
      'rwwwwwwr',
      'w.wwww.w',
      'wwwwwwww',
      '.wwkkww.',
      '...zz...',
      '....zz..',
      '...zz...',
    ],
  ];
  var JACK_PAL = { r: '#ff5a4e', w: '#fff3dc', k: '#2a1a1a', z: '#c9c1b0' };
  var LAMP = ['.yy.', 'yYYy', 'yYYy', '.bb.'];
  var LAMP_PAL = { y: '#c79a3a', Y: '#ffe9a8', b: '#5a4a3a' };

  var hall, doors, correct, phase, phaseT, hallT, chosen, lives, cleared, timeLeft, ready;
  var hitStop, ended, endWait, won, score, reactSum, reveal, walkerX, walkerTX, walkStep, lastTickSec;

  function txt(s, x, y, size, color, align) {
    game.draw.text(s, x + 3, y + 3, { size: size, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: align || 'center' });
  }

  function layoutDoors(n) {
    var arr = [];
    var span = (W - 120) / n;
    var dw = span * 0.74;
    for (var i = 0; i < n; i++) {
      var cx = 60 + span * (i + 0.5);
      arr.push({ cx: cx, x: cx - dw / 2, w: dw, gap: 0, open: 0 });
    }
    return arr;
  }

  function buildHall() {
    var h = Math.min(hall, NEEDED - 1);
    doors = layoutDoors(DOORS_N[h]);
    correct = Math.floor(game.random(0, doors.length - 0.001));
    var base = game.random(7, 12);
    for (var i = 0; i < doors.length; i++) {
      // 偽の扉どうしも少しずつ違う(最大の偽扉 < 本物 - DELTA*0.9)
      doors[i].gap = base + game.random(0, DELTA[h] * 0.35);
    }
    var maxFake = 0;
    for (var j = 0; j < doors.length; j++) if (j !== correct) maxFake = Math.max(maxFake, doors[j].gap);
    doors[correct].gap = maxFake + DELTA[h];
    phase = 'choose';
    phaseT = 0;
    hallT = HALL_T[h];
    chosen = -1;
    reveal = 0;
    lastTickSec = -1;
    walkerTX = W / 2;
  }

  function initGame() {
    hall = 0;
    lives = LIVES;
    cleared = 0;
    timeLeft = TIME_LIMIT;
    ready = 0.8;
    hitStop = 0;
    ended = false;
    endWait = 0;
    won = false;
    score = 0;
    reactSum = 0;
    walkerX = W / 2;
    walkStep = 0;
    buildHall();
  }

  function endGame(ok, demo) {
    if (ended) return;
    ended = true;
    won = ok;
    endWait = 1.4;
    if (!demo) {
      game.audio.stopBgm();
      game.audio.play(ok ? 'se_success' : 'se_failure', 0.6);
    }
  }

  function doorAt(x, y) {
    if (y < DOOR_TOP - 40 || y > H * 0.97) return -1;
    for (var i = 0; i < doors.length; i++) {
      var d = doors[i];
      if (x >= d.x - 20 && x <= d.x + d.w + 20) return i;
    }
    return -1;
  }

  function choose(i, demo) {
    if (phase !== 'choose' || ended || i < 0) return;
    chosen = i;
    walkerTX = doors[i].cx;
    reactSum += phaseT;
    if (!demo) game.audio.play('se_tap', 0.4);
    if (i === correct) {
      phase = 'open';
      phaseT = 0;
      hitStop = 0.3;
      reveal = 1;
      score += 100 + Math.max(0, Math.round((hallT - phaseT) * 40));
    } else {
      phase = 'trap';
      phaseT = 0;
      hitStop = 0.5;
      reveal = 1;
    }
  }

  function resolveAfterStop(demo) {
    var d = doors[chosen >= 0 ? chosen : correct];
    if (phase === 'open') {
      cleared++;
      game.feedback.good(d.cx, DOOR_TOP + 120, { text: phaseT < 1.0 ? 'PERFECT' : 'GOOD', color: GOOD_C, count: 18, volume: demo ? 0 : undefined });
      if (!demo && cleared === 3) {
        game.fx.popup(cleared + ' / ' + NEEDED, W / 2, H * 0.2, { color: GOLD, size: 64 });
        game.audio.play('se_milestone', 0.5);
      }
      if (cleared >= NEEDED) { endGame(true, demo); return; }
      phase = 'next';
      phaseT = 0;
    } else {
      lives--;
      game.feedback.bad(d.cx, DOOR_TOP + 160, { text: 'MISS', volume: demo ? 0 : undefined });
      game.fx.burst(d.cx, DOOR_TOP + 200, { color: '#fff3dc', count: 22, speed: 380 });
      if (lives <= 0) { endGame(false, demo); return; }
      phase = 'next';
      phaseT = 0;
    }
  }

  function stepHall(dt, demo) {
    phaseT += dt;
    var dx = walkerTX - walkerX;
    walkerX += dx * Math.min(1, dt * 7);
    if (Math.abs(dx) > 4) walkStep += dt * 10;
    if (phase === 'choose') {
      var remain = hallT - phaseT;
      var sec = Math.ceil(remain / 0.35);
      if (remain < 0.75 && sec !== lastTickSec && !demo) {
        lastTickSec = sec;
        game.audio.tone('A5', 0.05, { wave: 'square', volume: 0.05 });
      }
      if (remain <= 0) {
        // 迷い続けた: 床のからくりが鳴って1つ失う
        chosen = -1;
        phase = 'trap';
        phaseT = 0;
        hitStop = 0.45;
        reveal = 1;
      }
    } else if (phase === 'next' && !demo) {
      if (phaseT > 0.55) {
        hall++;
        buildHall();
      }
    }
    for (var i = 0; i < doors.length; i++) {
      var target = (phase === 'open' || phase === 'next') && i === chosen && chosen === correct ? 1 : (phase !== 'choose' && i === chosen ? 0.55 : 0);
      doors[i].open += (target - doors[i].open) * Math.min(1, dt * 8);
    }
  }

  function drawBackground() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.55, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    // 遠景: 天井のアーチ梁(擬似奥行き)
    for (var k = 0; k < 6; k++) {
      var yy = 240 + k * 32;
      game.draw.rect(0, yy, W, 6, STYLE.main[0], 0.18 + k * 0.04);
    }
    // 壁の金属パネル
    for (var p = 0; p < 9; p++) {
      game.draw.rect(p * 120 + 4, DOOR_TOP - 60, 112, DOOR_BOT - DOOR_TOP + 60, STYLE.bg[2], 0.55);
      game.draw.rect(p * 120 + 4, DOOR_TOP - 60, 112, 4, STYLE.main[1], 0.35);
    }
    // 粒状ノイズ(時間でゆっくり動く)
    for (var n = 0; n < 70; n++) {
      var nx = (n * 157 + Math.floor(t * 9) * 31) % W;
      var ny = (n * 263 + Math.floor(t * 7) * 17) % H;
      game.draw.rect(nx, ny, 3, 3, '#ffffff', 0.05);
    }
    // 床(奥へ詰まる帯)
    for (var f = 0; f < 12; f++) {
      var fy = FLOOR_Y + f * f * 6.5;
      game.draw.rect(0, fy, W, 3, STYLE.main[0], 0.4);
    }
    // 環境光の呼吸
    game.draw.rect(0, 0, W, H, STYLE.accent[0], 0.03 + 0.025 * Math.sin(t * 1.4));
  }

  function drawDoors() {
    var t = game.time.elapsed;
    var breathe = 1 + 0.06 * Math.sin(t * 3.1);
    for (var i = 0; i < doors.length; i++) {
      var d = doors[i];
      var hDoor = DOOR_BOT - DOOR_TOP;
      var sway = Math.sin(t * 1.7 + i) * 2;
      // 枠
      game.draw.rect(d.x - 14, DOOR_TOP - 20 + sway * 0.3, d.w + 28, hDoor + 20, '#3a2f2a');
      game.draw.rect(d.x - 14, DOOR_TOP - 20 + sway * 0.3, d.w + 28, 8, STYLE.main[2], 0.6);
      // 扉の奥(開いたとき)
      var inside = (i === correct) ? STYLE.accent[0] : '#1a1014';
      game.draw.rect(d.x, DOOR_TOP, d.w, hDoor, inside, d.open > 0.05 ? 0.9 : 0.0);
      // 扉板(開くと細くなる)
      var pw = d.w * (1 - d.open * 0.85);
      for (var s = 0; s < 5; s++) {
        var shade = s % 2 === 0 ? STYLE.main[0] : STYLE.main[1];
        game.draw.rect(d.x, DOOR_TOP + s * (hDoor / 5), pw, hDoor / 5 - 3, shade);
      }
      game.draw.rect(d.x, DOOR_TOP, 5, hDoor, STYLE.main[2], 0.7);
      // リベット
      for (var r = 0; r < 4; r++) game.draw.circle(d.x + pw - 22, DOOR_TOP + 60 + r * (hDoor / 4), 6, STYLE.main[2]);
      // ノッカー
      game.draw.circle(d.x + pw * 0.5, DOOR_TOP + hDoor * 0.45 + sway, 16, '#c79a3a');
      game.draw.circle(d.x + pw * 0.5, DOOR_TOP + hDoor * 0.45 + sway, 9, '#3a2f2a');
      // 扉下の光の帯(比べる対象)
      var g = d.gap * breathe;
      game.draw.rect(d.x + 6, DOOR_BOT - g, d.w - 12, g, STYLE.accent[0], 0.95);
      // 床への光のこぼれ(長さが幅に比例して差を増幅)
      var spill = g * 7;
      for (var q = 0; q < 8; q++) {
        var yy = DOOR_BOT + q * (spill / 8);
        var inset = q * 6;
        game.draw.rect(d.x + 6 - inset, yy, d.w - 12 + inset * 2, spill / 8 + 1, STYLE.accent[0], 0.34 - q * 0.04);
      }
      // 答え合わせのハイライト
      if (reveal > 0 && phase !== 'choose' && i === correct) {
        game.draw.rect(d.x - 18, DOOR_TOP - 24, d.w + 36, 10, GOOD_C, 0.85);
        game.draw.rect(d.x - 18, DOOR_BOT + 4, d.w + 36, 10, GOOD_C, 0.85);
      }
      // 扉前のマット(親指ゾーン)
      var mx = d.cx - d.w * 0.42;
      game.draw.rect(mx, H * 0.8, d.w * 0.84, 90, '#4a2f2a');
      game.draw.rect(mx + 8, H * 0.8 + 8, d.w * 0.84 - 16, 74, '#7a3f34');
      game.draw.rect(mx + 8, H * 0.8 + 40, d.w * 0.84 - 16, 8, STYLE.accent[0], 0.25 + 0.1 * Math.sin(t * 2 + i));
    }
    // 罠: びっくり箱
    if ((phase === 'trap' || (phase === 'next' && lastWasTrap())) && chosen >= 0) {
      var dd = doors[chosen];
      var pop = Math.min(1, phaseT * 4 + (hitStop > 0 ? 1 : 0));
      game.draw.sprite(JACK[Math.floor(t * 8) % 2], JACK_PAL, dd.cx, DOOR_TOP + 250 - pop * 60, 16, { anchor: 'center' });
    }
  }

  function lastWasTrap() {
    return chosen >= 0 && chosen !== correct;
  }

  function drawWalker() {
    var t = game.time.elapsed;
    var frame = Math.floor(walkStep) % 2;
    var bob = Math.sin(t * 3.2) * 6;
    game.draw.rect(walkerX - 56, H * 0.745 + 66, 112, 14, '#000000', 0.35);
    game.draw.sprite(WALKER[frame], WALKER_PAL, walkerX + Math.sin(t * 1.3) * 4, H * 0.745 + bob, 14, { anchor: 'center' });
  }

  function drawHud() {
    txt(cleared + ' / ' + NEEDED, 90, 110, 52, GOLD, 'left');
    for (var i = 0; i < LIVES; i++) {
      var on = i < lives;
      game.draw.sprite(LAMP, LAMP_PAL, W - 90 - i * 80, 95, 12, { anchor: 'center', alpha: on ? 1 : 0.2 });
    }
    var tbW = W - 180;
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(90, 170, tbW, 18, '#2a2226');
    game.draw.rect(90, 170, tbW * Math.max(0, timeLeft / TIME_LIMIT), 18, low ? BAD_C : GOLD);
    // 広間ごとの迷い時間リング
    if (phase === 'choose') {
      var frac = Math.max(0, 1 - phaseT / hallT);
      var danger = hallT - phaseT < 0.75;
      game.draw.rect(W / 2 - 200, 214, 400 * frac, 10, danger && Math.floor(game.time.elapsed * 10) % 2 === 0 ? BAD_C : STYLE.accent[0], 0.85);
    }
  }

  // ── ATTRACT ゴースト実演(実ロジックを流用) ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.85, press: false, loop: 0, done: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) {
      initGame();
      ready = 0;
      hall = demo.loop % 3;
      buildHall();
      demo.done = false;
      demo.loop++;
    }
    // 2周に1回はわざと狭い扉を開けて失敗例を見せる
    var wantWrong = demo.loop % 2 === 0;
    var target = correct;
    if (wantWrong) target = (correct + 1) % doors.length;
    var tx = doors[target].cx;
    var ty = H * 0.84;
    var k = Math.min(1, cyc / 1.2);
    demo.gx = W / 2 + (tx - W / 2) * k;
    demo.gy = H * 0.9 + (ty - H * 0.9) * k;
    demo.press = cyc > 1.2 && cyc < 1.45;
    if (cyc > 1.25 && !demo.done && phase === 'choose') {
      demo.done = true;
      choose(target, true);
    }
    if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) resolveAfterStop(true);
    } else {
      stepHall(dt, true);
    }
  }

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
    if (state === S.PLAYING) {
      if (ready > 0 || hitStop > 0 || ended) { game.audio.play('se_tap', 0.1); return; }
      var i = doorAt(x, y);
      if (i < 0 || phase !== 'choose') {
        game.audio.play('se_tap', 0.15);
        game.fx.burst(x, y, { color: STYLE.main[2], count: 5, speed: 120 });
        return;
      }
      choose(i, false);
    }
  });

  game.onUpdate(function (dt) {
    if (hall === undefined) initGame();

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawBackground();
      drawDoors();
      drawWalker();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 60, STYLE.accent[0]);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.12, 32, GOLD);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 44, GOLD);
      else txt('INSERT COIN', W / 2, H * 0.95, 34, '#ffffff');
      return;
    }

    if (state === S.RESULT) {
      drawBackground();
      drawDoors();
      drawWalker();
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.1, 84, won ? GOOD_C : BAD_C);
      txt('SCORE ' + score, W / 2, H * 0.155, 46, '#ffffff');
      txt(cleared + ' / ' + NEEDED, W / 2, H * 0.195, 40, GOLD);
      if (won && score >= (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.235, 40, GOLD);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.235, 34, STYLE.main[2]);
      if (!won) txt('あと' + (NEEDED - cleared) + '部屋!', W / 2, H * 0.72, 44, STYLE.accent[0]);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 36, '#ffffff');
      return;
    }

    // PLAYING
    if (ended) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { halls: cleared, avgPick: cleared > 0 ? +(reactSum / Math.max(1, cleared)).toFixed(2) : 0 };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.3);
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) resolveAfterStop(false);
    } else {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        game.feedback.bad(W / 2, H * 0.4, { text: 'TIME UP' });
        endGame(false, false);
      } else {
        stepHall(dt, false);
      }
    }

    drawBackground();
    drawDoors();
    drawWalker();
    drawHud();
    if (hitStop > 0 && chosen >= 0) {
      var d = doors[chosen];
      game.draw.rect(d.x - 20, DOOR_TOP - 26, d.w + 40, DOOR_BOT - DOOR_TOP + 40, '#ffffff', 0.25 + 0.2 * Math.sin(game.time.elapsed * 40));
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.47, 96, GOLD);
  });

  game.onStart(function () {
    game.audio.melody(
      [['D4', 0.5], ['F4', 0.5], ['A4', 0.5], ['G4', 0.25], ['F4', 0.25], ['E4', 0.5], ['C4', 0.5], ['D4', 1]],
      { tempo: 104, wave: 'triangle', volume: 0.05, loop: true, bass: true }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);

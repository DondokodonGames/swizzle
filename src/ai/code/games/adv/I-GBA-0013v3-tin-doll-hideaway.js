// I-GBA-0013v3-tin-doll-hideaway.js
// ブリキの隠れんぼ行進 — 片付けの手が箱を探っている間は固まり、目を離した隙にだけ進んで隠れ家へ
// 操作: 親指ゾーンを押している間ブリキ人形が前へ歩き、離すと固まる。手袋の手が箱の中を探っている間に押していると見つかる
// 終わり: 積み木2つの陰を伝って隅の隠れ家に着けば成功。探索中に動いて見つかる/時間切れで失敗
// @mechanic: freeze
// @theme: toybox_tin_doll_hide
// 世界観: 子ども部屋のおもちゃ箱で、ブリキの人形がお片付けの手に見つからないよう止まっては進み、積み木の陰を伝って隅の段ボールの隠れ家を目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + たどり着いた隠れ場所の数と残り時間
// スタイル: HD POST 3D

(function(game) {
  var STYLE = { bg: ['#2b241f', '#4d3f33', '#6e5a47'], main: ['#b8b0a2', '#8a8174'], accent: ['#e2a75c', '#c0564b'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  var GAME_TITLE = 'TIN HIDEAWAY';
  var TIME_LIMIT = 14;
  var LEGS = 3;
  var FLOOR_Y = H * 0.60;
  var X0 = 150;
  var X1 = W - 190;
  var STOPS = [X0 + (X1 - X0) * 0.36, X0 + (X1 - X0) * 0.70, X1];
  var WALK = 215;
  var PAD_X = W / 2;
  var PAD_Y = H * 0.84;
  var PAD_R = 150;

  var MODE = { ATTRACT: 'attract', PLAYING: 'playing', RESULT: 'result' };
  var mode = MODE.ATTRACT;

  var doll = { x: X0, step: 0, moving: false, hide: 0 };
  var glove = { phase: 'away', t: 0, dur: 1, x: W / 2, y: -320, feint: false, noted: false };
  var legsDone = 0, timeLeft = TIME_LIMIT, countIn = 0, stopT = 0, endT = 0;
  var live = false, cleared = false, caught = false, freezes = 0, walking = false;

  var DOLL_A = [
    '..####..',
    '..#oo#..',
    '..####..',
    '.##kk##.',
    '#.#rr#.#',
    '..#rr#..',
    '..####..',
    '..#..#..',
    '..#..#..',
    '.##..##.',
  ];
  var DOLL_B = [
    '..####..',
    '..#oo#..',
    '..####..',
    '.##kk##.',
    '.##rr##.',
    '..#rr#..',
    '..####..',
    '.#....#.',
    '#.....#.',
    '##.....#',
  ];
  var DOLL_FREEZE = [
    '..####..',
    '..#--#..',
    '..####..',
    '.##kk##.',
    '#.#rr#.#',
    '#.#rr#.#',
    '..####..',
    '..#..#..',
    '..#..#..',
    '..#..#..',
  ];
  var DOLL_PAL = { '#': '#b8b0a2', 'o': '#2b241f', '-': '#2b241f', 'k': '#e2a75c', 'r': '#c0564b' };

  var GLOVE_OPEN = [
    '.##.##.##.',
    '.##.##.##.',
    '.##.##.##.',
    '.##.##.##.',
    '.########.',
    '##########',
    '##########',
    '.########.',
    '..######..',
    '..=====...',
  ];
  var GLOVE_SHUT = [
    '..........',
    '..........',
    '.##.##.##.',
    '.##.##.##.',
    '.########.',
    '##########',
    '##########',
    '.########.',
    '..######..',
    '..=====...',
  ];
  var GLOVE_PAL = { '#': '#e8c86a', '=': '#c0564b' };

  var HOUSE = [
    '...####...',
    '..######..',
    '.########.',
    '##########',
    '.#......#.',
    '.#.####.#.',
    '.#.#..#.#.',
    '.#.#..#.#.',
    '.########.',
  ];
  var HOUSE_PAL = { '#': '#a0764a' };

  var FOOT = ['.##..', '####.', '####.', '.##..', '.....', '..##.', '.####', '.####', '..##.'];

  function say(str, x, y, size, color) {
    game.draw.text(str, x + 3, y + 3, { size: size, color: '#120e0b', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function level() { return Math.min(2, legsDone); }

  function setGlove(phase) {
    glove.phase = phase;
    glove.t = 0;
    glove.noted = false;
    var lv = level();
    if (phase === 'away') glove.dur = game.random(1.0, 1.5) - lv * 0.2;
    else if (phase === 'warn') { glove.dur = 0.6; glove.feint = lv >= 1 && game.random(0, 1) < 0.3; glove.x = doll.x + game.random(-120, 120); }
    else if (phase === 'look') glove.dur = game.random(0.9, 1.25) + lv * 0.15;
    else glove.dur = 0.35;
  }

  function resetField() {
    doll.x = X0; doll.step = 0; doll.moving = false; doll.hide = 0;
    legsDone = 0;
    setGlove('away');
    glove.y = -320;
  }

  function initRound() {
    resetField();
    timeLeft = TIME_LIMIT; countIn = 0.8; stopT = 0; endT = 0;
    live = false; cleared = false; caught = false; freezes = 0; walking = false;
  }

  function moveGlove(dt) {
    glove.t += dt;
    var k = Math.min(1, glove.t / glove.dur);
    if (glove.phase === 'away') {
      glove.y += (-320 - glove.y) * Math.min(1, dt * 6);
    } else if (glove.phase === 'warn') {
      glove.y = -320 + (H * 0.12 + 320) * k;
      if (mode === MODE.PLAYING && live && glove.t - dt <= 0) game.audio.tone('D3', 0.22, { wave: 'triangle', volume: 0.12, slide: -40 });
    } else if (glove.phase === 'look') {
      glove.y = H * 0.30 + Math.sin(glove.t * 9) * 10;
      glove.x += ((doll.x + Math.sin(glove.t * 3.2) * 170) - glove.x) * Math.min(1, dt * 3);
    } else {
      glove.y -= dt * 1500;
    }
    if (glove.t >= glove.dur) {
      if (glove.phase === 'away') setGlove('warn');
      else if (glove.phase === 'warn') setGlove(glove.feint ? 'lift' : 'look');
      else if (glove.phase === 'look') setGlove('lift');
      else setGlove('away');
    }
  }

  function spotted(isWalking) {
    return glove.phase === 'look' && glove.t > 0.08 && isWalking;
  }

  function walkDoll(dt, isWalking) {
    if (doll.hide > 0) { doll.hide -= dt; doll.moving = false; return; }
    doll.moving = isWalking;
    if (!isWalking || legsDone >= LEGS) return;
    doll.x += WALK * dt;
    doll.step += dt * 7;
    if (doll.x >= STOPS[legsDone]) {
      doll.x = STOPS[legsDone];
      legsDone++;
      doll.hide = 0.3;
      if (mode === MODE.PLAYING) {
        if (legsDone < LEGS) {
          game.fx.popup(legsDone + ' / ' + LEGS, doll.x, FLOOR_Y - 190, { color: STYLE.accent[0], size: 44 });
          game.audio.play('se_milestone', 0.45);
        } else {
          finishRound(true);
        }
      }
    }
  }

  function finishRound(win) {
    if (!live) return;
    live = false;
    cleared = win;
    caught = !win && timeLeft > 0;
    stopT = 0.5;
    game.audio.stopBgm();
    if (win) {
      game.feedback.good(doll.x, FLOOR_Y - 90, { text: 'CLEAR', color: STYLE.accent[0], count: 26 });
      game.audio.play('se_success', 0.5);
    } else {
      game.feedback.bad(doll.x, FLOOR_Y - 90, { text: caught ? 'MISS' : 'TIME UP', shake: 14 });
      game.audio.play('se_failure', 0.45);
    }
  }

  game.onTap(function(x, y) {
    if (mode === MODE.ATTRACT) { game.audio.play('se_coin', 0.5); mode = MODE.PLAYING; initRound(); return; }
    if (mode === MODE.RESULT) { mode = MODE.ATTRACT; initRound(); demo.t = 0; return; }
  });

  game.onPress(function(x, y) {
    if (mode !== MODE.PLAYING || !live) return;
    game.audio.play('se_tap', 0.25);
    game.fx.burst(PAD_X, PAD_Y, { color: STYLE.main[0], count: 6, speed: 160 });
    if (spotted(true)) finishRound(false);
  });

  game.onRelease(function(x, y) {
    if (mode !== MODE.PLAYING || !live) return;
    game.audio.tone('G5', 0.06, { wave: 'square', volume: 0.08 });
    if ((glove.phase === 'warn' || glove.phase === 'look') && !glove.noted) {
      glove.noted = true;
      freezes++;
      game.feedback.good(doll.x, FLOOR_Y - 160, { text: 'NICE', color: STYLE.accent[0], count: 8, sound: false });
    } else {
      game.fx.popup('·', doll.x, FLOOR_Y - 150, { color: STYLE.main[0], size: 30 });
    }
  });

  // ── ATTRACT ゴースト実演: 実ロジック(moveGlove/walkDoll/spotted)で進んで止まる。偶数周は止まり遅れて見つかる ──
  var demo = { t: 0, gx: PAD_X, gy: PAD_Y, press: false, late: false, flash: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8;
    if (cyc < dt || demo.t <= dt) {
      resetField();
      demo.late = Math.floor(demo.t / 8) % 2 === 1;
      demo.flash = 0;
    }
    moveGlove(dt);
    if (demo.flash > 0) {
      demo.flash -= dt;
      demo.press = false;
      if (demo.flash <= 0) resetField();
      return;
    }
    var want = glove.phase === 'away' || glove.phase === 'lift' || (glove.phase === 'warn' && glove.t < 0.3);
    if (demo.late && legsDone >= 1 && glove.phase === 'look') want = true;
    if (legsDone >= LEGS) want = false;
    demo.press = want;
    walkDoll(dt, want);
    if (spotted(want)) demo.flash = 0.8;
  }

  // ── 描画 ──
  function drawRoom() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, '#3b3128'], [0.45, STYLE.bg[1]], [1, STYLE.bg[0]]]);
    for (var i = 0; i < 9; i++) game.draw.rect(i * 130 + 20, 0, 38, H * 0.30, '#6e5a47', 0.12);
    // ランプのブルーム(半透明円の重ね)
    var pulse = 0.08 + 0.03 * Math.sin(t * 1.4);
    for (var b = 0; b < 4; b++) game.draw.circle(W * 0.82, H * 0.08, 90 + b * 70, '#ffd9a0', pulse * (1 - b * 0.22));
    // おもちゃ箱の奥壁(横ストリップの木目)
    for (var y = Math.floor(H * 0.28); y < FLOOR_Y; y += 6) {
      var shade = (Math.floor(y / 42) % 2 === 0) ? '#6e5a47' : '#664f3d';
      game.draw.rect(60, y, W - 120, 6, shade, 1);
    }
    game.draw.rect(60, FLOOR_Y, W - 120, H * 0.09, '#8a6b4c', 1);
    for (var f = 0; f < 5; f++) game.draw.rect(60, FLOOR_Y + 14 + f * 30, W - 120, 2, '#5c4735', 0.6);
    // 箱の縁(手前)
    game.draw.rect(40, H * 0.69, W - 80, 46, '#4d3f33', 1);
    game.draw.rect(40, H * 0.69, W - 80, 8, '#a58867', 1);
    game.draw.rect(40, H * 0.28 - 20, 20, H * 0.45, '#4d3f33', 1);
    game.draw.rect(W - 60, H * 0.28 - 20, 20, H * 0.45, '#4d3f33', 1);
    // 奥のおもちゃ(遠景)
    game.draw.circle(W * 0.30, FLOOR_Y - 40, 44, '#7d6a8c', 0.7);
    game.draw.circle(W * 0.30 - 12, FLOOR_Y - 52, 12, '#b8b0a2', 0.35);
    game.draw.rect(W * 0.55, FLOOR_Y - 110, 26, 110, '#6d8a6a', 0.6);
    game.draw.circle(W * 0.55 + 13, FLOOR_Y - 118, 22, '#6d8a6a', 0.6);
    // ビネット
    game.draw.rect(0, 0, 50, H, '#000000', 0.35);
    game.draw.rect(W - 50, 0, 50, H, '#000000', 0.35);
    game.draw.rect(0, H - 60, W, 60, '#000000', 0.3);
  }

  function drawBlocks() {
    for (var i = 0; i < 2; i++) {
      var bx = STOPS[i] + 40;
      var done = legsDone > i;
      game.draw.rect(bx - 60, FLOOR_Y - 120, 120, 120, done ? '#e2a75c' : '#c0564b', 1);
      game.draw.rect(bx - 60, FLOOR_Y - 120, 120, 14, '#ffffff', 0.25);
      game.draw.rect(bx - 44, FLOOR_Y - 96, 88, 72, '#000000', 0.12);
    }
    game.draw.sprite(HOUSE, HOUSE_PAL, X1 + 40, FLOOR_Y - 100, 22, { anchor: 'center' });
    var glow = 0.15 + 0.1 * Math.sin(game.time.elapsed * 3);
    game.draw.circle(X1 + 40, FLOOR_Y - 60, 40, '#ffd9a0', glow);
  }

  function drawDoll(highlight) {
    var bob = doll.moving ? Math.abs(Math.sin(doll.step * 2)) * 8 : Math.sin(game.time.elapsed * 2) * 2;
    var frame = doll.moving ? (Math.floor(doll.step) % 2 === 0 ? DOLL_A : DOLL_B) : DOLL_FREEZE;
    var px = highlight ? 19 : 14;
    game.draw.rect(doll.x - 44, FLOOR_Y - 6, 88, 10, '#000000', 0.3);
    if (highlight) {
      game.draw.circle(doll.x, FLOOR_Y - 60, 110, '#ffffff', 0.55);
      game.draw.circle(doll.x, FLOOR_Y - 60, 150, '#ffffff', 0.2);
    }
    game.draw.sprite(frame, DOLL_PAL, doll.x, FLOOR_Y - 60 - bob, px, { anchor: 'center' });
    // ぜんまい
    var wind = doll.moving ? Math.floor(doll.step * 2) % 2 : 0;
    game.draw.line(doll.x - 50, FLOOR_Y - 70 - bob, doll.x - 74, FLOOR_Y - 70 - bob + (wind ? 12 : -12), '#e2a75c', 6);
  }

  function drawGlove() {
    if (glove.phase === 'warn' || glove.phase === 'look') {
      var k = glove.phase === 'look' ? 1 : Math.min(1, glove.t / glove.dur);
      var sw = 120 + 120 * k;
      for (var r = 0; r < 6; r++) {
        var ww = sw * Math.sqrt(1 - Math.pow((r - 2.5) / 3, 2));
        game.draw.rect(glove.x - ww, FLOOR_Y - 18 + r * 6, ww * 2, 6, '#000000', 0.12 + 0.16 * k);
      }
      if (glove.phase === 'warn' && Math.floor(game.time.elapsed * 12) % 2 === 0) {
        game.draw.line(glove.x - sw, FLOOR_Y - 26, glove.x + sw, FLOOR_Y - 26, STYLE.accent[1], 5);
      }
    }
    if (glove.y > -300) {
      var shut = glove.phase === 'look' && Math.floor(glove.t * 4) % 2 === 1;
      game.draw.rect(glove.x - 60, -20, 120, glove.y + 30, '#c0564b', 0.85);
      game.draw.sprite(shut ? GLOVE_SHUT : GLOVE_OPEN, GLOVE_PAL, glove.x, glove.y + 110, 24, { anchor: 'center', flipY: true });
      if (glove.phase === 'look') game.draw.circle(glove.x, glove.y + 110, 170, '#fff2c8', 0.12 + 0.06 * Math.sin(glove.t * 12));
    }
  }

  function drawPad(pressing) {
    var pulse = Math.sin(game.time.elapsed * 3) * 6;
    game.draw.circle(PAD_X, PAD_Y, PAD_R + 16 + pulse, STYLE.accent[0], pressing ? 0.45 : 0.18);
    game.draw.circle(PAD_X, PAD_Y, PAD_R, '#3b3128', 1);
    game.draw.circle(PAD_X, PAD_Y, PAD_R - 14, pressing ? '#6e5a47' : '#4d3f33', 1);
    game.draw.sprite(FOOT, { '#': pressing ? STYLE.accent[0] : STYLE.main[1] }, PAD_X, PAD_Y + (pressing ? 6 : 0), 18, { anchor: 'center' });
  }

  function drawHud() {
    say((Math.min(legsDone, LEGS)) + ' / ' + LEGS, W / 2, 96, 46, STYLE.main[0]);
    for (var i = 0; i < LEGS; i++) {
      game.draw.circle(W / 2 - 80 + i * 80, 140, 16, legsDone > i ? STYLE.accent[0] : '#4d3f33', 1);
    }
    var bw = W - 160;
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 184, bw, 16, '#1c1713', 1);
    game.draw.rect(80, 184, bw * Math.max(0, timeLeft / TIME_LIMIT), 16, low ? STYLE.accent[1] : STYLE.main[0], 1);
    var prog = (doll.x - X0) / (X1 - X0);
    game.draw.rect(80, 212, bw * prog, 6, STYLE.accent[0], 0.8);
  }

  function drawScene(highlight, pressing) {
    drawRoom();
    drawBlocks();
    drawDoll(highlight);
    drawGlove();
    drawPad(pressing);
  }

  game.onUpdate(function(dt) {
    if (mode === MODE.ATTRACT) {
      stepDemo(dt);
      drawScene(demo.flash > 0, demo.press);
      game.draw.hand(PAD_X + 20, PAD_Y - 10, { press: demo.press, scale: 15 });
      var sway = Math.sin(game.time.elapsed * 1.6) * 6;
      say(GAME_TITLE, W / 2 + sway, H * 0.08, 60, STYLE.accent[0]);
      say('HI-SCORE ' + Math.round(game.best || 0), W / 2, H * 0.13, 30, STYLE.main[0]);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) say('► 100円 投入 ◄', W / 2, H * 0.95, 40, STYLE.accent[0]);
      else say('INSERT COIN', W / 2, H * 0.95, 30, STYLE.main[0]);
      return;
    }

    if (mode === MODE.RESULT) {
      drawScene(false, false);
      say(cleared ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 64, cleared ? STYLE.accent[0] : STYLE.accent[1]);
      say(legsDone + ' / ' + LEGS, W / 2, H * 0.14, 40, STYLE.main[0]);
      if (cleared) say('SCORE ' + (legsDone * 100 + Math.round(timeLeft * 20)), W / 2, H * 0.18, 34, STYLE.main[0]);
      else say('あと' + Math.max(1, Math.round((1 - (doll.x - X0) / (X1 - X0)) * 100)) + '%!', W / 2, H * 0.18, 34, STYLE.main[0]);
      say('BEST ' + Math.round(game.best || 0), W / 2, H * 0.22, 28, STYLE.main[1]);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) say('TAP TO CONTINUE', W / 2, H * 0.95, 30, STYLE.main[0]);
      return;
    }

    // ── PLAYING ──
    if (endT > 0) {
      endT -= dt;
      if (endT <= 0) {
        mode = MODE.RESULT;
        var stats = { legs: legsDone, freezes: freezes, timeLeft: Math.round(timeLeft * 10) / 10 };
        if (cleared) game.end.success(legsDone * 100 + Math.round(timeLeft * 20), stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) endT = 1.0;
    } else if (countIn > 0) {
      countIn -= dt;
      moveGlove(0);
      if (countIn <= 0) { live = true; game.audio.play('se_tap', 0.4); }
    } else if (live) {
      timeLeft -= dt;
      walking = game.input.pressing;
      moveGlove(dt);
      walkDoll(dt, walking);
      if (live && spotted(walking)) finishRound(false);
      if (live && timeLeft <= 0) { timeLeft = 0; finishRound(false); }
    }

    drawScene(stopT > 0, live && game.input.pressing);
    drawHud();
    if (countIn > 0) say(countIn > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 80, STYLE.accent[0]);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.5], ['E4', 0.5], ['G4', 0.25], ['E4', 0.25], ['D4', 0.5], ['B3', 0.5], ['C4', 1]], { tempo: 104, wave: 'triangle', volume: 0.05, loop: true, bass: true });
    mode = MODE.ATTRACT;
    initRound();
  });
})(game);

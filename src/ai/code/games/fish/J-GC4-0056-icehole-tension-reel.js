// J-GC4-0056-icehole-tension-reel.js
// 氷穴のテンション巻き — 押している間だけリールを巻く。糸の張りを緑の帯に保ったまま巻き続け、魚が暴れる合図では緩めて切られずに釣り上げる
// 操作: 画面を押し続けると巻いて張りが上がり、離すと糸を送って張りが下がる。張りが帯の中にあれば魚が寄ってくる(巻いている間は速く)。張りすぎると糸が切れ、緩めすぎが続くと逃げられる
// 終わり: 3匹釣り上げればCLEAR。2匹逃がす(糸切れ・バラし)か時間切れでGAME OVER
// @mechanic: hold_duration
// @theme: icehole_tension_reel
// 世界観: 凍った湖の真ん中、氷に開けた小さな穴で、毛糸帽の子どもが祖父の古いリールで引きの強い冬の魚と力比べ。糸の張りを指先の押し加減だけで保って3匹を釣り上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 釣った数・帯の中にいた割合
// スタイル: 90s HANDHELD COLOR

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 低彩度・少色、小画面前提の太い形、密度を抑える
  var STYLE = {
    bg: ['#d8e0e8', '#a8b8c8', '#5a6a88'],
    main: ['#e87858', '#f0c060', '#384058'],
    accent: ['#68b890', '#d85858'],
  };
  var ICE = STYLE.bg[0];
  var WATER = '#3a5a78';
  var INK = STYLE.main[2];
  var GREEN = STYLE.accent[0];
  var RED = STYLE.accent[1];
  var GOLD = STYLE.main[1];

  var GAME_TITLE = 'ICE HOLE REEL';
  var TIME_LIMIT = 15;
  var NEEDED = 3;
  var MAX_LOST = 2;
  var BAND_LO = 0.35, BAND_HI = 0.75;
  var REEL_UP = 0.55, GIVE = 0.95;
  var SLACK_T = 1.5;
  var HOLE_X = W * 0.42, HOLE_Y = H * 0.43;
  var GAUGE_X = W - 150, GAUGE_Y = 420, GAUGE_H = 760;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var KID = [
    [
      '..rrrr..',
      '.rrrrrr.',
      '..ssss..',
      '..s..s..',
      '.bbbbbb.',
      'bbbbbbbb',
      '.bbbbbb.',
      '..kk.kk.',
    ],
    [
      '..rrrr..',
      '.rrrrrr.',
      '..ssss..',
      '..s..s..',
      '.bbbbbb.',
      'bbbbbbbb',
      'b.bbbb.b',
      '..kk.kk.',
    ],
  ];
  var KID_PAL = { r: STYLE.main[0], s: '#f0d0b0', b: '#5878a8', k: INK };
  var FISH = [
    ['....ff...', '..fffff.f', '.fwfffffff', 'fffffffff.', '..fffff.f', '....f....'],
    ['....ff...', '..fffff..', '.fwffffff.', 'ffffffffff', '..fffff..', '....f....'],
  ];
  var BUCKET = ['kkkkkk', 'k....k', 'k....k', '.kkkk.'];
  var FLAKE = ['.w.', 'www', '.w.'];

  var tension, reelProg, slackT, fishState, biteT, surge, nextSurge, caught, lost, timeLeft, ready;
  var hitStop, hitKind, ended, endWait, won, score, inBandT, totalT, clean, holding, fishX, fishPow;

  function txt(s, x, y, size, color, align) {
    game.draw.text(s, x + 3, y + 3, { size: size, color: '#ffffff', bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: align || 'center' });
  }

  function newFish() {
    fishState = 'bite';
    biteT = 0.45;
    tension = 0.45;
    reelProg = 0;
    slackT = 0;
    surge = null;
    nextSurge = game.random(0.9, 1.5);
    clean = true;
    fishX = 0;
    fishPow = 1 + caught * 0.25;
  }

  function initGame() {
    caught = 0;
    lost = 0;
    timeLeft = TIME_LIMIT;
    ready = 0.8;
    hitStop = 0;
    hitKind = '';
    ended = false;
    endWait = 0;
    won = false;
    score = 0;
    inBandT = 0;
    totalT = 0;
    holding = false;
    newFish();
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

  function stepFish(dt, demo) {
    var t = game.time.elapsed;
    if (fishState === 'bite') {
      biteT -= dt;
      if (biteT <= 0) {
        fishState = 'fight';
        if (!demo) game.audio.play('se_jump', 0.3);
      }
      return;
    }
    if (fishState !== 'fight') return;
    totalT += dt;
    // 暴れ(0.6秒前に予告)
    nextSurge -= dt;
    if (!surge && nextSurge <= 0) {
      surge = { warn: 0.6, left: game.random(0.6, 0.95) };
      if (!demo) game.audio.tone('E3', 0.1, { wave: 'square', volume: 0.06 });
    }
    var pull = 0.12 * fishPow;
    if (surge) {
      if (surge.warn > 0) surge.warn -= dt;
      else {
        surge.left -= dt;
        pull = 1.25 * fishPow;
        if (surge.left <= 0) { surge = null; nextSurge = game.random(1.0, 1.7); }
      }
    }
    tension += (holding ? REEL_UP : -GIVE) * dt + pull * dt;
    tension = Math.max(0, tension);
    fishX = Math.sin(t * 3) * 120 + (surge && surge.warn <= 0 ? Math.sin(t * 25) * 40 : 0);

    var inBand = tension >= BAND_LO && tension <= BAND_HI;
    if (inBand) inBandT += dt;
    else clean = false;
    if (inBand) {
      // 帯の中なら寄ってくる(巻いている間は速く)
      reelProg += (holding ? 0.8 : 0.28) * dt;
      if (!demo && Math.random() < dt * 8) game.audio.tone(300 + reelProg * 500, 0.03, { wave: 'triangle', volume: 0.03 });
    }
    if (tension > 1) {
      hitStop = 0.45;
      hitKind = 'snap';
      return;
    }
    if (tension < 0.12) slackT += dt; else slackT = 0;
    if (slackT > SLACK_T) {
      hitStop = 0.45;
      hitKind = 'slack';
      return;
    }
    if (reelProg >= 1) {
      hitStop = 0.35;
      hitKind = 'catch';
    }
  }

  function resolveHit(demo) {
    if (hitKind === 'catch') {
      caught++;
      var pts = 200 + (clean ? 150 : 0) + Math.round(timeLeft * 10);
      score += pts;
      game.feedback.good(HOLE_X, HOLE_Y - 220, { text: clean ? 'PERFECT' : 'GOOD', color: GREEN, count: 22, volume: demo ? 0 : undefined });
      if (!demo) game.audio.play('se_coin', 0.5);
      if (!demo && caught === 2) {
        game.fx.popup(caught + ' / ' + NEEDED, W / 2, 330, { color: GOLD, size: 64 });
        game.audio.play('se_milestone', 0.5);
      }
      if (caught >= NEEDED && !demo) { endGame(true, demo); return; }
    } else {
      lost++;
      game.feedback.bad(HOLE_X, HOLE_Y - 200, { text: 'MISS', volume: demo ? 0 : undefined });
      if (!demo) game.audio.play('se_break', 0.3);
      if (lost >= MAX_LOST && !demo) { endGame(false, demo); return; }
    }
    hitKind = '';
    newFish();
  }

  // ── 描画 ──
  function drawBackground() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, '#b8c8d8'], [0.2, '#e0e8f0'], [0.22, ICE], [0.55, STYLE.bg[1]], [0.56, WATER], [1, '#1e2e48']]);
    // 遠景の林
    for (var i = 0; i < 9; i++) {
      var tx = i * 130 + 20;
      for (var s = 0; s < 5; s++) game.draw.rect(tx + s * 8, 300 + s * 18, 70 - s * 16, 18, '#6a7a88');
    }
    // 雪
    for (var f = 0; f < 16; f++) {
      var fx = (f * 131 + Math.sin(t + f) * 30) % W;
      var fy = (f * 97 + t * 50) % 1000 + 240;
      game.draw.sprite(FLAKE, { w: '#ffffff' }, fx, fy, 5, { anchor: 'center', alpha: 0.7 });
    }
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.02 * Math.sin(t * 1.3));
  }

  function drawIceAndFish() {
    var t = game.time.elapsed;
    // 氷穴
    game.draw.rect(HOLE_X - 110, HOLE_Y - 20, 220, 40, INK);
    game.draw.rect(HOLE_X - 96, HOLE_Y - 12, 192, 24, WATER);
    // 断面: 氷の厚み
    game.draw.rect(0, 1040, W, 16, '#ffffff', 0.6);
    // 釣り人と竿
    var bob = Math.sin(t * 2) * 3;
    game.draw.sprite(BUCKET, { k: INK }, HOLE_X - 240, HOLE_Y + 10, 14, { anchor: 'center' });
    game.draw.sprite(KID[holding ? Math.floor(t * 8) % 2 : 0], KID_PAL, HOLE_X - 240 + Math.sin(t * 1.3) * 4, HOLE_Y - 100 + bob, 17, { anchor: 'center' });
    var bend = Math.min(1.2, tension) * 90;
    game.draw.line(HOLE_X - 190, HOLE_Y - 110, HOLE_X - 20, HOLE_Y - 200 + bend, INK, 8);
    // 糸(張りで色が変わる)
    var lineCol = tension > BAND_HI ? RED : (tension < BAND_LO ? '#a8b8c8' : GREEN);
    var fy = 1560 - reelProg * 480;
    var fx = HOLE_X + fishX;
    game.draw.line(HOLE_X - 20, HOLE_Y - 200 + bend, HOLE_X, HOLE_Y, lineCol, 4);
    if (fishState !== 'bite') game.draw.line(HOLE_X, HOLE_Y, fx, fy, lineCol, tension > BAND_HI ? 6 : 3);
    else game.draw.line(HOLE_X, HOLE_Y, HOLE_X, HOLE_Y + 200 + Math.sin(t * 20) * 20, '#a8b8c8', 3);
    // 魚(水中の影)
    if (fishState !== 'bite') {
      var warn = surge && surge.warn > 0;
      if (warn && Math.floor(t * 12) % 2 === 0) game.draw.circle(fx, fy, 110, RED, 0.35);
      game.draw.sprite(FISH[Math.floor(t * 6) % 2], { f: '#2a3a58', w: '#ffffff' }, fx, fy, 16, { anchor: 'center', flipX: fishX < 0 });
      if (surge && surge.warn <= 0) for (var b = 0; b < 4; b++) game.draw.circle(fx + game.random(-80, 80), fy - game.random(20, 90), 10, '#ffffff', 0.7);
    }
    if (hitStop > 0) {
      var g = (0.45 - hitStop) * 140;
      game.draw.circle(HOLE_X, HOLE_Y, 90 + g, '#ffffff', 0.45);
    }
  }

  function drawGauge() {
    var t = game.time.elapsed;
    game.draw.rect(GAUGE_X - 8, GAUGE_Y - 8, 76, GAUGE_H + 16, INK);
    game.draw.rect(GAUGE_X, GAUGE_Y, 60, GAUGE_H, '#e8eef4');
    var y = function (v) { return GAUGE_Y + GAUGE_H - v * GAUGE_H; };
    game.draw.rect(GAUGE_X, y(BAND_HI), 60, (BAND_HI - BAND_LO) * GAUGE_H, GREEN, 0.8);
    game.draw.rect(GAUGE_X, y(1), 60, 40, RED, 0.8);
    var tv = Math.min(1.05, tension);
    game.draw.rect(GAUGE_X - 30, y(tv) - 8, 120, 16, tension > BAND_HI ? RED : INK);
    // 巻き上げ進捗
    game.draw.rect(60, GAUGE_Y, 20, GAUGE_H, '#e8eef4', 0.8);
    game.draw.rect(60, GAUGE_Y + GAUGE_H * (1 - reelProg), 20, GAUGE_H * reelProg, GOLD);
    game.draw.circle(70, GAUGE_Y + GAUGE_H * (1 - reelProg), 18, GOLD, 0.7 + 0.3 * Math.sin(t * 6));
  }

  function drawReelButton() {
    var t = game.time.elapsed;
    var y = H * 0.86;
    game.draw.circle(W / 2, y, 150, INK);
    game.draw.circle(W / 2, y, 138, holding ? GOLD : '#e8eef4', holding ? 1 : 0.8 + 0.1 * Math.sin(t * 2));
    // リールのハンドル(押している間だけ回る)
    var ang = holding ? t * 10 : 0.6;
    game.draw.line(W / 2, y, W / 2 + Math.cos(ang) * 90, y + Math.sin(ang) * 90, INK, 16);
    game.draw.circle(W / 2 + Math.cos(ang) * 90, y + Math.sin(ang) * 90, 22, STYLE.main[0]);
    game.draw.circle(W / 2, y, 26, INK);
    for (var i = 0; i < MAX_LOST; i++) game.draw.sprite(FISH[0], { f: i < MAX_LOST - lost ? '#2a3a58' : '#a8b8c8', w: '#ffffff' }, 110 + i * 150, y + 170, 7, { anchor: 'center' });
  }

  function drawScene() {
    drawBackground();
    drawIceAndFish();
    drawGauge();
    drawReelButton();
  }

  function drawHud() {
    txt(caught + ' / ' + NEEDED, 60, 110, 56, INK, 'left');
    txt('SCORE ' + score, W - 60, 110, 38, INK, 'right');
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 165, W - 120, 18, INK);
    game.draw.rect(64, 169, (W - 128) * Math.max(0, timeLeft / TIME_LIMIT), 10, low ? RED : GREEN);
  }

  // ── ATTRACT ゴースト実演: 帯の中に保つ/暴れを無視して切られる ──
  var demo = { t: 0, loop: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.loop++; }
    var careless = demo.loop % 2 === 0 && cyc > 3;
    var danger = surge && (surge.warn <= 0.25);
    if (holding) holding = tension < 0.66 && (!danger || careless);
    else holding = tension < 0.45 && (!danger || careless);
    if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) resolveHit(true);
    } else {
      stepFish(dt, true);
    }
  }

  game.onPress(function (x, y) {
    if (state !== S.PLAYING || ended || ready > 0) return;
    holding = true;
    game.audio.play('se_tap', 0.2);
  });
  game.onRelease(function (x, y) {
    if (state !== S.PLAYING) return;
    holding = false;
    game.audio.tone('A4', 0.04, { wave: 'triangle', volume: 0.04 });
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
    if (tension === undefined) initGame();

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(W / 2 + 40, H * 0.87 + (holding ? 0 : 50), { press: holding, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 70, INK);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.12, 34, STYLE.main[0]);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.975, 42, STYLE.main[0]);
      else txt('INSERT COIN', W / 2, H * 0.975, 32, INK);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, 230, W, 420, '#ffffff', 0.85);
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, 350, 88, won ? GREEN : RED);
      txt('SCORE ' + score, W / 2, 430, 46, INK);
      txt(caught + ' / ' + NEEDED + '   ' + (totalT > 0 ? Math.round(inBandT / totalT * 100) : 0) + '%', W / 2, 500, 40, STYLE.main[0]);
      if (won && score >= (game.best || 0)) txt('NEW RECORD', W / 2, 570, 42, GOLD);
      else txt('BEST ' + (game.best || 0), W / 2, 570, 34, INK);
      if (!won) txt('あと' + (NEEDED - caught) + '匹!', W / 2, 625, 36, RED);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.975, 34, INK);
      return;
    }

    // PLAYING
    if (ended) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { caught: caught, inBand: totalT > 0 ? Math.round(inBandT / totalT * 100) : 0 };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.25);
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) resolveHit(false);
    } else {
      // 押し加減はポインタの実状態から読む(GO!前から押していても効く)
      holding = game.input.pressing;
      timeLeft -= dt;
      stepFish(dt, false);
      if (timeLeft <= 0 && hitStop <= 0) {
        timeLeft = 0;
        game.feedback.bad(HOLE_X, HOLE_Y - 200, { text: 'TIME UP' });
        endGame(false, false);
      }
    }

    drawScene();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, 620, 96, STYLE.main[0]);
  });

  game.onStart(function () {
    game.audio.melody(
      [['A4', 0.5], ['E4', 0.5], ['A4', 0.5], ['B4', 0.5], ['C5', 1], ['B4', 0.5], ['G4', 0.5], ['A4', 1]],
      { tempo: 100, wave: 'triangle', volume: 0.05, loop: true, bass: true }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);

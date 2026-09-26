// J-N6424-0049-wool-slope-dodge.js
// ウールスロープ・ドッジ — 丘の紡ぎ小屋から転がり落ちる毛糸の大玉を、ふもとの子羊が走ってかわし切る
// 操作: 画面を押している間、子羊が指の横位置へ駆ける(離すとその場で止まる)
// 終わり: 18秒間一度も当たらなければCLEAR。毛糸玉に当たった瞬間GAME OVER
// @mechanic: dodge
// @theme: wool_hill_roll_dodge
// 世界観: 丘の上の紡ぎ小屋で糸車が暴れ出し、次々と転がり落ちてくる毛糸の大玉を、ふもとの牧草地で番をする子羊が左右に駆けてかわし続け、夕方の鐘まで無傷で耐え抜く
// 残るもの: 正誤(CLEAR/GAME OVER) + かすめてかわした回数と耐えた秒数
// スタイル: 90s LOW POLY

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s LOW POLY: フラットシェードの面、明暗2トーンのファセット、彩度控えめ
  var STYLE = {
    bg: ['#8ec9e8', '#f3d2a2', '#6fa850'],
    main: ['#4f8a38', '#3b6a2a', '#eee8d6'],
    accent: ['#e0507a', '#ffc93a']
  };

  var TITLE = 'WOOL SLOPE';
  var TIME_LIMIT = 18;
  var TOP_Y = H * 0.25;
  var LAMB_Y = H * 0.76;
  var MIN_X = W * 0.1;
  var MAX_X = W * 0.9;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var LAMB_A = [
    '....ww....',
    '..wwwwwkk.',
    '.wwwwwwkek',
    'wwwwwwwkkk',
    'wwwwwwww..',
    '.wwwwwww..',
    '.k.k..k.k.',
    '.k.k..k.k.'
  ];
  var LAMB_B = [
    '....ww....',
    '..wwwwwkk.',
    '.wwwwwwkek',
    'wwwwwwwkkk',
    'wwwwwwww..',
    '.wwwwwww..',
    '..k.kk.k..',
    '.k...k...k'
  ];
  var LAMB_PAL = { w: '#f4f0e2', k: '#3a2f2f', e: '#ffffff' };

  var YARN_A = [
    '...yyy...',
    '.yyzyyyy.',
    '.yzyyyzy.',
    'yyyyzyyyy',
    'yzyyyyzyy',
    'yyyzyyyyy',
    '.yyyyzyy.',
    '.yzyyyyy.',
    '...yyy...'
  ];
  var YARN_B = [
    '...yyy...',
    '.yyyyzyy.',
    '.yyzyyyy.',
    'yzyyyyyzy',
    'yyyzyyyyy',
    'yyyyyzyyy',
    '.yzyyyyy.',
    '.yyyzyyy.',
    '...yyy...'
  ];
  var YARN_PAL = { y: STYLE.accent[0], z: '#ffd3df' };
  var BIG_PAL = { y: '#8a4fd0', z: '#e5d0ff' };

  var HUT = [
    '....rrrr....',
    '..rrrrrrrr..',
    'rrrrrrrrrrrr',
    '.bbbbbbbbbb.',
    '.bbwwbbbbbb.',
    '.bbwwbbddbb.',
    '.bbbbbbddbb.',
    '.bbbbbbddbb.'
  ];
  var HUT_PAL = { r: '#9c3b2e', b: '#d9b98a', w: '#fff3b0', d: '#5a3a22' };

  var lambX, targetX, holding, balls, spawnT, timeLeft, ready, hitStop, endWait;
  var finished, ok, grazes, hitBall, bigSent, halfDone, tickT, score, walkT, survived;

  function clampX(x) { return Math.max(MIN_X, Math.min(MAX_X, x)); }
  function frac() { return 1 - timeLeft / TIME_LIMIT; }

  function initGame() {
    lambX = W * 0.5; targetX = lambX; holding = false; balls = []; spawnT = 0.5;
    timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0; endWait = 0;
    finished = false; ok = false; grazes = 0; hitBall = null; bigSent = false;
    halfDone = false; tickT = 0; score = 0; walkT = 0; survived = 0;
  }

  function spawnBall(tx, big, roll) {
    balls.push({
      tx: clampX(tx), t: 0, warn: 0.7,
      roll: roll || (big ? 1.5 : 1.25 - 0.4 * frac()),
      big: big, passed: false, spin: 0
    });
  }

  // 奥(小屋)から手前(子羊)へ転がる疑似遠近。p=1で子羊のライン
  function ballPos(b) {
    var p = Math.max(0, (b.t - b.warn) / b.roll);
    var y = TOP_Y + (LAMB_Y - TOP_Y) * p;
    var x = W / 2 + (b.tx - W / 2) * (0.3 + 0.7 * p);
    var r = (20 + 52 * Math.min(1.3, p)) * (b.big ? 1.75 : 1);
    return { x: x, y: y, r: r, p: p };
  }

  function stepWorld(dt, live) {
    walkT += dt;
    if (holding) {
      var d = targetX - lambX;
      var mv = 1500 * dt;
      if (Math.abs(d) <= mv) lambX = targetX; else lambX += d > 0 ? mv : -mv;
    }
    lambX = clampX(lambX);
    for (var i = balls.length - 1; i >= 0; i--) {
      var b = balls[i];
      var wasWarn = b.t < b.warn;
      b.t += dt;
      b.spin += dt * (4 + 6 * Math.max(0, (b.t - b.warn) / b.roll));
      if (live && wasWarn && b.t >= b.warn) game.audio.play('se_jump', 0.12);
      var q = ballPos(b);
      if (q.p > 0 && !b.passed) {
        var dx = Math.abs(q.x - lambX);
        if (Math.abs(q.y - LAMB_Y) < q.r * 0.55 + 18 && dx < q.r + 28) return b;
        if (q.y > LAMB_Y + q.r * 0.6) {
          b.passed = true;
          if (dx < q.r + 120) {
            if (live) {
              grazes++;
              game.feedback.good(q.x, LAMB_Y - 90, { text: 'NICE', color: STYLE.accent[1], count: 8, size: 40 });
            } else {
              game.fx.burst(q.x, LAMB_Y - 40, { color: STYLE.accent[1], count: 6, speed: 220 });
            }
          }
        }
      }
      if (q.y > H + 160) balls.splice(i, 1);
    }
    return null;
  }

  // ── 背景(ローポリの丘:1本の三角山を明暗2面で塗り分け) ──
  function facetMountain(cx, baseY, halfW, hgt, lite, dark) {
    for (var y = 0; y < hgt; y += 6) {
      var w = halfW * (y / hgt);
      game.draw.rect(cx - w, baseY - hgt + y, w, 6, lite);
      game.draw.rect(cx, baseY - hgt + y, w, 6, dark);
    }
  }

  function drawScene() {
    var el = game.time.elapsed;
    game.draw.gradient(0, H * 0.5, [[0, STYLE.bg[0]], [0.75, STYLE.bg[1]], [1, '#f6e0b8']]);
    facetMountain(W * 0.2, H * 0.3, 260, 230, '#a7b8c9', '#8397ab');
    facetMountain(W * 0.78, H * 0.3, 320, 280, '#9fb2c4', '#7a8ea3');
    // 雲(ゆっくり流れる)
    for (var c = 0; c < 3; c++) {
      var cx = ((el * (18 + c * 7) + c * 390) % (W + 300)) - 150;
      game.draw.rect(cx, H * (0.08 + c * 0.045), 150, 26, '#ffffff', 0.7);
      game.draw.rect(cx + 30, H * (0.08 + c * 0.045) - 18, 80, 20, '#ffffff', 0.7);
    }
    // 牧草地の斜面:帯ごとに明暗を交互、中央線で左右の面を分ける
    game.draw.rect(0, H * 0.3, W, H * 0.7, STYLE.main[1]);
    for (var y = TOP_Y - 10; y < H; y += 8) {
      var p = (y - TOP_Y) / (LAMB_Y - TOP_Y);
      var half = W * (0.14 + 0.36 * Math.max(0, p));
      var band = Math.floor((y - TOP_Y) / 90) % 2 === 0;
      game.draw.rect(W / 2 - half, y, half, 8, band ? '#5f9a44' : STYLE.main[0]);
      game.draw.rect(W / 2, y, half, 8, band ? STYLE.main[0] : '#467a32');
    }
    // 小屋と糸車(回転を2本の軸線で表現)
    var hutBob = Math.sin(el * 3) * 3;
    game.draw.sprite(HUT, HUT_PAL, W / 2, TOP_Y - 70 + hutBob, 11, { anchor: 'center' });
    var wa = el * 5;
    game.draw.circle(W / 2 + 90, TOP_Y - 40, 34, '#6b4a2b');
    game.draw.circle(W / 2 + 90, TOP_Y - 40, 26, '#d9b98a');
    game.draw.line(W / 2 + 90 - Math.cos(wa) * 26, TOP_Y - 40 - Math.sin(wa) * 26, W / 2 + 90 + Math.cos(wa) * 26, TOP_Y - 40 + Math.sin(wa) * 26, '#6b4a2b', 5);
    game.draw.line(W / 2 + 90 - Math.sin(wa) * 26, TOP_Y - 40 + Math.cos(wa) * 26, W / 2 + 90 + Math.sin(wa) * 26, TOP_Y - 40 - Math.cos(wa) * 26, '#6b4a2b', 5);
    // 画面全体の明滅(夕暮れの呼吸)
    game.draw.rect(0, 0, W, H, '#ffb070', 0.04 + 0.04 * Math.sin(el * 1.4));

    // 予告(警告線+点滅!マーカー)→ 転がる毛糸玉
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      if (b.t < b.warn) {
        var blink = Math.floor(b.t * 10) % 2 === 0;
        var sx = W / 2 + (b.tx - W / 2) * 0.3;
        for (var k = 0; k < 10; k++) {
          var pp = k / 10;
          var ly = TOP_Y + (LAMB_Y - TOP_Y) * pp;
          var lx = W / 2 + (b.tx - W / 2) * (0.3 + 0.7 * pp);
          game.draw.rect(lx - 6, ly, 12, 30, '#ff3b3b', blink ? 0.55 : 0.25);
        }
        game.draw.rect(sx - 10, TOP_Y - 150, 20, 56, '#ff3b3b', blink ? 1 : 0.4);
        game.draw.rect(sx - 10, TOP_Y - 84, 20, 18, '#ff3b3b', blink ? 1 : 0.4);
        if (b.big) game.draw.circle(b.tx, LAMB_Y + 30, 150, '#ff3b3b', blink ? 0.25 : 0.1);
      }
    }
    for (var j = 0; j < balls.length; j++) {
      var bb = balls[j];
      if (bb.t < bb.warn) continue;
      var q = ballPos(bb);
      game.draw.circle(q.x, q.y + q.r * 0.8, q.r * 0.9, '#2b4a1e', 0.35);
      var px = Math.max(3, (q.r * 2) / 9);
      var highlighted = hitBall === bb && (hitStop > 0 || demo.flash > 0);
      if (highlighted) {
        game.draw.circle(q.x, q.y, q.r * 1.6, '#ffffff', 0.85);
        px *= 1.35;
      }
      // 後ろにたなびく糸
      game.draw.line(q.x, q.y, W / 2 + (bb.tx - W / 2) * 0.3, TOP_Y, bb.big ? BIG_PAL.y : YARN_PAL.y, 3);
      game.draw.sprite(Math.floor(bb.spin) % 2 === 0 ? YARN_A : YARN_B, bb.big ? BIG_PAL : YARN_PAL, q.x, q.y, px, { anchor: 'center' });
    }

    // 子羊(待機中もゆらゆら)
    var moving = holding && Math.abs(targetX - lambX) > 4;
    var frame = moving ? (Math.floor(walkT * 10) % 2 === 0 ? LAMB_A : LAMB_B) : (Math.floor(game.time.elapsed * 2) % 2 === 0 ? LAMB_A : LAMB_B);
    var bob = Math.sin(game.time.elapsed * 5) * 5 + (moving ? Math.abs(Math.sin(walkT * 14)) * -10 : 0);
    var sway = Math.cos(game.time.elapsed * 2.2) * 4;
    game.draw.circle(lambX, LAMB_Y + 58, 56, '#2b4a1e', 0.3);
    if (ok && (hitStop > 0 || state === S.RESULT)) game.draw.circle(lambX, LAMB_Y, 110, '#fff6c0', 0.6);
    game.draw.sprite(frame, LAMB_PAL, lambX + sway, LAMB_Y + bob, 13, { anchor: 'center', flipX: targetX < lambX - 4 });
    // 親指ゾーンの走路帯
    game.draw.rect(MIN_X, H * 0.86, MAX_X - MIN_X, 12, '#ffffff', 0.25);
    game.draw.rect(lambX - 30, H * 0.86 - 6, 60, 24, '#ffffff', holding ? 0.9 : 0.45);
  }

  function txt(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 3, { size: size, color: '#2b3a24', bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 210, '#1f3a2a', 0.45);
    txt(Math.ceil(timeLeft) + '', W / 2, 70, 64, timeLeft < 4 ? STYLE.accent[0] : '#ffffff');
    var bw = W - 160;
    var danger = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 140, bw, 22, '#ffffff', 0.3);
    game.draw.rect(80, 140, bw * Math.max(0, timeLeft / TIME_LIMIT), 22, danger ? STYLE.accent[0] : STYLE.accent[1]);
    game.draw.sprite(YARN_A, YARN_PAL, 90, 70, 6, { anchor: 'center' });
    game.draw.text('x' + grazes, 150, 72, { size: 40, color: '#ffffff', bold: true, align: 'left' });
  }

  function finishRun(success, ball) {
    finished = true; ok = success;
    survived = Math.round((TIME_LIMIT - timeLeft) * 10) / 10;
    if (success) {
      hitStop = 0.45;
      game.fx.flash('#ffffff', 0.2);
    } else {
      hitBall = ball; hitStop = 0.5;
      game.fx.flash('#ffffff', 0.25);
      game.audio.play('se_break', 0.4);
    }
    game.audio.stopBgm();
  }

  function goResult() {
    state = S.RESULT;
    if (ok) {
      score = 100 + grazes * 15;
      game.end.success(score, { grazes: grazes, seconds: TIME_LIMIT });
    } else {
      score = 0;
      game.end.failure({ grazes: grazes, seconds: survived });
    }
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.86, press: false, flash: 0, second: false };
  var DEMO_CYCLE = 3.8;
  function runDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) {
      initGame(); ready = 0; demo.flash = 0; demo.second = false;
      spawnBall(W * 0.5, false, 1.2);
    }
    if (!demo.second && cyc >= 1.2) { demo.second = true; spawnBall(W * 0.26, false, 1.2); }
    demo.press = cyc > 0.75 && cyc < 1.5;
    holding = demo.press;
    if (demo.press) targetX = W * 0.26;
    demo.gx = cyc > 0.55 && cyc < 1.7 ? W * 0.26 : lambX + 60;
    demo.gy = H * 0.87;
    if (demo.flash > 0) { demo.flash -= dt; return; }
    var hit = stepWorld(dt, false);
    if (hit) {
      hitBall = hit; hit.passed = true; demo.flash = 0.45;
      game.fx.burst(lambX, LAMB_Y, { color: '#ffffff', count: 12, speed: 300 });
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING; initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || finished) return;
    if (ready > 0) { game.audio.play('se_tap', 0.05); return; }
    holding = true; targetX = clampX(x);
    game.audio.play('se_tap', 0.15);
    game.fx.burst(lambX, LAMB_Y + 50, { color: '#d8f0b0', count: 5, speed: 160 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || finished || ready > 0) return;
    targetX = clampX(x);
    if (Math.random() < 0.08) game.fx.burst(lambX, LAMB_Y + 55, { color: '#d8f0b0', count: 2, speed: 90 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    holding = false;
    if (!finished) game.fx.burst(lambX, LAMB_Y + 55, { color: '#ffffff', count: 3, speed: 80 });
  });

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      runDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(TITLE, W / 2, H * 0.1, 84, '#ffffff');
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.155, 38, STYLE.accent[1]);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 50, STYLE.accent[1]);
      else txt('INSERT COIN', W / 2, H * 0.94, 44, '#ffffff');
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.3, W, H * 0.3, '#1f2a1a', 0.55);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.37, 110, ok ? STYLE.accent[1] : STYLE.accent[0]);
      txt('SCORE ' + score, W / 2, H * 0.45, 56, '#ffffff');
      txt('x' + grazes + '   ' + survived + '秒', W / 2, H * 0.5, 44, '#ffffff');
      if (ok && score > game.best) txt('NEW RECORD', W / 2, H * 0.555, 52, STYLE.accent[1]);
      else if (ok) txt('BEST ' + game.best, W / 2, H * 0.555, 44, '#ffffff');
      else txt('あと' + Math.max(1, Math.ceil(TIME_LIMIT - survived)) + '秒!', W / 2, H * 0.555, 52, STYLE.accent[1]);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 44, '#ffffff');
      return;
    }

    // ── PLAYING ──
    if (endWait > 0) {
      endWait -= dt;
      if (endWait <= 0) goResult();
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) {
        if (ok) {
          game.feedback.good(lambX, LAMB_Y - 120, { text: 'CLEAR', color: STYLE.accent[1], count: 24 });
          game.audio.play('se_success', 0.6);
        } else {
          var hq = ballPos(hitBall);
          game.feedback.bad(hq.x, hq.y, { text: 'MISS' });
          game.audio.play('se_failure', 0.5);
        }
        endWait = 1.1;
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else if (!finished) {
      timeLeft -= dt;
      spawnT -= dt;
      if (spawnT <= 0) {
        var aim = Math.random() < 0.6 ? lambX + game.random(-70, 70) : game.random(MIN_X, MAX_X);
        spawnBall(aim, false);
        spawnT = Math.max(0.5, 1.0 - 0.45 * frac());
      }
      if (!bigSent && timeLeft < 6) {
        bigSent = true;
        spawnBall(lambX, true);
        game.audio.tone('C3', 0.4, { wave: 'sawtooth', volume: 0.12, slide: -60 });
      }
      if (!halfDone && timeLeft < TIME_LIMIT / 2) {
        halfDone = true;
        game.fx.popup('あと' + Math.ceil(timeLeft) + '秒!', W / 2, H * 0.45, { color: STYLE.accent[1], size: 56 });
        game.audio.play('se_milestone', 0.45);
      }
      if (timeLeft < 4) {
        tickT -= dt;
        if (tickT <= 0) { tickT = 1; game.audio.tone('A5', 0.08, { wave: 'square', volume: 0.08 }); }
      }
      var hit = stepWorld(dt, true);
      if (hit) finishRun(false, hit);
      else if (timeLeft <= 0) { timeLeft = 0; finishRun(true, null); }
    }

    drawScene();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 96, '#ffffff');
  });

  game.onStart(function() {
    game.audio.melody([
      ['G4', 0.5], ['B4', 0.25], ['D5', 0.25], ['G5', 0.5], ['E5', 0.5],
      ['D5', 0.5], ['B4', 0.25], ['C5', 0.25], ['A4', 1]
    ], { tempo: 150, wave: 'triangle', volume: 0.06, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

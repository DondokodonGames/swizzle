// J-GC4-0043-market-cart-downhill.js
// 朝市の荷車くだり — 坂の上で荷車を押して勢いを溜め、カーブに合った速さで飛び乗って4つの坂を駆け下りる
// 操作: 押している間は荷車を押して勢いが溜まる。離すと飛び乗って坂を下る。カーブの看板が急なほど、緑の帯は低い位置になる
// 終わり: 4つの坂を時間内に下りきればCLEAR。時間切れでGAME OVER(速すぎるとカーブで横転して時間を失う)
// @mechanic: hold_charge
// @theme: morning_market_cart_downhill
// 世界観: 山あいの朝市へ向かう野菜売りの子が、荷車を押して勢いをつけては飛び乗り、カーブの急さを見て速さを加減しながら4つの坂道を駆け下り、開店の鐘に間に合わせる
// 残るもの: 正誤(CLEAR/GAME OVER) + 到着タイム・PERFECT数・横転数
// スタイル: HYPERCASUAL 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 白背景+単色、柔らかい影の丸い塊。当たり判定が見た目どおり
  var STYLE = { bg: ['#fbfbf7', '#e9f6ef', '#d8efe4'], main: ['#ff7b54', '#3fb68b', '#ffd35c'], accent: ['#5b8cff', '#2d2d3a'] };
  var C = {
    bg1: '#fbfbf7', bg2: '#dff1e8', hill: '#bfe6cf', hillD: '#9fd3b6', road: '#f3eadb', roadD: '#e0d3bd', cart: '#ff7b54', cartD: '#d85a36',
    wheel: '#2d2d3a', veg: '#3fb68b', veg2: '#ffd35c', ink: '#2d2d3a', white: '#ffffff', band: '#3fb68b', bad: '#ff4f5e', gold: '#ffc83d', blue: '#5b8cff', shadow: '#2d2d3a'
  };

  var GAME_TITLE = 'CART DOWNHILL';
  var TIME_LIMIT = 14;
  var SECTIONS = 4;
  var BANDS = [[0.55, 0.72], [0.42, 0.57], [0.64, 0.78], [0.36, 0.49]];
  var SHARP = [1, 2, 0, 2];          // 0=ゆるい 1=ふつう 2=急
  var TOP = { x: W * 0.2, y: H * 0.34 }, BOT = { x: W * 0.78, y: H * 0.64 };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var phase, ready, timeLeft, sec, gauge, holdT, holding, idleT, roll, perfects, tumbles, hitStop, outro, ok, trans, flashCart, maxHold, halfShown;

  // ── sprites ───────────────────────────────────────────────────────
  var KID = [
    ['..hhh..', '.hhhhh.', '..fff..', '..fef..', '.bbbbb.', 'b.bbb.b', '..b.b..', '.k...k.'],
    ['..hhh..', '.hhhhh.', '..fff..', '..fef..', '.bbbbb.', '.bbbbbb', '..b.b..', '..k.k..']
  ];
  var KID_PAL = { h: '#6a4a3a', f: '#ffd8b8', e: C.ink, b: C.blue, k: C.ink };
  var CART = ['.gyg.gy.', 'gyyggygg', 'cccccccc', 'cCCCCCCc', 'cccccccc', '.w....w.'];
  var CART_PAL = { g: C.veg, y: C.veg2, c: C.cart, C: C.cartD, w: C.wheel };
  var SIGNS = [
    ['aaaaa', '....a', '....a', '...aa', '..a..'],
    ['aaaa.', '...a.', '...a.', '..aaa', '...a.'],
    ['aaa..', '..a..', '..a..', 'aaa..', 'a....']
  ];
  var BELL = ['..g..', '.ggg.', '.ggg.', 'ggggg', '..g..'];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x, y + 4, { size: sz, color: 'rgba(45,45,58,0.25)', bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function softShadow(x, y, rx, ry, a) {
    for (var i = 0; i < 5; i++) {
      var k = (i + 0.5) / 5 * 2 - 1;
      var w = rx * Math.sqrt(1 - k * k);
      game.draw.rect(x - w, y + k * ry - ry / 5, w * 2, ry * 0.4 + 1, C.shadow, a);
    }
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; sec = 0; gauge = 0; holdT = 0; holding = false; idleT = 0;
    roll = null; perfects = 0; tumbles = 0; hitStop = 0; outro = 0; ok = false; trans = 0; flashCart = 0; maxHold = 0; halfShown = false;
  }

  function band() { return BANDS[sec % BANDS.length]; }

  function startHold() {
    holding = true; holdT = 0; gauge = 0;
  }

  // 離して飛び乗る(実プレイ・デモ共用)
  function releaseCart(isDemo, forced) {
    holding = false;
    var sp = gauge;
    var b = band();
    var dur = 0.9 + (1 - sp) * 2.4;
    var verdict = sp > b[1] ? 'tip' : (sp >= b[0] ? 'perfect' : 'slow');
    if (forced) verdict = 'slow';
    roll = { t: 0, dur: dur, sp: sp, verdict: verdict, judged: false, tip: 0 };
    phase = isDemo ? phase : 'roll';
    game.audio.play('se_jump', isDemo ? 0.2 : 0.45);
  }

  function stepRoll(dt, isDemo) {
    if (!roll) return;
    if (roll.tip > 0) {
      roll.tip -= dt;
      if (roll.tip <= 0) roll.t = roll.dur * 0.8;
      return;
    }
    roll.t += dt;
    var k = roll.t / roll.dur;
    if (!roll.judged && k >= 0.78) {
      roll.judged = true;
      var p = cartPos(0.8);
      if (roll.verdict === 'tip') {
        roll.tip = 1.1; tumbles += isDemo ? 0 : 1; flashCart = 0.45;
        if (!isDemo) game.feedback.bad(p.x, p.y - 120, { text: 'MISS' });
        else game.audio.play('se_break', 0.15);
        if (!isDemo) game.audio.play('se_break', 0.4);
      } else if (!isDemo) {
        if (roll.verdict === 'perfect') { perfects++; game.feedback.good(p.x, p.y - 120, { text: 'PERFECT', color: C.gold, count: 16 }); }
        else game.feedback.good(p.x, p.y - 120, { text: 'GOOD', color: C.veg, count: 6 });
      }
    }
    if (roll.t >= roll.dur) {
      roll = null;
      if (isDemo) return;
      sec++;
      if (!halfShown && sec === SECTIONS / 2) {
        halfShown = true;
        game.audio.play('se_milestone', 0.5);
        game.fx.popup(sec + ' / ' + SECTIONS, W / 2, H * 0.2, { color: C.cart, size: 64 });
      }
      if (sec >= SECTIONS) finish(true);
      else { phase = 'trans'; trans = 0.3; }
    }
  }

  function cartPos(k) {
    k = Math.max(0, Math.min(1, k));
    var e = k * k;
    return { x: TOP.x + (BOT.x - TOP.x) * e + (k > 0.8 ? (k - 0.8) * 900 : 0), y: TOP.y + (BOT.y - TOP.y) * e };
  }

  function finish(win) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.55; holding = false; flashCart = 0.55;
    game.audio.stopBgm();
    if (win) { game.fx.flash(C.gold, 0.25); game.audio.play('se_success', 0.6); }
    else {
      game.feedback.bad(W / 2, H * 0.45, { text: 'TIME UP' });
      game.audio.play('se_failure', 0.6);
    }
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    if (phase === 'top') {
      startHold(); idleT = 0;
      game.audio.play('se_tap', 0.35);
    } else {
      game.audio.tone('F3', 0.04, { wave: 'triangle', volume: 0.05 });
    }
  });

  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !holding || phase !== 'top') return;
    var b = band();
    game.audio.tone(gauge > b[1] ? 'C3' : (gauge >= b[0] ? 'E5' : 'A3'), 0.08, { wave: 'square', volume: 0.06 });
    releaseCart(false, false);
  });

  // ── demo(帯の中で離す周と、溜めすぎて横転する周を交互に)──────────
  var demo = { t: 0, gx: TOP.x, gy: H * 0.85, press: false, n: 0, stage: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) {
      demo.n++; roll = null; holding = false; gauge = 0; sec = demo.n % BANDS.length; demo.stage = 0;
    }
    var b = band();
    var want = demo.n % 2 ? (b[0] + b[1]) / 2 : Math.min(0.98, b[1] + 0.15);
    demo.gx = W / 2; demo.gy = H * 0.86;
    if (demo.stage === 0 && cyc > 0.3) { startHold(); demo.stage = 1; }
    if (demo.stage === 1) {
      demo.press = true;
      if (gauge >= want) { releaseCart(true, false); demo.stage = 2; demo.press = false; }
    } else demo.press = false;
    stepRoll(dt, true);
  }

  function stepGauge(dt) {
    if (!holding) return;
    holdT += dt;
    var prev = gauge;
    gauge = Math.min(1, Math.pow(holdT / 1.3, 1.3));
    if (prev < band()[0] && gauge >= band()[0]) game.audio.tone('C5', 0.05, { wave: 'sine', volume: 0.05 });
    if (prev < 1 && gauge >= 1) game.audio.play('se_powerup', 0.3);
  }

  // ── drawing ───────────────────────────────────────────────────────
  function drawHill() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg1], [0.6, C.bg2], [1, C.hill]]);
    game.draw.rect(0, 0, W, H, C.white, 0.04 + 0.04 * Math.sin(t * 1.3));
    // 遠くの丸い丘
    for (var i = 0; i < 4; i++) {
      game.draw.circle(160 + i * 260, H * 0.44, 170, i % 2 ? C.hill : C.hillD, 0.6);
    }
    // 坂道(横ストリップで斜めの帯)
    for (var y = TOP.y - 20; y < BOT.y + 60; y += 6) {
      var k = Math.max(0, Math.min(1, (y - TOP.y) / (BOT.y - TOP.y)));
      var cx = TOP.x + (BOT.x - TOP.x) * k;
      game.draw.rect(cx - 170, y, 340, 6, Math.floor(y / 30) % 2 ? C.road : C.roadD);
    }
    // 坂の上の平場
    game.draw.rect(0, TOP.y + 46, TOP.x + 170, 50, C.roadD);
    game.draw.rect(0, TOP.y + 40, TOP.x + 170, 10, C.road);
    // カーブ(下で右へ折れる)
    game.draw.rect(BOT.x - 170, BOT.y + 40, W - BOT.x + 170, 110, C.road);
    softShadow(BOT.x, BOT.y + 160, 260, 20, 0.08);
    // カーブの看板(急さ)
    var sx = W * 0.86, sy = H * 0.52 + Math.sin(t * 2) * 4;
    game.draw.rect(sx - 6, sy, 12, 120, C.ink);
    game.draw.circle(sx, sy, 62, C.ink);
    game.draw.circle(sx, sy, 56, C.gold);
    game.draw.sprite(SIGNS[SHARP[sec % SHARP.length]], { a: C.ink }, sx, sy, 14, { anchor: 'center' });
    // 鐘(ゴール)
    game.draw.sprite(BELL, { g: C.gold }, W * 0.9, H * 0.28 + Math.sin(t * 3) * 6, 14, { anchor: 'center' });
  }

  function drawCart() {
    var t = game.time.elapsed;
    var x, y, kidX, kidY, riding = false;
    if (roll) {
      var k = roll.t / roll.dur;
      var p = cartPos(k);
      x = p.x; y = p.y; riding = true;
      if (roll.tip > 0) { x = cartPos(0.8).x + Math.sin(t * 40) * 10; y = cartPos(0.8).y; }
    } else if (phase === 'trans') {
      x = TOP.x - 400 * (trans / 0.3); y = TOP.y;
    } else {
      var shake = holding ? Math.sin(t * 50) * gauge * 8 : 0;
      x = TOP.x + shake; y = TOP.y;
    }
    softShadow(x, y + 40, 110, 16, 0.14);
    var big = flashCart > 0 ? 1.25 : 1;
    game.draw.sprite(CART, CART_PAL, x, y - 20, 22 * big, { anchor: 'center', flipY: !!(roll && roll.tip > 0 && Math.floor(t * 8) % 2) });
    if (flashCart > 0 && Math.floor(t * 14) % 2 === 0) game.draw.circle(x, y - 20, 140, C.white, 0.5);
    if (riding) { kidX = x - 20; kidY = y - 150; }
    else { kidX = x - 150 - (holding ? gauge * 20 : 0); kidY = y - 12; }
    var fr = KID[holding ? Math.floor(t * (6 + gauge * 14)) % 2 : Math.floor(t * 2) % 2];
    game.draw.sprite(fr, KID_PAL, kidX, kidY + Math.sin(t * 3) * 4, 13, { anchor: 'center' });
  }

  function drawGauge() {
    var gx = 110, gy = H * 0.83, gw = W - 220, gh = 70;
    softShadow(W / 2, gy + gh + 20, gw / 2, 14, 0.08);
    game.draw.rect(gx - 8, gy - 8, gw + 16, gh + 16, C.ink);
    game.draw.rect(gx, gy, gw, gh, C.white);
    var b = band();
    game.draw.rect(gx + gw * b[0], gy, gw * (b[1] - b[0]), gh, C.band, 0.45 + 0.15 * Math.sin(game.time.elapsed * 5));
    game.draw.rect(gx + gw * b[1], gy, gw * (1 - b[1]), gh, C.bad, 0.18);
    var col = gauge > b[1] ? C.bad : (gauge >= b[0] ? C.band : C.cart);
    game.draw.rect(gx, gy + 14, gw * gauge, gh - 28, col);
    game.draw.rect(gx + gw * gauge - 5, gy - 16, 10, gh + 32, C.ink);
  }

  function drawHud() {
    txt(Math.min(sec + 1, SECTIONS) + ' / ' + SECTIONS, W / 2, 90, 66, C.ink);
    txt(timeLeft.toFixed(1), 70, 90, 52, timeLeft < 4 ? C.bad : C.blue, 'left');
    txt('x' + perfects, W - 70, 90, 48, C.gold, 'right');
    game.draw.rect(60, 165, W - 120, 22, '#e7e2d6');
    game.draw.rect(60, 165, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 22, timeLeft < 4 ? C.bad : C.veg);
  }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (flashCart > 0 && phase !== 'stop') flashCart -= dt;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepGauge(dt);
      stepDemo(dt);
      drawHill(); drawCart(); drawGauge();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.07 + Math.sin(t * 2) * 6, 76, C.cart);
      txt('HI-SCORE ' + game.best, W / 2, H * 0.12, 36, C.ink);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 44, C.cart);
      else txt('INSERT COIN', W / 2, H * 0.95, 36, C.ink);
      return;
    }

    if (state === S.RESULT) {
      drawHill(); drawCart();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.22, 90, ok ? C.veg : C.bad);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 40, C.ink);
      return;
    }

    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'top'; idleT = 0; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'top' || phase === 'roll' || phase === 'trans') {
      timeLeft -= dt;
      if (phase === 'top') {
        stepGauge(dt);
        if (holding) {
          if (gauge >= 1) { maxHold += dt; if (maxHold > 0.9) { maxHold = 0; game.feedback.bad(TOP.x - 150, TOP.y - 180, { text: 'MISS' }); gauge = 0.2; releaseCart(false, true); } }
        } else {
          idleT += dt;
          if (idleT > 2.8) { idleT = 0; gauge = 0.15; game.audio.play('se_bad', 0.3); releaseCart(false, true); }
        }
      } else if (phase === 'roll') {
        stepRoll(dt, false);
      } else if (phase === 'trans') {
        trans -= dt;
        if (trans <= 0) { phase = 'top'; idleT = 0; gauge = 0; maxHold = 0; }
      }
      if ((phase === 'top' || phase === 'roll' || phase === 'trans') && timeLeft <= 0) { timeLeft = 0; finish(false); }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      if (outro <= 0) {
        state = S.RESULT;
        var score = Math.round(timeLeft * 100) + perfects * 150;
        var stats = { sections: sec, perfects: perfects, tumbles: tumbles, timeLeft: Math.round(timeLeft * 10) / 10 };
        if (ok) game.end.success(score, stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawHill(); drawCart(); drawGauge(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.22, 96, C.cart);
    if (phase === 'outro') {
      game.draw.rect(0, H * 0.16, W, H * 0.16, C.white, 0.85);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.2, 96, ok ? C.veg : C.bad);
      var sc = Math.round(timeLeft * 100) + perfects * 150;
      txt('SCORE ' + sc, W / 2, H * 0.26, 44, C.ink);
      if (ok && sc > game.best) txt('NEW RECORD', W / 2, H * 0.3, 40, C.gold);
      else if (!ok) txt('あと' + Math.max(1, SECTIONS - sec) + '本!', W / 2, H * 0.3, 44, C.bad);
      else txt('BEST ' + game.best, W / 2, H * 0.3, 36, C.ink);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 1],
      ['F5', 0.5], ['E5', 0.5], ['D5', 0.5], ['B4', 0.5], ['C5', 1.5], ['R', 0.5]
    ], { tempo: 150, wave: 'triangle', volume: 0.07, loop: true, bass: [['C3', 1], ['G3', 1], ['C3', 1], ['G3', 1], ['F3', 1], ['G3', 1], ['C3', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

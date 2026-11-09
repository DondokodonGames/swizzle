// I-Wii-0003v2-rapeseed-whirlwind-basket.js
// 菜の花畑のつむじ風よけ — 押している指のほうへ花売りの娘を歩かせ、くねって吹き寄せるつむじ風をよけながら、頭の花籠の揺れを足で受け止めて市まで運ぶ
// 操作: 画面を押し続けると、娘が指の真下の横位置へ向かって歩く(離すと止まる)。上端で花びらが渦を巻いて赤く瞬き点線が伸びたら、そこからつむじ風がくねりながら降りてくる。急に動き出す・切り返すと頭の籠が振れ、つむじ風がそばをかすめると籠が風下へあおられる。籠が振れた側へ歩いて下に入ると揺れが収まる(社内メモ。画面には出さない)
// 終わり: 20秒歩いて市の門に着けばCLEAR(籠の花束が残っていれば)。つむじ風に当たる・籠が振れ切って花束をこぼす、で3束とも失うとGAME OVER
// @mechanic: dodge
// @theme: spring_rapeseed_field_flower_seller
// 世界観: 春の菜の花畑の畦道で、頭に花籠を乗せた花売りの娘が、畑を這うように吹き寄せるつむじ風をよけ、あおられた籠の下へ足を運んで花束を落とさずに町の市へ向かう
// 残るもの: 正誤(CLEAR/GAME OVER) + 守った花束の数・かすめた回数・スコア
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 粗いドット・輪郭線なし・タイル反復の背景・1方向スクロール
  var STYLE = { bg: ['#58b838', '#3a8a28'], main: ['#f8e038', '#c88848', '#f878a8'], accent: ['#e83828', '#fcfcfc'] };
  var C = {
    leaf: STYLE.bg[0], leafDk: STYLE.bg[1], flower: STYLE.main[0], path: STYLE.main[1], pink: STYLE.main[2], red: STYLE.accent[0], white: STYLE.accent[1],
    ink: '#202020', pathDk: '#a86830', sky: '#88c8f8', wind: '#d8f0f8',
  };

  var GAME_TITLE = 'HANA KAGO';
  var TIME_LIMIT = 20;
  var BUNCHES = 3;
  var GY = Math.round(H * 0.7);
  var MAXV = 560, ACC = 2600;
  var SPILL = 0.62;
  var HIT_R = 72, GRAZE_R = 190;
  var WARN_T = 0.7;
  var FALL_V = 720;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var girl, hold, winds, spawnT, bunches, grazes, score, finalScore, timeLeft, elapsedP, readyT, stopT, stopKind, culprit, fin, cleared, postT, warnT, invT, joyT, scroll, milestone, swayWarnT, spillCause;

  // 花売りの娘(正面・頭上に籠)。歩き2コマ
  var GIRL_A = ['..hhhh..', '.hhhhhh.', '.hsssshh', '..skks..', '..smms..', '.kkkkkk.', 'skkaakks', '..kkkk..', '..kkkk..', '..s..s..', '.ss.....'];
  var GIRL_B = ['..hhhh..', '.hhhhhh.', 'hhsssshh', '..skks..', '..smms..', '.kkkkkk.', 'skkaakks', '..kkkk..', '..kkkk..', '..s..s..', '.....ss.'];
  var GIRL_OUCH = ['..hhhh..', '.hhhhhh.', '.hsssshh', '..sxxs..', '..sOOs..', 's.kkkk.s', '.kkaakk.', '..kkkk..', '..kkkk..', '.s....s.', 'ss....ss'];
  var GIRL_JOY = ['s.hhhh.s', 's.hhhh.s', '.hsssshh', '..s..s..', '..smms..', '.kkkkkk.', '.kkaakk.', '..kkkk..', '..kkkk..', '..s..s..', '.ss..ss.'];
  var GIRL_PAL = { h: '#202020', s: '#fcbc98', k: '#e85898', a: '#fcfcfc', m: '#e83828', x: '#202020', O: '#e83828' };
  var BASKET = ['.yfpfy.', 'yfpfyfp', 'bbbbbbb', '.bbbbb.'];
  var BASKET_PAL = { y: '#f8e038', f: '#fcfcfc', p: '#f878a8', b: '#c88848' };
  var BUNCH = ['.y.p.', 'yypyy', '.ggg.', '..g..'];

  function out(str, x, y, sz, color) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: '#202020', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function initGame() {
    girl = { x: W / 2, v: 0, th: 0, w: 0, step: 0 };
    hold = null; winds = []; spawnT = 1.0; bunches = BUNCHES; grazes = 0; score = 0; finalScore = 0;
    timeLeft = TIME_LIMIT; elapsedP = 0; readyT = 0.8; stopT = 0; stopKind = ''; culprit = null; fin = false; cleared = false;
    postT = 0; warnT = 0; invT = 0; joyT = 0; scroll = 0; milestone = false; swayWarnT = 0; spillCause = '';
  }

  function windX(o, y) { return o.x0 + Math.sin((y - 230) / 260 * o.freq + o.ph) * o.amp; }

  function spawnWind() {
    var k = Math.min(1, elapsedP / TIME_LIMIT);
    var aim = Math.random() < 0.6 ? girl.x : game.random(120, W - 120);
    var o = { x0: Math.max(140, Math.min(W - 140, aim + game.random(-120, 120))), y: 230, warn: WARN_T, amp: 40 + 240 * k * Math.random(), freq: game.random(1.2, 2.2), ph: game.random(0, 6.28), spin: Math.random() < 0.5 ? -1 : 1, passed: false, hit: false };
    winds.push(o);
    game.audio.tone('B4', 0.12, { wave: 'triangle', volume: 0.05, slide: 200 });
    return k;
  }

  // 籠を失う(当たった/振れ切った)
  function loseBunch(x, y, why, o) {
    bunches--; invT = 1.0; girl.th = 0; girl.w = 0; spillCause = why;
    game.audio.play('se_break', 0.3);
    game.fx.burst(girl.x, GY - 120, { color: C.flower, count: 12, speed: 320 });
    if (mode === S.PLAYING && bunches <= 0) {
      stopT = 0.5; stopKind = 'lose'; culprit = o || null;
      game.fx.flash('#ffffff', 0.2);
      return;
    }
    game.feedback.bad(x, y, { text: 'MISS', color: C.red, size: 56 });
  }

  function stepGirl(dt, tx) {
    var want = 0;
    if (tx !== null) { var dx = tx - girl.x; want = Math.max(-MAXV, Math.min(MAXV, dx * 6)); }
    var dv = Math.max(-ACC * dt, Math.min(ACC * dt, want - girl.v));
    girl.v += dv;
    girl.x = Math.max(80, Math.min(W - 80, girl.x + girl.v * dt));
    if (girl.x <= 80 || girl.x >= W - 80) girl.v = 0;
    if (Math.abs(girl.v) > 40) girl.step += dt;
    // 籠の振れ(頭の上の振り子): 足の加速で逆へ振れ、ばねで戻る
    var acc = dv / Math.max(dt, 1 / 120);
    girl.w += (-18 * girl.th - 2.0 * girl.w - acc / 1000) * dt;
    girl.th += girl.w * dt;
  }

  function stepWorld(dt, tx, spawnOn) {
    if (invT > 0) invT -= dt;
    if (joyT > 0) joyT -= dt;
    scroll += dt * 260;
    stepGirl(dt, tx);
    if (Math.abs(girl.th) > SPILL * 0.7) {
      swayWarnT -= dt;
      if (swayWarnT <= 0) { swayWarnT = 0.14; game.audio.tone('E6', 0.04, { wave: 'square', volume: 0.05 }); }
    }
    if (Math.abs(girl.th) > SPILL && invT <= 0) loseBunch(girl.x, GY - 160, 'sway', null);
    if (spawnOn) {
      spawnT -= dt;
      if (spawnT <= 0) {
        var k = spawnWind();
        spawnT = 1.1 - 0.5 * k;
        if (k > 0.5 && Math.random() < 0.3) spawnWind();
      }
    }
    for (var i = winds.length - 1; i >= 0; i--) {
      var o = winds[i];
      if (o.warn > 0) { o.warn -= dt; continue; }
      o.y += FALL_V * dt;
      var wx = windX(o, o.y);
      var d = Math.hypot(wx - girl.x, o.y - (GY - 40));
      if (!o.hit && d < HIT_R && invT <= 0) { o.hit = true; loseBunch(girl.x, GY - 160, 'hit', o); }
      if (!o.passed && !o.hit && o.y > GY + 40) {
        o.passed = true;
        var near = Math.abs(wx - girl.x);
        if (near < GRAZE_R) {
          grazes++; score += 120;
          girl.w += o.spin * 2.4 * (1 - near / GRAZE_R) + (wx < girl.x ? 1.2 : -1.2);
          game.feedback.good(girl.x, GY - 200, { text: 'NICE', color: C.white, size: 44 });
          if (mode === S.PLAYING && !milestone && grazes >= 4) { milestone = true; game.audio.play('se_milestone', 0.5); game.fx.popup('x' + grazes, W / 2, H * 0.2, { color: C.flower, size: 84 }); }
        }
      }
      if (o.y > H + 100) winds.splice(i, 1);
    }
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = score + Math.round(elapsedP * 20) + (win ? bunches * 400 : 0);
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 6; i++) game.fx.burst(150 + i * 155, H * 0.4 + (i % 2) * 160, { color: i % 2 ? C.flower : C.pink, count: 18, speed: 520 });
      game.fx.flash(C.white, 0.25);
    }
  }

  function canPlay() { return mode === S.PLAYING && !fin && stopT <= 0 && readyT <= 0; }

  game.onPress(function(x, y) {
    if (!canPlay()) return;
    hold = { x: x, y: y };
    game.audio.play('se_tap', 0.15);
  });
  game.onMove(function(x, y) {
    if (!hold) return;
    hold.x = x; hold.y = y;
    if (Math.random() < 0.05) game.audio.tone(392, 0.02, { wave: 'triangle', volume: 0.02 });
  });
  game.onRelease(function(x, y) {
    if (!hold) return;
    hold = null;
    game.audio.tone('G4', 0.04, { wave: 'triangle', volume: 0.04 });
  });
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function field(t) {
    game.draw.gradient(0, H, [[0, C.sky], [0.1, C.sky], [0.11, STYLE.bg[0]], [1, STYLE.bg[1]]]);
    // タイル反復の菜の花畑(下へ流れる)
    var off = scroll % 96;
    for (var ty = -96; ty < H; ty += 96) {
      for (var tx = 0; tx < W; tx += 96) {
        var y = ty + off;
        if (y < 200) continue;
        var alt = ((Math.floor((ty - scroll) / 96) + tx / 96) % 2 + 2) % 2;
        game.draw.rect(tx + 8, y + 8, 32, 32, alt ? C.flower : '#f0c828');
        game.draw.rect(tx + 56, y + 56, 24, 24, alt ? '#f0c828' : C.flower);
        game.draw.rect(tx + 60, y + 16, 8, 24, C.leafDk);
      }
    }
    // 畦道(真ん中を縦に)
    game.draw.rect(W / 2 - 170, 200, 340, H, C.path);
    for (var py = -64; py < H; py += 64) { var yy = py + (scroll % 64); if (yy > 200) game.draw.rect(W / 2 - 130 + ((py / 64) % 2 ? 60 : 0), yy, 40, 16, C.pathDk); }
    // 遠くの町の市の門(最後の数秒で近づく)
    var u = Math.min(1, elapsedP / TIME_LIMIT);
    var gy = 120 + u * u * 200;
    game.draw.rect(W / 2 - 220, gy, 40, 120, C.red); game.draw.rect(W / 2 + 180, gy, 40, 120, C.red);
    game.draw.rect(W / 2 - 260, gy - 16, 520, 32, C.red);
    for (var f = 0; f < 6; f++) game.draw.rect(W / 2 - 200 + f * 76, gy + 16 + Math.sin(t * 6 + f) * 4, 30, 40, f % 2 ? C.pink : C.white);
  }

  function drawWinds(t) {
    for (var i = 0; i < winds.length; i++) {
      var o = winds[i];
      if (o.warn > 0) {
        // telegraph: 上端で花びらが渦を巻いて赤く瞬き、通り道の点線が伸びる
        var on = Math.floor(t * 14) % 2 === 0;
        game.draw.circle(o.x0 + Math.sin(o.ph) * o.amp, 250, 70, on ? C.red : C.pink, 0.45);
        for (var p = 0; p < 6; p++) {
          var a = t * 10 + p;
          game.draw.rect(o.x0 + Math.sin(o.ph) * o.amp + Math.cos(a) * 56 - 6, 250 + Math.sin(a) * 30, 12, 12, C.pink);
        }
        var reach = (1 - o.warn / WARN_T) * 700;
        for (var dy = 0; dy < reach; dy += 40) game.draw.rect(windX(o, 230 + dy) - 6, 230 + dy, 12, 16, C.red);
        continue;
      }
      var x = windX(o, o.y);
      var big = culprit === o && stopT > 0;
      var hl = big && Math.floor(t * 16) % 2 === 0;
      var sc = big ? 1.7 : 1;
      // 渦: 白い横帯を回転させて重ね、赤い芯
      for (var r = 0; r < 5; r++) {
        var w = (40 + r * 20) * sc, yy = o.y - 60 * sc + r * 30 * sc, sh = Math.sin(t * 16 + r * 1.3) * 16;
        game.draw.rect(x - w + sh, yy, w * 2, 18 * sc, hl ? '#ffffff' : C.wind);
      }
      game.draw.rect(x - 8, o.y - 60 * sc, 16, 150 * sc, C.red);
      for (var q = 0; q < 4; q++) { var b = t * 12 * o.spin + q * 1.57; game.draw.rect(x + Math.cos(b) * 70 * sc - 6, o.y + Math.sin(b) * 30 - 6, 12, 12, q % 2 ? C.pink : C.flower); }
    }
  }

  function drawGirl(t) {
    var over = fin && !cleared;
    var fr = (invT > 0 || over || (stopT > 0 && stopKind === 'lose')) ? GIRL_OUCH : (joyT > 0 || (fin && cleared)) ? GIRL_JOY : (Math.floor(girl.step * 8) % 2 ? GIRL_A : GIRL_B);
    var hop = fin && cleared ? -Math.abs(Math.sin(t * 10)) * 28 : -Math.abs(Math.sin(girl.step * 8)) * 6;
    var vis = invT > 0 ? Math.floor(t * 14) % 2 === 0 : true;
    game.draw.rect(girl.x - 60, GY + 70, 120, 20, '#00000040');
    if (vis) game.draw.sprite(fr, GIRL_PAL, girl.x, GY + hop, 14, { anchor: 'center' });
    // 頭の籠(振れ量が見える): 危ないと赤く瞬く
    var bx = girl.x + girl.th * 110, warn = Math.abs(girl.th) > SPILL * 0.7 && Math.floor(t * 14) % 2 === 0;
    if (bunches > 0 && !(over && spillCause)) {
      game.draw.sprite(BASKET, warn ? { y: C.red, f: C.red, p: C.red, b: C.red } : BASKET_PAL, bx, GY - 100 + hop + Math.abs(girl.th) * 30, 14, { anchor: 'center' });
    }
    // 籠の振れゲージ(足元)
    game.draw.rect(girl.x - 120, GY + 110, 240, 14, '#00000050');
    game.draw.rect(girl.x - 4 + Math.max(-1, Math.min(1, girl.th / SPILL)) * 116, GY + 104, 8, 26, Math.abs(girl.th) > SPILL * 0.7 ? C.red : C.white);
    game.draw.rect(girl.x - 122, GY + 104, 6, 26, C.red); game.draw.rect(girl.x + 116, GY + 104, 6, 26, C.red);
  }

  function drawHud(t) {
    var low = timeLeft < 4 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(0, 0, W, 210, '#202020', 0.6);
    // 道のり(門まで)
    game.draw.rect(70, 40, W - 140, 26, '#00000080');
    game.draw.rect(76, 46, (W - 152) * Math.min(1, elapsedP / TIME_LIMIT), 14, low ? C.red : C.flower);
    game.draw.rect(W - 90, 26, 16, 56, C.red);
    for (var b = 0; b < BUNCHES; b++) game.draw.sprite(BUNCH, b < bunches ? { y: C.flower, p: C.pink, g: C.leaf } : { y: '#606060', p: '#606060', g: '#606060' }, W - 120 - b * 80, 150, 12, { anchor: 'center' });
    out(Math.ceil(timeLeft) + '', W / 2, 160, 60, C.white);
    out('' + score, 150, 160, 40, C.flower);
  }

  function drawScene(t) {
    field(t);
    drawWinds(t);
    drawGirl(t);
    for (var sl = 0; sl < H; sl += 8) game.draw.rect(0, sl, W, 2, '#000000', 0.07);
  }

  // ---- ATTRACT: 本物の stepWorld をゴーストの押し位置で動かす。つむじ風の通り道から外れ、3つに1つは見落として当たる ----
  var demo = { t: 0, x: W / 2, press: false, n: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; demo.n = 0; }
    elapsedP = Math.min(TIME_LIMIT * 0.6, elapsedP + dt);
    if (bunches <= 0) bunches = BUNCHES;
    var target = null, threat = null;
    for (var i = 0; i < winds.length; i++) {
      var o = winds[i];
      if (o.passed || o.hit || o.y > GY) continue;
      if (o.lazy === undefined) { demo.n++; o.lazy = demo.n % 3 === 0; }
      if (o.lazy) continue;
      var px = windX(o, GY - 40);
      if (Math.abs(px - girl.x) < 230 && (!threat || o.y > threat.y)) threat = o;
    }
    if (threat) {
      var tx = windX(threat, GY - 40);
      target = tx < girl.x ? Math.min(W - 120, tx + 330) : Math.max(120, tx - 330);
      if (target > W - 130 || target < 130) target = tx < W / 2 ? tx + 330 : tx - 330;
    } else if (Math.abs(girl.th) > 0.15) target = girl.x + girl.th * 160;
    demo.press = target !== null;
    if (demo.press) demo.x += (target - demo.x) * Math.min(1, dt * 10);
    stepWorld(dt, demo.press ? demo.x : null, true);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.x, H * 0.88 + (demo.press ? 6 : -12), { press: demo.press, scale: 13 });
      game.draw.rect(0, 0, W, 230, '#202020', 0.6);
      out(GAME_TITLE, W / 2, 120 + Math.sin(t * 2) * 5, 104, C.flower);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 200, 40, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.975, 46, C.white);
      else out('TAP TO START', W / 2, H * 0.975, 42, C.flower);
      return;
    }

    if (mode === S.RESULT) {
      stepWorld(dt, null, false);
      drawScene(t);
      game.draw.rect(90, H * 0.3, W - 180, 480, '#202020', 0.85);
      out(cleared ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.36, 96, cleared ? C.flower : C.red);
      out('SCORE ' + finalScore, W / 2, H * 0.42, 60, C.white);
      out('NICE ' + grazes + '   ' + Math.max(0, bunches) + ' / ' + BUNCHES, W / 2, H * 0.47, 42, C.pink);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.52, 56, C.flower);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.52, 42, C.white);
      if (!cleared) out('あと' + Math.max(1, Math.ceil(timeLeft)) + '秒!', W / 2, H * 0.27, 64, C.red);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.975, 40, C.white);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { bunches: Math.max(0, bunches), grazes: grazes, seconds: Math.round(elapsedP) };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopKind === 'win') stepWorld(dt, null, false);
      if (stopT <= 0) {
        if (stopKind === 'win') ending(true);
        else { game.feedback.bad(girl.x, GY - 160, { text: 'MISS', color: C.red, size: 62 }); ending(false); }
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      timeLeft -= dt; elapsedP += dt;
      stepWorld(dt, hold ? hold.x : null, true);
      if (timeLeft < 4) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.06, { wave: 'square', volume: 0.07 }); }
      }
      if (timeLeft <= 0 && stopT <= 0 && bunches > 0) { timeLeft = 0; hold = null; stopT = 0.45; stopKind = 'win'; joyT = 2; game.audio.play('se_powerup', 0.45); }
    }

    drawScene(t);
    if (stopT > 0 && stopKind === 'win') game.draw.circle(girl.x, GY - 60, 100 + (0.45 - stopT) * 1500, C.white, 0.3);
    // 開始直後のお手本: 押したまま横へずらす手
    if (!fin && readyT <= 0 && elapsedP < 1.5 && !hold) {
      var g = Math.sin(elapsedP * 4);
      game.draw.hand(W / 2 + g * 200, H * 0.88, { press: true, scale: 11, alpha: 0.45 });
    }
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.32, 120, C.flower);
  });

  game.onStart(function() {
    game.audio.melody([
      ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['G5', 0.5], ['A5', 1], ['G5', 1],
      ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 2],
      ['D5', 0.5], ['E5', 0.5], ['G5', 1], ['E5', 0.5], ['D5', 0.5], ['E5', 1], ['C5', 1],
    ], { tempo: 140, wave: 'square', volume: 0.05, loop: true, bass: [['C3', 1], ['G2', 1], ['A2', 1], ['G2', 1]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);

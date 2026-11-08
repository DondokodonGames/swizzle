// I-DS-0014v2-summit-camp-sleepbag-zip.js
// 寝袋ジッパー連打 — かじかんだ指で寝袋のつまみを連打で少しずつ引き上げ、吹き込む寒気に押し戻される前に首元まで閉じ切る
// 操作: 画面のどこでも連打するとつまみが上がる。手を止めると寒さでずり落ちる。突風の前はテントの壁が膨らむので連打を強める(社内メモ)
// 終わり: 3区間(足元→腰→胸→首元)を時間内に閉じ切れば成功。時間切れで失敗。区間の境目まで上げると下へは戻らない
// @mechanic: mash
// @theme: summit_camp_sleeping_bag
// 世界観: 冬山の稜線のテント場で、登山者がかじかんだ指で寝袋のジッパーを連打で引き上げ、吹き込む寒気から身を守る
// 残るもの: 正誤(CLEAR/GAME OVER) + 閉じた割合%・連打数・最高連打速度
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 画面の1/3を占める巨大キャラ、床に楕円影、背景は横1層で十分
  var STYLE = { bg: ['#2a3a5a', '#1a2440', '#d8e4f0'], main: ['#e8542e', '#ffb43a', '#3a6ad0'], accent: ['#9ae0ff', '#ffffff'] };
  var C = {
    tent: STYLE.bg[0], tentDark: STYLE.bg[1], snow: STYLE.bg[2],
    bag: STYLE.main[0], bagDark: '#a83418', bagLit: '#ff8a5a', warm: STYLE.main[1], blue: STYLE.main[2],
    ice: STYLE.accent[0], white: STYLE.accent[1], ink: '#0c1020', teeth: '#2a2a2a', skin: '#f2c8a0', red: '#ff3a4a',
  };

  var GAME_TITLE = 'ZIP UP!';
  var TIME_LIMIT = 13;
  var STEP = 0.024;
  var CHECKS = [0, 0.34, 0.67, 1];
  var SLIDE = [0.03, 0.045, 0.06];
  var GUST_SLIDE = 0.14;
  var BAG_X = W / 2, BAG_TOP = H * 0.27, BAG_BOT = H * 0.72, BAG_W = 440;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var zip, floor, section, taps, rate, rateWin, topRate, fever, timeLeft, score, gust, gustWait;
  var lead, closed, won, pause, resultT, sent, jolt, shiver, shownCheck, tick, flake;

  var FACE_COLD = [
    '..hhhhhhhh..', '.hhhhhhhhhh.', 'hhssssssssh.', 'hsseessseesh', 'hsseessseesh', 'hssssssssssh',
    'hsbssssssbsh', 'hssssmmssssh', '.hssmmmmssh.', '..hssssssh..',
  ];
  var FACE_SHAKE = [
    '..hhhhhhhh..', '.hhhhhhhhhh.', 'hhssssssssh.', 'hssesssssesh', 'hsseessseesh', 'hssssssssssh',
    'hsbssssssbsh', 'hsssmmmmsssh', '.hssmssmssh.', '..hssssssh..',
  ];
  var FACE_WARM = [
    '..hhhhhhhh..', '.hhhhhhhhhh.', 'hhssssssssh.', 'hssssssssssh', 'hsseessseesh', 'hssrssssrssh',
    'hssssssssssh', 'hssmssssmssh', '.hssmmmmssh.', '..hssssssh..',
  ];
  var FACE_PAL = { h: '#e8542e', s: '#f2c8a0', e: '#0c1020', b: '#9ae0ff', m: '#a83418', r: '#ff8a7a' };
  var MITT = ['.mmm...', 'mmmmm.m', 'mmmmmmm', 'mmmmmm.', '.mmmmm.', '.mmmmm.'];
  var LAMP = ['.kk.', 'yyyy', 'yyyy', '.yy.'];

  function shout(str, x, y, sz, col) {
    game.draw.text(str, x + 4, y + 5, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  function initGame() {
    zip = 0; floor = 0; section = 0; taps = 0; rate = 0; rateWin = []; topRate = 0; fever = 0;
    timeLeft = TIME_LIMIT; score = 0; gust = null; gustWait = 2.2;
    lead = 0.8; closed = false; won = false; pause = 0; resultT = 0; sent = false;
    jolt = 0; shiver = 0; shownCheck = 0; tick = 0; flake = [];
  }

  function sliderY(z) { return BAG_BOT - 40 - z * (BAG_BOT - BAG_TOP - 120); }

  // ---- 1打(本番もデモもここを通る) ----
  function tug(live) {
    var now = game.time.elapsed;
    rateWin.push(now);
    while (rateWin.length && now - rateWin[0] > 1) rateWin.shift();
    rate = rateWin.length;
    if (rate > topRate) topRate = rate;
    if (rate >= 9 && fever <= 0) {
      fever = 1.4;
      game.audio.play('se_powerup', 0.4);
      game.fx.popup('FEVER', BAG_X, sliderY(zip) - 120, { color: C.warm, size: 64 });
    }
    var step = STEP * (fever > 0 ? 1.35 : 1);
    zip = Math.min(1, zip + step);
    taps++;
    jolt = 0.08;
    if (live) score += fever > 0 ? 15 : 10;
    game.audio.tone(320 + zip * 520, 0.04, { wave: 'square', volume: 0.08 });
    if (taps % 4 === 0) game.fx.burst(BAG_X + 60, sliderY(zip), { color: fever > 0 ? C.warm : C.white, count: 3, speed: 160 });
    // 区間の境目: そこから下へは戻らない
    if (section < 3 && zip >= CHECKS[section + 1]) {
      section++;
      floor = CHECKS[section];
      if (section < 3) {
        game.feedback.good(BAG_X + 120, sliderY(zip) - 30, { text: section === 1 ? 'GOOD' : 'NICE', color: C.warm, size: 58 });
        game.audio.play('se_milestone', 0.45);
        if (live) score += 200;
      }
    }
    if (zip >= 1 && live) done(true);
  }

  function stepCold(dt, live) {
    if (fever > 0) fever -= dt;
    if (jolt > 0) jolt -= dt;
    var now = game.time.elapsed;
    while (rateWin.length && now - rateWin[0] > 1) rateWin.shift();
    rate = rateWin.length;
    // 突風: 0.6秒前にテントの壁が膨らんで予告
    if (!gust) {
      gustWait -= dt;
      if (gustWait <= 0) {
        gust = { warn: 0.6, blow: 1.0 };
        game.audio.tone('E5', 0.5, { wave: 'sawtooth', volume: 0.05, slide: -400 });
      }
    } else if (gust.warn > 0) {
      gust.warn -= dt;
      if (gust.warn <= 0) game.audio.play('se_bad', 0.25);
    } else {
      gust.blow -= dt;
      if (gust.blow <= 0) { gust = null; gustWait = live ? game.random(1.4, 2.4) : 1.6; }
    }
    var slide = SLIDE[Math.min(2, section)] + (gust && gust.warn <= 0 ? GUST_SLIDE : 0);
    if (rate < 3 || (gust && gust.warn <= 0)) {
      var before = zip;
      zip = Math.max(floor, zip - slide * dt);
      if (before - zip > 0.0005) shiver = 0.2;
    }
    if (shiver > 0) shiver -= dt;
    // 開いた口から吹き込む雪
    if (game.random(0, 1) < (1 - zip) * 0.6) flake.push({ x: game.random(0, W), y: game.random(H * 0.15, H * 0.3), vx: 300 + game.random(0, 200), vy: 120, t: 0 });
    for (var i = flake.length - 1; i >= 0; i--) {
      var f = flake[i];
      f.t += dt; f.x += f.vx * dt * (gust && gust.warn <= 0 ? 2 : 1); f.y += f.vy * dt;
      if (f.t > 2 || f.x > W + 20) flake.splice(i, 1);
    }
  }

  function done(ok) {
    if (closed) return;
    closed = true; won = ok;
    pause = ok ? 0.4 : 0.5;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
    if (ok) {
      score += Math.round(timeLeft * 60);
      game.feedback.good(BAG_X, sliderY(1) - 60, { text: 'CLEAR', color: C.warm, size: 70 });
    }
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) {
      if (!sent) return;
      state = S.ATTRACT; initGame(); demo.t = 0; return;
    }
    if (closed || pause > 0) return;
    if (lead > 0) { game.audio.play('se_tap', 0.08); return; }
    tug(true);
  });

  // ---- 描画 ----
  function oval(x, y, rx, ry, col, a) {
    for (var k = -ry; k <= ry; k += 4) {
      var w = rx * Math.sqrt(Math.max(0, 1 - (k * k) / (ry * ry)));
      game.draw.rect(x - w, y + k, w * 2, 4, col, a);
    }
  }

  function tent() {
    var t = game.time.elapsed;
    var bulge = gust ? (gust.warn > 0 ? (0.6 - gust.warn) / 0.6 : 1) : 0;
    game.draw.gradient(0, H, [[0, C.tentDark], [0.45, C.tent], [0.78, C.tentDark], [0.8, '#5a6a8a'], [1, '#3a4a6a']]);
    // テントの斜めの壁(突風で膨らむ)
    for (var i = 0; i < 16; i++) {
      var y = H * 0.05 + i * 46;
      var push = Math.sin(i / 15 * Math.PI) * 70 * bulge + Math.sin(t * 3 + i) * 4;
      game.draw.rect(0, y, 120 + i * 10 + push, 40, '#34466c', 0.8);
      game.draw.rect(W - 120 - i * 10 - push, y, 120 + i * 10 + push, 40, '#34466c', 0.8);
    }
    game.draw.line(W / 2, 0, 80, H * 0.78, C.tentDark, 8);
    game.draw.line(W / 2, 0, W - 80, H * 0.78, C.tentDark, 8);
    // ランタン(揺れる)
    var lx = W * 0.22 + Math.sin(t * 1.4) * 30;
    game.draw.line(W * 0.22, 0, lx, H * 0.15, '#808aa0', 3);
    game.draw.circle(lx, H * 0.17, 90, C.warm, 0.1);
    game.draw.sprite(LAMP, { k: '#404a60', y: C.warm }, lx, H * 0.17, 14, { anchor: 'center' });
    // 床のマット
    game.draw.rect(0, H * 0.78, W, H * 0.22, '#4a5a7a');
    for (var s = 0; s < 6; s++) game.draw.rect(0, H * 0.8 + s * 60, W, 4, '#3a4a6a');
    if (gust && gust.warn > 0 && Math.floor(t * 10) % 2 === 0) shout('!', W - 90, H * 0.36, 110, C.red);
    for (var f = 0; f < flake.length; f++) game.draw.rect(flake[f].x, flake[f].y, 8, 8, C.white, Math.max(0, 1 - flake[f].t / 2));
  }

  function sleepingBag() {
    var t = game.time.elapsed;
    var shake = shiver > 0 ? Math.sin(t * 60) * 6 : 0;
    var x0 = BAG_X - BAG_W / 2 + shake;
    oval(BAG_X, BAG_BOT + 20, BAG_W * 0.62, 40, C.ink, 0.35);
    // 袋の本体(大きい塊)
    for (var r = 0; r < 18; r++) {
      var y = BAG_TOP + r * (BAG_BOT - BAG_TOP) / 18;
      var inset = r < 3 ? (3 - r) * 26 : r > 15 ? (r - 15) * 30 : 0;
      game.draw.rect(x0 + inset, y, BAG_W - inset * 2, (BAG_BOT - BAG_TOP) / 18 + 1, r % 3 === 0 ? C.bagDark : C.bag);
    }
    game.draw.rect(x0 + 20, BAG_TOP + 30, 30, BAG_BOT - BAG_TOP - 60, C.bagLit, 0.6);
    // 顔(フードから覗く)
    var face = FACE_COLD;
    if (zip > 0.8 || (closed && won)) face = FACE_WARM;
    else if (shiver > 0 || (closed && !won)) face = Math.floor(t * 20) % 2 === 0 ? FACE_SHAKE : FACE_COLD;
    else if (Math.floor(t * 2) % 2 === 0) face = FACE_SHAKE;
    game.draw.sprite(face, FACE_PAL, BAG_X + shake, BAG_TOP - 40 + (jolt > 0 ? -6 : 0), 20, { anchor: 'center' });
    // ジッパー: つまみより下は閉じ、上は開いて中のセーターが見える
    var sy = sliderY(zip);
    var topY = sliderY(1);
    var open = Math.max(0, sy - topY);
    if (open > 0) {
      var span = sliderY(0) - topY;
      for (var o = 0; o < 12; o++) {
        var yy = sy - (o + 1) * open / 12;
        var wv = 16 + 150 * ((sy - yy) / span);
        game.draw.rect(BAG_X + shake - wv / 2, yy, wv, open / 12 + 1, C.blue);
        game.draw.rect(BAG_X + shake - wv / 2, yy, 6, open / 12 + 1, '#2a4aa0');
      }
    }
    for (var z = sliderY(0); z > topY; z -= 18) {
      var isClosed = z >= sy;
      var apart = isClosed ? 0 : 75 * ((sy - z) / (sliderY(0) - topY)) + 6;
      game.draw.rect(BAG_X + shake - 8 - apart, z, 10, 8, C.teeth);
      game.draw.rect(BAG_X + shake - 2 + apart, z + 9, 10, 8, C.teeth);
    }
    // 区間の境目の目印
    for (var c = 1; c < 3; c++) {
      var cy = sliderY(CHECKS[c]);
      game.draw.rect(BAG_X + shake + 60, cy - 4, 50, 8, section >= c ? C.warm : C.white, section >= c ? 1 : 0.5);
    }
    game.draw.rect(BAG_X + shake + 60, topY - 4, 50, 8, C.ice);
    // つまみ(押せる物: 明滅+白縁)
    var pulse = 1 + (jolt > 0 ? 0.25 : 0) + Math.sin(t * 8) * 0.05;
    game.draw.rect(BAG_X + shake - 26 * pulse, sy - 22 * pulse, 52 * pulse, 44 * pulse, C.white);
    game.draw.rect(BAG_X + shake - 20 * pulse, sy - 16 * pulse, 40 * pulse, 32 * pulse, fever > 0 ? C.warm : '#c0c8d8');
    game.draw.rect(BAG_X + shake - 8, sy + 18 * pulse, 16, 40, fever > 0 ? C.warm : '#c0c8d8');
  }

  function pad() {
    var t = game.time.elapsed;
    var x = W / 2, y = H * 0.875;
    var on = !closed && lead <= 0 && state === S.PLAYING;
    game.draw.circle(x, y, 150, C.white, 0.12 + (jolt > 0 ? 0.2 : 0));
    game.draw.circle(x, y, 120, fever > 0 ? C.warm : C.ice, on || state === S.ATTRACT ? 0.35 + 0.15 * Math.sin(t * 9) : 0.15);
    game.draw.sprite(MITT, { m: fever > 0 ? C.warm : C.blue }, x, y + (jolt > 0 ? 8 : 0), 22, { anchor: 'center' });
    // 連打速度メーター
    for (var i = 0; i < 10; i++) {
      game.draw.rect(W * 0.08, H * 0.94 - i * 30, 46, 22, i < rate ? (i >= 8 ? C.warm : C.ice) : '#2a3450');
    }
  }

  function drawHud() {
    shout(Math.round(zip * 100) + '%', W / 2, 64, 62, C.white);
    game.draw.text('SCORE ' + score, W - 40, 44, { size: 30, color: C.snow, bold: true, align: 'right' });
    for (var s = 0; s < 3; s++) game.draw.rect(60 + s * 54, 30, 42, 42, s < section ? C.warm : '#2a3450');
    game.draw.rect(60, 124, W - 120, 22, C.ink, 0.6);
    var low = timeLeft < 3;
    game.draw.rect(64, 128, (W - 128) * Math.max(0, timeLeft / TIME_LIMIT), 14, low && Math.floor(game.time.elapsed * 8) % 2 ? C.red : C.ice);
  }

  function drawResult() {
    game.draw.rect(0, H * 0.16, W, H * 0.4, C.ink, 0.72);
    shout(won ? 'CLEAR' : 'TIME UP', W / 2, H * 0.23, 112, won ? C.warm : C.red);
    shout('SCORE ' + score, W / 2, H * 0.32, 60, C.white);
    shout(Math.round(zip * 100) + '%   ' + taps + ' TAP', W / 2, H * 0.38, 46, C.ice);
    if (won && score > game.best) {
      if (Math.floor(resultT * 4) % 2 === 0) shout('NEW RECORD', W / 2, H * 0.45, 64, C.warm);
    } else {
      shout('BEST ' + Math.max(game.best, won ? score : 0), W / 2, H * 0.45, 42, C.warm);
    }
    if (!won) shout('あと' + Math.max(1, 100 - Math.round(zip * 100)) + '%!', W / 2, H * 0.52, 66, C.warm);
    if (sent && Math.floor(game.time.elapsed * 2) % 2 === 0) shout('TAP TO CONTINUE', W / 2, H * 0.975, 34, C.white);
  }

  // ---- ATTRACT: tug()を手が連打 → 手を止めて突風でずり落ちる(失敗例) → 再び連打で境目を越える ----
  var demo = { t: 0, gx: W / 2, gy: H * 0.875, press: false, beat: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.2;
    if (cyc < dt || demo.t <= dt) { initGame(); lead = 0; gustWait = 2.0; demo.beat = 0; }
    stepCold(dt, false);
    var mashing = cyc < 1.9 || cyc > 3.5;
    demo.beat -= dt;
    demo.press = false;
    if (mashing && zip < 0.98) {
      demo.press = demo.beat > 0.05;
      if (demo.beat <= 0) { demo.beat = 0.11; tug(false); }
    }
    demo.gx = W / 2 + Math.sin(demo.t * 1.5) * 16;
    demo.gy = H * 0.875 + (demo.press ? 6 : -6);
  }

  // ---- メインループ ----
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      tent();
      sleepingBag();
      pad();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      shout(GAME_TITLE, W / 2, H * 0.07 + Math.sin(game.time.elapsed * 2.6) * 6, 104, C.warm);
      shout('HI-SCORE ' + game.best, W / 2, H * 0.125, 40, C.ice);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) shout('► 100円 投入 ◄', W / 2, H * 0.975, 44, C.warm);
      else shout('INSERT COIN', W / 2, H * 0.975, 40, C.white);
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
      tent(); sleepingBag(); pad(); drawHud();
      if (won && Math.floor(resultT * 6) !== Math.floor((resultT - dt) * 6)) {
        game.fx.burst(game.random(140, W - 140), game.random(H * 0.2, H * 0.55), { color: [C.warm, C.ice, C.bag][Math.floor(game.random(0, 3)) % 3], count: 16, speed: 420 });
      }
      drawResult();
      if (!sent && resultT >= 1.3) {
        sent = true;
        var st = { closedPct: Math.round(zip * 100), taps: taps, topRate: topRate, sections: section };
        if (won) game.end.success(score, st); else game.end.failure(st);
      }
      return;
    }

    if (pause > 0) {
      pause -= dt;
      jolt = 0.05;
      if (pause <= 0 && closed) { state = S.RESULT; resultT = 0; }
    } else if (closed) {
      state = S.RESULT; resultT = 0;
    } else if (lead > 0) {
      lead -= dt;
      if (lead <= 0) game.audio.play('se_tap', 0.4);
    } else {
      timeLeft -= dt;
      stepCold(dt, true);
      if (timeLeft < 3) {
        tick -= dt;
        if (tick <= 0) { tick = 0.33; game.audio.tone('A5', 0.04, { wave: 'square', volume: 0.07 }); }
      }
      if (timeLeft <= 0 && !closed) {
        timeLeft = 0;
        shiver = 0.6;
        game.feedback.bad(BAG_X, sliderY(zip), { text: 'TIME UP', size: 64 });
        done(false);
      }
    }

    tent();
    sleepingBag();
    pad();
    drawHud();
    if (lead > 0) shout(lead > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.48, 112, C.warm);
  });

  game.onStart(function() {
    game.audio.melody([
      ['E5', 0.25], ['G5', 0.25], ['E5', 0.25], ['B4', 0.25], ['C5', 0.5], ['B4', 0.5],
      ['A4', 0.25], ['C5', 0.25], ['E5', 0.25], ['A5', 0.25], ['G5', 0.5], ['E5', 0.5],
    ], { tempo: 150, wave: 'square', volume: 0.04, loop: true, bass: [['A2', 1], ['E2', 1], ['C3', 1], ['E2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

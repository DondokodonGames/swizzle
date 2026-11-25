// J-N6434-0027-timberline-lever-handcar.js
// 森林鉄道のレバー漕ぎ — 戻りきって光ったレバーだけを押してトロッコを加速。焦って押すと歯車が噛んで減速する
// 操作: レバーが上まで戻って緑に光った瞬間にタップして押し下げる。戻りきる前のタップは空回り(社内メモ。画面には出さない)
// 終わり: 100m先の駅に制限時間内に着けば成功。時間切れで失敗
// @mechanic: cooldown_tap
// @theme: timberline_lever_handcar
// 世界観: 製材所の森林鉄道で働くビーバーの見習いが、材木市の開く鐘までに、レバー式トロッコを丘越しに漕いで麓の駅へ材木を届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 到着タイム・きれいに押せた回数・空回り回数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目・フェルト・光沢ボタン。gradient で厚みを作る
  var STYLE = {
    bg: ['#9ed4f5', '#e8f6ff', '#6e9f4a'],
    main: ['#b07a45', '#7a4e26', '#d9a66b'],
    accent: ['#44d16a', '#e84a3c'],
  };
  var C = {
    sky: STYLE.bg[0], sky2: STYLE.bg[1], grass: STYLE.bg[2], grass2: '#4f7a33',
    wood: STYLE.main[0], woodDark: STYLE.main[1], woodLight: STYLE.main[2],
    green: STYLE.accent[0], red: STYLE.accent[1],
    brass: '#d6a93a', brassDark: '#8a6a1c', steel: '#8c96a0', steelDark: '#4a525a',
    ink: '#2b1d10', white: '#ffffff', gold: '#ffd24a', mount: '#7ea3b8',
  };

  var GAME_TITLE = 'LEVER RUN';
  var TIME_LIMIT = 14;
  var GOAL = 100;            // m
  var PX = 60;               // 1m あたりのpx
  var CAR_X = W * 0.34;
  var TRACK_Y = H * 0.56;
  var PUSH_GAIN = 3.7, PERFECT_GAIN = 4.2, FRESH = 0.2;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // ── スプライト ──────────────────────────────────────
  var BEAVER = [
    ['..bbbb..', '.bbbbbb.', '.bwkbwkb', '.bbnnbb.', '..bttb..', '.oooooo.', 'oooooooo', '.oo..oo.', '.bb..bb.'],
    ['........', '..bbbb..', '.bbbbbb.', '.bwkbwkb', '.bbnnbb.', '.oobtboo', 'oooooooo', '.oo..oo.', '.bb..bb.'],
  ];
  var BEAVER_PAL = { b: '#8a5a2b', w: '#ffffff', k: '#2b1d10', n: '#4a2a14', t: '#fff2c0', o: '#3a78c8' };
  var PINE = ['...g...', '..ggg..', '.ggggg.', '..ggg..', '.ggggg.', 'ggggggg', '...t...'];
  var FLAG = ['rrrr.', 'rwwr.', 'rrrr.', 'p....', 'p....', 'p....', 'p....'];
  var SIGN_UP = ['.www.', 'wwkww', 'wkkkw', 'wwkww', '..p..', '..p..'];
  var SIGN_DN = ['.www.', 'wwkww', 'wkkkw', 'wwkww', '..p..', '..p..'];
  var LOG = ['.dddddd.', 'dllllllw', 'dllllllw', '.dddddd.'];

  // ── 状態 ─────────────────────────────────────────
  var dist, speed, lever, cd, cdMax, readyAt, pushes, perfects, grinds, timeLeft, runT;
  var ready, phase, stopT, doneT, ok, endReason, halfShown, grindT, readyPing, pumpT;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  // 地形: 35〜60m が上り坂(レバーが重く戻りが遅い)、70〜88m が下り坂(戻りが速い)
  function slopeAt(d) {
    if (d >= 35 && d < 60) return 1;
    if (d >= 70 && d < 88) return -1;
    return 0;
  }
  function heightAt(d) {
    var h = 0;
    if (d > 35) h += Math.min(d, 60) - 35;
    if (d > 70) h -= Math.min(d, 88) - 70;
    return h * 7;  // px 上昇
  }
  function trackY(d) { return TRACK_Y - heightAt(d); }

  function initGame(demoMode) {
    dist = 0; speed = 0; lever = 1; cd = 0; cdMax = 0.5; readyAt = 0;
    pushes = 0; perfects = 0; grinds = 0; timeLeft = TIME_LIMIT; runT = 0;
    ready = demoMode ? 0 : 0.8; phase = demoMode ? 'play' : 'ready';
    stopT = 0; doneT = 0; ok = false; endReason = ''; halfShown = false; grindT = 0; readyPing = true; pumpT = 0;
  }

  function leverReturn() {
    var s = slopeAt(dist);
    return s > 0 ? 0.72 : s < 0 ? 0.38 : 0.5;
  }

  // レバーを押す(プレイヤーもデモAIも共通)
  function push(live) {
    if (phase !== 'play') return;
    var cx = CAR_X + 40, cy = trackY(dist) - 250;
    if (cd > 0) {
      // 戻りきる前: 歯車が噛んで減速し、レバーがさらに重くなる
      grinds++; speed *= 0.72; cd = Math.min(cdMax + 0.3, cd + 0.28); grindT = 0.3;
      if (live) game.feedback.bad(cx, cy, { text: 'MISS', color: C.red, shake: 6, size: 44 });
      else game.fx.burst(cx, cy, { color: C.red, count: 8, speed: 200 });
      return;
    }
    var fresh = runT - readyAt < FRESH;
    speed += fresh ? PERFECT_GAIN : PUSH_GAIN;
    pushes++; if (fresh) perfects++;
    cdMax = leverReturn(); cd = cdMax; lever = 0; readyPing = false; pumpT = 0.2;
    if (live) {
      game.audio.play('se_tap', 0.3);
      game.feedback.good(cx, cy, { text: fresh ? 'PERFECT' : 'GOOD', color: fresh ? C.gold : C.green, size: 46, count: fresh ? 10 : 6 });
    } else game.fx.burst(cx, cy, { color: C.green, count: 6, speed: 180 });
  }

  function stepWorld(dt, live) {
    if (grindT > 0) grindT -= dt;
    if (pumpT > 0) pumpT -= dt;
    if (phase !== 'play') return;
    runT += dt;
    if (live) timeLeft = Math.max(0, TIME_LIMIT - runT);
    if (cd > 0) {
      cd -= dt;
      lever = 1 - Math.max(0, cd) / cdMax;
      if (cd <= 0) {
        cd = 0; lever = 1; readyAt = runT;
        if (!readyPing) { readyPing = true; if (live) game.audio.tone('E6', 0.04, { wave: 'sine', volume: 0.06 }); }
      }
    }
    // 速度減衰(保持率 0.6/秒)、上り坂はさらに重い(0.5/秒)
    var s = slopeAt(dist);
    speed *= Math.pow(s > 0 ? 0.5 : 0.6, dt);
    if (s < 0) speed += 2.2 * dt;
    dist += speed * dt;

    if (live && !halfShown && dist >= GOAL / 2) {
      halfShown = true;
      game.audio.play('se_milestone', 0.4);
      game.fx.popup('50m', W / 2, H * 0.30, { color: C.gold, size: 64 });
    }
    if (dist >= GOAL) {
      dist = GOAL; phase = 'stop'; stopT = 0.6; ok = true; endReason = 'clear';
      if (live) {
        game.audio.stopBgm();
        game.feedback.good(CAR_X, trackY(dist) - 300, { text: 'CLEAR', color: C.gold, size: 90, count: 30 });
        game.audio.play('se_success', 0.55);
      }
      return;
    }
    if (live && timeLeft <= 0) {
      phase = 'stop'; stopT = 0.6; ok = false; endReason = 'time';
      game.audio.stopBgm();
      game.feedback.bad(CAR_X, trackY(dist) - 300, { text: 'TIME UP', color: C.red, shake: 8 });
      game.audio.play('se_failure', 0.5);
    }
  }

  // ── 描画 ─────────────────────────────────────────
  function drawBack() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky], [0.45, C.sky2], [0.46, C.grass], [1, C.grass2]]);
    game.draw.rect(0, 0, W, H, C.gold, 0.03 + 0.03 * Math.sin(t * 1.2));
    // 遠景の山(横1pxストリップで塗る代わりに段の矩形)
    var off = (dist * PX * 0.15) % 600;
    for (var m = -1; m < 3; m++) {
      var mx = m * 600 - off;
      for (var k = 0; k < 10; k++) game.draw.rect(mx + k * 30, H * 0.30 + k * 22, 600 - k * 60, 24, C.mount, 0.8);
    }
    // 中景の松(パララックス)
    var off2 = (dist * PX * 0.5) % 260;
    for (var i = -1; i < 6; i++) {
      game.draw.sprite(PINE, { g: '#3f7a3a', t: C.woodDark }, i * 260 - off2 + 130, H * 0.42 + Math.sin(t + i) * 3, 18, { anchor: 'center' });
    }
  }

  function drawTrack() {
    var off = dist * PX;
    // レール(地形に沿って 20px 刻み)
    for (var x = 0; x < W; x += 20) {
      var d = dist + (x - CAR_X) / PX;
      var y = trackY(d);
      game.draw.rect(x, y, 20, 12, C.steelDark);
      game.draw.rect(x, y, 20, 5, C.steel);
      game.draw.rect(x, y + 12, 20, H * 0.9 - y, C.grass2, 0.6);
    }
    // 枕木
    var start = Math.floor((dist - CAR_X / PX) / 1.5) * 1.5;
    for (var sd = start; sd < dist + (W - CAR_X) / PX; sd += 1.5) {
      var sx = CAR_X + (sd - dist) * PX;
      game.draw.rect(sx - 26, trackY(sd) + 10, 52, 14, C.woodDark);
    }
    // 坂の予告標識と駅の旗
    var marks = [{ d: 30, up: true }, { d: 66, up: false }];
    for (var m = 0; m < marks.length; m++) {
      var mx = CAR_X + (marks[m].d - dist) * PX;
      if (mx > -60 && mx < W + 60) {
        var blink = Math.floor(game.time.elapsed * 4) % 2 === 0;
        game.draw.sprite(marks[m].up ? SIGN_UP : SIGN_DN, { w: blink ? C.gold : C.white, k: marks[m].up ? C.red : C.green, p: C.woodDark }, mx, trackY(marks[m].d) - 90, 14, { anchor: 'center', flipY: !marks[m].up });
      }
    }
    var gx = CAR_X + (GOAL - dist) * PX;
    if (gx < W + 100) {
      game.draw.rect(gx - 10, trackY(GOAL) - 260, 20, 260, C.woodDark);
      game.draw.sprite(FLAG, { r: C.red, w: C.white, p: C.woodDark }, gx + 60, trackY(GOAL) - 220, 20, { anchor: 'center' });
      game.draw.rect(gx - 150, trackY(GOAL) - 300, 300, 40, C.wood);
    }
  }

  function drawCar(highlight) {
    var t = game.time.elapsed;
    var y = trackY(dist);
    var shake = grindT > 0 ? Math.sin(t * 80) * 6 : 0;
    var x = CAR_X + shake;
    if (highlight) game.draw.circle(x, y - 150, 260, C.white, 0.3 + 0.25 * Math.sin(t * 30));
    // 台車(木目: 3段のグラデ帯)
    game.draw.rect(x - 150, y - 110, 300, 80, C.woodDark);
    game.draw.rect(x - 144, y - 104, 288, 26, C.woodLight);
    game.draw.rect(x - 144, y - 78, 288, 42, C.wood);
    game.draw.sprite(LOG, { d: C.woodDark, l: C.woodLight, w: '#f5d9a8' }, x - 70, y - 140, 12, { anchor: 'center' });
    // 車輪(回転を点で表す)
    var rot = dist * 2.2;
    for (var w = -1; w <= 1; w += 2) {
      var wx = x + w * 95, wy = y - 20;
      game.draw.circle(wx, wy, 34, C.steelDark);
      game.draw.circle(wx, wy, 24, C.steel);
      game.draw.circle(wx + Math.cos(rot) * 16, wy + Math.sin(rot) * 16, 7, C.steelDark);
    }
    // レバー(真鍮の柄 + 光る握り)
    var px = x + 60, py = y - 150;
    game.draw.rect(px - 14, py, 28, 50, C.brassDark);
    var ang = -0.9 + (1 - lever) * 1.5;   // 上(-0.9)→下(+0.6)
    var hx = px + Math.sin(ang) * 150, hy = py - Math.cos(ang) * 150;
    game.draw.line(px, py, hx, hy, C.brassDark, 18);
    game.draw.line(px, py, hx, hy, C.brass, 10);
    var readyNow = cd <= 0 && phase === 'play';
    var knob = readyNow ? C.green : C.red;
    if (readyNow) game.draw.circle(hx, hy, 46 + 6 * Math.sin(t * 14), C.green, 0.35);
    game.draw.circle(hx, hy, 30, C.ink);
    game.draw.circle(hx, hy, 24, knob);
    game.draw.circle(hx - 8, hy - 8, 8, C.white, 0.7);
    // ビーバー
    var f = pumpT > 0 ? 1 : Math.floor(t * 3) % 2 === 0 ? 0 : (cd > 0 ? 1 : 0);
    var joy = phase === 'stop' && ok ? Math.abs(Math.sin(t * 12)) * 30 : 0;
    game.draw.sprite(BEAVER[f], BEAVER_PAL, x - 30, y - 200 - joy + Math.sin(t * 6) * 3, 14, { anchor: 'center' });
    // 走行の砂ぼこり
    if (speed > 4 && Math.random() < 0.3) game.fx.burst(x - 160, y - 10, { color: C.woodLight, count: 1, speed: 60 });
  }

  function drawButton() {
    // 親指ゾーン: 光沢のあるレバーボタン(戻りきると緑に点灯)
    var t = game.time.elapsed;
    var bx = W / 2, by = H * 0.85;
    var readyNow = cd <= 0 && phase === 'play';
    game.draw.circle(bx, by + 12, 170, C.ink, 0.35);
    game.draw.circle(bx, by, 170, C.woodDark);
    game.draw.circle(bx, by, 150, C.wood);
    game.draw.circle(bx, by, 118, C.brassDark);
    game.draw.circle(bx, by - 4, 110, readyNow ? C.green : C.red);
    game.draw.circle(bx - 34, by - 40, 34, C.white, 0.45);
    // 戻り具合のゲージ(環状の点列)
    for (var i = 0; i < 16; i++) {
      var a = -Math.PI / 2 + i / 16 * Math.PI * 2;
      var lit = i / 16 < lever;
      game.draw.circle(bx + Math.cos(a) * 136, by + Math.sin(a) * 136, 9, lit ? C.gold : C.brassDark);
    }
    if (readyNow) game.draw.circle(bx, by, 180 + 10 * Math.sin(t * 12), C.green, 0.18);
  }

  function drawHud() {
    // 木の看板のHUD
    game.draw.rect(40, 30, W - 80, 190, C.woodDark);
    game.draw.rect(50, 40, W - 100, 170, C.wood);
    txt(Math.floor(dist) + ' / ' + GOAL + 'm', W / 2, 90, 52, C.white);
    game.draw.rect(90, 140, W - 180, 22, C.woodDark);
    game.draw.rect(90, 140, (W - 180) * Math.min(1, dist / GOAL), 22, C.green);
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(90, 176, W - 180, 14, C.woodDark);
    game.draw.rect(90, 176, (W - 180) * (timeLeft / TIME_LIMIT), 14, low ? C.red : C.gold);
  }

  function drawScene(highlight) {
    drawBack();
    drawTrack();
    drawCar(highlight);
    drawButton();
  }

  function drawResult() {
    game.draw.rect(0, H * 0.60, W, H * 0.16, C.ink, 0.7);
    if (ok) {
      txt('CLEAR', W / 2, H * 0.64, 100, C.gold);
      txt(runT.toFixed(2) + '秒', W / 2, H * 0.71, 46, C.green);
    } else {
      txt(endReason === 'time' ? 'TIME UP' : 'GAME OVER', W / 2, H * 0.64, 90, C.red);
      txt('あと' + Math.max(1, Math.ceil(GOAL - dist)) + 'm!', W / 2, H * 0.71, 46, C.gold);
    }
    txt('BEST ' + (game.best > 0 ? game.best : 0), W / 2, H * 0.585, 34, C.ink);
    if (ok && calcScore() > game.best) txt('NEW RECORD', W / 2, H * 0.55, 52, C.red);
  }

  function calcScore() { return Math.round(timeLeft * 100) + perfects * 30; }

  // ── 入力 ─────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin');
      state = S.PLAYING; initGame(false); startMusic();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(true); demo.t = 0; startMusic(); return; }
    if (phase === 'play') push(true);
    else game.audio.play('se_tap', 0.08);
  });

  // ── ATTRACT デモ: AIが同じ push を使う。周期の中ほどで1回だけ焦って空回りさせる ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.85, press: false, pressT: 0, wait: 0.05, grindDone: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.grindDone = false; dist = 20 * Math.random(); }
    if (phase === 'play') {
      if (!demo.grindDone && cyc > 3 && cd > 0 && cd < cdMax * 0.6) {
        push(false); demo.grindDone = true; demo.pressT = 0.18;
      } else if (cd <= 0 && runT - readyAt >= demo.wait) {
        push(false); demo.pressT = 0.18; demo.wait = 0.02 + Math.random() * 0.12;
      }
    } else if (cyc > 1) {
      initGame(true);
    }
    if (dist > 95) dist = 10;
    if (demo.pressT > 0) demo.pressT -= dt;
    demo.press = demo.pressT > 0;
    demo.gy = H * 0.85 + (demo.press ? 10 : 0);
    stepWorld(dt, false);
  }

  function startMusic() {
    game.audio.melody([
      ['G4', 0.5], ['G4', 0.25], ['A4', 0.25], ['B4', 0.5], ['D5', 0.5], ['C5', 0.5], ['B4', 0.5], ['A4', 1],
      ['D4', 0.5], ['F#4', 0.5], ['A4', 0.5], ['C5', 0.5], ['B4', 0.5], ['A4', 0.5], ['G4', 1],
    ], { tempo: 140, wave: 'triangle', volume: 0.06, loop: true, bass: true });
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (dist === undefined) initGame(true);
      stepDemo(dt);
      drawScene(false);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.06, 80, C.white);
      txt('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, H * 0.105, 34, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 46, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.965, 40, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene(!ok);
      drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.white);
      return;
    }

    // PLAYING
    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'play'; readyAt = 0; game.audio.play('se_tap', 0.4); }
    } else if (phase === 'stop') {
      stopT -= dt;
      if (stopT <= 0) { phase = 'done'; doneT = 1.4; }
    } else if (phase === 'done') {
      doneT -= dt;
      if (doneT <= 0) {
        state = S.RESULT;
        var stats = { distance: Math.floor(dist), pushes: pushes, perfects: perfects, grinds: grinds };
        if (ok) game.end.success(calcScore(), stats);
        else game.end.failure(stats);
      }
    }
    stepWorld(dt, true);

    drawScene((phase === 'stop' || phase === 'done') && !ok);
    drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.34, 100, C.gold);
    if (phase === 'done') drawResult();
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
    demo.t = 0;
    startMusic();
  });
})(game);

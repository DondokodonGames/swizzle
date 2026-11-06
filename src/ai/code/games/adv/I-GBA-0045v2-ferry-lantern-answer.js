// I-GBA-0045v2-ferry-lantern-answer.js
// 渡し守の返し灯 — 対岸の偽の灯りには応じず、客が振る本物の合図灯にだけ一度ランタンを振り返す
// 操作: 画面のどこでもタップでランタンを振り返す。振ると火が戻るまでしばらく振れない(戻る前に押すと火が消えかけて待ちが延びる)
// 終わり: 7組の客の合図を受け終えるまでランタンの灯(残機3)が残れば成功。狐火に応じる/本物の合図を見逃すと灯を1つ失い、0で失敗
// @mechanic: cooldown_tap
// @theme: night_ferry_signal
// 世界観: 夜の川の渡し場で、渡し守が対岸に揺れる狐火や水面のきらめきには応じず、舟を待つ客が振る本物の提灯の合図にだけ一度ランタンを振り返して迎えに出る
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア(迎えた客の数と返しの早さ)
// スタイル: HD POST 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 低彩度で褐色〜灰に寄せる。光はブルーム(半透明円の重ね)、画面四辺にビネット
  var STYLE = { bg: ['#1b1a17', '#2b2823', '#3a352c'], main: ['#7d7462', '#5a5346', '#a39780'], accent: ['#e8a24a', '#7fb8a8'] };
  var C = {
    night: STYLE.bg[0], river: STYLE.bg[1], bank: STYLE.bg[2], reed: STYLE.main[1], mist: STYLE.main[0], pale: STYLE.main[2],
    amber: STYLE.accent[0], wisp: STYLE.accent[1], good: '#b8d98a', bad: '#e0624a', ink: '#0c0b09', white: '#f4ecd8',
  };

  var GAME_TITLE = 'FERRY LIGHT';
  var TIME_LIMIT = 15;          // cooldown_tap = A族 8〜15s
  var GUESTS = 7;
  var NEEDED = 7;
  var LIVES = 3;
  var COOL = 1.1;               // 振ったあと火が戻るまで
  var KINDLE = 0.45;            // 本物の灯がともり始める予告
  var BANK_Y = Math.round(H * 0.36);
  var FERRY_X = Math.round(W * 0.46), FERRY_Y = Math.round(H * 0.81);

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var events, clock, cool, lives, served, score, countIn, freeze, culprit, over, won, endT, swingT, sadT, milestoneDone, prevBest, lastEnd, fizzle;

  function print(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#00000088', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  // 渡し守(笠・半纏) 0,1=待機 2=振る 3=しょんぼり
  var BOATMAN = [
    ['...hhhh...', '.hhhhhhhh.', 'hhhhhhhhhh', '...kssk...', '....ss....', '..bbbbbb..', '.bbbbbbbbs', '.bbbbbbb.s', '..bbbbbb..', '..bb..bb..', '..kk..kk..'],
    ['...hhhh...', '.hhhhhhhh.', 'hhhhhhhhhh', '...ssss...', '....ss....', '..bbbbbb..', '.bbbbbbbbs', '.bbbbbbb.s', '..bbbbbb..', '..bb..bb..', '..kk..kk..'],
    ['...hhhh..s', '.hhhhhhhhs', 'hhhhhhhhhs', '...kssk..b', '....ss...b', '..bbbbbbbb', '.bbbbbbb..', '.bbbbbbb..', '..bbbbbb..', '..bb..bb..', '..kk..kk..'],
    ['..hhhh....', 'hhhhhhhh..', 'hhhhhhhhh.', '...ssss...', '....ss....', '..bbbbbb..', '.bbbbbbbb.', '.sbbbbbbs.', '..bbbbbb..', '..bb..bb..', '.kk....kk.'],
  ];
  var BOAT_PAL = { h: '#b39a6a', s: '#d8b892', k: '#1c1a16', b: '#3d4a5a' };
  var GUEST = ['.kk.', 'kkkk', '.kk.', 'kkkk', 'kkkk', 'k..k'];
  var FLAME = ['..#..', '.###.', '#####', '.###.'];

  function rnd(a, b) { return game.random(a, b); }

  // 予定表: 7組の客。狐火(前ぶれ型/後追い型)と水面のきらめきを混ぜる
  function buildSchedule(fixed) {
    var list = [];
    if (fixed) {
      list.push({ type: 'wisp', t: 0.25, x: W * 0.3, life: 0.9 });
      list.push({ type: 'real', t: 1.0, x: W * 0.68, win: 1.4 });
      list.push({ type: 'wisp', t: fixed.second, x: W * 0.4, life: 1.0 });
    } else {
      var slot0 = 0.9;
      for (var i = 0; i < GUESTS; i++) {
        var start = slot0 + i * 1.9;
        var win = 1.25 - i * 0.05;
        var pre = i >= 1 && rnd(0, 1) < 0.6;
        var off = pre ? rnd(0.6, 0.8) : rnd(0.15, 0.5);
        var rx = rnd(170, W - 170);
        list.push({ type: 'real', t: start + off, x: rx, win: win });
        if (pre) list.push({ type: 'wisp', t: start + off - rnd(0.4, 0.55), x: Math.abs(rx - W / 2) > 200 ? W - rx : (rx < W / 2 ? rx + 360 : rx - 360), life: 0.9 });
        var postT = start + off + KINDLE + win + 0.12;
        if (i >= 2 && rnd(0, 1) < 0.45 && postT < start + 1.9 + 0.3) list.push({ type: rnd(0, 1) < 0.5 ? 'wisp' : 'glint', t: postT, x: rnd(170, W - 170), life: 0.8 });
      }
    }
    for (var k = 0; k < list.length; k++) { list[k].done = false; list[k].flash = 0; list[k].phase = rnd(0, 6); }
    lastEnd = 0;
    for (var e = 0; e < list.length; e++) lastEnd = Math.max(lastEnd, list[e].t + (list[e].type === 'real' ? KINDLE + list[e].win : list[e].life));
    return list;
  }

  function visible(ev) {
    if (ev.done) return false;
    var age = clock - ev.t;
    if (age < 0) return false;
    return ev.type === 'real' ? age < KINDLE + ev.win : age < ev.life;
  }

  function initGame() {
    events = buildSchedule(null);
    clock = 0; cool = 0; lives = LIVES; served = 0; score = 0;
    countIn = 0.8; freeze = 0; culprit = null; over = false; won = false; endT = 0; swingT = 0; sadT = 0;
    milestoneDone = false; prevBest = game.best; fizzle = 0;
  }

  function lightPos(ev) {
    var age = clock - ev.t;
    if (ev.type === 'real') {
      var sw = age > KINDLE ? Math.sin((age - KINDLE) * 9) * 46 : 0;
      return { x: ev.x + sw, y: BANK_Y - 40 + Math.abs(sw) * 0.25 };
    }
    if (ev.type === 'glint') return { x: ev.x + Math.sin(age * 3) * 20, y: BANK_Y + 300 + ev.phase * 30 };
    return { x: ev.x + Math.sin(age * 2.2 + ev.phase) * 60, y: BANK_Y - 70 - age * 50 };
  }

  // 振り返す(本番・デモ共通の判定)
  function answer() {
    if (cool > 0) {
      cool += 0.3; fizzle = 0.3;
      game.feedback.bad(FERRY_X + 120, FERRY_Y - 170, { text: null, color: C.mist, shake: 0.05 });
      return 'early';
    }
    cool = COOL; swingT = 0.5;
    game.audio.tone(523, 0.08, { wave: 'triangle', volume: 0.12, slide: 120 });
    var real = null, lure = null;
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      if (!visible(ev)) continue;
      if (ev.type === 'real') real = ev; else if (!lure) lure = ev;
    }
    if (real) {
      real.done = true; real.flash = 1;
      var p = lightPos(real);
      var quick = Math.max(0, 1 - (clock - real.t) / (KINDLE + real.win));
      if (state === S.PLAYING) {
        served++;
        score += 100 + Math.round(quick * 100);
        game.feedback.good(p.x, p.y - 60, { text: quick > 0.6 ? 'PERFECT' : 'GOOD', color: C.good, size: 60 });
        if (!milestoneDone && served === 4) {
          milestoneDone = true;
          game.audio.play('se_milestone', 0.45);
          game.fx.popup(served + ' / ' + NEEDED, W / 2, H * 0.52, { color: C.amber, size: 64 });
        }
      } else {
        game.feedback.good(p.x, p.y - 60, { text: 'GOOD', color: C.good, size: 56 });
      }
      return 'good';
    }
    if (lure) { blunder(lure); return 'lure'; }
    game.audio.play('se_tap', 0.12);
    return 'none';
  }

  function blunder(ev) {
    ev.done = true; ev.flash = 1; culprit = ev; culprit.px = lightPos(ev);
    freeze = 0.45; sadT = 1.0;
    game.feedback.bad(culprit.px.x, culprit.px.y, { text: 'MISS', color: C.bad });
    if (state === S.PLAYING) lives--;
  }

  function stepRiver(dt) {
    clock += dt;
    if (cool > 0) { cool -= dt; if (cool <= 0) { cool = 0; game.audio.tone(784, 0.05, { wave: 'sine', volume: 0.08 }); } }
    if (swingT > 0) swingT -= dt;
    if (sadT > 0) sadT -= dt;
    if (fizzle > 0) fizzle -= dt;
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      if (ev.flash > 0 && freeze <= 0) ev.flash = Math.max(0, ev.flash - dt * 2.5);
      if (!ev.done && ev.type === 'real') {
        var age = clock - ev.t;
        if (age >= 0 && age < dt * 1.5) game.audio.tone(330, 0.12, { wave: 'sine', volume: 0.07 });
        if (age >= KINDLE + ev.win) blunder(ev);
      }
      if (!ev.done && ev.type !== 'real' && clock - ev.t >= ev.life) ev.done = true;
    }
  }

  // ── 描画 ──
  function bloom(x, y, r, col, k) {
    game.draw.circle(x, y, r * 3.2, col, 0.06 * k);
    game.draw.circle(x, y, r * 2.0, col, 0.14 * k);
    game.draw.circle(x, y, r, col, 0.9 * k);
  }

  function drawScene() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.night], [0.3, '#24221d'], [0.4, C.bank], [0.42, C.river], [0.78, '#22201b'], [0.8, C.bank], [1, C.night]]);
    // 月と霞
    bloom(W * 0.82, H * 0.16, 34, C.pale, 0.7);
    for (var m = 0; m < 4; m++) game.draw.rect(0, H * 0.3 + m * 26 + Math.sin(t * 0.6 + m) * 8, W, 14, C.mist, 0.06);
    // 対岸の葦(遠景シルエット)
    for (var r = 0; r < 26; r++) {
      var rx = r * 44 + (r % 3) * 9, rh = 60 + (r * 37) % 70;
      game.draw.rect(rx, BANK_Y + 20 - rh + Math.sin(t * 1.4 + r) * 3, 6, rh, C.reed, 0.9);
    }
    game.draw.rect(0, BANK_Y + 20, W, 26, C.reed);
    // 川面の筋
    for (var s = 0; s < 18; s++) {
      var sy = BANK_Y + 70 + s * 40;
      var sx = ((s * 173 + t * (20 + s * 3)) % (W + 300)) - 150;
      game.draw.rect(sx, sy, 160 + (s % 4) * 30, 4, C.pale, 0.08);
    }
    // 手前の桟橋
    game.draw.rect(0, Math.round(H * 0.8), W, 26, '#4a4235');
    for (var p = 0; p < 6; p++) game.draw.rect(60 + p * 190, Math.round(H * 0.8), 18, 140, '#2e2922');
  }

  function drawLights() {
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      var showFlash = ev.flash > 0;
      if (!visible(ev) && !showFlash) continue;
      var p = ev === culprit && culprit.px ? culprit.px : lightPos(ev);
      var age = clock - ev.t;
      var sc = showFlash ? 1 + ev.flash * 0.4 : 1;
      if (ev.type === 'real') {
        var k = age < KINDLE ? Math.max(0.15, age / KINDLE) * 0.6 : 1;
        game.draw.sprite(GUEST, { k: C.ink }, ev.x, BANK_Y - 10, 16, { anchor: 'center' });
        game.draw.line(ev.x + 14, BANK_Y - 40, p.x, p.y, C.ink, 4);
        bloom(p.x, p.y, 28 * sc, C.amber, k);
        game.draw.rect(p.x - 3, p.y + 30, 6, 160 * k, C.amber, 0.25 * k);   // 水面への映り込み
      } else if (ev.type === 'wisp') {
        var pulse = 0.6 + 0.4 * Math.sin(age * 14 + ev.phase);
        bloom(p.x, p.y, 32 * sc * (0.8 + pulse * 0.4), C.wisp, pulse);
        game.draw.sprite(FLAME, { '#': '#d8f0e8' }, p.x, p.y - 6, 6 * sc, { anchor: 'center', alpha: pulse });
      } else {
        var gl = Math.max(0, Math.sin(age * 20 + ev.phase));
        bloom(p.x, p.y, 14 * sc, C.white, 0.4 + gl * 0.6);
        game.draw.rect(p.x - 60, p.y, 120, 4, C.white, 0.5 * gl);
      }
      if (showFlash) game.draw.circle(p.x, p.y, 40 * sc, '#ffffff', ev.flash * 0.6);
    }
  }

  function drawFerry() {
    var t = game.time.elapsed;
    var f = sadT > 0 ? BOATMAN[3] : swingT > 0 ? BOATMAN[2] : BOATMAN[Math.floor(t * 1.3) % 6 === 5 ? 1 : 0];
    if (state === S.RESULT) f = won ? BOATMAN[2] : BOATMAN[3];
    var bob = Math.sin(t * 1.8) * 6;
    // 舟
    game.draw.rect(FERRY_X - 260, FERRY_Y + 90 + bob, 520, 40, '#4a3d2c');
    game.draw.rect(FERRY_X - 300, FERRY_Y + 70 + bob, 600, 24, '#6a5840');
    game.draw.sprite(f, BOAT_PAL, FERRY_X, FERRY_Y + bob, 14, { anchor: 'center' });
    // 手持ちのランタン(振る/火が戻る)
    var swing = swingT > 0 ? Math.sin(swingT * 22) * 60 : 0;
    var lx = FERRY_X + 150 + swing, ly = FERRY_Y - 120 + bob - (swingT > 0 ? 60 : 0);
    game.draw.line(FERRY_X + 80, FERRY_Y - 30 + bob, lx, ly, '#2e2922', 6);
    var ready = cool <= 0;
    var lit = ready ? 1 : 0.25;
    bloom(lx, ly + 40, 26, fizzle > 0 ? C.mist : C.amber, lit);
    game.draw.rect(lx - 22, ly + 14, 44, 56, '#5a4a32', 0.9);
    game.draw.rect(lx - 16, ly + 20, 32, 44, C.amber, 0.3 + lit * 0.6);
    // 火が戻るまでのリング(縮むのではなく満ちていく)
    if (!ready) {
      var n = 16, fill = Math.floor(n * (1 - Math.min(1, cool / COOL)));
      for (var i = 0; i < n; i++) {
        var a = -Math.PI / 2 + (i / n) * Math.PI * 2;
        game.draw.circle(lx + Math.cos(a) * 64, ly + 42 + Math.sin(a) * 64, 7, i < fill ? C.amber : '#00000066');
      }
    } else if (state === S.PLAYING) {
      game.draw.circle(lx, ly + 42, 60 + 6 * Math.sin(t * 6), C.white, 0.08);
    }
  }

  function vignette() {
    for (var i = 0; i < 4; i++) {
      var d = 30 + i * 30, a = 0.16;
      game.draw.rect(0, 0, d, H, '#000000', a);
      game.draw.rect(W - d, 0, d, H, '#000000', a);
      game.draw.rect(0, 0, W, d, '#000000', a);
      game.draw.rect(0, H - d, W, d, '#000000', a);
    }
  }

  function hud() {
    print(String(score), 170, 80, 52, C.white);
    print(served + ' / ' + NEEDED, W - 170, 80, 46, C.white);
    for (var i = 0; i < LIVES; i++) bloom(W / 2 - 70 + i * 70, 80, 14, i < lives ? C.amber : '#000000', i < lives ? 0.9 : 0.5);
    var frac = Math.max(0, 1 - clock / TIME_LIMIT);
    game.draw.rect(100, 160, W - 200, 12, '#00000066');
    game.draw.rect(100, 160, (W - 200) * frac, 12, frac < 0.2 && Math.floor(game.time.elapsed * 8) % 2 === 0 ? C.bad : C.pale);
  }

  function drawWorld() { drawScene(); drawLights(); drawFerry(); }

  // ── 入力: どこを押してもランタンを振る ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.n = -1; return; }
    if (over || countIn > 0 || freeze > 0) { game.audio.play('se_tap', 0.06); return; }
    var r = answer();
    if (r === 'early') game.audio.play('se_tap', 0.1);
  });

  // ── ATTRACT: 狐火は見送り、本物にだけ振る周 → 次の周は後追いの狐火に釣られて失敗 ──
  var demo = { t: 0, n: -1, gx: W / 2, gy: H * 0.9, press: false, taps: [] };
  function demoStep(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.8;
    if (cyc < dt || demo.t <= dt) {
      demo.n++;
      clock = 0; cool = 0; culprit = null; swingT = 0; sadT = 0; freeze = 0;
      events = buildSchedule({ second: 2.75 });
      demo.taps = demo.n % 2 === 0 ? [1.55] : [1.55, 2.95];
    }
    if (freeze > 0) freeze -= dt;
    else stepRiver(dt);
    // 手は灯の方を指してから、手元で押す
    var target = null;
    for (var i = 0; i < events.length; i++) if (visible(events[i])) target = lightPos(events[i]);
    var hx = target ? target.x : W / 2, hy = target ? H * 0.62 : H * 0.88;
    demo.gx += (hx - demo.gx) * Math.min(1, dt * 4); demo.gy += (hy - demo.gy) * Math.min(1, dt * 4);
    demo.press = false;
    for (var k = 0; k < demo.taps.length; k++) {
      var tt = demo.taps[k];
      if (cyc > tt - 0.15 && cyc < tt + 0.1) demo.press = true;
      if (cyc >= tt && cyc - dt < tt) answer();
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!events) initGame();
      demoStep(dt);
      drawWorld();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      vignette();
      print(GAME_TITLE, W / 2, H * 0.06, 84, C.amber);
      print('HI-SCORE ' + game.best, W / 2, H * 0.105, 36, C.pale);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) print('► 100円 投入 ◄', W / 2, H * 0.965, 42, C.amber);
      else print('TAP TO START', W / 2, H * 0.965, 40, C.pale);
      return;
    }

    if (state === S.RESULT) {
      drawWorld();
      vignette();
      print(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.5, 96, won ? C.amber : C.bad);
      print('SCORE ' + score, W / 2, H * 0.56, 56, C.white);
      if (score > prevBest && prevBest > 0) print('NEW RECORD', W / 2, H * 0.61, 52, C.amber);
      else print('BEST ' + Math.max(prevBest, score), W / 2, H * 0.61, 42, C.pale);
      if (!won) print('あと' + (NEEDED - served) + '人!', W / 2, H * 0.66, 48, C.pale);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) print('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.pale);
      return;
    }

    // ── PLAYING ──
    if (endT > 0) {
      endT -= dt;
      if (endT <= 0) {
        state = S.RESULT;
        var stats = { served: served, lives: lives };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (countIn > 0) {
      countIn -= dt;
      if (countIn <= 0) game.audio.play('se_tap', 0.3);
    } else if (freeze > 0) {
      freeze -= dt;
      if (freeze <= 0) {
        culprit = null;
        if (lives <= 0) { over = true; won = false; finish(); }
      }
    } else if (!over) {
      stepRiver(dt);
      if (freeze <= 0 && (clock >= lastEnd + 0.2 || clock >= TIME_LIMIT)) {
        over = true; won = lives > 0;
        finish();
      }
    }

    drawWorld();
    hud();
    vignette();
    if (countIn > 0) print(countIn > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 110, C.amber);
  });

  function finish() {
    if (endT > 0) return;
    endT = 1.5;
    game.audio.stopBgm();
    game.audio.play(won ? 'se_success' : 'se_failure', 0.5);
    if (won) {
      score += lives * 150;
      for (var i = 0; i < 6; i++) game.fx.burst(game.random(140, 940), game.random(500, 1300), { color: i % 2 ? C.amber : C.white, count: 18, speed: 380 });
    }
  }

  game.onStart(function() {
    game.audio.melody([
      ['D4', 1], ['F4', 0.5], ['G4', 0.5], ['A4', 1.5], ['R', 0.5], ['C5', 0.5], ['A4', 0.5], ['G4', 1], ['F4', 1], ['D4', 2], ['R', 1],
    ], { tempo: 84, wave: 'sine', volume: 0.06, loop: true, bass: [['D2', 2], ['A2', 2], ['G2', 2], ['D2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

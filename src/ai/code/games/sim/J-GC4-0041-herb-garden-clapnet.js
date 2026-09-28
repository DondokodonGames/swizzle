// J-GC4-0041-herb-garden-clapnet.js
// 薬草園の挟み網 — ひらひら逃げる光る蝶を、二本指の二つの網輪ではさんで捕まえる
// 操作: 蝶をはさむように二本の指を同時に置く。二つの網輪のあいだに蝶がいれば網が閉じて捕まる。指の間が広すぎると網が届かない
// 終わり: 制限時間内に規定数を捕まえればCLEAR。時間切れでGAME OVER
// @mechanic: pinch_zone
// @theme: dawn_herb_garden_butterflies
// 世界観: 夜明けの薬草園で灯り番の少女が、二つの網輪をつないだ挟み網で朝露の光をまとった蝶をはさみ取り、灯籠の瓶を夜明けまでに満たす
// 残るもの: 正誤(CLEAR/GAME OVER) + 捕まえた蝶の数・空振り数
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 多色+光、パララックスの背景層、細かいアニメ
  var STYLE = { bg: ['#1f2a4d', '#6b5a9e', '#f3a86b'], main: ['#3f7a4a', '#6fb35a', '#c6e88a'], accent: ['#9ff2ff', '#ffd66b'] };
  var C = {
    sky1: '#2a3566', sky2: '#8a6aa8', sky3: '#f5b27a', hill1: '#34506a', hill2: '#3e6a55', herb1: '#2f6a3c', herb2: '#4f9a4f',
    herb3: '#8fcf6a', dew: '#bff6ff', glow: '#9ff2ff', gold: '#ffd66b', net: '#f6f1e0', netD: '#b9a98a', ink: '#1b1830',
    white: '#ffffff', bad: '#ff6a7a', good: '#7af0a8', wing1: '#9ff2ff', wing2: '#5fb8ff', wingG: '#ffd66b', wingG2: '#ff9f3a'
  };

  var GAME_TITLE = 'CLAP NET';
  var TIME_LIMIT = 14;
  var NEEDED = 5;
  var MAX_SPAN = 640, MIN_SPAN = 140, CATCH_D = 80;
  var FIELD_Y0 = H * 0.2, FIELD_Y1 = H * 0.72;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var phase, ready, timeLeft, flies, caught, misses, clap, hoop, hitStop, outro, ok, focus, halfShown, jar, playT, wideWarn;

  // ── sprites ───────────────────────────────────────────────────────
  var FLY = [
    ['aa...aa', 'abaaaba', 'aabkbaa', '.aakaa.', '.ab.ba.', '..a.a..'],
    ['.......', '.aa.aa.', 'abbkbba', '.aakaa.', '..a.a..', '.......']
  ];
  var KEEPER = [
    ['...hhh...', '..hhhhh..', '..hfffh..', '..fefef..', '...fff...', '..ccccc..', '.cclllcc.', '..ccccc..', '..c...c..'],
    ['...hhh...', '..hhhhh..', '..hfffh..', '..fefef..', '...fff...', '..ccccc..', '.cclllcc.', '..ccccc..', '...c.c...']
  ];
  var KEEPER_PAL = { h: '#5a2f1c', f: '#f5cfa5', e: C.ink, c: '#b25a7a', l: C.gold };
  var JAR = ['.nnnn.', 'n....n', 'n....n', 'n....n', 'n....n', '.nnnn.'];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function newFly(gold) {
    return {
      x: game.random(160, W - 160), y: game.random(FIELD_Y0 + 80, FIELD_Y1 - 60), vx: game.random(-120, 120), vy: game.random(-80, 80),
      ph: game.random(0, 6), gold: !!gold, scare: 0, caught: 0
    };
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; flies = [newFly(false), newFly(false), newFly(false)];
    caught = 0; misses = 0; clap = null; hoop = null; hitStop = 0; outro = 0; ok = false; focus = null; halfShown = false;
    jar = 0; playT = 0; wideWarn = false;
  }

  function segDist(px, py, ax, ay, bx, by) {
    var vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay;
    var l2 = vx * vx + vy * vy;
    var t = l2 > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / l2)) : 0;
    return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
  }

  // 二点で網を閉じる(実プレイ・デモ共用)。捕まえた蝶 or null
  function clapAt(a, b, isDemo) {
    var span = Math.hypot(b.x - a.x, b.y - a.y);
    clap = { a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y }, t: 0, hit: null };
    var best = null, bestD = CATCH_D;
    if (span >= MIN_SPAN && span <= MAX_SPAN) {
      for (var i = 0; i < flies.length; i++) {
        var f = flies[i];
        if (f.caught > 0) continue;
        var d = segDist(f.x, f.y, a.x, a.y, b.x, b.y);
        if (d < bestD) { bestD = d; best = f; }
      }
    }
    clap.hit = best;
    if (best) {
      best.caught = 0.01;
      if (!isDemo) {
        caught += best.gold ? 2 : 1; jar = 0.4;
        focus = best; hitStop = 0.18;
        game.audio.play('se_coin', 0.5);
        game.feedback.good(best.x, best.y - 70, { text: best.gold ? 'PERFECT' : (bestD < 35 ? 'NICE' : 'GOOD'), color: best.gold ? C.gold : C.good, count: best.gold ? 22 : 12 });
        if (!halfShown && caught >= Math.ceil(NEEDED / 2)) {
          halfShown = true;
          game.audio.play('se_milestone', 0.5);
          game.fx.popup(caught + ' / ' + NEEDED, W / 2, H * 0.17, { color: C.gold, size: 60 });
        }
        if (caught >= NEEDED) finish(true);
      } else {
        game.fx.burst(best.x, best.y, { color: C.glow, count: 10, speed: 240 });
      }
    } else {
      // 空振り: 周りの蝶がびくっと逃げる
      for (var j = 0; j < flies.length; j++) {
        var q = flies[j];
        var dx = q.x - (a.x + b.x) / 2, dy = q.y - (a.y + b.y) / 2;
        var dd = Math.hypot(dx, dy) || 1;
        if (dd < 420) { q.vx += dx / dd * 380; q.vy += dy / dd * 300; q.scare = 0.8; }
      }
      if (!isDemo) {
        misses++;
        game.feedback.bad((a.x + b.x) / 2, (a.y + b.y) / 2 - 40, { text: 'MISS', shake: 4 });
      }
    }
    return best;
  }

  function stepFlies(dt) {
    var t = game.time.elapsed;
    var speedK = 1 + Math.min(0.8, playT * 0.05);
    var retain = Math.pow(0.5, dt);
    for (var i = flies.length - 1; i >= 0; i--) {
      var f = flies[i];
      if (f.caught > 0) {
        f.caught += dt;
        // 灯籠の瓶へ吸い込まれる
        f.x += (W * 0.86 - f.x) * Math.min(1, dt * 5); f.y += (H * 0.86 - f.y) * Math.min(1, dt * 5);
        if (f.caught > 0.6) { flies.splice(i, 1); flies.push(newFly(playT > 4 && Math.random() < 0.25)); }
        continue;
      }
      if (f.scare > 0) f.scare -= dt;
      // ひらひら: ゆらぐ加速度 + 羽ばたきの上下
      f.vx += Math.sin(t * 1.7 + f.ph) * 260 * dt + game.random(-200, 200) * dt;
      f.vy += Math.cos(t * 1.3 + f.ph * 2) * 200 * dt + game.random(-160, 160) * dt;
      var base = (f.gold ? 230 : 150) * speedK;
      var sp = Math.hypot(f.vx, f.vy);
      if (sp > base * (f.scare > 0 ? 2.4 : 1)) { f.vx *= retain; f.vy *= retain; }
      f.x += f.vx * dt; f.y += f.vy * dt + Math.sin(t * 9 + f.ph) * 40 * dt;
      if (f.x < 90) { f.x = 90; f.vx = Math.abs(f.vx); }
      if (f.x > W - 90) { f.x = W - 90; f.vx = -Math.abs(f.vx); }
      if (f.y < FIELD_Y0) { f.y = FIELD_Y0; f.vy = Math.abs(f.vy); }
      if (f.y > FIELD_Y1) { f.y = FIELD_Y1; f.vy = -Math.abs(f.vy); }
    }
  }

  function finish(win) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.5;
    game.audio.stopBgm();
    if (win) { game.fx.flash(C.gold, 0.25); game.audio.play('se_success', 0.6); }
    else {
      focus = null;
      game.feedback.bad(W / 2, H * 0.45, { text: 'TIME UP' });
      game.audio.play('se_failure', 0.6);
    }
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || phase !== 'play') return;
    var ts = game.touches;
    if (ts.length >= 2) {
      var a = ts[ts.length - 2], b = ts[ts.length - 1];
      game.audio.play('se_jump', 0.35);
      clapAt(a, b, false);
      hoop = null;
    } else {
      // 一本目: 網輪を一つ置く
      hoop = { x: x, y: y, t: 0 };
      game.audio.play('se_tap', 0.25);
    }
  });

  game.onMove(function(x, y) {
    if (state !== S.PLAYING || phase !== 'play') return;
    var ts = game.touches;
    if (hoop && ts.length === 1) { hoop.x = x; hoop.y = y; }
    if (ts.length >= 2) {
      var span = Math.hypot(ts[1].x - ts[0].x, ts[1].y - ts[0].y);
      var wide = span > MAX_SPAN;
      if (wide && !wideWarn) game.audio.tone('B2', 0.08, { wave: 'sawtooth', volume: 0.05 });
      wideWarn = wide;
    }
  });

  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    if (game.touches.length === 0 && hoop) {
      hoop = null;
      game.audio.tone('G3', 0.04, { wave: 'triangle', volume: 0.04 });
    }
  });

  // ── demo(二つの手で蝶をはさむ。偶数周はわざと広げすぎて空振り)─────
  var demo = { t: 0, ax: W * 0.3, ay: H * 0.5, bx: W * 0.7, by: H * 0.5, press: false, n: 0, done: false, target: null };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) {
      demo.n++; demo.done = false; demo.target = null;
      if (flies.length < 3) flies.push(newFly(false));
      for (var i = 0; i < flies.length; i++) if (flies[i].caught <= 0) { demo.target = flies[i]; break; }
    }
    var f = demo.target;
    if (!f) { demo.press = false; return; }
    var good = demo.n % 2 === 1;
    var half = good ? 170 : 380;
    var k = Math.min(1, cyc / 1.1);
    var ang = 0.3;
    var tax = f.x - Math.cos(ang) * half, tay = f.y - Math.sin(ang) * half;
    var tbx = f.x + Math.cos(ang) * half, tby = f.y + Math.sin(ang) * half;
    var rate = f.caught > 0 ? 0 : Math.min(1, dt * (3 + 9 * k));
    demo.ax += (tax - demo.ax) * rate; demo.ay += (tay - demo.ay) * rate;
    demo.bx += (tbx - demo.bx) * rate; demo.by += (tby - demo.by) * rate;
    demo.press = cyc > 1.1 && cyc < 1.6;
    if (cyc > 1.2 && !demo.done) {
      demo.done = true;
      clapAt({ x: demo.ax, y: demo.ay }, { x: demo.bx, y: demo.by }, true);
    }
  }

  // ── drawing ───────────────────────────────────────────────────────
  function drawGarden() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky1], [0.28, C.sky2], [0.42, C.sky3], [0.43, C.hill1], [1, C.herb1]]);
    // 朝の光の筋
    for (var r = 0; r < 4; r++) game.draw.rect(160 + r * 240 + Math.sin(t * 0.5 + r) * 20, 0, 60, H * 0.75, '#fff3c8', 0.06 + 0.03 * Math.sin(t + r));
    // 遠景の丘(パララックス1)
    for (var x = 0; x < W; x += 10) {
      var h1 = 70 + Math.sin(x * 0.005 + t * 0.05) * 40;
      game.draw.rect(x, H * 0.43 - h1, 10, h1, C.hill1);
    }
    // 中景の生け垣(パララックス2)
    for (var x2 = 0; x2 < W; x2 += 10) {
      var h2 = 60 + Math.sin(x2 * 0.02 + t * 0.2) * 20 + Math.sin(x2 * 0.07) * 10;
      game.draw.rect(x2, H * 0.5 - h2, 10, h2 + 40, C.hill2);
    }
    // 薬草の株(近景、揺れる)
    for (var i = 0; i < 12; i++) {
      var bx = 40 + i * 92, by = H * 0.74 + (i % 3) * 30;
      var sw = Math.sin(t * 1.6 + i) * 8;
      game.draw.rect(bx + sw, by - 90, 16, 90, C.herb2);
      game.draw.circle(bx + 8 + sw, by - 100, 34, C.herb2);
      game.draw.circle(bx + 16 + sw, by - 112, 18, C.herb3);
      game.draw.circle(bx + 20 + sw, by - 120, 5, C.dew, 0.5 + 0.5 * Math.sin(t * 3 + i));
    }
    game.draw.rect(0, H * 0.8, W, H * 0.2, C.herb1);
    game.draw.rect(0, 0, W, H, '#fff0d0', 0.03 + 0.03 * Math.sin(t * 1.2));
  }

  function drawFlies() {
    var t = game.time.elapsed;
    for (var i = 0; i < flies.length; i++) {
      var f = flies[i];
      var fr = FLY[Math.floor(t * 12 + f.ph * 3) % 2];
      var pal = f.gold ? { a: C.wingG, b: C.wingG2, k: C.ink } : { a: C.wing1, b: C.wing2, k: C.ink };
      var sc = f.caught > 0 ? Math.max(3, 12 * (1 - f.caught)) : 12;
      if (focus === f && hitStop > 0) { sc = 16; game.draw.circle(f.x, f.y, 90, C.white, 0.5); }
      game.draw.circle(f.x, f.y, 46, f.gold ? C.gold : C.glow, 0.18 + 0.08 * Math.sin(t * 5 + f.ph));
      game.draw.sprite(fr, pal, f.x, f.y, sc, { anchor: 'center', flipX: f.vx < 0 });
    }
  }

  function drawHoopAt(x, y, a) {
    game.draw.circle(x, y, 58, C.netD, a);
    game.draw.circle(x, y, 50, C.net, a * 0.35);
    game.draw.circle(x, y, 8, C.netD, a);
  }

  function drawNet() {
    var ts = state === S.PLAYING ? game.touches : [];
    if (ts.length >= 2) {
      var span = Math.hypot(ts[1].x - ts[0].x, ts[1].y - ts[0].y);
      var col = span > MAX_SPAN ? C.bad : C.net;
      for (var k = 0; k < 5; k++) game.draw.line(ts[0].x, ts[0].y - 40 + k * 20, ts[1].x, ts[1].y - 40 + k * 20, col, 3);
      drawHoopAt(ts[0].x, ts[0].y, 1); drawHoopAt(ts[1].x, ts[1].y, 1);
    } else if (hoop) {
      drawHoopAt(hoop.x, hoop.y, 0.8 + 0.2 * Math.sin(game.time.elapsed * 8));
    }
    if (clap) {
      var k2 = Math.min(1, clap.t / 0.22);
      var mx = (clap.a.x + clap.b.x) / 2, my = (clap.a.y + clap.b.y) / 2;
      var ax = clap.a.x + (mx - clap.a.x) * k2, ay = clap.a.y + (my - clap.a.y) * k2;
      var bx = clap.b.x + (mx - clap.b.x) * k2, by = clap.b.y + (my - clap.b.y) * k2;
      for (var m = 0; m < 5; m++) game.draw.line(ax, ay - 40 + m * 20, bx, by - 40 + m * 20, clap.hit ? C.gold : C.net, 3);
      drawHoopAt(ax, ay, 1 - k2 * 0.5); drawHoopAt(bx, by, 1 - k2 * 0.5);
    }
  }

  function drawKeeperJar() {
    var t = game.time.elapsed;
    game.draw.sprite(KEEPER[Math.floor(t * 2) % 2], KEEPER_PAL, W * 0.14, H * 0.86 + Math.sin(t * 2.4) * 5, 14, { anchor: 'center' });
    var jx = W * 0.86, jy = H * 0.86;
    var glow = Math.min(1, caught / NEEDED);
    game.draw.circle(jx, jy, 70 + (jar > 0 ? jar * 60 : 0), C.gold, 0.15 + glow * 0.3);
    game.draw.sprite(JAR, { n: C.net }, jx, jy, 20, { anchor: 'center' });
    for (var i = 0; i < Math.min(8, caught); i++) {
      game.draw.circle(jx - 30 + (i % 3) * 30 + Math.sin(t * 4 + i) * 6, jy + 30 - Math.floor(i / 3) * 26, 9, C.glow, 0.9);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, C.ink, 0.45);
    txt(caught + ' / ' + NEEDED, W / 2, 95, 68, C.gold);
    txt(String(Math.ceil(timeLeft)), 80, 95, 50, C.white, 'left');
    game.draw.rect(60, 172, W - 120, 20, C.ink, 0.7);
    game.draw.rect(60, 172, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 20, timeLeft < 4 ? C.bad : C.glow);
  }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (jar > 0) jar -= dt;
    if (clap) { clap.t += dt; if (clap.t > 0.35) clap = null; }

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      playT = 2;
      stepDemo(dt);
      stepFlies(dt);
      drawGarden(); drawFlies(); drawNet(); drawKeeperJar();
      if (demo.press && !clap) {
        for (var dn = 0; dn < 5; dn++) game.draw.line(demo.ax, demo.ay - 40 + dn * 20, demo.bx, demo.by - 40 + dn * 20, C.net, 3);
        drawHoopAt(demo.ax, demo.ay, 1); drawHoopAt(demo.bx, demo.by, 1);
      }
      game.draw.hand(demo.ax, demo.ay, { press: demo.press, scale: 13 });
      game.draw.hand(demo.bx, demo.by, { press: demo.press, scale: 13 });
      txt(GAME_TITLE, W / 2, H * 0.06 + Math.sin(t * 2) * 6, 80, C.gold);
      txt('HI-SCORE ' + game.best, W / 2, H * 0.11, 36, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 44, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.95, 36, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawGarden(); drawKeeperJar();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 90, ok ? C.gold : C.bad);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 40, C.white);
      return;
    }

    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'play') {
      if (hitStop > 0) hitStop -= dt;
      else {
        timeLeft -= dt; playT += dt;
        stepFlies(dt);
        if (phase === 'play' && timeLeft <= 0) { timeLeft = 0; finish(false); }
      }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      stepFlies(dt);
      if (outro <= 0) {
        state = S.RESULT;
        var score = caught * 100 - misses * 10 + Math.round(timeLeft * 10);
        var stats = { caught: caught, misses: misses };
        if (ok) game.end.success(Math.max(0, score), stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawGarden(); drawFlies(); drawNet(); drawKeeperJar(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 96, C.gold);
    if (phase === 'outro') {
      game.draw.rect(0, H * 0.33, W, H * 0.17, C.ink, 0.7);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.37, 96, ok ? C.gold : C.bad);
      var sc = Math.max(0, caught * 100 - misses * 10 + Math.round(timeLeft * 10));
      txt('SCORE ' + sc, W / 2, H * 0.43, 44, C.white);
      if (ok && sc > game.best) txt('NEW RECORD', W / 2, H * 0.47, 40, C.gold);
      else if (!ok) txt('あと' + Math.max(1, NEEDED - caught) + '匹!', W / 2, H * 0.47, 44, C.white);
      else txt('BEST ' + game.best, W / 2, H * 0.47, 36, C.white);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['E5', 0.5], ['B4', 0.5], ['G5', 1], ['F#5', 0.5], ['E5', 0.5], ['B4', 1],
      ['C5', 0.5], ['E5', 0.5], ['A5', 1], ['G5', 0.5], ['F#5', 0.5], ['E5', 1]
    ], { tempo: 104, wave: 'sine', volume: 0.07, loop: true, bass: [['E3', 2], ['B2', 2], ['A2', 2], ['B2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

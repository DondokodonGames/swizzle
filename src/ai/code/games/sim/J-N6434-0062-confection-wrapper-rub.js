// J-N6434-0062-confection-wrapper-rub.js
// すかし飴えらび — 同じ包み紙の飴を指でこすって温め、透けて見えた中身から蜂蜜入りだけを選ぶ
// 操作: 飴の上を指で往復してこすると包み紙が透ける(時間で曇り直す)。蜂蜜色の中身が見えた飴を軽くタップして食べる
// 終わり: 3皿続けて蜂蜜飴を選べば成功。苦い飴を食べる/3秒手が止まる/時間切れで失敗
// @mechanic: rub
// @theme: confection_wrapper_rub
// 世界観: 下町の飴屋の奥で、弟子入りしたての見習いが親方の出す試し皿に挑む。包み紙を指の熱で透かし、苦草入りや唐辛子入りに紛れた蜂蜜飴だけを見抜いて口に運ぶ
// 残るもの: 正誤(CLEAR/GAME OVER) + 選んだ蜂蜜飴の数・こすった回数
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 巨大キャラ、床影、多色
  var STYLE = { bg: ['#ffd9a8', '#f59a6b'], main: ['#6b3a2a', '#a8583a', '#fff1dc'], accent: ['#ffc21a', '#3fae5a'] };
  var C = { wall1: '#ffd9a8', wall2: '#f59a6b', counter: '#a8583a', counterDark: '#6b3a2a', wrap: '#f4f0ff', wrapShade: '#c9c0e8',
    honey: '#ffc21a', bitter: '#3fae5a', chili: '#e8402f', ink: '#2a140c', white: '#ffffff', good: '#3fae5a', bad: '#e8402f', gold: '#ffc21a' };

  var GAME_TITLE = 'CANDY PEEK';
  var TIME_LIMIT = 14;
  var NEEDED = 3;
  var COUNTS = [4, 5, 5];
  var FOG = [0.35, 0.5, 0.9];
  var HEAT_FULL = 650;
  var IDLE_LIMIT = 3;
  var ROW_Y = H * 0.52;
  var CANDY_R = 100;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var round, candies, phase, phT, idleT, got, perfects, rubs, score, eaten, pressing, px0, py0, lastX, lastY, moved, pressT;
  var timeLeft, ready, hitStop, finished, ok, done, endWait;

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 4, y + 5, { size: sz, color: C.counterDark, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  var WRAP = [
    'tt..........tt',
    'ttt.wpwwpww.tt',
    '.ttwpwwpwwpwt.',
    '..wpwwpwwpwww.',
    '..wwpwwpwwpww.',
    '.ttwwpwwpwwpt.',
    'ttt.wwpwwpw.tt',
    'tt..........tt'
  ];
  var FILL = ['.fffffff.', 'fffffffff', 'fffffffff', 'fffffffff', '.fffffff.'];
  var MASTER_A = ['...hhhh...', '..hhhhhh..', '...ssss...', '..sKssKs..', '...ssss...', '.aaaaaaaa.', 'aaaaaaaaaa', 'aa.aaaa.aa', '...aaaa...'];
  var MASTER_B = ['...hhhh...', '..hhhhhh..', '...ssss...', '..sKssKs..', '...smms...', '.aaaaaaaa.', 'aaaaaaaaaa', 'aa.aaaa.aa', '...aaaa...'];
  var MASTER_PAL = { h: '#fff1dc', s: '#f0c090', K: '#2a140c', m: '#a8583a', a: '#fff1dc' };
  var CAT_A = ['c...c', 'ccccc', 'cKcKc', 'ccccc', '.c.c.'];
  var CAT_B = ['c...c', 'ccccc', 'cKcKc', 'ccccc', 'c...c'];

  function newRound() {
    var n = COUNTS[Math.min(round, COUNTS.length - 1)];
    var honeyIdx = Math.floor(game.random(0, n - 0.01));
    candies = [];
    var span = n === 4 ? 230 : 190;
    for (var i = 0; i < n; i++) {
      var kind = i === honeyIdx ? 'honey' : (game.random(0, 1) < 0.5 ? 'bitter' : 'chili');
      candies.push({ x: W / 2 + (i - (n - 1) / 2) * span, y: ROW_Y + (i % 2 ? 50 : -30), kind: kind, heat: 0, ph: game.random(0, 6), gone: false });
    }
    phase = 'pick'; phT = 0; idleT = 0; eaten = -1;
  }

  function initGame() {
    round = 0; got = 0; perfects = 0; rubs = 0; score = 0; pressing = false; moved = 0; pressT = 0;
    timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0; finished = false; ok = false; done = false; endWait = 0;
    newRound();
  }

  function clarity(c) { return Math.min(1, c.heat / HEAT_FULL); }
  function candyAt(x, y) {
    var best = -1, bd = 1e9;
    for (var i = 0; i < candies.length; i++) {
      var d = Math.hypot(x - candies[i].x, y - candies[i].y);
      if (d < CANDY_R + 20 && d < bd) { bd = d; best = i; }
    }
    return best;
  }

  // こする / 食べる — プレイもデモもここを通る
  function rubAt(x, y, d, live) {
    var i = candyAt(x, y);
    if (i < 0 || phase !== 'pick') return false;
    var before = clarity(candies[i]);
    candies[i].heat = Math.min(HEAT_FULL * 1.3, candies[i].heat + d);
    idleT = 0;
    if (live && before < 0.6 && clarity(candies[i]) >= 0.6) { rubs++; game.audio.tone(candies[i].kind === 'honey' ? 'E6' : 'E5', 0.08, { wave: 'triangle', volume: 0.05 }); }
    return true;
  }
  function eat(i, live) {
    if (phase !== 'pick') return false;
    eaten = i; phase = 'eat'; phT = 0;
    var c = candies[i];
    if (c.kind === 'honey') {
      var revealed = 0;
      for (var k = 0; k < candies.length; k++) if (clarity(candies[k]) > 0.5) revealed++;
      var perfect = revealed <= 2;
      got++;
      if (perfect) perfects++;
      score += perfect ? 180 : 120;
      if (live) {
        game.feedback.good(c.x, c.y - 140, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.gold : C.good, size: 64 });
        if (got === 2) { game.audio.play('se_milestone', 0.5); game.fx.popup(got + ' / ' + NEEDED, W / 2, H * 0.36, { color: C.gold, size: 64 }); }
        if (got >= NEEDED) { finished = true; ok = true; hitStop = 0.45; score += Math.round(timeLeft * 25); }
      }
    } else if (live) {
      finished = true; ok = false; hitStop = 0.5;
      game.audio.play('se_break', 0.35);
    }
    return true;
  }

  function stepRound(dt, live) {
    phT += dt;
    var fog = FOG[Math.min(round, FOG.length - 1)];
    for (var i = 0; i < candies.length; i++) {
      candies[i].heat = Math.max(0, candies[i].heat - HEAT_FULL * fog * dt);
    }
    if (phase === 'pick') {
      idleT += dt;
      if (live && idleT > IDLE_LIMIT) { finished = true; ok = false; hitStop = 0.5; eaten = -1; }
    } else if (phase === 'eat' && phT > 0.55 && !finished) {
      round++;
      if (round >= NEEDED) { round = NEEDED - 1; phase = 'end'; }
      else newRound();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; music(); return; }
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || finished || ready > 0) return;
    pressing = true; px0 = x; py0 = y; lastX = x; lastY = y; moved = 0; pressT = 0; idleT = 0;
    game.audio.play('se_tap', 0.12);
  });

  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !pressing || finished) return;
    var d = Math.hypot(x - lastX, y - lastY);
    moved += d; lastX = x; lastY = y;
    if (rubAt(x, y, d, true)) {
      if (Math.random() < 0.25) game.fx.burst(x, y, { color: C.wrapShade, count: 2, speed: 70 });
      if (Math.random() < 0.12) game.audio.tone(900 + Math.random() * 300, 0.02, { wave: 'sawtooth', volume: 0.02 });
    }
  });

  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !pressing) return;
    pressing = false;
    if (finished) return;
    if (moved < 30 && pressT < 0.4) {
      var i = candyAt(x, y);
      if (i >= 0 && eat(i, true)) { game.audio.play('se_tap', 0.3); return; }
      game.fx.burst(x, y, { color: C.counter, count: 3, speed: 80 });
    }
  });

  // ── ATTRACT: 本物の rubAt/eat。1皿目は透かして蜂蜜を見つけ、2皿目は透かさずに食べて失敗 ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.7, press: false, order: [], k: 0, st: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.5;
    if (cyc < dt || demo.t <= dt) {
      initGame(); ready = 0; demo.k = 0; demo.st = 0;
      var h = 0;
      for (var q = 0; q < candies.length; q++) if (candies[q].kind === 'honey') h = q;
      demo.order = [(h + 1) % candies.length, h];
    }
    stepRound(dt, false);
    demo.st += dt;
    if (phase !== 'pick') { demo.press = false; return; }
    if (round === 0) {
      var ci = demo.order[Math.min(demo.k, 1)];
      var c = candies[ci];
      if (demo.st < 0.8) {
        var nx = c.x + Math.sin(demo.st * 26) * 70, ny = c.y + Math.cos(demo.st * 13) * 14;
        rubAt(nx, ny, Math.hypot(nx - demo.gx, ny - demo.gy), false);
        demo.gx = nx; demo.gy = ny; demo.press = true;
      } else if (demo.st < 1.0) {
        demo.press = false;
      } else if (demo.k === 0) {
        demo.k = 1; demo.st = 0;
      } else {
        demo.gx = c.x; demo.gy = c.y; demo.press = true;
        eat(ci, false); demo.st = 0;
      }
    } else {
      var bad = 0;
      for (var b = 0; b < candies.length; b++) if (candies[b].kind !== 'honey') bad = b;
      demo.gx += (candies[bad].x - demo.gx) * Math.min(1, dt * 5); demo.gy += (candies[bad].y - demo.gy) * Math.min(1, dt * 5);
      demo.press = demo.st > 0.9;
      if (demo.st > 1.0) { eat(bad, false); phase = 'end'; }
    }
  }

  function drawScene(t) {
    var pulse = 0.05 + 0.04 * Math.sin(t * 1.2);
    game.draw.gradient(0, H, [[0, C.wall1], [0.6, C.wall2], [1, '#c9744a']]);
    game.draw.rect(0, 0, W, H, C.white, pulse);
    // 瓶の棚(遠景)
    for (var j = 0; j < 6; j++) {
      var jx = 110 + j * 172;
      game.draw.rect(jx - 50, H * 0.14, 100, 120, C.white, 0.45);
      game.draw.rect(jx - 40, H * 0.14 + 50, 80, 60, j % 3 === 0 ? C.honey : (j % 3 === 1 ? C.bitter : C.chili), 0.6);
    }
    game.draw.rect(0, H * 0.21, W, 18, C.counterDark);
    // 親方(巨大スプライト)
    var mf = Math.floor(t * 1.5) % 2 ? MASTER_A : MASTER_B;
    game.draw.sprite(mf, MASTER_PAL, W / 2 + Math.sin(t * 0.9) * 10, H * 0.3 + Math.sin(t * 2) * 5, 20, { anchor: 'center' });
    // カウンター
    game.draw.rect(0, H * 0.38, W, H * 0.42, C.counter);
    game.draw.rect(0, H * 0.38, W, 20, C.counterDark);
    game.draw.circle(W / 2, ROW_Y + 20, 460, C.white, 0.08);
    // 見物の猫(演出AI)
    game.draw.sprite(Math.floor(t * 2) % 2 ? CAT_A : CAT_B, { c: '#6b3a2a', K: '#ffc21a' }, W * 0.9, H * 0.36 + Math.sin(t * 3) * 4, 12, { anchor: 'center' });
  }

  function fillColor(k) { return k === 'honey' ? C.honey : (k === 'bitter' ? C.bitter : C.chili); }

  function drawCandies(t) {
    for (var i = 0; i < candies.length; i++) {
      var c = candies[i];
      if (phase !== 'pick' && eaten === i && phT > 0.3 && c.kind === 'honey') continue;
      var cl = clarity(c);
      var bob = Math.sin(t * 2.4 + c.ph) * 5;
      var sw = Math.sin(t * 1.3 + c.ph) * 3;
      // 床影
      game.draw.rect(c.x - 90, c.y + 62, 180, 14, C.counterDark, 0.4);
      game.draw.sprite(FILL, { f: fillColor(c.kind) }, c.x + sw, c.y + bob, 14, { anchor: 'center', alpha: 0.25 + cl * 0.75 });
      game.draw.sprite(WRAP, { t: C.wrapShade, w: C.wrap, p: '#ff8fb0' }, c.x + sw, c.y + bob, 13, { anchor: 'center', alpha: Math.max(0.12, 1 - cl * 0.88) });
      if (cl > 0.6 && c.kind === 'honey') game.draw.circle(c.x + sw, c.y + bob, 90, C.honey, 0.12 + 0.08 * Math.sin(t * 9));
      if (eaten === i && (phase === 'eat' || phase === 'end' || finished)) game.draw.circle(c.x, c.y, 120 + phT * 60, C.white, Math.max(0, 0.6 - phT));
    }
  }

  function drawHud() {
    txt(got + ' / ' + NEEDED, W / 2, 80, 66, C.ink);
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(90, 150, W - 180, 20, C.counterDark, 0.7);
    game.draw.rect(90, 150, (W - 180) * Math.max(0, timeLeft / TIME_LIMIT), 20, lowTime ? C.bad : C.gold);
    // 親指ゾーン: 手が止まっている時間
    if (phase === 'pick' && !finished) {
      var r = Math.max(0, 1 - idleT / IDLE_LIMIT);
      game.draw.rect(W / 2 - 220, H * 0.86, 440, 20, C.counterDark, 0.6);
      game.draw.rect(W / 2 - 220, H * 0.86, 440 * r, 20, r < 0.35 ? C.bad : C.wrap);
    }
    for (var i = 0; i < NEEDED; i++) game.draw.sprite(FILL, { f: i < got ? C.honey : C.counterDark }, W / 2 - 160 + i * 160, H * 0.92, 8, { anchor: 'center' });
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (candies === undefined) initGame();
    if (pressing) pressT += dt;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      drawCandies(t);
      game.draw.hand(demo.gx, demo.gy + 40, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.06, 76, C.ink);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.1, 34, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.965, 38, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene(t);
      drawCandies(t);
      game.draw.rect(0, H * 0.6, W, H * 0.26, C.ink, 0.8);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.65, 96, ok ? C.good : C.bad);
      txt(got + ' / ' + NEEDED + '  PERFECT ' + perfects, W / 2, H * 0.71, 44, C.white);
      if (ok) {
        txt('SCORE ' + score, W / 2, H * 0.76, 48, C.gold);
        if (score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.81, 44, C.good);
        else txt('BEST ' + (game.best || 0), W / 2, H * 0.81, 36, C.white);
      } else {
        txt('あと' + (NEEDED - got) + '皿!', W / 2, H * 0.76, 52, C.gold);
        txt('BEST ' + (game.best || 0), W / 2, H * 0.81, 36, C.white);
      }
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) { game.audio.play('se_success', 0.6); game.end.success(score, { honey: got, perfect: perfects, rubs: rubs }); }
        else { game.audio.play('se_failure', 0.6); game.end.failure({ honey: got, perfect: perfects, rubs: rubs }); }
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) {
        if (ok) game.feedback.good(W / 2, H * 0.3, { text: 'CLEAR', color: C.good, count: 28 });
        else game.feedback.bad(W / 2, ROW_Y - 150, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS' });
        if (!ok) for (var r = 0; r < candies.length; r++) candies[r].heat = HEAT_FULL;
        done = true; endWait = 0.9;
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.4);
    } else if (!finished) {
      timeLeft -= dt;
      stepRound(dt, true);
      if (!finished && timeLeft <= 0) { timeLeft = 0; finished = true; ok = false; hitStop = 0.5; }
    }

    drawScene(t);
    drawCandies(t);
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.72, 96, C.gold);
  });

  function music() {
    game.audio.melody([['G4', 0.5], ['C5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['A4', 0.5], ['G4', 1], ['F4', 0.5], ['A4', 0.5], ['G4', 1]], { tempo: 124, wave: 'square', volume: 0.04, loop: true, bass: true });
  }
  game.onStart(function() {
    music();
    state = S.ATTRACT;
    initGame();
  });
})(game);

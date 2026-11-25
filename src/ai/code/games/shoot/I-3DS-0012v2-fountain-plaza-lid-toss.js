// I-3DS-0012v2-fountain-plaza-lid-toss.js
// ふたなげ噴水 — 遊園地の噴水広場で、次々噴き出す床の噴水口を狙ってゴムの蓋を投げ当て、広場が水びたしになる前に閉めていく
// 操作: 噴き出している噴水口をタップすると、手前の少年がそこへ蓋を投げる(奥ほど小さく、届くまで少し長い)。噴き出す直前は口の格子から泡が立つ。噴いてすぐの細い水は蓋1枚で閉まるが、長く噴いて太くなった水は1枚目を跳ね飛ばす(水の勢いは落ちるのでもう1枚で閉まる)。何もない床に投げた蓋は無駄になる
// 終わり: 噴水口を12回閉めればCLEAR(蓋の残りと水の少なさが得点)。広場の水があふれる/蓋18枚が尽きる/18秒の時間切れでGAME OVER
// @mechanic: aim_shoot
// @theme: fountain_plaza_lid_toss
// 世界観: 夕方の遊園地の噴水広場で、噴水係の少年が床の噴水口から勝手に噴き上がる水をゴムの蓋で一つずつ閉め、来園者の足元が水びたしになる前に広場を静める
// 残るもの: 正誤(CLEAR/GAME OVER) + 閉めた数・残った蓋・水位%
// スタイル: 2000s BILLBOARD 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s BILLBOARD 3D: 物体は板(sprite)のまま距離で px スケールを変える。真下に楕円の接地影。奥ほど彩度を落とす
  var STYLE = { bg: ['#ffb070', '#ffd8a8', '#c8b8a8'], main: ['#4ac8f0', '#e8f8ff', '#2a7ab0'], accent: ['#ff5a5a', '#ffe060'] };
  var C = {
    dusk: STYLE.bg[0], dusk2: STYLE.bg[1], tile: STYLE.bg[2], water: STYLE.main[0], foam: STYLE.main[1], deep: STYLE.main[2],
    red: STYLE.accent[0], gold: STYLE.accent[1], ink: '#2a2028', ok: '#5ad06a', tileD: '#a89888',
  };

  var GAME_TITLE = 'LID TOSS';
  var TIME_LIMIT = 18;
  var NEED = 12, LIDS = 18;
  var OLD_AGE = 1.6;
  var BOY_X = 540, BOY_Y = 1620;
  // 噴水口 3列×3(奥→手前)。scale は奥ほど小さい
  var ROWS = [{ y: 640, s: 0.6 }, { y: 900, s: 0.8 }, { y: 1190, s: 1.0 }];
  var NOZ = [];
  for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) NOZ.push({ x: 540 + (c - 1) * 330 * ROWS[r].s, y: ROWS[r].y, s: ROWS[r].s, row: r });
  // 噴き出す順(時刻・口)。後ほど間隔が詰まる
  var SCHED = [
    [0.4, 4], [1.6, 0], [2.6, 8], [3.4, 2], [4.2, 6], [4.9, 1], [5.6, 7], [6.2, 3], [6.8, 5],
    [7.4, 0], [8.0, 4], [8.5, 2], [9.0, 8], [9.5, 6], [10.0, 1], [10.5, 7], [11.0, 3], [11.5, 5],
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var noz, lids, flying, closed, water, score, readyT, over, won, outroT, stopT, playT, focus, timeUp, clock, nextK, throwT, mood, bounced;

  function initGame() {
    noz = [];
    for (var i = 0; i < NOZ.length; i++) noz.push({ s: 'idle', t: 0, age: 0, capT: 0 });
    lids = LIDS; flying = []; closed = 0; water = 0; score = 0; readyT = 0.8; over = false; won = false; outroT = 0; stopT = 0;
    playT = 0; focus = null; timeUp = false; clock = 0; nextK = 0; throwT = 0; mood = 0; bounced = [];
  }

  // 予告(泡0.6秒)→噴出。口がふさがっていれば次の空き口へ
  function stepSched(sched) {
    while (nextK < sched.length && clock >= sched[nextK][0] - 0.6) {
      var k = sched[nextK][1];
      for (var tries = 0; tries < NOZ.length && noz[k].s !== 'idle' && noz[k].s !== 'shut'; tries++) k = (k + 1) % NOZ.length;
      if (noz[k].s === 'idle' || noz[k].s === 'shut') { noz[k].s = 'warn'; noz[k].t = 0; game.audio.tone(180, 0.25, { wave: 'triangle', volume: 0.05, slide: 80 }); }
      nextK++;
    }
  }

  // 噴水と水位(本番もデモも同じ)
  function stepNoz(dt) {
    var open = 0;
    for (var i = 0; i < noz.length; i++) {
      var n = noz[i];
      n.t += dt;
      if (n.s === 'warn' && n.t >= 0.6) { n.s = 'spout'; n.t = 0; n.age = 0; game.audio.tone(420, 0.15, { wave: 'sawtooth', volume: 0.04, slide: 400 }); }
      else if (n.s === 'spout') { n.age += dt; open += n.age > OLD_AGE ? 1.6 : 1; }
      else if (n.s === 'shut' && n.t > 1.2) n.s = 'idle';
    }
    water = Math.min(1, Math.max(0, water + open * dt * 0.022 - (open === 0 ? dt * 0.03 : 0)));
  }

  function toss(x, y, demo) {
    if (lids <= 0) { game.audio.tone(150, 0.08, { wave: 'square', volume: 0.05 }); return; }
    lids--;
    throwT = 0.18;
    var depth = Math.max(0, Math.min(1, (BOY_Y - y) / 1000));
    flying.push({ x0: BOY_X + 60, y0: BOY_Y - 120, x1: x, y1: y, t: 0, T: 0.18 + depth * 0.22, demo: demo });
    game.audio.play('se_jump', 0.25);
  }

  function stepLids(dt) {
    for (var i = flying.length - 1; i >= 0; i--) {
      var f = flying[i];
      f.t += dt;
      if (f.t >= f.T) { flying.splice(i, 1); land(f); }
    }
    for (var j = bounced.length - 1; j >= 0; j--) {
      var b = bounced[j];
      b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 1800 * dt;
      if (b.t > 0.9) bounced.splice(j, 1);
    }
  }

  function land(f) {
    var best = -1, bd = 1e9;
    for (var i = 0; i < NOZ.length; i++) {
      if (noz[i].s !== 'spout') continue;
      var d = Math.hypot(f.x1 - NOZ[i].x, (f.y1 - NOZ[i].y) * 1.4);
      if (d <= 80 * NOZ[i].s + 20 && d < bd) { bd = d; best = i; }
    }
    if (best < 0) {
      mood = -0.6;
      game.feedback.bad(f.x1, f.y1, { text: 'MISS', shake: f.demo ? 3 : 7 });
      bounced.push({ x: f.x1, y: f.y1, vx: (f.x1 - 540) * 0.8, vy: -500, t: 0, s: 0.8 });
      return;
    }
    var n = noz[best], nz = NOZ[best];
    if (n.age > OLD_AGE) {
      // 太い水は1枚目を跳ね飛ばす(勢いは落ちる)
      n.age = 0.3;
      bounced.push({ x: nz.x, y: nz.y - 200 * nz.s, vx: (nz.x - 540) * 1.2 + 120, vy: -900, t: 0, s: nz.s });
      game.audio.play('se_break', 0.25);
      game.fx.burst(nz.x, nz.y - 120 * nz.s, { color: C.foam, count: 12, speed: 380 });
      game.fx.popup('x2', nz.x, nz.y - 260 * nz.s, { color: C.red, size: 54 });
      return;
    }
    n.s = 'shut'; n.t = 0; n.capT = 0.3;
    mood = 1;
    if (!f.demo) {
      closed++;
      score += Math.round(100 * (1.6 - nz.s)) + 40;
      if (closed % 4 === 0 && closed < NEED) { game.audio.play('se_milestone', 0.45); game.fx.popup(closed + ' / ' + NEED, 540, 470, { color: C.gold, size: 64 }); }
    }
    game.feedback.good(nz.x, nz.y - 80 * nz.s, { text: n.age < 0.6 ? 'PERFECT' : 'GOOD', color: C.ok, size: 40 + 20 * nz.s });
    if (!f.demo && closed >= NEED) finish(true);
  }

  function finish(ok) {
    over = true; won = ok; outroT = 1.5;
    game.audio.stopBgm();
    if (ok) {
      score += lids * 30 + Math.round((1 - water) * 300);
      mood = 2;
      game.audio.play('se_success', 0.55);
      game.fx.burst(540, 900, { color: C.gold, count: 30, speed: 460 });
      game.fx.burst(540, 900, { color: C.water, count: 20, speed: 360 });
      game.fx.flash('#ffffff', 0.2);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function fail(why) {
    focus = why; stopT = 0.5;
    game.feedback.bad(why.x, why.y, { text: 'MISS', shake: 12 });
    finish(false);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    if (over || readyT > 0 || stopT > 0 || y < 230 || y > 1420) {
      game.audio.tone(200, 0.03, { wave: 'triangle', volume: 0.03 });
      return;
    }
    toss(x, y, false);
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  var BOY_A = ['..cccc..', '.cccccc.', '..ssss..', '..s..s..', '..ssss..', '.bbbbbb.', 'bbbbbbbb', 's.bbbb.s', '..kk.kk.', '..kk.kk.'];
  var BOY_B = ['..cccc..', '.cccccc.', '..ssss..', '..s..s..', '..sooo..', '.bbbbbbs', 'bbbbbbs.', 's.bbbb..', '..kk.kk.', '.kk...kk'];
  var BOY_PAL = { c: C.red, s: '#f0c098', b: '#3a7ad8', k: C.ink, o: '#c84a4a' };
  var LID = ['.yyyy.', 'yyyyyy', 'yykkyy', '.yyyy.'];
  var GRATE = ['.gggg.', 'gkgkgg', 'ggkgkg', '.gggg.'];

  function drawPark() {
    var t = game.time.elapsed;
    game.draw.gradient(0, 560, [[0, '#ff9a6a'], [0.6, C.dusk], [1, C.dusk2]]);
    // 遠景: 観覧車(奥は彩度を落とす)
    var fx = 820, fy = 330;
    game.draw.circle(fx, fy, 190, '#d8a890', 0.5);
    game.draw.circle(fx, fy, 176, C.dusk2);
    for (var k = 0; k < 10; k++) {
      var a = k / 10 * Math.PI * 2 + t * 0.15;
      game.draw.line(fx, fy, fx + Math.cos(a) * 183, fy + Math.sin(a) * 183, '#c89880', 3);
      game.draw.circle(fx + Math.cos(a) * 183, fy + Math.sin(a) * 183, 14, k % 2 ? '#e8a8b8' : '#a8c8e8');
    }
    game.draw.line(fx - 90, 560, fx, fy, '#b88878', 6);
    game.draw.line(fx + 90, 560, fx, fy, '#b88878', 6);
    for (var p = 0; p < 6; p++) game.draw.rect(40 + p * 110, 470 - (p % 3) * 30, 70, 90 + (p % 3) * 30, '#c8a0a0', 0.6);
    // 広場の床(遠近のタイル)
    game.draw.gradient(560, H, [[0, '#b8a898'], [1, C.tile]]);
    var yy = 560;
    for (var i = 0; i < 14; i++) {
      yy += 14 + i * 9;
      game.draw.rect(0, yy, W, 3, C.tileD);
    }
    for (var v = -6; v <= 6; v++) game.draw.line(540 + v * 30, 560, 540 + v * 260, H, C.tileD, 3);
    // 水たまり(水位)
    if (water > 0.02) {
      game.draw.circle(540, 1000, 120 + water * 520, C.water, 0.12 + water * 0.25);
      game.draw.circle(540, 1000, 60 + water * 400, C.water, 0.1 + water * 0.2);
    }
    // ベンチ(水位がこれを越えるとあふれ)
    game.draw.rect(60, 1300, 200, 30, '#8a5a3a');
    game.draw.rect(820, 1300, 200, 30, '#8a5a3a');
  }

  function drawNozzles() {
    var t = game.time.elapsed;
    for (var r = 0; r < 3; r++) {
      for (var i = 0; i < NOZ.length; i++) {
        if (NOZ[i].row !== r) continue;
        var nz = NOZ[i], n = noz[i], s = nz.s;
        var hl = focus && stopT > 0 && focus.i === i;
        game.draw.circle(nz.x, nz.y + 10 * s, 64 * s, '#000000', 0.18);
        game.draw.sprite(GRATE, { g: '#8a8a94', k: C.ink }, nz.x, nz.y, 20 * s, { anchor: 'center' });
        if (n.s === 'warn') {
          for (var b = 0; b < 5; b++) {
            var ph = (t * 3 + b * 0.2) % 1;
            game.draw.circle(nz.x - 40 * s + b * 20 * s, nz.y - ph * 60 * s, (8 + b % 2 * 4) * s, C.foam, 1 - ph);
          }
          game.draw.circle(nz.x, nz.y, 80 * s, '#ffffff', 0.25 + 0.2 * Math.sin(t * 20));
        } else if (n.s === 'spout') {
          var old = n.age > OLD_AGE;
          var h = Math.min(560, 140 + n.age * 220) * s;
          var wid = (old ? 34 : 20) * s;
          for (var k = 0; k < 12; k++) {
            var yy = nz.y - h * k / 12;
            var wob = Math.sin(t * 14 + k + i) * 6 * s;
            game.draw.circle(nz.x + wob, yy, wid * (1 - k / 24), old ? C.deep : C.water, 0.85);
            game.draw.circle(nz.x + wob - wid * 0.3, yy, wid * 0.35, C.foam, 0.7);
          }
          game.draw.circle(nz.x, nz.y - h, wid * 1.8, hl ? '#ffffff' : C.foam, 0.9);
          if (old) for (var d = 0; d < 6; d++) {
            var a = d / 6 * Math.PI * 2 + t * 4;
            game.draw.circle(nz.x + Math.cos(a) * wid * 2.4, nz.y - h + Math.sin(a) * wid, 8 * s, C.foam);
          }
          // 狙う物: 白縁の明滅
          game.draw.circle(nz.x, nz.y, 74 * s, '#ffffff', 0.18 + 0.15 * Math.sin(t * 9));
        } else if (n.s === 'shut') {
          var pop = n.t < 0.2 ? 1.3 : 1;
          game.draw.sprite(LID, { y: C.gold, k: C.red }, nz.x, nz.y - 6 * s, 22 * s * pop, { anchor: 'center' });
        }
        if (hl) game.draw.circle(nz.x, nz.y - 120 * s, 150 * s, '#ffffff', 0.4);
      }
    }
  }

  function drawLids() {
    for (var i = 0; i < flying.length; i++) {
      var f = flying[i], k = f.t / f.T;
      var x = f.x0 + (f.x1 - f.x0) * k, y = f.y0 + (f.y1 - f.y0) * k - Math.sin(k * Math.PI) * 260;
      var s = 1 - k * Math.max(0, (BOY_Y - f.y1) / 2400);
      game.draw.circle(f.x0 + (f.x1 - f.x0) * k, f.y0 + 100 + (f.y1 - f.y0) * k, 26 * s, '#000000', 0.2);
      game.draw.sprite(LID, { y: C.gold, k: C.red }, x, y, 20 * s, { anchor: 'center' });
    }
    for (var j = 0; j < bounced.length; j++) {
      var b = bounced[j];
      game.draw.sprite(LID, { y: '#d8c070', k: '#a84a4a' }, b.x, b.y, 18 * b.s, { anchor: 'center', alpha: Math.max(0, 1 - b.t) });
    }
  }

  function drawBoy() {
    var t = game.time.elapsed;
    var fr = throwT > 0 ? BOY_B : BOY_A;
    game.draw.circle(BOY_X, BOY_Y + 120, 90, '#000000', 0.22);
    game.draw.sprite(fr, mood < -0.3 ? { c: C.red, s: '#f0c098', b: '#3a7ad8', k: C.ink, o: C.ink } : BOY_PAL, BOY_X, BOY_Y - (mood > 0.5 ? Math.abs(Math.sin(t * 10)) * 16 : 0), 20, { anchor: 'center' });
    // 蓋の残り(積み重ね)
    for (var i = 0; i < LIDS; i++) {
      var on = i < lids;
      var col = Math.floor(i / 9), row = i % 9;
      game.draw.rect(140 + col * 80 - 30, Math.round(H * 0.92) - row * 22, 60, 16, on ? C.gold : '#9a8a7a', on ? 1 : 0.4);
      game.draw.rect(140 + col * 80 - 30, Math.round(H * 0.92) - row * 22 + 12, 60, 4, on ? C.red : '#7a6a5a', on ? 1 : 0.4);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink, 0.82);
    label('SCORE ' + score, 250, 70, 44, '#ffffff');
    label(closed + ' / ' + NEED, 250, 160, 50, C.gold);
    // 水位(赤線であふれ)
    game.draw.rect(560, 40, 460, 50, '#1a1418');
    game.draw.rect(565, 45, 450 * water, 40, water > 0.75 ? C.red : C.water);
    game.draw.rect(1010, 34, 6, 62, C.red);
    var tk = Math.max(0, 1 - playT / TIME_LIMIT);
    game.draw.rect(560, 150, 460 * tk, 24, tk < 0.25 ? C.red : C.gold);
  }

  function drawScene() {
    drawPark();
    drawNozzles();
    drawLids();
    drawBoy();
  }

  // ---- ATTRACT: 噴いた口に蓋を当てて閉める。一度は太くなった水に投げて跳ね返される ----
  var DEMO_SCHED = [[0.3, 4], [1.0, 0], [1.6, 8], [2.6, 2], [4.0, 6], [4.6, 1]];
  var demo = { t: 0, cool: 0, hx: 540, hy: 1200, press: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; }
    if (throwT > 0) throwT -= dt;
    clock += dt;
    stepSched(DEMO_SCHED);
    stepNoz(dt);
    stepLids(dt);
    demo.cool -= dt; demo.press -= dt;
    // 狙い: 口8は放っておいて太らせ、4.2秒以降に投げて跳ね返りを見せる
    var tgt = -1, bestAge = 9;
    for (var i = 0; i < noz.length; i++) {
      if (noz[i].s !== 'spout') continue;
      if (i === 8 && cyc < 4.2) continue;
      if (noz[i].age < bestAge) { bestAge = noz[i].age; tgt = i; }
    }
    if (tgt >= 0) {
      demo.hx += (NOZ[tgt].x - demo.hx) * Math.min(1, dt * 8);
      demo.hy += (NOZ[tgt].y - demo.hy) * Math.min(1, dt * 8);
      var pending = false;
      for (var k = 0; k < flying.length; k++) if (Math.abs(flying[k].x1 - NOZ[tgt].x) < 30) pending = true;
      if (!pending && demo.cool <= 0 && Math.hypot(demo.hx - NOZ[tgt].x, demo.hy - NOZ[tgt].y) < 25 && noz[tgt].age > 0.25) {
        toss(NOZ[tgt].x, NOZ[tgt].y, true); demo.cool = 0.45; demo.press = 0.15; lids = LIDS;
      }
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    mood += (0 - mood) * Math.min(1, dt * 1.5);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.hx, demo.hy, { press: demo.press > 0, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.82);
      label(GAME_TITLE, W / 2, 100, 92 + Math.sin(t * 3) * 3, C.gold);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 188, 36, '#ffffff');
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, 1400, 48, C.red);
      else label('TAP TO START', W / 2, 1400, 44, C.ink);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.3, W, H * 0.26, C.ink, 0.85);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.355, 96, won ? C.ok : C.red);
      label('SCORE ' + score, W / 2, H * 0.41, 54, '#ffffff');
      label(closed + ' / ' + NEED, W / 2, H * 0.455, 46, C.gold);
      if (score > game.best && score > 0) label('NEW RECORD', W / 2, H * 0.5, 46, C.gold);
      else label('BEST ' + Math.max(game.best, score), W / 2, H * 0.5, 38, '#ffffff');
      if (!won) label('あと' + Math.max(1, NEED - closed) + '個', W / 2, H * 0.54, 46, C.gold);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.6, 38, '#ffffff');
      return;
    }

    // ---- PLAYING ----
    if (throwT > 0) throwT -= dt;
    if (over) {
      outroT -= dt;
      if (stopT > 0) stopT -= dt;
      stepLids(dt);
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { closed: closed, lidsLeft: lids, water: Math.round(water * 100) };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.5);
    } else {
      playT += dt;
      clock += dt;
      stepSched(SCHED);
      stepNoz(dt);
      stepLids(dt);
      if (!over) {
        if (water >= 1) {
          var worst = 0;
          for (var i = 0; i < noz.length; i++) if (noz[i].s === 'spout' && noz[i].age > noz[worst].age) worst = i;
          fail({ i: worst, x: NOZ[worst].x, y: NOZ[worst].y });
        } else if (lids <= 0 && flying.length === 0) {
          fail({ i: -1, x: BOY_X, y: BOY_Y });
        } else if (playT >= TIME_LIMIT) {
          timeUp = true;
          finish(false);
        }
      }
    }

    drawScene();
    drawHud();
    // 開始直後のお手本: 最初に噴く口に手を一度だけ
    if (!over && readyT <= 0 && playT > 0.3 && playT < 1.5) {
      game.draw.hand(NOZ[4].x, NOZ[4].y, { press: Math.floor(t * 4) % 2 === 0, scale: 12, alpha: 0.6 });
    }
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, 520, 100, C.gold);
    if (over && timeUp) label('TIME UP', W / 2, 520, 90, C.red);
  });

  game.onStart(function() {
    game.audio.melody([
      ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['F5', 0.5], ['A5', 0.5], ['G5', 1],
      ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 1], ['C5', 1],
    ], { tempo: 138, wave: 'triangle', volume: 0.05, loop: true, bass: [['C3', 1], ['G2', 1], ['F2', 1], ['G2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

// I-DS-0029v2-ginkgo-pup-graze.js
// 銀杏かすめ散歩 — 歩き続ける子犬をタップでくるりと振り返らせ、落ちてくる銀杏の実の真横すれすれを通らせて点を稼ぐ
// 操作: 子犬は並木道を左右へ歩き続ける(端では自分で折り返す)。画面のどこかをタップすると子犬がその場で向きを変える。枝が揺れて地面に赤い輪の影が出た所に実が落ちる。落ちた瞬間、子犬が実のすぐ横にいるほど高得点、真下にいるとぶつかる(社内メモ。画面には出さない)
// 終わり: かすめ点を12点ためればCLEAR。実に3回当たる、または20秒たってもたまらなければGAME OVER
// @mechanic: near_miss
// @theme: autumn_ginkgo_avenue_puppy_walk
// 世界観: 秋の銀杏並木で、散歩中の子犬が枝からぽとぽと降ってくる銀杏の実の落ちる所を見切り、わざと鼻先すれすれをかすめて歩いていく度胸試し
// 残るもの: 正誤(CLEAR/GAME OVER) + かすめ点・最大連続かすめ・当たった回数
// スタイル: HD POST 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 褐色寄りの低彩度、ブルーム(半透明円の重ね)とビネット(四辺の黒の半透明)
  var STYLE = { bg: ['#9a8a62', '#4a3e2c'], main: ['#d8b452', '#a68452', '#5a4a38'], accent: ['#ff6a3a', '#fff0c8'] };
  var C = {
    leaf: STYLE.main[0], bark: STYLE.main[1], dirt: STYLE.main[2], red: STYLE.accent[0], cream: STYLE.accent[1],
    ink: '#2a2218', nut: '#e8a830', nutDk: '#a86a20', fog: '#c8b890',
  };

  var GAME_TITLE = 'ICHO WALK';
  var TIME_LIMIT = 20;
  var NEEDED = 12;
  var LIVES = 3;
  var GY = Math.round(H * 0.67);
  var PL = 110, PR = W - 110;
  var HIT_R = 54, PERF_R = 112, GRAZE_R = 190;
  var FALL_T = 0.78;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var pup, nuts, spawnT, graze, combo, bestCombo, hits, perfects, score, finalScore, elapsedP, timeLeft, readyT, stopT, stopKind, culprit, fin, cleared, postT, warnT, invT, joyT, milestone, spin;

  // 柴っぽい子犬(横向き)
  var PUP_A = ['..........', '.......ee.', '.......eee', 'c.....ffkf', 'cc..fffffn', '.ffffffff.', '.ffwwwfff.', '.ff....ff.', '.f......f.'];
  var PUP_B = ['..........', '.......ee.', '.......eee', '.c....ffkf', 'cc..fffffn', '.ffffffff.', '.ffwwwfff.', '..ff..ff..', '..f....f..'];
  var PUP_OUCH = ['..........', '..s....ee.', '.s.s...eee', 'c.....ffxf', 'cc..fffffn', '.ffffffff.', '.ffwwwfff.', '.ff....ff.', 'ff......ff'];
  var PUP_JOY = ['.......ee.', '.......eee', 'c.....ffkf', 'cc..fffffm', '.ffffffff.', '.ffwwwfff.', '.f......f.', 'f........f', '..........'];
  var PUP_PAL = { f: '#d88a3a', e: '#b86a2a', w: '#fff0d8', k: '#2a2218', n: '#2a2218', c: '#d88a3a', x: '#2a2218', s: '#ffe060', m: '#ff7a7a' };
  var NUT = ['.oo.', 'oooo', 'ooho', '.oo.'];
  var NUT_PAL = { o: '#e8a830', h: '#fff0c8' };
  var LEAF = ['..l..', '.lll.', 'lllll', '.l.l.', '..b..'];

  function out(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#00000066', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function initGame() {
    pup = { x: W / 2, dir: 1, speed: 330, bob: 0 };
    nuts = []; spawnT = 0.6; graze = 0; combo = 0; bestCombo = 0; hits = 0; perfects = 0; score = 0; finalScore = 0;
    elapsedP = 0; timeLeft = TIME_LIMIT; readyT = 0.8; stopT = 0; stopKind = ''; culprit = null; fin = false; cleared = false;
    postT = 0; warnT = 0; invT = 0; joyT = 0; milestone = false; spin = 0;
  }

  // 子犬が t 秒後にいる位置(端での折り返し込み)
  function predictX(x, dir, sp, t) {
    var span = PR - PL, p = (x - PL) + dir * sp * t;
    var m = ((p % (2 * span)) + 2 * span) % (2 * span);
    return PL + (m <= span ? m : 2 * span - m);
  }

  function turn() {
    pup.dir = -pup.dir; spin = 0.25;
    game.audio.play('se_jump', 0.25);
    game.fx.burst(pup.x - pup.dir * 40, GY + 10, { color: C.fog, count: 6, speed: 160 });
  }

  function spawnNut(offset) {
    var land = predictX(pup.x, pup.dir, pup.speed, FALL_T);
    var x = Math.max(PL - 20, Math.min(PR + 20, land + offset));
    nuts.push({ x: x, t: 0, y0: game.random(560, 660), landed: false, lt: 0, res: '' });
    game.audio.tone('A4', 0.06, { wave: 'triangle', volume: 0.05 });
  }

  function land(n) {
    n.landed = true; n.lt = 0;
    var d = Math.abs(n.x - pup.x);
    if (d < HIT_R && invT <= 0) {
      n.res = 'hit'; hits++; combo = 0;
      game.audio.play('se_break', 0.3);
      if (mode === S.PLAYING && hits >= LIVES) {
        stopT = 0.5; stopKind = 'hit'; culprit = n;
        game.fx.flash('#ffffff', 0.2);
        return;
      }
      invT = 0.9;
      game.feedback.bad(n.x, GY - 120, { text: 'MISS', color: C.red, size: 56 });
      return;
    }
    if (d < GRAZE_R) {
      var perf = d < PERF_R;
      n.res = perf ? 'perf' : 'good';
      combo++; bestCombo = Math.max(bestCombo, combo);
      var pts = perf ? 2 : 1;
      graze += pts; if (perf) perfects++;
      var gain = (perf ? 200 : 100) * Math.min(4, combo);
      score += gain;
      joyT = 0.4;
      game.feedback.good(n.x, GY - 130, { text: perf ? 'PERFECT' : 'GOOD', color: perf ? C.cream : C.leaf, size: perf ? 60 : 48 });
      game.fx.popup(Math.round(d - HIT_R + 1) + 'cm', (n.x + pup.x) / 2, GY - 210, { color: C.cream, size: 40 });
      if (combo >= 2) game.fx.popup('x' + Math.min(4, combo), pup.x, GY - 270, { color: C.red, size: 46 });
      game.audio.tone(520 + Math.min(8, combo) * 70, 0.07, { wave: 'square', volume: 0.06 });
      if (mode === S.PLAYING && !milestone && graze >= NEEDED / 2) {
        milestone = true;
        game.audio.play('se_milestone', 0.5);
        game.fx.popup('NICE', W / 2, H * 0.2, { color: C.cream, size: 84 });
      }
      if (mode === S.PLAYING && graze >= NEEDED && stopT <= 0) { stopT = 0.4; stopKind = 'win'; game.audio.play('se_powerup', 0.45); }
    } else {
      n.res = 'far'; combo = 0;
      game.audio.tone('C4', 0.04, { wave: 'triangle', volume: 0.04 });
    }
  }

  function stepWorld(dt, spawnOn) {
    if (spin > 0) spin -= dt;
    if (invT > 0) invT -= dt;
    if (joyT > 0) joyT -= dt;
    pup.x += pup.dir * pup.speed * dt; pup.bob += dt;
    if (pup.x < PL) { pup.x = PL; pup.dir = 1; }
    if (pup.x > PR) { pup.x = PR; pup.dir = -1; }
    if (spawnOn) {
      spawnT -= dt;
      if (spawnT <= 0) {
        var k = Math.min(1, elapsedP / TIME_LIMIT);
        spawnT = 0.95 - 0.42 * k;
        var off = game.random(-260, 260);
        spawnNut(off);
        if (k > 0.45 && Math.random() < 0.35) spawnNut(off + (off > 0 ? -230 : 230));
      }
    }
    for (var i = nuts.length - 1; i >= 0; i--) {
      var n = nuts[i];
      if (!n.landed) { n.t += dt; if (n.t >= FALL_T) land(n); }
      else { n.lt += dt; if (n.lt > 0.9) nuts.splice(i, 1); }
    }
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = score + (win ? Math.ceil(timeLeft) * 50 + (LIVES - hits) * 150 : 0);
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 6; i++) game.fx.burst(150 + i * 155, H * 0.4 + (i % 2) * 160, { color: i % 2 ? C.leaf : C.cream, count: 18, speed: 520 });
      game.fx.flash(C.cream, 0.25);
    }
  }

  function canPlay() { return mode === S.PLAYING && !fin && stopT <= 0 && readyT <= 0; }

  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (canPlay()) turn();
    else game.audio.play('se_tap', 0.1);
  });

  // ---- 描画 ----
  function avenue(t) {
    game.draw.gradient(0, H, [[0, '#d8c89a'], [0.3, STYLE.bg[0]], [0.62, '#7a6a48'], [0.7, C.dirt], [1, STYLE.bg[1]]]);
    // 奥へ続く並木(フォグで沈む)
    for (var r = 4; r >= 0; r--) {
      var s = 0.35 + r * 0.16, fx = 420 * s;
      for (var side = -1; side <= 1; side += 2) {
        var x = W / 2 + side * (130 + fx), base = 760 + r * 70;
        game.draw.rect(x - 10 * s, base - 260 * s, 20 * s, 260 * s, C.bark, 0.5 + r * 0.1);
        game.draw.circle(x, base - 300 * s, 120 * s, C.leaf, 0.35 + r * 0.1);
      }
    }
    // 手前の大きな樹冠(実が落ちてくる所)
    for (var c = 0; c < 7; c++) {
      var cx = 40 + c * 170, cy = 470 + Math.sin(c * 1.7) * 50 + Math.sin(t * 0.9 + c) * 6;
      game.draw.circle(cx, cy, 170, C.leaf, 0.9);
      game.draw.circle(cx - 40, cy - 50, 90, '#f0d070', 0.5);
    }
    game.draw.rect(0, 630, W, 30, C.leaf, 0.6);
    // ブルーム
    game.draw.circle(W * 0.75, 330, 260, '#fff4c8', 0.12);
    game.draw.circle(W * 0.75, 330, 150, '#fff4c8', 0.12);
    // 石畳の道
    game.draw.rect(0, GY + 34, W, 26, '#3a3024', 0.5);
    for (var p = 0; p < 9; p++) game.draw.line(W / 2 + (p - 4) * 40, 760, W / 2 + (p - 4) * 260, GY + 34, '#00000022', 3);
    // 落ち葉の絨毯(手前)
    for (var l = 0; l < 22; l++) {
      var lx = (l * 173 + 40) % W, ly = GY + 120 + ((l * 97) % 380);
      game.draw.sprite(LEAF, { l: l % 3 ? C.leaf : '#c89a3a', b: C.bark }, lx, ly + Math.sin(t * 2 + l) * 3, 9, { anchor: 'center' });
    }
  }

  function drawNuts(t) {
    for (var i = 0; i < nuts.length; i++) {
      var n = nuts[i];
      if (!n.landed) {
        var u = n.t / FALL_T, sh = 20 + u * 46;
        // telegraph: 地面に赤い輪の影 + 揺れる枝
        var blink = Math.floor(t * 12) % 2 === 0;
        game.draw.circle(n.x, GY + 30, sh, '#000000', 0.25);
        game.draw.circle(n.x, GY + 30, HIT_R, blink ? C.red : '#ff9a6a', 0.22);
        game.draw.line(n.x - HIT_R, GY + 30, n.x + HIT_R, GY + 30, C.red, 4);
        if (u < 0.35) game.draw.sprite(LEAF, { l: C.leaf, b: C.bark }, n.x + Math.sin(t * 30) * 12, n.y0 - 40, 10, { anchor: 'center' });
        var y = n.y0 + (GY - n.y0) * u * u;
        game.draw.sprite(NUT, NUT_PAL, n.x, y, 12, { anchor: 'center' });
        game.draw.circle(n.x, y, 30, C.red, 0.18);
      } else {
        var big = culprit === n && stopT > 0;
        var hl = big && Math.floor(t * 16) % 2 === 0;
        var a = Math.max(0, 1 - n.lt / 0.9);
        game.draw.sprite(NUT, hl ? { o: '#ffffff', h: '#ffffff' } : NUT_PAL, n.x, GY + 18, big ? 26 : 12, { anchor: 'center', alpha: big ? 1 : a });
        if (n.res === 'perf' || n.res === 'good') {
          game.draw.line(n.x, GY - 30, pup.x, GY - 30, n.res === 'perf' ? C.cream : C.leaf, 6);
          game.draw.circle(n.x, GY + 18, 40 + n.lt * 120, C.cream, 0.3 * a);
        }
        if (n.res === 'hit') game.draw.circle(n.x, GY - 20, 60 + n.lt * 80, '#a8c040', 0.3 * a);
      }
    }
  }

  function drawPup(t) {
    var over = fin && !cleared;
    var fr = (invT > 0 || over || (stopT > 0 && stopKind === 'hit')) ? PUP_OUCH : (joyT > 0 || (fin && cleared)) ? PUP_JOY : (Math.floor(pup.bob * 9) % 2 ? PUP_A : PUP_B);
    var hop = fin && cleared ? -Math.abs(Math.sin(t * 11)) * 30 : -Math.abs(Math.sin(pup.bob * 9)) * 8;
    if (spin > 0) hop -= Math.sin(spin / 0.25 * Math.PI) * 26;
    var vis = invT > 0 ? Math.floor(t * 14) % 2 === 0 : true;
    game.draw.circle(pup.x, GY + 32, 60, '#000000', 0.3);
    if (vis) game.draw.sprite(fr, PUP_PAL, pup.x, GY - 30 + hop, 12, { anchor: 'center', flipX: pup.dir < 0 });
    // かすめ圏(足元の淡い帯)
    game.draw.rect(pup.x - GRAZE_R, GY + 46, GRAZE_R * 2, 6, C.cream, 0.18);
    game.draw.rect(pup.x - PERF_R, GY + 46, PERF_R * 2, 6, C.cream, 0.3);
  }

  function vignette() {
    for (var i = 0; i < 4; i++) {
      game.draw.rect(0, 0, 40 + i * 30, H, '#000000', 0.08);
      game.draw.rect(W - 40 - i * 30, 0, 40 + i * 30, H, '#000000', 0.08);
      game.draw.rect(0, 0, W, 30 + i * 24, '#000000', 0.06);
      game.draw.rect(0, H - 30 - i * 24, W, 30 + i * 24, '#000000', 0.08);
    }
  }

  function drawHud(t) {
    var low = timeLeft < 4 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(70, 40, W - 140, 28, '#00000055');
    game.draw.rect(76, 46, (W - 152) * Math.max(0, timeLeft / TIME_LIMIT), 16, low ? C.red : C.cream);
    // かすめ点ゲージ(12マス)
    for (var g = 0; g < NEEDED; g++) game.draw.rect(150 + g * 66, 96, 54, 34, g < graze ? C.leaf : '#00000040');
    out(Math.min(graze, NEEDED) + ' / ' + NEEDED, W / 2, 200, 48, C.cream);
    for (var h = 0; h < LIVES; h++) game.draw.sprite(NUT, h < hits ? { o: C.red, h: '#ffd0c0' } : { o: '#00000040', h: '#00000040' }, W - 120 - h * 60, 200, 10, { anchor: 'center' });
    if (combo >= 2) out('x' + Math.min(4, combo), 120, 200, 44, C.red);
  }

  function drawScene(t) {
    avenue(t);
    drawNuts(t);
    drawPup(t);
    vignette();
    for (var sl = 0; sl < H; sl += 8) game.draw.rect(0, sl, W, 2, '#000000', 0.05);
  }

  // ---- ATTRACT: 同じ stepWorld/turn を使い、ゴーストが振り返りでかすめる → たまに見誤ってぶつかる ----
  var demo = { t: 0, x: W / 2, y: H * 0.86, press: false, pressT: 0, decided: 0, lazyEvery: 4 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; demo.decided = 0; }
    elapsedP += dt;
    stepWorld(dt, true);
    if (demo.pressT > 0) demo.pressT -= dt;
    // まだ判断していない実で、落ちる0.45秒前を過ぎたら向きを選ぶ
    for (var i = 0; i < nuts.length; i++) {
      var n = nuts[i];
      if (n.landed || n.ai || n.t < FALL_T - 0.5) continue;
      n.ai = true; demo.decided++;
      var rem = FALL_T - n.t;
      var keep = Math.abs(predictX(pup.x, pup.dir, pup.speed, rem) - n.x);
      var flip = Math.abs(predictX(pup.x, -pup.dir, pup.speed, rem) - n.x);
      function val(d) { return d < HIT_R + 8 ? -1 : d < PERF_R ? 3 : d < GRAZE_R ? 2 : 0; }
      var lazy = demo.decided % demo.lazyEvery === 0;
      if (!lazy && val(flip) > val(keep)) { turn(); demo.pressT = 0.22; }
    }
    demo.press = demo.pressT > 0;
    demo.x += (W / 2 + 140 - demo.x) * Math.min(1, dt * 5);
    demo.y = H * 0.86 + (demo.press ? 6 : -10);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 13 });
      out(GAME_TITLE, W / 2, H * 0.085 + Math.sin(t * 2) * 5, 104, C.cream);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.125, 40, C.leaf);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.965, 46, C.cream);
      else out('TAP TO START', W / 2, H * 0.965, 42, C.leaf);
      return;
    }

    if (mode === S.RESULT) {
      stepWorld(dt, false);
      drawScene(t);
      game.draw.rect(90, H * 0.3, W - 180, 480, '#2a2218', 0.88);
      out(cleared ? 'CLEAR' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.36, 96, cleared ? C.leaf : C.red);
      out('SCORE ' + finalScore, W / 2, H * 0.42, 60, C.cream);
      out('PERFECT ' + perfects + '   COMBO ' + bestCombo, W / 2, H * 0.47, 42, C.leaf);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.52, 56, C.red);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.52, 42, C.cream);
      if (!cleared) out('あと' + Math.max(1, NEEDED - graze) + '点!', W / 2, H * 0.27, 64, C.red);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.cream);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { graze: graze, perfects: perfects, maxCombo: bestCombo, hits: hits };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopKind === 'win') stepWorld(dt, false);
      if (stopT <= 0) {
        if (stopKind === 'win') ending(true);
        else { game.feedback.bad(culprit ? culprit.x : pup.x, GY - 120, { text: stopKind === 'time' ? 'TIME UP' : 'MISS', color: C.red, size: 62 }); ending(false); }
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      timeLeft -= dt; elapsedP += dt;
      pup.speed = 330 + 150 * Math.min(1, elapsedP / TIME_LIMIT);
      stepWorld(dt, true);
      if (timeLeft < 4) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.06, { wave: 'square', volume: 0.07 }); }
      }
      if (timeLeft <= 0 && stopT <= 0) { timeLeft = 0; stopT = 0.45; stopKind = 'time'; game.audio.tone('C4', 0.3, { wave: 'square', volume: 0.1, slide: -120 }); }
    }

    drawScene(t);
    if (stopT > 0 && stopKind === 'win') game.draw.circle(pup.x, GY - 30, 100 + (0.4 - stopT) * 1600, C.cream, 0.3);
    // 開始直後のお手本: タップで振り返る
    if (!fin && readyT <= 0 && elapsedP < 1.4) game.draw.hand(W / 2 + 140, H * 0.86 + (Math.floor(elapsedP * 3) % 2 ? 6 : -8), { press: Math.floor(elapsedP * 3) % 2 === 1, scale: 11, alpha: 0.5 });
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.24, 120, C.cream);
  });

  game.onStart(function() {
    game.audio.melody([
      ['E5', 0.5], ['G5', 0.5], ['A5', 1], ['G5', 0.5], ['E5', 0.5], ['D5', 1],
      ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 2],
      ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 1], ['D5', 0.5], ['C5', 1.5],
    ], { tempo: 132, wave: 'square', volume: 0.05, loop: true, bass: [['A2', 1], ['E3', 1], ['C3', 1], ['G2', 1]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);

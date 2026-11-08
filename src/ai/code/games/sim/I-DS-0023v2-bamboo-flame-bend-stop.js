// I-DS-0023v2-bamboo-flame-bend-stop.js
// 竹ひご火曲げ — 火であぶられて曲がり続ける竹ひごが、型の角度に重なった瞬間に1回だけタップして止める
// 操作: 画面のどこかを1本につき1回だけタップすると曲がりが止まる。型の点線との角度差で判定。火が赤く光ったあとは曲がりが急に速まる
// 終わり: 6本を曲げ終えればCLEAR。角度外れ/曲げすぎて割れるのが2回、または15秒を超えるとGAME OVER
// @mechanic: timing_one_shot
// @theme: bamboo_craft_flame_bending
// 世界観: 竹細工の工房で、竹職人が炭火の上で竹ひごをあぶり、だんだん速く曲がっていくひごを型の角度ぴったりで火から上げて、籠の骨を6本そろえる
// 残るもの: 正誤(CLEAR/GAME OVER) + PERFECT数・角度誤差・スコア
// スタイル: 70s VECTOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 黒地に発光する線画のみ。線を太さ違いで重ねて発光させる
  var STYLE = { bg: ['#000000', '#03101c'], main: ['#7dffb0', '#7ad8ff', '#ffd27a'], accent: ['#ff5a5a', '#ffffff'] };
  var V = { g: STYLE.main[0], c: STYLE.main[1], a: STYLE.main[2], r: STYLE.accent[0], w: STYLE.accent[1], fire: '#ff9a3a' };

  var GAME_TITLE = 'HIGO BEND';
  var TIME_LIMIT = 15;
  var MISS_MAX = 2;
  var STRIPS = [
    { tgt: 40, w0: 20, acc: 6, flare: -1 },
    { tgt: 65, w0: 26, acc: 12, flare: -1 },
    { tgt: 35, w0: 14, acc: 6, flare: 0.9 },
    { tgt: 80, w0: 30, acc: 20, flare: -1 },
    { tgt: 50, w0: 18, acc: 10, flare: 1.0 },
    { tgt: 70, w0: 34, acc: 24, flare: 0.7 },
  ];
  var PX = 360, PY = Math.round(H * 0.56), LEN = 560, BASE_X = 70;
  var SNAP_OVER = 22;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var idx, ang, spd, st, stT, flareOn, warnPlayed, lastErr, done, perfects, misses, score, finalScore, errSum;
  var timeLeft, readyT, stopT, stopKind, fin, cleared, postT, joyT, sadT, rack, slideT, playT, warnT;

  // 竹職人(発光する線画の人物)
  var MAN_A = ['...gggg...', '..gggggg..', '..g.gg.g..', '..gggggg..', '...g..g...', '.gggggggg.', 'g.gggggg.g', 'g.gggggg.g', '..gg..gg..', '..g....g..'];
  var MAN_B = ['...gggg...', '..gggggg..', '..g.gg.g..', '..gggggg..', '...g..g...', 'gggggggggg', '..gggggg..', '..gggggg..', '..gg..gg..', '..g....g..'];
  var MAN_JOY = ['g..gggg..g', 'g.gggggg.g', '.gg.gg.gg.', '..gggggg..', '..g.gg.g..', '..gggggg..', '..gggggg..', '..gggggg..', '..gg..gg..', '.g......g.'];
  var MAN_SAD = ['..........', '...gggg...', '..gggggg..', '..g.gg.g..', '..gg..gg..', '.gggggggg.', 'g.gggggg.g', '..gggggg..', '..gg..gg..', '..g....g..'];

  function out(str, x, y, sz, color) {
    game.draw.text(str, x, y + 3, { size: sz, color: '#00000088', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }
  // 発光線: 太い半透明→細い実線の重ね打ち
  function gl(x1, y1, x2, y2, col, w) {
    game.draw.line(x1, y1, x2, y2, col + '30', w * 4);
    game.draw.line(x1, y1, x2, y2, col + '70', w * 2);
    game.draw.line(x1, y1, x2, y2, col, w);
  }
  function ring(x, y, r, col, n, w) {
    for (var i = 0; i < n; i++) {
      var a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
      gl(x + Math.cos(a0) * r, y + Math.sin(a0) * r, x + Math.cos(a1) * r, y + Math.sin(a1) * r, col, w);
    }
  }

  // 円弧で曲がるひごの点列(根元からの累積角が線形に増える)
  function curve(deg, len) {
    var pts = [{ x: PX, y: PY }], n = 12, th = deg * Math.PI / 180, x = PX, y = PY;
    for (var i = 1; i <= n; i++) {
      var ph = th * (i - 0.5) / n;
      x += Math.cos(ph) * len / n; y -= Math.sin(ph) * len / n;
      pts.push({ x: x, y: y });
    }
    return pts;
  }

  function initGame() {
    idx = 0; done = 0; perfects = 0; misses = 0; score = 0; finalScore = 0; errSum = 0; lastErr = 0;
    timeLeft = TIME_LIMIT; readyT = 0.8; stopT = 0; stopKind = ''; fin = false; cleared = false; postT = 0;
    joyT = 0; sadT = 0; rack = []; slideT = 0; playT = 0; warnT = 0;
    startStrip(0);
  }

  function startStrip(i) {
    idx = i; ang = 0; spd = STRIPS[i].w0; st = 'bend'; stT = 0; flareOn = false; warnPlayed = false; slideT = 0.35;
  }

  function stepStrip(dt) {
    if (slideT > 0) { slideT -= dt; return; }
    if (st !== 'bend') { stT += dt; return; }
    var cfg = STRIPS[idx];
    stT += dt;
    // 炎の急な強まり(0.6秒前に赤く光って予告)
    if (cfg.flare > 0 && !warnPlayed && stT >= cfg.flare - 0.6) {
      warnPlayed = true;
      game.audio.tone('A5', 0.08, { wave: 'square', volume: 0.08 });
      game.audio.tone('A5', 0.08, { wave: 'square', volume: 0.06 });
    }
    flareOn = cfg.flare > 0 && stT >= cfg.flare && stT < cfg.flare + 0.5;
    spd = cfg.w0 + cfg.acc * stT;
    ang += spd * (flareOn ? 2.2 : 1) * dt;
    if (Math.floor(ang / 5) !== Math.floor((ang - spd * dt) / 5)) game.audio.tone(260 + ang * 6, 0.025, { wave: 'triangle', volume: 0.04 });
    if (ang >= cfg.tgt + SNAP_OVER) {
      ang = cfg.tgt + SNAP_OVER;
      resolve(true);
    }
  }

  // 1本につき1回だけの停止(本番もデモも同じ判定)
  function tapStop() {
    if (st !== 'bend' || slideT > 0) return;
    resolve(false);
  }

  function resolve(snapped) {
    var cfg = STRIPS[idx];
    var err = Math.abs(ang - cfg.tgt);
    lastErr = err; stT = 0;
    if (!snapped && err <= 6) {
      st = 'good';
      var perfect = err <= 2.5;
      if (perfect) perfects++;
      done++; errSum += err;
      var pts = perfect ? 300 : 150;
      score += pts; joyT = 0.7;
      var tip = curve(ang, LEN)[12];
      game.feedback.good(tip.x, tip.y, { text: perfect ? 'PERFECT' : 'GOOD', color: V.g, size: 60 });
      game.audio.play('se_powerup', 0.35);
      game.fx.popup('+' + pts, tip.x - 120, tip.y - 60, { color: V.a, size: 44 });
      if (mode === S.PLAYING && done === 3) { game.audio.play('se_milestone', 0.45); game.fx.popup('NICE', W / 2, H * 0.24, { color: V.c, size: 84 }); }
      return;
    }
    st = snapped ? 'snap' : 'miss';
    misses++; sadT = 0.8;
    if (snapped) game.audio.play('se_break', 0.4);
    if (mode === S.PLAYING && misses >= MISS_MAX) {
      stopT = 0.5; stopKind = 'miss';
      game.fx.flash('#ffffff', 0.15);
      game.audio.tone('C3', 0.3, { wave: 'sawtooth', volume: 0.1, slide: -60 });
      return;
    }
    var tp = curve(ang, LEN)[12];
    game.feedback.bad(tp.x, tp.y, { text: 'MISS', color: V.r, size: 60 });
  }

  function nextOrEnd() {
    if (st === 'good' || st === 'miss' || st === 'snap') rack.push({ deg: ang, ok: st === 'good' });
    if (idx >= STRIPS.length - 1) { if (mode === S.PLAYING) { stopT = 0.45; stopKind = 'win'; } else startStrip(0); return; }
    startStrip(idx + 1);
    game.audio.play('se_jump', 0.25);
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = score + (win ? Math.ceil(timeLeft) * 20 + (misses === 0 ? 300 : 0) : 0);
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 6; i++) game.fx.burst(140 + i * 160, H * 0.45 + (i % 2) * 160, { color: i % 2 ? V.g : V.a, count: 18, speed: 520 });
      game.fx.flash(V.g, 0.2);
    }
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (fin || stopT > 0 || readyT > 0) return;
    if (st === 'bend' && slideT <= 0) { game.audio.play('se_tap', 0.25); tapStop(); }
    else game.audio.tone('D3', 0.04, { wave: 'triangle', volume: 0.05 });
  });

  // ---- 描画 ----
  function shop(t) {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.6, STYLE.bg[1]], [1, '#000000']]);
    // 工房の梁と吊るした竹束(線だけ)
    gl(0, H * 0.15, W, H * 0.15, V.c, 2);
    for (var b = 0; b < 7; b++) {
      var bx = 90 + b * 150, sw = Math.sin(t * 1.3 + b) * 8;
      for (var k = 0; k < 3; k++) gl(bx + k * 14, H * 0.15, bx + k * 14 + sw, H * 0.15 + 160 + k * 20, '#3a7a5a', 2);
    }
    // 炭床
    gl(PX - 60, PY + 170, PX + 360, PY + 170, V.a, 3);
    gl(PX - 60, PY + 170, PX - 30, PY + 240, V.a, 3);
    gl(PX + 360, PY + 170, PX + 330, PY + 240, V.a, 3);
    gl(PX - 30, PY + 240, PX + 330, PY + 240, V.a, 3);
  }

  function drawFlame(t) {
    var cfg = STRIPS[idx];
    var warn = cfg.flare > 0 && st === 'bend' && stT >= cfg.flare - 0.6 && stT < cfg.flare;
    var col = flareOn ? V.r : (warn && Math.floor(t * 14) % 2 === 0 ? V.r : V.fire);
    var hgt = flareOn ? 230 : 140;
    for (var f = 0; f < 5; f++) {
      var fx = PX + 40 + f * 60, fl = hgt * (0.6 + 0.4 * Math.abs(Math.sin(t * 9 + f * 1.7)));
      gl(fx - 18, PY + 168, fx + Math.sin(t * 13 + f) * 10, PY + 168 - fl, col, 3);
      gl(fx + 18, PY + 168, fx + Math.sin(t * 13 + f) * 10, PY + 168 - fl, col, 3);
    }
    if (warn) {
      // 予告の「!」三角
      var wx = PX + 450, wy = PY + 140;
      gl(wx, wy - 60, wx - 50, wy + 30, V.r, 4); gl(wx - 50, wy + 30, wx + 50, wy + 30, V.r, 4); gl(wx + 50, wy + 30, wx, wy - 60, V.r, 4);
      gl(wx, wy - 30, wx, wy + 5, V.r, 5); gl(wx, wy + 14, wx, wy + 20, V.r, 5);
    }
  }

  function drawJig(t) {
    var cfg = STRIPS[idx];
    // 分度器の弧と目盛
    for (var d = 0; d <= 90; d += 10) {
      var a = d * Math.PI / 180, r0 = 120, r1 = d % 30 === 0 ? 160 : 145;
      gl(PX + Math.cos(a) * r0, PY - Math.sin(a) * r0, PX + Math.cos(a) * r1, PY - Math.sin(a) * r1, '#2a6a8a', 2);
    }
    // 型(狙いの曲がり)を点線で
    var g = curve(cfg.tgt, LEN), pulse = Math.floor(t * 6) % 2 === 0;
    for (var i = 1; i < g.length; i++) if (i % 2 === 1) gl(g[i - 1].x, g[i - 1].y, g[i].x, g[i].y, V.c, pulse ? 4 : 3);
    ring(g[12].x, g[12].y, 34 + Math.sin(t * 8) * 4, V.w, 10, 2);
  }

  function drawStrip(t) {
    var off = slideT > 0 ? -slideT / 0.35 * 700 : 0;
    var col = st === 'good' ? V.g : (st === 'miss' || st === 'snap') ? V.r : V.a;
    var big = stopT > 0 && stopKind === 'miss';
    if (big && Math.floor(t * 16) % 2 === 0) col = V.w;
    gl(BASE_X + off, PY, PX + off, PY, col, big ? 12 : 8);
    var p = curve(ang, big ? LEN * 1.12 : LEN);
    var lim = st === 'snap' ? 7 : 12;
    for (var i = 1; i <= lim; i++) gl(p[i - 1].x + off, p[i - 1].y, p[i].x + off, p[i].y, col, big ? 12 : 8);
    if (st === 'snap') {
      // 割れて垂れた先
      var q = p[7];
      gl(q.x, q.y, q.x + 120, q.y + 140 + stT * 300, col, 6);
    }
    // 根元を押さえる手元
    ring(BASE_X + 40 + off, PY, 26, V.g, 8, 3);
  }

  function drawMan(t) {
    var fr = sadT > 0 || (fin && !cleared) ? MAN_SAD : (joyT > 0 || (fin && cleared)) ? MAN_JOY : (Math.floor(t * 2) % 2 ? MAN_A : MAN_B);
    var hop = fin && cleared ? -Math.abs(Math.sin(t * 12)) * 26 : Math.sin(t * 2.2) * 4;
    game.draw.sprite(fr, { g: V.g }, 170, H * 0.84 + hop, 20, { anchor: 'center', alpha: 0.35 });
    game.draw.sprite(fr, { g: V.g }, 170, H * 0.84 + hop, 18, { anchor: 'center' });
    // 仕上がった骨の棚
    gl(380, H * 0.93, W - 60, H * 0.93, V.c, 2);
    for (var i = 0; i < STRIPS.length; i++) {
      var x = 420 + i * 105, y = H * 0.92;
      if (i < rack.length) {
        var dg = rack[i].deg * Math.PI / 180, c = rack[i].ok ? V.g : V.r;
        gl(x, y, x + 30, y, c, 4);
        gl(x + 30, y, x + 30 + Math.cos(dg) * 50, y - Math.sin(dg) * 50, c, 4);
      } else ring(x + 40, y - 30, 14, '#2a6a8a', 8, 2);
    }
  }

  function drawHud(t) {
    var low = timeLeft < 4 && Math.floor(t * 6) % 2 === 0;
    gl(70, 50, W - 70, 50, '#2a6a8a', 2);
    gl(70, 50, 70 + (W - 140) * Math.max(0, timeLeft / TIME_LIMIT), 50, low ? V.r : V.a, 6);
    out(Math.min(idx + 1, STRIPS.length) + ' / ' + STRIPS.length, W / 2, 130, 52, V.g);
    for (var m = 0; m < MISS_MAX; m++) ring(W - 110 - m * 70, 186, 22, m < misses ? V.r : '#2a6a8a', 10, 3);
    out('' + score, 170, 140, 40, V.a);
  }

  function drawScene(t) {
    shop(t);
    drawFlame(t);
    drawJig(t);
    drawStrip(t);
    drawMan(t);
    for (var sl = 0; sl < H; sl += 8) game.draw.rect(0, sl, W, 2, '#000000', 0.25);
  }

  // ---- ATTRACT: 本物の stepStrip()/tapStop() で 1本目を型どおりに止め、2本目は止めずに割ってしまう ----
  var demo = { t: 0, press: false, tapped: false, pause: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.2;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; slideT = 0; demo.tapped = false; demo.pause = 0; }
    demo.press = false;
    if (st === 'bend') {
      stepStrip(dt);
      if (idx === 0 && !demo.tapped && ang >= STRIPS[0].tgt - 0.8) { demo.tapped = true; demo.press = true; tapStop(); }
    } else {
      stT += dt;
      if (idx === 0 && stT < 0.15) demo.press = true;
      if (idx === 0 && stT > 0.8) { startStrip(1); slideT = 0; }
    }
    if (joyT > 0) joyT -= dt;
    if (sadT > 0) sadT -= dt;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(W * 0.62, H * 0.80 + (demo.press ? 0 : Math.sin(t * 3) * 10), { press: demo.press, scale: 14 });
      out(GAME_TITLE, W / 2, H * 0.07 + Math.sin(t * 2) * 5, 96, V.a);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.105, 38, V.c);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.975, 46, V.a);
      else out('TAP TO START', W / 2, H * 0.975, 40, V.g);
      return;
    }

    if (mode === S.RESULT) {
      drawScene(t);
      game.draw.rect(90, H * 0.22, W - 180, 470, '#000000', 0.85);
      gl(90, H * 0.22, W - 90, H * 0.22, cleared ? V.g : V.r, 3);
      out(cleared ? 'CLEAR' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.27, 96, cleared ? V.g : V.r);
      out('SCORE ' + finalScore, W / 2, H * 0.33, 60, V.w);
      out(done + ' / ' + STRIPS.length + '   PERFECT ' + perfects, W / 2, H * 0.38, 42, V.c);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.43, 56, V.a);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.43, 42, V.a);
      if (!cleared) out('あと' + (STRIPS.length - done) + '本!', W / 2, H * 0.19, 60, V.r);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.975, 40, V.g);
      return;
    }

    // ---- PLAYING ----
    if (joyT > 0) joyT -= dt;
    if (sadT > 0) sadT -= dt;
    if (fin) {
      postT -= dt;
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { strips: done, perfect: perfects, misses: misses, avgErr: done ? Math.round(errSum / done * 10) / 10 : 0 };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) {
        if (stopKind === 'win') ending(true);
        else { game.feedback.bad(W / 2, PY - 200, { text: stopKind === 'time' ? 'TIME UP' : 'MISS', color: V.r, size: 62 }); ending(false); }
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      timeLeft -= dt; playT += dt;
      stepStrip(dt);
      if (st !== 'bend' && stT > 0.55) nextOrEnd();
      if (timeLeft < 4) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone('E5', 0.05, { wave: 'square', volume: 0.06 }); }
      }
      if (timeLeft <= 0 && stopT <= 0 && !fin) { timeLeft = 0; stopT = 0.45; stopKind = 'time'; st = 'miss'; }
    }

    drawScene(t);
    if (stopT > 0 && stopKind === 'win') ring(W / 2, H * 0.5, 100 + (0.45 - stopT) * 1400, V.g, 24, 4);
    // 開始直後のお手本: 型の点線に手を添える
    if (!fin && readyT <= 0 && idx === 0 && playT < 1.0) {
      var g = curve(STRIPS[0].tgt, LEN)[12];
      game.draw.hand(g.x, g.y + 40, { press: false, scale: 11, alpha: 0.5 });
    }
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 120, V.a);
  });

  game.onStart(function() {
    game.audio.melody([
      ['D5', 0.5], ['F5', 0.5], ['A5', 0.5], ['G5', 0.5], ['F5', 1], ['D5', 1],
      ['C5', 0.5], ['D5', 0.5], ['F5', 0.5], ['G5', 0.5], ['A5', 2],
      ['C6', 0.5], ['A5', 0.5], ['G5', 0.5], ['F5', 0.5], ['G5', 1], ['E5', 0.5], ['D5', 1.5],
    ], { tempo: 132, wave: 'square', volume: 0.05, loop: true, bass: [['D3', 2], ['A2', 2], ['C3', 2], ['G2', 2], ['D3', 2], ['A2', 2]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);

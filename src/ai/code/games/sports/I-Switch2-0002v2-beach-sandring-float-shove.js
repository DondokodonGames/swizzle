// I-Switch2-0002v2-beach-sandring-float-shove.js
// 砂の輪の浮き輪押し — 浜辺に描いた砂の輪の中で、ゆらゆら揺れる大きな浮き輪人形がこちらを向いた瞬間に連打で押し込み、輪の外へ押し出す
// 操作: 浮き輪人形は前後にゆっくり揺れ続ける(こちらへ倒れてくる間は顔が見え、足元の帯が光る)。その間に画面を連打すると1回ごとに少年が人形を向こうへ押し込む。人形が向こうへ反っている間(顔が見えない)に押すと手が滑り、戻ってきた人形に押し返されて少年が後ずさる(進みが減る)。揺れが反転する直前に人形の目が細くなる
// 終わり: 20秒以内に3体(小→大)を輪の外へ押し出せばCLEAR(押し出すたびに残り秒の加点。揺れの頂点で押すとPERFECT)。時間切れでGAME OVER
// @mechanic: push_out
// @theme: beach_sandring_float_shove
// 世界観: 夏の海の家の砂浜で、少年が棒で描いた砂の輪の中に置いた大きな浮き輪人形と向かい合い、人形がこちらへ倒れてきた瞬間だけ両手で連打して押し込み、輪の外まで押し出す力くらべ
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・押し出した数・PERFECT数・押し返された回数
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体を上面(明)/正面(中)/右面(暗)の3明度で描き、等角に積む
  var STYLE = { bg: ['#9fe3ff', '#5ab8e8', '#f6dfa8'], main: ['#ff6a4a', '#ffd84a', '#4ad0b0'], accent: ['#ffffff', '#2a3a5a'] };
  var C = {
    sky: STYLE.bg[0], sea: STYLE.bg[1], sand: STYLE.bg[2], red: STYLE.main[0], yellow: STYLE.main[1], teal: STYLE.main[2],
    white: STYLE.accent[0], ink: STYLE.accent[1], sand2: '#e8c888', sand3: '#c8a060', bad: '#ff4a6a', ok: '#6ae08a',
  };

  var GAME_TITLE = 'SAND RING SHOVE';
  var TIME_LIMIT = 20;
  var ROUNDS = 3;
  var GROUND = Math.round(H * 0.64);
  var RING_L = 150, RING_R = 930;
  var BOY_X = 330;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var round, doll, playT, readyT, stopT, pressT, staggerT, score, outs, perfects, pushbacks, over, won, outroT, milestone, prevBest, roundFlash;

  // 体ごとの設定: 大きさ・揺れの周期・向いている時間の割合・押し出すのに必要な押し回数
  var DOLLS = [
    { size: 24, period: 1.6, face: 0.5, pushes: 12 },
    { size: 30, period: 1.3, face: 0.45, pushes: 18 },
    { size: 36, period: 1.1, face: 0.4, pushes: 26 },
  ];

  function newDoll(r) {
    var d = DOLLS[Math.min(r, DOLLS.length - 1)];
    var startX = 560;
    return { x: startX, step: (RING_R - startX) / d.pushes, size: d.size, period: d.period, face: d.face, t: 0, lean: 0, facing: true, squint: false, out: false, flash: 0, wob: 0 };
  }

  function initGame() {
    round = 0; doll = newDoll(0); playT = 0; readyT = 0.8; stopT = 0; pressT = 0; staggerT = 0;
    score = 0; outs = 0; perfects = 0; pushbacks = 0; over = false; won = false; outroT = 0; milestone = false; prevBest = game.best; roundFlash = 0;
  }

  // 揺れ: 周期の前半(face割合)はこちらへ倒れ、後半は向こうへ反る
  function stepDoll(dt) {
    doll.t += dt;
    var u = (doll.t % doll.period) / doll.period;
    var wasFacing = doll.facing;
    doll.facing = u < doll.face;
    if (doll.facing) doll.lean = Math.sin(u / doll.face * Math.PI);
    else doll.lean = -Math.sin((u - doll.face) / (1 - doll.face) * Math.PI);
    doll.squint = doll.facing && u > doll.face - 0.22;
    if (wasFacing && !doll.facing) game.audio.tone(260, 0.06, { wave: 'triangle', volume: 0.04 });
    if (!wasFacing && doll.facing) game.audio.tone(520, 0.06, { wave: 'triangle', volume: 0.05 });
    if (doll.wob > 0) doll.wob -= dt;
    if (doll.flash > 0) doll.flash -= dt;
    if (roundFlash > 0) roundFlash -= dt;
    if (staggerT > 0) staggerT -= dt;
  }

  function shove(demo) {
    if (staggerT > 0 || doll.out) return;
    pressT = 0.12;
    if (doll.facing) {
      doll.x += doll.step; doll.wob = 0.15;
      var peak = doll.lean > 0.8;
      if (peak) perfects++;
      var pts = peak ? 30 : 10;
      if (!demo) score += pts;
      game.audio.tone(peak ? 700 : 480, 0.05, { wave: 'square', volume: 0.05 });
      game.fx.burst(doll.x - doll.size * 2, GROUND - 60, { color: C.sand2, count: 4, speed: 180 });
      if (peak && Math.floor(doll.t * 10) % 3 === 0) game.feedback.good(doll.x, GROUND - doll.size * 9, { text: 'PERFECT', color: C.yellow, size: 40, sound: 'se_good', volume: 0.2, count: 6 });
      if (doll.x >= RING_R) pushOut(demo);
    } else {
      // 反っている人形を押した: 滑って押し返される
      doll.x = Math.max(560, doll.x - doll.step * 2); doll.flash = 0.4; staggerT = 0.4; pushbacks++;
      game.feedback.bad(BOY_X, GROUND - 160, { text: 'MISS', shake: demo ? 4 : 8 });
      game.audio.tone(180, 0.12, { wave: 'sawtooth', volume: 0.06, slide: -120 });
    }
  }

  function pushOut(demo) {
    doll.out = true; outs++; stopT = 0.6; roundFlash = 0.6;
    var bonus = Math.round(Math.max(0, TIME_LIMIT - playT) * 10) + 100;
    if (!demo) score += bonus;
    game.feedback.good(doll.x, GROUND - doll.size * 8, { text: 'NICE', color: C.white, size: 60, sound: 'se_coin', volume: 0.4, count: 20 });
    game.fx.popup('+' + bonus, W / 2, H * 0.34, { color: C.yellow, size: 60 });
    game.fx.burst(RING_R, GROUND - 40, { color: C.red, count: 24, speed: 420 });
    if (!demo && !milestone && outs >= 2) { milestone = true; game.audio.play('se_milestone', 0.5); game.fx.popup(outs + ' / ' + ROUNDS, W / 2, H * 0.28, { color: C.teal, size: 80 }); }
  }

  function nextRound(demo) {
    round++;
    if (round >= ROUNDS) { if (!demo) finish(true); return; }
    doll = newDoll(round);
  }

  function finish(ok) {
    over = true; won = ok; outroT = 1.5;
    game.audio.stopBgm();
    if (ok) {
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 6; i++) game.fx.burst(game.random(160, 920), game.random(300, 1000), { color: [C.red, C.yellow, C.teal][i % 3], count: 22, speed: 440 });
      game.fx.flash(C.white, 0.25);
    } else game.audio.play('se_failure', 0.5);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    if (over || readyT > 0 || stopT > 0) { game.audio.tone(200, 0.03, { wave: 'square', volume: 0.03 }); return; }
    shove(false);
  });

  // ---- 描画(ボクセル) ----
  function label(str, x, y, sz, col) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }
  function shade(hex, k) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    function f(v) { v = Math.round(v * k); return ('0' + Math.max(0, Math.min(255, v)).toString(16)).slice(-2); }
    return '#' + f(r) + f(g) + f(b);
  }
  // 立方体: 正面(中)/上面(明)/右面(暗)。(x,y)は正面の左下
  function cube(x, y, s, col, alpha) {
    var d = Math.round(s * 0.45);
    game.draw.rect(x, y - s, s, s, col, alpha);
    game.draw.rect(x + d, y - s - d, s, d, shade(col, 1.25), alpha);
    game.draw.rect(x + s, y - s - d + d, d, s, shade(col, 0.65), alpha);
    game.draw.rect(x + s, y - s - d, d, d, shade(col, 0.9), alpha);
  }

  function drawBeach() {
    var t = game.time.elapsed;
    game.draw.gradient(0, GROUND - 240, [[0, C.sky], [1, '#dff4ff']]);
    // 海(ブロックの波)
    for (var row = 0; row < 4; row++) {
      var y = GROUND - 240 + row * 40;
      for (var x = -40; x < W + 40; x += 40) {
        var ph = Math.sin(t * 2 + x * 0.02 + row) > 0.6 ? C.white : (row % 2 ? C.sea : shade(C.sea, 1.1));
        game.draw.rect(x + (row % 2) * 20 + Math.sin(t + row) * 6, y, 40, 40, ph);
      }
    }
    // 砂浜(3段の帯)
    game.draw.rect(0, GROUND - 80, W, H - GROUND + 80, C.sand);
    for (var c = 0; c < 26; c++) game.draw.rect((c * 97) % W, GROUND + 60 + (c * 53) % 500, 12, 12, C.sand2);
    // パラソルと海の家(ブロック積み)
    for (var k = 0; k < 6; k++) cube(60 + k * 48, GROUND - 120, 44, k % 2 ? C.red : C.white);
    for (var k2 = 0; k2 < 4; k2++) cube(108 + k2 * 48, GROUND - 164, 44, k2 % 2 ? C.white : C.red);
    cube(170, GROUND - 90, 24, C.sand3); cube(170, GROUND - 66, 24, C.sand3);
    for (var hx = 0; hx < 5; hx++) for (var hy = 0; hy < 3; hy++) cube(760 + hx * 56, GROUND - 160 - hy * 56, 54, hy === 2 ? C.teal : '#f0e8d8');
    // 砂の輪(ブロックで描いた線)
    for (var rx = RING_L; rx <= RING_R; rx += 36) {
      game.draw.rect(rx, GROUND + 22, 26, 10, C.sand3);
      game.draw.rect(rx, GROUND - 36, 26, 10, C.sand3, 0.5);
    }
    for (var ry = GROUND - 36; ry <= GROUND + 22; ry += 14) { game.draw.rect(RING_L - 8, ry, 10, 10, C.sand3); game.draw.rect(RING_R + 24, ry, 10, 10, C.sand3); }
    // こちらを向いている間だけ光る帯
    if (doll.facing && !doll.out) game.draw.rect(RING_L, GROUND + 36, RING_R - RING_L + 30, 14, C.yellow, 0.5 + 0.4 * Math.max(0, doll.lean));
  }

  function drawDoll() {
    var s = doll.size, base = GROUND + 10;
    var lean = doll.lean;
    var bx = doll.x + (doll.wob > 0 ? Math.sin(game.time.elapsed * 60) * 6 : 0);
    var big = stopT > 0 && doll.out;
    if (big) game.draw.circle(bx + s, base - s * 4, s * 6, C.white, 0.45);
    // 影
    game.draw.circle(bx + s * 1.2, base + 10, s * 2.6, C.sand3, 0.5);
    // 下から積む: 太い輪(浮き輪)→胴→頭。上に行くほど傾きの分だけ手前(左)へずれる
    var layers = [
      { w: 5, h: 1, col: C.red }, { w: 5, h: 1, col: C.white }, { w: 4, h: 1, col: C.red },
      { w: 3, h: 2, col: C.yellow }, { w: 3, h: 1, col: C.teal }, { w: 2, h: 2, col: '#ffd8b0' },
    ];
    var y = base, idx = 0;
    for (var l = 0; l < layers.length; l++) {
      var L = layers[l];
      for (var hh = 0; hh < L.h; hh++) {
        var off = -lean * idx * s * 0.28;
        var x0 = bx - (L.w * s) / 2 + off + s * 2.5;
        for (var w = 0; w < L.w; w++) cube(x0 + w * s, y, s, doll.flash > 0 ? C.white : L.col);
        y -= s; idx++;
      }
    }
    // 顔(こちらを向いている時だけ)
    if (doll.facing && !doll.out) {
      var fx = bx + s * 2.5 - lean * (idx - 1) * s * 0.28, fy = y + s * 1.2;
      var eh = doll.squint ? 4 : 10;
      game.draw.rect(fx - s * 0.7, fy, 10, eh, C.ink);
      game.draw.rect(fx + s * 0.4, fy, 10, eh, C.ink);
      game.draw.rect(fx - s * 0.3, fy + s * 0.5, s * 0.7, 6, C.red);
    }
  }

  function drawBoy() {
    var t = game.time.elapsed;
    var push = pressT > 0 ? 14 : 0;
    var stagger = staggerT > 0 ? -Math.sin(staggerT * 20) * 10 - 20 : 0;
    var x = BOY_X + push + stagger, base = GROUND + 6, s = 20;
    // 脚・胴・頭・腕(ブロック)
    cube(x - 22, base, s, C.ink); cube(x + 2, base, s, C.ink);
    cube(x - 20, base - s, s, C.teal); cube(x, base - s, s, C.teal);
    cube(x - 20, base - s * 2, s, C.teal); cube(x, base - s * 2, s, C.teal);
    cube(x - 10, base - s * 3, s, '#f6c9a0');
    cube(x - 14, base - s * 4, 28, C.yellow);
    var armY = base - s * 2 - (pressT > 0 ? 6 : 0);
    cube(x + 20 + push, armY, 18, '#f6c9a0'); cube(x + 38 + push, armY, 18, '#f6c9a0');
    if (staggerT > 0 && Math.floor(t * 20) % 2 === 0) { game.draw.circle(x - 10, base - s * 5 - 20, 8, C.bad); game.draw.circle(x + 14, base - s * 5 - 30, 6, C.bad); }
  }

  function drawPad() {
    var on = pressT > 0;
    game.draw.rect(W / 2 - 230, H * 0.84 - 10, 460, 170, shade(C.sand3, 0.8));
    game.draw.rect(W / 2 - 230, H * 0.84 - 20 - (on ? 0 : 14), 460, 170, on ? C.yellow : C.red);
    game.draw.rect(W / 2 - 230, H * 0.84 - 20 - (on ? 0 : 14), 460, 30, C.white, 0.5);
    // 両手の絵
    for (var k = 0; k < 2; k++) { var hx = W / 2 - 80 + k * 160; cube(hx - 30, H * 0.84 + 90, 60, '#f6c9a0'); for (var f = 0; f < 4; f++) cube(hx - 30 + f * 15, H * 0.84 + 30, 14, '#f6c9a0'); }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink, 0.85);
    label('SCORE ' + score, 270, 90, 56, C.white);
    label('PERFECT ' + perfects, 270, 170, 36, C.yellow);
    for (var i = 0; i < ROUNDS; i++) cube(660 + i * 110, 110, 50, i < outs ? C.red : (i === round ? C.yellow : '#555'));
    // 輪の端までの進み
    var p = Math.min(1, Math.max(0, (doll.x - 560) / (RING_R - 560)));
    game.draw.rect(560, 150, 460, 24, '#333');
    game.draw.rect(560, 150, 460 * p, 24, C.red);
    game.draw.rect(1014, 140, 12, 44, C.white);
    var tl = Math.max(0, 1 - playT / TIME_LIMIT);
    game.draw.rect(560, 200, 460, 14, '#333');
    game.draw.rect(560, 200, 460 * tl, 14, tl < 0.25 ? C.bad : C.teal);
  }

  function drawScene() {
    drawBeach();
    drawDoll();
    drawBoy();
    drawPad();
  }

  // ---- ATTRACT: 実ロジックで、向いている間だけ連打して押し出す。周期の終わりに反っている間に押して押し返される ----
  var demo = { t: 0, cool: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 10;
    if (demo.t <= dt || cyc < dt) { initGame(); readyT = 0; }
    demo.cool -= dt;
    if (stopT > 0) { stopT -= dt; if (stopT <= 0 && doll.out) nextRound(true); return; }
    stepDoll(dt);
    var wrong = cyc > 7.6 && cyc < 8.4;
    if (demo.cool <= 0 && ((doll.facing && !wrong) || (!doll.facing && wrong))) {
      shove(true); demo.cool = 0.11;
    }
    playT += dt;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(W / 2 + 60, H * 0.84 + 70, { press: pressT > 0, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.85);
      label(GAME_TITLE, W / 2, 105, 84 + Math.sin(t * 3) * 3, C.yellow);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 36, C.white);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.4, 52, C.red);
      else label('TAP TO START', W / 2, H * 0.4, 46, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.27, W, H * 0.27, C.ink, 0.88);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 100, won ? C.ok : C.bad);
      label('SCORE ' + score, W / 2, H * 0.39, 54, C.white);
      label('PERFECT ' + perfects + '  MISS ' + pushbacks, W / 2, H * 0.435, 38, C.yellow);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.485, 48, C.yellow);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.485, 36, C.white);
      if (!won) label('あと' + (ROUNDS - outs) + '体!', W / 2, H * 0.25, 56, C.red);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.565, 36, C.white);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, pushedOut: outs, perfects: perfects, pushbacks: pushbacks };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.35);
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0 && doll.out) nextRound(false);
    } else {
      playT += dt;
      stepDoll(dt);
      if (pressT > 0) pressT -= dt;
      if (playT >= TIME_LIMIT) finish(false);
      else if (TIME_LIMIT - playT < 3 && Math.floor(playT * 4) !== Math.floor((playT - dt) * 4)) game.audio.tone(660, 0.05, { wave: 'square', volume: 0.04 });
    }
    if (pressT > 0 && stopT > 0) pressT -= dt;

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 110, C.yellow);
    if (over && !won) label('TIME UP', W / 2, H * 0.42, 96, C.bad);
    if (over && won) label('FINISH', W / 2, H * 0.42, 100, C.yellow);
  });

  game.onStart(function() {
    // 浜辺の掛け声風(オリジナル): 2拍で押す感じ
    game.audio.melody([
      ['G4', 0.5], ['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['C5', 1], ['A4', 1],
      ['F4', 0.5], ['F4', 0.5], ['A4', 0.5], ['C5', 0.5], ['B4', 1], ['G4', 1],
    ], { tempo: 140, wave: 'square', volume: 0.045, loop: true, bass: [['G2', 1], ['D2', 1], ['F2', 1], ['G2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

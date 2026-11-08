// I-DS-0023v3-temple-timber-angle-pick.js
// 反り木の見立て — 架台に並んだ2本の曲がった木材のうち、図面の反りの角度に近いほうを瞬時に見比べて選ぶ
// 操作: 左右の架台に載った2本のうち、上の図面の曲がり具合に近いほうの木材(左半分/右半分)をタップ。墨糸が縮み切る前に決める
// 終わり: 15秒以内に6本見立てればCLEAR。見立て違い/墨糸切れが2回、または時間切れでGAME OVER
// @mechanic: size_judge
// @theme: temple_repair_timber_choice
// 世界観: 古寺の修繕現場で、宮大工の棟梁が図面に描かれた梁の反りを見て、架台に運ばれてくる2本の曲がった木材のどちらがその角度に近いかを見極め、使う一本を選び出していく(3本ごとに図面が替わり、置き方の向きもばらばらになる)
// 残るもの: 正誤(CLEAR/GAME OVER) + 見立てた本数・最速の見立て・スコア
// スタイル: 90s PRE-RENDER

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: 暗め・金属質、粒状ノイズと擬似奥行き。背景は動かない1枚絵、キャラだけドットで動かす
  var STYLE = { bg: ['#2c2018', '#0c0806'], main: ['#8a5a32', '#d8a86a', '#1c3a68'], accent: ['#e8c060', '#d04a3a'] };
  var V = {
    wood: STYLE.main[0], hi: STYLE.main[1], bp: STYLE.main[2], gold: STYLE.accent[0], ng: STYLE.accent[1],
    edge: '#2a1a10', line: '#e8f0ff', ok: '#6ad08a', stone: '#4a4038', dim: '#6a5a4a',
  };

  var GAME_TITLE = 'SORI TIMBER';
  var TIME_LIMIT = 15;
  var NEEDED = 6;
  var MISS_MAX = 2;
  var TARGETS = [40, 64, 26];
  var LX = W * 0.27, RX = W * 0.73, TY = Math.round(H * 0.6);
  var BPX = W * 0.5, BPY = Math.round(H * 0.215);

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var pairIdx, target, items, good, phase, showT, chosen, okPick, pairT, pairMax, correct, misses, combo, maxCombo, score, finalScore, fastest;
  var timeLeft, readyT, stopT, stopKind, fin, cleared, postT, nodT, shakeT, flipT, warnT, playT;

  // 宮大工の棟梁(鉢巻+法被、差し金を持つ)
  var DAIKU_A = ['..hhhhhh..', '.hhwwwwhh.', '..ffffff..', '..fkffkf..', '..ffssff..', '...ffff...', '.nnnnnnnn.', 'nnnwnnwnnn', 'f.nnnnnn.g', '..nnnnnn.g', '..ll..ll.g', '..ll..ll..'];
  var DAIKU_B = ['..hhhhhh..', '.hhwwwwhh.', '..ffffff..', '..fkffkf..', '..ffssff..', '...ffff...', '.nnnnnnnn.', 'nnnwnnwnnn', 'f.nnnnnn..', '..nnnnnn.g', '..ll..llgg', '..ll..ll..'];
  var DAIKU_NOD = ['..........', '..hhhhhh..', '.hhwwwwhh.', '..ffffff..', '..fkffkf..', '..fkssKf..', '.nnnnnnnn.', 'fnnwnnwnnf', '..nnnnnn..', '..nnnnnn..', '..ll..ll..', '..ll..ll..'];
  var DAIKU_NO = ['..hhhhhh..', '.hhwwwwhh.', '..ffffff..', '..fkffkf..', '..fkkkkf..', '...ffff...', '.nnnnnnnn.', 'nnnwnnwnnn', 'f.nnnnnn.f', '..nnnnnn..', '..ll..ll..', '..ll..ll..'];
  var DAIKU_PAL = { h: '#e8e0d0', w: '#c03a2a', f: '#d8a880', k: '#1a120c', s: '#a86a50', K: '#1a120c', n: '#2a3a5a', l: '#1e2838', g: '#c8ccd4' };

  // 粒状ノイズ(固定の1枚絵として毎回同じ位置)
  var GRAIN = [];
  (function() { var s = 7; for (var i = 0; i < 260; i++) { s = (s * 9301 + 49297) % 233280; var a = s / 233280; s = (s * 9301 + 49297) % 233280; GRAIN.push([a * W, s / 233280 * H]); } })();

  function out(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#000000aa', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  // 曲がり材: 頂点から2本の腕。beta=反り(折れ)角、phi=置き方の傾き
  function arms(beta, phi) {
    var al = (180 - beta) * Math.PI / 180, ph = phi * Math.PI / 180;
    return [Math.PI / 2 + al / 2 + ph, Math.PI / 2 - al / 2 + ph];
  }

  function drawTimber(cx, cy, it, scale, col, t) {
    var a = arms(it.beta, it.phi), L = it.len * scale, vy = cy + 10 * scale;
    var th = 40 * scale;
    for (var k = 0; k < 2; k++) {
      var ex = cx + Math.cos(a[k]) * L, ey = vy + Math.sin(a[k]) * L;
      game.draw.line(cx, vy, ex, ey, V.edge, th + 10 * scale);
      game.draw.line(cx, vy, ex, ey, col, th);
      game.draw.line(cx, vy - th * 0.25, ex, ey - th * 0.25, V.hi, th * 0.22);
      game.draw.circle(ex, ey, th * 0.5, V.edge);
    }
    game.draw.circle(cx, vy, th * 0.62, V.edge);
    game.draw.circle(cx, vy, th * 0.48, col);
    // 年輪の小口
    game.draw.circle(cx, vy, th * 0.22, V.hi, 0.6);
  }

  // 図面上の細線の曲がり(向きは正規化)
  function bpShape(beta, col, w) {
    var a = arms(beta, 0), L = 190, vy = BPY - 60;
    for (var k = 0; k < 2; k++) {
      game.draw.line(BPX, vy, BPX + Math.cos(a[k]) * L, vy + Math.sin(a[k]) * L, col + '40', w * 3);
      game.draw.line(BPX, vy, BPX + Math.cos(a[k]) * L, vy + Math.sin(a[k]) * L, col, w);
    }
  }

  function initGame() {
    pairIdx = 0; correct = 0; misses = 0; combo = 0; maxCombo = 0; score = 0; finalScore = 0; fastest = 0;
    timeLeft = TIME_LIMIT; readyT = 0.8; stopT = 0; stopKind = ''; fin = false; cleared = false; postT = 0;
    nodT = 0; shakeT = 0; flipT = 0; warnT = 0; playT = 0;
    newPair(0);
  }

  function newPair(k) {
    pairIdx = k;
    target = TARGETS[Math.floor(k / 3) % TARGETS.length];
    var diff = Math.max(5, 18 - k * 2.4);
    var near = target + game.random(-1.5, 1.5);
    var far = target + (game.random(0, 1) < 0.5 ? -1 : 1) * diff;
    if (far < 5) far = target + diff;
    var side = game.random(0, 1) < 0.5 ? 0 : 1;
    var tilt = k >= 2 ? 22 : 0;
    var mkI = function(b) { return { beta: b, phi: game.random(-tilt, tilt), len: k >= 4 ? game.random(175, 235) : 205 }; };
    items = side === 0 ? [mkI(near), mkI(far)] : [mkI(far), mkI(near)];
    good = side;
    phase = 'pick'; showT = 0; chosen = -1; okPick = false;
    pairMax = Math.max(1.5, 2.6 - k * 0.15); pairT = pairMax;
    if (k > 0 && k % 3 === 0) { flipT = 0.4; game.audio.play('se_jump', 0.3); }
  }

  // 見立て(本番もデモも同じ判定)。side=-1 は墨糸切れ
  function pick(side) {
    if (phase !== 'pick') return;
    phase = 'show'; showT = 0.55; chosen = side; okPick = side === good;
    var cx = side === 0 ? LX : RX;
    if (okPick) {
      correct++; combo++; if (combo > maxCombo) maxCombo = combo;
      var used = pairMax - pairT;
      if (!fastest || used < fastest) fastest = Math.round(used * 100) / 100;
      var fast = pairT / pairMax > 0.6;
      var pts = (100 + Math.round(pairT / pairMax * 100)) * Math.min(3, combo);
      score += pts; nodT = 0.6;
      game.feedback.good(cx, TY - 180, { text: fast ? 'PERFECT' : 'GOOD', color: V.ok, size: 60 });
      game.audio.play('se_coin', 0.35);
      game.fx.popup('+' + pts, cx, TY - 300, { color: V.gold, size: 44 });
      if (mode === S.PLAYING && correct === 3) { game.audio.play('se_milestone', 0.45); game.fx.popup('NICE', W / 2, H * 0.38, { color: V.gold, size: 84 }); }
      return;
    }
    combo = 0; misses++; shakeT = 0.7;
    if (mode === S.PLAYING && misses >= MISS_MAX) {
      stopT = 0.5; stopKind = 'miss';
      game.fx.flash('#ffffff', 0.15);
      game.audio.tone('C3', 0.3, { wave: 'sawtooth', volume: 0.1, slide: -60 });
      return;
    }
    game.feedback.bad(side < 0 ? W / 2 : cx, TY - 180, { text: 'MISS', color: V.ng, size: 58 });
  }

  function stepPair(dt) {
    if (flipT > 0) flipT -= dt;
    if (nodT > 0) nodT -= dt;
    if (shakeT > 0) shakeT -= dt;
    if (phase === 'pick') {
      pairT -= dt;
      if (pairT <= 0.5 && pairT + dt > 0.5) game.audio.tone('B5', 0.06, { wave: 'square', volume: 0.07 });
      if (pairT <= 0) { pairT = 0; pick(-1); }
    } else showT -= dt;
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = score + (win ? Math.ceil(timeLeft) * 40 : 0);
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 6; i++) game.fx.burst(140 + i * 160, H * 0.5 + (i % 2) * 150, { color: i % 2 ? V.gold : V.hi, count: 18, speed: 520 });
      game.fx.flash(V.gold, 0.22);
    }
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (fin || stopT > 0 || readyT > 0) return;
    if (phase === 'pick' && y > H * 0.36 && y < H * 0.86) { game.audio.play('se_tap', 0.25); pick(x < W / 2 ? 0 : 1); }
    else game.audio.tone('D3', 0.04, { wave: 'triangle', volume: 0.05 });
  });

  // ---- 描画 ----
  function hall() {
    game.draw.gradient(0, H, [[0, '#1a120c'], [0.3, STYLE.bg[0]], [0.65, '#20160f'], [1, STYLE.bg[1]]]);
    // 柱と梁(固定の1枚絵)
    for (var p = 0; p < 4; p++) {
      var px = 40 + p * 330;
      game.draw.rect(px, H * 0.1, 70, H * 0.62, '#3a281a');
      game.draw.rect(px + 10, H * 0.1, 12, H * 0.62, '#6a4a30', 0.6);
    }
    game.draw.rect(0, H * 0.1, W, 40, '#3a281a');
    // 床板の擬似奥行き
    for (var f = 0; f < 9; f++) { var fy = H * 0.72 + f * f * 6; game.draw.rect(0, fy, W, 3, '#000000', 0.35); }
    for (var g = 0; g < GRAIN.length; g++) game.draw.rect(GRAIN[g][0], GRAIN[g][1], 3, 3, g % 2 ? '#ffffff' : '#000000', 0.06);
    // 架台
    for (var s = 0; s < 2; s++) {
      var sx = s === 0 ? LX : RX;
      game.draw.rect(sx - 150, TY + 110, 300, 26, V.stone);
      game.draw.rect(sx - 130, TY + 136, 26, 120, V.stone);
      game.draw.rect(sx + 104, TY + 136, 26, 120, V.stone);
      game.draw.rect(sx - 150, TY + 110, 300, 6, '#8a7a6a');
    }
  }

  function drawBlueprint(t) {
    var sq = flipT > 0 ? Math.abs(flipT / 0.4 - 0.5) * 2 : 1;
    var w = 560 * sq;
    game.draw.rect(BPX - w / 2 - 10, BPY - 150, w + 20, 290, '#0a1428');
    game.draw.rect(BPX - w / 2, BPY - 140, w, 270, V.bp);
    if (sq < 0.6) return;
    for (var i = 1; i < 7; i++) game.draw.line(BPX - w / 2 + i * w / 7, BPY - 140, BPX - w / 2 + i * w / 7, BPY + 130, '#ffffff18', 2);
    for (var j = 1; j < 5; j++) game.draw.line(BPX - w / 2, BPY - 140 + j * 54, BPX + w / 2, BPY - 140 + j * 54, '#ffffff18', 2);
    if (phase === 'show' && !fin) {
      // 根拠: 2本を図面に重ねて見せる
      bpShape(items[1 - good].beta, V.ng, 6);
      bpShape(items[good].beta, V.ok, 10);
    }
    bpShape(target, V.line, 6);
    game.draw.circle(BPX, BPY - 60, 12, V.gold, 0.6 + Math.sin(t * 6) * 0.3);
  }

  function drawPair(t) {
    for (var s = 0; s < 2; s++) {
      var cx = s === 0 ? LX : RX, it = items[s];
      var col = V.wood, lift = 0, sc = 1;
      if (phase === 'show' || (stopT > 0 && stopKind === 'miss')) {
        if (s === good) { col = V.hi; lift = -20; }
        if (s === chosen && !okPick) { col = Math.floor(t * 16) % 2 === 0 ? '#ffffff' : V.ng; sc = stopT > 0 ? 1.25 : 1.08; }
      } else {
        lift = Math.sin(t * 3 + s * 1.6) * 6;
      }
      var jit = s === chosen && shakeT > 0 ? Math.sin(t * 60) * 8 : 0;
      game.draw.circle(cx, TY + 100, 130, '#000000', 0.25);
      drawTimber(cx + jit, TY + lift, it, sc, col, t);
      // 選べる合図: 白縁の明滅
      if (phase === 'pick' && !fin && stopT <= 0) game.draw.circle(cx, TY + 10 + lift, 30, '#ffffff', 0.25 + Math.sin(t * 8 + s * 3) * 0.2);
    }
    // 墨糸のタイマー(両端から縮む)
    if (phase === 'pick') {
      var r = pairT / pairMax, hw = 420 * r;
      game.draw.line(W / 2 - hw - 4, TY + 300, W / 2 + hw + 4, TY + 300, '#000000', 14);
      game.draw.line(W / 2 - hw, TY + 300, W / 2 + hw, TY + 300, r < 0.3 && Math.floor(t * 10) % 2 === 0 ? V.ng : V.line, 6);
      game.draw.circle(W / 2 - hw, TY + 300, 12, V.gold);
      game.draw.circle(W / 2 + hw, TY + 300, 12, V.gold);
    }
  }

  function drawDaiku(t) {
    var fr = shakeT > 0 || (fin && !cleared) ? DAIKU_NO : (nodT > 0 || (fin && cleared)) ? DAIKU_NOD : (Math.floor(t * 2) % 2 ? DAIKU_A : DAIKU_B);
    var hop = fin && cleared ? -Math.abs(Math.sin(t * 12)) * 26 : Math.sin(t * 2.4) * 3;
    var sway = shakeT > 0 ? Math.sin(t * 30) * 10 : 0;
    game.draw.circle(W / 2, H * 0.93, 90, '#000000', 0.35);
    game.draw.sprite(fr, DAIKU_PAL, W / 2 + sway, H * 0.87 + hop, 16, { anchor: 'center' });
  }

  function drawHud(t) {
    var low = timeLeft < 4 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(70, 30, W - 140, 26, '#0a0806');
    game.draw.rect(74, 34, (W - 148) * Math.max(0, timeLeft / TIME_LIMIT), 18, low ? V.ng : V.gold);
    out(correct + ' / ' + NEEDED, 150, 70, 40, V.hi);
    for (var m = 0; m < MISS_MAX; m++) game.draw.circle(W - 100 - m * 60, 92, 20, m < misses ? V.ng : V.dim);
    out('' + score, W - 300, 100, 34, V.gold);
  }

  function drawScene(t) {
    hall();
    drawBlueprint(t);
    drawPair(t);
    drawDaiku(t);
    for (var sl = 0; sl < H; sl += 8) game.draw.rect(0, sl, W, 2, '#000000', 0.12);
  }

  // ---- ATTRACT: 本物の newPair()/pick() で 1組目は近いほうを選び、2組目は遠いほうを選んで外す ----
  var demo = { t: 0, x: W / 2, y: H * 0.9, press: false, step: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; pairMax = 9; pairT = 9; demo.step = 0; }
    stepPair(dt);
    var tx = W / 2, ty = H * 0.88;
    demo.press = false;
    if (cyc < 1.3) { tx = good === 0 ? LX : RX; ty = TY + 40; demo.press = cyc > 1.1; }
    else if (demo.step === 0) { demo.step = 1; pick(good); }
    if (cyc >= 1.3 && cyc < 2.0) { tx = good === 0 ? LX : RX; ty = TY + 40; }
    if (cyc >= 2.0 && demo.step === 1) { demo.step = 2; newPair(1); pairMax = 9; pairT = 9; }
    if (cyc >= 2.0 && cyc < 3.3) { tx = good === 0 ? RX : LX; ty = TY + 40; demo.press = cyc > 3.1; }
    if (cyc >= 3.3 && demo.step === 2) { demo.step = 3; pick(1 - good); }
    if (cyc >= 3.3) { tx = chosen === 0 ? LX : RX; ty = TY + 40; }
    demo.x += (tx - demo.x) * Math.min(1, dt * 7);
    demo.y += (ty - demo.y) * Math.min(1, dt * 7);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 14 });
      out(GAME_TITLE, W / 2, H * 0.05 + Math.sin(t * 2) * 4, 80, V.gold);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.1, 36, V.hi);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.975, 46, V.gold);
      else out('TAP TO START', W / 2, H * 0.975, 40, V.hi);
      return;
    }

    if (mode === S.RESULT) {
      drawScene(t);
      game.draw.rect(90, H * 0.34, W - 180, 470, '#0a0806', 0.9);
      out(cleared ? 'CLEAR' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.39, 96, cleared ? V.ok : V.ng);
      out('SCORE ' + finalScore, W / 2, H * 0.45, 60, V.line);
      out(correct + ' / ' + NEEDED + (fastest ? '   ' + fastest + '秒' : ''), W / 2, H * 0.5, 42, V.hi);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.55, 56, V.gold);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.55, 42, V.gold);
      if (!cleared) out('あと' + (NEEDED - correct) + '本!', W / 2, H * 0.31, 60, V.ng);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.975, 40, V.hi);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { picked: correct, misses: misses, maxCombo: maxCombo, fastest: fastest };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) {
        if (stopKind === 'win') ending(true);
        else { game.feedback.bad(W / 2, TY - 200, { text: stopKind === 'time' ? 'TIME UP' : 'MISS', color: V.ng, size: 62 }); ending(false); }
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      timeLeft -= dt; playT += dt;
      stepPair(dt);
      if (phase === 'show' && showT <= 0 && stopT <= 0) {
        if (correct >= NEEDED) { stopT = 0.45; stopKind = 'win'; game.audio.play('se_powerup', 0.4); }
        else newPair(pairIdx + 1);
      }
      if (timeLeft < 4) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.06, { wave: 'square', volume: 0.07 }); }
      }
      if (timeLeft <= 0 && stopT <= 0) { timeLeft = 0; stopT = 0.45; stopKind = 'time'; phase = 'show'; chosen = -1; okPick = false; }
    }

    drawScene(t);
    if (stopT > 0 && stopKind === 'win') game.draw.circle(W / 2, TY, 120 + (0.45 - stopT) * 1500, V.gold, 0.3);
    // 開始直後のお手本: 図面と近いほうの木材を結ぶ
    if (!fin && readyT <= 0 && pairIdx === 0 && phase === 'pick' && playT < 1.2) {
      var gx = good === 0 ? LX : RX;
      game.draw.line(BPX, BPY + 130, gx, TY - 140, '#ffffff40', 6);
      game.draw.hand(gx, TY + 40, { press: false, scale: 11, alpha: 0.5 });
    }
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.44, 120, V.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['E4', 1], ['G4', 0.5], ['A4', 0.5], ['B4', 1], ['A4', 1],
      ['G4', 0.5], ['E4', 0.5], ['D4', 1], ['E4', 2],
      ['B4', 0.5], ['D5', 0.5], ['E5', 1], ['D5', 0.5], ['B4', 0.5], ['A4', 1], ['B4', 0.5], ['E4', 1.5],
    ], { tempo: 96, wave: 'triangle', volume: 0.06, loop: true, bass: [['E2', 4], ['A2', 4], ['D2', 4], ['E2', 4]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);

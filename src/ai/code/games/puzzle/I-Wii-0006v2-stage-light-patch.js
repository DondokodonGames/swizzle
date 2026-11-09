// I-Wii-0006v2-stage-light-patch.js
// 舞台灯の差し直し — もつれて垂れ下がった灯具の線を目でたどり、焦げが灯具に届く前に、その灯具の真下の差し込み口へ線の端を指で運んで結ぶ
// 操作: 中ほどに垂れた線の端(先が火花を散らしている)を指でつまみ、下の調光盤の差し込み口まで運んで離す。正しいのは線をたどった先の灯具と同じ番号(真下)の口。違う口に差すと火花が散って焦げが進み、端は元の位置に戻る。焦げは端から灯具へ這い上がり、届くと灯具が切れる
// 終わり: 3場面(灯具2→3→4台)を22秒以内に結び終え、予備の電球が残っていればCLEAR。灯具が切れるたびに予備を1つ失い、3つ失う/時間切れでGAME OVER
// @mechanic: connect
// @theme: theater_lighting_patch
// 世界観: 開演直前の劇場の照明室で、照明係が絡み合った灯具の線を目でたどり、焦げが灯具に届く前に一本ずつ調光盤の正しい口へ差し直して、舞台の役者たちに灯りを当てていく
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア(結んだ本数・結ぶ早さ・残った予備電球)
// スタイル: 90s LOW POLY

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s LOW POLY: 輪郭は line、面は横ストリップ塗り。頂点を毎フレーム微小に揺らし、奥はフォグ色で潰す
  var STYLE = { bg: ['#1a1830', '#2c2848', '#4a4468'], main: ['#ffd76a', '#6a5acd', '#b8b0d0'], accent: ['#ff5a3a', '#7ae0ff'] };
  var C = {
    night: STYLE.bg[0], fog: STYLE.bg[1], fogHi: STYLE.bg[2], beam: STYLE.main[0], curtain: STYLE.main[1], metal: STYLE.main[2],
    fire: STYLE.accent[0], spark: STYLE.accent[1], white: '#ffffff', ink: '#0c0a16', board: '#3a3646', boardHi: '#5a566a', cable: '#2a2630', good: '#8cff9a',
  };

  var GAME_TITLE = 'LIGHT PATCH';
  var TIME_LIMIT = 22;
  var ROUND_SIZES = [2, 3, 4];
  var NEEDED = 9;                         // 3場面で結ぶ線の合計
  var SPARES = 3;
  var LAMP_Y = Math.round(H * 0.17);
  var STAGE_Y = Math.round(H * 0.36);
  var END_Y0 = Math.round(H * 0.58), END_Y1 = Math.round(H * 0.68);
  var SOCK_Y = Math.round(H * 0.8);
  var GRAB_R = 110, SOCK_R = 115;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var round, cables, held, blowT, blowIdx, roundGap, spares, connected, jitterT;
  var score, countIn, over, won, endT, prevBest, playT, fastest;

  function label(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  // 役者たち(暗がり/灯りが当たってポーズ)と照明係
  var ACTOR = [
    ['..hhhh..', '..hssh..', '..seds..', '...ss...', '.cccccc.', 'c.cccc.c', '..cccc..', '..cccc..', '..c..c..', '..c..c..', '.bb..bb.'],
    ['c.hhhh.c', 'c.hssh.c', 'c.seds.c', '.c.ss.c.', '..cccc..', '..cccc..', '..cccc..', '..cccc..', '..c..c..', '.c....c.', 'bb....bb'],
  ];
  var TECH = [
    ['..kkkk..', '.kkkkkk.', 'pkssssk.', 'p.seses.', 'p..sms..', '.gggggg.', 'gggggggg', 'gg.gg.gg'],
    ['..kkkk..', '.kkkkkk.', 'pkssssk.', 'p.sOsOs.', 'p..sos..', 'sgggggg.', 'gggggggs', 'gg.gg.gg'],
  ];
  var TECH_PAL = { k: '#2a2030', p: '#6a5acd', s: '#f0c8a0', e: '#1a1020', m: '#c05040', O: '#ffffff', o: '#1a1020', g: '#3a6a8a' };
  var COSTUMES = ['#e8506a', '#50a8e8', '#e8c050', '#60d090'];

  function cubic(a, b, c, d, t) {
    var u = 1 - t;
    return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
  }
  function lampX(i, n) { return Math.round(W * (i + 1) / (n + 1)); }

  function cablePoint(cb, t) {
    var ex = cb.held ? cb.hx : cb.ex, ey = cb.held ? cb.hy : cb.ey;
    if (cb.done) { ex = cb.lx; ey = SOCK_Y; }
    return {
      x: cubic(cb.lx, cb.c1x, cb.c2x, ex, t),
      y: cubic(LAMP_Y + 60, cb.c1y, cb.c2y, ey, t),
    };
  }

  function buildRound(r) {
    var n = ROUND_SIZES[r];
    // 端の並びは必ずどれかが入れ替わる(線がもつれる)
    var perm = [];
    for (var i = 0; i < n; i++) perm.push(i);
    do {
      for (var j = n - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var tmp = perm[j]; perm[j] = perm[k]; perm[k] = tmp; }
    } while (perm.some(function(v, idx) { return v === idx; }) && n > 1 && Math.random() < 0.85);
    if (n === 2) perm = [1, 0];
    var base = r === 0 ? 6.4 : (r === 1 ? 6.6 : 7.2);
    cables = [];
    for (var c = 0; c < n; c++) {
      var lx = lampX(c, n);
      var ex = lampX(perm[c], n) + game.random(-36, 36);
      cables.push({
        idx: c, lx: lx, ex: ex, ey: game.random(END_Y0, END_Y1),
        c1x: lx + game.random(-220, 220), c1y: STAGE_Y + 260, c2x: ex + game.random(-260, 260), c2y: END_Y0 - 220,
        b: 0, dur: base * (1 + 0.14 * c), done: false, blown: false, held: false, hx: 0, hy: 0, warnT: 0, doneT: 0,
      });
    }
    held = null;
  }

  function resetRun() {
    round = 0; spares = SPARES; connected = 0; blowT = 0; blowIdx = -1; roundGap = 0; jitterT = 0;
    buildRound(0);
  }

  function initGame() {
    resetRun();
    score = 0; countIn = 0.8; over = false; won = false; endT = 0; prevBest = game.best; playT = 0; fastest = 0;
  }

  // ── 結線ロジック(本番・デモ共通) ──
  function grabAt(x, y) {
    if (blowT > 0 || roundGap > 0) return false;
    var best = null, bd = GRAB_R;
    for (var i = 0; i < cables.length; i++) {
      var cb = cables[i];
      if (cb.done || cb.blown) continue;
      var d = Math.hypot(cb.ex - x, cb.ey - y);
      if (d < bd) { bd = d; best = cb; }
    }
    if (!best) return false;
    held = best; best.held = true; best.hx = x; best.hy = y; best.trail = 0;
    return true;
  }
  function grabFeedback(ok, x, y) {
    if (ok) { game.audio.play('se_tap', 0.14); game.fx.burst(x, y, { color: C.spark, count: 5, speed: 160 }); }
    else { game.audio.play('se_tap', 0.05); game.fx.burst(x, y, { color: C.metal, count: 4, speed: 120 }); }
  }

  // 端を運ぶ: 焦げた端から一定距離ごとに火の粉がこぼれる
  function moveHeld(x, y) {
    if (!held) return false;
    held.trail += Math.hypot(x - held.hx, y - held.hy);
    held.hx = x; held.hy = y;
    if (held.trail > 70) { held.trail = 0; return true; }
    return false;
  }

  function releaseAt(x, y) {
    if (!held) return 'none';
    var cb = held;
    cb.held = false; held = null;
    var n = cables.length, sock = -1;
    for (var i = 0; i < n; i++) if (Math.hypot(lampX(i, n) - x, SOCK_Y - y) < SOCK_R) sock = i;
    if (sock < 0) return 'back';
    if (sock === cb.idx) {
      cb.done = true; cb.doneT = 0.6; connected++;
      var pts = Math.round(100 + 200 * (1 - cb.b));
      var res = cb.b < 0.35 ? 'PERFECT' : 'GOOD';
      if (state === S.PLAYING) { score += pts; if (cb.b < 0.35) fastest++; }
      game.feedback.good(cb.lx, SOCK_Y - 120, { text: res + ' +' + pts, color: C.beam, size: 48, count: 14 });
      game.audio.tone(392 + connected * 60, 0.12, { wave: 'square', volume: 0.08 });
      game.fx.burst(cb.lx, STAGE_Y, { color: C.beam, count: 10, speed: 260 });
      return 'ok';
    } else {
      cb.b = Math.min(0.97, cb.b + 0.16);
      game.feedback.bad(lampX(sock, n), SOCK_Y - 80, { text: 'MISS' });
      game.fx.burst(lampX(sock, n), SOCK_Y, { color: C.spark, count: 16, speed: 360 });
      return 'wrong';
    }
  }
  function springBack() { game.audio.tone(220, 0.06, { wave: 'triangle', volume: 0.08, slide: -60 }); }

  function stepCables(dt) {
    jitterT += dt;
    if (blowT > 0) {
      // hit-stop: 切れた灯具を白く光らせて止める
      blowT -= dt;
      if (blowT <= 0) {
        var cb = cables[blowIdx];
        game.feedback.bad(cb.lx, LAMP_Y + 40, { text: 'MISS' });
        spares--;
        blowIdx = -1;
        if (state === S.PLAYING && spares <= 0) { over = true; won = false; finish(); }
      }
      return;
    }
    if (roundGap > 0) {
      roundGap -= dt;
      if (roundGap <= 0) {
        round++;
        if (round >= ROUND_SIZES.length) {
          if (state === S.PLAYING) { over = true; won = spares > 0; finish(); }
          else round = 0;
          if (state !== S.PLAYING) buildRound(0);
        } else buildRound(round);
      }
      return;
    }
    var open = 0;
    for (var i = 0; i < cables.length; i++) {
      var c = cables[i];
      if (c.doneT > 0) c.doneT -= dt;
      if (c.done || c.blown) continue;
      open++;
      c.b += dt / c.dur;
      if (c.b > 0.8) {
        c.warnT -= dt;
        if (c.warnT <= 0) { c.warnT = 0.2; game.audio.tone(1320, 0.04, { wave: 'square', volume: 0.06 }); }
      }
      if (c.b >= 1) {
        c.b = 1; c.blown = true;
        if (c.held) { c.held = false; held = null; }
        blowT = 0.45; blowIdx = i; open--;
        game.audio.play('se_break', 0.5);
        return;
      }
    }
    if (open === 0) {
      roundGap = 0.7;
      if (state === S.PLAYING && round < ROUND_SIZES.length - 1) {
        game.audio.play('se_milestone', 0.45);
        game.fx.popup((round + 1) + '/3', W / 2, STAGE_Y - 40, { color: C.beam, size: 80 });
      }
    }
  }

  // ── 低ポリ描画 ──
  function tri(ax, ay, bx, by, cx, cy, col, alpha) {
    var p = [[ax, ay], [bx, by], [cx, cy]].sort(function(a, b) { return a[1] - b[1]; });
    var y0 = p[0][1], y2 = p[2][1];
    if (y2 - y0 < 1) return;
    for (var y = y0; y < y2; y += 4) {
      var xa = p[0][0] + (p[2][0] - p[0][0]) * (y - y0) / (y2 - y0);
      var xb = y < p[1][1]
        ? p[0][0] + (p[1][0] - p[0][0]) * (y - y0) / Math.max(1, p[1][1] - y0)
        : p[1][0] + (p[2][0] - p[1][0]) * (y - p[1][1]) / Math.max(1, y2 - p[1][1]);
      game.draw.rect(Math.min(xa, xb), y, Math.abs(xb - xa) + 1, 4, col, alpha);
    }
  }
  function jit(i) { return Math.sin(jitterT * 23 + i * 7.1) * 1.5; }

  function drawHouse() {
    game.draw.gradient(0, H, [[0, C.night], [0.4, C.fog], [0.75, '#221e36'], [1, C.night]]);
    // 幕(台形の面)
    tri(0, 230, 140, 230, 0, STAGE_Y + 120, C.curtain, 0.9);
    tri(W, 230, W - 140, 230, W, STAGE_Y + 120, C.curtain, 0.9);
    // 舞台(奥にすぼまる台形)+フォグ
    tri(120, STAGE_Y + 140, W - 120, STAGE_Y + 140, 220, STAGE_Y - 20, '#5a4a3a', 1);
    tri(W - 120, STAGE_Y + 140, W - 220, STAGE_Y - 20, 220, STAGE_Y - 20, '#4a3c30', 1);
    game.draw.rect(0, STAGE_Y - 60, W, 40, C.fogHi, 0.25);
    // 吊りバトン
    game.draw.line(40, LAMP_Y - 30, W - 40, LAMP_Y - 30, C.metal, 6);
  }

  function drawLamp(cb, n) {
    var x = cb.lx, y = LAMP_Y;
    var lit = cb.done;
    var warn = !cb.done && !cb.blown && cb.b > 0.8 && Math.floor(game.time.elapsed * 10) % 2 === 0;
    var flash = blowT > 0 && cables[blowIdx] === cb;
    var s = flash ? 1.5 : 1;
    // 面: 上の暗い面と下の明るい面(三角2枚ずつ)
    tri(x - 46 * s + jit(1), y - 30 * s, x + 46 * s + jit(2), y - 30 * s, x - 34 * s, y + 40 * s + jit(3), cb.blown ? '#3a3640' : '#5a5670', 1);
    tri(x + 46 * s + jit(2), y - 30 * s, x + 34 * s, y + 40 * s + jit(4), x - 34 * s, y + 40 * s + jit(3), cb.blown ? '#2a2630' : '#7a7690', 1);
    game.draw.line(x - 46 * s, y - 30 * s, x + 46 * s, y - 30 * s, C.ink, 3);
    var lens = flash ? C.white : (lit ? C.beam : (warn ? C.fire : (cb.blown ? '#1a1820' : '#4a4458')));
    game.draw.circle(x, y + 42 * s, 26 * s, lens);
    if (lit || flash) game.draw.circle(x, y + 42, 50 * s, flash ? C.white : C.beam, 0.3);
    label(String(cb.idx + 1), x, y + 4, 34, cb.blown ? '#6a6680' : C.white);
    if (cb.blown && !flash) { game.draw.line(x - 30, y - 20, x + 30, y + 30, C.fire, 5); game.draw.line(x + 30, y - 20, x - 30, y + 30, C.fire, 5); }
  }

  function drawBeamAndActor(cb, n) {
    var x = cb.lx, t = game.time.elapsed;
    var lit = cb.done;
    if (lit) {
      var w = 120 + (cb.doneT > 0 ? cb.doneT * 80 : 0);
      tri(x - 22, LAMP_Y + 60, x + 22, LAMP_Y + 60, x - w, STAGE_Y + 90, C.beam, 0.22);
      tri(x + 22, LAMP_Y + 60, x + w, STAGE_Y + 90, x - w, STAGE_Y + 90, C.beam, 0.22);
    }
    var fr = lit ? ACTOR[Math.floor(t * 3) % 2] : ACTOR[0];
    var pal = { h: '#2a2030', s: lit ? '#f0c8a0' : '#3a3448', e: lit ? '#1a1020' : '#3a3448', d: lit ? '#c05040' : '#3a3448', c: lit ? COSTUMES[cb.idx % 4] : '#2e2a40', b: '#1a1020' };
    game.draw.circle(x, STAGE_Y + 70, 40, C.ink, 0.3);
    game.draw.sprite(fr, pal, x, STAGE_Y + 10 + (lit ? -Math.abs(Math.sin(t * 5)) * 8 : 0), 9, { anchor: 'center' });
  }

  function drawCable(cb) {
    var N = 22, burnFrom = 1 - cb.b;
    var prev = cablePoint(cb, 0);
    for (var k = 1; k <= N; k++) {
      var t = k / N;
      var p = cablePoint(cb, t);
      var burnt = !cb.done && t > burnFrom;
      var col = cb.done ? C.beam : (cb.blown ? '#3a3440' : (burnt ? '#5a2014' : C.cable));
      game.draw.line(prev.x, prev.y, p.x, p.y, C.ink, cb.held ? 18 : 14);
      game.draw.line(prev.x, prev.y, p.x, p.y, col, cb.held ? 11 : 8);
      prev = p;
    }
    if (cb.done || cb.blown) return;
    // 焦げの先端(火花)
    var sp = cablePoint(cb, burnFrom);
    var fl = 14 + Math.sin(game.time.elapsed * 30) * 5;
    game.draw.circle(sp.x, sp.y, fl + 10, C.fire, 0.35);
    game.draw.circle(sp.x, sp.y, fl * 0.6, C.beam);
    // 線の端(プラグ): 押せる物は明滅+白縁
    var end = cablePoint(cb, 1);
    var pulse = 0.5 + 0.5 * Math.sin(game.time.elapsed * 8 + cb.idx);
    game.draw.circle(end.x, end.y, 34 + pulse * 6, C.white, 0.35 + pulse * 0.3);
    game.draw.circle(end.x, end.y, 26, C.metal);
    game.draw.rect(end.x - 6, end.y + 18, 4, 18, C.metal);
    game.draw.rect(end.x + 2, end.y + 18, 4, 18, C.metal);
  }

  function drawBoard() {
    var n = cables.length;
    game.draw.rect(30, SOCK_Y - 90, W - 60, 230, C.board);
    game.draw.rect(30, SOCK_Y - 90, W - 60, 12, C.boardHi);
    for (var i = 0; i < n; i++) {
      var x = lampX(i, n);
      var cb = cables[i];
      var on = cb.done;
      var tgt = held && Math.hypot(held.hx - x, held.hy - SOCK_Y) < SOCK_R;
      game.draw.circle(x, SOCK_Y, 52, tgt ? C.spark : C.ink, tgt ? 0.6 : 1);
      game.draw.circle(x, SOCK_Y, 38, on ? C.beam : '#22202a');
      game.draw.rect(x - 14, SOCK_Y - 8, 8, 20, C.ink);
      game.draw.rect(x + 6, SOCK_Y - 8, 8, 20, C.ink);
      label(String(i + 1), x, SOCK_Y + 100, 40, on ? C.beam : C.metal);
      // フェーダー
      game.draw.rect(x + 70, SOCK_Y - 60, 10, 120, C.ink);
      game.draw.rect(x + 60, SOCK_Y + (on ? -60 : 40), 30, 20, on ? C.beam : C.metal);
    }
  }

  function drawTech() {
    var t = game.time.elapsed;
    var panic = blowT > 0 || (over && !won);
    var fr = panic ? TECH[1] : TECH[0];
    var hop = panic ? Math.sin(t * 40) * 4 : Math.sin(t * (connected > 0 ? 6 : 3)) * 3;
    game.draw.sprite(fr, TECH_PAL, 110, Math.round(H * 0.9) + hop, 12, { anchor: 'center' });
  }

  function drawWorld() {
    drawHouse();
    var n = cables.length, i;
    for (i = 0; i < n; i++) drawBeamAndActor(cables[i], n);
    for (i = 0; i < n; i++) drawLamp(cables[i], n);
    drawBoard();
    for (i = 0; i < n; i++) if (!cables[i].held) drawCable(cables[i]);
    if (held) drawCable(held);
    drawTech();
  }

  function hud() {
    label(String(score), 190, 110, 64, C.white);
    label(connected + ' / ' + NEEDED, W / 2, 110, 48, C.beam);
    for (var i = 0; i < SPARES; i++) {
      var x = W - 220 + i * 70;
      game.draw.circle(x, 100, 24, i < spares ? C.beam : '#3a3448');
      game.draw.rect(x - 10, 122, 20, 16, C.metal, i < spares ? 1 : 0.4);
    }
    var timeBar = Math.max(0, 1 - playT / TIME_LIMIT);
    game.draw.rect(60, 170, W - 120, 14, C.ink, 0.6);
    game.draw.rect(60, 170, (W - 120) * timeBar, 14, timeBar < 0.25 ? C.fire : C.spark);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || countIn > 0) return;
    if (grabAt(x, y)) { game.audio.play('se_tap', 0.14); game.fx.burst(x, y, { color: C.spark, count: 5, speed: 160 }); }
    else { game.audio.play('se_tap', 0.05); game.fx.burst(x, y, { color: C.metal, count: 4, speed: 120 }); }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || over) return;
    if (moveHeld(x, y)) game.fx.burst(x, y, { color: C.fire, count: 3, speed: 90 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || over) return;
    if (releaseAt(x, y) === 'back') game.audio.tone(220, 0.06, { wave: 'triangle', volume: 0.08, slide: -60 });
  });

  // ── ATTRACT: 実ロジックで、もつれた線の端を一度違う口に差して火花→たどり直して正しい口へ→もう1本も結ぶ ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.9, press: false, step: 0, wait: 0 };
  function demoPlan() {
    // [線の番号, 差す口(-1=正解)]
    return [[0, 1], [0, -1], [1, -1]];
  }
  function demoStep(dt) {
    demo.t += dt;
    if (demo.t <= dt) { resetRun(); demo.step = 0; demo.phase = 'reach'; demo.wait = 0.4; }
    stepCables(dt);
    var plan = demoPlan();
    if (demo.wait > 0) { demo.wait -= dt; return; }
    if (demo.step >= plan.length) {
      if (roundGap <= 0 && blowT <= 0) { demo.wait = 0.9; demo.t = 0; }
      return;
    }
    var cb = cables[plan[demo.step][0]];
    if (!cb || cb.done || cb.blown) { demo.step++; return; }
    var sock = plan[demo.step][1] < 0 ? cb.idx : plan[demo.step][1];
    var sx = lampX(sock, cables.length), sy = SOCK_Y;
    if (demo.phase === 'reach') {
      demo.press = false;
      demo.gx += (cb.ex - demo.gx) * Math.min(1, dt * 7); demo.gy += (cb.ey - demo.gy) * Math.min(1, dt * 7);
      if (Math.hypot(cb.ex - demo.gx, cb.ey - demo.gy) < 14) { grabFeedback(grabAt(demo.gx, demo.gy), demo.gx, demo.gy); demo.phase = 'carry'; }
    } else if (demo.phase === 'carry') {
      demo.press = true;
      demo.gx += (sx - demo.gx) * Math.min(1, dt * 4); demo.gy += (sy - demo.gy) * Math.min(1, dt * 4);
      if (moveHeld(demo.gx, demo.gy)) game.fx.burst(demo.gx, demo.gy, { color: C.fire, count: 3, speed: 90 });
      if (Math.hypot(sx - demo.gx, sy - demo.gy) < 12) { if (releaseAt(demo.gx, demo.gy) === 'back') springBack(); demo.press = false; demo.phase = 'reach'; demo.step++; demo.wait = 0.35; }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!cables) initGame();
      demoStep(dt);
      drawWorld();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      label(GAME_TITLE, W / 2, 100, 90, C.beam);
      label('HI-SCORE ' + game.best, W / 2, 170, 38, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, 1880, 44, C.beam);
      else label('TAP TO START', W / 2, 1880, 42, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawWorld();
      game.draw.rect(0, 380, W, 360, C.ink, 0.6);
      label(won ? 'CLEAR' : (playT >= TIME_LIMIT ? 'TIME UP' : 'GAME OVER'), W / 2, 470, 100, won ? C.beam : C.fire);
      label('SCORE ' + score, W / 2, 550, 58, C.white);
      label(connected + ' / ' + NEEDED + '  PERFECT ' + fastest, W / 2, 610, 40, C.spark);
      if (score > prevBest && prevBest > 0) label('NEW RECORD', W / 2, 690, 52, C.beam);
      else label('BEST ' + Math.max(prevBest, score), W / 2, 690, 42, C.white);
      if (!won) label('あと' + Math.max(1, NEEDED - connected) + '本!', W / 2, 1060, 64, C.fire);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, 1880, 40, C.white);
      return;
    }

    // ── PLAYING ──
    if (endT > 0) {
      endT -= dt;
      if (endT <= 0) {
        state = S.RESULT;
        var stats = { connected: connected, perfect: fastest, spares: spares };
        if (won) game.end.success(score + spares * 150, stats);
        else game.end.failure(stats);
      }
    } else if (countIn > 0) {
      countIn -= dt;
      if (countIn <= 0) game.audio.play('se_tap', 0.3);
    } else if (!over) {
      playT += dt;
      stepCables(dt);
      if (!over && playT >= TIME_LIMIT && blowT <= 0) {
        over = true; won = false;
        game.feedback.bad(W / 2, 175, { text: 'TIME UP' });
        finish();
      }
    }

    drawWorld();
    hud();
    if (countIn > 0) label(countIn > 0.35 ? 'READY?' : 'GO!', W / 2, Math.round(H * 0.5), 120, C.beam);
  });

  function finish() {
    if (endT > 0) return;
    endT = 1.4;
    if (held) { held.held = false; held = null; }
    game.audio.stopBgm();
    if (won) {
      score += spares * 150;
      game.audio.play('se_success', 0.55);
      game.audio.play('se_powerup', 0.3);
      for (var i = 0; i < 7; i++) game.fx.burst(game.random(140, 940), game.random(300, 900), { color: i % 2 ? C.beam : C.spark, count: 22, speed: 460 });
    } else game.audio.play('se_failure', 0.55);
  }

  // 開演前の序曲(オリジナル)
  var TUNE = [
    ['D4', 0.5], ['F4', 0.5], ['A4', 0.5], ['D5', 0.5], ['C5', 1], ['A4', 1],
    ['Bb4', 0.5], ['A4', 0.5], ['G4', 0.5], ['F4', 0.5], ['E4', 1], ['A3', 1],
  ];
  var TUNE_OPTS = { tempo: 116, wave: 'square', volume: 0.045, loop: true, bass: [['D2', 2], ['Bb2', 2], ['G2', 2], ['A2', 2]] };

  game.onStart(function() {
    game.audio.melody(TUNE, TUNE_OPTS);
    state = S.ATTRACT;
    initGame();
  });
})(game);

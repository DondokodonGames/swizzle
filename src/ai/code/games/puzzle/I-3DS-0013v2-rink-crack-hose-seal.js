// I-3DS-0013v2-rink-crack-hose-seal.js
// ひびふさぎ — 冬のスケート場で、両端が伸び続ける氷のひびを端から端へなぞってつなぎ、水を流して凍らせ塞いでいく
// 操作: 光るひびの端に指を置き、ひびに沿ってなぞって反対の端で離すと、ホースの水が流れてひびが凍って塞がる。ひびから指が大きく外れると水がこぼれてやり直し。ひびの両端は少しずつ伸び、端がフェンスに近づくと赤く点滅し、届くとそのひびは割れ抜けて閉鎖のコーンが立つ
// 終わり: ひびを7本塞げばCLEAR(短く塞ぐほど高得点)。3本割れ抜ける/22秒の時間切れでGAME OVER
// @mechanic: connect
// @theme: rink_crack_hose_seal
// 世界観: 冬の屋外スケート場で、整氷係が営業中のリンクに次々走るひびを見つけては、伸びた両端をホースでなぞり結んで水を流し込み、フェンスまで割れが届く前に凍らせて塞いでいく
// 残るもの: 正誤(CLEAR/GAME OVER) + 塞いだ本数・割れ抜けた本数・得点
// スタイル: HYPERCASUAL 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 白〜淡色の背景に単色の丸い塊。真下に柔らかい影。当たり判定は見た目どおり
  var STYLE = { bg: ['#eef4f8', '#d8eef8', '#bcd8ea'], main: ['#ff8a3a', '#3a6a9a', '#ffffff'], accent: ['#ff4a5a', '#3ad0c0'] };
  var C = {
    bg: STYLE.bg[0], ice: STYLE.bg[1], rim: STYLE.bg[2], keeper: STYLE.main[0], crack: STYLE.main[1], white: STYLE.main[2],
    red: STYLE.accent[0], teal: STYLE.accent[1], ink: '#2a3440', gold: '#ffc23a', ok: '#3ac070',
  };

  var GAME_TITLE = 'CRACK SEAL';
  var TIME_LIMIT = 22;
  var NEED = 7, LIVES = 3;
  var RX0 = 70, RX1 = 1010, RY0 = 300, RY1 = 1400;
  var SEG = 38, END_R = 80, OFF_R = 100;
  // ひびの出る時刻・中心・向き・伸びる速さ(px/秒)
  var SCHED = [
    [0.3, 540, 820, 0.3, 36], [2.4, 330, 600, 1.2, 42], [4.3, 760, 1120, -0.4, 48],
    [6.2, 380, 1160, 0.9, 54], [7.8, 720, 560, 2.0, 60], [9.3, 540, 900, -1.0, 66],
    [10.8, 290, 880, 0.1, 72], [12.2, 790, 820, 1.5, 78], [13.6, 540, 640, 0.6, 84],
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var cracks, nextK, clock, sealed, broke, lives, score, readyT, over, won, outroT, stopT, playT, focus, timeUp, drag, spills, mood;

  function initGame() {
    cracks = []; nextK = 0; clock = 0; sealed = 0; broke = 0; lives = LIVES; score = 0; readyT = 0.8; over = false; won = false;
    outroT = 0; stopT = 0; playT = 0; focus = null; timeUp = false; drag = null; spills = []; mood = 0;
  }

  function spawn(e) {
    var a = e[3];
    var mk = function(ang, sgn) { return { pts: [{ x: e[1], y: e[2] }, { x: e[1] + Math.cos(ang) * 60, y: e[2] + Math.sin(ang) * 60 }], ang: ang, zig: sgn, acc: 60, warn: false }; };
    cracks.push({ s: 'open', A: mk(a, 1), B: mk(a + Math.PI, -1), v: e[4], t: 0, fill: 0 });
    game.audio.tone(900, 0.06, { wave: 'square', volume: 0.05, slide: -500 });
    game.audio.tone(600, 0.08, { wave: 'square', volume: 0.04, slide: -300 });
  }
  function endPt(side) { return side.pts[side.pts.length - 1]; }
  function poly(c) {
    var out = [];
    for (var i = c.A.pts.length - 1; i >= 0; i--) out.push(c.A.pts[i]);
    for (var j = 1; j < c.B.pts.length; j++) out.push(c.B.pts[j]);
    return out;
  }
  function polyLen(p) { var L = 0; for (var i = 1; i < p.length; i++) L += Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y); return L; }

  // 点から折れ線への距離と、端(先頭)からの長さ
  function project(p, x, y) {
    var best = 1e9, at = 0, acc = 0;
    for (var i = 1; i < p.length; i++) {
      var ax = p[i - 1].x, ay = p[i - 1].y, vx = p[i].x - ax, vy = p[i].y - ay;
      var l2 = vx * vx + vy * vy, sl = Math.sqrt(l2);
      var k = l2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / l2)) : 0;
      var d = Math.hypot(x - (ax + vx * k), y - (ay + vy * k));
      if (d < best) { best = d; at = acc + k * sl; }
      acc += sl;
    }
    return { d: best, at: at, len: acc };
  }

  function growEnd(side, v, dt) {
    var e = endPt(side);
    var step = v * dt;
    e.x += Math.cos(side.ang) * step; e.y += Math.sin(side.ang) * step;
    side.acc += step;
    if (side.acc >= SEG) {
      side.acc = 0; side.zig = -side.zig;
      side.ang += side.zig * 0.55;
      side.pts.push({ x: e.x, y: e.y });
    }
    var near = e.x < RX0 + 120 || e.x > RX1 - 120 || e.y < RY0 + 120 || e.y > RY1 - 120;
    if (near && !side.warn) { side.warn = true; game.audio.tone(1200, 0.05, { wave: 'square', volume: 0.05 }); }
    return e.x < RX0 + 10 || e.x > RX1 - 10 || e.y < RY0 + 10 || e.y > RY1 - 10;
  }

  // ひびの伸び(本番もデモも同じ)。割れ抜けたひびを返す
  function stepCracks(dt, sched) {
    clock += dt;
    while (nextK < sched.length && clock >= sched[nextK][0]) { spawn(sched[nextK]); nextK++; }
    for (var i = 0; i < cracks.length; i++) {
      var c = cracks[i];
      c.t += dt;
      if (c.s !== 'open') continue;
      if (drag && drag.c === c) continue; // なぞっている間は水が先を押さえる
      var hitA = growEnd(c.A, c.v, dt), hitB = growEnd(c.B, c.v, dt);
      if (hitA || hitB) { c.s = 'broke'; c.t = 0; return { c: c, p: endPt(hitA ? c.A : c.B) }; }
    }
    return null;
  }

  function beginDrag(x, y) {
    var best = null, bd = END_R;
    for (var i = 0; i < cracks.length; i++) {
      var c = cracks[i];
      if (c.s !== 'open') continue;
      var a = endPt(c.A), b = endPt(c.B);
      var da = Math.hypot(x - a.x, y - a.y), db = Math.hypot(x - b.x, y - b.y);
      if (da < bd) { bd = da; best = { c: c, from: 'A' }; }
      if (db < bd) { bd = db; best = { c: c, from: 'B' }; }
    }
    if (!best) return false;
    drag = { c: best.c, from: best.from, x: x, y: y, far: 0 };
    game.audio.tone(520, 0.06, { wave: 'triangle', volume: 0.06 });
    return true;
  }

  function moveDrag(x, y, demo) {
    if (!drag) return;
    var p = poly(drag.c);
    var r = project(p, x, y);
    drag.x = x; drag.y = y;
    if (r.d > OFF_R) { spill(x, y, demo); return; }
    var from = drag.from === 'A' ? r.at : r.len - r.at;
    if (from > drag.far) { drag.far = from; drag.c.fill = from / Math.max(1, r.len); }
  }

  function endDrag(x, y, demo) {
    if (!drag) return;
    var c = drag.c;
    var other = endPt(drag.from === 'A' ? c.B : c.A);
    var p = poly(c), L = polyLen(p);
    if (Math.hypot(x - other.x, y - other.y) <= END_R && drag.far >= L * 0.6) {
      c.s = 'seal'; c.t = 0; c.fill = 1;
      var mid = p[Math.floor(p.length / 2)];
      mood = 1;
      if (!demo) {
        sealed++;
        score += 100 + Math.max(0, Math.round(600 - L) / 2);
        if (sealed % 3 === 0 && sealed < NEED) { game.audio.play('se_milestone', 0.45); game.fx.popup(sealed + ' / ' + NEED, 540, 380, { color: C.teal, size: 64 }); }
      }
      game.feedback.good(mid.x, mid.y, { text: L < 360 ? 'PERFECT' : 'GOOD', color: C.teal, size: 56 });
      game.audio.play('se_powerup', 0.25);
      drag = null;
      if (!demo && sealed >= NEED) finish(true);
    } else {
      spill(x, y, demo);
    }
  }

  function spill(x, y, demo) {
    if (drag) drag.c.fill = 0;
    drag = null; mood = -0.6;
    spills.push({ x: x, y: y, t: 0 });
    game.feedback.bad(x, y, { text: 'MISS', shake: demo ? 3 : 6 });
  }

  function onBroke(b, demo) {
    focus = { x: b.p.x, y: b.p.y }; stopT = 0.45; mood = -1;
    if (drag && drag.c === b.c) drag = null;
    game.feedback.bad(b.p.x, b.p.y, { text: 'MISS', shake: demo ? 6 : 12 });
    game.audio.play('se_break', 0.4);
    if (!demo) {
      broke++; lives--;
      if (lives <= 0) finish(false);
    }
  }

  function finish(ok) {
    over = true; won = ok; outroT = 1.5;
    game.audio.stopBgm();
    if (ok) {
      score += lives * 100 + Math.max(0, Math.round((TIME_LIMIT - playT) * 15));
      mood = 2;
      game.audio.play('se_success', 0.55);
      game.fx.burst(540, 850, { color: C.teal, count: 30, speed: 460 });
      game.fx.burst(540, 850, { color: C.gold, count: 20, speed: 360 });
      game.fx.flash('#ffffff', 0.2);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    if (over || readyT > 0 || stopT > 0 || y < 230) {
      game.audio.tone(200, 0.03, { wave: 'triangle', volume: 0.03 });
      return;
    }
    if (!beginDrag(x, y)) {
      game.audio.tone(260, 0.04, { wave: 'triangle', volume: 0.03 });
      game.fx.burst(x, y, { color: C.rim, count: 3, speed: 90 });
    }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !drag || over) return;
    if (Math.random() < 0.2) game.audio.tone(700 + drag.far, 0.02, { wave: 'sine', volume: 0.02 });
    moveDrag(x, y, false);
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !drag || over) return;
    game.audio.tone(440, 0.03, { wave: 'triangle', volume: 0.03 });
    endDrag(x, y, false);
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#00000040', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }
  function shadow(x, y, r) { game.draw.circle(x, y, r, '#5a7a90', 0.16); }

  var KEEPER_A = ['..cccc..', '.cccccc.', '.oooooo.', 'oowoowoo', 'oooooooo', 'oooooooo', '.oooooo.', '..o..o..'];
  var KEEPER_B = ['..cccc..', '.cccccc.', '.oooooo.', 'oowoowoo', 'oooooooo', 'oooaaooo', '.oooooo.', '.o....o.'];
  var CONE = ['...r...', '..rrr..', '..www..', '.rrrrr.', '.wwwww.', 'rrrrrrr'];

  function drawRink() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, '#f8fbfd'], [1, C.bg]]);
    // 柔らかい影→フェンス→氷面
    game.draw.rect(RX0 - 10, RY0 + 24, RX1 - RX0 + 20, RY1 - RY0 + 10, '#5a7a90', 0.12);
    game.draw.rect(RX0 - 24, RY0 - 24, RX1 - RX0 + 48, RY1 - RY0 + 48, C.rim);
    game.draw.rect(RX0, RY0, RX1 - RX0, RY1 - RY0, C.ice);
    game.draw.circle(540, 850, 160, '#ffffff', 0.5);
    game.draw.rect(RX0, 846, RX1 - RX0, 8, '#c8e0f0');
    // 滑っている客(丸い塊)
    for (var s = 0; s < 3; s++) {
      var a = t * (0.5 + s * 0.15) + s * 2.1;
      var sx = 540 + Math.cos(a) * (300 + s * 60), sy = 850 + Math.sin(a) * (360 - s * 50);
      shadow(sx, sy + 26, 30);
      game.draw.circle(sx, sy, 28, ['#8ab8ff', '#ff9ac0', '#b0e070'][s]);
      game.draw.circle(sx, sy - 34, 16, '#ffe0c8');
    }
  }

  function drawCrack(c) {
    var t = game.time.elapsed;
    var p = poly(c);
    var col = c.s === 'seal' ? C.white : C.crack;
    var wdt = c.s === 'seal' ? 16 : 10;
    for (var i = 1; i < p.length; i++) {
      if (c.s !== 'seal') game.draw.line(p[i - 1].x, p[i - 1].y + 4, p[i].x, p[i].y + 4, '#ffffff', wdt);
      game.draw.line(p[i - 1].x, p[i - 1].y, p[i].x, p[i].y, col, wdt);
    }
    if (c.s === 'seal') {
      var shine = Math.max(0, 1 - c.t * 1.5);
      for (var j = 1; j < p.length; j++) game.draw.line(p[j - 1].x, p[j - 1].y, p[j].x, p[j].y, C.teal, 6 + shine * 10);
      return;
    }
    // 水が流れた所(なぞった分)
    if (drag && drag.c === c && drag.far > 0) {
      var L = polyLen(p), acc = 0;
      var fromA = drag.from === 'A';
      for (var k = 1; k < p.length; k++) {
        var sl = Math.hypot(p[k].x - p[k - 1].x, p[k].y - p[k - 1].y);
        var s0 = fromA ? acc : L - acc - sl;
        if (s0 < drag.far) game.draw.line(p[k - 1].x, p[k - 1].y, p[k].x, p[k].y, C.teal, 14);
        acc += sl;
      }
    }
    if (c.s === 'broke') {
      var e = endPt(c.A).x < RX0 + 12 || endPt(c.A).x > RX1 - 12 || endPt(c.A).y < RY0 + 12 || endPt(c.A).y > RY1 - 12 ? endPt(c.A) : endPt(c.B);
      game.draw.sprite(CONE, { r: C.keeper, w: C.white }, Math.max(RX0 + 30, Math.min(RX1 - 30, e.x)), Math.max(RY0 + 30, Math.min(RY1 - 30, e.y)), 10, { anchor: 'center' });
      return;
    }
    // 端: 狙う物(白縁の明滅)。フェンスが近いと赤く点滅
    var ends = [c.A, c.B];
    for (var q = 0; q < 2; q++) {
      var ep = endPt(ends[q]);
      var hot = ends[q].warn && Math.floor(t * 10) % 2 === 0;
      var hl = focus && stopT > 0 && Math.abs(focus.x - ep.x) < 2 && Math.abs(focus.y - ep.y) < 2;
      shadow(ep.x, ep.y + 18, 26);
      game.draw.circle(ep.x, ep.y, hl ? 64 : 44 + Math.sin(t * 7 + q) * 6, hot || hl ? C.red : C.crack, hl ? 0.9 : 0.3);
      game.draw.circle(ep.x, ep.y, 28, C.white);
      game.draw.circle(ep.x, ep.y, 16, hot ? C.red : C.crack);
    }
  }

  function drawKeeper() {
    var t = game.time.elapsed;
    var kx = 540, ky = Math.round(H * 0.82);
    shadow(kx, ky + 90, 80);
    var fr = drag ? KEEPER_B : (Math.floor(t * 2) % 2 === 0 ? KEEPER_A : KEEPER_B);
    game.draw.sprite(fr, { c: C.crack, o: C.keeper, w: C.white, a: '#c85a20' }, kx, ky - (mood > 0.5 ? Math.abs(Math.sin(t * 10)) * 16 : 0), 18, { anchor: 'center' });
    // ホース(なぞっている指まで)
    var hx = drag ? drag.x : kx + 140, hy = drag ? drag.y : ky - 40 + Math.sin(t * 2) * 8;
    game.draw.line(kx + 60, ky + 10, (kx + hx) / 2 + 60, (ky + hy) / 2 + 80, C.keeper, 16);
    game.draw.line((kx + hx) / 2 + 60, (ky + hy) / 2 + 80, hx, hy, C.keeper, 16);
    game.draw.circle(hx, hy, 18, '#c85a20');
    if (drag) game.draw.circle(hx, hy, 30, C.teal, 0.5);
    // 水こぼれ
    for (var i = spills.length - 1; i >= 0; i--) {
      var sp = spills[i];
      sp.t += game.time.delta;
      if (sp.t > 1.2) { spills.splice(i, 1); continue; }
      game.draw.circle(sp.x, sp.y, 30 + sp.t * 60, C.teal, 0.35 * (1 - sp.t / 1.2));
    }
    // 残機(コーンの数=割れ抜けた本数)
    for (var l = 0; l < LIVES; l++) {
      var lx = 120 + l * 90, ly = Math.round(H * 0.94);
      shadow(lx, ly + 30, 30);
      game.draw.sprite(CONE, { r: l < broke ? C.red : '#c8d0d8', w: C.white }, lx, ly, 9, { anchor: 'center' });
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.white, 0.92);
    game.draw.rect(0, 226, W, 4, C.rim);
    label('SCORE ' + score, 250, 70, 44, C.ink);
    label(sealed + ' / ' + NEED, 250, 160, 52, C.teal);
    for (var i = 0; i < NEED; i++) {
      game.draw.circle(560 + i * 66, 70, 22, i < sealed ? C.teal : '#d8e4ec');
    }
    var tk = Math.max(0, 1 - playT / TIME_LIMIT);
    game.draw.rect(560, 150, 460, 24, '#d8e4ec');
    game.draw.rect(560, 150, 460 * tk, 24, tk < 0.25 ? C.red : C.keeper);
  }

  function drawScene() {
    drawRink();
    for (var i = 0; i < cracks.length; i++) drawCrack(cracks[i]);
    drawKeeper();
  }

  // ---- ATTRACT: 1本目を端から端へなぞって塞ぐ。2本目は放っておいてフェンスまで割れ抜けさせる ----
  var DEMO_SCHED = [[0.2, 540, 820, 0.3, 40], [1.6, 760, 1120, -0.4, 150]];
  var demo = { t: 0, hx: 540, hy: 1500, press: false, tr: -1 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; demo.tr = -1; }
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) focus = null; return; }
    var b = stepCracks(dt, DEMO_SCHED);
    if (b) onBroke(b, true);
    var c = cracks[0];
    demo.press = false;
    if (c && c.s === 'open') {
      var p = poly(c);
      if (demo.tr < 0) {
        var a = endPt(c.A);
        demo.hx += (a.x - demo.hx) * Math.min(1, dt * 5);
        demo.hy += (a.y - demo.hy) * Math.min(1, dt * 5);
        if (cyc > 1.2 && Math.hypot(demo.hx - a.x, demo.hy - a.y) < 20 && beginDrag(a.x, a.y)) demo.tr = 0;
      } else {
        demo.tr += dt / 0.9;
        demo.press = true;
        var L = polyLen(p), want = Math.min(1, demo.tr) * L, acc = 0, px = p[0].x, py = p[0].y;
        for (var i = 1; i < p.length; i++) {
          var sl = Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y);
          if (acc + sl >= want) { var k = sl > 0 ? (want - acc) / sl : 0; px = p[i - 1].x + (p[i].x - p[i - 1].x) * k; py = p[i - 1].y + (p[i].y - p[i - 1].y) * k; break; }
          acc += sl; px = p[i].x; py = p[i].y;
        }
        demo.hx = px; demo.hy = py;
        moveDrag(px, py, true);
        if (demo.tr >= 1 && drag) { endDrag(px, py, true); demo.tr = 2; }
      }
    } else {
      demo.hx += (540 - demo.hx) * Math.min(1, dt * 2);
      demo.hy += (1500 - demo.hy) * Math.min(1, dt * 2);
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    mood += (0 - mood) * Math.min(1, dt * 1.5);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.hx, demo.hy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.white, 0.92);
      label(GAME_TITLE, W / 2, 100, 92 + Math.sin(t * 3) * 3, C.keeper);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 188, 36, C.ink);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, 1460, 48, C.red);
      else label('TAP TO START', W / 2, 1460, 44, C.ink);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.3, W, H * 0.26, C.white, 0.94);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.355, 96, won ? C.ok : C.red);
      label('SCORE ' + score, W / 2, H * 0.41, 54, C.ink);
      label(sealed + ' / ' + NEED, W / 2, H * 0.455, 46, C.teal);
      if (score > game.best && score > 0) label('NEW RECORD', W / 2, H * 0.5, 46, C.keeper);
      else label('BEST ' + Math.max(game.best, score), W / 2, H * 0.5, 38, C.ink);
      if (!won) label('あと' + Math.max(1, NEED - sealed) + '本', W / 2, H * 0.54, 46, C.keeper);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.6, 38, C.ink);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (stopT > 0) stopT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { sealed: sealed, broke: broke, score: score };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.5);
    } else if (stopT > 0) {
      stopT -= dt;
      playT += dt;
      if (stopT <= 0) focus = null;
    } else {
      playT += dt;
      var b = stepCracks(dt, SCHED);
      if (b) onBroke(b, false);
      if (!over && playT >= TIME_LIMIT) { timeUp = true; drag = null; finish(false); }
    }

    drawScene();
    drawHud();
    // 開始直後のお手本: 最初のひびの端に手を一度だけ
    if (!over && readyT <= 0 && playT > 0.4 && playT < 1.6 && cracks[0]) {
      var e0 = endPt(cracks[0].A);
      game.draw.hand(e0.x, e0.y, { press: true, scale: 12, alpha: 0.55 });
    }
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, 520, 100, C.keeper);
    if (over && timeUp) label('TIME UP', W / 2, 520, 90, C.red);
  });

  game.onStart(function() {
    game.audio.melody([
      ['E5', 0.5], ['B4', 0.5], ['C#5', 0.5], ['E5', 0.5], ['F#5', 1], ['E5', 1],
      ['C#5', 0.5], ['B4', 0.5], ['A4', 0.5], ['B4', 0.5], ['C#5', 2],
    ], { tempo: 112, wave: 'sine', volume: 0.06, loop: true, bass: [['A2', 2], ['E2', 2], ['F#2', 2], ['E2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

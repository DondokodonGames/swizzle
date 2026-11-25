// I-Switch-0006v3-ski-jump-arc-read.js
// ジャンプ台の踏み切り読み — 助走で溜まった勢いと、踏み切り台の上で伸びる弧の出だしを見て、着地斜面の目標線に届く瞬間に踏み切る
// 操作: 選手は助走路を自動で滑り降りて加速する。踏み切り台(白く光る区間)にいる間にタップするとその場で踏み切る。遅く踏み切るほど遠くへ飛ぶ。台の上では今踏み切った時の弧の出だしだけが点線で見える(後半ほど短くなる)。台の端を越えても踏み切らないと、伸びずに落ちてMISS
// 終わり: 5本のうち3本を目標線(赤い旗の間)に着地させればCLEAR。3本外す/19秒で決着しなければGAME OVER
// @mechanic: trajectory
// @theme: ski_jump_takeoff
// 世界観: 冬の夜間照明のジャンプ台で、ジャンプ少年団の選手が毎回違うスタートゲートからの勢いを感じ取り、着地斜面の目標線に届く弧を読んで踏み切る
// 残るもの: 正誤(CLEAR/GAME OVER) + 目標線に入った本数・飛距離(m)・PERFECT数のスコア
// スタイル: 70s MONO

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  // 70s MONO: 白ドット + 画面帯ごとの単色セロハン、矩形波の単音、無音の間
  var STYLE = { bg: ['#000000', '#05070c'], main: ['#ffffff', '#c8c8c8', '#6a6a6a'], accent: ['#ff3a3a', '#3ad0ff'] };

  var JUMPS = 5, NEED = 3, MISSES = 3, TIME_LIMIT = 19;
  var P0 = { x: 40, y: 300 }, P1 = { x: 270, y: 640 }, P2 = { x: 400, y: 712 };
  var L1 = Math.hypot(P1.x - P0.x, P1.y - P0.y), L2 = Math.hypot(P2.x - P1.x, P2.y - P1.y);
  var U1 = { x: (P1.x - P0.x) / L1, y: (P1.y - P0.y) / L1 }, U2 = { x: (P2.x - P1.x) / L2, y: (P2.y - P1.y) / L2 };
  var HILL_END = { x: 1000, y: 1560 };
  var ACC = 360, TABLE_DRAG = 200, GRAV = 900, POP = 300;
  var GATES = [70, 150, 20, 120, 40];
  var KFRAC = [0.5, 0.7, 0.35, 0.8, 0.6];
  var STUB = [0.42, 0.36, 0.3, 0.24, 0.2];

  var screen = 'ATTRACT';
  var j = null;

  var SK_TUCK = ['..hh....', '.hhhh...', '.hfeh...', '..ssss..', '.ssssss.', 'ssss.ss.', '..ss..s.', 'kkkkkkkkkk'];
  var SK_FLY_A = ['.......hh.', '......hhfe', '...sssss..', '.sssssss..', 'ss........', 'k.......k.', '.k.....k..', '..k...k...'];
  var SK_FLY_B = ['.......hh.', '......hhfe', '..ssssss..', 'sssssss...', 's.........', '.k.....k..', '..k...k...', '...k.k....'];
  var SK_LAND = ['...hh...', '..hhhh..', '..hfeh..', '..ssss..', '.ssssss.', '.s.ss.s.', '..s..s..', 'kkkkkkkkkk'];
  var SK_DOWN = ['..........', '..........', '..........', '.k..hh..k.', '..khhfek..', 'sssssssss.', '.s.s..s.s.', 'kk......kk'];
  var SK_PAL = { h: STYLE.main[0], f: '#d8d8d8', e: '#000000', s: STYLE.main[0], k: STYLE.main[1] };
  var SK_HOT = { h: '#ffffff', f: '#ffffff', e: '#ffffff', s: '#ffffff', k: '#ffffff' };

  function hillY(x) {
    if (x <= P2.x) return P2.y + 18;
    if (x >= HILL_END.x) return HILL_END.y;
    var u = (x - P2.x) / (HILL_END.x - P2.x);
    return P2.y + 18 + (HILL_END.y - P2.y - 18) * Math.pow(u, 0.75);
  }

  function freshMeet() {
    return {
      st: 'ready', readyT: 0.8, clock: TIME_LIMIT,
      jump: -1, d: 0, v: 0, popped: false, air: null, trail: [], ghosts: [],
      k: 0, kHalf: 46, results: [], hits: 0, misses: 0, perfects: 0, score: 0, bestM: 0, closest: 9999,
      landT: 0, crouch: 0, stopT: 0, won: false, culprit: null, prevBest: 0, partyT: 0,
    };
  }

  function posAt(d) {
    if (d <= L1) return { x: P0.x + U1.x * d, y: P0.y + U1.y * d, u: U1 };
    var e = Math.min(d - L1, L2);
    return { x: P1.x + U2.x * e, y: P1.y + U2.y * e, u: U2 };
  }

  // 踏み切り(pop=true)/踏み切らず(false)の飛行を最後まで計算して着地xを返す
  function flyFrom(px, py, vx, vy) {
    var x = px, y = py;
    for (var i = 0; i < 400; i++) {
      vy += GRAV / 60; x += vx / 60; y += vy / 60;
      if (x > P2.x && y >= hillY(x)) return x;
    }
    return x;
  }
  // 台の端に近いほど踏み切りが強く効く
  function popAt(d) { return POP * (0.3 + 0.7 * Math.min(1, Math.max(0, d - L1) / L2)); }
  function takeoffVel(v, u, pop) { return { vx: v * u.x, vy: v * u.y - pop }; }

  // 台の上の早い/遅い踏み切りの着地範囲から目標線を決める(必ず届く位置)
  function setupJump(i) {
    var d = GATES[i], v = 0, dt = 1 / 60, early = null, late = null;
    while (d < L1 + L2) {
      var p = posAt(d);
      if (d > L1 && early === null) { var tv = takeoffVel(v, p.u, popAt(d)); early = flyFrom(p.x, p.y, tv.vx, tv.vy); }
      v += (d <= L1 ? ACC : -TABLE_DRAG) * dt;
      d += v * dt;
    }
    var pe = posAt(L1 + L2), tl = takeoffVel(v, pe.u, POP);
    late = flyFrom(pe.x, pe.y, tl.vx, tl.vy);
    j.k = early + (late - early) * KFRAC[i];
    j.kHalf = 46;
  }

  function startJump() {
    j.jump++;
    j.d = GATES[j.jump]; j.v = 0; j.popped = false; j.air = null; j.trail = []; j.landT = 0;
    setupJump(j.jump);
    game.audio.tone(880, 0.05, { wave: 'square', volume: 0.05 });
  }

  function meters(x) { return Math.round((x - P2.x) / 5); }

  function takeoff() {
    if (j.st !== 'run' || j.air || j.landT > 0) { game.audio.play('se_tap', 0.12); return; }
    if (j.d <= L1) { j.crouch = 0.15; game.audio.play('se_tap', 0.2); return; }
    var p = posAt(j.d);
    var tv = takeoffVel(j.v, p.u, popAt(j.d));
    j.air = { x: p.x, y: p.y, vx: tv.vx, vy: tv.vy, popped: true };
    j.popped = true;
    game.audio.play('se_jump', 0.45);
    game.fx.burst(p.x, p.y + 10, { color: '#ffffff', count: 10, speed: 220 });
  }

  function land(x) {
    j.landT = 0.6;
    var m = meters(x);
    var off = x - j.k;
    var good = Math.abs(off) <= j.kHalf && j.air.popped;
    j.ghosts.push(j.trail.slice());
    if (j.ghosts.length > 2) j.ghosts.shift();
    if (good) {
      var perfect = Math.abs(off) <= 16;
      j.hits++; if (perfect) j.perfects++;
      j.results.push(perfect ? 'p' : 'g');
      j.score += (perfect ? 300 : 150) + m * 2;
      j.bestM = Math.max(j.bestM, m);
      game.feedback.good(x, hillY(x) - 90, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? STYLE.accent[1] : '#ffffff', size: 52 });
      game.fx.popup(m + 'm', x, hillY(x) - 170, { color: '#ffffff', size: 44 });
      if (j.hits === 2) { game.fx.popup('2 / ' + NEED, W / 2, H * 0.22, { color: STYLE.accent[1], size: 60 }); game.audio.play('se_milestone', 0.45); }
      if (j.hits >= NEED) { j.st = 'stop'; j.stopT = 0.55; j.won = true; return; }
    } else {
      j.misses++;
      j.results.push('x');
      j.air.fell = true;
      var gap = Math.abs(off) - j.kHalf;
      if (j.air.popped) j.closest = Math.min(j.closest, gap);
      game.audio.play('se_break', 0.3);
      if (j.misses >= MISSES) { j.st = 'stop'; j.stopT = 0.5; j.won = false; j.culprit = { x: x, y: hillY(x) }; game.fx.flash('#ffffff', 0.14); return; }
      game.feedback.bad(x, hillY(x) - 60, { text: 'MISS', size: 46 });
      if (j.air.popped) game.fx.popup('あと' + Math.max(1, Math.round(gap / 5)) + 'm', x, hillY(x) - 140, { color: '#ffffff', size: 36 });
    }
  }

  function advance(dt) {
    j.clock -= dt;
    if (j.crouch > 0) j.crouch -= dt;
    if (j.landT > 0) {
      j.landT -= dt;
      if (j.air) { j.air.x += j.air.vx * 0.25 * dt; j.air.y = hillY(j.air.x); }
      if (j.landT <= 0) {
        if (j.jump + 1 >= JUMPS) { j.st = 'stop'; j.stopT = 0.5; j.won = j.hits >= NEED; j.culprit = null; return; }
        startJump();
      }
    } else if (j.air) {
      var a = j.air;
      a.vy += GRAV * dt; a.x += a.vx * dt; a.y += a.vy * dt;
      if (Math.floor(game.time.elapsed * 30) % 2 === 0) j.trail.push({ x: a.x, y: a.y });
      if (a.x > P2.x && a.y >= hillY(a.x)) { a.y = hillY(a.x); land(a.x); if (j.st !== 'run') return; }
    } else {
      j.v += (j.d <= L1 ? ACC : -TABLE_DRAG) * dt;
      j.d += j.v * dt;
      if (j.d >= L1 + L2) {
        var p = posAt(L1 + L2);
        var tv = takeoffVel(j.v, p.u, 0);
        j.air = { x: p.x, y: p.y, vx: tv.vx, vy: tv.vy, popped: false };
        game.audio.tone(160, 0.12, { wave: 'square', volume: 0.06 });
      }
    }
    if (j.clock <= 0) { j.clock = 0; j.st = 'stop'; j.stopT = 0.5; j.won = false; j.culprit = { x: j.k, y: hillY(j.k) }; game.fx.flash('#ffffff', 0.12); }
  }

  function settle() {
    j.prevBest = game.best;
    var stats = { hits: j.hits, need: NEED, perfect: j.perfects, bestM: j.bestM, misses: j.misses };
    if (j.won) {
      game.feedback.good(j.k, hillY(j.k) - 140, { text: 'CLEAR', color: STYLE.accent[1], size: 72 });
      game.audio.play('se_success', 0.6);
      game.end.success(j.score, stats);
    } else {
      var c = j.culprit || { x: j.k, y: hillY(j.k) };
      game.feedback.bad(c.x, c.y - 60, { text: 'MISS', size: 60 });
      game.audio.play('se_failure', 0.6);
      game.end.failure(stats);
    }
    screen = 'RESULT';
  }

  // ── 描画(白ドット + 帯セロハン) ─────────────────────
  function drawHill() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [1, STYLE.bg[1]]]);
    // 雪
    for (var s = 0; s < 40; s++) {
      var sx = (s * 97 + Math.sin(t + s) * 30) % W, sy = (s * 211 + t * (40 + (s % 4) * 20)) % H;
      game.draw.rect(sx, sy, 4, 4, '#ffffff', 0.5);
    }
    // 照明塔
    for (var l = 0; l < 2; l++) {
      var lx = l ? 980 : 520, ly = l ? 520 : 260;
      game.draw.line(lx, ly, lx, ly + 400, STYLE.main[2], 4);
      game.draw.rect(lx - 30, ly - 16, 60, 16, '#ffffff', 0.8 + 0.2 * Math.sin(t * 3 + l));
    }
    // 助走路
    game.draw.line(P0.x, P0.y, P1.x, P1.y, '#ffffff', 10);
    game.draw.line(P0.x, P0.y + 30, P1.x, P1.y + 30, STYLE.main[2], 4);
    // 踏み切り台(押せる区間は明るく)
    var onTable = !j.air && j.d > L1 && j.landT <= 0;
    game.draw.line(P1.x, P1.y, P2.x, P2.y, onTable ? STYLE.accent[1] : '#ffffff', onTable ? 18 : 12);
    if (!onTable && !j.air) game.draw.line(P1.x, P1.y, P2.x, P2.y, '#ffffff', 12 + Math.sin(t * 8) * 4);
    // スタートゲート
    var gp = posAt(GATES[Math.max(0, j.jump)] || GATES[0]);
    game.draw.line(gp.x - 30, gp.y - 50, gp.x + 30, gp.y - 50, STYLE.main[1], 5);
    // 着地斜面(白ドットの輪郭)
    for (var x = P2.x; x <= W; x += 14) game.draw.rect(x, hillY(x), 8, 8, '#ffffff');
    for (var x2 = P2.x + 7; x2 <= W; x2 += 28) game.draw.line(x2, hillY(x2) + 8, x2, H, '#ffffff', 1);
    // 目標線(赤い旗)
    var kx = j.k;
    if (kx > 0) {
      var k0 = kx - j.kHalf, k1 = kx + j.kHalf;
      game.draw.line(k0, hillY(k0), k1, hillY(k1), STYLE.accent[0], 14);
      game.draw.line(kx - 16, hillY(kx - 16), kx + 16, hillY(kx + 16), '#ffffff', 14);
      var fl = Math.sin(t * 8) * 6;
      for (var f = 0; f < 2; f++) {
        var fx = f ? k1 : k0;
        game.draw.line(fx, hillY(fx), fx, hillY(fx) - 90, '#ffffff', 4);
        game.draw.rect(fx + (f ? 0 : -50), hillY(fx) - 90 + fl * 0.3, 50, 28, STYLE.accent[0]);
      }
      game.draw.text(meters(kx) + 'm', kx + 70, hillY(kx) - 40, { size: 34, color: STYLE.accent[0], bold: true, align: 'left' });
    }
    // 前の跳躍の軌跡(記憶の手がかり)
    for (var g = 0; g < j.ghosts.length; g++) {
      var gh = j.ghosts[g];
      for (var q = 0; q < gh.length; q += 2) game.draw.rect(gh[q].x, gh[q].y, 5, 5, '#ffffff', 0.18 + g * 0.1);
    }
  }

  function cellophane() {
    // 帯ごとの単色オーバーレイ
    game.draw.rect(0, 0, W, H * 0.22, STYLE.accent[1], 0.12);
    game.draw.rect(0, H * 0.76, W, H * 0.24, '#3aff6a', 0.08);
    for (var y = 0; y < H; y += 8) game.draw.rect(0, y, W, 2, '#000000', 0.18);
  }

  function drawJumper(hl) {
    var t = game.time.elapsed;
    var x, y, art;
    if (j.air) {
      x = j.air.x; y = j.air.y - 34;
      if (j.landT > 0 || screen === 'RESULT') {
        art = (j.air.fell || (screen === 'RESULT' && !j.won)) ? SK_DOWN : SK_LAND;
        if (screen === 'RESULT' && j.won && Math.floor(t * 4) % 2) y -= 20;
      } else art = !j.air.popped ? SK_TUCK : (Math.floor(t * 8) % 2 ? SK_FLY_A : SK_FLY_B);
    } else {
      var p = posAt(j.d);
      x = p.x; y = p.y - 34;
      art = j.crouch > 0 ? SK_LAND : SK_TUCK;
      if (j.d > L1 && j.v > 0) for (var s = 1; s <= 3; s++) game.draw.line(x - p.u.x * (40 + s * 26), y - p.u.y * (40 + s * 26) + s * 6, x - p.u.x * (70 + s * 26), y - p.u.y * (70 + s * 26) + s * 6, '#ffffff', 2);
    }
    game.draw.sprite(art, hl ? SK_HOT : SK_PAL, x, y - 6, hl ? 14 : 10, { anchor: 'center' });
    // 台の上: 今踏み切った時の弧の出だし
    if (!j.air && j.d > L1 && j.st === 'run') {
      var pp = posAt(j.d), tv = takeoffVel(j.v, pp.u, popAt(j.d));
      var ax = pp.x, ay = pp.y, vx = tv.vx, vy = tv.vy;
      var steps = Math.round(60 * STUB[Math.max(0, j.jump)]);
      for (var i = 0; i < steps; i++) {
        vy += GRAV / 60; ax += vx / 60; ay += vy / 60;
        if (i % 3 === 0) game.draw.rect(ax - 4, ay - 4, 8, 8, STYLE.accent[1], 0.9 - i / steps * 0.6);
      }
    }
  }

  function line(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 3, { size: size, color: '#000000', bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function drawHud() {
    line(j.hits + ' / ' + NEED, 140, 80, 52, '#ffffff');
    line('SCORE ' + j.score, W - 240, 80, 36, STYLE.accent[1]);
    game.draw.rect(70, 136, W - 140, 12, STYLE.main[2], 0.6);
    var fr = Math.max(0, j.clock / TIME_LIMIT);
    game.draw.rect(70, 136, (W - 140) * fr, 12, fr < 0.25 ? STYLE.accent[0] : '#ffffff');
    // 残り本数(親指ゾーン)
    for (var i = 0; i < JUMPS; i++) {
      var x = W / 2 - 2 * 120 + i * 120, y = H * 0.9;
      var r = j.results[i];
      game.draw.rect(x - 40, y - 8, 80, 16, r === 'p' ? STYLE.accent[1] : r === 'g' ? '#ffffff' : r === 'x' ? STYLE.accent[0] : STYLE.main[2]);
      if (i === j.jump && !r) game.draw.rect(x - 46, y - 14, 92, 28, '#ffffff', 0.3 + 0.2 * Math.sin(game.time.elapsed * 8));
    }
  }

  function drawAll(hl) {
    drawHill();
    drawJumper(hl);
    cellophane();
  }

  // ── ATTRACT ボット(踏み切り判断を予測で行い、2本目はわざと早く) ──
  var demo = { t: 0, press: 0, hx: W * 0.5, hy: H * 0.9 };
  function botWants(early) {
    if (j.air || j.d <= L1 || j.landT > 0) return false;
    var p = posAt(j.d), tv = takeoffVel(j.v, p.u, popAt(j.d));
    var lx = flyFrom(p.x, p.y, tv.vx, tv.vy);
    return early ? true : lx >= j.k - 6;
  }
  function runDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.0;
    if (cyc < dt || demo.t <= dt) { j = freshMeet(); j.st = 'run'; startJump(); }
    if (demo.press > 0) demo.press -= dt;
    if (j.st === 'run') {
      if (botWants(j.jump === 1)) { demo.press = 0.2; takeoff(); }
      advance(dt);
    } else if (j.st === 'stop') j.stopT -= dt;
  }

  game.onTap(function () {
    if (screen === 'ATTRACT') { j = freshMeet(); screen = 'PLAYING'; game.audio.play('se_coin', 0.5); return; }
    if (screen === 'RESULT') { game.audio.play('se_tap', 0.3); screen = 'ATTRACT'; j = freshMeet(); demo.t = 0; return; }
    takeoff();
  });

  game.onUpdate(function (dt) {
    if (!j) j = freshMeet();
    if (screen === 'ATTRACT') {
      runDemo(dt);
      drawAll(false);
      game.draw.hand(demo.hx, demo.hy, { press: demo.press > 0, scale: 14 });
      line('K-POINT', W / 2, H * 0.05 + 30, 84, '#ffffff');
      line('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, H * 0.1 + 34, 34, STYLE.accent[1]);
      if (Math.floor(game.time.elapsed * 1.6) % 2 === 0) line('► 100円 投入 ◄', W / 2, H * 0.84, 42, '#ffffff');
      else line('INSERT COIN', W / 2, H * 0.84, 36, STYLE.accent[1]);
      return;
    }
    if (screen === 'RESULT') {
      drawAll(false);
      if (j.won) {
        j.partyT -= dt;
        if (j.partyT <= 0) { j.partyT = 0.35; game.fx.burst(game.random(160, W - 160), game.random(H * 0.2, H * 0.5), { color: Math.random() < 0.5 ? '#ffffff' : STYLE.accent[1], count: 18, speed: 420 }); }
      }
      game.draw.rect(0, H * 0.28, W, H * 0.3, '#000000', 0.8);
      line(j.won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.335, 86, j.won ? STYLE.accent[1] : STYLE.accent[0]);
      line('SCORE ' + j.score, W / 2, H * 0.405, 52, '#ffffff');
      line('BEST ' + j.bestM + 'm    ' + j.hits + ' / ' + NEED, W / 2, H * 0.455, 38, STYLE.main[1]);
      if (!j.won) {
        line('あと' + (NEED - j.hits) + '本!', W / 2, H * 0.51, 46, STYLE.accent[1]);
        if (j.closest < 9999) line('あと' + Math.max(1, Math.round(j.closest / 5)) + 'm', W / 2, H * 0.555, 34, '#ffffff');
      } else if (j.score > j.prevBest) line('NEW RECORD', W / 2, H * 0.51, 48, STYLE.accent[1]);
      else line('BEST ' + j.prevBest, W / 2, H * 0.51, 40, '#ffffff');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) line('TAP TO CONTINUE', W / 2, H * 0.84, 36, '#ffffff');
      return;
    }
    if (j.st === 'ready') {
      if (j.jump < 0) startJump();
      j.readyT -= dt;
      if (j.readyT <= 0) { j.st = 'run'; game.audio.play('se_tap', 0.3); }
    } else if (j.st === 'run') {
      advance(dt);
    } else if (j.st === 'stop') {
      j.stopT -= dt;
      if (j.stopT <= 0) settle();
    }
    var hl = j.st === 'stop';
    drawAll(hl);
    if (hl && !j.won && j.culprit) game.draw.circle(j.culprit.x, j.culprit.y - 30, 70, '#ffffff', 0.35);
    drawHud();
    if (j.st === 'ready') line(j.readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 96, '#ffffff');
    if (j.st === 'run' && j.jump === 0 && !j.air && j.d > L1) game.draw.hand(W / 2, H * 0.9, { press: true, scale: 12, alpha: 0.7 });
  });

  game.onStart(function () {
    game.audio.melody([
      ['A4', 0.5], ['R', 0.5], ['E5', 0.5], ['R', 0.5], ['D5', 0.5], ['C5', 0.5], ['B4', 1],
      ['R', 1], ['A4', 0.5], ['B4', 0.5], ['C5', 1], ['R', 2],
    ], { tempo: 126, wave: 'square', volume: 0.05, loop: true });
    screen = 'ATTRACT';
    j = freshMeet();
    demo.t = 0;
  });
})(game);

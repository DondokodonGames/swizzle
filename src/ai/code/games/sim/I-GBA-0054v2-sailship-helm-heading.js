// I-GBA-0054v2-sailship-helm-heading.js
// セイルシップヘルム — 押している間だけ舵輪が回り羅針盤の針が進む。惰性まで読んで、示された方位でぴたりと止める
// 操作: 画面を押している間だけ舵輪が回る(長く押すほど速くなる)。離しても舵輪は少し惰性で回るので、星の方位の手前で離して滑り込ませる
// 終わり: 5つの方位を合わせ終えればCLEAR。止め損ね(手前で止まる/星を越えて赤い暗礁に入る/押さずに見送る)が3回になるか、15秒が尽きればGAME OVER
// @mechanic: hold_duration
// @theme: sailship_helm_compass_heading
// 世界観: 帆船の操舵室で、見習い航海士が舵輪を回し続け、航海長が羅針盤に示した方位ちょうどで手を放して船首を向け直す
// 残るもの: 正誤(CLEAR/GAME OVER) + 合わせた方位の数・PERFECT数・最小誤差・スコア
// スタイル: 90s LOW POLY

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  // 90s LOW POLY: 輪郭は line、面は横ストリップ塗り。頂点を毎フレーム微小に揺らし、遠景はフォグで潰す
  var STYLE = { bg: ['#1a2a3a', '#4a6a7a', '#8aa0a0'], main: ['#b07a3a', '#6a4422', '#e8dcc0'], accent: ['#ffd04a', '#e8503a'] };
  var INK = '#0c1218', BRASS = '#c8a048', CREAM = STYLE.main[2], WOOD = STYLE.main[0], WOOD_D = STYLE.main[1];
  var GOLD = STYLE.accent[0], REEF = STYLE.accent[1];

  var TITLE = 'COMPASS HELM';
  var TIME_LIMIT = 15;
  var HEADINGS = [45, 80, 120, 165, 220];  // 1つ前の向きからの回し幅(後ほど長く押す=速く回る=惰性も大きい)
  var MAX_MISS = 3;
  var PERFECT_DEG = 4, GOOD_DEG = 10, REEF_END = 45;
  var WAIT_LIMIT = 2.5;
  var CX = W / 2, CY = H * 0.38, CR = 300;
  var WX = W * 0.56, WY = H * 0.74, WR = 230;

  var MODE = 'ATTRACT';
  var w = null;

  var MATE_A = ['..cccccc..', '.cccccccc.', '..ssssss..', '..sesses..', '..ssssss..', '...smms...', '.bbbbbbbb.', 'sbbwwwwbbs', 's.bbwwbb.s', '..bbbbbb..', '..pp..pp..', '..pp..pp..', '.kkk..kkk.'];
  var MATE_B = ['..cccccc..', '.cccccccc.', '..ssssss..', '..ssssss..', '..ssssss..', '...smms...', '.bbbbbbbb.', 'sbbwwwwbbs', 's.bbwwbb.s', '..bbbbbb..', '..pp..pp..', '..pp..pp..', '.kkk..kkk.'];
  var MATE_PUSH = ['..cccccc..', '.cccccccc.', '..ssssss..', '..sesses..', '..ssssss..', '...sOOs...', '.bbbbbbbbs', 'sbbwwwwbbs', '..bbwwbb..', '..bbbbbb..', '..pp..pp..', '.pp...pp..', 'kkk...kkk.'];
  var MATE_CHEER = ['s.cccccc.s', 's.cccccc.s', 'b.ssssss.b', 'b.sesses.b', 'bbssssssbb', '...smms...', '..bbbbbb..', '..bwwwwb..', '..bbwwbb..', '..bbbbbb..', '..pp..pp..', '.pp....pp.', 'kkk....kkk'];
  var MATE_SAD = ['..........', '..cccccc..', '.cccccccc.', '..ssssss..', '..s-ss-s..', '..ssssss..', '...sOOs...', '.bbbbbbbb.', 'sbbwwwwbbs', 's.bbbbbb.s', '..pp..pp..', '..pp..pp..', '.kkk..kkk.'];
  var PAL_MATE = { c: '#f0f0f0', s: '#f0c098', e: INK, '-': INK, m: '#c04030', O: INK, b: '#2a4a8a', w: '#f0f0f0', p: '#2a2a3a', k: '#4a2a1a' };
  var STAR = ['...y...', '..yyy..', 'yyyyyyy', '.yyyyy.', '.yy.yy.', 'y.....y'];

  // ── ローポリ描画ヘルパー ───────────────────────────
  function jit() { return (Math.random() - 0.5) * 3; }
  function fillPoly(pts, col, alpha) {
    var minY = 1e9, maxY = -1e9, i;
    for (i = 0; i < pts.length; i++) { if (pts[i].y < minY) minY = pts[i].y; if (pts[i].y > maxY) maxY = pts[i].y; }
    for (var y = Math.floor(minY); y < maxY; y += 3) {
      var xl = 1e9, xr = -1e9;
      for (i = 0; i < pts.length; i++) {
        var a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) {
          var x = a.x + (y - a.y) * (b.x - a.x) / (b.y - a.y);
          if (x < xl) xl = x;
          if (x > xr) xr = x;
        }
      }
      if (xr > xl) game.draw.rect(xl, y, xr - xl, 3, col, alpha);
    }
  }
  function ngon(cx, cy, r, n, rot, jitter) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var a = rot + i / n * Math.PI * 2;
      out.push({ x: cx + Math.cos(a) * r + (jitter ? jit() : 0), y: cy + Math.sin(a) * r + (jitter ? jit() : 0) });
    }
    return out;
  }
  function outline(pts, col, width) {
    for (var i = 0; i < pts.length; i++) { var a = pts[i], b = pts[(i + 1) % pts.length]; game.draw.line(a.x, a.y, b.x, b.y, col, width); }
  }
  function rad(deg) { return (deg - 90) * Math.PI / 180; } // 0度=上(北)、時計回り

  // ── 世界 ───────────────────────────────────────────
  function freshWorld(demo) {
    return {
      demo: !!demo, k: 0, heading: 0, target: HEADINGS[0], omega: 0, holdT: 0, turn: 'wait', waitT: WAIT_LIMIT,
      nextT: 0, creak: 0, warnTick: false, hl: 0,
      clock: TIME_LIMIT, phase: 'ready', readyT: 0.8, stopT: 0, won: false,
      score: 0, done: 0, misses: 0, perfects: 0, bestErr: 99, last: '', matePose: 0,
    };
  }
  function initGame() { w = freshWorld(false); }

  // ── 操作(本番とデモで共通) ─────────────────────────
  function grip() {
    if (w.phase !== 'run' || w.turn !== 'wait') return false;
    w.turn = 'turn'; w.holdT = 0; w.omega = 50; w.warnTick = false;
    game.audio.play('se_tap', 0.3);
    return true;
  }
  function letGo() {
    if (w.turn !== 'turn') return false;
    w.turn = 'coast';
    game.audio.tone('G3', 0.08, { wave: 'triangle', volume: 0.1 });
    return true;
  }

  function judge(kind) {
    var err = w.heading - w.target;
    var a = Math.abs(err);
    var tx = CX + Math.cos(rad(w.target)) * (CR - 40), ty = CY + Math.sin(rad(w.target)) * (CR - 40);
    w.turn = 'judged'; w.nextT = 0.5; w.omega = 0;
    if (kind === 'ok' && a <= GOOD_DEG) {
      var perfect = a <= PERFECT_DEG;
      var last = w.k === HEADINGS.length - 1;
      var pts = (perfect ? 300 : 150) * (last ? 2 : 1);
      w.score += pts; w.done++;
      if (perfect) w.perfects++;
      if (a < w.bestErr) w.bestErr = a;
      w.matePose = 0.5;
      game.feedback.good(tx, ty - 40, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? GOLD : '#ffffff', size: 50 });
      if (w.done === 3 && !w.demo) { game.fx.popup('3 / 5', CX, CY + CR + 60, { color: GOLD, size: 56 }); game.audio.play('se_milestone', 0.4); }
      return;
    }
    w.misses++; w.hl = 0.4; w.last = kind;
    game.fx.flash('#ffffff', 0.1);
    if (kind === 'reef') game.audio.play('se_break', 0.35);
    game.feedback.bad(tx, ty - 40, { text: 'MISS', size: 50, shake: kind === 'reef' ? 10 : 4 });
    if (w.misses >= MAX_MISS && !w.demo) { w.phase = 'stop'; w.stopT = 0.5; w.won = false; }
  }

  function advance(dt) {
    if (w.phase !== 'run') return;
    if (!w.demo) w.clock -= dt;
    if (w.hl > 0) w.hl -= dt;
    if (w.matePose > 0) w.matePose -= dt;
    if (w.turn === 'wait') {
      w.waitT -= dt;
      if (w.waitT <= 0) judge('late');
    } else if (w.turn === 'turn' || w.turn === 'coast') {
      if (w.turn === 'turn') { w.holdT += dt; w.omega = 50 + 170 * Math.min(1, w.holdT / 1.6); }
      else { w.omega *= Math.exp(-8 * dt); }
      var before = w.heading;
      w.heading += w.omega * dt;
      if (Math.floor(w.heading / 15) !== Math.floor(before / 15)) game.audio.tone(420 + w.omega, 0.03, { wave: 'square', volume: 0.05 });
      var over = w.heading - w.target;
      if (over > -30 && !w.warnTick) { w.warnTick = true; game.audio.tone('E5', 0.06, { wave: 'square', volume: 0.06 }); }
      if (over > GOOD_DEG) { judge('reef'); }
      else if (w.turn === 'coast' && w.omega < 3) { judge(over < -GOOD_DEG ? 'short' : 'ok'); }
    } else if (w.turn === 'judged') {
      w.nextT -= dt;
      if (w.nextT <= 0 && w.phase === 'run') {
        if (w.k >= HEADINGS.length - 1) {
          if (w.demo) { w.turn = 'idle'; return; }
          w.phase = 'stop'; w.stopT = 0.6; w.won = true;
          game.fx.burst(CX, CY, { color: GOLD, count: 30, speed: 520 });
        } else {
          w.k++; w.target = w.heading + HEADINGS[w.k]; w.turn = 'wait'; w.waitT = WAIT_LIMIT;
          game.audio.tone('C5', 0.08, { wave: 'triangle', volume: 0.08 });
        }
      }
    }
    if (w.clock <= 0 && w.phase === 'run') { w.clock = 0; w.phase = 'stop'; w.stopT = 0.5; w.won = false; w.last = 'time'; game.fx.flash('#ffffff', 0.12); }
  }

  function settle() {
    var stats = { headings: w.done, total: HEADINGS.length, perfect: w.perfects, bestErr: w.bestErr < 99 ? Math.round(w.bestErr) : null };
    if (w.won) {
      w.score += Math.round(w.clock * 30);
      game.feedback.good(CX, CY, { text: 'CLEAR', color: GOLD, size: 70 });
      game.audio.play('se_success', 0.6);
      game.end.success(w.score, stats);
    } else {
      game.feedback.bad(CX, CY, { text: w.last === 'time' ? 'TIME UP' : 'GAME OVER', size: 56 });
      game.audio.play('se_failure', 0.6);
      game.end.failure(stats);
    }
    MODE = 'RESULT';
  }

  // ── 描画 ───────────────────────────────────────────
  function drawCabin() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.6, '#2a2018'], [1, '#140e0a']]);
    // 窓の外: 揺れる水平線とローポリの波、フォグ
    var roll = Math.sin(t * 0.9) * 26;
    var win = [{ x: 90, y: 250 }, { x: W - 90, y: 250 }, { x: W - 130, y: 560 }, { x: 130, y: 560 }];
    fillPoly(win, STYLE.bg[1]);
    fillPoly([{ x: 100, y: 400 + roll }, { x: W - 100, y: 400 - roll }, { x: W - 130, y: 556 }, { x: 130, y: 556 }], '#2a5a7a');
    for (var k = 0; k < 7; k++) {
      var bx = 150 + k * 130 + ((t * 40) % 130);
      if (bx > W - 160) continue;
      var by = 470 + Math.sin(t * 2 + k) * 10 + roll * (1 - bx / 540);
      fillPoly([{ x: bx - 50, y: by + 30 }, { x: bx, y: by }, { x: bx + 50, y: by + 30 }], '#5a8aa0');
    }
    game.draw.rect(90, 380, W - 180, 40, STYLE.bg[2], 0.3);
    outline(win, WOOD_D, 18);
    game.draw.line(W / 2, 250, W / 2, 560, WOOD_D, 12);
    // 壁の板
    for (var p = 0; p < 6; p++) game.draw.line(0, 600 + p * 220, W, 600 + p * 220, '#3a2a1a', 4);
  }

  function drawCompass() {
    var t = game.time.elapsed;
    fillPoly(ngon(CX + 12, CY + 16, CR + 34, 16, 0.2, false), '#000000', 0.3);
    var bezel = ngon(CX, CY, CR + 34, 16, 0.2, true);
    fillPoly(bezel, BRASS);
    fillPoly(ngon(CX, CY, CR, 16, 0.2, true), CREAM);
    outline(bezel, '#8a6a28', 6);
    // 目盛り(30度ごとに太く)
    for (var d = 0; d < 360; d += 15) {
      var a = rad(d), r0 = d % 90 === 0 ? CR - 60 : d % 30 === 0 ? CR - 40 : CR - 22;
      game.draw.line(CX + Math.cos(a) * r0, CY + Math.sin(a) * r0, CX + Math.cos(a) * (CR - 6), CY + Math.sin(a) * (CR - 6), INK, d % 90 === 0 ? 8 : 4);
    }
    game.draw.sprite(STAR, { y: '#8a6a28' }, CX, CY - CR + 90, 7, { anchor: 'center' });
    if (w.turn !== 'idle') {
      // ぴったりの窓(白く明滅)と、越えた先の赤い暗礁(トゲ)
      var near = w.heading - w.target > -30 && (w.turn === 'turn' || w.turn === 'coast');
      for (var g = -GOOD_DEG; g <= GOOD_DEG; g += 2) {
        var ga = rad(w.target + g);
        game.draw.line(CX + Math.cos(ga) * (CR - 30), CY + Math.sin(ga) * (CR - 30), CX + Math.cos(ga) * (CR + 30), CY + Math.sin(ga) * (CR + 30), '#ffffff', Math.abs(g) <= PERFECT_DEG ? 12 : 6);
      }
      for (var rf = GOOD_DEG + 2; rf <= REEF_END; rf += 5) {
        var ra = rad(w.target + rf), rb = rad(w.target + rf + 2.5), rc = rad(w.target + rf + 5);
        var blink = near && Math.floor(t * 12) % 2 === 0;
        fillPoly([
          { x: CX + Math.cos(ra) * (CR + 4), y: CY + Math.sin(ra) * (CR + 4) },
          { x: CX + Math.cos(rb) * (CR + 66), y: CY + Math.sin(rb) * (CR + 66) },
          { x: CX + Math.cos(rc) * (CR + 4), y: CY + Math.sin(rc) * (CR + 4) },
        ], blink || (w.hl > 0 && w.last === 'reef') ? '#ffffff' : REEF);
      }
      var sa = rad(w.target);
      var pulse = 1 + 0.15 * Math.sin(t * 8);
      game.draw.circle(CX + Math.cos(sa) * (CR + 92), CY + Math.sin(sa) * (CR + 92), 46 * pulse, GOLD, 0.25);
      game.draw.sprite(STAR, { y: GOLD }, CX + Math.cos(sa) * (CR + 92), CY + Math.sin(sa) * (CR + 92), 9 * pulse, { anchor: 'center' });
    }
    // 針(菱形を自前で回転)
    var na = rad(w.heading), px = -Math.sin(na), py = Math.cos(na);
    var hlN = w.hl > 0 || (w.phase === 'stop' && !w.won);
    var tipX = CX + Math.cos(na) * (CR - 30), tipY = CY + Math.sin(na) * (CR - 30);
    var tailX = CX - Math.cos(na) * (CR * 0.55), tailY = CY - Math.sin(na) * (CR * 0.55);
    fillPoly([{ x: tipX, y: tipY }, { x: CX + px * 30, y: CY + py * 30 }, { x: CX, y: CY }, { x: CX - px * 30, y: CY - py * 30 }], hlN ? '#ffffff' : REEF);
    fillPoly([{ x: tailX, y: tailY }, { x: CX + px * 30, y: CY + py * 30 }, { x: CX, y: CY }, { x: CX - px * 30, y: CY - py * 30 }], '#3a4a5a');
    fillPoly(ngon(CX, CY, 30, 8, t, true), BRASS);
    // 見送りまでの残り(収縮するリング)
    if (w.turn === 'wait' && w.phase === 'run') {
      var f = Math.max(0, w.waitT / WAIT_LIMIT);
      for (var s = 0; s < 24 * f; s++) {
        var ca = -Math.PI / 2 + s / 24 * Math.PI * 2;
        game.draw.circle(CX + Math.cos(ca) * 56, CY + Math.sin(ca) * 56, 7, f < 0.35 ? REEF : '#ffffff');
      }
    }
  }

  function drawWheel() {
    var t = game.time.elapsed;
    var ang = w.heading * Math.PI / 90;
    var press = w.turn === 'turn';
    // 押せる領域(手元)を明るく縁取る
    game.draw.rect(40, H * 0.6, W - 80, H * 0.36, '#ffffff', press ? 0.12 : 0.05 + 0.03 * Math.sin(t * 4));
    game.draw.line(40, H * 0.6, W - 40, H * 0.6, '#ffffff', press ? 6 : 3);
    game.draw.rect(WX - 26, WY, 52, H * 0.2, WOOD_D);
    for (var i = 0; i < 8; i++) {
      var a = ang + i / 8 * Math.PI * 2;
      var ex = WX + Math.cos(a) * (WR + 70), ey = WY + Math.sin(a) * (WR + 70);
      game.draw.line(WX, WY, ex, ey, WOOD, 18);
      game.draw.circle(ex, ey, 22, WOOD_D);
      game.draw.circle(ex + jit(), ey + jit(), 16, WOOD);
    }
    var rim = ngon(WX, WY, WR, 16, ang, true);
    outline(rim, WOOD_D, 34);
    outline(rim, WOOD, 20);
    fillPoly(ngon(WX, WY, 50, 8, ang, true), BRASS);
  }

  function drawMate() {
    var t = game.time.elapsed;
    var art;
    if (MODE === 'RESULT' && !w.won) art = MATE_SAD;
    else if (w.matePose > 0 || (w.phase === 'stop' && w.won)) art = MATE_CHEER;
    else if (w.turn === 'turn') art = MATE_PUSH;
    else art = Math.floor(t * 2) % 3 === 2 ? MATE_B : MATE_A;
    var bob = Math.sin(t * 3) * 6;
    fillPoly([{ x: W * 0.12, y: H * 0.93 }, { x: W * 0.32, y: H * 0.93 }, { x: W * 0.3, y: H * 0.95 }, { x: W * 0.14, y: H * 0.95 }], '#000000', 0.35);
    game.draw.sprite(art, PAL_MATE, W * 0.22, H * 0.86 + bob, 14, { anchor: 'center', flipX: true });
  }

  function label(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 3, { size: size, color: INK, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function drawStage() {
    drawCabin();
    drawCompass();
    drawWheel();
    drawMate();
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, INK, 0.55);
    label('SCORE ' + w.score, W * 0.3, 72, 40, '#ffffff');
    label((Math.min(w.k + 1, HEADINGS.length)) + ' / ' + HEADINGS.length, W * 0.75, 72, 44, GOLD);
    var frac = Math.max(0, w.clock / TIME_LIMIT);
    game.draw.rect(80, 128, W - 160, 20, '#2a3a4a');
    game.draw.rect(80, 128, (W - 160) * frac, 20, frac < 0.2 ? REEF : '#7ac8e0');
    for (var i = 0; i < HEADINGS.length; i++) game.draw.sprite(STAR, { y: i < w.done ? GOLD : '#3a4a5a' }, W / 2 - 200 + i * 100, 196, 5, { anchor: 'center' });
    for (var m = 0; m < MAX_MISS; m++) game.draw.circle(W - 70 - m * 44, 196, 14, m < w.misses ? REEF : '#3a4a5a');
  }

  // ── ATTRACT(実ロジック + ゴーストの長押し) ─────────
  // 1つ目: 惰性を読んで手前で離す(成功例) / 2つ目: 星に着いてから離して暗礁へ流れ込む(失敗例)
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: false };
  var DEMO_CYCLE = 5.6;
  function runDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) { w = freshWorld(true); w.phase = 'run'; w.target = 60; }
    if (w.turn === 'wait' && w.waitT < WAIT_LIMIT - 0.5) grip();
    if (w.turn === 'turn') {
      var predicted = w.heading + w.omega / 8;
      if ((w.k === 0 && predicted >= w.target) || (w.k === 1 && w.heading >= w.target)) letGo();
    }
    if (w.turn === 'judged' && w.k === 1 && w.nextT < 0.1) w.turn = 'idle';
    demo.press = w.turn === 'turn';
    demo.gx += (WX + 120 - demo.gx) * Math.min(1, dt * 5);
    demo.gy += (WY + 160 - demo.gy) * Math.min(1, dt * 5);
    advance(dt);
  }

  function begin() {
    initGame();
    MODE = 'PLAYING';
    game.audio.play('se_coin', 0.5);
  }

  game.onTap(function (x, y) {
    if (MODE === 'ATTRACT') { begin(); return; }
    if (MODE === 'RESULT') { MODE = 'ATTRACT'; initGame(); demo.t = 0; game.audio.play('se_tap', 0.3); return; }
    if (w.turn === 'judged') game.audio.play('se_tap', 0.06);
  });

  game.onPress(function (x, y) {
    if (MODE !== 'PLAYING') return;
    if (!grip()) game.audio.play('se_tap', 0.06);
  });

  game.onRelease(function (x, y) {
    if (MODE !== 'PLAYING') return;
    if (letGo()) game.fx.burst(WX, WY, { color: CREAM, count: 6, speed: 160 });
  });

  game.onUpdate(function (dt) {
    if (!w) initGame();
    if (MODE === 'ATTRACT') {
      runDemo(dt);
      drawStage();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 230, INK, 0.55);
      label(TITLE, W / 2, 95, 72, GOLD);
      label('HI-SCORE ' + game.best, W / 2, 175, 34, '#ffffff');
      if (Math.floor(game.time.elapsed * 1.6) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.975, 40, GOLD);
      else label('INSERT COIN', W / 2, H * 0.975, 34, '#ffffff');
      return;
    }
    if (MODE === 'RESULT') {
      drawStage();
      game.draw.rect(0, H * 0.22, W, H * 0.24, INK, 0.78);
      label(w.won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.27, 86, w.won ? GOLD : REEF);
      label('SCORE ' + w.score, W / 2, H * 0.33, 50, '#ffffff');
      label(w.done + ' / ' + HEADINGS.length + '   PERFECT ' + w.perfects, W / 2, H * 0.375, 36, '#7ac8e0');
      if (!w.won) label('あと' + (HEADINGS.length - w.done) + '回!', W / 2, H * 0.42, 44, GOLD);
      else if (w.score > game.best) label('NEW RECORD', W / 2, H * 0.42, 46, GOLD);
      else label('BEST ' + game.best, W / 2, H * 0.42, 40, '#ffffff');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.975, 34, '#ffffff');
      return;
    }
    if (w.phase === 'ready') {
      w.readyT -= dt;
      if (w.readyT <= 0) { w.phase = 'run'; game.audio.play('se_tap', 0.3); }
    } else if (w.phase === 'run') {
      advance(dt);
    } else if (w.phase === 'stop') {
      w.stopT -= dt;
      if (w.stopT <= 0) settle();
    }
    drawStage();
    drawHud();
    if (w.phase === 'ready') {
      label(w.readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 92, GOLD);
      game.draw.hand(WX + 120, WY + 160, { press: true, scale: 12, alpha: 0.7 });
    }
  });

  game.onStart(function () {
    // 船乗りの舟歌風(6/8の揺れ)。独自の旋律
    game.audio.melody([
      ['D4', 0.75], ['F4', 0.25], ['A4', 0.5], ['G4', 0.5], ['F4', 0.5], ['E4', 0.5],
      ['D4', 0.75], ['E4', 0.25], ['F4', 0.5], ['A4', 0.5], ['C5', 0.5], ['A4', 0.5],
      ['G4', 0.75], ['F4', 0.25], ['E4', 0.5], ['C4', 0.5], ['D4', 1.5],
    ], { tempo: 112, wave: 'triangle', volume: 0.06, loop: true, bass: [['D2', 1.5], ['A2', 1.5], ['D2', 1.5], ['F2', 1.5], ['C2', 1.5], ['D2', 1.5]], bassVolume: 0.06 });
    MODE = 'ATTRACT';
    initGame();
    demo.t = 0;
  });
})(game);

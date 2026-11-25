// I-GBA-0056v2-attic-rubberband-marble.js
// 屋根裏ゴムはじき — 輪ゴムの発射台を引いて放ち、積み木の壁にビー玉を当ててはね返りで箱へ入れる
// 操作: 発射台のビー玉を指でつまんで後ろへ引く(引いた向きの逆へ、引いた長さぶん強く飛ぶ)。離すと発射。壁や棚に当たると跳ね返る
// 終わり: 箱3つにビー玉を入れればCLEAR。ビー玉6個を使い切る/18秒が尽きればGAME OVER。棚の下の鈴に当ててから入れると得点2倍
// @mechanic: slingshot
// @theme: attic_rubberband_marble_bank
// 世界観: 雨の日の屋根裏の子ども部屋で、ひとり遊びの少年が輪ゴムの発射台でビー玉を飛ばし、積み木の壁に当てて棚の下の箱へ入れていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 入れた箱の数・残りビー玉・鈴ボーナス・スコア
// スタイル: VOXEL BLOCK

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  // VOXEL BLOCK: 立方体を上面/前面/側面の3明度で塗り、影は落とさず明度差だけで立体を出す
  var STYLE = { bg: ['#3a2c40', '#5a4458'], main: ['#e8b060', '#d05a4a', '#4a90c8'], accent: ['#ffe070', '#7ad070'] };
  var INK = '#1e1622', GOLD = STYLE.accent[0];
  var BLOCK_COLS = [STYLE.main[1], STYLE.main[2], STYLE.accent[1], STYLE.main[0]];

  var TITLE = 'ATTIC MARBLE';
  var TIME_LIMIT = 18;
  var MARBLES = 6, NEED = 3;
  var BALL_R = 22, G = 2000, PULL_MAX = 280, POWER = 6.5;
  var FLOOR = H * 0.7, ROOF = H * 0.17, LEFT = 60;
  var SLING = { x: 260, y: H * 0.645 };
  var WALL = { l: 860, r: 980, t: H * 0.3 };
  var STEP = 1 / 120;
  var ROUNDS = [
    { box: { l: 640, r: 840, t: FLOOR - 120 }, ledge: null, bell: null },
    { box: { l: 620, r: 830, t: FLOOR - 120 }, ledge: { l: 600, y: FLOOR - 400 }, bell: { x: 760, y: FLOOR - 330 } },
    { box: { l: 680, r: 845, t: FLOOR - 110 }, ledge: { l: 640, y: FLOOR - 330 }, bell: { x: 790, y: FLOOR - 270 } },
  ];

  var MODE = 'ATTRACT';
  var w = null;
  var pull = null;

  var BOY_A = ['..hhhhh..', '.hhhhhhh.', '.hsssssh.', '.sesssess', '.sssssss.', '..ssmss..', '.ttttttt.', 'tttttttts', 's.ttttt..', '..ppppp..', '.pp...pp.'];
  var BOY_B = ['..hhhhh..', '.hhhhhhh.', '.hsssssh.', '.sssssss.', '.sssssss.', '..ssmss..', '.ttttttt.', 'tttttttts', 's.ttttt..', '..ppppp..', '.pp...pp.'];
  var BOY_AIM = ['..hhhhh..', '.hhhhhhh.', '.hsssssh.', '.sesssess', '.sssssss.', '..ssOss..', '.tttttttt', 'tttttttss', 's.ttttt..', '..ppppp..', '.pp...pp.'];
  var BOY_JOY = ['s.hhhhh.s', 't.hhhhh.t', 'tthsssshtt', '.sesssess', '.sssssss.', '..smmms..', '.ttttttt.', '.ttttttt.', '..ttttt..', '..ppppp..', '.pp...pp.'];
  var BOY_SAD = ['.........', '..hhhhh..', '.hhhhhhh.', '.hsssssh.', '.s-sss-s.', '..ssOss..', 'sttttttts', '.ttttttt.', '..ttttt..', '..ppppp..', '.pp...pp.'];
  var PAL_BOY = { h: '#4a2a1a', s: '#f0c098', e: INK, '-': INK, m: '#d05a4a', O: INK, t: '#4a90c8', p: '#3a3a5a' };
  var BELL = ['..kk..', '.yyyy.', 'yLyyyy', 'yyyyyy', 'dddddd'];

  // ── ボクセル描画 ───────────────────────────────────
  function cube(x, y, s, col) {
    var d = s * 0.28;
    game.draw.rect(x, y, s, s, col);
    game.draw.rect(x, y - d, s + d, d, shade(col, 1.3));
    game.draw.rect(x + s, y - d, d, s + d, shade(col, 0.65));
  }
  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.min(255, Math.round(((n >> 16) & 255) * f)), g = Math.min(255, Math.round(((n >> 8) & 255) * f)), b = Math.min(255, Math.round((n & 255) * f));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // ── 物理(本番・デモの作戦・照準予告で共通) ─────────
  function rects(R) {
    var out = [
      [WALL.l, WALL.t, WALL.r, FLOOR],
      [R.box.l, R.box.t, R.box.l + 16, FLOOR],
      [R.box.r - 16, R.box.t, R.box.r, FLOOR],
    ];
    if (R.ledge) out.push([R.ledge.l, R.ledge.y, WALL.l, R.ledge.y + 44]);
    return out;
  }

  function step(b, R, dt) {
    b.vy += G * dt;
    b.x += b.vx * dt; b.y += b.vy * dt;
    var hit = '';
    var rs = rects(R);
    for (var i = 0; i < rs.length; i++) {
      var k = rs[i];
      var cx = Math.max(k[0], Math.min(k[2], b.x)), cy = Math.max(k[1], Math.min(k[3], b.y));
      var dx = b.x - cx, dy = b.y - cy, d2 = dx * dx + dy * dy;
      if (d2 < BALL_R * BALL_R) {
        var d = Math.sqrt(d2), nx = d ? dx / d : -1, ny = d ? dy / d : 0;
        b.x = cx + nx * BALL_R; b.y = cy + ny * BALL_R;
        var dot = b.vx * nx + b.vy * ny;
        if (dot < 0) { b.vx -= 1.72 * dot * nx; b.vy -= 1.72 * dot * ny; hit = 'wall'; }
      }
    }
    if (b.y > FLOOR - BALL_R) { b.y = FLOOR - BALL_R; if (b.vy > 0) { b.vy = -b.vy * 0.4; b.vx *= 0.8; hit = hit || 'floor'; } }
    if (b.y < ROOF + BALL_R) { b.y = ROOF + BALL_R; if (b.vy < 0) b.vy = -b.vy * 0.6; hit = 'wall'; }
    if (b.x < LEFT + BALL_R) { b.x = LEFT + BALL_R; if (b.vx < 0) b.vx = -b.vx * 0.6; hit = 'wall'; }
    if (R.bell && !b.rang && Math.hypot(b.x - R.bell.x, b.y - R.bell.y) < BALL_R + 30) { b.rang = true; hit = 'bell'; }
    if (b.x > R.box.l + 16 && b.x < R.box.r - 16 && b.y > R.box.t + 26) return 'in';
    if (b.y >= FLOOR - BALL_R - 1 && Math.abs(b.vx) < 40 && Math.abs(b.vy) < 120) return 'stop';
    return hit;
  }

  function simulate(R, vx, vy) {
    var b = { x: SLING.x, y: SLING.y, vx: vx, vy: vy, rang: false };
    for (var n = 0; n < 480; n++) { var r = step(b, R, STEP); if (r === 'in' || r === 'stop') return r; }
    return 'stop';
  }

  var plans = {};
  function plan(ri) {
    if (plans[ri]) return plans[ri];
    var R = ROUNDS[ri], best = null;
    // 低く速い弾道で壁に当ててはね返らせる組み合わせを探し、成功帯の真ん中を選ぶ
    for (var a = -40; a <= 0 && !best; a += 2) {
      var ok = [];
      for (var p = 100; p <= PULL_MAX; p += 6) {
        var r = a * Math.PI / 180, v = p * POWER;
        if (simulate(R, Math.cos(r) * v, Math.sin(r) * v) === 'in') ok.push(p);
      }
      if (ok.length >= 3) best = { a: a, p: ok[Math.floor(ok.length / 2)] };
    }
    plans[ri] = best || { a: -20, p: 220 };
    return plans[ri];
  }

  // ── 世界 ───────────────────────────────────────────
  function freshWorld(demo) {
    return {
      demo: !!demo, r: demo ? 1 : 0, ball: null, flyT: 0, acc: 0, left: MARBLES, shot: 'aim', shotT: 0,
      clock: TIME_LIMIT, phase: 'ready', readyT: 0.8, stopT: 0, won: false, why: '',
      score: 0, boxed: 0, bells: 0, boyPose: 0, bellT: 0,
    };
  }
  function initGame() { w = freshWorld(false); pull = null; }

  function fire(px, py) {
    if (w.phase !== 'run' || w.shot !== 'aim' || w.left <= 0) return false;
    var len = Math.hypot(px, py);
    if (len < 40) return false;
    if (len > PULL_MAX) { px *= PULL_MAX / len; py *= PULL_MAX / len; }
    w.ball = { x: SLING.x, y: SLING.y, vx: -px * POWER, vy: -py * POWER, rang: false };
    w.left--; w.shot = 'fly'; w.flyT = 0; w.acc = 0; w.boyPose = 0.3;
    game.audio.play('se_jump', 0.4);
    game.audio.tone(300 + len * 2, 0.07, { wave: 'square', volume: 0.08 });
    return true;
  }

  function landed(res) {
    var R = ROUNDS[w.r];
    if (res === 'in') {
      var bonus = w.ball.rang;
      var pts = 300 * (bonus ? 2 : 1) + w.left * 20;
      w.score += pts; w.boxed++; w.boyPose = 0.6;
      if (bonus) w.bells++;
      w.shot = 'boxed'; w.shotT = 0.7;
      game.feedback.good((R.box.l + R.box.r) / 2, R.box.t - 60, { text: bonus ? 'PERFECT' : 'GOOD', color: bonus ? GOLD : '#ffffff', size: 54 });
      if (bonus) game.fx.popup('x2', (R.box.l + R.box.r) / 2 + 100, R.box.t - 140, { color: GOLD, size: 44 });
      return;
    }
    w.shot = 'miss'; w.shotT = 0.45;
    game.feedback.bad(w.ball.x, w.ball.y - 50, { text: 'MISS', size: 42, shake: 4 });
  }

  function advance(dt) {
    if (!w.demo) w.clock -= dt;
    if (w.boyPose > 0) w.boyPose -= dt;
    if (w.bellT > 0) w.bellT -= dt;
    var R = ROUNDS[w.r];
    if (w.shot === 'fly') {
      w.flyT += dt;
      w.acc += Math.min(dt, 0.05);
      while (w.acc >= STEP && w.shot === 'fly') {
        w.acc -= STEP;
        var res = step(w.ball, R, STEP);
        if (res === 'wall') game.audio.tone('G4', 0.04, { wave: 'square', volume: 0.08 });
        if (res === 'bell') { w.bellT = 0.5; game.audio.play('se_coin', 0.4); }
        if (res === 'in' || res === 'stop' || w.flyT > 4) landed(res === 'in' ? 'in' : 'stop');
      }
    } else if (w.shot === 'boxed' || w.shot === 'miss') {
      w.shotT -= dt;
      if (w.shotT <= 0) {
        if (w.shot === 'boxed') {
          if (w.demo) { w.shot = 'idle'; return; }
          if (w.boxed >= NEED) { w.phase = 'stop'; w.stopT = 0.6; w.won = true; game.fx.burst((R.box.l + R.box.r) / 2, R.box.t, { color: GOLD, count: 30, speed: 520 }); return; }
          w.r++;
          game.audio.play('se_milestone', 0.4);
          game.fx.popup(w.boxed + ' / ' + NEED, W / 2, H * 0.36, { color: '#ffffff', size: 60 });
        }
        if (w.left <= 0 && !w.demo) { w.phase = 'stop'; w.stopT = 0.5; w.won = false; w.why = 'out'; game.fx.flash('#ffffff', 0.12); return; }
        w.ball = null; w.shot = 'aim';
      }
    }
    if (w.clock <= 0 && w.phase === 'run') { w.clock = 0; w.phase = 'stop'; w.stopT = 0.5; w.won = false; w.why = 'time'; game.fx.flash('#ffffff', 0.12); }
  }

  function settle() {
    var stats = { boxed: w.boxed, total: NEED, marblesLeft: w.left, bells: w.bells };
    if (w.won) {
      w.score += Math.round(w.clock * 30);
      game.feedback.good(W / 2, H * 0.4, { text: 'CLEAR', color: GOLD, size: 70 });
      game.audio.play('se_success', 0.6);
      game.end.success(w.score, stats);
    } else {
      game.feedback.bad(SLING.x + 100, SLING.y - 160, { text: w.why === 'time' ? 'TIME UP' : 'GAME OVER', size: 56 });
      game.audio.play('se_failure', 0.6);
      game.end.failure(stats);
    }
    MODE = 'RESULT';
  }

  // ── 描画 ───────────────────────────────────────────
  function drawAttic() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.7, STYLE.bg[1]], [1, INK]]);
    // 斜めの屋根梁と丸窓(雨)
    for (var k = 0; k < 7; k++) game.draw.line(k * 180 - 100, ROOF - 40, k * 180 + 60, ROOF + 60, '#2a1e2e', 14);
    game.draw.rect(0, ROOF - 20, W, 24, '#6a4a3a');
    game.draw.circle(W * 0.4, H * 0.3, 110, '#2a1e2e');
    game.draw.circle(W * 0.4, H * 0.3, 92, '#5a7aa0');
    for (var r = 0; r < 8; r++) {
      var ry = H * 0.3 - 80 + ((t * 300 + r * 47) % 160);
      game.draw.line(W * 0.4 - 70 + r * 20, ry, W * 0.4 - 76 + r * 20, ry + 18, '#c8d8f0', 3);
    }
    game.draw.line(W * 0.4 - 92, H * 0.3, W * 0.4 + 92, H * 0.3, '#2a1e2e', 8);
    // 床板(ボクセルの段)
    for (var x = 0; x < W; x += 90) cube(x, FLOOR, 90, (x / 90) % 2 ? '#8a5a3a' : '#9a6a44');
    game.draw.rect(0, FLOOR + 90, W, H - FLOOR - 90, '#4a3028');
  }

  function drawBlocks() {
    var R = ROUNDS[w.r], t = game.time.elapsed;
    // 積み木の壁
    var i = 0;
    for (var y = FLOOR - 60; y >= WALL.t; y -= 60) { cube(WALL.l, y, 60, BLOCK_COLS[i % 4]); cube(WALL.l + 60, y, 60, BLOCK_COLS[(i + 2) % 4]); i++; }
    // 棚(本の板)
    if (R.ledge) {
      for (var lx = R.ledge.l; lx < WALL.l; lx += 44) cube(lx, R.ledge.y, 44, lx % 88 ? '#c8a070' : '#b08858');
      if (R.bell) {
        game.draw.line(R.bell.x, R.ledge.y + 44, R.bell.x, R.bell.y - 30, '#2a1e2e', 3);
        var swing = w.bellT > 0 ? Math.sin(t * 40) * 10 : Math.sin(t * 2) * 3;
        game.draw.circle(R.bell.x, R.bell.y, 44, GOLD, 0.12 + 0.1 * Math.sin(t * 5));
        game.draw.sprite(BELL, { k: '#2a1e2e', y: GOLD, L: '#ffffff', d: '#c09030' }, R.bell.x + swing, R.bell.y, 10, { anchor: 'center' });
      }
    }
    // 箱(ゴール): 縁が明滅
    var b = R.box;
    var glow = 0.5 + 0.5 * Math.sin(t * 6);
    game.draw.rect(b.l, b.t, b.r - b.l, FLOOR - b.t, '#c08a50');
    game.draw.rect(b.l + 16, b.t + 10, b.r - b.l - 32, 30, '#5a3a24');
    game.draw.rect(b.l, b.t - 6, b.r - b.l, 10, '#ffffff', 0.35 + 0.4 * glow);
    game.draw.rect(b.l, b.t, 16, FLOOR - b.t, '#a87040');
    game.draw.rect(b.r - 16, b.t, 16, FLOOR - b.t, '#e0aa68');
    for (var m = 0; m < w.boxed && w.r < ROUNDS.length; m++) game.draw.circle(b.l + 40 + m * 40, b.t + 24, 12, '#ffffff', 0.6);
  }

  function drawSling() {
    var t = game.time.elapsed;
    // 発射台(2本の柱と輪ゴム)
    cube(SLING.x - 90, SLING.y + 40, 40, '#d05a4a');
    cube(SLING.x + 50, SLING.y + 40, 40, '#d05a4a');
    game.draw.rect(SLING.x - 80, SLING.y - 30, 20, 80, '#8a5a3a');
    game.draw.rect(SLING.x + 60, SLING.y - 30, 20, 80, '#8a5a3a');
    var px = SLING.x, py = SLING.y;
    if (pull && w.shot === 'aim') { px = SLING.x + pull.dx; py = SLING.y + pull.dy; }
    game.draw.line(SLING.x - 70, SLING.y - 30, px, py, '#e8d070', 6);
    game.draw.line(SLING.x + 70, SLING.y - 30, px, py, '#e8d070', 6);
    if (w.shot === 'aim' && w.left > 0) {
      if (!pull && w.phase === 'run') game.draw.circle(px, py, BALL_R + 16 + Math.sin(t * 8) * 6, '#ffffff', 0.3);
      marble(px, py, false);
    }
    // 照準の予告点(最初の0.2秒ぶんだけ)
    if (pull && w.shot === 'aim') {
      var len = Math.min(PULL_MAX, Math.hypot(pull.dx, pull.dy));
      var s = len / (Math.hypot(pull.dx, pull.dy) || 1);
      var vx = -pull.dx * s * POWER, vy = -pull.dy * s * POWER;
      for (var k = 1; k <= 6; k++) {
        var tt = k * 0.035;
        game.draw.circle(SLING.x + vx * tt, SLING.y + vy * tt + 0.5 * G * tt * tt, 8, '#ffffff', 0.7 - k * 0.08);
      }
    }
  }

  function marble(x, y, hl) {
    game.draw.circle(x, y, hl ? BALL_R * 1.4 : BALL_R, hl ? '#ffffff' : '#5ad0e8');
    game.draw.circle(x + 4, y + 4, BALL_R * 0.55, hl ? '#ffffff' : '#2a8ab0');
    game.draw.circle(x - 7, y - 7, 6, '#ffffff');
  }

  function drawBoy() {
    var t = game.time.elapsed;
    var art = Math.floor(t * 2) % 4 === 3 ? BOY_B : BOY_A;
    if (pull) art = BOY_AIM;
    if (w.boyPose > 0 || (w.phase === 'stop' && w.won)) art = BOY_JOY;
    if (MODE === 'RESULT' && !w.won) art = BOY_SAD;
    game.draw.sprite(art, PAL_BOY, 150, H * 0.79 + Math.sin(t * 3) * 5, 14, { anchor: 'center' });
    // 残りのビー玉(袋の横に並ぶ)
    for (var i = 0; i < MARBLES; i++) {
      var mx = 340 + i * 70, my = H * 0.8;
      if (i < w.left) marble(mx, my, false);
      else game.draw.circle(mx, my, BALL_R, '#2a1e2e');
    }
  }

  function label(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 3, { size: size, color: INK, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function drawStage() {
    drawAttic();
    drawBlocks();
    drawSling();
    if (w.ball && (w.shot === 'fly' || w.shot === 'miss' || w.shot === 'boxed')) {
      var hl = w.shot === 'miss' && w.shotT > 0.2;
      marble(w.ball.x, w.ball.y, hl);
    }
    drawBoy();
    for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.08);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, INK, 0.65);
    label('SCORE ' + w.score, W * 0.3, 72, 40, '#ffffff');
    label(w.boxed + ' / ' + NEED, W * 0.78, 72, 46, GOLD);
    var frac = Math.max(0, w.clock / TIME_LIMIT);
    game.draw.rect(80, 130, W - 160, 20, '#2a1e2e');
    game.draw.rect(80, 130, (W - 160) * frac, 20, frac < 0.2 ? STYLE.main[1] : STYLE.accent[1]);
    for (var i = 0; i < NEED; i++) game.draw.rect(W / 2 - 110 + i * 80, 175, 60, 34, i < w.boxed ? GOLD : '#2a1e2e');
  }

  // ── ATTRACT(実物理 + ゴーストの引き) ────────────────
  // 1発目: 山なりに投げて棚の上に弾かれる(失敗例) / 2発目: 壁に当ててはね返りで箱へ(成功例)
  var demo = { t: 0, gx: SLING.x, gy: SLING.y, press: false, k: 0, wait: 0 };
  var DEMO_CYCLE = 7.2;
  function runDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) { w = freshWorld(true); w.phase = 'run'; demo.k = 0; demo.wait = 1.0; pull = null; }
    if (w.shot === 'aim' && demo.k < 2) {
      demo.wait -= dt;
      var aim = demo.k === 0 ? { a: -58, p: 230 } : plan(1);
      var r = aim.a * Math.PI / 180;
      var f = Math.max(0, Math.min(1, 1 - (demo.wait - 0.1) / 0.6));
      pull = demo.wait < 0.7 ? { dx: -Math.cos(r) * aim.p * f, dy: -Math.sin(r) * aim.p * f } : null;
      demo.gx = SLING.x + (pull ? pull.dx : 0); demo.gy = SLING.y + (pull ? pull.dy : 0);
      demo.press = !!pull;
      if (demo.wait <= 0) { fire(-Math.cos(r) * aim.p, -Math.sin(r) * aim.p); pull = null; demo.k++; demo.wait = 1.0; demo.press = false; }
    } else { demo.press = false; }
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
    if (w.shot !== 'aim') game.audio.play('se_tap', 0.06);
  });

  game.onPress(function (x, y) {
    if (MODE !== 'PLAYING' || w.phase !== 'run' || w.shot !== 'aim' || w.left <= 0) { pull = null; return; }
    if (Math.hypot(x - SLING.x, y - SLING.y) > 260) { game.audio.play('se_tap', 0.06); return; }
    pull = { x0: x, y0: y, dx: 0, dy: 0 };
    game.audio.play('se_tap', 0.2);
  });

  game.onMove(function (x, y) {
    if (!pull || MODE !== 'PLAYING') return;
    pull.dx = x - pull.x0; pull.dy = y - pull.y0;
    var len = Math.hypot(pull.dx, pull.dy);
    if (len > PULL_MAX) { pull.dx *= PULL_MAX / len; pull.dy *= PULL_MAX / len; }
    if (Math.floor(len / 40) !== Math.floor((pull.last || 0) / 40)) game.audio.tone(200 + len, 0.03, { wave: 'triangle', volume: 0.05 });
    pull.last = len;
  });

  game.onRelease(function (x, y) {
    if (!pull || MODE !== 'PLAYING') return;
    var p = pull; pull = null;
    if (!fire(p.dx, p.dy)) { game.audio.play('se_tap', 0.08); game.fx.burst(SLING.x, SLING.y, { color: '#e8d070', count: 3, speed: 80 }); }
  });

  game.onUpdate(function (dt) {
    if (!w) initGame();
    if (MODE === 'ATTRACT') {
      runDemo(dt);
      drawStage();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 230, INK, 0.65);
      label(TITLE, W / 2, 92, 74, GOLD);
      label('HI-SCORE ' + game.best, W / 2, 174, 34, '#ffffff');
      if (Math.floor(game.time.elapsed * 1.6) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.94, 40, GOLD);
      else label('INSERT COIN', W / 2, H * 0.94, 34, '#ffffff');
      return;
    }
    if (MODE === 'RESULT') {
      drawStage();
      game.draw.rect(0, H * 0.3, W, H * 0.22, INK, 0.8);
      label(w.won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.35, 86, w.won ? GOLD : STYLE.main[1]);
      label('SCORE ' + w.score, W / 2, H * 0.41, 50, '#ffffff');
      label(w.boxed + ' / ' + NEED + '   x' + w.left, W / 2, H * 0.455, 36, STYLE.main[2]);
      if (!w.won) label('あと' + (NEED - w.boxed) + '箱!', W / 2, H * 0.495, 44, GOLD);
      else if (w.score > game.best) label('NEW RECORD', W / 2, H * 0.495, 46, GOLD);
      else label('BEST ' + game.best, W / 2, H * 0.495, 40, '#ffffff');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.94, 34, '#ffffff');
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
      label(w.readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 96, GOLD);
      game.draw.hand(SLING.x - (0.8 - w.readyT) * 150, SLING.y + (0.8 - w.readyT) * 90, { press: true, scale: 12, alpha: 0.7 });
    }
  });

  game.onStart(function () {
    // 雨の日の屋根裏、ぽつぽつ跳ねるオルゴール風
    game.audio.melody([
      ['E5', 0.5], ['C5', 0.5], ['D5', 0.5], ['G4', 0.5], ['A4', 0.5], ['B4', 0.25], ['C5', 0.25], ['D5', 1],
      ['E5', 0.5], ['G5', 0.5], ['F5', 0.5], ['D5', 0.5], ['C5', 0.5], ['B4', 0.5], ['C5', 1],
    ], { tempo: 116, wave: 'triangle', volume: 0.06, loop: true, bass: [['C3', 2], ['G2', 2], ['A2', 2], ['G2', 2]], bassVolume: 0.05 });
    MODE = 'ATTRACT';
    initGame();
    demo.t = 0;
  });
})(game);

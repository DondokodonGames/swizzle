// I-GBA-0056v3-lodge-corridor-cup-roll.js
// 山小屋ころがし — 長い板張り廊下の手前から木の球を指で弾き、奥の受け穴でぴたりと止める
// 操作: 手前で指を奥へ弾く。弾く速さ=球の勢い(弱すぎると手前で止まり、強すぎると穴を越えて突き当たりで跳ね返る)。斜めに弾くと横へずれ、壁で跳ね返る
// 終わり: 4つの受け穴(敷物で減速/ワックスで滑る/敷居を越える)すべてに入れればCLEAR。外すと予備の球が1つ減り、3回外す/18秒が尽きればGAME OVER
// @mechanic: flick_launch
// @theme: mountain_lodge_corridor_cup_roll
// 世界観: 冬の山小屋の長い板張り廊下で、宿番が客の寝静まった後に木の球を弾き、敷物やワックスの床を読みながら奥の受け穴に一つずつ止めていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 入れた穴の数・PERFECT数・外した回数・スコア
// スタイル: MODE7 PSEUDO

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  // MODE7 PSEUDO: 床を横ストリップに分け、奥ほど横方向を圧縮して地平へ収束させる。少色+地平グラデ
  var STYLE = { bg: ['#1a1428', '#3a2a40'], main: ['#c8884a', '#8a5a30', '#f0d8a8'], accent: ['#e84a3a', '#5ac8d8'] };
  var INK = '#120c18', PLANK = STYLE.main[0], PLANK_D = STYLE.main[1], CREAM = STYLE.main[2], RED = STYLE.accent[0], WAX = STYLE.accent[1];
  var GOLD = '#ffd04a';

  var TITLE = 'CORRIDOR ROLL';
  var TIME_LIMIT = 18;
  var SPARE = 3;
  var LEN = 1000, HOLE_Z = 34, HOLE_X = 0.4, V_CAP = 230, BASE_DEC = 300;
  var HOR = H * 0.2, NEAR_Y = H * 0.76, CAM = 300;
  var C = (NEAR_Y - HOR) * CAM;
  var HALF0 = 430;
  var ROUNDS = [
    { hole: 480, zones: [], sill: 0 },
    { hole: 700, zones: [{ a: 250, b: 420, dec: 650, col: RED }], sill: 0 },
    { hole: 820, zones: [{ a: 380, b: 700, dec: 110, col: WAX }], sill: 0 },
    { hole: 640, zones: [], sill: 330, gold: true },
  ];
  var STEP = 1 / 120;

  var MODE = 'ATTRACT';
  var w = null;
  var flick = null;

  var KEEP_A = ['..kkkkkk..', '.kkkkkkkk.', '..ssssss..', '..sesses..', '..ssssss..', '...smms...', '.rrrrrrrr.', 'srrwwwwrrs', 's.rrwwrr.s', '..rrrrrr..', '..pp..pp..', '.bbb..bbb.'];
  var KEEP_B = ['..kkkkkk..', '.kkkkkkkk.', '..ssssss..', '..ssssss..', '..ssssss..', '...smms...', '.rrrrrrrr.', 'srrwwwwrrs', 's.rrwwrr.s', '..rrrrrr..', '..pp..pp..', '.bbb..bbb.'];
  var KEEP_FLICK = ['..kkkkkk..', '.kkkkkkkk.', '..ssssss..', '..sesses..', '..ssssss.s', '...smms..s', '.rrrrrrrrr', 'srrwwwwrr.', 's.rrwwrr..', '..rrrrrr..', '..pp..pp..', '.bbb..bbb.'];
  var KEEP_JOY = ['s.kkkkkk.s', 'skkkkkkkks', 'r.ssssss.r', 'r.sesses.r', 'rrssssssrr', '...smms...', '..rrrrrr..', '..rwwwwr..', '..rrwwrr..', '..rrrrrr..', '.pp....pp.', 'bbb....bbb'];
  var KEEP_SAD = ['..........', '..kkkkkk..', '.kkkkkkkk.', '..ssssss..', '..s-ss-s..', '...sOOs...', 'srrrrrrrrs', 's.rwwwwr.s', '..rrwwrr..', '..rrrrrr..', '..pp..pp..', '.bbb..bbb.'];
  var PAL_KEEP = { k: '#3a2a20', s: '#f0c8a0', e: INK, '-': INK, m: RED, O: INK, r: '#5a7a4a', w: CREAM, p: '#3a3040', b: '#2a1e18' };
  var FLAG = ['rrrr.', 'rrrrr', 'rrrr.', 'k....', 'k....', 'k....'];

  // ── 疑似3Dの投影 ───────────────────────────────────
  function sy(z) { return HOR + C / (z + CAM); }
  function sc(z) { return CAM / (z + CAM); }
  function sx(x, z) { return W / 2 + x * HALF0 * sc(z); }

  // ── 物理(本番・デモの作戦で共通) ───────────────────
  function decAt(R, z) {
    for (var i = 0; i < R.zones.length; i++) if (z >= R.zones[i].a && z <= R.zones[i].b) return R.zones[i].dec;
    return BASE_DEC;
  }
  function step(b, R, dt) {
    var sgn = b.v >= 0 ? 1 : -1;
    var nv = Math.abs(b.v) - decAt(R, b.z) * dt;
    var inHole = Math.abs(b.z - R.hole) < HOLE_Z && Math.abs(b.x) < HOLE_X;
    if (nv <= 0) { b.v = 0; return inHole ? 'in' : 'stop'; }
    b.v = sgn * nv;
    var oz = b.z;
    b.z += b.v * dt;
    b.x += b.tanA * Math.abs(b.v * dt) / 400;
    if (Math.abs(b.x) > 0.85) { b.x = b.x > 0 ? 0.85 : -0.85; b.tanA = -b.tanA; b.v *= 0.85; }
    if (R.sill && oz < R.sill && b.z >= R.sill) {
      if (Math.abs(b.v) < 220) { b.z = R.sill - 1; b.v = -Math.abs(b.v) * 0.4; return 'sill'; }
      b.v *= 0.75;
    }
    if (b.z > LEN - 10) { b.z = LEN - 10; b.v = -Math.abs(b.v) * 0.5; return 'wall'; }
    if (b.z < 0) { b.z = 0; b.v = 0; return 'stop'; }
    inHole = Math.abs(b.z - R.hole) < HOLE_Z && Math.abs(b.x) < HOLE_X;
    if (inHole && Math.abs(b.v) < V_CAP) return 'in';
    return '';
  }
  function simulate(R, v, tanA) {
    var b = { z: 0, x: 0, v: v, tanA: tanA };
    for (var n = 0; n < 900; n++) { var r = step(b, R, STEP); if (r === 'in' || r === 'stop') return r; }
    return 'stop';
  }
  var plans = {};
  function plan(ri) {
    if (plans[ri] !== undefined) return plans[ri];
    var ok = [];
    for (var v = 300; v <= 1100; v += 4) if (simulate(ROUNDS[ri], v, 0) === 'in') ok.push(v);
    plans[ri] = ok.length ? ok[Math.floor(ok.length / 2)] : 560;
    return plans[ri];
  }

  // ── 世界 ───────────────────────────────────────────
  function freshWorld(demo) {
    return {
      demo: !!demo, r: 0, ball: { z: 0, x: 0, v: 0, tanA: 0 }, shot: 'aim', shotT: 0, acc: 0, rollT: 0, spin: 0,
      power: 0, powerT: 0, clock: TIME_LIMIT, phase: 'ready', readyT: 0.8, stopT: 0, won: false, why: '',
      score: 0, holed: 0, misses: 0, perfects: 0, keepPose: 0, lastV: 0,
    };
  }
  function initGame() { w = freshWorld(false); flick = null; }

  function launch(v, tanA) {
    if (w.phase !== 'run' || w.shot !== 'aim') return false;
    if (v < 120) return false;
    v = Math.min(1100, v);
    w.ball = { z: 0, x: 0, v: v, tanA: Math.max(-0.6, Math.min(0.6, tanA)) };
    w.shot = 'roll'; w.rollT = 0; w.acc = 0; w.power = v / 1100; w.powerT = 1.2; w.keepPose = 0.3;
    game.audio.play('se_jump', 0.3);
    game.audio.tone(180 + v * 0.6, 0.12, { wave: 'square', volume: 0.08, slide: -60 });
    return true;
  }

  function resolve(res) {
    var R = ROUNDS[w.r];
    var hx = sx(0, R.hole), hy = sy(R.hole);
    if (res === 'in') {
      var v = Math.abs(w.ball.v);
      var perfect = v < 80;
      var pts = (perfect ? 400 : 220) * (R.gold ? 2 : 1);
      w.score += pts; w.holed++; w.keepPose = 0.6;
      if (perfect) w.perfects++;
      w.shot = 'in'; w.shotT = 0.7; w.ball.x = 0; w.ball.z = R.hole;
      game.feedback.good(hx, hy - 60, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? GOLD : CREAM, size: 52 });
      if (w.holed === 2 && !w.demo) { game.fx.popup('2 / 4', W / 2, H * 0.4, { color: GOLD, size: 60 }); game.audio.play('se_milestone', 0.4); }
      return;
    }
    w.shot = 'miss'; w.shotT = 0.6; w.misses++;
    var gap = Math.round(Math.abs(R.hole - w.ball.z) / 10);
    game.fx.flash('#ffffff', 0.1);
    game.audio.play('se_break', 0.3);
    if (gap > 0) game.fx.popup('あと' + gap + 'cm', sx(w.ball.x, w.ball.z), sy(w.ball.z) - 120, { color: GOLD, size: 40 });
  }

  function advance(dt) {
    if (!w.demo) w.clock -= dt;
    if (w.keepPose > 0) w.keepPose -= dt;
    if (w.powerT > 0) w.powerT -= dt;
    var R = ROUNDS[w.r];
    if (w.shot === 'roll') {
      w.rollT += dt;
      w.acc += Math.min(dt, 0.05);
      while (w.acc >= STEP && w.shot === 'roll') {
        w.acc -= STEP;
        var r = step(w.ball, R, STEP);
        w.spin += w.ball.v * STEP / 30;
        if (r === 'wall' || r === 'sill') game.audio.tone('C4', 0.06, { wave: 'square', volume: 0.1 });
        if (r === 'in' || r === 'stop' || w.rollT > 6) resolve(r === 'in' ? 'in' : 'stop');
      }
    } else if (w.shot === 'in' || w.shot === 'miss') {
      var before = w.shotT;
      w.shotT -= dt;
      if (w.shot === 'miss' && before > 0.25 && w.shotT <= 0.25) game.feedback.bad(sx(w.ball.x, w.ball.z), sy(w.ball.z) - 60, { text: 'MISS', size: 46 });
      if (w.shotT <= 0) {
        if (w.demo) {
          if (w.shot === 'in') { w.r = 1; w.ball = { z: 0, x: 0, v: 0, tanA: 0 }; w.shot = 'aim'; } else w.shot = 'idle';
          return;
        }
        if (w.shot === 'in') {
          if (w.r >= ROUNDS.length - 1) { w.phase = 'stop'; w.stopT = 0.6; w.won = true; game.fx.burst(sx(0, R.hole), sy(R.hole), { color: GOLD, count: 30, speed: 480 }); return; }
          w.r++;
        } else if (w.misses >= SPARE) { w.phase = 'stop'; w.stopT = 0.5; w.won = false; w.why = 'out'; return; }
        w.ball = { z: 0, x: 0, v: 0, tanA: 0 }; w.shot = 'aim';
        game.audio.tone('E5', 0.06, { wave: 'triangle', volume: 0.07 });
      }
    }
    if (w.clock <= 0 && w.phase === 'run') { w.clock = 0; w.phase = 'stop'; w.stopT = 0.5; w.won = false; w.why = 'time'; game.fx.flash('#ffffff', 0.12); }
  }

  function settle() {
    var stats = { holed: w.holed, total: ROUNDS.length, perfect: w.perfects, misses: w.misses };
    if (w.won) {
      w.score += Math.round(w.clock * 30) + (SPARE - w.misses) * 100;
      game.feedback.good(W / 2, H * 0.4, { text: 'CLEAR', color: GOLD, size: 70 });
      game.audio.play('se_success', 0.6);
      game.end.success(w.score, stats);
    } else {
      game.feedback.bad(sx(w.ball.x, w.ball.z), sy(w.ball.z) - 80, { text: w.why === 'time' ? 'TIME UP' : 'GAME OVER', size: 56 });
      game.audio.play('se_failure', 0.6);
      game.end.failure(stats);
    }
    MODE = 'RESULT';
  }

  // ── 描画 ───────────────────────────────────────────
  function band(z0, z1, x0, x1, col, alpha) {
    var y0 = sy(z1), y1 = sy(z0);
    for (var y = Math.floor(y0); y < y1; y += 4) {
      var z = C / (y - HOR) - CAM;
      var s = sc(z);
      game.draw.rect(W / 2 + x0 * HALF0 * s, y, (x1 - x0) * HALF0 * s, 4, col, alpha);
    }
  }

  function drawCorridor() {
    var t = game.time.elapsed, R = ROUNDS[w.r];
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.2, STYLE.bg[1]], [0.21, PLANK_D], [1, INK]]);
    // 壁(左右)と天井:横ストリップで奥へ収束
    for (var y = HOR; y < NEAR_Y; y += 4) {
      var z = C / (y - HOR) - CAM, s = sc(z);
      if (z > LEN) { game.draw.rect(0, y, W, 4, '#4e3224'); continue; }
      var half = HALF0 * s;
      var shadeA = 0.25 + 0.5 * (1 - s);
      var wcol = Math.floor(z / 120) % 2 === 0 ? '#5a3a2a' : '#4e3224';
      game.draw.rect(0, y, W / 2 - half, 4, wcol);
      game.draw.rect(W / 2 + half, y, W / 2 - half, 4, wcol);
      // 床板(奥ほど暗い=地平フォグ)。板の継ぎ目は z で刻む
      var seam = Math.floor(z / 60) % 2 === 0;
      game.draw.rect(W / 2 - half, y, half * 2, 4, seam ? PLANK : '#b87a40');
      game.draw.rect(W / 2 - half, y, half * 2, 4, STYLE.bg[0], shadeA * 0.6);
    }
    // 縦の板目(消失点へ向かう線)
    for (var k = -4; k <= 4; k++) game.draw.line(W / 2 + k * 0.25 * HALF0, NEAR_Y, W / 2 + k * 0.25 * HALF0 * sc(LEN), sy(LEN), PLANK_D, 3);
    // 突き当たりの壁と小窓(雪)
    var ey = sy(LEN), es = sc(LEN);
    game.draw.rect(W / 2 - HALF0 * es, ey - 700 * es, HALF0 * es * 2, 700 * es, '#4a3022');
    game.draw.rect(W / 2 - 40, ey - 120, 80, 70, '#8ab0d8');
    for (var f = 0; f < 5; f++) game.draw.rect(W / 2 - 36 + f * 16, ey - 116 + ((t * 30 + f * 13) % 60), 4, 4, '#ffffff');
    // 床の区間(敷物=赤、ワックス=光る水色)
    for (var i = 0; i < R.zones.length; i++) {
      var zn = R.zones[i];
      band(zn.a, zn.b, -0.85, 0.85, zn.col, zn.col === WAX ? 0.25 + 0.12 * Math.sin(t * 5) : 0.55);
      if (zn.col === RED) for (var st = zn.a + 20; st < zn.b; st += 40) band(st, st + 10, -0.85, 0.85, CREAM, 0.4);
    }
    // 敷居
    if (R.sill) band(R.sill - 12, R.sill + 12, -0.85, 0.85, PLANK_D, 1);
  }

  function drawHole() {
    var R = ROUNDS[w.r], t = game.time.elapsed;
    var hy = sy(R.hole), s = sc(R.hole);
    var pulse = 0.5 + 0.5 * Math.sin(t * 6);
    band(R.hole - HOLE_Z * 1.6, R.hole + HOLE_Z * 1.6, -HOLE_X * 1.4, HOLE_X * 1.4, '#ffffff', 0.15 + 0.2 * pulse);
    band(R.hole - HOLE_Z, R.hole + HOLE_Z, -HOLE_X, HOLE_X, INK, 0.85);
    game.draw.sprite(FLAG, { r: R.gold ? GOLD : RED, k: INK }, sx(HOLE_X + 0.15, R.hole) + 10, hy - 40 * s, Math.max(4, 14 * s), { anchor: 'center' });
  }

  function drawBall() {
    if (w.shot === 'idle') return;
    var b = w.ball;
    var z = Math.max(0, b.z), s = sc(z);
    var x = sx(b.x, z), y = sy(z);
    var r = 46 * s;
    var sink = w.shot === 'in' ? Math.min(1, (0.7 - w.shotT) / 0.4) : 0;
    var hl = w.shot === 'miss' && w.shotT > 0.25;
    if (hl) r *= 1.3;
    game.draw.circle(x, y + 4 * s, r * 1.05, '#000000', 0.35);
    var cy = y - r + sink * r * 1.2;
    game.draw.circle(x, cy, r * (1 - sink * 0.3), hl ? '#ffffff' : '#d8a060');
    if (!hl) {
      var band1 = Math.sin(w.spin) * r * 0.6;
      game.draw.rect(x - r * 0.8, cy + band1 - r * 0.1, r * 1.6, r * 0.2, PLANK_D, Math.cos(w.spin) > 0 ? 0.8 : 0.3);
      game.draw.circle(x - r * 0.35, cy - r * 0.35, r * 0.22, '#ffffff', 0.5);
    }
    if (w.shot === 'aim' && w.phase === 'run') game.draw.circle(x, cy, r + 16 + Math.sin(game.time.elapsed * 8) * 6, '#ffffff', 0.3);
  }

  function drawKeeper() {
    var t = game.time.elapsed;
    var art = Math.floor(t * 2) % 4 === 3 ? KEEP_B : KEEP_A;
    if (w.keepPose > 0 && w.shot === 'roll') art = KEEP_FLICK;
    if ((w.keepPose > 0 && w.shot === 'in') || (w.phase === 'stop' && w.won)) art = KEEP_JOY;
    if (MODE === 'RESULT' && !w.won) art = KEEP_SAD;
    game.draw.rect(0, NEAR_Y, W, H - NEAR_Y, '#2a1e18');
    game.draw.rect(0, NEAR_Y, W, 16, PLANK_D);
    game.draw.sprite(art, PAL_KEEP, W * 0.16, H * 0.86 + Math.sin(t * 3) * 5, 14, { anchor: 'center' });
    // 予備の球(棚)
    for (var i = 0; i < SPARE; i++) {
      var bx = W * 0.72 + i * 90, by = H * 0.84;
      game.draw.circle(bx, by, 32, i < SPARE - w.misses ? '#d8a060' : '#3a2a20');
      if (i < SPARE - w.misses) game.draw.circle(bx - 10, by - 10, 7, '#ffffff', 0.5);
    }
    // 弾いた強さのメーター
    if (w.powerT > 0) {
      game.draw.rect(W * 0.34, H * 0.9, W * 0.32, 26, INK);
      game.draw.rect(W * 0.34, H * 0.9, W * 0.32 * w.power, 26, w.power > 0.8 ? RED : GOLD);
    }
  }

  function label(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 3, { size: size, color: INK, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function drawStage() {
    drawCorridor();
    drawHole();
    drawBall();
    drawKeeper();
    for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.1);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, INK, 0.6);
    label('SCORE ' + w.score, W * 0.3, 72, 40, CREAM);
    label(w.holed + ' / ' + ROUNDS.length, W * 0.78, 72, 46, GOLD);
    var frac = Math.max(0, w.clock / TIME_LIMIT);
    game.draw.rect(80, 130, W - 160, 20, '#3a2a40');
    game.draw.rect(80, 130, (W - 160) * frac, 20, frac < 0.2 ? RED : WAX);
    for (var i = 0; i < ROUNDS.length; i++) game.draw.sprite(FLAG, { r: i < w.holed ? GOLD : '#4a3a50', k: CREAM }, W / 2 - 150 + i * 100, 196, 6, { anchor: 'center' });
  }

  // ── ATTRACT(実物理 + ゴーストの弾き) ────────────────
  // 1球目: ちょうどの強さで穴に止める(成功例) / 2球目: 敷物で減速して手前で止まる(失敗例)
  var demo = { t: 0, gx: W / 2, gy: H * 0.82, press: false, wait: 0.8, k: 0 };
  var DEMO_CYCLE = 6.2;
  function runDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) { w = freshWorld(true); w.phase = 'run'; demo.wait = 0.8; demo.k = 0; }
    if (w.shot === 'aim' && demo.k < 2) {
      demo.wait -= dt;
      var p = Math.max(0, Math.min(1, 1 - demo.wait / 0.35));
      demo.gx = W / 2; demo.gy = H * 0.84 - p * 260;
      demo.press = demo.wait < 0.35;
      if (demo.wait <= 0) { launch(demo.k === 0 ? plan(0) : 520, 0); demo.k++; demo.wait = 0.6; }
    } else {
      demo.press = false;
      demo.gx += (W / 2 - demo.gx) * Math.min(1, dt * 3); demo.gy += (H * 0.84 - demo.gy) * Math.min(1, dt * 3);
    }
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
    if (MODE !== 'PLAYING' || w.phase !== 'run' || w.shot !== 'aim') { flick = null; return; }
    flick = { pts: [{ x: x, y: y, t: game.time.elapsed }] };
    game.audio.play('se_tap', 0.15);
  });

  game.onMove(function (x, y) {
    if (!flick) return;
    flick.pts.push({ x: x, y: y, t: game.time.elapsed });
    if (flick.pts.length > 14) flick.pts.shift();
    if (flick.pts.length % 5 === 0) game.fx.burst(x, y, { color: CREAM, count: 1, speed: 40 });
  });

  game.onRelease(function (x, y) {
    if (!flick) return;
    var now = game.time.elapsed, pts = flick.pts, first = pts[0];
    for (var i = pts.length - 1; i >= 0; i--) if (now - pts[i].t <= 0.12) first = pts[i];
    var dtv = Math.max(0.03, now - first.t);
    var vx = (x - first.x) / dtv, vy = (y - first.y) / dtv;
    flick = null;
    var ok = vy < -200 && launch(-vy * 0.22, vx / -vy);
    if (!ok) { game.audio.play('se_tap', 0.08); game.fx.burst(x, y, { color: PLANK_D, count: 3, speed: 60 }); }
  });

  game.onUpdate(function (dt) {
    if (!w) initGame();
    if (MODE === 'ATTRACT') {
      runDemo(dt);
      drawStage();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 230, INK, 0.6);
      label(TITLE, W / 2, 92, 70, GOLD);
      label('HI-SCORE ' + game.best, W / 2, 172, 34, CREAM);
      if (Math.floor(game.time.elapsed * 1.6) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.965, 40, GOLD);
      else label('INSERT COIN', W / 2, H * 0.965, 34, CREAM);
      return;
    }
    if (MODE === 'RESULT') {
      drawStage();
      game.draw.rect(0, H * 0.3, W, H * 0.22, INK, 0.8);
      label(w.won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.35, 86, w.won ? GOLD : RED);
      label('SCORE ' + w.score, W / 2, H * 0.41, 50, CREAM);
      label(w.holed + ' / ' + ROUNDS.length + '   PERFECT ' + w.perfects, W / 2, H * 0.455, 36, WAX);
      if (!w.won) label('あと' + (ROUNDS.length - w.holed) + '穴!', W / 2, H * 0.495, 44, GOLD);
      else if (w.score > game.best) label('NEW RECORD', W / 2, H * 0.495, 46, GOLD);
      else label('BEST ' + game.best, W / 2, H * 0.495, 40, CREAM);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.965, 34, CREAM);
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
      label(w.readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 96, GOLD);
      game.draw.hand(W / 2, H * 0.84 - (0.8 - w.readyT) * 320, { press: true, scale: 12, alpha: 0.7 });
    }
  });

  game.onStart(function () {
    // 雪の夜の山小屋、ゆっくりした三拍子
    game.audio.melody([
      ['A4', 1], ['C5', 0.5], ['B4', 0.5], ['A4', 1], ['E4', 1], ['G4', 0.5], ['A4', 0.5], ['B4', 2],
      ['C5', 1], ['B4', 0.5], ['A4', 0.5], ['G4', 1], ['E4', 1], ['F4', 0.5], ['G4', 0.5], ['A4', 2],
    ], { tempo: 108, wave: 'triangle', volume: 0.06, loop: true, bass: [['A2', 3], ['E2', 3], ['F2', 3], ['E2', 3]], bassVolume: 0.05 });
    MODE = 'ATTRACT';
    initGame();
    demo.t = 0;
  });
})(game);

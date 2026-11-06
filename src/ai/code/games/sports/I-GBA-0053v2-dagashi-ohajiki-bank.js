// I-GBA-0053v2-dagashi-ohajiki-bank.js
// 駄菓子屋おはじきバンク — 指で弾いたおはじきを木の盤の縁ではね返らせ、積み木の陰にある穴へ落とす
// 操作: 盤の手前のおはじきを指で弾く(弾く向き=転がる向き、弾く速さ=勢い)。縁に当たると同じ角度ではね返る。穴の上を勢いよく通ると落ちずに越える
// 終わり: 4枚の盤すべてで穴に落とせばCLEAR(外れたら同じ盤で何度でも弾き直せる)。20秒が尽きればGAME OVER。赤いトゲ穴に落ちると弾き直しで時間を失う
// @mechanic: flick_launch
// @theme: dagashi_backroom_ohajiki_bank
// 世界観: 昔ながらの駄菓子屋の奥の間で、店番の少年が木の盤におはじきを弾き、縁のはね返りを読んで積み木の陰の穴へ次々と落とす
// 残るもの: 正誤(CLEAR/GAME OVER) + 落とした盤の数・はね返り数・弾いた回数・スコア
// スタイル: 70s MONO

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  // 70s MONO: 黒地に白ドット。画面の帯ごとに単色セロハンを重ねる(上=水色/盤=琥珀/手元=桃)
  var STYLE = { bg: ['#000000', '#0c0c0c'], main: ['#ffffff', '#9a9a9a', '#3a3a3a'], accent: ['#ffb43a', '#3ae0ff'] };
  var WHITE = STYLE.main[0], GREY = STYLE.main[1], DIM = STYLE.main[2], RED = '#ff3a3a', PINK = '#ff5ab4';

  var TITLE = 'OHAJIKI BANK';
  var TIME_LIMIT = 20;
  var BOARD = { l: 120, r: 960, t: H * 0.17, b: H * 0.73 };
  var BALL_R = 34, HOLE_R = 48;
  var START = { x: W / 2, y: H * 0.68 };
  var STEP = 1 / 120;
  var SINK_MAX = 1300;
  var LAYOUTS = [
    { hole: { x: 540, y: 520 }, blocks: [], red: [] },
    { hole: { x: 300, y: 520 }, blocks: [[380, 820, 700, 870]], red: [] },
    { hole: { x: 800, y: 450 }, blocks: [[660, 560, 840, 610]], red: [{ x: 330, y: 640 }] },
    { hole: { x: 540, y: 440 }, blocks: [[420, 640, 520, 690], [560, 640, 660, 690]], red: [{ x: 800, y: 720 }] },
  ];

  var MODE = 'ATTRACT';
  var w = null;
  var drag = null;

  var BOY_A = ['...hhhh...', '..hhhhhh..', '..hssssh..', '..sesses..', '..ssmmss..', '...ssss...', '.aaaaaaaa.', 'saaaaaaaas', 's.aaaaaa.s', '..aaaaaa..', '..pp..pp..', '..pp..pp..'];
  var BOY_FLICK = ['...hhhh..s', '..hhhhhh.s', '..hssssh.a', '..sesses.a', '..ssmmssaa', '...ssssaa.', '.aaaaaaa..', 'saaaaaaa..', 's.aaaaaa..', '..aaaaaa..', '..pp..pp..', '..pp..pp..'];
  var BOY_CHEER = ['s..hhhh..s', 's.hhhhhh.s', 'a.hssssh.a', 'a.sesses.a', 'aassmmssaa', '...ssss...', '..aaaaaa..', '..aaaaaa..', '..aaaaaa..', '..aaaaaa..', '.pp....pp.', '.pp....pp.'];
  var BOY_SAD = ['..........', '...hhhh...', '..hhhhhh..', '..hssssh..', '..s-ss-s..', '..ssmmss..', '.aaaaaaaa.', 'saaaaaaaas', 's.aaaaaa.s', '..aaaaaa..', '..pp..pp..', '..pp..pp..'];
  var PAL_BOY = { h: WHITE, s: GREY, e: '#000000', '-': '#000000', m: WHITE, a: WHITE, p: GREY };

  // ── 物理(本番・デモ・デモの作戦立てで共通) ─────────
  function newBall() { return { x: START.x, y: START.y, vx: 0, vy: 0, bounces: 0 }; }

  function stepBall(b, lay, dt) {
    b.x += b.vx * dt; b.y += b.vy * dt;
    var bounced = false;
    var l = BOARD.l + BALL_R, r = BOARD.r - BALL_R, t = BOARD.t + BALL_R, bt = BOARD.b - BALL_R;
    if (b.x < l) { b.x = l; b.vx = -b.vx; bounced = true; }
    if (b.x > r) { b.x = r; b.vx = -b.vx; bounced = true; }
    if (b.y < t) { b.y = t; b.vy = -b.vy; bounced = true; }
    if (b.y > bt) { b.y = bt; b.vy = -b.vy; bounced = true; }
    for (var i = 0; i < lay.blocks.length; i++) {
      var k = lay.blocks[i];
      var cx = Math.max(k[0], Math.min(k[2], b.x)), cy = Math.max(k[1], Math.min(k[3], b.y));
      var dx = b.x - cx, dy = b.y - cy, d2 = dx * dx + dy * dy;
      if (d2 < BALL_R * BALL_R) {
        var d = Math.sqrt(d2) || 1, nx = dx / d, ny = dy / d;
        if (d2 === 0) { nx = 0; ny = 1; }
        b.x = cx + nx * BALL_R; b.y = cy + ny * BALL_R;
        var dot = b.vx * nx + b.vy * ny;
        if (dot < 0) { b.vx -= 2 * dot * nx; b.vy -= 2 * dot * ny; bounced = true; }
      }
    }
    if (bounced) { b.vx *= 0.85; b.vy *= 0.85; b.bounces++; }
    var sp = Math.hypot(b.vx, b.vy);
    var ns = Math.max(0, sp * Math.exp(-1.2 * dt) - 60 * dt);
    if (sp > 0) { b.vx *= ns / sp; b.vy *= ns / sp; }
    // 穴: 勢いが強すぎると越えていく
    if (Math.hypot(b.x - lay.hole.x, b.y - lay.hole.y) < HOLE_R - 2) {
      if (ns < SINK_MAX) return 'sink';
    }
    for (var j = 0; j < lay.red.length; j++) {
      if (Math.hypot(b.x - lay.red[j].x, b.y - lay.red[j].y) < HOLE_R - 8 && ns < SINK_MAX) return 'red';
    }
    if (ns < 20) return 'stop';
    return bounced ? 'bounce' : '';
  }

  function simulate(lay, vx, vy) {
    var b = newBall(); b.vx = vx; b.vy = vy;
    for (var n = 0; n < 600; n++) {
      var r = stepBall(b, lay, STEP);
      if (r === 'sink' || r === 'red' || r === 'stop') return r;
    }
    return 'stop';
  }

  // デモ用の作戦: 縁に映した穴の鏡像へ向けて、落ちる勢いの真ん中を選ぶ
  var demoPlan = null;
  function planBank() {
    var lay = LAYOUTS[1];
    var mx = 2 * (BOARD.l + BALL_R) - lay.hole.x, my = lay.hole.y;
    var base = Math.atan2(my - START.y, mx - START.x);
    for (var da = 0; da <= 6; da++) {
      for (var sgn = -1; sgn <= 1; sgn += 2) {
        var a = base + sgn * da * 0.006;
        var ok = [];
        for (var s = 700; s <= 2400; s += 50) if (simulate(lay, Math.cos(a) * s, Math.sin(a) * s) === 'sink') ok.push(s);
        if (ok.length >= 3) { var sp = ok[Math.floor(ok.length / 2)]; return { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp }; }
      }
    }
    return { vx: Math.cos(base) * 1500, vy: Math.sin(base) * 1500 };
  }

  // ── 世界 ───────────────────────────────────────────
  function freshWorld(demo) {
    return {
      demo: !!demo, board: demo ? 1 : 0, ball: newBall(), shot: 'aim', shotT: 0, acc: 0, aimPulse: 0,
      clock: TIME_LIMIT, phase: 'ready', readyT: 0.8, stopT: 0, won: false, betweenT: 0,
      score: 0, sunk: 0, shots: 0, banks: 0, tries: 0, firstTry: 0, culprit: null, boyPose: 0,
    };
  }

  function initGame() { w = freshWorld(false); drag = null; }

  function lay() { return LAYOUTS[w.board]; }

  function shoot(vx, vy) {
    if (w.phase !== 'run' || w.shot !== 'aim') return false;
    var sp = Math.hypot(vx, vy);
    if (sp < 250) return false;
    if (sp > 2600) { vx *= 2600 / sp; vy *= 2600 / sp; sp = 2600; }
    w.ball = newBall(); w.ball.vx = vx; w.ball.vy = vy;
    w.shot = 'roll'; w.shotT = 0; w.acc = 0; w.shots++; w.tries++; w.boyPose = 0.3;
    game.audio.play('se_jump', 0.2 + sp / 6000);
    game.audio.tone(200 + sp * 0.35, 0.06, { wave: 'square', volume: 0.08 });
    return true;
  }

  function onSink() {
    var b = w.ball, L = lay();
    w.shot = 'sink'; w.shotT = 0.35; w.sunk++;
    var first = w.tries === 1;
    if (first) w.firstTry++;
    w.banks += b.bounces;
    var pts = (200 + b.bounces * 100) * (first ? 2 : 1);
    w.score += pts;
    game.feedback.good(L.hole.x, L.hole.y - 60, { text: b.bounces > 0 ? (first ? 'PERFECT' : 'NICE') : 'GOOD', color: STYLE.accent[0], size: 50 });
    if (first) game.fx.popup('x2', L.hole.x + 90, L.hole.y - 120, { color: STYLE.accent[1], size: 44 });
  }

  function onRed(hz) {
    w.shot = 'reset'; w.shotT = 0.5; w.culprit = hz; w.clock -= 1.5;
    game.fx.flash('#ffffff', 0.1);
    game.feedback.bad(hz.x, hz.y - 60, { text: 'MISS', size: 46 });
  }

  function advance(dt) {
    if (!w.demo && w.phase === 'run') w.clock -= dt;
    if (w.boyPose > 0) w.boyPose -= dt;
    w.aimPulse += dt;
    if (w.shot === 'roll') {
      w.shotT += dt;
      w.acc += Math.min(dt, 0.05);
      while (w.acc >= STEP && w.shot === 'roll') {
        w.acc -= STEP;
        var r = stepBall(w.ball, lay(), STEP);
        if (r === 'bounce') game.audio.tone(520 + w.ball.bounces * 60, 0.04, { wave: 'square', volume: 0.07 });
        if (r === 'sink') onSink();
        else if (r === 'red') { for (var i = 0; i < lay().red.length; i++) if (Math.hypot(w.ball.x - lay().red[i].x, w.ball.y - lay().red[i].y) < HOLE_R) onRed(lay().red[i]); }
        else if (r === 'stop' || w.shotT > 4.5) {
          w.shot = 'reset'; w.shotT = 0.4;
          game.feedback.bad(w.ball.x, w.ball.y - 60, { text: 'MISS', size: 40, shake: 3 });
        }
      }
    } else if (w.shot === 'sink') {
      w.shotT -= dt;
      if (w.shotT <= 0) {
        if (w.demo) { w.shot = 'done'; }
        else if (w.board >= LAYOUTS.length - 1) {
          w.phase = 'stop'; w.stopT = 0.6; w.won = true;
          game.fx.burst(lay().hole.x, lay().hole.y, { color: STYLE.accent[0], count: 30, speed: 520 });
        } else {
          w.phase = 'between'; w.betweenT = 0.7;
          game.audio.play('se_milestone', 0.4);
          game.fx.popup((w.board + 1) + ' / ' + LAYOUTS.length, W / 2, H * 0.45, { color: WHITE, size: 64 });
        }
      }
    } else if (w.shot === 'reset') {
      w.shotT -= dt;
      if (w.shotT <= 0) { w.ball = newBall(); w.shot = 'aim'; w.culprit = null; w.aimPulse = 0; }
    }
    if (w.phase === 'run' && w.clock <= 0) {
      w.clock = 0; w.phase = 'stop'; w.stopT = 0.5; w.won = false; w.culprit = { x: w.ball.x, y: w.ball.y };
      game.fx.flash('#ffffff', 0.12);
      game.audio.play('se_break', 0.35);
    }
  }

  function settle() {
    var stats = { boards: w.sunk, total: LAYOUTS.length, shots: w.shots, banks: w.banks };
    if (w.won) {
      w.score += Math.round(w.clock * 40);
      game.feedback.good(W / 2, H * 0.4, { text: 'CLEAR', color: STYLE.accent[0], size: 70 });
      game.audio.play('se_success', 0.6);
      game.end.success(w.score, stats);
    } else {
      game.feedback.bad(w.ball.x, w.ball.y - 80, { text: 'TIME UP', size: 56 });
      game.audio.play('se_failure', 0.6);
      game.end.failure(stats);
    }
    MODE = 'RESULT';
  }

  // ── 描画 ───────────────────────────────────────────
  function drawBoard() {
    var t = game.time.elapsed, L = lay();
    game.draw.gradient(0, H, [STYLE.bg[0], STYLE.bg[1]]);
    // 盤の木目 = 白ドットの格子
    for (var y = BOARD.t + 24; y < BOARD.b; y += 48) for (var x = BOARD.l + 24; x < BOARD.r; x += 48) game.draw.rect(x, y, 4, 4, DIM);
    game.draw.line(BOARD.l - 12, BOARD.t - 12, BOARD.r + 12, BOARD.t - 12, WHITE, 16);
    game.draw.line(BOARD.l - 12, BOARD.b + 12, BOARD.r + 12, BOARD.b + 12, WHITE, 16);
    game.draw.line(BOARD.l - 12, BOARD.t - 12, BOARD.l - 12, BOARD.b + 12, WHITE, 16);
    game.draw.line(BOARD.r + 12, BOARD.t - 12, BOARD.r + 12, BOARD.b + 12, WHITE, 16);
    // 穴(ゴール): 光る輪
    var hp = 0.5 + 0.5 * Math.sin(t * 5);
    game.draw.circle(L.hole.x, L.hole.y, HOLE_R + 22 + hp * 10, WHITE, 0.12);
    game.draw.circle(L.hole.x, L.hole.y, HOLE_R + 6, WHITE);
    game.draw.circle(L.hole.x, L.hole.y, HOLE_R, '#000000');
    // 赤いトゲ穴(危険)
    for (var j = 0; j < L.red.length; j++) {
      var rz = L.red[j];
      var hot = w.culprit === rz;
      for (var s = 0; s < 10; s++) {
        var a = s / 10 * Math.PI * 2 + t * 0.8;
        game.draw.line(rz.x + Math.cos(a) * HOLE_R, rz.y + Math.sin(a) * HOLE_R, rz.x + Math.cos(a) * (HOLE_R + 26), rz.y + Math.sin(a) * (HOLE_R + 26), hot ? WHITE : RED, 6);
      }
      game.draw.circle(rz.x, rz.y, hot ? HOLE_R + 16 : HOLE_R + 4, hot ? WHITE : RED);
      game.draw.circle(rz.x, rz.y, HOLE_R - 4, '#000000');
    }
    // 積み木
    for (var i = 0; i < L.blocks.length; i++) {
      var k = L.blocks[i];
      game.draw.rect(k[0], k[1], k[2] - k[0], k[3] - k[1], WHITE);
      for (var bx = k[0] + 12; bx < k[2] - 8; bx += 24) game.draw.rect(bx, k[1] + 10, 8, k[3] - k[1] - 20, GREY);
    }
  }

  function drawBall() {
    var b = w.ball, t = game.time.elapsed;
    var sc = 1;
    if (w.shot === 'sink') sc = Math.max(0.1, w.shotT / 0.35);
    var hl = (w.phase === 'stop' && !w.won) || (w.shot === 'reset' && w.culprit);
    var r = BALL_R * sc * (hl ? 1.3 : 1);
    if (w.shot === 'aim' && w.phase === 'run') game.draw.circle(b.x, b.y, BALL_R + 18 + Math.sin(t * 8) * 6, WHITE, 0.25);
    game.draw.circle(b.x + 6, b.y + 8, r, '#000000', 0.5);
    game.draw.circle(b.x, b.y, r, hl ? WHITE : STYLE.accent[1]);
    game.draw.circle(b.x, b.y, r * 0.62, '#000000', 0.35);
    var sw = Math.atan2(b.vy, b.vx) + t * 2;
    game.draw.line(b.x - Math.cos(sw) * r * 0.5, b.y - Math.sin(sw) * r * 0.5, b.x + Math.cos(sw) * r * 0.5, b.y + Math.sin(sw) * r * 0.5, WHITE, 6);
    game.draw.circle(b.x - r * 0.35, b.y - r * 0.35, r * 0.2, WHITE);
  }

  function drawAim() {
    if (!drag || w.shot !== 'aim') return;
    var dx = drag.x - drag.x0, dy = drag.y - drag.y0;
    var len = Math.min(260, Math.hypot(dx, dy));
    if (len < 10) return;
    var ux = dx / Math.hypot(dx, dy), uy = dy / Math.hypot(dx, dy);
    for (var k = 1; k <= 5; k++) game.draw.circle(w.ball.x + ux * len * k / 5, w.ball.y + uy * len * k / 5, 6 + k, WHITE, 0.6);
  }

  function drawBoy() {
    var t = game.time.elapsed;
    var art = BOY_A;
    if (MODE === 'RESULT' && !w.won) art = BOY_SAD;
    else if ((w.phase === 'stop' && w.won) || w.shot === 'sink') art = BOY_CHEER;
    else if (w.boyPose > 0) art = BOY_FLICK;
    var bob = Math.round(Math.sin(t * 3)) * 6;
    game.draw.rect(0, H * 0.79, W, 16, GREY);
    game.draw.sprite(art, PAL_BOY, W * 0.5, H * 0.87 + bob, 14, { anchor: 'center' });
    // 駄菓子の瓶(手元の小物)
    for (var j = 0; j < 3; j++) {
      var jx = W * 0.14 + j * 110, jy = H * 0.86;
      game.draw.rect(jx - 34, jy - 60, 68, 120, WHITE, 0.25);
      game.draw.rect(jx - 40, jy - 72, 80, 16, WHITE);
      for (var c = 0; c < 4; c++) game.draw.circle(jx - 14 + (c % 2) * 28, jy - 20 + Math.floor(c / 2) * 36, 10, j === 1 ? STYLE.accent[0] : WHITE, 0.8);
    }
    // 残りの盤(右下の札)
    for (var r = 0; r < LAYOUTS.length; r++) {
      var on = r < w.sunk;
      game.draw.rect(W * 0.7 + r * 66, H * 0.84, 48, 48, on ? STYLE.accent[0] : DIM);
      if (r === w.board && !on) game.draw.rect(W * 0.7 + r * 66, H * 0.84 + 54, 48, 6, WHITE, 0.5 + 0.5 * Math.sin(t * 6));
    }
  }

  function cellophane() {
    game.draw.rect(0, 0, W, H * 0.15, STYLE.accent[1], 0.16);
    game.draw.rect(0, H * 0.15, W, H * 0.62, STYLE.accent[0], 0.16);
    game.draw.rect(0, H * 0.77, W, H * 0.23, PINK, 0.14);
    for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.22);
  }

  function label(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 3, { size: size, color: '#000000', bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function drawStage() {
    drawBoard();
    drawAim();
    drawBall();
    drawBoy();
    cellophane();
  }

  function drawHud() {
    label('SCORE ' + w.score, W * 0.3, 78, 40, WHITE);
    label((w.board + 1) + ' / ' + LAYOUTS.length, W * 0.78, 78, 44, STYLE.accent[0]);
    var frac = Math.max(0, w.clock / TIME_LIMIT);
    game.draw.rect(80, 140, W - 160, 20, DIM);
    game.draw.rect(80, 140, (W - 160) * frac, 20, frac < 0.2 && Math.floor(game.time.elapsed * 8) % 2 ? RED : WHITE);
    game.draw.rect(80, 180, (W - 160) * (w.sunk / LAYOUTS.length), 10, STYLE.accent[0]);
  }

  // ── ATTRACT(実物理 + ゴーストの弾き) ────────────────
  // 1発目: 穴へまっすぐ弾いて積み木に当たる(失敗例) / 2発目: 縁のはね返りで落とす(成功例)
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: false, k: 0 };
  var DEMO_CYCLE = 7.2;
  var DEMO_SHOTS = [{ at: 0.7 }, { at: 0 }];
  function demoFlick(k) {
    var L = LAYOUTS[1];
    if (k === 0) {
      var a = Math.atan2(L.hole.y - START.y, L.hole.x - START.x);
      return { vx: Math.cos(a) * 1500, vy: Math.sin(a) * 1500 };
    }
    if (!demoPlan) demoPlan = planBank();
    return demoPlan;
  }
  function runDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) { w = freshWorld(true); w.phase = 'run'; demo.k = 0; demo.wait = 0.7; }
    if (w.shot === 'aim' && demo.k < DEMO_SHOTS.length) {
      demo.wait -= dt;
      var v = demoFlick(demo.k);
      var sp = Math.hypot(v.vx, v.vy);
      var ux = v.vx / sp, uy = v.vy / sp;
      var p = Math.max(0, Math.min(1, 1 - demo.wait / 0.5));
      demo.gx = START.x - ux * 40 + ux * 200 * p; demo.gy = START.y + 60 - uy * 40 + uy * 200 * p;
      demo.press = demo.wait < 0.5;
      if (demo.wait <= 0) { shoot(v.vx, v.vy); demo.k++; demo.wait = 0.5; }
    } else {
      demo.press = false;
      demo.gx += (W / 2 - demo.gx) * Math.min(1, dt * 3); demo.gy += (H * 0.8 - demo.gy) * Math.min(1, dt * 3);
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
    if (w.shot !== 'aim') game.audio.play('se_tap', 0.08);
  });

  game.onPress(function (x, y) {
    if (MODE !== 'PLAYING' || w.phase !== 'run' || w.shot !== 'aim') { drag = null; return; }
    drag = { x0: x, y0: y, x: x, y: y, pts: [{ x: x, y: y, t: game.time.elapsed }] };
    game.audio.play('se_tap', 0.12);
  });

  game.onMove(function (x, y) {
    if (!drag) return;
    drag.x = x; drag.y = y;
    drag.pts.push({ x: x, y: y, t: game.time.elapsed });
    if (drag.pts.length > 12) drag.pts.shift();
    if (drag.pts.length % 4 === 0) game.fx.burst(x, y, { color: WHITE, count: 1, speed: 40 });
  });

  game.onRelease(function (x, y) {
    if (!drag) return;
    drag.pts.push({ x: x, y: y, t: game.time.elapsed });
    var now = game.time.elapsed, first = drag.pts[0];
    for (var i = drag.pts.length - 1; i >= 0; i--) if (now - drag.pts[i].t <= 0.12) first = drag.pts[i];
    var dtv = Math.max(0.03, now - first.t);
    var vx = (x - first.x) / dtv * 0.55, vy = (y - first.y) / dtv * 0.55;
    drag = null;
    if (!shoot(vx, vy)) { game.audio.play('se_tap', 0.1); game.fx.burst(x, y, { color: GREY, count: 3, speed: 60 }); }
  });

  game.onUpdate(function (dt) {
    if (!w) initGame();
    if (MODE === 'ATTRACT') {
      runDemo(dt);
      drawStage();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      label(TITLE, W / 2, 92, 72, STYLE.accent[0]);
      label('HI-SCORE ' + game.best, W / 2, 172, 34, WHITE);
      if (Math.floor(game.time.elapsed * 1.6) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.965, 40, STYLE.accent[0]);
      else label('INSERT COIN', W / 2, H * 0.965, 34, WHITE);
      return;
    }
    if (MODE === 'RESULT') {
      drawStage();
      game.draw.rect(0, H * 0.27, W, H * 0.22, '#000000', 0.8);
      label(w.won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.32, 86, w.won ? STYLE.accent[0] : RED);
      label('SCORE ' + w.score, W / 2, H * 0.38, 50, WHITE);
      label(w.sunk + ' / ' + LAYOUTS.length + '   x' + w.banks, W / 2, H * 0.425, 36, STYLE.accent[1]);
      if (!w.won) label('あと' + (LAYOUTS.length - w.sunk) + '枚!', W / 2, H * 0.465, 44, STYLE.accent[0]);
      else if (w.score > game.best) label('NEW RECORD', W / 2, H * 0.465, 46, STYLE.accent[0]);
      else label('BEST ' + game.best, W / 2, H * 0.465, 40, WHITE);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.965, 34, WHITE);
      return;
    }
    if (w.phase === 'ready') {
      w.readyT -= dt;
      if (w.readyT <= 0) { w.phase = 'run'; game.audio.play('se_tap', 0.3); }
    } else if (w.phase === 'run') {
      advance(dt);
    } else if (w.phase === 'between') {
      w.betweenT -= dt;
      if (w.betweenT <= 0) { w.board++; w.ball = newBall(); w.shot = 'aim'; w.tries = 0; w.phase = 'run'; }
    } else if (w.phase === 'stop') {
      w.stopT -= dt;
      if (w.stopT <= 0) settle();
    }
    drawStage();
    drawHud();
    if (w.phase === 'ready') {
      label(w.readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.44, 96, STYLE.accent[0]);
      game.draw.hand(START.x, START.y + 90 - (0.8 - w.readyT) * 180, { press: true, scale: 12, alpha: 0.7 });
    }
  });

  game.onStart(function () {
    // 70s MONO: 矩形波の単音。間を空けて緊張を残す
    game.audio.melody([['A4', 0.5], ['R', 0.5], ['C5', 0.25], ['A4', 0.25], ['R', 0.5], ['E5', 0.5], ['R', 0.5], ['D5', 0.25], ['C5', 0.25], ['A4', 1], ['R', 1]], {
      tempo: 120, wave: 'square', volume: 0.04, loop: true,
    });
    MODE = 'ATTRACT';
    initGame();
    demo.t = 0;
  });
})(game);

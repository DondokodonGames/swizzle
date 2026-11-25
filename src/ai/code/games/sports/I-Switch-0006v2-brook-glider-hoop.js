// I-Switch-0006v2-brook-glider-hoop.js
// 小川ごえグライダー — ゴム動力の模型グライダーを引く向きと強さで放ち、小川の向こうの芝生に置かれた輪の中へぴったり着地させる
// 操作: 画面のどこかを押して左下へ引き、離すと引いた逆向きへグライダーが飛ぶ。引く長さ=速さ。上り坂のあとは滑空して少しずつ降りる。急すぎる角度で放つと頂上で失速してすとんと落ちる。向こう岸の吹き流しの向きと長さが滑空中の風
// 終わり: 5機のうち3機を輪の中に着地させればCLEAR。3機外す(小川に落とす/輪の外)/20秒で決着しなければGAME OVER
// @mechanic: slingshot
// @theme: brook_glider_hoop
// 世界観: 秋の運動公園で、模型好きの子どもがゴムで飛ばす手作りのグライダーを、吹き流しの風を読みながら小川の向こうの芝生に置いた輪の中へ着地させていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 輪に入った数・輪の中心への近さ(PERFECT数)のスコア
// スタイル: 90s LOW POLY

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  // 90s LOW POLY: 面はベタ塗り(横1pxストリップ)、輪郭は line、頂点を微小に揺らすジッター、遠景はフォグで潰す
  var STYLE = { bg: ['#7ab0d8', '#c8dce8', '#e8d8b8'], main: ['#d86a2a', '#6a9a3a', '#3a6a9a'], accent: ['#ffd23a', '#e83a3a'] };
  var LINE = '#2a2018';

  var GLIDERS = 5, NEED = 3, MISSES = 3, TIME_LIMIT = 20;
  var GROUND = H * 0.66, BROOK_X0 = 330, BROOK_X1 = 620, BROOK_Y = H * 0.71;
  var LAUNCH = { x: 190, y: GROUND - 120 };
  var GRAV = 900, PULL_K = 4.0, PULL_MAX = 220, SINK = 220, STALL_DEG = 58;
  var ROUNDS = [
    { hx: 780, hr: 110, wind: 0 },
    { hx: 900, hr: 100, wind: -70 },
    { hx: 720, hr: 92, wind: 60 },
    { hx: 960, hr: 84, wind: 90 },
    { hx: 830, hr: 78, wind: -90 },
  ];

  var phase = 'ATTRACT';
  var s = null;

  var KID_IDLE = ['..cccc..', '.cccccc.', '..ffff..', '..fefe..', '..ffff..', '.jjjjjj.', 'fjjjjjjf', '..jjjj..', '..pppp..', '..p..p..', '.kk..kk.'];
  var KID_PULL = ['...cccc.', '..cccccc', '...ffff.', '...fefe.', '...ffff.', '..jjjjjj', '.fjjjjj.', 'f..jjjj.', '...pppp.', '..p...p.', '.kk...kk'];
  var KID_YAY = ['f.cccc.f', 'fccccccf', 'j.ffff.j', 'j.fefe.j', '..ffff..', '.jjjjjj.', '..jjjj..', '..jjjj..', '..pppp..', '..p..p..', '.kk..kk.'];
  var KID_SAD = ['........', '..cccc..', '.cccccc.', '..ffff..', '..eeee..', '..ffff..', '.jjjjjj.', 'f.jjjj.f', '..pppp..', '..p..p..', '.kk..kk.'];
  var KID_PAL = { c: STYLE.main[2], f: '#f0c090', e: LINE, j: STYLE.main[0], p: '#4a4a5a', k: '#2a2018' };
  var GL_LEVEL = ['.........w', 'wwwwwwwwwr', '...ww.....'];
  var GL_DIVE = ['......w...', '...wwwwr..', 'wwwww.....', '..w.......'];
  var GL_PAL = { w: '#fff8e8', r: STYLE.accent[1] };
  var GL_WHITE = { w: '#ffffff', r: '#ffffff' };

  function freshPark() {
    return {
      step: 'ready', readyT: 0.8, clock: TIME_LIMIT,
      round: 0, glider: null, drag: null, landed: [],
      hits: 0, misses: 0, perfects: 0, chain: 0, score: 0, closest: 9999,
      mood: 0, moodGood: true, waitT: 0, stopT: 0, won: false, culprit: null, prevBest: 0, partyT: 0,
    };
  }

  function groundAt(x) { return x > BROOK_X0 && x < BROOK_X1 ? BROOK_Y : GROUND; }

  function pullVel(dx, dy) {
    var len = Math.hypot(dx, dy);
    if (len > PULL_MAX) { dx *= PULL_MAX / len; dy *= PULL_MAX / len; len = PULL_MAX; }
    return { vx: -dx * PULL_K, vy: -dy * PULL_K, len: len, dx: dx, dy: dy };
  }

  function makeGlider(vx, vy, wind) {
    var ang = Math.atan2(-vy, vx) * 180 / Math.PI;
    return { x: LAUNCH.x, y: LAUNCH.y, vx: vx, vy: vy, mode: 'climb', stall: ang > STALL_DEG || vx < 60, wind: wind, t: 0, done: false, trail: [] };
  }

  // 実プレイとボットの予測で共用する1ステップ
  function stepGlider(gl, dt) {
    gl.t += dt;
    if (gl.mode === 'climb') {
      gl.vy += GRAV * dt;
      if (gl.vy >= 0) { gl.mode = gl.stall ? 'stall' : 'glide'; gl.vy = gl.stall ? 120 : SINK; }
    } else if (gl.mode === 'glide') {
      gl.vx += (Math.max(140, gl.vx * 0.4) - gl.vx) * Math.min(1, dt * 0.6);
      gl.vy = SINK;
    } else {
      gl.vx *= Math.max(0, 1 - dt * 1.4);
      gl.vy = Math.min(620, gl.vy + 900 * dt);
    }
    var wx = gl.mode === 'climb' ? 0 : gl.wind;
    gl.x += (gl.vx + wx) * dt;
    gl.y += gl.vy * dt;
    if (gl.x < 40) gl.x = 40;
    if (gl.y >= groundAt(gl.x) - 8) { gl.y = groundAt(gl.x) - 8; gl.done = true; }
  }

  function predictLanding(vx, vy, wind) {
    var gl = makeGlider(vx, vy, wind);
    for (var i = 0; i < 600 && !gl.done; i++) stepGlider(gl, 1 / 60);
    return gl.x;
  }

  function launch(dx, dy) {
    var v = pullVel(dx, dy);
    if (v.len < 36 || v.vx <= 0) { game.audio.play('se_tap', 0.2); return false; }
    s.glider = makeGlider(v.vx, v.vy, ROUNDS[s.round].wind);
    game.audio.play('se_jump', 0.4);
    game.audio.tone(200 + v.len * 2, 0.08, { wave: 'square', volume: 0.05, slide: 340 });
    return true;
  }

  function land() {
    var gl = s.glider;
    var R = ROUNDS[s.round];
    var d = Math.abs(gl.x - R.hx);
    var inBrook = gl.x > BROOK_X0 && gl.x < BROOK_X1;
    var mark = { x: gl.x, ok: false };
    if (!inBrook && d <= R.hr) {
      var perfect = d <= R.hr * 0.3;
      s.hits++; mark.ok = true;
      if (perfect) { s.perfects++; s.chain++; } else s.chain = 0;
      var pts = (perfect ? 300 : 150) * (s.chain >= 2 ? 2 : 1) + (Math.abs(R.wind) >= 80 ? 100 : 0);
      s.score += pts;
      s.mood = 0.8; s.moodGood = true;
      game.feedback.good(gl.x, GROUND - 90, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? STYLE.accent[0] : '#ffffff', size: 52 });
      if (s.chain >= 2) game.fx.popup('x2', gl.x, GROUND - 180, { color: STYLE.accent[0], size: 44 });
      if (s.hits === 2) { game.fx.popup('2 / ' + NEED, W / 2, H * 0.2, { color: '#ffffff', size: 60 }); game.audio.play('se_milestone', 0.45); }
    } else {
      s.misses++; s.chain = 0;
      s.mood = 0.8; s.moodGood = false;
      if (!inBrook) s.closest = Math.min(s.closest, d - R.hr);
      if (inBrook) { game.audio.play('se_break', 0.3); game.fx.burst(gl.x, BROOK_Y, { color: '#9ad0ff', count: 14, speed: 300 }); }
      if (s.misses >= MISSES) { s.landed.push(mark); s.step = 'stop'; s.stopT = 0.5; s.won = false; s.culprit = { x: gl.x, y: gl.y }; game.fx.flash('#ffffff', 0.12); return; }
      game.feedback.bad(gl.x, gl.y - 40, { text: 'MISS', size: 46 });
      if (!inBrook) game.fx.popup('あと' + Math.max(1, Math.round((d - R.hr) / 3)) + 'cm', gl.x, gl.y - 120, { color: '#ffffff', size: 34 });
    }
    s.landed.push(mark);
    if (s.hits >= NEED) { s.step = 'stop'; s.stopT = 0.55; s.won = true; return; }
    s.waitT = 0.7;
  }

  function advance(dt) {
    s.clock -= dt;
    if (s.mood > 0) s.mood -= dt;
    if (s.glider && !s.glider.done) {
      stepGlider(s.glider, dt);
      if (s.glider.t % 0.05 < dt) s.glider.trail.push({ x: s.glider.x, y: s.glider.y });
      if (s.glider.done) { land(); if (s.step !== 'run') return; }
    } else if (s.waitT > 0) {
      s.waitT -= dt;
      if (s.waitT <= 0) { s.round = Math.min(ROUNDS.length - 1, s.round + 1); s.glider = null; game.audio.tone('A5', 0.06, { wave: 'triangle', volume: 0.05 }); }
    }
    if (s.clock <= 0) { s.clock = 0; s.drag = null; s.step = 'stop'; s.stopT = 0.5; s.won = false; s.culprit = { x: ROUNDS[s.round].hx, y: GROUND }; game.fx.flash('#ffffff', 0.12); }
  }

  function settle() {
    s.prevBest = game.best;
    var stats = { hits: s.hits, need: NEED, perfect: s.perfects, misses: s.misses };
    if (s.won) {
      s.score += Math.round(s.clock) * 20;
      game.feedback.good(ROUNDS[s.round].hx, GROUND - 160, { text: 'CLEAR', color: STYLE.accent[0], size: 72 });
      game.audio.play('se_success', 0.6);
      game.end.success(s.score, stats);
    } else {
      var c = s.culprit || { x: W / 2, y: GROUND };
      game.feedback.bad(c.x, c.y - 40, { text: 'MISS', size: 60 });
      game.audio.play('se_failure', 0.6);
      game.end.failure(stats);
    }
    phase = 'RESULT';
  }

  // ── 描画(ローポリ) ────────────────────────────────
  function tri(x1, y1, x2, y2, x3, y3, col) {
    var p = [[x1, y1], [x2, y2], [x3, y3]].sort(function (a, b) { return a[1] - b[1]; });
    var top = p[0], mid = p[1], bot = p[2];
    function xAt(a, b, y) { return b[1] === a[1] ? a[0] : a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]); }
    for (var y = Math.ceil(top[1]); y < bot[1]; y += 3) {
      var xa = xAt(top, bot, y);
      var xb = y < mid[1] ? xAt(top, mid, y) : xAt(mid, bot, y);
      var l = Math.min(xa, xb), r = Math.max(xa, xb);
      game.draw.rect(l, y, r - l + 1, 3, col);
    }
  }

  function jit(i) { return Math.sin(game.time.elapsed * 3 + i * 1.7) * 2; }

  function drawPark(hl) {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.5, STYLE.bg[1]], [0.66, STYLE.bg[2]], [1, '#5a4a32']]);
    // 遠景の山(フォグで潰した三角)
    tri(-100, GROUND - 120, 260 + jit(1), GROUND - 520, 620, GROUND - 120, '#8aa0b8');
    tri(380, GROUND - 120, 760 + jit(2), GROUND - 600, 1180, GROUND - 120, '#94aac0');
    game.draw.rect(0, GROUND - 330, W, 210, '#dce8ee', 0.4);
    // 紅葉の木(円錐ポリゴン)
    var trees = [[60, 0], [470, 1], [700, 0], [1020, 1], [560, 1]];
    for (var k = 0; k < trees.length; k++) {
      var tx = trees[k][0], th = 220 + trees[k][1] * 60;
      tri(tx - 70, GROUND - 40, tx + jit(k + 4), GROUND - 40 - th, tx + 70, GROUND - 40, trees[k][1] ? STYLE.main[0] : '#c8902a');
      tri(tx, GROUND - 40, tx + jit(k + 9), GROUND - 40 - th, tx + 70, GROUND - 40, trees[k][1] ? '#a84a1a' : '#a8701a');
      game.draw.rect(tx - 8, GROUND - 40, 16, 40, '#5a3a20');
    }
    // 地面・小川
    game.draw.rect(0, GROUND, W, H - GROUND, '#7a9a4a');
    tri(BROOK_X0 - 40, GROUND, BROOK_X0 + 30, BROOK_Y + 30, BROOK_X0 + 30, GROUND, '#5a7a3a');
    tri(BROOK_X1 + 40, GROUND, BROOK_X1 - 30, BROOK_Y + 30, BROOK_X1 - 30, GROUND, '#5a7a3a');
    game.draw.rect(BROOK_X0 + 30, GROUND, BROOK_X1 - BROOK_X0 - 60, BROOK_Y - GROUND + 30, '#4a6a3a');
    game.draw.rect(BROOK_X0 + 30, BROOK_Y, BROOK_X1 - BROOK_X0 - 60, 40, STYLE.main[2]);
    for (var w = 0; w < 6; w++) game.draw.line(BROOK_X0 + 50 + ((w * 47 + t * 60) % 220), BROOK_Y + 14 + (w % 2) * 12, BROOK_X0 + 90 + ((w * 47 + t * 60) % 220), BROOK_Y + 14 + (w % 2) * 12, '#c8e8ff', 3);
    game.draw.rect(0, GROUND + 140, W, H - GROUND - 140, '#5a4a32');
    game.draw.line(0, GROUND, BROOK_X0 - 40, GROUND, LINE, 3);
    game.draw.line(BROOK_X1 + 40, GROUND, W, GROUND, LINE, 3);
    // 着地の輪
    var R = ROUNDS[s.round];
    var pulse = Math.sin(t * 6) * 0.5 + 0.5;
    game.draw.rect(R.hx - R.hr, GROUND - 10, R.hr * 2, 20, '#ffffff', 0.25 + 0.2 * pulse);
    game.draw.rect(R.hx - R.hr, GROUND - 8, 14, 16, hl ? '#ffffff' : STYLE.accent[1]);
    game.draw.rect(R.hx + R.hr - 14, GROUND - 8, 14, 16, hl ? '#ffffff' : STYLE.accent[1]);
    game.draw.rect(R.hx - R.hr, GROUND - 3, R.hr * 2, 6, STYLE.accent[1]);
    game.draw.rect(R.hx - R.hr * 0.3, GROUND - 3, R.hr * 0.6, 6, STYLE.accent[0]);
    // 旗
    game.draw.line(R.hx, GROUND, R.hx, GROUND - 120, LINE, 4);
    tri(R.hx, GROUND - 120, R.hx + 60 + jit(3), GROUND - 100, R.hx, GROUND - 80, STYLE.accent[0]);
    // 吹き流し(風)
    var sockX = W - 70, sockY = GROUND - 220;
    game.draw.line(sockX, GROUND, sockX, sockY, LINE, 5);
    var wl = R.wind / 90;
    var wave = Math.sin(t * 9) * 6;
    for (var sg = 0; sg < 4; sg++) {
      var len = 22 + Math.abs(wl) * 26;
      var x0 = sockX + (wl >= 0 ? 1 : -1) * sg * len * (wl === 0 ? 0.2 : 1);
      var drop = wl === 0 ? sg * 26 : sg * 4;
      game.draw.rect(Math.min(x0, x0 + (wl >= 0 ? len : -len)), sockY + drop + wave * (sg / 4), len, 20, sg % 2 ? '#ffffff' : STYLE.accent[1]);
    }
    // これまでの着地点
    for (var m = 0; m < s.landed.length; m++) {
      var mk = s.landed[m];
      game.draw.circle(mk.x, groundAt(mk.x) - 6, 8, mk.ok ? STYLE.accent[0] : '#5a5a5a', 0.8);
    }
  }

  function drawKid() {
    var t = game.time.elapsed;
    var art = KID_IDLE;
    if (phase === 'RESULT') art = s.won ? (Math.floor(t * 4) % 2 ? KID_YAY : KID_IDLE) : KID_SAD;
    else if (s.drag) art = KID_PULL;
    else if (s.mood > 0) art = s.moodGood ? KID_YAY : KID_SAD;
    game.draw.circle(110, GROUND + 4, 44, '#000000', 0.15);
    game.draw.sprite(art, KID_PAL, 110, GROUND - 70 + (art === KID_IDLE ? Math.sin(t * 3) * 3 : 0), 12, { anchor: 'center' });
    // 発射台(ゴムかけ棒)
    game.draw.line(LAUNCH.x - 30, GROUND, LAUNCH.x - 10, LAUNCH.y - 20, '#6a4a2a', 10);
    game.draw.line(LAUNCH.x + 20, GROUND, LAUNCH.x + 10, LAUNCH.y - 20, '#6a4a2a', 10);
  }

  function drawGlider(hl) {
    var gl = s.glider;
    if (!gl) {
      if (s.step === 'run' || phase === 'ATTRACT') {
        var ox = 0, oy = 0;
        if (s.drag) { var v = pullVel(s.drag.x - s.drag.x0, s.drag.y - s.drag.y0); ox = v.dx * 0.5; oy = v.dy * 0.5; }
        game.draw.line(LAUNCH.x - 10, LAUNCH.y - 20, LAUNCH.x + ox, LAUNCH.y + oy, '#c8a070', 5);
        game.draw.line(LAUNCH.x + 10, LAUNCH.y - 20, LAUNCH.x + ox, LAUNCH.y + oy, '#c8a070', 5);
        game.draw.sprite(GL_LEVEL, GL_PAL, LAUNCH.x + ox, LAUNCH.y + oy, 10, { anchor: 'center' });
        if (s.drag) {
          var v2 = pullVel(s.drag.x - s.drag.x0, s.drag.y - s.drag.y0);
          var steep = Math.atan2(-v2.vy, v2.vx) * 180 / Math.PI > STALL_DEG;
          for (var k = 1; k <= 5; k++) {
            var tt = k * 0.05;
            game.draw.circle(LAUNCH.x + ox + v2.vx * tt, LAUNCH.y + oy + v2.vy * tt + 0.5 * GRAV * tt * tt, 7, steep ? STYLE.accent[1] : '#ffffff', 0.85 - k * 0.12);
          }
        }
      }
      return;
    }
    for (var i = 0; i < gl.trail.length; i++) game.draw.circle(gl.trail[i].x, gl.trail[i].y, 3, '#ffffff', 0.35);
    var art = gl.mode === 'stall' ? GL_DIVE : GL_LEVEL;
    var bob = gl.mode === 'glide' ? Math.sin(game.time.elapsed * 10) * 3 : 0;
    game.draw.sprite(art, hl ? GL_WHITE : GL_PAL, gl.x, gl.y + bob, hl ? 15 : 10, { anchor: 'center', flipX: gl.vx + (gl.mode === 'climb' ? 0 : gl.wind) < 0 });
    if (gl.mode === 'stall' && !gl.done) game.draw.circle(gl.x - 30, gl.y - 20, 14, '#ffffff', 0.4);
  }

  function drawThumbs() {
    // 親指ゾーン: 残りのグライダー
    for (var i = 0; i < GLIDERS; i++) {
      var used = i < s.landed.length;
      var x = W * 0.2 + i * 150, y = H * 0.9;
      game.draw.rect(x - 60, y - 40, 120, 80, '#3a2e20', 0.6);
      game.draw.sprite(GL_LEVEL, used ? { w: '#5a5040', r: '#5a5040' } : GL_PAL, x, y, 10, { anchor: 'center' });
      if (used) game.draw.circle(x, y + 30, 10, s.landed[i].ok ? STYLE.accent[0] : '#7a7a7a');
    }
  }

  function txt(str, x, y, size, color) {
    game.draw.text(str, x + 3, y + 4, { size: size, color: LINE, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function drawHud() {
    txt(s.hits + ' / ' + NEED, 140, 80, 52, '#ffffff');
    txt('SCORE ' + s.score, W - 240, 80, 38, STYLE.accent[0]);
    game.draw.rect(70, 138, W - 140, 14, LINE, 0.4);
    var fr = Math.max(0, s.clock / TIME_LIMIT);
    game.draw.rect(70, 138, (W - 140) * fr, 14, fr < 0.25 ? STYLE.accent[1] : '#ffffff');
    for (var m = 0; m < MISSES; m++) game.draw.circle(W / 2 - 50 + m * 50, 196, 14, m < s.misses ? STYLE.accent[1] : '#ffffff', m < s.misses ? 1 : 0.35);
  }

  function drawScene(hl) {
    drawPark(hl);
    drawKid();
    drawGlider(hl);
    drawThumbs();
  }

  // ── ATTRACT ボット(予測で強さを決め、2機目はわざと弱く引く) ─────
  var demo = { t: 0, n: 0, hx: W * 0.5, hy: H * 0.8, press: false, aim: null, k: 0 };
  function botAim(weak) {
    var R = ROUNDS[s.round];
    var ang = 36 * Math.PI / 180, lo = 300, hi = PULL_MAX * PULL_K;
    for (var i = 0; i < 18; i++) {
      var mid = (lo + hi) / 2;
      if (predictLanding(Math.cos(ang) * mid, -Math.sin(ang) * mid, R.wind) < R.hx) lo = mid; else hi = mid;
    }
    var sp = (lo + hi) / 2 * (weak ? 0.72 : 1);
    return { dx: -Math.cos(ang) * sp / PULL_K, dy: Math.sin(ang) * sp / PULL_K };
  }
  function runDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.0;
    if (cyc < dt || demo.t <= dt) { s = freshPark(); s.step = 'run'; demo.n = 0; demo.aim = null; s.drag = null; }
    if (s.step !== 'run') { if (s.step === 'stop') s.stopT -= dt; return; }
    if (!s.glider && s.waitT <= 0 && demo.n < 2 && cyc > 0.3) {
      if (!demo.aim) { demo.aim = botAim(demo.n === 1); demo.k = 0; s.drag = { x0: W * 0.55, y0: H * 0.8, x: W * 0.55, y: H * 0.8 }; }
      demo.k = Math.min(1, demo.k + dt / 0.6);
      s.drag.x = s.drag.x0 + demo.aim.dx * demo.k;
      s.drag.y = s.drag.y0 + demo.aim.dy * demo.k;
      demo.hx = s.drag.x; demo.hy = s.drag.y; demo.press = true;
      if (demo.k >= 1) { launch(s.drag.x - s.drag.x0, s.drag.y - s.drag.y0); s.drag = null; demo.aim = null; demo.press = false; demo.n++; }
    } else {
      demo.hx += (W * 0.55 - demo.hx) * Math.min(1, dt * 3);
      demo.hy += (H * 0.8 - demo.hy) * Math.min(1, dt * 3);
    }
    advance(dt);
  }

  function ready() { return phase === 'PLAYING' && s.step === 'run' && !s.glider && s.waitT <= 0; }

  game.onTap(function () {
    if (phase === 'ATTRACT') { s = freshPark(); phase = 'PLAYING'; game.audio.play('se_coin', 0.5); return; }
    if (phase === 'RESULT') { game.audio.play('se_tap', 0.3); phase = 'ATTRACT'; s = freshPark(); demo.t = 0; return; }
  });
  game.onPress(function (x, y) {
    if (!ready()) return;
    s.drag = { x0: x, y0: y, x: x, y: y };
    game.audio.tone(300, 0.04, { wave: 'triangle', volume: 0.05 });
  });
  game.onMove(function (x, y) {
    if (!s || !s.drag || phase !== 'PLAYING') return;
    var a = Math.hypot(s.drag.x - s.drag.x0, s.drag.y - s.drag.y0);
    s.drag.x = x; s.drag.y = y;
    var b = Math.hypot(x - s.drag.x0, y - s.drag.y0);
    if (Math.floor(a / 50) !== Math.floor(b / 50) && b <= PULL_MAX) game.audio.tone(260 + b * 2, 0.03, { wave: 'triangle', volume: 0.04 });
  });
  game.onRelease(function (x, y) {
    if (!s || !s.drag || phase !== 'PLAYING') return;
    var d = s.drag; s.drag = null;
    if (!ready()) { game.audio.play('se_tap', 0.15); return; }
    launch(x - d.x0, y - d.y0);
  });

  game.onUpdate(function (dt) {
    if (!s) s = freshPark();
    if (phase === 'ATTRACT') {
      runDemo(dt);
      drawScene(false);
      game.draw.hand(demo.hx, demo.hy, { press: demo.press, scale: 14 });
      txt('BROOK GLIDER', W / 2, H * 0.05 + 30, 80, '#ffffff');
      txt('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, H * 0.1 + 34, 34, STYLE.accent[0]);
      if (Math.floor(game.time.elapsed * 1.6) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.8, 42, STYLE.accent[0]);
      else txt('TAP TO START', W / 2, H * 0.8, 38, '#ffffff');
      return;
    }
    if (phase === 'RESULT') {
      drawScene(false);
      if (s.won) {
        s.partyT -= dt;
        if (s.partyT <= 0) { s.partyT = 0.4; game.fx.burst(game.random(160, W - 160), game.random(H * 0.2, H * 0.5), { color: Math.random() < 0.5 ? STYLE.accent[0] : STYLE.main[0], count: 18, speed: 420 }); }
      }
      game.draw.rect(0, H * 0.28, W, H * 0.3, LINE, 0.75);
      txt(s.won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.335, 86, s.won ? STYLE.accent[0] : '#ff6a5a');
      txt('SCORE ' + s.score, W / 2, H * 0.405, 52, '#ffffff');
      txt('PERFECT ' + s.perfects + '    ' + s.hits + ' / ' + NEED, W / 2, H * 0.455, 38, STYLE.bg[1]);
      if (!s.won) {
        txt('あと' + (NEED - s.hits) + '機!', W / 2, H * 0.51, 46, STYLE.accent[0]);
        if (s.closest < 9999) txt('あと' + Math.max(1, Math.round(s.closest / 3)) + 'cm', W / 2, H * 0.555, 34, '#ffffff');
      } else if (s.score > s.prevBest) txt('NEW RECORD', W / 2, H * 0.51, 48, STYLE.accent[0]);
      else txt('BEST ' + s.prevBest, W / 2, H * 0.51, 40, '#ffffff');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.8, 36, '#ffffff');
      return;
    }
    if (s.step === 'ready') {
      s.readyT -= dt;
      if (s.readyT <= 0) { s.step = 'run'; game.audio.play('se_tap', 0.3); }
    } else if (s.step === 'run') {
      advance(dt);
    } else if (s.step === 'stop') {
      s.stopT -= dt;
      if (s.stopT <= 0) settle();
    }
    var hl = s.step === 'stop' && !s.won;
    drawScene(hl);
    if (hl && s.culprit) game.draw.circle(s.culprit.x, s.culprit.y, 60, '#ffffff', 0.4);
    if (s.step === 'stop' && s.won) game.draw.circle(ROUNDS[s.round].hx, GROUND, 160, STYLE.accent[0], 0.25);
    drawHud();
    if (s.step === 'ready') txt(s.readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.35, 96, '#ffffff');
    if (s.step === 'run' && s.round === 0 && !s.glider && !s.drag && s.clock > TIME_LIMIT - 2.5) {
      var k = (game.time.elapsed * 1.2) % 1;
      game.draw.hand(W * 0.55 - k * 140, H * 0.8 + k * 110, { press: true, scale: 12, alpha: 0.7 });
    }
  });

  game.onStart(function () {
    game.audio.melody([
      ['F4', 0.5], ['A4', 0.5], ['C5', 0.5], ['A4', 0.5], ['Bb4', 1], ['G4', 1],
      ['A4', 0.5], ['F4', 0.5], ['G4', 0.5], ['E4', 0.5], ['F4', 2],
    ], {
      tempo: 120, wave: 'triangle', volume: 0.06, loop: true,
      bass: [['F2', 2], ['Bb2', 2], ['C3', 2], ['F2', 2]],
    });
    phase = 'ATTRACT';
    s = freshPark();
    demo.t = 0;
  });
})(game);

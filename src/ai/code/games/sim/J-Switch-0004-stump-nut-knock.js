// J-Switch-0004-stump-nut-knock.js
// 切り株のくるみ割り — 切り株の台に転がってくる木の実を、殻の点の数ぴったりだけ叩いて割り、中身を無傷でかごに集める
// 操作: 画面のどこでもタップで小槌を振る。殻の点の数だけ叩けば割れ目が開く。叩き足りないまま転がり去る/叩きすぎて中身を潰すとミス。虫食いの黒い実は叩かない(社内メモ。画面には出さない)
// 終わり: 8個の中身を集めればCLEAR。ミス3回/時間切れでGAME OVER
// @mechanic: count_exact
// @theme: forest_stump_nut_cracking
// 世界観: 冬ごもり前の森の広場、リスの子が切り株を台にして、坂の樋から転がってくる硬さのちがう木の実を小槌で叩き割り、中身を潰さずに冬の蓄えのかごへ8個ためる
// 残るもの: 正誤(CLEAR/GAME OVER) + 集めた中身の数・金の実(PERFECT)数・潰した数
// スタイル: 80s ISO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: 菱形グリッド、上面・側面の明暗と影で高さを示す。6〜8色
  var STYLE = { bg: ['#2a3a2a', '#3e5a34', '#55783e'], main: ['#8a5a2e', '#c08a4a', '#5e3a1a'], accent: ['#ffd84a', '#ff5a4a'] };
  var C = {
    bg1: '#1e2c22', bg2: '#3e5a34', tileA: '#55783e', tileB: '#4a6a36', tileEdge: '#2e4424', stumpT: '#c8965a', stumpS: '#7a4e24', ring: '#9a6a3a',
    nut: '#a8703a', nutD: '#6a421e', kernel: '#f2dca0', rot: '#3a2a2a', rotD: '#1a1010', gold: '#ffd84a', bad: '#ff5a4a', white: '#ffffff', ink: '#101810', pip: '#fff4d0'
  };

  var GAME_TITLE = 'NUT KNOCK';
  var TIME_LIMIT = 20;
  var NEEDED = 8;
  var MAX_MISS = 3;
  var AX = W / 2, AY = H * 0.5;
  var SETTLE = 0.35;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var phase, ready, timeLeft, nut, got, perfects, crushed, misses, hitStop, outro, ok, halfShown, playT, swing, focusBad, served;

  // ── sprites ───────────────────────────────────────────────────────
  var NUT = ['...cc...', '..cccc..', '.nnnnnn.', 'nnNnnNnn', 'nNnnnnNn', 'nnnNNnnn', '.nnnnnn.', '..nnnn..'];
  var NUT_OPEN = ['.c....c.', 'cc....cc', 'nn.kk.nn', 'nNkkkkNn', 'nNkkkkNn', 'nn.kk.nn', '.nn..nn.', '..n..n..'];
  var SQUIRREL = [
    ['.tt.....', 'tttt.ee.', 'ttt.eeee', '.tt.ekee', '..tteeee', '..teeee.', '..eeee..', '..e..e..'],
    ['tt......', 'ttt..ee.', '.ttteeee', '..ttekee', '..tteeee', '..teeee.', '..eeee..', '.e....e.']
  ];
  var MALLET = ['hhhhh', 'hhhhh', 'hhhhh', '..s..', '..s..', '..s..', '..s..'];
  var BASKET = ['b.b.b.b.b.b', 'bbbbbbbbbbb', 'bBbBbBbBbBb', 'bbbbbbbbbbb', '.bBbBbBbBb.', '..bbbbbbb..'];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  // 菱形(横1pxストリップで塗る)
  function diamond(cx, cy, w, h, col) {
    for (var y = -h; y <= h; y += 4) {
      var hw = w * (1 - Math.abs(y) / h);
      game.draw.rect(cx - hw, cy + y, hw * 2, 4, col);
    }
  }

  function newNut() {
    served++;
    var r = Math.random();
    var need;
    if (served > 2 && r < 0.14) need = 0;
    else if (playT > 6 && r > 0.9) need = 5;
    else need = 1 + Math.floor(game.random(0, 4)) % 4;
    var win = need === 0 ? 0.9 : 0.55 + need * 0.28 - Math.min(0.25, playT * 0.015);
    nut = { need: need, hits: 0, st: 'in', t: 0, win: win, quiet: 0, open: false, crushed: false, res: null };
    if (need === 0 && state === S.PLAYING) game.audio.tone('A2', 0.25, { wave: 'sawtooth', volume: 0.03, slide: 30 });
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; got = 0; perfects = 0; crushed = 0; misses = 0;
    hitStop = 0; outro = 0; ok = false; halfShown = false; playT = 0; swing = 0; focusBad = false; served = 0;
    newNut();
  }

  function nutPos() {
    var n = nut;
    if (n.st === 'in') { var u = Math.min(1, n.t / 0.32); return { x: AX - 360 + 360 * u, y: AY - 220 + 220 * u - Math.sin(u * Math.PI) * 30 }; }
    if (n.st === 'out') { var v = Math.min(1, n.t / 0.32); return { x: AX + 360 * v, y: AY + 200 * v }; }
    return { x: AX, y: AY };
  }

  // 叩く(実プレイ・デモ共用)
  function strike(isDemo) {
    swing = 0.14;
    var n = nut;
    if (n.st !== 'anvil') return null;
    n.hits++; n.quiet = 0;
    var p = nutPos();
    if (n.hits > n.need) {
      n.crushed = true;
      resolve(false, isDemo);
      return false;
    }
    if (n.hits === n.need) n.open = true;
    if (isDemo) game.fx.burst(p.x, p.y - 40, { color: n.open ? C.kernel : C.nutD, count: 5, speed: 160 });
    else {
      game.audio.play(n.open ? 'se_break' : 'se_tap', n.open ? 0.3 : 0.35);
      game.fx.burst(p.x, p.y - 40, { color: n.open ? C.kernel : C.nutD, count: n.open ? 8 : 4, speed: 180 });
    }
    return true;
  }

  function resolve(good, isDemo) {
    var n = nut;
    if (n.res) return;
    n.res = good ? 'good' : 'bad';
    n.st = 'out'; n.t = 0;
    var p = { x: AX, y: AY };
    if (isDemo) { game.fx.burst(p.x, p.y - 60, { color: good ? C.gold : C.bad, count: 8, speed: 200 }); return; }
    if (good) {
      if (n.need === 0) {
        game.audio.tone('E5', 0.06, { wave: 'triangle', volume: 0.04 });
        game.fx.popup('NICE', p.x, p.y - 150, { color: C.white, size: 44 });
        return;
      }
      got++;
      if (n.need >= 5) perfects++;
      game.feedback.good(p.x, p.y - 150, { text: n.need >= 5 ? 'PERFECT' : 'GOOD', color: n.need >= 5 ? C.gold : C.kernel, count: 12 });
      game.audio.play('se_coin', 0.3);
      if (!halfShown && got >= NEEDED / 2) {
        halfShown = true;
        game.audio.play('se_milestone', 0.5);
        game.fx.popup(got + ' / ' + NEEDED, W / 2, H * 0.2, { color: C.gold, size: 64 });
      }
      if (got >= NEEDED) finish(true);
      return;
    }
    misses++;
    if (n.crushed) crushed++;
    focusBad = true;
    if (misses >= MAX_MISS) { finish(false); return; }
    hitStop = 0.35;
    game.feedback.bad(p.x, p.y - 150, { text: 'MISS', color: C.bad });
  }

  // 台の上の実の流れ(実プレイ・デモ共用)
  function stepNut(dt, isDemo) {
    var n = nut;
    n.t += dt;
    if (swing > 0) swing -= dt;
    if (n.st === 'in' && n.t >= 0.32) { n.st = 'anvil'; n.t = 0; if (!isDemo) game.audio.tone('G3', 0.04, { wave: 'triangle', volume: 0.04 }); }
    else if (n.st === 'anvil') {
      n.quiet += dt;
      if (n.need === 0) { if (n.t >= n.win) resolve(true, isDemo); }
      else if (n.open && n.quiet >= SETTLE) resolve(true, isDemo);
      else if (!n.open && n.t >= n.win) resolve(false, isDemo);
    } else if (n.st === 'out' && n.t >= 0.32) {
      if (phase === 'play' || state === S.ATTRACT) newNut();
    }
  }

  function finish(win) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.55;
    game.audio.stopBgm();
    if (win) { game.fx.flash(C.gold, 0.25); game.audio.play('se_success', 0.6); }
    else {
      game.feedback.bad(AX, AY - 180, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS', color: C.bad });
      game.audio.play('se_failure', 0.6);
    }
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase !== 'play' || hitStop > 0) return;
    if (strike(false) === null) game.audio.tone('C4', 0.04, { wave: 'square', volume: 0.03 });
  });

  // ── demo(点の数だけ叩いて止める。3個目ごとに1回叩きすぎて潰す)─────────
  var demo = { t: 0, gx: W / 2, gy: H * 0.86, press: false, n: 0, cool: 0, extra: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8;
    if (cyc < dt || demo.t <= dt) { served = 0; demo.n = 0; newNut(); }
    playT = 3;
    stepNut(dt, true);
    demo.cool -= dt;
    demo.press = demo.cool > 0.08;
    var n = nut;
    if (n.st === 'anvil' && !n.seen) { n.seen = true; demo.extra = demo.n % 3 === 2 && n.need > 0; demo.n++; }
    if (n.st === 'anvil' && demo.cool <= 0 && n.t > 0.12) {
      var target = n.need + (demo.extra ? 1 : 0);
      if (n.hits < target) { strike(true); demo.cool = 0.16; demo.gx = W / 2 + 70; demo.gy = H * 0.86; }
    }
  }

  // ── drawing ───────────────────────────────────────────────────────
  function drawGround() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg1], [0.4, C.bg2], [1, C.bg1]]);
    // 遠景の木立(奥ほど小さく高い位置)
    for (var i = 0; i < 9; i++) {
      var tx = i * 128 + 30, ty = H * 0.2 + (i % 2) * 30;
      game.draw.rect(tx + 22, ty, 14, 90, C.stumpS);
      diamond(tx + 29, ty - 20 + Math.sin(t * 1.5 + i) * 3, 56, 44, C.tileB);
    }
    // 菱形グリッドの地面
    for (var gy = 0; gy < 9; gy++) {
      for (var gx = -1; gx < 7; gx++) {
        var cx = gx * 180 + (gy % 2) * 90, cy = H * 0.3 + gy * 52;
        diamond(cx, cy, 88, 50, (gx + gy) % 2 ? C.tileA : C.tileB);
      }
    }
    // 樋(左上から台へ)と出口(右下へ)
    for (var k = 0; k < 8; k++) {
      diamond(AX - 360 + k * 45, AY - 220 + k * 27.5 - 20, 40, 18, C.stumpS);
      diamond(AX + 60 + k * 42, AY + 36 + k * 25, 36, 16, C.tileEdge);
    }
    game.draw.rect(0, 0, W, H, C.gold, 0.02 + 0.02 * Math.sin(t * 1.4));
  }

  function drawStump() {
    // 側面(暗)→上面(明)で高さを示す
    game.draw.rect(AX - 150, AY + 30, 300, 110, C.stumpS);
    diamond(AX, AY + 140, 150, 60, C.stumpS);
    diamond(AX, AY + 30, 150, 60, C.stumpT);
    diamond(AX, AY + 30, 100, 40, C.ring);
    diamond(AX, AY + 30, 60, 24, C.stumpT);
    game.draw.rect(AX - 170, AY + 170, 340, 16, C.ink, 0.3);
  }

  function drawNut() {
    var t = game.time.elapsed;
    var n = nut;
    if (!n) return;
    var p = nutPos();
    var rot = n.need === 0;
    var shake = n.st === 'anvil' && swing > 0 ? Math.sin(t * 80) * 6 : 0;
    var hl = (phase === 'stop' || hitStop > 0) && Math.floor(t * 14) % 2 === 0;
    if (hl) game.draw.circle(p.x, p.y - 40, 120, focusBad ? C.bad : C.white, 0.4);
    var pal = rot ? { c: C.rotD, n: C.rot, N: C.rotD, k: C.kernel } : (n.need >= 5 ? { c: C.stumpS, n: C.gold, N: '#c09a2a', k: C.kernel } : { c: C.stumpS, n: C.nut, N: C.nutD, k: C.kernel });
    if (n.crushed) pal = { c: C.stumpS, n: C.nutD, N: C.ink, k: C.bad };
    game.draw.rect(p.x - 60, p.y + 10, 120, 12, C.ink, 0.35);
    game.draw.sprite(n.open || n.crushed ? NUT_OPEN : NUT, pal, p.x + shake, p.y - 40 + (n.st === 'anvil' ? Math.sin(t * 4) * 3 : 0), 16, { anchor: 'center' });
    // 殻の点(残りの叩く回数)
    if (!rot && n.st !== 'out') {
      for (var i = 0; i < n.need; i++) {
        var px = p.x - (n.need - 1) * 26 + i * 52, py = p.y - 150;
        game.draw.circle(px, py, 18, C.ink, 0.6);
        game.draw.circle(px, py, 13, i < n.hits ? C.stumpS : (n.need >= 5 ? C.gold : C.pip));
      }
      if (n.open) game.draw.circle(p.x, p.y - 40, 90, C.kernel, 0.15 + 0.1 * Math.sin(t * 20));
    }
    if (rot && n.st !== 'out') {
      for (var f = 0; f < 3; f++) game.draw.rect(p.x + Math.sin(t * 9 + f * 2) * 70, p.y - 120 + Math.cos(t * 7 + f) * 30, 8, 8, C.ink);
    }
  }

  function drawMallet() {
    var t = game.time.elapsed;
    var down = swing > 0;
    game.draw.sprite(MALLET, { h: C.stumpS, s: C.nutD }, AX + 150, down ? AY - 60 : AY - 170 + Math.sin(t * 3) * 6, 18, { anchor: 'center' });
  }

  function drawBottom() {
    var t = game.time.elapsed;
    game.draw.rect(0, H * 0.78, W, H * 0.22, C.bg1, 0.7);
    game.draw.sprite(BASKET, { b: C.stumpS, B: C.nutD }, W * 0.6, H * 0.86, 22, { anchor: 'center' });
    for (var i = 0; i < NEEDED; i++) {
      game.draw.circle(W * 0.46 + (i % 4) * 90, H * 0.815 + Math.floor(i / 4) * 44 + Math.sin(t * 3 + i) * 2, 18, i < got ? C.kernel : C.tileEdge);
    }
    for (var m = 0; m < MAX_MISS; m++) game.draw.sprite(NUT, { c: C.stumpS, n: m < misses ? C.bad : C.nut, N: C.nutD }, W * 0.5 + m * 80, H * 0.95, 6, { anchor: 'center' });
    game.draw.sprite(SQUIRREL[Math.floor(t * 2) % 2], { t: '#c0703a', e: '#e0904a', k: C.ink }, W * 0.16, H * 0.88 + Math.sin(t * 2.5) * 5, 18, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, C.ink, 0.65);
    txt(got + ' / ' + NEEDED, W / 2, 90, 66, C.kernel);
    txt(String(Math.ceil(timeLeft)), 70, 90, 52, C.white, 'left');
    game.draw.rect(60, 170, W - 120, 20, C.tileEdge);
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 20, timeLeft < 5 ? C.bad : C.gold);
  }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawGround(); drawStump(); drawNut(); drawMallet(); drawBottom();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.65);
      txt(GAME_TITLE, W / 2, 90 + Math.sin(t * 2) * 6, 80, C.gold);
      txt('HI-SCORE ' + game.best, W / 2, 180, 36, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.985, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.985, 34, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawGround(); drawStump(); drawBottom();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 90, ok ? C.gold : C.bad);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.985, 38, C.white);
      return;
    }

    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'play') {
      if (hitStop > 0) { hitStop -= dt; if (hitStop <= 0) focusBad = false; }
      else {
        timeLeft -= dt; playT += dt;
        stepNut(dt, false);
        if (phase === 'play' && timeLeft <= 0) { timeLeft = 0; finish(false); }
      }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      if (outro <= 0) {
        state = S.RESULT;
        var score = got * 120 + perfects * 100 + Math.max(0, MAX_MISS - misses) * 50 + Math.round(timeLeft * 10);
        var stats = { kernels: got, gold: perfects, crushed: crushed, misses: misses };
        if (ok) game.end.success(score, stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawGround(); drawStump(); drawNut(); drawMallet(); drawBottom(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 96, C.gold);
    if (phase === 'outro') {
      var sc = got * 120 + perfects * 100 + Math.max(0, MAX_MISS - misses) * 50 + Math.round(timeLeft * 10);
      game.draw.rect(0, H * 0.24, W, H * 0.16, C.ink, 0.85);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.28, 96, ok ? C.gold : C.bad);
      txt('SCORE ' + sc, W / 2, H * 0.33, 44, C.white);
      if (ok && sc > game.best) txt('NEW RECORD', W / 2, H * 0.37, 40, C.gold);
      else if (!ok) txt('あと' + Math.max(1, NEEDED - got) + '個!', W / 2, H * 0.37, 44, C.white);
      else txt('BEST ' + game.best, W / 2, H * 0.37, 36, C.white);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['A4', 0.5], ['C5', 0.5], ['B4', 0.5], ['A4', 0.5], ['E5', 1], ['C5', 1],
      ['D5', 0.5], ['C5', 0.5], ['B4', 0.5], ['G4', 0.5], ['A4', 2]
    ], { tempo: 126, wave: 'triangle', volume: 0.05, loop: true, bass: [['A2', 1], ['E3', 1], ['A2', 1], ['E3', 1], ['D3', 1], ['G2', 1], ['A2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

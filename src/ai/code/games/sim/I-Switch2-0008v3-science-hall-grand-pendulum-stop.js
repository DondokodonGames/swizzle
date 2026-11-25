// I-Switch2-0008v3-science-hall-grand-pendulum-stop.js
// 大振り子ぴたり止め — 科学館の吹き抜けで振れ続ける大振り子を、床の真鍮の印の真上に来た瞬間に1回だけタップして解説員に受け止めさせる
// 操作: 振り子は止めるまで振れ続ける。1本につきタップは1回だけで、押した瞬間に解説員が玉を受け止める。床の真鍮の印に玉の影が重なった瞬間が狙い目(印からのずれでPERFECT/GOOD/MISS)。本ごとに振れる向きが回っていく(真横→斜め→手前奥)ので、玉そのものより床を動く影を見る。3往復のうちに押さないと通り過ぎてMISS
// 終わり: 20秒以内に5本を印で止めればCLEAR(ずれの小ささと早さの点)。3本MISS/時間切れでGAME OVER
// @mechanic: timing_one_shot
// @theme: science_hall_grand_pendulum_stop
// 世界観: 科学館の吹き抜けホールで、天井から吊られた大振り子の実演を任された解説員が、床の真鍮の印の真上に玉が来た一瞬だけ手を出してぴたりと止め、見学の子どもたちを驚かせる
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・止めた本数・PERFECT数・MISS数
// スタイル: HD POST 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 低彩度・褐色寄り。半透明円の重ねでブルーム、四隅を暗くするビネット、コントラストは潰す
  var STYLE = { bg: ['#1c1814', '#2e2820', '#4a4034'], main: ['#b89a6a', '#8a7a66', '#d8c8a8'], accent: ['#ffe6b0', '#c85a4a'] };
  var C = {
    deep: STYLE.bg[0], wall: STYLE.bg[1], wall2: STYLE.bg[2], brass: STYLE.main[0], stone: STYLE.main[1], pale: STYLE.main[2],
    glow: STYLE.accent[0], red: STYLE.accent[1], ink: '#0c0a08', ok: '#8ac08a', floor: '#3a3028', floor2: '#2a2219',
  };

  var GAME_TITLE = 'PENDULUM STOP';
  var TIME_LIMIT = 20;
  var GOAL = 5;
  var MISSES = 3;
  var PIVOT_X = W / 2, PIVOT_Y = 150, FLOOR_Y = Math.round(H * 0.66);
  var MARK_X = W / 2, MARK_Y = FLOOR_Y + 40;
  var L = 1000;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // 本ごと: 振れ面の向き(度)・周期・振幅(ラジアン)
  var ROUNDS = [
    { phi: 0, period: 2.2, amp: 0.62 }, { phi: 32, period: 2.0, amp: 0.6 }, { phi: 58, period: 1.8, amp: 0.66 },
    { phi: 76, period: 1.7, amp: 0.62 }, { phi: 20, period: 1.5, amp: 0.68 }, { phi: 50, period: 1.4, amp: 0.66 },
  ];

  var round, cfg, swingT, passes, lastSign, stopped, resultT, resultWord, catchX, catchY, caught, misses, playT, readyT, stopT;
  var score, perfects, over, won, outroT, milestone, prevBest, handT, usedTap;

  function startRound() {
    cfg = ROUNDS[Math.min(round, ROUNDS.length - 1)];
    swingT = -cfg.period / 4; passes = 0; lastSign = -1; stopped = false; resultT = 0; resultWord = ''; usedTap = false; handT = 0;
  }
  function initGame() {
    round = 0; caught = 0; misses = 0; playT = 0; readyT = 0.8; stopT = 0; score = 0; perfects = 0; over = false; won = false; outroT = 0;
    milestone = false; prevBest = game.best;
    startRound();
  }

  // 振り子の3D位置 → 画面。振れ面は phi 度回っている。z>0 が手前
  function bob() {
    var th = cfg.amp * Math.sin(swingT / cfg.period * Math.PI * 2);
    var phi = cfg.phi * Math.PI / 180;
    var hx = L * Math.sin(th) * Math.cos(phi), hz = L * Math.sin(th) * Math.sin(phi), hy = L * Math.cos(th);
    var persp = 1 + hz / 2400;
    return { th: th, sx: PIVOT_X + hx * persp, sy: PIVOT_Y + hy * 0.78 - hz * 0.12, r: 46 * persp, shx: MARK_X + hx * persp, shy: MARK_Y + hz * 0.22, off: Math.abs(th) * L };
  }

  function judgeTap(demo) {
    if (stopped || usedTap) return;
    usedTap = true; stopped = true; handT = 0.5;
    var b = bob();
    var off = b.off;
    var word = off < 24 ? 'PERFECT' : (off < 80 ? 'GOOD' : 'MISS');
    resultWord = word; resultT = 0.7; catchX = b.sx; catchY = b.sy;
    if (word === 'MISS') {
      misses++; stopT = 0.45;
      game.feedback.bad(b.sx, b.sy - 80, { text: 'MISS', shake: demo ? 4 : 10 });
      game.audio.play('se_break', 0.4);
      if (!demo && misses >= MISSES) { finish(false); }
      return;
    }
    caught++;
    var pts = (word === 'PERFECT' ? 300 : 120) + Math.max(0, 2 - passes) * 50;
    if (word === 'PERFECT') perfects++;
    if (!demo) score += pts;
    game.feedback.good(b.sx, b.sy - 90, { text: word, color: word === 'PERFECT' ? C.glow : C.pale, size: word === 'PERFECT' ? 60 : 48, sound: word === 'PERFECT' ? 'se_coin' : 'se_good', volume: 0.35, count: 14 });
    game.fx.popup('+' + pts, W / 2, H * 0.34, { color: C.glow, size: 56 });
    if (!demo && !milestone && caught >= 3) { milestone = true; game.audio.play('se_milestone', 0.5); game.fx.popup(caught + ' / ' + GOAL, W / 2, H * 0.28, { color: C.brass, size: 80 }); }
    if (!demo && caught >= GOAL) { stopT = 0.8; finish(true); }
  }

  function passMiss(demo) {
    stopped = true; usedTap = true; misses++; resultWord = 'MISS'; resultT = 0.7; stopT = 0.3;
    var b = bob(); catchX = b.sx; catchY = b.sy;
    game.feedback.bad(MARK_X, MARK_Y - 100, { text: 'MISS', shake: demo ? 3 : 6 });
    game.audio.play('se_bad', 0.4);
    if (!demo && misses >= MISSES) finish(false);
  }

  function stepPendulum(dt, demo) {
    if (stopped) {
      if (resultT > 0) { resultT -= dt; if (resultT <= 0) { round++; if (demo && round >= ROUNDS.length) round = 0; startRound(); } }
      return;
    }
    swingT += dt;
    var th = cfg.amp * Math.sin(swingT / cfg.period * Math.PI * 2);
    var sgn = th >= 0 ? 1 : -1;
    if (swingT > 0 && sgn !== lastSign) { passes++; lastSign = sgn; game.audio.tone(330, 0.04, { wave: 'triangle', volume: 0.04 }); }
    // 端で小さく鳴る(次に印へ戻る予告)
    var v = Math.cos(swingT / cfg.period * Math.PI * 2);
    if (Math.abs(v) < 0.03 && Math.abs(th) > cfg.amp * 0.9) game.audio.tone(220, 0.03, { wave: 'sine', volume: 0.03 });
    if (passes > 3) passMiss(demo);
  }

  function finish(ok) {
    over = true; won = ok; outroT = 1.5;
    game.audio.stopBgm();
    if (ok) {
      score += Math.round(Math.max(0, TIME_LIMIT - playT) * 15);
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 5; i++) game.fx.burst(game.random(200, 880), game.random(300, 900), { color: i % 2 ? C.glow : C.brass, count: 22, speed: 420 });
      game.fx.flash(C.glow, 0.25);
    } else game.audio.play('se_failure', 0.5);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || readyT > 0 || stopT > 0) { game.audio.tone(200, 0.03, { wave: 'square', volume: 0.03 }); return; }
    if (stopped) { game.audio.play('se_tap', 0.05); return; }
    judgeTap(false);
  });

  // ---- 描画(ブルーム + ビネット) ----
  function label(str, x, y, sz, col) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }
  function bloom(x, y, r, col, a) {
    game.draw.circle(x, y, r * 2.2, col, a * 0.12);
    game.draw.circle(x, y, r * 1.6, col, a * 0.2);
    game.draw.circle(x, y, r * 1.2, col, a * 0.35);
    game.draw.circle(x, y, r, col, a);
  }
  function vignette() {
    game.draw.rect(0, 0, W, 90, C.ink, 0.35); game.draw.rect(0, H - 90, W, 90, C.ink, 0.35);
    game.draw.rect(0, 0, 60, H, C.ink, 0.3); game.draw.rect(W - 60, 0, 60, H, C.ink, 0.3);
  }

  // 解説員(白衣・名札): 立ち / 手を出して受け止める
  var GUIDE = [
    ['...hhh...', '..hfffh..', '..hfefh..', '...fff...', '..wwwww..', '.w.wnw.w.', 'w..www..w', '...www...', '...www...', '..bb.bb..', '..bb.bb..', '..ss.ss..'],
    ['...hhh...', '..hfffh..', '..hfefh..', '...fff...', '..wwwwwff', '...wnw.f.', '...www...', '...www...', '...www...', '..bb.bb..', '..bb.bb..', '..ss.ss..'],
  ];
  var GPAL = { h: '#3a2a20', f: '#e8c8a8', e: '#2a1a10', w: '#e8e2d8', n: '#c85a4a', b: '#4a4a5a', s: '#1a1a1a' };

  function drawHall() {
    var t = game.time.elapsed;
    game.draw.gradient(0, FLOOR_Y, [[0, C.deep], [0.6, C.wall], [1, C.wall2]]);
    // 天窓からの光の柱(ブルーム)
    bloom(PIVOT_X, 120, 140, C.glow, 0.25);
    for (var s = 0; s < 6; s++) game.draw.rect(PIVOT_X - 160 + s * 8, 200, 320 - s * 16, FLOOR_Y - 200, C.glow, 0.02);
    // 柱と手すり(奥の見学通路)
    for (var p = 0; p < 5; p++) {
      var px = 100 + p * 220;
      game.draw.rect(px, 380, 36, FLOOR_Y - 380, C.stone, 0.6);
      game.draw.rect(px - 6, 380, 48, 20, C.brass, 0.5);
    }
    game.draw.rect(60, 700, W - 120, 10, C.brass, 0.6);
    // 見学の子ども(シルエットが揺れる)
    for (var k = 0; k < 6; k++) game.draw.circle(160 + k * 150 + Math.sin(t * 1.5 + k) * 4, 790 - (k % 2) * 30, 26, C.ink, 0.5);
    // 床(奥に向かって暗く)と印
    for (var y = FLOOR_Y; y < H; y += 10) game.draw.rect(0, y, W, 10, (Math.floor(y / 60) % 2) ? C.floor : C.floor2, 1 - (y - FLOOR_Y) / (H - FLOOR_Y) * 0.4);
    var near = !stopped && bob().off < 160;
    bloom(MARK_X, MARK_Y, 34, C.brass, near ? 0.9 : 0.55);
    game.draw.circle(MARK_X, MARK_Y, 10, C.glow, near ? 1 : 0.5);
    // 振れ面の向きを示す床の線
    var phi = cfg.phi * Math.PI / 180;
    var lx = Math.cos(phi) * 420, ly = Math.sin(phi) * 420 * 0.22;
    game.draw.line(MARK_X - lx, MARK_Y - ly, MARK_X + lx, MARK_Y + ly, C.brass, 3);
  }

  function drawPendulum() {
    var b = stopped ? { sx: catchX, sy: catchY, r: 46, shx: catchX, shy: MARK_Y + (catchY - (PIVOT_Y + L * 0.78)) * 0.3 } : bob();
    // 影(床の上を動く)
    game.draw.circle(b.shx, b.shy, 44, C.ink, 0.45);
    game.draw.circle(b.shx, b.shy, 30, C.ink, 0.35);
    // 糸と玉
    game.draw.line(PIVOT_X, PIVOT_Y, b.sx, b.sy, C.pale, 3);
    var hl = stopT > 0 && resultWord === 'MISS';
    bloom(b.sx, b.sy, b.r, hl ? C.red : C.brass, 1);
    game.draw.circle(b.sx - b.r * 0.3, b.sy - b.r * 0.3, b.r * 0.3, C.glow, 0.8);
    if (hl) game.draw.circle(b.sx, b.sy, b.r * 1.6, C.pale, 0.5);
  }

  function drawGuide() {
    var t = game.time.elapsed;
    var reach = handT > 0;
    var gx = 250, gy = FLOOR_Y - 60 + Math.sin(t * 2) * 3;
    game.draw.circle(gx, FLOOR_Y + 30, 60, C.ink, 0.4);
    game.draw.sprite(reach ? GUIDE[1] : GUIDE[0], GPAL, gx, gy, 12, { anchor: 'center' });
    if (reach) game.draw.line(gx + 60, gy - 10, (stopped ? catchX : W / 2) - 30, (stopped ? catchY : PIVOT_Y + 700), '#e8c8a8', 10);
  }

  function drawPad() {
    game.draw.circle(W / 2, H * 0.86, 150, C.ink, 0.5);
    bloom(W / 2, H * 0.86, 120, handT > 0 ? C.glow : C.brass, 0.9);
    game.draw.circle(W / 2, H * 0.86, 12, C.ink);
    game.draw.line(W / 2 - 80, H * 0.86 - 110, W / 2, H * 0.86, C.pale, 4);
    game.draw.circle(W / 2 - 80, H * 0.86 - 110, 18, C.pale);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink, 0.8);
    label('SCORE ' + score, 270, 90, 56, C.pale);
    label('PERFECT ' + perfects, 270, 170, 36, C.glow);
    for (var i = 0; i < MISSES; i++) bloom(660 + i * 100, 70, 26, i < misses ? C.red : C.stone, 0.9);
    for (var j = 0; j < GOAL; j++) bloom(600 + j * 80, 150, 20, j < caught ? C.glow : C.stone, 0.9);
    var tl = Math.max(0, 1 - playT / TIME_LIMIT);
    game.draw.rect(560, 200, 460, 14, '#222');
    game.draw.rect(560, 200, 460 * tl, 14, tl < 0.25 ? C.red : C.brass);
  }

  function drawScene() {
    drawHall();
    drawGuide();
    drawPendulum();
    drawPad();
    vignette();
  }

  // ---- ATTRACT: 実ロジックで影が印に重なった瞬間に受け止める。4本目は遅れて押してMISS ----
  var demo = { t: 0, press: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt) { initGame(); readyT = 0; }
    if (demo.press > 0) demo.press -= dt;
    if (stopT > 0) { stopT -= dt; return; }
    if (!stopped && swingT > 0 && passes >= 1) {
      var b = bob();
      var late = round % 4 === 3;
      var next = cfg.amp * Math.sin((swingT + dt) / cfg.period * Math.PI * 2);
      var crossing = (b.th > 0) !== (next > 0);
      if ((!late && crossing) || (late && Math.abs(b.th) > 0.18 && Math.abs(next) > Math.abs(b.th) && passes === 2)) { judgeTap(true); demo.press = 0.2; handT = 0.5; }
    }
    if (handT > 0) handT -= dt;
    stepPendulum(dt, true);
    if (misses >= 3 || caught >= 6) demo.t = 0;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(W / 2 + 40, H * 0.86 + 40, { press: demo.press > 0, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.8);
      label(GAME_TITLE, W / 2, 105, 84 + Math.sin(t * 3) * 3, C.glow);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 36, C.pale);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.4, 52, C.brass);
      else label('TAP TO START', W / 2, H * 0.4, 46, C.pale);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.27, W, H * 0.27, C.ink, 0.88);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 100, won ? C.ok : C.red);
      label('SCORE ' + score, W / 2, H * 0.39, 54, C.pale);
      label('PERFECT ' + perfects + '  MISS ' + misses, W / 2, H * 0.435, 38, C.glow);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.485, 48, C.glow);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.485, 36, C.pale);
      if (!won) label('あと' + Math.max(1, GOAL - caught) + '本!', W / 2, H * 0.25, 56, C.brass);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.565, 36, C.pale);
      return;
    }

    // ---- PLAYING ----
    if (handT > 0) handT -= dt;
    if (over) {
      outroT -= dt;
      if (stopT > 0) stopT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, caught: caught, perfects: perfects, misses: misses };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.35);
    } else if (stopT > 0) {
      stopT -= dt;
    } else {
      playT += dt;
      stepPendulum(dt, false);
      if (!over && playT >= TIME_LIMIT) finish(false);
      else if (!over && TIME_LIMIT - playT < 3 && Math.floor(playT * 4) !== Math.floor((playT - dt) * 4)) game.audio.tone(660, 0.05, { wave: 'square', volume: 0.04 });
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 110, C.glow);
    if (over && !won && misses < MISSES) label('TIME UP', W / 2, H * 0.42, 96, C.red);
    if (over && won) label('FINISH', W / 2, H * 0.42, 100, C.glow);
  });

  game.onStart(function() {
    // 静かなホールの持続音(オリジナル): ゆっくりした分散和音
    game.audio.melody([
      ['D4', 1], ['A4', 1], ['F5', 1], ['E5', 1], ['C5', 1], ['A4', 1], ['G4', 2],
      ['Bb3', 1], ['F4', 1], ['D5', 1], ['C5', 1], ['A4', 2], ['R', 2],
    ], { tempo: 84, wave: 'sine', volume: 0.05, loop: true, bass: [['D2', 4], ['Bb1', 4]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

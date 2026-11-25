// J-Switch-0043-beech-peck-recoil.js
// ブナ枯れ木つつき — 洞から顔を出す甲虫を、くちばしが振り戻ってから一発ずつつつく
// 操作: 甲虫が顔を出した洞をタップするとキツツキがつつく。くちばしが戻る前(ゲージが溜まる前)の連打は空回りでミス(社内メモ。画面には出さない)
// 終わり: 10匹つつけばCLEAR。連打の空回り・テントウムシをつつくのが3回/時間切れでGAME OVER
// @mechanic: cooldown_tap
// @theme: beech_woodpecker_recoil_peck
// 世界観: 晩秋のブナ林で、弟子入りしたての見習いキツツキが、師匠の枯れ木を食い荒らす甲虫を一匹ずつつつき出す。くちばしは一度打つと首ごと振り戻るので、戻りきる前にもう一度打とうとしても木を叩けない
// 残るもの: 正誤(CLEAR/GAME OVER) + つついた数・空振り数・最長連続
// スタイル: 90s HANDHELD COLOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 低彩度・少色、小画面前提の太い形
  var STYLE = { bg: ['#c9c29a', '#8f8a5e', '#4d4a33'], main: ['#6b4e32', '#a47b4f', '#e8e0c0'], accent: ['#c8553d', '#e8b04a'] };
  var C = {
    sky1: '#d8d2ac', sky2: '#a9a37a', far: '#8f8a5e', bark: '#6b4e32', barkLo: '#4d3a26', barkHi: '#a47b4f',
    hole: '#241a10', cream: '#e8e0c0', ink: '#2c2a1c', red: '#c8553d', gold: '#e8b04a', green: '#6f8f4a', dim: '#7a7454'
  };

  var GAME_TITLE = 'BEECH PECK';
  var TIME_LIMIT = 14;
  var NEEDED = 10;
  var MAX_MISS = 3;
  var COOL = 0.55;          // くちばしが振り戻るまでの秒
  var TRUNK_X = W / 2, TRUNK_W = 600, TRUNK_TOP = 250, TRUNK_BOT = 1420;
  var HOLES = [
    { x: W / 2 - 150, y: 560 }, { x: W / 2 + 150, y: 520 },
    { x: W / 2 - 150, y: 820 }, { x: W / 2 + 150, y: 860 },
    { x: W / 2 - 150, y: 1120 }, { x: W / 2 + 150, y: 1160 }
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var phase, ready, timeLeft, hits, misses, whiffs, cool, spawnT, bird, focus, hitStop, outro, ok, combo, bestCombo, halfShown, jam;

  var PECKER = [
    ['...rrr....', '..rkkkk...', '.kkkwek...', '.kkkkkyyyy', '..kwwwk...', '..kkwwk...', '..kkkkk...', '...k.k....'],
    ['...rrr....', '..rkkkk...', '.kkkwekyyy', '.kkkkkk..y', '..kwwwk...', '..kkwwk...', '..kkkkk...', '...k.k....']
  ];
  var BEETLE = [
    ['.a....a.', '..a..a..', '.bbbbbb.', 'bbhbbhbb', 'bbbbbbbb', '.bbbbbb.'],
    ['a......a', '.a....a.', '.bbbbbb.', 'bbhbbhbb', 'bbbbbbbb', '.bbbbbb.']
  ];
  var LADY = ['..kk..', '.rrrr.', 'rkrrkr', 'rrrrrr', 'rkrrkr', '.rrrr.'];
  var LEAF = ['..g.', '.ggg', 'ggg.', '.g..'];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function resetHoles() {
    for (var i = 0; i < HOLES.length; i++) { HOLES[i].st = 'idle'; HOLES[i].t = 0; HOLES[i].kind = 'bug'; HOLES[i].dur = 0; }
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; hits = 0; misses = 0; whiffs = 0; cool = 0;
    spawnT = 0.3; bird = { x: HOLES[0].x - 130, y: HOLES[0].y, peck: 0, flip: false };
    focus = null; hitStop = 0; outro = 0; ok = false; combo = 0; bestCombo = 0; halfShown = false; jam = 0;
    resetHoles();
  }

  // 甲虫の出入り(実プレイ・デモ共用)
  function stepHoles(dt, pace) {
    spawnT -= dt;
    if (spawnT <= 0) {
      var free = [];
      for (var i = 0; i < HOLES.length; i++) if (HOLES[i].st === 'idle') free.push(HOLES[i]);
      if (free.length) {
        var h = free[Math.floor(game.random(0, free.length - 0.001))];
        var r = game.random(0, 1);
        h.kind = r < 0.14 ? 'lady' : r < 0.26 ? 'feint' : r < 0.36 ? 'gold' : 'bug';
        h.st = 'warn'; h.t = 0.5;
        h.dur = h.kind === 'feint' ? 0.3 : (1.05 - hits * 0.03) / pace;
        game.audio.tone(h.kind === 'lady' ? 'E5' : 'C4', 0.05, { wave: 'triangle', volume: 0.03 });
      }
      spawnT = Math.max(0.42, 0.8 - hits * 0.035) / pace;
    }
    for (var j = 0; j < HOLES.length; j++) {
      var o = HOLES[j];
      if (o.st === 'warn') { o.t -= dt; if (o.t <= 0) { o.st = 'up'; o.t = o.dur; } }
      else if (o.st === 'up') { o.t -= dt; if (o.t <= 0) { o.st = 'down'; o.t = 0.2; } }
      else if (o.st === 'down') { o.t -= dt; if (o.t <= 0) o.st = 'idle'; }
    }
  }

  function holeAt(x, y) {
    for (var i = 0; i < HOLES.length; i++) if (Math.hypot(x - HOLES[i].x, y - HOLES[i].y) < 130) return HOLES[i];
    return null;
  }

  // つつく(実プレイ・デモ共用)。戻り値: 'jam'|'hit'|'lady'|'whiff'
  function peck(h, isDemo) {
    if (cool > 0) {
      jam = 0.35;
      cool += 0.3;
      if (isDemo) { game.fx.burst(bird.x, bird.y - 40, { color: C.red, count: 6, speed: 150 }); return 'jam'; }
      misses++; combo = 0;
      game.feedback.bad(bird.x, bird.y - 110, { text: 'MISS', color: C.red });
      focus = { x: bird.x, y: bird.y, t: 0.4 };
      if (misses >= MAX_MISS) finish(false);
      else hitStop = 0.3;
      return 'jam';
    }
    cool = COOL;
    bird.flip = h.x > TRUNK_X;
    bird.x = h.x + (bird.flip ? 120 : -120); bird.y = h.y + 10; bird.peck = 0.18;
    game.audio.play('se_tap', 0.3);
    if (h.st === 'up' && h.kind !== 'feint') {
      if (h.kind === 'lady') {
        h.st = 'down'; h.t = 0.2;
        if (isDemo) return 'lady';
        misses++; combo = 0;
        game.feedback.bad(h.x, h.y - 100, { text: 'MISS', color: C.red });
        focus = { x: h.x, y: h.y, t: 0.5 };
        if (misses >= MAX_MISS) finish(false); else hitStop = 0.35;
        return 'lady';
      }
      var gain = h.kind === 'gold' ? 2 : 1;
      h.st = 'down'; h.t = 0.2;
      if (isDemo) { hits += gain; game.fx.burst(h.x, h.y, { color: C.gold, count: 10, speed: 260 }); return 'hit'; }
      hits = Math.min(NEEDED, hits + gain); combo++; if (combo > bestCombo) bestCombo = combo;
      game.feedback.good(h.x, h.y - 100, { text: h.kind === 'gold' ? 'PERFECT' : combo >= 3 ? 'NICE' : 'GOOD', color: h.kind === 'gold' ? C.gold : C.cream, count: 12 });
      if (h.kind === 'gold') game.audio.play('se_coin', 0.4);
      focus = { x: h.x, y: h.y, t: 0.25 };
      if (!halfShown && hits >= NEEDED / 2) {
        halfShown = true;
        game.audio.play('se_milestone', 0.5);
        game.fx.popup(hits + ' / ' + NEEDED, W / 2, 330, { color: C.gold, size: 70 });
      }
      if (hits >= NEEDED) finish(true);
      return 'hit';
    }
    whiffs++;
    game.fx.burst(h.x, h.y, { color: C.barkHi, count: 5, speed: 120 });
    game.audio.tone('G3', 0.06, { wave: 'square', volume: 0.04 });
    return 'whiff';
  }

  function finish(win) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.55;
    game.audio.stopBgm();
    if (win) { game.fx.flash(C.cream, 0.25); game.audio.play('se_success', 0.6); }
    else {
      if (timeLeft <= 0) game.feedback.bad(W / 2, H * 0.4, { text: 'TIME UP', color: C.red });
      game.audio.play('se_failure', 0.6);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase !== 'play' || hitStop > 0) return;
    var h = holeAt(x, y);
    if (h) peck(h, false);
    else { game.audio.play('se_tap', 0.1); game.fx.burst(x, y, { color: C.dim, count: 4, speed: 90 }); }
  });

  // ── demo: 顔を出したらつつく。6秒に1回わざと連打して空回り ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.7, press: false, pt: 0, mashed: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6;
    if (cyc < dt || demo.t <= dt) { hits = 0; cool = 0; demo.mashed = false; resetHoles(); spawnT = 0.2; }
    if (cool > 0) cool = Math.max(0, cool - dt);
    if (bird.peck > 0) bird.peck -= dt;
    if (jam > 0) jam -= dt;
    stepHoles(dt, 0.8);
    demo.pt -= dt;
    demo.press = demo.pt > 0;
    var target = null;
    for (var i = 0; i < HOLES.length; i++) if (HOLES[i].st === 'up' && HOLES[i].kind !== 'lady' && HOLES[i].kind !== 'feint') target = HOLES[i];
    var aim = target || HOLES[Math.floor(demo.t / 1.3) % HOLES.length];
    demo.gx += (aim.x + 30 - demo.gx) * Math.min(1, dt * 9);
    demo.gy += (aim.y + 50 - demo.gy) * Math.min(1, dt * 9);
    if (target && cool <= 0 && Math.hypot(demo.gx - target.x - 30, demo.gy - target.y - 50) < 40) {
      demo.pt = 0.18; peck(target, true);
      if (!demo.mashed && cyc > 3) { demo.mashed = true; peck(target, true); }
    }
  }

  // ── drawing ──
  function drawWood() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky1], [0.6, C.sky2], [1, C.far]]);
    for (var i = 0; i < 7; i++) {
      var fx = 60 + i * 170 + Math.sin(t * 0.4 + i) * 6;
      game.draw.rect(fx, 300 + (i % 3) * 30, 40, 1200, C.far, 0.55);
    }
    for (var k = 0; k < 9; k++) {
      var ly = ((t * 60 + k * 230) % 1500) + 200;
      game.draw.sprite(LEAF, { g: k % 2 ? C.gold : C.red }, 80 + ((k * 137) % 920) + Math.sin(t * 2 + k) * 30, ly, 9, { anchor: 'center', alpha: 0.7 });
    }
    game.draw.rect(TRUNK_X - TRUNK_W / 2, TRUNK_TOP, TRUNK_W, TRUNK_BOT - TRUNK_TOP, C.bark);
    game.draw.rect(TRUNK_X - TRUNK_W / 2, TRUNK_TOP, 60, TRUNK_BOT - TRUNK_TOP, C.barkLo);
    game.draw.rect(TRUNK_X + TRUNK_W / 2 - 50, TRUNK_TOP, 50, TRUNK_BOT - TRUNK_TOP, C.barkHi, 0.6);
    for (var s = 0; s < 14; s++) game.draw.rect(TRUNK_X - 220 + (s * 97) % 440, TRUNK_TOP + 40 + s * 80, 12, 60, C.barkLo, 0.6);
    game.draw.rect(0, 0, W, H, C.cream, 0.03 + 0.03 * Math.sin(t * 1.4));
  }

  function drawHoles() {
    var t = game.time.elapsed;
    for (var i = 0; i < HOLES.length; i++) {
      var h = HOLES[i];
      var shakeX = h.st === 'warn' ? Math.sin(t * 50) * 6 : 0;
      game.draw.circle(h.x, h.y, 86, C.barkLo);
      game.draw.circle(h.x + shakeX, h.y, 70, C.hole);
      if (h.st === 'warn' && Math.floor(t * 12) % 2 === 0) {
        game.draw.circle(h.x, h.y, 92, h.kind === 'lady' ? C.red : C.gold, 0.25);
        game.fx.burst(h.x + game.random(-40, 40), h.y - 60, { color: C.barkHi, count: 1, speed: 60 });
      }
      if (h.st === 'up' || h.st === 'down') {
        var rise = h.st === 'up' ? Math.min(1, (h.dur - h.t) / 0.12) : h.t / 0.2;
        if (h.kind === 'feint') rise = Math.min(rise, 0.45);
        var by = h.y + 30 - rise * 40 + Math.sin(t * 8 + i) * 3;
        if (h.kind === 'lady') game.draw.sprite(LADY, { k: C.ink, r: C.red }, h.x, by, 16, { anchor: 'center' });
        else game.draw.sprite(BEETLE[Math.floor(t * 6 + i) % 2], { a: C.ink, b: h.kind === 'gold' ? C.gold : C.green, h: C.cream }, h.x, by, 15, { anchor: 'center' });
      }
    }
  }

  function drawBird() {
    var t = game.time.elapsed;
    var shake = jam > 0 ? Math.sin(t * 70) * 10 : 0;
    var lean = bird.peck > 0 ? (bird.flip ? -30 : 30) : 0;
    game.draw.sprite(PECKER[bird.peck > 0 ? 1 : 0], { r: C.red, k: C.ink, w: C.cream, e: C.gold, y: C.gold }, bird.x + lean + shake, bird.y + Math.sin(t * 3) * 5, 14, { anchor: 'center', flipX: bird.flip });
    if (jam > 0) game.draw.circle(bird.x, bird.y - 30, 90, C.red, 0.25);
  }

  function drawThumb() {
    var t = game.time.elapsed;
    game.draw.rect(0, 1440, W, H - 1440, C.barkLo);
    for (var r = 0; r < 6; r++) game.draw.rect(r * 190 + Math.sin(t + r) * 4, 1440, 110, 40, C.bark);
    // くちばしの戻りゲージ(満ちれば叩ける)
    var k = 1 - Math.min(1, cool / COOL);
    game.draw.rect(140, 1560, W - 280, 60, C.ink);
    game.draw.rect(146, 1566, (W - 292) * k, 48, k >= 1 ? C.gold : C.dim);
    game.draw.sprite(PECKER[k >= 1 ? 0 : 1], { r: C.red, k: C.ink, w: C.cream, e: C.gold, y: C.gold }, 90, 1590 + (k >= 1 ? Math.sin(t * 5) * 6 : 0), 8, { anchor: 'center' });
    for (var m = 0; m < MAX_MISS; m++) game.draw.sprite(LADY, { k: C.ink, r: m < misses ? C.red : C.dim }, W / 2 - 100 + m * 100, 1720, 9, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, C.ink, 0.8);
    txt(hits + ' / ' + NEEDED, W / 2, 95, 70, C.cream);
    txt(String(Math.ceil(timeLeft)), 60, 95, 54, C.gold, 'left');
    if (combo >= 2) txt('x' + combo, W - 60, 95, 48, C.gold, 'right');
    game.draw.rect(60, 170, W - 120, 18, C.dim);
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 18, timeLeft < 4 ? C.red : C.gold);
  }

  function score() { return hits * 100 + (MAX_MISS - misses) * 50 + Math.ceil(timeLeft) * 10; }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawWood(); drawHoles(); drawBird(); drawThumb();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 13 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.8);
      txt(GAME_TITLE, W / 2, 95 + Math.sin(t * 2) * 6, 80, C.cream);
      txt('HI-SCORE ' + game.best, W / 2, 180, 36, C.gold);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.975, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.975, 34, C.cream);
      return;
    }
    if (state === S.RESULT) {
      drawWood(); drawHoles(); drawThumb();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.42, 92, ok ? C.gold : C.red);
      txt('SCORE ' + (ok ? score() : 0), W / 2, H * 0.48, 46, C.cream);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.975, 38, C.cream);
      return;
    }

    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'play') {
      if (hitStop > 0) hitStop -= dt;
      else {
        timeLeft -= dt;
        if (cool > 0) { cool -= dt; if (cool <= 0) { cool = 0; game.audio.tone('A4', 0.04, { wave: 'triangle', volume: 0.03 }); } }
        if (bird.peck > 0) bird.peck -= dt;
        if (jam > 0) jam -= dt;
        stepHoles(dt, 1);
        if (timeLeft <= 0) { timeLeft = 0; finish(false); }
      }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      if (outro <= 0) {
        state = S.RESULT;
        var stats = { hits: hits, misses: misses, whiffs: whiffs, bestCombo: bestCombo };
        if (ok) game.end.success(score(), stats); else game.end.failure(stats);
        return;
      }
    }

    drawWood(); drawHoles(); drawBird(); drawThumb(); drawHud();
    if (focus) {
      focus.t -= dt;
      if (Math.floor(t * 16) % 2 === 0) game.draw.circle(focus.x, focus.y, 120, '#ffffff', 0.4);
      if (focus.t <= 0 && phase !== 'stop') focus = null;
    }
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 100, C.gold);
    if (phase === 'outro') {
      game.draw.rect(0, H * 0.35, W, H * 0.17, C.ink, 0.88);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 92, ok ? C.gold : C.red);
      if (ok && score() > game.best) txt('NEW RECORD', W / 2, H * 0.46, 46, C.gold);
      else if (ok) txt('BEST ' + game.best, W / 2, H * 0.46, 40, C.cream);
      else txt('あと' + Math.max(1, NEEDED - hits) + '匹!', W / 2, H * 0.46, 48, C.cream);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['D5', 0.5], ['A4', 0.25], ['A4', 0.25], ['D5', 0.5], ['F5', 0.5],
      ['E5', 0.5], ['C5', 0.25], ['C5', 0.25], ['E5', 0.5], ['A4', 0.5]
    ], { tempo: 132, wave: 'triangle', volume: 0.05, loop: true, bass: [['D3', 1], ['A2', 1], ['C3', 1], ['A2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

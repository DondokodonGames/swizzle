// J-Switch-0007-rainfrog-step-swipe.js
// 雨呼びカエルのステップ — 拍ごとに降りてくる矢印札が輪に重なる瞬間、その向きへ払ってカエルに踊らせ、雨雲を呼び集める
// 操作: 上から降りてくる矢印札が輪に入った瞬間に、矢印と同じ向きへスワイプ。向き違い・拍ずれ・見送りはミス(社内メモ。画面には出さない)
// 終わり: 16枚のうち12枚以上そろえて踊り切ればCLEAR。ミス5回/時間切れでGAME OVER
// @mechanic: swipe_direction
// @theme: rain_calling_frog_dance
// 世界観: 日照り続きの田んぼのあぜ道、蓮の葉の舞台に立ったアマガエルが、太鼓の拍に合わせて右へ左へ跳ね踊り、決めた振りの数だけ空に雨雲を呼び寄せて夕立を降らせる
// 残るもの: 正誤(CLEAR/GAME OVER) + そろえた振りの数・PERFECT数・最大コンボ
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: 影なし・丸角・余白、ベタ塗り数色
  var STYLE = { bg: ['#fdf1dc', '#ffe0a8', '#bfe3d0'], main: ['#2ec4b6', '#3a8a5a', '#264653'], accent: ['#ff6b6b', '#ffd166'] };
  var C = {
    sky1: '#ffd9a0', sky2: '#fdf1dc', field: '#bfe3d0', fieldD: '#8cc9a8', teal: '#2ec4b6', leaf: '#3a8a5a', navy: '#264653',
    coral: '#ff6b6b', yellow: '#ffd166', white: '#ffffff', cloud: '#8a9aa8', cloudL: '#c8d4dc', rain: '#5a9ad8', frog: '#6ad06a', frogD: '#3a9a4a', card: '#ffffff'
  };

  var GAME_TITLE = 'RAIN STEP';
  var TIME_LIMIT = 14;
  var TOTAL = 16;
  var NEEDED = 12;
  var MAX_MISS = 5;
  var BEAT = 0.55, LEAD = 1.1;
  var RING_Y = H * 0.38, CARD_SPD = 520;
  var PERFECT_W = 0.08, GOOD_W = 0.2;
  var BEATS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 9.5, 10.5, 11, 12, 12.5, 13.5];
  var DIRS = ['left', 'right', 'up', 'down'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var phase, ready, timeLeft, songT, cards, hits, perfects, misses, combo, maxCombo, pose, poseT, hitStop, outro, ok, halfShown, ringFx, beatIdx, focus, clouds;

  // ── sprites ───────────────────────────────────────────────────────
  var FROG = {
    idle: ['..ee..ee..', '.ewke.ewke', '.gggggggg.', 'gggwwwwggg', 'ggwwwwwwgg', '.gggggggg.', '.gg....gg.', 'gg......gg'],
    left: ['g.ee..ee..', 'gewke.ewke', '.gggggggg.', '.ggwwwwggg', '.gwwwwwwgg', '.gggggggg.', '.gg....gg.', 'gg......gg'],
    right: ['..ee..ee.g', '.ewke.ewkg', '.gggggggg.', 'gggwwwwgg.', 'ggwwwwwwg.', '.gggggggg.', '.gg....gg.', 'gg......gg'],
    up: ['g.ee..ee.g', 'gewke.ewkg', '.gggggggg.', '.ggwwwwgg.', '.gwwwwwwg.', '.gggggggg.', '..gg..gg..', '..g....g..'],
    down: ['..........', '..ee..ee..', '.ewke.ewke', 'gggggggggg', 'ggwwwwwwgg', 'gggwwwwggg', 'gg......gg', 'g........g']
  };
  var ARROW = {
    up: ['...aa...', '..aaaa..', '.aaaaaa.', 'aaaaaaaa', '...aa...', '...aa...', '...aa...', '...aa...'],
    down: ['...aa...', '...aa...', '...aa...', '...aa...', 'aaaaaaaa', '.aaaaaa.', '..aaaa..', '...aa...'],
    left: ['...a....', '..aa....', '.aaa....', 'aaaaaaaa', 'aaaaaaaa', '.aaa....', '..aa....', '...a....'],
    right: ['....a...', '....aa..', '....aaa.', 'aaaaaaaa', 'aaaaaaaa', '....aaa.', '....aa..', '....a...']
  };
  var DRUM = ['.rrrrrr.', 'rwwwwwwr', 'rrrrrrrr', 'r.r.r.rr', 'rr.r.r.r', 'rrrrrrrr'];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x, y + 4, { size: sz, color: C.navy, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  // 丸角の板(重ね塗りで濃淡が出ないよう不透明で塗る)
  function rrect(x, y, w, h, r, col) {
    game.draw.rect(x + r, y, w - r * 2, h, col);
    game.draw.rect(x, y + r, w, h - r * 2, col);
    game.draw.circle(x + r, y + r, r, col); game.draw.circle(x + w - r, y + r, r, col);
    game.draw.circle(x + r, y + h - r, r, col); game.draw.circle(x + w - r, y + h - r, r, col);
  }

  function buildCards() {
    var out = [], prev = null;
    for (var i = 0; i < BEATS.length; i++) {
      var d = DIRS[Math.floor(game.random(0, 4)) % 4];
      if (i > 0 && BEATS[i] - BEATS[i - 1] < 0.9 && Math.random() < 0.5) d = prev;
      prev = d;
      out.push({ t: LEAD + BEATS[i] * BEAT, dir: d, st: 'wait', gold: i % 5 === 4 });
    }
    return out;
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; songT = 0; cards = buildCards();
    hits = 0; perfects = 0; misses = 0; combo = 0; maxCombo = 0; pose = 'idle'; poseT = 0;
    hitStop = 0; outro = 0; ok = false; halfShown = false; ringFx = null; beatIdx = -1; focus = null; clouds = 0;
  }

  function nextCard() {
    for (var i = 0; i < cards.length; i++) if (cards[i].st === 'wait') return cards[i];
    return null;
  }

  // 払いの判定(実プレイ・デモ共用)
  function judgeSwipe(dir, isDemo) {
    var c = nextCard();
    if (!c) return null;
    var d = Math.abs(c.t - songT);
    if (d > 0.45) {
      if (!isDemo) game.audio.tone('C4', 0.04, { wave: 'triangle', volume: 0.03 });
      return null;
    }
    pose = dir; poseT = 0.3;
    if (dir === c.dir && d <= GOOD_W) {
      c.st = 'hit';
      var perfect = d <= PERFECT_W;
      combo++; if (combo > maxCombo) maxCombo = combo;
      ringFx = { t: 0.25, col: perfect ? C.yellow : C.teal };
      if (isDemo) { clouds = Math.min(TOTAL, clouds + 1); game.fx.burst(W / 2, RING_Y, { color: C.teal, count: 6, speed: 180 }); return true; }
      hits++; clouds = hits;
      if (perfect) perfects++;
      game.feedback.good(W / 2, RING_Y - 130, { text: perfect || c.gold ? 'PERFECT' : 'GOOD', color: perfect ? C.yellow : C.teal, count: c.gold ? 16 : 8, size: 52 });
      if (combo > 0 && combo % 6 === 0) { game.audio.play('se_powerup', 0.35); game.fx.popup('x' + combo, W * 0.8, H * 0.3, { color: C.coral, size: 60 }); }
      if (!halfShown && hits >= NEEDED / 2) {
        halfShown = true;
        game.audio.play('se_milestone', 0.5);
        game.fx.popup(hits + ' / ' + NEEDED, W / 2, H * 0.2, { color: C.navy, size: 64 });
      }
      return true;
    }
    c.st = 'miss';
    missOne(c, isDemo);
    return false;
  }

  function missOne(c, isDemo) {
    combo = 0;
    ringFx = { t: 0.3, col: C.coral };
    if (isDemo) { game.fx.burst(W / 2, RING_Y, { color: C.coral, count: 6, speed: 160 }); return; }
    misses++;
    focus = c;
    if (misses >= MAX_MISS) { finish(false); return; }
    game.feedback.bad(W / 2, RING_Y - 130, { text: 'MISS', color: C.coral, size: 52, shake: 6 });
  }

  // 曲の進行(実プレイ・デモ共用)
  function stepSong(dt, isDemo) {
    songT += dt;
    var bi = Math.floor((songT - LEAD) / BEAT);
    if (bi !== beatIdx) {
      beatIdx = bi;
      if (!isDemo && bi >= 0 && bi < 15) game.audio.tone(bi % 2 === 0 ? 'C3' : 'G3', 0.06, { wave: 'triangle', volume: 0.06 });
    }
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      if (c.st === 'wait' && songT - c.t > GOOD_W) { c.st = 'miss'; missOne(c, isDemo); if (phase !== 'play' && !isDemo) return; }
    }
    if (poseT > 0) { poseT -= dt; if (poseT <= 0) pose = 'idle'; }
    if (ringFx) { ringFx.t -= dt; if (ringFx.t <= 0) ringFx = null; }
  }

  function allDone() {
    for (var i = 0; i < cards.length; i++) if (cards[i].st === 'wait') return false;
    return true;
  }

  function finish(win) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.55;
    game.audio.stopBgm();
    if (win) { game.fx.flash(C.rain, 0.25); game.audio.play('se_success', 0.6); }
    else {
      game.feedback.bad(W / 2, RING_Y - 180, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS', color: C.coral });
      game.audio.play('se_failure', 0.6);
    }
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase === 'play') { game.audio.play('se_tap', 0.1); game.fx.burst(x, y, { color: C.teal, count: 3, speed: 90 }); }
  });
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || phase !== 'play') return;
    game.audio.play('se_jump', 0.2);
    if (judgeSwipe(dir, false) === null) game.fx.burst(W / 2, H * 0.84, { color: C.cloudL, count: 4, speed: 120 });
  });

  // ── demo(札が輪に入った瞬間に同じ向きへ払う。4枚目ごとに向きを間違える)──
  var demo = { t: 0, gx: W / 2, gy: H * 0.84, n: 0, sw: 0, dir: 'up', press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 10;
    if (cyc < dt || demo.t <= dt) { songT = 0; cards = buildCards(); demo.n = 0; beatIdx = -1; clouds = 0; }
    stepSong(dt, true);
    var c = nextCard();
    if (c && songT >= c.t - 0.01) {
      var wrong = demo.n % 4 === 3;
      var dir = c.dir;
      if (wrong) dir = dir === 'left' ? 'right' : (dir === 'right' ? 'left' : (dir === 'up' ? 'down' : 'up'));
      judgeSwipe(dir, true);
      demo.n++; demo.sw = 0.25; demo.dir = dir;
    }
    if (demo.sw > 0) demo.sw -= dt;
    var k = demo.sw > 0 ? (0.25 - demo.sw) / 0.25 : 0;
    var dx = demo.dir === 'left' ? -1 : (demo.dir === 'right' ? 1 : 0);
    var dy = demo.dir === 'up' ? -1 : (demo.dir === 'down' ? 1 : 0);
    demo.gx = W / 2 + dx * 220 * k; demo.gy = H * 0.84 + dy * 120 * k;
    demo.press = demo.sw > 0;
  }

  // ── drawing ───────────────────────────────────────────────────────
  function drawField() {
    var t = game.time.elapsed;
    var gray = Math.min(1, clouds / TOTAL);
    game.draw.gradient(0, H, [[0, gray > 0.6 ? C.cloudL : C.sky1], [0.45, C.sky2], [0.5, C.field], [1, C.fieldD]]);
    game.draw.circle(W * 0.82, H * 0.13, 70, C.yellow, 1 - gray * 0.8);
    // 呼び寄せた雨雲
    for (var i = 0; i < Math.min(TOTAL, clouds); i++) {
      var cx = ((i * 157) % (W - 160)) + 80 + Math.sin(t + i) * 10, cy = 260 + (i % 4) * 36;
      game.draw.circle(cx, cy, 58, C.cloud); game.draw.circle(cx + 50, cy + 10, 44, C.cloud); game.draw.circle(cx - 46, cy + 12, 40, C.cloud);
    }
    if (ok && phase !== 'play') for (var r = 0; r < 30; r++) game.draw.rect((r * 97 + t * 50) % W, (t * 900 + r * 131) % H, 6, 30, C.rain, 0.7);
    // 田んぼのあぜと稲
    for (var row = 0; row < 7; row++) {
      var ry = H * 0.52 + row * 60;
      game.draw.rect(0, ry, W, 10, C.fieldD);
      for (var s = 0; s < 12; s++) game.draw.rect(s * 92 + (row % 2) * 46 + Math.sin(t * 2 + s + row) * 4, ry - 30, 8, 30, C.leaf);
    }
    game.draw.rect(0, 0, W, H, C.white, 0.02 + 0.02 * Math.sin(t * 1.5));
  }

  function drawCards() {
    var t = game.time.elapsed;
    // 輪
    var rc = ringFx ? ringFx.col : C.navy;
    game.draw.circle(W / 2, RING_Y, 100, rc, ringFx ? 0.35 : 0.12);
    game.draw.circle(W / 2, RING_Y, 86, C.sky2, 0.6);
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      if (c.st === 'hit') continue;
      var y = RING_Y - (c.t - songT) * CARD_SPD;
      if (y < 230 || y > H * 0.5) continue;
      var alpha = c.st === 'miss' ? 0.35 : 1;
      var hl = focus === c && phase === 'stop' && Math.floor(t * 14) % 2 === 0;
      rrect(W / 2 - 70, y - 70, 140, 140, 28, hl ? C.coral : (c.st === 'miss' ? C.cloudL : (c.gold ? C.yellow : C.card)));
      game.draw.sprite(ARROW[c.dir], { a: c.st === 'miss' ? C.coral : C.navy }, W / 2, y, 11, { anchor: 'center', alpha: alpha });
    }
  }

  function drawFrog() {
    var t = game.time.elapsed;
    // 蓮の葉の舞台
    game.draw.circle(W / 2, H * 0.66, 230, C.leaf);
    game.draw.circle(W / 2, H * 0.655, 214, C.teal, 0.5);
    var hop = pose === 'up' ? 60 : (pose === 'down' ? -10 : Math.abs(Math.sin(t * 5.7)) * 12);
    var sx = pose === 'left' ? -40 : (pose === 'right' ? 40 : Math.sin(t * 2.8) * 8);
    game.draw.sprite(FROG[pose], { g: C.frog, w: '#e8ffd0', e: C.frogD, k: C.navy }, W / 2 + sx, H * 0.6 - hop, 26, { anchor: 'center' });
    game.draw.sprite(DRUM, { r: C.coral, w: C.white }, W * 0.15, H * 0.63 + (beatIdx % 2 === 0 ? 4 : 0), 16, { anchor: 'center' });
  }

  function drawPad() {
    var t = game.time.elapsed;
    rrect(W / 2 - 300, H * 0.76, 600, 290, 60, C.sky2);
    var dirs = [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]];
    for (var i = 0; i < 4; i++) {
      var d = dirs[i];
      var lit = pose === d[0] && poseT > 0;
      game.draw.sprite(ARROW[d[0]], { a: lit ? C.teal : C.cloudL }, W / 2 + d[1] * 200, H * 0.835 + d[2] * 90, 7, { anchor: 'center' });
    }
    for (var m = 0; m < MAX_MISS; m++) game.draw.circle(W / 2 - 160 + m * 80, H * 0.94, 16, m < misses ? C.coral : C.cloudL);
  }

  function drawHud() {
    rrect(20, 16, W - 40, 200, 40, C.navy);
    txt(hits + ' / ' + NEEDED, W / 2, 80, 60, C.white);
    txt(String(Math.ceil(timeLeft)), 80, 80, 48, C.yellow, 'left');
    if (combo >= 2) txt('x' + combo, W - 80, 80, 44, C.coral, 'right');
    game.draw.rect(70, 150, W - 140, 14, C.teal, 0.3);
    game.draw.rect(70, 150, (W - 140) * Math.max(0, timeLeft / TIME_LIMIT), 14, timeLeft < 4 ? C.coral : C.yellow);
    game.draw.rect(70, 180, W - 140, 10, C.cloudL, 0.3);
    var gone = 0;
    for (var i = 0; i < cards.length; i++) if (cards[i].st !== 'wait') gone++;
    game.draw.rect(70, 180, (W - 140) * gone / TOTAL, 10, C.teal);
  }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawField(); drawCards(); drawFrog(); drawPad();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      rrect(20, 16, W - 40, 200, 40, C.navy);
      txt(GAME_TITLE, W / 2, 85 + Math.sin(t * 2) * 6, 76, C.yellow);
      txt('HI-SCORE ' + game.best, W / 2, 170, 34, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.975, 40, C.coral);
      else txt('INSERT COIN', W / 2, H * 0.975, 34, C.navy);
      return;
    }

    if (state === S.RESULT) {
      drawField(); drawFrog();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 96, ok ? C.teal : C.coral);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.975, 38, C.navy);
      return;
    }

    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) {
        phase = 'play'; game.audio.play('se_tap', 0.5);
        game.audio.melody([
          ['G4', 1], ['A4', 1], ['C5', 1], ['A4', 1], ['D5', 1], ['C5', 1], ['A4', 2],
          ['G4', 1], ['E4', 1], ['G4', 1], ['A4', 1], ['C5', 1], ['A4', 1], ['G4', 2]
        ], { tempo: 60 / BEAT, wave: 'triangle', volume: 0.045, loop: true, bass: [['C3', 2], ['F2', 2], ['G2', 2], ['C3', 2]] });
      }
    } else if (phase === 'play') {
      timeLeft -= dt;
      stepSong(dt, false);
      if (phase === 'play') {
        if (allDone()) finish(hits >= NEEDED);
        else if (timeLeft <= 0) { timeLeft = 0; finish(false); }
      }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      if (outro <= 0) {
        state = S.RESULT;
        var score = hits * 100 + perfects * 50 + maxCombo * 20;
        var stats = { steps: hits, perfect: perfects, maxCombo: maxCombo, misses: misses };
        if (ok) game.end.success(score, stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawField(); drawCards(); drawFrog(); drawPad(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 100, C.coral);
    if (phase === 'outro') {
      var sc = hits * 100 + perfects * 50 + maxCombo * 20;
      rrect(40, H * 0.25, W - 80, H * 0.16, 40, C.navy);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.29, 96, ok ? C.yellow : C.coral);
      txt('SCORE ' + sc, W / 2, H * 0.34, 44, C.white);
      if (ok && sc > game.best) txt('NEW RECORD', W / 2, H * 0.38, 40, C.yellow);
      else if (!ok) txt('あと' + Math.max(1, NEEDED - hits) + '回!', W / 2, H * 0.38, 44, C.white);
      else txt('BEST ' + game.best, W / 2, H * 0.38, 36, C.white);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['C5', 0.5], ['D5', 0.5], ['E5', 1], ['G5', 0.5], ['E5', 0.5], ['D5', 1],
      ['C5', 0.5], ['A4', 0.5], ['G4', 1], ['A4', 0.5], ['C5', 0.5], ['C5', 1]
    ], { tempo: 112, wave: 'triangle', volume: 0.045, loop: true, bass: [['C3', 2], ['G2', 2], ['A2', 2], ['C3', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

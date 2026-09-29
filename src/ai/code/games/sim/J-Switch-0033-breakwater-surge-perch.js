// J-Switch-0033-breakwater-surge-perch.js
// 防波堤の見張りペンギン — 左右から同時に来る二つの波を見比べ、小さいほうの杭へ跳び移って満ち潮が引くまで持ちこたえる
// 操作: 画面の左半分/右半分をタップすると、その側の杭へペンギンが跳び移る。波が届いた瞬間に立っている側で判定(社内メモ。画面には出さない)
// 終わり: 8つの波を小さいほうでしのげばCLEAR。大きいほうでかぶると1ミス、3ミスか時間切れでGAME OVER
// @mechanic: size_judge
// @theme: breakwater_penguin_surge
// 世界観: 冬の終わりの石の防波堤の突端で、見張り番の子ペンギンが、左右の水路から同時に押し寄せる二つの波の高さを見比べて低いほうの杭へ跳び移り、満ち潮が引くまで足場に残る
// 残るもの: 正誤(CLEAR/GAME OVER) + しのいだ波の数・即決(PERFECT)数・ミス数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 紙と墨の2値。階調は横線ディザの密度で作る
  var STYLE = { bg: ['#f2eee2', '#e6e0cf', '#f2eee2'], main: ['#141414', '#141414'], accent: ['#141414', '#f2eee2'] };
  var PAPER = STYLE.bg[0], PAPER2 = STYLE.bg[1], INK = STYLE.main[0];

  var GAME_TITLE = 'SURGE PERCH';
  var TIME_LIMIT = 15;
  var NEEDED = 8;
  var MAX_LIVES = 3;
  var SPAWN_Y = H * 0.17;
  var IMPACT_Y = H * 0.6;
  var POST_Y = H * 0.655;
  var POST_X = [W * 0.28, W * 0.72];
  var DIFFS = [3, 3, 2, 2, 2, 1, 1, 1];
  var APPROACH = [1.4, 1.3, 1.2, 1.1, 1.05, 1.0, 0.95, 0.9];
  var GAP = 0.3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // ── スプライト(墨1色) ──
  var PEN_STAND = [
    '...kkkk...',
    '..kkkkkk..',
    '..kk.kwk..',
    '..kkkkkkk.',
    '.kkk..kkk.',
    '.kk....kk.',
    'kk......kk',
    'kk......kk',
    '.kk....kk.',
    '..kk..kk..',
    '..kkkkkk..',
    '.kk....kk.'
  ];
  var PEN_BRACE = [
    '..........',
    '...kkkk...',
    '..kkkkkk..',
    '..kk.kwk..',
    'kkkkkkkkkk',
    'k.kk..kk.k',
    '..k....k..',
    '..k....k..',
    '..kk..kk..',
    '..kkkkkk..',
    '.kk....kk.',
    'kk......kk'
  ];
  var PEN_WET = [
    '..........',
    '..........',
    '...kkkk...',
    '..kk.k.k..',
    '..kkkkkk..',
    'w.kkkkkk.w',
    '.w......w.',
    'wwwwwwwwww',
    '.w.w.w.w.w',
    '..........',
    '..........',
    '..........'
  ];
  var PEN_PAL = { k: INK, w: PAPER };
  var GULL = ['k.....k', '.k...k.', '..k.k..', '...k...'];
  var GULL2 = ['.......', 'kk...kk', '..k.k..', '...k...'];
  var POST = [
    '.kkkkkk.',
    'k......k',
    'k.k..k.k',
    'k......k',
    'k..k...k',
    'k......k',
    'kkkkkkkk'
  ];
  var FISH = ['..k..', '.kkk.', 'kkwkk', '.kkkk', 'k..k.'];

  // ── 状態 ──
  var side, hopT, hopFrom, lives, survived, perfects, combo, timeLeft, wave, gapT, idx;
  var ready, hitStop, finished, ok, done, endWait, swept, hitFx, bestCombo, fishSide;
  var result = { survived: 0, perfects: 0, misses: 0, score: 0 };

  function makeWave(i, pickWrong) {
    var d = DIFFS[Math.min(i, DIFFS.length - 1)];
    var small = 1 + Math.floor(Math.random() * (5 - d));
    var big = small + d;
    var smallSide = Math.random() < 0.5 ? 0 : 1;
    return {
      size: smallSide === 0 ? [small, big] : [big, small],
      smallSide: smallSide, t: 0, T: APPROACH[Math.min(i, APPROACH.length - 1)],
      firstHopAt: -1, done: false, demoWrong: !!pickWrong
    };
  }

  function initGame() {
    side = 0; hopT = 0; hopFrom = 0; lives = MAX_LIVES; survived = 0; perfects = 0; combo = 0; bestCombo = 0;
    timeLeft = TIME_LIMIT; idx = 0; wave = makeWave(0, false); gapT = 0;
    ready = 0.8; hitStop = 0; finished = false; ok = false; done = false; endWait = 0;
    swept = 0; hitFx = null; fishSide = -1;
  }

  function thick(sz) { return 34 + sz * 30; }

  function hop(to, live) {
    if (to === side && hopT <= 0) {
      if (live) { game.audio.play('se_tap', 0.3); game.fx.burst(POST_X[side], POST_Y - 40, { color: INK, count: 4, speed: 90 }); }
      return;
    }
    hopFrom = side; side = to; hopT = 0.18;
    if (wave && wave.firstHopAt < 0) wave.firstHopAt = wave.t / wave.T;
    if (live) { game.audio.play('se_jump', 0.35); game.fx.burst(POST_X[hopFrom], POST_Y - 20, { color: INK, count: 6, speed: 140 }); }
  }

  // 波1セットの進行(PLAYING とデモで共用)。着水したら判定を返す
  function stepWave(dt) {
    if (gapT > 0) { gapT -= dt; return null; }
    wave.t += dt;
    if (wave.t >= wave.T && !wave.done) {
      wave.done = true;
      return side === wave.smallSide ? 'safe' : 'hit';
    }
    return null;
  }

  function resolve(res, live) {
    var bigSide = 1 - wave.smallSide;
    if (res === 'safe') {
      var quick = wave.firstHopAt >= 0 ? wave.firstHopAt < 0.55 : wave.smallSide === side;
      survived++;
      if (live) {
        combo++; if (combo > bestCombo) bestCombo = combo;
        if (quick) perfects++;
        game.feedback.good(POST_X[side], POST_Y - 140, { text: quick ? 'PERFECT' : 'GOOD', color: INK });
        game.fx.burst(POST_X[bigSide], IMPACT_Y, { color: INK, count: 16, speed: 360 });
        if (fishSide === side) { game.fx.popup('+50', POST_X[side], POST_Y - 220, { color: INK, size: 48 }); game.audio.play('se_coin', 0.4); }
        if (survived === 4) { game.fx.popup('4 / ' + NEEDED, W / 2, H * 0.4, { color: INK, size: 64 }); game.audio.play('se_milestone', 0.5); }
      }
      nextWave(live);
      return;
    }
    // hit
    if (live) {
      combo = 0; lives--;
      hitStop = 0.5; swept = 0.6;
      hitFx = { side: side, sz: wave.size[side], t: 0.5 };
      game.fx.flash('#ffffff', 0.15);
      game.feedback.bad(POST_X[side], POST_Y - 60, { text: 'MISS', color: INK, shake: 14 });
      if (lives <= 0) { finished = true; ok = false; finish(); return; }
    } else {
      swept = 0.9;
    }
    nextWave(live);
    gapT += 0.3;
  }

  function nextWave(live) {
    idx++;
    fishSide = -1;
    if (live && survived >= NEEDED) {
      finished = true; ok = true;
      game.fx.burst(POST_X[side], POST_Y - 80, { color: INK, count: 30, speed: 460 });
      game.feedback.good(W / 2, H * 0.4, { text: 'CLEAR', color: INK, size: 80 });
      game.audio.play('se_success', 0.6);
      finish();
      return;
    }
    wave = makeWave(idx, false);
    gapT = GAP;
    if (idx === 2 || idx === 5) fishSide = wave.smallSide;
    if (live) game.audio.tone('D3', 0.25, { wave: 'noise', volume: 0.06 });
  }

  function finish() {
    if (done) return;
    done = true; endWait = 1.3;
    game.audio.stopBgm();
    result.survived = survived; result.perfects = perfects; result.misses = MAX_LIVES - lives;
    result.score = ok ? survived * 100 + perfects * 50 + lives * 100 + bestCombo * 20 : 0;
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); startMusic(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (finished || ready > 0 || hitStop > 0 || swept > 0) {
      game.audio.tone('C4', 0.04, { wave: 'square', volume: 0.03 });
      return;
    }
    hop(x < W / 2 ? 0 : 1, true);
  });

  // ── 描画 ──
  function hatch(x, y, w, h, gap, alpha) {
    for (var yy = y; yy < y + h; yy += gap) game.draw.rect(x, yy, w, 2, INK, alpha);
  }

  function drawBg() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, PAPER], [0.5, PAPER2], [1, PAPER]]);
    // 海面のディザ(沖ほど密)
    for (var i = 0; i < 26; i++) {
      var yy = SPAWN_Y - 40 + i * 30;
      var off = Math.sin(t * 1.3 + i * 0.7) * 30;
      for (var k = 0; k < 7; k++) game.draw.rect(k * 170 + off + (i % 2) * 80, yy, 70 - i * 1.5, 2, INK, 0.5);
    }
    // 空とカモメ
    for (var g = 0; g < 3; g++) {
      var gx = (t * 60 + g * 380) % (W + 200) - 100;
      var gy = H * 0.135 + Math.sin(t * 2 + g) * 14;
      game.draw.sprite(Math.floor(t * 4 + g) % 2 ? GULL : GULL2, { k: INK }, gx, gy, 6, { anchor: 'center' });
    }
    // 防波堤(中央の石積み)
    game.draw.rect(W * 0.12, POST_Y + 40, W * 0.76, 70, PAPER);
    hatch(W * 0.12, POST_Y + 40, W * 0.76, 70, 8, 0.8);
    game.draw.rect(W * 0.38, POST_Y + 110, W * 0.24, H - POST_Y - 110, PAPER);
    hatch(W * 0.38, POST_Y + 110, W * 0.24, H * 0.2, 10, 0.6);
    game.draw.line(W * 0.38, POST_Y + 110, W * 0.38, H, INK, 4);
    game.draw.line(W * 0.62, POST_Y + 110, W * 0.62, H, INK, 4);
    game.draw.line(W * 0.12, POST_Y + 40, W * 0.88, POST_Y + 40, INK, 5);
    for (var p = 0; p < 2; p++) game.draw.sprite(POST, { k: INK }, POST_X[p], POST_Y + 20, 14, { anchor: 'center' });
    // 親指ゾーンの足あと台(左右)
    for (var q = 0; q < 2; q++) {
      var px = q === 0 ? W * 0.2 : W * 0.8;
      var lit = side === q;
      game.draw.circle(px, H * 0.86, 92, INK, lit ? 0.9 : 0.25);
      game.draw.circle(px, H * 0.86, 80, PAPER);
      game.draw.sprite(PEN_STAND, { k: INK, w: PAPER }, px, H * 0.86, 6, { anchor: 'center', alpha: lit ? 1 : 0.35 });
    }
    // ambient pulse
    game.draw.rect(0, 0, W, H, INK, 0.02 + 0.02 * Math.sin(t * 1.5));
  }

  function waveY() { return SPAWN_Y + (IMPACT_Y - SPAWN_Y) * Math.min(1, wave.t / wave.T); }

  function drawWaves() {
    if (!wave || gapT > 0) return;
    var y = waveY();
    var t = game.time.elapsed;
    for (var s = 0; s < 2; s++) {
      var sz = wave.size[s];
      var th = thick(sz);
      var x0 = s === 0 ? 0 : W / 2 + 8, w = W / 2 - 8;
      // 波の本体:大きいほど行間が詰まって黒い
      game.draw.rect(x0, y - th, w, th, PAPER);
      hatch(x0, y - th, w, th, 10 - sz, 0.95);
      // 泡の頭
      for (var f = 0; f < 9; f++) {
        var fx = x0 + 30 + f * (w - 60) / 8;
        game.draw.circle(fx, y - th + Math.sin(t * 8 + f + s) * 4, 14 + sz * 2, PAPER);
        game.draw.circle(fx, y - th + Math.sin(t * 8 + f + s) * 4, 14 + sz * 2, INK, 0.25);
      }
      game.draw.line(x0, y, x0 + w, y, INK, 5);
    }
    // 迫る予告:着水直前に杭の前へ影
    if (wave.t / wave.T > 0.55) {
      var blink = Math.floor(t * 12) % 2 === 0;
      for (var z = 0; z < 2; z++) game.draw.rect(POST_X[z] - 90, IMPACT_Y - 12, 180, 12, INK, blink ? 0.6 : 0.2);
    }
    // 金の魚(小さいほうの側で跳ねる)
    if (fishSide >= 0) {
      var fy = IMPACT_Y - 40 - Math.abs(Math.sin(t * 5)) * 70;
      game.draw.sprite(FISH, { k: INK, w: PAPER }, POST_X[fishSide] + 120, fy, 10, { anchor: 'center' });
    }
  }

  function drawPenguin() {
    var t = game.time.elapsed;
    var x = POST_X[side], y = POST_Y - 70;
    var spr = PEN_STAND;
    if (hopT > 0) {
      var k = 1 - hopT / 0.18;
      x = POST_X[hopFrom] + (POST_X[side] - POST_X[hopFrom]) * k;
      y -= Math.sin(k * Math.PI) * 110;
    } else if (wave && gapT <= 0 && wave.t / wave.T > 0.7) {
      spr = PEN_BRACE;
    }
    if (swept > 0) { spr = PEN_WET; y = POST_Y - 10 + Math.sin(t * 9) * 8; x += Math.sin(t * 5) * 20; }
    game.draw.circle(POST_X[side], POST_Y - 6, 50, INK, 0.2);
    game.draw.sprite(spr, PEN_PAL, x + Math.sin(t * 2.3) * 3, y + Math.cos(t * 3.1) * 3, 13, { anchor: 'center', flipX: side === 1 });
  }

  function drawHitFx(dt) {
    if (!hitFx || hitFx.t <= 0) return;
    hitFx.t -= dt;
    var k = 1 + (0.5 - hitFx.t) * 1.2;
    var x0 = hitFx.side === 0 ? 0 : W / 2;
    var th = thick(hitFx.sz) * k;
    game.draw.rect(x0, IMPACT_Y - th, W / 2, th, '#ffffff', 0.9);
    game.draw.rect(x0, IMPACT_Y - th, W / 2, 8, INK);
    game.draw.rect(x0, IMPACT_Y, W / 2, 8, INK);
  }

  function txt(str, x, y, sz, inv) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: inv ? INK : PAPER, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: inv ? PAPER : INK, bold: true, align: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, PAPER);
    game.draw.line(0, 230, W, 230, INK, 4);
    txt(survived + ' / ' + NEEDED, W * 0.5, 70, 60);
    var bw = W - 200;
    game.draw.rect(100, 140, bw, 20, INK, 0.2);
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    if (!low) game.draw.rect(100, 140, bw * Math.max(0, timeLeft / TIME_LIMIT), 20, INK);
    for (var i = 0; i < MAX_LIVES; i++) {
      game.draw.sprite(PEN_STAND, { k: INK, w: PAPER }, 90 + i * 70, 200, 3.5, { anchor: 'center', alpha: i < lives ? 1 : 0.2 });
    }
    if (combo >= 2) txt('x' + combo, W - 110, 200, 40);
  }

  // ── ATTRACT ゴースト実演(実ロジック stepWave/resolve を使う) ──
  var demo = { t: 0, gx: W * 0.2, gy: H * 0.86, press: false, tapped: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) {
      idx = 0; gapT = 0; side = 0; swept = 0;
      wave = makeWave(0, Math.floor(demo.t / 4.2) % 2 === 1);
      wave.T = 1.3; demo.tapped = false;
    }
    if (hopT > 0) hopT -= dt;
    if (swept > 0) swept -= dt;
    // 波が出てしばらくしてから判断して跳ぶ(失敗回は大きいほうへ)
    if (gapT <= 0 && !demo.tapped && wave.t > wave.T * 0.35) {
      demo.tapped = true;
      var to = wave.demoWrong ? 1 - wave.smallSide : wave.smallSide;
      demo.gx = to === 0 ? W * 0.2 : W * 0.8; demo.gy = H * 0.86;
      demo.press = true;
      hop(to, false);
    }
    if (demo.press && wave.t > wave.T * 0.5) demo.press = false;
    var res = stepWave(dt);
    if (res) {
      if (res === 'safe') game.fx.burst(POST_X[1 - wave.smallSide], IMPACT_Y, { color: INK, count: 12, speed: 300 });
      resolve(res, false);
      wave.demoWrong = false; demo.tapped = false;
    }
  }

  // ── メインループ(1回だけ登録) ──
  game.onUpdate(function(dt) {
    if (wave === undefined) initGame();

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawBg();
      drawWaves();
      drawPenguin();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 230, PAPER);
      txt(GAME_TITLE, W / 2, 80, 72);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 170, 36);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44, true);
      else txt('INSERT COIN', W / 2, H * 0.965, 38);
      return;
    }

    if (state === S.RESULT) {
      drawBg();
      drawPenguin();
      game.draw.rect(W * 0.08, H * 0.28, W * 0.84, H * 0.34, PAPER);
      game.draw.line(W * 0.08, H * 0.28, W * 0.92, H * 0.28, INK, 6);
      game.draw.line(W * 0.08, H * 0.62, W * 0.92, H * 0.62, INK, 6);
      if (ok) txt('CLEAR', W / 2, H * 0.34, 110);
      else { game.draw.rect(W * 0.08, H * 0.3, W * 0.84, 140, INK); txt('GAME OVER', W / 2, H * 0.34, 96, true); }
      txt(result.survived + ' / ' + NEEDED, W / 2, H * 0.42, 60);
      if (ok) txt('SCORE ' + result.score, W / 2, H * 0.475, 48);
      else txt('あと' + (NEEDED - result.survived) + '回!', W / 2, H * 0.475, 50);
      txt('PERFECT ' + result.perfects + '   MISS ' + result.misses, W / 2, H * 0.53, 34);
      var isNew = ok && result.score >= game.best && result.score > 0;
      txt(isNew ? 'NEW RECORD' : 'BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.58, 38);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40);
      return;
    }

    // PLAYING
    if (hopT > 0) hopT -= dt;
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { survived: result.survived, perfects: result.perfects, misses: result.misses };
        if (ok) game.end.success(result.score, stats);
        else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.5);
    } else if (!finished) {
      timeLeft -= dt;
      if (swept > 0) swept -= dt;
      var res = stepWave(dt);
      if (res) resolve(res, true);
      if (!finished && timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.4;
        game.feedback.bad(POST_X[side], POST_Y - 60, { text: 'TIME UP', color: INK });
        game.audio.play('se_failure', 0.5);
        finish();
      }
    }

    drawBg();
    if (hitStop <= 0 || !hitFx) drawWaves();
    drawHitFx(dt);
    drawPenguin();
    drawHud();
    if (ready > 0) {
      game.draw.rect(0, H * 0.45, W, 150, PAPER, 0.9);
      txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.49, 100);
    }
  });

  function startMusic() {
    game.audio.melody([
      ['A4', 0.5], ['C5', 0.5], ['E5', 1], ['D5', 0.5], ['C5', 0.5], ['A4', 1],
      ['G4', 0.5], ['A4', 0.5], ['C5', 1], ['B4', 0.5], ['G4', 0.5], ['E4', 1]
    ], { tempo: 132, wave: 'square', volume: 0.06, loop: true, bass: [['A2', 2], ['F2', 2], ['G2', 2], ['E2', 2]] });
  }

  game.onStart(function() {
    state = S.ATTRACT;
    initGame();
    game.audio.bgm('bgm_tense');
  });
})(game);

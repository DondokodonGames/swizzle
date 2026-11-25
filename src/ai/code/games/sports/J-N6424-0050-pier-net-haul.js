// J-N6424-0050-pier-net-haul.js
// 桟橋ネットホール — 桟橋の境界線をはさんで網袋を綱で奪い合い、連打で自陣へ3袋引き寄せる
// 操作: 画面のどこでも連打すると綱を1手ぶん引く。向こうの一団は常に引き返し、腕を振り上げた直後に強く引く
// 終わり: 3袋すべてを自陣の線まで引き込めばCLEAR。袋が相手の線を越える/時間切れでGAME OVER
// @mechanic: mash
// @theme: harbor_net_sack_haul
// 世界観: 港の荷揚げ祭りで新入りの荷揚げ人が、桟橋の白線をはさんで向こう岸の一団と綱を引き、魚の詰まった網袋を1つずつ自分の荷車側へ連打でたぐり寄せる
// 残るもの: 正誤(CLEAR/GAME OVER) + 引き込んだ袋の数と連打数
// スタイル: 8bit HOME

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 黒 + 3〜4色。8x8タイル反復の桟橋板、1方向の波スクロール
  var PAL = {
    ink: '#101018', sea: '#1c3c8c', sea2: '#3c64c8', plank: '#9c5c28', plank2: '#6c3c14',
    cream: '#f8e8b0', red: '#e03c28', gold: '#f8c838', white: '#fcfcfc', shadow: '#282838'
  };

  var GAME_TITLE = 'PIER HAUL';
  var TIME_LIMIT = 14;
  var NEEDED = 3;
  var PULL = 0.09;
  var MID_Y = H * 0.46;
  var SPAN = H * 0.24;
  var ROPE_X = W / 2;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var SACK = [
    '..cc....',
    '.cccc...',
    'cbbbbc..',
    'bbwbbbb.',
    'bbbbwbb.',
    'bwbbbbb.',
    '.bbbbb..',
    '..bbb...'
  ];
  var HAULER = [
    [
      '..rrr...',
      '..sss...',
      '.rrrrr..',
      'r.rrr.hh',
      '..rrr.h.',
      '..b.b...',
      '.b...b..',
      'bb...bb.'
    ],
    [
      '..rrr...',
      '..sss...',
      '.rrrrrhh',
      '..rrrr..',
      '..rrr...',
      '.b..b...',
      'b....b..',
      'b....bb.'
    ]
  ];
  var CREW = [
    '..kkk...',
    '..kkk...',
    '.kkkkk..',
    'k.kkk.k.',
    '..kkk...',
    '..k.k...',
    '.k...k..',
    'kk...kk.'
  ];
  var GULL = [['........', 'ww....ww', '.ww..ww.', '...ww...'], ['........', '...ww...', '.ww..ww.', 'w......w']];

  var sackP, sackIdx, won, taps, timeLeft, ready, hitStop, endWait, done, ok;
  var surge, tapAnim, sackFlash, lastResult, bestTaps;

  function initGame() {
    sackP = 0; sackIdx = 0; won = 0; taps = 0; timeLeft = TIME_LIMIT;
    ready = 0.8; hitStop = 0; endWait = 0; done = false; ok = false;
    surge = { mode: 'idle', t: 1.8 };
    tapAnim = 0; sackFlash = 0; lastResult = null;
  }

  function oppPower() { return 0.22 + 0.08 * sackIdx; }

  function pullOnce() {
    sackP = Math.min(1.05, sackP + PULL);
    tapAnim = 0.12;
    taps++;
  }

  // 綱の物理(本番とデモで共通)。袋が端に届いたら 'won' / 'lost' を返す
  function simStep(dt) {
    surge.t -= dt;
    if (surge.t <= 0) {
      if (surge.mode === 'idle') { surge.mode = 'warn'; surge.t = 0.65; game.audio.tone('C3', 0.2, { wave: 'square', volume: 0.05 }); }
      else if (surge.mode === 'warn') { surge.mode = 'pull'; surge.t = 0.7; game.audio.tone('G2', 0.3, { wave: 'square', volume: 0.06, slide: -30 }); }
      else { surge.mode = 'idle'; surge.t = game.random(1.5, 2.4); }
    }
    var power = oppPower() * (surge.mode === 'pull' ? 2.3 : 1);
    sackP -= power * dt;
    if (tapAnim > 0) tapAnim -= dt;
    if (sackFlash > 0) sackFlash -= dt;
    if (sackP >= 1) return 'won';
    if (sackP <= -1) return 'lost';
    return null;
  }

  function sackY() { return MID_Y + sackP * SPAN; }

  function txt(str, x, y, size, color) {
    game.draw.text(str, x + 4, y + 4, { size: size, color: PAL.ink, bold: true, align: 'center', font: 'monospace' });
    game.draw.text(str, x, y, { size: size, color: color, bold: true, align: 'center', font: 'monospace' });
  }

  function drawWorld() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, '#0c1c4c'], [0.2, PAL.sea], [1, '#0c1c4c']]);
    // 波(1方向スクロールのタイル)
    for (var wy = 0; wy < 5; wy++) {
      var oy = H * 0.06 + wy * 44;
      var off = (t * 60 + wy * 30) % 64;
      for (var wx = -64; wx < W + 64; wx += 64) game.draw.rect(wx + off, oy, 24, 8, PAL.sea2, 0.8);
    }
    // 桟橋の板(8x8タイルの反復)
    var top = H * 0.17, bot = H * 0.78;
    game.draw.rect(W * 0.2, top, W * 0.6, bot - top, PAL.plank);
    for (var py = top; py < bot; py += 48) {
      game.draw.rect(W * 0.2, py, W * 0.6, 6, PAL.plank2);
      for (var px = W * 0.2 + ((py / 48) % 2) * 60; px < W * 0.8; px += 120) game.draw.rect(px, py + 18, 8, 8, PAL.plank2);
    }
    game.draw.rect(W * 0.2 - 16, top, 16, bot - top, PAL.plank2);
    game.draw.rect(W * 0.8, top, 16, bot - top, PAL.plank2);
    // 中央の白線と両陣の線
    for (var dx = W * 0.2; dx < W * 0.8; dx += 48) game.draw.rect(dx, MID_Y - 5, 32, 10, PAL.white, 0.9);
    game.draw.rect(W * 0.2, MID_Y + SPAN - 4, W * 0.6, 8, PAL.gold);
    game.draw.rect(W * 0.2, MID_Y - SPAN - 4, W * 0.6, 8, PAL.red);
    // カモメ(常時bob+sway)
    for (var g = 0; g < 2; g++) {
      var gx = (t * (50 + g * 30) + g * 400) % (W + 200) - 100;
      var gy = H * 0.12 + Math.sin(t * 2 + g) * 20 + g * 60;
      game.draw.sprite(GULL[Math.floor(t * 4 + g) % 2], { w: PAL.white }, gx, gy, 6, { anchor: 'center' });
    }
    // 環境光のゆらぎ
    game.draw.rect(0, 0, W, H, PAL.gold, 0.02 + 0.02 * Math.sin(t * 1.4));
  }

  function drawRope() {
    var sy = sackY();
    var sway = Math.sin(game.time.elapsed * 7) * (surge.mode === 'pull' ? 10 : 3);
    game.draw.line(ROPE_X, H * 0.2, ROPE_X + sway, sy, PAL.cream, 12);
    game.draw.line(ROPE_X + sway, sy, ROPE_X, H * 0.84, PAL.cream, 12);
    for (var k = 0; k < 12; k++) {
      var ry = H * 0.2 + k * (H * 0.64 / 12);
      game.draw.rect(ROPE_X - 6, ry, 12, 4, PAL.plank2, 0.7);
    }
    // 向こうの一団(半透明シルエット。腕を振り上げたら強く引く合図)
    var warn = surge.mode === 'warn';
    var lean = surge.mode === 'pull' ? -14 : 0;
    for (var c = 0; c < 3; c++) {
      var cx = ROPE_X + (c - 1) * 110;
      var cy = H * 0.19 + lean + Math.sin(game.time.elapsed * 3 + c) * 4;
      var col = warn && Math.floor(game.time.elapsed * 12) % 2 === 0 ? PAL.red : PAL.shadow;
      game.draw.sprite(CREW, { k: col }, cx, cy, 10, { anchor: 'center', alpha: 0.75 });
      if (warn) game.draw.rect(cx - 6, cy - 70, 12, 26, PAL.red);
    }
    // 袋
    var gold = sackIdx === NEEDED - 1;
    var pal = { c: PAL.cream, b: gold ? PAL.gold : PAL.plank, w: PAL.white };
    if (sackFlash > 0) pal = { c: PAL.white, b: PAL.white, w: PAL.white };
    var scale = sackFlash > 0 ? 17 : 13;
    game.draw.circle(ROPE_X + sway, sy + 50, 50, PAL.ink, 0.35);
    game.draw.sprite(SACK, pal, ROPE_X + sway, sy, scale + Math.sin(game.time.elapsed * 5) * 0.6, { anchor: 'center' });
    // こちらの荷揚げ人(親指ゾーン)
    var fr = tapAnim > 0 ? 1 : 0;
    for (var h = 0; h < 2; h++) {
      var hx = ROPE_X + (h === 0 ? -80 : 80);
      var hy = H * 0.86 + (tapAnim > 0 ? 14 : 0) + Math.sin(game.time.elapsed * 2.5 + h) * 4;
      game.draw.sprite(HAULER[fr], { r: PAL.red, s: PAL.cream, h: PAL.cream, b: PAL.ink }, hx, hy, 14, { anchor: 'center', flipX: h === 1 });
    }
  }

  function drawHud() {
    for (var i = 0; i < NEEDED; i++) {
      var ix = W / 2 + (i - 1) * 110;
      var done_ = i < won;
      game.draw.sprite(SACK, { c: PAL.cream, b: done_ ? (i === NEEDED - 1 ? PAL.gold : PAL.plank) : PAL.shadow, w: done_ ? PAL.white : PAL.shadow }, ix, H * 0.045, 7, { anchor: 'center' });
    }
    txt(won + ' / ' + NEEDED, W * 0.86, H * 0.045, 40, PAL.white);
    var bw = W - 160;
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 190, bw, 20, PAL.ink);
    game.draw.rect(80, 190, bw * Math.max(0, timeLeft / TIME_LIMIT), 20, low ? PAL.red : PAL.gold);
  }

  // ── ATTRACT: 実ロジックで1袋引き込む(成功)→ 手を緩めて1袋取られる(失敗)を繰り返す
  var demo = { t: 0, tapClock: 0, gx: W / 2, gy: H * 0.88, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) { sackP = 0; sackIdx = 0; surge = { mode: 'idle', t: 1.2 }; }
    var fast = cyc < 3.0;
    demo.tapClock -= dt;
    demo.press = demo.tapClock > 0.06;
    if (demo.tapClock <= 0) {
      demo.tapClock = fast ? 0.13 : 0.6;
      pullOnce();
      game.fx.burst(ROPE_X, H * 0.8, { color: PAL.cream, count: 3, speed: 160 });
    }
    demo.gx = W / 2 + 40; demo.gy = H * 0.9;
    var r = simStep(dt);
    if (r === 'won') { sackFlash = 0.3; game.fx.burst(ROPE_X, sackY(), { color: PAL.gold, count: 14 }); sackP = 0.2; sackIdx = 1; }
    if (r === 'lost') { sackFlash = 0.3; sackP = 0; }
  }

  function finish(success) {
    if (done) return;
    done = true; ok = success; endWait = 1.2;
    game.audio.stopBgm();
    if (success) {
      game.audio.play('se_success', 0.5);
      game.fx.burst(ROPE_X, sackY(), { color: PAL.gold, count: 30, speed: 420 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin');
      state = S.PLAYING; initGame(); return;
    }
    if (state === S.RESULT) {
      game.audio.play('se_tap', 0.3);
      state = S.ATTRACT; initGame(); demo.t = 0; return;
    }
    if (done || hitStop > 0) { game.audio.play('se_tap', 0.08); return; }
    if (ready > 0) { game.fx.burst(x, y, { color: PAL.shadow, count: 3 }); return; }
    pullOnce();
    game.audio.tone(surge.mode === 'pull' ? 'A3' : 'E4', 0.05, { wave: 'square', volume: 0.05 });
    game.fx.burst(ROPE_X, H * 0.8, { color: PAL.cream, count: 4, speed: 180 });
    if (taps % 10 === 0) game.audio.play('se_tap', 0.15);
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (sackP === undefined) initGame();
      stepDemo(dt);
      drawWorld();
      drawRope();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.07, 76, PAL.gold);
      txt('HI-SCORE ' + game.best, W / 2, H * 0.12, 34, PAL.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 44, PAL.gold);
      else txt('INSERT COIN', W / 2, H * 0.95, 40, PAL.white);
      return;
    }

    if (state === S.RESULT) {
      drawWorld();
      drawRope();
      game.draw.rect(0, H * 0.3, W, H * 0.3, PAL.ink, 0.75);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.37, 96, ok ? PAL.gold : PAL.red);
      txt(won + ' / ' + NEEDED, W / 2, H * 0.44, 56, PAL.white);
      txt('SCORE ' + (ok ? won * 100 + Math.ceil(timeLeft) * 10 : won * 100), W / 2, H * 0.5, 40, PAL.cream);
      if (ok && won * 100 + Math.ceil(timeLeft) * 10 > game.best) txt('NEW RECORD', W / 2, H * 0.55, 44, PAL.gold);
      else if (!ok) txt('あと' + (NEEDED - won) + '袋!', W / 2, H * 0.55, 44, PAL.cream);
      txt('BEST ' + game.best, W / 2, H * 0.585, 30, PAL.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 40, PAL.white);
      return;
    }

    // PLAYING
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { sacks: won, taps: taps };
        if (ok) game.end.success(won * 100 + Math.ceil(timeLeft) * 10, stats);
        else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) {
        if (lastResult === 'lost') {
          game.feedback.bad(ROPE_X, sackY(), { text: 'MISS' });
          finish(false);
        } else if (lastResult === 'timeup') {
          game.feedback.bad(ROPE_X, sackY(), { text: 'TIME UP' });
          finish(false);
        } else if (won >= NEEDED) {
          game.feedback.good(ROPE_X, sackY(), { text: 'CLEAR', color: PAL.gold, count: 24 });
          finish(true);
        } else {
          sackIdx = won; sackP = 0; surge = { mode: 'idle', t: 1.4 };
        }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.3);
    } else {
      timeLeft -= dt;
      var r = simStep(dt);
      if (r === 'won') {
        won++;
        sackFlash = 0.4; hitStop = 0.4; lastResult = 'won';
        game.feedback.good(ROPE_X, sackY(), { text: won === NEEDED - 1 ? 'x2' : 'NICE', color: PAL.gold });
        game.audio.play('se_milestone', 0.4);
        game.fx.popup(won + ' / ' + NEEDED, ROPE_X, sackY() - 120, { color: PAL.white, size: 60 });
      } else if (r === 'lost') {
        sackFlash = 0.5; hitStop = 0.5; lastResult = 'lost';
        game.fx.flash(PAL.white, 0.2);
      } else if (timeLeft <= 0) {
        timeLeft = 0; sackFlash = 0.5; hitStop = 0.45; lastResult = 'timeup';
        game.fx.flash(PAL.white, 0.2);
      }
    }

    drawWorld();
    drawRope();
    drawHud();
    if (ready > 0) txt(ready > 0.3 ? 'READY?' : 'GO!', W / 2, H * 0.36, 96, PAL.gold);
  });

  game.onStart(function () {
    game.audio.melody(
      [['G4', 0.5], ['E4', 0.5], ['G4', 0.5], ['C5', 1], ['A4', 0.5], ['G4', 0.5], ['E4', 0.5], ['D4', 1],
       ['E4', 0.5], ['G4', 0.5], ['A4', 0.5], ['G4', 1], ['E4', 0.5], ['D4', 0.5], ['C4', 1]],
      { tempo: 150, wave: 'square', volume: 0.05, loop: true,
        bass: [['C3', 2], ['G2', 2], ['A2', 2], ['G2', 2], ['C3', 2], ['F2', 1], ['G2', 1]] }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);

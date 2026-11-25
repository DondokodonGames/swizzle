// J-Switch-0011-crag-goat-butt-back.js
// 岩山の頭突き返し — 岩棚の端からよじ登って突っ込んでくる大角ヤギが、足元の光る間合いに入った瞬間だけ頭突きで押し返して崖下へ落とす。頭を上げたままの突進は途中で止まるフェイント
// 操作: どこでもタップで頭突き。相手が光る間合いに入った瞬間に合わせる。早すぎると空振りでよろけ、遅いと押し込まれる(社内メモ。画面には出さない)
// 終わり: 6頭押し返せばCLEAR。押し込まれて岩棚から落ちる/時間切れでGAME OVER
// @mechanic: timing_window
// @theme: crag_goat_headbutt
// 世界観: 霧の高原にそびえる岩山の頂、平たい岩棚を縄張りにする若いヤギが、崖をよじ登って次々に突っ込んでくる大角の群れを、間合いに入った一瞬の頭突きで押し返して崖下の草地へ転がし、頂を守り抜く
// 残るもの: 正誤(CLEAR/GAME OVER) + 押し返した頭数・芯で当てた(PERFECT)数・空振り数
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 黄緑寄り4階調、画面枠、低コントラストの残像
  var STYLE = { bg: ['#9bbc0f', '#8bac0f', '#306230'], main: ['#0f380f', '#306230', '#8bac0f'], accent: ['#e0f8d0', '#0f380f'] };
  var G0 = '#0f380f', G1 = '#306230', G2 = '#8bac0f', G3 = '#9bbc0f', LIT = STYLE.accent[0];
  var FRAME = '#4a5048';

  var GAME_TITLE = 'CRAG BUTT';
  var TIME_LIMIT = 14;
  var NEEDED = 6;
  var GY = H * 0.56;
  var PL = W * 0.1, PR = W * 0.9;
  var WIN_NEAR = 70, WIN_FAR = 200, SWEET = 135;
  var STEP = 140;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var GOAT_UP = ['.........hh.', '........h.h.', '........www.', '........wkww', '.wwwwwwwww..', 'wwwwwwwwww..', '.wwwwwwwww..', '.w.w...w.w..', '.w.w...w.w..'];
  var GOAT_UP2 = ['.........hh.', '........h.h.', '........www.', '........wkww', '.wwwwwwwww..', 'wwwwwwwwww..', '.wwwwwwwww..', '..w.w.w.w...', '.w...w...w..'];
  var GOAT_DOWN = ['............', '............', '.........hh.', '.wwwwwwwwh.h', 'wwwwwwwwwwww', 'wwwwwwwwwkww', '.wwwwwwww...', '..w.w..w.w..', '.w..w.w..w..'];
  var BANG = ['.bb.', '.bb.', '.bb.', '....', '.bb.'];
  var PEAK = ['.....m.....', '....mmm....', '...mmmmm...', '..mmmmmmm..', '.mmmmmmmmm.', 'mmmmmmmmmmm'];
  var CLOUD = ['..cccc..', '.cccccc.', 'cccccccc'];

  var flyers, focusX, mode, readyT, timeLeft, me, foe, repelled, perfects, whiffs, stopT, outroT, win, foeN, spawnT, ghosts, halfShown, focusFoe;

  function initGame() {
    mode = 'ready'; readyT = 0.8; timeLeft = TIME_LIMIT; repelled = 0; perfects = 0; whiffs = 0;
    me = { x: W / 2, face: 1, stagger: 0, butt: 0, knock: 0 };
    foe = null; foeN = 0; spawnT = 0.3; stopT = 0; outroT = 0; win = false; ghosts = []; halfShown = false; focusFoe = false; flyers = []; focusX = 0;
  }

  function spawnFoe() {
    var side = foeN % 2 === 0 ? (me.x > W / 2 ? 1 : -1) : (game.random(0, 1) < 0.5 ? -1 : 1);
    var feint = foeN >= 2 && game.random(0, 1) < 0.4;
    foe = { side: side, x: side < 0 ? PL + 30 : PR - 30, rise: 0.6, st: 'climb', v: 470 + foeN * 45, feint: feint, rear: 0, fly: 0, fy: 0 };
    foeN++;
  }

  function gap() { return foe ? Math.abs(foe.x - me.x) : 999; }
  function inWindow() { return foe && foe.st === 'charge' && gap() >= WIN_NEAR && gap() <= WIN_FAR; }

  function butt(isDemo) {
    if (mode !== 'play') return;
    if (me.stagger > 0) { if (!isDemo) game.audio.tone('C3', 0.05, { wave: 'square', volume: 0.03 }); return; }
    me.butt = 0.22;
    if (foe) me.face = foe.side < 0 ? -1 : 1;
    if (inWindow()) {
      var sweet = Math.abs(gap() - SWEET) < 32;
      repelled++;
      if (sweet) perfects++;
      launch('fly');
      if (!isDemo) {
        game.audio.play('se_break', 0.35);
        game.feedback.good(focusX, GY - 150, { text: sweet ? 'PERFECT' : 'GOOD', color: sweet ? LIT : G3, count: sweet ? 16 : 8 });
        game.fx.shake(10, 0.15);
        if (!halfShown && repelled === NEEDED / 2) {
          halfShown = true; game.audio.play('se_milestone', 0.5);
          game.fx.popup(repelled + ' / ' + NEEDED, W / 2, H * 0.3, { color: LIT, size: 72 });
        }
      }
      if (repelled >= NEEDED) finish(true, isDemo);
    } else {
      whiffs++;
      me.stagger = 0.38;
      if (!isDemo) {
        game.audio.play('se_jump', 0.25);
        game.fx.burst(me.x + me.face * 90, GY - 30, { color: G1, count: 6, speed: 140 });
      }
    }
  }

  function stepCrag(dt, isDemo) {
    if (me.stagger > 0) me.stagger -= dt;
    if (me.butt > 0) me.butt -= dt;
    if (me.knock > 0) me.knock -= dt;
    stepFlyers(dt);
    // 足場の真ん中へじわじわ戻る
    if (me.knock <= 0 && (!foe || foe.st !== 'charge')) me.x += (W / 2 - me.x) * Math.min(1, dt * 0.9);
    ghosts.push({ x: foe ? foe.x : -999, y: GY, st: foe ? foe.st : '' });
    if (ghosts.length > 5) ghosts.shift();
    if (!foe) {
      spawnT -= dt;
      if (spawnT <= 0) { spawnFoe(); if (!isDemo) game.audio.tone('E5', 0.1, { wave: 'square', volume: 0.04 }); }
      return;
    }
    var dir = foe.side < 0 ? 1 : -1;
    if (foe.st === 'climb') {
      foe.rise -= dt;
      if (foe.rise <= 0) { foe.st = 'charge'; if (!isDemo) game.audio.tone('G2', 0.12, { wave: 'square', volume: 0.05 }); }
    } else if (foe.st === 'charge') {
      foe.x += dir * foe.v * dt;
      if (foe.feint && gap() < 290) { foe.st = 'rear'; foe.rear = 0.75; foe.feint = false; }
      else if (gap() < WIN_NEAR - 10) hitMe(isDemo);
    } else if (foe.st === 'rear') {
      foe.rear -= dt;
      if (foe.rear > 0.3) foe.x -= dir * 60 * dt;
      if (foe.rear <= 0) foe.st = 'charge';
    }
  }

  // 押し返した/ぶつかった相手は放物線で崖下へ(次の相手はすぐ登ってくる)
  function launch(kind) {
    flyers.push({ x: foe.x, side: foe.side, kind: kind, fly: 0, fy: 0 });
    focusX = foe.x;
    foe = null; spawnT = kind === 'fly' ? 0.25 : 0.4;
  }
  function stepFlyers(dt) {
    for (var i = flyers.length - 1; i >= 0; i--) {
      var f = flyers[i];
      var dir = f.side < 0 ? 1 : -1;
      f.fly += dt;
      f.x -= dir * (f.kind === 'fly' ? 950 : 500) * dt;
      f.fy = f.kind === 'fly' ? -600 * f.fly + 1500 * f.fly * f.fly : -300 * f.fly + 1300 * f.fly * f.fly;
      if (f.fly > 1.1) flyers.splice(i, 1);
    }
  }

  function hitMe(isDemo) {
    var dir = foe.side < 0 ? 1 : -1;
    me.x += dir * STEP; me.knock = 0.35; me.stagger = 0;
    launch('back');
    if (isDemo) {
      if (me.x < PL + 20 || me.x > PR - 20) me.x = W / 2;
      return;
    }
    focusFoe = true;
    game.feedback.bad(me.x, GY - 150, { text: 'MISS', color: LIT });
    game.audio.play('se_break', 0.25);
    if (me.x < PL + 20 || me.x > PR - 20) { finish(false, false); return; }
    mode = 'hit'; stopT = 0.35;
  }

  function finish(ok, isDemo) {
    if (isDemo) return;
    win = ok; mode = 'stop'; stopT = 0.55;
    game.audio.stopBgm();
    if (ok) { game.fx.flash(LIT, 0.25); game.audio.play('se_success', 0.6); }
    else game.audio.play('se_failure', 0.6);
  }

  // ── 入力 ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (mode !== 'play') return;
    game.audio.play('se_tap', 0.2);
    butt(false);
  });

  // ── ATTRACT デモ(間合いの芯で頭突き。3頭目は早押しで空振りして押し込まれる) ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.85, press: false, pressT: 0, early: false, seen: -1 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.5;
    if (cyc < dt || demo.t <= dt) { initGame(); mode = 'play'; demo.seen = -1; }
    stepCrag(dt, true);
    if (foe && foe.st === 'charge' && demo.seen !== foeN) {
      demo.early = foeN % 3 === 2;
      var trig = demo.early ? gap() < 330 && gap() > 280 : Math.abs(gap() - SWEET) < 25;
      if (trig) { demo.seen = foeN; butt(true); demo.pressT = 0.25; }
    }
    if (demo.pressT > 0) demo.pressT -= dt;
    demo.press = demo.pressT > 0;
    var tx = me.x + (foe ? (foe.side < 0 ? -1 : 1) * 60 : 0);
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 5);
    demo.gy += (H * 0.84 - demo.gy) * Math.min(1, dt * 5);
    if (repelled >= NEEDED) { initGame(); mode = 'play'; }
  }

  // ── 描画 ─────────────────────────────────────────────────────────
  function drawWorld() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, G3], [0.5, G2], [1, G1]]);
    for (var p = 0; p < 3; p++) game.draw.sprite(PEAK, { m: G2 }, W * (0.2 + p * 0.33), H * 0.38 + p * 14, 30 - p * 4, { anchor: 'center', alpha: 0.7 });
    for (var c = 0; c < 3; c++) {
      var cx = ((t * 30 + c * 400) % (W + 300)) - 150;
      game.draw.sprite(CLOUD, { c: LIT }, cx, H * (0.22 + c * 0.06) + Math.sin(t + c) * 6, 16, { anchor: 'center', alpha: 0.7 });
    }
    // 岩棚(ドット段差)と崖
    for (var yy = 0; yy < H * 0.3; yy += 12) {
      var inset = yy * 0.35;
      game.draw.rect(PL + inset * 0.3 - 20, GY + 60 + yy, PR - PL + 40 - inset * 0.6, 12, (Math.floor(yy / 24) % 2) ? G1 : G0);
    }
    game.draw.rect(PL - 20, GY + 50, PR - PL + 40, 18, G2);
    // 間合い(左右の光る足場)
    var lit = inWindow();
    for (var s = -1; s <= 1; s += 2) {
      var x0 = me.x + s * WIN_NEAR, x1 = me.x + s * WIN_FAR;
      var active = lit && (foe.side < 0 ? -1 : 1) === s;
      var a = active ? 0.9 : 0.35 + 0.15 * Math.sin(t * 5);
      game.draw.rect(Math.min(x0, x1), GY + 44, Math.abs(x1 - x0), 14, active ? LIT : G3, a);
      game.draw.rect(me.x + s * SWEET - 8, GY + 40, 16, 22, G0, 0.6);
    }
    // 画面枠(携帯機の枠)
    game.draw.rect(0, 0, 26, H, FRAME); game.draw.rect(W - 26, 0, 26, H, FRAME);
    game.draw.rect(0, H - 26, W, 26, FRAME);
    game.draw.rect(0, 0, W, H, LIT, 0.03 + 0.03 * Math.sin(t * 1.6));
  }

  function drawGoats() {
    var t = game.time.elapsed;
    // 残像
    for (var g = 0; g < ghosts.length; g++) {
      var gh = ghosts[g];
      if (gh.st === 'charge' && foe && !foe.feint) game.draw.sprite(GOAT_DOWN, { w: G1, h: G0, k: G0 }, gh.x, gh.y, 16, { anchor: 'center', alpha: 0.12 * (g + 1), flipX: foe && foe.side > 0 });
    }
    if (foe) {
      var flip = foe.side > 0;
      var y = GY - foe.fy;
      if (foe.st === 'climb') {
        y = GY + foe.rise * 180;
        if (Math.floor(t * 10) % 2 === 0) game.draw.sprite(BANG, { b: G0 }, foe.x, GY - 190, 14, { anchor: 'center' });
        if (Math.floor(t * 20) % 4 === 0) game.draw.rect(foe.x - 60, GY + 30, 120, 10, G1, 0.6);
      }
      var run = Math.floor(t * 12) % 2 ? GOAT_UP : GOAT_UP2;
      var art = foe.st === 'charge' ? (foe.feint ? run : GOAT_DOWN) : (foe.st === 'rear' ? GOAT_UP : (Math.floor(t * 6) % 2 ? GOAT_UP : GOAT_UP2));
      game.draw.rect(foe.x - 90, GY + 34, 180, 12, G0, 0.3);
      game.draw.sprite(art, { w: G1, h: G0, k: LIT }, foe.x, y - (foe.st === 'rear' ? 30 : 0), 18, { anchor: 'center', flipX: flip });
    }
    for (var q = 0; q < flyers.length; q++) {
      var fl = flyers[q];
      if ((mode === 'hit' || mode === 'stop') && q === flyers.length - 1 && Math.floor(t * 14) % 2 === 0) game.draw.circle(fl.x, GY - fl.fy, 140, LIT, 0.6);
      game.draw.sprite(fl.kind === 'fly' ? GOAT_UP2 : GOAT_UP, { w: G1, h: G0, k: LIT }, fl.x, GY - fl.fy, 18, { anchor: 'center', flipX: fl.side > 0, flipY: fl.kind === 'fly' && fl.fly > 0.3 });
    }
    var mArt = me.butt > 0 ? GOAT_DOWN : (me.stagger > 0 ? GOAT_UP2 : (Math.floor(t * 2.5) % 2 ? GOAT_UP : GOAT_UP2));
    var wob = me.stagger > 0 ? Math.sin(t * 40) * 10 : 0;
    var lunge = me.butt > 0 ? me.face * 40 : 0;
    game.draw.rect(me.x - 80, GY + 34, 160, 12, G0, 0.35);
    game.draw.sprite(mArt, { w: LIT, h: G1, k: G0 }, me.x + wob + lunge + Math.sin(t * 1.8) * 3, GY + Math.sin(t * 3) * 3, 16, { anchor: 'center', flipX: me.face < 0 });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, G0, 0.85);
    txt(repelled + ' / ' + NEEDED, W / 2, 88, 66, LIT);
    txt(String(Math.ceil(timeLeft)), 64, 88, 50, G3, 'left');
    game.draw.rect(60, 172, W - 120, 20, G1);
    game.draw.rect(60, 172, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 20, timeLeft < 4 ? LIT : G3);
    // 足元の残り余裕(崖までの距離)
    var room = Math.max(0, Math.min(1, (Math.min(me.x - PL, PR - me.x)) / (W / 2 - PL)));
    game.draw.rect(120, H * 0.9, W - 240, 24, G0);
    game.draw.rect(120, H * 0.9, (W - 240) * room, 24, room < 0.4 ? LIT : G3);
    for (var i = 0; i < NEEDED; i++) game.draw.sprite(GOAT_UP, { w: i < repelled ? LIT : G1, h: G0, k: G0 }, W * 0.2 + i * 130, H * 0.8, 6, { anchor: 'center' });
  }

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: G0, bold: true, align: align || 'center', font: 'monospace' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center', font: 'monospace' });
  }

  function scoreNow() { return repelled * 120 + perfects * 60 - whiffs * 10 + Math.round(timeLeft * 10); }

  // ── ループ ───────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (mode === undefined) initGame();
      stepDemo(dt);
      drawWorld(); drawGoats();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 225, G0, 0.85);
      txt(GAME_TITLE, W / 2, 86 + Math.sin(t * 2) * 6, 76, LIT);
      txt('HI-SCORE ' + game.best, W / 2, 176, 36, G3);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, LIT);
      else txt('INSERT COIN', W / 2, H * 0.95, 34, G0);
      return;
    }

    if (state === S.RESULT) {
      drawWorld(); drawGoats();
      if (win) for (var f = 0; f < 10; f++) game.draw.rect((f * 149 + t * 240) % W, (f * 223 + t * 310) % (H * 0.7), 16, 16, f % 2 ? LIT : G3);
      game.draw.rect(0, H * 0.14, W, H * 0.2, G0, 0.85);
      txt(win ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.19, 96, win ? LIT : G3);
      txt('SCORE ' + (win ? scoreNow() : 0), W / 2, H * 0.25, 46, G3);
      if (win && scoreNow() >= game.best) txt('NEW RECORD', W / 2, H * 0.3, 42, LIT);
      else if (!win) txt('あと' + Math.max(1, NEEDED - repelled) + '頭!', W / 2, H * 0.3, 44, G3);
      else txt('BEST ' + game.best, W / 2, H * 0.3, 38, G3);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 38, G0);
      return;
    }

    if (mode === 'ready') {
      readyT -= dt;
      if (readyT <= 0) { mode = 'play'; game.audio.play('se_tap', 0.4); }
    } else if (mode === 'play') {
      timeLeft -= dt;
      stepCrag(dt, false);
      if (mode === 'play' && timeLeft <= 0) {
        timeLeft = 0;
        game.feedback.bad(me.x, GY - 150, { text: 'TIME UP', color: LIT });
        finish(false, false);
      }
    } else if (mode === 'hit') {
      stopT -= dt;
      stepFlyers(dt * 0.3);
      if (stopT <= 0) { mode = 'play'; focusFoe = false; }
    } else if (mode === 'stop') {
      stopT -= dt;
      stepFlyers(dt * 0.3);
      if (stopT <= 0) { mode = 'outro'; outroT = 1.3; }
    } else if (mode === 'outro') {
      outroT -= dt;
      stepFlyers(dt);
      if (!win) me.x += (me.x < W / 2 ? -1 : 1) * 300 * dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { repelled: repelled, perfect: perfects, whiff: whiffs };
        if (win) game.end.success(scoreNow(), stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawWorld(); drawGoats(); drawHud();
    if (mode === 'ready') txt(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 100, LIT);
    if (mode === 'outro') {
      game.draw.rect(0, H * 0.26, W, 150, G0, 0.85);
      txt(win ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 92, win ? LIT : G3);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['E4', 0.5], ['E4', 0.25], ['G4', 0.25], ['A4', 0.5], ['E4', 0.5], ['D4', 0.5], ['E4', 0.5], ['B3', 1],
      ['E4', 0.5], ['G4', 0.5], ['A4', 0.5], ['B4', 0.5], ['A4', 0.5], ['G4', 0.5], ['E4', 1]
    ], { tempo: 150, wave: 'square', volume: 0.045, loop: true, bass: [['E2', 1], ['E2', 1], ['D2', 1], ['B1', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

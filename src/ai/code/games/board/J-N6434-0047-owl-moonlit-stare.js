// J-N6434-0047-owl-moonlit-stare.js
// 月夜のにらめっこ番 — 下がってくるまぶたをタップで見開き直し、蛍の誘惑が舞う間だけは指を止めて見つめ続ける
// 操作: タップでまぶたを見開く(放っておくと少しずつ閉じる)。蛍が目の前を舞っている間に触ると瞬きしてしまう
// 終わり: 13秒見つめ続ければ相手が先に瞬きしてCLEAR。まぶたが閉じ切る/蛍の間に触るとGAME OVER
// @mechanic: freeze
// @theme: owl_moonlit_stare
// 世界観: 満月の夜の森のにらめっこ祭りで、見張り番見習いの子ミミズクが、切り株の向こうの老ヒキガエルと睨み合い、目の前を舞う蛍の誘惑にも瞬きせずに見つめ勝つ
// 残るもの: 正誤(CLEAR/GAME OVER) + 耐えた誘惑の数と見つめた秒数
// スタイル: NEO-RETRO
var STYLE = { bg: ['#1c1233', '#3b2a5e'], main: ['#f2e9d8', '#8a5a3c', '#2a1d45'], accent: ['#ff8a1f', '#7ef0a0'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg1: '#1c1233', bg2: '#3b2a5e', moon: '#f2e9d8', owl: '#8a5a3c', owlL: '#c08a5e', ink: '#120b22',
    orange: '#ff8a1f', fly: '#7ef0a0', toad: '#5e8a4a', toadL: '#8fbf6a', white: '#ffffff', red: '#ff4a5a',
  };

  var GAME_TITLE = 'MOON STARE';
  var TIME_LIMIT = 13;
  var DROOP = 0.26;
  var EYE_Y = H * 0.66;
  var EYE_DX = 190;
  var EYE_R = 130;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var TOAD = [
    '..ww....ww..',
    '.wkkw..wkkw.',
    '.gwwggggwwg.',
    'gggggggggggg',
    'gGGGGGGGGGGg',
    'gggggggggggg',
    '.gg......gg.',
  ];
  var TOAD_BLINK = [
    '............',
    '.gggg..gggg.',
    '.gggggggggg.',
    'gggggggggggg',
    'gGGGGGGGGGGg',
    'gggggggggggg',
    '.gg......gg.',
  ];
  var FLY_A = ['.w.w.', '..y..', '.yyy.'];
  var FLY_B = ['w...w', '..y..', '.yyy.'];
  var TUFT = ['o....o', 'oo..oo', 'oooooo'];
  var BEAK = ['yyyy', '.yy.'];
  var STUMP = ['.bbbbbbbbbb.', 'bBBBBBBBBBBb', 'bbbbbbbbbbbb', 'bbbbbbbbbbbb'];

  var open, timeLeft, ready, hitStop, focus, pendingEnd, finished, ok, endWait, stared;
  var tempt, temptT, teleT, nextTempt, flies, endured, flinch, nextMs;

  function initGame() {
    open = 1; timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0; focus = null; pendingEnd = null;
    finished = false; ok = false; endWait = 0; stared = 0;
    tempt = false; temptT = 0; teleT = 0; nextTempt = 1.6; flies = []; endured = 0; flinch = 0; nextMs = 3;
  }

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function startTempt(prog) {
    tempt = true; temptT = 1.1 + game.random(0, 0.7) + prog * 0.4;
    flies = [];
    var n = 4 + Math.floor(prog * 4);
    for (var i = 0; i < n; i++) flies.push({ a: game.random(0, 6.28), r: game.random(80, 260), sp: game.random(2, 4) * (i % 2 ? 1 : -1), yo: game.random(-80, 80) });
    game.audio.tone('B5', 0.25, { wave: 'sine', volume: 0.08, slide: -300 });
  }

  function stepWorld(dt, prog, demoMode) {
    if (flinch > 0) flinch -= dt;
    open -= DROOP * (1 + prog * 0.4) * dt;
    if (tempt) {
      temptT -= dt;
      if (temptT <= 0) {
        tempt = false; endured++;
        nextTempt = 1.3 + game.random(0, 1.0) - prog * 0.4;
        game.feedback.good(W / 2, H * 0.44, { text: 'NICE', color: C.fly, count: 10, volume: 0.3 });
        if (!demoMode && endured >= nextMs) { nextMs += 3; game.audio.play('se_milestone', 0.4); game.fx.popup(endured + '', W / 2, H * 0.36, { color: C.orange, size: 70 }); }
      }
    } else if (teleT > 0) {
      teleT -= dt;
      if (teleT <= 0) startTempt(prog);
    } else {
      nextTempt -= dt;
      if (nextTempt <= 0) { teleT = 0.65; game.audio.play('se_tap', 0.2); game.audio.tone('E6', 0.12, { wave: 'square', volume: 0.05 }); }
    }
    for (var i = 0; i < flies.length; i++) flies[i].a += flies[i].sp * dt;
    if (open <= 0) {
      open = 0;
      if (demoMode) { game.feedback.bad(W / 2, EYE_Y - 200, { text: 'MISS', shake: 4 }); open = 1; return; }
      focus = { eyes: true }; hitStop = 0.5; pendingEnd = 'fail'; finished = true;
      game.audio.play('se_break', 0.4);
    }
  }

  function widen(demoMode) {
    if (tempt) {
      // 誘惑の最中に触った = 瞬き
      flinch = 0.5;
      if (demoMode) { game.feedback.bad(W / 2, EYE_Y - 200, { text: 'MISS', shake: 4 }); tempt = false; nextTempt = 1.2; open = 1; return; }
      open = 0; focus = { flies: true }; hitStop = 0.55; pendingEnd = 'fail'; finished = true;
      game.audio.play('se_break', 0.4);
      return;
    }
    open = Math.min(1, open + 0.34);
    game.audio.play('se_tap', 0.2);
    game.audio.tone(300 + open * 500, 0.06, { wave: 'triangle', volume: 0.07 });
    game.fx.burst(W / 2 + (game.random(0, 1) < 0.5 ? -EYE_DX : EYE_DX), EYE_Y - EYE_R, { color: C.moon, count: 4, speed: 160 });
  }

  function drawBg(pulse) {
    game.draw.gradient(0, H, [[0, C.bg1], [0.55, C.bg2], [1, C.bg1]]);
    game.draw.rect(0, 0, W, H, C.moon, pulse);
    var mb = Math.sin(game.time.elapsed * 0.7) * 6;
    game.draw.circle(W * 0.8, H * 0.15 + mb, 110, C.moon, 0.9);
    game.draw.circle(W * 0.8 - 30, H * 0.15 - 20 + mb, 22, C.bg2, 0.3);
    // 森のシルエット(大きいドット)
    for (var t = 0; t < 9; t++) {
      var tx = t * 130 - 20, th = 180 + ((t * 67) % 120);
      var sw = Math.sin(game.time.elapsed * 0.9 + t) * 5;
      game.draw.rect(tx + sw, H * 0.34 - th, 100, th, C.ink, 0.8);
    }
    game.draw.rect(0, H * 0.34, W, 20, C.ink);
  }

  function drawToad(blink) {
    var bob = Math.sin(game.time.elapsed * 1.8) * 6;
    var sway = Math.cos(game.time.elapsed * 1.1) * 5;
    game.draw.sprite(STUMP, { b: '#5a3a24', B: '#7a5234' }, W / 2, H * 0.33, 22, { anchor: 'center' });
    game.draw.sprite(blink ? TOAD_BLINK : TOAD, { w: C.white, k: C.ink, g: C.toad, G: C.toadL }, W / 2 + sway, H * 0.25 + bob, 20, { anchor: 'center' });
  }

  function drawFlies(tele) {
    var cx = W / 2, cy = H * 0.46;
    if (tele) {
      var blink = Math.floor(game.time.elapsed * 14) % 2 === 0;
      for (var s = 0; s < 6; s++) {
        var a = s * 1.05 + game.time.elapsed * 3;
        game.draw.circle(cx + Math.cos(a) * 300, cy + Math.sin(a) * 120, 14, C.orange, blink ? 0.9 : 0.3);
      }
    }
    if (!tempt && !(focus && focus.flies)) return;
    var hl = focus && focus.flies;
    game.draw.rect(0, H * 0.36, W, H * 0.2, C.orange, hl ? 0.25 : 0.1 + 0.05 * Math.sin(game.time.elapsed * 10));
    for (var i = 0; i < flies.length; i++) {
      var f = flies[i];
      var x = cx + Math.cos(f.a) * f.r, y = cy + f.yo + Math.sin(f.a * 2) * 50;
      game.draw.circle(x, y + 10, hl ? 60 : 36, C.fly, 0.35);
      game.draw.sprite(Math.floor(game.time.elapsed * 12 + i) % 2 ? FLY_A : FLY_B, { w: C.white, y: C.fly }, x, y, hl ? 18 : 12, { anchor: 'center' });
    }
  }

  function drawOwl(pose) {
    var bob = Math.sin(game.time.elapsed * 2.2) * 6;
    var sway = Math.cos(game.time.elapsed * 1.4) * 5;
    var jump = pose === 'cheer' ? -Math.abs(Math.sin(game.time.elapsed * 6)) * 50 : 0;
    var cx = W / 2 + sway, cy = EYE_Y + bob + jump;
    // 顔
    game.draw.circle(cx, cy + 60, 380, C.owl);
    game.draw.circle(cx, cy + 120, 300, C.owlL, 0.5);
    game.draw.sprite(TUFT, { o: C.owl }, cx - 280, cy - 300, 20, { anchor: 'center' });
    game.draw.sprite(TUFT, { o: C.owl }, cx + 280, cy - 300, 20, { anchor: 'center', flipX: true });
    var o = pose === 'down' ? 0 : pose === 'cheer' ? 1 : open;
    var hl = focus && focus.eyes;
    for (var e = -1; e <= 1; e += 2) {
      var ex = cx + e * EYE_DX + (flinch > 0 ? Math.sin(game.time.elapsed * 50) * 6 : 0);
      if (hl) game.draw.circle(ex, cy, EYE_R + 40, C.white, 0.6 + 0.3 * Math.sin(game.time.elapsed * 30));
      game.draw.circle(ex, cy, EYE_R + 14, C.ink);
      game.draw.circle(ex, cy, EYE_R, C.moon);
      game.draw.circle(ex, cy + 10, EYE_R * 0.5, C.orange);
      game.draw.circle(ex, cy + 10, EYE_R * 0.28, C.ink);
      game.draw.circle(ex - 20, cy - 20, 14, C.white);
      // まぶた(上から下がる)
      var lid = (1 - o) * (EYE_R * 2 + 10);
      game.draw.rect(ex - EYE_R - 14, cy - EYE_R - 14, EYE_R * 2 + 28, lid, C.owl);
      if (lid > 4) game.draw.rect(ex - EYE_R - 14, cy - EYE_R - 14 + lid - 12, EYE_R * 2 + 28, 12, C.ink);
    }
    game.draw.sprite(BEAK, { y: C.orange }, cx, cy + 160, 22, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, H * 0.1, C.ink, 0.6);
    // まぶたメーター(開き具合)
    game.draw.rect(60, H * 0.03, 420, 44, C.bg2);
    game.draw.rect(60, H * 0.03, 420 * Math.max(0, open), 44, open < 0.3 ? C.red : C.moon);
    game.draw.circle(40, H * 0.03 + 22, 30, C.orange);
    game.draw.circle(40, H * 0.03 + 22, 12, C.ink);
    txt('SCORE ' + scoreNow(), W * 0.74, H * 0.045, 46, C.moon);
    var frac = Math.max(0, timeLeft / TIME_LIMIT);
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, H * 0.085, W - 120, 16, C.bg2);
    game.draw.rect(60, H * 0.085, (W - 120) * frac, 16, low ? C.red : C.fly);
  }

  function scoreNow() { return Math.floor(stared * 10) + endured * 30; }

  // ── ATTRACTデモ: まぶたが下がったらタップ、蛍の間は止まる。1回だけ蛍の間に触って瞬きを見せる ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.86, press: false, cool: 0, slip: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; nextTempt = 0.9; demo.slip = false; }
    stepWorld(dt, 0.2, true);
    demo.cool -= dt;
    demo.press = false;
    var wantTap = !tempt && open < 0.6;
    if (tempt && cyc > 4.5 && !demo.slip) { wantTap = true; demo.slip = true; }
    if (wantTap && demo.cool <= 0) {
      demo.cool = 0.3; demo.press = true;
      widen(true);
    }
    if (demo.cool > 0.18) demo.press = true;
    demo.gx = W / 2 + Math.sin(demo.t * 1.3) * 40;
    demo.gy = H * 0.88;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.4); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || finished) return;
    if (ready > 0) { game.audio.play('se_tap', 0.08); return; }
    widen(false);
  });

  function finishNow() {
    if (pendingEnd === 'clear') {
      ok = true;
      game.feedback.good(W / 2, H * 0.24, { text: 'CLEAR', color: C.fly, count: 30 });
      game.audio.play('se_success', 0.6);
    } else {
      ok = false;
      game.feedback.bad(W / 2, EYE_Y - 220, { text: pendingEnd === 'time' ? 'TIME UP' : 'MISS' });
      game.audio.play('se_failure', 0.6);
    }
    endWait = 1.2; pendingEnd = null;
  }

  game.onUpdate(function(dt) {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.2);

    if (state === S.ATTRACT) {
      if (open === undefined) initGame();
      stepDemo(dt);
      drawBg(pulse);
      drawToad(false);
      drawOwl('');
      drawFlies(teleT > 0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, H * 0.12, C.ink, 0.5);
      txt(GAME_TITLE, W / 2, H * 0.045, 80, C.orange);
      txt('BEST ' + (game.best || 0), W / 2, H * 0.095, 38, C.moon);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.orange);
      else txt('INSERT COIN', W / 2, H * 0.965, 40, C.moon);
      return;
    }

    if (state === S.RESULT) {
      drawBg(pulse);
      drawToad(ok);
      drawOwl(ok ? 'cheer' : 'down');
      if (ok && Math.floor(game.time.elapsed * 5) % 2 === 0) game.fx.burst(game.random(W * 0.2, W * 0.8), H * 0.4, { color: C.fly, count: 4 });
      game.draw.rect(0, H * 0.36, W, H * 0.2, C.ink, 0.75);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 100, ok ? C.fly : C.red);
      txt('SCORE ' + scoreNow(), W / 2, H * 0.465, 56, C.moon);
      if (ok && scoreNow() > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.52, 48, C.orange);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.52, 42, C.moon);
      if (!ok) txt('あと' + Math.max(1, Math.ceil(timeLeft)) + '秒!', W / 2, H * 0.58, 50, C.orange);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.moon);
      return;
    }

    if (endWait > 0) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(scoreNow(), { endured: endured, seconds: Math.floor(stared) });
        else game.end.failure({ endured: endured, seconds: Math.floor(stared) });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) finishNow();
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.3);
    } else if (!finished) {
      timeLeft -= dt; stared += dt;
      stepWorld(dt, Math.min(1, stared / TIME_LIMIT), false);
      if (!finished && timeLeft <= 0) {
        timeLeft = 0; finished = true; pendingEnd = 'clear'; hitStop = 0.45; focus = null; tempt = false;
        game.fx.popup('FINISH', W / 2, H * 0.3, { color: C.fly, size: 80 });
      }
    }

    drawBg(pulse);
    drawToad(pendingEnd === 'clear' || (finished && ok));
    drawOwl('');
    drawFlies(teleT > 0 && !finished);
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 110, C.orange);
  });

  game.onStart(function() {
    game.audio.melody([
      ['D4', 1], ['F4', 0.5], ['A4', 0.5], ['G4', 1], ['E4', 1],
      ['D4', 1], ['A3', 0.5], ['C4', 0.5], ['D4', 2],
    ], { tempo: 96, wave: 'triangle', volume: 0.07, loop: true, bass: [['D2', 4], ['A2', 4]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

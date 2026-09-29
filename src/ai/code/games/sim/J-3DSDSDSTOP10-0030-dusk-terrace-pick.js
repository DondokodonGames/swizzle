// J-3DSDSDSTOP10-0030-dusk-terrace-pick.js
// 夕暮れ段々畑の実もぎ — 枝に並ぶ青い実の中から、熟れきった実だけを見分けて落ちる前にもぎ取る
// 操作: 熟れた実(深い赤で蜜がきらめく)をタップしてもぐ。青い実や色づきかけの実を触るとミス。熟れた実は放っておくと落ちる
// 終わり: 制限時間内に10個もげば成功。ミス3回/時間切れで失敗
// @mechanic: spot
// @theme: dusk_terrace_pick
// 世界観: 山あいの段々果樹園で夕暮れの摘み手が、日が落ちきる前に、色づきかけの実に紛れた食べごろの実だけを一瞬で見抜いて籠に集める
// 残るもの: 正誤(CLEAR/GAME OVER) + もいだ数と見分けの速さ
// スタイル: HD POST 3D

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 低彩度・褐色寄り、ブルーム(半透明円の重ね)、ビネット
  var STYLE = { bg: ['#6e5a48', '#b08a62', '#2e2620'], main: ['#7d8a5a', '#c9a26a'], accent: ['#c23a26', '#f3d9a0'] };
  var COL = {
    sky1: '#8a6e57', sky2: STYLE.bg[1], dark: STYLE.bg[2], leaf: STYLE.main[0], leafDark: '#566140', bark: '#4a3a2c',
    sun: STYLE.accent[1], ripe: STYLE.accent[0], ink: '#241c16', good: '#b7c96a', bad: '#e0553c', white: '#fff4dc'
  };

  var GAME_TITLE = 'DUSK PICKER';
  var TIME_LIMIT = 14;
  var NEEDED = 10;
  var MAX_MISS = 3;
  var LIFE = 2.6;        // 熟れた実が枝にいられる時間(ジェスチャー待ちの上限)
  var R = 56;

  // 熟れ具合 0=青, 1=色づきかけ, 2=橙(紛らわしい), 3=食べごろ
  var PALS = [
    { a: '#7f9a4e', b: '#9fb766', s: '#5e3f28', l: '#5f7a3a' },
    { a: '#b3a34a', b: '#cdbf6a', s: '#5e3f28', l: '#5f7a3a' },
    { a: '#c9772f', b: '#dc9650', s: '#5e3f28', l: '#5f7a3a' },
    { a: '#b8321f', b: '#d9573a', s: '#5e3f28', l: '#5f7a3a' }
  ];
  var FRUIT = ['...s...', '..sl...', '.aaaa..', 'abbaaa.', 'abaaaaa', 'aaaaaaa', '.aaaaa.', '..aaa..'];
  var FRUIT_SWAY = ['....s..', '...ls..', '..aaaa.', '.abbaaa', '.abaaaa', '.aaaaaa', '..aaaaa', '...aaa.'];
  var BASKET = ['k........k', 'kwwwwwwwwk', 'kwkwkwkwkk', '.kwwwwwwk.', '..kkkkkk..'];
  var PAL_BASKET = { k: '#5a4028', w: '#a47a4a' };
  var PICKER_A = ['..hhh..', '.hhhhh.', '..fff..', '.ccccc.', 'c.ccc.c', '..c.c..'];
  var PICKER_B = ['..hhh..', '.hhhhh.', '..fff..', 'c.ccc.c', '.ccccc.', '..c.c..'];
  var PAL_PICKER = { h: '#c9a26a', f: '#e0b894', c: '#566140' };

  var SLOTS = [];
  (function () {
    for (var i = 0; i < 6; i++) SLOTS.push({ x: W * (0.13 + i * 0.148), y: H * (0.39 + i * 0.012) });
    for (var j = 0; j < 6; j++) SLOTS.push({ x: W * (0.2 + j * 0.13), y: H * (0.58 + j * 0.01) });
  })();

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var fruits, wave, picked, misses, dropped, fastPicks, slide, timeLeft, ready, finished, ok, hitStop, endWait, hl, flyers;
  var silent = false;

  function say(str, x, y, sz, color) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: 'rgba(0,0,0,0.45)', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function newWave() {
    wave++;
    fruits = [];
    var ripeN = wave % 3 === 0 ? 2 : 1;
    var decoyLevel = wave <= 2 ? 0 : wave <= 4 ? 1 : 2;
    var decoys = wave <= 2 ? 0 : Math.min(4, wave - 1);
    var order = [];
    for (var i = 0; i < SLOTS.length; i++) order.push(i);
    for (var k = order.length - 1; k > 0; k--) { var r = Math.floor(game.random(0, k + 1)); var tmp = order[k]; order[k] = order[r]; order[r] = tmp; }
    for (var n = 0; n < SLOTS.length; n++) {
      var lvl = n < ripeN ? 3 : n < ripeN + decoys ? decoyLevel : 0;
      if (lvl === 0 && decoyLevel === 2 && n % 3 === 0) lvl = 1;
      fruits.push({ slot: order[n], lvl: lvl, life: LIFE, gone: false, shake: 0, ph: game.random(0, 6) });
    }
    slide = 0.3;
  }

  function initGame() {
    wave = 0; picked = 0; misses = 0; dropped = 0; fastPicks = 0; timeLeft = TIME_LIMIT; ready = 0.8; finished = false; ok = false;
    hitStop = 0; endWait = 0; hl = null; flyers = [];
    newWave();
  }

  function finishRound(success, x, y) {
    if (finished) return;
    finished = true; ok = success; hitStop = 0.45; hl = { x: x, y: y, t: 0 };
    if (!silent) game.audio.stopBgm();
  }

  function ripeLeft() { for (var i = 0; i < fruits.length; i++) if (!fruits[i].gone && fruits[i].lvl === 3) return true; return false; }

  function miss(x, y) {
    misses++;
    if (misses >= MAX_MISS) { finishRound(false, x, y); return; }
    game.feedback.bad(x, y, { text: 'MISS', sound: silent ? 'se_tap' : 'se_bad', volume: silent ? 0 : 0.5 });
  }

  // 戻り値: 'pick' | 'wrong' | 'none'
  function tapAt(x, y) {
    if (finished || slide > 0) return 'none';
    for (var i = 0; i < fruits.length; i++) {
      var f = fruits[i];
      if (f.gone) continue;
      var s = SLOTS[f.slot];
      if (!game.hit.circle(x, y, 12, s.x, s.y, R)) continue;
      if (f.lvl === 3) {
        f.gone = true; picked++;
        var fast = LIFE - f.life < 0.7;
        if (fast) fastPicks++;
        flyers.push({ x: s.x, y: s.y, t: 0 });
        game.feedback.good(s.x, s.y, { text: fast ? 'PERFECT' : 'GOOD', color: COL.good, sound: silent ? 'se_tap' : 'se_coin', volume: silent ? 0 : 0.5 });
        if (picked === NEEDED / 2) { game.fx.popup(picked + ' / ' + NEEDED, W / 2, H * 0.3, { color: COL.sun, size: 56 }); if (!silent) game.audio.play('se_milestone', 0.45); }
        if (picked >= NEEDED) finishRound(true, s.x, s.y);
        else if (!ripeLeft()) newWave();
        return 'pick';
      }
      f.shake = 0.35;
      miss(s.x, s.y);
      return 'wrong';
    }
    return 'none';
  }

  function stepWorld(dt) {
    if (finished) return;
    if (slide > 0) { slide -= dt; return; }
    for (var i = 0; i < fruits.length; i++) {
      var f = fruits[i];
      if (f.shake > 0) f.shake -= dt;
      if (f.gone || f.lvl !== 3) continue;
      f.life -= dt;
      if (f.life <= 0) {
        // 熟れすぎて落ちた
        f.gone = true; dropped++;
        var s = SLOTS[f.slot];
        flyers.push({ x: s.x, y: s.y, t: 0, drop: true });
        if (!silent) game.audio.play('se_break', 0.3);
        miss(s.x, s.y + 80);
        if (finished) return;
        if (!ripeLeft()) newWave();
        return;
      }
    }
  }

  // ── 描画 ─────────────────────────────────────────────
  function drawBack() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, COL.sky1], [0.35, COL.sky2], [0.7, '#5a4a3a'], [1, COL.dark]]);
    // 沈む日とブルーム
    var sy = H * 0.24 + Math.sin(t * 0.2) * 6;
    game.draw.circle(W * 0.72, sy, 260, COL.sun, 0.08 + 0.03 * Math.sin(t * 1.2));
    game.draw.circle(W * 0.72, sy, 160, COL.sun, 0.14);
    game.draw.circle(W * 0.72, sy, 80, COL.sun, 0.7);
    // 段々畑の段(横ストリップ)
    for (var k = 0; k < 5; k++) {
      var ty = H * 0.28 + k * 34;
      game.draw.rect(0, ty, W, 30, k % 2 ? '#7a6a4a' : '#6e6044', 0.8);
    }
    // 枝
    game.draw.line(0, H * 0.34, W, H * 0.43, COL.bark, 30);
    game.draw.line(W * 0.08, H * 0.53, W, H * 0.61, COL.bark, 26);
    for (var l = 0; l < 14; l++) {
      var lx = (l * 83) % W, ly = (l < 7 ? H * 0.35 : H * 0.54) + (lx / W) * H * 0.08;
      game.draw.circle(lx + Math.sin(t + l) * 6, ly - 20, 34, l % 2 ? COL.leaf : COL.leafDark, 0.9);
    }
  }

  function drawFruits() {
    var t = game.time.elapsed;
    var off = slide > 0 ? slide / 0.3 * W : 0;
    for (var i = 0; i < fruits.length; i++) {
      var f = fruits[i];
      if (f.gone) continue;
      var s = SLOTS[f.slot];
      var wob = Math.sin(t * 1.6 + f.ph) * 4;
      // telegraph: 落ちる0.7秒前から大きく揺れる
      if (f.lvl === 3 && f.life < 0.7) wob = Math.sin(t * 40) * 10;
      if (f.shake > 0) wob = Math.sin(t * 60) * 12;
      var fr = Math.floor(t * 1.5 + f.ph) % 2 ? FRUIT : FRUIT_SWAY;
      game.draw.sprite(fr, PALS[f.lvl], s.x + wob + off, s.y, 16, { anchor: 'center' });
      if (f.lvl === 3) {
        // 食べごろのしるし: 蜜のきらめき(小さく明滅)
        var tw = 0.4 + 0.4 * Math.sin(t * 8 + f.ph);
        game.draw.circle(s.x + wob + off + 26, s.y - 22, 7, COL.white, tw);
        game.draw.circle(s.x + wob + off, s.y + 10, R + 6, COL.sun, 0.06);
      }
    }
    for (var j = flyers.length - 1; j >= 0; j--) {
      var fl = flyers[j];
      fl.t += 1 / 60;
      if (fl.t > 0.5) { flyers.splice(j, 1); continue; }
      var k = fl.t / 0.5;
      var fx = fl.drop ? fl.x : fl.x + (W * 0.5 - fl.x) * k;
      var fy = fl.drop ? fl.y + k * k * 700 : fl.y + (H * 0.86 - fl.y) * k - Math.sin(k * Math.PI) * 200;
      game.draw.sprite(FRUIT, PALS[3], fx, fy, fl.drop ? 16 : 16 - k * 6, { anchor: 'center', alpha: fl.drop ? 1 - k : 1 });
    }
  }

  function drawThumb() {
    var t = game.time.elapsed;
    game.draw.rect(0, H * 0.8, W, H * 0.2, COL.dark, 0.55);
    game.draw.sprite(Math.floor(t * 2) % 2 ? PICKER_A : PICKER_B, PAL_PICKER, W * 0.2 + Math.sin(t * 1.2) * 8, H * 0.87 + Math.sin(t * 2.4) * 4, 16, { anchor: 'center' });
    game.draw.sprite(BASKET, PAL_BASKET, W * 0.5, H * 0.88, 22, { anchor: 'center' });
    for (var i = 0; i < Math.min(picked, NEEDED); i++) game.draw.circle(W * 0.5 - 90 + (i % 5) * 45, H * 0.855 - Math.floor(i / 5) * 26, 20, COL.ripe);
    for (var m = 0; m < MAX_MISS; m++) game.draw.circle(W * 0.8 + m * 56, H * 0.88, 20, m < misses ? COL.bad : COL.leaf);
  }

  function drawVignette() {
    game.draw.rect(0, 0, W, 90, '#000000', 0.25);
    game.draw.rect(0, H - 90, W, 90, '#000000', 0.3);
    game.draw.rect(0, 0, 70, H, '#000000', 0.22);
    game.draw.rect(W - 70, 0, 70, H, '#000000', 0.22);
  }

  function drawHud() {
    say(picked + ' / ' + NEEDED, W / 2, H * 0.05, 56, COL.white);
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 160, W - 160, 18, COL.dark, 0.7);
    game.draw.rect(80, 160, (W - 160) * Math.max(0, timeLeft / TIME_LIMIT), 18, low ? COL.bad : COL.sun);
    say('x' + fastPicks, W * 0.88, H * 0.05, 40, COL.good);
  }

  function drawHighlight(dt) {
    if (!hl) return;
    hl.t += dt;
    game.draw.circle(hl.x, hl.y, 60 + hl.t * 300, COL.white, Math.max(0, 0.6 - hl.t));
    game.draw.sprite(FRUIT, ok ? PALS[3] : { a: '#ffffff', b: '#ffffff', s: COL.bad, l: COL.bad }, hl.x, hl.y, 20 + hl.t * 12, { anchor: 'center' });
  }

  // ── ATTRACT ゴースト実演(実ロジック) ─────────────────
  var demo = { t: 0, gx: W / 2, gy: H * 0.7, press: 0, n: 0, wait: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.n++; wave = demo.n % 2 ? 3 : 4; newWave(); demo.wait = 0; }
    silent = true;
    demo.wait += dt;
    if (!finished && slide <= 0 && demo.wait > 0.7) {
      var wrong = demo.n % 3 === 0 && picked === 1;     // 失敗例: 橙の実に手を出す
      for (var i = 0; i < fruits.length; i++) {
        var f = fruits[i];
        if (f.gone) continue;
        if ((wrong && f.lvl > 0 && f.lvl < 3) || (!wrong && f.lvl === 3)) {
          var s = SLOTS[f.slot];
          demo.gx = s.x; demo.gy = s.y; demo.press = 0.2; demo.wait = 0;
          tapAt(s.x, s.y);
          break;
        }
      }
    }
    if (misses >= MAX_MISS - 1) misses = 0;
    if (demo.press > 0) demo.press -= dt;
    stepWorld(dt);
    silent = false;
  }

  // ── 入力 ─────────────────────────────────────────────
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (ready > 0 || finished) return;
    var r = tapAt(x, y);
    if (r === 'pick') game.audio.play('se_tap', 0.3);
    else if (r === 'none') { game.audio.tone('D4', 0.04, { wave: 'triangle', volume: 0.06 }); game.fx.burst(x, y, { color: COL.leaf, count: 3, speed: 90 }); }
  });

  // ── ループ(唯一の onUpdate) ───────────────────────────
  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (fruits === undefined) initGame();
      stepDemo(dt);
      drawBack(); drawFruits(); drawThumb(); drawVignette();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 14 });
      say(GAME_TITLE, W / 2, H * 0.08, 80, COL.sun);
      say('HI-SCORE ' + (game.best || 0), W / 2, H * 0.13, 34, COL.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) say('► 100円 投入 ◄', W / 2, H * 0.965, 44, COL.sun);
      else say('INSERT COIN', W / 2, H * 0.965, 36, COL.white);
      return;
    }

    if (state === S.RESULT) {
      drawBack(); drawThumb(); drawVignette();
      var sc = picked * 100 + fastPicks * 50 + (ok ? Math.round(timeLeft * 30) : 0);
      say(ok ? 'CLEAR' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.09, 100, ok ? COL.good : COL.bad);
      say(picked + ' / ' + NEEDED, W / 2, H * 0.15, 52, COL.white);
      say('SCORE ' + sc, W / 2, H * 0.2, 44, COL.white);
      if (ok && sc > (game.best || 0)) say('NEW RECORD', W / 2, H * 0.245, 46, COL.sun);
      else say('BEST ' + (game.best || 0), W / 2, H * 0.245, 36, COL.white);
      if (!ok) say('あと' + (NEEDED - picked) + '個!', W / 2, H * 0.5, 66, COL.sun);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) say('TAP TO CONTINUE', W / 2, H * 0.965, 38, COL.white);
      return;
    }

    if (finished) {
      if (hitStop > 0) {
        hitStop -= dt;
        if (hitStop <= 0) {
          if (ok) { game.feedback.good(hl.x, hl.y, { text: 'CLEAR', color: COL.sun, count: 26 }); game.audio.play('se_success', 0.6); }
          else { game.feedback.bad(hl.x, hl.y, { text: 'MISS' }); game.audio.play('se_failure', 0.5); }
          endWait = 1.1;
        }
      } else {
        endWait -= dt;
        if (endWait <= 0) {
          state = S.RESULT;
          var stats = { picked: picked, needed: NEEDED, fast: fastPicks, misses: misses, dropped: dropped };
          if (ok) game.end.success(picked * 100 + fastPicks * 50 + Math.round(timeLeft * 30), stats);
          else game.end.failure(stats);
        }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.5);
    } else {
      timeLeft -= dt;
      if (timeLeft <= 0) { timeLeft = 0; finishRound(false, W / 2, H * 0.86); }
      else stepWorld(dt);
    }

    drawBack(); drawFruits(); drawThumb(); drawHud(); drawVignette();
    if (finished) drawHighlight(dt);
    if (ready > 0) say(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.25, 110, COL.sun);
  });

  game.onStart(function () {
    game.audio.melody([['D4', 1], ['F4', 0.5], ['A4', 0.5], ['G4', 1], ['F4', 0.5], ['E4', 0.5], ['D4', 1], ['A3', 1]],
      { tempo: 100, wave: 'triangle', volume: 0.05, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

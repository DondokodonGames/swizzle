// J-Switch-0045-roof-crow-nudge.js
// 屋根の上のひと押し — 見張りのカラスがそっぽを向いた瞬間に煙突の陰から飛び出し、昼寝仲間を押し落とす
// 操作: カラスが完全に背を向けたらすぐタップ。首をかしげただけ(フェイント)や、こちらを見ている間にタップすると見つかる(社内メモ。画面には出さない)
// 終わり: 6匹押し落とせばCLEAR。見つかる3回/時間切れでGAME OVER
// @mechanic: reaction_duel
// @theme: rooftop_cat_crow_lookout
// 世界観: 月夜の瓦屋根で開かれる猫の集会の余興。煙突の陰に隠れた黒猫が、テレビアンテナに止まった見張りカラスの目を盗み、屋根の縁でまるくなった仲間を下の日よけ幕へ一匹ずつ押し落とす
// 残るもの: 正誤(CLEAR/GAME OVER) + 押し落とした数・最速の反応秒・見つかった数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白黒2値。階調はディザ(市松の点)で作り、線の太さで語る
  var STYLE = { bg: ['#141414', '#f2eee2', '#141414'], main: ['#f2eee2', '#141414', '#f2eee2'], accent: ['#f2eee2', '#141414'] };
  var INK = '#141414', PAPER = '#f2eee2';

  var GAME_TITLE = 'ROOF NUDGE';
  var TIME_LIMIT = 15;
  var NEEDED = 6;
  var MAX_SPOT = 3;
  var CROW_X = W * 0.72, CROW_Y = 470;
  var HIDE_X = 190, RIDGE_Y = 930;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var stage, readyT, remain, pushed, spotted, crow, hero, sleepers, fallers, stopT, outroT, cleared, fastest, spot, milestoneDone;

  var CROW = [
    ['...kkk...', '..kkkkk..', '.kkwkkkk.', 'kkkkkkkkk', '..kkkkkkk', '..kkkkk..', '...k.k...'],
    ['...kkk...', '..kkkkk..', '.kkkkkkk.', 'kkkkkkkkk', 'kkkkkkk..', '..kkkkk..', '...k.k...']
  ];
  var EYE = ['kk', 'kk'];
  var CAT = [
    ['k...k.....', 'kk.kk.....', 'kwkwk.....', 'kkkkkkkkk.', '.kkkkkkkkk', '.k.k..k.k.'],
    ['k...k.....', 'kk.kk.....', 'kwkwk....k', 'kkkkkkkkk.', '.kkkkkkkk.', 'k..k..k..k']
  ];
  var NAP = ['.p...p....', '.pp.pp....', 'pppppppppp', 'pppppppppp', '.pppppppp.'];
  var STAR = ['.p.', 'ppp', '.p.'];

  function ink(s, x, y, sz, col, al) {
    var back = col === INK ? PAPER : INK;
    game.draw.text(s, x + 3, y + 3, { size: sz, color: back, bold: true, align: al || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: al || 'center' });
  }

  function layNappers() {
    sleepers = [];
    for (var i = 0; i < 3; i++) sleepers.push({ x: 470 + i * 200, bob: game.random(0, 6) });
  }

  function reset() {
    stage = 'ready'; readyT = 0.8; remain = TIME_LIMIT; pushed = 0; spotted = 0;
    crow = { mode: 'watch', t: 1.2, feintDone: false, awayFor: 0, win: 0.9 };
    hero = { x: HIDE_X, dash: 0, target: null };
    layNappers(); fallers = []; stopT = 0; outroT = 0; cleared = false; fastest = 9; spot = null; milestoneDone = false;
  }

  // カラスの見張り(実プレイ・デモ共用)。フェイントを挟んでから背を向ける
  function crowTick(dt) {
    crow.t -= dt;
    if (crow.mode === 'watch') {
      if (!crow.feintDone && crow.t < 0.5) { crow.mode = 'feint'; crow.t = 0.45; crow.feintDone = true; game.audio.tone('D4', 0.05, { wave: 'square', volume: 0.03 }); return; }
      if (crow.t <= 0) {
        crow.mode = 'away'; crow.awayFor = 0; crow.t = crow.win;
        game.audio.tone('A5', 0.08, { wave: 'square', volume: 0.06 });
      }
    } else if (crow.mode === 'feint') {
      if (crow.t <= 0) { crow.mode = 'watch'; crow.t = game.random(0.4, 0.8); }
    } else if (crow.mode === 'away') {
      crow.awayFor += dt;
      if (crow.t <= 0.3 && crow.t + dt > 0.3) game.audio.tone('E4', 0.12, { wave: 'triangle', volume: 0.05 });
      if (crow.t <= 0) lookBack();
    }
  }

  function lookBack() {
    crow.mode = 'watch'; crow.t = game.random(0.6, 1.5); crow.feintDone = game.random(0, 1) < 0.45;
    crow.win = Math.max(0.55, 0.9 - pushed * 0.06);
  }

  // 飛び出す(実プレイ・デモ共用)
  function pounce(ghost) {
    if (hero.dash > 0) return;
    if (crow.mode === 'away') {
      var rt = crow.awayFor;
      var tg = sleepers[0];
      hero.dash = 0.4; hero.target = tg.x;
      fallers.push({ x: tg.x, y: RIDGE_Y, vy: -300, spin: 0 });
      sleepers.shift();
      if (!sleepers.length) layNappers();
      game.audio.play('se_jump', 0.4);
      lookBack();
      if (ghost) return;
      pushed++;
      if (rt < fastest) fastest = rt;
      game.feedback.good(tg.x, RIDGE_Y - 140, { text: rt < 0.3 ? 'PERFECT' : rt < 0.5 ? 'GOOD' : 'NICE', color: INK, count: 12 });
      game.fx.popup(rt.toFixed(2), tg.x, RIDGE_Y - 230, { color: INK, size: 44 });
      spot = { x: tg.x, y: RIDGE_Y, t: 0.25 };
      if (!milestoneDone && pushed >= NEEDED / 2) {
        milestoneDone = true;
        game.audio.play('se_milestone', 0.5);
        game.fx.popup(pushed + ' / ' + NEEDED, W / 2, 330, { color: INK, size: 70 });
      }
      if (pushed >= NEEDED) wrapUp(true);
      return;
    }
    // 見つかった
    crow.mode = 'watch'; crow.t = 0.9; crow.feintDone = true;
    if (ghost) { game.fx.burst(HIDE_X + 60, RIDGE_Y - 60, { color: INK, count: 8, speed: 200 }); return; }
    spotted++;
    game.feedback.bad(HIDE_X + 60, RIDGE_Y - 180, { text: 'MISS', color: INK });
    spot = { x: CROW_X, y: CROW_Y, t: 0.5 };
    if (spotted >= MAX_SPOT) wrapUp(false); else stopT = 0.35;
  }

  function wrapUp(win) {
    if (stage === 'stop' || stage === 'outro') return;
    cleared = win; stage = 'stop'; stopT = 0.55;
    game.audio.stopBgm();
    if (win) { game.fx.flash(PAPER, 0.25); game.audio.play('se_success', 0.6); }
    else {
      if (remain <= 0) game.feedback.bad(W / 2, H * 0.42, { text: 'TIME UP', color: INK });
      game.audio.play('se_failure', 0.6);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; reset(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; reset(); demo.t = 0; return; }
    if (stage !== 'play' || stopT > 0) return;
    game.audio.play('se_tap', 0.25);
    pounce(false);
  });

  // ── demo: 背を向けたら0.25秒で飛び出す。2回に1回はフェイントに釣られて見つかる ──
  var demo = { t: 0, gx: W / 2, gy: 1650, press: 0, lag: 0, fooled: false, n: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt) { layNappers(); crow.mode = 'watch'; crow.t = 0.8; demo.n = 0; }
    crowTick(dt);
    moveBits(dt);
    demo.press -= dt;
    if (crow.mode === 'away') {
      demo.lag += dt;
      if (demo.lag > 0.25) { demo.lag = 0; demo.press = 0.18; demo.n++; pounce(true); }
    } else demo.lag = 0;
    if (crow.mode === 'feint' && !demo.fooled && demo.n % 2 === 1 && crow.t < 0.3) {
      demo.fooled = true; demo.press = 0.18; pounce(true); demo.n++;
    }
    if (crow.mode === 'away') demo.fooled = false;
    demo.gx = W / 2 + Math.sin(demo.t * 1.3) * 60;
  }

  function moveBits(dt) {
    if (hero.dash > 0) hero.dash -= dt;
    for (var i = fallers.length - 1; i >= 0; i--) {
      var f = fallers[i];
      f.vy += 2200 * dt; f.y += f.vy * dt; f.x += 160 * dt; f.spin += dt;
      if (f.y > 1330) { game.fx.burst(f.x, 1330, { color: INK, count: 6, speed: 150 }); fallers.splice(i, 1); }
    }
  }

  // ── drawing ──
  function dither(x, y, w, h, step, alpha) {
    for (var yy = y; yy < y + h; yy += step) {
      var off = ((yy - y) / step) % 2 ? step / 2 : 0;
      for (var xx = x + off; xx < x + w; xx += step) game.draw.rect(xx, yy, 4, 4, INK, alpha);
    }
  }

  function drawNight() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, PAPER], [1, PAPER]]);
    dither(0, 240, W, 420, 26, 0.55);
    game.draw.circle(W * 0.22, 420, 110, PAPER);
    game.draw.circle(W * 0.22, 420, 110, INK, 0);
    game.draw.line(W * 0.22 - 110, 420, W * 0.22 + 110, 420, INK, 2);
    for (var s = 0; s < 6; s++) game.draw.sprite(STAR, { p: INK }, 120 + s * 170, 290 + (s % 2) * 60 + Math.sin(t * 2 + s) * 5, 7, { anchor: 'center' });
    // 遠くの屋根並み
    for (var r = 0; r < 5; r++) game.draw.rect(r * 230, 700 - (r % 2) * 40, 190, 280, INK, 0.25);
    // 手前の瓦屋根
    game.draw.rect(0, RIDGE_Y + 40, W, 360, INK);
    for (var tl = 0; tl < 8; tl++) game.draw.line(0, RIDGE_Y + 80 + tl * 42, W, RIDGE_Y + 80 + tl * 42, PAPER, 2);
    game.draw.line(0, RIDGE_Y + 40, W, RIDGE_Y + 40, PAPER, 6);
    // 日よけ幕(落ちる先)
    for (var a = 0; a < 9; a++) game.draw.rect(a * 124, 1330, 62, 60, a % 2 ? INK : PAPER);
    game.draw.line(0, 1330, W, 1330, INK, 4);
    // アンテナ
    game.draw.line(CROW_X, CROW_Y + 60, CROW_X, RIDGE_Y + 40, INK, 8);
    game.draw.line(CROW_X - 120, CROW_Y + 60, CROW_X + 120, CROW_Y + 60, INK, 8);
    // 煙突(隠れ場所)
    game.draw.rect(HIDE_X - 70, RIDGE_Y - 170, 150, 230, INK);
    game.draw.rect(HIDE_X - 90, RIDGE_Y - 190, 190, 30, INK);
    game.draw.line(HIDE_X - 70 + 20, RIDGE_Y - 150, HIDE_X - 70 + 20, RIDGE_Y + 40, PAPER, 3);
    game.draw.rect(0, 0, W, H, INK, 0.03 + 0.03 * Math.sin(t * 1.5));
  }

  function drawActors() {
    var t = game.time.elapsed;
    // カラス: 見ている間は目が光る。フェイントは首だけ半分振る。背を向けると反転
    var away = crow.mode === 'away';
    var tilt = crow.mode === 'feint' ? Math.sin(t * 30) * 14 : 0;
    var ruffle = away && crow.t < 0.3 ? Math.sin(t * 60) * 8 : 0;
    game.draw.sprite(CROW[away ? 1 : 0], { k: INK, w: PAPER }, CROW_X + tilt + ruffle, CROW_Y + Math.sin(t * 2) * 4, 14, { anchor: 'center', flipX: away || crow.mode === 'feint' && Math.floor(t * 20) % 2 === 0 });
    if (!away) {
      game.draw.circle(CROW_X - 30, CROW_Y - 14, 34 + Math.sin(t * 8) * 4, INK, 0.2);
      for (var b = 0; b < 3; b++) game.draw.line(CROW_X - 60, CROW_Y - 10, HIDE_X + 60 - b * 60, RIDGE_Y - 120 + b * 30, INK, 1);
    } else {
      game.draw.sprite(EYE, { k: PAPER }, CROW_X, CROW_Y - 20, 6, { anchor: 'center' });
    }
    // 昼寝の仲間
    for (var i = 0; i < sleepers.length; i++) {
      var sp = sleepers[i];
      game.draw.sprite(NAP, { p: PAPER }, sp.x, RIDGE_Y + Math.sin(t * 2 + sp.bob) * 4, 12, { anchor: 'center' });
      game.draw.sprite(NAP, { p: INK }, sp.x, RIDGE_Y + Math.sin(t * 2 + sp.bob) * 4 - 4, 10, { anchor: 'center', alpha: 0.35 });
      if (Math.floor(t * 1.5 + i) % 3 === 0) game.draw.sprite(STAR, { p: INK }, sp.x + 60, RIDGE_Y - 70 - (t * 20 % 20), 5, { anchor: 'center' });
    }
    for (var f = 0; f < fallers.length; f++) game.draw.sprite(NAP, { p: INK }, fallers[f].x, fallers[f].y, 12, { anchor: 'center', flipY: Math.floor(fallers[f].spin * 8) % 2 === 0 });
    // 黒猫
    var hx = HIDE_X + 40;
    if (hero.dash > 0 && hero.target !== null) {
      var k = hero.dash > 0.2 ? (0.4 - hero.dash) / 0.2 : hero.dash / 0.2;
      hx = HIDE_X + 40 + (hero.target - 60 - HIDE_X - 40) * k;
    }
    game.draw.sprite(CAT[Math.floor(t * 8) % 2], { k: INK, w: PAPER }, hx, RIDGE_Y - 40 + Math.sin(t * 3) * 3, 13, { anchor: 'center' });
    game.draw.rect(hx - 60, RIDGE_Y + 8, 120, 10, INK, 0.5);
  }

  function drawFloor() {
    var t = game.time.elapsed;
    game.draw.rect(0, 1440, W, H - 1440, PAPER);
    dither(0, 1440, W, 60, 20, 0.6);
    for (var m = 0; m < MAX_SPOT; m++) {
      game.draw.circle(W / 2 - 150 + m * 150, 1640, 44, INK, m < spotted ? 1 : 0.15);
      if (m < spotted) game.draw.sprite(EYE, { k: PAPER }, W / 2 - 150 + m * 150, 1640, 10, { anchor: 'center' });
    }
    for (var n = 0; n < NEEDED; n++) game.draw.sprite(NAP, { p: n < pushed ? INK : '#bdb8aa' }, 150 + n * 156, 1790 + Math.sin(t * 2 + n) * 3, 6, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 228, INK);
    ink(pushed + ' / ' + NEEDED, W / 2, 95, 70, PAPER);
    ink(String(Math.ceil(remain)), 60, 95, 52, PAPER, 'left');
    game.draw.rect(60, 170, W - 120, 18, PAPER, 0.25);
    game.draw.rect(60, 170, (W - 120) * Math.max(0, remain / TIME_LIMIT), 18, PAPER);
  }

  function total() { return pushed * 150 + (MAX_SPOT - spotted) * 60 + Math.round(Math.max(0, 1 - fastest) * 200) + Math.ceil(remain) * 10; }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (stage === undefined) reset();
      stepDemo(dt);
      drawNight(); drawActors(); drawFloor();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 13 });
      game.draw.rect(0, 0, W, 228, INK);
      ink(GAME_TITLE, W / 2, 95 + Math.sin(t * 2) * 6, 80, PAPER);
      ink('HI-SCORE ' + game.best, W / 2, 180, 36, PAPER);
      if (Math.floor(t * 1.8) % 2 === 0) ink('► 100円 投入 ◄', W / 2, H * 0.97, 40, INK);
      else ink('INSERT COIN', W / 2, H * 0.97, 34, INK);
      return;
    }
    if (state === S.RESULT) {
      drawNight(); drawFloor();
      ink(cleared ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.42, 92, INK);
      ink('SCORE ' + (cleared ? total() : 0), W / 2, H * 0.48, 44, INK);
      if (Math.floor(t * 2) % 2 === 0) ink('TAP TO CONTINUE', W / 2, H * 0.97, 38, INK);
      return;
    }

    if (stage === 'ready') {
      readyT -= dt;
      if (readyT <= 0) { stage = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (stage === 'play') {
      if (stopT > 0) stopT -= dt;
      else {
        remain -= dt;
        crowTick(dt);
        if (remain <= 0) { remain = 0; wrapUp(false); }
      }
      moveBits(dt);
    } else if (stage === 'stop') {
      stopT -= dt; moveBits(dt);
      if (stopT <= 0) { stage = 'outro'; outroT = 1.4; }
    } else if (stage === 'outro') {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { pushed: pushed, spotted: spotted, fastest: fastest < 9 ? Math.round(fastest * 100) / 100 : 0 };
        if (cleared) game.end.success(total(), stats); else game.end.failure(stats);
        return;
      }
    }

    drawNight(); drawActors(); drawFloor(); drawHud();
    if (spot) {
      spot.t -= dt;
      if (Math.floor(t * 16) % 2 === 0) { game.draw.circle(spot.x, spot.y, 130, PAPER, 0.5); game.draw.circle(spot.x, spot.y, 130, INK, 0); }
      if (spot.t <= 0 && stage !== 'stop') spot = null;
    }
    if (stage === 'ready') ink(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 100, INK);
    if (stage === 'outro') {
      game.draw.rect(0, H * 0.35, W, H * 0.17, PAPER, 0.92);
      ink(cleared ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 92, INK);
      if (cleared && total() > game.best) ink('NEW RECORD', W / 2, H * 0.46, 46, INK);
      else if (cleared) ink('BEST ' + game.best, W / 2, H * 0.46, 40, INK);
      else ink('あと' + Math.max(1, NEEDED - pushed) + '匹!', W / 2, H * 0.46, 48, INK);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['E4', 0.5], ['G4', 0.25], ['R', 0.25], ['B4', 0.5], ['A4', 0.5],
      ['G4', 0.5], ['E4', 0.5], ['D4', 1], ['R', 0.5], ['E4', 0.25], ['E4', 0.25]
    ], { tempo: 104, wave: 'triangle', volume: 0.05, loop: true, bass: [['A2', 1], ['E2', 1]] });
    state = S.ATTRACT;
    reset();
  });
})(game);

// 421-hot-potato.js
// ホットポテト — 燃える玉を持たされた一瞬で、渡す相手の方向へ振り抜く
// 操作: 持ち手から見て、渡す相手のいる方向へスワイプ
// 成功: 6回 渡し切る  失敗: 手の中で燃え尽きる or 10秒
// @mechanic: swipe_direction
// @theme: circus
// 世界観: サーカスの曲芸師3人が、燃える玉を落とさぬよう回し続ける火渡り芸
// variation: 加速型(玉は1つなので物量型が成立しない。熱の上がりを回すたび速くする方へ変更)
// spice: フィーバータイム(3回渡すと数秒だけ得点2倍)
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 2000s ARCADE POP パレット(明るい背景 + 原色 + 白の太縁)
  var C = {
    pink: '#ff3d7f', blue: '#1e90ff', yellow: '#ffd400', green: '#2ecc40',
    purple: '#9b59ff', orange: '#ff7a1a', white: '#ffffff', ink: '#3a2260',
  };

  var GAME_TITLE = 'HOT POTATO';
  var MAX_TIME = 10;
  var NEEDED = 6;
  var BURN = 2.4;            // 手の中で燃え尽きるまでの秒数(初期値)

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var cast, holdIdx, heat, burnLimit, passes, score, totalTime, done;
  var fly, ready, hitStop, fever, feedback, feedbackOk, shake;

  // 曲芸師(顔つき / 2フレーム)
  var CAST_A = [
    '..PPPP..',
    '.PWWWWP.',
    'PWEWWEWP',
    'PWWWWWWP',
    'PWWMMWWP',
    '.PWWWWP.',
    '..PPPP..',
    '.P.PP.P.',
  ];
  var CAST_B = [
    '..PPPP..',
    '.PWWWWP.',
    'PWEWWEWP',
    'PWWWWWWP',
    'PWWMMWWP',
    '.PWWWWP.',
    '..PPPP..',
    'P..PP..P',
  ];
  var CAST_COL = { P: C.purple, W: '#ffe9d6', E: C.ink, M: C.pink };

  // 燃える玉
  var BALL = [
    '..OO..',
    '.OYYO.',
    'OYWWYO',
    'OYWWYO',
    '.OYYO.',
    '..OO..',
  ];
  var BALL_COL = { O: C.orange, Y: C.yellow, W: C.white };

  function txt(str, x, y, sz, color, align) {
    // 2000s POP: 太い白縁取り
    var a = align || 'center';
    game.draw.text(str, x - 4, y, { size: sz, color: C.white, bold: true, align: a });
    game.draw.text(str, x + 4, y, { size: sz, color: C.white, bold: true, align: a });
    game.draw.text(str, x, y - 4, { size: sz, color: C.white, bold: true, align: a });
    game.draw.text(str, x, y + 4, { size: sz, color: C.white, bold: true, align: a });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: a });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.10); }

  function tentBg() {
    game.draw.gradient(0, H, [[0, '#fff6dc'], [0.45, '#ffd9ea'], [1, '#bfe3ff']]);
    // 遠景: テントの紅白ストライプ(天井)
    for (var i = 0; i < 12; i++) {
      game.draw.line(W / 2, -120, i / 11 * W * 1.6 - W * 0.3, H * 0.42, i % 2 ? C.pink : C.white, 46);
    }
    game.draw.rect(0, H * 0.40, W, 26, C.yellow);
    // 遠景: 観客席のシルエット
    for (var s2 = 0; s2 < 16; s2++) {
      game.draw.circle(40 + s2 * 68, H * 0.47 + (s2 % 3) * 10, 30, C.purple, 0.18);
    }
    // 舞台の円
    game.draw.circle(W / 2, H * 0.66, 470, C.white, 0.55);
    game.draw.circle(W / 2, H * 0.66, 470, C.yellow, 0.18);
  }

  function initCast() {
    cast = [
      { x: W * 0.5,  y: H * 0.30 },  // 0: 上
      { x: W * 0.20, y: H * 0.72 },  // 1: 左下
      { x: W * 0.80, y: H * 0.72 },  // 2: 右下
    ];
  }

  // 持ち手 → 方向 → 渡す相手(型の中核。方向がそのまま相手になる)
  function targetOf(from, dir) {
    if (from === 0) return dir === 'left' ? 1 : dir === 'right' ? 2 : -1;
    if (from === 1) return dir === 'up' ? 0 : dir === 'right' ? 2 : -1;
    return dir === 'up' ? 0 : dir === 'left' ? 1 : -1;
  }

  function initGame() {
    initCast();
    holdIdx = 0; heat = 0; burnLimit = BURN; passes = 0; score = 0; totalTime = 0;
    done = false; fly = null; ready = 0.8; hitStop = 0; fever = 0;
    feedback = 0; feedbackOk = false; shake = 0;
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = score;
    game.audio.stopBgm();
    if (success) {
      game.audio.play('se_success');
    } else {
      game.audio.play('se_failure');
      hitStop = 0.5; shake = 0.5;
      game.fx.flash(C.orange, 0.3);
      game.fx.burst(cast[holdIdx].x, cast[holdIdx].y - 90, { color: C.orange, count: 18, speed: 460 });
    }
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1600);
  }

  function pass(dir) {
    var to = targetOf(holdIdx, dir);
    if (to < 0) {
      // 誤った方向 = 取り落とし。即死ではないが熱を失う時間になる
      feedback = 0.4; feedbackOk = false;
      hitStop = 0.3; shake = 0.3;
      heat += 0.5;
      game.audio.play('se_failure', 0.5);
      game.feedback.bad(cast[holdIdx].x, cast[holdIdx].y - 90, { text: 'MISS' });
      return;
    }
    var from = cast[holdIdx], t = cast[to];
    var dx = t.x - from.x, dy = t.y - from.y, d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    fly = { x: from.x, y: from.y - 90, vx: dx / d * d * 2.6, vy: dy / d * d * 2.6, to: to };
    passes++;
    var gain = fever > 0 ? 200 : 100;
    score += gain;
    feedback = 0.35; feedbackOk = true;
    game.feedback.good(from.x, from.y - 90, { text: '+' + gain, color: C.green });
    game.audio.play('se_tap', 0.5);
    if (passes === 3) { fever = 3.0; game.audio.play('se_milestone'); }
    if (passes >= NEEDED) { finish(true); return; }
    // 加速型: 回すほど手の中で燃えるのが速くなる
    burnLimit = Math.max(0.9, BURN - passes * 0.24);
    heat = 0;
  }

  function drawCast(i, holding, danger) {
    var p = cast[i];
    var wob = Math.floor(game.time.elapsed * 6) % 2 === 0;
    var sx = (holding && shake > 0) ? (Math.random() * 2 - 1) * 10 : 0;
    game.draw.sprite(wob ? CAST_A : CAST_B, CAST_COL, p.x + sx, p.y, 16, { anchor: 'center' });
    // 持ち手の足元に光の輪(誰の番かを色で示す)
    game.draw.circle(p.x, p.y + 78, holding ? 74 : 54, holding ? (danger ? C.pink : C.yellow) : C.blue, holding ? 0.55 : 0.2);
  }

  function drawBall(x, y, danger) {
    var s = danger ? 18 + Math.sin(game.time.elapsed * 22) * 3 : 16;
    // telegraph: 燃え尽きが近いほど炎が大きく速く揺れる
    game.draw.circle(x, y - 26, danger ? 54 : 34, C.orange, danger ? 0.55 : 0.3);
    game.draw.circle(x, y - 34, danger ? 30 : 20, C.yellow, 0.6);
    game.draw.sprite(BALL, BALL_COL, x, y, s, { anchor: 'center' });
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || fly || ready > 0 || hitStop > 0) return;
    pass(dir);
  });

  // ── ATTRACT ゴースト実演: 手が上の曲芸師から左へ振り抜く ──
  var demo = { t: 0, gx: W * 0.5, gy: H * 0.44, press: false, holder: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.2;
    if (cyc < 0.9) {
      demo.press = true;
      demo.gx += (cast[demo.holder].x - demo.gx) * Math.min(1, dt * 4);
      demo.gy += (cast[demo.holder].y + 40 - demo.gy) * Math.min(1, dt * 4);
    } else if (cyc < 1.5) {
      // 相手の方向へ振り抜く
      var tgt = demo.holder === 0 ? cast[1] : cast[0];
      demo.press = true;
      demo.gx += (tgt.x - demo.gx) * Math.min(1, dt * 6);
      demo.gy += (tgt.y - demo.gy) * Math.min(1, dt * 6);
    } else {
      if (demo.press) {
        demo.press = false;
        demo.holder = demo.holder === 0 ? 1 : 0;
        game.feedback.good(cast[demo.holder].x, cast[demo.holder].y - 90, { text: '+100', color: C.green });
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!cast) initCast();
      tentBg();
      stepDemo(dt);
      for (var i0 = 0; i0 < 3; i0++) drawCast(i0, i0 === demo.holder, false);
      drawBall(cast[demo.holder].x, cast[demo.holder].y - 90, false);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.11, 78, C.pink);
      txt('BEST ' + String(game.best).padStart(6, '0'), W / 2, H * 0.17, 40, C.blue);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 62, C.purple);
        txt('TAP TO START', W / 2, H * 0.94, 46, C.ink);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 40, C.purple);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      tentBg();
      if (hitStop > 0) hitStop -= dt;
      if (shake > 0) shake -= dt;
      for (var i1 = 0; i1 < 3; i1++) drawCast(i1, i1 === holdIdx, !resultSuccess);
      drawBall(cast[holdIdx].x, cast[holdIdx].y - 90, !resultSuccess);
      txt(resultSuccess ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.50, 96, resultSuccess ? C.green : C.pink);
      txt('SCORE ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.60, 58, C.ink);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(6, '0'), W / 2, H * 0.66, 44, C.blue);
      if (resultSuccess && finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) {
        txt('NEW RECORD', W / 2, H * 0.73, 56, C.orange);
      } else if (Math.floor(game.time.elapsed * 2) % 2 === 0) {
        txt('TAP TO CONTINUE', W / 2, H * 0.78, 46, C.purple);
      }
      scanlines();
      return;
    }

    // ── PLAYING ──
    if (!done) {
      if (hitStop > 0) {
        hitStop -= dt;
      } else if (ready > 0) {
        ready -= dt;
        if (ready <= 0) game.audio.play('se_tap');
      } else {
        totalTime += dt;
        if (fever > 0) fever -= dt;
        if (totalTime >= MAX_TIME) { finish(false); return; }
        if (fly) {
          fly.x += fly.vx * dt; fly.y += fly.vy * dt;
          var t2 = cast[fly.to];
          if (Math.abs(t2.x - fly.x) < 70 && Math.abs(t2.y - 90 - fly.y) < 70) {
            holdIdx = fly.to; fly = null; heat = 0;
          }
        } else {
          heat += dt;
          if (heat >= burnLimit) { finish(false); return; }
        }
      }
      if (feedback > 0) feedback -= dt;
      if (shake > 0) shake -= dt;
    }

    // draw
    var danger = !fly && heat > burnLimit * 0.6;
    tentBg();
    for (var i = 0; i < 3; i++) drawCast(i, !fly && i === holdIdx, danger);
    if (fly) drawBall(fly.x, fly.y, false);
    else drawBall(cast[holdIdx].x, cast[holdIdx].y - 90, danger);

    // HUD: 残時間バー + スコア + 進捗
    var frac = Math.max(0, 1 - totalTime / MAX_TIME);
    game.draw.rect(60, 40, W - 120, 26, C.white, 0.8);
    game.draw.rect(60, 40, (W - 120) * frac, 26, fever > 0 ? C.pink : C.blue);
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 112, 46, C.ink);
    for (var k = 0; k < NEEDED; k++) {
      game.draw.rect(W / 2 - NEEDED * 30 + k * 60, 156, 46, 16, k < passes ? C.green : C.white);
    }
    txt(passes + ' / ' + NEEDED, W / 2, 210, 40, C.green);

    // 手の中の熱ゲージ(telegraph: 残りが視覚で分かる)
    if (!fly) {
      var hp = cast[holdIdx];
      var hr = Math.min(1, heat / burnLimit);
      game.draw.rect(hp.x - 90, hp.y + 108, 180, 20, C.white, 0.9);
      game.draw.rect(hp.x - 90, hp.y + 108, 180 * (1 - hr), 20, hr > 0.6 ? C.pink : C.yellow);
    }

    if (fever > 0 && Math.floor(game.time.elapsed * 6) % 2 === 0) txt('FEVER', W / 2, H * 0.40, 58, C.pink);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 96, C.yellow);
    if (feedback > 0 && !feedbackOk) txt('あと' + (NEEDED - passes) + '回', W / 2, H * 0.46, 50, C.orange);

    scanlines();
  });

  game.onStart(function() {
    // 2000s ARCADE POP: 明るく跳ねるサーカスのマーチ
    game.audio.melody(
      [['C5', 0.25], ['E5', 0.25], ['G5', 0.25], ['E5', 0.25], ['F5', 0.25], ['A5', 0.25], ['G5', 0.5],
       ['C5', 0.25], ['E5', 0.25], ['G5', 0.25], ['B4', 0.25], ['C5', 0.5], ['G4', 0.5]],
      { tempo: 168, wave: 'square', volume: 0.09, loop: true,
        bass: [['C3', 0.5], ['G2', 0.5], ['F2', 0.5], ['G2', 0.5]], bassWave: 'triangle', bassVolume: 0.08 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);

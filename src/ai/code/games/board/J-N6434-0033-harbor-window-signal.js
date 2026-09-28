// J-N6434-0033-harbor-window-signal.js
// 港の窓あかり応答 — 並んだ12の窓のどれかに旗つきの青い合図ランタンがともった瞬間、その窓だけを叩いて応答する
// 操作: 旗つきの青いランタンが出た窓をタップ。ふつうの黄色い灯りや旗のない青い灯り(にせ合図)は叩かない(社内メモ。画面には出さない)
// 終わり: 9回応答できれば成功。ちがう窓を叩く/合図を見逃す 計3回、または時間切れで失敗
// @mechanic: spot
// @theme: harbor_window_signal
// 世界観: 夜の港の信号小屋にいる見習いの灯台守が、向かいの長屋の窓に一瞬だけ出る船乗りの合図ランタンを見つけ、すぐに応答して船を港へ導く
// 残るもの: 正誤(CLEAR/GAME OVER) + 応答数・最速反応時間
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: 影なしのベタ塗り、丸角っぽい単純形、余白多め
  var STYLE = { bg: ['#23305e', '#3f4f8f', '#7b6fb0'], main: ['#f7efe2', '#e2a15b', '#2b2f4a'], accent: ['#34d6c6', '#ff5d73'] };
  var C = { sky1: STYLE.bg[0], sky2: STYLE.bg[1], sky3: STYLE.bg[2], wall: '#e9d7bd', wall2: '#d6c0a0', frame: STYLE.main[2], warm: '#ffd36b', teal: STYLE.accent[0], red: STYLE.accent[1], white: '#ffffff', ink: '#1b1f36', gold: '#ffc93c', sea: '#1c3f73' };

  var GAME_TITLE = 'WINDOW SIGNAL';
  var TIME_LIMIT = 13;
  var NEEDED = 9;
  var LIVES = 3;
  var COLS = 3, ROWS = 4, WW = 240, WH = 196;
  var GX0 = (W - (COLS * WW + (COLS - 1) * 60)) / 2;
  var GY0 = H * 0.17;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var LANTERN_A = ['.##.', '#ff#', '#tt#', '#tt#', '.##.'];
  var LANTERN_B = ['.##.', '#tt#', '#tt#', '#ff#', '.##.'];
  var FLAG = ['#...', '###.', '####', '###.', '#...'];
  var CAT = ['#..#', '####', 'e##e', '####'];
  var BOAT = ['...#....', '...##...', '...###..', '#######.', '.#####..'];

  var wins, hits, lives, misses, timeLeft, ready, hitStop, finished, ok, done, endWait;
  var signalIdx, sigAge, sigLife, gapT, decoyT, fastest, lastHitWin, boats, combo;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function winRect(i) {
    var c = i % COLS, r = Math.floor(i / COLS);
    return { x: GX0 + c * (WW + 60), y: GY0 + r * (WH + 70), w: WW, h: WH };
  }

  function initGame() {
    wins = [];
    for (var i = 0; i < COLS * ROWS; i++) wins.push({ kind: 'dark', t: 0, pop: 0, flash: 0 });
    hits = 0; lives = LIVES; misses = 0; timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0;
    finished = false; ok = false; done = false; endWait = 0;
    signalIdx = -1; sigAge = 0; sigLife = 1.15; gapT = 0.35; decoyT = 0.2; fastest = 9; lastHitWin = -1; boats = []; combo = 0;
  }

  function freeWindow() {
    for (var g = 0; g < 20; g++) {
      var i = Math.floor(game.random(0, COLS * ROWS));
      if (i >= COLS * ROWS) i = COLS * ROWS - 1;
      if (wins[i].kind === 'dark' && i !== lastHitWin) return i;
    }
    return -1;
  }

  function spawnSignal() {
    var i = freeWindow();
    if (i < 0) return;
    var golden = hits >= 3 && game.random(0, 1) < 0.2;
    wins[i].kind = golden ? 'gold' : 'signal'; wins[i].t = 0; wins[i].pop = 0.25;
    signalIdx = i; sigAge = 0;
    sigLife = Math.max(0.72, 1.15 - hits * 0.05); // 加速型: 合図が短くなる
    if (state === S.PLAYING) game.audio.tone(golden ? 'A6' : 'E6', 0.08, { wave: 'triangle', volume: 0.06 });
  }

  function spawnDecoy() {
    var i = freeWindow();
    if (i < 0) return;
    // フェイント型: 後半は旗のない青い灯り(にせ合図)が混ざる
    var fake = hits >= 3 && game.random(0, 1) < 0.4;
    wins[i].kind = fake ? 'fake' : (game.random(0, 1) < 0.3 ? 'cat' : 'warm');
    wins[i].t = game.random(0.6, 1.0); wins[i].pop = 0.2;
  }

  function simulate(dt) {
    for (var i = 0; i < wins.length; i++) {
      var w = wins[i];
      if (w.pop > 0) w.pop -= dt;
      if (w.flash > 0) w.flash -= dt;
      if (w.kind === 'warm' || w.kind === 'fake' || w.kind === 'cat') {
        w.t -= dt;
        if (w.t <= 0) w.kind = 'dark';
      }
    }
    for (var b = boats.length - 1; b >= 0; b--) {
      boats[b].x += dt * 260;
      if (boats[b].x > W + 100) boats.splice(b, 1);
    }
    decoyT -= dt;
    if (decoyT <= 0) { spawnDecoy(); decoyT = game.random(0.22, 0.4); }
    if (signalIdx < 0) {
      gapT -= dt;
      if (gapT <= 0) spawnSignal();
    } else {
      sigAge += dt;
      if (sigAge >= sigLife) {
        // 見逃し
        var r = winRect(signalIdx);
        wins[signalIdx].kind = 'dark'; wins[signalIdx].flash = 0.4;
        signalIdx = -1; gapT = 0.3; combo = 0;
        loseLife(r.x + r.w / 2, r.y + r.h / 2);
      }
    }
  }

  function loseLife(x, y) {
    lives--; misses++;
    game.feedback.bad(x, y, { text: 'MISS', shake: 10 });
    if (lives <= 0 && state === S.PLAYING) { finished = true; ok = false; hitStop = 0.5; }
  }

  function tapAt(x, y) {
    var hitWin = -1;
    for (var i = 0; i < wins.length; i++) {
      var r = winRect(i);
      if (x >= r.x - 10 && x <= r.x + r.w + 10 && y >= r.y - 10 && y <= r.y + r.h + 10) { hitWin = i; break; }
    }
    if (hitWin < 0) { game.audio.play('se_tap', 0.1); return; }
    var rr = winRect(hitWin);
    var cx = rr.x + rr.w / 2, cy = rr.y + rr.h / 2;
    var w = wins[hitWin];
    if (hitWin === signalIdx) {
      var golden = w.kind === 'gold';
      var perfect = sigAge < 0.4;
      hits += golden ? 2 : 1; combo++;
      if (sigAge < fastest) fastest = sigAge;
      w.kind = 'dark'; w.flash = 0.35; lastHitWin = hitWin;
      signalIdx = -1; gapT = game.random(0.18, 0.42);
      boats.push({ x: -80, y: H * 0.86 + game.random(-20, 30), gold: golden });
      game.feedback.good(cx, cy, { text: golden ? 'x2' : (perfect ? 'PERFECT' : 'GOOD'), color: golden ? C.gold : C.teal, size: 50, volume: 0.3 });
      if (golden) game.audio.play('se_coin', 0.35);
      if (hits >= 5 && hits - (golden ? 2 : 1) < 5 && state === S.PLAYING) {
        game.fx.popup(hits + ' / ' + NEEDED, W / 2, H * 0.13, { color: C.gold, size: 54 });
        game.audio.play('se_milestone', 0.4);
      }
      if (hits >= NEEDED && state === S.PLAYING) {
        hits = Math.min(hits, NEEDED + 1);
        finished = true; ok = true; hitStop = 0.45;
      }
    } else {
      w.flash = 0.4; combo = 0;
      loseLife(cx, cy);
    }
  }

  // ── 描画 ───────────────────────────────────────────────
  function drawBack() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky1], [0.5, C.sky2], [1, C.sky3]]);
    game.draw.rect(0, 0, W, H, C.teal, 0.03 + 0.03 * Math.sin(t * 1.3));
    for (var s = 0; s < 14; s++) {
      game.draw.circle((s * 173) % W, 40 + (s * 71) % 150, 3 + (s % 3), C.white, 0.35 + 0.3 * Math.sin(t * 2 + s));
    }
    // 長屋の壁
    game.draw.rect(GX0 - 50, GY0 - 60, W - 2 * (GX0 - 50), ROWS * (WH + 70) + 40, C.wall);
    game.draw.rect(GX0 - 50, GY0 - 60, W - 2 * (GX0 - 50), 26, C.wall2);
    // 港の水面(親指ゾーン)
    var sy = H * 0.8;
    game.draw.rect(0, sy, W, H - sy, C.sea);
    for (var k = 0; k < 7; k++) {
      var wx = ((k * 170 + t * 40) % (W + 120)) - 60;
      game.draw.rect(wx, sy + 40 + (k % 3) * 70 + Math.sin(t * 2 + k) * 6, 90, 8, C.white, 0.25);
    }
    game.draw.rect(0, sy - 14, W, 14, C.wall2);
  }

  function drawWindows() {
    var t = game.time.elapsed;
    for (var i = 0; i < wins.length; i++) {
      var r = winRect(i), w = wins[i];
      var sc = w.pop > 0 ? 1 + w.pop * 0.4 : 1;
      var cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      game.draw.rect(r.x - 12, r.y - 12, r.w + 24, r.h + 24, C.frame);
      var inner = '#394070';
      if (w.kind === 'warm' || w.kind === 'cat') inner = C.warm;
      if (w.kind === 'fake') inner = '#5aa8b8';
      if (w.kind === 'signal' || w.kind === 'gold') inner = '#153a4a';
      game.draw.rect(r.x, r.y, r.w, r.h, inner);
      game.draw.rect(cx - 4, r.y, 8, r.h, C.frame, 0.8);
      game.draw.rect(r.x, cy - 4, r.w, 8, C.frame, 0.8);
      if (w.kind === 'cat') game.draw.sprite(CAT, { '#': '#3b2d3f', 'e': '#9cff6b' }, cx, cy + 30 + Math.sin(t * 3 + i) * 4, 14, { anchor: 'center' });
      if (w.kind === 'fake') {
        var fl = 0.5 + 0.5 * Math.sin(t * 20 + i);
        game.draw.circle(cx, cy, 60, '#8fe0e8', 0.2 + 0.2 * fl);
        game.draw.sprite(LANTERN_A, { '#': C.frame, 'f': '#b0f0f0', 't': '#79c8d0' }, cx, cy, 12 * sc, { anchor: 'center' });
      }
      if (w.kind === 'signal' || w.kind === 'gold') {
        var col = w.kind === 'gold' ? C.gold : C.teal;
        var left = 1 - sigAge / sigLife; // 残り時間リング
        game.draw.circle(cx, cy, 70 + 40 * left, C.white, 0.18 + 0.2 * Math.sin(t * 16));
        game.draw.circle(cx, cy, 64, col, 0.45);
        var fr = Math.floor(t * 8) % 2 === 0 ? LANTERN_A : LANTERN_B;
        game.draw.sprite(fr, { '#': C.white, 'f': '#ffffff', 't': col }, cx - 20, cy + Math.sin(t * 9) * 5, 14 * sc, { anchor: 'center' });
        game.draw.sprite(FLAG, { '#': C.red }, cx + 44 + Math.sin(t * 12) * 6, cy - 34, 10, { anchor: 'center' });
        game.draw.rect(r.x, r.y + r.h - 10, r.w * left, 10, col);
      }
      if (w.flash > 0) game.draw.rect(r.x - 12, r.y - 12, r.w + 24, r.h + 24, C.white, w.flash * 1.6);
    }
  }

  function drawHarbor() {
    var t = game.time.elapsed;
    for (var b = 0; b < boats.length; b++) {
      game.draw.sprite(BOAT, { '#': boats[b].gold ? C.gold : C.white }, boats[b].x, boats[b].y + Math.sin(t * 3 + b) * 6, 14, { anchor: 'center' });
    }
    // 応答を待つ船(主役の相棒): 合図が出るとランプが点く
    var lit = signalIdx >= 0;
    game.draw.sprite(BOAT, { '#': '#c7d0ff' }, W * 0.5, H * 0.9 + Math.sin(t * 2) * 8, 18, { anchor: 'center' });
    game.draw.circle(W * 0.5 + 10, H * 0.9 - 70 + Math.sin(t * 2) * 8, 16, lit ? C.teal : '#566090', lit ? 0.6 + 0.4 * Math.sin(t * 14) : 1);
  }

  function drawHud() {
    txt(Math.min(hits, NEEDED) + ' / ' + NEEDED, W / 2, 66, 50, C.white);
    var bw = W - 160;
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 112, bw, 18, C.ink, 0.6);
    game.draw.rect(80, 112, bw * Math.max(0, timeLeft / TIME_LIMIT), 18, low ? C.red : C.teal);
    for (var i = 0; i < LIVES; i++) game.draw.sprite(LANTERN_A, { '#': C.white, 'f': '#ffffff', 't': i < lives ? C.teal : '#566090' }, 110 + i * 70, 170, 7, { anchor: 'center' });
    if (combo >= 3) txt('COMBO ' + combo, W - 90, 170, 34, C.gold, 'right');
  }

  function drawScene() { drawBack(); drawWindows(); drawHarbor(); }

  // ── ATTRACT ゴースト実演(実ロジック: 合図を2回叩く→3回目はわざと黄色い窓を叩いてMISS) ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.7, press: false, wait: 0, n: 0, tx: W / 2, ty: H * 0.7, target: -1 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.n = 0; demo.target = -1; demo.wait = 0; }
    simulate(dt);
    if (lives < 1) lives = LIVES;
    demo.press = false;
    if (signalIdx >= 0) {
      if (demo.target < 0) {
        demo.wait = 0;
        demo.target = signalIdx;
        if (demo.n === 2) {
          for (var i = 0; i < wins.length; i++) if (wins[i].kind === 'warm' || wins[i].kind === 'cat') { demo.target = i; break; }
        }
      }
      demo.wait += dt;
      var r = winRect(demo.target);
      demo.tx = r.x + r.w / 2; demo.ty = r.y + r.h / 2;
      if (demo.wait > 0.32) {
        demo.press = true;
        tapAt(demo.tx, demo.ty);
        demo.n++; demo.target = -1;
      }
    }
    demo.gx += (demo.tx - demo.gx) * Math.min(1, dt * 9);
    demo.gy += (demo.ty - demo.gy) * Math.min(1, dt * 9);
    if (demo.wait > 0.25) demo.press = true;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.4);
      state = S.PLAYING; initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (ready > 0 || finished) { game.audio.play('se_tap', 0.1); return; }
    tapAt(x, y);
  });

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (wins === undefined) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy + 30, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.05, 64, C.gold);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.09, 34, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.97, 44, C.gold);
      else txt('TAP TO START', W / 2, H * 0.97, 40, C.white);
      return;
    }
    if (state === S.RESULT) { drawScene(); drawResult(); return; }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        drawScene(); drawResult();
        var score = Math.min(hits, NEEDED + 1) * 100 + (fastest < 9 ? Math.max(0, Math.round((1 - fastest) * 200)) : 0);
        var st = { signals: hits, misses: misses, fastestMs: fastest < 9 ? Math.round(fastest * 1000) : 0 };
        if (ok) game.end.success(score, st); else game.end.failure(st);
        return;
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) {
        done = true; endWait = 1.2;
        game.audio.stopBgm();
        game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
        if (ok) game.fx.burst(W / 2, H * 0.5, { color: C.teal, count: 40, speed: 600 });
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else if (!finished) {
      timeLeft -= dt;
      simulate(dt);
      if (timeLeft <= 0 && !finished) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.5;
        game.feedback.bad(W / 2, H * 0.5, { text: 'TIME UP' });
      }
    }

    drawScene();
    drawHud();
    if (finished && hitStop > 0) game.draw.rect(0, 0, W, H, '#ffffff', hitStop * 0.25);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 96, C.gold);
    if (done) txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.45, 90, ok ? C.teal : C.red);
  });

  function drawResult() {
    game.draw.rect(0, 0, W, H, C.ink, 0.5);
    txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.26, 96, ok ? C.teal : C.red);
    txt(Math.min(hits, NEEDED) + ' / ' + NEEDED, W / 2, H * 0.35, 68, C.white);
    if (fastest < 9) txt(fastest.toFixed(2) + '秒', W / 2, H * 0.41, 48, C.gold);
    var score = Math.min(hits, NEEDED + 1) * 100 + (fastest < 9 ? Math.max(0, Math.round((1 - fastest) * 200)) : 0);
    if (ok && score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.47, 52, C.gold);
    else txt('BEST ' + (game.best || 0), W / 2, H * 0.47, 40, C.white);
    if (!ok && NEEDED - hits > 0) txt('あと' + (NEEDED - hits) + '回!', W / 2, H * 0.53, 52, C.red);
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 40, C.white);
  }

  game.onStart(function() {
    game.audio.melody([['D5', 0.5], ['F5', 0.5], ['A5', 1], ['G5', 0.5], ['E5', 0.5], ['C5', 1], ['D5', 2]], { tempo: 132, wave: 'triangle', volume: 0.04, loop: true });
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);

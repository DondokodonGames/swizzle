// J-GC4-0012-snow-fort-target-toss.js
// スノーフォート — 左手で木のふたを立てて自陣の得点板を雪玉から守りつつ、右手で向こうの雪壁を行き来する的板に雪玉を当てる
// 操作: 画面の左側を押している間ふたが立つ(長く立てると腕が疲れて一度下がる)。右側をタップするとその位置めがけて雪玉を投げる
// 終わり: 的板に8回当てればCLEAR。自陣の得点板に3回当てられる/時間切れでGAME OVER
// @mechanic: coop_2zone
// @theme: snow_fort_target_toss
// 世界観: 雪の広場の的当て大会、見習いの子が自分の雪壁の後ろで得点板を木のふたで守りながら、向かいの雪壁の上を滑る的板に雪玉を当てて点を奪う
// 残るもの: 正誤(CLEAR/GAME OVER) + 的に当てた数・防いだ雪玉数のスコア
// スタイル: HYPERCASUAL 3D

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 白背景+単色、柔らかい影の丸い塊、当たり判定が見た目どおり
  var STYLE = {
    bg: ['#f7fbff', '#e6eef9', '#d3e0f2'],
    main: ['#ff5a5f', '#ffffff', '#2b3a55'],
    accent: ['#ffb400', '#56c2a8'],
  };
  var SHADOW = '#b8c6dc';

  var GAME_TITLE = 'SNOW FORT';
  var TIME_LIMIT = 22;
  var NEEDED = 8;
  var MAX_HITS = 3;
  var TARGET_Y = H * 0.32;
  var BOARD = { x: W * 0.24, y: H * 0.6 };
  var THROW_FROM = { x: W * 0.76, y: H * 0.74 };
  var FLIGHT = 0.45;
  var LID_MAX = 1.4;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var KID = [
    '..cccc..',
    '.cccccc.',
    '.cffffc.',
    '.fkffkf.',
    '..ffff..',
    'mjjjjjjm',
    'mjjjjjjm',
    '..jjjj..',
    '..b..b..',
  ];
  var KID_PAL = { c: '#ff5a5f', f: '#ffe0c4', k: '#2b3a55', j: '#56c2a8', m: '#ff5a5f', b: '#2b3a55' };
  var RIVAL = ['..oo..', '.oooo.', '..oo..', 'oooooo', '.oooo.', '.o..o.'];
  var BALL = ['.ww.', 'wwww', 'wwws', '.ss.'];

  var targets, shots, incoming, hits, boardHits, blocks, lidUp, lidT, lidRest, throwCd, nextIn, timeLeft, ready, freeze, ended, endWait, won, score, lastMile, armT, playT;

  function initGame() {
    targets = [
      { x: W * 0.3, vx: 210, down: 0 },
      { x: W * 0.62, vx: -260, down: 0 },
      { x: W * 0.8, vx: 170, down: 0 },
    ];
    shots = [];
    incoming = [];
    hits = 0;
    boardHits = 0;
    blocks = 0;
    lidUp = false;
    lidT = 0;
    lidRest = 0;
    throwCd = 0;
    nextIn = 1.6;
    timeLeft = TIME_LIMIT;
    ready = 0.8;
    freeze = null;
    ended = false;
    endWait = 0;
    won = false;
    score = 0;
    lastMile = 0;
    armT = 0;
    playT = 0;
  }

  function txt(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 4, { size: size, color: SHADOW, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function endGame(ok) {
    if (ended) return;
    ended = true;
    won = ok;
    endWait = 1.5;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.6);
  }

  // 右手:投げる(プレイヤー/デモ共用)
  function throwAt(x, demo) {
    if (ended || freeze) return false;
    if (throwCd > 0) { if (!demo) game.audio.play('se_tap', 0.1); return false; }
    var ax = Math.max(140, Math.min(W - 140, x));
    shots.push({ tx: ax, k: 0 });
    throwCd = 0.3;
    armT = 0.2;
    if (!demo) game.audio.play('se_jump', 0.35);
    return true;
  }

  // 左手:ふたを立てる(押している間)
  function setLid(want, demo) {
    var can = want && lidRest <= 0;
    if (can && !lidUp && !demo) game.audio.play('se_tap', 0.25);
    lidUp = can;
  }

  function stepWorld(dt, demo) {
    if (freeze) {
      freeze.t -= dt;
      if (freeze.t <= 0) { var d = freeze.done; freeze = null; d(); }
      return;
    }
    if (ended) return;
    playT += dt;
    if (throwCd > 0) throwCd -= dt;
    if (armT > 0) armT -= dt;
    // ふたの腕の疲れ
    if (lidRest > 0) { lidRest -= dt; lidUp = false; }
    if (lidUp) {
      lidT += dt;
      if (lidT >= LID_MAX) { lidUp = false; lidRest = 0.7; lidT = LID_MAX * 0.5; if (!demo) game.audio.tone('C3', 0.2, { wave: 'triangle', volume: 0.08 }); }
    } else lidT = Math.max(0, lidT - dt * 2);
    for (var i = 0; i < targets.length; i++) {
      var tg = targets[i];
      if (tg.down > 0) tg.down -= dt;
      var sp = 1 + Math.min(0.5, playT / 30);
      tg.x += tg.vx * sp * dt;
      if (tg.x < 150) { tg.x = 150; tg.vx = Math.abs(tg.vx); }
      if (tg.x > W - 150) { tg.x = W - 150; tg.vx = -Math.abs(tg.vx); }
    }
    // 自分の雪玉
    for (var s = shots.length - 1; s >= 0; s--) {
      var sh = shots[s];
      sh.k += dt / FLIGHT;
      if (sh.k < 1) continue;
      shots.splice(s, 1);
      var hit = null, bd = 1e9;
      for (var j = 0; j < targets.length; j++) {
        var dx = Math.abs(targets[j].x - sh.tx);
        if (targets[j].down <= 0 && dx < 88 && dx < bd) { bd = dx; hit = targets[j]; }
      }
      if (hit) {
        hit.down = 0.8;
        hits++;
        score += bd < 25 ? 150 : 100;
        game.feedback.good(hit.x, TARGET_Y - 90, { text: bd < 25 ? 'PERFECT' : 'GOOD', color: STYLE.main[0], count: 16, volume: demo ? 0 : undefined });
        if (!demo && hits === NEEDED / 2 && lastMile === 0) {
          lastMile = 1;
          game.fx.popup(hits + ' / ' + NEEDED, W * 0.5, H * 0.2, { color: STYLE.accent[0], size: 70 });
          game.audio.play('se_milestone', 0.5);
        }
        if (hits >= NEEDED && !demo) {
          var hx = hit.x;
          freeze = { t: 0.4, done: function () {
            score += Math.round(timeLeft * 30) + blocks * 50;
            game.feedback.good(hx, TARGET_Y - 150, { text: 'CLEAR', color: STYLE.accent[0], count: 36 });
            endGame(true);
          } };
          return;
        }
      } else {
        game.fx.burst(sh.tx, TARGET_Y + 30, { color: STYLE.main[1], count: 10, speed: 220 });
        if (!demo) game.audio.play('se_break', 0.2);
      }
    }
    // 向こうからの雪玉(影で着弾を予告)
    nextIn -= dt;
    if (nextIn <= 0) {
      incoming.push({ t: 0.85, max: 0.85, sx: game.random(W * 0.25, W * 0.75) });
      nextIn = Math.max(1.0, 1.7 - playT * 0.035) + game.random(0, 0.5);
      if (!demo) game.audio.tone('E5', 0.1, { wave: 'sine', volume: 0.06, slide: -200 });
    }
    for (var n = incoming.length - 1; n >= 0; n--) {
      var inc = incoming[n];
      inc.t -= dt;
      if (inc.t > 0) continue;
      incoming.splice(n, 1);
      if (lidUp) {
        blocks++;
        score += 30;
        game.feedback.good(BOARD.x, BOARD.y - 120, { text: 'NICE', color: STYLE.accent[1], count: 10, volume: demo ? 0 : 0.35 });
      } else {
        boardHits++;
        freeze = { t: 0.35, done: function () {
          game.feedback.bad(BOARD.x, BOARD.y - 60, { text: 'MISS' });
          if (boardHits >= MAX_HITS) { if (!demo) endGame(false); else demoOver = true; }
        } };
        return;
      }
    }
  }

  var demoOver = false;

  // ── 描画 ────────────────────────────────────────────────
  function blob(x, y, r, col) {
    game.draw.circle(x, y + r * 0.35, r, SHADOW, 0.5);
    game.draw.circle(x, y, r, col);
    game.draw.circle(x - r * 0.3, y - r * 0.3, r * 0.35, '#ffffff', 0.5);
  }

  function drawBg() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.5, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    // 降る雪
    for (var i = 0; i < 26; i++) {
      var x = (i * 173 + Math.sin(t + i) * 30) % W;
      var y = (i * 239 + t * 60) % H;
      game.draw.circle(x, y, 6 + (i % 3) * 2, '#ffffff', 0.9);
    }
    // 向こうの雪壁
    for (var k = 0; k < 7; k++) blob(80 + k * 155, TARGET_Y + 110, 95, '#ffffff');
    // 手前の雪壁
    for (var m = 0; m < 6; m++) blob(90 + m * 180, H * 0.7, 120, '#ffffff');
    game.draw.rect(0, H * 0.72, W, H * 0.28, '#ffffff');
    game.draw.rect(0, 0, W, H, STYLE.main[0], 0.015 + 0.015 * Math.sin(t * 2));
  }

  function drawFar() {
    var t = game.time.elapsed;
    // 向こうの投げ手(演出だけの相手、半透明)
    for (var r = 0; r < 3; r++) {
      var rx = W * (0.25 + r * 0.25);
      var pop = 0;
      for (var n = 0; n < incoming.length; n++) if (Math.abs(incoming[n].sx - rx) < W * 0.13 && incoming[n].t > incoming[n].max - 0.3) pop = 40;
      game.draw.sprite(RIVAL, { o: '#8aa0c4' }, rx, TARGET_Y + 60 - pop + Math.sin(t * 3 + r) * 6, 14, { anchor: 'center', alpha: 0.5 });
    }
    // 的板
    for (var i = 0; i < targets.length; i++) {
      var tg = targets[i];
      var down = tg.down > 0;
      var y = TARGET_Y + (down ? 60 : 0);
      game.draw.rect(tg.x - 8, y, 16, 80, '#8a6a4a');
      game.draw.circle(tg.x, y + 6, 76, SHADOW, 0.5);
      game.draw.circle(tg.x, y, down ? 40 : 74, STYLE.main[0]);
      game.draw.circle(tg.x, y, down ? 26 : 50, STYLE.main[1]);
      game.draw.circle(tg.x, y, down ? 12 : 24, STYLE.main[0]);
    }
    // 自分の雪玉(奥へ小さくなる)
    for (var s = 0; s < shots.length; s++) {
      var sh = shots[s];
      var k = sh.k;
      var x = THROW_FROM.x + (sh.tx - THROW_FROM.x) * k;
      var y2 = THROW_FROM.y + (TARGET_Y - THROW_FROM.y) * k - Math.sin(Math.PI * k) * 200;
      game.draw.sprite(BALL, { w: '#ffffff', s: SHADOW }, x, y2, 16 - 8 * k, { anchor: 'center' });
    }
  }

  function drawNear() {
    var t = game.time.elapsed;
    // 飛んでくる雪玉と着弾の影
    for (var n = 0; n < incoming.length; n++) {
      var inc = incoming[n];
      var k = 1 - inc.t / inc.max;
      var blink = Math.floor(t * 12) % 2 === 0;
      game.draw.circle(BOARD.x, BOARD.y, 40 + 80 * k, STYLE.main[0], blink ? 0.3 : 0.15);
      var bx = inc.sx + (BOARD.x - inc.sx) * k;
      var by = TARGET_Y + 60 + (BOARD.y - TARGET_Y - 60) * k - Math.sin(Math.PI * k) * 260;
      game.draw.sprite(BALL, { w: '#ffffff', s: SHADOW }, bx, by, 8 + 12 * k, { anchor: 'center' });
    }
    // 自陣の得点板
    game.draw.rect(BOARD.x - 10, BOARD.y, 20, 120, '#8a6a4a');
    for (var h = 0; h < MAX_HITS; h++) {
      var hx = BOARD.x - 70 + h * 70;
      game.draw.circle(hx, BOARD.y - 20, 30, h < boardHits ? '#9aa9c0' : STYLE.accent[0]);
    }
    // ふた(押している間、得点板の前に立つ)
    var tired = lidUp && lidT > LID_MAX * 0.7;
    var ly = lidUp ? BOARD.y - 150 : BOARD.y + 90;
    var shake = tired ? Math.sin(t * 50) * 8 : 0;
    game.draw.rect(BOARD.x - 150 + shake, ly + 14, 300, 26, SHADOW, 0.6);
    game.draw.rect(BOARD.x - 150 + shake, ly, 300, 40, lidRest > 0 ? '#9aa9c0' : '#c98f5a');
    game.draw.rect(BOARD.x - 150 + shake, ly, 300, 8, '#e3b184');
    // 投げる子(右手側)
    var kx = THROW_FROM.x + 60, ky = H * 0.8 - (armT > 0 ? 20 : 0) + Math.sin(t * 3) * 5;
    game.draw.circle(kx, H * 0.86, 70, SHADOW, 0.5);
    game.draw.sprite(KID, KID_PAL, kx, ky, 16, { anchor: 'center' });
    if (freeze) {
      var fa = 0.5 + 0.5 * Math.sin(freeze.t * 40);
      game.draw.circle(BOARD.x, BOARD.y - 20, 120 + (0.4 - freeze.t) * 240, STYLE.main[0], 0.3 * fa);
    }
  }

  function drawZones() {
    // 親指ゾーン:左=ふた、右=投げる
    game.draw.circle(W * 0.2, H * 0.9, 110, lidUp ? STYLE.accent[1] : STYLE.main[2], lidUp ? 0.5 : 0.12);
    game.draw.rect(W * 0.2 - 60, H * 0.9 - 14, 120, 28, '#c98f5a', 0.9);
    game.draw.rect(W * 0.2 - 60, H * 0.9 + 24, 120 * (1 - lidT / LID_MAX), 10, STYLE.accent[1], 0.9);
    game.draw.circle(W * 0.8, H * 0.93, 90, throwCd > 0 ? STYLE.main[2] : STYLE.main[0], throwCd > 0 ? 0.12 : 0.35);
    game.draw.sprite(BALL, { w: '#ffffff', s: SHADOW }, W * 0.8, H * 0.93, 14, { anchor: 'center' });
  }

  function drawHud() {
    txt(hits + ' / ' + NEEDED, W * 0.5, H * 0.05, 72, STYLE.main[2]);
    txt('SCORE ' + score, W * 0.8, H * 0.1, 34, STYLE.main[2]);
    var bw = W - 160;
    var low = timeLeft < 5 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, H * 0.085, bw, 14, SHADOW, 0.6);
    game.draw.rect(80, H * 0.085, bw * Math.max(0, timeLeft / TIME_LIMIT), 14, low ? STYLE.main[0] : STYLE.accent[1]);
  }

  function drawOutcome() {
    game.draw.rect(0, H * 0.34, W, H * 0.22, '#ffffff', 0.9);
    txt(won ? 'CLEAR' : 'GAME OVER', W * 0.5, H * 0.39, 96, won ? STYLE.accent[1] : STYLE.main[0]);
    txt('SCORE ' + score, W * 0.5, H * 0.45, 50, STYLE.main[2]);
    if (!won) txt('あと' + (NEEDED - hits) + '個!', W * 0.5, H * 0.51, 48, STYLE.accent[0]);
    else if (score > game.best) txt('NEW RECORD', W * 0.5, H * 0.51, 48, STYLE.accent[0]);
    else txt('BEST ' + game.best, W * 0.5, H * 0.51, 44, STYLE.main[2]);
  }

  // ── ATTRACT ゴースト実演(左右の手で同時に操る) ───────────
  var demo = { t: 0, lx: W * 0.2, ly: H * 0.9, rx: W * 0.8, ry: H * 0.9, rpress: 0, next: 0.4, cycle: 0, skip: false };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt || demoOver || !targets || hits >= 5) {
      if (!(demo.t <= dt)) demo.cycle++;
      demoOver = false;
      initGame();
      ready = 0;
      nextIn = 0.8;
      demo.skip = false;
    }
    if (freeze) return;
    // 左手:着弾が近い雪玉があればふたを立てる(1周おきに一度だけ見逃して失敗例)
    var soon = false;
    for (var n = 0; n < incoming.length; n++) if (incoming[n].t < 0.45) soon = true;
    if (demo.cycle % 2 === 1 && !demo.skip && soon && boardHits === 0) { demo.skip = true; }
    var want = soon && !(demo.skip && boardHits === 0);
    setLid(want, true);
    // 右手:的の少し先を読んで投げる
    demo.next -= dt;
    demo.rpress = Math.max(0, demo.rpress - dt);
    if (demo.next <= 0) {
      var tg = targets[Math.floor(Math.random() * 3)];
      if (tg.down <= 0) {
        var px = tg.x + tg.vx * (1 + Math.min(0.5, playT / 30)) * FLIGHT;
        if (px < 150 || px > W - 150) px = tg.x;
        demo.rx = px;
        throwAt(px, true);
        demo.rpress = 0.15;
      }
      demo.next = 0.7;
    }
  }

  function touchLid() {
    var tl = game.touches;
    for (var i = 0; i < tl.length; i++) if (tl[i].x < W * 0.45) return true;
    return false;
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING;
      initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function (x, y) {
    if (state !== S.PLAYING || ready > 0 || ended) return;
    if (x >= W * 0.5) {
      if (throwAt(x, false)) game.fx.burst(THROW_FROM.x, THROW_FROM.y, { color: STYLE.main[1], count: 6, speed: 180 });
    } else if (x < W * 0.45) {
      game.fx.burst(BOARD.x, BOARD.y + 90, { color: '#c98f5a', count: 5, speed: 140 });
      setLid(true, false);
    }
  });
  game.onRelease(function (x, y) {
    if (state !== S.PLAYING) return;
    if (x < W * 0.45 && lidUp && !touchLid()) game.audio.play('se_tap', 0.08);
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      stepWorld(dt, true);
      drawBg();
      drawFar();
      drawNear();
      drawZones();
      game.draw.hand(W * 0.2, H * 0.9, { press: lidUp, scale: 12 });
      game.draw.hand(demo.rx, H * 0.9, { press: demo.rpress > 0, scale: 12 });
      txt(GAME_TITLE, W * 0.5, H * 0.07, 100, STYLE.main[0]);
      txt('HI-SCORE ' + game.best, W * 0.5, H * 0.13, 40, STYLE.main[2]);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W * 0.5, H * 0.78, 50, STYLE.main[0]);
      else txt('INSERT COIN', W * 0.5, H * 0.78, 42, STYLE.main[2]);
      return;
    }
    if (state === S.RESULT) {
      drawBg();
      drawFar();
      drawNear();
      drawOutcome();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W * 0.5, H * 0.78, 40, STYLE.main[2]);
      return;
    }
    if (ended) {
      endWait -= dt;
      drawBg();
      drawFar();
      drawNear();
      drawHud();
      drawOutcome();
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { hits: hits, blocked: blocks, boardHits: boardHits };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
      return;
    }
    if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else {
      setLid(touchLid(), false);
      if (!freeze) {
        timeLeft -= dt;
        if (timeLeft <= 0) {
          timeLeft = 0;
          freeze = { t: 0.4, done: function () {
            game.feedback.bad(W * 0.5, TARGET_Y, { text: 'TIME UP' });
            endGame(false);
          } };
        }
      }
      stepWorld(dt, false);
    }
    drawBg();
    drawFar();
    drawNear();
    drawZones();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W * 0.5, H * 0.5, 120, STYLE.main[0]);
  });

  game.onStart(function () {
    game.audio.melody(
      [['G5', 0.5], ['E5', 0.5], ['C5', 0.5], ['E5', 0.5], ['F5', 0.5], ['A5', 0.5], ['G5', 1], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 2]],
      { tempo: 150, wave: 'triangle', volume: 0.05, loop: true, bass: [['C3', 2], ['F2', 2], ['G2', 2], ['C3', 2]] }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);

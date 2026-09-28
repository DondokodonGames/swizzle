// J-GC4-0007-dye-square-scrub.js
// ダイラッシュ — 広場の布パネルを刷毛でゴシゴシこすって自分の藍色に染め、時間切れまでに過半数を取る
// 操作: パネルの上で指を左右に素早く往復させてこする(こするほど藍に染まる)。飛んでくる橙の染料は、落ちる所をこすっていれば防げる
// 終わり: TIME UPの時点で20枚中11枚以上が藍ならCLEAR、足りなければGAME OVER
// @mechanic: rub
// @theme: dye_square_scrub
// 世界観: 染め物市の朝、見習い染め師が乾く前の布パネルを刷毛でこすって自分の藍に染め上げ、向かいの工房から飛んでくる橙の染料に塗り返される前に広場の大半を藍にする
// 残るもの: 正誤(CLEAR/GAME OVER) + 藍に染めた枚数・防いだ染料数のスコア
// スタイル: MODERN AD-GAME

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度・高コントラスト、太い縁取り、飛ぶ数字
  var STYLE = {
    bg: ['#ffe45e', '#ff9ecd', '#7ae7ff'],
    main: ['#2d3aff', '#ffffff', '#1a1446'],
    accent: ['#ff7a1a', '#23d160'],
  };

  var GAME_TITLE = 'DYE RUSH';
  var TIME_LIMIT = 14;
  var COLS = 4;
  var ROWS = 5;
  var NEEDED = 11;
  var PW = 222;
  var PH = 206;
  var GAPX = 14;
  var OX = (W - (COLS * PW + (COLS - 1) * GAPX)) / 2;
  var OY = H * 0.24;
  var NEUTRAL_COST = 520;
  var RIVAL_COST = 800;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var BRUSH = [
    '..kkkk..',
    '..kwwk..',
    '..kwwk..',
    '.kkkkkk.',
    '.kbbbbk.',
    'kbbbbbbk',
    'kbbbbbbk',
    '.b.b.b..',
  ];
  var RIVAL = [
    '...oo...',
    '..oooo..',
    '...oo...',
    '.oooooo.',
    'o.oooo.o',
    '..oooo..',
    '..o..o..',
    '.oo..oo.',
  ];
  var DROP = ['.o.', 'ooo', 'ooo', '.o.'];

  var panels, timeLeft, ready, freeze, ended, endWait, won, score, blocks, splats, nextSplat, finger, lastMile, throwAnim, strokes;

  function initGame() {
    panels = [];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) panels.push({ c: c, r: r, own: 0, prog: 0, flash: 0 });
    var put = 0;
    while (put < 4) {
      var p = panels[Math.floor(Math.random() * panels.length)];
      if (p.own === 0) { p.own = 2; put++; }
    }
    timeLeft = TIME_LIMIT;
    ready = 0.8;
    freeze = null;
    ended = false;
    endWait = 0;
    won = false;
    score = 0;
    blocks = 0;
    splats = [];
    nextSplat = 1.4;
    finger = { on: false, x: 0, y: 0, lx: 0, ly: 0, sdx: 0 };
    lastMile = 0;
    throwAnim = [0, 0];
    strokes = 0;
  }

  function px(p) { return OX + p.c * (PW + GAPX); }
  function py(p) { return OY + p.r * (PH + GAPX); }
  function panelAt(x, y) {
    for (var i = 0; i < panels.length; i++) {
      var p = panels[i];
      if (x >= px(p) && x < px(p) + PW && y >= py(p) && y < py(p) + PH) return p;
    }
    return null;
  }
  function count(o) { var n = 0; for (var i = 0; i < panels.length; i++) if (panels[i].own === o) n++; return n; }

  function txt(s, x, y, size, color) {
    game.draw.text(s, x + 5, y + 6, { size: size, color: STYLE.main[2], bold: true, align: 'center' });
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

  // こする:指の移動量をそのパネルの染まり具合に変える(プレイヤー/デモ共用)
  function rub(x, y, demo) {
    if (!finger.on) { finger.lx = x; finger.ly = y; finger.on = true; }
    var dx = x - finger.lx, dy = y - finger.ly;
    var d = Math.hypot(dx, dy);
    finger.x = x; finger.y = y;
    finger.lx = x; finger.ly = y;
    if (d < 1 || d > 400) return;
    var p = panelAt(x, y);
    if (!p || p.own === 1) return;
    // 往復(向きの切り返し)が「こすり」の手応え
    if (Math.abs(dx) > 6) {
      var sg = dx > 0 ? 1 : -1;
      if (finger.sdx !== 0 && sg !== finger.sdx) {
        strokes++;
        game.fx.burst(x, y, { color: STYLE.main[1], count: 4, speed: 180 });
        if (!demo) game.audio.tone(strokes % 2 ? 'E5' : 'G5', 0.04, { wave: 'triangle', volume: 0.05 });
      }
      finger.sdx = sg;
    }
    p.prog += d / (p.own === 2 ? RIVAL_COST : NEUTRAL_COST);
    if (p.prog >= 1) {
      p.own = 1;
      p.prog = 0;
      p.flash = 0.35;
      score += 100;
      game.feedback.good(px(p) + PW / 2, py(p) + PH / 2, { text: '+100', color: STYLE.main[0], sound: 'se_coin', count: 14, volume: demo ? 0 : 0.4 });
      var mine = count(1);
      if (!demo && (mine === 6 || mine === NEEDED) && mine > lastMile) {
        lastMile = mine;
        game.fx.popup(mine + ' / ' + panels.length, W * 0.5, H * 0.2, { color: STYLE.main[0], size: 76 });
        game.audio.play('se_milestone', 0.5);
      }
    }
  }

  function launchSplat() {
    var mine = [], other = [];
    for (var i = 0; i < panels.length; i++) {
      if (panels[i].own === 1) mine.push(panels[i]);
      else if (panels[i].own === 0) other.push(panels[i]);
    }
    var pool = (mine.length >= 3 && Math.random() < 0.5) || other.length === 0 ? mine : other;
    if (!pool.length) return;
    var target = pool[Math.floor(Math.random() * pool.length)];
    var side = target.c < 2 ? 0 : 1;
    throwAnim[side] = 0.3;
    splats.push({ p: target, t: 0.8, max: 0.8, sx: side === 0 ? W * 0.12 : W * 0.88, sy: H * 0.16 });
  }

  function stepWorld(dt, demo) {
    for (var i = 0; i < panels.length; i++) if (panels[i].flash > 0) panels[i].flash -= dt;
    throwAnim[0] = Math.max(0, throwAnim[0] - dt);
    throwAnim[1] = Math.max(0, throwAnim[1] - dt);
    if (freeze) {
      freeze.t -= dt;
      if (freeze.t <= 0) { var d = freeze.done; freeze = null; d(); }
      return;
    }
    if (ended) return;
    nextSplat -= dt;
    if (nextSplat <= 0) {
      launchSplat();
      var k = demo ? 0.5 : 1 - timeLeft / TIME_LIMIT;
      nextSplat = 1.7 - 0.6 * k;
    }
    for (var s = splats.length - 1; s >= 0; s--) {
      var sp = splats[s];
      sp.t -= dt;
      if (sp.t > 0) continue;
      splats.splice(s, 1);
      var p = sp.p;
      var cx = px(p) + PW / 2, cy = py(p) + PH / 2;
      if (finger.on && panelAt(finger.x, finger.y) === p) {
        blocks++;
        score += 50;
        game.feedback.good(cx, cy, { text: 'GOOD', color: STYLE.accent[1], count: 10, volume: demo ? 0 : 0.4 });
        continue;
      }
      var was = p.own;
      p.own = 2;
      p.prog = 0;
      p.flash = 0.3;
      game.fx.burst(cx, cy, { color: STYLE.accent[0], count: 16, speed: 360 });
      if (was === 1) game.feedback.bad(cx, cy, { text: 'MISS', shake: 6, volume: demo ? 0 : 0.35 });
      else if (!demo) game.audio.play('se_break', 0.25);
    }
  }

  // ── 描画 ────────────────────────────────────────────────
  function drawBg() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[2]], [0.5, STYLE.bg[0]], [1, STYLE.bg[1]]]);
    // 物干しの布が揺れる遠景
    for (var i = 0; i < 8; i++) {
      var x = i * 140 + 10;
      var sway = Math.sin(t * 2 + i) * 12;
      game.draw.rect(x + sway, H * 0.12, 90, 60, ['#2d3aff', '#ff7a1a', '#23d160', '#ff4fa3'][i % 4], 0.35);
    }
    game.draw.line(0, H * 0.12, W, H * 0.12, STYLE.main[2], 4);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.04 + 0.04 * Math.sin(t * 2.2));
  }

  function drawRivals() {
    var t = game.time.elapsed;
    for (var s = 0; s < 2; s++) {
      var x = s === 0 ? W * 0.12 : W * 0.88;
      var lift = throwAnim[s] > 0 ? -30 : Math.sin(t * 3 + s) * 8;
      game.draw.sprite(RIVAL, { o: STYLE.accent[0] }, x, H * 0.17 + lift, 13, { anchor: 'center', alpha: 0.55, flipX: s === 1 });
    }
  }

  function drawPanels() {
    var t = game.time.elapsed;
    for (var i = 0; i < panels.length; i++) {
      var p = panels[i];
      var x = px(p), y = py(p);
      var col = p.own === 1 ? STYLE.main[0] : p.own === 2 ? STYLE.accent[0] : '#fff6de';
      game.draw.rect(x - 7, y - 7, PW + 14, PH + 14, STYLE.main[2]);
      game.draw.rect(x, y, PW, PH, col);
      if (p.prog > 0 && p.own !== 1) {
        // 下からじわっと藍が上がってくる
        var hh = PH * Math.min(1, p.prog);
        game.draw.rect(x, y + PH - hh, PW, hh, STYLE.main[0], 0.75);
        for (var w = 0; w < 4; w++) game.draw.circle(x + 30 + w * 55, y + PH - hh, 18, STYLE.main[0], 0.75);
      }
      // 布の織り目
      game.draw.rect(x, y + PH * 0.33, PW, 4, '#000000', 0.08);
      game.draw.rect(x, y + PH * 0.66, PW, 4, '#000000', 0.08);
      if (p.flash > 0) game.draw.rect(x, y, PW, PH, '#ffffff', p.flash * 2);
    }
    // 飛来する染料(影で着地点を予告)
    for (var s = 0; s < splats.length; s++) {
      var sp = splats[s];
      var k = 1 - sp.t / sp.max;
      var tx = px(sp.p) + PW / 2, ty = py(sp.p) + PH / 2;
      var blink = Math.floor(t * 12) % 2 === 0;
      game.draw.circle(tx, ty, 30 + 70 * k, STYLE.accent[0], blink ? 0.5 : 0.25);
      game.draw.circle(tx, ty, 30 + 70 * k, STYLE.main[2], 0.12);
      var bx = sp.sx + (tx - sp.sx) * k, byy = sp.sy + (ty - sp.sy) * k - Math.sin(Math.PI * k) * 260;
      game.draw.sprite(DROP, { o: STYLE.accent[0] }, bx, byy, 18, { anchor: 'center' });
    }
    if (finger.on) {
      var wig = Math.sin(t * 30) * 8;
      game.draw.sprite(BRUSH, { k: STYLE.main[2], w: '#c98b4f', b: STYLE.main[0] }, finger.x + wig, finger.y - 50, 14, { anchor: 'center' });
    }
    if (freeze) {
      for (var j = 0; j < panels.length; j++) if (panels[j].own === 1) game.draw.rect(px(panels[j]), py(panels[j]), PW, PH, '#ffffff', 0.3 + 0.3 * Math.sin(freeze.t * 30));
    }
  }

  function drawHud() {
    var mine = count(1), rival = count(2);
    txt(mine + ' / ' + panels.length, W * 0.5, H * 0.045, 72, STYLE.main[0]);
    // 目標ライン付きの陣地バー
    var bw = W - 160;
    game.draw.rect(76, H * 0.085 - 4, bw + 8, 34, STYLE.main[2]);
    game.draw.rect(80, H * 0.085, bw * mine / panels.length, 26, STYLE.main[0]);
    game.draw.rect(80 + bw - bw * rival / panels.length, H * 0.085, bw * rival / panels.length, 26, STYLE.accent[0]);
    game.draw.rect(80 + bw * NEEDED / panels.length - 3, H * 0.085 - 12, 6, 50, STYLE.main[1]);
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, H * 0.108, bw * Math.max(0, timeLeft / TIME_LIMIT), 12, low ? '#ff2d55' : STYLE.main[2]);
    txt(Math.ceil(timeLeft) + '', W * 0.9, H * 0.045, 56, low ? '#ff2d55' : STYLE.main[1]);
  }

  function drawOutcome() {
    var mine = count(1);
    game.draw.rect(0, H * 0.33, W, H * 0.26, STYLE.main[2], 0.85);
    txt(won ? 'CLEAR' : 'GAME OVER', W * 0.5, H * 0.39, 100, won ? STYLE.accent[1] : STYLE.accent[0]);
    txt('SCORE ' + score, W * 0.5, H * 0.46, 54, STYLE.main[1]);
    if (!won) txt('あと' + (NEEDED - mine) + '枚!', W * 0.5, H * 0.52, 52, STYLE.bg[0]);
    else if (score > game.best) txt('NEW RECORD', W * 0.5, H * 0.52, 52, STYLE.bg[0]);
    else txt('BEST ' + game.best, W * 0.5, H * 0.52, 46, STYLE.main[1]);
  }

  // ── ATTRACT ゴースト実演(同じrubで塗る) ─────────────────
  var demo = { t: 0, gx: W * 0.5, gy: H * 0.5, target: null, ph: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt || !panels || count(1) >= 9) { initGame(); ready = 0; demo.target = null; }
    if (!demo.target || demo.target.own === 1) {
      var best = null, bd = 1e9;
      for (var i = 0; i < panels.length; i++) {
        var p = panels[i];
        if (p.own === 1) continue;
        var d = Math.hypot(px(p) + PW / 2 - demo.gx, py(p) + PH / 2 - demo.gy) + (p.own === 2 ? 150 : 0);
        if (d < bd) { bd = d; best = p; }
      }
      demo.target = best;
      finger.on = false;
    }
    if (!demo.target) return;
    demo.ph += dt;
    var cx = px(demo.target) + PW / 2, cy = py(demo.target) + PH / 2;
    var tx = cx + Math.sin(demo.ph * 22) * PW * 0.36;
    var ty = cy + Math.cos(demo.ph * 11) * 30;
    var moving = Math.hypot(cx - demo.gx, cy - demo.gy) > PW * 0.45;
    demo.gx += (tx - demo.gx) * Math.min(1, dt * (moving ? 8 : 30));
    demo.gy += (ty - demo.gy) * Math.min(1, dt * (moving ? 8 : 30));
    if (moving) { finger.on = false; return; }
    rub(demo.gx, demo.gy, true);
  }

  function playerRub(x, y) {
    if (state !== S.PLAYING || ready > 0 || ended || freeze) return;
    rub(x, y, false);
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
    if (state !== S.PLAYING || ended) return;
    finger.on = false;
    finger.sdx = 0;
    game.audio.play('se_tap', 0.2);
    game.fx.burst(x, y, { color: STYLE.main[0], count: 5, speed: 150 });
    playerRub(x, y);
  });
  game.onMove(function (x, y) {
    if (state !== S.PLAYING) return;
    if (Math.random() < 0.12) game.fx.burst(x, y, { color: '#ffffff', count: 1, speed: 60 });
    playerRub(x, y);
  });
  game.onRelease(function (x, y) {
    if (state !== S.PLAYING) return;
    if (finger.on) game.audio.play('se_tap', 0.06);
    finger.on = false;
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      stepWorld(dt, true);
      drawBg();
      drawRivals();
      drawPanels();
      game.draw.hand(demo.gx, demo.gy + 30, { press: finger.on, scale: 13 });
      txt(GAME_TITLE, W * 0.5, H * 0.055, 100, STYLE.main[0]);
      txt('HI-SCORE ' + game.best, W * 0.5, H * 0.105, 40, STYLE.main[2]);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W * 0.5, H * 0.92, 52, STYLE.main[1]);
      else txt('INSERT COIN', W * 0.5, H * 0.92, 44, STYLE.main[2]);
      return;
    }
    if (state === S.RESULT) {
      drawBg();
      drawPanels();
      drawOutcome();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W * 0.5, H * 0.92, 42, STYLE.main[1]);
      return;
    }
    if (ended) {
      endWait -= dt;
      drawBg();
      drawRivals();
      drawPanels();
      drawHud();
      drawOutcome();
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { panels: count(1), blocked: blocks };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
      return;
    }
    if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.3);
    } else {
      if (!freeze) {
        timeLeft -= dt;
        if (timeLeft <= 0) {
          timeLeft = 0;
          splats = [];
          finger.on = false;
          var ok = count(1) >= NEEDED;
          freeze = { t: 0.5, done: function () {
            if (ok) game.feedback.good(W * 0.5, H * 0.3, { text: 'CLEAR', color: STYLE.accent[1], count: 36 });
            else game.feedback.bad(W * 0.5, H * 0.3, { text: 'TIME UP' });
            if (ok) score += count(1) * 20;
            endGame(ok);
          } };
        }
      }
      stepWorld(dt, false);
    }
    drawBg();
    drawRivals();
    drawPanels();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W * 0.5, H * 0.45, 120, STYLE.main[1]);
  });

  game.onStart(function () {
    game.audio.melody(
      [['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['C6', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 1], ['F5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 2]],
      { tempo: 160, wave: 'square', volume: 0.045, loop: true, bass: [['C3', 2], ['A2', 2], ['F2', 2], ['G2', 2]] }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);

// J-GC4-0002-slime-cavern-spring.js
// スライムスプリング — 光る粘液パッドを踏み継いで跳ね上がり、洞窟の天井に実る水晶の実を取る
// 操作: 跳ねている最中に画面の左・中・右をタップして次に着地するレーンを選ぶ(乾いた殻パッドと空白は避ける)
// 終わり: 20段目の水晶の実に届けばCLEAR。3回踏み外す/時間切れでGAME OVER
// @mechanic: camera_climb
// @theme: slime_cavern_climb
// 世界観: 菌床の洞窟に住む見習い採集係のカエルが、弾む粘液パッドだけを選んで踏み継ぎ、天井でいちばん高く実った水晶の実をもぎに行く
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達段数・金パッド数・残りタイムのスコア
// スタイル: 2010s FLAT MOBILE

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: 影なしのベタ塗り、丸角、アイコン的な形
  var STYLE = {
    bg: ['#1d3557', '#274c77', '#3a7ca5'],
    main: ['#7ef29d', '#f1faee', '#14213d'],
    accent: ['#ffd166', '#ef476f'],
  };

  var GAME_TITLE = 'SLIME SPRING';
  var TIME_LIMIT = 22;
  var NEEDED = 20;
  var LIVES = 3;
  var ROW_H = 250;
  var LANE_X = [W * 0.2, W * 0.5, W * 0.8];
  var BASE_Y = H * 0.66;
  var BTN_Y = H * 0.885;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var FROG_SIT = [
    '..g..g..',
    '.gwgggw.',
    '.gkgggk.',
    'gggggggg',
    'gyyyyyyg',
    '.gggggg.',
    'gg....gg',
  ];
  var FROG_JUMP = [
    '..g..g..',
    '.gwgggw.',
    '.gkgggk.',
    'gggggggg',
    '.gyyyyg.',
    '..gggg..',
    '.g....g.',
    'g......g',
  ];
  var FROG_PAL = { g: '#5fd068', w: '#ffffff', k: '#14213d', y: '#c9f7a8' };
  var CRYSTAL = [
    '...s....',
    '..cCc...',
    '.cCCCc..',
    'cCCwCCc.',
    '.cCCCc..',
    '..cCc...',
    '...c....',
  ];
  var CRYSTAL_PAL = { s: '#7ef29d', c: '#4cc9f0', C: '#90e0ef', w: '#ffffff' };
  var HEART = ['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..'];
  var SPORE = ['.o.', 'ooo', '.o.'];

  var rows, frog, cam, timeLeft, lives, ready, freeze, ended, endWait, won, score, golds, laneFlash, lastMile, squash;

  function makeRows() {
    rows = [];
    var safe = 1;
    for (var r = 0; r <= NEEDED + 7; r++) {
      var row = [0, 0, 0];
      if (r === 0 || r >= NEEDED) {
        row = [1, 1, 1];
      } else {
        if (r > 2 && Math.random() < 0.72) {
          var opts = [];
          for (var o = 0; o < 3; o++) if (o !== safe) opts.push(o);
          safe = opts[Math.floor(Math.random() * opts.length)];
        }
        row[safe] = (r > 3 && r < NEEDED - 1 && Math.random() < 0.14) ? 3 : 1;
        for (var l = 0; l < 3; l++) {
          if (l === safe) continue;
          var q = Math.random();
          row[l] = q < 0.22 ? 1 : q < 0.66 ? 2 : 0;
        }
      }
      rows.push(row);
    }
  }

  function initGame() {
    makeRows();
    frog = { row: 0, lane: 1, target: 1, k: 0, dur: 0.66, x: LANE_X[1], blink: 0 };
    cam = 0;
    timeLeft = TIME_LIMIT;
    lives = LIVES;
    ready = 0.8;
    freeze = null;
    ended = false;
    endWait = 0;
    won = false;
    score = 0;
    golds = 0;
    laneFlash = [0, 0, 0];
    lastMile = 0;
    squash = 0;
  }

  function rowY(r) { return BASE_Y - (r - cam) * ROW_H; }
  function frogY() { return rowY(frog.row + frog.k) - Math.sin(Math.PI * frog.k) * 130; }

  function txt(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 3, { size: size, color: STYLE.main[2], bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function chooseLane(l, demo) {
    if (ended || freeze) return;
    frog.target = l;
    laneFlash[l] = 0.25;
    if (!demo) game.audio.play('se_tap', 0.35);
    game.fx.burst(LANE_X[l], BTN_Y, { color: STYLE.main[0], count: 6, speed: 220 });
  }

  function startFreeze(x, y, color, done) {
    freeze = { t: 0.45, x: x, y: y, color: color, done: done };
  }

  function land(demo) {
    var nr = frog.row + 1;
    var cell = rows[nr][frog.target];
    var fx = LANE_X[frog.target];
    if (cell === 1 || cell === 3) {
      frog.row = nr;
      frog.lane = frog.target;
      frog.k = 0;
      frog.x = fx;
      frog.dur = 0.66 - 0.14 * Math.min(1, nr / NEEDED);
      squash = 0.12;
      if (!demo) game.audio.play('se_jump', 0.4);
      score += 100;
      if (cell === 3) {
        golds++;
        score += 300;
        rows[nr][frog.target] = 1;
        game.feedback.good(fx, rowY(nr) - 60, { text: 'NICE', color: STYLE.accent[0], sound: demo ? 'se_coin' : 'se_coin' });
      }
      if (!demo && nr % 5 === 0 && nr > lastMile && nr < NEEDED) {
        lastMile = nr;
        game.fx.popup(nr + ' / ' + NEEDED, fx, rowY(nr) - 140, { color: STYLE.accent[0], size: 58 });
        game.audio.play('se_milestone', 0.5);
      }
      if (nr >= NEEDED && !demo) {
        startFreeze(W * 0.5, rowY(NEEDED) - 150, '#ffffff', function () {
          score += Math.round(timeLeft * 50);
          game.feedback.good(W * 0.5, rowY(NEEDED) - 150, { text: 'CLEAR', color: STYLE.accent[0], count: 30 });
          endGame(true);
        });
      }
      return;
    }
    // 乾いた殻 or 空白 → 踏み外し
    var fy = rowY(nr);
    if (cell === 2) {
      rows[nr][frog.target] = 0;
      if (!demo) game.audio.play('se_break', 0.5);
    }
    frog.k = 0;
    frog.x = fx;
    startFreeze(fx, fy, STYLE.accent[1], function () {
      game.feedback.bad(fx, fy, { text: 'MISS' });
      lives--;
      frog.x = LANE_X[frog.lane];
      frog.target = frog.lane;
      frog.blink = 0.6;
      if (lives <= 0 && !demo) endGame(false);
    });
  }

  function stepWorld(dt, demo) {
    for (var i = 0; i < 3; i++) laneFlash[i] = Math.max(0, laneFlash[i] - dt);
    if (squash > 0) squash -= dt;
    if (freeze) {
      freeze.t -= dt;
      if (freeze.t <= 0) { var d = freeze.done; freeze = null; d(); }
      return;
    }
    if (ended) return;
    if (frog.blink > 0) { frog.blink -= dt; return; }
    frog.k += dt / frog.dur;
    frog.x += (LANE_X[frog.target] - frog.x) * Math.min(1, dt * 12);
    if (frog.k >= 1) { frog.k = 1; land(demo); }
    var goal = frog.row + frog.k * 0.6;
    cam += (goal - cam) * Math.min(1, dt * 6);
  }

  function endGame(ok) {
    if (ended) return;
    ended = true;
    won = ok;
    endWait = 1.5;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.6);
  }

  // ── 描画 ────────────────────────────────────────────────
  function drawBg() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.6, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    // 遠景の鍾乳石(カメラの1/4で流れる)
    for (var i = 0; i < 7; i++) {
      var sx = (i * 173 + 40) % W;
      var sy = ((i * 331 + cam * ROW_H * 0.25) % (H + 400)) - 200;
      game.draw.rect(sx, sy, 34, 260, '#20406a', 0.8);
      game.draw.circle(sx + 17, sy + 260, 17, '#20406a', 0.8);
    }
    // 漂う胞子(常時揺れ)
    for (var j = 0; j < 9; j++) {
      var px = (j * 127 + Math.sin(t * 0.8 + j) * 60 + W) % W;
      var py = (j * 211 + t * 40 + cam * 30) % H;
      game.draw.sprite(SPORE, { o: '#7ef29d' }, px, py, 6, { anchor: 'center', alpha: 0.35 });
    }
    game.draw.rect(0, 0, W, H, '#7ef29d', 0.04 + 0.03 * Math.sin(t * 1.7));
  }

  function drawPad(x, y, cell, r) {
    var t = game.time.elapsed;
    if (cell === 0) return;
    var wob = Math.sin(t * 5 + r + x * 0.01) * 4;
    if (cell === 2) {
      var danger = r === frog.row + 1 && Math.floor(t * 8) % 2 === 0;
      game.draw.rect(x - 90, y - 12, 180, 26, danger ? '#b08968' : '#8d6e63');
      game.draw.circle(x - 90, y + 1, 13, '#8d6e63');
      game.draw.circle(x + 90, y + 1, 13, '#8d6e63');
      game.draw.line(x - 40, y - 12, x - 20, y + 12, '#4e342e', 5);
      game.draw.line(x + 10, y - 12, x + 35, y + 10, '#4e342e', 5);
      return;
    }
    var col = cell === 3 ? STYLE.accent[0] : STYLE.main[0];
    game.draw.rect(x - 92, y - 16 + wob, 184, 30, col);
    game.draw.circle(x - 92, y - 1 + wob, 15, col);
    game.draw.circle(x + 92, y - 1 + wob, 15, col);
    game.draw.rect(x - 60, y - 10 + wob, 70, 6, '#ffffff', 0.6);
    game.draw.circle(x + 40, y + 16 + wob, 7, col);
  }

  function drawWorld() {
    var from = Math.max(0, Math.floor(cam) - 2);
    var to = Math.min(rows.length - 1, Math.floor(cam) + 7);
    for (var r = from; r <= to; r++) {
      var y = rowY(r);
      if (y < -60 || y > H + 60) continue;
      for (var l = 0; l < 3; l++) drawPad(LANE_X[l], y, rows[r][l], r);
    }
    // 天井の水晶の実
    var cy = rowY(NEEDED) - 150 + Math.sin(game.time.elapsed * 2) * 10;
    if (cy > -100) {
      game.draw.circle(W * 0.5, cy, 110, '#90e0ef', 0.15 + 0.08 * Math.sin(game.time.elapsed * 3));
      game.draw.sprite(CRYSTAL, CRYSTAL_PAL, W * 0.5, cy, 20, { anchor: 'center' });
    }
    // 着地予定レーンのガイド影
    if (!ended && !freeze && frog.blink <= 0) {
      game.draw.circle(LANE_X[frog.target], rowY(frog.row + 1) + 6, 24, '#ffffff', 0.25);
    }
    var fy = frogY();
    var vis = frog.blink > 0 ? (Math.floor(game.time.elapsed * 14) % 2 === 0) : true;
    if (vis) {
      var art = frog.k > 0.05 && frog.k < 0.95 ? FROG_JUMP : FROG_SIT;
      var px = squash > 0 ? 17 : 15;
      game.draw.sprite(art, FROG_PAL, frog.x, fy - 50, px, { anchor: 'center' });
    }
    if (freeze) {
      var a = 0.5 + 0.5 * Math.sin(freeze.t * 40);
      game.draw.circle(freeze.x, freeze.y, 110 + (0.45 - freeze.t) * 160, freeze.color, 0.35 * a);
      game.draw.circle(freeze.x, freeze.y, 60, '#ffffff', 0.5 * a);
    }
  }

  function drawButtons(active) {
    for (var l = 0; l < 3; l++) {
      var on = l === frog.target;
      var r = 82 + laneFlash[l] * 60;
      game.draw.circle(LANE_X[l], BTN_Y, r, on ? STYLE.main[0] : '#ffffff', active ? (on ? 0.9 : 0.25) : 0.2);
      game.draw.sprite(FROG_SIT, FROG_PAL, LANE_X[l], BTN_Y, 7, { anchor: 'center', alpha: on ? 1 : 0.5 });
    }
  }

  function drawHud() {
    txt(Math.min(frog.row, NEEDED) + ' / ' + NEEDED, W * 0.5, H * 0.05, 64, STYLE.main[1]);
    var bw = W - 160;
    var low = timeLeft < 5 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, H * 0.085, bw, 22, '#14213d', 0.6);
    game.draw.rect(80, H * 0.085, bw * Math.max(0, timeLeft / TIME_LIMIT), 22, low ? STYLE.accent[1] : STYLE.accent[0]);
    for (var i = 0; i < LIVES; i++) {
      game.draw.sprite(HEART, { r: i < lives ? STYLE.accent[1] : '#3d4a63' }, 90 + i * 70, H * 0.125, 10, { anchor: 'center' });
    }
    txt('SCORE ' + score, W * 0.78, H * 0.125, 34, STYLE.main[1]);
  }

  function drawOutcome() {
    game.draw.rect(0, H * 0.3, W, H * 0.3, '#14213d', 0.55);
    txt(won ? 'CLEAR' : 'GAME OVER', W * 0.5, H * 0.38, 96, won ? STYLE.main[0] : STYLE.accent[1]);
    txt('SCORE ' + score, W * 0.5, H * 0.46, 52, STYLE.main[1]);
    if (!won && frog.row < NEEDED) txt('あと' + (NEEDED - frog.row) + '段!', W * 0.5, H * 0.52, 48, STYLE.accent[0]);
    else if (score > game.best) txt('NEW RECORD', W * 0.5, H * 0.52, 48, STYLE.accent[0]);
    else txt('BEST ' + game.best, W * 0.5, H * 0.52, 40, STYLE.main[1]);
  }

  // ── ATTRACT ゴースト実演(実ロジックで遊ぶ) ─────────────────
  var demo = { t: 0, gx: LANE_X[1], gy: BTN_Y, press: false, decided: -1, cycle: 0, pressT: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt || !rows) { initGame(); ready = 0; demo.cycle = 0; demo.decided = -1; }
    if (frog.row >= 7 || lives <= 1) {
      initGame(); ready = 0; demo.cycle++; demo.decided = -1;
    }
    demo.pressT = Math.max(0, demo.pressT - dt);
    if (!freeze && frog.blink <= 0 && frog.k > 0.3 && demo.decided !== frog.row) {
      demo.decided = frog.row;
      var next = rows[frog.row + 1];
      var pick = -1;
      // 3段目では一度わざと殻パッドを選び、失敗の因果を見せる
      if (frog.row === 3 && demo.cycle % 2 === 0) {
        for (var d = 0; d < 3; d++) if (next[d] === 2) pick = d;
      }
      if (pick < 0) {
        var bestD = 9;
        for (var l = 0; l < 3; l++) {
          if ((next[l] === 1 || next[l] === 3) && Math.abs(l - frog.lane) < bestD) { bestD = Math.abs(l - frog.lane); pick = l; }
        }
      }
      if (pick >= 0 && pick !== frog.target) { chooseLane(pick, true); demo.pressT = 0.25; }
      if (pick >= 0) { demo.gx = LANE_X[pick]; }
    }
    demo.gy = BTN_Y + 20;
    demo.press = demo.pressT > 0;
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING;
      initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (ready > 0 || ended) return;
    var lane = x < W / 3 ? 0 : x < (W * 2) / 3 ? 1 : 2;
    if (freeze) { game.audio.play('se_tap', 0.1); return; }
    chooseLane(lane, false);
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      stepWorld(dt, true);
      drawBg();
      drawWorld();
      drawButtons(true);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W * 0.5, H * 0.1, 88, STYLE.accent[0]);
      txt('HI-SCORE ' + game.best, W * 0.5, H * 0.16, 40, STYLE.main[1]);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W * 0.5, H * 0.79, 48, STYLE.accent[0]);
      else txt('INSERT COIN', W * 0.5, H * 0.79, 40, STYLE.main[1]);
      return;
    }
    if (state === S.RESULT) {
      drawBg();
      drawWorld();
      drawOutcome();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W * 0.5, H * 0.94, 40, STYLE.main[1]);
      return;
    }
    // PLAYING
    if (ended) {
      endWait -= dt;
      stepWorld(dt, false);
      drawBg();
      drawWorld();
      drawButtons(false);
      drawHud();
      drawOutcome();
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { rows: Math.min(frog.row, NEEDED), golds: golds, lives: lives };
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
          startFreeze(frog.x, frogY() - 50, STYLE.accent[1], function () {
            game.feedback.bad(frog.x, frogY() - 50, { text: 'TIME UP' });
            endGame(false);
          });
        }
      }
      stepWorld(dt, false);
    }
    drawBg();
    drawWorld();
    drawButtons(true);
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W * 0.5, H * 0.45, 110, STYLE.accent[0]);
  });

  game.onStart(function () {
    game.audio.melody(
      [['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 1], ['D5', 0.5], ['F5', 0.5], ['A5', 0.5], ['F5', 0.5], ['G5', 2]],
      { tempo: 150, wave: 'triangle', volume: 0.05, loop: true, bass: [['C3', 2], ['A2', 2], ['D3', 2], ['G2', 2]] }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);

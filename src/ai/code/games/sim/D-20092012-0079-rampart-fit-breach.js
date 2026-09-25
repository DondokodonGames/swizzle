// D-20092012-0079-rampart-fit-breach.js
// ランパート・フィットブリーチ — 崩れた防壁の欠けた形に合う建材を選んで埋め、砦を完成させて撃破する
// 操作: 壁の欠け穴と同じ形の建材を3択からタップして埋める。全部埋まれば自動で撃破演出
// 終わり: 規定数の欠け穴をすべて正しい建材で埋めれば成功。形違いを選ぶ/時間切れで失敗
// @mechanic: gap_fit
// @theme: rampart_construction_crew
// 世界観: 前線に急ごしらえの防壁を築く建設班。崩れた壁の欠け穴に合う建材を素早く選び、完成させた砦で敵陣を撃破する
// 残るもの: 正誤(CLEAR/GAME OVER) + 埋めた欠け穴数
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体的な太いブロック、上面/側面で明暗差
  var STYLE = { bg: ['#3a2e46', '#241a30'], main: ['#8a6a4a', '#5a4636'], accent: ['#ffb454', '#5adf8a'] };
  var C = {
    sky1: '#4a3a5a', sky2: '#241a30', wallLite: '#8a6a4a', wallDark: '#5a4636', wallShadow: '#3a2c22',
    hole: '#160f0c', good: '#5adf8a', bad: '#ff4d5e', gold: '#ffb454', white: '#fff3e0', ink: '#140d09',
  };

  var GAME_TITLE = 'RAMPART FIT';
  var TOTAL = 5;
  var CX = W * 0.5, WALL_Y = H * 0.42;
  var PIECE_X = [W * 0.22, W * 0.5, W * 0.78];
  var PIECE_Y = H * 0.86;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SHAPES = [
    ['####', '####', '####'],
    ['..##', '.###', '####'],
    ['##..', '####', '##.#'],
  ];

  var round, want, choices, sealed, roundT, roundLimit, done, endWait, finished;
  var ready, hitStop, shake, milestoneShown, breachT;

  function newRound() {
    want = Math.floor(Math.random() * SHAPES.length);
    var others = [];
    for (var i = 0; i < SHAPES.length; i++) if (i !== want) others.push(i);
    others.sort(function() { return Math.random() - 0.5; });
    var picks = [want, others[0], others[1]];
    picks.sort(function() { return Math.random() - 0.5; });
    choices = picks;
    roundT = 0; roundLimit = Math.max(1.8, 2.8 - round * 0.08);
  }

  function initGame() {
    round = 0; sealed = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false; breachT = -1;
    newRound();
  }

  function pickPiece(idx) {
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    game.audio.play('se_tap', 0.2);
    if (choices[idx] === want) {
      sealed++;
      hitStop = 0.12;
      game.feedback.good(PIECE_X[idx], PIECE_Y, { text: 'GOOD' });
      game.fx.burst(CX, WALL_Y, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_break', 0.4);
      if (!milestoneShown && sealed === Math.ceil(TOTAL / 2)) {
        milestoneShown = true;
        game.fx.popup(sealed + ' / ' + TOTAL, CX, WALL_Y - 200, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.4);
      }
      if (sealed >= TOTAL) {
        ok = true; finished = true; breachT = 0;
        return;
      }
      round++;
      newRound();
    } else {
      hitStop = 0.32; shake = 0.28;
      game.feedback.bad(PIECE_X[idx], PIECE_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || breachT >= 0) return;
    for (var i = 0; i < 3; i++) {
      if (Math.hypot(x - PIECE_X[i], y - PIECE_Y) < 88) { pickPiece(i); return; }
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function bg(elapsed) {
    game.draw.gradient(0, H, [[0, C.sky1], [1, C.sky2]]);
    game.draw.rect(0, 0, W, H, C.white, 0.02 + 0.02 * Math.sin(elapsed * 1.3));
  }

  function drawWall(bob) {
    var wx = CX - 220, wy = WALL_Y - 140, ww = 440, wh = 280;
    var cols = 8, rows = 5;
    var cw = ww / cols, chh = wh / rows;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var lit = (r + c) % 2 === 0;
        game.draw.rect(wx + c * cw, wy + r * chh, cw - 3, chh - 3, lit ? C.wallLite : C.wallDark);
      }
    }
    // 欠け穴(埋まっていなければ表示)
    if (!finished || breachT < 0) {
      var hx = wx + ww * 0.5 - 60, hy = wy + wh * 0.5 - 45 + Math.sin(bob * 1.5) * 3;
      if (sealed < TOTAL) {
        game.draw.rect(hx, hy, 120, 90, C.hole);
      }
    }
    game.draw.rect(wx, wy + wh, ww, 14, C.wallShadow, 0.6);
  }

  function drawPieceIcon(shapeIdx, x, y, scale, fade) {
    game.draw.circle(x, y + Math.sin(game.time.elapsed * 2 + x) * 5, 78, C.white, fade ? 0.3 : 0.92);
    game.draw.sprite(SHAPES[shapeIdx], { '#': C.wallLite }, x, y, 14 * scale, { anchor: 'center' });
  }

  function drawChoices() {
    for (var i = 0; i < 3; i++) drawPieceIcon(choices[i], PIECE_X[i], PIECE_Y, 1, false);
  }

  function drawBreach(t) {
    var p = Math.min(1, t / 1.0);
    game.draw.circle(CX, WALL_Y, 40 + p * 260, C.gold, 0.35 * (1 - p));
    txt('CLEAR', CX, WALL_Y, 60, C.gold);
  }

  var demo = { t: 0, gx: PIECE_X[1], gy: PIECE_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { newRound(); sealed = 0; }
    if (cyc < 2.2) {
      var correctIdx = choices.indexOf(want);
      var tx = PIECE_X[correctIdx], ty = PIECE_Y;
      demo.gx += (tx - demo.gx) * Math.min(1, dt * 6);
      demo.gy += (ty - demo.gy) * Math.min(1, dt * 6);
      demo.press = cyc > 1.8;
      if (cyc > 1.95 && !demo._done) { demo._done = true; sealed++; }
    } else {
      demo._done = false;
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    var elapsed = game.time.elapsed;
    if (state === S.ATTRACT) {
      bg(elapsed);
      stepDemo(dt);
      drawWall(elapsed);
      drawChoices();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 38, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(elapsed);
      drawWall(elapsed);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt(sealed + ' / ' + TOTAL, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + (TOTAL - sealed) + '!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (breachT >= 0) {
      breachT += dt;
      if (breachT >= 1.1) { finish(); breachT = -2; }
    } else if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(sealed, { sealed: sealed, total: TOTAL }); else game.end.failure({ sealed: sealed, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundT += dt;
      if (roundT >= roundLimit) {
        ok = false; finished = true; hitStop = 0.3; shake = 0.25;
        game.feedback.bad(CX, WALL_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg(elapsed);
    drawWall(elapsed);
    if (breachT >= 0) drawBreach(breachT);
    else if (!finished) drawChoices();

    txt(sealed + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.4);
    game.draw.rect(60, 150, (W - 120) * (sealed / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['F3', 0.4], ['A3', 0.4], ['C4', 0.4], ['F4', 0.8]], { tempo: 128, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

// J-N6434-0029-gorge-rockfall-tug.js
// 峡谷の落石綱引き — 連打で綱を引き寄せるが、崖から岩が落ちる合図の間は手を止めて綱をたるませる
// 操作: タップで綱を引く。崖の上から砂がこぼれ岩が落ちてくる間は触らない(張った綱に岩が当たると切れる)(社内メモ。画面には出さない)
// 終わり: 目印を手前の線まで引き寄せれば成功。張った綱に岩が当たる/引き負ける/時間切れで失敗
// @mechanic: freeze
// @theme: gorge_rockfall_tug
// 世界観: 墨絵の峡谷の綱引き祭りで、若いアナグマの石工が向こう岸の岩の大男の影と綱を引き合い、崖から落ちる岩の合図の間だけ手を止めて綱を守る
// 残るもの: 正誤(CLEAR/GAME OVER) + 引き寄せ量・やり過ごした落石の数・残り秒
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白黒2値。階調はディザ(市松)で作り、線の太さで語る
  var STYLE = {
    bg: ['#f4f1e8', '#e2dccb', '#111111'],
    main: ['#111111', '#f4f1e8', '#111111'],
    accent: ['#111111', '#f4f1e8'],
  };
  var C = { paper: STYLE.bg[0], paper2: STYLE.bg[1], ink: STYLE.main[0] };

  var GAME_TITLE = 'ROCK TUG';
  var TIME_LIMIT = 14;
  var WIN_POS = 12, LOSE_POS = -9;
  var PULL = 0.8, RIVAL_PULL = 1.0;
  var TAUT_T = 0.7;            // 最後に引いてからこの秒数は綱が張っている
  var WARN_T = 0.85, FALL_T = 0.5;
  var ROPE_Y = H * 0.52;
  var UNIT = 30;               // 目印 1 単位あたりの px

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // ── スプライト(k=墨, w=紙) ───────────────────────────
  var BADGER = [
    ['..kk..kk..', '.kwwkkwwk.', '.kwkwwkwk.', '.kkwwwwkk.', '..kwkkwk..', '.kkkkkkkk.', 'kk.kkkk.kk', '...k..k...', '..kk..kk..'],
    ['..kk..kk..', '.kwwkkwwk.', '.kwkwwkwk.', '.kkwwwwkk.', '..kwkkwk..', 'kkkkkkkkk.', '...kkkk.kk', '..k....k..', '.kk....kk.'],
  ];
  var GIANT = ['...kkkk...', '..kkkkkk..', '..kwkkwk..', '..kkkkkk..', '.kkkkkkkk.', 'kkkkkkkkkk', 'kk.kkkk.kk', 'kk.kkkk.kk', '...kkkk...', '...kk.kk..', '..kkk.kkk.'];
  var ROCK = ['..kkkk..', '.kkwkkk.', 'kkwkkkkk', 'kkkkkwkk', 'kkkkkkkk', '.kkkkkk.', '..kkkk..'];
  var FLAG = ['kkkk', 'kwwk', 'kkkk', 'k...', 'k...'];
  var PEBBLE = ['kk', 'kk'];
  var PINE = ['..k..', '.kkk.', 'kkkkk', '..k..'];
  var BANG = ['kk', 'kk', 'kk', '..', 'kk'];
  var DITHER = ['k.k.k.k.', '.k.k.k.k'];

  // ── 状態 ─────────────────────────────────────────
  var pos, lastPull, runT, timeLeft, pulls, rocks, dodged, nextRock, rock, ready, phase, stopT, doneT, ok, endReason;
  var snapT, rivalFlinch, halfShown, pullAnim;

  function txt(str, x, y, sz, inverted, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: inverted ? C.ink : C.paper, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: inverted ? C.paper : C.ink, bold: true, align: align || 'center' });
  }

  function initGame(demoMode) {
    pos = 0; lastPull = -9; runT = 0; timeLeft = TIME_LIMIT; pulls = 0; rocks = 0; dodged = 0;
    nextRock = 1.6 + Math.random() * 0.6; rock = null;
    ready = demoMode ? 0 : 0.8; phase = demoMode ? 'play' : 'ready';
    stopT = 0; doneT = 0; ok = false; endReason = ''; snapT = 0; rivalFlinch = 0; halfShown = false; pullAnim = 0;
  }

  function taut() { return runT - lastPull < TAUT_T; }

  // 綱を引く(プレイヤーもデモAIも共通)
  function pull(live) {
    if (phase !== 'play') return;
    lastPull = runT; pulls++; pos += PULL; pullAnim = 0.12;
    var fx = W / 2 - pos * UNIT;
    if (live) {
      game.audio.tone(rock ? 'C3' : 'G3', 0.05, { wave: 'square', volume: 0.07 });
      game.fx.burst(W * 0.2, ROPE_Y, { color: C.ink, count: 3, speed: 120 });
      if (!halfShown && pos >= WIN_POS / 2) {
        halfShown = true;
        game.audio.play('se_milestone', 0.4);
        game.fx.popup(Math.round(pos / WIN_POS * 100) + '%', fx, ROPE_Y - 160, { color: C.ink, size: 60 });
      }
    }
  }

  function stepWorld(dt, live) {
    if (pullAnim > 0) pullAnim -= dt;
    if (rivalFlinch > 0) rivalFlinch -= dt;
    if (snapT > 0) snapT += dt;
    if (phase !== 'play') return;
    runT += dt;
    if (live) timeLeft = Math.max(0, TIME_LIMIT - runT);
    // 岩の大男は休まず引く(落石をやり過ごした直後はよろける)
    if (rivalFlinch <= 0) pos -= RIVAL_PULL * dt * (1 + runT * 0.03);

    // 落石: 予告(砂がこぼれる+地鳴り) → 落下 → 綱の高さで判定
    if (!rock) {
      nextRock -= dt;
      if (nextRock <= 0) {
        rock = { x: W / 2 + (Math.random() * 2 - 1) * 110, t: 0, stage: 'warn' };
        rocks++;
        if (live) game.audio.tone('D2', WARN_T, { wave: 'sawtooth', volume: 0.08, slide: -20 });
      }
    } else {
      rock.t += dt;
      if (rock.stage === 'warn' && rock.t >= WARN_T) { rock.stage = 'fall'; rock.t = 0; if (live) game.audio.tone('A4', 0.3, { wave: 'triangle', volume: 0.08, slide: -300 }); }
      else if (rock.stage === 'fall' && rock.t >= FALL_T) {
        if (taut()) {
          // 張った綱に直撃 → 綱が切れる
          phase = 'stop'; stopT = 0.6; ok = false; endReason = 'snap'; snapT = 0.001;
          if (live) {
            game.audio.stopBgm();
            game.audio.play('se_break', 0.6);
            game.feedback.bad(rock.x, ROPE_Y - 120, { text: 'MISS', color: C.ink, flashColor: '#ffffff', shake: 16 });
          } else game.fx.burst(rock.x, ROPE_Y, { color: C.ink, count: 16, speed: 280 });
          return;
        }
        // たるんだ綱で弾んで向こう岸へ → 大男がよろける
        dodged++; rivalFlinch = 0.8; pos += 1.2;
        rock.stage = 'bounce'; rock.t = 0;
        if (live) game.feedback.good(rock.x, ROPE_Y - 140, { text: 'NICE', color: C.ink, size: 56, count: 12 });
        else game.fx.burst(rock.x, ROPE_Y, { color: C.ink, count: 10, speed: 200 });
      } else if (rock.stage === 'bounce' && rock.t >= 0.6) {
        rock = null;
        nextRock = Math.max(1.1, 2.3 - runT * 0.08) + Math.random() * 0.7;
      }
    }

    if (pos >= WIN_POS) {
      pos = WIN_POS; phase = 'stop'; stopT = 0.6; ok = true; endReason = 'clear';
      if (live) {
        game.audio.stopBgm();
        game.feedback.good(W * 0.25, ROPE_Y - 200, { text: 'CLEAR', color: C.ink, size: 90, count: 30 });
        game.audio.play('se_success', 0.55);
      }
      return;
    }
    if (pos <= LOSE_POS) {
      pos = LOSE_POS; phase = 'stop'; stopT = 0.6; ok = false; endReason = 'lost';
      if (live) {
        game.audio.stopBgm();
        game.feedback.bad(W * 0.2, ROPE_Y - 160, { text: 'MISS', color: C.ink, shake: 12 });
        game.audio.play('se_failure', 0.5);
      }
      return;
    }
    if (live && timeLeft <= 0) {
      phase = 'stop'; stopT = 0.6; ok = false; endReason = 'time';
      game.audio.stopBgm();
      game.feedback.bad(W / 2, ROPE_Y - 160, { text: 'TIME UP', color: C.ink, shake: 8 });
      game.audio.play('se_failure', 0.5);
    }
  }

  // ── 描画 ─────────────────────────────────────────
  function drawBack() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.paper], [1, C.paper2]]);
    game.draw.rect(0, 0, W, H, C.ink, 0.02 + 0.02 * Math.sin(t * 1.3));
    // 崖の張り出し(上)と両岸(墨のベタ + ディザの陰)
    game.draw.rect(W * 0.28, 230, W * 0.44, 40, C.ink);
    for (var i = 0; i < 6; i++) game.draw.sprite(DITHER, { k: C.ink }, W * 0.30 + i * 72, 286, 9, { alpha: 0.6 });
    game.draw.rect(0, ROPE_Y + 60, W * 0.24, H * 0.26, C.ink);
    game.draw.rect(W * 0.76, ROPE_Y + 60, W * 0.24, H * 0.26, C.ink);
    for (var y = ROPE_Y + 90; y < H * 0.76; y += 40) game.draw.sprite(DITHER, { k: C.ink }, W * 0.24, y, 8, { alpha: 0.5 });
    // 遠景の松(揺れる)
    for (var p = 0; p < 4; p++) {
      game.draw.sprite(PINE, { k: C.ink }, 90 + p * 300 + Math.sin(t * 1.2 + p) * 8, 330 + (p % 2) * 40, 14, { anchor: 'center', alpha: 0.35 });
    }
    // 谷底の霧(ディザ帯)
    for (var q = 0; q < 8; q++) game.draw.sprite(DITHER, { k: C.ink }, W * 0.26 + ((q * 70 + t * 30) % (W * 0.48)), H * 0.74, 6, { alpha: 0.25 });
    // 勝ちの線(手前の岸)と負けの線
    game.draw.rect(W / 2 - WIN_POS * UNIT - 4, ROPE_Y - 80, 8, 160, C.ink);
    game.draw.rect(W / 2 - LOSE_POS * UNIT - 2, ROPE_Y - 50, 4, 100, C.ink);
  }

  function drawRope(highlight) {
    var t = game.time.elapsed;
    var left = W * 0.16, right = W * 0.84;
    var isTaut = taut() && phase === 'play';
    if (snapT > 0) {
      // 切れた綱: 岩の位置で2本に垂れ下がる
      var rx = rock ? rock.x : W / 2;
      game.draw.line(left, ROPE_Y, rx - 20, ROPE_Y + 120, C.ink, 8);
      game.draw.line(rx + 20, ROPE_Y + 140, right, ROPE_Y, C.ink, 8);
    } else if (isTaut) {
      game.draw.line(left, ROPE_Y, right, ROPE_Y, C.ink, 14);
      game.draw.line(left, ROPE_Y - 3, right, ROPE_Y - 3, C.paper, 3);
    } else {
      // たるんだ綱(放物線を8本の線分で)
      var sag = 70 + Math.sin(t * 3) * 6;
      var px = left, py = ROPE_Y;
      for (var i = 1; i <= 8; i++) {
        var u = i / 8;
        var nx = left + (right - left) * u, ny = ROPE_Y + sag * 4 * u * (1 - u);
        game.draw.line(px, py, nx, ny, C.ink, 8);
        px = nx; py = ny;
      }
    }
    // 目印の旗
    var fx = W / 2 - pos * UNIT;
    var fy = isTaut || snapT > 0 ? ROPE_Y : ROPE_Y + 60 * (1 - Math.pow((fx - W / 2) / (W * 0.34), 2));
    game.draw.sprite(FLAG, { k: C.ink, w: C.paper }, fx + 18, fy - 50, 12, { anchor: 'center' });
    if (highlight) game.draw.circle(rock ? rock.x : fx, ROPE_Y, 170, C.ink, 0.15 + 0.15 * Math.sin(t * 30));
  }

  function drawRock() {
    if (!rock) return;
    var t = game.time.elapsed;
    if (rock.stage === 'warn') {
      // 予告: 崖の縁からこぼれる小石 + 点滅する「!」 + 張り出しの震え
      var shake = Math.sin(t * 60) * 5;
      game.draw.rect(rock.x - 60 + shake, 230, 120, 40, C.ink);
      for (var i = 0; i < 4; i++) {
        var py = 290 + ((rock.t * 500 + i * 80) % (ROPE_Y - 300));
        game.draw.sprite(PEBBLE, { k: C.ink }, rock.x + (i - 1.5) * 26, py, 6, { anchor: 'center' });
      }
      if (Math.floor(t * 10) % 2 === 0) game.draw.sprite(BANG, { k: C.ink }, rock.x, 380, 14, { anchor: 'center' });
      game.draw.sprite(ROCK, { k: C.ink, w: C.paper }, rock.x + shake, 200, 16, { anchor: 'center' });
      // 落下予定地点の影
      game.draw.circle(rock.x, ROPE_Y, 40 + 30 * (rock.t / WARN_T), C.ink, 0.2);
    } else if (rock.stage === 'fall' && snapT <= 0) {
      var p = rock.t / FALL_T;
      var ry = 200 + (ROPE_Y - 60 - 200) * p * p;
      game.draw.sprite(ROCK, { k: C.ink, w: C.paper }, rock.x, ry, 16, { anchor: 'center' });
      game.draw.circle(rock.x, ROPE_Y, 70, C.ink, 0.25);
    } else if (rock.stage === 'bounce') {
      var q = rock.t / 0.6;
      game.draw.sprite(ROCK, { k: C.ink, w: C.paper }, rock.x + q * 380, ROPE_Y - 60 - Math.sin(q * Math.PI) * 220 + q * 200, 16, { anchor: 'center' });
    }
    if (snapT > 0) game.draw.sprite(ROCK, { k: C.ink, w: C.paper }, rock.x, ROPE_Y - 40 + Math.min(300, snapT * 600), 20, { anchor: 'center' });
  }

  function drawPullers() {
    var t = game.time.elapsed;
    var f = pullAnim > 0 ? 1 : 0;
    var lean = pullAnim > 0 ? -16 : Math.sin(t * 3) * 6;
    var sad = phase !== 'play' && !ok && endReason !== '' && endReason !== 'clear';
    game.draw.sprite(BADGER[f], { k: C.ink, w: C.paper }, W * 0.11 + lean, ROPE_Y - 10 + Math.sin(t * 5) * 4, 16, { anchor: 'center', flipY: sad && snapT > 0.3 });
    // 向こう岸の大男(影)
    var flinch = rivalFlinch > 0 ? Math.sin(t * 40) * 14 : 0;
    game.draw.sprite(GIANT, { k: C.ink, w: C.paper }, W * 0.90 + flinch + Math.sin(t * 1.5) * 6, ROPE_Y - 70, 22, { anchor: 'center', alpha: 0.85 });
  }

  function drawPad() {
    // 親指ゾーン: 綱を握る拳のボタン(落石中は墨で塗りつぶされ「止まれ」を示す)
    var t = game.time.elapsed;
    var danger = rock && (rock.stage === 'warn' || rock.stage === 'fall');
    var by = H * 0.87;
    game.draw.circle(W / 2, by, 150, C.ink);
    game.draw.circle(W / 2, by, 136, danger ? C.ink : C.paper);
    if (danger) {
      for (var i = 0; i < 4; i++) game.draw.sprite(DITHER, { k: C.paper }, W / 2 - 90, by - 80 + i * 40, 8, { alpha: Math.floor(t * 10) % 2 ? 0.8 : 0.3 });
      game.draw.sprite(ROCK, { k: C.paper, w: C.ink }, W / 2, by, 12, { anchor: 'center' });
    } else {
      game.draw.line(W / 2 - 110, by, W / 2 + 110, by, C.ink, 12);
      game.draw.sprite(BADGER[pullAnim > 0 ? 1 : 0], { k: C.ink, w: C.paper }, W / 2, by - 10 + (pullAnim > 0 ? 8 : 0), 9, { anchor: 'center' });
    }
  }

  function drawHud() {
    txt(Math.max(0, Math.round(pos / WIN_POS * 100)) + '%', W / 2, 64, 54, false);
    // 綱引きメーター(中央=0、左端=勝ち)
    var bx = 80, bw = W - 160, mid = bx + bw / 2;
    game.draw.rect(bx, 118, bw, 18, C.ink);
    game.draw.rect(bx + 3, 121, bw - 6, 12, C.paper);
    var span = WIN_POS - LOSE_POS;
    var mx = bx + bw * ((WIN_POS - pos) / span);
    game.draw.rect(mx - 6, 108, 12, 38, C.ink);
    game.draw.rect(bx, 108, 6, 38, C.ink);
    game.draw.rect(mid, 114, 2, 26, C.ink);
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(bx, 164, bw, 12, C.ink, low ? 0.3 : 1);
    game.draw.rect(bx + 2, 166, (bw - 4) * (1 - timeLeft / TIME_LIMIT), 8, C.paper);
    for (var i = 0; i < dodged && i < 8; i++) game.draw.sprite(ROCK, { k: C.ink, w: C.paper }, 110 + i * 50, 210, 4, { anchor: 'center' });
  }

  function drawScene(highlight) {
    drawBack();
    drawPullers();
    drawRope(highlight);
    drawRock();
    drawPad();
  }

  function drawResult() {
    game.draw.rect(0, H * 0.27, W, H * 0.16, C.ink, 0.9);
    if (ok) {
      txt('CLEAR', W / 2, H * 0.31, 100, true);
      txt(timeLeft.toFixed(1) + '秒', W / 2, H * 0.38, 44, true);
    } else {
      txt(endReason === 'time' ? 'TIME UP' : 'GAME OVER', W / 2, H * 0.31, 90, true);
      txt('あと' + Math.max(1, Math.round((WIN_POS - pos) / WIN_POS * 100)) + '%!', W / 2, H * 0.38, 44, true);
    }
    txt('BEST ' + (game.best > 0 ? game.best : 0), W / 2, H * 0.455, 34, false);
    if (ok && calcScore() > game.best) txt('NEW RECORD', W / 2, H * 0.24, 52, false);
  }

  function calcScore() { return dodged * 100 + Math.round(timeLeft * 50); }

  // ── 入力 ─────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin');
      state = S.PLAYING; initGame(false); startMusic();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(true); demo.t = 0; startMusic(); return; }
    if (phase === 'play') pull(true);
    else game.audio.play('se_tap', 0.08);
  });

  // ── ATTRACT デモ: AIが同じ pull を連打し、落石の合図で止まる。2つ目の岩ではわざと引き続けて綱を切る ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.87, press: false, pressT: 0, gap: 0, failRock: 2 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 9;
    if (cyc < dt || demo.t <= dt) { initGame(true); nextRock = 1.0; demo.failRock = Math.floor(demo.t / 9) % 2 === 0 ? 3 : 2; }
    if (phase === 'play') {
      var danger = rock && (rock.stage === 'warn' || rock.stage === 'fall');
      var react = danger && (rock.stage === 'fall' || rock.t > 0.2);
      var reckless = rock && rocks === demo.failRock;
      demo.gap -= dt;
      if ((!react || reckless) && demo.gap <= 0) { pull(false); demo.pressT = 0.08; demo.gap = 0.15 + Math.random() * 0.06; }
      if (pos > WIN_POS - 2) pos = 2;
    } else if (snapT > 1.2 || (phase === 'stop' && ok)) {
      initGame(true); nextRock = 1.0; demo.failRock = 99;
    }
    if (demo.pressT > 0) demo.pressT -= dt;
    demo.press = demo.pressT > 0;
    stepWorld(dt, false);
  }

  function startMusic() {
    game.audio.melody([
      ['A3', 1], ['C4', 0.5], ['D4', 0.5], ['E4', 1], ['D4', 0.5], ['C4', 0.5],
      ['A3', 1], ['G3', 0.5], ['A3', 0.5], ['C4', 1.5], [null, 0.5],
    ], { tempo: 120, wave: 'triangle', volume: 0.07, loop: true, bass: true });
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (pos === undefined) initGame(true);
      stepDemo(dt);
      drawScene(snapT > 0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.06, 84, false);
      txt('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, H * 0.105, 34, false);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 46, false);
      else txt('INSERT COIN', W / 2, H * 0.965, 40, false);
      return;
    }

    if (state === S.RESULT) {
      drawScene(!ok);
      drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, false);
      return;
    }

    // PLAYING
    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.4); }
    } else if (phase === 'stop') {
      stopT -= dt;
      if (stopT <= 0) { phase = 'done'; doneT = 1.4; }
    } else if (phase === 'done') {
      doneT -= dt;
      if (doneT <= 0) {
        state = S.RESULT;
        var stats = { pull: Math.round(pos / WIN_POS * 100), rocksDodged: dodged, pulls: pulls };
        if (ok) game.end.success(calcScore(), stats);
        else game.end.failure(stats);
      }
    }
    stepWorld(dt, true);

    drawScene((phase === 'stop' || phase === 'done') && !ok);
    drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 100, false);
    if (phase === 'done') drawResult();
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
    demo.t = 0;
    startMusic();
  });
})(game);

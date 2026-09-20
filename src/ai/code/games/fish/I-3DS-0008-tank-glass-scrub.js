// I-3DS-0008-tank-glass-scrub.js
// タンクシャイン — 水族館の夜間清掃員が曇った水槽ガラスをこすって魚を見えるようにする
// 操作: 曇った部分を指で素早く往復させてこする。次々出る曇りを制限時間内に全部落とす
// 終わり: 時間内に全ての曇りを落とせば成功。落とし切れず時間切れなら失敗
// @mechanic: rub
// @theme: aquarium_glass_scrub
// 世界観: 閉館後の水族館、夜間清掃員が大水槽の曇ったガラスをこすり、中を泳ぐ魚が見えるまで磨き上げる
// 残るもの: 正誤(CLEAR/TIME UP) + 磨き上げた枚数
// スタイル: 90s HANDHELD COLOR
(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 淡い彩度低めのパステル+濃いアウトライン
  var C = {
    bg: '#2b5f7a', bg2: '#173a4c', water: '#1f4d63', grime: '#8a9a7a', grimeEdge: '#5a6a4e',
    fish: '#ffb347', fishFin: '#ff8a3d', good: '#7dffb0', bad: '#ff6b6b', gold: '#ffe066',
    white: '#f4f7f2', ink: '#0e1d24',
  };

  var GAME_TITLE = 'TANK SHINE';
  var TOTAL = 4;
  var TIME_LIMIT = 12;
  var RUB_NEED = [120, 150, 180, 210]; // 段階的に必要量が増える(物量プレッシャー)

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var SPOTS = [
    { x: W * 0.32, y: H * 0.30, r: 130 },
    { x: W * 0.68, y: H * 0.38, r: 140 },
    { x: W * 0.40, y: H * 0.52, r: 150 },
    { x: W * 0.62, y: H * 0.62, r: 160 },
  ];

  var cleared, cleanAmt, cur, timeLeft, lastX, lastY, hasLast;
  var done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FISH_A = ['..###.', '#####.', '.####.', '..##..'];
  var FISH_B = ['..###.', '######', '.####.', '..#...'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [0.6, C.bg], [1, C.water]]);
    for (var i = 0; i < 5; i++) {
      var yy = ((game.time.elapsed * 40 + i * 210) % (H + 200)) - 100;
      game.draw.circle(W * (0.15 + (i % 3) * 0.35), yy, 10 + i * 3, '#ffffff18');
    }
  }

  function drawFish(t) {
    var wag = Math.sin(t * 4) > 0;
    game.draw.sprite(wag ? FISH_A : FISH_B, { '#': C.fish }, W * 0.5, H * 0.42, 22, { anchor: 'center' });
  }

  function drawSpot(sp, i) {
    if (cleared[i]) return;
    var amt = Math.min(1, cleanAmt[i] / RUB_NEED[i]);
    var alpha = 0.75 * (1 - amt * 0.9);
    game.draw.circle(sp.x, sp.y, sp.r, C.grimeEdge, alpha * 0.5);
    game.draw.circle(sp.x, sp.y, sp.r * 0.86, C.grime, alpha);
    // 進捗を横ストライプで見せる(磨けた部分ほど水面反射のストライプが透ける)
    for (var s = 0; s < 5; s++) {
      if (s / 5 < amt) {
        game.draw.rect(sp.x - sp.r, sp.y - sp.r + s * (sp.r * 2 / 5), sp.r * 2, 6, '#ffffff30');
      }
    }
  }

  function initGame() {
    cleared = [false, false, false, false];
    cleanAmt = [0, 0, 0, 0];
    cur = 0; timeLeft = TIME_LIMIT; hasLast = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function rubAt(x, y) {
    if (done || ready > 0 || finished) return;
    if (cur >= TOTAL) return;
    var sp = SPOTS[cur];
    var d = Math.hypot(x - sp.x, y - sp.y);
    if (d > sp.r) { hasLast = false; return; }
    if (hasLast) {
      var move = Math.hypot(x - lastX, y - lastY);
      cleanAmt[cur] += move;
      if (cleanAmt[cur] >= RUB_NEED[cur]) {
        cleared[cur] = true;
        game.feedback.good(sp.x, sp.y, { text: 'CLEAR', color: C.good });
        game.fx.burst(sp.x, sp.y, { color: C.gold, count: 14, speed: 300 });
        game.audio.play('se_coin', 0.4);
        cur++;
        hasLast = false;
        if (cur === Math.ceil(TOTAL / 2)) {
          game.fx.popup('HALFWAY!', W / 2, H * 0.24, { color: C.gold, size: 40 });
          game.audio.play('se_milestone', 0.4);
        }
        if (cur >= TOTAL) {
          ok = true; finished = true; hitStop = 0.15;
          game.audio.play('se_success', 0.5);
          finish();
        }
        return;
      }
    }
    lastX = x; lastY = y; hasLast = true;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.04); hasLast = false; rubAt(x, y); } });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING) return;
    rubAt(x, y);
    if (Math.random() < 0.06) game.audio.play('se_tap', 0.02);
  });
  game.onRelease(function() { hasLast = false; });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.4);
    endWait = 1.2;
  }

  var demo = { t: 0, gx: 0, gy: 0, press: false, phase: 0, cx: 0, cy: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) {
      cleared = [false, false, false, false];
      cleanAmt = [0, 0, 0, 0];
      cur = 0;
    }
    var sp = SPOTS[0];
    var p = Math.min(1, cyc / 2.4);
    cleanAmt[0] = p * RUB_NEED[0];
    cleared[0] = p >= 1;
    var wob = Math.sin(cyc * 14) * sp.r * 0.55;
    demo.gx = sp.x + wob; demo.gy = sp.y + Math.cos(cyc * 6) * sp.r * 0.25;
    demo.press = cyc < 2.4;
    if (p >= 1 && demo.phase === 0) { demo.phase = 1; game.audio.play('se_coin', 0.2); }
    if (cyc < dt) demo.phase = 0;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (cleared === undefined) initGame();
      bg();
      drawFish(game.time.elapsed);
      stepDemo(dt);
      for (var i = 0; i < TOTAL; i++) drawSpot(SPOTS[i], i);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 42, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawFish(game.time.elapsed);
      for (var j = 0; j < TOTAL; j++) drawSpot(SPOTS[j], j);
      txt(ok ? 'CLEAR' : 'TIME UP', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(cur + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - cur) + '枚!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cur, { cleared: cur, total: TOTAL });
        else game.end.failure({ cleared: cur, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; ok = false; finished = true; hitStop = 0.3;
        game.feedback.bad(SPOTS[cur] ? SPOTS[cur].x : W / 2, SPOTS[cur] ? SPOTS[cur].y : H / 2, { text: 'TIME UP' });
        shake = 0.3;
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawFish(game.time.elapsed);
    for (var k = 0; k < TOTAL; k++) drawSpot(SPOTS[k], k);

    txt(cur + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.4], ['A4', 0.4], ['F4', 0.4], ['G4', 0.8]], { tempo: 140, wave: 'sine', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

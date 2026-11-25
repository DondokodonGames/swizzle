// J-GC4-0051-stump-beetle-shove.js
// 切り株の角押し — 相手の揺さぶりで傾く重心を左右タップで真ん中に保ち、相手がよろけた瞬間に踏み込んで切り株の外へ押し出す
// 操作: 画面の左半分タップで重心を左へ、右半分タップで右へ戻す。重心が緑の帯にあれば前へ押し進み、相手がよろけている間はぐっと踏み込む
// 終わり: 相手を切り株の端から押し出せばCLEAR。自分が押し出される・時間切れでGAME OVER
// @mechanic: balance
// @theme: stump_beetle_shove
// 世界観: 夏の雑木林の切り株の上で、若いクワガタが縄張りの主と角を組む。主の揺さぶりで崩れそうな重心を細かく立て直し、主が足をもつれさせた一瞬に踏み込んで切り株から押し出す
// 残るもの: 正誤(CLEAR/GAME OVER) + 押し出すまでの秒数と踏み込み回数
// スタイル: 2010s FLAT MOBILE

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: ベタ塗り数色、影なし・丸角・余白、アイコン的な形
  var STYLE = {
    bg: ['#e9f5ec', '#cfe8d6', '#a8d5b5'],
    main: ['#b07a4f', '#d49a68', '#f0c894'],
    accent: ['#2f80ed', '#ff8a1f'],
  };
  var BLUE = STYLE.accent[0];
  var ORANGE = STYLE.accent[1];
  var GREEN = '#27ae60';
  var RED = '#eb5757';
  var INK = '#1f3a2e';

  var GAME_TITLE = 'STUMP SHOVE';
  var TIME_LIMIT = 20;
  var CX = W / 2;
  var CY = H * 0.46;
  var RING_R = 400;
  var STABLE = 0.35;
  var NUDGE = 0.2;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var BEETLE = [
    [
      'm.........',
      '.m.....bb.',
      '..mm.bbbbb',
      '...bbbbwbb',
      '..mm.bbbbb',
      '.m.....bb.',
      'm..l.l.l..',
    ],
    [
      '.m........',
      '..m....bb.',
      '..mm.bbbbb',
      '...bbbbwbb',
      '..mm.bbbbb',
      '..m....bb.',
      '.m.l.l.l..',
    ],
  ];
  var LEAF = ['..g.', '.ggg', 'gggg', '.gg.', '..l.'];
  var PAD = ['.ff.', 'ffff', 'ffff', '.ff.', 'f..f'];

  var front, cg, cgV, shove, shoveT, stagger, staggerT, nextStagger, timeLeft, ready, hitStop, hitWho;
  var ended, endWait, won, score, lunges, playT, slip, lean, tapFlash;

  function txt(s, x, y, size, color, align) {
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: align || 'center' });
  }

  function initGame() {
    front = 0;
    cg = 0;
    cgV = 0;
    shove = null;
    shoveT = 1.2;
    stagger = 0;
    staggerT = 0;
    nextStagger = 2.8;
    timeLeft = TIME_LIMIT;
    ready = 0.8;
    hitStop = 0;
    hitWho = '';
    ended = false;
    endWait = 0;
    won = false;
    score = 0;
    lunges = 0;
    playT = 0;
    slip = 0;
    lean = 0;
    tapFlash = { l: 0, r: 0 };
  }

  function endGame(ok, demo) {
    if (ended) return;
    ended = true;
    won = ok;
    endWait = 1.5;
    if (ok) score += Math.round(timeLeft * 40) + 500;
    if (!demo) {
      game.audio.stopBgm();
      game.audio.play(ok ? 'se_success' : 'se_failure', 0.6);
    }
  }

  function nudge(dir, demo) {
    if (ended || hitStop > 0) return;
    cgV += dir * NUDGE * 2.2;
    cg += dir * NUDGE * 0.4;
    lean = dir;
    if (dir < 0) tapFlash.l = 0.15; else tapFlash.r = 0.15;
    if (!demo) game.audio.tone(dir < 0 ? 'E5' : 'G5', 0.04, { wave: 'triangle', volume: 0.05 });
  }

  function stepBout(dt, demo) {
    playT += dt;
    // 重心: 不安定(外へ逃げる)+減衰(1秒あたり半分ほど)
    cgV += cg * 1.4 * dt;
    cgV *= Math.pow(0.45, dt);
    cg += cgV * dt;
    if (slip > 0) slip -= dt;
    if (tapFlash.l > 0) tapFlash.l -= dt;
    if (tapFlash.r > 0) tapFlash.r -= dt;

    // 相手の揺さぶり(0.6秒前に予告)
    shoveT -= dt;
    if (!shove && shoveT <= 0.6) {
      shove = { dir: Math.random() < 0.5 ? -1 : 1, t: 0.6 };
      if (!demo) game.audio.tone('A3', 0.12, { wave: 'square', volume: 0.05 });
    }
    if (shove) {
      shove.t -= dt;
      if (shove.t <= 0) {
        cgV += shove.dir * (0.9 + Math.min(0.5, playT * 0.03));
        game.fx.burst(CX + (front * RING_R * 0.6), CY + 40, { color: STYLE.main[2], count: 8, speed: 200 });
        if (!demo) game.audio.play('se_jump', 0.25);
        shove = null;
        shoveT = game.random(1.1, 1.8);
      }
    }

    // よろけ(踏み込みの好機)
    nextStagger -= dt;
    if (nextStagger <= 0 && stagger <= 0) {
      stagger = 1.2;
      staggerT = 0;
      nextStagger = game.random(2.6, 3.6);
      if (!demo) game.audio.tone('C6', 0.08, { wave: 'sine', volume: 0.05 });
    }
    if (stagger > 0) { stagger -= dt; staggerT += dt; }

    var ab = Math.abs(cg);
    if (ab >= 1) {
      // 足を取られた: 大きく押し戻される
      hitStop = 0.4;
      hitWho = 'me';
      return;
    }
    if (ab < STABLE) {
      var gain = stagger > 0 ? 0.3 : 0.06;
      front += gain * dt;
      if (stagger > 0 && staggerT < dt * 1.5) {
        lunges++;
        score += 150;
        game.feedback.good(CX + front * RING_R * 0.6, CY - 150, { text: 'NICE', color: GREEN, count: 14, volume: demo ? 0 : undefined });
        if (!demo && lunges === 2) {
          game.fx.popup('x' + lunges, CX, CY - 260, { color: ORANGE, size: 64 });
          game.audio.play('se_milestone', 0.5);
        }
      }
      score += Math.round(gain * dt * 300);
    } else {
      front -= 0.22 * (ab - STABLE) / (1 - STABLE) * dt + 0.05 * dt;
    }
    if (front >= 1) { hitStop = 0.45; hitWho = 'rival'; return; }
    if (front <= -1) { hitStop = 0.45; hitWho = 'out'; return; }
  }

  function resolveHit(demo) {
    var px = CX + front * RING_R * 0.6;
    if (hitWho === 'me') {
      front -= 0.3;
      cg = 0;
      cgV = 0;
      slip = 0.5;
      game.feedback.bad(px - 120, CY - 120, { text: 'MISS', volume: demo ? 0 : undefined });
      if (front <= -1) { if (!demo) endGame(false, demo); else front = 0; }
    } else if (hitWho === 'rival') {
      game.feedback.good(px + 200, CY - 120, { text: 'CLEAR', color: GREEN, count: 30, volume: demo ? 0 : undefined });
      if (!demo) endGame(true, demo); else front = 0;
    } else if (hitWho === 'out') {
      game.feedback.bad(px - 200, CY - 120, { text: 'MISS', volume: demo ? 0 : undefined });
      if (!demo) endGame(false, demo); else front = 0;
    }
    hitWho = '';
  }

  // ── 描画 ──
  function drawBackground() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.6, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    for (var i = 0; i < 7; i++) {
      var lx = (i * 173 + 60) % W;
      var ly = 290 + (i % 3) * 60 + Math.sin(t * 1.3 + i) * 10;
      game.draw.sprite(LEAF, { g: i % 2 ? '#6fcf97' : GREEN, l: '#8a5a3a' }, lx + Math.cos(t + i) * 8, ly, 12, { anchor: 'center' });
    }
    game.draw.rect(0, 0, W, H, '#ffffff', 0.04 + 0.03 * Math.sin(t * 1.5));
  }

  function drawStump() {
    // 年輪(平たい楕円を横ストリップで)
    for (var r = 0; r < 5; r++) {
      var rr = RING_R - r * 70;
      var col = r % 2 === 0 ? STYLE.main[1] : STYLE.main[2];
      for (var y = -rr * 0.42; y <= rr * 0.42; y += 6) {
        var hw = rr * Math.sqrt(Math.max(0, 1 - (y / (rr * 0.42)) * (y / (rr * 0.42))));
        game.draw.rect(CX - hw, CY + y, hw * 2, 6, col);
      }
    }
    game.draw.rect(CX - RING_R, CY + RING_R * 0.42 - 6, RING_R * 2, 160, STYLE.main[0]);
    // 端の目印
    game.draw.rect(CX - RING_R * 0.6 - 90, CY - 12, 10, 24, RED, 0.7);
    game.draw.rect(CX + RING_R * 0.6 + 80, CY - 12, 10, 24, GREEN, 0.7);
  }

  function drawBeetles() {
    var t = game.time.elapsed;
    var contact = CX + front * RING_R * 0.6;
    var myLean = cg * 22;
    var frame = Math.floor(t * 6) % 2;
    // 自分(左向き→右を向く)
    var mx = contact - 110 + (slip > 0 ? -slip * 60 : 0);
    var my = CY - 30 + Math.sin(t * 4) * 3;
    game.draw.sprite(BEETLE[frame], { m: '#8a5a3a', b: BLUE, w: '#ffffff', l: INK }, mx, my + myLean, 20, { anchor: 'center' });
    // 相手(左を向く)
    var rs = stagger > 0 ? Math.sin(staggerT * 30) * 14 : 0;
    var rw = shove ? (0.6 - shove.t) * -40 * shove.dir : 0;
    var rx = contact + 110 + (shove ? 20 * (0.6 - shove.t) : 0);
    game.draw.sprite(BEETLE[1 - frame], { m: '#5a3a2a', b: ORANGE, w: '#ffffff', l: INK }, rx + rs, CY - 30 + rw + Math.cos(t * 4) * 3, 22, { anchor: 'center', flipX: true });
    // 予告: 揺さぶりの向きに相手の影が寄る
    if (shove && Math.floor(t * 12) % 2 === 0) {
      var ay = CY - 30 + shove.dir * 90;
      game.draw.rect(rx - 60, ay, 120, 14, RED, 0.8);
      game.draw.rect(contact - 40, ay, 80, 14, RED, 0.5);
    }
    if (stagger > 0) {
      game.draw.circle(rx, CY - 140, 22 + Math.sin(t * 20) * 6, '#ffffff', 0.85);
      game.draw.circle(rx, CY - 140, 10, '#ffe066');
    }
    if (hitStop > 0) {
      var who = hitWho === 'rival' ? rx : mx;
      var g = (0.45 - hitStop) * 120;
      game.draw.circle(who, CY - 30, 100 + g, '#ffffff', 0.4);
    }
  }

  function drawBalanceBar() {
    var t = game.time.elapsed;
    var by = H * 0.68;
    var bw = W - 200;
    game.draw.rect(100, by, bw, 44, '#ffffff');
    game.draw.rect(100 + bw / 2 - bw / 2 * STABLE, by, bw * STABLE, 44, GREEN, 0.8);
    game.draw.rect(100, by, 40, 44, RED, 0.7);
    game.draw.rect(100 + bw - 40, by, 40, 44, RED, 0.7);
    var nx = 100 + bw / 2 + Math.max(-1, Math.min(1, cg)) * bw / 2;
    game.draw.rect(nx - 8, by - 26, 16, 96, INK);
    game.draw.circle(nx, by - 30, 18, Math.abs(cg) < STABLE ? GREEN : ORANGE);
    // 押し位置メーター
    var py = H * 0.22;
    game.draw.rect(100, py, bw, 20, '#ffffff');
    game.draw.rect(100, py, bw / 2 + front * bw / 2, 20, BLUE);
    game.draw.rect(100 + bw / 2 - 3, py - 8, 6, 36, INK);
    game.draw.circle(100 + bw / 2 + front * bw / 2, py + 10, 20, ORANGE, 0.9 + 0.1 * Math.sin(t * 5));
  }

  function drawPads() {
    var t = game.time.elapsed;
    var y = H * 0.83;
    game.draw.rect(60, y, W / 2 - 90, 220, BLUE, tapFlash.l > 0 ? 0.55 : 0.14 + 0.05 * Math.sin(t * 2));
    game.draw.rect(W / 2 + 30, y, W / 2 - 90, 220, BLUE, tapFlash.r > 0 ? 0.55 : 0.14 + 0.05 * Math.sin(t * 2 + 1));
    game.draw.sprite(PAD, { f: INK }, W * 0.25, y + 110, 20, { anchor: 'center' });
    game.draw.sprite(PAD, { f: INK }, W * 0.75, y + 110, 20, { anchor: 'center', flipX: true });
  }

  function drawScene() {
    drawBackground();
    drawStump();
    drawBeetles();
    drawBalanceBar();
    drawPads();
  }

  function drawHud() {
    txt(String(Math.ceil(timeLeft)), W - 70, 110, 56, INK, 'right');
    txt('SCORE ' + score, 70, 110, 40, INK, 'left');
    var low = timeLeft < 5 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(70, 160, W - 140, 16, '#ffffff');
    game.draw.rect(70, 160, (W - 140) * Math.max(0, timeLeft / TIME_LIMIT), 16, low ? RED : GREEN);
  }

  // ── ATTRACT ゴースト実演: 同じ重心ロジックをAIが操作 ──
  var demo = { t: 0, gx: W * 0.25, gy: H * 0.88, press: false, cool: 0, loop: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.loop++; }
    demo.cool -= dt;
    // 失敗例: 偶数周は2.5秒以降に立て直しをやめる
    var lazy = demo.loop % 2 === 0 && cyc > 2.5;
    demo.press = demo.cool > 0.08;
    if (!lazy && demo.cool <= 0 && hitStop <= 0) {
      var predicted = cg + cgV * 0.25 + (shove && shove.t < 0.25 ? shove.dir * 0.3 : 0);
      if (Math.abs(predicted) > 0.12) {
        var dir = predicted > 0 ? -1 : 1;
        nudge(dir, true);
        demo.gx = dir < 0 ? W * 0.25 : W * 0.75;
        demo.gy = H * 0.88;
        demo.cool = 0.2;
      }
    }
    if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) resolveHit(true);
    } else {
      stepBout(dt, true);
    }
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING;
      initGame();
      return;
    }
    if (state === S.RESULT) {
      state = S.ATTRACT;
      initGame();
      demo.t = 0;
      return;
    }
    if (ready > 0 || ended) { game.audio.play('se_tap', 0.1); return; }
    nudge(x < W / 2 ? -1 : 1, false);
    game.fx.burst(x, y, { color: BLUE, count: 4, speed: 120 });
  });

  game.onUpdate(function (dt) {
    if (front === undefined) initGame();

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 70, INK);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.12, 34, BLUE);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44, ORANGE);
      else txt('INSERT COIN', W / 2, H * 0.965, 34, INK);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, 220, W, 420, '#ffffff', 0.85);
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, 340, 90, won ? GREEN : RED);
      txt('SCORE ' + score, W / 2, 420, 46, INK);
      txt(Math.max(0, Math.round((front + 1) * 50)) + '%', W / 2, 490, 42, BLUE);
      if (won && score >= (game.best || 0)) txt('NEW RECORD', W / 2, 560, 42, ORANGE);
      else txt('BEST ' + (game.best || 0), W / 2, 560, 36, INK);
      if (!won) txt('あと' + Math.max(1, Math.round((1 - front) * 50)) + '%!', W / 2, 615, 36, ORANGE);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 36, INK);
      return;
    }

    // PLAYING
    if (ended) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { lunges: lunges, seconds: +playT.toFixed(1), push: Math.max(0, Math.round((front + 1) * 50)) };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.3);
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) resolveHit(false);
    } else {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        game.feedback.bad(W / 2, CY - 200, { text: 'TIME UP' });
        endGame(false, false);
      } else {
        stepBout(dt, false);
      }
    }

    drawScene();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, CY - 220, 100, ORANGE);
  });

  game.onStart(function () {
    game.audio.melody(
      [['D4', 0.5], ['D4', 0.25], ['F4', 0.25], ['G4', 0.5], ['A4', 0.5], ['G4', 0.25], ['F4', 0.25], ['D4', 0.5], ['C4', 0.5], ['D4', 1]],
      { tempo: 116, wave: 'square', volume: 0.045, loop: true, bass: true }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);

// J-GC4-0008-valley-parcel-chute.js
// パーセルシュート — 横風で傾く落下傘を左右タップで立て直し、傾きで流れを操って広場の受け取り印に着地させる
// 操作: 画面の左半分タップで左へ、右半分タップで右へ傾ける。傾いた方へ流れるので、倒れすぎないよう保ちながら印の真上へ寄せる
// 終わり: 着地点が印の輪の中ならCLEAR(中心ほど高得点)。輪の外に着地/傾きすぎて傘がつぶれる/時間切れでGAME OVER
// @mechanic: balance
// @theme: valley_parcel_chute
// 世界観: 山あいの郵便局の見習いが、横風の吹き抜ける谷へ落下傘付きの小包を降ろし、村の広場に白く描かれた受け取り印のど真ん中へ届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 印の中心からの距離・しのいだ突風数のスコア
// スタイル: 90s LOW POLY

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s LOW POLY: 面はベタ塗り(横ストリップ)、輪郭はline、頂点ジッターとフォグ
  var STYLE = {
    bg: ['#6f8fb8', '#a9c1d9', '#d8e3ea'],
    main: ['#e84a3c', '#f4f1de', '#243447'],
    accent: ['#f2c14e', '#4f9d69'],
  };

  var GAME_TITLE = 'PARCEL CHUTE';
  var TIME_LIMIT = 20;
  var START_ALT = 1600;
  var FALL_V = 100;
  var TIP_LIMIT = 1.0;
  var P_Y = H * 0.4;
  var RINGS = [60, 120, 180];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var PARCEL = [
    'kkkkkkkk',
    'kbbbbbbk',
    'kbbybbbk',
    'kyyyyyyk',
    'kbbybbbk',
    'kbbybbbk',
    'kkkkkkkk',
  ];
  var PARCEL_PAL = { k: '#243447', b: '#b5835a', y: '#f2c14e' };
  var FLAG = ['kr..', 'krrr', 'kr..', 'k...', 'k...'];
  var PEAKS = [
    { x: -60, w: 520, h: 520, c: '#56708f' },
    { x: 330, w: 620, h: 680, c: '#4a627e' },
    { x: 760, w: 480, h: 470, c: '#5d7897' },
  ];

  var x, vx, a, w, alt, targetX, gust, nextGust, gustsSurvived, timeLeft, ready, freeze, ended, endWait, won, score, landDist, mile, puff, fallMul, tipped;

  function initGame() {
    x = W * 0.5;
    vx = 0;
    a = 0.05;
    w = 0;
    alt = START_ALT;
    targetX = game.random(250, 830);
    gust = null;
    nextGust = 1.4;
    gustsSurvived = 0;
    timeLeft = TIME_LIMIT;
    ready = 0.8;
    freeze = null;
    ended = false;
    endWait = 0;
    won = false;
    score = 0;
    landDist = -1;
    mile = 0;
    puff = [];
    fallMul = 1;
    tipped = false;
  }

  function txt(s, px, py, size, color) {
    game.draw.text(s, px + 3, py + 4, { size: size, color: STYLE.main[2], bold: true, align: 'center' });
    game.draw.text(s, px, py, { size: size, color: color, bold: true, align: 'center' });
  }

  function endGame(ok) {
    if (ended) return;
    ended = true;
    won = ok;
    endWait = 1.6;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.6);
  }

  function nudge(dir, demo) {
    if (ended || freeze) return;
    w += dir * 0.45;
    puff.push({ x: x - dir * 170, y: P_Y - 200, t: 0.35 });
    if (!demo) game.audio.play('se_tap', 0.3);
  }

  function groundY() { return P_Y + 60 + alt * 0.9; }

  function stepWorld(dt, demo) {
    for (var i = puff.length - 1; i >= 0; i--) { puff[i].t -= dt; if (puff[i].t <= 0) puff.splice(i, 1); }
    if (freeze) {
      freeze.t -= dt;
      if (freeze.t <= 0) { var d = freeze.done; freeze = null; d(); }
      return;
    }
    if (ended) return;
    // 突風:予告(風の筋+ヒュー音)→ 本番
    nextGust -= dt;
    if (!gust && nextGust <= 0) {
      gust = { dir: Math.random() < 0.5 ? -1 : 1, warn: 0.7, t: 1.1, peak: 0 };
      if (!demo) game.audio.tone('A3', 0.5, { wave: 'sawtooth', volume: 0.05, slide: 120 });
    }
    var windVx = 0;
    if (gust) {
      if (gust.warn > 0) gust.warn -= dt;
      else {
        gust.t -= dt;
        w += gust.dir * 1.25 * dt;
        windVx = gust.dir * 150;
        gust.peak = Math.max(gust.peak, Math.abs(a));
        if (gust.t <= 0) {
          if (Math.abs(a) < 0.5) {
            gustsSurvived++;
            score += 100;
            game.feedback.good(x, P_Y - 330, { text: 'NICE', color: STYLE.accent[1], count: 8, volume: demo ? 0 : 0.35 });
          }
          gust = null;
          nextGust = game.random(1.0, 2.0);
        }
      }
    }
    // 倒立振子:傾きは放っておくと育つ
    w += a * 1.2 * dt;
    w *= Math.pow(0.35, dt);
    a += w * dt;
    vx += Math.sin(a) * 650 * dt;
    vx *= Math.pow(0.55, dt);
    x += (vx + windVx) * dt;
    if (x < 110) { x = 110; vx = 0; }
    if (x > W - 110) { x = W - 110; vx = 0; }
    alt -= FALL_V * fallMul * dt;
    if (!demo && alt < START_ALT - 600 * (mile + 1) && mile < 2) {
      mile++;
      game.fx.popup(Math.round(alt / 10) + 'm', W * 0.5, H * 0.24, { color: STYLE.accent[0], size: 64 });
      game.audio.play('se_milestone', 0.5);
    }
    if (Math.abs(a) > TIP_LIMIT) {
      tipped = true;
      var fx = x;
      freeze = { t: 0.5, done: function () {
        game.feedback.bad(fx, P_Y - 200, { text: 'MISS' });
        if (!demo) endGame(false); else demoDone = true;
      } };
      return;
    }
    if (alt <= 0) {
      alt = 0;
      landDist = Math.abs(x - targetX);
      var ok = landDist <= RINGS[2];
      var word = landDist <= RINGS[0] ? 'PERFECT' : landDist <= RINGS[1] ? 'GOOD' : 'NICE';
      var lx = x;
      freeze = { t: 0.5, done: function () {
        if (ok) {
          score += Math.round((RINGS[2] - landDist) * 5) + gustsSurvived * 50 + Math.round(timeLeft * 10);
          game.feedback.good(lx, groundY() - 80, { text: word, color: STYLE.accent[0], count: 30, volume: demo ? 0 : undefined });
          if (!demo) endGame(true); else demoDone = true;
        } else {
          game.feedback.bad(lx, groundY() - 80, { text: 'MISS' });
          if (!demo) endGame(false); else demoDone = true;
        }
      } };
    }
  }

  var demoDone = false;

  // ── 描画(ローポリ:横ストリップの面塗り) ─────────────────
  function tri(px, base, wdt, hgt, col) {
    for (var s = 0; s < hgt; s += 8) {
      var k = s / hgt;
      var half = (wdt / 2) * (1 - k);
      game.draw.rect(px + wdt / 2 - half, base - s - 8, half * 2, 9, col);
    }
  }

  function drawBg() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.6, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    var gy = groundY();
    var par = Math.min(1, (START_ALT - alt) / START_ALT);
    var base = H * 0.95 - par * 120 + Math.max(0, gy - H) * 0.05;
    for (var i = 0; i < PEAKS.length; i++) {
      var p = PEAKS[i];
      tri(p.x, base, p.w, p.h, p.c);
      tri(p.x + p.w * 0.5, base, p.w * 0.5, p.h * 0.98, '#3d5470');
      game.draw.line(p.x, base, p.x + p.w / 2, base - p.h, '#2b3d52', 3);
      game.draw.line(p.x + p.w / 2, base - p.h, p.x + p.w, base, '#2b3d52', 3);
    }
    // 流れる雲(ローポリの塊)
    for (var c = 0; c < 4; c++) {
      var cx = ((c * 330 + t * 30) % (W + 300)) - 150;
      var cy = H * (0.12 + c * 0.1) - par * 200;
      game.draw.rect(cx, cy, 180, 40, '#eef3f7', 0.7);
      game.draw.rect(cx + 40, cy - 30, 100, 32, '#eef3f7', 0.7);
    }
    // 地面と広場
    if (gy < H + 40) {
      game.draw.rect(0, gy, W, H - gy + 10, '#6b8f4e');
      game.draw.rect(0, gy, W, 14, '#4f6f38');
      for (var r = RINGS.length - 1; r >= 0; r--) {
        game.draw.rect(targetX - RINGS[r], gy + 12 + r * 6, RINGS[r] * 2, 26 - r * 6, r === 0 ? STYLE.main[0] : r === 1 ? STYLE.main[1] : '#c9c2a0');
      }
      game.draw.sprite(FLAG, { k: STYLE.main[2], r: STYLE.main[0] }, targetX + RINGS[2] + 30, gy - 40, 12, { anchor: 'center' });
    } else {
      // 地面が見えないうちは画面下に目標の方角を示す
      var bl = 0.6 + 0.4 * Math.sin(t * 6);
      game.draw.rect(targetX - RINGS[2], H * 0.965, RINGS[2] * 2, 18, STYLE.main[1], 0.6 * bl);
      game.draw.rect(targetX - RINGS[0], H * 0.965, RINGS[0] * 2, 18, STYLE.main[0], bl);
    }
    // フォグ
    game.draw.rect(0, 0, W, H, '#dfe8ee', 0.08 + 0.03 * Math.sin(t * 1.3));
  }

  function rot(lx, ly) {
    var c = Math.cos(a), s = Math.sin(a);
    return { x: x + lx * c - ly * s, y: P_Y + lx * s + ly * c };
  }

  function drawChute() {
    var t = game.time.elapsed;
    var pts = [];
    for (var i = 0; i <= 6; i++) {
      var th = -1.05 + (i / 6) * 2.1;
      var jit = Math.sin(t * 9 + i) * 3;
      pts.push(rot(230 * Math.sin(th), -250 - 90 * Math.cos(th) + jit));
    }
    // 吊り索
    game.draw.line(pts[0].x, pts[0].y, x, P_Y - 20, STYLE.main[2], 4);
    game.draw.line(pts[6].x, pts[6].y, x, P_Y - 20, STYLE.main[2], 4);
    game.draw.line(pts[3].x, pts[3].y, x, P_Y - 20, STYLE.main[2], 3);
    // 傘の面(太い帯で塗り分け)
    for (var k = 0; k < 6; k++) {
      var col = k % 2 === 0 ? STYLE.main[0] : STYLE.main[1];
      game.draw.line(pts[k].x, pts[k].y, pts[k + 1].x, pts[k + 1].y, col, 46);
      var inner = rot(0, -250);
      game.draw.line(pts[k].x, pts[k].y, (pts[k].x + inner.x) / 2, (pts[k].y + inner.y) / 2, col, 30);
    }
    for (var m = 0; m < 6; m++) game.draw.line(pts[m].x, pts[m].y - 22, pts[m + 1].x, pts[m + 1].y - 22, STYLE.main[2], 3);
    var sway = tipped ? 0 : Math.sin(t * 3) * 4;
    game.draw.sprite(PARCEL, PARCEL_PAL, x + sway, P_Y + 20, 14, { anchor: 'center' });
    // 傾きの危険表示(限界に近いと傘が赤く点滅)
    if (Math.abs(a) > TIP_LIMIT * 0.65 && Math.floor(t * 10) % 2 === 0) {
      var top = rot(0, -330);
      game.draw.circle(top.x, top.y, 70, '#ff3b30', 0.35);
    }
    for (var p = 0; p < puff.length; p++) game.draw.circle(puff[p].x, puff[p].y, 30 + (0.35 - puff[p].t) * 90, '#ffffff', puff[p].t * 1.6);
    if (freeze) {
      var fl = 0.5 + 0.5 * Math.sin(freeze.t * 40);
      game.draw.circle(x, P_Y - 150, 180 + (0.5 - freeze.t) * 300, '#ffffff', 0.3 * fl);
    }
  }

  function drawWind() {
    if (!gust) return;
    var t = game.time.elapsed;
    var n = gust.warn > 0 ? 5 : 12;
    for (var i = 0; i < n; i++) {
      var yy = H * 0.15 + ((i * 137) % (H * 0.55));
      var len = gust.warn > 0 ? 120 : 260;
      var xx = ((t * (gust.warn > 0 ? 700 : 1500) + i * 211) % (W + 400)) - 200;
      if (gust.dir < 0) xx = W - xx;
      game.draw.line(xx, yy, xx - gust.dir * len, yy, '#ffffff', gust.warn > 0 ? 4 : 6);
    }
    if (gust.warn > 0 && Math.floor(t * 10) % 2 === 0) {
      var ex = gust.dir > 0 ? 30 : W - 30;
      game.draw.rect(ex - 20, H * 0.2, 40, H * 0.4, '#ffffff', 0.35);
    }
  }

  function drawHud() {
    txt(Math.ceil(alt / 10) + 'm', W * 0.5, H * 0.05, 66, STYLE.main[1]);
    var bw = W - 160;
    game.draw.rect(80, H * 0.085, bw, 18, STYLE.main[2], 0.5);
    game.draw.rect(80, H * 0.085, bw * (1 - alt / START_ALT), 18, STYLE.accent[0]);
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, H * 0.105, bw * Math.max(0, timeLeft / TIME_LIMIT), 8, low ? '#ff3b30' : STYLE.main[1]);
    // 傾き計(水平器)
    var mx = W * 0.5, my = H * 0.135;
    game.draw.rect(mx - 200, my - 10, 400, 20, STYLE.main[2], 0.5);
    game.draw.rect(mx - 200 * 0.65, my - 10, 400 * 0.65, 20, STYLE.accent[1], 0.5);
    game.draw.circle(mx + Math.max(-1, Math.min(1, a / TIP_LIMIT)) * 200, my, 16, Math.abs(a) > TIP_LIMIT * 0.65 ? '#ff3b30' : STYLE.main[1]);
    txt('SCORE ' + score, W * 0.83, H * 0.05, 32, STYLE.main[1]);
    // 親指ゾーンの左右ボタン
    for (var s = 0; s < 2; s++) {
      var bx = s === 0 ? W * 0.18 : W * 0.82;
      game.draw.circle(bx, H * 0.88, 80, STYLE.main[1], 0.25);
      game.draw.line(bx + (s === 0 ? 30 : -30), H * 0.88 - 36, bx + (s === 0 ? -30 : 30), H * 0.88, STYLE.main[2], 12);
      game.draw.line(bx + (s === 0 ? -30 : 30), H * 0.88, bx + (s === 0 ? 30 : -30), H * 0.88 + 36, STYLE.main[2], 12);
    }
  }

  function drawOutcome() {
    game.draw.rect(0, H * 0.3, W, H * 0.25, STYLE.main[2], 0.75);
    txt(won ? 'CLEAR' : 'GAME OVER', W * 0.5, H * 0.36, 96, won ? STYLE.accent[0] : STYLE.main[0]);
    txt('SCORE ' + score, W * 0.5, H * 0.43, 50, STYLE.main[1]);
    if (!won && landDist > RINGS[2]) txt('あと' + Math.max(1, Math.ceil((landDist - RINGS[2]) / 10)) + 'm!', W * 0.5, H * 0.49, 48, STYLE.accent[0]);
    else if (!won) txt('あと' + Math.ceil(alt / 10) + 'm!', W * 0.5, H * 0.49, 48, STYLE.accent[0]);
    else if (score > game.best) txt('NEW RECORD', W * 0.5, H * 0.49, 48, STYLE.accent[0]);
    else txt('BEST ' + game.best, W * 0.5, H * 0.49, 44, STYLE.main[1]);
  }

  // ── ATTRACT ゴースト実演(同じnudgeで操る) ───────────────
  var demo = { t: 0, gx: W * 0.5, gy: H * 0.88, cd: 0, cycle: 0, press: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt || demoDone || alt === undefined) {
      if (demoDone) demo.cycle++;
      demoDone = false;
      initGame();
      ready = 0;
      fallMul = 3.2;
      nextGust = 0.6;
    }
    demo.cd -= dt;
    demo.press = Math.max(0, demo.press - dt);
    if (freeze) return;
    // 1周おきに突風の最中だけ手を止めて、倒れる失敗例を見せる
    var slack = demo.cycle % 2 === 1 && gust && gust.warn <= 0;
    if (slack) return;
    var want = Math.max(-0.35, Math.min(0.35, (targetX - x) * 0.0022 - vx * 0.0025));
    var err = want - a - w * 0.45;
    if (demo.cd <= 0 && Math.abs(err) > 0.1) {
      var dir = err > 0 ? 1 : -1;
      nudge(dir, true);
      demo.cd = 0.2;
      demo.press = 0.15;
      demo.gx = dir > 0 ? W * 0.82 : W * 0.18;
    }
  }

  game.onTap(function (tx, ty) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING;
      initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (ready > 0 || ended) return;
    var dir = tx < W / 2 ? -1 : 1;
    nudge(dir, false);
    game.fx.burst(tx, ty, { color: STYLE.main[1], count: 4, speed: 140 });
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      stepWorld(dt, true);
      drawBg();
      drawWind();
      drawChute();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 13 });
      txt(GAME_TITLE, W * 0.5, H * 0.07, 90, STYLE.main[1]);
      txt('HI-SCORE ' + game.best, W * 0.5, H * 0.12, 40, STYLE.main[2]);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W * 0.5, H * 0.78, 50, STYLE.accent[0]);
      else txt('INSERT COIN', W * 0.5, H * 0.78, 42, STYLE.main[1]);
      return;
    }
    if (state === S.RESULT) {
      drawBg();
      drawChute();
      drawOutcome();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W * 0.5, H * 0.78, 40, STYLE.main[1]);
      return;
    }
    if (ended) {
      endWait -= dt;
      drawBg();
      drawChute();
      drawHud();
      drawOutcome();
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { distance: landDist < 0 ? -1 : Math.round(landDist / 10), gusts: gustsSurvived };
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
          freeze = { t: 0.4, done: function () {
            game.feedback.bad(x, P_Y - 200, { text: 'TIME UP' });
            endGame(false);
          } };
        }
      }
      stepWorld(dt, false);
    }
    drawBg();
    drawWind();
    drawChute();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W * 0.5, H * 0.6, 110, STYLE.accent[0]);
  });

  game.onStart(function () {
    game.audio.melody(
      [['G4', 1], ['B4', 0.5], ['D5', 0.5], ['G5', 1], ['F#5', 0.5], ['E5', 0.5], ['D5', 1], ['B4', 1], ['C5', 0.5], ['E5', 0.5], ['D5', 2]],
      { tempo: 120, wave: 'triangle', volume: 0.05, loop: true, bass: [['G2', 2], ['E2', 2], ['C3', 2], ['D3', 2]] }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);

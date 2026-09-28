// J-GC4-0025-dough-punch-down.js
// パンチダウン工房 — 発酵しすぎて鉢からあふれそうな生地を連打でガス抜きし、ぺしゃんこにしぼませる
// 操作: 生地を連打して叩く。表面に浮かぶ金色の気泡を叩くと大きくしぼむ(放っておくと気泡の分だけ膨らみ直す)
// 終わり: 膨らみを0%近くまでしぼませればCLEAR。鉢のふちを越えてあふれる/時間切れでGAME OVER
// @mechanic: mash
// @theme: bakery_dough_punch_down
// 世界観: 夜明け前のパン工房で、見習いがオーブンミトンの拳で膨らみすぎた生地の親玉を叩き続け、鉢からあふれる前にガスを抜いて焼き窯に間に合わせる
// 残るもの: 正誤(CLEAR/GAME OVER) + 叩いた回数・割った気泡の数・残り膨らみ%
// スタイル: 90s BIG SPRITE

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 巨大キャラ+床影、太い輪郭、多色
  var STYLE = {
    bg: ['#3b2230', '#7a3f35', '#c9784a'],
    main: ['#f6dfb0', '#e8bf7e', '#b5834a'],
    accent: ['#ffd23f', '#ff4d4d'],
  };

  var GAME_TITLE = 'PUNCH DOWN';
  var TIME_LIMIT = 11;
  var BOWL_X = W / 2, BOWL_Y = H * 0.66;
  var OVER = 1.3;
  var WARN = 1.16;
  var DONE_AT = 0.08;

  var FACE_EYE = ['.##.', '#ww#', '#w##', '.##.'];
  var MITT_UP = [
    '..rrrr..',
    '.rrrrrr.',
    'rrrrrrrr',
    'rrrrrrrr',
    'rrrrrrr.',
    'wwwwwww.',
    'wwwwwww.',
  ];
  var MITT_DOWN = [
    '........',
    '.rrrrrr.',
    'rrrrrrrr',
    'rrrrrrrr',
    'wwwwwwww',
    'wwwwwwww',
    '........',
  ];
  var MITT_PAL = { r: '#d8433b', w: '#f4efe3' };
  var BAKER = ['..www..', '.wwwww.', '..sss..', '.sssss.', 'bbbbbbb', 'bbbbbbb', '.b...b.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var g = null;

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x + 4, y + 5, { size: sz, color: '#2a1420', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function initGame() {
    g = {
      puff: 1.0, low: 1.0, taps: 0, pops: 0, timeLeft: TIME_LIMIT, elapsed: 0,
      ready: 0.8, hitStop: 0, finished: false, done: false, ok: false, endWait: 0,
      squash: 0, bubbles: [], nextBubble: 0.6, mitt: { x: W * 0.8, y: H * 0.42, t: 0 },
      half: false, score: 0, warnBeep: 0,
    };
  }

  function rx() { return 170 + g.puff * 250; }
  function ry() { return 120 + g.puff * 230; }
  function cy() { return BOWL_Y - ry() * 0.55; }

  function inDough(x, y) {
    var dx = (x - BOWL_X) / (rx() + 40), dy = (y - cy()) / (ry() + 40);
    return dx * dx + dy * dy <= 1;
  }

  function spawnBubble() {
    var a = game.random(-2.6, -0.5);
    var d = game.random(0.35, 0.8);
    g.bubbles.push({ ax: Math.cos(a) * d, ay: Math.sin(a) * d, t: 0, life: 1.7 });
  }

  function bubblePos(b) {
    return { x: BOWL_X + b.ax * rx(), y: cy() + b.ay * ry() };
  }

  function punch(x, y) {
    g.mitt.x = x; g.mitt.y = y; g.mitt.t = 0.12;
    // 気泡を優先判定
    for (var i = g.bubbles.length - 1; i >= 0; i--) {
      var p = bubblePos(g.bubbles[i]);
      var br = 44 + g.bubbles[i].t * 20;
      if (game.hit.circle(x, y, 30, p.x, p.y, br)) {
        g.bubbles.splice(i, 1);
        g.pops++;
        g.taps++;
        g.puff = Math.max(0, g.puff - 0.085);
        g.squash = 0.18;
        g.score += 60;
        game.feedback.good(p.x, p.y, { text: 'NICE', color: STYLE.accent[0], count: 14, sound: 'se_coin' });
        return;
      }
    }
    if (inDough(x, y)) {
      g.taps++;
      g.puff = Math.max(0, g.puff - 0.034);
      g.squash = 0.12;
      g.score += 10;
      game.audio.play('se_tap', 0.35);
      game.fx.burst(x, y, { color: STYLE.main[0], count: 5, speed: 220 });
    } else {
      game.feedback.bad(x, y, { text: 'MISS', shake: 4, size: 40 });
    }
  }

  function riseRate() { return 0.03 + g.elapsed * 0.008; }

  function finish(ok) {
    if (g.finished) return;
    g.finished = true; g.ok = ok; g.hitStop = 0.5;
    game.fx.flash('#ffffff', 0.15);
    if (ok) g.score += Math.round(g.timeLeft * 100);
  }

  function step(dt, isDemo) {
    g.elapsed += dt;
    if (g.squash > 0) g.squash -= dt;
    if (g.mitt.t > 0) g.mitt.t -= dt;
    g.puff += riseRate() * dt;
    g.nextBubble -= dt;
    if (g.nextBubble <= 0) { spawnBubble(); g.nextBubble = game.random(0.7, 1.2); }
    for (var i = g.bubbles.length - 1; i >= 0; i--) {
      var b = g.bubbles[i];
      b.t += dt;
      if (b.t >= b.life) {
        g.bubbles.splice(i, 1);
        g.puff += 0.05;
        var p = bubblePos(b);
        game.fx.burst(p.x, p.y, { color: STYLE.main[1], count: 6, speed: 160 });
      }
    }
    if (g.puff < g.low) g.low = g.puff;
    if (!isDemo && !g.half && g.puff <= 0.5) {
      g.half = true;
      game.fx.popup('50%', BOWL_X, cy() - ry() - 40, { color: STYLE.accent[0], size: 70 });
      game.audio.play('se_milestone', 0.5);
    }
    if (g.puff >= WARN && !isDemo) {
      g.warnBeep -= dt;
      if (g.warnBeep <= 0) { game.audio.tone('A5', 0.08, { wave: 'square', volume: 0.06 }); g.warnBeep = 0.25; }
    }
    if (isDemo) return;
    if (g.puff <= DONE_AT) finish(true);
    else if (g.puff >= OVER) finish(false);
    g.timeLeft -= dt;
    if (g.timeLeft <= 0 && !g.finished) { g.timeLeft = 0; finish(false); }
  }

  // ── 描画 ─────────────────────────────────────────────
  function ellipse(x, y, a, b, color, alpha) {
    var st = b > 120 ? 12 : 8;
    for (var yy = -b; yy < b; yy += st) {
      var k = 1 - ((yy + st / 2) * (yy + st / 2)) / (b * b);
      if (k <= 0) continue;
      var hw = a * Math.sqrt(k);
      game.draw.rect(x - hw, y + yy, hw * 2, st + 1, color, alpha);
    }
  }

  function drawBg() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.45, STYLE.bg[1]], [0.72, STYLE.bg[2]], [1, '#5a3326']]);
    // 窯の火(遠景)
    for (var f = 0; f < 3; f++) {
      var fx = W * (0.2 + f * 0.3);
      game.draw.rect(fx - 110, H * 0.2, 220, 190, '#2a1420');
      game.draw.rect(fx - 80, H * 0.24 + Math.sin(t * 5 + f) * 6, 160, 110, '#ff8a3d', 0.55 + 0.2 * Math.sin(t * 7 + f));
    }
    // 他の見習い(半透明シルエット、演出のみ)
    for (var s = 0; s < 2; s++) {
      var sx = s ? W * 0.9 : W * 0.1;
      var sy = H * 0.42 + Math.sin(t * 6 + s * 2) * 10;
      game.draw.sprite(BAKER, { w: '#2a1420', s: '#2a1420', b: '#2a1420' }, sx, sy, 16, { anchor: 'center', alpha: 0.4 });
    }
    game.draw.rect(0, H * 0.74, W, H * 0.26, '#6b3b27');
    game.draw.rect(0, H * 0.74, W, 14, '#8c5236');
    game.draw.rect(0, 0, W, H, '#ffb070', 0.03 + 0.03 * Math.sin(t * 1.5));
  }

  function drawDough() {
    var t = game.time.elapsed;
    var sq = g.squash > 0 ? g.squash * 1.4 : 0;
    var a = rx() * (1 + sq * 0.5) + Math.sin(t * 2.2) * 6;
    var b = ry() * (1 - sq * 0.6) + Math.cos(t * 2.2) * 6;
    var y = cy() + sq * 60;
    var over = g.puff >= WARN;
    var blink = over && Math.floor(t * 8) % 2 === 0;
    // 床影
    ellipse(BOWL_X, BOWL_Y + 150, 420, 40, '#2a1420', 0.45);
    // 生地
    ellipse(BOWL_X, y + 8, a + 10, b + 10, '#8a5a2c');
    ellipse(BOWL_X, y, a, b, blink ? '#ffe9d0' : STYLE.main[0]);
    ellipse(BOWL_X - a * 0.2, y - b * 0.35, a * 0.45, b * 0.3, '#fff4dc', 0.6);
    // 顔(相手)
    var eyeY = y - b * 0.15;
    var ex = a * 0.28;
    game.draw.sprite(FACE_EYE, { '#': '#3b2230', w: '#ffffff' }, BOWL_X - ex, eyeY, 12 + g.puff * 6, { anchor: 'center' });
    game.draw.sprite(FACE_EYE, { '#': '#3b2230', w: '#ffffff' }, BOWL_X + ex, eyeY, 12 + g.puff * 6, { anchor: 'center', flipX: true });
    var mouthW = 40 + g.puff * 90;
    game.draw.rect(BOWL_X - mouthW / 2, eyeY + 70 + g.puff * 30, mouthW, 14 + (g.squash > 0 ? 20 : 0), '#b5534a');
    // 気泡
    for (var i = 0; i < g.bubbles.length; i++) {
      var bb = g.bubbles[i], p = bubblePos(bb);
      var r = 44 + bb.t * 20;
      var late = bb.t > bb.life - 0.6 && Math.floor(t * 12) % 2 === 0;
      game.draw.circle(p.x, p.y, r + 8, '#8a5a2c', 0.5);
      game.draw.circle(p.x, p.y, r, late ? '#ffffff' : STYLE.accent[0]);
      game.draw.circle(p.x - r * 0.3, p.y - r * 0.3, r * 0.3, '#ffffff', 0.8);
    }
    // 鉢
    var bw = 560, bh = 200;
    for (var yy = 0; yy < bh; yy += 10) {
      var k = yy / bh;
      var hw = bw / 2 * (1 - k * k * 0.45);
      game.draw.rect(BOWL_X - hw, BOWL_Y + yy, hw * 2, 11, yy < 30 ? '#4d8fb3' : '#35698a');
    }
    // あふれ警告ライン(ふち)
    game.draw.rect(BOWL_X - bw / 2 - 20, BOWL_Y - 12, bw + 40, 16, blink ? STYLE.accent[1] : '#6fb3d6');
    var limitY = BOWL_Y - (120 + OVER * 230) * 1.55;
    if (over) game.draw.rect(BOWL_X - 360, limitY, 720, 10, STYLE.accent[1], blink ? 0.9 : 0.4);
  }

  function drawMitt() {
    var down = g.mitt.t > 0;
    game.draw.sprite(down ? MITT_DOWN : MITT_UP, MITT_PAL, g.mitt.x, g.mitt.y - (down ? 0 : 60), 20, { anchor: 'center' });
  }

  function drawHud() {
    var pct = Math.max(0, Math.round(g.puff * 100));
    txt(pct + '%', W / 2, 90, 90, g.puff >= WARN ? STYLE.accent[1] : '#ffffff');
    txt('x' + g.taps, W * 0.14, 90, 44, STYLE.accent[0]);
    txt('SCORE ' + g.score, W * 0.8, 90, 36, '#ffffff');
    var bw = W * 0.8, low = g.timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(W * 0.1, 170, bw, 24, '#2a1420', 0.7);
    game.draw.rect(W * 0.1, 170, bw * Math.max(0, g.timeLeft / TIME_LIMIT), 24, low ? STYLE.accent[1] : STYLE.accent[0]);
    // 膨らみゲージ(親指ゾーン)
    game.draw.rect(W * 0.15, H * 0.9, W * 0.7, 30, '#2a1420', 0.7);
    game.draw.rect(W * 0.15, H * 0.9, W * 0.7 * Math.min(1, g.puff / OVER), 30, g.puff >= WARN ? STYLE.accent[1] : STYLE.main[1]);
    game.draw.rect(W * 0.15 + W * 0.7 * (WARN / OVER), H * 0.89, 6, 50, STYLE.accent[1]);
  }

  // ── デモ ─────────────────────────────────────────────
  var demo = { t: 0, gx: W / 2, gy: H * 0.5, press: false, next: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6;
    if (cyc < dt || demo.t <= dt) { initGame(); g.ready = 0; demo.next = 0.3; }
    step(dt, true);
    demo.next -= dt;
    demo.press = demo.next < 0.05;
    // 4秒目以降は手を止めて膨らみ直しを見せる(危険の実演)
    if (cyc < 4 && demo.next <= 0) {
      var tx = BOWL_X + game.random(-120, 120), ty = cy() + game.random(-60, 60);
      if (g.bubbles.length) { var p = bubblePos(g.bubbles[0]); tx = p.x; ty = p.y; }
      demo.gx = tx; demo.gy = ty;
      punch(tx, ty);
      demo.next = 0.16;
    }
    if (cyc >= 4) { g.puff += dt * 0.12; demo.press = false; }
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING; initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  game.onPress(function (x, y) {
    if (state !== S.PLAYING) return;
    if (g.finished || g.ready > 0 || g.hitStop > 0) { game.audio.play('se_tap', 0.1); return; }
    punch(x, y);
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (!g) initGame();
      stepDemo(dt);
      drawBg(); drawDough(); drawMitt();
      game.draw.hand(demo.gx, demo.gy + 40, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 96, STYLE.accent[0]);
      txt('BEST ' + (game.best || 0), W / 2, H * 0.14, 44, '#ffffff');
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.955, 50, STYLE.accent[0]);
      else txt('INSERT COIN', W / 2, H * 0.955, 42, '#ffffff');
      return;
    }

    if (state === S.RESULT) {
      drawBg(); drawDough();
      game.draw.rect(0, H * 0.06, W, H * 0.3, '#2a1420', 0.75);
      txt(g.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.12, 116, g.ok ? STYLE.accent[0] : STYLE.accent[1]);
      txt('SCORE ' + g.score, W / 2, H * 0.2, 60, '#ffffff');
      txt('x' + g.taps + '  ●' + g.pops, W / 2, H * 0.26, 48, STYLE.main[0]);
      if (!g.ok) txt('あと' + Math.max(1, Math.round(g.low * 100)) + '%!', W / 2, H * 0.32, 56, '#ff9f7a');
      else if (g.score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.32, 60, STYLE.accent[0]);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.32, 48, '#ffffff');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.955, 46, '#ffffff');
      return;
    }

    if (g.done) {
      g.endWait -= dt;
      if (g.endWait <= 0) {
        state = S.RESULT;
        var stats = { taps: g.taps, bubbles: g.pops, left: Math.round(g.puff * 100) };
        if (g.ok) game.end.success(g.score, stats); else game.end.failure(stats);
      }
    } else if (g.hitStop > 0) {
      g.hitStop -= dt;
      if (g.hitStop <= 0) {
        g.done = true; g.endWait = 1.1;
        game.audio.stopBgm();
        if (g.ok) {
          game.feedback.good(BOWL_X, cy(), { text: 'CLEAR', color: STYLE.accent[0], count: 40 });
          game.audio.play('se_success', 0.6);
        } else {
          game.feedback.bad(BOWL_X, cy() - ry(), { text: g.timeLeft <= 0 ? 'TIME UP' : 'GAME OVER', shake: 18 });
          game.audio.play('se_failure', 0.6);
        }
      }
    } else if (g.ready > 0) {
      g.ready -= dt;
      if (g.ready <= 0) game.audio.play('se_powerup', 0.4);
    } else if (!g.finished) {
      step(dt, false);
    }

    drawBg(); drawDough();
    if (g.hitStop > 0) {
      var p = 1 - g.hitStop / 0.5;
      game.draw.circle(BOWL_X, cy(), ry() * (1 + p * 0.4), '#ffffff', 0.35 * (1 - p));
    }
    drawMitt(); drawHud();
    if (g.ready > 0) txt(g.ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 120, STYLE.accent[0]);
  });

  game.onStart(function () {
    game.audio.melody([
      ['G4', 0.5], ['G4', 0.25], ['A4', 0.25], ['B4', 0.5], ['D5', 0.5], ['C5', 0.5], ['B4', 0.5], ['A4', 1],
      ['G4', 0.5], ['B4', 0.5], ['A4', 0.5], ['F#4', 0.5], ['G4', 1.5],
    ], { tempo: 168, wave: 'square', volume: 0.045, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);

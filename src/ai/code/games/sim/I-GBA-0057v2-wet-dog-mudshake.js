// I-GBA-0057v2-wet-dog-mudshake.js
// ぬれ犬ぶるぶる — 左右を交互に叩いて大型犬の体を大きく振らせ、毛にくっついた泥はねを振り落とす
// 操作: 画面の左半分と右半分(下の肉球パッド)を交互にタップ。叩いた側へ体が振れ、その側の泥が飛ぶ。速く交互に叩くほど振りが強まり大きな泥まで飛ぶ。同じ側を続けて叩くとよろけて振りが弱まる
// 終わり: 3回の泥はねを終えた時点で肉球ハートが残っていればCLEAR。時間内に落とし切れないたびにハートを1つ失い、2つ失うとGAME OVER
// @mechanic: alternate_tap
// @theme: rainy_porch_dog_mudshake
// 世界観: 雨の日の玄関先で、散歩帰りの濡れた大型犬が、左右に体をぶるぶる振って毛についた泥はねを玄関マットの外へ振り落とす
// 残るもの: 正誤(CLEAR/GAME OVER) + 振り落とした泥の数・最大の振りの強さ・スコア
// スタイル: PIXEL HD

(function (game) {
  var STYLE = { bg: ['#141c28', '#24364a', '#3f5a6e'], main: ['#c98a4b', '#f2d5a6', '#5a3a22'], accent: ['#ffd36b', '#8fd8ff'] };
  var W = game.canvas.width;
  var H = game.canvas.height;
  var NIGHT = STYLE.bg[0], DUSK = STYLE.bg[1], SLATE = STYLE.bg[2];
  var FUR = STYLE.main[0], CREAM = STYLE.main[1], MUD = STYLE.main[2];
  var LAMP = STYLE.accent[0], RAIN = STYLE.accent[1];
  var MUD_HI = '#8a5a34', WALL = '#6b5e52', WALL_DK = '#4c4239', WOOD = '#7a4a26', WOOD_DK = '#4a2a14';
  var INK = '#0b1018', WHITE = '#fff8ec', RED = '#ff5d6c';

  var TITLE = 'MUD SHAKE';
  var ROUND_TIMES = [4.2, 4.2, 4.6];
  var TIME_LIMIT = 13;
  var HEARTS = 2;
  var DOG_X = W * 0.5, DOG_Y = H * 0.52;
  var PAD_Y = H * 0.855, PAD_LX = W * 0.25, PAD_RX = W * 0.75;
  var DOG_PX = 20;
  var POW_MAX = 3.6;
  var GRIP_R = [0, 19, 28, 38];

  // [dx, dy, grip] 体の中心からの位置。grip=しがみつく強さ(1小/2中/3大)
  var LAYOUTS = [
    [[-92, -8, 1], [96, 12, 1], [-62, 62, 1], [70, 66, 1], [-34, -58, 1], [40, -50, 1]],
    [[-102, 4, 2], [100, -10, 2], [-72, 70, 1], [76, 60, 1], [-42, -60, 1], [46, -68, 2], [-22, 92, 2], [26, 30, 1]],
    [[-110, 10, 3], [110, 0, 3], [-80, 70, 2], [86, 76, 2], [-50, -60, 1], [56, -54, 1], [-26, 96, 2], [30, 96, 3], [-96, -40, 2], [96, -36, 1]],
  ];

  var DOG_IDLE = [
    '..oo........oo..',
    '.obbo......obbo.',
    '.obbbo....obbbo.',
    '..obbboooobbbo..',
    '...obbbbbbbbo...',
    '..obbebbbbebbo..',
    '..obbbbnnbbbbo..',
    '...obbbttbbbo...',
    '...obllllllbo...',
    '..obbllllllbbo..',
    '.obbbllllllbbbo.',
    '.obbbllllllbbbo.',
    '..oooo....oooo..',
  ];
  var DOG_FLING = [
    '................',
    'oo............oo',
    'obbo........obbo',
    '.obbboooooobbbo.',
    '...obbbbbbbbo...',
    '..obkkbbbbkkbo..',
    '..obbbbnnbbbbo..',
    '...obbtttbbbo...',
    '...obllllllbo...',
    '..obbllllllbbo..',
    '.obbbllllllbbbo.',
    '.obbbllllllbbbo.',
    '..oooo....oooo..',
  ];
  var DOG_FLING2 = [
    'o..............o',
    'bo............ob',
    'obbo........obbo',
    '.obbboooooobbbo.',
    '..obbbbbbbbbbo..',
    '..obkkbbbbkkbo..',
    '..obbbbnnbbbbo..',
    '...obbbttbbbo...',
    '..obbllllllbbo..',
    '.obbbllllllbbbo.',
    'obbbbllllllbbbbo',
    '.obbbllllllbbbo.',
    '..oooo....oooo..',
  ];
  var DOG_PAL = { o: '#3b2414', b: FUR, l: CREAM, e: '#120a06', n: '#120a06', t: '#ff7a8a', k: '#3b2414' };
  var PAW = ['.p.p.', 'p.p.p', '.....', '.ppp.', 'ppppp', '.ppp.'];
  var UMBRELLA = ['..rrr..', '.rrrrr.', 'rrrrrrr', '...h...', '...h...', '...h...', '..hh...'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var round, clumps, flying, decals, pow, lastSide, lastTapT, clock, roundT, hearts, score, flung, maxPow, misses;
  var ready, halt, interlude, over, won, endT, resT, sent, prevBest, stun, sway, swayV, padFlash, cleanRounds;

  function loadRound(r) {
    clumps = [];
    var lay = LAYOUTS[r];
    for (var i = 0; i < lay.length; i++) clumps.push({ dx: lay[i][0] * 1.25, dy: lay[i][1] * 1.2, g: lay[i][2], on: true, pop: 0.3 + i * 0.04 });
  }

  function initGame() {
    round = 0; loadRound(0); flying = []; decals = [];
    pow = 0; lastSide = 0; lastTapT = -9; clock = 0; roundT = ROUND_TIMES[0];
    hearts = HEARTS; score = 0; flung = 0; maxPow = 0; misses = 0; cleanRounds = 0;
    ready = 0.8; halt = null; interlude = 0; over = false; won = false; endT = 0; resT = 0; sent = false;
    prevBest = game.best || 0; stun = 0; sway = 0; swayV = 0; padFlash = [0, 0];
  }

  function remaining() {
    var n = 0;
    for (var i = 0; i < clumps.length; i++) if (clumps[i].on) n++;
    return n;
  }

  function dogX() { return DOG_X + sway * 70; }

  // ── 体を振る(プレイ・デモ共通の実ロジック) ──
  function shake(side, vol) {
    var v = vol || 1;
    padFlash[side < 0 ? 0 : 1] = 0.18;
    if (stun > 0) {
      game.audio.tone(180, 0.06, { wave: 'square', volume: 0.04 * v });
      return;
    }
    if (side === lastSide) {
      // 同じ側を続けて叩いた: よろけて振りが落ちる
      pow *= 0.35; stun = 0.28; misses++;
      swayV -= side * 3;
      game.feedback.bad(side < 0 ? PAD_LX : PAD_RX, PAD_Y - 170, { text: 'MISS', shake: 8, volume: 0.5 * v });
      lastSide = side;
      return;
    }
    var gap = clock - lastTapT;
    pow = Math.min(POW_MAX, pow + (gap < 0.3 ? 1 : gap < 0.45 ? 0.6 : 0.35));
    lastTapT = clock; lastSide = side;
    if (pow > maxPow) maxPow = pow;
    swayV += side * (7 + pow * 2.2);
    var lvl = Math.floor(pow);
    game.audio.tone(330 + lvl * 110, 0.07, { wave: 'triangle', volume: 0.09 * v, slide: side * 60 });
    game.fx.burst(dogX() + side * 120, DOG_Y - 30, { color: RAIN, count: 4 + lvl * 2, speed: 260 + pow * 80 });
    // 振った側の、外側にある泥から最大2つ飛ぶ(しがみつく強さ <= 振りの強さ)
    var cands = [];
    for (var i = 0; i < clumps.length; i++) {
      var c = clumps[i];
      if (c.on && (c.dx < 0 ? -1 : 1) === side && c.g <= lvl) cands.push(c);
    }
    cands.sort(function (a, b) { return Math.abs(b.dx) - Math.abs(a.dx); });
    for (var k = 0; k < Math.min(2, cands.length); k++) {
      var cl = cands[k];
      cl.on = false; flung++;
      var gain = 10 * cl.g * (1 + lvl);
      score += gain;
      flying.push({ x: dogX() + cl.dx, y: DOG_Y + cl.dy, vx: side * (520 + pow * 160 + k * 60), vy: -320 - cl.g * 60, r: GRIP_R[cl.g], life: 1.4 });
      game.feedback.good(dogX() + cl.dx, DOG_Y + cl.dy, { text: cl.g === 3 ? 'NICE' : null, color: LAMP, count: 6 + cl.g * 2, volume: 0.45 * v });
    }
    if (lvl >= 3 && cands.length === 0 && remaining() > 0) game.audio.play('se_powerup', 0.12 * v);
    if (state === S.PLAYING && remaining() === 0) roundClear();
  }

  function roundClear() {
    var bonus = Math.ceil(roundT * 40);
    score += bonus; cleanRounds++;
    game.fx.popup('+' + bonus, DOG_X, DOG_Y - 260, { color: LAMP, size: 64 });
    if (round < LAYOUTS.length - 1) {
      game.audio.play('se_milestone', 0.4);
      game.fx.popup((round + 1) + ' / ' + LAYOUTS.length, W / 2, H * 0.3, { color: WHITE, size: 72 });
      interlude = 1.0;
    } else {
      finish(true);
    }
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.3;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
    if (ok) {
      for (var i = 0; i < 4; i++) game.fx.burst(W * (0.2 + i * 0.2), H * 0.4, { color: i % 2 ? LAMP : RAIN, count: 18, speed: 460 });
      game.fx.flash(LAMP, 0.2);
    }
  }

  function sendEnd() {
    if (sent) return;
    sent = true;
    var stats = { flung: flung, maxPower: Math.floor(maxPow), misses: misses, hearts: hearts, rounds: cleanRounds };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // ── 入力 ──
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); sendEnd(); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function (x, y) {
    if (state !== S.PLAYING) return;
    if (over || halt || interlude > 0 || ready > 0) { game.audio.play('se_tap', 0.06); return; }
    shake(x < W / 2 ? -1 : 1, 1);
  });

  // ── 描画 ──
  function drawBackdrop() {
    var par = sway * 6;
    game.draw.gradient(0, H, [[0, NIGHT], [0.3, DUSK], [0.6, SLATE], [0.6, '#5f564d'], [0.78, '#463d35'], [0.78, WOOD_DK], [1, '#24140a']]);
    // 遠景: 雨の通り(ドアの向こう)
    for (var h = 0; h < 6; h++) {
      var hx = W * 0.14 + h * 150 - par * 0.4, hh = 120 + (h * 53) % 90;
      game.draw.rect(hx, H * 0.47 - hh, 130, hh + 40, '#0f1722');
      if ((h + Math.floor(game.time.elapsed * 0.5)) % 3 !== 0) game.draw.rect(hx + 40, H * 0.47 - hh + 30, 26, 22, LAMP, 0.55);
    }
    game.draw.rect(0, H * 0.49, W, H * 0.11, '#1a2533');
    for (var p = 0; p < 4; p++) game.draw.circle(W * 0.25 + p * 180 - par * 0.6, H * 0.56, 40 + p * 6, '#2c4258', 0.6);
    var t = game.time.elapsed;
    for (var r = 0; r < 26; r++) {
      var rx = (r * 97 + t * 40) % W, ry = (r * 211 + t * 900) % (H * 0.5) + H * 0.12;
      game.draw.line(rx, ry, rx - 6, ry + 34, RAIN, 2);
    }
    // 中景: 壁と戸枠(光源は左上のランプ)
    game.draw.rect(0, 0, W * 0.17 - par, H * 0.6, WALL);
    game.draw.rect(W * 0.83 - par, 0, W * 0.17 + par + 4, H * 0.6, WALL_DK);
    game.draw.rect(0, 0, W, H * 0.12, WALL);
    game.draw.rect(W * 0.17 - par, H * 0.12, 24, H * 0.48, WOOD);
    game.draw.rect(W * 0.83 - par - 24, H * 0.12, 24, H * 0.48, WOOD_DK);
    game.draw.rect(W * 0.17 - par, H * 0.12 - 20, W * 0.66, 24, WOOD);
    for (var g = 0; g < 4; g++) game.draw.circle(W * 0.09, H * 0.15, 30 + g * 40, LAMP, 0.08);
    game.draw.circle(W * 0.09, H * 0.15, 22, '#fff1b8');
    game.draw.sprite(UMBRELLA, { r: '#3f7fa8', h: WOOD_DK }, W * 0.08 - par, H * 0.52, 14, { anchor: 'center' });
    // 近景: たたきの石と玄関マット
    for (var k = 0; k < 6; k++) game.draw.line(0, H * (0.62 + k * 0.03), W, H * (0.62 + k * 0.03), '#3a322b', 3);
    for (var q = 0; q < 8; q++) game.draw.line(q * 150 + 40 - par * 1.5, H * 0.6, q * 150 + 10 - par * 2, H * 0.78, '#3a322b', 3);
    game.draw.rect(W * 0.26, H * 0.585, W * 0.48, 44, '#7d2f2a');
    game.draw.rect(W * 0.26, H * 0.585, W * 0.48, 8, '#a8463d');
    for (var d = 0; d < decals.length; d++) game.draw.circle(decals[d].x, decals[d].y, decals[d].r, MUD, 0.85);
  }

  function drawDog(hl) {
    var x = dogX();
    for (var s = -3; s <= 3; s++) game.draw.circle(x + s * 36, DOG_Y + 136, 40 - Math.abs(s) * 4, INK, 0.25);
    var moving = Math.abs(swayV) > 1.5 || pow > 0.6;
    var fr = moving ? (Math.floor(game.time.elapsed * 14) % 2 === 0 ? DOG_FLING : DOG_FLING2) : DOG_IDLE;
    var bob = moving ? 0 : Math.sin(game.time.elapsed * 3) * 5;
    game.draw.sprite(fr, DOG_PAL, x, DOG_Y + bob, DOG_PX, { anchor: 'center', flipX: sway < 0 });
    // 左上ランプからのハイライト
    game.draw.circle(x - 88, DOG_Y - 62 + bob, 32, '#ffe7b0', 0.22);
    for (var i = 0; i < clumps.length; i++) {
      var c = clumps[i];
      if (!c.on) continue;
      var cx = x + c.dx, cy = DOG_Y + c.dy + bob;
      var rr = GRIP_R[c.g] * (1 + (hl || 0) * 0.5);
      if (hl) game.draw.circle(cx, cy, rr + 10, WHITE, hl * 0.9);
      game.draw.circle(cx + 3, cy + 4, rr, '#2a170a');
      game.draw.circle(cx, cy, rr, MUD);
      game.draw.circle(cx - rr * 0.35, cy - rr * 0.35, rr * 0.35, MUD_HI);
    }
  }

  function drawFlying(dt) {
    for (var i = flying.length - 1; i >= 0; i--) {
      var f = flying[i];
      if (dt > 0) {
        f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 1400 * dt; f.life -= dt;
        var hitWall = f.x < W * 0.17 || f.x > W * 0.83;
        if (f.y > H * 0.64 || hitWall || f.life <= 0) {
          if (decals.length < 40) decals.push({ x: Math.max(30, Math.min(W - 30, f.x)), y: Math.min(H * 0.76, f.y), r: f.r * 0.9 });
          flying.splice(i, 1);
          continue;
        }
      }
      game.draw.circle(f.x, f.y, f.r, MUD);
      game.draw.circle(f.x - f.r * 0.3, f.y - f.r * 0.3, f.r * 0.3, MUD_HI);
    }
  }

  function drawGauge() {
    var x0 = W * 0.18, x1 = W * 0.82, y = H * 0.7;
    game.draw.rect(x0 - 6, y - 6, x1 - x0 + 12, 40, INK, 0.7);
    var fr = pow / POW_MAX;
    game.draw.rect(x0, y, (x1 - x0) * fr, 28, pow >= 3 ? LAMP : RAIN);
    for (var g = 1; g <= 3; g++) {
      var nx = x0 + (x1 - x0) * (g / POW_MAX);
      game.draw.rect(nx - 3, y - 10, 6, 48, WHITE, 0.8);
      var lit = pow >= g;
      game.draw.circle(nx, y - 40, GRIP_R[g] * 0.8, lit ? MUD : '#2a2622', lit ? 1 : 0.6);
      if (lit) game.draw.circle(nx - 6, y - 46, 6, MUD_HI);
    }
  }

  function drawPads(expect) {
    for (var i = 0; i < 2; i++) {
      var side = i === 0 ? -1 : 1;
      var px = i === 0 ? PAD_LX : PAD_RX;
      var glow = expect === side || expect === 0;
      var blink = glow && Math.floor(game.time.elapsed * 6) % 2 === 0;
      game.draw.circle(px, PAD_Y, 150, glow ? '#6a4a30' : '#3a281a');
      if (blink) game.draw.circle(px, PAD_Y, 150, WHITE, 0.18);
      game.draw.circle(px, PAD_Y, 132, glow ? '#8a6040' : '#4a3424');
      if (padFlash[i] > 0) game.draw.circle(px, PAD_Y, 150, LAMP, padFlash[i] * 2.5);
      game.draw.sprite(PAW, { p: glow ? CREAM : '#7a6a5a' }, px, PAD_Y + Math.sin(game.time.elapsed * 4 + i) * 6, 30, { anchor: 'center', flipX: i === 1 });
    }
  }

  function big(s, x, y, sz, col) {
    game.draw.text(s, x + 4, y + 5, { size: sz, color: INK, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  function drawHud() {
    for (var r = 0; r < LAYOUTS.length; r++) game.draw.circle(90 + r * 64, 92, r === round ? 22 : 16, r < round ? LAMP : r === round ? WHITE : '#3a4a5a');
    big(String(score), W / 2, 92, 64, WHITE);
    for (var h = 0; h < HEARTS; h++) game.draw.sprite(PAW, { p: h < hearts ? RED : '#3a2a2a' }, W - 110 - h * 100, 92, 12, { anchor: 'center' });
    var lim = ROUND_TIMES[round] || 1;
    var fr = Math.max(0, roundT / lim);
    game.draw.rect(60, 190, W - 120, 22, INK, 0.7);
    var warn = roundT < 1.2 && Math.floor(game.time.elapsed * 8) % 2 === 0;
    game.draw.rect(60, 190, (W - 120) * fr, 22, warn ? RED : LAMP);
    // 残りの泥アイコン列
    var n = remaining();
    for (var i = 0; i < n; i++) game.draw.circle(W / 2 - (n - 1) * 26 + i * 52, H * 0.135, 16, MUD);
  }

  // ── ATTRACT デモ: 実ロジックの shake() を手カーソルで叩く ──
  var demo = { t: 0, gx: PAD_LX, gy: PAD_Y, press: 0, next: 0 };
  var DEMO_TAPS = [0.3, 0.52, 0.74, 0.96, 1.18, 1.4, 1.62, 1.84, 2.06, 2.28, 2.9, 3.12];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.8;
    if (cyc < dt || demo.t <= dt) {
      loadRound(1); flying = []; decals = []; pow = 0; lastSide = 0; lastTapT = -9; clock = 0; stun = 0; demo.next = 0;
    }
    clock = cyc;
    while (demo.next < DEMO_TAPS.length && cyc >= DEMO_TAPS[demo.next]) {
      // 前半は左右交互(成功)、最後の2打は右を続けて叩く(失敗例)
      var side = demo.next < 11 ? (demo.next % 2 === 0 ? -1 : 1) : -1;
      demo.gx = side < 0 ? PAD_LX : PAD_RX;
      demo.press = 0.12;
      shake(side, 0.35);
      demo.next++;
    }
    if (demo.press > 0) demo.press -= dt;
  }

  function physics(dt) {
    swayV += (-sway * 55 - swayV * 7) * dt;
    sway += swayV * dt;
    sway = Math.max(-1.2, Math.min(1.2, sway));
    pow = Math.max(0, pow - 1.3 * dt);
    if (stun > 0) stun -= dt;
    if (padFlash[0] > 0) padFlash[0] -= dt;
    if (padFlash[1] > 0) padFlash[1] -= dt;
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      physics(dt);
      drawBackdrop();
      drawFlying(dt);
      drawDog(0);
      drawGauge();
      drawPads(lastSide === 0 ? 0 : -lastSide);
      game.draw.hand(demo.gx, demo.gy - 20, { press: demo.press > 0, scale: 16 });
      big(TITLE, W / 2, H * 0.085, 96, LAMP);
      big('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.125, 40, RAIN);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) big('► 100円 投入 ◄', W / 2, H * 0.965, 44, LAMP);
      else big('INSERT COIN', W / 2, H * 0.965, 38, WHITE);
      return;
    }

    if (state === S.RESULT) {
      resT += dt;
      if (resT > 1.1) sendEnd();
      physics(dt);
      drawBackdrop();
      drawDog(0);
      game.draw.rect(60, H * 0.15, W - 120, H * 0.22, INK, 0.78);
      big(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.19, 104, won ? LAMP : RED);
      big('SCORE ' + score, W / 2, H * 0.245, 54, WHITE);
      big(flung + ' / ' + (LAYOUTS[0].length + LAYOUTS[1].length + LAYOUTS[2].length) + '   x' + Math.floor(maxPow), W / 2, H * 0.29, 40, RAIN);
      if (won && score > prevBest) big('NEW RECORD', W / 2, H * 0.335, 56, LAMP);
      else big('BEST ' + Math.max(prevBest, score), W / 2, H * 0.335, 40, CREAM);
      if (!won) big('あと' + remaining() + '個!', W / 2, H * 0.43, 64, RED);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) big('TAP TO CONTINUE', W / 2, H * 0.965, 38, WHITE);
      return;
    }

    // ── PLAYING ──
    var hl = 0;
    var frozen = false;
    if (over) {
      endT -= dt;
      if (endT <= 0) { state = S.RESULT; resT = 0; }
    } else if (halt) {
      // hit-stop: 残った泥を白く光らせて見せる
      frozen = true;
      halt.t -= dt;
      hl = Math.max(0, halt.t / halt.max);
      if (halt.t <= 0) {
        halt = null; hearts--;
        game.feedback.bad(DOG_X, DOG_Y - 200, { text: 'TIME UP' });
        if (hearts <= 0) finish(false);
        else if (round >= LAYOUTS.length - 1) finish(true);
        else interlude = 1.0;
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.3);
    } else if (interlude > 0) {
      interlude -= dt;
      if (interlude <= 0) {
        round++; loadRound(round); roundT = ROUND_TIMES[round]; pow = 0; lastSide = 0;
        game.audio.tone(140, 0.25, { wave: 'sawtooth', volume: 0.08, slide: -60 });
        game.fx.burst(DOG_X, DOG_Y, { color: MUD, count: 22, speed: 380 });
      }
    } else {
      clock += dt;
      roundT -= dt;
      if (roundT < 1.2 && Math.floor((roundT + dt) * 4) !== Math.floor(roundT * 4)) game.audio.tone(880, 0.04, { wave: 'square', volume: 0.05 });
      if (roundT <= 0) {
        roundT = 0;
        halt = { t: 0.5, max: 0.5 };
        game.fx.flash(WHITE, 0.15);
      }
    }
    if (!frozen) physics(dt);

    drawBackdrop();
    drawFlying(frozen ? 0 : dt);
    drawDog(hl);
    drawGauge();
    var expect = ready > 0 || interlude > 0 ? 0 : lastSide === 0 ? 0 : -lastSide;
    drawPads(expect);
    drawHud();
    // 開始時のお手本: 最初の1打まで左パッドに手を出す
    if (round === 0 && lastSide === 0 && ready <= 0 && clock < 0.9) game.draw.hand(PAD_LX, PAD_Y - 20, { press: Math.floor(clock * 4) % 2 === 0, scale: 14, alpha: 0.7 });
    if (interlude > 0 && interlude < 0.5) {
      for (var i = 0; i < 3; i++) game.draw.circle(DOG_X + (i - 1) * 90, DOG_Y + 20, 60 * (1 - interlude * 2), MUD, 0.3);
    }
    if (ready > 0) big(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 120, LAMP);
  });

  game.onStart(function () {
    game.audio.melody([
      ['F4', 0.5], ['A4', 0.5], ['C5', 0.5], ['A4', 0.5], ['Bb4', 0.5], ['D5', 0.5], ['C5', 1],
      ['A4', 0.5], ['G4', 0.5], ['F4', 0.5], ['G4', 0.5], ['A4', 1.5], ['R', 0.5],
    ], { tempo: 136, wave: 'triangle', volume: 0.06, loop: true, bass: [['F2', 2], ['Bb2', 2], ['C3', 2], ['F2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

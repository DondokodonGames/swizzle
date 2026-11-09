// I-Wii-0005v2-newyear-hane-rally.js
// 路地の羽根つき連打 — 向かいの子が打ち上げた羽根を、落ちてきた瞬間だけ落ちる石畳の位置で打ち返し、続けて返すほど梅の花の倍率が咲き増える
// 操作: 羽根の影が向かう石畳(左/中/右)の列を、羽根が羽子板の高さまで下りて石畳が白く光る瞬間にタップ。違う列・早すぎるタップは空振りで倍率が1に戻る。3回続けて返すごとに倍率+1(最大x5)。倍率が上がるほど相手の打ち返しが速く低くなる
// 終わり: 20秒の羽根つきで墨を3つ塗られず、点数が旗に届けばCLEAR。羽根を3回落として顔に墨が3つ付くか、点が届かなければGAME OVER
// @mechanic: jackpot_combo
// @theme: new_year_alley_battledore
// 世界観: 正月の路地で、晴れ着の少女が向かいの家の子と羽根つきをし、落ちてくる羽根を続けて打ち返すほど軒先の梅の花が咲きそろっていく
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア(倍率込みの点数・最長連続・最高倍率・PERFECT数)
// スタイル: 80s ISO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: 菱形グリッドの石畳。高さは影との距離で示し、奥でも小さくしない
  var STYLE = { bg: ['#d8e4f0', '#a8bcd0', '#6a7c94'], main: ['#c83a3a', '#3a64b4', '#e8c84a'], accent: ['#f08ab0', '#1c1c24'] };
  var C = {
    sky: STYLE.bg[0], stone: STYLE.bg[1], stoneDk: STYLE.bg[2], red: STYLE.main[0], blue: STYLE.main[1], gold: STYLE.main[2],
    plum: STYLE.accent[0], ink: STYLE.accent[1], white: '#ffffff', wood: '#a8743a', wall: '#e8dcc8', wallDk: '#b8a890', roof: '#4a4a5a', pine: '#2e7a3e',
  };

  var GAME_TITLE = 'HANE RALLY';
  var TIME_LIMIT = 20;
  var QUOTA = 1500;
  var MAX_MARKS = 3;
  var PERFECT_W = 0.08, GOOD_W = 0.17;
  var LANES = [300, 540, 780];
  var LANE_Y = Math.round(H * 0.72);
  var OPP = { x: 540, y: Math.round(H * 0.3) };
  var PADDLE_H = 130;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var rally, girlX, girlTargetX, swingT, oppSwingT, streak, mult, lastMult, marks, dropT, dropPos, recoverT, tileFlash;
  var score, hits, perfects, bestStreak, bestMult, countIn, over, won, endT, prevBest, playT, breakT;

  function label(str, x, y, sz, color) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  // 晴れ着の少女(手前)と向かいの子(奥)
  var GIRL = [
    '...kkkk.....', '..kkkkkk.f..', '..kssssk....', '..seskes..pp', '...ssms...pp',
    '..RRRRRR..pp', '.RRRYYRRRRw.', '.RRRRRRRR...', '..RRRRRR....', '..RRRRRR....', '...zz.zz....',
  ];
  var GIRL_SWING = [
    '..........pp', '...kkkk...pp', '..kkkkkk.fpp', '..kssssk.w..', '..seskes.w..',
    '...ssms.R...', '..RRRRRRR...', '.RRRYYRRR...', '..RRRRRR....', '..RRRRRR....', '...zz.zz....',
  ];
  var GIRL_SAD = [
    '............', '...kkkk.....', '..kkkkkk.f..', '..kssssk....', '..sossos....',
    '...swws...pp', '..RRRRRR..pp', '.RRRYYRRRRw.', '.RRRRRRRR...', '..RRRRRR....', '...zz.zz....',
  ];
  var GIRL_PAL = { k: '#1c1c24', f: '#f08ab0', s: '#f4d2b0', e: '#1c1c24', o: '#1c1c24', m: '#c83a3a', w: '#f4d2b0', R: '#c83a3a', Y: '#e8c84a', z: '#ffffff', p: '#a8743a' };
  var OPP_PAL = { k: '#3a2a1c', f: '#e8c84a', s: '#f4d2b0', e: '#1c1c24', o: '#1c1c24', m: '#c83a3a', w: '#f4d2b0', R: '#3a64b4', Y: '#f0f0f0', z: '#ffffff', p: '#a8743a' };
  var HANE = ['r.y', '.g.', '.k.'];
  var HANE_PAL = { r: '#e83a3a', y: '#f0d040', g: '#3ac06a', k: '#1c1c24' };

  function lerp(a, b, u) { return a + (b - a) * u; }

  function serve() {
    var k = Math.min(1, streak / 12);
    var lane = Math.floor(Math.random() * 3);
    if (rally && rally.lane === lane && Math.random() < 0.5) lane = (lane + 1 + Math.floor(Math.random() * 2)) % 3;
    rally = { phase: 'wind', t: 0, lane: lane, F: 1.25 - 0.5 * k, peak: 300 - 150 * k, u: 0 };
    oppSwingT = 0.25;
  }

  function resetRun() {
    rally = null; girlX = LANES[1]; girlTargetX = LANES[1]; swingT = 0; oppSwingT = 0;
    streak = 0; mult = 1; lastMult = 1; marks = 0; dropT = 0; dropPos = null; recoverT = 0; tileFlash = 0; breakT = 0;
    serve();
  }

  function initGame() {
    resetRun();
    score = 0; hits = 0; perfects = 0; bestStreak = 0; bestMult = 1;
    countIn = 0.8; over = false; won = false; endT = 0; prevBest = game.best; playT = 0;
  }

  function multFor(s) { return Math.min(5, 1 + Math.floor(s / 3)); }

  function shuttlePos() {
    if (!rally) return null;
    var lx = LANES[rally.lane];
    if (rally.phase === 'in') {
      var u = rally.u;
      var h = u <= 1 ? PADDLE_H + 4 * rally.peak * u * (1 - u) : PADDLE_H * Math.max(0, 1 - (u - 1) / 0.25);
      var uc = Math.min(u, 1.15);
      return { sx: lerp(OPP.x, lx, uc), sy: lerp(OPP.y, LANE_Y, uc), h: h };
    }
    if (rally.phase === 'back') {
      var b = rally.u;
      return { sx: lerp(rally.fromX, OPP.x, b), sy: lerp(LANE_Y, OPP.y, b), h: PADDLE_H + 4 * 220 * b * (1 - b) };
    }
    if (rally.phase === 'wind') return { sx: OPP.x, sy: OPP.y, h: PADDLE_H };
    return null;
  }

  function breakStreak(x, y) {
    var lost = multFor(streak);
    streak = 0; lastMult = 1; mult = 1;
    if (lost >= 2) {
      breakT = 0.45;
      game.audio.play('se_break', 0.4);
      game.feedback.bad(x, y, { text: 'x' + lost + ' → x1' });
    } else {
      game.feedback.bad(x, y, { text: 'MISS', shake: 0.06 });
    }
  }

  function swingAt(lane) {
    if (recoverT > 0 || dropT > 0) { game.audio.play('se_tap', 0.05); return; }
    girlTargetX = LANES[lane];
    swingT = 0.22;
    game.audio.play('se_tap', 0.12);
    if (rally && rally.phase === 'in' && rally.lane === lane) {
      var d = (rally.u - 1) * rally.F;      // 秒単位のずれ(負=早い)
      if (Math.abs(d) <= GOOD_W) { hitBack(Math.abs(d) <= PERFECT_W ? 'PERFECT' : 'GOOD'); return; }
    }
    // 空振り(列違い・早すぎ・羽根が来ていない)
    recoverT = 0.2;
    breakStreak(LANES[lane], LANE_Y - 220);
  }

  function hitBack(res) {
    streak++;
    bestStreak = Math.max(bestStreak, streak);
    mult = multFor(streak);
    bestMult = Math.max(bestMult, mult);
    var pts = (res === 'PERFECT' ? 100 : 50) * mult;
    if (state === S.PLAYING) { score += pts; hits++; if (res === 'PERFECT') perfects++; }
    var lx = LANES[rally.lane];
    tileFlash = 0.3;
    var scale = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19];
    game.audio.tone(523.3 * Math.pow(2, scale[Math.min(scale.length - 1, streak - 1)] / 12), 0.1, { wave: 'square', volume: 0.1 });
    game.feedback.good(lx, LANE_Y - 260, { text: res + ' +' + pts, color: res === 'PERFECT' ? C.gold : C.white, size: 48, count: 6 + mult * 3 });
    if (mult > lastMult) {
      lastMult = mult;
      game.audio.play(mult >= 5 ? 'se_powerup' : 'se_milestone', 0.45);
      game.fx.popup(mult >= 5 ? 'FEVER x5' : 'x' + mult, 900, Math.round(H * 0.2), { color: mult >= 5 ? C.red : C.plum, size: 90 + mult * 6 });
      if (mult >= 5) game.fx.flash(C.plum, 0.15);
    }
    rally = { phase: 'back', t: 0, u: 0, fromX: lx, lane: rally.lane };
  }

  function dropHane() {
    var p = shuttlePos();
    dropPos = { x: p.sx, y: p.sy };
    dropT = 0.45;          // hit-stop
    game.audio.tone(330, 0.14, { wave: 'sawtooth', volume: 0.12, slide: -160 });
    rally = { phase: 'down', t: 0, lane: rally.lane };
  }

  function afterDrop() {
    marks++;
    if (streak > 0) breakStreak(dropPos.x, dropPos.y - 200);
    else game.feedback.bad(dropPos.x, dropPos.y - 120, { text: 'MISS' });
    dropPos = null;
    if (state === S.PLAYING && marks >= MAX_MARKS) { over = true; won = false; finish(); return; }
    rally = { phase: 'wait', t: 0, lane: 1 };
  }

  function stepRally(dt) {
    if (breakT > 0) breakT -= dt;
    if (tileFlash > 0) tileFlash -= dt;
    if (swingT > 0) swingT -= dt;
    if (oppSwingT > 0) oppSwingT -= dt;
    if (recoverT > 0) recoverT -= dt;
    girlX += (girlTargetX - girlX) * Math.min(1, dt * 14);
    if (dropT > 0) {
      dropT -= dt;
      if (dropT <= 0) afterDrop();
      return;
    }
    if (!rally) return;
    rally.t += dt;
    if (rally.phase === 'wind' && rally.t >= 0.25) {
      rally.phase = 'in'; rally.t = 0; rally.u = 0;
      game.audio.tone(784, 0.05, { wave: 'square', volume: 0.08 });
    } else if (rally.phase === 'in') {
      rally.u = rally.t / rally.F;
      if (rally.u >= 1.25) dropHane();
    } else if (rally.phase === 'back') {
      rally.u = rally.t / 0.5;
      if (rally.u >= 1) serve();
    } else if (rally.phase === 'wait' && rally.t >= 0.5) {
      serve();
    }
  }

  // ── 描画 ──
  function isoFace(x0, y0, x1, y1, hgt, col) {
    var step = 6;
    for (var x = x0; x < x1; x += step) {
      var yt = y0 + (y1 - y0) * (x - x0) / (x1 - x0);
      game.draw.rect(x, yt, step + 1, hgt, col);
    }
  }
  function isoTop(cx, cy, a, b, col, alpha) {
    for (var y = -b; y < b; y += 5) {
      var hw = a * (1 - Math.abs(y + 2.5) / b);
      game.draw.rect(cx - hw, cy + y, hw * 2, 5, col, alpha);
    }
  }
  function house(cx, cy, flip) {
    // 軒の低い家: 左右の面(明度差)+屋根
    var a = 150, b = 75, hg = 260;
    isoFace(cx - a, cy - hg, cx, cy + b - hg, hg, flip ? C.wallDk : C.wall);
    isoFace(cx, cy + b - hg, cx + a, cy - hg, hg, flip ? C.wall : C.wallDk);
    isoTop(cx, cy - hg, a + 20, b + 10, C.roof, 1);
    // 門松
    var dx = flip ? -70 : 70;
    game.draw.rect(cx + dx - 14, cy - 10, 28, 70, C.pine);
    game.draw.rect(cx + dx - 6, cy - 50, 12, 60, '#7ab04a');
  }

  function drawStreet() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky], [0.16, '#c8d8ea'], [0.17, C.stone], [1, C.stoneDk]]);
    // 菱形グリッドの石畳
    for (var c = -1400; c < 2400; c += 90) {
      game.draw.line(0, c, W, c + W * 0.5, C.stoneDk, 3);
      game.draw.line(0, c, W, c - W * 0.5, C.stoneDk, 3);
    }
    game.draw.gradient(0, 320, [[0, C.sky], [1, '#c8d8ea']]);
    // 打ち合いの列(手前の3枚の石畳)
    for (var i = 0; i < 3; i++) {
      var target = rally && rally.phase === 'in' && rally.lane === i;
      var col = target ? C.gold : C.white;
      var al = target ? 0.35 + 0.2 * Math.sin(t * 14) : 0.14;
      if (target && Math.abs(rally.u - 1) * rally.F <= GOOD_W) { col = C.white; al = 0.9; }
      if (tileFlash > 0 && rally && rally.lane === i) { col = C.gold; al = 0.9; }
      isoTop(LANES[i], LANE_Y, 110, 55, col, al);
    }
    // 両脇の家と門松・梅の枝
    house(70, Math.round(H * 0.42), false);
    house(70, Math.round(H * 0.62), false);
    house(1010, Math.round(H * 0.42), true);
    house(1010, Math.round(H * 0.62), true);
    var bloom = Math.min(5, mult);
    game.draw.line(40, 372, 800, 330, '#5a3a2a', 8);
    for (var j = 0; j < 5; j++) {
      var bx = 120 + j * 150, by = 356 - j * 8 + Math.sin(t * 2 + j) * 4;
      game.draw.circle(bx, by, 16, j < bloom ? C.plum : '#9a8a8a', j < bloom ? 1 : 0.5);
      if (j < bloom) game.draw.circle(bx, by, 6, C.gold);
    }
  }

  function drawPeople() {
    var t = game.time.elapsed;
    // 向かいの子
    var os = oppSwingT > 0 ? GIRL_SWING : GIRL;
    game.draw.circle(OPP.x, OPP.y + 10, 46, C.ink, 0.25);
    game.draw.sprite(os, OPP_PAL, OPP.x, OPP.y - 60 + Math.sin(t * 3) * 3, 11, { anchor: 'center', flipX: true });
    // 自分
    var gs = (over && !won) || dropT > 0 ? GIRL_SAD : (swingT > 0 ? GIRL_SWING : GIRL);
    var gy = LANE_Y + 20;
    game.draw.circle(girlX, gy + 10, 50, C.ink, 0.25);
    var hop = mult >= 5 && state !== S.ATTRACT ? -Math.abs(Math.sin(t * 9)) * 10 : Math.sin(t * 3) * 3;
    game.draw.sprite(gs, GIRL_PAL, girlX, gy - 66 + hop, 12, { anchor: 'center' });
    // 墨の跡
    for (var m = 0; m < marks; m++) {
      var mx = girlX - 42 + m * 30, my = gy - 104 + hop + (m === 1 ? -14 : 0);
      game.draw.circle(mx, my, 11, C.ink, 0.9);
    }
  }

  function drawHane() {
    var p = shuttlePos();
    if (dropPos) {
      // hit-stop: 落ちた羽根を白く光らせて拡大
      game.draw.circle(dropPos.x, dropPos.y, 70, C.white, 0.7);
      game.draw.sprite(HANE, HANE_PAL, dropPos.x, dropPos.y - 10, 20, { anchor: 'center' });
      return;
    }
    if (!p) return;
    // 影(高さ=影との距離)
    game.draw.circle(p.sx, p.sy, 16, C.ink, 0.4);
    game.draw.line(p.sx, p.sy, p.sx, p.sy - p.h, C.ink, 2);
    var gold = mult >= 5 && state !== S.ATTRACT;
    if (gold) game.draw.circle(p.sx, p.sy - p.h, 30, C.gold, 0.4);
    game.draw.sprite(HANE, HANE_PAL, p.sx, p.sy - p.h, 14, { anchor: 'center' });
    // 合図の輪: 羽根子板の高さに下りるほど縮む
    if (rally.phase === 'in' && rally.u < 1.05) {
      var r = 60 + 160 * Math.max(0, 1 - rally.u);
      game.draw.circle(LANES[rally.lane], LANE_Y - PADDLE_H, r, C.white, 0.12);
      game.draw.circle(LANES[rally.lane], LANE_Y - PADDLE_H, 22, C.white, 0.5);
    }
  }

  function drawBadge() {
    var bx = 930, by = Math.round(H * 0.155);
    var sh = breakT > 0 ? Math.sin(breakT * 60) * 10 : 0;
    for (var i = 0; i < 5; i++) {
      var a = -Math.PI / 2 + i * Math.PI * 2 / 5;
      game.draw.circle(bx + sh + Math.cos(a) * 46, by + Math.sin(a) * 46, 32, i < mult ? C.plum : '#c8c0c0');
    }
    game.draw.circle(bx + sh, by, 38, C.gold);
    label('x' + mult, bx + sh, by + 16, 48, C.ink);
    var into = streak % 3;
    for (var j = 0; j < 3; j++) game.draw.circle(bx - 36 + j * 36, by + 100, 10, mult >= 5 || j < into ? C.red : '#00000033');
  }

  function hud() {
    label(String(score), 300, 110, 72, C.ink);
    // 墨の残り(羽根3枚)
    for (var i = 0; i < MAX_MARKS; i++) {
      var used = i < marks;
      game.draw.sprite(HANE, HANE_PAL, 90 + i * 60, 170, 8, { anchor: 'center', alpha: used ? 0.2 : 1 });
    }
    // 旗までの点数ゲージ + 残り時間
    var gx = 260, gw = 520, gy = 158;
    game.draw.rect(gx, gy, gw, 22, '#00000033');
    game.draw.rect(gx, gy, gw * Math.min(1, score / (QUOTA * 1.8)), 22, score >= QUOTA ? C.gold : C.red);
    var fx = gx + gw / 1.8;
    game.draw.rect(fx - 3, gy - 26, 6, 52, C.ink);
    game.draw.rect(fx, gy - 26, 34, 20, C.red);
    var timeBar = Math.max(0, 1 - playT / TIME_LIMIT);
    game.draw.rect(gx, 196, gw * timeBar, 10, timeBar < 0.25 ? C.red : C.blue);
  }

  function drawWorld() { drawStreet(); drawPeople(); drawHane(); drawBadge(); }

  // ── 入力 ──
  function laneOf(x) { return x < W / 3 ? 0 : (x < W * 2 / 3 ? 1 : 2); }
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || countIn > 0) { game.audio.play('se_tap', 0.05); return; }
    swingAt(laneOf(x));
  });

  // ── ATTRACT: 実ロジックで3回続けて返して倍率x2、4本目は早打ちで空振りして倍率が割れ、羽根を落として墨が付く ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.85, press: false, n: 0, whiffed: false, resetT: 0 };
  function demoStep(dt) {
    demo.t += dt;
    if (demo.t <= dt) { resetRun(); streak = 2; mult = 1; lastMult = 1; demo.n = 0; demo.whiffed = false; demo.resetT = 0; }
    if (demo.resetT > 0) { demo.resetT -= dt; if (demo.resetT <= 0) demo.t = 0; }
    stepRally(dt);
    demo.press = false;
    if (rally && rally.phase === 'in') {
      var tx = LANES[rally.lane], ty = LANE_Y + 60;
      demo.gx += (tx - demo.gx) * Math.min(1, dt * 8); demo.gy += (ty - demo.gy) * Math.min(1, dt * 8);
      var d = (rally.u - 1) * rally.F;
      if (demo.n < 3) {
        if (d > -0.1) demo.press = true;
        if (d >= -0.01) { swingAt(rally.lane); demo.n++; }
      } else if (!demo.whiffed && d > -0.5) {
        demo.press = true; swingAt(rally.lane); demo.whiffed = true;
      }
    }
    if (marks > 0 && demo.resetT <= 0 && dropT <= 0) { demo.resetT = 0.9; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!rally && !dropPos) initGame();
      demoStep(dt);
      drawWorld();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      label(GAME_TITLE, W / 2, 110, 92, C.red);
      label('HI-SCORE ' + game.best, W / 2, 180, 38, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, 1860, 44, C.red);
      else label('TAP TO START', W / 2, 1860, 42, C.ink);
      return;
    }

    if (state === S.RESULT) {
      drawWorld();
      game.draw.rect(0, 250, W, 360, C.white, 0.7);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, 340, 100, won ? C.red : C.ink);
      label('SCORE ' + score, W / 2, 420, 58, C.ink);
      label('COMBO ' + bestStreak + '  x' + bestMult + '  PERFECT ' + perfects, W / 2, 480, 36, C.blue);
      if (score > prevBest && prevBest > 0) label('NEW RECORD', W / 2, 560, 52, C.red);
      else label('BEST ' + Math.max(prevBest, score), W / 2, 560, 42, C.ink);
      if (!won && score < QUOTA) label('あと' + (QUOTA - score) + '点!', W / 2, 1050, 60, C.red);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, 1860, 40, C.ink);
      return;
    }

    // ── PLAYING ──
    if (endT > 0) {
      endT -= dt;
      if (endT <= 0) {
        state = S.RESULT;
        var stats = { hits: hits, perfect: perfects, maxCombo: bestStreak, maxMult: bestMult, marks: marks };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (countIn > 0) {
      countIn -= dt;
      if (countIn <= 0) game.audio.play('se_tap', 0.3);
    } else if (!over) {
      playT += dt;
      stepRally(dt);
      if (!over && playT >= TIME_LIMIT && dropT <= 0) {
        over = true; won = score >= QUOTA && marks < MAX_MARKS;
        if (!won) game.feedback.bad(W / 2, 170, { text: 'TIME UP' });
        finish();
      }
    }

    drawWorld();
    hud();
    if (countIn > 0) label(countIn > 0.35 ? 'READY?' : 'GO!', W / 2, Math.round(H * 0.5), 120, C.red);
  });

  function finish() {
    if (endT > 0) return;
    endT = 1.4;
    game.audio.stopBgm();
    game.audio.play(won ? 'se_success' : 'se_failure', 0.55);
    if (won) for (var i = 0; i < 7; i++) game.fx.burst(game.random(140, 940), game.random(380, 1300), { color: i % 2 ? C.plum : C.gold, count: 22, speed: 460 });
  }

  // 正月の路地の手まり唄風(オリジナル)
  var TUNE = [
    ['A4', 0.5], ['C5', 0.5], ['D5', 1], ['C5', 0.5], ['A4', 0.5], ['G4', 1],
    ['A4', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['D5', 2],
    ['E5', 0.5], ['D5', 0.5], ['C5', 1], ['A4', 0.5], ['G4', 0.5], ['A4', 2],
  ];
  var TUNE_OPTS = { tempo: 132, wave: 'triangle', volume: 0.06, loop: true, bass: [['A2', 1], ['E3', 1], ['D3', 1], ['E3', 1]] };

  game.onStart(function() {
    game.audio.melody(TUNE, TUNE_OPTS);
    state = S.ATTRACT;
    initGame();
  });
})(game);

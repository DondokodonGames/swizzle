// I-Wii-0009v2-lunch-okamochi-run.js
// 昼どき岡持ち走り — 出前持ちがラーメンの岡持ちを抱えてオフィス街を走り続け、上り段とコーンだけをタップで跳び越え、下り段は跳ばずに降りてスープをこぼさず届ける
// 操作: 走りは自動。タップで跳ぶ(地面にいる時だけ)。上り段(縁が黄色く点滅)とコーン・立て看板は跳び越える。ぶつかるとつまずいてスープが大きくこぼれる。跳んで着地するとスープが少し揺れ、下り段を跳んで降りると高い所から落ちてスープが多くこぼれる。縁のぎりぎりで跳ぶほど高得点
// 終わり: スープを残したまま20秒以内に配達先のビルに着けばCLEAR(残ったスープ%と跳び方の点がスコア)。スープが空になる/時間切れでGAME OVER
// @mechanic: camera_run
// @theme: office_lunch_delivery_run
// 世界観: 昼どきのオフィス街で、出前持ちがラーメンの入った岡持ちを抱えて歩道の段差とコーンを跳び越え、スープをこぼさないまま配達先のビルまで走り抜ける
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア(残ったスープ%・PERFECT跳び数・つまずき数)
// スタイル: 70s VECTOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 黒地に発光する線画だけ。太い暗線+細い明線の重ねで発光を作る
  var STYLE = { bg: ['#000008', '#020a1a', '#04142a'], main: ['#4cff9a', '#5ad8ff', '#ffc84a'], accent: ['#ff4a5a', '#ffffff'] };
  var C = {
    black: STYLE.bg[0], navy: STYLE.bg[1], navy2: STYLE.bg[2], green: STYLE.main[0], cyan: STYLE.main[1], amber: STYLE.main[2],
    red: STYLE.accent[0], white: STYLE.accent[1], greenDim: '#145a34', cyanDim: '#16485a', amberDim: '#5a4214', redDim: '#5a1820',
  };

  var GAME_TITLE = 'LUNCH RUN';
  var TIME_LIMIT = 20;
  var COURSE = 7200;
  var STEP_H = 70, OBST_H = 80, OBST_HALF = 30, RUN_HALF = 26;
  var GRAV = 3000, JUMP_V = 1150;
  var RUN_X = 280;
  var GROUND0 = Math.round(H * 0.68);

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var course, runner, soup, trips, perfects, jumpInfo, stopT, stopFeat, spillT, flashFeat;
  var score, countIn, over, won, endT, prevBest, playT, timeUp, halfShown;

  function label(str, x, y, sz, color) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }
  function glow(x1, y1, x2, y2, bright, dim, w) {
    game.draw.line(x1, y1, x2, y2, dim, (w || 3) + 8);
    game.draw.line(x1, y1, x2, y2, bright, w || 3);
  }

  // 出前持ち(白い鉢巻・発光線のドット)と岡持ち: 走り2コマ/跳び/つまずき
  var RUNNER = [
    ['...ggg.....', '..gwwwg....', '..g.e.g....', '...ggg.....', '....g......', '..gggg.aaaa', '.g..g..a..a', '....g..aaaa', '....g......', '...g.g.....', '..g...g....', '.g.....g...', 'g.......g..'],
    ['...ggg.....', '..gwwwg....', '..g.e.g....', '...ggg.....', '....g......', '..gggg.aaaa', '.g..g..a..a', '....g..aaaa', '....g......', '....gg.....', '...g..g....', '...g..g....', '..g...g....'],
    ['...ggg..aaaa', '..gwwwg.a..a', '..g.e.g.aaaa', '...ggg..g...', '....g..g....', '..ggggg.....', '.g..g.......', '....g.......', '...ggg......', '..g...g.....', '..g...g.....', '...g...g....', '............'],
    ['............', '.....ggg....', '....gwwwg...', '....gx.xg...', '.....ggg....', '...gggg..aaa', '..g..g...a.a', '..gggg....aa', '.g...g......', 'g.....g.....', '.......g....', '............', '............'],
  ];
  var RUN_PAL = { g: '#4cff9a', w: '#ffffff', e: '#ffffff', x: '#ff4a5a', a: '#ffc84a' };

  function buildCourse(demo) {
    var f = [], x = 900, level = 0, n = 0;
    if (demo) {
      return [{ x: 760, type: 'up' }, { x: 1320, type: 'down' }, { x: 1880, type: 'cone' }, { x: 2440, type: 'up' }, { x: 3000, type: 'board' }];
    }
    while (x < COURSE - 700) {
      var opts = ['cone', 'board'];
      if (level < 3) opts.push('up', 'up');
      if (level > 0) opts.push('down', 'down');
      var tp = opts[Math.floor(Math.random() * opts.length)];
      if (n < 2) tp = n === 0 ? 'cone' : 'up';
      f.push({ x: x, type: tp });
      if (tp === 'up') level++;
      if (tp === 'down') level--;
      x += game.random(520, 760) - Math.min(140, n * 8);
      n++;
    }
    return f;
  }

  function groundAt(wx) {
    var lv = 0;
    for (var i = 0; i < course.length; i++) {
      var f = course[i];
      if (f.x > wx) break;
      if (f.type === 'up') lv++;
      else if (f.type === 'down') lv--;
    }
    return lv * STEP_H;
  }

  function resetRun(demo) {
    course = buildCourse(demo);
    runner = { wx: 0, h: 0, vy: 0, air: false, peak: 0, stumble: 0, v: 440 };
    soup = 100; trips = 0; perfects = 0; jumpInfo = null; stopT = 0; stopFeat = null; spillT = 0; flashFeat = null;
  }

  function initGame() {
    resetRun(false);
    score = 0; countIn = 0.8; over = false; won = false; endT = 0; prevBest = game.best; playT = 0; timeUp = false; halfShown = false;
  }

  // ── 走りのロジック(本番・デモ共通) ──
  function nextFeature(wx) {
    for (var i = 0; i < course.length; i++) if (course[i].x + OBST_HALF > wx) return course[i];
    return null;
  }

  function jump() {
    if (runner.air || stopT > 0) return false;
    runner.air = true; runner.vy = JUMP_V; runner.peak = runner.h;
    var nf = nextFeature(runner.wx);
    jumpInfo = null;
    if (nf && nf.type !== 'down') {
      var edge = nf.type === 'up' ? nf.x : nf.x - OBST_HALF;
      var D = edge - (runner.wx + RUN_HALF);
      if (D >= 0 && D < 420) jumpInfo = { f: nf, D: D };
    }
    game.audio.play('se_jump', 0.4);
    return true;
  }

  function spill(amount, x, y) {
    soup = Math.max(0, soup - amount);
    spillT = 0.4;
    game.fx.burst(x, y, { color: C.amber, count: Math.round(4 + amount / 3), speed: 200 + amount * 6 });
  }

  function trip(f) {
    trips++; jumpInfo = null;
    runner.air = false; runner.vy = 0; runner.h = groundAt(runner.wx); runner.stumble = 0.5;
    flashFeat = f;
    var sx = RUN_X, sy = GROUND0 - runner.h - 120;
    spill(30, sx + 40, sy);
    game.audio.play('se_break', 0.45);
    if (f) f.hit = true;
    if (state === S.PLAYING && soup <= 0) { stopT = 0.45; stopFeat = f; return; }
    stopT = 0.16;
    game.feedback.bad(sx, sy - 60, { text: 'MISS' });
  }

  function stepRunner(dt) {
    if (spillT > 0) spillT -= dt;
    if (runner.stumble > 0) runner.stumble -= dt;
    var v = runner.v * (runner.stumble > 0 ? 0.45 : 1);
    var prevG = groundAt(runner.wx);
    runner.wx += v * dt;
    var g = groundAt(runner.wx);
    if (runner.air) {
      runner.h += runner.vy * dt;
      runner.vy -= GRAV * dt;
      runner.peak = Math.max(runner.peak, runner.h);
      if (g > prevG && runner.h < g) { trip(null); return; }
      if (runner.h <= g && runner.vy < 0) {
        var fall = runner.peak - g;
        runner.air = false; runner.h = g;
        if (fall > 250) {
          spill(12, RUN_X + 40, GROUND0 - g - 120);
          game.feedback.bad(RUN_X, GROUND0 - g - 200, { text: 'MISS', shake: 0.06 });
        } else {
          spill(2, RUN_X + 40, GROUND0 - g - 120);
          game.audio.tone(330, 0.04, { wave: 'triangle', volume: 0.06 });
        }
      }
    } else {
      if (g > prevG + 1) { trip(null); return; }
      runner.h = g;             // 下り段は跳ばずにそのまま降りる
    }
    // コーン・立て看板
    for (var i = 0; i < course.length; i++) {
      var f = course[i];
      if (f.type !== 'cone' && f.type !== 'board') continue;
      if (f.hit || f.x - OBST_HALF > runner.wx + RUN_HALF || f.x + OBST_HALF < runner.wx - RUN_HALF) continue;
      if (runner.h - groundAt(f.x) < OBST_H) { trip(f); return; }
    }
    // 跳び越えた判定(縁ぎりぎりほど高得点)
    if (jumpInfo && runner.wx - RUN_HALF > jumpInfo.f.x + OBST_HALF) {
      var res = jumpInfo.D <= 120 ? 'PERFECT' : 'GOOD';
      var pts = res === 'PERFECT' ? 150 : 60;
      if (state === S.PLAYING) { score += pts; if (res === 'PERFECT') perfects++; }
      game.feedback.good(RUN_X + 60, GROUND0 - runner.h - 260, { text: res + ' +' + pts, color: res === 'PERFECT' ? C.amber : C.green, size: 46, count: 8 });
      jumpInfo = null;
    }
  }

  // ── 描画(線画) ──
  function sx(wx) { return RUN_X + (wx - runner.wx); }

  function drawCity() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.black], [0.5, C.navy], [1, C.navy2]]);
    for (var s = 0; s < 30; s++) game.draw.rect((s * 197) % W, 260 + (s * 89) % 420, 3, 3, C.white, 0.5);
    // 遠景ビル(ゆっくり)
    var off1 = (runner.wx * 0.2) % 360;
    for (var b = -1; b < 5; b++) {
      var bx = b * 360 - off1, bh = 300 + ((b + 9) % 3) * 90, top = GROUND0 - 260 - bh;
      glow(bx, top, bx + 220, top, C.cyan, C.cyanDim, 2);
      glow(bx, top, bx, GROUND0 - 260, C.cyan, C.cyanDim, 2);
      glow(bx + 220, top, bx + 220, GROUND0 - 260, C.cyan, C.cyanDim, 2);
      for (var wy = top + 40; wy < GROUND0 - 300; wy += 70) game.draw.line(bx + 40, wy, bx + 180, wy, C.cyanDim, 2);
    }
    // 近景の街路樹(速め)
    var off2 = (runner.wx * 0.55) % 300;
    for (var tr = -1; tr < 5; tr++) {
      var tx = tr * 300 - off2 + 120, ty = GROUND0 - 300;
      game.draw.line(tx, ty + 120, tx, ty + 200, C.greenDim, 6);
      for (var k = 0; k < 6; k++) { var a = k / 6 * Math.PI * 2 + t * 0.2; game.draw.line(tx, ty + 80, tx + Math.cos(a) * 60, ty + 80 + Math.sin(a) * 50, C.greenDim, 4); }
    }
  }

  function drawGround() {
    var wx0 = runner.wx - RUN_X - 40, wx1 = wx0 + W + 80;
    var lv = groundAt(wx0), x = wx0;
    var t = game.time.elapsed;
    for (var i = 0; i < course.length; i++) {
      var f = course[i];
      if (f.x <= wx0) continue;
      if (f.x > wx1) break;
      if (f.type === 'up' || f.type === 'down') {
        var y = GROUND0 - lv;
        glow(sx(x), y, sx(f.x), y, C.green, C.greenDim, 4);
        var nlv = lv + (f.type === 'up' ? STEP_H : -STEP_H);
        var blink = f.type === 'up' && Math.floor(t * 8) % 2 === 0;
        var hl = f === flashFeat && stopT > 0;
        glow(sx(f.x), y, sx(f.x), GROUND0 - nlv, hl ? C.white : (f.type === 'up' ? (blink ? C.amber : C.green) : C.green), f.type === 'up' ? C.amberDim : C.greenDim, hl ? 8 : 4);
        if (f.type === 'up') { glow(sx(f.x) - 30, GROUND0 - nlv - 50, sx(f.x), GROUND0 - nlv - 80, C.amber, C.amberDim, 3); glow(sx(f.x) + 30, GROUND0 - nlv - 50, sx(f.x), GROUND0 - nlv - 80, C.amber, C.amberDim, 3); }
        lv = nlv; x = f.x;
      }
    }
    glow(sx(x), GROUND0 - lv, W + 40, GROUND0 - lv, C.green, C.greenDim, 4);
    // 歩道の目地(地面の下の縦線)
    var off = runner.wx % 90;
    for (var gx = -off; gx < W; gx += 90) game.draw.line(gx, GROUND0 + 20, gx - 40, GROUND0 + 120, C.greenDim, 2);
    game.draw.line(0, GROUND0 + 130, W, GROUND0 + 130, C.greenDim, 2);
    // 手前の車道(中央線が流れる)
    var roadY = Math.round(H * 0.83);
    glow(0, roadY - 90, W, roadY - 90, C.cyan, C.cyanDim, 2);
    var doff = (runner.wx * 1.2) % 160;
    for (var dx = -doff; dx < W; dx += 160) glow(dx, roadY, dx + 80, roadY, C.amber, C.amberDim, 4);
    glow(0, roadY + 90, W, roadY + 90, C.cyan, C.cyanDim, 2);
  }

  function drawObstacles() {
    var t = game.time.elapsed;
    for (var i = 0; i < course.length; i++) {
      var f = course[i];
      if (f.type !== 'cone' && f.type !== 'board') continue;
      var x = sx(f.x);
      if (x < -100 || x > W + 100) continue;
      var gy = GROUND0 - groundAt(f.x);
      var hl = f === flashFeat && stopT > 0;
      var sc = hl ? 1.35 : 1;
      var col = hl ? C.white : C.red;
      if (f.hit) { glow(x - 40, gy, x + 40, gy - 20, C.redDim, C.redDim, 3); continue; }
      if (f.type === 'cone') {
        glow(x - 34 * sc, gy, x, gy - OBST_H * sc, col, C.redDim, 4);
        glow(x, gy - OBST_H * sc, x + 34 * sc, gy, col, C.redDim, 4);
        glow(x - 20 * sc, gy - 34 * sc, x + 20 * sc, gy - 34 * sc, C.white, C.redDim, 3);
        glow(x - 44, gy, x + 44, gy, col, C.redDim, 4);
      } else {
        glow(x - 34 * sc, gy, x - 10 * sc, gy - OBST_H * sc, C.amber, C.amberDim, 4);
        glow(x + 34 * sc, gy, x + 10 * sc, gy - OBST_H * sc, C.amber, C.amberDim, 4);
        glow(x - 22 * sc, gy - 40 * sc, x + 22 * sc, gy - 40 * sc, hl ? C.white : C.amber, C.amberDim, 4);
      }
      // 迫ってくる障害物の頭上に予告の点滅
      if (x > RUN_X + 80 && x < RUN_X + 520 && Math.floor(t * 8) % 2 === 0) game.draw.circle(x, gy - OBST_H - 40, 8, C.red);
    }
  }

  function drawGoal() {
    var gx = sx(COURSE), gy = GROUND0 - groundAt(COURSE);
    if (gx > W + 300) return;
    glow(gx, gy, gx, gy - 520, C.cyan, C.cyanDim, 4);
    glow(gx + 300, gy, gx + 300, gy - 520, C.cyan, C.cyanDim, 4);
    glow(gx, gy - 520, gx + 300, gy - 520, C.cyan, C.cyanDim, 4);
    glow(gx + 110, gy, gx + 110, gy - 150, C.amber, C.amberDim, 3);
    glow(gx + 190, gy, gx + 190, gy - 150, C.amber, C.amberDim, 3);
    glow(gx + 110, gy - 150, gx + 190, gy - 150, C.amber, C.amberDim, 3);
    glow(gx + 150, gy - 520, gx + 150, gy - 640, C.white, C.cyanDim, 3);
    glow(gx + 150, gy - 640, gx + 230, gy - 615, C.amber, C.amberDim, 4);
    glow(gx + 230, gy - 615, gx + 150, gy - 590, C.amber, C.amberDim, 4);
  }

  function drawRunner() {
    var t = game.time.elapsed;
    var fr = RUNNER[Math.floor(t * 10) % 2];
    if (runner.air) fr = RUNNER[2];
    if (runner.stumble > 0 || (over && !won)) fr = RUNNER[3];
    var y = GROUND0 - runner.h - 70;
    var lean = runner.stumble > 0 ? Math.sin(t * 40) * 4 : 0;
    var sc = stopT > 0 && soup <= 0 ? 13 : 11;
    if (stopT > 0 && soup <= 0) game.draw.circle(RUN_X, y, 110, C.white, 0.4);
    game.draw.sprite(fr, RUN_PAL, RUN_X + lean, y, sc, { anchor: 'center' });
    // 岡持ちのスープの揺れ
    if (spillT > 0) for (var k = 0; k < 3; k++) game.draw.circle(RUN_X + 50 + k * 14, y - 60 - spillT * 80 * (k + 1), 6, C.amber);
  }

  function drawBowlMeter() {
    // 左上: 丼の線画とスープの水位
    var cx = 150, cy = 150, r = 70;
    for (var i = 0; i < 12; i++) {
      var a0 = i / 12 * Math.PI, a1 = (i + 1) / 12 * Math.PI;
      glow(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r * 0.8, cx + Math.cos(a1) * r, cy + Math.sin(a1) * r * 0.8, C.white, C.cyanDim, 3);
    }
    glow(cx - r - 10, cy, cx + r + 10, cy, C.white, C.cyanDim, 3);
    var lvl = soup / 100;
    var wob = spillT > 0 ? Math.sin(game.time.elapsed * 40) * 10 : 0;
    for (var s = 0; s < lvl * 6; s++) {
      var yy = cy + r * 0.8 - 8 - s * 9;
      var half = Math.sqrt(Math.max(0, 1 - Math.pow((yy - cy) / (r * 0.8), 2))) * r - 6;
      if (yy > cy) game.draw.line(cx - half, yy + (s === Math.floor(lvl * 6) - 1 ? wob * 0.3 : 0), cx + half, yy - (s === Math.floor(lvl * 6) - 1 ? wob * 0.3 : 0), soup < 35 ? C.red : C.amber, 5);
    }
    label(Math.round(soup) + '%', cx, cy + 100, 40, soup < 35 ? C.red : C.amber);
  }

  function hud() {
    drawBowlMeter();
    label(String(score), W / 2, 110, 64, C.white);
    // 配達先までの道のり(旗)
    var gx = 330, gw = 640, gy = 190;
    glow(gx, gy, gx + gw, gy, C.greenDim, C.black, 4);
    var p = Math.min(1, runner.wx / COURSE);
    glow(gx, gy, gx + gw * p, gy, C.green, C.greenDim, 6);
    glow(gx + gw, gy, gx + gw, gy - 50, C.white, C.cyanDim, 3);
    glow(gx + gw, gy - 50, gx + gw + 40, gy - 38, C.amber, C.amberDim, 4);
    var timeBar = Math.max(0, 1 - playT / TIME_LIMIT);
    game.draw.line(gx, 222, gx + gw * timeBar, 222, timeBar < 0.25 ? C.red : C.cyan, 6);
  }

  function drawWorld() { drawCity(); drawGround(); drawGoal(); drawObstacles(); drawRunner(); }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || countIn > 0 || stopT > 0) { game.audio.play('se_tap', 0.05); return; }
    if (!jump()) { game.audio.play('se_tap', 0.06); game.fx.burst(RUN_X, GROUND0 - runner.h - 40, { color: C.green, count: 3, speed: 80 }); }
  });

  // ── ATTRACT: 実ロジックで上り段を縁ぎりぎりで跳ぶ → 下り段をわざと跳んで降りスープがこぼれる → コーン・上り段・看板を跳ぶ ──
  var demo = { t: 0, gx: W * 0.7, gy: H * 0.82, press: 0 };
  function demoStep(dt) {
    demo.t += dt;
    if (demo.t <= dt) { resetRun(true); }
    if (stopT > 0) { stopT -= dt; } else stepRunner(dt);
    if (demo.press > 0) demo.press -= dt;
    var nf = nextFeature(runner.wx);
    if (nf && !runner.air) {
      var edge = nf.type === 'up' ? nf.x : nf.x - OBST_HALF;
      var D = edge - (runner.wx + RUN_HALF);
      // 下り段は悪い例としてわざと跳ぶ
      if ((nf.type === 'down' && D < 60 && D > 0) || (nf.type !== 'down' && D < 80 && D > 30)) { jump(); demo.press = 0.2; }
    }
    if (runner.wx > 3300) demo.t = 0;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!course) initGame();
      demoStep(dt);
      drawWorld();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 14 });
      drawBowlMeter();
      label(GAME_TITLE, W / 2, Math.round(H * 0.16), 100, C.amber);
      label('HI-SCORE ' + game.best, W / 2, Math.round(H * 0.2), 38, C.cyan);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, 1880, 44, C.amber);
      else label('TAP TO START', W / 2, 1880, 42, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawWorld();
      label(won ? 'CLEAR' : (timeUp ? 'TIME UP' : 'GAME OVER'), W / 2, 380, 100, won ? C.green : C.red);
      label('SCORE ' + score, W / 2, 460, 58, C.white);
      label(Math.round(soup) + '%  PERFECT ' + perfects, W / 2, 520, 40, C.amber);
      if (score > prevBest && prevBest > 0) label('NEW RECORD', W / 2, 590, 52, C.amber);
      else label('BEST ' + Math.max(prevBest, score), W / 2, 590, 42, C.cyan);
      if (!won) label('あと' + Math.max(1, Math.round((COURSE - runner.wx) / 100)) + 'm!', W / 2, 700, 60, C.red);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, 1880, 40, C.white);
      return;
    }

    // ── PLAYING ──
    if (endT > 0) {
      endT -= dt;
      if (endT <= 0) {
        state = S.RESULT;
        var stats = { soup: Math.round(soup), perfect: perfects, trips: trips };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0 && soup <= 0) {
        // hit-stop の後: ぶつかった物と空の丼を見せてから終わる
        game.feedback.bad(RUN_X, GROUND0 - runner.h - 220, { text: 'GAME OVER' });
        over = true; won = false; finish();
      }
    } else if (countIn > 0) {
      countIn -= dt;
      if (countIn <= 0) game.audio.play('se_tap', 0.3);
    } else if (!over) {
      playT += dt;
      runner.v = 440 + Math.min(1, playT / TIME_LIMIT) * 90;
      stepRunner(dt);
      if (!halfShown && runner.wx >= COURSE / 2) {
        halfShown = true;
        game.audio.play('se_milestone', 0.45);
        game.fx.popup(Math.round(soup) + '%', W / 2, Math.round(H * 0.3), { color: C.amber, size: 84 });
      }
      if (stopT <= 0 && runner.wx >= COURSE && soup > 0) {
        over = true; won = true;
        score += Math.round(soup) * 10;
        game.audio.play('se_coin', 0.5);
        finish();
      } else if (stopT <= 0 && playT >= TIME_LIMIT) {
        over = true; won = false; timeUp = true;
        game.feedback.bad(RUN_X, GROUND0 - runner.h - 220, { text: 'TIME UP' });
        finish();
      }
    }

    drawWorld();
    hud();
    if (countIn > 0) label(countIn > 0.35 ? 'READY?' : 'GO!', W / 2, Math.round(H * 0.42), 120, C.amber);
  });

  function finish() {
    if (endT > 0) return;
    endT = 1.4;
    game.audio.stopBgm();
    game.audio.play(won ? 'se_success' : 'se_failure', 0.55);
    if (won) for (var i = 0; i < 7; i++) game.fx.burst(game.random(140, 940), game.random(400, 1200), { color: i % 2 ? C.green : C.amber, count: 22, speed: 460 });
  }

  // 昼休みの駆け足マーチ(オリジナル)
  var TUNE = [
    ['G4', 0.5], ['G4', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 1], ['D5', 0.5], ['C5', 0.5],
    ['A4', 0.5], ['C5', 0.5], ['D5', 1], ['G4', 1], ['R', 0.5], ['G4', 0.5],
  ];
  var TUNE_OPTS = { tempo: 152, wave: 'square', volume: 0.05, loop: true, bass: [['C3', 0.5], ['G2', 0.5], ['C3', 0.5], ['G2', 0.5], ['F2', 0.5], ['C3', 0.5], ['G2', 1]] };

  game.onStart(function() {
    game.audio.melody(TUNE, TUNE_OPTS);
    state = S.ATTRACT;
    initGame();
  });
})(game);

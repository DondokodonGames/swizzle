// I-Switch-0002v2-ranch-ring-fence-rounds.js
// 牧場フェンスラウンド — 見習い騎手の馬が馬場を走り続け、次々現れる柵の手前でタップして跳び越える。柵の幅と形で踏み切る場所が変わる
// 操作: 走りは自動。タップで跳ぶ(地面にいる時だけ。跳ぶ高さと幅は毎回同じ)。白い柵は手前のどこから跳んでも越えやすいが、2本組の幅広柵(オクサー)は遠くから跳ぶと2本目にかかり、水濠は近くから跳ばないと着地が水に入る。横木に脚がかかると横木が落ちて減点(3本落とすとGAME OVER)。柵に正面からぶつかる(低すぎる位置で当たる)とその場でGAME OVER
// 終わり: 20秒以内に10個の障害を越えてゴール旗を通ればCLEAR(越えた障害・落とさなかった横木・残り時間の点)。横木3本落とす/柵に激突/時間切れでGAME OVER
// @mechanic: camera_run
// @theme: ranch_ring_fence_rounds
// 世界観: 秋の牧場の馬場で、初めてコースを任された見習い騎手が栗毛の馬を走らせ、白い柵・幅広のオクサー・水濠を次々と跳び越えて、落ち葉の舞うゴール旗を目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・越えた障害数・落とした横木数・残り秒数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: パステル色 + 白縁の丸い形。上に情報、下に操作ボタンと画面を分ける
  var STYLE = { bg: ['#fff6ea', '#ffe6c8', '#ffd5ae'], main: ['#f7a8c4', '#a9d8f2', '#c6e5a2'], accent: ['#ffffff', '#f06a7a'] };
  var C = {
    sky: STYLE.bg[0], sky2: STYLE.bg[1], sky3: STYLE.bg[2], pink: STYLE.main[0], blue: STYLE.main[1], green: STYLE.main[2],
    white: STYLE.accent[0], red: STYLE.accent[1], ink: '#5a4a5a', horse: '#c99a6c', horse2: '#8a5e3c', mane: '#5a3a2a', sand: '#f3dfc0', sand2: '#e8cfa8',
    leaf: '#f0a060', gold: '#ffc84a', water: '#8ccbe8', ok: '#7ad08a',
  };

  var GAME_TITLE = 'FENCE ROUNDS';
  var TIME_LIMIT = 20;
  var FENCES = 10;
  var RAILS = 3;
  var GRAV = 3000, JUMP_V = 1200;
  var RUN_X = 300, HORSE_HALF = 60;
  var GROUND = Math.round(H * 0.66);
  var RAIL_H = 110;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var course, goalX, wx, h, vy, air, speed, playT, readyT, stopT, focus, pressT;
  var rails, score, cleared, streak, maxStreak, over, won, outroT, milestone, prevBest, crashed;

  function buildCourse(demo) {
    var f = [], x = 1100;
    var order = demo ? ['vertical', 'oxer', 'vertical', 'water', 'oxer', 'vertical', 'water', 'oxer', 'vertical', 'oxer']
      : ['vertical', 'vertical', 'oxer', 'vertical', 'water', 'oxer', 'vertical', 'water', 'oxer', 'oxer'];
    for (var i = 0; i < FENCES; i++) {
      var tp = order[i];
      if (!demo && i >= 3 && game.random(0, 1) < 0.35) tp = ['vertical', 'oxer', 'water'][Math.floor(game.random(0, 3))];
      var wdt = tp === 'vertical' ? 0 : (tp === 'oxer' ? 130 : 260);
      f.push({ i: i, x: x, type: tp, w: wdt, state: 0, flash: 0, judged: false });
      x += (demo ? 760 : game.random(720, 900) - i * 18) + wdt;
    }
    goalX = x + 300;
    return f;
  }

  function initGame(demo) {
    course = buildCourse(demo);
    wx = 0; h = 0; vy = 0; air = false; speed = 520; playT = 0; readyT = demo ? 0 : 0.8; stopT = 0; focus = null; pressT = 0;
    rails = RAILS; score = 0; cleared = 0; streak = 0; maxStreak = 0; over = false; won = false; outroT = 0; milestone = false;
    prevBest = game.best; crashed = false;
  }

  function nextFence() {
    for (var i = 0; i < course.length; i++) if (!course[i].judged && course[i].x + course[i].w + 40 > wx - HORSE_HALF) return course[i];
    return null;
  }

  function jump() {
    if (air || stopT > 0) return false;
    air = true; vy = JUMP_V;
    game.audio.play('se_jump', 0.35);
    return true;
  }

  function knockRail(f, demo) {
    f.state = 1; f.flash = 0.5; streak = 0;
    game.feedback.bad(RUN_X + 80, GROUND - RAIL_H - 60, { text: 'MISS', shake: demo ? 4 : 8 });
    game.audio.play('se_break', 0.4);
    if (!demo) { rails--; if (rails <= 0) { focus = f; stopT = 0.45; crashed = false; } }
  }

  function crash(f, demo) {
    f.state = 2; f.flash = 0.6; focus = f; stopT = 0.5; streak = 0; crashed = true;
    game.feedback.bad(RUN_X, GROUND - 120, { text: 'MISS', shake: demo ? 6 : 16 });
    game.audio.play('se_break', 0.5);
  }

  function clearFence(f, demo) {
    f.judged = true; cleared++; streak++; maxStreak = Math.max(maxStreak, streak);
    var pts = Math.round((f.type === 'vertical' ? 100 : 150) * (1 + Math.min(4, streak) * 0.25));
    if (!demo) score += pts;
    game.feedback.good(RUN_X + 60, GROUND - h - 220, { text: f.type === 'vertical' ? 'GOOD' : 'PERFECT', color: f.type === 'vertical' ? C.blue : C.gold, size: 48, sound: f.type === 'vertical' ? 'se_good' : 'se_coin', volume: 0.3, count: 10 });
    game.fx.popup('+' + pts, RUN_X + 80, GROUND - h - 300, { color: C.red, size: 50 });
    if (!demo && !milestone && cleared >= FENCES / 2) {
      milestone = true; game.audio.play('se_milestone', 0.45);
      game.fx.popup(cleared + ' / ' + FENCES, W / 2, H * 0.3, { color: C.gold, size: 84 });
    }
  }

  function stepHorse(dt, demo) {
    playT += dt;
    speed = 520 + Math.min(1, playT / TIME_LIMIT) * 120;
    if (pressT > 0) pressT -= dt;
    wx += speed * dt;
    if (air) {
      h += vy * dt; vy -= GRAV * dt;
      if (h <= 0 && vy < 0) { air = false; h = 0; vy = 0; game.audio.tone(160, 0.04, { wave: 'triangle', volume: 0.05 }); }
    }
    for (var i = 0; i < course.length; i++) {
      var f = course[i];
      if (f.flash > 0) f.flash -= dt;
      if (f.judged) continue;
      var front = wx + HORSE_HALF * 0.6, back = wx - HORSE_HALF * 0.6;
      if (f.type === 'water') {
        // 水濠: 水の上に脚が着いたら減点、跳ばずに走り込んでも減点。向こう岸を越えたら成功
        if (!air && front > f.x && back < f.x + f.w) { f.judged = true; knockRail(f, demo); game.fx.burst(RUN_X, GROUND, { color: C.water, count: 18, speed: 300 }); continue; }
        if (back > f.x + f.w) clearFence(f, demo);
        continue;
      }
      // 横木: 馬の胴の高さが横木より低いまま横木の位置を通ったら、かかる(落下)か激突
      var railsX = f.type === 'oxer' ? [f.x, f.x + f.w] : [f.x];
      var hitLow = false, hitRail = false;
      for (var r = 0; r < railsX.length; r++) {
        var rx = railsX[r];
        if (front > rx - 16 && back < rx + 16 && f.state === 0) {
          if (h < RAIL_H - 60) hitLow = true;
          else if (h < RAIL_H) hitRail = true;
        }
      }
      if (hitLow) { f.judged = true; crash(f, demo); return; }
      if (hitRail) { f.judged = true; knockRail(f, demo); continue; }
      if (back > railsX[railsX.length - 1] + 20) clearFence(f, demo);
    }
  }

  function finish(ok) {
    over = true; won = ok; outroT = 1.5;
    game.audio.stopBgm();
    if (ok) {
      score += Math.round(Math.max(0, TIME_LIMIT - playT) * 30) + rails * 100;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 6; i++) game.fx.burst(game.random(160, 920), game.random(300, 1000), { color: [C.pink, C.blue, C.green][i % 3], count: 22, speed: 440 });
      game.fx.flash(C.white, 0.25);
    } else game.audio.play('se_failure', 0.5);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
    if (over || readyT > 0 || stopT > 0) { game.audio.tone(200, 0.03, { wave: 'square', volume: 0.03 }); return; }
    pressT = 0.18;
    if (!jump()) { game.audio.play('se_tap', 0.06); game.fx.burst(RUN_X, GROUND - h - 40, { color: C.white, count: 3, speed: 90 }); }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.white, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }
  function sx(x) { return RUN_X + (x - wx); }
  function blob(x, y, r, col) { game.draw.circle(x, y, r + 6, C.white); game.draw.circle(x, y, r, col); }

  // 栗毛の馬と騎手: 駆け足2コマ / 跳躍 / 着地・つまずき
  var HORSE = [
    ['.............jj.', '............jhhj', '.......mmm..jhj.', '....mmbbbbbbbb..', '...mbbbbbbbbbbe.', '..mbbbbbbbbbbbb.', '....bbbbbbbbbb..', '.....bb.....bb..', '....bb.......bb.', '...bb.........bb'],
    ['.............jj.', '............jhhj', '.......mmm..jhj.', '....mmbbbbbbbb..', '...mbbbbbbbbbbe.', '..mbbbbbbbbbbbb.', '....bbbbbbbbbb..', '.....bb....bb...', '.....bb....bb...', '....b......b....'],
    ['.............jj.', '...........jhhj.', '......mmm..jhj..', '...mmbbbbbbbb...', '..mbbbbbbbbbbe..', '.mbbbbbbbbbbbb..', '.b.bbbbbbbbbb.b.', 'b....bb..bb....b', '......b..b......', '................'],
    ['.............jj.', '............jhhj', '.......mmm..jhj.', '....mmbbbbbbbb..', '...mbbbbbbbbbbe.', '..mbbbbbbbbbbbb.', '....bbbbbbbbbb..', '...bb.bb.bb.bb..', '..bb..bb.bb..bb.', '................'],
  ];
  var HPAL = { b: '#c99a6c', m: '#5a3a2a', e: '#2a1a10', j: '#f06a7a', h: '#f2c8a0' };

  function drawBackdrop() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky], [0.5, C.sky2], [1, C.sky3]]);
    // 遠景: 丸い木と柵(ゆっくり)
    var off1 = (wx * 0.25) % 340;
    for (var b = -1; b < 5; b++) {
      var bx = b * 340 - off1 + 100;
      blob(bx, GROUND - 330, 90, b % 2 ? C.green : C.leaf);
      blob(bx + 60, GROUND - 290, 70, C.green);
      game.draw.rect(bx - 12, GROUND - 260, 24, 70, C.horse2);
    }
    var off2 = (wx * 0.5) % 120;
    for (var p = -1; p < 11; p++) {
      var px = p * 120 - off2;
      game.draw.rect(px, GROUND - 190, 14, 60, C.white);
    }
    game.draw.rect(0, GROUND - 170, W, 10, C.white);
    // 落ち葉
    for (var l = 0; l < 14; l++) {
      var lx = (l * 233 - t * (120 + (l % 4) * 40)) % (W + 60); if (lx < 0) lx += W + 60; lx -= 30;
      var ly = 260 + (l * 97) % 560 + Math.sin(t * 2 + l) * 20;
      game.draw.circle(lx, ly, 9, l % 2 ? C.leaf : C.pink);
    }
    // 馬場の砂(横帯)
    game.draw.rect(0, GROUND, W, H - GROUND, C.sand);
    var off3 = wx % 160;
    for (var s = 0; s < 8; s++) game.draw.rect(s * 160 - off3, GROUND + 40 + (s % 2) * 30, 90, 10, C.sand2);
    game.draw.rect(0, GROUND, W, 8, C.white);
  }

  function drawFence(f) {
    var x = sx(f.x);
    if (x + f.w < -120 || x > W + 400) return;
    var hl = focus === f && stopT > 0;
    var t = game.time.elapsed;
    if (f.type === 'water') {
      game.draw.rect(x, GROUND - 8, f.w, 36, C.white);
      game.draw.rect(x + 6, GROUND - 2, f.w - 12, 24, C.water);
      for (var w = 0; w < 3; w++) game.draw.rect(x + 20 + w * 80 + Math.sin(t * 4 + w) * 8, GROUND + 6, 30, 4, C.white, 0.8);
      game.draw.rect(x - 14, GROUND - 60, 14, 60, C.white); game.draw.circle(x - 7, GROUND - 70, 16, C.blue);
      game.draw.rect(x + f.w, GROUND - 60, 14, 60, C.white); game.draw.circle(x + f.w + 7, GROUND - 70, 16, C.blue);
      if (f.state === 1) for (var d = 0; d < 4; d++) game.draw.circle(x + f.w / 2 + d * 20 - 30, GROUND - 20 - f.flash * 120, 8, C.water);
    } else {
      var posts = f.type === 'oxer' ? [x, x + f.w] : [x];
      for (var p = 0; p < posts.length; p++) {
        var px = posts[p];
        game.draw.rect(px - 10, GROUND - RAIL_H - 40, 20, RAIL_H + 40, C.white);
        game.draw.circle(px, GROUND - RAIL_H - 50, 18, p === 0 ? C.pink : C.blue);
        var drop = f.state === 1 ? (0.5 - Math.max(0, f.flash)) * 200 : 0;
        var ry = GROUND - RAIL_H + Math.min(drop, RAIL_H - 14);
        var col = hl ? C.white : (f.state === 1 ? C.red : (p === 0 ? C.pink : C.blue));
        game.draw.rect(px - 60, ry - 10, 120, 24, C.white);
        game.draw.rect(px - 56, ry - 6, 112, 16, col);
        game.draw.rect(px - 60, GROUND - 50, 120, 20, C.white);
        game.draw.rect(px - 56, GROUND - 46, 112, 12, C.green);
      }
      if (f.type === 'oxer') game.draw.rect(x, GROUND - 8, f.w, 8, C.sand2);
      if (hl) game.draw.circle(x + f.w / 2, GROUND - RAIL_H / 2, 120, C.white, 0.5);
    }
    // 予告: 0.7秒手前で頭上に点滅
    var dist = f.x - wx;
    if (!f.judged && dist > 120 && dist < speed * 0.8 && Math.floor(t * 8) % 2 === 0) blob(x + f.w / 2, GROUND - RAIL_H - 140, 16, C.red);
  }

  function drawGoal() {
    var gx = sx(goalX);
    if (gx > W + 200) return;
    game.draw.rect(gx - 8, GROUND - 520, 16, 520, C.white);
    game.draw.rect(gx + 8, GROUND - 510, 150, 90, C.red);
    game.draw.rect(gx + 8, GROUND - 420, 150, 90, C.white);
    game.draw.rect(gx + 8, GROUND - 330, 150, 90, C.red);
  }

  function drawHorse() {
    var t = game.time.elapsed;
    var y = GROUND - h - 90;
    var fr = air ? HORSE[2] : (stopT > 0 && crashed ? HORSE[3] : HORSE[Math.floor(t * 10) % 2]);
    var sc = stopT > 0 ? 14 : 12;
    game.draw.circle(RUN_X, GROUND - 6, 90 - Math.min(60, h / 4), C.ink, 0.12);
    if (stopT > 0) game.draw.circle(RUN_X, y, 130, C.white, 0.5);
    game.draw.sprite(fr, HPAL, RUN_X, y, sc, { anchor: 'center' });
    if (!air && Math.floor(t * 10) % 2 === 0) game.draw.circle(RUN_X - 110, GROUND - 10, 14, C.sand2);
  }

  function drawButton() {
    var on = pressT > 0;
    game.draw.circle(W / 2, H * 0.86, 150, C.white);
    game.draw.circle(W / 2, H * 0.86, 136, on ? C.gold : C.pink);
    // 柵と跳ぶ弧の絵
    game.draw.rect(W / 2 - 60, H * 0.86 + 30, 120, 16, C.white);
    game.draw.rect(W / 2 - 60, H * 0.86 - 10, 120, 16, C.white);
    for (var a = 0; a < 7; a++) {
      var u = a / 6;
      game.draw.circle(W / 2 - 90 + u * 180, H * 0.86 - 20 - Math.sin(u * Math.PI) * 80, 10, C.white);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.white, 0.85);
    label('SCORE ' + score, 270, 90, 56, C.ink);
    if (streak >= 2) label('COMBO x' + streak, 270, 170, 40, C.red);
    for (var i = 0; i < RAILS; i++) {
      var rx = 640 + i * 110;
      game.draw.rect(rx - 44, 50, 88, 26, C.ink, 0.15);
      game.draw.rect(rx - 40, 54, 80, 18, i < rails ? C.pink : '#d8ccc8');
      game.draw.rect(rx - 46, 40, 12, 46, i < rails ? C.blue : '#d8ccc8');
      game.draw.rect(rx + 34, 40, 12, 46, i < rails ? C.blue : '#d8ccc8');
    }
    var p = Math.min(1, Math.max(0, wx / goalX));
    game.draw.rect(560, 128, 460, 26, '#ead8c8');
    game.draw.rect(560, 128, 460 * p, 26, C.green);
    game.draw.rect(1014, 118, 12, 46, C.red);
    label(cleared + ' / ' + FENCES, 790, 192, 30, C.ink);
    var tl = Math.max(0, 1 - playT / TIME_LIMIT);
    game.draw.rect(560, 206, 460, 12, '#ead8c8');
    game.draw.rect(560, 206, 460 * tl, 12, tl < 0.25 ? C.red : C.blue);
  }

  function drawScene() {
    drawBackdrop();
    drawGoal();
    for (var i = 0; i < course.length; i++) drawFence(course[i]);
    drawHorse();
    drawButton();
  }

  // ---- ATTRACT: 実ロジックで柵ごとの踏み切り位置を見せ、3つ目だけ遠くから跳んで横木を落とす ----
  var demo = { t: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt) initGame(true);
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) { focus = null; if (crashed) demo.t = 0; } return; }
    var f = nextFence();
    if (f && !air) {
      var D = f.x - wx;
      var want = f.type === 'vertical' ? 230 : (f.type === 'oxer' ? 170 : 110);
      if (f.i === 2) want = 430;
      if (D <= want && D > 0) { jump(); pressT = 0.18; }
    }
    stepHorse(dt, true);
    if (cleared >= 6 || wx > goalX) demo.t = 0;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (!course) initGame(true);
      stepDemo(dt);
      drawScene();
      game.draw.hand(W / 2 + 40, H * 0.86 + 40, { press: pressT > 0, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.white, 0.85);
      label(GAME_TITLE, W / 2, 105, 86 + Math.sin(t * 3) * 3, C.red);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 36, C.ink);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.4, 52, C.red);
      else label('TAP TO START', W / 2, H * 0.4, 46, C.ink);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.27, W, H * 0.27, C.white, 0.9);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 100, won ? C.ok : C.red);
      label('SCORE ' + score, W / 2, H * 0.39, 54, C.ink);
      label('COMBO ' + maxStreak + '  MISS ' + (RAILS - rails), W / 2, H * 0.435, 38, C.red);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.485, 48, C.gold);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.485, 36, C.ink);
      if (!won) label('あと' + Math.max(1, FENCES - cleared) + '個!', W / 2, H * 0.25, 56, C.red);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.565, 36, C.ink);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (stopT > 0) stopT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, cleared: cleared, railsDown: RAILS - rails, maxCombo: maxStreak };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.35);
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) { focus = null; finish(false); }
    } else {
      stepHorse(dt, false);
      if (!over && stopT <= 0 && wx >= goalX) finish(true);
      else if (!over && stopT <= 0 && playT >= TIME_LIMIT) finish(false);
      else if (!over && TIME_LIMIT - playT < 3 && Math.floor(playT * 4) !== Math.floor((playT - dt) * 4)) game.audio.tone(660, 0.05, { wave: 'square', volume: 0.04 });
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 110, C.red);
    if (over && !won && rails > 0 && !crashed) label('TIME UP', W / 2, H * 0.42, 96, C.red);
    if (over && won) label('FINISH', W / 2, H * 0.42, 100, C.gold);
  });

  game.onStart(function() {
    // 軽快な馬場の駆け足(オリジナル)
    game.audio.melody([
      ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['F5', 0.5], ['D5', 0.5], ['G4', 1],
      ['A4', 0.5], ['C5', 0.5], ['E5', 0.5], ['C5', 0.5], ['D5', 1], ['G4', 0.5], ['R', 0.5],
    ], { tempo: 164, wave: 'square', volume: 0.045, loop: true, bass: [['C3', 0.5], ['G2', 0.5], ['F2', 0.5], ['G2', 0.5], ['C3', 1], ['G2', 1]] });
    state = S.ATTRACT;
    initGame(true);
  });
})(game);

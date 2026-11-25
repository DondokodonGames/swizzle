// I-3DS-0014v2-troupe-drill-streak.js
// けいこれんぞく — 雑技団の稽古場で、座長が脈絡なく次々出す短いお題(受け取る・皿回し・投げ渡し・輪くぐり)を続けてこなし、続くほど倍率が上がる
// 操作: 落ちてくる玉は手元の輪に重なった瞬間にタップで受ける。棒の上で傾く皿は連打で回して立てる。両手を上げた仲間の側へスワイプして棍棒を投げ渡す。吊られた輪は長押しでしゃがんで跳ぶ高さの印を伸ばし、輪に重なった所で離して跳び抜ける。初めて出るお題は手の幻が一度だけ動きを見せる
// 終わり: 20秒の稽古のあいだに失敗3回でGAME OVER。終わりに点が旗(2000点)に届いていればCLEAR。成功ごとに倍率+1(最大x8)、1回失敗すると倍率はx1に戻る
// @mechanic: jackpot_combo
// @theme: troupe_drill_streak
// 世界観: 雑技団の稽古場で、見習い団員が座長の次々出すお題を息つく間もなくこなし、続けて決めるほど周りの団員の手拍子が熱を帯びていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 得点・最大倍率・成功数
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 画面の1/3を占める巨大キャラ、床に楕円影。背景は横1層で十分
  var STYLE = { bg: ['#6a2a3a', '#a85a3a', '#3a1a24'], main: ['#ffd23a', '#e83a4a', '#3a8ae8'], accent: ['#ffffff', '#5ae07a'] };
  var C = {
    wall: STYLE.bg[0], floor: STYLE.bg[1], dark: STYLE.bg[2], gold: STYLE.main[0], red: STYLE.main[1], blue: STYLE.main[2],
    white: STYLE.accent[0], ok: STYLE.accent[1], ink: '#1a0e14', skin: '#f0b888',
  };

  var GAME_TITLE = 'DRILL STREAK';
  var TIME_LIMIT = 20;
  var GOAL = 2000, MAX_FAIL = 3, MAX_MULT = 8;
  var FLOOR_Y = 1330, HAND_Y = 960;
  // お題の順(脈絡なく)。TOSSは向き、HOOPは輪の高さ
  var ORDER = [
    { k: 'catch' }, { k: 'toss', d: 1 }, { k: 'spin', n: 5 }, { k: 'hoop', hy: 760 }, { k: 'toss', d: -1 },
    { k: 'catch' }, { k: 'hoop', hy: 640 }, { k: 'spin', n: 6 }, { k: 'catch' }, { k: 'toss', d: -1 },
    { k: 'spin', n: 7 }, { k: 'hoop', hy: 700 }, { k: 'toss', d: 1 }, { k: 'catch' }, { k: 'hoop', hy: 580 }, { k: 'spin', n: 7 },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var task, ti, mult, maxMult, wins, fails, score, readyT, over, won, outroT, stopT, playT, gapT, seen, pose, poseT, crashT, timeUp, claps;

  function initGame() {
    ti = 0; mult = 1; maxMult = 1; wins = 0; fails = 0; score = 0; readyT = 0.8; over = false; won = false; outroT = 0; stopT = 0;
    playT = 0; gapT = -1; seen = {}; pose = 'stand'; poseT = 0; crashT = 0; timeUp = false; claps = 0;
    startTask();
  }

  function startTask() {
    var o = ORDER[ti % ORDER.length];
    var win = Math.max(1.4, 2.4 - ti * 0.1);
    task = { k: o.k, d: o.d || 0, n: o.n || 0, hy: o.hy || 0, t: 0, win: win, arr: win * 0.72, count: 0, charge: -1, res: 0, first: !seen[o.k], ball: 320 };
    seen[o.k] = true;
    pose = 'stand';
    game.audio.tone(o.k === 'catch' ? 880 : (o.k === 'toss' ? 660 : (o.k === 'spin' ? 990 : 550)), 0.08, { wave: 'square', volume: 0.06 });
  }

  // お題の時間経過(本番もデモも同じ)
  function stepTask(dt) {
    if (!task || task.res !== 0) return;
    task.t += dt;
    if (task.k === 'catch') {
      var k = Math.min(1.3, task.t / task.arr);
      task.ball = 320 + (HAND_Y - 320) * k * k;
      if (task.t > task.arr + 0.14) fail('drop');
    } else if (task.k === 'hoop' && task.charge >= 0) {
      task.charge += dt / 0.9;
      if (task.charge > 1.35) release();
    }
    if (task.res === 0 && task.t >= task.win) {
      if (task.k === 'hoop' && task.charge >= 0) release();
      else fail('late');
    }
  }

  function press() {
    if (!task || task.res !== 0) return;
    if (task.k === 'catch') {
      if (Math.abs(task.t - task.arr) <= 0.14) succeed(Math.abs(task.t - task.arr) <= 0.06);
      else fail('early');
    } else if (task.k === 'spin') {
      task.count++;
      game.audio.tone(400 + task.count * 70, 0.04, { wave: 'square', volume: 0.06 });
      game.fx.burst(540, 560, { color: C.white, count: 3, speed: 160 });
      if (task.count >= task.n) succeed(task.t < task.win * 0.6);
    } else if (task.k === 'hoop') {
      if (task.charge < 0) { task.charge = 0; pose = 'crouch'; game.audio.tone(300, 0.1, { wave: 'triangle', volume: 0.05, slide: 200 }); }
    }
  }

  function markY() { return FLOOR_Y - 120 - Math.max(0, task.charge) * 760; }

  function release() {
    if (!task || task.res !== 0 || task.k !== 'hoop' || task.charge < 0) return;
    var d = Math.abs(markY() - task.hy);
    task.charge = -2;
    pose = 'jump'; poseT = 0.5;
    if (d <= 60) succeed(d <= 25);
    else fail(markY() < task.hy ? 'high' : 'low');
  }

  function swipe(dir) {
    if (!task || task.res !== 0 || task.k !== 'toss') return;
    if (dir === 'left' || dir === 'right') {
      var d = dir === 'left' ? -1 : 1;
      if (d === task.d) succeed(task.t < task.win * 0.5);
      else fail('wrong');
    }
  }

  function succeed(perfect) {
    task.res = 1;
    var pts = (perfect ? 150 : 100) * mult;
    score += pts; wins++; claps = 1;
    pose = task.k === 'hoop' ? 'jump' : 'up'; poseT = 0.5;
    var px = task.k === 'toss' ? 540 + task.d * 300 : 540;
    game.feedback.good(px, 520, { text: (perfect ? 'PERFECT +' : '+') + pts, color: C.gold, size: 50 });
    mult = Math.min(MAX_MULT, mult + 1);
    maxMult = Math.max(maxMult, mult);
    if (mult === 4 || mult === MAX_MULT) {
      game.audio.play('se_milestone', 0.5);
      game.fx.popup('x' + mult, 880, 150, { color: C.gold, size: 90 });
      game.fx.flash(C.gold, 0.12);
    }
    gapT = 0.35;
  }

  function fail(why) {
    task.res = -1; task.why = why;
    fails++;
    pose = 'fall'; poseT = 0.7;
    var lost = mult;
    mult = 1; crashT = lost > 1 ? 0.9 : 0;
    stopT = 0.35;
    game.feedback.bad(540, 640, { text: 'MISS', shake: 12 });
    if (lost > 1) game.audio.play('se_break', 0.4);
    gapT = 0.45;
  }

  function finish(ok) {
    over = true; won = ok; outroT = 1.6;
    game.audio.stopBgm();
    if (ok) {
      pose = 'up';
      game.audio.play('se_success', 0.55);
      game.fx.burst(540, 700, { color: C.gold, count: 30, speed: 460 });
      game.fx.burst(540, 700, { color: C.red, count: 20, speed: 360 });
      game.fx.flash('#ffffff', 0.2);
    } else {
      pose = 'fall';
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    if (over || readyT > 0 || stopT > 0 || gapT >= 0 || y < 230) {
      game.audio.tone(200, 0.03, { wave: 'triangle', volume: 0.03 });
      return;
    }
    if (task.k === 'toss') game.audio.tone(260, 0.03, { wave: 'triangle', volume: 0.03 });
    press();
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || over || !task) return;
    if (task.k === 'hoop' && task.charge >= 0) { game.audio.play('se_jump', 0.4); release(); }
  });
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || over || readyT > 0 || stopT > 0 || gapT >= 0) return;
    if (task.k === 'toss') { game.audio.play('se_jump', 0.3); swipe(dir); }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col) {
    game.draw.text(str, x + 5, y + 5, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  var HERO_STAND = ['....hhhh....', '...hhhhhh...', '...hssssh...', '...sesses...', '....smms....', '.....ss.....', '..rrrrrrrr..', '.srrrrrrrrs.', '.s.rrrrrr.s.', '.s.rrrrrr.s.', '...bbbbbb...', '...bb..bb...', '...bb..bb...', '...bb..bb...', '..kkk..kkk..'];
  var HERO_UP = ['s...hhhh...s', 's..hhhhhh..s', '.s.hssssh.s.', '.s.sesses.s.', '..s.soos.s..', '...s.ss.s...', '...rrrrrr...', '..rrrrrrrr..', '...rrrrrr...', '...rrrrrr...', '...bbbbbb...', '...bb..bb...', '...bb..bb...', '...bb..bb...', '..kkk..kkk..'];
  var HERO_CROUCH = ['............', '............', '............', '....hhhh....', '...hhhhhh...', '...hssssh...', '...sesses...', '....smms....', '..rrrrrrrr..', '.srrrrrrrrs.', 's.rrrrrrrr.s', '..bbbbbbbb..', '.bbb....bbb.', '.bb......bb.', 'kkk......kkk'];
  var HERO_FALL = ['............', '............', '............', '............', '............', '............', '...hhhh.....', '..hhhhhh....', '..h-ss-hrrr.', '..sssmssrrrr', 'ss.....rrrrr', '.......bbbbb', '......bb.bbb', '.....kkk..kk', '............'];
  var HERO_PAL = { h: '#2a1a1a', s: C.skin, e: C.ink, '-': C.ink, m: '#c84a4a', o: '#c84a4a', r: C.red, b: C.blue, k: C.ink };
  var MATE_A = ['..hh..', '.hssh.', '..ss..', 'gggggg', '.gggg.', '.g..g.'];
  var MATE_UP = ['s.hh.s', 's.hssh', '.sss..', '.gggg.', '.gggg.', '.g..g.'];
  var BOSS = ['..kkkk..', '.kkkkkk.', '..ssss..', '..s..s..', '..swws..', '.pppppp.', 'pppppppp', 'pp.pp.pp', '.p....p.'];

  function drawHall() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.dark], [0.15, C.wall], [0.68, '#8a3a44'], [0.69, C.floor], [1, '#7a3a24']]);
    // 幕とロープ(横1層)
    for (var i = 0; i < 9; i++) game.draw.rect(i * 130 - 10, 230, 70, 280 + Math.sin(t + i) * 6, '#5a1e2c');
    for (var r = 0; r < 3; r++) game.draw.line(180 + r * 360, 230, 180 + r * 360 + Math.sin(t * 1.3 + r) * 20, 900, '#d8b878', 5);
    // 床板とマット
    for (var b = 0; b < 8; b++) game.draw.rect(0, FLOOR_Y + b * 70, W, 4, '#6a2a1a');
    game.draw.rect(240, FLOOR_Y - 10, 600, 50, C.blue);
    game.draw.rect(240, FLOOR_Y - 10, 600, 12, '#6aaaf8');
  }

  function drawCast() {
    var t = game.time.elapsed;
    // 座長(左上で指す)
    var bossX = 150, bossY = 430;
    game.draw.sprite(BOSS, { k: C.ink, s: C.skin, w: C.white, p: '#8a3ad8' }, bossX, bossY, 16, { anchor: 'center' });
    var tx = 540, ty = 600;
    if (task && task.k === 'toss') { tx = 540 + task.d * 380; ty = 900; }
    if (task && task.k === 'catch') { tx = 540; ty = 330; }
    if (task && task.k === 'hoop') { tx = 540; ty = task.hy; }
    var bx = bossX + 70, by = bossY - 20;
    game.draw.line(bx, by, bx + (tx - bx) * 0.25, by + (ty - by) * 0.25, C.gold, 8);
    // 仲間(左右)と手拍子
    for (var s = -1; s <= 1; s += 2) {
      var up = task && task.k === 'toss' && task.d === s && task.res === 0;
      var mx = 540 + s * 400, my = 1170;
      game.draw.circle(mx, my + 70, 70, '#000000', 0.25);
      if (up) game.draw.circle(mx, my, 110, C.white, 0.2 + 0.15 * Math.sin(t * 12));
      var clap = claps > 0 && Math.floor(t * 8) % 2 === 0;
      game.draw.sprite(up || clap ? MATE_UP : MATE_A, { h: '#2a1a1a', s: C.skin, g: C.ok }, mx, my - (clap ? 10 : 0), 22, { anchor: 'center', flipX: s > 0 });
    }
  }

  function drawHero() {
    var t = game.time.elapsed;
    var fr = pose === 'up' ? HERO_UP : (pose === 'crouch' ? HERO_CROUCH : (pose === 'fall' ? HERO_FALL : HERO_STAND));
    var lift = 0;
    if (pose === 'jump') { fr = HERO_UP; lift = Math.sin(Math.min(1, (0.5 - poseT) / 0.5) * Math.PI) * Math.max(0, FLOOR_Y - 200 - (task ? task.hy : 700)); }
    var bob = pose === 'stand' ? Math.sin(t * 4) * 6 : 0;
    game.draw.circle(540, FLOOR_Y + 20, 150 - lift * 0.08, '#000000', 0.3);
    var hl = stopT > 0 && task && task.res < 0;
    game.draw.sprite(fr, hl && Math.floor(t * 16) % 2 === 0 ? { h: '#fff', s: '#fff', e: '#fff', '-': '#fff', m: '#fff', o: '#fff', r: '#fff', b: '#fff', k: '#fff' } : HERO_PAL, 540, FLOOR_Y - 160 - lift + bob, 22, { anchor: 'center' });
  }

  function drawProp() {
    if (!task) return;
    var t = game.time.elapsed;
    var hl = stopT > 0 && task.res < 0;
    var left = Math.max(0, 1 - task.t / task.win);
    if (task.k === 'catch') {
      // 手元の輪(玉が近いほど明るく)
      var near = Math.max(0, 1 - Math.abs(task.t - task.arr) / 0.5);
      game.draw.circle(540, HAND_Y, 70, C.white, 0.15 + near * 0.45);
      game.draw.circle(540, HAND_Y, 54, C.wall);
      if (task.res <= 0) {
        var by = task.res < 0 ? Math.min(FLOOR_Y, task.ball + (task.t - task.arr) * 400) : task.ball;
        game.draw.circle(540, by, hl ? 56 : 40, hl ? '#ffffff' : C.gold);
        game.draw.circle(530, by - 10, 12, C.white);
      }
    } else if (task.k === 'spin') {
      var spin = task.count / task.n;
      var wob = task.res === 0 ? Math.sin(t * 7) * (1 - spin) * 60 : 0;
      game.draw.line(540, HAND_Y - 40, 540 + wob * 0.5, 560, '#d8b878', 8);
      var pw = 110 * (0.6 + 0.4 * Math.abs(Math.sin(t * (4 + spin * 30))));
      game.draw.rect(540 + wob - pw, 545, pw * 2, 26, hl ? '#ffffff' : C.white);
      game.draw.rect(540 + wob - pw * 0.6, 550, pw * 1.2, 16, C.blue);
      for (var p = 0; p < task.n; p++) game.draw.circle(540 - (task.n - 1) * 24 + p * 48, 640, 14, p < task.count ? C.gold : '#5a2a34');
    } else if (task.k === 'toss') {
      var cx = 540 + (task.res > 0 ? task.d * Math.min(1, task.t * 3) * 300 : 0);
      game.draw.rect(cx - 10, 820, 20, 90, hl ? '#ffffff' : C.white);
      game.draw.circle(cx, 820, 22, C.red);
      if (task.res === 0) for (var a = 0; a < 3; a++) {
        var ax = 540 + task.d * (150 + a * 50 + ((t * 300) % 50));
        game.draw.rect(ax - 10, 860, 20, 20, C.gold, 0.6);
      }
    } else if (task.k === 'hoop') {
      game.draw.line(540, 230, 540, task.hy - 110, '#d8b878', 5);
      game.draw.circle(540, task.hy, 110, hl ? '#ffffff' : C.gold);
      game.draw.circle(540, task.hy, 88, C.wall);
      game.draw.rect(430, task.hy - 4, 220, 8, C.gold, 0.4);
      if (task.charge >= 0) {
        var my = markY();
        game.draw.rect(380, my - 6, 320, 12, Math.abs(my - task.hy) <= 60 ? C.ok : C.white);
        game.draw.line(540, FLOOR_Y - 120, 540, my, C.white, 4);
      }
    }
    // 残り時間の縮むリング(お題の上)
    if (task.res === 0) {
      var rx = 900, ry = 420;
      game.draw.circle(rx, ry, 64, C.dark);
      var segs = 24;
      for (var s = 0; s < segs; s++) {
        if (s / segs > left) continue;
        var ang = -Math.PI / 2 + s / segs * Math.PI * 2;
        game.draw.circle(rx + Math.cos(ang) * 50, ry + Math.sin(ang) * 50, 10, left < 0.3 ? C.red : C.gold);
      }
    }
  }

  function drawFirstHint() {
    // 初めて出たお題だけ、手の幻が動きを一度見せる
    if (!task || !task.first || task.res !== 0 || task.t > 0.9) return;
    var t = game.time.elapsed, k = task.t / 0.9;
    if (task.k === 'catch') game.draw.hand(540, HAND_Y, { press: k > 0.6, scale: 12, alpha: 0.5 });
    else if (task.k === 'spin') game.draw.hand(540, 760, { press: Math.floor(t * 10) % 2 === 0, scale: 12, alpha: 0.5 });
    else if (task.k === 'toss') game.draw.hand(540 + task.d * k * 300, 1000, { press: true, scale: 12, alpha: 0.5 });
    else game.draw.hand(540, 1000 - (k > 0.7 ? 60 : 0), { press: k <= 0.7, scale: 12, alpha: 0.5 });
  }

  function drawHud() {
    var t = game.time.elapsed;
    game.draw.rect(0, 0, W, 230, C.ink, 0.85);
    label('SCORE ' + score, 270, 64, 44, C.white);
    // 旗までの進み
    var progress = Math.min(1, score / GOAL);
    game.draw.rect(60, 120, 440, 26, '#4a2a34');
    game.draw.rect(60, 120, 440 * progress, 26, progress >= 1 ? C.ok : C.gold);
    game.draw.rect(500, 96, 8, 60, C.white);
    game.draw.rect(508, 96, 36, 24, C.ok);
    for (var f = 0; f < MAX_FAIL; f++) game.draw.circle(90 + f * 64, 190, 20, f < fails ? C.red : '#4a2a34');
    var tk = Math.max(0, 1 - playT / TIME_LIMIT);
    game.draw.rect(300, 180, 260 * tk, 20, tk < 0.25 ? C.red : C.white);
    // 倍率(崩れると金の粒がこぼれる)
    var sc = 1 + Math.min(0.4, (mult - 1) * 0.06) + Math.sin(t * 8) * 0.03 * (mult - 1);
    if (crashT > 0) {
      label('x1', 880 + Math.sin(t * 60) * 10, 115, 100, C.red);
      for (var k = 0; k < 6; k++) game.draw.rect(820 + k * 24, 120 + (0.9 - crashT) * 500 + k * 12, 16, 16, C.gold, crashT);
    } else label('x' + mult, 880, 115, Math.round(90 * sc), mult >= 4 ? C.gold : C.white);
  }

  // 親指ゾーン: 倍率の灯り(床の足元の8つの灯。崩れると赤く消える)
  function drawLamps() {
    var t = game.time.elapsed, ly = Math.round(H * 0.87);
    game.draw.rect(100, ly - 50, 880, 100, C.ink, 0.5);
    for (var i = 0; i < MAX_MULT; i++) {
      var lx = 160 + i * 108;
      var on = i < mult;
      var col = crashT > 0 ? (Math.floor(t * 12) % 2 === 0 ? C.red : '#4a2a34') : (on ? (i >= 3 ? C.gold : C.white) : '#4a2a34');
      game.draw.circle(lx, ly, 34, C.ink);
      game.draw.circle(lx, ly, 28 + (on && i === mult - 1 ? Math.sin(t * 10) * 4 : 0), col);
    }
  }

  function drawScene() {
    drawHall();
    drawCast();
    drawProp();
    drawHero();
    drawLamps();
  }

  function tickFx(dt) {
    if (poseT > 0) { poseT -= dt; if (poseT <= 0 && pose !== 'crouch') pose = 'stand'; }
    if (crashT > 0) crashT -= dt;
    if (claps > 0) claps -= dt;
  }

  // ---- ATTRACT: 本物のお題を4種こなして倍率を上げ、投げ渡しで逆へ投げて倍率が消えるところまで見せる ----
  var demo = { t: 0, hx: 540, hy: 1000, press: false, act: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 11;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; }
    tickFx(dt);
    if (stopT > 0) { stopT -= dt; return; }
    if (gapT >= 0) { gapT -= dt; if (gapT < 0) { ti++; startTask(); demo.act = false; } return; }
    stepTask(dt);
    if (task.res !== 0) return;
    demo.press = false;
    if (task.k === 'catch') {
      demo.hx = 540; demo.hy = HAND_Y + 40;
      if (task.t >= task.arr - 0.02) { demo.press = true; press(); }
    } else if (task.k === 'spin') {
      demo.hx = 540; demo.hy = 760;
      demo.press = Math.floor(task.t * 12) % 2 === 0;
      if (task.t > 0.3 && Math.floor(task.t * 12) !== Math.floor((task.t - dt) * 12) && demo.press) press();
    } else if (task.k === 'toss') {
      var dir = ti === 4 ? -task.d : task.d;
      var k = Math.max(0, Math.min(1, (task.t - 0.5) / 0.25));
      demo.hx = 540 + dir * k * 300; demo.hy = 1000; demo.press = k > 0 && k < 1;
      if (k >= 1 && !demo.act) { demo.act = true; swipe(dir > 0 ? 'right' : 'left'); }
    } else if (task.k === 'hoop') {
      demo.hx = 540; demo.hy = 1000;
      if (task.t > 0.3 && task.charge === -1) press();
      demo.press = task.charge >= 0;
      if (task.charge >= 0 && markY() <= task.hy + 5) release();
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.hx, demo.hy, { press: demo.press, scale: 14 });
      if (crashT > 0) label('x1', 540 + Math.sin(t * 60) * 10, 1560, 110, C.red);
      else label('x' + mult, 540, 1560, 90 + mult * 6, mult >= 4 ? C.gold : C.white);
      game.draw.rect(0, 0, W, 230, C.ink, 0.9);
      label(GAME_TITLE, W / 2, 96, 86 + Math.sin(t * 3) * 3, C.gold);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 186, 36, C.white);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, 1760, 50, C.gold);
      else label('TAP TO START', W / 2, 1760, 46, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.3, W, H * 0.27, C.ink, 0.88);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.355, 96, won ? C.ok : C.red);
      label('SCORE ' + score, W / 2, H * 0.41, 54, C.white);
      label('x' + maxMult + '  ' + wins + '回', W / 2, H * 0.455, 46, C.gold);
      if (score > game.best && score > 0) label('NEW RECORD', W / 2, H * 0.5, 46, C.gold);
      else label('BEST ' + Math.max(game.best, score), W / 2, H * 0.5, 38, C.white);
      if (!won) label('あと' + Math.max(1, GOAL - score) + '点', W / 2, H * 0.54, 46, C.gold);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.6, 38, C.white);
      return;
    }

    // ---- PLAYING ----
    tickFx(dt);
    if (over) {
      outroT -= dt;
      if (stopT > 0) stopT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, maxMult: maxMult, wins: wins, fails: fails };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.5);
    } else if (stopT > 0) {
      stopT -= dt;
      playT += dt;
      if (stopT <= 0 && fails >= MAX_FAIL) finish(false);
    } else {
      playT += dt;
      if (gapT >= 0) { gapT -= dt; if (gapT < 0) { ti++; startTask(); } }
      else stepTask(dt);
      if (!over && playT >= TIME_LIMIT) { timeUp = true; finish(score >= GOAL); }
    }

    drawScene();
    drawFirstHint();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, 760, 100, C.gold);
    if (over && timeUp) label(won ? 'FINISH' : 'TIME UP', W / 2, 760, 90, won ? C.ok : C.red);
  });

  game.onStart(function() {
    game.audio.melody([
      ['D5', 0.5], ['F5', 0.5], ['A5', 0.5], ['F5', 0.5], ['G5', 0.5], ['E5', 0.5], ['C5', 1],
      ['D5', 0.5], ['E5', 0.5], ['F5', 0.5], ['A5', 0.5], ['D5', 1], ['R', 1],
    ], { tempo: 156, wave: 'square', volume: 0.05, loop: true, bass: [['D3', 1], ['A2', 1], ['C3', 1], ['A2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

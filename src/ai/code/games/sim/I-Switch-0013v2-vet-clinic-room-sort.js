// I-Switch-0013v2-vet-clinic-room-sort.js
// 動物病院の受付さばき — 待合のベンチに届くキャリーの問診票の絵を見て、犬・猫・小鳥の診察室の扉へドラッグで振り分ける
// 操作: ベンチのキャリーを指でつまんで、問診票と同じ絵の札が掛かった扉まで引いて離す。中身は見えないので問診票の絵で判断する。扉の上の赤ランプが点いている部屋は診察中で受け付けない(ベンチに戻るだけ)。キャリーの周りの輪が縮み切ると動物が逃げ出す。赤十字の札は急患(輪が速く縮むが得点2倍)。途中で札がちらついたあと先生が部屋を入れ替わる(札の位置が入れ替わる)
// 終わり: 20秒以内に12匹を正しい部屋へ入れればCLEAR。違う部屋に入れる/待たせて逃げられるのが合わせて3回でGAME OVER(時間切れも)
// @mechanic: drag_sort
// @theme: vet_clinic_room_sort
// 世界観: 町の動物病院の受付で、看護師が次々運ばれてくる犬・猫・小鳥のキャリーを問診票の絵で見分け、診察中のランプと部屋替えに気を配りながらそれぞれの診察室へ振り分ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 診察室へ通した数・急患数・最大連続
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 原色 + 白縁、明るい背景、光の柱と祝祭演出
  var STYLE = { bg: ['#fffaf0', '#d8f4ff', '#ffe8f4'], main: ['#ff4a7a', '#2ab8ff', '#ffd02a'], accent: ['#ffffff', '#2a2050'] };
  var C = {
    bg: STYLE.bg[0], bg2: STYLE.bg[1], bg3: STYLE.bg[2], pink: STYLE.main[0], blue: STYLE.main[1], yellow: STYLE.main[2],
    white: STYLE.accent[0], ink: STYLE.accent[1], green: '#3ad86a', red: '#ff3a3a', wood: '#d89a5a', wood2: '#b8783a', floor: '#c8e8d8',
  };

  var GAME_TITLE = 'VET SORT';
  var TIME_LIMIT = 20;
  var GOAL = 12;
  var LIVES = 3;
  var DOOR_X = [200, 540, 880], DOOR_TOP = 300, DOOR_BOT = 700, DOOR_W = 250;
  var SLOT_X = [130, 335, 540, 745, 950], BENCH_Y = 1290;
  var CW = 180, CH = 140;
  var ANIMALS = ['dog', 'cat', 'bird'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var roomOf, busy, carriers, arriveT, playT, lives, served, urgents, combo, maxCombo, score, readyT, stopT, focus, over, won, outroT,
    held, swapAt, swapWarn, swapAnim, milestone, mood, nextKind;

  function initGame() {
    roomOf = ['dog', 'cat', 'bird']; busy = [0, 0, 0]; carriers = []; arriveT = 0.3; playT = 0; lives = LIVES; served = 0; urgents = 0;
    combo = 0; maxCombo = 0; score = 0; readyT = 0.8; stopT = 0; focus = null; over = false; won = false; outroT = 0; held = null;
    swapAt = [7, 13.5]; swapWarn = null; swapAnim = 0; milestone = false; mood = 0; nextKind = Math.floor(game.random(0, 3));
  }

  function freeSlot() {
    for (var s = 0; s < SLOT_X.length; s++) {
      var used = false;
      for (var i = 0; i < carriers.length; i++) if (carriers[i].slot === s && !carriers[i].gone) used = true;
      if (!used) return s;
    }
    return -1;
  }

  function arrive() {
    var s = freeSlot();
    if (s < 0) return 0.4;
    var stage = playT < 6 ? 0 : (playT < 12 ? 1 : 2);
    var kind = ANIMALS[(nextKind + Math.floor(game.random(1, 3))) % 3];
    nextKind = ANIMALS.indexOf(kind);
    var urgent = stage > 0 && game.random(0, 1) < 0.25;
    var pat = urgent ? 3.6 : (stage === 0 ? 7 : 6);
    carriers.push({ kind: kind, slot: s, x: W + 120, y: BENCH_Y, pat: pat, patMax: pat, urgent: urgent, gone: false, bounce: 0, flash: 0, walkIn: 0.4 });
    game.audio.tone(1046, 0.05, { wave: 'square', volume: 0.04 });
    return stage === 0 ? 1.3 : (stage === 1 ? 1.1 : 0.9);
  }

  function doorAt(x, y) {
    if (y > DOOR_BOT + 80) return -1;
    for (var d = 0; d < 3; d++) if (Math.abs(x - DOOR_X[d]) < DOOR_W / 2 + 20) return d;
    return -1;
  }

  // ---- 振り分け(本番もデモも同じ処理) ----
  function dropOn(c, d, demo) {
    if (d < 0) { c.bounce = 0.25; game.audio.tone(330, 0.04, { wave: 'triangle', volume: 0.04 }); return; }
    if (busy[d] > 0 || swapAnim > 0) {
      c.bounce = 0.3;
      game.audio.tone(180, 0.1, { wave: 'square', volume: 0.06 });
      game.fx.burst(DOOR_X[d], DOOR_TOP - 20, { color: C.red, count: 6, speed: 160 });
      return;
    }
    if (roomOf[d] === c.kind) {
      c.gone = true; busy[d] = c.urgent ? 1.0 : 1.3;
      combo++; maxCombo = Math.max(maxCombo, combo); mood = 0.6;
      var pts = Math.round((c.urgent ? 200 : 100) * (1 + Math.min(6, combo) * 0.1) + c.pat / c.patMax * 50);
      if (!demo) { served++; score += pts; if (c.urgent) urgents++; }
      game.feedback.good(DOOR_X[d], DOOR_BOT - 120, { text: c.urgent ? 'PERFECT' : 'GOOD', color: c.urgent ? C.pink : C.blue, size: 48, sound: c.urgent ? 'se_coin' : 'se_good', volume: 0.3, count: 12 });
      game.fx.popup('+' + pts, DOOR_X[d], DOOR_TOP + 40, { color: C.yellow, size: 44 });
      if (!demo && served === 6 && !milestone) {
        milestone = true;
        game.fx.popup('6 / ' + GOAL, W / 2, H * 0.47, { color: C.pink, size: 72 });
        game.audio.play('se_milestone', 0.45);
      }
    } else {
      fail(c, DOOR_X[d], DOOR_BOT - 100, demo);
      c.gone = true;
    }
  }

  function fail(c, x, y, demo) {
    focus = { c: c, x: x, y: y }; stopT = 0.45; combo = 0; mood = -1;
    game.feedback.bad(x, y, { text: 'MISS', shake: demo ? 6 : 14 });
    game.audio.play('se_break', 0.35);
    if (!demo) {
      lives--;
      if (lives <= 0) finish(false);
    }
  }

  // ---- 進行(本番もデモも同じ) ----
  function stepWorld(dt, demo) {
    playT += dt;
    arriveT -= dt;
    if (arriveT <= 0) arriveT = arrive();
    for (var d = 0; d < 3; d++) if (busy[d] > 0) busy[d] -= dt;
    // 部屋替え: 0.9秒札がちらついてから入れ替わる
    if (swapAt.length && playT >= swapAt[0] - 0.9 && !swapWarn) {
      var a = Math.floor(game.random(0, 3)), b = (a + 1 + Math.floor(game.random(0, 2))) % 3;
      swapWarn = { a: a, b: b, t: 0.9 };
      game.audio.tone(660, 0.1, { wave: 'square', volume: 0.06 });
    }
    if (swapWarn) {
      swapWarn.t -= dt;
      if (swapWarn.t <= 0) {
        var tmp = roomOf[swapWarn.a]; roomOf[swapWarn.a] = roomOf[swapWarn.b]; roomOf[swapWarn.b] = tmp;
        swapAnim = 0.4; swapWarn = null; swapAt.shift();
        game.audio.play('se_jump', 0.3);
      }
    }
    if (swapAnim > 0) swapAnim -= dt;
    for (var i = carriers.length - 1; i >= 0; i--) {
      var c = carriers[i];
      if (c.gone) { carriers.splice(i, 1); continue; }
      if (c.flash > 0) c.flash -= dt;
      if (c.walkIn > 0) c.walkIn -= dt;
      if (c !== held) {
        if (c.bounce > 0) c.bounce -= dt;
        c.x += (SLOT_X[c.slot] - c.x) * Math.min(1, dt * 10);
        c.y += (BENCH_Y - c.y) * Math.min(1, dt * 10);
      }
      c.pat -= dt;
      if (c.pat < 1.2 && Math.floor(c.pat * 8) !== Math.floor((c.pat + dt) * 8)) game.audio.tone(900, 0.03, { wave: 'square', volume: 0.03 });
      if (c.pat <= 0) {
        if (held === c) held = null;
        fail(c, c.x, c.y, demo);
        c.gone = true;
        return;
      }
    }
  }

  function finish(ok) {
    over = true; won = ok; outroT = 1.5; held = null;
    game.audio.stopBgm();
    if (ok) {
      score += lives * 200 + Math.max(0, Math.round((TIME_LIMIT - playT) * 50));
      mood = 2;
      game.audio.play('se_success', 0.55);
      for (var d = 0; d < 3; d++) game.fx.burst(DOOR_X[d], DOOR_TOP + 100, { color: [C.pink, C.blue, C.yellow][d], count: 22, speed: 420 });
      game.fx.flash(C.white, 0.25);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力: キャリーをつまんで扉まで引いて離す ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    if (over || readyT > 0 || stopT > 0) { game.audio.play('se_tap', 0.08); return; }
    var best = null, bd = 160;
    for (var i = 0; i < carriers.length; i++) {
      var c = carriers[i];
      var dd = Math.hypot(c.x - x, c.y - y);
      if (dd < bd) { bd = dd; best = c; }
    }
    if (best) { held = best; game.audio.tone(520, 0.05, { wave: 'triangle', volume: 0.05 }); }
    else game.audio.tone(240, 0.04, { wave: 'square', volume: 0.03 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !held) return;
    held.x = x; held.y = y;
    if (Math.random() < 0.08) game.audio.tone(700, 0.02, { wave: 'triangle', volume: 0.02 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !held) return;
    var c = held; held = null;
    if (over || stopT > 0) { game.audio.play('se_tap', 0.08); return; }
    dropOn(c, doorAt(x, y), false);
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col) {
    game.draw.text(str, x + 4, y + 5, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x - 2, y - 2, { size: sz, color: C.white, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  var ICON = {
    dog: ['b......b', 'bb....bb', '.bwwwwb.', '.weewwe.', '.wwwwww.', '.wwkkww.', '..wwww..'],
    cat: ['o......o', 'oo....oo', 'oooooooo', 'oeooooeo', 'oooooooo', 'ooopoooo', '.oooooo.'],
    bird: ['...yy...', '..yyyy..', '.yeyyyy.', 'yyyyyyrr', '.yyyyyy.', '..yyyy..', '...ll...'],
  };
  var ICON_PAL = { b: '#8a5a2a', w: '#f0d8b0', e: C.ink, k: C.ink, o: '#ffa040', p: C.pink, y: C.yellow, r: C.red, l: '#c08020' };
  var NURSE_A = ['..wwww..', '.wwrrww.', '..ffff..', '.fefffe.', '..fmmf..', '.pppppp.', 'pppppppp', '.pppppp.', '..p..p..'];
  var NURSE_B = ['..wwww..', '.wwrrww.', '..ffff..', '.fefffe.', '..fwwf..', '.pppppp.', 'pppppppp', '.pppppp.', '..p..p..'];
  var NURSE_PAL = { w: C.white, r: C.red, f: '#f6c8a0', e: C.ink, m: C.pink, p: '#ff9ac0' };

  function drawRoom() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg2], [0.4, C.bg], [1, C.bg3]]);
    // 光の柱
    for (var p = 0; p < 4; p++) game.draw.rect(60 + p * 270 + Math.sin(t + p) * 20, 230, 90, H - 230, C.white, 0.25);
    game.draw.rect(0, 720, W, 30, C.blue);
    game.draw.rect(0, 750, W, H - 750, C.floor);
    for (var y = 760; y < H; y += 80) game.draw.rect(0, y, W, 4, C.white, 0.6);
    // ベンチ
    game.draw.rect(40, BENCH_Y + 60, W - 80, 40, C.wood2);
    game.draw.rect(40, BENCH_Y + 50, W - 80, 20, C.wood);
    // 入口(右下)
    game.draw.rect(W - 170, 1470, 150, 250, C.white);
    game.draw.rect(W - 160, 1480, 130, 240, C.bg2);
    game.draw.rect(W - 160, 1590, 130, 6, C.white);
  }

  function signPos(d) {
    var x = DOOR_X[d];
    if (swapAnim > 0 && lastSwap) {
      var k = 1 - swapAnim / 0.4;
      if (d === lastSwap.a) x = DOOR_X[lastSwap.b] + (DOOR_X[lastSwap.a] - DOOR_X[lastSwap.b]) * k;
      if (d === lastSwap.b) x = DOOR_X[lastSwap.a] + (DOOR_X[lastSwap.b] - DOOR_X[lastSwap.a]) * k;
    }
    return x;
  }
  var lastSwap = null;

  function drawDoors() {
    var t = game.time.elapsed;
    for (var d = 0; d < 3; d++) {
      var x = DOOR_X[d];
      var hover = held && doorAt(held.x, held.y) === d;
      game.draw.rect(x - DOOR_W / 2 - 10, DOOR_TOP - 10, DOOR_W + 20, DOOR_BOT - DOOR_TOP + 10, C.white);
      game.draw.rect(x - DOOR_W / 2, DOOR_TOP, DOOR_W, DOOR_BOT - DOOR_TOP, busy[d] > 0 ? '#e8d8e8' : (hover ? C.yellow : [C.pink, C.blue, C.yellow][d]));
      game.draw.rect(x - 70, DOOR_TOP + 140, 140, 220, C.white, 0.4);
      game.draw.circle(x + 80, DOOR_TOP + 260, 12, C.ink);
      // 診察中ランプ
      game.draw.circle(x, DOOR_TOP - 30, 22, C.ink);
      game.draw.circle(x, DOOR_TOP - 30, 16, busy[d] > 0 ? (Math.floor(t * 8) % 2 ? C.red : '#ff9a9a') : C.green);
    }
    // 札(先生がいる部屋の動物)。入れ替わる前はちらつく
    for (var s = 0; s < 3; s++) {
      var sx = signPos(s);
      var warn = swapWarn && (swapWarn.a === s || swapWarn.b === s) && Math.floor(t * 12) % 2 === 0;
      var lift = swapAnim > 0 && lastSwap && (lastSwap.a === s || lastSwap.b === s) ? Math.sin((1 - swapAnim / 0.4) * Math.PI) * 60 : 0;
      game.draw.circle(sx, DOOR_TOP + 80 - lift, 74, C.ink);
      game.draw.circle(sx, DOOR_TOP + 80 - lift, 66, warn ? C.red : C.white);
      game.draw.sprite(ICON[roomOf[s]], ICON_PAL, sx, DOOR_TOP + 80 - lift, 13, { anchor: 'center' });
    }
  }

  function drawCarrier(c) {
    var t = game.time.elapsed;
    var hl = focus && focus.c === c && stopT > 0;
    var bob = c === held ? -10 : (c.bounce > 0 ? Math.sin(c.bounce * 30) * 10 : 0);
    var x = c.x + bob, y = c.y;
    var sc = hl ? 1.25 : (c === held ? 1.1 : 1);
    var w = CW * sc, h = CH * sc;
    // 待ち時間の輪(縮む)
    var r = c.pat / c.patMax;
    var ringCol = r < 0.3 ? C.red : (c.urgent ? C.pink : C.green);
    for (var k = 0; k < 16; k++) {
      if (k / 16 > r) break;
      var an = -Math.PI / 2 + k / 16 * Math.PI * 2;
      game.draw.circle(x + Math.cos(an) * 120, y + Math.sin(an) * 100, 9, ringCol);
    }
    game.draw.rect(x - w / 2 - 6, y - h / 2 - 6, w + 12, h + 12, C.ink);
    game.draw.rect(x - w / 2, y - h / 2, w, h, hl ? C.white : '#e8e8f8');
    game.draw.rect(x - w / 2 + 20, y - h / 2 + 30, w - 40, h - 50, '#3a3060');
    for (var g = 0; g < 4; g++) game.draw.rect(x - w / 2 + 34 + g * (w - 70) / 3, y - h / 2 + 30, 6, h - 50, '#b8b8d8');
    // 中で光る目(どの動物かはわからない)
    if (Math.floor(t * 2 + c.slot) % 5 !== 0) { game.draw.circle(x - 18, y + 4, 7, C.yellow); game.draw.circle(x + 18, y + 4, 7, C.yellow); }
    // 問診票(絵)
    game.draw.rect(x - 56, y - h / 2 - 100, 112, 100, C.ink);
    game.draw.rect(x - 50, y - h / 2 - 94, 100, 88, C.white);
    game.draw.sprite(ICON[c.kind], ICON_PAL, x, y - h / 2 - 50, 10, { anchor: 'center' });
    if (c.urgent) {
      game.draw.rect(x + 40, y - h / 2 - 120, 44, 44, C.white);
      game.draw.rect(x + 56, y - h / 2 - 114, 12, 32, C.red);
      game.draw.rect(x + 46, y - h / 2 - 104, 32, 12, C.red);
    }
  }

  function drawNurse() {
    var t = game.time.elapsed;
    var hop = mood > 0.3 ? Math.abs(Math.sin(t * 10)) * 20 : Math.sin(t * 2) * 3;
    var fr = Math.floor(t * 3) % 2 ? NURSE_A : NURSE_B;
    game.draw.sprite(fr, NURSE_PAL, 120, 1640 - hop, 16, { anchor: 'center', flipX: mood < -0.3 });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink, 0.9);
    label(served + ' / ' + GOAL, 220, 100, 66, C.white);
    label('SCORE ' + score, 220, 182, 36, C.yellow);
    for (var i = 0; i < LIVES; i++) {
      game.draw.circle(640 + i * 100, 66, 36, C.white);
      game.draw.circle(640 + i * 100, 66, 30, i < lives ? C.pink : '#555');
    }
    var timeLeft = Math.max(0, 1 - playT / TIME_LIMIT);
    game.draw.rect(560, 140, 440, 34, C.white);
    game.draw.rect(566, 146, 428 * timeLeft, 22, timeLeft < 0.25 ? C.red : C.green);
    if (combo >= 3) label('COMBO ' + combo, 780, 212, 30, C.pink);
  }

  function drawScene() {
    drawRoom();
    drawDoors();
    drawNurse();
    for (var i = 0; i < carriers.length; i++) if (carriers[i] !== held) drawCarrier(carriers[i]);
    if (held) drawCarrier(held);
    if (focus && stopT > 0) game.draw.circle(focus.x, focus.y, 140, C.red, 0.2);
  }

  // ---- ATTRACT: 実ロジックでキャリーをつまみ、絵の合う扉へ運ぶ。最後は1匹待たせて逃げられる ----
  var demo = { t: 0, hx: 540, hy: BENCH_Y, phase: 0, target: null, door: -1, wait: 0.5 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 10;
    if (demo.t <= dt || cyc < dt) { initGame(); readyT = 0; demo.phase = 0; demo.target = null; demo.wait = 0.6; held = null; }
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) focus = null; return; }
    demo.wait -= dt;
    if (demo.phase === 0 && demo.wait <= 0 && cyc < 7.5) {
      // 急患・残り少ない順に選ぶ
      var pick = null;
      for (var i = 0; i < carriers.length; i++) {
        var c = carriers[i];
        if (c.walkIn > 0) continue;
        var d = roomOf.indexOf(c.kind);
        if (busy[d] > 0.3) continue;
        if (!pick || c.pat < pick.pat) pick = c;
      }
      if (pick) { demo.target = pick; demo.door = roomOf.indexOf(pick.kind); demo.phase = 1; }
    }
    if (demo.phase === 1) {
      var tg = demo.target;
      if (!tg || tg.gone) { demo.phase = 0; held = null; }
      else {
        demo.hx += (tg.x - demo.hx) * Math.min(1, dt * 10); demo.hy += (tg.y - demo.hy) * Math.min(1, dt * 10);
        if (Math.hypot(tg.x - demo.hx, tg.y - demo.hy) < 20) { held = tg; demo.phase = 2; game.audio.tone(520, 0.05, { wave: 'triangle', volume: 0.04 }); }
      }
    } else if (demo.phase === 2) {
      var c2 = demo.target;
      if (!c2 || c2.gone) { demo.phase = 0; held = null; }
      else {
        demo.door = roomOf.indexOf(c2.kind);
        var tx = DOOR_X[demo.door], ty = DOOR_BOT - 60;
        demo.hx += (tx - demo.hx) * Math.min(1, dt * 6); demo.hy += (ty - demo.hy) * Math.min(1, dt * 6);
        c2.x = demo.hx; c2.y = demo.hy;
        if (Math.hypot(tx - demo.hx, ty - demo.hy) < 24) { held = null; dropOn(c2, doorAt(demo.hx, demo.hy), true); demo.phase = 0; demo.wait = 0.25; }
      }
    }
    stepWorld(dt, true);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    mood += (0 - mood) * Math.min(1, dt * 1.5);
    if (swapWarn) lastSwap = { a: swapWarn.a, b: swapWarn.b };

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.hx, demo.hy + 30, { press: demo.phase === 2, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.9);
      label(GAME_TITLE, W / 2, 105, 96 + Math.sin(t * 3) * 3, C.pink);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 36, C.white);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.93, 52, C.pink);
      else label('TAP TO START', W / 2, H * 0.93, 46, C.blue);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.4, W, H * 0.24, C.ink, 0.85);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.46, 100, won ? C.green : C.red);
      label('SCORE ' + score, W / 2, H * 0.52, 54, C.white);
      label(served + ' / ' + GOAL + '  COMBO ' + maxCombo, W / 2, H * 0.565, 38, C.yellow);
      if (won && score > game.best) label('NEW RECORD', W / 2, H * 0.61, 48, C.yellow);
      else label('BEST ' + Math.max(game.best, won ? score : 0), W / 2, H * 0.61, 36, C.white);
      if (!won) label('あと' + Math.max(1, GOAL - served) + '匹!', W / 2, H * 0.37, 60, C.pink);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.68, 36, C.ink);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (stopT > 0) stopT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { served: served, urgent: urgents, maxCombo: maxCombo };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) focus = null;
    } else {
      stepWorld(dt, false);
      if (!over && served >= GOAL) finish(true);
      else if (!over && playT >= TIME_LIMIT) finish(false);
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.47, 110, C.pink);
    if (over && !won && lives > 0) label('TIME UP', W / 2, H * 0.47, 96, C.red);
    if (over && won) label('FINISH', W / 2, H * 0.47, 100, C.pink);
  });

  game.onStart(function() {
    game.audio.melody([
      ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['C6', 0.5], ['B5', 0.5], ['G5', 0.5], ['A5', 1],
      ['F5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['E5', 0.5], ['C5', 1],
    ], { tempo: 150, wave: 'square', volume: 0.045, loop: true, bass: [['C3', 1], ['A2', 1], ['F2', 1], ['G2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

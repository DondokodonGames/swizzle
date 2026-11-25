// J-Switch-0042-crevasse-rope-rescue.js
// クレバスの手繰り救助 — 左右の手を交互に、握り直しが整った瞬間ごとにザイルを手繰り、氷の裂け目から一人ずつ引き上げる
// 操作: 画面の左半分=左手、右半分=右手。手繰った手の反対側の手袋の輪が満ちて光った瞬間に押すと大きく手繰れる。同じ手を続けて押す/輪が満ちる前に押すとザイルが滑る。放置するとずり落ちる(社内メモ。画面には出さない)
// 終わり: 制限時間内に3人を引き上げればCLEAR。時間切れでGAME OVER
// @mechanic: alternate_tap
// @theme: crevasse_rope_rescue
// 世界観: 吹雪の止んだ朝の雪山で、山小屋付きの見習い山岳救助隊員が、氷河の裂け目に落ちた登山者と荷運び犬を、左右の手で交互にザイルを手繰る呼吸を合わせて一人ずつ引き上げ、日が陰る前に全員を山小屋へ連れ帰る
// 残るもの: 正誤(CLEAR/GAME OVER) + 引き上げた人数・PERFECT数・滑らせた回数
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 限定6色の大きいドット。差し色は救助隊の朱色だけを強く使う
  var STYLE = { bg: ['#1c1a44', '#33407e', '#0b0a20'], main: ['#eaf5ff', '#94c6f5', '#4f69b8'], accent: ['#ff5b2e', '#ffd84a'] };
  var C = {
    sky1: '#1c1a44', sky2: '#33407e', deep: '#0b0a20', snow: '#eaf5ff', ice: '#94c6f5', rock: '#4f69b8',
    red: '#ff5b2e', gold: '#ffd84a', ink: '#07061a', bad: '#ff3b5c', good: '#8dffc0'
  };

  var GAME_TITLE = 'CREVASSE ROPE';
  var TIME_LIMIT = 14;
  var NEEDED = 3;
  var STEPS = [5, 6, 7];          // 1人あたりの手繰り数(後ろほど重い)
  var CYC = [0.32, 0.38, 0.44];   // 握り直しに要る時間(重いほど長い=テンポが変わる)
  var PERF_WIN = 0.12;
  var IDLE_LIMIT = 2.5;           // 手が止まったらずり落ちる
  var LEDGE_Y = H * 0.34;
  var PULLEY_X = W * 0.5, PULLEY_Y = H * 0.265;
  var BOTTOM_Y = H * 0.7;
  var BTN_Y = H * 0.855, BTN_R = 150;
  var BTN_X = { L: W * 0.27, R: W * 0.73 };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var phase, ready, timeLeft, idx, lift, shownLift, lastHand, readyT, cued, rescued, perfects, slips, pulls, combo;
  var hitStop, outro, ok, liftAnim, tug, slipT, press, focus, endFx;

  // ── sprites ─────────────────────────────────────────────────────
  var RESCUER = [
    ['...hhh..', '..hhhhh.', '..skkss.', '..sssss.', 'g.rrrrr.', '.grrrrrr', '..rrrrr.', '..bb.bb.', '..bb.bb.', '.kkk.kkk'],
    ['...hhh..', '..hhhhh.', '..skkss.', '..sssss.', '.rrrrr.g', 'rrrrrrg.', '..rrrrr.', '..bb.bb.', '..bb.bb.', '.kkk.kkk'],
    ['...hhh..', '..hhhhh.', '..skkss.', '..sssss.', '.rrrrrr.', 'g.rrrr.g', '..rrrrr.', '..bb.bb.', '..bb.bb.', '.kkk.kkk']
  ];
  var CLIMBERS = [
    { name: 'kid', px: 11, art: [
      ['..hhh..', '.hhhhh.', '.skkss.', '.sssss.', 'bbbbbbb', 'b.bbb.b', '..bbb..', '..k.k..'],
      ['..hhh..', '.hhhhh.', '.skkss.', '.sssss.', 'bbbbbbb', '.bbbbb.', '..bbb..', '.k...k.']
    ] },
    { name: 'dog', px: 11, art: [
      ['.oo.......', 'oooo......', 'okoooooooo', 'oooooooooo', '.oooooooo.', '.o.o..o.o.', '.o.o..o.o.'],
      ['.oo.......', 'oooo.....o', 'okoooooooo', 'oooooooooo', '.oooooooo.', 'o..o..o..o', 'o..o..o..o']
    ] },
    { name: 'big', px: 12, art: [
      ['...hhh...', '..hhhhh..', '..skkss..', 'pp.sssss.', 'ppbbbbbbb', 'ppbbbbb.b', 'pp.bbbb..', '...bb.bb.', '...kk.kk.'],
      ['...hhh...', '..hhhhh..', '..skkss..', 'pp.sssss.', 'ppbbbbbbb', 'pp.bbbbb.', 'pp.bbbb.b', '...bb.bb.', '..kk...kk']
    ] }
  ];
  var GLOVE = ['.g.g.g..', '.g.g.g.g', 'gggggggg', 'gggggggg', 'gggggggg', '.gggggg.', '..gggg..'];
  var HUT = ['....rr....', '...rrrr...', '..rrrrrr..', '.rrrrrrrr.', 'rrrrrrrrrr', '.ssssssss.', '.sggsskks.', '.sggsskks.'];
  var PAL_R = { h: C.gold, s: '#ffd9b8', k: C.ink, r: C.red, g: C.snow, b: C.rock };
  var PAL_C = { h: C.red, s: '#ffd9b8', k: C.ink, b: C.ice, o: '#d8a060', p: C.gold };

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; idx = 0; lift = 0; shownLift = 0;
    lastHand = null; readyT = 0; cued = false; rescued = 0; perfects = 0; slips = 0; pulls = 0; combo = 0;
    hitStop = 0; outro = 0; ok = false; liftAnim = 0; tug = 0; slipT = 0; press = { L: 0, R: 0 }; focus = null; endFx = false;
  }

  function climberPos() {
    var t = game.time.elapsed;
    var topY = LEDGE_Y + 70;
    var y = BOTTOM_Y - (BOTTOM_Y - topY) * shownLift;
    if (phase === 'lift') y = topY - (0.6 - liftAnim) * 180;
    return { x: PULLEY_X + Math.sin(t * 1.6) * (14 + slipT * 60), y: y };
  }

  // ── 手繰り(実プレイ・デモ共用)──────────────────────────────
  function pull(h, demo) {
    if (phase !== 'pull') return;
    var cyc = CYC[idx], bx = BTN_X[h];
    press[h] = 0.18;
    if (lastHand === h) {
      lift = Math.max(0, lift - 1 / STEPS[idx]); readyT = 0; cued = false; combo = 0; slipT = 0.4;
      if (demo) { game.fx.burst(bx, BTN_Y - 120, { color: C.bad, count: 8, speed: 180 }); return; }
      slips++;
      game.feedback.bad(bx, BTN_Y - 190, { text: 'MISS', color: C.bad });
      return;
    }
    if (lastHand !== null && readyT < cyc) {
      lift = Math.max(0, lift - 0.5 / STEPS[idx]); readyT = 0; cued = false; combo = 0; slipT = 0.3;
      if (demo) { game.fx.burst(bx, BTN_Y - 120, { color: C.bad, count: 6, speed: 150 }); return; }
      slips++;
      game.feedback.bad(bx, BTN_Y - 190, { text: 'MISS', color: C.bad, shake: 6 });
      return;
    }
    var late = lastHand === null ? 0 : readyT - cyc;
    var perf = late <= PERF_WIN;
    lift = Math.min(1, lift + (perf ? 1.4 : 1) / STEPS[idx]);
    lastHand = h; readyT = 0; cued = false; tug = 1; combo++; pulls++;
    if (perf) perfects++;
    if (demo) {
      game.fx.burst(bx, BTN_Y - 120, { color: perf ? C.gold : C.good, count: 8, speed: 200 });
    } else {
      game.feedback.good(bx, BTN_Y - 190, { text: perf ? 'PERFECT' : 'GOOD', color: perf ? C.gold : C.good, count: perf ? 12 : 6 });
      game.audio.tone(h === 'L' ? 'E4' : 'G4', 0.06, { wave: 'square', volume: 0.05 });
      if (combo > 0 && combo % 5 === 0) game.fx.popup('x' + combo, PULLEY_X, PULLEY_Y - 60, { color: C.gold, size: 52 });
    }
    if (lift >= 1) rescueDone(demo);
  }

  function rescueDone(demo) {
    phase = 'lift'; liftAnim = 0.6; rescued++;
    var cp = climberPos();
    if (demo) { game.fx.burst(cp.x, LEDGE_Y, { color: C.gold, count: 14, speed: 260 }); return; }
    game.audio.play('se_coin', 0.6);
    game.audio.play('se_milestone', 0.4);
    game.fx.popup(rescued >= NEEDED ? 'CLEAR' : 'NICE', W / 2, H * 0.3, { color: C.gold, size: 72 });
    game.fx.burst(cp.x, LEDGE_Y, { color: C.gold, count: 20, speed: 320 });
  }

  function tick(dt, demo) {
    if (tug > 0) tug = Math.max(0, tug - dt * 5);
    if (slipT > 0) slipT = Math.max(0, slipT - dt);
    press.L = Math.max(0, press.L - dt); press.R = Math.max(0, press.R - dt);
    shownLift += (lift - shownLift) * Math.min(1, dt * 12);
    if (phase === 'pull') {
      readyT += dt;
      var cyc = CYC[idx];
      if (lastHand !== null && !cued && readyT >= cyc) {
        cued = true;
        game.audio.tone(idx === 2 ? 'C5' : 'D5', 0.05, { wave: 'triangle', volume: demo ? 0.015 : 0.05 });
      }
      if (readyT > cyc + IDLE_LIMIT) {
        lift = Math.max(0, lift - 1 / STEPS[idx]); readyT = 0; cued = false; combo = 0; slipT = 0.5;
        var cp = climberPos();
        if (demo) game.fx.burst(cp.x, cp.y, { color: C.bad, count: 6, speed: 140 });
        else { slips++; game.feedback.bad(cp.x, cp.y - 100, { text: 'MISS', color: C.bad }); }
      }
    } else if (phase === 'lift') {
      liftAnim -= dt;
      if (liftAnim <= 0) {
        if (rescued >= NEEDED) {
          if (demo) phase = 'idle'; else endRun(true);
        } else {
          idx++; lift = 0; shownLift = 0; lastHand = null; readyT = 0; cued = false; phase = 'pull';
        }
      }
    }
  }

  function endRun(win) {
    if (phase === 'stop') return;
    ok = win; phase = 'stop'; hitStop = 0.5; focus = win ? 'ledge' : 'climber'; endFx = false;
    game.audio.stopBgm();
    if (!win) game.audio.tone('A2', 0.3, { wave: 'square', volume: 0.06, slide: -60 });
  }

  function score() { return rescued * 100 + perfects * 15 + (ok ? Math.round(Math.max(0, timeLeft) * 20) : 0); }

  // ── input ───────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.4); state = S.ATTRACT; initGame(); demo.t = 0; startTheme(); return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    var h = x < W / 2 ? 'L' : 'R';
    if (phase !== 'pull') { press[h] = 0.12; game.audio.tone('C4', 0.03, { wave: 'triangle', volume: 0.03 }); return; }
    game.audio.play('se_tap', 0.15);
    pull(h, false);
  });

  // ── demo(輪が満ちた瞬間に反対の手。1周に1回、同じ手を続けて滑らせる)─
  var demo = { t: 0, gx: BTN_X.L, gy: BTN_Y, press: 0, count: 0, slipDone: false, wait: 0 };
  var DEMO_CYC = 9;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { initGame(); phase = 'pull'; demo.count = 0; demo.slipDone = false; demo.wait = 0.5; }
    if (demo.press > 0) demo.press -= dt;
    demo.wait -= dt;
    var next = lastHand === 'L' ? 'R' : 'L';
    if (phase === 'pull' && demo.wait <= 0 && (lastHand === null || readyT >= CYC[idx] + 0.03)) {
      var h = next;
      if (demo.count === 3 && !demo.slipDone) { h = lastHand; demo.slipDone = true; }
      pull(h, true); demo.count++; demo.press = 0.15; demo.wait = 0.08;
    }
    tick(dt, true);
    var tx = BTN_X[demo.press > 0 ? (lastHand || 'L') : next];
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 14);
    demo.gy = BTN_Y - (demo.press > 0 ? 10 : 40);
  }

  // ── drawing ─────────────────────────────────────────────────────
  function drawWorld() {
    var t = game.time.elapsed;
    game.draw.gradient(0, LEDGE_Y, [[0, C.sky1], [1, C.sky2]]);
    // 遠くの峰(大きいドットの階段)
    for (var m = 0; m < 6; m++) {
      var mx = m * 200 - 40, mh = 120 + (m % 3) * 60;
      for (var s = 0; s < 6; s++) game.draw.rect(mx + (5 - s) * 16, LEDGE_Y - 40 - mh + s * (mh / 6), 200 - (5 - s) * 32, mh / 6 + 2, s < 2 ? C.snow : C.rock, 0.85);
    }
    game.draw.sprite(HUT, { r: C.red, s: C.ice, g: C.gold, k: C.ink }, W * 0.86, LEDGE_Y - 60, 10, { anchor: 'center' });
    game.draw.rect(W * 0.86 - 15, LEDGE_Y - 60, 20, 20, C.gold, 0.3 + 0.2 * Math.sin(t * 2.3));
    // 裂け目の内側
    game.draw.gradient(LEDGE_Y, H * 0.78, [[0, C.rock], [0.5, '#232a5c'], [1, C.deep]]);
    for (var y = LEDGE_Y; y < H * 0.78; y += 24) {
      var lw = W * 0.3 + Math.sin(y * 0.021) * 34 + (y - LEDGE_Y) * 0.06;
      var rw = W * 0.3 + Math.cos(y * 0.017) * 30 + (y - LEDGE_Y) * 0.06;
      game.draw.rect(0, y, lw, 25, C.ice);
      game.draw.rect(lw - 18, y, 18, 25, C.snow, 0.5);
      game.draw.rect(W - rw, y, rw, 25, C.ice);
      game.draw.rect(W - rw, y, 14, 25, C.rock, 0.6);
    }
    game.draw.rect(0, LEDGE_Y - 14, W * 0.34, 28, C.snow);
    game.draw.rect(W * 0.66, LEDGE_Y - 14, W * 0.34, 28, C.snow);
    // 雪面(親指ゾーン)
    game.draw.gradient(H * 0.78, H, [[0, C.snow], [1, C.ice]]);
    // 舞う粉雪
    for (var i = 0; i < 28; i++) {
      var fx = (i * 173 + t * (30 + (i % 4) * 14)) % W;
      var fy = (i * 97 + t * (60 + (i % 3) * 25)) % (H * 0.78);
      game.draw.rect(fx, fy, 8, 8, C.snow, 0.5);
    }
  }

  function drawRescue() {
    var t = game.time.elapsed;
    var cp = climberPos();
    // 三脚と滑車
    game.draw.line(PULLEY_X - 110, LEDGE_Y - 10, PULLEY_X, PULLEY_Y, C.gold, 10);
    game.draw.line(PULLEY_X + 110, LEDGE_Y - 10, PULLEY_X, PULLEY_Y, C.gold, 10);
    game.draw.circle(PULLEY_X, PULLEY_Y, 20 + tug * 6, C.red);
    game.draw.circle(PULLEY_X, PULLEY_Y, 8, C.ink);
    // 救助隊員
    var rx = W * 0.2, ry = LEDGE_Y - 70 + Math.sin(t * 2.4) * 3;
    var f = press.L > 0 || (lastHand === 'L' && tug > 0.3) ? 0 : (press.R > 0 || (lastHand === 'R' && tug > 0.3) ? 1 : 2);
    game.draw.sprite(RESCUER[f], PAL_R, rx + Math.sin(t * 1.3) * 4, ry, 12, { anchor: 'center' });
    // ザイル
    var ropeCol = slipT > 0 && Math.floor(t * 16) % 2 === 0 ? C.bad : C.red;
    game.draw.line(rx + 40, ry, PULLEY_X, PULLEY_Y, ropeCol, 6);
    if (phase !== 'idle' && !(phase === 'stop' && ok)) {
      game.draw.line(PULLEY_X, PULLEY_Y, cp.x, cp.y - 40, ropeCol, 6);
      var cl = CLIMBERS[Math.min(idx, 2)];
      if (focus === 'climber' && hitStop > 0) {
        game.draw.circle(cp.x, cp.y, 130, C.snow, 0.5 + 0.3 * Math.sin(t * 30));
        game.draw.sprite(cl.art[0], PAL_C, cp.x, cp.y, cl.px * 1.4, { anchor: 'center' });
      } else {
        game.draw.sprite(cl.art[Math.floor(t * 4) % 2], PAL_C, cp.x, cp.y, cl.px, { anchor: 'center' });
      }
    }
    // 引き上げた人たち(右の雪棚)
    for (var k = 0; k < rescued && k < 3; k++) {
      var c2 = CLIMBERS[k];
      var hx = W * 0.72 + k * 100, hy = LEDGE_Y - 50 + Math.sin(t * 3 + k) * 5;
      if (focus === 'ledge' && hitStop > 0) game.draw.circle(hx, hy, 60, C.gold, 0.5);
      game.draw.sprite(c2.art[Math.floor(t * 3 + k) % 2], PAL_C, hx, hy, 7, { anchor: 'center' });
    }
    // 深さ目盛り(左)
    game.draw.rect(40, LEDGE_Y + 60, 20, BOTTOM_Y - LEDGE_Y - 60, C.deep, 0.8);
    var gh = (BOTTOM_Y - LEDGE_Y - 60) * Math.max(0, Math.min(1, shownLift));
    game.draw.rect(40, BOTTOM_Y - gh, 20, gh, C.gold);
  }

  function drawGloves() {
    var t = game.time.elapsed;
    var cyc = CYC[Math.min(idx, 2)];
    ['L', 'R'].forEach(function(h) {
      var bx = BTN_X[h];
      var isNext = lastHand === null || lastHand !== h;
      var prog = lastHand === null ? 1 : Math.min(1, readyT / cyc);
      var lit = phase === 'pull' && isNext && prog >= 1;
      game.draw.circle(bx, BTN_Y, BTN_R + 10, C.rock, 0.5);
      game.draw.circle(bx, BTN_Y, BTN_R, isNext ? C.sky2 : C.deep, 0.9);
      if (phase === 'pull' && isNext) game.draw.circle(bx, BTN_Y, BTN_R * prog, lit ? C.gold : C.ice, lit ? 0.75 + 0.2 * Math.sin(t * 20) : 0.35);
      if (press[h] > 0) game.draw.circle(bx, BTN_Y, BTN_R + 24, C.snow, press[h] * 3);
      game.draw.sprite(GLOVE, { g: isNext ? C.red : C.rock }, bx, BTN_Y + (press[h] > 0 ? 10 : 0) + Math.sin(t * 2 + (h === 'L' ? 0 : 1.5)) * 5, 20, { anchor: 'center', flipX: h === 'R' });
    });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 228, C.ink, 0.7);
    txt(rescued + ' / ' + NEEDED, W / 2, 90, 68, C.gold);
    txt(String(Math.ceil(Math.max(0, timeLeft))), 70, 90, 52, C.snow, 'left');
    if (combo >= 2) txt('x' + combo, W - 70, 90, 44, C.good, 'right');
    var lowT = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 170, W - 120, 18, C.deep);
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 18, lowT ? C.bad : C.ice);
  }

  function ambient() {
    game.draw.rect(0, 0, W, H, C.snow, 0.02 + 0.02 * Math.sin(game.time.elapsed * 1.5));
  }

  function startTheme() {
    game.audio.melody([['E4', 0.5], ['G4', 0.5], ['B4', 1], ['A4', 0.5], ['G4', 0.5], ['E4', 1], ['D4', 0.5], ['E4', 0.5], ['G4', 1], ['R', 1]],
      { tempo: 118, wave: 'triangle', volume: 0.05, loop: true, bass: [['E2', 2], ['C2', 2], ['D2', 2], ['E2', 2]] });
  }

  // ── main loop ───────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawWorld(); drawRescue(); drawGloves();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 13 });
      ambient();
      game.draw.rect(0, 0, W, 230, C.ink, 0.7);
      txt(GAME_TITLE, W / 2 + Math.sin(t * 1.4) * 8, 96 + Math.sin(t * 2.1) * 6, 78, C.red);
      txt('HI-SCORE ' + (game.best || 0), W / 2, 184, 36, C.snow);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 40, C.red);
      else txt('INSERT COIN', W / 2, H * 0.965, 34, C.rock);
      return;
    }

    if (state === S.RESULT) {
      drawWorld(); drawRescue(); ambient();
      game.draw.rect(0, H * 0.24, W, H * 0.26, C.ink, 0.6);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.29, 96, ok ? C.gold : C.bad);
      txt(rescued + ' / ' + NEEDED, W / 2, H * 0.35, 56, C.snow);
      txt('SCORE ' + score(), W / 2, H * 0.4, 44, C.snow);
      txt('PERFECT ' + perfects + '   BEST ' + (game.best || 0), W / 2, H * 0.445, 32, C.ice);
      if (!ok && rescued === NEEDED - 1) txt('あと1人!', W / 2, H * 0.62, 56, C.red);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 38, C.ink);
      return;
    }

    // PLAYING
    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'pull'; readyT = 0; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'stop') {
      if (hitStop > 0) {
        hitStop -= dt;
        if (hitStop <= 0 && !endFx) {
          endFx = true;
          var cp = climberPos();
          if (ok) {
            game.feedback.good(W / 2, H * 0.3, { text: 'CLEAR', color: C.gold, count: 26 });
            game.audio.play('se_success', 0.6);
          } else {
            game.feedback.bad(cp.x, cp.y - 120, { text: 'TIME UP', color: C.bad });
            game.audio.play('se_failure', 0.6);
          }
          outro = 1.2;
        }
      } else {
        outro -= dt;
        if (outro <= 0) {
          state = S.RESULT;
          var stats = { rescued: rescued, perfects: perfects, slips: slips, pulls: pulls };
          if (ok) game.end.success(score(), stats); else game.end.failure(stats);
        }
      }
    } else {
      tick(dt, false);
      if (phase !== 'stop') {
        timeLeft -= dt;
        if (timeLeft <= 0) { timeLeft = 0; endRun(false); }
      }
    }

    drawWorld(); drawRescue(); drawGloves(); ambient(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 96, C.gold);
    if (!ok && phase === 'stop' && rescued === NEEDED - 1 && hitStop <= 0) txt('あと1人!', W / 2, H * 0.5, 60, C.red);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame();
    startTheme();
  });
})(game);

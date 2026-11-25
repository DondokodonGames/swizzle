// J-Switch-0058-drumhall-teacup-stack.js
// 稽古場の隣の湯呑み積み — 左右に揺れる手から湯呑みを落として盆に積む。本物の太鼓の揺れだけを避け、にぎやかな鳴り物には惑わされない
// 操作: タップで手の湯呑みを落とす。障子に映る影が撥を振り上げたら「ドン」で手と盆が揺れるので、その間は落とさない。笛や鈴の音・紙吹雪は揺れない(社内メモ。画面には出さない)
// 終わり: 湯呑みを8個積めばCLEAR。3個落とす/塔が傾きすぎて崩れる/時間切れでGAME OVER
// @mechanic: stack
// @theme: drum_rehearsal_teacup_stack
// 世界観: 祭り前夜、太鼓の稽古場と障子一枚で隣り合う茶屋で、見習いの茶運びが、壁越しに響く太鼓の揺れや笛・鈴の鳴り物に惑わされず、湯呑みを盆の上に一つずつ正確に積んで座敷への注文の数をそろえる
// 残るもの: 正誤(CLEAR/GAME OVER) + 積んだ数・ぴったり数・落とした数
// スタイル: 2000s BILLBOARD 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s BILLBOARD 3D: 奥行きは sprite の px スケール、接地影で位置を示す
  var STYLE = { bg: ['#f0dcb0', '#c89a6a', '#7a5238'], main: ['#e8e0d0', '#5a8a7a', '#3a2a1e'], accent: ['#e04a3a', '#ffd24a'] };
  var C = {
    wall1: '#f2e2bc', wall2: '#d8b888', floor1: '#a8784c', floor2: '#6a4628', shoji: '#fff6e0', frame: '#6a4628', shadow: '#2a1a10',
    cup: '#e8e4d8', cupD: '#9ab8a8', glaze: '#4a7a6a', tray: '#8a3a2a', trayD: '#5a2418', white: '#ffffff', ink: '#1e140c', bad: '#e04a3a', gold: '#ffd24a', skin: '#f0c8a0'
  };

  var GAME_TITLE = 'TEACUP TOWER';
  var TIME_LIMIT = 22;
  var NEEDED = 8;
  var MAX_DROP = 3;
  var CUP_W = 112, CUP_H = 62;
  var BASE_X = W * 0.5, BASE_Y = H * 0.705;
  var TOPPLE = CUP_W * 0.62;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var phase, ready, timeLeft, tower, hand, falling, drops, perfects, hitStop, outro, ok, focus, drum, fake, jolt, sway, milestone, flashCol;

  // ── sprites ───────────────────────────────────────────────────────
  var CUP = ['cccccccc', 'cggggggc', 'cccccccc', '.cccccc.', '..dddd..'];
  var HAND = [
    ['..ssss..', '.ssssss.', 'ssssssss', 'kkkkkkkk'],
    ['..ssss..', '.ssssss.', 'ssssssss', 'kk.kk.kk']
  ];
  var DRUMMER = [
    ['s......s', '.s....s.', '..kkkk..', '..kkkk..', '.kkkkkk.', 'kkkkkkkk', '.kk..kk.'],
    ['........', '........', '..kkkk..', 'skkkkkks', '.kkkkkk.', 'kkkkkkkk', '.kk..kk.']
  ];
  var BELL = ['..y..', '.yyy.', 'yyyyy', '..k..'];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: C.white, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function topX() { return tower.length ? tower[tower.length - 1].x : BASE_X; }
  function topY() { return BASE_Y - tower.length * CUP_H; }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; tower = []; drops = 0; perfects = 0;
    hand = { ph: 0, x: BASE_X, shift: 0 }; falling = null;
    hitStop = 0; outro = 0; ok = false; focus = null; milestone = false; sway = 0; flashCol = null;
    drum = { next: 2.2, warn: 0, hit: 0 }; fake = { next: 1.4, t: 0, kind: 0 }; jolt = 0;
  }

  function lean() {
    var s = 0;
    for (var i = 0; i < tower.length; i++) s += tower[i].x - BASE_X;
    return tower.length ? s / tower.length : 0;
  }

  // 手の往復・太鼓・鳴り物(実プレイ・デモ共用)
  function stepHall(dt, isDemo) {
    var sp = 2.2 + tower.length * 0.22;
    hand.ph += dt * sp;
    hand.shift *= Math.pow(0.5, dt * 6);
    hand.x = BASE_X + Math.sin(hand.ph) * (W * 0.26) + hand.shift;
    if (jolt > 0) jolt -= dt;
    sway = Math.sin(game.time.elapsed * 3) * Math.abs(lean()) * 0.08 + (jolt > 0 ? Math.sin(jolt * 60) * 10 : 0);
    // 本物の太鼓: 0.7秒前に影が撥を振り上げる
    if (drum.warn > 0) {
      drum.warn -= dt;
      if (drum.warn <= 0) {
        drum.hit = 0.35; jolt = 0.4;
        hand.shift += (Math.random() < 0.5 ? -1 : 1) * 150;
        if (falling) falling.x += (Math.random() < 0.5 ? -1 : 1) * 70;
        game.audio.tone('C2', 0.25, { wave: 'square', volume: isDemo ? 0.03 : 0.12, slide: -30 });
        if (!isDemo) game.fx.shake(10, 0.25);
      }
    } else {
      drum.next -= dt;
      if (drum.next <= 0) { drum.warn = 0.7; drum.next = game.random(2.2, 3.2); if (!isDemo) game.audio.tone('G2', 0.5, { wave: 'triangle', volume: 0.04, slide: 20 }); }
    }
    if (drum.hit > 0) drum.hit -= dt;
    // にぎやかし: 笛・鈴・紙吹雪(揺れない)
    fake.next -= dt;
    if (fake.t > 0) fake.t -= dt;
    if (fake.next <= 0) {
      fake.next = game.random(1.3, 2.3); fake.t = 0.45; fake.kind = Math.floor(Math.random() * 3);
      if (!isDemo) {
        if (fake.kind === 0) game.audio.tone('A6', 0.3, { wave: 'sine', volume: 0.06, slide: -300 });
        else if (fake.kind === 1) game.audio.tone('E6', 0.2, { wave: 'square', volume: 0.05 });
        else game.fx.burst(W * 0.85, H * 0.3, { color: C.gold, count: 16, speed: 360 });
      }
    }
    // 落下中の湯呑み
    if (falling) {
      falling.v += 5200 * dt;
      falling.y += falling.v * dt;
      var ly = topY() - CUP_H * 0.5;
      if (falling.y >= ly) land(isDemo);
    }
  }

  function drop(isDemo) {
    if (falling) return false;
    falling = { x: hand.x, y: topY() - 250, v: 0 };
    return true;
  }

  function land(isDemo) {
    var f = falling; falling = null;
    // 揺れている最中に着いた湯呑みは弾んでずれる
    if (jolt > 0) f.x += (Math.random() < 0.5 ? -1 : 1) * game.random(45, 80);
    var off = f.x - topX();
    if (Math.abs(off) > CUP_W * 0.5) {
      // はみ出して落ちる
      if (isDemo) { game.fx.burst(f.x, topY(), { color: C.cup, count: 10, speed: 260 }); return; }
      drops++;
      focus = { x: f.x, y: topY() - 20, t: 0.5 };
      hitStop = 0.4;
      game.audio.play('se_break', 0.4);
      game.feedback.bad(f.x, topY() - 120, { text: 'MISS', color: C.bad });
      if (drops >= MAX_DROP) finish(false);
      return;
    }
    tower.push({ x: f.x });
    if (Math.abs(lean()) > TOPPLE && tower.length > 1) {
      if (isDemo) { tower = []; return; }
      focus = { x: topX(), y: topY(), t: 0.6 };
      game.feedback.bad(topX(), topY() - 120, { text: 'MISS', color: C.bad });
      finish(false);
      return;
    }
    if (isDemo) { game.fx.burst(f.x, topY(), { color: C.gold, count: 6, speed: 150 }); if (tower.length >= 5) tower = []; return; }
    var perf = Math.abs(off) <= 12;
    if (perf) perfects++;
    game.feedback.good(f.x, topY() - 110, { text: perf ? 'PERFECT' : 'GOOD', color: perf ? C.gold : C.glaze, count: perf ? 14 : 8 });
    game.audio.play('se_coin', 0.3);
    if (!milestone && tower.length >= NEEDED / 2) {
      milestone = true;
      game.audio.play('se_milestone', 0.5);
      game.fx.popup(tower.length + ' / ' + NEEDED, W / 2, H * 0.25, { color: C.glaze, size: 70 });
    }
    if (tower.length >= NEEDED) finish(true);
  }

  function finish(win) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.55;
    game.audio.stopBgm();
    if (win) {
      game.fx.flash(C.gold, 0.25);
      game.fx.burst(topX(), topY(), { color: C.gold, count: 30, speed: 420 });
      game.audio.play('se_success', 0.6);
    } else {
      game.feedback.bad(BASE_X, H * 0.3, { text: timeLeft <= 0 ? 'TIME UP' : 'GAME OVER', color: C.bad });
      game.audio.play('se_failure', 0.6);
    }
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    if (phase !== 'play' || hitStop > 0 || falling) { game.audio.tone('D4', 0.03, { wave: 'triangle', volume: 0.03 }); game.fx.burst(x, y, { color: C.frame, count: 3, speed: 80 }); return; }
    if (drop(false)) game.audio.play('se_tap', 0.3);
  });

  // ── demo(手が真上に来たら落とす。1周に1回、太鼓の直前に落として外す)──
  var demo = { t: 0, gx: W * 0.5, gy: H * 0.88, press: 0, rash: false };
  var DEMO_CYC = 9;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { tower = []; falling = null; hand.ph = 0; hand.shift = 0; drum = { next: 3, warn: 0, hit: 0 }; demo.rash = false; }
    stepHall(dt, true);
    if (demo.press > 0) demo.press -= dt;
    var aligned = Math.abs(hand.x + Math.cos(hand.ph) * 0 - topX()) < 14 && Math.abs(hand.shift) < 10;
    if (!falling && demo.press <= 0) {
      if (drum.warn > 0 && drum.warn < 0.2 && !demo.rash && cyc > 3) { demo.rash = true; drop(true); demo.press = 0.2; }
      else if (aligned && drum.warn <= 0) { drop(true); demo.press = 0.2; }
    }
    demo.gx = W * 0.5 + Math.sin(demo.t * 0.8) * 40;
    demo.gy = H * 0.88 - (demo.press > 0 ? 16 : 0);
  }

  // ── drawing ───────────────────────────────────────────────────────
  function drawRoom() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.wall1], [0.55, C.wall2], [0.62, C.floor1], [1, C.floor2]]);
    // 奥の障子(隣の稽古場)。太鼓打ちの影が映る
    var sx = W * 0.06, sy = H * 0.16, sw = W * 0.5, sh = H * 0.3;
    game.draw.rect(sx - 12, sy - 12, sw + 24, sh + 24, C.frame);
    game.draw.rect(sx, sy, sw, sh, C.shoji);
    var raised = drum.warn > 0;
    game.draw.sprite(DRUMMER[raised ? 0 : 1], { k: C.shadow, s: C.shadow }, sx + sw * 0.5 + (drum.hit > 0 ? Math.sin(t * 80) * 6 : 0), sy + sh * 0.55, 26, { anchor: 'center', alpha: raised ? 0.8 : 0.45 });
    if (raised && Math.floor(t * 12) % 2 === 0) game.draw.rect(sx, sy, sw, sh, C.bad, 0.12);
    for (var gx = 1; gx < 4; gx++) game.draw.rect(sx + gx * sw / 4 - 3, sy, 6, sh, C.frame, 0.8);
    for (var gy = 1; gy < 4; gy++) game.draw.rect(sx, sy + gy * sh / 4 - 3, sw, 6, C.frame, 0.8);
    if (drum.hit > 0) for (var r = 0; r < 3; r++) game.draw.circle(sx + sw * 0.5, sy + sh * 0.6, 80 + r * 60 + (0.35 - drum.hit) * 400, C.shadow, 0.08);
    // 窓の外の祭り(にぎやかしの出どころ)
    var wx = W * 0.66, wy = H * 0.2;
    game.draw.rect(wx - 10, wy - 10, W * 0.28 + 20, H * 0.16 + 20, C.frame);
    for (var st = 0; st < 8; st++) game.draw.rect(wx, wy + st * H * 0.02, W * 0.28, H * 0.02 + 1, st < 4 ? (st < 2 ? '#3a4a7a' : '#6a5a7a') : (st < 6 ? '#b0706a' : '#e08a5a'));
    for (var l = 0; l < 4; l++) game.draw.circle(wx + 40 + l * 70, wy + 60 + Math.sin(t * 2 + l) * 6, 20, l % 2 ? C.bad : C.gold, 0.9);
    if (fake.t > 0) {
      if (fake.kind === 0) game.draw.sprite(BELL, { y: C.gold, k: C.ink }, wx + W * 0.14, wy + H * 0.08, 14, { anchor: 'center' });
      game.draw.rect(0, 0, W, H, fake.kind === 1 ? '#7ad0ff' : C.gold, 0.12 * fake.t / 0.45);
    }
    game.draw.rect(0, 0, W, H, C.gold, 0.015 + 0.015 * Math.sin(t * 1.2));
  }

  function drawTower() {
    var t = game.time.elapsed;
    // 低い卓と盆(接地影)
    game.draw.rect(BASE_X - 330, BASE_Y + 70, 660, 30, C.shadow, 0.3);
    game.draw.rect(BASE_X - 300, BASE_Y + 30, 600, 50, C.frame);
    game.draw.rect(BASE_X - 200, BASE_Y + 10, 400, 26, C.tray);
    game.draw.rect(BASE_X - 200, BASE_Y + 30, 400, 8, C.trayD);
    for (var i = 0; i < tower.length; i++) {
      var c = tower[i];
      var k = (i + 1) / Math.max(1, tower.length);
      var x = c.x + sway * k * 2;
      var y = BASE_Y - i * CUP_H - CUP_H * 0.5 + (jolt > 0 ? Math.sin(jolt * 70 + i) * 4 : 0);
      var hl = focus && focus.t > 0 && i === tower.length - 1 && !ok && Math.floor(t * 14) % 2 === 0;
      game.draw.sprite(CUP, { c: hl ? C.bad : C.cup, g: C.glaze, d: C.cupD }, x, y, 14, { anchor: 'center' });
    }
    if (falling) {
      game.draw.rect(falling.x - 50, topY() - 8, 100, 10, C.shadow, 0.3);
      game.draw.sprite(CUP, { c: C.cup, g: C.glaze, d: C.cupD }, falling.x, falling.y, 14, { anchor: 'center' });
    }
    if (focus && focus.t > 0 && Math.floor(t * 14) % 2 === 0) game.draw.circle(focus.x, focus.y, 100, C.bad, 0.35);
  }

  function drawHand() {
    var t = game.time.elapsed;
    var hy = topY() - 260;
    // 真下の目印(接地影のように塔の頂に落ちる)
    game.draw.rect(hand.x - 50, topY() - 8, 100, 10, C.shadow, falling ? 0 : 0.2);
    if (!falling && state !== S.RESULT) game.draw.sprite(CUP, { c: C.cup, g: C.glaze, d: C.cupD }, hand.x, hy + 40, 14, { anchor: 'center' });
    game.draw.sprite(HAND[Math.floor(t * 3) % 2], { s: C.skin, k: C.glaze }, hand.x, hy - 20 + Math.sin(t * 4) * 3, 14, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 228, C.ink, 0.72);
    game.draw.text(String(Math.ceil(Math.max(0, timeLeft))), 70, 96, { size: 56, color: C.white, bold: true, align: 'left' });
    game.draw.text(tower.length + ' / ' + NEEDED, W / 2, 96, { size: 66, color: C.gold, bold: true, align: 'center' });
    for (var i = 0; i < MAX_DROP; i++) game.draw.circle(W - 200 + i * 60, 90, 18, i < drops ? C.bad : '#6a5a4a');
    game.draw.rect(60, 170, W - 120, 18, '#4a3a2a');
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 18, timeLeft < 5 ? C.bad : C.gold);
    // 傾きの目盛り(卓の下)
    var ln = Math.max(-1, Math.min(1, lean() / TOPPLE));
    game.draw.rect(BASE_X - 200, H * 0.78, 400, 14, '#4a3a2a');
    game.draw.rect(BASE_X - 8 + ln * 192, H * 0.78 - 8, 16, 30, Math.abs(ln) > 0.7 ? C.bad : C.glaze);
    // 親指ゾーン(盆を置く台)
    game.draw.rect(0, H * 0.82, W, H * 0.18, C.floor2, 0.6);
  }

  function score() { return tower.length * 120 + perfects * 60 + Math.round(Math.max(0, timeLeft) * 15) - drops * 40; }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (focus && focus.t > 0 && phase !== 'stop') focus.t -= dt;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawRoom(); drawTower(); drawHand();
      game.draw.rect(0, H * 0.82, W, H * 0.18, C.floor2, 0.6);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 13 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.72);
      game.draw.text(GAME_TITLE, W / 2 + Math.sin(t * 1.4) * 8, 100 + Math.sin(t * 2) * 6, { size: 76, color: C.gold, bold: true, align: 'center' });
      game.draw.text('HI-SCORE ' + game.best, W / 2, 190, { size: 36, color: C.white, bold: true, align: 'center' });
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.985, 40, C.bad);
      else txt('INSERT COIN', W / 2, H * 0.985, 34, C.ink);
      return;
    }

    if (state === S.RESULT) {
      drawRoom(); drawTower();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 96, ok ? C.glaze : C.bad);
      txt('SCORE ' + (ok ? score() : 0), W / 2, H * 0.36, 48, C.ink);
      txt('BEST ' + game.best, W / 2, H * 0.4, 36, C.frame);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.985, 38, C.ink);
      return;
    }

    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'play') {
      if (hitStop > 0) hitStop -= dt;
      else {
        timeLeft -= dt;
        stepHall(dt, false);
        if (phase === 'play' && timeLeft <= 0) { timeLeft = 0; finish(false); }
      }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      if (outro <= 0) {
        state = S.RESULT;
        var stats = { stacked: tower.length, perfect: perfects, dropped: drops };
        if (ok) game.end.success(score(), stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawRoom(); drawTower(); drawHand(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 100, C.bad);
    if (phase === 'outro') {
      game.draw.rect(0, H * 0.25, W, H * 0.17, C.wall1, 0.9);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 96, ok ? C.glaze : C.bad);
      txt('SCORE ' + (ok ? score() : 0), W / 2, H * 0.35, 44, C.ink);
      if (ok && score() > game.best) txt('NEW RECORD', W / 2, H * 0.395, 42, C.bad);
      else if (!ok) txt('あと' + Math.max(1, NEEDED - tower.length) + '個!', W / 2, H * 0.395, 44, C.ink);
      else txt('BEST ' + game.best, W / 2, H * 0.395, 36, C.frame);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['D5', 1], ['E5', 0.5], ['G5', 0.5], ['A5', 1], ['G5', 0.5], ['E5', 0.5],
      ['D5', 1], ['B4', 1], ['A4', 2]
    ], { tempo: 100, wave: 'triangle', volume: 0.045, loop: true, bass: [['D3', 2], ['G2', 2], ['A2', 2], ['D3', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

// I-GBA-0005v3-rope-exam-count.js
// ロープイグザム — 審判の札の回数ぴったりで跳び、次の一周で跳ばずに止まって礼をする縄跳び昇級試験
// 操作: 縄が足元に来るたびにタップで1回跳ぶ。札の数だけ跳んだら、次の縄では叩かずに止まる。回数ランプは後半ほど早く消える
// 終わり: 3セットとも回数ぴったりで止まれば成功。跳びすぎ/足りずに止まる/縄のないところで跳ぶ/時間切れで失敗
// @mechanic: count_exact
// @theme: gym_rope_grade_exam
// 世界観: 体育館の昇級試験で、縄跳び教室の生徒が審判の示す回数ぴったりで跳び終えて縄を止め、礼をして次の級へ進む
// 残るもの: 正誤(CLEAR/GAME OVER) + 通過したセット数と跳んだ総回数
// スタイル: HYPERCASUAL 3D

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  // HYPERCASUAL 3D: 白背景+単色、柔らかい影の丸い塊、当たり判定は見た目どおり
  var STYLE = { bg: ['#ffffff', '#eef1f6', '#dfe4ec'], main: ['#ff6f61', '#2e3440', '#ffffff'], accent: ['#ffc145', '#4cc38a'] };
  var INK = STYLE.main[1], HUE = STYLE.main[0];

  var SETS = [{ n: 5, period: 0.62, blindAfter: 99 }, { n: 8, period: 0.53, blindAfter: 3 }, { n: 11, period: 0.45, blindAfter: 2 }];
  var WINDOW = 0.15;
  var TIME_LIMIT = 25;
  var FX = W / 2, FY = H * 0.62;

  var PUPIL = ['..###..', '.#####.', '.#e#e#.', '..###..', '.#####.', '#######', '#.###.#', '..#.#..', '.##.##.'];
  var PUPIL_BOW = ['.......', '..###..', '.#####.', '.#####.', '#######', '#.###.#', '..###..', '..#.#..', '.##.##.'];
  var PUPIL_PAL = { '#': HUE, 'e': INK };
  var PUPIL_HIT = { '#': '#ffffff', 'e': HUE };
  var JUDGE = ['.###.', '#####', '#e#e#', '.###.', '#####', '#####'];
  var CARD = ['#######', '#.....#', '#.....#', '#.....#', '#######'];

  var view = 'ATTRACT';
  var X;

  function newExam() {
    return {
      set: 0, n: SETS[0].n, count: 0, total: 0, passed: 0, clock: TIME_LIMIT, intro: 0.8,
      turning: false, ropeT: 0, period: SETS[0].period, windowUsed: false, startIn: 1.0,
      air: 0, bow: 0, halt: 0, fail: '', won: false, cardFlip: 0.4, lampFlash: 0, slap: 0,
    };
  }

  function loadSet(i) {
    X.set = i; X.n = SETS[i].n; X.period = SETS[i].period; X.count = 0;
    X.turning = false; X.startIn = 1.0; X.windowUsed = false; X.cardFlip = 0.4; X.ropeT = 0;
    game.audio.tone('C5', 0.08, { wave: 'sine', volume: 0.06 });
  }

  // 次の到達(縄が足元)までの時間: ropeT が period に達した瞬間が到達
  function distToArrival() { return Math.abs(X.period - X.ropeT); }

  function hop() {
    if (!X.turning) { X.air = 0.25; game.audio.play('se_tap', 0.15); return; }
    var near = distToArrival() <= WINDOW;
    if (!near || X.windowUsed) { fault('stray'); return; }
    X.windowUsed = true;
    X.count++; X.total++;
    X.air = 0.3;
    game.audio.tone(['C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6'][Math.min(7, X.count - 1)], 0.07, { wave: 'triangle', volume: 0.06 });
    if (X.count > X.n) { fault('over'); return; }
    game.feedback.good(FX, FY - 330, { text: 'GOOD', color: STYLE.accent[1], size: 36, count: 5, sound: false });
    game.audio.play('se_jump', 0.2);
  }

  function fault(kind) {
    X.fail = kind; X.halt = 0.5; X.turning = false;
    game.fx.flash('#ffffff', 0.12);
    game.audio.play('se_break', 0.35);
  }

  function stopAndJudge() {
    X.turning = false;
    if (X.count === X.n) {
      X.passed++; X.bow = 0.9;
      game.feedback.good(FX, FY - 360, { text: 'PERFECT', color: STYLE.accent[0], size: 54 });
      game.audio.play('se_milestone', 0.4);
      game.fx.popup(X.passed + ' / ' + SETS.length, FX, H * 0.22, { color: HUE, size: 50 });
      if (X.passed >= SETS.length) { X.won = true; X.halt = 0.6; }
    } else {
      fault('short');
    }
  }

  function examStep(dt) {
    X.clock -= dt;
    if (X.air > 0) X.air -= dt;
    if (X.slap > 0) X.slap -= dt;
    if (X.cardFlip > 0) X.cardFlip -= dt;
    if (X.bow > 0) {
      X.bow -= dt;
      if (X.bow <= 0 && !X.won) loadSet(X.set + 1);
    } else if (!X.turning) {
      X.startIn -= dt;
      if (X.startIn <= 0) { X.turning = true; X.ropeT = X.period * 0.35; X.windowUsed = false; }
      else if (Math.floor((X.startIn + dt) / 0.33) !== Math.floor(X.startIn / 0.33)) game.audio.tone('G4', 0.04, { wave: 'square', volume: 0.04 });
    } else {
      var before = X.ropeT;
      X.ropeT += dt;
      if (before < X.period && X.ropeT >= X.period) { X.slap = 0.1; game.audio.tone('C4', 0.04, { wave: 'square', volume: 0.05 }); }
      if (X.ropeT >= X.period + WINDOW) {
        if (!X.windowUsed) { stopAndJudge(); return; }
        X.ropeT -= X.period;
        X.windowUsed = false;
      }
    }
    if (X.clock <= 0 && !X.won) { X.clock = 0; fault('time'); }
  }

  function wrapExam() {
    var stats = { passed: X.passed, sets: SETS.length, jumps: X.total };
    if (X.won) {
      game.feedback.good(FX, FY - 380, { text: 'CLEAR', color: STYLE.accent[0], size: 66 });
      game.audio.play('se_success', 0.6);
      game.end.success(X.passed * 300 + X.total * 10 + Math.round(X.clock * 20), stats);
    } else {
      game.feedback.bad(FX, FY - 200, { text: X.fail === 'time' ? 'TIME UP' : 'MISS', size: 60 });
      game.audio.play('se_failure', 0.6);
      game.end.failure(stats);
    }
    view = 'RESULT';
  }

  // ── 描画 ─────────────────────────
  function gym() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.55, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    // 床の境界と柔らかい光
    game.draw.rect(0, H * 0.5, W, 4, '#d3d9e3');
    game.draw.circle(FX, FY + 40, 330, HUE, 0.06 + 0.02 * Math.sin(t * 2));
    for (var l = 0; l < 5; l++) game.draw.rect(0, H * 0.5 + l * 70 + 30, W, 3, '#e4e8ef');
    // 奥の窓と壁のライン
    for (var w = 0; w < 5; w++) game.draw.rect(W * (0.08 + w * 0.18), H * 0.3, W * 0.12, H * 0.1, '#e9eef6');
    // 審判台
    game.draw.circle(W * 0.8, H * 0.49, 80, '#000000', 0.06);
    game.draw.rect(W * 0.7, H * 0.43, W * 0.2, 60, '#cfd6e0');
    game.draw.sprite(JUDGE, { '#': INK, 'e': '#ffffff' }, W * 0.8, H * 0.39, 14, { anchor: 'center' });
    var up = X.cardFlip > 0 ? 1 - X.cardFlip / 0.4 : 1;
    game.draw.sprite(CARD, { '#': HUE }, W * 0.8, H * 0.31 + (1 - up) * 60, 22, { anchor: 'center', alpha: up });
    game.draw.text(String(X.n), W * 0.8, H * 0.31 + (1 - up) * 60, { size: 64, color: INK, bold: true, align: 'center' });
  }

  function pupilAndRope() {
    var phase = X.turning ? X.ropeT / X.period : 0.5;
    var ang = phase * Math.PI * 2;
    var lift = X.air > 0 ? Math.sin((X.air / 0.3) * Math.PI) * 90 : 0;
    var bowing = X.bow > 0 || (X.won && X.halt > 0);
    game.draw.circle(FX, FY + 30, 110 - lift * 0.3, '#000000', 0.1);
    game.draw.circle(FX, FY + 30, 70 - lift * 0.2, '#000000', 0.08);
    var hy = FY - 170 - lift;
    // 縄: 手元2点から、角度で頭上(上)と足元(下)を行き来する弧
    var low = Math.cos(ang) > 0;
    var topY = hy - 240, footY = FY + 30;
    var depthY = topY + (footY - topY) * (1 + Math.cos(ang)) * 0.5;
    function rope() {
      var px = FX - 120, py = hy + 40;
      for (var i = 1; i <= 10; i++) {
        var s = i / 10;
        var x = FX - 120 + 240 * s;
        var y = hy + 40 + (depthY - hy - 40) * Math.sin(Math.PI * s);
        game.draw.line(px, py, x, y, X.fail && X.halt > 0 ? '#ff3b30' : INK, 7);
        px = x; py = y;
      }
    }
    if (!low) rope();
    var pal = X.fail && X.halt > 0 ? PUPIL_HIT : PUPIL_PAL;
    var bob = X.turning ? 0 : Math.sin(game.time.elapsed * 3) * 4;
    game.draw.sprite(bowing ? PUPIL_BOW : PUPIL, pal, FX, FY - 110 - lift + bob, X.fail && X.halt > 0 ? 30 : 26, { anchor: 'center' });
    if (low) rope();
    if (X.slap > 0) game.draw.circle(FX, FY + 30, 120, INK, 0.12);
    if (!X.turning && X.startIn > 0 && X.bow <= 0) game.draw.circle(FX, FY - 110, 190 * (X.startIn / 1.0) + 40, STYLE.accent[0], 0.18);
  }

  function lamps() {
    var blindAt = SETS[X.set].blindAfter;
    var blind = X.count >= blindAt;
    var y = H * 0.76;
    var gap = Math.min(80, (W - 160) / X.n);
    var x0 = FX - gap * (X.n - 1) / 2;
    for (var i = 0; i < X.n; i++) {
      var lit = !blind && i < X.count;
      game.draw.circle(x0 + i * gap, y, 26, lit ? STYLE.accent[1] : '#d7dde6');
      game.draw.circle(x0 + i * gap - 7, y - 8, 8, '#ffffff', 0.7);
    }
  }

  function tapPad() {
    game.draw.circle(FX, H * 0.885, 130, '#000000', 0.06);
    game.draw.circle(FX, H * 0.875, 125, X.air > 0 ? STYLE.accent[0] : HUE, 0.9);
    game.draw.sprite(['..#..', '.###.', '#####'], { '#': '#ffffff' }, FX, H * 0.875, 18, { anchor: 'center' });
  }

  function label(s, x, y, size, color) {
    game.draw.text(s, x, y + 4, { size: size, color: '#000000', bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function drawAll() {
    gym();
    pupilAndRope();
    lamps();
    tapPad();
  }

  // ── ATTRACT: 本物の examStep/hop をボットが叩く(2セット目でわざと跳びすぎ) ─────
  var demo = { t: 0, gx: FX, gy: H * 0.875, pressT: 0 };
  function demoExam(dt) {
    demo.t += dt;
    var cyc = demo.t % 9.5;
    if (cyc < dt || demo.t <= dt) { X = newExam(); X.intro = 0; X.n = 3; X.startIn = 0.6; }
    if (demo.pressT > 0) demo.pressT -= dt;
    if (X.halt > 0) { X.halt -= dt; return; }
    examStep(dt);
    if (X.fail) return;
    if (X.set === 1 && X.count === 0 && X.n !== 4) X.n = 4;
    var limit = X.set === 0 ? X.n : X.n + 1;
    if (X.turning && !X.windowUsed && X.count < limit && X.ropeT >= X.period - 0.03 && X.ropeT < X.period + 0.1) {
      demo.pressT = 0.18;
      hop();
      if (X.fail) game.feedback.bad(FX, FY - 200, { text: 'MISS', size: 50 });
    }
  }

  game.onTap(function (x, y) {
    if (view === 'ATTRACT') { game.audio.play('se_coin', 0.5); X = newExam(); view = 'PLAYING'; return; }
    if (view === 'RESULT') { game.audio.play('se_tap', 0.3); view = 'ATTRACT'; X = newExam(); demo.t = 0; return; }
    if (X.intro > 0 || X.halt > 0 || X.bow > 0) { game.audio.play('se_tap', 0.1); return; }
    hop();
  });

  game.onUpdate(function (dt) {
    if (!X) X = newExam();
    if (view === 'ATTRACT') {
      demoExam(dt);
      drawAll();
      game.draw.hand(demo.gx, demo.gy, { press: demo.pressT > 0, scale: 14 });
      label('ROPE EXAM', FX, 90, 68, HUE);
      label('BEST ' + (game.best > 0 ? game.best : '-'), FX, 165, 34, INK);
      if (Math.floor(game.time.elapsed * 1.6) % 2 === 0) label('► 100円 投入 ◄', FX, H * 0.97, 42, HUE);
      else label('INSERT COIN', FX, H * 0.97, 36, INK);
      return;
    }
    if (view === 'RESULT') {
      drawAll();
      game.draw.rect(0, H * 0.3, W, H * 0.26, '#ffffff', 0.9);
      label(X.won ? 'CLEAR' : 'GAME OVER', FX, H * 0.36, 90, X.won ? STYLE.accent[1] : HUE);
      label(X.passed + ' / ' + SETS.length, FX, H * 0.43, 54, INK);
      var sc = X.passed * 300 + X.total * 10 + Math.round(X.clock * 20);
      if (!X.won) {
        var diff = X.n - X.count;
        label(diff > 0 ? 'あと' + diff + '回!' : (diff < 0 ? (-diff) + '回 MISS' : 'MISS'), FX, H * 0.49, 48, HUE);
      } else label(sc > game.best ? 'NEW RECORD' : 'BEST ' + game.best, FX, H * 0.49, 46, STYLE.accent[0]);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', FX, H * 0.97, 36, INK);
      return;
    }
    if (X.intro > 0) {
      X.intro -= dt;
      if (X.intro <= 0) game.audio.play('se_tap', 0.3);
    } else if (X.halt > 0) {
      X.halt -= dt;
      if (X.halt <= 0) { wrapExam(); return; }
    } else {
      examStep(dt);
    }
    drawAll();
    label(X.passed + ' / ' + SETS.length, W * 0.2, 70, 46, INK);
    label(X.clock.toFixed(1), W * 0.8, 70, 46, X.clock < 5 ? HUE : INK);
    game.draw.rect(60, 150, W - 120, 16, '#dfe4ec');
    game.draw.rect(60, 150, (W - 120) * Math.max(0, X.clock / TIME_LIMIT), 16, HUE);
    if (X.intro > 0) label(X.intro > 0.35 ? 'READY?' : 'GO!', FX, H * 0.45, 92, HUE);
  });

  game.onStart(function () {
    game.audio.melody([['F4', 0.5], ['A4', 0.5], ['C5', 0.5], ['A4', 0.5], ['G4', 0.5], ['B4', 0.5], ['D5', 1]], { tempo: 116, wave: 'sine', volume: 0.05, loop: true, bass: true });
    view = 'ATTRACT';
    X = newExam();
    demo.t = 0;
  });
})(game);

// I-GBA-0009v2-hive-odd-bee-tally.js
// ハイブ・オッドビー・タリー — 巣箱へ出入りする蜂の群れに紛れた色違いの蜂を数え、巣枠の数字で答える
// 操作: 蜂の群れが横切る間は見て数えるだけ。群れが過ぎたら下の4枚の巣枠から、色違いの蜂の数が書かれた枠をタップ
// 終わり: 3群(だんだん多く・速く・往復し、大きな雄蜂の紛らわしい影も混ざる)を全て正解でCLEAR。1回でも違う数/答えそびれ/15秒切れでGAME OVER
// @mechanic: counting
// @theme: spring_apiary_odd_bee_count
// 世界観: 春の養蜂場で、養蜂家が巣箱に出入りする蜂の群れに混じった色の違う蜂(よその巣から来た蜂)の数を数え、巣枠に記録していく
// 残るもの: 正誤(CLEAR/GAME OVER) + 正解した群れの数・スコア
// スタイル: 90s HANDHELD COLOR

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 低彩度・少色。小画面前提の太い形、密度を抑える
  var STYLE = { bg: ['#a7c08a', '#6f8f5c', '#e3dcae'], main: ['#d6b855', '#3b3a2c', '#f4ecd0'], accent: ['#6f8fb8', '#c0604e'] };
  var HONEY = STYLE.main[0], DARK = STYLE.main[1], CREAM = STYLE.main[2], BLUE = STYLE.accent[0], RUST = STYLE.accent[1];
  var LEAF = '#58774a';

  var TITLE = 'ODD BEE TALLY';
  var TIME_LIMIT = 15;
  var ROUNDS = 3;
  var ANSWER_WAIT = 2.6;
  var HIVE_X = W * 0.8, HIVE_Y = H * 0.44;
  var FRAME_POS = [[W * 0.3, H * 0.78], [W * 0.7, H * 0.78], [W * 0.3, H * 0.895], [W * 0.7, H * 0.895]];

  var ST = { ATTRACT: 'attract', PLAYING: 'play', RESULT: 'result' };
  var st = ST.ATTRACT;

  var BEE = [
    ['.ww....', 'wwwbyb.', '.ybybyk', '.ybyby.', '..k.k..'],
    ['.......', '.wwbyb.', 'wybybyk', '.ybyby.', '..k.k..'],
  ];
  var DRONE = [
    ['..www.....', '.wwwwbyby.', '.byybyybyk', '.byybyyby.', '..k..k....'],
    ['..........', 'wwwwwbyby.', '.byybyybyk', '.byybyyby.', '..k..k....'],
  ];
  var KEEPER = [
    ['..cccc..', '.cccccc.', '.c.dd.c.', '.cddddc.', '..cccc..', '.cccccc.', 'cccccccc', '.cc..cc.', '.dd..dd.'],
    ['..cccc..', '.cccccc.', '.c.dd.c.', '.cddddc.', '..cccc..', '.cccccc.', 'ccccccc.', '.cc..cc.', '.dd..dd.'],
  ];
  var HIVE = ['hhhhhhhhhh', 'hmmmmmmmmh', 'hhhhhhhhhh', 'hmmmmmmmmh', 'hhhhhhhhhh', 'hmmmmmmmmh', 'hhhhddhhhh', '.h......h.'];
  var FLOWER = ['.p.', 'pyp', '.p.', '.g.'];

  function beePal(odd) { return { w: CREAM, b: odd ? BLUE : HONEY, y: DARK, k: DARK }; }

  // ── 群れの生成(プレイ・デモ共通) ──
  function makeStream(r, fixed) {
    var n = fixed ? fixed.n : 7 + r * 4;
    var oddN = fixed ? fixed.odd : Math.floor(game.random(2 + r, 3.99 + r * 1.4));
    var dur = fixed ? fixed.dur : 1.3 + r * 0.3;
    var speed = fixed ? fixed.speed : 820 + r * 170;
    var slots = [];
    for (var i = 0; i < n; i++) slots.push(i);
    for (var a = slots.length - 1; a > 0; a--) { var b = Math.floor(game.random(0, a + 1)); var t = slots[a]; slots[a] = slots[b]; slots[b] = t; }
    var oddSet = {}, droneSet = {};
    for (var o = 0; o < oddN; o++) oddSet[slots[o]] = true;
    if (r >= 1) for (var d = oddN; d < oddN + r; d++) droneSet[slots[d]] = true;
    var bees = [];
    for (var k = 0; k < n; k++) {
      var dir = r >= 2 && k % 3 === 1 ? -1 : 1;
      bees.push({
        t0: (k / n) * dur + game.random(-0.05, 0.05), dir: dir,
        y0: H * (0.3 + ((k * 0.37) % 1) * 0.28), amp: 20 + (k % 3) * 18, ph: k * 1.7,
        speed: speed * (dir < 0 ? 1.1 : 1) * game.random(0.9, 1.1), odd: !!oddSet[k], drone: !!droneSet[k],
      });
    }
    var end = 0;
    for (var e = 0; e < bees.length; e++) end = Math.max(end, bees[e].t0 + (W + 170) / bees[e].speed);
    return { bees: bees, odd: oddN, end: end + 0.1 };
  }

  function beePos(b, t) {
    var k = t - b.t0;
    var x = b.dir > 0 ? -80 + k * b.speed : W + 80 - k * b.speed;
    var y = b.y0 + Math.sin(k * 7 + b.ph) * b.amp;
    return { x: x, y: y, on: k >= 0 && x > -90 && x < W + 90 };
  }

  function makeChoices(c) {
    var opts = [c];
    var cand = [c - 1, c + 1, c + 2, c - 2, c + 3];
    for (var i = 0; i < cand.length && opts.length < 4; i++) if (cand[i] >= 1 && opts.indexOf(cand[i]) < 0) opts.push(cand[i]);
    for (var a = opts.length - 1; a > 0; a--) { var b = Math.floor(game.random(0, a + 1)); var t = opts[a]; opts[a] = opts[b]; opts[b] = t; }
    return opts;
  }

  // ── 状態 ──
  var round, stream, sT, stage, choices, waitT, reveal, revealN, correct, timeLeft, ready, halt, over, won, endT, score, prevBest, picked, lastPick;

  function initGame() {
    round = 0; correct = 0; score = 0; timeLeft = TIME_LIMIT; ready = 0.8;
    halt = null; over = false; won = false; endT = 0; picked = -1; lastPick = -1;
    prevBest = game.best || 0;
    beginRound();
  }

  function beginRound() {
    stream = makeStream(round); sT = 0; stage = 'watch';
    choices = makeChoices(stream.odd); waitT = ANSWER_WAIT; reveal = 0; revealN = 0; picked = -1;
  }

  function label(s, x, y, sz, col) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: DARK, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  // ── 描画 ──
  function drawField() {
    game.draw.gradient(0, H, [[0, '#cfdcb0'], [0.3, STYLE.bg[0]], [0.7, STYLE.bg[1]], [1, '#4d6640']]);
    // 遠景の生け垣(太い丸)
    for (var i = 0; i < 7; i++) game.draw.circle(i * 170, H * 0.24, 110, LEAF, 0.8);
    game.draw.rect(0, H * 0.24, W, 40, LEAF, 0.8);
    // 花
    for (var f = 0; f < 8; f++) {
      var sway = Math.sin(game.time.elapsed * 2 + f) * 4;
      game.draw.sprite(FLOWER, { p: f % 2 ? CREAM : RUST, y: HONEY, g: LEAF }, 60 + f * 135 + sway, H * 0.66 + (f % 2) * 20, 12, { anchor: 'center' });
    }
    // 巣箱(台と影)
    game.draw.rect(HIVE_X - 130, HIVE_Y + 150, 260, 24, DARK, 0.4);
    game.draw.sprite(HIVE, { h: '#b08a52', m: '#8a6a3c', d: DARK }, HIVE_X, HIVE_Y + 40, 26, { anchor: 'center' });
    var pulse = 0.25 + 0.2 * Math.sin(game.time.elapsed * 5);
    game.draw.circle(HIVE_X - 18, HIVE_Y + 106, 26, HONEY, pulse);
  }

  function drawBees(sm, t) {
    for (var i = 0; i < sm.bees.length; i++) {
      var b = sm.bees[i];
      var p = beePos(b, t);
      if (!p.on) continue;
      var fr = Math.floor(game.time.elapsed * 14 + i) % 2;
      game.draw.sprite(b.drone ? DRONE[fr] : BEE[fr], beePal(b.odd), p.x, p.y, b.drone ? 11 : 10, { anchor: 'center', flipX: b.dir < 0 });
    }
  }

  function drawKeeper() {
    var fr = Math.floor(game.time.elapsed * 1.5) % 2;
    game.draw.sprite(KEEPER[fr], { c: CREAM, d: DARK }, W * 0.1, H * 0.61 + Math.sin(game.time.elapsed * 2) * 4, 14, { anchor: 'center' });
  }

  function drawFrames(opts, active, hi) {
    for (var i = 0; i < 4; i++) {
      var x = FRAME_POS[i][0], y = FRAME_POS[i][1];
      var on = active ? 1 : 0.45;
      game.draw.rect(x - 190, y - 88, 380, 176, DARK, on);
      game.draw.rect(x - 178, y - 76, 356, 152, i === hi ? CREAM : HONEY, on);
      // 六角の蜜蝋模様
      for (var c = 0; c < 5; c++) game.draw.circle(x - 140 + c * 70, y + 50, 14, DARK, 0.15 * on);
      if (opts) label(String(opts[i]), x, y - 6, 88, DARK);
    }
  }

  function drawReveal(sm, k) {
    // 色違いの蜂を一列に並べ直して、数を1匹ずつ数え上げる(納得感)
    var n = Math.min(sm.odd, Math.floor(k / 0.1));
    for (var i = 0; i < sm.odd; i++) {
      var x = W / 2 + (i - (sm.odd - 1) / 2) * 110;
      game.draw.sprite(BEE[0], beePal(true), x, H * 0.4, 12, { anchor: 'center', alpha: i < n ? 1 : 0.25 });
    }
    label(String(n), W / 2, H * 0.5, 96, CREAM);
  }

  function drawHud() {
    for (var i = 0; i < ROUNDS; i++) {
      var c = i < correct ? HONEY : i === round ? CREAM : '#8a9a78';
      game.draw.rect(60 + i * 110, 60, 90, 70, DARK);
      game.draw.rect(66 + i * 110, 66, 78, 58, c);
    }
    label(correct + ' / ' + ROUNDS, W * 0.5, 96, 48, CREAM);
    label(String(score), W * 0.86, 96, 46, HONEY);
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(60, 168, W - 120, 20, DARK);
    game.draw.rect(64, 172, (W - 128) * fr, 12, timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0 ? RUST : HONEY);
  }

  // ── 入力 ──
  function frameAt(x, y) {
    for (var i = 0; i < 4; i++) if (Math.abs(x - FRAME_POS[i][0]) < 190 && Math.abs(y - FRAME_POS[i][1]) < 88) return i;
    return -1;
  }

  game.onTap(function (x, y) {
    if (st === ST.ATTRACT) { game.audio.play('se_coin', 0.45); st = ST.PLAYING; initGame(); return; }
    if (st === ST.RESULT) { game.audio.play('se_tap', 0.2); st = ST.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || halt || ready > 0 || stage !== 'answer') {
      game.audio.play('se_tap', 0.06);
      game.fx.burst(x, y, { color: CREAM, count: 3, speed: 70 });
      return;
    }
    var i = frameAt(x, y);
    if (i < 0) { game.audio.play('se_tap', 0.06); game.fx.burst(x, y, { color: CREAM, count: 3, speed: 70 }); return; }
    game.audio.play('se_tap', 0.25);
    picked = i;
    judge(choices[i] === stream.odd, FRAME_POS[i][0], FRAME_POS[i][1]);
  });

  function judge(right, x, y) {
    stage = 'reveal'; reveal = 0;
    if (right) {
      correct++;
      score += 100 + Math.floor(waitT * 40);
      game.feedback.good(x, y - 60, { text: waitT > ANSWER_WAIT - 1 ? 'PERFECT' : 'GOOD', color: HONEY, count: 14 });
      if (correct === 2) { game.fx.popup(correct + ' / ' + ROUNDS, W / 2, H * 0.24, { color: CREAM, size: 56 }); game.audio.play('se_milestone', 0.35); }
    } else {
      halt = { t: 0.45, max: 0.45, x: x, y: y };
    }
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.5;
    if (ok) score += Math.floor(timeLeft * 30);
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
  }

  // ── ATTRACT: 手が色違いの蜂を指でなぞって数え、正しい巣枠を押す ──
  var demo = { t: 0, sm: null, gx: W / 2, gy: H * 0.5, press: false, counted: 0, tapped: false, opts: [3, 2, 4, 1] };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt || !demo.sm) {
      demo.sm = makeStream(0, { n: 6, odd: 2, dur: 1.0, speed: 560 });
      demo.counted = 0; demo.tapped = false;
    }
    var tx = W / 2, ty = H * 0.55;
    // 画面内の色違いの蜂を追う
    for (var i = 0; i < demo.sm.bees.length; i++) {
      var b = demo.sm.bees[i];
      if (!b.odd) continue;
      var p = beePos(b, cyc);
      if (p.on && p.x > 60 && p.x < W - 60) { tx = p.x; ty = p.y + 60; break; }
    }
    // 数え上げの合図(色違いの蜂が画面中央を越えたら +1)
    var passed = 0;
    for (var j = 0; j < demo.sm.bees.length; j++) if (demo.sm.bees[j].odd && beePos(demo.sm.bees[j], cyc).x > W / 2) passed++;
    if (passed > demo.counted) { demo.counted = passed; game.audio.tone('E5', 0.05, { wave: 'square', volume: 0.05 }); }
    demo.press = false;
    if (cyc > 3.0) { var f = FRAME_POS[1]; tx = f[0]; ty = f[1]; if (cyc > 3.25) { demo.press = cyc < 3.5; if (!demo.tapped) { demo.tapped = true; game.feedback.good(f[0], f[1] - 60, { text: 'GOOD', color: HONEY, count: 8, volume: 0.2 }); } } }
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 9);
    demo.gy += (ty - demo.gy) * Math.min(1, dt * 9);
    return cyc;
  }

  game.onUpdate(function (dt) {
    if (st === ST.ATTRACT) {
      var cyc = stepDemo(dt);
      drawField();
      drawKeeper();
      drawBees(demo.sm, cyc);
      drawFrames(cyc > 2.6 ? demo.opts : null, cyc > 2.6, demo.tapped ? 1 : -1);
      if (demo.counted > 0 && cyc < 3.0) label(String(demo.counted), W / 2, H * 0.26, 80, CREAM);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      label(TITLE, W / 2, H * 0.07, 64, CREAM);
      label('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.115, 36, HONEY);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.975, 40, HONEY);
      else label('INSERT COIN', W / 2, H * 0.975, 34, CREAM);
      return;
    }

    if (st === ST.RESULT) {
      drawField();
      drawKeeper();
      drawFrames(null, false, -1);
      game.draw.rect(80, H * 0.28, W - 160, H * 0.34, DARK, 0.75);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.34, 96, won ? HONEY : RUST);
      label(correct + ' / ' + ROUNDS, W / 2, H * 0.41, 56, CREAM);
      label('SCORE ' + score, W / 2, H * 0.47, 44, CREAM);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.53, 52, HONEY);
      else label('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.53, 38, '#c9c3a0');
      if (!won) label('あと' + (ROUNDS - correct) + '問!', W / 2, H * 0.58, 44, HONEY);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.975, 34, CREAM);
      return;
    }

    // ── PLAYING ──
    if (over) {
      endT -= dt;
      if (endT <= 0) {
        st = ST.RESULT;
        if (won) game.end.success(score, { correct: correct, rounds: ROUNDS });
        else game.end.failure({ correct: correct, rounds: ROUNDS });
      }
    } else if (halt) {
      halt.t -= dt;
      if (halt.t <= 0) {
        game.feedback.bad(halt.x, halt.y - 60, { text: 'MISS' });
        halt = null;
        stage = 'reveal'; reveal = 0; revealN = -1; // 正解数を見せてから終わる
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.25);
    } else {
      if (stage !== 'reveal') timeLeft -= dt;
      if (stage === 'watch') {
        var prev = sT;
        sT += dt;
        // 色違いの蜂が画面に入る瞬間に小さく羽音
        for (var i = 0; i < stream.bees.length; i++) if (stream.bees[i].t0 > prev && stream.bees[i].t0 <= sT) game.audio.tone(stream.bees[i].odd ? 'A4' : 'D4', 0.04, { wave: 'triangle', volume: 0.03 });
        if (sT >= stream.end) { stage = 'answer'; waitT = ANSWER_WAIT; game.audio.play('se_tap', 0.2); }
      } else if (stage === 'answer') {
        waitT -= dt;
        if (waitT <= 0) { picked = -1; judge(false, W / 2, H * 0.84); }
      } else if (stage === 'reveal') {
        reveal += dt;
        if (reveal > 0.35 + stream.odd * 0.1) {
          if (revealN === -1 || picked < 0 || choices[picked] !== stream.odd) finish(false);
          else if (correct >= ROUNDS) finish(true);
          else { round++; beginRound(); }
        }
      }
      if (timeLeft <= 0 && !over) {
        timeLeft = 0;
        game.feedback.bad(W / 2, H * 0.4, { text: 'TIME UP' });
        finish(false);
      }
    }

    drawField();
    drawKeeper();
    if (stage === 'watch' && ready <= 0) drawBees(stream, sT);
    if (stage === 'reveal' && !halt) drawReveal(stream, reveal);
    drawFrames(stage === 'watch' ? null : choices, stage === 'answer', picked);
    if (stage === 'answer') {
      var wf = Math.max(0, waitT / ANSWER_WAIT);
      game.draw.rect(W * 0.2, H * 0.71, W * 0.6 * wf, 12, CREAM);
    }
    if (halt) {
      var k = 1 - halt.t / halt.max;
      game.draw.rect(halt.x - 190 - k * 20, halt.y - 88 - k * 20, 380 + k * 40, 176 + k * 40, '#ffffff', 0.6 * (1 - k) + 0.2);
    }
    drawHud();
    if (ready > 0) label(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 100, CREAM);
  });

  game.onStart(function () {
    game.audio.melody([['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['B4', 0.5], ['C5', 0.5], ['A4', 0.5], ['G4', 1], ['E4', 0.5], ['G4', 0.5], ['A4', 0.5], ['B4', 0.5], ['G4', 1.5], ['R', 0.5]], { tempo: 120, wave: 'square', volume: 0.045, loop: true });
    st = ST.ATTRACT;
    initGame();
  });
})(game);

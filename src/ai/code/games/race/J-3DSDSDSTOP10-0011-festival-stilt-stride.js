// J-3DSDSDSTOP10-0011-festival-stilt-stride.js
// 高足ストライド — 左右の竹馬を交互に踏み出して祭りの大通りを歩き切る。同じ足を続けるとグラつき、横風の間は速く踏んで立て直す
// 操作: 画面下の左半分=左の竹馬、右半分=右の竹馬。交互に踏めば前進し、続けて交互に踏むほど歩幅が伸びる
// 終わり: ゴール門まで歩き切ればCLEAR。時間切れでGAME OVER(転ぶと起き上がりに時間を失う)
// @mechanic: alternate_tap
// @theme: festival_stilt_parade
// 世界観: 夏祭りの大通りで、竹馬に乗った見習い大道芸人が左右の足を交互に踏み出し、横風に揺れる提灯の下を抜けて通りの奥の鳥居型のゴール門まで歩き切る
// 残るもの: 正誤(CLEAR/GAME OVER) + 歩いた距離・最大連続歩数・転倒数
// スタイル: 8bit PC MONITOR

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: 8色ベタ、高解像度の細線、テキスト枠のUI
  var STYLE = {
    bg: ['#000022', '#0000aa', '#000000'],
    main: ['#ffffff', '#00ffff', '#ff55ff'],
    accent: ['#ffff55', '#ff5555'],
  };
  var BLK = '#000000', BLU = '#0000aa', CYA = '#00ffff', MAG = '#ff55ff';
  var YEL = '#ffff55', RED = '#ff5555', WHT = '#ffffff', GRN = '#55ff55';

  var GAME_TITLE = 'STILT STRIDE';
  var TIME_LIMIT = 12;
  var NEEDED = 40;
  var GROUND_Y = Math.round(H * 0.66);
  var WALKER_X = Math.round(W * 0.38);
  var PAD_Y = Math.round(H * 0.78);
  var PAD_H = 300;

  var BODY_A = ['..yy..', '.yyyy.', '..ww..', '.mmmm.', 'm.mm.m', '..mm..', '.m..m.'];
  var BODY_B = ['..yy..', '.yyyy.', '..ww..', '.mmmm.', '.mmmm.', '..mm..', '.m..m.'];
  var BODY_FALL = ['......', '.yyyy.', 'y.ww.y', '.mmmm.', 'mm..mm', '......', '......'];
  var BODY_PAL = { y: YEL, w: WHT, m: MAG };
  var FOOT = ['.##.', '####', '####', '.##.', '.##.', '###.'];
  var LANTERN = ['.#.', 'rrr', 'ryr', 'rrr', '.#.'];
  var LANTERN_PAL = { '#': WHT, r: RED, y: YEL };
  var RIVAL = ['.cc.', 'cccc', '.cc.', 'c..c', 'c..c', 'c..c', 'c..c'];
  var FLAG = ['####..', '######', '####..', '#.....', '#.....'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var st = null;

  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x, y, { size: sz, color: col, bold: false, align: align || 'center', font: 'monospace' });
  }
  function frame(x, y, w, h, col) {
    game.draw.line(x, y, x + w, y, col, 3); game.draw.line(x, y + h, x + w, y + h, col, 3);
    game.draw.line(x, y, x, y + h, col, 3); game.draw.line(x + w, y, x + w, y + h, col, 3);
  }

  function initGame() {
    st = {
      dist: 0, shown: 0, last: 0, streak: 0, best: 0, tilt: 0, tiltV: 0,
      legL: 0, legR: 0, fallen: 0, falls: 0, idle: 0,
      gust: 0, gustTele: 0, gustDir: 1, gustCd: 3.2,
      timeLeft: TIME_LIMIT, ready: 0.8, hitStop: 0, finished: false, done: false, ok: false,
      endWait: 0, halfDone: false, padFlash: [0, 0],
    };
  }

  function mult() { return st.streak >= 16 ? 2 : st.streak >= 8 ? 1.5 : 1; }

  function stepFoot(side) {
    // side: -1 = 左, 1 = 右
    if (st.finished || st.fallen > 0) return;
    st.idle = 0;
    st.padFlash[side < 0 ? 0 : 1] = 0.15;
    if (side < 0) st.legL = 1; else st.legR = 1;
    if (st.last === side) {
      // 同じ足を続けた: 大きくグラつく
      st.streak = 0;
      st.tiltV += side * 1.4;
      st.tilt += side * 0.42;
      game.feedback.bad(WALKER_X, GROUND_Y - 520, { text: 'MISS', shake: 5 });
      if (Math.abs(st.tilt) >= 1) topple();
      return;
    }
    st.last = side;
    st.streak++;
    if (st.streak > st.best) st.best = st.streak;
    st.tilt = st.tilt * 0.62 + side * 0.08;
    st.dist += mult();
    game.audio.tone(side < 0 ? 'C5' : 'G5', 0.05, { wave: 'square', volume: 0.05 });
    if (st.streak === 8 || st.streak === 16) {
      game.feedback.good(WALKER_X, GROUND_Y - 560, { text: 'x' + mult(), color: YEL });
    } else if (st.streak % 4 === 0) {
      game.fx.burst(WALKER_X + side * 40, GROUND_Y, { color: CYA, count: 6, speed: 160 });
    }
    if (!st.halfDone && st.dist >= NEEDED / 2) {
      st.halfDone = true;
      game.audio.play('se_milestone', 0.5);
      game.fx.popup(Math.floor(NEEDED / 2) + ' / ' + NEEDED, WALKER_X + 200, GROUND_Y - 600, { color: GRN, size: 50 });
    }
    if (st.dist >= NEEDED) {
      st.dist = NEEDED; st.finished = true; st.ok = true; st.hitStop = 0.35;
      game.feedback.good(WALKER_X + 300, GROUND_Y - 400, { text: 'CLEAR', color: GRN, count: 28 });
      finish();
    }
  }

  function topple() {
    st.falls++;
    st.streak = 0; st.last = 0;
    st.hitStop = 0.4;
    st.fallen = 1.2;
    game.fx.flash(WHT, 0.15);
    game.feedback.bad(WALKER_X, GROUND_Y - 300, { text: 'MISS', shake: 14 });
  }

  function finish() {
    if (st.done) return;
    st.done = true; st.endWait = 1.4;
    if (state !== S.PLAYING) return;
    game.audio.stopBgm();
    game.audio.play(st.ok ? 'se_success' : 'se_failure', 0.55);
  }

  function simulate(dt) {
    if (st.hitStop > 0) { st.hitStop -= dt; return; }
    st.padFlash[0] = Math.max(0, st.padFlash[0] - dt);
    st.padFlash[1] = Math.max(0, st.padFlash[1] - dt);
    st.legL = Math.max(0, st.legL - dt * 5);
    st.legR = Math.max(0, st.legR - dt * 5);
    st.shown += (st.dist - st.shown) * Math.min(1, dt * 8);
    if (st.fallen > 0) {
      st.fallen -= dt;
      st.tilt *= 0.9;
      if (st.fallen <= 0) { st.tilt = 0; st.tiltV = 0; game.audio.play('se_jump', 0.3); }
      return;
    }
    // 横風: 予告(旗がはためく)→ 押し流し
    if (st.gustTele > 0) {
      st.gustTele -= dt;
      if (st.gustTele <= 0) st.gust = 1.3;
    } else if (st.gust > 0) {
      st.gust -= dt;
      st.tilt += st.gustDir * 0.75 * dt;
    } else if (!st.finished) {
      st.gustCd -= dt;
      if (st.gustCd <= 0) {
        st.gustCd = 2.6 + Math.random() * 1.2;
        st.gustDir = Math.random() < 0.5 ? -1 : 1;
        st.gustTele = 0.7;
        game.audio.tone('D6', 0.1, { wave: 'triangle', volume: 0.06, slide: -400 });
      }
    }
    // 立ち止まると少しずつ傾く(棒立ちでは耐えられない)
    st.idle += dt;
    if (st.idle > 0.8) st.tilt += (st.tilt >= 0 ? 1 : -1) * 0.35 * dt;
    st.tiltV *= Math.pow(0.5, dt);
    if (!st.finished && Math.abs(st.tilt) >= 1) topple();
  }

  // ── 描画 ─────────────────────────────────────────
  function drawStreet() {
    var t = game.time.elapsed;
    game.draw.gradient(0, GROUND_Y, [[0, '#000022'], [0.7, BLU], [1, '#2a2acc']]);
    game.draw.rect(0, 0, W, GROUND_Y, CYA, 0.03 + 0.03 * Math.sin(t * 1.2));
    var off = (st.shown * 90) % 360;
    // 屋台の並び
    for (var i = -1; i < 5; i++) {
      var sx = i * 360 - off;
      frame(sx + 20, GROUND_Y - 330, 300, 330, CYA);
      game.draw.rect(sx + 20, GROUND_Y - 360, 300, 30, (i % 2 === 0) ? RED : MAG);
      game.draw.line(sx + 40, GROUND_Y - 200, sx + 300, GROUND_Y - 200, CYA, 2);
    }
    // 提灯の列(揺れる)
    game.draw.line(0, GROUND_Y - 620, W, GROUND_Y - 600, WHT, 2);
    for (var k = -1; k < 8; k++) {
      var lx = k * 170 - (st.shown * 60) % 170;
      game.draw.sprite(LANTERN, LANTERN_PAL, lx + Math.sin(t * 2 + k) * 8, GROUND_Y - 580, 12, { anchor: 'center' });
    }
    // 遠くを歩く他の芸人(演出のみ)
    for (var r = 0; r < 2; r++) {
      var rx = ((r * 520 + t * 70) % (W + 200)) - 100;
      game.draw.sprite(RIVAL, { c: '#5555ff' }, rx, GROUND_Y - 470 + Math.sin(t * 4 + r) * 8, 12, { anchor: 'center', alpha: 0.5 });
    }
    // 地面(石畳の細線)
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, BLK);
    for (var g = 0; g < 12; g++) {
      var gx = g * 100 - (st.shown * 90) % 100;
      game.draw.line(gx, GROUND_Y + 4, gx - 60, GROUND_Y + 170, BLU, 2);
    }
    game.draw.line(0, GROUND_Y, W, GROUND_Y, WHT, 3);
    // ゴール門
    var gateX = WALKER_X + (NEEDED - st.shown) * 90;
    if (gateX < W + 200) {
      game.draw.rect(gateX - 10, GROUND_Y - 520, 20, 520, RED);
      game.draw.rect(gateX + 230, GROUND_Y - 520, 20, 520, RED);
      game.draw.rect(gateX - 50, GROUND_Y - 540, 340, 26, RED);
      game.draw.rect(gateX - 20, GROUND_Y - 480, 280, 14, RED);
    }
  }

  function drawWalker() {
    var t = game.time.elapsed;
    var ang = st.tilt * 0.55 + (st.fallen > 0 ? (st.tilt >= 0 ? 1.1 : -1.1) : 0);
    var hipY = GROUND_Y - 380 + Math.sin(t * 3) * 6;
    var sway = Math.sin(t * 2.2) * 5;
    var hx = WALKER_X + Math.sin(ang) * 380 + sway;
    var hy = GROUND_Y - Math.cos(ang) * 380 + Math.sin(t * 3) * 4;
    // 竹馬2本(踏み出した足が浮く)
    var lf = WALKER_X - 50 - st.legL * 30, rf = WALKER_X + 50 + st.legR * 30;
    game.draw.line(lf, GROUND_Y - st.legL * 40, hx - 30, hy + 30, YEL, 10);
    game.draw.line(rf, GROUND_Y - st.legR * 40, hx + 30, hy + 30, YEL, 10);
    game.draw.line(hx - 50, hy - 20, hx - 30, hy + 30, WHT, 4);
    game.draw.line(hx + 50, hy - 20, hx + 30, hy + 30, WHT, 4);
    var art = st.fallen > 0 ? BODY_FALL : (Math.floor(t * 4) % 2 === 0 ? BODY_A : BODY_B);
    var sc = st.hitStop > 0 ? 22 : 17;
    game.draw.sprite(art, BODY_PAL, hx, hy - 90, sc, { anchor: 'center' });
    // 傾きの危険予告
    if (Math.abs(st.tilt) > 0.6 && Math.floor(t * 10) % 2 === 0) {
      game.draw.circle(hx, hy - 90, 90, RED, 0.3);
      if (Math.floor(t * 10) % 4 === 0) game.audio.tone('A3', 0.04, { wave: 'square', volume: 0.03 });
    }
    // 横風の予告と風の線
    if (st.gustTele > 0 || st.gust > 0) {
      var fx = st.gustDir > 0 ? 120 : W - 120;
      var flap = Math.floor(t * 14) % 2 === 0;
      game.draw.sprite(FLAG, { '#': st.gustTele > 0 ? YEL : WHT }, fx, GROUND_Y - 700, flap ? 14 : 12, { anchor: 'center', flipX: st.gustDir < 0 });
      if (st.gust > 0) {
        for (var w = 0; w < 6; w++) {
          var wy = GROUND_Y - 760 + w * 90;
          var wx = ((t * 900 * st.gustDir + w * 200) % W + W) % W;
          game.draw.line(wx, wy, wx + 120 * st.gustDir, wy, WHT, 2);
        }
      }
    }
  }

  function drawPads() {
    var want = st.last === 0 ? 0 : -st.last;
    for (var i = 0; i < 2; i++) {
      var side = i === 0 ? -1 : 1;
      var px = i === 0 ? 40 : W / 2 + 20;
      var pw = W / 2 - 60;
      var lit = st.padFlash[i] > 0;
      var cue = (want === side || want === 0) && Math.floor(game.time.elapsed * 6) % 2 === 0 && state !== S.RESULT;
      game.draw.rect(px, PAD_Y, pw, PAD_H, lit ? CYA : BLU, lit ? 0.9 : 0.6);
      frame(px, PAD_Y, pw, PAD_H, cue ? YEL : CYA);
      game.draw.sprite(FOOT, { '#': lit ? BLK : WHT }, px + pw / 2, PAD_Y + PAD_H / 2, 22, { anchor: 'center', flipX: side < 0 });
    }
  }

  function drawHud() {
    game.draw.rect(20, 20, W - 40, 200, BLK);
    frame(20, 20, W - 40, 200, CYA);
    label(Math.floor(st.dist) + ' / ' + NEEDED, 60, 80, 54, WHT, 'left');
    label('x' + mult(), W - 70, 80, 54, st.streak >= 8 ? YEL : CYA, 'right');
    var frac = Math.max(0, st.timeLeft / TIME_LIMIT);
    var low = st.timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    frame(60, 150, W - 120, 36, CYA);
    game.draw.rect(64, 154, (W - 128) * frac, 28, low ? RED : GRN);
    var prog = Math.min(1, st.dist / NEEDED);
    game.draw.rect(60, 236, (W - 120) * prog, 8, YEL);
  }

  function drawResult() {
    game.draw.rect(90, 560, W - 180, 540, BLK, 0.92);
    frame(90, 560, W - 180, 540, st.ok ? GRN : RED);
    label(st.ok ? 'CLEAR' : 'GAME OVER', W / 2, 660, 90, st.ok ? GRN : RED);
    label(Math.floor(st.dist) + ' / ' + NEEDED, W / 2, 790, 56, WHT);
    label('x' + st.best, W / 2, 880, 46, YEL);
    var score = scoreOf();
    if (st.ok && score > game.best) label('NEW RECORD', W / 2, 970, 48, YEL);
    else if (!st.ok) label('あと' + Math.ceil(NEEDED - st.dist) + '歩!', W / 2, 970, 48, CYA);
    label('BEST ' + Math.max(game.best, st.ok ? score : 0), W / 2, 1050, 36, CYA);
  }

  function scoreOf() { return Math.round(st.dist * 100 + st.best * 20 + (st.ok ? st.timeLeft * 150 : 0)); }

  function drawAll() {
    drawStreet();
    drawWalker();
    drawPads();
  }

  // ── ATTRACT ゴースト: 同じ stepFoot/simulate を AI が叩く(交互で進む → 同じ足を続けて転ぶ)──
  var demo = { t: 0, gx: W * 0.25, gy: PAD_Y + 150, press: false, next: 0.2, side: -1, dupes: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.2;
    if (cyc < dt || demo.t <= dt) { initGame(); st.ready = 0; st.gustCd = 1.6; demo.next = 0.3; demo.side = -1; demo.dupes = 0; }
    demo.next -= dt;
    if (demo.next <= 0 && st.fallen <= 0 && !st.finished) {
      var side = demo.side;
      if (cyc > 3.4 && demo.dupes < 3 && st.last !== 0) { side = st.last; demo.dupes++; }
      stepFoot(side);
      demo.gx = side < 0 ? W * 0.25 : W * 0.75;
      demo.side = -side;
      demo.next = st.gust > 0 ? 0.13 : 0.2;
      demo.press = true;
    } else if (demo.next < 0.1) {
      demo.press = false;
    }
    simulate(dt);
    if (st.done) { st.done = false; st.finished = false; }
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING; initGame(); tune();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (st.ready > 0 || st.done) { game.audio.play('se_tap', 0.1); return; }
    game.audio.play('se_tap', 0.12);
    stepFoot(x < W / 2 ? -1 : 1);
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (!st) initGame();
      stepDemo(dt);
      drawAll();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(20, 20, W - 40, 200, BLK);
      frame(20, 20, W - 40, 200, CYA);
      label(GAME_TITLE, W / 2, H * 0.04, 76, YEL);
      label('HI-SCORE ' + game.best, W / 2, 170, 36, CYA);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.72, 46, YEL);
      else label('INSERT COIN', W / 2, H * 0.72, 42, WHT);
      return;
    }
    if (state === S.RESULT) {
      drawAll(); drawHud(); drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.95, 40, WHT);
      return;
    }

    if (st.done) {
      st.endWait -= dt;
      simulate(dt * 0.4);
      if (st.endWait <= 0) {
        state = S.RESULT;
        var stats = { steps: Math.floor(st.dist), bestStreak: st.best, falls: st.falls };
        if (st.ok) game.end.success(scoreOf(), stats);
        else game.end.failure(stats);
      }
    } else if (st.ready > 0) {
      st.ready -= dt;
      if (st.ready <= 0) game.audio.play('se_tap', 0.4);
    } else {
      if (st.hitStop <= 0) st.timeLeft -= dt;
      if (st.timeLeft <= 0 && !st.finished) {
        st.timeLeft = 0; st.finished = true; st.ok = false; st.hitStop = 0.4;
        game.feedback.bad(WALKER_X, GROUND_Y - 500, { text: 'TIME UP' });
        finish();
      } else {
        simulate(dt);
      }
    }

    drawAll();
    drawHud();
    if (st.ready > 0) label(st.ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 100, YEL);
    if (st.done) drawResult();
  });

  function tune() {
    game.audio.melody(
      [['G4', 0.5], ['C5', 0.5], ['E5', 0.5], ['C5', 0.5], ['F5', 0.5], ['E5', 0.5], ['D5', 1], ['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['B4', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 1]],
      { tempo: 176, wave: 'square', volume: 0.05, loop: true, bass: [['C3', 2], ['F3', 2], ['G3', 2], ['C3', 2]] }
    );
  }

  game.onStart(function () {
    tune();
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);

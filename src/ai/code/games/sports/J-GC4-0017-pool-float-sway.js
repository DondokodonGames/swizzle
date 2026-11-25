// J-GC4-0017-pool-float-sway.js
// ゆらゆら浮き島 — 左右交互に体を揺すって揺れに合わせて波を育て、向かいの浮き板の人形を3体とも落とす
// 操作: 画面下の左右パッドを交互にタップ。浮き島が傾いている側を叩くと波が大きく育つ(逆側・同じ側の連打は波が崩れる)
// 終わり: 制限時間内に3体とも落とせばCLEAR。時間切れでGAME OVER
// @mechanic: alternate_tap
// @theme: pool_float_wave_sway
// 世界観: 夏の貸切プールで、丸い浮き島に乗ったラッコの子が体を左右に揺すって大波を育て、向かいの浮き板で踏ん張るゴム人形たちを水面へ落とす
// 残るもの: 正誤(CLEAR/GAME OVER) + 落とした人形の数・PERFECT数のスコア
// スタイル: HYPERCASUAL 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 明るい単色背景、柔らかい影の丸い塊
  var STYLE = { bg: ['#e9f7fb', '#bfe9f5', '#7fd3ec'], main: ['#ffffff', '#ffb347'], accent: ['#ff5e7e', '#3ec28f'] };
  var C = {
    bg0: '#e9f7fb', bg1: '#bfe9f5', water: '#7fd3ec', waterDeep: '#4fb6d9', foam: '#ffffff',
    raft: '#ffb347', raftSide: '#e08a2a', board: '#ff8fab', boardSide: '#d9607f', shadow: '#2a6f8a',
    ink: '#24506a', good: '#3ec28f', bad: '#ff5e7e', gold: '#ffc93c', pad: '#ffffff'
  };

  var GAME_TITLE = 'FLOAT SWAY';
  var TIME_LIMIT = 12;
  var NEEDED = 3;
  var RAFT_Y = Math.round(H * 0.62);
  var BOARD_Y = Math.round(H * 0.36);
  var PAD_Y = Math.round(H * 0.86);
  var HUD_Y = Math.round(H * 0.06);
  var DECAY = 0.12;
  var THRESH = [0.34, 0.58, 0.82];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var OTTER = [
    ['..bb..bb..', '.bbbbbbbb.', 'bbwwbbwwbb', 'bbwkbbkwbb', 'bbbbnnbbbb', '.bbwwwwbb.', 'bbbbbbbbbb', 'bb.bbbb.bb'],
    ['..bb..bb..', '.bbbbbbbb.', 'bbwwbbwwbb', 'bbkwbbwkbb', 'bbbbnnbbbb', '.bbwwwwbb.', 'bbbbbbbbbb', '.bbbbbbbb.']
  ];
  var OTTER_PAL = { b: '#8a5a3c', w: '#f3dcc0', k: '#24506a', n: '#24506a' };
  var DUMMY = ['.yyy.', 'ykyky', 'yyyyy', '.rrr.', 'rrrrr', '.r.r.'];
  var DUMMY_PALS = [
    { y: '#ffe08a', k: '#24506a', r: '#3ec28f' },
    { y: '#ffe08a', k: '#24506a', r: '#8f7fff' },
    { y: '#ffe08a', k: '#24506a', r: '#ff5e7e' }
  ];

  var amp, theta, omega, lastSide, dummies, fallen, perfects, taps, timeLeft, rings;
  var ready, hitStop, finished, done, endWait, ok, padFlash, milestone;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 4, { size: sz, color: 'rgba(36,80,106,0.25)', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function initGame() {
    amp = 0.08; theta = 0; omega = Math.PI * 2 * 1.0; lastSide = 0;
    dummies = [];
    for (var i = 0; i < 3; i++) dummies.push({ off: (i - 1) * 190, th: THRESH[i], fall: 0, down: false, wob: 0 });
    fallen = 0; perfects = 0; taps = 0; timeLeft = TIME_LIMIT; rings = [];
    ready = 0.8; hitStop = 0; finished = false; done = false; endWait = 0; ok = false;
    padFlash = [0, 0]; milestone = false;
  }

  function tilt() { return Math.sin(theta); }

  // 実ロジック: 左右どちらかを揺する
  function sway(side, isDemo) {
    taps++;
    padFlash[side < 0 ? 0 : 1] = 0.18;
    var tl = tilt();
    var px = side < 0 ? W * 0.25 : W * 0.75;
    if (side === lastSide) {
      amp = Math.max(0.05, amp - 0.1);
      game.feedback.bad(px, PAD_Y - 160, { text: 'MISS', color: C.bad, shake: 4 });
    } else if (Math.sign(tl) === side) {
      var strong = Math.abs(tl) > 0.7;
      amp = Math.min(1, amp + (strong ? 0.16 : 0.09));
      if (strong) perfects++;
      rings.push({ r: 60, t: 0.8, side: side });
      game.audio.play('se_tap', 0.35);
      game.audio.tone(strong ? 'C6' : 'G5', 0.06, { wave: 'sine', volume: 0.06 });
      if (strong) game.feedback.good(px, PAD_Y - 160, { text: 'PERFECT', color: C.good, count: 8 });
      else game.fx.popup('GOOD', px, PAD_Y - 160, { color: C.good, size: 40 });
    } else {
      amp = Math.max(0.05, amp - 0.12);
      game.feedback.bad(px, PAD_Y - 160, { text: 'MISS', color: C.bad, shake: 3 });
    }
    lastSide = side;
  }

  function stepWorld(dt, isDemo) {
    theta += omega * dt;
    amp = Math.max(0.05, amp - DECAY * dt);
    var boardTilt = amp * Math.sin(theta - 0.6);
    for (var i = 0; i < dummies.length; i++) {
      var d = dummies[i];
      if (d.down) { d.fall = Math.min(1, d.fall + dt * 2); continue; }
      var push = Math.abs(boardTilt);
      d.wob = push / d.th; // 1に近いほどぐらつく(予告)
      if (push > d.th) {
        d.down = true; fallen++;
        var dx = W / 2 + d.off;
        game.audio.play('se_break', 0.4);
        game.fx.burst(dx, BOARD_Y + 60, { color: C.foam, count: 16, speed: 320 });
        if (!isDemo) {
          game.feedback.good(dx, BOARD_Y - 120, { text: 'NICE', color: C.gold, count: 14 });
          if (!milestone && fallen === 2) {
            milestone = true;
            game.audio.play('se_milestone', 0.45);
            game.fx.popup(fallen + ' / ' + NEEDED, W / 2, H * 0.24, { color: C.ink, size: 64 });
          }
        }
        omega = Math.PI * 2 * (1.0 + fallen * 0.18); // 変拍子: 1体落ちるごとに揺れが速くなる
        if (!isDemo && fallen >= NEEDED && !finished) winGame();
      }
    }
    for (var r = rings.length - 1; r >= 0; r--) {
      rings[r].t -= dt; rings[r].r += 520 * dt;
      if (rings[r].t <= 0) rings.splice(r, 1);
    }
    padFlash[0] = Math.max(0, padFlash[0] - dt);
    padFlash[1] = Math.max(0, padFlash[1] - dt);
  }

  function winGame() {
    finished = true; ok = true; hitStop = 0.4;
    game.feedback.good(W / 2, BOARD_Y, { text: 'CLEAR', color: C.good, count: 30, flashColor: '#ffffff' });
    game.audio.play('se_success', 0.55);
    finish();
  }

  function loseGame() {
    finished = true; ok = false; hitStop = 0.5;
    game.feedback.bad(W / 2, BOARD_Y, { text: 'TIME UP', color: C.bad, shake: 10 });
    game.audio.play('se_failure', 0.5);
    finish();
  }

  function finish() {
    if (done) return;
    done = true; endWait = 1.2;
    game.audio.stopBgm();
  }

  function scoreNow() { return fallen * 300 + perfects * 40 + (ok ? Math.round(timeLeft * 30) : 0); }

  // 横1pxストリップ風の傾いた板(回転なしで段をずらして描く)
  function drawTiltedSlab(cx, cy, w, h, tl, top, side) {
    var steps = 12;
    for (var i = 0; i < steps; i++) {
      var sx = cx - w / 2 + (w / steps) * i;
      var sy = cy + tl * ((i - steps / 2) / (steps / 2)) * 60;
      game.draw.rect(sx, sy + h, w / steps + 1, 26, side);
      game.draw.rect(sx, sy, w / steps + 1, h, top);
    }
  }

  function drawScene() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg0], [0.2, C.bg1], [1, C.water]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.04 + 0.04 * Math.sin(t * 1.5));
    // プールの水面のうねり
    for (var y = Math.round(H * 0.24); y < PAD_Y - 120; y += 44) {
      var off = Math.sin(t * 2 + y * 0.02 + theta * 0.5) * 30 * (0.4 + amp);
      game.draw.rect(off - 40, y, W + 80, 10, C.foam, 0.25);
    }
    // 波紋
    for (var r = 0; r < rings.length; r++) {
      var rg = rings[r];
      game.draw.circle(W / 2, RAFT_Y - rg.r * 0.5, rg.r, C.foam, rg.t * 0.3);
    }
    // 向かいの浮き板と人形
    var bt = amp * Math.sin(theta - 0.6);
    game.draw.circle(W / 2, BOARD_Y + 80, 300, C.shadow, 0.12);
    drawTiltedSlab(W / 2, BOARD_Y + 30, 620, 40, bt, C.board, C.boardSide);
    for (var i = 0; i < dummies.length; i++) {
      var d = dummies[i];
      var dx = W / 2 + d.off + (d.down ? bt * 200 * d.fall : 0);
      var dy = BOARD_Y - 30 + bt * (d.off / 310) * 60 + (d.down ? d.fall * 180 : 0);
      var wob = d.down ? 0 : Math.sin(t * 30) * Math.max(0, d.wob - 0.7) * 40;
      if (!d.down && d.wob > 0.8) game.draw.circle(dx, dy - 90, 14, C.bad, 0.6 + 0.4 * Math.sin(t * 20));
      game.draw.sprite(DUMMY, DUMMY_PALS[i], dx + wob, dy, 18, { anchor: 'center', alpha: d.down ? Math.max(0, 1 - d.fall * 0.7) : 1 });
      if (d.down) game.draw.circle(dx, BOARD_Y + 150, 60 * d.fall, C.foam, 0.5 * (1 - d.fall * 0.5));
    }
    // 自分の浮き島とラッコ
    var tl = tilt() * (0.25 + amp);
    game.draw.circle(W / 2, RAFT_Y + 90, 280, C.shadow, 0.12);
    drawTiltedSlab(W / 2, RAFT_Y + 40, 460, 44, tl, C.raft, C.raftSide);
    game.draw.sprite(OTTER[Math.floor(t * 4) % 2], OTTER_PAL, W / 2 + tl * 70, RAFT_Y - 40 + Math.sin(t * 3) * 6, 18, { anchor: 'center', flipX: tl < 0 });
    // 左右パッド(傾いている側が光る)
    for (var s = 0; s < 2; s++) {
      var side = s === 0 ? -1 : 1;
      var px = s === 0 ? W * 0.25 : W * 0.75;
      var glow = Math.max(0, tilt() * side);
      game.draw.circle(px, PAD_Y + 18, 150, C.shadow, 0.18);
      game.draw.circle(px, PAD_Y, 140 + padFlash[s] * 60, C.pad);
      game.draw.circle(px, PAD_Y, 110, glow > 0.7 ? C.gold : C.bg1, 0.35 + glow * 0.65);
      game.draw.line(px - side * 40, PAD_Y, px + side * 50, PAD_Y, C.ink, 18);
      game.draw.line(px + side * 50, PAD_Y, px + side * 10, PAD_Y - 40, C.ink, 18);
      game.draw.line(px + side * 50, PAD_Y, px + side * 10, PAD_Y + 40, C.ink, 18);
    }
  }

  function drawHud() {
    txt(fallen + ' / ' + NEEDED, 60, HUD_Y + 20, 60, C.ink, 'left');
    txt('SCORE ' + scoreNow(), W - 60, HUD_Y + 20, 40, C.ink, 'right');
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 170, W - 120, 22, '#ffffff');
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 22, low ? C.bad : C.good);
    // 波の大きさメーター(人形の落ちる目盛り付き)
    game.draw.rect(60, 206, W - 120, 14, '#ffffff', 0.7);
    game.draw.rect(60, 206, (W - 120) * amp, 14, C.water);
    for (var i = 0; i < THRESH.length; i++) game.draw.rect(60 + (W - 120) * THRESH[i] - 3, 200, 6, 26, dummies[i].down ? C.good : C.bad);
  }

  // ---- ATTRACT デモ: 揺れの端で傾いた側を叩く(時々同じ側を2度叩いて崩す) ----
  var demo = { t: 0, gx: W * 0.25, gy: PAD_Y, press: 0, n: 0, prevTilt: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) {
      demo.n++;
      if (demo.t <= dt || fallen >= 2) initGame();
    }
    stepWorld(dt, true);
    var tl = tilt();
    var side = tl > 0 ? 1 : -1;
    var tx = side < 0 ? W * 0.25 : W * 0.75;
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 12);
    demo.gy = PAD_Y;
    if (Math.abs(tl) > 0.85 && Math.abs(demo.prevTilt) <= 0.85) {
      var clumsy = demo.n % 2 === 0 && cyc > 2.2 && cyc < 2.9;
      sway(clumsy ? lastSide : side, true);
      demo.press = 0.18;
    }
    demo.prevTilt = tl;
    if (demo.press > 0) demo.press -= dt;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (finished || ready > 0) { game.audio.play('se_tap', 0.15); return; }
    sway(x < W / 2 ? -1 : 1, false);
  });

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (amp === undefined) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.1, 96, C.ink);
      txt('BEST ' + (game.best || 0), W / 2, H * 0.145, 40, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.97, 44, C.bad);
      else txt('INSERT COIN', W / 2, H * 0.97, 34, C.ink);
      return;
    }

    if (state === S.RESULT) {
      stepWorld(dt, true);
      drawScene();
      game.draw.rect(0, H * 0.12, W, H * 0.16, '#ffffff', 0.75);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.165, 100, ok ? C.good : C.bad);
      txt('SCORE ' + scoreNow() + '   PERFECT ' + perfects, W / 2, H * 0.22, 44, C.ink);
      if (!ok && fallen < NEEDED) txt('あと' + (NEEDED - fallen) + '体!', W / 2, H * 0.26, 46, C.bad);
      else if (scoreNow() > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.26, 50, C.gold);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.26, 40, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.97, 40, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (hitStop > 0) hitStop -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { fallen: fallen, perfects: perfects, taps: taps };
        if (ok) game.end.success(scoreNow(), stats);
        else game.end.failure(stats);
      }
    } else if (ready > 0) {
      ready -= dt;
      theta += omega * dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else if (!finished) {
      timeLeft -= dt;
      stepWorld(dt, false);
      if (timeLeft <= 0 && !finished) { timeLeft = 0; loseGame(); }
    }

    drawScene();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 110, C.bad);
  });

  game.onStart(function() {
    game.audio.melody([
      ['G4', 0.5], ['C5', 0.5], ['E5', 1], ['D5', 0.5], ['C5', 0.5], ['A4', 1],
      ['G4', 0.5], ['A4', 0.5], ['C5', 0.5], ['E5', 0.5], ['D5', 2]
    ], { tempo: 120, wave: 'sine', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

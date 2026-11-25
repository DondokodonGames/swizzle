// J-N6424-0046-clay-mask-stretch.js
// クレイマスク・ストレッチ — やわらかい粘土の顔を2本指で挟んで伸ばし縮めし、壁に掛かったお手本の仮面と同じ形で止める
// 操作: 2本の指で顔を挟み、縦長の回は上下に、横長の回は左右に指を開いたり閉じたりして形を合わせ、点線の輪郭に重ねたまま少し保つ
// 終わり: 5面中4面を合わせれば成功。2面外す(1面3秒以内に合わせられない)、または15秒の時間切れで失敗
// @mechanic: pinch_zone
// @theme: pottery_mask_festival
// 世界観: 窯の村の仮面祭りの朝、見習い陶工が焼く前のやわらかい粘土の顔を指でつまんで伸ばし、壁に並ぶお手本の仮面と同じ面相に整えていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 合わせた面の数とPERFECT数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い輪郭を先に描き、内側を明暗2色だけで塗る
  var STYLE = { bg: ['#ffcf8a', '#ff9d6b', '#6b3f7a'], main: ['#e8a06a', '#c2703f', '#1e1420'], accent: ['#4fe0c8', '#ff4f6d'] };

  var TITLE = 'CLAY MASK';
  var TIME_LIMIT = 15;
  var NEEDED = 4;
  var MAX_MISS = 2;
  var FX = W / 2, FY = H * 0.5;
  var BASE = 340;
  var ROUND_T = 3.0;
  var LOCK_T = 0.45;
  var ROUNDS = [
    { axis: 'v', f: 1.6, tol: 0.1 },
    { axis: 'h', f: 1.55, tol: 0.1 },
    { axis: 'v', f: 0.62, tol: 0.08 },
    { axis: 'h', f: 1.95, tol: 0.08 },
    { axis: 'v', f: 2.05, tol: 0.07 }
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var EYE = ['.kk.', 'kwwk', 'kwkk', '.kk.'];
  var EYE_SQ = ['....', 'kkkk', '.kk.', '....'];
  var MOUTH_O = ['.kk.', 'krrk', 'krrk', '.kk.'];
  var MOUTH_SMILE = ['k....k', '.k..k.', '..kk..'];
  var MOUTH_GRR = ['kkkkkk', 'kwkwkk', 'kkkkkk'];
  var FACE_PAL = { k: '#1e1420', w: '#ffffff', r: '#b8324a' };
  var LANTERN = ['.kk.', 'rrrr', 'ryyr', 'rrrr', '.kk.'];
  var POT = ['.bbbb.', 'b....b', 'bbbbbb', '.bbbb.', '..bb..'];

  var m = null;
  var demo = { t: 0, a: { x: FX, y: FY - 80 }, b: { x: FX, y: FY + 80 }, press: false };

  function txt(s, x, y, size, color) {
    game.draw.text(s, x + 4, y + 4, { size: size, color: '#1e1420', bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function newSession(isDemo) {
    return {
      demo: isDemo, round: 0, f: 1, grab: null, hold: 0, roundT: 0, good: 0, miss: 0, perfect: 0,
      pause: 0, lastResult: null, hitStop: 0, over: false, win: false, endWait: -1,
      ready: isDemo ? 0 : 0.8, timeLeft: TIME_LIMIT, score: 0, milestone: false, wasTouching: false
    };
  }

  function cur() { return ROUNDS[m.round % ROUNDS.length]; }

  function faceSize(f, axis) {
    return axis === 'v' ? { w: BASE, h: BASE * f } : { w: BASE * f, h: BASE };
  }

  function pinch(p1, p2, dt) {
    var rd = cur();
    if (p1 && p2) {
      var d = rd.axis === 'v' ? Math.abs(p1.y - p2.y) : Math.abs(p1.x - p2.x);
      d = Math.max(50, d);
      if (!m.grab) {
        m.grab = { d0: d, f0: m.f };
        game.audio.tone('C4', 0.06, { wave: 'triangle', volume: 0.05 });
      }
      var nf = Math.max(0.45, Math.min(2.4, m.grab.f0 * d / m.grab.d0));
      if (Math.floor(nf * 10) !== Math.floor(m.f * 10)) game.audio.tone(nf > m.f ? 'E5' : 'A4', 0.03, { wave: 'square', volume: 0.03 });
      m.f = nf;
    } else {
      m.grab = null;
      m.f += (1 - m.f) * Math.min(1, dt * 3);
    }
    var off = Math.abs(m.f - rd.f);
    if (m.grab && off <= rd.tol) {
      m.hold += dt;
      if (m.hold >= LOCK_T) lockIn(off);
    } else {
      m.hold = Math.max(0, m.hold - dt * 2);
    }
  }

  function lockIn(off) {
    var perfect = off <= 0.035;
    m.good++;
    if (perfect) m.perfect++;
    m.score += perfect ? 300 : 150;
    m.lastResult = perfect ? 'perfect' : 'good';
    m.pause = 0.6; m.hitStop = 0.3;
    game.audio.play('se_coin', 0.3);
    if (!m.demo) {
      game.feedback.good(FX, FY - faceSize(m.f, cur().axis).h / 2 - 60, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? STYLE.accent[0] : '#ffe066' });
      if (!m.milestone && m.good === 2) { m.milestone = true; game.fx.popup('2 / ' + NEEDED, W / 2, H * 0.2, { color: STYLE.accent[0], size: 60 }); game.audio.play('se_milestone', 0.4); }
      if (m.good >= NEEDED) { m.over = true; m.win = true; m.hitStop = 0.5; game.fx.burst(FX, FY, { color: STYLE.accent[0], count: 40, speed: 560 }); }
    }
  }

  function missRound() {
    m.miss++;
    m.lastResult = 'miss';
    m.pause = 0.6; m.hitStop = 0.45;
    if (!m.demo) {
      game.feedback.bad(FX, FY, { text: 'MISS' });
      if (m.miss >= MAX_MISS) { m.over = true; m.win = false; m.hitStop = 0.6; }
    } else {
      game.audio.tone('C3', 0.15, { wave: 'sawtooth', volume: 0.05 });
    }
  }

  function step(dt, p1, p2) {
    if (m.hitStop > 0) {
      m.hitStop -= dt;
      if (m.hitStop <= 0 && m.over) m.endWait = 0.6;
      return;
    }
    if (m.over) return;
    if (m.pause > 0) {
      m.pause -= dt;
      m.f += (1 - m.f) * Math.min(1, dt * 6);
      if (m.pause <= 0) {
        m.round++; m.f = 1; m.grab = null; m.hold = 0; m.roundT = 0; m.lastResult = null;
        if (m.round >= ROUNDS.length && !m.demo) { m.over = true; m.win = m.good >= NEEDED; m.endWait = 0.4; }
      }
      return;
    }
    m.roundT += dt;
    pinch(p1, p2, dt);
    if (m.pause <= 0 && m.roundT >= ROUND_T) missRound();
  }

  function demoFingers(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.4;
    if (cyc < dt || demo.t <= dt) m = newSession(true);
    if (m.pause > 0 || m.hitStop > 0) { demo.press = false; return null; }
    var rd = cur();
    var sloppy = m.round % 2 === 1;
    var goal = sloppy ? rd.f + 0.35 : rd.f;
    var k = Math.max(0, Math.min(1, (m.roundT - 0.25) / 1.0));
    var fNow = 1 + (goal - 1) * k;
    var half = 90 * fNow;
    if (m.roundT < 0.25) { demo.press = false; return null; }
    demo.press = true;
    if (rd.axis === 'v') { demo.a = { x: FX, y: FY - half }; demo.b = { x: FX, y: FY + half }; }
    else { demo.a = { x: FX - half, y: FY }; demo.b = { x: FX + half, y: FY }; }
    return [demo.a, demo.b];
  }

  function drawOval(cx, cy, w, h, outline, light, dark, alpha) {
    var a = alpha === undefined ? 1 : alpha;
    for (var y = -h / 2 - 12; y < h / 2 + 12; y += 6) {
      var n = y / (h / 2 + 12);
      var hw = (w / 2 + 12) * Math.sqrt(Math.max(0, 1 - n * n));
      game.draw.rect(cx - hw, cy + y, hw * 2, 6, outline, a);
    }
    for (var y2 = -h / 2; y2 < h / 2; y2 += 6) {
      var n2 = y2 / (h / 2);
      var hw2 = (w / 2) * Math.sqrt(Math.max(0, 1 - n2 * n2));
      game.draw.rect(cx - hw2, cy + y2, hw2 * 2, 6, light, a);
      game.draw.rect(cx + hw2 * 0.35, cy + y2, hw2 * 0.65, 6, dark, a);
    }
  }

  function drawTargetOutline(rd, cx, cy, scale, col) {
    var sz = faceSize(rd.f, rd.axis);
    var w = sz.w * scale, h = sz.h * scale;
    var segs = 36;
    for (var i = 0; i < segs; i += 2) {
      var a1 = i / segs * Math.PI * 2, a2 = (i + 1) / segs * Math.PI * 2;
      game.draw.line(cx + Math.cos(a1) * w / 2, cy + Math.sin(a1) * h / 2, cx + Math.cos(a2) * w / 2, cy + Math.sin(a2) * h / 2, col, scale < 1 ? 4 : 8);
    }
  }

  function drawStage() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.55, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    for (var l = 0; l < 6; l++) {
      game.draw.line(l * 200 + 40, 230, l * 200 + 40, 290 + Math.sin(t * 2 + l) * 10, '#1e1420', 3);
      game.draw.sprite(LANTERN, { k: '#1e1420', r: STYLE.accent[1], y: '#ffe066' }, l * 200 + 40, 320 + Math.sin(t * 2 + l) * 10, 12, { anchor: 'center' });
    }
    game.draw.rect(0, H * 0.78, W, H * 0.22, '#5a2f3f');
    game.draw.rect(0, H * 0.78, W, 10, '#1e1420');
    game.draw.sprite(POT, { b: STYLE.main[1] }, W * 0.12, H * 0.74, 16, { anchor: 'center' });
    game.draw.sprite(POT, { b: STYLE.main[0] }, W * 0.88, H * 0.74 + Math.sin(t) * 4, 14, { anchor: 'center' });
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(t * 1.5));
  }

  function drawModel() {
    // the example mask hangs on the wall (top-right frame)
    var rd = cur();
    var mx = W * 0.8, my = H * 0.2;
    game.draw.rect(mx - 110, my - 110, 220, 220, '#1e1420');
    game.draw.rect(mx - 100, my - 100, 200, 200, '#ffe7c2');
    var sz = faceSize(rd.f, rd.axis);
    drawOval(mx, my, sz.w * 0.22, sz.h * 0.22, '#1e1420', STYLE.accent[0], '#2fa592');
  }

  function drawFace(p1, p2) {
    var t = game.time.elapsed;
    var rd = cur();
    var sz = faceSize(m.f, rd.axis);
    var wob = m.grab ? 0 : Math.sin(t * 6) * 6;
    var w = sz.w + wob, h = sz.h - wob;
    var close = Math.abs(m.f - rd.f) <= rd.tol;
    if (m.hitStop > 0 && m.lastResult) game.draw.circle(FX, FY, Math.max(w, h) / 2 + 70, '#ffffff', 0.6);
    game.draw.circle(FX, FY + h / 2 + 30, w / 2, '#1e1420', 0.25);
    drawOval(FX, FY + Math.sin(t * 2) * 4, w, h, '#1e1420', STYLE.main[0], STYLE.main[1]);
    var eyeArt = m.grab ? EYE_SQ : EYE;
    var mouth = m.lastResult === 'miss' ? MOUTH_O : (m.lastResult ? MOUTH_SMILE : (m.grab ? MOUTH_GRR : MOUTH_O));
    game.draw.sprite(eyeArt, FACE_PAL, FX - w * 0.2, FY - h * 0.12, 14, { anchor: 'center' });
    game.draw.sprite(eyeArt, FACE_PAL, FX + w * 0.2, FY - h * 0.12, 14, { anchor: 'center', flipX: true });
    game.draw.sprite(mouth, FACE_PAL, FX, FY + h * 0.22, 14, { anchor: 'center' });
    if (!m.lastResult) {
      drawTargetOutline(rd, FX, FY, 1, close ? STYLE.accent[0] : '#ffffff');
      if (m.hold > 0) {
        var segs = Math.floor(m.hold / LOCK_T * 24);
        for (var i = 0; i < segs; i++) {
          var a = i / 24 * Math.PI * 2 - Math.PI / 2;
          game.draw.circle(FX + Math.cos(a) * 60, FY + Math.sin(a) * 60, 9, STYLE.accent[0]);
        }
      }
      // axis grips: two glowing pads show which way to pull
      var pulse = 1 + Math.sin(t * 6) * 0.1;
      if (rd.axis === 'v') {
        game.draw.circle(FX, FY - h / 2, 30 * pulse, '#ffffff', 0.5);
        game.draw.circle(FX, FY + h / 2, 30 * pulse, '#ffffff', 0.5);
      } else {
        game.draw.circle(FX - w / 2, FY, 30 * pulse, '#ffffff', 0.5);
        game.draw.circle(FX + w / 2, FY, 30 * pulse, '#ffffff', 0.5);
      }
    }
    if (p1) game.draw.circle(p1.x, p1.y, 46, STYLE.accent[0], 0.45);
    if (p2) game.draw.circle(p2.x, p2.y, 46, STYLE.accent[0], 0.45);
  }

  function drawHud() {
    txt(m.good + ' / ' + NEEDED, W * 0.35, 100, 64, '#ffffff');
    for (var i = 0; i < ROUNDS.length; i++) {
      var col = '#ffe7c2';
      if (i < m.round || (i === m.round && m.lastResult)) col = '#8a6a7a';
      if (i === m.round && !m.lastResult) col = STYLE.accent[0];
      game.draw.circle(W * 0.1 + i * 70, 170, 22, col);
    }
    for (var k = 0; k < MAX_MISS; k++) game.draw.circle(W * 0.56 + k * 56, 90, 20, k < m.miss ? STYLE.accent[1] : '#8a6a7a');
    var frac = Math.max(0, m.timeLeft / TIME_LIMIT);
    game.draw.rect(60, 212, W - 120, 14, '#1e1420');
    game.draw.rect(60, 212, (W - 120) * frac, 14, m.timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 ? STYLE.accent[1] : '#ffe066');
    // per-mask timer ring near the thumb zone
    if (!m.lastResult && !m.over) {
      var rf = Math.max(0, 1 - m.roundT / ROUND_T);
      game.draw.rect(W * 0.2, H * 0.84, W * 0.6 * rf, 18, rf < 0.3 ? STYLE.accent[1] : STYLE.accent[0]);
    }
  }

  function initGame() {
    m = newSession(false);
  }

  function finish() {
    state = S.RESULT;
    game.audio.stopBgm();
    var stats = { masks: m.good, perfect: m.perfect, misses: m.miss };
    if (m.win) {
      m.score += Math.round(m.timeLeft * 20);
      game.audio.play('se_success', 0.5);
      game.end.success(m.score, stats);
    } else {
      game.audio.play('se_failure', 0.5);
      game.end.failure(stats);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.4);
      state = S.PLAYING; initGame();
      game.audio.melody([['D5', 0.5], ['F5', 0.5], ['A5', 0.5], ['F5', 0.5], ['G5', 1], ['E5', 1]], { tempo: 128, wave: 'triangle', volume: 0.045, loop: true, bass: [['D3', 2], ['A2', 2]] });
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || m.ready > 0 || m.over) return;
    game.audio.play('se_tap', 0.2);
    if (game.touches.length < 2) game.fx.burst(x, y, { color: '#ffffff', count: 3, speed: 100 });
    else game.fx.burst(x, y, { color: STYLE.accent[0], count: 5, speed: 160 });
  });
  game.onRelease(function(x, y, id) {
    if (state !== S.PLAYING || m.over) return;
    if (m.grab && !m.lastResult) game.audio.tone('G3', 0.08, { wave: 'triangle', volume: 0.05 });
  });

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (!m || !m.demo) m = newSession(true);
      var f = demoFingers(dt);
      step(dt, f ? f[0] : null, f ? f[1] : null);
      if (m.round >= ROUNDS.length) m = newSession(true);
      drawStage();
      drawModel();
      drawFace(f ? f[0] : null, f ? f[1] : null);
      game.draw.hand(demo.a.x, demo.a.y, { press: demo.press, scale: 12 });
      game.draw.hand(demo.b.x, demo.b.y, { press: demo.press, scale: 12 });
      txt(TITLE, W * 0.36 + Math.sin(t * 1.4) * 6, H * 0.08, 84, '#ffffff');
      txt('HI-SCORE ' + (game.best || 0), W * 0.36, H * 0.125, 36, STYLE.accent[0]);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 44, '#ffe066');
      else txt('INSERT COIN', W / 2, H * 0.95, 36, '#ffffff');
      return;
    }
    if (state === S.RESULT) {
      drawStage();
      drawFace(null, null);
      game.draw.rect(0, 0, W, H, '#1e1420', 0.45);
      if (m.win) {
        if (Math.floor(t * 5) % 2 === 0) game.fx.burst(game.random(100, W - 100), game.random(H * 0.2, H * 0.5), { color: STYLE.accent[0], count: 5, speed: 280 });
        txt('CLEAR', W / 2, H * 0.28, 120, STYLE.accent[0]);
      } else {
        txt(m.timeLeft <= 0 ? 'TIME UP' : 'GAME OVER', W / 2, H * 0.28, 100, STYLE.accent[1]);
        txt('あと' + Math.max(1, NEEDED - m.good) + '面!', W / 2, H * 0.35, 60, '#ffffff');
      }
      txt(m.good + ' / ' + NEEDED, W / 2, H * 0.62, 64, '#ffffff');
      txt('PERFECT ' + m.perfect, W / 2, H * 0.67, 44, '#ffe066');
      txt('SCORE ' + m.score, W / 2, H * 0.72, 48, '#ffffff');
      if (m.win && m.score >= (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.77, 52, STYLE.accent[0]);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.77, 40, '#ffe7c2');
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 40, '#ffffff');
      return;
    }
    // PLAYING
    var tl = game.touches;
    var p1 = tl.length >= 2 ? tl[0] : null, p2 = tl.length >= 2 ? tl[1] : null;
    if (m.ready > 0) {
      m.ready -= dt;
      if (m.ready <= 0) game.audio.play('se_tap', 0.4);
    } else {
      if (!m.over) {
        m.timeLeft -= dt;
        if (m.timeLeft <= 0) {
          m.timeLeft = 0; m.over = true; m.win = false; m.hitStop = 0.45; m.lastResult = 'miss';
          game.feedback.bad(FX, FY, { text: 'TIME UP' });
        }
      }
      step(dt, p1, p2);
      if (m.over && m.endWait > 0) {
        m.endWait -= dt;
        if (m.endWait <= 0) { finish(); return; }
      }
    }
    drawStage();
    drawModel();
    drawFace(p1, p2);
    drawHud();
    if (m.ready > 0) {
      txt(m.ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 120, '#ffe066');
      var sp = 90 + (0.8 - m.ready) * 120;
      game.draw.hand(FX, FY - sp, { press: true, scale: 11 });
      game.draw.hand(FX, FY + sp, { press: true, scale: 11 });
    }
  });

  game.onStart(function() {
    game.audio.melody([['A4', 0.5], ['C5', 0.5], ['D5', 1], ['C5', 0.5], ['A4', 0.5], ['G4', 1]], { tempo: 100, wave: 'triangle', volume: 0.04, loop: true });
    state = S.ATTRACT;
    m = newSession(true);
    demo.t = 0;
  });
})(game);

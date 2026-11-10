// I-Switch2-0010v2-depato-mirror-lag-spot.js
// 鏡売り場のずれ見つけ — 壁に並んだ売り物の鏡に映るお客さんの動きの中から、1枚だけずれて映る鏡を見つけて押す
// 操作: 下でお客さんが手を振る・揺れる・跳ねる。壁の鏡はどれも同じ動きを映すが、1枚だけ逆向き・遅れ・速すぎで映る。その鏡をタップして外す(社内メモ。画面には出さない)
// 終わり: 5枚見つければCLEAR。違う鏡を押す/輪が尽きるとハートの鏡を1枚失い、2枚失うか15秒切れでGAME OVER
// @mechanic: spot
// @theme: depato_mirror_lag_spot
// 世界観: 百貨店の鏡売り場で、開店前の店員が試しに動いてくれるお客さんを壁の売り物の鏡に映し、1枚だけ動きがずれて映るゆがんだ鏡を見つけて棚から外していく
// 残るもの: 正誤(CLEAR/GAME OVER) + 見つけた鏡の枚数・PERFECT数・スコア
// スタイル: 2000s ARCADE POP

(function(game) {
  var STYLE = { bg: ['#fff4fb', '#ffd8ee', '#d8d0ff'], main: ['#ff3c8c', '#2ab8ff', '#ffc81e'], accent: ['#ffffff', '#ff4a3a'] };
  var W = game.canvas.width;
  var H = game.canvas.height;
  var INK = '#3a1a4a';

  var GAME_TITLE = 'ODD MIRROR';
  var TIME_LIMIT = 15;
  var NEEDED = 5;
  var LIVES = 2;
  var AREA = { x: 70, y: H * 0.15, w: W - 140, h: H * 0.53 };
  var REF = { x: W * 0.56, y: H * 0.835 };
  var CLERK = { x: W * 0.17, y: H * 0.86 };
  var SPEED = 5.6;

  // ずれ方は後半ほど細かくなる: 逆向き → 半拍遅れ → 4分の1遅れ → 速すぎ → わずかな遅れ
  var ROUNDS = [
    { n: 4, cols: 2, motion: 'wave', odd: 'flip', win: 3.6 },
    { n: 6, cols: 2, motion: 'sway', odd: 'flip', win: 3.3 },
    { n: 6, cols: 3, motion: 'hop', odd: 'lag', lag: 1.7, win: 3.0 },
    { n: 9, cols: 3, motion: 'wave', odd: 'fast', win: 2.8 },
    { n: 9, cols: 3, motion: 'mix', odd: 'lag', lag: 1.15, win: 2.6 },
  ];

  var BODY_A = ['...bbbb...', '..bbbbbbb.', '..hssssh..', '..hesseh..', '..hssssh..', '...smms...', '..dddddd..', '.sdddddd..', '.sdddddd..', '..dddddd..', '.dddddddd.', '...l..l...', '...l..l...', '..kk..kk..'];
  var BODY_B = ['...bbbb...', '..bbbbbbb.', '..hssssh..', '..hssssh..', '..hssssh..', '...smms...', '..dddddd..', '.sdddddd..', '.sdddddd..', '..dddddd..', '.dddddddd.', '...l..l...', '...l..l...', '..kk..kk..'];
  var BACK = ['...bbbb...', '..bbbbbbb.', '..hhhhhh..', '..hhhhhh..', '..hhhhhh..', '...hhhh...', '..dddddd..', '.sdddddd..', '.sdddddd..', '..dddddd..', '.dddddddd.', '...l..l...', '...l..l...', '..kk..kk..'];
  var FIG_PAL = { b: '#ff3c8c', h: '#7a4a2a', s: '#ffd8b8', e: '#2a1a3a', m: '#ff4a6a', d: '#2ab8ff', l: '#ffd8b8', k: '#3a1a4a' };
  var CLERK_A = ['..kkkk....', '.khhhhk...', '.kseesk...', '.kssssk.w.', '..kmmk..w.', '.kvvvvk.w.', 'kvvwwvvkk.', 'kvvwwvvk..', '.kvvvvk...', '.kgg.ggk..', '.kk...kk..'];
  var CLERK_B = ['..kkkk..w.', '.khhhhk.w.', '.kseesk.w.', '.kssssk.k.', '..kmmk.k..', '.kvvvvkk..', 'kvvwwvvk..', 'kvvwwvvk..', '.kvvvvk...', '.kgg.ggk..', '.kk...kk..'];
  var CLERK_PAL = { k: '#3a1a4a', h: '#2a2a3a', s: '#ffd8b8', e: '#2a1a3a', m: '#ff4a6a', v: '#7a4aff', w: '#ffffff', g: '#3a3a5a' };
  var STAR = ['...w...', '..wyw..', 'wwyyyww', '.wyyyw.', '.wywyw.', 'ww...ww'];
  var HEART_MIRROR = ['.yyyyy.', 'yccccwy', 'ycccwcy', 'yccwccy', 'ycccccy', '.yyyyy.', '...y...'];

  var STATE = { ATTRACT: 'ATTRACT', PLAYING: 'PLAYING', RESULT: 'RESULT' };
  var state = STATE.ATTRACT;

  var mirrors = [], oddIdx = 0, round = 0, roundT = 0, roundMax = 1, ph = 0;
  var phase = 'look', phaseT = 0, wrongIdx = -1, foundIdx = -1;
  var found = 0, lives = LIVES, score = 0, perfects = 0, streak = 0;
  var left = TIME_LIMIT, count = 0, holdT = 0, fadeT = 0, celebT = 0;
  var on = false, cleared = false, bestAtStart = 0, cheer = 0;

  function write(str, x, y, size, color) {
    game.draw.text(str, x + 4, y + 4, { size: size, color: '#ffffff', bold: true, align: 'center' });
    game.draw.text(str, x - 3, y - 3, { size: size, color: '#ffffff', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function rd() { return ROUNDS[Math.min(ROUNDS.length - 1, round)]; }

  // 鏡の並びを作り直す(ずれる1枚はランダム)
  function layout() {
    var r = rd();
    var rows = Math.ceil(r.n / r.cols);
    var cw = AREA.w / r.cols, ch = AREA.h / rows;
    mirrors = [];
    for (var i = 0; i < r.n; i++) {
      var c = i % r.cols, rr = Math.floor(i / r.cols);
      mirrors.push({ x: AREA.x + cw * c + cw * 0.09, y: AREA.y + ch * rr + ch * 0.07, w: cw * 0.82, h: ch * 0.86, star: 0, tilt: game.random(0, 6.28) });
    }
    oddIdx = Math.min(r.n - 1, Math.floor(game.random(0, r.n)));
    roundMax = r.win; roundT = roundMax;
    phase = 'look'; wrongIdx = -1; foundIdx = -1;
  }

  // 動きの位相 → 姿勢(腕の角度・横ゆれ・跳ね)
  function poseAt(p, motion) {
    var o = { arm: 0.3, dx: 0, dy: 0 };
    if (motion === 'wave' || motion === 'mix') o.arm = 0.3 + 2.5 * (1 - Math.cos(p)) / 2;
    if (motion === 'sway' || motion === 'mix') o.dx = Math.sin(p) * 0.18;
    if (motion === 'hop') { o.dy = -Math.max(0, Math.sin(p)) * 0.22; o.arm = 1.4; }
    return o;
  }
  function mirrorPhase(i) {
    var r = rd();
    if (i !== oddIdx) return ph;
    if (r.odd === 'flip') return ph + Math.PI;
    if (r.odd === 'fast') return ph * 1.38 + 0.6;
    return ph - r.lag;
  }

  function judgeTap(x, y) {
    for (var i = 0; i < mirrors.length; i++) {
      var m = mirrors[i];
      if (x > m.x - 10 && x < m.x + m.w + 10 && y > m.y - 10 && y < m.y + m.h + 10) return i;
    }
    return -1;
  }

  // 実ロジック: 鏡を押した結果
  function tapMirror(i, live) {
    var m = mirrors[i];
    if (i === oddIdx) {
      var quick = roundT > roundMax * 0.6;
      foundIdx = i; m.star = 1; phase = 'found'; phaseT = 0.5; cheer = 0.5;
      game.feedback.good(m.x + m.w / 2, m.y + m.h / 2, { text: quick ? 'PERFECT' : 'GOOD', color: quick ? STYLE.main[2] : STYLE.main[1], count: quick ? 18 : 10, volume: live ? 1 : 0.4 });
      if (!live) return;
      found++; streak++;
      if (quick) perfects++;
      score += 100 + Math.round(roundT * 60) + (quick ? 100 : 0) + streak * 20;
      if (found === 3) { game.fx.popup('3 / ' + NEEDED, W / 2, H * 0.13, { color: STYLE.main[0], size: 60 }); game.audio.play('se_milestone', 0.5); }
      if (streak === 3 && perfects >= 2) game.audio.play('se_powerup', 0.4);
      if (found >= NEEDED) { cleared = true; finishRun(); }
    } else {
      missRound(i, live);
    }
  }

  function missRound(i, live) {
    wrongIdx = i; phase = 'stop'; phaseT = 0.55; streak = 0;
    var m = i >= 0 ? mirrors[i] : mirrors[oddIdx];
    game.feedback.bad(m.x + m.w / 2, m.y + m.h / 2, { text: i >= 0 ? 'MISS' : 'TIME UP', shake: live ? 12 : 4, volume: live ? 1 : 0.4 });
    if (!live) return;
    lives--;
    if (lives <= 0) { cleared = false; finishRun(); }
  }

  // 実ロジック: 時間経過。戻り値 'late' | 'next' | null
  function stepRound(dt) {
    ph += dt * SPEED;
    for (var i = 0; i < mirrors.length; i++) if (mirrors[i].star > 0) mirrors[i].star = Math.max(0, mirrors[i].star - dt * 0.6);
    if (phase === 'look') {
      roundT -= dt;
      if (roundT <= 0) return 'late';
    } else {
      phaseT -= dt;
      if (phaseT <= 0) return 'next';
    }
    return null;
  }

  function finishRun() {
    on = false; holdT = 0.55; celebT = 0;
    game.audio.stopBgm();
    if (cleared) {
      score += Math.round(left * 40);
      game.audio.play('se_success', 0.5);
    } else {
      game.audio.play('se_failure', 0.45);
    }
  }

  function startBgm() {
    game.audio.melody([
      ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['A5', 0.5], ['G5', 1], ['E5', 0.5], ['F5', 0.5],
      ['D5', 0.5], ['F5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 1], ['C5', 1],
    ], { tempo: 132, wave: 'square', volume: 0.04, loop: true, bass: [['C3', 1], ['G3', 1], ['F3', 1], ['G3', 1]] });
  }

  function initGame() {
    round = 0; found = 0; lives = LIVES; score = 0; perfects = 0; streak = 0;
    left = TIME_LIMIT; count = 0.8; holdT = 0; fadeT = 0; celebT = 0; cheer = 0;
    on = false; cleared = false; ph = 0;
    bestAtStart = game.best || 0;
    layout();
  }

  game.onTap(function(x, y) {
    if (state === STATE.ATTRACT) { game.audio.play('se_coin', 0.5); state = STATE.PLAYING; initGame(); startBgm(); return; }
    if (state === STATE.RESULT) { state = STATE.ATTRACT; initGame(); demo.t = 0; return; }
    if (!on || phase !== 'look') { game.audio.play('se_tap', 0.08); return; }
    var i = judgeTap(x, y);
    if (i < 0) { game.audio.play('se_tap', 0.15); game.fx.burst(x, y, { color: STYLE.main[1], count: 3, speed: 90 }); return; }
    game.audio.play('se_tap', 0.3);
    tapMirror(i, true);
  });

  // ── ATTRACT ゴースト実演: 本番と同じ鏡と判定。偶数周は先に違う鏡を押して失敗を見せる ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.9, press: 0, n: 0, aimWrong: false, tapped: false };
  function demoNewRound() {
    round = demo.n % 3; layout(); demo.tapped = false;
    demo.aimWrong = demo.n % 2 === 1;
    demo.n++;
  }
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt || mirrors.length === 0) { demo.n = 0; demoNewRound(); }
    if (demo.press > 0) demo.press -= dt;
    var ev = stepRound(dt);
    if (ev === 'late') roundT = roundMax;
    if (ev === 'next') { demoNewRound(); return; }
    if (phase !== 'look') return;
    var target = demo.aimWrong ? (oddIdx + 1) % mirrors.length : oddIdx;
    var m = mirrors[target];
    var seen = roundMax - roundT;
    var tx = seen > 0.9 ? m.x + m.w / 2 : W / 2, ty = seen > 0.9 ? m.y + m.h * 0.6 : H * 0.9;
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 5);
    demo.gy += (ty - demo.gy) * Math.min(1, dt * 5);
    if (!demo.tapped && seen > 1.6) {
      demo.tapped = true; demo.press = 0.25;
      tapMirror(target, false);
    }
  }

  // ── 描画 ──
  function drawShop() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.5, STYLE.bg[1]], [0.72, STYLE.bg[2]], [1, '#b8a8ff']]);
    for (var i = 0; i < 6; i++) {
      var px = ((i * 211 + t * 60) % (W + 200)) - 100;
      game.draw.rect(px, 0, 70, H * 0.72, '#ffffff', 0.18);
      game.draw.rect(px + 20, 0, 24, H * 0.72, '#ffffff', 0.2);
    }
    // 床(白とピンクの市松)
    for (var y = 0; y < 5; y++) {
      for (var x = 0; x < 9; x++) {
        game.draw.rect(x * 120, H * 0.72 + y * 108, 120, 108, (x + y) % 2 ? '#ffffff' : '#ffc8e4', 0.75);
      }
    }
    game.draw.rect(0, H * 0.715, W, 14, STYLE.main[0]);
    for (var s = 0; s < 8; s++) {
      var a = 0.4 + 0.6 * Math.abs(Math.sin(t * 2.2 + s * 1.3));
      game.draw.sprite(STAR, { w: '#ffffff', y: STYLE.main[2] }, 60 + (s * 137) % (W - 120), H * 0.13 + (s * 89) % 60 + (s % 2) * H * 0.56, 7, { anchor: 'center', alpha: a });
    }
  }

  function drawFigure(cx, cy, px, pose, spr) {
    var x = cx + pose.dx * px * 14, y = cy + pose.dy * px * 14;
    game.draw.rect(cx - px * 3.5, cy + px * 6.9, px * 7, px * 0.9, '#3a1a4a', 0.15);
    game.draw.sprite(spr, FIG_PAL, x, y, px, { anchor: 'center' });
    var sx = x + 3.5 * px, sy = y - 0.5 * px, L = 4.6 * px;
    var hx = sx + Math.sin(pose.arm) * L, hy = sy + Math.cos(pose.arm) * L;
    game.draw.line(sx, sy, hx, hy, FIG_PAL.k, px * 1.6);
    game.draw.line(sx, sy, hx, hy, FIG_PAL.s, px * 0.9);
    game.draw.circle(hx, hy, px * 0.8, FIG_PAL.s);
  }

  function drawMirrors(hl) {
    var t = game.time.elapsed;
    var r = rd();
    var blink = Math.floor(t * 1.4) % 5 === 0;
    for (var i = 0; i < mirrors.length; i++) {
      var m = mirrors[i];
      var grow = (hl && i === oddIdx) ? 16 : 0;
      var wob = Math.sin(t * 1.6 + m.tilt) * 3;
      var x = m.x - grow, y = m.y - grow + wob, w = m.w + grow * 2, h = m.h + grow * 2;
      game.draw.rect(x - 14, y - 14, w + 28, h + 28, '#ffffff');
      game.draw.rect(x - 8, y - 8, w + 16, h + 16, STYLE.main[2]);
      game.draw.rect(x, y, w, h, '#bfefff');
      game.draw.rect(x, y + h * 0.55, w, h * 0.45, '#a8e0ff');
      game.draw.line(x + w * 0.12, y + h * 0.1, x + w * 0.35, y + h * 0.02, '#ffffff', 8);
      var pose = poseAt(mirrorPhase(i), r.motion);
      var px = Math.min(w / 16, h / 22);
      drawFigure(x + w / 2, y + h * 0.56, px, pose, blink ? BODY_B : BODY_A);
      if (m.star > 0 || (foundIdx === i && phase === 'found')) {
        game.draw.rect(x, y, w, h, '#ffffff', 0.35 * Math.max(m.star, 0.3));
        game.draw.sprite(STAR, { w: '#ffffff', y: STYLE.main[2] }, x + w - 30, y + 30, 9, { anchor: 'center' });
      }
      if (hl && i === oddIdx) {
        game.draw.rect(x - 22, y - 22, w + 44, h + 44, '#ffffff', 0.25 + 0.2 * Math.sin(t * 20));
      }
      if (hl && i === wrongIdx) {
        game.draw.rect(x, y, w, h, STYLE.accent[1], 0.4);
      }
    }
  }

  function drawFloor() {
    var t = game.time.elapsed;
    var r = rd();
    // お客さん(本物)は後ろ姿で同じ動きをする — これが正しい動きの手本
    game.draw.circle(REF.x, REF.y - 40, 170, '#ffffff', 0.35 + 0.1 * Math.sin(t * 3));
    drawFigure(REF.x, REF.y - 30, 15, poseAt(ph, r.motion), BACK);
    // 店員(自分)
    var bob = Math.sin(t * 4) * 5 - (cheer > 0 ? 30 : 0);
    game.draw.sprite(cheer > 0 || Math.floor(t * 2.5) % 2 ? CLERK_B : CLERK_A, CLERK_PAL, CLERK.x, CLERK.y + bob, 15, { anchor: 'center' });
  }

  function drawRing() {
    if (phase !== 'look') return;
    var k = Math.max(0, roundT / roundMax);
    var cx = W * 0.86, cy = H * 0.84;
    game.draw.circle(cx, cy, 86, '#ffffff', 0.9);
    for (var a = 0; a < 36; a++) {
      if (a / 36 > k) break;
      var ang = -Math.PI / 2 + (a / 36) * Math.PI * 2;
      game.draw.circle(cx + Math.cos(ang) * 64, cy + Math.sin(ang) * 64, 12, k < 0.3 ? STYLE.accent[1] : STYLE.main[0]);
    }
    game.draw.sprite(HEART_MIRROR, { y: STYLE.main[2], c: '#bfefff', w: '#ffffff' }, cx, cy, 9, { anchor: 'center' });
  }

  function drawHud() {
    write(found + ' / ' + NEEDED, W / 2, 96, 56, STYLE.main[0]);
    write(String(score), W - 140, 96, 36, STYLE.main[1]);
    for (var i = 0; i < LIVES; i++) {
      game.draw.sprite(HEART_MIRROR, { y: STYLE.main[2], c: '#bfefff', w: '#ffffff' }, 70 + i * 80, 96, 9, { anchor: 'center', alpha: i < lives ? 1 : 0.2 });
    }
    var bw = W - 160;
    var low = left < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 170, bw, 20, '#ffffff', 1);
    game.draw.rect(84, 174, (bw - 8) * Math.max(0, left / TIME_LIMIT), 12, low ? STYLE.accent[1] : STYLE.main[1], 1);
  }

  game.onUpdate(function(dt) {
    if (cheer > 0) cheer -= dt;

    if (state === STATE.ATTRACT) {
      stepDemo(dt);
      drawShop();
      drawMirrors(phase === 'stop');
      drawFloor();
      drawRing();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 15 });
      var bob = Math.sin(game.time.elapsed * 2) * 6;
      write(GAME_TITLE, W / 2, H * 0.06 + bob, 76, STYLE.main[0]);
      write('HI-SCORE ' + Math.round(game.best || 0), W / 2, H * 0.105, 32, STYLE.main[1]);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) write('► 100円 投入 ◄', W / 2, H * 0.975, 40, STYLE.main[0]);
      else write('INSERT COIN', W / 2, H * 0.975, 32, STYLE.main[1]);
      return;
    }

    if (state === STATE.RESULT) {
      ph += dt * SPEED;
      celebT -= dt;
      if (cleared && celebT <= 0) {
        celebT = 0.3;
        var m = mirrors[Math.min(mirrors.length - 1, Math.floor(game.random(0, mirrors.length)))];
        game.fx.burst(m.x + m.w / 2, m.y + m.h / 2, { color: game.random(0, 1) < 0.5 ? STYLE.main[2] : STYLE.main[0], count: 14, speed: 380 });
        cheer = 0.2;
      }
      drawShop();
      drawMirrors(!cleared);
      drawFloor();
      write(cleared ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 80, cleared ? STYLE.main[0] : STYLE.accent[1]);
      write(found + ' / ' + NEEDED, W / 2, H * 0.73, 48, STYLE.main[1]);
      write('SCORE ' + score, W / 2, H * 0.765, 36, STYLE.main[0]);
      if (!cleared) write('あと' + (NEEDED - found) + '枚!', W / 2, H * 0.105, 40, STYLE.accent[1]);
      else write('PERFECT ' + perfects, W / 2, H * 0.105, 34, STYLE.main[1]);
      if (score > bestAtStart && score > 0) write('NEW RECORD', W / 2, H * 0.8, 34, Math.floor(game.time.elapsed * 4) % 2 ? STYLE.main[2] : STYLE.main[0]);
      else write('BEST ' + Math.round(game.best || 0), W / 2, H * 0.8, 28, STYLE.main[1]);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) write('TAP TO CONTINUE', W / 2, H * 0.975, 32, STYLE.main[1]);
      return;
    }

    // ── PLAYING ──
    if (fadeT > 0) {
      fadeT -= dt;
      if (fadeT <= 0) {
        state = STATE.RESULT;
        var stats = { found: found, perfect: perfects, lives: lives };
        if (cleared) game.end.success(score, stats); else game.end.failure(stats);
        if (cleared && score > bestAtStart) game.audio.play('se_milestone', 0.5);
      }
    } else if (holdT > 0) {
      holdT -= dt;
      if (holdT <= 0) fadeT = 1.0;
    } else if (count > 0) {
      count -= dt;
      ph += dt * SPEED;
      if (count <= 0) { on = true; game.audio.play('se_tap', 0.35); }
    } else if (on) {
      if (phase === 'look') left -= dt;
      var ev = stepRound(dt);
      if (ev === 'late') missRound(-1, true);
      else if (ev === 'next') { if (phase === 'found') round = found; layout(); }
      if (on && left <= 0) {
        left = 0; cleared = false; phase = 'stop'; wrongIdx = -1;
        game.feedback.bad(W / 2, H * 0.4, { text: 'TIME UP', shake: 10 });
        finishRun();
      }
    }

    drawShop();
    drawMirrors((phase === 'stop') && !cleared);
    drawFloor();
    drawRing();
    drawHud();
    if (count > 0) write(count > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 96, STYLE.main[0]);
  });

  game.onStart(function() {
    startBgm();
    state = STATE.ATTRACT;
    initGame();
  });
})(game);

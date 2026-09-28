// J-N6434-0061-parcel-bulge-pick.js
// ふくらみ小包えらび — 同じ見た目の小包の中から、中身が詰まってわずかに大きい一箱を瞬時に見抜いて抜き取る
// 操作: 並んだ4つの小包のうち、ほんの少しだけ大きい箱をタップ(運ではなく大きさの見比べ)
// 終わり: 5回続けて当たりの箱を抜けば成功。違う箱を開ける/迷って見送る/時間切れで失敗
// @mechanic: size_judge
// @theme: mail_car_parcel_bulge
// 世界観: 夜行列車の郵便車で、仕分け係の見習いネズミが、揺れる棚に積まれた同じ包装の小包から、中身が詰まってひと回りふくらんだ速達の箱だけを見抜いて駅ごとに抜き取る
// 残るもの: 正誤(CLEAR/GAME OVER) + 抜き取った数・PERFECT数
// スタイル: 80s ISO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: 菱形グリッド、面ごとの3明度、影で高さを示す
  var STYLE = { bg: ['#1a1030', '#3a2458'], main: ['#e0b070', '#b88048', '#8a5a30'], accent: ['#50e0c0', '#ff5070'] };
  var C = { top: '#e8bc80', left: '#b88048', right: '#8a5a30', tape: '#f4ecd8', grid: '#5a3c80', ink: '#120a20',
    teal: '#50e0c0', pink: '#ff5070', gold: '#ffd060', white: '#fff4e0' };

  var GAME_TITLE = 'PARCEL PICK';
  var TIME_LIMIT = 13;
  var NEEDED = 5;
  var DIFFS = [0.17, 0.14, 0.11, 0.09, 0.075];
  var DECIDE = [2.5, 2.3, 2.1, 1.9, 1.8];
  var BASE = 96;
  var SLOTS = [{ x: 330, y: H * 0.4 }, { x: 750, y: H * 0.4 }, { x: 330, y: H * 0.6 }, { x: 750, y: H * 0.6 }];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var round, boxes, right, phase, phT, picked, perfects, score, opened;
  var timeLeft, ready, hitStop, finished, ok, done, endWait;

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center', font: 'monospace' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center', font: 'monospace' });
  }

  var MOUSE_A = ['e...e', 'eeeee', '.eKe.', '.eee.', 'ccccc', '.c.c.'];
  var MOUSE_B = ['e...e', 'eeeee', '.eKe.', '.eee.', 'ccccc', 'c...c'];
  var MOUSE_PAL = { e: '#c8c0d0', K: '#120a20', c: '#50e0c0' };
  var STAMP = ['ss.', 'sss', '.ss'];
  var PARCEL_ICON = ['tttt', 'tbbt', 'tttt'];
  var LETTER = ['wwww', 'wkkw', 'wwww'];

  function newRound() {
    var d = DIFFS[Math.min(round, DIFFS.length - 1)];
    right = Math.floor(game.random(0, 3.99));
    if (right > 3) right = 3;
    boxes = [];
    for (var i = 0; i < 4; i++) {
      boxes.push({ s: BASE * (i === right ? 1 + d : 1), h: 0.9 + game.random(-0.01, 0.01), ph: game.random(0, 6), slide: 1 });
    }
    phase = 'arrive'; phT = 0; opened = -1;
  }

  function initGame() {
    round = 0; picked = 0; perfects = 0; score = 0;
    timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0; finished = false; ok = false; done = false; endWait = 0;
    newRound();
  }

  function boxPos(i, t) {
    var sl = boxes[i].slide;
    var wob = round >= 2 ? Math.sin(t * 5 + boxes[i].ph) * 10 : Math.sin(t * 2 + boxes[i].ph) * 3;
    return { x: SLOTS[i].x + sl * 700 * (i % 2 ? 1 : -1), y: SLOTS[i].y + wob };
  }

  // 抜き取る — プレイもデモもここを通る
  function pick(i, live) {
    if (phase !== 'decide') return false;
    opened = i; phase = 'open'; phT = 0;
    var lim = DECIDE[Math.min(round, DECIDE.length - 1)];
    if (i === right) {
      var perfect = phTDecide < lim * 0.4;
      picked++;
      if (perfect) perfects++;
      score += perfect ? 150 : 100;
      if (live) {
        var p = boxPos(i, game.time.elapsed);
        game.feedback.good(p.x, p.y - 120, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.gold : C.teal });
        if (picked === 3) { game.audio.play('se_milestone', 0.5); game.fx.popup(picked + ' / ' + NEEDED, W / 2, H * 0.25, { color: C.gold, size: 64 }); }
        if (picked >= NEEDED) { finished = true; ok = true; hitStop = 0.45; score += Math.round(timeLeft * 30); }
      }
    } else if (live) {
      finished = true; ok = false; hitStop = 0.5;
      game.audio.play('se_break', 0.4);
    }
    return true;
  }

  var phTDecide = 0;
  function stepRound(dt, live) {
    phT += dt;
    if (phase === 'arrive') {
      for (var i = 0; i < 4; i++) boxes[i].slide = Math.max(0, 1 - phT / 0.3);
      if (phT >= 0.3) { phase = 'decide'; phT = 0; phTDecide = 0; if (live) game.audio.tone('A4', 0.06, { wave: 'square', volume: 0.05 }); }
    } else if (phase === 'decide') {
      phTDecide = phT;
      if (live && phT > DECIDE[Math.min(round, DECIDE.length - 1)]) {
        opened = right; phase = 'open'; phT = 0;
        finished = true; ok = false; hitStop = 0.5;
      }
    } else if (phase === 'open' && phT > 0.45 && !finished) {
      round++;
      if (round >= NEEDED) { round = NEEDED - 1; phase = 'end'; }
      else newRound();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; music(); return; }
    if (finished || ready > 0 || phase !== 'decide') { game.audio.play('se_tap', 0.08); return; }
    var best = -1, bd = 1e9, t = game.time.elapsed;
    for (var i = 0; i < 4; i++) {
      var p = boxPos(i, t);
      var d = Math.hypot(x - p.x, y - (p.y + 40));
      if (d < 190 && d < bd) { bd = d; best = i; }
    }
    if (best < 0) { game.audio.play('se_tap', 0.1); game.fx.burst(x, y, { color: C.grid, count: 3, speed: 80 }); return; }
    game.audio.play('se_tap', 0.3);
    pick(best, true);
  });

  // ── ATTRACT: 本物の stepRound/pick。3回は大きい箱を、4回目はうっかり隣の箱を開ける ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.0;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; }
    stepRound(dt, false);
    var tgt = round >= 3 ? (right + 1) % 4 : right;
    var p = boxPos(tgt, game.time.elapsed);
    if (phase === 'decide') {
      demo.gx += (p.x - demo.gx) * Math.min(1, dt * 7); demo.gy += (p.y + 50 - demo.gy) * Math.min(1, dt * 7);
      demo.press = phT > 0.7;
      if (phT > 0.85) { pick(tgt, false); if (round >= 3) phase = 'end'; }
    } else demo.press = false;
  }

  function isoBox(cx, cy, s, hgt, lid) {
    var a = s, b = s / 2, h = s * hgt;
    // 接地影
    for (var sy = -14; sy <= 14; sy += 2) {
      var shw = a * 1.05 * Math.sqrt(1 - (sy / 15) * (sy / 15));
      game.draw.rect(cx - shw + 10, cy + b * 0.5 + h + sy, shw * 2, 2, '#000000', 0.22);
    }
    // 左面
    for (var x = 0; x < a; x += 3) {
      var ty = cy + x * (b / a);
      game.draw.rect(cx - a + x, ty, 3, h, C.left);
    }
    // 右面
    for (var x2 = 0; x2 < a; x2 += 3) {
      var ty2 = cy + b - x2 * (b / a);
      game.draw.rect(cx + x2, ty2, 3, h, C.right);
    }
    // 上面(ふたが開くと持ち上がる)
    var ly = cy - lid;
    for (var dy = -b; dy < b; dy += 3) {
      var hw = a * (1 - Math.abs(dy) / b);
      game.draw.rect(cx - hw, ly + b + dy - b, hw * 2, 3, C.top);
    }
    game.draw.line(cx - a * 0.5, ly - b * 0.5, cx + a * 0.5, ly + b * 0.5, C.tape, 10);
    game.draw.sprite(STAMP, { s: C.pink }, cx + a * 0.35, cy + b * 0.9 + h * 0.3, 6, { anchor: 'center' });
  }

  function drawScene(t) {
    var pulse = 0.05 + 0.04 * Math.sin(t * 1.4);
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [1, STYLE.bg[1]]]);
    // 車窓の流れる灯り
    game.draw.rect(0, H * 0.14, W, 140, '#0a0618');
    for (var l = 0; l < 8; l++) {
      var lx = (W - ((t * 520 + l * 180) % (W + 200))) + 100;
      game.draw.circle(lx, H * 0.14 + 40 + (l % 3) * 30, 8, C.gold, 0.7);
    }
    game.draw.rect(0, H * 0.14, W, 140, C.teal, pulse * 0.4);
    // 菱形グリッドの床
    for (var g = -8; g < 12; g++) {
      game.draw.line(g * 140, H * 0.28, g * 140 + 700, H * 0.28 + 350 * 2, C.grid, 2);
      game.draw.line(g * 140, H * 0.28, g * 140 - 700, H * 0.28 + 350 * 2, C.grid, 2);
    }
    // 仕分け係(演出)
    var mf = Math.floor(t * 3) % 2 ? MOUSE_A : MOUSE_B;
    game.draw.sprite(mf, MOUSE_PAL, 110, H * 0.76 + Math.sin(t * 2.5) * 5, 13, { anchor: 'center' });
    // 仕分け棚の手紙(遠景・揺れる)
    for (var k = 0; k < 6; k++) game.draw.sprite(k % 2 ? LETTER : PARCEL_ICON, { w: C.white, k: C.grid, t: C.left, b: C.tape }, 160 + k * 150, H * 0.27 + Math.sin(t * 3 + k) * 4, 8, { anchor: 'center' });
  }

  function drawBoxes(t) {
    if (!boxes) return;
    for (var i = 0; i < 4; i++) {
      var p = boxPos(i, t);
      var bx = boxes[i];
      var lid = 0;
      if (opened === i) lid = Math.min(1, phT / 0.25) * 60;
      if (opened === i && hitStop > 0) game.draw.circle(p.x, p.y + 40, 190, C.white, 0.35);
      isoBox(p.x, p.y, bx.s, bx.h, lid);
      if (opened === i && lid > 20) {
        if (i === right) {
          game.draw.circle(p.x, p.y - 10, 60 + Math.sin(t * 12) * 8, C.gold, 0.5);
          game.draw.sprite(LETTER, { w: C.white, k: C.pink }, p.x, p.y - 40 - lid * 0.6, 14, { anchor: 'center' });
        } else {
          for (var d = 0; d < 5; d++) game.draw.circle(p.x - 40 + d * 20, p.y - 20 - (phT * 80 + d * 9) % 60, 10, C.grid, 0.6);
        }
      }
    }
  }

  function drawHud() {
    txt(picked + ' / ' + NEEDED, W / 2, 80, 66, C.white);
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(90, 150, W - 180, 18, C.ink, 0.8);
    game.draw.rect(90, 150, (W - 180) * Math.max(0, timeLeft / TIME_LIMIT), 18, lowTime ? C.pink : C.teal);
    // 親指ゾーン: 迷い時間のゲージ
    if (phase === 'decide' && !finished) {
      var lim = DECIDE[Math.min(round, DECIDE.length - 1)];
      var r = Math.max(0, 1 - phT / lim);
      game.draw.rect(W / 2 - 240, H * 0.86, 480, 22, C.ink, 0.6);
      game.draw.rect(W / 2 - 240, H * 0.86, 480 * r, 22, r < 0.3 ? C.pink : C.gold);
    }
    for (var i = 0; i < NEEDED; i++) game.draw.sprite(PARCEL_ICON, { t: i < picked ? C.gold : C.grid, b: i < picked ? C.pink : C.ink }, W / 2 - 240 + i * 120, H * 0.91, 12, { anchor: 'center' });
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (boxes === undefined) initGame();

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      drawBoxes(t);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.06, 74, C.gold);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.1, 34, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.965, 38, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene(t);
      drawBoxes(t);
      game.draw.rect(0, H * 0.34, W, H * 0.28, C.ink, 0.82);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 96, ok ? C.teal : C.pink);
      txt(picked + ' / ' + NEEDED + '  PERFECT ' + perfects, W / 2, H * 0.47, 44, C.white);
      if (ok) {
        txt('SCORE ' + score, W / 2, H * 0.53, 48, C.gold);
        if (score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.58, 44, C.teal);
        else txt('BEST ' + (game.best || 0), W / 2, H * 0.58, 36, C.white);
      } else {
        txt('あと' + (NEEDED - picked) + '個!', W / 2, H * 0.53, 52, C.gold);
        txt('BEST ' + (game.best || 0), W / 2, H * 0.58, 36, C.white);
      }
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) { game.audio.play('se_success', 0.6); game.end.success(score, { parcels: picked, perfect: perfects }); }
        else { game.audio.play('se_failure', 0.6); game.end.failure({ parcels: picked, perfect: perfects }); }
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      phT += dt;
      if (hitStop <= 0) {
        if (ok) game.feedback.good(W / 2, H * 0.3, { text: 'CLEAR', color: C.teal, count: 28 });
        else game.feedback.bad(W / 2, H * 0.3, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS' });
        done = true; endWait = 0.9;
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.4);
    } else if (!finished) {
      timeLeft -= dt;
      stepRound(dt, true);
      if (!finished && timeLeft <= 0) { timeLeft = 0; finished = true; ok = false; hitStop = 0.5; opened = right; phase = 'open'; phT = 0; }
    }

    drawScene(t);
    drawBoxes(t);
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.24, 96, C.gold);
  });

  function music() {
    game.audio.melody([['E4', 0.5], ['E4', 0.5], ['G4', 0.5], ['A4', 0.5], ['B4', 1], ['A4', 0.5], ['G4', 0.5], ['E4', 1]], { tempo: 150, wave: 'square', volume: 0.04, loop: true, bass: true });
  }
  game.onStart(function() {
    music();
    state = S.ATTRACT;
    initGame();
  });
})(game);

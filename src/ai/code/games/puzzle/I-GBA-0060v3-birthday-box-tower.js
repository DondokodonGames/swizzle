// I-GBA-0060v3-birthday-box-tower.js
// 重ね箱タワー — 大小バラバラのプレゼント箱を、大きい順に下から積んで倒さず1本の塔にする
// 操作: 床に並んだ箱の中から一番大きい箱をタップ → 箱が風船で浮かんで塔の上を左右に揺れる → もう一度タップで風船を割って落とす。下の箱からはみ出すと崩れる
// 終わり: 3本の塔を25秒以内に積み上げればCLEAR。大きい順を間違える/崩すたびにハートを1つ失い、3つ失う/時間切れでGAME OVER
// @mechanic: stack
// @theme: birthday_nesting_box_tower
// 世界観: 誕生日会の居間で、とんがり帽子の主役の子が、もらった大小の重ね箱を風船で吊って大きい順に下から積み、倒れない1本の塔にしていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 積んだ箱の数・PERFECT数・スコア
// スタイル: MODERN AD-GAME

(function (game) {
  var STYLE = { bg: ['#ffe0ec', '#ffc7d9', '#b8e4ff'], main: ['#ff3b5c', '#2f80ff', '#ffcc00'], accent: ['#18c96a', '#9b4dff'] };
  var W = game.canvas.width;
  var H = game.canvas.height;
  var PINK = STYLE.bg[0], ROSE = STYLE.bg[1], SKY = STYLE.bg[2];
  var RED = STYLE.main[0], BLUE = STYLE.main[1], YELLOW = STYLE.main[2];
  var GREEN = STYLE.accent[0], PURPLE = STYLE.accent[1];
  var INK = '#1d1430', WHITE = '#ffffff', WOOD = '#d98a4a';

  var TITLE = 'GIFT TOWER';
  var TIME_LIMIT = 25;
  var HEARTS = 3;
  var BASE_Y = H * 0.66, TABLE_W = 640;
  var FLOOR_Y = H * 0.855, FLOOR_SCALE = 0.5;
  var TOWERS = [
    { sizes: [340, 260, 190], order: [1, 0, 2], speed: 2.3 },
    { sizes: [330, 275, 220, 170], order: [2, 0, 3, 1], speed: 2.9 },
    { sizes: [310, 275, 240, 205], order: [1, 3, 0, 2], speed: 3.5 },
  ];
  var COLS = [RED, BLUE, YELLOW, GREEN, PURPLE];
  var AMP = 270;

  var KID = [
    ['....y....', '...yyy...', '..yyyyy..', '..sssss..', '..sesess.', '..sssss..', '...sms...', '.ccccccc.', 's.ccccc.s', '..ccccc..', '..cc.cc..', '..bb.bb..'],
    ['....y....', '...yyy...', '..yyyyy..', '..sssss..', '..sesess.', '..smmms..', 's..sss..s', '.ccccccc.', '..ccccc..', '..ccccc..', '..cc.cc..', '.bb...bb.'],
    ['....y....', '...yyy...', '..yyyyy..', '..sssss..', '..sksks..', '..sssss..', '...sss...', '.ccccccc.', 's.ccccc.s', '..ccccc..', '..cc.cc..', '..bb.bb..'],
  ];
  var KID_PAL = { y: YELLOW, s: '#ffd2a8', e: INK, k: INK, m: '#e8344a', c: PURPLE, b: INK };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var ti, floor, tower, held, phase, phT, swingPh, fallY, fallV, topple, stacked, perfects, hearts, score, timeLeft;
  var ready, halt, over, won, endT, resT, sent, prevBest, mood, moodT, slideOut, wrongBox;

  function cfg() { return TOWERS[Math.min(ti, TOWERS.length - 1)]; }

  function setupTower(i) {
    var c = TOWERS[i];
    floor = [];
    for (var k = 0; k < c.order.length; k++) {
      var si = c.order[k];
      floor.push({ w: c.sizes[si], rank: si, col: COLS[(si + i) % COLS.length], slot: k, wob: 0 });
    }
    tower = []; held = null; phase = 'pick'; phT = 0; swingPh = 0; topple = null; slideOut = 0; wrongBox = null;
  }

  function initGame() {
    ti = 0; setupTower(0);
    stacked = 0; perfects = 0; hearts = HEARTS; score = 0; timeLeft = TIME_LIMIT;
    ready = 0.8; halt = null; over = false; won = false; endT = 0; resT = 0; sent = false; prevBest = game.best || 0;
    mood = 0; moodT = 0;
  }

  function floorPos(b) {
    var n = cfg().order.length;
    return { x: W / 2 + (b.slot - (n - 1) / 2) * (W * 0.8 / n), y: FLOOR_Y };
  }
  function topY() {
    var y = BASE_Y;
    for (var i = 0; i < tower.length; i++) y -= tower[i].w * 0.55;
    return y;
  }
  function heldX() { return W / 2 + Math.sin(swingPh) * AMP; }
  function heldY() { return topY() - 230 - (held ? held.w * 0.55 : 0) / 2; }

  // ── 拾う / 落とす(プレイ・デモ共通) ──
  function pickAt(x, y, vol) {
    var v = vol || 1;
    var hit = null;
    for (var i = 0; i < floor.length; i++) {
      var b = floor[i], p = floorPos(b);
      var hw = b.w * FLOOR_SCALE / 2 + 20, hh = b.w * 0.55 * FLOOR_SCALE / 2 + 30;
      if (Math.abs(x - p.x) < hw && Math.abs(y - (p.y - hh + 30)) < hh + 20) hit = b;
    }
    if (!hit) { game.audio.tone(300, 0.04, { wave: 'sine', volume: 0.04 * v }); return; }
    var biggest = floor[0];
    for (var k = 1; k < floor.length; k++) if (floor[k].w > biggest.w) biggest = floor[k];
    if (hit !== biggest) {
      hit.wob = 0.5; wrongBox = biggest;
      game.audio.tone(160, 0.2, { wave: 'square', volume: 0.08 * v });
      if (state === S.PLAYING) { halt = { t: 0.4, max: 0.4, kind: 'order' }; }
      else game.feedback.bad(floorPos(hit).x, FLOOR_Y - 120, { text: 'MISS', volume: 0.25 });
      return;
    }
    floor.splice(floor.indexOf(hit), 1);
    held = hit; phase = 'rise'; phT = 0.35; swingPh = 0;
    game.audio.play('se_jump', 0.3 * v);
    game.fx.burst(floorPos(hit).x, FLOOR_Y - 40, { color: hit.col, count: 8, speed: 220 });
  }

  function drop(vol) {
    if (phase !== 'swing') return;
    phase = 'fall'; fallY = heldY(); fallV = 0;
    held.x = heldX() - W / 2;
    game.audio.tone(1200, 0.06, { wave: 'square', volume: 0.08 * (vol || 1), slide: -900 });
    game.fx.burst(heldX(), fallY - held.w * 0.3 - 120, { color: WHITE, count: 10, speed: 300 });
  }

  function land(vol) {
    var v = vol || 1;
    var below = tower.length ? tower[tower.length - 1] : { w: TABLE_W, x: 0 };
    var dx = held.x - below.x;
    if (Math.abs(dx) > below.w / 2) {
      topple = { b: held, dir: dx > 0 ? 1 : -1, t: 0, y: topY() - held.w * 0.55 / 2 };
      if (state === S.PLAYING) halt = { t: 0.45, max: 0.45, kind: 'topple' };
      else { game.feedback.bad(W / 2 + held.x, topple.y - 80, { text: 'MISS', volume: 0.25 }); }
      phase = 'toppled';
      return;
    }
    tower.push(held);
    var perfect = Math.abs(dx) < 16;
    stacked++;
    if (perfect) perfects++;
    if (state === S.PLAYING) score += perfect ? 200 : 100;
    game.feedback.good(W / 2 + held.x, topY() - 30, { text: perfect ? 'PERFECT' : '+100', color: perfect ? YELLOW : GREEN, size: perfect ? 76 : 60, count: 14, volume: 0.5 * v });
    game.fx.shake(4, 0.12);
    held = null; mood = 1; moodT = 0.5;
    if (floor.length === 0) {
      phase = 'done'; phT = 1.0;
      if (state === S.PLAYING) {
        score += 300;
        game.fx.popup((ti + 1) + ' / ' + TOWERS.length, W / 2, H * 0.24, { color: WHITE, size: 90 });
        game.audio.play('se_milestone', 0.45);
      }
    } else phase = 'pick';
  }

  function afterHalt(kind) {
    hearts--; mood = 2; moodT = 0.7;
    if (kind === 'order') {
      game.feedback.bad(floorPos(wrongBox).x, FLOOR_Y - 140, { text: 'MISS' });
    } else {
      game.feedback.bad(W / 2 + topple.b.x, topple.y - 100, { text: 'MISS' });
      game.audio.play('se_break', 0.35);
    }
    if (hearts <= 0) { finish(false); return; }
    if (kind === 'topple') {
      floor.push(topple.b); topple = null;
      held = null; phase = 'pick';
    }
    wrongBox = null;
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.4;
    if (ok) score += Math.floor(timeLeft * 30) + hearts * 100;
    mood = ok ? 1 : 2; moodT = 9;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
    if (ok) for (var i = 0; i < 7; i++) game.fx.burst(W * (0.08 + i * 0.14), H * (0.2 + (i % 3) * 0.1), { color: COLS[i % 5], count: 18, speed: 460 });
  }

  function sendEnd() {
    if (sent) return;
    sent = true;
    var stats = { boxes: stacked, perfect: perfects, towers: Math.min(ti, TOWERS.length), hearts: hearts };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // ── 入力 ──
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); sendEnd(); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || halt || ready > 0) { game.audio.play('se_tap', 0.05); return; }
    if (phase === 'pick') pickAt(x, y, 1);
    else if (phase === 'swing') drop(1);
    else game.audio.tone(250, 0.03, { wave: 'sine', volume: 0.03 });
  });

  // ── 描画(太い縁取り・大きいアイコン) ──
  function boxDraw(cx, bottomY, w, col, scale, hl) {
    var bw = w * scale, bh = w * 0.55 * scale, o = Math.max(4, 10 * scale);
    var x = cx - bw / 2, y = bottomY - bh;
    game.draw.rect(x - o, y - o, bw + o * 2, bh + o * 2, INK);
    game.draw.rect(x, y, bw, bh, hl ? WHITE : col);
    game.draw.rect(x, y, bw, bh * 0.25, WHITE, 0.25);
    game.draw.rect(cx - bw * 0.07, y, bw * 0.14, bh, hl ? col : WHITE);
    game.draw.rect(x, y + bh * 0.42, bw, bh * 0.14, hl ? col : WHITE, 0.85);
    game.draw.circle(cx - bw * 0.1, y - 4, bw * 0.08, WHITE);
    game.draw.circle(cx + bw * 0.1, y - 4, bw * 0.08, WHITE);
  }

  function drawRoom() {
    game.draw.gradient(0, H, [[0, PINK], [0.5, ROSE], [0.7, ROSE], [0.7, '#f7a8c0'], [1, '#f39ab6']]);
    // 遠景: 窓・壁の風船・旗の飾り
    game.draw.rect(W * 0.62, H * 0.17, 300, 260, INK);
    game.draw.rect(W * 0.62 + 10, H * 0.17 + 10, 280, 240, SKY);
    game.draw.rect(W * 0.62 + 145, H * 0.17, 10, 260, INK);
    for (var f = 0; f < 12; f++) {
      var fx = f * 95 + 20, fy = H * 0.13 + Math.sin(f * 0.8) * 16;
      game.draw.circle(fx, fy, 22, COLS[f % 5]);
      game.draw.circle(fx, fy, 22, WHITE, 0.15);
    }
    game.draw.line(0, H * 0.13, W, H * 0.13, INK, 4);
    for (var b = 0; b < 3; b++) {
      var bx = W * 0.08 + b * 70, by = H * 0.3 + Math.sin(game.time.elapsed * 1.5 + b) * 14;
      game.draw.line(bx, by + 40, bx + 10, by + 200, INK, 3);
      game.draw.circle(bx, by, 40, COLS[(b + 2) % 5]);
      game.draw.circle(bx - 12, by - 12, 10, WHITE, 0.6);
    }
    // テーブル(塔の土台)
    game.draw.rect(W / 2 - TABLE_W / 2 - 10, BASE_Y - 10, TABLE_W + 20, 50, INK);
    game.draw.rect(W / 2 - TABLE_W / 2, BASE_Y, TABLE_W, 30, WOOD);
    game.draw.rect(W / 2 - TABLE_W / 2 + 40, BASE_Y + 40, 24, H * 0.72 - BASE_Y, INK);
    game.draw.rect(W / 2 + TABLE_W / 2 - 64, BASE_Y + 40, 24, H * 0.72 - BASE_Y, INK);
    game.draw.rect(0, H * 0.75, W, 10, '#e07898');
  }

  function drawTower(slide) {
    var y = BASE_Y;
    for (var i = 0; i < tower.length; i++) {
      var b = tower[i];
      boxDraw(W / 2 + b.x + slide, y, b.w, b.col, 1, 0);
      y -= b.w * 0.55;
    }
  }

  function drawHeld() {
    if (!held) return;
    var x, by;
    if (phase === 'rise') {
      var p = floorPos(held), k = 1 - phT / 0.35;
      x = p.x + (W / 2 - p.x) * k; by = FLOOR_Y + (heldY() + held.w * 0.55 / 2 - FLOOR_Y) * k;
    } else if (phase === 'fall') {
      x = W / 2 + held.x; by = fallY + held.w * 0.55 / 2;
    } else {
      x = heldX(); by = heldY() + held.w * 0.55 / 2;
    }
    var sc = phase === 'rise' ? FLOOR_SCALE + (1 - FLOOR_SCALE) * (1 - phT / 0.35) : 1;
    if (phase !== 'fall') {
      // 風船と紐
      var bTop = by - held.w * 0.55 * sc;
      game.draw.line(x, bTop - 10, x + Math.sin(game.time.elapsed * 3) * 10, bTop - 110, INK, 4);
      game.draw.circle(x, bTop - 160, 62, INK);
      game.draw.circle(x, bTop - 160, 54, RED);
      game.draw.circle(x - 18, bTop - 180, 14, WHITE, 0.7);
      // 落ちる位置の予告線
      if (phase === 'swing') {
        for (var d = bTop + held.w * 0.55; d < topY(); d += 30) game.draw.rect(x - 3, d, 6, 16, INK, 0.35);
      }
    }
    boxDraw(x, by, held.w, held.col, sc, 0);
  }

  function drawTopple(hl) {
    if (!topple) return;
    var b = topple.b;
    var ox = topple.dir * Math.min(1, topple.t * 2) * 120;
    var oy = topple.t > 0.3 ? (topple.t - 0.3) * (topple.t - 0.3) * 3000 : 0;
    var sc = 1 + hl * 0.2;
    if (hl) game.draw.circle(W / 2 + b.x + ox, topple.y + oy, b.w * 0.7, WHITE, hl * 0.7);
    boxDraw(W / 2 + b.x + ox, topple.y + oy + b.w * 0.55 / 2, b.w, b.col, sc, hl > 0.5);
  }

  function drawFloor(hl) {
    // 親指ゾーン: 床に並んだ箱(押せる物は揺れる)
    game.draw.rect(0, H * 0.78, W, H * 0.22, '#ffb3c9');
    for (var i = 0; i < floor.length; i++) {
      var b = floor[i], p = floorPos(b);
      var bounce = phase === 'pick' ? Math.abs(Math.sin(game.time.elapsed * 4 + i)) * 10 : 0;
      var shake = b.wob > 0 ? Math.sin(game.time.elapsed * 60) * 14 : 0;
      var light = hl && b === wrongBox;
      if (light) game.draw.circle(p.x, p.y - 50, b.w * 0.42, WHITE, 0.8);
      boxDraw(p.x + shake, p.y - bounce, b.w, b.col, FLOOR_SCALE * (light ? 1.2 : 1), light);
    }
  }

  function drawKid() {
    var fr = moodT > 0 ? (mood === 2 ? 2 : 1) : 0;
    var hop = moodT > 0 && mood === 1 ? -Math.abs(Math.sin(game.time.elapsed * 14)) * 30 : Math.sin(game.time.elapsed * 3) * 4;
    game.draw.sprite(KID[fr], KID_PAL, W * 0.12, H * 0.635 + hop, 18, { anchor: 'center' });
  }

  function big(s, x, y, sz, col) {
    var o = Math.max(4, sz / 12);
    game.draw.text(s, x - o, y, { size: sz, color: INK, bold: true, align: 'center' });
    game.draw.text(s, x + o, y, { size: sz, color: INK, bold: true, align: 'center' });
    game.draw.text(s, x, y - o, { size: sz, color: INK, bold: true, align: 'center' });
    game.draw.text(s, x, y + o, { size: sz, color: INK, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  function drawHud() {
    for (var t = 0; t < TOWERS.length; t++) boxDraw(70 + t * 80, 112, 120, t < ti ? COLS[t] : '#e8c0d0', 0.45, 0);
    big(String(score), W / 2, 92, 66, WHITE);
    for (var h = 0; h < HEARTS; h++) {
      var hx = W - 80 - h * 84, c = h < hearts ? RED : '#e8c0d0';
      game.draw.circle(hx - 15, 84, 20, c); game.draw.circle(hx + 15, 84, 20, c); game.draw.circle(hx, 104, 18, c);
    }
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(56, 172, W - 112, 30, INK);
    game.draw.rect(62, 178, (W - 124) * fr, 18, timeLeft < 5 && Math.floor(game.time.elapsed * 6) % 2 === 0 ? RED : GREEN);
  }

  // ── ATTRACT デモ: 一番大きい箱→真ん中で落としてPERFECT / 次は端で落として崩れる ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: 0, step: 0, prev: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.0;
    if (cyc < dt || demo.t <= dt) { ti = 0; setupTower(0); demo.step = 0; moodT = 0; }
    var tx = demo.gx, ty = demo.gy;
    if (phase === 'pick' && demo.step % 2 === 0) {
      var big1 = floor[0];
      for (var i = 1; i < floor.length; i++) if (floor[i].w > big1.w) big1 = floor[i];
      var p = floorPos(big1);
      tx = p.x; ty = p.y - 40;
      if (Math.hypot(demo.gx - tx, demo.gy - ty) < 20 && cyc > 0.4 + demo.step * 0.6) { demo.press = 0.12; pickAt(tx, ty, 0.35); demo.step++; }
    } else if (phase === 'swing') {
      tx = W / 2; ty = H * 0.45;
      var hx = heldX(), wantCenter = demo.step === 1, sn = Math.sin(swingPh);
      var ok = wantCenter ? swingPh > 2.5 && demo.prev > 0 && sn <= 0 : Math.abs(hx - W / 2) > AMP * 0.93 && swingPh > 1.0;
      demo.prev = sn;
      if (ok) { demo.press = 0.12; drop(0.35); demo.step++; }
    }
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 8);
    demo.gy += (ty - demo.gy) * Math.min(1, dt * 8);
    if (demo.press > 0) demo.press -= dt;
  }

  function tick(dt, vol) {
    if (phase === 'rise') { phT -= dt; if (phT <= 0) phase = 'swing'; }
    else if (phase === 'swing') swingPh += dt * cfg().speed;
    else if (phase === 'fall') {
      fallV += 2600 * dt; fallY += fallV * dt;
      if (fallY + held.w * 0.55 / 2 >= topY()) land(vol);
    }
    if (topple) topple.t += dt * (halt ? 0.25 : 1);
    if (state !== S.PLAYING && topple && topple.t > 1.2) topple = null;
    for (var i = 0; i < floor.length; i++) if (floor[i].wob > 0) floor[i].wob -= dt;
    if (moodT > 0) moodT -= dt;
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      tick(dt, 0.35);
      drawRoom();
      drawTower(0);
      drawTopple(0);
      drawHeld();
      drawKid();
      drawFloor(0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 15 });
      big(TITLE, W / 2, H * 0.06, 104, YELLOW);
      big('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.1, 42, WHITE);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) big('► 100円 投入 ◄', W / 2, H * 0.965, 46, YELLOW);
      else big('INSERT COIN', W / 2, H * 0.965, 40, WHITE);
      return;
    }

    if (state === S.RESULT) {
      resT += dt;
      if (resT > 1.1) sendEnd();
      if (moodT > 0) moodT -= dt;
      drawRoom();
      drawTower(0);
      drawKid();
      game.draw.rect(50, H * 0.15, W - 100, H * 0.25, INK, 0.8);
      big(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.2, 110, won ? YELLOW : RED);
      big('SCORE ' + score, W / 2, H * 0.26, 60, WHITE);
      big(stacked + ' / 11   PERFECT x' + perfects, W / 2, H * 0.305, 44, SKY);
      if (won && score > prevBest) big('NEW RECORD', W / 2, H * 0.35, 62, YELLOW);
      else big('BEST ' + Math.max(prevBest, score), W / 2, H * 0.35, 42, WHITE);
      if (!won) big('あと' + (11 - stacked) + '個!', W / 2, H * 0.45, 70, RED);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) big('TAP TO CONTINUE', W / 2, H * 0.965, 40, WHITE);
      return;
    }

    // ── PLAYING ──
    var hl = 0;
    if (over) {
      endT -= dt;
      if (moodT > 0) moodT -= dt;
      if (endT <= 0) { state = S.RESULT; resT = 0; }
    } else if (halt) {
      halt.t -= dt;
      hl = Math.max(0, halt.t / halt.max);
      if (topple) topple.t += dt * 0.25;
      if (halt.t <= 0) { var kind = halt.kind; halt = null; afterHalt(kind); }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_powerup', 0.3);
    } else {
      timeLeft -= dt;
      if (phase === 'done') {
        phT -= dt;
        slideOut = (1 - Math.max(0, phT)) * W;
        if (phT <= 0) {
          ti++;
          if (ti >= TOWERS.length) finish(true);
          else setupTower(ti);
        }
      } else tick(dt, 1);
      if (!over && timeLeft <= 0) { timeLeft = 0; game.feedback.bad(W / 2, H * 0.4, { text: 'TIME UP' }); finish(false); }
    }

    drawRoom();
    drawTower(phase === 'done' ? slideOut : 0);
    drawTopple(halt && halt.kind === 'topple' ? hl : 0);
    drawHeld();
    drawKid();
    drawFloor(halt && halt.kind === 'order' ? hl : 0);
    drawHud();
    if (ti === 0 && stacked === 0 && phase === 'pick' && ready <= 0 && !halt) {
      var bg = floor[0];
      for (var i = 1; i < floor.length; i++) if (floor[i].w > bg.w) bg = floor[i];
      var fp = floorPos(bg);
      game.draw.hand(fp.x, fp.y - 40, { press: Math.floor(game.time.elapsed * 3) % 2 === 0, scale: 13, alpha: 0.6 });
    }
    if (ready > 0) big(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 130, YELLOW);
  });

  game.onStart(function () {
    game.audio.melody([
      ['E5', 0.5], ['C5', 0.5], ['G5', 0.5], ['E5', 0.5], ['F5', 0.25], ['E5', 0.25], ['D5', 0.5], ['C5', 1],
      ['A4', 0.5], ['C5', 0.5], ['D5', 0.5], ['G4', 0.5], ['C5', 1.5], ['R', 0.5],
    ], { tempo: 150, wave: 'square', volume: 0.05, loop: true, bass: [['C3', 1], ['G2', 1], ['C3', 1], ['G2', 1], ['D3', 1], ['G2', 1], ['C3', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

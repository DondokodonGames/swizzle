// I-Switch-0010v2-schoolyard-otedama-swap.js
// 校庭のお手玉まわし — 左右の手に交互に落ちてくるお手玉を、落ちてきた側をタップして受けては反対の手へ投げ上げ続ける
// 操作: 画面の左半分をタップすると少女の左手、右半分で右手が動く。お手玉が手のひらの輪に重なった瞬間に、その側をタップすると受けて反対の手へ投げ上げる。お手玉の来ていない側をタップすると手が空振りし(連続が切れて一瞬その手が止まる)、受け損ねたお手玉は地面に落ちる。友だちが途中で2個目・3個目を投げ入れてくる
// 終わり: 15秒以内に20回受ければCLEAR。お手玉を3回落とす/時間切れでGAME OVER
// @mechanic: alternate_tap
// @theme: schoolyard_otedama_swap
// 世界観: 小学校の休み時間の校庭で、お手玉名人の少女が、友だちが次々投げ入れる色違いのお手玉を左右の手で交互に受けては投げ上げ、輪になった級友に見せる
// 残るもの: 正誤(CLEAR/GAME OVER) + 受けた回数・PERFECT数・最大連続・落とした数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: パステル、白縁の丸い形、上の画面に情報・下の画面に遊び(2画面の名残)
  var STYLE = { bg: ['#fff4fa', '#d8f0ff', '#c8f0d8'], main: ['#ff9ec4', '#8ec8ff', '#ffd27a'], accent: ['#ffffff', '#5a4a7a'] };
  var C = {
    bg: STYLE.bg[0], sky: STYLE.bg[1], grass: STYLE.bg[2], pink: STYLE.main[0], blue: STYLE.main[1], yellow: STYLE.main[2],
    white: STYLE.accent[0], ink: STYLE.accent[1], mint: '#8ee8c0', red: '#ff6a7a', skin: '#ffd8b8', dirt: '#e8d0b0',
  };

  var GAME_TITLE = 'OTEDAMA SWAP';
  var TIME_LIMIT = 15;
  var GOAL = 20;
  var LIVES = 3;
  var SPLIT_Y = 470;
  var HAND_Y = 1250;
  var HAND_X = [330, 750];
  var PEAK = 600;
  var MIN_GAP = 0.32;
  var BAG_COLORS = ['#ff9ec4', '#8ec8ff', '#ffd27a'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var bags, now, catches, perfects, combo, maxCombo, drops, lives, score, readyT, stopT, focus, over, won, outroT, stun, swing,
    nextAdd, pending, milestone, mood;

  function initGame() {
    bags = []; now = 0; catches = 0; perfects = 0; combo = 0; maxCombo = 0; drops = 0; lives = LIVES; score = 0;
    readyT = 0.8; stopT = 0; focus = null; over = false; won = false; outroT = 0; stun = [0, 0]; swing = [0, 0];
    nextAdd = 3; pending = []; milestone = false; mood = 0;
    launch(-1, 1, 0.9, 0);
  }

  function flightT() { return bags.length >= 3 ? 1.1 : (bags.length === 2 ? 1.0 : 0.95); }

  // 手 to へ届く時刻を、同じ手に届く他のお手玉から MIN_GAP 以上(反対の手とも半分以上)ずらして決める
  function arrivalFor(to, want, self) {
    var arr = want, moved = true, guard = 0;
    while (moved && guard++ < 6) {
      moved = false;
      for (var i = 0; i < bags.length; i++) {
        var b = bags[i];
        if (b === self || b.dropped) continue;
        var gap = b.to === to ? MIN_GAP : MIN_GAP / 2;
        if (Math.abs(b.t1 - arr) < gap) { arr = b.t1 + gap; moved = true; }
      }
    }
    return arr;
  }

  // from: -1 = 横の友だち(画面外)から、0/1 = 手から。to: 0/1
  function launch(from, to, dur, colorIdx, bag) {
    var t1 = arrivalFor(to, now + dur, bag);
    var b = bag || { color: BAG_COLORS[colorIdx % 3], dropped: false, spin: 0 };
    b.from = from; b.to = to; b.t0 = now; b.t1 = t1; b.dropped = false; b.fallY = 0; b.flash = 0;
    b.x0 = from < 0 ? (to === 0 ? -60 : W + 60) : HAND_X[from];
    b.y0 = from < 0 ? HAND_Y - 260 : HAND_Y;
    if (!bag) bags.push(b);
    return b;
  }

  function bagPos(b) {
    if (b.dropped) return { x: b.dx, y: b.fallY };
    var p = (now - b.t0) / (b.t1 - b.t0);
    var x = b.x0 + (HAND_X[b.to] - b.x0) * p;
    var lin = b.y0 + (HAND_Y - b.y0) * p;
    var y = lin - 4 * PEAK * p * (1 - p);
    return { x: x, y: y, p: p };
  }

  // ---- 手をタップ(本番もデモも同じ処理) ----
  function handTap(h, demo) {
    swing[h] = 0.18;
    if (stun[h] > 0) { game.audio.tone(180, 0.05, { wave: 'square', volume: 0.04 }); return; }
    var best = null, bestErr = 9;
    for (var i = 0; i < bags.length; i++) {
      var b = bags[i];
      if (b.dropped || b.to !== h) continue;
      var err = now - b.t1;
      if (err > -0.13 && err < 0.13 && Math.abs(err) < Math.abs(bestErr)) { best = b; bestErr = err; }
    }
    if (!best) {
      // 空振り: 連続が切れて、その手が一瞬止まる
      stun[h] = 0.22; combo = 0; mood = -0.6;
      game.feedback.bad(HAND_X[h], HAND_Y - 40, { text: null, shake: demo ? 3 : 6, sound: 'se_bad', volume: 0.25 });
      return;
    }
    var perfect = Math.abs(bestErr) < 0.045;
    combo++; maxCombo = Math.max(maxCombo, combo); mood = 0.5;
    if (!demo) {
      catches++;
      if (perfect) perfects++;
      score += Math.round((perfect ? 100 : 50) * (1 + Math.min(10, combo) / 10));
    }
    game.feedback.good(HAND_X[h], HAND_Y - 90, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.pink : C.blue, size: perfect ? 50 : 40, sound: perfect ? 'se_coin' : 'se_good', volume: 0.25, count: perfect ? 12 : 6 });
    game.audio.tone(440 + Math.min(12, combo) * 40, 0.06, { wave: 'triangle', volume: 0.05 });
    launch(h, 1 - h, flightT(), 0, best);
    if (!demo && catches === 10 && !milestone) {
      milestone = true;
      game.fx.popup('10 / ' + GOAL, W / 2, SPLIT_Y + 200, { color: C.pink, size: 70 });
      game.audio.play('se_milestone', 0.45);
    }
  }

  // ---- 進行(本番もデモも同じ)。戻り値: 落ちたお手玉 or null ----
  function stepWorld(dt, demo) {
    now += dt;
    for (var h = 0; h < 2; h++) { if (stun[h] > 0) stun[h] -= dt; if (swing[h] > 0) swing[h] -= dt; }
    // 友だちの投げ入れ(2個目・3個目)
    var c = demo ? demoCatches : catches;
    if (bags.length < 3 && pending.length === 0 && c >= nextAdd) {
      pending.push(0.5);
      nextAdd = nextAdd === 3 ? 8 : 999;
      game.audio.play('se_powerup', 0.3);
    }
    for (var q = pending.length - 1; q >= 0; q--) {
      pending[q] -= dt;
      if (pending[q] <= 0) {
        pending.splice(q, 1);
        var cnt = [0, 0];
        for (var k = 0; k < bags.length; k++) if (!bags[k].dropped) cnt[bags[k].to]++;
        launch(-1, cnt[0] <= cnt[1] ? 0 : 1, 1.0, bags.length);
      }
    }
    var dropped = null;
    for (var i = 0; i < bags.length; i++) {
      var b = bags[i];
      if (b.flash > 0) b.flash -= dt;
      b.spin += dt * 9;
      if (b.dropped) {
        b.vy += 2600 * dt; b.fallY = Math.min(H * 0.8, b.fallY + b.vy * dt);
        b.wait -= dt;
        if (b.wait <= 0) { launch(-1, b.dx < W / 2 ? 0 : 1, 1.0, 0, b); game.audio.tone(600, 0.06, { wave: 'triangle', volume: 0.05 }); }
        continue;
      }
      if (now - b.t1 > 0.13) {
        var p = bagPos(b);
        b.dropped = true; b.dx = p.x; b.fallY = p.y; b.vy = 300; b.wait = 1.1;
        dropped = b;
      }
    }
    return dropped;
  }

  function onDrop(b, demo) {
    focus = b; b.flash = 0.6; stopT = 0.4; combo = 0; mood = -1;
    game.feedback.bad(b.dx, HAND_Y + 40, { text: 'MISS', shake: demo ? 5 : 12 });
    game.audio.play('se_break', 0.3);
    if (!demo) {
      drops++; lives--;
      if (lives <= 0) finish(false);
    }
  }

  function finish(ok) {
    over = true; won = ok; outroT = 1.5;
    game.audio.stopBgm();
    if (ok) {
      score += Math.max(0, Math.round((TIME_LIMIT - now) * 60)) + lives * 100;
      mood = 2;
      game.audio.play('se_success', 0.55);
      game.fx.burst(W / 2, HAND_Y - 300, { color: C.pink, count: 30, speed: 460 });
      game.fx.burst(W / 2, HAND_Y - 300, { color: C.yellow, count: 24, speed: 380 });
      game.fx.flash(C.white, 0.25);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    if (over || readyT > 0 || stopT > 0) { game.audio.play('se_tap', 0.1); return; }
    handTap(x < W / 2 ? 0 : 1, false);
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  var GIRL_IDLE = ['..hh..hh..', '.hhhhhhhh.', 'hhffffffhh', '.hfeffefh.', '..ffmmff..', '...ffff...', '..pppppp..', '.pppwwppp.', '..pppppp..', '..ssssss..', '..ssssss..', '...l..l...', '...k..k...'];
  var GIRL_UP = ['..hh..hh..', '.hhhhhhhh.', 'hhffffffhh', '.hfeffefh.', '..ffooff..', '...ffff...', '..pppppp..', '.pppwwppp.', '..pppppp..', '..ssssss..', '..ssssss..', '..l....l..', '..k....k..'];
  var GIRL_OOPS = ['..hh..hh..', '.hhhhhhhh.', 'hhffffffhh', '.hf-ff-fh.', '..ffooff..', '...ffff...', '..pppppp..', '.pppwwppp.', '..pppppp..', '..ssssss..', '..ssssss..', '...l..l...', '..kk..kk..'];
  var GIRL_PAL = { h: '#6a4a3a', f: C.skin, e: C.ink, '-': C.ink, m: C.red, o: C.red, p: C.white, w: C.pink, s: '#7a8ad8', l: C.skin, k: C.ink };
  var BAG = ['.dddd.', 'dcddcd', 'dddddd', 'dcddcd', '.dddd.'];
  var FRIEND = ['.hh.', 'hffh', '.cc.', 'cccc', '.l.l'];

  function drawTopScreen() {
    // 上画面(情報): 白縁の丸い枠
    game.draw.rect(0, 0, W, SPLIT_Y, C.ink);
    game.draw.gradient(30, SPLIT_Y - 30, [[0, '#fff0f8'], [1, '#f0e8ff']]);
    game.draw.rect(30, 30, W - 60, 6, C.white);
  }

  function drawField() {
    var t = game.time.elapsed;
    // ヒンジ
    game.draw.rect(0, SPLIT_Y - 20, W, 40, '#d8cce8');
    for (var i = 0; i < 4; i++) game.draw.circle(160 + i * 250, SPLIT_Y, 10, C.white);
    // 下画面(遊び): 校庭
    game.draw.gradient(SPLIT_Y + 20, H, [[0, C.sky], [0.55, '#eaf8ff'], [0.56, C.grass], [1, '#a8e0b8']]);
    // 遠景: 校舎と雲
    game.draw.rect(80, 900, 920, 220, '#fff8f0');
    for (var w = 0; w < 6; w++) game.draw.rect(120 + w * 150, 940, 90, 60, C.blue);
    game.draw.rect(480, 820, 120, 100, '#fff8f0');
    game.draw.circle(540, 860, 34, C.white);
    for (var c = 0; c < 3; c++) {
      var cx = ((c * 400 + t * 20) % (W + 300)) - 150;
      game.draw.circle(cx, 620 + c * 60, 50, C.white, 0.9);
      game.draw.circle(cx + 50, 610 + c * 60, 40, C.white, 0.9);
    }
    game.draw.rect(0, 1120, W, 10, C.white, 0.7);
    // 輪になって見ている級友(左右)
    for (var f = 0; f < 4; f++) {
      var fx = f < 2 ? 70 + f * 90 : W - 70 - (f - 2) * 90;
      var bob = mood > 0.3 ? Math.abs(Math.sin(t * 10 + f)) * 16 : Math.sin(t * 3 + f) * 3;
      game.draw.sprite(FRIEND, { h: '#5a3a2a', f: C.skin, c: BAG_COLORS[f % 3], l: C.ink }, fx, 1180 - bob, 14, { anchor: 'center' });
    }
  }

  function drawHands() {
    for (var h = 0; h < 2; h++) {
      var x = HAND_X[h];
      var up = swing[h] > 0 ? 30 : 0;
      // 次にこの手へ届くお手玉までの縮む輪(タイミングの予告)
      var soon = null;
      for (var i = 0; i < bags.length; i++) if (!bags[i].dropped && bags[i].to === h && (!soon || bags[i].t1 < soon.t1)) soon = bags[i];
      if (soon) {
        var left = soon.t1 - now;
        if (left < 0.6 && left > -0.13) {
          var rr = 70 + Math.max(0, left) * 260;
          game.draw.circle(x, HAND_Y, rr, soon.color, 0.25);
          game.draw.circle(x, HAND_Y, 70, C.white, Math.abs(left) < 0.05 ? 0.9 : 0.4);
        }
      }
      game.draw.circle(x, HAND_Y + 8 - up, 58, C.white);
      game.draw.circle(x, HAND_Y - up, 50, stun[h] > 0 ? '#e8b8b8' : C.skin);
      game.draw.rect(x - 40, HAND_Y - 20 - up, 80, 12, '#f0c0a0');
    }
  }

  function drawGirl() {
    var t = game.time.elapsed;
    var fr = mood < -0.3 ? GIRL_OOPS : ((swing[0] > 0 || swing[1] > 0) ? GIRL_UP : GIRL_IDLE);
    var hop = mood > 1 ? Math.abs(Math.sin(t * 10)) * 30 : Math.sin(t * 2.5) * 4;
    game.draw.circle(W / 2, 1560, 110, '#98d0a8');
    game.draw.sprite(fr, GIRL_PAL, W / 2, 1420 - hop, 18, { anchor: 'center' });
    // 腕(肩から手のひらへ)
    for (var h = 0; h < 2; h++) {
      var up = swing[h] > 0 ? 30 : 0;
      game.draw.line(W / 2 + (h === 0 ? -70 : 70), 1380 - hop, HAND_X[h], HAND_Y + 40 - up, C.white, 34);
      game.draw.line(W / 2 + (h === 0 ? -70 : 70), 1380 - hop, HAND_X[h], HAND_Y + 40 - up, C.skin, 22);
    }
  }

  function drawBags() {
    for (var i = 0; i < bags.length; i++) {
      var b = bags[i];
      var p = bagPos(b);
      if (b.dropped && b.fallY >= H * 0.8 - 1) { game.draw.sprite(BAG, { d: b.color, c: C.white }, p.x, p.y, 12, { anchor: 'center', alpha: 0.6 }); continue; }
      var hl = focus === b && stopT > 0;
      if (!b.dropped) game.draw.circle(p.x, HAND_Y + 90, 26, C.ink, 0.12);
      if (hl) game.draw.circle(p.x, p.y, 70, C.white, 0.9);
      game.draw.circle(p.x, p.y, hl ? 52 : 40, C.white);
      game.draw.sprite(BAG, { d: b.color, c: C.white }, p.x, p.y, hl ? 16 : 12, { anchor: 'center', flipX: Math.floor(b.spin) % 2 === 0 });
    }
  }

  function drawThumbZone() {
    for (var h = 0; h < 2; h++) {
      var px = h === 0 ? W * 0.25 : W * 0.75, py = H * 0.9;
      var on = swing[h] > 0;
      game.draw.circle(px, py + 8, 104, C.ink, 0.25);
      game.draw.circle(px, py, 104, C.white);
      game.draw.circle(px, py, 90, on ? C.yellow : (h === 0 ? C.pink : C.blue));
      game.draw.circle(px, py, 40, C.skin);
      for (var f = 0; f < 4; f++) game.draw.circle(px - 36 + f * 24, py - 46, 14, C.skin);
    }
  }

  function drawHud() {
    label(catches + ' / ' + GOAL, 250, 130, 76, C.ink);
    label('SCORE ' + score, 250, 220, 40, C.pink);
    if (combo >= 3) label('COMBO ' + combo, 250, 290, 40, C.blue);
    // ライフ(お手玉の残り)
    for (var i = 0; i < LIVES; i++) game.draw.sprite(BAG, { d: i < lives ? BAG_COLORS[i] : '#cccccc', c: C.white }, 640 + i * 110, 110, 14, { anchor: 'center' });
    // 残り時間の縮むバー
    var timeLeft = Math.max(0, 1 - now / TIME_LIMIT);
    game.draw.rect(560, 200, 440, 34, C.white);
    game.draw.rect(566, 206, 428 * timeLeft, 22, timeLeft < 0.25 ? C.red : C.mint);
    // 進捗(24個の点)
    for (var k = 0; k < GOAL; k++) game.draw.circle(110 + k * 37, 390, 12, k < catches ? C.pink : '#e0d8ec');
  }

  function drawScene() {
    drawTopScreen();
    drawField();
    drawGirl();
    drawHands();
    drawBags();
    drawThumbZone();
  }

  // ---- ATTRACT: 実ロジックで少女が受けては投げる。お手玉が増え、最後に1つ落として見せる ----
  var demo = { t: 0, side: 0, press: 0 };
  var demoCatches = 0;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 9;
    if (demo.t <= dt || cyc < dt) { initGame(); readyT = 0; demoCatches = 0; }
    if (demo.press > 0) demo.press -= dt;
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) focus = null; return; }
    for (var i = 0; i < bags.length; i++) {
      var b = bags[i];
      if (b.dropped) continue;
      var err = now - b.t1;
      if (err > -0.02 && err < 0.06 && cyc < 7.2) {
        handTap(b.to, true); demoCatches++; demo.side = b.to; demo.press = 0.15;
        break;
      }
    }
    var d = stepWorld(dt, true);
    if (d) onDrop(d, true);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    mood += (0 - mood) * Math.min(1, dt * 2);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.side === 0 ? W * 0.25 : W * 0.75, H * 0.9, { press: demo.press > 0, scale: 15 });
      label(GAME_TITLE, W / 2, H * 0.078, 92 + Math.sin(t * 3) * 3, C.pink);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 250, 40, C.ink);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, 360, 52, C.blue);
      else label('TAP TO START', W / 2, 360, 46, C.ink);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      drawTopScreen();
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, 140, 96, won ? C.mint : C.red);
      label('SCORE ' + score + '   ' + catches + ' / ' + GOAL, W / 2, 230, 46, C.ink);
      label('PERFECT ' + perfects + '  COMBO ' + maxCombo, W / 2, 300, 38, C.blue);
      if (won && score > game.best) label('NEW RECORD', W / 2, 380, 46, C.pink);
      else label('BEST ' + Math.max(game.best, won ? score : 0), W / 2, 380, 36, C.ink);
      if (!won) label('あと' + Math.max(1, GOAL - catches) + '回!', W / 2, H * 0.4, 64, C.pink);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.5, 40, C.ink);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (stopT > 0) stopT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { catches: catches, perfects: perfects, maxCombo: maxCombo, drops: drops };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_jump', 0.3);
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) focus = null;
    } else {
      var d = stepWorld(dt, false);
      if (d) onDrop(d, false);
      if (!over && catches >= GOAL) finish(true);
      else if (!over && now >= TIME_LIMIT) finish(false);
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 110, C.pink);
    if (over && !won && lives > 0) label('TIME UP', W / 2, H * 0.4, 96, C.red);
    if (over && won) label('FINISH', W / 2, H * 0.4, 100, C.pink);
  });

  game.onStart(function() {
    game.audio.melody([
      ['E5', 0.5], ['G5', 0.5], ['A5', 1], ['G5', 0.5], ['E5', 0.5], ['D5', 1],
      ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 2],
    ], { tempo: 132, wave: 'triangle', volume: 0.05, loop: true, bass: [['A2', 1], ['E3', 1], ['A2', 1], ['G2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

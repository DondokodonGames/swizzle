// I-GBA-0026v2-riverbank-cairn-stack.js
// 河原のケルン積み — 左右に揺れる平石を落とし、重心がずれないよう釣り合いを見て一段ずつ積み足す
// 操作: 頭上で左右に振れている平石を、塔の重心がまっすぐ立つ位置に来た瞬間にタップで落とす
// 終わり: 8個積み上げれば成功。どこかの段で上側の重心が下の石からはみ出す/石が滑り落ちる/時間切れで失敗
// @mechanic: stack
// @theme: riverbank_cairn_balance
// 世界観: 渓流の河原で、石積み職人が形も重さも違う平たい石を一つずつ積み、重心の真上に次の石を置いて倒れない石塔を仕上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 積んだ段数とPERFECT数
// スタイル: 90s HANDHELD COLOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 低彩度・少色、小画面前提の太い形
  var STYLE = { bg: ['#a7b9a6', '#cfd6b4', '#6f8f8a'], main: ['#8b8474', '#a69f8a', '#6b665a'], accent: ['#e2b14c', '#c45a4a'] };
  var C = {
    sky: STYLE.bg[0], haze: STYLE.bg[1], river: STYLE.bg[2], riverHi: '#9cc0bc',
    stone: STYLE.main[0], stoneHi: STYLE.main[1], stoneLo: STYLE.main[2],
    gold: STYLE.accent[0], bad: STYLE.accent[1], good: '#7fb86a', ink: '#2c2b26', pale: '#eef0dc',
  };

  var GAME_TITLE = 'RIVER CAIRN';
  var TIME_LIMIT = 20;
  var NEEDED = 8;
  var MOVER_Y = Math.round(H * 0.172);
  var BASE_Y = 1360;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var cleared = false;

  var stones, falling, mover, placed, perfects, timeLeft, countIn, freezeT, ended, endT;
  var highlight, debris, margin, milestoneDone, reason, nextW, nextH;

  function say(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  var MASON_A = [
    '..hhh...',
    '.hhhhh..',
    '..fff...',
    '..fff...',
    '.bbbbb..',
    'bbbbbbb.',
    'f.bbb.f.',
    '..b.b...',
    '..b.b...',
    '.ss.ss..',
  ];
  var MASON_B = [
    '..hhh...',
    '.hhhhh..',
    '..fff...',
    'f.fff.f.',
    '.bbbbb..',
    '.bbbbb..',
    '..bbb...',
    '..b.b...',
    '.b...b..',
    'ss...ss.',
  ];
  var MASON_PAL = { h: '#d9c089', f: '#e8c9a0', b: '#5d7a8c', s: '#3a3a34' };
  var WAGTAIL = ['..kk....', '.kkwk...', 'kkkkkkkk', '...kk..k', '...w.w..'];
  var WAG_PAL = { k: '#3a3a34', w: '#eef0dc' };

  function pickSize(i) {
    nextW = Math.max(150, 300 - i * 16 + game.random(-30, 30));
    nextH = game.random(56, 76);
  }

  function initGame() {
    stones = [{ x: W / 2, w: 520, h: 90, y: BASE_Y }];
    falling = null;
    mover = { ph: 0, x: W / 2 };
    placed = 0; perfects = 0; timeLeft = TIME_LIMIT; countIn = 0.8; freezeT = 0;
    ended = false; endT = 0; highlight = null; debris = []; margin = 1;
    milestoneDone = false; reason = ''; cleared = false;
    pickSize(0);
  }

  function topStone() { return stones[stones.length - 1]; }

  function moverSpeed() { return 2.1 + placed * 0.22; }
  function moverX(ph) {
    var amp = 280 + placed * 14;
    if (placed >= 5) return W / 2 + amp * (0.72 * Math.sin(ph) + 0.28 * Math.sin(ph * 2.3));
    return W / 2 + amp * Math.sin(ph);
  }

  // 各段で「その段より上の石すべて」の重心が下の石の幅に収まっているかを調べる
  function balanceCheck(list) {
    var worst = 1, badLevel = -1;
    for (var k = list.length - 1; k >= 1; k--) {
      var mass = 0, mx = 0;
      for (var j = k; j < list.length; j++) { var m = list[j].w * list[j].h; mass += m; mx += list[j].x * m; }
      var com = mx / mass;
      var half = list[k - 1].w / 2;
      var room = 1 - Math.abs(com - list[k - 1].x) / half;
      if (room < worst) worst = room;
      if (room < 0.06 && badLevel < 0) badLevel = k;
    }
    return { room: worst, bad: badLevel };
  }

  function dropStone() {
    falling = { x: mover.x, y: MOVER_Y - nextH / 2, w: nextW, h: nextH, vy: 0 };
    game.audio.play('se_jump', 0.35);
  }

  function startCollapse(level) {
    for (var i = level; i < stones.length; i++) {
      var s = stones[i];
      var dir = s.x >= stones[level - 1].x ? 1 : -1;
      debris.push({ x: s.x, y: s.y, w: s.w, h: s.h, vx: dir * game.random(260, 520), vy: game.random(-420, -120) });
    }
    stones.length = level;
  }

  // 着地判定。戻り値: 'perfect' | 'good' | 'slip' | 'topple'
  function land(st) {
    var top = topStone();
    st.y = top.y - st.h;
    var off = Math.abs(st.x - top.x);
    if (off > top.w / 2) {
      debris.push({ x: st.x, y: st.y, w: st.w, h: st.h, vx: (st.x > top.x ? 1 : -1) * 420, vy: -200 });
      highlight = { x: st.x, y: st.y + st.h / 2, w: st.w, h: st.h, t: 0 };
      return 'slip';
    }
    stones.push({ x: st.x, w: st.w, h: st.h, y: st.y });
    var bc = balanceCheck(stones);
    margin = bc.room;
    if (bc.bad > 0) {
      var pivot = stones[bc.bad - 1];
      highlight = { x: pivot.x, y: pivot.y + pivot.h / 2, w: pivot.w, h: pivot.h, t: 0 };
      startCollapse(bc.bad);
      return 'topple';
    }
    return off < 20 ? 'perfect' : 'good';
  }

  function stepFall(dt) {
    if (!falling) return null;
    falling.vy += 3200 * dt;
    falling.y += falling.vy * dt;
    if (falling.y + falling.h >= topStone().y) {
      var st = falling;
      falling = null;
      return land(st);
    }
    return null;
  }

  function stepDebris(dt) {
    for (var i = 0; i < debris.length; i++) {
      var d = debris[i];
      d.vy += 1800 * dt; d.x += d.vx * dt; d.y += d.vy * dt;
    }
  }

  function finish(ok, why) {
    if (ended) return;
    ended = true; cleared = ok; reason = why;
    endT = 1.4;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
  }

  function resolveLanding(res) {
    if (!res) return;
    var t = topStone();
    if (res === 'slip' || res === 'topple') {
      freezeT = 0.5;
      game.audio.play('se_break', 0.45);
      game.feedback.bad(highlight.x, highlight.y, { text: 'MISS', color: C.bad });
      game.fx.shake(14, 0.4);
      finish(false, res);
      return;
    }
    placed++;
    if (res === 'perfect') {
      perfects++;
      game.feedback.good(t.x, t.y, { text: 'PERFECT', color: C.gold });
    } else {
      game.feedback.good(t.x, t.y, { text: 'GOOD', color: C.good });
    }
    if (margin < 0.3) game.audio.tone('C3', 0.25, { wave: 'triangle', volume: 0.12, slide: -40 });
    if (!milestoneDone && placed === 4) {
      milestoneDone = true;
      game.fx.popup('NICE', W / 2, t.y - 90, { color: C.gold, size: 48 });
      game.audio.play('se_milestone', 0.45);
    }
    if (placed >= NEEDED) {
      highlight = { x: t.x, y: t.y + t.h / 2, w: t.w, h: t.h, t: 0 };
      freezeT = 0.35;
      game.fx.burst(t.x, t.y, { color: C.gold, count: 26, speed: 420 });
      finish(true, 'clear');
      return;
    }
    pickSize(placed);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (ended || freezeT > 0) return;
    if (countIn > 0 || falling) {
      game.audio.play('se_tap', 0.15);
      game.fx.popup('…', mover.x, MOVER_Y - 70, { color: C.pale, size: 30 });
      return;
    }
    game.audio.play('se_tap', 0.2);
    dropStone();
  });

  // ---- 描画 ----
  function drawStone(x, y, w, h, tone) {
    var step = 6;
    for (var r = 0; r < h; r += step) {
      var dy = (r + step / 2 - h / 2) / (h / 2);
      var ww = w * Math.sqrt(Math.max(0, 1 - dy * dy * dy * dy));
      var col = r < h * 0.3 ? C.stoneHi : (r > h * 0.72 ? C.stoneLo : (tone || C.stone));
      game.draw.rect(x - ww / 2, y + r, ww, step, col);
    }
    game.draw.rect(x - w * 0.22, y + h * 0.18, w * 0.18, 5, C.pale, 0.35);
  }

  function scenery() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky], [0.55, C.haze], [0.72, C.river], [1, '#4f6e6c']]);
    game.draw.rect(0, 0, W, H, C.pale, 0.03 + 0.03 * Math.sin(t * 1.4));
    for (var i = 0; i < 6; i++) {
      var mx = i * 220 - 40, mh = 120 + (i % 3) * 50;
      for (var r = 0; r < mh; r += 8) {
        var ww = 260 * (r / mh);
        game.draw.rect(mx + 130 - ww / 2, 700 - mh + r, ww, 8, '#8fa596', 0.6);
      }
    }
    for (var k = 0; k < 9; k++) {
      var fx = ((k * 157 + t * 90) % (W + 200)) - 100;
      game.draw.rect(fx, 1470 + (k % 4) * 80, 90, 6, C.riverHi, 0.55);
    }
    game.draw.rect(0, 1400, W, 24, '#b9b39c');
    for (var p = 0; p < 12; p++) game.draw.circle(40 + p * 92, 1412 + (p % 2) * 8, 14, C.stoneLo);
    var wagY = 610 + Math.sin(t * 3) * 6;
    game.draw.sprite(WAGTAIL, WAG_PAL, 900 + Math.sin(t * 0.7) * 30, wagY, 7, { anchor: 'center', flipX: Math.sin(t * 0.7) < 0 });
  }

  function drawCairn() {
    var t = game.time.elapsed;
    var wob = Math.max(0, 0.45 - margin);
    for (var i = 0; i < stones.length; i++) {
      var s = stones[i];
      var jig = i > 0 ? Math.sin(t * 7 + i) * wob * i * 5 : 0;
      drawStone(s.x + jig, s.y, s.w, s.h, i === 0 ? '#7a7466' : null);
    }
    for (var d = 0; d < debris.length; d++) drawStone(debris[d].x, debris[d].y, debris[d].w, debris[d].h);
    // 重心の下げ振り(余裕が減るほど赤く点滅=倒壊予告)
    if (stones.length > 1) {
      var bc = balanceCheck(stones);
      var mass = 0, mx = 0;
      for (var j = 1; j < stones.length; j++) { var m = stones[j].w * stones[j].h; mass += m; mx += stones[j].x * m; }
      var com = mx / mass;
      var warn = bc.room < 0.3;
      var col = warn ? (Math.floor(t * 10) % 2 === 0 ? C.bad : C.pale) : (bc.room < 0.55 ? C.gold : C.good);
      game.draw.line(com, topStone().y - 40, com, BASE_Y + 90, col, 4);
      game.draw.circle(com, BASE_Y + 94, 12, col);
    }
  }

  function drawMover() {
    if (falling) { drawStone(falling.x, falling.y, falling.w, falling.h); return; }
    if (ended) return;
    var top = topStone();
    for (var y = MOVER_Y + 50; y < top.y - 10; y += 34) game.draw.rect(mover.x - 2, y, 4, 16, C.pale, 0.55);
    game.draw.line(mover.x, 240, mover.x, MOVER_Y - nextH / 2, '#6b5a3a', 4);
    drawStone(mover.x, MOVER_Y - nextH / 2, nextW, nextH);
    var aligned = Math.abs(mover.x - top.x) < 20;
    if (aligned) game.draw.circle(mover.x, MOVER_Y - nextH / 2 - 20, 10, C.gold);
  }

  function drawHighlight() {
    if (!highlight) return;
    highlight.t += game.time.delta || 0.016;
    var grow = 1 + Math.min(0.25, highlight.t * 0.8);
    game.draw.rect(highlight.x - highlight.w * grow / 2, highlight.y - highlight.h * grow / 2, highlight.w * grow, highlight.h * grow, '#ffffff', Math.max(0, 0.7 - highlight.t));
  }

  function drawMason(pressing) {
    var frame = (Math.floor(game.time.elapsed * 3) % 2 === 0 || pressing) ? MASON_B : MASON_A;
    game.draw.sprite(frame, MASON_PAL, 170, 1640 + Math.sin(game.time.elapsed * 2.5) * 6, 16, { anchor: 'center' });
  }

  function hud() {
    say(placed + ' / ' + NEEDED, W / 2, 70, 44, C.pale);
    var bw = W - 160;
    game.draw.rect(80, 150, bw, 18, C.ink, 0.35);
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 150, bw * Math.max(0, timeLeft / TIME_LIMIT), 18, low ? C.bad : C.gold);
    for (var i = 0; i < NEEDED; i++) game.draw.circle(W / 2 - (NEEDED - 1) * 22 + i * 44, 200, 12, i < placed ? C.gold : C.stoneLo);
  }

  // ---- ATTRACT: 本物の落下・着地判定で2個成功→1個わざと外して崩す ----
  var demo = { t: 0, gx: W / 2, gy: 520, press: false, drops: 0, wait: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.4;
    if (cyc < dt || demo.t <= dt) {
      initGame();
      stones.push({ x: W / 2 + 20, w: 280, h: 66, y: BASE_Y - 66 });
      demo.drops = 0; demo.wait = 0.4; countIn = 0;
    }
    mover.ph += dt * 2.3;
    mover.x = moverX(mover.ph);
    demo.gx = mover.x; demo.gy = MOVER_Y + 150;
    demo.press = false;
    demo.wait -= dt;
    var res = stepFall(dt);
    if (res) {
      if (res === 'slip' || res === 'topple') {
        game.audio.play('se_break', 0.25);
        game.fx.shake(8, 0.3);
      } else {
        game.fx.burst(topStone().x, topStone().y, { color: C.gold, count: 10, speed: 260 });
        game.audio.play('se_good', 0.2);
        pickSize(demo.drops);
      }
    }
    stepDebris(dt);
    if (!falling && demo.wait <= 0 && demo.drops < 3) {
      var top = topStone();
      var aim = demo.drops < 2 ? top.x : top.x + top.w * 0.62;
      if (Math.abs(mover.x - aim) < 16) {
        dropStone(); demo.drops++; demo.wait = 0.9; demo.press = true;
      }
    }
    if (demo.wait > 0.6) demo.press = true;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      scenery();
      stepDemo(dt);
      drawCairn();
      drawMover();
      drawHighlight();
      drawMason(demo.press);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      say(GAME_TITLE, W / 2, 90, 64, C.pale);
      say('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 170, 30, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) say('► 100円 投入 ◄', W / 2, H * 0.93, 44, C.gold);
      else say('INSERT COIN', W / 2, H * 0.93, 34, C.pale);
      return;
    }

    if (state === S.RESULT) {
      scenery();
      stepDebris(dt);
      drawCairn();
      drawMason(false);
      say(cleared ? 'CLEAR' : (reason === 'time' ? 'TIME UP' : 'GAME OVER'), W / 2, 110, 76, cleared ? C.gold : C.bad);
      say('SCORE ' + (placed * 10 + perfects * 5), W / 2, 200, 40, C.pale);
      say('PERFECT ' + perfects, W / 2, 262, 32, C.gold);
      if (cleared && game.best > 0 && placed * 10 + perfects * 5 >= game.best) say('NEW RECORD', W / 2, 330, 40, C.gold);
      else say('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 330, 30, C.pale);
      if (!cleared) say('あと' + (NEEDED - placed) + '個!', W / 2, 400, 40, C.pale);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) say('TAP TO CONTINUE', W / 2, H * 0.93, 34, C.pale);
      return;
    }

    // PLAYING
    if (ended) {
      if (freezeT > 0) freezeT -= dt;
      else {
        stepDebris(dt);
        endT -= dt;
        if (endT <= 0) {
          state = S.RESULT;
          var sc = placed * 10 + perfects * 5;
          if (cleared) game.end.success(sc, { stones: placed, perfect: perfects });
          else game.end.failure({ stones: placed, perfect: perfects });
        }
      }
    } else if (countIn > 0) {
      countIn -= dt;
      if (countIn <= 0) game.audio.play('se_tap', 0.3);
    } else {
      timeLeft -= dt;
      mover.ph += dt * moverSpeed();
      mover.x = moverX(mover.ph);
      resolveLanding(stepFall(dt));
      if (!ended && timeLeft <= 0) {
        timeLeft = 0;
        var tp = topStone();
        highlight = { x: tp.x, y: tp.y + tp.h / 2, w: tp.w, h: tp.h, t: 0 };
        freezeT = 0.4;
        game.feedback.bad(W / 2, MOVER_Y, { text: 'TIME UP', color: C.bad });
        finish(false, 'time');
      }
    }

    scenery();
    drawCairn();
    drawMover();
    drawHighlight();
    drawMason(!!falling);
    hud();
    if (countIn > 0) say(countIn > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 80, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['D4', 0.5], ['F4', 0.5], ['A4', 1], ['G4', 0.5], ['E4', 0.5], ['D4', 1],
      ['A3', 0.5], ['C4', 0.5], ['D4', 1.5], [null, 1.5],
    ], { tempo: 96, wave: 'triangle', volume: 0.05, loop: true, bass: [['D2', 2], ['A2', 2], ['F2', 2], ['A2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

// I-GBA-0017v2-onsen-pingpong-rally.js
// 湯上がり卓球ラリー — 番頭と交互に1球ずつ打ち合い、自分の番では球が届く瞬間に球の来る側を振って返し続ける
// 操作: 番頭が打った球は台の左右どちらかで弾む(着地点の輪が先に光る)。球が手元に届く瞬間に、その側(画面の左半分/右半分)をタップして打ち返す
// 終わり: 8本打ち返せば成功。空振り・逆側を振る・見逃し/時間切れで失敗
// @mechanic: turn_attack
// @theme: onsen_inn_pingpong_turns
// 世界観: 温泉宿の遊戯室で、湯上がりの客が宿の番頭と手番を交代しながら1球ずつ卓球の球を打ち合い、だんだん速く鋭くなる番頭の返球を8本しのぐ
// 残るもの: 正誤(CLEAR/GAME OVER) + 打ち返した本数と PERFECT 数
// スタイル: 90s PRE-RENDER

(function(game) {
  var STYLE = { bg: ['#1a1412', '#2e2420', '#4a3a30'], main: ['#2e6a58', '#d8d0c0'], accent: ['#ffb040', '#e04838'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  var GAME_TITLE = 'ONSEN RALLY';
  var TIME_LIMIT = 26;
  var NEEDED = 8;
  var TOP_Y = H * 0.30;
  var NET_Y = H * 0.50;
  var END_Y = H * 0.72;
  var HIT_Y = H * 0.78;
  var LANE_X = [W * 0.33, W * 0.67];
  var WIN_GOOD = 0.14;
  var WIN_PERF = 0.05;

  var STATE = { ATTRACT: 'ATTRACT', PLAYING: 'PLAYING', RESULT: 'RESULT' };
  var state = STATE.ATTRACT;

  // ball.leg: 'mine'(番頭→自分) / 'theirs'(自分→番頭) / 'lost'
  var ball = { leg: 'theirs', t: 0, dur: 1, x0: W / 2, y0: HIT_Y, lane: 0, bx: 0, by: 0, fromX: W / 2 };
  var banto = { x: W / 2, lean: 0, swing: 0 };
  var me = { swing: 0, side: 0 };
  var returns = 0, perfects = 0, score = 0, left = TIME_LIMIT, count = 0, holdT = 0, fadeT = 0;
  var on = false, cleared = false, missLane = -1;

  var BANTO_A = [
    '..hhhh..',
    '.wwwwww.',
    '..ffff..',
    '..f..f..',
    '..ffff..',
    '.kkkkkk.',
    'kk.kk.kk',
    'k..kk..k',
    '...kk...',
  ];
  var BANTO_B = [
    '..hhhh..',
    '.wwwwww.',
    '..ffff..',
    '..f..f..',
    '..ffff..',
    '.kkkkkk.',
    'kkkkkkkk',
    '...kk..k',
    '...kk...',
  ];
  var BANTO_PAL = { 'h': '#2a2020', 'w': '#e8e0d0', 'f': '#d8a880', 'k': '#3a4a78' };
  var GUEST_A = [
    '..hhhh..',
    '.hhhhhh.',
    '..hhhh..',
    '.yyyyyy.',
    'yybyybyy',
    'y.yyyy.y',
    '..yyyy..',
    '..y..y..',
  ];
  var GUEST_B = [
    '..hhhh..',
    '.hhhhhh.',
    '..hhhh..',
    '.yyyyyy.',
    'yyyyyyyy',
    '..yyyy.y',
    '..yyyy..',
    '.y....y.',
  ];
  var GUEST_PAL = { 'h': '#2a2020', 'y': '#8aa8d8', 'b': '#e8e0d0' };
  var PADDLE = ['.rrr.', 'rrrrr', 'rrrrr', '.rrr.', '..w..', '..w..'];
  var LANTERN = ['.oo.', 'oooo', 'oooo', 'oooo', '.oo.'];

  function write(str, x, y, size, color) {
    game.draw.text(str, x + 3, y + 3, { size: size, color: '#000000', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function flightTime() { return Math.max(0.78, 1.3 - returns * 0.07); }

  // 番頭の返球(手番交代): 次に来る側を決め、着地点の輪を出す
  function bantoServe(live) {
    ball.leg = 'mine'; ball.t = 0; ball.dur = flightTime();
    ball.fromX = banto.x; ball.x0 = banto.x; ball.y0 = TOP_Y - 30;
    var feint = returns >= 3 && game.random(0, 1) < 0.4;
    ball.lane = game.random(0, 1) < 0.5 ? 0 : 1;
    banto.lean = feint ? (ball.lane === 0 ? 1 : -1) : (ball.lane === 0 ? -1 : 1);
    banto.swing = 0.25;
    ball.bx = ball.x0 + (LANE_X[ball.lane] - ball.x0) * 0.72;
    ball.by = ball.y0 + (HIT_Y - ball.y0) * 0.72;
    if (live) game.audio.tone('E5', 0.05, { wave: 'square', volume: 0.1 });
  }

  function resetTable() {
    returns = 0; banto.x = W / 2; banto.lean = 0; banto.swing = 0; me.swing = 0; missLane = -1;
    ball.leg = 'theirs'; ball.t = 0.6; ball.dur = 0.8; ball.x0 = W / 2; ball.y0 = HIT_Y;
  }

  function newMatch() {
    resetTable();
    perfects = 0; score = 0; left = TIME_LIMIT; count = 0.8; holdT = 0; fadeT = 0;
    on = false; cleared = false;
  }

  function ballPos() {
    var k = Math.min(1, ball.t / ball.dur);
    if (ball.leg === 'mine') {
      var tx = LANE_X[ball.lane];
      var x = ball.x0 + (tx - ball.x0) * k;
      var y = ball.y0 + (HIT_Y - ball.y0) * k;
      var kb = 0.72;
      var z = k < kb ? Math.sin((k / kb) * Math.PI) * 120 : Math.sin(((k - kb) / (1 - kb)) * Math.PI * 0.5) * 70;
      return { x: x, y: y, z: z };
    }
    var ex = banto.x, ey = TOP_Y - 30;
    return { x: ball.x0 + (ex - ball.x0) * k, y: ball.y0 + (ey - ball.y0) * k, z: Math.sin(k * Math.PI) * 150 };
  }

  // 実判定: 自分の手番で lane 側を振ったら? 'perfect' | 'good' | 'miss' | 'wait'(相手の手番)
  function judgeSwing(lane) {
    if (ball.leg !== 'mine') return 'wait';
    var dtA = Math.abs(ball.t - ball.dur);
    if (ball.t < ball.dur * 0.55) return 'wait';
    if (lane !== ball.lane) return 'miss';
    if (dtA <= WIN_PERF) return 'perfect';
    if (dtA <= WIN_GOOD) return 'good';
    return 'miss';
  }

  function doReturn(res, live) {
    var p = ballPos();
    if (res === 'miss') {
      missLane = ball.lane;
      ball.leg = 'lost';
      if (live) {
        on = false; cleared = false; holdT = 0.55;
        game.feedback.bad(p.x, p.y, { text: 'MISS', shake: 14 });
        game.audio.play('se_failure', 0.45);
        game.audio.stopBgm();
      }
      return;
    }
    returns++;
    ball.leg = 'theirs'; ball.t = 0; ball.dur = 0.75; ball.x0 = p.x; ball.y0 = HIT_Y;
    banto.x = W * (0.3 + 0.4 * (me.side === 0 ? 1 : 0));
    if (!live) return;
    if (res === 'perfect') perfects++;
    score += res === 'perfect' ? 150 : 100;
    game.feedback.good(p.x, p.y - 40, { text: res === 'perfect' ? 'PERFECT' : 'GOOD', color: res === 'perfect' ? STYLE.accent[0] : STYLE.main[1], count: res === 'perfect' ? 18 : 10 });
    if (returns === 4) { game.fx.popup('4 / ' + NEEDED, W / 2, H * 0.24, { color: STYLE.accent[0], size: 52 }); game.audio.play('se_milestone', 0.45); }
    if (returns >= NEEDED) {
      on = false; cleared = true; holdT = 0.45;
      score += Math.round(left * 15);
      game.audio.play('se_success', 0.5);
      game.audio.stopBgm();
    }
  }

  // 実ロジック: 球の進行と手番交代。戻り値 'late'(見逃し) | null
  function stepRally(dt, live) {
    if (banto.swing > 0) banto.swing -= dt;
    if (me.swing > 0) me.swing -= dt;
    if (ball.leg === 'lost') return null;
    ball.t += dt;
    if (ball.leg === 'theirs') {
      if (ball.t >= ball.dur) bantoServe(live);
    } else if (ball.leg === 'mine') {
      if (live && ball.t - dt < ball.dur * 0.72 && ball.t >= ball.dur * 0.72) game.audio.tone('C6', 0.04, { wave: 'square', volume: 0.08 });
      if (ball.t > ball.dur + WIN_GOOD) return 'late';
    }
    return null;
  }

  game.onTap(function(x, y) {
    if (state === STATE.ATTRACT) { game.audio.play('se_coin', 0.5); state = STATE.PLAYING; newMatch(); return; }
    if (state === STATE.RESULT) { state = STATE.ATTRACT; newMatch(); demo.t = 0; return; }
    if (!on) return;
    var lane = x < W / 2 ? 0 : 1;
    me.side = lane; me.swing = 0.2;
    var res = judgeSwing(lane);
    if (res === 'wait') {
      game.audio.play('se_tap', 0.12);
      game.fx.burst(LANE_X[lane], HIT_Y, { color: STYLE.main[1], count: 3, speed: 80 });
      return;
    }
    game.audio.play('se_tap', 0.35);
    doReturn(res, true);
  });

  // ── ATTRACT ゴースト実演: stepRally/judgeSwing/doReturn をそのまま回す。偶数周の3本目は番頭のフェイントにつられて逆側を振る ──
  var demo = { t: 0, gx: W * 0.33, gy: H * 0.86, press: 0, fooled: false, missShow: 0, aim: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 9;
    if (cyc < dt || demo.t <= dt) {
      resetTable();
      demo.fooled = Math.floor(demo.t / 9) % 2 === 1;
      demo.missShow = 0;
    }
    if (demo.press > 0) demo.press -= dt;
    if (demo.missShow > 0) {
      demo.missShow -= dt;
      if (banto.swing > 0) banto.swing -= dt;
      if (demo.missShow <= 0) { resetTable(); }
      return;
    }
    stepRally(dt, false);
    if (ball.leg === 'mine') {
      demo.aim = ball.lane;
      if (demo.fooled && returns === 2) demo.aim = 1 - ball.lane;
      demo.gx = LANE_X[demo.aim];
      if (ball.t >= ball.dur - 0.02) {
        me.side = demo.aim; me.swing = 0.2; demo.press = 0.22;
        var res = judgeSwing(demo.aim);
        doReturn(res, false);
        if (res === 'miss') { demo.missShow = 0.9; demo.fooled = false; }
        if (returns >= NEEDED) resetTable();
      }
    }
  }

  // ── 描画 ──
  function drawRoom() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[2]], [0.35, STYLE.bg[1]], [1, STYLE.bg[0]]]);
    // 障子と柱
    for (var i = 0; i < 6; i++) {
      game.draw.rect(40 + i * 180, 230, 150, 260, '#cfc2a8', 0.22);
      game.draw.rect(40 + i * 180 + 72, 230, 6, 260, '#1a1412', 0.4);
      game.draw.rect(40 + i * 180, 356, 150, 6, '#1a1412', 0.4);
    }
    // 畳(横ストリップ)
    for (var y = Math.floor(H * 0.52); y < H; y += 5) {
      var d = (y - H * 0.52) / (H * 0.48);
      game.draw.rect(0, y, W, 5, Math.floor(y / 150) % 2 ? '#5a5234' : '#524a2e', 0.9 - d * 0.2);
    }
    // 暖色ランプの光(プリレンダ風の重いグロー)
    var pulse = 0.08 + 0.03 * Math.sin(t * 1.3);
    game.draw.circle(W * 0.15, 200, 160, '#ffb040', pulse);
    game.draw.circle(W * 0.85, 200, 160, '#ffb040', pulse);
    // 粒状ノイズ
    for (var n = 0; n < 40; n++) game.draw.rect(game.random(0, W), game.random(0, H), 3, 3, '#ffffff', 0.05);
  }

  function drawTable(highlight) {
    for (var y = Math.floor(TOP_Y); y < END_Y; y += 4) {
      var k = (y - TOP_Y) / (END_Y - TOP_Y);
      var half = 300 + k * 140;
      game.draw.rect(W / 2 - half, y, half * 2, 4, k < 0.45 ? '#27594a' : '#2e6a58', 1);
    }
    game.draw.rect(W / 2 - 440, END_Y, 880, 26, '#183a30', 1);
    game.draw.line(W / 2, TOP_Y, W / 2, END_Y, '#d8d0c0', 4);
    game.draw.line(W / 2 - 300, TOP_Y, W / 2 + 300, TOP_Y, '#d8d0c0', 6);
    game.draw.line(W / 2 - 440, END_Y, W / 2 + 440, END_Y, '#d8d0c0', 6);
    // ネット
    game.draw.rect(W / 2 - 390, NET_Y - 34, 780, 34, '#d8d0c0', 0.35);
    game.draw.line(W / 2 - 390, NET_Y - 34, W / 2 + 390, NET_Y - 34, '#ffffff', 5);
    // 着地点の輪(予告)
    if (ball.leg === 'mine' && ball.t < ball.dur * 0.72) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      game.draw.circle(ball.bx, ball.by, 58, STYLE.accent[0], blink ? 0.55 : 0.3);
      game.draw.circle(ball.bx, ball.by, 40, '#2e6a58', 1);
    }
    if (highlight && missLane >= 0) game.draw.circle(LANE_X[missLane], HIT_Y, 120, '#ffffff', 0.45);
  }

  function drawPlayers() {
    var t = game.time.elapsed;
    var bob = Math.sin(t * 3) * 4;
    var bx = banto.x + banto.lean * 40;
    game.draw.sprite(banto.swing > 0 ? BANTO_B : BANTO_A, BANTO_PAL, bx, TOP_Y - 120 + bob, 16, { anchor: 'center', flipX: banto.lean > 0 });
    game.draw.sprite(PADDLE, { 'r': STYLE.accent[1], 'w': '#d8c090' }, bx + (banto.lean >= 0 ? 90 : -90), TOP_Y - 70 + bob, 10, { anchor: 'center' });
    var gx = LANE_X[me.side] + (me.side === 0 ? 60 : -60);
    game.draw.rect(gx - 70, H * 0.93, 140, 14, '#000000', 0.35);
    game.draw.sprite(me.swing > 0 ? GUEST_B : GUEST_A, GUEST_PAL, gx, H * 0.88 + bob, 20, { anchor: 'center' });
    var sw = me.swing > 0 ? (me.side === 0 ? -70 : 70) : 0;
    game.draw.sprite(PADDLE, { 'r': STYLE.accent[1], 'w': '#d8c090' }, LANE_X[me.side] + sw * 0.3, HIT_Y + 10, 16, { anchor: 'center' });
    // 手番の提灯: 光っている側が打つ番
    var mineTurn = ball.leg === 'mine';
    game.draw.sprite(LANTERN, { 'o': mineTurn ? '#5a4030' : STYLE.accent[0] }, 90, TOP_Y - 60, 18, { anchor: 'center' });
    game.draw.sprite(LANTERN, { 'o': mineTurn ? STYLE.accent[0] : '#5a4030' }, 90, END_Y + 90, 18, { anchor: 'center' });
    if (mineTurn) game.draw.circle(90, END_Y + 90, 80, STYLE.accent[0], 0.2 + 0.1 * Math.sin(t * 8));
    else game.draw.circle(90, TOP_Y - 60, 80, STYLE.accent[0], 0.2);
  }

  function drawBall(highlight) {
    if (ball.leg === 'lost' && !highlight) return;
    var p = ballPos();
    var sc = 1 + (p.y - TOP_Y) / (HIT_Y - TOP_Y) * 0.6;
    game.draw.circle(p.x + 10, p.y + 8, 16 * sc, '#000000', 0.35);
    if (highlight) game.draw.circle(p.x, p.y - p.z, 60, '#ffffff', 0.6);
    game.draw.circle(p.x, p.y - p.z, 17 * sc, '#fff6e0', 1);
    game.draw.circle(p.x - 5, p.y - p.z - 5, 6 * sc, '#ffffff', 1);
  }

  function drawHud() {
    write(returns + ' / ' + NEEDED, W / 2, 96, 50, STYLE.main[1]);
    var bw = W - 160;
    var low = left < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 166, bw, 16, '#000000', 0.8);
    game.draw.rect(80, 166, bw * Math.max(0, left / TIME_LIMIT), 16, low ? STYLE.accent[1] : STYLE.accent[0], 1);
    write(String(score), W - 120, 96, 32, STYLE.accent[0]);
  }

  game.onUpdate(function(dt) {
    if (state === STATE.ATTRACT) {
      stepDemo(dt);
      drawRoom();
      drawTable(demo.missShow > 0);
      drawPlayers();
      drawBall(demo.missShow > 0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 15 });
      var bob = Math.sin(game.time.elapsed * 2) * 6;
      write(GAME_TITLE, W / 2, H * 0.07 + bob, 64, STYLE.accent[0]);
      write('HI-SCORE ' + Math.round(game.best || 0), W / 2, H * 0.115, 30, STYLE.main[1]);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) write('► 100円 投入 ◄', W / 2, H * 0.97, 38, STYLE.accent[0]);
      else write('INSERT COIN', W / 2, H * 0.97, 30, STYLE.main[1]);
      return;
    }

    if (state === STATE.RESULT) {
      drawRoom();
      drawTable(!cleared);
      drawPlayers();
      drawBall(!cleared);
      write(cleared ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 66, cleared ? STYLE.accent[0] : STYLE.accent[1]);
      write(returns + ' / ' + NEEDED, W / 2, H * 0.125, 40, STYLE.main[1]);
      write('SCORE ' + score, W / 2, H * 0.16, 32, STYLE.main[1]);
      if (!cleared) write('あと' + (NEEDED - returns) + '本!', W / 2, H * 0.195, 32, STYLE.accent[0]);
      else write('PERFECT ' + perfects, W / 2, H * 0.195, 30, STYLE.accent[0]);
      write('BEST ' + Math.round(game.best || 0), W / 2, H * 0.225, 26, STYLE.main[1]);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) write('TAP TO CONTINUE', W / 2, H * 0.97, 30, STYLE.main[1]);
      return;
    }

    // ── PLAYING ──
    if (fadeT > 0) {
      fadeT -= dt;
      if (fadeT <= 0) {
        state = STATE.RESULT;
        var stats = { returns: returns, perfect: perfects };
        if (cleared) game.end.success(score, stats); else game.end.failure(stats);
      }
    } else if (holdT > 0) {
      holdT -= dt;
      if (holdT <= 0) fadeT = 1.0;
    } else if (count > 0) {
      count -= dt;
      if (count <= 0) { on = true; game.audio.play('se_tap', 0.35); }
    } else if (on) {
      left -= dt;
      if (stepRally(dt, true) === 'late') doReturn('miss', true);
      else if (left <= 0) {
        left = 0; on = false; cleared = false; holdT = 0.5; missLane = ball.lane;
        game.feedback.bad(W / 2, HIT_Y, { text: 'TIME UP', shake: 10 });
        game.audio.play('se_failure', 0.45);
        game.audio.stopBgm();
      }
    }

    drawRoom();
    drawTable(holdT > 0 && !cleared);
    drawPlayers();
    drawBall(holdT > 0 && !cleared);
    drawHud();
    if (count > 0) write(count > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 84, STYLE.accent[0]);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.5], ['F4', 0.25], ['G4', 0.25], ['A4', 0.5], ['C5', 0.5], ['A4', 0.25], ['G4', 0.25], ['F4', 0.5], ['D4', 1]], { tempo: 118, wave: 'triangle', volume: 0.05, loop: true, bass: true });
    state = STATE.ATTRACT;
    newMatch();
  });
})(game);

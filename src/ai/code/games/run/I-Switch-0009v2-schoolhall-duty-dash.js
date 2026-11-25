// I-Switch-0009v2-schoolhall-duty-dash.js
// 木造校舎の当番ダッシュ — 牛乳かごを抱えて廊下を走る当番の子を、開きかけた教室の扉を見て空いている側へ払って走り分けさせる
// 操作: 画面のどこでも左右に払うと、子どもが隣の列(左・中・右の3列)へ移る。大きく払い続けると2列ぶん移れる。教室の戸のすりガラスに人影が映って光ると、その戸が開いて机や掃除の子が列をふさぐ。人影なしでガタつくだけの戸は開かない(後半)
// 終わり: 14秒走って廊下の突き当たりの職員室に着けばCLEAR。ふさがった列にぶつかって牛乳を3本こぼすとGAME OVER
// @mechanic: swipe_direction
// @theme: wooden_schoolhall_duty_dash
// 世界観: 木造校舎の長い廊下で、牛乳かごを抱えた給食当番の子が、左右の教室から開く扉と出てくる机や掃除当番を見て進む向きを払って切り替え、職員室まで駆け抜ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 抜けた扉の数・ぎりぎり回避数・残った牛乳
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 3〜4色 + 黒、輪郭線なしの粗いドット、タイル反復背景、1方向スクロール
  var STYLE = { bg: ['#000000', '#7c3c00'], main: ['#c87c3c', '#f8d8a0', '#fcfcfc'], accent: ['#e43c28', '#3cbcfc'] };
  var C = {
    black: STYLE.bg[0], wood: STYLE.bg[1], wood2: STYLE.main[0], cream: STYLE.main[1], white: STYLE.main[2],
    red: STYLE.accent[0], blue: STYLE.accent[1], gold: '#fcd800', green: '#58d854',
  };

  var GAME_TITLE = 'DUTY DASH';
  var TIME_LIMIT = 14;
  var LIVES = 3;
  var LANE_X = [300, 540, 780];
  var KID_Y = Math.round(H * 0.7);
  var WALL_L = 180, WALL_R = 900;
  var SWIPE_PX = 70;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var lane, kx, dist, speed, obs, slots, slotIdx, playT, lives, cleared, closeCalls, score, readyT, stopT, focus, invT, over, won,
    outroT, lastSwitchT, combo, hop, milestone, goalDist, drag;

  function initGame() {
    lane = 1; kx = LANE_X[1]; dist = 0; speed = 520; obs = []; slotIdx = 0; playT = 0; lives = LIVES; cleared = 0; closeCalls = 0; score = 0;
    readyT = 0.8; stopT = 0; focus = null; invT = 0; over = false; won = false; outroT = 0; lastSwitchT = -9; combo = 0; hop = 0; milestone = false;
    goalDist = 0; for (var s = 0; s < 13.4; s += 0.05) goalDist += speedAt(s) * 0.05;
    drag = null;
    // 扉の位置は先に決めておく(進捗の分母)。間隔は序盤1.2秒→中盤1.0秒→後半0.85秒
    slots = [];
    var d = 700, tt = 0;
    while (d < goalDist - 300) { slots.push({ d: d, t: tt }); var g = gapAt(tt); d += speedAt(tt) * g; tt += g; }
  }

  function speedAt(t) { return 520 + Math.min(1, t / 12) * 260; }
  function gapAt(t) { return t < 4.5 ? 1.2 : (t < 9 ? 1.0 : 0.85); }

  // 扉の出し方: 戸は人影が映るまで見分けがつかないので、人影が映る瞬間(到達1.2秒前)にその時の子の列を見て決める。
  // 序盤は今いる列を必ずふさぐ、中盤から両側同時(真ん中だけ空く)、後半は人影なしでガタつくだけの戸(開かない)が混ざる
  function makeObs(atDist, atT) {
    obs.push({ d: atDist, t: atT, block: [], doors: [], open: 0, warned: false, opened: false, passed: false, flash: 0, feint: null, kind: game.random(0, 1) < 0.5 ? 0 : 1 });
  }
  function assignPattern(o) {
    var stage = o.t < 4.5 ? 0 : (o.t < 9 ? 1 : 2);
    var r = game.random(0, 1);
    var ln = lane;
    if (ln === 1) {
      if (stage > 0 && r < 0.3) { o.block = [0, 2]; o.doors = ['L', 'R']; }
      else if (r < 0.65) { o.block = [0, 1]; o.doors = ['L']; }
      else { o.block = [1, 2]; o.doors = ['R']; }
    } else {
      var side = ln === 0 ? 'L' : 'R';
      if (stage > 0 && r < 0.4) { o.block = [0, 2]; o.doors = ['L', 'R']; }
      else if (r < 0.7) { o.block = ln === 0 ? [0, 1] : [1, 2]; o.doors = [side]; }
      else { o.block = [ln]; o.doors = [side]; }
    }
    if (stage === 2 && o.doors.length === 1 && game.random(0, 1) < 0.5) o.feint = o.doors[0] === 'L' ? 'R' : 'L';
  }

  function blocked(o, ln) { for (var i = 0; i < o.block.length; i++) if (o.block[i] === ln) return true; return false; }
  function laneOfX(x) { var b = 0; for (var i = 1; i < 3; i++) if (Math.abs(LANE_X[i] - x) < Math.abs(LANE_X[b] - x)) b = i; return b; }
  function ttr(o) { return (o.d - dist) / speed; }
  function screenY(d) { return KID_Y - (d - dist); }

  function switchLane(dir, demo) {
    var nl = lane + dir;
    if (nl < 0 || nl > 2) {
      game.audio.tone(160, 0.06, { wave: 'square', volume: 0.05 });
      game.fx.burst(dir < 0 ? WALL_L + 10 : WALL_R - 10, KID_Y, { color: C.cream, count: 4, speed: 120 });
      return;
    }
    lane = nl; lastSwitchT = playT;
    game.audio.play('se_jump', demo ? 0.1 : 0.25);
    game.fx.burst(kx, KID_Y + 50, { color: C.cream, count: 5, speed: 180 });
  }

  // ---- 進行(本番もデモも同じ)。戻り値: ぶつかった扉 or null ----
  function stepWorld(dt, demo) {
    playT += dt;
    speed = speedAt(playT);
    dist += speed * dt;
    kx += (LANE_X[lane] - kx) * Math.min(1, dt * 18);
    if (invT > 0) invT -= dt;
    if (hop > 0) hop -= dt;
    while (slotIdx < slots.length && slots[slotIdx].d < dist + 1500) { makeObs(slots[slotIdx].d, slots[slotIdx].t); slotIdx++; }
    var hit = null;
    for (var i = obs.length - 1; i >= 0; i--) {
      var o = obs[i];
      var tr = ttr(o);
      if (!o.warned && tr < 1.2) {
        o.warned = true;
        assignPattern(o);
        game.audio.tone(o.feint ? 300 : 240, 0.12, { wave: 'square', volume: 0.06 });
      }
      if (!o.opened && tr < 0.72) { o.opened = true; game.audio.tone(180, 0.1, { wave: 'triangle', volume: 0.07, slide: -60 }); }
      if (o.opened) o.open = Math.min(1, o.open + dt * 5);
      if (o.flash > 0) o.flash -= dt;
      if (!o.passed && tr <= 0) {
        o.passed = true;
        var ln = laneOfX(kx);
        if (blocked(o, ln) && invT <= 0) hit = o;
        else if (!blocked(o, ln)) passScore(o, demo);
      }
      if (screenY(o.d) > H + 200) obs.splice(i, 1);
    }
    return hit;
  }

  function passScore(o, demo) {
    var close = playT - lastSwitchT < 0.35;
    cleared++; combo++;
    var pts = 100 + (close ? 100 : 0) + Math.min(5, combo) * 10;
    if (!demo) score += pts;
    if (close) {
      closeCalls++;
      game.feedback.good(kx, KID_Y - 120, { text: 'NICE', color: C.gold, size: 52, sound: 'se_coin', volume: 0.3, count: 10 });
    } else {
      game.audio.tone(660 + Math.min(6, combo) * 60, 0.05, { wave: 'square', volume: 0.04 });
    }
    game.fx.popup('+' + pts, kx, KID_Y - 200, { color: C.white, size: 40 });
    if (!demo && !milestone && cleared === 6) {
      milestone = true;
      game.fx.popup('6 / ' + 6, W / 2, H * 0.36, { color: C.gold, size: 72 });
      game.audio.play('se_milestone', 0.45);
    }
  }

  function onHit(o, demo) {
    o.flash = 0.6; focus = o; stopT = 0.45; invT = 1.0; combo = 0;
    game.feedback.bad(kx, KID_Y - 40, { text: 'MISS', shake: demo ? 6 : 14 });
    game.audio.play('se_break', 0.35);
    if (!demo) {
      lives--;
      if (lives <= 0) finish(false);
    }
  }

  function finish(ok) {
    over = true; won = ok; outroT = 1.5;
    game.audio.stopBgm();
    if (ok) {
      score += lives * 200;
      game.audio.play('se_success', 0.55);
      game.fx.burst(kx, KID_Y - 60, { color: C.gold, count: 30, speed: 460 });
      game.fx.burst(kx, KID_Y - 60, { color: C.white, count: 20, speed: 340 });
      game.fx.flash(C.white, 0.25);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力: 押して左右へ払う(払いが70pxを超えた瞬間に移る。続けて払えばもう1列) ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    drag = { ax: x, ay: y, moved: false };
    if (over || readyT > 0 || stopT > 0) { game.audio.tone(200, 0.03, { wave: 'square', volume: 0.03 }); return; }
    game.audio.play('se_tap', 0.08);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !drag) return;
    var dx = x - drag.ax, dy = y - drag.ay;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 0.8) {
      drag.ax = x; drag.ay = y; drag.moved = true;
      if (over || readyT > 0 || stopT > 0) { game.audio.tone(200, 0.03, { wave: 'square', volume: 0.03 }); return; }
      switchLane(dx < 0 ? -1 : 1, false);
    } else if (Math.abs(dy) > SWIPE_PX * 1.6 && !drag.moved) {
      drag.ay = y; drag.moved = true;
      if (!over && readyT <= 0 && stopT <= 0) { hop = 0.25; game.audio.tone(520, 0.05, { wave: 'square', volume: 0.04 }); }
    }
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !drag) return;
    if (!drag.moved && !over && readyT <= 0 && stopT <= 0) { hop = 0.2; game.audio.tone(440, 0.04, { wave: 'square', volume: 0.04 }); }
    drag = null;
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.black, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  // 当番の子(上から): 白い帽子と前かけ、両手に牛乳かご
  var KID_A = ['...ww...', '..wwww..', '..ssss..', '.bwwwwb.', 'bbmmmmbb', '.bmmmmb.', '..wwww..', '..s..s..', '.ss.....'];
  var KID_B = ['...ww...', '..wwww..', '..ssss..', '.bwwwwb.', 'bbmmmmbb', '.bmmmmb.', '..wwww..', '..s..s..', '.....ss.'];
  var KID_OUCH = ['.w....w.', '..wwww..', '.ss..ss.', 'bbwwwwbb', '..mmmm..', '.m.mm.m.', '..wwww..', '.s....s.', 's......s'];
  var KID_PAL = { w: C.white, s: '#f8b878', b: C.wood, m: C.blue };
  // 戸口から出てくる物: 机の山 / 掃除当番の子(ほうき)
  var DESK = ['wwwwwwww', 'cccccccc', 'w......w', 'wwwwwwww', 'cccccccc', 'w......w'];
  var SWEEPER = ['..kk....', '.kssk...', '..ss..w.', '.rrrr.w.', 'rrrrrrw.', '.rrrr.w.', '.s..swww', '.s..s...'];
  var BOTTLE = ['.ww.', 'wbbw', 'wbbw', 'wwww'];

  function drawHall() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.wood], [1, '#4c2400']]);
    // 床板のタイル反復(縦に長い板。継ぎ目を互い違いにしてスクロール)
    var off = dist % 240;
    for (var b = 0; b < 9; b++) {
      var bx = WALL_L + b * 80;
      game.draw.rect(bx, 0, 80, H, b % 2 ? C.wood2 : '#b06c30');
      game.draw.rect(bx, 0, 4, H, C.black);
      for (var y = -240 + off + (b % 3) * 80; y < H; y += 240) game.draw.rect(bx, y, 80, 4, C.black);
    }
    // 両側の壁(腰板+窓)。教室の柱をタイルで反復
    var woff = dist % 480;
    for (var side = 0; side < 2; side++) {
      var wx = side === 0 ? 0 : WALL_R;
      game.draw.rect(wx, 0, WALL_L, H, C.cream);
      game.draw.rect(side === 0 ? WALL_L - 24 : WALL_R, 0, 24, H, C.wood);
      for (var py = -480 + woff; py < H; py += 480) {
        game.draw.rect(wx + 30, py + 40, WALL_L - 60, 150, C.blue);
        game.draw.rect(wx + 30, py + 110, WALL_L - 60, 8, C.white);
        game.draw.rect(wx, py + 420, WALL_L, 24, C.wood);
      }
    }
    // 突き当たりの職員室(ゴールが近づくと見える)
    var gy = screenY(goalDist);
    if (gy > -300) {
      game.draw.rect(WALL_L, gy - 300, WALL_R - WALL_L, 300, C.cream);
      game.draw.rect(420, gy - 220, 240, 220, C.wood);
      game.draw.rect(440, gy - 200, 90, 120, C.blue);
      game.draw.rect(550, gy - 200, 90, 120, C.blue);
      game.draw.rect(470, gy - 290, 140, 50, C.green);
      if (Math.floor(t * 4) % 2 === 0) game.draw.circle(540, gy - 265, 14, C.gold);
    }
  }

  function drawDoor(o, side) {
    var y = screenY(o.d);
    var isFeint = o.feint === side;
    var lit = o.warned && !o.passed && (o.doors.indexOf(side) >= 0 || isFeint);
    var wx = side === 'L' ? WALL_L - 24 : WALL_R;
    var shake = (lit && (isFeint || !o.opened)) ? Math.sin(game.time.elapsed * 60) * 5 : 0;
    // 戸(引き戸)。すりガラスに人影=開く
    game.draw.rect(wx + shake, y - 150, 24, 220, C.black);
    var glassX = side === 'L' ? 40 : WALL_R + 40;
    game.draw.rect(glassX, y - 140, WALL_L - 80, 180, lit ? C.white : '#a0d8f8');
    if (lit && !isFeint) {
      game.draw.circle(glassX + (WALL_L - 80) / 2, y - 90, 30, '#5c5c5c');
      game.draw.rect(glassX + (WALL_L - 80) / 2 - 36, y - 60, 72, 90, '#5c5c5c');
      if (Math.floor(game.time.elapsed * 10) % 2 === 0) game.draw.rect(side === 'L' ? WALL_L + 10 : WALL_R - 70, y - 40, 60, 60, C.red, 0.8);
    }
  }

  function drawBlock(o) {
    if (o.open <= 0) return;
    var y = screenY(o.d);
    var hl = focus === o && stopT > 0;
    for (var i = 0; i < o.block.length; i++) {
      var ln = o.block[i];
      var fromLeft = o.doors.length === 1 ? o.doors[0] === 'L' : ln === 0;
      var tx = LANE_X[ln];
      var sx = fromLeft ? WALL_L - 120 : WALL_R + 120;
      var x = sx + (tx - sx) * o.open;
      var sc = hl ? 19 : 15;
      game.draw.rect(x - 110, y + 20, 220, 30, C.black, 0.35);
      if (hl) game.draw.circle(x, y - 10, 120, C.white, 0.6);
      if (o.kind === 0) game.draw.sprite(DESK, { w: C.wood, c: C.cream }, x, y - 10, sc, { anchor: 'center' });
      else game.draw.sprite(SWEEPER, { k: C.black, s: '#f8b878', r: C.red, w: C.cream }, x, y - 10, sc, { anchor: 'center', flipX: !fromLeft });
    }
  }

  function drawKid() {
    var t = game.time.elapsed;
    if (invT > 0 && stopT <= 0 && Math.floor(t * 14) % 2 === 0) return;
    var fr = stopT > 0 ? KID_OUCH : (Math.floor(t * 10) % 2 ? KID_A : KID_B);
    var lift = hop > 0 ? Math.sin((hop / 0.25) * Math.PI) * 30 : 0;
    var lean = (LANE_X[lane] - kx) * 0.12;
    game.draw.rect(kx - 50, KID_Y + 70, 100, 24, C.black, 0.35);
    game.draw.sprite(fr, KID_PAL, kx + lean, KID_Y - lift, 15, { anchor: 'center' });
  }

  function drawThumbZone(dirShow) {
    // 親指ゾーン: 3列の足あと。いる列が光る
    game.draw.rect(0, H * 0.78, W, H * 0.22, C.black, 0.45);
    for (var i = 0; i < 3; i++) {
      var on = i === lane;
      game.draw.rect(LANE_X[i] - 70, H * 0.83, 140, 90, on ? C.gold : C.wood2);
      game.draw.rect(LANE_X[i] - 50, H * 0.845, 40, 60, C.black);
      game.draw.rect(LANE_X[i] + 10, H * 0.845, 40, 60, C.black);
    }
    if (dirShow !== 0) {
      var ax = W / 2 + dirShow * 120;
      for (var a = 0; a < 3; a++) game.draw.rect(ax + dirShow * a * 40 - 15, H * 0.94 - 15, 30, 30, C.white, 0.5 + a * 0.2);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.black, 0.9);
    label(cleared + ' / ' + obsTotal(), 220, 100, 60, C.white);
    label('SCORE ' + score, 220, 180, 36, C.gold);
    for (var i = 0; i < LIVES; i++) game.draw.sprite(BOTTLE, { w: C.white, b: i < lives ? C.blue : '#444' }, 640 + i * 90, 80, 14, { anchor: 'center' });
    var progress = Math.min(1, dist / goalDist);
    game.draw.rect(560, 150, 460, 30, C.wood);
    game.draw.rect(560, 150, 460 * progress, 30, C.green);
    game.draw.sprite(KID_A, KID_PAL, 560 + 460 * progress, 165, 4, { anchor: 'center' });
  }

  function obsTotal() { return slots.length; }

  function drawScene(dirShow) {
    drawHall();
    for (var i = 0; i < obs.length; i++) {
      drawDoor(obs[i], 'L');
      drawDoor(obs[i], 'R');
    }
    for (var j = 0; j < obs.length; j++) if (screenY(obs[j].d) < KID_Y) drawBlock(obs[j]);
    drawKid();
    for (var k = 0; k < obs.length; k++) if (screenY(obs[k].d) >= KID_Y) drawBlock(obs[k]);
    drawThumbZone(dirShow);
  }

  // ---- ATTRACT: 実ロジックで走り、人影の映った戸を見て空いた列へ払う。最後に1回払い遅れて見せる ----
  var demo = { t: 0, sw: 0, dir: 0, cool: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8;
    if (demo.t <= dt || cyc < dt) { initGame(); readyT = 0; }
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) focus = null; return; }
    demo.cool -= dt;
    if (demo.sw > 0) demo.sw -= dt;
    var next = null;
    for (var i = 0; i < obs.length; i++) if (!obs[i].passed && (!next || obs[i].d < next.d)) next = obs[i];
    if (next && demo.cool <= 0 && ttr(next) < 0.85 && cyc < 6.4) {
      if (blocked(next, lane)) {
        var best = -1;
        for (var l = 0; l < 3; l++) if (!blocked(next, l) && (best < 0 || Math.abs(l - lane) < Math.abs(best - lane))) best = l;
        if (best >= 0) {
          var d = best > lane ? 1 : -1;
          switchLane(d, true); demo.sw = 0.3; demo.dir = d; demo.cool = 0.18;
        }
      }
    }
    var hit = stepWorld(dt, true);
    if (hit) onHit(hit, true);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(demo.sw > 0 ? demo.dir : 0);
      var hp = demo.sw > 0 ? 1 - demo.sw / 0.3 : 0;
      game.draw.hand(W / 2 - demo.dir * 140 + demo.dir * 280 * hp, H * 0.9, { press: demo.sw > 0, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.black, 0.9);
      label(GAME_TITLE, W / 2, 105, 90 + Math.sin(t * 3) * 3, C.gold);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 36, C.white);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.45, 52, C.red);
      else label('TAP TO START', W / 2, H * 0.45, 46, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene(0);
      game.draw.rect(0, H * 0.28, W, H * 0.24, C.black, 0.85);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.34, 100, won ? C.green : C.red);
      label('SCORE ' + score, W / 2, H * 0.4, 54, C.white);
      label(cleared + ' / ' + obsTotal() + '  NICE ' + closeCalls, W / 2, H * 0.445, 38, C.gold);
      if (won && score > game.best) label('NEW RECORD', W / 2, H * 0.49, 48, C.gold);
      else label('BEST ' + Math.max(game.best, won ? score : 0), W / 2, H * 0.49, 36, C.white);
      if (!won) label('あと' + Math.max(1, Math.round((goalDist - dist) / 100)) + 'm!', W / 2, H * 0.26, 56, C.gold);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.56, 36, C.white);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (stopT > 0) stopT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { doors: cleared, nice: closeCalls, milk: lives };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) focus = null;
    } else {
      var hit = stepWorld(dt, false);
      if (hit) onHit(hit, false);
      if (!over && dist >= goalDist) finish(true);
      else if (!over && playT >= TIME_LIMIT) { focus = null; finish(false); }
    }

    drawScene(0);
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 110, C.gold);
    if (over && won) label('FINISH', W / 2, H * 0.45, 100, C.gold);
    if (over && !won && lives > 0) label('TIME UP', W / 2, H * 0.45, 96, C.red);
  });

  game.onStart(function() {
    game.audio.melody([
      ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['F5', 0.5], ['A5', 0.5], ['G5', 1],
      ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['C5', 0.5], ['G4', 1],
    ], { tempo: 176, wave: 'square', volume: 0.045, loop: true, bass: [['C3', 1], ['G2', 1], ['F2', 1], ['G2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

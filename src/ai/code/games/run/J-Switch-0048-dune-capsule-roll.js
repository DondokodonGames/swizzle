// J-Switch-0048-dune-capsule-roll.js
// 赤い砂丘ころがり — 着陸カプセルに乗ったまま砂丘の斜面を転がり下り、岩とくぼみを3本の筋で避けて基地へ急ぐ
// 操作: 画面の左半分タップで左の筋へ、右半分タップで右の筋へ移る。光る尾根を踏むと加速(社内メモ。画面には出さない)
// 終わり: ふもとの基地に着けばCLEAR。岩・くぼみに3回ぶつかる/時間切れでGAME OVER
// @mechanic: camera_run
// @theme: red_planet_dune_capsule
// 世界観: 赤い砂の惑星に着陸しそこねた新人の地質調査員が、丸い着陸カプセルに閉じこもったまま長い砂丘の斜面を転がり下り、砂嵐が来る前にふもとの観測基地へ滑り込む
// 残るもの: 正誤(CLEAR/GAME OVER) + 到着秒・ぶつかった数・踏んだ加速尾根の数
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 少色+地平グラデ。横ストリップを奥ほど圧縮して地平線へ収束させる
  var STYLE = { bg: ['#2a1030', '#c85a3a', '#f0a060'], main: ['#e07040', '#a04028', '#f8d0a0'], accent: ['#40e0ff', '#ffe070'] };
  var M = {
    space: '#2a1030', dusk: '#7a2848', haze: '#f0a060', sandA: '#e07040', sandB: '#b8502e', rock: '#5a2a24', rockHi: '#8a4a3a',
    pit: '#3a1418', cyan: '#40e0ff', yellow: '#ffe070', white: '#fff4e0', ink: '#1a0a14', bad: '#ff3050'
  };

  var GAME_TITLE = 'DUNE CAPSULE';
  var TIME_LIMIT = 20;
  var GOAL = 100;
  var MAX_HIT = 3;
  var HOR = 470, CAP_Y = 1280, LANE_W = 330;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var leg, readyT, timer, dist, speed, lane, laneX, things, spawnIn, hits, ridges, stunT, stopT, tailT, arrived, crashAt, roll, scroll, halfway;

  var POD = [
    ['..wwww..', '.wccccw.', 'wccyycw.', 'wcyyyycw', 'wccyyccw', 'wwccccww', '.wwwwww.', '..wwww..'],
    ['..wwww..', '.wccccw.', 'wcccccw.', 'wccyyccw', 'wcyyyycw', 'wwcyycww', '.wwwwww.', '..wwww..']
  ];
  var ROCK = ['..rr..', '.rhrr.', 'rhrrrr', 'rrrrrr'];
  var DOME = ['...cc...', '.cccccc.', 'cccccccc', 'wwwwwwww'];

  function show(s, x, y, sz, col, al) {
    game.draw.text(s, x + 3, y + 4, { size: sz, color: M.ink, bold: true, align: al || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: al || 'center' });
  }

  function begin() {
    leg = 'ready'; readyT = 0.8; timer = TIME_LIMIT; dist = 0; speed = 6.5; lane = 0; laneX = 0;
    things = []; spawnIn = 0.6; hits = 0; ridges = 0; stunT = 0; stopT = 0; tailT = 0; arrived = false; crashAt = null; roll = 0; scroll = 0; halfway = false;
  }

  function depthY(p) { return HOR + (CAP_Y - HOR) * p * p; }
  function depthS(p) { return 0.12 + 0.88 * p * p; }

  // 斜面を進める(実プレイ・デモ共用)
  function roll1(dt, pace) {
    var target = 6.5 + Math.min(2, dist / 50);
    speed += (target - speed) * Math.min(1, dt * 1.2);
    dist += speed * dt * pace;
    scroll += speed * dt;
    roll += speed * dt * 2;
    laneX += (lane - laneX) * Math.min(1, dt * 14);
    spawnIn -= dt;
    if (spawnIn <= 0) {
      var r = game.random(0, 1);
      var ln = Math.floor(game.random(0, 2.999)) - 1;
      if (r < 0.18) things.push({ lane: ln, p: 0, kind: 'ridge' });
      else if (r < 0.36 && dist > 25) {
        var free = Math.floor(game.random(0, 2.999)) - 1;
        for (var l = -1; l <= 1; l++) if (l !== free) things.push({ lane: l, p: 0, kind: 'rock' });
      } else things.push({ lane: ln, p: 0, kind: game.random(0, 1) < 0.5 ? 'rock' : 'pit' });
      spawnIn = Math.max(0.55, 1.05 - dist / 250);
    }
    for (var i = things.length - 1; i >= 0; i--) {
      var o = things[i];
      o.p += dt * speed / 8.5;
      if (!o.done && o.p >= 0.94 && o.p <= 1.04 && o.lane === lane) {
        o.done = true;
        if (o.kind === 'ridge') boost(o);
        else return o;
      }
      if (o.p > 1.2) things.splice(i, 1);
    }
    return null;
  }

  function boost(o) {
    speed += 3.5; ridges++;
    game.audio.play('se_powerup', 0.3);
    game.fx.burst(W / 2 + o.lane * LANE_W, CAP_Y, { color: M.cyan, count: 10, speed: 260 });
  }

  function crash(o, ghost) {
    speed = 1.5;
    var cx = W / 2 + o.lane * LANE_W;
    if (ghost) { game.fx.burst(cx, CAP_Y - 40, { color: M.bad, count: 10, speed: 240 }); game.fx.shake(6, 0.2); return; }
    hits++;
    crashAt = { x: cx, y: CAP_Y - 40, t: 0.45 };
    game.feedback.bad(cx, CAP_Y - 200, { text: 'MISS', color: M.bad, shake: 10 });
    if (hits >= MAX_HIT) end(false); else stunT = 0.35;
  }

  function end(win) {
    if (leg === 'stop' || leg === 'tail') return;
    arrived = win; leg = 'stop'; stopT = 0.55;
    game.audio.stopBgm();
    if (win) { game.fx.flash(M.white, 0.25); game.audio.play('se_success', 0.6); game.feedback.good(W / 2, CAP_Y - 220, { text: 'FINISH', color: M.yellow, count: 20 }); }
    else {
      if (timer <= 0) game.feedback.bad(W / 2, H * 0.42, { text: 'TIME UP', color: M.bad });
      game.audio.play('se_failure', 0.6);
    }
  }

  function shift(dir) {
    var nl = Math.max(-1, Math.min(1, lane + dir));
    if (nl === lane) { game.audio.tone('C4', 0.05, { wave: 'square', volume: 0.03 }); game.fx.shake(3, 0.08); return false; }
    lane = nl;
    game.audio.play('se_tap', 0.3);
    game.fx.burst(W / 2 + laneX * LANE_W, CAP_Y + 60, { color: M.sandA, count: 5, speed: 150 });
    return true;
  }

  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; begin(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; begin(); demo.t = 0; return; }
    if (leg !== 'run' || stunT > 0) { game.audio.tone('D4', 0.03, { wave: 'square', volume: 0.02 }); return; }
    shift(x < W / 2 ? -1 : 1);
  });

  // ── demo: 危ない物が近づいたら空いた筋へ。5回に1回はよけ損ねる ──
  var demo = { t: 0, gx: W / 2, gy: 1650, press: 0, n: 0, sk: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8;
    if (cyc < dt || demo.t <= dt) { things = []; dist = 0; speed = 6.5; lane = 0; demo.n = 0; }
    var hit = roll1(dt, 1);
    if (hit) crash(hit, true);
    demo.press -= dt;
    var threat = null;
    for (var i = 0; i < things.length; i++) { var o = things[i]; if (!o.done && o.kind !== 'ridge' && o.lane === lane && o.p > 0.55 && o.p < 0.9) threat = o; }
    if (threat && !threat.seen) {
      threat.seen = true; demo.n++;
      if (demo.n % 5 !== 0) {
        var opts = [];
        for (var l = -1; l <= 1; l++) {
          if (Math.abs(l - lane) !== 1) continue;
          var blocked = false;
          for (var j = 0; j < things.length; j++) if (things[j].kind !== 'ridge' && things[j].lane === l && Math.abs(things[j].p - threat.p) < 0.2) blocked = true;
          if (!blocked) opts.push(l);
        }
        if (opts.length) {
          var d = opts[0] - lane;
          demo.gx = d < 0 ? W * 0.25 : W * 0.75; demo.press = 0.2;
          lane = opts[0];
        }
      }
    }
  }

  // ── drawing ──
  function drawGround() {
    var t = game.time.elapsed;
    game.draw.gradient(0, HOR, [[0, M.space], [0.6, M.dusk], [1, M.haze]]);
    game.draw.circle(W * 0.78, 260, 46, M.white, 0.8);
    game.draw.circle(W * 0.25, 330, 20, M.yellow, 0.6);
    for (var d = 0; d < 5; d++) game.draw.rect(d * 240 - 40, HOR - 50 - (d % 2) * 30, 300, 60, M.sandB, 0.8);
    // 基地のドーム(近づくほど大きい)
    var near = Math.min(1, dist / GOAL);
    game.draw.sprite(DOME, { c: M.cyan, w: M.white }, W / 2, HOR - 10, 8 + near * 14, { anchor: 'center' });
    // 床: 奥ほど圧縮した横ストリップ
    for (var y = HOR; y < 1440; y += 6) {
      var z = 1 / Math.max(0.02, (y - HOR) / (1440 - HOR));
      var band = Math.floor(z * 3 + scroll * 2) % 2;
      game.draw.rect(0, y, W, 6, band ? M.sandA : M.sandB);
    }
    // 筋(3本)の境目
    for (var b = -1; b <= 1; b += 2) {
      var x0 = W / 2 + b * LANE_W * 0.5 * depthS(0), x1 = W / 2 + b * LANE_W * 0.5 * depthS(1.2);
      game.draw.line(x0, HOR, x1, depthY(1.2), M.yellow, 3);
    }
    game.draw.rect(0, 0, W, H, M.haze, 0.03 + 0.03 * Math.sin(t * 1.4));
  }

  function drawThings() {
    var t = game.time.elapsed;
    var sorted = things.slice().sort(function(a, b) { return a.p - b.p; });
    for (var i = 0; i < sorted.length; i++) {
      var o = sorted[i];
      var y = depthY(o.p), sc = depthS(o.p);
      var x = W / 2 + o.lane * LANE_W * sc;
      if (o.p < 0.45 && o.kind !== 'ridge' && Math.floor(t * 10) % 2 === 0) game.draw.circle(x, y - 20 * sc, 60 * sc + 10, M.bad, 0.4);
      if (o.kind === 'rock') game.draw.sprite(ROCK, { r: M.rock, h: M.rockHi }, x, y - 30 * sc, 30 * sc + 2, { anchor: 'center' });
      else if (o.kind === 'pit') { game.draw.rect(x - 130 * sc, y - 20 * sc, 260 * sc, 40 * sc + 2, M.pit); game.draw.rect(x - 110 * sc, y - 26 * sc, 220 * sc, 8 * sc + 1, M.rock); }
      else { game.draw.rect(x - 140 * sc, y - 12 * sc, 280 * sc, 24 * sc + 2, M.cyan, 0.8 + 0.2 * Math.sin(t * 10)); }
    }
  }

  function drawPod() {
    var t = game.time.elapsed;
    var x = W / 2 + laneX * LANE_W;
    var jit = stunT > 0 ? Math.sin(t * 60) * 12 : 0;
    game.draw.rect(x - 90, CAP_Y + 70, 180, 18, M.ink, 0.35);
    game.draw.sprite(POD[Math.floor(roll) % 2], { w: M.white, c: M.cyan, y: M.yellow }, x + jit, CAP_Y + Math.sin(t * 9) * 5, 22, { anchor: 'center' });
    if (speed > 8.5) for (var k = 0; k < 3; k++) game.draw.line(x - 60 + k * 60, CAP_Y + 110, x - 60 + k * 60, CAP_Y + 170 + Math.sin(t * 20 + k) * 20, M.cyan, 4);
  }

  function drawThumb() {
    var t = game.time.elapsed;
    game.draw.rect(0, 1440, W, H - 1440, M.ink);
    game.draw.rect(40, 1520, W / 2 - 60, 220, M.dusk, 0.6 + 0.1 * Math.sin(t * 3));
    game.draw.rect(W / 2 + 20, 1520, W / 2 - 60, 220, M.dusk, 0.6 + 0.1 * Math.sin(t * 3 + 1));
    for (var a = 0; a < 3; a++) {
      game.draw.rect(W * 0.25 - 60 + a * 20, 1630 - a * 20, 20, 40 + a * 40, M.yellow);
      game.draw.rect(W * 0.75 + 40 - a * 20, 1630 - a * 20, 20, 40 + a * 40, M.yellow);
    }
    for (var h = 0; h < MAX_HIT; h++) game.draw.circle(W / 2 - 80 + h * 80, 1810, 22, h < hits ? M.bad : M.rockHi);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 228, M.ink, 0.85);
    show(Math.min(GOAL, Math.floor(dist)) + ' / ' + GOAL, W / 2, 95, 66, M.white);
    show(String(Math.ceil(timer)), 60, 95, 52, M.yellow, 'left');
    game.draw.rect(60, 160, W - 120, 22, M.rock);
    game.draw.rect(60, 160, (W - 120) * Math.min(1, dist / GOAL), 22, M.cyan);
    game.draw.rect(60, 192, (W - 120) * Math.max(0, timer / TIME_LIMIT), 10, timer < 5 ? M.bad : M.yellow);
  }

  function result() { return Math.round(timer * 60) + (MAX_HIT - hits) * 100 + ridges * 40 + 200; }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (leg === undefined) begin();
      stepDemo(dt);
      drawGround(); drawThings(); drawPod(); drawThumb();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 13 });
      game.draw.rect(0, 0, W, 228, M.ink, 0.85);
      show(GAME_TITLE, W / 2, 95 + Math.sin(t * 2) * 6, 76, M.yellow);
      show('HI-SCORE ' + game.best, W / 2, 180, 36, M.white);
      if (Math.floor(t * 1.8) % 2 === 0) show('► 100円 投入 ◄', W / 2, H * 0.97, 40, M.yellow);
      else show('INSERT COIN', W / 2, H * 0.97, 34, M.white);
      return;
    }
    if (state === S.RESULT) {
      drawGround(); drawThumb();
      show(arrived ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.42, 92, arrived ? M.yellow : M.bad);
      show('SCORE ' + (arrived ? result() : 0), W / 2, H * 0.48, 44, M.white);
      if (Math.floor(t * 2) % 2 === 0) show('TAP TO CONTINUE', W / 2, H * 0.97, 38, M.white);
      return;
    }

    if (leg === 'ready') {
      readyT -= dt;
      if (readyT <= 0) { leg = 'run'; game.audio.play('se_jump', 0.4); }
    } else if (leg === 'run') {
      if (stunT > 0) stunT -= dt;
      else {
        timer -= dt;
        var hit = roll1(dt, 1);
        if (hit) crash(hit, false);
        if (!halfway && dist >= GOAL / 2) {
          halfway = true;
          game.audio.play('se_milestone', 0.5);
          game.fx.popup(Math.floor(dist) + ' / ' + GOAL, W / 2, 330, { color: M.cyan, size: 70 });
        }
        if (dist >= GOAL) { dist = GOAL; end(true); }
        else if (timer <= 0) { timer = 0; end(false); }
      }
    } else if (leg === 'stop') {
      stopT -= dt;
      if (stopT <= 0) { leg = 'tail'; tailT = 1.4; }
    } else if (leg === 'tail') {
      tailT -= dt;
      if (tailT <= 0) {
        state = S.RESULT;
        var stats = { distance: Math.floor(dist), hits: hits, ridges: ridges, seconds: Math.round((TIME_LIMIT - timer) * 10) / 10 };
        if (arrived) game.end.success(result(), stats); else game.end.failure(stats);
        return;
      }
    }

    drawGround(); drawThings(); drawPod(); drawThumb(); drawHud();
    if (crashAt) {
      crashAt.t -= dt;
      if (Math.floor(t * 16) % 2 === 0) game.draw.circle(crashAt.x, crashAt.y, 150, M.white, 0.45);
      if (crashAt.t <= 0 && leg !== 'stop') crashAt = null;
    }
    if (leg === 'ready') show(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 100, M.yellow);
    if (leg === 'tail') {
      game.draw.rect(0, H * 0.35, W, H * 0.17, M.ink, 0.88);
      show(arrived ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 92, arrived ? M.yellow : M.bad);
      if (arrived && result() > game.best) show('NEW RECORD', W / 2, H * 0.46, 46, M.yellow);
      else if (arrived) show('BEST ' + game.best, W / 2, H * 0.46, 40, M.white);
      else show('あと' + Math.max(1, GOAL - Math.floor(dist)) + 'm!', W / 2, H * 0.46, 48, M.white);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['D5', 0.25], ['F5', 0.25], ['A5', 0.5], ['G5', 0.25], ['F5', 0.25], ['E5', 0.5],
      ['C5', 0.25], ['E5', 0.25], ['G5', 0.5], ['F5', 0.25], ['E5', 0.25], ['D5', 0.5]
    ], { tempo: 160, wave: 'sawtooth', volume: 0.035, loop: true, bass: [['D3', 1], ['D3', 1], ['C3', 1], ['A2', 1]] });
    state = S.ATTRACT;
    begin();
  });
})(game);

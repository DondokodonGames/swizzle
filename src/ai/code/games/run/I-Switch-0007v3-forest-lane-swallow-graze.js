// I-Switch-0007v3-forest-lane-swallow-graze.js
// ツバメの縁かすめ — 若いツバメが林道を飛び抜け、迫る電線や枝の縁ぎりぎりをかすめるほど歓声が上がる。ぶつかったらそこで終わり
// 操作: タップで羽ばたく(1回で少し浮き、放っておくと沈む)。前へは自動で飛ぶ。電線(横線)・上から垂れる枝・下から伸びる藪が流れてくるので、縁からの隙間が小さいほど高得点(PERFECT/GOOD/NICE)。離れすぎると連続が切れる。1回でもぶつかるとその場でGAME OVER。地面と梢は柔らかく、触れても止まらない
// 終わり: 16秒飛び切った時点で歓声メーター(1200点)が満タンならCLEAR。障害にぶつかる/メーター未達で林道の出口に着くとGAME OVER
// @mechanic: near_miss
// @theme: forest_lane_swallow_graze
// 世界観: 初夏の林道で、巣立ったばかりの若いツバメが、林道をまたぐ電線や張り出した枝・藪の縁ぎりぎりをわざとかすめて飛び、見守る親鳥を沸かせながら林の出口の明るみまで飛び抜ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 歓声スコア・PERFECT数・最大連続・飛んだ秒数
// スタイル: 70s MONO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s MONO: 白いドット絵 + 画面に貼った色セロハンの帯(上=空の水色、中=木漏れ日の琥珀、下=藪の緑)
  var STYLE = { bg: ['#000000', '#0a0a0a'], main: ['#ffffff', '#b8b8b8', '#6a6a6a'], accent: ['#6ad0ff', '#ffc85a', '#7ae07a'] };
  var C = { black: STYLE.bg[0], white: STYLE.main[0], grey: STYLE.main[1], dim: STYLE.main[2], cyan: STYLE.accent[0], amber: STYLE.accent[1], green: STYLE.accent[2] };

  var GAME_TITLE = 'SWALLOW GRAZE';
  var TIME_LIMIT = 16;
  var QUOTA = 1200;
  var BIRD_X = 300, BIRD_R = 26;
  var FLAP = 640, GRAV = 1500;
  var CEIL = 260, FLOOR = Math.round(H * 0.8);
  var BAND1 = 700, BAND2 = 1320;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var by, bvy, obs, spawnT, playT, readyT, stopT, focus, flapT, score, streak, maxStreak, perfects, over, won, outroT, milestone, prevBest, hit;

  function initGame() {
    by = H * 0.5; bvy = 0; obs = []; spawnT = 1.0; playT = 0; readyT = 0.8; stopT = 0; focus = null; flapT = 0;
    score = 0; streak = 0; maxStreak = 0; perfects = 0; over = false; won = false; outroT = 0; milestone = false; prevBest = game.best; hit = false;
  }

  function speed() { return 520 + Math.min(1, playT / TIME_LIMIT) * 120; }

  // 障害: wire(横線 y) / top(上から y まで垂れる枝) / bot(下から y まで伸びる藪)
  function spawn() {
    var kind, y, len = game.random(220, 420);
    var roll = game.random(0, 1);
    if (playT < 5) kind = roll < 0.6 ? 'wire' : (roll < 0.8 ? 'top' : 'bot');
    else kind = roll < 0.4 ? 'wire' : (roll < 0.7 ? 'top' : 'bot');
    if (kind === 'wire') y = game.random(CEIL + 200, FLOOR - 200);
    else if (kind === 'top') y = game.random(CEIL + 260, FLOOR - 320);
    else y = game.random(CEIL + 320, FLOOR - 260);
    obs.push({ kind: kind, x: W + 160, y: y, len: len, passed: false, flash: 0, born: 0.5 });
    // 中盤から、電線と枝の2段構え(隙間を通す)
    if (playT > 7 && kind === 'wire' && game.random(0, 1) < 0.5) {
      var y2 = y + (game.random(0, 1) < 0.5 ? -1 : 1) * game.random(190, 260);
      if (y2 > CEIL + 150 && y2 < FLOOR - 150) obs.push({ kind: 'wire', x: W + 160, y: y2, len: len, passed: false, flash: 0, born: 0.5 });
    }
    return playT < 5 ? 1.5 : (playT < 10 ? 1.25 : 1.05);
  }

  // 障害の縁と鳥の距離(負なら重なり)
  function clearance(o) {
    if (o.kind === 'wire') return Math.abs(by - o.y) - BIRD_R - 4;
    if (o.kind === 'top') return (by - BIRD_R) - o.y;
    return o.y - (by + BIRD_R);
  }
  function inRange(o) { return o.x - o.len / 2 < BIRD_X + BIRD_R && o.x + o.len / 2 > BIRD_X - BIRD_R; }

  function flap(demo) {
    bvy = -FLAP; flapT = 0.18;
    game.audio.tone(demo ? 520 : 620, 0.05, { wave: 'triangle', volume: 0.06, slide: 200 });
  }

  function stepWorld(dt, demo) {
    playT += dt;
    var sp = speed();
    if (flapT > 0) flapT -= dt;
    bvy += GRAV * dt; by += bvy * dt;
    if (by < CEIL) { by = CEIL; bvy = Math.max(0, bvy); }
    if (by > FLOOR) { by = FLOOR; bvy = Math.min(0, bvy) * 0.2; }
    spawnT -= dt;
    if (spawnT <= 0) spawnT = spawn();
    var crash = null;
    for (var i = obs.length - 1; i >= 0; i--) {
      var o = obs[i];
      o.x -= sp * dt;
      if (o.flash > 0) o.flash -= dt;
      if (o.born > 0) o.born -= dt;
      if (inRange(o) && !o.passed) {
        var c = clearance(o);
        if (c < 0) { crash = o; o.passed = true; }
        else { o.best = o.best === undefined ? c : Math.min(o.best, c); }
      }
      if (!o.passed && o.x + o.len / 2 < BIRD_X - BIRD_R) { o.passed = true; if (o.best !== undefined) graze(o, o.best, demo); }
      if (o.x < -400) obs.splice(i, 1);
    }
    return crash;
  }

  function graze(o, c, demo) {
    var tier = c < 22 ? 3 : (c < 60 ? 2 : (c < 110 ? 1 : 0));
    if (tier === 0) {
      if (streak > 1) game.audio.tone(300, 0.08, { wave: 'triangle', volume: 0.05, slide: -120 });
      streak = 0; return;
    }
    if (tier >= 2) streak++;
    maxStreak = Math.max(maxStreak, streak);
    var pts = Math.round((tier === 3 ? 200 : (tier === 2 ? 100 : 40)) * (1 + Math.min(4, streak) * 0.25));
    var word = tier === 3 ? 'PERFECT' : (tier === 2 ? 'GOOD' : 'NICE');
    if (tier === 3) perfects++;
    o.flash = 0.4;
    if (!demo) score += pts;
    game.feedback.good(BIRD_X + 40, by - 90, { text: word, color: tier === 3 ? C.amber : C.white, size: 44 + tier * 8, sound: tier === 3 ? 'se_coin' : 'se_good', volume: 0.3, count: 6 + tier * 4 });
    game.fx.popup('+' + pts, BIRD_X + 60, by - 180, { color: C.amber, size: 50 });
    if (streak >= 2) game.audio.tone(520 + streak * 70, 0.06, { wave: 'square', volume: 0.04 });
    if (!demo && !milestone && score >= QUOTA) {
      milestone = true;
      game.fx.popup('CLEAR ' + QUOTA, W / 2, H * 0.34, { color: C.amber, size: 70 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function onCrash(o, demo) {
    o.flash = 0.6; focus = o; stopT = 0.5; hit = true; streak = 0;
    game.feedback.bad(BIRD_X, by - 60, { text: 'MISS', shake: demo ? 6 : 16 });
    game.audio.play('se_break', 0.45);
  }

  function finish(ok) {
    over = true; won = ok; outroT = 1.5;
    game.audio.stopBgm();
    if (ok) {
      score += perfects * 20;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 5; i++) game.fx.burst(game.random(200, 880), game.random(400, 1200), { color: i % 2 ? C.amber : C.white, count: 22, speed: 440 });
      game.fx.flash(C.white, 0.25);
    } else game.audio.play('se_failure', 0.5);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || readyT > 0 || stopT > 0) { game.audio.tone(200, 0.03, { wave: 'square', volume: 0.03 }); return; }
    flap(false);
    game.fx.burst(BIRD_X - 30, by + 30, { color: C.white, count: 4, speed: 120 });
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.black, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  // ツバメ: 羽上げ/羽下げ/滑空(燕尾が割れる) + ぶつかり
  var BIRD = [
    ['....ww......', '...www......', '..wwwwwwww..', 'wwwwwwwwwwww', '..wwwwwwwwo.', '....wwww....', '......w.w...', '.......w.w..'],
    ['......w.w...', '....wwww....', '..wwwwwwww..', 'wwwwwwwwwwww', '..wwwwwwwwo.', '...www......', '....ww......', '............'],
    ['............', '..wwwwwwww..', 'wwwwwwwwwwww', '..wwwwwwwwo.', '....wwww....', '......w.w...', '.......w.w..', '............'],
    ['..w......w..', '...w.ww.w...', '..wwwwwwww..', 'wwwwwwwwwwww', '..wwwwwwwwo.', '...w.ww.w...', '..w......w..', '............'],
  ];
  var BPAL = { w: '#ffffff', o: '#000000' };

  function drawBackdrop() {
    var t = game.time.elapsed;
    game.draw.rect(0, 0, W, H, C.black);
    // 遠景の木立(白ドットの柱、ゆっくり流れる)
    var off1 = (playT * 90) % 180;
    for (var k = -1; k < 8; k++) {
      var kx = k * 180 - off1 + 60;
      for (var d = CEIL - 160; d < FLOOR; d += 24) game.draw.rect(kx + ((d / 24) % 2) * 6, d, 8, 10, C.dim);
      for (var l = 0; l < 5; l++) game.draw.rect(kx - 40 + l * 20, CEIL - 170 - (l % 2) * 20, 12, 12, C.dim);
    }
    // 木漏れ日(白い点のちらつき)
    for (var s = 0; s < 30; s++) if (Math.floor(t * 6 + s) % 3 !== 0) game.draw.rect((s * 139 - playT * 160) % W + ((s * 139 - playT * 160) % W < 0 ? W : 0), 300 + (s * 211) % 900, 4, 4, C.grey);
    // 地面と梢(柔らかい境)
    for (var g = 0; g < W; g += 30) game.draw.rect(g - (playT * 300) % 30, FLOOR + 30 + (g % 60 ? 0 : 12), 18, 6, C.grey);
    for (var c = 0; c < W; c += 40) game.draw.rect(c - (playT * 200) % 40, CEIL - 40 - (c % 80 ? 0 : 14), 22, 8, C.grey);
  }

  function drawObstacle(o) {
    var x0 = o.x - o.len / 2, x1 = o.x + o.len / 2;
    if (x1 < -50 || x0 > W + 200) return;
    var hl = focus === o && stopT > 0;
    var col = hl ? C.white : (o.flash > 0 ? C.amber : C.white);
    var thick = hl ? 14 : 6;
    if (o.kind === 'wire') {
      game.draw.rect(x0, o.y - thick / 2, o.len, thick, col);
      game.draw.rect(x0 - 10, o.y - 30, 12, 60, C.grey);
      game.draw.rect(x1 - 2, o.y - 30, 12, 60, C.grey);
      for (var p = 0; p < 3; p++) game.draw.rect(x0 + o.len * (p + 1) / 4 - 4, o.y - 14, 8, 8, C.grey);
    } else if (o.kind === 'top') {
      game.draw.rect(o.x - 12, CEIL - 60, 24, o.y - CEIL + 60, col);
      for (var a = 0; a < 4; a++) game.draw.rect(o.x - 60 + a * 40, CEIL + 40 + a * 40, 50, 10, C.grey);
      game.draw.rect(x0, o.y - thick, o.len, thick, col);
      for (var lf = 0; lf < 5; lf++) game.draw.rect(x0 + lf * (o.len / 5) + 10, o.y - 36 - (lf % 2) * 12, 22, 14, C.grey);
    } else {
      game.draw.rect(o.x - 12, o.y, 24, FLOOR - o.y + 60, col);
      game.draw.rect(x0, o.y, o.len, thick, col);
      for (var b = 0; b < 6; b++) game.draw.rect(x0 + b * (o.len / 6) + 6, o.y + 20 + (b % 2) * 16, 20, 26, C.grey);
    }
    if (o.born > 0 && Math.floor(game.time.elapsed * 12) % 2 === 0) game.draw.rect(Math.min(W - 30, x0) - 6, o.y - 8, 16, 16, C.amber);
    if (hl) game.draw.circle(BIRD_X, by, 110, C.white, 0.45);
  }

  function drawBird() {
    var t = game.time.elapsed;
    var fr = stopT > 0 ? BIRD[3] : (flapT > 0.09 ? BIRD[0] : (flapT > 0 ? BIRD[1] : (bvy > 300 ? BIRD[2] : BIRD[Math.floor(t * 8) % 2])));
    game.draw.sprite(fr, BPAL, BIRD_X, by, stopT > 0 ? 7 : 6, { anchor: 'center' });
    // 当たり判定の目安(翼のつけ根の点)
    game.draw.rect(BIRD_X - 3, by - 3, 6, 6, C.black);
  }

  function drawCellophane() {
    game.draw.rect(0, 0, W, BAND1, C.cyan, 0.22);
    game.draw.rect(0, BAND1, W, BAND2 - BAND1, C.amber, 0.2);
    game.draw.rect(0, BAND2, W, H - BAND2, C.green, 0.24);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.black, 0.9);
    label('SCORE ' + score, 270, 90, 56, C.white);
    if (streak >= 2) label('COMBO x' + streak, 270, 170, 40, C.amber);
    var p = Math.min(1, score / QUOTA);
    game.draw.rect(560, 76, 460, 30, C.dim);
    game.draw.rect(560, 76, 460 * p, 30, p >= 1 ? C.green : C.amber);
    game.draw.rect(1014, 68, 6, 46, C.white);
    game.draw.text(Math.min(score, QUOTA) + ' / ' + QUOTA, 790, 100, { size: 26, color: C.black, bold: true, align: 'center' });
    var tl = Math.max(0, 1 - playT / TIME_LIMIT);
    game.draw.rect(560, 150, 460, 16, C.dim);
    game.draw.rect(560, 150, 460 * tl, 16, tl < 0.25 ? C.amber : C.white);
    game.draw.text('PERFECT ' + perfects, 790, 205, { size: 28, color: C.grey, bold: true, align: 'center' });
  }

  function drawScene() {
    drawBackdrop();
    for (var i = 0; i < obs.length; i++) drawObstacle(obs[i]);
    drawBird();
    drawCellophane();
  }

  // ---- ATTRACT: 実ロジックで縁をかすめて飛び、周期の終わりに電線へ当たって見せる ----
  var demo = { t: 0, press: 0 };
  function targetY() {
    var best = null;
    for (var i = 0; i < obs.length; i++) {
      var o = obs[i];
      if (o.passed || o.x + o.len / 2 < BIRD_X) continue;
      if (!best || o.x < best.x) best = o;
    }
    if (!best) return H * 0.5;
    var margin = demo.t % 9 > 7.3 ? -10 : 14;
    if (best.kind === 'wire') return best.y + (by < best.y ? -1 : 1) * (BIRD_R + 4 + margin);
    if (best.kind === 'top') return best.y + BIRD_R + margin;
    return best.y - BIRD_R - margin;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 9;
    if (demo.t <= dt || cyc < dt) { initGame(); readyT = 0; }
    if (demo.press > 0) demo.press -= dt;
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) { focus = null; demo.t = 0; } return; }
    var ty = targetY();
    var predicted = by + bvy * 0.25;
    if (predicted > ty && bvy > -200) { flap(true); demo.press = 0.15; }
    var crash = stepWorld(dt, true);
    if (crash) onCrash(crash, true);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(W * 0.68, H * 0.86, { press: demo.press > 0, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.black, 0.9);
      label(GAME_TITLE, W / 2, 105, 86 + Math.sin(t * 3) * 3, C.amber);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 36, C.white);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.42, 52, C.amber);
      else label('TAP TO START', W / 2, H * 0.42, 46, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.27, W, H * 0.27, C.black, 0.88);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 100, won ? C.green : C.amber);
      label('SCORE ' + score, W / 2, H * 0.39, 54, C.white);
      label('PERFECT ' + perfects + '  COMBO ' + maxStreak, W / 2, H * 0.435, 38, C.amber);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.485, 48, C.amber);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.485, 36, C.white);
      if (!won && !hit && score < QUOTA) label('あと' + (QUOTA - score) + '点!', W / 2, H * 0.25, 56, C.amber);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.565, 36, C.white);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (stopT > 0) stopT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, perfects: perfects, maxCombo: maxStreak, seconds: Math.round(playT) };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.35);
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) { focus = null; finish(false); }
    } else {
      var crash = stepWorld(dt, false);
      if (crash) onCrash(crash, false);
      else if (playT >= TIME_LIMIT) finish(score >= QUOTA);
      else if (TIME_LIMIT - playT < 3 && Math.floor(playT * 4) !== Math.floor((playT - dt) * 4)) game.audio.tone(score >= QUOTA ? 880 : 660, 0.05, { wave: 'square', volume: 0.04 });
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 110, C.amber);
    if (over && !won && !hit) label('TIME UP', W / 2, H * 0.42, 96, C.amber);
    if (over && won) label('FINISH', W / 2, H * 0.42, 100, C.amber);
  });

  game.onStart(function() {
    // 初夏の林道のそよぎ(オリジナル): 三拍子で軽く
    game.audio.melody([
      ['A4', 0.5], ['C5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['B4', 0.5], ['A4', 1], ['E5', 0.5],
      ['F5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['B4', 1.5], ['R', 0.5],
    ], { tempo: 150, wave: 'triangle', volume: 0.045, loop: true, bass: [['A2', 1.5], ['E2', 1.5], ['F2', 1.5], ['E2', 1.5]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

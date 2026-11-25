// I-Switch2-0001v2-taichi-pose-pairs.js
// 型札あわせ — 伏せた型の絵札を2枚ずつめくり、腕と脚の向きまで同じ構えの対を見つけて揃える。左右反転の型はよく似た別物
// 操作: 札をタップするとめくれる。2枚目が同じ型なら揃って講師がその型を舞い、違えば少しして伏せ直る(その間に別の札をタップするとすぐ伏せ直って次をめくれる)。始めの一瞬だけ全部の札が表を見せる。左右の腕・脚が入れ替わっただけの鏡写しの型や、膝の上がり方だけ違う型が混ざる
// 終わり: 18秒以内に6組すべて揃えればCLEAR。外す(息が1つ減る)のが8回で息切れ/時間切れでGAME OVER
// @mechanic: pair_match
// @theme: taichi_pose_pairs
// 世界観: 早朝の公園の体操広場で、太極拳の講師が、生徒に配る前の伏せた型の絵札をめくり、鏡写しの紛らわしい型を見分けながら同じ構えの対を揃えて朝の演武の順を組む
// 残るもの: 正誤(CLEAR/GAME OVER) + 揃えた組数・外した回数・最大連続
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白黒2値。中間の濃さは市松のディザで作り、線の太さで語る
  var STYLE = { bg: ['#f4f1e8', '#e8e4d8'], main: ['#141414'], accent: ['#f4f1e8', '#141414'] };
  var C = { paper: STYLE.bg[0], paper2: STYLE.bg[1], ink: STYLE.main[0] };

  var GAME_TITLE = 'KATA PAIRS';
  var TIME_LIMIT = 18;
  var PAIRS = 6;
  var BREATH = 8;
  var COLS = 4, ROWS = 3, CW = 214, CH = 250, GX = 30, GY = 30;
  var GRID_X0 = (W - (COLS * CW + (COLS - 1) * GX)) / 2 + CW / 2, GRID_Y0 = 720;
  var PREVIEW = 1.0;

  // 型: [左上腕, 左前腕, 右上腕, 右前腕, 左腿, 左すね, 右腿, 右すね] 角度(0=真下, 90=画面右, 180=真上, -90=画面左)
  var BASE = {
    crane: [-150, -175, 70, 95, -15, -5, 15, 5],
    tee: [-90, -90, 90, 90, -25, -25, 25, 25],
    knee: [-35, -120, 35, 120, -12, -8, 95, 0],
    sky: [-170, -175, 170, 175, -10, -10, 10, 10],
    push: [-60, -105, 140, 165, -50, -10, 8, 4],
    ball: [-100, -155, 100, 155, -30, -30, 30, 30],
  };
  function mirror(p) { return [-p[2], -p[3], -p[0], -p[1], -p[6], -p[7], -p[4], -p[5]]; }
  function kneeL(p) { return [p[0], p[1], p[2], p[3], -95, 0, 12, 8]; }

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var cards, open, matched, misses, breath, combo, maxCombo, score, playT, readyT, previewT, stopT, focus, over, won, outroT, showT,
    teacherPose, teacherT, milestone, mood;

  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(game.random(0, i + 1)); if (j > i) j = i; var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  function buildDeck() {
    // 紛らわしい家族(元の型とその鏡写し/膝違い)を2つ、普通の型を2つ
    var fams = shuffle([
      [BASE.crane, mirror(BASE.crane)],
      [BASE.push, mirror(BASE.push)],
      [BASE.knee, kneeL(BASE.knee)],
    ]);
    var plain = shuffle([BASE.tee, BASE.sky, BASE.ball]);
    var poses = [fams[0][0], fams[0][1], fams[1][0], fams[1][1], plain[0], plain[1]];
    var deck = [];
    for (var i = 0; i < poses.length; i++) { deck.push(i); deck.push(i); }
    shuffle(deck);
    cards = [];
    for (var k = 0; k < deck.length; k++) {
      var col = k % COLS, row = Math.floor(k / COLS);
      cards.push({ id: deck[k], pose: poses[deck[k]], x: GRID_X0 + col * (CW + GX), y: GRID_Y0 + row * (CH + GY), up: false, flip: 0, done: false, shake: 0, seen: false });
    }
  }

  function initGame() {
    buildDeck();
    open = []; matched = 0; misses = 0; breath = BREATH; combo = 0; maxCombo = 0; score = 0; playT = 0;
    readyT = 0.8; previewT = PREVIEW; stopT = 0; focus = null; over = false; won = false; outroT = 0; showT = 0;
    teacherPose = BASE.ball; teacherT = 0; milestone = false; mood = 0;
  }

  function cardAt(x, y) {
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      if (Math.abs(x - c.x) < CW / 2 && Math.abs(y - c.y) < CH / 2) return c;
    }
    return null;
  }

  function closeOpen() {
    for (var i = 0; i < open.length; i++) open[i].up = false;
    open = []; showT = 0;
  }

  // ---- めくる(本番もデモも同じ処理) ----
  function flipCard(c, demo) {
    if (!c || c.done || c.up) { game.audio.tone(200, 0.04, { wave: 'square', volume: 0.03 }); return; }
    if (open.length >= 2) closeOpen();
    c.up = true; c.seen = true;
    open.push(c);
    game.audio.tone(open.length === 1 ? 520 : 620, 0.05, { wave: 'triangle', volume: 0.06 });
    if (open.length < 2) return;
    var a = open[0], b = open[1];
    if (a.id === b.id) {
      a.done = true; b.done = true; open = [];
      matched++; combo++; maxCombo = Math.max(maxCombo, combo); mood = 0.8;
      teacherPose = a.pose; teacherT = 1.2;
      var pts = Math.round(150 * (1 + Math.min(5, combo - 1) * 0.3));
      if (!demo) score += pts;
      game.feedback.good(b.x, b.y - 40, { text: combo >= 2 ? 'PERFECT' : 'GOOD', color: C.ink, size: 48, sound: combo >= 2 ? 'se_coin' : 'se_good', volume: 0.3, count: 12 });
      game.fx.burst(a.x, a.y, { color: C.ink, count: 10, speed: 260 });
      if (!demo && matched === 3 && !milestone) {
        milestone = true;
        game.fx.popup('3 / ' + PAIRS, W / 2, 620, { color: C.ink, size: 64 });
        game.audio.play('se_milestone', 0.45);
      }
    } else {
      combo = 0; mood = -0.6; showT = 0.75;
      a.shake = 0.3; b.shake = 0.3;
      if (!demo) { misses++; breath--; }
      game.feedback.bad(b.x, b.y - 40, { text: null, shake: 4, sound: 'se_bad', volume: 0.25 });
      if (!demo && breath <= 0) {
        focus = [a, b]; stopT = 0.5;
        game.audio.play('se_break', 0.35);
        finish(false);
      }
    }
  }

  function finish(ok) {
    over = true; won = ok; outroT = ok ? 1.5 : 1.6;
    game.audio.stopBgm();
    if (ok) {
      score += breath * 60 + Math.max(0, Math.round((TIME_LIMIT - playT) * 40));
      mood = 2; teacherT = 2;
      game.audio.play('se_success', 0.55);
      game.fx.burst(W / 2, 420, { color: C.ink, count: 30, speed: 460 });
      game.fx.flash(C.paper, 0.3);
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
    if (over || readyT > 0 || previewT > 0) { game.audio.play('se_tap', 0.08); return; }
    var c = cardAt(x, y);
    if (c) flipCard(c, false);
    else game.audio.tone(180, 0.03, { wave: 'square', volume: 0.03 });
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, back) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: back || C.paper, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  // 棒人形の型(線の太さで描く)
  function drawPose(x, y, s, p, col, wgt) {
    var lw = Math.max(3, wgt * s);
    function seg(x0, y0, ang, len) {
      var r = ang * Math.PI / 180;
      var x1 = x0 + Math.sin(r) * len * s, y1 = y0 + Math.cos(r) * len * s;
      game.draw.line(x0, y0, x1, y1, col, lw);
      return [x1, y1];
    }
    var neckY = y - 70 * s, hipY = y + 20 * s;
    game.draw.circle(x, y - 100 * s, 24 * s, col);
    game.draw.line(x, neckY, x, hipY, col, lw * 1.2);
    var e = seg(x - 6 * s, neckY + 6 * s, p[0], 46); seg(e[0], e[1], p[1], 42);
    e = seg(x + 6 * s, neckY + 6 * s, p[2], 46); seg(e[0], e[1], p[3], 42);
    e = seg(x - 4 * s, hipY, p[4], 52); seg(e[0], e[1], p[5], 50);
    e = seg(x + 4 * s, hipY, p[6], 52); seg(e[0], e[1], p[7], 50);
  }

  // 市松のディザ(中間の濃さ)
  function dither(x, y, w, h, step) {
    for (var yy = 0; yy < h; yy += step) for (var xx = ((yy / step) % 2) * step; xx < w; xx += step * 2) game.draw.rect(x + xx, y + yy, step, step, C.ink);
  }

  var POND = ['..iiii..', '.i....i.', 'i......i', '.i....i.', '..iiii..'];

  function drawPlaza() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.paper], [1, C.paper2]]);
    // 遠景: 墨の木立と朝の陽(ディザ)
    dither(0, 470, W, 60, 10);
    for (var tr = 0; tr < 6; tr++) {
      var tx = 60 + tr * 190;
      game.draw.rect(tx, 380, 14, 120, C.ink);
      game.draw.circle(tx + 7, 370, 50 + (tr % 2) * 16, C.ink);
    }
    game.draw.circle(900, 300, 46 + Math.sin(t) * 2, C.ink);
    game.draw.circle(900, 300, 38, C.paper);
    // 広場の石畳(親指ゾーン)
    for (var y = 1470; y < H; y += 60) game.draw.line(0, y, W, y, C.ink, 2);
    game.draw.sprite(POND, { i: C.ink }, 140, 1760, 16, { anchor: 'center' });
  }

  function drawTeacher() {
    var t = game.time.elapsed;
    var p = teacherT > 0 ? teacherPose : [-100 + Math.sin(t * 1.2) * 15, -150 + Math.sin(t * 1.2) * 10, 100 - Math.sin(t * 1.2) * 15, 150 - Math.sin(t * 1.2) * 10, -30, -30, 30, 30];
    var hop = mood > 1 ? Math.abs(Math.sin(t * 6)) * 20 : 0;
    var x = W / 2 + (mood < -0.3 ? Math.sin(t * 30) * 4 : 0);
    game.draw.rect(x - 90, 600, 180, 12, C.ink);
    drawPose(x, 470 - hop, 1.15, p, C.ink, 13);
  }

  function drawCard(c) {
    var t = game.time.elapsed;
    var hl = focus && stopT > 0 && (focus[0] === c || focus[1] === c);
    var faceUp = c.up || c.done || previewT > 0;
    var target = faceUp ? 1 : 0;
    c.flip += (target - c.flip) * 0.35;
    var sx = Math.abs(c.flip * 2 - 1);
    var showFace = c.flip > 0.5;
    var w = CW * sx * (hl ? 1.15 : 1), h = CH * (hl ? 1.15 : 1);
    var x = c.x + (c.shake > 0 ? Math.sin(c.shake * 60) * 8 : 0), y = c.y;
    var bob = !faceUp && !c.done ? Math.sin(t * 2 + c.x * 0.01 + c.y * 0.02) * 3 : 0;
    y += bob;
    game.draw.rect(x - w / 2 - 5, y - h / 2 - 5, w + 10, h + 10, C.ink);
    if (!showFace) {
      game.draw.rect(x - w / 2, y - h / 2, w, h, C.ink);
      game.draw.circle(x, y, 60 * sx, C.paper);
      game.draw.circle(x, y, 48 * sx, C.ink);
      game.draw.rect(x + 20 * sx, y - 60, 20 * sx, 30, C.ink);
    } else if (c.done) {
      game.draw.rect(x - w / 2, y - h / 2, w, h, C.ink);
      drawPose(x, y + 30, 0.95 * sx, c.pose, C.paper, 9);
      game.draw.circle(x + w / 2 - 34, y - h / 2 + 34, 22, C.paper);
      game.draw.circle(x + w / 2 - 34, y - h / 2 + 34, 14, C.ink);
    } else {
      game.draw.rect(x - w / 2, y - h / 2, w, h, hl ? C.paper2 : C.paper);
      drawPose(x, y + 30, 0.95 * sx, c.pose, C.ink, 9);
    }
    if (c.shake > 0) c.shake -= 1 / 60;
  }

  function drawBreath() {
    // 息(残りのしくじり)を墨の輪で
    for (var i = 0; i < BREATH; i++) {
      var x = 320 + i * 90, y = H * 0.9;
      game.draw.circle(x, y, 32, C.ink);
      game.draw.circle(x, y, 22, i < breath ? C.ink : C.paper);
      if (i < breath) game.draw.circle(x + 8, y - 8, 7, C.paper);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink);
    label(matched + ' / ' + PAIRS, 220, 100, 68, C.paper, C.ink);
    label('SCORE ' + score, 220, 182, 36, C.paper, C.ink);
    var timeLeft = Math.max(0, 1 - playT / TIME_LIMIT);
    game.draw.rect(560, 80, 440, 40, C.paper);
    game.draw.rect(566, 86, 428 * timeLeft, 28, C.ink);
    if (timeLeft < 0.25) dither(566, 86, 428 * timeLeft, 28, 7);
    if (combo >= 2) label('COMBO ' + combo, 780, 182, 36, C.paper, C.ink);
  }

  function drawScene() {
    drawPlaza();
    drawTeacher();
    for (var i = 0; i < cards.length; i++) drawCard(cards[i]);
    drawBreath();
  }

  // ---- ATTRACT: 実ロジックで札をめくる。覚えた札で対を揃え、紛らわしい鏡写しで一度外して見せる ----
  var demo = { t: 0, hx: W / 2, hy: 900, target: null, wait: 0.4, press: 0 };
  function demoPick() {
    // 覚えている(一度見た)札から対を探す。なければまだ見ていない札
    var a = open.length === 1 ? open[0] : null;
    var pool = cards.filter(function(c) { return !c.done && !c.up; });
    if (a) {
      for (var i = 0; i < pool.length; i++) if (pool[i].seen && pool[i].id === a.id) return pool[i];
      for (var j = 0; j < pool.length; j++) if (!pool[j].seen) return pool[j];
      return pool[0];
    }
    for (var k = 0; k < pool.length; k++) for (var m = 0; m < pool.length; m++) if (k !== m && pool[k].seen && pool[m].seen && pool[k].id === pool[m].id) return pool[k];
    for (var n = 0; n < pool.length; n++) if (!pool[n].seen) return pool[n];
    return pool[0] || null;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 10;
    if (demo.t <= dt || cyc < dt) { initGame(); readyT = 0; previewT = 0.6; demo.target = null; demo.wait = 0.3; }
    if (previewT > 0) { previewT -= dt; return; }
    if (showT > 0) { showT -= dt; if (showT <= 0) closeOpen(); }
    if (teacherT > 0) teacherT -= dt;
    if (demo.press > 0) demo.press -= dt;
    demo.wait -= dt;
    if (!demo.target && demo.wait <= 0 && matched < PAIRS) demo.target = demoPick();
    var tg = demo.target;
    if (tg) {
      demo.hx += (tg.x - demo.hx) * Math.min(1, dt * 9); demo.hy += (tg.y - demo.hy) * Math.min(1, dt * 9);
      if (Math.hypot(tg.x - demo.hx, tg.y - demo.hy) < 16) {
        flipCard(tg, true); demo.press = 0.15; demo.target = null; demo.wait = open.length === 0 ? 0.35 : (showT > 0 ? 0.6 : 0.2);
      }
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    mood += (0 - mood) * Math.min(1, dt * 1.5);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.hx, demo.hy + 20, { press: demo.press > 0, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.ink);
      label(GAME_TITLE, W / 2, 105, 96 + Math.sin(t * 3) * 3, C.paper, C.ink);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 36, C.paper, C.ink);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.84, 52, C.ink);
      else label('TAP TO START', W / 2, H * 0.84, 46, C.ink);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.33, W, H * 0.25, C.ink);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.39, 100, C.paper, C.ink);
      label('SCORE ' + score, W / 2, H * 0.45, 54, C.paper, C.ink);
      label(matched + ' / ' + PAIRS + '  MISS ' + misses, W / 2, H * 0.495, 38, C.paper, C.ink);
      if (won && score > game.best) label('NEW RECORD', W / 2, H * 0.54, 48, C.paper, C.ink);
      else label('BEST ' + Math.max(game.best, won ? score : 0), W / 2, H * 0.54, 36, C.paper, C.ink);
      if (!won) label('あと' + Math.max(1, PAIRS - matched) + '組!', W / 2, H * 0.31, 60, C.ink);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.62, 36, C.ink);
      return;
    }

    // ---- PLAYING ----
    if (teacherT > 0) teacherT -= dt;
    if (over) {
      outroT -= dt;
      if (stopT > 0) stopT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { pairs: matched, misses: misses, maxCombo: maxCombo };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_jump', 0.3);
    } else {
      playT += dt;
      if (previewT > 0) { previewT -= dt; if (previewT <= 0) game.audio.tone(330, 0.08, { wave: 'triangle', volume: 0.06, slide: -80 }); }
      if (showT > 0) { showT -= dt; if (showT <= 0) closeOpen(); }
      if (matched >= PAIRS) finish(true);
      else if (playT >= TIME_LIMIT) finish(false);
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, 650, 100, C.ink);
    if (over && !won && breath > 0) label('TIME UP', W / 2, 650, 90, C.ink);
    if (over && won) label('FINISH', W / 2, 650, 90, C.ink);
  });

  game.onStart(function() {
    game.audio.melody([
      ['A4', 1], ['C5', 1], ['D5', 1.5], ['E5', 0.5], ['G5', 1], ['E5', 1], ['D5', 2],
      ['C5', 1], ['D5', 1], ['A4', 2], ['R', 1],
    ], { tempo: 84, wave: 'triangle', volume: 0.05, loop: true, bass: [['A2', 2], ['D3', 2], ['E2', 2], ['A2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

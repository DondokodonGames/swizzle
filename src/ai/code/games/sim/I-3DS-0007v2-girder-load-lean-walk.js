// I-3DS-0007v2-girder-load-lean-walk.js
// 鉄骨わたり — 建設中のビルの細い梁を、叩く位置で強さを変えながら重心を戻し、肩の資材に偏る体を向こうの柱まで運ぶ
// 操作: 画面の左側を叩くと重心が左へ、右側で右へ戻る。外側寄りを叩くほど強く戻り、中央寄りは小さく戻る。重心には勢いがあるので戻しすぎると反対へ倒れる。柱でクレーンから肩に資材が載るとその側へ傾き続ける。梁の継ぎ板は踏む直前に赤く点滅し、踏むと矢印の向きへ揺さぶられる
// 終わり: 3スパン(柱4本・36m)を渡り切ればCLEAR。傾きが限界を超えると落ちて命綱にぶら下がり、そのスパンの頭からやり直し。3回落ちる/22秒の時間切れでGAME OVER
// @mechanic: balance
// @theme: steel_girder_load_walk
// 世界観: 建設中の高層ビルの鉄骨の上で、とび職の見習いが柱ごとにクレーンから資材を肩に受け取り、偏る重みと継ぎ板の段差に重心を戻しながら細い梁を向こうの柱まで渡る
// 残るもの: 正誤(CLEAR/GAME OVER) + 渡ったスパン数・落ちた回数・得点
// スタイル: 90s LOW POLY

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s LOW POLY: 面は横ストリップのベタ塗り、輪郭は line、頂点を微小に揺らす。遠景はフォグで潰す
  var STYLE = { bg: ['#8fa6b8', '#c9d3d6', '#4a5866'], main: ['#c84a32', '#e8e0d0', '#2c3440'], accent: ['#f2c230', '#ff5a3c'] };
  var C = {
    sky: STYLE.bg[0], fog: STYLE.bg[1], city: STYLE.bg[2], steel: STYLE.main[0], light: STYLE.main[1], ink: STYLE.main[2],
    gold: STYLE.accent[0], red: STYLE.accent[1], ok: '#7ad37a', steelDark: '#7e2e20', navy: '#2a3a6a', skin: '#e0a878',
  };

  var GAME_TITLE = 'GIRDER WALK';
  var TIME_LIMIT = 22;
  var LIVES = 3;
  var SPAN_M = 12;
  var Z0 = 3, HORIZ = 380, NEAR_Y = 1200, BEAM_W = 150;
  // スパンごと: 歩く速さ(m/s)・梁の細さ(不安定さ)・肩の荷(-1左/1右/0なし)と重さ・継ぎ板(位置m・揺さぶる向き)
  var SPANS = [
    { v: 2.1, k: 1.7, load: 0, lb: 0, plates: [{ at: 7, d: 1 }] },
    { v: 2.5, k: 2.2, load: 1, lb: 0.8, plates: [{ at: 4, d: -1 }, { at: 9, d: 1 }] },
    { v: 2.9, k: 2.7, load: -1, lb: 1.0, plates: [{ at: 3, d: 1 }, { at: 6.5, d: -1 }, { at: 10, d: 1 }] },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var si, pos, th, om, lives, falls, score, readyT, over, won, outroT, stopT, playT, fallT, fallDir;
  var loadT, loadOn, plateDone, plateWarn, stepT, stepSide, mood, spansDone, padFx, arriveT, timeUp, steadyT;

  function initGame() {
    lives = LIVES; falls = 0; score = 0; readyT = 0.8; over = false; won = false; outroT = 0; stopT = 0; playT = 0;
    mood = 0; spansDone = 0; padFx = []; timeUp = false; steadyT = 0;
    startSpan(0);
  }

  function startSpan(i) {
    si = i; pos = 0; th = 0; om = 0; fallT = -1; fallDir = 1; stepT = 0; stepSide = 1; arriveT = -1;
    plateDone = []; plateWarn = [];
    for (var k = 0; k < SPANS[i].plates.length; k++) { plateDone.push(false); plateWarn.push(-1); }
    loadOn = false;
    loadT = SPANS[i].load !== 0 ? 0 : -1;
  }

  // 落ちたらそのスパンの頭から(載った資材はそのまま)
  function respawn() {
    pos = 0; th = 0.04 * fallDir; om = 0; fallT = -1;
    for (var k = 0; k < plateDone.length; k++) { plateDone[k] = false; plateWarn[k] = -1; }
  }

  // 1フレームの歩行と重心(本番もデモも同じ)。戻り値: 'fall' / 'goal' / null
  function stepWalk(dt) {
    var sp = SPANS[si];
    var walking = true;
    if (loadT >= 0) {
      loadT += dt;
      walking = false;
      if (!loadOn && loadT >= 0.6) {
        loadOn = true;
        game.audio.tone(170, 0.14, { wave: 'square', volume: 0.08 });
        game.fx.shake(4, 0.12);
      }
      if (loadT >= 0.95) loadT = -1;
    }
    var b = loadOn ? sp.load * sp.lb : 0;
    var kick = 0;
    if (walking) {
      pos += sp.v * dt;
      stepT += dt;
      if (stepT >= 0.42) {
        stepT -= 0.42; stepSide = -stepSide; kick += stepSide * 0.1;
        game.audio.tone(stepSide > 0 ? 300 : 262, 0.03, { wave: 'triangle', volume: 0.03 });
      }
      for (var k = 0; k < sp.plates.length; k++) {
        var pl = sp.plates[k];
        if (plateWarn[k] < 0 && pos >= pl.at - sp.v * 0.65) {
          plateWarn[k] = 0;
          game.audio.tone(880, 0.06, { wave: 'square', volume: 0.05 });
        }
        if (plateWarn[k] >= 0) plateWarn[k] += dt;
        if (!plateDone[k] && pos >= pl.at) {
          plateDone[k] = true; kick += pl.d * 1.0;
          game.audio.tone(140, 0.1, { wave: 'sawtooth', volume: 0.07 });
          game.fx.shake(6, 0.15);
        }
      }
    }
    om += (sp.k * th + b) * dt + kick;
    om *= Math.max(0, 1 - 0.7 * dt);
    th += om * dt;
    if (Math.abs(th) >= 1) { th = th > 0 ? 1 : -1; return 'fall'; }
    if (pos >= SPAN_M) { pos = SPAN_M; return 'goal'; }
    return null;
  }

  // 叩いた位置: 左右で向き、中央からの距離で強さ(内0.45〜外1.5)
  function push(x, y) {
    var side = x < W / 2 ? -1 : 1;
    var f = Math.max(0, Math.min(1, (Math.abs(x - W / 2) - 20) / 480));
    var s = 0.45 + 1.05 * f;
    var band = f < 0.34 ? 0 : (f < 0.67 ? 1 : 2);
    var wrong = th * side > 0.5;
    om += side * s;
    padFx.push({ x: x, y: Math.max(y, 1520), side: side, band: band, t: 0 });
    game.audio.tone(330 + band * 150, 0.06, { wave: 'square', volume: 0.06 });
    game.fx.burst(x, Math.max(y, 1560), { color: band === 2 ? C.gold : C.light, count: 4 + band * 3, speed: 160 + band * 90 });
    if (wrong) mood = -0.6;
  }

  function onFall(demo) {
    fallT = 0; fallDir = th > 0 ? 1 : -1; stopT = 0.45; mood = -1;
    game.feedback.bad(540 + fallDir * 90, NEAR_Y - 200, { text: 'MISS', shake: demo ? 6 : 14 });
    game.audio.play('se_break', 0.3);
    if (!demo) {
      falls++; lives--;
      if (lives <= 0) finish(false);
    }
  }

  function onGoal(demo) {
    arriveT = 0; mood = 1;
    if (!demo) {
      spansDone++;
      score += 200;
      if (spansDone < SPANS.length) game.fx.popup(spansDone + ' / ' + SPANS.length, 540, 640, { color: C.gold, size: 64 });
    }
    game.feedback.good(540, NEAR_Y - 320, { text: 'NICE', color: C.ok, size: 60 });
    game.audio.play('se_milestone', 0.45);
  }

  function finish(ok) {
    over = true; won = ok; outroT = 1.5;
    game.audio.stopBgm();
    if (ok) {
      score += lives * 100 + Math.max(0, Math.round((TIME_LIMIT - playT) * 15));
      mood = 2;
      game.audio.play('se_success', 0.55);
      game.fx.burst(540, NEAR_Y - 300, { color: C.gold, count: 30, speed: 460 });
      game.fx.burst(540, NEAR_Y - 300, { color: C.steel, count: 18, speed: 340 });
      game.fx.flash('#ffffff', 0.2);
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
    if (over || readyT > 0 || stopT > 0 || fallT >= 0 || arriveT >= 0 || y < 230) {
      game.audio.tone(200, 0.03, { wave: 'triangle', volume: 0.03 });
      return;
    }
    push(x, y);
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  function zy(z) { return HORIZ + (NEAR_Y - HORIZ) * Z0 / (z + Z0); }
  function zw(z) { return BEAM_W * Z0 / (z + Z0); }
  function jit(k) { return Math.sin(game.time.elapsed * 23 + k * 1.7) * 1.4; }

  var HEAD = ['..yyyy..', '.yyyyyy.', 'yyyyyyyy', '.kkkkkk.', '.ssssss.', '..ssss..'];
  var TORSO = ['.nnnnnn.', 'nnonnonn', 'nnonnonn', 'nnoooonn', 'nnonnonn', '.nnnnnn.', '.bbbbbb.'];
  var LEGS_A = ['.gg..gg.', '.gg..gg.', '.gg..gg.', '.gg...gg', 'kkk...kk'];
  var LEGS_B = ['.gg..gg.', '.gg..gg.', '.gg..gg.', 'gg...gg.', 'kk...kkk'];
  var PAL = { y: C.gold, k: '#1e2228', s: C.skin, n: C.navy, o: '#f08a30', b: '#40404a', g: '#4a5a7a' };
  var PAL_HL = { y: '#ffffff', k: '#ffffff', s: '#ffffff', n: '#ffffff', o: '#ffffff', b: '#ffffff', g: '#ffffff' };

  function drawWorld() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, '#6f8aa6'], [0.22, C.sky], [0.5, C.fog], [1, '#a8b2b8']]);
    // 雲(低ポリの板)
    for (var c = 0; c < 4; c++) {
      var cx = ((c * 330 + t * 14) % (W + 400)) - 200;
      game.draw.rect(cx, 280 + c * 46, 220, 26, '#e8eef0', 0.5);
      game.draw.rect(cx + 40, 262 + c * 46, 120, 20, '#e8eef0', 0.5);
    }
    // 眼下の街(フォグで潰す)
    for (var i = 0; i < 10; i++) {
      var bx = i * 118 - 30 + Math.sin(i * 1.7) * 26;
      var top = 760 + ((i * 97) % 5) * 90;
      game.draw.rect(bx, top, 104, H - top, C.city, 0.35);
      game.draw.rect(bx, top, 104, 10, '#dfe6ea', 0.35);
      game.draw.line(bx + jit(i), top, bx + jit(i), H, '#3a4450', 2);
    }
    game.draw.rect(0, 700, W, H - 700, C.fog, 0.35);
    // クレーン(塔とジブ)
    game.draw.line(940, 1440, 940 + jit(1), 150, C.gold, 10);
    game.draw.line(1000, 1440, 1000 + jit(2), 150, C.gold, 10);
    for (var r = 0; r < 12; r++) game.draw.line(940, 1440 - r * 108, 1000, 1440 - (r + 1) * 108, '#c89a20', 4);
    game.draw.line(260, 160, 1070, 160 + jit(3), C.gold, 12);
    game.draw.line(540, 160, 1000, 120, '#c89a20', 4);
  }

  function drawBeamRange(zA, zB, alpha) {
    var yA = zy(zB), yB = zy(zA);
    for (var y = Math.ceil(yA); y < yB; y += 6) {
      var z = Z0 * (NEAR_Y - HORIZ) / (y + 3 - HORIZ) - Z0;
      var w = zw(z);
      var seg = ((Math.floor(z + pos) % 2) + 2) % 2;
      game.draw.rect(540 - w * 0.62, y, w * 1.24, 7, C.steelDark, alpha);
      game.draw.rect(540 - w / 2, y, w, 7, seg === 0 ? C.steel : '#d65a3e', alpha);
    }
    game.draw.line(540 - zw(zB) / 2 + jit(4), yA, 540 - zw(zA) / 2, yB, C.ink, 3);
    game.draw.line(540 + zw(zB) / 2 + jit(5), yA, 540 + zw(zA) / 2, yB, C.ink, 3);
  }

  function drawColumn(z, alpha) {
    var y = zy(z), w = zw(z) * 1.1;
    var top = y - w * 2.4;
    game.draw.rect(540 - w * 0.65, top, w * 1.3, 1440 - top, C.steelDark, alpha);
    game.draw.rect(540 - w / 2, top, w, 1440 - top, C.steel, alpha);
    game.draw.rect(540 - w * 1.7, top, w * 3.4, w * 0.3, C.steelDark, alpha);
    game.draw.line(540 - w / 2 + jit(6), top, 540 - w / 2, 1440, C.ink, 2);
    game.draw.line(540 + w / 2 + jit(7), top, 540 + w / 2, 1440, C.ink, 2);
  }

  function drawPlates() {
    var t = game.time.elapsed;
    var sp = SPANS[si];
    for (var k = 0; k < sp.plates.length; k++) {
      var z = sp.plates[k].at - pos;
      if (z < -0.6 || z > SPAN_M - pos) continue;
      var y = zy(z), w = zw(z), d = sp.plates[k].d;
      var warn = plateWarn[k] >= 0 && !plateDone[k];
      var col = warn && Math.floor(t * 14) % 2 === 0 ? C.red : '#5a6470';
      game.draw.rect(540 - w / 2 - 6, y - w * 0.12, w + 12, w * 0.24, col);
      for (var b = 0; b < 3; b++) game.draw.circle(540 - w * 0.3 + b * w * 0.3, y, Math.max(3, w * 0.05), C.light);
      // 揺さぶる向きの矢印(段々の楔)
      for (var a = 0; a < 3; a++) {
        var ax = 540 + d * (w * 0.62 + a * w * 0.16);
        game.draw.rect(ax - w * 0.06, y - w * (0.2 - a * 0.06), w * 0.12, w * (0.4 - a * 0.12), warn ? C.red : C.gold);
      }
    }
  }

  function drawCraneLoad() {
    var sp = SPANS[si];
    var hookY = 260;
    var hang = sp.load !== 0 && !loadOn;
    if (loadT >= 0) hookY = loadOn ? NEAR_Y - 200 - Math.min(1, (loadT - 0.6) / 0.35) * 700 : 260 + Math.min(1, loadT / 0.6) * (NEAR_Y - 460);
    var sw = Math.sin(game.time.elapsed * 3) * 14;
    var hx = 540 + sp.load * 70 + sw;
    game.draw.line(540, 160, hx, hookY, '#2a2a30', 4);
    game.draw.rect(hx - 14, hookY, 28, 22, C.gold);
    if (hang && loadT >= 0) drawBundle(hx, hookY + 40, sp.load, false);
  }

  function drawBundle(x, y, side, onShoulder) {
    var len = 230;
    var x0 = onShoulder ? (side > 0 ? x - 30 : x - len + 30) : x - len / 2;
    for (var i = 0; i < 3; i++) {
      game.draw.rect(x0, y + i * 12 - 18, len, 10, i % 2 === 0 ? C.red : C.light);
    }
    game.draw.rect(x0 + 40, y - 22, 14, 40, C.ink);
    game.draw.rect(x0 + len - 54, y - 22, 14, 40, C.ink);
  }

  function drawWorker(hl) {
    var t = game.time.elapsed;
    var px = hl ? 14 : 12;
    var pal = hl && Math.floor(t * 16) % 2 === 0 ? PAL_HL : PAL;
    var bx = 540, by = NEAR_Y;
    if (fallT >= 0 && stopT <= 0) {
      var drop = Math.min(1, fallT / 0.3);
      bx = 540 + fallDir * (60 + drop * 80) + Math.sin(t * 5) * 30 * drop;
      by = NEAR_Y + drop * 300;
      game.draw.line(540, NEAR_Y - 6, bx, by - 220, C.gold, 5);
    }
    var lean = fallT >= 0 ? fallDir * 1.1 : th;
    var tx = bx + lean * 42, hx = bx + lean * 88;
    if (hl) game.draw.circle(tx, by - 150, 170, '#ffffff', 0.45);
    game.draw.circle(bx, by + 4, 50, '#000000', 0.25);
    var walking = loadT < 0 && arriveT < 0 && fallT < 0;
    var legs = walking && Math.floor(t * 4.8) % 2 === 0 ? LEGS_B : LEGS_A;
    game.draw.sprite(legs, pal, bx, by - 30, px, { anchor: 'center' });
    // 腕: 倒れる側と逆の腕を大きく振り上げる
    var shY = by - 140;
    var waveL = Math.max(0, lean) * 120 + Math.sin(t * 9) * Math.abs(lean) * 20;
    var waveR = Math.max(0, -lean) * 120 + Math.sin(t * 9 + 1) * Math.abs(lean) * 20;
    game.draw.line(tx - 44, shY, tx - 170, shY + 40 - waveL, C.navy, 18);
    game.draw.line(tx + 44, shY, tx + 170, shY + 40 - waveR, C.navy, 18);
    game.draw.circle(tx - 170, shY + 40 - waveL, 14, C.skin);
    game.draw.circle(tx + 170, shY + 40 - waveR, 14, C.skin);
    game.draw.sprite(TORSO, pal, tx, by - 102, px, { anchor: 'center' });
    if (loadOn && fallT < 0) drawBundle(tx + SPANS[si].load * 40, by - 168, SPANS[si].load, true);
    var face = mood < -0.3 ? 4 : 0;
    game.draw.sprite(HEAD, pal, hx, by - 186 + face, px, { anchor: 'center' });
  }

  function drawScene(hlWorker) {
    var remain = SPAN_M - pos;
    drawWorld();
    if (si + 1 < SPANS.length) drawColumn(remain + SPAN_M, 0.55);
    drawBeamRange(remain, remain + (si + 1 < SPANS.length ? SPAN_M : 0.4), 0.55);
    drawColumn(remain, 1);
    drawBeamRange(-0.8, remain, 1);
    drawPlates();
    // 足元より下は奈落(フォグの帯)
    game.draw.gradient(1440, H, [[0, '#9aa6ae'], [1, '#56606a']]);
    drawCraneLoad();
    drawWorker(hlWorker);
  }

  function drawLevel() {
    // 重心の針(左右の赤い端が限界)
    var x = 540, y = 300;
    game.draw.rect(x - 330, y - 26, 660, 52, C.ink);
    game.draw.rect(x - 320, y - 16, 640, 32, '#3e4a56');
    game.draw.rect(x - 320, y - 16, 70, 32, C.red);
    game.draw.rect(x + 250, y - 16, 70, 32, C.red);
    game.draw.rect(x - 80, y - 16, 160, 32, '#4f7a52');
    var nx = x + Math.max(-1, Math.min(1, th)) * 300;
    var danger = Math.abs(th) > 0.7;
    game.draw.rect(nx - 8, y - 34, 16, 68, danger && Math.floor(game.time.elapsed * 12) % 2 === 0 ? C.red : '#ffffff');
  }

  function drawPads() {
    var t = game.time.elapsed;
    for (var s = 0; s < 2; s++) {
      var side = s === 0 ? -1 : 1;
      for (var b = 0; b < 3; b++) {
        var x0 = side < 0 ? 520 - (b + 1) * 160 : 560 + b * 160;
        var lit = 0;
        for (var i = 0; i < padFx.length; i++) if (padFx[i].side === side && padFx[i].band === b) lit = Math.max(lit, 1 - padFx[i].t / 0.25);
        var base = ['#4a5866', '#5c6c7c', '#72869a'][b];
        game.draw.rect(x0 + 6, 1530, 148, 240, C.ink);
        game.draw.rect(x0 + 12, 1536, 136, 228, base);
        if (lit > 0) game.draw.rect(x0 + 12, 1536, 136, 228, C.gold, lit * 0.8);
        // 外ほど大きい山形(強さ)
        var cx = x0 + 80, cy = 1650 + Math.sin(t * 3 + b) * 4;
        var sz = 14 + b * 12;
        for (var k = 0; k < 3; k++) {
          var ox = side * (k * sz * 0.5 - sz * 0.5);
          game.draw.rect(cx + ox - sz * 0.2, cy - sz + k * sz * 0.66, sz * 0.4, sz * 2 - k * sz * 1.32, '#e8e0d0', 0.85);
        }
      }
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink, 0.82);
    label('SCORE ' + Math.floor(score), 270, 70, 44, '#ffffff');
    // 命綱のフック(残機)
    for (var l = 0; l < LIVES; l++) {
      var lx = 790 + l * 86;
      game.draw.circle(lx, 70, 28, l < lives ? C.gold : '#4a5058');
      game.draw.circle(lx, 70, 14, C.ink);
    }
    // 柱4本と現在地
    var x0 = 90, x1 = 690, yb = 160;
    game.draw.rect(x0, yb - 5, x1 - x0, 10, '#4a5058');
    var prog = Math.min(1, (si * SPAN_M + pos) / (SPAN_M * SPANS.length));
    game.draw.rect(x0, yb - 5, (x1 - x0) * prog, 10, C.steel);
    for (var c = 0; c <= SPANS.length; c++) {
      var cx = x0 + (x1 - x0) * c / SPANS.length;
      game.draw.rect(cx - 9, yb - 30, 18, 60, c <= spansDone ? C.ok : C.steel);
    }
    game.draw.circle(x0 + (x1 - x0) * prog, yb, 16, C.gold);
    var tk = Math.max(0, 1 - playT / TIME_LIMIT);
    game.draw.rect(760, 150, 270 * tk, 22, tk < 0.25 ? C.red : C.gold);
  }

  function drawPadRings(dt) {
    for (var i = padFx.length - 1; i >= 0; i--) {
      var p = padFx[i];
      p.t += dt;
      if (p.t > 0.35) { padFx.splice(i, 1); continue; }
      game.draw.circle(p.x, p.y, 30 + p.t * 220 * (1 + p.band * 0.5), '#ffffff', 0.4 * (1 - p.t / 0.35));
    }
  }

  // ---- ATTRACT: 本物の重心で2スパン目(右肩に資材)を渡って見せる。最後は手を止めて落ちる ----
  var demo = { t: 0, cool: 0, hx: 540, hy: 1650, press: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 11;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; lives = 99; startSpan(1); }
    if (stopT > 0) { stopT -= dt; return; }
    if (fallT >= 0) { fallT += dt; if (fallT > 1.0) respawn(); return; }
    if (arriveT >= 0) { arriveT += dt; if (arriveT > 0.5) startSpan(si + 1 < SPANS.length ? si + 1 : 1); return; }
    demo.cool -= dt;
    demo.press -= dt;
    var lazy = cyc > 8.6;
    if (!lazy && demo.cool <= 0 && loadT < 0.5) {
      var pred = th + om * 0.4;
      if (Math.abs(pred) > 0.15) {
        var side = pred > 0 ? -1 : 1;
        var need = Math.min(1.5, Math.max(0.45, Math.abs(om) * 0.85 + Math.abs(th) * 1.2));
        var x = 540 + side * (20 + (need - 0.45) / 1.05 * 480);
        demo.hx = x; demo.hy = 1650;
        push(x, 1650);
        demo.press = 0.16; demo.cool = 0.3;
      }
    }
    var r = stepWalk(dt);
    if (r === 'fall') onFall(true);
    else if (r === 'goal') onGoal(true);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    mood += (0 - mood) * Math.min(1, dt * 1.5);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(stopT > 0);
      drawLevel();
      drawPads();
      drawPadRings(dt);
      game.draw.hand(demo.hx, demo.hy - (demo.press > 0 ? 0 : 40), { press: demo.press > 0, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.82);
      label(GAME_TITLE, W / 2, 100, 92 + Math.sin(t * 3) * 3, C.gold);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 188, 36, '#ffffff');
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, 1460, 46, C.gold);
      else label('TAP TO START', W / 2, 1460, 42, '#ffffff');
      return;
    }

    if (state === S.RESULT) {
      drawScene(false);
      drawPads();
      game.draw.rect(0, H * 0.3, W, H * 0.25, C.ink, 0.85);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.355, 96, won ? C.ok : C.red);
      label('SCORE ' + Math.floor(score), W / 2, H * 0.41, 54, '#ffffff');
      label(spansDone + ' / ' + SPANS.length, W / 2, H * 0.455, 42, C.gold);
      if (Math.floor(score) > game.best && score > 0) label('NEW RECORD', W / 2, H * 0.5, 46, C.gold);
      else label('BEST ' + Math.max(game.best, Math.floor(score)), W / 2, H * 0.5, 38, '#ffffff');
      if (!won) {
        var left = Math.max(1, Math.ceil(SPAN_M * SPANS.length - (si * SPAN_M + pos)));
        label('あと' + left + 'm', W / 2, H * 0.535, 46, C.gold);
      }
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.6, 38, '#ffffff');
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (stopT > 0) stopT -= dt;
      else if (fallT >= 0) fallT += dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { spans: spansDone, falls: falls, score: Math.floor(score) };
        if (won) game.end.success(Math.floor(score), stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.5);
    } else if (stopT > 0) {
      stopT -= dt;
      playT += dt;
    } else {
      playT += dt;
      if (fallT >= 0) {
        fallT += dt;
        if (fallT > 1.0) respawn();
      } else if (arriveT >= 0) {
        arriveT += dt;
        if (arriveT > 0.5) {
          arriveT = -1;
          if (si + 1 >= SPANS.length) finish(true);
          else startSpan(si + 1);
        }
      } else {
        var r = stepWalk(dt);
        if (r === 'fall') onFall(false);
        else if (r === 'goal') onGoal(false);
        else if (Math.abs(th) < 0.3 && loadT < 0) {
          score += dt * 50;
          steadyT += dt;
          if (steadyT >= 3) { steadyT = 0; game.fx.popup('+50', 540, NEAR_Y - 420, { color: C.ok, size: 44 }); score += 50; }
        } else steadyT = 0;
      }
      if (!over && playT >= TIME_LIMIT) { timeUp = true; finish(false); }
    }

    drawScene(stopT > 0 && fallT >= 0);
    drawLevel();
    drawPads();
    drawPadRings(dt);
    drawHud();
    // 開始直後のお手本: 傾いている側と逆のパッドに手を一度だけ出す
    if (!over && readyT <= 0 && playT < 1.2) {
      var hs = th > 0 ? -1 : 1;
      game.draw.hand(540 + hs * 300, 1650, { press: Math.floor(t * 4) % 2 === 0, scale: 12, alpha: 0.6 });
    }
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 100, C.gold);
    if (over && timeUp) label('TIME UP', W / 2, H * 0.4, 90, C.red);
  });

  game.onStart(function() {
    game.audio.melody([
      ['D4', 0.5], ['F#4', 0.5], ['A4', 0.5], ['C5', 0.5], ['B4', 1], ['A4', 1],
      ['G4', 0.5], ['A4', 0.5], ['F#4', 0.5], ['E4', 0.5], ['D4', 2],
    ], { tempo: 104, wave: 'square', volume: 0.05, loop: true, bass: [['D2', 2], ['C3', 2], ['G2', 2], ['A2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

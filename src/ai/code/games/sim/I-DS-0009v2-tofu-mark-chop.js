// I-DS-0009v2-tofu-mark-chop.js
// 豆腐の目印切り — 奥から水槽を流れてくる豆腐の光る目印が、包丁の真下に来た瞬間に包丁を下ろして切り分ける
// 操作: 画面のどこかをタップすると包丁がストンと下りる。豆腐に光る線が包丁の影の線に重なった瞬間に下ろす。近づくほど流れは速く見える
// 終わり: 18秒以内に目印を12本切ればCLEAR。ずれた切り・目印の見逃し・何もない所での空切りが3回/時間切れでGAME OVER
// @mechanic: drop_timing
// @theme: morning_tofu_shop_mark_chop
// 世界観: 朝の豆腐屋の作業場で、手ぬぐいを巻いた豆腐職人が水槽を奥から流れてくる大きな豆腐の光る目印を見て、包丁の真下に来た瞬間に刃を下ろして売り物の大きさに切り分ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 切った本数・PERFECT数・最大連続・スコア
// スタイル: 2000s BILLBOARD 3D

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s BILLBOARD 3D: 物は板のまま、距離で大きさを変える。真下に楕円の接地影。奥ほど彩度を落とす
  var STYLE = { bg: ['#cfe0e6', '#7aa0ae'], main: ['#f6f4ea', '#3e6e8a', '#c9a46a'], accent: ['#ffd23a', '#2a3038'] };
  var MIST = STYLE.bg[0], WATER = STYLE.bg[1], TOFU = STYLE.main[0], BLUE = STYLE.main[1], WOOD = STYLE.main[2], MARK = STYLE.accent[0], INK = STYLE.accent[1];
  var STEEL = '#c8d0d8', RED = '#d8463a';

  var TITLE = 'TOFU CHOP';
  var TIME_LIMIT = 18;
  var NEEDED = 12;
  var STRIKES = 3;
  var HY = H * 0.20, NEAR_Y = H * 0.86;
  var CUT_Y = H * 0.64;
  var Z_CUT = Math.sqrt((CUT_Y - HY) / (NEAR_Y - HY));
  var PERFECT_PX = 20, GOOD_PX = 55;
  var SLAB_L = 0.16;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var MASTER = [
    ['..wwwwwww...', '.wbwbwbwbw..', '.hffffffh...', '.feeffeef...', '.fkeffkef...', '.ffffffff...', '..ffmmff....', '.aaaaaaaaa..', 'aaaaaaaaaaff', 'aaaaaaaaaff.', '.aaaaaaaa...', '.pp....pp...'],
    ['..wwwwwww...', '.wbwbwbwbw..', '.hffffffh...', '.feeffeef...', '.fekffekf...', '.ffffffff...', '..fmmmmf....', '.aaaaaaaaaff', 'aaaaaaaaaaf.', 'aaaaaaaaa...', '.aaaaaaaa...', '.pp....pp...'],
    ['f.wwwwwww.f.', 'fwbwbwbwbwf.', '.hffffffh...', '.feeffeef...', '.fkeffkef...', '.ffmmmmff...', '..ffffff....', '.aaaaaaaaa..', '.aaaaaaaaa..', '.aaaaaaaaa..', '.aaaaaaaa...', 'pp......pp..'],
    ['............', '..wwwwwww...', '.wbwbwbwbw..', '.hffffffh...', '.fkkffkkf...', '.ffffffff...', '..ffmmff....', '.aaaaaaaaa..', 'faaaaaaaaaf.', '.aaaaaaaaa..', '.aaaaaaaa...', '.pp....pp...'],
  ];

  function label(s, x, y, sz, col) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: INK, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  // ── 奥行き: z=0 奥(地平) → z=1 手前 ──
  function yOf(z) { return HY + (NEAR_Y - HY) * z * z; }
  function sc(z) { return 0.18 + 0.92 * z; }
  function zOf(y) { return Math.sqrt(Math.max(0, (y - HY) / (NEAR_Y - HY))); }

  // ── 豆腐(プレイ・デモ共通)。z は豆腐の手前の端、marks は手前の端からの距離 ──
  function makeSlab(z, marks) {
    var list = [];
    for (var i = 0; i < marks.length; i++) list.push({ off: marks[i] * SLAB_L, cut: false, missed: false, grade: '' });
    return { z: z, marks: list };
  }
  function markZ(s, m) { return s.z - m.off; }
  function markPx(s, m) { return yOf(markZ(s, m)) - CUT_Y; }

  // 包丁を下ろした瞬間の判定: いちばん近い未処理の目印
  function chopJudge(slabs) {
    var best = null, bestD = 1e9;
    for (var i = 0; i < slabs.length; i++) {
      var s = slabs[i];
      for (var j = 0; j < s.marks.length; j++) {
        var m = s.marks[j];
        if (m.cut || m.missed) continue;
        var d = Math.abs(markPx(s, m));
        if (d < bestD) { bestD = d; best = m; }
      }
    }
    if (best && bestD <= GOOD_PX) { best.cut = true; best.grade = bestD <= PERFECT_PX ? 'PERFECT' : 'GOOD'; return best.grade; }
    return 'MISS';
  }

  function stepSlabs(slabs, dt, v, onMissed) {
    for (var i = 0; i < slabs.length; i++) {
      var s = slabs[i];
      s.z += v * dt;
      for (var j = 0; j < s.marks.length; j++) {
        var m = s.marks[j];
        if (!m.cut && !m.missed && markPx(s, m) > GOOD_PX) { m.missed = true; if (onMissed) onMissed(s, m); }
      }
    }
    for (var k = slabs.length - 1; k >= 0; k--) if (slabs[k].z - SLAB_L > 1.08) slabs.splice(k, 1);
  }

  // ── 描画 ──
  function drawShop() {
    var tt = game.time.elapsed;
    game.draw.gradient(0, H, [[0, '#e8f0f2'], [0.2, MIST], [0.21, '#9ab0b8'], [1, '#55707c']]);
    // 奥の壁と朝の光(彩度を落とす)
    game.draw.rect(0, HY - 140, W, 140, '#b8c8cc');
    game.draw.rect(W * 0.1, HY - 120, 200, 90, '#f4f8f0');
    game.draw.rect(W * 0.7, HY - 120, 200, 90, '#f4f8f0');
    for (var s = 0; s < 6; s++) game.draw.circle(W * 0.5 + Math.sin(tt * 0.7 + s) * 160, HY - 60 - ((tt * 40 + s * 50) % 260), 40 + s * 6, '#ffffff', 0.18);
    // 水槽(奥ほど細い。横1pxではなく6pxの帯で台形)
    for (var y = HY; y < H; y += 6) {
      var z = zOf(y);
      var hw = 330 * sc(z);
      game.draw.rect(W / 2 - hw - 40 * sc(z), y, (hw + 40 * sc(z)) * 2, 6, WOOD);
      var ripple = Math.floor((z * 30 - tt * 6) % 2 + 2) % 2;
      game.draw.rect(W / 2 - hw, y, hw * 2, 6, ripple ? WATER : '#86acba');
    }
  }

  function drawSlab(s, flashMark, flashK) {
    var zf = Math.min(1.08, s.z), zb = Math.max(0, s.z - SLAB_L);
    if (zf <= 0) return;
    var yf = yOf(zf), yb = yOf(zb);
    // 接地影(真下の楕円)
    game.draw.circle(W / 2, yf + 16 * sc(zf), 150 * sc(zf), INK, 0.12);
    for (var y = yb; y < yf; y += 5) {
      var z = zOf(y);
      var hw = 170 * sc(z);
      var fade = 0.55 + 0.45 * z;
      game.draw.rect(W / 2 - hw, y, hw * 2, 5, TOFU, fade);
    }
    // 手前の側面(厚み)
    game.draw.rect(W / 2 - 170 * sc(zf), yf, 340 * sc(zf), 44 * sc(zf), '#dcd8c8');
    for (var j = 0; j < s.marks.length; j++) {
      var m = s.marks[j];
      var mz = markZ(s, m);
      if (mz <= 0 || mz > 1.1) continue;
      var my = yOf(mz), hw2 = 176 * sc(mz);
      if (m.cut) {
        game.draw.rect(W / 2 - hw2, my - 3, hw2 * 2, 6, BLUE, 0.8);
        continue;
      }
      if (m.missed) { game.draw.rect(W / 2 - hw2, my - 3, hw2 * 2, 6, RED, 0.6); continue; }
      var near = Math.max(0, 1 - Math.abs(my - CUT_Y) / 300);
      var flash = m === flashMark ? flashK : 0;
      game.draw.rect(W / 2 - hw2, my - 10 - near * 6, hw2 * 2, 20 + near * 12, MARK, 0.18 + near * 0.3);
      game.draw.rect(W / 2 - hw2, my - 4, hw2 * 2, 8, flash ? '#ffffff' : MARK);
    }
  }

  function drawCutGuide() {
    var hw = 360 * sc(Z_CUT);
    game.draw.rect(W / 2 - hw, CUT_Y - 2, hw * 2, 4, INK, 0.45);
    game.draw.rect(W / 2 - hw - 30, CUT_Y - 14, 18, 28, RED);
    game.draw.rect(W / 2 + hw + 12, CUT_Y - 14, 18, 28, RED);
  }

  // 包丁の落ち方: 0.05秒でストンと下り、0.17秒かけて戻る
  function knifeDrop(t) {
    if (t <= 0) return 0;
    var d = t > 0.17 ? (0.22 - t) / 0.05 : t / 0.17;
    return Math.max(0, Math.min(1, d));
  }

  function drawKnife(drop) {
    var hw = 230 * sc(Z_CUT);
    var y = CUT_Y - 150 + drop * 150 + Math.sin(game.time.elapsed * 3) * (1 - drop) * 8;
    game.draw.circle(W / 2, CUT_Y + 10, hw * 0.5 * (0.4 + drop * 0.6), INK, 0.12);
    game.draw.rect(W / 2 - hw, y - 70, hw * 2, 70, STEEL);
    game.draw.rect(W / 2 - hw, y - 8, hw * 2, 8, '#ffffff');
    game.draw.rect(W / 2 - hw, y - 70, hw * 2, 10, '#8a949c');
    game.draw.rect(W / 2 + hw, y - 60, 170, 40, '#5a3a24');
    game.draw.rect(W / 2 + hw + 20, y - 52, 10, 24, WOOD);
  }

  function drawMaster(pose, chop) {
    var fr = pose === 'cheer' ? 2 : pose === 'sad' ? 3 : chop > 0 ? 1 : 0;
    var bob = Math.sin(game.time.elapsed * 3) * 5 - (pose === 'cheer' ? Math.abs(Math.sin(game.time.elapsed * 9)) * 28 : 0);
    game.draw.circle(W * 0.86, H * 0.97, 120, INK, 0.2);
    game.draw.sprite(MASTER[fr], { w: '#ffffff', b: BLUE, h: INK, f: '#f2cba4', e: '#ffffff', k: INK, m: RED, a: BLUE, p: INK }, W * 0.86, H * 0.87 + bob, 19, { anchor: 'center' });
  }

  function drawTray(n) {
    game.draw.rect(30, H * 0.80, 300, 150, WOOD);
    game.draw.rect(44, H * 0.80 + 14, 272, 120, '#86acba');
    for (var i = 0; i < Math.min(n, NEEDED); i++) {
      var bx = 60 + (i % 4) * 64, by = H * 0.80 + 26 + Math.floor(i / 4) * 36;
      game.draw.rect(bx, by, 52, 28, TOFU);
      game.draw.rect(bx, by + 22, 52, 6, '#dcd8c8');
    }
  }

  // ── 状態 ──
  var slabs, cutN, perfects, combo, maxCombo, strikes, score, timeLeft, spawnZ, chopT, ready, halt, over, won, endT, prevBest, pose, poseT, sparkT, milestoneDone, slabIdx;

  function speed() { return 0.22 + 0.1 * Math.min(1, cutN / NEEDED); }

  var PATTERNS = [[0.5], [0.35, 0.7], [0.5], [0.25, 0.55, 0.85], [0.3, 0.75], [0.2, 0.45, 0.8]];
  function nextSlab() {
    var pat = slabIdx < 2 ? PATTERNS[slabIdx] : PATTERNS[1 + Math.floor(game.random(0, PATTERNS.length - 1))];
    slabIdx++;
    return makeSlab(0, pat);
  }

  function initGame() {
    slabs = []; cutN = 0; perfects = 0; combo = 0; maxCombo = 0; strikes = 0; score = 0;
    timeLeft = TIME_LIMIT; spawnZ = 0; chopT = 0; ready = 0.8; halt = null; over = false; won = false; endT = 0;
    prevBest = game.best || 0; pose = 'idle'; poseT = 0; sparkT = 0; milestoneDone = false; slabIdx = 0;
    var first = nextSlab(); first.z = 0.42; slabs.push(first);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.8; pose = ok ? 'cheer' : 'sad';
    if (ok) score += Math.round(timeLeft * 30) + (STRIKES - strikes) * 60;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
  }

  function strike(x, y, mark) {
    strikes++;
    combo = 0;
    pose = 'sad'; poseT = 0.4;
    if (strikes >= STRIKES) halt = { t: 0.5, max: 0.5, mark: mark, x: x, y: y };
    else game.feedback.bad(x, y, { text: 'MISS' });
  }

  function onMissedMark(s, m) {
    strike(W / 2, CUT_Y - 160, m);
  }

  function canPlay() { return state === S.PLAYING && !over && !halt && ready <= 0; }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (!canPlay() || chopT > 0.12) { game.audio.play('se_tap', 0.04); return; }
    chopT = 0.22;
    game.audio.play('se_jump', 0.15);
    var g = chopJudge(slabs);
    if (g === 'MISS') {
      strike(W / 2, CUT_Y - 160, null);
      return;
    }
    cutN++;
    combo++;
    maxCombo = Math.max(maxCombo, combo);
    if (g === 'PERFECT') perfects++;
    score += (g === 'PERFECT' ? 150 : 90) + combo * 10;
    game.audio.play('se_break', 0.25);
    game.feedback.good(W / 2, CUT_Y - 180, { text: g, color: g === 'PERFECT' ? MARK : '#ffffff', count: g === 'PERFECT' ? 16 : 10 });
    if (combo > 0 && combo % 5 === 0) game.fx.popup('x' + combo, W * 0.2, CUT_Y - 220, { color: MARK, size: 60 });
    if (cutN === 6 && !milestoneDone) {
      milestoneDone = true;
      game.fx.popup(cutN + ' / ' + NEEDED, W / 2, H * 0.13, { color: BLUE, size: 62 });
      game.audio.play('se_milestone', 0.45);
    }
    if (cutN >= NEEDED) finish(true);
  });

  // ── ATTRACT: 2本の目印をぴたりで切り、3本目は遅れて下ろしてずれる ──
  var DEMO_CYCLE = 3.4;
  var DEMO_V = 0.3;
  var demo = { t: 0, slabs: [], chop: 0, gx: W / 2, gy: H * 0.75, press: false, plan: [], mood: 'idle', flash: 0, flashMark: null };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) {
      var s1 = makeSlab(0, [0.3, 0.75]);
      // 1本目の目印が0.9秒後に包丁の線へ来る位置から流す
      s1.z = Z_CUT + s1.marks[0].off - DEMO_V * 0.9;
      var s2 = makeSlab(s1.z - SLAB_L - 0.12, [0.5]);
      demo.slabs = [s1, s2];
      var tA = 0.9, tB = (s1.marks[1].off - s1.marks[0].off) / DEMO_V + 0.9;
      var tC = (Z_CUT - markZ(s2, s2.marks[0])) / DEMO_V + 0.16;
      demo.plan = [{ at: tA, done: false }, { at: tB, done: false }, { at: tC, done: false }];
      demo.mood = 'idle'; demo.flash = 0; demo.flashMark = null;
    }
    stepSlabs(demo.slabs, dt, DEMO_V, null);
    if (demo.chop > 0) demo.chop -= dt;
    if (demo.flash > 0) demo.flash -= dt;
    demo.press = false;
    for (var i = 0; i < demo.plan.length; i++) {
      var p = demo.plan[i];
      if (!p.done && cyc >= p.at) {
        p.done = true; demo.chop = 0.22;
        var g = chopJudge(demo.slabs);
        if (g === 'MISS') {
          demo.mood = 'sad'; demo.flash = 0.45;
          for (var j = 0; j < demo.slabs[1].marks.length; j++) demo.flashMark = demo.slabs[1].marks[j];
          game.feedback.bad(W / 2, CUT_Y - 160, { text: 'MISS', volume: 0.3 });
        } else {
          demo.mood = 'idle';
          game.feedback.good(W / 2, CUT_Y - 180, { text: g, color: MARK, count: 8, volume: 0.3 });
        }
      }
      if (cyc > p.at - 0.1 && cyc < p.at + 0.08) demo.press = true;
    }
    demo.gx += (W * 0.5 - demo.gx) * Math.min(1, dt * 6);
    demo.gy += (H * 0.76 - demo.gy) * Math.min(1, dt * 6);
    return cyc;
  }

  function drawHud() {
    for (var i = 0; i < NEEDED; i++) {
      var on = i < cutN;
      game.draw.rect(40 + i * 62, 50, 50, 30, on ? TOFU : '#ffffff', on ? 1 : 0.35);
      if (on) game.draw.rect(40 + i * 62, 74, 50, 6, '#dcd8c8');
    }
    for (var s = 0; s < STRIKES; s++) game.draw.circle(W - 60 - s * 60, 140, 22, s < strikes ? RED : '#ffffff', s < strikes ? 1 : 0.4);
    label(cutN + ' / ' + NEEDED, W * 0.24, 140, 42, INK);
    label(String(score), W * 0.55, 140, 40, BLUE);
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(40, 186, W - 80, 22, INK, 0.5);
    game.draw.rect(44, 190, (W - 88) * fr, 14, timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0 ? RED : BLUE);
  }

  function drawResult() {
    game.draw.rect(80, H * 0.24, W - 160, H * 0.30, INK, 0.85);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.29, 104, won ? MARK : RED);
    label(cutN + ' / ' + NEEDED, W / 2, H * 0.36, 60, TOFU);
    label('SCORE ' + score, W / 2, H * 0.42, 50, TOFU);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.48, 54, MARK);
    else label('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.48, 42, MIST);
    if (!won && cutN < NEEDED) label('あと' + (NEEDED - cutN) + '本!', W / 2, H * 0.525, 46, MARK);
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawShop();
      for (var d = demo.slabs.length - 1; d >= 0; d--) drawSlab(demo.slabs[d], demo.flashMark, demo.flash > 0 ? 1 : 0);
      drawCutGuide();
      drawKnife(knifeDrop(demo.chop));
      drawTray(2);
      drawMaster(demo.mood, demo.chop);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      label(TITLE, W / 2, H * 0.055, 92, BLUE);
      label('HI-SCORE ' + (game.best || 0), W / 2, H * 0.105, 38, INK);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.965, 44, MARK);
      else label('TAP TO START', W / 2, H * 0.965, 40, '#ffffff');
      return;
    }

    if (state === S.PLAYING) {
      if (chopT > 0) chopT -= dt;
      if (poseT > 0) { poseT -= dt; if (poseT <= 0 && !over) pose = 'idle'; }
      if (over) {
        endT -= dt;
        if (won) {
          sparkT -= dt;
          if (sparkT <= 0) { sparkT = 0.2; game.fx.burst(game.random(120, W - 120), game.random(H * 0.2, H * 0.6), { color: [MARK, TOFU, BLUE][Math.floor(game.random(0, 3))], count: 16, speed: 360 }); }
        }
        if (endT <= 0) state = S.RESULT;
      } else if (halt) {
        halt.t -= dt;
        if (halt.t <= 0) {
          game.feedback.bad(halt.x, halt.y, { text: 'MISS' });
          halt = null;
          finish(false);
        }
      } else if (ready > 0) {
        ready -= dt;
        if (ready <= 0) game.audio.play('se_tap', 0.3);
      } else {
        timeLeft -= dt;
        var v = speed();
        stepSlabs(slabs, dt, v, onMissedMark);
        // 次の豆腐を奥から流す(間隔は不揃い)
        var last = slabs[slabs.length - 1];
        if (!last || last.z - SLAB_L > spawnZ) { slabs.push(nextSlab()); spawnZ = game.random(0.12, 0.24); }
        if (timeLeft <= 0 && !over) {
          timeLeft = 0;
          game.feedback.bad(W / 2, H * 0.4, { text: 'TIME UP' });
          finish(false);
        }
      }
    }

    drawShop();
    var hk = halt ? 1 - halt.t / halt.max : 0;
    for (var i = slabs.length - 1; i >= 0; i--) drawSlab(slabs[i], halt ? halt.mark : null, hk > 0 ? 1 : 0);
    drawCutGuide();
    drawKnife(knifeDrop(chopT));
    if (halt) game.draw.rect(W / 2 - 300, CUT_Y - 30 - hk * 20, 600, 60 + hk * 40, '#ffffff', 0.45 * (1 - hk) + 0.15);
    drawTray(cutN);
    drawMaster(pose, chopT);
    drawHud();
    if (ready > 0) label(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.40, 120, BLUE);
    if (over || state === S.RESULT) drawResult();

    if (state === S.RESULT) {
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.965, 40, '#ffffff');
      var stats = { cut: cutN, perfect: perfects, maxCombo: maxCombo, strikes: strikes };
      if (won) game.end.success(score, stats);
      else game.end.failure(stats);
    }
  });

  game.onStart(function () {
    game.audio.melody([
      ['G4', 0.5], ['A4', 0.5], ['C5', 1], ['D5', 0.5], ['C5', 0.5], ['A4', 1],
      ['G4', 0.5], ['E4', 0.5], ['G4', 1], ['A4', 2],
      ['C5', 0.5], ['D5', 0.5], ['E5', 1], ['G5', 0.5], ['E5', 0.5], ['D5', 1],
      ['C5', 0.5], ['A4', 0.5], ['G4', 1], ['C5', 2],
    ], {
      tempo: 104, wave: 'triangle', volume: 0.05, loop: true,
      bass: [['C3', 1], ['G2', 1], ['C3', 1], ['G2', 1], ['A2', 1], ['E2', 1], ['A2', 1], ['E2', 1],
        ['F2', 1], ['C3', 1], ['G2', 1], ['D3', 1], ['F2', 1], ['G2', 1], ['C3', 2]],
    });
    state = S.ATTRACT;
    initGame();
  });
})(game);

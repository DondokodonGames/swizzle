// J-N6434-0038-moonlit-yard-sneak.js
// 月夜の倉庫街しのび足 — 影の小道からはみ出さないよう指で配達ネコを連れて進み、見張りの灯りが回る間は木箱の陰でやり過ごす
// 操作: ネコを指で押さえて影の道に沿ってなぞり進める。月明かりへはみ出すと見つかる。見張りの目が開いたら木箱の陰で止まる(社内メモ。画面には出さない)
// 終わり: 影の道の終点(裏口)に着けば成功。見つかる3回/時間切れで失敗
// @mechanic: guide_path
// @theme: moonlit_warehouse_sneak
// 世界観: 夜の倉庫街で、配達係のネコがサプライズの招待状を届けるため、見張り塔のフクロウの灯りを木箱の陰でやり過ごしながら、影の小道だけを伝って裏口までしのび足で進む
// 残るもの: 正誤(CLEAR/GAME OVER) + 進んだ割合・見つかった回数
// スタイル: 90s LOW POLY

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s LOW POLY: 面はベタ、輪郭は line、頂点のジッターとフォグ
  var STYLE = { bg: ['#1a2238', '#2e3b5c', '#586c8e'], main: ['#9fb3cf', '#6b7fa0', '#0c1222'], accent: ['#ffe07a', '#ff5a4e'] };
  var C = { night1: STYLE.bg[0], night2: STYLE.bg[1], moon: STYLE.bg[2], lit: STYLE.main[0], mid: STYLE.main[1], shadow: STYLE.main[2], beam: STYLE.accent[0], red: STYLE.accent[1], white: '#f2f6ff', crateTop: '#b0834e', crateL: '#7a5530', crateR: '#5b3e22', green: '#7af0a0' };

  var GAME_TITLE = 'MOONLIT SNEAK';
  var TIME_LIMIT = 20;
  var LIVES = 3;
  var BAND = 74;
  var GRAB = 150;
  var SEG = 10;
  var WP = [
    { x: W * 0.2, y: H * 0.71 }, { x: W * 0.68, y: H * 0.66 }, { x: W * 0.8, y: H * 0.54 },
    { x: W * 0.32, y: H * 0.47 }, { x: W * 0.2, y: H * 0.35 }, { x: W * 0.64, y: H * 0.29 }, { x: W * 0.8, y: H * 0.18 },
  ];
  // 経路を 10px 間隔の点列に
  var PTS = [];
  (function() {
    var carry = 0;
    PTS.push({ x: WP[0].x, y: WP[0].y });
    for (var i = 1; i < WP.length; i++) {
      var ax = WP[i - 1].x, ay = WP[i - 1].y, bx = WP[i].x, by = WP[i].y;
      var len = Math.hypot(bx - ax, by - ay);
      var d = SEG - carry;
      while (d <= len) {
        PTS.push({ x: ax + (bx - ax) * d / len, y: ay + (by - ay) * d / len });
        d += SEG;
      }
      carry = len - (d - SEG);
    }
  })();
  var LAST = PTS.length - 1;
  var COVERS = [0, 0.2, 0.4, 0.6, 0.8].map(function(f) { return Math.round(LAST * f); });

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var CAT_A = ['#...#...', '##.##...', '#####..#', '#o#o#..#', '######.#', '.######.', '.#.#.#.#'];
  var CAT_B = ['#...#...', '##.##...', '#####...', '#o#o#..#', '######.#', '.######.', '#.#.#.#.'];
  var CAT_PAL = { '#': '#d9e2f5', 'o': '#2b6a4a' };
  var LETTER = ['######', '##..##', '#.##.#', '######'];
  var OWL_OPEN = ['#....#', '######', '#oo#oo', '#oo#oo', '######', '.####.'];
  var OWL_SHUT = ['#....#', '######', '#--#--', '######', '######', '.####.'];
  var DOOR = ['.####.', '######', '##..##', '##..##', '##.###', '##..##'];

  var idx, grabbed, lives, spots, timeLeft, ready, hitStop, finished, ok, done, endWait;
  var phase, phaseT, beamX, beamDir, flashCat, lastCover, jitter, bestIdx, halfShown, sweeps;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.shadow, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function initGame() {
    idx = 0; grabbed = false; lives = LIVES; spots = 0;
    timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0; finished = false; ok = false; done = false; endWait = 0;
    phase = 'off'; phaseT = 1.8; beamX = -100; beamDir = 1; flashCat = 0; lastCover = 0; jitter = 0; bestIdx = 0; halfShown = false; sweeps = 0;
  }

  function coverAt(i) {
    for (var k = 0; k < COVERS.length; k++) if (Math.abs(i - COVERS[k]) <= 6) return k;
    return -1;
  }

  function catPos() { return PTS[idx]; }

  function spotted(reason) {
    lives--; spots++;
    var p = catPos();
    flashCat = 0.5;
    game.feedback.bad(p.x, p.y - 60, { text: 'MISS', shake: 12 });
    // 直前の木箱の陰まで戻される
    var back = 0;
    for (var k = 0; k < COVERS.length; k++) if (COVERS[k] <= idx) back = COVERS[k];
    idx = back; grabbed = false;
    phase = 'off'; phaseT = 1.3; beamX = beamDir > 0 ? -120 : W + 120;
    if (lives <= 0 && state === S.PLAYING) { finished = true; ok = false; hitStop = 0.55; }
  }

  // 指で連れて進む(影の道からはみ出すと見つかる)
  function dragTo(x, y) {
    if (finished) return;
    var p = catPos();
    if (!grabbed) {
      if (Math.hypot(x - p.x, y - p.y) > GRAB) return;
      grabbed = true;
    }
    var i0 = Math.max(0, idx - 10), i1 = Math.min(LAST, idx + 30);
    var best = -1, bd = 1e9;
    for (var i = i0; i <= i1; i++) {
      var d = Math.hypot(PTS[i].x - x, PTS[i].y - y);
      if (d < bd) { bd = d; best = i; }
    }
    if (bd > BAND + 10) { spotted('edge'); return; }
    var prevIdx = idx;
    idx = best;
    var cv = coverAt(idx);
    if (cv > lastCover) {
      lastCover = cv;
      game.feedback.good(PTS[idx].x, PTS[idx].y - 70, { text: 'NICE', color: C.green, size: 44, volume: 0.25 });
    }
    if (idx > bestIdx) bestIdx = idx;
    if (!halfShown && idx >= LAST / 2 && state === S.PLAYING) {
      halfShown = true;
      game.fx.popup('50%', W / 2, H * 0.14, { color: C.beam, size: 56 });
      game.audio.play('se_milestone', 0.4);
    }
    if (idx > prevIdx + 3 && state === S.PLAYING && Math.random() < 0.3) game.audio.tone('G3', 0.03, { wave: 'triangle', volume: 0.03 });
    if (idx >= LAST - 2 && !finished) {
      idx = LAST;
      if (state === S.PLAYING) { finished = true; ok = true; hitStop = 0.45; }
      game.feedback.good(PTS[LAST].x, PTS[LAST].y - 60, { text: 'CLEAR', color: C.beam, size: 60 });
    }
  }

  function simulate(dt) {
    jitter += dt;
    if (flashCat > 0) flashCat -= dt;
    phaseT -= dt;
    if (phase === 'off' && phaseT <= 0) {
      phase = 'warn'; phaseT = 0.65;
      if (state === S.PLAYING) game.audio.tone('F5', 0.12, { wave: 'square', volume: 0.05 });
    } else if (phase === 'warn' && phaseT <= 0) {
      phase = 'on'; phaseT = 1.9; beamX = beamDir > 0 ? -90 : W + 90;
    } else if (phase === 'on') {
      beamX += beamDir * (W + 180) / 1.9 * dt;
      if (phaseT <= 0) {
        phase = 'off'; sweeps++;
        phaseT = Math.max(1.1, 1.8 - sweeps * 0.15); // 見張りの間隔が詰まっていく
        beamDir = -beamDir;
      } else {
        var p = catPos();
        if (Math.abs(p.x - beamX) < 95 && coverAt(idx) < 0) spotted('beam');
      }
    }
  }

  // ── 描画 ───────────────────────────────────────────────
  function drawYard() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.night1], [0.12, C.night2], [0.5, C.moon], [0.78, C.night2], [1, C.night1]]);
    game.draw.rect(0, 0, W, H, C.lit, 0.025 + 0.025 * Math.sin(t * 1.1));
    // 月
    game.draw.circle(W * 0.14, 150, 60, C.white, 0.9);
    game.draw.circle(W * 0.14 + 22, 140, 56, C.night1, 0.9);
    // 石畳のローポリ面(ジッター付きの輪郭線)
    for (var r = 0; r < 9; r++) {
      var y = H * 0.14 + r * 150;
      for (var c = 0; c < 6; c++) {
        var x = c * 200 + (r % 2) * 100;
        var jx = Math.sin(jitter * 3 + r * 7 + c) * 2;
        game.draw.line(x + jx, y, x + 180 + jx, y + 20, C.mid, 2);
        game.draw.line(x + 180 + jx, y + 20, x + 150, y + 130, C.mid, 2);
      }
    }
    // 影の小道
    for (var i = 1; i < WP.length; i++) game.draw.line(WP[i - 1].x, WP[i - 1].y, WP[i].x, WP[i].y, C.shadow, BAND * 2);
    for (var j = 0; j < WP.length; j++) game.draw.circle(WP[j].x, WP[j].y, BAND, C.shadow);
    // 進んだ跡
    for (var k = 0; k < idx; k += 6) game.draw.circle(PTS[k].x, PTS[k].y, 8, C.beam, 0.35);
    // 道の縁(影の境目を明示)
    for (var e = 0; e < PTS.length; e += 8) game.draw.circle(PTS[e].x, PTS[e].y, 4, C.lit, 0.15);
  }

  function crate(x, y, s) {
    game.draw.rect(x - s, y - s * 0.6, s * 2, s * 0.6, C.crateTop);
    game.draw.rect(x - s, y, s, s, C.crateL);
    game.draw.rect(x, y, s, s, C.crateR);
    game.draw.line(x - s, y - s * 0.6, x + s, y - s * 0.6, '#2a1a0c', 3);
    game.draw.line(x - s, y, x + s, y, '#2a1a0c', 3);
    game.draw.line(x, y, x, y + s, '#2a1a0c', 3);
  }

  function drawCovers() {
    var t = game.time.elapsed;
    for (var k = 1; k < COVERS.length; k++) {
      var p = PTS[COVERS[k]];
      var safe = phase !== 'off';
      game.draw.circle(p.x, p.y, 64, safe ? C.green : C.shadow, safe ? 0.18 + 0.1 * Math.sin(t * 8) : 0.6);
      crate(p.x + 70, p.y - 40, 38);
    }
    // 裏口(ゴール)
    var g = PTS[LAST];
    game.draw.circle(g.x, g.y, 80, C.beam, 0.15 + 0.1 * Math.sin(t * 4));
    game.draw.sprite(DOOR, { '#': C.crateL }, g.x + 20, g.y - 110, 14, { anchor: 'center' });
    game.draw.circle(g.x + 40, g.y - 110, 8, C.beam);
  }

  function drawWatch() {
    var t = game.time.elapsed;
    // 見張り塔
    var tx = W * 0.5, ty = 290;
    game.draw.rect(tx - 50, ty, 100, 40, C.mid);
    game.draw.line(tx - 50, ty, tx + 50, ty, C.lit, 3);
    var open = phase !== 'off';
    var blink = phase === 'warn' && Math.floor(t * 12) % 2 === 0;
    game.draw.sprite(open ? OWL_OPEN : OWL_SHUT, { '#': '#8a6a50', 'o': blink ? C.red : C.beam, '-': '#3a2a20' }, tx, ty - 50 + Math.sin(t * 2) * 4, 12, { anchor: 'center' });
    if (phase === 'warn') {
      // 予告: 灯りが走り出す側の端に赤い警告線
      var sx = beamDir > 0 ? 30 : W - 30;
      game.draw.rect(sx - 12, H * 0.14, 24, H * 0.62, C.red, blink ? 0.7 : 0.25);
    }
    if (phase === 'on') {
      game.draw.rect(beamX - 95, H * 0.14, 190, H * 0.62, C.beam, 0.22);
      game.draw.rect(beamX - 55, H * 0.14, 110, H * 0.62, C.beam, 0.2);
      game.draw.line(tx, ty - 40, beamX, H * 0.14, C.beam, 6);
    }
    // フォグ
    game.draw.rect(0, H * 0.12, W, 60, C.lit, 0.08);
  }

  function drawCat() {
    var t = game.time.elapsed;
    var p = catPos();
    var hidden = coverAt(idx) >= 0 && phase !== 'off';
    var fr = Math.floor(t * 8) % 2 === 0 || !grabbed ? CAT_A : CAT_B;
    if (!grabbed && !finished) game.draw.circle(p.x, p.y, 70 + Math.sin(t * 6) * 8, C.white, 0.15);
    game.draw.circle(p.x, p.y + 30, 44, '#000000', 0.3);
    game.draw.sprite(fr, CAT_PAL, p.x, p.y + Math.sin(t * 5) * 3, 14, { anchor: 'center', alpha: hidden ? 0.6 : 1 });
    game.draw.sprite(LETTER, { '#': C.white, '.': C.red }, p.x + 44, p.y - 30, 6, { anchor: 'center' });
    if (flashCat > 0 || (finished && hitStop > 0)) game.draw.circle(p.x, p.y, 100, C.white, 0.4);
  }

  function drawStreet() {
    // 親指ゾーン: 手前の通り(他の配達員はシルエットで行き交うだけ)
    var t = game.time.elapsed;
    game.draw.rect(0, H * 0.78, W, H * 0.22, C.night1);
    game.draw.line(0, H * 0.78, W, H * 0.78, C.mid, 4);
    for (var i = 0; i < 4; i++) {
      var x = ((i * 300 + t * 60) % (W + 200)) - 100;
      game.draw.sprite(CAT_A, { '#': C.night2, 'o': C.night2 }, x, H * 0.86 + Math.sin(t * 4 + i) * 4, 9, { anchor: 'center', alpha: 0.6 });
    }
    for (var l = 0; l < 3; l++) {
      var lx = 180 + l * 360;
      game.draw.line(lx, H * 0.8, lx, H * 0.9, C.mid, 6);
      game.draw.circle(lx, H * 0.8, 14, C.beam, 0.4 + 0.2 * Math.sin(t * 3 + l));
    }
  }

  function drawHud() {
    var pct = Math.round(idx / LAST * 100);
    txt(pct + '%', W / 2, 60, 48, C.white);
    var bw = W - 160;
    game.draw.rect(80, 98, bw, 14, C.shadow, 0.7);
    game.draw.rect(80, 98, bw * (idx / LAST), 14, C.green);
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 122, bw, 10, C.shadow, 0.7);
    game.draw.rect(80, 122, bw * Math.max(0, timeLeft / TIME_LIMIT), 10, low ? C.red : C.beam);
    for (var i = 0; i < LIVES; i++) game.draw.sprite(LETTER, { '#': i < lives ? C.white : C.mid, '.': C.red }, W - 110 - i * 70, 180, 7, { anchor: 'center' });
  }

  function drawScene() { drawYard(); drawCovers(); drawWatch(); drawCat(); drawStreet(); }

  // ── ATTRACT ゴースト実演(実ロジック: 影の道をなぞり、目が開いたら木箱の陰で待つ→一度だけ待たずに見つかる) ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.7, press: false, failDone: false, acc: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7.0;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; phaseT = 0.9; demo.failDone = false; demo.acc = 0; }
    simulate(dt);
    if (lives < 1) lives = LIVES;
    if (spots > 0) demo.failDone = true;
    var atCover = coverAt(idx) >= 0;
    var risky = !demo.failDone && lastCover >= 2; // 失敗例: 一度だけ待たずに灯りの中へ出る
    var wait = phase !== 'off' && atCover && !risky;
    demo.press = !wait;
    if (!wait) {
      demo.acc += dt * 50;
      var n = Math.floor(demo.acc);
      demo.acc -= n;
      var fp = PTS[Math.min(LAST, idx + n)];
      grabbed = true;
      dragTo(fp.x, fp.y);
    } else {
      grabbed = false;
    }
    if (idx >= LAST) { initGame(); ready = 0; phaseT = 0.9; }
    var cp = catPos();
    demo.gx = cp.x + 10; demo.gy = cp.y + 10;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.4);
      state = S.PLAYING; initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    game.audio.play('se_tap', 0.1);
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    var p = catPos();
    if (Math.hypot(x - p.x, y - p.y) <= GRAB) {
      grabbed = true;
      game.audio.play('se_tap', 0.15);
    } else {
      game.fx.burst(p.x, p.y, { color: C.white, count: 5, speed: 120 });
    }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished || !grabbed) return;
    dragTo(x, y);
    if (grabbed && Math.random() < 0.06) game.fx.burst(catPos().x, catPos().y + 30, { color: C.mid, count: 2, speed: 60 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    if (grabbed) game.audio.tone('C4', 0.04, { wave: 'triangle', volume: 0.04 });
    grabbed = false;
  });

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (idx === undefined) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.05, 66, C.beam);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.09, 34, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.beam);
      else txt('TAP TO START', W / 2, H * 0.965, 40, C.white);
      return;
    }
    if (state === S.RESULT) { drawScene(); drawResult(); return; }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        drawScene(); drawResult();
        var pct = Math.round(bestIdx / LAST * 100);
        var score = pct * 10 + (ok ? Math.ceil(timeLeft) * 30 + lives * 100 : 0);
        var st = { progressPct: pct, spotted: spots, secondsLeft: Math.ceil(timeLeft) };
        if (ok) game.end.success(score, st); else game.end.failure(st);
        return;
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) {
        done = true; endWait = 1.2;
        game.audio.stopBgm();
        game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
        if (ok) game.fx.burst(PTS[LAST].x, PTS[LAST].y, { color: C.beam, count: 40, speed: 600 });
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else if (!finished) {
      timeLeft -= dt;
      simulate(dt);
      if (timeLeft <= 0 && !finished) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.5;
        game.feedback.bad(catPos().x, catPos().y, { text: 'TIME UP' });
      }
    }

    drawScene();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 96, C.beam);
    if (done) txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.42, 90, ok ? C.green : C.red);
  });

  function drawResult() {
    game.draw.rect(0, 0, W, H, C.shadow, 0.55);
    var pct = Math.round(bestIdx / LAST * 100);
    txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.25, 96, ok ? C.green : C.red);
    txt(pct + '%', W / 2, H * 0.34, 72, C.white);
    var score = pct * 10 + (ok ? Math.ceil(timeLeft) * 30 + lives * 100 : 0);
    txt('SCORE ' + score, W / 2, H * 0.41, 48, C.beam);
    if (ok && score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.47, 52, C.beam);
    else txt('BEST ' + (game.best || 0), W / 2, H * 0.47, 40, C.white);
    if (!ok) txt('あと' + Math.max(1, 100 - pct) + '%!', W / 2, H * 0.53, 52, C.red);
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 40, C.white);
  }

  game.onStart(function() {
    game.audio.melody([['D4', 0.5], ['R', 0.5], ['F4', 0.5], ['R', 0.5], ['E4', 0.5], ['D4', 0.5], ['A3', 1], ['C4', 0.5], ['R', 0.5], ['D4', 1]], { tempo: 116, wave: 'triangle', volume: 0.045, loop: true, bass: [['D2', 2], ['A1', 2]] });
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);

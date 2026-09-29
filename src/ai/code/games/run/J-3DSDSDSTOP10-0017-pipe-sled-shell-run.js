// J-3DSDSDSTOP10-0017-pipe-sled-shell-run.js
// 送水管スレッドラン — 筒の中を滑り降りる潜水ソリを、画面の左右を押して筒ごと回し、内壁の光る貝を拾い集める
// 操作: 画面の左側を押している間は筒が左へ、右側なら右へ回る(中央から離すほど速い)。真下に来た貝を拾い、赤く瞬く錆こぶは避ける
// 終わり: 出口に着いた時に貝を18個以上集めていればCLEAR(集めた数がスコア)。錆こぶに3回ぶつかるとGAME OVER
// @mechanic: camera_run
// @theme: water_main_pipe_sled
// 世界観: 使われなくなった古い送水管の中を、小さな潜水ソリの清掃係が滑り降り、筒の内壁に貼り付いて光る貝を回り込みながら拾い集めて出口の貯水池を目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 集めた貝の数・最大連続数・ぶつかった回数
// スタイル: 70s VECTOR

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 暗い地に発光する線画、1〜3色
  var STYLE = {
    bg: ['#02040a', '#050b18', '#0a1428'],
    main: ['#7dfcff', '#3ab8ff', '#e8ffff'],
    accent: ['#ffe85a', '#ff4a6a'],
  };
  var GLOW = '#7dfcff', GLOW2 = '#3ab8ff', WHITE = '#e8ffff', AMBER = '#ffe85a', HAZ = '#ff4a6a';

  var GAME_TITLE = 'PIPE SLED';
  var TIME_LIMIT = 20;
  var NEEDED = 18;
  var STRIKES = 3;
  var VPX = W / 2, VPY = Math.round(H * 0.44);
  var R = 470;
  var ARRIVE = 1.6;
  var CATCH = 0.3;

  var SLED_A = ['..cc..', '.cwwc.', 'cwwwwc', 'cccccc', 'c.cc.c', '.c..c.'];
  var SLED_B = ['..cc..', '.cwwc.', 'cwwwwc', 'cccccc', '.c..c.', 'c.cc.c'];
  var SHELL = ['..a..', '.aaa.', 'a.a.a', 'aaaaa', '.a.a.'];
  var KNOB = ['h.h.h', '.hhh.', 'hhhhh', '.hhh.', 'h.h.h'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var v = null;

  function glowText(str, x, y, sz, col) {
    game.draw.text(str, x, y, { size: sz + 2, color: GLOW2, bold: true, align: 'center', font: 'monospace' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center', font: 'monospace' });
  }

  function initGame() {
    v = {
      phi: 0, spin: 0, things: [], spawnT: 0.2, pattern: 0,
      got: 0, chain: 0, bestChain: 0, hits: 0, dist: 0,
      timeLeft: TIME_LIMIT, ready: 0.8, hitStop: 0, hl: null,
      finished: false, done: false, ok: false, endWait: 0, mile: 0, bump: 0,
    };
  }

  function wrap(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }

  // 生成: 貝の弧(3〜5個が角度をずらして並ぶ) + 時々錆こぶ
  function spawnWave() {
    v.pattern++;
    var base = Math.random() * Math.PI * 2;
    var n = 3 + Math.floor(Math.random() * 3);
    var drift = (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.2);
    for (var i = 0; i < n; i++) {
      var gold = v.pattern % 5 === 0 && i === n - 1;
      v.things.push({ kind: gold ? 'gold' : 'shell', a: base + drift * i, z: 1 + i * 0.16, hit: false });
    }
    if (v.pattern >= 2 && Math.random() < 0.75) {
      var ha = base + drift * Math.floor(n / 2) + Math.PI * (0.35 + Math.random() * 0.3) * (Math.random() < 0.5 ? -1 : 1);
      v.things.push({ kind: 'knob', a: ha, z: 1.1, hit: false, warn: 0.7 });
      game.audio.tone('E3', 0.12, { wave: 'sawtooth', volume: 0.04 });
    }
    if (v.pattern >= 4 && Math.random() < 0.5) {
      v.things.push({ kind: 'knob', a: base + drift * (n + 1), z: 1 + (n + 1) * 0.16, hit: false, warn: 0.7 });
    }
  }

  function speedMul() { return 1 + Math.min(0.6, v.dist * 0.03); }

  function steer(px, dt) {
    var k = (px - W / 2) / (W / 2);
    v.spin = Math.max(-1, Math.min(1, k)) * 3.1;
    v.phi -= v.spin * dt;
  }

  function collect(t, x, y) {
    t.hit = true;
    if (t.kind === 'knob') {
      v.hits++; v.chain = 0;
      v.hitStop = 0.4; v.hl = t; v.bump = 0.5;
      game.fx.flash(HAZ, 0.2);
      game.feedback.bad(x, y - 60, { text: 'MISS', color: HAZ });
      if (v.hits >= STRIKES) { v.finished = true; v.ok = false; finish(); }
      return;
    }
    var gain = t.kind === 'gold' ? 3 : 1;
    v.got += gain; v.chain++;
    if (v.chain > v.bestChain) v.bestChain = v.chain;
    game.audio.play('se_coin', 0.35);
    if (t.kind === 'gold') game.feedback.good(x, y - 50, { text: 'x3', color: AMBER, count: 16 });
    else if (v.chain % 5 === 0) game.feedback.good(x, y - 50, { text: 'x' + v.chain, color: GLOW, count: 10 });
    else game.fx.burst(x, y, { color: GLOW, count: 8, speed: 220 });
    var ms = Math.floor(v.got / 8);
    if (ms > v.mile) {
      v.mile = ms;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup(v.got + ' / ' + NEEDED, VPX, VPY - 120, { color: AMBER, size: 60 });
    }
  }

  function finish() {
    if (v.done) return;
    v.done = true; v.endWait = 1.5;
    if (state !== S.PLAYING) return;
    game.audio.stopBgm();
    game.audio.play(v.ok ? 'se_success' : 'se_failure', 0.55);
  }

  function run(dt) {
    if (v.hitStop > 0) { v.hitStop -= dt; return; }
    if (v.bump > 0) v.bump -= dt;
    if (v.finished) return;
    var sm = speedMul();
    v.dist += dt * sm;
    v.spawnT -= dt;
    if (v.spawnT <= 0) { spawnWave(); v.spawnT = Math.max(0.9, 1.5 - v.dist * 0.03); }
    for (var i = 0; i < v.things.length; i++) {
      var t = v.things[i];
      if (t.warn > 0) t.warn -= dt;
      t.z -= dt * sm / ARRIVE;
      if (!t.hit && t.z <= 0.02 && t.z > -0.08) {
        var diff = wrap(t.a + v.phi - Math.PI / 2);
        if (Math.abs(diff) < CATCH) {
          var p = project(t.a, 0);
          collect(t, p.x, p.y);
          if (v.hitStop > 0) break;
        } else if (t.kind !== 'knob' && Math.abs(diff) < CATCH * 1.8) {
          t.hit = true;
          if (v.chain > 0) v.chain = 0;
        }
      }
    }
    v.things = v.things.filter(function (t2) { return t2.z > -0.1 && !(t2.hit && t2.kind !== 'knob'); });
  }

  function project(a, z) {
    var r = R / (1 + Math.max(0, z) * 6);
    var ang = a + v.phi;
    return { x: VPX + Math.cos(ang) * r, y: VPY + Math.sin(ang) * r, s: r / R };
  }

  // ── 描画 ─────────────────────────────────────────
  function ring(r, col, width, rot) {
    var n = 28, px = 0, py = 0;
    for (var i = 0; i <= n; i++) {
      var a = (i / n) * Math.PI * 2 + rot;
      var x = VPX + Math.cos(a) * r, y = VPY + Math.sin(a) * r;
      if (i > 0) game.draw.line(px, py, x, y, col, width);
      px = x; py = y;
    }
  }

  function drawTube() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, '#02040a'], [0.45, '#0a1428'], [1, '#02040a']]);
    game.draw.circle(VPX, VPY, 140 + Math.sin(t * 1.4) * 14, GLOW2, 0.08);
    // 流れてくるリング
    var phase = (v.dist * 1.6) % 1;
    for (var k = 0; k < 9; k++) {
      var z = (k + 1 - phase) / 9;
      var r = R / (1 + z * 6);
      ring(r, z < 0.25 ? GLOW : GLOW2, z < 0.25 ? 4 : 2, 0);
    }
    ring(R + 30, GLOW, 5, 0);
    // 縦の継ぎ目(回転が見えるように)
    for (var s = 0; s < 8; s++) {
      var a = s * Math.PI / 4 + v.phi;
      game.draw.line(VPX + Math.cos(a) * R / 7, VPY + Math.sin(a) * R / 7, VPX + Math.cos(a) * (R + 30), VPY + Math.sin(a) * (R + 30), s % 2 ? GLOW2 : '#1d6c8a', 2);
    }
  }

  function drawThings() {
    var t = game.time.elapsed;
    var sorted = v.things.slice().sort(function (a, b) { return b.z - a.z; });
    for (var i = 0; i < sorted.length; i++) {
      var th = sorted[i];
      if (th.z > 1.05) continue;
      var p = project(th.a, th.z);
      var sc = Math.max(2, 13 * p.s);
      if (th.kind === 'knob') {
        var blink = th.warn > 0 ? Math.floor(t * 14) % 2 === 0 : true;
        var big = v.hl === th && v.hitStop > 0;
        if (blink) game.draw.sprite(KNOB, { h: big ? '#ffffff' : HAZ }, p.x, p.y, big ? sc * 1.5 : sc, { anchor: 'center' });
        if (th.z < 0.35) game.draw.circle(p.x, p.y, 70 * p.s, HAZ, 0.2);
      } else {
        game.draw.sprite(SHELL, { a: th.kind === 'gold' ? AMBER : WHITE }, p.x, p.y + Math.sin(t * 5 + i) * 3 * p.s, sc, { anchor: 'center' });
      }
    }
  }

  function drawSled() {
    var t = game.time.elapsed;
    var x = VPX + Math.sin(t * 2.2) * 5, y = VPY + R - 36 + Math.cos(t * 3.3) * 4;
    var art = Math.floor(t * 6) % 2 === 0 ? SLED_A : SLED_B;
    var shake = v.bump > 0 ? Math.sin(t * 60) * 12 : 0;
    game.draw.circle(x, y + 30, 70, GLOW2, 0.15);
    game.draw.sprite(art, { c: v.bump > 0 ? HAZ : GLOW, w: WHITE }, x + shake, y, 15, { anchor: 'center' });
    // 取れる範囲の弧
    var a0 = Math.PI / 2 - CATCH, a1 = Math.PI / 2 + CATCH;
    for (var i = 0; i < 6; i++) {
      var aa = a0 + (a1 - a0) * (i / 5);
      game.draw.circle(VPX + Math.cos(aa) * (R + 30), VPY + Math.sin(aa) * (R + 30), 6, AMBER);
    }
  }

  function drawControls() {
    // 親指ゾーン: 左右に回す帯(押している側が光る)
    var y = Math.round(H * 0.82);
    var lk = v.spin < -0.2, rk = v.spin > 0.2;
    game.draw.line(80, y, W / 2 - 80, y, lk ? AMBER : GLOW2, lk ? 8 : 3);
    game.draw.line(80, y, 150, y - 50, lk ? AMBER : GLOW2, lk ? 8 : 3);
    game.draw.line(80, y, 150, y + 50, lk ? AMBER : GLOW2, lk ? 8 : 3);
    game.draw.line(W / 2 + 80, y, W - 80, y, rk ? AMBER : GLOW2, rk ? 8 : 3);
    game.draw.line(W - 80, y, W - 150, y - 50, rk ? AMBER : GLOW2, rk ? 8 : 3);
    game.draw.line(W - 80, y, W - 150, y + 50, rk ? AMBER : GLOW2, rk ? 8 : 3);
  }

  function scoreOf() { return v.got * 100 + v.bestChain * 20; }

  function drawHud() {
    glowText(v.got + ' / ' + NEEDED, 220, 90, 56, v.got >= NEEDED ? AMBER : WHITE);
    for (var s = 0; s < STRIKES; s++) game.draw.sprite(KNOB, { h: s < v.hits ? HAZ : '#3a2030' }, W - 260 + s * 80, 90, 9, { anchor: 'center' });
    var frac = Math.max(0, v.timeLeft / TIME_LIMIT);
    var low = v.timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.line(60, 170, W - 60, 170, '#1d3a50', 10);
    game.draw.line(60, 170, 60 + (W - 120) * (1 - frac), 170, low ? HAZ : GLOW, 10);
    game.draw.circle(W - 60, 170, 14, AMBER);
  }

  function drawResult() {
    game.draw.rect(100, 640, W - 200, 480, '#02040a', 0.9);
    game.draw.line(100, 640, W - 100, 640, v.ok ? GLOW : HAZ, 4);
    game.draw.line(100, 1120, W - 100, 1120, v.ok ? GLOW : HAZ, 4);
    glowText(v.ok ? 'CLEAR' : 'GAME OVER', W / 2, 730, 88, v.ok ? AMBER : HAZ);
    glowText(v.got + ' / ' + NEEDED, W / 2, 850, 66, WHITE);
    glowText('x' + v.bestChain, W / 2, 935, 44, GLOW);
    var sc = scoreOf();
    if (v.ok && sc > game.best) glowText('NEW RECORD', W / 2, 1010, 50, AMBER);
    else if (!v.ok || v.got < NEEDED) glowText('あと' + Math.max(1, NEEDED - v.got) + '個!', W / 2, 1010, 50, GLOW);
    glowText('BEST ' + Math.max(game.best, v.ok ? sc : 0), W / 2, 1080, 34, GLOW2);
  }

  function drawScene() {
    drawTube();
    drawThings();
    drawSled();
    drawControls();
  }

  // ── ATTRACT: AI が同じ steer で一番近い貝へ筒を回す(終盤わざと錆こぶへ突っ込む)──
  var demo = { t: 0, gx: W / 2, gy: H * 0.82, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.6;
    if (cyc < dt || demo.t <= dt) { initGame(); v.ready = 0; v.spawnT = 0; }
    var target = null, best = 9;
    var wantKnob = cyc > 4.8;
    for (var i = 0; i < v.things.length; i++) {
      var t = v.things[i];
      if (t.hit || t.z < 0 || t.z > 0.8) continue;
      if ((t.kind === 'knob') !== wantKnob) continue;
      if (t.z < best) { best = t.z; target = t; }
    }
    demo.press = false;
    if (target) {
      var diff = wrap(target.a + v.phi - Math.PI / 2);
      if (Math.abs(diff) > 0.06) {
        var dir = diff > 0 ? 1 : -1;
        demo.gx = W / 2 + dir * Math.min(1, Math.abs(diff) * 1.4 + 0.3) * (W / 2 - 60);
        demo.press = true;
        steer(demo.gx, dt);
      } else { v.spin = 0; }
    } else { v.spin = 0; }
    run(dt);
    v.timeLeft = Math.max(0, TIME_LIMIT - v.dist);
    if (v.done) { v.done = false; }
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING; initGame(); song();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function (x, y) {
    if (state !== S.PLAYING || v.done) return;
    game.audio.play('se_tap', 0.15);
    game.fx.burst(x, y, { color: GLOW2, count: 4, speed: 120 });
  });
  game.onRelease(function () {
    if (state !== S.PLAYING) return;
    v.spin = 0;
    game.audio.tone('C5', 0.03, { wave: 'sine', volume: 0.02 });
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (!v) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 13 });
      glowText(GAME_TITLE, W / 2, H * 0.045, 84, AMBER);
      glowText('HI-SCORE ' + game.best, W / 2, 170, 34, GLOW);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) glowText('► 100円 投入 ◄', W / 2, H * 0.93, 48, AMBER);
      else glowText('INSERT COIN', W / 2, H * 0.93, 42, WHITE);
      return;
    }
    if (state === S.RESULT) {
      drawScene(); drawHud(); drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) glowText('TAP TO CONTINUE', W / 2, H * 0.93, 38, WHITE);
      return;
    }

    if (v.done) {
      v.endWait -= dt;
      if (v.hitStop > 0) v.hitStop -= dt;
      if (v.endWait <= 0) {
        state = S.RESULT;
        var stats = { shells: v.got, bestChain: v.bestChain, hits: v.hits };
        if (v.ok) game.end.success(scoreOf(), stats);
        else game.end.failure(stats);
      }
    } else if (v.ready > 0) {
      v.ready -= dt;
      if (v.ready <= 0) game.audio.play('se_tap', 0.4);
    } else {
      if (game.input.pressing && v.hitStop <= 0) steer(game.input.x, dt);
      else v.spin = 0;
      if (v.hitStop <= 0) v.timeLeft -= dt;
      if (v.timeLeft <= 0 && !v.finished) {
        v.timeLeft = 0; v.finished = true; v.ok = v.got >= NEEDED; v.hitStop = 0.4;
        if (v.ok) game.feedback.good(VPX, VPY, { text: 'FINISH', color: AMBER, count: 30 });
        else game.feedback.bad(VPX, VPY, { text: 'TIME UP' });
        finish();
      } else {
        run(dt);
      }
    }

    drawScene();
    drawHud();
    if (v.ready > 0) glowText(v.ready > 0.35 ? 'READY?' : 'GO!', W / 2, VPY, 110, AMBER);
    if (v.done) drawResult();
  });

  function song() {
    game.audio.melody(
      [['E4', 0.5], ['B4', 0.5], ['E5', 0.5], ['B4', 0.5], ['D5', 0.5], ['A4', 0.5], ['D5', 0.5], ['F#5', 0.5], ['E5', 1], ['B4', 1]],
      { tempo: 150, wave: 'sawtooth', volume: 0.035, loop: true, bass: [['E2', 2], ['D2', 2], ['C2', 2], ['B1', 2]] }
    );
  }

  game.onStart(function () {
    song();
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);

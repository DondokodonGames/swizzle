// J-GC4-0038-harbor-snapper-swing.js
// 鎖亀ぶん回し — 指で円を描いて鎖つきの噛みつき亀を振り回し、離した瞬間の接線方向へ飛ばして浮き的に噛みつかせる
// 操作: 見張り番のまわりで指をぐるぐる回すと亀が加速する。指を離すとその瞬間に亀が進んでいた向きへ鎖が伸びる。回りが遅いと届かない
// 終わり: 制限時間内に規定数の浮き的へ噛みつけばCLEAR。時間切れでGAME OVER
// @mechanic: rotate_gesture
// @theme: harbor_chained_snapper
// 世界観: 港祭りの余興、岩場の見張り番が鎖つきの噛みつき亀を頭上で振り回し、波間を漂う木の浮き的めがけて放って、鐘が鳴る前に規定の数だけ噛みつかせる
// 残るもの: 正誤(CLEAR/GAME OVER) + 噛みついた的の数・最高回転速度
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い黒輪郭を先に描き、内側を明暗2色だけで塗る
  var STYLE = { bg: ['#3aa7c9', '#2b7fa6', '#1d5d80'], main: ['#6fbf4a', '#3f8a2e', '#d9c7a0'], accent: ['#ff6a3d', '#ffe14d'] };
  var C = {
    sea1: '#5cc3e0', sea2: '#2b7fa6', sea3: '#1d5d80', foam: '#e8fbff', rock: '#8c7f73', rockD: '#5e544b',
    line: '#141414', shell: '#6fbf4a', shellD: '#3f8a2e', skin: '#c7e07a', chain: '#b9c2c9', chainD: '#6f7a83',
    wood: '#d9a15a', woodD: '#9a6a2e', red: '#ff5a3a', white: '#ffffff', gold: '#ffe14d', bad: '#ff4040', good: '#8cf07a', ink: '#141414'
  };

  var GAME_TITLE = 'SNAPPER SWING';
  var TIME_LIMIT = 14;
  var NEEDED = 4;
  var PX = W / 2, PY = H * 0.6;
  var R = 210;
  var LAUNCH_MIN = 5.5;      // rad/s。これ未満は放っても飛ばない
  var ASSIST = 0.42;         // rad。接線から近い的へ吸い付く許容角

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var phase, ready, timeLeft, theta, omega, spinning, lastAng, lastT, revAcc, charged, snap, targets, bites, tries,
    maxOmega, hitStop, outro, ok, focus, respawnT, halfShown;

  // ── sprites ───────────────────────────────────────────────────────
  var KEEPER = [
    ['..kkkk..', '.kkkkkk.', '..ffff..', '..fefe..', '.rrrrrr.', 'rrrrrrrr', '.rr..rr.', '.kk..kk.'],
    ['..kkkk..', '.kkkkkk.', '..ffff..', '..fefe..', '.rrrrrr.', 'rrrrrrrr', 'rr....rr', 'kk....kk']
  ];
  var KEEPER_PAL = { k: '#2a3a55', f: '#f2c79a', e: C.ink, r: C.red };
  var TURTLE = [
    ['...hh...', '..hhhh..', '.lsssssl', 'lsSSSSsl', 'lsSSSSsl', '.lsssss.', '..l..l..'],
    ['..hhhh..', '..hmmh..', '.lsssssl', 'lsSSSSsl', 'lsSSSSsl', '.lsssss.', '.l....l.']
  ];
  var TURTLE_PAL = { h: C.skin, m: C.red, l: C.skin, s: C.shellD, S: C.shell };
  var WAVE = ['.ff.', 'f..f'];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function toonCircle(x, y, r, base, shade) {
    game.draw.circle(x, y, r + 6, C.line);
    game.draw.circle(x, y, r, shade);
    game.draw.circle(x - r * 0.18, y - r * 0.18, r * 0.78, base);
  }

  function wrap(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; theta = -Math.PI / 2; omega = 0; spinning = false;
    lastAng = 0; lastT = 0; revAcc = 0; charged = false; snap = null; targets = []; bites = 0; tries = 0; maxOmega = 0;
    hitStop = 0; outro = 0; ok = false; focus = null; respawnT = 0; halfShown = false;
    for (var i = 0; i < 3; i++) addTarget(i);
  }

  function addTarget(slot) {
    for (var n = 0; n < 20; n++) {
      var a = game.random(0, Math.PI * 2), d = game.random(R + 170, R + 380);
      var x = PX + Math.cos(a) * d, y = PY + Math.sin(a) * d * 0.95;
      if (x < 110 || x > W - 110 || y < 330 || y > H * 0.82) continue;
      var clash = false;
      for (var j = 0; j < targets.length; j++) if (Math.hypot(targets[j].x - x, targets[j].y - y) < 200) clash = true;
      if (clash) continue;
      targets.push({ x: x, y: y, bx: x, by: y, ph: game.random(0, 6), r: 62, gold: Math.random() < 0.18, bitten: 0 });
      return;
    }
  }

  // 指の角度入力(実プレイ・デモ共用)。角速度を平滑化して回転量を貯める
  function feedAngle(ang, now) {
    var d = wrap(ang - lastAng);
    var dtm = Math.max(0.008, now - lastT);
    lastAng = ang; lastT = now;
    var inst = Math.max(-20, Math.min(20, d / dtm));
    omega = omega * 0.75 + inst * 0.25;
    revAcc += Math.abs(d);
    if (Math.abs(omega) > maxOmega) maxOmega = Math.abs(omega);
    return d;
  }

  function creaturePos() { return { x: PX + Math.cos(theta) * R, y: PY + Math.sin(theta) * R }; }

  function release(isDemo) {
    var p = creaturePos();
    var sgn = omega >= 0 ? 1 : -1;
    var tx = -Math.sin(theta) * sgn, ty = Math.cos(theta) * sgn;
    var reach = 140 + Math.abs(omega) * 52;
    if (Math.abs(omega) < LAUNCH_MIN) {
      // 勢い不足: 亀はその場でもがくだけ
      if (!isDemo) {
        game.audio.tone('D3', 0.12, { wave: 'square', volume: 0.07 });
        game.fx.popup('...', p.x, p.y - 80, { color: C.white, size: 44 });
      }
      omega *= 0.5;
      return;
    }
    // 接線に近い的へ吸い付く(許容角内)
    var best = null, bestA = ASSIST;
    for (var i = 0; i < targets.length; i++) {
      var tg = targets[i];
      if (tg.bitten > 0) continue;
      var vx = tg.x - p.x, vy = tg.y - p.y;
      var a = Math.abs(wrap(Math.atan2(vy, vx) - Math.atan2(ty, tx)));
      if (a < bestA) { bestA = a; best = tg; }
    }
    if (best) {
      var dd = Math.hypot(best.x - p.x, best.y - p.y) || 1;
      tx = (best.x - p.x) / dd; ty = (best.y - p.y) / dd;
    }
    snap = { sx: p.x, sy: p.y, dx: tx, dy: ty, reach: reach, ext: 0, back: false, target: null, demo: isDemo };
    tries += isDemo ? 0 : 1;
    omega = 0; spinning = false; charged = false;
    game.audio.play('se_jump', 0.5);
  }

  function stepSnap(dt) {
    if (!snap) return;
    if (!snap.back) {
      snap.ext += 2100 * dt;
      var hx = snap.sx + snap.dx * snap.ext, hy = snap.sy + snap.dy * snap.ext;
      for (var i = 0; i < targets.length; i++) {
        var tg = targets[i];
        if (tg.bitten > 0) continue;
        if (Math.hypot(tg.x - hx, tg.y - hy) < tg.r + 34) {
          tg.bitten = 0.01; snap.target = tg; snap.back = true;
          if (!snap.demo) {
            bites += tg.gold ? 2 : 1;
            focus = tg; hitStop = 0.25;
            game.feedback.good(tg.x, tg.y - 60, { text: tg.gold ? 'PERFECT' : 'GOOD', color: tg.gold ? C.gold : C.good, count: tg.gold ? 22 : 12 });
            if (!halfShown && bites >= NEEDED / 2) {
              halfShown = true;
              game.audio.play('se_milestone', 0.5);
              game.fx.popup(bites + ' / ' + NEEDED, W / 2, H * 0.2, { color: C.gold, size: 64 });
            }
            if (bites >= NEEDED) finish(true);
          } else {
            game.fx.burst(tg.x, tg.y, { color: C.gold, count: 10, speed: 260 });
          }
          break;
        }
      }
      if (!snap.back && snap.ext >= snap.reach) {
        snap.back = true;
        if (!snap.demo) {
          game.audio.play('se_bad', 0.3);
          game.fx.popup('MISS', hx, hy - 60, { color: C.bad, size: 48 });
        }
      }
    } else {
      snap.ext -= 1900 * dt;
      if (snap.target) { snap.target.x = snap.sx + snap.dx * Math.max(0, snap.ext); snap.target.y = snap.sy + snap.dy * Math.max(0, snap.ext); }
      if (snap.ext <= 0) {
        if (snap.target) {
          var idx = targets.indexOf(snap.target);
          if (idx >= 0) targets.splice(idx, 1);
          respawnT = 0.5;
        }
        snap = null;
      }
    }
  }

  function stepTargets(dt) {
    var t = game.time.elapsed;
    for (var i = 0; i < targets.length; i++) {
      var tg = targets[i];
      if (tg.bitten > 0) continue;
      tg.x = tg.bx + Math.cos(t * 0.8 + tg.ph) * 40;
      tg.y = tg.by + Math.sin(t * 1.1 + tg.ph) * 24;
    }
    if (respawnT > 0) respawnT -= dt;
    else if (targets.length < 3) addTarget(0);
  }

  function finish(win) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.55;
    game.audio.stopBgm();
    if (win) { game.fx.flash(C.gold, 0.25); game.audio.play('se_success', 0.6); }
    else {
      focus = null;
      game.feedback.bad(PX, PY - 150, { text: 'TIME UP' });
      game.audio.play('se_failure', 0.6);
    }
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || phase !== 'play' || snap) return;
    spinning = true;
    lastAng = Math.atan2(y - PY, x - PX); lastT = game.time.elapsed;
    game.audio.play('se_tap', 0.35);
    game.fx.burst(x, y, { color: C.foam, count: 4, speed: 120 });
  });

  game.onMove(function(x, y) {
    if (!spinning || state !== S.PLAYING) return;
    if (Math.hypot(x - PX, y - PY) < 70) { lastT = game.time.elapsed; return; }
    feedAngle(Math.atan2(y - PY, x - PX), game.time.elapsed);
    if (revAcc > Math.PI * 2) {
      revAcc -= Math.PI * 2;
      game.audio.tone(220 + Math.abs(omega) * 40, 0.06, { wave: 'triangle', volume: 0.07 });
    }
    if (!charged && Math.abs(omega) >= LAUNCH_MIN) {
      charged = true;
      game.audio.play('se_powerup', 0.35);
    }
  });

  game.onRelease(function(x, y) {
    if (!spinning || state !== S.PLAYING) return;
    spinning = false;
    if (phase === 'play' && !snap) release(false);
    else game.audio.play('se_tap', 0.1);
  });

  // ── demo(指で円を描いて加速 → 接線が的に向いた瞬間に離す)──────────
  var demo = { t: 0, gx: PX, gy: PY + 300, press: false, phi: 0, done: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) {
      demo.done = false; demo.phi = theta; lastAng = demo.phi; lastT = demo.t; omega = 0;
      if (targets.length < 3) addTarget(0);
    }
    if (!demo.done && !snap) {
      demo.press = true;
      var spd = Math.min(11, 3 + cyc * 7);
      demo.phi += spd * dt;
      demo.gx = PX + Math.cos(demo.phi) * 300; demo.gy = PY + Math.sin(demo.phi) * 300;
      feedAngle(demo.phi, demo.t);
      if (cyc > 1.2 && Math.abs(omega) >= LAUNCH_MIN + 1) {
        var p = creaturePos();
        var tx = -Math.sin(theta), ty = Math.cos(theta);
        for (var i = 0; i < targets.length; i++) {
          var a = Math.abs(wrap(Math.atan2(targets[i].y - p.y, targets[i].x - p.x) - Math.atan2(ty, tx)));
          if (a < 0.2 && Math.hypot(targets[i].x - p.x, targets[i].y - p.y) < 140 + Math.abs(omega) * 52) {
            release(true); demo.done = true; demo.press = false; break;
          }
        }
        if (!demo.done && cyc > 2.5) { release(true); demo.done = true; demo.press = false; }
      }
    } else {
      demo.press = false;
    }
  }

  // ── drawing ───────────────────────────────────────────────────────
  function drawSea() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, '#9fe3f5'], [0.12, C.sea1], [0.6, C.sea2], [1, C.sea3]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(t * 1.3));
    for (var r = 0; r < 9; r++) {
      var wy = 300 + r * 170;
      var off = (t * 40 + r * 97) % 260;
      for (var x = -260 + off; x < W; x += 260) game.draw.sprite(WAVE, { f: C.foam }, x, wy + Math.sin(t * 2 + r) * 8, 10, { alpha: 0.5 });
    }
    // 岩場(トゥーン:黒縁→暗→明)
    game.draw.circle(PX, PY + 20, 140, C.line);
    game.draw.circle(PX, PY + 20, 132, C.rockD);
    game.draw.circle(PX - 20, PY + 4, 110, C.rock);
  }

  function drawTargets() {
    var t = game.time.elapsed;
    for (var i = 0; i < targets.length; i++) {
      var tg = targets[i];
      var isF = focus === tg && hitStop > 0;
      var rr = tg.r * (isF ? 1.3 : 1);
      toonCircle(tg.x, tg.y, rr, tg.gold ? C.gold : C.wood, tg.gold ? '#c9a51c' : C.woodD);
      game.draw.circle(tg.x, tg.y, rr * 0.55, C.white);
      game.draw.circle(tg.x, tg.y, rr * 0.28, C.red);
      if (isF) game.draw.circle(tg.x, tg.y, rr * 1.2, '#ffffff', 0.5);
      game.draw.rect(tg.x - rr, tg.y + rr * 0.6 + Math.sin(t * 3 + i) * 4, rr * 2, 8, C.foam, 0.6);
    }
  }

  function drawChainAndTurtle() {
    var t = game.time.elapsed;
    var hx, hy;
    if (snap) {
      hx = snap.sx + snap.dx * Math.max(0, snap.ext); hy = snap.sy + snap.dy * Math.max(0, snap.ext);
    } else {
      var p = creaturePos(); hx = p.x; hy = p.y;
    }
    // 鎖(輪を並べる)
    var n = 14 + (snap ? Math.floor(snap.ext / 40) : 0);
    for (var i = 1; i < n; i++) {
      var k = i / n;
      var cx = PX + (hx - PX) * k, cy = PY - 40 + (hy - PY + 40) * k;
      game.draw.circle(cx, cy, 11, C.line);
      game.draw.circle(cx, cy, 7, i % 2 ? C.chain : C.chainD);
    }
    // 回転の残像(勢い)
    if (!snap && Math.abs(omega) > 2) {
      for (var g = 1; g <= 3; g++) {
        var th = theta - (omega > 0 ? 1 : -1) * g * 0.22;
        game.draw.circle(PX + Math.cos(th) * R, PY + Math.sin(th) * R, 40 - g * 6, C.white, 0.18 * Math.min(1, Math.abs(omega) / 10));
      }
    }
    var fr = TURTLE[(snap && !snap.back) || Math.floor(t * 4) % 2 ? 1 : 0];
    game.draw.circle(hx, hy, 58, C.line);
    game.draw.sprite(fr, TURTLE_PAL, hx, hy, 13, { anchor: 'center' });
  }

  function drawKeeper() {
    var t = game.time.elapsed;
    var fr = KEEPER[Math.abs(omega) > 3 ? Math.floor(t * 10) % 2 : Math.floor(t * 2) % 2];
    game.draw.sprite(fr, KEEPER_PAL, PX, PY - 40 + Math.sin(t * 3) * 4, 13, { anchor: 'center' });
  }

  function drawMeter() {
    // 親指ゾーン: 回転の勢いメーター(届く距離の目安)
    var y = H * 0.86;
    var frac = Math.min(1, Math.abs(omega) / 14);
    game.draw.rect(140, y, W - 280, 40, C.line);
    game.draw.rect(146, y + 6, W - 292, 28, '#24516b');
    game.draw.rect(146, y + 6, (W - 292) * frac, 28, Math.abs(omega) >= LAUNCH_MIN ? C.gold : C.foam);
    var mx = 146 + (W - 292) * (LAUNCH_MIN / 14);
    game.draw.rect(mx - 3, y - 10, 6, 60, C.red);
    game.draw.sprite(TURTLE[0], TURTLE_PAL, 90, y + 20, 7, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 220, C.sea3, 0.55);
    txt(bites + ' / ' + NEEDED, W / 2, 95, 70, C.gold);
    game.draw.rect(60, 175, W - 120, 20, C.line);
    game.draw.rect(64, 179, (W - 128) * Math.max(0, timeLeft / TIME_LIMIT), 12, timeLeft < 4 ? C.bad : C.good);
    txt(String(Math.ceil(timeLeft)), 80, 95, 48, C.white, 'left');
  }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      theta += omega * dt;
      omega *= Math.pow(0.5, dt);
      stepSnap(dt); stepTargets(dt);
      drawSea(); drawTargets(); drawChainAndTurtle(); drawKeeper(); drawMeter();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.07 + Math.sin(t * 2) * 6, 76, C.gold);
      txt('HI-SCORE ' + game.best, W / 2, H * 0.12, 36, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 44, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.95, 36, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawSea(); drawTargets(); drawKeeper();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 90, ok ? C.gold : C.bad);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 40, C.white);
      return;
    }

    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'play') {
      if (hitStop > 0) hitStop -= dt;
      else {
        timeLeft -= dt;
        if (!snap) { theta += omega * dt; omega *= Math.pow(0.5, dt); }
        stepSnap(dt); stepTargets(dt);
        if (phase === 'play' && timeLeft <= 0) { timeLeft = 0; finish(false); }
      }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      if (outro <= 0) {
        state = S.RESULT;
        var score = bites * 100 + Math.round(maxOmega * 5);
        var stats = { bites: bites, tries: tries, spin: Math.round(maxOmega * 10) / 10 };
        if (ok) game.end.success(score, stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawSea(); drawTargets(); drawChainAndTurtle(); drawKeeper(); drawMeter(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 96, C.gold);
    if (phase === 'outro') {
      game.draw.rect(0, H * 0.24, W, H * 0.18, C.line, 0.6);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.29, 96, ok ? C.gold : C.bad);
      var sc = bites * 100 + Math.round(maxOmega * 5);
      txt('SCORE ' + sc, W / 2, H * 0.35, 44, C.white);
      if (ok && sc > game.best) txt('NEW RECORD', W / 2, H * 0.39, 40, C.gold);
      else if (!ok) txt('あと' + Math.max(1, NEEDED - bites) + '個!', W / 2, H * 0.39, 44, C.white);
      else txt('BEST ' + game.best, W / 2, H * 0.39, 36, C.white);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['A4', 0.5], ['C5', 0.5], ['E5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['C5', 1],
      ['D5', 0.5], ['F5', 0.5], ['A5', 0.5], ['F5', 0.5], ['E5', 1], ['R', 1]
    ], { tempo: 138, wave: 'square', volume: 0.05, loop: true, bass: [['A2', 1], ['E3', 1], ['A2', 1], ['E3', 1], ['D3', 1], ['A2', 1], ['E3', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

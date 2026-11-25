// I-GBA-0039v2-harbor-oyster-pry-mash.js
// 牡蠣こじあけ — 連打で木べらを少しずつ差し込み、固く閉じた牡蠣の殻を時間内にこじ開ける
// 操作: 画面のどこでも連打すると木べらが一押しずつ殻のすき間へ入る。手を止めると殻が押し戻す。殻が赤いトゲを出して震えたら食い締めの合図なので連打を止める(食い締め中に叩くとべらが滑る)
// 終わり: 牡蠣3個(小→中→大)を14秒以内に開け切ればCLEAR。べらが3回滑る/時間切れでGAME OVER
// @mechanic: mash
// @theme: winter_fishing_port_oyster_shucking
// 世界観: 冬の漁港の作業小屋で、牡蠣むき職人が木べらを連打で差し込み、殻が食い締める瞬間だけ手を止めながら固い殻を次々こじ開ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 開けた個数・連打数・最速連打のスコア
// スタイル: 70s MONO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s MONO: 白黒ラスターに画面帯ごとの単色セロハン。矩形波の単音、無音の間が緊張
  var STYLE = { bg: ['#000000', '#101010'], main: ['#f4f4f4', '#9a9a9a', '#4a4a4a'], accent: ['#ffb020', '#ff3a3a'] };
  var Z = {
    black: STYLE.bg[0], dim: STYLE.bg[1], white: STYLE.main[0], gray: STYLE.main[1], dark: STYLE.main[2],
    amber: STYLE.accent[0], red: STYLE.accent[1], cyan: '#40d8ff', green: '#40ff80',
  };

  var GAME_TITLE = 'KAKI PRY';
  var TIME_LIMIT = 14;
  var OYSTERS = [
    { need: 9, every: 0, decay: 0.12, size: 0.8 },
    { need: 13, every: 1.7, decay: 0.16, size: 0.92 },
    { need: 17, every: 1.35, decay: 0.2, size: 1.05 },
  ];
  var NEEDED = 3;
  var SLIP_MAX = 3;
  var HX = 230, HY = Math.round(H * 0.47);

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var idx, cfg, prog, idleT, clamp, opened, slips, hits, bestRate, tapTimes, score;
  var timeLeft, readyT, nextT, stopT, stopObj, fin, cleared, postT, warnT, pushT, slipT, cheerT, playT, finalScore, shakeX;

  // 牡蠣むき職人(毛糸帽・白ひげ)
  var MAN_A = ['..wwwwww..', '.wwwwwwww.', '.w.w.w.w..', '..ffffff..', '..fkffkf..', '..fwwwwf..', '...wwww...', '.gggggggg.', 'gggggggggg', 'gg.gggg.gg'];
  var MAN_P1 = ['..wwwwww..', '.wwwwwwww.', '.w.w.w.w..', '..ffffff..', '..fkffkf..', '..fwwwwf..', '...wwww...', '.ggggggggf', 'ggggggggg.', 'gg.gggg.gg'];
  var MAN_P2 = ['..wwwwww..', '.wwwwwwww.', '.w.w.w.w..', '..ffffff..', '..fkffkf..', '..fwwwwf..', '...wwww...', '.gggggggg.', 'gggggggggf', 'gg.gggg.gg'];
  var MAN_SLIP = ['.w.wwww.w.', '.wwwwwwww.', '.w.w.w.w..', '..ffffff..', '..fkkfkkf.', '..fwkkwf..', '...wwww...', 'fgggggggg.', 'gggggggggg', 'gg.gggg.gg'];
  var MAN_JOY = ['f.wwwwww.f', 'fwwwwwwwwf', '.w.w.w.w..', '..ffffff..', '..fkffkf..', '..fwkkwf..', '...wwww...', '.gggggggg.', 'gggggggggg', 'gg.gggg.gg'];
  var MAN_PAL = { w: '#f4f4f4', f: '#bdbdbd', k: '#000000', g: '#7a7a7a' };
  var LAMP = ['.ww.', 'wwww', 'wwww', '.ww.'];

  function out(str, x, y, sz, color) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: Z.black, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function setupOyster(i) {
    cfg = OYSTERS[i];
    prog = 0; idleT = 0;
    clamp = { cd: cfg.every > 0 ? cfg.every * 0.8 : 0, warn: 0, on: 0 };
  }

  function initGame() {
    idx = 0; opened = 0; slips = 0; hits = 0; bestRate = 0; tapTimes = []; score = 0;
    timeLeft = TIME_LIMIT; readyT = 0.8; nextT = 0; stopT = 0; stopObj = null; fin = false; cleared = false;
    postT = 0; warnT = 0; pushT = 0; slipT = 0; cheerT = 0; playT = 0; finalScore = 0; shakeX = 0;
    setupOyster(0);
  }

  function rate() {
    var now = game.time.elapsed, n = 0;
    for (var i = tapTimes.length - 1; i >= 0; i--) { if (now - tapTimes[i] <= 1) n++; else break; }
    return n;
  }

  // 一押し(本番・デモ共通)
  function push() {
    var lx = HX + 60 + prog * 160, ly = HY - 10;
    if (clamp.on > 0) { slip(lx, ly); return; }
    hits++; idleT = 0; pushT = 0.08;
    tapTimes.push(game.time.elapsed);
    if (tapTimes.length > 20) tapTimes.shift();
    var r = rate();
    if (r > bestRate) bestRate = r;
    var fever = r >= 7;
    prog = Math.min(1, prog + 1 / cfg.need);
    score += fever ? 20 : 10;
    game.audio.tone(300 + prog * 500, 0.04, { wave: 'square', volume: 0.07 });
    game.fx.burst(lx, ly, { color: Z.white, count: 3, speed: 160 });
    if (fever && r % 4 === 3) game.fx.popup('x2', lx + 120, ly - 140, { color: Z.amber, size: 46 });
    if (prog >= 1) openIt();
  }

  function openIt() {
    opened++;
    var clean = slipT <= 0;
    var pts = 300 + (clean ? 200 : 0);
    score += pts;
    nextT = 0.85; cheerT = 0.85;
    game.feedback.good(HX + 260, HY - 140, { text: clean ? 'PERFECT' : 'GOOD', color: Z.white, size: 60 });
    game.audio.play('se_coin', 0.35);
    game.fx.popup('+' + pts, HX + 260, HY - 260, { color: Z.amber, size: 44 });
    if (opened === 2) { game.audio.play('se_milestone', 0.45); game.fx.popup('NICE', W / 2, H * 0.28, { color: Z.amber, size: 90 }); }
  }

  function slip(x, y) {
    slips++; slipT = 0.6; idleT = 0;
    prog = Math.max(0, prog - 0.25);
    if (mode === S.PLAYING && slips >= SLIP_MAX) {
      stopT = 0.45; stopObj = { kind: 'slip', x: x, y: y };
      game.fx.flash('#ffffff', 0.12);
      game.audio.tone('C3', 0.3, { wave: 'sawtooth', volume: 0.1, slide: -60 });
      return;
    }
    game.feedback.bad(x, y, { text: 'MISS', color: Z.red, size: 58 });
  }

  // 殻の食い締め: 予告(0.6秒 赤トゲ+震え)→ 食い締め(0.5秒)
  function stepShell(dt) {
    idleT += dt;
    if (idleT > 0.3 && prog > 0 && prog < 1) prog = Math.max(0, prog - cfg.decay * dt);
    if (cfg.every > 0 && prog < 1) {
      if (clamp.on > 0) {
        clamp.on -= dt;
        prog = Math.max(0, prog - 0.12 * dt);
        if (clamp.on <= 0) clamp.cd = cfg.every;
      } else if (clamp.warn > 0) {
        clamp.warn -= dt;
        if (clamp.warn <= 0) { clamp.on = 0.5; game.audio.tone('G2', 0.18, { wave: 'square', volume: 0.1 }); }
      } else {
        clamp.cd -= dt;
        if (clamp.cd <= 0) { clamp.warn = 0.6; game.audio.tone('E6', 0.06, { wave: 'square', volume: 0.07 }); game.audio.tone('B5', 0.06, { wave: 'square', volume: 0.05 }); }
      }
    }
    shakeX = clamp.warn > 0 ? Math.sin(game.time.elapsed * 70) * 10 : (clamp.on > 0 ? Math.sin(game.time.elapsed * 40) * 4 : 0);
    if (pushT > 0) pushT -= dt;
    if (slipT > 0) slipT -= dt;
    if (cheerT > 0) cheerT -= dt;
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = score + (win ? Math.ceil(timeLeft) * 40 : 0);
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 6; i++) game.fx.burst(160 + i * 150, H * 0.42 + (i % 2) * 180, { color: i % 2 ? Z.amber : Z.white, count: 18, speed: 520 });
      game.fx.flash(Z.white, 0.2);
    }
  }

  function resolveStop() {
    if (!stopObj) return;
    var o = stopObj;
    stopObj = null;
    if (o.kind === 'win') { ending(true); return; }
    game.feedback.bad(o.x, o.y, { text: o.kind === 'time' ? 'TIME UP' : 'MISS', color: Z.red, size: 60 });
    ending(false);
  }

  // ---- 入力 ----
  function canPlay() { return mode === S.PLAYING && !fin && stopT <= 0 && readyT <= 0 && nextT <= 0; }

  game.onPress(function(x, y) {
    if (!canPlay()) return;
    push();
    if (clamp.on <= 0) game.fx.burst(x, y, { color: Z.gray, count: 2, speed: 90 });
  });
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { mode = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function shed(t) {
    game.draw.gradient(0, H, [[0, Z.black], [0.5, Z.dim], [1, Z.black]]);
    // 小屋の板壁(白ドットの木目)
    for (var b = 0; b < 8; b++) for (var d = 0; d < 26; d++) game.draw.rect(b * 140 + 20 + (d % 3) * 30, 240 + d * 22 + (b % 2) * 11, 8, 4, Z.dark);
    // 雪の窓
    game.draw.rect(700, 270, 280, 200, Z.dark);
    game.draw.rect(712, 282, 256, 176, Z.black);
    for (var s = 0; s < 14; s++) game.draw.rect(716 + ((s * 53) % 248), 286 + ((s * 37 + t * 70) % 168), 6, 6, Z.white);
    game.draw.rect(836, 282, 8, 176, Z.dark);
    // 裸電球
    var sw = Math.sin(t * 1.4) * 14;
    game.draw.line(380, 230, 380 + sw, 330, Z.gray, 3);
    game.draw.sprite(LAMP, { w: Z.white }, 380 + sw, 350, 12, { anchor: 'center' });
    game.draw.circle(380 + sw, 350, 70, Z.white, 0.08 + Math.sin(t * 9) * 0.02);
    // 作業台
    game.draw.rect(0, Math.round(H * 0.6), W, 16, Z.white);
    for (var p = 0; p < 6; p++) game.draw.rect(0, Math.round(H * 0.62) + p * 60, W, 4, Z.dark);
    // 剥いた殻の山
    for (var k = 0; k < opened; k++) { game.draw.circle(840 + (k % 2) * 70, H * 0.66 + Math.floor(k / 2) * 30, 40, Z.gray); game.draw.circle(840 + (k % 2) * 70, H * 0.66 + Math.floor(k / 2) * 30, 26, Z.white); }
  }

  function lidPt(x, y, a) { return { x: HX + x * Math.cos(a) + y * Math.sin(a), y: HY - x * Math.sin(a) + y * Math.cos(a) }; }

  function drawOyster(t) {
    var sz = cfg.size * 1.15, L = 540 * sz;
    var big = stopObj && stopT > 0 && stopObj.kind !== 'win';
    var wf = big && Math.floor(t * 16) % 2 === 0;
    var ox = shakeX;
    var a = prog * 0.62 + (pushT > 0 ? 0.03 : 0);
    var N = 16, i, u;
    // 下殻
    for (i = 0; i < N; i++) {
      u = i / N; var u2 = (i + 1) / N;
      game.draw.line(HX + ox + u * L, HY + Math.sin(u * Math.PI) * 120 * sz, HX + ox + u2 * L, HY + Math.sin(u2 * Math.PI) * 120 * sz, wf ? Z.white : Z.gray, 16);
      for (var r = 1; r <= 3; r++) game.draw.line(HX + ox + u * L, HY + Math.sin(u * Math.PI) * 120 * sz * r / 4, HX + ox + u2 * L, HY + Math.sin(u2 * Math.PI) * 120 * sz * r / 4, Z.dark, 6);
    }
    // 身(開くほど見える)
    if (prog > 0.15) {
      var m = Math.min(1, (prog - 0.15) / 0.7);
      game.draw.circle(HX + ox + L * 0.55, HY + 16, 120 * sz * m, Z.white, 0.85);
      game.draw.circle(HX + ox + L * 0.52, HY + 6, 70 * sz * m, Z.gray, 0.6);
    }
    // 上殻(蝶番を軸に回る)
    for (i = 0; i < N; i++) {
      u = i / N; var v = (i + 1) / N;
      var p0 = lidPt(u * L, -Math.sin(u * Math.PI) * 80 * sz, a), p1 = lidPt(v * L, -Math.sin(v * Math.PI) * 80 * sz, a);
      var q0 = lidPt(u * L, 0, a), q1 = lidPt(v * L, 0, a);
      game.draw.line(p0.x + ox, p0.y, p1.x + ox, p1.y, wf ? Z.amber : Z.white, 18);
      game.draw.line(q0.x + ox, q0.y, q1.x + ox, q1.y, Z.white, 8);
      var mid0 = lidPt(u * L, -Math.sin(u * Math.PI) * 40 * sz, a), mid1 = lidPt(v * L, -Math.sin(v * Math.PI) * 40 * sz, a);
      game.draw.line(mid0.x + ox, mid0.y, mid1.x + ox, mid1.y, Z.gray, 8);
    }
    // 木べら
    var depth = 30 + prog * 160;
    game.draw.line(HX - 280 + depth, HY + 30, HX + depth, HY - 2, '#c89a5a', 26);
    game.draw.line(HX - 280 + depth, HY + 30, HX - 120 + depth, HY + 18, '#7a5a2a', 34);
    // 食い締めの予告(赤トゲ)
    if (clamp.warn > 0 || clamp.on > 0) {
      var blink = clamp.on > 0 || Math.floor(t * 12) % 2 === 0;
      if (blink) for (var s = 0; s < 14; s++) {
        var sa = s / 14 * Math.PI * 2, cx = HX + L * 0.5 + ox, cy = HY - 10;
        game.draw.line(cx + Math.cos(sa) * L * 0.58, cy + Math.sin(sa) * 170 * sz, cx + Math.cos(sa) * (L * 0.58 + 50), cy + Math.sin(sa) * (170 * sz + 50), Z.red, 12);
      }
    }
    // 開く目標(光る縁)
    if (prog < 1) game.draw.circle(HX + L + ox, HY - 10, 18 + Math.sin(t * 8) * 6, Z.white, 0.6);
  }

  function drawMan(t) {
    var fr;
    if (slipT > 0) fr = MAN_SLIP;
    else if (cheerT > 0 || (fin && cleared)) fr = MAN_JOY;
    else if (pushT > 0 || idleT < 0.2) fr = Math.floor(t * 14) % 2 ? MAN_P1 : MAN_P2;
    else fr = MAN_A;
    var hop = cheerT > 0 ? -Math.abs(Math.sin(t * 14)) * 22 : Math.sin(t * 2.4) * 4;
    game.draw.sprite(fr, MAN_PAL, 200, H * 0.83 + hop, 18, { anchor: 'center' });
  }

  function drawHud(t) {
    var lowT = timeLeft < 4 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(70, 36, W - 140, 28, Z.white);
    game.draw.rect(76, 42, W - 152, 16, Z.black);
    game.draw.rect(76, 42, (W - 152) * Math.max(0, timeLeft / TIME_LIMIT), 16, lowT ? Z.red : Z.white);
    out(opened + ' / ' + NEEDED, W / 2, 116, 50, Z.white);
    for (var o = 0; o < OYSTERS.length; o++) { game.draw.circle(110 + o * 70, 176, 24, Z.white); game.draw.circle(110 + o * 70, 176, 18, o < opened ? Z.white : Z.black); }
    for (var m = 0; m < SLIP_MAX; m++) game.draw.rect(W - 130 - m * 64, 156, 40, 40, m < slips ? Z.red : Z.dark);
    out('' + score, W - 240, 116, 34, Z.white);
    // 親指ゾーン: 開き具合の大ゲージ + 連打の速さ
    var gx = 420, gy = Math.round(H * 0.8), gw = 560;
    game.draw.rect(gx - 6, gy - 6, gw + 12, 64, Z.white);
    game.draw.rect(gx, gy, gw, 52, Z.black);
    game.draw.rect(gx, gy, gw * prog, 52, clamp.on > 0 ? Z.red : Z.white);
    var r = rate();
    for (var k = 0; k < 10; k++) game.draw.rect(gx + k * 56, gy + 80, 44, 24, k < r ? Z.white : Z.dark);
  }

  function bands() {
    game.draw.rect(0, 0, W, Math.round(H * 0.2), Z.amber, 0.22);
    game.draw.rect(0, Math.round(H * 0.2), W, Math.round(H * 0.42), Z.cyan, 0.12);
    game.draw.rect(0, Math.round(H * 0.62), W, H, Z.green, 0.14);
    for (var y = 0; y < H; y += 8) game.draw.rect(0, y, W, 2, Z.black, 0.25);
  }

  function drawScene(t) {
    shed(t);
    drawOyster(t);
    drawMan(t);
  }

  // ---- ATTRACT: 本物の push()/stepShell() で 小粒を連打で開ける → 食い締め中に叩いて滑る → 止めて再開 ----
  var demo = { t: 0, gx: W / 2, gy: H * 0.7, press: false, nt: 0, phase: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.0;
    if (cyc < dt || demo.t <= dt) {
      initGame(); readyT = 0; demo.phase = 0; demo.nt = 0.3;
    }
    stepShell(dt);
    if (nextT > 0) { nextT -= dt; if (nextT <= 0) { setupOyster(1); clamp.cd = 0.2; } }
    var mashing = (cyc > 0.3 && cyc < 1.7) || (cyc > 2.2 && cyc < 3.3) || (cyc > 3.8 && cyc < 4.9);
    demo.gx = W / 2 + 80 + Math.sin(demo.t * 3) * 20; demo.gy = H * 0.68;
    demo.press = false;
    if (mashing && nextT <= 0 && prog < 1) {
      demo.nt -= dt;
      demo.press = demo.nt < 0.06;
      if (demo.nt <= 0) { demo.nt = 0.14; push(); }
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      out(GAME_TITLE, W / 2, H * 0.055 + Math.sin(t * 2) * 5, 96, Z.white);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.098, 38, Z.gray);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.955, 48, Z.white);
      else out('INSERT COIN', W / 2, H * 0.955, 40, Z.gray);
      bands();
      return;
    }

    if (mode === S.RESULT) {
      drawScene(t);
      game.draw.rect(90, H * 0.30, W - 180, 500, Z.black, 0.85);
      game.draw.rect(90, H * 0.30, W - 180, 6, Z.white);
      out(cleared ? 'CLEAR' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.34, 96, cleared ? Z.white : Z.red);
      out('SCORE ' + finalScore, W / 2, H * 0.40, 60, Z.white);
      out(opened + ' / ' + NEEDED + '   ' + bestRate + '/s', W / 2, H * 0.45, 44, Z.gray);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.50, 56, Z.white);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.50, 42, Z.gray);
      if (!cleared) out('あと' + Math.max(1, Math.round((1 - prog) * 100)) + '%!', W / 2, H * 0.27, 60, Z.white);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.955, 40, Z.white);
      bands();
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { opened: opened, hits: hits, slips: slips, bestRate: bestRate };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) resolveStop();
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else if (nextT > 0) {
      nextT -= dt;
      if (cheerT > 0) cheerT -= dt;
      if (nextT <= 0) {
        if (idx >= OYSTERS.length - 1) {
          stopT = 0.4; stopObj = { kind: 'win' };
          game.audio.play('se_powerup', 0.4);
        } else {
          idx++;
          setupOyster(idx);
          game.audio.play('se_jump', 0.3);
        }
      }
    } else {
      timeLeft -= dt; playT += dt;
      stepShell(dt);
      if (timeLeft < 4) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.06, { wave: 'square', volume: 0.07 }); }
      }
      if (timeLeft <= 0 && stopT <= 0 && !fin) {
        timeLeft = 0;
        stopT = 0.45; stopObj = { kind: 'time', x: HX + 260, y: HY - 60 };
        game.audio.tone('C4', 0.3, { wave: 'square', volume: 0.1, slide: -120 });
      }
    }

    drawScene(t);
    if (stopObj && stopObj.kind === 'win' && stopT > 0) game.draw.circle(HX + 260, HY, 200 + (0.4 - stopT) * 900, Z.white, 0.25);
    if (!fin && readyT <= 0 && idx === 0 && hits === 0 && playT < 1.3) game.draw.hand(W / 2 + 80, H * 0.68, { press: Math.floor(t * 7) % 2 === 0, scale: 12, alpha: 0.5 });
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 120, Z.white);
    bands();
  });

  game.onStart(function() {
    game.audio.melody([
      ['A3', 0.5], ['R', 0.5], ['A3', 0.5], ['C4', 0.5], ['E4', 1], ['R', 1],
      ['D4', 0.5], ['R', 0.5], ['D4', 0.5], ['F4', 0.5], ['E4', 1], ['R', 1],
      ['C4', 0.5], ['E4', 0.5], ['A4', 1], ['G4', 0.5], ['E4', 0.5], ['A3', 2],
    ], { tempo: 132, wave: 'square', volume: 0.05, loop: true, bass: [['A2', 2], ['R', 2], ['D2', 2], ['R', 2], ['A2', 2], ['E2', 2]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);

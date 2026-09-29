// J-Switch-0023-grotto-glowfish-count.js
// 地底湖のヒカリウオ数え — 一瞬だけ水面を跳ねる光る魚の数を数え、同じ数が刻まれた石筍へ跳び移る。間違えれば足場ごと湖へ
// 操作: 跳ねた光る魚(コウモリは数えない)の数を数え、その数字の石筍をタップ(社内メモ。画面には出さない)
// 終わり: 4回続けて正解すればCLEAR。違う数の石筍へ跳ぶ/迷って足場が崩れる(1問3秒)/全体の時間切れでGAME OVER
// @mechanic: counting
// @theme: grotto_glowfish_count_leap
// 世界観: 鍾乳洞の奥の地底湖で、見習いの洞窟案内人が、天井の割れ目の光で一瞬だけ跳ねるヒカリウオの数を数え、その数を刻んだ石筍へ跳び移りながら、崩れていく足場を渡って出口の灯りへ向かう
// 残るもの: 正誤(CLEAR/GAME OVER) + 連続正解数・平均回答秒
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 濃紺グラデ + 半透明円の重ねで疑似グロー、点滅が命
  var STYLE = { bg: ['#07061a', '#16124a', '#241a6a'], main: ['#23e6ff', '#ff3fb4', '#fff36a'], accent: ['#7cff6b', '#ff7a3d'] };
  var C = {
    bg1: '#05041a', bg2: '#1a1250', rock: '#2a2070', rockL: '#4a3aa8', lake: '#0a2a5a',
    fish: '#23e6ff', bat: '#ff3fb4', num: '#fff36a', good: '#7cff6b', bad: '#ff5a3d', white: '#f4f0ff', ink: '#05041a'
  };

  var GAME_TITLE = 'GLOWFISH COUNT';
  var TIME_LIMIT = 15;
  var NEEDED = 4;
  var SHOW_T = 1.1, ASK_T = 3.0;
  var LAKE_Y = H * 0.56;
  var CHOICE_Y = H * 0.7, BASE_Y = H * 0.86;
  var CHOICE_X = [W * 0.2, W * 0.5, W * 0.8];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var phase, ready, timeLeft, streak, roundNo, sub, subT, jumps, answer, choices, guide, jump, fallT, hitStop, outro, ok, sumAns, halfShown, reveal;

  var FISH = [['..cc..', '.cccc.', 'cckccc', 'cccccc', '.cccc.', 'c.cc.c'], ['..cc..', '.cccc.', 'cckccc', 'cccccc', '.cccc.', '.c..c.']];
  var BAT = [['m.....m', 'mm.m.mm', 'mmmmmmm', '.mmkmm.', '...m...'], ['.......', 'm..m..m', 'mmmmmmm', '.mmkmm.', '...m...']];
  var GUIDE = [
    ['..yyy..', '.yyyyy.', '..sss..', '..sks..', '.bbbbb.', 'b.bbb.b', '..b.b..', '.k...k.'],
    ['..yyy..', '.yyyyy.', '..sss..', '..sks..', 'bbbbbbb', '..bbb..', '..b.b..', '..k.k..']
  ];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function glow(x, y, r, col, a) {
    for (var i = 3; i >= 1; i--) game.draw.circle(x, y, r * (1 + i * 0.45), col, a * 0.18 / i);
    game.draw.circle(x, y, r, col, a);
  }

  // 1問: 数える魚 + 紛らわしいコウモリ(3問目から)。魚は時間差で左右から弧を描いて跳ねる
  function newRound() {
    var r = roundNo;
    var lo = [3, 4, 5, 6][Math.min(3, r)], hi = [5, 7, 8, 9][Math.min(3, r)];
    answer = lo + (Math.floor(game.random(0, hi - lo + 1)) % (hi - lo + 1));
    var nBats = r >= 2 ? 2 + (r - 2) : 0;
    jumps = [];
    for (var i = 0; i < answer + nBats; i++) {
      var bat = i >= answer;
      var fromL = game.random(0, 1) < 0.5;
      jumps.push({
        bat: bat, t0: game.random(0, SHOW_T - 0.55), dur: 0.5 + game.random(0, 0.12),
        x0: fromL ? game.random(W * 0.08, W * 0.4) : game.random(W * 0.6, W * 0.92),
        dx: (fromL ? 1 : -1) * game.random(W * 0.18, W * 0.34),
        h: bat ? game.random(160, 260) : game.random(200, 330)
      });
    }
    var opts = [answer - 1, answer, answer + 1];
    for (var k = 2; k > 0; k--) { var j = Math.floor(game.random(0, k + 1)) % (k + 1); var tmp = opts[k]; opts[k] = opts[j]; opts[j] = tmp; }
    choices = [];
    for (var c = 0; c < 3; c++) choices.push({ n: opts[c], x: CHOICE_X[c], rise: 0, crumble: 0 });
    sub = 'show'; subT = SHOW_T; jump = null; reveal = 0;
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; streak = 0; roundNo = 0;
    hitStop = 0; outro = 0; ok = false; sumAns = 0; halfShown = false; fallT = 0;
    guide = { x: W / 2, y: BASE_Y - 90, fall: 0 };
    newRound();
  }

  function stepRound(dt, isDemo) {
    subT -= dt;
    if (sub === 'show') {
      if (subT <= 0) { sub = 'ask'; subT = ASK_T; if (!isDemo) game.audio.play('se_powerup', 0.25); }
    } else if (sub === 'ask') {
      for (var c = 0; c < 3; c++) choices[c].rise = Math.min(1, choices[c].rise + dt * 5);
      if (subT <= 0) choose(null, isDemo);
    } else if (sub === 'jump') {
      var p = 1 - Math.max(0, subT / 0.4);
      guide.x = jump.fx + (jump.tx - jump.fx) * p;
      guide.y = jump.fy + (jump.ty - jump.fy) * p - Math.sin(p * Math.PI) * 180;
      if (subT <= 0) {
        if (jump.right) { sub = 'shift'; subT = 0.35; }
        else { sub = 'fall'; subT = 0.8; if (jump.c) jump.c.crumble = 1; }
      }
    } else if (sub === 'shift') {
      var q = 1 - Math.max(0, subT / 0.35);
      jump.c.x += (W / 2 - jump.c.x) * Math.min(1, q);
      guide.x = jump.c.x; guide.y = CHOICE_Y - 90 + (BASE_Y - CHOICE_Y) * q;
      if (subT <= 0) { guide.x = W / 2; guide.y = BASE_Y - 90; roundNo++; newRound(); }
    } else if (sub === 'fall') {
      guide.fall += dt;
      guide.y += dt * 900 * guide.fall * 2;
      if (subT <= 0 && isDemo) { roundNo = 0; guide = { x: W / 2, y: BASE_Y - 90, fall: 0 }; newRound(); }
    }
    if (reveal > 0) reveal -= dt;
  }

  // 答える(実プレイ・デモ共用)。c=null は時間切れ(足場が崩れる)
  function choose(c, isDemo) {
    if (sub !== 'ask') return;
    var took = ASK_T - subT;
    var right = !!c && c.n === answer;
    reveal = 0.9;
    if (!c) {
      sub = 'fall'; subT = 0.8; jump = { right: false, c: null };
      if (!isDemo) { lose(W / 2, BASE_Y - 60); }
      return;
    }
    sub = 'jump'; subT = 0.4;
    jump = { right: right, c: c, fx: guide.x, fy: guide.y, tx: c.x, ty: CHOICE_Y - 90 };
    if (isDemo) { game.fx.burst(c.x, CHOICE_Y, { color: right ? C.good : C.bad, count: 10, speed: 220 }); return; }
    game.audio.play('se_jump', 0.35);
    if (right) {
      streak++; sumAns += took;
      game.feedback.good(c.x, CHOICE_Y - 200, { text: took < 1.2 ? 'PERFECT' : 'GOOD', color: C.good, count: 16 });
      if (!halfShown && streak >= NEEDED / 2) {
        halfShown = true;
        game.audio.play('se_milestone', 0.5);
        game.fx.popup(streak + ' / ' + NEEDED, W / 2, H * 0.3, { color: C.num, size: 72 });
      }
      if (streak >= NEEDED) finish(true);
    } else {
      lose(c.x, CHOICE_Y - 60);
    }
  }

  function lose(x, y) {
    hitStop = 0.5; fallT = 1;
    game.feedback.bad(x, y - 140, { text: 'MISS', color: C.bad });
    game.audio.play('se_break', 0.5);
    finish(false);
  }

  function finish(win) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = Math.max(hitStop, 0.6);
    game.audio.stopBgm();
    if (win) { game.fx.flash(C.good, 0.25); game.audio.play('se_success', 0.6); }
    else {
      if (timeLeft <= 0) game.feedback.bad(W / 2, H * 0.45, { text: 'TIME UP', color: C.bad });
      game.audio.play('se_failure', 0.6);
    }
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase !== 'play' || hitStop > 0) return;
    if (sub !== 'ask') { game.audio.tone('E3', 0.05, { wave: 'square', volume: 0.03 }); game.fx.burst(x, y, { color: C.fish, count: 3, speed: 80 }); return; }
    var best = null, bd = 170;
    for (var i = 0; i < 3; i++) { var d = Math.hypot(x - choices[i].x, y - CHOICE_Y); if (d < bd) { bd = d; best = choices[i]; } }
    if (best) { game.audio.play('se_tap', 0.3); choose(best, false); }
    else { game.audio.tone('E3', 0.05, { wave: 'square', volume: 0.03 }); game.fx.burst(x, y, { color: C.fish, count: 3, speed: 80 }); }
  });

  // ── demo(2問正解して跳び、3問目は1つずれた数へ跳んで湖へ落ちる)──────────
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: false, n: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 14;
    if (cyc < dt || demo.t <= dt) { roundNo = 0; demo.n = 0; guide = { x: W / 2, y: BASE_Y - 90, fall: 0 }; newRound(); }
    stepRound(dt, true);
    demo.press = false;
    if (sub === 'ask') {
      var wrong = demo.n % 3 === 2;
      var aim = null;
      for (var i = 0; i < 3; i++) if ((!wrong && choices[i].n === answer) || (wrong && choices[i].n !== answer && !aim)) aim = choices[i];
      var k = Math.min(1, dt * 6);
      demo.gx += (aim.x - demo.gx) * k; demo.gy += (CHOICE_Y + 40 - demo.gy) * k;
      if (ASK_T - subT > 1.0) { demo.press = true; choose(aim, true); demo.n++; }
    } else {
      demo.gx += (W * 0.85 - demo.gx) * Math.min(1, dt * 3); demo.gy += (H * 0.45 - demo.gy) * Math.min(1, dt * 3);
    }
  }

  // ── drawing ───────────────────────────────────────────────────────
  function drawCave() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg1], [0.5, C.bg2], [1, C.bg1]]);
    // 天井の鍾乳石(ネオンの輪郭)
    for (var i = 0; i < 12; i++) {
      var sx = 40 + i * 92, len = 60 + ((i * 37) % 90);
      for (var k = 0; k < len; k += 10) game.draw.rect(sx - (len - k) * 0.18, 230 + k, (len - k) * 0.36, 10, C.rock);
      game.draw.circle(sx, 230 + len, 5, C.fish, 0.4 + 0.4 * Math.sin(t * 3 + i));
    }
    // 天井の割れ目の光(出題中に強まる)
    var beam = sub === 'show' ? 0.18 : 0.05;
    for (var b = 0; b < 8; b++) game.draw.rect(W * 0.3 + b * 30, 230, 24, LAKE_Y - 230, C.white, beam * (1 - Math.abs(b - 3.5) / 5));
    // 湖面
    game.draw.rect(0, LAKE_Y, W, H - LAKE_Y, C.lake);
    for (var w = 0; w < 10; w++) {
      var wx = ((w * 140 + t * 50) % (W + 120)) - 60;
      game.draw.rect(wx, LAKE_Y + 10 + (w % 4) * 70, 80, 4, C.fish, 0.3);
    }
    game.draw.line(0, LAKE_Y, W, LAKE_Y, C.fish, 4);
    // 出口の灯り(進むほど明るい)
    glow(W * 0.9, H * 0.33, 26 + streak * 6, C.num, 0.4 + 0.1 * Math.sin(t * 2));
    game.draw.rect(0, 0, W, H, C.bat, 0.015 + 0.015 * Math.sin(t * 1.3));
  }

  function drawJumps() {
    if (sub !== 'show') return;
    var tt = SHOW_T - subT;
    var t = game.time.elapsed;
    for (var i = 0; i < jumps.length; i++) {
      var j = jumps[i];
      var p = (tt - j.t0) / j.dur;
      if (p < 0 || p > 1) continue;
      var x = j.x0 + j.dx * p, y = LAKE_Y - Math.sin(p * Math.PI) * j.h;
      if (j.bat) game.draw.sprite(BAT[Math.floor(t * 14) % 2], { m: C.bat, k: C.ink }, x, y - 60, 12, { anchor: 'center' });
      else {
        glow(x, y, 20, C.fish, 0.25);
        game.draw.sprite(FISH[Math.floor(t * 10) % 2], { c: C.fish, k: C.ink }, x, y, 12, { anchor: 'center', flipX: j.dx < 0 });
      }
      if (p < 0.12 || p > 0.88) game.draw.circle(x, LAKE_Y, 26, C.white, 0.5);
    }
  }

  function stalagmite(x, y, rise, crumble, lit, n) {
    var t = game.time.elapsed;
    var top = y + (1 - rise) * 200 + (crumble > 0 ? (1 - crumble) * 0 : 0);
    var shakeX = crumble > 0 ? Math.sin(t * 60) * 8 : 0;
    for (var k = 0; k < 14; k++) {
      var ww = 60 + k * 9;
      game.draw.rect(x - ww / 2 + shakeX, top + k * 12, ww, 12, k % 2 ? C.rock : C.rockL);
    }
    game.draw.rect(x - 70 + shakeX, top - 6, 140, 10, lit ? C.good : C.fish);
    if (n !== null) txt(String(n), x + shakeX, top + 70, 64, C.num);
    if (crumble > 0 && Math.floor(t * 10) % 2 === 0) {
      game.draw.line(x - 40, top + 10, x + 10, top + 90, C.bad, 5);
      game.draw.line(x + 30, top + 20, x - 5, top + 120, C.bad, 5);
    }
  }

  function drawPlatforms() {
    var t = game.time.elapsed;
    // 今立っている石筍: 答えるのが遅いと割れ始める(予告)
    var baseCrack = (sub === 'ask' && subT < 0.9) || (sub === 'fall' && !jump.c) ? 1 : 0;
    if (sub !== 'shift' && !(sub === 'fall' && !jump.c && guide.fall > 0.3)) stalagmite(W / 2, BASE_Y, 1, baseCrack, false, null);
    if (sub === 'ask' || sub === 'jump' || sub === 'shift' || sub === 'fall') {
      for (var i = 0; i < 3; i++) {
        var c = choices[i];
        if (sub === 'shift' && c !== jump.c) continue;
        if (sub === 'fall' && c.crumble && guide.fall > 0.3) continue;
        var lit = reveal > 0 && c.n === answer && Math.floor(t * 10) % 2 === 0;
        stalagmite(c.x, sub === 'shift' && c === jump.c ? CHOICE_Y + (BASE_Y - CHOICE_Y) * (1 - Math.max(0, subT / 0.35)) : CHOICE_Y, c.rise, c.crumble, lit, sub === 'shift' ? null : c.n);
      }
    }
    if (sub === 'ask') {
      var p = Math.max(0, subT / ASK_T);
      game.draw.rect(W * 0.25, H * 0.6, W * 0.5, 14, C.rock);
      game.draw.rect(W * 0.25, H * 0.6, W * 0.5 * p, 14, p < 0.3 ? C.bad : C.num);
    }
    var fr = Math.floor(t * 3) % 2;
    glow(guide.x, guide.y - 60, 16, C.num, 0.5);
    game.draw.sprite(GUIDE[fr], { y: C.num, s: '#ffd0a8', k: C.ink, b: C.fish }, guide.x, guide.y + Math.sin(t * 3) * 4, 13, { anchor: 'center' });
  }

  function drawBottom() {
    for (var i = 0; i < NEEDED; i++) glow(W * 0.36 + i * 100, H * 0.965, 18, i < streak ? C.good : C.rock, 0.9);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, C.ink, 0.85);
    txt(streak + ' / ' + NEEDED, W / 2, 90, 66, C.num);
    txt(String(Math.ceil(timeLeft)), 70, 90, 52, C.white, 'left');
    game.draw.rect(60, 170, W - 120, 20, C.rock);
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 20, timeLeft < 4 ? C.bad : C.fish);
  }

  function score() { return streak * 300 + Math.round(timeLeft * 15) + (streak > 0 ? Math.max(0, Math.round((3 - sumAns / streak) * 60)) : 0); }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawCave(); drawJumps(); drawPlatforms(); drawBottom();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.85);
      txt(GAME_TITLE, W / 2, 90 + Math.sin(t * 2) * 6, 70, Math.floor(t * 4) % 2 ? C.fish : C.bat);
      txt('HI-SCORE ' + game.best, W / 2, 180, 36, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.93, 40, C.num);
      else txt('INSERT COIN', W / 2, H * 0.93, 34, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawCave(); drawBottom();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 90, ok ? C.good : C.bad);
      txt('BEST ' + game.best, W / 2, H * 0.46, 40, C.white);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.93, 38, C.white);
      return;
    }

    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'play') {
      if (hitStop > 0) hitStop -= dt;
      else {
        // 出題(魚が跳ねている間)と着地後の足場入れ替えは持ち時間に数えない
        if (sub === 'ask' || sub === 'jump') timeLeft -= dt;
        stepRound(dt, false);
        if (phase === 'play' && timeLeft <= 0) { timeLeft = 0; lose(guide.x, guide.y); }
      }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (!ok || sub === 'jump') stepRound(dt, false);
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      if (!ok || sub === 'jump') stepRound(dt, false);
      if (outro <= 0) {
        state = S.RESULT;
        var stats = { streak: streak, avgAnswer: streak > 0 ? Math.round(sumAns / streak * 10) / 10 : 0 };
        if (ok) game.end.success(score(), stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawCave(); drawJumps(); drawPlatforms(); drawBottom(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 96, C.num);
    if (phase === 'outro') {
      var sc = score();
      game.draw.rect(0, H * 0.36, W, H * 0.16, C.ink, 0.88);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 96, ok ? C.good : C.bad);
      txt('SCORE ' + sc, W / 2, H * 0.45, 44, C.white);
      if (ok && sc > game.best) txt('NEW RECORD', W / 2, H * 0.49, 40, C.num);
      else if (!ok) txt('あと' + Math.max(1, NEEDED - streak) + '問!', W / 2, H * 0.49, 44, C.white);
      else txt('BEST ' + game.best, W / 2, H * 0.49, 36, C.white);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['E4', 0.5], ['B4', 0.5], ['E5', 0.5], ['B4', 0.5], ['D5', 0.5], ['A4', 0.5], ['F#4', 1],
      ['E4', 0.5], ['G4', 0.5], ['B4', 0.5], ['G4', 0.5], ['F#4', 2]
    ], { tempo: 150, wave: 'sawtooth', volume: 0.04, loop: true, bass: [['E2', 2], ['D2', 2], ['C2', 2], ['B1', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

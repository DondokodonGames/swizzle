// I-3DS-0009v2-yearend-three-usu-pound.js
// みつ臼もちつき — 並んだ3つの臼に蒸したての米が次々入る。赤く光って熱いうちにその臼を連打でつき上げる
// 操作: 臼の上のせいろが湯気を噴いたら、その臼に蒸し米が落ちて赤く光る。光っている臼(画面のその列)を連打すると杵がつき、つくほど米粒が消えて丸い餅になる。光が点滅したら冷めかけ。空の臼や冷めた臼を叩くと杵が縁に当たって一瞬手がしびれる
// 終わり: 8回分の蒸し米をつき終えればCLEAR(冷める前の熱さが得点)。冷めて固まらせるのが3回/14秒の時間切れでGAME OVER
// @mechanic: mash
// @theme: yearend_three_usu_pound
// 世界観: 年末の町内の餅つき大会で、紅白幕の前に並んだ3つの臼へ蒸したての米が次々と入り、つき手がひとりで臼を渡り歩いて熱いうちに連打でつき上げていく
// 残るもの: 正誤(CLEAR/GAME OVER) + つき上げた数・冷ました数・得点
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 3〜4色+黒、粗いドット、輪郭線なし、背景はタイル反復
  var STYLE = { bg: ['#f0f0e8', '#d82838', '#000000'], main: ['#b86a30', '#f8f8f8', '#5a3418'], accent: ['#ff5a20', '#f8d830'] };
  var C = {
    white: STYLE.bg[0], red: STYLE.bg[1], black: STYLE.bg[2], wood: STYLE.main[0], mochi: STYLE.main[1], woodD: STYLE.main[2],
    hot: STYLE.accent[0], gold: STYLE.accent[1], ok: '#58d858', cold: '#9aa0a8', ground: '#7a7a70',
  };

  var GAME_TITLE = 'USU POUND';
  var TIME_LIMIT = 14;
  var LIVES = 3;
  var USU_X = [250, 540, 830];
  var USU_Y = 1060;
  // 蒸し米の入る順(時刻・臼・つく回数・熱い秒数)。後ほど重なり、早く冷める
  var SCHED = [
    { at: 0.3, u: 1, need: 5, heat: 3.4 },
    { at: 2.4, u: 0, need: 5, heat: 3.3 },
    { at: 3.8, u: 2, need: 6, heat: 3.2 },
    { at: 5.0, u: 1, need: 6, heat: 3.0 },
    { at: 6.8, u: 0, need: 6, heat: 2.9 },
    { at: 8.0, u: 2, need: 7, heat: 2.9 },
    { at: 9.2, u: 1, need: 7, heat: 2.8 },
    { at: 10.6, u: 0, need: 7, heat: 2.7 },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var usu, nextK, lives, made, colds, score, readyT, over, won, outroT, stopT, playT, focus, timeUp, pounder, stun, mood, clock, resolved, streak;

  function initGame() {
    usu = [];
    for (var i = 0; i < 3; i++) usu.push({ s: 'empty', heat: 0, prog: 0, need: 5, heatT: 3, t: 0, warnT: -1, hitT: 0 });
    nextK = 0; lives = LIVES; made = 0; colds = 0; score = 0; readyT = 0.8; over = false; won = false; outroT = 0; stopT = 0;
    playT = 0; focus = null; timeUp = false; stun = 0; mood = 0; clock = 0; resolved = 0; streak = 0;
    pounder = { u: 1, swing: 0, hop: 0 };
  }

  // 時刻に合わせて せいろの湯気(予告0.6秒)→ 蒸し米投入。本番もデモも同じ
  function stepSched(sched) {
    while (nextK < sched.length && clock >= sched[nextK].at - 0.6) {
      var e = sched[nextK];
      var u = usu[e.u];
      if (u.warnT < 0 && u.s !== 'hot') { u.warnT = 0; u.pend = e; game.audio.tone(660, 0.2, { wave: 'triangle', volume: 0.05, slide: 300 }); }
      else resolved++;
      nextK++;
    }
    for (var i = 0; i < 3; i++) {
      var v = usu[i];
      if (v.warnT >= 0) {
        v.warnT += game.time.delta;
        if (v.warnT >= 0.6) {
          v.warnT = -1; v.s = 'hot'; v.heat = 1; v.prog = 0; v.need = v.pend.need; v.heatT = v.pend.heat; v.t = 0;
          game.audio.tone(220, 0.08, { wave: 'square', volume: 0.06 });
          game.fx.burst(USU_X[i], USU_Y - 80, { color: C.mochi, count: 10, speed: 200 });
        }
      }
    }
  }

  // 臼の熱(本番もデモも同じ)。冷めたら 'cold' を返す
  function stepUsu(dt) {
    var res = -1;
    for (var i = 0; i < 3; i++) {
      var v = usu[i];
      v.t += dt;
      if (v.hitT > 0) v.hitT -= dt;
      if (v.s === 'hot') {
        v.heat -= dt / v.heatT;
        if (v.heat < 0.3 && Math.floor(v.t * 8) % 2 === 0 && Math.floor((v.t - dt) * 8) % 2 !== 0) game.audio.tone(990, 0.03, { wave: 'square', volume: 0.03 });
        if (v.heat <= 0) { v.heat = 0; v.s = 'cold'; v.t = 0; res = i; }
      } else if ((v.s === 'done' && v.t > 0.5) || (v.s === 'cold' && v.t > 1.0)) {
        v.s = 'empty';
      }
    }
    return res;
  }

  function strike(x, y, demo) {
    var u = x < 395 ? 0 : (x < 685 ? 1 : 2);
    if (pounder.u !== u) pounder.hop = 0.12;
    pounder.u = u; pounder.swing = 0.12;
    var v = usu[u];
    if (stun > 0) {
      game.audio.tone(120, 0.05, { wave: 'triangle', volume: 0.04 });
      return;
    }
    if (v.s === 'hot') {
      v.prog = Math.min(1, v.prog + 1 / v.need);
      v.hitT = 0.1;
      game.audio.tone(330 + v.prog * 500, 0.06, { wave: 'square', volume: 0.07 });
      game.fx.burst(USU_X[u], USU_Y - 70, { color: '#ffffff', count: 5, speed: 220 });
      if (!demo) score += 10;
      if (v.prog >= 1) {
        v.s = 'done'; v.t = 0;
        var pts = 100 + Math.round(v.heat * 150);
        if (!demo) { made++; resolved++; streak++; score += pts; }
        mood = 1;
        game.feedback.good(USU_X[u], USU_Y - 160, { text: v.heat > 0.5 ? 'PERFECT' : 'GOOD', color: C.gold, size: 56 });
        game.audio.play('se_coin', 0.4);
        if (!demo && made % 3 === 0) { game.audio.play('se_milestone', 0.45); game.fx.popup(made + ' / ' + SCHED.length, 540, 560, { color: C.gold, size: 66 }); }
      }
    } else {
      stun = 0.35; mood = -0.6; streak = 0;
      game.feedback.bad(USU_X[u], USU_Y - 60, { text: 'MISS', shake: demo ? 4 : 8 });
    }
  }

  function onCold(i, demo) {
    focus = { u: i }; stopT = 0.45; mood = -1;
    game.feedback.bad(USU_X[i], USU_Y - 100, { text: 'MISS', shake: demo ? 6 : 12 });
    game.audio.play('se_break', 0.35);
    if (!demo) {
      lives--; colds++; resolved++; streak = 0;
      if (lives <= 0) finish(false);
    }
  }

  function finish(ok) {
    over = true; won = ok; outroT = 1.5;
    game.audio.stopBgm();
    if (ok) {
      score += lives * 100;
      mood = 2;
      game.audio.play('se_success', 0.55);
      game.fx.burst(540, 1600, { color: C.gold, count: 30, speed: 460 });
      game.fx.burst(540, 1600, { color: C.red, count: 20, speed: 360 });
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
    if (over || readyT > 0 || stopT > 0 || y < 230) {
      game.audio.tone(200, 0.03, { wave: 'triangle', volume: 0.03 });
      return;
    }
    strike(x, y, false);
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.black, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  var MAN_A = ['...rrrr...', '..rwwwwr..', '..ssssss..', '..s.ss.s..', '..ssssss..', '...ssss...', '.bbbbbbbb.', 'bbbwbbwbbb', 'bbbwbbwbbb', '.bbbbbbbb.', '..bb..bb..', '..bb..bb..', '.kkk..kkk.'];
  var MAN_B = ['...rrrr...', '..rwwwwr..', '..ssssss..', '..s.ss.s..', '..sskkss..', '...ssss...', '.bbbbbbbb.', 'bbbwbbwbbb', 'bbbwbbwbbb', '.bbbbbbbb.', '..bb..bb..', '.bb....bb.', 'kkk....kkk'];
  var MAN_PAL = { r: C.red, w: C.white, s: '#f0b080', b: '#2848a8', k: C.black };
  var CRACK = ['k...k', '.k.k.', '..k..', '.k.k.'];

  function drawBack() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, '#88b8e8'], [0.12, '#c8e0f8'], [0.13, C.white], [1, C.white]]);
    // 紅白幕(縦じまのタイル)
    for (var i = 0; i < 14; i++) game.draw.rect(i * 80, 250, 40, 420, C.red);
    game.draw.rect(0, 250, W, 24, C.black);
    game.draw.rect(0, 660, W, 16, C.black);
    // 地面(市松タイル)
    for (var gy = 676; gy < H; gy += 64) {
      for (var gx = 0; gx < W; gx += 64) {
        var odd = (Math.floor(gx / 64) + Math.floor(gy / 64)) % 2 === 0;
        game.draw.rect(gx, gy, 64, 64, odd ? '#c8c0a8' : '#b0a890');
      }
    }
    // 提灯(ゆれる)
    for (var l = 0; l < 4; l++) {
      var lx = 130 + l * 270, ly = 300 + Math.sin(t * 2 + l) * 8;
      game.draw.rect(lx - 24, ly, 48, 64, C.red);
      game.draw.rect(lx - 24, ly + 24, 48, 8, C.gold);
    }
  }

  function drawSteamer(i) {
    var t = game.time.elapsed;
    var x = USU_X[i], y = 720;
    var v = usu[i];
    game.draw.rect(x - 80, y, 160, 48, C.wood);
    game.draw.rect(x - 80, y + 52, 160, 48, C.wood);
    game.draw.rect(x - 80, y + 40, 160, 8, C.woodD);
    game.draw.rect(x - 88, y - 12, 176, 16, C.woodD);
    // 予告: 湯気が噴く
    if (v.warnT >= 0) {
      for (var k = 0; k < 6; k++) {
        var ph = (t * 2.4 + k / 6) % 1;
        game.draw.circle(x - 50 + k * 20 + Math.sin(ph * 6 + k) * 10, y - 20 - ph * 140, 18 + ph * 22, '#ffffff', 0.9 * (1 - ph));
      }
      // 蒸し米が落ちる
      if (v.warnT > 0.35) for (var g = 0; g < 8; g++) game.draw.rect(x - 40 + g * 10, y + 100 + ((v.warnT - 0.35) * 900 + g * 23) % 180, 8, 8, C.mochi);
    } else {
      game.draw.circle(x, y - 24 - Math.sin(t * 3 + i) * 6, 14, '#ffffff', 0.5);
    }
  }

  function drawUsu(i) {
    var t = game.time.elapsed;
    var x = USU_X[i], y = USU_Y;
    var v = usu[i];
    var hl = focus && stopT > 0 && focus.u === i;
    // 熱いあいだ赤く光る(冷めかけは点滅)
    if (v.s === 'hot') {
      var blink = v.heat < 0.3 && Math.floor(t * 10) % 2 === 0;
      if (!blink) {
        game.draw.circle(x, y - 40, 150, C.hot, 0.2 + v.heat * 0.4);
        game.draw.circle(x, y - 40, 110, C.red, 0.15 + v.heat * 0.35);
      }
    }
    // 臼
    game.draw.rect(x - 120, y - 40, 240, 40, C.woodD);
    game.draw.rect(x - 112, y, 224, 200, C.wood);
    game.draw.rect(x - 112, y + 40, 224, 16, C.woodD);
    game.draw.rect(x - 112, y + 140, 224, 16, C.woodD);
    game.draw.rect(x - 96, y - 48, 192, 16, '#3a2210');
    // 中身
    var squash = v.hitT > 0 ? 0.7 : 1;
    if (v.s === 'hot' || v.s === 'done') {
      var r = 54 + v.prog * 26;
      var col = v.s === 'hot' ? (v.heat > 0.5 ? '#ffd8c8' : '#fff0e8') : C.mochi;
      if (hl) col = '#ffffff';
      game.draw.rect(x - r, y - 40 - r * 0.7 * squash, r * 2, r * 0.7 * squash + 4, col);
      game.draw.rect(x - r * 0.75, y - 40 - r * 0.95 * squash, r * 1.5, r * 0.3 * squash, col);
      // 残っている米粒
      var grains = Math.round((1 - v.prog) * 10);
      for (var g = 0; g < grains; g++) {
        var gx = x - r * 0.8 + ((g * 37) % Math.max(1, Math.round(r * 1.6)));
        var gy = y - 48 - (g % 3) * 14 * squash;
        game.draw.rect(gx, gy, 10, 10, '#e8d8b8');
      }
      if (v.s === 'done') game.draw.circle(x, y - 90 - v.t * 160, 40, C.mochi, Math.max(0, 1 - v.t * 2));
    } else if (v.s === 'cold') {
      var sc = hl ? 1.3 : 1;
      game.draw.rect(x - 70 * sc, y - 86 * sc, 140 * sc, 50 * sc, hl ? '#ffffff' : C.cold);
      game.draw.sprite(CRACK, { k: C.black }, x, y - 62 * sc, 10 * sc, { anchor: 'center' });
    }
  }

  function drawPounder() {
    var t = game.time.elapsed;
    var x = USU_X[pounder.u] - 170, y = USU_Y + 30 - (pounder.hop > 0 ? 30 : 0);
    var fr = pounder.swing > 0 ? MAN_B : (Math.floor(t * 3) % 2 === 0 ? MAN_A : MAN_B);
    game.draw.rect(x - 60, y + 130, 120, 16, '#00000033');
    game.draw.sprite(fr, MAN_PAL, x, y, 13, { anchor: 'center' });
    // 杵(振り上げ→振り下ろし)
    var hx = x + 50, hy = y - 10;
    var down = pounder.swing > 0;
    var kx = down ? USU_X[pounder.u] : x + 70, ky = down ? USU_Y - 100 : y - 260;
    if (stun > 0) { kx = USU_X[pounder.u] - 110; ky = USU_Y - 70; }
    game.draw.line(hx, hy, kx, ky, C.woodD, 16);
    game.draw.rect(kx - 56, ky - 36, 112, 72, C.wood);
    game.draw.rect(kx - 56, ky - 36, 16, 72, C.woodD);
    game.draw.rect(kx + 40, ky - 36, 16, 72, C.woodD);
    if (stun > 0 && Math.floor(t * 20) % 2 === 0) game.draw.circle(kx, ky, 60, C.gold, 0.4);
  }

  function drawTray() {
    // 親指ゾーン: つき上がった餅が並ぶ番重と、8回分の印
    var ty = Math.round(H * 0.766);
    game.draw.rect(60, ty, 960, 30, C.woodD);
    game.draw.rect(80, ty + 30, 920, 230, C.wood);
    game.draw.rect(100, ty + 50, 880, 190, '#d89a58');
    for (var k = 0; k < SCHED.length; k++) {
      var mx = 160 + (k % 4) * 220, my = ty + 100 + Math.floor(k / 4) * 100;
      if (k < made) {
        game.draw.circle(mx, my + 10, 44, '#e8e0d0');
        game.draw.circle(mx - 6, my + 4, 38, C.mochi);
      } else {
        game.draw.circle(mx, my + 10, 40, '#c08040');
      }
    }
    // 列の印(押せる臼の列を明るく)
    for (var i = 0; i < 3; i++) {
      var on = usu[i].s === 'hot';
      game.draw.rect(USU_X[i] - 120, 1790, 240, 70, on ? C.hot : '#9a9480');
      game.draw.rect(USU_X[i] - 108, 1802, 216, 46, on ? C.gold : '#b8b098');
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.black, 0.85);
    label('SCORE ' + score, 260, 70, 44, '#ffffff');
    label(made + ' / ' + SCHED.length, 260, 160, 48, C.gold);
    for (var l = 0; l < LIVES; l++) {
      var lx = 760 + l * 100;
      game.draw.circle(lx, 70, 34, l < lives ? C.mochi : '#3a3a3a');
      game.draw.rect(lx - 34, 84, 68, 14, l < lives ? C.red : '#3a3a3a');
    }
    var tk = Math.max(0, 1 - playT / TIME_LIMIT);
    game.draw.rect(640, 150, 380 * tk, 26, tk < 0.25 ? C.red : C.gold);
  }

  function drawScene() {
    drawBack();
    for (var i = 0; i < 3; i++) drawSteamer(i);
    for (var j = 0; j < 3; j++) drawUsu(j);
    drawPounder();
    drawTray();
  }

  function tickPounder(dt) {
    if (pounder.swing > 0) pounder.swing -= dt;
    if (pounder.hop > 0) pounder.hop -= dt;
    if (stun > 0) stun -= dt;
  }

  // ---- ATTRACT: 本物の臼で3回分つく。3つ目はわざと手を回さず冷まして見せる ----
  var DEMO_SCHED = [{ at: 0.4, u: 1, need: 5, heat: 3.0 }, { at: 2.0, u: 0, need: 5, heat: 3.0 }, { at: 3.4, u: 2, need: 6, heat: 2.4 }];
  var demo = { t: 0, cool: 0, hx: 540, hy: 1100, press: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; }
    tickPounder(dt);
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) focus = null; return; }
    clock += dt;
    stepSched(DEMO_SCHED);
    var c = stepUsu(dt);
    if (c >= 0) onCold(c, true);
    demo.cool -= dt; demo.press -= dt;
    var target = -1;
    for (var i = 0; i < 3; i++) if (usu[i].s === 'hot' && i !== 2) target = i;
    if (target >= 0) {
      demo.hx += (USU_X[target] - demo.hx) * Math.min(1, dt * 12);
      demo.hy = USU_Y - 60;
      if (demo.cool <= 0 && Math.abs(demo.hx - USU_X[target]) < 30) { strike(USU_X[target], USU_Y, true); demo.cool = 0.17; demo.press = 0.08; }
    } else {
      demo.hx += (USU_X[2] - 60 - demo.hx) * Math.min(1, dt * 3);
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    mood += (0 - mood) * Math.min(1, dt * 1.5);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.hx, demo.hy, { press: demo.press > 0, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.black, 0.85);
      label(GAME_TITLE, W / 2, 100, 92 + Math.sin(t * 3) * 3, C.gold);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 188, 36, '#ffffff');
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, 1420, 48, C.red);
      else label('TAP TO START', W / 2, 1420, 44, C.black);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.3, W, H * 0.26, C.black, 0.85);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.355, 96, won ? C.ok : C.red);
      label('SCORE ' + score, W / 2, H * 0.41, 54, '#ffffff');
      label(made + ' / ' + SCHED.length, W / 2, H * 0.455, 46, C.gold);
      if (score > game.best && score > 0) label('NEW RECORD', W / 2, H * 0.5, 46, C.gold);
      else label('BEST ' + Math.max(game.best, score), W / 2, H * 0.5, 38, '#ffffff');
      if (!won) label('あと' + Math.max(1, SCHED.length - made) + '個', W / 2, H * 0.54, 46, C.gold);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.6, 38, '#ffffff');
      return;
    }

    // ---- PLAYING ----
    tickPounder(dt);
    if (over) {
      outroT -= dt;
      if (stopT > 0) stopT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { made: made, cooled: colds, score: score };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.5);
    } else if (stopT > 0) {
      stopT -= dt;
      playT += dt;
      if (stopT <= 0) focus = null;
    } else {
      playT += dt;
      clock += dt;
      stepSched(SCHED);
      var c = stepUsu(dt);
      if (c >= 0) onCold(c, false);
      if (!over && resolved >= SCHED.length) finish(true);
      if (!over && playT >= TIME_LIMIT) { timeUp = true; finish(false); }
    }

    drawScene();
    drawHud();
    // 開始直後のお手本: 最初に光る臼へ手を一度だけ
    if (!over && readyT <= 0 && playT > 0.3 && playT < 1.3) {
      game.draw.hand(USU_X[1], USU_Y - 60, { press: Math.floor(t * 8) % 2 === 0, scale: 12, alpha: 0.6 });
    }
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, 520, 100, C.red);
    if (over && timeUp) label('TIME UP', W / 2, 520, 90, C.red);
  });

  game.onStart(function() {
    game.audio.melody([
      ['A4', 0.5], ['B4', 0.5], ['D5', 0.5], ['B4', 0.5], ['A4', 0.5], ['G4', 0.5], ['E4', 1],
      ['G4', 0.5], ['A4', 0.5], ['B4', 0.5], ['D5', 0.5], ['E5', 1], ['D5', 1],
    ], { tempo: 150, wave: 'square', volume: 0.05, loop: true, bass: [['A2', 1], ['E3', 1], ['G2', 1], ['D3', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

// I-3DS-0010v2-tanabata-strip-flick-up.js
// たんざく弾き — 七夕の夜、子どもが短冊を指で上へ弾き、灯りのともった笹の枝の高さにちょうど届かせて引っ掛ける
// 操作: 子どもの手元から指を上へ弾く。弾く速さが短冊の上がる高さになり、一番高く上がった所が灯りの枝の高さに近ければ枝に掛かる。弱いと届かず、強すぎると越えて落ちる。桃色の薄い紙はよく上がり、紺の厚い紙は上がりにくい
// 終わり: 短冊6枚のうち4枚を灯りの枝に掛ければCLEAR(近さで得点)。3枚落とす/18秒の時間切れでGAME OVER
// @mechanic: flick_launch
// @theme: tanabata_strip_flick
// 世界観: 七夕の夜の商店街の笹飾りの下で、浴衣の子どもが紙の輪をつけた短冊を指で弾き上げ、提灯の灯りがともった高い枝に一枚ずつ引っ掛けていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 掛けた枚数・PERFECT数・得点
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 多色+光。パララックス3層以上、光源(提灯)を1つ決めて陰影を統一
  var STYLE = { bg: ['#0c1030', '#1c2a5a', '#3a2a4a'], main: ['#3aa84a', '#1e6a2e', '#a8e070'], accent: ['#ffb040', '#fff2c0'] };
  var C = {
    night: STYLE.bg[0], navy: STYLE.bg[1], roof: STYLE.bg[2], leaf: STYLE.main[0], leafD: STYLE.main[1], leafL: STYLE.main[2],
    lamp: STYLE.accent[0], glow: STYLE.accent[1], ink: '#080a18', ok: '#7af08a', bad: '#ff5a6a', white: '#f4f4ff',
  };

  var GAME_TITLE = 'STAR STRIPS';
  var TIME_LIMIT = 18;
  var STALK_X = 660, HANDS_X = 420, HANDS_Y = 1470, GRAV = 2600;
  var BRANCH_Y = [1040, 960, 880, 780, 700, 600, 520];
  // 紙: 0=桃(薄く軽い) 1=黄 2=紺(厚く重い)
  var PAPER = [{ mul: 1.15, col: '#ff8ac0', dk: '#c85a90', w: 30, h: 70 }, { mul: 1.0, col: '#ffe060', dk: '#c8a830', w: 36, h: 84 }, { mul: 0.86, col: '#4a60e0', dk: '#2a3aa0', w: 44, h: 100 }];
  var ROUNDS = [
    { b: 0, p: 1, tol: 70 }, { b: 2, p: 1, tol: 60 }, { b: 1, p: 0, tol: 55 },
    { b: 4, p: 2, tol: 50 }, { b: 3, p: 0, tol: 45 }, { b: 6, p: 2, tol: 40 },
  ];
  var NEED = 4, MAX_MISS = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var ri, strip, hung, hooked, perfects, misses, score, readyT, over, won, outroT, stopT, playT, focus, timeUp, drag, apexMark, nextT, mood, preview;

  function initGame() {
    ri = 0; hung = []; hooked = 0; perfects = 0; misses = 0; score = 0; readyT = 0.8; over = false; won = false; outroT = 0; stopT = 0;
    playT = 0; focus = null; timeUp = false; drag = null; apexMark = null; nextT = -1; mood = 0; preview = -1;
    newStrip();
  }

  function newStrip() { strip = { s: 'ready', x: HANDS_X, y: HANDS_Y - 60, vy: 0, t: 0, p: ROUNDS[ri].p }; }

  function launch(speed, demo) {
    var v = Math.min(3400, speed * 0.8) * PAPER[strip.p].mul;
    strip.s = 'fly'; strip.vy = -v; strip.t = 0;
    game.audio.tone(260 + Math.min(1, v / 2600) * 700, 0.12, { wave: 'triangle', volume: 0.07, slide: 300 });
    game.audio.play('se_jump', 0.25);
    game.fx.burst(HANDS_X, HANDS_Y - 60, { color: PAPER[strip.p].col, count: 8, speed: 220 });
    mood = 0.5;
  }

  // 短冊の飛行(本番もデモも同じ)。戻り値: 'hook' / 'miss' / null
  function stepStrip(dt) {
    if (strip.s === 'fly') {
      var prev = strip.vy;
      strip.vy += GRAV * dt;
      strip.y += strip.vy * dt;
      strip.t += dt;
      if (prev < 0 && strip.vy >= 0) {
        // 頂点: 灯りの枝との高さの差で判定
        var ty = BRANCH_Y[ROUNDS[ri].b];
        var d = strip.y - ty;
        apexMark = { y: strip.y, t: 1.2, ok: Math.abs(d) <= ROUNDS[ri].tol };
        if (Math.abs(d) <= ROUNDS[ri].tol) {
          strip.s = 'hook'; strip.y = ty + 20; strip.t = 0; strip.grade = Math.abs(d) < ROUNDS[ri].tol * 0.4 ? 2 : 1;
          return 'hook';
        }
        strip.s = 'fall';
      }
    } else if (strip.s === 'fall') {
      strip.vy += GRAV * dt;
      strip.y += strip.vy * dt;
      strip.t += dt;
      if (strip.y > HANDS_Y + 120) { strip.s = 'gone'; return 'miss'; }
    }
    return null;
  }

  function onHook(demo) {
    var g = strip.grade;
    hung.push({ x: HANDS_X + ((hung.length * 53) % 60) - 30, y: strip.y, p: strip.p, sw: hung.length });
    mood = 1;
    if (!demo) {
      hooked++;
      var pts = g === 2 ? 300 : 150;
      if (g === 2) perfects++;
      score += pts;
    }
    game.feedback.good(HANDS_X, strip.y - 60, { text: g === 2 ? 'PERFECT' : 'GOOD', color: g === 2 ? C.glow : C.ok, size: 60 });
    if (!demo && hooked === 3) { game.audio.play('se_milestone', 0.45); game.fx.popup(hooked + ' / ' + NEED, 540, 380, { color: C.glow, size: 64 }); }
    nextT = 0.6;
  }

  function onMiss(demo) {
    mood = -1;
    game.feedback.bad(HANDS_X, HANDS_Y - 40, { text: 'MISS', shake: demo ? 5 : 10 });
    if (!demo) {
      misses++;
      if (misses >= MAX_MISS) {
        focus = { y: apexMark ? apexMark.y : HANDS_Y }; stopT = 0.5;
        finish(false);
        return;
      }
    }
    nextT = 0.5;
  }

  function advance() {
    nextT = -1;
    ri++;
    // 3枚落とす前に6枚投げ切った = 4枚以上掛かっている
    if (ri >= ROUNDS.length) { finish(hooked >= NEED); return; }
    newStrip();
  }

  function finish(ok) {
    over = true; won = ok; outroT = 1.5;
    game.audio.stopBgm();
    if (ok) {
      score += perfects * 50 + Math.max(0, Math.round((TIME_LIMIT - playT) * 20));
      mood = 2;
      game.audio.play('se_success', 0.55);
      game.fx.burst(STALK_X - 120, 700, { color: C.glow, count: 30, speed: 460 });
      game.fx.burst(STALK_X - 120, 700, { color: '#ff8ac0', count: 20, speed: 360 });
      game.fx.flash('#ffffff', 0.2);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力: 弾き(最後の0.1秒の上向きの速さ) ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    if (over || readyT > 0 || stopT > 0 || strip.s !== 'ready' || y < 230) {
      game.audio.tone(200, 0.03, { wave: 'triangle', volume: 0.03 });
      return;
    }
    drag = { pts: [{ y: y, t: game.time.elapsed }] };
    game.audio.tone(520, 0.04, { wave: 'triangle', volume: 0.04 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !drag) return;
    drag.pts.push({ y: y, t: game.time.elapsed });
    if (drag.pts.length > 12) drag.pts.shift();
    preview = flickSpeed();
    if (preview > 1200 && Math.random() < 0.3) game.audio.tone(300 + preview / 8, 0.02, { wave: 'sine', volume: 0.02 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !drag) return;
    drag.pts.push({ y: y, t: game.time.elapsed + 0.001 });
    var sp = flickSpeed();
    drag = null; preview = -1;
    if (sp > 400 && strip.s === 'ready' && !over) launch(sp, false);
    else game.audio.play('se_tap', 0.2);
  });

  function flickSpeed() {
    if (!drag || drag.pts.length < 2) return 0;
    var last = drag.pts[drag.pts.length - 1];
    var first = drag.pts[0];
    for (var i = drag.pts.length - 2; i >= 0; i--) { first = drag.pts[i]; if (last.t - drag.pts[i].t >= 0.1) break; }
    var dt = Math.max(0.016, last.t - first.t);
    return Math.max(0, (first.y - last.y) / dt);
  }

  // ---- 描画 ----
  function label(str, x, y, sz, col) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  var KID_IDLE = ['...hhhh...', '..hhhhhh..', '..hssssh..', '..sesses..', '...smms...', '..pppppp..', '.pppyyppp.', '.ppppppp..', '..pp..pp..', '..ss..ss..'];
  var KID_UP = ['.s.hhhh.s.', '.shhhhhhs.', '.shssssh s', '..sesses..', '...soos...', '..pppppp..', '.pppyyppp.', '.ppppppp..', '..pp..pp..', '..ss..ss..'];
  var KID_SAD = ['...hhhh...', '..hhhhhh..', '..hssssh..', '..s-ss-s..', '...sssm...', '..pppppp..', '.pppyyppp.', '.ppppppp..', '..pp..pp..', '..ss..ss..'];
  var KID_PAL = { h: '#2a1a1a', s: '#f0c098', e: C.ink, '-': C.ink, m: '#c84a4a', o: '#c84a4a', p: '#e86a9a', y: '#ffe060' };
  var LEAF = ['..ll', '.lll', 'lll.', 'll..'];
  var STAR = ['..w..', '.www.', 'wwwww', '.w.w.'];

  function drawSky() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.night], [0.5, C.navy], [0.78, '#2a2048'], [1, '#141020']]);
    // 遠景: 天の川(ゆっくり流れる星)
    for (var i = 0; i < 40; i++) {
      var sx = (i * 137 + t * 4) % W, sy = 250 + ((i * 89) % 700) + Math.sin(i) * 40;
      var tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i));
      game.draw.rect(sx, sy, i % 5 === 0 ? 6 : 3, i % 5 === 0 ? 6 : 3, C.white, tw);
    }
    for (var m = 0; m < 12; m++) game.draw.circle(80 + m * 90, 380 + m * 40, 50, '#6a7ad8', 0.06);
    // 中景: 商店街の屋根の並び
    for (var r = 0; r < 7; r++) {
      var rx = r * 170 - 20, rh = 120 + (r % 3) * 50;
      game.draw.rect(rx, 1330 - rh, 160, rh + 200, C.roof);
      game.draw.rect(rx - 10, 1330 - rh, 180, 18, '#4a3a5a');
      game.draw.rect(rx + 40, 1360 - rh, 30, 30, C.lamp, 0.5 + 0.2 * Math.sin(t * 3 + r));
    }
    // 近景: 石畳
    game.draw.rect(0, 1530, W, H - 1530, '#2a2438');
    for (var k = 0; k < 9; k++) game.draw.rect(k * 130 + (k % 2) * 40, 1560 + (k % 3) * 70, 100, 40, '#3a3448');
  }

  function drawBamboo() {
    var t = game.time.elapsed;
    var sw = Math.sin(t * 0.9) * 6;
    // 幹(光源=左の提灯: 左が明るい)
    for (var y = 230; y < 1530; y += 10) {
      var k = (1530 - y) / 1300;
      var x = STALK_X + sw * k;
      game.draw.rect(x - 22, y, 44, 11, C.leafD);
      game.draw.rect(x - 22, y, 20, 11, C.leaf);
    }
    for (var n = 0; n < 11; n++) {
      var ny = 300 + n * 120, nk = (1530 - ny) / 1300;
      game.draw.rect(STALK_X + sw * nk - 26, ny, 52, 8, C.leafL);
    }
    // 枝: 灯りの枝(今の狙い)は提灯と白縁の明滅
    var target = state === S.RESULT ? -1 : ROUNDS[Math.min(ri, ROUNDS.length - 1)].b;
    for (var b = 0; b < BRANCH_Y.length; b++) {
      var by = BRANCH_Y[b], bk = (1530 - by) / 1300, bx = STALK_X + sw * bk;
      var isT = b === target;
      game.draw.line(bx, by, 300 + sw * bk, by + 30, C.leafD, 10);
      game.draw.line(bx, by - 3, 300 + sw * bk, by + 27, C.leaf, 5);
      for (var l = 0; l < 4; l++) game.draw.sprite(LEAF, { l: l % 2 ? C.leaf : C.leafL }, 330 + l * 80 + sw * bk, by + 10 + l * -6, 8, { anchor: 'center', flipX: l % 2 === 1 });
      if (isT) {
        var pulse = 0.5 + 0.5 * Math.sin(t * 6);
        game.draw.circle(HANDS_X, by + 14, 90, C.glow, 0.12 + 0.1 * pulse);
        game.draw.circle(HANDS_X, by + 14, 30 + pulse * 6, '#ffffff', 0.5);
        game.draw.circle(HANDS_X, by + 14, 24, C.lamp);
        game.draw.rect(HANDS_X - 6, by - 14, 12, 12, C.ink);
        // 掛かる範囲の帯(高さの目安)
        var tol = ROUNDS[Math.min(ri, ROUNDS.length - 1)].tol;
        game.draw.rect(HANDS_X + 60, by - tol, 10, tol * 2, C.glow, 0.5);
      }
    }
    // 掛けた短冊(風で揺れる)
    for (var i = 0; i < hung.length; i++) {
      var hgs = hung[i], pp = PAPER[hgs.p];
      var hsw = Math.sin(t * 2 + hgs.sw) * 8;
      game.draw.line(hgs.x, hgs.y - 20, hgs.x + hsw, hgs.y, C.white, 2);
      game.draw.rect(hgs.x + hsw - pp.w / 2, hgs.y, pp.w, pp.h, pp.col);
      game.draw.rect(hgs.x + hsw - pp.w / 2, hgs.y, pp.w * 0.3, pp.h, pp.dk);
    }
    // 頂点の跡(どこまで上がったか)
    if (apexMark && apexMark.t > 0) {
      game.draw.rect(HANDS_X - 90, apexMark.y - 4, 180, 8, apexMark.ok ? C.ok : C.bad, Math.min(1, apexMark.t));
    }
  }

  function drawStrip() {
    if (!strip || strip.s === 'gone' || strip.s === 'hook') return;
    var t = game.time.elapsed;
    var pp = PAPER[strip.p];
    var hl = focus && stopT > 0;
    var x = strip.x + (strip.s === 'fall' ? Math.sin(strip.t * 9) * 30 : 0);
    var y = strip.s === 'ready' ? HANDS_Y - 60 + Math.sin(t * 4) * 6 : strip.y;
    var sc = hl ? 1.4 : 1;
    if (hl) game.draw.circle(x, y + pp.h / 2, 90, '#ffffff', 0.4);
    game.draw.circle(x, y - 10, 12 * sc, hl ? '#ffffff' : C.white);
    game.draw.circle(x, y - 10, 6 * sc, C.ink);
    game.draw.rect(x - pp.w / 2 * sc, y, pp.w * sc, pp.h * sc, hl ? '#ffffff' : pp.col);
    game.draw.rect(x - pp.w / 2 * sc, y, pp.w * 0.3 * sc, pp.h * sc, hl ? '#ffffff' : pp.dk);
    if (strip.s === 'ready') game.draw.circle(x, y + pp.h / 2, pp.h * 0.8, '#ffffff', 0.15 + 0.1 * Math.sin(t * 6));
  }

  function drawKid() {
    var t = game.time.elapsed;
    var fr = mood < -0.3 ? KID_SAD : (strip && strip.s === 'fly' ? KID_UP : KID_IDLE);
    game.draw.circle(HANDS_X, HANDS_Y + 170, 70, '#000000', 0.3);
    game.draw.sprite(fr, KID_PAL, HANDS_X, HANDS_Y + 80 - (mood > 0.6 ? Math.abs(Math.sin(t * 10)) * 18 : 0), 16, { anchor: 'center' });
    // 提灯(光源)
    game.draw.circle(170, 1250, 120, C.lamp, 0.12);
    game.draw.rect(140, 1200, 60, 90, C.lamp);
    game.draw.rect(140, 1230, 60, 8, '#c85a20');
    game.draw.rect(160, 1180, 20, 20, C.ink);
    // 弾く場所(親指ゾーン)
    var on = strip && strip.s === 'ready';
    game.draw.circle(HANDS_X, Math.round(H * 0.79), 110, on ? C.glow : '#4a4060', on ? 0.18 + 0.08 * Math.sin(t * 5) : 0.1);
    game.draw.rect(HANDS_X - 6, Math.round(H * 0.79) - 90, 12, 60, on ? C.glow : '#4a4060', 0.6);
    // 強さの目安: いま弾いている速さで届く高さ
    if (preview > 0 && strip && strip.s === 'ready') {
      var v = Math.min(3400, preview * 0.8) * PAPER[strip.p].mul;
      var py = HANDS_Y - 60 - v * v / (2 * GRAV);
      game.draw.rect(HANDS_X - 70, Math.max(240, py) - 3, 140, 6, '#ffffff', 0.45);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink, 0.85);
    label('SCORE ' + score, 250, 70, 44, '#ffffff');
    label(hooked + ' / ' + NEED, 250, 160, 50, C.glow);
    // 残りの短冊(紙の色)
    for (var i = 0; i < ROUNDS.length; i++) {
      var pp = PAPER[ROUNDS[i].p];
      var used = i < ri || (i === ri && strip && strip.s !== 'ready');
      game.draw.rect(560 + i * 76, 40, 40, 80, used ? '#3a3a50' : pp.col);
    }
    for (var m = 0; m < MAX_MISS; m++) game.draw.circle(600 + m * 70, 168, 20, m < misses ? C.bad : '#3a3a50');
    var tk = Math.max(0, 1 - playT / TIME_LIMIT);
    game.draw.rect(800, 156, 220 * tk, 24, tk < 0.25 ? C.bad : C.glow);
  }

  function drawScene() {
    drawSky();
    drawBamboo();
    drawStrip();
    drawKid();
  }

  // ---- ATTRACT: 1枚目はちょうどの強さで掛け、2枚目は強すぎて越える ----
  var demo = { t: 0, hx: HANDS_X, hy: 1520, press: false, done1: false, done2: false };
  function demoSpeed(over) {
    var ty = BRANCH_Y[ROUNDS[ri].b];
    var h = HANDS_Y - 60 - ty + (over ? -260 : 0);
    return Math.sqrt(2 * GRAV * h) / PAPER[strip.p].mul / 0.8;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; demo.done1 = false; demo.done2 = false; }
    if (apexMark) apexMark.t -= dt;
    if (nextT >= 0) { nextT -= dt; if (nextT < 0) { ri = Math.min(ri + 1, 1); newStrip(); } }
    var r = stepStrip(dt);
    if (r === 'hook') onHook(true);
    else if (r === 'miss') onMiss(true);
    // 手: 構え→上へ弾く
    var phase1 = cyc - 0.8, phase2 = cyc - 3.8;
    demo.press = false;
    var ph = !demo.done1 ? phase1 : phase2;
    if (ph > 0 && ph < 0.6) {
      demo.press = true;
      demo.hy = 1560 - Math.max(0, ph - 0.4) / 0.2 * 260;
    } else demo.hy = 1560;
    if (!demo.done1 && phase1 >= 0.6 && strip.s === 'ready') { demo.done1 = true; launch(demoSpeed(false), true); }
    if (demo.done1 && !demo.done2 && phase2 >= 0.6 && strip.s === 'ready') { demo.done2 = true; launch(demoSpeed(true), true); }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    mood += (0 - mood) * Math.min(1, dt * 1.2);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(HANDS_X + 20, demo.hy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.85);
      label(GAME_TITLE, W / 2, 100, 92 + Math.sin(t * 3) * 3, C.glow);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 188, 36, '#ffffff');
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, 1780, 48, C.glow);
      else label('TAP TO START', W / 2, 1780, 44, '#ffffff');
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.3, W, H * 0.26, C.ink, 0.85);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.355, 96, won ? C.ok : C.bad);
      label('SCORE ' + score, W / 2, H * 0.41, 54, '#ffffff');
      label(hooked + ' / ' + NEED, W / 2, H * 0.455, 46, C.glow);
      if (score > game.best && score > 0) label('NEW RECORD', W / 2, H * 0.5, 46, C.glow);
      else label('BEST ' + Math.max(game.best, score), W / 2, H * 0.5, 38, '#ffffff');
      if (!won) label('あと' + Math.max(1, NEED - hooked) + '枚', W / 2, H * 0.54, 46, C.glow);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.6, 38, '#ffffff');
      return;
    }

    // ---- PLAYING ----
    if (apexMark) apexMark.t -= dt;
    if (over) {
      outroT -= dt;
      if (stopT > 0) stopT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { hooked: hooked, perfect: perfects, dropped: misses, score: score };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.5);
    } else {
      playT += dt;
      if (nextT >= 0) { nextT -= dt; if (nextT < 0) advance(); }
      var r = stepStrip(dt);
      if (r === 'hook') onHook(false);
      else if (r === 'miss') onMiss(false);
      if (!over && playT >= TIME_LIMIT) { timeUp = true; finish(false); }
    }

    drawScene();
    drawHud();
    // 開始直後のお手本: 手元から上へ弾く手を一度だけ
    if (!over && readyT <= 0 && playT < 1.2 && strip.s === 'ready') {
      game.draw.hand(HANDS_X + 20, 1560 - (playT % 0.6) / 0.6 * 240, { press: true, scale: 12, alpha: 0.55 });
    }
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, 420, 100, C.glow);
    if (over && timeUp) label('TIME UP', W / 2, 420, 90, C.bad);
  });

  game.onStart(function() {
    game.audio.melody([
      ['E5', 1], ['G5', 0.5], ['A5', 0.5], ['G5', 1], ['E5', 1],
      ['D5', 0.5], ['E5', 0.5], ['G5', 1], ['C5', 1], ['R', 1],
    ], { tempo: 92, wave: 'sine', volume: 0.06, loop: true, bass: [['C3', 2], ['A2', 2], ['F2', 2], ['G2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

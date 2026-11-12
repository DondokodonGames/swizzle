// I-Switch-0001v2-cedar-macaque-pull-leap.js
// 大杉のぼり — 梅雨の御神木の大杉を、子猿が引いて放つ跳びで枝から枝へ跳び移り、梢の母猿のもとまで登る
// 操作: どこでも押して跳びたい向きと逆へ指を引き、離すと子猿が跳ぶ(引くほど強い。子猿の前に跳ぶ向きの点が出る)。落ちてくる途中で枝の上に乗れる(下からはすり抜ける)。葉の屋根のない濡れた枝はしずくが垂れて、乗ると外へ滑り、端から落ちる前に跳ばないと下の枝まで落ちる
// 終わり: 12本目の梢の枝に着けばCLEAR(早さと最高到達で得点)。22秒の時間切れでGAME OVER
// @mechanic: camera_climb
// @theme: cedar_macaque_pull_leap
// 世界観: 梅雨の山あいの神社で、木登り名人の子猿が雨に濡れた御神木の大杉を、滑る濡れ枝を避けたり素早く蹴ったりしながら枝から枝へ跳び移り、梢で雨宿りする母猿のもとまで登る
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した枝の段数・かかった秒数・得点
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 黄緑寄り4階調のみ。残像(前の位置を薄く残す)と低コントラスト、画面枠を描く
  var STYLE = { bg: ['#9bbc0f', '#8bac0f'], main: ['#306230', '#0f380f'], accent: ['#c4d860', '#0f380f'] };
  var C = { g0: STYLE.bg[0], g1: STYLE.bg[1], g2: STYLE.main[0], g3: STYLE.main[1], hi: STYLE.accent[0] };

  var GAME_TITLE = 'CEDAR LEAP';
  var TIME_LIMIT = 22;
  var GRAV = 2600, PULL = 6.5, VMAX = 2000;
  var GROUND_Y = 1450, GAP = 250, TRUNK_HW = 60;
  // 枝: 幹の左(-1)/右(1)・長さ・濡れているか
  var BR = [
    { side: -1, len: 300, wet: false }, { side: 1, len: 280, wet: false }, { side: -1, len: 260, wet: true },
    { side: 1, len: 300, wet: false }, { side: 1, len: 240, wet: true }, { side: -1, len: 300, wet: false },
    { side: 1, len: 260, wet: true }, { side: -1, len: 240, wet: true }, { side: 1, len: 280, wet: false },
    { side: -1, len: 240, wet: true }, { side: 1, len: 240, wet: true }, { side: -1, len: 320, wet: false },
  ];
  var TOP = BR.length - 1;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var mk, camY, best, score, readyT, over, won, outroT, stopT, playT, aim, trail, mood, timeUp, slips;

  function by(i) { return GROUND_Y - GAP * (i + 1); }
  function bx0(i) { return BR[i].side < 0 ? 540 - TRUNK_HW - BR[i].len : 540 + TRUNK_HW; }
  function bx1(i) { return BR[i].side < 0 ? 540 - TRUNK_HW : 540 + TRUNK_HW + BR[i].len; }

  function initGame() {
    mk = { x: 300, y: GROUND_Y, vx: 0, vy: 0, s: 'sit', on: -1, slipT: 0, skip: -2, face: 1 };
    camY = 0; best = -1; score = 0; readyT = 0.8; over = false; won = false; outroT = 0; stopT = 0; playT = 0;
    aim = null; trail = []; mood = 0; timeUp = false; slips = 0;
  }

  function jump(vx, vy, demo) {
    var m = Math.hypot(vx, vy);
    if (m > VMAX) { vx *= VMAX / m; vy *= VMAX / m; }
    if (vy > -200) vy = -200;
    mk.s = 'air'; mk.vx = vx; mk.vy = vy; mk.skip = mk.on; mk.on = -2; mk.face = vx >= 0 ? 1 : -1;
    game.audio.play('se_jump', 0.35);
    game.fx.burst(mk.x, mk.y, { color: C.g2, count: 6, speed: 180 });
  }

  // 子猿の動き(本番もデモも同じ)。戻り値: 'land' / 'slipoff' / null
  function stepMonkey(dt) {
    if (mk.s === 'air') {
      var py = mk.y;
      mk.vy += GRAV * dt;
      mk.x += mk.vx * dt; mk.y += mk.vy * dt;
      if (mk.x < 40) { mk.x = 40; mk.vx = Math.abs(mk.vx) * 0.4; }
      if (mk.x > W - 40) { mk.x = W - 40; mk.vx = -Math.abs(mk.vx) * 0.4; }
      if (mk.vy > 0) {
        for (var i = 0; i < BR.length; i++) {
          if (i === mk.skip) continue;
          var y = by(i);
          if (py <= y && mk.y >= y && mk.x >= bx0(i) - 10 && mk.x <= bx1(i) + 10) {
            mk.y = y; mk.s = 'sit'; mk.on = i; mk.slipT = 0; mk.vx = 0; mk.vy = 0;
            return 'land';
          }
        }
        if (mk.y >= GROUND_Y) { mk.y = GROUND_Y; mk.s = 'sit'; mk.on = -1; mk.vx = 0; mk.vy = 0; return 'land'; }
      }
    } else if (mk.s === 'sit' && mk.on >= 0 && BR[mk.on].wet) {
      mk.slipT += dt;
      if (mk.slipT > 0.4) {
        var out = BR[mk.on].side;
        mk.x += out * 150 * dt;
        if ((out < 0 && mk.x < bx0(mk.on) - 10) || (out > 0 && mk.x > bx1(mk.on) + 10)) {
          mk.s = 'air'; mk.vx = out * 80; mk.vy = 0; mk.skip = mk.on; mk.on = -2;
          return 'slipoff';
        }
      }
    }
    return null;
  }

  function onLand(demo) {
    var i = mk.on;
    mk.skip = -2;
    game.audio.tone(i >= 0 && BR[i].wet ? 330 : 520, 0.06, { wave: 'square', volume: 0.06 });
    if (i > best) {
      best = i;
      mood = 1;
      if (!demo) score += 100;
      if (i === TOP) {
        game.feedback.good(mk.x, mk.y - 120, { text: 'CLEAR', color: C.hi, size: 64 });
        if (!demo) finish(true);
        return;
      }
      game.feedback.good(mk.x, mk.y - 100, { text: BR[i].wet ? 'GOOD' : 'NICE', color: C.hi, size: 48 });
      if (!demo && (i + 1) % 4 === 0) { game.audio.play('se_milestone', 0.45); game.fx.popup((i + 1) + ' / ' + BR.length, 540, 420, { color: C.hi, size: 64 }); }
    }
  }

  function onSlip(demo) {
    stopT = 0.35; mood = -1;
    if (!demo) slips++;
    game.feedback.bad(mk.x, mk.y - 60, { text: 'MISS', shake: demo ? 5 : 10 });
  }

  function finish(ok) {
    over = true; won = ok; outroT = 1.5;
    game.audio.stopBgm();
    if (ok) {
      score += Math.max(0, Math.round((TIME_LIMIT - playT) * 40));
      mood = 2;
      game.audio.play('se_success', 0.55);
      game.fx.burst(mk.x, mk.y - camY - 100 + camY, { color: C.hi, count: 30, speed: 460 });
      game.fx.flash('#ffffff', 0.2);
    } else {
      stopT = 0.5;
      game.feedback.bad(mk.x, mk.y - camY - 60, { text: 'MISS', shake: 10 });
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力: 引いて放つ ----
  function canAim() { return mk.s === 'sit'; }
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    if (over || readyT > 0 || stopT > 0 || !canAim() || y < 230) {
      game.audio.tone(200, 0.03, { wave: 'triangle', volume: 0.03 });
      return;
    }
    aim = { x0: x, y0: y, x: x, y: y };
    game.audio.tone(440, 0.04, { wave: 'square', volume: 0.04 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !aim) return;
    aim.x = x; aim.y = y;
    if (Math.random() < 0.1) game.audio.tone(300 + Math.hypot(aim.x0 - x, aim.y0 - y), 0.02, { wave: 'square', volume: 0.02 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !aim) return;
    var dx = aim.x0 - x, dy = aim.y0 - y;
    aim = null;
    if (over || !canAim()) return;
    if (Math.hypot(dx, dy) > 30) jump(dx * PULL, dy * PULL, false);
    else game.audio.play('se_tap', 0.2);
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.g3, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  var MONKEY_SIT = ['..aaaa..', '.aaaaaa.', 'aabbbbaa', 'abdbbdba', '.abbbba.', '..aaaa..', '.aaaaaa.', 'aa.aa.aa', '.a....a.'];
  var MONKEY_JUMP = ['a.aaaa.a', 'aaaaaaaa', '.abbbba.', '.bdbbdb.', '.abbbba.', '..aaaa..', '.aaaaaa.', '.a.aa.a.', 'a......a'];
  var MONKEY_SLIP = ['..aaaa..', '.aaaaaa.', 'aabbbbaa', 'abdbbdba', '.abddba.', '..aaaa..', 'aaaaaaaa', 'a..aa..a', '........'];
  var MOM = ['...aaaa...', '..aaaaaa..', '.aabbbbaa.', '.abdbbdba.', '..abbbba..', '.aaaaaaaa.', 'aaaaaaaaaa', 'aaa....aaa'];

  function drawTree() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.g1], [0.6, C.g0], [1, C.g1]]);
    // 遠景: 社の屋根と杉林(ゆっくり)
    var far = -camY * 0.2;
    for (var f = 0; f < 6; f++) {
      var fx = f * 200 - 40, fy = 1200 + far - (f % 2) * 80;
      game.draw.rect(fx + 80, fy - 300, 40, 600, C.g1);
      for (var k = 0; k < 4; k++) game.draw.rect(fx + 40 + k * 10, fy - 300 + k * 70, 120 - k * 20, 40, C.g2, 0.35);
    }
    game.draw.rect(620, 1500 + far, 360, 30, C.g2, 0.5);
    game.draw.rect(660, 1530 + far, 280, 120, C.g1, 0.8);
    // 雨(残像ぎみの斜線)
    for (var r = 0; r < 26; r++) {
      var rx = (r * 97 + t * 260) % (W + 200) - 100, ry = (r * 173 + t * 1300) % H;
      game.draw.line(rx, ry, rx - 18, ry + 60, C.g2, 3);
    }
    // 幹
    var top = by(TOP) - 300 - camY;
    game.draw.rect(540 - TRUNK_HW, top, TRUNK_HW * 2, H - top, C.g2);
    game.draw.rect(540 - TRUNK_HW, top, 26, H - top, C.g3);
    for (var b = 0; b < 30; b++) {
      var yy = (GROUND_Y - b * 140) - camY;
      if (yy > -40 && yy < H) game.draw.rect(540 - 20, yy, 50, 8, C.g3);
    }
    // 地面
    var gy = GROUND_Y - camY;
    if (gy < H) { game.draw.rect(0, gy, W, H - gy, C.g2); game.draw.rect(0, gy, W, 10, C.g3); }
  }

  function drawBranches() {
    var t = game.time.elapsed;
    for (var i = 0; i < BR.length; i++) {
      var y = by(i) - camY;
      if (y < 150 || y > H + 40) continue;
      var x0 = bx0(i), x1 = bx1(i), b = BR[i];
      game.draw.rect(x0, y, x1 - x0, 22, b.wet ? C.g3 : C.g2);
      game.draw.rect(x0, y, x1 - x0, 6, b.wet ? C.g2 : C.hi);
      if (!b.wet) {
        // 葉の屋根(乾いた枝)
        for (var l = 0; l < 4; l++) game.draw.rect(x0 + l * (x1 - x0) / 4 - 10, y - 120 + (l % 2) * 20, (x1 - x0) / 4 + 30, 50, C.g2);
        for (var l2 = 0; l2 < 3; l2++) game.draw.rect(x0 + 30 + l2 * (x1 - x0) / 3, y - 150, (x1 - x0) / 4, 34, C.g3);
      } else {
        // しずくが垂れる(濡れ枝の予告)
        for (var d = 0; d < 4; d++) {
          var ph = (t * 1.6 + d * 0.27) % 1;
          game.draw.rect(x0 + 30 + d * (x1 - x0 - 60) / 3, y + 24 + ph * 70, 8, 14, C.g3, 1 - ph);
        }
      }
      if (i === TOP) {
        var mx = (x0 + x1) / 2 + b.side * 60;
        game.draw.sprite(MOM, { a: C.g3, b: C.hi, d: C.g3 }, mx, y - 60 + Math.sin(t * 3) * 4, 12, { anchor: 'center' });
      }
    }
  }

  function drawMonkey() {
    var t = game.time.elapsed;
    var sy = mk.y - camY;
    for (var i = 0; i < trail.length; i++) game.draw.sprite(MONKEY_JUMP, { a: C.g2, b: C.g1, d: C.g2 }, trail[i].x, trail[i].y - camY - 54, 12, { anchor: 'center', alpha: 0.25 * (i + 1) / trail.length });
    var wet = mk.s === 'sit' && mk.on >= 0 && BR[mk.on].wet;
    var fr = mk.s === 'air' ? MONKEY_JUMP : (wet && mk.slipT > 0.4 ? MONKEY_SLIP : MONKEY_SIT);
    var hl = stopT > 0;
    var pal = hl && Math.floor(t * 16) % 2 === 0 ? { a: '#ffffff', b: '#ffffff', d: '#ffffff' } : { a: C.g3, b: C.hi, d: C.g3 };
    if (hl) game.draw.circle(mk.x, sy - 54, 90, '#ffffff', 0.4);
    var wob = wet && mk.slipT > 0.2 ? Math.sin(t * 30) * 6 : 0;
    game.draw.sprite(fr, pal, mk.x + wob, sy - 54 - (mk.s === 'sit' && mood > 0.5 ? Math.abs(Math.sin(t * 10)) * 10 : 0), hl ? 15 : 12, { anchor: 'center', flipX: mk.face < 0 });
    // 狙い: 跳ぶ向きの点(最初の0.25秒ぶんだけ)
    if (aim) {
      var vx = (aim.x0 - aim.x) * PULL, vy = (aim.y0 - aim.y) * PULL;
      var m = Math.hypot(vx, vy);
      if (m > VMAX) { vx *= VMAX / m; vy *= VMAX / m; }
      for (var k = 1; k <= 5; k++) {
        var tt = k * 0.05;
        game.draw.rect(mk.x + vx * tt - 7, sy - 54 + vy * tt + 0.5 * GRAV * tt * tt - 7, 14, 14, C.g3);
      }
      game.draw.line(aim.x0, aim.y0, aim.x, aim.y, C.g2, 6);
      game.draw.circle(aim.x0, aim.y0, 20, C.g2, 0.6);
    } else if (mk.s === 'sit' && state === S.PLAYING) {
      game.draw.circle(mk.x, sy - 54, 70 + Math.sin(t * 6) * 6, C.hi, 0.18);
    }
  }

  function drawFrame() {
    // 携帯機の画面枠
    game.draw.rect(0, 230, 24, H - 230, C.g3);
    game.draw.rect(W - 24, 230, 24, H - 230, C.g3);
    game.draw.rect(0, H - 24, W, 24, C.g3);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.g3);
    label('SCORE ' + score, 260, 70, 44, C.g0);
    label((best + 1) + ' / ' + BR.length, 260, 160, 52, C.hi);
    // 高さメーター(木の絵)
    game.draw.rect(600, 40, 24, 160, C.g2);
    var hk = Math.max(0, best + 1) / BR.length;
    game.draw.rect(600, 200 - 160 * hk, 24, 160 * hk, C.hi);
    for (var i = 0; i <= BR.length; i += 4) game.draw.rect(580, 200 - 160 * i / BR.length, 64, 4, C.g0);
    var tk = Math.max(0, 1 - playT / TIME_LIMIT);
    game.draw.rect(680, 150, 340 * tk, 24, tk < 0.25 ? C.g0 : C.hi);
    label(Math.ceil(Math.max(0, TIME_LIMIT - playT)) + '', 850, 80, 56, C.g0);
  }

  function follow(dt) {
    var want = Math.min(0, mk.y - H * 0.64);
    camY += (want - camY) * Math.min(1, dt * 4);
    if (mk.s === 'air') { trail.push({ x: mk.x, y: mk.y }); if (trail.length > 4) trail.shift(); }
    else trail = [];
  }

  function drawScene() {
    drawTree();
    drawBranches();
    drawMonkey();
    drawFrame();
  }

  // ---- ATTRACT: 本物の跳びで枝を登る。4本目の濡れ枝では跳ぶのが遅れて滑り落ちる ----
  var demo = { t: 0, hx: 540, hy: 1500, press: false, wait: 0, aimT: -1, vx: 0, vy: 0 };
  function planJump(target) {
    var x1 = (bx0(target) + bx1(target)) / 2 + BR[target].side * 40, y1 = by(target);
    var apex = y1 - 90;
    var vy = -Math.sqrt(2 * GRAV * Math.max(40, mk.y - apex));
    var ta = -vy / GRAV, td = Math.sqrt(2 * (y1 - apex) / GRAV);
    return { vx: (x1 - mk.x) / (ta + td), vy: vy };
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 10;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; demo.aimT = -1; demo.wait = 0.6; }
    if (stopT > 0) { stopT -= dt; follow(dt); return; }
    var r = stepMonkey(dt);
    if (r === 'land') onLand(true);
    else if (r === 'slipoff') onSlip(true);
    follow(dt);
    demo.press = false;
    if (mk.s !== 'sit') { demo.hx = mk.x; demo.hy = mk.y - camY + 120; return; }
    var lazy = mk.on === 2 && cyc < 7;
    demo.wait -= dt;
    if (demo.aimT < 0 && demo.wait <= 0 && !lazy && mk.on < TOP) {
      var p = planJump(mk.on + 1);
      demo.vx = p.vx; demo.vy = p.vy; demo.aimT = 0;
    }
    if (demo.aimT >= 0) {
      demo.aimT += dt;
      var k = Math.min(1, demo.aimT / 0.35);
      var sx = mk.x, sy = mk.y - camY + 40;
      aim = { x0: sx, y0: sy, x: sx - demo.vx / PULL * k, y: sy - demo.vy / PULL * k };
      demo.hx = aim.x; demo.hy = aim.y; demo.press = true;
      if (demo.aimT > 0.45) { aim = null; jump(demo.vx, demo.vy, true); demo.aimT = -1; demo.wait = 0.25; }
    } else { demo.hx = mk.x; demo.hy = mk.y - camY + 120; }
    if (mk.on === TOP && cyc > 2) mood = 1;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    mood += (0 - mood) * Math.min(1, dt * 1.5);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.hx, demo.hy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.g3);
      label(GAME_TITLE, W / 2, 100, 92 + Math.sin(t * 3) * 3, C.hi);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 188, 36, C.g0);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, 1820, 48, C.g3);
      else label('TAP TO START', W / 2, 1820, 44, C.g3);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.3, W, H * 0.26, C.g3, 0.92);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.355, 96, won ? C.hi : C.g0);
      label('SCORE ' + score, W / 2, H * 0.41, 54, C.g0);
      label((best + 1) + ' / ' + BR.length, W / 2, H * 0.455, 46, C.hi);
      if (score > game.best && score > 0) label('NEW RECORD', W / 2, H * 0.5, 46, C.hi);
      else label('BEST ' + Math.max(game.best, score), W / 2, H * 0.5, 38, C.g0);
      if (!won) label('あと' + Math.max(1, BR.length - (best + 1)) + '段', W / 2, H * 0.54, 46, C.hi);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.6, 38, C.g0);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (stopT > 0) stopT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { reached: best + 1, slips: slips, seconds: Math.round(playT) };
        if (won) game.end.success(score, stats);
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
      var r = stepMonkey(dt);
      if (r === 'land') onLand(false);
      else if (r === 'slipoff') onSlip(false);
      if (!over && playT >= TIME_LIMIT) { timeUp = true; aim = null; finish(false); }
    }
    follow(dt);

    drawScene();
    drawHud();
    // 開始直後のお手本: 子猿から斜め下へ引く手を一度だけ
    if (!over && readyT <= 0 && playT < 1.4 && !aim && mk.s === 'sit') {
      var k = (playT % 0.7) / 0.7;
      game.draw.hand(mk.x - k * 60, mk.y - camY + 40 + k * 160, { press: true, scale: 12, alpha: 0.55 });
    }
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, 600, 100, C.g3);
    if (over && timeUp) label('TIME UP', W / 2, 600, 90, C.g3);
  });

  game.onStart(function() {
    game.audio.melody([
      ['A4', 0.5], ['C5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 1], ['A4', 1],
      ['G4', 0.5], ['A4', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 2],
    ], { tempo: 120, wave: 'square', volume: 0.05, loop: true, bass: [['A2', 2], ['F2', 2], ['G2', 2], ['E2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

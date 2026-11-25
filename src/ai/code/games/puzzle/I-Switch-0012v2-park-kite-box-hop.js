// I-Switch-0012v2-park-kite-box-hop.js
// 凧取り足場跳び — 友だちが放る箱やタイヤが届く瞬間に跳んで足もとへ滑り込ませ、積み重ねた上に乗って枝の凧まで手を届かせる
// 操作: 画面のどこかをタップすると少年がその場で跳ぶ。左下から放られた物が足もとに届く瞬間に足がその物の高さより上にあれば、物が下に滑り込んで一段高くなる(背の高いバケツほど高く跳んでいる間に届かせないといけない)。立ったまま当たる・跳ぶのが早すぎて着地している・低すぎると物ははじかれて落ちる。届く時刻は足もとの縮む輪、来る物と高さは左端の予告で見える。跳びの頂点で届かせるほど真ん中に積めて塔がぶれない
// 終わり: 20秒以内に枝の凧(高さ900)まで届けばCLEAR。物をはじく/塔がぶれて崩れるのが合わせて3回でGAME OVER(時間切れも)
// @mechanic: stack
// @theme: park_kite_box_hop
// 世界観: 冬の団地の公園で、木の高い枝に凧を引っかけた少年が、友だちが放ってくれる段ボール箱・古タイヤ・バケツを跳んだ足もとへ次々滑り込ませて積み、その上に乗って凧まで手を届かせる
// 残るもの: 正誤(CLEAR/GAME OVER) + 積んだ高さ・PERFECT数・はじいた数
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 限定5色、大きいドット、差し色は凧の赤だけ
  var STYLE = { bg: ['#1e2440', '#3a4470'], main: ['#e8e4f0', '#f0a040', '#6a74a8'], accent: ['#ff3d6a', '#0e1020'] };
  var C = {
    night: STYLE.bg[0], dusk: STYLE.bg[1], snow: STYLE.main[0], box: STYLE.main[1], slate: STYLE.main[2],
    red: STYLE.accent[0], ink: STYLE.accent[1],
  };

  var GAME_TITLE = 'KITE HOP';
  var TIME_LIMIT = 20;
  var LIVES = 3;
  var GOAL_H = 900;
  var GROUND_Y = 1500;
  var KX = 470;
  var AIR = 0.62, PEAK = 220;
  var FLIGHT = 0.95;
  var KINDS = [
    { id: 'box', h: 90, w: 150 },
    { id: 'tire', h: 60, w: 170 },
    { id: 'bucket', h: 125, w: 120 },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var stack, topH, cam, jumpT, jumpBase, crouch, items, throwT, playT, lives, perfects, bounced, score, readyT, stopT, focus, over, won, outroT,
    lean, mood, milestone, nextKind;

  function initGame() {
    stack = []; topH = 0; cam = 0; jumpT = -1; jumpBase = 0; crouch = 0; items = []; throwT = 0.7; playT = 0; lives = LIVES; perfects = 0; bounced = 0; score = 0;
    readyT = 0.8; stopT = 0; focus = null; over = false; won = false; outroT = 0; lean = 0; mood = 0; milestone = false;
    nextKind = 0;
  }

  // 足の高さ(いまの塔のてっぺんから)。跳んだ時の高さを基準に放物線
  function feetH() {
    if (jumpT < 0) return 0;
    var p = jumpT / AIR;
    return Math.max(0, jumpBase + 4 * PEAK * p * (1 - p) - topH);
  }
  function topX() { return stack.length ? stack[stack.length - 1].x : 0; }
  function stackCom() {
    if (!stack.length) return 0;
    var s = 0;
    for (var i = 0; i < stack.length; i++) s += stack[i].x;
    return s / stack.length;
  }
  function sy(h) { return GROUND_Y - (h - cam); }

  // ---- 物を放る: 序盤は箱、だんだんバケツとタイヤが混ざり、間隔が詰まる ----
  function throwItem() {
    var stage = playT < 6 ? 0 : (playT < 13 ? 1 : 2);
    var k;
    if (stage === 0) k = nextKind % 2 === 0 ? 0 : 1;
    else k = Math.floor(game.random(0, 3));
    nextKind++;
    items.push({ kind: KINDS[k], t: -0.5, warn: true, done: false, flash: 0, fall: null });
    game.audio.tone(988, 0.06, { wave: 'square', volume: 0.05 });
    return stage === 0 ? 1.2 : (stage === 1 ? 1.05 : 0.95);
  }

  // 放物線の位置(t: 0→FLIGHT で左下から塔のてっぺんへ)
  function itemPos(it) {
    var p = Math.max(0, Math.min(1.2, it.t / FLIGHT));
    var x0 = -60, y0 = sy(topH) + 520;
    var x1 = KX + topX(), y1 = sy(topH) - it.kind.h / 2;
    return { x: x0 + (x1 - x0) * p, y: y0 + (y1 - y0) * p - 4 * 380 * p * (1 - p) };
  }

  function jump(demo) {
    if (jumpT >= 0) { game.audio.tone(220, 0.04, { wave: 'square', volume: 0.04 }); return false; }
    jumpT = 0; jumpBase = topH; crouch = 0.08;
    game.audio.play('se_jump', demo ? 0.12 : 0.3);
    return true;
  }

  // ---- 進行(本番もデモも同じ)。戻り値: {kind:'bounce'|'topple'} or null ----
  function stepWorld(dt, demo) {
    playT += dt;
    if (crouch > 0) crouch -= dt;
    if (jumpT >= 0) {
      jumpT += dt;
      if (jumpT >= AIR || (jumpT > AIR / 2 && feetH() <= 0)) { jumpT = -1; game.audio.tone(330, 0.04, { wave: 'triangle', volume: 0.05 }); }
    }
    throwT -= dt;
    if (throwT <= 0) throwT = throwItem();
    lean += (stackCom() - lean) * Math.min(1, dt * 3);
    cam += (Math.max(0, topH - 420) - cam) * Math.min(1, dt * 4);
    var ev = null;
    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      if (it.flash > 0) it.flash -= dt;
      if (it.fall) {
        it.fall.vy += 2400 * dt; it.fall.x += it.fall.vx * dt; it.fall.y += it.fall.vy * dt;
        if (it.fall.y > H + 200) items.splice(i, 1);
        continue;
      }
      it.t += dt;
      if (it.t >= 0 && it.warn) it.warn = false;
      if (!it.done && it.t >= FLIGHT) {
        it.done = true;
        var fh = feetH();
        if (jumpT >= 0 && fh > it.kind.h) {
          // 滑り込んだ: 跳びの頂点(AIR/2)とのずれが積む位置のずれになる
          var err = jumpT - AIR / 2;
          stack.push({ kind: it.kind, x: topX() + err * 180, h0: topH });
          topH += it.kind.h;
          items.splice(i, 1);
          placed(err, demo);
          if (Math.abs(stackCom()) > 75) { ev = { kind: 'topple' }; }
        } else {
          var p = itemPos(it);
          it.fall = { x: p.x, y: p.y, vx: -260, vy: -500 };
          it.flash = 0.6;
          focus = it;
          ev = { kind: 'bounce' };
        }
      }
    }
    return ev;
  }

  function placed(err, demo) {
    var ae = Math.abs(err);
    var tier = ae < 0.05 ? 3 : (ae < 0.13 ? 2 : 1);
    if (tier === 3) perfects++;
    var pts = tier === 3 ? 200 : (tier === 2 ? 100 : 50);
    if (!demo) score += pts;
    mood = 0.6;
    game.feedback.good(KX, sy(topH) - 40, { text: tier === 3 ? 'PERFECT' : (tier === 2 ? 'GOOD' : 'NICE'), color: tier === 3 ? C.red : C.snow, size: 40 + tier * 6, sound: tier === 3 ? 'se_coin' : 'se_good', volume: 0.25, count: 4 + tier * 3 });
    game.audio.tone(300 + stack.length * 40, 0.05, { wave: 'triangle', volume: 0.05 });
    if (!demo && !milestone && topH >= GOAL_H / 2) {
      milestone = true;
      game.fx.popup(Math.round(topH) + ' / ' + GOAL_H, W / 2, sy(topH) - 200, { color: C.red, size: 60 });
      game.audio.play('se_milestone', 0.45);
    }
  }

  function onFail(ev, demo) {
    stopT = 0.45; mood = -1;
    if (ev.kind === 'bounce') {
      game.feedback.bad(KX, sy(topH) - 60, { text: 'MISS', shake: demo ? 5 : 12 });
      bounced++;
    } else {
      focus = { topple: true };
      game.feedback.bad(KX + topX(), sy(topH), { text: 'MISS', shake: demo ? 8 : 16 });
      // ぶれた上の2段が崩れる
      for (var k = 0; k < 2 && stack.length; k++) { var top = stack.pop(); topH -= top.kind.h; }
      lean = stackCom();
    }
    game.audio.play('se_break', 0.4);
    if (!demo) {
      lives--;
      if (lives <= 0) finish(false);
    }
  }

  function finish(ok) {
    over = true; won = ok; outroT = 1.5;
    game.audio.stopBgm();
    if (ok) {
      score += lives * 200 + Math.max(0, Math.round((TIME_LIMIT - playT) * 50));
      mood = 2;
      game.audio.play('se_success', 0.55);
      game.fx.burst(KX + 160, sy(GOAL_H) - 100, { color: C.red, count: 30, speed: 460 });
      game.fx.burst(KX + 160, sy(GOAL_H) - 100, { color: C.box, count: 22, speed: 360 });
      game.fx.flash(C.snow, 0.25);
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
    if (over || readyT > 0 || stopT > 0) { game.audio.play('se_tap', 0.08); return; }
    if (jump(false)) game.fx.burst(KX, sy(topH), { color: C.snow, count: 6, speed: 160 });
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col) {
    game.draw.text(str, x + 4, y + 5, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  var BOY_STAND = ['..rrrr..', '.rrrrrr.', '..ssss..', '..sees..', '.bbbbbb.', 'sbbbbbbs', '.bbbbbb.', '..kk.kk.', '..kk.kk.'];
  var BOY_CROUCH = ['........', '..rrrr..', '.rrrrrr.', '..sees..', 'sbbbbbbs', '.bbbbbb.', '.kkk.kkk', '.kk...kk', '........'];
  var BOY_JUMP = ['s.rrrr.s', 's.rrrr.s', '.bssssb.', '..sees..', '.bbbbbb.', '..bbbb..', '.bbbbbb.', '.kk..kk.', 'kk....kk'];
  var BOY_OUCH = ['..rrrr..', '.rrrrrr.', '..ssss..', '..s-s-..', 'sbbbbbbs', '.bbbbbb.', '..bbbb..', '.kk..kk.', 'kk....kk'];
  var BOY_PAL = { r: C.red, s: '#f4c8a8', e: C.ink, '-': C.ink, b: C.slate, k: C.ink };
  var FRIEND = ['.ss.', 'ssss', '.bb.', 'bbbb', '.k.k'];
  var KITE = ['....r....', '...rrr...', '..rrwrr..', '.rrwwwrr.', 'rrrrwrrrr', '.rrrwrrr.', '..rrrrr..', '...rrr...', '....r....', '....w....', '...w.....', '....w....'];

  function drawPark() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.night], [1, C.dusk]]);
    // 遠景: 団地の棟(上るほどゆっくり沈む)
    var par = cam * 0.3;
    for (var b = 0; b < 4; b++) {
      var bx = 40 + b * 260, by = 900 + par - (b % 2) * 120;
      game.draw.rect(bx, by, 200, H, '#2a3058');
      for (var wy = by + 40; wy < H; wy += 70) for (var wx = bx + 24; wx < bx + 180; wx += 52) {
        var lit = ((wx + wy + b) % 3) === 0;
        game.draw.rect(wx, wy, 28, 34, lit ? C.box : '#1a2040', lit ? 0.8 : 1);
      }
    }
    // 雪
    for (var f = 0; f < 18; f++) {
      var fx = (f * 173 + Math.sin(t + f) * 30) % W, fy = (f * 211 + t * 60) % H;
      game.draw.rect(fx, fy, 8, 8, C.snow, 0.6);
    }
    // 地面(雪)
    var gy = sy(0);
    if (gy < H) game.draw.rect(0, gy, W, H - gy, C.snow);
    // 木(右)と凧の引っかかった枝
    var trunkTop = sy(GOAL_H + 260);
    game.draw.rect(830, trunkTop, 90, gy - trunkTop, '#4a3a4a');
    var by2 = sy(GOAL_H + 60);
    game.draw.rect(560, by2 - 18, 300, 26, '#4a3a4a');
    game.draw.rect(860, sy(GOAL_H + 260), 160, 26, '#4a3a4a');
    for (var l = 0; l < 6; l++) game.draw.circle(600 + l * 70, by2 - 40 - (l % 2) * 30, 50, '#2e4a5a');
    var sway = Math.sin(t * 2.4) * 10;
    game.draw.sprite(KITE, { r: C.red, w: C.snow }, 640 + sway, by2 + 70, 14, { anchor: 'center' });
    // ゴールの高さの印
    game.draw.line(KX - 140, sy(GOAL_H), KX + 140, sy(GOAL_H), C.red, 6);
    // 放る友だち(地面の左)
    if (gy < H + 100) game.draw.sprite(FRIEND, { s: '#f4c8a8', b: C.box, k: C.ink }, 120, gy - 50, 18, { anchor: 'center', flipX: Math.floor(t * 3) % 2 === 0 });
  }

  function drawItem(kind, x, y, hl, sc) {
    var w = kind.w * sc, h = kind.h * sc;
    game.draw.rect(x - w / 2 - 6, y - h / 2 - 6, w + 12, h + 12, C.ink);
    var col = hl ? C.snow : (kind.id === 'tire' ? '#2a2a3a' : (kind.id === 'bucket' ? C.slate : C.box));
    game.draw.rect(x - w / 2, y - h / 2, w, h, col);
    if (kind.id === 'box') { game.draw.rect(x - w / 2, y - 6, w, 12, '#c07a28'); game.draw.rect(x - 8, y - h / 2, 16, h, '#c07a28'); }
    else if (kind.id === 'tire') { game.draw.rect(x - w / 2 + 20, y - 8, w - 40, 16, '#4a4a5a'); }
    else { game.draw.rect(x - w / 2 - 10, y - h / 2, w + 20, 16, '#8a94c8'); game.draw.rect(x - w / 2 + 12, y - h / 2 + 30, 14, h - 40, '#8a94c8'); }
  }

  function drawStack() {
    var hl = focus && focus.topple && stopT > 0;
    for (var i = 0; i < stack.length; i++) {
      var st = stack[i];
      var wob = Math.abs(lean) > 45 ? Math.sin(game.time.elapsed * 26) * 5 * (i / stack.length) : 0;
      drawItem(st.kind, KX + st.x + wob, sy(st.h0 + st.kind.h / 2), hl && i >= stack.length - 2, 1);
    }
    // ぶれの警告(塔の上に赤い印)
    if (Math.abs(lean) > 45 && Math.floor(game.time.elapsed * 10) % 2 === 0) {
      game.draw.circle(KX + topX(), sy(topH) - 260, 30, C.red);
      game.draw.rect(KX + topX() - 5, sy(topH) - 280, 10, 26, C.snow);
      game.draw.rect(KX + topX() - 5, sy(topH) - 248, 10, 8, C.snow);
    }
  }

  function drawBoy() {
    var t = game.time.elapsed;
    var fr = stopT > 0 && mood < 0 ? BOY_OUCH : (jumpT >= 0 ? BOY_JUMP : (crouch > 0 ? BOY_CROUCH : BOY_STAND));
    var hop = mood > 1 ? Math.abs(Math.sin(t * 10)) * 30 : 0;
    var by = sy(topH) - 63 - feetH() - hop + (jumpT < 0 ? Math.sin(t * 3) * 2 : 0);
    game.draw.rect(KX - 50 + topX(), sy(topH) - 8, 100, 10, C.ink, 0.4);
    game.draw.sprite(fr, BOY_PAL, KX + topX(), by, 14, { anchor: 'center' });
  }

  function drawIncoming() {
    var t = game.time.elapsed;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.fall) {
        var hl = focus === it && stopT > 0;
        drawItem(it.kind, it.fall.x, it.fall.y, hl, hl ? 1.3 : 1);
        continue;
      }
      if (it.t < 0) {
        // 予告: 左端に来る物の影と高さ、足もとの輪
        if (Math.floor(t * 10) % 2 === 0) {
          drawItem(it.kind, 70, sy(topH) + 280, false, 0.7);
          game.draw.rect(20, sy(topH) + 280 - it.kind.h * 0.35 - 30, 12, 20, C.red);
        }
      } else {
        var p = itemPos(it);
        drawItem(it.kind, p.x, p.y, false, 1);
      }
      // 届く時刻の縮む輪 + この物の高さの線(足がこれより上にあれば滑り込む)
      var left = FLIGHT - it.t;
      if (left < 1.2) {
        var r = 60 + Math.max(0, left) * 180;
        game.draw.circle(KX, sy(topH) - 20, r, C.red, 0.18);
        game.draw.line(KX - 110, sy(topH) - it.kind.h, KX + 110, sy(topH) - it.kind.h, C.red, Math.abs(left) < 0.1 ? 10 : 4);
      }
    }
  }

  function drawThumbZone() {
    var py = H * 0.9;
    game.draw.rect(0, H * 0.82, W, H * 0.18, C.ink, 0.55);
    var on = jumpT >= 0;
    game.draw.circle(W / 2, py + 8, 120, C.ink);
    game.draw.circle(W / 2, py, 120, on ? C.red : C.snow);
    for (var a = 0; a < 3; a++) game.draw.rect(W / 2 - 50 + a * 10, py - 10 - a * 26, 100 - a * 20, 22, on ? C.snow : C.slate);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink, 0.88);
    var progress = Math.min(1, topH / GOAL_H);
    label(Math.round(topH) + ' / ' + GOAL_H, 230, 100, 60, C.snow);
    label('SCORE ' + score, 230, 182, 36, C.box);
    for (var i = 0; i < LIVES; i++) {
      game.draw.rect(600 + i * 100, 40, 70, 60, C.ink);
      game.draw.rect(606 + i * 100, 46, 58, 48, i < lives ? C.box : '#3a3a4a');
    }
    game.draw.rect(560, 130, 440, 22, '#333');
    game.draw.rect(560, 130, 440 * Math.max(0, 1 - playT / TIME_LIMIT), 22, playT > TIME_LIMIT * 0.75 ? C.red : C.slate);
    game.draw.rect(560, 170, 440, 22, '#333');
    game.draw.rect(560, 170, 440 * progress, 22, C.red);
  }

  function drawScene() {
    drawPark();
    drawStack();
    drawBoy();
    drawIncoming();
    drawThumbZone();
  }

  // ---- ATTRACT: 実ロジックで届く直前に跳んで積み上げる。最後は立ったまま当てて見せる ----
  var demo = { t: 0, press: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 9;
    if (demo.t <= dt || cyc < dt) { initGame(); readyT = 0; }
    if (demo.press > 0) demo.press -= dt;
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) focus = null; return; }
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.fall || it.done || cyc > 7.4) continue;
      if (jumpT < 0 && FLIGHT - it.t <= AIR / 2 + 0.01 && FLIGHT - it.t > AIR / 2 - 0.03) { jump(true); demo.press = 0.15; }
    }
    var ev = stepWorld(dt, true);
    if (ev) onFail(ev, true);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    mood += (0 - mood) * Math.min(1, dt * 1.5);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(W / 2 + 40, H * 0.9 + 20, { press: demo.press > 0, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.88);
      label(GAME_TITLE, W / 2, 105, 96 + Math.sin(t * 3) * 3, C.red);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 36, C.snow);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.3, 52, C.box);
      else label('TAP TO START', W / 2, H * 0.3, 46, C.snow);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.26, W, H * 0.24, C.ink, 0.85);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.32, 100, won ? C.box : C.red);
      label('SCORE ' + score, W / 2, H * 0.38, 54, C.snow);
      label(Math.round(Math.min(topH, GOAL_H)) + ' / ' + GOAL_H + '  PERFECT ' + perfects, W / 2, H * 0.425, 38, C.box);
      if (won && score > game.best) label('NEW RECORD', W / 2, H * 0.47, 48, C.red);
      else label('BEST ' + Math.max(game.best, won ? score : 0), W / 2, H * 0.47, 36, C.snow);
      if (!won) label('あと' + Math.max(1, GOAL_H - Math.round(topH)) + 'cm!', W / 2, H * 0.23, 60, C.box);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.54, 36, C.snow);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (stopT > 0) stopT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { height: Math.round(topH), perfects: perfects, bounced: bounced };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) focus = null;
    } else {
      var ev = stepWorld(dt, false);
      if (ev) onFail(ev, false);
      if (!over && topH >= GOAL_H) finish(true);
      else if (!over && playT >= TIME_LIMIT) finish(false);
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 110, C.box);
    if (over && !won && lives > 0) label('TIME UP', W / 2, H * 0.3, 96, C.red);
    if (over && won) label('FINISH', W / 2, H * 0.3, 100, C.red);
  });

  game.onStart(function() {
    game.audio.melody([
      ['E5', 0.5], ['B4', 0.5], ['E5', 0.5], ['F#5', 0.5], ['G5', 1], ['F#5', 0.5], ['E5', 0.5],
      ['D5', 0.5], ['B4', 0.5], ['A4', 0.5], ['B4', 0.5], ['E5', 2],
    ], { tempo: 128, wave: 'square', volume: 0.045, loop: true, bass: [['E2', 1], ['B2', 1], ['C3', 1], ['B2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);

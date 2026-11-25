// J-3DSDSDSTOP10-0031-millrace-plank-hold.js
// 水路の渡し板 — 左手と右手で長い板の両端をそれぞれ支え、転がる石の玉を落とさず、板の端も水に浸けずに持ちこたえる
// 操作: 画面の左半分を押している間は板の左端が上がり、右半分を押している間は右端が上がる。離すとその端は沈む。両手を別々に加減する
// 終わり: 22秒持ちこたえれば成功。玉が板から落ちる/板の端が水に浸かったら失敗
// @mechanic: coop_2zone
// @theme: millrace_plank_hold
// 世界観: 水車小屋の見習いが、水路の上に渡した長い板の両端を左右の手で一人で支え、麦袋が降ってくる中で石臼の玉を転がり落とさず、粉挽きの鐘が鳴るまで耐える
// 残るもの: 正誤(CLEAR/GAME OVER) + 耐えた秒数と水平キープ率
// スタイル: 80s ISO

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: 菱形グリッド、影で高さを示す、6〜8色
  var STYLE = { bg: ['#2a3350', '#3b4a6e', '#1a2036'], main: ['#e8c170', '#b86b3c'], accent: ['#5ec4e0', '#ff6a5a'] };
  var COL = {
    bg1: STYLE.bg[0], bg2: STYLE.bg[1], bg3: STYLE.bg[2], wood: STYLE.main[0], woodDark: STYLE.main[1],
    water: STYLE.accent[0], waterDark: '#2f7f9e', red: STYLE.accent[1], stone: '#a8a8b8', stoneDark: '#6e6e84', white: '#f4f0e0', green: '#7ed36a', ink: '#141828'
  };

  var GAME_TITLE = 'MILLRACE PLANK';
  var TIME_LIMIT = 22;
  var NEEDED = 5;              // 受け止める麦袋の数
  var XL = W * 0.14, XR = W * 0.86;
  var BASE_Y = H * 0.66, SPAN_Y = 430;
  var RISE = 0.8, SINK = 0.26, SINK_BALL = 0.42, GRAV = 1.8;
  var SACK_WARN = 0.75, SACK_PUSH = 0.16, SACK_STAY = 1.4;

  var HAND_UP = ['.k.k.k.', 'kwkwkwk', 'kwwwwwk', 'kwwwwwk', '.kwwwk.', '..kwk..'];
  var HAND_REST = ['.......', '.k.k.k.', 'kwkwkwk', 'kwwwwwk', '.kwwwk.', '..kwk..'];
  var PAL_HAND = { k: COL.ink, w: '#f0c8a0' };
  var STONE_A = ['.sss.', 'sshss', 'sssss', 'sddss', '.sss.'];
  var STONE_B = ['.sss.', 'ssssd', 'shsss', 'sssds', '.sss.'];
  var PAL_STONE = { s: COL.stone, d: COL.stoneDark, h: COL.white };
  var SACK = ['.kkk.', 'kwwwk', 'kwwwk', 'kwwwk', '.kkk.'];
  var PAL_SACK = { k: COL.woodDark, w: '#e6d6a8' };
  var WHEEL_A = ['..w..', 'w.w.w', '.www.', 'w.w.w', '..w..'];
  var WHEEL_B = ['w...w', '.w.w.', '..w..', '.w.w.', 'w...w'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var hL, hR, s, sv, heldL, heldR, survived, levelT, sack, nextSack, sacks, loadL, loadR, timeLeft, ready, finished, ok, hitStop, endWait, hl, why, milestone;
  var silent = false;

  function show(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: COL.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function endY(h) { return BASE_Y - h * SPAN_Y; }

  function initGame() {
    hL = 0.5; hR = 0.5; s = 0.5; sv = 0; heldL = false; heldR = false; survived = 0; levelT = 0;
    sack = null; nextSack = 2.4; sacks = 0; loadL = 0; loadR = 0;
    timeLeft = TIME_LIMIT; ready = 0.8; finished = false; ok = false; hitStop = 0; endWait = 0; hl = null; why = ''; milestone = false;
  }

  function ballXY() {
    var x = XL + (XR - XL) * s;
    var y = endY(hL) + (endY(hR) - endY(hL)) * s;
    return { x: x, y: y - 40 };
  }

  function finishRound(success, x, y) {
    if (finished) return;
    finished = true; ok = success; hitStop = 0.45; hl = { x: x, y: y, t: 0 };
    if (!silent) game.audio.stopBgm();
  }

  function sackOff(x, h) {
    // 麦袋を持ちこたえて転がし落とした
    game.feedback.good(x, endY(h) - 120, { text: 'NICE', color: COL.wood, sound: silent ? 'se_tap' : 'se_good', volume: silent ? 0 : 0.35 });
  }

  function stepWorld(dt) {
    if (finished) return;
    survived += dt;
    if (loadL > 0) { loadL -= dt; if (loadL <= 0) sackOff(XL, hL); }
    if (loadR > 0) { loadR -= dt; if (loadR <= 0) sackOff(XR, hR); }
    // 両端: 押していれば上がり、離せば沈む。玉と麦袋が乗った側ほど速く沈む
    var sinkL = SINK + SINK_BALL * (1 - s) + (loadL > 0 ? 0.35 : 0);
    var sinkR = SINK + SINK_BALL * s + (loadR > 0 ? 0.35 : 0);
    hL += (heldL ? RISE : -sinkL) * dt;
    hR += (heldR ? RISE : -sinkR) * dt;
    // 天井の梁にぶつかると跳ね返って玉が揺れる
    if (hL > 1) { hL = 0.9; sv += 0.25; if (!silent) game.audio.play('se_tap', 0.3); game.fx.shake(6, 0.15); }
    if (hR > 1) { hR = 0.9; sv -= 0.25; if (!silent) game.audio.play('se_tap', 0.3); game.fx.shake(6, 0.15); }
    // 玉: 低い方へ転がる(retain 0.6/s)
    sv += GRAV * (hL - hR) * dt;
    sv *= Math.pow(0.6, dt);
    s += sv * dt;
    if (Math.abs(hL - hR) < 0.08 && Math.abs(s - 0.5) < 0.2) levelT += dt;
    // 麦袋(telegraph: 落ちる端に影が濃くなる)
    nextSack -= dt;
    if (!sack && nextSack <= 0) {
      sacks++;
      sack = { t: 0, side: sacks % 2 ? 1 : -1 };
      if (sacks % 3 === 0) sack.side = -sack.side;
      if (!silent) game.audio.tone('G5', 0.4, { wave: 'sine', volume: 0.08, slide: -400 });
    }
    if (sack) {
      sack.t += dt;
      if (sack.t >= SACK_WARN) {
        if (sack.side < 0) { hL -= SACK_PUSH; loadL = SACK_STAY; } else { hR -= SACK_PUSH; loadR = SACK_STAY; }
        if (!silent) game.audio.play('se_break', 0.35);
        game.fx.shake(8, 0.2);
        sack = null; nextSack = Math.max(2.0, 3.4 - sacks * 0.2);
      }
    }
    if (!milestone && survived >= TIME_LIMIT / 2) {
      milestone = true;
      game.fx.popup(Math.round(TIME_LIMIT / 2) + '', W / 2, H * 0.24, { color: COL.wood, size: 70 });
      if (!silent) game.audio.play('se_milestone', 0.45);
    }
    // 失敗判定
    if (s < 0 || s > 1) { why = 'ball'; var b = ballXY(); finishRound(false, s < 0 ? XL : XR, b.y); return; }
    if (hL <= 0) { why = 'water'; hL = 0; finishRound(false, XL, endY(0)); return; }
    if (hR <= 0) { why = 'water'; hR = 0; finishRound(false, XR, endY(0)); return; }
  }

  // ── 描画 ─────────────────────────────────────────────
  function drawBack() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, COL.bg2], [0.5, COL.bg1], [1, COL.bg3]]);
    game.draw.rect(0, 0, W, H, COL.water, 0.03 + 0.03 * Math.sin(t * 1.4));
    // 菱形グリッドの床
    for (var i = -8; i < 16; i++) {
      var x0 = i * 140;
      game.draw.line(x0, H * 0.68, x0 + 560, H * 0.84, 'rgba(94,196,224,0.25)', 2);
      game.draw.line(x0 + 560, H * 0.68, x0, H * 0.84, 'rgba(94,196,224,0.25)', 2);
    }
    // 水路(横ストリップの菱形波)
    game.draw.rect(0, H * 0.7, W, 150, COL.waterDark, 0.8);
    for (var w = 0; w < 10; w++) {
      var wx = ((w * 130 + t * 80) % (W + 130)) - 65;
      game.draw.line(wx - 30, H * 0.74 + (w % 2) * 50, wx, H * 0.73 + (w % 2) * 50, COL.water, 5);
      game.draw.line(wx, H * 0.73 + (w % 2) * 50, wx + 30, H * 0.74 + (w % 2) * 50, COL.water, 5);
    }
    // 天井の梁と水車
    game.draw.rect(0, endY(1) - 60, W, 26, COL.woodDark);
    game.draw.rect(0, endY(1) - 34, W, 8, COL.ink, 0.5);
    game.draw.sprite(Math.floor(t * 3) % 2 ? WHEEL_A : WHEEL_B, { w: COL.wood }, W * 0.5, H * 0.2 + Math.sin(t) * 4, 20, { anchor: 'center' });
  }

  function drawPlank() {
    var yl = endY(hL), yr = endY(hR);
    // 影(床への投影: 高さが上がるほど薄く小さく)
    game.draw.line(XL + 30, H * 0.75, XR + 30, H * 0.75, 'rgba(0,0,0,0.3)', 18);
    for (var k = 0; k < 2; k++) {
      var hh = k === 0 ? hL : hR, xx = k === 0 ? XL : XR;
      game.draw.circle(xx + 20, H * 0.75, 40 - hh * 20, COL.ink, 0.4);
      // 水面危険: 端が低いと赤く点滅
      if (hh < 0.2 && Math.floor(game.time.elapsed * 10) % 2 === 0) game.draw.circle(xx, endY(0), 60, COL.red, 0.5);
    }
    game.draw.line(XL, yl + 14, XR, yr + 14, COL.woodDark, 34);
    game.draw.line(XL, yl, XR, yr, COL.wood, 26);
    // 中央の目印
    var mx = (XL + XR) / 2, my = (yl + yr) / 2;
    game.draw.rect(mx - 6, my - 20, 12, 20, COL.green, 0.8);
    // 支える手
    game.draw.sprite(heldL ? HAND_UP : HAND_REST, PAL_HAND, XL, yl + 70, 14, { anchor: 'center' });
    game.draw.sprite(heldR ? HAND_UP : HAND_REST, PAL_HAND, XR, yr + 70, 14, { anchor: 'center', flipX: true });
    // 麦袋の荷
    if (loadL > 0) game.draw.sprite(SACK, PAL_SACK, XL + 60, yl - 50, 14, { anchor: 'center' });
    if (loadR > 0) game.draw.sprite(SACK, PAL_SACK, XR - 60, yr - 50, 14, { anchor: 'center' });
    var b = ballXY();
    game.draw.sprite(Math.floor(s * 12) % 2 ? STONE_A : STONE_B, PAL_STONE, b.x, b.y, 16, { anchor: 'center' });
  }

  function drawSack() {
    if (!sack) return;
    var x = sack.side < 0 ? XL + 60 : XR - 60;
    var k = sack.t / SACK_WARN;
    var ty = endY(sack.side < 0 ? hL : hR) - 50;
    game.draw.circle(x, ty + 30, 30 + 40 * k, COL.ink, 0.25 + 0.35 * k);
    if (Math.floor(game.time.elapsed * 12) % 2 === 0) game.draw.circle(x, ty + 30, 70, COL.red, 0.25);
    game.draw.sprite(SACK, PAL_SACK, x, endY(1) - 60 + (ty - endY(1) + 60) * k * k, 14, { anchor: 'center' });
  }

  function drawThumb() {
    var t = game.time.elapsed;
    game.draw.rect(0, H * 0.84, W, H * 0.16, COL.bg3, 0.6);
    for (var k = 0; k < 2; k++) {
      var on = k === 0 ? heldL : heldR;
      var cx = k === 0 ? W * 0.25 : W * 0.75, cy = H * 0.915;
      // 菱形パッド(横ストリップ)
      for (var d = -80; d <= 80; d += 6) {
        var hw = 150 * (1 - Math.abs(d) / 80);
        game.draw.rect(cx - hw, cy + d, hw * 2, 6, on ? COL.wood : COL.bg2, on ? 0.95 : 0.6 + 0.15 * Math.sin(t * 3 + k * 2));
      }
      game.draw.line(cx, cy + 30, cx, cy - 30, COL.white, 8);
      game.draw.line(cx, cy - 30, cx - 20, cy - 8, COL.white, 8);
      game.draw.line(cx, cy - 30, cx + 20, cy - 8, COL.white, 8);
    }
  }

  function drawHud() {
    show(Math.floor(survived) + ' / ' + TIME_LIMIT, W / 2, H * 0.05, 56, COL.wood);
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 160, W - 160, 18, COL.bg3);
    game.draw.rect(80, 160, (W - 160) * Math.max(0, timeLeft / TIME_LIMIT), 18, low ? COL.red : COL.water);
    for (var i = 0; i < NEEDED; i++) game.draw.sprite(SACK, i < sacks - (sack ? 1 : 0) ? PAL_SACK : { k: COL.bg2, w: COL.bg1 }, W * 0.3 + i * 110, 225, 7, { anchor: 'center' });
  }

  function drawHighlight(dt) {
    if (!hl) return;
    hl.t += dt;
    game.draw.circle(hl.x, hl.y, 60 + hl.t * 300, COL.white, Math.max(0, 0.6 - hl.t));
    if (ok) game.draw.sprite(STONE_A, { s: COL.wood, d: COL.woodDark, h: COL.white }, hl.x, hl.y, 20 + hl.t * 10, { anchor: 'center' });
    else if (why === 'water') game.draw.circle(hl.x, hl.y, 50 + hl.t * 40, COL.white, 0.8);
    else game.draw.sprite(STONE_A, { s: COL.white, d: COL.red, h: COL.white }, hl.x, hl.y + hl.t * 400, 20, { anchor: 'center' });
  }

  // ── ATTRACT ゴースト実演(実ロジック・両手) ─────────────
  var demo = { t: 0, n: 0, fail: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; nextSack = 1.4; demo.n++; demo.fail = demo.n % 3 === 0; }
    silent = true;
    var tilt = 0.9 * (s - 0.5) + 0.45 * sv;
    var tL = 0.5 - tilt, tR = 0.5 + tilt;
    heldL = hL < tL;
    heldR = hR < tR;
    if (demo.fail && cyc > 1.5) heldR = false;          // 失敗例: 右手を離したまま
    stepWorld(dt);
    if (finished && hitStop > 0) hitStop -= dt;
    silent = false;
  }

  function zonesFromTouches() {
    var l = false, r = false, list = game.touches || [];
    for (var i = 0; i < list.length; i++) { if (list[i].x < W / 2) l = true; else r = true; }
    heldL = l; heldR = r;
  }

  // ── 入力 ─────────────────────────────────────────────
  game.onTap(function () {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function (x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    var left = x < W / 2;
    game.audio.tone(left ? 'C4' : 'G4', 0.05, { wave: 'square', volume: 0.08 });
    game.fx.burst(left ? XL : XR, endY(left ? hL : hR) + 40, { color: COL.wood, count: 5, speed: 160 });
  });
  game.onRelease(function (x, y) {
    if (state !== S.PLAYING || finished) return;
    game.audio.tone(x < W / 2 ? 'A3' : 'E4', 0.04, { wave: 'triangle', volume: 0.06 });
  });

  // ── ループ(唯一の onUpdate) ───────────────────────────
  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (hL === undefined) initGame();
      stepDemo(dt);
      drawBack(); drawPlank(); drawSack(); drawThumb();
      if (finished) drawHighlight(dt);
      game.draw.hand(W * 0.25, H * 0.915, { press: heldL, scale: 13 });
      game.draw.hand(W * 0.75, H * 0.915, { press: heldR, scale: 13 });
      show(GAME_TITLE, W / 2, H * 0.07, 76, COL.wood);
      show('HI-SCORE ' + (game.best || 0), W / 2, H * 0.12, 34, COL.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) show('► 100円 投入 ◄', W / 2, H * 0.975, 42, COL.wood);
      else show('INSERT COIN', W / 2, H * 0.975, 36, COL.white);
      return;
    }

    if (state === S.RESULT) {
      drawBack(); drawPlank(); drawThumb();
      var pct = Math.round(100 * levelT / Math.max(0.1, survived));
      var sc = Math.round(survived * 40) + pct * 5 + (ok ? 400 : 0);
      show(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 100, ok ? COL.green : COL.red);
      show(survived.toFixed(1) + ' / ' + TIME_LIMIT, W / 2, H * 0.15, 52, COL.white);
      show(pct + '%', W / 2, H * 0.2, 46, COL.water);
      show('SCORE ' + sc, W / 2, H * 0.245, 42, COL.white);
      if (sc > (game.best || 0)) show('NEW RECORD', W / 2, H * 0.29, 46, COL.wood);
      else show('BEST ' + (game.best || 0), W / 2, H * 0.29, 36, COL.white);
      if (!ok) show('あと' + Math.max(1, Math.ceil(TIME_LIMIT - survived)) + '秒!', W / 2, H * 0.4, 64, COL.wood);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) show('TAP TO CONTINUE', W / 2, H * 0.975, 38, COL.white);
      return;
    }

    if (ready <= 0 && !finished) zonesFromTouches();
    else { heldL = false; heldR = false; }
    if (finished) {
      if (hitStop > 0) {
        hitStop -= dt;
        if (hitStop <= 0) {
          if (ok) { game.feedback.good(hl.x, hl.y, { text: 'CLEAR', color: COL.wood, count: 26 }); game.audio.play('se_success', 0.6); }
          else { game.feedback.bad(hl.x, hl.y, { text: 'MISS' }); game.audio.play('se_failure', 0.5); }
          endWait = 1.1;
        }
      } else {
        endWait -= dt;
        if (endWait <= 0) {
          state = S.RESULT;
          var pc = Math.round(100 * levelT / Math.max(0.1, survived));
          var stats = { seconds: Math.round(survived * 10) / 10, levelPct: pc, sacks: sacks, cause: why };
          if (ok) game.end.success(Math.round(survived * 40) + pc * 5 + 400, stats);
          else game.end.failure(stats);
        }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.5);
    } else {
      timeLeft -= dt;
      if (timeLeft <= 0) { timeLeft = 0; survived = TIME_LIMIT; var b = ballXY(); finishRound(true, b.x, b.y); }
      else stepWorld(dt);
    }

    drawBack(); drawPlank(); drawSack(); drawThumb(); drawHud();
    if (finished) drawHighlight(dt);
    if (ready > 0) show(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.32, 110, COL.wood);
  });

  game.onStart(function () {
    game.audio.melody([['C4', 0.5], ['E4', 0.5], ['G4', 0.5], ['E4', 0.5], ['F4', 0.5], ['A4', 0.5], ['G4', 1], ['C5', 1]],
      { tempo: 120, wave: 'square', volume: 0.045, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

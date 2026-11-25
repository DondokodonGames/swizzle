// I-Switch2-0012v2-karakuri-sparkler-relay.js
// からくり綱火リレー — 祭りの綱を走る線香花火の火花が、下の段の綱の真上に来た瞬間に落として乗り移らせ、終点のくす玉まで届ける
// 操作: 画面のどこかをタップすると火花がまっすぐ下へ落ちる(落ちるまで一瞬かかる)。下の綱の上に乗れば火花はその綱を逆向きに走り出す。綱の真ん中の飾り結びに乗るとPERFECT。3段目からは綱が左右に動く。綱の端まで走り切ると火花は消える(社内メモ。画面には出さない)
// 終わり: 4本の綱を乗り継いで最後にくす玉の紐へ乗せればCLEAR。落とし損ね/端で消えると火花を1つ失い、3つ失うか18秒切れでGAME OVER
// @mechanic: drop_timing
// @theme: karakuri_festival_sparkler_relay
// 世界観: 祭り前夜のからくり人形の工房で、からくり師が仕掛けの試し打ちをし、段違いに張った飾り綱を走る線香花火の火花を下の綱の真上で落として乗り継がせ、終点のくす玉を開いて人形を飛び出させる
// 残るもの: 正誤(CLEAR/GAME OVER) + 乗り継いだ段数・PERFECT数・スコア
// スタイル: 8bit PC MONITOR

(function(game) {
  var STYLE = { bg: ['#000020', '#000060', '#202040'], main: ['#ff4040', '#ffff40', '#40ffff'], accent: ['#ffffff', '#ff40ff'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  var GAME_TITLE = 'SPARK RELAY';
  var TIME_LIMIT = 18;
  var NEEDED = 4;
  var SPARKS = 3;
  var G = 3600;
  // 綱: y・中心・半幅・動き(振れ幅/速さ)・走る速さ・向き。最後の1本はくす玉の紐
  var CORDS = [
    { y: H * 0.20, c: W * 0.5, half: 440, amp: 0, w: 0, v: 360, dir: 1 },
    { y: H * 0.31, c: W * 0.6, half: 260, amp: 0, w: 0, v: 410, dir: -1 },
    { y: H * 0.42, c: W * 0.4, half: 230, amp: 0, w: 0, v: 460, dir: 1 },
    { y: H * 0.53, c: W * 0.6, half: 200, amp: 130, w: 1.6, v: 510, dir: -1 },
    { y: H * 0.64, c: W * 0.45, half: 70, amp: 120, w: 1.8, v: 0, dir: 1 },
  ];
  var KUSU = { y: H * 0.715 };
  var BUCKET = { x: W * 0.84, y: H * 0.77 };

  var SPARK_A = ['...w...', '.w.y.w.', '..yyy..', 'wyyWyyw', '..yyy..', '.w.y.w.', '...w...'];
  var SPARK_B = ['w.....w', '..y.y..', '.yyyyy.', '.yyWyy.', '.yyyyy.', '..y.y..', 'w.....w'];
  var MASTER_A = ['...rrrr...', '..rwwwwr..', '..kssssk..', '..sesess..', '..ssssss..', '...smms...', '..bbbbbb..', '.bbbwwbbb.', 'sbbbbbbbbs', '..bbbbbb..', '..bb..bb..', '..kk..kk..'];
  var MASTER_B = ['...rrrr...', '..rwwwwr..', '..kssssk..', '..sesess..', '..ssssss..', '...swws...', 's.bbbbbb.s', 'sbbbwwbbbs', '..bbbbbb..', '..bbbbbb..', '..bb..bb..', '.kk....kk.'];
  var MASTER_PAL = { r: '#ff4040', w: '#ffffff', k: '#202040', s: '#ffc080', e: '#000020', m: '#ff4040', b: '#4040ff' };
  var DOLL_A = ['..kkkk..', '.kkkkkk.', '.kwwwwk.', '.kwkwkw.', '..wwww..', '.rrrrrr.', 'rrryyrrr', '.rrrrrr.', '..r..r..'];
  var DOLL_B = ['..kkkk..', '.kkkkkk.', '.kwwwwk.', '.kwkwkw.', '..wrrw..', 'wrrrrrrw', '.rryyrr.', '.rrrrrr.', '.r....r.'];
  var DOLL_PAL = { k: '#000020', w: '#ffffff', r: '#ff40ff', y: '#ffff40' };

  var STATE = { ATTRACT: 'ATTRACT', PLAYING: 'PLAYING', RESULT: 'RESULT' };
  var state = STATE.ATTRACT;

  var level = 0, sp = { x: 0, y: 0, vy: 0, mode: 'run', off: 0 }, tCord = 0, warned = false;
  var landed = 0, sparks = SPARKS, perfects = 0, score = 0, streak = 0;
  var left = TIME_LIMIT, count = 0, stopT = 0, holdT = 0, fadeT = 0, celebT = 0, openK = 0;
  var on = false, cleared = false, bestAtStart = 0, failAt = null, trail = [];

  function write(str, x, y, size, color) {
    game.draw.text(str, x + 3, y + 3, { size: size, color: '#000020', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function cordC(k, t) { var c = CORDS[k]; return c.c + c.amp * Math.sin((t === undefined ? tCord : t) * c.w + k); }
  function cordL(k, t) { return cordC(k, t) - CORDS[k].half; }
  function cordR(k, t) { return cordC(k, t) + CORDS[k].half; }

  function startOn(k) {
    level = k; sp.mode = 'run'; sp.vy = 0; warned = false;
    var c = CORDS[k];
    sp.off = c.dir > 0 ? -c.half + 10 : c.half - 10;
    sp.x = cordC(k) + sp.off; sp.y = c.y;
  }

  // 実ロジック: 1フレーム分。戻り値 'land' | 'lost' | 'retry' | 'home' | null
  function stepSpark(dt, live) {
    tCord += dt;
    if (sp.mode === 'stop' || sp.mode === 'home') {
      stopT -= dt;
      if (stopT <= 0) return sp.mode === 'home' ? 'home' : 'retry';
      return null;
    }
    var c = CORDS[level];
    if (sp.mode === 'run') {
      sp.off += c.v * c.dir * dt;
      sp.x = cordC(level) + sp.off; sp.y = c.y;
      var toEnd = (c.dir > 0 ? c.half - sp.off : sp.off + c.half) / c.v;
      if (!warned && toEnd < 0.6) { warned = true; game.audio.tone('E6', 0.05, { wave: 'square', volume: live ? 0.08 : 0.03 }); }
      if (toEnd <= 0) { lose(sp.x, sp.y, 'end', live); return 'lost'; }
    } else if (sp.mode === 'fall') {
      var py = sp.y;
      sp.vy += G * dt; sp.y += sp.vy * dt;
      var nk = level + 1, ny = CORDS[nk].y;
      if (py < ny && sp.y >= ny) {
        var cx = cordC(nk);
        if (sp.x >= cx - CORDS[nk].half && sp.x <= cx + CORDS[nk].half) { land(nk, cx, live); return 'land'; }
      }
      if (sp.y > ny + 90) { lose(sp.x, ny + 40, 'fall', live); return 'lost'; }
    }
    trail.push({ x: sp.x, y: sp.y, t: game.time.elapsed });
    return null;
  }

  function drop(live) {
    if (sp.mode !== 'run' || level >= CORDS.length - 1) return false;
    sp.mode = 'fall'; sp.vy = 0;
    game.audio.play('se_jump', live ? 0.25 : 0.08);
    return true;
  }

  function land(nk, cx, live) {
    var perfect = Math.abs(sp.x - cx) < 34;
    game.feedback.good(sp.x, CORDS[nk].y - 50, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? STYLE.main[1] : STYLE.main[2], count: perfect ? 18 : 10, volume: live ? 1 : 0.4 });
    if (live) {
      landed++; streak++;
      if (perfect) perfects++;
      score += 100 + (perfect ? 100 : 0) + streak * 20;
      if (landed === 2) { game.fx.popup('2 / ' + NEEDED, W / 2, H * 0.26, { color: STYLE.main[1], size: 56 }); game.audio.play('se_milestone', 0.5); }
    }
    if (nk === CORDS.length - 1) {
      sp.mode = 'home'; stopT = 0.7; openK = 0.01; sp.x = cx; sp.y = CORDS[nk].y;
      game.fx.burst(cx, KUSU.y + 60, { color: STYLE.accent[1], count: 30, speed: 520 });
      if (live) { cleared = true; finishRun(); }
      return;
    }
    level = nk; sp.mode = 'run'; sp.off = sp.x - cx; warned = false;
  }

  function lose(x, y, kind, live) {
    sp.mode = 'stop'; stopT = 0.55; streak = 0;
    failAt = { x: x, y: y, kind: kind };
    game.feedback.bad(x, y, { text: 'MISS', shake: live ? 12 : 4, volume: live ? 1 : 0.4 });
    if (!live) return;
    sparks--;
    if (sparks <= 0) { cleared = false; finishRun(); }
  }

  function finishRun() {
    on = false; holdT = 0.6; celebT = 0;
    game.audio.stopBgm();
    if (cleared) { score += Math.round(left * 30) + sparks * 50; game.audio.play('se_success', 0.5); }
    else game.audio.play('se_failure', 0.45);
  }

  function startBgm() {
    game.audio.melody([
      ['D5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['A5', 1], ['G5', 0.5], ['E5', 0.5],
      ['D5', 0.5], ['E5', 0.5], ['D5', 0.5], ['B4', 0.5], ['A4', 1], ['R', 1],
    ], { tempo: 120, wave: 'square', volume: 0.045, loop: true, bass: [['D3', 1], ['A2', 1], ['D3', 1], ['A2', 1]] });
  }

  function initGame() {
    landed = 0; sparks = SPARKS; perfects = 0; score = 0; streak = 0;
    left = TIME_LIMIT; count = 0.8; stopT = 0; holdT = 0; fadeT = 0; celebT = 0; openK = 0;
    on = false; cleared = false; failAt = null; trail = []; tCord = 0;
    bestAtStart = game.best || 0;
    startOn(0);
  }

  game.onTap(function(x, y) {
    if (state === STATE.ATTRACT) { game.audio.play('se_coin', 0.5); state = STATE.PLAYING; initGame(); startBgm(); return; }
    if (state === STATE.RESULT) { state = STATE.ATTRACT; initGame(); demo.t = 0; return; }
    if (!on || sp.mode !== 'run') { game.audio.play('se_tap', 0.08); return; }
    game.audio.play('se_tap', 0.2);
    if (drop(true)) game.fx.burst(sp.x, sp.y, { color: STYLE.main[1], count: 6, speed: 160 });
  });

  // ── ATTRACT ゴースト実演: 落下時間を見込んで真上でタップ。3回に1回は早すぎて落とし損ねる ──
  var demo = { t: 0, gx: W * 0.5, gy: H * 0.88, press: 0, n: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt) { tCord = 0; startOn(0); demo.n = 0; openK = 0; }
    if (demo.press > 0) demo.press -= dt;
    var ev = stepSpark(dt, false);
    if (ev === 'retry') { failAt = null; startOn(level); demo.n++; }
    if (ev === 'home') { openK = 0; startOn(0); }
    if (ev === 'land') demo.n++;
    if (sp.mode === 'run' && level < CORDS.length - 1) {
      var nk = level + 1;
      var tf = Math.sqrt(2 * (CORDS[nk].y - sp.y) / G);
      var aimC = cordC(nk, tCord + tf);
      var early = demo.n % 3 === 2 ? CORDS[nk].half + 60 : 0;
      var dirToward = CORDS[level].dir;
      if (Math.abs(sp.x + dirToward * early - aimC) < 16) { drop(false); demo.press = 0.25; demo.n++; }
    }
    demo.gx += (sp.x - demo.gx) * Math.min(1, dt * 4);
    demo.gy = H * 0.88;
  }

  // ── 描画 ──
  function drawShop() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.5, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    // 市松ディザの帯
    for (var row = 0; row < 4; row++) {
      for (var col = 0; col < 45; col++) {
        if ((row + col) % 2) game.draw.rect(col * 24, H * 0.115 + row * 24, 24, 24, '#000000', 0.5);
      }
    }
    // 梁と柱(細線)
    for (var b = 0; b < 4; b++) {
      game.draw.line(0, H * (0.17 + b * 0.165), W, H * (0.17 + b * 0.165), '#4040ff', 2);
      game.draw.line(0, H * (0.17 + b * 0.165) + 10, W, H * (0.17 + b * 0.165) + 10, '#202080', 2);
    }
    game.draw.line(60, H * 0.12, 60, H * 0.76, '#4040ff', 3);
    game.draw.line(W - 60, H * 0.12, W - 60, H * 0.76, '#4040ff', 3);
    // 歯車の輪郭
    var gx = W * 0.12, gy = H * 0.7;
    game.draw.circle(gx, gy, 46, '#202060');
    for (var g = 0; g < 8; g++) {
      var a = g * Math.PI / 4 + t;
      game.draw.line(gx, gy, gx + Math.cos(a) * 58, gy + Math.sin(a) * 58, '#40ffff', 2);
    }
    game.draw.circle(gx, gy, 14, '#40ffff');
    // 作業台
    game.draw.rect(0, H * 0.79, W, H * 0.21, '#202040');
    game.draw.line(0, H * 0.79, W, H * 0.79, '#ffffff', 2);
    for (var d = 0; d < 22; d++) if (d % 2) game.draw.rect(d * 50, H * 0.795, 50, 8, '#4040ff', 0.6);
    // 防火の手桶(落ちた火花はここで消える)
    game.draw.rect(BUCKET.x - 50, BUCKET.y - 40, 100, 70, '#4040ff');
    game.draw.rect(BUCKET.x - 50, BUCKET.y - 40, 100, 12, '#40ffff');
  }

  function drawCord(k, hl) {
    var t = game.time.elapsed;
    var c = CORDS[k];
    var L = cordL(k), R = cordR(k), cx = cordC(k);
    var target = k === level + 1 && (sp.mode === 'run' || sp.mode === 'fall');
    if (k === CORDS.length - 1) {
      // くす玉の紐(最後の受け口)
      game.draw.line(L, c.y, R, c.y, target ? '#ffff40' : '#ff40ff', 8);
      game.draw.line(cx, c.y, cx, KUSU.y - 40, '#ffffff', 3);
      return;
    }
    game.draw.line(L, c.y, R, c.y, '#ffffff', 10);
    for (var x = L; x < R; x += 28) game.draw.line(x, c.y - 4, x + 14, c.y + 4, STYLE.main[0], 5);
    // 飾り結び(PERFECTの位置)
    game.draw.circle(cx, c.y, 16, target ? '#ffff40' : '#ff40ff');
    game.draw.circle(cx, c.y, 7, '#000020');
    // 房(端)
    var near = k === level && sp.mode === 'run' && warned;
    var endX = c.dir > 0 ? R : L;
    var blink = near && Math.floor(t * 12) % 2 === 0;
    game.draw.line(L, c.y, L - 10, c.y + 40, '#ff40ff', 6);
    game.draw.line(R, c.y, R + 10, c.y + 40, '#ff40ff', 6);
    if (blink) game.draw.circle(endX, c.y + 20, 34, STYLE.main[0], 0.6);
    // 狙う綱は白縁で明滅
    if (target) {
      var a = 0.25 + 0.25 * Math.sin(t * 8);
      game.draw.rect(L - 6, c.y - 16, R - L + 12, 4, '#ffffff', a);
      game.draw.rect(L - 6, c.y + 12, R - L + 12, 4, '#ffffff', a);
    }
    if (hl && failAt && k === level + 1) game.draw.rect(L - 10, c.y - 22, R - L + 20, 44, '#ffffff', 0.35 + 0.2 * Math.sin(t * 20));
  }

  function drawKusudama() {
    var t = game.time.elapsed;
    var cx = cordC(CORDS.length - 1);
    var y = KUSU.y + 60;
    var open = Math.min(1, openK);
    game.draw.circle(cx - open * 70, y, 62, '#ffffff');
    game.draw.circle(cx + open * 70, y, 62, STYLE.main[0]);
    game.draw.rect(cx - 4 - open * 70, y - 62, 8, 124, '#ffff40');
    if (open > 0.2) {
      for (var s = 0; s < 6; s++) game.draw.line(cx - 50 + s * 20, y, cx - 60 + s * 24, y + 60 + 40 * open + Math.sin(t * 6 + s) * 10, s % 2 ? '#ff40ff' : '#ffff40', 5);
      game.draw.sprite(Math.floor(t * 6) % 2 ? DOLL_A : DOLL_B, DOLL_PAL, cx, y - 40 * open, 9, { anchor: 'center' });
    } else {
      game.draw.sprite(DOLL_A, DOLL_PAL, cx, y, 5, { anchor: 'center', alpha: 0.35 });
    }
  }

  function drawSpark(hl) {
    var t = game.time.elapsed;
    trail = trail.filter(function(p) { return t - p.t < 0.25; });
    for (var i = 0; i < trail.length; i++) game.draw.rect(trail[i].x - 3 + Math.sin(i * 7) * 8, trail[i].y - 3 + Math.cos(i * 5) * 8, 6, 6, i % 2 ? '#ffff40' : '#ffffff');
    if (sp.mode === 'stop' && failAt) {
      var k = stopT / 0.55;
      game.draw.circle(failAt.x, failAt.y, 40 + (1 - k) * 50, '#ffffff', hl ? 0.6 : 0.3);
      game.draw.sprite(SPARK_B, { w: '#ffffff', y: '#808080', W: '#ffffff' }, failAt.x, failAt.y, 10 * (hl ? 1.4 : 1), { anchor: 'center' });
      return;
    }
    if (sp.mode === 'home') return;
    game.draw.circle(sp.x, sp.y, 36 + 6 * Math.sin(t * 30), '#ffff40', 0.3);
    game.draw.sprite(Math.floor(t * 16) % 2 ? SPARK_A : SPARK_B, { w: '#ffffff', y: '#ffff40', W: '#ffffff' }, sp.x, sp.y, 9, { anchor: 'center' });
  }

  function drawBench() {
    var t = game.time.elapsed;
    game.draw.sprite(Math.floor(t * 2.5) % 2 || cleared ? MASTER_B : MASTER_A, MASTER_PAL, W * 0.2, H * 0.89, 13, { anchor: 'center' });
    // 仕掛けの打ち手(押せる所)
    var ready = on && sp.mode === 'run';
    game.draw.rect(W * 0.38, H * 0.86, W * 0.3, 90, '#000020');
    game.draw.rect(W * 0.38, H * 0.86, W * 0.3, 90, ready ? '#40ffff' : '#4040ff', ready ? 0.3 + 0.2 * Math.sin(t * 8) : 0.4);
    game.draw.line(W * 0.38, H * 0.86, W * 0.68, H * 0.86, '#ffffff', 2);
    game.draw.line(W * 0.38, H * 0.86 + 90, W * 0.68, H * 0.86 + 90, '#ffffff', 2);
  }

  function drawHud() {
    game.draw.rect(20, 20, W - 40, 200, '#000020');
    game.draw.line(20, 20, W - 20, 20, '#ffffff', 2); game.draw.line(20, 220, W - 20, 220, '#ffffff', 2);
    game.draw.line(20, 20, 20, 220, '#ffffff', 2); game.draw.line(W - 20, 20, W - 20, 220, '#ffffff', 2);
    write(landed + ' / ' + NEEDED, W / 2, 92, 52, '#ffffff');
    write(String(score), W - 140, 92, 34, STYLE.main[1]);
    for (var i = 0; i < SPARKS; i++) game.draw.sprite(SPARK_A, { w: '#ffffff', y: '#ffff40', W: '#ffffff' }, 80 + i * 70, 92, 7, { anchor: 'center', alpha: i < sparks ? 1 : 0.2 });
    var bw = W - 200;
    game.draw.rect(100, 160, bw, 24, '#000000');
    game.draw.line(100, 160, 100 + bw, 160, '#40ffff', 2); game.draw.line(100, 184, 100 + bw, 184, '#40ffff', 2);
    var low = left < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    for (var s = 0; s < 20; s++) if (s / 20 < left / TIME_LIMIT) game.draw.rect(104 + s * (bw / 20), 164, bw / 20 - 6, 16, low ? STYLE.main[0] : '#40ffff');
  }

  function drawAll(hl) {
    drawShop();
    for (var k = 0; k < CORDS.length; k++) drawCord(k, hl);
    drawKusudama();
    drawSpark(hl);
    drawBench();
  }

  game.onUpdate(function(dt) {
    if (openK > 0 && openK < 1) openK = Math.min(1, openK + dt * 2.5);

    if (state === STATE.ATTRACT) {
      stepDemo(dt);
      drawAll(sp.mode === 'stop');
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 15 });
      var bob = Math.sin(game.time.elapsed * 2) * 6;
      write(GAME_TITLE, W / 2, H * 0.05 + bob, 74, STYLE.main[1]);
      write('HI-SCORE ' + Math.round(game.best || 0), W / 2, H * 0.093, 30, STYLE.main[2]);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) write('► 100円 投入 ◄', W / 2, H * 0.975, 40, STYLE.main[1]);
      else write('INSERT COIN', W / 2, H * 0.975, 32, '#ffffff');
      return;
    }

    if (state === STATE.RESULT) {
      tCord += dt;
      celebT -= dt;
      if (cleared && celebT <= 0) {
        celebT = 0.28;
        game.fx.burst(game.random(W * 0.15, W * 0.85), game.random(H * 0.2, H * 0.65), { color: game.random(0, 1) < 0.5 ? '#ffff40' : '#ff40ff', count: 16, speed: 400 });
      }
      drawAll(!cleared);
      game.draw.rect(0, 0, W, 240, '#000020', 0.9);
      write(cleared ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.055, 78, cleared ? STYLE.main[1] : STYLE.main[0]);
      write(landed + ' / ' + NEEDED + '   SCORE ' + score, W / 2, H * 0.1, 36, '#ffffff');
      if (!cleared) write('あと' + (NEEDED - landed) + '段!', W / 2, H * 0.75, 48, STYLE.main[1]);
      else write('PERFECT ' + perfects, W / 2, H * 0.75, 44, STYLE.main[1]);
      if (score > bestAtStart && score > 0) write('NEW RECORD', W / 2, H * 0.82, 34, Math.floor(game.time.elapsed * 4) % 2 ? '#ffff40' : '#ff40ff');
      else write('BEST ' + Math.round(game.best || 0), W / 2, H * 0.82, 30, STYLE.main[2]);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) write('TAP TO CONTINUE', W / 2, H * 0.975, 32, '#ffffff');
      return;
    }

    // ── PLAYING ──
    if (fadeT > 0) {
      fadeT -= dt;
      if (fadeT <= 0) {
        state = STATE.RESULT;
        var stats = { landed: landed, perfect: perfects, sparks: sparks };
        if (cleared) game.end.success(score, stats); else game.end.failure(stats);
        if (cleared && score > bestAtStart) game.audio.play('se_milestone', 0.5);
      }
    } else if (holdT > 0) {
      holdT -= dt;
      if (holdT <= 0) fadeT = 1.0;
    } else if (count > 0) {
      count -= dt;
      if (count <= 0) { on = true; game.audio.play('se_tap', 0.35); }
    } else if (on) {
      if (sp.mode !== 'stop') left -= dt;
      var ev = stepSpark(dt, true);
      if (ev === 'retry') { failAt = null; startOn(level); }
      if (ev === 'land') game.audio.play('se_coin', 0.25);
      if (on && left <= 0) {
        left = 0; cleared = false;
        sp.mode = 'stop'; stopT = 0.55; failAt = { x: sp.x, y: sp.y, kind: 'time' };
        game.feedback.bad(sp.x, sp.y, { text: 'TIME UP', shake: 10 });
        finishRun();
      }
    }

    drawAll(sp.mode === 'stop' && !cleared);
    drawHud();
    if (count > 0) write(count > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.47, 92, STYLE.main[1]);
  });

  game.onStart(function() {
    startBgm();
    state = STATE.ATTRACT;
    initGame();
  });
})(game);

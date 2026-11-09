// I-Wii-0009v3-diner-bowl-tray-stack.js
// 食堂の丼さげ積み — 卓のあいだを歩く給仕係が、客の差し出す空の丼や茶碗を盆の真上に来た瞬間に受け取り、崩さないように積み上げて洗い場まで運ぶ
// 操作: 給仕係は自動で右へ歩く。客が差し出す器が盆の山のてっぺんの真上に重なった瞬間にタップすると受け取って山に載る。ずれて載せるほど山が傾き、傾いた側に寄った器は次の器を反対へずらして載せると戻せる。小さい器の上に大きい丼を載せると支えが狭く崩れやすいので見送ってもよい。真上から大きく外れた器は落ちて割れる
// 終わり: 洗い場の窓口に着いたとき盆に8個以上積めていればCLEAR。山が傾きすぎて崩れる/8個に届かない/時間切れでGAME OVER
// @mechanic: stack
// @theme: diner_bowl_busing
// 世界観: 昼時の大衆食堂で、三角巾の給仕係が卓のあいだを歩きながら客が差し出す空の丼や茶碗を受け取り、盆の上に崩さず積み重ねて洗い場の窓口まで運ぶ
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア(積んだ数・PERFECT数・割った数)
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目・タイル・陶器の艶を gradient と細線で作る。上明・下暗で厚み
  var STYLE = { bg: ['#f2e6cc', '#d8c49c', '#7a5634'], main: ['#b0743c', '#f4f0e6', '#2e5a8a'], accent: ['#d8402e', '#ffd25a'] };
  var C = {
    wall: STYLE.bg[0], tile: STYLE.bg[1], woodDk: STYLE.bg[2], wood: STYLE.main[0], china: STYLE.main[1], indigo: STYLE.main[2],
    red: STYLE.accent[0], gold: STYLE.accent[1], ink: '#2a1e14', white: '#ffffff', shade: '#c8bca8', green: '#4a9a4a',
  };

  var GAME_TITLE = 'BOWL BUS';
  var TIME_LIMIT = 20;
  var NEEDED = 8;
  var OFFERS = 12;
  var SPACING = 420;
  var WAIT_X = 380;
  var FLOOR_Y = Math.round(H * 0.74);
  var TRAY_Y = Math.round(H * 0.68);
  var TRAY_W = 230;
  var BOWLS = {
    don: { w: 160, h: 66, body: '#d8402e', rim: '#f4f0e6' },
    rice: { w: 118, h: 54, body: '#e4ecf4', rim: '#2e5a8a' },
    dish: { w: 96, h: 26, body: '#f8e8b0', rim: '#2e5a8a' },
  };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var offers, walkX, speed, stack, falling, broken, perfects, stopT, stopIdx, crash, sway, hatchX;
  var score, countIn, over, won, endT, prevBest, playT, toppled, fiveShown;

  function label(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: 'rgba(42,30,20,0.45)', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  // 三角巾の給仕係: 歩き2コマ/焦り/喜び
  var WAITRESS = [
    ['..wwwww...', '.wwwwwww..', '..hssss...', '..seses...', '...smm....', '..kkkkkk..', '.skaaaaks.', '..kaaaak..', '..kaaaak..', '..kk..kk..', '..s...s...', '.bb...bb..'],
    ['..wwwww...', '.wwwwwww..', '..hssss...', '..seses...', '...smm....', '..kkkkkk..', '.skaaaaks.', '..kaaaak..', '..kaaaak..', '..kk..kk..', '...s.s....', '..bb.bb...'],
    ['..wwwww...', '.wwwwwww..', '..hssss...', '..sOsOs...', '...soo....', '..kkkkkk..', '.skaaaaks.', '..kaaaak..', '..kaaaak..', '..kk..kk..', '..s...s...', '.bb...bb..'],
    ['s.wwwww.s.', 's.wwwwww.s', '.shssss.s.', '..seses...', '...sOO....', '..kkkkkk..', '..kaaaak..', '..kaaaak..', '..kaaaak..', '..kk..kk..', '..s...s...', '.bb...bb..'],
  ];
  var WAITRESS_PAL = { w: '#ffffff', h: '#3a2a1c', s: '#f0c49a', e: '#2a1e14', m: '#c0504a', O: '#2a1e14', o: '#c0504a', k: '#5a8ac0', a: '#ffffff', b: '#3a2a1c' };
  var GUESTS = [
    ['..hhhh..', '.hssssh.', '.sesess.', '..smms..', '.cccccc.', 'sccttccs', '.cccccc.', '.cc..cc.'],
    ['..yyyy..', '.yyyyyy.', '.sesess.', '..smms..', '.gggggg.', 'sgggggg.', '.gggggg.', '.gg..gg.'],
    ['........', '..wwww..', '.wsssss.', '.sesess.', '..sOOs..', '.pppppp.', 'sppppppp', '.pp..pp.'],
  ];
  var GUEST_PALS = [
    { h: '#2a1e14', s: '#f0c49a', e: '#2a1e14', m: '#a04a3a', c: '#4a4a5a', t: '#d8402e' },
    { y: '#3a2a1c', s: '#f0c49a', e: '#2a1e14', m: '#a04a3a', g: '#4a9a4a' },
    { w: '#d8d8d8', s: '#e8b894', e: '#2a1e14', O: '#a04a3a', p: '#8a6aa8' },
  ];

  function pickType(i) {
    var r = Math.random();
    if (i < 2) return i === 0 ? 'don' : 'rice';
    return r < 0.35 ? 'don' : (r < 0.75 ? 'rice' : 'dish');
  }

  function resetRun(demoTypes) {
    offers = [];
    var n = demoTypes ? demoTypes.length : OFFERS;
    for (var i = 0; i < n; i++) {
      offers.push({ wx: 760 + i * SPACING + (demoTypes ? 0 : game.random(-40, 40)), type: demoTypes ? demoTypes[i] : pickType(i), st: 'offer', g: i % 3, t: 0 });
    }
    hatchX = 760 + n * SPACING + 120;
    walkX = 0; speed = 340; stack = []; falling = []; broken = 0; perfects = 0; stopT = 0; stopIdx = -1; crash = null; sway = 0;
  }

  function initGame() {
    resetRun(null);
    score = 0; countIn = 0.8; over = false; won = false; endT = 0; prevBest = game.best; playT = 0; toppled = false; fiveShown = false;
  }

  // 盆の上の山: 各器の x は盆の中心からのずれ
  function stackTop() {
    var y = TRAY_Y, x = 0, w = TRAY_W;
    for (var i = 0; i < stack.length; i++) { y -= BOWLS[stack[i].type].h * 0.82; x = stack[i].x; w = BOWLS[stack[i].type].w; }
    return { y: y, x: x, w: w };
  }

  // 崩れ判定: ある段より上の器の重心が、その段の器の縁の外へ出たら崩れる
  function toppleLevel() {
    for (var i = 0; i < stack.length - 1; i++) {
      var sum = 0, wsum = 0;
      for (var j = i + 1; j < stack.length; j++) { var bw = BOWLS[stack[j].type].w; sum += stack[j].x * bw; wsum += bw; }
      var com = sum / wsum;
      if (Math.abs(com - stack[i].x) > BOWLS[stack[i].type].w / 2 * 0.9) return i;
    }
    return -1;
  }
  function leanMargin() {
    var worst = 1;
    for (var i = 0; i < stack.length - 1; i++) {
      var sum = 0, wsum = 0;
      for (var j = i + 1; j < stack.length; j++) { var bw = BOWLS[stack[j].type].w; sum += stack[j].x * bw; wsum += bw; }
      worst = Math.min(worst, 1 - Math.abs(sum / wsum - stack[i].x) / (BOWLS[stack[i].type].w / 2 * 0.9));
    }
    return worst;
  }

  function offerScreenX(o) { return WAIT_X + (o.wx - walkX); }

  // ── 受け取り(本番・デモ共通) ──
  function takeBowl() {
    var best = null, bd = 150;
    for (var i = 0; i < offers.length; i++) {
      var o = offers[i];
      if (o.st !== 'offer') continue;
      var d = Math.abs(offerScreenX(o) - WAIT_X);
      if (d < bd) { bd = d; best = o; }
    }
    if (!best) return 'none';
    best.st = 'given'; best.t = 0;
    var top = stackTop();
    var d2 = (offerScreenX(best) - WAIT_X) - top.x;
    var bt = BOWLS[best.type];
    var topY = top.y;
    if (Math.abs(d2) > top.w / 2 * 0.75) {
      // 真上から外れた器は落ちて割れる
      falling.push({ type: best.type, x: WAIT_X + top.x + d2, y: topY - 40, vx: d2 > 0 ? 260 : -260, vy: -200, t: 0 });
      broken++;
      game.feedback.bad(WAIT_X + top.x + d2, topY - 120, { text: 'MISS' });
      return 'drop';
    }
    stack.push({ type: best.type, x: top.x + d2, land: 0.15 });
    var lvl = toppleLevel();
    if (lvl >= 0) {
      // hit-stop: 崩れの原因になった器を白く光らせて止める
      stopT = 0.5; stopIdx = stack.length - 1; toppled = true;
      game.audio.tone(196, 0.25, { wave: 'sawtooth', volume: 0.12, slide: -60 });
      return 'topple';
    }
    var perfect = Math.abs(d2) <= 14;
    var pts = (perfect ? 150 : 60) + stack.length * 10;
    if (state === S.PLAYING) { score += pts; if (perfect) perfects++; }
    game.audio.tone(523 + stack.length * 50, 0.08, { wave: 'triangle', volume: 0.1 });
    game.feedback.good(WAIT_X + top.x + d2, topY - 140, { text: (perfect ? 'PERFECT +' : 'GOOD +') + pts, color: perfect ? C.gold : C.white, size: 46, count: perfect ? 14 : 8 });
    if (state === S.PLAYING && !fiveShown && stack.length >= 5) {
      fiveShown = true;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup(stack.length + '/' + NEEDED, W / 2, Math.round(H * 0.24), { color: C.red, size: 84 });
    }
    return 'ok';
  }

  function stepWalk(dt) {
    walkX += speed * dt;
    sway += dt;
    for (var i = 0; i < offers.length; i++) {
      var o = offers[i];
      o.t += dt;
      if (o.st === 'offer' && offerScreenX(o) < WAIT_X - 160) { o.st = 'kept'; o.t = 0; }
    }
    for (var k = 0; k < stack.length; k++) if (stack[k].land > 0) stack[k].land -= dt;
    for (var j = falling.length - 1; j >= 0; j--) {
      var f = falling[j];
      f.t += dt; f.x += f.vx * dt; f.vy += 2400 * dt; f.y += f.vy * dt;
      if (f.y > FLOOR_Y && !f.smashed) { f.smashed = true; f.y = FLOOR_Y; game.audio.play('se_break', 0.45); game.fx.burst(f.x, FLOOR_Y, { color: BOWLS[f.type].body, count: 12, speed: 320 }); }
      if (f.t > 1.2) falling.splice(j, 1);
    }
  }

  // ── 描画(質感) ──
  function woodBand(y, h) {
    game.draw.gradient(y, y + h, [[0, '#c88a4c'], [0.5, C.wood], [1, C.woodDk]]);
    for (var i = 0; i < 6; i++) game.draw.line(0, y + 10 + i * (h / 6), W, y + 14 + i * (h / 6), '#8a5a30', 2);
  }

  function drawDiner() {
    game.draw.gradient(0, FLOOR_Y, [[0, '#fff6e2'], [1, C.wall]]);
    // 壁タイル(流れる)
    var off = (walkX * 0.5) % 120;
    for (var ty = 300; ty < 760; ty += 60) for (var tx = -off; tx < W; tx += 120) {
      game.draw.rect(tx + 4, ty + 4, 112, 52, C.tile, 0.45);
      game.draw.rect(tx + 4, ty + 4, 112, 6, C.white, 0.5);
    }
    // 品書きの木札(文字なし)と提灯
    var off2 = (walkX * 0.7) % 200;
    for (var m = -1; m < 7; m++) {
      var mx = m * 200 - off2;
      game.draw.rect(mx + 40, 260, 70, 150, '#e8c890');
      game.draw.rect(mx + 40, 260, 70, 10, '#fff0c8');
      game.draw.rect(mx + 60, 290, 30, 90, '#7a5634', 0.35);
    }
    // 床(市松の板)
    woodBand(FLOOR_Y, H - FLOOR_Y);
  }

  function bowlShape(type, cx, by, scale, flash) {
    var b = BOWLS[type], w = b.w * scale, h = b.h * scale;
    var y;
    for (y = -4; y < h + 4; y += 4) {
      var uo = Math.max(0, Math.min(1, y / h));
      var wo = w * (1 - 0.45 * uo) + 10;
      game.draw.rect(cx - wo / 2, by - h + y, wo, 4, flash ? C.gold : '#5a4434');
    }
    for (y = 0; y < h; y += 4) {
      var u = y / h;
      var ww = w * (1 - 0.45 * u);
      var col = flash ? C.white : (u < 0.15 ? b.rim : b.body);
      game.draw.rect(cx - ww / 2, by - h + y, ww, 4, col);
    }
    if (!flash) {
      game.draw.rect(cx - w / 2 + 10, by - h + 8, w * 0.18, 6, C.white, 0.7);    // 艶
      game.draw.rect(cx - w * 0.28, by - 6, w * 0.56, 6, '#000000', 0.15);      // 底の影
      if (type !== 'don') game.draw.line(cx - w * 0.35, by - h * 0.45, cx + w * 0.35, by - h * 0.45, C.indigo, 3);
    }
  }

  function drawOffers() {
    var t = game.time.elapsed;
    for (var i = 0; i < offers.length; i++) {
      var o = offers[i];
      var x = offerScreenX(o);
      if (x < -200 || x > W + 220) continue;
      // 卓と客
      game.draw.rect(x - 40, FLOOR_Y - 150, 240, 30, C.wood);
      game.draw.rect(x - 40, FLOOR_Y - 150, 240, 6, '#e8b070');
      game.draw.rect(x - 20, FLOOR_Y - 120, 16, 120, C.woodDk);
      game.draw.rect(x + 164, FLOOR_Y - 120, 16, 120, C.woodDk);
      game.draw.sprite(GUESTS[o.g], GUEST_PALS[o.g], x + 110, FLOOR_Y - 220 + Math.sin(t * 3 + i) * 3, 14, { anchor: 'center' });
      if (o.st === 'offer') {
        // 差し出す器: 山のてっぺんの少し上。押せる物は明滅+白縁
        var top = stackTop();
        var hy = top.y - 70;
        game.draw.line(x + 70, FLOOR_Y - 200, x + 10, hy + 10, '#f0c49a', 14);
        var near = Math.abs(x - WAIT_X - top.x) < BOWLS[o.type].w * 0.3;
        var pulse = 0.4 + 0.3 * Math.sin(t * 10);
        game.draw.circle(x, hy - BOWLS[o.type].h / 2, BOWLS[o.type].w * 0.62, near ? C.gold : C.white, near ? 0.55 : pulse * 0.6);
        bowlShape(o.type, x, hy, 1, false);
      } else if (o.st === 'kept') {
        bowlShape(o.type, x + 60, FLOOR_Y - 150, 0.8, false);
      }
    }
    // 洗い場の窓口(ゴール)
    var hx = WAIT_X + (hatchX - walkX) + 120;
    if (hx < W + 300) {
      game.draw.rect(hx, FLOOR_Y - 520, 300, 520, '#6a7a88');
      game.draw.rect(hx + 30, FLOOR_Y - 400, 240, 180, '#2a3440');
      game.draw.rect(hx + 30, FLOOR_Y - 220, 240, 20, '#c8d0d8');
      game.draw.rect(hx + 120, FLOOR_Y - 520, 60, 70, C.red);
    }
  }

  function drawWaitressAndStack() {
    var t = game.time.elapsed;
    var margin = stack.length > 1 ? leanMargin() : 1;
    var fr = WAITRESS[Math.floor(t * 6) % 2];
    if (margin < 0.35 || stopT > 0 || (over && !won)) fr = WAITRESS[2];
    if (over && won) fr = WAITRESS[3];
    var walking = state === S.ATTRACT || (!over && countIn <= 0);
    if (!walking && !(over && won)) fr = WAITRESS[0];
    game.draw.sprite(fr, WAITRESS_PAL, WAIT_X - 110, FLOOR_Y - 100, 16, { anchor: 'center' });
    // 盆
    var tilt = stack.length > 0 ? Math.sin(sway * 4) * (1 - margin) * 6 : 0;
    game.draw.rect(WAIT_X - TRAY_W / 2, TRAY_Y, TRAY_W, 22, '#9a6436');
    game.draw.rect(WAIT_X - TRAY_W / 2, TRAY_Y, TRAY_W, 5, '#d8a060');
    game.draw.line(WAIT_X - 70, TRAY_Y + 20, WAIT_X - 110, FLOOR_Y - 110, '#f0c49a', 16);
    // 山(高いほど揺れ、傾きが危ないと土台が赤く点滅)
    var y = TRAY_Y;
    for (var i = 0; i < stack.length; i++) {
      var b = stack[i], bt = BOWLS[b.type];
      var swayX = Math.sin(sway * 4 + i * 0.4) * i * (0.6 + (1 - margin) * 3) + tilt * i;
      var drop = b.land > 0 ? -b.land * 160 : 0;
      var flash = stopT > 0 && i === stopIdx;
      bowlShape(b.type, WAIT_X + b.x + swayX, y + drop, flash ? 1.2 : 1, flash);
      y -= bt.h * 0.82;
    }
    if (margin < 0.35 && stack.length > 1 && Math.floor(t * 8) % 2 === 0) {
      game.draw.rect(WAIT_X - TRAY_W / 2, TRAY_Y - 6, TRAY_W, 6, C.red);
    }
  }

  function drawCrash() {
    if (!crash) return;
    for (var i = 0; i < crash.length; i++) {
      var c = crash[i];
      bowlShape(c.type, c.x, c.y, 1, false);
    }
  }

  function drawFalling() {
    for (var i = 0; i < falling.length; i++) {
      var f = falling[i];
      if (!f.smashed) bowlShape(f.type, f.x, f.y, 1, false);
      else {
        game.draw.rect(f.x - 40, FLOOR_Y - 10, 24, 10, BOWLS[f.type].body);
        game.draw.rect(f.x + 10, FLOOR_Y - 8, 30, 8, BOWLS[f.type].rim);
      }
    }
  }

  function drawWorld() {
    drawDiner(); drawOffers();
    if (!crash) drawWaitressAndStack();
    else { game.draw.sprite(WAITRESS[2], WAITRESS_PAL, WAIT_X - 110, FLOOR_Y - 100, 16, { anchor: 'center' }); drawCrash(); }
    drawFalling();
  }

  function hud() {
    label(String(score), 190, 110, 64, C.ink);
    label(stack.length + ' / ' + NEEDED, W - 190, 110, 56, C.red);
    // 洗い場までの道のり
    var gx = 80, gw = W - 160, gy = 168;
    game.draw.rect(gx, gy, gw, 16, '#00000022');
    game.draw.rect(gx, gy, gw * Math.min(1, walkX / hatchX), 16, C.indigo);
    game.draw.rect(gx + gw - 8, gy - 22, 8, 50, C.ink);
    game.draw.rect(gx + gw, gy - 22, 30, 20, C.red);
    var timeBar = Math.max(0, 1 - playT / TIME_LIMIT);
    game.draw.rect(gx, gy + 26, gw * timeBar, 6, timeBar < 0.25 ? C.red : C.green);
  }

  function startCrash() {
    crash = [];
    var y = TRAY_Y;
    for (var i = 0; i < stack.length; i++) {
      crash.push({ type: stack[i].type, x: WAIT_X + stack[i].x, y: y, vx: game.random(-300, 300) + (stack[i].x > 0 ? 200 : -200), vy: game.random(-500, -200) });
      y -= BOWLS[stack[i].type].h * 0.82;
    }
    game.audio.play('se_break', 0.6);
  }
  function stepCrash(dt) {
    if (!crash) return;
    for (var i = 0; i < crash.length; i++) {
      var c = crash[i];
      c.vy += 2400 * dt; c.x += c.vx * dt; c.y += c.vy * dt;
      if (c.y > FLOOR_Y) { c.y = FLOOR_Y; c.vy *= -0.3; c.vx *= 0.6; }
    }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || countIn > 0 || stopT > 0) { game.audio.play('se_tap', 0.05); return; }
    var r = takeBowl();
    if (r === 'none') { game.audio.play('se_tap', 0.08); game.fx.burst(WAIT_X, stackTop().y - 30, { color: C.shade, count: 4, speed: 100 }); }
  });

  // ── ATTRACT: 実ロジックで丼→茶碗→小皿を真上で受け取り、次の大きい丼は見送り、最後の茶碗は早く取りすぎて落として割る ──
  var DEMO_TYPES = ['don', 'rice', 'dish', 'don', 'rice'];
  var demo = { t: 0, gx: WAIT_X, gy: H * 0.86, press: 0 };
  function demoStep(dt) {
    demo.t += dt;
    if (demo.t <= dt) resetRun(DEMO_TYPES);
    if (demo.press > 0) demo.press -= dt;
    if (stopT > 0) { stopT -= dt; return; }
    stepWalk(dt);
    for (var i = 0; i < offers.length; i++) {
      var o = offers[i];
      if (o.st !== 'offer') continue;
      var d = offerScreenX(o) - WAIT_X - stackTop().x;
      if (i === 3) continue;                                   // 小皿の上の大きい丼は見送る
      var want = i === 4 ? 75 : (i === 1 ? -4 : 6);            // 最後はわざと早すぎ
      if (d <= want) { takeBowl(); demo.press = 0.2; }
    }
    if (walkX > 760 + 4 * SPACING + 300) demo.t = 0;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!offers) initGame();
      demoStep(dt);
      drawWorld();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 14 });
      label(GAME_TITLE, W / 2, 120, 96, C.red);
      label('HI-SCORE ' + game.best, W / 2, 190, 38, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, 1880, 44, C.red);
      else label('TAP TO START', W / 2, 1880, 42, C.white);
      return;
    }

    if (state === S.RESULT) {
      stepCrash(dt);
      drawWorld();
      game.draw.rect(60, 260, W - 120, 330, C.white, 0.85);
      label(won ? 'CLEAR' : (playT >= TIME_LIMIT ? 'TIME UP' : 'GAME OVER'), W / 2, 360, 100, won ? C.green : C.red);
      label('SCORE ' + score, W / 2, 440, 58, C.ink);
      label(stack.length + ' / ' + NEEDED + '  PERFECT ' + perfects, W / 2, 500, 40, C.indigo);
      if (score > prevBest && prevBest > 0) label('NEW RECORD', W / 2, 565, 52, C.red);
      else label('BEST ' + Math.max(prevBest, score), W / 2, 565, 42, C.ink);
      if (!won && !toppled) label('あと' + Math.max(1, NEEDED - stack.length) + '個!', W / 2, 700, 60, C.red);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, 1880, 40, C.ink);
      return;
    }

    // ── PLAYING ──
    if (endT > 0) {
      endT -= dt;
      stepCrash(dt);
      if (endT <= 0) {
        state = S.RESULT;
        var stats = { stacked: crash ? 0 : stack.length, perfect: perfects, broken: broken };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) {
        game.feedback.bad(WAIT_X, stackTop().y - 80, { text: 'MISS' });
        startCrash();
        over = true; won = false; finish();
      }
    } else if (countIn > 0) {
      countIn -= dt;
      if (countIn <= 0) game.audio.play('se_tap', 0.3);
    } else if (!over) {
      playT += dt;
      speed = 340 + Math.min(1, playT / 14) * 70;
      stepWalk(dt);
      if (walkX >= hatchX) {
        over = true; won = stack.length >= NEEDED;
        if (won) { score += stack.length * 50; game.audio.play('se_coin', 0.5); }
        else game.feedback.bad(WAIT_X, stackTop().y - 80, { text: 'MISS' });
        finish();
      } else if (playT >= TIME_LIMIT) {
        over = true; won = false;
        game.feedback.bad(WAIT_X, stackTop().y - 80, { text: 'TIME UP' });
        finish();
      }
    }

    drawWorld();
    hud();
    if (countIn > 0) label(countIn > 0.35 ? 'READY?' : 'GO!', W / 2, Math.round(H * 0.4), 120, C.red);
  });

  function finish() {
    if (endT > 0) return;
    endT = 1.4;
    game.audio.stopBgm();
    game.audio.play(won ? 'se_success' : 'se_failure', 0.55);
    if (won) for (var i = 0; i < 7; i++) game.fx.burst(game.random(140, 940), game.random(350, 1200), { color: i % 2 ? C.red : C.gold, count: 22, speed: 460 });
  }

  // 昼の食堂の有線風(オリジナル)
  var TUNE = [
    ['C5', 0.5], ['A4', 0.5], ['G4', 0.5], ['E4', 0.5], ['G4', 1], ['A4', 0.5], ['C5', 0.5],
    ['D5', 0.5], ['C5', 0.5], ['A4', 0.5], ['G4', 0.5], ['A4', 2],
  ];
  var TUNE_OPTS = { tempo: 124, wave: 'triangle', volume: 0.055, loop: true, bass: [['F2', 1], ['C3', 1], ['G2', 1], ['C3', 1]] };

  game.onStart(function() {
    game.audio.melody(TUNE, TUNE_OPTS);
    state = S.ATTRACT;
    initGame();
  });
})(game);

// I-Wii-0003v3-tofu-tenbin-slope-carry.js
// 天秤棒の坂のぼり — 左手で左の桶、右手で右の桶の高さを受け持ち、軒先の暖簾と足元の石灯籠のすき間へそれぞれの桶を同時に通して坂を上る
// 操作: 画面の左半分に置いた指の高さが左の桶、右半分の指の高さが右の桶の吊り上げ具合になる(上へずらすほど桶が上がる。離すと桶はゆっくり下がり、石段に擦りそうになると赤く瞬く)。障害物は右から来て、上り側の右の桶が先に、少し遅れて左の桶が同じ所を通る。左右の高さを離しすぎると天秤棒が傾いてよろける(社内メモ。画面には出さない)
// 終わり: 22秒で坂の上の茶屋まで上ればCLEAR(水こぼしが2回まで)。桶をぶつける・天秤棒を傾けすぎて3回水をこぼすとGAME OVER
// @mechanic: coop_2zone
// @theme: castle_town_slope_tofu_peddler
// 世界観: 城下町の石段の坂道で、天秤棒を担いだ豆腐売りが、軒先の暖簾や看板と足元の石灯籠のあいだへ左右の桶を両手で加減して通し、水も豆腐もこぼさずに坂の上の茶屋まで届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + きれいに通した数・こぼした回数・スコア
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 多色・高彩度、空グラデ+遠景シルエット+近景の2〜3層、暗色輪郭+ハイライトの大きめキャラ
  var STYLE = { bg: ['#f8b070', '#6a8ad0'], main: ['#c8a070', '#6a4a3a', '#3a6aa8'], accent: ['#e8483a', '#fff8e0'] };
  var C = {
    stone: STYLE.main[0], wood: STYLE.main[1], indigo: STYLE.main[2], red: STYLE.accent[0], cream: STYLE.accent[1],
    ink: '#2a1e1a', roof: '#4a4a5a', castle: '#5a5a7a', water: '#6ac8f0', gold: '#f8d058', moss: '#5a8a4a',
  };

  var GAME_TITLE = 'TENBIN SLOPE';
  var TIME_LIMIT = 22;
  var STRIKES = 3;
  var SH_Y = 760;                  // 肩の高さ(画面)
  var CX = W / 2, ARM = 270;
  var ROPE = 430, LIFT = 420, BH = 110, BW = 120;
  var ZB = 1880, ZH = 520;         // 親指ゾーン: 指の高さ→吊り上げ
  var TILT_MAX = 0.78;
  var OW = 130;

  var lowWarn = [false, false];
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var lift, want, fingers, obs, nextX, scrollX, speed, strikes, clean, nice, score, finalScore, timeLeft, elapsedP, readyT, stopT, stopKind, culprit, fin, cleared, postT, warnT, invT, joyT, stumbleT, milestone, beepT, tiltWarnT;

  // 豆腐売り(鉢巻・藍の半纏)
  var MAN_A = ['...wwww...', '..hhhhhh..', '..hsssss..', '..sskssk..', '..ssssss..', '...smms...', '.iiiiiiii.', 'siiiwwiiis', '..iiiiii..', '..nn..nn..', '..nn...nn.', '.kk.....kk'];
  var MAN_B = ['...wwww...', '..hhhhhh..', '..hsssss..', '..sskssk..', '..ssssss..', '...smms...', '.iiiiiiii.', 'siiiwwiiis', '..iiiiii..', '..nn..nn..', '...nnnn...', '...kk.kk..'];
  var MAN_OOPS = ['...wwww...', '..hhhhhh..', '..hsssss..', '..sxssxs..', '..ssssss..', '...sOOs...', 's.iiiiii.s', '.iiiwwiii.', '..iiiiii..', '..nn..nn..', '.nn....nn.', 'kk......kk'];
  var MAN_JOY = ['s..wwww..s', 's.hhhhhh.s', '..hsssss..', '..s.ss.s..', '..ssssss..', '...smms...', '.iiiiiiii.', '.iiiwwiii.', '..iiiiii..', '..nn..nn..', '..nn..nn..', '.kk....kk.'];
  var MAN_PAL = { w: '#fff8e0', h: '#2a1e1a', s: '#f0c098', k: '#2a1e1a', x: '#2a1e1a', m: '#c84a3a', O: '#c84a3a', i: '#3a6aa8', n: '#2a3a5a' };
  var TUB = ['.tttttttt.', 'tqqqqqqqqt', 'tqfqqqfqqt', 'tqqqfqqqqt', 'bbbbbbbbbb', 'tttttttttt', 'bbbbbbbbbb', '.tttttttt.'];
  var LANTERN = ['..rrrr..', '.rrrrrr.', '..llll..', '.lyyyyl.', '.lyyyyl.', '..llll..', '...ll...', '...ll...', '.llllll.', 'llllllll'];
  var POT = ['..gggg..', '.gggggg.', 'gggggggg', '.gggggg.', '...tt...', '.pppppp.', '.pppppp.', '..pppp..'];

  function out(str, x, y, sz, color) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: '#2a1e1a', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function bucketBottom(i) { return SH_Y + ROPE - lift[i] * LIFT; }
  function bucketX(i) { return CX + (i === 0 ? -ARM : ARM); }
  function groundY(i) { return SH_Y + ROPE + 40 - (i === 1 ? 70 : 0); }

  function addObstacle() {
    var k = Math.min(1, elapsedP / TIME_LIMIT);
    var r = Math.random();
    var o = { x: nextX, kind: r < 0.42 ? 'post' : r < 0.84 ? 'eave' : 'gate', done: [false, false], hit: [false, false], warn: [false, false] };
    // post: 桶の底がこの線より上(=吊り上げ need 以上) / eave: 桶の上端がこの線より下(=吊り上げ cap 以下)
    if (o.kind === 'post') o.need = game.random(0.28, 0.55 + 0.1 * k);
    else if (o.kind === 'eave') o.cap = game.random(0.42 - 0.08 * k, 0.7);
    else { o.need = game.random(0.2, 0.4); o.cap = o.need + 0.36 - 0.1 * k; }
    obs.push(o);
    nextX += game.random(440, 560) - 80 * k;
  }

  function initGame() {
    lift = [0.3, 0.45]; want = [0.3, 0.45]; fingers = [null, null];
    obs = []; nextX = 900; scrollX = 0; speed = 300;
    strikes = 0; clean = 0; nice = 0; score = 0; finalScore = 0;
    timeLeft = TIME_LIMIT; elapsedP = 0; readyT = 0.8; stopT = 0; stopKind = ''; culprit = null; fin = false; cleared = false;
    postT = 0; warnT = 0; invT = [0, 0]; joyT = 0; stumbleT = 0; milestone = false; beepT = 0; tiltWarnT = 0;
    while (nextX < 2600) addObstacle();
  }

  // 障害物の禁止域(画面 y)。post は下から、eave は上から
  function postTop(o) { return SH_Y + ROPE - o.need * LIFT; }
  function eaveBottom(o) { return SH_Y + ROPE - BH - o.cap * LIFT; }

  function spill(i, why, o) {
    strikes++; invT[i] = 0.9; stumbleT = 0.5;
    var bx = bucketX(i), by = bucketBottom(i) - BH / 2;
    game.audio.play('se_break', 0.3);
    game.fx.burst(bx, by, { color: C.water, count: 14, speed: 360 });
    if (mode === S.PLAYING && strikes >= STRIKES) {
      stopT = 0.55; stopKind = 'spill'; culprit = { i: i, o: o, why: why };
      game.fx.flash('#ffffff', 0.2);
      return;
    }
    game.feedback.bad(bx, by - 80, { text: 'MISS', color: C.red, size: 56 });
  }

  function stepWorld(dt) {
    if (joyT > 0) joyT -= dt;
    if (stumbleT > 0) stumbleT -= dt;
    for (var i = 0; i < 2; i++) {
      if (invT[i] > 0) invT[i] -= dt;
      // 指を離した側の桶はゆっくり下がっていく(すぐには落ちない)
      var target = fingers[i] ? Math.max(0, Math.min(1, (ZB - fingers[i].y) / ZH)) : (mode === S.ATTRACT ? want[i] : Math.max(0, lift[i] - 0.25 * dt));
      if (mode !== S.ATTRACT) want[i] = target;
      var d = want[i] - lift[i];
      lift[i] += Math.max(-3.2 * dt, Math.min(3.2 * dt, d));
    }
    scrollX += speed * dt;
    while (nextX - scrollX < W + 400) addObstacle();
    // 天秤棒の傾き
    var tilt = lift[1] - lift[0];
    if (Math.abs(tilt) > TILT_MAX * 0.75) {
      tiltWarnT -= dt;
      if (tiltWarnT <= 0) { tiltWarnT = 0.15; game.audio.tone('D4', 0.06, { wave: 'sawtooth', volume: 0.05 }); }
    }
    if (Math.abs(tilt) > TILT_MAX && invT[0] <= 0 && invT[1] <= 0) {
      var low = tilt > 0 ? 0 : 1;
      lift[1 - low] -= 0.25; want[1 - low] = lift[1 - low];
      spill(1 - low, 'tilt', null);
    }
    // 地面に擦る
    for (var g = 0; g < 2; g++) {
      if (bucketBottom(g) > groundY(g) && invT[g] <= 0) spill(g, 'ground', null);
      // telegraph: 石段に擦りそうなら桶が赤く瞬き、予告音
      lowWarn[g] = bucketBottom(g) > groundY(g) - 45;
      if (lowWarn[g] && beepT <= 0) { beepT = 0.18; game.audio.tone('C5', 0.05, { wave: 'square', volume: 0.05 }); }
    }
    beepT -= dt;
    for (var k = obs.length - 1; k >= 0; k--) {
      var o = obs[k], sx = o.x - scrollX;
      for (var b = 0; b < 2; b++) {
        var bx = bucketX(b);
        var bottom = bucketBottom(b), top = bottom - BH;
        var blockedBelow = (o.kind === 'post' || o.kind === 'gate') && bottom > postTop(o);
        var blockedAbove = (o.kind === 'eave' || o.kind === 'gate') && top < eaveBottom(o);
        // telegraph: ぶつかる高さのまま 0.6 秒以内に来るなら桶が赤く瞬く
        var ahead = sx - bx;
        o.warn[b] = ahead > 0 && ahead < speed * 0.6 && (blockedBelow || blockedAbove);
        if (o.warn[b] && beepT <= 0) { beepT = 0.18; game.audio.tone(b === 0 ? 'E5' : 'A5', 0.05, { wave: 'square', volume: 0.05 }); }
        if (Math.abs(sx - bx) < (OW + BW) / 2 && !o.hit[b] && invT[b] <= 0 && (blockedBelow || blockedAbove)) { o.hit[b] = true; spill(b, 'obstacle', o); }
        if (!o.done[b] && sx < bx - (OW + BW) / 2) {
          o.done[b] = true;
          if (!o.hit[b]) {
            clean++;
            var margin = Math.min(o.need !== undefined ? postTop(o) - bottom : 999, o.cap !== undefined ? top - eaveBottom(o) : 999);
            var tight = margin < 50;
            if (tight) nice++;
            score += tight ? 160 : 100;
            if (tight) game.feedback.good(bx, top - 60, { text: 'NICE', color: C.gold, size: 46 });
            else { game.audio.play('se_coin', 0.15); game.fx.burst(bx, top, { color: C.cream, count: 5, speed: 160 }); }
            if (mode === S.PLAYING && !milestone && clean >= 8) { milestone = true; game.audio.play('se_milestone', 0.5); game.fx.popup('GOOD', W / 2, H * 0.2, { color: C.gold, size: 84 }); }
          }
        }
      }
      if (sx < -300) obs.splice(k, 1);
    }
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = score + (win ? (STRIKES - strikes) * 300 + clean * 20 : 0);
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 6; i++) game.fx.burst(150 + i * 155, H * 0.35 + (i % 2) * 160, { color: i % 2 ? C.gold : C.water, count: 18, speed: 520 });
      game.fx.flash(C.cream, 0.25);
    }
  }

  function canPlay() { return mode === S.PLAYING && !fin && stopT <= 0 && readyT <= 0; }

  game.onPress(function(x, y, id) {
    if (!canPlay()) return;
    var side = x < W / 2 ? 0 : 1;
    fingers[side] = { id: id, y: y };
    game.audio.tone(side === 0 ? 'C5' : 'G5', 0.05, { wave: 'triangle', volume: 0.06 });
    game.fx.burst(x, y, { color: side === 0 ? C.water : C.gold, count: 5, speed: 140 });
  });
  game.onMove(function(x, y, id) {
    for (var i = 0; i < 2; i++) if (fingers[i] && fingers[i].id === id) fingers[i].y = y;
    if (Math.random() < 0.04) game.audio.tone(300 + (ZB - y) * 0.6, 0.02, { wave: 'triangle', volume: 0.02 });
  });
  game.onRelease(function(x, y, id) {
    for (var i = 0; i < 2; i++) if (fingers[i] && fingers[i].id === id) { fingers[i] = null; game.audio.tone('E4', 0.04, { wave: 'triangle', volume: 0.04 }); }
  });
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function town(t) {
    game.draw.gradient(0, H, [[0, STYLE.bg[1]], [0.3, STYLE.bg[0]], [0.55, '#f8d8a0'], [0.56, C.stone], [1, '#8a7050']]);
    // 遠景: 城の天守(シルエット)
    var fx = -(scrollX * 0.05) % 1400 + 900;
    game.draw.rect(fx - 90, 260, 180, 140, C.castle); game.draw.rect(fx - 130, 330, 260, 30, C.castle);
    game.draw.rect(fx - 60, 200, 120, 70, C.castle); game.draw.rect(fx - 90, 250, 180, 20, C.castle);
    // 中景: 屋根並み(坂を上るので右上がり)
    for (var i = -1; i < 7; i++) {
      var x = i * 200 - (scrollX * 0.3) % 200;
      game.draw.rect(x, 520 - i * 18, 190, 40, C.roof);
      game.draw.rect(x + 10, 560 - i * 18, 170, 120, '#d8c0a0');
    }
    // 近景: 石段(右上がり)
    for (var s = -1; s < 12; s++) {
      var sx = s * 110 - (scrollX % 110);
      var gy = SH_Y + ROPE + 40 - (sx - (CX - ARM)) / (2 * ARM) * 70;
      game.draw.rect(sx, gy, 112, H - gy, s % 2 ? C.stone : '#b89060');
      game.draw.rect(sx, gy, 112, 10, '#e8d0a8');
    }
  }

  function drawObstacles(t) {
    var big = stopT > 0 && culprit && culprit.o;
    for (var k = 0; k < obs.length; k++) {
      var o = obs[k], sx = o.x - scrollX;
      if (sx < -200 || sx > W + 200) continue;
      var hl = big && culprit.o === o && Math.floor(t * 16) % 2 === 0;
      if (o.kind === 'eave' || o.kind === 'gate') {
        var eb = eaveBottom(o);
        // 軒と暖簾(赤い縁=当たると危ない)
        game.draw.rect(sx - OW / 2 - 40, 0, OW + 80, eb - 120, hl ? '#ffffff' : C.roof);
        game.draw.rect(sx - OW / 2 - 50, eb - 140, OW + 100, 30, hl ? '#ffffff' : '#3a3a4a');
        for (var n = 0; n < 3; n++) game.draw.rect(sx - OW / 2 + n * (OW / 3) + 4, eb - 110, OW / 3 - 8, 110 + Math.sin(t * 3 + n) * 6, hl ? '#ffffff' : C.indigo);
        game.draw.rect(sx - OW / 2, eb - 8, OW, 8, C.red);
      }
      if (o.kind === 'post' || o.kind === 'gate') {
        var pt = postTop(o), base = SH_Y + ROPE + 60;
        var hgt = base - pt;
        if (k % 2) game.draw.sprite(LANTERN, hl ? { r: '#fff', l: '#fff', y: '#fff' } : { r: '#8a8a8a', l: '#a8a8a0', y: C.gold }, sx, pt + hgt / 2, Math.max(6, hgt / 10), { anchor: 'center' });
        else game.draw.sprite(POT, hl ? { g: '#fff', t: '#fff', p: '#fff' } : { g: C.moss, t: C.wood, p: '#c86a3a' }, sx, pt + hgt / 2, Math.max(6, hgt / 8), { anchor: 'center' });
        game.draw.rect(sx - OW / 2, pt, OW, 8, C.red);
      }
    }
  }

  function drawCarrier(t) {
    var over = fin && !cleared;
    var tilt = (lift[1] - lift[0]) * 0.4;
    var bob = Math.abs(Math.sin(t * 7)) * 8;
    var fr = (stumbleT > 0 || over || (stopT > 0 && stopKind === 'spill')) ? MAN_OOPS : (joyT > 0 || (fin && cleared)) ? MAN_JOY : (Math.floor(t * 5) % 2 ? MAN_A : MAN_B);
    if (fin && cleared) bob = Math.abs(Math.sin(t * 10)) * 26;
    game.draw.sprite(fr, MAN_PAL, CX, SH_Y + 6 - bob, 15, { anchor: 'center' });
    // 天秤棒(傾き=左右の吊り上げの差)
    var lx = CX - ARM - 40, rx = CX + ARM + 40;
    var ly = SH_Y - bob + Math.sin(-tilt) * (ARM + 40), ry = SH_Y - bob + Math.sin(tilt) * (ARM + 40);
    var warnTilt = Math.abs(lift[1] - lift[0]) > TILT_MAX * 0.75 && Math.floor(t * 12) % 2 === 0;
    game.draw.line(lx, ly, rx, ry, warnTilt ? C.red : C.wood, 18);
    game.draw.line(lx, ly - 6, rx, ry - 6, '#a87a50', 5);
    for (var i = 0; i < 2; i++) {
      var bx = bucketX(i), bot = bucketBottom(i) - bob * 0.5;
      var hookY = i === 0 ? SH_Y - bob + Math.sin(-tilt) * ARM : SH_Y - bob + Math.sin(tilt) * ARM;
      var sway = Math.sin(t * 4 + i) * 6;
      game.draw.line(bx - 40, hookY, bx - 50 + sway, bot - BH + 10, C.ink, 4);
      game.draw.line(bx + 40, hookY, bx + 50 + sway, bot - BH + 10, C.ink, 4);
      var warn = lowWarn[i];
      for (var k = 0; k < obs.length; k++) if (obs[k].warn[i]) warn = true;
      var blink = (warn || invT[i] > 0) && Math.floor(t * 14) % 2 === 0;
      var big = stopT > 0 && culprit && culprit.i === i;
      game.draw.sprite(TUB, blink || (big && Math.floor(t * 16) % 2 === 0) ? { t: '#ffffff', q: '#ffffff', f: '#ffffff', b: C.red } : { t: '#c89a5a', q: C.water, f: '#ffffff', b: '#5a3a2a' }, bx + sway, bot - BH / 2, big ? 18 : 12, { anchor: 'center' });
    }
  }

  function drawZones(t) {
    // 親指ゾーン: 左右の吊り上げレール(つまみ=今の高さ)
    for (var i = 0; i < 2; i++) {
      var x = i === 0 ? W * 0.18 : W * 0.82;
      var col = i === 0 ? C.water : C.gold;
      game.draw.rect(x - 70, ZB - ZH - 30, 140, ZH + 60, '#2a1e1a', 0.35);
      game.draw.rect(x - 8, ZB - ZH, 16, ZH, col, 0.6);
      var ky = ZB - lift[i] * ZH;
      game.draw.circle(x, ky, fingers[i] ? 56 : 46, col);
      game.draw.circle(x - 12, ky - 12, 14, '#ffffff', 0.7);
      game.draw.sprite(TUB, { t: '#c89a5a', q: C.water, f: '#ffffff', b: '#5a3a2a' }, x, ZB + 20, 5, { anchor: 'center' });
    }
  }

  function drawHud(t) {
    var low = timeLeft < 4 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(0, 0, W, 210, '#2a1e1a', 0.55);
    game.draw.rect(70, 40, W - 140, 26, '#00000080');
    var progress = Math.min(1, elapsedP / TIME_LIMIT);
    game.draw.rect(76, 46, (W - 152) * progress, 14, low ? C.red : C.gold);
    game.draw.rect(W - 92, 22, 22, 60, C.red);
    for (var s = 0; s < STRIKES; s++) game.draw.sprite(TUB, s < strikes ? { t: '#6a6a6a', q: '#6a6a6a', f: '#6a6a6a', b: '#4a4a4a' } : { t: '#c89a5a', q: C.water, f: '#ffffff', b: '#5a3a2a' }, W - 130 - s * 90, 150, 6, { anchor: 'center' });
    out('' + clean, W / 2, 160, 60, C.cream);
    out('' + score, 150, 160, 40, C.gold);
  }

  function drawScene(t) {
    town(t);
    drawObstacles(t);
    drawCarrier(t);
    drawZones(t);
    for (var sl = 0; sl < H; sl += 8) game.draw.rect(0, sl, W, 2, '#000000', 0.05);
  }

  // ---- ATTRACT: 本物の stepWorld。ゴーストの両手が次に来る障害物に合わせて左右の桶を上げ下げ、4つに1つは左手が遅れてぶつける ----
  var demo = { t: 0, n: 0, y: [ZB - 0.3 * ZH, ZB - 0.45 * ZH] };
  function planFor(i) {
    var bx = bucketX(i), best = null;
    for (var k = 0; k < obs.length; k++) {
      var o = obs[k], ahead = o.x - scrollX - bx;
      if (ahead > -140 && ahead < 420 && (!best || o.x < best.x)) best = o;
    }
    var base = i === 1 ? 0.35 : 0.2;
    if (!best) return base;
    if (i === 0 && best.lazy === undefined) { demo.n++; best.lazy = demo.n % 4 === 0; }
    if (i === 0 && best.lazy) return base;
    if (best.kind === 'post') return Math.min(1, best.need + 0.12);
    if (best.kind === 'eave') return Math.max(i === 1 ? 0.2 : 0, best.cap - 0.12);
    return (best.need + best.cap) / 2;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 9;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; demo.n = 0; }
    elapsedP = Math.min(TIME_LIMIT * 0.5, elapsedP + dt);
    if (strikes >= STRIKES) strikes = 0;
    for (var i = 0; i < 2; i++) {
      want[i] = planFor(i);
      demo.y[i] += (ZB - want[i] * ZH - demo.y[i]) * Math.min(1, dt * 10);
    }
    stepWorld(dt);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(W * 0.18, demo.y[0], { press: true, scale: 12 });
      game.draw.hand(W * 0.82, demo.y[1], { press: true, scale: 12 });
      game.draw.rect(0, 0, W, 230, '#2a1e1a', 0.55);
      out(GAME_TITLE, W / 2, 120 + Math.sin(t * 2) * 5, 90, C.gold);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 200, 40, C.cream);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.975, 46, C.cream);
      else out('TAP TO START', W / 2, H * 0.975, 42, C.gold);
      return;
    }

    if (mode === S.RESULT) {
      drawScene(t);
      game.draw.rect(90, H * 0.3, W - 180, 480, '#2a1e1a', 0.88);
      out(cleared ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.36, 96, cleared ? C.gold : C.red);
      out('SCORE ' + finalScore, W / 2, H * 0.42, 60, C.cream);
      out('NICE ' + nice + '   MISS ' + strikes, W / 2, H * 0.47, 42, C.water);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.52, 56, C.red);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.52, 42, C.cream);
      if (!cleared) out('あと' + Math.max(1, Math.ceil(timeLeft)) + '秒!', W / 2, H * 0.27, 64, C.red);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.975, 40, C.cream);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { clean: clean, nice: nice, spills: strikes };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) {
        if (stopKind === 'win') ending(true);
        else { var ci = culprit ? culprit.i : 0; game.feedback.bad(bucketX(ci), bucketBottom(ci) - 160, { text: 'MISS', color: C.red, size: 62 }); ending(false); }
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      timeLeft -= dt; elapsedP += dt;
      speed = 300 + 110 * Math.min(1, elapsedP / TIME_LIMIT);
      stepWorld(dt);
      if (timeLeft < 4) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.06, { wave: 'square', volume: 0.07 }); }
      }
      if (timeLeft <= 0 && stopT <= 0) { timeLeft = 0; stopT = 0.45; stopKind = 'win'; joyT = 2; game.audio.play('se_powerup', 0.45); }
    }

    drawScene(t);
    if (stopT > 0 && stopKind === 'win') game.draw.circle(CX, SH_Y + 100, 100 + (0.45 - stopT) * 1500, C.cream, 0.3);
    // 開始直後のお手本: 左右のレールに置いた2本の手が上下する
    if (!fin && readyT <= 0 && elapsedP < 1.6 && !fingers[0] && !fingers[1]) {
      game.draw.hand(W * 0.18, ZB - (0.3 + Math.sin(elapsedP * 5) * 0.2) * ZH, { press: true, scale: 10, alpha: 0.45 });
      game.draw.hand(W * 0.82, ZB - (0.5 - Math.sin(elapsedP * 5) * 0.2) * ZH, { press: true, scale: 10, alpha: 0.45 });
    }
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 120, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['A4', 0.5], ['C5', 0.5], ['D5', 1], ['E5', 0.5], ['G5', 0.5], ['E5', 1],
      ['D5', 0.5], ['C5', 0.5], ['A4', 1], ['G4', 0.5], ['A4', 1.5],
      ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['G5', 0.5], ['A5', 1], ['G5', 0.5], ['E5', 0.5], ['D5', 2],
    ], { tempo: 132, wave: 'square', volume: 0.05, loop: true, bass: [['A2', 1], ['E3', 1], ['D3', 1], ['E3', 1]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);

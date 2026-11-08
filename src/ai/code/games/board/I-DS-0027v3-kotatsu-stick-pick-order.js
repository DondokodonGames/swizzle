// I-DS-0027v3-kotatsu-stick-pick-order.js
// こたつのひご取り — 祖母と交互に、色で点の違う竹ひごを上から1本ずつ取る。自分の番では、取ったあとに高い点のひごが祖母の番でむき出しにならない1本を選ぶ
// 操作: 自分の番(下の枠が光る)に、上に何も乗っていない(白く明滅する)ひごを押して離すと取れる。押している間、それを取ると上が空いてしまうひごが赤く点滅する。指をずらして離すと取りやめ。持ち時間の帯が尽きると一番安いひごを自動で取る
// 終わり: 3つの山(5本・6本・8本)を取り終えて、合計点が祖母より多ければCLEAR。同点以下、または29秒を超えるとGAME OVER
// @mechanic: turn_attack
// @theme: winter_kotatsu_stick_pick
// 世界観: 冬休みの祖母の家のこたつで、孫娘が祖母と向かい合い、天板に崩した竹ひごの山から色ごとに点の違うひごを1本ずつ交互に取り合う(祖母は見える中で一番高いひごを取り、2つ目の山からは孫に高いひごを見せない取り方もしてくる)
// 残るもの: 正誤(CLEAR/GAME OVER) + 合計点(自分-祖母)・山ごとの勝ち数・スコア
// スタイル: 8bit PC MONITOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: 高解像度・低色数(8色ベタ)、細い線と枠線のUI、市松ディザで中間色
  var STYLE = { bg: ['#000022', '#000066'], main: ['#ffff55', '#55ff55', '#55ffff'], accent: ['#ff5555', '#ffffff'] };
  var V = {
    gold: STYLE.main[0], green: STYLE.main[1], cyan: STYLE.main[2], red: STYLE.accent[0], white: STYLE.accent[1],
    blue: '#5555ff', mag: '#ff55ff', wood: '#aa5500', woodDk: '#552a00', black: '#000000', gray: '#555555',
  };
  var VAL_COL = { 1: V.white, 2: V.green, 3: V.cyan, 5: V.gold };

  var GAME_TITLE = 'HIGO TURNS';
  var TIME_LIMIT = 26;
  var TURN_T = 2.0;
  var TX0 = 100, TX1 = 980, TY0 = Math.round(H * 0.29), TY1 = Math.round(H * 0.73);
  // [x1, y1, x2, y2, 点]。配列の後ろほど上に乗っている
  var PILES = [
    { first: 'me', smart: 0, sticks: [[260, 980, 820, 980, 5], [420, 760, 660, 1200, 3], [200, 700, 380, 860, 2], [700, 700, 900, 820, 1], [300, 1150, 560, 1300, 2]] },
    { first: 'gran', smart: 1, sticks: [[240, 1180, 840, 1100, 5], [380, 1000, 480, 1300, 2], [640, 1000, 720, 1300, 3], [200, 700, 460, 760, 1], [560, 680, 900, 860, 3], [700, 640, 760, 900, 2]] },
    { first: 'gran', smart: 1, sticks: [[240, 1240, 840, 1240, 5], [300, 1060, 420, 1320, 2], [660, 1080, 740, 1320, 1], [200, 820, 560, 760, 5], [300, 660, 380, 960, 2], [620, 640, 920, 900, 3], [700, 600, 840, 980, 2], [420, 1000, 600, 1060, 1]] },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var pileIdx, sticks, turn, turnT, armed, flying, granPick, granT, pileT, myPts, granPts, myPile, granPile, pilesWon, score, finalScore, goodPicks, badPicks;
  var timeLeft, readyT, stopT, stopKind, fin, cleared, postT, joyT, sadT, granJoyT, warnT, playT, myTray, granTray, hintT, hintList;

  // 孫娘(おさげ)と祖母(おだんご+眼鏡)
  var GIRL_A = ['.kk.kkkk.kk.', 'kk.kkkkkk.kk', 'k..ssssss..k', '...skssks...', '...ssssss...', '....srrs....', '..pppppppp..', '.pppppppppp.', '..pppppppp..'];
  var GIRL_B = ['.kk.kkkk.kk.', 'kk.kkkkkk.kk', 'k..ssssss..k', '...skssks...', '...ssssss...', '....ssss....', '..pppppppp..', '.pppppppppp.', '..pppppppp..'];
  var GIRL_JOY = ['kk..kkkk..kk', '.kkkkkkkkkk.', '...ssssss...', '...s.ss.s...', '...ssssss...', '...srrrrs...', 's.pppppppp.s', '.pppppppppp.', '..pppppppp..'];
  var GIRL_SAD = ['............', '.kk.kkkk.kk.', 'kk.kkkkkk.kk', 'k..ssssss..k', '...skssks...', '...srrrrs...', '..pppppppp..', '.pppppppppp.', '..pppppppp..'];
  var GIRL_PAL = { k: '#aa5500', s: '#ffaa88', r: '#ff5555', p: '#5555ff' };
  var GRAN_A = ['....wwww....', '...wwwwww...', '..wwwwwwww..', '..ssssssss..', '..gssggssg..', '..ssssssss..', '...ssmmss...', '..cccccccc..', '.cccccccccc.'];
  var GRAN_B = ['....wwww....', '...wwwwww...', '..wwwwwwww..', '..ssssssss..', '..gssggssg..', '..ssssssss..', '...ssssss...', '..cccccccc..', '.cccccccccc.'];
  var GRAN_JOY = ['....wwww....', '...wwwwww...', '..wwwwwwww..', '..ssssssss..', '..g.sgg.sg..', '..ssssssss..', '...smmmms...', 's.cccccccc.s', '.cccccccccc.'];
  var GRAN_PAL = { w: '#aaaaaa', s: '#ffaa88', g: '#ffffff', m: '#aa5500', c: '#ff55ff' };
  var GRAN_HAND = ['.ss.', 'ssss', 'ssss', '.ss.'];

  function out(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: V.black, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function frameBox(x, y, w, h, col, th) {
    game.draw.rect(x, y, w, th, col); game.draw.rect(x, y + h - th, w, th, col);
    game.draw.rect(x, y, th, h, col); game.draw.rect(x + w - th, y, th, h, col);
  }

  // ---- 重なりの判定 ----
  function orient(ax, ay, bx, by, cx, cy) { var v = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax); return v > 0 ? 1 : v < 0 ? -1 : 0; }
  function crosses(a, b) {
    return orient(a.x1, a.y1, a.x2, a.y2, b.x1, b.y1) !== orient(a.x1, a.y1, a.x2, a.y2, b.x2, b.y2) &&
      orient(b.x1, b.y1, b.x2, b.y2, a.x1, a.y1) !== orient(b.x1, b.y1, b.x2, b.y2, a.x2, a.y2);
  }
  function coverersOf(s, without) {
    var list = [];
    for (var i = 0; i < sticks.length; i++) {
      var o = sticks[i];
      if (o.gone || o === without || o.z <= s.z) continue;
      if (crosses(s, o)) list.push(o);
    }
    return list;
  }
  function isFree(s) { return !s.gone && coverersOf(s, null).length === 0; }
  // s を取ったら新たにむき出しになるひご
  function exposedBy(s) {
    var res = [];
    for (var i = 0; i < sticks.length; i++) {
      var o = sticks[i];
      if (o.gone || o === s || isFree(o)) continue;
      if (coverersOf(o, s).length === 0) res.push(o);
    }
    return res;
  }
  function sumVal(list) { var n = 0; for (var i = 0; i < list.length; i++) n += list[i].v; return n; }
  function freeList() { var r = []; for (var i = 0; i < sticks.length; i++) if (isFree(sticks[i])) r.push(sticks[i]); return r; }
  function remaining() { var n = 0; for (var i = 0; i < sticks.length; i++) if (!sticks[i].gone) n++; return n; }

  function setupPile(k) {
    pileIdx = k; sticks = [];
    var cfg = PILES[k];
    for (var i = 0; i < cfg.sticks.length; i++) {
      var a = cfg.sticks[i];
      sticks.push({ x1: a[0], y1: a[1], x2: a[2], y2: a[3], v: a[4], z: i, gone: false, flash: 0, shake: 0 });
    }
    myPile = 0; granPile = 0; armed = null; flying = null; granPick = null; hintT = 0; hintList = [];
    startTurn(cfg.first);
  }

  function startTurn(who) {
    turn = who;
    if (who === 'me') { turnT = TURN_T; }
    else { granPick = granChoose(); granT = 0.6; game.audio.tone('E4', 0.06, { wave: 'square', volume: 0.06 }); }
  }

  // 祖母: 見えている中で一番高いひご。2つ目の山からは、孫にむき出しになる点を引いて考える
  function granChoose() {
    var fl = freeList(), best = null, bestS = -1e9, smart = PILES[pileIdx].smart;
    for (var i = 0; i < fl.length; i++) {
      var s = fl[i], sc = s.v * 10 - sumVal(exposedBy(s)) * 10 * smart - s.z * 0.01;
      if (sc > bestS) { bestS = sc; best = s; }
    }
    return best;
  }

  function initGame() {
    myPts = 0; granPts = 0; pilesWon = 0; score = 0; finalScore = 0; goodPicks = 0; badPicks = 0;
    timeLeft = TIME_LIMIT; readyT = 0.8; stopT = 0; stopKind = ''; fin = false; cleared = false; postT = 0;
    joyT = 0; sadT = 0; granJoyT = 0; warnT = 0; playT = 0; pileT = 0; myTray = []; granTray = [];
    setupPile(0);
  }

  function segDist(s, x, y) {
    var vx = s.x2 - s.x1, vy = s.y2 - s.y1, l2 = vx * vx + vy * vy;
    var u = Math.max(0, Math.min(1, ((x - s.x1) * vx + (y - s.y1) * vy) / l2));
    return Math.hypot(x - (s.x1 + vx * u), y - (s.y1 + vy * u));
  }
  function stickAt(x, y) {
    var best = null, bd = 50;
    for (var i = sticks.length - 1; i >= 0; i--) {
      var s = sticks[i];
      if (s.gone) continue;
      var d = segDist(s, x, y);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  // ひごを取る(本番もデモも同じ処理)
  function take(s, who) {
    var exp = exposedBy(s);
    s.gone = true; armed = null;
    flying = { s: s, who: who, t: 0 };
    var cx = (s.x1 + s.x2) / 2, cy = (s.y1 + s.y2) / 2;
    if (who === 'me') {
      myPts += s.v; myPile += s.v; myTray.push(s.v);
      var risk = sumVal(exp);
      var hi = 0; for (var i = 0; i < exp.length; i++) if (exp[i].v > hi) hi = exp[i].v;
      if (hi > s.v) {
        badPicks++; sadT = 0.8;
        for (var k = 0; k < exp.length; k++) exp[k].flash = 0.8;
        game.feedback.bad(cx, cy, { text: 'MISS', color: V.red, size: 56 });
      } else {
        if (risk === 0) goodPicks++;
        var pts = s.v * 100 + (risk === 0 ? 50 : 0);
        score += pts; joyT = 0.5;
        game.feedback.good(cx, cy, { text: risk === 0 ? 'NICE' : 'GOOD', color: VAL_COL[s.v], size: 56 });
        game.fx.popup('+' + pts, cx, cy - 90, { color: V.gold, size: 40 });
      }
      game.audio.play(s.v >= 5 ? 'se_coin' : 'se_tap', 0.35);
    } else {
      granPts += s.v; granPile += s.v; granTray.push(s.v);
      if (s.v >= 5) { granJoyT = 0.8; game.audio.play('se_bad', 0.3); }
      else game.audio.tone('C5', 0.06, { wave: 'square', volume: 0.06 });
    }
  }

  function afterTake() {
    flying = null;
    if (remaining() === 0) {
      pileT = 0.9;
      var won = myPile > granPile;
      if (won) pilesWon++;
      if (mode === S.PLAYING) {
        game.fx.popup(myPile + ' - ' + granPile, W / 2, H * 0.47, { color: won ? V.gold : V.red, size: 90 });
        if (won) { game.audio.play('se_milestone', 0.45); game.fx.popup('NICE', W / 2, H * 0.4, { color: V.cyan, size: 70 }); }
        else game.audio.tone('D3', 0.2, { wave: 'square', volume: 0.08 });
      }
      return;
    }
    startTurn(turn === 'me' ? 'gran' : 'me');
  }

  function stepTurns(dt) {
    for (var i = 0; i < sticks.length; i++) { if (sticks[i].flash > 0) sticks[i].flash -= dt; if (sticks[i].shake > 0) sticks[i].shake -= dt; }
    if (joyT > 0) joyT -= dt;
    if (sadT > 0) sadT -= dt;
    if (granJoyT > 0) granJoyT -= dt;
    if (hintT > 0) hintT -= dt;
    if (flying) { flying.t += dt; if (flying.t >= 0.3) afterTake(); return; }
    if (pileT > 0) return;
    if (turn === 'gran' && granPick) {
      granT -= dt;
      if (granT <= 0.45 && granT + dt > 0.45) game.audio.tone('A4', 0.05, { wave: 'square', volume: 0.06 });
      if (granT <= 0) take(granPick, 'gran');
    }
  }

  function autoPick() {
    var fl = freeList(), low = null;
    for (var i = 0; i < fl.length; i++) if (!low || fl[i].v < low.v) low = fl[i];
    game.audio.tone('D3', 0.12, { wave: 'square', volume: 0.08 });
    if (low) take(low, 'me');
  }

  function finishGame() {
    var win = myPts > granPts;
    if (win) { stopT = 0.45; stopKind = 'win'; game.audio.play('se_powerup', 0.4); }
    else { stopT = 0.5; stopKind = 'lose'; game.fx.flash('#ffffff', 0.15); game.audio.tone('C3', 0.3, { wave: 'sawtooth', volume: 0.1, slide: -60 }); }
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = score + (win ? (myPts - granPts) * 100 + pilesWon * 200 : 0);
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 6; i++) game.fx.burst(140 + i * 160, H * 0.5 + (i % 2) * 150, { color: i % 2 ? V.gold : V.cyan, count: 18, speed: 520 });
      game.fx.flash(V.white, 0.2);
    } else sadT = 3;
  }

  function myTurn() { return mode === S.PLAYING && !fin && stopT <= 0 && readyT <= 0 && pileT <= 0 && !flying && turn === 'me'; }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (!myTurn()) { if (mode === S.PLAYING) game.audio.play('se_tap', 0.05); return; }
    var s = stickAt(x, y);
    if (s && isFree(s)) { armed = s; game.audio.tone(300 + s.v * 120, 0.05, { wave: 'square', volume: 0.07 }); }
    else if (s) {
      // 上に乗っているひごを見せる(取れない理由)
      s.shake = 0.3; hintList = coverersOf(s, null); hintT = 0.6;
      game.audio.tone('C3', 0.08, { wave: 'square', volume: 0.07 });
    } else game.audio.play('se_tap', 0.06);
  });
  game.onMove(function(x, y) {
    if (!armed) return;
    if (!myTurn() || segDist(armed, x, y) > 110) { armed = null; game.audio.tone('G3', 0.04, { wave: 'triangle', volume: 0.05 }); }
  });
  game.onRelease(function(x, y) {
    if (!armed) return;
    if (myTurn() && segDist(armed, x, y) <= 110) take(armed, 'me');
    else { armed = null; game.audio.tone('G3', 0.04, { wave: 'triangle', volume: 0.05 }); }
  });
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function room(t) {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.5, STYLE.bg[1]], [1, STYLE.bg[0]]]);
    // こたつ布団(市松ディザ)
    for (var y = TY0 - 60; y < TY1 + 60; y += 30) for (var x = TX0 - 60; x < TX1 + 60; x += 30) {
      var inside = x >= TX0 - 10 && x < TX1 + 10 && y >= TY0 - 10 && y < TY1 + 10;
      if (inside) continue;
      game.draw.rect(x, y, 30, 30, ((x + y) / 30) % 2 === 0 ? '#aa0000' : '#550000');
    }
    // 天板(木目は細線)
    game.draw.rect(TX0, TY0, TX1 - TX0, TY1 - TY0, V.wood);
    for (var g = 0; g < 14; g++) game.draw.line(TX0, TY0 + 30 + g * 58, TX1, TY0 + 34 + g * 58, V.woodDk, 2);
    frameBox(TX0, TY0, TX1 - TX0, TY1 - TY0, V.white, 4);
    // みかん(飾り)
    game.draw.circle(TX1 - 60, TY0 + 60, 34, '#ffaa00');
    game.draw.circle(TX1 - 70, TY0 + 34, 8, V.green);
  }

  function drawStick(s, t, lift, col, alpha) {
    var sh = s.shake > 0 ? Math.sin(t * 60) * 6 : 0;
    var x1 = s.x1 + sh, y1 = s.y1 - lift, x2 = s.x2 + sh, y2 = s.y2 - lift;
    if (lift > 0) game.draw.line(s.x1 + 10, s.y1 + 10, s.x2 + 10, s.y2 + 10, V.black, 18);
    game.draw.line(x1, y1, x2, y2, V.black, 22);
    game.draw.line(x1, y1, x2, y2, col, 14);
    if (alpha < 1) game.draw.line(x1, y1, x2, y2, V.woodDk, 6);
    // 点数の目(1/2/3/5個)
    var n = s.v, mx = (x1 + x2) / 2, my = (y1 + y2) / 2, ux = (x2 - x1), uy = (y2 - y1), l = Math.hypot(ux, uy);
    ux /= l; uy /= l;
    for (var k = 0; k < n; k++) { var o = (k - (n - 1) / 2) * 22; game.draw.rect(mx + ux * o - 5, my + uy * o - 5, 10, 10, V.black); }
  }

  function drawSticks(t) {
    var preview = armed ? exposedBy(armed) : [];
    for (var i = 0; i < sticks.length; i++) {
      var s = sticks[i];
      if (s.gone) continue;
      var free = isFree(s);
      var col = VAL_COL[s.v];
      var red = (s.flash > 0 || preview.indexOf(s) >= 0) && Math.floor(t * 12) % 2 === 0;
      var hint = hintT > 0 && hintList.indexOf(s) >= 0 && Math.floor(t * 12) % 2 === 0;
      var gp = turn === 'gran' && granPick === s && !flying && granT < 0.45 && Math.floor(t * 14) % 2 === 0;
      if (red) col = V.red;
      if (gp || hint) col = V.mag;
      var lift = armed === s ? 14 : 0;
      drawStick(s, t, lift, col, free ? 1 : 0.5);
      if (free && turn === 'me' && !flying && pileT <= 0 && !fin && armed !== s) {
        var p = 0.4 + Math.sin(t * 8 + i) * 0.3;
        game.draw.circle(s.x1, s.y1, 14, V.white, p); game.draw.circle(s.x2, s.y2, 14, V.white, p);
      }
    }
    if (flying) {
      var f = flying, u = Math.min(1, f.t / 0.3), s2 = f.s;
      var tx = W - 200, ty = f.who === 'me' ? H * 0.82 : H * 0.2;
      var cx = (s2.x1 + s2.x2) / 2, cy = (s2.y1 + s2.y2) / 2, k = 1 - u * 0.7;
      var nx = cx + (tx - cx) * u, ny = cy + (ty - cy) * u - Math.sin(u * Math.PI) * 120;
      var hx = (s2.x2 - s2.x1) / 2 * k, hy = (s2.y2 - s2.y1) / 2 * k;
      game.draw.line(nx - hx, ny - hy, nx + hx, ny + hy, V.black, 20);
      game.draw.line(nx - hx, ny - hy, nx + hx, ny + hy, VAL_COL[s2.v], 12);
      if (f.who === 'gran') game.draw.sprite(GRAN_HAND, { s: '#ffaa88' }, nx, ny - 30, 14, { anchor: 'center' });
    }
    // 祖母の手が狙うひごへ伸びる(予告)
    if (turn === 'gran' && granPick && !flying && pileT <= 0) {
      var gx = (granPick.x1 + granPick.x2) / 2, gy = (granPick.y1 + granPick.y2) / 2, r = Math.max(0, Math.min(1, (0.6 - granT) / 0.4));
      var hx2 = 300 + (gx - 300) * r, hy2 = H * 0.22 + (gy - H * 0.22) * r;
      game.draw.sprite(GRAN_HAND, { s: '#ffaa88' }, hx2, hy2, 14, { anchor: 'center' });
    }
  }

  function tray(list, y) {
    for (var i = 0; i < list.length; i++) {
      var x = 420 + (i % 12) * 46, yy = y + Math.floor(i / 12) * 26;
      game.draw.rect(x, yy, 36, 14, VAL_COL[list[i]]);
    }
  }

  function drawPlayers(t) {
    var gTurn = turn === 'gran' && !fin && pileT <= 0, mTurn = turn === 'me' && !fin && pileT <= 0;
    var bl = Math.floor(t * 4) % 2 === 0;
    // 祖母の枠
    game.draw.rect(60, H * 0.125, W - 120, 270, V.black, 0.7);
    frameBox(60, H * 0.125, W - 120, 270, gTurn && bl ? V.mag : V.gray, 4);
    var gf = granJoyT > 0 || (fin && !cleared) ? GRAN_JOY : (Math.floor(t * 1.6) % 2 ? GRAN_A : GRAN_B);
    game.draw.sprite(gf, GRAN_PAL, 190, H * 0.125 + 135, 16, { anchor: 'center' });
    out('' + granPts, 360, H * 0.125 + 110, 64, V.mag);
    tray(granTray, H * 0.125 + 190);
    // 自分の枠
    var my0 = H * 0.75;
    game.draw.rect(60, my0, W - 120, 270, V.black, 0.7);
    frameBox(60, my0, W - 120, 270, mTurn && bl ? V.cyan : V.gray, 4);
    var mf = sadT > 0 || (fin && !cleared) ? GIRL_SAD : (joyT > 0 || (fin && cleared)) ? GIRL_JOY : (Math.floor(t * 2) % 2 ? GIRL_A : GIRL_B);
    var hop = fin && cleared ? -Math.abs(Math.sin(t * 12)) * 24 : 0;
    game.draw.sprite(mf, GIRL_PAL, 190, my0 + 135 + hop, 16, { anchor: 'center' });
    out('' + myPts, 360, my0 + 110, 64, V.cyan);
    tray(myTray, my0 + 190);
    // 持ち時間の帯
    if (mTurn && mode === S.PLAYING && !flying && readyT <= 0) {
      var r = Math.max(0, turnT / TURN_T);
      game.draw.rect(60, my0 + 284, W - 120, 22, V.gray);
      game.draw.rect(60, my0 + 284, (W - 120) * r, 22, r < 0.3 && bl ? V.red : V.cyan);
    }
  }

  function drawHud(t) {
    var low = timeLeft < 5 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(70, 30, W - 140, 20, V.gray);
    game.draw.rect(70, 30, (W - 140) * Math.max(0, timeLeft / TIME_LIMIT), 20, low ? V.red : V.white);
    for (var p = 0; p < PILES.length; p++) frameBox(80 + p * 70, 80, 50, 50, p < pileIdx ? V.gold : p === pileIdx ? V.white : V.gray, 4);
    out(myPts + ' - ' + granPts, W / 2, 130, 56, V.white);
    out('' + score, W - 180, 130, 36, V.gold);
  }

  function drawScene(t) {
    room(t);
    drawSticks(t);
    drawPlayers(t);
    for (var sl = 0; sl < H; sl += 8) game.draw.rect(0, sl, W, 2, V.black, 0.2);
  }

  // ---- ATTRACT: 本物の exposedBy()/take() と祖母の手番で1山目を実演。青は押すと金がむき出しになると赤く光る→やめて緑を取る ----
  var demo = { t: 0, x: W / 2, y: H * 0.86, press: false, step: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.6;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; demo.step = 0; }
    stepTurns(dt);
    var S0 = sticks[0], S1 = sticks[1], S2 = sticks[2], tx = W / 2, ty = H * 0.86;
    demo.press = false;
    var mid = function(s) { return { x: (s.x1 + s.x2) / 2 + 30, y: (s.y1 + s.y2) / 2 + 20 }; };
    if (cyc < 0.6) { var m1 = mid(S1); tx = m1.x; ty = m1.y; }
    else if (cyc < 1.6) { if (demo.step === 0) { demo.step = 1; armed = S1; } var m2 = mid(S1); tx = m2.x; ty = m2.y; demo.press = true; }
    else if (cyc < 2.2) { if (demo.step === 1) { demo.step = 2; armed = null; } var m3 = mid(S2); tx = m3.x; ty = m3.y; }
    else if (cyc < 2.5) { var m4 = mid(S2); tx = m4.x; ty = m4.y; demo.press = true; if (demo.step === 2) { demo.step = 3; armed = S2; } }
    else if (demo.step === 3) { demo.step = 4; take(S2, 'me'); }
    if (demo.step >= 4 && turn === 'me' && !flying && !S0.gone && isFree(S0)) {
      var m5 = mid(S0); tx = m5.x; ty = m5.y;
      if (demo.step === 4) { demo.step = 5; demo.wait = 0.5; }
      demo.wait -= dt; demo.press = demo.wait < 0.15;
      if (demo.wait <= 0 && demo.step === 5) { demo.step = 6; take(S0, 'me'); }
    }
    demo.x += (tx - demo.x) * Math.min(1, dt * 8);
    demo.y += (ty - demo.y) * Math.min(1, dt * 8);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 13 });
      out(GAME_TITLE, W / 2, H * 0.06 + Math.sin(t * 2) * 4, 92, V.gold);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.1, 36, V.cyan);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.975, 46, V.gold);
      else out('TAP TO START', W / 2, H * 0.975, 40, V.white);
      return;
    }

    if (mode === S.RESULT) {
      stepTurns(dt);
      drawScene(t);
      game.draw.rect(90, H * 0.33, W - 180, 480, V.black, 0.9);
      frameBox(90, H * 0.33, W - 180, 480, cleared ? V.gold : V.red, 6);
      out(cleared ? 'CLEAR' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.38, 96, cleared ? V.gold : V.red);
      out('SCORE ' + finalScore, W / 2, H * 0.44, 60, V.white);
      out(myPts + ' - ' + granPts + '   ' + pilesWon + ' / ' + PILES.length, W / 2, H * 0.49, 44, V.cyan);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.54, 56, V.gold);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.54, 42, V.gold);
      if (!cleared) out('あと' + (granPts - myPts + 1) + '点!', W / 2, H * 0.3, 64, V.red);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.975, 40, V.white);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { me: myPts, gran: granPts, pilesWon: pilesWon, safePicks: goodPicks, badPicks: badPicks };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) {
        if (stopKind === 'win') ending(true);
        else { game.feedback.bad(W / 2, H * 0.2, { text: stopKind === 'time' ? 'TIME UP' : 'MISS', color: V.red, size: 62 }); ending(false); }
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      timeLeft -= dt; playT += dt;
      stepTurns(dt);
      if (pileT > 0) {
        pileT -= dt;
        if (pileT <= 0) {
          if (pileIdx >= PILES.length - 1) finishGame();
          else { setupPile(pileIdx + 1); game.audio.play('se_jump', 0.3); }
        }
      } else if (turn === 'me' && !flying) {
        turnT -= dt;
        if (turnT < 0.8 && Math.floor(turnT * 4) !== Math.floor((turnT + dt) * 4)) game.audio.tone('B5', 0.04, { wave: 'square', volume: 0.06 });
        if (turnT <= 0) { armed = null; autoPick(); }
      }
      if (timeLeft < 5) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.06, { wave: 'square', volume: 0.07 }); }
      }
      if (timeLeft <= 0 && stopT <= 0) { timeLeft = 0; armed = null; stopT = 0.45; stopKind = 'time'; game.audio.tone('C4', 0.3, { wave: 'square', volume: 0.1, slide: -120 }); }
    }

    drawScene(t);
    // 決着の hit-stop: 祖母の取り分(負け)/自分の取り分(勝ち)を白く強調
    if (stopT > 0 && (stopKind === 'lose' || stopKind === 'win')) {
      var yb = stopKind === 'win' ? H * 0.75 : H * 0.125;
      if (Math.floor(t * 16) % 2 === 0) frameBox(50, yb - 10, W - 100, 290, V.white, 10);
    }
    // 開始直後のお手本: 安全な1本に手
    if (!fin && readyT <= 0 && pileIdx === 0 && playT < 1.6 && turn === 'me' && !armed) {
      var sx = sticks[2];
      if (!sx.gone) game.draw.hand((sx.x1 + sx.x2) / 2 + 30, (sx.y1 + sx.y2) / 2 + 20, { press: false, scale: 11, alpha: 0.5 });
    }
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 120, V.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['G4', 0.5], ['A4', 0.5], ['C5', 1], ['A4', 0.5], ['G4', 0.5], ['E4', 1],
      ['D4', 0.5], ['E4', 0.5], ['G4', 1], ['A4', 0.5], ['C5', 0.5], ['A4', 1],
      ['G4', 0.5], ['E4', 0.5], ['D4', 0.5], ['E4', 0.5], ['G4', 2],
    ], { tempo: 104, wave: 'triangle', volume: 0.06, loop: true, bass: [['C3', 2], ['A2', 2], ['G2', 2], ['C3', 2], ['E2', 2], ['G2', 2]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);

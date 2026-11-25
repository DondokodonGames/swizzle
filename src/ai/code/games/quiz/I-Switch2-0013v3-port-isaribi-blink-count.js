// I-Switch2-0013v3-port-isaribi-blink-count.js
// 漁港の漁火かぞえ — 沖を漂いながら点滅する漁火の点滅回数を数え、港に浮かぶ番号のブイから同じ数を押して答える
// 操作: 漁船が沖を横切る間は見て数えるだけ(黄色い漁火だけを数える。灯台の白い光は数えない。船が停泊船の陰に入っても、水面の映りが点滅する)。船が去ると下の海に番号のブイが4つ浮かんで漂うので、数えた数のブイをタップする(社内メモ。画面には出さない)
// 終わり: 3回言い当てればCLEAR。数え違い/答えそびれでカモメの羽を1枚失い、2枚失うか15秒切れでGAME OVER
// @mechanic: counting
// @theme: night_port_isaribi_blink_count
// 世界観: 夏の夜の漁港で、漁協の見張りの老人が防波堤から、沖を漂う漁船の漁火が合図に点滅した回数を数え、港に浮かべた番号ブイを指して仲間に知らせる
// 残るもの: 正誤(CLEAR/GAME OVER) + 言い当てた回数・PERFECT数・スコア
// スタイル: 80s NEON

(function(game) {
  var STYLE = { bg: ['#02020e', '#0a0a2e', '#14083a'], main: ['#00f0ff', '#ff2ad4', '#ffe62a'], accent: ['#ffffff', '#ff4060'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  var GAME_TITLE = 'ISARIBI COUNT';
  var TIME_LIMIT = 15;
  var NEEDED = 3;
  var LIVES = 2;
  var SEA_Y = H * 0.36;
  var BOAT_Y = H * 0.42;
  var ANS_WIN = 2.6;
  var SHIP = { x0: W * 0.52, x1: W * 0.76 };

  var BOAT_A = ['....y....', '....k....', '...kkk...', 'kkkkkkkkk', '.kcccccck', '..kkkkkk.'];
  var BOAT_B = ['....y....', '....k....', '...kkk...', 'kkkkkkkkk', 'kcccccck.', '.kkkkkk..'];
  var MAN_A = ['..mmmm..', '.mwwwwm.', '.kssssk.', '.ksesek.', '.kssssk.', '..kssk..', '.cccccc.', 'cccccccc', 'sc.cc.cy', '..cccc.y', '..k..k..', '.kk..kk.'];
  var MAN_B = ['..mmmm..', '.mwwwwm.', '.kssssk.', '.ksesek.', '.kssmsk.', '..kssk.y', '.ccccccy', 'cccccccs', 'sc.cc...', '..cccc..', '..k..k..', '.kk..kk.'];
  var MAN_PAL = { m: '#ff2ad4', w: '#ffffff', k: '#00f0ff', s: '#ffc890', e: '#02020e', c: '#2a3aff', y: '#ffe62a' };
  var FEATHER = ['..w', '.ww', 'www', 'ww.', 'w..'];

  var STATE = { ATTRACT: 'ATTRACT', PLAYING: 'PLAYING', RESULT: 'RESULT' };
  var state = STATE.ATTRACT;

  var rd = null, round = 0, phase = 'watch', pT = 0, ansT = 0, buoys = [], pick = -1;
  var correct = 0, lives = LIVES, perfects = 0, score = 0, streak = 0;
  var left = TIME_LIMIT, count = 0, holdT = 0, fadeT = 0, celebT = 0, cheer = 0;
  var on = false, cleared = false, bestAtStart = 0, replayN = 0;

  function write(str, x, y, size, color) {
    game.draw.text(str, x, y, { size: size + 4, color: color, bold: true, align: 'center' });
    game.draw.text(str, x + 3, y + 3, { size: size, color: '#000000', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: size, color: '#ffffff', bold: true, align: 'center' });
  }

  // 1回分の出題: 点滅の時刻・灯台の閃き(まぎらわし)・停泊船の陰
  function makeRound(r) {
    var n = r === 0 ? 3 + Math.floor(game.random(0, 2)) : r === 1 ? 4 + Math.floor(game.random(0, 3)) : 5 + Math.floor(game.random(0, 3));
    var blinks = [], t = 0.35;
    for (var i = 0; i < n; i++) {
      blinks.push(t);
      var dbl = r >= 1 && game.random(0, 1) < 0.35;
      t += dbl ? 0.21 : (r === 0 ? 0.42 : game.random(0.27, 0.42));
    }
    var dur = t + 0.35;
    var beams = [];
    if (r >= 1) beams.push(game.random(0.5, dur - 0.5));
    if (r >= 2) beams.push(game.random(0.4, dur - 0.4));
    return { n: n, blinks: blinks, dur: dur, beams: beams, hide: r >= 2, dir: r % 2 === 0 ? 1 : -1 };
  }

  function boatX(t) {
    var k = Math.min(1, t / rd.dur);
    return rd.dir > 0 ? 100 + k * (W - 200) : W - 100 - k * (W - 200);
  }
  function lit(t) {
    for (var i = 0; i < rd.blinks.length; i++) if (t >= rd.blinks[i] && t < rd.blinks[i] + 0.12) return true;
    return false;
  }
  function hidden(x) { return rd.hide && x > SHIP.x0 && x < SHIP.x1; }

  function makeBuoys() {
    var opts = [rd.n];
    var cand = [rd.n - 1, rd.n + 1, rd.n + 2, rd.n - 2];
    for (var i = 0; i < cand.length && opts.length < 4; i++) if (cand[i] >= 1 && opts.indexOf(cand[i]) < 0) opts.push(cand[i]);
    for (var j = opts.length - 1; j > 0; j--) { var k = Math.min(j, Math.floor(game.random(0, j + 1))); var tmp = opts[j]; opts[j] = opts[k]; opts[k] = tmp; }
    buoys = [];
    for (var b = 0; b < opts.length; b++) buoys.push({ v: opts[b], x: 170 + b * 247, y: H * 0.8, ph: game.random(0, 6), dx: game.random(-1, 1) < 0 ? -1 : 1 });
  }

  function startRound() {
    rd = makeRound(round);
    phase = 'watch'; pT = 0; pick = -1; replayN = 0;
  }

  // 実ロジック: 1フレーム分。戻り値 'late' | 'next' | null
  function stepPort(dt, live) {
    pT += dt;
    for (var i = 0; i < buoys.length; i++) {
      var b = buoys[i];
      b.ph += dt * 2.2;
      b.x += b.dx * 34 * dt;
      if (b.x < 130 || b.x > W - 130) b.dx = -b.dx;
    }
    if (phase === 'watch') {
      var was = lit(pT - dt), now = lit(pT);
      if (now && !was) game.audio.tone('G5', 0.06, { wave: 'square', volume: live ? 0.07 : 0.03 });
      if (pT >= rd.dur) { phase = 'answer'; pT = 0; ansT = ANS_WIN; makeBuoys(); game.audio.tone('C5', 0.08, { wave: 'triangle', volume: live ? 0.1 : 0.04, slide: 300 }); }
    } else if (phase === 'answer') {
      ansT -= dt;
      if (ansT <= 0) { judge(-1, live); }
    } else if (phase === 'stop') {
      if (pT >= 0.5) { phase = 'reveal'; pT = 0; replayN = 0; }
    } else if (phase === 'reveal') {
      // 正解発表: 実際の回数をもう一度点滅させて数を出す
      var step = Math.min(0.16, 0.9 / rd.n);
      var k = Math.floor(pT / step);
      if (k > replayN && replayN < rd.n) {
        replayN++;
        game.fx.popup(String(replayN), W / 2, BOAT_Y - 120, { color: STYLE.main[2], size: 54 });
        game.audio.tone(400 + replayN * 60, 0.05, { wave: 'square', volume: live ? 0.07 : 0.03 });
      }
      if (pT >= step * rd.n + 0.35) return 'next';
    }
    return null;
  }

  function judge(i, live) {
    pick = i;
    var ok = i >= 0 && buoys[i].v === rd.n;
    if (ok) {
      var quick = ansT > ANS_WIN - 0.9;
      phase = 'reveal'; pT = 0; replayN = 0; cheer = 0.8;
      game.feedback.good(buoys[i].x, buoys[i].y - 90, { text: quick ? 'PERFECT' : 'GOOD', color: quick ? STYLE.main[2] : STYLE.main[0], count: quick ? 18 : 10, volume: live ? 1 : 0.4 });
      if (!live) return;
      correct++; streak++;
      if (quick) perfects++;
      score += 200 + Math.round(ansT * 60) + (quick ? 100 : 0) + streak * 30;
      if (correct === 2) { game.fx.popup('2 / ' + NEEDED, W / 2, H * 0.3, { color: STYLE.main[1], size: 60 }); game.audio.play('se_milestone', 0.5); }
      return;
    }
    phase = 'stop'; pT = 0; streak = 0;
    var bx = i >= 0 ? buoys[i].x : W / 2, by = i >= 0 ? buoys[i].y - 90 : H * 0.72;
    game.feedback.bad(bx, by, { text: 'MISS', shake: live ? 12 : 4, volume: live ? 1 : 0.4 });
    if (!live) return;
    lives--;
  }

  function afterReveal(live) {
    if (!live) return;
    if (correct >= NEEDED) { cleared = true; finishRun(); return; }
    if (lives <= 0) { cleared = false; finishRun(); return; }
    round = Math.min(2, correct); startRound();
  }

  function finishRun() {
    on = false; holdT = 0.55; celebT = 0;
    game.audio.stopBgm();
    if (cleared) { score += Math.round(left * 40) + lives * 80; game.audio.play('se_success', 0.5); }
    else game.audio.play('se_failure', 0.45);
  }

  function startBgm() {
    game.audio.melody([
      ['E4', 1], ['G4', 0.5], ['A4', 0.5], ['B4', 1], ['A4', 0.5], ['G4', 0.5],
      ['E4', 1], ['D4', 0.5], ['E4', 0.5], ['B3', 2],
    ], { tempo: 92, wave: 'triangle', volume: 0.05, loop: true, bass: [['E2', 2], ['C3', 2], ['D3', 2], ['B2', 2]] });
  }

  function initGame() {
    round = 0; correct = 0; lives = LIVES; perfects = 0; score = 0; streak = 0;
    left = TIME_LIMIT; count = 0.8; holdT = 0; fadeT = 0; celebT = 0; cheer = 0;
    on = false; cleared = false; buoys = [];
    bestAtStart = game.best || 0;
    startRound();
  }

  function buoyAt(x, y) {
    for (var i = 0; i < buoys.length; i++) {
      var b = buoys[i];
      if (Math.hypot(x - b.x, y - (b.y + Math.sin(b.ph) * 12)) < 105) return i;
    }
    return -1;
  }

  game.onTap(function(x, y) {
    if (state === STATE.ATTRACT) { game.audio.play('se_coin', 0.5); state = STATE.PLAYING; initGame(); startBgm(); return; }
    if (state === STATE.RESULT) { state = STATE.ATTRACT; initGame(); demo.t = 0; return; }
    if (!on || phase !== 'answer') { game.audio.play('se_tap', 0.08); game.fx.burst(x, y, { color: STYLE.main[0], count: 3, speed: 70 }); return; }
    var i = buoyAt(x, y);
    if (i < 0) { game.audio.tone('D4', 0.04, { wave: 'square', volume: 0.05 }); return; }
    game.audio.play('se_tap', 0.3);
    judge(i, true);
  });

  // ── ATTRACT ゴースト実演: 本番の出題で数え、正しいブイを押す。2周に1回は1つ多いブイを押して外す ──
  var demo = { t: 0, gx: W * 0.85, gy: H * 0.9, press: 0, n: 0, done: false };
  function demoRound() {
    round = demo.n % 3; startRound(); buoys = []; demo.done = false; demo.n++;
  }
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt) { demo.n = 0; demoRound(); }
    if (demo.press > 0) demo.press -= dt;
    var ev = stepPort(dt, false);
    if (ev === 'next') { demoRound(); return; }
    if (phase === 'answer') {
      var wrongCycle = demo.n % 2 === 0, want = 0;
      for (var i = 0; i < buoys.length; i++) {
        if (wrongCycle ? buoys[i].v === rd.n + 1 : buoys[i].v === rd.n) want = i;
      }
      var b = buoys[want];
      demo.gx += (b.x - demo.gx) * Math.min(1, dt * 6);
      demo.gy += (b.y + 20 - demo.gy) * Math.min(1, dt * 6);
      if (!demo.done && ANS_WIN - ansT > 0.9) { demo.done = true; demo.press = 0.25; judge(want, false); }
    } else if (phase === 'watch') {
      demo.gx += (W * 0.85 - demo.gx) * Math.min(1, dt * 3);
      demo.gy += (H * 0.9 - demo.gy) * Math.min(1, dt * 3);
    }
  }

  // ── 描画 ──
  function drawNight() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.34, STYLE.bg[2]], [0.36, STYLE.bg[1]], [1, '#000008']]);
    for (var s = 0; s < 30; s++) game.draw.rect((s * 337) % W, 250 + (s * 97) % 380, 4, 4, '#ffffff', 0.3 + 0.3 * Math.sin(t * 3 + s));
    game.draw.circle(W * 0.82, 330, 50, '#fff6c0', 0.85);
    game.draw.circle(W * 0.82, 330, 80, '#fff6c0', 0.12);
    // 水平線のネオン
    game.draw.line(0, SEA_Y, W, SEA_Y, STYLE.main[0], 4);
    game.draw.line(0, SEA_Y + 8, W, SEA_Y + 8, STYLE.main[0], 1);
    for (var w = 0; w < 9; w++) {
      var wy = SEA_Y + 60 + w * 60;
      var off = (t * 40 + w * 70) % 120;
      for (var x = -120 + off; x < W; x += 240) game.draw.line(x, wy, x + 80, wy, STYLE.main[0], 2);
    }
    // 灯台(左の岬)
    game.draw.rect(40, SEA_Y - 170, 40, 170, '#ffffff', 0.85);
    game.draw.rect(34, SEA_Y - 196, 52, 30, STYLE.main[1]);
  }

  function drawShip() {
    // 停泊船のシルエット(この陰に入ると漁火は見えない)
    if (!rd || !rd.hide) return;
    game.draw.rect(SHIP.x0, BOAT_Y - 110, SHIP.x1 - SHIP.x0, 150, '#06061a');
    game.draw.rect(SHIP.x0 + 40, BOAT_Y - 200, 90, 90, '#06061a');
    game.draw.line(SHIP.x0, BOAT_Y + 40, SHIP.x1, BOAT_Y + 40, STYLE.main[1], 4);
    game.draw.line(SHIP.x0, BOAT_Y - 110, SHIP.x1, BOAT_Y - 110, STYLE.main[1], 2);
    game.draw.line(SHIP.x0 + 85, BOAT_Y - 200, SHIP.x0 + 85, BOAT_Y - 260, STYLE.main[1], 3);
  }

  function drawBoat(t, hl) {
    if (!rd) return;
    var x = boatX(t), bob = Math.sin(game.time.elapsed * 3) * 8;
    var on1 = phase === 'watch' ? lit(t) : (phase === 'reveal' && Math.floor(pT * 12) % 2 === 0);
    var hid = hidden(x) && phase === 'watch';
    // 水面の映り(陰に入っても見える)
    if (on1) {
      for (var r = 0; r < 5; r++) game.draw.rect(x - 14 + Math.sin(game.time.elapsed * 9 + r) * 10, BOAT_Y + 70 + r * 26, 28, 12, STYLE.main[2], 0.7 - r * 0.12);
    }
    if (hid) return;
    if (on1) {
      game.draw.circle(x, BOAT_Y - 54 + bob, 90, STYLE.main[2], 0.18);
      game.draw.circle(x, BOAT_Y - 54 + bob, 46, STYLE.main[2], 0.45);
    }
    game.draw.sprite(Math.floor(game.time.elapsed * 3) % 2 ? BOAT_A : BOAT_B, { y: on1 ? STYLE.main[2] : '#5a5a2a', k: STYLE.main[0], c: '#2a3aff' }, x, BOAT_Y + bob, 14, { anchor: 'center', flipX: rd.dir < 0 });
    if (hl) game.draw.circle(x, BOAT_Y - 54 + bob, 100, '#ffffff', 0.3);
  }

  function drawBeams(t) {
    if (!rd || phase !== 'watch') return;
    for (var i = 0; i < rd.beams.length; i++) {
      var d = t - rd.beams[i];
      if (d > -0.25 && d < 0.25) {
        var k = 1 - Math.abs(d) / 0.25;
        var bx = 60 + (d + 0.25) * 2 * (W - 120);
        game.draw.line(60, SEA_Y - 180, bx, SEA_Y + 40, '#ffffff', 10);
        game.draw.circle(bx, SEA_Y + 40, 50, '#ffffff', 0.5 * k);
      }
    }
  }

  function drawBuoys(hl) {
    var t = game.time.elapsed;
    for (var i = 0; i < buoys.length; i++) {
      var b = buoys[i];
      var y = b.y + Math.sin(b.ph) * 12;
      var right = b.v === rd.n;
      var big = (hl && right) ? 1.25 : 1;
      if (hl && right) game.draw.circle(b.x, y, 130, '#ffffff', 0.45 + 0.2 * Math.sin(t * 20));
      game.draw.circle(b.x, y + 70, 70, STYLE.main[0], 0.15);
      game.draw.circle(b.x, y, 86 * big, phase === 'answer' ? STYLE.main[1] : '#5a1a5a');
      game.draw.circle(b.x, y, 70 * big, '#14083a');
      if (phase === 'answer') game.draw.circle(b.x, y, 92 * big, '#ffffff', 0.12 + 0.1 * Math.sin(t * 6 + i));
      write(String(b.v), b.x, y + 24, 74, i === pick && !right ? STYLE.accent[1] : STYLE.main[2]);
      if (i === pick && !right && hl) game.draw.circle(b.x, y, 96, STYLE.accent[1], 0.4);
    }
  }

  function drawPier() {
    var t = game.time.elapsed;
    game.draw.rect(0, H * 0.9, W, H * 0.1, '#1a1a3a');
    game.draw.line(0, H * 0.9, W, H * 0.9, STYLE.main[1], 4);
    var man = cheer > 0 || Math.floor(t * 2) % 2 ? MAN_B : MAN_A;
    game.draw.sprite(man, MAN_PAL, W * 0.1, H * 0.86 - (cheer > 0 ? 20 * Math.abs(Math.sin(t * 12)) : 0), 12, { anchor: 'center' });
    if (phase === 'answer') {
      var k = Math.max(0, ansT / ANS_WIN);
      for (var i = 0; i < 24; i++) {
        if (i / 24 > k) break;
        var a = -Math.PI / 2 + i / 24 * Math.PI * 2;
        game.draw.circle(W * 0.1 + Math.cos(a) * 110, H * 0.86 + Math.sin(a) * 110, 8, k < 0.3 ? STYLE.accent[1] : STYLE.main[2]);
      }
    }
  }

  function drawHud() {
    write(correct + ' / ' + NEEDED, W / 2, 96, 56, STYLE.main[0]);
    write(String(score), W - 140, 96, 34, STYLE.main[1]);
    for (var i = 0; i < LIVES; i++) game.draw.sprite(FEATHER, { w: '#ffffff' }, 70 + i * 56, 96, 12, { anchor: 'center', alpha: i < lives ? 1 : 0.2 });
    var bw = W - 160;
    var low = left < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 166, bw, 16, '#ffffff', 0.15);
    game.draw.rect(80, 166, bw * Math.max(0, left / TIME_LIMIT), 16, low ? STYLE.accent[1] : STYLE.main[0]);
  }

  function drawAll(hl) {
    drawNight();
    drawBeams(pT);
    drawBoat(phase === 'watch' ? pT : (rd ? rd.dur : 0), false);
    drawShip();
    if (phase !== 'watch') drawBuoys(hl);
    drawPier();
  }

  game.onUpdate(function(dt) {
    if (cheer > 0) cheer -= dt;

    if (state === STATE.ATTRACT) {
      stepDemo(dt);
      drawAll(phase === 'stop' || (phase === 'reveal' && pick >= 0 && buoys[pick] && buoys[pick].v !== rd.n));
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 15 });
      var bob = Math.sin(game.time.elapsed * 2) * 6;
      write(GAME_TITLE, W / 2, H * 0.06 + bob, 70, STYLE.main[1]);
      write('HI-SCORE ' + Math.round(game.best || 0), W / 2, H * 0.105, 30, STYLE.main[0]);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) write('► 100円 投入 ◄', W / 2, H * 0.975, 40, STYLE.main[2]);
      else write('INSERT COIN', W / 2, H * 0.975, 32, STYLE.main[0]);
      return;
    }

    if (state === STATE.RESULT) {
      celebT -= dt;
      if (cleared && celebT <= 0) {
        celebT = 0.3; cheer = 0.3;
        game.fx.burst(game.random(W * 0.15, W * 0.85), game.random(H * 0.15, H * 0.34), { color: game.random(0, 1) < 0.5 ? STYLE.main[2] : STYLE.main[1], count: 16, speed: 400 });
      }
      drawAll(!cleared);
      write(cleared ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 80, cleared ? STYLE.main[2] : STYLE.accent[1]);
      write(correct + ' / ' + NEEDED + '   SCORE ' + score, W / 2, H * 0.105, 36, STYLE.main[0]);
      if (!cleared) write('あと' + (NEEDED - correct) + '回!', W / 2, H * 0.3, 48, STYLE.main[1]);
      else write('PERFECT ' + perfects, W / 2, H * 0.3, 44, STYLE.main[2]);
      if (score > bestAtStart && score > 0) write('NEW RECORD', W / 2, H * 0.14, 34, Math.floor(game.time.elapsed * 4) % 2 ? STYLE.main[2] : STYLE.main[1]);
      else write('BEST ' + Math.round(game.best || 0), W / 2, H * 0.14, 30, STYLE.main[0]);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) write('TAP TO CONTINUE', W / 2, H * 0.975, 32, STYLE.main[0]);
      return;
    }

    // ── PLAYING ──
    if (fadeT > 0) {
      fadeT -= dt;
      if (fadeT <= 0) {
        state = STATE.RESULT;
        var stats = { correct: correct, perfect: perfects, lives: lives };
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
      if (phase === 'watch' || phase === 'answer') left -= dt;
      var ev = stepPort(dt, true);
      if (ev === 'next') afterReveal(true);
      if (on && left <= 0) {
        left = 0; cleared = false;
        if (phase === 'answer') pick = -1;
        phase = 'stop'; pT = 0;
        game.feedback.bad(W / 2, H * 0.6, { text: 'TIME UP', shake: 10 });
        finishRun();
      }
    }

    var wrongShow = phase === 'stop' || (phase === 'reveal' && pick >= 0 && buoys[pick] && buoys[pick].v !== rd.n);
    drawAll(wrongShow && !cleared);
    drawHud();
    if (count > 0) write(count > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.6, 92, STYLE.main[1]);
  });

  game.onStart(function() {
    startBgm();
    state = STATE.ATTRACT;
    initGame();
  });
})(game);

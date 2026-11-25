// J-GC4-0016-sky-lantern-bellows.js
// 天灯ふいご — 谷風の中を昇る紙の天灯を、ふいごをこすり続けて火を保ち、消さず焦がさず飛ばし切る
// 操作: 下のふいごを左右に素早くこすると火が強まる。こすらないと弱まり、突風(横の風すじで予告)は一気に火を削る
// 終わり: 火を保ったまま時間いっぱい飛べばCLEAR。火が消える/強すぎて紙が焦げ落ちるとGAME OVER
// @mechanic: rub
// @theme: sky_lantern_night_flight
// 世界観: 山里の灯籠祭りの夜、見習い灯守りが自分の天灯の小さな火をふいごで守り、谷風に消されていく他の灯を横目に一番高くまで昇らせる
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達高度と火を適温に保てた割合のスコア
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 限定5色、大きいドット、差し色は炎のオレンジだけ
  var STYLE = { bg: ['#141432', '#2c2a5a', '#4a4480'], main: ['#e8e0c8', '#8a82b8'], accent: ['#ff8a1e', '#ff3c5a'] };
  var C = {
    sky0: '#141432', sky1: '#2c2a5a', sky2: '#4a4480', paper: '#e8e0c8', mount: '#221f48',
    flame: '#ff8a1e', flameHot: '#ff3c5a', ink: '#e8e0c8', dim: '#8a82b8', good: '#7ee0a8', bad: '#ff3c5a', wind: '#b8b0e8'
  };

  var GAME_TITLE = 'SKY LANTERN';
  var TIME_LIMIT = 13;
  var LAMP_X = W / 2;
  var LAMP_Y = Math.round(H * 0.42);
  var BELLOWS_Y = Math.round(H * 0.86);
  var HUD_Y = Math.round(H * 0.06);
  var HOT = 0.86, COOL = 0.3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var LAMP = [
    '..pppppp..', '.pppppppp.', 'pppppppppp', 'ppllllllpp', 'ppllllllpp', 'ppllllllpp',
    'ppllllllpp', '.pppppppp.', '..pppppp..', '...kkkk...'
  ];
  var BELLOWS = [
    ['hh........hh', 'hwwwwwwwwwwh', 'hwbbbbbbbbwh', 'hwbbbbbbbbwh', 'hwwwwwwwwwwh', 'hh...nn...hh'],
    ['hh........hh', 'hwwwwwwwwwwh', 'hwwwwwwwwwwh', 'hh...nn...hh']
  ];
  var BELLOWS_PAL = { h: '#8a5a2a', w: '#c8a070', b: '#6a4020', n: '#4a4480' };
  var STAR = ['.s.', 'sss', '.s.'];

  var flame, alt, hotT, sweet, timeLeft, gust, gustWarn, gustSide, gustT, nextGust;
  var rub, strokes, rivals, sparks;
  var ready, hitStop, finished, done, endWait, ok, failCause, milestone, flashT;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function initGame() {
    flame = 0.6; alt = 0; hotT = 0; sweet = 0; timeLeft = TIME_LIMIT;
    gust = 0; gustWarn = 0; gustSide = 1; gustT = 0; nextGust = 2.2;
    rub = { lastX: null, dir: 0, travel: 0, squash: 0 }; strokes = 0; sparks = [];
    rivals = [];
    for (var i = 0; i < 5; i++) rivals.push({ x: 120 + i * 210, y: H * 0.3 + (i % 2) * 180, lit: 1, ph: i });
    ready = 0.8; hitStop = 0; finished = false; done = false; endWait = 0; ok = false; failCause = ''; milestone = 0; flashT = 0;
  }

  // こすり検出: 往復の折り返しごとに1ストローク
  function rubAt(x, isDemo) {
    if (rub.lastX === null) { rub.lastX = x; return; }
    var dx = x - rub.lastX;
    rub.lastX = x;
    if (Math.abs(dx) < 1) return;
    var d = dx > 0 ? 1 : -1;
    if (d !== rub.dir) {
      if (rub.travel > 50) {
        strokes++;
        flame = Math.min(1.05, flame + 0.085);
        rub.squash = 0.15;
        sparks.push({ x: LAMP_X + game.random(-30, 30), y: LAMP_Y + 40, vy: -game.random(80, 200), t: 0.6 });
        game.audio.tone(flame > HOT ? 'A5' : 'E5', 0.05, { wave: 'triangle', volume: 0.06 });
        if (!isDemo && strokes % 6 === 0) game.fx.burst(W / 2, BELLOWS_Y - 80, { color: C.flame, count: 4, speed: 120 });
      }
      rub.dir = d; rub.travel = 0;
    }
    rub.travel += Math.abs(dx);
  }

  function stepWorld(dt, isDemo) {
    // 突風: 予告(風すじ)→ 本番
    nextGust -= dt;
    if (nextGust <= 0 && gustWarn <= 0 && gust <= 0) {
      gustWarn = 0.75; gustSide = Math.random() < 0.5 ? -1 : 1;
      if (!isDemo) game.audio.play('se_tap', 0.25);
    }
    if (gustWarn > 0) {
      gustWarn -= dt;
      if (gustWarn <= 0) { gust = 1.0; nextGust = game.random(1.6, 2.6) - Math.min(0.8, alt / 1500); }
    }
    if (gust > 0) {
      gust -= dt;
      if (gust <= 0 && !isDemo && flame >= COOL && flame <= HOT) {
        game.feedback.good(LAMP_X, LAMP_Y - 180, { text: 'NICE', color: C.good, count: 8 });
      }
    }
    var drain = 0.13 + (gust > 0 ? 0.42 : 0);
    flame -= drain * dt;
    if (rub.squash > 0) rub.squash -= dt;
    if (flame > HOT) hotT += dt; else hotT = Math.max(0, hotT - dt * 2);
    if (flame >= COOL && flame <= HOT) sweet += dt;
    alt += (40 + flame * 90) * dt;
    for (var i = 0; i < rivals.length; i++) {
      var r = rivals[i];
      if (gust > 0 && r.lit > 0 && Math.random() < dt * 0.5) r.lit = 0.99;
      if (r.lit < 1 && r.lit > 0) r.lit -= dt;
    }
    for (var s = sparks.length - 1; s >= 0; s--) {
      sparks[s].y += sparks[s].vy * dt; sparks[s].t -= dt;
      if (sparks[s].t <= 0) sparks.splice(s, 1);
    }
    if (flashT > 0) flashT -= dt;
    if (!isDemo) {
      if (alt > 500 && milestone < 1) {
        milestone = 1;
        game.audio.play('se_milestone', 0.45);
        game.fx.popup('500m', LAMP_X, LAMP_Y - 200, { color: C.flame, size: 64 });
      }
      if (flame <= 0) { flame = 0; failCause = 'out'; loseGame(); }
      else if (hotT > 0.7) { failCause = 'burn'; loseGame(); }
    } else {
      if (flame < 0.05) flame = 0.5;
      if (hotT > 0.6) { hotT = 0; flame = 0.7; }
    }
  }

  function winGame() {
    finished = true; ok = true; hitStop = 0.4; flashT = 0.4;
    game.feedback.good(LAMP_X, LAMP_Y, { text: 'CLEAR', color: C.flame, count: 30, flashColor: '#e8e0c8' });
    game.audio.play('se_success', 0.55);
    finish();
  }

  function loseGame() {
    if (finished) return;
    finished = true; ok = false; hitStop = 0.5; flashT = 0.5;
    game.feedback.bad(LAMP_X, LAMP_Y, { text: failCause === 'burn' ? 'MISS' : 'GAME OVER', color: C.bad, shake: 12 });
    game.audio.play('se_failure', 0.5);
    finish();
  }

  function finish() {
    if (done) return;
    done = true; endWait = 1.2;
    game.audio.stopBgm();
  }

  function scoreNow() { return Math.round(alt) + Math.round(sweet * 40); }

  function drawScene() {
    var t = game.time.elapsed;
    var scroll = alt * 0.6;
    game.draw.gradient(0, H, [[0, C.sky0], [0.55, C.sky1], [1, C.sky2]]);
    game.draw.rect(0, 0, W, H, C.flame, 0.03 + 0.02 * Math.sin(t * 1.3));
    for (var st = 0; st < 14; st++) {
      var sy = ((st * 137 + scroll * 0.3) % (H * 0.8));
      game.draw.sprite(STAR, { s: C.ink }, (st * 211) % W, sy, 6, { anchor: 'center', alpha: 0.4 + 0.3 * Math.sin(t * 2 + st) });
    }
    // 山並み(昇るほど下へ)
    var my = H * 0.7 + Math.min(600, scroll * 0.5);
    for (var m = 0; m < 7; m++) {
      for (var k = 0; k < 6; k++) game.draw.rect(m * 180 - 60 + k * 16, my - (m % 2 ? 160 : 240) + k * 40, 220 - k * 32, 42, C.mount);
    }
    // 他の天灯(演出のみ。突風で消えていく)
    for (var i = 0; i < rivals.length; i++) {
      var r = rivals[i];
      var ry = r.y + Math.sin(t * 1.2 + r.ph) * 20 + (r.lit <= 0 ? 200 : 0) + Math.min(400, scroll * 0.15);
      game.draw.sprite(LAMP, { p: '#5a547a', l: r.lit > 0 ? C.flame : '#2c2a5a', k: '#2c2a5a' }, r.x + Math.cos(t + r.ph) * 14, ry, 5, { anchor: 'center', alpha: r.lit > 0 ? 0.7 : 0.3 });
    }
    // 風すじ(予告は点滅、本番は流れる)
    if (gustWarn > 0 || gust > 0) {
      var a = gust > 0 ? 0.8 : (Math.floor(t * 12) % 2 ? 0.7 : 0.2);
      for (var wl = 0; wl < 7; wl++) {
        var wy = LAMP_Y - 240 + wl * 80;
        var wx = gust > 0 ? ((t * 1400 * gustSide + wl * 170) % 1300 + 1300) % 1300 - 110 : (gustSide > 0 ? 40 : W - 280);
        game.draw.line(wx, wy, wx + 240, wy, C.wind, 8);
      }
    }
    // 天灯(突風で横に煽られる)
    var sway = Math.sin(t * 1.8) * 16 + (gust > 0 ? gustSide * 60 : 0);
    var lx = LAMP_X + sway, ly = LAMP_Y + Math.sin(t * 2.3) * 12;
    var hot = flame > HOT;
    var paper = hot && Math.floor(t * 14) % 2 ? '#ffb0a0' : C.paper;
    var glow = Math.max(0.05, flame);
    game.draw.circle(lx, ly + 20, 160 * glow + 40, C.flame, 0.15 + glow * 0.15);
    game.draw.sprite(LAMP, { p: paper, l: hot ? C.flameHot : (flame > COOL ? C.flame : '#8a5a2a'), k: '#4a2a1a' }, lx, ly, 26, { anchor: 'center' });
    var fh = 20 + flame * 70;
    game.draw.circle(lx, ly + 110 - fh * 0.3, 16 + flame * 22, hot ? C.flameHot : C.flame);
    game.draw.circle(lx, ly + 120 - fh * 0.2, 8 + flame * 10, '#ffe0a0');
    for (var s = 0; s < sparks.length; s++) game.draw.circle(sparks[s].x + sway, sparks[s].y, 7, C.flame, sparks[s].t);
    if (flashT > 0) game.draw.circle(lx, ly, 260, '#ffffff', flashT);
    // 火の強さゲージ(左)
    var gx = 60, gy = Math.round(H * 0.3), gh = Math.round(H * 0.34);
    game.draw.rect(gx - 6, gy - 6, 56, gh + 12, '#000000', 0.6);
    game.draw.rect(gx, gy + gh * (1 - HOT), 44, gh * (HOT - COOL), C.good, 0.35);
    game.draw.rect(gx, gy + gh * (1 - Math.min(1, flame)), 44, gh * Math.min(1, flame), hot ? C.flameHot : C.flame);
    // ふいご(親指ゾーン)
    var sq = rub.squash > 0 ? 1 : 0;
    game.draw.rect(0, BELLOWS_Y - 150, W, H - BELLOWS_Y + 150, '#0c0c24', 0.55);
    game.draw.sprite(BELLOWS[sq], BELLOWS_PAL, W / 2, BELLOWS_Y + Math.sin(t * 3) * 4, 30, { anchor: 'center' });
  }

  function drawHud() {
    txt(Math.round(alt) + 'm', 60, HUD_Y + 20, 60, C.ink, 'left');
    txt('SCORE ' + scoreNow(), W - 60, HUD_Y + 20, 38, C.flame, 'right');
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 172, W - 120, 22, '#000000', 0.6);
    game.draw.rect(60, 172, (W - 120) * (1 - Math.max(0, timeLeft / TIME_LIMIT)), 22, low ? C.good : C.dim);
  }

  // ---- ATTRACT デモ: 手がふいごをこすり、火の強さを見て加減する ----
  var demo = { t: 0, gx: W / 2, gy: BELLOWS_Y, press: false, ph: 0, greedy: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.5;
    if (cyc < dt || demo.t <= dt) {
      if (demo.t <= dt) initGame();
      demo.greedy = !demo.greedy; // 1周おきにこすり過ぎて紙が赤く焦げかける例
    }
    stepWorld(dt, true);
    var want = demo.greedy && cyc > 1.2 && cyc < 2.6 ? 1.0 : (gustWarn > 0 || gust > 0 ? 0.78 : 0.6);
    var rubbing = flame < want;
    if (rubbing) {
      demo.ph += dt * 16;
      demo.gx = W / 2 + Math.sin(demo.ph) * 190;
      rubAt(demo.gx, true);
    } else {
      rub.lastX = null;
    }
    demo.press = rubbing; demo.gy = BELLOWS_Y;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || finished) return;
    rub.lastX = x; rub.travel = 0;
    game.audio.play('se_tap', 0.2);
    game.fx.burst(x, y, { color: C.flame, count: 3, speed: 80 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || finished || ready > 0) return;
    var before = strokes;
    rubAt(x, false);
    if (strokes > before && flame > HOT) game.fx.burst(LAMP_X, LAMP_Y + 100, { color: C.flameHot, count: 2, speed: 90 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    rub.lastX = null;
    if (!finished && ready <= 0) game.audio.play('se_tap', 0.08);
  });

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (flame === undefined) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.12, 90, C.flame);
      txt('BEST ' + (game.best || 0), W / 2, H * 0.165, 40, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.97, 44, C.flame);
      else txt('INSERT COIN', W / 2, H * 0.97, 34, C.ink);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.13, W, H * 0.2, '#000000', 0.55);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.19, 100, ok ? C.good : C.bad);
      txt('SCORE ' + scoreNow(), W / 2, H * 0.245, 52, C.flame);
      txt(Math.round(alt) + 'm', W / 2, H * 0.29, 44, C.ink);
      if (!ok) txt('あと' + Math.max(1, Math.ceil(timeLeft)) + '秒!', W / 2, H * 0.36, 48, C.bad);
      else if (scoreNow() > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.36, 50, C.flame);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.36, 40, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.97, 40, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (hitStop > 0) hitStop -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { altitude: Math.round(alt), sweetSec: Math.round(sweet * 10) / 10, strokes: strokes };
        if (ok) game.end.success(scoreNow(), stats);
        else game.end.failure(stats);
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else if (!finished) {
      timeLeft -= dt;
      stepWorld(dt, false);
      if (timeLeft <= 0 && !finished) { timeLeft = 0; winGame(); }
    }

    drawScene();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.62, 110, C.flame);
  });

  game.onStart(function() {
    game.audio.melody([
      ['E4', 1], ['G4', 0.5], ['A4', 0.5], ['B4', 1], ['D5', 1],
      ['B4', 0.5], ['A4', 0.5], ['G4', 1], ['E4', 1], ['D4', 1], ['E4', 1]
    ], { tempo: 110, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

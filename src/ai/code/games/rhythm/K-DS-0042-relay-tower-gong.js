// K-DS-0042-relay-tower-gong.js
// 中継鐘打ち — 遠くの塔から届く音の拍に合わせて、吊り鐘へバチを振り下ろす動作を繰り返す
// 操作: 光る拍マーカーが鐘に重なった瞬間に画面をタップしてバチを振り下ろす
// 終わり: 規定打数(8打)を拍に合わせて打ち切れば成功。3回外せば失敗
// @mechanic: rhythm
// @theme: relay_tower_gong_strike
// 世界観: 山あいに並ぶ中継塔。鐘突き番が、遠くの塔から届く音の拍を聞き取り、自分の吊り鐘をバチで打って次の塔へ合図を送り継ぐ
// 残るもの: 正誤(送信完了/中継途絶) + 打てた拍数と最大連続数
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 少色数(4〜5色)、粗いドット感、視認性重視の太い輪郭
  var C = {
    bg: '#1a2438', bg2: '#0c1220', mountain: '#2a3a50', mountainFar: '#182234',
    bell: '#8a7a5a', bellDark: '#5a4e38', mallet: '#c89858',
    good: '#5aff7a', bad: '#ff4444', gold: '#ffd400', white: '#e8f0ff', ink: '#080c14',
  };

  var GAME_TITLE = 'TOWER GONG';
  var TOTAL = 8;
  var MAX_MISS = 3;
  var CX = W * 0.5, BELL_Y = H * 0.44;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var hitCount, miss, best_combo, combo, done, endWait, finished;
  var ready, hitStop, shake;
  var beatT, beatDur, beatPhase; // beatPhase: 0..1, hit window around 0.5

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var KEEPER = ['..##..', '.####.', '..##..', '.####.', '#.##.#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, H * 0.55, W, H * 0.1, C.mountainFar, 0.6);
    game.draw.rect(0, H * 0.62, W, H * 0.1, C.mountain, 0.7);
    // 遠くの中継塔の灯
    for (var i = 0; i < 3; i++) {
      var tx = W * (0.15 + i * 0.35);
      var glow = (Math.sin(game.time.elapsed * 2 + i) + 1) * 0.5;
      game.draw.circle(tx, H * 0.6, 10 + glow * 6, C.gold, 0.25 + glow * 0.2);
    }
  }

  function nextBeatDur() {
    return Math.max(0.62, 0.95 - hitCount * 0.03);
  }

  function initGame() {
    hitCount = 0; miss = 0; best_combo = 0; combo = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    beatT = 0; beatDur = nextBeatDur(); beatPhase = 0;
  }

  function strike() {
    if (ready > 0 || done || hitStop > 0 || finished) return;
    game.audio.play('se_tap', 0.05);
    var inWindow = beatPhase > 0.38 && beatPhase < 0.62;
    if (inWindow) {
      hitCount++; combo++; best_combo = Math.max(best_combo, combo);
      hitStop = 0.08;
      game.feedback.good(CX, BELL_Y, { text: 'GOOD', color: C.good });
      game.fx.burst(CX, BELL_Y, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_good', 0.35);
      if (hitCount === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, BELL_Y - 200, { color: C.gold, size: 40 });
      beatT = 0; beatDur = nextBeatDur();
      if (hitCount >= TOTAL) { ok = true; finished = true; finish(); }
    } else {
      miss++; combo = 0;
      hitStop = 0.28;
      game.feedback.bad(CX, BELL_Y, { text: 'MISS' });
      shake = 0.22;
      game.audio.play('se_bad', 0.4);
      beatT = 0; beatDur = nextBeatDur();
      if (miss >= MAX_MISS) { ok = false; finished = true; finish(); }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) strike();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawBell(swing) {
    game.draw.rect(CX - 6, BELL_Y - 170, 12, 60, C.bellDark);
    game.draw.circle(CX + swing, BELL_Y, 100, C.bellDark);
    game.draw.circle(CX + swing, BELL_Y - 10, 84, C.bell);
    var blink = beatPhase > 0.38 && beatPhase < 0.62 && Math.floor(game.time.elapsed * 14) % 2 === 0;
    if (blink) game.draw.circle(CX, BELL_Y, 130, C.gold, 0.3);
  }

  function drawMallet(down) {
    var my = down ? BELL_Y - 40 : BELL_Y - 220;
    game.draw.line(CX + 140, BELL_Y - 260, CX + 60, my, C.mallet, 16);
    game.draw.circle(CX + 60, my, 22, C.mallet);
  }

  var demo = { t: 0, gx: CX + 60, gy: BELL_Y - 220, press: false, bt: 0, bd: 0.85, sw: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) { demo.bt = 0; demo.hits = 0; }
    demo.bt += dt;
    var p = demo.bt / demo.bd;
    beatPhase = Math.min(1, p);
    if (p > 0.38 && p < 0.62 && !demo.struck) {
      demo.struck = true;
      demo.press = true;
      demo.sw = 18 * (demo.hits % 2 === 0 ? 1 : -1);
      game.audio.play('se_good', 0.2);
      demo.hits = (demo.hits || 0) + 1;
    }
    if (p >= 1) { demo.bt = 0; demo.struck = false; demo.press = false; demo.sw *= 0.3; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawMallet(demo.press);
      drawBell(demo.sw);
      game.draw.sprite(KEEPER, { '#': C.white }, CX + 220, BELL_Y + 40, 20, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 22 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBell(0);
      game.draw.sprite(KEEPER, { '#': C.white }, CX + 220, BELL_Y + 40, 20, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(hitCount + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - hitCount) + '打!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    var swing = 0;
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hitCount, { hits: hitCount, combo: best_combo });
        else game.end.failure({ hits: hitCount, miss: miss });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      beatT += dt;
      beatPhase = Math.min(1, beatT / beatDur);
      if (beatPhase >= 1) {
        // 打ち逃し
        miss++; combo = 0;
        hitStop = 0.28;
        game.feedback.bad(CX, BELL_Y, { text: 'MISS' });
        shake = 0.22;
        game.audio.play('se_bad', 0.4);
        beatT = 0; beatDur = nextBeatDur();
        if (miss >= MAX_MISS) { ok = false; finished = true; finish(); }
      }
      swing = Math.sin(beatPhase * Math.PI) * 10;
    }
    if (shake > 0) shake -= dt;

    bg();
    drawMallet(beatPhase > 0.32 && beatPhase < 0.68);
    drawBell(finished ? 0 : swing);
    game.draw.sprite(KEEPER, { '#': C.white }, CX + 220, BELL_Y + 40, 20, { anchor: 'center' });

    txt(hitCount + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (hitCount / TOTAL), 16, C.gold);
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W - 70 - mi * 44, 200, 14, mi < miss ? C.bad : '#ffffff33');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.72, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D3', 0.5], ['A3', 0.5], ['D4', 1]], { tempo: 100, wave: 'triangle', volume: 0.07, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

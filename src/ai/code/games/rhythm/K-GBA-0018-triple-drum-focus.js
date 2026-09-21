// K-GBA-0018-triple-drum-focus.js
// トリプルドラム・フォーカス — 3つの異なるリズムが同時に鳴る中、光っている一つだけの拍に合わせて叩く
// 操作: 常時鳴り続ける3つの太鼓のうち、光っている一つの拍だけを聞き分けてその瞬間にタップする
// 終わり: 規定回数(6回)正しい太鼓の拍を捉えれば成功。1回でも外せば失敗
// @mechanic: rhythm
// @theme: triple_drum_shrine
// 世界観: 山あいの祠に並ぶ3つの太鼓。それぞれ違う速さで鳴り続ける中、灯が示す一つだけの拍を聞き分けて打つ修行
// 残るもの: 正誤(CLEAR/GAME OVER) + 捉えた拍の回数
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 多色 + 光、パララックス、細かいアニメ
  var C = {
    sky1: '#1a2a4a', sky2: '#0d1730', ground: '#2c1f14', groundEdge: '#1a1209',
    drum: '#8a4a28', drumEdge: '#5a2f18', drumLit: '#ffb84d',
    good: '#5affa0', bad: '#ff5a5a', gold: '#ffe27a', white: '#fff7e8', ink: '#0a0806',
  };

  var GAME_TITLE = 'TRIPLE DRUM';
  var NEEDED = 6;
  var DRUMS = [
    { x: W * 0.24, y: H * 0.46, interval: 0.7, note: 'C4' },
    { x: W * 0.5, y: H * 0.4, interval: 0.55, note: 'E4' },
    { x: W * 0.76, y: H * 0.46, interval: 0.9, note: 'G4' },
  ];
  var DRUM_SPRITE = ['.####.', '######', '######', '######', '.####.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.sky1], [0.7, C.sky2], [1, C.ground]]);
    for (var i = 0; i < 5; i++) game.draw.circle(W * (i / 5), H * 0.62, 90, '#00000022');
    game.draw.rect(0, H * 0.75, W, H * 0.25, C.ground);
    game.draw.rect(0, H * 0.75, W, 8, C.groundEdge);
  }

  var hits, targ, roundT, targetBeatT, tapT, resolved, beatCd, pulse;
  var done, endWait, finished;
  var ready, hitStop, shake, flashState, wrongFlash;

  function newRound() {
    var t;
    do { t = Math.floor(game.random(0, 3)); } while (t === targ && DRUMS.length > 1);
    targ = t; roundT = 0; targetBeatT = beatCd[targ]; tapT = null; resolved = false;
  }

  function initGame() {
    hits = 0; targ = -1; beatCd = [DRUMS[0].interval, DRUMS[1].interval, DRUMS[2].interval];
    pulse = [0, 0, 0];
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; flashState = 0; wrongFlash = -1;
    newRound();
  }

  function onTapPlay() {
    if (state !== S.PLAYING || finished || done || ready > 0 || hitStop > 0 || resolved) return;
    game.audio.play('se_tap', 0.08);
    tapT = roundT;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    onTapPlay();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function tickDrums(dt) {
    for (var i = 0; i < DRUMS.length; i++) {
      if (pulse[i] > 0) pulse[i] -= dt * 3;
      beatCd[i] -= dt;
      if (beatCd[i] <= 0) {
        beatCd[i] += DRUMS[i].interval;
        pulse[i] = 1;
        game.audio.tone(DRUMS[i].note, 0.12, { wave: 'square', volume: i === targ ? 0.14 : 0.05 });
      }
    }
  }

  function stepGame(dt) {
    if (finished) { return; }
    roundT += dt;
    tickDrums(dt);
    if (!resolved && roundT >= targetBeatT + 0.3) {
      resolved = true;
      var success = tapT !== null && Math.abs(tapT - targetBeatT) <= 0.26;
      var d = DRUMS[targ];
      if (success) {
        hits++; hitStop = 0.08; flashState = 1;
        game.feedback.good(d.x, d.y, { text: 'HIT', color: C.good });
        game.fx.burst(d.x, d.y, { color: C.drumLit, count: 14, speed: 260 });
        game.audio.play('se_good', 0.3);
        if (hits === 3) game.fx.popup(hits + ' / ' + NEEDED, W / 2, H * 0.24, { color: C.gold, size: 40 });
        if (hits >= NEEDED) { ok = true; finished = true; finish(); return; }
        newRound();
      } else {
        flashState = -1; wrongFlash = targ; hitStop = 0.35;
        game.feedback.bad(d.x, d.y, { text: 'MISS' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
  }

  function drawScene() {
    for (var i = 0; i < DRUMS.length; i++) {
      var d = DRUMS[i];
      var isTarget = i === targ && !resolved;
      if (isTarget) {
        var blink = Math.floor(game.time.elapsed * 8) % 2 === 0;
        if (blink) game.draw.circle(d.x, d.y, 110, C.gold, 0.3);
      }
      if (wrongFlash === i) game.draw.circle(d.x, d.y, 120, C.bad, 0.3);
      var glow = pulse[i] > 0 ? pulse[i] : 0;
      if (glow > 0.02) game.draw.circle(d.x, d.y, 80 + glow * 30, C.drumLit, glow * 0.4);
      game.draw.sprite(DRUM_SPRITE, { '#': glow > 0.2 ? C.drumLit : C.drum }, d.x, d.y, 18, { anchor: 'center' });
    }
  }

  var demo = { t: 0, gx: DRUMS[1].x, gy: H * 0.86, press: false, dTarg: 1, dRT: 0, dBeat: 0.55, dTapped: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.0;
    if (cyc < dt || demo.t <= dt) { demo.dRT = 0; demo.dBeat = 0.5; demo.dTapped = false; targ = demo.dTarg; wrongFlash = -1; }
    demo.dRT += dt;
    roundT = demo.dRT; targetBeatT = demo.dBeat;
    tickDrums(dt);
    if (!demo.dTapped && demo.dRT >= demo.dBeat - 0.05) {
      demo.dTapped = true; demo.gx = DRUMS[demo.dTarg].x; demo.gy = DRUMS[demo.dTarg].y; demo.press = true;
      pulse[demo.dTarg] = 1;
    } else if (demo.dRT >= demo.dBeat + 0.18) {
      demo.press = false; demo.gx = DRUMS[demo.dTarg].x; demo.gy = H * 0.86;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (beatCd === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.1, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + '/' + NEEDED : '-'), W / 2, H * 0.14, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.1, 50, ok ? C.good : C.bad);
      txt(hits + ' / ' + NEEDED, W / 2, H * 0.16, 32, C.gold);
      if (!ok) txt('あと' + (NEEDED - hits) + '拍!', W / 2, H * 0.21, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, needed: NEEDED });
        else game.end.failure({ hits: hits, needed: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      stepGame(dt);
    }
    if (shake > 0) shake -= dt;
    if (flashState !== 0) flashState *= 0.85;

    bg();
    drawScene();

    txt(hits + ' / ' + NEEDED, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 14, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (hits / NEEDED), 14, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.62, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);

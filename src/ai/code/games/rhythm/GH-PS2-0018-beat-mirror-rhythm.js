// GH-PS2-0018-beat-mirror-rhythm.js
// ビートミラー — お手本が示した1拍前のポーズを、今の拍で追いかけて真似る
// 操作: 上の手本が拍ごとに示す方向を、1拍遅れて自分のパネル(下)で同じ方向にタップする
// 終わり: 12拍分の的中率が残る。的中率60%以上でCLEAR、未満でGAME OVER
// @mechanic: rhythm
// @theme: mirror_dance_lag
// 世界観: 影絵の鏡合わせダンス。手本は拍ごとに次のポーズへ移るが、自分は必ず1拍遅れてそれを真似る
// 残るもの: 精度%(SCORE)。BESTと的中拍数が残る
// スタイル: 90s HANDHELD COLOR

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 90s HANDHELD COLOR: 低彩度・少色。小画面前提で太く単純な形。密度を上げない
  var C = {
    bg1: '#7a8a72', bg2: '#5a6852', screen: '#8c9a80', frame: '#3a4234',
    up: '#c9843a', down: '#3a7a8a', left: '#a8823a', right: '#5a8a5a',
    ghost: '#c8d4c0', good: '#5a9a5a', bad: '#a84a3a', gold: '#d4b040', white: '#eef2e6', ink: '#242a1e',
  };
  var DIRS = ['up', 'down', 'left', 'right'];
  var DIR_COL = { up: C.up, down: C.down, left: C.left, right: C.right };
  var DIR_DXY = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  var GAME_TITLE = 'BEAT MIRROR';
  var BEATS = 12;
  var BPM_START = 100, BPM_END = 148;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var finalScore = 0, hitCount = 0;

  var beatIdx, clock, nextBeat, beatDur, curPose, prevPose, hitThisBeat, done, endWait;
  var ready, hitStop, shake, flashT, fever;

  var MODEL_Y = H * 0.34, MIRROR_Y = H * 0.68, RING = 190;
  var MX = W / 2;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FIG_SPRITE = ['.##.', '####', '.##.', '#.#.'];

  function screenBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(30, H * 0.16, W - 60, H * 0.62, C.frame);
    game.draw.rect(50, H * 0.18, W - 100, H * 0.58, C.screen);
    if (fever > 0) game.draw.rect(50, H * 0.18, W - 100, H * 0.58, C.gold, Math.min(0.18, fever * 0.05));
  }

  function bpmNow() { return BPM_START + (BPM_END - BPM_START) * Math.min(1, beatIdx / BEATS); }

  function panelAt(cx, cy, d, active, ghostMode) {
    var dx = DIR_DXY[d][0], dy = DIR_DXY[d][1];
    var x = cx + dx * RING, y = cy + dy * RING;
    var col = ghostMode ? C.ghost : DIR_COL[d];
    game.draw.circle(x, y, active ? 78 : 60, col, ghostMode ? 0.35 : (active ? 0.95 : 0.4));
  }

  function drawZones(cx, cy, litDir, ghostDir) {
    for (var i = 0; i < DIRS.length; i++) {
      panelAt(cx, cy, DIRS[i], DIRS[i] === litDir, false);
    }
    if (ghostDir) panelAt(cx, cy, ghostDir, true, true);
    game.draw.sprite(FIG_SPRITE, { '#': C.ink }, cx, cy, 12, { anchor: 'center' });
  }

  function initGame() {
    beatIdx = 0; clock = 0; beatDur = 60 / BPM_START; nextBeat = beatDur;
    curPose = null; prevPose = null; hitThisBeat = true;
    hitCount = 0; done = false; endWait = 0;
    ready = 0.8; hitStop = 0; shake = 0; flashT = 0; fever = 0;
  }

  function newBeat() {
    prevPose = curPose;
    curPose = DIRS[Math.floor(Math.random() * 4)];
    hitThisBeat = prevPose === null; // 最初の拍は判定対象なし
    flashT = 0.4;
  }

  function judgeMiss() {
    if (prevPose === null) return;
    game.feedback.bad(MX, MIRROR_Y, { text: 'MISS' });
    shake = 0.12;
    fever = 0;
  }

  function tapZone(x, y) {
    if (done || ready > 0 || hitThisBeat || prevPose === null) return;
    var dx = x - MX, dy = y - MIRROR_Y;
    var d = Math.hypot(dx, dy);
    if (d < 60 || d > RING + 90) return;
    hitThisBeat = true;
    var ang = Math.atan2(dy, dx);
    var picked = Math.abs(ang) < Math.PI * 0.25 ? 'right' : Math.abs(ang) > Math.PI * 0.75 ? 'left' : ang < 0 ? 'up' : 'down';
    if (picked !== prevPose) {
      game.feedback.bad(MX, MIRROR_Y, { text: 'MISS' });
      shake = 0.1; fever = 0;
      return;
    }
    var toBeat = Math.abs(clock - nextBeat);
    var judge = toBeat < 0.10 ? 'PERFECT' : 'GOOD';
    hitCount++;
    fever = Math.min(6, fever + 1);
    game.feedback.good(MX, MIRROR_Y, { text: judge, color: judge === 'PERFECT' ? C.gold : C.good });
    game.audio.play('se_good', 0.35);
    if (fever >= 4) game.fx.popup('FEVER', MX, MODEL_Y - 220, { color: C.gold, size: 40 });
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
    game.audio.play('se_tap', 0.1);
    tapZone(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    finalScore = Math.round((hitCount / BEATS) * 100);
    game.audio.stopBgm();
    game.audio.play(finalScore >= 60 ? 'se_success' : 'se_failure', 0.4);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: MX, gy: MIRROR_Y, press: false, phase: 'wait', pt: 0.9 };
  function stepDemo(dt) {
    demo.t += dt;
    demo.pt -= dt;
    if (demo.phase === 'wait' && demo.pt <= 0) { newBeat(); demo.phase = 'act'; demo.pt = 0.5; }
    else if (demo.phase === 'act') {
      if (prevPose) {
        var p = { x: MX + DIR_DXY[prevPose][0] * RING, y: MIRROR_Y + DIR_DXY[prevPose][1] * RING };
        demo.gx += (p.x - demo.gx) * Math.min(1, dt * 6);
        demo.gy += (p.y - demo.gy) * Math.min(1, dt * 6);
        demo.press = demo.pt < 0.28 && demo.pt > 0.18;
        if (demo.press) hitCount++;
      }
      if (demo.pt <= 0) { demo.phase = 'wait'; demo.pt = 0.85; demo.press = false; }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (beatIdx === undefined) initGame();
      screenBg();
      stepDemo(dt);
      drawZones(MX, MODEL_Y, curPose, null);
      drawZones(MX, MIRROR_Y, null, prevPose);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.10, 44, C.ink);
      txt('BEST ' + String(game.best) + '%', W / 2, H * 0.14, 26, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 38, C.ink);
        txt('TAP TO START', W / 2, H * 0.92, 28, C.ink);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      screenBg();
      drawZones(MX, MODEL_Y, null, null);
      drawZones(MX, MIRROR_Y, null, null);
      txt(finalScore >= 60 ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 54, finalScore >= 60 ? C.good : C.bad);
      txt(finalScore + '%', W / 2, H * 0.20, 70, C.ink);
      if (finalScore < 60 && finalScore >= 50) txt('あと少し!', W / 2, H * 0.26, 28, C.bad);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + best + '%', W / 2, H * 0.90, 30, C.ink);
      if (finalScore > game.best && game.best > 0) txt('NEW RECORD', W / 2, H * 0.95, 26, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.98, 22, C.ink);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) { state = S.RESULT; game.end.record(finalScore, { hitCount: hitCount, beats: BEATS }); }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { game.audio.play('se_tap'); newBeat(); }
    } else {
      clock += dt;
      if (flashT > 0) flashT -= dt;
      if (clock >= nextBeat) {
        if (!hitThisBeat) judgeMiss();
        beatIdx++;
        if (beatIdx >= BEATS) { finish(); return; }
        beatDur = 60 / bpmNow();
        nextBeat += beatDur;
        newBeat();
        game.audio.tone(curPose === 'up' ? 660 : curPose === 'down' ? 440 : curPose === 'left' ? 520 : 590, 0.06, { wave: 'square', volume: 0.1 });
        if (beatIdx === Math.floor(BEATS / 2)) game.fx.popup(beatIdx + ' / ' + BEATS, MX, H * 0.16, { color: C.gold, size: 40 });
      }
    }
    if (shake > 0) shake -= dt;

    screenBg();
    drawZones(MX, MODEL_Y, curPose, null);
    drawZones(MX, MIRROR_Y, null, prevPose);

    txt(hitCount + ' / ' + BEATS, W / 2, H * 0.09, 30, C.ink);
    game.draw.rect(70, 100, W - 140, 16, C.frame);
    game.draw.rect(70, 100, (W - 140) * (beatIdx / BEATS), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 50, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.25], ['G4', 0.25], ['B4', 0.25], ['G4', 0.25]], { tempo: BPM_START, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);

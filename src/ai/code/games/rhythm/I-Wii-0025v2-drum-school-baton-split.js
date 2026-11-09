// I-Wii-0025v2-drum-school-baton-split.js
// 指揮ごっこドラム教室 — 左右に並ぶ二人の生徒が別々に振る指揮棒に合わせ、左手で小太鼓・右手でシンバルを叩き分ける
// 操作: 画面左半分=小太鼓、右半分=シンバル。それぞれの側の生徒の指揮棒が振り下ろされた瞬間にその側を押す。左の生徒が棒を震わせたら小太鼓を押したまま震えが止むまで保つ(ロール)
// 終わり: 3つの課題フレーズ(計33打)を叩き切ればCLEAR。ミス4回でGAME OVER
// @mechanic: coop_2zone
// @theme: town_drum_school_conductors
// 世界観: 町のドラム教室で、ドラム講師が指揮ごっこをする二人の生徒の左右別々の振り下ろしに合わせ、左手で小太鼓・右手でシンバルを叩き分けて3つの課題フレーズを通す
// 残るもの: 正誤(CLEAR/GAME OVER) + 得点(PERFECT/GOOD数・最大コンボ)
// スタイル: 80s ISO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: 菱形グリッドの床、高さは影の距離で示す。6〜8色
  var STYLE = { bg: ['#3a2c55', '#6b4f7a', '#c98f5a'], main: ['#3f8fd6', '#f2c53c', '#e9d3a8'], accent: ['#ff5d73', '#fff6e0'] };
  var C = {
    wall: STYLE.bg[0], wall2: STYLE.bg[1], floor: STYLE.bg[2], floor2: '#a96f43', grid: '#7a4b2c',
    snare: STYLE.main[0], snareDark: '#245a92', cym: STYLE.main[1], cymDark: '#a8801a', skin: STYLE.main[2],
    hot: STYLE.accent[0], cream: STYLE.accent[1], ink: '#1d1426', good: '#5fe08a',
  };

  var GAME_TITLE = 'BATON DRUMS';
  var LIVES = 4;
  var TIME_LIMIT = 24;
  var PERFECT_W = 0.07, GOOD_W = 0.16, CATCH_W = 0.3;

  // 課題フレーズ: [拍, 側, ロール拍数]。pre=カウントイン拍数、lead=振り上げの予告秒
  var LESSONS = [
    { bpm: 100, pre: 4, beats: 8, lead: 0.7, notes: [[0, 'R'], [1, 'L'], [2, 'R'], [3, 'L'], [4, 'R'], [5, 'L'], [5.5, 'L'], [6, 'R'], [7, 'L']] },
    { bpm: 112, pre: 2, beats: 8, lead: 0.6, notes: [[0, 'L'], [0, 'R'], [1, 'L'], [2, 'L', 1.5], [2.5, 'R'], [3, 'R'], [4, 'R'], [4.5, 'L'], [5, 'R'], [6, 'L'], [6, 'R']] },
    { bpm: 124, pre: 2, beats: 8, lead: 0.5, notes: [[0, 'L'], [0, 'R'], [1, 'R'], [1.5, 'L'], [2, 'L', 2], [2.5, 'R'], [3, 'R'], [3.5, 'R'], [4.5, 'L'], [5, 'R'], [5.5, 'L'], [6, 'L'], [6, 'R']] },
  ];
  var DEMO_LESSON = { bpm: 112, pre: 2, beats: 6, lead: 0.6, notes: [[0, 'R'], [1, 'L'], [2, 'L', 1.5], [2.5, 'R'], [3, 'R'], [4, 'L'], [4, 'R'], [5, 'R', 0, 1]] };
  var BASS = ['C3', 'C3', 'G2', 'A2', 'F2', 'F2', 'G2', 'G2'];

  var PAD = { L: { x: 290, y: Math.round(H * 0.82), rx: 190, ry: 78 }, R: { x: 800, y: Math.round(H * 0.775), rx: 200, ry: 50 } };
  var KID = { L: { x: 300, y: Math.round(H * 0.31) }, R: { x: 780, y: Math.round(H * 0.31) } };
  var TEACH = { x: 540, y: Math.round(H * 0.6) };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var li, cur, notes, lt, lastBeat, lastHalf, lives, score, combo, maxCombo, perfects, goods, misses, judged, totalNotes;
  var readyT, gapT, over, won, stopT, outroT, focus, playT, rollTick, milestoneHit;
  var strike = { L: 0, R: 0 }, mood = { L: 0, R: 0 }, holdL = false, cheer = 0;

  function countNotes() { var n = 0; for (var i = 0; i < LESSONS.length; i++) n += LESSONS[i].notes.length; return n; }

  function buildLesson(L) {
    var spb = 60 / L.bpm;
    cur = { spb: spb, pre: L.pre, end: (L.pre + L.beats) * spb, lead: L.lead };
    notes = [];
    for (var i = 0; i < L.notes.length; i++) {
      var n = L.notes[i];
      notes.push({ t: (L.pre + n[0]) * spb, side: n[1], len: (n[2] || 0) * spb, st: 0, flash: 0, fail: !!n[3] });
    }
    lt = 0; lastBeat = -1; lastHalf = -1;
  }

  function initGame() {
    li = 0; lives = LIVES; score = 0; combo = 0; maxCombo = 0; perfects = 0; goods = 0; misses = 0; judged = 0;
    totalNotes = countNotes();
    readyT = 0.8; gapT = 0; over = false; won = false; stopT = 0; outroT = 0; focus = null; playT = 0; rollTick = 0; milestoneHit = false;
    strike.L = 0; strike.R = 0; mood.L = 0; mood.R = 0; holdL = false; cheer = 0;
    buildLesson(LESSONS[0]);
  }

  // ---- 拍クロック(伴奏はゲーム時計で刻むので判定とずれない) ----
  function tickBeat(audible) {
    var b = Math.floor(lt / cur.spb);
    var hb = Math.floor(lt / (cur.spb / 2));
    if (b !== lastBeat) {
      lastBeat = b;
      if (audible) {
        if (b < cur.pre) game.audio.tone(b === cur.pre - 1 ? 'A5' : 'E5', 0.05, { wave: 'square', volume: 0.08 });
        else {
          var k = (b - cur.pre) % BASS.length;
          game.audio.tone(BASS[k], cur.spb * 0.7, { wave: 'triangle', volume: 0.11 });
          if ((b - cur.pre) % 2 === 0) game.audio.tone(90, 0.1, { wave: 'sine', volume: 0.2, slide: -50 });
        }
      }
    }
    if (hb !== lastHalf) {
      lastHalf = hb;
      if (audible && Math.floor(hb / 2) >= cur.pre) game.audio.tone(3200, 0.015, { wave: 'square', volume: 0.025 });
    }
  }

  // ---- 判定(本番もデモも同じ) ----
  function padOf(side) { return PAD[side]; }

  function judgeHit(n, off, demo) {
    var a = Math.abs(off);
    var p = padOf(n.side);
    var word = a <= PERFECT_W ? 'PERFECT' : 'GOOD';
    combo++; if (combo > maxCombo) maxCombo = combo;
    if (word === 'PERFECT') perfects++; else goods++;
    score += (word === 'PERFECT' ? 100 : 50) + Math.min(combo, 20) * 5;
    n.flash = 1; mood[n.side] = 0.6;
    if (n.len > 0) { n.st = 3; } else { n.st = 1; judged++; }
    game.feedback.good(p.x, p.y - 60, { text: word, color: n.side === 'L' ? C.snare : C.cym, size: word === 'PERFECT' ? 56 : 44, count: 10, volume: 0.5 });
    if (!demo && combo === 10 && !milestoneHit) {
      milestoneHit = true;
      game.fx.popup('x10 COMBO', W / 2, H * 0.47, { color: C.cym, size: 64 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function judgeMiss(n, demo) {
    n.st = 2; n.flash = 1; judged++;
    var p = padOf(n.side);
    combo = 0; misses++; mood[n.side] = -0.9;
    if (demo) { game.feedback.bad(p.x, p.y - 60, { text: 'MISS', shake: 6 }); return; }
    lives--;
    if (lives <= 0) {
      focus = n; over = true; won = false; stopT = 0.5; outroT = 1.3;
      game.feedback.bad(p.x, p.y - 60, { text: 'MISS', shake: 18 });
      game.audio.stopBgm();
      game.audio.play('se_failure', 0.5);
    } else {
      game.feedback.bad(p.x, p.y - 60, { text: 'MISS', shake: 8 });
    }
  }

  function hitSide(side, demo) {
    strike[side] = 0.16;
    if (side === 'L') game.audio.tone(180, 0.07, { wave: 'square', volume: 0.12, slide: -60 });
    else game.audio.tone(1900, 0.18, { wave: 'sawtooth', volume: 0.05, slide: -500 });
    var best = null, bd = 99;
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.side !== side || n.st !== 0) continue;
      var d = lt - n.t;
      if (Math.abs(d) < Math.abs(bd)) { bd = d; best = n; }
    }
    if (!best || Math.abs(bd) > CATCH_W) {
      combo = 0;
      game.fx.burst(PAD[side].x, PAD[side].y, { color: C.cream, count: 4, speed: 120 });
      return;
    }
    if (Math.abs(bd) <= GOOD_W) judgeHit(best, bd, demo);
    else judgeMiss(best, demo);
  }

  // 戻り値: フレーズの全打が判定済みか
  function stepNotes(dt, demo) {
    var allDone = true;
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.flash > 0) n.flash -= dt * 2.5;
      if (n.st === 0) {
        allDone = false;
        if (lt - n.t > GOOD_W + 0.02) judgeMiss(n, demo);
      } else if (n.st === 3) {
        allDone = false;
        if (lt >= n.t + n.len) {
          n.st = 1; judged++; score += 150;
          game.fx.popup('NICE', PAD.L.x, PAD.L.y - 150, { color: C.good, size: 52 });
          game.audio.play('se_powerup', 0.4);
        } else if (!holdL && lt > n.t + 0.12) {
          judgeMiss(n, demo);
        } else {
          rollTick -= dt;
          if (rollTick <= 0) {
            rollTick = 0.055;
            strike.L = 0.05;
            game.audio.tone(150 + Math.random() * 40, 0.03, { wave: 'square', volume: 0.07 });
          }
        }
      }
      if (over) return false;
    }
    return allDone && lt >= cur.end;
  }

  // 指揮棒の高さ(0=振り下ろし、1=振りかぶり)と震え
  function batonPose(side) {
    var prev = -9, next = null;
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.side !== side) continue;
      if (n.t <= lt) { prev = Math.max(prev, n.t); if (n.len > 0 && lt < n.t + n.len) return { h: 0.25, shake: 1 }; }
      else if (!next || n.t < next.t) next = n;
    }
    if (!next) return { h: 0, shake: 0 };
    var start = Math.max(next.t - cur.lead, prev + 0.06);
    if (lt < start) return { h: 0, shake: 0 };
    var span = next.t - start;
    var peak = next.t - Math.min(0.14, span * 0.35);
    if (lt < peak) return { h: (lt - start) / Math.max(0.01, peak - start), shake: 0 };
    return { h: (next.t - lt) / Math.max(0.01, next.t - peak), shake: 0 };
  }

  function finishRun(ok) {
    over = true; won = ok; stopT = 0.3; outroT = 1.4;
    game.audio.stopBgm();
    if (ok) {
      cheer = 2;
      game.audio.play('se_success', 0.55);
      game.fx.burst(KID.L.x, KID.L.y, { color: C.snare, count: 24, speed: 420 });
      game.fx.burst(KID.R.x, KID.R.y, { color: C.cym, count: 24, speed: 420 });
      game.fx.flash(C.cream, 0.25);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || over || readyT > 0 || gapT > 0) return;
    if (y < H * 0.4) { game.audio.tone(300, 0.03, { wave: 'triangle', volume: 0.03 }); return; }
    hitSide(x < W / 2 ? 'L' : 'R', false);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); game.audio.stopBgm(); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; startAttractMusic(); return; }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  function ellipse(cx, cy, rx, ry, col, alpha) {
    for (var yy = -ry; yy < ry; yy += 3) {
      var f = (yy + 1.5) / ry;
      var k = 1 - f * f;
      if (k <= 0) continue;
      var hw = rx * Math.sqrt(k);
      game.draw.rect(cx - hw, cy + yy, hw * 2, 3, col, alpha);
    }
  }

  function ring(cx, cy, rx, ry, col, w) {
    var px = cx + rx, py = cy;
    for (var i = 1; i <= 28; i++) {
      var a = (i / 28) * Math.PI * 2;
      var nx = cx + Math.cos(a) * rx, ny = cy + Math.sin(a) * ry;
      game.draw.line(px, py, nx, ny, col, w);
      px = nx; py = ny;
    }
  }

  // 等角の段(上面は菱形を横ストリップで塗る)
  function isoStage(cx, topY, hw, hh, depth) {
    for (var yy = 0; yy < hh * 2; yy += 4) {
      var w = yy < hh ? (yy / hh) * hw : ((hh * 2 - yy) / hh) * hw;
      game.draw.rect(cx - w, topY + yy, w * 2, 4, '#d8b07a');
    }
    // 側面: 左=中明度、右=暗(段の高さぶんの短冊を斜めに並べる)
    for (var q = 0; q < hw; q += 8) {
      game.draw.rect(cx - hw + q, topY + hh + (q / hw) * hh, 8, depth, '#9a6a3c');
      game.draw.rect(cx + q, topY + hh * 2 - (q / hw) * hh - 4, 8, depth, '#7c522c');
    }
  }

  function drawRoom() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H * 0.46, [[0, C.wall], [1, C.wall2]]);
    // 壁の吸音パネル(等角の帯)
    for (var i = 0; i < 6; i++) {
      var px = 40 + i * 180;
      game.draw.rect(px, 250, 140, 230, '#4b3a68');
      game.draw.rect(px + 8, 258, 124, 214, '#5a4878');
      game.draw.rect(px + 8, 258 + ((i * 37 + t * 20) % 214), 124, 6, '#6c5a8c');
    }
    // 窓の夕日
    game.draw.gradient(H * 0.46, H, [[0, C.floor], [1, C.floor2]]);
    var top = H * 0.46;
    for (var g = -12; g < 14; g++) {
      var x0 = g * 120;
      game.draw.line(x0, top, x0 + (H - top) * 2, H, C.grid, 2);
      game.draw.line(x0 + 1080, top, x0 + 1080 - (H - top) * 2, H, C.grid, 2);
    }
  }

  var KID_A = ['..cccc..', '.cccccc.', '..ssss..', '.sesses.', '..smms..', '...ss...', '.bbbbbb.', 'sbbbbbbs', '..b..b..', '..k..k..'];
  var KID_B = ['..cccc..', '.cccccc.', '..ssss..', '.sesses.', '..smms..', '...ss...', '.bbbbbb.', 'sbbbbbbs', '.b....b.', '.k....k.'];
  var KID_SAD = ['..cccc..', '.cccccc.', '..ssss..', '.sesses.', '..mssm..', '...ss...', 's.bbbb.s', '.bbbbbb.', '..b..b..', '..k..k..'];
  var TEACH_A = ['...hhhh...', '..hhhhhh..', '..ssssss..', '..sesses..', '..ssmmss..', '...ssss...', '.tttttttt.', 'tttwwwwttt', '.tttttttt.', '..pppppp..', '..pp..pp..', '..kk..kk..'];
  var TEACH_B = ['...hhhh...', '..hhhhhh..', '..ssssss..', '..sesses..', '..smmmms..', '...ssss...', '.tttttttt.', 'tttwwwwttt', '.tttttttt.', '..pppppp..', '..pp..pp..', '..kk..kk..'];

  function drawKid(side, pose, highlight) {
    var k = KID[side];
    var t = game.time.elapsed;
    var hop = cheer > 0 ? Math.abs(Math.sin(t * 10 + (side === 'L' ? 0 : 1))) * 40 : (mood[side] > 0 ? mood[side] * 30 : 0);
    var bob = Math.sin(t * 4 + (side === 'L' ? 0 : 2)) * 4;
    var y = k.y - hop + bob;
    // 影は床に残る(高さ=影との距離)
    ellipse(k.x, k.y + 76, 60, 14, C.ink, 0.35);
    var capCol = side === 'L' ? C.snare : C.cym;
    var pal = { c: capCol, s: C.skin, e: C.ink, m: mood[side] < 0 ? '#5a3a3a' : C.hot, b: side === 'L' ? '#2d5c8f' : '#b9852a', k: C.ink };
    var fr = mood[side] < 0 ? KID_SAD : (Math.floor(t * 3) % 2 === 0 ? KID_A : KID_B);
    if (highlight) game.draw.circle(k.x, y, 120, '#ffffff', 0.55);
    game.draw.sprite(fr, pal, k.x, y, highlight ? 17 : 13, { anchor: 'center' });
    // 指揮棒: 手の位置から振りかぶり↔振り下ろし
    var dir = side === 'L' ? 1 : -1;
    var hx = k.x + dir * 58, hy = y + 6;
    var sh = pose.shake ? Math.sin(t * 70) * 22 : 0;
    var tx = hx + dir * (70 - pose.h * 50) + sh;
    var ty = hy + 50 - pose.h * 190;
    game.draw.line(hx, hy, tx, ty, C.cream, 8);
    var near = pose.h > 0.05 && !pose.shake;
    game.draw.circle(tx, ty, near ? 20 : 14, capCol);
    game.draw.circle(tx, ty, near ? 9 : 6, C.cream);
  }

  function drawTeacher() {
    var t = game.time.elapsed;
    var x = TEACH.x, y = TEACH.y + Math.sin(t * 3) * 3;
    ellipse(x, y + 100, 90, 18, C.ink, 0.3);
    game.draw.sprite(Math.floor(t * 2) % 2 === 0 ? TEACH_A : TEACH_B, { h: '#3a2a1e', s: C.skin, e: C.ink, m: C.hot, t: '#2f9a8a', w: C.cream, p: '#33334a', k: C.ink }, x, y, 14, { anchor: 'center' });
    // 腕とスティック: 押した瞬間だけ打面へ振り下ろす
    var sides = ['L', 'R'];
    for (var i = 0; i < 2; i++) {
      var sd = sides[i];
      var dir = sd === 'L' ? -1 : 1;
      var shx = x + dir * 64, shy = y - 2;
      var p = PAD[sd];
      var hit = strike[sd] > 0;
      var hx = hit ? p.x - dir * 40 : x + dir * 120;
      var hy = hit ? p.y - p.ry - 20 : y + 110;
      game.draw.line(shx, shy, hx, hy, C.skin, 18);
      var sx = hit ? p.x + dir * 30 : hx + dir * 40;
      var sy = hit ? p.y - 10 : hy - 120;
      game.draw.line(hx, hy, sx, sy, '#f0e0b8', 10);
      game.draw.circle(sx, sy, 9, '#f0e0b8');
    }
  }

  function drawPads() {
    var t = game.time.elapsed;
    // 押せる領域の明度(左右のゾーン)
    game.draw.rect(0, H * 0.74, W / 2 - 4, H * 0.26, C.snare, 0.08 + (strike.L > 0 ? 0.18 : 0));
    game.draw.rect(W / 2 + 4, H * 0.74, W / 2 - 4, H * 0.26, C.cym, 0.08 + (strike.R > 0 ? 0.18 : 0));
    // 小太鼓(等角の円柱)
    var s = PAD.L, sk = strike.L > 0 ? 6 : 0;
    game.draw.rect(s.x - s.rx, s.y, s.rx * 2, 110, C.snareDark);
    for (var z = 0; z < 5; z++) game.draw.rect(s.x - s.rx + 20 + z * 75, s.y + 10, 10, 96, '#d9d9e8');
    ellipse(s.x, s.y + 110, s.rx, s.ry, C.snareDark);
    ellipse(s.x, s.y + sk, s.rx, s.ry, '#c8d2e6');
    ellipse(s.x, s.y + sk, s.rx - 18, s.ry - 8, '#eef2fa');
    ring(s.x, s.y + sk, s.rx, s.ry, C.snare, 6);
    // シンバル(スタンド付き)
    var c = PAD.R, wob = strike.R > 0 ? Math.sin(t * 60) * 10 : Math.sin(t * 2) * 2;
    game.draw.line(c.x, c.y, c.x, H * 0.97, '#cfcfd8', 10);
    game.draw.line(c.x - 90, H * 0.97, c.x + 90, H * 0.97, '#cfcfd8', 10);
    ellipse(c.x, c.y + wob * 0.3, c.rx, c.ry + wob * 0.4, C.cymDark);
    ellipse(c.x, c.y - 6 + wob * 0.3, c.rx - 10, c.ry - 6, C.cym);
    ellipse(c.x - 50, c.y - 14, 50, 10, '#fff2b0', 0.7);
    game.draw.circle(c.x, c.y - 6, 12, C.cymDark);
  }

  // 近づく輪(振り下ろしの瞬間に打面と重なる)とロールの長さバー
  function drawCues() {
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      var p = PAD[n.side];
      var col = n.side === 'L' ? C.snare : C.cym;
      var d = n.t - lt;
      if (n.st === 0 && d > 0 && d < cur.lead) {
        var k = 1 + (d / cur.lead) * 1.1;
        ring(p.x, p.y, p.rx * k, p.ry * k, col, 8);
        ring(p.x, p.y, p.rx * k, p.ry * k, '#ffffff', 2);
      }
      if (n.len > 0 && (n.st === 0 || n.st === 3) && d < cur.lead + 0.3) {
        var bx = p.x - 160, by = p.y - p.ry - 120;
        var left = n.st === 3 ? Math.max(0, (n.t + n.len - lt) / n.len) : 1;
        game.draw.rect(bx - 6, by - 6, 332, 40, C.ink, 0.7);
        game.draw.rect(bx, by, 320 * left, 28, n.st === 3 ? C.good : C.snare);
        for (var q = 1; q < 4; q++) game.draw.rect(bx + q * 80, by, 4, 28, C.ink, 0.5);
      }
      if (n.flash > 0) {
        if (n.st === 2) ring(p.x, p.y, p.rx + 20, p.ry + 12, C.hot, 10);
        else ring(p.x, p.y, p.rx + 10 + (1 - n.flash) * 40, p.ry + 6 + (1 - n.flash) * 20, '#ffffff', 6);
      }
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink, 0.55);
    label('SCORE ' + score, 250, 70, 44, C.cream);
    for (var i = 0; i < LIVES; i++) {
      var on = i < lives;
      var sx = 700 + i * 80;
      game.draw.line(sx, 40, sx + 40, 100, on ? '#f0e0b8' : '#55485f', 12);
      game.draw.circle(sx + 40, 100, 10, on ? C.hot : '#55485f');
    }
    for (var j = 0; j < LESSONS.length; j++) {
      var done = j < li || (over && won);
      game.draw.circle(420 + j * 120, 160, 26, done ? C.good : (j === li ? C.cym : '#55485f'));
    }
    label((Math.min(li + 1, LESSONS.length)) + ' / ' + LESSONS.length, 860, 176, 40, C.cream);
    if (combo >= 2) label('x' + combo, 160, 176, 40, C.cym);
    var prog = Math.min(1, judged / totalNotes);
    game.draw.rect(60, 212, W - 120, 10, '#55485f');
    game.draw.rect(60, 212, (W - 120) * prog, 10, C.good);
  }

  function drawScene(useFocus) {
    drawRoom();
    isoStage(540, KID.L.y - 40, 440, 70, 40);
    drawKid('L', batonPose('L'), useFocus && focus && focus.side === 'L');
    drawKid('R', batonPose('R'), useFocus && focus && focus.side === 'R');
    drawTeacher();
    drawPads();
    drawCues();
    if (useFocus && focus) {
      var p = PAD[focus.side];
      ellipse(p.x, p.y, p.rx + 30, p.ry + 20, '#ffffff', 0.55);
    }
  }

  // ---- ATTRACT: 本物の判定をゴーストの両手が叩く(最後の1打はわざと遅れてMISS) ----
  var demo = { t: 0, lx: PAD.L.x, ly: PAD.L.y, rx: PAD.R.x, ry: PAD.R.y, lp: 0, rp: 0, holding: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cycLen = (DEMO_LESSON.pre + DEMO_LESSON.beats) * 60 / DEMO_LESSON.bpm + 0.8;
    var cyc = demo.t % cycLen;
    if (cyc < dt || demo.t <= dt) {
      initGame(); readyT = 0; lives = 99;
      buildLesson(DEMO_LESSON);
    }
    lt += dt;
    tickBeat(false);
    demo.holding = false;
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.st === 3) demo.holding = true;
      if (n.fail) {
        // 失敗例: 遅れて叩く(先にMISS判定が出てから空振りの一打)
        if (!n.ghosted && lt >= n.t + 0.26) { n.ghosted = true; demo.rp = 0.18; hitSide(n.side, true); }
        continue;
      }
      if (n.st === 0 && lt >= n.t) {
        if (n.side === 'L') demo.lp = 0.18; else demo.rp = 0.18;
        hitSide(n.side, true);
      }
    }
    holdL = demo.holding;
    if (holdL) demo.lp = Math.max(demo.lp, 0.05);
    stepNotes(dt, true);
    demo.lp -= dt; demo.rp -= dt;
    demo.ly = PAD.L.y - (demo.lp > 0 ? 10 : 70);
    demo.ry = PAD.R.y - (demo.rp > 0 ? 10 : 70);
  }

  function startAttractMusic() {
    game.audio.melody([
      ['C5', 0.5], ['E5', 0.5], ['G5', 1], ['E5', 0.5], ['D5', 0.5], ['C5', 1],
      ['A4', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['G4', 2],
    ], { tempo: 112, wave: 'square', volume: 0.04, loop: true, bass: [['C3', 2], ['A2', 2], ['F2', 2], ['G2', 2]] });
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (strike.L > 0) strike.L -= dt;
    if (strike.R > 0) strike.R -= dt;
    mood.L += (0 - mood.L) * Math.min(1, dt * 2);
    mood.R += (0 - mood.R) * Math.min(1, dt * 2);
    if (cheer > 0) cheer -= dt * 0.5;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(false);
      game.draw.hand(demo.lx, demo.ly, { press: demo.lp > 0, scale: 14 });
      game.draw.hand(demo.rx, demo.ry, { press: demo.rp > 0, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.55);
      label(GAME_TITLE, W / 2, 100, 84 + Math.sin(t * 4) * 4, C.cym);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 185, 36, C.cream);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.5, 50, C.hot);
      else label('TAP TO START', W / 2, H * 0.5, 44, C.cream);
      return;
    }

    if (state === S.RESULT) {
      drawScene(false);
      game.draw.rect(0, H * 0.4, W, H * 0.2, C.ink, 0.6);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.45, 96, won ? C.good : C.hot);
      label('SCORE ' + score, W / 2, H * 0.51, 52, C.cream);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.555, 34, C.cream);
      if (score > game.best && score > 0) label('NEW RECORD', W / 2, H * 0.4 + 10, 48, C.cym);
      else label('BEST ' + Math.max(game.best, score), W / 2, H * 0.4 + 10, 36, C.cream);
      if (!won) label('あと' + Math.max(1, totalNotes - judged) + '打!', W / 2, H * 0.62, 48, C.cym);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.66, 34, C.cream);
      return;
    }

    // ---- PLAYING ----
    holdL = false;
    var tl = game.touches || [];
    for (var i = 0; i < tl.length; i++) if (tl[i].x < W / 2 && tl[i].y >= H * 0.4) holdL = true;

    if (over) {
      if (stopT > 0) stopT -= dt;
      else {
        outroT -= dt;
        if (outroT <= 0) {
          state = S.RESULT;
          var stats = { perfect: perfects, good: goods, miss: misses, maxCombo: maxCombo };
          if (won) game.end.success(score, stats);
          else game.end.failure(stats);
        }
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else if (gapT > 0) {
      gapT -= dt;
      playT += dt;
      if (gapT <= 0) buildLesson(LESSONS[li]);
    } else {
      playT += dt;
      lt += dt;
      tickBeat(true);
      if (stepNotes(dt, false)) {
        li++;
        if (li >= LESSONS.length) finishRun(true);
        else {
          gapT = 0.6; cheer = 0.5;
          game.fx.popup('NICE', W / 2, H * 0.42, { color: C.good, size: 72 });
          game.audio.play('se_milestone', 0.45);
        }
      } else if (!over && playT > TIME_LIMIT) finishRun(lives > 0);
    }

    drawScene(over && !won && stopT > 0);
    drawHud();
    if (!over && readyT <= 0 && gapT <= 0) {
      var b = Math.floor(lt / cur.spb);
      if (b < cur.pre) label('' + (cur.pre - b), W / 2, H * 0.47, 110, C.cream);
    }
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.47, 100, C.cym);
  });

  game.onStart(function() {
    startAttractMusic();
    state = S.ATTRACT;
    initGame();
  });
})(game);

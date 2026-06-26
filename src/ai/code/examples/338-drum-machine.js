// 338-drum-machine.js
// ドラムマシン — 流れるパターンを見てタイミングよく4つのパッドを叩く
// 操作: 4つのゾーンをタップ（上/下/左/右）
// 成功: 40ヒット  失敗: 10ミス or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#080410',
    pad:    '#1e1b2e',
    padHi:  '#2d2944',
    padLit: '#4c1d95',
    hit:    '#a78bfa',
    hitHi:  '#c4b5fd',
    note:   '#818cf8',
    noteHi: '#a5b4fc',
    correct:'#22c55e',
    correctHi:'#86efac',
    miss:   '#ef4444',
    missHi: '#fca5a5',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  // 4 pads: top, bottom, left, right
  var PAD_SIZE = 280;
  var cx = W / 2, cy = H * 0.52;
  var pads = [
    { label: '↑', x: cx, y: cy - 260, zone: 'up', lit: 0 },
    { label: '↓', x: cx, y: cy + 260, zone: 'down', lit: 0 },
    { label: '←', x: cx - 260, y: cy, zone: 'left', lit: 0 },
    { label: '→', x: cx + 260, y: cy, zone: 'right', lit: 0 }
  ];

  // Notes fall from top toward pads
  var notes = [];
  var beat = 0;
  var BPM = 100;
  var beatInterval = 60 / BPM;
  var beatTimer = 0;
  var pattern = ['up', 'down', 'left', 'right', 'up', 'up', 'down', 'right'];
  var patIdx = 0;

  var hits = 0;
  var NEEDED = 40;
  var misses = 0;
  var MAX_MISS = 10;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var particles = [];
  var combo = 0;
  var lastResultText = '';
  var lastResultCol = C.correct;
  var resultAnim = 0;

  function getZone(tx, ty) {
    var dx = tx - cx, dy = ty - cy;
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
    return dy > 0 ? 'down' : 'up';
  }

  function padByZone(zone) {
    for (var i = 0; i < pads.length; i++) if (pads[i].zone === zone) return pads[i];
    return null;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var zone = getZone(tx, ty);
    var pad = padByZone(zone);
    if (pad) pad.lit = 0.4;

    // Find closest note to this pad
    var best = -1, bestDist = 999;
    for (var ni = 0; ni < notes.length; ni++) {
      if (notes[ni].zone === zone && !notes[ni].hit) {
        var d = Math.abs(notes[ni].progress - 1.0);
        if (d < bestDist) { bestDist = d; best = ni; }
      }
    }

    if (best >= 0 && bestDist < 0.25) {
      notes[best].hit = true;
      hits++;
      combo++;
      var qual = bestDist < 0.08 ? 'PERFECT!' : (bestDist < 0.15 ? 'GREAT' : 'GOOD');
      lastResultText = qual;
      lastResultCol = bestDist < 0.08 ? C.hitHi : C.correctHi;
      resultAnim = 0.5;
      game.audio.play('se_tap', 0.5 + bestDist * 0.1);
      if (pad) {
        for (var pi = 0; pi < 5; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: pad.x, y: pad.y, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.4, col: C.hitHi });
        }
      }
      if (hits >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(hits * 80 + combo * 20 + Math.ceil(timeLeft) * 80); }, 400);
      }
    } else {
      misses++;
      combo = 0;
      lastResultText = 'MISS';
      lastResultCol = C.missHi;
      resultAnim = 0.4;
      game.audio.play('se_failure', 0.3);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (resultAnim > 0) resultAnim -= dt * 2.5;

    // Beat timer - spawn notes
    beatTimer -= dt;
    if (beatTimer <= 0 && !done) {
      var zone = pattern[patIdx % pattern.length];
      patIdx++;
      notes.push({ zone: zone, progress: 0, hit: false });
      beatTimer = beatInterval * (Math.random() < 0.3 ? 0.5 : 1);
    }

    // Update notes
    var noteSpeed = 1.0 / (beatInterval * 3); // travel in 3 beats
    for (var ni = notes.length - 1; ni >= 0; ni--) {
      var n = notes[ni];
      n.progress += noteSpeed * dt;
      // Miss if passed target
      if (n.progress > 1.3 && !n.hit) {
        misses++;
        combo = 0;
        game.audio.play('se_failure', 0.2);
        notes.splice(ni, 1);
        if (misses >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
      } else if (n.progress > 1.5) {
        notes.splice(ni, 1);
      }
    }

    // Pad glow decay
    for (var pi2 = 0; pi2 < pads.length; pi2++) {
      if (pads[pi2].lit > 0) pads[pi2].lit -= dt * 4;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Center cross lines
    game.draw.line(cx, cy - 320, cx, cy + 320, C.pad, 3);
    game.draw.line(cx - 320, cy, cx + 320, cy, C.pad, 3);

    // Pads
    for (var pi3 = 0; pi3 < pads.length; pi3++) {
      var pad = pads[pi3];
      var isLit = pad.lit > 0;
      game.draw.circle(pad.x, pad.y, 110, isLit ? C.padLit : C.pad, isLit ? 0.7 + pad.lit * 0.3 : 0.7);
      game.draw.circle(pad.x, pad.y, 90, isLit ? C.hit : C.padHi, isLit ? 0.5 : 0.3);
      game.draw.text(pad.label, pad.x, pad.y + 20, { size: 64, color: isLit ? C.hitHi : C.hit, bold: true });
    }

    // Notes traveling toward pads
    for (var ni2 = 0; ni2 < notes.length; ni2++) {
      var n2 = notes[ni2];
      if (n2.hit) continue;
      var pad2 = padByZone(n2.zone);
      if (!pad2) continue;
      // Position: from center toward pad
      var t = Math.min(1, n2.progress);
      var nx = cx + (pad2.x - cx) * t;
      var ny = cy + (pad2.y - cy) * t;
      var atTarget = t > 0.85;
      game.draw.circle(nx, ny, atTarget ? 30 : 22, atTarget ? C.noteHi : C.note, atTarget ? 0.9 : 0.7);
      game.draw.circle(nx, ny, atTarget ? 18 : 12, '#fff', atTarget ? 0.4 : 0.2);
    }

    // Result text
    if (resultAnim > 0) {
      game.draw.text(lastResultText, cx, cy, { size: 52, color: lastResultCol, bold: true });
    }
    if (combo > 2) {
      game.draw.text(combo + ' COMBO', cx, cy + 80, { size: 38, color: C.hitHi, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 18 + mi * 36, H * 0.92, 12, mi < misses ? C.miss : '#080410');
    }

    game.draw.text(hits + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.padLit : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    beatTimer = 0.5;
  });
})(game);

(function(){
  // ─── Lattice Sphere v2 (upgraded) ───────────────────────────────
  // Copper dot grid + teal tropic rings + violet pings.
  // Same boot interface (.lattice-globe-canvas + window.__initLatticeGlobe)
  // so every existing call site keeps working without HTML changes.

  // Palette (matches studio ICN-16)
  var COPPER       = [196, 149, 106];
  var COPPER_LIGHT = [205, 160, 122];
  var TEAL         = [86, 144, 134];
  var VIOLET       = [167, 139, 200];

  function rgba(c, a){ return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a.toFixed(3)+')'; }
  function lerpColor(c1, c2, tt){
    return [
      Math.round(c1[0] + (c2[0]-c1[0])*tt),
      Math.round(c1[1] + (c2[1]-c1[1])*tt),
      Math.round(c1[2] + (c2[2]-c1[2])*tt)
    ];
  }

  // 3D rotation matrices
  function rotY(p, a){ var c=Math.cos(a), s=Math.sin(a); return [p[0]*c+p[2]*s, p[1], -p[0]*s+p[2]*c]; }
  function rotX(p, a){ var c=Math.cos(a), s=Math.sin(a); return [p[0], p[1]*c-p[2]*s, p[1]*s+p[2]*c]; }

  function project3D(p, cx, cy, r, dpr){
    var persp = 2.4;
    var f = persp / (persp - p[2]);
    return { x: cx + p[0]*r*f, y: cy - p[1]*r*f, z: p[2], f: f };
  }

  // Pre-seeded ping anchor positions (24 deterministic nodes around the sphere)
  var PING_NODES = [];
  (function seedNodes(){
    var s = 911;
    function rng(){ s = (s*9301 + 49297) % 233280; return s/233280; }
    for (var i=0;i<24;i++){
      PING_NODES.push([
        rng() * Math.PI * 2,
        (rng() - 0.5) * Math.PI * 1.05
      ]);
    }
  })();

  function initGlobe(canvas){
    var dpr = window.devicePixelRatio || 1;
    var size = parseInt(canvas.dataset.size || '64');
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    var ctx = canvas.getContext('2d');
    var cx = canvas.width / 2;
    var cy = canvas.height / 2;
    var R = canvas.width * 0.42;
    var SPEED = 0.0005;
    var TILT_X = 0.4;

    // Pre-compute lat/long grid points
    var NLAT = 9, NLON = 18;
    var GRID = [];
    for (var i = 1; i < NLAT; i++){
      var lat = -Math.PI/2 + (i/NLAT) * Math.PI;
      for (var j = 0; j < NLON; j++){
        var lon = (j/NLON) * Math.PI * 2;
        GRID.push([lon, lat]);
      }
    }
    // Add poles for completeness
    GRID.push([0, Math.PI/2 - 0.05]);
    GRID.push([0, -Math.PI/2 + 0.05]);

    // Active ping (single, cycling)
    var lastPingIdx = -1;

    function draw(now){
      var ay = now * SPEED;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Outer aura (warm copper-teal halo)
      var auraColor = lerpColor(COPPER_LIGHT, TEAL, 0.3);
      var auraGrad = ctx.createRadialGradient(cx, cy, R*0.5, cx, cy, R*1.45);
      auraGrad.addColorStop(0, rgba(auraColor, 0.10));
      auraGrad.addColorStop(1, rgba(auraColor, 0));
      ctx.beginPath();
      ctx.arc(cx, cy, R*1.45, 0, Math.PI*2);
      ctx.fillStyle = auraGrad;
      ctx.fill();

      // Inner sphere fill (faint teal radial)
      var inner = ctx.createRadialGradient(cx, cy, R*0.3, cx, cy, R);
      inner.addColorStop(0, rgba(TEAL, 0.10));
      inner.addColorStop(1, rgba(TEAL, 0));
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI*2);
      ctx.fillStyle = inner;
      ctx.fill();

      // Lattice dots (copper, depth-aware alpha + size)
      for (var k = 0; k < GRID.length; k++){
        var lon = GRID[k][0], lat = GRID[k][1];
        var p = [
          Math.cos(lat) * Math.cos(lon),
          Math.sin(lat),
          Math.cos(lat) * Math.sin(lon)
        ];
        p = rotY(p, ay);
        p = rotX(p, TILT_X);
        var pp = project3D(p, cx, cy, R, dpr);
        if (pp.z < -0.05) continue;
        var a = 0.18 + pp.z * 0.7;
        var dotR = (0.7 + pp.z * 0.7) * dpr;
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, dotR, 0, Math.PI*2);
        ctx.fillStyle = rgba(COPPER, a);
        ctx.fill();
      }

      // Tropic rings (teal, thin)
      for (var ti = 0; ti < 2; ti++){
        var latDeg = ti === 0 ? -30 : 30;
        var latR = latDeg * Math.PI / 180;
        ctx.beginPath();
        var started = false;
        for (var lonR = 0; lonR <= Math.PI*2; lonR += 0.05){
          var pr = [
            Math.cos(latR) * Math.cos(lonR + ay),
            Math.sin(latR),
            Math.cos(latR) * Math.sin(lonR + ay)
          ];
          pr = rotX(pr, TILT_X);
          var ppr = project3D(pr, cx, cy, R, dpr);
          if (ppr.z > 0){
            if (!started){ ctx.moveTo(ppr.x, ppr.y); started = true; }
            else ctx.lineTo(ppr.x, ppr.y);
          } else if (started){
            ctx.stroke();
            ctx.beginPath();
            started = false;
          }
        }
        ctx.strokeStyle = rgba(TEAL, 0.30);
        ctx.lineWidth = 0.6 * dpr;
        ctx.stroke();
      }

      // Rim (copper)
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI*2);
      ctx.strokeStyle = rgba(COPPER, 0.45);
      ctx.lineWidth = 1.0 * dpr;
      ctx.stroke();

      // Violet pings — cycle through pre-seeded nodes, one ping every ~2s
      var pingCycleMs = 2000;
      var phaseLocal = (now % pingCycleMs) / pingCycleMs; // 0..1
      var pingIdx = Math.floor(now / pingCycleMs) % PING_NODES.length;
      // when pingIdx changes, lastPingIdx updates (just deterministic which node is active)
      if (phaseLocal < 0.55){
        var node = PING_NODES[pingIdx];
        var pn = [
          Math.cos(node[1]) * Math.cos(node[0]),
          Math.sin(node[1]),
          Math.cos(node[1]) * Math.sin(node[0])
        ];
        pn = rotY(pn, ay);
        pn = rotX(pn, TILT_X);
        var ppn = project3D(pn, cx, cy, R, dpr);
        if (ppn.z > 0.05){
          var pingT = phaseLocal / 0.55;
          var fade = pingT < 0.15 ? pingT/0.15 : pingT > 0.7 ? (1 - pingT)/0.3 : 1;
          var ringR = (3 + pingT*8) * dpr;
          // Outer expanding ring
          ctx.beginPath();
          ctx.arc(ppn.x, ppn.y, ringR, 0, Math.PI*2);
          ctx.strokeStyle = rgba(VIOLET, fade * 0.55 * (1 - pingT));
          ctx.lineWidth = 0.6 * dpr;
          ctx.stroke();
          // Solid bright dot
          var coreR = 1.6 * dpr * fade;
          var coreGrad = ctx.createRadialGradient(ppn.x, ppn.y, 0, ppn.x, ppn.y, coreR*2.2);
          coreGrad.addColorStop(0, rgba(VIOLET, fade * 0.95));
          coreGrad.addColorStop(1, rgba(VIOLET, 0));
          ctx.beginPath();
          ctx.arc(ppn.x, ppn.y, coreR*2.2, 0, Math.PI*2);
          ctx.fillStyle = coreGrad;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(ppn.x, ppn.y, coreR*0.7, 0, Math.PI*2);
          ctx.fillStyle = rgba([255,255,240], fade * 0.85);
          ctx.fill();
        }
      }

      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  function bootGlobes(){
    var canvases = document.querySelectorAll('.lattice-globe-canvas');
    for (var i = 0; i < canvases.length; i++) initGlobe(canvases[i]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootGlobes);
  else bootGlobes();
  window.__initLatticeGlobe = initGlobe;
})();

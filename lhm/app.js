import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
const S = await (await fetch('spec.json')).json();
const $ = id => document.getElementById(id);
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcfe0ee); scene.fog = new THREE.Fog(0xcfe0ee, 400, 900);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 3000);
scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a60, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(60, 120, 80); scene.add(sun);
const G = {}; for (const k of ['site', 'walls', 'roof', 'piping', 'electrical', 'tanks', 'equip']) { G[k] = new THREE.Group(); scene.add(G[k]); }
const M = c => new THREE.MeshStandardMaterial({ color: c, roughness: .7, metalness: .1 });
const MAT = { di: M(0x7a3b26), red: M(0xc0392b), black: M(0x151515), blue: M(0x1f5fbf), brass: new THREE.MeshStandardMaterial({ color: 0xc9a23a, metalness: .6, roughness: .35 }), galv: new THREE.MeshStandardMaterial({ color: 0xaab0b6, metalness: .55, roughness: .4 }), cmu: M(0xd8d2c4), conc: M(0xb9b6ae), roof: M(0x7f8c96), grass: M(0x7fa35a), gravel: M(0xc8c0ae), tank: new THREE.MeshStandardMaterial({ color: 0xe9ecef, roughness: .5, transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false }), pt: M(0xdfe3e6), pump: M(0x2f4f6f), motor: M(0x3b6e8f), panel: M(0xc9ccd0), gen: M(0xb8b33a), pvc: M(0xf2f2f2), cl: M(0xe5d34a), door: M(0x8d9aa6), glass: new THREE.MeshStandardMaterial({ color: 0x9fd3ff, transparent: true, opacity: .45 }), fence: M(0x9aa0a6), wood: M(0x8a6a44), white: M(0xf7f7f7) };
const Y0 = S.site.grade.y;
function tag(o, name, size, src, extra) { o.userData.info = { name, size, src, extra }; return o; }
function box(w, h, d, mat, x, y, z, g) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); (g || G.equip).add(m); return m; }
function cyl(r, h, mat, g, seg = 24) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat); (g || G.equip).add(m); return m; }
const V = (x, y, z) => new THREE.Vector3(x, y, z), UP = V(0, 1, 0);
function orient(m, a, b) { const d = b.clone().sub(a); m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); }
// pipe run through a list of points; d in inches
function run(pts, d, mat, info, g = G.piping, flg = true) {
  const r = Math.max(d, .75) / 24 * 1.1, grp = new THREE.Group(); g.add(grp);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = V(...pts[i]), b = V(...pts[i + 1]); const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 16), mat); orient(m, a, b); grp.add(m);
    if (i > 0) { const s = new THREE.Mesh(new THREE.SphereGeometry(r * 1.02, 12, 8), mat); s.position.copy(a); grp.add(s); }
    if (flg && d >= 3) for (const p of [a, b]) { const f = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.6, r * 1.6, .1, 20), mat); const dir = b.clone().sub(a).normalize(); f.position.copy(p).addScaledVector(dir, p === a ? .05 : -.05); f.quaternion.setFromUnitVectors(UP, dir); grp.add(f); }
  }
  if (info) tag(grp, ...info); return grp;
}
// valve at point p along unit axis ax ('x','y','z'); kind gate|check|ball
function valve(p, ax, d, kind, info, g = G.piping) {
  const grp = new THREE.Group(); g.add(grp); grp.position.set(...p); const r = Math.max(d, 1) / 24 * 1.1;
  const axV = { x: V(1, 0, 0), y: V(0, 1, 0), z: V(0, 0, 1) }[ax];
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.45, r * 1.45, Math.max(d / 12 * 1.1, .35), 18), kind === 'check' ? MAT.blue : kind === 'ball' ? MAT.brass : MAT.red); body.quaternion.setFromUnitVectors(UP, axV); grp.add(body);
  if (kind === 'gate') { const sd = ax === 'y' ? V(0, 0, -1) : V(0, 1, 0); const L = r * 4 + .4; const st = new THREE.Mesh(new THREE.CylinderGeometry(r * .5, r * .7, L, 10), MAT.red); st.position.copy(sd).multiplyScalar(L / 2); st.quaternion.setFromUnitVectors(UP, sd); grp.add(st); const stem = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .5, 6), MAT.galv); stem.position.copy(sd).multiplyScalar(L + .2); stem.quaternion.setFromUnitVectors(UP, sd); grp.add(stem); const hw = new THREE.Mesh(new THREE.TorusGeometry(Math.max(r * 1.4, .25), .035, 8, 24), MAT.black); hw.position.copy(sd).multiplyScalar(L + .35); hw.quaternion.setFromUnitVectors(V(0, 0, 1), sd); grp.add(hw); }
  if (kind === 'ball') { const h = box(.35, .04, .06, MAT.red, .15, r * 1.6, 0, grp); }
  if (kind === 'check') { const c = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.9, r * 1.9, .12, 18), MAT.blue); c.quaternion.setFromUnitVectors(UP, axV); grp.add(c); }
  if (info) tag(grp, ...info); return grp;
}
function label(txt, x, y, z) { const e = document.createElement('div'); e.className = 'lbl'; e.textContent = txt; $('lbls').appendChild(e); LBL.push({ e, p: V(x, y, z) }); }
const LBL = [];
// ---------- SITE ----------
const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), MAT.grass); ground.rotation.x = -Math.PI / 2; ground.position.y = Y0 - .02; G.site.add(ground);
tag(ground, 'Grade', 'Contours 530–532; FFE 533.00', 'Sheet 3', 'Flat grade 6" below FFE – ASSUMED');
for (const [x0, z0, x1, z1] of S.site.drive.rects) tag(box(x1 - x0, .06, z1 - z0, MAT.gravel, (x0 + x1) / 2, Y0 + .01, (z0 + z1) / 2, G.site), 'Access drive', '6" crushed limestone, ~550 SY', 'Sheet 3 note 3', 'Outline traced approx. – ASSUMED');
tag(box(30, .06, 6, MAT.gravel, -7, Y0 + .01, 11, G.site), 'Drive apron', '6" crushed limestone', 'Sheet 3', 'ASSUMED extent');
{ const road = box(1400, .05, 30, M(0x55575a), 0, Y0 + .02, 70, G.site); tag(road, 'FM 1653', 'State highway (south of site)', 'Sheet 3', 'Position approximate'); }
{ const [x0, z0, x1, z1] = S.site.fence.rect, h = S.site.fence.height, fg = new THREE.Group(); G.site.add(fg);
  const seg = (a, b) => { run([[a[0], Y0 + h, a[1]], [b[0], Y0 + h, b[1]]], 1.5, MAT.fence, null, fg, false); const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 10); for (let i = 0; i <= n; i++) { const x = a[0] + (b[0] - a[0]) * i / n, z = a[1] + (b[1] - a[1]) * i / n; run([[x, Y0, z], [x, Y0 + h, z]], 2.4, MAT.fence, null, fg, false); } const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const mesh = new THREE.Mesh(new THREE.PlaneGeometry(L, h), new THREE.MeshBasicMaterial({ color: 0x8a9096, transparent: true, opacity: .22, side: THREE.DoubleSide, depthWrite: false })); mesh.position.set((a[0] + b[0]) / 2, Y0 + h / 2, (a[1] + b[1]) / 2); mesh.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]); fg.add(mesh); };
  seg([x0, z0], [x1, z0]); seg([x1, z0], [x1, z1]); seg([x1, z1], [-40, z1]); seg([-56, z1], [x0, z1]); seg([x0, z1], [x0, z0]);
  tag(fg, 'Security fence', "6' chain link, dbl 8' gates (by others)", 'Sheet 3', 'Fence line extent approximated – ASSUMED'); }
tag(box(3, .5, 97, MAT.conc, S.site.flume.x, Y0 + .1, (S.site.flume.z0 + S.site.flume.z1) / 2, G.site), 'Concrete curbed flume', "98 LF, 3' wide, variable height", 'Sheet 3');
// ---------- BUILDING ----------
const B = S.building, hx = B.L / 2, hz = B.W / 2, t = B.wall.t, H = B.plate.h;
tag(box(B.L + .4, .5, B.W + .4, MAT.conc, 0, -.25, 0, G.site), 'Floor slab', 'FFE 533.00, 5" slab on 6" sand cushion', 'Sheets 3, 7');
// wall along x (z fixed) or z (x fixed) with openings [{c,w,y0,h,mat}]
function wall(axis, fixed, a0, a1, ops, info) {
  const g = new THREE.Group(); G.walls.add(g); tag(g, ...info); let cur = a0; ops = [...ops].sort((p, q) => p.c - q.c);
  const piece = (s0, s1, y0, y1) => { if (s1 - s0 < .01 || y1 - y0 < .01) return; const L = s1 - s0, c = (s0 + s1) / 2, yc = (y0 + y1) / 2; axis === 'x' ? box(L, y1 - y0, t, MAT.cmu, c, yc, fixed, g) : box(t, y1 - y0, L, MAT.cmu, fixed, yc, c, g); };
  for (const o of ops) { piece(cur, o.c - o.w / 2, 0, H); piece(o.c - o.w / 2, o.c + o.w / 2, 0, o.y0); piece(o.c - o.w / 2, o.c + o.w / 2, o.y0 + o.h, H); if (o.mat) { const m = axis === 'x' ? box(o.w, o.h, .08, o.mat, o.c, o.y0 + o.h / 2, fixed, g) : box(.08, o.h, o.w, o.mat, fixed, o.y0 + o.h / 2, o.c, g); if (o.info) tag(m, ...o.info); } cur = o.c + o.w / 2; }
  piece(cur, a1, 0, H); return g;
}
const win = c => ({ c, w: 4, y0: 4.5, h: 2, mat: MAT.glass, info: ['Window A', "2'0\"H x 4'0\"W aluminum awning", 'Sheet 6 window schedule', 'Position scaled – ASSUMED'] });
wall('x', -hz + t / 2, -hx, hx, B.windows[0].x.map(win), ['North wall', "8x8x16 CMU, 8' plate", 'Sheets 7, 8']);
const sDoor = { c: 0, w: 6, y0: 0, h: 7 };
const southWall = wall('x', hz - t / 2, -hx, hx, [sDoor], ['South wall', "8x8x16 CMU, 8' plate", 'Sheets 7, 8']);
for (const sx of [-1, 1]) tag(box(.15, 7, 3, MAT.door, sx * 3, 3.5, hz + 1.5, G.walls), 'Door 1 (pump room, shown open)', "(2) 3'0\"x7'0\" hollow core steel w/ astragal", 'Sheet 6 door schedule');
wall('z', hx - t / 2, -hz + t, hz - t, [], ['East wall', '8x8x16 CMU', 'Sheet 8']);
const d2 = z => ({ c: z, w: 3, y0: 0, h: 7, mat: MAT.door, info: ['Door 2', "3'0\"x7'0\" steel door, exterior (12x12 vision)", 'Sheet 6/8'] });
wall('z', -hx + t / 2, -hz + t, hz - t, [d2(-4.7), d2(4.7)], ['West wall', 'CMU; separate exterior doors to Chlorine & Storage rooms', 'Sheets 6, 8']);
const rx = B.rooms[0].x1, rz = B.rooms[0].z1;
wall('z', rx, -hz + t, hz - t, [], ['Chlorine/Storage room partition', 'CMU, sealed (no door to pump room)', 'Sheet 6']);
wall('x', rz, -hx + t, rx - t / 2, [], ['Chlorine room / Storage room partition', 'CMU', 'Sheet 6']);
// roof gable along x
{ const pitch = 4 / 12, ov = B.roof.overhang, half = hz + ov, rise = hz * pitch, sl = Math.hypot(half, half * pitch), g = G.roof;
  for (const s of [-1, 1]) { const p = box(B.L + 2 * ov, .25, sl, MAT.roof, 0, H + rise - half * pitch / 2, s * half / 2, g); p.rotation.x = s * Math.atan(pitch); }
  const tri = new THREE.Shape([new THREE.Vector2(-hz, 0), new THREE.Vector2(hz, 0), new THREE.Vector2(0, rise)]);
  for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.ShapeGeometry(tri), M(0xe6e0d2)); m.material.side = THREE.DoubleSide; m.rotation.y = Math.PI / 2; m.position.set(s * hx, H, 0); g.add(m); }
  const vent = cyl(.8, 1, MAT.galv, g); vent.position.set(-8, H + rise + .4, 0);
  tag(g, 'Roof', '24 ga R-panel on pre-engineered trusses @ 24" c/c, LP SmartSide gables', 'Sheets 7, 8', '4:12 pitch & 1\' overhang scaled – ASSUMED'); }
label('Pump Station 30\'x16\'', 0, 13, 0);
// rooms labels/equipment
{ const g = G.equip;
  const cl = new THREE.Group(); g.add(cl);
  for (const x of [-12.6, -10.4]) for (const z of [-3.3]) { const c = cyl(.45, 4.5, MAT.cl, cl); c.position.set(x, 2.55, z); }
  box(4.2, .3, 2, M(0x444444), -11.5, .15, -3.3, cl);
  tag(cl, 'Chlorine cylinders on electronic scales', '150 lb Cl2 gas cylinders (2), electronic scales', 'Sheet 6/7', 'Cylinder count/size per typical – ASSUMED');
  const chl = box(1, 1.4, .4, MAT.white, rx - .45, 5, -6, g); tag(chl, 'Wall-mounted gas chlorinator', 'Chlorine flow control & metering unit, 1-1/2" solution line', 'Sheets 6, 7');
  const chl2 = box(1, 1.4, .4, MAT.white, rx - .45, 5, -2.2, g); tag(chl2, 'Wall-mounted chlorinator (2nd)', 'Chlorinator', 'Sheet 6');
  const ph = cyl(1.3, 3.5, M(0x3d6fb6), g); ph.position.set(-12.5, 1.75, 5.6); tag(ph, 'Phosphate feed tank', 'Phosphate solution, 1" solution line', 'Sheet 6', 'Tank size ASSUMED');
  const fh = box(1.5, 1, .4, M(0x777777), -13, 1, -.5, g); tag(fh, 'Floor heater', '', 'Sheet 6');
  const ba = box(1.4, 2.2, .6, M(0xd7262f), -hx - .4, 4, 0, g); tag(ba, 'Breathing apparatus cabinet', 'Exterior, between room doors', 'Sheet 6');
  for (const [x, z, n] of [[-hx - .2, -7, 'Gravity exhaust louver 12x12'], [-hx - .2, 7, 'Gravity supply louver 12x12']]) tag(box(.3, 1, 1, MAT.galv, x, n.includes('exhaust') ? 7 : 1.2, z, g), n, '12"x12" gravity operated louver', 'Sheet 6');
  for (const [z, n] of [[-hz - .7, 'Motorized SS supply ventilator 200 CFM'], [hz + .7, 'Motorized SS exhaust ventilator 200 CFM']]) { const v = cyl(.9, 1.2, MAT.galv, g); v.rotation.x = Math.PI / 2; v.position.set(-11.5, 6.4, z); tag(v, n, '12" below clg height', 'Sheet 6'); }
  label('Chlorine Room', -10, 9.5, -4.6); label('Storage', -10, 9.5, 4.6);
}
// ---------- PUMPS & HEADERS ----------
const P = S.piping, PZ = S.pumps.z, sh = P.suction_header, dh = P.discharge_header;
S.pumps.x.forEach((x, i) => {
  const mk = S.pumps.marks[i], pg = new THREE.Group(); G.equip.add(pg);
  box(2, 1.5, 4.67, MAT.conc, x, .75, PZ, pg);
  const vol = cyl(.9, .7, MAT.pump, pg); vol.rotation.x = Math.PI / 2; vol.position.set(x, 2.4, -2.6 + .9);
  const mot = cyl(.75, 2.4, MAT.motor, pg); mot.rotation.x = Math.PI / 2; mot.position.set(x, 2.4, .6);
  box(1.4, .3, 4, M(0x333a40), x, 1.65, PZ, pg);
  tag(pg, `Pump ${mk}`, S.pumps.type, 'Sheet 6 pump schedule', mk === 'P103' ? 'P103 in schedule; E-sheets mostly show P101/P102 – may be future' : '2\'-0"x4\'-8"x18" pad');
  // suction: header tee -> gate -> 8x4 ecc reducer -> pump end
  run([[x, sh.y, sh.z], [x, sh.y, -4.4]], 8, MAT.di, ['Pump suction 8"', '8" FL DI spool / tee (101)', 'Sheet 6']);
  valve([x, sh.y, -4.9], 'z', 8, 'gate', [`Suction gate valve ${mk}`, '8" gate valve (F) – mark 102', 'Sheet 6']);
  run([[x, sh.y, -4.4], [x, sh.y, -3.6], [x, 2.4, -3.6], [x, 2.4, -2.95]], 4, MAT.di, ['8"x4" eccentric reducer (104) to pump suction', '4" suction nozzle', 'Sheet 6', 'Drop/rise geometry ASSUMED'], G.piping);
  // discharge stack: pump -> reducer -> check -> gate -> header
  run([[x, 3.1, -1.7], [x, 3.6, -1.7]], 4, MAT.di, ['Discharge reducer', '4" x 8" reducer (112/115)', 'Sheet 6']);
  run([[x, 3.6, -1.7], [x, 4.1, -1.7], [x, 4.1, dh.z], [x, dh.y, dh.z]], 8, MAT.di, ['Discharge riser', '8" FL DI', 'Sheet 6'], G.piping, false);
  valve([x, 3.9, -2.35], 'z', 8, 'check', [`Vertical check valve ${mk}`, '8" silent check valve (F) – mark 103', 'Sheet 6', 'Blue color per owner convention']);
  valve([x, 4.95, dh.z], 'y', 8, 'gate', [`Discharge gate valve ${mk}`, '8" gate valve (F) – mark 102', 'Sheet 6']);
});
run([[sh.x0, sh.y, sh.z], [sh.x1, sh.y, sh.z]], 8, MAT.di, ['Suction header', '8" FL DI (109), from GST', 'Sheet 6', 'Elevation ASSUMED (owner: suction low)']);
run([[P.gst_suction_in.x, sh.y, -hz - .2], [P.gst_suction_in.x, sh.y, sh.z]], 8, MAT.di, ['8" from G.S.T. (suction)', '8" wall sleeve (108) + FL DI', 'Sheet 6']);
run([[sh.x1, sh.y, sh.z], [sh.x1, sh.y, sh.z + .01]], 8, MAT.di, ['8" blind flange (126)', '8" BF', 'Sheet 6']);
run([[dh.x0, dh.y, dh.z], [dh.x1, dh.y, dh.z]], 8, MAT.di, ['Pressure (discharge) header', '8" FL DI', 'Sheet 6', 'Elevation ASSUMED (owner: pressure above suction)']);
run([[P.to_distribution.x, dh.y, dh.z], [P.to_distribution.x, dh.y, -hz - 1], [P.to_distribution.x, Y0 + .3, -hz - 1], [P.to_distribution.x, Y0 + .3, -9.2]], 8, MAT.di, ['8" to distribution / pressure tanks', '8" FL DI, 8" 90s (111/113), wall sleeve', 'Sheets 6, 8']);
// hose bibs
for (const [x, z] of [[-4.2, 5.5], [1, -6.8], [12, 6.5]]) { const hb = run([[x, 3, z], [x + .35, 3, z]], .75, MAT.brass, null, G.piping, false); tag(hb, 'Hose bib', '3/4" brass hose bib', 'Sheet 6/7'); }
// pipe stands
for (const x of [1, 6]) { const s = run([[x, 0, sh.z], [x, sh.y - .4, sh.z]], 2, MAT.galv, null, G.piping, false); box(.6, .05, .6, MAT.galv, x, .03, sh.z, s); tag(s, 'Adjustable pipe support', 'Galvanized adj. pipe stand (typ.)', 'Sheet 6', 'Galvanized per owner convention'); }
// ---------- WELL LINES (wall to wall) ----------
for (const [w, key, meter] of [[0, 'well11', '4" Census Octave ultrasonic meter (133)'], [1, 'well12', '2" Census Octave ultrasonic meter (132)']]) {
  const L = P[key], x = L.x, d = L.d, y = 2.2;
  run([[x, y, hz + .3], [x, y, -hz - .3]], d, MAT.di, [L.desc.split(',')[0], `${d}" FL DI through building`, 'Sheet 6', 'Passes wall to wall, no pump connection']);
  valve([x, y, 5.5], 'z', d, 'gate', [`${d}" gate valve (well line)`, `${d}" gate valve`, 'Sheet 6']);
  valve([x, y, 3.2], 'z', d, 'check', [`${d}" swing check (well line)`, `${d}" swing check valve (131)`, 'Sheet 6']);
  const m = cyl(d / 24 * 2, 1.1, MAT.blue, G.piping); m.rotation.x = Math.PI / 2; m.position.set(x, y, 1); tag(m, `Flow meter – ${key === 'well11' ? 'Well 11' : 'Well 12'}`, meter, 'Sheet 6');
  // injection taps after meter (toward GST = north)
  const tp = run([[x, y + d / 24, -1.4], [x, y + .9, -1.4]], 1, MAT.pvc, null, G.piping, false); tag(tp, 'Cl2 solution injection tap', '1" corporation (1-1/2" solution line reduced to 1")', 'Sheet 7 note 3', 'After meter per owner convention');
  const tq = run([[x, y + d / 24, -3], [x, y + .9, -3]], 1, MAT.pvc, null, G.piping, false); tag(tq, 'Phosphate injection tap', '1" phosphate solution line', 'Sheet 6');
  const sp = run([[x, y - d / 24, -4.2], [x, y - .7, -4.2]], .75, MAT.brass, null, G.piping, false); tag(sp, 'Sample tap', '3/4" sample tap', 'Sheet 6');
}
run([[rx, 7, -1.4], [P.well11.x, 7, -1.4], [P.well11.x, 3.1, -1.4]], 1.5, MAT.pvc, ['Chlorine solution line', '1-1/2" SCH 80 PVC from chlorinator to injection', 'Sheets 6, 7'], G.piping, false);
run([[P.well11.x, 7, -1.4], [P.well12.x, 7, -1.4], [P.well12.x, 3.1, -1.4]], 1, MAT.pvc, null, G.piping, false);
run([[rx, 6.6, 4.5], [rx + .3, 6.6, 4.5], [rx + .3, 6.6, -3], [P.well12.x, 6.6, -3], [P.well12.x, 3, -3]], 1, MAT.pvc, ['Phosphate solution line', '1" SCH 80 PVC', 'Sheet 6'], G.piping, false);
// ---------- YARD PIPING (drawn at grade) ----------
const yy = Y0 + .35;
const w11 = S.wells[0].pos, w12 = S.wells[1].pos;
run([[w11[0], yy, w11[1]], [w11[0], yy, 14], [P.well11.x, yy, 14], [P.well11.x, yy, hz + .3], [P.well11.x, 2.2, hz + .3]], 6, MAT.di, ['Prop. 6" W.M. from Well No. 11', '6" water main', 'Sheets 3, 6', 'Route simplified; buried in field'], G.piping, false);
run([[w12[0], yy, w12[1]], [w12[0], yy, 16], [P.well12.x, yy, 16], [P.well12.x, yy, hz + .3], [P.well12.x, 2.2, hz + .3]], 4, MAT.di, ['Prop. 4" W.M. from Well No. 12', '4" water main', 'Sheets 3, 6', 'Route simplified; buried in field'], G.piping, false);
for (const k of ['well11', 'well12']) run([[P[k].x, 2.2, -hz - .3], [P[k].x, yy, -hz - .3], [P[k].x, yy, -12]], P[k].d, MAT.di, ['Well discharge to GST', `${P[k].d}" DI`, 'Sheet 6'], G.piping, false);
run([[-4.6, yy, -12], [-20, yy, -12], [-20, yy, -67], [-14.5, yy, -67]], 8, MAT.di, ['Prop. 8" W.M. fill line to G.S.T.s', '8" W.M.', 'Sheet 3', 'Fills GST; side/route simplified'], G.piping, false);
run([[-20, yy, -38], [-14.5, yy, -38]], 8, MAT.di, null, G.piping, false);
for (const z of [-38, -67]) { valve([-17, yy, z], 'x', 8, 'gate', ['GST inlet gate valve', '8" gate valve w/ adj. valve box', 'Sheet 3']); run([[-14.5, yy, z], [-14.5, 1, z]], 8, MAT.di, ['GST inlet', '8" 125 lb FL inlet (12" AFF)', 'Sheet 5']); }
run([[4.5, 1, -38], [14, 1, -38], [14, yy, -38], [14, yy, -67], [4.5, yy, -67], [4.5, 1, -67]], 8, MAT.di, ['GST outlet / suction line', '8" W.M. off GST bottom outlet', 'Sheets 3, 5'], G.piping, false);
run([[14, yy, -38], [14, yy, -11], [P.gst_suction_in.x, yy, -11], [P.gst_suction_in.x, yy, -hz - .2], [P.gst_suction_in.x, sh.y, -hz - .2]], 8, MAT.di, ['8" suction to pump station', '8" W.M.', 'Sheets 3, 6'], G.piping, false);
for (const z of [-38, -67]) valve([10, yy, z], 'x', 8, 'gate', ['GST suction-side gate valve', '8" gate valve', 'Sheet 3']);
// distribution to PTs
const pts = S.pressure_tanks, PT = S.pt_dims;
run([[P.to_distribution.x, yy, -9.2], [pts[1].center[0], yy, -9.2]], 8, MAT.di, ['8" header to pressure tanks', 'Prop. 8" W.M.', 'Sheet 3'], G.piping, false);
for (const p of pts) { const [x, z] = p.center;
  run([[x, yy, -9.2], [x - 1.5, yy, -9.2], [x - 1.5, yy, z - 4], [x, yy, z - 4], [x, 1.0, z - 4]], 8, MAT.di, [`${p.name} inlet`, '8" inlet to PT bottom', 'Sheets 3, 4'], G.piping, false);
  valve([x - 1.5, yy, -6], 'z', 8, 'gate', [`Gate valve to ${p.name}`, '8" gate valve', 'Sheet 4']);
  run([[x, 1.0, z + 4], [x, yy, z + 4], [x, yy, 22], [pts[0].center[0], yy, 22]], 8, MAT.di, [`${p.name} outlet to mains`, '8" outlet (no meter/check)', 'Sheets 3, 4'], G.piping, false);
  valve([x, yy, 18], 'z', 8, 'gate', [`${p.name} outlet gate valve`, '8" gate valve', 'Sheet 4']); }
run([[pts[0].center[0], yy, 22], [pts[0].center[0], yy, 52], [-30, yy, 52]], 8, MAT.di, ['Prop. 8" W.M. to distribution', '8" W.M.; tie-in to ex. 3" W.M. (tapping sleeve & valve) / future 8"', 'Sheet 3 inset A'], G.piping, false);
run([[-150, yy, 54], [150, yy, 54]], 3, M(0x6c7a89), ['Existing 3" W.M.', 'Ex. 3" W.M. along FM 1653', 'Sheet 3'], G.piping, false);
// ---------- TANKS ----------
const GD = S.gst_dims, gr = GD.dia / 2, el = v => v - S.site.ffe.v;
for (const t0 of S.gst) { const [x, z] = t0.center, g = new THREE.Group(); G.tanks.add(g);
  if (t0.future) { const m = new THREE.Mesh(new THREE.CylinderGeometry(gr, gr, .3, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .35 })); m.position.set(x, 0, z); g.add(m); tag(g, t0.name, t0.cap + ", FFE 533.00", 'Sheet 3'); label('Future GST', x, 3, z); continue; }
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(gr + 1, gr + 1, 1, 48), MAT.conc); ring.position.set(x, -.3, z); g.add(ring);
  const sh0 = new THREE.Mesh(new THREE.CylinderGeometry(gr, gr, GD.height, 48, 1, true), MAT.tank); sh0.position.set(x, GD.height / 2, z); g.add(sh0);
  const rf = new THREE.Mesh(new THREE.ConeGeometry(gr + .2, 1.6, 48), M(0xdfe3e6)); rf.position.set(x, GD.height + .8, z); g.add(rf);
  tag(g, t0.name, `${t0.cap} welded steel, ${GD.height}' H x ${GD.dia}' dia (AWWA D100)`, 'Sheets 3, 5', `Base 533.00, overflow 556.00, fill off 555.50, fill on 551.50, low alarm 545.00`);
  // ladder
  const lad = new THREE.Group(); g.add(lad); for (const dx of [-.75, .75]) run([[x + dx, 0, z + gr + .6], [x + dx, GD.height + 3, z + gr + .6]], 2, MAT.galv, null, lad, false); for (let yv = 1; yv < GD.height + 3; yv += 1) run([[x - .75, yv, z + gr + .6], [x + .75, yv, z + gr + .6]], .75, MAT.galv, null, lad, false); tag(lad, 'Ladder w/ detachable lower section', 'Steel ladder', 'Sheet 5');
  const ov = run([[x - gr - .4, el(GD.overflow), z], [x - gr - .4, .6, z]], 8, MAT.di, ['8" overflow w/ flap valve', '8" overflow, flap valve at 6" deep gravel', 'Sheet 5'], G.tanks, false);
  const vt = cyl(.45, 1, MAT.galv, g); vt.position.set(x, GD.height + 2, z); tag(vt, '10" vent', '10" dia vent w/ screened openings', 'Sheet 5');
  const ht = box(2.5, .3, 2.5, M(0x8899aa), x + 3, GD.height + .5, z + 5, g); tag(ht, '30"x30" roof hatch', '', 'Sheet 5');
  const mw = cyl(1.25, .4, M(0x8899aa), g); mw.rotation.z = Math.PI / 2; mw.position.set(x + gr + .2, 2.2, z); tag(mw, '30" dia manway', '', 'Sheet 5');
  // electrodes
  const ex = x + 3, ez = z - 3, cpl = cyl(.15, .5, MAT.galv, g); cpl.position.set(ex, GD.height + .3, ez); tag(cpl, '3" coupling & electrode holder', '', 'Sheet 5');
  const E = [['S1 – well OFF', el(GD.fill_off), 'Fill off 555.50 (sheet 5)'], ['S2 – well ON', el(GD.fill_on), 'Fill on 551.50 (sheet 5)'], ['S3 – indicator / low level alarm', el(GD.low_alarm), 'Low alarm 545.00 (sheet 5); indicator role per owner'], ['S4 – emergency', 2.5, "~2.5' up per owner convention – ASSUMED"]];
  E.forEach(([n, h, s], i) => { const e = run([[ex + i * .3, GD.height, ez], [ex + i * .3, h, ez]], .5, MAT.black, [n, `Electrode tip el. ${(h + 533).toFixed(2)}`, 'Sheet 5 / owner', s], G.tanks, false); const tip = new THREE.Mesh(new THREE.SphereGeometry(.15), MAT.red); tip.position.set(ex + i * .3, h, ez); e.add(tip); });
  label(t0.name + ' 50K', x, GD.height + 4, z); }
for (const p of pts) { const [x, z] = p.center, g = new THREE.Group(); G.tanks.add(g); const cy = 4.5;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(PT.dia / 2, PT.len - PT.dia, 12, 32), MAT.pt); body.rotation.x = Math.PI / 2; body.position.set(x, cy, z); g.add(body);
  for (const dz of [-7, 7]) box(5, cy - 1.5, 1, MAT.conc, x, (cy - 1.5) / 2 + Y0, z + dz, g);
  tag(g, p.name, `${PT.cap}, ${PT.dia}'Ø x ${PT.len}' long`, 'Sheets 3, 4', `${PT.inlet}; ${PT.prv}; level ${PT.level}`);
  const mh = cyl(1.25, .5, MAT.pt, g); mh.position.set(x, cy + 3.1, z); tag(mh, '30" dia inspection manway', '', 'Sheet 4');
  label(p.name + ' 5,000 gal', x, cy + 5, z); }
// PT top lines -> building (PT No.1)
{ const [x, z] = pts[0].center, top = 4.5 + 3, yl = 7.4;
  valve([x - .5, top + .4, z - 5], 'y', .75, 'ball', ['Brass ball valve (level control line)', '3/4" brass ball valve', 'Sheet 4 (3/4" G.I.P.)', 'Owner convention calls 1"; sheet note governs']);
  run([[x - .5, top - .1, z - 5], [x - .5, top + 1, z - 5], [x - .5, yl, z - 5], [hx - .2, yl, -4.2], [hx - .6, yl, -4.2], [hx - .6, 6, -4.2]], .75, MAT.galv, ['3/4" G.I.P. to level control', 'Mercoid + gauge + Visiprobe sight tube', 'Sheet 4'], G.piping, false);
  valve([x + .5, top + .4, z - 5], 'y', .75, 'ball', ['Brass ball valve (air line)', '3/4" brass ball valve', 'Sheet 4']);
  run([[x + .5, top - .1, z - 5], [x + .5, top + 1.3, z - 5], [x + .5, yl + .5, -6], [hx - .2, yl + .5, -6], [13.5, yl + .5, -6], [13.5, 4.5, -6]], .75, MAT.galv, ['3/4" G.I.P. air line to compressor', 'Galvanized', 'Sheet 4'], G.piping, false);
  const prv = valve([20, yl + .5 + .01, -5.95], 'x', 2, 'ball', ['Pressure relief valve (outside)', '2" PRV set 10 psi above system', 'Sheet 4', 'On air line outside per owner convention']); prv.children[0].material = M(0xd8b02a);
  run([[x, 1.0, z], [x, .6, z], [hx + .4, .6, z], [hx + .4, .6, -1.5], [hx - .6, .6, -1.5], [hx - .6, 1.2, -1.5]], .75, MAT.galv, ['Sight tube bottom tie to PT bottom center', '3/4" G.I.P.', 'Owner convention', 'ASSUMED route'], G.piping, false); }
// ---------- ELECTRICAL / CONTROLS ----------
{ const g = G.electrical;
  tag(box(9.5, 6, 1, MAT.panel, 9.8, 3.5, hz - t - .5, g), 'Electrical panels (south wall)', 'VFDs, MCC, distribution', 'Sheets 6, E-series');
  tag(box(1, 6, 8, MAT.panel, hx - t - .5, 3.5, 3.5, g), 'Electrical panels (east wall)', 'Panels per E sheets', 'Sheets 6, E-series');
  const tp = box(3, 4, .8, M(0xeaeaea), 4, 4, hz - t - .4, g); tag(tp, 'Pump control panel', 'Turner Controls 625D-style', 'Owner convention', 'Panel style ASSUMED – E sheets for actual');
  box(.2, .2, .05, M(0x22aa22), 3.4, 5.2, hz - t - .82, tp.parent === g ? g : g); box(.2, .2, .05, MAT.red, 4.0, 5.2, hz - t - .82, g); box(.2, .2, .05, M(0xffbb00), 4.6, 5.2, hz - t - .82, g);
  const ac = box(1.6, 3, 2.8, M(0x5a6570), 13.6, 1.5, -5.6, g); tag(ac, 'Air compressor', '3 HP, 125 psi (Kellogg/equal)', 'Sheet 6 air compressor schedule');
  const mc = box(.6, .9, .4, M(0x6b6b6b), hx - t - .25, 5.6, -2.6, g); tag(mc, 'Mercoid pressure switch + gauge', '', 'Owner convention', 'Sheet 6 "sight glass & pressure controls" location');
  const st = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, 5.2, 10), MAT.glass); st.position.set(hx - t - .3, 3.8, -1.5); g.add(st);
  tag(st, 'Visiprobe sight tube', 'Electrodes: pump off, pump 1 on, pump 2 on, emergency', 'Sheet 6 / owner', 'Heights from sheet 4: 48" off, 28" P1 on, 22" P2 on, 12/16" alarm');
  [[48, 'All pumps off'], [28, 'Pump 1 on (lead)'], [22, 'Pump 2 on (lag)'], [12, 'Alarm/emergency']].forEach(([inch, n]) => { const e = box(.2, .06, .2, MAT.red, hx - t - .3, 1.2 + inch / 72 * 5.2 * .9, -1.5, g); tag(e, 'Sight tube electrode – ' + n, `${inch}" level`, 'Sheet 4'); });
  const gn = new THREE.Group(); g.add(gn); const [gx, gz] = S.generator.pos, [gw, gl] = S.generator.size;
  box(gw + 1, .5, gl + 1, MAT.conc, gx, Y0 + .25, gz, gn); box(gw, 5, gl, MAT.gen, gx, Y0 + 3, gz, gn); const ex2 = cyl(.25, 2, M(0x333333), gn); ex2.position.set(gx, Y0 + 6.2, gz - gl / 2 + 1);
  tag(gn, 'Standby generator', S.generator.desc, 'Sheets E2, E5 schedule', 'Pad/enclosure size ASSUMED');
  const pole = cyl(.5, 30, MAT.wood, g); pole.position.set(...[S.site.utility_pole.pos[0], 15, S.site.utility_pole.pos[1]]); tag(pole, 'Proposed utility pole / service', '', 'Sheet E2');
  for (const w of S.wells) { const wg = new THREE.Group(); G.equip.add(wg); box(6, .5, 6, MAT.conc, w.pos[0], Y0 + .25, w.pos[1], wg); const c = cyl(.6, 3, MAT.galv, wg); c.position.set(w.pos[0], Y0 + 1.5, w.pos[1]); tag(wg, w.name, 'Well head (by others)', w.src, w.note || 'Well head detail sheet 7'); label(w.name.split(' (')[0], w.pos[0], 6, w.pos[1]); }
  label('Generator 150 kW', gx, 8, gz);
}
// ---------- CAMERA / CONTROLS ----------
const orbit = new OrbitControls(camera, renderer.domElement); orbit.enableDamping = true; orbit.maxPolarAngle = Math.PI * .495; orbit.minDistance = 3; orbit.maxDistance = 600; orbit.screenSpacePanning = false;
orbit.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
const views = { out: [V(95, 70, 95), V(5, 2, -15)], inn: [V(-3.5, 6.3, 6.5), V(5, 2.5, -3.5)] };
function setView(k) { setWalk(false); if (k === 'inn') $('info').classList.add('hide'); const [p, tg] = views[k]; camera.position.copy(p); orbit.target.copy(tg); orbit.update(); setVis('roof', k !== 'inn'); }
let walk = false, yaw = 0, pitch = 0; const keys = {}, joy = { x: 0, y: 0 };
function setWalk(on) { walk = on; orbit.enabled = !on; $('vWalk').classList.toggle('on', on); $('joy').style.display = on && matchMedia('(pointer:coarse)').matches ? 'block' : 'none';
  if (on) { camera.position.set(0, 5.5, 13); closeCard(); $('info').classList.add('hide'); yaw = 0; pitch = 0; setVis('roof', false); hint(matchMedia('(pointer:coarse)').matches ? 'Joystick to walk · drag to look' : 'WASD / arrows to walk · drag to look · Q/E up/down'); } }
let hintT; function hint(s) { const h = $('hint'); h.textContent = s; h.style.display = 'block'; clearTimeout(hintT); hintT = setTimeout(() => h.style.display = 'none', 3500); }
addEventListener('keydown', e => keys[e.code] = true); addEventListener('keyup', e => keys[e.code] = false);
// look-drag (walk) + tap pick
const cv = renderer.domElement; let down = null;
cv.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now(), lx: e.clientX, ly: e.clientY, id: e.pointerId }; });
cv.addEventListener('pointermove', e => { if (!down || !walk || e.pointerId !== down.id) return; yaw -= (e.clientX - down.lx) * .005; pitch = Math.max(-1.3, Math.min(1.3, pitch - (e.clientY - down.ly) * .005)); down.lx = e.clientX; down.ly = e.clientY; });
cv.addEventListener('pointerup', e => { if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 7 && performance.now() - down.t < 500) pick(e); down = null; });
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let hl = null;
const visible = o => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
function pick(e) { ndc.set(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1); ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(scene.children, true).filter(h => visible(h.object) && h.object !== ground && h.object.material && h.object.material.opacity !== .35);
  for (const h of hits) { let o = h.object; while (o && !o.userData.info) o = o.parent; if (!o) continue; if (o === ground) continue; return showCard(o); } closeCard(); }
function showCard(o) { const i = o.userData.info; $('cardB').innerHTML = `<h3>${i.name}</h3>${i.size ? `<p>${i.size}</p>` : ''}<p><b>Source:</b> ${i.src}</p>${i.extra ? `<p class="tag">${i.extra}</p>` : ''}`; $('card').style.display = 'block';
  if (hl) hl.remove(); const bb = new THREE.Box3().setFromObject(o); hl = new THREE.Box3Helper(bb, 0xffd400); scene.add(hl); }
function closeCard() { $('card').style.display = 'none'; if (hl) { hl.remove(); hl = null; } }
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => b.dataset.close === 'card' ? closeCard() : $('info').classList.add('hide'));
$('iBtn').onclick = () => $('info').classList.toggle('hide');
if (matchMedia('(max-width:700px)').matches) $('info').classList.add('hide');
// joystick
{ const j = $('joy'), k = $('knob'); let jid = null; const upd = e => { const r = j.getBoundingClientRect(); let dx = e.clientX - r.left - 60, dy = e.clientY - r.top - 60; const l = Math.hypot(dx, dy); if (l > 45) { dx *= 45 / l; dy *= 45 / l; } joy.x = dx / 45; joy.y = dy / 45; k.style.left = 35 + dx + 'px'; k.style.top = 35 + dy + 'px'; };
  j.addEventListener('pointerdown', e => { jid = e.pointerId; j.setPointerCapture(jid); upd(e); e.stopPropagation(); });
  j.addEventListener('pointermove', e => { if (e.pointerId === jid) upd(e); });
  const end = () => { jid = null; joy.x = joy.y = 0; k.style.left = k.style.top = '35px'; }; j.addEventListener('pointerup', end); j.addEventListener('pointercancel', end); }
// toggles
const vis = { roof: true, walls: true, piping: true, electrical: true, tanks: true, labels: false };
function setVis(k, v) { vis[k] = v; if (G[k]) G[k].visible = v; if (k === 'piping') G.equip.visible = true; if (k === 'labels') $('lbls').style.display = v ? 'block' : 'none'; document.querySelector(`[data-t="${k}"]`)?.classList.toggle('on', v); }
document.querySelectorAll('[data-t]').forEach(b => b.onclick = () => setVis(b.dataset.t, !vis[b.dataset.t]));
setVis('labels', false);
$('vOut').onclick = () => setView('out'); $('vIn').onclick = () => setView('inn'); $('vWalk').onclick = () => walk ? setView('out') : setWalk(true); $('vReset').onclick = () => { for (const k of ['walls', 'piping', 'electrical', 'tanks']) setVis(k, true); closeCard(); setView('out'); };
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.fov = camera.aspect < .8 ? 62 : 50; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize(); setView('out');
const clock = new THREE.Clock(), tmp = V(0, 0, 0);
renderer.setAnimationLoop(() => { const dt = Math.min(clock.getDelta(), .05);
  if (walk) { const f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - joy.y, s = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + joy.x, sp = (keys.ShiftLeft ? 20 : 8) * dt;
    camera.position.x += (-Math.sin(yaw) * f + Math.cos(yaw) * s) * sp; camera.position.z += (-Math.cos(yaw) * f - Math.sin(yaw) * s) * sp; camera.position.y = Math.max(1.5, camera.position.y + ((keys.KeyE ? 1 : 0) - (keys.KeyQ ? 1 : 0)) * sp);
    camera.rotation.set(pitch, yaw, 0, 'YXZ'); } else orbit.update();
  renderer.render(scene, camera);
  if (vis.labels) for (const l of LBL) { tmp.copy(l.p).project(camera); const on = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1; l.e.style.display = on ? 'block' : 'none'; if (on) { l.e.style.left = (tmp.x + 1) / 2 * innerWidth + 'px'; l.e.style.top = (1 - tmp.y) / 2 * innerHeight + 'px'; } } });
window.__ready = true;

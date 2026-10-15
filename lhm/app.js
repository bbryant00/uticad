import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';
const S = await (await fetch('spec.json')).json();
const $ = id => document.getElementById(id);
const MOBILE = matchMedia('(pointer:coarse)').matches;
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true, powerPreference: 'high-performance' });
const PR0 = Math.min(devicePixelRatio, 2); renderer.setPixelRatio(PR0); renderer.localClippingEnabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true; // static scene: shadow map rendered once / on visibility change
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcfe0ee); scene.fog = new THREE.Fog(0xcfe0ee, 450, 1000);
{ const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = .55; pm.dispose(); }
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 3000);
scene.add(new THREE.HemisphereLight(0xeef4ff, 0x6b5a40, .9));
const sun = new THREE.DirectionalLight(0xfff4e0, 2.6); sun.position.set(70, 120, 60); sun.target.position.set(5, 0, -20); scene.add(sun, sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(MOBILE ? 1024 : 2048, MOBILE ? 1024 : 2048); Object.assign(sun.shadow.camera, { left: -75, right: 75, top: 75, bottom: -75, near: 10, far: 300 }); sun.shadow.bias = -.0005; sun.shadow.normalBias = .04;
const G = {}; for (const k of ['site', 'walls', 'roof', 'piping', 'electrical', 'tanks', 'equip']) { G[k] = new THREE.Group(); scene.add(G[k]); }
const keyOf = g => { for (; g; g = g.parent) for (const k in G) if (G[k] === g) return k; return 'piping'; };
const M = (c, r = .7, m = .1, x = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...x });
const MAT = { di: M(0x7b3a24, .72, .25), red: M(0xa8261c, .5, .3), black: M(0x18191b, .5, .45), blue: M(0x1f5fbf, .45, .3), brass: M(0xc9a23a, .3, .9), galv: M(0xb9c0c6, .38, .85), bolt: M(0x6a6f74, .45, .8), cmu: M(0xd8d2c4, .9, 0), conc: M(0xb9b6ae, .9, 0), roof: M(0x7f8c96, .5, .5), steel: M(0x3a4148, .55, .5),
  grass: M(0x7fa35a, .95, 0, { transparent: true, opacity: .5, depthWrite: false }), gravel: M(0xc8c0ae, .95, 0, { transparent: true, opacity: .55, depthWrite: false }), soil: M(0x4f5e38, 1, 0),
  tank: M(0xf6f7f5, .45, .1, { side: THREE.DoubleSide }), pump: M(0x2c5a8c, .4, .35), motor: M(0xc9a43c, .38, .55), guard: M(0xf0a020, .5, .2), panel: M(0xc9ccd0, .5, .3), gen: M(0xb8b33a, .5, .3),
  pvc: M(0xf4f4f1, .42, 0), gpvc: M(0x6c7176, .5, 0), cl: M(0x8e9399, .45, .5), door: M(0x8d9aa6, .5, .4), glass: M(0x9fd3ff, .1, .1, { transparent: true, opacity: .45 }), acryl: M(0xe8f4ff, .05, 0, { transparent: true, opacity: .22, depthWrite: false, side: THREE.DoubleSide }), water: M(0x3d8fd6, .2, 0, { transparent: true, opacity: .45, depthWrite: false }),
  fence: M(0x9aa0a6, .5, .7), wood: M(0x8a6a44, .9, 0), white: M(0xf7f7f7, .5, .05), dark: M(0x2a2d31, .6, .3), ss: M(0xd5d9dc, .25, .95), hose: M(0xc4c8cc, .55, .7) };
// ---- BOM (computed from builder calls) + flow paths ----
const BOM = new Map(), FLOWP = [], DYNM = new Set();
function bom(cat, item, size = '', q = 1, unit = 'ea') { const k = [cat, item, size, unit].join('|'); const e = BOM.get(k) || { cat, item, size, q: 0, unit }; e.q += q; BOM.set(k, e); }
const SZ = d => ({ .5: '1/2"', .75: '3/4"' })[d] || d + '"';
const PIPEN = new Map([[MAT.di, 'Ductile iron pipe, flanged (FL DI)'], [MAT.pvc, 'PVC pipe, buried, push-on'], [MAT.gpvc, 'PVC Sch 80 (gray)'], [MAT.galv, 'Galvanized steel pipe (GIP)'], [MAT.brass, 'Brass nipple']]);
const fpath = (pts, s, c, r = .2) => FLOWP.push({ p: pts.map(a => a.isVector3 ? a.clone() : new THREE.Vector3(...a)), s, c, r });
const Y0 = S.site.grade.y, YB = Y0 - 3.5; // buried pipe centerline: ~3 ft cover
const V = (x, y, z) => new THREE.Vector3(x, y, z), UP = V(0, 1, 0), X1 = V(1, 0, 0), Z1 = V(0, 0, 1);
const v3 = a => a.isVector3 ? a.clone() : V(...a);
function tag(o, name, size, src, extra) { o.userData.info = { name, size, src, extra }; return o; }
function box(w, h, d, mat, x, y, z, g) { const m = new THREE.Mesh(gc('b' + w + h + d, () => new THREE.BoxGeometry(w, h, d)), mat); m.position.set(x, y, z); (g || G.equip).add(m); return m; }
const GC = new Map(); function gc(k, f) { let g = GC.get(k); if (!g) { g = f(); GC.set(k, g); } return g; }
function cyl(r, h, mat, g, seg = 24) { const m = new THREE.Mesh(gc(`c${r},${h},${seg}`, () => new THREE.CylinderGeometry(r, r, h, seg)), mat); (g || G.equip).add(m); return m; }
function orient(m, a, b) { const d = b.clone().sub(a); m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); }
const OD = { .5: .84, .75: 1.05, 1: 1.315, 1.5: 1.9, 2: 2.375, 2.5: 2.875, 3: 3.96, 4: 4.8, 6: 6.9, 8: 9.05 };
const rOD = d => (OD[d] || d * 1.1) / 24;
// 125# flange: OD, thk, bolt circle, n bolts, bolt dia (in)
const FL = { 2: [6, .75, 4.75, 4, .625], 3: [7.5, .94, 6, 4, .625], 4: [9, .94, 7.5, 8, .625], 6: [11, 1, 9.5, 8, .75], 8: [13.5, 1.12, 11.75, 8, .75] };
const ucyl = (r, seg) => gc(`u${r.toFixed(4)},${seg}`, () => new THREE.CylinderGeometry(r, r, 1, seg));
function seg(a, b, r, mat, parent, sg = 16) { const L = a.distanceTo(b); if (L < 1e-3) return; const m = new THREE.Mesh(ucyl(r, sg), mat); orient(m, a, b); m.scale.y = L; parent.add(m); return m; }
function lm(parent, geo, mat, pos, dir) { const m = new THREE.Mesh(geo, mat); m.position.copy(pos); if (dir) m.quaternion.setFromUnitVectors(UP, dir.clone().normalize()); parent.add(m); return m; }
// ---- instanced bolts / nuts (one InstancedMesh per top-level group) ----
const BOLT = {}, _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _s = V(1, 1, 1);
function perp(dir) { const u = Math.abs(dir.y) < .9 ? UP.clone().cross(dir).normalize() : X1.clone().cross(dir).normalize(); return [u, dir.clone().cross(u).normalize()]; }
function bolts(gk, frame, c, dir, bc, n, thick, bd) {
  const A = BOLT[gk] || (BOLT[gk] = []); _q.setFromUnitVectors(UP, dir); const [u, v] = perp(dir); bom('Hardware', 'Bolt w/ 2 hex nuts', (Math.round(bd * 12 * 8) / 8) + '" dia', n);
  for (let i = 0; i < n; i++) { const a = (i + .5) / n * Math.PI * 2, p = c.clone().addScaledVector(u, Math.cos(a) * bc).addScaledVector(v, Math.sin(a) * bc);
    A.push(frame.clone().multiply(_m.clone().compose(p, _q, V(bd * .45, thick + bd * 1.7, bd * .45))));
    for (const s of [-1, 1]) A.push(frame.clone().multiply(_m.clone().compose(p.clone().addScaledVector(dir, s * (thick / 2 + bd * .38)), _q, V(bd * .85, bd * .75, bd * .85)))); }
}
const IDM = new THREE.Matrix4();
function flange(parent, frame, p, dir, d, mat, gk, joint) { const F = FL[d]; if (!F) return; const t = F[1] / 12 * (joint ? 2 : 1);
  lm(parent, gc(`fl${d}${joint}`, () => new THREE.CylinderGeometry(F[0] / 24, F[0] / 24, t, 28)), mat, p, dir);
  bolts(gk, frame, p, dir.clone().normalize(), F[2] / 24, F[3], t, F[4] / 12); }
class Arc extends THREE.Curve { constructor(R) { super(); this.R = R; } getPoint(t, o = new THREE.Vector3()) { const a = t * Math.PI / 2; return o.set(-this.R + this.R * Math.sin(a), this.R - this.R * Math.cos(a), 0); } }
const _mx = new THREE.Matrix4();
// pipe run through points (d inches). Elbows = curved tubes; DI gets flanged joints; PVC/threaded get socket collars.
function run(pts, d, mat, info, g = G.piping, o = {}) {
  const P = pts.map(v3), r = rOD(d), grp = new THREE.Group(); g.add(grp); const gk = keyOf(g);
  const mj = !!o.mj, fl = o.fl ?? (mat === MAT.di && d >= 2), ef = o.ef ?? !!fl, col = !mj && (o.col ?? ((mat === MAT.pvc || mat === MAT.gpvc || mat === MAT.galv) && d < 9 && !fl));
  const sg = d >= 4 ? 20 : d >= 2 ? 14 : 10, R0 = mj ? r * 1.5 : o.R ?? (fl ? r * 2.1 : col ? r * 2.4 : r * 2), em = mj ? MAT.black : mat;
  if (o.flow) fpath(o.rev ? [...P].reverse() : P, o.flow, o.on, r);
  const tr = P.map(() => 0), dirs = []; for (let i = 0; i < P.length - 1; i++) dirs.push(P[i + 1].clone().sub(P[i]).normalize());
  for (let i = 1; i < P.length - 1; i++) { if (dirs[i - 1].dot(dirs[i]) > .999) continue; tr[i] = Math.min(R0, P[i].distanceTo(P[i - 1]) * .45, P[i].distanceTo(P[i + 1]) * .45); }
  const collar = (p, dir) => { const m = lm(grp, ucyl(r * 1.17, sg), mat, p, dir); m.scale.y = r * 1.5; };
  for (let i = 0; i < P.length - 1; i++) { const a = P[i].clone().addScaledVector(dirs[i], tr[i]), b = P[i + 1].clone().addScaledVector(dirs[i], -tr[i + 1]);
    // MJ runs: vertical end legs are the DI riser continuing below grade into the MJ bell; PVC only on horizontals
    const diLeg = mj && (i === 0 || i === P.length - 2) && Math.abs(dirs[i].y) > .99; seg(a, b, r, diLeg ? MAT.di : mat, grp, sg);
    if (!o.nobom) { const nm = diLeg ? 'Ductile iron riser, PE x MJ (below-grade leg)' : mat === MAT.pvc && d <= 1 ? 'PVC pipe, buried, solvent-weld' : PIPEN.get(mat) || (mat === MAT.tank ? null : 'Existing water main (not new work)'); if (nm) bom('Pipe', nm, SZ(d), P[i].distanceTo(P[i + 1]), 'LF'); }
    if (mj && !diLeg) { const L = a.distanceTo(b); for (let k = 18; k < L - 3; k += 18) pbell(grp, a.clone().addScaledVector(dirs[i], k), dirs[i], d); } }
  for (let i = 1; i < P.length - 1; i++) { if (!tr[i]) continue; const a = dirs[i - 1], b = dirs[i], R = tr[i], c = P[i];
    let m; if (Math.abs(a.dot(b)) < 1e-3) { m = new THREE.Mesh(gc(`el${r.toFixed(4)},${R.toFixed(3)},${sg}`, () => new THREE.TubeGeometry(new Arc(R), 10, r, sg)), em); m.quaternion.setFromRotationMatrix(_mx.makeBasis(a, b, a.clone().cross(b))); m.position.copy(c); }
    else m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(c.clone().addScaledVector(a, -R), c, c.clone().addScaledVector(b, R)), 8, r, sg), em);
    grp.add(m); const e0 = c.clone().addScaledVector(a, -R), e1 = c.clone().addScaledVector(b, R);
    if (!o.nobom && mat !== MAT.tank) { const deg = Math.round(Math.acos(Math.max(-1, Math.min(1, a.dot(b)))) * 180 / Math.PI / 11.25) * 11.25; bom('Fittings', mj ? `${deg}° MJ bend w/ restraint glands (DI)` : ef ? `${deg}° flanged bend (DI)` : col ? `${deg}° ${mat === MAT.galv ? 'galv. threaded' : mat === MAT.gpvc ? 'Sch 80 PVC socket' : 'socket'} elbow` : `${deg}° elbow (${mat === MAT.brass ? 'brass' : 'solvent-weld'})`, SZ(d)); }
    if (mj) { mjEnd(grp, e0, a.clone().negate(), d, gk); mjEnd(grp, e1, b, d, gk); }
    else if (ef) { flange(grp, IDM, e0, a, d, mat, gk, true); flange(grp, IDM, e1, b, d, mat, gk, true); } else if (col) { collar(e0, a); collar(e1, b); } }
  const n = P.length - 1, F = FL[d], ft = F ? F[1] / 12 : 0;
  if (fl === true || fl === 'a') flange(grp, IDM, P[0].clone().addScaledVector(dirs[0], ft / 2), dirs[0], d, mat, gk);
  if (fl === true || fl === 'b') flange(grp, IDM, P[n].clone().addScaledVector(dirs[n - 1], -ft / 2), dirs[n - 1], d, mat, gk);
  if (o.blind) for (const [p, dr] of o.blind === 'b' ? [[P[n], dirs[n - 1]]] : [[P[0], dirs[0].clone().negate()], [P[n], dirs[n - 1]]]) lm(grp, gc('bf' + d, () => new THREE.CylinderGeometry(F[0] / 24, F[0] / 24, ft, 28)), mat, p.clone().addScaledVector(dr, ft * 1.5), dr);
  if (info) tag(grp, ...info); return grp;
}
// buried white PVC (>1": push-on bells + black DI MJ fittings w/ restraint glands; <=1": solvent-weld)
const U = (pts, d, info, fo = {}) => run(pts, d, MAT.pvc, info, G.piping, { ...(d > 1 ? { mj: true } : { R: rOD(d) * 3 }), ...fo });
// PVC push-on bell
function pbell(g, p, dir, d) { const r = rOD(d); bom('Fittings', 'PVC push-on bell joint', SZ(d)); lm(g, gc('pb' + d, () => new THREE.CylinderGeometry(r * 1.2, r * 1.2, r * 1.4, 20)), MAT.pvc, p, dir);
  lm(g, gc('pbt' + d, () => new THREE.CylinderGeometry(r * 1.2, r, r * .4, 20)), MAT.pvc, p.clone().addScaledVector(dir, r * .9), dir); }
// MJ bell end on a DI fitting: e = fitting end, out = direction toward the pipe. bell + MJ gland (T-bolts) + wedge restraint gland (actuating screws)
function mjEnd(g, e, out, d, gk) { const r = rOD(d), o = out.clone().normalize(), nb = d >= 6 ? 6 : 4, [u, v] = perp(o);
  lm(g, gc('mjb' + d, () => new THREE.CylinderGeometry(r * 1.42, r * 1.32, r * 1.1, 22)), MAT.black, e.clone().addScaledVector(o, r * .55), o);
  const gp = e.clone().addScaledVector(o, r * 1.18); lm(g, gc('mjg' + d, () => new THREE.CylinderGeometry(r * 1.78, r * 1.78, r * .2, 6 * nb)), MAT.black, gp, o);
  bolts(gk, IDM, gp, o, r * 1.6, nb, r * .2 + r * .5, Math.max(.05, r * .16));
  const wp = e.clone().addScaledVector(o, r * 1.62); lm(g, gc('mjw' + d, () => new THREE.CylinderGeometry(r * 1.42, r * 1.48, r * .5, 22)), MAT.black, wp, o);
  for (let i = 0; i < nb; i++) { const a = i / nb * Math.PI * 2, rd = u.clone().multiplyScalar(Math.cos(a)).addScaledVector(v, Math.sin(a));
    lm(g, gc('mjs' + d, () => new THREE.CylinderGeometry(r * .1, r * .1, r * .4, 8)), MAT.black, wp.clone().addScaledVector(rd, r * 1.6), rd);
    lm(g, gc('mjn' + d, () => new THREE.CylinderGeometry(r * .16, r * .16, r * .14, 6)), MAT.bolt, wp.clone().addScaledVector(rd, r * 1.85), rd); } }
// buried MJ tee (black DI) – header through, branch dir; branch may be smaller (db)
function mjTee(p, hdr, dir, d, db = d) { p = v3(p); const r = rOD(d), rb = rOD(db), hl = r * 2.4, bl = r * 2.2, grp = new THREE.Group(); G.piping.add(grp);
  seg(p.clone().addScaledVector(hdr, -hl), p.clone().addScaledVector(hdr, hl), r * 1.08, MAT.black, grp, 20); seg(p, p.clone().addScaledVector(dir, bl), rb * 1.08, MAT.black, grp, 20);
  lm(grp, gc('mjtb' + d, () => new THREE.SphereGeometry(r * 1.14, 16, 10)), MAT.black, p);
  mjEnd(grp, p.clone().addScaledVector(hdr, -hl), hdr.clone().negate(), d, 'piping'); mjEnd(grp, p.clone().addScaledVector(hdr, hl), hdr, d, 'piping'); mjEnd(grp, p.clone().addScaledVector(dir, bl), dir, db, 'piping');
  bom('Fittings', 'MJ tee w/ restraint glands (DI)', db !== d ? `${d}"x${db}"` : SZ(d));
  return tag(grp, `${d}"${db !== d ? 'x' + db + '"' : ''} MJ tee (buried)`, 'Black ductile-iron mechanical-joint tee, MJ glands w/ T-bolts + wedge restraint glands (Megalug-style) on each bell', 'Owner convention', 'No glued fittings on buried PVC >1"'); }
function mjCap(p, out, d) { p = v3(p); const r = rOD(d), grp = new THREE.Group(); G.piping.add(grp); mjEnd(grp, p, out.clone().negate(), d, 'piping');
  lm(grp, gc('mjc' + d, () => new THREE.CylinderGeometry(r * 1.3, r * 1.3, r * .5, 22)), MAT.black, p.clone().addScaledVector(out, r * .1), out); bom('Fittings', 'MJ plug w/ restraint gland (DI)', SZ(d)); return tag(grp, `${d}" MJ plug (buried)`, 'DI MJ plug w/ restraint gland', 'ASSUMED'); }
// flanged DI tee (flanges on all three ends). Returns center-to-face length.
const TL = d => FL[d][0] / 24 + .12;
function tee(p, hdrDir, dir, d, len, mat, g = G.piping) { p = v3(p); const r = rOD(d), grp = new THREE.Group(), hl = TL(d), ft = FL[d][1] / 12, gk = keyOf(g); g.add(grp); len = Math.max(len, hl);
  seg(p.clone().addScaledVector(hdrDir, -hl), p.clone().addScaledVector(hdrDir, hl), r * 1.06, mat, grp, 20); seg(p, p.clone().addScaledVector(dir, len), r * 1.06, mat, grp, 20);
  lm(grp, gc('tb' + d, () => new THREE.SphereGeometry(r * 1.12, 16, 10)), mat, p);
  for (const [q, dd] of [[p.clone().addScaledVector(hdrDir, -hl + ft / 2), hdrDir], [p.clone().addScaledVector(hdrDir, hl - ft / 2), hdrDir], [p.clone().addScaledVector(dir, len - ft / 2), dir]]) flange(grp, IDM, q, dd, d, mat, gk);
  bom('Fittings', 'Flanged tee, 125# (DI)', SZ(d));
  return tag(grp, `${d}" flanged tee`, `${d}" 125# FL DI tee, flanged all three ends`, 'Sheet 6'); }
// wall sleeve + seal ring
function sleeve(p, dir, d, g = G.piping) { const r = rOD(d); bom('Fittings', 'Wall sleeve w/ link seal', SZ(d)); lm(g, gc('sl' + d, () => new THREE.CylinderGeometry(r * 1.45, r * 1.45, .74, 20)), MAT.dark, v3(p), dir); }
const dOf = r => +Object.keys(OD).find(k => Math.abs(rOD(+k) - r) < 1e-6);
function reducer(a, b, r1, r2, ecc, mat, g = G.piping) { bom('Fittings', ecc ? 'Eccentric reducer, flanged (DI)' : 'Concentric reducer/increaser, flanged (DI)', `${Math.max(dOf(r1), dOf(r2))}"x${Math.min(dOf(r1), dOf(r2))}"`); a = v3(a); b = v3(b); const L = a.distanceTo(b), dir = b.clone().sub(a).normalize();
  const geo = gc(`rd${r1}${r2}${L}${ecc}`, () => { const q = new THREE.CylinderGeometry(r2, r1, L, 22, 4); if (ecc) { const p = q.attributes.position; for (let i = 0; i < p.count; i++) { const t = (p.getY(i) + L / 2) / L, rr = r1 + (r2 - r1) * t; p.setX(i, p.getX(i) + (r1 - rr)); } q.computeVertexNormals(); } return q; });
  const xa = (Math.abs(dir.y) < .9 ? UP : X1).clone().projectOnPlane(dir).normalize(); const m = new THREE.Mesh(geo, mat); m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromRotationMatrix(_mx.makeBasis(xa, dir, xa.clone().cross(dir))); g.add(m); return m; }
// ---------- VALVES (local frame: pipe axis = +X, stem = +Y) ----------
function frameGroup(p, ax, up, g) { const a = (typeof ax === 'string' ? { x: X1, y: UP, z: Z1 }[ax] : ax).clone().normalize();
  up = (up || (Math.abs(a.y) > .9 ? X1 : UP)).clone(); const z = a.clone().cross(up).normalize(); up = z.clone().cross(a);
  const grp = new THREE.Group(); grp.position.copy(v3(p)); grp.quaternion.setFromRotationMatrix(_mx.makeBasis(a, up, z)); g.add(grp); grp.updateMatrix(); return [grp, grp.matrix.clone()]; }
function valve(p, ax, d, kind, info, g = G.piping, up, o = {}) {
  const [grp, fr] = frameGroup(p, ax, up, g), gk = keyOf(g), r = rOD(d), F = FL[d];
  bom('Valves', kind === 'gate' ? (o.buried ? 'Gate valve, buried, w/ adj. valve box' : 'Gate valve, flanged, NRS resilient wedge') : kind === 'check' ? (/silent/i.test(info?.[0] || '') ? 'Silent check valve, flanged' : 'Swing check valve, flanged') : o.mat === MAT.gpvc ? 'Ball valve, PVC Sch 80' : 'Ball valve, brass', SZ(d));
  const L = o.L ?? (kind === 'check' ? Math.max(.5, (d * 1.5 + 3) / 12) : kind === 'ball' ? Math.max(.22, d * .14 + .12) : Math.max(.4, (d + 3.5) / 12));
  const ft = F ? F[1] / 12 : 0, add = (geo, mat, pos, dir) => lm(grp, geo, mat, pos, dir);
  if (kind === 'gate' || kind === 'check') {
    const bm = kind === 'check' ? MAT.blue : MAT.red;
    for (const s of [-1, 1]) flange(grp, fr, V(s * (L / 2 - ft / 2), 0, 0), X1, d, bm, gk);
    add(gc('vb' + d + L, () => new THREE.CylinderGeometry(r * 1.12, r * 1.12, L - ft * 1.5, 20)), bm, V(0, 0, 0), X1);
    if (kind === 'gate') { // compact resilient-wedge, non-rising stem: short rounded bolted bonnet, handwheel right on bonnet
      const fr0 = F ? F[0] / 24 : r * 1.6, bt = Math.max(.04, r * .14);
      add(gc('gcb' + d, () => new THREE.SphereGeometry(r * 1.32, 22, 14)), bm, V(0, 0, 0)).scale.set(Math.min(1, (L - ft * 2) / (r * 2.64)), 1, .9);
      const ch = add(gc('gc' + d, () => new THREE.CylinderGeometry(r * 1.05, r * 1.25, r * .9, 22)), bm, V(0, r * .7, 0)); ch.scale.z = .78;
      const yb = r * 1.15; const bf = add(gc('gbf' + d, () => new THREE.CylinderGeometry(r * 1.3, r * 1.3, bt, 24)), bm, V(0, yb, 0)); bf.scale.z = .8;
      bolts(gk, fr, V(0, yb, 0), UP, r * 1.12, d >= 6 ? 8 : 6, bt, Math.min(.055, F ? F[4] / 12 * .8 : .04));
      const bon = add(gc('gbn' + d, () => new THREE.SphereGeometry(r * 1.12, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2)), bm, V(0, yb + bt / 2, 0)); bon.scale.set(1, .62, .8);
      const ytop = yb + bt / 2 + r * 1.12 * .62;
      if (o.buried) { add(gc('gon', () => new THREE.BoxGeometry(.17, .14, .17)), MAT.dark, V(0, ytop + .07, 0)); const top = Y0 - grp.position.y; const vb = add(ucyl(.28, 16), MAT.dark, V(0, (ytop + .3 + top) / 2, 0)); vb.scale.y = top - ytop - .3; add(gc('vbl', () => new THREE.CylinderGeometry(.36, .36, .06, 20)), MAT.dark, V(0, top + .03, 0)); }
      else { const hr = Math.max(.2, fr0 * .95), hy = ytop + .08; add(ucyl(.03, 10), MAT.ss, V(0, hy, 0)).scale.y = .2; // stem barely protrudes
        const hw = add(gc('hw' + hr, () => new THREE.TorusGeometry(hr, Math.max(.025, hr * .07), 10, 40)), MAT.black, V(0, hy, 0)); hw.rotation.x = Math.PI / 2;
        add(gc('hub' + hr, () => new THREE.CylinderGeometry(hr * .2, hr * .22, .07, 16)), MAT.black, V(0, hy, 0)); add(gc('hnut', () => new THREE.CylinderGeometry(.04, .04, .04, 6)), MAT.ss, V(0, hy + .05, 0));
        for (let i = 0; i < 5; i++) { const a = i * 1.2566, sp = add(gc('sp' + hr, () => new THREE.BoxGeometry(hr * .82, Math.max(.025, hr * .07), Math.max(.03, hr * .1))), MAT.black, V(Math.cos(a) * hr * .55, hy, Math.sin(a) * hr * .55)); sp.rotation.y = -a; } }
    } else { // swing/silent check: swelled body + bolted cover
      add(gc('cb' + d, () => new THREE.SphereGeometry(r * 1.4, 20, 14)), bm, V(0, r * .15, 0)).scale.set(L / (r * 3.2), 1, .85);
      const yc = r * 1.35; add(gc('cc' + d, () => new THREE.CylinderGeometry(r * 1.05, r * 1.05, .08, 22)), bm, V(0, yc, 0)); bolts(gk, fr, V(0, yc, 0), UP, r * .9, d >= 6 ? 8 : 6, .08, Math.min(.06, F ? F[4] / 12 : .05));
      add(gc('cbs' + d, () => new THREE.CylinderGeometry(r * .3, r * .3, .12, 12)), bm, V(0, yc + .08, 0)); }
  } else if (kind === 'ball') { const m = o.mat || MAT.brass;
    add(gc('bb' + r, () => new THREE.SphereGeometry(r * 1.55, 16, 12)), m, V(0, 0, 0)); for (const s of [-1, 1]) add(gc('bh' + r, () => new THREE.CylinderGeometry(r * 1.35, r * 1.35, L * .3, 6)), m, V(s * L * .38, 0, 0), X1);
    add(ucyl(r * .35, 8), MAT.ss, V(0, r * 1.7, 0)).scale.y = r * 1.4; const hl = Math.max(.28, d * .1 + .22);
    add(gc('lv' + hl, () => new THREE.BoxGeometry(hl, .025, .055)), MAT.ss, V(hl / 2 - .03, r * 2.4, 0)); add(gc('lg' + hl, () => new THREE.BoxGeometry(hl * .5, .05, .075)), o.grip || MAT.red, V(hl * .72, r * 2.4, 0));
  }
  if (info) tag(grp, ...info); return grp;
}
// galvanized adjustable pipe stand: base plate, column, threaded adjuster, saddle
function stand(x, z, ytop, r, axis = 'x', y0 = 0, g = G.piping) { bom('Supports', 'Adjustable pipe saddle stand (galv.)', SZ(dOf(r))); const grp = new THREE.Group(); g.add(grp); const h = ytop - r - y0;
  box(.75, .05, .75, MAT.galv, x, y0 + .025, z, grp); for (const [a, b] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) lm(grp, gc('ab', () => new THREE.CylinderGeometry(.035, .035, .06, 6)), MAT.bolt, V(x + a * .28, y0 + .08, z + b * .28));
  seg(V(x, y0, z), V(x, y0 + h - .45, z), .118, MAT.galv, grp, 14); seg(V(x, y0 + h - .45, z), V(x, y0 + h - .1, z), .07, MAT.bolt, grp, 10); lm(grp, gc('an', () => new THREE.CylinderGeometry(.12, .12, .08, 6)), MAT.galv, V(x, y0 + h - .42, z));
  const sd = lm(grp, gc('sd' + r, () => new THREE.CylinderGeometry(r * 1.04, r * 1.04, .3, 18, 1, true, Math.PI / 2, Math.PI)), MAT.galvD, V(x, ytop, z)); { const yw = axis === 'x' ? X1 : Z1; sd.quaternion.setFromRotationMatrix(_mx.makeBasis(yw.clone().cross(UP), yw, UP)); }
  box(.36, .06, .36, MAT.galv, x, ytop - r - .07, z, grp);
  return tag(grp, 'Adjustable pipe support', 'Galvanized adjustable pipe saddle stand w/ base plate', 'Sheet 6', 'Galvanized per owner convention'); }
// ---------- CLOSE-COUPLED END-SUCTION PUMP ----------
const voluteGeo = () => gc('volute', () => { const N = 56, Mx = 14, pos = [], idx = [];
  for (let i = 0; i <= N; i++) { const t = i / N, th = -2 * Math.PI + 2 * Math.PI * t, rc = .09 + .17 * t, Rc = .40 + rc, c = V(Rc * Math.cos(th), Rc * Math.sin(th), 0), rad = V(Math.cos(th), Math.sin(th), 0);
    for (let j = 0; j <= Mx; j++) { const f = j / Mx * Math.PI * 2; const p = c.clone().addScaledVector(rad, rc * Math.cos(f)).addScaledVector(Z1, rc * 1.05 * Math.sin(f)); pos.push(p.x, p.y, p.z); } }
  for (let i = 0; i < N; i++) for (let j = 0; j < Mx; j++) { const a = i * (Mx + 1) + j, b = a + Mx + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; });
const latheZ = (k, pts, seg = 28) => gc(k, () => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg).rotateX(Math.PI / 2));
const finGeo = (ri, ro, n, len) => gc(`fin${ri}${ro}${n}${len}`, () => { const s = new THREE.Shape(), w = .38; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, b = a + w * Math.PI * 2 / n, c2 = (i + 1) / n * Math.PI * 2;
    const P = [[ri, a], [ro, a], [ro, b], [ri, b], [ri, (b + c2) / 2]]; P.forEach(([r, t], k) => (i === 0 && k === 0 ? s.moveTo : s.lineTo).call(s, r * Math.cos(t), r * Math.sin(t))); }
  return new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false, curveSegments: 1 }).translate(0, 0, -len / 2); });
const PUMPV = [];
function pump(x, mk, P0) { bom('Equipment', "End-suction pump 600 GPM @ 185' TDH, 40 HP close-coupled", mk); const g = new THREE.Group(); G.equip.add(g); const PZ = S.pumps.z, ys = P0.ys, zc = P0.zc, gk = 'equip';
  box(2, 1.5, 4.67, MAT.conc, x, .75, PZ, g);
  box(1.75, .2, 4.4, MAT.steel, x, 1.6, PZ, g); for (const s of [-1, 1]) box(.08, .3, 4.4, MAT.steel, x + s * .84, 1.6, PZ, g);
  for (const s of [-1, 1]) for (const zz of [-1.9, 0, 1.9]) lm(g, gc('abn', () => new THREE.CylinderGeometry(.05, .05, .07, 6)), MAT.bolt, V(x + s * .7, 1.74, PZ + zz));
  const cas = new THREE.Group(); g.add(cas); tag(cas, `Pump ${mk} – volute casing`, S.pumps.type, 'Sheet 6 pump schedule', '4" end-suction nozzle, top discharge');
  lm(cas, voluteGeo(), MAT.pump, V(x, ys, zc)); lm(cas, latheZ('vcore', [[0, -.24], [.5, -.24], [.56, -.15], [.56, .15], [.5, .26], [0, .26]], 32), MAT.pump, V(x, ys, zc));
  lm(cas, latheZ('sucn', [[.27, 0], [.22, .1], [.2, .45]], 22), MAT.pump, V(x, ys, zc - .22)).rotation.y = Math.PI; flange(cas, IDM, V(x, ys, zc - .7 + .04), Z1, 4, MAT.pump, gk);
  lm(cas, gc('dn', () => new THREE.CylinderGeometry(.2, .26, .95, 20)), MAT.pump, V(x + .66, ys + .47, zc)); flange(cas, IDM, V(x + .66, ys + .95 - .04, zc), UP, 4, MAT.pump, gk);
  box(.5, ys - .92 - 1.7 + .12, .3, MAT.pump, x, (ys - .92 + 1.7) / 2 + .03, zc, cas);
  // close-coupled: C-face motor adapter bolted to volute back, motor face bolted to adapter (no exposed shaft / frame / coupling)
  const ad = lm(g, latheZ('cfa', [[.5, 0], [.5, .06], [.4, .1], [.36, .2], [.38, .3], [.5, .34], [.5, .38]], 28), MAT.pump, V(x, ys, zc + .22)); tag(ad, 'C-face motor adapter', 'Close-coupled pump: volute bolts to motor C-face', 'Owner convention');
  bolts(gk, IDM, V(x, ys, zc + .25), Z1, .45, 8, .06, .05); bolts(gk, IDM, V(x, ys, zc + .57), Z1, .45, 8, .06, .05);
  const mo = new THREE.Group(); g.add(mo); const mz0 = zc + .6, ml = 1.5; const MAT0 = MAT.motor; MAT.motor = MAT0.clone(); MAT.motor.emissive = new THREE.Color(0xff7a20); MAT.motor.emissiveIntensity = 0; DYNM.add(MAT.motor);
  lm(mo, latheZ('mde', [[0, 0], [.5, 0], [.52, .05], [.56, .14], [.58, .22]], 28), MAT.motor, V(x, ys, mz0));
  lm(mo, finGeo(.57, .625, 40, ml), MAT.motor, V(x, ys, mz0 + .22 + ml / 2));
  lm(mo, latheZ('mfe', [[.58, 0], [.56, .1], [.5, .14]], 28), MAT.motor, V(x, ys, mz0 + .22 + ml));
  lm(mo, latheZ('fcv', [[.6, 0], [.62, .04], [.62, .34], [.55, .42], [.2, .46], [0, .46]], 30), MAT.motor, V(x, ys, mz0 + .32 + ml));
  for (const rr of [.16, .3, .44]) lm(mo, gc('fg' + rr, () => new THREE.TorusGeometry(rr, .018, 6, 28)), MAT.dark, V(x, ys, mz0 + .32 + ml + .46));
  const cb = box(.32, .32, .4, MAT.motor, x + .72, ys + .12, mz0 + .7, mo); box(.04, .26, .3, MAT.motor, x + .9, ys + .12, mz0 + .7, mo);
  seg(V(x + .78, ys - .05, mz0 + .7), V(x + .78, 1.75, mz0 + .7), .06, MAT.galv, mo, 10); box(.9, .5, 1.3, MAT.motor, x, 1.7 + (ys - .45 - 1.7) / 2, mz0 + .95, mo).scale.y = (ys - .45 - 1.7) / .5;
  lm(mo, gc('leye', () => new THREE.TorusGeometry(.08, .025, 6, 14)), MAT.motor, V(x, ys + .7, mz0 + .9));
  box(.2, .12, .01, MAT.ss, x - .3, ys + .55, mz0 + .5, mo).rotation.x = -.6;
  { const pm = MAT.motor; MAT.motor = MAT0; const fz = mz0 + .32 + ml + .42, fan = new THREE.Group(); fan.position.set(x, ys, fz); mo.add(fan);
    const fm = M(0x222222, .5, .3); DYNM.add(fm); for (let i = 0; i < 2; i++) { const b = new THREE.Mesh(gc('fanb', () => new THREE.BoxGeometry(.9, .09, .02)), fm); b.rotation.z = i * Math.PI / 2; fan.add(b); }
    const lt = M(0x224422, .3, 0, { emissive: 0x00ff44, emissiveIntensity: 0 }); DYNM.add(lt); lm(mo, gc('plt', () => new THREE.SphereGeometry(.07, 12, 8)), lt, V(x + .72, ys + .34, mz0 + .7));
    PUMPV.push({ pm, fan, lt }); }
  tag(mo, `Motor ${mk}`, '40 HP TEFC C-face, close-coupled, cooling-fin frame, fan cover, conduit box', 'Sheet 6 pump schedule', 'Motor color per owner photos – ASSUMED');
  tag(g, `Pump ${mk}`, S.pumps.type, 'Sheet 6 pump schedule', mk === 'P103' ? 'P103 in schedule; E-sheets mostly show P101/P102 – may be future' : '2\'-0"x4\'-8"x18" pad'); return g; }
MAT.galvD = MAT.galv.clone(); MAT.galvD.side = THREE.DoubleSide;
function label(txt, x, y, z) { const e = document.createElement('div'); e.className = 'lbl'; e.textContent = txt; $('lbls').appendChild(e); LBL.push({ e, p: V(x, y, z) }); }
const LBL = [];
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function sign(w, h, tex, x, y, z, ry, g) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: .6 })); m.position.set(x, y, z); m.rotation.y = ry; (g || G.equip).add(m); return m; }
const VPW = {}, ELEC = [], GELEC = [], GWAT = [], WELLV = [], TPL = [], COMPV = {};
MAT.gwat = M(0x2f86d6, .15, 0, { transparent: true, opacity: .5, depthWrite: false }); MAT.pwat = MAT.gwat.clone(); MAT.pwat.clippingPlanes = [new THREE.Plane(V(0, -1, 0), 0)]; DYNM.add(MAT.gwat); DYNM.add(MAT.pwat);
// ---------- SITE (X-ray ground: semi-transparent so buried pipe shows) ----------
const XG = [];
const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), MAT.grass); ground.rotation.x = -Math.PI / 2; ground.position.y = Y0 - .02; ground.receiveShadow = true; ground.renderOrder = 2; G.site.add(ground); XG.push(ground);
tag(ground, 'Grade', 'Contours 530–532; FFE 533.00', 'Sheet 3', 'Flat grade 6" below FFE – ASSUMED');
const soil = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), MAT.soil); soil.rotation.x = -Math.PI / 2; soil.position.y = Y0 - 9; G.site.add(soil);
for (const [x0, z0, x1, z1] of S.site.drive.rects) XG.push(tag(box(x1 - x0, .06, z1 - z0, MAT.gravel, (x0 + x1) / 2, Y0 + .01, (z0 + z1) / 2, G.site), 'Access drive', '6" crushed limestone, ~550 SY', 'Sheet 3 note 3', 'Outline traced approx. – ASSUMED'));
XG.push(tag(box(30, .06, 6, MAT.gravel, -7, Y0 + .015, 11, G.site), 'Drive apron', '6" crushed limestone', 'Sheet 3', 'ASSUMED extent'));
{ const rm = M(0x55575a, .9, 0, { transparent: true, opacity: .6, depthWrite: false }); const road = box(1400, .05, 30, rm, 0, Y0 + .02, 70, G.site); XG.push(road); tag(road, 'FM 1653', 'State highway (south of site)', 'Sheet 3', 'Position approximate'); MAT.road = rm; }
{ const [x0, z0, x1, z1] = S.site.fence.rect, h = S.site.fence.height, fg = new THREE.Group(); G.site.add(fg); const fm = new THREE.MeshBasicMaterial({ color: 0x8a9096, transparent: true, opacity: .22, side: THREE.DoubleSide, depthWrite: false });
  const sg2 = (a, b) => { seg(V(a[0], Y0 + h, a[1]), V(b[0], Y0 + h, b[1]), .07, MAT.fence, fg, 8); const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 10); for (let i = 0; i <= n; i++) { const x = a[0] + (b[0] - a[0]) * i / n, z = a[1] + (b[1] - a[1]) * i / n; seg(V(x, Y0, z), V(x, Y0 + h, z), .1, MAT.fence, fg, 8); } const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const mesh = new THREE.Mesh(new THREE.PlaneGeometry(L, h), fm); mesh.position.set((a[0] + b[0]) / 2, Y0 + h / 2, (a[1] + b[1]) / 2); mesh.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]); fg.add(mesh); };
  sg2([x0, z0], [x1, z0]); sg2([x1, z0], [x1, z1]); sg2([x1, z1], [-40, z1]); sg2([-56, z1], [x0, z1]); sg2([x0, z1], [x0, z0]);
  tag(fg, 'Security fence', "6' chain link, dbl 8' gates (by others)", 'Sheet 3', 'Fence line extent approximated – ASSUMED'); }
tag(box(3, .5, 97, MAT.conc, S.site.flume.x, Y0 + .1, (S.site.flume.z0 + S.site.flume.z1) / 2, G.site), 'Concrete curbed flume', "98 LF, 3' wide, variable height", 'Sheet 3');
// ---------- BUILDING ----------
const B = S.building, hx = B.L / 2, hz = B.W / 2, t = B.wall.t, H = B.plate.h;
tag(box(B.L + .4, .5, B.W + .4, MAT.conc, 0, -.25, 0, G.site), 'Floor slab', 'FFE 533.00, 5" slab on 6" sand cushion', 'Sheets 3, 7');
function wall(axis, fixed, a0, a1, ops, info) {
  const g = new THREE.Group(); G.walls.add(g); tag(g, ...info); let cur = a0; ops = [...ops].sort((p, q) => p.c - q.c);
  const piece = (s0, s1, y0, y1) => { if (s1 - s0 < .01 || y1 - y0 < .01) return; const L = s1 - s0, c = (s0 + s1) / 2, yc = (y0 + y1) / 2; axis === 'x' ? box(L, y1 - y0, t, MAT.cmu, c, yc, fixed, g) : box(t, y1 - y0, L, MAT.cmu, fixed, yc, c, g); };
  for (const o of ops) { piece(cur, o.c - o.w / 2, 0, H); piece(o.c - o.w / 2, o.c + o.w / 2, 0, o.y0); piece(o.c - o.w / 2, o.c + o.w / 2, o.y0 + o.h, H); if (o.mat) { const m = axis === 'x' ? box(o.w, o.h, .08, o.mat, o.c, o.y0 + o.h / 2, fixed, g) : box(.08, o.h, o.w, o.mat, fixed, o.y0 + o.h / 2, o.c, g); if (o.info) tag(m, ...o.info); } cur = o.c + o.w / 2; }
  piece(cur, a1, 0, H); return g;
}
const win = c => ({ c, w: 4, y0: 4.5, h: 2, mat: MAT.glass, info: ['Window A', "2'0\"H x 4'0\"W aluminum awning", 'Sheet 6 window schedule', 'Position scaled – ASSUMED'] });
wall('x', -hz + t / 2, -hx, hx, B.windows[0].x.map(win), ['North wall', "8x8x16 CMU, 8' plate", 'Sheets 7, 8']);
wall('x', hz - t / 2, -hx, hx, [{ c: 0, w: 6, y0: 0, h: 7 }], ['South wall', "8x8x16 CMU, 8' plate", 'Sheets 7, 8']);
for (const sx of [-1, 1]) tag(box(.15, 7, 3, MAT.door, sx * 3, 3.5, hz + 1.5, G.walls), 'Door 1 (pump room, shown open)', "(2) 3'0\"x7'0\" hollow core steel w/ astragal", 'Sheet 6 door schedule');
wall('z', hx - t / 2, -hz + t, hz - t, [], ['East wall', '8x8x16 CMU', 'Sheet 8']);
const d2 = (z, n) => ({ c: z, w: 3, y0: 0, h: 7, mat: MAT.door, info: [`Door 2 – ${n} (exterior)`, "3'0\"x7'0\" steel door, exterior (12x12 vision)", 'Sheet 6/8', n === 'Chlorine room' ? 'Chlorine room has its own outside door only (no door to pump room)' : ''] });
wall('z', -hx + t / 2, -hz + t, hz - t, [d2(-4.7, 'Chlorine room'), d2(4.7, 'Storage room')], ['West wall', 'CMU; separate exterior doors to Chlorine & Storage rooms', 'Sheets 6, 8']);
sign(1.6, .55, canvasTex(256, 88, c => { c.fillStyle = '#ffd400'; c.fillRect(0, 0, 256, 88); c.strokeStyle = '#000'; c.lineWidth = 6; c.strokeRect(3, 3, 250, 82); c.fillStyle = '#000'; c.font = 'bold 34px sans-serif'; c.textAlign = 'center'; c.fillText('CHLORINE', 128, 40); c.font = 'bold 18px sans-serif'; c.fillText('DANGER – GAS', 128, 70); }), -hx - .06, 7.45, -4.7, -Math.PI / 2, G.walls);
const rx = B.rooms[0].x1, rz = B.rooms[0].z1;
wall('z', rx, -hz + t, hz - t, [], ['Chlorine/Storage room partition', 'CMU, sealed (no door to pump room)', 'Sheet 6']);
wall('x', rz, -hx + t, rx - t / 2, [], ['Chlorine room / Storage room partition', 'CMU', 'Sheet 6']);
{ const pitch = 4 / 12, ov = B.roof.overhang, half = hz + ov, rise = hz * pitch, sl = Math.hypot(half, half * pitch), g = G.roof;
  for (const s of [-1, 1]) { const p = box(B.L + 2 * ov, .25, sl, MAT.roof, 0, H + rise - half * pitch / 2, s * half / 2, g); p.rotation.x = s * Math.atan(pitch); }
  const tri = new THREE.Shape([new THREE.Vector2(-hz, 0), new THREE.Vector2(hz, 0), new THREE.Vector2(0, rise)]);
  for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.ShapeGeometry(tri), M(0xe6e0d2, .8, 0, { side: THREE.DoubleSide })); m.rotation.y = Math.PI / 2; m.position.set(s * hx, H, 0); g.add(m); }
  const vent = cyl(.8, 1, MAT.galv, g); vent.position.set(-8, H + rise + .4, 0);
  tag(g, 'Roof', '24 ga R-panel on pre-engineered trusses @ 24" c/c, LP SmartSide gables', 'Sheets 7, 8', '4:12 pitch & 1\' overhang scaled – ASSUMED'); }
label('Pump Station 30\'x16\'', 0, 13, 0);
// ---------- CHLORINE ROOM ----------
function gauge(p, dir, g, sz = .12) { bom('Instruments', 'Pressure/vacuum gauge'); const grp = new THREE.Group(); g.add(grp); p = v3(p); const d = dir.clone().normalize();
  seg(p, p.clone().addScaledVector(d, .12), .025, MAT.brass, grp, 8); const c = p.clone().addScaledVector(d, .12 + sz * .35);
  const body = lm(grp, gc('gg' + sz, () => new THREE.CylinderGeometry(sz, sz, sz * .55, 20)), MAT.ss, c, UP); body.quaternion.setFromUnitVectors(Z1, d).multiply(new THREE.Quaternion().setFromAxisAngle(X1, Math.PI / 2));
  const face = lm(grp, gc('gf' + sz, () => new THREE.CircleGeometry(sz * .88, 20)), GFACE, c.clone().addScaledVector(d, sz * .28)); face.quaternion.setFromUnitVectors(Z1, d); return grp; }
const GFACE = new THREE.MeshStandardMaterial({ map: canvasTex(64, 64, c => { c.fillStyle = '#fff'; c.fillRect(0, 0, 64, 64); c.strokeStyle = '#222'; c.lineWidth = 2; for (let i = 0; i <= 10; i++) { const a = Math.PI * .75 + i / 10 * Math.PI * 1.5; c.beginPath(); c.moveTo(32 + Math.cos(a) * 22, 32 + Math.sin(a) * 22); c.lineTo(32 + Math.cos(a) * 28, 32 + Math.sin(a) * 28); c.stroke(); } c.strokeStyle = '#c00'; c.lineWidth = 3; c.beginPath(); c.moveTo(32, 32); c.lineTo(48, 18); c.stroke(); }), roughness: .3 });
{ const g = G.equip, cl = new THREE.Group(); g.add(cl);
  const sc = box(2.5, .16, 1.3, MAT.steel, -12.35, .08, -6.5, cl); box(2.4, .02, 1.2, M(0x9aa1a7, .4, .8), -12.35, .17, -6.5, cl);
  bom('Equipment', 'Chlorine cylinder platform scale (2-cyl) + wall readout'); tag(sc, 'Cylinder platform scale', 'Electronic 2-cylinder platform scale', 'Sheet 6/7', 'Per owner photos');
  for (const [x, reg] of [[-12.95, false], [-11.75, true]]) { const c = new THREE.Group(); cl.add(c); const h = 4.2, r = .42;
    lm(c, ucyl(r, 28), MAT.cl, V(x, .18 + h / 2, -6.5)).scale.y = h; lm(c, gc('cld', () => new THREE.SphereGeometry(r, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2)), MAT.cl, V(x, .18 + h, -6.5));
    lm(c, gc('cln', () => new THREE.CylinderGeometry(.09, .12, .22, 12)), MAT.brass, V(x, .18 + h + r + .05, -6.5)); box(.06, .06, .12, MAT.brass, x, .18 + h + r + .08, -6.38, c);
    for (const yy of [.6, h - .4]) lm(c, gc('clr', () => new THREE.TorusGeometry(r + .01, .02, 6, 28)), MAT.dark, V(x, yy, -6.5)).rotation.x = Math.PI / 2;
    bom('Equipment', 'Chlorine cylinder, 150 lb'); tag(c, 'Chlorine cylinder', '150 lb Cl2, ~10" dia x 54" tall', 'Sheet 6/7', 'Size per typical 150 lb cylinder – ASSUMED');
    if (reg) { const rg = new THREE.Group(); cl.add(rg); const y = .18 + h + r + .2; box(.34, .38, .28, M(0x50565c, .5, .2), x, y + .15, -6.5, rg); lm(rg, gc('rgd', () => new THREE.CylinderGeometry(.13, .13, .08, 20)), M(0x2a2d31, .4, .2), V(x, y + .15, -6.32), Z1);
      gauge(V(x + .17, y + .25, -6.5), X1, rg, .07); box(.22, .05, .05, MAT.ss, x, y - .02, -6.4, rg);
      bom('Equipment', 'Gas chlorinator vacuum regulator'); tag(rg, 'Vacuum regulator / chlorinator (cylinder-mounted)', 'Gas chlorinator vacuum regulator on cylinder valve; vacuum line to injector', 'Sheet 6/7 + owner photos', 'Sheet calls wall-mounted chlorinator; owner photos show regulator on cylinder'); } }
  // digital scale readout on north wall
  const rd = new THREE.Group(); cl.add(rd); box(.9, .65, .22, M(0xd9dcdf, .5, .2), -9.6, 4.6, -hz + t + .12, rd);
  sign(.62, .26, canvasTex(160, 64, c => { c.fillStyle = '#0a1a0a'; c.fillRect(0, 0, 160, 64); c.fillStyle = '#39ff5a'; c.font = 'bold 34px monospace'; c.fillText('151.2', 10, 44); c.font = '16px monospace'; c.fillText('LB', 124, 44); }), -9.6, 4.68, -hz + t + .235, 0, rd);
  seg(V(-9.6, 4.28, -hz + t + .1), V(-9.6, .2, -hz + t + .1), .03, MAT.galv, rd, 6); seg(V(-9.6, .2, -hz + t + .1), V(-11.2, .2, -6.6), .02, MAT.dark, rd, 6);
  tag(rd, 'Digital scale readout', 'Wall-mounted cylinder weight indicator', 'Sheet 6/7', 'Per owner photos');
  // gray 1" Sch 80 PVC vacuum/solution line along walls to injection taps
  const P6 = rOD(6), P4 = rOD(4), xr = -11.75, yl = 6.8;
  run([[xr, 5.35, -6.5], [xr, yl, -6.5], [-6.15, yl, -6.5], [-6.15, yl, -2.2], [-4.6, yl, -2.2], [-4.6, 2.2 + P6 + .12, -2.2]], 1, MAT.gpvc, ['Chlorine solution line', '1" SCH 80 gray PVC (sheet: 1-1/2" reduced to 1" at corporation)', 'Sheets 6, 7', 'Runs along wall, through partition to injection taps after meters'], G.piping, { flow: 'cl2', on: () => SIM.wellOn });
  run([[-4.6, yl, -2.2], [-3.6, yl, -2.2], [-3.6, 2.2 + P4 + .12, -2.2]], 1, MAT.gpvc, ['Chlorine solution line (Well 12 tap)', '1" SCH 80 gray PVC', 'Sheet 6'], G.piping, { flow: 'cl2', on: () => SIM.wellOn });
  gauge(V(-9.4, yl + .06, -6.5), UP, cl, .1); gauge(V(-6.15, yl, -4.6), X1.clone().negate(), cl, .1);
  valve([-6.15, yl, -3.4], 'z', 1, 'ball', ['Chlorine line isolation valve', '1" SCH 80 PVC ball valve', 'Owner photos'], cl, UP, { mat: MAT.gpvc, grip: MAT.red });
  sleeve([-5.6, yl, -2.2], X1, 1, cl);
  label('Chlorine Room', -10, 9.5, -4.6); label('Storage', -10, 9.5, 4.6);
  // storage / misc
  const ph = cyl(1.3, 3.5, M(0x3d6fb6, .5, .1), g, 32); ph.position.set(-12.5, 1.75, 5.6); bom('Equipment', 'Phosphate feed tank'); tag(ph, 'Phosphate feed tank', 'Phosphate solution, 1" solution line', 'Sheet 6', 'Tank size ASSUMED');
  run([[-12.5, 3.5, 5.6], [-12.5, 6, 5.6], [-5.1, 6, 5.6], [-5.1, 6, -3.5], [-3.6, 6, -3.5], [-3.6, 2.2 + P4 + .12, -3.5]], 1, MAT.gpvc, ['Phosphate solution line', '1" SCH 80 PVC', 'Sheet 6'], G.piping, { flow: 'phos', on: () => SIM.wellOn });
  run([[-4.6, 6, -3.5], [-4.6, 2.2 + P6 + .12, -3.5]], 1, MAT.gpvc, ['Phosphate solution line', '1" SCH 80 PVC', 'Sheet 6'], G.piping, { flow: 'phos', on: () => SIM.wellOn });
  tag(box(1.5, 1, .4, M(0x777777), -13, 1, -.5, g), 'Floor heater', '', 'Sheet 6');
  tag(box(1.4, 2.2, .6, M(0xd7262f), -hx - .4, 4, 0, g), 'Breathing apparatus cabinet', 'Exterior, between room doors', 'Sheet 6');
  for (const [z, n] of [[-7, 'Gravity exhaust louver 12x12'], [7, 'Gravity supply louver 12x12']]) tag(box(.3, 1, 1, MAT.galv, -hx - .2, n.includes('exhaust') ? 7 : 1.2, z, g), n, '12"x12" gravity operated louver', 'Sheet 6');
  for (const [z, n] of [[-hz - .7, 'Motorized SS supply ventilator 200 CFM'], [hz + .7, 'Motorized SS exhaust ventilator 200 CFM']]) { const v = cyl(.9, 1.2, MAT.galv, g); v.rotation.x = Math.PI / 2; v.position.set(-11.5, 6.4, z); tag(v, n, '12" below clg height', 'Sheet 6'); }
}
// ---------- PUMPS & HEADERS ----------
const P = S.piping, sh = P.suction_header, dh = P.discharge_header; dh.y += .4; /* v3: raised so flanged tees clear gate valves */ const R8 = rOD(8), R4 = rOD(4);
const P0 = { ys: 2.65, zc: -2.3 }; const SHY = P0.ys + R4 - R8; // eccentric reducer flat-on-top => header lower
S.pumps.x.forEach((x, i) => { const mk = S.pumps.marks[i]; pump(x, mk, P0);
  const tl = TL(8); tee([x, SHY, sh.z], X1, Z1, 8, tl, MAT.di);
  fpath([[x, SHY, sh.z], [x, SHY, -3.8], [x, SHY + R8 - R4, -3.0], [x, P0.ys, -2.3]], 'suc', () => SIM.run[i], R8); fpath([[x + .66, P0.ys + .3, -2.3], [x + .66, dh.y, dh.z], [P.to_distribution.x, dh.y, dh.z]], 'prs', () => SIM.run[i], R8);
  run([[x, SHY, sh.z + tl], [x, SHY, -3.8]], 8, MAT.di, ['Pump suction spool', '8" FL DI', 'Sheet 6'], G.piping, { fl: 'b' });
  valve([x, SHY, sh.z + tl + .48], 'z', 8, 'gate', [`Suction gate valve ${mk}`, '8" gate valve (F) – mark 102', 'Sheet 6']);
  const rd = reducer([x, SHY, -3.8], [x, SHY + R8 - R4, -3.0 - .04], R8, R4, true, MAT.di); tag(rd, '8"x4" eccentric reducer (104)', 'Flat on top, to 4" pump suction', 'Sheet 6');
  const X = x + .66; reducer([X, 3.6, -2.3], [X, 4.3, -2.3], R4, R8, false, MAT.di).userData.info = { name: 'Discharge increaser', size: '4"x8" concentric (112/115)', src: 'Sheet 6' };
  flange(G.piping, IDM, V(X, 4.3, -2.3), UP, 8, MAT.di, 'piping');
  tee([X, dh.y, -2.3], X1, UP.clone().negate(), 8, tl, MAT.di);
  run([[X, 4.3, -2.3], [X, dh.y - tl, -2.3]], 8, MAT.di, ['Discharge riser', '8" FL DI', 'Sheet 6'], G.piping, { fl: false });
  valve([X, 4.3 + .39, -2.3], 'y', 8, 'check', [`Silent check valve ${mk}`, '8" silent check valve (F) – mark 103', 'Sheet 6', 'Blue per owner convention'], G.piping, Z1, { L: .78 });
  valve([X, 5.08 + .48, -2.3], 'y', 8, 'gate', [`Discharge gate valve ${mk}`, '8" gate valve (F) – mark 102', 'Sheet 6'], G.piping, Z1);
});
run([[sh.x0, SHY, sh.z], [sh.x1, SHY, sh.z]], 8, MAT.di, ['Suction header', '8" FL DI (109), from GST', 'Sheet 6', 'Elevation set by eccentric reducers – ASSUMED (owner: suction low)'], G.piping, { blind: true });
run([[dh.x0, dh.y, dh.z], [dh.x1, dh.y, dh.z]], 8, MAT.di, ['Pressure (discharge) header', '8" FL DI', 'Sheet 6', 'Elevation ASSUMED (owner: pressure above suction)'], G.piping, { blind: true });
// GST suction in (north wall) and to distribution — DI risers outside drop into ground
run([[P.gst_suction_in.x, Y0 - 1, -hz - .75], [P.gst_suction_in.x, SHY, -hz - .75], [P.gst_suction_in.x, SHY, sh.z - TL(8)]], 8, MAT.di, ['8" from G.S.T. (suction)', '8" wall sleeve (108) + FL DI; DI riser continues below grade into buried MJ 90', 'Sheet 6'], G.piping, { fl: 'b', flow: 'suc', on: () => SIM.anyRun });
tee([P.gst_suction_in.x, SHY, sh.z], X1, Z1.clone().negate(), 8, TL(8), MAT.di);
tee([P.to_distribution.x, dh.y, dh.z], X1, Z1.clone().negate(), 8, TL(8), MAT.di);
run([[P.to_distribution.x, dh.y, dh.z - TL(8)], [P.to_distribution.x, dh.y, -9.4], [P.to_distribution.x, Y0 - 1, -9.4]], 8, MAT.di, ['8" to distribution / pressure tanks', '8" FL DI, 8" 90s (111/113), wall sleeve; DI riser down into ground', 'Sheets 6, 8'], G.piping, { fl: 'a', flow: 'prs', on: () => SIM.anyRun });
{ const gx0 = P.gst_suction_in.x, X = S.pumps.x; fpath([[gx0, SHY, sh.z], [X[0], SHY, sh.z]], 'suc', () => SIM.run[0], R8); fpath([[gx0, SHY, sh.z], [X[1], SHY, sh.z]], 'suc', () => SIM.run[1] || SIM.run[2], R8); fpath([[X[1], SHY, sh.z], [X[2], SHY, sh.z]], 'suc', () => SIM.run[2], R8); }
for (const xx of [P.gst_suction_in.x]) sleeve([xx, SHY, -hz + t / 2], Z1, 8); sleeve([P.to_distribution.x, dh.y, -hz + t / 2], Z1, 8);
for (const x of [-1.2, 5.6]) stand(x, sh.z, SHY, R8, 'x'); for (const x of [.6, 6.0]) stand(x, dh.z, dh.y, R8, 'x');
for (const [x, z] of [[-4.2, 5.5], [1, -6.8], [12, 6.5]]) { const hb = run([[x, 3, z], [x + .35, 3, z]], .75, MAT.brass, null, G.piping, { col: false, nobom: true }); tag(hb, 'Hose bib', '3/4" brass hose bib', 'Sheet 6/7'); bom('Fixtures', 'Hose bib, brass', '3/4"'); }
// ---------- WELL LINES (wall to wall, DI risers out of ground both sides) ----------
for (const [key, meter, nm] of [['well11', '4" Census Octave ultrasonic meter (133)', 'Well 11'], ['well12', '2" Census Octave ultrasonic meter (132)', 'Well 12']]) {
  const L = P[key], x = L.x, d = L.d, y = 2.2, r = rOD(d);
  run([[x, Y0 - 1, hz + .75], [x, y, hz + .75], [x, y, -hz - .75], [x, Y0 - 1, -hz - .75]], d, MAT.di, [L.desc.split(',')[0], `${d}" FL DI through building; DI risers out of ground at walls`, 'Sheet 6', 'Passes wall to wall, no pump connection; DI continues below grade into buried MJ 90s'], G.piping, { fl: false, ef: true });
  fpath([[x, Y0 - 1, hz + .75], [x, y, hz + .75], [x, y, -2.2]], 'raw', () => SIM.wellOn, r); fpath([[x, y, -2.2], [x, y, -hz - .75], [x, Y0 - 1, -hz - .75]], 'chl', () => SIM.wellOn, r);
  for (const zz of [hz - t / 2, -hz + t / 2]) sleeve([x, y, zz], Z1, d);
  valve([x, y, 5.5], 'z', d, 'gate', [`${d}" gate valve (${nm} line)`, `${d}" gate valve`, 'Sheet 6'], G.piping, x < -4 ? UP : UP);
  valve([x, y, 3.4], 'z', d, 'check', [`${d}" swing check (${nm} line)`, `${d}" swing check valve (131)`, 'Sheet 6']);
  const mg = new THREE.Group(); G.piping.add(mg); lm(mg, ucyl(r * 1.15, 20), MAT.blue, V(x, y, 1), Z1).scale.y = .9; for (const s of [-1, 1]) flange(mg, IDM, V(x, y, 1 + s * .45), Z1, d, MAT.blue, 'piping');
  box(.36, .3, .22, M(0x1d3f7a, .4, .3), x, y + r + .2, 1, mg); box(.26, .16, .01, M(0x9fe0a0, .2, 0, { emissive: 0x2a6a2a }), x, y + r + .24, 1.115, mg); tag(mg, `Flow meter – ${nm}`, meter, 'Sheet 6'); bom('Equipment', 'Ultrasonic flow meter (Census Octave)', SZ(d));
  const tp = run([[x, y + r, -2.2], [x, y + r + .12, -2.2]], 1, MAT.brass, null, G.piping, { col: false, nobom: true }); bom('Fixtures', 'Corporation stop (Cl2 injection)', '1"'); bom('Fixtures', 'Corporation stop (phosphate injection)', '1"'); bom('Fixtures', 'Sample tap', '3/4"'); tag(tp, 'Cl2 solution injection tap', '1" corporation stop', 'Sheet 7 note 3', 'After meter per owner convention');
  const tq = run([[x, y + r, -3.5], [x, y + r + .12, -3.5]], 1, MAT.brass, null, G.piping, { col: false, nobom: true }); tag(tq, 'Phosphate injection tap', '1" corporation', 'Sheet 6');
  const sp = run([[x, y - r, -4.6], [x, y - r - .35, -4.6], [x + .25, y - r - .35, -4.6]], .75, MAT.brass, null, G.piping, { col: false, nobom: true }); tag(sp, 'Sample tap', '3/4" sample tap', 'Sheet 6');
  for (const zz of [6.6, -5.6]) stand(x, zz, y, r, 'z');
}
// ---------- PT AIR / LEVEL LINES, VISIPROBE, COMPRESSOR ----------
const pts = S.pressure_tanks, PT = S.pt_dims, PCY = Y0 + 2.5 + PT.dia / 2; // PT centerline (saddles at grade)
const XW = hx - t; // inner face east wall
{ const [px, pz] = pts[0].center, top = PCY + PT.dia / 2, za = pz - 8, yA = 8.9, yB2 = 8.7, ex = { col: true }, yAi = H - 1, yBi = H - 1.25, xA = hx + 2.5, xB = hx + 3; // overhead outside, drop & enter wall ~1 ft below ceiling
  const lab = ['3/4" G.I.P. per sheet 4 (owner: 1" galv)', 'Sheet 4'];
  // Line A: Mercoid + gauge + Visiprobe
  run([[px - .5, top - .05, za], [px - .5, yA, za], [px - .5, yA, -2], [xA, yA, -2], [xA, yAi, -2], [14.05, yAi, -2], [14.05, 5.85, -2]], .75, MAT.galv, ['Level-control air line (to Mercoid / gauge / Visiprobe)', ...lab], G.piping, ex);
  valve([px - .5, top + .28, za], 'y', .75, 'ball', ['Brass ball valve at PT top (level-control line)', '3/4" brass ball valve', 'Sheet 4', 'Owner convention 1"; sheet note 3/4" kept in label']);
  // Line B: air compressor, PRV outside
  run([[px + .5, top - .05, za], [px + .5, yB2, za], [px + .5, yB2, -4.5], [xB, yB2, -4.5], [xB, yBi, -4.5], [13.4, yBi, -4.5], [13.4, 3.2, -4.5], [13.4, 3.2, -6.3], [13.4, 2.55, -6.3]], .75, MAT.galv, ['Air line to air compressor', ...lab], G.piping, { ...ex, flow: 'air', rev: true, on: () => SIM.comp });
  valve([px + .5, top + .28, za], 'y', .75, 'ball', ['Brass ball valve at PT top (air line)', '3/4" brass ball valve', 'Sheet 4']);
  { const prv = new THREE.Group(); G.piping.add(prv); const x = 20, y = yB2; seg(V(x, y, -4.5), V(x, y + .25, -4.5), .045, MAT.galv, prv, 8);
    lm(prv, gc('prvb', () => new THREE.SphereGeometry(.11, 14, 10)), MAT.brass, V(x, y + .32, -4.5)); lm(prv, gc('prvs', () => new THREE.CylinderGeometry(.06, .08, .32, 14)), MAT.brass, V(x, y + .55, -4.5)); lm(prv, gc('prvc', () => new THREE.CylinderGeometry(.045, .045, .08, 8)), MAT.brass, V(x, y + .75, -4.5)); box(.2, .02, .03, MAT.ss, x + .08, y + .7, -4.5, prv);
    lm(prv, gc('prvo', () => new THREE.CylinderGeometry(.05, .05, .14, 10)), MAT.brass, V(x + .12, y + .32, -4.5), X1);
    bom('Valves', 'Pressure relief valve (air line)', '2"'); tag(prv, 'Pressure relief valve (outside, compressor line)', '2" PRV set 10 psi above system pressure (sheet 4)', 'Sheet 4', 'Shown on air line outside per owner convention'); }
  for (const xx of [21.5]) { const s = new THREE.Group(); G.piping.add(s); seg(V(xx, Y0, -4.5), V(xx, yB2 - .05, -4.5), .06, MAT.galv, s, 10); box(1.4, .08, .12, MAT.galv, xx, yB2 - .08, -3.25, s).scale.z = 1; box(.12, .08, 2.6, MAT.galv, xx, yB2 - .1, -3.25, s); seg(V(xx, Y0, -2), V(xx, yB2 - .05, -2), .06, MAT.galv, s, 10); tag(s, 'Air line support', 'Galvanized unistrut support', 'ASSUMED'); bom('Supports', 'Unistrut air-line support frame'); }
  for (const zz of [-2, -4.5]) sleeve([hx - t / 2, zz === -2 ? yAi : yBi, zz], X1, .75);
  // tee + gauge near Mercoid, braided hose to Visiprobe
  gauge(V(14.05, 6.55, -2), X1.clone().negate(), G.electrical, .14);
  const mc = new THREE.Group(); G.electrical.add(mc); box(.34, .55, .26, M(0x6b7076, .45, .45), 14.12, 5.55, -2, mc); lm(mc, gc('mcc', () => new THREE.CylinderGeometry(.12, .12, .05, 18)), MAT.dark, V(13.98, 5.6, -2), X1); box(.05, .4, .05, MAT.galv, 13.98, 5.1, -2, mc);
  bom('Instruments', 'Mercoid pressure switch'); tag(mc, 'Mercoid pressure switch + pressure gauge', 'Mercoid control on level-control air line', 'Owner convention', 'Sheet 6 "sight glass & pressure controls" location');
  // Visiprobe = Williams Clear-View
  const vp = new THREE.Group(); G.electrical.add(vp); const vx = XW - .32, vz = -3.1, yb = 1.7, yt = 6.2, vr = .17;
  for (const y of [yb, yt]) { box(.5, .07, .5, MAT.galv, vx, y + (y === yb ? -.04 : .04), vz, vp); lm(vp, gc('vcap', () => new THREE.CylinderGeometry(.22, .22, .2, 24)), M(0x232528, .45, .3), V(vx, y + (y === yb ? -.17 : .17), vz)); box(.14, .1, .3, MAT.galv, vx + .22, y, vz, vp); }
  lm(vp, gc('vtube', () => new THREE.CylinderGeometry(vr, vr, yt - yb, 28, 1, true)), MAT.acryl, V(vx, (yb + yt) / 2, vz));
  const wl = (yt - yb) * .75; MAT.vwat = MAT.water.clone(); DYNM.add(MAT.vwat); VPW.m = lm(vp, gc('vwat', () => new THREE.CylinderGeometry(vr * .94, vr * .94, 1, 24)), MAT.vwat, V(vx, yb + wl / 2, vz)); VPW.m.scale.y = wl; Object.assign(VPW, { yb, yt });
  for (const [a, b] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) { seg(V(vx + a * .19, yb - .1, vz + b * .19), V(vx + a * .19, yt + .1, vz + b * .19), .018, MAT.ss, vp, 6); for (const y of [yb - .12, yt + .12]) lm(vp, gc('vn', () => new THREE.CylinderGeometry(.035, .035, .04, 6)), MAT.bolt, V(vx + a * .19, y, vz + b * .19)); }
  [[48, 'All pumps off'], [28, 'Pump 1 on (lead)'], [22, 'Pump 2 on (lag)'], [16, 'Alarm off'], [12, 'Alarm on']].forEach(([inch, n], i) => { const a = i / 5 * Math.PI * 2, ex2 = vx + Math.cos(a) * .07, ez = vz + Math.sin(a) * .07, ye = yb + inch / 72 * (yt - yb);
    const e = seg(V(ex2, yt, ez), V(ex2, ye, ez), .01, MAT.ss, vp, 6); const em = MAT.brass.clone(); em.emissive = new THREE.Color(0x30ff60); em.emissiveIntensity = 0; DYNM.add(em); const tp = lm(vp, gc('etip', () => new THREE.SphereGeometry(.035, 10, 8)), em, V(ex2, ye, ez)); ELEC.push({ m: em, pt: inch }); bom('Instruments', 'Visiprobe electrode'); tag(tp, 'Visiprobe electrode – ' + n, `${inch}" of 72" probe (scaled to tube)`, 'Sheet 4'); });
  bom('Instruments', 'Visiprobe sight tube (Williams Clear-View)'); tag(vp, 'Visiprobe (Williams Clear-View)', 'Clear acrylic sight tube, top/bottom plates, 4 tie rods, electrodes inside', 'Sheet 4/6 + owner photos', 'Electrode heights from sheet 4: 48" off, 28" P1 on, 22" P2 on, 16/12" alarm (scaled to ~4.5\' tube)');
  const jb = box(.5, .55, .22, M(0x8a8f95, .5, .3), XW - .13, 4.4, vz - .62, vp); tag(jb, 'Electrical junction box (Visiprobe)', 'Gray NEMA box', 'Owner photos'); seg(V(XW - .15, 4.68, vz - .62), V(XW - .15, 6.3, vz - .62), .04, MAT.galv, vp, 8); seg(V(XW - .15, 6.3, vz - .62), V(vx, 6.3, vz - .4), .015, MAT.dark, vp, 6);
  const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(14.05, 6.25, -2), V(13.85, 6.4, -2.3), V(13.8, 6.5, -2.85), V(vx, 6.6, vz), V(vx, yt + .27, vz)]), 24, .035, 8), MAT.hose); vp.add(hose); tag(hose, 'Braided flexible hose', 'SS braided hose, air line to Visiprobe top', 'Owner photos');
  lm(vp, gc('hft', () => new THREE.CylinderGeometry(.045, .045, .14, 6)), MAT.brass, V(14.05, 6.25, -2), Z1);
  // bottom: galvanized pipe + red-handle ball valve -> through wall -> buried tie to PT bottom
  run([[vx, yb - .27, vz], [vx, 1.0, vz], [hx + .45, 1.0, vz]], .75, MAT.galv, ['Visiprobe bottom tie (to PT bottom)', '3/4" galvanized', 'Owner convention', 'ASSUMED route'], G.piping, { col: true });
  valve([vx, 1.25, vz], 'y', .75, 'ball', ['Visiprobe bottom ball valve', '3/4" ball valve, red handle', 'Owner photos'], G.piping, X1.clone().negate());
  run([[hx + .45, 1.0, vz], [hx + .45, Y0 - 1, vz]], .75, MAT.galv, null, G.piping, { col: true });
  const vtx = px - 1, vtz = pz - PT.len / 2 + 2.6, vnz = pz - PT.len / 2 + 3.9; // riser outside (west of) PT No.1 inlet-end footer
  U([[hx + .45, Y0 - 1, vz], [hx + .45, Y0 - 2.5, vz], [vtx, Y0 - 2.5, vz], [vtx, Y0 - 2.5, vtz], [vtx, Y0 - 1, vtz]], .75, ['Sight-tube bottom tie (buried)', '3/4" line, buried white PVC', 'Owner convention', 'ASSUMED route']);
  run([[vtx, Y0 - 1, vtz], [vtx, Y0 + 1.6, vtz], [vtx, Y0 + 1.6, vnz], [vtx, PCY - Math.sqrt((PT.dia / 2) ** 2 - 1) + .02, vnz]], .75, MAT.galv, ['Bottom tie riser at PT', '3/4" galvanized; rises outside the saddle footer, short horizontal to tank bottom', 'Owner convention'], G.piping, { col: true });
  // air compressor
  const ac = new THREE.Group(); G.electrical.add(ac); const cx = 12.9, cz = -6.3;
  lm(ac, gc('acr', () => new THREE.CapsuleGeometry(.5, 1.6, 8, 24)), M(0x5c666f, .45, .4), V(cx, 1.05, cz), X1);
  for (const s of [-1, 1]) box(.12, .55, .8, MAT.steel, cx + s * .7, .28, cz, ac);
  box(1.6, .08, .8, MAT.steel, cx, 1.58, cz, ac); lm(ac, finGeo(.17, .23, 12, .45), MAT.dark, V(13.4, 1.95, cz)).rotation.x = Math.PI / 2; lm(ac, gc('ach', () => new THREE.BoxGeometry(.45, .14, .45)), MAT.dark, V(13.4, 2.25, cz));
  lm(ac, finGeo(.22, .26, 18, .6), M(0x2a5d9a, .4, .4), V(12.4, 1.9, cz)).rotation.y = Math.PI / 2; box(.12, .55, .6, MAT.guard, 12.95, 1.95, cz + .38, ac);
  gauge(V(12, 1.55, cz + .4), Z1, ac, .09);
  { const lt = M(0x224422, .3, 0, { emissive: 0x00ff44, emissiveIntensity: 0 }); DYNM.add(lt); lm(ac, gc('plt', () => new THREE.SphereGeometry(.07, 12, 8)), lt, V(cx - .5, 1.7, cz)); COMPV.lt = lt; COMPV.g = ac; }
  bom('Equipment', 'Air compressor 3 HP, 125 psi w/ receiver'); tag(ac, 'Air compressor', '3 HP, 125 psi (Kellogg/equal), receiver tank', 'Sheet 6 air compressor schedule');
}
// ---------- ELECTRICAL / CONTROLS ----------
{ const g = G.electrical;
  const ep = new THREE.Group(); g.add(ep); for (let i = 0; i < 4; i++) { box(2.2, 6, .9, MAT.panel, 6.3 + i * 2.35, 3.5, hz - t - .48, ep); box(.04, .5, .06, MAT.ss, 6.3 + i * 2.35 - .85, 3.8, hz - t - .95, ep); box(1.9, .02, .02, MAT.dark, 6.3 + i * 2.35, 6.3, hz - t - .95, ep); }
  tag(ep, 'Electrical panels (south wall)', 'VFDs, MCC, distribution', 'Sheets 6, E-series');
  tag(box(1, 6, 8, MAT.panel, hx - t - .5, 3.5, 3.5, g), 'Electrical panels (east wall)', 'Panels per E sheets', 'Sheets 6, E-series');
  const tp = new THREE.Group(); g.add(tp); const tz = hz - t - .42; box(3, 4, .8, M(0xe8e8e6, .45, .25), 3.2, 4.3, tz, tp); box(2.85, 3.85, .03, M(0xdcdcd9, .4, .25), 3.2, 4.3, tz - .41, tp);
  box(.9, .6, .03, M(0x101418, .2, .2, { emissive: 0x103050 }), 3.2, 5.4, tz - .43, tp);
  sign(1.1, .22, canvasTex(220, 44, c => { c.fillStyle = '#1a3a52'; c.fillRect(0, 0, 220, 44); c.fillStyle = '#fff'; c.font = 'bold 22px sans-serif'; c.fillText('TURNER 625D', 30, 30); }), 3.2, 6.0, tz - .435, Math.PI, tp);
  [0x22cc44, 0x22cc44, 0x22cc44, 0xffbb00, 0xdd2222, 0x22cc44].forEach((c, i) => { const pm = M(c, .3, 0, { emissive: c, emissiveIntensity: .5 }); DYNM.add(pm); TPL.push(pm); const l = lm(tp, gc('pl', () => new THREE.CylinderGeometry(.06, .06, .06, 14)), pm, V(2.45 + (i % 3) * .3 + (i > 2 ? 1.0 : 0), 4.65, tz - .44), Z1); });
  for (let i = 0; i < 3; i++) { lm(tp, gc('hoa', () => new THREE.CylinderGeometry(.08, .08, .06, 16)), MAT.black, V(2.6 + i * .6, 4.15, tz - .44), Z1); box(.04, .12, .04, MAT.ss, 2.6 + i * .6, 4.15, tz - .48, tp); }
  box(.05, .5, .06, MAT.ss, 4.55, 4.0, tz - .45, tp);
  bom('Equipment', 'Pump control panel, Turner Controls 625D'); tp.userData.turner = true; tag(tp, 'Pump control panel – Turner Controls 625D', 'Lead/lag pump control w/ HOA switches & pilot lights', 'Owner convention', 'Panel style per owner – E sheets for actual');
  const gn = new THREE.Group(); g.add(gn); const [gx, gz] = S.generator.pos, [gw, gl] = S.generator.size;
  box(gw + 1, .5, gl + 1, MAT.conc, gx, Y0 + .25, gz, gn); box(gw, 5, gl, MAT.gen, gx, Y0 + 3, gz, gn); const ex2 = cyl(.25, 2, M(0x333333), gn); ex2.position.set(gx, Y0 + 6.2, gz - gl / 2 + 1);
  bom('Equipment', 'Standby generator 150 kW diesel'); tag(gn, 'Standby generator', S.generator.desc, 'Sheets E2, E5 schedule', 'Pad/enclosure size ASSUMED');
  const pole = cyl(.5, 30, MAT.wood, g); pole.position.set(S.site.utility_pole.pos[0], 15, S.site.utility_pole.pos[1]); tag(pole, 'Proposed utility pole / service', '', 'Sheet E2');
  label('Generator 150 kW', gx, 8, gz);
}
// ---------- YARD PIPING: buried white PVC, DI risers only where pipe leaves the ground ----------
const w11 = S.wells[0].pos, w12 = S.wells[1].pos, yD = YB, yS = YB - .5, yO = YB - .3;
const TLM = d => rOD(d) * 2.2;
const bv = (p, ax, d, info) => valve(p, ax, d, 'gate', info, G.piping, UP, { buried: true });
U([[w11[0], Y0 - 1, w11[1] + 5], [w11[0], YB, w11[1] + 5], [w11[0], YB, 14], [P.well11.x, YB, 14], [P.well11.x, YB, hz + .75], [P.well11.x, Y0 - 1, hz + .75]], 6, ['Prop. 6" W.M. from Well No. 11 (buried)', '6" water main, white PVC, ~3 ft cover', 'Sheets 3, 6', 'Route simplified; buried'], { flow: 'raw', on: () => SIM.wellOn });
U([[w12[0] + 5, Y0 - 1, w12[1]], [w12[0] + 5, YB + .5, w12[1]], [w12[0] + 5, YB + .5, 16], [P.well12.x, YB + .5, 16], [P.well12.x, YB + .5, hz + .75], [P.well12.x, Y0 - 1, hz + .75]], 4, ['Prop. 4" W.M. from Well No. 12 (buried)', '4" water main, white PVC', 'Sheets 3, 6', 'Route simplified; buried'], { flow: 'raw', on: () => SIM.wellOn });
U([[P.well11.x, Y0 - 1, -hz - .75], [P.well11.x, YB, -hz - .75], [P.well11.x, YB, -10], [P.well11.x - 1.4, YB, -10], [P.well11.x - 1.4, YB, -12 + TLM(8)]], 6, ['Well 11 discharge to GST fill (buried)', '6" white PVC', 'Sheet 6'], { flow: 'chl', on: () => SIM.wellOn });
U([[P.well12.x, Y0 - 1, -hz - .75], [P.well12.x, YB, -hz - .75], [P.well12.x, YB, -12 + TLM(8)]], 4, ['Well 12 discharge to GST fill (buried)', '4" white PVC', 'Sheet 6'], { flow: 'chl', on: () => SIM.wellOn });
mjTee([P.well11.x - 1.4, YB, -12], X1, Z1, 8, 6); mjTee([P.well12.x, YB, -12], X1, Z1, 8, 4); mjCap([-2.6, YB, -12], X1, 8);
U([[-2.6, YB, -12], [-20, YB, -12], [-20, YB, -67], [-16.3, YB, -67], [-16.3, Y0 - 1, -67]], 8, ['Prop. 8" W.M. fill line to G.S.T.s (buried)', '8" white PVC', 'Sheet 3', 'Fills GST; side/route simplified'], { flow: 'chl', on: () => SIM.wellOn });
mjTee([-20, YB, -38], Z1, X1, 8);
U([[-20, YB, -38], [-16.3, YB, -38], [-16.3, Y0 - 1, -38]], 8, ['Fill branch to GST No. 1', '8" white PVC', 'Sheet 3'], { flow: 'chl', on: () => SIM.wellOn });
for (const z of [-38, -67]) bv([-18.2, YB, z], 'x', 8, ['GST inlet gate valve (buried)', '8" gate valve w/ adj. valve box', 'Sheet 3']);
U([[6.3, Y0 - 1, -67], [6.3, yS, -67], [14, yS, -67], [14, yS, -11], [P.gst_suction_in.x, yS, -11], [P.gst_suction_in.x, yS, -hz - .75], [P.gst_suction_in.x, Y0 - 1, -hz - .75]], 8, ['8" GST outlet / suction to pump station (buried)', '8" white PVC', 'Sheets 3, 5, 6'], { flow: 'suc', on: () => SIM.anyRun });
mjTee([14, yS, -38], Z1, X1.clone().negate(), 8);
U([[6.3, Y0 - 1, -38], [6.3, yS, -38], [14, yS, -38]], 8, ['GST No. 1 outlet branch', '8" white PVC', 'Sheet 3'], { flow: 'suc', on: () => SIM.anyRun });
for (const z of [-38, -67]) bv([10, yS, z], 'x', 8, ['GST suction-side gate valve (buried)', '8" gate valve w/ valve box', 'Sheet 3']);
// distribution to PTs (buried). PT risers come up OUTSIDE the saddle footers, then a short flanged horizontal + 90 into the tank bottom
const PTR = PT.len / 2 - 2.3, PTN = PT.len / 2 - 3.5; // riser / bottom-nozzle offsets from PT center (footers end at 7.8)
U([[P.to_distribution.x, Y0 - 1, -9.4], [P.to_distribution.x, yD, -9.4], [pts[1].center[0], yD, -9.4], [pts[1].center[0], yD, pts[1].center[1] - PTR], [pts[1].center[0], Y0 - 1, pts[1].center[1] - PTR]], 8, ['8" header to pressure tanks (buried)', 'Prop. 8" W.M., white PVC', 'Sheet 3'], { flow: 'prs', on: () => SIM.anyRun });
mjTee([pts[0].center[0], yD, -9.4], X1, Z1, 8);
U([[pts[0].center[0], yD, -9.4], [pts[0].center[0], yD, pts[0].center[1] - PTR], [pts[0].center[0], Y0 - 1, pts[0].center[1] - PTR]], 8, ['8" branch to PT No. 1 (buried)', '8" white PVC', 'Sheet 3'], { flow: 'prs', on: () => SIM.anyRun });
for (const p of pts) { const [x, z] = p.center, yb = PCY - PT.dia / 2;
  for (const [sg_, nm, extra] of [[-1, 'inlet', 'Inlet off tank bottom; riser outside saddle footer'], [1, 'outlet', 'Outlet off tank bottom (no meter/check); riser outside saddle footer']]) { const zr = z + sg_ * PTR, zn = z + sg_ * PTN, yh = Y0 + 1.75;
    run([[x, yb + .02, zn], [x, yh, zn], [x, yh, zr], [x, Y0 - 1, zr]], 8, MAT.di, [`${p.name} ${nm} riser`, `8" FL DI: tank-bottom nozzle, FL 90, short FL horizontal, FL 90, riser into ground outside footer`, 'Sheets 3, 4 / owner', extra], G.piping, { fl: 'a', R: .45, flow: nm === 'inlet' ? 'prs' : 'main', rev: nm === 'inlet', on: nm === 'inlet' ? () => SIM.anyRun : () => SIM.outQ > 1 });
    valve([x, Y0 + .45, zr], 'y', 8, 'gate', [`${p.name} ${nm} gate valve`, '8" gate valve', 'Sheet 4'], G.piping, Z1.clone().multiplyScalar(sg_)); }
  U([[x, Y0 - 1, z + PTR], [x, yO, z + PTR], [x, yO, 22], ...(x === pts[0].center[0] ? [] : [[pts[0].center[0], yO, 22]])], 8, [`${p.name} outlet to mains (buried)`, '8" white PVC', 'Sheets 3, 4'], { flow: 'main', on: () => SIM.outQ > 1 }); }
mjTee([pts[0].center[0], yO, 22], Z1, X1, 8);
U([[pts[0].center[0], yO, 22], [pts[0].center[0], yO, 52], [-30, yO, 52]], 8, ['Prop. 8" W.M. to distribution (buried)', '8" white PVC; tie-in to ex. 3" W.M. (tapping sleeve & valve) / future 8"', 'Sheet 3 inset A'], { flow: 'main', on: () => SIM.outQ > 1 });
run([[-150, yO, 54], [150, yO, 54]], 3, M(0x6c7a89, .5, .2), ['Existing 3" W.M. (buried)', 'Ex. 3" W.M. along FM 1653', 'Sheet 3'], G.piping, { col: false });
// ---------- TANKS (all white) ----------
const GD = S.gst_dims, gr = GD.dia / 2, el = v => v - S.site.ffe.v;
for (const t0 of S.gst) { const [x, z] = t0.center, g = new THREE.Group(); G.tanks.add(g);
  if (t0.future) { const m = new THREE.Mesh(new THREE.CylinderGeometry(gr, gr, .3, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .35 })); m.position.set(x, 0, z); m.userData.noPick = true; g.add(m); tag(g, t0.name, t0.cap + ", FFE 533.00", 'Sheet 3'); label('Future GST', x, 3, z); continue; }
  const ring = new THREE.Mesh(gc('gring', () => new THREE.CylinderGeometry(gr + .8, gr + .8, 1.2, 48)), MAT.conc); ring.position.set(x, -.6, z); g.add(ring);
  const shell = new THREE.Mesh(gc('gsh', () => new THREE.CylinderGeometry(gr, gr, GD.height, 64, 1, true)), MAT.tank); shell.position.set(x, GD.height / 2, z); g.add(shell);
  const rf = new THREE.Mesh(gc('groof', () => new THREE.ConeGeometry(gr + .25, 1.6, 64, 1, true)), MAT.tank); rf.position.set(x, GD.height + .8, z); g.add(rf);
  lm(g, gc('gbnd', () => new THREE.TorusGeometry(gr + .02, .07, 6, 64)), MAT.tank, V(x, GD.height, z)).rotation.x = Math.PI / 2;
  bom('Tanks', 'Ground storage tank, welded steel 50,000 gal', `19'Ø x 24'`);
  { const w = new THREE.Mesh(gc('gwat', () => new THREE.CylinderGeometry(gr - .15, gr - .15, 1, 48)), MAT.gwat); w.position.set(x, 10, z); w.userData.noPick = true; g.add(w); GWAT.push(w); }
  tag(g, t0.name, `${t0.cap} welded steel, ${GD.height}' H x ${GD.dia}' dia (AWWA D100)`, 'Sheets 3, 5', `Base 533.00, overflow 556.00, fill off 555.50, fill on 551.50, low alarm 545.00`);
  // caged ladder (south face)
  const lad = new THREE.Group(); g.add(lad); const lz = z + gr + .6, ltop = GD.height + 3.5;
  for (const dx of [-.75, .75]) { seg(V(x + dx, 1, lz), V(x + dx, ltop, lz), .06, MAT.galv, lad, 8); for (const yy of [3, 12, GD.height - 1]) seg(V(x + dx, yy, lz), V(x + dx, yy, z + gr), .03, MAT.galv, lad, 6); }
  const RG = gc('rung', () => new THREE.CylinderGeometry(.03, .03, 1.5, 6)), rungs = new THREE.InstancedMesh(RG, MAT.galv, Math.floor(ltop) - 1); let k = 0;
  for (let yy = 2; yy < ltop; yy++, k++) rungs.setMatrixAt(k, _m.compose(V(x, yy, lz), new THREE.Quaternion().setFromAxisAngle(Z1, Math.PI / 2), _s)); rungs.count = k; lad.add(rungs);
  const cz = lz + .95; for (let yy = 8; yy <= ltop; yy += 3) { const h = lm(lad, gc('hoop', () => new THREE.TorusGeometry(1.15, .04, 6, 20, Math.PI)), MAT.galv, V(x, yy, cz)); h.rotation.x = Math.PI / 2; for (const s of [-1, 1]) seg(V(x + s * .75, yy, lz), V(x + s * 1.15, yy, cz), .03, MAT.galv, lad, 6); }
  for (let i = 0; i < 5; i++) { const a = (i + .5) / 5 * Math.PI; seg(V(x + Math.cos(a) * 1.15, 8, cz + Math.sin(a) * 1.15), V(x + Math.cos(a) * 1.15, ltop, cz + Math.sin(a) * 1.15), .025, MAT.galv, lad, 6); }
  for (const dx of [-1.6, 1.6]) seg(V(x + dx, GD.height + .3, z + gr - 1.2), V(x + dx, GD.height + 3.6, z + gr - 1.2), .04, MAT.galv, lad, 6); seg(V(x - 1.6, GD.height + 3.5, z + gr - 1.2), V(x + 1.6, GD.height + 3.5, z + gr - 1.2), .04, MAT.galv, lad, 6);
  tag(lad, 'Caged ladder w/ detachable lower section', 'Galvanized steel ladder with safety cage', 'Sheet 5', 'Cage per owner convention');
  // nozzles: inlet (west) & outlet (east) flanged at 12" AFF, DI 90 down into ground at foundation
  for (const [s, nm] of [[-1, 'inlet'], [1, 'outlet']]) { const xw = x + s * gr, ng = new THREE.Group(); G.tanks.add(ng);
    lm(ng, gc('rpad', () => new THREE.CylinderGeometry(.75, .75, .06, 28)), MAT.tank, V(xw + s * .02, 1, z), X1);
    run([[xw, 1, z], [xw + s * .75, 1, z]], 8, MAT.tank, null, ng, { fl: 'b' });
    run([[xw + s * .75, 1, z], [xw + s * 1.8, 1, z], [xw + s * 1.8, Y0 - 1, z]], 8, MAT.di, null, ng, { fl: 'a' });
    fpath([[x + s * (gr - 1), 1, z], [xw + s * 1.8, 1, z], [xw + s * 1.8, Y0 - 1, z]][s < 0 ? 'reverse' : 'slice'](), s < 0 ? 'chl' : 'suc', s < 0 ? () => SIM.wellOn : () => SIM.anyRun, rOD(8));
    tag(ng, `${t0.name} ${nm} nozzle`, `8" 125 lb flanged ${nm} nozzle (12" AFF) + DI 90 down into ground`, 'Sheet 5', 'Buried PVC beyond'); }
  const ov = run([[x - gr - .1, el(GD.overflow), z + 2], [x - gr - .6, el(GD.overflow), z + 2], [x - gr - .6, .6, z + 2]], 8, MAT.tank, ['8" overflow w/ flap valve', '8" overflow, flap valve at 6" deep gravel', 'Sheet 5'], G.tanks, { col: false });
  const vt = cyl(.45, 1, MAT.tank, g); vt.position.set(x, GD.height + 2, z); tag(vt, '10" vent', '10" dia vent w/ screened openings', 'Sheet 5');
  tag(box(2.5, .3, 2.5, MAT.tank, x + 3, GD.height + .6, z + 5, g), '30"x30" roof hatch', '', 'Sheet 5');
  const mw = cyl(1.25, .4, MAT.tank, g); mw.rotation.z = Math.PI / 2; mw.position.set(x + gr * .7, 2.2, z + gr * .7); mw.rotation.y = -Math.PI / 4; tag(mw, '30" dia manway', '', 'Sheet 5');
  const ex = x + 3, ez = z - 3, cpl = cyl(.15, .5, MAT.galv, g); cpl.position.set(ex, GD.height + .3, ez); tag(cpl, '3" coupling & electrode holder', '', 'Sheet 5');
  const E = [['S1 – well OFF', el(GD.fill_off), 'Fill off 555.50 (sheet 5)'], ['S2 – well ON', el(GD.fill_on), 'Fill on 551.50 (sheet 5)'], ['S3 – indicator / low level alarm', el(GD.low_alarm), 'Low alarm 545.00 (sheet 5); indicator role per owner'], ['S4 – emergency', 2.5, "~2.5' up per owner convention – ASSUMED"]];
  E.forEach(([n, h, s], i) => { const e = new THREE.Group(); G.tanks.add(e); seg(V(ex + i * .3, GD.height, ez), V(ex + i * .3, h, ez), .03, MAT.black, e, 6); const em = MAT.red.clone(); em.emissive = new THREE.Color(0x30ff60); em.emissiveIntensity = 0; DYNM.add(em); GELEC.push({ m: em, h }); bom('Instruments', 'GST level electrode'); lm(e, gc('etp', () => new THREE.SphereGeometry(.15, 10, 8)), em, V(ex + i * .3, h, ez)); tag(e, n, `Electrode tip el. ${(h + 533).toFixed(2)}`, 'Sheet 5 / owner', s); });
  label(t0.name + ' 50K', x, GD.height + 4, z); }
for (const p of pts) { const [x, z] = p.center, g = new THREE.Group(); G.tanks.add(g);
  const body = new THREE.Mesh(gc('ptb', () => new THREE.CapsuleGeometry(PT.dia / 2, PT.len - PT.dia, 16, 40)), MAT.tank); body.rotation.x = Math.PI / 2; body.position.set(x, PCY, z); g.add(body);
  const sad = gc('sad', () => { const R = PT.dia / 2 + .03, w = 2.3, a = Math.asin(w / R), base = PCY - Y0, s = new THREE.Shape(); s.moveTo(-w - .2, 0); s.lineTo(w + .2, 0); s.lineTo(w + .2, .25); s.lineTo(w, .25); s.lineTo(w, base - R * Math.cos(a)); s.absarc(0, base, R, -Math.PI / 2 + a, -Math.PI / 2 - a, true); s.lineTo(-w, .25); s.lineTo(-w - .2, .25); s.lineTo(-w - .2, 0);
    return new THREE.ExtrudeGeometry(s, { depth: .5, bevelEnabled: true, bevelSize: .02, bevelThickness: .02, bevelSegments: 1, curveSegments: 24 }).translate(0, 0, -.25); });
  for (const dz of [-7, 7]) { lm(g, sad, M(0x9aa2aa, .5, .5), V(x, Y0, z + dz)); box(5.4, .5, 1.6, MAT.conc, x, Y0 - .1, z + dz, g); for (const s of [-1, 1]) lm(g, gc('abn', () => new THREE.CylinderGeometry(.05, .05, .07, 6)), MAT.bolt, V(x + s * 2.3, Y0 + .28, z + dz + .3)); }
  bom('Tanks', 'Hydropneumatic pressure tank 5,000 gal', `6'Ø x 24'`);
  { const w = new THREE.Mesh(gc('pwat', () => new THREE.CapsuleGeometry(PT.dia / 2 - .1, PT.len - PT.dia, 12, 32)), MAT.pwat); w.rotation.x = Math.PI / 2; w.position.set(x, PCY, z); w.userData.noPick = true; g.add(w); }
  tag(g, p.name, `${PT.cap}, ${PT.dia}'Ø x ${PT.len}' long, horizontal on saddles, hemispherical heads`, 'Sheets 3, 4', `${PT.inlet}; ${PT.prv}; level ${PT.level}`);
  const mh = cyl(1.25, .5, MAT.tank, g, 32); mh.position.set(x, PCY + PT.dia / 2 + .1, z + 3); tag(mh, '30" dia inspection manway', '', 'Sheet 4');
  for (const dx of [-.5, .5]) lm(g, gc('ptn', () => new THREE.CylinderGeometry(.08, .08, .2, 10)), MAT.galv, V(x + dx, PCY + PT.dia / 2 + .05, z - 8));
  label(p.name + ' 5,000 gal', x, PCY + 5, z); }
// ---------- WELL HEADS: discharge out side of casing -> check -> gate -> ~2 ft past slab -> 90 down ----------
for (const [i, w] of S.wells.entries()) { const wg = new THREE.Group(); G.equip.add(wg); const [x, z] = w.pos, d = i === 0 ? 6 : 4, dir = i === 0 ? Z1 : X1, sd = 3, yp = Y0 + 1.6, r = rOD(d);
  box(6, .5, 6, MAT.conc, x, Y0 + .25, z, wg); lm(wg, ucyl(.42, 24), MAT.steel, V(x, Y0 + 1.3, z)).scale.y = 2.6; lm(wg, gc('wsp', () => new THREE.CylinderGeometry(.55, .55, .12, 24)), MAT.steel, V(x, Y0 + 2.62, z)); bolts('equip', IDM, V(x, Y0 + 2.62, z), UP, .47, 6, .12, .06);
  seg(V(x - .2, Y0 + 2.68, z), V(x - .2, Y0 + 3.3, z), .05, MAT.galv, wg, 8); lm(wg, gc('vnt', () => new THREE.TorusGeometry(.12, .05, 8, 12, Math.PI)), MAT.galv, V(x - .32, Y0 + 3.3, z)); seg(V(x + .2, Y0 + 2.68, z), V(x + .2, Y0 + 3.2, z), .06, MAT.galv, wg, 8); box(.6, .8, .3, M(0x8a8f95, .5, .3), x + .2, Y0 + 3.6, z, wg);
  const p0 = V(x, yp, z).addScaledVector(dir, .42), pe = V(x, yp, z).addScaledVector(dir, sd + 2);
  { const lt = M(0x224422, .3, 0, { emissive: 0x00ff44, emissiveIntensity: 0 }); DYNM.add(lt); lm(wg, gc('plt2', () => new THREE.SphereGeometry(.12, 12, 8)), lt, V(x + .2, Y0 + 4.1, z)); WELLV.push(lt); }
  run([p0, pe, V(pe.x, Y0 - 1, pe.z)], d, MAT.di, [`${w.name.split(' (')[0]} discharge`, `${d}" DI out side of well casing, ~2' past slab then 90 down`, 'Sheet 7 well head detail / owner', 'Pipe size per well main – ASSUMED'], wg, { fl: 'a', flow: 'raw', on: () => SIM.wellOn });
  valve(V(x, yp, z).addScaledVector(dir, 1.3), dir, d, 'check', [`${w.name.split(' (')[0]} check valve`, `${d}" check valve`, 'Owner convention'], wg);
  valve(V(x, yp, z).addScaledVector(dir, 2.4), dir, d, 'gate', [`${w.name.split(' (')[0]} gate valve`, `${d}" gate valve`, 'Owner convention'], wg);
  const sp = V(x, 0, z).addScaledVector(dir, 4.4); stand(sp.x, sp.z, yp, r, i === 0 ? 'z' : 'x', Y0 + .0, wg);
  tag(wg, w.name, 'Well head (by others)', w.src, w.note || 'Well head detail sheet 7'); label(w.name.split(' (')[0], x, 6, z); }
// ---------- finalize: instanced bolts, shadows ----------
{ const hex = new THREE.CylinderGeometry(1, 1, 1, 6); for (const k in BOLT) { const A = BOLT[k], im = new THREE.InstancedMesh(hex, MAT.bolt, A.length); A.forEach((m, i) => im.setMatrixAt(i, m)); im.computeBoundingSphere(); G[k].add(im); } }
scene.traverse(o => { if (o.isMesh) { const tr = o.material.transparent; o.castShadow = !tr && !o.isInstancedMesh && o !== ground && o !== soil; o.receiveShadow = !tr || o === ground; } });
// ================= v5 FEATURES: merge, flow, operator sim, measure, parts, auto-quality =================
// ---- static geometry merge (per visibility group + material). Originals move to layer 1: not drawn, still raycast for part cards ----
const PERF = { before: null, after: null };
function normGeo(g, mw) { const q = new THREE.BufferGeometry(), n = g.attributes.position.count;
  q.setAttribute('position', g.attributes.position.clone()); q.setAttribute('normal', g.attributes.normal ? g.attributes.normal.clone() : new THREE.Float32BufferAttribute(n * 3, 3));
  q.setAttribute('uv', g.attributes.uv ? g.attributes.uv.clone() : new THREE.Float32BufferAttribute(n * 2, 2));
  if (g.index) q.setIndex(g.index.clone()); else q.setIndex([...Array(n).keys()]); q.applyMatrix4(mw); return q; }
function mergeStatic() { scene.updateMatrixWorld(true); const B = new Map();
  scene.traverse(o => { if (!o.isMesh || o.isInstancedMesh || o === ground || o === soil || DYNM.has(o.material) || o.userData.noPick || Array.isArray(o.material)) return;
    const k = keyOf(o) + '|' + o.material.uuid; if (!B.has(k)) B.set(k, { k: keyOf(o), mat: o.material, list: [] }); B.get(k).list.push(o); });
  let n = 0; for (const b of B.values()) { if (b.list.length < 2) continue; const mg = mergeGeometries(b.list.map(o => normGeo(o.geometry, o.matrixWorld))); if (!mg) continue; mg.computeBoundingSphere();
    const m = new THREE.Mesh(mg, b.mat); m.castShadow = b.list.some(o => o.castShadow); m.receiveShadow = b.list[0].receiveShadow; m.renderOrder = b.list[0].renderOrder; m.userData.noPick = true; m.userData.merged = true; m.raycast = () => {}; G[b.k].add(m);
    for (const o of b.list) { o.layers.set(1); o.castShadow = false; } n += b.list.length; } return n; }
const MERGED = mergeStatic();
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); ray.layers.enable(1); let hl = null;
// ---- flow arrows ----
const FCOL = { raw: 0x9fdcff, chl: 0x2fd0b0, suc: 0x1f6fff, prs: 0xff8a1f, main: 0x2240b0, cl2: 0xc6f01e, phos: 0xd27bff, air: 0xf0f0f0 };
const FNAME = { raw: 'Raw well water', chl: 'Chlorinated → GST', suc: 'Suction GST → pumps', prs: 'Pressure / discharge', main: 'To mains', cl2: 'Cl2 solution', phos: 'Phosphate', air: 'Air (compressor)' };
const FLOWS = {}; { const cone = new THREE.ConeGeometry(.5, 1.5, 10);
  for (const p of FLOWP) { p.cum = [0]; for (let i = 1; i < p.p.length; i++) p.cum.push(p.cum[i - 1] + p.p[i].distanceTo(p.p[i - 1])); p.L = p.cum[p.cum.length - 1]; p.sp = Math.max(1.3, p.r * 7); p.a = Math.max(.13, p.r * 1.15);
    p.d = p.p.slice(1).map((q, i) => q.clone().sub(p.p[i]).normalize()); (FLOWS[p.s] ||= { paths: [], max: 0 }).paths.push(p); FLOWS[p.s].max += Math.ceil(p.L / p.sp) + 2; }
  for (const k in FLOWS) { const f = FLOWS[k], im = new THREE.InstancedMesh(cone, new THREE.MeshBasicMaterial({ color: FCOL[k], transparent: true, opacity: .92, depthTest: false, toneMapped: false }), f.max);
    im.renderOrder = 30; im.frustumCulled = false; im.raycast = () => {}; im.count = 0; im.visible = false; scene.add(im); f.im = im; } }
const _fq = new THREE.Quaternion(), _fp = V(0, 0, 0), _fs = V(1, 1, 1);
function updFlow(t) { for (const k in FLOWS) { const f = FLOWS[k]; let n = 0; f.im.visible = UI.flow;
    if (UI.flow) for (const p of f.paths) { if (!p.c || !p.c()) continue; let j = 0; for (let s = (t * 4) % p.sp; s < p.L && n < f.max; s += p.sp) { while (j < p.d.length - 1 && s > p.cum[j + 1]) j++;
        _fp.copy(p.p[j]).addScaledVector(p.d[j], s - p.cum[j]); _fq.setFromUnitVectors(UP, p.d[j]); _fs.setScalar(p.a); f.im.setMatrixAt(n++, _m.compose(_fp, _fq, _fs)); } }
    f.im.count = n; f.im.instanceMatrix.needsUpdate = true; } }
// ---- operator simulation (training only) ----
const GSTA = 2 * Math.PI * (gr ** 2) * 7.48; // gal per ft, both GSTs
const fseg = h => { const x = Math.min(1, Math.max(0, h / 72)), th = 2 * Math.acos(1 - 2 * x); return (th - Math.sin(th)) / (2 * Math.PI); }; // horiz. cylinder fill fraction
const PTV = 10000, WELLQ = 350, PSI = (m, h) => m / (PTV * (1 - fseg(h)) + 50) - 14.7;
const SIM = { mode: { pwr: 'auto', well: 'auto', comp: 'auto', p0: 'auto', p1: 'auto', p2: 'auto' }, speed: 1, dem: 250, brk: false, gst: 20, pt: 38, m: 0, lead: 0, cyc: false, lag: false, help: false,
  wellOn: false, run: [false, false, false], anyRun: false, comp: false, lock: false, alarm: false, outQ: 0, inQ: 0, psi: 60, t: 0, starts: [0, 0, 0] };
SIM.m = (60 + 14.7) * (PTV * (1 - fseg(SIM.pt)) + 50);
function simStep(dt) { const S_ = SIM, M_ = S_.mode, pwr = M_.pwr !== 'off', P_ = PSI(S_.m, S_.pt); S_.psi = P_;
  // GST electrodes: S1 22.5' well off, S2 18.5' well on, S3 12' indicator/low, S4 2.5' emergency lockout
  if (S_.gst < 2.5) S_.lock = true; else if (S_.lock && S_.gst >= 12) S_.lock = false;
  if (pwr && M_.well === 'auto') { if (S_.gst <= 18.5) S_.wellAuto = true; if (S_.gst >= 22.5) S_.wellAuto = false; }
  S_.wellOn = M_.well === 'run' || (pwr && M_.well === 'auto' && !!S_.wellAuto);
  // Visiprobe: 48" all off, 28" lead on, 22" lag on, 16"/12" alarm; pump 3 helper at alarm level (ASSUMED)
  const L = S_.pt; if (L <= 28 && !S_.cyc) S_.cyc = true; if (L <= 22) S_.lag = true; if (L <= 16) S_.help = true;
  if (L >= 48 && S_.cyc) { S_.cyc = S_.lag = S_.help = false; S_.lead = 1 - S_.lead; }
  if (L <= 12) S_.alarm = true; else if (L >= 16) S_.alarm = false;
  let lead = S_.lead, lag = 1 - lead; if (M_['p' + lead] === 'off' && M_['p' + lag] !== 'off') [lead, lag] = [lag, lead];
  const want = [false, false, false]; if (pwr && S_.cyc) { want[lead] = true; if (S_.lag) want[lag] = true; if (S_.help || M_['p' + lead] === 'off' || (S_.lag && M_['p' + lag] === 'off')) want[2] = true; }
  for (let i = 0; i < 3; i++) { const m = M_['p' + i], on = !S_.lock && S_.gst > .3 && (m === 'run' || (m === 'auto' && want[i])); if (on && !S_.run[i]) S_.starts[i]++; S_.run[i] = on; }
  S_.anyRun = S_.run.some(Boolean);
  // compressor: only between P1 (48") and P2 (28") and Mercoid low (50 psi ASSUMED) -> off at 70 psi
  if (M_.comp === 'run') S_.comp = true; else if (!pwr || M_.comp === 'off' || L >= 48 || L <= 28 || P_ >= 70) S_.comp = false; else if (P_ < 50) S_.comp = true;
  const qp = S_.run.filter(Boolean).length * 600 * Math.max(0, Math.min(1, (95 - P_) / 15)); // pumps fall off near shutoff head
  const qo = S_.dem * Math.max(0, Math.min(1.2, Math.sqrt(Math.max(0, P_) / 55))) + (S_.brk ? 2500 * Math.min(1, Math.sqrt(Math.max(0, P_) / 8)) : 0); // break discharges to atmosphere
  S_.inQ = qp; S_.outQ = qo; const mn = dt / 60;
  S_.gst = Math.max(0, Math.min(23, S_.gst + ((S_.wellOn ? WELLQ : 0) - qp) * mn / GSTA));
  const vw = Math.max(0, Math.min(PTV * .995, PTV * fseg(L) + (qp - qo) * mn)); let lo = 0, hi = 72; for (let k = 0; k < 22; k++) { const md = (lo + hi) / 2; if (PTV * fseg(md) < vw) lo = md; else hi = md; } S_.pt = lo;
  S_.m += (S_.comp ? 14.7 * 75 : 0) * mn - S_.m * 2e-6 * dt; // ~10 SCFM compressor; slow air absorption
  if (PSI(S_.m, S_.pt) > 80) S_.m = 94.7 * (PTV * (1 - fseg(S_.pt)) + 50); // PRV (assumed 80 psi)
}
function simVis(t) { const S_ = SIM; for (const w of GWAT) { w.scale.y = Math.max(.01, S_.gst); w.position.y = S_.gst / 2; }
  MAT.pwat.clippingPlanes[0].constant = PCY - PT.dia / 2 + S_.pt / 12;
  if (VPW.m) { const h = Math.max(.01, S_.pt / 72 * (VPW.yt - VPW.yb)); VPW.m.scale.y = h; VPW.m.position.y = VPW.yb + h / 2; }
  for (const e of ELEC) e.m.emissiveIntensity = S_.pt >= e.pt ? 2.2 : 0; for (const e of GELEC) e.m.emissiveIntensity = S_.gst >= e.h ? 1.6 : 0;
  PUMPV.forEach((p, i) => { const on = S_.run[i]; p.pm.emissiveIntensity = on ? .35 + .1 * Math.sin(t * 6) : 0; p.lt.emissiveIntensity = on ? 3 : 0; if (on) p.fan.rotation.z += .9; });
  for (const l of WELLV) l.emissiveIntensity = S_.wellOn ? 3 : 0; if (COMPV.lt) { COMPV.lt.emissiveIntensity = S_.comp ? 3 : 0; COMPV.g.position.y = S_.comp ? Math.sin(t * 90) * .006 : 0; }
  TPL.forEach((m, i) => m.emissiveIntensity = i < 3 ? (S_.run[i] ? 2.5 : .02) : i === 3 ? (S_.comp ? 2.5 : .02) : i === 4 ? (S_.alarm || S_.lock ? (Math.sin(t * 8) > 0 ? 3 : .1) : .02) : (SIM.mode.pwr !== 'off' ? 2 : .02)); }
// ---- UI ----
const UI = { flow: false, op: false, meas: false };
function mkEl(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); const e = d.firstChild; document.body.appendChild(e); return e; }
function btn(id, txt) { const b = document.createElement('button'); b.className = 'b'; b.id = id; b.textContent = txt; $('bar').insertBefore(b, $('vReset').nextSibling); return b; }
const bParts = btn('bParts', 'Parts'), bMeas = btn('bMeas', 'Measure'), bOp = btn('bOp', 'Operate'), bFlow = btn('bFlow', 'Flow');
const legend = mkEl(`<div id="legend" class="mini"><button class="x sm" aria-label="close">×</button><b>Flow</b>${Object.keys(FCOL).map(k => `<span><i style="background:#${FCOL[k].toString(16).padStart(6, '0')}"></i>${FNAME[k]}</span>`).join('')}<em>stopped equipment = no arrows</em></div>`);
legend.querySelector('.x').onclick = () => legend.style.display = 'none';
function setFlow(v) { UI.flow = v; bFlow.classList.toggle('on', v); legend.style.display = v ? 'block' : 'none'; if (v) hint('Flow arrows follow the simulated plant state (Operate to change)'); }
bFlow.onclick = () => setFlow(!UI.flow);
// operator bottom sheet
const ROWS = [['pwr', 'Control power'], ['well', 'Storage tank fill (wells)'], ['comp', 'Air compressor'], ['p0', 'Boost pump 1'], ['p1', 'Boost pump 2'], ['p2', 'Boost pump 3']];
const op = mkEl(`<div id="op" class="sheet"><div class="sh"><b>Turner 625D</b><span class="sub">training simulation, not SCADA</span><button class="x2" id="opMin" aria-label="minimize">▾</button><button class="x2" id="opX" aria-label="close">×</button></div>
<div class="sb" id="opB">${ROWS.map(([k, n]) => `<div class="row"><span class="rl">${n}<i class="led" id="led_${k}"></i></span><span class="seg" data-k="${k}">${['off', 'auto', 'run'].map(m => `<button data-m="${m}">${m === 'run' ? 'Run' : m === 'off' ? 'Off' : 'Auto'}</button>`).join('')}</span></div>`).join('')}
<div class="row"><span class="rl">Speed <b id="spV">1x</b></span><input type="range" id="spd" min="1" max="60" step="1" value="1"></div>
<div class="row"><span class="rl">Demand <b id="dmV">250 gpm</b></span><input type="range" id="dem" min="0" max="1500" step="25" value="250"></div>
<div class="row"><button class="b sm" id="brk">Simulate line break</button><button class="b sm" id="simR">Reset sim</button></div>
<p class="note">Levels/setpoints from sheets 4–5; well 350 gpm, Mercoid 50–70 psi, PRV 80 psi, pump 3 helper at 16" are ASSUMED.</p></div></div>`);
const hud = mkEl(`<div id="hud" class="mini"></div>`), alarm = mkEl(`<div id="alarm"><span id="alT"></span><button class="x sm" aria-label="dismiss">×</button></div>`);
let alDis = ''; alarm.querySelector('.x').onclick = () => { alDis = $('alT').textContent; alarm.style.display = 'none'; };
op.querySelectorAll('.seg').forEach(sg => sg.onclick = e => { const m = e.target.dataset.m; if (!m) return; SIM.mode[sg.dataset.k] = m; updSeg(); });
function updSeg() { op.querySelectorAll('.seg').forEach(sg => sg.querySelectorAll('button').forEach(b => b.classList.toggle('on', SIM.mode[sg.dataset.k] === b.dataset.m))); }
updSeg(); $('spd').oninput = e => { SIM.speed = +e.target.value; $('spV').textContent = SIM.speed + 'x'; }; $('dem').oninput = e => { SIM.dem = +e.target.value; $('dmV').textContent = SIM.dem + ' gpm'; };
$('brk').onclick = () => { SIM.brk = !SIM.brk; $('brk').classList.toggle('on', SIM.brk); $('brk').textContent = SIM.brk ? 'Repair line break' : 'Simulate line break'; };
$('simR').onclick = () => { Object.assign(SIM, { gst: 20, pt: 38, cyc: false, lag: false, help: false, lock: false, alarm: false, brk: false, wellAuto: false }); SIM.m = 74.7 * (PTV * (1 - fseg(38)) + 50); $('brk').classList.remove('on'); $('brk').textContent = 'Simulate line break'; };
$('opMin').onclick = () => { op.classList.toggle('min'); sheetCls(); }; $('opX').onclick = () => setOp(false); hud.onclick = () => { if (UI.op) { op.style.display = 'block'; op.classList.remove('min'); sheetCls(); } };
function sheetCls() { document.body.classList.toggle('busy', (UI.op && !op.classList.contains('min')) || parts.style.display === 'block'); }
function setOp(v) { UI.op = v; setTimeout(sheetCls); bOp.classList.toggle('on', v); op.style.display = v ? 'block' : 'none'; op.classList.remove('min'); hud.style.display = v ? 'block' : 'none'; if (v) { closeCard(); $('info').classList.add('hide'); if (!vis.xtank) setVis('xtank', true); hint('Tap the Turner panel anytime to reopen these controls'); } else alarm.style.display = 'none'; }
bOp.onclick = () => setOp(!UI.op);
function updHud() { if (!UI.op) return; const S_ = SIM; for (const [k] of ROWS) { const on = k === 'pwr' ? S_.mode.pwr !== 'off' : k === 'well' ? S_.wellOn : k === 'comp' ? S_.comp : S_.run[+k[1]]; $('led_' + k).classList.toggle('on', !!on); }
  hud.innerHTML = `GST <b>${S_.gst.toFixed(1)} ft</b> · PT <b>${S_.pt.toFixed(1)}"</b> · <b>${Math.max(0, S_.psi).toFixed(0)} psi</b><sup>*</sup><br>Lead <b>P${S_.lead + 1}</b> · run ${S_.run.map((r, i) => r ? 'P' + (i + 1) : '').filter(Boolean).join('+') || '—'}${S_.wellOn ? ' · well' : ''}${S_.comp ? ' · air' : ''} · ${S_.speed}x`;
  const a = [S_.alarm && 'EMERGENCY LOW PT LEVEL (12") – possible line break', S_.lock ? 'GST below S4 – boosters LOCKED OUT until S3' : S_.gst < 12 && 'GST low (S3 indicator)'].filter(Boolean).join(' · ');
  if (a && a !== alDis) { $('alT').textContent = a; alarm.style.display = 'flex'; alarm.classList.toggle('warn', !S_.lock && !S_.alarm); } else if (!a) { alarm.style.display = 'none'; alDis = ''; } }
// ---- measure ----
const MS = { pts: [], g: new THREE.Group(), lab: mkEl(`<div id="mlab" class="lbl"></div>`) }; scene.add(MS.g);
const mchip = mkEl(`<div id="mchip" class="mini"><span id="mtx">Tap two points</span><button class="b sm" id="mClr">Clear</button><button class="x sm" aria-label="close">×</button></div>`);
mchip.querySelector('.x').onclick = () => setMeas(false); $('mClr').onclick = () => mClear();
const MDOT = new THREE.MeshBasicMaterial({ color: 0xff2d55, depthTest: false }), MLIN = new THREE.LineBasicMaterial({ color: 0xff2d55, depthTest: false });
function mClear() { MS.pts = []; MS.g.clear(); MS.lab.style.display = 'none'; $('mtx').textContent = 'Tap two points'; }
function setMeas(v) { UI.meas = v; bMeas.classList.toggle('on', v); mchip.style.display = v ? 'flex' : 'none'; if (!v) mClear(); else closeCard(); }
bMeas.onclick = () => setMeas(!UI.meas);
const ftin = d => { let n = Math.round(d * 48) / 4, f = Math.floor(n / 12), i = n - f * 12; const w = Math.floor(i), fr = i - w; return `${f}' ${w}${fr ? '-' + { .25: '1/4', .5: '1/2', .75: '3/4' }[fr] : ''}"`; };
function measTap(e) { ndc.set(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1); ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(scene.children, true).filter(h => visible(h.object) && h.object !== soil && !h.object.userData.noPick && !h.object.userData.merged && h.object.material !== MAT.acryl && h.object.material !== MAT.water && !(vis.xtank && h.object.material === MAT.tank) && h.object !== hl);
  const h = hits.find(h => !(vis.xray && XG.includes(h.object))) || hits[0]; if (!h) return;
  if (MS.pts.length >= 2) mClear(); MS.pts.push(h.point.clone()); const d = new THREE.Mesh(gc('mdot', () => new THREE.SphereGeometry(.12, 12, 8)), MDOT); d.position.copy(h.point); d.renderOrder = 40; d.userData.noPick = true; MS.g.add(d);
  if (MS.pts.length === 2) { const [a, b] = MS.pts, ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), MLIN); ln.renderOrder = 40; MS.g.add(ln); const dd = a.distanceTo(b);
    MS.lab.textContent = ftin(dd); MS.lab.style.display = 'block'; $('mtx').textContent = `${ftin(dd)} (Δh ${ftin(Math.abs(a.y - b.y))})`; } else $('mtx').textContent = 'Tap second point'; }
// ---- parts list ----
const parts = mkEl(`<div id="parts" class="card"><button class="x" aria-label="close">×</button><h3>Parts list (BOM)</h3><p class="tag">Estimate computed from the model geometry – verify against plans.</p><button class="b sm" id="csv">Download CSV</button><div id="ptab"></div></div>`);
parts.querySelector('.x').onclick = () => { parts.style.display = 'none'; bParts.classList.remove('on'); sheetCls(); };
const CATO = ['Pipe', 'Fittings', 'Valves', 'Equipment', 'Tanks', 'Instruments', 'Fixtures', 'Supports', 'Hardware'];
const bomRows = () => [...BOM.values()].sort((a, b) => CATO.indexOf(a.cat) - CATO.indexOf(b.cat) || a.item.localeCompare(b.item) || parseFloat(b.size) - parseFloat(a.size)).map(r => ({ ...r, q: r.unit === 'LF' ? Math.round(r.q * 10) / 10 : r.q }));
function renderParts() { let h = '', c = ''; for (const r of bomRows()) { if (r.cat !== c) { c = r.cat; h += `<tr class="cat"><td colspan="3">${c}</td></tr>`; } h += `<tr><td class="q">${r.q} ${r.unit === 'LF' ? 'LF' : ''}</td><td>${r.item}</td><td>${r.size}</td></tr>`; } $('ptab').innerHTML = `<table>${h}</table>`; }
bParts.onclick = () => { const v = parts.style.display !== 'block'; parts.style.display = v ? 'block' : 'none'; bParts.classList.toggle('on', v); sheetCls(); if (v) { renderParts(); closeCard(); $('info').classList.add('hide'); } };
$('csv').onclick = () => { const q = s => `"${String(s).replace(/"/g, '""')}"`; const csv = ['Category,Item,Size,Qty,Unit', ...bomRows().map(r => [r.cat, r.item, r.size, r.q, r.unit].map(q).join(',')), '', q('Estimate from model (LHM Plant No. 3, UtiCAD) - verify against plans')].join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'LHM-Plant3-parts-estimate.csv'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); };
// ---------- CAMERA / CONTROLS ----------
const orbit = new OrbitControls(camera, renderer.domElement); orbit.enableDamping = true; orbit.maxPolarAngle = Math.PI * .62; orbit.minDistance = 2; orbit.maxDistance = 600; orbit.screenSpacePanning = false;
orbit.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
const views = { out: [V(95, 70, 95), V(5, 2, -15)], inn: [V(-3.5, 6.3, 6.5), V(5, 2.5, -3.5)] };
function setView(k) { setWalk(false); if (k === 'inn') $('info').classList.add('hide'); const [p, tg] = views[k]; camera.position.copy(p); orbit.target.copy(tg); orbit.update(); setVis('roof', k !== 'inn'); }
let walk = false, yaw = 0, pitch = 0; const keys = {}, joy = { x: 0, y: 0 };
function setWalk(on) { walk = on; orbit.enabled = !on; $('vWalk').classList.toggle('on', on); $('joy').style.display = on && MOBILE ? 'block' : 'none';
  if (on) { camera.position.set(0, 5.5, 13); closeCard(); $('info').classList.add('hide'); yaw = 0; pitch = 0; setVis('roof', false); hint(MOBILE ? 'Joystick to walk (push to edge to run) · drag to look' : 'WASD / arrows to walk · Shift to run · drag to look · Q/E up/down'); } }
let hintT; function hint(s) { const h = $('hint'); h.textContent = s; h.style.display = 'block'; clearTimeout(hintT); hintT = setTimeout(() => h.style.display = 'none', 3500); }
addEventListener('keydown', e => keys[e.code] = true); addEventListener('keyup', e => keys[e.code] = false);
const cv = renderer.domElement; let down = null;
cv.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now(), lx: e.clientX, ly: e.clientY, id: e.pointerId }; });
cv.addEventListener('pointermove', e => { if (!down || !walk || e.pointerId !== down.id) return; yaw -= (e.clientX - down.lx) * .005; pitch = Math.max(-1.3, Math.min(1.3, pitch - (e.clientY - down.ly) * .005)); down.lx = e.clientX; down.ly = e.clientY; });
cv.addEventListener('pointerup', e => { if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 7 && performance.now() - down.t < 500) (UI.meas ? measTap : pick)(e); down = null; });
const visible = o => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
function pick(e) { ndc.set(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1); ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(scene.children, true).filter(h => visible(h.object) && h.object !== ground && h.object !== soil && !h.object.userData.noPick && !(vis.xray && XG.includes(h.object)) && !(vis.xtank && h.object.material === MAT.tank) && h.object.material !== MAT.acryl && h.object.material !== MAT.water && h.object.material !== MAT.vwat);
  for (const h of hits) { let o = h.object; while (o && !o.userData.info) o = o.parent; if (!o) continue; if (o.userData.turner) { if (!UI.op) setOp(true); else { op.style.display = 'block'; op.classList.remove('min'); sheetCls(); } } return showCard(o); } closeCard(); }
function showCard(o) { const i = o.userData.info; $('cardB').innerHTML = `<h3>${i.name}</h3>${i.size ? `<p>${i.size}</p>` : ''}<p><b>Source:</b> ${i.src}</p>${i.extra ? `<p class="tag">${i.extra}</p>` : ''}`; $('card').style.display = 'block';
  if (hl) hl.removeFromParent(); const bb = new THREE.Box3().setFromObject(o); hl = new THREE.Box3Helper(bb, 0xffd400); scene.add(hl); }
function closeCard() { $('card').style.display = 'none'; if (hl) { hl.removeFromParent(); hl = null; } }
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => b.dataset.close === 'card' ? closeCard() : $('info').classList.add('hide'));
$('iBtn').onclick = () => $('info').classList.toggle('hide');
if (matchMedia('(max-width:700px)').matches) $('info').classList.add('hide');
{ const j = $('joy'), k = $('knob'); let jid = null; const upd = e => { const r = j.getBoundingClientRect(); let dx = e.clientX - r.left - 60, dy = e.clientY - r.top - 60; const l = Math.hypot(dx, dy); if (l > 45) { dx *= 45 / l; dy *= 45 / l; } joy.x = dx / 45; joy.y = dy / 45; k.style.left = 35 + dx + 'px'; k.style.top = 35 + dy + 'px'; };
  j.addEventListener('pointerdown', e => { jid = e.pointerId; j.setPointerCapture(jid); upd(e); e.stopPropagation(); });
  j.addEventListener('pointermove', e => { if (e.pointerId === jid) upd(e); });
  const end = () => { jid = null; joy.x = joy.y = 0; k.style.left = k.style.top = '35px'; }; j.addEventListener('pointerup', end); j.addEventListener('pointercancel', end); }
const vis = { roof: true, walls: true, piping: true, electrical: true, tanks: true, labels: false, xray: true, xtank: false };
function setVis(k, v) { vis[k] = v; renderer.shadowMap.needsUpdate = true; if (G[k]) G[k].visible = v; if (k === 'labels') $('lbls').style.display = v ? 'block' : 'none';
  if (k === 'xray') for (const m of [MAT.grass, MAT.gravel, MAT.road]) { m.transparent = v; m.depthWrite = !v; m.opacity = v ? (m === MAT.grass ? .5 : .55) : 1; m.needsUpdate = true; }
  if (k === 'xtank') { const m = MAT.tank; m.transparent = v; m.opacity = v ? .35 : 1; m.depthWrite = !v; m.needsUpdate = true; }
  document.querySelector(`[data-t="${k}"]`)?.classList.toggle('on', v); }
document.querySelectorAll('[data-t]').forEach(b => b.onclick = () => setVis(b.dataset.t, !vis[b.dataset.t]));
setVis('labels', false); setVis('xray', true);
$('vOut').onclick = () => setView('out'); $('vIn').onclick = () => setView('inn'); $('vWalk').onclick = () => walk ? setView('out') : setWalk(true); $('vReset').onclick = () => { for (const k of ['walls', 'piping', 'electrical', 'tanks', 'xray']) setVis(k, true); setVis('xtank', false); closeCard(); setView('out'); };
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.fov = camera.aspect < .8 ? 62 : 50; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize(); setView('out');
const clock = new THREE.Clock(), tmp = V(0, 0, 0); let fN = 0, fT = performance.now(), hudN = 0; window.__fps = 0;
// auto quality: after 3 consecutive seconds < 30 fps drop pixel ratio, then shadows (?hq disables)
const Q = { lvl: 0, low: 0, skip: 2, off: /[?&]hq/.test(location.search) }; window.__quality = () => ({ level: Q.lvl, pixelRatio: renderer.getPixelRatio(), shadows: renderer.shadowMap.enabled });
function autoQ(f) { if (Q.off || Q.lvl >= 2 || document.hidden) return; if (Q.skip > 0) { Q.skip--; return; } Q.low = f < 30 ? Q.low + 1 : 0; if (Q.low < 3) return; Q.low = 0; Q.skip = 2; Q.lvl++;
  if (Q.lvl === 1) { renderer.setPixelRatio(Math.min(PR0, 1)); resize(); } else { renderer.shadowMap.enabled = false; scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); } }
renderer.setAnimationLoop(() => { const rdt = Math.min(clock.getDelta(), .5), dt = Math.min(rdt, .05);
  if (walk) { const f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - joy.y, s = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + joy.x, jm = Math.hypot(joy.x, joy.y), run_ = keys.ShiftLeft || keys.ShiftRight || jm > .92, sp = (run_ ? 50 : 22) * dt;
    camera.position.x += (-Math.sin(yaw) * f + Math.cos(yaw) * s) * sp; camera.position.z += (-Math.cos(yaw) * f - Math.sin(yaw) * s) * sp; camera.position.y = Math.max(1.5, camera.position.y + ((keys.KeyE ? 1 : 0) - (keys.KeyQ ? 1 : 0)) * sp);
    camera.rotation.set(pitch, yaw, 0, 'YXZ'); } else orbit.update();
  { let sd = rdt * SIM.speed; SIM.t += sd; while (sd > 0) { const h = Math.min(sd, .5); simStep(h); sd -= h; } } const tt = clock.elapsedTime; simVis(tt); updFlow(tt); if (++hudN % 6 === 0) updHud();
  if (MS.pts.length === 2) { tmp.copy(MS.pts[0]).add(MS.pts[1]).multiplyScalar(.5).project(camera); const on = tmp.z < 1; MS.lab.style.display = on ? 'block' : 'none'; MS.lab.style.left = (tmp.x + 1) / 2 * innerWidth + 'px'; MS.lab.style.top = (1 - tmp.y) / 2 * innerHeight + 'px'; }
  renderer.render(scene, camera); fN++; const nw = performance.now(); if (nw - fT > 1000) { window.__fps = fN * 1000 / (nw - fT); fN = 0; fT = nw; autoQ(window.__fps); }
  if (vis.labels) for (const l of LBL) { tmp.copy(l.p).project(camera); const on = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1; l.e.style.display = on ? 'block' : 'none'; if (on) { l.e.style.left = (tmp.x + 1) / 2 * innerWidth + 'px'; l.e.style.top = (1 - tmp.y) / 2 * innerHeight + 'px'; } } });
window.__cam = (p, tg, opt = {}) => { setWalk(false); camera.position.set(...p); orbit.target.set(...tg); orbit.update(); for (const k in opt) setVis(k, opt[k]); };
window.__stats = () => ({ ...renderer.info.render, merged: MERGED });
window.__sim = SIM; window.__bom = () => bomRows();
window.__ready = true;

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/controls/OrbitControls.js';

const $ = (id) => document.getElementById(id);
const API = '';
const DIM = { width: 12, depth: 10.5, wall: 0.23, floor: 3.3, roofBearing: 6.6, ridge: 8.43 };
let scene, camera, orthoCamera, renderer, controls, modelRoot, raycaster, pointer;
let selected = null, isTechnical = false, measureMode = false, measureStart = null, lastSolar = null;
let floors = { ground: true, upper: true }, exploded = false, currentPreset = 'render';
const materials = {};
const editable = [];

function mat(name, color, roughness = .65, metalness = 0) {
  materials[name] = new THREE.MeshStandardMaterial({ color, roughness, metalness });
  return materials[name];
}
function initMaterials() {
  mat('renderWall', 0xd8d0bd, .82); mat('renderWallAlt', 0xbcb5a5, .9); mat('concrete', 0x7c8581, .95);
  mat('roof', 0x354a46, .6, .08); mat('roofEdge', 0x1b2725, .5, .12); mat('glass', 0x4f8890, .12, .42);
  mat('frame', 0x202827, .42, .35); mat('floor', 0x9b8b70, .88); mat('floorUpper', 0xc1b8a6, .88);
  mat('door', 0x4c392e, .72); mat('room', 0x89a97b, .84); mat('solar', 0x183e50, .18, .55); mat('lime', 0xd9ff4a, .3, .25);
  mat('stressLow', 0x56d8b1, .4); mat('stressMid', 0xffc857, .4); mat('stressHigh', 0xff685e, .35);
}
function box(name, size, pos, material, meta = {}, parent = modelRoot) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name; mesh.position.set(...pos); mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.userData = { name, ...meta, size, materialName: Object.keys(materials).find(k => materials[k] === material) || 'custom' };
  parent.add(mesh); editable.push(mesh); return mesh;
}
function floorSlab(level, y, material) {
  const slab = box(level === 'ground' ? 'Ground floor slab' : 'First floor slab', [DIM.width, .18, DIM.depth], [0, y, 0], material, { category: 'floor', level, dimensions: `${DIM.width.toFixed(2)} × ${DIM.depth.toFixed(2)} m`, elevation: `+${y.toFixed(3)} m` });
  slab.userData.floor = level; return slab;
}
function wall(name, size, pos, level, zone = 'Envelope') {
  const m = zone === 'Internal partition' ? materials.renderWallAlt : materials.renderWall;
  const w = box(name, size, pos, m, { category: zone, level, dimensions: `${size[0].toFixed(2)} × ${size[1].toFixed(2)} × ${size[2].toFixed(2)} m`, material: 'Provisional rendered masonry' });
  w.userData.floor = level; return w;
}
function opening(name, size, pos, type, level, material, extra = {}) {
  const o = box(name, size, pos, material, { category: type, level, dimensions: `${size[0].toFixed(2)} × ${size[1].toFixed(2)} × ${size[2].toFixed(2)} m`, material: type === 'Window' ? 'Low-E glazing / aluminium frame' : 'Timber door leaf', ...extra });
  o.userData.floor = level; return o;
}
function addRoom(name, center, size, level, color) {
  const room = box(name, [size[0], .025, size[1]], [center[0], level === 'ground' ? .105 : 3.405, center[1]], new THREE.MeshStandardMaterial({ color, transparent: true, opacity: .18, depthWrite: false }), { category: 'Room', level, dimensions: `${size[0].toFixed(2)} × ${size[1].toFixed(2)} m`, area: `${(size[0] * size[1]).toFixed(1)} m²`, finish: 'Conceptual room zone' });
  room.userData.floor = level; room.renderOrder = 2; return room;
}
function createResidence() {
  modelRoot = new THREE.Group(); modelRoot.name = 'Mbarara Smart Residence / MBR-26-001'; scene.add(modelRoot);
  floorSlab('ground', .0, materials.floor); floorSlab('upper', 3.3, materials.floorUpper);
  const levels = [{ name: 'Ground', level: 'ground', base: .18 }, { name: 'First', level: 'upper', base: 3.48 }];
  levels.forEach(({ level, base }) => {
    wall(`${level} / South external wall`, [DIM.width, 3.12, DIM.wall], [0, base + 1.56, -DIM.depth / 2], level);
    wall(`${level} / North external wall`, [DIM.width, 3.12, DIM.wall], [0, base + 1.56, DIM.depth / 2], level);
    wall(`${level} / West external wall`, [DIM.wall, 3.12, DIM.depth - .46], [-DIM.width / 2, base + 1.56, 0], level);
    wall(`${level} / East external wall`, [DIM.wall, 3.12, DIM.depth - .46], [DIM.width / 2, base + 1.56, 0], level);
  });
  // Provisional room partitions based on the supplied organizing dimensions.
  wall('Ground / central circulation partition', [.15, 3.0, 7.0], [0, 1.72, .7], 'ground', 'Internal partition');
  wall('Ground / rear service partition', [11.5, 3.0, .15], [0, 1.72, 3.2], 'ground', 'Internal partition');
  wall('First / central circulation partition', [.15, 3.0, 7.0], [0, 5.02, .7], 'upper', 'Internal partition');
  wall('First / rear service partition', [11.5, 3.0, .15], [0, 5.02, 3.2], 'upper', 'Internal partition');
  addRoom('Living room', [-3.0, -2.0], [5.7, 4.7], 'ground', 0x9bb6a1);
  addRoom('Guest bedroom', [3.1, -2.0], [5.6, 4.7], 'ground', 0xb0a3c8);
  addRoom('Study / circulation', [-3.0, 2.0], [5.7, 3.0], 'ground', 0x8ca9bf);
  addRoom('Kitchen / service', [3.1, 2.0], [5.6, 3.0], 'ground', 0xd0ad75);
  addRoom('Primary bedroom', [-3.1, -2.0], [5.8, 4.7], 'upper', 0x9bb6a1);
  addRoom('Bedroom 02', [3.1, -2.0], [5.6, 4.7], 'upper', 0xb0a3c8);
  addRoom('Bedroom 03 / study', [0, 2.1], [10.8, 3.1], 'upper', 0x8ca9bf);
  const frontZ = -DIM.depth / 2 - .03;
  opening('Main entrance door', [1.25, 2.35, .08], [-3.0, 1.3, frontZ], 'Door', 'ground', materials.door, { clearWidth: '1.25 m', swing: 'Conceptual' });
  opening('Guest entrance door', [1.0, 2.1, .08], [3.1, 1.25, frontZ], 'Door', 'ground', materials.door, { clearWidth: '1.00 m', swing: 'Conceptual' });
  opening('Living room south window', [2.4, 1.55, .08], [-1.0, 2.1, frontZ], 'Window', 'ground', materials.glass, { sill: '+0.900 m' });
  opening('Guest room south window', [2.2, 1.55, .08], [3.0, 2.0, frontZ], 'Window', 'ground', materials.glass, { sill: '+0.900 m' });
  opening('Primary bedroom south window', [2.8, 1.45, .08], [-2.7, 5.45, frontZ], 'Window', 'upper', materials.glass, { sill: '+4.200 m' });
  opening('Bedroom 02 south window', [2.4, 1.45, .08], [3.0, 5.45, frontZ], 'Window', 'upper', materials.glass, { sill: '+4.200 m' });
  opening('West stair window', [.08, 1.5, 2.1], [-DIM.width / 2 - .03, 4.9, 1.5], 'Window', 'upper', materials.glass, { sill: '+4.200 m' });
  const roofY = 6.75;
  const roofL = box('Roof / west pitched plane', [6.9, .18, 11.7], [-3.28, 7.63, 0], materials.roof, { category: 'Roof', level: 'roof', dimensions: '6.90 × 11.70 m', pitch: '16° assumed', overhang: '0.60 m' });
  roofL.rotation.z = -THREE.MathUtils.degToRad(16);
  const roofR = box('Roof / east pitched plane', [6.9, .18, 11.7], [3.28, 7.63, 0], materials.roof, { category: 'Roof', level: 'roof', dimensions: '6.90 × 11.70 m', pitch: '16° assumed', overhang: '0.60 m' });
  roofR.rotation.z = THREE.MathUtils.degToRad(16);
  box('Roof ridge cap', [.22, .22, 11.7], [0, 8.42, 0], materials.roofEdge, { category: 'Roof component', level: 'roof', dimensions: '.22 × 11.70 m' });
  // Columns create a legible structural load path and are selectable BIM objects.
  [[-5.6,-4.8], [5.6,-4.8], [-5.6,4.8], [5.6,4.8]].forEach(([x,z], i) => box(`Structural column C-${i + 1}`, [.32, 6.45, .32], [x, 3.3, z], materials.concrete, { category: 'Structural column', level: 'all', dimensions: '.32 × .32 × 6.45 m', material: 'Provisional reinforced concrete' }));
  createDimension('12.000 m external width', new THREE.Vector3(-6, .08, -6.25), new THREE.Vector3(6, .08, -6.25), 0xd9ff4a);
  createDimension('10.500 m external depth', new THREE.Vector3(6.35, .08, -5.25), new THREE.Vector3(6.35, .08, 5.25), 0xd9ff4a);
  applyFloorVisibility();
}
function createDimension(label, a, b, color) {
  const points = [a, b]; const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color })); line.name = label; line.userData = { category: 'Dimension', label, dimensions: label }; modelRoot.add(line);
  const tick = (p) => { const t = box(`${label} witness`, [.04, .04, .45], [p.x, p.y, p.z], materials.lime, { category: 'Dimension witness', dimensions: label }); t.userData.dimensionHelper = true; };
  tick(a); tick(b);
}
function createScene() {
  scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b1111); scene.fog = new THREE.Fog(0x0b1111, 18, 42);
  camera = new THREE.PerspectiveCamera(42, 1, .1, 100); camera.position.set(16, 12, 18);
  orthoCamera = new THREE.OrthographicCamera(-10, 10, 7, -7, .1, 100); orthoCamera.position.copy(camera.position);
  try {
    const probe = document.createElement('canvas');
    if (!probe.getContext('webgl2') && !probe.getContext('webgl')) throw new Error('WebGL unavailable');
    renderer = new THREE.WebGLRenderer({ canvas: $('modelCanvas'), antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.localClippingEnabled = true;
    controls = new OrbitControls(camera, renderer.domElement); controls.target.set(0, 3.2, 0); controls.enableDamping = true; controls.dampingFactor = .06; controls.minDistance = 7; controls.maxDistance = 35; controls.maxPolarAngle = Math.PI * .48;
  } catch (error) {
    renderer = null;
    controls = { target: new THREE.Vector3(0, 3.2, 0), update() {}, object: camera };
    const notice = document.createElement('div'); notice.className = 'webgl-unavailable'; notice.innerHTML = '<strong>WebGL is unavailable in this browser session.</strong><span>The production viewer requires a WebGL-capable browser. Controls and engineering records remain available for inspection.</span>'; $('viewportWrap').appendChild(notice);
  }
  scene.add(new THREE.HemisphereLight(0xd9eadf, 0x1a2320, 1.7)); const sun = new THREE.DirectionalLight(0xfff1d0, 3.5); sun.position.set(-10, 18, 12); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -18; sun.shadow.camera.right = 18; sun.shadow.camera.top = 18; sun.shadow.camera.bottom = -18; scene.add(sun);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), new THREE.MeshStandardMaterial({ color: 0x17221e, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -.12; ground.receiveShadow = true; scene.add(ground);
  const grid = new THREE.GridHelper(40, 40, 0x385347, 0x1d2c27); grid.position.y = -.1; grid.material.transparent = true; grid.material.opacity = .42; scene.add(grid);
  raycaster = new THREE.Raycaster(); pointer = new THREE.Vector2(); createResidence(); resize(); animate();
}
function getActiveCamera() { return camera; }
function resize() { const wrap = $('viewportWrap'); const w = wrap.clientWidth; const h = wrap.clientHeight; camera.aspect = w / h; camera.updateProjectionMatrix(); orthoCamera.left = -w / h * 8; orthoCamera.right = w / h * 8; orthoCamera.top = 8; orthoCamera.bottom = -8; orthoCamera.updateProjectionMatrix(); if (renderer) renderer.setSize(w, h, false); }
function animate() { if (!renderer) return; requestAnimationFrame(animate); controls.update(); renderer.render(scene, getActiveCamera()); if (selected) updateMeasureLabel(); }
function updateMeasureLabel() { if (!measureStart || !selected) return; const v = selected.getWorldPosition(new THREE.Vector3()); const p = v.clone().project(getActiveCamera()); const x = (p.x * .5 + .5) * $('viewportWrap').clientWidth; const y = (-p.y * .5 + .5) * $('viewportWrap').clientHeight; $('measureLabel').style.transform = `translate(${x}px,${y}px)`; }
function applyFloorVisibility() { modelRoot.traverse(o => { if (o.userData?.floor === 'ground') o.visible = floors.ground; if (o.userData?.floor === 'upper') o.visible = floors.upper; }); }
function setSelection(obj) { if (selected?.material?.emissive) selected.material.emissive.setHex(selected.userData.originalEmissive || 0x000000); selected = obj; if (!obj) { $('selectionName').textContent = 'Select a component'; $('selectionId').textContent = '—'; $('selectionEmpty').classList.remove('hidden'); $('selectionDetails').classList.add('hidden'); return; } if (obj.material?.emissive) { obj.userData.originalEmissive = obj.material.emissive.getHex(); obj.material.emissive.setHex(0x5a7516); } $('selectionName').textContent = obj.userData.name || obj.name; $('selectionId').textContent = (obj.userData.category || 'COMPONENT').toUpperCase(); $('selectionEmpty').classList.add('hidden'); const details = [['Category', obj.userData.category || 'Geometry'], ['Level', obj.userData.level || '—'], ['Dimensions', obj.userData.dimensions || '—'], ['Material', obj.userData.material || obj.userData.materialName || '—']]; if (obj.userData.area) details.push(['Area', obj.userData.area]); if (obj.userData.pitch) details.push(['Roof pitch', obj.userData.pitch]); $('selectionDetails').innerHTML = details.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join(''); $('selectionDetails').classList.remove('hidden'); }
function onPointer(event) { if (!renderer) return; const rect = renderer.domElement.getBoundingClientRect(); pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1; pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1; raycaster.setFromCamera(pointer, getActiveCamera()); const hits = raycaster.intersectObjects(editable.filter(x => x.visible), false); if (!hits.length) return; const obj = hits[0].object; if (measureMode) { if (!measureStart) { measureStart = obj; $('measureLabel').textContent = 'Pick a second component'; $('measureLabel').classList.remove('hidden'); } else { const a = measureStart.getWorldPosition(new THREE.Vector3()); const b = obj.getWorldPosition(new THREE.Vector3()); const distance = a.distanceTo(b); $('measureLabel').textContent = `MEASURED ${distance.toFixed(3)} m`; $('measureLabel').classList.remove('hidden'); measureStart = null; } } setSelection(obj); }
function setCameraMode() { const old = getActiveCamera(); const next = old === camera ? orthoCamera : camera; next.position.copy(old.position); next.quaternion.copy(old.quaternion); controls.object = next; controls.update(); $('cameraToggle').textContent = next === camera ? 'PERSPECTIVE' : 'ORTHOGRAPHIC'; }
function resetView() { const active = getActiveCamera(); active.position.set(16, 12, 18); controls.target.set(0, 3.2, 0); controls.update(); }
function applyPreset(preset) { currentPreset = preset; modelRoot.traverse(o => { if (!o.isMesh || o.userData.dimensionHelper) return; const c = o.userData.category; if (preset === 'technical') o.material = materials.concrete; else if (preset === 'concrete') o.material = ['Roof', 'Window', 'Door'].includes(c) ? materials.frame : materials.concrete; else { const n = o.userData.materialName; o.material = materials[n] || o.material; } }); }
function setSection(value) { const v = Number(value); $('sectionValue').textContent = v === 0 ? 'OFF' : `${v}%`; modelRoot.traverse(o => { if (o.material && o.material.clippingPlanes !== undefined) { o.material.clippingPlanes = v ? [new THREE.Plane(new THREE.Vector3(1, 0, 0), (v - 50) / 4)] : []; o.material.needsUpdate = true; } }); }
function addSolarOverlay() { modelRoot.traverse(o => { if (o.userData.overlay === 'solar') o.visible = false; }); if (!lastSolar) return; const panels = []; for (let i = 0; i < 12; i++) { const p = box(`Solar module ${i + 1}`, [1.4, .06, 1.0], [-4.2 + (i % 4) * 1.5, 7.8 + Math.abs(-4.2 + (i % 4) * 1.5) * .07, -3.8 + Math.floor(i / 4) * 1.5], materials.solar, { category: 'Solar module', level: 'roof', dimensions: '1.40 × 1.00 m', overlay: 'solar', output: `${(lastSolar.outputs.annual_generation_kwh / 12).toFixed(1)} kWh/module-year screen` }); p.rotation.z = -THREE.MathUtils.degToRad(16); p.userData.overlay = 'solar'; panels.push(p); } $('solarOverlayStatus').textContent = `${lastSolar.outputs.annual_generation_kwh.toLocaleString()} kWh/year screen`; }
function addStructureOverlay() { modelRoot.traverse(o => { if (o.userData.overlay === 'structure') o.visible = false; }); const bars = []; [-5.6, 5.6].forEach((x, i) => { const b = box(`Load-path screening band ${i + 1}`, [.5, 5.8, .5], [x, 3.2, 0], i ? materials.stressMid : materials.stressLow, { category: 'Structural screening overlay', level: 'all', dimensions: '.50 × 5.80 × .50 m', overlay: 'structure', status: 'Conceptual load-path visualization' }); b.userData.overlay = 'structure'; bars.push(b); }); }
function bindUI() {
  $('modelCanvas').addEventListener('pointerdown', onPointer); window.addEventListener('resize', resize);
  $('modeArchitectural').onclick = () => { isTechnical = false; $('modeArchitectural').classList.add('active'); $('modeTechnical').classList.remove('active'); $('workspaceTitle').textContent = 'Architectural model'; applyPreset('render'); };
  $('modeTechnical').onclick = () => { isTechnical = true; $('modeTechnical').classList.add('active'); $('modeArchitectural').classList.remove('active'); $('workspaceTitle').textContent = 'Technical BIM inspection'; applyPreset('technical'); };
  $('cameraToggle').onclick = setCameraMode; $('resetView').onclick = resetView;
  $('floorGround').onclick = () => { floors.ground = !floors.ground; $('floorGround').classList.toggle('active', floors.ground); applyFloorVisibility(); };
  $('floorUpper').onclick = () => { floors.upper = !floors.upper; $('floorUpper').classList.toggle('active', floors.upper); applyFloorVisibility(); };
  $('sectionSlider').oninput = e => setSection(e.target.value); $('measureButton').onclick = () => { measureMode = !measureMode; measureStart = null; $('measureButton').classList.toggle('active', measureMode); $('measureLabel').textContent = measureMode ? 'Pick two components to measure' : ''; $('measureLabel').classList.toggle('hidden', !measureMode); };
  $('explodeButton').onclick = () => { exploded = !exploded; $('explodeButton').classList.toggle('active', exploded); modelRoot.children.forEach(o => { if (o.userData?.floor === 'upper') o.position.y += exploded ? 1.4 : -1.4; }); };
  $('materialPreset').onchange = e => applyPreset(e.target.value);
  document.querySelectorAll('.overlay-option').forEach(btn => btn.onclick = () => { document.querySelectorAll('.overlay-option').forEach(x => x.classList.remove('active')); btn.classList.add('active'); const mode = btn.dataset.overlay; if (mode === 'solar') { addSolarOverlay(); } if (mode === 'structure') addStructureOverlay(); modelRoot.traverse(o => { if (o.userData.overlay) o.visible = o.userData.overlay === mode; }); });
  $('runSolar').onclick = runSolar;
  document.querySelectorAll('.nav').forEach(btn => btn.onclick = () => { document.querySelectorAll('.nav').forEach(x => x.classList.toggle('active', x === btn)); const view = btn.dataset.view; $('workspaceTitle').textContent = view === 'structure' ? 'Structural inspection' : view === 'energy' ? 'Energy engineering model' : view === 'electrical' ? 'Electrical systems layout' : view === 'projects' ? 'Project controls' : 'Architectural model'; });
}
async function runSolar() { $('solverStatus').textContent = 'RUNNING'; const body = { annual_consumption_kwh: +$('consumption').value, pv_kw: +$('pv').value, peak_sun_hours: +$('sunHours').value, battery_kwh: +$('battery').value }; const response = await fetch(API + '/api/energy/solar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); const d = await response.json(); lastSolar = d; $('generation').textContent = d.outputs.annual_generation_kwh.toLocaleString(); $('coverage').textContent = d.outputs.annual_consumption_coverage + '%'; $('gridImport').textContent = d.outputs.grid_import_kwh.toLocaleString(); $('solverStatus').textContent = d.record.status.toUpperCase(); $('solverRecord').textContent = `${d.record.solver} · ${d.record.methodology} · ${d.record.status}. Model overlay is a screening visualization, not a verified PV layout.`; }
initMaterials(); createScene(); bindUI();

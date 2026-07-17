import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { toPng } from 'html-to-image';
import { AtlasScene, DEFAULT_OVERLAYS, type AtlasOverlayOptions } from './components/AtlasScene';
import {
  angularSeparation,
  binaryToKey,
  binaryToLocation,
  formatBigInt,
  getApproximatePrefix,
  getChildKeys,
  getParentKey,
  getSharedPrefixLength,
  isAncestorPrefix,
  keyToBinary,
  radiansToDegrees,
} from './lib/binaryAtlas';
import { bytesToBinary, sha256Bytes, utf8ToBytes } from './lib/crypto';
import { Landmark, landmarkFromLocation, loadLandmarks, saveLandmarks } from './lib/storage';
import './styles.css';

const approx = 'This marker represents an approximate prefix location. Other values may share the same visible sector at the selected precision.';

function Details({ binary, precision }: { binary: string; precision: number }) {
  const loc = binaryToLocation(binary, 4, undefined, precision);
  const parent = getParentKey(loc.key);
  const child = getChildKeys(loc.key);
  return (
    <div className="card">
      <h2>Mathematical details</h2>
      <dl>
        <dt>Binary</dt><dd>{loc.binary}</dd>
        <dt>Level / bit length</dt><dd>{loc.level}</dd>
        <dt>Local index</dt><dd>{formatBigInt(loc.localIndex)}</dd>
        <dt>Global key</dt><dd data-testid="key-output">{formatBigInt(loc.key)}</dd>
        <dt>Node angle</dt><dd>{loc.nodeAngleRadians.toFixed(8)} rad / {radiansToDegrees(loc.nodeAngleRadians).toFixed(4)}°</dd>
        <dt>Sector start</dt><dd>{loc.sectorStartRadians.toFixed(8)} rad</dd>
        <dt>Sector centre</dt><dd>{loc.sectorCentreRadians.toFixed(8)} rad / {radiansToDegrees(loc.sectorCentreRadians).toFixed(4)}°</dd>
        <dt>Angular width</dt><dd>{loc.sectorWidthRadians.toExponential(4)} rad</dd>
        <dt>Parent key</dt><dd>{parent?.toString() ?? 'Root boundary'}</dd>
        <dt>Child keys</dt><dd>{child.map(String).join(' / ')}</dd>
        <dt>Cylindrical coordinate</dt><dd>r={loc.radius}, θ={loc.nodeAngleRadians.toFixed(5)}, visualY={loc.visualY.toFixed(3)}</dd>
        <dt>Precision</dt><dd>{loc.isApproximate ? `Approximate rendered prefix ${loc.renderedPrefix}` : `Exact level ${loc.level}`}</dd>
      </dl>
      {loc.isApproximate && <p className="warning">{approx}</p>}
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState(location.pathname);
  const [binary, setBinary] = useState('101');
  const [key, setKey] = useState('12');
  const [precision, setPrecision] = useState(20);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [text, setText] = useState('Binary Atlas');
  const [fileInfo, setFileInfo] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [compare, setCompare] = useState('101\n1011\n001');
  const [qr, setQr] = useState('');
  const [focusToken, setFocusToken] = useState(0);
  const [overlays, setOverlays] = useState<AtlasOverlayOptions>(DEFAULT_OVERLAYS);
  const cert = useRef<HTMLDivElement>(null);

  useEffect(() => setLandmarks(loadLandmarks()), []);
  useEffect(() => saveLandmarks(landmarks), [landmarks]);

  const selected = useMemo(() => binaryToLocation(binary || '0', 4, undefined, precision), [binary, precision]);

  function nav(nextRoute: string) {
    history.pushState(null, '', nextRoute);
    setRoute(nextRoute);
  }

  function setOverlay<K extends keyof AtlasOverlayOptions>(keyName: K, value: AtlasOverlayOptions[K]) {
    setOverlays((current) => ({ ...current, [keyName]: value }));
  }

  async function hashText() {
    const hash = await sha256Bytes(utf8ToBytes(text));
    setBinary(hash.binary);
    setKey(binaryToKey(hash.binary).toString());
    setFingerprint(hash.hex);
  }

  async function rawText() {
    const bits = bytesToBinary(utf8ToBytes(text));
    setBinary(getApproximatePrefix(bits, precision));
    setFingerprint('');
    setFileInfo(`Raw UTF-8: ${utf8ToBytes(text).length} bytes, ${bits.length} bits. ${approx}`);
  }

  async function onFile(file: File) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const raw = bytesToBinary(bytes);
    const prefix = getApproximatePrefix(raw, precision);
    const hash = await sha256Bytes(bytes);
    setBinary(hash.binary);
    setKey(binaryToKey(hash.binary).toString());
    setFingerprint(hash.hex);
    setFileInfo(`${file.name} (${file.type || 'unknown'}, ${file.size} bytes). Raw prefix ${prefix}. File remains in this browser.`);
  }

  function saveCurrent() {
    setLandmarks([...landmarks, landmarkFromLocation(`Landmark ${landmarks.length + 1}`, 'binary', selected, !selected.isApproximate, 'Saved from explorer')]);
  }

  async function makeQr() {
    const data = { name: 'Binary Atlas certificate', binary: selected.binary, key: selected.key.toString(), level: selected.level, exact: !selected.isApproximate };
    setQr(await QRCode.toDataURL(JSON.stringify(data)));
  }

  async function exportPng() {
    await makeQr();
    setTimeout(async () => {
      if (cert.current) {
        const link = document.createElement('a');
        link.download = 'binary-atlas-certificate.png';
        link.href = await toPng(cert.current);
        link.click();
      }
    }, 100);
  }

  const rows = compare.split(/\s+/).filter(Boolean).filter((value) => /^[01]+$/.test(value));

  return (
    <main>
      <header>
        <b>Binary Atlas</b>
        <span>Give any piece of digital information a permanent, mathematically reproducible location in an infinite visual data space.</span>
        <nav>{['/', '/explore', '/compare', '/landmarks', '/about'].map((r) => <button key={r} onClick={() => nav(r)}>{r === '/' ? 'home' : r.slice(1)}</button>)}</nav>
      </header>
      {route === '/about' ? (
        <section className="about"><h1>About Binary Atlas</h1><p>The procedural cylinder maps finite binary strings to levels, keys, and angular sectors using formulas. The complete cylinder is never generated or stored; the app calculates requested nodes, optional overlays, landmarks, and visible prefixes on demand.</p><p>Key mapping: level n has keys 2^n−1 through 2^(n+1)−2. A key becomes a padded local binary index. Visual rendering uses bounded prefix precision while mathematical keys remain BigInt exact.</p><h2>What Binary Atlas Is Not</h2><ul><li>Not compression.</li><li>Not infinite storage.</li><li>Not proof that files physically exist in a cylinder.</li><li>Not a replacement for cryptographic storage.</li><li>Not a method for reconstructing a file from a short prefix.</li></ul></section>
      ) : (
        <div className="layout"><aside><h1>Atlas Explorer</h1><label>Binary input<input value={binary} onChange={(e) => /^[01]*$/.test(e.target.value) && setBinary(e.target.value || '0')} /></label><button onClick={() => { setKey(binaryToKey(binary).toString()); setFocusToken((token) => token + 1); }}>Move camera to location</button><label>Key input<input value={key} onChange={(e) => setKey(e.target.value)} onBlur={() => { try { setBinary(keyToBinary(BigInt(key))); setFocusToken((token) => token + 1); } catch { /* ignore invalid draft */ } }} /></label><label>Render precision<input type="range" min="1" max="32" value={precision} onChange={(e) => setPrecision(+e.target.value)} />{precision} bits</label><fieldset><legend>Optional overlays</legend><label><input type="checkbox" checked={overlays.showAncestors} onChange={(e) => setOverlay('showAncestors', e.target.checked)} /> Show ancestors</label><label><input type="checkbox" checked={overlays.showChildren} onChange={(e) => setOverlay('showChildren', e.target.checked)} /> Show children</label><label><input type="checkbox" checked={overlays.showSavedLandmarks} onChange={(e) => setOverlay('showSavedLandmarks', e.target.checked)} /> Show saved landmarks</label><label><input type="checkbox" checked={overlays.showSelectedSector} onChange={(e) => setOverlay('showSelectedSector', e.target.checked)} /> Show selected sector</label></fieldset><label>Text mode<textarea value={text} onChange={(e) => setText(e.target.value)} /></label><button onClick={rawText}>Raw UTF-8 prefix</button><button onClick={hashText}>SHA-256 fingerprint</button><label>File / image mode<input data-testid="file-input" type="file" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} /></label><p className="warning">{fileInfo}</p>{fingerprint && <p data-testid="fingerprint-output" className="pill">SHA-256 {fingerprint}</p>}<button data-testid="save-landmark" onClick={saveCurrent}>Save landmark</button><button onClick={exportPng}>Export certificate PNG</button><p className="sr-only" aria-live="polite">Selected coordinate key {selected.key.toString()} level {selected.level}</p></aside><section><AtlasScene selected={selected} landmarks={landmarks} overlays={overlays} focusToken={focusToken} /><div className="drawer"><b>Breadcrumb:</b> Root {Array.from({ length: binary.length }, (_, i) => <button key={i} onClick={() => setBinary(binary.slice(0, i + 1))}>→ {binary.slice(0, i + 1)}</button>)}<h2>Saved landmarks</h2>{landmarks.map((landmark) => <span className="pill" key={landmark.id}>{landmark.name} key {landmark.key}<button onClick={() => setLandmarks(landmarks.filter((item) => item.id !== landmark.id))}>delete</button></span>)}</div></section><aside><Details binary={binary} precision={precision} />{route === '/compare' && <div className="card"><h2>Compare mode</h2><textarea value={compare} onChange={(e) => setCompare(e.target.value)} />{rows.map((a, i) => rows.slice(i + 1).map((b) => <p key={a + b}>{a} vs {b}: shared prefix {getSharedPrefixLength(a, b)}, angular separation {angularSeparation(a, b, precision).toFixed(5)} rad, ancestor: {String(isAncestorPrefix(a, b) || isAncestorPrefix(b, a))}. Coordinate closeness is not semantic similarity.</p>))}</div>}<div className="certificate" ref={cert}><h2>Coordinate certificate</h2><p>{!selected.isApproximate ? 'Exact coordinate' : 'Approximate visible prefix'}</p><p>Key {selected.key.toString()} level {selected.level}</p>{qr && <img alt="QR code" src={qr} />}</div></aside></div>
      )}
    </main>
  );
}

#!/usr/bin/env node
// SAFU WebGIS static integrity checks; intentionally no fabricated geocoding.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const graph=JSON.parse(read('data/wallet-flows.json'));
const snap=JSON.parse(read('data/snapshot.json'));
const geo=JSON.parse(read('data/geo-evidence.geojson'));
const html=read('webgis.html'),js=read('assets/safu-webgis.js'),css=read('assets/safu-webgis.css');
new vm.Script(js,{filename:'safu-webgis.js'});
assert.match(html,/assets\/safu-webgis\.js/);assert.match(html,/assets\/safu-webgis\.css/);
assert.match(html,/id="flowCanvas"/);assert.match(html,/id="geoMap"/);
assert.match(js,/data\/wallet-flows\.json/);assert.match(js,/data\/geo-evidence\.geojson/);
assert.match(css,/#flowPane,#geoPane/);
assert.ok(Array.isArray(snap.chains)&&snap.chains.length===10);
assert.equal(geo.type,'FeatureCollection');assert.ok(Array.isArray(geo.features));
assert.ok(Array.isArray(graph.nodes)&&graph.nodes.length>0);
assert.ok(Array.isArray(graph.edges)&&graph.edges.length>0);
const idSet=new Set(graph.nodes.map(n=>n.id));
assert.equal(idSet.size,graph.nodes.length,'Duplicate node IDs');
const edgeIds=new Set();
for(const e of graph.edges){
 assert.ok(!edgeIds.has(e.id),'Duplicate edge '+e.id);edgeIds.add(e.id);
 assert.ok(idSet.has(e.from)&&idSet.has(e.to),'Broken reference: '+e.id);
 assert.ok(Number.isFinite(e.amount)&&e.amount>0,'Invalid token amount: '+e.id);
 assert.ok(Number.isFinite(Date.parse(e.utc)),'Invalid UTC: '+e.id);
 assert.ok(/^https:\/\//.test(e.tx_url),'Missing immutable explorer URL: '+e.id);
 assert.ok(['source','onward','escrow'].includes(e.kind),'Invalid edge classification: '+e.id);
}
for(const feature of geo.features){
 assert.equal(feature.type,'Feature');
 assert.equal(feature.geometry.type,'Point');
 const [lng,lat]=feature.geometry.coordinates;
 assert.ok(Number.isFinite(lng)&&Math.abs(lng)<=180);
 assert.ok(Number.isFinite(lat)&&Math.abs(lat)<=90);
 const p=feature.properties;
 assert.ok(typeof p.name==='string'&&p.name);
 assert.ok(typeof p.description==='string'&&p.description);
 assert.ok(/^https:\/\//.test(p.source_url));
 assert.ok(Number.isFinite(Date.parse(p.observed_at)));
 assert.ok(['verified','reported'].includes(p.confidence));
}
const sum = (key) => snap.chains.reduce((a,c)=>a+c[key],0);
assert.ok(Math.abs(sum('gross')-snap.accounting.moved)<.01,'Gross sum mismatch');
assert.ok(Math.abs(sum('frozen')-snap.accounting.frozen)<.01,'Frozen sum mismatch');
assert.ok(Math.abs(snap.accounting.moved-snap.accounting.frozen-snap.accounting.unresolved)<.01,'Ledger mismatch');
console.log(JSON.stringify({result:'OK',chainCount:snap.chains.length,nodeCount:graph.nodes.length,flowCount:graph.edges.length,realGeolocations:geo.features.length}));

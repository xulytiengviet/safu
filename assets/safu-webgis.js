// SAFU GeoIntelligence: animated arcs adapted from user-supplied QuantBot HTML.
// Unlike the reference simulation, every animated edge is a documented transaction reference.
// Map pins are strictly verified/reported GeoJSON coordinates; never derived from wallet IDs.
(() => {
"use strict";
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",notation:"compact",maximumFractionDigits:2}).format(n||0);
const pct=n=>new Intl.NumberFormat("vi-VN",{style:"percent",minimumFractionDigits:2,maximumFractionDigits:2}).format(n||0);
const amount=n=>new Intl.NumberFormat("en-US",{maximumFractionDigits:6}).format(n);
const dt=x=>new Date(x).toLocaleString("vi-VN",{timeZone:"UTC",hour12:false,day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"})+" UTC";
const shade={source:"#fb7185",receiver:"#57c6ef",downstream:"#b795ff",escrow:"#2cdeac"};
const edgeColor={source:"#48dfff",onward:"#b795ff",escrow:"#2cdeac"};
const state={snapshot:null,graph:null,nodes:new Map(),edges:[],selected:null,filter:"all",query:"",step:0,playing:false,speed:1,lastStepAt:0,map:null,maplibre:null,geoFeatures:[],mode:"network",positions:new Map(),curves:[],bursts:[],clock:0,raf:0,hoverId:null};
const isReduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
const canvas=$("flowCanvas"),ctx=canvas.getContext("2d");
function link(url,label){const el=document.createElement("a");el.textContent=label;el.href=url;el.target="_blank";el.rel="noopener noreferrer";return el}
function validUrl(url){try{const u=new URL(url);return u.protocol==="https:"}catch{return false}}
function addText(parent,tag,text,cls){const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;parent.append(e);return e}
function validateData(s,g){if(!s||!g||!Array.isArray(s.chains)||!Array.isArray(g.nodes)||!Array.isArray(g.edges))throw Error("Dữ liệu không đúng định dạng");const nodeIds=new Set(g.nodes.map(n=>n.id));for(const e of g.edges){if(!nodeIds.has(e.from)||!nodeIds.has(e.to)||!Number.isFinite(e.amount)||!Number.isFinite(Date.parse(e.utc))||!validUrl(e.tx_url))throw Error("Giao dịch thiếu nguồn hoặc sai schema: "+e.id)}}
async function load(){
 try{
  const [sr,gr]=await Promise.all([fetch("./data/snapshot.json",{cache:"no-store"}),fetch("./data/wallet-flows.json",{cache:"no-store"})]);
  if(!sr.ok||!gr.ok)throw Error("Không truy cập được JSON snapshot/flows");
  const [s,g]=await Promise.all([sr.json(),gr.json()]);validateData(s,g);
  state.snapshot=s;state.graph=g;state.nodes=new Map(g.nodes.map(n=>[n.id,n]));state.edges=[...g.edges].sort((a,b)=>a.utc.localeCompare(b.utc)||a.id.localeCompare(b.id));
  state.step=state.edges.length;$("timeRange").min=0;$("timeRange").max=state.edges.length;$("timeRange").value=state.step;
  $("stamp").textContent="Snapshot: "+dt(s.asOf);
  $("kMoved").textContent=money(s.accounting.moved);$("kFrozen").textContent=money(s.accounting.frozen);$("kOpen").textContent=money(s.accounting.unresolved);
  $("kPct").textContent=pct(s.accounting.frozen/s.accounting.moved);
  $("edgeCount").textContent=g.edges.length+" giao dịch mẫu có nguồn";
  $("chainCount").textContent=s.chains.length+" mạng được tổng hợp";
  $("sourceDisclaimer").textContent="Bản ghi gốc: "+dt(s.asOf)+". Cạnh giao dịch trích từ nguồn công khai; chưa tự tái kiểm định RPC. Không có dữ liệu giao dịch realtime.";$("loading").textContent=g.edges.length+" cung giao dịch có dẫn nguồn · "+s.chains.length+" blockchain · KHÔNG phải luồng live.";
  buildFilters();buildSidebar();setStep(state.step);setSelected(null);draw();
 }catch(err){$("stamp").textContent="LỖI TẢI DỮ LIỆU";$("loading").textContent="Không thể nạp lớp giao dịch: "+err.message;$("loading").classList.add("fail");}
}
function buildFilters(){
 const sel=$("chainSelect");sel.replaceChildren();const opt=document.createElement("option");opt.value="all";opt.textContent="Tất cả 10 blockchain";sel.append(opt);
 for(const c of state.snapshot.chains){const o=document.createElement("option");o.value=c.name;o.textContent=c.name;sel.append(o)}
}
function buildSidebar(){
 const a=$("chainList");a.replaceChildren();const max=state.snapshot.accounting.moved;
 state.snapshot.chains.forEach(chain=>{
  const b=document.createElement("button");b.type="button";b.className="chain-item";b.dataset.chain=chain.name;b.setAttribute("aria-pressed",String(state.filter===chain.name));
  const s=document.createElement("span");s.textContent=chain.name;
  const v=document.createElement("span");v.textContent=money(chain.gross)+" · "+pct(chain.frozen/chain.gross)+" giữ";b.append(s,v);
  b.addEventListener("click",()=>{$("chainSelect").value=chain.name;applyFilter(chain.name)});a.append(b);
 }); $("chainUniverse").textContent=money(max);
}
function applyFilter(ch){
 state.filter=ch;
 document.querySelectorAll(".chain-item").forEach(b=>b.setAttribute("aria-pressed",String(ch===b.dataset.chain)));
 $("filterInfo").textContent=(ch==="all"?"Toàn bộ 10 mạng":ch)+" · "+visibleEdges().length+" cạnh đã qua bộ lọc và thời gian";
 if(state.selected && ch!=="all" && state.selected.chain!==ch)setSelected(null);
 updateChainMetrics(state.selected?.chain||(ch==="all"?null:ch));draw();
}
function searched(edge){
 const q=state.query.trim().toLowerCase();if(!q)return true;
 const from=state.nodes.get(edge.from),to=state.nodes.get(edge.to);
 return [edge.id,edge.asset,edge.chain,edge.tx_url,from?.label,from?.address,to?.label,to?.address].some(x=>(x||"").toLowerCase().includes(q));
}
function visibleEdges(){return state.edges.slice(0,state.step).filter(e=>(state.filter==="all"||state.filter===e.chain)&&searched(e))}
function setStep(value){
 state.step=Math.max(0,Math.min(state.edges.length,Math.round(Number(value)||0)));
 $("timeRange").value=state.step;
 $("timeLabel").textContent=state.step===0?"Chưa phát sự kiện":"Đến "+dt(state.edges[state.step-1].utc);
 $("timeCount").textContent=state.step+"/"+state.edges.length+" giao dịch mẫu (đã dẫn nguồn)";
 $("filterInfo").textContent=(state.filter==="all"?"Toàn bộ 10 mạng":state.filter)+" · "+visibleEdges().length+" cạnh qua bộ lọc";
 drawTimeline();draw();
}
function setSelected(edge){
 state.selected=edge;
 const d=$("details");d.replaceChildren();
 if(!edge){
  addText(d,"strong","Chọn một cạnh hoặc nút ví");
  addText(d,"p","Nhấn vào đường cong, hạt chuyển động hoặc nút ví để xem địa chỉ nguồn, địa chỉ nhận, token, thời điểm UTC, loại giao dịch và explorer.", "hint");
  if(state.snapshot){addText(d,"p","Tổng ledger: "+money(state.snapshot.accounting.moved)+" · bảo đảm "+pct(state.snapshot.accounting.frozen/state.snapshot.accounting.moved),"mini");updateChainMetrics(state.filter==="all"?null:state.filter)}
  return;
 }
 const from=state.nodes.get(edge.from),to=state.nodes.get(edge.to);
 addText(d,"strong",from.label+" → "+to.label);
 addText(d,"span",edge.kind==="escrow"?"ESCROW / KHÔNG PHẢI HOÀN TRẢ":edge.kind==="onward"?"ĐÃ CHUYỂN TIẾP / KHÔNG CỘNG TRÙNG":"CHUYỂN KHOẢN NGUỒN","badge");
 const dl=document.createElement("dl");d.append(dl);
 function kv(k,v){addText(dl,"dt",k);addText(dl,"dd",v)}
 kv("Blockchain",edge.chain);kv("Tài sản",amount(edge.amount)+" "+edge.asset);kv("Thời gian",dt(edge.utc));
 kv("Ví nguồn",from.address||from.label+" (nhãn explorer; chưa có địa chỉ đầy đủ trong lớp mẫu)");
 kv("Ví nhận",to.address||to.label+" (nhãn explorer; chưa có địa chỉ đầy đủ trong lớp mẫu)");
 kv("Mức chứng cứ","Nguồn công khai được dẫn; chưa tái đọc RPC trong công cụ này");
 if(edge.note)kv("Ghi chú đối chiếu",edge.note);
 d.append(link(edge.tx_url,"Xác minh giao dịch ↗"));
 if(validUrl(from.source_url))d.append(link(from.source_url,"Mở ví/nguồn gửi ↗"));
 if(validUrl(to.source_url))d.append(link(to.source_url,"Mở ví nhận ↗"));
 $("detailChain").textContent=edge.chain+" · "+edge.asset;
 updateChainMetrics(edge.chain);draw();
}
function updateChainMetrics(chainName){
 if(!state.snapshot)return;
 const c=chainName?state.snapshot.chains.find(x=>x.name===chainName):null;
 const a=state.snapshot.accounting;
 const moved=c?c.gross:a.moved,fr=c?c.frozen:a.frozen,op=c?c.unresolved:a.unresolved;
 $("detailChain").textContent=c?c.name:"Tổng thể 10 blockchain";
 $("chainGross").textContent=money(moved);$("chainSecured").textContent=money(fr);$("chainOpen").textContent=money(op);
 $("chainPct").textContent=pct(fr/moved);$("chainProgress").style.width=(100*fr/moved)+"%";
 $("chainSource").href=c?c.source:state.snapshot.source;$("chainSource").hidden=false;
}
function layout(){
 const bounds=canvas.getBoundingClientRect(),w=Math.max(bounds.width,1),h=Math.max(bounds.height,1);
 const list=state.snapshot?.chains||[];
 const lanes=state.filter==="all"?list.map(x=>x.name):[state.filter];
 const laneY=new Map(lanes.map((v,i)=>[v,56+(i+.5)*(h-110)/lanes.length]));
 const edgeList=visibleEdges(),ids=new Set(edgeList.flatMap(e=>[e.from,e.to]));
 const byLaneCol=new Map();
 for(const id of ids){const node=state.nodes.get(id);if(!node)continue;const col=node.kind==="source"?0:node.kind==="escrow"||node.kind==="downstream"?2:1;const key=node.chain+"-"+col;if(!byLaneCol.has(key))byLaneCol.set(key,[]);byLaneCol.get(key).push(node)}
 const pos=new Map();for(const [key,nodes] of byLaneCol){nodes.sort((a,b)=>a.id.localeCompare(b.id));const c=nodes[0].chain,col=Number(key.at(-1));const cx=[w*.11,w*.51,w*.84][col],base=laneY.get(c)||h*.5;
 for(let i=0;i<nodes.length;i++){pos.set(nodes[i].id,{x:cx,y:base+(i-(nodes.length-1)/2)*Math.min(27,Math.max(13,(h-70)/(lanes.length*3)))})}}
 const pairs=new Map(),curves=[];
 for(const e of edgeList){const p=pos.get(e.from),q=pos.get(e.to);if(!p||!q)continue;const k=e.from+"|"+e.to;const rank=pairs.get(k)||0;pairs.set(k,rank+1);
 const control={x:(p.x+q.x)/2,y:(p.y+q.y)/2-26+rank*20};
 curves.push({edge:e,start:p,end:q,control})}
 state.positions=pos;state.curves=curves;
 return {w,h,lanes,laneY,curves,pos};
}
function point(curve,t){const u=1-t;return {x:u*u*curve.start.x+2*u*t*curve.control.x+t*t*curve.end.x,y:u*u*curve.start.y+2*u*t*curve.control.y+t*t*curve.end.y}}
function draw(){
 if(!state.snapshot||state.mode!=="network")return;
 const dpr=Math.min(window.devicePixelRatio||1,2),w=Math.max(canvas.clientWidth,1),h=Math.max(canvas.clientHeight,1);
 if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const L=layout();
 ctx.font="10px Inter,Segoe UI,sans-serif";ctx.textAlign="left";ctx.fillStyle="#628ba5";ctx.fillText("NGUỒN / GẮN NHÃN",12,37);ctx.fillText("VÍ NHẬN",w*.51,37);ctx.fillText("NHÁNH / ESCROW",w*.80,37);
 for(const [chain,y] of L.laneY){ctx.strokeStyle="#1a354b";ctx.lineWidth=1;ctx.setLineDash([3,6]);ctx.beginPath();ctx.moveTo(10,y+27);ctx.lineTo(w-10,y+27);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle="#638aa7";ctx.fillText(chain,12,y-24)}
 for(const curve of L.curves){
  const e=curve.edge;const hl=state.selected?.id===e.id;const col=edgeColor[e.kind]||"#48dfff";
  ctx.globalAlpha=hl?1:state.selected?.chain===e.chain?.75:.52;
  ctx.beginPath();ctx.moveTo(curve.start.x,curve.start.y);ctx.quadraticCurveTo(curve.control.x,curve.control.y,curve.end.x,curve.end.y);
  ctx.strokeStyle=col;ctx.lineWidth=hl?3:1.65;ctx.setLineDash(e.kind==="onward"?[5,4]:[]);ctx.stroke();ctx.setLineDash([]);
  // Arrow is a symbolic on-chain relationship, NEVER geographic travel.
  const p=point(curve,.93),p2=point(curve,.90),angle=Math.atan2(p.y-p2.y,p.x-p2.x);
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(angle);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-7,-4);ctx.lineTo(-7,4);ctx.closePath();ctx.fillStyle=col;ctx.fill();ctx.restore();
  if(!isReduced&&state.playing){const t=((state.clock/2600*state.speed+state.edges.findIndex(a=>a.id===e.id)*.17)%1);for(let j=8;j>=0;j--){const t2=t-j*.012;if(t2<0)continue;const z=point(curve,t2);ctx.fillStyle=col;ctx.globalAlpha=(1-j/9)*.7;ctx.beginPath();ctx.arc(z.x,z.y,hl?3.6:2.8,0,Math.PI*2);ctx.fill()}const z=point(curve,t);ctx.fillStyle="#fff";ctx.globalAlpha=1;ctx.beginPath();ctx.arc(z.x,z.y,3.2,0,Math.PI*2);ctx.fill()}
  ctx.globalAlpha=1;
 }
 for(const [id,p] of L.pos){
  const nd=state.nodes.get(id);const c=shade[nd.kind]||"#7bc9ea";
  ctx.shadowColor=c;ctx.shadowBlur=12;ctx.fillStyle=c;ctx.beginPath();ctx.arc(p.x,p.y,6,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  ctx.fillStyle="#e7f3ff";ctx.font="11px Inter,Segoe UI,sans-serif";
  const str=nd.label.length>22?nd.label.slice(0,21)+"…":nd.label;
  const right=p.x+11+ctx.measureText(str).width;
  if(right>w-4){ctx.textAlign="right";ctx.fillText(str,p.x-11,p.y+4)}else{ctx.textAlign="left";ctx.fillText(str,p.x+11,p.y+4)}
 }
 for(let i=state.bursts.length-1;i>=0;i--){
  const b=state.bursts[i];if(b.life<=0){state.bursts.splice(i,1);continue}b.x+=b.vx;b.y+=b.vy;b.life-=.025*state.speed;ctx.globalAlpha=Math.max(0,b.life);ctx.fillStyle=b.color;ctx.beginPath();ctx.arc(b.x,b.y,2*b.life,0,Math.PI*2);ctx.fill();
 }ctx.globalAlpha=1;
}
function burst(edge){
 if(isReduced||state.mode!=="network")return;const c=state.curves.find(x=>x.edge.id===edge.id);if(!c)return;const col=edgeColor[edge.kind]||"#fff";
 for(let i=0;i<16;i++){const a=(Math.PI*2/16)*i;state.bursts.push({x:c.end.x,y:c.end.y,vx:Math.cos(a)*(1+(i%3)),vy:Math.sin(a)*(1+(i%3)),life:1,color:col})}
}
function canvasPick(x,y){
 let best=null,dist=Infinity;for(const curve of state.curves){for(let i=0;i<=40;i++){const p=point(curve,i/40),d=Math.hypot(p.x-x,p.y-y);if(d<dist){dist=d;best=curve.edge}}}
 for(const [id,p] of state.positions){const d=Math.hypot(p.x-x,p.y-y);if(d<dist){dist=d;best=visibleEdges().find(e=>e.from===id||e.to===id)||best}}
 return dist<17?best:null;
}
canvas.addEventListener("click",ev=>{const r=canvas.getBoundingClientRect(),v=canvasPick(ev.clientX-r.left,ev.clientY-r.top);if(v)setSelected(v)});
canvas.addEventListener("mousemove",ev=>{const r=canvas.getBoundingClientRect();canvas.style.cursor=canvasPick(ev.clientX-r.left,ev.clientY-r.top)?"pointer":"default"});
function drawTimeline(){
 const c=$("timeCanvas"),rect=c.getBoundingClientRect(),w=Math.max(rect.width,1),h=Math.max(rect.height,1),dpr=Math.min(devicePixelRatio||1,2);
 c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);const g=c.getContext("2d");g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);
 const v=state.edges,max=Math.max(v.length,1),bw=w/max;
 v.forEach((e,i)=>{g.fillStyle=i<state.step?(edgeColor[e.kind]||"#48dfff"):"#243e55";g.globalAlpha=i<state.step?.76:.3;g.fillRect(i*bw+2,13,Math.max(2,bw-4),30);g.globalAlpha=1;
 if(i===0||i===v.length-1||e.utc.slice(0,10)!==v[i-1].utc.slice(0,10)){g.fillStyle="#b6cbdc";g.font="10px Segoe UI";g.fillText(e.utc.slice(5,10),i*bw+3,57)}});
 g.fillStyle="#e5f8ff";g.fillRect((state.step||0)*bw-1,0,2,45);
}
$("timeCanvas").addEventListener("click",ev=>{const r=ev.currentTarget.getBoundingClientRect();setStep(Math.round((ev.clientX-r.left)/r.width*state.edges.length))});
$("timeRange").addEventListener("input",e=>{state.playing=false;updatePlay();setStep(e.target.value)});
function updatePlay(){$("play").textContent=state.playing?"⏸ Tạm dừng":"▶ Phát lại";$("play").setAttribute("aria-pressed",String(state.playing))}
$("play").addEventListener("click",()=>{if(!state.snapshot)return;if(!state.playing&&state.step===state.edges.length)setStep(0);state.playing=!state.playing;state.lastStepAt=performance.now();updatePlay()});
document.querySelectorAll("[data-speed]").forEach(b=>b.addEventListener("click",()=>{state.speed=Number(b.dataset.speed);document.querySelectorAll("[data-speed]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)))}));
$("chainSelect").addEventListener("change",e=>applyFilter(e.target.value));
$("search").addEventListener("input",e=>{state.query=e.target.value;applyFilter(state.filter)});
$("reset").addEventListener("click",()=>{state.query="";$("search").value="";$("chainSelect").value="all";applyFilter("all");setStep(state.edges.length);setSelected(null)});
function frame(t){
 const dtMs=state.clock?t-state.clock:0;state.clock=t;
 if(state.playing&&state.edges.length){
  const pace=2600/state.speed;
  if(t-state.lastStepAt>=pace){state.lastStepAt=t;const next=state.step+1;setStep(next);const active=state.edges[next-1];if(active)burst(active);
   if(next>=state.edges.length){state.playing=false;updatePlay()}}
 }
 if(state.mode==="network"&&(state.playing||state.bursts.length))draw();
 state.raf=requestAnimationFrame(frame);
}
function switchMode(to){
 state.mode=to;$("networkBtn").setAttribute("aria-selected",String(to==="network"));$("geoBtn").setAttribute("aria-selected",String(to==="geo"));
 $("flowPane").hidden=to!=="network";$("geoPane").hidden=to!=="geo";$("metricNote").textContent=to==="geo"?"Chỉ hiện điểm địa lý có tọa độ độc lập + nguồn + thời gian + độ tin cậy.":"Đường cong là các giao dịch blockchain có dẫn nguồn, không phải tuyến địa lý.";
 if(to==="geo"){ensureMap()}else{draw()}
}
$("networkBtn").addEventListener("click",()=>switchMode("network"));
$("geoBtn").addEventListener("click",()=>switchMode("geo"));
async function ensureMap(){
 if(state.map){setTimeout(()=>state.map.resize(),70);return}
 try{
  const ml=await import("https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl.mjs");state.maplibre=ml;
  const map=new ml.Map({container:"geoMap",style:"https://demotiles.maplibre.org/globe.json",center:[0,18],zoom:1.25,minZoom:1});state.map=map;
  map.addControl(new ml.NavigationControl(),"top-right");
  const response=await fetch("./data/geo-evidence.geojson",{cache:"no-store"});if(!response.ok)throw Error("HTTP "+response.status);
  const source=await response.json();if(source.type!=="FeatureCollection"||!Array.isArray(source.features))throw Error("Schema GeoJSON sai");
  const entries=source.features.filter(f=>{
   if(f?.geometry?.type!=="Point"||!Array.isArray(f.geometry.coordinates)||f.geometry.coordinates.length<2)return false;
   const [lng,lat]=f.geometry.coordinates;const p=f.properties||{};
   return Number.isFinite(lng)&&Number.isFinite(lat)&&Math.abs(lng)<=180&&Math.abs(lat)<=90&&validUrl(p.source_url)&&Number.isFinite(Date.parse(p.observed_at))&&["verified","reported"].includes(p.confidence)&&typeof p.name==="string"&&typeof p.description==="string";
  });
  state.geoFeatures=entries;$("geoCount").textContent=entries.length+" điểm có metadata chứng cứ (đã loại "+(source.features.length-entries.length)+" điểm thiếu hợp lệ).";
  const add=()=>{
   if(map.getSource("geoEvidence"))return;
   map.addSource("geoEvidence",{type:"geojson",data:{type:"FeatureCollection",features:entries}});
   map.addLayer({id:"geo-points",type:"circle",source:"geoEvidence",paint:{"circle-color":["match",["get","confidence"],"verified","#2cdeac","#ffc978"],"circle-radius":8,"circle-stroke-color":"#082033","circle-stroke-width":2}});
   map.on("click","geo-points",ev=>{
    const f=ev.features?.[0];if(!f)return;const p=f.properties||{};const panel=document.createElement("div");
    addText(panel,"strong",p.name);addText(panel,"p",p.description);
    addText(panel,"p","Nguồn: "+p.confidence+" · "+dt(p.observed_at));
    if(p.location_type)addText(panel,"p","Loại địa điểm: "+p.location_type);
    panel.append(link(p.source_url,"Kiểm chứng địa điểm ↗"));
    new ml.Popup().setLngLat(ev.lngLat).setDOMContent(panel).addTo(map)
   });
   map.on("mouseenter","geo-points",()=>map.getCanvas().style.cursor="pointer");map.on("mouseleave","geo-points",()=>map.getCanvas().style.cursor="");
  };
  if(map.isStyleLoaded())add();else map.once("load",add);
  if(entries.length){const bounds=new ml.LngLatBounds();entries.forEach(f=>bounds.extend(f.geometry.coordinates));map.fitBounds(bounds,{padding:70,maxZoom:6})}
 }catch(e){$("geoCount").textContent="Không mở được bản đồ / GeoJSON: "+e.message}
}
window.addEventListener("resize",()=>{draw();drawTimeline();state.map?.resize()});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&state.playing){state.playing=false;updatePlay()}});
requestAnimationFrame(frame);load();
})();

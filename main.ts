import {readFileSync,writeFileSync,mkdirSync,cpSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildDossier} from './vendor/makefun-board.ts';
import {validateSnapshot,validateBoard} from './validate.ts';
const root=fileURLToPath(new URL('.',import.meta.url));
function option(name:string,fallback:string){const i=process.argv.indexOf('--'+name);return i<0?fallback:process.argv[i+1];}
const snapshot=JSON.parse(readFileSync(option('input','/input/snapshot.json'),'utf8'));
validateSnapshot(snapshot);
const out=resolve(option('output',process.env.MAKEFUN_OUTPUT_DIR||'/output'));
const watch=new Set(snapshot.watchlist);
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const asOf=Date.parse(snapshot.as_of+'T00:00:00Z');
const peers=new Map<string,number[]>();
for(const p of snapshot.protocols){if(p.mcap_usd>0&&p.tvl_usd>0){const c=p.category||'Other';const xs=peers.get(c)||[];xs.push(p.mcap_usd/p.tvl_usd);peers.set(c,xs);}}
function median(xs:number[]){const s=xs.slice().sort((a,b)=>a-b);const i=Math.floor(s.length/2);return s.length%2?s[i]:(s[i-1]+s[i])/2;}
function score(p:any){
 const known=p.listed_at?Math.max(0,Math.floor((asOf-Date.parse(p.listed_at+'T00:00:00Z'))/86400000)):null;
 const age=known??365;
 const ratios=peers.get(p.category||'Other')||[];
 const observed=ratios.length>=3?clamp(median(ratios),0.08,1.5):0.3;
 const multiple=0.3*0.6+observed*0.4;
 const growth=clamp(p.change_7d??0,-60,100);
 const growthFactor=1+growth/250;
 const maturity=0.65+0.35*Math.min(age,1095)/1095;
 const confidence=known===null||p.change_7d===null?'Limited':'Standard';
 const value=Math.max(1,Math.round(p.tvl_usd*multiple*growthFactor*maturity));
 return {age_days:known,implied_value_usd:value,low_usd:Math.max(1,Math.round(value*0.45)),high_usd:Math.round(value*1.8),model:{multiple,growth_pct:growth,growth_factor:growthFactor,maturity,peer_count:ratios.length,confidence}};
}
function plan(p:any){
 const chain=p.chains?.[0]||'a supported chain';const category=(p.category||'').toLowerCase();
 const verify=`Verify ${p.name}'s official app and documentation independently on ${chain}; check contracts, eligibility and supported assets. The snapshot contains no verified app URL or incentive rules. Budget: $0; time: 10–20 minutes.`;
 let action:string;
 if(/lending|cdp/.test(category))action=`If ${p.name} publicly permits it, supply $20–$50 of an asset you already hold on ${chain}; avoid borrowing or leverage. Capital is at risk; gas varies by chain. Allow 10 minutes and review withdrawals before signing.`;
 else if(/dex|liquidity/.test(category))action=`If the verified ${p.name} interface supports it, test one small spot swap using $5–$20 of existing funds on ${chain}. Account for gas, slippage and swap fees; allow 10 minutes. Do not add leveraged liquidity for speculative rewards.`;
 else if(/bridge/.test(category))action=`Use ${p.name} only for a transfer you already need, after confirming both networks and bridge limits. Start with $5–$20; bridge and gas fees vary. Allow 15–60 minutes; skip if fees exceed your budget.`;
 else if(/yield|staking|allocator|curator|farming/.test(category))action=`Review ${p.name}'s strategy, lockup and withdrawal conditions before any deposit. If independently verified, test $20–$50 of existing capital on ${chain}; allow 15 minutes, with gas and potential principal loss. Skip leveraged strategies.`;
 else action=`Check whether ${p.name} offers a documented public testnet, governance forum or product walkthrough. Prefer a no-deposit activity first ($0 principal; 15–30 minutes). Do not invent eligibility or send funds to unverified campaigns.`;
 return [verify,action,`Record the transaction hash or public contribution and your actual fees for ${p.name}. Revisit the official documentation weekly for 10 minutes; do not automate wash activity, make extra accounts or assume an airdrop.`,`Keep a separate low-value wallet and a written loss limit. Revoke unnecessary approvals and test withdrawal when supported. Allow 5–15 minutes plus network fees; stop if rules, liquidity or contract provenance are unclear.`];
}
const eligible=snapshot.protocols.filter((p:any)=>watch.has(p.slug)||(!p.gecko_id&&!p.symbol&&!p.mcap_usd));
const rows=eligible.map((p:any)=>({...p,...score(p),watchlist:watch.has(p.slug),token_status:(p.gecko_id||p.symbol||p.mcap_usd)?'Recorded token':'No token recorded',farm_steps:plan(p)})).sort((a:any,b:any)=>b.implied_value_usd-a.implied_value_usd||a.slug.localeCompare(b.slug,'en')).map((r:any,i:number)=>({...r,rank:i+1}));
if(rows.length<100||rows.length>4000)throw new Error('Board size outside required limits');
if([...watch].some(s=>!rows.some((r:any)=>r.slug===s)))throw new Error('Missing watchlist protocol');
const live=snapshot.protocols.filter((p:any)=>p.gecko_id||p.symbol||p.mcap_usd).sort((a:any,b:any)=>(b.mcap_usd||0)-(a.mcap_usd||0)).slice(0,40).map((p:any)=>({...p,token_status:'Recorded token'}));
validateBoard(rows,snapshot);
mkdirSync(out,{recursive:true});
writeFileSync(join(out,'board.json'),JSON.stringify({rows})+'\n');
const data={as_of:snapshot.as_of,source:snapshot.source,watchlist_size:watch.size,rows,live,method:'TVL × category peer multiple × capped growth × maturity. Peer multiple = 60% × 0.30 + 40% × median category market cap / TVL, clamped to 0.08–1.50; fewer than 3 peers uses 0.30. Growth factor = 1 + clamp(7d change, −60, 100)/250. Maturity = 0.65 + 0.35 × min(age days,1095)/1095. Missing age uses 365 days; missing growth uses zero. Range = 0.45–1.80 × central value; illustrative scenarios, not statistical confidence intervals.'};
if(existsSync(join(root,'dashboard')))cpSync(join(root,'dashboard'),join(out,'dashboard'),{recursive:true});
mkdirSync(join(out,'dashboard'),{recursive:true});
writeFileSync(join(out,'data.js'),'window.RADAR='+JSON.stringify(data).replace(/</g,'\\u003c')+';\n');
if(existsSync(join(root,'screenshots'))){cpSync(join(root,'screenshots'),join(out,'screenshots'),{recursive:true});writeFileSync(join(out,'dossier.json'),buildDossier(out,{text_max_bytes:65536,screenshots:{max:4,max_bytes:524288},dashboard:{max_files:400,max_bytes:4194304}}));}
console.log(JSON.stringify({rows:rows.length,watchlist:watch.size,live:live.length,out}));

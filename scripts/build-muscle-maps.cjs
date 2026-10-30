/* Developer-only deterministic tinting. Runtime consumes generated WebP + metadata.
   Install sharp or provide SHARP_MODULE_PATH to regenerate; normal app build does not need it. */
const fs=require('node:fs'),path=require('node:path');
const sharp=require(process.env.SHARP_MODULE_PATH||'sharp');
const root=path.resolve(__dirname,'..'),spec=JSON.parse(fs.readFileSync(path.join(root,'content/muscle-map-spec.json')));
function region(name,attributes){const s=spec.shapes[name];if(!s)throw Error('Unknown muscle region '+name);const mirror=s.front?spec.frontCenter:spec.backCenter;const p=`<path d="${s.d}" ${attributes}/>`;return (s.mirrorOnly?'':p)+(s.pair?`<g transform="translate(${mirror*2} 0) scale(-1 1)">${p}</g>`:'');}
function svg(body){return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${spec.width}" height="${spec.height}" viewBox="0 0 ${spec.width} ${spec.height}">${body}</svg>`);}
function fillLayer(map){let body='';for(const role of ['stable','assist','primary','emphasis'])for(const name of map[role]||[]){const deep=spec.shapes[name].deep,opacity=deep?.52:({stable:.42,assist:.68,primary:.90,emphasis:.94}[role]);body+=region(name,`fill="${spec.colors[role]}" fill-opacity="${opacity}"`);}return svg(body);}
function lineLayer(map){let body='';for(const role of ['stable','assist','primary'])for(const name of map[role]||[])if(spec.shapes[name].deep)body+=region(name,`fill="none" stroke="${spec.colors[role]}" stroke-width="1.8" stroke-dasharray="3 3" stroke-linejoin="round"`);for(const name of map.risk)body+=region(name,`fill="none" stroke="${spec.colors.risk}" stroke-width="2.3" stroke-dasharray="7 5" stroke-linecap="round" stroke-linejoin="round"`);return svg(body);}
(async()=>{const metadata={};const base=await sharp(path.join(root,spec.base)).ensureAlpha().raw().toBuffer();for(const map of [...spec.maps,...(spec.personalMaps||[])]){const src=`assets/muscle-maps/${map.id}-v1.webp`;
 const paint=await sharp(fillLayer(map)).blur(1.25).ensureAlpha().raw().toBuffer();const colored=Buffer.from(base);for(let p=0;p<base.length;p+=4){const a=paint[p+3]/255;if(!a)continue;const luminance=(base[p]*.2126+base[p+1]*.7152+base[p+2]*.0722)/220;for(let c=0;c<3;c++)colored[p+c]=Math.round(base[p+c]*(1-a)+Math.min(255,paint[p+c]*luminance)*a);}await sharp(colored,{raw:{width:spec.width,height:spec.height,channels:4}}).composite([{input:lineLayer(map),blend:'over'}]).webp({quality:93}).toFile(path.join(root,src));
 const legend=[{role:'primary',label:'主要：'+map.labels.primary}];
 if(map.assist.length)legend.push({role:'assist',label:'辅助：'+map.labels.assist});
 if(map.stable.length)legend.push({role:'stable',label:'稳定：'+map.labels.stable});
 if(map.risk.length)legend.push({role:'risk',label:map.labels.risk});
 const note=['左为正面，右为背面。深浅区分重点，不代表实测刺激强度。',map.risk.length?'红色虚线仅提醒失控时的借力风险，正常参与不等于代偿。':'',map.note].filter(Boolean).join(' ');
 for(const id of map.exerciseIds)metadata[id]={src,alt:map.labels.primary+'为主要目标；'+(map.assist.length?map.labels.assist+'辅助；':'')+(map.stable.length?map.labels.stable+'。':''),legend,note,participation:map.labels.stable,warning:map.labels.risk};
 }
 fs.writeFileSync(path.join(root,'app/muscle-maps.js'),`/* Generated from content/muscle-map-spec.json. */\n(()=>{'use strict';window.BulkMuscleMaps=${JSON.stringify(metadata)};})();\n`);
 fs.writeFileSync(path.join(root,'outputs/muscle-maps/coverage.json'),JSON.stringify({generated:'2026-10-30',method:'single AI neutral base + shared traced vector masks + deterministic tinting',expertReviewed:false,maps:spec.maps.map(m=>({id:m.id,exerciseIds:m.exerciseIds,src:metadata[m.exerciseIds[0]].src})),coverage:spec.maps.flatMap(m=>m.exerciseIds).length,personalCoverage:(spec.personalMaps||[]).flatMap(m=>m.exerciseIds).length},null,2));
 console.log(spec.maps.length+' maps; '+Object.keys(metadata).length+' exercise entries');
})();

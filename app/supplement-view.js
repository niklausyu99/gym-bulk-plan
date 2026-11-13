(()=>{'use strict';const S=window.BulkSupplements,n=x=>Number(x||0).toLocaleString('zh-CN',{maximumFractionDigits:1});
function summary(p){const t=S.totals(p);return `已服用 ${t.items} / ${S.data.products.length} 项${t.items>t.complete?' · 部分已记录':''}`;}
function render(c){const {esc,btn,date,plan:p,today}=c,t=S.totals(p);return `<section class="panel supplement-panel"><header class="supplement-head"><div><p class="eyebrow">DAILY ROUTINE</p><h2>每日补充剂</h2><p class="small" role="status" aria-live="polite">${date===today?'今天':esc(date)} · ${summary(p)}</p></div><label class="field supplement-date">记录日期<input type="date" data-supplement-date value="${esc(date)}" max="${today}" aria-label="补充剂记录日期"></label></header><div class="supplement-progress" role="progressbar" aria-label="已完成每日份量的补充剂项目" aria-valuemin="0" aria-valuemax="5" aria-valuenow="${t.complete}">${S.data.products.map(q=>`<i class="${p.supplements?.[q.id]?.count===q.target?'done':p.supplements?.[q.id]?'partial':''}"></i>`).join('')}</div><p class="small">按实际服用记录。再次点击可取消，不会沿用昨天的勾选。</p><div class="supplement-routine">${S.data.products.map(q=>{const r=p.supplements?.[q.id],count=r?.count||0,snap=r?.snapshot;return `<article class="supplement-card ${count===q.target?'is-taken':''}" data-supplement-card="${q.id}"><div class="supplement-card-head"><div><span class="supplement-timing">${esc(q.timing)}</span><h3>${esc(q.short)}</h3><p class="supplement-brand">${esc(snap?.name||q.name)}</p></div><span class="supplement-dose">${q.target}<small>${q.unit} / 天</small></span></div><p class="supplement-nutrients">${esc(q.summary)}</p><div class="supplement-action">${q.target===1?btn(count?'✓ 已服用':'标记已服用','supplement-count',date+'|'+q.id+'|'+(count?0:1),count?'taken':'secondary',`data-focus-key="supplement-${date}-${q.id}" role="checkbox" aria-checked="${!!count}" aria-label="${esc(q.short)}已服用"`):`<div class="supplement-quantities" role="group" aria-label="鱼油实际服用量">${[0,1,2].map(v=>btn(v===0?'未服用':v+' 粒', 'supplement-count',date+'|'+q.id+'|'+v,count===v?'taken':'secondary',`aria-pressed="${count===v}"`)).join('')}</div>`}<span class="supplement-record-status">${count===q.target?'已完成今日份量':count?`已服用 ${count} / ${q.target} ${q.unit}`:'尚未记录'}</span></div><details class="supplement-detail" data-keep-open="supplement-${date}-${q.id}"><summary>服用提示与成分</summary><p>${esc(q.hint)}</p><p class="small">${esc(q.note)}</p><p class="small">${esc(snap?.labelVersion||q.version)}。不同批次以瓶身标签为准。</p><a href="${esc(snap?.source.url||q.source.url)}" target="_blank" rel="noopener">${esc(snap?.source.label||q.source.label)}</a></details></article>`;}).join('')}</div></section>${window.BulkMicronutrientView.render(c)}<section class="panel section supplement-guide"><h2>怎么安排更省心</h2><p>随餐、固定习惯即可，不必追求精确到几点。</p>${S.data.guidance.map(g=>`<details class="supplement-detail"><summary>${esc(g.title)}</summary><p>${esc(g.text)}</p></details>`).join('')}<details class="supplement-detail"><summary>参考资料</summary><ul>${S.data.references.map(r=>`<li><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.label)}</a></li>`).join('')}</ul></details><p class="small">时间安排不代表每项都需要长期补充；钙是否需要额外补充，还要结合日常饮食。</p></section>`;}
function reminder({esc,btn,date,plan}){
  const pending=S.data.products.filter(product=>(plan.supplements?.[product.id]?.count||0)<product.target);
  if(!pending.length)return '';
  const items=pending.map(product=>{
    const count=plan.supplements?.[product.id]?.count||0;
    const amounts=Array.from({length:product.target-count},(_,i)=>count+i+1);
    const actions=amounts.map(amount=>{
      const label=product.target===1?'标记已服用':`已服用 ${amount} ${product.unit}`;
      return btn(label,'supplement-count',`${date}|${product.id}|${amount}`,'secondary',
        `aria-label="${esc(product.short)}${esc(label)}"`);
    }).join('');
    return `<li class="supplement-reminder-item" data-reminder-product="${product.id}"><div><strong>${esc(product.short)}</strong>
      <small>${count?`已记 ${count} / ${product.target} ${esc(product.unit)} · `:''}${esc(product.timing)}</small></div>
      <div class="supplement-reminder-actions">${actions}</div></li>`;
  }).join('');
  return `<details class="supplement-reminder" data-supplement-reminder data-keep-open="supplement-reminder-${date}">
    <summary data-focus-key="supplement-reminder-${date}"><strong>今日补充剂</strong>
      <span>还有 ${pending.length} 项待记录</span></summary>
    <ul>${items}</ul>
    ${btn('查看全部补充剂','supplement-open',date,'text')}
  </details>`;
}
async function handle(c,a,param){
  if(a!=='supplement-count')return;
  const [date,id,raw]=param.split('|'),count=Number(raw);
  if(!c.validDate(date)||date>c.today)return;
  const fromReminder=document.activeElement?.closest('[data-supplement-reminder]');
  const p=c.getPlan(date);
  try{
    S.record(p,id,count);
    const ok=await c.save();
    c.refresh();
    if(fromReminder&&document.activeElement===document.body){
      const next=document.querySelector(`[data-supplement-reminder][open] [data-reminder-product="${id}"] button`)||
        document.querySelector('[data-supplement-reminder][open] .supplement-reminder-item button')||
        document.querySelector('[data-supplement-reminder] summary, .home-actions a');
      next?.focus({preventScroll:true});
    }
    document.querySelector(`[data-supplement-card="${id}"] [role="checkbox"], [data-supplement-card="${id}"] [aria-pressed="true"]`)?.focus({preventScroll:true});
    if(ok)c.toast(count?'已记录，可在补充剂中调整。':'已取消这项记录。');
    else c.toast('暂未保存成功，请先查看记录与备份中的保存提示。');
  }catch(e){c.toast(e.message);}
}
window.BulkSupplementView={render,reminder,handle,summary};
})();

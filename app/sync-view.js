window.BulkSyncView={
  render(sync,esc,btn){
    if(!sync)return '';
    const c=sync.config();
    return `<section class="panel section sync-panel">
      <div class="panel-head"><h2>私有云端记录</h2><span class="chip" data-sync-connection>${c.connected?'已连接':'未连接'}</span></div>
      <p data-sync-status role="status" aria-live="polite">${esc(c.status)}</p>
      <p class="small" data-sync-time>${c.last?'上次备份：'+esc(new Date(c.last).toLocaleString('zh-CN')):'联网后，本机记录会自动备份到私有仓库。'}</p>
      <details class="section" data-keep-open="sync-connection" ${c.configured?'':'open'}>
        <summary>连接设置</summary>
        <p class="small section">创建访问令牌时，Repository access 选 Only select repositories，仅选择你的私有记录仓库，并授予 Contents 读写权限。</p>
        <div class="form-grid section">
          <label class="field">GitHub 账户<input id="sync-owner" value="${esc(c.owner)}" autocapitalize="none" spellcheck="false" autocomplete="off"></label>
          <label class="field">私有仓库<input id="sync-repo" value="${esc(c.repo)}" autocapitalize="none" spellcheck="false" autocomplete="off"></label>
          <label class="field" style="grid-column:1/-1">访问令牌<input id="sync-token" type="password" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="仅限此私有仓库的令牌"></label>
        </div>
        <label class="inline small section"><input id="sync-remember" type="checkbox" ${c.remember||!c.configured?'checked':''}>在这台私人设备上保持连接</label>
        <p class="small">保持连接会在此浏览器保存令牌。令牌只发送给 GitHub。断开连接会移除本机保存的令牌。</p>
        <div class="inline section">${btn('连接私有仓库','sync-connect')}<a class="btn text" href="https://github.com/settings/personal-access-tokens/new?name=BulkPlan&expires_in=90&contents=write" target="_blank" rel="noopener noreferrer">创建访问令牌</a></div>
        ${c.configured?`<div class="section">${btn('断开连接','sync-disconnect','','text')}</div>`:''}
      </details>
    </section>`;
  },
  update(sync){
    if(!sync)return;
    const c=sync.config();
    const labels={synced:'已备份',error:'备份需处理',disconnected:'未连接备份',pending:'等待自动备份',idle:'自动备份已连接'};
    const label=labels[c.phase]||labels.pending;
    document.querySelectorAll('[data-sync-indicator]').forEach(el=>{
      el.textContent=label;
      el.classList.toggle('is-synced',['synced','idle'].includes(c.phase));
      el.classList.toggle('is-pending',['pending','disconnected'].includes(c.phase));
      el.classList.toggle('is-error',c.phase==='error');
      el.setAttribute('aria-label',label+(c.last?'，上次 '+new Date(c.last).toLocaleString('zh-CN'):''));
    });
    document.querySelectorAll('[data-sync-status]').forEach(el=>el.textContent=c.status);
    document.querySelectorAll('[data-sync-connection]').forEach(el=>el.textContent=c.connected?'已连接':'未连接');
    document.querySelectorAll('[data-sync-time]').forEach(el=>{
      el.textContent=c.last?'上次备份：'+new Date(c.last).toLocaleString('zh-CN'):'联网后，本机记录会自动备份到私有仓库。';
    });
  }
};

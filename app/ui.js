(()=>{'use strict';
let errorId=0;
function captureFocus(scope){
 const el=document.activeElement;
 if(!scope?.contains?.(el)||!el.matches('button,a,input,select,textarea,summary'))return null;
 if(!el.id&&!Object.keys(el.dataset).length)return null;
 return {element:el,tag:el.tagName,id:el.id,key:el.dataset.focusKey,data:{...el.dataset},start:el.selectionStart,end:el.selectionEnd};
}
function restoreFocus(saved,scope){
 if(!saved||saved.element.isConnected)return;
 const el=[...scope.querySelectorAll(saved.tag)].find(e=>saved.key?e.dataset.focusKey===saved.key:saved.id?e.id===saved.id:Object.entries(saved.data).every(([k,v])=>e.dataset[k]===v));
 if(!el||el.disabled)return;
 el.focus({preventScroll:true});
 if(saved.start!=null)try{el.setSelectionRange(saved.start,saved.end);}catch{}
}
function error(field,message){
 if(!field)return;
 if(!field.id)field.id='bulk-field-'+(++errorId);
 const id=field.id+'-error';let text=document.getElementById(id);
 if(!text&&message){text=document.createElement('span');text.id=id;text.className='field-error';text.setAttribute('role','status');(field.closest('.field,.food-portion')||field.parentElement).append(text);}
 if(text)text.textContent=message;
 const ids=new Set((field.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean));
 if(message)ids.add(id);else ids.delete(id);
 if(ids.size)field.setAttribute('aria-describedby',[...ids].join(' '));else field.removeAttribute('aria-describedby');
 field.setAttribute('aria-invalid',String(!!message));
}
function clearErrors(scope){for(const field of scope.querySelectorAll('[aria-invalid="true"]'))error(field,'');}
document.addEventListener('input',e=>{const field=e.target;if(field.getAttribute?.('aria-invalid')==='true'&&field.validity?.valid)error(field,'');});
window.BulkUI={captureFocus,restoreFocus,error,clearErrors};
})();

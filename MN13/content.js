(function(){
'use strict';
function el(tag,cls,value){const node=document.createElement(tag);if(cls)node.className=cls;if(value!==undefined)node.textContent=value;return node}
function safeImage(src){try{const u=new URL(src,location.href);return u.protocol==='https:'||(u.origin===location.origin&&u.protocol==='http:')}catch{return false}}
function image(src,alt,cls){if(!safeImage(src))return null;const im=el('img',cls);im.src=src;im.alt=alt;im.loading='lazy';im.draggable=false;im.addEventListener('error',()=>im.remove(),{once:true});return im}
function order(items){return [...items].filter(x=>x.visible===true).sort((a,b)=>a.sortOrder-b.sortOrder)}
function render(data){if(data.version!==1||!Array.isArray(data.courses)||!Array.isArray(data.journals))throw Error('資料格式不符');
 const grid=document.querySelector('#courses .services-grid'),filters=document.querySelector('#courses .filters');grid.replaceChildren();filters.replaceChildren();Object.keys(courses).forEach(k=>delete courses[k]);
 const visible=order(data.courses),categories=['all',...new Set(visible.map(c=>c.category))];
 categories.forEach((category,i)=>{const b=el('button','filter'+(i===0?' active':''),category==='all'?'全部課程':category);b.type='button';b.dataset.filter=category;b.setAttribute('aria-pressed',String(i===0));b.onclick=()=>filterCourses(b);filters.append(b)});
 visible.forEach(c=>{courses[c.id]={tag:c.category,title:c.title,hint:c.summary,desc:c.description,imgs:(c.images||[]).filter(safeImage)};const b=el('button','service-card');b.type='button';b.dataset.category=c.category;b.onclick=()=>openCourse(c.id);const cover=image(c.images?.[0],c.title,'course-cover');if(cover)b.append(cover);b.append(el('span','service-category',c.category),el('span','service-name',c.title),el('span','service-hint',c.summary),el('span','service-link','了解課程 ↗'));grid.append(b)});
 if(!visible.length)grid.append(el('p','','課程資料更新中，歡迎聯繫我們。'));
 const diary=document.querySelector('#diary .diary-grid');if(!diary)return;diary.replaceChildren();
 order(data.journals).filter(j=>j.consent===true).forEach(j=>{const card=el('article','case-card'),head=el('div','case-card-header'),tags=el('div','case-tag-group');for(const tag of j.tags||[])tags.append(el('span','case-chip type',tag));if(j.duration)tags.append(el('span','case-chip duration',j.duration));head.append(tags);const compare=el('div','case-compare');['before','after'].forEach((side,i)=>{if(i)compare.append(el('div','case-arrow-center','→'));const box=el('div','case-side'),holder=el('div','case-img-box'),im=image(j[side+'Image'],j.title+' '+(i?'護理後':'護理前'));if(im)holder.append(im);box.append(el('div','case-date',(i?'紀錄後 ':'紀錄前 ')+j[side+'Date']),holder,el('div','case-label',j[side+'Label']));compare.append(box)});card.append(head,compare,el('div','case-desc',j.description));diary.append(card)});
 if(!diary.children.length)diary.append(el('p','','肌膚日誌整理中。'));
}
fetch('content.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('讀取失敗');return r.json()}).then(render).catch(()=>{/* Existing HTML remains available on a network failure. */});
})();

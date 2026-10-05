(function(){
'use strict';
function el(tag,cls,value){const node=document.createElement(tag);if(cls)node.className=cls;if(value!==undefined)node.textContent=value;return node}
function safeImage(src){try{const u=new URL(src,location.href);return u.protocol==='https:'||(u.origin===location.origin&&u.protocol==='http:')}catch{return false}}
function image(src,alt,cls){if(!safeImage(src))return null;const im=el('img',cls);im.src=src;im.alt=alt;im.loading='lazy';im.draggable=false;im.addEventListener('error',()=>im.remove(),{once:true});return im}
function order(items){return [...items].filter(x=>x.visible===true).sort((a,b)=>a.sortOrder-b.sortOrder)}
let pageVisibility={courses:false,diary:false};
const originalShowPage=showPage;
showPage=function(id,...args){if((id==='courses'||id==='diary')&&pageVisibility[id]===false)id='about';return originalShowPage(id,...args)};
function applyPageVisibility(settings){pageVisibility={courses:true,diary:true,...settings};for(const key of ['courses','diary']){const hidden=pageVisibility[key]===false;document.querySelectorAll('a[href="#'+key+'"],a[data-page="'+key+'"],#'+key).forEach(n=>n.hidden=hidden);if(key==='courses')document.querySelectorAll('#about .services-section').forEach(n=>n.hidden=hidden)}if(pageVisibility[location.hash.slice(1)]===false)showPage('about',false)}
function render(data){if(data.version!==1||!Array.isArray(data.courses)||!Array.isArray(data.journals))throw Error('資料格式不符');
 applyPageVisibility(data.pageVisibility);
 const faqSection=document.querySelector('#courses .course-faq'),faqList=document.querySelector('#courses .course-faq-list');
 if(faqList){faqList.replaceChildren();for(const faq of order(Array.isArray(data.faqs)?data.faqs:[])){if(typeof faq.title!=='string'||typeof faq.answer!=='string'||!faq.answer.trim())continue;const detail=el('details'),question=el('summary',null,faq.title),answer=el('p');answer.style.whiteSpace='pre-line';const lines=faq.answer.split(/\n+/);for(const [i,line] of lines.entries()){if(i)answer.append(document.createElement('br'));const sentences=line.match(/[^。！？]+[。！？]?/g)||[];if(line.length>=70&&sentences.length>1){for(const sentence of sentences)answer.append(el('span','reading-sentence',sentence))}else answer.append(document.createTextNode(line))}detail.append(question,answer);faqList.append(detail)}faqSection.hidden=!faqList.children.length;}

 const grid=document.querySelector('#courses .services-grid'),filters=document.querySelector('#courses .filters');grid.replaceChildren();filters.replaceChildren();Object.keys(courses).forEach(k=>delete courses[k]);
 const visible=order(data.courses),typeTabs=el('div','course-type-tabs');typeTabs.setAttribute('aria-label','課程類型');filters.before(typeTabs);
 function courseType(c){return c.serviceType==='body'||(!c.serviceType&&/^美體/.test(c.category||''))?'body':'beauty'}
 let selectedType='beauty';
 function renderGroup(type){selectedType=type;grid.replaceChildren();filters.replaceChildren();typeTabs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.serviceType===type)));const group=visible.filter(c=>courseType(c)===type),categories=type==='body'?[]:['all',...new Set(group.map(c=>c.category))];
 categories.forEach((category,i)=>{const b=el('button','filter'+(i===0?' active':''),category==='all'?'全部'+(type==='beauty'?'美容':'美體'):category);b.type='button';b.dataset.filter=category;b.setAttribute('aria-pressed',String(i===0));b.onclick=()=>filterCourses(b);filters.append(b)});filters.hidden=type==='body'||!group.length;
 group.forEach(c=>{const b=el('button','service-card');b.type='button';b.dataset.category=c.category;b.onclick=()=>openCourse(c.id);const cover=image(c.images?.[0],c.title,'course-cover');if(cover)b.append(cover);else b.append(el('span','course-cover course-cover-empty','MN13'));b.append(el('span','service-category',c.category),el('span','service-name',c.title),el('span','service-hint',c.summary),el('span','service-link','了解課程 ↗'));grid.append(b)});
 if(!group.length)grid.append(el('p','course-empty',(type==='beauty'?'美容':'美體')+'課程整理中，歡迎聯繫我們。'));}
 visible.forEach(c=>{courses[c.id]={tag:c.category,title:c.title,hint:c.summary,desc:c.description,feeling:c.feeling,imgs:(c.images||[]).filter(safeImage)}});
 for(const [type,label] of [['beauty','美容'],['body','美體']]){const b=el('button','course-type-button',label);b.type='button';b.dataset.serviceType=type;b.onclick=()=>renderGroup(type);typeTabs.append(b)}renderGroup(selectedType);
 const originalSetCategory=setCategory;setCategory=function(category){if(selectedType!=='beauty')renderGroup('beauty');return originalSetCategory(category)};
 const diary=document.querySelector('#diary .diary-grid');if(!diary)return;diary.replaceChildren();
 order(data.journals).filter(j=>j.consent===true).forEach(j=>{const card=el('article','case-card'),head=el('div','case-card-header'),tags=el('div','case-tag-group');for(const tag of j.tags||[])tags.append(el('span','case-chip type',tag));if(j.duration)tags.append(el('span','case-chip duration',j.duration));head.append(tags);const compare=el('div','case-compare');['before','after'].forEach((side,i)=>{if(i)compare.append(el('div','case-arrow-center','→'));const box=el('div','case-side'),holder=el('div','case-img-box'),im=image(j[side+'Image'],j.title+' '+(i?'護理後':'護理前'));if(im)holder.append(im);box.append(el('div','case-date',(i?'紀錄後 ':'紀錄前 ')+j[side+'Date']),holder,el('div','case-label',j[side+'Label']));compare.append(box)});card.append(head,compare,el('div','case-desc',j.description));diary.append(card)});
 if(!diary.children.length)diary.append(el('p','','肌膚日誌整理中。'));
}
const config=window.MN13_BACKEND;
for(const selector of ['#courses .services-grid','#diary .diary-grid']){const box=document.querySelector(selector);if(box)box.replaceChildren(el('p','','資料載入中…'))}
const faqSection=document.querySelector('#courses .course-faq');if(faqSection)faqSection.hidden=true;
if(!config)return;
fetch(config.url+'/rest/v1/mn13_public_content?id=eq.main&select=document',{cache:'no-store',headers:{apikey:config.key}}).then(r=>{if(!r.ok)throw Error('讀取失敗');return r.json()}).then(rows=>{if(!rows[0]?.document)throw Error('資料尚未建立');render(rows[0].document)}).catch(()=>{applyPageVisibility({courses:false,diary:false});for(const selector of ['#courses .services-grid','#diary .diary-grid']){const box=document.querySelector(selector);if(box)box.replaceChildren(el('p','','資料暫時無法載入，請稍後重新整理。'))}});
})();



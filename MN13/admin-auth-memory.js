'use strict';
function createMN13AuthMemory({key,local=localStorage,session=sessionStorage,now=()=>Date.now()}){
 const lifetime=30*24*60*60*1000;
 let remember=true,expiresAt=0;
 function remove(store,name){try{store.removeItem(name)}catch{}}
 function clear(){for(const store of [local,session]){try{for(let i=store.length-1;i>=0;i--){const name=store.key(i);if(name===key||name.startsWith(key+'-'))remove(store,name)}}catch{}}expiresAt=0}
 function read(store,name){try{const raw=store.getItem(name);if(!raw)return null;const record=JSON.parse(raw);if(record.version!==1||typeof record.payload!=='string'||!Number.isFinite(record.expiresAt)||record.expiresAt<=now()){remove(store,name);return null}return record}catch{remove(store,name);return null}}
 return {
  begin(value){clear();remember=value===true;expiresAt=now()+lifetime},
  clear,
  get expiresAt(){return expiresAt},
  isExpired(){return expiresAt>0&&now()>=expiresAt},
  storage:{
   getItem(name){for(const [store,persistent] of [[local,true],[session,false]]){const record=read(store,name);if(record){remember=persistent;expiresAt=record.expiresAt;return record.payload}}return null},
   setItem(name,payload){if(!expiresAt)expiresAt=now()+lifetime;if(now()>=expiresAt){remove(local,name);remove(session,name);return}const target=remember?local:session,other=remember?session:local;target.setItem(name,JSON.stringify({version:1,expiresAt,payload}));remove(other,name)},
   removeItem(name){remove(local,name);remove(session,name)}
  }
 };
}

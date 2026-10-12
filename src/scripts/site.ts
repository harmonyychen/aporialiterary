import { ATTEMPTS_KEY, REVISION_KEY, fingerprint, readAttempts, reusableAttempt, canClearPurchasedCart } from './checkout-state';
type Product={id:string;title:string;cover:string;priceMinor:number|null;currency:string|null;format:string};
type Item={id:string;quantity:number};
const catalog:Product[]=JSON.parse(document.querySelector('#catalog')!.textContent!);
const key='aporia-cart-v1';
let cart:Item[]=[];
function sanitize(input:unknown):Item[]{if(!Array.isArray(input))return [];const seen=new Set<string>();return input.filter((v):v is Item=>v&&catalog.some(p=>p.id===v.id)&&Number.isInteger(v.quantity)&&v.quantity>0&&v.quantity<=20&&!seen.has(v.id)&&!!seen.add(v.id)).map(({id,quantity})=>({id,quantity}));}
try{cart=sanitize(JSON.parse(localStorage.getItem(key)||'[]'));}catch{}
let previousFocus:HTMLElement|null=null;
let activeDialog:HTMLDialogElement|null=null;
let closeTimer:ReturnType<typeof setTimeout>|undefined;
const backdrop=document.querySelector<HTMLElement>('[data-backdrop]')!;
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
function closeDrawer(){
 const dialog=activeDialog;if(!dialog)return;
 clearTimeout(closeTimer);
 dialog.classList.remove('is-open');backdrop.classList.remove('is-open');
 document.querySelectorAll(`[data-open="${dialog.id}"]`).forEach(b=>b.setAttribute('aria-expanded','false'));
 const finish=()=>{dialog.close();activeDialog=null;previousFocus?.focus({preventScroll:true});};
 if(reducedMotion.matches)finish();else closeTimer=setTimeout(finish,320);
}
function open(id:string){
 clearTimeout(closeTimer);
 if(activeDialog){activeDialog.classList.remove('is-open');activeDialog.close();document.querySelectorAll(`[data-open="${activeDialog.id}"]`).forEach(b=>b.setAttribute('aria-expanded','false'));}
 const dialog=document.getElementById(id) as HTMLDialogElement;
 previousFocus=document.activeElement as HTMLElement;activeDialog=dialog;
 // Non-modal dialog keeps the document scrollable behind the sidebar.
 dialog.show();
 void dialog.offsetWidth;
 dialog.classList.add('is-open');backdrop.classList.add('is-open');
 document.querySelectorAll(`[data-open="${id}"]`).forEach(b=>b.setAttribute('aria-expanded','true'));
 (dialog.querySelector('[data-close]') as HTMLElement)?.focus({preventScroll:true});
}
document.querySelectorAll<HTMLButtonElement>('[data-open]').forEach(b=>b.addEventListener('click',()=>open(b.dataset.open!)));
backdrop.addEventListener('click',closeDrawer);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&activeDialog){e.preventDefault();closeDrawer();}});
document.querySelectorAll<HTMLDialogElement>('dialog').forEach(dialog=>{
 dialog.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',closeDrawer));
 dialog.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const elements=[...dialog.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input:not(:disabled)')].filter(el=>el.getClientRects().length);const first=elements[0],last=elements.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}});
});
const updateHeader=()=>document.body.classList.toggle('has-scrolled',window.scrollY>20);
window.addEventListener('scroll',updateHeader,{passive:true});updateHeader();
function save(){try{localStorage.setItem(key,JSON.stringify(cart));localStorage.setItem(REVISION_KEY,crypto.randomUUID());}catch{document.querySelector('#cart-announcement')!.textContent='Browser storage is unavailable. Your cart will not persist.';}}
const money=(amount:number,currency:string)=>new Intl.NumberFormat('en-CA',{style:'currency',currency}).format(amount/100)+' '+currency;
function render(){
 const holder=document.querySelector('#cart-items')!;holder.replaceChildren();
 for(const item of cart){const product=catalog.find(p=>p.id===item.id)!;const row=document.createElement('article');row.className='cart-item';const img=document.createElement('img');img.src=product.cover;img.alt=product.title+' cover';img.width=104;img.height=150;const detail=document.createElement('div');const title=document.createElement('h3');title.textContent=product.title;const format=document.createElement('p');format.className='small';format.textContent=product.format;const price=document.createElement('p');price.className='small';price.textContent=product.priceMinor!==null&&product.currency?money(product.priceMinor,product.currency):'Price to confirm';const label=document.createElement('label');label.className='small';label.textContent='Quantity ';const qty=document.createElement('input');qty.type='number';qty.min='1';qty.max='20';qty.step='1';qty.value=String(item.quantity);qty.setAttribute('aria-label',`Quantity for ${product.title}`);qty.addEventListener('change',()=>{const n=Number(qty.value);if(!Number.isInteger(n)||n<1||n>20){qty.value=String(item.quantity);return;}item.quantity=n;save();updateSummary();});label.append(qty);const remove=document.createElement('button');remove.className='text-button small';remove.textContent='Remove';remove.setAttribute('aria-label',`Remove ${product.title}`);remove.addEventListener('click',()=>{cart=cart.filter(i=>i.id!==item.id);save();render();(document.querySelector('#cart [data-close]') as HTMLElement).focus();});detail.append(title,format,price,label,remove);row.append(img,detail);holder.append(row);}
 updateSummary();
}
function updateSummary(){const count=cart.reduce((n,i)=>n+i.quantity,0);document.querySelectorAll<HTMLElement>('[data-cart-count]').forEach(el=>{el.textContent=String(count);el.hidden=!count;});(document.querySelector('#cart-empty') as HTMLElement).hidden=!!count;(document.querySelector('#cart-summary') as HTMLElement).hidden=!count;const products=cart.map(i=>catalog.find(p=>p.id===i.id)!);const currency=products[0]?.currency;const known=products.every(p=>p.priceMinor!==null&&p.currency===currency)&&currency;document.querySelector('#cart-subtotal')!.textContent=known?'Subtotal  '+money(cart.reduce((sum,i)=>sum+catalog.find(p=>p.id===i.id)!.priceMinor!*i.quantity,0),currency!):'Subtotal — price to confirm';}
document.querySelectorAll<HTMLButtonElement>('[data-add]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.add!;if(!catalog.some(p=>p.id===id))return;const input=document.querySelector<HTMLInputElement>(`[data-quantity="${id}"]`);const quantity=Number(input?.value||1);if(!Number.isInteger(quantity)||quantity<1||quantity>20){input?.reportValidity();return;}const current=cart.find(i=>i.id===id);if(current)current.quantity=Math.min(20,current.quantity+quantity);else cart.push({id,quantity});save();render();open('cart');}));
window.addEventListener('storage',e=>{if(e.key===key){try{cart=sanitize(JSON.parse(e.newValue||'[]'));}catch{cart=[];}render();}});
const checkout=document.querySelector<HTMLButtonElement>('#checkout')!;
checkout.addEventListener('click',async()=>{
 const status=document.querySelector('#checkout-message')!;
 checkout.disabled=true;checkout.textContent='Opening checkout…';status.textContent='';
 try {
  // Re-read shared storage so retries/reloads use the same attempt and cart.
  cart=sanitize(JSON.parse(localStorage.getItem(key)||'[]'));render();
  if(!cart.length)throw new Error('Add a publication to your cart first.');
  const revision=localStorage.getItem(REVISION_KEY)||'';
  const attempts=readAttempts(localStorage.getItem(ATTEMPTS_KEY));
  const now=Math.floor(Date.now()/1000);
  let attempt=reusableAttempt(attempts,cart,revision,now);
  if(!attempt){attempt={id:crypto.randomUUID(),startedAt:now,fingerprint:fingerprint(cart),revision};attempts.push(attempt);}
  // Persist before contacting Stripe. If storage fails, do not start payment.
  localStorage.setItem(ATTEMPTS_KEY,JSON.stringify(attempts.slice(-20)));
  const response=await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:cart,attemptId:attempt.id,startedAt:attempt.startedAt})});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||'Checkout is unavailable. Please try again later.');
  const url=new URL(data.url);
  if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com'||url.username||url.password)throw new Error('The checkout link could not be verified.');
  const latest=readAttempts(localStorage.getItem(ATTEMPTS_KEY));
  const saved=latest.find(a=>a.id===attempt.id);
  if(saved){saved.sessionId=data.sessionId;localStorage.setItem(ATTEMPTS_KEY,JSON.stringify(latest));}
  window.location.assign(url.href);
 }catch(e){status.textContent=e instanceof Error?e.message:'Checkout is unavailable. Please try again later.';}
 finally{checkout.disabled=false;checkout.textContent='Checkout';}
});
render();

const paymentMessage=document.querySelector<HTMLElement>('#payment-status');
const paymentRetry=document.querySelector<HTMLButtonElement>('#payment-retry');
async function confirmPayment(){
 if(!paymentMessage||!paymentRetry)return;
 paymentRetry.hidden=true;paymentMessage.textContent='Checking your payment…';
 try{
  const sessionId=new URLSearchParams(window.location.search).get('session_id');
  if(!sessionId)throw new Error('No checkout reference was provided. Please check your Stripe receipt or contact Aporia.');
  const attempts=readAttempts(localStorage.getItem(ATTEMPTS_KEY));
  const attempt=attempts.find(a=>a.sessionId===sessionId);
  if(!attempt)throw new Error('Open this confirmation in the browser where you checked out, or contact Aporia. Your cart has been kept.');
  const response=await fetch('/api/checkout/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId,attemptId:attempt.id})});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||'We could not verify your payment yet.');
  if(data.status==='paid'){
   paymentMessage.textContent=data.testMode?'Test payment confirmed. This is a sandbox order; no book will be mailed.':'Payment confirmed. Thank you! Aporia will review your order and mail it to the Canadian address you provided.';
   const current=sanitize(JSON.parse(localStorage.getItem(key)||'[]'));
   const revision=localStorage.getItem(REVISION_KEY)||'';
   if(canClearPurchasedCart(attempt,current,revision)){cart=[];save();render();}
   const latest=readAttempts(localStorage.getItem(ATTEMPTS_KEY));
   const saved=latest.find(a=>a.id===attempt.id);
   if(saved){saved.completed=true;localStorage.setItem(ATTEMPTS_KEY,JSON.stringify(latest));}
  }else if(data.status==='expired'){
   paymentMessage.textContent='This checkout expired without a confirmed payment. Your cart has been kept.';
  }else{
   paymentMessage.textContent='Payment is not confirmed yet. Your cart has been kept. Check again before starting another payment.';
   paymentRetry.hidden=false;
  }
 }catch(e){paymentMessage.textContent=e instanceof Error?e.message:'We could not verify your payment. Your cart has been kept.';paymentRetry.hidden=false;}
}
paymentRetry?.addEventListener('click',confirmPayment);
if(paymentMessage)void confirmPayment();

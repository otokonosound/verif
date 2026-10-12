import {test,expect} from '@playwright/test';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
const base=process.env.GITHUB_ACTIONS?'/verif/':'/';
test('first service worker activation preserves input',async({page})=>{
  await page.goto(base);
  await page.locator('textarea').first().fill('Texte conservé pendant l’installation');
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));});
  await expect(page.locator('textarea').first()).toHaveValue('Texte conservé pendant l’installation');
});
test('browser analysis preserves STOP with unavailable AI and no unsolicited network',async({page})=>{
  const errors:string[]=[];const external:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1'))external.push(r.url())});
  await page.goto(base);
  await page.locator('textarea').first().fill('Ameli urgent payez 3 € pour votre remboursement https://ameli-remboursement.com');
  await page.getByRole('button',{name:/^VÉRIFIER$/}).click();
  await expect(page.locator('.stateLabel')).toContainText('STOP');
  await expect(page.getByRole('button',{name:'REFAIRE',exact:true})).toBeEnabled();
  await expect(page.getByText('COPIER LE DOSSIER')).toBeVisible();
  expect(errors).toEqual([]);expect(external).toEqual([]);
});
test('DNS/RDAP failure leaves the deterministic result usable',async({page})=>{
  await page.route('https://dns.google/**',r=>r.abort());await page.route('https://rdap.org/**',r=>r.abort());
  await page.goto(base);await page.getByRole('checkbox').first().check();
  await page.locator('textarea').first().fill('https://ameli.fr');
  await page.getByRole('button',{name:/^VÉRIFIER$/}).click();
  await expect(page.getByRole('button',{name:'REFAIRE',exact:true})).toBeEnabled({timeout:15000});
  await expect(page.locator('.intelligencePanel')).toContainText('aucune donnée externe exploitable');
});
test('text import keeps existing file analysis',async({page})=>{
  await page.goto(base);
  await page.locator('input[type=file]').first().setInputFiles({name:'message.txt',mimeType:'text/plain',buffer:Buffer.from('Achète des coupons Transcash et envoie-moi les codes.')});
  await expect(page.locator('.stateLabel')).toContainText(/PRUDENCE|STOP/);
});
test('spreadsheet import keeps extracted content',async({page})=>{
  const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([['Achète des coupons Transcash et envoie-moi les codes.']]),'Message');
  await page.goto(base);
  await page.locator('input[type=file]').first().setInputFiles({name:'message.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:XLSX.write(book,{type:'buffer',bookType:'xlsx'})});
  await expect(page.locator('.stateLabel')).toContainText(/PRUDENCE|STOP/);
});
test('archive with an executable is blocked without executing it',async({page})=>{
  const zip=new JSZip();zip.file('document.exe','not executable test bytes');zip.file('readme.txt','Bonjour');
  await page.goto(base);
  await page.locator('input[type=file]').first().setInputFiles({name:'document.zip',mimeType:'application/zip',buffer:await zip.generateAsync({type:'nodebuffer'})});
  await expect(page.locator('.stateLabel')).toContainText('STOP');
  await expect(page.getByRole('heading',{name:'Archive contenant un exécutable'})).toBeVisible();
});
test('content handed over in the URL fragment is analysed and removed from the address bar',async({page})=>{
  const text='Votre colis est bloqué. Payez 2,99 € immédiatement https://fake.example/colis';
  await page.goto(base+'#text='+encodeURIComponent(text));
  await expect(page.locator('.stateLabel')).toContainText('STOP');
  await expect(page.locator('.inputAgain textarea')).toHaveValue(text);
  expect(new URL(page.url()).hash).toBe('');
  expect(new URL(page.url()).search).toBe('');
});
test('legacy query-string handover still works',async({page})=>{
  await page.goto(base+'?url='+encodeURIComponent('https://www.service-public.fr/'));
  await expect(page.locator('.stateLabel')).toContainText('OK');
});
test('history replays the full message, not its truncated label',async({page})=>{
  const text='Bonjour, ceci est un long message parfaitement anodin qui dépasse largement les quatre-vingts caractères affichés. Votre colis est bloqué. Payez 2,99 € immédiatement https://fake.example/colis';
  await page.goto(base);
  await page.locator('textarea').first().fill(text);
  await page.getByRole('button',{name:/^VÉRIFIER$/}).click();
  await expect(page.locator('.stateLabel')).toContainText('STOP');
  await expect(page.getByRole('button',{name:'REFAIRE',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Nouvelle vérification'}).click();
  await page.locator('.history button').last().click();
  await expect(page.locator('.stateLabel')).toContainText('STOP');
  await expect(page.locator('.inputAgain textarea')).toHaveValue(text);
});
test('the same file can be imported twice in a row',async({page})=>{
  const file={name:'message.txt',mimeType:'text/plain',buffer:Buffer.from('Achète des coupons Transcash et envoie-moi les codes.')};
  await page.goto(base);
  await page.locator('input[type=file]').first().setInputFiles(file);
  await expect(page.locator('.stateLabel')).toContainText(/PRUDENCE|STOP/);
  await page.getByRole('button',{name:'Nouvelle vérification'}).click();
  await expect(page.locator('.stateLabel')).toHaveCount(0);
  await page.locator('input[type=file]').first().setInputFiles(file);
  await expect(page.locator('.stateLabel')).toContainText(/PRUDENCE|STOP/);
});
test('status messages stay visible on the result page',async({page})=>{
  await page.goto(base);
  await page.locator('input[type=file]').first().setInputFiles({name:'message.txt',mimeType:'text/plain',buffer:Buffer.from('Bonjour, rendez-vous confirmé demain à 18h.')});
  await expect(page.locator('.stateLabel')).toContainText('OK');
  await expect(page.locator('.result .notice')).toContainText('message.txt');
});
test('scripts and Android packages are reported instead of failing',async({page})=>{
  await page.goto(base);
  await page.locator('input[type=file]').first().setInputFiles({name:'facture.apk',mimeType:'application/vnd.android.package-archive',buffer:Buffer.from('PK')});
  await expect(page.locator('.stateLabel')).toContainText('PRUDENCE');
  await expect(page.getByRole('heading',{name:'Application Android hors magasin'})).toBeVisible();
});
test('an unsupported file explains what to do',async({page})=>{
  await page.goto(base);
  await page.locator('input[type=file]').first().setInputFiles({name:'donnees.bin',mimeType:'application/octet-stream',buffer:Buffer.from([0,1,2,3])});
  await expect(page.getByRole('heading',{name:'Fichier non analysable automatiquement'})).toBeVisible();
  await expect(page.locator('.result .notice')).toContainText('pas pris en charge');
});
test('a legitimate e-mail with a dotted sender address is not flagged',async({page})=>{
  await page.goto(base);
  await page.locator('textarea').first().fill('From: Ameli <service.client@ameli.fr>\nBonjour, votre attestation est disponible dans votre compte ameli.');
  await page.getByRole('button',{name:/^VÉRIFIER$/}).click();
  await expect(page.locator('.stateLabel')).toContainText('OK');
  await expect(page.getByText('Liens détectés')).toHaveCount(0);
});
test('help and privacy pages are reachable on a phone',async({page})=>{
  await page.setViewportSize({width:390,height:800});
  await page.goto(base);
  await page.locator('footer').getByRole('button',{name:'Confidentialité'}).click();
  await expect(page.getByRole('heading',{name:'Tes données restent sous ton contrôle.'})).toBeVisible();
  await page.getByRole('button',{name:'Retour',exact:true}).click();
  await expect(page.locator('textarea').first()).toBeVisible();
});
test('the app shell opens offline after the first visit',async({page,context})=>{
  await page.goto(base);
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));});
  await page.reload();
  await expect(page.locator('textarea').first()).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await page.locator('textarea').first().fill('Votre colis est bloqué. Payez 2,99 € immédiatement https://fake.example/colis');
  await page.getByRole('button',{name:/^VÉRIFIER$/}).click();
  await expect(page.locator('.stateLabel')).toContainText('STOP');
  await context.setOffline(false);
});
test('an example shows plain advice first, reporting links and folded technical details',async({page})=>{
  await page.setViewportSize({width:390,height:800});
  await page.goto(base);
  await page.getByRole('button',{name:'Faux proche'}).click();
  await expect(page.locator('.stateLabel')).toContainText('STOP');
  await expect(page.getByRole('heading',{level:2})).toBeFocused();
  await expect(page.getByRole('heading',{name:'Que faire maintenant ?'})).toBeVisible();
  await expect(page.getByRole('heading',{name:/Faux proche/})).toBeVisible();
  await expect(page.getByRole('link',{name:/33700/})).toBeVisible();
  await expect(page.getByRole('link',{name:/0 805 805 817/})).toHaveAttribute('href','tel:+33805805817');
  await expect(page.getByText('Score de risque')).toBeHidden();
  await page.getByText('Détails techniques').click();
  await expect(page.getByText('Score de risque')).toBeVisible();
});
test('a legitimate one-time code SMS is not flagged',async({page})=>{
  await page.goto(base);
  await page.locator('textarea').first().fill('Votre code de connexion Ameli est 548211. Il est valable 10 minutes. Ne le communiquez à personne.');
  await page.getByRole('button',{name:/^VÉRIFIER$/}).click();
  await expect(page.locator('.stateLabel')).toContainText('OK');
});
test('help page lists common scams and useful numbers',async({page})=>{
  await page.goto(base);
  await page.locator('footer').getByRole('button',{name:'Comment ça marche'}).click();
  await expect(page.getByRole('heading',{name:'Les arnaques les plus fréquentes'})).toBeVisible();
  await expect(page.getByRole('link',{name:'0 892 705 705'})).toHaveAttribute('href','tel:+33892705705');
});
test('text in a screenshot is read on the device, without any third-party server',async({page})=>{
  test.setTimeout(90000);
  const external:string[]=[];
  page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1'))external.push(r.url())});
  await page.goto(base);
  const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=900;c.height=260;const x=c.getContext('2d')!;x.fillStyle='#fff';x.fillRect(0,0,900,260);x.fillStyle='#000';x.font='34px sans-serif';
    x.fillText('Votre colis est bloque. Payez 2,99 EUR',30,100);x.fillText('immediatement sur https://colis-frais.com',30,170);return c.toDataURL('image/png').split(',')[1]});
  await page.locator('input[type=file]').first().setInputFiles({name:'capture.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  await expect(page.locator('.inputAgain textarea')).toHaveValue(/colis-frais\.com/,{timeout:60000});
  await expect(page.locator('.stateLabel')).toContainText(/PRUDENCE|STOP/);
  expect(external).toEqual([]);
});

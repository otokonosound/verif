import {test,expect} from '@playwright/test';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
const base=process.env.GITHUB_ACTIONS?'/verif/':'/';
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
  await page.locator('input[type=file]').setInputFiles({name:'message.txt',mimeType:'text/plain',buffer:Buffer.from('Achète des coupons Transcash et envoie-moi les codes.')});
  await expect(page.locator('.stateLabel')).toContainText(/PRUDENCE|STOP/);
});
test('spreadsheet import keeps extracted content',async({page})=>{
  const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([['Achète des coupons Transcash et envoie-moi les codes.']]),'Message');
  await page.goto(base);
  await page.locator('input[type=file]').setInputFiles({name:'message.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:XLSX.write(book,{type:'buffer',bookType:'xlsx'})});
  await expect(page.locator('.stateLabel')).toContainText(/PRUDENCE|STOP/);
});
test('archive with an executable is blocked without executing it',async({page})=>{
  const zip=new JSZip();zip.file('document.exe','not executable test bytes');zip.file('readme.txt','Bonjour');
  await page.goto(base);
  await page.locator('input[type=file]').setInputFiles({name:'document.zip',mimeType:'application/zip',buffer:await zip.generateAsync({type:'nodebuffer'})});
  await expect(page.locator('.stateLabel')).toContainText('STOP');
  await expect(page.getByRole('heading',{name:'Archive contenant un exécutable'})).toBeVisible();
});

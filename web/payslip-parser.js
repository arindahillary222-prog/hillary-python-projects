/* Conservative extraction: current-period labels only; every import is reviewed. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.PayslipParser=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const clean=s=>String(s||'').normalize('NFKC').replace(/\u00a0/g,' ').replace(/[–−]/g,'-');
  function amount(raw){
    let text=clean(raw).replace(/[^\d.,'’ -]/g,'').trim().replace(/[ '’]/g,'');
    const negative=text.startsWith('-')||text.endsWith('-');text=text.replace(/-/g,'');
    if(text.includes(',')&&text.includes('.')){const decimal=text.lastIndexOf(',')>text.lastIndexOf('.')?',':'.';text=text.replace(decimal==='.'?/,/g:/\./g,'').replace(',','.');}
    else if(text.includes(','))text=/,\d{1,2}$/.test(text)?text.replace(/,(?=.*[,])/g,'').replace(',','.'):text.replace(/,/g,'');
    else if(text.includes('.')&&/\.\d{3}$/.test(text))text=text.replace(/\./g,'');
    const n=Number(text);return text&&Number.isFinite(n)?n*(negative?-1:1):undefined;
  }
  const months=['january|januar','february|februar','march|märz|maerz','april','may|mai','june|juni','july|juli','august','september','october|oktober','november','december|dezember'];
  function payrollMonth(text){
    let match=text.match(/\b(20\d{2})[-/.](0?[1-9]|1[0-2])\b/);if(match)return `${match[1]}-${match[2].padStart(2,'0')}`;
    match=text.match(/\b(0?[1-9]|1[0-2])[-/.](20\d{2})\b/);if(match)return `${match[2]}-${match[1].padStart(2,'0')}`;
    for(let i=0;i<months.length;i++){match=text.match(new RegExp('(?:'+months[i]+')\\s*[,./-]?\\s*(20\\d{2})','i'));if(match)return `${match[1]}-${String(i+1).padStart(2,'0')}`;}
    return undefined;
  }
  function paymentDate(text){
    let m=text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);let result;
    if(m)result=`${m[1]}-${m[2]}-${m[3]}`;
    else {m=text.match(/\b(\d{1,2})[./](\d{1,2})[./](20\d{2})\b/);if(m)result=`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;}
    return result&&Number.isFinite(Date.parse(result))&&new Date(result).toISOString().slice(0,10)===result?result:undefined;
  }
  function parse(text,jobs=[]){
    const lines=clean(text).split(/\r?\n/).map(s=>s.trim()).filter(Boolean),fields={},evidence={},warnings=[];
    const cumulative=/\b(ytd|year.to.date|annual|jahres(?:summe|werte|brutto|netto)|vorjahr|kumuliert)\b/i;
    function findNumber(key,patterns){
      for(const pattern of patterns){
        const candidates=[];
        for(let index=0;index<lines.length;index++){
          const line=lines[index];if(cumulative.test(line))continue;
          const match=pattern.exec(line);if(!match)continue;
          let tail=line.slice(match.index+match[0].length).replace(/^\s*\(.*?\)/,'');
          if(!tail.match(/\d/)&&lines[index+1]&&/^[\s€$£A-Z:\d.,'’+-]+$/.test(lines[index+1]))tail=lines[index+1];
          const token=tail.match(/(?:[-+]?\s*(?:\d{1,3}(?:[., '\u2019]\d{3})+|\d+)(?:[.,]\d{1,2})?-?)(?!\d)/);
          const value=token?amount(token[0]):undefined;
          if(value!==undefined&&value>=0&&value<10000000)candidates.push({value,line});
        }
        const unique=[...new Set(candidates.map(c=>c.value))];
        if(unique.length===1){fields[key]=unique[0];evidence[key]=candidates[0].line;return;}
        if(unique.length>1){warnings.push('More than one value was found for '+({grossPaid:'gross pay',netPaid:'net pay',hoursPaid:'paid hours'}[key])+'. Enter the value for this payslip.');return;}
      }
    }
    findNumber('grossPaid',[/\bgesamt[ -]?brutto\b\s*(?:\/\s*total\s*gross)?/i,/\btotal\s+gross(?:\s+(?:pay|earnings))?\b/i,/\bgross\s+(?:pay|paid|earnings)\b/i,/\bbrutto(?:lohn|gehalt|verdienst)\b/i]);
    findNumber('netPaid',[/\b(?:auszahlungsbetrag|überweisungsbetrag|ueberweisungsbetrag)\b/i,/\b(?:net\s+(?:pay|paid)|take.home\s+pay)\b/i,/\bnetto[ -]?(?:verdienst|lohn|gehalt|betrag)\b/i]);
    findNumber('hoursPaid',[/\b(?:hours\s+paid|paid\s+hours|total\s+hours|bezahlte\s+stunden|stunden\s+bezahlt|gesamtstunden|arbeitsstunden)\b/i]);
    const monthLines=lines.filter(line=>/payroll\s*(?:month|period)|pay\s*period|abrechnungs(?:monat|zeitraum)|abrechnung\s*(?:für|fuer|vom)?|lohnabrechnung|gehaltsabrechnung|entgeltabrechnung/i.test(line));
    const periods=[...new Set(monthLines.map(payrollMonth).filter(Boolean))];
    if(periods.length===1){fields.payrollMonth=periods[0];evidence.payrollMonth=monthLines.find(line=>payrollMonth(line));}
    else if(periods.length>1)warnings.push('Several payroll months were found. Choose the correct month.');
    const dateLine=lines.find(line=>/\b(?:payment\s+date|pay\s+date|zahltag|zahlungsdatum|auszahlung\s+am|überweisung\s+am)\b/i.test(line));
    if(dateLine){const result=paymentDate(dateLine);if(result){fields.paymentDate=result;evidence.paymentDate=dateLine;}}
    const currencies=[...new Set(lines.join(' ').match(/\b(?:EUR|USD|GBP|CHF)\b/g)||[])];
    if(currencies.length===1)fields.currency=currencies[0];else if(text.includes('€'))fields.currency='EUR';
    const normalize=s=>clean(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const lower=normalize(text),matches=jobs.filter(job=>[job.employerName,job.name].some(name=>name&&normalize(name).length>=4&&lower.includes(normalize(name))));
    if(matches.length===1)fields.jobId=matches[0].id;
    if(fields.netPaid>fields.grossPaid)warnings.push('Net pay is greater than gross pay. Check reimbursements and the extracted amounts.');
    return {fields,evidence,warnings,missing:['jobId','payrollMonth','grossPaid','netPaid'].filter(key=>fields[key]===undefined)};
  }
  function textFromItems(items){
    const lines=[];
    for(const item of items){if(!item.str?.trim())continue;const y=item.transform?.[5]??0;let line=lines.find(line=>Math.abs(line.y-y)<2.5);if(!line){line={y,items:[]};lines.push(line);}line.items.push(item);}
    return lines.sort((a,b)=>b.y-a.y).map(line=>line.items.sort((a,b)=>(a.transform?.[4]||0)-(b.transform?.[4]||0)).map(item=>item.str).join(' ')).join('\n');
  }
  return {parse,amount,textFromItems};
});

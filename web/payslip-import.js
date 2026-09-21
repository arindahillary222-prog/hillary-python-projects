(() => {
  let operation=0,previewUrl=null;
  const $=s=>document.querySelector(s);
  const setStatus=message=>{const node=$('#pdfImportStatus');if(node)node.textContent=message;};
  async function loadScript(src){if(window.Tesseract)return;await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error('The PDF reader could not load. Please reconnect and try again.'));document.head.appendChild(script);});}
  function setup(){
    const token=++operation;
    const input=$('#payslipPdfInput');if(!input)return;
    input.addEventListener('change',()=>{if(input.files?.[0])readPdf(input.files[0],token);});
    $('#retryPayslipPdf').onclick=()=>{if(input.files?.[0])readPdf(input.files[0],token);};
  }
  async function readPdf(file,token){
    if(file.size>15*1024*1024){setStatus('Choose a PDF smaller than 15 MB.');return;}
    if(!/\.pdf$/i.test(file.name)){setStatus('Choose a PDF payslip.');return;}
    const submit=$('#dialogSaveButton');submit.disabled=true;$('#retryPayslipPdf').hidden=true;
    setStatus('Reading payslip…');let pdf=null,ocr=null;
    try{
      const bytes=new Uint8Array(await file.arrayBuffer());
      if(!new TextDecoder().decode(bytes.slice(0,1024)).includes('%PDF-'))throw new Error('This file is not a valid PDF. Choose the original payslip PDF.');
      const pdfjs=await import('/vendor/pdf.min.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc='/vendor/pdf.worker.min.mjs';
      pdf=await pdfjs.getDocument({data:bytes,password:$('#pdfPassword').value||undefined,isEvalSupported:false,stopAtErrors:true,useSystemFonts:true,wasmUrl:"/vendor/pdf-wasm/"}).promise;
      if(pdf.numPages>10)throw new Error('Choose a single payslip with no more than 10 pages.');
      const texts=[];let scanned=false;
      for(let p=1;p<=pdf.numPages;p++){
        if(token!==operation)return;
        setStatus(`Reading page ${p} of ${pdf.numPages}…`);
        const page=await pdf.getPage(p),text=window.PayslipParser.textFromItems((await page.getTextContent()).items);
        if(text.replace(/\s/g,'').length>=60){texts.push(text);continue;}
        scanned=true;setStatus(`Reading scanned page ${p} of ${pdf.numPages}… This may take a minute.`);
        if(!ocr){await loadScript('/vendor/tesseract.min.js');ocr=await window.Tesseract.createWorker(['eng','deu'],1,{workerPath:'/vendor/ocr-worker.min.js',corePath:'/vendor/ocr',langPath:'/vendor/ocr/lang',workerBlobURL:false,cacheMethod:'none',logger:message=>{if(token===operation&&message.status==='recognizing text')setStatus(`Reading scanned page ${p} of ${pdf.numPages}… ${Math.round(message.progress*100)}%`);}});}
        const base=page.getViewport({scale:1}),scale=Math.min(2.4,2200/Math.max(base.width,base.height));
        const viewport=page.getViewport({scale}),canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
        try{await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;texts.push((await ocr.recognize(canvas)).data.text);}finally{canvas.width=0;canvas.height=0;}
      }
      if(token!==operation||!$('#entryDialog').open)return;
      const text=texts.join('\n\n'),result=window.PayslipParser.parse(text,getPayslipJobs());
      if(!text.trim())throw new Error('No readable text was found. Try a clearer PDF or enter the details manually.');
      for(const name of ['jobId','payrollMonth','grossPaid','netPaid','hoursPaid','paymentDate','currency']){
        const field=$('#field-'+name);if(field){field.value=result.fields[name]??'';field.classList.toggle('pdf-extracted',result.fields[name]!==undefined);}
      }
      $('#field-sourceFile').value=file.name;
      $('#pdfExtractedText').textContent=text.slice(0,50000);
      $('#pdfReview').hidden=false;
      if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(file);$('#pdfOriginalLink').href=previewUrl;
      $('#pdfReviewCheck').required=true;$('#pdfReviewCheck').checked=false;
      const count=Object.keys(result.evidence).length;
      setStatus(`${scanned?'Scanned PDF read. ':''}${count} details found. Review the highlighted fields and fill in any blanks before saving.`+(result.warnings.length?' '+result.warnings.join(' '):''));
    }catch(error){
      if(token!==operation)return;
      setStatus(error.name==='PasswordException'?'This PDF needs a password. Enter it below and tap Read PDF again.':error.message||'We could not read this PDF. Try again or enter the details manually.');
      $('#retryPayslipPdf').hidden=false;
    }finally{if(pdf)await pdf.destroy().catch(()=>{});if(ocr)await ocr.terminate().catch(()=>{});if(token===operation)submit.disabled=false;}
  }
  function reset(){operation++;if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}}
  document.addEventListener('DOMContentLoaded',()=>$('#entryDialog').addEventListener('close',reset));
  window.PayslipImport={setup,reset};
})();

/* Account and team screens. Permissions are also enforced by the server. */
(() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels = {home:'Dashboard',work:'My hours',tasks:'Tasks',progress:'Daily progress','work-calendar':'Calendar',reports:'Reports',payslips:'My payslips',bonuses:'Bonus payments','time-account':'Time account',people:'People','team-logs':'Team hours','team-progress':'Team progress',settings:'Account & settings',finance:'Finance',scholarships:'Study',permit:'Permit',calendar:'Calendar sync',ai:'Assistant'};
  const icons = {home:'⌂',work:'◷',tasks:'☑',progress:'✎','work-calendar':'▦',reports:'↧',payslips:'▤',bonuses:'＋','time-account':'◴',people:'♙','team-logs':'◷','team-progress':'☷',settings:'⚙',finance:'€',scholarships:'▱',permit:'▣',calendar:'▦',ai:'?'};
  const descriptions = {work:'Clock in or add a shift',tasks:'Assignments and status',progress:'Record today’s work','work-calendar':'Your month at a glance',reports:'Download your hours',payslips:'Upload PDF or enter pay',people:'Accounts and roles','team-logs':'Everyone’s worked hours','team-progress':'Updates from the team',settings:'Appearance and account'};
  let member, revision=0, pending=null, saving=null, saveError=null, lastState=null, taskBootstrap=null;
  let tasks=[], members=[], entries=[], people=[], dialogAction=null, routeToken=0;
  const pages={tasks:0,progress:0,'team-progress':0,'team-logs':0,people:0};
  let taskFilter='active', logPerson='all', logMonth=new Date().toISOString().slice(0,7);
  const isManager=()=>member?.role==='manager';
  const routes=()=>isManager()?Object.keys(labels):['home','work','tasks','progress','work-calendar','reports','payslips','settings'];
  const notice=(message,error=false)=>{const node=$('#saveStatus');if(node){node.textContent=message;node.classList.toggle('save-error',error);}};
  async function api(path,options={}) {
    let response;
    try { response=await fetch(path,{credentials:'same-origin',cache:'no-store',...options,headers:{'Content-Type':'application/json',...options.headers}}); }
    catch { throw new Error('Connection lost. Your changes are still on this screen. Reconnect and try again.'); }
    const result=await response.json().catch(()=>({error:'The server could not respond. Please try again.'}));
    if(!response.ok){const error=new Error(result.error||'Please try again.');error.status=response.status;throw error;}
    return result;
  }
  async function bootstrap(){member=(await api('/api/session')).member;const remote=await api('/api/data');revision=remote.revision;return {...remote,member};}
  async function saveInitial(data){const result=await api('/api/data',{method:'PUT',body:JSON.stringify({revision,data})});revision=result.revision;}
  function queueSave(data){pending=JSON.parse(JSON.stringify(data));lastState=data;saveError=null;notice('Saving…');pump();}
  function pump(){
    if(saving||!pending||saveError)return;
    saving=(async()=>{
      while(pending&&!saveError){
        const value=pending;pending=null;
        try{const result=await api('/api/data',{method:'PUT',body:JSON.stringify({revision,data:value})});revision=result.revision;}
        catch(error){if(!pending)pending=value;saveError=error;notice(error.message+' Use Retry save or export a backup from Account.',true);$('#retrySave').hidden=false;}
      }
      if(!saveError){notice('All changes saved');$('#retrySave').hidden=true;}
    })().finally(()=>{saving=null;if(pending&&!saveError)pump();});
  }
  async function flush(){while(saving)await saving;if(taskBootstrap)await taskBootstrap;if(saveError)throw saveError;}
  function routeButton(route,description=false){return `<button type="button" class="${description?'dashboard-action':'menu-item'}" data-team-route="${route}"><span class="menu-icon" aria-hidden="true">${icons[route]}</span><span><strong>${labels[route]}</strong>${description?`<small>${descriptions[route]||''}</small>`:''}</span></button>`;}
  function mount(){
    document.body.dataset.role=member.role;
    $('#accountName').textContent=member.name;
    $('#accountRole').textContent=isManager()?'Manager':'Employee';
    const primary=isManager()?['home','tasks','team-logs','team-progress','people','work','progress','work-calendar','payslips','reports']:['home','work','tasks','progress','work-calendar','payslips','reports'];
    $('#workspaceNav').innerHTML=primary.map(route=>`<button type="button" class="nav-item" data-team-route="${route}" data-route="${route}">${labels[route]}</button>`).join('')+'<button type="button" class="nav-item" data-open-menu>More…</button>';
    $('#workspaceMenuItems').innerHTML=routes().map(route=>routeButton(route)).join('');
    $('#saveStatus').insertAdjacentHTML('afterend','<button type="button" id="retrySave" class="quiet-button small retry-save" hidden>Retry save</button>');
    $('#retrySave').onclick=()=>{if(saveError?.status===409){notice('Export a backup from Account before reloading to resolve the newer saved version.',true);return;}saveError=null;pump();};
    $('#openWorkspaceMenu').onclick=()=>$('#workspaceMenu').showModal();
    $('#mobileMore').onclick=()=>$('#workspaceMenu').showModal();
    document.addEventListener('click',onClick);
    $('#teamForm').addEventListener('submit',submitTeam);
    document.addEventListener('change',event=>{
      if(event.target.id==='taskFilter'){taskFilter=event.target.value;pages.tasks=0;renderTasks();}
      if(event.target.id==='logPerson'){logPerson=event.target.value;pages['team-logs']=0;renderLogs();}
      if(event.target.id==='logMonth'){logMonth=event.target.value;pages['team-logs']=0;renderLogs();}
    });
    window.addEventListener('hashchange',()=>showRoute(location.hash.slice(1)));
    window.addEventListener('beforeunload',event=>{if(pending||saving){event.preventDefault();event.returnValue='';}});
    if(!isManager()){
      $('#view-settings > .section-head').hidden=true;
      [...$('#view-settings .settings-grid').children].slice(0,2).forEach(node=>node.hidden=true);
      $('#importDataButton').hidden=true;$('#resetDataButton').hidden=true;
      $('#planPeriodButtonCalendar').hidden=true;
    }
    document.querySelectorAll('[data-i18n="dataNote"]').forEach(node=>{node.removeAttribute('data-i18n');node.textContent='Your data is saved to your signed-in account. Managers can see your hours and daily progress.';});
    $('#view-settings').insertAdjacentHTML('beforeend',`<section class="panel"><h3>Your account</h3><p>${esc(member.email)} · ${isManager()?'Manager':'Employee'}</p><a class="signout-link" href="/logout">Sign out</a></section>`);
    taskBootstrap=api('/api/tasks').then(result=>{tasks=result.tasks;if(lastState)refreshHome(lastState);}).catch(error=>notice(error.message,true));
  }
  function refreshHome(data){
    lastState=data;
    const todayKey=today(), month=todayKey.slice(0,7);
    const completed=data.shifts.filter(s=>s.workStatus==='completed'&&s.date<=todayKey);
    const monthHours=completed.filter(s=>s.date.startsWith(month)).reduce((n,s)=>n+Number(s.workedMinutes||0)/60,0);
    const todayHours=completed.filter(s=>s.date===todayKey).reduce((n,s)=>n+Number(s.workedMinutes||0)/60,0);
    const mine=tasks.filter(task=>task.assignee_id===member.id&&task.status!=='completed');
    $('#homeSummary').innerHTML=`<div><p class="eyebrow">${esc(new Date().toLocaleDateString('en',{weekday:'long',month:'short',day:'numeric'}))}</p><h2>${esc(member.name.split(' ')[0])}’s dashboard</h2><p>${todayHours.toFixed(1)} h today <span aria-hidden="true">·</span> ${monthHours.toFixed(1)} h this month</p></div><button type="button" class="${data.activeShift?'danger-button':'primary-button'}" data-team-action="clock">${data.activeShift?'Stop shift':'Start shift'}</button>`;
    const tiles=isManager()?['tasks','team-logs','team-progress','people','work','work-calendar']:['work','tasks','progress','work-calendar','payslips','reports'];
    $('#homeActions').innerHTML=tiles.map(route=>routeButton(route,true)).join('');
    $('#homeToday').innerHTML=mine.length?`<p>${mine.length} open task${mine.length===1?'':'s'} assigned to you.</p>`+mine.slice(0,2).map(task=>`<div class="today-task"><strong>${esc(task.title)}</strong><button type="button" class="quiet-button small" data-team-action="progress" data-id="${task.id}">Update</button></div>`).join(''):'<p class="muted">No open tasks assigned to you.</p>';
  }
  async function renderRoute(route){
    const token=++routeToken;
    if(route==='home'){if(lastState)refreshHome(lastState);return;}
    const node=$('#'+route+'Content');if(!node)return;
    node.innerHTML='<p class="muted" role="status">Loading…</p>';
    try{
      if(route==='tasks'){const results=await Promise.all([api('/api/tasks'),isManager()?api('/api/members'):Promise.resolve({members:[]})]);if(token!==routeToken)return;tasks=results[0].tasks;members=results[1].members;renderTasks();}
      if(route==='progress'||route==='team-progress'){const result=await api('/api/progress'+(route==='team-progress'?'?scope=team':''));if(token!==routeToken)return;entries=result.entries;if(route==='progress')tasks=(await api('/api/tasks')).tasks;if(token!==routeToken)return;renderProgress(route);}
      if(route==='team-logs'){const result=await api('/api/team/logs');if(token!==routeToken)return;people=result.people;renderLogs();}
      if(route==='people'){const result=await api('/api/members');if(token!==routeToken)return;members=result.members;renderPeople();}
    }catch(error){if(token===routeToken)node.innerHTML=`<section class="panel"><p role="alert">${esc(error.message)}</p><button class="quiet-button" type="button" data-team-action="refresh">Try again</button></section>`;}
  }
  function pageItems(items,key,size=6){pages[key]=Math.min(pages[key]||0,Math.max(0,Math.ceil(items.length/size)-1));return items.slice(pages[key]*size,(pages[key]+1)*size);}
  function pager(items,key,size=6){return `<div class="pagination"><button class="quiet-button small" type="button" data-team-page="${key}" data-page="${pages[key]-1}" ${pages[key]===0?'disabled':''}>Previous</button><span>${items.length?pages[key]*size+1:0}–${Math.min(items.length,(pages[key]+1)*size)} of ${items.length}</span><button class="quiet-button small" type="button" data-team-page="${key}" data-page="${pages[key]+1}" ${(pages[key]+1)*size>=items.length?'disabled':''}>Next</button></div>`;}
  function head(title,action,label){return `<div class="section-head"><h2>${title}</h2>${action?`<button type="button" class="primary-button" data-team-action="${action}">${label}</button>`:'<button type="button" class="quiet-button small" data-team-action="refresh">Refresh</button>'}</div>`;}
  const statusLabel=task=>task.status==='completed'?'Completed':task.status==='in_progress'?'In progress':'Not started';
  function renderTasks(){
    const filtered=tasks.filter(task=>taskFilter==='all'||(taskFilter==='completed'?task.status==='completed':task.status!=='completed'));
    const rows=pageItems(filtered,'tasks');
    $('#tasksContent').innerHTML=head(isManager()?'Team tasks':'My tasks',isManager()?'new-task':null,'Assign task')+`<label class="list-filter">Show<select id="taskFilter"><option value="active" ${taskFilter==='active'?'selected':''}>Open tasks</option><option value="completed" ${taskFilter==='completed'?'selected':''}>Completed</option><option value="all" ${taskFilter==='all'?'selected':''}>All tasks</option></select></label><div class="team-list">`+(rows.length?rows.map(task=>`<article class="panel task-card"><div class="panel-head"><h3>${esc(task.title)}</h3><span class="status-pill">${statusLabel(task)}</span></div>${task.description?`<p class="task-description">${esc(task.description)}</p>`:''}<p class="muted">${isManager()?esc(task.assignee_name)+' · ':''}${task.due_date?'Due '+esc(task.due_date):'No due date'}</p><div class="task-progress"><progress value="${task.progress}" max="100" aria-label="Task completion"></progress><span>${task.progress}%</span></div><div class="button-row">${task.assignee_id===member.id?`<button class="primary-button small" type="button" data-team-action="progress" data-id="${task.id}">Update progress</button>`:''}${isManager()?`<button class="quiet-button small" type="button" data-team-action="edit-task" data-id="${task.id}">Edit</button><button class="danger-button small" type="button" data-team-action="delete-task" data-id="${task.id}">Delete</button>`:''}</div></article>`).join(''):'<section class="panel empty-state">No tasks here yet.</section>')+'</div>'+pager(filtered,'tasks');
  }
  function renderProgress(route){
    const rows=pageItems(entries,route);
    $('#'+route+'Content').innerHTML=head(route==='progress'?'My daily progress':'Team progress',route==='progress'?'progress':null,'Add update')+'<div class="team-list">'+(rows.length?rows.map(entry=>`<article class="panel"><div class="panel-head"><strong>${esc(entry.member_name)}</strong><time>${esc(entry.date)}</time></div>${entry.task_title?`<h3>${esc(entry.task_title)} ${entry.percent!==null?`· ${entry.percent}%`:''}</h3>`:''}<p class="progress-note">${esc(entry.note)}</p></article>`).join(''):'<section class="panel empty-state">No progress updates yet.</section>')+'</div>'+pager(entries,route);
  }
  function filteredLogs(){return people.filter(person=>logPerson==='all'||person.id===logPerson).flatMap(person=>person.shifts.filter(shift=>!logMonth||shift.date.startsWith(logMonth)).map(shift=>({...shift,personName:person.name,jobName:person.jobs.find(j=>j.id===shift.jobId)?.name||''}))).sort((a,b)=>b.date.localeCompare(a.date));}
  function renderLogs(){
    const logs=filteredLogs(),rows=pageItems(logs,'team-logs',10);
    const worked=logs.filter(s=>s.workStatus==='completed'&&s.date<=today());
    const hours=worked.reduce((sum,s)=>sum+Number(s.workedMinutes||0)/60,0);
    $('#team-logsContent').innerHTML=head('Team hours')+`<div class="panel"><div class="team-filters"><label>Person<select id="logPerson"><option value="all">Everyone</option>${people.map(person=>`<option value="${person.id}" ${person.id===logPerson?'selected':''}>${esc(person.name)}</option>`).join('')}</select></label><label>Month<input id="logMonth" type="month" value="${esc(logMonth)}"></label><button type="button" class="quiet-button" data-team-action="export-logs">Export CSV</button></div><div class="team-total"><strong>${hours.toFixed(2)} h worked</strong><span>${worked.length} completed shifts</span></div></div><div class="team-list">`+(rows.length?rows.map(shift=>`<article class="panel log-card"><div><h3>${esc(shift.personName)}</h3><p>${esc(shift.date)} · ${esc(shift.start)}–${esc(shift.end)}</p><small>${esc(shift.jobName)}</small></div><div><strong>${(Number(shift.workedMinutes||0)/60).toFixed(2)} h</strong><p>${esc(shift.workStatus.replaceAll('_',' '))}</p><small>${Number(shift.breakMinutes||0)} min break</small></div></article>`).join(''):'<section class="panel empty-state">No time logs for this selection.</section>')+'</div>'+pager(logs,'team-logs',10);
  }
  function renderPeople(){
    const rows=pageItems(members,'people');
    $('#peopleContent').innerHTML=head('People','new-member','Add person')+'<p class="muted">Add their sign-in email here, then grant access using this app’s Share control.</p><div class="team-list">'+rows.map(person=>`<article class="panel person-card"><div><h3>${esc(person.name)}</h3><p class="person-email">${esc(person.email)}</p><small>${person.active?(person.joined?'Active':'Waiting for first sign-in'):'Disabled'}</small></div><div><span class="status-pill">${person.owner?'Owner · manager':person.role==='manager'?'Manager':'Employee'}</span>${person.id!==member.id&&!person.owner?`<button class="quiet-button small" type="button" data-team-action="edit-member" data-id="${person.id}">Edit access</button>`:''}</div></article>`).join('')+'</div>'+pager(members,'people');
  }
  function input(name,label,type='text',value='',extra=''){return `<label><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;}
  function select(name,label,options,value){return `<label><span>${label}</span><select name="${name}">${options.map(([key,text])=>`<option value="${esc(key)}" ${String(key)===String(value)?'selected':''}>${esc(text)}</option>`).join('')}</select></label>`;}
  function openTeam(title,fields,action){dialogAction=action;$('#teamDialogTitle').textContent=title;$('#teamFields').innerHTML=fields;$('#teamError').textContent='';$('#teamSave').disabled=false;$('#teamDialog').showModal();}
  async function onClick(event){
    const route=event.target.closest('[data-team-route]');if(route){showRoute(route.dataset.teamRoute);return;}
    if(event.target.closest('[data-open-menu]')){$('#workspaceMenu').showModal();return;}
    if(event.target.closest('[data-close-menu]')){$('#workspaceMenu').close();return;}
    if(event.target.closest('[data-close-team]')){$('#teamDialog').close();return;}
    const page=event.target.closest('[data-team-page]');if(page){pages[page.dataset.teamPage]=Number(page.dataset.page);({tasks:renderTasks,progress:()=>renderProgress('progress'),'team-progress':()=>renderProgress('team-progress'),'team-logs':renderLogs,people:renderPeople}[page.dataset.teamPage])();window.scrollTo(0,0);return;}
    const button=event.target.closest('[data-team-action]');if(!button)return;
    const action=button.dataset.teamAction,id=button.dataset.id;
    if(action==='clock'){if(!lastState?.activeShift){showRoute('work');$('#clockJob').focus();}else toggleActiveShift();return;}
    if(action==='refresh'){renderRoute(currentRoute());return;}
    if(action==='export-logs'){downloadCsv('team-hours-'+(logMonth||'all')+'.csv',[['Person','Date','Job','Start','End','Break minutes','Hours','Status'],...filteredLogs().map(s=>[s.personName,s.date,s.jobName,s.start,s.end,s.breakMinutes,(s.workedMinutes/60).toFixed(2),s.workStatus])]);return;}
    if(action==='new-task'||action==='edit-task'){
      const item=tasks.find(task=>task.id===id)||{};
      openTeam(id?'Edit task':'Assign task',input('title','Task','text',item.title,'required maxlength="160"')+select('assigneeId','Assign to',members.filter(m=>m.active).map(m=>[m.id,m.name]),item.assignee_id)+input('dueDate','Due date (optional)','date',item.due_date)+`<label class="full-width"><span>Details</span><textarea name="description" rows="3" maxlength="2000">${esc(item.description)}</textarea></label>`,{type:'task',id});
    }
    if(action==='delete-task')openTeam('Delete task?',`<p class="full-width">Delete “${esc(tasks.find(task=>task.id===id)?.title)}”? Its past progress notes will stay in the daily log.</p>`,{type:'delete-task',id});
    if(action==='progress'){
      const item=tasks.find(task=>task.id===id)||{};
      openTeam('Daily progress',input('date','Date','date',today(),'required')+select('taskId','Task (optional)',[['','General daily update'],...tasks.filter(t=>t.assignee_id===member.id).map(t=>[t.id,t.title])],id||'')+input('percent','Task completion % (optional)','number',item.progress??'','min="0" max="100" step="1"')+`<label class="full-width"><span>What did you do today?</span><textarea name="note" rows="4" required maxlength="3000" placeholder="Completed work, next steps or anything blocking you"></textarea></label>`,{type:'progress'});
    }
    if(action==='new-member')openTeam('Add person',input('name','Name','text','','required maxlength="120"')+input('email','Sign-in email','email','','required maxlength="254"')+select('role','Role',[['employee','Employee — own hours & progress'],['manager','Manager — tasks & team hours']],'employee')+'<p class="muted full-width">After saving, share the app login details securely with this person.</p>',{type:'member'});
    if(action==='edit-member'){const item=members.find(person=>person.id===id);openTeam('Edit '+item.name,select('role','Role',[['employee','Employee'],['manager','Manager']],item.role)+select('active','Account access',[['true','Enabled'],['false','Disabled']],String(item.active)),{type:'member',id});}
  }
  async function submitTeam(event){
    event.preventDefault();if(!dialogAction)return;
    const action={...dialogAction},value=Object.fromEntries(new FormData(event.currentTarget));
    const button=$('#teamSave');button.disabled=true;$('#teamError').textContent='';
    try{
      if(action.type==='task')await api('/api/tasks'+(action.id?'/'+action.id:''),{method:action.id?'PATCH':'POST',body:JSON.stringify(value)});
      if(action.type==='delete-task')await api('/api/tasks/'+action.id,{method:'DELETE'});
      if(action.type==='progress')await api('/api/progress',{method:'POST',body:JSON.stringify(value)});
      if(action.type==='member'){if(action.id)value.active=value.active==='true';await api('/api/members'+(action.id?'/'+action.id:''),{method:action.id?'PATCH':'POST',body:JSON.stringify(value)});}
      $('#teamDialog').close();dialogAction=null;notice('Saved');
      if(action.type==='progress'){tasks=(await api('/api/tasks')).tasks;if(lastState)refreshHome(lastState);}
      await renderRoute(currentRoute());
    }catch(error){$('#teamError').textContent=error.message;}
    finally{button.disabled=false;}
  }
  window.TeamWorkspace={bootstrap,saveInitial,queueSave,flush,mount,refreshHome,renderRoute,canRoute:route=>routes().includes(route),routeTitle:route=>labels[route]||'Dashboard',get member(){return member;}};
})();

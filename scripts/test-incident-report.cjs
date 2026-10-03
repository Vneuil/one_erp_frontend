const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
(async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'one-incident-test-'));
  const source = await fs.readFile('app/incident-response-policy/report/route.ts', 'utf8');
  const compiled = ts.transpileModule(source, {compilerOptions: {esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
  const mod = new Module(path.resolve('incident-route-test.cjs'), module);
  mod._compile(compiled, path.resolve("incident-route-test.cjs"));
  const post = mod.exports.POST;
  const payload = {name:'Test Reporter', email:'test@example.com', service:'QA fixture', summary:'Synthetic test report', details:'This is a synthetic test and not a real incident.', severity:'low', consent:true};
  const request = (data=payload, headers={}) => new Request('https://one.divine.co.id/incident-response-policy/report', {method:'POST', headers:{origin:'https://one.divine.co.id','content-type':'application/json',...headers}, body:JSON.stringify(data)});
  try {
    process.env.INCIDENT_REPORT_DIR=dir;
    assert.equal((await post(request(payload,{origin:'https://example.com'}))).status,403);
    assert.equal((await post(request({...payload,email:'invalid'}))).status,400);
    assert.equal((await post(request({...payload,consent:false}))).status,400);
    assert.equal((await post(request({...payload,details:'x'.repeat(20_000)}))).status,413);
    assert.equal((await post(request({...payload,website:'spam'}))).status,400);
    assert.equal((await fs.readdir(dir)).length,0);
    const response=await post(request()); assert.equal(response.status,201);
    const {id}=await response.json(); assert.match(id,/^INC-[0-9a-f-]+$/);
    const file=path.join(dir,id+'.json');
    const saved=JSON.parse(await fs.readFile(file,'utf8'));
    assert.equal(saved.email,payload.email); assert.equal(saved.status,'new');
    assert.equal((await fs.stat(file)).mode & 0o777,0o600);
    process.env.INCIDENT_REPORT_DIR=file;
    assert.equal((await post(request())).status,503);
    delete process.env.INCIDENT_REPORT_DIR;
    assert.equal((await post(request())).status,503);
    process.env.INCIDENT_REPORT_DIR=dir;
    for(let i=0;i<28;i++) assert.equal((await post(request())).status,201);
    assert.equal((await post(request())).status,429);
    console.log('PASS: origin, validation, size, honeypot, durable receipt, file permissions, storage failure, configuration, and rate limit');
  } finally { await fs.rm(dir,{recursive:true,force:true}); }
})().catch(error=>{ console.error(error); process.exitCode=1; });

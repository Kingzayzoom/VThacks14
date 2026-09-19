import { test } from "node:test";
import assert from "node:assert/strict";
import { HttpControlApi } from "../src/lib/api/HttpControlApi";
import { HubMission, HubState, mapAgents, mapMission } from "../src/lib/api/hub-mapping";
import { proxyControl } from "../src/lib/api/hub-proxy";
const mission = HubMission.parse({id:"m_test",text:"A dental website",status:"planning",started_at:"2026-09-19T12:00:00Z"});
const agentState = HubState.parse({ans_backend:"godaddy",agents:[{key:"brand",name:"Brand",org:"BrandStudio",role:"vendor",online:true,ans_name:"ans://brand",capabilities:["brand.identity"],status:"ACTIVE"}]});
const event = { id:"event1",ts:"2026-09-19T12:00:00Z",type:"trust.check",message:"Evidence unavailable",mission_id:"m_test",subject:"ans://brand",data:{checks:[{name:"resolve",state:"pass",detail:"Registered"},{name:"authenticate",state:"unverified",detail:"No certificate"}]} };
test("mapping preserves unverified identity, simulator evidence and separate scoped authority", () => {
  const agent = mapAgents(agentState, mission, [event], [])[0];
  assert.equal(agent.identityStatus,"unverified"); assert.deepEqual(agent.allowedScopes,[]); assert.match(agent.standingSummary!, /Not currently verified/);
  const verified = {...event,data:{checks:event.data.checks.map(c=>({...c,state:"pass"}))}};
  const simulator = mapAgents({...agentState,ans_backend:"sim"},mission,[verified],[])[0];
  assert.equal(simulator.identityStatus,"demo_verified"); assert.equal(simulator.source,"demo"); assert.deepEqual(simulator.allowedScopes,[]);
  assert.equal(mapAgents(agentState,mission,[verified],[])[0].identityStatus,"verified");
  assert.equal(mapMission({...mission,status:"unknown"}).mission.status,"disconnected");
});
test("live creation deduplicates concurrent submissions, and a failed hub never creates a mock mission", async () => {
  let calls=0;
  const api=new HttpControlApi(async()=>{calls++;return Response.json(mission);});
  const input={objective:mission.text,idempotencyKey:"one"};
  const [a,b]=await Promise.all([api.createMission(input),api.createMission(input)]);
  assert.equal(a.id,b.id); assert.equal(calls,1); assert.equal(api.getSnapshot().missions.length,1);
  await assert.rejects(api.createMission({...input,objective:"Different"}),{code:"INVALID_REQUEST"});
  const failed=new HttpControlApi(async()=>new Response(null,{status:502}));
  await assert.rejects(failed.createMission(input)); assert.equal(failed.getSnapshot().missions.length,0); assert.ok(failed.getSnapshot().live);
});
test("history and live duplicate WebSocket events do not duplicate state or leak another mission into the feed", async()=>{
  const api=new HttpControlApi(async()=>Response.json(mission));
  await api.createMission({objective:mission.text,idempotencyKey:"key"});
  api.receive(JSON.stringify({kind:"history",events:[event,event,{...event,id:"other",mission_id:"m_other"}]}));
  api.receive(JSON.stringify({kind:"event",event})); api.receive("broken"); api.receive(JSON.stringify({kind:"event",event:{id:"bad"}}));
  assert.equal(api.getSnapshot().events.length,1); assert.equal(api.getSnapshot().events[0].id,event.id);
  assert.equal(api.getSnapshot().selectedMissionId,"m_test");
});
test("proxy rejects cross-origin mutations, extra fields and unlisted endpoints without upstream calls", async()=>{
  let calls=0;
  const fetcher:typeof fetch=async()=>{calls++;return Response.json(mission);};
  const env={CORTEX_RUNTIME_MODE:"live"};
  const request=(body:unknown,origin="http://localhost")=>new Request("http://localhost/api/control/missions",{method:"POST",headers:{origin},body:JSON.stringify(body)});
  assert.equal((await proxyControl(request({objective:"Test",idempotencyKey:"x"},"http://attacker"),["missions"],env,fetcher)).status,403);
  assert.equal((await proxyControl(request({objective:"Test",idempotencyKey:"x",scenario:{publish:true}}),["missions"],env,fetcher)).status,400);
  assert.equal((await proxyControl(request({}),["guardian","grants"],env,fetcher)).status,404); assert.equal(calls,0);
  const success=await proxyControl(request({objective:"Test",idempotencyKey:"x"}),["missions"],env,async(url,init)=>{assert.equal(String(url),"http://127.0.0.1:8000/api/missions");assert.deepEqual(JSON.parse(String(init?.body)),{text:"Test",idempotency_key:"x"});return Response.json({...mission,secret:"never-forward"});});
  assert.equal(success.status,200); assert.equal((await success.text()).includes("never-forward"),false);
});
test("disconnect closes the stream; unmount cancels queued reconnects and ignores late frames", async()=>{
  let closed=0;
  const stream={onmessage:null,onopen:null,onerror:null,close:()=>{closed++;}} as unknown as EventSource;
  const api=new HttpControlApi(async()=>new Response(null,{status:503}),()=>stream);
  const stop=api.start(); stream.onerror?.({} as Event); stop();
  stream.onmessage?.({data:JSON.stringify({kind:"event",event})} as MessageEvent);
  assert.equal(closed,1); assert.equal(api.getSnapshot().events.length,0);
});
import { isSameOrigin } from "../src/lib/api/same-origin";
test("same-origin checks accept the public host behind Next but refuse a foreign origin", () => {
  assert.equal(isSameOrigin(new Request("http://localhost:3029/api/control/missions", { headers: {host:"127.0.0.1:3029",origin:"http://127.0.0.1:3029"} })), true);
  assert.equal(isSameOrigin(new Request("http://localhost:3029/api/control/missions", { headers: {host:"127.0.0.1:3029",origin:"http://attacker.test"} })), false);
});
test("reconnection is bounded to five retries", t => {
  t.mock.timers.enable({apis:["setTimeout"]});
  const streams: EventSource[]=[];
  const api=new HttpControlApi(async()=>new Response(null,{status:503}),()=>{
    const stream={onmessage:null,onopen:null,onerror:null,close:()=>{}} as unknown as EventSource;
    streams.push(stream); return stream;
  });
  const stop=api.start();
  for(let i=0;i<6;i++) { streams.at(-1)!.onerror?.({} as Event); t.mock.timers.tick(32000); }
  assert.equal(streams.length,6);
  assert.match(api.getSnapshot().live!.error!,/5 retries/);
  stop();
});
test("mission exception diagnostics do not reach proxy output", async () => {
  const response = await proxyControl(new Request("http://localhost/api/control/missions/current"), ["missions", "current"], {CORTEX_RUNTIME_MODE:"live"}, async()=>Response.json({mission:{...mission,error:"private-provider-diagnostic"}}));
  const output = await response.text();
  assert.equal(output.includes("private-provider-diagnostic"), false);
  assert.equal(output.includes("Check the hub diagnostics"), true);
});

// The chapter and session shape the server needs, as plain JS.
// curriculum.json cannot be imported here: Node requires an import attribute for JSON and the Workers bundler
// rejects one, so this file is hand-maintained and tests/pilot-analytics.test.mjs fails if it drifts from the curriculum.
export const COURSE_SHAPE = {
  blocks: [
  {id:"block1",sessionIds:["b1s1","b1lab","b1s2","b1s3","b1s4"],labSessionIds:["b1lab"]},
  {id:"block2",sessionIds:["b2s1","b2s2","b2s3","b2s4","b2s5","b2s6","b2s7"],labSessionIds:["b2s2"]},
  {id:"block3",sessionIds:["b3s1","b3s2","b3s3","b3s4","b3s5","b3s6"],labSessionIds:["b3s2"]},
  {id:"block4",sessionIds:["b4s1","b4s2","b4s3","b4s4","b4s5","b4s6","b4s7","b4s8","b4s9","b4s10"],labSessionIds:["b4s1"]},
  {id:"block5",sessionIds:["b5s1","b5s2","b5s3","b5s4","b5s5","b5s6","b5s7","b5s8","b5s9"],labSessionIds:[]},
  {id:"block6",sessionIds:["b6s1","b6s2","b6s3","b6s4","b6s5","b6s6","b6s7","b6s8"],labSessionIds:["b6s1","b6s2","b6s4","b6s6"]},
  {id:"block7",sessionIds:["b7s1","b7s2","b7s3","b7s4","b7s5","b7s6","b7s7","b7s8"],labSessionIds:[]},
  {id:"block8",sessionIds:["b8s1","b8s2","b8s3","b8s4","b8s5","b8s6","b8s7","b8s8"],labSessionIds:["b8s5"]}
  ]
};

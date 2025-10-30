// Core: statistics helpers
(function (global){ const PP=global.PlanningPoker=global.PlanningPoker||{}; PP.Statistics={ fromVotes(map){ const values=Object.values(map).map(v=>v.vote).filter(v=>typeof v==='number'); if(!values.length)return null; const min=Math.min(...values); const max=Math.max(...values); const avg=(values.reduce((s,v)=>s+v,0)/values.length).toFixed(1); return {min,max,avg,count:values.length}; } };})(window);


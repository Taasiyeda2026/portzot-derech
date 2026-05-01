const MATCH_LABELS = [
  { min: 74, label: 'גבוהה' },
  { min: 58, label: 'טובה' },
  { min: 0, label: 'מאוזנת' }
];

const ROLE_MAP = {
  ideas: ['ideas', 'initiator', 'prototype_fast', 'inspiration_research'],
  organization: ['organization', 'task_organizer', 'planner', 'checklist_oriented', 'clarity_structure'],
  execution: ['focused_executor', 'task_execution', 'persistence_trial_error', 'technical_checking', 'design', 'presentation']
};

function pick(v, fallback) { return v || fallback || ''; }
function normalize(r) {
  return {
    ...r,
    displayName: r.displayName || r.name || 'משתתפת',
    mainDomain: pick(r.mainDomain, r.domain),
    problemType: pick(r.problemType, r.lifeInterest),
    infoProcessingStyle: pick(r.infoProcessingStyle, r.communicationStyle),
    planningStyle: pick(r.planningStyle, r.workStyle),
    choiceDriver: pick(r.choiceDriver, r.motivationSource),
    naturalTeamContribution: pick(r.naturalTeamContribution, r.teamRole),
    problemSolvingStyle: pick(r.problemSolvingStyle, r.pressureResponse),
    visualCommunicationStyle: pick(r.visualCommunicationStyle, r.communicationStyle),
    groupBehaviorPattern: pick(r.groupBehaviorPattern, r.teamStyle),
    conflictStyle: pick(r.conflictStyle, r.conflictStyle),
    groupNeed: pick(r.groupNeed, r.importanceLevel),
    groupComfortLevel: pick(r.groupComfortLevel, ''),
    neededTeamSupport: pick(r.neededTeamSupport, ''),
    startStyle: pick(r.startStyle, r.workPace)
  };
}

export function getPreferredGroupSizes(count) {
  if (count <= 1) return [];
  if (count === 2) return [2];
  if (count === 3) return [3];
  if (count === 4) return [4];
  if (count === 5) return [3, 2];
  const sizes = [];
  const rem = count % 3;
  if (rem === 0) {
    return Array(count / 3).fill(3);
  }
  if (rem === 1) {
    sizes.push(4);
    return sizes.concat(Array((count - 4) / 3).fill(3));
  }
  // rem === 2: prefer two groups of 4 when possible
  if (count >= 8) {
    sizes.push(4, 4);
    return sizes.concat(Array((count - 8) / 3).fill(3));
  }
  return [3, 2];
}

export function calculatePairScore(aRaw, bRaw) {
  const a = normalize(aRaw), b = normalize(bRaw);
  let score = 0;
  if (a.mainDomain && a.mainDomain === b.mainDomain) score += 14;
  if (a.problemType && a.problemType === b.problemType) score += 10;
  ['planningStyle','startStyle','infoProcessingStyle','problemSolvingStyle','conflictStyle'].forEach(k => {
    if (a[k] && a[k] === b[k]) score += 6;
  });
  if (a.naturalTeamContribution && b.naturalTeamContribution && a.naturalTeamContribution !== b.naturalTeamContribution) score += 8;
  if (a.groupBehaviorPattern && b.groupBehaviorPattern && a.groupBehaviorPattern !== b.groupBehaviorPattern) score += 6;
  if (a.groupNeed && b.groupNeed && a.groupNeed === b.groupNeed) score += 4;
  if (a.groupComfortLevel && b.groupComfortLevel && a.groupComfortLevel === b.groupComfortLevel) score += 3;
  return Math.min(100, score);
}

function inferRoleTags(m) {
  const s = [m.naturalTeamContribution, m.groupBehaviorPattern, m.startStyle, m.planningStyle, m.groupNeed].join(' ');
  return {
    ideas: ROLE_MAP.ideas.some(t => s.includes(t)),
    organization: ROLE_MAP.organization.some(t => s.includes(t)),
    execution: ROLE_MAP.execution.some(t => s.includes(t))
  };
}

export function calculateGroupBalance(groupRaw) {
  const group = groupRaw.map(normalize);
  const roles = group.map(inferRoleTags);
  const hasIdeas = roles.some(r => r.ideas);
  const hasOrg = roles.some(r => r.organization);
  const hasExec = roles.some(r => r.execution);
  const uniqueContrib = new Set(group.map(m => m.naturalTeamContribution).filter(Boolean)).size;
  const supportMatches = group.some(a => group.some(b => a !== b && a.neededTeamSupport && b.naturalTeamContribution && a.neededTeamSupport.replace('needs_','').includes(b.naturalTeamContribution.split('_')[0])));

  let bonus = 0;
  if (uniqueContrib >= 2) bonus += 8;
  if (group.length === 3 && uniqueContrib >= 3) bonus += 8;
  if (hasOrg) bonus += 7;
  if (hasIdeas) bonus += 7;
  if (hasExec) bonus += 7;
  if (supportMatches) bonus += 6;
  return { bonus, hasIdeas, hasOrg, hasExec, uniqueContrib, supportMatches };
}

export function calculateGroupScore(group) {
  const pairs = [];
  for (let i=0;i<group.length;i++) for (let j=i+1;j<group.length;j++) pairs.push(calculatePairScore(group[i], group[j]));
  const avg = pairs.reduce((a,b)=>a+b,0)/(pairs.length||1);
  const balance = calculateGroupBalance(group);
  return Math.round(Math.min(100, avg + balance.bonus * 0.8));
}

function groupReasons(balance, members) {
  const reasons = [];
  if (members.some((m,_,arr)=>arr.filter(x=>x.mainDomain===m.mainDomain && m.mainDomain).length>=2)) reasons.push('יש לכן תחום עניין משותף.');
  if (balance.hasIdeas && balance.hasOrg && balance.hasExec) reasons.push('יש בקבוצה שילוב טוב של רעיונות, סדר ועשייה.');
  if (balance.uniqueContrib >= 2) reasons.push('דרכי העבודה שלכן יכולות להשתלב.');
  if (balance.supportMatches) reasons.push('כל אחת יכולה להביא לקבוצה חוזקה אחרת.');
  if (!reasons.length) reasons.push('יש לכן בסיס טוב לעבודה משותפת.');
  return reasons;
}

export function generateGroups(responses) {
  const pool = (responses || []).map(normalize);
  const sizes = getPreferredGroupSizes(pool.length);
  const remaining = [...pool];
  const groups = [];
  sizes.forEach((size, idx) => {
    let best = null;
    const indices = [...remaining.keys()];
    const combos = [];
    function build(start, pick) {
      if (pick.length === size) return combos.push([...pick]);
      for (let i=start;i<indices.length;i++) build(i+1, [...pick, indices[i]]);
    }
    build(0, []);
    combos.forEach(c => {
      const members = c.map(i => remaining[i]);
      const score = calculateGroupScore(members);
      if (!best || score > best.score) best = { c, members, score, balance: calculateGroupBalance(members) };
    });
    if (!best) return;
    groups.push({
      id: crypto.randomUUID(), groupNumber: idx + 1, size,
      members: best.members.map(m => m.id), memberNames: best.members.map(m => m.displayName),
      memberData: best.members, score: best.score,
      matchLevel: MATCH_LABELS.find(l => best.score >= l.min).label,
      reasons: groupReasons(best.balance, best.members),
      balanceProfile: best.balance, createdAt: Date.now()
    });
    best.c.sort((a,b)=>b-a).forEach(i=>remaining.splice(i,1));
  });
  return groups;
}

export function getGroupStats(groups) {
  const sizes = groups.map(g => g.size);
  const participants = sizes.reduce((a,b)=>a+b,0);
  const avg = groups.length ? Math.round(groups.reduce((a,g)=>a+g.score,0)/groups.length) : 0;
  return { totalGroups: groups.length, groupsOf2: sizes.filter(s=>s===2).length, groupsOf3: sizes.filter(s=>s===3).length, groupsOf4: sizes.filter(s=>s===4).length, participants, averageMatchLevel: avg };
}

export function generatePairs(responses) { return generateGroups(responses); }
export function getPairingStats(pairs) { return getGroupStats(pairs); }

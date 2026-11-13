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
    mainDomain: pick(r.mainDomainCode, pick(r.mainDomain, r.domain)),
    problemType: pick(r.problemTypeCode, pick(r.problemType, r.lifeInterest)),
    infoProcessingStyle: pick(r.infoProcessingStyleCode, pick(r.infoProcessingStyle, r.communicationStyle)),
    planningStyle: pick(r.planningStyleCode, pick(r.planningStyle, r.workStyle)),
    choiceDriver: pick(r.choiceDriverCode, pick(r.choiceDriver, r.motivationSource)),
    naturalTeamContribution: pick(r.naturalTeamContributionCode, pick(r.naturalTeamContribution, r.teamRole)),
    problemSolvingStyle: pick(r.problemSolvingStyleCode, pick(r.problemSolvingStyle, r.pressureResponse)),
    visualCommunicationStyle: pick(r.visualCommunicationStyleCode, pick(r.visualCommunicationStyle, r.communicationStyle)),
    groupBehaviorPattern: pick(r.groupBehaviorPatternCode, pick(r.groupBehaviorPattern, r.teamStyle)),
    conflictStyle: pick(r.conflictStyleCode, pick(r.conflictStyle, r.conflictStyle)),
    groupNeed: pick(r.groupNeedCode, pick(r.groupNeed, r.importanceLevel)),
    groupComfortLevel: pick(r.groupComfortLevelCode, pick(r.groupComfortLevel, '')),
    neededTeamSupport: pick(r.neededTeamSupportCode, pick(r.neededTeamSupport, '')),
    startStyle: pick(r.startStyleCode, pick(r.startStyle, r.workPace))
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

function balanceBonus(size, uniqueContrib, hasOrg, hasIdeas, hasExec, supportMatches) {
  let bonus = 0;
  if (uniqueContrib >= 2) bonus += 8;
  if (size === 3 && uniqueContrib >= 3) bonus += 8;
  if (hasOrg) bonus += 7;
  if (hasIdeas) bonus += 7;
  if (hasExec) bonus += 7;
  if (supportMatches) bonus += 6;
  return bonus;
}

function scoreFromTotals(sum, count, bonus) {
  return Math.round(Math.min(100, sum / (count || 1) + bonus * 0.8));
}

export function calculateGroupBalance(groupRaw) {
  const group = groupRaw.map(normalize);
  const roles = group.map(inferRoleTags);
  const hasIdeas = roles.some(r => r.ideas);
  const hasOrg = roles.some(r => r.organization);
  const hasExec = roles.some(r => r.execution);
  const uniqueContrib = new Set(group.map(m => m.naturalTeamContribution).filter(Boolean)).size;
  const supportMatches = group.some(a => group.some(b => a !== b && a.neededTeamSupport && b.naturalTeamContribution && a.neededTeamSupport.replace('needs_','').includes(b.naturalTeamContribution.split('_')[0])));

  const bonus = balanceBonus(group.length, uniqueContrib, hasOrg, hasIdeas, hasExec, supportMatches);
  return { bonus, hasIdeas, hasOrg, hasExec, uniqueContrib, supportMatches };
}

export function calculateGroupScore(group) {
  const pairs = [];
  for (let i=0;i<group.length;i++) for (let j=i+1;j<group.length;j++) pairs.push(calculatePairScore(group[i], group[j]));
  const balance = calculateGroupBalance(group);
  return scoreFromTotals(pairs.reduce((a,b)=>a+b,0), pairs.length, balance.bonus);
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

// Same exhaustive candidates, scoring and first-best tie order as the approved
// reference. Precompute request-local facts and stream candidates rather than
// allocating every combination and recomputing the same pair/role data.
export function generateGroups(responses) {
  const pool = (responses || []).map(normalize);
  const sizes = getPreferredGroupSizes(pool.length);
  if (!sizes.length) return [];
  const pairScores = pool.map(() => new Uint8Array(pool.length));
  const support = pool.map(() => new Uint8Array(pool.length));
  const roles = pool.map(member => {
    const tags = inferRoleTags(member);
    return (tags.ideas ? 1 : 0) | (tags.organization ? 2 : 0) | (tags.execution ? 4 : 0);
  });
  for (let i=0; i<pool.length; i++) {
    for (let j=i+1; j<pool.length; j++) pairScores[i][j] = calculatePairScore(pool[i], pool[j]);
    for (let j=0; j<pool.length; j++) {
      const a = pool[i], b = pool[j];
      support[i][j] = i !== j && a.neededTeamSupport && b.naturalTeamContribution &&
        a.neededTeamSupport.replace('needs_','').includes(b.naturalTeamContribution.split('_')[0]) ? 1 : 0;
    }
  }
  let remaining = pool.map((_, index) => index);
  const groups = [];
  sizes.forEach((size, idx) => {
    const pick = new Array(size);
    let best = null, bestScore = -1;
    function evaluate() {
      let sum = 0, count = 0, roleMask = 0, uniqueContrib = 0, supportMatches = false;
      for (let i=0; i<size; i++) {
        const a = pick[i];
        roleMask |= roles[a];
        const contribution = pool[a].naturalTeamContribution;
        if (contribution) {
          let seen = false;
          for (let j=0; j<i; j++) if (pool[pick[j]].naturalTeamContribution === contribution) { seen = true; break; }
          if (!seen) uniqueContrib++;
        }
        for (let j=i+1; j<size; j++) { sum += pairScores[a][pick[j]]; count++; }
        if (!supportMatches) for (let j=0; j<size; j++) if (support[a][pick[j]]) { supportMatches = true; break; }
      }
      const bonus = balanceBonus(size, uniqueContrib, !!(roleMask & 2), !!(roleMask & 1), !!(roleMask & 4), supportMatches);
      const score = scoreFromTotals(sum, count, bonus);
      if (score > bestScore) { bestScore = score; best = pick.slice(); }
    }
    function visit(start, depth) {
      if (depth === size) { evaluate(); return; }
      for (let i=start; i<=remaining.length-(size-depth); i++) {
        pick[depth] = remaining[i];
        visit(i+1, depth+1);
      }
    }
    visit(0, 0);
    if (!best) return;
    const members = best.map(i => pool[i]);
    const balance = calculateGroupBalance(members);
    groups.push({
      id: crypto.randomUUID(), groupNumber: idx + 1, size,
      members: members.map(m => m.id), memberNames: members.map(m => m.displayName),
      memberData: members, score: bestScore,
      matchLevel: MATCH_LABELS.find(l => bestScore >= l.min).label,
      reasons: groupReasons(balance, members),
      balanceProfile: balance, createdAt: Date.now()
    });
    const selected = new Set(best);
    remaining = remaining.filter(i => !selected.has(i));
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

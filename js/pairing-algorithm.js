// אלגוריתם חישוב ניקוד התאמה בין שותפות
// 10 תחומים: תחושת גוף, חיים דיגיטליים, למידה בלחץ, חיים חברתיים, בחירות יומיומיות, פנאי ויצירה, סביבה וחיות, הבית שלי, מרחב ותנועה, מבט קדימה

export function calculateScore(a, b) {
  let score = 0;
  let reasons = [];

  // === תחומי עניין (30 נקודות מקס) ===
  if (a.mainDomain === b.mainDomain) {
    score += 20;
    reasons.push(`שתיכן בחרתן ב"${a.mainDomain}" כתחום עיקרי`);
  }
  
  if (a.mainDomain === b.secondDomain && b.secondDomain !== "אני מעדיפה להתמקד בתחום אחד") {
    score += 5;
    reasons.push(`התחום העיקרי שלך מעניין גם את השותפה`);
  }
  if (b.mainDomain === a.secondDomain && a.secondDomain !== "אני מעדיפה להתמקד בתחום אחד") {
    score += 5;
    reasons.push(`התחום העיקרי של השותפה מעניין גם אותך`);
  }
  
  if (a.secondDomain === b.secondDomain && 
      a.secondDomain !== "אני מעדיפה להתמקד בתחום אחד") {
    score += 5;
    reasons.push(`שתיכן מתעניינות גם ב"${a.secondDomain}"`);
  }

  // === תחומי חיים (lifeInterest) - 15 נקודות ===
  if (a.lifeInterest && b.lifeInterest && a.lifeInterest === b.lifeInterest) {
    score += 15;
    reasons.push(`שתיכן מתעניינות באותו תוכן ביום-יום`);
  }

  // === סגנון עבודה (25 נקודות מקס) ===
  
  // workStyle - התנסות vs תכנון
  if (a.workStyle === b.workStyle) {
    score += 8;
    reasons.push(`סגנון עבודה דומה במשימות חדשות`);
  }
  
  // teamStyle - חשיבה בקול vs עבודה בשקט
  if (a.teamStyle === b.teamStyle) {
    score += 7;
    reasons.push(`אותה העדפה לעבודה משותפת`);
  }
  
  // workPace - קצב עבודה
  if (a.workPace === b.workPace) {
    score += 10;
    reasons.push(`קצב עבודה תואם`);
  } else if (a.workPace === "תלוי במשימה – גמישה" || b.workPace === "תלוי במשימה – גמישה") {
    score += 5;
    reasons.push(`אחת מכן גמישה בקצב`);
  }

  // === תפקיד בצוות ומוטיבציה (20 נקודות מקס) ===
  
  // teamRole - תפקידים משלימים עדיפים
  const complementaryRoles = {
    "למצוא רעיונות מקוריים ולהתחיל דברים חדשים": "לארגן משימות ולוודא שהכול זורם בזמן",
    "לארגן משימות ולוודא שהכול זורם בזמן": "למצוא רעיונות מקוריים ולהתחיל דברים חדשים",
    "לעזור לאחרות להבין ולהסביר מושגים מורכבים": "לפתור בעיות טכניות כשמשהו תקוע",
    "לפתור בעיות טכניות כשמשהו תקוע": "לעזור לאחרות להבין ולהסביר מושגים מורכבים"
  };
  
  if (complementaryRoles[a.teamRole] === b.teamRole) {
    score += 12;
    reasons.push(`תפקידים משלימים בצוות`);
  } else if (a.teamRole === b.teamRole) {
    score += 6;
    reasons.push(`אותו תפקיד מועדף בצוות`);
  }
  
  // motivationSource
  if (a.motivationSource === b.motivationSource) {
    score += 8;
    reasons.push(`אותו מקור מוטיבציה`);
  }

  // === תקשורת ומתח (20 נקודות מקס) ===
  
  // pressureResponse
  if (a.pressureResponse === b.pressureResponse) {
    score += 7;
    reasons.push(`מגיבות דומה ללחץ`);
  }
  
  // conflictStyle
  if (a.conflictStyle === b.conflictStyle) {
    score += 6;
    reasons.push(`סגנון דומה בפתרון מחלוקות`);
  } else if (a.conflictStyle === "מחפשת פשרה" || b.conflictStyle === "מחפשת פשרה") {
    score += 3;
    reasons.push(`אחת מכן מחפשת פשרה`);
  }
  
  // communicationStyle
  if (a.communicationStyle === b.communicationStyle) {
    score += 7;
    reasons.push(`אותה העדפת תקשורת`);
  } else if (a.communicationStyle === "גמישה" || b.communicationStyle === "גמישה") {
    score += 4;
    reasons.push(`אחת מכן גמישה בתקשורת`);
  }

  // === מכפיל חשיבות ===
  let importanceMultiplier = 1;
  if (a.importanceLevel === "מאוד חשוב – רוצה התאמה הכי טובה") {
    importanceMultiplier += 0.1;
  }
  if (b.importanceLevel === "מאוד חשוב – רוצה התאמה הכי טובה") {
    importanceMultiplier += 0.1;
  }
  
  score = Math.round(score * importanceMultiplier);

  return {
    score,
    reasons,
    maxPossible: 110
  };
}

// אלגוריתם חמדני למציאת הזוגות הטובים ביותר
export function pickBestPairs(students) {
  if (!students || students.length < 2) {
    return { pairs: [], leftover: students || [] };
  }

  let available = [...students];
  let pairs = [];
  
  while (available.length > 1) {
    let bestPair = { i: -1, j: -1, scoreData: { score: -Infinity } };
    
    // מציאת הזוג עם הניקוד הגבוה ביותר
    for (let i = 0; i < available.length; i++) {
      for (let j = i + 1; j < available.length; j++) {
        const scoreData = calculateScore(available[i], available[j]);
        if (scoreData.score > bestPair.scoreData.score) {
          bestPair = { i, j, scoreData };
        }
      }
    }
    
    if (bestPair.i !== -1) {
      pairs.push({
        id: crypto.randomUUID(),
        members: [available[bestPair.i].id, available[bestPair.j].id],
        memberNames: [
          available[bestPair.i].displayName || 'משתתפת',
          available[bestPair.j].displayName || 'משתתפת'
        ],
        memberData: [available[bestPair.i], available[bestPair.j]],
        score: bestPair.scoreData.score,
        reasons: bestPair.scoreData.reasons,
        createdAt: Date.now()
      });
      
      // הסרת המשתתפות שזווגו
      available = available.filter((_, idx) => 
        idx !== bestPair.i && idx !== bestPair.j
      );
    } else {
      break;
    }
  }
  
  return { pairs, leftover: available };
}

// טיפול בשאריות - יצירת שלשות אם יש מספר אי-זוגי
export function handleLeftovers(pairs, leftover) {
  if (leftover.length === 0) {
    return pairs;
  }
  
  if (leftover.length === 1 && pairs.length > 0) {
    // מציאת הזוג הכי מתאים להפוך לשלשה
    let bestPairIndex = -1;
    let bestExtraScore = -Infinity;
    
    const singleStudent = leftover[0];
    
    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      const scoreA = calculateScore(singleStudent, pair.memberData[0]);
      const scoreB = calculateScore(singleStudent, pair.memberData[1]);
      const avgScore = (scoreA.score + scoreB.score) / 2;
      
      if (avgScore > bestExtraScore) {
        bestExtraScore = avgScore;
        bestPairIndex = i;
      }
    }
    
    if (bestPairIndex !== -1) {
      // הפיכת הזוג לשלשה
      const pair = pairs[bestPairIndex];
      pair.members.push(singleStudent.id);
      pair.memberNames.push(singleStudent.displayName || 'משתתפת');
      pair.memberData.push(singleStudent);
      pair.isTriple = true;
      pair.reasons.push(`שלשה נוצרה להתאמה מיטבית`);
    }
  }
  
  return pairs;
}

// פונקציה ראשית ליצירת זיווגים
export function generatePairs(responses) {
  if (!responses || responses.length === 0) {
    return [];
  }
  
  if (responses.length === 1) {
    return [{
      id: crypto.randomUUID(),
      members: [responses[0].id],
      memberNames: [responses[0].displayName || 'משתתפת'],
      memberData: [responses[0]],
      score: 0,
      reasons: ['משתתפת יחידה - ממתינה לשותפות'],
      isSingle: true,
      createdAt: Date.now()
    }];
  }
  
  const { pairs, leftover } = pickBestPairs(responses);
  const finalPairs = handleLeftovers(pairs, leftover);
  
  // מיון לפי ניקוד (הגבוה ביותר ראשון)
  finalPairs.sort((a, b) => b.score - a.score);
  
  return finalPairs;
}

// פונקציה לקבלת סטטיסטיקות
export function getPairingStats(pairs) {
  if (!pairs || pairs.length === 0) {
    return { total: 0, pairs: 0, triples: 0, singles: 0, avgScore: 0 };
  }
  
  const pairsCount = pairs.filter(p => !p.isTriple && !p.isSingle).length;
  const triplesCount = pairs.filter(p => p.isTriple).length;
  const singlesCount = pairs.filter(p => p.isSingle).length;
  const scores = pairs.filter(p => !p.isSingle).map(p => p.score);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  
  return {
    total: pairs.length,
    pairs: pairsCount,
    triples: triplesCount,
    singles: singlesCount,
    avgScore,
    participants: pairsCount * 2 + triplesCount * 3 + singlesCount
  };
}

// אלגוריתם חישוב ניקוד זיווג
export function calculateScore(a, b) {
  let score = 0;
  let reasons = [];

  // תחומי עניין (30 נקודות מקס)
  if (a.mainDomain === b.mainDomain) {
    score += 15;
    reasons.push(`שתיכן בחרתן ב${a.mainDomain} כתחום עיקרי`);
  }
  
  if (a.mainDomain === b.secondDomain && b.secondDomain !== "אני מעדיפה להתמקד בתחום אחד") {
    score += 8;
    reasons.push(`${b.displayName || 'השותפה'} מתעניינת גם ב${a.mainDomain}`);
  }
  if (b.mainDomain === a.secondDomain && a.secondDomain !== "אני מעדיפה להתמקד בתחום אחד") {
    score += 8;
    reasons.push(`${a.displayName || 'את'} מתעניינת גם ב${b.mainDomain}`);
  }
  
  if (a.secondDomain === b.secondDomain && 
      a.secondDomain !== "אני מעדיפה להתמקד בתחום אחד") {
    score += 5;
  }
  
  if (a.secondDomain === "אני מעדיפה להתמקד בתחום אחד" && 
      b.secondDomain === "אני מעדיפה להתמקד בתחום אחד") {
    score += 3;
  }

  // סגנון עבודה (25 נקודות מקס)
  if (a.workStyle !== b.workStyle) {
    score += 8;
    reasons.push('סגנונות עבודה משלימים');
  } else {
    score += 2;
  }
  
  if (a.teamStyle !== b.teamStyle) {
    score += 7;
    reasons.push('איזון מצוין בתקשורת');
  } else {
    score += 3;
  }
  
  if (a.workPace === b.workPace && a.workPace !== "תלוי במשימה - אני גמישה") {
    score += 5;
  } else if (a.workPace === "תלוי במשימה - אני גמישה" || 
             b.workPace === "תלוי במשימה - אני גמישה") {
    if (a.workPace === "תלוי במשימה - אני גמישה" && 
        b.workPace === "תלוי במשימה - אני גמישה") {
      score += 8;
      reasons.push('שתיכן גמישות בקצב העבודה');
    } else {
      score += 6;
    }
  } else if ((a.workPace === "אני אוהבת לעבוד מהר ולסיים מוקדם" && 
              b.workPace === "אני מעדיפה לקחת זמן ולעשות בדיוק") ||
             (b.workPace === "אני אוהבת לעבוד מהר ולסיים מוקדם" && 
              a.workPace === "אני מעדיפה לקחת זמן ולעשות בדיוק")) {
    score -= 3;
  }

  // תפקיד בצוות (20 נקודות מקס)
  if (a.teamRole !== b.teamRole) {
    score += 7;
    
    if ((a.teamRole === "למצוא רעיונות מקוריים ולהתחיל דברים חדשים" && 
         b.teamRole === "לארגן משימות ולוודא שהכל זורם בזמן") ||
        (b.teamRole === "למצוא רעיונות מקוריים ולהתחיל דברים חדשים" && 
         a.teamRole === "לארגן משימות ולוודא שהכל זורם בזמן")) {
      score += 2;
      reasons.push('קומבינציה מושלמת: רעיונות + ארגון');
    }
    
    if ((a.teamRole === "לעזור לאחרות להבין ולהסביר מושגים מורכבים" && 
         b.teamRole === "לפתור בעיות טכניות כשמשהו תקוע") ||
        (b.teamRole === "לעזור לאחרות להבין ולהסביר מושגים מורכבים" && 
         a.teamRole === "לפתור בעיות טכניות כשמשהו תקוע")) {
      score += 1;
    }
  } else {
    score += 2;
  }
  
  if (a.motivationSource === b.motivationSource) {
    score += 6;
    reasons.push('אותה מוטיבציה מניעה את שתיכן');
  } else {
    score += 3;
    
    if ((a.motivationSource === "תחושת משמעות - שאני עושה משהו חשוב" && 
         b.motivationSource === "עבודת צוות - החיבור עם האנשים") ||
        (b.motivationSource === "תחושת משמעות - שאני עושה משהו חשוב" && 
         a.motivationSource === "עבודת צוות - החיבור עם האנשים")) {
      score += 2;
    }
    
    if ((a.motivationSource === "אתגר אינטלקטואלי - פתרון בעיות מורכבות" && 
         b.motivationSource === "התוצאה הסופית - לראות את המוצר מוכן") ||
        (b.motivationSource === "אתגר אינטלקטואלי - פתרון בעיות מורכבות" && 
         a.motivationSource === "התוצאה הסופית - לראות את המוצר מוכן")) {
      score += 1;
    }
  }

  // תקשורת ומתח (25 נקודות מקס)
  if ((a.pressureResponse === "אני פועלת הכי טוב תחת לחץ - זה מניע אותי" && 
       b.pressureResponse === "אני צריכה לתכנן מראש כדי למנוע לחץ") ||
      (b.pressureResponse === "אני פועלת הכי טוב תחת לחץ - זה מניע אותי" && 
       a.pressureResponse === "אני צריכה לתכנן מראש כדי למנוע לחץ")) {
    score += 9;
    reasons.push('איזון מושלם בניהול לחץ');
  } else if ((a.pressureResponse === "אני פועלת הכי טוב תחת לחץ - זה מניע אותי" && 
              b.pressureResponse === "אני לוקחת הפסקה קצרה ואז חוזרת בכוח") ||
             (b.pressureResponse === "אני פועלת הכי טוב תחת לחץ - זה מניע אותי" && 
              a.pressureResponse === "אני לוקחת הפסקה קצרה ואז חוזרת בכוח")) {
    score += 6;
  } else if ((a.pressureResponse === "אני צריכה לתכנן מראש כדי למנוע לחץ" && 
              b.pressureResponse === "אני לוקחת הפסקה קצרה ואז חוזרת בכוח") ||
             (b.pressureResponse === "אני צריכה לתכנן מראש כדי למנוע לחץ" && 
              a.pressureResponse === "אני לוקחת הפסקה קצרה ואז חוזרת בכוח")) {
    score += 7;
  } else {
    score += 4;
  }
  
  if ((a.conflictStyle === "עוצרת ומנסה להבין לעומק את הצד השני" && 
       b.conflictStyle === "מציגה את העמדה שלי בבירור ומנסה לשכנע") ||
      (b.conflictStyle === "עוצרת ומנסה להבין לעומק את הצד השני" && 
       a.conflictStyle === "מציגה את העמדה שלי בבירור ומנסה לשכנע")) {
    score += 8;
    reasons.push('שילוב מעולה: אחת מקשיבה ואחת מובילה');
  } else if (a.conflictStyle === "מחפשת פשרה שמשלבת את שני הצדדים" || 
             b.conflictStyle === "מחפשת פשרה שמשלבת את שני הצדדים") {
    if (a.conflictStyle === b.conflictStyle) {
      score += 9;
      reasons.push('שתיכן מחפשות פשרות');
    } else {
      score += 7;
    }
  } else if (a.conflictStyle === b.conflictStyle && 
             a.conflictStyle === "מציגה את העמדה שלי בבירור ומנסה לשכנע") {
    score += 1;
  } else {
    score += 5;
  }
  
  if (a.communicationStyle === b.communicationStyle && 
      a.communicationStyle !== "לא משנה לי - אני גמישה") {
    score += 8;
    reasons.push('אותו סגנון תקשורת מועדף');
  } else if (a.communicationStyle === "לא משנה לי - אני גמישה" || 
             b.communicationStyle === "לא משנה לי - אני גמישה") {
    score += 7;
  } else {
    score += 2;
  }

  // תחומי עניין אישיים (10 נקודות מקס)
  if (a.lifeInterest === b.lifeInterest) {
    score += 4;
  } else {
    score += 1;
    
    if ((a.lifeInterest === "טכנולוגיה, אפליקציות וחדשנות" && 
         b.lifeInterest === "אנשים, פסיכולוגיה והשפעה חברתית") ||
        (b.lifeInterest === "טכנולוגיה, אפליקציות וחדשנות" && 
         a.lifeInterest === "אנשים, פסיכולוגיה והשפעה חברתית")) {
      score += 1;
    }
  }

  // כפל לפי חשיבות
  let multiplier = 1;
  if (a.importanceLevel === "מאוד חשוב - אני רוצה התאמה הכי טובה" ||
      b.importanceLevel === "מאוד חשוב - אני רוצה התאמה הכי טובה") {
    multiplier = 1.3;
  }
  
  score = score * multiplier;

  // רעש קטן לשבירת שוויון
  const nameKey = (a.displayName + '|' + b.displayName)
    .split('')
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  score += (nameKey % 7) * 0.01;

  return { score: Math.round(score * 100) / 100, reasons };
}

// בחירת זוגות אופטימליים
export function pickBestPairs(students) {
  let available = [...students];
  let pairs = [];
  
  while (available.length > 1) {
    let bestPair = { i: -1, j: -1, scoreData: { score: -Infinity } };
    
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
        a: available[bestPair.i],
        b: available[bestPair.j],
        scoreData: bestPair.scoreData
      });
      
      available = available.filter((_, idx) => 
        idx !== bestPair.i && idx !== bestPair.j
      );
    }
  }

  // טיפול בשלשה
  let trio = null;
  if (available.length === 1 && pairs.length > 0) {
    const lone = available[0];
    let bestTrioIdx = 0;
    let bestTrioScore = -Infinity;
    
    for (let k = 0; k < pairs.length; k++) {
      const score1 = calculateScore(lone, pairs[k].a).score;
      const score2 = calculateScore(lone, pairs[k].b).score;
      const totalScore = score1 + score2;
      
      if (totalScore > bestTrioScore) {
        bestTrioScore = totalScore;
        bestTrioIdx = k;
      }
    }
    
    trio = { lone, withPairIndex: bestTrioIdx };
  }

  return { pairs, trio };
}

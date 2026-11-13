import { questions } from './questions.mjs';

export function validName(value, max = 100) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[<>\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(value);
}
export function validatedAnswers(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('invalid_answers');
  const result = {};
  for (const q of questions) {
    if (!q.options.length) {
      if (!validName(input[q.field])) throw new Error('invalid_answers');
      result[q.field] = input[q.field].trim();
    } else {
      const option = q.options.find(o => o.code === input[q.field + 'Code'] && o.label === input[q.field]);
      if (!option) throw new Error('invalid_answers');
      result[q.field] = option.label;
      result[q.field + 'Code'] = option.code;
    }
  }
  return result;
}
export function partition(groups, ids) {
  if (!Array.isArray(groups) || !Array.isArray(ids) || ids.length < 2 || groups.length < 1) throw new Error('invalid_groups');
  const expected = new Set(ids), seen = new Set();
  if (expected.size !== ids.length) throw new Error('invalid_groups');
  const result = groups.map((group, index) => {
    if (!Array.isArray(group.members) || group.members.length < 2 || group.members.length > 4) throw new Error('invalid_groups');
    for (const id of group.members) {
      if (!expected.has(id) || seen.has(id)) throw new Error('invalid_groups');
      seen.add(id);
    }
    return { groupNumber: index + 1, members: [...group.members] };
  });
  if (seen.size !== expected.size) throw new Error('invalid_groups');
  return result;
}
export function personalProjection(data) {
  return {
    room: { id: data.room.id, phase: data.room.phase, topic: data.room.topic },
    participant: { id: data.participant.id, name: data.participant.name, completed: data.participant.completed },
    group: data.group ? { groupNumber: data.group.groupNumber, memberNames: data.group.memberNames } : null,
  };
}
export function fileName(snapshot) {
  const clean = s => String(s).replace(/[\/\\:*?"<>|\u0000-\u001f]/g, ' ').trim();
  return `פורצות דרך_${clean(snapshot.school)}_${clean(snapshot.class_name)}_${snapshot.activity_date}.pdf`;
}

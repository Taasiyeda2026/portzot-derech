export function hasValue(values, key) {
  return Boolean((values[key] || '').trim());
}

export function findMissingRequired({ values, requiredTextKeys, requiredListKeys, getListRowIds, labelByKey }) {
  const missing = [];

  requiredTextKeys.forEach((key) => {
    if (!hasValue(values, key)) {
      missing.push(labelByKey[key] || key);
    }
  });

  requiredListKeys.forEach((fieldId) => {
    const hasOne = getListRowIds(fieldId).some((rowId) => hasValue(values, rowId));
    if (!hasOne) missing.push(labelByKey[fieldId] || fieldId);
  });

  return missing;
}

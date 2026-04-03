export function normalizeSortStep(step) {
  if (!step || typeof step !== 'object') {
    return {
      kind: 'unknown',
      rawType: '',
      indices: [],
      label: '',
      context: '',
      meta: {},
      raw: step,
    };
  }

  const indices = Array.isArray(step.indices)
    ? step.indices.filter((value) => Number.isInteger(value))
    : Number.isInteger(step.index)
      ? [step.index]
      : [];

  const label = typeof step.label === 'string' ? step.label : '';
  const context = typeof step.context === 'string' ? step.context : '';
  const meta = step.meta && typeof step.meta === 'object' ? step.meta : {};
  const rawType = typeof step.type === 'string' ? step.type : '';

  let kind = 'unknown';
  if (rawType === 'phase') kind = 'phase';
  else if (rawType === 'swap') kind = 'move';
  else if (rawType === 'write') kind = 'move';
  else if (rawType === 'compare') kind = 'focus';
  else if (rawType === 'focus') kind = 'focus';

  return {
    kind,
    rawType,
    indices,
    label,
    context,
    meta,
    raw: step,
  };
}

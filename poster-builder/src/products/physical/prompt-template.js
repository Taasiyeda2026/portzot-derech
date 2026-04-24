import { buildPhysicalPrompts } from '../../shared/prompt-builder.js';
import { getVisualSlots } from './config.js';

export function buildPhysicalPromptTemplate({ contentValues, promptAnswers, posterSize }) {
  return buildPhysicalPrompts({ contentValues, promptAnswers, posterSize, getVisualSlots });
}

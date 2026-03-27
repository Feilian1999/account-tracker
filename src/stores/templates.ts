import type { Ref } from "vue";
import type { RecordTemplate } from "./types";

/**
 * Record template CRUD actions.
 */
export function setupTemplateActions(
  recordTemplates: Ref<RecordTemplate[]>,
  save: () => void
) {
  const addTemplate = (template: Omit<RecordTemplate, "id">) => {
    recordTemplates.value.push({ ...template, id: crypto.randomUUID() });
    save();
  };

  const updateTemplate = (id: string, updates: Partial<RecordTemplate>) => {
    const idx = recordTemplates.value.findIndex((t) => t.id === id);
    if (idx !== -1) {
      recordTemplates.value[idx] = { ...recordTemplates.value[idx], ...updates };
      save();
    }
  };

  const deleteTemplate = (id: string) => {
    recordTemplates.value = recordTemplates.value.filter((t) => t.id !== id);
    save();
  };

  return { addTemplate, updateTemplate, deleteTemplate };
}

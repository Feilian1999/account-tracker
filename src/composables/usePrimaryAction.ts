import { onMounted, onUnmounted, type Ref } from "vue";

type Entry = { isActive: Ref<boolean>; run: () => void; priority: number };

const stack: Entry[] = [];

export function runPrimaryAction(minimumPriority = 0) {
  let entry: Entry | undefined;
  for (const candidate of stack) {
    if (
      candidate.isActive.value &&
      candidate.priority >= minimumPriority &&
      (!entry || candidate.priority >= entry.priority)
    ) {
      entry = candidate;
    }
  }
  entry?.run();
  return entry !== undefined;
}

export function usePrimaryAction(
  isActive: Ref<boolean>,
  run: () => void,
  priority = 0,
) {
  const entry = { isActive, run, priority };

  onMounted(() => stack.push(entry));
  onUnmounted(() => stack.splice(stack.indexOf(entry), 1));
}

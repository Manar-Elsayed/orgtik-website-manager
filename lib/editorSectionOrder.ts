import managerPages from "./manager-pages.json";
import sectionMap from "./cms-sections.json";

/** Match page navigation to its website sections without changing any stored content. */
export function orderEditorSections<T extends { value: string }>(
  entryId: string,
  sections: readonly T[],
  savedOrder: readonly string[] = [],
): T[] {
  const items = new Map<string, T>();
  for (const section of sections) {
    if (!items.has(section.value)) items.set(section.value, section);
  }
  const editor = (managerPages as Record<string, { editor: string[] }>)[entryId]
    ?.editor;
  const body =
    (sectionMap as Record<string, { body: string[] }>)[entryId]?.body ?? [];
  const baseline = [...new Set([...(editor ?? body), ...items.keys()])].filter(
    (key) => items.has(key) && key !== "seo",
  );
  let ordered = baseline;
  if (savedOrder.some((key) => body.includes(key))) {
    const bodyOrder = [
      ...new Set([...savedOrder.filter((key) => body.includes(key)), ...body]),
    ];
    const groups = new Map<string, string[]>();
    const before: string[] = [];
    const after: string[] = [];
    let parent: string | undefined;
    for (const key of baseline) {
      if (body.includes(key)) {
        parent = key;
        groups.set(key, [key]);
      } else if (editor?.includes(key)) {
        // For example, the changing headline stays beside Home's main banner.
        if (parent) groups.get(parent)!.push(key);
        else before.push(key);
      } else {
        // Cursor settings, retained copy and future tabs are outside the page body.
        after.push(key);
      }
    }
    ordered = [
      ...before,
      ...bodyOrder.flatMap((key) => groups.get(key) ?? []),
      ...after,
    ];
  }
  if (items.has("seo")) ordered.push("seo");
  return ordered.map((key) => items.get(key)!);
}

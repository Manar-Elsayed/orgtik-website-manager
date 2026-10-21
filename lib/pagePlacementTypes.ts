/** Editor guidance only. Keys continue to identify the original saved content. */
export type PageFieldPlacement = {
  /** Message key in PagePlacement. */
  label: string;
  hint?: string;
  state?: "unused" | "conditional" | "assistive" | "review";
};

export type PageSectionPlacement = {
  /** Stable names describe website locations rather than the current editable sentence. */
  title: string;
  where: string;
  /** Original record id and full storage path, e.g. st_services.b1.s10 or pg_home.hero.div. */
  fields?: Record<string, PageFieldPlacement>;
  /** False when the current preview cannot guarantee this particular website state or branch. */
  preview?: false;
  /** A current website marker/container. No selectors or fabricated record addresses. */
  previewTarget?: string;
};

export type PagePlacementMap = Record<
  string,
  Record<string, PageSectionPlacement>
>;

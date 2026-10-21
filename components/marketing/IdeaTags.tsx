"use client";
import { Badge } from "@orgtik/ui";

export const IDEA_CATEGORIES = [
  "new_project",
  "product_idea",
  "service_improvement",
  "hosting_support",
] as const;

export function IdeaTags({ tags, empty }: { tags: string[]; empty: string }) {
  return tags.length ? (
    <span className="flex max-w-72 flex-wrap gap-1">
      {tags.map((tag) => (
        <Badge key={tag} size="sm" title={tag} className="min-w-0 max-w-full">
          {tag}
        </Badge>
      ))}
    </span>
  ) : (
    <span className="text-body-sm text-fg-muted">{empty}</span>
  );
}

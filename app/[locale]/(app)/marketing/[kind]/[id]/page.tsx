"use client";
import { notFound, useParams, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Breadcrumb } from "@orgtik/ui";
import { RequirePermission } from "@/components/frame/RequirePermission";
import { LeadDetail } from "@/components/marketing/LeadDetail";
import { IdeaDetail } from "@/components/marketing/IdeaDetail";
import { safeReturn } from "@/lib/useListState";
import { useIdeaQuery, useLeadQuery } from "@/store/api";
export default function MarketingDetailPage() {
  const { kind, id } = useParams<{ kind: string; id: string }>();
  const params = useSearchParams();
  const t = useTranslations("Nav");
  const tl = useTranslations("Leads");
  const uiLocale = useLocale();
  // The same "List > Item" breadcrumb as the content editors; the name comes from the detail's query.
  const lead = useLeadQuery(id, { skip: kind !== "leads" });
  const idea = useIdeaQuery(id, { skip: kind !== "ideas" });
  if (kind !== "leads" && kind !== "ideas") notFound();
  const name = kind === "leads" ? (lead.data ? (lead.data.erased ? tl("erasedName") : lead.data.name) : null) : idea.data?.title;
  return (
    <RequirePermission permission="marketing:view">
      <div className="flex flex-col gap-5">
        <Breadcrumb
          items={[
            { label: t(kind), href: `/${uiLocale}${safeReturn(params.get("returnTo"), `/marketing/${kind}`)}` },
            ...(name ? [{ label: <span dir="auto">{name}</span> }] : []),
          ]}
        />
        {kind === "leads" ? <LeadDetail id={id} /> : <IdeaDetail id={id} />}
      </div>
    </RequirePermission>
  );
}

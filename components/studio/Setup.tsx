"use client";
import { useTranslations } from "next-intl";
import { Button, OnboardingChecklist } from "@orgtik/ui";
import { useRouter } from "@/i18n/routing";
import { useStudio,useStudioAction } from "@/lib/studio";
import { StudioFeedback } from "./StudioUI";
type SetupData={dismissed:boolean;checks:{id:string;complete:boolean}[];canEdit:boolean};
export function Setup() {
  const t = useTranslations("WmV3"), router = useRouter();
  const resource = useStudio<SetupData>("/studio/setup"), action = useStudioAction(), data = resource.data;
  if (!data) return null;
  const destinations: Record<string, string> = {content:"/content/pages", media:"/media", review:"/releases"};
  return <div className="flex flex-col gap-4">
    <StudioFeedback action={action} onRetry={resource.reload} />
    {!data.dismissed ? <>
      <OnboardingChecklist title={t("setup")} steps={data.checks.filter(row=>Object.hasOwn(destinations,row.id)).map(row=>({id:row.id,title:t("setupStep."+row.id),description:t("setupHint."+row.id),complete:row.complete,onSelect:()=>router.push(destinations[row.id])}))} />
      {!data.canEdit ? <p className="text-body-sm text-fg-muted">{t("viewOnly")}</p> : null}
    </> : null}
    <Button className="self-start" variant="ghost" size="sm" loading={action.busy} disabled={Boolean(action.pending)} onClick={()=>void action.run("/studio/setup",{dismissed:!data.dismissed}).then(resource.reload).catch(()=>{})}>
      {t(data.dismissed ? "showSetup" : "dismissSetup")}
    </Button>
  </div>;
}

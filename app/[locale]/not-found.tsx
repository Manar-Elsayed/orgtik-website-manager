"use client";
import { ErrorState, suiteText } from "@orgtik/ui";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
export default function NotFound(){const locale=useLocale();return <ErrorState titleAs="h1" action={<Link href="/" className="font-semibold text-fg-brand underline">{suiteText(locale as "en"|"ar"|"de"|"fr"|"it", "home")}</Link>}/>;}

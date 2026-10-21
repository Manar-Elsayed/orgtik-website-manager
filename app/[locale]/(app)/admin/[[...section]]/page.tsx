import { notFound } from "next/navigation";
import { redirect } from "@/i18n/routing";

const destinations: Record<string, string> = {
  overview: "/",
  members: "/settings/users",
  roles: "/settings/roles",
  settings: "/settings/site",
  connections: "/settings/site",
  "import-export": "/media",
  audit: "/settings/audit",
  billing: "/catalog/software",
};

export default async function Page({ params }: { params: Promise<{ locale: string; section?: string[] }> }) {
  const { locale, section } = await params;
  const destination = destinations[section?.[0] ?? "overview"];
  if ((section?.length ?? 0) > 1 || !destination) notFound();
  redirect({ href: destination, locale });
}

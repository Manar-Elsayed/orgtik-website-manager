"use client";
import {useMemo, useState} from "react";
import {useLocale,useTranslations} from "next-intl";
import {Badge,Button,Input,PageHeader,Select,buttonVariants,useFormatter} from "@orgtik/ui";
import {MagnifyingGlass} from "@phosphor-icons/react";
import {DataTable, type ColumnDef} from "@orgtik/ui/table";
import {useStudio,type CatalogItem,type CatalogMirror as Mirror} from "@/lib/studio";
import {StudioState} from "./StudioUI";
const normalize = (value: string) => value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();

export function CatalogMirror({kind}: {kind: "service" | "software"}) {
  const t = useTranslations("WmV3"), fields = useTranslations("Fields"), improvements = useTranslations("Improvements");
  const locale = useLocale(), f = useFormatter();
  const [country, setCountry] = useState("CH"), [search, setSearch] = useState("");
  const resource = useStudio<Mirror>("/catalog?country=" + country), data = resource.data;
  const items = useMemo(() => (data?.items ?? []).filter(row => row.kind === kind), [data, kind]);
  if (!data) return <StudioState resource={resource} />;

  const title = t(kind === "service" ? "serviceCatalog" : "softwareCatalog");
  const searchLabel = t(kind === "service" ? "searchServiceCatalog" : "searchSoftwareCatalog");
  const countryNames = new Intl.DisplayNames([locale], {type: "region"});
  const nameOf = (row: CatalogItem) => typeof row.name === "string" ? row.name : row.name[locale] || row.name.en || row.catalogId;
  const priceOf = (row: CatalogItem) => typeof row.monthlyMinor === "number" ? f.money(row.monthlyMinor / 10 ** data.decimals, data.currency) : t("noPrice");
  const words = normalize(search).trim().split(/\s+/).filter(Boolean);
  const filtered = items.filter(row => {
    const text = normalize([
      nameOf(row), typeof row.name === "string" ? row.name : row.name.en, row.catalogId,
      t(row.managedIn === "crm" ? "managedCRM" : "managedConsole"),
      t(row.publishedAt ? "published" : "unpublished"),
      t(row.available ? "catalogAvailable" : "catalogUnavailable"), priceOf(row),
    ].join(" "));
    return words.every(word => text.includes(word));
  });
  const columns: ColumnDef<CatalogItem>[] = [
    {
      id: "name", header: fields("name"), accessorFn: nameOf, meta: {wrap: true},
      cell: ({row}) => <div className="flex min-w-48 flex-col gap-1 py-2">
        <span dir="auto" className="font-semibold text-fg">{nameOf(row.original)}</span>
        <span dir="ltr" className="text-start font-mono text-caption text-fg-muted">{row.original.catalogId}</span>
      </div>,
    },
    {id: "owner", header: t("catalogOwner"), accessorFn: row => row.managedIn === "crm" ? "CRM" : "Console"},
    {
      id: "publication", header: t("catalogPublication"), accessorFn: row => t(row.publishedAt ? "published" : "unpublished"),
      cell: ({row}) => <Badge tone={row.original.publishedAt ? "success" : "neutral"}>{t(row.original.publishedAt ? "published" : "unpublished")}</Badge>,
    },
    {
      id: "availability", header: t("catalogAvailability"), accessorFn: row => t(row.available ? "catalogAvailable" : "catalogUnavailable"),
      cell: ({row}) => <Badge tone={row.original.available ? "success" : "neutral"}>{t(row.original.available ? "catalogAvailable" : "catalogUnavailable")}</Badge>,
    },
    {
      id: "price", header: fields("monthlyPrice"), accessorFn: row => typeof row.monthlyMinor === "number" ? row.monthlyMinor : undefined,
      meta: {numeric: true}, cell: ({row}) => priceOf(row.original),
    },
    {
      id: "actions", header: improvements("actions"), enableSorting: false,
      cell: ({row}) => row.original.launch.canOpen && row.original.launch.url ?
        <a href={row.original.launch.url} className={buttonVariants({variant: "secondary", size: "sm"})}>{t(row.original.managedIn === "crm" ? "openCRM" : "openConsole")}</a> :
        <span className="text-body-sm text-fg-muted">{t("ownerAccessRequired")}</span>,
    },
  ];

  return <div className="flex min-w-0 flex-col gap-6">
    <PageHeader title={title} description={t("catalogReadOnly")} />
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_16rem]">
      <Input type="search" aria-label={searchLabel} value={search} onChange={event => setSearch(event.target.value)} placeholder={searchLabel} startIcon={<MagnifyingGlass />} />
      <Select label={t("country")} value={country} onValueChange={value => setCountry(value || "CH")} options={data.countries.map(value => ({value, label: countryNames.of(value) ?? value}))} />
    </div>
    <DataTable label={title} columns={columns} data={filtered} getRowId={row => row.id} paginate={false}
      empty={words.length ? {title: t("catalogNoMatch"), description: t("catalogNoMatchBody"), action: <Button variant="secondary" size="sm" onClick={() => setSearch("")}>{t("catalogClearSearch")}</Button>} : {title: t("noOffers")}} />
  </div>;
}

import { Breadcrumb, cn, type PageHeaderProps } from "@orgtik/ui";

/**
 * The @orgtik/ui page header with one layout rule for the manager: on wide screens the actions stay
 * top-right and a long title wraps onto more lines instead of pushing the actions below it.
 * Narrow screens keep the stacked layout.
 */
export function PageHeader({ title, description, breadcrumb, status, meta, tabs, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-3", className)}>
      {breadcrumb?.length ? <Breadcrumb items={breadcrumb} /> : null}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 lg:flex-nowrap">
        <div className="flex min-w-0 flex-col gap-1.5 lg:min-w-60 lg:flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="min-w-0 font-display text-title-lg text-fg [overflow-wrap:anywhere]">{title}</h1>
            {status}
          </div>
          {description ? <p className="max-w-[70ch] text-body text-fg-muted">{description}</p> : null}
          {meta ? <div className="flex flex-wrap items-center gap-3 text-caption text-fg-subtle">{meta}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2 lg:min-w-0 lg:justify-end">{actions}</div> : null}
      </div>
      {tabs}
    </header>
  );
}

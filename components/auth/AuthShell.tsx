import type { ReactNode } from "react";
import { Logo } from "@orgtik/ui";

// Signing in looks like the website's account page: a lilac page with a soft plum glow and one
// large, rounded card. Always light, like the website, whatever theme the dashboard uses.
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main
      data-theme="light"
      className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-12 text-(--ot-color-plum-950)"
      style={{ background: "radial-gradient(70% 60% at 100% 0%, #9458F424, transparent 70%), #EEE8F7" }}
    >
      <Logo variant="wordmark" className="h-7 text-(--ot-color-plum-950)" />
      <div className="w-full max-w-[520px] rounded-[28px] border border-[#190B2514] bg-[#FFFFFFc7] p-[clamp(26px,3vw,44px)] shadow-[0_30px_70px_#190B2514]">{children}</div>
    </main>
  );
}

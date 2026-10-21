import {RequirePermission} from "@/components/frame/RequirePermission";
import {CatalogMirror} from "@/components/studio/CatalogMirror";
export default function Page(){return <RequirePermission permission="content:view"><CatalogMirror kind="software"/></RequirePermission>;}

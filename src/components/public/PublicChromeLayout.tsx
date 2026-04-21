import { Outlet } from "react-router-dom";

import { PublicStickyHeader } from "@/components/public/PublicStickyHeader";

export function PublicChromeLayout() {
  return (
    <>
      <PublicStickyHeader />
      <Outlet />
    </>
  );
}

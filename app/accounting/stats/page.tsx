"use client";

import dynamic from "next/dynamic";

const StatsPage = dynamic(() => import("@/components/StatsPage"), { ssr: false });

export default function AccountingStatsRoute() {
  return <StatsPage />;
}

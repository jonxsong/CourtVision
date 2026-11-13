import { Suspense } from "react";
import { LiveGameDetail } from "@/components/live-game-detail";

export const metadata = { title: "Live NBA Game" };

export default function LiveGamePage() {
  return <Suspense fallback={<section className="content-section shell"><div className="empty-state"><div><h2>Loading game…</h2></div></div></section>}><LiveGameDetail /></Suspense>;
}

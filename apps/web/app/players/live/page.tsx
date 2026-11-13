import { Suspense } from "react";
import { LivePlayerProfile } from "@/components/live-player-profile";

export const metadata = { title: "NBA Player Profile" };

export default function LivePlayerPage() {
  return <Suspense fallback={<section className="content-section shell"><div className="empty-state"><div><h2>Loading player…</h2></div></div></section>}><LivePlayerProfile /></Suspense>;
}

"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <div className="error-page shell"><div><span className="kicker">Something broke down</span><h1>The play didn’t finish.</h1><p>Try the request again. No data was changed.</p><Button onClick={reset}>Try again</Button></div></div>; }

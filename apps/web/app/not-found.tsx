import Link from "next/link";
export default function NotFound() { return <div className="error-page shell"><div><span className="kicker">404 · Out of bounds</span><h1>That view isn’t on the floor.</h1><p>The player, game, or analysis could not be found.</p><Link className="button button-primary button-default" href="/">Return home</Link></div></div>; }

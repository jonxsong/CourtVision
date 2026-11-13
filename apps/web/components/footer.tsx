import Link from "next/link";

export function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <Link href="/" className="brand"><span>Court</span><strong>Vision</strong><i /></Link>
        <p>See the game beyond the box score.</p>
      </div>
      <div className="footer-meta">
        <span>Built for transparent basketball analysis.</span>
        <span>Demo fixtures are synthetic and clearly labeled.</span>
      </div>
    </footer>
  );
}

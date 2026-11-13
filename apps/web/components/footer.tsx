import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <Link href="/" className="brand"><Image src="/brand/courtvision-mark.png" alt="" width={30} height={30} /><span>Court</span><strong>Vision</strong><i /></Link>
        <p>See the game beyond the box score.</p>
      </div>
      <div className="footer-meta">
        <Link href="/operations">Data operations</Link>
        <span>Built for transparent basketball analysis.</span>
        <span>Demo fixtures are synthetic and clearly labeled.</span>
      </div>
    </footer>
  );
}

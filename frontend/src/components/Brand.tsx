import { Link } from "react-router-dom";
import { Music2 } from "lucide-react";

export default function Brand({ className = "brand", to = "/" }: { className?: string; to?: string }) {
  return (
    <Link className={className} to={to} aria-label="Toy Choir TV home">
      <span className="brand-mark"><Music2 size={21} /></span>
      <span>Toy Choir <b>TV</b></span>
    </Link>
  );
}

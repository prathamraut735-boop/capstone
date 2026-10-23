import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="not-found-page">
      <span className="not-found-note">♪</span>
      <p className="eyebrow">PAGE NOT FOUND</p>
      <h1>Oops, we missed a beat!</h1>
      <p>That page isn't part of this demo yet. Let's head back to the music.</p>
      <Link className="button button-pink" to="/"><ArrowLeft size={15} /> Back to home</Link>
    </section>
  );
}

import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

export function RolePageHeading({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return (
    <div className="role-page-heading">
      <div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>
      {children}
    </div>
  );
}

export function DemoNote({ children, tone = "purple" }: { children: ReactNode; tone?: "purple" | "yellow" | "teal" }) {
  return <div className={`role-demo-note role-note-${tone}`}><Sparkles size={17} /><span>{children}</span></div>;
}

export function DataTable({ headers, rows, emptyMessage = "No matching demo records." }: { headers: string[]; rows: ReactNode[][]; emptyMessage?: string }) {
  return (
    <div className="role-table-wrap">
      <table className="role-table">
        <thead><tr>{headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr></thead>
        <tbody>
          {rows.length ? rows.map((row, index) => (
            <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
          )) : <tr><td className="role-table-empty" colSpan={headers.length}>{emptyMessage}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

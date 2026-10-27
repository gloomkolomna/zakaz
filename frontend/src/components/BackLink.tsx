import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export default function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link className="back-link" to={to}>
      <span aria-hidden="true">←</span> {children}
    </Link>
  );
}

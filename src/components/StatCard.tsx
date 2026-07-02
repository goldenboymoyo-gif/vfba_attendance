import { ReactNode } from 'react';

export function StatCard({
  icon,
  value,
  label,
  tint,
}: {
  icon: ReactNode;
  value: number | string;
  label: string;
  tint: { bg: string; color: string };
}) {
  return (
    <div className="card">
      <div
        className="mb-3 flex h-[42px] w-[42px] items-center justify-center rounded-xl"
        style={{ background: tint.bg, color: tint.color }}
      >
        {icon}
      </div>
      <div className="font-display text-[27px] font-bold leading-none">{value}</div>
      <div className="mt-1.5 text-[12.5px] font-semibold text-[var(--text-dim)]">{label}</div>
    </div>
  );
}

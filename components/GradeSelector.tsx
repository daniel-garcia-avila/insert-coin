"use client";

import { GRADE_LABELS, GRADES, type Grade } from "@/lib/types";

interface GradeSelectorProps {
  value: Grade | null;
  suggested: Grade | null;
  disabled?: boolean;
  onChange: (grade: Grade | null) => void;
}

/** Selector del estado de conservación (escala española) marcando la sugerencia de la IA. */
export function GradeSelector({ value, suggested, disabled, onChange }: GradeSelectorProps) {
  return (
    <div>
      <div role="radiogroup" aria-label="Estado de conservación" className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {GRADES.map((grade) => {
          const selected = value === grade;
          return (
            <button
              key={grade}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              title={GRADE_LABELS[grade]}
              onClick={() => onChange(selected ? null : grade)}
              className={`relative rounded-xl border px-2 py-2.5 text-sm font-bold transition disabled:opacity-50 ${
                selected
                  ? "border-gold bg-gold text-gold-contrast"
                  : "border-border bg-surface-2 text-text hover:border-gold/60"
              }`}
            >
              {grade}
              {suggested === grade && (
                <span className="absolute -right-1 -top-1.5 rounded-full bg-cyan px-1 text-[9px] font-bold leading-4 text-black" aria-label="sugerido por la IA">
                  IA
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted">
        {value ? `${value} · ${GRADE_LABELS[value]}` : "Sin indicar"}
        {suggested && value !== suggested && ` — la IA sugiere ${suggested}`}
      </p>
    </div>
  );
}

"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { GradeSelector } from "./GradeSelector";
import { InlineError } from "./States";
import { apiFetch } from "@/lib/api-client";
import { ERA_LABELS, ERAS, type Coin, type CoinStatus, type Era, type Grade } from "@/lib/types";
import { btnPrimary, btnSecondary, card, input } from "@/lib/ui";
import { coinUpdateSchema, type CoinUpdate } from "@/lib/validation";
import { arcadeText } from "@/lib/format";

type TextField =
  | "title" | "country" | "issuer" | "denomination" | "year" | "year_text" | "mint_mark" | "period" | "ruler"
  | "material" | "weight_g" | "diameter_mm" | "km_number" | "description" | "interesting_facts" | "notes" | "quantity";

type FormValues = Record<TextField, string> & { era: Era | ""; grade: Grade | null };

function toFormValues(coin: Coin): FormValues {
  const s = (v: string | number | null) => (v == null ? "" : String(v));
  return {
    title: s(coin.title),
    country: s(coin.country),
    issuer: s(coin.issuer),
    denomination: s(coin.denomination),
    year: s(coin.year),
    year_text: s(coin.year_text),
    mint_mark: s(coin.mint_mark),
    period: s(coin.period),
    ruler: s(coin.ruler),
    material: s(coin.material),
    weight_g: s(coin.weight_g),
    diameter_mm: s(coin.diameter_mm),
    km_number: s(coin.km_number),
    description: s(coin.description),
    interesting_facts: s(coin.interesting_facts),
    notes: s(coin.notes),
    quantity: s(coin.quantity),
    era: coin.era ?? "",
    grade: coin.grade,
  };
}

/** Convierte un texto numérico (admite coma decimal) en número; "" → null; inválido → NaN para que falle la validación. */
function parseNumber(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  return Number(trimmed);
}

function toPayload(values: FormValues, status: CoinStatus): unknown {
  return {
    status,
    title: values.title,
    country: values.country,
    issuer: values.issuer,
    denomination: values.denomination,
    year: parseNumber(values.year),
    year_text: values.year_text,
    mint_mark: values.mint_mark,
    era: values.era || null,
    period: values.period,
    ruler: values.ruler,
    material: values.material,
    weight_g: parseNumber(values.weight_g),
    diameter_mm: parseNumber(values.diameter_mm),
    km_number: values.km_number,
    description: values.description,
    interesting_facts: values.interesting_facts,
    notes: values.notes,
    grade: values.grade,
    quantity: parseNumber(values.quantity) ?? 1,
  };
}

interface CoinFormProps {
  coin: Coin;
  onSaved: (coin: Coin) => void;
  onCancel?: () => void;
}

export function CoinForm({ coin, onSaved, onCancel }: CoinFormProps) {
  const [values, setValues] = useState<FormValues>(() => toFormValues(coin));
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState<CoinStatus | null>(null);

  const isDraft = coin.status === "borrador";

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function save(status: CoinStatus) {
    setFormError(null);
    const parsed = coinUpdateSchema.safeParse(toPayload(values, status));
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      setFormError("Revisa los campos marcados.");
      return;
    }
    if (status === "confirmada" && !parsed.data.title && !parsed.data.denomination) {
      setErrors({ title: "Pon al menos un nombre o el valor facial" });
      setFormError("Revisa los campos marcados.");
      return;
    }

    setSaving(status);
    try {
      const { coin: saved } = await apiFetch<{ coin: Coin }>(`/api/coins/${coin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data satisfies CoinUpdate),
      });
      onSaved(saved);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudieron guardar los cambios.");
    } finally {
      setSaving(null);
    }
  }

  const disabled = saving !== null;
  const field = (name: TextField, label: string, opts: { placeholder?: string; inputMode?: "numeric" | "decimal"; className?: string } = {}) => (
    <Field label={label} error={errors[name]} className={opts.className}>
      <input
        id={`f-${name}`}
        className={input}
        value={values[name]}
        placeholder={opts.placeholder}
        inputMode={opts.inputMode}
        disabled={disabled}
        aria-invalid={Boolean(errors[name])}
        onChange={(e) => set(name, e.target.value)}
      />
    </Field>
  );
  const area = (name: TextField, label: string, placeholder?: string) => (
    <Field label={label} error={errors[name]} className="sm:col-span-2">
      <AutoGrowTextarea
        id={`f-${name}`}
        value={values[name]}
        placeholder={placeholder}
        disabled={disabled}
        invalid={Boolean(errors[name])}
        onChange={(v) => set(name, v)}
      />
    </Field>
  );

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save(isDraft ? "confirmada" : coin.status);
      }}
    >
      <Section title="Identificación">
        {field("title", "Nombre", { placeholder: "p. ej. 1 peseta 1966 (*19-68)", className: "sm:col-span-2" })}
        {field("country", "País", { placeholder: "España" })}
        {field("denomination", "Valor facial", { placeholder: "1 peseta" })}
        {field("year", "Año (número)", { placeholder: "1966", inputMode: "numeric" })}
        {field("year_text", "Año (como se muestra)", { placeholder: "1966 (*19-68)" })}
        <Field label="Época" error={errors.era}>
          <select id="f-era" className={input} value={values.era} disabled={disabled} onChange={(e) => set("era", e.target.value as Era | "")}>
            <option value="">Sin indicar</option>
            {ERAS.map((era) => (
              <option key={era} value={era}>
                {ERA_LABELS[era]}
              </option>
            ))}
          </select>
        </Field>
        {field("period", "Periodo / reinado", { placeholder: "Franquismo" })}
        {field("ruler", "Gobernante")}
        {field("issuer", "Autoridad emisora")}
        {field("mint_mark", "Ceca")}
      </Section>

      <Section title="Características">
        {field("material", "Material", { placeholder: "Aluminio-bronce" })}
        {field("km_number", "Catálogo (KM#)", { placeholder: "KM# 796" })}
        {field("weight_g", "Peso (g)", { inputMode: "decimal" })}
        {field("diameter_mm", "Diámetro (mm)", { inputMode: "decimal" })}
      </Section>

      <Section title="Conservación">
        <div className="sm:col-span-2">
          <GradeSelector value={values.grade} suggested={coin.grade_suggested} disabled={disabled} onChange={(g) => set("grade", g)} />
        </div>
        {field("quantity", "Cantidad (piezas iguales)", { inputMode: "numeric" })}
      </Section>

      <Section title="Descripción">
        <ReadOnlyText label="Descripción" text={values.description} />
        <ReadOnlyText label="Curiosidades" text={values.interesting_facts} />
        {area("notes", "Mis notas", "Dónde la conseguí, precio de compra…")}
      </Section>

      <InlineError message={formError} />

      <div className="sticky bottom-0 z-10 -mx-4 flex gap-2 bg-bg/90 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:-mx-6 sm:px-6">
        {isDraft ? (
          <>
            <button type="button" className={`${btnSecondary} flex-1`} disabled={disabled} onClick={() => void save("borrador")}>
              {saving === "borrador" ? "Guardando…" : "Guardar borrador"}
            </button>
            <button type="submit" className={`${btnPrimary} flex-[2]`} disabled={disabled}>
              {saving === "confirmada" ? "Guardando…" : "✓ Confirmar moneda"}
            </button>
          </>
        ) : (
          <>
            {onCancel && (
              <button type="button" className={`${btnSecondary} flex-1`} disabled={disabled} onClick={onCancel}>
                Cancelar
              </button>
            )}
            <button type="submit" className={`${btnPrimary} flex-[2]`} disabled={disabled}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </>
        )}
      </div>
    </form>
  );
}

/** Texto generado por la IA: solo lectura y siempre completo (sin scroll). */
function ReadOnlyText({ label, text }: { label: string; text: string }) {
  return (
    <div className="space-y-1 sm:col-span-2">
      <p className="text-xs font-medium text-muted">{label}</p>
      {text ? (
        <p className="whitespace-pre-line rounded-xl bg-surface-2/60 px-3 py-2.5 text-sm leading-relaxed">{text}</p>
      ) : (
        <p className="px-1 text-sm italic text-muted">Se completa al identificar la moneda con IA.</p>
      )}
    </div>
  );
}

/** Textarea que crece con el contenido: nunca muestra barra de scroll. */
function AutoGrowTextarea({
  id,
  value,
  placeholder,
  disabled,
  invalid,
  onChange,
}: {
  id: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Ajusta la altura al contenido cada vez que cambia el texto (también al cargar).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      id={id}
      rows={3}
      className={`${input} resize-none overflow-hidden leading-relaxed`}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      aria-invalid={invalid}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className={`${card} p-4`}>
      <legend className="sr-only">{title}</legend>
      <h2 className="mb-3 font-arcade text-[10px] text-gold">{arcadeText(title)}</h2>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({ label, error, className = "", children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="text-xs font-medium text-muted">{label}</label>
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

import { cx, input, select, textarea } from "@/lib/ui";

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("grid content-start gap-1.5 text-sm font-semibold", className)}>
      <span>{label}</span>
      {children}
      {hint && <span className="text-xs font-normal leading-relaxed text-faint">{hint}</span>}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(input, props.className)} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={4} {...props} className={cx(textarea, props.className)} />;
}

export function SelectInput({
  options,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: { value: string; label: string }[];
}) {
  return (
    <select {...props} className={cx(select, props.className)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Check({
  name,
  label,
  defaultChecked,
  hint,
}: {
  name: string;
  label: React.ReactNode;
  defaultChecked?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg py-1.5 text-sm font-medium">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-5 w-5 flex-none cursor-pointer accent-[#ff7a1a]"
      />
      <span>
        {label}
        {hint && <span className="mt-0.5 block text-xs font-normal text-faint">{hint}</span>}
      </span>
    </label>
  );
}

export function Row({ children, cols = 2 }: { children: React.ReactNode; cols?: 2 | 3 }) {
  return (
    <div className={cx("grid gap-5", cols === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3")}>{children}</div>
  );
}

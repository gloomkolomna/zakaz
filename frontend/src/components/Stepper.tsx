interface StepperProps {
  value: number;
  max: number;
  min?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  mini?: boolean;
}

export default function Stepper({ value, max, min = 1, onChange, disabled, mini }: StepperProps) {
  return (
    <span className={`stepper${mini ? ' mini' : ''}`} onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        aria-label="Уменьшить количество"
        disabled={disabled || value <= min}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <span className="qty">{value}</span>
      <button
        type="button"
        aria-label="Увеличить количество"
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </span>
  );
}

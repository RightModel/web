export function formatDate(dateInput: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(dateInput));
}

export function formatUsd(value: number, digits = 6) {
  return `$${value.toFixed(digits)}`;
}

export function formatUsdPerCall(value: number) {
  if (value >= 0.01) {
    return `$${value.toFixed(2)}`;
  }

  if (value >= 0.001) {
    return `$${value.toFixed(4)}`;
  }

  return `$${value.toFixed(6)}`;
}

export function formatMultiplier(value: number) {
  const rounded = value >= 10 ? Math.round(value) : Number(value.toFixed(1));
  return `~${rounded}\u00d7`;
}

export function sentenceCase(value: string) {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

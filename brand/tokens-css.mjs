function kebab(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase();
}

export function renderTokensCss(tokens) {
  const lines = [
    "/* Generated from brand/tokens.json. Do not edit by hand. */",
    `/* Lava Bean tokens v${tokens.meta?.version ?? "0.0.0"} */`,
    ":root {",
  ];

  for (const [name, value] of Object.entries(tokens.color ?? {})) {
    lines.push(`  --lb-color-${kebab(name)}: ${value};`);
  }
  for (const [name, value] of Object.entries(tokens.space ?? {})) {
    lines.push(`  --lb-space-${kebab(name)}: ${value};`);
  }
  for (const [name, value] of Object.entries(tokens.typography?.family ?? {})) {
    lines.push(`  --lb-font-${kebab(name)}: ${value};`);
  }
  for (const [name, value] of Object.entries(tokens.typography?.size ?? {})) {
    lines.push(`  --lb-text-${kebab(name)}: ${value};`);
  }
  for (const [name, value] of Object.entries(tokens.typography?.lineHeight ?? {})) {
    lines.push(`  --lb-leading-${kebab(name)}: ${value};`);
  }
  for (const [name, value] of Object.entries(tokens.typography?.weight ?? {})) {
    lines.push(`  --lb-weight-${kebab(name)}: ${value};`);
  }
  for (const [name, value] of Object.entries(tokens.typography?.tracking ?? {})) {
    lines.push(`  --lb-tracking-${kebab(name)}: ${value};`);
  }
  for (const [name, value] of Object.entries(tokens.radius ?? {})) {
    lines.push(`  --lb-radius-${kebab(name)}: ${value};`);
  }
  for (const [name, value] of Object.entries(tokens.border ?? {})) {
    lines.push(`  --lb-border-${kebab(name)}: ${value};`);
  }
  for (const [name, value] of Object.entries(tokens.breakpoint ?? {})) {
    lines.push(`  --lb-breakpoint-${kebab(name)}: ${value};`);
  }
  for (const [name, value] of Object.entries(tokens.grid ?? {})) {
    lines.push(`  --lb-grid-${kebab(name)}: ${value};`);
  }
  for (const [name, value] of Object.entries(tokens.motion ?? {})) {
    lines.push(`  --lb-motion-${kebab(name)}: ${value};`);
  }

  lines.push("}", "");
  return lines.join("\n");
}

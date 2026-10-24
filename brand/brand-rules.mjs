const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RAW_COLOR = /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/gi;
const SPACING_SCALE = new Set([0, 4, 8, 12, 16, 24, 32, 48, 64, 96]);
const CONTRAST_MINIMUM = { AA: 4.5, "AA-large": 3 };

function toRgb(hex) {
  const value = hex.slice(1);
  const normalised =
    value.length === 3
      ? value
          .split("")
          .map((part) => part + part)
          .join("")
      : value.slice(0, 6);
  return [0, 2, 4].map((offset) => parseInt(normalised.slice(offset, offset + 2), 16) / 255);
}

export function contrastRatio(foreground, background) {
  const luminance = (hex) => {
    const [r, g, b] = toRgb(hex).map((channel) =>
      channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

function parsePx(value) {
  const match = /^(-?\d+(?:\.\d+)?)px$/.exec(String(value));
  return match ? Number(match[1]) : null;
}

function add(violations, rule, message, extra = {}) {
  violations.push({ rule, message, ...extra });
}

function isDeviationApproved(deviation) {
  return Boolean(
    deviation &&
      typeof deviation.rule === "string" &&
      typeof deviation.path === "string" &&
      typeof deviation.reason === "string" &&
      deviation.reason.trim().length >= 10 &&
      typeof deviation.approvedBy === "string" &&
      deviation.approvedBy.trim().length > 0,
  );
}

export function validateBrand({ tokens, files = [], deviations = [] }) {
  const violations = [];
  const colors = tokens?.color ?? {};

  for (const [name, value] of Object.entries(colors)) {
    if (!HEX.test(String(value))) {
      add(violations, "color.format", `Color "${name}" must be a hex value.`, {
        value: String(value),
      });
    }
  }

  for (const pair of tokens?.colorPairs ?? []) {
    const foreground = colors[pair.foreground];
    const background = colors[pair.background];
    if (!foreground || !background) {
      add(
        violations,
        "color.contrast",
        `Pair ${pair.foreground}/${pair.background} references an unknown colour.`,
        { value: `${pair.foreground}/${pair.background}` },
      );
      continue;
    }
    const ratio = contrastRatio(foreground, background);
    const minimum = CONTRAST_MINIMUM[pair.minimum];
    if (minimum === undefined) {
      add(violations, "color.contrast", `Unknown contrast minimum "${pair.minimum}".`);
      continue;
    }
    if (ratio < minimum) {
      add(
        violations,
        "color.contrast",
        `${pair.foreground} on ${pair.background} is ${ratio.toFixed(2)}:1, below ${pair.minimum}.`,
        { value: `${pair.foreground}/${pair.background}` },
      );
    }
  }

  const spacing = tokens?.space ?? {};
  const spacingValues = Object.entries(spacing);
  if (spacingValues.length === 0) {
    add(violations, "spacing.grid", "A spacing scale is required.");
  }
  for (const [name, value] of spacingValues) {
    const px = parsePx(value);
    if (px === null || !Number.isInteger(px) || !SPACING_SCALE.has(px)) {
      add(
        violations,
        "spacing.grid",
        `Spacing "${name}" (${value}) is not on the 4px brand scale.`,
        { value: String(value) },
      );
    }
  }

  const breakpoints = Object.entries(tokens?.breakpoint ?? {}).map(([name, value]) => ({
    name,
    px: parsePx(value),
  }));
  if (breakpoints.length > 1) {
    for (let index = 1; index < breakpoints.length; index += 1) {
      const previous = breakpoints[index - 1];
      const current = breakpoints[index];
      if (current.px === null || previous.px === null || current.px <= previous.px) {
        add(
          violations,
          "breakpoint.order",
          `Breakpoint "${current.name}" must be greater than "${previous.name}".`,
        );
      }
    }
  }

  for (const [name, value] of Object.entries(tokens?.typography?.lineHeight ?? {})) {
    if (Number(value) < 1) {
      add(violations, "typography.line-height", `Line height "${name}" must be at least 1.`);
    }
  }

  for (const file of files) {
    const source = String(file.content ?? "");
    for (const match of source.matchAll(RAW_COLOR)) {
      const value = match[0];
      const line = source.slice(0, match.index).split("\n").length;
      add(
        violations,
        "color.raw",
        `Raw colour "${value}" in ${file.path}. Use a token instead.`,
        { path: file.path, value, line },
      );
    }
  }

  const approved = new Set();
  const unapproved = [];
  for (const violation of violations) {
    const deviation = deviations.find(
      (candidate) =>
        isDeviationApproved(candidate) &&
        candidate.rule === violation.rule &&
        candidate.path === violation.path &&
        (!candidate.value || candidate.value === violation.value),
    );
    if (deviation) {
      approved.add(deviation);
      unapproved.push({ ...violation, approved: true, deviation });
    } else {
      unapproved.push(violation);
    }
  }

  return {
    ok: unapproved.every((violation) => violation.approved === true),
    violations: unapproved,
    approvedDeviations: [...approved],
  };
}

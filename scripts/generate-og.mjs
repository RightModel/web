import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import YAML from "yaml";

const publicDir = resolve(process.cwd(), "public");
const tasksDir = resolve(process.cwd(), "src/content/tasks");
const generatedPricingPath = resolve(process.cwd(), "src/data/generated-pricing.json");
const defaultPricingPath = resolve(process.cwd(), "src/data/default-pricing.json");
const width = 1200;
const height = 630;

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#f9f9fb" />
  <rect x="40" y="40" width="${width - 80}" height="${height - 80}" rx="24" fill="#f2f1f5" stroke="#cec9da" stroke-width="2" />
  <g font-family="-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif" fill="#1f2030">
    <text x="92" y="128" font-size="42" font-weight="600">rightmodel</text>
    <text x="92" y="278" font-size="64" font-weight="600">Use the right model.</text>
    <text x="92" y="350" font-size="34" fill="#52566a">Paste your task. Get a recommendation in 2 seconds.</text>
    <text x="${width - 92}" y="${height - 92}" text-anchor="end" font-size="24" fill="#676b80">rightmodel.dev</text>
  </g>
</svg>`;

const faviconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#e8e7f5" />
  <path d="M17 19h15c8 0 13 4 13 12 0 5-2 9-7 11l9 10H37l-7-8h-3v8H17V19zm10 17h5c4 0 6-2 6-5 0-4-2-5-6-5h-5v10z" fill="#4a5296" />
</svg>`;

const tierStyleMap = {
  routine: {
    fg: "#2b6040",
    bg: "#e8f5ee"
  },
  moderate: {
    fg: "#4a5296",
    bg: "#e8e7f5"
  },
  deep: {
    fg: "#7a5500",
    bg: "#fdf3e0"
  }
};

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapText(value, maxLineLength = 28, maxLines = 2) {
  const words = value.split(/\s+/);
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length <= maxLineLength) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
      current = word;
    } else {
      lines.push(word);
      current = "";
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.slice(0, maxLines).map((line, index, all) => {
    if (index === maxLines - 1 && all.length > maxLines) {
      return `${line}…`;
    }

    return line;
  });
}

function getComparisonTier(tier) {
  if (tier === "routine") {
    return "moderate";
  }

  if (tier === "moderate") {
    return "deep";
  }

  return "moderate";
}

function getAverageCallCost(model, tier) {
  const sizes = {
    routine: { input: 500, output: 250 },
    moderate: { input: 1000, output: 500 },
    deep: { input: 1800, output: 900 }
  };
  const size = sizes[tier];

  return (
    (size.input / 1000) * model.input_cost_per_1k_tokens_usd +
    (size.output / 1000) * model.output_cost_per_1k_tokens_usd
  );
}

function getModelCandidates(pricing, tier) {
  return Object.entries(pricing.models).flatMap(([provider, models]) =>
    Object.entries(models)
      .filter(([, model]) => model.tier === tier)
      .map(([slug, model]) => ({ provider, slug, model }))
  );
}

function getRecommendationForTier(pricing, tier) {
  const candidates = getModelCandidates(pricing, tier).sort((left, right) => {
    return getAverageCallCost(left.model, tier) - getAverageCallCost(right.model, tier);
  });
  const selected = candidates[0];
  const comparisonTier = getComparisonTier(tier);
  const comparisonCandidates = getModelCandidates(pricing, comparisonTier).sort((left, right) => {
    return getAverageCallCost(left.model, comparisonTier) - getAverageCallCost(right.model, comparisonTier);
  });
  const comparison = comparisonCandidates[0];
  const selectedCost = getAverageCallCost(selected.model, selected.model.tier);
  const comparisonCost = comparison ? getAverageCallCost(comparison.model, comparison.model.tier) : null;
  const multiplier =
    comparisonCost && selectedCost > 0 ? Math.max(selectedCost, comparisonCost) / Math.min(selectedCost, comparisonCost) : null;
  const direction =
    comparisonCost && selectedCost !== comparisonCost ? (selectedCost < comparisonCost ? "cheaper" : "more-expensive") : null;

  return {
    selected,
    comparison,
    multiplier,
    direction
  };
}

function formatMultiplier(multiplier) {
  const rounded = multiplier >= 10 ? Math.round(multiplier) : Number(multiplier.toFixed(1));
  return `~${rounded}×`;
}

function buildTaskOgSvg(task, pricing) {
  const { selected, comparison, multiplier, direction } = getRecommendationForTier(pricing, task.tier);
  const titleLines = wrapText(task.title, 26, 2);
  const tierStyle = tierStyleMap[task.tier];
  const tierLabel = task.tier.charAt(0).toUpperCase() + task.tier.slice(1);
  const costLine =
    multiplier && comparison
      ? direction === "cheaper"
        ? `${formatMultiplier(multiplier)} cheaper than ${comparison.model.label}`
        : `${formatMultiplier(multiplier)} more than ${comparison.model.label}`
      : "Pricing snapshot loaded";
  const titleSvg = titleLines
    .map((line, index) => `<tspan x="92" dy="${index === 0 ? 0 : 48}">${escapeXml(line)}</tspan>`)
    .join("");

  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="#f9f9fb" />
    <rect x="40" y="40" width="${width - 80}" height="${height - 80}" rx="24" fill="#f2f1f5" stroke="#cec9da" stroke-width="2" />
    <g font-family="-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif">
      <text x="92" y="108" font-size="24" fill="#676b80">rightmodel.dev</text>
      <text x="92" y="238" font-size="44" font-weight="600" fill="#1f2030">${titleSvg}</text>
      <text x="92" y="360" font-size="54" font-weight="600" fill="${tierStyle.fg}">Use ${escapeXml(selected.model.label)}.</text>
      <text x="92" y="410" font-size="26" fill="#2b6040">${escapeXml(costLine)}</text>
      <g transform="translate(${width - 232}, ${height - 128})">
        <rect width="140" height="52" rx="26" fill="${tierStyle.bg}" />
        <text x="70" y="33" text-anchor="middle" font-size="24" font-weight="600" fill="${tierStyle.fg}">${tierLabel}</text>
      </g>
    </g>
  </svg>`;
}

await mkdir(publicDir, { recursive: true });
await writeFile(resolve(publicDir, "og.svg"), svg);
await writeFile(resolve(publicDir, "favicon.svg"), faviconSvg);

const og = new Resvg(svg, {
  fitTo: {
    mode: "width",
    value: width
  }
});

const favicon = new Resvg(faviconSvg, {
  fitTo: {
    mode: "width",
    value: 64
  }
});

await writeFile(resolve(publicDir, "og.png"), og.render().asPng());
await writeFile(resolve(publicDir, "favicon-32x32.png"), favicon.render().asPng());

const pricingRaw = await readFile(generatedPricingPath, "utf8").catch(() => readFile(defaultPricingPath, "utf8"));
const pricing = JSON.parse(pricingRaw);
const taskOutputDir = resolve(publicDir, "og/tasks");
const taskFiles = (await readdir(tasksDir)).filter((file) => file.endsWith(".yaml"));
await mkdir(taskOutputDir, { recursive: true });

for (const fileName of taskFiles) {
  const raw = await readFile(resolve(tasksDir, fileName), "utf8");
  const task = YAML.parse(raw);
  const taskSvg = buildTaskOgSvg(task, pricing);
  const taskPng = new Resvg(taskSvg, {
    fitTo: {
      mode: "width",
      value: width
    }
  }).render().asPng();

  await writeFile(resolve(taskOutputDir, `${task.slug}.png`), taskPng);
}

console.log("Generated OG and favicon assets.");

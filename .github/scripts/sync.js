// Base patterns
const NUMBER = '\\d+';
const DECIMAL = `${NUMBER}(?:\\.${NUMBER})?`;
const PERCENTAGE = `${DECIMAL}?%`;
const WHITESPACE = '\\s*';

// Color format patterns
const HEX_PATTERN = '#[0-9a-fA-F]{6}';
const RGB_PATTERN = `rgb\\(${NUMBER},${WHITESPACE}${NUMBER},${WHITESPACE}${NUMBER}\\)`;
const HSL_PATTERN = `hsl\\(${DECIMAL},${WHITESPACE}${PERCENTAGE},${WHITESPACE}${PERCENTAGE}\\)`;

// Variable and capture groups
const VARIABLE_PATTERN = '(?<variable>--catppuccin-(?<key>\\w+): )';
const COLOR_PATTERN = `(?<color>${HEX_PATTERN}|${RGB_PATTERN}|${HSL_PATTERN})`;

const PALETTE_SOURCE = 'https://raw.githubusercontent.com/catppuccin/palette/refs/heads/main/palette.json';

const parseColor = (() => {
  const type = process.argv[2] || 'hex';
  switch (type) {
    case 'hex':
      return ({hex}) => hex;
    case 'rgb':
      return ({rgb: {r, g, b}}) => `rgb(${r}, ${g}, ${b})`;
    case 'hsl':
      return ({hsl: {h, s, l}}) => `hsl(${h}, ${s * 100}%, ${l * 100}%)`;
    default:
      console.error('Invalid color type. Use "hex" or "rgb" or "hsl".');
      process.exit(1);
  }
})();

async function getPalettes() {
  const response = await fetch(PALETTE_SOURCE);
  if (!response.ok) {
    throw new Error(`Failed to fetch palette: ${response.statusText}`);
  }

  const { latte, frappe, macchiato, mocha } = await response.json();
  return { latte, frappe, macchiato, mocha };
}

async function updatePalette({ colors, emoji, name }, id) {
  const descriptor = `${emoji} ${name}`;
  console.log(`Updating palette for ${descriptor}`);

  const fs = require('fs').promises;
  const path = require('path');
  const cssPath = path.join(__dirname, '..', '..', 'src', 'main', 'webapp', `catppuccin-${id}.css`);
  console.debug(`${descriptor} - Reading CSS file at ${cssPath}`);
  let cssContent = await fs.readFile(cssPath, 'utf8');

  const colorMap = Object.fromEntries(
    Object.entries(colors).map(([key, value]) => [key, parseColor(value)])
  );

  const regex = new RegExp(`${VARIABLE_PATTERN}${COLOR_PATTERN};`, 'g');

  let change = false;

  cssContent = cssContent.replaceAll(regex, (match, variable, key, color) => {
    const newColor = colorMap[key];
    if (!newColor) {
      throw `${descriptor} - No color found for ${key} palette`;
    }
    if (color === newColor) {
      console.debug(`${descriptor} - No change for ${variable}${color}`);
      return match;
    }
    console.log(`${descriptor} - Updating ${variable} from ${color} to ${newColor}`);
    change = true;
    return `${variable}${newColor};`;
  });

  if (change) {
    console.debug(`${descriptor} - Writing updated CSS file to ${cssPath}`);
    await fs.writeFile(cssPath, cssContent, 'utf8');
  }
}


(async () => {
  const { latte, frappe, macchiato, mocha } = await getPalettes();

  await Promise.all([
    updatePalette(latte, 'latte'),
    updatePalette(frappe, 'frappe'),
    updatePalette(macchiato, 'macchiato'),
    updatePalette(mocha, 'mocha')
  ]);
})().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});

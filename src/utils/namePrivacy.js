/**
 * Utility for masking / censoring surnames for user privacy in Motoluv 2.0 BETA.
 *
 * Rules:
 * - Preserves full given names (single or compound: e.g. "Ricardo", "María", "Juan Carlos").
 * - Masks each surname showing only its first letter capitalized and asterisks (*).
 * - Examples:
 *   - "Ricardo Salinas" -> "Ricardo S*****"
 *   - "María Fernández López" -> "María F**** L****"
 *   - "Juan Carlos Pérez Hernández" -> "Juan Carlos P**** H****"
 *   - "María del Carmen Ortiz" -> "María del Carmen O*****"
 *   - "Roberto de la Rosa" -> "Roberto de la R*****"
 * - Preserves generic system placeholders (e.g. "Vendedor en Motoluv", "Comprador Motoluv").
 * - Safely handles null, undefined, empty strings, emails, and pre-masked strings.
 */

// Generic system placeholders that should remain untouched
const GENERIC_PLACEHOLDERS = new Set([
  'vendedor',
  'comprador',
  'usuario',
  'vendedor en motoluv',
  'comprador motoluv',
  'vendedor verificado',
  'vendedor registrado',
  'comprador interesado',
  'vendedor interesado',
  'usuario motoluv',
  'usuario verificado',
  'sin nombre',
  'administrador',
  'asesor motoluv',
  'asesor',
  'inspector oficial',
  'taller oficial',
  'taller acreditado'
]);

// 3+ word compound first-name prefixes
const COMPOUND_PREFIXES = [
  'maria de los angeles', 'maría de los ángeles',
  'maria de la luz', 'maría de la luz',
  'maria del carmen', 'maría del carmen',
  'maria del rosario', 'maría del rosario',
  'maria del pilar', 'maría del pilar',
  'maria de lourdes', 'maría de lourdes',
  'maria de jesus', 'maría de jesús',
  'jose de jesus', 'josé de jesús',
  'juan de dios'
];

// Common 2-word compound given names in Spanish / Mexico
const TWO_WORD_COMPOUNDS = new Set([
  'juan carlos', 'juan pablo', 'juan manuel', 'juan jose', 'juan josé', 'juan antonio',
  'juan luis', 'juan francisco', 'juan david', 'juan diego', 'juan ignacio', 'juan esteban',
  'juan camilo', 'juan gabriel', 'juan sebastian', 'juan sebastián', 'juan ramon', 'juan ramón',
  'juan miguel', 'juan angel', 'juan ángel', 'juan fernando', 'juan andres', 'juan andrés',
  'maria jose', 'maria josé', 'maría jose', 'maría josé',
  'maria fernanda', 'maría fernanda', 'maria guadalupe', 'maría guadalupe',
  'maria elena', 'maría elena', 'maria teresa', 'maría teresa',
  'maria isabel', 'maría isabel', 'maria luisa', 'maría luisa',
  'maria cristina', 'maría cristina', 'maria alejandra', 'maría alejandra',
  'maria camila', 'maría camila', 'maria paula', 'maría paula',
  'maria victoria', 'maría victoria', 'maria antonia', 'maría antonia',
  'maria ines', 'maría inés', 'maria dolores', 'maría dolores',
  'maria soledad', 'maría soledad', 'maria concepcion', 'maría concepción',
  'maria jesus', 'maría jesús', 'maria rosario', 'maría rosario',
  'maria pilar', 'maría pilar', 'maria lourdes', 'maría lourdes',
  'maria luz', 'maría luz', 'maria carmen', 'maría carmen',
  'maria eugenia', 'maría eugenia', 'maria paulina', 'maría paulina',
  'maria beatriz', 'maría beatriz', 'maria mercedes', 'maría mercedes',
  'maria angeles', 'maría ángeles',
  'ma. elena', 'ma elena', 'ma. fernanda', 'ma fernanda', 'ma. guadalupe', 'ma guadalupe',
  'jose luis', 'josé luis', 'jose antonio', 'josé antonio',
  'jose manuel', 'josé manuel', 'jose maria', 'josé maría',
  'jose angel', 'josé ángel', 'jose francisco', 'josé francisco',
  'jose miguel', 'josé miguel', 'jose carlos', 'josé carlos',
  'jose eduardo', 'josé eduardo', 'jose alberto', 'josé alberto',
  'jose fernando', 'josé fernando', 'jose javier', 'josé javier',
  'jose ignacio', 'josé ignacio', 'jose ramon', 'josé ramón',
  'jose roberto', 'josé roberto', 'jose andres', 'josé andrés',
  'jose guadalupe', 'josé guadalupe',
  'carlos alberto', 'carlos eduardo', 'carlos andres', 'carlos andrés',
  'carlos manuel', 'carlos daniel', 'carlos enrique', 'carlos antonio',
  'luis fernando', 'luis alberto', 'luis angel', 'luis ángel',
  'luis enrique', 'luis antonio', 'luis miguel', 'luis eduardo',
  'luis carlos', 'luis manuel', 'luis alejandro', 'luis javier',
  'ana maria', 'ana maría', 'ana paula', 'ana sofia', 'ana sofía',
  'ana lucia', 'ana lucía', 'ana karen', 'ana laura', 'ana patricia',
  'ana victoria', 'ana isabel', 'ana cristina', 'ana luisa', 'ana belen', 'ana belén',
  'ana rosa', 'ana gabriela', 'ana cecilia', 'ana elena', 'ana teresa',
  'jorge luis', 'jorge alberto', 'jorge eduardo', 'jorge antonio', 'jorge enrique',
  'miguel angel', 'miguel ángel', 'victor manuel', 'víctor manuel',
  'marco antonio', 'cesar augusto', 'césar augusto', 'rosa maria', 'rosa maría',
  'claudia patricia', 'martha elena', 'gloria maria', 'gloria maría',
  'silvia patricia', 'luz maria', 'luz maría', 'dulce maria', 'dulce maría',
  'edgar eduardo', 'édgar eduardo'
]);

// Particles commonly used in Spanish surnames
const SURNAME_PARTICLES = new Set(['de', 'del', 'la', 'las', 'los', 'san', 'santa']);

/**
 * Masks a single surname word into FirstLetter + Asterisks.
 * Single surname uses 5 asterisks (e.g. Salinas -> S*****).
 * Multiple surnames use 4 asterisks each (e.g. Fernández López -> F**** L****).
 */
function maskSurnameWord(word, isSingle) {
  if (!word) return '';
  const cleaned = word.replace(/[*.]/g, '');
  const firstLetter = (cleaned ? cleaned.charAt(0) : word.charAt(0)).toUpperCase();
  const asteriskCount = isSingle ? 5 : 4;
  return firstLetter + '*'.repeat(asteriskCount);
}

/**
 * Groups and masks a list of surname tokens, preserving particles like "de la", "del", etc.
 */
function maskSurnamesList(words) {
  const result = [];
  let i = 0;

  const surnameUnits = [];
  while (i < words.length) {
    const prefix = [];
    while (i < words.length - 1 && SURNAME_PARTICLES.has(words[i].toLowerCase())) {
      prefix.push(words[i]);
      i++;
    }
    surnameUnits.push({ prefix: prefix.join(' '), word: words[i] });
    i++;
  }

  const isSingle = surnameUnits.length === 1;

  for (const unit of surnameUnits) {
    const masked = maskSurnameWord(unit.word, isSingle);
    if (unit.prefix) {
      result.push(`${unit.prefix} ${masked}`);
    } else {
      result.push(masked);
    }
  }

  return result.join(' ');
}

/**
 * Reusable function to censor surnames for public cards and components.
 *
 * @param {string|null|undefined} fullName - The full name of the user
 * @param {string} [fallback=''] - Optional fallback string if fullName is empty or null
 * @returns {string} The name with censored surnames
 */
export function censorSurname(fullName, fallback = '') {
  if (fullName == null) return fallback;
  const str = String(fullName).trim();
  if (!str) return fallback;

  // Preserve generic system placeholders
  if (GENERIC_PLACEHOLDERS.has(str.toLowerCase())) {
    return str;
  }

  // Handle emails gracefully if passed as raw names
  if (str.includes('@')) {
    const username = str.split('@')[0].replace(/[._-]/g, ' ').trim();
    return censorSurname(username, fallback);
  }

  const words = str.split(/\s+/);
  if (words.length <= 1) return str;

  const lower = str.toLowerCase();

  // 1. Long compound given name prefixes (3+ words: e.g. "María del Carmen Ortiz")
  for (const prefix of COMPOUND_PREFIXES) {
    if (lower.startsWith(prefix + ' ')) {
      const prefixWordsCount = prefix.split(/\s+/).length;
      const givenName = words.slice(0, prefixWordsCount).join(' ');
      const surnameWords = words.slice(prefixWordsCount);
      if (surnameWords.length === 0) return str;
      const maskedSurnames = maskSurnamesList(surnameWords);
      return `${givenName} ${maskedSurnames}`.trim();
    }
  }

  // 2. Exact 4-word names in Latin America (typically 2 given names + 2 surnames, e.g. "Juan Carlos Pérez Hernández")
  if (words.length === 4 && !SURNAME_PARTICLES.has(words[1].toLowerCase()) && !SURNAME_PARTICLES.has(words[2].toLowerCase())) {
    const givenName = `${words[0]} ${words[1]}`;
    const surnameWords = words.slice(2);
    const maskedSurnames = maskSurnamesList(surnameWords);
    return `${givenName} ${maskedSurnames}`.trim();
  }

  // 3. Known 2-word compound given names when there are 3 or more words (e.g. "Juan Carlos Pérez")
  if (words.length >= 3) {
    const firstTwo = `${words[0]} ${words[1]}`.toLowerCase();
    if (TWO_WORD_COMPOUNDS.has(firstTwo)) {
      const givenName = `${words[0]} ${words[1]}`;
      const surnameWords = words.slice(2);
      const maskedSurnames = maskSurnamesList(surnameWords);
      return `${givenName} ${maskedSurnames}`.trim();
    }
  }

  // 4. Standard case: first word is given name, remaining words are surnames (e.g. "Ricardo Salinas", "María Fernández López")
  const givenName = words[0];
  const surnameWords = words.slice(1);
  const maskedSurnames = maskSurnamesList(surnameWords);
  return `${givenName} ${maskedSurnames}`.trim();
}

// Aliases for developer convenience
export const censorFullName = censorSurname;
export const maskSurname = censorSurname;
export default censorSurname;

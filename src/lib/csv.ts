// Parser CSV ligero (sin dependencias). Soporta comillas dobles y comas
// dentro de campos entrecomillados. Pensado para importar contactos.

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

export function parseCsv(text: string): ParsedCsv {
  const clean = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!clean) return { headers: [], rows: [] };

  const records: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (inQuotes) {
      if (char === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      records.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  row.push(field);
  records.push(row);

  const [headerRow, ...rest] = records;
  return {
    headers: (headerRow ?? []).map((h) => h.trim()),
    rows: rest.filter((r) => r.some((c) => c.trim() !== "")),
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface MappedContact {
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  phone: string | null;
}

export interface CsvMappingResult {
  valid: MappedContact[];
  invalid: { row: number; reason: string }[];
}

const ALIASES: Record<keyof MappedContact, string[]> = {
  email: ["email", "correo", "e-mail", "mail"],
  first_name: ["first_name", "firstname", "nombre", "name", "first"],
  last_name: ["last_name", "lastname", "apellido", "apellidos", "last"],
  company: ["company", "empresa", "organizacion", "organización"],
  phone: ["phone", "telefono", "teléfono", "movil", "móvil", "tel"],
};

function indexFor(headers: string[], key: keyof MappedContact): number {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const alias of ALIASES[key]) {
    const idx = lower.indexOf(alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

export function mapCsvToContacts(parsed: ParsedCsv): CsvMappingResult {
  const idx = {
    email: indexFor(parsed.headers, "email"),
    first_name: indexFor(parsed.headers, "first_name"),
    last_name: indexFor(parsed.headers, "last_name"),
    company: indexFor(parsed.headers, "company"),
    phone: indexFor(parsed.headers, "phone"),
  };

  const valid: MappedContact[] = [];
  const invalid: { row: number; reason: string }[] = [];
  const seen = new Set<string>();

  parsed.rows.forEach((cols, i) => {
    const get = (n: number) => (n >= 0 ? (cols[n] ?? "").trim() : "");
    const email = get(idx.email).toLowerCase();
    if (!email) {
      invalid.push({ row: i + 2, reason: "Falta el email" });
      return;
    }
    if (!EMAIL_RE.test(email)) {
      invalid.push({ row: i + 2, reason: `Email no válido: ${email}` });
      return;
    }
    if (seen.has(email)) {
      invalid.push({ row: i + 2, reason: `Email duplicado: ${email}` });
      return;
    }
    seen.add(email);
    valid.push({
      email,
      first_name: get(idx.first_name) || null,
      last_name: get(idx.last_name) || null,
      company: get(idx.company) || null,
      phone: get(idx.phone) || null,
    });
  });

  return { valid, invalid };
}

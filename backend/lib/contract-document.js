/**
 * Render a printable employment contract as standalone HTML.
 *
 * Branches per Belgian statute to include the right legal clauses. The
 * output is print-optimised (white bg, A4-friendly margins, no nav)
 * so a manager can hit Cmd-P → "Save as PDF" and email it to staff.
 */

function htmlEscape(s) {
  return String(s == null ? '' : s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function fmtDate(d) {
  if (!d) return '____';
  const dd = new Date(d);
  return dd.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtEur(n) {
  return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);
}

const STATUTE_TITLES = {
  permanent:  'Arbeidsovereenkomst voor onbepaalde duur',
  fixed_term: 'Arbeidsovereenkomst voor bepaalde duur',
  flexi_job:  'Flexi-arbeidsovereenkomst (horeca)',
  student:    'Studentenovereenkomst',
  extra:      'Overeenkomst voor gelegenheidsmedewerker (extra)',
  interim:    'Uitzendovereenkomst (interim)',
  internship: 'Stageovereenkomst',
};

const STATUTE_SUBTITLES = {
  permanent:  'Open-ended employment agreement under Belgian labour law.',
  fixed_term: 'Fixed-term employment agreement under Belgian labour law.',
  flexi_job:  'Flexi-job arrangement under Wet 16/11/2015 (HoReCa).',
  student:    'Student worker agreement, max. 475 hours/year quota.',
  extra:      'Daily / occasional hospitality worker arrangement.',
  interim:    'Temporary work assignment (interim).',
  internship: 'Internship agreement.',
};

// Clauses tuned per statute. Kept short — a real production deployment
// should swap these for the full legal text reviewed by Belgian counsel.
function statuteClauses(statute) {
  switch (statute) {
    case 'flexi_job':
      return [
        'De werknemer verklaart te voldoen aan de voorwaarden van het flexi-job statuut zoals bepaald in de Wet van 16 november 2015 (kwartaal T-3 minstens 4/5 tewerkstelling bij een andere werkgever).',
        'Per gewerkte uur betaalt de werkgever de overeengekomen flexi-loon, vermeerderd met een flexi-vakantiegeld van 7,67%.',
        'Voor elke prestatie wordt een dagelijkse Dimona-aangifte (DIMONA FLX) uitgevoerd vóór aanvang.',
      ];
    case 'student':
      return [
        'Deze overeenkomst valt binnen het studentenstatuut. De werknemer beschikt over voldoende uren binnen het jaarlijkse 475-uren contingent.',
        'Een Dimona STU-aangifte wordt uitgevoerd vóór elke prestatie.',
        'Op het brutoloon wordt een verlaagde solidariteitsbijdrage van 8,13% toegepast.',
      ];
    case 'extra':
      return [
        'Tewerkstelling als gelegenheidsmedewerker in de horeca. Maximaal 50 dagen per jaar binnen het sectoraal contingent.',
        'Forfaitaire RSZ-bijdragen worden toegepast op basis van het uurloon en het aantal gepresteerde uren per dag.',
        'Per prestatie wordt een Dimona EXT-aangifte uitgevoerd vóór aanvang van de dienst.',
      ];
    case 'interim':
      return [
        'De werknemer wordt ter beschikking gesteld door een uitzendbureau. Patron treedt op als gebruiker van de uitzendkracht.',
        'Loonadministratie en RSZ-aangiftes verlopen via het uitzendbureau.',
      ];
    case 'internship':
      return [
        'Stage uitgevoerd in het kader van een opleiding. Geen loon verschuldigd tenzij anders overeengekomen.',
        'De stagiair is verzekerd via de onderwijsinstelling.',
      ];
    case 'fixed_term':
      return [
        'Deze overeenkomst eindigt automatisch op de overeengekomen einddatum, zonder opzegging.',
        'Tijdens de eerste maand kunnen beide partijen de overeenkomst beëindigen mits kennisgeving van zeven kalenderdagen.',
      ];
    case 'permanent':
    default:
      return [
        'Deze overeenkomst is gesloten voor onbepaalde duur en kan door elk van de partijen worden beëindigd mits inachtneming van de opzeggingstermijnen voorzien in de Wet van 3 juli 1978.',
        'Een proefperiode is niet langer wettelijk voorzien (afgeschaft in 2014, behoudens de eerste week onder Wet Eenheidsstatuut).',
      ];
  }
}

function renderContractHTML({ contract, staff, restaurantName }) {
  const title = STATUTE_TITLES[contract.statute] || 'Arbeidsovereenkomst';
  const subtitle = STATUTE_SUBTITLES[contract.statute] || '';
  const clauses = statuteClauses(contract.statute);
  const niss = (typeof staff.formattedNiss === 'function' ? staff.formattedNiss() : staff.nissNumber) || '____';

  const compensation = contract.monthlySalary
    ? `${fmtEur(contract.monthlySalary)} bruto per maand`
    : `${fmtEur(contract.hourlyRate)} bruto per uur`;

  const periodLabel = contract.endDate
    ? `${fmtDate(contract.startDate)} — ${fmtDate(contract.endDate)}`
    : `Vanaf ${fmtDate(contract.startDate)} (onbepaalde duur)`;

  const extra = (contract.extraTerms || '').trim();

  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8" />
<title>${htmlEscape(title)} — ${htmlEscape(staff.name)}</title>
<style>
  :root { --ink:#111; --muted:#555; --line:#ddd; --accent:#ea580c; }
  * { box-sizing:border-box; }
  html, body { margin:0; background:#f5f5f5; color:var(--ink); font-family:Inter,Georgia,serif; }
  .page {
    background:#fff; max-width:780px; margin:24px auto; padding:48px 56px;
    box-shadow:0 4px 24px rgba(0,0,0,0.08);
  }
  header { border-bottom:2px solid var(--accent); padding-bottom:14px; margin-bottom:24px; display:flex; justify-content:space-between; align-items:flex-end; gap:12px; }
  .brand { font-weight:600; font-size:18px; letter-spacing:-0.01em; }
  .doc-meta { font-size:12px; color:var(--muted); text-align:right; }
  h1 { font-size:22px; font-weight:600; margin:8px 0 4px; }
  .subtitle { color:var(--muted); font-size:13px; margin:0 0 24px; }
  h2 { font-size:13px; text-transform:uppercase; letter-spacing:0.08em; color:var(--accent); margin:24px 0 8px; font-weight:600; }
  table.parties { width:100%; border-collapse:collapse; font-size:13px; }
  table.parties td { padding:6px 0; vertical-align:top; }
  table.parties td.label { width:140px; color:var(--muted); }
  ul.clauses { padding-left:18px; font-size:13px; line-height:1.6; }
  ul.clauses li { margin:6px 0; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:18px; font-size:13px; }
  .grid div { border-top:1px solid var(--line); padding-top:6px; }
  .grid label { display:block; color:var(--muted); font-size:11px; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:4px; }
  .signatures { margin-top:48px; display:grid; grid-template-columns:1fr 1fr; gap:32px; }
  .sig { border-top:1px solid var(--ink); padding-top:6px; font-size:12px; min-height:90px; }
  .sig label { display:block; color:var(--muted); font-size:11px; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.06em; }
  footer { margin-top:36px; font-size:10px; color:var(--muted); text-align:center; }
  .extra { font-size:13px; line-height:1.6; white-space:pre-wrap; border-left:3px solid var(--accent); padding:6px 12px; background:#fafafa; }
  @media print {
    body { background:#fff; }
    .page { box-shadow:none; margin:0; max-width:none; padding:24mm 22mm; }
    .no-print { display:none !important; }
    header { page-break-after:avoid; }
  }
  .toolbar { position:sticky; top:0; background:#fff; border-bottom:1px solid #eee; padding:8px 16px; display:flex; justify-content:flex-end; gap:8px; z-index:10; }
  .toolbar button { background:var(--accent); color:#fff; border:0; padding:8px 14px; border-radius:8px; cursor:pointer; font:inherit; font-size:13px; }
</style>
</head>
<body>
  <div class="toolbar no-print">
    <button onclick="window.print()">Print / Save as PDF</button>
  </div>
  <article class="page">
    <header>
      <div>
        <div class="brand">${htmlEscape(restaurantName)}</div>
        <h1>${htmlEscape(title)}</h1>
        <p class="subtitle">${htmlEscape(subtitle)}</p>
      </div>
      <div class="doc-meta">
        Ref. ${htmlEscape(String(contract._id || '').slice(-8).toUpperCase())}<br/>
        Opgesteld op ${htmlEscape(fmtDate(contract.createdAt || new Date()))}
      </div>
    </header>

    <h2>Tussen partijen</h2>
    <table class="parties">
      <tr><td class="label">Werkgever</td><td>${htmlEscape(restaurantName)}</td></tr>
      <tr><td class="label">Werknemer</td><td>${htmlEscape(staff.name)}</td></tr>
      <tr><td class="label">INSZ</td><td>${htmlEscape(niss)}</td></tr>
      <tr><td class="label">Geboortedatum</td><td>${htmlEscape(fmtDate(staff.dateOfBirth))}</td></tr>
      <tr><td class="label">Adres</td><td>${htmlEscape([staff.address?.street, staff.address?.postalCode + ' ' + staff.address?.city].filter(Boolean).join(', ') || '____')}</td></tr>
      <tr><td class="label">Nationaliteit</td><td>${htmlEscape(staff.nationality || 'BE')}</td></tr>
      <tr><td class="label">IBAN</td><td>${htmlEscape(staff.iban || '____')}</td></tr>
    </table>

    <h2>Tewerkstelling</h2>
    <div class="grid">
      <div><label>Functie</label>${htmlEscape(contract.jobTitle || staff.role || '____')}</div>
      <div><label>Werkplaats</label>${htmlEscape(contract.workplace || restaurantName)}</div>
      <div><label>Periode</label>${htmlEscape(periodLabel)}</div>
      <div><label>Werktijd</label>${htmlEscape(`${contract.hoursPerWeek} u/week`)}</div>
      <div><label>Vergoeding</label>${htmlEscape(compensation)}</div>
      <div><label>Statuut</label>${htmlEscape(STATUTE_TITLES[contract.statute] || contract.statute)}</div>
    </div>

    <h2>Algemene en sectorale bepalingen</h2>
    <ul class="clauses">
      ${clauses.map((c) => `<li>${htmlEscape(c)}</li>`).join('\n      ')}
      <li>De partijen verbinden zich tot strikte naleving van de geldende cao's en sectorale akkoorden van Paritair Comité 302 (horeca).</li>
      <li>Bij betwisting zijn de Belgische arbeidsrechtbanken bevoegd. Het Belgisch recht is van toepassing.</li>
    </ul>

    ${extra ? `<h2>Bijkomende bepalingen</h2>\n    <div class="extra">${htmlEscape(extra)}</div>` : ''}

    <div class="signatures">
      <div class="sig">
        <label>Handtekening werkgever</label>
        ${contract.signedAt ? htmlEscape(contract.signedByEmployerName || '') : ''}<br/>
        <small>${contract.signedAt ? htmlEscape(fmtDate(contract.signedAt)) : ''}</small>
      </div>
      <div class="sig">
        <label>Handtekening werknemer ("voor akkoord, gelezen en goedgekeurd")</label>
        ${contract.signedAt ? htmlEscape(contract.signedByStaffName || staff.name) : ''}<br/>
        <small>${contract.signedAt ? htmlEscape(fmtDate(contract.signedAt)) : ''}</small>
      </div>
    </div>

    <footer>
      Document opgemaakt in tweevoud — een exemplaar voor elke partij. Alle bedragen in euro, brutobedragen tenzij anders vermeld.
    </footer>
  </article>
</body>
</html>`;
}

module.exports = { renderContractHTML, STATUTE_TITLES };

import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { api, fmtEur } from '../api.js';
import Modal from '../components/Modal.jsx';
import { useT } from '../i18n/index.jsx';

const empty = {
  name: '', role: 'waiter', email: '', phone: '', hourlyRate: 14, active: true,
  // Belgian payroll / RSZ fields — optional in the UI but required to
  // submit a valid Dimona for this staff member.
  nissNumber: '', dateOfBirth: '', nationality: 'BE', iban: '',
  address: { street: '', postalCode: '', city: '', country: 'BE' },
  // Belgian fringe benefits — see Staff model docs.
  mutuality: '',
  mealVouchersOptIn: false,
  mealVoucherEmployerEur: 6.91,
  mealVoucherEmployeeEur: 1.09,
  kmAllowanceEurPerKm: 0.4280,
  commuteKm: 0,
};

// Most-common Belgian mutualities, used as datalist suggestions.
const MUTUALITIES = [
  'CM (Christelijke Mutualiteit)',
  'Solidaris (Socialistische Mutualiteit)',
  'Liberale Mutualiteit',
  'Onafhankelijke Ziekenfondsen',
  'Neutraal Ziekenfonds',
  'Helan',
  'HZIV (Hulpkas)',
];

const ABSENCE_KINDS = [
  { v: 'sick',     label: 'Ziekte',         paid: true  },
  { v: 'accident', label: 'Arbeidsongeval', paid: true  },
  { v: 'holiday',  label: 'Verlof',         paid: true  },
  { v: 'unpaid',   label: 'Onbetaald',      paid: false },
  { v: 'family',   label: 'Klein verlet',   paid: true  },
  { v: 'other',    label: 'Andere',         paid: false },
];

export default function StaffPage() {
  const { t } = useT();
  const [staff, setStaff] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [period, setPeriod] = useState({
    from: dayjs().startOf('month').format('YYYY-MM-DD'),
    to: dayjs().endOf('month').format('YYYY-MM-DD'),
  });
  const [payroll, setPayroll] = useState(null);
  const [absences, setAbsences] = useState([]);
  const [editingAbsence, setEditingAbsence] = useState(null);

  async function load() {
    const [st, sh, ab] = await Promise.all([api.staff(), api.shifts(), api.absences('limit=200')]);
    setStaff(st);
    setShifts(sh);
    setAbsences(ab);
  }
  useEffect(() => { load(); }, []);

  async function loadPayroll() {
    const data = await api.payroll(period.from, period.to);
    setPayroll(data);
  }
  useEffect(() => { loadPayroll(); }, [period.from, period.to]); // eslint-disable-line

  async function save() {
    await api.saveStaff({
      ...editing,
      hourlyRate: Number(editing.hourlyRate) || 0,
      mealVoucherEmployerEur: Number(editing.mealVoucherEmployerEur) || 0,
      mealVoucherEmployeeEur: Number(editing.mealVoucherEmployeeEur) || 0,
      kmAllowanceEurPerKm: Number(editing.kmAllowanceEurPerKm) || 0,
      commuteKm: Number(editing.commuteKm) || 0,
    });
    setEditing(null);
    load();
  }

  async function saveAbsence() {
    const a = editingAbsence;
    await api.saveAbsence({
      ...a,
      startsAt: a.startsAt ? new Date(a.startsAt).toISOString() : new Date().toISOString(),
      endsAt: a.endsAt ? new Date(a.endsAt).toISOString() : new Date().toISOString(),
    });
    setEditingAbsence(null);
    load();
  }
  async function removeAbsence(id) {
    if (!confirm('Afwezigheid verwijderen?')) return;
    await api.deleteAbsence(id);
    load();
  }

  async function remove(id) {
    if (!confirm(t('staff.deleteConfirm'))) return;
    await api.deleteStaff(id);
    load();
  }

  async function clockIn(id) {
    await api.clockIn(id);
    load();
    loadPayroll();
  }
  async function clockOut(shiftId) {
    await api.clockOut(shiftId);
    load();
    loadPayroll();
  }

  // active shifts (no clockOut)
  const activeShifts = useMemo(
    () => shifts.filter((s) => !s.clockOut),
    [shifts]
  );
  function activeShiftFor(id) {
    return activeShifts.find((s) => s.staff?._id === id);
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-semibold">{t('staff.title')}</h1>
        <button className="btn-primary" onClick={() => setEditing({ ...empty })}>
          <span className="hidden sm:inline">{t('staff.add')}</span>
          <span className="sm:hidden">+</span>
        </button>
      </div>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-slate-50 dark:bg-surface-950 text-slate-500 dark:text-slate-400 text-left">
            <tr>
              <th className="px-4 py-2">{t('staff.col.name')}</th>
              <th className="px-4 py-2">{t('staff.col.role')}</th>
              <th className="px-4 py-2">{t('staff.col.rate')}</th>
              <th className="px-4 py-2">{t('reservations.col.status')}</th>
              <th className="px-4 py-2">{t('reservations.field.email')}</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => {
              const a = activeShiftFor(s._id);
              return (
                <tr key={s._id} className="border-t border-slate-100 dark:border-white/5">
                  <td className="px-4 py-2 font-medium">{s.name}</td>
                  <td className="px-4 py-2 capitalize text-slate-600 dark:text-slate-300">{s.role}</td>
                  <td className="px-4 py-2">{fmtEur(s.hourlyRate)} / h</td>
                  <td className="px-4 py-2">
                    {a ? (
                      <span className="badge bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                        On shift since {dayjs(a.clockIn).format('HH:mm')}
                      </span>
                    ) : (
                      <span className="badge bg-slate-100 dark:bg-surface-850 text-slate-500 dark:text-slate-400">Off</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{s.email || '—'}</td>
                  <td className="px-4 py-2 text-right space-x-2">
                    {a ? (
                      <button className="btn-ghost" onClick={() => clockOut(a._id)}>Clock out</button>
                    ) : (
                      <button className="btn-primary" onClick={() => clockIn(s._id)}>Clock in</button>
                    )}
                    <button className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100" onClick={() => setEditing({
                      ...empty,
                      ...s,
                      dateOfBirth: s.dateOfBirth ? dayjs(s.dateOfBirth).format('YYYY-MM-DD') : '',
                      address: s.address || { street: '', postalCode: '', city: '', country: 'BE' },
                    })}>edit</button>
                    <button className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300" onClick={() => remove(s._id)}>×</button>
                  </td>
                </tr>
              );
            })}
            {!staff.length && (
              <tr><td colSpan="6" className="text-center py-8 text-slate-400 dark:text-slate-500">{t('staff.empty')}</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </section>

      <section className="card">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-white/5 flex items-center justify-between flex-wrap gap-2">
          <div className="font-medium">Paychecks</div>
          <div className="flex items-center gap-2 text-sm">
            <input type="date" className="input w-auto" value={period.from}
              onChange={(e) => setPeriod({ ...period, from: e.target.value })} />
            <span className="text-slate-400 dark:text-slate-500">→</span>
            <input type="date" className="input w-auto" value={period.to}
              onChange={(e) => setPeriod({ ...period, to: e.target.value })} />
          </div>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead className="bg-slate-50 dark:bg-surface-950 text-slate-500 dark:text-slate-400 text-left">
            <tr>
              <th className="px-4 py-2">Staff</th>
              <th className="px-4 py-2">Shifts</th>
              <th className="px-4 py-2">Hours</th>
              <th className="px-4 py-2">Pay</th>
              <th className="px-4 py-2" title="Maaltijdcheques (werkgeversaandeel)">Cheques</th>
              <th className="px-4 py-2" title="Kilometervergoeding">Km</th>
              <th className="px-4 py-2" title="Ziektedagen — gewaarborgd loon">Ziekte</th>
            </tr>
          </thead>
          <tbody>
            {(payroll?.rows || []).map((r) => (
              <tr key={r.staff._id} className="border-t border-slate-100 dark:border-white/5">
                <td className="px-4 py-2 font-medium">{r.staff.name}</td>
                <td className="px-4 py-2">{r.shifts}</td>
                <td className="px-4 py-2">{r.hours.toFixed(1)}</td>
                <td className="px-4 py-2 font-semibold">{fmtEur(r.pay)}</td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                  {r.mealVoucherDays > 0 ? `${r.mealVoucherDays} × ${fmtEur(r.mealVoucherEmployerEur / Math.max(1, r.mealVoucherDays))}` : '—'}
                  {r.mealVoucherEmployerEur > 0 && (
                    <div className="text-xs text-slate-400 dark:text-slate-500">{fmtEur(r.mealVoucherEmployerEur)}</div>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                  {r.kmTotal > 0 ? `${r.kmTotal.toFixed(0)} km` : '—'}
                  {r.mileageEur > 0 && (
                    <div className="text-xs text-slate-400 dark:text-slate-500">{fmtEur(r.mileageEur)}</div>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                  {r.sickDays > 0 ? `${r.sickDays} d` : '—'}
                  {r.sickPayEur > 0 && (
                    <div className="text-xs text-slate-400 dark:text-slate-500">{fmtEur(r.sickPayEur)}</div>
                  )}
                </td>
              </tr>
            ))}
            {!payroll?.rows?.length && (
              <tr><td colSpan="7" className="text-center py-8 text-slate-400 dark:text-slate-500">No paid shifts in this period.</td></tr>
            )}
          </tbody>
          {payroll?.rows?.length > 0 && (
            <tfoot>
              <tr className="bg-slate-50 dark:bg-surface-950 font-semibold">
                <td className="px-4 py-2">Total</td>
                <td className="px-4 py-2">{payroll.rows.reduce((s, r) => s + r.shifts, 0)}</td>
                <td className="px-4 py-2">{payroll.rows.reduce((s, r) => s + r.hours, 0).toFixed(1)}</td>
                <td className="px-4 py-2">{fmtEur(payroll.rows.reduce((s, r) => s + r.pay, 0))}</td>
                <td className="px-4 py-2">{fmtEur(payroll.rows.reduce((s, r) => s + (r.mealVoucherEmployerEur || 0), 0))}</td>
                <td className="px-4 py-2">{fmtEur(payroll.rows.reduce((s, r) => s + (r.mileageEur || 0), 0))}</td>
                <td className="px-4 py-2">{fmtEur(payroll.rows.reduce((s, r) => s + (r.sickPayEur || 0), 0))}</td>
              </tr>
            </tfoot>
          )}
        </table>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-white/5 flex items-center justify-between flex-wrap gap-2">
          <div className="font-medium">Afwezigheden — ziekte, verlof, ongeval</div>
          <button
            className="btn-primary"
            onClick={() => setEditingAbsence({
              staff: staff[0]?._id || '',
              kind: 'sick',
              startsAt: dayjs().format('YYYY-MM-DD'),
              endsAt: dayjs().format('YYYY-MM-DD'),
              paidByEmployer: true,
              hasMedicalCertificate: false,
              notes: '',
            })}
          >+ Registreren</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 dark:bg-surface-950 text-slate-500 dark:text-slate-400 text-left">
              <tr>
                <th className="px-4 py-2">Werknemer</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Periode</th>
                <th className="px-4 py-2">Dagen</th>
                <th className="px-4 py-2">Attest</th>
                <th className="px-4 py-2">Loon</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {absences.map((a) => {
                const meta = ABSENCE_KINDS.find((k) => k.v === a.kind);
                return (
                  <tr key={a._id} className="border-t border-slate-100 dark:border-white/5">
                    <td className="px-4 py-2 font-medium">{a.staff?.name || '—'}</td>
                    <td className="px-4 py-2">
                      <span className={[
                        'badge',
                        a.kind === 'sick' || a.kind === 'accident'
                          ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                          : a.kind === 'holiday'
                          ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-surface-850 text-slate-600 dark:text-slate-300',
                      ].join(' ')}>{meta?.label || a.kind}</span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      {dayjs(a.startsAt).format('DD MMM')} → {dayjs(a.endsAt).format('DD MMM YYYY')}
                    </td>
                    <td className="px-4 py-2">{a.days}</td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                      {a.kind === 'sick' || a.kind === 'accident'
                        ? (a.hasMedicalCertificate ? '✓ medisch' : '— geen attest')
                        : '—'}
                    </td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                      {a.paidByEmployer ? 'gewaarborgd' : 'onbetaald'}
                    </td>
                    <td className="px-4 py-2 text-right space-x-2">
                      <button className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100" onClick={() => setEditingAbsence({
                        ...a,
                        staff: a.staff?._id || a.staff,
                        startsAt: dayjs(a.startsAt).format('YYYY-MM-DD'),
                        endsAt: dayjs(a.endsAt).format('YYYY-MM-DD'),
                      })}>edit</button>
                      <button className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300" onClick={() => removeAbsence(a._id)}>×</button>
                    </td>
                  </tr>
                );
              })}
              {!absences.length && (
                <tr><td colSpan="7" className="text-center py-8 text-slate-400 dark:text-slate-500">Nog geen afwezigheden geregistreerd.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        open={!!editingAbsence}
        onClose={() => setEditingAbsence(null)}
        title={editingAbsence?._id ? 'Afwezigheid bewerken' : 'Afwezigheid registreren'}
        footer={(
          <>
            <button className="btn-ghost" onClick={() => setEditingAbsence(null)}>{t('common.cancel')}</button>
            <button className="btn-primary" onClick={saveAbsence} disabled={!editingAbsence?.staff}>{t('common.save')}</button>
          </>
        )}
      >
        {editingAbsence && (
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="text-slate-500 dark:text-slate-400">Werknemer</span>
              <select className="input mt-1" value={editingAbsence.staff || ''}
                onChange={(e) => setEditingAbsence({ ...editingAbsence, staff: e.target.value })}>
                <option value="">— kies —</option>
                {staff.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-slate-500 dark:text-slate-400">Type</span>
              <select className="input mt-1" value={editingAbsence.kind}
                onChange={(e) => {
                  const meta = ABSENCE_KINDS.find((k) => k.v === e.target.value);
                  setEditingAbsence({
                    ...editingAbsence,
                    kind: e.target.value,
                    paidByEmployer: meta ? meta.paid : editingAbsence.paidByEmployer,
                  });
                }}>
                {ABSENCE_KINDS.map((k) => <option key={k.v} value={k.v}>{k.label}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="text-slate-500 dark:text-slate-400">Van</span>
                <input type="date" className="input mt-1" value={editingAbsence.startsAt}
                  onChange={(e) => setEditingAbsence({ ...editingAbsence, startsAt: e.target.value })} />
              </label>
              <label className="block text-sm">
                <span className="text-slate-500 dark:text-slate-400">Tot</span>
                <input type="date" className="input mt-1" value={editingAbsence.endsAt}
                  onChange={(e) => setEditingAbsence({ ...editingAbsence, endsAt: e.target.value })} />
              </label>
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!editingAbsence.paidByEmployer}
                onChange={(e) => setEditingAbsence({ ...editingAbsence, paidByEmployer: e.target.checked })} />
              Gewaarborgd loon (werkgever betaalt)
            </label>
            {(editingAbsence.kind === 'sick' || editingAbsence.kind === 'accident') && (
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!editingAbsence.hasMedicalCertificate}
                  onChange={(e) => setEditingAbsence({ ...editingAbsence, hasMedicalCertificate: e.target.checked })} />
                Medisch attest ontvangen
              </label>
            )}
            <label className="block text-sm">
              <span className="text-slate-500 dark:text-slate-400">Opmerking</span>
              <textarea rows={2} className="input mt-1" value={editingAbsence.notes || ''}
                onChange={(e) => setEditingAbsence({ ...editingAbsence, notes: e.target.value })} />
            </label>
          </div>
        )}
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?._id ? 'Edit staff member' : 'New staff member'}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setEditing(null)}>{t('common.cancel')}</button>
            <button className="btn-primary" onClick={save}>{t('common.save')}</button>
          </>
        }
      >
        {editing && (
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 text-sm">
              <span className="text-slate-600 dark:text-slate-300">Name</span>
              <input className="input mt-1" value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </label>
            <label className="text-sm">
              <span className="text-slate-600 dark:text-slate-300">Role</span>
              <select className="input mt-1" value={editing.role}
                onChange={(e) => setEditing({ ...editing, role: e.target.value })}>
                <option value="manager">Manager</option>
                <option value="waiter">Waiter</option>
                <option value="kitchen">Kitchen</option>
                <option value="bar">Bar</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="text-slate-600 dark:text-slate-300">Hourly rate (EUR)</span>
              <input className="input mt-1" type="number" step="0.5" value={editing.hourlyRate}
                onChange={(e) => setEditing({ ...editing, hourlyRate: e.target.value })} />
            </label>
            <label className="col-span-2 text-sm">
              <span className="text-slate-600 dark:text-slate-300">Email</span>
              <input className="input mt-1" value={editing.email || ''}
                onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
            </label>
            <label className="col-span-2 text-sm">
              <span className="text-slate-600 dark:text-slate-300">Phone</span>
              <input className="input mt-1" value={editing.phone || ''}
                onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
            </label>

            {/* Belgian payroll / RSZ identification — required to submit
                a valid Dimona for this staff member. */}
            <div className="col-span-2 mt-2 pt-3 border-t border-slate-100 dark:border-white/5">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                Belgian payroll identification
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm col-span-2">
                  <span className="text-slate-600 dark:text-slate-300">INSZ / Rijksregisternummer</span>
                  <input className="input mt-1 tabular-nums" placeholder="11-digit national number"
                    value={editing.nissNumber || ''}
                    onChange={(e) => setEditing({ ...editing, nissNumber: e.target.value })} />
                </label>
                <label className="text-sm">
                  <span className="text-slate-600 dark:text-slate-300">Date of birth</span>
                  <input type="date" className="input mt-1"
                    value={editing.dateOfBirth || ''}
                    onChange={(e) => setEditing({ ...editing, dateOfBirth: e.target.value })} />
                </label>
                <label className="text-sm">
                  <span className="text-slate-600 dark:text-slate-300">Nationality (ISO)</span>
                  <input className="input mt-1" maxLength="2"
                    value={editing.nationality || 'BE'}
                    onChange={(e) => setEditing({ ...editing, nationality: e.target.value.toUpperCase() })} />
                </label>
                <label className="text-sm col-span-2">
                  <span className="text-slate-600 dark:text-slate-300">IBAN</span>
                  <input className="input mt-1 tabular-nums" placeholder="BE68 5390 0754 7034"
                    value={editing.iban || ''}
                    onChange={(e) => setEditing({ ...editing, iban: e.target.value.toUpperCase() })} />
                </label>
                <label className="text-sm col-span-2">
                  <span className="text-slate-600 dark:text-slate-300">Street + number</span>
                  <input className="input mt-1" value={editing.address?.street || ''}
                    onChange={(e) => setEditing({ ...editing, address: { ...(editing.address || {}), street: e.target.value } })} />
                </label>
                <label className="text-sm">
                  <span className="text-slate-600 dark:text-slate-300">Postal code</span>
                  <input className="input mt-1" value={editing.address?.postalCode || ''}
                    onChange={(e) => setEditing({ ...editing, address: { ...(editing.address || {}), postalCode: e.target.value } })} />
                </label>
                <label className="text-sm">
                  <span className="text-slate-600 dark:text-slate-300">City</span>
                  <input className="input mt-1" value={editing.address?.city || ''}
                    onChange={(e) => setEditing({ ...editing, address: { ...(editing.address || {}), city: e.target.value } })} />
                </label>
              </div>
            </div>

            {/* Ziekenfonds + extralegale voordelen */}
            <div className="col-span-2 mt-2 pt-3 border-t border-slate-200 dark:border-white/5">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                Ziekenfonds &amp; extralegale voordelen
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm col-span-2">
                  <span className="text-slate-600 dark:text-slate-300">Ziekenfonds (mutualiteit)</span>
                  <input className="input mt-1" list="mutuality-list" placeholder="bv. CM, Solidaris, Helan…"
                    value={editing.mutuality || ''}
                    onChange={(e) => setEditing({ ...editing, mutuality: e.target.value })} />
                  <datalist id="mutuality-list">
                    {MUTUALITIES.map((m) => <option key={m} value={m} />)}
                  </datalist>
                </label>

                <label className="text-sm col-span-2 inline-flex items-center gap-2">
                  <input type="checkbox" checked={!!editing.mealVouchersOptIn}
                    onChange={(e) => setEditing({ ...editing, mealVouchersOptIn: e.target.checked })} />
                  Maaltijdcheques toekennen (≥4u/dag)
                </label>
                <label className="text-sm">
                  <span className="text-slate-600 dark:text-slate-300">Cheque — werkgever (€/dag)</span>
                  <input type="number" step="0.01" className="input mt-1 tabular-nums"
                    value={editing.mealVoucherEmployerEur ?? 6.91}
                    onChange={(e) => setEditing({ ...editing, mealVoucherEmployerEur: e.target.value })} />
                </label>
                <label className="text-sm">
                  <span className="text-slate-600 dark:text-slate-300">Cheque — werknemer (€/dag)</span>
                  <input type="number" step="0.01" className="input mt-1 tabular-nums"
                    value={editing.mealVoucherEmployeeEur ?? 1.09}
                    onChange={(e) => setEditing({ ...editing, mealVoucherEmployeeEur: e.target.value })} />
                </label>

                <label className="text-sm">
                  <span className="text-slate-600 dark:text-slate-300">Kilometervergoeding (€/km)</span>
                  <input type="number" step="0.0001" className="input mt-1 tabular-nums"
                    value={editing.kmAllowanceEurPerKm ?? 0.4280}
                    onChange={(e) => setEditing({ ...editing, kmAllowanceEurPerKm: e.target.value })} />
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">Federaal tarief 2024-2025: €0,4280/km</span>
                </label>
                <label className="text-sm">
                  <span className="text-slate-600 dark:text-slate-300">Woon-werk afstand (km, retour)</span>
                  <input type="number" step="0.1" className="input mt-1 tabular-nums"
                    value={editing.commuteKm ?? 0}
                    onChange={(e) => setEditing({ ...editing, commuteKm: e.target.value })} />
                </label>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

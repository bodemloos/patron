import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { api, fmtEur } from '../api.js';
import Modal from '../components/Modal.jsx';

const STATUTE_LABELS = {
  permanent:  'Vast contract (onbepaalde duur)',
  fixed_term: 'Bepaalde duur',
  flexi_job:  'Flexi-job (horeca)',
  student:    'Student',
  extra:      'Extra / Gelegenheidsmedewerker',
  interim:    'Uitzendkracht / Interim',
  internship: 'Stage / Stagiair',
};

const STATUS_TONES = {
  draft:      'bg-slate-100 dark:bg-surface-850 text-slate-700 dark:text-slate-200',
  signed:     'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
  active:     'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
  terminated: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300',
};

const empty = {
  staff: '', statute: 'permanent', jobTitle: '', workplace: '',
  startDate: dayjs().format('YYYY-MM-DD'), endDate: '',
  hoursPerWeek: 38, hourlyRate: 0, monthlySalary: 0, extraTerms: '',
};

export default function Contracts() {
  const [staffList, setStaffList] = useState([]);
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [statuteFilter, setStatuteFilter] = useState('all');

  async function load() {
    const [c, s] = await Promise.all([api.contracts(), api.staff()]);
    setList(c);
    setStaffList(s);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => list.filter((c) =>
    (statusFilter === 'all' || c.status === statusFilter) &&
    (statuteFilter === 'all' || c.statute === statuteFilter)
  ), [list, statusFilter, statuteFilter]);

  async function save() {
    const payload = {
      ...editing,
      hoursPerWeek: Number(editing.hoursPerWeek) || 0,
      hourlyRate: Number(editing.hourlyRate) || 0,
      monthlySalary: Number(editing.monthlySalary) || 0,
      endDate: editing.endDate || null,
    };
    await api.saveContract(payload);
    setEditing(null);
    load();
  }
  async function sign(c) {
    const employerName = prompt('Employer signatory name:', '');
    if (employerName === null) return;
    const staffName = prompt('Employee signatory name (defaults to staff name):', c.staff?.name || '');
    if (staffName === null) return;
    await api.signContract(c._id, { signedByEmployerName: employerName, signedByStaffName: staffName });
    load();
  }
  async function dimona(c, direction) {
    const verb = direction === 'out' ? 'closing (Dimona OUT)' : 'opening (Dimona IN)';
    if (!confirm(`Submit ${verb} declaration to RSZ for ${c.staff?.name}?`)) return;
    try {
      const r = await api.submitDimona(c._id, direction);
      alert(`Sent. RSZ confirmation: ${r.confirmationNumber}`);
      load();
    } catch (e) { alert(e.message || 'Submission failed'); }
  }
  async function remove(c) {
    if (!confirm(`Delete this ${STATUTE_LABELS[c.statute]} for ${c.staff?.name}?`)) return;
    await api.deleteContract(c._id);
    load();
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Contracts</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Belgian employment contracts per staff member. Generate a printable document, mark signed, then submit a Dimona to RSZ.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="signed">Signed</option>
            <option value="active">Active</option>
            <option value="terminated">Terminated</option>
          </select>
          <select className="input w-auto" value={statuteFilter} onChange={(e) => setStatuteFilter(e.target.value)}>
            <option value="all">All statutes</option>
            {Object.entries(STATUTE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className="btn-primary" onClick={() => setEditing({ ...empty, staff: staffList[0]?._id || '' })}>+ New contract</button>
        </div>
      </div>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-slate-50 dark:bg-surface-950 text-slate-500 dark:text-slate-400 text-left">
              <tr>
                <th className="px-4 py-2">Staff</th>
                <th className="px-4 py-2">Statute</th>
                <th className="px-4 py-2">Period</th>
                <th className="px-4 py-2">Hours / week</th>
                <th className="px-4 py-2">Rate</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c._id} className="border-t border-slate-100 dark:border-white/5 align-top">
                  <td className="px-4 py-2">
                    <div className="font-medium">{c.staff?.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{c.jobTitle || c.staff?.role}</div>
                  </td>
                  <td className="px-4 py-2 text-xs">{STATUTE_LABELS[c.statute] || c.statute}</td>
                  <td className="px-4 py-2 text-xs tabular-nums">
                    {dayjs(c.startDate).format('DD MMM YYYY')}
                    <br />
                    {c.endDate ? dayjs(c.endDate).format('DD MMM YYYY') : <span className="text-slate-400 dark:text-slate-500">ongoing</span>}
                  </td>
                  <td className="px-4 py-2 tabular-nums">{c.hoursPerWeek}</td>
                  <td className="px-4 py-2 tabular-nums">
                    {c.monthlySalary > 0 ? `${fmtEur(c.monthlySalary)} / mo` : `${fmtEur(c.hourlyRate)} / h`}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`badge ${STATUS_TONES[c.status]}`}>{c.status}</span>
                    {c.signedAt && <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">signed {dayjs(c.signedAt).format('DD MMM')}</div>}
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <div className="inline-flex flex-wrap items-center gap-1.5">
                      <a className="text-xs px-2 py-1 rounded-lg bg-slate-100 dark:bg-surface-850 hover:bg-slate-200 dark:hover:bg-surface-700 text-slate-700 dark:text-slate-200"
                         href={api.contractDocumentUrl(c._id)} target="_blank" rel="noreferrer">Document</a>
                      {c.status === 'draft' && (
                        <button className="text-xs px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300" onClick={() => sign(c)}>Sign</button>
                      )}
                      {(c.status === 'signed' || c.status === 'draft') && (
                        <button className="text-xs px-2 py-1 rounded-lg bg-brand-50 dark:bg-brand-500/15 hover:brightness-110 text-brand-700 dark:text-brand-400" onClick={() => dimona(c, 'in')}>RSZ in</button>
                      )}
                      {c.status === 'active' && (
                        <button className="text-xs px-2 py-1 rounded-lg bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400" onClick={() => dimona(c, 'out')}>RSZ out</button>
                      )}
                      <button className="text-xs px-2 py-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100" onClick={() => setEditing({
                        ...c,
                        staff: c.staff?._id || c.staff || '',
                        startDate: c.startDate ? dayjs(c.startDate).format('YYYY-MM-DD') : '',
                        endDate: c.endDate ? dayjs(c.endDate).format('YYYY-MM-DD') : '',
                      })}>Edit</button>
                      <button className="text-xs px-2 py-1 rounded-lg text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300" onClick={() => remove(c)}>×</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan="7" className="text-center py-10 text-slate-400 dark:text-slate-500">No contracts. Create one to get started.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?._id ? 'Edit contract' : 'New contract'}
        wide
        footer={<>
          <button className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
          <button className="btn-primary" onClick={save}>Save</button>
        </>}
      >
        {editing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="col-span-2">
              <span className="text-slate-600 dark:text-slate-300">Staff member</span>
              <select className="input mt-1" value={editing.staff} onChange={(e) => setEditing({ ...editing, staff: e.target.value })}>
                <option value="">— pick —</option>
                {staffList.map((s) => <option key={s._id} value={s._id}>{s.name} · {s.role}</option>)}
              </select>
            </label>
            <label>
              <span className="text-slate-600 dark:text-slate-300">Statute</span>
              <select className="input mt-1" value={editing.statute} onChange={(e) => setEditing({ ...editing, statute: e.target.value })}>
                {Object.entries(STATUTE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label>
              <span className="text-slate-600 dark:text-slate-300">Job title</span>
              <input className="input mt-1" value={editing.jobTitle} onChange={(e) => setEditing({ ...editing, jobTitle: e.target.value })} />
            </label>
            <label>
              <span className="text-slate-600 dark:text-slate-300">Start date</span>
              <input type="date" className="input mt-1" value={editing.startDate} onChange={(e) => setEditing({ ...editing, startDate: e.target.value })} />
            </label>
            <label>
              <span className="text-slate-600 dark:text-slate-300">End date (blank = ongoing)</span>
              <input type="date" className="input mt-1" value={editing.endDate || ''} onChange={(e) => setEditing({ ...editing, endDate: e.target.value })} />
            </label>
            <label>
              <span className="text-slate-600 dark:text-slate-300">Hours / week</span>
              <input type="number" className="input mt-1" min="0" max="60" value={editing.hoursPerWeek} onChange={(e) => setEditing({ ...editing, hoursPerWeek: e.target.value })} />
            </label>
            <label>
              <span className="text-slate-600 dark:text-slate-300">Workplace</span>
              <input className="input mt-1" value={editing.workplace || ''} onChange={(e) => setEditing({ ...editing, workplace: e.target.value })} />
            </label>
            <label>
              <span className="text-slate-600 dark:text-slate-300">Hourly rate (€)</span>
              <input type="number" step="0.01" className="input mt-1" value={editing.hourlyRate} onChange={(e) => setEditing({ ...editing, hourlyRate: e.target.value })} />
            </label>
            <label>
              <span className="text-slate-600 dark:text-slate-300">Monthly salary (€) — optional</span>
              <input type="number" step="1" className="input mt-1" value={editing.monthlySalary} onChange={(e) => setEditing({ ...editing, monthlySalary: e.target.value })} />
            </label>
            <label className="col-span-2">
              <span className="text-slate-600 dark:text-slate-300">Extra clauses (Dutch / French / English)</span>
              <textarea className="input mt-1" rows="3" value={editing.extraTerms} onChange={(e) => setEditing({ ...editing, extraTerms: e.target.value })}
                placeholder="Optional clauses appended to the standard contract template." />
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}

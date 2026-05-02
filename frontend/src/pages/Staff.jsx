import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { api, fmtEur } from '../api.js';
import Modal from '../components/Modal.jsx';

const empty = {
  name: '', role: 'waiter', email: '', phone: '', hourlyRate: 14, active: true,
  // Belgian payroll / RSZ fields — optional in the UI but required to
  // submit a valid Dimona for this staff member.
  nissNumber: '', dateOfBirth: '', nationality: 'BE', iban: '',
  address: { street: '', postalCode: '', city: '', country: 'BE' },
};

export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [period, setPeriod] = useState({
    from: dayjs().startOf('month').format('YYYY-MM-DD'),
    to: dayjs().endOf('month').format('YYYY-MM-DD'),
  });
  const [payroll, setPayroll] = useState(null);

  async function load() {
    const [st, sh] = await Promise.all([api.staff(), api.shifts()]);
    setStaff(st);
    setShifts(sh);
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
    });
    setEditing(null);
    load();
  }

  async function remove(id) {
    if (!confirm('Delete staff member?')) return;
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
        <h1 className="text-xl sm:text-2xl font-semibold">Staff</h1>
        <button className="btn-primary" onClick={() => setEditing({ ...empty })}>
          <span className="hidden sm:inline">+ Staff member</span>
          <span className="sm:hidden">+ Staff</span>
        </button>
      </div>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-slate-50 dark:bg-surface-950 text-slate-500 dark:text-slate-400 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Hourly rate</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Email</th>
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
              <tr><td colSpan="6" className="text-center py-8 text-slate-400 dark:text-slate-500">No staff yet.</td></tr>
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
        <table className="w-full text-sm min-w-[500px]">
          <thead className="bg-slate-50 dark:bg-surface-950 text-slate-500 dark:text-slate-400 text-left">
            <tr>
              <th className="px-4 py-2">Staff</th>
              <th className="px-4 py-2">Shifts</th>
              <th className="px-4 py-2">Hours</th>
              <th className="px-4 py-2">Pay</th>
            </tr>
          </thead>
          <tbody>
            {(payroll?.rows || []).map((r) => (
              <tr key={r.staff._id} className="border-t border-slate-100 dark:border-white/5">
                <td className="px-4 py-2 font-medium">{r.staff.name}</td>
                <td className="px-4 py-2">{r.shifts}</td>
                <td className="px-4 py-2">{r.hours.toFixed(1)}</td>
                <td className="px-4 py-2 font-semibold">{fmtEur(r.pay)}</td>
              </tr>
            ))}
            {!payroll?.rows?.length && (
              <tr><td colSpan="4" className="text-center py-8 text-slate-400 dark:text-slate-500">No paid shifts in this period.</td></tr>
            )}
          </tbody>
          {payroll?.rows?.length > 0 && (
            <tfoot>
              <tr className="bg-slate-50 dark:bg-surface-950 font-semibold">
                <td className="px-4 py-2">Total</td>
                <td className="px-4 py-2">{payroll.rows.reduce((s, r) => s + r.shifts, 0)}</td>
                <td className="px-4 py-2">{payroll.rows.reduce((s, r) => s + r.hours, 0).toFixed(1)}</td>
                <td className="px-4 py-2">{fmtEur(payroll.rows.reduce((s, r) => s + r.pay, 0))}</td>
              </tr>
            </tfoot>
          )}
        </table>
        </div>
      </section>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?._id ? 'Edit staff member' : 'New staff member'}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn-primary" onClick={save}>Save</button>
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
          </div>
        )}
      </Modal>
    </div>
  );
}

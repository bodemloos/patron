import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import Modal from '../components/Modal.jsx';
import dayjs from 'dayjs';

const TABS = [
  { id: 'temperatures', label: 'Temperatures' },
  { id: 'cleaning',     label: 'Cleaning' },
  { id: 'receiving',    label: 'Deliveries' },
  { id: 'setup',        label: 'Setup' },
];

const TYPE_LABEL = {
  fridge:        'Fridge',
  freezer:       'Freezer',
  'hot-holding': 'Hot-holding',
  other:         'Other',
};

const FREQ_LABEL = {
  daily:   'Daily',
  weekly:  'Weekly',
  monthly: 'Monthly',
};

// Heuristic for cleaning overdue: daily >36h, weekly >9d, monthly >35d.
const OVERDUE_HOURS = { daily: 36, weekly: 9 * 24, monthly: 35 * 24 };

export default function Haccp() {
  const [tab, setTab] = useState('temperatures');
  return (
    <div className="p-3 sm:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-semibold">HACCP-registratie</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Temperatuur-, schoonmaak- en leveringscontroles voor FAVV/AFSCA-conforme registratie.
          </p>
        </div>
      </div>

      <div className="flex gap-1 mb-4 border-b border-slate-200 dark:border-white/5 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              'px-3 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap',
              tab === t.id
                ? 'border-brand-500 text-brand-700 dark:text-brand-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'temperatures' && <TemperaturesTab />}
      {tab === 'cleaning'     && <CleaningTab />}
      {tab === 'receiving'    && <ReceivingTab />}
      {tab === 'setup'        && <SetupTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Temperatures tab
// ---------------------------------------------------------------------------

function TemperaturesTab() {
  const [equipment, setEquipment] = useState([]);
  const [logs, setLogs] = useState([]);
  const [staff, setStaff] = useState([]);
  const [filterEquipment, setFilterEquipment] = useState('');
  const [recording, setRecording] = useState(null);

  async function load() {
    const [eq, list, st] = await Promise.all([
      api.haccpEquipment(),
      api.haccpTemperatureLogs(filterEquipment ? `equipment=${filterEquipment}&limit=100` : 'limit=100'),
      api.staff(),
    ]);
    setEquipment(eq);
    setLogs(list);
    setStaff(st);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filterEquipment]);

  function startRecord(eq) {
    setRecording({
      equipment: eq._id,
      equipmentRef: eq,
      temperatureC: '',
      recordedAt: dayjs().format('YYYY-MM-DDTHH:mm'),
      recordedBy: '',
      correctiveAction: '',
      notes: '',
    });
  }

  async function saveRecord() {
    const r = recording;
    await api.recordHaccpTemperature({
      equipment: r.equipment,
      recordedAt: r.recordedAt ? new Date(r.recordedAt).toISOString() : undefined,
      recordedBy: r.recordedBy || undefined,
      temperatureC: Number(r.temperatureC),
      correctiveAction: r.correctiveAction || '',
      notes: r.notes || '',
    });
    setRecording(null);
    load();
  }

  async function remove(id) {
    if (!confirm('Delete this reading?')) return;
    await api.deleteHaccpTemperatureLog(id);
    load();
  }

  const tempC = Number(recording?.temperatureC);
  const outOfRange = recording?.equipmentRef && Number.isFinite(tempC) &&
    (tempC < recording.equipmentRef.minTempC || tempC > recording.equipmentRef.maxTempC);

  return (
    <>
      <section className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Equipment</h2>
          <span className="text-xs text-slate-400 dark:text-slate-500">Tap a unit to register a reading</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {equipment.map((eq) => {
            const last = logs.find((l) => l.equipment?._id === eq._id);
            const stale = !last || dayjs().diff(dayjs(last.recordedAt), 'hour') >= 24;
            return (
              <button
                key={eq._id}
                onClick={() => startRecord(eq)}
                className="text-left p-3 rounded-lg border border-slate-200 dark:border-white/5 bg-white dark:bg-surface-900 hover:border-brand-500 dark:hover:border-brand-400 transition"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium truncate">{eq.name}</div>
                  <span className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{TYPE_LABEL[eq.type]}</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Target {eq.minTempC}–{eq.maxTempC} °C{eq.location ? ` · ${eq.location}` : ''}
                </div>
                <div className="mt-2 text-xs">
                  {last ? (
                    <span className={last.inRange ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                      Last: {last.temperatureC} °C · {dayjs(last.recordedAt).format('DD MMM HH:mm')}
                      {stale ? ' · stale' : ''}
                    </span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500">No readings yet</span>
                  )}
                </div>
              </button>
            );
          })}
          {!equipment.length && (
            <div className="col-span-full text-sm text-slate-400 dark:text-slate-500 py-6 text-center">
              No equipment configured. Add fridges, freezers, or hot-hold units in the Setup tab.
            </div>
          )}
        </div>
      </section>

      <section className="card p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-semibold">Temperature log</h2>
          <select
            className="input text-sm"
            value={filterEquipment}
            onChange={(e) => setFilterEquipment(e.target.value)}
          >
            <option value="">All equipment</option>
            {equipment.map((eq) => <option key={eq._id} value={eq._id}>{eq.name}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-2">When</th>
                <th>Equipment</th>
                <th>Reading</th>
                <th>By</th>
                <th>Notes / corrective action</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l._id} className="border-t border-slate-200 dark:border-white/5">
                  <td className="py-2 whitespace-nowrap">{dayjs(l.recordedAt).format('DD MMM YYYY HH:mm')}</td>
                  <td>{l.equipment?.name || '—'}</td>
                  <td className={l.inRange ? '' : 'text-red-600 dark:text-red-400 font-medium'}>
                    {l.temperatureC} °C{l.inRange ? '' : ' ⚠'}
                  </td>
                  <td>{l.recordedBy?.name || '—'}</td>
                  <td className="text-xs text-slate-600 dark:text-slate-400">
                    {l.correctiveAction && <div><b>Action:</b> {l.correctiveAction}</div>}
                    {l.notes}
                  </td>
                  <td className="text-right">
                    <button onClick={() => remove(l._id)} className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 text-xs">Delete</button>
                  </td>
                </tr>
              ))}
              {!logs.length && (
                <tr><td colSpan={6} className="py-6 text-center text-slate-400 dark:text-slate-500">No readings yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        open={!!recording}
        onClose={() => setRecording(null)}
        title={recording ? `Register reading — ${recording.equipmentRef.name}` : ''}
        footer={(
          <>
            <button className="btn-ghost" onClick={() => setRecording(null)}>Cancel</button>
            <button
              className="btn-primary"
              onClick={saveRecord}
              disabled={recording?.temperatureC === '' || !Number.isFinite(Number(recording?.temperatureC))}
            >
              Save reading
            </button>
          </>
        )}
      >
        {recording && (
          <div className="space-y-3">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Target range {recording.equipmentRef.minTempC}–{recording.equipmentRef.maxTempC} °C
            </div>
            <Field label="Temperature (°C)">
              <input
                type="number" step="0.1" autoFocus
                className="input"
                value={recording.temperatureC}
                onChange={(e) => setRecording({ ...recording, temperatureC: e.target.value })}
              />
            </Field>
            {outOfRange && (
              <div className="text-xs px-3 py-2 rounded-md bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900">
                Out of range — record a corrective action below.
              </div>
            )}
            <Field label="Recorded at">
              <input
                type="datetime-local"
                className="input"
                value={recording.recordedAt}
                onChange={(e) => setRecording({ ...recording, recordedAt: e.target.value })}
              />
            </Field>
            <Field label="Recorded by">
              <select
                className="input"
                value={recording.recordedBy}
                onChange={(e) => setRecording({ ...recording, recordedBy: e.target.value })}
              >
                <option value="">—</option>
                {staff.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </Field>
            {outOfRange && (
              <Field label="Corrective action">
                <textarea
                  rows={2}
                  className="input"
                  placeholder="e.g. moved goods, called fridge engineer, increased thermostat setting"
                  value={recording.correctiveAction}
                  onChange={(e) => setRecording({ ...recording, correctiveAction: e.target.value })}
                />
              </Field>
            )}
            <Field label="Notes">
              <textarea
                rows={2}
                className="input"
                value={recording.notes}
                onChange={(e) => setRecording({ ...recording, notes: e.target.value })}
              />
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Cleaning tab
// ---------------------------------------------------------------------------

function CleaningTab() {
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [staff, setStaff] = useState([]);
  const [recording, setRecording] = useState(null);

  async function load() {
    const [t, l, st] = await Promise.all([
      api.haccpCleaningTasks(),
      api.haccpCleaningLogs('limit=100'),
      api.staff(),
    ]);
    setTasks(t);
    setLogs(l);
    setStaff(st);
  }
  useEffect(() => { load(); }, []);

  function startRecord(task) {
    setRecording({
      task: task._id,
      taskRef: task,
      completedAt: dayjs().format('YYYY-MM-DDTHH:mm'),
      completedBy: '',
      notes: '',
    });
  }

  async function saveRecord() {
    await api.recordHaccpCleaning({
      task: recording.task,
      completedAt: recording.completedAt ? new Date(recording.completedAt).toISOString() : undefined,
      completedBy: recording.completedBy || undefined,
      notes: recording.notes || '',
    });
    setRecording(null);
    load();
  }

  async function remove(id) {
    if (!confirm('Delete this entry?')) return;
    await api.deleteHaccpCleaningLog(id);
    load();
  }

  return (
    <>
      <section className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Cleaning checklist</h2>
          <span className="text-xs text-slate-400 dark:text-slate-500">Tap to mark done</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {tasks.map((t) => {
            const since = t.lastCompletedAt ? dayjs().diff(dayjs(t.lastCompletedAt), 'hour') : Infinity;
            const overdue = since > OVERDUE_HOURS[t.frequency];
            return (
              <button
                key={t._id}
                onClick={() => startRecord(t)}
                className={[
                  'text-left p-3 rounded-lg border bg-white dark:bg-surface-900 hover:border-brand-500 dark:hover:border-brand-400 transition',
                  overdue ? 'border-red-300 dark:border-red-900' : 'border-slate-200 dark:border-white/5',
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium truncate">{t.name}</div>
                  <span className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{FREQ_LABEL[t.frequency]}</span>
                </div>
                {t.area && <div className="text-xs text-slate-500 dark:text-slate-400">{t.area}</div>}
                <div className={['mt-2 text-xs', overdue ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'].join(' ')}>
                  {t.lastCompletedAt
                    ? `Last: ${dayjs(t.lastCompletedAt).format('DD MMM HH:mm')}${overdue ? ' · overdue' : ''}`
                    : 'Never logged'}
                </div>
              </button>
            );
          })}
          {!tasks.length && (
            <div className="col-span-full text-sm text-slate-400 dark:text-slate-500 py-6 text-center">
              No cleaning tasks yet. Add some in the Setup tab.
            </div>
          )}
        </div>
      </section>

      <section className="card p-4">
        <h2 className="font-semibold mb-3">Cleaning log</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-2">When</th>
                <th>Task</th>
                <th>Area</th>
                <th>By</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l._id} className="border-t border-slate-200 dark:border-white/5">
                  <td className="py-2 whitespace-nowrap">{dayjs(l.completedAt).format('DD MMM YYYY HH:mm')}</td>
                  <td>{l.task?.name || '—'}</td>
                  <td className="text-slate-500 dark:text-slate-400">{l.task?.area || '—'}</td>
                  <td>{l.completedBy?.name || '—'}</td>
                  <td className="text-xs text-slate-600 dark:text-slate-400">{l.notes}</td>
                  <td className="text-right">
                    <button onClick={() => remove(l._id)} className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 text-xs">Delete</button>
                  </td>
                </tr>
              ))}
              {!logs.length && (
                <tr><td colSpan={6} className="py-6 text-center text-slate-400 dark:text-slate-500">No entries yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        open={!!recording}
        onClose={() => setRecording(null)}
        title={recording ? `Mark done — ${recording.taskRef.name}` : ''}
        footer={(
          <>
            <button className="btn-ghost" onClick={() => setRecording(null)}>Cancel</button>
            <button className="btn-primary" onClick={saveRecord}>Save</button>
          </>
        )}
      >
        {recording && (
          <div className="space-y-3">
            <Field label="Completed at">
              <input
                type="datetime-local"
                className="input"
                value={recording.completedAt}
                onChange={(e) => setRecording({ ...recording, completedAt: e.target.value })}
              />
            </Field>
            <Field label="By">
              <select
                className="input"
                value={recording.completedBy}
                onChange={(e) => setRecording({ ...recording, completedBy: e.target.value })}
              >
                <option value="">—</option>
                {staff.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Notes">
              <textarea rows={2} className="input"
                value={recording.notes}
                onChange={(e) => setRecording({ ...recording, notes: e.target.value })}
              />
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Receiving (deliveries) tab
// ---------------------------------------------------------------------------

const emptyReceiving = () => ({
  receivedAt: dayjs().format('YYYY-MM-DDTHH:mm'),
  receivedBy: '',
  supplier: '',
  itemsSummary: '',
  temperatureC: '',
  packagingOk: true,
  expiryOk: true,
  correctiveAction: '',
  notes: '',
});

function ReceivingTab() {
  const [logs, setLogs] = useState([]);
  const [staff, setStaff] = useState([]);
  const [recording, setRecording] = useState(null);

  async function load() {
    const [l, st] = await Promise.all([
      api.haccpReceivingLogs('limit=100'),
      api.staff(),
    ]);
    setLogs(l);
    setStaff(st);
  }
  useEffect(() => { load(); }, []);

  async function saveRecord() {
    const body = { ...recording };
    if (body.receivedAt) body.receivedAt = new Date(body.receivedAt).toISOString();
    if (body.temperatureC === '') delete body.temperatureC;
    else body.temperatureC = Number(body.temperatureC);
    if (!body.receivedBy) delete body.receivedBy;
    await api.recordHaccpReceiving(body);
    setRecording(null);
    load();
  }

  async function remove(id) {
    if (!confirm('Delete this delivery entry?')) return;
    await api.deleteHaccpReceivingLog(id);
    load();
  }

  const failed = recording && (!recording.packagingOk || !recording.expiryOk);

  return (
    <>
      <section className="card p-4 mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Incoming goods</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Register supplier, condition and cold-chain temperature on every delivery.</p>
        </div>
        <button className="btn-primary" onClick={() => setRecording(emptyReceiving())}>+ Register delivery</button>
      </section>

      <section className="card p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-2">When</th>
                <th>Supplier</th>
                <th>Items</th>
                <th>Temp</th>
                <th>Pack</th>
                <th>Expiry</th>
                <th>By</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l._id} className="border-t border-slate-200 dark:border-white/5">
                  <td className="py-2 whitespace-nowrap">{dayjs(l.receivedAt).format('DD MMM YYYY HH:mm')}</td>
                  <td>{l.supplier}</td>
                  <td className="text-slate-600 dark:text-slate-400 max-w-xs truncate" title={l.itemsSummary}>{l.itemsSummary || '—'}</td>
                  <td>{l.temperatureC == null ? '—' : `${l.temperatureC} °C`}</td>
                  <td>{l.packagingOk
                    ? <span className="text-emerald-600 dark:text-emerald-400">OK</span>
                    : <span className="text-red-600 dark:text-red-400">FAIL</span>}</td>
                  <td>{l.expiryOk
                    ? <span className="text-emerald-600 dark:text-emerald-400">OK</span>
                    : <span className="text-red-600 dark:text-red-400">FAIL</span>}</td>
                  <td>{l.receivedBy?.name || '—'}</td>
                  <td className="text-right">
                    <button onClick={() => remove(l._id)} className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 text-xs">Delete</button>
                  </td>
                </tr>
              ))}
              {!logs.length && (
                <tr><td colSpan={8} className="py-6 text-center text-slate-400 dark:text-slate-500">No deliveries yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        open={!!recording}
        onClose={() => setRecording(null)}
        title="Register delivery"
        wide
        footer={(
          <>
            <button className="btn-ghost" onClick={() => setRecording(null)}>Cancel</button>
            <button className="btn-primary" onClick={saveRecord} disabled={!recording?.supplier?.trim()}>Save</button>
          </>
        )}
      >
        {recording && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Supplier">
              <input className="input" autoFocus
                value={recording.supplier}
                onChange={(e) => setRecording({ ...recording, supplier: e.target.value })}
              />
            </Field>
            <Field label="Received at">
              <input
                type="datetime-local"
                className="input"
                value={recording.receivedAt}
                onChange={(e) => setRecording({ ...recording, receivedAt: e.target.value })}
              />
            </Field>
            <Field label="Items / lots">
              <textarea rows={2} className="input"
                placeholder="e.g. 2× kalfslever 5kg, 1× zalmfilet 3kg"
                value={recording.itemsSummary}
                onChange={(e) => setRecording({ ...recording, itemsSummary: e.target.value })}
              />
            </Field>
            <Field label="Temperature (°C, cold chain)">
              <input type="number" step="0.1" className="input"
                placeholder="leave empty for ambient"
                value={recording.temperatureC}
                onChange={(e) => setRecording({ ...recording, temperatureC: e.target.value })}
              />
            </Field>
            <Field label="Packaging OK">
              <select className="input"
                value={recording.packagingOk ? '1' : '0'}
                onChange={(e) => setRecording({ ...recording, packagingOk: e.target.value === '1' })}
              >
                <option value="1">Yes</option>
                <option value="0">No — damaged</option>
              </select>
            </Field>
            <Field label="Expiry / lot OK">
              <select className="input"
                value={recording.expiryOk ? '1' : '0'}
                onChange={(e) => setRecording({ ...recording, expiryOk: e.target.value === '1' })}
              >
                <option value="1">Yes</option>
                <option value="0">No — short-dated / past</option>
              </select>
            </Field>
            <Field label="Received by">
              <select className="input"
                value={recording.receivedBy}
                onChange={(e) => setRecording({ ...recording, receivedBy: e.target.value })}
              >
                <option value="">—</option>
                {staff.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </Field>
            {failed && (
              <Field label="Corrective action" full>
                <textarea rows={2} className="input"
                  placeholder="e.g. refused delivery, isolated batch, contacted supplier"
                  value={recording.correctiveAction}
                  onChange={(e) => setRecording({ ...recording, correctiveAction: e.target.value })}
                />
              </Field>
            )}
            <Field label="Notes" full>
              <textarea rows={2} className="input"
                value={recording.notes}
                onChange={(e) => setRecording({ ...recording, notes: e.target.value })}
              />
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Setup tab — equipment + cleaning tasks
// ---------------------------------------------------------------------------

const emptyEquipment = { name: '', type: 'fridge', location: '', minTempC: 0, maxTempC: 7, active: true, sortOrder: 0 };
const emptyTask = { name: '', area: '', frequency: 'daily', active: true, sortOrder: 0 };

function SetupTab() {
  const [equipment, setEquipment] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [editEq, setEditEq] = useState(null);
  const [editTask, setEditTask] = useState(null);

  async function load() {
    const [eq, t] = await Promise.all([
      api.haccpEquipment(true),
      api.haccpCleaningTasks(true),
    ]);
    setEquipment(eq);
    setTasks(t);
  }
  useEffect(() => { load(); }, []);

  async function saveEq() {
    await api.saveHaccpEquipment({
      ...editEq,
      minTempC: Number(editEq.minTempC) || 0,
      maxTempC: Number(editEq.maxTempC) || 0,
      sortOrder: Number(editEq.sortOrder) || 0,
    });
    setEditEq(null);
    load();
  }

  async function deleteEq(id) {
    if (!confirm('Delete equipment?')) return;
    await api.deleteHaccpEquipment(id);
    load();
  }

  async function saveTask() {
    await api.saveHaccpCleaningTask({
      ...editTask,
      sortOrder: Number(editTask.sortOrder) || 0,
    });
    setEditTask(null);
    load();
  }

  async function deleteTask(id) {
    if (!confirm('Delete cleaning task?')) return;
    await api.deleteHaccpCleaningTask(id);
    load();
  }

  return (
    <>
      <section className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Equipment</h2>
          <button className="btn-primary" onClick={() => setEditEq({ ...emptyEquipment })}>+ Add equipment</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr><th className="py-2">Name</th><th>Type</th><th>Location</th><th>Range</th><th>Active</th><th></th></tr>
            </thead>
            <tbody>
              {equipment.map((eq) => (
                <tr key={eq._id} className="border-t border-slate-200 dark:border-white/5">
                  <td className="py-2 font-medium">{eq.name}</td>
                  <td>{TYPE_LABEL[eq.type]}</td>
                  <td className="text-slate-500 dark:text-slate-400">{eq.location || '—'}</td>
                  <td>{eq.minTempC}–{eq.maxTempC} °C</td>
                  <td>{eq.active ? 'Yes' : 'No'}</td>
                  <td className="text-right whitespace-nowrap">
                    <button onClick={() => setEditEq(eq)} className="text-brand-600 dark:text-brand-400 text-xs mr-3">Edit</button>
                    <button onClick={() => deleteEq(eq._id)} className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 text-xs">Delete</button>
                  </td>
                </tr>
              ))}
              {!equipment.length && (
                <tr><td colSpan={6} className="py-6 text-center text-slate-400 dark:text-slate-500">No equipment yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Cleaning tasks</h2>
          <button className="btn-primary" onClick={() => setEditTask({ ...emptyTask })}>+ Add task</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr><th className="py-2">Name</th><th>Area</th><th>Frequency</th><th>Active</th><th></th></tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t._id} className="border-t border-slate-200 dark:border-white/5">
                  <td className="py-2 font-medium">{t.name}</td>
                  <td className="text-slate-500 dark:text-slate-400">{t.area || '—'}</td>
                  <td>{FREQ_LABEL[t.frequency]}</td>
                  <td>{t.active ? 'Yes' : 'No'}</td>
                  <td className="text-right whitespace-nowrap">
                    <button onClick={() => setEditTask(t)} className="text-brand-600 dark:text-brand-400 text-xs mr-3">Edit</button>
                    <button onClick={() => deleteTask(t._id)} className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 text-xs">Delete</button>
                  </td>
                </tr>
              ))}
              {!tasks.length && (
                <tr><td colSpan={5} className="py-6 text-center text-slate-400 dark:text-slate-500">No tasks yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        open={!!editEq}
        onClose={() => setEditEq(null)}
        title={editEq?._id ? 'Edit equipment' : 'New equipment'}
        footer={(
          <>
            <button className="btn-ghost" onClick={() => setEditEq(null)}>Cancel</button>
            <button className="btn-primary" onClick={saveEq} disabled={!editEq?.name?.trim()}>Save</button>
          </>
        )}
      >
        {editEq && (
          <div className="space-y-3">
            <Field label="Name">
              <input className="input" autoFocus
                value={editEq.name}
                onChange={(e) => setEditEq({ ...editEq, name: e.target.value })}
              />
            </Field>
            <Field label="Type">
              <select className="input"
                value={editEq.type}
                onChange={(e) => setEditEq({ ...editEq, type: e.target.value })}
              >
                {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Location">
              <input className="input"
                value={editEq.location}
                onChange={(e) => setEditEq({ ...editEq, location: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Min °C">
                <input type="number" step="0.1" className="input"
                  value={editEq.minTempC}
                  onChange={(e) => setEditEq({ ...editEq, minTempC: e.target.value })}
                />
              </Field>
              <Field label="Max °C">
                <input type="number" step="0.1" className="input"
                  value={editEq.maxTempC}
                  onChange={(e) => setEditEq({ ...editEq, maxTempC: e.target.value })}
                />
              </Field>
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox"
                checked={!!editEq.active}
                onChange={(e) => setEditEq({ ...editEq, active: e.target.checked })}
              />
              Active
            </label>
          </div>
        )}
      </Modal>

      <Modal
        open={!!editTask}
        onClose={() => setEditTask(null)}
        title={editTask?._id ? 'Edit cleaning task' : 'New cleaning task'}
        footer={(
          <>
            <button className="btn-ghost" onClick={() => setEditTask(null)}>Cancel</button>
            <button className="btn-primary" onClick={saveTask} disabled={!editTask?.name?.trim()}>Save</button>
          </>
        )}
      >
        {editTask && (
          <div className="space-y-3">
            <Field label="Name">
              <input className="input" autoFocus
                value={editTask.name}
                onChange={(e) => setEditTask({ ...editTask, name: e.target.value })}
              />
            </Field>
            <Field label="Area">
              <input className="input"
                value={editTask.area}
                onChange={(e) => setEditTask({ ...editTask, area: e.target.value })}
              />
            </Field>
            <Field label="Frequency">
              <select className="input"
                value={editTask.frequency}
                onChange={(e) => setEditTask({ ...editTask, frequency: e.target.value })}
              >
                {Object.entries(FREQ_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox"
                checked={!!editTask.active}
                onChange={(e) => setEditTask({ ...editTask, active: e.target.checked })}
              />
              Active
            </label>
          </div>
        )}
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Field({ label, children, full }) {
  return (
    <label className={['block', full ? 'sm:col-span-2' : ''].join(' ')}>
      <span className="block text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">{label}</span>
      {children}
    </label>
  );
}

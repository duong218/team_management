import { useEffect, useState } from 'react'
import { CalendarClock, Save } from 'lucide-react'
import { toDueISO, vnDateTimeLocal } from '../../lib/format'
import { ErrorBox } from '../common'

const initialNow = Date.now()

export default function TaskDeadlineEditor({ task, busy, onSave }) {
  const initial = vnDateTimeLocal(task.han_chot)
  const [now, setNow] = useState(initialNow)
  const [open, setOpen] = useState(false)
  const [due, setDue] = useState(initial)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const nextDue = toDueISO(due)
  const changed = nextDue === null ? task.han_chot !== null : Date.parse(nextDue) !== Date.parse(task.han_chot)
  const dueInPast = !!nextDue && Date.parse(nextDue) <= now
  const minimumDue = vnDateTimeLocal(new Date(now + 60_000))

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000)
    return () => window.clearInterval(timer)
  }, [])

  async function submit(event) {
    event.preventDefault()
    if (!changed || reason.trim().length < 10) return
    if (dueInPast) {
      setError('Hạn chót phải là thời gian trong tương lai.')
      return
    }
    setError('')
    try {
      const saved = await onSave(due, reason.trim())
      if (saved) {
        setOpen(false)
        setReason('')
      }
    } catch (cause) {
      setError(cause.message || 'Không thể cập nhật hạn chót.')
    }
  }

  return <details className="td-deadline-editor" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary><CalendarClock size={16} /> Chỉnh hạn chót</summary>
    <form onSubmit={submit}>
      <fieldset className="td-deadline-fields">
        <legend>Hạn chót mới (giờ Việt Nam)</legend>
        <label>Ngày<input type="date" min={minimumDue.slice(0, 10)} value={due.slice(0, 10)} onChange={(event) => setDue(event.target.value ? `${event.target.value}T${due.slice(11, 16) || '23:59'}` : '')} /></label>
        <label>Giờ<input type="time" step="60" value={due.slice(11, 16)} disabled={!due} onChange={(event) => setDue(`${due.slice(0, 10)}T${event.target.value}`)} /></label>
      </fieldset>
      {changed && dueInPast && <small className="td-deadline-error" role="alert">Hạn chót phải là thời gian trong tương lai.</small>}
      <label>Lý do (bắt buộc, 10–1000 ký tự)<textarea required minLength={10} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      {error && <ErrorBox message={error} />}
      <button className="primary" disabled={busy || !changed || dueInPast || reason.trim().length < 10}><Save size={16} /> Lưu hạn chót</button>
    </form>
  </details>
}

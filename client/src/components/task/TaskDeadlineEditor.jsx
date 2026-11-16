import { useEffect, useState } from 'react'
import { CalendarClock, Save } from 'lucide-react'
import { toDueISO, vnDateTimeLocal } from '../../lib/format'
import { ErrorBox } from '../common'

export default function TaskDeadlineEditor({ task, busy, onSave }) {
  const initial = vnDateTimeLocal(task.han_chot)
  const [now, setNow] = useState(Date.now())
  const [open, setOpen] = useState(false)
  const [due, setDue] = useState(initial)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const nextDue = toDueISO(due)
  const changed = nextDue === null ? task.han_chot !== null : Date.parse(nextDue) !== Date.parse(task.han_chot)
  const dueInPast = !!nextDue && Date.parse(nextDue) <= now
  const minimumDue = vnDateTimeLocal(new Date(now + 60_000))

  useEffect(() => {
    setDue(vnDateTimeLocal(task.han_chot))
    setReason('')
    setError('')
    setOpen(false)
  }, [task.id, task.han_chot])

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
      <label>Hạn chót mới (giờ Việt Nam)<input type="datetime-local" min={minimumDue} value={due} onChange={(event) => setDue(event.target.value)} /></label>
      {changed && dueInPast && <small className="td-deadline-error" role="alert">Hạn chót phải là thời gian trong tương lai.</small>}
      <label>Lý do (bắt buộc, 10–1000 ký tự)<textarea required minLength={10} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      {error && <ErrorBox message={error} />}
      <button className="primary" disabled={busy || !changed || dueInPast || reason.trim().length < 10}><Save size={16} /> Lưu hạn chót</button>
    </form>
  </details>
}

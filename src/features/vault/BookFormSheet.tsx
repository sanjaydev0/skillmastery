import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Book, ResourceStatus } from '../../types/schema'
import { useActiveSubject, useAppStore } from '../../store/AppStore'
import { useUiStore } from '../../store/uiStore'
import { Sheet } from '../../components/ui/Sheet'
import { Button, Field, InlineError } from '../../components/ui/primitives'

export function BookFormSheet({ book, onClose }: { book?: Book; onClose: () => void }) {
  const subject = useActiveSubject()
  const addBook = useAppStore((state) => state.addBook)
  const updateBook = useAppStore((state) => state.updateBook)
  const deleteBook = useAppStore((state) => state.deleteBook)
  const toast = useUiStore((state) => state.toast)

  const [title, setTitle] = useState(book?.title ?? '')
  const [author, setAuthor] = useState(book?.author ?? '')
  const [pillar, setPillar] = useState(book?.pillar ?? 'Custom canon')
  const [url, setUrl] = useState(book?.url ?? '')
  const [totalChapters, setTotalChapters] = useState(book?.totalChapters ?? 12)
  const [currentChapter, setCurrentChapter] = useState(book?.currentChapter ?? 0)
  const [weekFrom, setWeekFrom] = useState(book?.weekFrom ?? 1)
  const [weekTo, setWeekTo] = useState(book?.weekTo ?? Math.max(24, subject.weeks.length))
  const [status, setStatus] = useState<ResourceStatus>(book?.status ?? 'toRead')
  const [error, setError] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!title.trim() || !author.trim()) {
      setError('Title and author are required.')
      return
    }
    if (url.trim() && !/^https?:\/\//.test(url.trim())) {
      setError('Use a full https:// URL, or leave it empty.')
      return
    }
    const total = Math.max(0, Math.floor(totalChapters))
    const current = Math.min(total, Math.max(0, Math.floor(currentChapter)))
    if (book) {
      updateBook(book.id, {
        title: title.trim(),
        author: author.trim(),
        pillar: pillar.trim() || 'Custom canon',
        url: url.trim(),
        totalChapters: total,
        currentChapter: current,
        weekFrom: Math.max(1, Math.floor(weekFrom)),
        weekTo: Math.max(Math.max(1, Math.floor(weekFrom)), Math.floor(weekTo)),
        status,
      })
      toast('Book updated.', 'success')
      onClose()
      return
    }
    addBook({
      title: title.trim(),
      author: author.trim(),
      pillar: pillar.trim() || 'Custom canon',
      url: url.trim(),
      totalChapters: total,
      weekFrom: Math.max(1, Math.floor(weekFrom)),
      weekTo: Math.max(Math.max(1, Math.floor(weekFrom)), Math.floor(weekTo)),
    })
    toast(`“${title.trim()}” added to the canon.`, 'success')
    onClose()
  }

  return (
    <Sheet
      title={book ? 'Edit canon book' : 'Add to the 30-minute canon'}
      eyebrow="Shared across every track"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="book-form">
            {book ? 'Save book' : 'Add book'}
          </Button>
        </>
      }
    >
      <form id="book-form" onSubmit={submit} className="space-y-4">
        <div className="rounded-xl border border-accent/25 bg-accent-soft p-3 text-[12px] leading-relaxed text-t2">
          The canon is shared because reading progress belongs to you, not to a technology track. Assign a
          30-minute daily block and advance one chapter at a time.
        </div>
        <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
          <Field label="Title">
            <input
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="The Design of Everyday Things"
              data-autofocus
              required
            />
          </Field>
          <Field label="Author">
            <input
              className="input"
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              placeholder="Don Norman"
              required
            />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Pillar">
            <input
              className="input"
              value={pillar}
              onChange={(event) => setPillar(event.target.value)}
              placeholder="UI/UX & human psychology"
            />
          </Field>
          <Field label="Book URL" hint="Optional. Opens in a new tab.">
            <input
              className="input font-mono !text-[12px]"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://…"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Chapters">
            <input
              className="input"
              type="number"
              min={0}
              max={999}
              value={totalChapters}
              onChange={(event) => setTotalChapters(Number(event.target.value))}
            />
          </Field>
          <Field label="Current">
            <input
              className="input"
              type="number"
              min={0}
              max={totalChapters}
              value={currentChapter}
              onChange={(event) => setCurrentChapter(Number(event.target.value))}
            />
          </Field>
          <Field label="From week">
            <input
              className="input"
              type="number"
              min={1}
              max={999}
              value={weekFrom}
              onChange={(event) => setWeekFrom(Number(event.target.value))}
            />
          </Field>
          <Field label="To week">
            <input
              className="input"
              type="number"
              min={1}
              max={999}
              value={weekTo}
              onChange={(event) => setWeekTo(Number(event.target.value))}
            />
          </Field>
        </div>
        {book ? (
          <Field label="Status">
            <select className="select" value={status} onChange={(event) => setStatus(event.target.value as ResourceStatus)}>
              <option value="toRead">To read</option>
              <option value="reading">Reading</option>
              <option value="done">Done</option>
            </select>
          </Field>
        ) : null}
        {error ? <InlineError>{error}</InlineError> : null}
        {book ? (
          <div className="rounded-xl border border-bad/25 bg-bad-soft p-3">
            <p className="text-[11.5px] font-semibold text-bad">Remove from canon</p>
            <Button
              variant="danger"
              size="sm"
              className="mt-2"
              onClick={() => {
                if (window.confirm(`Remove “${book.title}” and its reading progress?`)) {
                  deleteBook(book.id)
                  toast('Book removed from the canon.', 'info')
                  onClose()
                }
              }}
            >
              Delete book
            </Button>
          </div>
        ) : null}
      </form>
    </Sheet>
  )
}

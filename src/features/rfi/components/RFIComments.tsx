import { useState } from 'react'
import { MessageSquare, Send } from 'lucide-react'
import { format } from 'date-fns'
import { useAddRFIComment, useRFIComments } from '../hooks/useRFIs'

export default function RFIComments({ rfiId }: { rfiId: string }) {
  const [body, setBody] = useState('')
  const { data = [], isLoading, error } = useRFIComments(rfiId)
  const addComment = useAddRFIComment()

  const submit = () => {
    if (!body.trim()) return
    addComment.mutate(
      { rfiId, body },
      { onSuccess: () => setBody('') },
    )
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {isLoading && <div className="text-sm text-slate-500">Loading conversation…</div>}
        {error && <div className="text-sm text-red-300">{(error as Error).message}</div>}
        {!isLoading && data.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/10 px-5 py-8 text-center">
            <MessageSquare className="mx-auto text-slate-600" size={22} />
            <p className="mt-2 text-sm text-slate-500">No comments yet. Start the project conversation here.</p>
          </div>
        )}
        {data.map(comment => (
          <article key={comment.id} className="rounded-xl border border-white/[.08] bg-white/[.025] p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm font-medium text-slate-200">{comment.author_name || 'SiteFlow user'}</div>
              <time className="text-xs text-slate-500">{format(new Date(comment.created_at), 'dd MMM yyyy, HH:mm')}</time>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{comment.body}</p>
          </article>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-black/10 p-4">
        <textarea
          className="form-control"
          rows={4}
          value={body}
          onChange={event => setBody(event.target.value)}
          placeholder="Add a project comment or clarification…"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">Comments become part of the permanent RFI record.</p>
          <button
            className="btn-primary inline-flex items-center gap-2"
            disabled={!body.trim() || addComment.isPending}
            onClick={submit}
          >
            <Send size={15} /> {addComment.isPending ? 'Posting…' : 'Post comment'}
          </button>
        </div>
      </div>
    </div>
  )
}

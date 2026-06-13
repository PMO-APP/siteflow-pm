import { useEffect, useState } from 'react'
import {
  MessageSquare,
  Send,
  CheckCircle,
  Clock,
  Paperclip,
  RefreshCw,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useMembershipStore } from '@/store/membership'
import { useProjectStore } from '@/store/project'
import { notifyUsers } from '@/lib/notifications'

export default function ExternalCommunicationReviewPage() {
  const { user } = useAuthStore()
  const role = useMembershipStore(state => state.role)
  const { projectId, projectName } = useProjectStore()

  const [conversations, setConversations] = useState<any[]>([])
  const [selectedConversation, setSelectedConversation] = useState<any | null>(
    null
  )
  const [messages, setMessages] = useState<any[]>([])
  const [replyMessage, setReplyMessage] = useState('')
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [assignedRole, setAssignedRole] = useState('pmo')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadConversations()
  }, [projectId, role])

  useEffect(() => {
    if (selectedConversation?.id) {
      loadMessages(selectedConversation.id)
      setAssignedRole(selectedConversation.assigned_role || 'pmo')
    }
  }, [selectedConversation?.id])

  async function loadConversations() {
    if (!projectId) {
      setLoading(false)
      return
    }

    setLoading(true)

    let query = supabase
      .from('external_conversations')
      .select('*')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false })

    if (
      !['workspace_admin', 'admin', 'pmo', 'portfolio_manager'].includes(
        role || ''
      )
    ) {
      query = query.or(`assigned_role.eq.${role || ''},assigned_role.eq.pmo`)
    }

    const { data, error } = await query

    if (error) {
      setNotice(error.message)
      setLoading(false)
      return
    }

    setConversations(data || [])

    if (!selectedConversation && data && data.length > 0) {
      setSelectedConversation(data[0])
    }

    setLoading(false)
  }

  async function loadMessages(conversationId: number) {
    setLoadingMessages(true)

    const { data, error } = await supabase
      .from('external_conversation_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      setNotice(error.message)
      setLoadingMessages(false)
      return
    }

    setMessages(data || [])
    setLoadingMessages(false)
  }

  async function sendReply() {
    setNotice('')

    if (!selectedConversation) {
      setNotice('Select a conversation first.')
      return
    }

    if (!replyMessage.trim()) {
      setNotice('Reply message is required.')
      return
    }

    setSubmitting(true)

    const cleanReply = replyMessage.trim()

    const { error } = await supabase
      .from('external_conversation_messages')
      .insert({
        conversation_id: selectedConversation.id,
        project_id: selectedConversation.project_id,
        sender_name: user?.full_name || user?.email || 'Internal User',
        sender_email: user?.email || '',
        sender_role: role || 'internal',
        message: cleanReply,
        attachment_url: attachmentUrl.trim() || null,
      })

    if (error) {
      setNotice(error.message)
      setSubmitting(false)
      return
    }

    await supabase
      .from('external_conversations')
      .update({
        assigned_role: assignedRole,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedConversation.id)

    if (selectedConversation.created_by_email) {
      await notifyUsers({
        projectId: selectedConversation.project_id,
        recipientRole: selectedConversation.created_by_role,
        type: 'conversation_reply',
        title: `Reply Received: ${selectedConversation.subject}`,
        message: `${
          user?.full_name || user?.email || 'Internal team'
        } replied to your conversation.`,
        sendEmail: true,
        emailPayload: {
          to: [selectedConversation.created_by_email],
          subject: `Reply Received: ${selectedConversation.subject}`,
          type: 'Conversation Reply',
          projectName: projectName || 'PMOCorex Project',
          submittedBy: user?.full_name || user?.email || 'Internal Team',
          submittedByEmail: user?.email || '',
          message: cleanReply,
          reviewUrl: `${window.location.origin}/external-project/communication?project=${selectedConversation.project_id}`,
        },
      })
    }

    setReplyMessage('')
    setAttachmentUrl('')
    setNotice('Reply sent. External user has been notified.')
    setSubmitting(false)

    await loadMessages(selectedConversation.id)
    await loadConversations()
  }

  async function updateStatus(status: string) {
    if (!selectedConversation) return

    const { error } = await supabase
      .from('external_conversations')
      .update({
        status,
        assigned_role: assignedRole,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedConversation.id)

    if (error) {
      setNotice(error.message)
      return
    }

    const updatedConversation = {
      ...selectedConversation,
      status,
      assigned_role: assignedRole,
    }

    setSelectedConversation(updatedConversation)
    await loadConversations()
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#c49e48]/20 bg-gradient-to-br from-[#111820] via-[#162230] to-[#0f151c] p-6 sm:p-8">
        <div className="inline-flex mb-4 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">
          External Communication
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-[#ede8de]">
          Communication Review Center
        </h1>

        <p className="text-slate-400 mt-3 max-w-2xl">
          Review, reply, assign, and close project conversations from external
          consultants, contractors, vendors, and subcontractors.
        </p>

        <div className="mt-4 text-sm text-slate-500">
          Project:{' '}
          <span className="text-[#c49e48]">
            {projectName || 'No project selected'}
          </span>
        </div>
      </section>

      {notice && (
        <div className="rounded-xl border border-[#c49e48]/20 bg-[#c49e48]/10 p-3 text-sm text-[#ede8de]">
          {notice}
        </div>
      )}

      {!projectId ? (
        <div className="card p-6 text-slate-400">
          Select a project from the Workspace Hub first.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
          <section className="card p-5 xl:col-span-1 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MessageSquare size={18} className="text-[#c49e48]" />

                <h2 className="text-lg font-bold text-[#ede8de]">
                  Conversations
                </h2>
              </div>

              <button onClick={loadConversations} className="btn btn-ghost">
                <RefreshCw size={14} />
              </button>
            </div>

            {loading ? (
              <div className="text-sm text-slate-500">
                Loading conversations…
              </div>
            ) : conversations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-500">
                No external conversations for this project.
              </div>
            ) : (
              <div className="space-y-2 max-h-[650px] overflow-y-auto">
                {conversations.map(conversation => (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => setSelectedConversation(conversation)}
                    className={`w-full rounded-2xl border p-3 text-left transition ${
                      selectedConversation?.id === conversation.id
                        ? 'border-[#c49e48]/40 bg-[#c49e48]/10'
                        : 'border-white/10 bg-white/5 hover:border-[#c49e48]/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-bold text-[#ede8de] truncate">
                        {conversation.subject}
                      </div>

                      {conversation.status === 'Closed' ? (
                        <CheckCircle size={14} className="text-emerald-400" />
                      ) : (
                        <Clock size={14} className="text-amber-400" />
                      )}
                    </div>

                    <div className="text-xs text-slate-500 mt-1">
                      {conversation.channel} • {conversation.status}
                    </div>

                    <div className="text-xs text-slate-500 mt-1">
                      From: {conversation.created_by || 'External User'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="card p-5 xl:col-span-3 space-y-4">
            {!selectedConversation ? (
              <div className="text-center py-20">
                <MessageSquare size={38} className="mx-auto text-[#c49e48]" />

                <div className="text-lg font-bold text-white mt-4">
                  Select a conversation
                </div>

                <p className="text-sm text-slate-500 mt-2">
                  Choose a conversation to review and respond.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between border-b border-white/10 pb-4">
                  <div>
                    <div className="text-xs rounded-full border border-[#c49e48]/20 bg-[#c49e48]/10 text-[#c49e48] px-2 py-1 inline-flex">
                      {selectedConversation.channel}
                    </div>

                    <h2 className="text-xl font-bold text-[#ede8de] mt-3">
                      {selectedConversation.subject}
                    </h2>

                    <div className="text-xs text-slate-500 mt-1">
                      Status: {selectedConversation.status} • From:{' '}
                      {selectedConversation.created_by || 'External User'}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <select
                      className="form-control"
                      value={assignedRole}
                      onChange={e => setAssignedRole(e.target.value)}
                    >
                      <option value="pmo">PMO</option>
                      <option value="project_owner">Project Owner</option>
                      <option value="design">Design</option>
                      <option value="housebuild">Housebuild</option>
                      <option value="mep">MEP</option>
                      <option value="infrastructure">Infrastructure</option>
                      <option value="costing">Costing</option>
                    </select>

                    <button
                      onClick={() =>
                        updateStatus(
                          selectedConversation.status === 'Closed'
                            ? 'Open'
                            : 'Closed'
                        )
                      }
                      className="btn btn-ghost"
                    >
                      {selectedConversation.status === 'Closed'
                        ? 'Reopen'
                        : 'Close'}
                    </button>
                  </div>
                </div>

                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {loadingMessages ? (
                    <div className="text-sm text-slate-500">
                      Loading messages…
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-sm text-slate-500">
                      No messages yet.
                    </div>
                  ) : (
                    messages.map(item => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-white/10 bg-white/5 p-4"
                      >
                        <div>
                          <div className="text-sm font-bold text-[#ede8de]">
                            {item.sender_name || item.sender_email}
                          </div>

                          <div className="text-xs text-slate-500">
                            {item.sender_role || 'User'} •{' '}
                            {item.created_at
                              ? new Date(item.created_at).toLocaleString(
                                  'en-GB'
                                )
                              : '—'}
                          </div>
                        </div>

                        <p className="text-sm text-slate-300 mt-3 whitespace-pre-wrap">
                          {item.message}
                        </p>

                        {item.attachment_url && (
                          <a
                            href={item.attachment_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-[#c49e48] hover:underline mt-3"
                          >
                            <Paperclip size={13} />
                            Open attachment/link
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {selectedConversation.status !== 'Closed' && (
                  <div className="border-t border-white/10 pt-4 space-y-3">
                    <textarea
                      className="form-control min-h-[110px]"
                      placeholder="Write internal reply..."
                      value={replyMessage}
                      onChange={e => setReplyMessage(e.target.value)}
                    />

                    <input
                      className="form-control"
                      placeholder="Attachment URL / file link"
                      value={attachmentUrl}
                      onChange={e => setAttachmentUrl(e.target.value)}
                    />

                    <button
                      onClick={sendReply}
                      disabled={submitting}
                      className="btn btn-gold"
                    >
                      <Send size={15} />
                      {submitting ? 'Sending…' : 'Send Reply'}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  MessageSquare,
  Plus,
  Send,
  Paperclip,
  Clock,
  CheckCircle,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useMembershipStore } from '@/store/membership'
import { useExternalProjectStore } from '@/store/externalProject'
import { notifyUsers } from '@/lib/notifications'
import { PMOCorexLogo } from '@/components/brand/PMOCorexLogo'

const CHANNELS = [
  'General',
  'RFIs',
  'Drawings',
  'Site Issues',
  'Approvals',
  'Tasks',
]

export default function ExternalCommunicationPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuthStore()
  const role = useMembershipStore(state => state.role)

  const {
    externalProjectId,
    externalProjectName,
    setExternalProject,
  } = useExternalProjectStore()

  const projectFromUrl = searchParams.get('project')
  const activeProjectId = externalProjectId || Number(projectFromUrl) || null

  const [conversations, setConversations] = useState<any[]>([])
  const [selectedConversation, setSelectedConversation] = useState<any | null>(
    null
  )
  const [messages, setMessages] = useState<any[]>([])

  const [channel, setChannel] = useState('General')
  const [subject, setSubject] = useState('')
  const [assignedRole, setAssignedRole] = useState('pmo')
  const [message, setMessage] = useState('')
  const [attachmentUrl, setAttachmentUrl] = useState('')

  const [replyMessage, setReplyMessage] = useState('')
  const [replyAttachmentUrl, setReplyAttachmentUrl] = useState('')

  const [notice, setNotice] = useState('')
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    syncProjectFromUrl()
  }, [projectFromUrl])

  useEffect(() => {
    loadConversations()
  }, [activeProjectId, user?.email])

  useEffect(() => {
    if (selectedConversation?.id) {
      loadMessages(selectedConversation.id)
    }
  }, [selectedConversation?.id])

  async function syncProjectFromUrl() {
    if (!projectFromUrl) return

    const projectId = Number(projectFromUrl)

    if (!projectId || externalProjectId === projectId) return

    const { data } = await supabase
      .from('projects')
      .select('id, project_name')
      .eq('id', projectId)
      .maybeSingle()

    if (data) {
      setExternalProject(data.id, data.project_name)
    }
  }

  async function loadConversations() {
    if (!activeProjectId || !user?.email) {
      setLoadingConversations(false)
      return
    }

    setLoadingConversations(true)

    const { data, error } = await supabase
      .from('external_conversations')
      .select('*')
      .eq('project_id', activeProjectId)
      .or(
        `created_by_email.eq.${user.email},assigned_role.eq.${role || ''},assigned_role.eq.pmo`
      )
      .order('updated_at', { ascending: false })

    if (error) {
      setNotice(error.message)
      setLoadingConversations(false)
      return
    }

    setConversations(data || [])

    if (!selectedConversation && data && data.length > 0) {
      setSelectedConversation(data[0])
    }

    setLoadingConversations(false)
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

  async function createConversation() {
    setNotice('')

    if (!activeProjectId) {
      setNotice('Please select a project from the External Portal first.')
      return
    }

    if (!subject.trim()) {
      setNotice('Conversation subject is required.')
      return
    }

    if (!message.trim()) {
      setNotice('Message is required.')
      return
    }

    setSubmitting(true)

    const cleanSubject = subject.trim()
    const cleanMessage = message.trim()

    const { data: conversation, error: conversationError } = await supabase
      .from('external_conversations')
      .insert({
        project_id: activeProjectId,
        channel,
        subject: cleanSubject,
        status: 'Open',
        created_by: user?.full_name || user?.email || 'External User',
        created_by_email: user?.email || '',
        created_by_role: role || 'external',
        assigned_role: assignedRole,
      })
      .select('*')
      .single()

    if (conversationError) {
      setNotice(conversationError.message)
      setSubmitting(false)
      return
    }

    const { error: messageError } = await supabase
      .from('external_conversation_messages')
      .insert({
        conversation_id: conversation.id,
        project_id: activeProjectId,
        sender_name: user?.full_name || user?.email || 'External User',
        sender_email: user?.email || '',
        sender_role: role || 'external',
        message: cleanMessage,
        attachment_url: attachmentUrl.trim() || null,
      })

    if (messageError) {
      setNotice(messageError.message)
      setSubmitting(false)
      return
    }

    await notifyUsers({
      projectId: activeProjectId,
      recipientRole: assignedRole,
      type: 'comment',
      title: `New ${channel} Conversation`,
      message: `${
        user?.full_name || user?.email || 'External user'
      } started: ${cleanSubject}`,
      sendEmail: true,
      emailPayload: {
        to: ['e.bio-ibogomo@mixtafrica.com'],
        subject: `New External Conversation: ${cleanSubject}`,
        type: 'External Conversation',
        projectName: externalProjectName || 'Selected Project',
        submittedBy: user?.full_name || user?.email || 'External User',
        submittedByEmail: user?.email || '',
        message: cleanMessage,
        reviewUrl: `${window.location.origin}/app/external-review`,
      },
    })

    setSubject('')
    setMessage('')
    setAttachmentUrl('')
    setChannel('General')
    setAssignedRole('pmo')
    setSelectedConversation(conversation)
    setNotice('Conversation created. The internal team has been notified.')
    setSubmitting(false)

    await loadConversations()
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
        sender_name: user?.full_name || user?.email || 'External User',
        sender_email: user?.email || '',
        sender_role: role || 'external',
        message: cleanReply,
        attachment_url: replyAttachmentUrl.trim() || null,
      })

    if (error) {
      setNotice(error.message)
      setSubmitting(false)
      return
    }

    await supabase
      .from('external_conversations')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedConversation.id)

    await notifyUsers({
      projectId: selectedConversation.project_id,
      recipientRole: selectedConversation.assigned_role || 'pmo',
      type: 'comment',
      title: `New Reply: ${selectedConversation.subject}`,
      message: `${
        user?.full_name || user?.email || 'External user'
      } replied to ${selectedConversation.subject}.`,
      sendEmail: true,
      emailPayload: {
        to: ['YOUR_PMO_EMAIL@company.com'],
        subject: `New External Reply: ${selectedConversation.subject}`,
        type: 'External Conversation Reply',
        projectName: externalProjectName || 'Selected Project',
        submittedBy: user?.full_name || user?.email || 'External User',
        submittedByEmail: user?.email || '',
        message: cleanReply,
        reviewUrl: `${window.location.origin}/app/external-review`,
      },
    })

    setReplyMessage('')
    setReplyAttachmentUrl('')
    setNotice('Reply sent. The internal team has been notified.')
    setSubmitting(false)

    await loadMessages(selectedConversation.id)
    await loadConversations()
  }

  async function closeConversation() {
    if (!selectedConversation) return

    const { error } = await supabase
      .from('external_conversations')
      .update({
        status: 'Closed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedConversation.id)

    if (error) {
      setNotice(error.message)
      return
    }

    setSelectedConversation({
      ...selectedConversation,
      status: 'Closed',
    })

    await loadConversations()
  }

  return (
    <div className="min-h-dvh bg-[#0c1014] text-white">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <PMOCorexLogo size={42} />

          <div className="flex gap-2">
            <button
              onClick={() => navigate('/external-project')}
              className="btn btn-ghost"
            >
              <ArrowLeft size={15} />
              External Portal
            </button>

            <button
              onClick={() => navigate('/profile')}
              className="btn btn-gold"
            >
              Profile
            </button>
          </div>
        </div>

        <section className="relative overflow-hidden rounded-[2rem] border border-[#c49e48]/20 bg-gradient-to-br from-[#111820] via-[#162230] to-[#0f151c] p-6 sm:p-8">
          <div className="inline-flex mb-4 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">
            External Communication Center
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-[#ede8de]">
            Project Conversations
          </h1>

          <p className="text-slate-400 mt-3 max-w-2xl">
            Start project-specific conversations, submit clarifications, attach
            links, and keep all communication tied to the selected project.
          </p>

          <div className="mt-4 text-sm text-slate-500">
            Current Project:{' '}
            <span className="text-[#c49e48]">
              {externalProjectName || 'No project selected'}
            </span>
          </div>
        </section>

        {notice && (
          <div className="rounded-xl border border-[#c49e48]/20 bg-[#c49e48]/10 p-3 text-sm text-[#ede8de]">
            {notice}
          </div>
        )}

        {!activeProjectId && (
          <div className="card p-6 text-center">
            <p className="text-slate-400">
              Please select a project before opening conversations.
            </p>

            <button
              onClick={() => navigate('/external-project')}
              className="btn btn-gold mt-4"
            >
              Select Project
            </button>
          </div>
        )}

        {activeProjectId && (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
            <section className="card p-5 xl:col-span-1 space-y-4">
              <div className="flex items-center gap-2">
                <Plus size={18} className="text-[#c49e48]" />

                <h2 className="text-lg font-bold text-[#ede8de]">
                  Start Conversation
                </h2>
              </div>

              <select
                className="form-control"
                value={channel}
                onChange={e => setChannel(e.target.value)}
              >
                {CHANNELS.map(item => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <input
                className="form-control"
                placeholder="Subject"
                value={subject}
                onChange={e => setSubject(e.target.value)}
              />

              <select
                className="form-control"
                value={assignedRole}
                onChange={e => setAssignedRole(e.target.value)}
              >
                <option value="pmo">PMO</option>
                <option value="design">Design</option>
                <option value="housebuild">Housebuild</option>
                <option value="mep">MEP</option>
                <option value="infrastructure">Infrastructure</option>
                <option value="costing">Costing</option>
                <option value="project_owner">Project Owner</option>
              </select>

              <textarea
                className="form-control min-h-[130px]"
                placeholder="Write your message..."
                value={message}
                onChange={e => setMessage(e.target.value)}
              />

              <input
                className="form-control"
                placeholder="Attachment URL / file link"
                value={attachmentUrl}
                onChange={e => setAttachmentUrl(e.target.value)}
              />

              <button
                onClick={createConversation}
                disabled={submitting}
                className="btn btn-gold w-full justify-center"
              >
                {submitting ? 'Creating…' : 'Start Conversation'}
              </button>
            </section>

            <section className="card p-5 xl:col-span-1 space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare size={18} className="text-[#c49e48]" />

                <h2 className="text-lg font-bold text-[#ede8de]">
                  Conversations
                </h2>
              </div>

              {loadingConversations ? (
                <div className="text-sm text-slate-500">
                  Loading conversations…
                </div>
              ) : conversations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-500">
                  No conversations yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-[560px] overflow-y-auto">
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
                          <CheckCircle
                            size={14}
                            className="text-emerald-400"
                          />
                        ) : (
                          <Clock size={14} className="text-amber-400" />
                        )}
                      </div>

                      <div className="text-xs text-slate-500 mt-1">
                        {conversation.channel} • {conversation.status}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="card p-5 xl:col-span-2 space-y-4">
              {!selectedConversation ? (
                <div className="text-center py-16">
                  <MessageSquare
                    size={36}
                    className="mx-auto text-[#c49e48]"
                  />

                  <div className="text-lg font-bold text-white mt-4">
                    Select a conversation
                  </div>

                  <p className="text-sm text-slate-500 mt-2">
                    Choose a conversation to view messages and replies.
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
                        Status: {selectedConversation.status} • Assigned to:{' '}
                        {selectedConversation.assigned_role || 'PMO'}
                      </div>
                    </div>

                    {selectedConversation.status !== 'Closed' && (
                      <button
                        onClick={closeConversation}
                        className="btn btn-ghost"
                      >
                        Close
                      </button>
                    )}
                  </div>

                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
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
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-bold text-[#ede8de]">
                                {item.sender_name || item.sender_email}
                              </div>

                              <div className="text-xs text-slate-500">
                                {item.sender_role || 'User'} •{' '}
                                {item.created_at
                                  ? new Date(
                                      item.created_at
                                    ).toLocaleString('en-GB')
                                  : '—'}
                              </div>
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
                        className="form-control min-h-[100px]"
                        placeholder="Write a reply..."
                        value={replyMessage}
                        onChange={e => setReplyMessage(e.target.value)}
                      />

                      <input
                        className="form-control"
                        placeholder="Attachment URL / file link"
                        value={replyAttachmentUrl}
                        onChange={e => setReplyAttachmentUrl(e.target.value)}
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
    </div>
  )
}

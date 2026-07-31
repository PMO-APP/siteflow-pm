import React from 'react'
import { emitTelemetry } from './telemetry'

export default class EnterpriseErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, info: React.ErrorInfo) { void emitTelemetry('error', error.message, undefined, { stack: error.stack, componentStack: info.componentStack }) }
  render() {
    if (this.state.failed) return <div className="min-h-screen grid place-items-center bg-slate-50 p-6"><div className="max-w-md rounded-3xl border bg-white p-8 text-center shadow-sm"><h1 className="text-xl font-bold text-[#173f5f]">We could not load this workspace</h1><p className="mt-2 text-sm text-slate-600">The incident has been recorded. Reload the page to continue.</p><button className="mt-5 rounded-xl bg-[#173f5f] px-4 py-2 text-sm font-semibold text-white" onClick={() => location.reload()}>Reload workspace</button></div></div>
    return this.props.children
  }
}

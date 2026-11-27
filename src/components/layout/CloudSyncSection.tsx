import { useState } from 'react'
import { Cloud, LogOut, RefreshCw } from 'lucide-react'
import { Badge, Button, SectionHead } from '../ui/primitives'
import { useSyncStore } from '../../store/syncStore'
import { signInWithGoogle, signOutOfCloud, syncNow } from '../../services/cloudSync'

function timeLabel(at?: number): string {
  if (!at) return 'not yet'
  return new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function CloudSyncSection() {
  const { phase, configured, email, lastSyncedAt, error } = useSyncStore()
  const [busy, setBusy] = useState(false)

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }

  const signedIn = phase === 'synced' || phase === 'syncing' || (phase === 'error' && Boolean(email))

  return (
    <section aria-labelledby="cloud-sync-heading">
      <SectionHead
        title={<span id="cloud-sync-heading">Cloud sync</span>}
        eyebrow="Optional, local-first"
        description="The app works offline with no account. Sign in only if you want the same progress on your laptop and phone."
      />

      <div className="rounded-xl border border-line bg-s2 p-3">
        {!configured ? (
          <>
            <p className="text-[12px] font-semibold">Not configured on this build</p>
            <p className="faint mt-1 text-[11.5px] leading-relaxed">
              Add the four public Firebase values (project settings, web app) as Vercel environment
              variables, then redeploy. Nothing is uploaded until those values exist.
            </p>
          </>
        ) : signedIn ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Cloud size={15} className="text-t2" aria-hidden />
                <div>
                  <p className="text-[12px] font-semibold">{email ?? 'Signed in'}</p>
                  <p className="faint text-[11.5px]">
                    Last sync {timeLabel(lastSyncedAt)} · merged, never overwritten
                  </p>
                </div>
              </div>
              <Badge
                tone={
                  phase === 'synced'
                    ? 'good'
                    : phase === 'error'
                      ? 'bad'
                      : 'neutral'
                }
              >
                {phase === 'syncing' ? 'Syncing' : phase === 'error' ? 'Error' : 'Synced'}
              </Badge>
            </div>

            {error ? (
              <p className="mt-2 rounded-lg border border-bad/30 bg-bad-soft px-2 py-1.5 text-[11px] text-t1">
                {error}
              </p>
            ) : null}

            <div className="mt-2.5 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                icon={<RefreshCw size={13} />}
                loading={busy || phase === 'syncing'}
                onClick={() => void run(syncNow)}
              >
                Sync now
              </Button>
              <Button
                size="sm"
                variant="ghost"
                icon={<LogOut size={13} />}
                onClick={() => void run(signOutOfCloud)}
              >
                Sign out
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-[12px] font-semibold">Keep progress across devices</p>
            <p className="faint mt-1 text-[11.5px] leading-relaxed">
              Use the same Google account on any number of phones and laptops. Checks, proofs,
              cards and day cards merge. Your planner, theme and AI key stay on each device.
            </p>
            <p className="faint mt-1.5 text-[11px] leading-relaxed">
              Android: if sign-in keeps returning to the app, sign in once in Chrome at
              skillmastery-jay.vercel.app, then reopen the installed app.
            </p>
            {error ? (
              <p className="mt-2 rounded-lg border border-bad/30 bg-bad-soft px-2 py-1.5 text-[11px] text-t1">
                {error}
              </p>
            ) : null}
            <Button
              className="mt-2.5"
              size="sm"
              variant="primary"
              icon={<Cloud size={13} />}
              loading={busy}
              onClick={() => void run(signInWithGoogle)}
            >
              Sign in with Google
            </Button>
          </>
        )}

        <p className="faint mt-3 border-t border-line pt-2.5 text-[11px] leading-relaxed">
          Only progress and day cards are uploaded. The Velona AI key never leaves this device.
          Deleting a week is honoured by the merge; a permanent purge is final.
        </p>
      </div>
    </section>
  )
}

import { Cloud, CloudOff, RefreshCw } from 'lucide-react'
import { IconButton } from '../ui/primitives'
import { useSyncStore } from '../../store/syncStore'
import { useUiStore } from '../../store/uiStore'
import { signInWithGoogle, syncNow } from '../../services/cloudSync'

/**
 * The smallest possible sync affordance: one quiet icon beside the theme
 * toggle. It only appears when this build has Firebase config.
 */
export function CloudSyncButton() {
  const { phase, configured, email } = useSyncStore()
  const openSettings = useUiStore((state) => state.openSettings)

  if (!configured) return null

  const syncing = phase === 'syncing'
  const failed = phase === 'error'
  const signedIn = Boolean(email) && phase !== 'signed-out'

  const label = syncing
    ? 'Syncing progress'
    : failed
      ? 'Cloud sync error. Open settings'
      : signedIn
        ? 'Sync progress now'
        : 'Sign in to sync progress'

  const onClick = () => {
    if (syncing) return
    if (failed) {
      openSettings()
      return
    }
    if (signedIn) {
      void syncNow()
      return
    }
    void signInWithGoogle()
  }

  return (
    <IconButton
      label={label}
      title={label}
      onClick={onClick}
      className={failed ? 'text-warn' : undefined}
    >
      {syncing ? (
        <RefreshCw size={16} className="animate-spin motion-reduce:animate-none" />
      ) : signedIn || failed ? (
        <Cloud size={16} />
      ) : (
        <CloudOff size={16} />
      )}
    </IconButton>
  )
}

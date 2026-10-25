/** Invite link; `base` is origin + pathname (the app's root, with its trailing slash). */
export const buildInviteUrl = (base: string, listId: string, token: string): string =>
  `${base}#/join/${encodeURIComponent(listId)}?t=${encodeURIComponent(token)}`

type ShareNavigator = Pick<Navigator, 'share' | 'clipboard'>

/** Share sheet when there is one (WhatsApp etc.), otherwise copy the link. */
export const shareInvite = async (url: string, text: string, nav: ShareNavigator = navigator): Promise<'shared' | 'copied' | 'failed'> => {
  if (typeof nav.share === 'function') {
    try {
      await nav.share({ text, url })
      return 'shared'
    } catch (error) {
      // The user closing the share sheet is not an error
      if ((error as { name?: string } | null)?.name === 'AbortError') return 'shared'
    }
  }
  try {
    await nav.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'failed'
  }
}

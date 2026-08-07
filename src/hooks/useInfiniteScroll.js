import { useEffect } from 'react'

/**
 * Fires onLoadMore when the given scrollable container is scrolled near its
 * bottom -- replaces an explicit "Load more" button with load-as-you-scroll.
 * @param {import('react').RefObject<HTMLElement>} containerRef
 * @param {() => void} onLoadMore
 * @param {{ enabled: boolean }} options -- enabled should be `hasMore && !loading`, so this doesn't fire while a page is already in flight or after the list is exhausted
 */
export function useInfiniteScroll(containerRef, onLoadMore, { enabled }) {
  useEffect(() => {
    const el = containerRef.current
    if (!el || !enabled) return

    const THRESHOLD_PX = 400 // fire before the user actually hits bottom, so the next page is ready by the time they get there

    const handleScroll = () => {
      if (el.scrollHeight - el.scrollTop - el.clientHeight < THRESHOLD_PX) onLoadMore()
    }

    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [containerRef, onLoadMore, enabled])
}

import { useEffect } from 'react';

/** Set the browser tab / history title for the current screen. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} · Headless CMS`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}

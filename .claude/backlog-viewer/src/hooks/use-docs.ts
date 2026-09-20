import { useCallback, useEffect, useState } from 'react';
import { fetchJson } from '@/lib/utils';
import { useEventSubscribe } from './use-event-stream';

export interface DocSummary {
  path: string;
  title: string;
  folder: string;
  group: string | null;
  mtimeMs: number;
}

interface DocsResponse {
  docs: DocSummary[];
  configured: boolean;
}

// Shared docs list + config state — lifted out of DocsView so the sidebar's
// Docs submenu and the main preview pane read the same list without two
// independent fetches drifting apart.
export function useDocs() {
  const [docs, setDocs] = useState<DocSummary[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetchJson<DocsResponse>('/api/docs.json')
      .then((d) => {
        setDocs(Array.isArray(d.docs) ? d.docs : []);
        setConfigured(d.configured !== false);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useEventSubscribe(['docs'], load);

  return { docs, configured, loading };
}

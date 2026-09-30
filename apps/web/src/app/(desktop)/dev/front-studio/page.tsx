import { notFound } from 'next/navigation';
import {
  getBlockTypes,
  getCapabilities,
  getFrontPage,
  getShells,
  isFrontStudioEnabled,
} from '@/lib/front-experience/server';
import { FrontStudioClient } from './studio-client';

export default async function FrontStudioPage() {
  if (!isFrontStudioEnabled()) {
    notFound();
  }

  const [page, blockTypes, capabilities, shells] = await Promise.all([
    getFrontPage({ slug: 'home', channel: 'web' }),
    getBlockTypes(),
    getCapabilities(),
    getShells(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Front Studio</h1>
      <p className="mt-2 text-sm text-slate-600">
        Development-only page/skin preview and slot editor. Not an Admin panel — edits are
        downloaded or written back to FrontPage YAML for Git.
      </p>
      <div className="mt-8">
        <FrontStudioClient
          initialPage={page}
          blockTypes={blockTypes}
          capabilities={capabilities}
          shells={shells as Array<{ key: string; slots: Array<{ key: string }> }>}
        />
      </div>
    </div>
  );
}

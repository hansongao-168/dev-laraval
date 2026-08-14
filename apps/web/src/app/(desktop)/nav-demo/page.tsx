import Link from 'next/link';
import { getFrontNav } from '@/lib/front-nav';

/**
 * Demo route — server-side render of the front-nav tree.
 *
 * Shows the **real** payload returned by `GET /api/v1/front-nav`
 * (as opposed to the legacy `customer.ts` local NavItem list).
 *
 * Render flow:
 *   1. `getFrontNav('sidebar')` issues the SDK call from the server,
 *      forwarding the visitor's cookie so visibility/permission checks
 *      run on the same identity as the rest of the page.
 *   2. The returned tree is rendered as nested <ul>/<li> with links.
 *
 * Open this in a browser at `/nav-demo` (desktop) to see the live tree.
 */
export default async function NavDemoPage() {
  const sidebar = await getFrontNav('sidebar');
  const header  = await getFrontNav('header');

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        FrontNav live demo
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Server-side render of <code>GET /api/v1/front-nav</code> via{' '}
        <code>@erp/front-nav</code>. The items come from{' '}
        <code>gz168/customer</code> + the FrontNav builtin core group;
        order, visibility, and parent/child are produced by the resolver.
      </p>

      <Section title="Header" items={header} />
      <Section title="Sidebar" items={sidebar} />

      <details className="mt-8 rounded border border-slate-200 bg-white p-4 text-xs">
        <summary className="cursor-pointer font-medium text-slate-700">
          Raw JSON (debug)
        </summary>
        <pre className="mt-3 overflow-auto text-slate-600">
          {JSON.stringify({ header, sidebar }, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function Section({
  title,
  items,
}: {
  title: string;
  items: Array<{
    key: string;
    label: string;
    url: string;
    icon?: string | null;
    requiresAuth: boolean;
    children: Array<{
      key: string;
      label: string;
      url: string;
    }>;
  }>;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm italic text-slate-500">
          (no items visible at this location — try logging in to see auth-gated entries)
        </p>
      ) : (
        <ul className="mt-3 space-y-1 text-sm">
          {items.map((item) => (
            <li key={item.key} className="rounded border border-slate-200 bg-white p-3">
              <Link
                href={item.url}
                className="flex items-center justify-between gap-3 text-blue-700 hover:underline"
              >
                <span className="flex items-center gap-2">
                  {item.icon ? <span aria-hidden>{item.icon}</span> : null}
                  <span className="font-medium">{item.label}</span>
                  {item.requiresAuth ? (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-800">
                      auth
                    </span>
                  ) : null}
                </span>
                <code className="text-xs text-slate-400">{item.key}</code>
              </Link>
              {item.children.length > 0 ? (
                <ul className="ml-6 mt-2 space-y-1 border-l border-slate-200 pl-3">
                  {item.children.map((child) => (
                    <li key={child.key} className="text-xs text-slate-600">
                      <Link href={child.url} className="hover:underline">
                        {child.label}
                      </Link>
                      <code className="ml-2 text-slate-400">{child.key}</code>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

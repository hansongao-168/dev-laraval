'use client';

import { useEffect, useState } from 'react';
import type { BlockInstance, CapabilityInfo } from '@erp/front-experience/core';

type CallNode = NonNullable<BlockInstance['call']>;

type Props = {
  call?: BlockInstance['call'];
  capabilities: CapabilityInfo[];
  onChange: (call: CallNode | null) => void;
};

const ON_ERRORS = ['empty', 'omit', 'fail'] as const;

export function BlockCallEditor({ call, capabilities, onChange }: Props) {
  const [enabled, setEnabled] = useState(Boolean(call));
  const [id, setId] = useState(call?.id ?? '');
  const [module, setModule] = useState(call?.module ?? '');
  const [capability, setCapability] = useState(call?.capability ?? '');
  const [onError, setOnError] = useState<CallNode['onError']>(call?.onError ?? 'empty');
  const [argsText, setArgsText] = useState(() => JSON.stringify(call?.args ?? {}, null, 2));
  const [argsError, setArgsError] = useState<string | null>(null);

  useEffect(() => {
    setEnabled(Boolean(call));
    setId(call?.id ?? '');
    setModule(call?.module ?? '');
    setCapability(call?.capability ?? '');
    setOnError(call?.onError ?? 'empty');
    setArgsText(JSON.stringify(call?.args ?? {}, null, 2));
    setArgsError(null);
  }, [call]);

  function apply(next: {
    enabled?: boolean;
    id?: string;
    module?: string;
    capability?: string;
    onError?: CallNode['onError'];
    argsText?: string;
  }) {
    const isEnabled = next.enabled ?? enabled;
    if (!isEnabled) {
      onChange(null);
      return;
    }

    const capabilityId = (next.capability ?? capability).trim();
    if (!capabilityId) {
      setArgsError('capability is required');
      return;
    }

    let args: Record<string, unknown> = {};
    const rawArgs = next.argsText ?? argsText;
    try {
      const parsed = JSON.parse(rawArgs || '{}') as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setArgsError('args must be a JSON object');
        return;
      }
      args = parsed as Record<string, unknown>;
      setArgsError(null);
    } catch (e) {
      setArgsError(e instanceof Error ? e.message : 'Invalid args JSON');
      return;
    }

    const selected = capabilities.find((item) => item.id === capabilityId);
    const payload: CallNode = {
      capability: capabilityId,
      onError: next.onError ?? onError ?? 'empty',
    };

    const nextId = (next.id ?? id).trim();
    const nextModule = (next.module ?? module).trim() || selected?.module || '';

    if (nextId) {
      payload.id = nextId;
    }
    if (nextModule) {
      payload.module = nextModule;
    }
    if (Object.keys(args).length > 0) {
      payload.args = args;
    }

    onChange(payload);
  }

  return (
    <div className="space-y-3 rounded border border-slate-200 bg-white p-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">YAML call</h3>
          <p className="text-xs text-slate-500">
            Cross-module data via capability — written back with the page document.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => {
              setEnabled(e.target.checked);
              if (!e.target.checked) {
                onChange(null);
              } else {
                apply({ enabled: true });
              }
            }}
          />
          Enabled
        </label>
      </div>

      {!enabled ? (
        <p className="text-xs text-slate-500">No call on this block.</p>
      ) : (
        <div className="space-y-2">
          <label className="block space-y-1 text-xs">
            <span className="text-slate-600">capability</span>
            <select
              className="w-full rounded border border-slate-300 px-2 py-1.5"
              value={capability}
              onChange={(e) => {
                const value = e.target.value;
                setCapability(value);
                const selected = capabilities.find((item) => item.id === value);
                if (selected) {
                  setModule(selected.module);
                  apply({ capability: value, module: selected.module });
                } else {
                  apply({ capability: value });
                }
              }}
            >
              <option value="">Select capability…</option>
              {capabilities.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.id} ({item.module})
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1 text-xs">
            <span className="text-slate-600">id</span>
            <input
              className="w-full rounded border border-slate-300 px-2 py-1.5"
              value={id}
              placeholder="optional call context id"
              onChange={(e) => setId(e.target.value)}
              onBlur={() => apply({ id })}
            />
          </label>

          <label className="block space-y-1 text-xs">
            <span className="text-slate-600">module</span>
            <input
              className="w-full rounded border border-slate-300 px-2 py-1.5"
              value={module}
              placeholder="module alias"
              onChange={(e) => setModule(e.target.value)}
              onBlur={() => apply({ module })}
            />
          </label>

          <label className="block space-y-1 text-xs">
            <span className="text-slate-600">onError</span>
            <select
              className="w-full rounded border border-slate-300 px-2 py-1.5"
              value={onError ?? 'empty'}
              onChange={(e) => {
                const value = e.target.value as CallNode['onError'];
                setOnError(value);
                apply({ onError: value });
              }}
            >
              {ON_ERRORS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1 text-xs">
            <span className="text-slate-600">args (JSON)</span>
            <textarea
              className="h-28 w-full rounded border border-slate-300 bg-slate-950 p-2 font-mono text-[11px] text-slate-100"
              value={argsText}
              spellCheck={false}
              onChange={(e) => setArgsText(e.target.value)}
              onBlur={() => apply({ argsText })}
            />
          </label>
          {argsError ? <p className="text-xs text-rose-600">{argsError}</p> : null}
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import type { BlockInstance, BlockTypeInfo } from '@erp/front-experience/core';

type Props = {
  block: BlockInstance;
  blockType?: BlockTypeInfo;
  onChange: (props: Record<string, unknown>) => void;
};

type SchemaProperty = {
  type?: string;
  [key: string]: unknown;
};

function schemaProperties(blockType?: BlockTypeInfo): Record<string, SchemaProperty> {
  const schema = blockType?.propsSchema;
  if (!schema || typeof schema !== 'object') {
    return {};
  }

  const properties = (schema as { properties?: Record<string, SchemaProperty> }).properties;
  return properties && typeof properties === 'object' ? properties : {};
}

function fieldKeys(block: BlockInstance, blockType?: BlockTypeInfo): string[] {
  const fromSchema = Object.keys(schemaProperties(blockType));
  const fromDefaults = Object.keys(blockType?.defaultProps ?? {});
  const fromProps = Object.keys(block.props ?? {});
  return [...new Set([...fromSchema, ...fromDefaults, ...fromProps])].filter(
    (key) => key !== 'items' && key !== 'bindings',
  );
}

function coerceValue(raw: string, schemaType?: string): unknown {
  if (schemaType === 'integer' || schemaType === 'number') {
    if (raw.trim() === '') {
      return undefined;
    }
    const num = schemaType === 'integer' ? Number.parseInt(raw, 10) : Number.parseFloat(raw);
    return Number.isFinite(num) ? num : raw;
  }

  if (schemaType === 'boolean') {
    return raw === 'true';
  }

  return raw;
}

export function BlockPropsEditor({ block, blockType, onChange }: Props) {
  const keys = useMemo(() => fieldKeys(block, blockType), [block, blockType]);
  const properties = schemaProperties(blockType);
  const [jsonText, setJsonText] = useState(() => JSON.stringify(block.props ?? {}, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    setJsonText(JSON.stringify(block.props ?? {}, null, 2));
    setJsonError(null);
  }, [block.id, block.props]);

  function setProp(key: string, value: unknown) {
    const next = { ...(block.props ?? {}) };
    if (value === undefined || value === '') {
      delete next[key];
    } else {
      next[key] = value;
    }
    onChange(next);
  }

  function applyJson() {
    try {
      const parsed = JSON.parse(jsonText) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setJsonError('Props must be a JSON object');
        return;
      }
      setJsonError(null);
      onChange(parsed as Record<string, unknown>);
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  }

  return (
    <div className="space-y-3 rounded border border-slate-200 bg-white p-3 text-sm">
      <div>
        <h3 className="font-semibold text-slate-900">Block props</h3>
        <p className="text-xs text-slate-500">
          <code>{block.type}</code> · <code>{block.id}</code>
        </p>
      </div>

      {keys.length === 0 ? (
        <p className="text-xs text-slate-500">No known scalar props — edit JSON below.</p>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => {
            const schemaType = properties[key]?.type;
            const value = block.props?.[key];

            if (schemaType === 'boolean' || typeof value === 'boolean') {
              return (
                <label key={key} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-600">{key}</span>
                  <select
                    className="rounded border border-slate-300 px-2 py-1"
                    value={value === true ? 'true' : 'false'}
                    onChange={(e) => setProp(key, e.target.value === 'true')}
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                </label>
              );
            }

            if (typeof value === 'object' && value !== null) {
              return (
                <div key={key} className="text-xs text-slate-500">
                  <span className="font-medium text-slate-700">{key}</span> — complex value (use JSON)
                </div>
              );
            }

            return (
              <label key={key} className="block space-y-1 text-xs">
                <span className="text-slate-600">
                  {key}
                  {schemaType ? ` (${schemaType})` : ''}
                </span>
                <input
                  className="w-full rounded border border-slate-300 px-2 py-1.5"
                  value={value == null ? '' : String(value)}
                  onChange={(e) => setProp(key, coerceValue(e.target.value, schemaType))}
                />
              </label>
            );
          })}
        </div>
      )}

      <div className="space-y-1 border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-700">Raw JSON</span>
          <button
            type="button"
            onClick={applyJson}
            className="rounded border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-50"
          >
            Apply JSON
          </button>
        </div>
        <textarea
          className="h-36 w-full rounded border border-slate-300 bg-slate-950 p-2 font-mono text-[11px] text-slate-100"
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          spellCheck={false}
        />
        {jsonError ? <p className="text-xs text-rose-600">{jsonError}</p> : null}
      </div>
    </div>
  );
}

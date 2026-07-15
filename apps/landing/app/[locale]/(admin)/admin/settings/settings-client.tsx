"use client"

import { Icon } from "@/components/icon"
import { SurfacePanel } from "@/components/surface-panel"
import {
  clearAppSetting,
  setAppSetting,
} from "@/server/actions/admin"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import s from "./settings.module.scss"

interface SettingMeta {
  key: string
  set: boolean
  updatedAt: string | null
  updatedBy: string | null
}

// Display metadata for the Stripe slots. Keep this in sync with
// lib/settings.ts STRIPE_KEYS — values must match exactly.
const STRIPE_FIELDS: Array<{
  key: string
  label: string
  hint: string
  placeholder: string
  destructive?: boolean
}> = [
  {
    key: "STRIPE_SECRET_KEY",
    label: "Stripe secret key",
    hint: "sk_live_… — used server-side for all Stripe API calls. Rotating this revokes any session that still has the previous client cached (next call rebuilds).",
    placeholder: "sk_live_***",
    destructive: true,
  },
  {
    key: "STRIPE_WEBHOOK_SECRET",
    label: "Stripe webhook signing secret",
    hint: "whsec_… — used to verify the signature of every incoming /api/webhooks/stripe event. Wrong value = all webhooks rejected = no subscriptions get created.",
    placeholder: "whsec_***",
    destructive: true,
  },
  {
    key: "STRIPE_PRICE_STARTER",
    label: "Starter price ID",
    hint: "price_… — the Stripe Price object backing the Starter plan ($29/mo).",
    placeholder: "price_***",
  },
  {
    key: "STRIPE_PRICE_PRO",
    label: "Pro price ID",
    hint: "price_… — the Stripe Price object backing the Pro plan ($99/mo).",
    placeholder: "price_***",
  },
  {
    key: "STRIPE_PRICE_ENTERPRISE",
    label: "Enterprise price ID",
    hint: "price_… — the Stripe Price object backing the Enterprise plan ($299/mo).",
    placeholder: "price_***",
  },
  {
    key: "STRIPE_PRICE_CREDITS_25",
    label: "Boost 25 credits price ID",
    hint: "price_… — Stripe Price for the one-off 25-credit top-up pack ($15). Mode: payment (not subscription).",
    placeholder: "price_***",
  },
  {
    key: "STRIPE_PRICE_CREDITS_100",
    label: "Boost 100 credits price ID",
    hint: "price_… — Stripe Price for the one-off 100-credit top-up pack ($49). Mode: payment.",
    placeholder: "price_***",
  },
  {
    key: "STRIPE_PRICE_CREDITS_400",
    label: "Boost 400 credits price ID",
    hint: "price_… — Stripe Price for the one-off 400-credit top-up pack ($159). Mode: payment.",
    placeholder: "price_***",
  },
]

// Meta (Facebook) Conversions API slots. Keep in sync with lib/settings.ts
// META_KEYS. Only the access token is a secret — the Pixel ID is public and
// lives in code.
const META_FIELDS: Array<{
  key: string
  label: string
  hint: string
  placeholder: string
  destructive?: boolean
}> = [
  {
    key: "META_CAPI_ACCESS_TOKEN",
    label: "Meta CAPI access token",
    hint: "System-User token from Events Manager → Settings → Conversions API. Enables the server-side Purchase event that dedups (via the Stripe session id) against the browser Pixel. Leave unset and only the browser Pixel fires.",
    placeholder: "EAAG… (System-User token)",
    destructive: true,
  },
  {
    key: "META_CAPI_TEST_CODE",
    label: "Meta CAPI test event code (optional)",
    hint: "TEST##### from Events Manager → Test Events. When set, server events show up under Test Events for validation — clear it for production so events count normally.",
    placeholder: "TEST12345",
  },
]

// Google Analytics 4 / Google Ads slots. Keep in sync with lib/settings.ts
// GA_KEYS. The Measurement ID is public and lives in code — only the
// Measurement Protocol API secret is sensitive.
const GA_FIELDS: Array<{
  key: string
  label: string
  hint: string
  placeholder: string
  destructive?: boolean
}> = [
  {
    key: "GA4_MP_API_SECRET",
    label: "GA4 Measurement Protocol API secret",
    hint: "From GA4 Admin → Data Streams → (web stream) → Measurement Protocol API secrets. Enables the server-side `purchase` event fired from the Stripe webhook, which also feeds Google Ads via the GA4↔Ads conversion import. Leave unset and only the browser gtag fires.",
    placeholder: "xxxxxxxx (MP secret)",
    destructive: true,
  },
]

export function SettingsClient({
  initialStripe,
  initialMeta,
  initialGa,
}: {
  initialStripe: SettingMeta[]
  initialMeta: SettingMeta[]
  initialGa: SettingMeta[]
}) {
  const [meta, setMeta] = useState<Record<string, SettingMeta>>(
    Object.fromEntries(
      [...initialStripe, ...initialMeta, ...initialGa].map((m) => [m.key, m]),
    ),
  )

  return (
    <div className={s.page}>
      <SurfacePanel
        spaced
        title="Stripe configuration"
        subtitle="Live secrets used by the billing flow. Values are AES-256-GCM encrypted in the AppSetting table; this panel only stores and never displays them."
      >
        <div className={s.warning}>
          <Icon icon="hugeicons:alert-02" />
          <div>
            <strong>These values are production credentials.</strong>
            <p>
              Anyone with access to this panel can authorize charges as Kalit.
              Encryption uses a key derived from AUTH_SECRET — if you rotate
              AUTH_SECRET, every value here becomes unreadable and must be
              re-entered.
            </p>
          </div>
        </div>

        <div className={s.fields}>
          {STRIPE_FIELDS.map((f) => (
            <SettingRow
              key={f.key}
              field={f}
              meta={meta[f.key] || { key: f.key, set: false, updatedAt: null, updatedBy: null }}
              onChanged={(next) => setMeta((prev) => ({ ...prev, [f.key]: next }))}
            />
          ))}
        </div>
      </SurfacePanel>

      <SurfacePanel
        spaced
        title="Meta Conversions API"
        subtitle="Server-side purchase tracking. Sends a Purchase event straight from the Stripe webhook to Meta — a higher-recall twin of the browser Pixel, deduped by the Stripe session id so it never double-counts."
      >
        <div className={s.fields}>
          {META_FIELDS.map((f) => (
            <SettingRow
              key={f.key}
              field={f}
              meta={meta[f.key] || { key: f.key, set: false, updatedAt: null, updatedBy: null }}
              onChanged={(next) => setMeta((prev) => ({ ...prev, [f.key]: next }))}
            />
          ))}
        </div>
      </SurfacePanel>

      <SurfacePanel
        spaced
        title="Google Analytics 4 / Google Ads"
        subtitle="Server-side purchase tracking via the GA4 Measurement Protocol. Fires a `purchase` from the Stripe webhook — the ad-blocker-proof source of truth for GA4 revenue, and (through the GA4↔Ads conversion import) for Google Ads bidding."
      >
        <div className={s.fields}>
          {GA_FIELDS.map((f) => (
            <SettingRow
              key={f.key}
              field={f}
              meta={meta[f.key] || { key: f.key, set: false, updatedAt: null, updatedBy: null }}
              onChanged={(next) => setMeta((prev) => ({ ...prev, [f.key]: next }))}
            />
          ))}
        </div>
      </SurfacePanel>
    </div>
  )
}

function SettingRow({
  field,
  meta,
  onChanged,
}: {
  field: { key: string; label: string; hint: string; placeholder: string; destructive?: boolean }
  meta: SettingMeta
  onChanged: (meta: SettingMeta) => void
}) {
  const [value, setValue] = useState("")
  const [editing, setEditing] = useState(!meta.set)
  const [pending, startTransition] = useTransition()

  const handleSave = () => {
    const trimmed = value.trim()
    if (!trimmed) {
      toast.error("Value cannot be empty")
      return
    }
    if (field.destructive && meta.set) {
      if (
        !confirm(
          `Overwrite ${field.label}?\n\nThis takes effect on the next request — any in-flight Stripe call still uses the previous value, but new ones use this. Make sure the new key is live in your Stripe dashboard before you confirm.`,
        )
      ) {
        return
      }
    }
    startTransition(async () => {
      const result = await setAppSetting(field.key, trimmed)
      if ("error" in result) {
        toast.error(result.error || "Save failed")
        return
      }
      setValue("")
      setEditing(false)
      onChanged({
        key: field.key,
        set: true,
        updatedAt: new Date().toISOString(),
        updatedBy: meta.updatedBy,
      })
      toast.success(`${field.label} saved`)
    })
  }

  const handleClear = () => {
    if (
      !confirm(
        `Clear ${field.label}?\n\nThe code reads from this table only — clearing means the related feature stops working until you set a new value.`,
      )
    ) {
      return
    }
    startTransition(async () => {
      const result = await clearAppSetting(field.key)
      if ("error" in result) {
        toast.error(result.error || "Clear failed")
        return
      }
      setEditing(true)
      onChanged({ key: field.key, set: false, updatedAt: null, updatedBy: null })
      toast.success(`${field.label} cleared`)
    })
  }

  return (
    <div className={s.row}>
      <div className={s.rowHeader}>
        <label className={s.rowLabel} htmlFor={`field-${field.key}`}>
          {field.label}
          {meta.set ? (
            <span className={s.badgeSet}>
              <Icon icon="hugeicons:checkmark-circle-02" /> set
            </span>
          ) : (
            <span className={s.badgeUnset}>
              <Icon icon="hugeicons:circle-arrow-data-transfer-vertical" /> not set
            </span>
          )}
        </label>
        {meta.updatedAt && (
          <span className={s.meta}>
            Updated {new Date(meta.updatedAt).toLocaleString()}
          </span>
        )}
      </div>
      <p className={s.hint}>{field.hint}</p>
      {editing ? (
        <div className={s.editRow}>
          <input
            id={`field-${field.key}`}
            type="password"
            className={s.input}
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
            disabled={pending}
          />
          <button
            type="button"
            className={s.saveBtn}
            onClick={handleSave}
            disabled={pending || !value.trim()}
          >
            <Icon icon={pending ? "hugeicons:loading-03" : "hugeicons:floppy-disk"} />
            Save
          </button>
          {meta.set && (
            <button
              type="button"
              className={s.cancelBtn}
              onClick={() => {
                setValue("")
                setEditing(false)
              }}
              disabled={pending}
            >
              Cancel
            </button>
          )}
        </div>
      ) : (
        <div className={s.actions}>
          <button
            type="button"
            className={s.actionBtn}
            onClick={() => setEditing(true)}
          >
            <Icon icon="hugeicons:edit-02" /> Update
          </button>
          <button
            type="button"
            className={s.dangerBtn}
            onClick={handleClear}
            disabled={pending}
          >
            <Icon icon="hugeicons:delete-02" /> Clear
          </button>
        </div>
      )}
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Icon } from "@/components/icon"
import { brokerFetch } from "@/lib/broker-direct"
import { useI18n } from "@/stores/i18n"
import s from "./project-publish.module.scss"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DeliveryData {
  subdomain: string | null
  subdomainUrl: string | null
  subdomainDeployedAt: string | null
  customDomain: string | null
  customDomainStatus: "pending" | "active" | "failed" | null
  customDomainPurchased: boolean
  domainCreditCost: number
  vercelUrl: string | null
  vercelDeployedAt: string | null
  vercelProjectName: string | null
}

interface DomainCheck {
  available: boolean
  price: number | null
  currency: string
}

interface DnsRecord {
  type: string
  name: string
  value: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProjectPublish() {
  const { t } = useI18n()
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [fulfilling, setFulfilling] = useState(false)
  const [data, setData] = useState<DeliveryData | null>(null)
  const [error, setError] = useState("")

  // Subdomain
  const [slug, setSlug] = useState("")
  const [deploying, setDeploying] = useState(false)
  const [deployError, setDeployError] = useState("")
  const [deploySuccess, setDeploySuccess] = useState("")
  const [removing, setRemoving] = useState(false)

  // Domain
  const [domainMode, setDomainMode] = useState<"connect" | "purchase">("connect")
  const [domainInput, setDomainInput] = useState("")
  const [checking, setChecking] = useState(false)
  const [domainCheck, setDomainCheck] = useState<DomainCheck | null>(null)
  const [domainError, setDomainError] = useState("")
  const [purchasing, setPurchasing] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[] | null>(null)
  const [removingDomain, setRemovingDomain] = useState(false)
  const [acceptNoRefund, setAcceptNoRefund] = useState(false)

  // Vercel
  const [vercelDeploying, setVercelDeploying] = useState(false)
  const [vercelError, setVercelError] = useState("")
  const [vercelSuccess, setVercelSuccess] = useState("")
  const [removingVercel, setRemovingVercel] = useState(false)

  // Download
  const [downloading, setDownloading] = useState(false)
  const [downloadDone, setDownloadDone] = useState(false)
  const [downloadError, setDownloadError] = useState("")

  // ── Fetch delivery info ──

  async function fetchDelivery() {
    try {
      const res = await brokerFetch(`/api/broker/project/${id}/publish`)
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError((json as { error?: string }).error || t("studio.loadDeliveryFailed"))
        return
      }
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch {
      setError(t("studio.networkError"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) fetchDelivery()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Poll domain status if pending
  useEffect(() => {
    if (!data?.customDomain || data.customDomainStatus !== "pending") return
    const interval = setInterval(async () => {
      try {
        const res = await brokerFetch(`/api/broker/project/${id}/publish`)
        if (res.ok) {
          const json = await res.json()
          if (json.success && json.data?.customDomainStatus !== "pending") {
            setData(json.data)
          }
        }
      } catch {
        /* silent */
      }
    }, 10000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.customDomain, data?.customDomainStatus, id])

  // Fulfill domain purchase after Stripe redirect
  useEffect(() => {
    const sessionId = searchParams.get("session_id")
    if (!sessionId || !id || fulfilling) return
    setFulfilling(true)
    ;(async () => {
      try {
        const res = await brokerFetch(`/api/broker/project/${id}/publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "fulfill-domain", sessionId }),
        })
        const json = await res.json()
        if (json.success) {
          fetchDelivery()
        } else {
          setDomainError(json.error || t("studio.domainSetupFailed"))
        }
      } catch {
        setDomainError(t("studio.networkError"))
      } finally {
        setFulfilling(false)
        router.replace(`/studio/project/${id}/publish`)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, id])

  // ── Subdomain handlers ──

  async function handleDeploy() {
    if (!slug.trim()) return
    setDeploying(true)
    setDeployError("")
    setDeploySuccess("")
    try {
      const res = await brokerFetch(`/api/broker/project/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "subdomain", slug: slug.trim() }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setDeployError(json.error || t("studio.deploymentFailed"))
      } else {
        setDeploySuccess(t("studio.liveAt").replace("{url}", json.data?.url || slug + ".kalit.ai"))
        fetchDelivery()
      }
    } catch {
      setDeployError(t("studio.networkError"))
    } finally {
      setDeploying(false)
    }
  }

  async function handleRemoveSubdomain() {
    setRemoving(true)
    try {
      const res = await brokerFetch(`/api/broker/project/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove-subdomain" }),
      })
      if (res.ok) {
        setDeploySuccess("")
        setSlug("")
        fetchDelivery()
      }
    } catch {
      /* silent */
    } finally {
      setRemoving(false)
    }
  }

  // ── Domain handlers ──

  async function handleCheckDomain() {
    if (!domainInput.trim()) return
    setChecking(true)
    setDomainCheck(null)
    setDomainError("")
    try {
      const res = await brokerFetch(
        `/api/broker/project/${id}/publish?action=check-domain&domain=${encodeURIComponent(domainInput.trim().toLowerCase())}`,
      )
      const json = await res.json()
      if (!res.ok || !json.success) {
        setDomainError(json.error || t("studio.checkFailed"))
      } else {
        setDomainCheck(json.data)
      }
    } catch {
      setDomainError(t("studio.networkError"))
    } finally {
      setChecking(false)
    }
  }

  async function handleConnectDomain() {
    if (!domainInput.trim()) return
    setConnecting(true)
    setDomainError("")
    setDnsRecords(null)
    try {
      const res = await brokerFetch(`/api/broker/project/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "connect-domain",
          domain: domainInput.trim().toLowerCase(),
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setDomainError(json.error || t("studio.connectionFailed"))
      } else {
        if (json.data?.dnsRecords) setDnsRecords(json.data.dnsRecords)
        fetchDelivery()
      }
    } catch {
      setDomainError(t("studio.networkError"))
    } finally {
      setConnecting(false)
    }
  }

  async function handlePurchaseDomain() {
    setPurchasing(true)
    setDomainError("")
    try {
      const res = await brokerFetch(`/api/broker/project/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "purchase-domain",
          domain: domainInput.trim().toLowerCase(),
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setDomainError(json.error || t("studio.purchaseFailed"))
        setPurchasing(false)
      } else if (json.data?.checkoutUrl) {
        window.location.href = json.data.checkoutUrl
      }
    } catch {
      setDomainError(t("studio.networkError"))
      setPurchasing(false)
    }
  }

  async function handleRemoveDomain() {
    setRemovingDomain(true)
    try {
      const res = await brokerFetch(`/api/broker/project/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove-domain" }),
      })
      if (res.ok) {
        setDomainInput("")
        setDomainCheck(null)
        setDnsRecords(null)
        fetchDelivery()
      }
    } catch {
      /* silent */
    } finally {
      setRemovingDomain(false)
    }
  }

  // ── Vercel handlers ──

  async function handleVercelDeploy() {
    setVercelDeploying(true)
    setVercelError("")
    setVercelSuccess("")
    try {
      const res = await brokerFetch(`/api/broker/project/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "vercel-deploy" }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setVercelError(json.error || t("studio.deploymentFailed"))
      } else {
        setVercelSuccess(t("studio.deployedTo").replace("{url}", json.data?.url || "Vercel"))
        fetchDelivery()
      }
    } catch {
      setVercelError(t("studio.networkError"))
    } finally {
      setVercelDeploying(false)
    }
  }

  async function handleRemoveVercel() {
    setRemovingVercel(true)
    try {
      const res = await brokerFetch(`/api/broker/project/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove-vercel" }),
      })
      if (res.ok) {
        setVercelSuccess("")
        fetchDelivery()
      }
    } catch {
      /* silent */
    } finally {
      setRemovingVercel(false)
    }
  }

  // ── Download handler ──

  async function handleDownload() {
    setDownloading(true)
    setDownloadError("")
    try {
      const res = await brokerFetch(`/api/broker/project/${id}/download`, { method: "POST" })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setDownloadError(
          res.status === 402
            ? t("studio.notEnoughCreditsDownload")
            : (json as { error?: string }).error || t("studio.downloadFailed"),
        )
        setDownloading(false)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `project-${id}.zip`
      a.click()
      URL.revokeObjectURL(url)
      setDownloadDone(true)
      fetchDelivery()
    } catch {
      setDownloadError(t("studio.networkError"))
    } finally {
      setDownloading(false)
    }
  }

  // ── Render ──

  return (
    <div className={s.shell}>
      {/* Header */}
      <div className={s.header}>
        <Link href={`/studio/project/${id}`} className={s.backBtn}>
          <Icon icon="hugeicons:arrow-left-01" />
          {t("studio.backToPreview")}
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <div className={s.center}>
          <div className={s.loader} />
        </div>
      ) : error ? (
        <div className={s.center}>
          <span className={s.error}>{error}</span>
          <button className={s.btnSecondary} onClick={() => router.push("/studio")}>
            {t("studio.backToStudio")}
          </button>
        </div>
      ) : (
        <div className={s.content}>
          <h1 className={s.title}>{t("studio.publishTitle")}</h1>
          <p className={s.subtitle}>{t("studio.publishSubtitle")}</p>

          <div className={s.grid}>
            {/* ── Card: Subdomain ── */}
            <div className={s.card}>
              <div className={s.cardHeader}>
                <div className={s.cardIconSubdomain}>
                  <Icon icon="hugeicons:globe-02" />
                </div>
                <span className={s.cardTitle}>{t("studio.subdomainHosting")}</span>
              </div>

              {data?.subdomain ? (
                <>
                  <span className={s.liveBadge}>
                    <span className={s.liveDot} />
                    {t("studio.liveLabel")}
                  </span>
                  <a
                    href={data.subdomainUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={s.liveUrl}
                  >
                    {data.subdomainUrl}
                  </a>
                  <div className={s.btnRow}>
                    <button
                      className={s.btnSecondary}
                      onClick={() => {
                        setSlug(data.subdomain!)
                        handleDeploy()
                      }}
                      disabled={deploying}
                    >
                      {deploying ? t("studio.deploying") : t("studio.redeploy")}
                    </button>
                    <button className={s.btnDanger} onClick={handleRemoveSubdomain} disabled={removing} style={{ flex: "none", width: "auto", padding: "var(--size-2) var(--size-3)" }}>
                      {removing ? "..." : t("studio.remove")}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span className={s.label}>{t("studio.subdomainSlug")}</span>
                    <div className={s.inputRow}>
                      <input
                        type="text"
                        value={slug}
                        onChange={(e) =>
                          setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                        }
                        placeholder="my-landing"
                        className={s.input}
                        maxLength={63}
                      />
                      <span className={s.inputSuffix}>.kalit.ai</span>
                    </div>
                  </div>
                  <button
                    className={s.btnPrimary}
                    onClick={handleDeploy}
                    disabled={deploying || !slug.trim()}
                  >
                    {deploying ? t("studio.deploying") : t("studio.deploy")}
                  </button>
                </>
              )}

              {deployError && <span className={s.error}>{deployError}</span>}
              {deploySuccess && <span className={s.success}>{deploySuccess}</span>}
            </div>

            {/* ── Card: Custom Domain ── */}
            <div className={s.card}>
              <div className={s.cardHeader}>
                <div className={s.cardIconDomain}>
                  <Icon icon="hugeicons:globe-02" />
                </div>
                <span className={s.cardTitle}>{t("studio.customDomain")}</span>
              </div>

              {fulfilling ? (
                <div className={s.center}>
                  <div className={s.loaderSmall} />
                  <span style={{ fontSize: "0.75rem", color: "var(--text)" }}>{t("studio.settingUpDomain")}</span>
                </div>
              ) : data?.customDomain ? (
                <>
                  {data.customDomainStatus === "pending" && (
                    <span className={s.pendingBadge}>
                      <div className={s.loaderSmall} />
                      {data.customDomainPurchased ? t("studio.settingUp") : t("studio.waitingDns")}
                    </span>
                  )}
                  {data.customDomainStatus === "active" && (
                    <>
                      <span className={s.liveBadge}>
                        <span className={s.liveDot} />
                        {t("studio.activeLabel")}
                      </span>
                      <a
                        href={`https://${data.customDomain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={s.liveUrl}
                      >
                        https://{data.customDomain}
                      </a>
                    </>
                  )}
                  {data.customDomainStatus === "failed" && (
                    <span className={s.failedBadge}>
                      <span className={s.liveDot} style={{ background: "var(--danger)" }} />
                      {t("studio.failedLabel")}
                    </span>
                  )}
                  {!data.customDomainPurchased && data.customDomainStatus === "pending" && (
                    <div className={s.dnsBox}>
                      <span className={s.dnsTitle}>{t("studio.configureDns")}</span>
                      <div className={s.dnsRow}>
                        <span className={s.dnsType}>A</span>
                        <span className={s.dnsName}>@</span>
                        <span className={s.dnsArrow}>&rarr;</span>
                        <span className={s.dnsValue}>76.76.21.21</span>
                      </div>
                      <div className={s.dnsRow}>
                        <span className={s.dnsType}>CNAME</span>
                        <span className={s.dnsName}>www</span>
                        <span className={s.dnsArrow}>&rarr;</span>
                        <span className={s.dnsValue}>cname.vercel-dns.com</span>
                      </div>
                    </div>
                  )}
                  <button className={s.btnDanger} onClick={handleRemoveDomain} disabled={removingDomain}>
                    {removingDomain ? t("studio.removing") : t("studio.removeDomain")}
                  </button>
                </>
              ) : (
                <>
                  <div className={s.tabRow}>
                    <button
                      className={domainMode === "connect" ? s.tabActive : s.tab}
                      onClick={() => {
                        setDomainMode("connect")
                        setDomainCheck(null)
                        setDomainError("")
                        setDnsRecords(null)
                      }}
                    >
                      {t("studio.connectExisting")}
                    </button>
                    <button
                      className={domainMode === "purchase" ? s.tabActive : s.tab}
                      onClick={() => {
                        setDomainMode("purchase")
                        setDomainCheck(null)
                        setDomainError("")
                        setDnsRecords(null)
                      }}
                    >
                      {t("studio.buyDomain")}
                    </button>
                  </div>

                  <div>
                    <span className={s.label}>{t("studio.domainName")}</span>
                    <div className={s.inputRow}>
                      <input
                        type="text"
                        value={domainInput}
                        onChange={(e) => {
                          setDomainInput(e.target.value)
                          setDomainCheck(null)
                          setDnsRecords(null)
                        }}
                        placeholder="mybusiness.com"
                        className={s.input}
                      />
                    </div>
                  </div>

                  {domainMode === "connect" ? (
                    <>
                      <button
                        className={s.btnPrimary}
                        onClick={handleConnectDomain}
                        disabled={connecting || !domainInput.trim()}
                      >
                        {connecting ? t("studio.connecting") : t("studio.connectDomain")}
                      </button>
                      {dnsRecords && (
                        <div className={s.dnsBox}>
                          <span className={s.dnsTitle}>{t("studio.updateDns")}</span>
                          {dnsRecords.map((r, i) => (
                            <div key={i} className={s.dnsRow}>
                              <span className={s.dnsType}>{r.type}</span>
                              <span className={s.dnsName}>
                                {r.name.split(".")[0] === domainInput.split(".")[0]
                                  ? "@"
                                  : r.name.split(".")[0]}
                              </span>
                              <span className={s.dnsArrow}>&rarr;</span>
                              <span className={s.dnsValue}>{r.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        className={s.btnSecondary}
                        onClick={handleCheckDomain}
                        disabled={checking || !domainInput.trim()}
                      >
                        {checking ? t("studio.checking") : t("studio.checkAvailability")}
                      </button>
                      {domainCheck &&
                        (domainCheck.available ? (
                          <>
                            <div className={s.availableRow}>
                              <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                                {t("studio.available")}
                              </span>
                              <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--success)" }}>
                                {domainCheck.price ? t("studio.pricePerYear").replace("{price}", String(domainCheck.price)) : t("studio.priceOnRequest")}
                              </span>
                            </div>
                            <label className={s.checkboxLabel}>
                              <input
                                type="checkbox"
                                checked={acceptNoRefund}
                                onChange={(e) => setAcceptNoRefund(e.target.checked)}
                              />
                              <span>
                                {t("studio.noRefundNotice")}
                              </span>
                            </label>
                            <button
                              className={s.btnPrimary}
                              onClick={handlePurchaseDomain}
                              disabled={purchasing || !acceptNoRefund}
                            >
                              {purchasing ? t("studio.redirectingPayment") : t("studio.purchaseDeploy")}
                            </button>
                          </>
                        ) : (
                          <span className={s.error}>{t("studio.domainNotAvailable")}</span>
                        ))}
                    </>
                  )}

                  {domainError && <span className={s.error}>{domainError}</span>}
                </>
              )}
            </div>

            {/* ── Card: Vercel ── */}
            <div className={s.card}>
              <div className={s.cardHeader}>
                <div className={s.cardIconVercel}>
                  <Icon icon="hugeicons:triangle" />
                </div>
                <span className={s.cardTitle}>{t("studio.deployToVercel")}</span>
              </div>

              {data?.vercelUrl ? (
                <>
                  <span className={s.liveBadge}>
                    <span className={s.liveDot} />
                    {t("studio.deployed")}
                  </span>
                  <a
                    href={data.vercelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={s.liveUrl}
                  >
                    {data.vercelUrl}
                  </a>
                  <div className={s.btnRow}>
                    <button
                      className={s.btnSecondary}
                      onClick={handleVercelDeploy}
                      disabled={vercelDeploying}
                    >
                      {vercelDeploying ? t("studio.deploying") : t("studio.redeploy")}
                    </button>
                    <button className={s.btnDanger} onClick={handleRemoveVercel} disabled={removingVercel} style={{ flex: "none", width: "auto", padding: "var(--size-2) var(--size-3)" }}>
                      {removingVercel ? "..." : t("studio.remove")}
                    </button>
                  </div>
                </>
              ) : (
                <button
                  className={s.btnPrimary}
                  onClick={handleVercelDeploy}
                  disabled={vercelDeploying}
                >
                  {vercelDeploying ? t("studio.deployingToVercel") : t("studio.deployToVercel")}
                </button>
              )}

              {vercelError && <span className={s.error}>{vercelError}</span>}
              {vercelSuccess && !data?.vercelUrl && <span className={s.success}>{vercelSuccess}</span>}
            </div>

            {/* ── Card: Download ── */}
            <div className={s.card}>
              <div className={s.cardHeader}>
                <div className={s.cardIconDownload}>
                  <Icon icon="hugeicons:download-04" />
                </div>
                <span className={s.cardTitle}>{t("studio.downloadZip")}</span>
              </div>

              {downloadDone ? (
                <div className={s.center} style={{ padding: "var(--size-2) 0" }}>
                  <Icon
                    icon="hugeicons:tick-02"
                    style={{ fontSize: "1.5rem", color: "var(--success)" }}
                  />
                  <span style={{ fontSize: "0.8rem", color: "var(--text)" }}>{t("studio.downloaded")}</span>
                </div>
              ) : (
                <button
                  className={s.btnPrimary}
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  {downloading ? t("studio.downloading") : t("studio.downloadZip")}
                </button>
              )}

              {downloadError && <span className={s.error}>{downloadError}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

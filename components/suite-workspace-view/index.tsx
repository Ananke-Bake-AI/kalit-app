import { SuiteLauncher } from "@/components/app/suite-launcher"
import { Button } from "@/components/button"
import { Container } from "@/components/container"
import { EmptyPlaceholder } from "@/components/empty-placeholder"
import { Logo } from "@/components/logo"
import type { SuiteId } from "@/lib/suites"
import { SUITES } from "@/lib/suites"
import { PageSection } from "@/components/page-section"
import s from "./suite-workspace-view.module.scss"

interface SuiteWorkspaceViewProps {
  suiteId: SuiteId
  launcherDisplayName: string
  hasAccess: boolean
}

export function SuiteWorkspaceView({
  suiteId,
  launcherDisplayName,
  hasAccess
}: SuiteWorkspaceViewProps) {
  const suite = SUITES.find((st) => st.id === suiteId)!

  if (!hasAccess) {
    return (
      <PageSection>
        <Container>
          <EmptyPlaceholder
            icon={
              <div className={s.emptyIcon}>
                <Logo id={suiteId} className={s.emptyLogo} />
              </div>
            }
            title={`Kalit ${suite.title}`}
            description={suite.description}
            footer={<Button href="/settings/billing">Upgrade to unlock</Button>}
          />
        </Container>
      </PageSection>
    )
  }

  return (
    <PageSection>
      <Container>
        <SuiteLauncher suiteId={suiteId} suiteName={launcherDisplayName} />
      </Container>
    </PageSection>
  )
}

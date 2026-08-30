import { Container } from "@/components/ui/container";
import { Logo } from "@/components/marketing/logo";
import { SiteNav } from "@/components/marketing/site-nav";
import { HeaderAuthActions } from "@/components/marketing/header-auth-actions";
import { getShellData } from "@/lib/cms";

export async function SiteHeader() {
  const { siteName, logo, auth, navItems } = await getShellData();

  return (
    <header className="border-outline-variant bg-surface/80 sticky top-0 z-50 border-b backdrop-blur-md">
      <Container className="flex h-20 items-center justify-between gap-4">
        <Logo siteName={siteName} logo={logo} />
        <SiteNav items={navItems} auth={auth} />
        <HeaderAuthActions auth={auth} className="hidden items-center gap-3 md:flex" />
      </Container>
    </header>
  );
}

import type { ReactNode } from "react";
import { PwaInstallGate } from "./PwaInstallGate";
import { PwaOfflineBanner } from "./PwaOfflineBanner";
import { PwaUpdateBanner } from "./PwaUpdateBanner";

type PwaShellProps = {
  children: ReactNode;
};

export function PwaShell({ children }: PwaShellProps) {
  return (
    <PwaInstallGate>
      {children}
      <PwaOfflineBanner />
      <PwaUpdateBanner />
    </PwaInstallGate>
  );
}

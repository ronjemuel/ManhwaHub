import { Suspense } from "react";
import { SettingsPage } from "@/features/settings/settings-page";
import { Loading } from "@/components/ui";
export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <SettingsPage />
    </Suspense>
  );
}

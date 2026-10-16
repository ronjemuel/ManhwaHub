import { Suspense } from "react";
import { MorePage } from "@/features/settings/more-page";
import { Loading } from "@/components/ui";
export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <MorePage />
    </Suspense>
  );
}

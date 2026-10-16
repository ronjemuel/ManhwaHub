import { Suspense } from "react";
import { SourcesPage } from "@/features/sources/sources-page";
import { Loading } from "@/components/ui";
export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <SourcesPage />
    </Suspense>
  );
}

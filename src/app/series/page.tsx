import { Suspense } from "react";
import { SeriesPage } from "@/features/series/series-page";
import { Loading } from "@/components/ui";
export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <SeriesPage />
    </Suspense>
  );
}

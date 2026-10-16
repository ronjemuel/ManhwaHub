import { Suspense } from "react";
import { HistoryPage } from "@/features/history/history-page";
import { Loading } from "@/components/ui";
export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <HistoryPage />
    </Suspense>
  );
}

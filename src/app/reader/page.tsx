import { Suspense } from "react";
import { ReaderPage } from "@/features/reader/reader-page";
import { Loading } from "@/components/ui";
export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <ReaderPage />
    </Suspense>
  );
}

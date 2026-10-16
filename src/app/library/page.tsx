import { Suspense } from "react";
import { LibraryPage } from "@/features/library/library-page";
import { Loading } from "@/components/ui";
export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <LibraryPage />
    </Suspense>
  );
}

import { Suspense } from "react";
import { BrowsePage } from "@/features/browse/browse-page";
import { Loading } from "@/components/ui";
export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <BrowsePage />
    </Suspense>
  );
}

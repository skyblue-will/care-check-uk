import { Suspense } from "react";
import SearchHero from "@/components/SearchHero";
import TrustBanner from "@/components/TrustBanner";
import HowItWorks from "@/components/HowItWorks";

export default function Home() {
  return (
    <>
      <Suspense>
        <SearchHero />
      </Suspense>
      <TrustBanner />
      <HowItWorks />
    </>
  );
}

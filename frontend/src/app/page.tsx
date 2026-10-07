"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser } from "@/lib/auth";
import { PageLoader } from "@/components/ui/Spinner";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    const user = getUser();
    router.replace(user?.role === "WORKER" ? "/worker" : "/dashboard");
  }, [router]);

  return <PageLoader />;
}

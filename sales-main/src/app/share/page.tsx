import { db, schema } from "@/db";
import { desc } from "drizzle-orm";
import { ShareClient } from "@/components/share/share-client";

export const dynamic = "force-dynamic";

export default async function SharePage() {
  const tokens = await db
    .select()
    .from(schema.shareTokens)
    .orderBy(desc(schema.shareTokens.createdAt));

  return <ShareClient tokens={tokens} />;
}

import { NextRequest, NextResponse } from "next/server";
import React from "react";
import {
  renderToBuffer,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { getMonthlySummary } from "@/lib/calculations";
import { ensureSchema } from "@/db/ensure-schema";
import { auth } from "@/auth";

const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: "Helvetica" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 6 },
  subtitle: { fontSize: 11, color: "#666", marginBottom: 28 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  kpiBox: {
    width: "45%",
    padding: 14,
    backgroundColor: "#f4f4f5",
    marginBottom: 12,
  },
  kpiLabel: { fontSize: 9, color: "#71717a", marginBottom: 4 },
  kpiValue: { fontSize: 18, fontWeight: "bold", color: "#18181b" },
  kpiValueRed: { fontSize: 18, fontWeight: "bold", color: "#ef4444" },
  footer: { marginTop: 36, fontSize: 9, color: "#a1a1aa" },
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ year: string; month: string }> }
) {
  await ensureSchema();
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const { year, month } = await params;

  const summary = await getMonthlySummary(`${year}-${month}`, session.user.id);

  const kpiItems: [string, string, boolean?][] = [
    ["Revenue", `NT$ ${summary.revenue.toLocaleString()}`],
    ["Gross Profit", `NT$ ${summary.profit.toLocaleString()}`, summary.profit < 0],
    ["Weekly Costs", `NT$ ${summary.weeklyCostsTotal.toLocaleString()}`],
    ["Net Profit", `NT$ ${summary.netProfit.toLocaleString()}`, summary.netProfit < 0],
    ["Net Profit Rate", `${summary.netProfitRate.toFixed(1)}%`, summary.netProfitRate < 0],
  ];

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{year}/{month} Financial Report</Text>
        <Text style={styles.subtitle}>
          Sales count: {summary.count} transactions
        </Text>
        <View style={styles.grid}>
          {kpiItems.map(([label, value, isNegative]) => (
            <View key={label} style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>{label}</Text>
              <Text style={isNegative ? styles.kpiValueRed : styles.kpiValue}>
                {value}
              </Text>
            </View>
          ))}
        </View>
        <Text style={styles.footer}>
          Generated: {new Date().toISOString()}
        </Text>
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=report-${year}-${month}.pdf`,
    },
  });
}

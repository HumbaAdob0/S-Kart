import {
  FlatList,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { useTransactions, type Transaction } from "@/store/transaction-context";
import { formatCurrency } from "@/utils/format-currency";
import { Colors } from "@/constants/theme";

/* ================================================================== */
/*  Transaction Row                                                    */
/* ================================================================== */

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const { receipt } = transaction;
  const date = new Date(receipt.date);

  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const totalItems = receipt.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <View style={styles.row}>
      {/* Left: icon */}
      <View style={styles.rowIcon}>
        <MaterialIcons name="receipt" size={24} color={Colors.primary} />
      </View>

      {/* Middle: details */}
      <View style={styles.rowInfo}>
        <Text style={styles.receiptId}>{receipt.id}</Text>
        <Text style={styles.rowMeta}>
          {formattedDate} · {formattedTime}
        </Text>
        <Text style={styles.rowMeta}>
          {totalItems} item{totalItems !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Right: total */}
      <View style={styles.rowRight}>
        <Text style={styles.rowTotal}>{formatCurrency(receipt.total)}</Text>
        <Text style={styles.rowTax}>
          incl. {formatCurrency(receipt.tax)} tax
        </Text>
      </View>
    </View>
  );
}

/* ================================================================== */
/*  History Screen                                                     */
/* ================================================================== */

export default function HistoryScreen() {
  const { transactions, loading } = useTransactions();

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>Loading transactions…</Text>
      </View>
    );
  }

  if (transactions.length === 0) {
    return (
      <View style={styles.center}>
        <MaterialIcons name="history" size={80} color={Colors.border} />
        <Text style={styles.emptyTitle}>No transactions yet</Text>
        <Text style={styles.emptySub}>
          Completed checkouts will appear here
        </Text>
      </View>
    );
  }

  // Calculate summary
  const totalRevenue = transactions.reduce(
    (sum, t) => sum + t.receipt.total,
    0,
  );
  const totalTransactions = transactions.length;

  return (
    <View style={styles.container}>
      {/* Summary card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{totalTransactions}</Text>
          <Text style={styles.summaryLabel}>Transactions</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {formatCurrency(totalRevenue)}
          </Text>
          <Text style={styles.summaryLabel}>Total Expenses</Text>
        </View>
      </View>

      {/* Transaction list */}
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TransactionRow transaction={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

/* ================================================================== */
/*  Styles                                                             */
/* ================================================================== */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  /* Center/empty state */
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: Colors.background,
  },
  centerText: { fontSize: 16, color: Colors.textSecondary },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 6,
    textAlign: "center",
  },

  /* Summary card */
  summaryCard: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.primary,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    fontWeight: "600",
  },

  /* Transaction list */
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowInfo: { flex: 1 },
  receiptId: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
  },
  rowMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  rowRight: { alignItems: "flex-end" },
  rowTotal: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.primary,
  },
  rowTax: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});

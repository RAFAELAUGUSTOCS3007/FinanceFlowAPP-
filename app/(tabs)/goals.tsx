import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { ScreenContainer } from "@/components/screen-container";
import { MoneyText } from "@/components/money-text";
import { ProgressBar } from "@/components/progress-bar";
import { MonthSelector } from "@/components/month-selector";
import { useFinance, MONTH_NAMES, formatCurrency } from "@/lib/finance-context";
import { useColors } from "@/hooks/use-colors";
import type { ThemeColorPalette } from "@/constants/theme";

// ─── Goal Card ────────────────────────────────────────────────────────────────

const GoalCard = React.memo(function GoalCard({ icon, title, subtitle, target, saved, monthSaved, color, bgColor, onAdd, colors }: { icon, title, subtitle, target, saved, monthSaved, color, bgColor, onAdd: any; colors: ThemeColorPalette }) {
  const progress = Math.min(saved / target, 1);
  const pct = Math.round(progress * 100);
  const remaining = Math.max(0, target - saved);
  const isComplete = saved >= target;

  return (
    <View style={[styles.goalCard, { backgroundColor: colors.surface }]}>
      {/* Top accent bar */}
      <View style={[styles.goalAccent, { backgroundColor: color }]} />

      <View style={styles.goalCardHeader}>
        <View style={[styles.goalIcon, { backgroundColor: bgColor }]}>
          <Text style={{ fontSize: 26 }}>{icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.goalTitle, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.goalSubtitle, { color: colors.muted }]}>Meta: {formatCurrency(target)}</Text>
        </View>
        <Pressable onPress={onAdd} style={({ pressed }) => [styles.addReserveBtn, { backgroundColor: color, opacity: pressed ? 0.8 : 1 }]}>
          <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "700" }}>+ Guardar</Text>
        </Pressable>
      </View>

      {/* Progress */}
      <ProgressBar progress={progress} color={color} backgroundColor={colors.border} height={14} />

      {/* Milestones */}
      <View style={styles.milestonesRow}>
        {[25, 50, 75, 100].map((m) => (
          <View key={m} style={styles.milestoneItem}>
            <View style={[styles.milestoneDot, { backgroundColor: pct >= m ? color : colors.border }]} />
            <Text style={{ fontSize: 9, color: pct >= m ? color : colors.muted }}>{m}%</Text>
          </View>
        ))}
      </View>

      <View style={styles.goalStats}>
        <View style={styles.goalStat}>
          <Text style={[styles.goalStatLabel, { color: colors.muted }]}>Guardado</Text>
          <MoneyText value={saved} style={[styles.goalStatValue, { color }]} />
        </View>
        <View style={[styles.goalStatCenter, { backgroundColor: bgColor, borderRadius: 12 }]}>
          <Text style={[styles.goalPct, { color }]}>{pct}%</Text>
          <Text style={{ fontSize: 10, color, fontWeight: "500" }}>{isComplete ? "🎉 Meta!" : "concluído"}</Text>
        </View>
        <View style={[styles.goalStat, { alignItems: "flex-end" }]}>
          <Text style={[styles.goalStatLabel, { color: colors.muted }]}>Faltante</Text>
          <MoneyText value={remaining} style={[styles.goalStatValue, { color: remaining > 0 ? colors.expense : color }]} />
        </View>
      </View>

      {monthSaved > 0 && (
        <View style={[styles.monthBadge, { backgroundColor: bgColor }]}>
          <Text style={{ color, fontSize: 12, fontWeight: "600" }}>Este mês: +{formatCurrency(monthSaved)}</Text>
        </View>
      )}
    </View>
  );
});

// ─── Reservation Row ──────────────────────────────────────────────────────────

const ReservationRow = React.memo(function ReservationRow({ item, goalName, onDelete, colors }: { item, goalName, onDelete: any; colors: ThemeColorPalette }) {
  const swipeRef = useRef<Swipeable>(null);

  const renderRightActions = useCallback((progress: Animated.AnimatedInterpolation<number>) => {
    const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });
    return (
      <Animated.View style={[{ transform: [{ translateX }] }, styles.swipeActions]}>
        <Pressable onPress={() => { swipeRef.current?.close(); onDelete(item.id); }} style={[styles.swipeBtn, { backgroundColor: "#EF4444" }]}>
          <Text style={{ fontSize: 18 }}>🗑️</Text>
          <Text style={styles.swipeBtnLabel}>Excluir</Text>
        </Pressable>
      </Animated.View>
    );
  }, [item.id, onDelete]);

  return (
    <Swipeable ref={swipeRef} renderRightActions={renderRightActions} overshootRight={false} friction={2}>
      <View style={[styles.reservationItem, { borderColor: colors.border }]}>
        <Text style={{ fontSize: 22 }}>{item.type === "emergency" ? "🛡️" : "🎯"}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.reservationName, { color: colors.foreground }]}>
            {item.type === "emergency" ? "Reserva de Emergência" : goalName}
          </Text>
        </View>
        <MoneyText value={item.value} style={[styles.reservationValue, { color: item.type === "emergency" ? "#7C3AED" : "#D97706" }]} />
      </View>
    </Swipeable>
  );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function GoalsScreen() {
  const { state, currentMonthData, totalEmergencyFundSaved, totalGoalSaved, dispatch, generateId } = useFinance();
  const colors = useColors();
  const [showModal, setShowModal] = useState(false);
  const [reservationType, setReservationType] = useState<"emergency" | "goal">("emergency");
  const [formValue, setFormValue] = useState("");

  const { settings } = state;
  const monthReservations = useMemo(() => currentMonthData?.reservations ?? [], [currentMonthData]);
  const monthEmergency = useMemo(() => monthReservations.filter((r) => r.type === "emergency").reduce((s, r) => s + r.value, 0), [monthReservations]);
  const monthGoal = useMemo(() => monthReservations.filter((r) => r.type === "goal").reduce((s, r) => s + r.value, 0), [monthReservations]);

  // Monthly history for last 6 months
  const monthlyHistory = useMemo(() => {
    const result: Array<{ label: string; emergency: number; goal: number }> = [];
    for (let i = 5; i >= 0; i--) {
      let m = state.currentMonth - i, y = state.currentYear;
      if (m <= 0) { m += 12; y -= 1; }
      const md = state.months.find((mo) => mo.month === m && mo.year === y);
      const res = md?.reservations ?? [];
      result.push({
        label: MONTH_NAMES[m - 1].substring(0, 3),
        emergency: res.filter((r) => r.type === "emergency").reduce((s, r) => s + r.value, 0),
        goal: res.filter((r) => r.type === "goal").reduce((s, r) => s + r.value, 0),
      });
    }
    return result.filter((r) => r.emergency > 0 || r.goal > 0);
  }, [state.months, state.currentMonth, state.currentYear]);

  const openModal = useCallback((type: "emergency" | "goal") => { setReservationType(type); setFormValue(""); setShowModal(true); }, []);
  const handleSave = useCallback(() => {
    const value = parseFloat(formValue.replace(",", "."));
    if (isNaN(value) || value <= 0) return;
    dispatch({ type: "ADD_RESERVATION", payload: { id: generateId(), type: reservationType, value, month: state.currentMonth, year: state.currentYear } });
    setShowModal(false);
  }, [formValue, reservationType, dispatch, generateId, state.currentMonth, state.currentYear]);

  const handleDeleteReservation = useCallback((id: string) => {
    Alert.alert("Excluir reserva", "Deseja excluir este registro de reserva?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => dispatch({ type: "DELETE_RESERVATION", payload: id }) },
    ]);
  }, [dispatch]);

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.header}>
          <Text style={styles.title}>Metas & Reservas</Text>
        </View>

        <View style={{ paddingBottom: 16 }}><MonthSelector /></View>

        {/* Emergency Fund */}
        <GoalCard
          icon="🛡️" title="Reserva de Emergência" subtitle={`Meta: ${formatCurrency(settings.emergencyFundTarget)}`}
          target={settings.emergencyFundTarget} saved={totalEmergencyFundSaved} monthSaved={monthEmergency}
          color="#7C3AED" bgColor="#EDE9FE" onAdd={() => openModal("emergency")} colors={colors}
        />

        {/* Personal Goal */}
        <GoalCard
          icon="🎯" title={settings.goalName} subtitle={`Meta: ${formatCurrency(settings.goalTarget)}`}
          target={settings.goalTarget} saved={totalGoalSaved} monthSaved={monthGoal}
          color="#D97706" bgColor="#FEF3C7" onAdd={() => openModal("goal")} colors={colors}
        />

        {/* Monthly history */}
        {monthlyHistory.length > 0 && (
          <View style={[styles.historyCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.historyTitle, { color: colors.foreground }]}>Histórico de Reservas</Text>
            {monthlyHistory.map((mh, i) => (
              <View key={i} style={[styles.historyRow, { borderColor: colors.border }]}>
                <Text style={[styles.historyMonth, { color: colors.muted }]}>{mh.label}</Text>
                <View style={styles.historyBadges}>
                  {mh.emergency > 0 && (
                    <View style={[styles.historyBadge, { backgroundColor: "#EDE9FE" }]}>
                      <Text style={{ fontSize: 10, color: "#7C3AED", fontWeight: "600" }}>🛡️ {formatCurrency(mh.emergency)}</Text>
                    </View>
                  )}
                  {mh.goal > 0 && (
                    <View style={[styles.historyBadge, { backgroundColor: "#FEF3C7" }]}>
                      <Text style={{ fontSize: 10, color: "#D97706", fontWeight: "600" }}>🎯 {formatCurrency(mh.goal)}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* This month's reservations */}
        {monthReservations.length > 0 && (
          <View style={[styles.historyCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.historyTitle, { color: colors.foreground }]}>Registros deste mês</Text>
            <Text style={[styles.historySubtitle, { color: colors.muted }]}>Deslize para excluir</Text>
            {monthReservations.map((r) => (
              <ReservationRow key={r.id} item={r} goalName={settings.goalName} onDelete={handleDeleteReservation} colors={colors} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHandle} />
            <Text style={{ fontSize: 32, textAlign: "center", marginBottom: 4 }}>{reservationType === "emergency" ? "🛡️" : "🎯"}</Text>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {reservationType === "emergency" ? "Reserva de Emergência" : settings.goalName}
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.muted }]}>Quanto você está guardando este mês?</Text>

            <TextInput value={formValue} onChangeText={setFormValue} placeholder="0,00" placeholderTextColor={colors.muted} keyboardType="decimal-pad" autoFocus
              style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border, fontSize: 28, textAlign: "center", fontWeight: "700" }]} />

            <View style={styles.modalButtons}>
              <Pressable onPress={() => setShowModal(false)} style={({ pressed }) => [styles.cancelBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}>
                <Text style={[styles.cancelBtnText, { color: colors.muted }]}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={handleSave} style={({ pressed }) => [styles.saveBtn, { backgroundColor: reservationType === "emergency" ? "#7C3AED" : "#D97706", opacity: pressed ? 0.8 : 1 }]}>
                <Text style={styles.saveBtnText}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: "900", letterSpacing: -1, color: "#F2F2FF" },
  goalCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 20, padding: 20, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  goalAccent: { position: "absolute", top: 0, left: 0, right: 0, height: 3 },
  goalCardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16, marginTop: 4 },
  goalIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  goalTitle: { fontSize: 16, fontWeight: "700" },
  goalSubtitle: { fontSize: 12, marginTop: 2 },
  addReserveBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16 },
  milestonesRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4, marginTop: 8, marginBottom: 12 },
  milestoneItem: { alignItems: "center", gap: 3 },
  milestoneDot: { width: 8, height: 8, borderRadius: 4 },
  goalStats: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  goalStat: { flex: 1 },
  goalStatCenter: { alignItems: "center", paddingHorizontal: 16, paddingVertical: 8 },
  goalStatLabel: { fontSize: 11, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.3 },
  goalStatValue: { fontSize: 15, fontWeight: "700", marginTop: 2 },
  goalPct: { fontSize: 20, fontWeight: "800" },
  monthBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, alignSelf: "flex-start" },
  historyCard: { marginHorizontal: 16, borderRadius: 20, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  historyTitle: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  historySubtitle: { fontSize: 11, marginBottom: 12 },
  historyRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 0.5, gap: 12 },
  historyMonth: { fontSize: 12, fontWeight: "600", width: 32 },
  historyBadges: { flexDirection: "row", gap: 6, flex: 1, flexWrap: "wrap" },
  historyBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  reservationItem: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 0.5, gap: 12 },
  reservationName: { fontSize: 14, fontWeight: "500" },
  reservationValue: { fontSize: 15, fontWeight: "700" },
  swipeActions: { alignItems: "center", borderRadius: 14, overflow: "hidden", marginLeft: 8 },
  swipeBtn: { width: 68, alignItems: "center", justifyContent: "center", paddingVertical: 14, gap: 2 },
  swipeBtnLabel: { color: "#fff", fontSize: 10, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#CBD5E1", alignSelf: "center", marginBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  modalSubtitle: { fontSize: 14, textAlign: "center", marginTop: 4, marginBottom: 20 },
  input: { borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 16 },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontWeight: "600" },
  saveBtn: { flex: 2, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  saveBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});

/**
 * app/onboarding.tsx — Fase 3 refactor
 * Onboarding guiado em 5 steps com coleta de dados reais.
 * Ao finalizar o usuário tem: renda, 3 fixas e 1 meta cadastradas.
 * Dashboard nunca fica vazio no primeiro acesso.
 */

import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useAppStore } from "@/lib/store/index";
import { generateId } from "@/lib/store/finance-slice";

const ONBOARDING_DONE_KEY = "@financeflow_onboarding_done";
const NEON = "#AAFF00";
const NEON_DIM = "rgba(170,255,0,0.12)";
const BG = "#0A0A0F";
const SURFACE = "#17171D";
const BORDER = "#252530";
const MUTED = "#7A7A96";
const TEXT = "#F2F2FF";
const TEXT2 = "#C8C8E0";

const TOTAL_STEPS = 5;

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepDots({ current }: { current: number }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i < current
              ? { backgroundColor: NEON, width: 20 }
              : i === current
              ? { backgroundColor: NEON, width: 28 }
              : { backgroundColor: BORDER, width: 8 },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Input field ──────────────────────────────────────────────────────────────

function Field({
  label, placeholder, value, onChangeText, keyboardType = "default", autoFocus = false,
}: {
  label: string; placeholder: string; value: string;
  onChangeText: (v: string) => void; keyboardType?: any; autoFocus?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={MUTED}
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        style={styles.input}
      />
    </View>
  );
}

// ─── Fixed expense mini-form ──────────────────────────────────────────────────

interface FixedDraft { name: string; value: string }

function FixedForm({
  index, draft, onChange,
}: {
  index: number; draft: FixedDraft; onChange: (d: FixedDraft) => void;
}) {
  return (
    <View style={styles.fixedRow}>
      <Text style={styles.fixedIndex}>{index + 1}</Text>
      <View style={{ flex: 1, gap: 8 }}>
        <TextInput
          value={draft.name}
          onChangeText={(v) => onChange({ ...draft, name: v })}
          placeholder={["Aluguel", "Escola", "Academia"][index] ?? "Ex: Internet"}
          placeholderTextColor={MUTED}
          style={[styles.input, { flex: undefined }]}
        />
        <TextInput
          value={draft.value}
          onChangeText={(v) => onChange({ ...draft, value: v })}
          placeholder="Valor (R$)"
          placeholderTextColor={MUTED}
          keyboardType="decimal-pad"
          style={[styles.input, { flex: undefined }]}
        />
      </View>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Step 0 — Welcome (no input)
  // Step 1 — Name + income
  const [name, setName] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");

  // Step 2 — 3 fixed expenses
  const [fixeds, setFixeds] = useState<FixedDraft[]>([
    { name: "", value: "" },
    { name: "", value: "" },
    { name: "", value: "" },
  ]);

  // Step 3 — 1 goal
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");

  // Step 4 — Enable notifications (optional, just UI)
  const [notifsEnabled, setNotifsEnabled] = useState(false);

  const updateFixed = useCallback((i: number, d: FixedDraft) => {
    setFixeds((prev) => prev.map((f, idx) => (idx === i ? d : f)));
  }, []);

  const animateTransition = useCallback((nextStep: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    setStep(nextStep);
  }, [fadeAnim]);

  const handleNext = useCallback(() => {
    if (step === 1 && !name.trim()) {
      Alert.alert("Informe seu nome", "Coloque seu nome para personalizarmos o app.");
      return;
    }
    if (step < TOTAL_STEPS - 1) animateTransition(step + 1);
  }, [step, name, animateTransition]);

  const handleBack = useCallback(() => {
    if (step > 0) animateTransition(step - 1);
  }, [step, animateTransition]);

  const { updateSettings, addIncome, addFixedExpense } = useAppStore();

  const handleFinish = useCallback(async () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // 1. Update settings
    updateSettings({
      name: name.trim() || "Usuário",
      goalName: goalName.trim() || "Minha Meta",
      goalTarget: parseFloat(goalTarget.replace(",", ".")) || 10000,
    });

    // 2. Add income if provided
    const incomeVal = parseFloat(monthlyIncome.replace(",", "."));
    if (!isNaN(incomeVal) && incomeVal > 0) {
      addIncome({ id: generateId(), name: "Salário", value: incomeVal, month, year });
    }

    // 3. Add fixed expenses
    for (const f of fixeds) {
      const val = parseFloat(f.value.replace(",", "."));
      if (f.name.trim() && !isNaN(val) && val > 0) {
        addFixedExpense({
          id: generateId(),
          name: f.name.trim(),
          plannedValue: val,
          isPaid: false,
          month,
          year,
        });
      }
    }

    await AsyncStorage.setItem(ONBOARDING_DONE_KEY, "true"); // onboarding flag is non-sensitive
    router.replace("/(tabs)");
  }, [name, monthlyIncome, fixeds, goalName, goalTarget, updateSettings, addIncome, addFixedExpense]);

  // ── Render steps ────────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.bigEmoji}>💚</Text>
            <Text style={styles.stepTitle}>Bem-vindo ao{"\n"}<Text style={{ color: NEON }}>FinanceFlow</Text></Text>
            <Text style={styles.stepSub}>
              Controle financeiro inteligente com dark mode, orçamento por categoria, metas e muito mais.
            </Text>
            <View style={styles.featureList}>
              {[
                ["📊", "Dashboard com saúde financeira"],
                ["🔮", "Projeção de saldo 90 dias"],
                ["🤖", "Alertas inteligentes automáticos"],
                ["☁️", "Backup Google Drive"],
              ].map(([icon, text]) => (
                <View key={text} style={styles.featureItem}>
                  <Text style={styles.featureIcon}>{icon}</Text>
                  <Text style={styles.featureText}>{text}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.stepSub, { marginTop: 24, fontSize: 12, color: MUTED }]}>
              Leva menos de 2 minutos para configurar.
            </Text>
          </View>
        );

      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.bigEmoji}>👋</Text>
            <Text style={styles.stepTitle}>Vamos começar!</Text>
            <Text style={styles.stepSub}>
              Diga seu nome e sua renda mensal para personalizarmos o app.
            </Text>
            <Field label="Seu nome" placeholder="Ex: Rafael" value={name} onChangeText={setName} autoFocus />
            <Field
              label="Renda mensal (R$)"
              placeholder="Ex: 5.000,00"
              value={monthlyIncome}
              onChangeText={setMonthlyIncome}
              keyboardType="decimal-pad"
            />
            <Text style={styles.hint}>
              💡 A renda é usada para calcular seu score financeiro e projeções.
              Pode ser atualizada depois.
            </Text>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.bigEmoji}>📋</Text>
            <Text style={styles.stepTitle}>Suas despesas fixas</Text>
            <Text style={styles.stepSub}>
              Adicione até 3 contas que você paga todo mês. Aluguel, escola, internet...
            </Text>
            {fixeds.map((f, i) => (
              <FixedForm key={i} index={i} draft={f} onChange={(d) => updateFixed(i, d)} />
            ))}
            <Text style={styles.hint}>
              💡 Pode pular — você adiciona mais depois na aba Fixas.
            </Text>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.bigEmoji}>🎯</Text>
            <Text style={styles.stepTitle}>Sua meta financeira</Text>
            <Text style={styles.stepSub}>
              Qual é seu objetivo financeiro? Uma viagem, reserva de emergência, carro...
            </Text>
            <Field
              label="Nome da meta"
              placeholder="Ex: Viagem para Europa"
              value={goalName}
              onChangeText={setGoalName}
            />
            <Field
              label="Valor da meta (R$)"
              placeholder="Ex: 15.000,00"
              value={goalTarget}
              onChangeText={setGoalTarget}
              keyboardType="decimal-pad"
            />
            <Text style={styles.hint}>
              💡 O app vai acompanhar seu progresso e te avisar quando atingir marcos.
            </Text>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.bigEmoji}>🔔</Text>
            <Text style={styles.stepTitle}>Notificações inteligentes</Text>
            <Text style={styles.stepSub}>
              Receba alertas sobre despesas vencendo, orçamentos no limite e metas atingidas.
            </Text>
            <Pressable
              onPress={() => setNotifsEnabled(!notifsEnabled)}
              style={[
                styles.notifCard,
                { borderColor: notifsEnabled ? NEON : BORDER,
                  backgroundColor: notifsEnabled ? NEON_DIM : SURFACE },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.notifTitle, { color: notifsEnabled ? NEON : TEXT }]}>
                  Ativar notificações
                </Text>
                <Text style={[styles.notifSub, { color: MUTED }]}>
                  Alertas de fixas vencendo · Orçamentos · Metas
                </Text>
              </View>
              <View style={[styles.toggle, { backgroundColor: notifsEnabled ? NEON : BORDER }]}>
                <View style={[
                  styles.toggleThumb,
                  { transform: [{ translateX: notifsEnabled ? 20 : 2 }] },
                ]} />
              </View>
            </Pressable>

            <View style={[styles.summaryCard, { backgroundColor: SURFACE }]}>
              <Text style={[styles.summaryTitle, { color: MUTED }]}>RESUMO DO QUE VOCÊ CONFIGUROU</Text>
              {name ? <Text style={styles.summaryLine}>👤 Nome: <Text style={{ color: TEXT }}>{name}</Text></Text> : null}
              {monthlyIncome ? <Text style={styles.summaryLine}>💰 Renda: <Text style={{ color: "#00E5A0" }}>R$ {monthlyIncome}</Text></Text> : null}
              {fixeds.filter((f) => f.name).map((f, i) => (
                <Text key={i} style={styles.summaryLine}>📋 {f.name}: <Text style={{ color: "#FFBB45" }}>R$ {f.value}</Text></Text>
              ))}
              {goalName ? <Text style={styles.summaryLine}>🎯 Meta: <Text style={{ color: "#C084FC" }}>{goalName}</Text></Text> : null}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          {step > 0 ? (
            <Pressable onPress={handleBack} hitSlop={12}>
              <Text style={{ color: NEON, fontSize: 15, fontWeight: "600" }}>← Voltar</Text>
            </Pressable>
          ) : <View />}
          <StepDots current={step} />
          <Pressable onPress={handleFinish} hitSlop={12}>
            <Text style={{ color: MUTED, fontSize: 13 }}>Pular</Text>
          </Pressable>
        </View>

        {/* Content */}
        <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
          {renderStep()}
        </Animated.View>

        {/* CTA */}
        <View style={styles.cta}>
          <Pressable
            onPress={isLastStep ? handleFinish : handleNext}
            style={({ pressed }) => [styles.ctaBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.ctaBtnText}>
              {isLastStep ? "✓ COMEÇAR A USAR" : "CONTINUAR →"}
            </Text>
          </Pressable>
          {isLastStep && (
            <Text style={[styles.ctaNote, { color: MUTED }]}>
              Tudo pode ser editado depois nas configurações
            </Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 56, paddingBottom: 12 },
  dots: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { height: 6, borderRadius: 3 },
  stepContent: { paddingHorizontal: 24, paddingTop: 24, flex: 1 },
  bigEmoji: { fontSize: 56, marginBottom: 20, textAlign: "center" },
  stepTitle: { fontSize: 32, fontWeight: "900", color: TEXT, letterSpacing: -1.5, lineHeight: 38, marginBottom: 14, textAlign: "center" },
  stepSub: { fontSize: 15, color: TEXT2, lineHeight: 22, textAlign: "center", marginBottom: 28 },
  featureList: { gap: 12, marginBottom: 8 },
  featureItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: SURFACE, borderRadius: 12, borderWidth: 1, borderColor: BORDER },
  featureIcon: { fontSize: 22 },
  featureText: { fontSize: 14, color: TEXT2, fontWeight: "500" },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5, color: MUTED, textTransform: "uppercase", marginBottom: 8 },
  input: { backgroundColor: SURFACE, borderWidth: 1.5, borderColor: BORDER, borderRadius: 12, padding: 14, fontSize: 16, color: TEXT },
  hint: { fontSize: 12, color: MUTED, lineHeight: 18, marginTop: 8, textAlign: "center" },
  fixedRow: { flexDirection: "row", gap: 12, marginBottom: 12, alignItems: "flex-start" },
  fixedIndex: { width: 28, height: 28, borderRadius: 14, backgroundColor: NEON, textAlign: "center", lineHeight: 28, fontSize: 13, fontWeight: "900", color: BG, marginTop: 10 },
  notifCard: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderRadius: 14, padding: 16, marginBottom: 20, gap: 12 },
  notifTitle: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  notifSub: { fontSize: 12 },
  toggle: { width: 44, height: 26, borderRadius: 13, position: "relative" },
  toggleThumb: { position: "absolute", top: 3, width: 20, height: 20, borderRadius: 10, backgroundColor: "white" },
  summaryCard: { borderRadius: 14, padding: 16, gap: 8 },
  summaryTitle: { fontSize: 10, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 },
  summaryLine: { fontSize: 13, color: MUTED },
  cta: { paddingHorizontal: 24, paddingTop: 24 },
  ctaBtn: { backgroundColor: NEON, borderRadius: 16, padding: 18, alignItems: "center" },
  ctaBtnText: { color: BG, fontWeight: "900", fontSize: 15, letterSpacing: 1.5 },
  ctaNote: { textAlign: "center", fontSize: 12, marginTop: 10 },
});

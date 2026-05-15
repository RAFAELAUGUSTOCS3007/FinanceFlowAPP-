import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as Notifications from "expo-notifications";
import { ScreenContainer } from "@/components/screen-container";
import { useFinance, formatCurrency, MONTH_NAMES } from "@/lib/finance-context";
import { useColors } from "@/hooks/use-colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeContext } from "@/lib/theme-provider";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAppStore } from "@/lib/store/index";


const BIOMETRIC_KEY = "@financeflow_biometric_enabled";
const NOTIF_KEY = "@financeflow_notif_enabled";

export default function SettingsScreen() {
  const { state, dispatch } = useFinance();
  const colors = useColors();
  const colorScheme = useColorScheme();
  const { colorScheme: themeScheme, setColorScheme } = useThemeContext();
  const toggleTheme = () => setColorScheme(themeScheme === "dark" ? "light" : "dark");
  const { settings } = state;

  const [name, setName] = useState(settings.name);
  const [pronouns, setPronouns] = useState(settings.pronouns);
  const [goalName, setGoalName] = useState(settings.goalName);
  const [goalTarget, setGoalTarget] = useState((settings.goalTarget ?? 0).toString());
  const [emergencyTarget, setEmergencyTarget] = useState(settings.emergencyFundTarget.toString());
  const [creditLimit, setCreditLimit] = useState((settings.creditLimit ?? 5000).toString());
  const [isDirty, setIsDirty] = useState(false);

  // Security & Notifications
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);

  useEffect(() => {
    // Check biometric availability
    LocalAuthentication.hasHardwareAsync().then((has) => {
      if (has) {
        LocalAuthentication.isEnrolledAsync().then((enrolled) => {
          setBiometricAvailable(enrolled);
        });
      }
    });
    // Load saved preferences
    AsyncStorage.getItem(BIOMETRIC_KEY).then((v) => setBiometricEnabled(v === "true"));
    AsyncStorage.getItem(NOTIF_KEY).then((v) => setNotifEnabled(v === "true"));
  }, []);

  const handleChange = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setIsDirty(true);
  };

  const handleSave = () => {
    const goalTargetValue = parseFloat(goalTarget.replace(",", "."));
    const emergencyFundTarget = parseFloat(emergencyTarget.replace(",", "."));
    const creditLimitValue = parseFloat(creditLimit.replace(",", "."));

    if (isNaN(goalTargetValue) || isNaN(emergencyFundTarget)) {
      Alert.alert("Erro", "Por favor, insira valores válidos para as metas.");
      return;
    }

    dispatch({
      type: "UPDATE_SETTINGS",
      payload: {
        name: name.trim() || settings.name,
        pronouns: pronouns.trim(),
        goalName: goalName.trim() || settings.goalName,
        goalTarget: goalTargetValue,
        emergencyFundTarget,
        creditLimit: isNaN(creditLimitValue) ? (settings.creditLimit ?? 5000) : creditLimitValue,
      },
    });
    setIsDirty(false);
    Alert.alert("✅ Salvo!", "Suas configurações foram atualizadas.");
  };

  const handleToggleBiometric = async (value: boolean) => {
    if (value) {
      if (!biometricAvailable) {
        Alert.alert("Biometria indisponível", "Seu dispositivo não possui biometria configurada.");
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Confirme sua identidade para ativar a proteção biométrica",
        fallbackLabel: "Usar senha",
      });
      if (!result.success) return;
    }
    setBiometricEnabled(value);
    await AsyncStorage.setItem(BIOMETRIC_KEY, value ? "true" : "false");
    Alert.alert(
      value ? "🔒 Biometria ativada" : "🔓 Biometria desativada",
      value ? "O app pedirá sua biometria ao abrir." : "A proteção biométrica foi desativada."
    );
  };

  const handleToggleNotifications = async (value: boolean) => {
    if (value && Platform.OS !== "web") {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permissão negada", "Ative as notificações nas configurações do seu dispositivo.");
        return;
      }
      // Schedule a daily reminder for pending fixed expenses
      await Notifications.cancelAllScheduledNotificationsAsync();
      const pendingFixed = (state.months
        .find((m) => m.month === state.currentMonth && m.year === state.currentYear)
        ?.fixedExpenses ?? [])
        .filter((e) => !e.isPaid);

      if (pendingFixed.length > 0) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "💰 FinanceFlow",
            body: `Você tem ${pendingFixed.length} conta(s) fixa(s) pendente(s) este mês!`,
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: 9,
            minute: 0,
          },
        });
      }
    } else if (!value && Platform.OS !== "web") {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
    setNotifEnabled(value);
    await AsyncStorage.setItem(NOTIF_KEY, value ? "true" : "false");
  };

  const handleDuplicateMonth = () => {
    const nextMonth = state.currentMonth === 12 ? 1 : state.currentMonth + 1;
    const nextYear = state.currentMonth === 12 ? state.currentYear + 1 : state.currentYear;
    const nextName = MONTH_NAMES[nextMonth - 1];
    const existingData = state.months.find((m) => m.month === nextMonth && m.year === nextYear);
    const hasData = existingData && (existingData.fixedExpenses.length > 0 || existingData.incomes.length > 0);

    Alert.alert(
      "Duplicar para " + nextName,
      hasData
        ? `${nextName} já possui dados. Deseja substituir as despesas fixas e entradas com os dados de ${MONTH_NAMES[state.currentMonth - 1]}?`
        : `Copiar despesas fixas e entradas de ${MONTH_NAMES[state.currentMonth - 1]} para ${nextName}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Duplicar",
          onPress: () => {
            dispatch({
              type: "DUPLICATE_PREV_MONTH",
              payload: { targetMonth: nextMonth, targetYear: nextYear },
            });
            Alert.alert("✅ Mês duplicado!", `Dados copiados para ${nextName} ${nextYear}.`);
          },
        },
      ]
    );
  };

  const handleResetData = () => {
    Alert.alert(
      "Resetar dados",
      "Isso apagará TODOS os dados financeiros. Esta ação não pode ser desfeita. Tem certeza?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Resetar",
          style: "destructive",
          onPress: () => {
            Alert.alert("Confirmar", "Você tem certeza absoluta?", [
              { text: "Não", style: "cancel" },
              {
                text: "Sim, resetar",
                style: "destructive",
                onPress: async () => {
                  await SecureStorage.removeItem("@financeflow_data_v2");
                  await SecureStorage.removeItem("@financeflow_budgets_v1");
                  await SecureStorage.removeItem("@financeflow_theme_v1");
                  dispatch({ type: "RESET_STATE" });
                  Alert.alert("✅ Dados resetados", "Todos os dados foram apagados.");
                },
              },
            ]);
          },
        },
      ]
    );
  };


  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Configurações</Text>
        </View>

        {/* Profile Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>👤 Perfil</Text>

          <Text style={[styles.inputLabel, { color: colors.muted }]}>Seu nome</Text>
          <TextInput
            value={name}
            onChangeText={handleChange(setName)}
            placeholder="Como quer ser chamado?"
            placeholderTextColor={colors.muted}
            style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
          />

          <Text style={[styles.inputLabel, { color: colors.muted }]}>Pronomes</Text>
          <TextInput
            value={pronouns}
            onChangeText={handleChange(setPronouns)}
            placeholder="Masculinos / Femininos / Neutros"
            placeholderTextColor={colors.muted}
            style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
          />
        </View>

        {/* Goals Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>🎯 Metas</Text>

          <Text style={[styles.inputLabel, { color: colors.muted }]}>Nome da sua meta</Text>
          <TextInput
            value={goalName}
            onChangeText={handleChange(setGoalName)}
            placeholder="Ex: Viagem, Carro, Casa..."
            placeholderTextColor={colors.muted}
            style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
          />

          <Text style={[styles.inputLabel, { color: colors.muted }]}>Valor da meta (R$)</Text>
          <TextInput
            value={goalTarget}
            onChangeText={handleChange(setGoalTarget)}
            placeholder="0,00"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
          />

          <Text style={[styles.inputLabel, { color: colors.muted }]}>Meta da reserva de emergência (R$)</Text>
          <TextInput
            value={emergencyTarget}
            onChangeText={handleChange(setEmergencyTarget)}
            placeholder="0,00"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
          />
        </View>

        {/* Credit Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>💳 Crédito</Text>

          <Text style={[styles.inputLabel, { color: colors.muted }]}>Limite de crédito (R$)</Text>
          <TextInput
            value={creditLimit}
            onChangeText={handleChange(setCreditLimit)}
            placeholder="0,00"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
          />
        </View>

        {/* Save Button */}
        {isDirty && (
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={styles.saveBtnText}>Salvar Alterações</Text>
          </Pressable>
        )}

        {/* Appearance */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>🎨 Aparência</Text>
          <Text style={[styles.toggleSub, { color: colors.muted, marginBottom: 12 }]}>
            Escolha o tema do aplicativo
          </Text>
          {([
            { key: "dark", label: "🌙 Modo Escuro", desc: "Fundo preto neon — padrão" },
            { key: "light", label: "☀️ Modo Claro", desc: "Fundo branco, ideal para luz do dia" },
            { key: "system", label: "⚙️ Sistema", desc: "Segue a preferência do dispositivo" },
          ] as const).map(({ key, label, desc }) => {
            const active = themeScheme === key || (key === "system" && themeScheme !== "dark" && themeScheme !== "light");
            return (
              <Pressable
                key={key}
                onPress={() => {
                  const scheme = key === "system" ? (colorScheme === "dark" ? "dark" : "light") : key;
                  setColorScheme(scheme);
                  useAppStore.getState().setThemePreference(key);
                }}
                style={[
                  styles.themeOption,
                  {
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primary + "18" : "transparent",
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleLabel, { color: active ? colors.primary : colors.foreground }]}>{label}</Text>
                  <Text style={[styles.toggleSub, { color: colors.muted }]}>{desc}</Text>
                </View>
                {active && <Text style={{ color: colors.primary, fontWeight: "900", fontSize: 16 }}>✓</Text>}
              </Pressable>
            );
          })}
        </View>

        {/* Security */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>🔒 Segurança</Text>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Proteção Biométrica</Text>
              <Text style={[styles.toggleSub, { color: colors.muted }]}>
                {biometricAvailable ? "Face ID / Impressão digital ao abrir o app" : "Biometria não disponível neste dispositivo"}
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleToggleBiometric}
              disabled={!biometricAvailable}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Notificações</Text>
              <Text style={[styles.toggleSub, { color: colors.muted }]}>Lembretes diários de contas pendentes</Text>
            </View>
            <Switch
              value={notifEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Tools */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>🛠️ Ferramentas</Text>

          <Pressable
            onPress={handleDuplicateMonth}
            style={({ pressed }) => [
              styles.toolBtn,
              { borderColor: colors.primary, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={{ fontSize: 20 }}>📋</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toolBtnTitle, { color: colors.primary }]}>Duplicar Mês Atual</Text>
              <Text style={[styles.toolBtnSub, { color: colors.muted }]}>
                Copia despesas fixas e entradas para o próximo mês
              </Text>
            </View>
          </Pressable>

          <View style={{ height: 12 }} />

          <Pressable
            onPress={() => router.push("/export-report" as never)}
            style={({ pressed }) => [
              styles.toolBtn,
              { borderColor: "#16A34A", opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={{ fontSize: 20 }}>📤</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toolBtnTitle, { color: "#16A34A" }]}>Exportar Relatório PDF</Text>
              <Text style={[styles.toolBtnSub, { color: colors.muted }]}>
                Gera relatório completo do mês atual em PDF
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Summary Info */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>📊 Resumo Geral</Text>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>Meta pessoal</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>{settings.goalName}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>Valor da meta</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              {formatCurrency(settings.goalTarget ?? 0)}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>Reserva de emergência</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              {formatCurrency(settings.emergencyFundTarget)}
            </Text>
          </View>
        </View>
          {/* Color top strip */}
          <View style={{ height: 4, backgroundColor: isConnected ? "#1A73E8" : colors.border }} />
          <View style={{ padding: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: isConnected ? "#DBEAFE" : colors.border, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 24 }}>{isConnected ? "☁️" : "🔗"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground }}>
                  Backup no Google Drive
                </Text>
                {isConnected && googleUser ? (
                  <Text style={{ fontSize: 12, color: "#1A73E8", marginTop: 2, fontWeight: "600" }}>
                    ✓ {googleUser.email}
                  </Text>
                ) : (
                  <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                    Toque para conectar
                  </Text>
                )}
                {isConnected && lastSynced && (
                  <Text style={{ fontSize: 11, color: colors.muted, marginTop: 1 }}>
                    Última sync: {lastSynced.toLocaleString("pt-BR")}
                  </Text>
                )}
              </View>
              <Text style={{ color: colors.muted, fontSize: 18 }}>›</Text>
            </View>
          </View>
        </Pressable>

        {/* Danger Zone */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.error }]}>⚠️ Zona de Perigo</Text>
          <Pressable
            onPress={handleResetData}
            style={({ pressed }) => [
              styles.dangerBtn,
              { borderColor: colors.error, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.dangerBtnText, { color: colors.error }]}>🗑️ Resetar todos os dados</Text>
          </Pressable>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appInfoText, { color: colors.muted }]}>FinanceFlow v2.0</Text>
          <Text style={[styles.appInfoText, { color: colors.muted }]}>Seu gerenciador financeiro pessoal</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  themeOption: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, borderWidth: 1.5, marginBottom: 8 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: { fontSize: 28, fontWeight: "900", letterSpacing: -1, color: "#F2F2FF" },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: "500", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    gap: 12,
  },
  toggleLabel: { fontSize: 15, fontWeight: "600" },
  toggleSub: { fontSize: 12, marginTop: 2 },
  divider: { height: 0.5, marginVertical: 12 },
  toolBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  toolBtnTitle: { fontSize: 14, fontWeight: "700" },
  toolBtnSub: { fontSize: 12, marginTop: 2 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: "600" },
  saveBtn: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  dangerBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  dangerBtnText: { fontSize: 15, fontWeight: "600" },
  appInfo: { alignItems: "center", paddingVertical: 20, gap: 4 },
  appInfoText: { fontSize: 12 },
});

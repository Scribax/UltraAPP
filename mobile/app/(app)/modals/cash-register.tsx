import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Alert, TextInput, ScrollView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { cashAPI } from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import { Colors, Spacing, Radius, FontSize } from '../../../constants/theme';

export default function CashRegisterModal() {
  const { business } = useAuthStore();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<'status' | 'close'>('status');
  const [amountInput, setAmountInput] = useState('');
  const [notesInput, setNotesInput] = useState('');

  // ── Data Fetching ───────────────────────────────────────
  const { data: status, isLoading: loadingStatus } = useQuery({
    queryKey: ['cashStatus'],
    queryFn: () => cashAPI.getStatus().then(r => r.data),
  });

  const { data: report, isLoading: loadingReport } = useQuery({
    queryKey: ['cashReport'],
    queryFn: () => cashAPI.getShiftReport().then(r => r.data),
    enabled: status?.isOpen,
  });

  // ── Mutations ───────────────────────────────────────────
  const registerMutation = useMutation({
    mutationFn: (data: any) => cashAPI.register(data),
    onSuccess: () => {
      setAmountInput('');
      setNotesInput('');
      qc.invalidateQueries({ queryKey: ['cashStatus'] });
      qc.invalidateQueries({ queryKey: ['cashReport'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.error || err.message);
    }
  });

  // ── Handlers ────────────────────────────────────────────
  const handleOpen = () => {
    if (!amountInput) return Alert.alert('Atención', 'Ingresa el monto inicial.');
    registerMutation.mutate({ type: 'open', amount: parseFloat(amountInput), notes: notesInput });
  };

  const handleWithdraw = () => {
    if (!amountInput) return Alert.alert('Atención', 'Ingresa el monto a retirar.');
    registerMutation.mutate({ type: 'out', amount: parseFloat(amountInput), notes: notesInput });
  };

  const handleClose = async () => {
    if (!amountInput) return Alert.alert('Atención', 'Ingresa el efectivo real en caja.');
    
    Alert.alert(
      'Confirmar Cierre',
      `Estás a punto de cerrar la caja con $${amountInput} en efectivo físico.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Cerrar Caja', 
          style: 'destructive',
          onPress: async () => {
            // 1. Guardar el movimiento de cierre
            registerMutation.mutate({ type: 'close', amount: parseFloat(amountInput), notes: notesInput }, {
              onSuccess: async () => {
                // 2. Generar el PDF del reporte ANTES de que el componente se desmonte (usamos el data report de useQuery)
                if (report) {
                  await generatePDF(report, parseFloat(amountInput), status?.expectedCash || 0);
                }
                setActiveTab('status');
              }
            });
          }
        }
      ]
    );
  };

  // ── Generación de PDF ───────────────────────────────────
  const generatePDF = async (reportData: any, realCash: number, expectedCash: number) => {
    try {
      const diff = realCash - expectedCash;
      const diffColor = diff < 0 ? '#FF4D6A' : diff > 0 ? '#00D4AA' : '#5A5A8A';

      // HTML Template
      const htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #1A1A2E; }
              .header { text-align: center; border-bottom: 2px solid #6C63FF; padding-bottom: 15px; margin-bottom: 20px; }
              .title { font-size: 28px; font-weight: 800; color: #6C63FF; margin: 0; }
              .subtitle { font-size: 14px; color: #5A5A8A; margin-top: 5px; }
              .card { background: #f8f9fc; border-radius: 12px; padding: 15px; margin-bottom: 20px; border: 1px solid #e1e4f0; }
              .card-title { font-size: 14px; font-weight: 700; color: #1A1A2E; margin-top: 0; border-bottom: 1px solid #e1e4f0; padding-bottom: 8px; margin-bottom: 12px; }
              .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
              .total-row { display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 2px dashed #ccc; font-weight: 800; font-size: 16px; }
              .chart-bar { height: 12px; border-radius: 6px; background: #eee; margin-top: 5px; overflow: hidden; display: flex; }
              .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              .table th, .table td { text-align: left; padding: 8px; border-bottom: 1px solid #eee; font-size: 13px; }
              .footer { text-align: center; margin-top: 40px; font-size: 11px; color: #A0A0C0; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 class="title">REPORTE DE TURNO</h1>
              <div class="subtitle">${business?.name || 'Comercio'} - ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})}</div>
            </div>

            <div class="card">
              <h3 class="card-title">💵 Cuadre de Caja (Efectivo)</h3>
              <div class="row"><span>Esperado en caja:</span> <b>$${expectedCash.toFixed(2)}</b></div>
              <div class="row"><span>Declarado físicamente:</span> <b>$${realCash.toFixed(2)}</b></div>
              <div class="total-row"><span>Diferencia (Descuadre):</span> <span style="color: ${diffColor}">$${diff.toFixed(2)}</span></div>
            </div>

            <div class="card">
              <h3 class="card-title">📊 Ventas por Método de Pago</h3>
              ${reportData.sales.map((s: any) => `
                <div class="row">
                  <span style="text-transform: capitalize;">${s.payment_method} (${s.count} ventas)</span>
                  <b>$${parseFloat(s.total).toFixed(2)}</b>
                </div>
              `).join('')}
              ${reportData.sales.length === 0 ? '<div class="row">Sin ventas registradas.</div>' : ''}
            </div>

            <div class="card">
              <h3 class="card-title">🏆 Top 5 Productos Vendidos</h3>
              <table class="table">
                <tr><th>Producto</th><th>Cant.</th><th style="text-align:right">Recaudado</th></tr>
                ${reportData.topProducts.map((p: any) => `
                  <tr>
                    <td>${p.product_name}</td>
                    <td>${p.qty}</td>
                    <td style="text-align:right">$${parseFloat(p.revenue).toFixed(2)}</td>
                  </tr>
                `).join('')}
                ${reportData.topProducts.length === 0 ? '<tr><td colspan="3">No hay productos vendidos.</td></tr>' : ''}
              </table>
            </div>

            <div class="footer">
              Generado por <b>UltraAPP</b><br/>El sistema más rápido para tu negocio.
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Reporte de Turno' });
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo generar el PDF');
    }
  };

  // ── Render ──────────────────────────────────────────────
  if (loadingStatus || loadingReport) return <ActivityIndicator style={{ flex: 1, backgroundColor: Colors.bg }} />;

  const isOpen = status?.isOpen;

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      {/* Cabecera */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: Spacing.sm }}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Control de Caja</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        
        {/* Card de Estado */}
        <View style={s.statusCard}>
          <View style={s.statusRow}>
            <Text style={s.statusLabel}>Estado Actual:</Text>
            <View style={[s.badge, { backgroundColor: isOpen ? Colors.success + '22' : Colors.danger + '22' }]}>
              <Text style={[s.badgeText, { color: isOpen ? Colors.success : Colors.danger }]}>
                {isOpen ? 'ABIERTA' : 'CERRADA'}
              </Text>
            </View>
          </View>
          {isOpen && (
            <>
              <View style={s.divider} />
              <View style={s.statusRow}>
                <Text style={s.statusLabel}>Fondo Base:</Text>
                <Text style={s.statusValue}>${status.balance.toFixed(2)}</Text>
              </View>
              <View style={s.statusRow}>
                <Text style={s.statusLabel}>Ventas en Efectivo:</Text>
                <Text style={[s.statusValue, { color: Colors.success }]}>+ ${status.cashSales.toFixed(2)}</Text>
              </View>
              <View style={s.divider} />
              <View style={s.statusRow}>
                <Text style={s.statusLabelBold}>Efectivo Esperado:</Text>
                <Text style={s.statusValueBold}>${status.expectedCash.toFixed(2)}</Text>
              </View>
            </>
          )}
        </View>

        {/* Formularios de Acción */}
        {!isOpen ? (
          <View style={s.actionCard}>
            <Text style={s.sectionTitle}>Abrir Caja</Text>
            <Text style={s.helpText}>Ingresa el dinero con el que inicias el turno (cambio).</Text>
            <TextInput
              style={s.input}
              placeholder="0.00"
              keyboardType="numeric"
              placeholderTextColor={Colors.textMuted}
              value={amountInput}
              onChangeText={setAmountInput}
            />
            <TouchableOpacity style={s.primaryBtn} onPress={handleOpen} disabled={registerMutation.isPending}>
              {registerMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Abrir Caja</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.tabsContainer}>
            <View style={s.tabHeader}>
              <TouchableOpacity style={[s.tabBtn, activeTab === 'status' && s.tabBtnActive]} onPress={() => setActiveTab('status')}>
                <Text style={[s.tabText, activeTab === 'status' && s.tabTextActive]}>Retiro/Ingreso</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.tabBtn, activeTab === 'close' && s.tabBtnActive]} onPress={() => setActiveTab('close')}>
                <Text style={[s.tabText, activeTab === 'close' && s.tabTextActive]}>Cerrar Turno</Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'status' && (
              <View style={s.tabContent}>
                <Text style={s.helpText}>Usa esta sección para registrar si sacas plata de la caja (ej: pago a proveedor) o si ingresas más cambio.</Text>
                <TextInput
                  style={s.input}
                  placeholder="Monto ($)"
                  keyboardType="numeric"
                  placeholderTextColor={Colors.textMuted}
                  value={amountInput}
                  onChangeText={setAmountInput}
                />
                <TextInput
                  style={s.input}
                  placeholder="Motivo (opcional)"
                  placeholderTextColor={Colors.textMuted}
                  value={notesInput}
                  onChangeText={setNotesInput}
                />
                <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
                  <TouchableOpacity style={[s.primaryBtn, { flex: 1, backgroundColor: Colors.danger }]} onPress={handleWithdraw} disabled={registerMutation.isPending}>
                    <Text style={s.primaryBtnText}>Retirar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.primaryBtn, { flex: 1, backgroundColor: Colors.success }]} onPress={() => registerMutation.mutate({ type: 'in', amount: parseFloat(amountInput), notes: notesInput })} disabled={registerMutation.isPending}>
                    <Text style={s.primaryBtnText}>Ingresar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {activeTab === 'close' && (
              <View style={s.tabContent}>
                <Text style={s.helpText}>Cuenta la plata física en la caja e ingrésala abajo. El sistema calculará automáticamente si hay sobrantes o faltantes y generará un PDF.</Text>
                
                <View style={s.closeCard}>
                  <Text style={s.closeCardTitle}>Dinero Real en Caja</Text>
                  <View style={s.currencyInput}>
                    <Text style={s.currencySymbol}>$</Text>
                    <TextInput
                      style={s.largeInput}
                      placeholder="0.00"
                      keyboardType="numeric"
                      placeholderTextColor={Colors.textMuted}
                      value={amountInput}
                      onChangeText={setAmountInput}
                    />
                  </View>
                </View>

                <TouchableOpacity style={[s.primaryBtn, { marginTop: Spacing.xl }]} onPress={handleClose} disabled={registerMutation.isPending}>
                  {registerMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Cerrar Caja y Generar PDF</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle:  { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700' },
  content:      { padding: Spacing.lg },
  
  statusCard:   { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.borderLight },
  statusRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  statusLabel:  { color: Colors.textSub, fontSize: FontSize.md },
  statusValue:  { color: Colors.text, fontSize: FontSize.md, fontWeight: '600' },
  statusLabelBold:{ color: Colors.text, fontSize: FontSize.lg, fontWeight: '700' },
  statusValueBold:{ color: Colors.accent, fontSize: FontSize.xl, fontWeight: '800' },
  divider:      { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },
  
  badge:        { paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.full },
  badgeText:    { fontSize: FontSize.xs, fontWeight: '800' },
  
  actionCard:   { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.lg },
  sectionTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.xs },
  helpText:     { color: Colors.textMuted, fontSize: FontSize.sm, marginBottom: Spacing.lg, lineHeight: 20 },
  
  input:        { backgroundColor: Colors.bgInput, color: Colors.text, padding: Spacing.md, borderRadius: Radius.md, fontSize: FontSize.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  
  primaryBtn:   { backgroundColor: Colors.primary, padding: Spacing.md, borderRadius: Radius.md, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },

  tabsContainer:{ marginTop: Spacing.sm },
  tabHeader:    { flexDirection: 'row', backgroundColor: Colors.bgInput, borderRadius: Radius.md, pdding: 4, marginBottom: Spacing.lg },
  tabBtn:       { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.md },
  tabBtnActive: { backgroundColor: Colors.bgCard, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  tabText:      { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '600' },
  tabTextActive:{ color: Colors.primary, fontWeight: '800' },
  tabContent:   { },

  closeCard:    { backgroundColor: Colors.bgInput, borderRadius: Radius.md, padding: Spacing.lg, alignItems: 'center', borderWidth: 2, borderColor: Colors.primary },
  closeCardTitle: { color: Colors.textSub, fontSize: FontSize.sm, fontWeight: '600', marginBottom: Spacing.md },
  currencyInput:{ flexDirection: 'row', alignItems: 'center' },
  currencySymbol: { color: Colors.textMuted, fontSize: FontSize.xxl, fontWeight: '700', marginRight: Spacing.sm },
  largeInput:   { color: Colors.text, fontSize: FontSize.display, fontWeight: '800', minWidth: 150 },
});

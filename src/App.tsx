import React, { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Mail, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Sidebar } from "./components/Sidebar";
import { HomePage } from "./pages/HomePage";
import { DashboardPage } from "./pages/DashboardPage";
import { JobTrackerPage } from "./pages/JobTrackerPage";
import { JobSearchPage } from "./pages/JobSearchPage";
import { CVMakerPage } from "./pages/CVMakerPage";
import { SettingsPage } from "./pages/SettingsPage";
import { GlobalTaskProvider, useGlobalTask } from "./context/GlobalTaskContext";

export default function App() {
  return (
    <GlobalTaskProvider>
      <AppContent />
    </GlobalTaskProvider>
  );
}

export function AppContent() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  const {
    needsAuth,
    handleLogin,
    availableTables,
    pendingTabs,
    selectedTable,
    setSelectedTable,
    handleNewTab,
    savedTabs,
    activeSearchId,
    setActiveSearchId,
    createNewSearchTab: createNewTab,
    deleteSearchTab: deleteTab,
    renameSearchTab: renameTab,
    confirmModal,
    setConfirmModal,
    notification,
  } = useGlobalTask();

  if (needsAuth) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-white/5 p-8 rounded-2xl max-w-sm w-full text-center">
          <div className="h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-900/20">
            <Mail className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">SyncSheet</h2>
          <p className="text-slate-400 text-sm mb-8">Bewerbungstracker für Gmail</p>
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition cursor-pointer border-none"
          >
            Google Anmelden
          </button>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="h-screen bg-[#0B0F19] text-slate-100 flex font-sans overflow-hidden">
        <Sidebar
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          availableTables={availableTables}
          pendingTabs={pendingTabs}
          selectedTable={selectedTable}
          setSelectedTable={setSelectedTable}
          onRequestNewTab={handleNewTab}
          savedTabs={savedTabs}
          activeSearchId={activeSearchId}
          setActiveSearchId={setActiveSearchId}
          createNewTab={createNewTab}
          deleteTab={deleteTab}
          renameTab={renameTab}
        />

        <main className="flex-1 p-6 lg:p-10 space-y-8 overflow-y-auto h-full animate-fadeIn">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tracker" element={<JobTrackerPage />} />
            <Route path="/search" element={<JobSearchPage />} />
            <Route path="/cv-maker" element={<CVMakerPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>

        {/* Confirmation Modal */}
        <AnimatePresence>
          {confirmModal.isOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-slate-900 border border-white/5 rounded-xl max-w-md w-full overflow-hidden shadow-2xl p-6 text-left"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                      confirmModal.type === "danger"
                        ? "bg-rose-500/10 text-rose-400"
                        : confirmModal.type === "warning"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-blue-500/10 text-blue-400"
                    }`}
                  >
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="text-base font-bold text-slate-100 m-0">{confirmModal.title}</h3>
                    <p className="text-sm text-slate-300 m-0 leading-relaxed">{confirmModal.message}</p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-4 py-2 rounded-lg text-xs transition cursor-pointer border-none"
                  >
                    {confirmModal.cancelText}
                  </button>
                  <button
                    type="button"
                    onClick={confirmModal.onConfirm}
                    className={`font-semibold px-4 py-2 rounded-lg text-xs transition cursor-pointer text-white border-none ${
                      confirmModal.type === "danger"
                        ? "bg-rose-600 hover:bg-rose-700"
                        : confirmModal.type === "warning"
                        ? "bg-amber-600 hover:bg-amber-700"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {confirmModal.confirmText}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Floating Toast Notification */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className={`fixed bottom-6 right-6 z-[200] flex items-center gap-2 px-4.5 py-3 rounded-xl border text-xs font-semibold shadow-2xl backdrop-blur-md ${
                notification.type === "success"
                  ? "bg-emerald-950/80 text-emerald-400 border-emerald-900/50"
                  : "bg-rose-950/80 text-rose-400 border-rose-900/50"
              }`}
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{notification.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BrowserRouter>
  );
}

import React, { useEffect, useState, useCallback } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { User } from "firebase/auth";
import { Mail, RefreshCw, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { initAuth, googleSignIn } from "./services/googleAuth";
import { Sidebar } from "./components/Sidebar";
import { LandingPage } from "./pages/LandingPage";
import { JobTrackerPage } from "./pages/JobTrackerPage";
import { JobSearchPage } from "./pages/JobSearchPage";
import { ProfilePage } from "./pages/ProfilePage";
import { useSavedSearches } from "./hooks/useSavedSearches";


export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // "job_applications" is always present as the default table
  const [selectedTable, setSelectedTable] = useState<string>("job_applications");
  const [availableTables, setAvailableTables] = useState<string[]>(["job_applications"]);

  // Pending tabs: tabs that exist in the UI but haven't been saved to the DB yet.
  // Key = sanitized table name (e.g. "neue_liste_2"), label = user-facing display name
  const [pendingTabs, setPendingTabs] = useState<{ key: string; label: string }[]>([]);

  const [dailyGoal, setDailyGoal] = useState<number>(() => {
    const saved = localStorage.getItem("syncsheet_daily_goal");
    return saved ? parseInt(saved, 10) : 5;
  });

  useEffect(() => {
    localStorage.setItem("syncsheet_daily_goal", dailyGoal.toString());
  }, [dailyGoal]);



  const loadTables = async () => {
    try {
      const response = await fetch("/api/applications/tables");
      if (!response.ok) throw new Error("Failed to load tables");
      const tables: string[] = await response.json();
      // Always keep job_applications first; it can never be absent
      const withDefault = ["job_applications", ...tables.filter((t) => t !== "job_applications")];
      setAvailableTables(withDefault);
    } catch (err) {
      console.error("Error loading tables:", err);
      setAvailableTables((prev) => (prev.includes("job_applications") ? prev : ["job_applications", ...prev]));
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  // After loadTables, remove any pending tab whose key now appears in availableTables
  useEffect(() => {
    setPendingTabs((prev) => prev.filter((pt) => !availableTables.includes(pt.key)));
  }, [availableTables]);

  /** Creates a new pending tab (UI-only; no DB yet) */
  const handleNewTab = () => {
    const base = "neue_liste";
    const taken = [...availableTables, ...pendingTabs.map((p) => p.key)];
    let key = base;
    let label = "Neue Liste";
    let i = 2;
    while (taken.includes(key)) {
      key = `${base}_${i}`;
      label = `Neue Liste ${i}`;
      i++;
    }
    setPendingTabs((prev) => [...prev, { key, label }]);
    setSelectedTable(key);
  };

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    type: "danger" | "warning" | "info";
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Bestätigen",
    cancelText: "Abbrechen",
    type: "info",
    onConfirm: () => { },
  });

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    localStorage.setItem("darkMode", "true");
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const triggerToast = useCallback((type: "success" | "error", message: string) => {
    setNotification({ type, message });
  }, []);

  const {
    savedTabs,
    activeSearchId,
    setActiveSearchId,
    loadTabs,
    createNewTab,
    saveSearchToActiveTab,
    deleteTab,
    renameTab,
  } = useSavedSearches(triggerToast);

  // Initialize tabs from database
  useEffect(() => {
    loadTabs();
  }, []);

  const triggerConfirm = (options: {
    title: string;
    message: string;
    confirmText: string;
    cancelText?: string;
    type?: "danger" | "warning" | "info";
    onConfirm: () => void | Promise<void>;
  }) => {
    setConfirmModal({
      isOpen: true,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText,
      cancelText: options.cancelText || "Abbrechen",
      type: options.type || "info",
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        options.onConfirm();
      },
    });
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const authResult = await googleSignIn();
      if (authResult) {
        setToken(authResult.accessToken);
        setUser(authResult.user);
        triggerToast("success", "Erfolgreich mit Google verbunden.");
      }
    } catch (err: any) {
      console.error(err);
      triggerToast("error", err.message || "Authentifizierung fehlgeschlagen.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleSignInWrapper = async () => {
    try {
      const authResult = await googleSignIn();
      if (authResult) {
        setToken(authResult.accessToken);
        setUser(authResult.user);
        return authResult;
      }
    } catch (err: any) {
      console.error(err);
      triggerToast("error", err.message || "Authentifizierung fehlgeschlagen.");
    }
    return null;
  };

  if (needsAuth) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-white/5 p-8 rounded-2xl max-w-sm w-full text-center">
          <div className="h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-900/20">
            <Mail className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">SyncSheet</h2>
          <p className="text-slate-400 text-sm mb-8">Bewerbungstracker für Gmail</p>
          <button onClick={handleLogin} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition cursor-pointer">Google Anmelden</button>
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
          token={token}
          user={user}
          isLoggingIn={isLoggingIn}
          onLogin={handleLogin}
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

        <main className="flex-1 p-6 lg:p-10 space-y-8 overflow-y-auto h-full">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/tracker"
              element={
                <JobTrackerPage
                  user={user}
                  token={token}
                  googleSignIn={handleGoogleSignInWrapper}
                  triggerToast={triggerToast}
                  triggerConfirm={triggerConfirm}
                  selectedTable={selectedTable}
                  setSelectedTable={setSelectedTable}
                  availableTables={availableTables}
                  pendingTabs={pendingTabs}
                  setPendingTabs={setPendingTabs}
                  loadTables={loadTables}
                  onRequestNewTab={handleNewTab}
                  dailyGoal={dailyGoal}
                  setDailyGoal={setDailyGoal}
                />
              }
            />
            <Route
              path="/search"
              element={
                <JobSearchPage
                  availableTables={availableTables}
                  triggerToast={triggerToast}
                  triggerConfirm={triggerConfirm}
                  savedTabs={savedTabs}
                  activeSearchId={activeSearchId}
                  setActiveSearchId={setActiveSearchId}
                  createNewTab={createNewTab}
                  deleteTab={deleteTab}
                  renameTab={renameTab}
                  saveSearchToActiveTab={saveSearchToActiveTab}
                />
              }
            />
            <Route path="/profile" element={<ProfilePage />} />
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
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                    confirmModal.type === "danger"
                      ? "bg-rose-500/10 text-rose-400"
                      : confirmModal.type === "warning"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-blue-500/10 text-blue-400"
                  }`}>
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

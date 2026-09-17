import React, { useState, useEffect } from "react";
import {
  Bot,
  Plus,
  Trash2,
  Check,
  RefreshCw,
  Sparkles,
  Server,
  Key,
  Globe,
  Star,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Edit3,
  X,
} from "lucide-react";
import { useLLM, LLMProviderItem } from "../../context/LLMContext";
import { useGlobalTask } from "../../context/GlobalTaskContext";

export const LLMConfigSection: React.FC = () => {
  const {
    providers,
    activeProvider,
    isLoading,
    setDefaultProvider,
    saveProvider,
    updateProvider,
    deleteProvider,
    fetchOllamaModels,
    fetchGeminiModels,
    testConnection,
  } = useLLM();
  const { triggerToast } = useGlobalTask();

  // Model Presets
  const GEMINI_DEFAULT_MODELS = [
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Empfohlen - Schnell & Präzise)" },
    { id: "gemini-flash-latest", label: "Gemini Flash (Neueste Version)" },
    { id: "gemini-flash-lite-latest", label: "Gemini Flash Lite (Ultra-leicht & sparsam)" },
    { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
    { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro (Sehr detailreich)" },
    { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite" },
  ];

  const OPENAI_DEFAULT_MODELS = [
    { id: "gpt-4o-mini", label: "GPT-4o Mini (Empfohlen - Schnell & Günstig)" },
    { id: "gpt-4o", label: "GPT-4o (Volle Leistungsfähigkeit)" },
    { id: "o3-mini", label: "o3-mini (Reasoning & Logik)" },
    { id: "gpt-4-turbo", label: "GPT-4 Turbo" },
  ];

  const CUSTOM_DEFAULT_MODELS = [
    { id: "llama-3.3-70b-versatile", label: "Groq: Llama 3.3 70B Versatile" },
    { id: "deepseek-chat", label: "DeepSeek: DeepSeek V3 (Chat)" },
    { id: "mistral-small-latest", label: "Mistral: Mistral Small" },
    { id: "qwen-2.5-72b-instruct", label: "Qwen 2.5 72B Instruct" },
  ];

  // Form state
  const [providerType, setProviderType] = useState<"ollama" | "gemini" | "openai" | "custom">("ollama");
  const [name, setName] = useState("");
  const [modelName, setModelName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("http://localhost:11434");
  const [isDefault, setIsDefault] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isManualModelInput, setIsManualModelInput] = useState(false);

  // Ollama detection state
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [isDetectingOllama, setIsDetectingOllama] = useState(false);
  const [ollamaError, setOllamaError] = useState<string | null>(null);

  // Gemini detection state
  const [geminiOnlineModels, setGeminiOnlineModels] = useState<string[]>([]);
  const [isDetectingGemini, setIsDetectingGemini] = useState(false);

  // Test state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Edit card state
  const [editingCardId, setEditingCardId] = useState<number | null>(null);
  const [editModelName, setEditModelName] = useState<string>("");
  const [isManualEditModel, setIsManualEditModel] = useState<boolean>(false);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Check if we already have a saved API key for the current form provider type
  const existingProviderWithKey = providers.find(
    (p) => p.provider_type === providerType && p.masked_api_key
  );

  const getAvailableModelsForProvider = (p: LLMProviderItem) => {
    if (p.provider_type === "gemini") {
      const extra = geminiOnlineModels
        .filter((om) => !GEMINI_DEFAULT_MODELS.some((dm) => dm.id === om))
        .map((m) => ({ id: m, label: m }));
      return [...GEMINI_DEFAULT_MODELS, ...extra];
    }
    if (p.provider_type === "ollama") {
      if (ollamaModels.length > 0) {
        return ollamaModels.map((m) => ({ id: m, label: m }));
      }
      return [{ id: p.model_name, label: p.model_name }];
    }
    if (p.provider_type === "openai") {
      return OPENAI_DEFAULT_MODELS;
    }
    return CUSTOM_DEFAULT_MODELS;
  };

  const handleStartEdit = (p: LLMProviderItem) => {
    setEditingCardId(p.id);
    setEditModelName(p.model_name);
    const available = getAvailableModelsForProvider(p);
    setIsManualEditModel(!available.some((m) => m.id === p.model_name));
    if (p.provider_type === "ollama" && ollamaModels.length === 0) {
      handleDetectOllama(p.base_url || undefined);
    }
  };

  const handleCancelEdit = () => {
    setEditingCardId(null);
    setEditModelName("");
    setIsManualEditModel(false);
  };

  const handleSaveEdit = async (p: LLMProviderItem) => {
    if (!editModelName.trim()) {
      triggerToast("error", "Bitte geben Sie einen Modellnamen an.");
      return;
    }
    setIsSavingEdit(true);
    try {
      let updatedName = p.name;
      if (p.name.includes("(")) {
        updatedName = `${p.name.split("(")[0].trim()} (${editModelName.trim()})`;
      }
      await updateProvider(p.id, {
        model_name: editModelName.trim(),
        name: updatedName,
      });
      triggerToast("success", `Modell für "${updatedName}" erfolgreich aktualisiert.`);
      setEditingCardId(null);
    } catch (err: any) {
      triggerToast("error", err.message || "Fehler beim Aktualisieren des Modells");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Auto-detect Ollama models when Ollama is selected
  const handleDetectOllama = async (urlToUse?: string) => {
    setIsDetectingOllama(true);
    setOllamaError(null);
    try {
      const models = await fetchOllamaModels(urlToUse || baseUrl || "http://localhost:11434");
      setOllamaModels(models);
      if (models.length > 0) {
        if (!modelName || !models.includes(modelName)) {
          setModelName(models[0]);
        }
        if (!name || name.startsWith("Ollama")) {
          setName(`Ollama (${models[0]})`);
        }
        triggerToast("success", `${models.length} Ollama-Modell(e) gefunden!`);
      } else {
        setOllamaError("Ollama läuft, aber es wurden keine installierten Modelle gefunden ('ollama pull llama3.2').");
      }
    } catch (err: any) {
      setOllamaError(err.message || "Ollama konnte nicht erreicht werden.");
      setOllamaModels([]);
    } finally {
      setIsDetectingOllama(false);
    }
  };

  const [isUnloadingOllama, setIsUnloadingOllama] = useState(false);
  const handleUnloadOllama = async () => {
    setIsUnloadingOllama(true);
    try {
      const res = await fetch("/api/llm/ollama/unload", { method: "POST" });
      if (res.ok) {
        triggerToast("success", "Ollama-Modelle erfolgreich aus dem Arbeitsspeicher (RAM) entladen!");
      }
    } catch {
      triggerToast("error", "Konnte Ollama nicht erreichen.");
    } finally {
      setIsUnloadingOllama(false);
    }
  };

  // Fetch online Gemini models using API key
  const handleDetectGemini = async (keyToUse?: string) => {
    const key = keyToUse || apiKey;
    setIsDetectingGemini(true);
    try {
      const models = await fetchGeminiModels(key || undefined);
      if (models.length > 0) {
        setGeminiOnlineModels(models);
        if (!modelName || !models.includes(modelName)) {
          setModelName(models[0]);
        }
        triggerToast("success", `${models.length} Gemini-Modelle online abgerufen!`);
      }
    } catch (err: any) {
      triggerToast("error", err.message || "Gemini-Modelle konnten nicht abgerufen werden.");
    } finally {
      setIsDetectingGemini(false);
    }
  };

  useEffect(() => {
    if (providerType === "ollama") {
      handleDetectOllama(baseUrl);
    }
  }, [providerType]);

  // Handle provider type change defaults
  const handleTypeChange = (type: "ollama" | "gemini" | "openai" | "custom") => {
    setProviderType(type);
    setTestResult(null);
    setIsManualModelInput(false);
    if (type === "ollama") {
      setBaseUrl("http://localhost:11434");
      setModelName(ollamaModels[0] || "qwen2.5:7b");
      setName(ollamaModels[0] ? `Ollama (${ollamaModels[0]})` : "Ollama Lokal");
    } else if (type === "gemini") {
      setBaseUrl("");
      setModelName("gemini-2.5-flash");
      setName("Google Gemini 2.5 Flash");
    } else if (type === "openai") {
      setBaseUrl("https://api.openai.com/v1");
      setModelName("gpt-4o-mini");
      setName("OpenAI GPT-4o Mini");
    } else {
      setBaseUrl("");
      setModelName(CUSTOM_DEFAULT_MODELS[0].id);
      setName("Benutzerdefiniertes Modell");
    }
  };

  const handleTest = async () => {
    if (!modelName.trim()) {
      triggerToast("error", "Bitte geben Sie einen Modellnamen an.");
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testConnection({
        provider_type: providerType,
        model_name: modelName.trim(),
        api_key: apiKey.trim() || undefined,
        base_url: baseUrl.trim() || undefined,
      });
      setTestResult(res);
      triggerToast("success", "Verbindung erfolgreich getestet!");
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || "Test fehlgeschlagen" });
      triggerToast("error", err.message || "Verbindung fehlgeschlagen");
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !modelName.trim()) {
      triggerToast("error", "Name und Modellname sind erforderlich.");
      return;
    }

    if ((providerType === "gemini" || providerType === "openai") && !apiKey.trim() && !existingProviderWithKey) {
      triggerToast("error", "Für Cloud-APIs wird ein API-Key benötigt.");
      return;
    }

    setIsSaving(true);
    try {
      await saveProvider({
        name: name.trim(),
        provider_type: providerType,
        model_name: modelName.trim(),
        api_key: apiKey.trim() || undefined,
        base_url: baseUrl.trim() || undefined,
        is_default: isDefault,
      });
      triggerToast("success", `Modell "${name}" erfolgreich gespeichert.`);
      // Reset sensitive fields
      setApiKey("");
      setTestResult(null);
      if (providerType === "custom") {
        setName("");
        setModelName("");
      }
    } catch (err: any) {
      triggerToast("error", err.message || "Fehler beim Speichern");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (p: LLMProviderItem) => {
    if (window.confirm(`Möchten Sie das Modell "${p.name}" wirklich entfernen?`)) {
      try {
        await deleteProvider(p.id);
        triggerToast("success", "Modell entfernt.");
      } catch (err: any) {
        triggerToast("error", err.message || "Fehler beim Löschen");
      }
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Configured Models List */}
      <section className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-sm shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 bg-blue-500/10 border border-blue-500/15 rounded-lg flex items-center justify-center text-blue-400">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Konfigurierte KI-Modelle</h3>
              <p className="text-slate-400 text-[10px]">
                Verwalten Sie Ihre lokalen (z. B. Ollama) und Cloud-Sprachmodelle.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-slate-400">
            {providers.length} Modell{providers.length !== 1 ? "e" : ""} aktiv
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-slate-400 text-xs gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
            <span>Lade konfigurierte Modelle...</span>
          </div>
        ) : providers.length === 0 ? (
          <div className="bg-slate-950/30 border border-dashed border-white/10 rounded-xl p-6 text-center space-y-2">
            <AlertCircle className="h-6 w-6 text-amber-400 mx-auto" />
            <p className="text-xs font-semibold text-slate-300">Noch kein KI-Modell konfiguriert</p>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              Fügen Sie unten Ihr lokales Ollama oder einen Cloud-API-Key (Gemini, OpenAI, etc.) hinzu, um E-Mails automatisch analysieren zu können.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {providers.map((p) => {
              const isCurrentDefault = p.is_default;
              return (
                <div
                  key={p.id}
                  className={`bg-slate-950/40 border rounded-xl p-4 flex flex-col justify-between transition ${
                    isCurrentDefault
                      ? "border-blue-500/30 ring-1 ring-blue-500/20 shadow-lg shadow-blue-500/5"
                      : "border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <span className="text-base shrink-0 mt-0.5">
                          {p.provider_type === "ollama" ? "🦙" : p.provider_type === "gemini" ? "✨" : "🤖"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5 flex-wrap">
                            <span className="truncate">{p.name}</span>
                            {isCurrentDefault && (
                              <span className="text-[9px] font-extrabold bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.2 rounded-full">
                                Standard
                              </span>
                            )}
                          </div>

                          {editingCardId !== p.id ? (
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-[11px] text-slate-300 font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5 truncate max-w-[170px]">
                                {p.model_name}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleStartEdit(p)}
                                className="text-[10px] font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer border-none bg-transparent p-0"
                                title="Anderes Modell wählen ohne API-Key erneut einzugeben"
                              >
                                <Edit3 className="h-3 w-3" />
                                <span>Modell wechseln</span>
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(p)}
                        title="Modell entfernen"
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition cursor-pointer border-none shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Inline Model Switcher */}
                    {editingCardId === p.id && (
                      <div className="bg-slate-900/90 border border-blue-500/30 rounded-xl p-3 space-y-2.5 mt-2 animate-fadeIn">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-blue-300 flex items-center gap-1.5">
                            <Edit3 className="h-3.5 w-3.5" />
                            Modell wechseln
                          </span>
                          <span className="text-[10px] text-slate-400">Kein API-Key nötig</span>
                        </div>

                        {!isManualEditModel ? (
                          <div className="space-y-1">
                            <select
                              value={getAvailableModelsForProvider(p).some((m) => m.id === editModelName) ? editModelName : "__custom__"}
                              onChange={(e) => {
                                if (e.target.value === "__custom__") {
                                  setIsManualEditModel(true);
                                } else {
                                  setEditModelName(e.target.value);
                                }
                              }}
                              className="w-full bg-slate-950 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono cursor-pointer"
                            >
                              <optgroup label="Verfügbare Modelle">
                                {getAvailableModelsForProvider(p).map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.label}
                                  </option>
                                ))}
                              </optgroup>
                              <option value="__custom__">✏️ Anderes Modell manuell eingeben...</option>
                            </select>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-slate-400">Modellbezeichnung:</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsManualEditModel(false);
                                  const first = getAvailableModelsForProvider(p)[0];
                                  if (first) setEditModelName(first.id);
                                }}
                                className="text-[10px] text-blue-400 hover:text-blue-300 cursor-pointer bg-transparent border-none p-0"
                              >
                                Zurück zur Liste
                              </button>
                            </div>
                            <input
                              type="text"
                              value={editModelName}
                              onChange={(e) => setEditModelName(e.target.value)}
                              placeholder="z. B. gemini-2.5-flash"
                              className="w-full bg-slate-950 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                              autoFocus
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(p)}
                            disabled={isSavingEdit}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-lg text-[11px] transition flex items-center justify-center gap-1 cursor-pointer border-none shadow-sm"
                          >
                            {isSavingEdit ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            <span>Speichern</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={isSavingEdit}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-1.5 px-3 rounded-lg text-[11px] transition cursor-pointer border-none"
                          >
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="text-[10px] text-slate-400 space-y-0.5 pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Typ:</span>
                        <span className="capitalize">{p.provider_type}</span>
                      </div>
                      {p.base_url && (
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">URL:</span>
                          <span className="font-mono text-slate-400 truncate">{p.base_url}</span>
                        </div>
                      )}
                      {p.masked_api_key && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Key:</span>
                          <span className="font-mono text-slate-400">{p.masked_api_key}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between">
                    {!isCurrentDefault ? (
                      <button
                        onClick={() => setDefaultProvider(p.id)}
                        className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer border-none bg-transparent p-0"
                      >
                        <Star className="h-3 w-3" />
                        <span>Als Standard setzen</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Aktives Modell
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Add New Model Form */}
      <section className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-sm shadow-xl space-y-5">
        <div className="border-b border-white/5 pb-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Plus className="h-4 w-4 text-blue-400" />
            Neues KI-Modell hinzufügen
          </h3>
          <p className="text-slate-400 text-[10px] mt-0.5">
            Wählen Sie zwischen lokalem Ollama oder Cloud-APIs (Gemini, OpenAI, Groq, etc.).
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Provider Selection */}
          <div className="space-y-1.5">
            <label className="block text-slate-300 font-semibold text-[11px]">Anbieter-Typ</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { type: "ollama", label: "Ollama (Lokal)", icon: "🦙" },
                { type: "gemini", label: "Google Gemini", icon: "✨" },
                { type: "openai", label: "OpenAI", icon: "🤖" },
                { type: "custom", label: "OpenAI-kompatibel", icon: "🌐" },
              ].map((item) => (
                <button
                  type="button"
                  key={item.type}
                  onClick={() => handleTypeChange(item.type as any)}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                    providerType === item.type
                      ? "bg-blue-600/15 border-blue-500 text-blue-300 shadow-sm"
                      : "bg-slate-950/40 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Friendly Display Name */}
          <div className="space-y-1.5">
            <label className="block text-slate-300 font-semibold text-[11px]">Anzeigename</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. Mein Llama 3.2 oder Gemini 2.0"
              required
              className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Ollama-specific configuration */}
          {providerType === "ollama" && (
            <div className="space-y-3 bg-slate-950/40 border border-white/5 rounded-xl p-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold text-[11px] flex items-center gap-1.5">
                    <Server className="h-3.5 w-3.5 text-blue-400" />
                    Ollama Server-URL
                  </label>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleUnloadOllama}
                      disabled={isUnloadingOllama}
                      className="text-slate-400 hover:text-rose-400 font-semibold text-[10px] flex items-center gap-1 bg-transparent border-none cursor-pointer transition"
                      title="Gibt belegten Arbeitsspeicher (RAM) sofort frei"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>{isUnloadingOllama ? "Entlade..." : "RAM freigeben"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDetectOllama(baseUrl)}
                      disabled={isDetectingOllama}
                      className="text-blue-400 hover:text-blue-300 font-semibold text-[10px] flex items-center gap-1 bg-transparent border-none cursor-pointer"
                    >
                      <RefreshCw className={`h-3 w-3 ${isDetectingOllama ? "animate-spin" : ""}`} />
                      <span>Modelle erkennen</span>
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => {
                    setBaseUrl(e.target.value);
                  }}
                  placeholder="http://localhost:11434"
                  required
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Detected Models dropdown */}
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold text-[11px]">Installiertes Modell</label>
                {ollamaModels.length > 0 && !isManualModelInput ? (
                  <select
                    value={ollamaModels.includes(modelName) ? modelName : "__custom__"}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "__custom__") {
                        setIsManualModelInput(true);
                      } else {
                        setModelName(val);
                        if (!name || name.startsWith("Ollama")) {
                          setName(`Ollama (${val})`);
                        }
                      }
                    }}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono cursor-pointer"
                  >
                    <optgroup label="Erkannte lokale Modelle">
                      {ollamaModels.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </optgroup>
                    <option value="__custom__">✏️ Anderes Modell manuell eingeben...</option>
                  </select>
                ) : (
                  <div className="space-y-2">
                    {ollamaModels.length > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">Modellbezeichnung eingeben:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsManualModelInput(false);
                            setModelName(ollamaModels[0] || "");
                          }}
                          className="text-[10px] text-blue-400 hover:text-blue-300 cursor-pointer bg-transparent border-none"
                        >
                          Zurück zur Liste erkannter Modelle
                        </button>
                      </div>
                    )}
                    <input
                      type="text"
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      placeholder="z. B. llama3.2, mistral, deepseek-r1"
                      required
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                    />
                    {ollamaError && (
                      <div className="p-2.5 bg-amber-500/10 border border-amber-500/15 rounded-lg text-amber-400 text-[10px] flex items-start gap-2">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <div>{ollamaError}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cloud & Custom Configuration */}
          {providerType !== "ollama" && (
            <div className="space-y-3 bg-slate-950/40 border border-white/5 rounded-xl p-4">
              {/* Reuse key notice */}
              {existingProviderWithKey && (
                <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-300 text-[11px] flex items-center gap-2">
                  <Key className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <div>
                    Gespeicherter API-Schlüssel (<span className="font-mono text-white">{existingProviderWithKey.masked_api_key}</span>) wird automatisch übernommen. Sie müssen ihn nicht erneut eingeben.
                  </div>
                </div>
              )}

              {/* API Key */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold text-[11px] flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5 text-blue-400" />
                    API-Schlüssel
                  </label>
                  {existingProviderWithKey && (
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Schlüssel vorhanden
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={
                      existingProviderWithKey
                        ? `Gespeicherten Schlüssel (${existingProviderWithKey.masked_api_key}) verwenden oder neuen eingeben`
                        : providerType === "gemini"
                        ? "AIzaSy..."
                        : "sk-..."
                    }
                    required={!existingProviderWithKey && providerType !== "custom"}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl pl-3.5 pr-10 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 bg-transparent border-none cursor-pointer"
                  >
                    {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Model Selection Dropdown */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-300 font-semibold text-[11px]">Modell auswählen</label>
                  {providerType === "gemini" && (
                    <button
                      type="button"
                      onClick={() => handleDetectGemini(apiKey)}
                      disabled={isDetectingGemini}
                      className="text-blue-400 hover:text-blue-300 font-semibold text-[10px] flex items-center gap-1 bg-transparent border-none cursor-pointer"
                    >
                      <RefreshCw className={`h-3 w-3 ${isDetectingGemini ? "animate-spin" : ""}`} />
                      <span>Modelle online abrufen</span>
                    </button>
                  )}
                </div>

                {!isManualModelInput ? (
                  <select
                    value={
                      providerType === "gemini"
                        ? (geminiOnlineModels.includes(modelName) || GEMINI_DEFAULT_MODELS.some(m => m.id === modelName) ? modelName : "__custom__")
                        : providerType === "openai"
                        ? (OPENAI_DEFAULT_MODELS.some(m => m.id === modelName) ? modelName : "__custom__")
                        : (CUSTOM_DEFAULT_MODELS.some(m => m.id === modelName) ? modelName : "__custom__")
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "__custom__") {
                        setIsManualModelInput(true);
                      } else {
                        setModelName(val);
                        if (!name || name.includes("Gemini") || name.includes("OpenAI")) {
                          if (providerType === "gemini") {
                            setName(`Google Gemini (${val})`);
                          } else if (providerType === "openai") {
                            setName(`OpenAI (${val})`);
                          }
                        }
                      }
                    }}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono cursor-pointer"
                  >
                    {providerType === "gemini" && (
                      <>
                        <optgroup label="Empfohlene Gemini-Modelle">
                          {GEMINI_DEFAULT_MODELS.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.label}
                            </option>
                          ))}
                        </optgroup>
                        {geminiOnlineModels.filter((om) => !GEMINI_DEFAULT_MODELS.some((dm) => dm.id === om)).length > 0 && (
                          <optgroup label="Weitere verfügbare Online-Modelle">
                            {geminiOnlineModels
                              .filter((om) => !GEMINI_DEFAULT_MODELS.some((dm) => dm.id === om))
                              .map((m) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                          </optgroup>
                        )}
                        <option value="__custom__">✏️ Anderes Modell manuell eingeben...</option>
                      </>
                    )}

                    {providerType === "openai" && (
                      <>
                        <optgroup label="Verfügbare OpenAI-Modelle">
                          {OPENAI_DEFAULT_MODELS.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.label}
                            </option>
                          ))}
                        </optgroup>
                        <option value="__custom__">✏️ Anderes Modell manuell eingeben...</option>
                      </>
                    )}

                    {providerType === "custom" && (
                      <>
                        <optgroup label="Beliebte Modelle (Presets)">
                          {CUSTOM_DEFAULT_MODELS.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.label}
                            </option>
                          ))}
                        </optgroup>
                        <option value="__custom__">✏️ Eigenes Modell manuell eingeben...</option>
                      </>
                    )}
                  </select>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Modellbezeichnung eingeben:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsManualModelInput(false);
                          if (providerType === "gemini") {
                            setModelName("gemini-2.5-flash");
                          } else if (providerType === "openai") {
                            setModelName("gpt-4o-mini");
                          } else {
                            setModelName(CUSTOM_DEFAULT_MODELS[0].id);
                          }
                        }}
                        className="text-[10px] text-blue-400 hover:text-blue-300 cursor-pointer bg-transparent border-none"
                      >
                        Zurück zur Auswahlliste
                      </button>
                    </div>
                    <input
                      type="text"
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      placeholder={
                        providerType === "gemini"
                          ? "z. B. gemini-2.5-flash"
                          : providerType === "openai"
                          ? "z. B. gpt-4o-mini"
                          : "z. B. deepseek-chat"
                      }
                      required
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Custom Base URL */}
              {providerType === "custom" && (
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold text-[11px] flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-blue-400" />
                    Basis-URL (OpenAI-kompatibler Endpunkt)
                  </label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.groq.com/openai/v1 oder http://localhost:1234/v1"
                    required
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              )}
            </div>
          )}

          {/* Set as Default Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_default_check"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0 cursor-pointer"
            />
            <label htmlFor="is_default_check" className="text-[11px] font-semibold text-slate-300 cursor-pointer">
              Als Standard-Modell für Analysen aktivieren
            </label>
          </div>

          {/* Test connection result notice */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 text-[11px] ${
                testResult.success
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-300"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting}
              className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer border-none"
            >
              {isTesting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-blue-400" />}
              <span>Verbindung testen</span>
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer border-none shadow-sm shadow-blue-900/20"
            >
              {isSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              <span>Modell speichern</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

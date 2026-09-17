import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface LLMProviderItem {
  id: number;
  name: string;
  provider_type: "ollama" | "gemini" | "openai" | "custom";
  model_name: string;
  masked_api_key?: string | null;
  base_url?: string | null;
  is_default: boolean;
}

export interface NewLLMProviderPayload {
  name: string;
  provider_type: string;
  model_name: string;
  api_key?: string;
  base_url?: string;
  is_default?: boolean;
}

interface LLMContextType {
  providers: LLMProviderItem[];
  activeProvider: LLMProviderItem | null;
  isLoading: boolean;
  fetchProviders: () => Promise<void>;
  setActiveProvider: (provider: LLMProviderItem) => void;
  setDefaultProvider: (id: number) => Promise<void>;
  saveProvider: (payload: NewLLMProviderPayload) => Promise<LLMProviderItem>;
  updateProvider: (id: number, payload: { name?: string; model_name?: string; is_default?: boolean }) => Promise<LLMProviderItem>;
  deleteProvider: (id: number) => Promise<void>;
  fetchOllamaModels: (baseUrl?: string) => Promise<string[]>;
  fetchGeminiModels: (apiKey?: string) => Promise<string[]>;
  testConnection: (payload: {
    provider_type: string;
    model_name: string;
    api_key?: string;
    base_url?: string;
  }) => Promise<{ success: boolean; message: string }>;
}

const LLMContext = createContext<LLMContextType | undefined>(undefined);

export const LLMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [providers, setProviders] = useState<LLMProviderItem[]>([]);
  const [activeProvider, setActiveProviderState] = useState<LLMProviderItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProviders = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/llm/providers");
      if (!res.ok) throw new Error("Fehler beim Laden der LLM-Provider");
      const data: LLMProviderItem[] = await res.json();
      setProviders(data);

      // Restore active provider from local selection or pick the default
      const savedActiveId = localStorage.getItem("syncsheet_active_llm_id");
      const matchedSaved = data.find((p) => String(p.id) === savedActiveId);
      const defaultProvider = data.find((p) => p.is_default);

      if (matchedSaved) {
        setActiveProviderState(matchedSaved);
      } else if (defaultProvider) {
        setActiveProviderState(defaultProvider);
      } else if (data.length > 0) {
        setActiveProviderState(data[0]);
      } else {
        setActiveProviderState(null);
      }
    } catch (err) {
      console.error("LLMProvider fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const setActiveProvider = (provider: LLMProviderItem) => {
    setActiveProviderState(provider);
    localStorage.setItem("syncsheet_active_llm_id", String(provider.id));
  };

  const setDefaultProvider = async (id: number) => {
    const res = await fetch(`/api/llm/providers/${id}/set-default`, { method: "POST" });
    if (!res.ok) throw new Error("Fehler beim Setzen des Standard-Modells");
    await fetchProviders();
  };

  const saveProvider = async (payload: NewLLMProviderPayload): Promise<LLMProviderItem> => {
    const res = await fetch("/api/llm/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Fehler beim Speichern des Modells");
    }
    const created: LLMProviderItem = await res.json();
    await fetchProviders();
    return created;
  };

  const deleteProvider = async (id: number) => {
    const res = await fetch(`/api/llm/providers/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Fehler beim Löschen des Modells");
    await fetchProviders();
  };

  const updateProvider = async (
    id: number,
    payload: { name?: string; model_name?: string; is_default?: boolean }
  ): Promise<LLMProviderItem> => {
    const res = await fetch(`/api/llm/providers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Fehler beim Aktualisieren des Modells");
    }
    const updated: LLMProviderItem = await res.json();
    await fetchProviders();
    return updated;
  };

  const fetchOllamaModels = async (baseUrl: string = "http://localhost:11434"): Promise<string[]> => {
    const res = await fetch(`/api/llm/ollama/models?base_url=${encodeURIComponent(baseUrl)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Ollama unter ${baseUrl} nicht erreichbar.`);
    }
    const data = await res.json();
    return data.models || [];
  };

  const fetchGeminiModels = async (apiKey?: string): Promise<string[]> => {
    const query = apiKey ? `?api_key=${encodeURIComponent(apiKey)}` : "";
    const res = await fetch(`/api/llm/gemini/models${query}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Gemini-Modelle konnten nicht abgerufen werden.");
    }
    const data = await res.json();
    return data.models || [];
  };

  const testConnection = async (payload: {
    provider_type: string;
    model_name: string;
    api_key?: string;
    base_url?: string;
  }): Promise<{ success: boolean; message: string }> => {
    const res = await fetch("/api/llm/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || "Verbindungstest fehlgeschlagen");
    }
    return { success: true, message: data.message || "Verbindung erfolgreich!" };
  };

  return (
    <LLMContext.Provider
      value={{
        providers,
        activeProvider,
        isLoading,
        fetchProviders,
        setActiveProvider,
        setDefaultProvider,
        saveProvider,
        updateProvider,
        deleteProvider,
        fetchOllamaModels,
        fetchGeminiModels,
        testConnection,
      }}
    >
      {children}
    </LLMContext.Provider>
  );
};

export const useLLM = () => {
  const context = useContext(LLMContext);
  if (!context) {
    throw new Error("useLLM must be used within an LLMProvider");
  }
  return context;
};

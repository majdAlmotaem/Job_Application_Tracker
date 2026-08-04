import { useState, useMemo, useEffect } from 'react';
import { parseGermanDate } from '../utils/dateFormatter';
import { JobApplication } from '../types';

interface UseJobTableLogicProps {
  applications: JobApplication[];
  draftChanges: Record<string, Partial<JobApplication>>;
  updateDraftField: (id: string, field: keyof JobApplication, value: any) => void;
  triggerToast: (type: "success" | "error" | "info" | "warning", message: string) => void;
}

export function useJobTableLogic({
  applications,
  draftChanges,
  updateDraftField,
  triggerToast,
}: UseJobTableLogicProps) {
  // 1. Controls states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStage, setFilterStage] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [sortType, setSortType] = useState<string>("date_desc");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // 2. Double click cell editing states
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  // 3. Resizing states
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    select: 48,
    id: 56,
    company: 180,
    role: 180,
    stage: 130,
    status: 130,
    date: 130,
    location: 160,
    anstellungsart: 150,
  });

  const startResize = (e: React.MouseEvent, column: string) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = columnWidths[column] || 150;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      setColumnWidths((prev) => ({
        ...prev,
        [column]: Math.max(60, startWidth + deltaX),
      }));
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const startEditing = (id: string, field: string, initialValue?: string) => {
    setEditingCell({ id, field });
    setEditingValue(initialValue ?? "");
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditingValue("");
  };

  const saveEditing = (id: string, field: string) => {
    updateDraftField(id, field as keyof JobApplication, editingValue);
    setEditingCell(null);
    setEditingValue("");
    triggerToast("success", "Änderung im Entwurf gespeichert.");
  };



  const filteredAndSortedApplications = useMemo(() => {
    const applicationsWithDrafts = applications.map((app) => {
      const drafts = draftChanges[app.id];
      if (drafts) {
        return { ...app, ...drafts };
      }
      return app;
    });

    return [...applicationsWithDrafts]
      .filter((app) => {
        const matchesSearch = 
          app.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (app.role && app.role.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (app.location && app.location.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStage = filterStage === "All" ? true : app.stage === filterStage;
        const matchesStatus = filterStatus === "All" ? true : app.status === filterStatus;
        return matchesSearch && matchesStage && matchesStatus;
      })
      .sort((a, b) => {
        if (sortType === "date_desc") return parseGermanDate(b.date) - parseGermanDate(a.date);
        if (sortType === "date_asc") return parseGermanDate(a.date) - parseGermanDate(b.date);
        if (sortType === "company_asc") return a.company.localeCompare(b.company);
        if (sortType === "company_desc") return b.company.localeCompare(a.company);
        if (sortType === "stage_asc") return a.stage.localeCompare(b.stage);
        if (sortType === "status_asc") return a.status.localeCompare(b.status);
        return 0;
      });
  }, [applications, draftChanges, searchTerm, filterStage, filterStatus, sortType]);

  // Reset to page 1 when filters, search, or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStage, filterStatus, sortType]);

  const totalFilteredCount = filteredAndSortedApplications.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize));

  // Clamp currentPage if it exceeds totalPages (e.g., after deletion)
  const safePage = Math.min(currentPage, totalPages);

  const paginatedApplications = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize;
    return filteredAndSortedApplications.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedApplications, safePage, pageSize]);

  return {
    searchTerm, setSearchTerm,
    filterStage, setFilterStage,
    filterStatus, setFilterStatus,
    sortType, setSortType,
    editingCell, editingValue, setEditingValue,
    startEditing, cancelEditing, saveEditing,
    columnWidths, startResize,
    filteredAndSortedApplications,
    paginatedApplications,
    currentPage: safePage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    totalFilteredCount,
  };
}

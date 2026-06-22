import React, { useRef, useState, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { FileText, ZoomIn, ZoomOut, RotateCcw, Download } from "lucide-react";
import { CVData, CVConfig } from "../../types/cv";
import { ClassicTemplate } from "../CVTemplates/ClassicTemplate";

interface CVPreviewProps {
  data: CVData;
  config: CVConfig;
}

export const CVPreview: React.FC<CVPreviewProps> = ({ data, config }) => {
  const componentRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Scaling states
  const [baseScale, setBaseScale] = useState(0.7);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [templateHeight, setTemplateHeight] = useState(1122.5);

  const totalPages = Math.max(1, Math.ceil(templateHeight / 1122.5));

  // Resize Observer to scale preview A4 dynamically to fit parent container width
  useEffect(() => {
    if (!previewContainerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const width = entry.contentRect.width;
        // A4 page width is 210mm. 210mm in pixels at 96 DPI is approx 794px.
        // We subtract padding to fit page nicely (48px total horizontal margins).
        const newScale = Math.min((width - 48) / 794, 1);
        setBaseScale(newScale);
      }
    });
    resizeObserver.observe(previewContainerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!componentRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setTemplateHeight(entry.contentRect.height);
      }
    });
    resizeObserver.observe(componentRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const finalScale = baseScale * (zoomLevel / 100);

  // PDF Download Trigger
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
  });

  return (
    <div className="w-full md:w-1/2 h-full bg-slate-950/30 border border-white/5 rounded-2xl flex flex-col overflow-hidden relative shadow-inner">
      {/* Controls Bar inside the Preview Card */}
      <div className="bg-slate-900/60 backdrop-blur-md border-b border-white/5 px-4.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-10 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="text-xs font-bold text-slate-200">Lebenslauf Vorschau</span>
        </div>

        {/* Zoom and Export Actions */}
        <div className="flex items-center justify-between sm:justify-end gap-3 flex-1 sm:flex-initial">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1.5 bg-slate-950/70 border border-white/10 rounded-xl px-2 py-1 h-[32px]">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
              className="text-slate-400 hover:text-white transition p-1 rounded hover:bg-white/5 border-none cursor-pointer flex items-center justify-center bg-transparent"
              title="Verkleinern"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-slate-300 text-[10px] select-none min-w-[28px] text-center">{zoomLevel}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
              className="text-slate-400 hover:text-white transition p-1 rounded hover:bg-white/5 border-none cursor-pointer flex items-center justify-center bg-transparent"
              title="Vergrößern"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(100)}
              className="text-slate-500 hover:text-slate-300 transition p-1 rounded hover:bg-white/5 border-none cursor-pointer flex items-center justify-center ml-0.5 bg-transparent"
              title="Zurücksetzen"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* PDF Export Button */}
          <button
            onClick={() => handlePrint()}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3.5 rounded-xl text-xs shadow-md shadow-blue-900/10 cursor-pointer transition border-none h-[32px]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportieren</span>
          </button>
        </div>
      </div>

      {/* Outer scroll container for centered A4 template pages stacked vertically */}
      <div 
        ref={previewContainerRef}
        className="flex-1 overflow-y-auto overflow-x-auto p-6 custom-scrollbar flex flex-col items-center gap-6"
      >
        {Array.from({ length: totalPages }).map((_, index) => (
          <div 
            key={index}
            style={{
              width: `${794 * finalScale}px`,
              height: `${1122.5 * finalScale}px`,
              position: "relative",
              overflow: "hidden",
            }}
            className="shrink-0 bg-white shadow-2xl rounded-sm transition-all duration-200"
          >
            {/* Scaled Wrapper */}
            <div 
              className="origin-top-left bg-white"
              style={{
                transform: `scale(${finalScale})`,
                width: "794px",
                position: "absolute",
                top: `-${index * 1122.5 * finalScale}px`,
                left: 0,
              }}
            >
              <ClassicTemplate data={data} config={config} />
            </div>
          </div>
        ))}
      </div>

      {/* Offscreen Print Container */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <div ref={componentRef}>
          <ClassicTemplate data={data} config={config} />
        </div>
      </div>
    </div>
  );
};

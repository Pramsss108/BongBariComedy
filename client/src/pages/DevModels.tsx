import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/seo-head";

interface PickupModel {
  id: string;
  name: string;
  bn: string;
  drawName: string;
  value: string;
  note: string;
}

const MODEL_SCRIPT_ID = "bb-cr-models-dev-script";
let modelScriptPromise: Promise<void> | null = null;

const PICKUP_MODELS: PickupModel[] = [
  { id: "pickup-chai-token", name: "Chai Token", bn: "চা টোকেন", drawName: "drawChaiToken", value: "+25", note: "main score pickup" },
  { id: "pickup-bishesh", name: "Bishesh Chai", bn: "বিশেষ চা", drawName: "drawBisheshChai", value: "x3", note: "score boost + safety" },
  { id: "pickup-marie", name: "Marie Biscuit", bn: "মারি বিস্কুট", drawName: "drawBiscuit", value: "+20", note: "bonus score pickup" },
  { id: "pickup-singara", name: "Singara", bn: "সিঙ্গাড়া", drawName: "drawSingara", value: "+30", note: "bonus score pickup" },
  { id: "pickup-slice", name: "Bread Slice", bn: "পাউরুটি", drawName: "drawBreadSlice", value: "+50", note: "bonus score pickup" },
  { id: "pickup-chanachur", name: "Jhal Chanachur", bn: "ঝাল চানাচুর", drawName: "drawChanachur", value: "x2", note: "score burst pickup" },
  { id: "pickup-heart", name: "Heart", bn: "হার্ট", drawName: "drawHeartPickup", value: "+1 life", note: "recovery pickup" },
];

function getBBModels(): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { BBModels?: Record<string, unknown> }).BBModels ?? null;
}

function ensureModelScript(): Promise<void> {
  if (getBBModels()) return Promise.resolve();
  if (modelScriptPromise) return modelScriptPromise;

  modelScriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(MODEL_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("BBModels failed to load")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = MODEL_SCRIPT_ID;
    script.src = `/bb-cr-models.js?v=${Date.now()}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("BBModels failed to load"));
    document.head.appendChild(script);
  });

  return modelScriptPromise;
}

function drawFallback(ctx: CanvasRenderingContext2D, model: PickupModel, w: number, h: number) {
  ctx.save();
  ctx.fillStyle = "#ecfdf5";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#047857";
  ctx.font = "800 15px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(model.name, w / 2, h / 2 - 7);
  ctx.font = "700 11px system-ui, sans-serif";
  ctx.fillStyle = "#10b981";
  ctx.fillText("pickup model", w / 2, h / 2 + 16);
  ctx.restore();
}

function drawPickup(ctx: CanvasRenderingContext2D, model: PickupModel, t: number, w: number, h: number) {
  const models = getBBModels();
  const draw = models?.[model.drawName];
  if (typeof draw === "function") {
    (draw as (ctx: CanvasRenderingContext2D, t: number, w: number, h: number) => void)(ctx, t, w, h);
    return;
  }
  drawFallback(ctx, model, w, h);
}

function PickupCanvas({ model, ready, large = false }: { model: PickupModel; ready: boolean; large?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = large ? 420 : canvas.clientWidth;
    const cssH = large ? 330 : canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(cssW * dpr));
    canvas.height = Math.max(1, Math.round(cssH * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, cssW, cssH);
      drawPickup(ctx, model, t, cssW, cssH);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [model, ready, large]);

  return <canvas ref={canvasRef} className="h-full w-full" style={large ? { width: 420, height: 330, maxWidth: "100%" } : undefined} />;
}

function PickupCard({ model, ready, onZoom }: { model: PickupModel; ready: boolean; onZoom: () => void }) {
  return (
    <article className="overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <button
        type="button"
        onClick={onZoom}
        className="relative block h-56 w-full bg-[radial-gradient(circle_at_50%_35%,#ffffff_0,#ecfdf5_46%,#ccfbf1_100%)]"
        aria-label={`Open ${model.name} pickup preview`}
      >
        <PickupCanvas model={model} ready={ready} />
        <span className="absolute left-2 top-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
          Pickup
        </span>
        <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-black text-emerald-700 shadow-sm ring-1 ring-emerald-200">
          {model.value}
        </span>
      </button>
      <div className="p-3">
        <h2 className="truncate text-sm font-black text-slate-950">{model.name}</h2>
        <p className="bangla-text truncate text-xs text-slate-500">{model.bn}</p>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">{model.note}</p>
      </div>
    </article>
  );
}

function PickupModal({ model, ready, onClose, onPrev, onNext, hasPrev, hasNext }: {
  model: PickupModel;
  ready: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && hasPrev) onPrev();
      if (event.key === "ArrowRight" && hasNext) onNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hasNext, hasPrev, onClose, onNext, onPrev]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <section className="w-[420px] max-w-[94vw] overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="relative h-[330px] bg-[radial-gradient(circle_at_50%_35%,#ffffff_0,#ecfdf5_48%,#a7f3d0_100%)]">
          <PickupCanvas model={model} ready={ready} large />
          <span className="absolute left-3 top-3 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-white">
            Pickup
          </span>
          <span className="absolute right-14 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-200">
            {model.value}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/25 text-xl font-bold text-white hover:bg-black/45"
            aria-label="Close preview"
          >
            ×
          </button>
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Button variant="outline" size="sm" disabled={!hasPrev} onClick={onPrev}>Prev</Button>
          <div className="min-w-0 text-center">
            <h2 className="truncate text-base font-black text-slate-950">{model.name}</h2>
            <p className="truncate text-xs font-semibold text-emerald-700">{model.note}</p>
          </div>
          <Button variant="outline" size="sm" disabled={!hasNext} onClick={onNext}>Next</Button>
        </div>
      </section>
    </div>
  );
}

export default function DevModels() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [modelsReady, setModelsReady] = useState(false);
  const [modalIndex, setModalIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) setLocation("/login");
  }, [authLoading, isAuthenticated, setLocation]);

  useEffect(() => {
    let mounted = true;
    ensureModelScript()
      .then(() => { if (mounted) setModelsReady(true); })
      .catch(() => { if (mounted) setModelsReady(false); });
    return () => { mounted = false; };
  }, []);

  const modalModel = modalIndex === null ? null : PICKUP_MODELS[modalIndex];

  return (
    <>
      <SEOHead
        title="Pickup Models - Chai Runner | Bong Bari"
        description="Only the current Chai Runner pickup and point-gain models."
      />
      <main className="min-h-screen bg-emerald-50 pb-16 pt-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">Chai Runner Pickup Models</p>
                <h1 className="mt-1 text-3xl font-black text-slate-950 sm:text-4xl">Point Gain Models Only</h1>
                <p className="mt-2 max-w-2xl text-sm font-medium text-slate-600">
                  Only existing pickup/reward models from the live game. No hero, no enemy, no boss, no old skin clutter.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={() => setLocation("/admin")}>Back to Admin</Button>
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-emerald-700 shadow-sm ring-1 ring-emerald-200">
                  {PICKUP_MODELS.length} pickups
                </span>
              </div>
            </div>

            <div className="mb-6 rounded-xl border border-emerald-200 bg-white p-3 text-sm font-bold text-emerald-800 shadow-sm">
              Green = gain. These are the only items that should appear on this page.
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {PICKUP_MODELS.map((model, index) => (
                <PickupCard key={model.id} model={model} ready={modelsReady} onZoom={() => setModalIndex(index)} />
              ))}
            </div>
          </div>
        </div>
      </main>

      {modalModel && (
        <PickupModal
          model={modalModel}
          ready={modelsReady}
          onClose={() => setModalIndex(null)}
          onPrev={() => setModalIndex((index) => (index !== null ? Math.max(0, index - 1) : index))}
          onNext={() => setModalIndex((index) => (index !== null ? Math.min(PICKUP_MODELS.length - 1, index + 1) : index))}
          hasPrev={modalIndex !== null && modalIndex > 0}
          hasNext={modalIndex !== null && modalIndex < PICKUP_MODELS.length - 1}
        />
      )}
    </>
  );
}
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronLeft, Clipboard, ClipboardCheck, Image as ImageIcon, Link2, LoaderCircle, Paperclip, QrCode, Share2, ShieldAlert, ShieldCheck, Trash2, Upload, X } from "lucide-react";
import { analyzeText, type Verdict } from "./lib/analyze";
import { analyzeIntelligently, type IntelligentAnalysis } from "./lib/intelligence";
import { apiBase, fetchRemoteIntelligence, mergeRemoteIntelligence } from "./lib/remote-intelligence";
import { extractTextFromImage } from "./lib/ocr";
import { decodeQrFromImage, decodeQrFromImageData } from "./lib/qr";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { extractPdfTextFallback, inspectExecutable } from "./lib/file-inspection";

const verdictMeta: Record<Verdict, { icon: any; label: string; className: string }> = {
  ok: { icon: CheckCircle2, label: "OK", className: "ok" },
  check: { icon: AlertTriangle, label: "À VÉRIFIER", className: "check" },
  caution: { icon: ShieldAlert, label: "PRUDENCE", className: "caution" },
  stop: { icon: ShieldAlert, label: "STOP", className: "stop" }
};

type ServerAnalysis = IntelligentAnalysis & {
  intent?: string;
  evidence?: { risk: number; sender?: string | null; senderDomain?: string | null; headers?: { from: string | null; replyTo: string | null; returnPath: string | null; receivedCount: number }; urlFindings?: string[] };
};
type Incident = "none" | "clicked" | "info" | "paid";
type Page = "home" | "help" | "privacy";

const HISTORY_KEY = "verif-history";
const HISTORY_SIZE = 10;
const HISTORY_ENTRY_MAX = 4000;
const MAX_INPUT = 50000;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_ARCHIVE_ENTRY_BYTES = 8 * 1024 * 1024;
const FILE_ACCEPT = "image/*,.pdf,.docx,.xlsx,.xls,.zip,.txt,.csv,.json,.xml,.html,.htm,.md,.log,.eml,.exe,.dll,.scr,.com,.msi,.apk,text/plain,application/pdf,application/zip,application/x-msdownload";

const WINDOWS_EXECUTABLE = /\.(exe|dll|scr|com|msi)$/i;
const OTHER_EXECUTABLE = /\.(apk|bat|cmd|ps1|vbs|vbe|js|jse|hta|jar|dmg|pkg|lnk|iso|img)$/i;
const ARCHIVE_DANGEROUS = /\.(exe|msi|scr|bat|cmd|com|js|jse|vbs|vbe|ps1|hta|jar|apk|lnk|dll)$/i;
const TEXT_FILE = /\.(txt|csv|json|xml|html|htm|md|log|eml)$/i;
const OFFICE_FILE = /\.(docx|xlsx|xls)$/i;
const ARCHIVE_NOTICE = /ATTENTION\s*:\s*l['’]archive contient des fichiers potentiellement exécutables/i;

function isZip(file: File) {
  return /\.zip$/i.test(file.name) || file.type === "application/zip" || file.type === "application/x-zip-compressed";
}

function loadHistory(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, HISTORY_SIZE) : [];
  } catch { return []; }
}

function historyLabel(text: string) {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length > 80 ? line.slice(0, 80) + "…" : line;
}

function incidentAdvice(kind: "clicked" | "info" | "paid", scenario?: string) {
  if (kind === "paid") return scenario === "banking_fraud" || scenario === "refund_scam"
    ? ["Contacte immédiatement ta banque via son application ou ses coordonnées officielles.", "Demande les mesures adaptées à l'opération et surveille les opérations suivantes.", "Conserve les preuves du paiement et du message."]
    : ["Contacte immédiatement le service de paiement ou ta banque via un canal officiel.", "Conserve les preuves du paiement, du message et de l'URL.", "Si le paiement est frauduleux, demande les démarches adaptées à ta situation."];
  if (kind === "info") return scenario === "account_takeover"
    ? ["Change immédiatement le mot de passe depuis le site ou l'application officielle.", "Change-le aussi sur les autres services où il était réutilisé.", "Active la double authentification et vérifie les sessions/appareils connectés."]
    : scenario === "banking_fraud" || scenario === "refund_scam"
      ? ["Si tu as transmis des données bancaires, contacte immédiatement ta banque via son canal officiel.", "Si tu as transmis un mot de passe, change-le depuis le site officiel.", "Conserve toutes les preuves."]
      : ["Change les mots de passe concernés depuis les sites officiels.", "Active la double authentification lorsque c'est possible.", "Conserve les preuves et surveille les suites éventuelles."];
  return scenario === "malware_download"
    ? ["N'ouvre plus le fichier et ne relance pas l'installation.", "Si une application suspecte a été installée, évite de l'utiliser et fais vérifier l'appareil.", "Conserve les preuves et demande de l'aide si l'appareil se comporte anormalement."]
    : ["Ferme la page suspecte sans saisir d'informations supplémentaires.", "Conserve l'URL et fais une capture si possible.", "Si tu as téléchargé ou installé quelque chose, ne l'ouvre plus et fais vérifier l'appareil."];
}

async function extractPdfText(file: File) {
  const data = await file.arrayBuffer();
  try {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    // pdf.js transfers the buffer to its worker: give it a copy so the fallback can still read the file.
    const pdf = await pdfjsLib.getDocument({ data: data.slice(0), disableFontFace: true, useSystemFonts: true, isEvalSupported: false }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((item: any) => item.str || "").join(" "));
    }
    const text = pages.join("\n").trim();
    if (text) return text;
  } catch {}
  return extractPdfTextFallback(file);
}

async function extractOfficeText(file: File) {
  const data = await file.arrayBuffer();
  if (/\.docx$/i.test(file.name)) {
    const mammoth = await import("mammoth/mammoth.browser");
    const result = await mammoth.extractRawText({ arrayBuffer: data });
    return result.value;
  }
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(data, { type: "array", cellFormula: true });
  return workbook.SheetNames.map(sheet => `[Feuille: ${sheet}]\n${XLSX.utils.sheet_to_csv(workbook.Sheets[sheet], { FS: " | ", RS: "\n" })}`).join("\n");
}

async function extractZipText(file: File) {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const entries = Object.values(zip.files).filter((entry: any) => !entry.dir) as any[];
  const dangerous = entries.filter(entry => ARCHIVE_DANGEROUS.test(entry.name)).map(entry => entry.name as string);
  const readable = entries.filter(entry => TEXT_FILE.test(entry.name) || OFFICE_FILE.test(entry.name) || /\.pdf$/i.test(entry.name)).slice(0, 20);
  const parts: string[] = [];
  for (const entry of readable) {
    // Skip oversized members instead of inflating them in memory.
    const size = Number(entry._data?.uncompressedSize || 0);
    if (size > MAX_ARCHIVE_ENTRY_BYTES) { parts.push(`[Fichier dans l'archive: ${entry.name}]\n(fichier trop volumineux, non lu)`); continue; }
    try {
      let content: string;
      if (TEXT_FILE.test(entry.name)) content = await entry.async("text");
      else {
        const inner = new File([await entry.async("blob")], entry.name);
        content = /\.pdf$/i.test(entry.name) ? await extractPdfText(inner) : await extractOfficeText(inner);
      }
      parts.push(`[Fichier dans l'archive: ${entry.name}]\n${content}`);
    } catch {}
  }
  const security = dangerous.length ? `ATTENTION : l'archive contient des fichiers potentiellement exécutables : ${dangerous.slice(0, 10).join(", ")}.\n` : "";
  const listing = !parts.length && entries.length ? `Contenu de l'archive : ${entries.slice(0, 30).map(entry => entry.name).join(", ")}.` : "";
  return (security + parts.join("\n") + listing).slice(0, MAX_INPUT * 4);
}

function readTextFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("lecture impossible"));
    reader.readAsText(file);
  });
}

export function App() {
  const [webEnabled, setWebEnabled] = useState(false);
  const [remoteEnabled, setRemoteEnabled] = useState(false);
  const [input, setInput] = useState("");
  const [analysis, setAnalysis] = useState<ServerAnalysis | null>(null);
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState<Page>("home");
  const [camera, setCamera] = useState(false);
  const [installEvent, setInstallEvent] = useState<any>(null);
  const [incident, setIncident] = useState<Incident>("none");
  const [history, setHistory] = useState<string[]>(loadHistory);
  const [loading, setLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);

  const runRef = useRef(0);
  const intakeRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  // Options are read when the analysis starts, including from callbacks created earlier (camera loop, share intake).
  const optionsRef = useRef({ web: false, remote: false });
  optionsRef.current = { web: webEnabled, remote: remoteEnabled };

  function stopStream() {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }
  function openCamera() { setNotice(""); setCamera(true); }
  function closeCamera() { stopStream(); setCamera(false); }

  function remember(text: string) {
    const entry = text.slice(0, HISTORY_ENTRY_MAX);
    setHistory(previous => {
      const next = [entry, ...previous.filter(item => item !== entry)].slice(0, HISTORY_SIZE);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function reset(clearInput: boolean) {
    runRef.current++;
    setLoading(false);
    setOcrProgress(null);
    setAnalysis(null);
    setIncident("none");
    setCopied(false);
    setNotice("");
    if (clearInput) setInput("");
    setPage("home");
    window.scrollTo({ top: 0 });
  }

  async function verify(value = input) {
    const clean = value.trim().slice(0, MAX_INPUT);
    if (!clean) return;
    setPage("home");
    setInput(clean);
    setNotice("");
    setIncident("none");
    setCopied(false);
    setLoading(true);
    const run = ++runRef.current;
    const options = optionsRef.current;
    const local = analyzeText(clean);
    try {
      setAnalysis({ ...local, engine: "VÉRIF local" });
      setNotice("Analyse locale terminée. VÉRIF Intelligence vérifie maintenant les preuves techniques, l’IA embarquée et les données web disponibles…");
      const enhanced = await analyzeIntelligently(clean, local, { web: options.web });
      if (run !== runRef.current) return;
      let finalAnalysis = enhanced;
      if (options.remote && apiBase()) {
        setNotice("Analyse locale terminée. Le moteur distant vérifie maintenant les renseignements web et le second avis IA…");
        const remote = await fetchRemoteIntelligence(clean);
        if (remote) finalAnalysis = mergeRemoteIntelligence(enhanced, remote);
      }
      if (run !== runRef.current) return;
      setAnalysis(finalAnalysis);
      const ai = finalAnalysis.intelligence?.ai.used ? "IA locale active" : "IA locale indisponible sur cet appareil";
      const web = finalAnalysis.intelligence?.web.available ? "recherche web active" : options.web ? "recherche web sans résultat exploitable" : "recherche web désactivée";
      const remoteActive = (finalAnalysis.intelligence as any)?.remote?.used ? " · moteur distant actif" : "";
      setNotice(`VÉRIF Intelligence : ${ai} · ${web}${remoteActive}.`);
    } catch {
      if (run !== runRef.current) return;
      setAnalysis(local);
      setNotice("Le moteur renforcé n’a pas pu terminer l’analyse. Le résultat affiché reste conservateur.");
    } finally {
      if (run === runRef.current) { setLoading(false); remember(clean); }
    }
  }

  async function onFile(file?: File | null) {
    if (!file) return;
    // `token` follows the analysis started from this file, so a newer action still cancels this one.
    let token = ++runRef.current;
    const current = () => token === runRef.current;
    const runVerify = async (text: string) => { const pending = verify(text); token = runRef.current; await pending; };
    setPage("home");
    setNotice("");
    setIncident("none");
    setCopied(false);
    const name = file.name.toLowerCase();
    const localNote = `Fichier analysé : ${file.name}. Le traitement du fichier est local ; les options de recherche choisies s’appliquent.`;

    if (file.size > MAX_FILE_BYTES) {
      setNotice(`« ${file.name} » dépasse 25 Mo et n’a pas été lu. Colle plutôt le texte du message ou une capture du passage douteux.`);
      return;
    }

    if (WINDOWS_EXECUTABLE.test(name) || file.type === "application/vnd.microsoft.portable-executable") {
      setLoading(true);
      try {
        const info = await inspectExecutable(file);
        if (!current()) return;
        setInput("");
        setAnalysis({
          verdict: info.validPe ? "stop" : "caution",
          title: info.validPe ? "Exécutable Windows détecté" : "Fichier exécutable suspect",
          summary: info.validPe
            ? "VÉRIF a confirmé une structure PE Windows. Ce fichier peut exécuter du code sur Windows. Ne l’ouvre pas si tu ne connais pas précisément sa provenance."
            : "Le nom du fichier indique un exécutable, mais sa structure Windows n’a pas pu être confirmée.",
          reasons: info.reasons,
          actions: ["N’exécute pas ce fichier directement.", "Si tu dois vérifier sa provenance, utilise le site officiel de l’éditeur ou un service de sécurité reconnu.", "Conserve le fichier original pour une analyse complémentaire."],
          confidence: info.validPe ? "élevée" : "moyenne",
          engine: "VÉRIF fichier local",
          checkedAt: new Date().toISOString(),
          evidence: { risk: info.validPe ? 8 : 4 }
        });
        setNotice(`Fichier inspecté : ${file.name}. Le fichier n’est jamais exécuté.`);
      } catch (error) {
        if (!current()) return;
        setInput("");
        setNotice("Erreur d’inspection : " + (error instanceof Error ? error.message : String(error)));
        setAnalysis({ verdict: "check", title: "Fichier à vérifier", summary: "VÉRIF n’a pas pu inspecter ce fichier exécutable.", reasons: ["La lecture de l’en-tête du fichier a échoué."], actions: ["N’exécute pas le fichier.", "Conserve le fichier et fais-le analyser avec un outil de sécurité reconnu."], confidence: "faible", engine: "VÉRIF fichier local", checkedAt: new Date().toISOString() });
      } finally { if (current()) setLoading(false); }
      return;
    }

    if (OTHER_EXECUTABLE.test(name) || file.type === "application/vnd.android.package-archive") {
      const apk = name.endsWith(".apk") || file.type === "application/vnd.android.package-archive";
      setInput("");
      setAnalysis({
        verdict: "caution",
        title: apk ? "Application Android hors magasin" : "Fichier exécutable ou script",
        summary: apk
          ? "Ce fichier installe une application Android en dehors du magasin officiel. C’est une méthode courante pour diffuser des applications malveillantes."
          : "Ce type de fichier peut exécuter des commandes ou installer un logiciel dès son ouverture.",
        reasons: [`Le fichier « ${file.name} » est d’un type exécutable (${name.slice(name.lastIndexOf("."))}).`, "VÉRIF ne lit pas le contenu de ce type de fichier et ne l’exécute jamais."],
        actions: ["N’ouvre pas et n’installe pas ce fichier si tu ne l’attendais pas.", apk ? "Installe les applications uniquement depuis le magasin officiel de ton appareil." : "Demande confirmation à l’expéditeur par un autre canal avant toute ouverture.", "En cas de doute, fais-le analyser par un outil de sécurité reconnu."],
        confidence: "moyenne",
        engine: "VÉRIF fichier local",
        checkedAt: new Date().toISOString(),
        evidence: { risk: 4 }
      });
      setNotice(`Fichier inspecté : ${file.name}. Le fichier n’est jamais exécuté.`);
      return;
    }

    const image = file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp)$/i.test(name);
    if (image) {
      try {
        const qr = await decodeQrFromImage(file);
        if (!current()) return;
        if (qr) { await runVerify(qr); return; }
      } catch {}
    }

    if (file.type.startsWith("text/") || TEXT_FILE.test(name)) {
      try {
        const text = (await readTextFile(file)).trim();
        if (!current()) return;
        if (!text) { setNotice("Le fichier texte est vide."); return; }
        await runVerify(text);
        if (current()) setNotice(localNote);
      } catch { if (current()) setNotice("Impossible de lire ce fichier texte."); }
      return;
    }

    setLoading(true);
    if (image) setOcrProgress(0);
    try {
      let text = "";
      if (name.endsWith(".pdf") || file.type === "application/pdf") text = await extractPdfText(file);
      else if (OFFICE_FILE.test(name)) text = await extractOfficeText(file);
      else if (isZip(file)) text = await extractZipText(file);
      else if (image) text = await extractTextFromImage(file, progress => { if (current()) setOcrProgress(progress); });
      else throw new Error("format");
      if (!current()) return;

      if (!text.trim()) {
        setInput("");
        setAnalysis({ verdict: "check", title: "Document à vérifier", summary: "VÉRIF n'a pas trouvé de texte exploitable dans ce fichier.", reasons: [image ? "Aucun texte lisible ni QR code n’a été reconnu dans l’image." : "Le fichier ne contient pas de texte extractible ou son contenu est protégé."], actions: [image ? "Réessaie avec une image plus nette, bien cadrée et sans reflet." : "Essaie un autre format ou une capture du contenu visible.", "Tu peux aussi coller directement le texte du message."], confidence: "faible", engine: "document", checkedAt: new Date().toISOString() });
        return;
      }

      const clean = text.trim().slice(0, MAX_INPUT);
      setInput(clean);
      if (isZip(file) && ARCHIVE_NOTICE.test(clean)) {
        const local = analyzeText(clean);
        setAnalysis({
          ...local,
          verdict: "stop",
          title: "Archive contenant un exécutable",
          summary: "VÉRIF a détecté un ou plusieurs fichiers potentiellement exécutables dans cette archive. Ne les ouvre pas.",
          reasons: Array.from(new Set([...local.reasons.filter(reason => !/Aucun signal de risque/i.test(reason)), "L’archive contient un fichier potentiellement exécutable."])),
          actions: ["N’ouvre ni n’exécute les fichiers contenus dans l’archive.", "Vérifie la provenance de l’archive par un canal officiel.", "Conserve l’archive pour une analyse complémentaire."],
          confidence: "élevée",
          engine: "VÉRIF fichier local",
          evidence: { ...local.evidence, risk: Math.max(local.evidence?.risk || 0, 8) }
        });
        setNotice(localNote);
      } else {
        await runVerify(clean);
        if (current()) setNotice(localNote);
      }
    } catch (error) {
      if (!current()) return;
      const detail = error instanceof Error ? error.message : String(error);
      const unsupported = detail === "format";
      setInput("");
      setNotice(unsupported ? `Le format de « ${file.name} » n’est pas pris en charge.` : "Erreur de lecture du fichier : " + detail);
      setAnalysis({
        verdict: "check",
        title: "Fichier non analysable automatiquement",
        summary: unsupported ? "VÉRIF ne sait pas lire ce type de fichier." : "VÉRIF n'a pas pu lire ce fichier ou son contenu.",
        reasons: [unsupported ? "Formats pris en charge : images, PDF, DOCX, XLSX, ZIP et fichiers texte." : "Erreur technique : " + detail],
        actions: ["Colle directement le texte du message, ou ajoute une capture d’écran du contenu.", "N’ouvre pas le fichier s’il provient d’un expéditeur inattendu."],
        confidence: "faible",
        engine: "document-error",
        checkedAt: new Date().toISOString()
      });
    } finally {
      if (current()) { setOcrProgress(null); setLoading(false); }
    }
  }

  function captureFrame() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) { setNotice("La caméra n’est pas encore prête. Réessaie dans un instant."); return; }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      closeCamera();
      if (blob) void onFile(new File([blob], "capture.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  }

  async function pasteFromClipboard() {
    try {
      if (!navigator.clipboard?.readText) throw new Error("unsupported");
      const text = await navigator.clipboard.readText();
      if (text) { setInput(text); setNotice(""); }
      else setNotice("Le presse-papiers ne contient pas de texte.");
    } catch { setNotice("Impossible de lire le presse-papiers. Colle le texte manuellement dans la zone ci-dessus."); }
  }

  async function copyText(text: string) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("unsupported");
      await navigator.clipboard.writeText(text);
      return true;
    } catch { return false; }
  }

  function buildClientIncidentReport() {
    if (!analysis) return "";
    const labels: Record<Incident, string> = { none: "Aucune action déclarée", clicked: "Lien ouvert", info: "Informations transmises", paid: "Paiement effectué" };
    return [
      "VÉRIF — DOSSIER D'INCIDENT", "",
      "Date d'analyse : " + (analysis.checkedAt || new Date().toISOString()),
      "Verdict : " + String(analysis.verdict || "inconnu").toUpperCase(),
      "Scénario : " + (analysis.recommendation?.label || "Non déterminé"),
      "Situation déclarée : " + labels[incident],
      "Score de risque : " + (analysis.evidence?.risk ?? "non calculé"),
      "", "RÉSUMÉ", analysis.summary || "Aucun résumé disponible.",
      "", "EXPÉDITEUR", analysis.identity?.sender || analysis.evidence?.sender || "Non détecté",
      "Domaine expéditeur : " + (analysis.identity?.senderDomain || analysis.evidence?.senderDomain || "Non détecté"),
      "", "SIGNAUX", ...(analysis.reasons?.length ? analysis.reasons.map(reason => "- " + reason) : ["- Aucun"])
    ].join("\n");
  }

  async function shareResult() {
    if (!analysis) return;
    const text = buildClientIncidentReport() || `${analysis.title}\n${analysis.summary}`;
    if (navigator.share) {
      try { await navigator.share({ title: "VÉRIF — résultat", text }); return; }
      catch (error) { if ((error as Error)?.name === "AbortError") return; }
    }
    setNotice(await copyText(text) ? "Résultat copié dans le presse-papiers." : "Le partage n’est pas disponible sur cet appareil. Utilise « Voir le contenu » puis copie le texte manuellement.");
  }

  async function copyIncidentReport() {
    if (await copyText(analysis?.incidentReport || "")) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } else setNotice("Copie impossible sur cet appareil. Ouvre « Voir le contenu » et copie le texte manuellement.");
  }

  // Release the camera when the app is closed.
  useEffect(() => stopStream, []);

  // Live camera: decodes QR codes continuously; a frame can also be captured for text recognition.
  useEffect(() => {
    if (!camera) return;
    let active = true;
    if (!navigator.mediaDevices?.getUserMedia) {
      setNotice("La caméra n’est pas disponible sur cet appareil. Utilise le bouton Photo à la place.");
      setCamera(false);
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } }).then(stream => {
      if (!active) { stream.getTracks().forEach(track => track.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      const Detector = (window as any).BarcodeDetector;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      let detector: any = null;
      try { detector = Detector ? new Detector({ formats: ["qr_code"] }) : null; } catch { detector = null; }
      const scan = async () => {
        const video = videoRef.current;
        if (!active || !video) return;
        try {
          let value: string | null = null;
          if (detector && video.readyState >= 2) {
            const codes = await detector.detect(video);
            value = codes?.[0]?.rawValue || null;
          } else if (context && video.videoWidth) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            value = decodeQrFromImageData(context.getImageData(0, 0, canvas.width, canvas.height));
          }
          if (value && active) {
            active = false;
            closeCamera();
            await verify(value);
            return;
          }
        } catch {}
        if (active) requestAnimationFrame(scan);
      };
      requestAnimationFrame(scan);
    }).catch(() => {
      if (!active) return;
      setNotice("La caméra n’est pas disponible ou son accès a été refusé. Utilise le bouton Photo à la place.");
      setCamera(false);
    });
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") closeCamera(); };
    window.addEventListener("keydown", onKey);
    return () => { active = false; window.removeEventListener("keydown", onKey); stopStream(); };
  }, [camera]);

  // Content handed over by the extension (#text=…&url=…), by a link (?text=…) or by the Android share sheet.
  useEffect(() => {
    if (intakeRef.current) return;
    intakeRef.current = true;
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const pick = (key: string) => hash.get(key) || search.get(key) || "";
    const linked = [pick("text"), pick("url")].filter(Boolean).join("\n").slice(0, MAX_INPUT);
    const fromShareSheet = search.has("shared");
    if (linked || fromShareSheet) {
      // Do not keep the shared content in the address bar, the browser history or a reload.
      try { window.history.replaceState(null, "", window.location.pathname); } catch {}
    }
    if (linked) { void verify(linked); return; }
    if (!fromShareSheet) return;
    (async () => {
      try {
        const sharedUrl = `${import.meta.env.BASE_URL}__shared`;
        const response = await fetch(sharedUrl, { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json();
        try { for (const key of await caches.keys()) await (await caches.open(key)).delete(sharedUrl); } catch {}
        if (payload.file) {
          if (payload.file.tooLarge) { setNotice("Le fichier partagé est trop volumineux pour être transmis automatiquement. Utilise le bouton Fichier dans VÉRIF."); return; }
          const binary = atob(payload.file.base64 || "");
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          await onFile(new File([bytes], payload.file.name || "partage", { type: payload.file.type || "application/octet-stream" }));
          return;
        }
        const shared = [payload.title, payload.text, payload.url].filter(Boolean).join("\n");
        if (shared) await verify(shared);
        else setNotice("Le contenu partagé est vide ou n’a pas pu être récupéré. Colle-le directement ici.");
      } catch { setNotice("Le contenu partagé n’a pas pu être récupéré. Colle-le directement ici."); }
    })();
  }, []);

  useEffect(() => {
    const handler = (event: Event) => { event.preventDefault(); setInstallEvent(event); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const meta = verdictMeta[analysis?.verdict || "check"] || verdictMeta.check;
  const Icon = meta.icon;
  const remoteAvailable = Boolean(apiBase());

  const options = (
    <div className="options">
      <label><input type="checkbox" checked={webEnabled} onChange={event => setWebEnabled(event.target.checked)} /> Enrichir avec DNS/RDAP (les domaines sont transmis aux services de recherche)</label>
      {remoteAvailable && <label><input type="checkbox" checked={remoteEnabled} onChange={event => setRemoteEnabled(event.target.checked)} /> Autoriser le second avis serveur et la recherche web (transmet le contenu analysé)</label>}
    </div>
  );

  const noticeBox = notice ? <div className="notice" role="status">{notice}</div> : null;

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={() => reset(false)} aria-label="VÉRIF — retour à l’accueil"><span className="brandMark">✓</span><span>VÉRIF</span></button>
        <div className="topbarRight">
          <button className="navLink" onClick={() => setPage("help")}>Comment ça marche</button>
          <button className="navLink" onClick={() => setPage("privacy")}>Confidentialité</button>
          <span className="tagline">Un doute ? Vérifie avant d’agir.</span>
          {installEvent && <button className="installButton" onClick={async () => { try { await installEvent.prompt(); } catch {} setInstallEvent(null); }}>Installer</button>}
        </div>
      </header>

      <main>
        {page !== "home" ? (
          <section className="infoPage">
            <button className="back" onClick={() => setPage("home")}><ChevronLeft size={20} />Retour</button>
            {page === "help" ? (
              <>
                <div className="eyebrow">COMMENT ÇA MARCHE</div>
                <h1>VÉRIF en 3 étapes.</h1>
                <div className="infoGrid">
                  <div className="infoCard"><b>1. Montre</b><p>Colle le message, ajoute une capture, un lien ou scanne un QR code.</p></div>
                  <div className="infoCard"><b>2. Vérifie</b><p>VÉRIF recherche des signaux techniques et contextuels et explique son résultat.</p></div>
                  <div className="infoCard"><b>3. Agis</b><p>Tu obtiens des actions concrètes et, si nécessaire, les bons canaux de signalement.</p></div>
                </div>
                <div className="panel"><h3>Important</h3><p>Un résultat OK signifie seulement qu’aucun signal évident n’a été trouvé. Vérifie toujours par le site ou l’application officielle si le message est inattendu.</p></div>
              </>
            ) : (
              <>
                <div className="eyebrow">CONFIDENTIALITÉ</div>
                <h1>Tes données restent sous ton contrôle.</h1>
                <div className="panel privacyText">
                  <p>VÉRIF commence toujours par une analyse locale. Les fichiers importés ne sont jamais exécutés.</p>
                  <p>Quand la recherche web est disponible, seuls les domaines ou URL utiles à la vérification peuvent être interrogés auprès de services DNS/RDAP ou par l’extension. Si un moteur serveur optionnel est configuré, le contenu peut aussi lui être transmis pour un second avis IA ; l’interface l’indique explicitement.</p>
                  <p>L’IA embarquée, lorsqu’elle est prise en charge par le navigateur, fonctionne sur l’appareil. Elle n’est jamais autorisée à abaisser seule un risque établi par des preuves techniques.</p>
                  <p>La lecture du texte d’une image télécharge une fois le moteur de reconnaissance et ses données de langue depuis un service public ; l’image elle-même reste sur ton appareil.</p>
                  <p>Les dix dernières vérifications sont conservées uniquement dans ce navigateur pour pouvoir les relancer ; le bouton Effacer de l’historique les supprime.</p>
                  <p>Évite malgré tout de soumettre des mots de passe, codes à usage unique ou données bancaires complètes. Le dossier d’incident n’est copié ou partagé que lorsque tu déclenches volontairement cette action.</p>
                </div>
              </>
            )}
          </section>
        ) : !analysis ? (
          <>
            <section className="hero">
              <div className="heroBadge"><ShieldCheck size={16} /> ANALYSE SIMPLE · EXPLICABLE · PRIVÉE</div>
              <h1>Un doute ?<br /><span>Vérifie avant d’agir.</span></h1>
              <p>Colle un SMS, un e-mail, un lien, un QR code, une capture ou un document. VÉRIF explique les signaux détectés et te dit quoi faire.</p>
              <div
                className={"card composer" + (dragging ? " dragging" : "")}
                onDragOver={event => { event.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={event => { event.preventDefault(); setDragging(false); void onFile(event.dataTransfer.files?.[0]); }}
              >
                <textarea
                  value={input}
                  onChange={event => setInput(event.target.value)}
                  onPaste={event => { const file = event.clipboardData.files?.[0]; if (file) { event.preventDefault(); void onFile(file); } }}
                  onKeyDown={event => { if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); void verify(); } }}
                  placeholder="Colle ici un SMS, un e-mail, un lien ou le texte d'une capture…"
                  aria-label="Contenu à vérifier"
                  maxLength={MAX_INPUT}
                />
                <div className="tools">
                  <button onClick={() => fileRef.current?.click()} className="tool"><Upload size={18} />Fichier</button>
                  <button onClick={() => photoRef.current?.click()} className="tool"><ImageIcon size={18} />Photo</button>
                  <button onClick={openCamera} className="tool"><QrCode size={18} />Scanner</button>
                  <button onClick={pasteFromClipboard} className="tool"><Clipboard size={18} />Coller</button>
                  <button onClick={() => { setInput("https://"); setNotice(""); }} className="tool"><Link2 size={18} />Lien</button>
                  <button onClick={() => { setInput(""); setNotice(""); }} className="tool" disabled={!input}><Trash2 size={18} />Effacer</button>
                  <input ref={fileRef} type="file" accept={FILE_ACCEPT} hidden onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; void onFile(file); }} />
                  <input ref={photoRef} type="file" accept="image/*" hidden onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; void onFile(file); }} />
                </div>
                {ocrProgress !== null && <div className="progress" role="progressbar" aria-label="Lecture de l’image" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ocrProgress * 100)}><span style={{ width: `${Math.round(ocrProgress * 100)}%` }} /></div>}
                {options}
                <button disabled={!input.trim() || loading} onClick={() => verify()} className="primary">{loading ? <><LoaderCircle className="spin" size={18} /> ANALYSE…</> : "VÉRIFIER"}</button>
              </div>
              {noticeBox}
              <div className="trust">
                <span><ShieldCheck size={16} /> Analyse locale prioritaire</span>
                <span><ShieldCheck size={16} /> Recherche web explicable</span>
                <span><ShieldCheck size={16} /> IA sans droit de masquer un risque technique</span>
              </div>
            </section>
            {history.length > 0 && (
              <section className="history">
                <div className="sectionTitle">
                  <div><span className="eyebrow">HISTORIQUE</span><h3>Vérifications récentes</h3></div>
                  <button className="tool" onClick={() => { setHistory([]); try { localStorage.removeItem(HISTORY_KEY); } catch {} }}>Effacer</button>
                </div>
                {history.map((entry, index) => <button key={index} onClick={() => verify(entry)} title="Relancer cette vérification"><Paperclip size={15} /><span>{historyLabel(entry)}</span></button>)}
              </section>
            )}
          </>
        ) : (
          <section className="result">
            <button className="back" onClick={() => reset(false)}><ChevronLeft size={20} />Nouvelle vérification</button>
            {noticeBox}
            <div className={`resultCard ${meta.className}`}>
              <div className="resultTopline"><span>RÉSULTAT DE LA VÉRIFICATION</span><span>{analysis.checkedAt ? new Date(analysis.checkedAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : ""}</span></div>
              <div className="resultHead">
                <div className="stateIcon"><Icon size={30} /></div>
                <div><div className="stateLabel">{meta.label}</div><h2>{analysis.title}</h2><p>{analysis.summary}</p></div>
              </div>
              <div className="grid2">
                <div className="panel"><h3>Pourquoi ?</h3><ul>{analysis.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul></div>
                <div className="panel"><h3>Que faire ?</h3><ul>{analysis.actions.map((action, index) => <li key={index}>{action}</li>)}</ul></div>
              </div>
              {analysis.identity && (
                <div className="panel spaced">
                  <h3>Identité</h3>
                  <p><b>{analysis.identity.claimedBrand || "Organisme non identifié"}</b>{analysis.identity.officialDomain && <> · domaine attendu : <b>{analysis.identity.officialDomain}</b></>}</p>
                  {analysis.identity.sender && <p>Expéditeur réel détecté : <b>{analysis.identity.sender}</b> · statut : <b>{({ official: "domaine officiel", lookalike: "domaine ressemblant", mismatch: "domaine différent", unknown: "non vérifiable" } as Record<string, string>)[analysis.identity.status] || analysis.identity.status}</b></p>}
                </div>
              )}
              {analysis.urls && analysis.urls.length > 0 && (
                <div className="panel links">
                  <h3>Liens détectés</h3>
                  {analysis.urls.map((link, index) => <div key={index}><b>{link.host || "Lien invalide"}</b>{link.official && <span> · domaine officiel reconnu : {link.official}</span>}{link.findings.map((finding, j) => <div key={j}>{finding}</div>)}</div>)}
                </div>
              )}
              <div className="panel spaced">
                <h3>Preuves techniques</h3>
                <p>Score de risque : <b>{analysis.evidence?.risk ?? "non calculé"}</b></p>
                {analysis.evidence?.headers?.replyTo && <p>Reply-To : <b>{analysis.evidence.headers.replyTo}</b></p>}
              </div>
              {analysis.intelligence && (
                <div className="panel intelligencePanel">
                  <h3>VÉRIF Intelligence</h3>
                  <p><b>Mode :</b> {analysis.intelligence.mode.split("+").join(" + ")}</p>
                  <p><b>IA embarquée :</b> {analysis.intelligence.ai.used ? "active et utilisée" : analysis.intelligence.ai.available ? "disponible mais sans avis exploitable" : "non disponible sur ce navigateur/appareil"}</p>
                  <p><b>Recherche web :</b> {analysis.intelligence.web.available ? `active${analysis.intelligence.web.provider ? ` · ${analysis.intelligence.web.provider}` : ""}` : "aucune donnée externe exploitable"}</p>
                  {analysis.intelligence.mailAuth && (analysis.intelligence.mailAuth.spf || analysis.intelligence.mailAuth.dkim || analysis.intelligence.mailAuth.dmarc) && <p><b>Authentification e-mail :</b> SPF {analysis.intelligence.mailAuth.spf || "?"} · DKIM {analysis.intelligence.mailAuth.dkim || "?"} · DMARC {analysis.intelligence.mailAuth.dmarc || "?"}</p>}
                  {analysis.intelligence.web.searchResults?.map((result, index) => <p key={index}><a href={result.url} target="_blank" rel="noreferrer">{result.title}</a>{result.snippet && <span> — {result.snippet}</span>}</p>)}
                  {analysis.intelligence.web.items.length > 0 && (
                    <details>
                      <summary>Voir les recherches web</summary>
                      {analysis.intelligence.web.items.map((item, index) => (
                        <div key={index} className="intelItem">
                          <b>{item.host || item.url}</b>
                          {item.finalHost && item.finalHost !== item.host && <div>Destination finale : {item.finalHost}</div>}
                          {item.rdap?.ageDays != null && <div>Âge du domaine : {item.rdap.ageDays} jours</div>}
                          {item.dns && <div>DNS : {item.dns.resolved ? "résolu" : "non résolu"}</div>}
                          {item.findings?.map((finding, j) => <div key={j}>{finding}</div>)}
                        </div>
                      ))}
                    </details>
                  )}
                </div>
              )}
              <div className="resultActions"><button className="secondary" onClick={shareResult}><Share2 size={17} /> PARTAGER LE RÉSULTAT</button></div>
              <div className="confidence"><span>Confiance : <strong>{analysis.confidence}</strong></span><span>Moteur : <strong>{analysis.engine || "local"}</strong></span></div>
              {analysis.recommendation && (
                <div className={"panel recommendation urgency-" + analysis.recommendation.urgency}>
                  <h3>Réaction recommandée</h3>
                  <p><b>{analysis.recommendation.label}</b> · {analysis.recommendation.urgency === "now" ? "À faire maintenant" : analysis.recommendation.urgency === "today" ? "À faire aujourd’hui" : "À faire avant d’agir"}</p>
                  <p>{analysis.recommendation.summary}</p>
                  <ol>{analysis.recommendation.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
                  {analysis.recommendation.preserveEvidence && <p><b>À conserver :</b> message, URL, captures et preuves utiles.</p>}
                  {Boolean(analysis.recommendation.reports?.length) && (
                    <div className="reporting">
                      <p><b>Signaler</b></p>
                      <div className="tools">{analysis.recommendation.reports?.map((report, index) => <a className="tool" key={index} href={report.url} target="_blank" rel="noreferrer">{report.label}</a>)}</div>
                    </div>
                  )}
                  <a href={analysis.recommendation.resource?.url || "https://17cyber.gouv.fr/"} target="_blank" rel="noreferrer">{analysis.recommendation.resource?.label || "Obtenir de l'aide sur 17Cyber"}</a>
                </div>
              )}
              {analysis.incidentReport && (
                <div className="panel incidentReport">
                  <h3>Dossier d’incident</h3>
                  <p>Résumé prêt à copier pour un signalement ou pour demander de l’aide.</p>
                  <button className="secondary" onClick={copyIncidentReport}><ClipboardCheck size={18} /> {copied ? "DOSSIER COPIÉ" : "COPIER LE DOSSIER"}</button>
                  <details><summary>Voir le contenu</summary><pre>{analysis.incidentReport}</pre></details>
                </div>
              )}
              {analysis.verdict !== "ok" && (
                <div className="panel incident">
                  <h3>Ta situation</h3>
                  <p>Dis-moi ce qui s'est déjà passé pour obtenir les bons réflexes.</p>
                  <div className="tools">
                    <button className="tool" aria-pressed={incident === "clicked"} onClick={() => setIncident("clicked")}>J'ai cliqué</button>
                    <button className="tool" aria-pressed={incident === "info"} onClick={() => setIncident("info")}>J'ai donné des infos</button>
                    <button className="tool" aria-pressed={incident === "paid"} onClick={() => setIncident("paid")}>J'ai payé</button>
                    <button className="tool" aria-pressed={incident === "none"} onClick={() => setIncident("none")}>Je n'ai rien fait</button>
                  </div>
                  {incident !== "none" && (
                    <div className="incidentAdvice">
                      <b>{incident === "clicked" ? "Tu as cliqué" : incident === "info" ? "Tu as transmis des informations" : "Tu as effectué un paiement"}</b>
                      <ul>{incidentAdvice(incident, analysis.recommendation?.scenario).map((step, index) => <li key={index}>{step}</li>)}</ul>
                      <p><a href="https://17cyber.gouv.fr/" target="_blank" rel="noreferrer">Obtenir un diagnostic gratuit sur 17Cyber</a></p>
                    </div>
                  )}
                </div>
              )}
              {analysis.verdict !== "ok" && <button className="secondary" onClick={() => reset(true)}>VÉRIFIER AUTREMENT</button>}
            </div>
            {input.trim() && (
              <div className="card inputAgain">
                <div className="inputAgainBody">
                  <textarea value={input} onChange={event => setInput(event.target.value)} aria-label="Contenu vérifié" maxLength={MAX_INPUT} />
                  {options}
                </div>
                <button className="primary" onClick={() => verify()} disabled={loading}>REFAIRE</button>
              </div>
            )}
          </section>
        )}

        {camera && (
          <div className="cameraOverlay" role="dialog" aria-modal="true" aria-label="Scanner avec la caméra">
            <div className="cameraCard">
              <div className="cameraHeader"><b>Scanner avec la caméra</b><button className="iconButton" onClick={closeCamera} aria-label="Fermer la caméra"><X /></button></div>
              <div className="cameraView"><video ref={videoRef} autoPlay playsInline muted /><div className="scanFrame" /></div>
              <p>Un QR code est lu automatiquement. Pour un courrier ou un écran, cadre le texte puis capture.</p>
              <button className="primary" onClick={captureFrame}>CAPTURER ET ANALYSER</button>
            </div>
          </div>
        )}
      </main>

      <footer>
        <strong>VÉRIF</strong>
        <span>Un doute ? Vérifie avant d’agir.</span>
        <nav className="footerNav" aria-label="Informations">
          <button onClick={() => { setPage("help"); window.scrollTo({ top: 0 }); }}>Comment ça marche</button>
          <button onClick={() => { setPage("privacy"); window.scrollTo({ top: 0 }); }}>Confidentialité</button>
        </nav>
        <small>VÉRIF aide à évaluer un contenu. Aucun outil automatique ne peut garantir à lui seul qu’un message est sûr.</small>
      </footer>
    </div>
  );
}
